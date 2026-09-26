# Развёртывание на сервере

Пошагово, от пустого сервера до работающей платформы. Рассчитано на Hetzner
Cloud, но подойдёт любой сервер с Ubuntu.

**Хостинг только в ЕС** (глава 3 ТЗ, DSGVO). У Hetzner это регионы
**Nürnberg (nbg1)**, **Falkenstein (fsn1)** и **Helsinki (hel1)**. Регион
Ashburn — США, он не подходит.

---

## 1. Сервер

В консоли Hetzner: **Add Server**.

| Параметр | Значение |
|---|---|
| Регион | Nürnberg или Falkenstein |
| Образ | Ubuntu 24.04 |
| Тип | CX22 (2 vCPU, 4 ГБ) — хватает с запасом |
| SSH-ключ | добавьте свой, парольный вход отключим |
| Backups | включите, +20 % к цене — это снимки всего диска вдобавок к нашим дампам |

CX22 стоит около 4 € в месяц. Вместе с доменом выходит в ориентир главы 6 ТЗ.

### Заключите AVV с Hetzner

DSGVO требует договор об обработке данных (Auftragsverarbeitung) с хостером.
У Hetzner он оформляется в консоли: **Settings → Legal → Order processing
agreement**. Это пять минут и обязательный шаг, а не формальность: без AVV
обработка персональных данных клиентов у подрядчика незаконна.

---

## 2. Домен

Заведите A-запись на IP сервера, например `platform.moebelstock24.de`.
Проверьте, что она разошлась, **до** первого запуска: Caddy запросит
сертификат сразу, а у Let's Encrypt есть ограничение на частоту попыток.

```bash
dig +short platform.moebelstock24.de
```

Должен вернуться IP вашего сервера.

---

## 3. Подготовка сервера

Зайдите по SSH под root.

```bash
# Обновление и базовые инструменты
apt update && apt upgrade -y
apt install -y ca-certificates curl git ufw fail2ban postgresql-client

# Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Брандмауэр: наружу открыты только SSH и веб
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Вход по паролю отключаем: остаётся только ключ
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh
```

`fail2ban` включается сам и банит перебор SSH.

---

## 4. Код

```bash
mkdir -p /opt && cd /opt
git clone <адрес репозитория> moebelstock24
cd /opt/moebelstock24/apps/platform
```

---

## 5. Секреты

```bash
cp deploy/.env.example deploy/.env
nano deploy/.env
```

Заполните домен и почту, затем сгенерируйте три секрета:

```bash
cd /opt/moebelstock24/apps/platform
echo "POSTGRES_PASSWORD=\"$(openssl rand -hex 24)\""   >> deploy/.env
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\""      >> deploy/.env
echo "ENCRYPTION_KEY=\"$(openssl rand -base64 32)\""   >> deploy/.env
echo "LEAD_WEBHOOK_SECRET=\"$(openssl rand -hex 32)\"" >> deploy/.env
chmod 600 deploy/.env
```

Если в файле остались пустые строки с теми же именами — удалите их, иначе
пустое значение перебьёт сгенерированное.

> **ENCRYPTION_KEY храните отдельно от сервера.** Им зашифрованы секреты
> двухфакторного входа. Потеряете ключ — всем придётся настраивать 2FA заново.
> Положите копию в менеджер паролей.

---

## 6. Запуск

```bash
cd /opt/moebelstock24/apps/platform
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Первая сборка занимает несколько минут. Порядок такой: собираются образы,
поднимается база, применяются миграции, и только потом стартует приложение —
`app` ждёт успешного завершения миграций.

Следите за происходящим:

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env logs -f
```

Признаки, что всё поднялось:

- `migrate` завершился с кодом 0 и строкой про применённые миграции;
- `app` в состоянии `healthy`;
- `caddy` получил сертификат (в логе `certificate obtained successfully`).

Откройте `https://ваш-домен` — должна открыться форма входа.

---

## 7. Первый владелец

