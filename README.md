# MöbelStock24

Система заказов, работников и зарплаты. Требования — в [CLAUDE.md](CLAUDE.md), макеты — в `docs/design/`.

Старая версия на Next.js сохранена в ветке `legacy/nextjs`.

## Стек

Laravel 12, PHP 8.3+, Vue 3 + Inertia.js, Tailwind CSS, vue-i18n, PostgreSQL 16, Redis, Pest.

## Запуск на своём компьютере

Нужно: PHP 8.3+, Composer, Node.js 20+, PostgreSQL 16, Redis.

```bash
# 1. База данных (один раз)
sudo -u postgres psql -c "CREATE USER moebel WITH PASSWORD 'moebel' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE moebelstock24 OWNER moebel;"
sudo -u postgres psql -c "CREATE DATABASE moebelstock24_test OWNER moebel;"

# 2. Настройки: скопировать пример и вписать пароль базы в DB_PASSWORD
cp .env.example .env
php artisan key:generate

# 3. Программы проекта
composer install
npm install

# 4. Таблицы и тестовые данные
php artisan migrate --seed

# 5. Запуск (открыть http://localhost:8000)
composer run dev
```

## Тестовые входы (только для локальной проверки)

| Кто | Логин | Пароль |
|---|---|---|
| Владелец | `admin` | `admin12345` |
| Работник (первый вход — попросит задать свой пароль) | `dmitri.k` | `start12345` |
| Работник | `oleg.s` | `oleg12345` |
| Работник | `jonas.w` | `jonas12345` |

Вернуть демо-данные в исходное состояние: `php artisan migrate:fresh --seed` (стирает всё в локальной базе).

## Тесты

```bash
php artisan test
```
