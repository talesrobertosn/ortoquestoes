-- Ranking visível para quem ainda não tem conta (11/10/2026, pedido do dono).
--
-- obter_ranking_visitante(periodo): as 50 primeiras posições, sem login. Os
-- Termos (item 14.7) prometem que nome e apelido só aparecem para quem tem
-- conta; por isso o visitante vê só as iniciais ("Ana S." vira "A. S."), além
-- de posição, questões, emblemas, sequência e movimento. O serviço da
-- residência nunca vai para o visitante. Não grava histórico de posições:
-- isso continua com obter_ranking_com_movimento, de quem entra na conta.
--
-- Aditiva: só cria uma função. Pode ser rodada de novo.
begin;

create or replace function public.iniciais_ranking_interno(p_nome text)
returns text language sql immutable set search_path = '' as $$
  select coalesce(nullif(array_to_string(array(
    select upper(left(palavra, 1)) || '.'
    from unnest(regexp_split_to_array(btrim(coalesce(p_nome, '')), '\s+')) with ordinality as t(palavra, ordem)
    where palavra ~ '[[:alnum:]]'
    order by ordem limit 2
  ), ' '), ''), '?')
$$;
revoke all on function public.iniciais_ranking_interno(text) from public, anon, authenticated;

create or replace function public.obter_ranking_visitante(periodo text default 'geral')
returns table(
  posicao bigint, apelido text, total bigint, total_geral bigint,
  eh_voce boolean, variacao bigint, variacao_semana bigint, novo boolean,
  referencia_em date, emblemas text[], sequencia integer, servico text
)
language plpgsql stable security definer set search_path = '' as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if periodo is null or periodo not in ('geral', 'semana') then
    raise exception 'periodo_invalido' using errcode = '22023';
  end if;
  return query
    select r.posicao, public.iniciais_ranking_interno(r.apelido), r.total, r.total_geral,
           false,
           case when anterior.posicao is null then null else anterior.posicao - r.posicao end,
           case when semana.posicao is null then null else semana.posicao - r.posicao end,
           false,
           anterior.dia,
           coalesce(pp.emblemas, '{}'),
           case when pp.sequencia_em >= hoje - 1 then pp.sequencia_atual else 0 end,
           null::text
    from public.calcular_ranking_interno(periodo) r
    left join public.perfis_publicos pp on pp.usuario_id = r.usuario_id
    left join lateral (
      select h.posicao, h.dia from public.ranking_posicoes_diarias h
      where h.usuario_id = r.usuario_id and h.periodo = obter_ranking_visitante.periodo and h.dia < hoje
      order by h.dia desc limit 1
    ) anterior on true
    left join lateral (
      select h.posicao from public.ranking_posicoes_diarias h
      where h.usuario_id = r.usuario_id and h.periodo = obter_ranking_visitante.periodo
        and h.dia < hoje and h.dia >= hoje - 7
      order by h.dia asc limit 1
    ) semana on true
    where r.posicao <= 50
    order by r.posicao;
end;
$$;
revoke all on function public.obter_ranking_visitante(text) from public;
grant execute on function public.obter_ranking_visitante(text) to anon, authenticated;

notify pgrst, 'reload schema';
commit;