В базе нет ни одного пользователя, и сидов с выдуманными людьми в проекте
нет намеренно.

```bash
cd /opt/moebelstock24/apps/platform
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env \
  run --rm -it migrate npm run create-user
```

Скрипт спросит имя, email, роль и пароль. Выберите роль **INHABER**.

Дальше войдите на сайте. Владельца сразу отправит настраивать двухфакторный
вход: отсканируйте QR-код приложением Google Authenticator, Aegis или
1Password. **Десять кодов восстановления показываются один раз** — сохраните
их, лучше распечатайте.

Остальных сотрудников заводите уже в интерфейсе: **Benutzer**.

---

## 8. Настройка фирмы

Первым делом откройте **Einstellungen → Firma** и заполните:

- реквизиты по §14 UStG — без них документы неполны;
- налоговый режим и ставку;
- **три правовых блока Angebot**. Форма предложит готовые немецкие
  формулировки, но в базу они не попадут, пока вы их не прочитаете и не
  нажмёте «Сохранить». Пока блоки пусты, ни одно предложение не сохраняется —
  это правило 9.2 ТЗ, а не ошибка.

Формулировки не заменяют юриста. Перед первой отправкой клиенту покажите их
своему Steuerberater.

Затем **Einstellungen → Leistungen** — ваш прайс, и **Kolonnen** — бригады.

---

## 9. Форма с сайта

Заявки с сайта приходят на `POST https://ваш-домен/api/webhook/lead`. Запрос
подписывается секретом `LEAD_WEBHOOK_SECRET` из `deploy/.env` — без подписи
эндпоинт отвечает 401, без заданного секрета вообще закрыт.

Что нужно от разработчика сайта: подписать тело запроса и приложить два
заголовка.

```php
<?php
// Пример на PHP: форма на сайте отправляет заявку в платформу.
$secret  = getenv('MS24_WEBHOOK_SECRET');   // тот же LEAD_WEBHOOK_SECRET
$payload = json_encode([
  'salutation' => 'Herr',
  'lastName'   => $_POST['name'],
  'phone'      => $_POST['telefon'],
  'email'      => $_POST['email'],
  'message'    => $_POST['nachricht'],
  'street'     => $_POST['strasse'],
  'zip'        => $_POST['plz'],
  'city'       => $_POST['ort'],
  'floor'      => $_POST['etage'],
  'elevator'   => isset($_POST['aufzug']),
  'services'   => ['KUECHENMONTAGE'],       // необязательно
  'utmSource'  => $_GET['utm_source'] ?? null,
], JSON_UNESCAPED_UNICODE);

$timestamp = (string) time();
$signature = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);

$ch = curl_init('https://ваш-домен/api/webhook/lead');
curl_setopt_array($ch, [
  CURLOPT_POST       => true,
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'X-MS24-Timestamp: ' . $timestamp,
    'X-MS24-Signature: ' . $signature,
  ],
  CURLOPT_RETURNTRANSFER => true,
]);
$response = curl_exec($ch);
```

Проверить с сервера, ничего не настраивая на сайте:

```bash
cd /opt/moebelstock24/apps/platform
set -a && . deploy/.env && set +a

BODY='{"lastName":"Testmann","phone":"0176 79892037","message":"Testanfrage von der Website"}'
TS=$(date +%s)
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$LEAD_WEBHOOK_SECRET" -hex | awk '{print $2}')

curl -si https://$APP_DOMAIN/api/webhook/lead \
  -H 'Content-Type: application/json' \
  -H "X-MS24-Timestamp: $TS" \
  -H "X-MS24-Signature: $SIG" \
  --data "$BODY" | head -3
```

Ожидается `201` и номер заявки. Она появится в **Anfragen** в колонке «Neu»
и на панели «Heute». `200` с `"duplicate": true` означает, что такая же
заявка от этого клиента пришла меньше десяти минут назад — повторная отправка
формы намеренно не создаёт вторую заявку.

