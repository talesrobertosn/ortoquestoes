-- Central diária. Preparar/consultar não envia; somente uma rodada iniciada pelo admin é processada.
begin;
create table public.email_rodadas (
  id uuid primary key default gen_random_uuid(), dia date not null unique,
  status text not null default 'ativa' check (status in ('ativa','pausada','concluida')),
  resumo jsonb not null default '{}'::jsonb, criado_por uuid not null references auth.users(id), criado_em timestamptz not null default now()
);
create table public.email_fila (
  id uuid primary key default gen_random_uuid(), rodada uuid not null references public.email_rodadas(id) on delete cascade,
  id_usuario uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente','processando','enviado','adiado','falhou','incerto','pulado')),
  mensagem jsonb not null, motivo text, envio_id bigint references public.emails_enviados(id),
  atualizado_em timestamptz not null default now(), unique (rodada,id_usuario)
);
create index email_fila_execucao on public.email_fila(status,atualizado_em desc);
create index email_fila_usuario on public.email_fila(id_usuario);
create index email_fila_envio on public.email_fila(envio_id);
create index email_rodadas_admin on public.email_rodadas(criado_por);
create index email_fila_pendentes on public.email_fila(rodada,status,atualizado_em);
alter table public.email_rodadas enable row level security;
alter table public.email_fila enable row level security;
create policy admin_le_rodadas on public.email_rodadas for select to authenticated
  using (exists(select 1 from public.administradores where id_usuario=(select auth.uid())));
create policy admin_le_fila on public.email_fila for select to authenticated
  using (exists(select 1 from public.administradores where id_usuario=(select auth.uid())));
revoke all on public.email_rodadas, public.email_fila from public,anon,authenticated;
grant select on public.email_rodadas, public.email_fila to authenticated;
grant all on public.email_rodadas, public.email_fila to service_role;

-- Fonte completa, sem o filtro antecipado de 48h que escondia os adiados na tela antiga.
create function public.hub_pessoas()
returns table(id_usuario uuid,dados jsonb)
language sql stable security definer set search_path='' as $$
  select d.id_usuario,d.dados from public.dados_cartas_interno(array(
    select u.id from auth.users u where u.email is not null
    order by u.created_at desc limit 2001
  )) d;
$$;
revoke all on function public.hub_pessoas() from public,anon,authenticated;
grant execute on function public.hub_pessoas() to service_role;

