#!/bin/sh
set -e

# Le conteneur démarre en root pour pouvoir chown le volume monté (/app/uploads),
# puis bascule en non-root (UID 1000) pour exécuter l'application.
if [ "$(id -u)" = "0" ]; then
  echo "==> Fixing /app/uploads ownership for appuser (UID 1000)..."
  chown -R appuser:appuser /app/uploads
  echo "==> Re-executing as appuser..."
  exec gosu appuser "$0" "$@"
fi

echo "==> Running tests..."
python -m pytest tests/ -v
echo "==> Tests passed."

echo "==> Applying database migrations..."
flask db upgrade
echo "==> Migrations done. Starting server..."

exec gunicorn \
  --workers 4 \
  --threads 2 \
  --bind 0.0.0.0:5000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  "src:create_app()"
