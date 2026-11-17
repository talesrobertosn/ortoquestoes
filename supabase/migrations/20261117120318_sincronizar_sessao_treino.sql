-- Sincroniza o treino inteiro pela RPC existente, com a mesma RLS e trava de versão.
-- Clientes antigos guardam o tipo novo separadamente, sem alterar sua sessão local.
begin;
alter table public.progresso_usuario drop constraint progresso_usuario_tipo_check;
alter table public.progresso_usuario add constraint progresso_usuario_tipo_check
  check (tipo in ('respondidas', 'favoritos', 'notas', 'historico', 'biblioteca', 'sessoes'));

-- Conserva a validação dos tipos anteriores, inclusive extensões já instaladas.
do $$
declare anterior text;
begin
  select pg_get_expr(conbin, conrelid) into strict anterior
    from pg_constraint where conrelid = 'public.progresso_usuario'::regclass
      and conname = 'forma_documento';
  alter table public.progresso_usuario drop constraint forma_documento;
  execute format($sql$
    alter table public.progresso_usuario add constraint forma_documento check (
      (tipo <> 'sessoes' and (%s)) or
      (tipo = 'sessoes' and (valor = 'null'::jsonb or coalesce(
        jsonb_typeof(valor) = 'object'
        and jsonb_typeof(valor->'id') = 'string'
        and length(valor->>'id') between 1 and 200
        and jsonb_typeof(valor->'criadaEm') = 'number'
        and jsonb_typeof(valor->'ids') = 'array'
        and jsonb_typeof(valor->'filtros') = 'object'
        and jsonb_typeof(valor->'respostas') = 'object'
        and jsonb_typeof(valor->'revisar') = 'array'
        and jsonb_typeof(valor->'riscadas') = 'object'
        and jsonb_typeof(valor->'posicao') = 'number'
        and valor->>'posicao' ~ '^[0-9]+$'
        and (valor->'concluidaEm' = 'null'::jsonb or jsonb_typeof(valor->'concluidaEm') = 'number')
        and not (valor ? 'nacional'), false)))
    )
  $sql$, anterior);
end $$;
commit;
