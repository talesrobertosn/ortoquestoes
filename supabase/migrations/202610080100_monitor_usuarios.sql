-- Monitor de usuários no painel do administrador (08/10/2026).
--
--   1. sessoes_aparelho ganha a página e a questão que a pessoa tem abertas agora.
--   2. visitas_usuario: histórico de páginas e questões vistas (30 dias, depois some).
--   3. sinal_aparelho(p_aparelho, p_pagina, p_questao): o sinal de sempre, levando junto
--      a página. A versão antiga, só com p_aparelho, continua valendo para abas abertas
--      antes da atualização.
--   4. listar_usuarios_admin passa a trazer, no fim: questões e tentativas de hoje,
--      página, questão e horário do último sinal.
--   5. atividade_usuario_admin(p_id): questões por dia (30 dias), horários de estudo,
--      páginas vistas, o que está aberto agora e dados do cadastro (nascimento,
--      WhatsApp, confirmação do e-mail, último login, Google ou e-mail).
--
-- Roda depois da 202610070100. Aditiva: não altera nem apaga dados existentes.
begin;

alter table public.sessoes_aparelho
  add column if not exists pagina text check (pagina is null or char_length(pagina) <= 120),
  add column if not exists questao text check (questao is null or questao ~ '^[a-z0-9-]{3,80}$'),
  add column if not exists pagina_em timestamptz;

create table if not exists public.visitas_usuario (
  id bigserial primary key,
  id_usuario uuid not null references auth.users(id) on delete cascade,
  pagina text not null check (char_length(pagina) <= 120),
  questao text check (questao is null or questao ~ '^[a-z0-9-]{3,80}$'),
  em timestamptz not null default now()
);
create index if not exists visitas_usuario_quem_idx on public.visitas_usuario (id_usuario, em desc);
create index if not exists visitas_usuario_em_idx on public.visitas_usuario (em);
alter table public.visitas_usuario enable row level security;
revoke all on public.visitas_usuario from public, anon, authenticated;
revoke all on sequence public.visitas_usuario_id_seq from public, anon, authenticated;
-- Sem policy: só as funções abaixo leem e escrevem.

create or replace function public.sinal_aparelho(p_aparelho text, p_pagina text, p_questao text)
returns table (ativo boolean, outro_aparelho text)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_linha public.sessoes_aparelho%rowtype;
  v_pagina text := left(nullif(btrim(p_pagina), ''), 120);
  v_questao text := case when p_questao ~ '^[a-z0-9-]{3,80}$' then p_questao end;
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select * into v_linha from public.sessoes_aparelho s where s.id_usuario = auth.uid();
  if not found then
    insert into public.sessoes_aparelho (id_usuario, aparelho, pagina, questao, pagina_em)
    values (auth.uid(), p_aparelho, v_pagina, v_questao, now())
    on conflict (id_usuario) do nothing;
    if v_pagina is not null then insert into public.visitas_usuario (id_usuario, pagina, questao) values (auth.uid(), v_pagina, v_questao); end if;
    return query select true, null::text;
    return;
  end if;
  if v_linha.aparelho <> p_aparelho then
    return query select false, v_linha.descricao;
    return;
  end if;
  if v_pagina is not null and (v_pagina is distinct from v_linha.pagina or v_questao is distinct from v_linha.questao) then
    update public.sessoes_aparelho s set visto_em = now(), pagina = v_pagina, questao = v_questao, pagina_em = now() where s.id_usuario = auth.uid();
    insert into public.visitas_usuario (id_usuario, pagina, questao) values (auth.uid(), v_pagina, v_questao);
    -- Limpeza de vez em quando: o histórico guarda só os últimos 30 dias.
    if random() < 0.02 then delete from public.visitas_usuario v where v.em < now() - interval '30 days'; end if;
  else
    update public.sessoes_aparelho s set visto_em = now() where s.id_usuario = auth.uid();
  end if;
  return query select true, null::text;
end $$;
revoke all on function public.sinal_aparelho(text, text, text) from public, anon, authenticated;
grant execute on function public.sinal_aparelho(text, text, text) to authenticated;

