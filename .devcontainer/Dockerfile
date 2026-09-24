FROM mcr.microsoft.com/devcontainers/php:1-8.3-bookworm

# PostgreSQL and Redis support for PHP
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev postgresql-client \
    && docker-php-ext-install pdo_pgsql pgsql \
    && yes '' | pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*
