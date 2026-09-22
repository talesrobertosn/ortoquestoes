-- Ranking por período: além do total histórico, um recorte dos últimos 7
-- dias, para que quem começou a estudar mais tarde também tenha uma disputa
-- justa em vez de competir para sempre contra quem já respondeu milhares de
-- questões. As assinaturas trocam (novo parâmetro `periodo`, novo campo
-- `total_geral` no retorno), então as funções antigas são substituídas.
begin;

drop function if exists public.obter_ranking_publico();
drop function if exists public.minha_posicao_ranking();

create function public.obter_ranking_publico(periodo text default 'geral')
returns table(posicao bigint, apelido text, total bigint, total_geral bigint, eh_voce boolean)
language sql security definer set search_path = '' stable as $$
  with contagem_geral as (
    select usuario_id, count(*) as total_geral
    from public.progresso_usuario
    where tipo = 'respondidas' and valor <> 'null'::jsonb
    group by usuario_id
  ),
  contagem_periodo as (
    select usuario_id, count(*) as total
    from public.progresso_usuario
    where tipo = 'respondidas' and valor <> 'null'::jsonb
      and (periodo <> 'semana' or atualizado_em >= now() - interval '7 days')
    group by usuario_id
  ),
  ranking as (
    select pp.apelido, cp.total, cg.total_geral, cp.usuario_id,
           row_number() over (order by cp.total desc, pp.atualizado_em asc) as posicao
    from contagem_periodo cp
    join contagem_geral cg on cg.usuario_id = cp.usuario_id
    join public.perfis_publicos pp on pp.usuario_id = cp.usuario_id and pp.participa_ranking = true
  )
  select posicao, apelido, total, total_geral, usuario_id = auth.uid() as eh_voce
  from ranking
  order by posicao
  limit 50;
$$;
revoke all on function public.obter_ranking_publico(text) from public, anon;
grant execute on function public.obter_ranking_publico(text) to authenticated;

create function public.minha_posicao_ranking(periodo text default 'geral')
returns table(posicao bigint, total bigint, total_geral bigint)
language sql security definer set search_path = '' stable as $$
  with contagem_geral as (
    select usuario_id, count(*) as total_geral
    from public.progresso_usuario
    where tipo = 'respondidas' and valor <> 'null'::jsonb
    group by usuario_id
  ),
  contagem_periodo as (
    select usuario_id, count(*) as total
    from public.progresso_usuario
    where tipo = 'respondidas' and valor <> 'null'::jsonb
      and (periodo <> 'semana' or atualizado_em >= now() - interval '7 days')
    group by usuario_id
  ),
  ranking as (
    select cp.usuario_id, cp.total, cg.total_geral,
           row_number() over (order by cp.total desc) as posicao
    from contagem_periodo cp
    join contagem_geral cg on cg.usuario_id = cp.usuario_id
    join public.perfis_publicos pp on pp.usuario_id = cp.usuario_id and pp.participa_ranking = true
  )
  select posicao, total, total_geral from ranking where usuario_id = auth.uid();
$$;
revoke all on function public.minha_posicao_ranking(text) from public, anon;
grant execute on function public.minha_posicao_ranking(text) to authenticated;

notify pgrst, 'reload schema';
commit;
