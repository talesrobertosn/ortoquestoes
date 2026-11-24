-- As listas de questões reservadas podem ultrapassar o teto antigo de 4 KB.
begin;

alter table public.planos_estudo
  drop constraint planos_estudo_opcoes_check,
  add constraint planos_estudo_opcoes_check
    check (jsonb_typeof(opcoes) = 'object' and pg_column_size(opcoes) <= 262144);

create or replace function public.ajustar_opcoes_plano(p_patch jsonb)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  v_novas jsonb;
begin
  perform public.exigir_premium();
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'opcoes_invalidas' using errcode = '22023';
  end if;
  select p.opcoes || p_patch into v_novas from public.planos_estudo p where p.usuario_id = auth.uid() for update;
  if not found then raise exception 'plano_inexistente' using errcode = 'P0002'; end if;
  if pg_column_size(v_novas) > 262144 then raise exception 'opcoes_invalidas' using errcode = '22023'; end if;
  update public.planos_estudo set opcoes = v_novas, atualizado_em = now() where usuario_id = auth.uid();
  return true;
end $$;

create or replace function public.salvar_plano_estudo(p_data_prova date, p_intensidade text, p_folgas integer[], p_prova text, p_base integer, p_recomecar boolean default false, p_incluir_simulados boolean default true, p_opcoes jsonb default null)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_premium();
  if p_data_prova is null or p_data_prova <= (now() at time zone 'America/Sao_Paulo')::date or p_data_prova > (now() at time zone 'America/Sao_Paulo')::date + 730 then
    raise exception 'data_invalida' using errcode = '22023';
  end if;
  if p_opcoes is not null and (jsonb_typeof(p_opcoes) <> 'object' or pg_column_size(p_opcoes) > 262144) then
    raise exception 'opcoes_invalidas' using errcode = '22023';
  end if;
  insert into public.planos_estudo as p (usuario_id, data_prova, intensidade, folgas, prova, base_respondidas, incluir_simulados, opcoes)
  values (auth.uid(), p_data_prova, coalesce(p_intensidade, 'firme'), coalesce(p_folgas, '{}'), coalesce(nullif(btrim(p_prova), ''), 'TEOT'), greatest(coalesce(p_base, 0), 0), coalesce(p_incluir_simulados, true), coalesce(p_opcoes, '{}'::jsonb))
  on conflict (usuario_id) do update set
    data_prova = excluded.data_prova, intensidade = excluded.intensidade, folgas = excluded.folgas, prova = excluded.prova,
    incluir_simulados = excluded.incluir_simulados,
    opcoes = coalesce(p_opcoes, p.opcoes),
    base_respondidas = case when p_recomecar then excluded.base_respondidas else p.base_respondidas end,
    criado_em = case when p_recomecar then now() else p.criado_em end,
    atualizado_em = now();
  return true;
end $$;

notify pgrst, 'reload schema';
commit;
