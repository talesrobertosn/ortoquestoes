-- Administradores (public.administradores) respondem sem o limite diário
-- gratuito. Mesma função da 202609190001, com uma verificação a mais antes da
-- assinatura; nada muda para os demais usuários.
begin;

create or replace function public.autorizar_resposta(p_chave_idempotencia uuid, p_id_questao text)
returns table (permitido boolean, paywall_ativo boolean, ilimitado boolean, consumidas integer, limite integer, restantes integer, libera_em timestamptz, sequencia integer, motivo text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_agora timestamptz := clock_timestamp();
  v_dia date := (v_agora at time zone 'America/Sao_Paulo')::date;
  v_libera timestamptz := ((v_dia + 1)::timestamp at time zone 'America/Sao_Paulo');
  v_config public.configuracao_comercial%rowtype;
  v_teste boolean := false;
  v_ilimitado boolean := false;
  v_consumidas integer := 0;
  v_existente public.respostas_autorizadas%rowtype;
  v_sequencia integer := 0;
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_id_questao is null or length(p_id_questao) > 160 then raise exception 'questao_invalida'; end if;
  select * into v_config from public.configuracao_comercial where id = true;
  if not found then raise exception 'configuracao_ausente'; end if;
  select exists(select 1 from public.contas_teste where id_usuario=v_usuario and ativa) into v_teste;
  paywall_ativo := v_config.paywall_ativo or v_teste;
  limite := v_config.limite_diario_gratis;

  if not paywall_ativo then
    return query select true, false, true, 0, limite, null::integer, v_libera, 0, null::text;
    return;
  end if;

  -- Administradores respondem sem limite, como um assinante, sem precisar de
  -- uma assinatura (que entraria nas métricas de receita do painel).
  select exists(select 1 from public.administradores adm where adm.id_usuario=v_usuario) into v_ilimitado;
  if not v_ilimitado then
  select exists(select 1 from public.assinaturas a where a.id_usuario=v_usuario and (a.status='ativa' or (a.status='cancelada' and a.cancelar_ao_fim)) and coalesce(a.fim_periodo, 'infinity') > v_agora) into v_ilimitado;
  end if;
  if v_ilimitado then
    insert into public.respostas_autorizadas values (p_chave_idempotencia,v_usuario,p_id_questao,v_dia,false,v_agora) on conflict do nothing;
    return query select true, true, true, 0, limite, null::integer, v_libera, 0, null::text;
    return;
  end if;

  select * into v_existente from public.respostas_autorizadas where chave_idempotencia=p_chave_idempotencia and id_usuario=v_usuario;
  if found then
    select quantidade into v_consumidas from public.consumo_diario where id_usuario=v_usuario and dia=v_dia;
    return query select true,true,false,coalesce(v_consumidas,0),limite,greatest(limite-coalesce(v_consumidas,0),0),v_libera,0,null::text;
    return;
  end if;

  insert into public.consumo_diario(id_usuario,dia,quantidade) values(v_usuario,v_dia,0) on conflict do nothing;
  select quantidade into v_consumidas from public.consumo_diario where id_usuario=v_usuario and dia=v_dia for update;
  if v_consumidas >= limite then
    with dias as (select dia, dia - row_number() over(order by dia)::int as grupo from public.consumo_diario where id_usuario=v_usuario and quantidade>0 and dia<=v_dia), atual as (select grupo from dias where dia=v_dia) select count(*) into v_sequencia from dias where grupo=(select grupo from atual);
    return query select false,true,false,v_consumidas,limite,0,v_libera,coalesce(v_sequencia,0),'Você atingiu o limite diário gratuito.'::text;
    return;
  end if;
  insert into public.respostas_autorizadas values(p_chave_idempotencia,v_usuario,p_id_questao,v_dia,true,v_agora);
  update public.consumo_diario set quantidade=quantidade+1, atualizado_em=v_agora where id_usuario=v_usuario and dia=v_dia returning quantidade into v_consumidas;
  return query select true,true,false,v_consumidas,limite,greatest(limite-v_consumidas,0),v_libera,0,null::text;
end $$;

revoke all on function public.autorizar_resposta(uuid,text) from public;
grant execute on function public.autorizar_resposta(uuid,text) to authenticated;

notify pgrst, 'reload schema';
commit;
