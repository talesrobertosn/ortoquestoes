-- Recursos do plano pago: como a turma respondeu, Simulado Nacional mensal,
-- plano até a prova, liga da residência e relatório mensal por e-mail.
--
-- Depende de 202609290200_painel_admin_2.sql (helpers de administrador,
-- cortesia, preferências e registro de e-mails). Pode ser rodada de novo.
begin;

-- ---------------------------------------------------------------------------
-- Acesso aos recursos pagos
-- ---------------------------------------------------------------------------

create table if not exists public.configuracao_premium (
  id boolean primary key default true check (id),
  -- Falso libera os recursos pagos para todas as contas (lançamento, promoção).
  recursos_exclusivos boolean not null default true,
  atualizado_em timestamptz not null default now()
);
insert into public.configuracao_premium (id) values (true) on conflict (id) do nothing;
alter table public.configuracao_premium enable row level security;
revoke all on public.configuracao_premium from public, anon, authenticated;

-- Por que a conta tem (ou não) os recursos pagos. Usada por todas as RPCs abaixo.
create or replace function public.motivo_premium_interno(p_usuario uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when p_usuario is null then 'nenhum'
    when exists (select 1 from public.administradores a where a.id_usuario = p_usuario) then 'administrador'
    when exists (select 1 from public.assinaturas a where a.id_usuario = p_usuario
                 and (a.status = 'ativa' or (a.status = 'cancelada' and a.cancelar_ao_fim))
                 and coalesce(a.fim_periodo, 'infinity') > now()) then 'assinatura'
    when exists (select 1 from public.acessos_cortesia c where c.id_usuario = p_usuario
                 and coalesce(c.ate, 'infinity') > now()) then 'cortesia'
    when not coalesce((select cp.recursos_exclusivos from public.configuracao_premium cp where cp.id), true) then 'liberado'
    else 'nenhum'
  end;
$$;
revoke all on function public.motivo_premium_interno(uuid) from public, anon, authenticated;

create or replace function public.tem_premium_interno(p_usuario uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.motivo_premium_interno(p_usuario) <> 'nenhum';
$$;
revoke all on function public.tem_premium_interno(uuid) from public, anon, authenticated;

create or replace function public.obter_acesso_premium()
returns table (premium boolean, motivo text, recursos_exclusivos boolean, pagamentos_ativos boolean)
language sql stable security definer set search_path = '' as $$
  select public.motivo_premium_interno(auth.uid()) <> 'nenhum',
         public.motivo_premium_interno(auth.uid()),
         coalesce((select cp.recursos_exclusivos from public.configuracao_premium cp where cp.id), true),
         coalesce((select cc.pagamentos_ativos from public.configuracao_comercial cc where cc.id), false);
$$;
revoke all on function public.obter_acesso_premium() from public;
grant execute on function public.obter_acesso_premium() to anon, authenticated;

create or replace function public.exigir_premium()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if not public.tem_premium_interno(auth.uid()) then raise exception 'premium_necessario' using errcode = '42501'; end if;
end $$;
revoke all on function public.exigir_premium() from public, anon, authenticated;

create or replace function public.obter_config_premium_admin()
returns table (recursos_exclusivos boolean, atualizado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select cp.recursos_exclusivos, cp.atualizado_em from public.configuracao_premium cp where cp.id;
end $$;
revoke all on function public.obter_config_premium_admin() from public, anon, authenticated;
grant execute on function public.obter_config_premium_admin() to authenticated;

create or replace function public.definir_config_premium_admin(p_exclusivos boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  update public.configuracao_premium cp set recursos_exclusivos = coalesce(p_exclusivos, true), atualizado_em = now() where cp.id;
  return found;
end $$;
revoke all on function public.definir_config_premium_admin(boolean) from public, anon, authenticated;
grant execute on function public.definir_config_premium_admin(boolean) to authenticated;

-- Nome que aparece em rankings (simulado e liga): o mesmo do ranking geral.
create or replace function public.apelido_publico_interno(p_usuario uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(pp.apelido, public.nome_publico_ranking(u.raw_user_meta_data), 'Participante')
  from auth.users u left join public.perfis_publicos pp on pp.usuario_id = u.id
  where u.id = p_usuario;
$$;
revoke all on function public.apelido_publico_interno(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Como a turma respondeu
-- ---------------------------------------------------------------------------
-- Conta a PRIMEIRA resposta de cada pessoa em cada questão (a letra marcada e
-- se acertou). Registros antigos sem a letra da primeira tentativa entram só
-- no acerto. O agregado é recalculado no máximo a cada 20 minutos.

create table if not exists public.turma_estatisticas (
  id_questao text primary key,
  respondentes integer not null,
  acertos integer not null,
  com_letra integer not null,
  letras jsonb not null default '{}'::jsonb
);
create table if not exists public.turma_estado (
  id boolean primary key default true check (id),
  atualizado_em timestamptz not null default 'epoch'
);
insert into public.turma_estado (id) values (true) on conflict (id) do nothing;
alter table public.turma_estatisticas enable row level security;
alter table public.turma_estado enable row level security;
revoke all on public.turma_estatisticas, public.turma_estado from public, anon, authenticated;

create or replace function public.atualizar_turma_interno(p_forcar boolean default false)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not p_forcar and (select e.atualizado_em from public.turma_estado e where e.id) > now() - interval '20 minutes' then return; end if;
  -- Quem chega enquanto outro recalcula usa o agregado anterior.
  if not pg_catalog.pg_try_advisory_xact_lock(hashtext('turma_estatisticas')) then return; end if;
  delete from public.turma_estatisticas;
  insert into public.turma_estatisticas (id_questao, respondentes, acertos, com_letra, letras)
  with epocas as (
    select p.usuario_id, max(p.versao) as epoca
    from public.progresso_usuario p
    where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
    group by p.usuario_id
  ),
  base as (
    select regexp_replace(p.item, '^r[0-9]+:', '') as id_questao,
           coalesce(p.valor->'historico'->0->>'correta', p.valor->>'c') as primeira,
           coalesce(nullif(p.valor->>'p', ''),
                    case when coalesce((p.valor->>'tentativas')::int, 1) = 1 then nullif(p.valor->>'m', '') end) as letra
    from public.progresso_usuario p
    left join epocas e on e.usuario_id = p.usuario_id
    where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
      and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
  ),
  validas as (select * from base where primeira in ('true', 'false')),
  letras as (
    select v.id_questao, jsonb_object_agg(v.letra, v.n) as letras, sum(v.n)::int as com_letra
    from (select id_questao, letra, count(*) as n from validas where letra ~ '^[A-E]$' group by id_questao, letra) v
    group by v.id_questao
  )
  select v.id_questao, count(*)::int, count(*) filter (where v.primeira = 'true')::int,
         coalesce(max(l.com_letra), 0), coalesce((array_agg(l.letras))[1], '{}'::jsonb)
  from validas v left join letras l on l.id_questao = v.id_questao
  group by v.id_questao;
  update public.turma_estado set atualizado_em = now() where id;
end $$;
revoke all on function public.atualizar_turma_interno(boolean) from public, anon, authenticated;

-- Uma questão. Quem não tem o plano vê só quantas pessoas responderam.
create or replace function public.turma_da_questao(p_id_questao text)
returns table (respondentes integer, acertos integer, com_letra integer, letras jsonb, premium boolean, atualizado_em timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_premium boolean := public.tem_premium_interno(auth.uid());
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  perform public.atualizar_turma_interno(false);
  return query
    select coalesce(t.respondentes, 0),
           case when v_premium then coalesce(t.acertos, 0) end,
           case when v_premium then coalesce(t.com_letra, 0) end,
           case when v_premium then coalesce(t.letras, '{}'::jsonb) end,
           v_premium,
           (select e.atualizado_em from public.turma_estado e where e.id)
    from (select 1) um left join public.turma_estatisticas t on t.id_questao = p_id_questao;
end $$;
revoke all on function public.turma_da_questao(text) from public, anon, authenticated;
grant execute on function public.turma_da_questao(text) to authenticated;

-- O acervo inteiro, para os filtros do Treinar. Só para o plano pago.
create or replace function public.turma_acervo()
returns table (id_questao text, respondentes integer, acertos integer)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_premium();
  perform public.atualizar_turma_interno(false);
  return query select t.id_questao, t.respondentes, t.acertos from public.turma_estatisticas t where t.respondentes >= 3;
end $$;
revoke all on function public.turma_acervo() from public, anon, authenticated;
grant execute on function public.turma_acervo() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Simulado Nacional OrtoQuestões (edição mensal)
-- ---------------------------------------------------------------------------

create table if not exists public.simulado_edicoes (
  edicao text primary key check (edicao ~ '^[0-9]{4}-[0-9]{2}$'),
  titulo text not null check (char_length(titulo) between 3 and 120),
  abre_em timestamptz not null,
  fecha_em timestamptz not null,
  duracao_min integer not null check (duracao_min between 10 and 360),
  publicado_em timestamptz not null default now(),
  check (fecha_em > abre_em)
);
create table if not exists public.simulado_itens (
  edicao text not null references public.simulado_edicoes(edicao) on delete cascade,
  ordem integer not null check (ordem > 0),
  id_questao text not null check (id_questao ~ '^[a-z0-9-]{3,80}$'),
  gabarito text not null check (gabarito ~ '^[A-E]$'),
  tema text not null check (char_length(tema) between 2 and 80),
  primary key (edicao, ordem),
  unique (edicao, id_questao)
);
create table if not exists public.simulado_participacoes (
  edicao text not null references public.simulado_edicoes(edicao) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  iniciado_em timestamptz not null default now(),
  entregue_em timestamptz,
  respostas jsonb,
  acertos integer,
  total integer,
  segundos integer,
  no_tempo boolean,
  por_tema jsonb,
  primary key (edicao, usuario_id)
);
create index if not exists simulado_participacoes_ranking on public.simulado_participacoes (edicao, acertos desc, segundos asc) where entregue_em is not null;
alter table public.simulado_edicoes enable row level security;
alter table public.simulado_itens enable row level security;
alter table public.simulado_participacoes enable row level security;
revoke all on public.simulado_edicoes, public.simulado_itens, public.simulado_participacoes from public, anon, authenticated;

-- Edição em cartaz: a mais recente já aberta; se nenhuma abriu, a próxima.
create or replace function public.edicao_atual_interno()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select e.edicao from public.simulado_edicoes e where e.abre_em <= now() order by e.abre_em desc limit 1),
    (select e.edicao from public.simulado_edicoes e order by e.abre_em asc limit 1));
$$;
revoke all on function public.edicao_atual_interno() from public, anon, authenticated;

create or replace function public.obter_simulado_nacional(p_edicao text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_edicao text := coalesce(p_edicao, public.edicao_atual_interno());
  v_ed public.simulado_edicoes;
  v_part public.simulado_participacoes;
  v jsonb;
begin
  select * into v_ed from public.simulado_edicoes e where e.edicao = v_edicao;
  if not found then return jsonb_build_object('edicao', null); end if;
  if auth.uid() is not null then
    select * into v_part from public.simulado_participacoes sp where sp.edicao = v_edicao and sp.usuario_id = auth.uid();
  end if;
  v := jsonb_build_object(
    'edicao', v_ed.edicao, 'titulo', v_ed.titulo, 'abre_em', v_ed.abre_em, 'fecha_em', v_ed.fecha_em,
    'duracao_min', v_ed.duracao_min,
    'total', (select count(*) from public.simulado_itens i where i.edicao = v_edicao),
    'por_tema', coalesce((select jsonb_object_agg(t.tema, t.n) from (select i.tema, count(*) as n from public.simulado_itens i where i.edicao = v_edicao group by i.tema) t), '{}'::jsonb),
    'participantes', (select count(*) from public.simulado_participacoes sp where sp.edicao = v_edicao and sp.entregue_em is not null),
    'aberto', now() between v_ed.abre_em and v_ed.fecha_em,
    'minha', case when v_part.edicao is null then null else jsonb_build_object(
      'iniciado_em', v_part.iniciado_em, 'entregue_em', v_part.entregue_em,
      'acertos', v_part.acertos, 'total', v_part.total, 'segundos', v_part.segundos, 'no_tempo', v_part.no_tempo) end,
    'anteriores', coalesce((select jsonb_agg(jsonb_build_object('edicao', e.edicao, 'titulo', e.titulo) order by e.abre_em desc)
                            from public.simulado_edicoes e where e.edicao <> v_edicao and e.abre_em <= now()), '[]'::jsonb)
  );
  return v;
end $$;
revoke all on function public.obter_simulado_nacional(text) from public;
grant execute on function public.obter_simulado_nacional(text) to anon, authenticated;

-- Começa (ou retoma) a prova. O relógio é o do servidor.
create or replace function public.iniciar_simulado_nacional(p_edicao text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ed public.simulado_edicoes;
  v_part public.simulado_participacoes;
begin
  perform public.exigir_premium();
  select * into v_ed from public.simulado_edicoes e where e.edicao = p_edicao;
  if not found then raise exception 'edicao_inexistente' using errcode = '22023'; end if;
  select * into v_part from public.simulado_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = auth.uid();
  if found and v_part.entregue_em is not null then raise exception 'ja_entregue' using errcode = '22023'; end if;
  if not found then
    if now() < v_ed.abre_em or now() > v_ed.fecha_em then raise exception 'edicao_fechada' using errcode = '22023'; end if;
    insert into public.simulado_participacoes (edicao, usuario_id) values (p_edicao, auth.uid()) returning * into v_part;
  end if;
  return jsonb_build_object(
    'edicao', p_edicao, 'iniciado_em', v_part.iniciado_em, 'duracao_min', v_ed.duracao_min,
    'ids', (select jsonb_agg(i.id_questao order by i.ordem) from public.simulado_itens i where i.edicao = p_edicao));
end $$;
revoke all on function public.iniciar_simulado_nacional(text) from public, anon, authenticated;
grant execute on function public.iniciar_simulado_nacional(text) to authenticated;

-- Correção no servidor, com o gabarito da edição. p_respostas: {"id": "B", ...}
create or replace function public.entregar_simulado_nacional(p_edicao text, p_respostas jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_ed public.simulado_edicoes;
  v_part public.simulado_participacoes;
  v_acertos integer;
  v_total integer;
  v_segundos integer;
  v_por_tema jsonb;
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if jsonb_typeof(coalesce(p_respostas, '{}'::jsonb)) <> 'object' then raise exception 'respostas_invalidas' using errcode = '22023'; end if;
  select * into v_ed from public.simulado_edicoes e where e.edicao = p_edicao;
  if not found then raise exception 'edicao_inexistente' using errcode = '22023'; end if;
  select * into v_part from public.simulado_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = auth.uid() for update;
  if not found then raise exception 'nao_iniciado' using errcode = '22023'; end if;
  -- Entregar de novo (rede caiu no meio) devolve o mesmo resultado.
  if v_part.entregue_em is not null then return public.resultado_simulado_nacional(p_edicao); end if;

  select count(*) filter (where upper(coalesce(p_respostas->>i.id_questao, '')) = i.gabarito), count(*)
    into v_acertos, v_total
  from public.simulado_itens i where i.edicao = p_edicao;
  select jsonb_object_agg(t.tema, jsonb_build_object('certas', t.certas, 'total', t.total)) into v_por_tema
  from (select i.tema, count(*) filter (where upper(coalesce(p_respostas->>i.id_questao, '')) = i.gabarito) as certas, count(*) as total
        from public.simulado_itens i where i.edicao = p_edicao group by i.tema) t;
  v_segundos := greatest(0, extract(epoch from now() - v_part.iniciado_em)::integer);

  update public.simulado_participacoes sp set
    entregue_em = now(),
    respostas = (select coalesce(jsonb_object_agg(i.id_questao, upper(p_respostas->>i.id_questao)), '{}'::jsonb)
                 from public.simulado_itens i where i.edicao = p_edicao and p_respostas ? i.id_questao),
    acertos = v_acertos, total = v_total, segundos = least(v_segundos, v_ed.duracao_min * 60),
    -- Cinco minutos de tolerância para rede lenta; depois disso não entra no ranking.
    no_tempo = v_segundos <= v_ed.duracao_min * 60 + 300 and now() <= v_ed.fecha_em + interval '1 day',
    por_tema = v_por_tema
  where sp.edicao = p_edicao and sp.usuario_id = auth.uid();
  return public.resultado_simulado_nacional(p_edicao);
end $$;
revoke all on function public.entregar_simulado_nacional(text, jsonb) from public, anon, authenticated;
grant execute on function public.entregar_simulado_nacional(text, jsonb) to authenticated;

-- Resultado: nota para todos; posição, percentil e prontidão por tema para o plano pago.
create or replace function public.resultado_simulado_nacional(p_edicao text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_part public.simulado_participacoes;
  v_premium boolean := public.tem_premium_interno(auth.uid());
  v_posicao bigint;
  v_classificados bigint;
  v_media numeric;
  v_top jsonb;
  v_temas jsonb;
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select * into v_part from public.simulado_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = auth.uid();
  if not found or v_part.entregue_em is null then return jsonb_build_object('entregue', false); end if;

  select count(*), round(avg(sp.acertos::numeric * 100 / nullif(sp.total, 0)), 1)
    into v_classificados, v_media
  from public.simulado_participacoes sp where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo;

  with ordem as (
    select sp.usuario_id, row_number() over (order by sp.acertos desc, sp.segundos asc, sp.entregue_em asc) as posicao
    from public.simulado_participacoes sp where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo
  )
  select o.posicao into v_posicao from ordem o where o.usuario_id = auth.uid();

  -- Os 10 primeiros aparecem para todos; quem saiu do ranking geral fica de fora da lista.
  select coalesce(jsonb_agg(jsonb_build_object('posicao', x.posicao, 'apelido', x.apelido, 'acertos', x.acertos, 'total', x.total, 'segundos', x.segundos, 'eh_voce', x.eh_voce) order by x.posicao), '[]'::jsonb)
    into v_top
  from (
    select row_number() over (order by sp.acertos desc, sp.segundos asc, sp.entregue_em asc) as posicao,
           public.apelido_publico_interno(sp.usuario_id) as apelido, sp.acertos, sp.total, sp.segundos,
           sp.usuario_id = auth.uid() as eh_voce,
           coalesce(pp.participa_ranking, true) and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = sp.usuario_id) as visivel
    from public.simulado_participacoes sp
    left join public.perfis_publicos pp on pp.usuario_id = sp.usuario_id
    where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo
  ) x where x.posicao <= 10 and (x.visivel or x.eh_voce);

  if v_premium then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tema', t.tema, 'certas', (v_part.por_tema->t.tema->>'certas')::int, 'total', (v_part.por_tema->t.tema->>'total')::int,
             'media', t.media) order by t.tema), '[]'::jsonb)
      into v_temas
    from (
      select k.tema, round(avg((sp.por_tema->k.tema->>'certas')::numeric * 100 / nullif((sp.por_tema->k.tema->>'total')::numeric, 0)), 1) as media
      from (select jsonb_object_keys(v_part.por_tema) as tema) k
      cross join public.simulado_participacoes sp
      where sp.edicao = p_edicao and sp.entregue_em is not null and sp.por_tema ? k.tema
      group by k.tema
    ) t;
  end if;

  return jsonb_build_object(
    'entregue', true, 'premium', v_premium,
    'acertos', v_part.acertos, 'total', v_part.total, 'segundos', v_part.segundos, 'no_tempo', v_part.no_tempo,
    'entregue_em', v_part.entregue_em, 'participantes', v_classificados, 'media', v_media,
    'posicao', case when v_premium then v_posicao end,
    'percentil', case when v_premium and v_posicao is not null and v_classificados > 1
                      then round(100 - (v_posicao - 1)::numeric * 100 / (v_classificados - 1)) end,
    'temas', v_temas, 'top', v_top);
end $$;
revoke all on function public.resultado_simulado_nacional(text) from public, anon, authenticated;
grant execute on function public.resultado_simulado_nacional(text) to authenticated;

-- Gabarito da edição, só depois de entregar (para a correção questão a questão).
create or replace function public.gabarito_simulado_nacional(p_edicao text)
returns table (id_questao text, gabarito text, marcada text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not exists (select 1 from public.simulado_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = auth.uid() and sp.entregue_em is not null) then
    raise exception 'nao_entregue' using errcode = '42501';
  end if;
  return query
    select i.id_questao, i.gabarito, sp.respostas->>i.id_questao
    from public.simulado_itens i
    join public.simulado_participacoes sp on sp.edicao = i.edicao and sp.usuario_id = auth.uid()
    where i.edicao = p_edicao order by i.ordem;
end $$;
revoke all on function public.gabarito_simulado_nacional(text) from public, anon, authenticated;
grant execute on function public.gabarito_simulado_nacional(text) to authenticated;

create or replace function public.publicar_simulado_admin(p_edicao text, p_titulo text, p_abre timestamptz, p_fecha timestamptz, p_duracao integer, p_itens jsonb)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare v_n integer;
begin
  perform public.exigir_administrador();
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) < 10 or jsonb_array_length(p_itens) > 200 then
    raise exception 'itens_invalidos' using errcode = '22023';
  end if;
  if exists (select 1 from public.simulado_participacoes sp where sp.edicao = p_edicao) then
    raise exception 'edicao_com_participantes' using errcode = '22023';
  end if;
  insert into public.simulado_edicoes (edicao, titulo, abre_em, fecha_em, duracao_min)
  values (p_edicao, btrim(p_titulo), p_abre, p_fecha, p_duracao)
  on conflict (edicao) do update set titulo = excluded.titulo, abre_em = excluded.abre_em, fecha_em = excluded.fecha_em,
    duracao_min = excluded.duracao_min, publicado_em = now();
  delete from public.simulado_itens i where i.edicao = p_edicao;
  insert into public.simulado_itens (edicao, ordem, id_questao, gabarito, tema)
  select p_edicao, x.ordem::int, x.item->>'id', upper(x.item->>'gabarito'), x.item->>'tema'
  from jsonb_array_elements(p_itens) with ordinality as x(item, ordem);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.publicar_simulado_admin(text, text, timestamptz, timestamptz, integer, jsonb) from public, anon, authenticated;
grant execute on function public.publicar_simulado_admin(text, text, timestamptz, timestamptz, integer, jsonb) to authenticated;

create or replace function public.listar_simulados_admin()
returns table (edicao text, titulo text, abre_em timestamptz, fecha_em timestamptz, duracao_min integer, total bigint, iniciaram bigint, entregaram bigint, media numeric, ids jsonb)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select e.edicao, e.titulo, e.abre_em, e.fecha_em, e.duracao_min,
           (select count(*) from public.simulado_itens i where i.edicao = e.edicao),
           (select count(*) from public.simulado_participacoes sp where sp.edicao = e.edicao),
           (select count(*) from public.simulado_participacoes sp where sp.edicao = e.edicao and sp.entregue_em is not null),
           (select round(avg(sp.acertos::numeric * 100 / nullif(sp.total, 0)), 1) from public.simulado_participacoes sp where sp.edicao = e.edicao and sp.entregue_em is not null),
           (select jsonb_agg(i.id_questao) from public.simulado_itens i where i.edicao = e.edicao)
    from public.simulado_edicoes e order by e.abre_em desc;
end $$;
revoke all on function public.listar_simulados_admin() from public, anon, authenticated;
grant execute on function public.listar_simulados_admin() to authenticated;

-- Questões do Simulado Nacional em andamento não gastam o limite diário grátis.
-- Assinante já não tem limite; isto vale quando o painel libera os recursos
-- pagos para todos (promoção), e a prova precisa caber numa sentada.
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
      or exists(select 1 from public.simulado_participacoes sp
                join public.simulado_itens si on si.edicao = sp.edicao and si.id_questao = regexp_replace(p_id_questao, '^r[0-9]+:', '')
                join public.simulado_edicoes se on se.edicao = sp.edicao
                where sp.usuario_id = v_usuario and sp.entregue_em is null
                  and v_agora <= sp.iniciado_em + make_interval(mins => se.duracao_min + 30))
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
-- 3. Plano até a prova
-- ---------------------------------------------------------------------------

create table if not exists public.planos_estudo (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  data_prova date not null,
  intensidade text not null default 'firme' check (intensidade in ('leve', 'firme', 'completo')),
  folgas integer[] not null default '{}' check (folgas <@ array[0,1,2,3,4,5,6] and cardinality(folgas) <= 5),
  prova text not null default 'TEOT' check (char_length(prova) between 2 and 40),
  -- Quantas questões diferentes a pessoa tinha respondido ao criar o plano.
  base_respondidas integer not null default 0 check (base_respondidas >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.planos_estudo enable row level security;
revoke all on public.planos_estudo from public, anon, authenticated;

create or replace function public.obter_plano_estudo()
returns table (data_prova date, intensidade text, folgas integer[], prova text, base_respondidas integer, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  return query select p.data_prova, p.intensidade, p.folgas, p.prova, p.base_respondidas, p.criado_em
               from public.planos_estudo p where p.usuario_id = auth.uid();
end $$;
revoke all on function public.obter_plano_estudo() from public, anon, authenticated;
grant execute on function public.obter_plano_estudo() to authenticated;

-- p_recomecar zera a linha de base (o "adiantado ou atrasado" recomeça hoje).
create or replace function public.salvar_plano_estudo(p_data_prova date, p_intensidade text, p_folgas integer[], p_prova text, p_base integer, p_recomecar boolean default false)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_premium();
  if p_data_prova is null or p_data_prova <= (now() at time zone 'America/Sao_Paulo')::date or p_data_prova > (now() at time zone 'America/Sao_Paulo')::date + 730 then
    raise exception 'data_invalida' using errcode = '22023';
  end if;
  insert into public.planos_estudo as p (usuario_id, data_prova, intensidade, folgas, prova, base_respondidas)
  values (auth.uid(), p_data_prova, coalesce(p_intensidade, 'firme'), coalesce(p_folgas, '{}'), coalesce(nullif(btrim(p_prova), ''), 'TEOT'), greatest(coalesce(p_base, 0), 0))
  on conflict (usuario_id) do update set
    data_prova = excluded.data_prova, intensidade = excluded.intensidade, folgas = excluded.folgas, prova = excluded.prova,
    base_respondidas = case when p_recomecar then excluded.base_respondidas else p.base_respondidas end,
    criado_em = case when p_recomecar then now() else p.criado_em end,
    atualizado_em = now();
  return true;
end $$;
revoke all on function public.salvar_plano_estudo(date, text, integer[], text, integer, boolean) from public, anon, authenticated;
grant execute on function public.salvar_plano_estudo(date, text, integer[], text, integer, boolean) to authenticated;

create or replace function public.apagar_plano_estudo()
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  delete from public.planos_estudo p where p.usuario_id = auth.uid();
  return true;
end $$;
revoke all on function public.apagar_plano_estudo() from public, anon, authenticated;
grant execute on function public.apagar_plano_estudo() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Liga da residência
-- ---------------------------------------------------------------------------

create table if not exists public.ligas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 3 and 60 and nome !~ '[<>]'),
  codigo text not null unique check (codigo ~ '^[A-Z2-9]{8}$'),
  dono_id uuid not null references auth.users(id) on delete cascade,
  criada_em timestamptz not null default now()
);
create table if not exists public.ligas_membros (
  liga_id uuid not null references public.ligas(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  entrou_em timestamptz not null default now(),
  primary key (liga_id, usuario_id)
);
create index if not exists ligas_membros_usuario on public.ligas_membros (usuario_id);
alter table public.ligas enable row level security;
alter table public.ligas_membros enable row level security;
revoke all on public.ligas, public.ligas_membros from public, anon, authenticated;

create or replace function public.criar_liga(p_nome text)
returns table (id uuid, codigo text)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_codigo text;
  v_id uuid;
  v_alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  perform public.exigir_premium();
  if (select count(*) from public.ligas l where l.dono_id = auth.uid()) >= 5 then raise exception 'limite_ligas' using errcode = '54000'; end if;
  loop
    select string_agg(substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1), '') into v_codigo from generate_series(1, 8);
    exit when not exists (select 1 from public.ligas l where l.codigo = v_codigo);
  end loop;
  insert into public.ligas (nome, codigo, dono_id) values (btrim(p_nome), v_codigo, auth.uid()) returning ligas.id into v_id;
  insert into public.ligas_membros (liga_id, usuario_id) values (v_id, auth.uid());
  return query select v_id, v_codigo;
end $$;
revoke all on function public.criar_liga(text) from public, anon, authenticated;
grant execute on function public.criar_liga(text) to authenticated;

-- Prévia do convite: nome e tamanho da liga, sem expor ninguém.
create or replace function public.previa_liga(p_codigo text)
returns table (id uuid, nome text, membros bigint, dono text, ja_sou_membro boolean)
language sql stable security definer set search_path = '' as $$
  select l.id, l.nome, (select count(*) from public.ligas_membros m where m.liga_id = l.id),
         public.apelido_publico_interno(l.dono_id),
         exists (select 1 from public.ligas_membros m where m.liga_id = l.id and m.usuario_id = auth.uid())
  from public.ligas l where l.codigo = upper(btrim(p_codigo));
$$;
revoke all on function public.previa_liga(text) from public;
grant execute on function public.previa_liga(text) to anon, authenticated;

-- Entrar pelo convite também é do plano pago.
create or replace function public.entrar_liga(p_codigo text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.exigir_premium();
  select l.id into v_id from public.ligas l where l.codigo = upper(btrim(p_codigo));
  if v_id is null then raise exception 'convite_invalido' using errcode = '22023'; end if;
  if (select count(*) from public.ligas_membros m where m.liga_id = v_id) >= 300 then raise exception 'liga_cheia' using errcode = '54000'; end if;
  if (select count(*) from public.ligas_membros m where m.usuario_id = auth.uid()) >= 20 then raise exception 'limite_ligas' using errcode = '54000'; end if;
  insert into public.ligas_membros (liga_id, usuario_id) values (v_id, auth.uid()) on conflict do nothing;
  return v_id;
end $$;
revoke all on function public.entrar_liga(text) from public, anon, authenticated;
grant execute on function public.entrar_liga(text) to authenticated;

-- Sair da liga. Se quem sai é o dono, a liga acaba para todos.
create or replace function public.sair_liga(p_liga uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if exists (select 1 from public.ligas l where l.id = p_liga and l.dono_id = auth.uid()) then
    delete from public.ligas l where l.id = p_liga;
  else
    delete from public.ligas_membros m where m.liga_id = p_liga and m.usuario_id = auth.uid();
  end if;
  return true;
end $$;
revoke all on function public.sair_liga(uuid) from public, anon, authenticated;
grant execute on function public.sair_liga(uuid) to authenticated;

create or replace function public.renomear_liga(p_liga uuid, p_nome text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  update public.ligas l set nome = btrim(p_nome) where l.id = p_liga and l.dono_id = auth.uid();
  if not found then raise exception 'acesso_negado' using errcode = '42501'; end if;
  return true;
end $$;
revoke all on function public.renomear_liga(uuid, text) from public, anon, authenticated;
grant execute on function public.renomear_liga(uuid, text) to authenticated;

create or replace function public.remover_membro_liga(p_liga uuid, p_membro uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.ligas l where l.id = p_liga and l.dono_id = auth.uid()) or p_membro = auth.uid() then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  delete from public.ligas_membros m where m.liga_id = p_liga and m.usuario_id = p_membro;
  return found;
end $$;
revoke all on function public.remover_membro_liga(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remover_membro_liga(uuid, uuid) to authenticated;

-- Placar de cada membro: questões diferentes (geral) e nos últimos 7 dias.
create or replace function public.placar_liga_interno(p_liga uuid)
returns table (usuario_id uuid, total_geral bigint, total_semana bigint)
language sql stable security definer set search_path = '' as $$
  with membros as (select m.usuario_id from public.ligas_membros m where m.liga_id = p_liga),
  epocas as (
    select p.usuario_id, max(p.versao) as epoca
    from public.progresso_usuario p join membros mb on mb.usuario_id = p.usuario_id
    where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
    group by p.usuario_id
  ),
  validas as (
    select p.usuario_id, p.atualizado_em
    from public.progresso_usuario p
    join membros mb on mb.usuario_id = p.usuario_id
    left join epocas e on e.usuario_id = p.usuario_id
    where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
      and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
  )
  select mb.usuario_id,
         (select count(*) from validas v where v.usuario_id = mb.usuario_id),
         (select count(*) from validas v where v.usuario_id = mb.usuario_id and v.atualizado_em >= now() - interval '7 days')
  from membros mb;
$$;
revoke all on function public.placar_liga_interno(uuid) from public, anon, authenticated;

create or replace function public.minhas_ligas()
returns table (id uuid, nome text, codigo text, sou_dono boolean, membros bigint, minha_posicao bigint, lider text, criada_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  return query
    select l.id, l.nome, l.codigo, l.dono_id = auth.uid(),
           (select count(*) from public.ligas_membros m where m.liga_id = l.id),
           (select r.posicao from (select pl.usuario_id, row_number() over (order by pl.total_geral desc, pl.usuario_id) as posicao
                                   from public.placar_liga_interno(l.id) pl) r where r.usuario_id = auth.uid()),
           (select public.apelido_publico_interno(pl.usuario_id) from public.placar_liga_interno(l.id) pl order by pl.total_geral desc limit 1),
           l.criada_em
    from public.ligas l
    where exists (select 1 from public.ligas_membros m where m.liga_id = l.id and m.usuario_id = auth.uid())
    order by l.criada_em;
end $$;
revoke all on function public.minhas_ligas() from public, anon, authenticated;
grant execute on function public.minhas_ligas() to authenticated;

-- Ranking da liga. Só membros veem; só o dono recebe o identificador (para remover alguém).
create or replace function public.ranking_liga(p_liga uuid, p_periodo text default 'geral')
returns table (posicao bigint, apelido text, total bigint, total_geral bigint, eh_voce boolean, eh_dono boolean, membro uuid)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_dono uuid;
begin
  perform public.exigir_premium();
  if not exists (select 1 from public.ligas_membros m where m.liga_id = p_liga and m.usuario_id = auth.uid()) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  select l.dono_id into v_dono from public.ligas l where l.id = p_liga;
  return query
    select row_number() over (order by case when p_periodo = 'semana' then pl.total_semana else pl.total_geral end desc, pl.total_geral desc, m.entrou_em),
           public.apelido_publico_interno(pl.usuario_id),
           case when p_periodo = 'semana' then pl.total_semana else pl.total_geral end,
           pl.total_geral,
           pl.usuario_id = auth.uid(),
           pl.usuario_id = v_dono,
           case when v_dono = auth.uid() then pl.usuario_id end
    from public.placar_liga_interno(p_liga) pl
    join public.ligas_membros m on m.liga_id = p_liga and m.usuario_id = pl.usuario_id
    order by 1;
end $$;
revoke all on function public.ranking_liga(uuid, text) from public, anon, authenticated;
grant execute on function public.ranking_liga(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Relatório mensal por e-mail
-- ---------------------------------------------------------------------------

alter table public.preferencias_email add column if not exists relatorio_mensal boolean not null default true;
alter table public.emails_enviados drop constraint if exists emails_enviados_tipo_check;
alter table public.emails_enviados add constraint emails_enviados_tipo_check check (tipo in ('marco', 'parabens', 'alerta_admin', 'relatorio'));
create unique index if not exists emails_enviados_relatorio_unico on public.emails_enviados (id_usuario, referencia) where tipo = 'relatorio';

create or replace function public.obter_preferencias_email_completas()
returns table (conquistas boolean, relatorio_mensal boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce((select pe.conquistas from public.preferencias_email pe where pe.id_usuario = auth.uid()), true),
         coalesce((select pe.relatorio_mensal from public.preferencias_email pe where pe.id_usuario = auth.uid()), true);
$$;
revoke all on function public.obter_preferencias_email_completas() from public, anon, authenticated;
grant execute on function public.obter_preferencias_email_completas() to authenticated;

create or replace function public.definir_preferencia_relatorio(p_relatorio boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  insert into public.preferencias_email (id_usuario, relatorio_mensal, atualizado_em) values (auth.uid(), coalesce(p_relatorio, true), now())
  on conflict (id_usuario) do update set relatorio_mensal = excluded.relatorio_mensal, atualizado_em = now();
  return coalesce(p_relatorio, true);
end $$;
revoke all on function public.definir_preferencia_relatorio(boolean) from public, anon, authenticated;
grant execute on function public.definir_preferencia_relatorio(boolean) to authenticated;

-- Quem recebe o relatório do mês: plano pago vigente, e-mail confirmado,
-- preferência ligada e ainda não recebeu o deste mês.
create or replace function public.destinatarios_relatorio_mensal(p_mes text, p_limite integer default 100)
returns table (id_usuario uuid)
language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u
  where u.email is not null and u.email_confirmed_at is not null
    and public.motivo_premium_interno(u.id) in ('assinatura', 'cortesia', 'administrador')
    and coalesce((select pe.relatorio_mensal from public.preferencias_email pe where pe.id_usuario = u.id), true)
    and not exists (select 1 from public.emails_enviados e where e.tipo = 'relatorio' and e.id_usuario = u.id and e.referencia = p_mes and e.status in ('enviado', 'enviando'))
  order by u.created_at
  limit greatest(1, least(coalesce(p_limite, 100), 500));
$$;
revoke all on function public.destinatarios_relatorio_mensal(text, integer) from public, anon, authenticated;
grant execute on function public.destinatarios_relatorio_mensal(text, integer) to service_role;

-- Números do mês (fuso de São Paulo). O tema sai do prefixo do id da questão.
create or replace function public.dados_relatorio_mensal(p_id uuid, p_mes text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_inicio timestamptz := (to_date(p_mes || '-01', 'YYYY-MM-DD')::timestamp at time zone 'America/Sao_Paulo');
  v_fim timestamptz := ((to_date(p_mes || '-01', 'YYYY-MM-DD') + interval '1 month')::timestamp at time zone 'America/Sao_Paulo');
  v_ant timestamptz := ((to_date(p_mes || '-01', 'YYYY-MM-DD') - interval '1 month')::timestamp at time zone 'America/Sao_Paulo');
  v jsonb;
begin
  with eventos as (
    select regexp_replace(r.id_questao, '-[0-9]+$', '') as tema,
           to_timestamp((ev->>'em')::double precision / 1000) as em,
           ev->>'correta' as correta
    from public.respostas_validas_interno() r, jsonb_array_elements(r.eventos) ev
    where r.usuario_id = p_id and ev ? 'em'
  ),
  mes as (select * from eventos e where e.em >= v_inicio and e.em < v_fim),
  anterior as (select * from eventos e where e.em >= v_ant and e.em < v_inicio)
  select jsonb_build_object(
    'email', (select u.email from auth.users u where u.id = p_id),
    'nome', (select nullif(btrim(u.raw_user_meta_data->>'nome'), '') from auth.users u where u.id = p_id),
    'mes', p_mes,
    'respostas', (select count(*) from mes),
    'certas', (select count(*) from mes where correta = 'true'),
    'erradas', (select count(*) from mes where correta = 'false'),
    'dias_ativos', (select count(distinct (em at time zone 'America/Sao_Paulo')::date) from mes),
    'respostas_anterior', (select count(*) from anterior),
    'certas_anterior', (select count(*) from anterior where correta = 'true'),
    'erradas_anterior', (select count(*) from anterior where correta = 'false'),
    'total_acumulado', (select count(*) from public.respostas_validas_interno() r where r.usuario_id = p_id),
    'temas', coalesce((select jsonb_agg(jsonb_build_object('tema', t.tema, 'certas', t.certas, 'total', t.total, 'certas_ant', t.certas_ant, 'total_ant', t.total_ant))
                       from (select coalesce(m.tema, a.tema) as tema, coalesce(m.certas, 0) as certas, coalesce(m.total, 0) as total,
                                    coalesce(a.certas, 0) as certas_ant, coalesce(a.total, 0) as total_ant
                             from (select tema, count(*) filter (where correta = 'true') as certas, count(*) filter (where correta in ('true','false')) as total from mes group by tema) m
                             full join (select tema, count(*) filter (where correta = 'true') as certas, count(*) filter (where correta in ('true','false')) as total from anterior group by tema) a
                               on a.tema = m.tema) t), '[]'::jsonb),
    'simulado', (select jsonb_build_object('titulo', se.titulo, 'acertos', sp.acertos, 'total', sp.total)
                 from public.simulado_participacoes sp join public.simulado_edicoes se on se.edicao = sp.edicao
                 where sp.usuario_id = p_id and sp.entregue_em >= v_inicio and sp.entregue_em < v_fim
                 order by sp.entregue_em desc limit 1)
  ) into v;
  return v;
end $$;
revoke all on function public.dados_relatorio_mensal(uuid, text) from public, anon, authenticated;
grant execute on function public.dados_relatorio_mensal(uuid, text) to service_role;

create or replace function public.resumo_relatorio_admin(p_mes text)
returns table (pendentes bigint, enviados bigint, falharam bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select
    (select count(*) from auth.users u
      where u.email is not null and u.email_confirmed_at is not null
        and public.motivo_premium_interno(u.id) in ('assinatura', 'cortesia', 'administrador')
        and coalesce((select pe.relatorio_mensal from public.preferencias_email pe where pe.id_usuario = u.id), true)
        and not exists (select 1 from public.emails_enviados e where e.tipo = 'relatorio' and e.id_usuario = u.id and e.referencia = p_mes and e.status in ('enviado', 'enviando'))),
    (select count(*) from public.emails_enviados e where e.tipo = 'relatorio' and e.referencia = p_mes and e.status = 'enviado'),
    (select count(*) from public.emails_enviados e where e.tipo = 'relatorio' and e.referencia = p_mes and e.status = 'falhou');
end $$;
revoke all on function public.resumo_relatorio_admin(text) from public, anon, authenticated;
grant execute on function public.resumo_relatorio_admin(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Edição de lançamento do Simulado Nacional (abre agora, fecha no fim de outubro).
-- Gerada por scripts/gerar_simulado_nacional.mjs; as próximas saem pelo painel.
-- ---------------------------------------------------------------------------
-- Simulado Nacional · Outubro de 2026: 50 questões de 3321 elegíveis.
insert into public.simulado_edicoes (edicao, titulo, abre_em, fecha_em, duracao_min)
values ('2026-10', 'Simulado Nacional · Outubro de 2026', now(), '2026-11-01T02:59:59.000Z', 120)
on conflict (edicao) do nothing;
insert into public.simulado_itens (edicao, ordem, id_questao, gabarito, tema)
select '2026-10', x.ordem, x.id, x.gabarito, x.tema from (values
  (1, 'trauma-0862', 'A', 'Trauma adulto'),
  (2, 'pe-tornozelo-0170', 'D', 'Pé e tornozelo'),
  (3, 'quadril-0331', 'D', 'Quadril'),
  (4, 'trauma-0911', 'A', 'Trauma adulto'),
  (5, 'mao-0372', 'B', 'Mão e punho'),
  (6, 'osteometabolicas-0075', 'A', 'Osteometabólicas'),
  (7, 'coluna-0164', 'C', 'Coluna'),
  (8, 'trauma-0541', 'A', 'Trauma adulto'),
  (9, 'conceitos-basicos-0009', 'B', 'Conceitos básicos'),
  (10, 'pediatria-0146', 'B', 'Ortopedia pediátrica'),
  (11, 'ombro-cotovelo-0366', 'A', 'Ombro e cotovelo'),
  (12, 'ombro-cotovelo-0289', 'C', 'Ombro e cotovelo'),
  (13, 'joelho-0079', 'D', 'Joelho'),
  (14, 'coluna-0068', 'D', 'Coluna'),
  (15, 'mao-0142', 'A', 'Mão e punho'),
  (16, 'ombro-cotovelo-0112', 'A', 'Ombro e cotovelo'),
  (17, 'trauma-0065', 'A', 'Trauma adulto'),
  (18, 'pediatria-0279', 'A', 'Ortopedia pediátrica'),
  (19, 'mao-0019', 'A', 'Mão e punho'),
  (20, 'trauma-0949', 'D', 'Trauma adulto'),
  (21, 'mao-0135', 'A', 'Mão e punho'),
  (22, 'tumores-0296', 'D', 'Tumores ósseos e de partes moles'),
  (23, 'trauma-0995', 'A', 'Trauma adulto'),
  (24, 'trauma-1062', 'B', 'Trauma adulto'),
  (25, 'joelho-0271', 'B', 'Joelho'),
  (26, 'tumores-0059', 'A', 'Tumores ósseos e de partes moles'),
  (27, 'conceitos-basicos-0253', 'A', 'Conceitos básicos'),
  (28, 'mao-0250', 'A', 'Mão e punho'),
  (29, 'trauma-0028', 'B', 'Trauma adulto'),
  (30, 'tumores-0046', 'D', 'Tumores ósseos e de partes moles'),
  (31, 'quadril-0057', 'B', 'Quadril'),
  (32, 'mao-0302', 'B', 'Mão e punho'),
  (33, 'joelho-0053', 'C', 'Joelho'),
  (34, 'trauma-0554', 'B', 'Trauma adulto'),
  (35, 'pediatria-0033', 'D', 'Ortopedia pediátrica'),
  (36, 'ombro-cotovelo-0464', 'B', 'Ombro e cotovelo'),
  (37, 'trauma-0018', 'B', 'Trauma adulto'),
  (38, 'pediatria-0210', 'B', 'Ortopedia pediátrica'),
  (39, 'mao-0109', 'C', 'Mão e punho'),
  (40, 'pediatria-0176', 'C', 'Ortopedia pediátrica'),
  (41, 'pediatria-0664', 'B', 'Ortopedia pediátrica'),
  (42, 'pediatria-0407', 'B', 'Ortopedia pediátrica'),
  (43, 'tumores-0211', 'D', 'Tumores ósseos e de partes moles'),
  (44, 'quadril-0193', 'B', 'Quadril'),
  (45, 'coluna-0111', 'C', 'Coluna'),
  (46, 'pediatria-0036', 'A', 'Ortopedia pediátrica'),
  (47, 'pe-tornozelo-0157', 'A', 'Pé e tornozelo'),
  (48, 'conceitos-basicos-0018', 'D', 'Conceitos básicos'),
  (49, 'pe-tornozelo-0008', 'A', 'Pé e tornozelo'),
  (50, 'pe-tornozelo-0215', 'D', 'Pé e tornozelo')
) as x(ordem, id, gabarito, tema)
where not exists (select 1 from public.simulado_itens i where i.edicao = '2026-10');

notify pgrst, 'reload schema';
commit;
