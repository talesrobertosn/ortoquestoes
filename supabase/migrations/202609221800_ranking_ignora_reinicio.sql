-- "Zerar progresso" não apaga nem tombstona as linhas antigas de
-- progresso_usuario: o app troca de "época" (grava um marcador em
-- historico/reinicio.v2.<uuid> e passa a prefixar cada item com
-- `r<versao do marcador>:`), e o cliente simplesmente ignora, na leitura,
-- qualquer linha que não tenha o prefixo da época atual (ver
-- src/conta/sincronizacao.ts, função aplicar()). As funções antigas
-- apagar_progresso()/apagar_progresso_conta() (que de fato zeram o valor)
-- nunca são chamadas pelo app — são uma abordagem anterior, hoje morta.
--
-- O ranking contava linhas cruas de progresso_usuario e por isso continuava
-- somando respostas de antes de um reinício. Esta migração faz as mesmas
-- duas funções reconhecerem a época atual de cada pessoa (a maior versão
-- entre seus marcadores de reinício) e só contar linhas dessa época — a
-- mesma regra que o próprio site já aplica ao ler o progresso local.
begin;

create or replace function public.obter_ranking_publico(periodo text default 'geral')
returns table(posicao bigint, apelido text, total bigint, total_geral bigint, eh_voce boolean)
language sql security definer set search_path = '' stable as $$
  with epocas as (
    select usuario_id, max(versao) as epoca
    from public.progresso_usuario
    where tipo = 'historico' and (item = '__reinicio__' or item like 'reinicio.v2.%')
    group by usuario_id
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
    select usuario_id, count(*) as total_geral
    from respostas_validas
    group by usuario_id
  ),
  contagem_periodo as (
    select usuario_id, count(*) as total
    from respostas_validas
    where periodo <> 'semana' or atualizado_em >= now() - interval '7 days'
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

create or replace function public.minha_posicao_ranking(periodo text default 'geral')
returns table(posicao bigint, total bigint, total_geral bigint)
language sql security definer set search_path = '' stable as $$
  with epocas as (
    select usuario_id, max(versao) as epoca
    from public.progresso_usuario
    where tipo = 'historico' and (item = '__reinicio__' or item like 'reinicio.v2.%')
    group by usuario_id
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
    select usuario_id, count(*) as total_geral
    from respostas_validas
    group by usuario_id
  ),
  contagem_periodo as (
    select usuario_id, count(*) as total
    from respostas_validas
    where periodo <> 'semana' or atualizado_em >= now() - interval '7 days'
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

notify pgrst, 'reload schema';
commit;
