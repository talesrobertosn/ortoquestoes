#!/usr/bin/env bash
# Testa a parte 31 (e-mails: dados novos, índice único, cadência e campanhas diárias) num
# Postgres 16 local, com um stub do Supabase (fixtures/sql/stub_supabase.sql).
#
#   bash fixtures/testar_parte31.sh
#
# O que faz: cria um cluster temporário, aplica o stub e TODAS as migrações de
# supabase/migrations em ordem, cola a parte 31 (supabase/colar-no-painel/sql-*-parte31.sql)
# DUAS vezes (tem de ser idempotente), semeia pessoas e confere cada RPC de candidatos
# (fixtures/sql/testar_parte31.sql): casos positivos e negativos, preferências desligadas,
# cadência, administrador, e-mail não confirmado e quem já recebeu a mesma referência.
# Precisa de Postgres 16 (binários em /usr/lib/postgresql/16/bin). Não entra no npm test.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
[ -x "$BIN/initdb" ] || { echo "Postgres 16 não encontrado em $BIN (apt-get install postgresql-16)"; exit 2; }
PORTA="${PG_PORTA:-55431}"
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
ESPELHO="$RAIZ/supabase/migrations/202610181200_campanhas_diarias_email.sql"
for m in "$RAIZ"/supabase/migrations/*.sql; do
  [ "$m" = "$ESPELHO" ] && continue # a parte 31 entra depois das duplicatas de teste
  "${PSQL[@]}" -f "$m" >/dev/null 2>"$DIR/erro" || { echo "falhou ao aplicar $(basename "$m"):"; cat "$DIR/erro"; exit 1; }
done
echo "ok: stub e $(( $(ls "$RAIZ"/supabase/migrations/*.sql | wc -l) - 1 )) migrações anteriores aplicadas"

PARTE31="$(ls "$RAIZ"/supabase/colar-no-painel/sql-*-parte31.sql | head -1)"
# Um envio "carta" duplicado de antes da parte 31, para a limpeza tratar (fica no teste).
"${PSQL[@]}" -f "$RAIZ/fixtures/sql/testar_parte31_antes.sql" >/dev/null
# Duas vezes (idempotente): a do painel e o espelho em supabase/migrations (que têm de ser o mesmo SQL).
diff <(tail -n +2 "$PARTE31") <(tail -n +2 "$ESPELHO") >/dev/null || { echo "o espelho em migrations difere da parte 31"; exit 1; }
"${PSQL[@]}" -f "$PARTE31" >/dev/null 2>"$DIR/erro" || { echo "falhou ao colar $(basename "$PARTE31"):"; cat "$DIR/erro"; exit 1; }
"${PSQL[@]}" -f "$ESPELHO" >/dev/null 2>"$DIR/erro" || { echo "falhou ao colar $(basename "$ESPELHO"):"; cat "$DIR/erro"; exit 1; }
echo "ok: parte 31 aplicada duas vezes ($(basename "$PARTE31") e o espelho)"

"${PSQL[@]}" -f "$RAIZ/fixtures/sql/testar_parte31.sql"
echo "ok: parte 31 conferida"
