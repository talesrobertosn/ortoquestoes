-- Parte 35 (21/10/2026): painel do administrador com números prontos (10 minutos). Cole no SQL
-- Editor do Supabase e execute (depois da 34). Mesmo conteúdo de supabase/migrations/202610220000_cache_painel_admin.sql.
-- Painel com números prontos (21/10/2026, pedido do Tales). Série diária, funil, retenção e
-- estatísticas das questões liam as respostas de todas as pessoas a cada abertura do painel.
-- Agora o resultado fica guardado por 10 minutos em cache_admin: a primeira abertura calcula, as
-- seguintes só leem. As funções antigas viram <nome>_bruto (mesma conta de sempre); as de nome
-- original, com a mesma assinatura e o mesmo resultado, passam a usar o cache.
-- Pode rodar de novo.
begin;

create table if not exists public.cache_admin (
  chave text primary key,
  dados jsonb not null,
  calculado_em timestamptz not null default now()
);
alter table public.cache_admin enable row level security;
revoke all on public.cache_admin from anon, authenticated;

create or replace function public.ler_cache_admin(p_chave text, p_validade interval default interval '10 minutes')
returns jsonb
language sql stable security definer set search_path = '' as $$
  select c.dados from public.cache_admin c where c.chave = p_chave and c.calculado_em > now() - p_validade;
$$;
revoke all on function public.ler_cache_admin(text, interval) from public, anon, authenticated;

create or replace function public.gravar_cache_admin(p_chave text, p_dados jsonb)
returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.cache_admin (chave, dados, calculado_em) values (p_chave, p_dados, now())
  on conflict (chave) do update set dados = excluded.dados, calculado_em = excluded.calculado_em;
$$;
revoke all on function public.gravar_cache_admin(text, jsonb) from public, anon, authenticated;

-- serie_diaria_admin: a conta de sempre vira serie_diaria_admin_bruto (só na primeira vez que esta parte roda).
do $$
begin
  if to_regprocedure('public.serie_diaria_admin_bruto(integer)') is null then
    alter function public.serie_diaria_admin(integer) rename to serie_diaria_admin_bruto;
  end if;
end $$;
revoke all on function public.serie_diaria_admin_bruto(integer) from public, anon, authenticated;

create or replace function public.serie_diaria_admin(p_dias integer default 30)
returns table (dia date, cadastros bigint, ativos bigint, respostas bigint)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v jsonb;
begin
  perform public.exigir_administrador();
  v := public.ler_cache_admin('serie_diaria:' || coalesce(p_dias, 30));
  if v is null then
    select coalesce(jsonb_agg(to_jsonb(b) order by b.ordinality), '[]'::jsonb) into v
    from public.serie_diaria_admin_bruto(p_dias) with ordinality as b;
    perform public.gravar_cache_admin('serie_diaria:' || coalesce(p_dias, 30), v);
  end if;
  return query select * from jsonb_to_recordset(v) as x(dia date, cadastros bigint, ativos bigint, respostas bigint);
end $$;
revoke all on function public.serie_diaria_admin(integer) from public, anon, authenticated;
grant execute on function public.serie_diaria_admin(integer) to authenticated;

-- funil_admin: a conta de sempre vira funil_admin_bruto (só na primeira vez que esta parte roda).
do $$
begin
  if to_regprocedure('public.funil_admin_bruto()') is null then
    alter function public.funil_admin() rename to funil_admin_bruto;
  end if;
end $$;
revoke all on function public.funil_admin_bruto() from public, anon, authenticated;

create or replace function public.funil_admin()
returns table (cadastrados bigint, confirmaram bigint, responderam bigint, passaram_50 bigint, passaram_500 bigint, assinaram bigint)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v jsonb;
begin
  perform public.exigir_administrador();
  v := public.ler_cache_admin('funil');
  if v is null then
    select coalesce(jsonb_agg(to_jsonb(b) order by b.ordinality), '[]'::jsonb) into v
    from public.funil_admin_bruto() with ordinality as b;
    perform public.gravar_cache_admin('funil', v);
  end if;
  return query select * from jsonb_to_recordset(v) as x(cadastrados bigint, confirmaram bigint, responderam bigint, passaram_50 bigint, passaram_500 bigint, assinaram bigint);
end $$;
revoke all on function public.funil_admin() from public, anon, authenticated;
grant execute on function public.funil_admin() to authenticated;

-- retencao_admin: a conta de sempre vira retencao_admin_bruto (só na primeira vez que esta parte roda).
do $$
begin
  if to_regprocedure('public.retencao_admin_bruto()') is null then
    alter function public.retencao_admin() rename to retencao_admin_bruto;
  end if;
end $$;
revoke all on function public.retencao_admin_bruto() from public, anon, authenticated;

create or replace function public.retencao_admin()
returns table (semana date, cadastros bigint, estudaram_1a_semana bigint, voltaram_2a_semana bigint)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v jsonb;
begin
  perform public.exigir_administrador();
  v := public.ler_cache_admin('retencao');
  if v is null then
    select coalesce(jsonb_agg(to_jsonb(b) order by b.ordinality), '[]'::jsonb) into v
    from public.retencao_admin_bruto() with ordinality as b;
    perform public.gravar_cache_admin('retencao', v);
  end if;
  return query select * from jsonb_to_recordset(v) as x(semana date, cadastros bigint, estudaram_1a_semana bigint, voltaram_2a_semana bigint);
end $$;
revoke all on function public.retencao_admin() from public, anon, authenticated;
grant execute on function public.retencao_admin() to authenticated;

-- estatisticas_questoes_admin: a conta de sempre vira estatisticas_questoes_admin_bruto (só na primeira vez que esta parte roda).
do $$
begin
  if to_regprocedure('public.estatisticas_questoes_admin_bruto()') is null then
    alter function public.estatisticas_questoes_admin() rename to estatisticas_questoes_admin_bruto;
  end if;
end $$;
revoke all on function public.estatisticas_questoes_admin_bruto() from public, anon, authenticated;

create or replace function public.estatisticas_questoes_admin()
returns table (id_questao text, pessoas bigint, acertos_primeira bigint, erros_primeira bigint, acertos_atual bigint)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v jsonb;
begin
  perform public.exigir_administrador();
  v := public.ler_cache_admin('estatisticas_questoes');
  if v is null then
    select coalesce(jsonb_agg(to_jsonb(b) order by b.ordinality), '[]'::jsonb) into v
    from public.estatisticas_questoes_admin_bruto() with ordinality as b;
    perform public.gravar_cache_admin('estatisticas_questoes', v);
  end if;
  return query select * from jsonb_to_recordset(v) as x(id_questao text, pessoas bigint, acertos_primeira bigint, erros_primeira bigint, acertos_atual bigint);
end $$;
revoke all on function public.estatisticas_questoes_admin() from public, anon, authenticated;
grant execute on function public.estatisticas_questoes_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