Из обязательных полей — только описание (`message` или `title`) и способ
связи: телефон либо почта. Остальное диспетчер уточнит, и чек-лист заявки
сразу покажет, чего не хватает.

**Секрет не публикуйте в JavaScript на странице.** Подпись ставится на
сервере сайта: секрет в коде страницы равнозначен открытому эндпоинту.

---

## 10. Бэкапы

Ежедневный дамп базы и файлов, хранение 30 дней (глава 6 ТЗ).

```bash
crontab -e
```

Добавьте строку:

```
0 3 * * * /opt/moebelstock24/apps/platform/deploy/backup.sh >> /var/log/ms24-backup.log 2>&1
```

Проверьте сразу, не дожидаясь ночи:

```bash
/opt/moebelstock24/apps/platform/deploy/backup.sh
ls -lh /var/backups/moebelstock24/
```

### Копия за пределы сервера

Бэкап на том же сервере защищает от вашей ошибки, но не от пожара в
дата-центре и не от шифровальщика. Заведите **Hetzner Storage Box** (тоже ЕС,
от 3 € в месяц) и уводите копию туда:

```bash
apt install -y rsync
# Ключ на Storage Box добавляется один раз
ssh-copy-id -p 23 -s uXXXXX@uXXXXX.your-storagebox.de

# В cron, после ночного бэкапа
30 3 * * * rsync -az -e 'ssh -p 23' /var/backups/moebelstock24/ uXXXXX@uXXXXX.your-storagebox.de:./backups/
```

### Проверьте восстановление

**Бэкап, который ни разу не восстанавливали, бэкапом не является.** Хотя бы
один раз прогоните восстановление — лучше на втором, временном сервере:

```bash
/opt/moebelstock24/apps/platform/deploy/restore.sh \
  /var/backups/moebelstock24/db-ГГГГММДД-ЧЧММСС.dump
```

Скрипт потребует ввести подтверждение словом и остановит приложение на время
восстановления.

---

## 11. Обновление

```bash
cd /opt/moebelstock24
git pull
cd apps/platform
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
```

Миграции применятся сами до старта приложения. Перед обновлением с изменением
схемы сделайте бэкап вручную — это одна команда.

---

## Полезные команды

```bash
cd /opt/moebelstock24/apps/platform
C="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env"

$C ps                        # что запущено
$C logs -f app               # логи приложения
$C logs -f caddy             # логи прокси и сертификатов
$C restart app               # перезапуск приложения
$C exec postgres psql -U moebelstock24 -d moebelstock24   # консоль базы
$C run --rm migrate npx prisma migrate status             # состояние миграций
```

---

## Что закрыто и что ещё нет

**Закрыто:**

- наружу открыт только Caddy: база, Redis и приложение портов на хосте не
  публикуют;
- HTTPS с автоматическим продлением, HSTS и защитные заголовки;
- приложение в контейнере работает не от root;
- секреты только в `deploy/.env` с правами 600, в репозиторий не попадают;
- телеметрия Next.js отключена — она уходит за пределы ЕС;
- бэкапы с проверкой целостности дампа и скриптом восстановления, включая
  том с фотографиями и подписями;
- файлы из хранилища отдаются только через проверку прав, прямых ссылок нет;
- брандмауэр, вход по SSH только по ключу, fail2ban.

**Ещё нет:**

- **мониторинга.** Если ночью упадёт база, вы узнаете об этом утром от
  монтажника. Минимум — внешняя проверка доступности (UptimeRobot,
  Better Stack); полноценно — Sentry в европейском регионе (глава 6 ТЗ);
- **отправки писем.** Angebot и Abnahmeprotokoll собираются в PDF и лежат
  в хранилище, ссылку можно отправить клиенту; автоматическая отправка по
  email появится вместе с SMTP-настройками (Этап 2);
- **второго сервера.** Всё на одном: диск, база, файлы. Для пяти человек это
  нормально, но это единственная точка отказа — и потому бэкапы за пределами
  сервера обязательны.
