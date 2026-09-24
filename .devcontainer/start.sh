#!/usr/bin/env bash
# Starts the app every time the Codespace is opened.
if curl -s -o /dev/null http://127.0.0.1:8000/up; then
    echo "MöbelStock24 läuft bereits / уже запущено: Ports → 8000"
    exit 0
fi
php artisan serve --host=0.0.0.0 --port=8000
