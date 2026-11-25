-- Shorts (Tales, 25/11/2026: "como um Reels, uma questão por tela"). Cria o histórico das respostas nos Shorts
-- (com a data em que a questão volta na revisão escondida), os corações (que também gravam nota 10 na avaliação
-- do comentário), a contagem de vistas e pulos por questão, a cota grátis de 5 Shorts por dia (à parte das 20
-- questões grátis) e o painel do administrador. Só cria tabelas e funções novas e uma coluna com valor padrão;
-- não altera nem apaga dados existentes.
begin;

alter table public.configuracao_comercial
  add column if not exists limite_diario_shorts integer not null default 5 check (limite_diario_shorts between 0 and 10000);

create table if not exists public.shorts_respostas (
  id bigint generated always as identity primary key,
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id_questao text not null check (id_questao ~ '^[a-z0-9-]{3,80}$'),
  certo boolean not null,
  revisao boolean not null default false,
  volta_em timestamptz,
  segundos integer check (segundos between 0 and 86400),
  criado_em timestamptz not null default now()
);
create index if not exists shorts_respostas_usuario_idx on public.shorts_respostas (usuario_id, criado_em desc);
create index if not exists shorts_respostas_questao_idx on public.shorts_respostas (id_questao);
create index if not exists shorts_respostas_criado_idx on public.shorts_respostas (criado_em);
alter table public.shorts_respostas enable row level security;
drop policy if exists shorts_respostas_le_proprias on public.shorts_respostas;
create policy shorts_respostas_le_proprias on public.shorts_respostas for select to authenticated using (usuario_id = auth.uid());

create table if not exists public.shorts_coracoes (
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id_questao text not null check (id_questao ~ '^[a-z0-9-]{3,80}$'),
  criado_em timestamptz not null default now(),
  primary key (usuario_id, id_questao)
);
create index if not exists shorts_coracoes_questao_idx on public.shorts_coracoes (id_questao);
alter table public.shorts_coracoes enable row level security;
drop policy if exists shorts_coracoes_le_proprios on public.shorts_coracoes;
create policy shorts_coracoes_le_proprios on public.shorts_coracoes for select to authenticated using (usuario_id = auth.uid());

create table if not exists public.shorts_contagem (
  id_questao text primary key check (id_questao ~ '^[a-z0-9-]{3,80}$'),
  vistas integer not null default 0,
  puladas integer not null default 0,
  atualizado_em timestamptz not null default now()
);
alter table public.shorts_contagem enable row level security;

-- Quem não tem limite nos Shorts: as mesmas regras de autorizar_resposta (paywall desligado, administrador,
-- cortesia vigente e assinatura ativa ou cancelada até o fim do período).
create or replace function public.shorts_sem_limite(p_usuario uuid)
returns boolean language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_agora timestamptz := clock_timestamp();
  v_paywall boolean;
begin
  select c.paywall_ativo into v_paywall from public.configuracao_comercial c where c.id = true;
  v_paywall := coalesce(v_paywall, false) or exists(select 1 from public.contas_teste t where t.id_usuario = p_usuario and t.ativa);
  if not v_paywall then return true; end if;
  return exists(select 1 from public.administradores adm where adm.id_usuario = p_usuario)
      or exists(select 1 from public.acessos_cortesia c where c.id_usuario = p_usuario and coalesce(c.ate, 'infinity') > v_agora)
      or exists(select 1 from public.assinaturas a where a.id_usuario = p_usuario
                and (a.status = 'ativa' or (a.status = 'cancelada' and a.cancelar_ao_fim))
                and coalesce(a.fim_periodo, 'infinity') > v_agora);
end $$;
revoke all on function public.shorts_sem_limite(uuid) from public, anon, authenticated;

