-- Parte 9: ranking até o top 100. Rode depois das partes 1 a 8.
-- Cole TUDO no SQL Editor do Supabase e clique em Run (sem selecionar nada).
-- Ranking até o top 100. A tela mostra o top 50 e um botão abre até o 100;
-- a RPC passa a devolver as posições 1 a 100 (e a sua linha, mesmo fora delas).
-- Mesma função da 202610060100, só muda o limite. Roda depois da 202610070200.
-- Aditiva: não altera dados.
begin;

drop function if exists public.obter_ranking_com_movimento(text);

create function public.obter_ranking_com_movimento(periodo text default 'geral')
returns table(
  posicao bigint, apelido text, total bigint, total_geral bigint,
  eh_voce boolean, variacao bigint, variacao_semana bigint, novo boolean,
  referencia_em date, emblemas text[], sequencia integer, servico text
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  tem_historico boolean;
begin
  if auth.uid() is null then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  if periodo is null or periodo not in ('geral', 'semana') then
    raise exception 'periodo_invalido' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.ranking_posicoes_diarias h
    where h.periodo = obter_ranking_com_movimento.periodo and h.dia < hoje
  ) into tem_historico;

  return query
    select r.posicao, r.apelido, r.total, r.total_geral,
           r.usuario_id = auth.uid() as eh_voce,
           case when anterior.posicao is null then null
                else anterior.posicao - r.posicao end as variacao,
           case when semana.posicao is null then null
                else semana.posicao - r.posicao end as variacao_semana,
           (tem_historico and anterior.posicao is null) as novo,
           anterior.dia as referencia_em,
           coalesce(pp.emblemas, '{}') as emblemas,
           case when pp.sequencia_em >= hoje - 1 then pp.sequencia_atual else 0 end as sequencia,
           case when coalesce(pp.mostrar_servico, false)
                then nullif(left(btrim(u.raw_user_meta_data->>'servico'), 80), '') end as servico
    from public.calcular_ranking_interno(periodo) r
    left join public.perfis_publicos pp on pp.usuario_id = r.usuario_id
    left join auth.users u on u.id = r.usuario_id
    left join lateral (
      select h.posicao, h.dia
      from public.ranking_posicoes_diarias h
      where h.usuario_id = r.usuario_id and h.periodo = obter_ranking_com_movimento.periodo
        and h.dia < hoje
      order by h.dia desc
      limit 1
    ) anterior on true
    left join lateral (
      select h.posicao
      from public.ranking_posicoes_diarias h
      where h.usuario_id = r.usuario_id and h.periodo = obter_ranking_com_movimento.periodo
        and h.dia < hoje and h.dia >= hoje - 7
      order by h.dia asc
      limit 1
    ) semana on true
    where r.posicao <= 100 or r.usuario_id = auth.uid()
    order by r.posicao;

  insert into public.ranking_posicoes_diarias (dia, periodo, usuario_id, posicao, registrada_em)
  select hoje, obter_ranking_com_movimento.periodo, r.usuario_id, r.posicao, now()
  from public.calcular_ranking_interno(periodo) r
  on conflict on constraint ranking_posicoes_diarias_pkey do update
    set posicao = excluded.posicao, registrada_em = excluded.registrada_em;

  delete from public.ranking_posicoes_diarias where dia < hoje - 30;
end;
$$;

revoke all on function public.obter_ranking_com_movimento(text) from public, anon, authenticated;
grant execute on function public.obter_ranking_com_movimento(text) to authenticated;

notify pgrst, 'reload schema';
commit;
