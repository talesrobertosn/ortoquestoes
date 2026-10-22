-- Ranking em cache (21/10/2026, pedido do Tales). Antes, cada abertura da página do Ranking
-- recalculava a posição de todo mundo duas vezes (lista e "minha posição"), lendo todas as respostas.
-- Agora o pg_cron recalcula de 10 em 10 minutos (minutos redondos) e guarda em ranking_cache; a página
-- mostra um relógio com a próxima atualização.
--
-- 1. calcular_ranking_bruto(periodo): a conta de sempre (o corpo antigo de calcular_ranking_interno).
-- 2. ranking_cache + ranking_cache_estado e atualizar_ranking_cache(): grava geral e semana.
-- 3. calcular_ranking_interno(periodo) lê o cache; se ele não existir ou tiver mais de 1 hora (cron
--    desligado), cai na conta de sempre. Todas as funções que já a chamavam (lista com setas, top 100,
--    visitante, conquistas, cartas) passam a usar o cache sem mudar nada.
-- 4. minha_posicao_ranking passa a ler a mesma fonte (antes fazia a conta inteira à parte).
-- 5. Agendamento no pg_cron e uma primeira carga.
-- Pode rodar de novo.
begin;

create table if not exists public.ranking_cache (
  periodo text not null check (periodo in ('geral', 'semana')),
  usuario_id uuid not null,
  posicao bigint not null,
  apelido text,
  total bigint not null,
  total_geral bigint not null,
  primary key (periodo, usuario_id)
);
alter table public.ranking_cache enable row level security;
revoke all on public.ranking_cache from anon, authenticated;

create table if not exists public.ranking_cache_estado (
  periodo text primary key check (periodo in ('geral', 'semana')),
  calculado_em timestamptz not null
);
alter table public.ranking_cache_estado enable row level security;
revoke all on public.ranking_cache_estado from anon, authenticated;

create or replace function public.calcular_ranking_bruto(periodo text)
returns table(usuario_id uuid, posicao bigint, apelido text, total bigint, total_geral bigint)
language sql stable security definer set search_path = '' as $$
  with epocas as (
    select p.usuario_id, max(p.versao) as epoca
    from public.progresso_usuario p
    where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
    group by p.usuario_id
  ),
  respostas_validas as (
    select p.usuario_id, p.atualizado_em
    from public.progresso_usuario p
    left join epocas e on e.usuario_id = p.usuario_id
    where p.tipo = 'respondidas'
      and p.valor <> 'null'::jsonb
      and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
  ),
  contagem_geral as (
    select r.usuario_id, count(*) as total_geral
    from respostas_validas r
    group by r.usuario_id
    having count(*) >= 5
  ),
  contagem_periodo as (
    select r.usuario_id, count(*) as total
    from respostas_validas r
    where periodo <> 'semana' or r.atualizado_em >= now() - interval '7 days'
    group by r.usuario_id
  )
  select cp.usuario_id,
         row_number() over (order by cp.total desc, u.created_at asc) as posicao,
         coalesce(pp.apelido, public.nome_publico_ranking(u.raw_user_meta_data)) as apelido,
         cp.total, cg.total_geral
  from contagem_periodo cp
  join contagem_geral cg on cg.usuario_id = cp.usuario_id
  join auth.users u on u.id = cp.usuario_id
  left join public.perfis_publicos pp on pp.usuario_id = cp.usuario_id
  where coalesce(pp.participa_ranking, true)
    and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = cp.usuario_id);
$$;
revoke all on function public.calcular_ranking_bruto(text) from public, anon, authenticated;

create or replace function public.atualizar_ranking_cache()
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_periodo text;
begin
  -- Duas rodadas ao mesmo tempo não adiantam: a segunda sai sem fazer nada.
  if not pg_try_advisory_xact_lock(hashtext('ranking_cache')) then return; end if;
  foreach v_periodo in array array['geral', 'semana'] loop
    delete from public.ranking_cache c where c.periodo = v_periodo;
    insert into public.ranking_cache (periodo, usuario_id, posicao, apelido, total, total_geral)
      select v_periodo, r.usuario_id, r.posicao, r.apelido, r.total, r.total_geral
      from public.calcular_ranking_bruto(v_periodo) r;
    insert into public.ranking_cache_estado (periodo, calculado_em) values (v_periodo, now())
      on conflict (periodo) do update set calculado_em = excluded.calculado_em;
  end loop;
end $$;
revoke all on function public.atualizar_ranking_cache() from public, anon, authenticated;

create or replace function public.calcular_ranking_interno(periodo text)
returns table(usuario_id uuid, posicao bigint, apelido text, total bigint, total_geral bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if exists (select 1 from public.ranking_cache_estado e
             where e.periodo = calcular_ranking_interno.periodo and e.calculado_em > now() - interval '1 hour') then
    return query
      select c.usuario_id, c.posicao, c.apelido, c.total, c.total_geral
      from public.ranking_cache c where c.periodo = calcular_ranking_interno.periodo;
  else
    return query select * from public.calcular_ranking_bruto(calcular_ranking_interno.periodo);
  end if;
end $$;
revoke all on function public.calcular_ranking_interno(text) from public, anon, authenticated;

create or replace function public.minha_posicao_ranking(periodo text default 'geral')
returns table(posicao bigint, total bigint, total_geral bigint)
language sql security definer set search_path = '' stable as $$
  select r.posicao, r.total, r.total_geral
  from public.calcular_ranking_interno(periodo) r
  where r.usuario_id = auth.uid();
$$;

-- Primeira carga, para o cache já valer agora.
select public.atualizar_ranking_cache();

notify pgrst, 'reload schema';
commit;

-- Agendamento de 10 em 10 minutos (fora da transação: sem o pg_cron, o resto continua valendo e a
-- página cai na conta de sempre). Mesmo nome substitui o agendamento antigo.
do $$
begin
  perform cron.schedule('ranking-cache-10min', '*/10 * * * *', 'select public.atualizar_ranking_cache();');
exception when others then
  raise notice 'pg_cron indisponível (%): ligue em Database > Extensions e rode só este bloco de novo.', sqlerrm;
end $$;
