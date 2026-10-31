FROM php:8.4-fpm-alpine

RUN docker-php-ext-install pdo_mysql opcache
WORKDIR /var/www
COPY backend /var/www/backend
COPY infra/database /var/www/infra/database
COPY infra/php/php.ini /usr/local/etc/php/conf.d/market.ini
COPY infra/php/pool.conf /usr/local/etc/php-fpm.d/zz-market.conf
COPY infra/php/entrypoint.sh /usr/local/bin/market-entrypoint
RUN sed -i 's/\r$//' /usr/local/bin/market-entrypoint \
    && chmod +x /usr/local/bin/market-entrypoint \
    && mkdir -p /var/www/uploads /var/lib/php/sessions \
    && chown -R www-data:www-data /var/www/uploads /var/lib/php/sessions

ENTRYPOINT ["market-entrypoint"]
CMD ["php-fpm", "-F"]
