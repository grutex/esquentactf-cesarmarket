#!/bin/sh
set -eu
php /var/www/backend/bin/setup.php
exec docker-php-entrypoint "$@"