-- Uma só verificação para prévia, reserva e carta individual. Histórico falhou não conta.
create function public.hub_bloqueio(p_id uuid,p_tipo text,p_categoria text,p_referencia text default null)
returns text language plpgsql stable security definer set search_path='' as $$
declare v_u auth.users; v_modelo text; v_trans boolean; v_periodico boolean; v_n int;
begin
  select * into v_u from auth.users where id=p_id;
  if v_u.email is null then return 'Sem endereço de e-mail'; end if;
  if v_u.email_confirmed_at is null then return 'E-mail não confirmado'; end if;
  if exists(select 1 from public.administradores where id_usuario=p_id) then return 'Conta administradora'; end if;
  if exists(select 1 from public.contas_fora_publico where id_usuario=p_id) then return 'Fora do público'; end if;
  if p_tipo='nunca_comecou' and exists(select 1 from public.emails_enviados where id_usuario=p_id and status in ('enviado','enviando') and (modelo='nunca_comecou' or referencia='nunca')) then return 'Primeiro convite já enviado'; end if;
  if p_tipo='marco' and not coalesce((select marcos_automaticos from public.configuracao_emails where id=true),true) then return 'Marcos de estudo desligados pelo administrador'; end if;
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
end $$;
revoke all on function public.hub_bloqueio(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.hub_bloqueio(uuid,text,text,text) to service_role;

create function public.hub_iniciar(p_admin uuid,p_itens jsonb,p_resumo jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_dia date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
  if not exists(select 1 from public.administradores where id_usuario=p_admin) then raise exception 'acesso_negado'; end if;
  if jsonb_typeof(p_itens)<>'array' or jsonb_array_length(p_itens)>2000 then raise exception 'fila_invalida'; end if;
  insert into public.email_rodadas(dia,criado_por,resumo) values(v_dia,p_admin,p_resumo) on conflict(dia) do nothing returning id into v_id;
  if v_id is null then return (select id from public.email_rodadas where dia=v_dia); end if;
  insert into public.email_fila(rodada,id_usuario,mensagem)
    select v_id,(m->>'id_usuario')::uuid,m from jsonb_array_elements(p_itens) m;
  return v_id;
end $$;
revoke all on function public.hub_iniciar(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.hub_iniciar(uuid,jsonb,jsonb) to service_role;

create function public.hub_proximo()
returns setof public.email_fila language plpgsql security definer set search_path='' as $$
begin
  if not pg_try_advisory_xact_lock(hashtextextended('email-hub-processador',0)) then return; end if;
  -- Uma execução interrompida tem entrega desconhecida. Nunca reenviar às cegas.
  update public.email_fila set status='incerto',motivo='Processamento interrompido; conferir no provedor antes de reenviar'
    where status='processando' and atualizado_em<now()-interval '10 minutes';
  -- A taxa do provedor é global: uma chamada em curso e intervalo entre chamadas.
  if exists(select 1 from public.email_fila where status='processando')
    or exists(select 1 from public.email_fila where status in ('enviado','falhou','incerto') and atualizado_em>now()-interval '650 milliseconds') then return; end if;
  update public.email_fila f set status='adiado',motivo='A rodada venceu; preparar com os dados do novo dia'
    from public.email_rodadas r where f.rodada=r.id and f.status='pendente' and r.dia<(now() at time zone 'America/Sao_Paulo')::date;
  return query with candidato as (
    select f.id from public.email_fila f join public.email_rodadas r on r.id=f.rodada
    where f.status='pendente' and r.status='ativa' and r.dia=(now() at time zone 'America/Sao_Paulo')::date
    order by (f.mensagem->>'prioridade')::int,f.id for update of f skip locked limit 1
  ) update public.email_fila f set status='processando',atualizado_em=now() from candidato c where f.id=c.id returning f.*;
end $$;
revoke all on function public.hub_proximo() from public,anon,authenticated;
grant execute on function public.hub_proximo() to service_role;

create function public.hub_reservar(p_fila uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare f public.email_fila; v_bloqueio text; v_envio bigint; m jsonb;
begin
  select * into f from public.email_fila where id=p_fila and status='processando' for update;
  if f.id is null then return jsonb_build_object('bloqueio','Item não está em processamento'); end if;
  perform pg_advisory_xact_lock(hashtextextended(f.id_usuario::text,0));
  m:=f.mensagem;
  if f.envio_id is not null and exists(select 1 from public.emails_enviados where id=f.envio_id and status in ('enviando','enviado')) then return jsonb_build_object('bloqueio','Mensagem já reservada'); end if;
  if exists(select 1 from public.email_rodadas where id=f.rodada and status='pausada' and dia=(now() at time zone 'America/Sao_Paulo')::date) then
    update public.email_fila set status='pendente',motivo='Rodada pausada',atualizado_em=now() where id=f.id;
    return jsonb_build_object('bloqueio','Rodada pausada');
  end if;
  if not exists(select 1 from public.email_rodadas where id=f.rodada and status='ativa' and dia=(now() at time zone 'America/Sao_Paulo')::date)
    then v_bloqueio:='Rodada pausada ou vencida';
  else v_bloqueio:=public.hub_bloqueio(f.id_usuario,m->>'tipo',m->>'categoria',m->>'referencia'); end if;
  if v_bloqueio is null and not exists(select 1 from auth.users where id=f.id_usuario and email=m->>'email') then v_bloqueio:='O endereço de e-mail mudou'; end if;
  if v_bloqueio is not null then
    update public.email_fila set status='adiado',motivo=v_bloqueio,atualizado_em=now() where id=f.id;
    return jsonb_build_object('bloqueio',v_bloqueio);
  end if;
  begin
    insert into public.emails_enviados(id_usuario,tipo,referencia,assunto,modelo,versao,origem,status,enviado_por,marco)
      values(f.id_usuario,m->>'tipo_log',m->>'referencia',m->>'assunto',m->>'modelo',m->>'versao','lote','enviando',
        (select criado_por from public.email_rodadas where id=f.rodada),case when m->>'tipo'='marco' then split_part(m->>'referencia',':',2)::int end) returning id into v_envio;
  exception when unique_violation then
    update public.emails_enviados set status='enviando',erro=null,enviado_em=now(),assunto=m->>'assunto',modelo=m->>'modelo',versao=m->>'versao'
      where id_usuario=f.id_usuario and tipo=m->>'tipo_log' and status='falhou'
        and (referencia=m->>'referencia' or (m->>'tipo'='marco' and marco=case when m->>'tipo'='marco' then split_part(m->>'referencia',':',2)::int end)) returning id into v_envio;
    if v_envio is null then
      update public.email_fila set status='adiado',motivo='Mensagem já reservada por outro envio',atualizado_em=now() where id=p_fila;
      return jsonb_build_object('bloqueio','Mensagem já reservada por outro envio');
    end if;
  end;
  update public.email_fila set envio_id=v_envio where id=f.id;
  return jsonb_build_object('envio_id',v_envio);
end $$;
revoke all on function public.hub_reservar(uuid) from public,anon,authenticated;
grant execute on function public.hub_reservar(uuid) to service_role;

create function public.hub_repetir(p_rodada uuid)
returns int language plpgsql security definer set search_path='' as $$
declare n int;
begin
  perform 1 from public.email_rodadas where id=p_rodada and dia=(now() at time zone 'America/Sao_Paulo')::date for update;
  if not found then raise exception 'rodada_vencida'; end if;
  update public.email_fila f set status='pendente',motivo=null,atualizado_em=now()
    where rodada=p_rodada and status='falhou' and (envio_id is null or exists(select 1 from public.emails_enviados e where e.id=f.envio_id and e.status='falhou'));
  get diagnostics n=row_count;
  if n>0 then update public.email_rodadas set status='ativa' where id=p_rodada; end if;
  return n;
end $$;
revoke all on function public.hub_repetir(uuid) from public,anon,authenticated;
grant execute on function public.hub_repetir(uuid) to service_role;

-- Reutiliza a autenticação do agendamento existente sem expor nem duplicar segredos em arquivos.
-- O processador só consome rodadas que um admin iniciou; não prepara nem inicia envios sozinho.
do $$ declare v_cmd text; begin
  if to_regclass('cron.job') is not null then
    select command into v_cmd from cron.job where jobname='relatorio-mensal' and command like '%enviar-email%' and command like '%relatorios_mensais%' limit 1;
    if v_cmd is not null then
      perform cron.schedule('email-hub-processar','* * * * *',replace(replace(v_cmd,'enviar-email','hub-emails'),'relatorios_mensais','processar'));
    end if;
  end if;
end $$;
create function public.hub_worker_ativo()
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  if to_regclass('cron.job') is null then return false; end if;
  return exists(select 1 from cron.job where jobname='email-hub-processar' and active);
end $$;
revoke all on function public.hub_worker_ativo() from public,anon,authenticated;
grant execute on function public.hub_worker_ativo() to service_role;
create function public.hub_avaliar(p_itens jsonb)
returns table(chave text,bloqueio text) language sql stable security definer set search_path='' as $$
  select m->>'chave',public.hub_bloqueio((m->>'id_usuario')::uuid,m->>'tipo',m->>'categoria',m->>'referencia')
  from jsonb_array_elements(p_itens) m;
$$;
revoke all on function public.hub_avaliar(jsonb) from public,anon,authenticated;
grant execute on function public.hub_avaliar(jsonb) to service_role;
commit;
