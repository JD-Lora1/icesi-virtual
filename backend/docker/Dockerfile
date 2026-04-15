FROM php:8.2-cli

WORKDIR /var/www

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libpq-dev \
        libsqlite3-dev \
    && docker-php-ext-install pdo pdo_pgsql pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

EXPOSE 8000
