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
  echo "  [+] Docker non trouvé — installation en cours…"
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  echo "  [✓] Docker installé"
else
  echo "  [=] Docker déjà présent ($(docker --version | cut -d' ' -f3 | tr -d ','))"
fi

if ! docker compose version &>/dev/null; then
  echo "  [+] Plugin docker compose non trouvé — installation…"
  apt-get install -y -qq docker-compose-plugin
  echo "  [✓] docker compose installé"
fi

if ! command -v nginx &>/dev/null; then
  echo "  [+] nginx non trouvé — installation…"
  apt-get install -y -qq nginx
  systemctl enable --now nginx
  echo "  [✓] nginx installé"
else
  echo "  [=] nginx déjà présent"
fi

if ! command -v certbot &>/dev/null; then
  echo "  [+] certbot non trouvé — installation…"
  apt-get install -y -qq certbot python3-certbot-nginx
  echo "  [✓] certbot installé"
else
  echo "  [=] certbot déjà présent"
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
if [ -f "$APP_DIR/docker-compose.prod.yml" ] && [ ! -f "$APP_DIR/backend/dockerfile" ]; then
  COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
  echo "  [+] Mode production — pull des images Docker Hub…"
  docker compose -f "$COMPOSE_FILE" pull
else
  COMPOSE_FILE="$APP_DIR/docker-compose.yml"
  echo "  [+] Mode local — build des images depuis les sources…"
fi

echo "  [+] Arrêt des anciens conteneurs…"
docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

echo "  [+] Démarrage des conteneurs…"
docker compose -f "$COMPOSE_FILE" up -d

echo "  [+] Attente du démarrage du backend…"
until docker compose -f "$COMPOSE_FILE" logs api 2>/dev/null | grep -q "Starting gunicorn\|Traceback"; do
  sleep 3
done
if docker compose -f "$COMPOSE_FILE" logs api 2>/dev/null | grep -q "Traceback"; then
  echo "  [!] Le backend a planté. Logs :"
  docker compose -f "$COMPOSE_FILE" logs api --tail=30
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
docker compose -f "$COMPOSE_FILE" ps
