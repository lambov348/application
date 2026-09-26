#!/usr/bin/env bash
#
# Ежедневный бэкап: дамп базы и загруженные файлы.
# Хранение 30 дней (глава 6 ТЗ). Данные не покидают сервер, то есть ЕС.
#
# Установка в cron (от root на сервере):
#   0 3 * * * /opt/moebelstock24/apps/platform/deploy/backup.sh >> /var/log/ms24-backup.log 2>&1
#
# Проверять бэкапы нужно восстановлением: deploy/restore.sh.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE="docker compose -f $HERE/docker-compose.prod.yml --env-file $HERE/.env"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/moebelstock24}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
# Бэкапы содержат персональные данные клиентов — читать может только root.
chmod 700 "$BACKUP_DIR"

echo "[$(date -u +%FT%TZ)] начинаю бэкап"

# ─── База ───────────────────────────────────────────────────────────────────
# Формат custom: сжат и восстанавливается выборочно через pg_restore.
DB_FILE="$BACKUP_DIR/db-$STAMP.dump"
$COMPOSE exec -T postgres \
  pg_dump -U moebelstock24 -d moebelstock24 --format=custom --compress=9 \
  > "$DB_FILE"

# Пустой или обрезанный дамп — это не бэкап. Лучше узнать сейчас.
if [ ! -s "$DB_FILE" ] || [ "$(stat -c%s "$DB_FILE")" -lt 1024 ]; then
  echo "ОШИБКА: дамп базы пуст или подозрительно мал" >&2
  rm -f "$DB_FILE"
  exit 1
fi

# Проверяем, что дамп читается: битый файл обнаружится здесь, а не в день,
# когда он понадобится.
if ! pg_restore --list "$DB_FILE" > /dev/null 2>&1; then
  # pg_restore может отсутствовать на хосте — проверяем внутри контейнера.
  if ! $COMPOSE exec -T postgres sh -c 'cat > /tmp/check.dump && pg_restore --list /tmp/check.dump > /dev/null && rm -f /tmp/check.dump' < "$DB_FILE"; then
    echo "ОШИБКА: дамп не читается pg_restore" >&2
    exit 1
  fi
fi

# ─── Загруженные файлы ──────────────────────────────────────────────────────
# Фотографии объектов и подписи клиентов в протоколах приёмки.
FILES_FILE="$BACKUP_DIR/files-$STAMP.tar.gz"
VOLUME="$($COMPOSE config --format json 2>/dev/null | grep -o 'moebelstock24_filestorage' | head -1 || echo moebelstock24_filestorage)"
docker run --rm \
  -v "$VOLUME":/data:ro \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/files-$STAMP.tar.gz" -C /data .

chmod 600 "$DB_FILE" "$FILES_FILE"

# ─── Уборка старых ──────────────────────────────────────────────────────────
find "$BACKUP_DIR" -name 'db-*.dump' -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'files-*.tar.gz' -mtime "+$KEEP_DAYS" -delete

echo "[$(date -u +%FT%TZ)] готово:"
echo "  база:  $(du -h "$DB_FILE" | cut -f1)  $DB_FILE"
echo "  файлы: $(du -h "$FILES_FILE" | cut -f1)  $FILES_FILE"
echo "  всего в хранилище: $(du -sh "$BACKUP_DIR" | cut -f1)"

# Бэкап только на том же сервере — это защита от ошибки, но не от пожара
# в дата-центре и не от шифровальщика. Копию стоит уводить в Hetzner
# Storage Box (тоже ЕС): см. deploy/README.md.
