-- Painel do administrador, parte 2.
--   Conteúdo: acerto de cada questão (primeira tentativa de todos) e relatos
--             de erro enviados de dentro da questão.
--   Crescimento: série diária, funil, retenção por semana de cadastro.
--   Ações: desconectar de todos os aparelhos, ocultar do ranking, acesso
--          cortesia (responde sem limite, como administrador).
--   Configurações: limite gratuito e pagamentos, aviso no topo do site.
--   E-mails: preferência de cada pessoa, registro do que foi enviado e dados
--            para o e-mail de parabéns (lidos só pela Edge Function).
-- Toda função administrativa passa por public.exigir_administrador()
-- (migração 202609290100).
begin;

-- ---------------------------------------------------------------------------
-- Respostas válidas: mesma regra do ranking (depois do último "reiniciar").
-- Uma linha por pessoa e questão, com a primeira tentativa guardada no
-- histórico (até 8 eventos, do mais antigo ao mais novo).
-- ---------------------------------------------------------------------------
create or replace function public.respostas_validas_interno()
returns table (usuario_id uuid, id_questao text, c text, primeira text, eventos jsonb, q double precision, atualizado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  with epocas as (
    select p.usuario_id, max(p.versao) as epoca
    from public.progresso_usuario p
    where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
    group by p.usuario_id
  )
  select p.usuario_id,
         regexp_replace(p.item, '^r[0-9]+:', ''),
         p.valor->>'c',
         coalesce(p.valor->'historico'->0->>'correta', p.valor->>'c'),
         case when jsonb_typeof(p.valor->'historico') = 'array' then p.valor->'historico' else '[]'::jsonb end,
         (p.valor->>'q')::double precision,
         p.atualizado_em
  from public.progresso_usuario p
  left join epocas e on e.usuario_id = p.usuario_id
  where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
    and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'));
$$;
revoke all on function public.respostas_validas_interno() from public, anon, authenticated;

-- Um evento de resposta por linha (data em ms vinda do aparelho). Registros
-- antigos sem histórico entram com a data da última resposta.
create or replace function public.eventos_resposta_interno()
returns table (usuario_id uuid, em timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.usuario_id, to_timestamp((ev->>'em')::double precision / 1000)
  from public.respostas_validas_interno() r, jsonb_array_elements(r.eventos) ev
  where ev ? 'em'
  union all
  select r.usuario_id, to_timestamp(r.q / 1000)
  from public.respostas_validas_interno() r
  where jsonb_array_length(r.eventos) = 0 and r.q is not null;
$$;
revoke all on function public.eventos_resposta_interno() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Conteúdo
-- ---------------------------------------------------------------------------
create or replace function public.estatisticas_questoes_admin()
returns table (id_questao text, pessoas bigint, acertos_primeira bigint, erros_primeira bigint, acertos_atual bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select r.id_questao, count(*),
           count(*) filter (where r.primeira = 'true'),
           count(*) filter (where r.primeira = 'false'),
           count(*) filter (where r.c = 'true')
    from public.respostas_validas_interno() r
    group by r.id_questao;
end $$;
revoke all on function public.estatisticas_questoes_admin() from public, anon, authenticated;
grant execute on function public.estatisticas_questoes_admin() to authenticated;

create table if not exists public.relatos_erro (
  id bigserial primary key,
  id_usuario uuid references auth.users(id) on delete set null,
  id_questao text not null check (id_questao ~ '^[a-z0-9-]{3,80}$'),
  tipo text not null check (tipo in ('gabarito', 'enunciado', 'imagem', 'comentario', 'outro')),
  texto text not null check (char_length(texto) between 3 and 1500),
  status text not null default 'aberto' check (status in ('aberto', 'resolvido', 'descartado')),
  nota_admin text check (nota_admin is null or char_length(nota_admin) <= 500),
  criado_em timestamptz not null default now(),
  resolvido_em timestamptz
);
create index if not exists relatos_erro_status_idx on public.relatos_erro (status, criado_em desc);
alter table public.relatos_erro enable row level security;
revoke all on public.relatos_erro from public, anon, authenticated;

create or replace function public.relatar_erro_questao(p_id_questao text, p_tipo text, p_texto text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  -- Freio contra abuso: até 30 relatos por pessoa por dia.
  if (select count(*) from public.relatos_erro r where r.id_usuario = auth.uid() and r.criado_em > now() - interval '1 day') >= 30 then
    raise exception 'limite_relatos' using errcode = '54000';
  end if;
  insert into public.relatos_erro (id_usuario, id_questao, tipo, texto)
  values (auth.uid(), p_id_questao, p_tipo, btrim(p_texto));
  return true;
end $$;
revoke all on function public.relatar_erro_questao(text, text, text) from public, anon, authenticated;
grant execute on function public.relatar_erro_questao(text, text, text) to authenticated;

create or replace function public.listar_relatos_admin()
returns table (id bigint, id_questao text, tipo text, texto text, status text, nota_admin text, criado_em timestamptz, resolvido_em timestamptz, usuario text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select r.id, r.id_questao, r.tipo, r.texto, r.status, r.nota_admin, r.criado_em, r.resolvido_em, u.email::text
    from public.relatos_erro r left join auth.users u on u.id = r.id_usuario
    order by (r.status = 'aberto') desc, r.criado_em desc
    limit 500;
end $$;
revoke all on function public.listar_relatos_admin() from public, anon, authenticated;
grant execute on function public.listar_relatos_admin() to authenticated;

create or replace function public.atualizar_relato_admin(p_id bigint, p_status text, p_nota text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  update public.relatos_erro r
     set status = p_status, nota_admin = nullif(btrim(coalesce(p_nota, '')), ''),
         resolvido_em = case when p_status = 'aberto' then null else now() end
   where r.id = p_id;
  return found;
end $$;
revoke all on function public.atualizar_relato_admin(bigint, text, text) from public, anon, authenticated;
grant execute on function public.atualizar_relato_admin(bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Crescimento
-- ---------------------------------------------------------------------------
create or replace function public.serie_diaria_admin(p_dias integer default 30)
returns table (dia date, cadastros bigint, ativos bigint, respostas bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_dias integer := least(greatest(coalesce(p_dias, 30), 7), 365);
begin
  perform public.exigir_administrador();
  return query
    with dias as (
      select (v_hoje - g)::date as dia from generate_series(0, v_dias - 1) g
    ),
    eventos as (
      select e.usuario_id, (e.em at time zone 'America/Sao_Paulo')::date as dia
      from public.eventos_resposta_interno() e
      where e.em >= now() - make_interval(days => v_dias + 1)
    )
    select d.dia,
           (select count(*) from auth.users u where (u.created_at at time zone 'America/Sao_Paulo')::date = d.dia),
           (select count(distinct ev.usuario_id) from eventos ev where ev.dia = d.dia),
           (select count(*) from eventos ev where ev.dia = d.dia)
    from dias d
    order by d.dia;
end $$;
revoke all on function public.serie_diaria_admin(integer) from public, anon, authenticated;
grant execute on function public.serie_diaria_admin(integer) to authenticated;

create or replace function public.funil_admin()
returns table (cadastrados bigint, confirmaram bigint, responderam bigint, passaram_50 bigint, passaram_500 bigint, assinaram bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    with totais as (
      select r.usuario_id, count(*) as n from public.respostas_validas_interno() r group by r.usuario_id
    )
    select
      (select count(*) from auth.users),
      (select count(*) from auth.users u where u.email_confirmed_at is not null),
      (select count(*) from totais t where t.n >= 1),
      (select count(*) from totais t where t.n >= 50),
      (select count(*) from totais t where t.n >= 500),
      (select count(distinct a.id_usuario) from public.assinaturas a where a.ultima_cobranca_em is not null or a.status = 'ativa');
end $$;
revoke all on function public.funil_admin() from public, anon, authenticated;
grant execute on function public.funil_admin() to authenticated;

-- Por semana de cadastro (as 8 últimas completas): quantos responderam algo
-- na primeira semana e quantos voltaram na semana seguinte (dias 7 a 13).
create or replace function public.retencao_admin()
returns table (semana date, cadastros bigint, estudaram_1a_semana bigint, voltaram_2a_semana bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_inicio_semana date := date_trunc('week', now() at time zone 'America/Sao_Paulo')::date;
begin
  perform public.exigir_administrador();
  return query
    with coorte as (
      select u.id, u.created_at, date_trunc('week', u.created_at at time zone 'America/Sao_Paulo')::date as semana
      from auth.users u
      where u.created_at >= (v_inicio_semana - 70)::timestamp at time zone 'America/Sao_Paulo'
    ),
    eventos as (
      select e.usuario_id, e.em from public.eventos_resposta_interno() e
      where e.em >= (v_inicio_semana - 70)::timestamp at time zone 'America/Sao_Paulo'
    )
    select c.semana, count(*),
           count(*) filter (where exists (select 1 from eventos e where e.usuario_id = c.id and e.em < c.created_at + interval '7 days')),
           count(*) filter (where exists (select 1 from eventos e where e.usuario_id = c.id
                                          and e.em >= c.created_at + interval '7 days' and e.em < c.created_at + interval '14 days'))
    from coorte c
    where c.semana <= v_inicio_semana - 14
    group by c.semana
    order by c.semana desc
    limit 8;
end $$;
revoke all on function public.retencao_admin() from public, anon, authenticated;
grant execute on function public.retencao_admin() to authenticated;

-- Assinaturas com a data de cancelamento, para a receita do mês.
drop function if exists public.listar_assinaturas_admin();
create function public.listar_assinaturas_admin()
returns table (
  id_usuario uuid, usuario text, plano text, status text,
  proxima_cobranca timestamptz, ultima_atualizacao timestamptz,
  nome text, criada_em timestamptz, inicio_periodo timestamptz, fim_periodo timestamptz,
  ultima_cobranca_em timestamptz, cancelar_ao_fim boolean, cancelada_em timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select a.id_usuario, u.email::text, a.plano, a.status,
           case when a.status = 'ativa' and not a.cancelar_ao_fim then a.fim_periodo else null end,
           a.atualizada_em,
           nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), ''),
           a.criada_em, a.inicio_periodo, a.fim_periodo, a.ultima_cobranca_em, a.cancelar_ao_fim, a.cancelada_em
    from public.assinaturas a
    join auth.users u on u.id = a.id_usuario
    order by a.criada_em desc;
end $$;
revoke all on function public.listar_assinaturas_admin() from public, anon, authenticated;
grant execute on function public.listar_assinaturas_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Ficha do usuário e ações
-- ---------------------------------------------------------------------------
create table if not exists public.acessos_cortesia (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  ate timestamptz,
  motivo text check (motivo is null or char_length(motivo) <= 200),
  criado_em timestamptz not null default now()
);
alter table public.acessos_cortesia enable row level security;
revoke all on public.acessos_cortesia from public, anon, authenticated;

create table if not exists public.preferencias_email (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  conquistas boolean not null default true,
  atualizado_em timestamptz not null default now()
);
alter table public.preferencias_email enable row level security;
revoke all on public.preferencias_email from public, anon, authenticated;

create table if not exists public.emails_enviados (
  id bigserial primary key,
  id_usuario uuid references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('marco', 'parabens', 'alerta_admin')),
  marco integer,
  referencia text,
  assunto text,
  status text not null default 'enviado' check (status in ('enviando', 'enviado', 'falhou')),
  erro text,
  enviado_por uuid,
  enviado_em timestamptz not null default now()
);
-- Um e-mail por marco por pessoa, mesmo com dois pedidos ao mesmo tempo.
create unique index if not exists emails_enviados_marco_unico on public.emails_enviados (id_usuario, marco) where tipo = 'marco';
create index if not exists emails_enviados_data_idx on public.emails_enviados (enviado_em desc);
alter table public.emails_enviados enable row level security;
revoke all on public.emails_enviados from public, anon, authenticated;

create or replace function public.detalhe_usuario_admin(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform public.exigir_administrador();
  select jsonb_build_object(
    'respostas', coalesce((select jsonb_agg(jsonb_build_object('id', r.id_questao, 'c', r.c, 'primeira', r.primeira))
                           from public.respostas_validas_interno() r where r.usuario_id = p_id), '[]'::jsonb),
    'sessoes', coalesce((select jsonb_agg(s.valor order by (s.valor->>'concluidaEm')::double precision desc)
                         from (select p.valor from public.progresso_usuario p
                               where p.usuario_id = p_id and p.tipo = 'historico' and p.valor ? 'total'
                               order by (p.valor->>'concluidaEm')::double precision desc limit 20) s), '[]'::jsonb),
    'favoritas', (select count(*) from public.progresso_usuario p where p.usuario_id = p_id and p.tipo = 'favoritos' and p.valor = 'true'::jsonb),
    'anotacoes', (select count(*) from public.progresso_usuario p where p.usuario_id = p_id and p.tipo = 'notas' and p.valor <> 'null'::jsonb),
    'oculto_ranking', exists (select 1 from public.ranking_ocultos o where o.usuario_id = p_id),
    'cortesia', (select jsonb_build_object('ate', c.ate, 'motivo', c.motivo) from public.acessos_cortesia c where c.id_usuario = p_id),
    'aparelho', (select jsonb_build_object('descricao', a.descricao, 'entrou_em', a.entrou_em, 'visto_em', a.visto_em) from public.sessoes_aparelho a where a.id_usuario = p_id),
    'emails_conquistas', coalesce((select pe.conquistas from public.preferencias_email pe where pe.id_usuario = p_id), true),
    'emails', coalesce((select jsonb_agg(jsonb_build_object('tipo', e.tipo, 'marco', e.marco, 'assunto', e.assunto, 'status', e.status, 'em', e.enviado_em) order by e.enviado_em desc)
                        from (select * from public.emails_enviados e where e.id_usuario = p_id and e.tipo <> 'alerta_admin' order by e.enviado_em desc limit 20) e), '[]'::jsonb),
    'perfil', (select jsonb_build_object('situacao', u.raw_user_meta_data->>'situacao', 'servico', u.raw_user_meta_data->>'servico',
                                         'cidade', u.raw_user_meta_data->>'cidade', 'uf', u.raw_user_meta_data->>'uf',
                                         'confirmado', u.email_confirmed_at is not null)
               from auth.users u where u.id = p_id)
  ) into v;
  return v;
end $$;
revoke all on function public.detalhe_usuario_admin(uuid) from public, anon, authenticated;
grant execute on function public.detalhe_usuario_admin(uuid) to authenticated;

-- Tira a conta de todos os aparelhos no próximo sinal (até 1 minuto).
create or replace function public.desconectar_usuario_admin(p_id uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  insert into public.sessoes_aparelho as s (id_usuario, aparelho, descricao, entrou_em, visto_em)
  values (p_id, 'desconectado-' || pg_catalog.gen_random_uuid()::text, 'suporte', now(), now() - interval '1 hour')
  on conflict (id_usuario) do update
    set aparelho = excluded.aparelho, descricao = 'suporte', entrou_em = now(), visto_em = now() - interval '1 hour';
  return true;
end $$;
revoke all on function public.desconectar_usuario_admin(uuid) from public, anon, authenticated;
grant execute on function public.desconectar_usuario_admin(uuid) to authenticated;

create or replace function public.ocultar_ranking_admin(p_id uuid, p_ocultar boolean, p_motivo text default null)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  if p_ocultar then
    insert into public.ranking_ocultos (usuario_id, motivo) values (p_id, nullif(btrim(coalesce(p_motivo, '')), ''))
    on conflict (usuario_id) do update set motivo = excluded.motivo;
  else
    delete from public.ranking_ocultos o where o.usuario_id = p_id;
  end if;
  return true;
end $$;
revoke all on function public.ocultar_ranking_admin(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.ocultar_ranking_admin(uuid, boolean, text) to authenticated;

-- p_ate nulo = cortesia sem prazo; p_remover = tira a cortesia.
create or replace function public.definir_cortesia_admin(p_id uuid, p_ate timestamptz, p_motivo text, p_remover boolean default false)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  if p_remover then
    delete from public.acessos_cortesia c where c.id_usuario = p_id;
  else
    insert into public.acessos_cortesia (id_usuario, ate, motivo) values (p_id, p_ate, nullif(btrim(coalesce(p_motivo, '')), ''))
    on conflict (id_usuario) do update set ate = excluded.ate, motivo = excluded.motivo;
  end if;
  return true;
end $$;
revoke all on function public.definir_cortesia_admin(uuid, timestamptz, text, boolean) from public, anon, authenticated;
grant execute on function public.definir_cortesia_admin(uuid, timestamptz, text, boolean) to authenticated;

-- Mesma autorizar_resposta da 202609280300, agora com a cortesia valendo
-- como acesso sem limite.
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

  select exists(select 1 from public.administradores adm where adm.id_usuario=v_usuario)
      or exists(select 1 from public.acessos_cortesia c where c.id_usuario=v_usuario and coalesce(c.ate, 'infinity') > v_agora)
    into v_ilimitado;
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

-- ---------------------------------------------------------------------------
-- Configurações
-- ---------------------------------------------------------------------------
create or replace function public.obter_config_comercial_admin()
returns table (paywall_ativo boolean, limite_diario_gratis integer, pagamentos_ativos boolean, atualizado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select c.paywall_ativo, c.limite_diario_gratis, c.pagamentos_ativos, c.atualizado_em
               from public.configuracao_comercial c where c.id = true;
end $$;
revoke all on function public.obter_config_comercial_admin() from public, anon, authenticated;
grant execute on function public.obter_config_comercial_admin() to authenticated;

create or replace function public.definir_config_comercial_admin(p_paywall_ativo boolean, p_limite integer, p_pagamentos_ativos boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  if p_limite is null or p_limite < 0 or p_limite > 10000 then raise exception 'limite_invalido' using errcode = '22023'; end if;
  update public.configuracao_comercial c
     set paywall_ativo = coalesce(p_paywall_ativo, c.paywall_ativo),
         limite_diario_gratis = p_limite,
         pagamentos_ativos = coalesce(p_pagamentos_ativos, c.pagamentos_ativos),
         atualizado_em = now()
   where c.id = true;
  return found;
end $$;
revoke all on function public.definir_config_comercial_admin(boolean, integer, boolean) from public, anon, authenticated;
grant execute on function public.definir_config_comercial_admin(boolean, integer, boolean) to authenticated;

create table if not exists public.avisos_site (
  id bigserial primary key,
  texto text not null check (char_length(texto) between 3 and 240),
  link text check (link is null or (char_length(link) <= 300 and link ~ '^(https://|#/)')),
  rotulo_link text check (rotulo_link is null or char_length(rotulo_link) <= 40),
  tom text not null default 'destaque' check (tom in ('info', 'destaque', 'alerta')),
  ativo boolean not null default true,
  fim timestamptz,
  criado_em timestamptz not null default now()
);
alter table public.avisos_site enable row level security;
revoke all on public.avisos_site from public, anon, authenticated;

-- Lido por todo visitante, com ou sem conta.
create or replace function public.obter_aviso_site()
returns table (id bigint, texto text, link text, rotulo_link text, tom text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.texto, a.link, a.rotulo_link, a.tom from public.avisos_site a
  where a.ativo and coalesce(a.fim, 'infinity') > now()
  order by a.criado_em desc limit 1;
$$;
revoke all on function public.obter_aviso_site() from public;
grant execute on function public.obter_aviso_site() to anon, authenticated;

create or replace function public.salvar_aviso_admin(p_texto text, p_link text, p_rotulo_link text, p_tom text, p_fim timestamptz)
returns bigint language plpgsql volatile security definer set search_path = '' as $$
declare v_id bigint;
begin
  perform public.exigir_administrador();
  update public.avisos_site a set ativo = false where a.ativo;
  insert into public.avisos_site (texto, link, rotulo_link, tom, fim)
  values (btrim(p_texto), nullif(btrim(coalesce(p_link, '')), ''), nullif(btrim(coalesce(p_rotulo_link, '')), ''), coalesce(p_tom, 'destaque'), p_fim)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.salvar_aviso_admin(text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.salvar_aviso_admin(text, text, text, text, timestamptz) to authenticated;

create or replace function public.encerrar_aviso_admin()
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  update public.avisos_site a set ativo = false where a.ativo;
  return true;
end $$;
revoke all on function public.encerrar_aviso_admin() from public, anon, authenticated;
grant execute on function public.encerrar_aviso_admin() to authenticated;

create or replace function public.listar_avisos_admin()
returns table (id bigint, texto text, link text, rotulo_link text, tom text, ativo boolean, fim timestamptz, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select a.id, a.texto, a.link, a.rotulo_link, a.tom, a.ativo and coalesce(a.fim, 'infinity') > now(), a.fim, a.criado_em
               from public.avisos_site a order by a.criado_em desc limit 10;
end $$;
revoke all on function public.listar_avisos_admin() from public, anon, authenticated;
grant execute on function public.listar_avisos_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- E-mails
-- ---------------------------------------------------------------------------
create table if not exists public.configuracao_emails (
  id boolean primary key default true check (id),
  marcos_automaticos boolean not null default true,
  alertas_admin boolean not null default true,
  atualizado_em timestamptz not null default now()
);
insert into public.configuracao_emails (id) values (true) on conflict (id) do nothing;
alter table public.configuracao_emails enable row level security;
revoke all on public.configuracao_emails from public, anon, authenticated;

create or replace function public.obter_preferencias_email()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select pe.conquistas from public.preferencias_email pe where pe.id_usuario = auth.uid()), true);
$$;
revoke all on function public.obter_preferencias_email() from public, anon, authenticated;
grant execute on function public.obter_preferencias_email() to authenticated;

create or replace function public.definir_preferencias_email(p_conquistas boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  insert into public.preferencias_email (id_usuario, conquistas, atualizado_em) values (auth.uid(), coalesce(p_conquistas, true), now())
  on conflict (id_usuario) do update set conquistas = excluded.conquistas, atualizado_em = now();
  return coalesce(p_conquistas, true);
end $$;
revoke all on function public.definir_preferencias_email(boolean) from public, anon, authenticated;
grant execute on function public.definir_preferencias_email(boolean) to authenticated;

create or replace function public.obter_config_emails_admin()
returns table (marcos_automaticos boolean, alertas_admin boolean)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select c.marcos_automaticos, c.alertas_admin from public.configuracao_emails c where c.id = true;
end $$;
revoke all on function public.obter_config_emails_admin() from public, anon, authenticated;
grant execute on function public.obter_config_emails_admin() to authenticated;

create or replace function public.definir_config_emails_admin(p_marcos boolean, p_alertas boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  update public.configuracao_emails c set marcos_automaticos = coalesce(p_marcos, c.marcos_automaticos),
         alertas_admin = coalesce(p_alertas, c.alertas_admin), atualizado_em = now() where c.id = true;
  return found;
end $$;
revoke all on function public.definir_config_emails_admin(boolean, boolean) from public, anon, authenticated;
grant execute on function public.definir_config_emails_admin(boolean, boolean) to authenticated;

create or replace function public.listar_emails_admin()
returns table (id bigint, tipo text, marco integer, assunto text, status text, erro text, enviado_em timestamptz, usuario text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select e.id, e.tipo, e.marco, e.assunto, e.status, e.erro, e.enviado_em, u.email::text
               from public.emails_enviados e left join auth.users u on u.id = e.id_usuario
               order by e.enviado_em desc limit 200;
end $$;
revoke all on function public.listar_emails_admin() from public, anon, authenticated;
grant execute on function public.listar_emails_admin() to authenticated;

-- Só para a Edge Function (service role): o que vai no e-mail de parabéns.
create or replace function public.dados_email_usuario(p_id uuid)
returns table (email text, nome text, respondidas bigint, acertos bigint, erros bigint, respondidas_7d bigint, dias_de_conta integer, quer_conquistas boolean)
language sql stable security definer set search_path = '' as $$
  select u.email::text,
         nullif(btrim(u.raw_user_meta_data->>'nome'), ''),
         (select count(*) from public.respostas_validas_interno() r where r.usuario_id = p_id),
         (select count(*) from public.respostas_validas_interno() r where r.usuario_id = p_id and r.c = 'true'),
         (select count(*) from public.respostas_validas_interno() r where r.usuario_id = p_id and r.c = 'false'),
         (select count(*) from public.eventos_resposta_interno() e where e.usuario_id = p_id and e.em >= now() - interval '7 days'),
         greatest(0, extract(day from now() - u.created_at)::integer),
         coalesce((select pe.conquistas from public.preferencias_email pe where pe.id_usuario = p_id), true)
  from auth.users u where u.id = p_id;
$$;
revoke all on function public.dados_email_usuario(uuid) from public, anon, authenticated;
grant execute on function public.dados_email_usuario(uuid) to service_role;

-- Só para a Edge Function: para quem vão os alertas.
create or replace function public.emails_administradores()
returns table (email text)
language sql stable security definer set search_path = '' as $$
  select u.email::text from public.administradores a join auth.users u on u.id = a.id_usuario where u.email is not null;
$$;
revoke all on function public.emails_administradores() from public, anon, authenticated;
grant execute on function public.emails_administradores() to service_role;

notify pgrst, 'reload schema';
commit;
