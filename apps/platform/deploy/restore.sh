#!/usr/bin/env bash
#
# Восстановление из бэкапа.
#
# Бэкап, который ни разу не восстанавливали, бэкапом не является. Прогоните
# этот скрипт хотя бы раз на запасном сервере, прежде чем он понадобится
# по-настоящему.
#
# Использование:
#   ./restore.sh /var/backups/moebelstock24/db-20260926-030000.dump
#   ./restore.sh <дамп> <архив файлов>

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE="docker compose -f $HERE/docker-compose.prod.yml --env-file $HERE/.env"

DB_FILE="${1:-}"
FILES_FILE="${2:-}"

if [ -z "$DB_FILE" ] || [ ! -f "$DB_FILE" ]; then
  echo "Укажите файл дампа. Доступные:" >&2
  ls -1t /var/backups/moebelstock24/db-*.dump 2>/dev/null | head -10 >&2
  exit 1
fi

cat <<WARN

ВНИМАНИЕ: восстановление затирает текущую базу целиком.
Всё, что появилось после $(basename "$DB_FILE"), будет потеряно.

WARN
read -r -p 'Введите WIEDERHERSTELLEN для подтверждения: ' CONFIRM
[ "$CONFIRM" = "WIEDERHERSTELLEN" ] || { echo "Отменено."; exit 1; }

echo "Останавливаю приложение, чтобы оно не писало в базу во время восстановления..."
$COMPOSE stop app caddy

echo "Восстанавливаю базу..."
# --clean --if-exists убирает существующие объекты перед восстановлением.
$COMPOSE exec -T postgres \
  pg_restore -U moebelstock24 -d moebelstock24 --clean --if-exists --no-owner \
  < "$DB_FILE"

if [ -n "$FILES_FILE" ] && [ -f "$FILES_FILE" ]; then
  echo "Восстанавливаю загруженные файлы..."
  docker run --rm \
    -v moebelstock24_filestorage:/data \
    -v "$(cd "$(dirname "$FILES_FILE")" && pwd)":/backup:ro \
    alpine sh -c "rm -rf /data/* && tar xzf /backup/$(basename "$FILES_FILE") -C /data"
fi

echo "Запускаю приложение..."
$COMPOSE start app caddy

echo
echo "Готово. Проверьте вход и откройте список клиентов."
