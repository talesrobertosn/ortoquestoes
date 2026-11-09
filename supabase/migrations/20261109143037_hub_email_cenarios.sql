-- Cenários de e-mail independentes, com uma pessoa por fila diária.
begin;
CREATE OR REPLACE FUNCTION public.hub_bloqueio(p_id uuid, p_tipo text, p_categoria text, p_referencia text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_u auth.users; v_modelo text; v_trans boolean; v_periodico boolean; v_n int;
begin
  select * into v_u from auth.users where id=p_id;
  if v_u.email is null then return 'Sem endereço de e-mail'; end if;
  if v_u.email_confirmed_at is null then return 'E-mail não confirmado'; end if;
  if exists(select 1 from public.administradores where id_usuario=p_id) then return 'Conta administradora'; end if;
  if exists(select 1 from public.contas_fora_publico where id_usuario=p_id) then return 'Fora do público'; end if;
  if p_tipo='nunca_comecou' and exists(select 1 from public.emails_enviados where id_usuario=p_id and status in ('enviado','enviando') and (modelo='nunca_comecou' or referencia='nunca')) then return 'Primeiro convite já enviado'; end if;
  if p_tipo='marco' and not coalesce((select marcos_automaticos from public.configuracao_emails where id=true),true) then return 'Marcos de estudo desligados pelo administrador'; end if;
  if p_tipo='assinou_sem_cronograma' then return 'Modelo aposentado; o cronograma é opcional'; end if;
  if p_tipo='obrigado_assinatura' then return 'Modelo aposentado; agradecimento automático no pagamento'; end if;
  if not coalesce((select case p_categoria when 'conquistas' then conquistas when 'relatorio' then relatorio_mensal when 'lembretes' then lembretes else cartas end
    from public.preferencias_email where id_usuario=p_id),true) then return 'Preferência de e-mail desligada'; end if;
  if p_tipo like 'convite%' or p_tipo='resumo_do_tema' then
    if lower(coalesce(v_u.raw_user_meta_data->>'receber_novidades',''))<>'true' then return 'Sem aceite de novidades'; end if;
  end if;
  if p_tipo like 'convite%' and public.motivo_premium_interno(p_id) in ('assinatura','cortesia','administrador') then return 'Já possui acesso completo'; end if;
  if p_referencia is not null and exists(select 1 from public.emails_enviados where id_usuario=p_id and referencia=p_referencia and status in ('enviando','enviado')) then return 'Esta mensagem já foi reservada ou enviada'; end if;
  v_trans:=p_tipo in ('pix_hoje','pagamento_aprovado','obrigado_tempo','relato_resolvido','alerta_admin');
  v_periodico:=p_tipo='relatorio';
  if not v_trans and not v_periodico then
    select count(*) into v_n from public.emails_enviados e where e.id_usuario=p_id and e.status in ('enviado','enviando') and e.enviado_em>now()-interval '48 hours'
      and e.tipo not in ('pix_hoje','pagamento_aprovado','obrigado_tempo','relato_resolvido','alerta_admin')
      and split_part(coalesce(e.modelo,''),':',1) not in ('pix_hoje','pagamento_aprovado','obrigado_tempo','relato_resolvido','alerta_admin');
    if v_n>0 then return 'Intervalo mínimo de 48 horas'; end if;
    select count(*) into v_n from public.emails_enviados e where e.id_usuario=p_id and e.status in ('enviado','enviando') and e.enviado_em>now()-interval '14 days'
      and e.tipo not in ('pix_hoje','pagamento_aprovado','obrigado_tempo','relato_resolvido','alerta_admin')
      and split_part(coalesce(e.modelo,''),':',1) not in ('pix_hoje','pagamento_aprovado','obrigado_tempo','relato_resolvido','alerta_admin');
    if v_n>=3 then return 'Limite de três e-mails em 14 dias'; end if;
    -- Famílias equivalentes: trocar o nome da carta não deve repetir o mesmo contato.
    v_modelo:=case when p_tipo like 'convite%' then 'convite' when p_tipo in ('sumiu','pausa','comecou_parou','assinante_parado_7','como_estao','voltou') then 'retomada' else p_tipo end;
    if exists(select 1 from public.emails_enviados e where e.id_usuario=p_id and e.status in ('enviado','enviando') and e.enviado_em>now()-interval '30 days'
      and case when e.modelo like 'convite%' then 'convite' when split_part(coalesce(e.modelo,''),':',1) in ('sumiu','pausa','comecou_parou','assinante_parado_7','como_estao','voltou') then 'retomada' else split_part(coalesce(e.modelo,''),':',1) end=v_modelo)
      then return 'Mesmo assunto enviado nos últimos 30 dias'; end if;
  end if;
  return null;
end $function$;

create or replace function public.candidatos_assinou_sem_cronograma(p_limite integer default 40)
returns table(id_usuario uuid,referencia text,dados jsonb)
language sql stable security definer set search_path='' as $$
 select null::uuid,null::text,null::jsonb where false;
$$;
revoke all on function public.candidatos_assinou_sem_cronograma(integer) from public,anon,authenticated;
grant execute on function public.candidatos_assinou_sem_cronograma(integer) to service_role;

create or replace function public.hub_iniciar(p_admin uuid,p_itens jsonb,p_resumo jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_n integer; v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
begin
 if not exists(select 1 from public.administradores where id_usuario=p_admin) then raise exception 'acesso_negado'; end if;
 if p_itens is null or jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens) not between 1 and 2000 then raise exception 'fila_invalida'; end if;
 insert into public.email_rodadas(dia,criado_por) values(v_dia,p_admin) on conflict(dia) do nothing;
 select id into v_id from public.email_rodadas where dia=v_dia for update;
 insert into public.email_fila(rodada,id_usuario,mensagem)
   select v_id,(m->>'id_usuario')::uuid,m from jsonb_array_elements(p_itens) m
   where m->>'tipo' not in ('assinou_sem_cronograma','obrigado_assinatura')
   on conflict(rodada,id_usuario) do nothing;
 get diagnostics v_n = row_count;
 if v_n>0 then
   update public.email_rodadas set
     status=case when status='pausada' then 'pausada' else 'ativa' end,
     resumo=resumo || jsonb_build_object('lotes',coalesce(resumo->'lotes','[]'::jsonb) || jsonb_build_array(coalesce(p_resumo,'{}'::jsonb) || jsonb_build_object('incluidas',v_n,'em',now())))
   where id=v_id;
 end if;
 return v_id;
end $$;
revoke all on function public.hub_iniciar(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.hub_iniciar(uuid,jsonb,jsonb) to service_role;

-- A conclusão usa o mesmo bloqueio que acrescentar um cenário, evitando encerrar uma fila recém-ampliada.
create or replace function public.hub_concluir(p_rodada uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.email_rodadas where id=p_rodada for update;
 update public.email_rodadas r set status='concluida'
 where r.id=p_rodada and r.status='ativa' and not exists(
   select 1 from public.email_fila f where f.rodada=r.id and f.status in ('pendente','processando')
 );
end $$;
revoke all on function public.hub_concluir(uuid) from public,anon,authenticated;
grant execute on function public.hub_concluir(uuid) to service_role;

-- Filas já autorizadas não devem enviar um modelo que o dono retirou.
update public.email_fila set status='adiado',motivo='Modelo retirado: montar cronograma é opcional',atualizado_em=now()
where status='pendente' and mensagem->>'tipo'='assinou_sem_cronograma';
commit;
