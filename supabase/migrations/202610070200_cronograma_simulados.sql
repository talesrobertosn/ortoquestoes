-- Cronograma: escolha de incluir ou não os OrtoQuestões Simulados.
-- Nova coluna planos_estudo.incluir_simulados (padrão: sim, como era antes).
-- obter_plano_estudo passa a devolvê-la no fim; salvar_plano_estudo ganha o
-- parâmetro p_incluir_simulados com padrão true, então a chamada antiga (sem ele)
-- continua funcionando. A versão de 6 parâmetros sai para não haver duas funções
-- com o mesmo nome. Roda depois da 202610070100. Aditiva: não altera dados.
begin;

alter table public.planos_estudo add column if not exists incluir_simulados boolean not null default true;

drop function if exists public.obter_plano_estudo();
create function public.obter_plano_estudo()
returns table (data_prova date, intensidade text, folgas integer[], prova text, base_respondidas integer, criado_em timestamptz, incluir_simulados boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  return query select p.data_prova, p.intensidade, p.folgas, p.prova, p.base_respondidas, p.criado_em, p.incluir_simulados
               from public.planos_estudo p where p.usuario_id = auth.uid();
end $$;
revoke all on function public.obter_plano_estudo() from public, anon, authenticated;
grant execute on function public.obter_plano_estudo() to authenticated;

-- p_recomecar zera a linha de base (o "adiantado ou atrasado" recomeça hoje).
drop function if exists public.salvar_plano_estudo(date, text, integer[], text, integer, boolean);
drop function if exists public.salvar_plano_estudo(date, text, integer[], text, integer, boolean, boolean);
create function public.salvar_plano_estudo(p_data_prova date, p_intensidade text, p_folgas integer[], p_prova text, p_base integer, p_recomecar boolean default false, p_incluir_simulados boolean default true)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_premium();
  if p_data_prova is null or p_data_prova <= (now() at time zone 'America/Sao_Paulo')::date or p_data_prova > (now() at time zone 'America/Sao_Paulo')::date + 730 then
    raise exception 'data_invalida' using errcode = '22023';
  end if;
  insert into public.planos_estudo as p (usuario_id, data_prova, intensidade, folgas, prova, base_respondidas, incluir_simulados)
  values (auth.uid(), p_data_prova, coalesce(p_intensidade, 'firme'), coalesce(p_folgas, '{}'), coalesce(nullif(btrim(p_prova), ''), 'TEOT'), greatest(coalesce(p_base, 0), 0), coalesce(p_incluir_simulados, true))
  on conflict (usuario_id) do update set
    data_prova = excluded.data_prova, intensidade = excluded.intensidade, folgas = excluded.folgas, prova = excluded.prova,
    incluir_simulados = excluded.incluir_simulados,
    base_respondidas = case when p_recomecar then excluded.base_respondidas else p.base_respondidas end,
    criado_em = case when p_recomecar then now() else p.criado_em end,
    atualizado_em = now();
  return true;
end $$;
revoke all on function public.salvar_plano_estudo(date, text, integer[], text, integer, boolean, boolean) from public, anon, authenticated;
grant execute on function public.salvar_plano_estudo(date, text, integer[], text, integer, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
