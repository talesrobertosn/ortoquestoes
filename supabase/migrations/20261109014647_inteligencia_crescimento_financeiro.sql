-- Leituras coerentes de crescimento e anotações de contexto, restritas ao administrador.
create table public.anotacoes_negocio (
  id bigint generated always as identity primary key,
  dia date not null,
  texto text not null check (char_length(btrim(texto)) between 3 and 200),
  criado_por uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
create index anotacoes_negocio_dia_idx on public.anotacoes_negocio(dia desc, id desc);
create index anotacoes_negocio_criado_por_idx on public.anotacoes_negocio(criado_por);
alter table public.anotacoes_negocio enable row level security;
revoke all on public.anotacoes_negocio from anon, authenticated;

create or replace function public.listar_anotacoes_negocio_admin()
returns table(id bigint, dia date, texto text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  return query select a.id, a.dia, a.texto from public.anotacoes_negocio a order by a.dia desc, a.id desc limit 500;
end $$;
create or replace function public.salvar_anotacao_negocio_admin(p_dia date, p_texto text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  perform public.exigir_administrador();
  if p_dia is null or p_dia < date '2020-01-01' or p_dia > current_date + 366 then raise exception 'data_invalida'; end if;
  insert into public.anotacoes_negocio(dia, texto, criado_por) values (p_dia, btrim(p_texto), auth.uid()) returning id into v_id;
  return v_id;
end $$;
create or replace function public.remover_anotacao_negocio_admin(p_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  delete from public.anotacoes_negocio a where a.id = p_id;
  return found;
end $$;

-- p_excluir transporta as exclusões de testes já reconhecidas pelo frontend.
-- Admin e fora do público são excluídos no servidor independentemente desse parâmetro.
create or replace function public.jornada_crescimento_admin(p_excluir uuid[] default '{}', p_dias integer default 365)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_resultado jsonb; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  perform public.exigir_administrador();
  if cardinality(p_excluir) > 10000 then raise exception 'exclusoes_excedidas'; end if;
  with pessoas as materialized (
    select u.id, u.created_at, date_trunc('week', u.created_at at time zone 'America/Sao_Paulo')::date as semana
    from auth.users u
    where not (u.id = any(coalesce(p_excluir, '{}'::uuid[])))
      and not exists (select 1 from public.administradores a where a.id_usuario = u.id)
      and not exists (select 1 from public.contas_fora_publico f where f.id_usuario = u.id)
  ), respostas as materialized (
    select r.* from public.respostas_validas_interno() r join pessoas u on u.id = r.usuario_id
  ), eventos as materialized (
    select r.usuario_id, to_timestamp((e->>'em')::double precision / 1000) as em
    from respostas r cross join lateral jsonb_array_elements(r.eventos) e
    where jsonb_typeof(e->'em') = 'number'
    union all
    select r.usuario_id, to_timestamp(r.q / 1000) from respostas r where jsonb_array_length(r.eventos) = 0 and r.q is not null
  ), primeiras_questoes as (
    select r.usuario_id, r.id_questao,
      least(to_timestamp(r.q / 1000), (select min(to_timestamp((e->>'em')::double precision / 1000)) from jsonb_array_elements(r.eventos) e where jsonb_typeof(e->'em') = 'number')) as em
    from respostas r
  ), ordenadas as (
    select usuario_id, em, row_number() over(partition by usuario_id order by em) as n
    from primeiras_questoes where em is not null and em <= now()
  ), primeiros as (
    select usuario_id as id_usuario, min(em) as primeira, min(em) filter(where n = 10) as decima from ordenadas group by usuario_id
  ), dias as (
    select (v_hoje - g)::date as dia from generate_series(0, least(greatest(coalesce(p_dias,365),7),365)-1) g
  ), estudo_dia as (
    select (e.em at time zone 'America/Sao_Paulo')::date as dia, count(distinct e.usuario_id) as ativos, count(*) as respostas
    from eventos e where e.em >= (v_hoje - 365)::timestamp at time zone 'America/Sao_Paulo' and e.em <= now() group by 1
  ), cadastros_dia as (
    select (u.created_at at time zone 'America/Sao_Paulo')::date as dia, count(*) as cadastros from pessoas u group by 1
  ), serie as (
    select d.dia, coalesce(c.cadastros,0) as cadastros, coalesce(e.ativos,0) as ativos, coalesce(e.respostas,0) as respostas
    from dias d left join estudo_dia e using(dia) left join cadastros_dia c using(dia)
  ), coortes as (
    select u.semana, count(*) as cadastros,
      count(*) filter(where exists(select 1 from eventos e where e.usuario_id = u.id and e.em >= u.created_at and e.em < u.created_at + interval '7 days')) as estudaram_1a_semana,
      count(*) filter(where exists(select 1 from eventos e where e.usuario_id = u.id and e.em >= u.created_at + interval '7 days' and e.em < u.created_at + interval '14 days')) as voltaram_2a_semana
    from pessoas u where u.semana <= date_trunc('week', v_hoje)::date - 14 group by u.semana order by u.semana desc limit 12
  )
  select jsonb_build_object(
    'serie', coalesce((select jsonb_agg(to_jsonb(s) order by s.dia) from serie s),'[]'::jsonb),
    'coortes', coalesce((select jsonb_agg(to_jsonb(c) order by c.semana desc) from coortes c),'[]'::jsonb),
    'primeiros', coalesce((select jsonb_agg(to_jsonb(p)) from primeiros p),'[]'::jsonb)
  ) into v_resultado;
  return v_resultado;
end $$;

revoke all on function public.listar_anotacoes_negocio_admin() from public, anon, authenticated;
revoke all on function public.salvar_anotacao_negocio_admin(date,text) from public, anon, authenticated;
revoke all on function public.remover_anotacao_negocio_admin(bigint) from public, anon, authenticated;
revoke all on function public.jornada_crescimento_admin(uuid[],integer) from public, anon, authenticated;
grant execute on function public.listar_anotacoes_negocio_admin(), public.salvar_anotacao_negocio_admin(date,text), public.remover_anotacao_negocio_admin(bigint), public.jornada_crescimento_admin(uuid[],integer) to authenticated;
