#!/usr/bin/env bash
# Runs once when the Codespace is created: installs everything and fills demo data.
set -e

if [ ! -f .env ]; then
    cp .env.example .env
    sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=moebel/' .env
fi

# Public address of this Codespace (links and redirects must use it, not localhost)
if [ -n "$CODESPACE_NAME" ]; then
    url="https://${CODESPACE_NAME}-8000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    sed -i "s#^APP_URL=.*#APP_URL=${url}#" .env
    grep -q '^APP_FORCE_URL=' .env || echo 'APP_FORCE_URL=true' >> .env
fi

composer install --no-interaction
npm ci
npm run build

grep -q '^APP_KEY=base64' .env || php artisan key:generate --force
php artisan webpush:vapid --write

# Wait for PostgreSQL to start
until pg_isready -h 127.0.0.1 -U moebel >/dev/null 2>&1; do sleep 1; done

php artisan migrate --force
php artisan db:seed --force

echo "Готово / Fertig / Done"
