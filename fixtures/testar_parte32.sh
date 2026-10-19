#!/usr/bin/env bash
# Testa a parte 32 (Simulado Nacional 2.0) num Postgres 16 local, com um stub do Supabase
# (fixtures/sql/stub_supabase.sql).
#
#   bash fixtures/testar_parte32.sh
#
# O que faz: cria um cluster temporário (initdb/pg_ctl num diretório do mktemp; como root, roda
# pelo usuário postgres com runuser), aplica o stub e TODAS as migrações de supabase/migrations em
# ordem, cola a parte 32 (supabase/colar-no-painel/sql-*-parte32.sql) DUAS vezes (a do painel e o
# espelho em migrations, que têm de ser o mesmo SQL: tem de ser idempotente), confere o agendamento
# com um cron.schedule de mentira e roda fixtures/sql/testar_parte32.sql: iniciar, salvar, entregar,
# prazo e tolerância, entrega automática, resultado, ranking, gabarito, admin, destaque, outubro
# antigo, limite grátis, emblemas e a campanha de e-mail.
# Precisa de Postgres 16 (binários em /usr/lib/postgresql/16/bin). Não entra no npm test.
# Variáveis: PG_BIN (pasta dos binários), PG_PORTA (padrão 55432).
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
[ -x "$BIN/initdb" ] || { echo "Postgres 16 não encontrado em $BIN (apt-get install postgresql-16)"; exit 2; }
PORTA="${PG_PORTA:-55432}"
DIR="$(mktemp -d)"
chmod 777 "$DIR"
COMO=()
if [ "$(id -u)" = "0" ]; then COMO=(runuser -u postgres --); fi

parar() { "${COMO[@]}" "$BIN/pg_ctl" -D "$DIR/dados" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap parar EXIT

"${COMO[@]}" "$BIN/initdb" -D "$DIR/dados" -A trust -U postgres >/dev/null
"${COMO[@]}" "$BIN/pg_ctl" -D "$DIR/dados" -o "-p $PORTA -k $DIR -c listen_addresses= -c timezone=UTC" -l "$DIR/log" -w start >/dev/null

PSQL=("${COMO[@]}" psql -X -q -v ON_ERROR_STOP=1 -h "$DIR" -p "$PORTA" -U postgres -d postgres)

"${PSQL[@]}" -f "$RAIZ/fixtures/sql/stub_supabase.sql" >/dev/null
ESPELHO="$RAIZ/supabase/migrations/202610191200_simulado_nacional_v2.sql"
for m in "$RAIZ"/supabase/migrations/*.sql; do
  [ "$m" = "$ESPELHO" ] && continue # a parte 32 entra depois, duas vezes
  "${PSQL[@]}" -f "$m" >/dev/null 2>"$DIR/erro" || { echo "falhou ao aplicar $(basename "$m"):"; cat "$DIR/erro"; exit 1; }
done
echo "ok: stub e as migrações anteriores aplicadas"

PARTE32="$RAIZ/supabase/colar-no-painel/sql-202610191200-parte32.sql"
AGENDA="$RAIZ/supabase/colar-no-painel/sql-202610191200-parte32-agendamento.sql"
[ -f "$PARTE32" ] && [ -f "$ESPELHO" ] && [ -f "$AGENDA" ] || { echo "faltam os arquivos da parte 32"; exit 1; }
diff <(tail -n +2 "$PARTE32") <(tail -n +2 "$ESPELHO") >/dev/null || { echo "o espelho em migrations difere da parte 32"; exit 1; }
"${PSQL[@]}" -f "$PARTE32" >/dev/null 2>"$DIR/erro" || { echo "falhou ao colar $(basename "$PARTE32"):"; cat "$DIR/erro"; exit 1; }
"${PSQL[@]}" -f "$ESPELHO" >/dev/null 2>"$DIR/erro" || { echo "falhou ao colar $(basename "$ESPELHO"):"; cat "$DIR/erro"; exit 1; }
echo "ok: parte 32 aplicada duas vezes ($(basename "$PARTE32") e o espelho)"

# O agendamento: um cron.schedule de mentira guarda o comando, que depois roda de verdade uma vez.
"${PSQL[@]}" >/dev/null <<'SQL'
create schema if not exists cron;
create table cron.job (jobname text primary key, schedule text, command text);
create function cron.schedule(p_nome text, p_quando text, p_comando text) returns bigint language sql as $$
  insert into cron.job values (p_nome, p_quando, p_comando)
  on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command;
  select 1::bigint;
$$;
SQL
"${PSQL[@]}" -f "$AGENDA" >/dev/null
"${PSQL[@]}" -f "$AGENDA" >/dev/null
"${PSQL[@]}" -t -A -c "select schedule || ' | ' || command from cron.job" | grep -q '^\*/10 \* \* \* \* | .*sn_entregar_vencidas' \
  || { echo "agendamento sem sn_entregar_vencidas a cada 10 minutos"; exit 1; }
"${PSQL[@]}" -c "do \$\$ begin execute (select command from cron.job where jobname = 'simulado-nacional-entregar-vencidas'); end \$\$" >/dev/null
echo "ok: agendamento de 10 em 10 minutos"

"${PSQL[@]}" -f "$RAIZ/fixtures/sql/testar_parte32.sql"
echo "ok: parte 32 conferida"
