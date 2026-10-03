FROM php:8.4-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git libicu-dev libsqlite3-dev libzip-dev unzip \
    && docker-php-ext-install intl pdo_mysql pdo_sqlite zip \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./
RUN composer install --no-interaction --prefer-dist --no-scripts

COPY . .
COPY docker/php-performance.ini /usr/local/etc/php/conf.d/99-performance.ini

RUN cp .env.example .env \
    && composer dump-autoload --optimize --no-interaction \
    && php artisan storage:link \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000

CMD ["sh", "-c", "php artisan optimize && exec php artisan serve --host=0.0.0.0 --port=8000"]