drop function if exists public.listar_usuarios_admin();
create function public.listar_usuarios_admin()
returns table (
  id_usuario uuid, email text, nome text,
  criado_em timestamptz, ultimo_login timestamptz, ultima_atividade timestamptz,
  respondidas bigint, acertos bigint, erros bigint, respondidas_7d bigint,
  plano_vigente text, administrador boolean,
  online boolean, aparelho text,
  situacao text, servico text, cidade text, uf text,
  ano_residencia text, provas text,
  acertos_primeira bigint, erros_primeira bigint, acertos_tentativas bigint, erros_tentativas bigint,
  origem jsonb,
  respondidas_hoje bigint, tentativas_hoje bigint,
  pagina text, questao text, pagina_em timestamptz, visto_em timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  -- Meia-noite de hoje no horário de Brasília, como instante.
  v_hoje timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  perform public.exigir_administrador();
  return query
    with epocas as (
      select p.usuario_id, max(p.versao) as epoca
      from public.progresso_usuario p
      where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
      group by p.usuario_id
    ),
    validas as (
      select p.usuario_id, p.valor->>'c' as c, p.atualizado_em,
             -- Primeira resposta da questão: o primeiro evento do histórico (ou a única resposta).
             coalesce(p.valor->'historico'->0->>'correta', p.valor->>'c') as primeira,
             -- Todas as tentativas, como a pessoa vê no Desempenho (registros antigos: só a atual).
             coalesce((p.valor->>'acertos')::int, case when p.valor->>'c' = 'true' then 1 else 0 end) as t_acertos,
             coalesce((p.valor->>'erros')::int, case when p.valor->>'c' = 'false' then 1 else 0 end) as t_erros,
             -- Tentativas de hoje: eventos do histórico com data de hoje; registro sem histórico conta 1 se mudou hoje.
             case when jsonb_typeof(p.valor->'historico') = 'array' and jsonb_array_length(p.valor->'historico') > 0
                  then (select count(*) from jsonb_array_elements(p.valor->'historico') h
                        where jsonb_typeof(h->'em') = 'number' and to_timestamp((h->>'em')::double precision / 1000) >= v_hoje)
                  else case when p.atualizado_em >= v_hoje then 1 else 0 end end as hoje
      from public.progresso_usuario p
      left join epocas e on e.usuario_id = p.usuario_id
      where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
        and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
    ),
    por_usuario as (
      select v.usuario_id,
             count(*) as respondidas,
             count(*) filter (where v.c = 'true') as acertos,
             count(*) filter (where v.c = 'false') as erros,
             count(*) filter (where v.atualizado_em >= now() - interval '7 days') as respondidas_7d,
             max(v.atualizado_em) as ultima_atividade,
             count(*) filter (where v.primeira = 'true') as acertos_primeira,
             count(*) filter (where v.primeira = 'false') as erros_primeira,
             sum(v.t_acertos) as acertos_tentativas,
             sum(v.t_erros) as erros_tentativas,
             count(*) filter (where v.hoje > 0) as respondidas_hoje,
             sum(v.hoje) as tentativas_hoje
      from validas v
      group by v.usuario_id
    ),
    vigentes as (
      select distinct on (s.id_usuario) s.id_usuario, s.plano
      from public.assinaturas s
      where (s.status = 'ativa' or (s.status = 'cancelada' and s.cancelar_ao_fim))
        and coalesce(s.fim_periodo, 'infinity') > now()
      order by s.id_usuario, s.atualizada_em desc
    )
    select u.id, u.email::text,
           nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), ''),
           u.created_at, u.last_sign_in_at, pu.ultima_atividade,
           coalesce(pu.respondidas, 0), coalesce(pu.acertos, 0), coalesce(pu.erros, 0),
           coalesce(pu.respondidas_7d, 0),
           vg.plano,
           exists (select 1 from public.administradores adm where adm.id_usuario = u.id),
           coalesce(sa.visto_em >= now() - interval '3 minutes', false),
           sa.descricao,
           nullif(btrim(u.raw_user_meta_data->>'situacao'), ''),
           nullif(btrim(u.raw_user_meta_data->>'servico'), ''),
           nullif(btrim(u.raw_user_meta_data->>'cidade'), ''),
           nullif(btrim(u.raw_user_meta_data->>'uf'), ''),
           nullif(btrim(u.raw_user_meta_data->>'ano_residencia'), ''),
           -- Lista de provas (jsonb array) vira texto separado por vírgula.
           case when jsonb_typeof(u.raw_user_meta_data->'provas_interesse') = 'array'
                then nullif((select string_agg(x, ',') from jsonb_array_elements_text(u.raw_user_meta_data->'provas_interesse') x), '')
                else nullif(btrim(u.raw_user_meta_data->>'provas_interesse'), '') end,
           coalesce(pu.acertos_primeira, 0), coalesce(pu.erros_primeira, 0),
           coalesce(pu.acertos_tentativas, 0)::bigint, coalesce(pu.erros_tentativas, 0)::bigint,
           case when jsonb_typeof(u.raw_user_meta_data->'origem') = 'object' then u.raw_user_meta_data->'origem' end,
           coalesce(pu.respondidas_hoje, 0)::bigint, coalesce(pu.tentativas_hoje, 0)::bigint,
           sa.pagina, sa.questao, sa.pagina_em, sa.visto_em
    from auth.users u
    left join por_usuario pu on pu.usuario_id = u.id
    left join vigentes vg on vg.id_usuario = u.id
    left join public.sessoes_aparelho sa on sa.id_usuario = u.id
    order by coalesce(pu.respondidas, 0) desc, u.created_at asc;
