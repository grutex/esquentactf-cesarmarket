#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ -e "$project_dir/.env" ]; then
    echo "O arquivo .env já existe. Nenhuma credencial foi alterada."
    exit 0
fi
command -v openssl >/dev/null 2>&1 || { echo "Instale openssl para gerar as senhas." >&2; exit 1; }
umask 077
db_password=$(openssl rand -hex 24)
root_password=$(openssl rand -hex 32)
admin_password=$(openssl rand -hex 20)
sed -e "s/^DB_PASSWORD=.*/DB_PASSWORD=$db_password/" \
    -e "s/^DB_ROOT_PASSWORD=.*/DB_ROOT_PASSWORD=$root_password/" \
    -e "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$admin_password/" \
    "$project_dir/.env.example" > "$project_dir/.env"
echo "Arquivo .env criado com senhas aleatórias. Consulte ADMIN_LOGIN e ADMIN_PASSWORD nesse arquivo para entrar."
