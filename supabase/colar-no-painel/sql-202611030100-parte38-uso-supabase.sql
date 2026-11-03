-- Uso do Supabase no painel do administrador (Tales, 03/11/2026): banco, arquivos e contas, para ver de longe
-- quanto falta para os limites do plano. Só leitura e só para administrador: a função confere no próprio banco
-- (public.exigir_administrador, o mesmo controle do resto do painel) e recusa todo o resto. Devolve só os números
-- brutos (bytes e contagens); os limites do plano ficam no código do painel, num lugar só.
-- Aditiva: só cria uma função. Pode ser rodada de novo.
begin;

create or replace function public.uso_supabase_admin()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_banco bigint;
  v_tabelas jsonb;
  v_arquivos bigint;
  v_baldes jsonb;
  v_contas bigint;
  v_ativas bigint;
begin
  perform public.exigir_administrador();

  -- Banco: o tamanho total e as 10 tabelas que mais ocupam (com índices e TOAST), de qualquer esquema
  -- que não seja do próprio Postgres.
  v_banco := pg_catalog.pg_database_size(pg_catalog.current_database());
  select coalesce(jsonb_agg(jsonb_build_object('esquema', t.esquema, 'tabela', t.tabela, 'bytes', t.bytes) order by t.bytes desc), '[]'::jsonb)
    into v_tabelas
  from (
    select n.nspname::text as esquema, c.relname::text as tabela, pg_catalog.pg_total_relation_size(c.oid) as bytes
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'm', 'p')
      and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
      and n.nspname not like 'pg_temp%'
    order by pg_catalog.pg_total_relation_size(c.oid) desc
    limit 10
  ) t;

  -- Arquivos (Storage): a soma do tamanho de cada objeto, no total e por balde.
  select coalesce(sum(b.bytes), 0)::bigint,
         coalesce(jsonb_agg(jsonb_build_object('balde', b.balde, 'bytes', b.bytes, 'arquivos', b.arquivos) order by b.bytes desc), '[]'::jsonb)
    into v_arquivos, v_baldes
  from (
    select o.bucket_id::text as balde,
           coalesce(sum(nullif(o.metadata->>'size', '')::bigint), 0)::bigint as bytes,
           count(*)::bigint as arquivos
    from storage.objects o
    group by o.bucket_id
  ) b;

  -- Contas: o total e quem entrou nos últimos 30 dias (último login).
  select count(*)::bigint,
         count(*) filter (where u.last_sign_in_at >= now() - interval '30 days')::bigint
    into v_contas, v_ativas
  from auth.users u;

  return jsonb_build_object(
    'medido_em', now(),
    'banco_bytes', v_banco,
    'tabelas', v_tabelas,
    'arquivos_bytes', v_arquivos,
    'baldes', v_baldes,
    'contas', v_contas,
    'ativas_30d', v_ativas
  );
end $$;
revoke all on function public.uso_supabase_admin() from public, anon, authenticated;
grant execute on function public.uso_supabase_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