-- Saldo do dia (dia de São Paulo; os Shorts grátis voltam à meia-noite).
create or replace function public.saldo_shorts()
returns table (ilimitado boolean, feitas integer, limite integer, libera_em timestamptz)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_inicio timestamptz := date_trunc('day', clock_timestamp() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  return query select public.shorts_sem_limite(v_usuario),
    (select count(*)::integer from public.shorts_respostas r where r.usuario_id = v_usuario and r.criado_em >= v_inicio),
    (select c.limite_diario_shorts from public.configuracao_comercial c where c.id = true),
    v_inicio + interval '1 day';
end $$;
revoke all on function public.saldo_shorts() from public, anon;
grant execute on function public.saldo_shorts() to authenticated;

-- Responde um Short: confere a cota e grava a resposta (com a volta da revisão escondida, sorteada no aparelho).
create or replace function public.responder_short(p_id_questao text, p_certo boolean, p_revisao boolean, p_volta_em timestamptz, p_segundos integer)
returns table (permitido boolean, ilimitado boolean, feitas integer, limite integer, libera_em timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_agora timestamptz := clock_timestamp();
  v_inicio timestamptz := date_trunc('day', clock_timestamp() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_ilimitado boolean;
  v_feitas integer;
  v_limite integer;
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_id_questao is null or p_id_questao !~ '^[a-z0-9-]{3,80}$' then raise exception 'questao_invalida'; end if;
  if p_volta_em is not null and (p_volta_em < v_agora or p_volta_em > v_agora + interval '30 days') then raise exception 'volta_invalida'; end if;
  -- Duas abas ao mesmo tempo não passam juntas do quinto Short.
  perform pg_advisory_xact_lock(hashtext('shorts:' || v_usuario::text));
  v_ilimitado := public.shorts_sem_limite(v_usuario);
  select c.limite_diario_shorts into v_limite from public.configuracao_comercial c where c.id = true;
  select count(*)::integer into v_feitas from public.shorts_respostas r where r.usuario_id = v_usuario and r.criado_em >= v_inicio;
  if not v_ilimitado and v_feitas >= v_limite then
    return query select false, false, v_feitas, v_limite, v_inicio + interval '1 day';
    return;
  end if;
  insert into public.shorts_respostas (usuario_id, id_questao, certo, revisao, volta_em, segundos)
    values (v_usuario, p_id_questao, p_certo, coalesce(p_revisao, false), p_volta_em, least(greatest(coalesce(p_segundos, 0), 0), 86400));
  return query select true, v_ilimitado, v_feitas + 1, v_limite, v_inicio + interval '1 day';
end $$;
revoke all on function public.responder_short(text, boolean, boolean, timestamptz, integer) from public, anon;
grant execute on function public.responder_short(text, boolean, boolean, timestamptz, integer) to authenticated;

-- A última resposta de cada questão nos últimos 180 dias, para o sorteio e a revisão escondida em qualquer aparelho.
create or replace function public.meu_historico_shorts()
returns table (id_questao text, em timestamptz, certo boolean, revisao boolean, volta_em timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct on (r.id_questao) r.id_questao, r.criado_em, r.certo, r.revisao, r.volta_em
  from public.shorts_respostas r
  where r.usuario_id = auth.uid() and r.criado_em > now() - interval '180 days'
  order by r.id_questao, r.criado_em desc
$$;
revoke all on function public.meu_historico_shorts() from public, anon;
grant execute on function public.meu_historico_shorts() to authenticated;

-- Coração: liga ou desliga, e espelha na nota do comentário (coração = nota 10). Devolve o total da questão.
create or replace function public.alternar_coracao_short(p_id_questao text, p_ligar boolean)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_total integer;
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_id_questao is null or p_id_questao !~ '^[a-z0-9-]{3,80}$' then raise exception 'questao_invalida'; end if;
  if p_ligar then
    insert into public.shorts_coracoes (usuario_id, id_questao) values (v_usuario, p_id_questao) on conflict do nothing;
    insert into public.avaliacoes_comentario (usuario_id, id_questao, util, motivo, observacao, nota, atualizado_em)
      values (v_usuario, p_id_questao, true, null, null, 10, now())
      on conflict (usuario_id, id_questao) do update set util = true, motivo = null, nota = 10, atualizado_em = now();
  else
    delete from public.shorts_coracoes c where c.usuario_id = v_usuario and c.id_questao = p_id_questao;
    delete from public.avaliacoes_comentario a where a.usuario_id = v_usuario and a.id_questao = p_id_questao and a.nota = 10 and a.observacao is null;
  end if;
  select count(*)::integer into v_total from public.shorts_coracoes c where c.id_questao = p_id_questao;
  return v_total;
end $$;
revoke all on function public.alternar_coracao_short(text, boolean) from public, anon;
grant execute on function public.alternar_coracao_short(text, boolean) to authenticated;

-- Total de corações das questões pedidas (aberto a todos: é o número que aparece no botão).
create or replace function public.coracoes_shorts(p_ids text[])
returns table (id_questao text, n integer)
language sql stable security definer set search_path = public, pg_temp as $$
  select c.id_questao, count(*)::integer from public.shorts_coracoes c
  where c.id_questao = any(p_ids[1:200]) group by c.id_questao
$$;
revoke all on function public.coracoes_shorts(text[]) from public;
grant execute on function public.coracoes_shorts(text[]) to anon, authenticated;

-- Vistas e pulos (o aparelho manda em lotes). Questão muito pulada é questão ruim para o formato.
create or replace function public.registrar_vistas_shorts(p_vistas text[], p_puladas text[])
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  insert into public.shorts_contagem (id_questao, vistas, puladas)
    select v.id, count(*)::integer, 0 from unnest((coalesce(p_vistas, '{}'))[1:100]) as v(id) where v.id ~ '^[a-z0-9-]{3,80}$' group by v.id
    on conflict (id_questao) do update set vistas = public.shorts_contagem.vistas + excluded.vistas, atualizado_em = now();
  insert into public.shorts_contagem (id_questao, vistas, puladas)
    select p.id, 0, count(*)::integer from unnest((coalesce(p_puladas, '{}'))[1:100]) as p(id) where p.id ~ '^[a-z0-9-]{3,80}$' group by p.id
    on conflict (id_questao) do update set puladas = public.shorts_contagem.puladas + excluded.puladas, atualizado_em = now();
end $$;
revoke all on function public.registrar_vistas_shorts(text[], text[]) from public, anon;
grant execute on function public.registrar_vistas_shorts(text[], text[]) to authenticated;

-- Painel do administrador: os últimos 30 dias, hoje, e as questões com mais corações e mais puladas.
create or replace function public.shorts_painel_admin()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_inicio timestamptz := date_trunc('day', clock_timestamp() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_limite integer;
begin
  perform public.exigir_administrador();
  select c.limite_diario_shorts into v_limite from public.configuracao_comercial c where c.id = true;
  return jsonb_build_object(
    'limite', v_limite,
    'totais', (select jsonb_build_object('respostas', count(*), 'pessoas', count(distinct r.usuario_id),
        'acertos', count(*) filter (where r.certo), 'revisoes', count(*) filter (where r.revisao),
        'coracoes', (select count(*) from public.shorts_coracoes)) from public.shorts_respostas r),
    'hoje', (select jsonb_build_object('respostas', count(*), 'pessoas', count(distinct r.usuario_id),
        'no_limite', (select count(*) from (select r2.usuario_id from public.shorts_respostas r2 where r2.criado_em >= v_inicio
            group by r2.usuario_id having count(*) >= v_limite and not public.shorts_sem_limite(r2.usuario_id)) x))
      from public.shorts_respostas r where r.criado_em >= v_inicio),
    'dias', coalesce((select jsonb_agg(d order by d->>'dia') from (
        select jsonb_build_object('dia', (r.criado_em at time zone 'America/Sao_Paulo')::date, 'respostas', count(*),
          'pessoas', count(distinct r.usuario_id), 'acertos', count(*) filter (where r.certo),
          'assinantes', count(distinct r.usuario_id) filter (where public.shorts_sem_limite(r.usuario_id))) as d
        from public.shorts_respostas r where r.criado_em >= v_inicio - interval '29 days'
        group by (r.criado_em at time zone 'America/Sao_Paulo')::date) x), '[]'::jsonb),
    'questoes', coalesce((select jsonb_agg(q order by (q->>'coracoes')::int desc, (q->>'respostas')::int desc) from (
        select jsonb_build_object('id', b.id, 'coracoes', coalesce(c.n, 0), 'respostas', coalesce(r.n, 0), 'acertos', coalesce(r.a, 0),
          'vistas', coalesce(k.vistas, 0), 'puladas', coalesce(k.puladas, 0)) as q
        from (select id_questao as id from public.shorts_coracoes union select id_questao from public.shorts_respostas union select id_questao from public.shorts_contagem) b
        left join (select id_questao, count(*) as n from public.shorts_coracoes group by id_questao) c on c.id_questao = b.id
        left join (select id_questao, count(*) as n, count(*) filter (where certo) as a from public.shorts_respostas group by id_questao) r on r.id_questao = b.id
        left join public.shorts_contagem k on k.id_questao = b.id
        order by coalesce(c.n, 0) desc, coalesce(r.n, 0) desc limit 60) y), '[]'::jsonb),
    'puladas', coalesce((select jsonb_agg(jsonb_build_object('id', k.id_questao, 'vistas', k.vistas, 'puladas', k.puladas) order by k.puladas::float / greatest(k.vistas, 1) desc)
        from (select * from public.shorts_contagem where vistas >= 10 order by puladas::float / greatest(vistas, 1) desc limit 20) k), '[]'::jsonb)
  );
end $$;
revoke all on function public.shorts_painel_admin() from public, anon;
grant execute on function public.shorts_painel_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
