-- Shorts fora do ranking (Tales, 25/11/2026: "essas questões do short não contam pro ranking; só as questões
-- feitas normalmente contam"). A questão respondida só nos Shorts fica em respondidas com a marca sh = 1 (para o
-- desempenho); a conta do ranking passa a ignorá-la. Se a pessoa depois responder a mesma questão numa sessão
-- normal, a marca sai e ela passa a contar. Só troca a função de conta; o cache se refaz no próximo ciclo (10 min).
begin;

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
      -- Questão respondida só nos Shorts (marca sh) não conta no ranking (Tales, 25/11/2026).
      and coalesce(p.valor->>'sh', '') <> '1'
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

select public.atualizar_ranking_cache();

commit;