end $$;
revoke all on function public.listar_usuarios_admin() from public, anon, authenticated;
grant execute on function public.listar_usuarios_admin() to authenticated;

create or replace function public.atividade_usuario_admin(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inicio date := (now() at time zone 'America/Sao_Paulo')::date - 29;
  v jsonb;
begin
  perform public.exigir_administrador();
  with epoca as (
    select coalesce(max(p.versao), 0) as n from public.progresso_usuario p
    where p.usuario_id = p_id and p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
  ),
  validas as (
    select p.item, p.valor, p.atualizado_em
    from public.progresso_usuario p, epoca e
    where p.usuario_id = p_id and p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
      and (e.n = 0 or p.item like ('r' || e.n || ':%'))
  ),
  eventos as (
    select v.item, h->>'correta' as correta,
           to_timestamp((h->>'em')::double precision / 1000) at time zone 'America/Sao_Paulo' as quando
    from validas v
    cross join lateral jsonb_array_elements(case when jsonb_typeof(v.valor->'historico') = 'array' then v.valor->'historico' else '[]'::jsonb end) h
    where jsonb_typeof(h->'em') = 'number'
    union all
    select v.item, v.valor->>'c', v.atualizado_em at time zone 'America/Sao_Paulo'
    from validas v
    where jsonb_typeof(v.valor->'historico') is distinct from 'array' or jsonb_array_length(v.valor->'historico') = 0
  ),
  recentes as (select * from eventos where quando::date >= v_inicio),
  dias as (
    select quando::date as dia, count(*) as tentativas, count(distinct item) as questoes,
           count(*) filter (where correta = 'true') as acertos
    from recentes group by 1
  ),
  horas as (select extract(hour from quando)::int as hora, count(*) as n from recentes group by 1)
  select jsonb_build_object(
    'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', d.dia, 'tentativas', d.tentativas, 'questoes', d.questoes, 'acertos', d.acertos) order by d.dia) from dias d), '[]'::jsonb),
    'horas', coalesce((select jsonb_agg(jsonb_build_object('hora', h.hora, 'n', h.n) order by h.hora) from horas h), '[]'::jsonb),
    'visitas', coalesce((select jsonb_agg(jsonb_build_object('pagina', x.pagina, 'questao', x.questao, 'em', x.em) order by x.em desc)
                         from (select vu.pagina, vu.questao, vu.em from public.visitas_usuario vu where vu.id_usuario = p_id order by vu.em desc limit 80) x), '[]'::jsonb),
    'conta', (select jsonb_build_object('nascimento', u.raw_user_meta_data->>'nascimento', 'whatsapp', u.raw_user_meta_data->>'whatsapp',
                                        'novidades', u.raw_user_meta_data->'receber_novidades', 'confirmado_em', u.email_confirmed_at,
                                        'ultimo_login', u.last_sign_in_at, 'provedor', u.raw_app_meta_data->>'provider')
              from auth.users u where u.id = p_id),
    'agora', (select jsonb_build_object('pagina', s.pagina, 'questao', s.questao, 'pagina_em', s.pagina_em, 'visto_em', s.visto_em,
                                        'online', s.visto_em >= now() - interval '3 minutes')
              from public.sessoes_aparelho s where s.id_usuario = p_id)
  ) into v;
  return v;
end $$;
revoke all on function public.atividade_usuario_admin(uuid) from public, anon, authenticated;
grant execute on function public.atividade_usuario_admin(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
