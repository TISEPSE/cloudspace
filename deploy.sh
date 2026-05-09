#!/bin/bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── Domaine ──────────────────────────────────────────────────────────────────
read -p "  Domaine ou sous-domaine (ex: cloud.monsite.com) : " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo "  [!] Domaine requis."
  exit 1
fi
NGINX_CONF="/etc/nginx/sites-available/cloudspace"
NGINX_LINK="/etc/nginx/sites-enabled/cloudspace"

echo "==> CloudSpace deploy — $DOMAIN"

# ── 1. Dépendances système ───────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "  [!] Docker non trouvé. Installer Docker puis relancer."
  exit 1
fi
if ! docker compose version &>/dev/null; then
  echo "  [!] docker compose (v2) non trouvé. Installer le plugin compose."
  exit 1
fi
if ! command -v nginx &>/dev/null; then
  echo "  [!] nginx non trouvé : apt install nginx"
  exit 1
fi
if ! command -v certbot &>/dev/null; then
  echo "  [!] certbot non trouvé : apt install certbot python3-certbot-nginx"
  exit 1
fi

# ── 2. Fichier .env ──────────────────────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  echo "  [+] Génération du fichier .env…"
  POSTGRES_PASSWORD=$(openssl rand -hex 32)
  SECRET_KEY=$(openssl rand -hex 48)
  cat > "$APP_DIR/.env" <<EOF
POSTGRES_USER=cloudspace
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=cloudspace_db

SECRET_KEY=$SECRET_KEY

ALLOWED_ORIGINS=https://$DOMAIN
FRONTEND_URL=https://$DOMAIN
GITHUB_CALLBACK_URL=https://$DOMAIN/api/github/callback

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
EOF
  echo "  [✓] .env créé avec des secrets générés aléatoirement"
else
  echo "  [=] .env déjà présent, conservation des secrets existants"
fi

# ── 2b. Cloudflare Turnstile ─────────────────────────────────────────────────
if grep -q "VITE_TURNSTILE_SITE_KEY=" "$APP_DIR/.env" 2>/dev/null && [ -n "$(grep 'VITE_TURNSTILE_SITE_KEY=' "$APP_DIR/.env" | cut -d= -f2)" ]; then
  echo "  [=] Turnstile déjà configuré, conservation des clés existantes"
else
  echo ""
  read -p "  Configurer Cloudflare Turnstile (protection anti-bot) ? [Y/n] : " ts_answer
  if [[ "$ts_answer" != "n" && "$ts_answer" != "N" ]]; then
    read -p "  Site Key (publique)  : " TS_SITE_KEY
    read -s -p "  Secret Key (privée) : " TS_SECRET_KEY
    echo ""
    {
      echo ""
      echo "# Cloudflare Turnstile"
      echo "VITE_TURNSTILE_SITE_KEY=$TS_SITE_KEY"
      echo "TURNSTILE_SECRET_KEY=$TS_SECRET_KEY"
    } >> "$APP_DIR/.env"
    echo "  [✓] Clés Turnstile ajoutées au .env"
  else
    echo "  [=] Turnstile ignoré — protection anti-bot désactivée"
  fi
fi

# ── 3. Conteneurs Docker ─────────────────────────────────────────────────────
echo "  [+] Arrêt des anciens conteneurs…"
docker compose -f "$APP_DIR/docker-compose.yml" down --remove-orphans 2>/dev/null || true

echo "  [+] Build et démarrage des conteneurs…"
docker compose -f "$APP_DIR/docker-compose.yml" up -d --build

echo "  [+] Attente du démarrage du backend (tests + migrations)…"
until docker compose -f "$APP_DIR/docker-compose.yml" logs api 2>/dev/null | grep -q "Starting gunicorn\|Traceback"; do
  sleep 3
done
if docker compose -f "$APP_DIR/docker-compose.yml" logs api 2>/dev/null | grep -q "Traceback"; then
  echo "  [!] Le backend a planté. Logs :"
  docker compose -f "$APP_DIR/docker-compose.yml" logs api --tail=30
  exit 1
fi
echo "  [✓] Conteneurs démarrés"

# ── 4. Vhost nginx ───────────────────────────────────────────────────────────
if [ ! -f "$NGINX_CONF" ]; then
  echo "  [+] Création du vhost nginx pour $DOMAIN…"
  cat > "$NGINX_CONF" <<EOF
server {
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        client_max_body_size 500M;
    }

    listen 80;
}
EOF
  ln -sf "$NGINX_CONF" "$NGINX_LINK"
  nginx -t && systemctl reload nginx
  echo "  [✓] Vhost nginx créé"
else
  echo "  [=] Vhost nginx déjà présent"
fi

# ── 5. Certificat SSL ────────────────────────────────────────────────────────
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
if [ ! -f "$CERT_PATH" ]; then
  echo "  [+] Obtention du certificat SSL Let's Encrypt…"
  EMAIL=$(grep -r 'email' /etc/letsencrypt/cli.ini 2>/dev/null | head -1 | cut -d= -f2 | tr -d ' ')
  if [ -z "$EMAIL" ]; then
    echo "  [!] Email certbot introuvable. Lancer manuellement :"
    echo "      certbot --nginx -d $DOMAIN"
  else
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL"
    echo "  [✓] Certificat SSL obtenu"
  fi
else
  echo "  [=] Certificat SSL déjà présent (expire le $(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2))"
fi

# ── 6. Résumé ────────────────────────────────────────────────────────────────
echo ""
echo "  ✅  CloudSpace est accessible sur https://$DOMAIN"
docker compose -f "$APP_DIR/docker-compose.yml" ps
