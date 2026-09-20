begin;

create table if not exists public.configuracao_comercial (
  id boolean primary key default true check (id),
  paywall_ativo boolean not null default false,
  limite_diario_gratis integer not null default 20 check (limite_diario_gratis between 0 and 10000),
  pagamentos_ativos boolean not null default false,
  atualizado_em timestamptz not null default now()
);
insert into public.configuracao_comercial (id) values (true) on conflict (id) do nothing;

create table if not exists public.contas_teste (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  ativa boolean not null default true,
  observacao text,
  criada_em timestamptz not null default now()
);

create table if not exists public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  id_usuario uuid not null references auth.users(id) on delete cascade,
  provedor text not null default 'mercado_pago' check (provedor in ('mercado_pago')),
  id_externo text unique,
  plano text not null check (plano in ('mensal','semestral','anual')),
  status text not null check (status in ('pendente','ativa','pausada','cancelada','vencida','falha_pagamento','reembolsada')),
  inicio_periodo timestamptz,
  fim_periodo timestamptz,
  cancelar_ao_fim boolean not null default false,
  cancelada_em timestamptz,
  ultima_cobranca_id text,
  ultima_cobranca_em timestamptz,
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index if not exists assinaturas_usuario_status_idx on public.assinaturas (id_usuario, status, fim_periodo desc);

create table if not exists public.consumo_diario (
  id_usuario uuid not null references auth.users(id) on delete cascade,
  dia date not null,
  quantidade integer not null default 0 check (quantidade >= 0),
  atualizado_em timestamptz not null default now(),
  primary key (id_usuario, dia)
);
create index if not exists consumo_diario_dia_idx on public.consumo_diario (dia);

create table if not exists public.respostas_autorizadas (
  chave_idempotencia uuid not null,
  id_usuario uuid not null references auth.users(id) on delete cascade,
  id_questao text not null,
  dia date not null,
  contabilizada boolean not null,
  criada_em timestamptz not null default now(),
  primary key (id_usuario, chave_idempotencia)
);
create index if not exists respostas_autorizadas_usuario_dia_idx on public.respostas_autorizadas (id_usuario, dia);

create table if not exists public.eventos_pagamento (
  id bigserial primary key,
  provedor text not null default 'mercado_pago',
  id_evento text not null,
  tipo text,
  id_recurso text,
  hash_payload text not null,
  payload jsonb not null,
  status_processamento text not null default 'recebido' check (status_processamento in ('recebido','processado','ignorado','erro')),
  erro text,
  recebido_em timestamptz not null default now(),
  processado_em timestamptz,
  unique (provedor, id_evento)
);

alter table public.configuracao_comercial enable row level security;
alter table public.contas_teste enable row level security;
alter table public.assinaturas enable row level security;
alter table public.consumo_diario enable row level security;
alter table public.respostas_autorizadas enable row level security;
alter table public.eventos_pagamento enable row level security;

drop policy if exists "usuario le assinatura propria" on public.assinaturas;
create policy "usuario le assinatura propria" on public.assinaturas for select to authenticated using (id_usuario = auth.uid());
drop policy if exists "usuario le consumo proprio" on public.consumo_diario;
create policy "usuario le consumo proprio" on public.consumo_diario for select to authenticated using (id_usuario = auth.uid());
drop policy if exists "usuario le autorizacoes proprias" on public.respostas_autorizadas;
create policy "usuario le autorizacoes proprias" on public.respostas_autorizadas for select to authenticated using (id_usuario = auth.uid());
-- Configuração, contas de teste, eventos e qualquer escrita ficam sem policy:
-- somente service_role e funções security definer podem acessá-los.
revoke all on public.configuracao_comercial, public.contas_teste, public.assinaturas, public.consumo_diario, public.respostas_autorizadas, public.eventos_pagamento from anon, authenticated;
grant select on public.assinaturas, public.consumo_diario, public.respostas_autorizadas to authenticated;

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

  select exists(select 1 from public.assinaturas a where a.id_usuario=v_usuario and (a.status='ativa' or (a.status='cancelada' and a.cancelar_ao_fim)) and coalesce(a.fim_periodo, 'infinity') > v_agora) into v_ilimitado;
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

create or replace function public.obter_estado_conta()
returns table (respostas_total bigint, sequencia integer, plano text, status_assinatura text, fim_periodo timestamptz, ultima_cobranca_em timestamptz, cancelar_ao_fim boolean)
language sql stable security definer set search_path=public,pg_temp as $$
  with dias as (select dia, dia-row_number() over(order by dia)::int grupo from consumo_diario where id_usuario=auth.uid() and quantidade>0), hoje as (select grupo from dias where dia in (((now() at time zone 'America/Sao_Paulo')::date),((now() at time zone 'America/Sao_Paulo')::date-1))), ass as (select a.plano,a.status,a.fim_periodo,a.ultima_cobranca_em,a.cancelar_ao_fim from assinaturas a where a.id_usuario=auth.uid() order by a.atualizada_em desc limit 1)
  select (select count(*) from respostas_autorizadas where id_usuario=auth.uid()), coalesce((select count(*)::int from dias where grupo=(select grupo from hoje order by grupo desc limit 1)),0), ass.plano, ass.status, ass.fim_periodo,ass.ultima_cobranca_em,ass.cancelar_ao_fim from ass
  union all select (select count(*) from respostas_autorizadas where id_usuario=auth.uid()),0,null,null,null,null,false where not exists(select 1 from ass) limit 1;
$$;

revoke all on function public.autorizar_resposta(uuid,text) from public;
grant execute on function public.autorizar_resposta(uuid,text) to authenticated;
revoke all on function public.obter_estado_conta() from public;
grant execute on function public.obter_estado_conta() to authenticated;

commit;
