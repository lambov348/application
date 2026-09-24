#!/usr/bin/env bash
# Starts the app every time the Codespace is opened.
if curl -s -o /dev/null http://127.0.0.1:8000/up; then
    echo "MöbelStock24 läuft bereits / уже запущено: Ports → 8000"
    exit 0
fi
# Scheduler (closes forgotten shifts at 23:59) in the background
pgrep -f "artisan schedule:work" >/dev/null || (setsid nohup php artisan schedule:work > storage/logs/schedule.log 2>&1 &)
# Queue worker (sends push notifications) in the background
pgrep -f "artisan queue:work" >/dev/null || (setsid nohup php artisan queue:work --tries=3 > storage/logs/queue.log 2>&1 &)
php artisan serve --host=0.0.0.0 --port=8000
