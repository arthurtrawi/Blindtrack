#!/bin/sh
# Executado pelo entrypoint oficial do PostgreSQL somente na PRIMEIRA inicialização
# (quando o volume está vazio). Cria o banco usado pelos testes de integração.
set -eu

if [ -n "${POSTGRES_TEST_DB:-}" ]; then
  echo "Criando banco de testes: ${POSTGRES_TEST_DB}"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    SELECT 'CREATE DATABASE "${POSTGRES_TEST_DB}" OWNER "${POSTGRES_USER}"'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_TEST_DB}')\gexec
EOSQL
fi
