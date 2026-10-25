#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo bash deploy/install-dembogurski.sh" >&2
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LANDING_DIR="${PROJECT_ROOT}/portada"
TREE_DIR="${PROJECT_ROOT}/artifacts/arvore-dembogurski/apache"
PRIVATE_DIR="/etc/apache2/dembogurski"
DATABASE_CONFIG="${PRIVATE_DIR}/database.conf"
HTPASSWD_FILE="${PRIVATE_DIR}/users.htpasswd"
SITE_CONFIG="/etc/apache2/sites-available/dembogurski.com.conf"
DB_NAME="familia_dembogurski"
DB_USER="dembogurski_app"
DB_HOST="127.0.0.1"

if mariadb --no-defaults --protocol=socket --user=root \
  -e "SELECT 1" >/dev/null 2>&1; then
  MARIADB_ADMIN=(mariadb --no-defaults --protocol=socket --user=root)
elif [[ -r /etc/mysql/debian.cnf ]] \
  && mariadb --defaults-file=/etc/mysql/debian.cnf \
    -e "SELECT 1" >/dev/null 2>&1; then
  MARIADB_ADMIN=(mariadb --defaults-file=/etc/mysql/debian.cnf)
else
  echo "Não foi possível obter acesso administrativo ao MariaDB." >&2
  echo "Crie o banco e o usuário manualmente e depois execute novamente." >&2
  exit 1
fi

for required in \
  "${LANDING_DIR}/index.html" \
  "${TREE_DIR}/index.html" \
  "${TREE_DIR}/api.php" \
  "${TREE_DIR}/schema.sql" \
  "${PROJECT_ROOT}/deploy/apache/dembogurski.com.conf"; do
  if [[ ! -f "${required}" ]]; then
    echo "Arquivo obrigatório ausente: ${required}" >&2
    exit 1
  fi
done

for command in apache2ctl htpasswd mariadb openssl; do
  if ! command -v "${command}" >/dev/null 2>&1; then
    echo "Comando ausente: ${command}. Instale os pacotes indicados em deploy/README.md." >&2
    exit 1
  fi
done

install -d -o root -g www-data -m 2770 "${PRIVATE_DIR}"

if [[ ! -f "${DATABASE_CONFIG}" ]]; then
  db_password="$(openssl rand -hex 32)"
  "${MARIADB_ADMIN[@]}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'${DB_HOST}' IDENTIFIED BY '${db_password}';
ALTER USER '${DB_USER}'@'${DB_HOST}' IDENTIFIED BY '${db_password}';
GRANT SELECT, INSERT, UPDATE, DELETE ON \`${DB_NAME}\`.* TO '${DB_USER}'@'${DB_HOST}';
FLUSH PRIVILEGES;
SQL

  umask 077
  cat > "${DATABASE_CONFIG}" <<EOF
SetEnv DB_HOST ${DB_HOST}
SetEnv DB_PORT 3306
SetEnv DB_NAME ${DB_NAME}
SetEnv DB_USER ${DB_USER}
SetEnv DB_PASS ${db_password}
SetEnv TREE_ORGANIZERS admin
SetEnv TREE_USERS_DIR ${PRIVATE_DIR}
EOF
  echo "Banco e credenciais privadas criados."
else
  echo "Configuração privada do banco já existe; foi preservada."
fi

chown root:root "${DATABASE_CONFIG}"
chmod 600 "${DATABASE_CONFIG}"

"${MARIADB_ADMIN[@]}" "${DB_NAME}" < "${TREE_DIR}/schema.sql"

if [[ ! -f "${HTPASSWD_FILE}" ]]; then
  echo
  echo "Crie a senha do primeiro administrador da árvore."
  htpasswd -B -c "${HTPASSWD_FILE}" admin
fi

chown root:www-data "${HTPASSWD_FILE}"
chmod 660 "${HTPASSWD_FILE}"

install -m 0644 "${PROJECT_ROOT}/deploy/apache/dembogurski.com.conf" "${SITE_CONFIG}"

install -d -o www-data -g www-data -m 775 "${TREE_DIR}/uploads"

a2enmod auth_basic authn_file authz_user headers expires rewrite ssl
a2ensite dembogurski.com.conf

if ! apache2ctl configtest; then
  echo "A configuração do Apache falhou. O serviço não foi recarregado." >&2
  exit 1
fi

systemctl reload apache2

echo
echo "Site instalado:"
echo "  http://dembogurski.com/"
echo "  http://dembogurski.com/arvore/"
echo
echo "Depois de confirmar o acesso HTTP, execute:"
echo "  certbot --apache -d dembogurski.com -d www.dembogurski.com --redirect"
