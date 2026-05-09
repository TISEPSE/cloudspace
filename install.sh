#!/bin/bash
set -e

REPO="TISEPSE/cloudspace"
BASE_URL="https://raw.githubusercontent.com/$REPO/main"
INSTALL_DIR="/opt/cloudspace"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║       CloudSpace — Installation      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ── Vérifications préliminaires ──────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo "  [!] Ce script doit être lancé en root (sudo)."
  exit 1
fi

if ! command -v curl &>/dev/null; then
  apt-get update -qq && apt-get install -y -qq curl
fi

# ── Téléchargement des fichiers nécessaires ───────────────────────────────────
echo "  [+] Téléchargement des fichiers de configuration…"
mkdir -p "$INSTALL_DIR"
curl -fsSL "$BASE_URL/docker-compose.prod.yml" -o "$INSTALL_DIR/docker-compose.prod.yml"
curl -fsSL "$BASE_URL/deploy.sh"               -o "$INSTALL_DIR/deploy.sh"
chmod +x "$INSTALL_DIR/deploy.sh"
echo "  [✓] Fichiers téléchargés dans $INSTALL_DIR"

# ── Lancement du déploiement ─────────────────────────────────────────────────
cd "$INSTALL_DIR"
exec bash deploy.sh
