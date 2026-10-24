-- Desempenho do banco (21/10/2026). O CPU do projeto ficou perto de 100% e o envio de e-mails
-- (Edge Function enviar-email) dava "statement timeout" em dados_email_usuario e dados_carta_usuario.
--
-- Causa: respostas_validas_interno() e eventos_resposta_interno() são security definer, então o
-- Postgres não leva o filtro "usuario_id = p_id" para dentro delas: cada chamada lia as respostas de
-- TODAS as pessoas. dados_email_usuario fazia isso cinco vezes por e-mail; os relatórios, duas.
-- dados_cartas_interno recalculava o ranking inteiro a cada carta.
--
-- Correção (só cria e troca funções, mesmas assinaturas e mesmos resultados; pode rodar de novo):
-- 1. respostas_validas_usuario(p_id) e eventos_resposta_usuario(p_id): a mesma regra, para uma pessoa,
--    usando a chave primária (usuario_id, tipo, item) de progresso_usuario.
-- 2. dados_email_usuario, dados_relatorio_mensal e dados_relatorio_periodo passam a usá-las.
-- 3. dados_cartas_interno lê a posição do ranking em ranking_posicoes_diarias (último registro de até
--    7 dias) em vez de recalcular o ranking.
begin;

create or replace function public.respostas_validas_usuario(p_id uuid)
returns table (usuario_id uuid, id_questao text, c text, primeira text, eventos jsonb, q double precision, atualizado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  with epoca as (
    select max(p.versao) as epoca
    from public.progresso_usuario p
    where p.usuario_id = p_id and p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
  )
  select p.usuario_id,
         regexp_replace(p.item, '^r[0-9]+:', ''),
         p.valor->>'c',
         coalesce(p.valor->'historico'->0->>'correta', p.valor->>'c'),
         case when jsonb_typeof(p.valor->'historico') = 'array' then p.valor->'historico' else '[]'::jsonb end,
         (p.valor->>'q')::double precision,
         p.atualizado_em
  from public.progresso_usuario p, epoca e
  where p.usuario_id = p_id and p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
    and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'));
$$;
revoke all on function public.respostas_validas_usuario(uuid) from public, anon, authenticated;

create or replace function public.eventos_resposta_usuario(p_id uuid)
returns table (usuario_id uuid, em timestamptz)
language sql stable security definer set search_path = '' as $$
  with r as materialized (select * from public.respostas_validas_usuario(p_id))
  select r.usuario_id, to_timestamp((ev->>'em')::double precision / 1000)
  from r, jsonb_array_elements(r.eventos) ev
  where ev ? 'em'
  union all
  select r.usuario_id, to_timestamp(r.q / 1000)
  from r
  where jsonb_array_length(r.eventos) = 0 and r.q is not null;
$$;
revoke all on function public.eventos_resposta_usuario(uuid) from public, anon, authenticated;

create or replace function public.dados_email_usuario(p_id uuid)
returns table (email text, nome text, respondidas bigint, acertos bigint, erros bigint, respondidas_7d bigint, dias_de_conta integer, quer_conquistas boolean)
language sql stable security definer set search_path = '' as $$
  select u.email::text,
         nullif(btrim(u.raw_user_meta_data->>'nome'), ''),
         (select count(*) from public.respostas_validas_usuario(p_id) r where r.usuario_id = p_id),
         (select count(*) from public.respostas_validas_usuario(p_id) r where r.usuario_id = p_id and r.c = 'true'),
         (select count(*) from public.respostas_validas_usuario(p_id) r where r.usuario_id = p_id and r.c = 'false'),
         (select count(*) from public.eventos_resposta_usuario(p_id) e where e.usuario_id = p_id and e.em >= now() - interval '7 days'),
         greatest(0, extract(day from now() - u.created_at)::integer),
         coalesce((select pe.conquistas from public.preferencias_email pe where pe.id_usuario = p_id), true)
  from auth.users u where u.id = p_id;
$$;
revoke all on function public.dados_email_usuario(uuid) from public, anon, authenticated;
grant execute on function public.dados_email_usuario(uuid) to service_role;

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
    from public.respostas_validas_usuario(p_id) r, jsonb_array_elements(r.eventos) ev
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
    'total_acumulado', (select count(*) from public.respostas_validas_usuario(p_id) r where r.usuario_id = p_id),
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

create or replace function public.dados_relatorio_periodo(p_id uuid, p_inicio date, p_fim date, p_ref text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_inicio timestamptz := (p_inicio::timestamp at time zone 'America/Sao_Paulo');
  v_fim timestamptz := (p_fim::timestamp at time zone 'America/Sao_Paulo');
  v_ant timestamptz := ((p_inicio - (p_fim - p_inicio))::timestamp at time zone 'America/Sao_Paulo');
  v jsonb;
begin
  with eventos as (
    select regexp_replace(r.id_questao, '-[0-9]+$', '') as tema,
           to_timestamp((ev->>'em')::double precision / 1000) as em,
           ev->>'correta' as correta
    from public.respostas_validas_usuario(p_id) r, jsonb_array_elements(r.eventos) ev
    where r.usuario_id = p_id and ev ? 'em'
  ),
  periodo as (select * from eventos e where e.em >= v_inicio and e.em < v_fim),
  anterior as (select * from eventos e where e.em >= v_ant and e.em < v_inicio)
  select jsonb_build_object(
    'email', (select u.email from auth.users u where u.id = p_id),
    'nome', (select nullif(btrim(u.raw_user_meta_data->>'nome'), '') from auth.users u where u.id = p_id),
    'mes', p_ref,
    'respostas', (select count(*) from periodo),
    'certas', (select count(*) from periodo where correta = 'true'),
    'erradas', (select count(*) from periodo where correta = 'false'),
    'dias_ativos', (select count(distinct (em at time zone 'America/Sao_Paulo')::date) from periodo),
    'respostas_anterior', (select count(*) from anterior),
    'certas_anterior', (select count(*) from anterior where correta = 'true'),
    'erradas_anterior', (select count(*) from anterior where correta = 'false'),
    'total_acumulado', (select count(*) from public.respostas_validas_usuario(p_id) r where r.usuario_id = p_id),
    'temas', coalesce((select jsonb_agg(jsonb_build_object('tema', t.tema, 'certas', t.certas, 'total', t.total, 'certas_ant', t.certas_ant, 'total_ant', t.total_ant))
                       from (select coalesce(m.tema, a.tema) as tema, coalesce(m.certas, 0) as certas, coalesce(m.total, 0) as total,
                                    coalesce(a.certas, 0) as certas_ant, coalesce(a.total, 0) as total_ant
                             from (select tema, count(*) filter (where correta = 'true') as certas, count(*) filter (where correta in ('true','false')) as total from periodo group by tema) m
                             full join (select tema, count(*) filter (where correta = 'true') as certas, count(*) filter (where correta in ('true','false')) as total from anterior group by tema) a
                               on a.tema = m.tema) t), '[]'::jsonb),
    'simulado', (select jsonb_build_object('titulo', se.titulo, 'acertos', sp.acertos, 'total', sp.total)
                 from public.simulado_participacoes sp join public.simulado_edicoes se on se.edicao = sp.edicao
                 where sp.usuario_id = p_id and sp.entregue_em >= v_inicio and sp.entregue_em < v_fim
                 order by sp.entregue_em desc limit 1)
  ) into v;
  return v;
end $$;
revoke all on function public.dados_relatorio_periodo(uuid, date, date, text) from public, anon, authenticated;
grant execute on function public.dados_relatorio_periodo(uuid, date, date, text) to service_role;

create or replace function public.dados_cartas_interno(p_ids uuid[])
returns table (id_usuario uuid, dados jsonb)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_tem_fc boolean := to_regclass('public.flashcards_autorizados') is not null;
  v_fc jsonb := '{}'::jsonb;
  v_planos jsonb := '{}'::jsonb;
begin
  -- Tabelas de partes mais novas: se ainda não existirem, o dado só não aparece.
  if v_tem_fc then
    select coalesce(jsonb_object_agg(x.id_usuario::text, x.n), '{}'::jsonb) into v_fc
    from (select a.id_usuario, count(distinct a.id_flashcard) as n from public.flashcards_autorizados a
          where a.id_usuario = any(p_ids) group by a.id_usuario) x;
  end if;
  if to_regclass('public.visitas_usuario') is not null then
    select coalesce(jsonb_object_agg(x.id_usuario::text, x.n), '{}'::jsonb) into v_planos
    from (select v.id_usuario, count(*) as n from public.visitas_usuario v
          where v.id_usuario = any(p_ids) and v.pagina = '/assinatura' and v.em >= now() - interval '30 days'
          group by v.id_usuario) x;
  end if;

  return query
    with epocas as (
      select p.usuario_id, max(p.versao) as epoca
      from public.progresso_usuario p
      where p.usuario_id = any(p_ids) and p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
      group by p.usuario_id
    ),
    validas as (
      select p.usuario_id,
             regexp_replace(regexp_replace(p.item, '^r[0-9]+:', ''), '-[0-9]+$', '') as area,
             p.atualizado_em, p.valor,
             coalesce((p.valor->>'acertos')::int, case when p.valor->>'c' = 'true' then 1 else 0 end) as ta,
             coalesce((p.valor->>'erros')::int, case when p.valor->>'c' = 'false' then 1 else 0 end) as te
      from public.progresso_usuario p
      left join epocas e on e.usuario_id = p.usuario_id
      where p.usuario_id = any(p_ids) and p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
        and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
    ),
    totais as (
      select v.usuario_id, count(*) as respondidas, sum(v.ta) as acertos, sum(v.te) as erros,
             count(*) filter (where v.atualizado_em >= now() - interval '7 days') as semana,
             max(v.atualizado_em) as ultima
      from validas v group by v.usuario_id
    ),
    areas as (
      select a.usuario_id, jsonb_agg(jsonb_build_object('slug', a.area, 'total', a.total, 'certas', a.certas) order by a.total desc) as lista
      from (select v.usuario_id, v.area, count(*) as total,
                   -- Acerto da área como a pessoa vê (todas as tentativas), em "questões certas".
                   round(count(*) * sum(v.ta)::numeric / nullif(sum(v.ta + v.te), 0))::int as certas
            from validas v group by v.usuario_id, v.area) a
      where a.certas is not null
      group by a.usuario_id
    ),
    horas as (
      select h.usuario_id, jsonb_agg(jsonb_build_object('hora', h.hora, 'n', h.n) order by h.hora) as lista
      from (select v.usuario_id,
                   extract(hour from to_timestamp((ev->>'em')::double precision / 1000) at time zone 'America/Sao_Paulo')::int as hora,
                   count(*) as n
            from validas v
            cross join lateral jsonb_array_elements(case when jsonb_typeof(v.valor->'historico') = 'array' then v.valor->'historico' else '[]'::jsonb end) ev
            where jsonb_typeof(ev->'em') = 'number'
              and to_timestamp((ev->>'em')::double precision / 1000) >= now() - interval '60 days'
            group by 1, 2) h
      group by h.usuario_id
    ),
    -- Parte 31: resumos da Biblioteca lidos (concluídos, ou com 95% ou mais, como o site conta "feito").
    leituras as (
      select p.usuario_id, substr(p.item, 3) as capitulo,
             case when jsonb_typeof(p.valor->'em') = 'number' then (p.valor->>'em')::double precision else 0 end as em
      from public.progresso_usuario p
      where p.usuario_id = any(p_ids) and p.tipo = 'biblioteca' and p.item like 'l.%'
        and jsonb_typeof(p.valor) = 'object' and p.valor->>'tipo' = 'leitura'
        and (jsonb_typeof(p.valor->'concluidoEm') = 'number'
             or (jsonb_typeof(p.valor->'progresso') = 'number' and (p.valor->>'progresso')::numeric >= 95))
    ),
    lidos as (
      select l.usuario_id, count(*) as n,
             coalesce(jsonb_agg(c.titulo order by l.em desc) filter (where c.titulo is not null), '[]'::jsonb) as titulos
      from leituras l
      left join public.biblioteca_catalogo c on c.id_capitulo = l.capitulo
      group by l.usuario_id
    ),
    ranking as (
      -- Desempenho (21/10/2026): a última posição registrada (até 7 dias), em vez de recalcular o
      -- ranking de todo mundo a cada carta.
      select distinct on (h.usuario_id) h.usuario_id, h.posicao from public.ranking_posicoes_diarias h
      where h.usuario_id = any(p_ids) and h.periodo = 'geral' and h.dia >= current_date - 7
      order by h.usuario_id, h.dia desc
    ),
    vigentes as (
      select distinct on (s.id_usuario) s.id_usuario, s.plano
      from public.assinaturas s
      where s.id_usuario = any(p_ids)
        and (s.status = 'ativa' or (s.status = 'cancelada' and s.cancelar_ao_fim))
        and coalesce(s.fim_periodo, 'infinity') > now()
      order by s.id_usuario, s.atualizada_em desc
    ),
    envios as (
      select e.*, row_number() over (partition by e.id_usuario order by e.enviado_em desc) as n
      from public.emails_enviados e
      where e.id_usuario = any(p_ids) and e.tipo <> 'alerta_admin'
    ),
    hist as (
      select e.id_usuario,
             count(*) filter (where e.status <> 'falhou' and e.enviado_em > now() - interval '7 days') as n7,
             count(*) filter (where e.status <> 'falhou' and e.enviado_em > now() - interval '30 days') as n30,
             max(e.enviado_em) filter (where e.status <> 'falhou') as ultimo_em,
             coalesce(jsonb_agg(jsonb_build_object(
               'tipo', e.tipo, 'modelo', e.modelo, 'versao', e.versao, 'marco', e.marco, 'assunto', e.assunto,
               'status', e.status, 'erro', left(e.erro, 160), 'origem', public.origem_email_interno(e.tipo, e.origem, e.enviado_por),
               'em', e.enviado_em) order by e.enviado_em desc) filter (where e.n <= 15), '[]'::jsonb) as lista,
             -- Versões e modelos já recebidos (para o sorteio não repetir), mesmo além dos 15 últimos.
             coalesce(jsonb_agg(jsonb_build_object('modelo', e.modelo, 'versao', e.versao, 'tipo', e.tipo, 'marco', e.marco, 'em', e.enviado_em, 'status', e.status))
                      filter (where e.n > 15 and (e.versao is not null or e.tipo = 'marco')), '[]'::jsonb) as antigos
      from envios e group by e.id_usuario
    )
    select u.id, jsonb_build_object(
      'email', u.email::text,
      'nome', nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), ''),
      'criado_em', u.created_at,
      'confirmado', u.email_confirmed_at is not null,
      'novidades', lower(coalesce(u.raw_user_meta_data->>'receber_novidades', '')) = 'true',
      'administrador', exists (select 1 from public.administradores adm where adm.id_usuario = u.id),
      'quer_cartas', public.quer_cartas_interno(u.id),
      'assinante', vg.id_usuario is not null or public.motivo_premium_interno(u.id) in ('cortesia', 'administrador'),
      'plano', vg.plano,
      'respondidas', coalesce(t.respondidas, 0),
      'acertos', coalesce(t.acertos, 0),
      'erros', coalesce(t.erros, 0),
      'semana', coalesce(t.semana, 0),
      'ultima_atividade', t.ultima,
      'dias_parado', case when t.ultima is null then null else floor(extract(epoch from (now() - t.ultima)) / 86400)::int end,
      'dias_conta', greatest(0, floor(extract(epoch from (now() - u.created_at)) / 86400)::int),
      'situacao', nullif(btrim(u.raw_user_meta_data->>'situacao'), ''),
      'ano', nullif(btrim(u.raw_user_meta_data->>'ano_residencia'), ''),
      'servico', nullif(btrim(u.raw_user_meta_data->>'servico'), ''),
      'provas', case when jsonb_typeof(u.raw_user_meta_data->'provas_interesse') = 'array' then u.raw_user_meta_data->'provas_interesse' else '[]'::jsonb end,
      'areas', coalesce(ar.lista, '[]'::jsonb),
      'horas', coalesce(h.lista, '[]'::jsonb),
      'posicao_ranking', rk.posicao,
      'sequencia', case when pp.sequencia_em >= v_hoje - 1 then pp.sequencia_atual end,
      'flashcards', case when v_tem_fc then coalesce((v_fc->>u.id::text)::int, 0) end,
      'viu_planos', coalesce((v_planos->>u.id::text)::int, 0),
      'emails', jsonb_build_object('ultimo_em', hi.ultimo_em, 'n7', coalesce(hi.n7, 0), 'n30', coalesce(hi.n30, 0),
                                   'lista', coalesce(hi.lista, '[]'::jsonb), 'antigos', coalesce(hi.antigos, '[]'::jsonb))
    ) || jsonb_build_object(
      -- Parte 31: cadastro, cronograma, Biblioteca e último login.
      'cidade', nullif(btrim(u.raw_user_meta_data->>'cidade'), ''),
      'nascimento', case when (u.raw_user_meta_data->>'nascimento') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then u.raw_user_meta_data->>'nascimento' end,
      'ultimo_login', u.last_sign_in_at,
      'data_prova', pe.data_prova,
      'prova_cronograma', nullif(btrim(pe.prova), ''),
      'dias_para_prova', case when pe.data_prova >= v_hoje then pe.data_prova - v_hoje end,
      'resumos_lidos', coalesce(li.n, 0),
      'resumos_titulos', coalesce(li.titulos, '[]'::jsonb)
    )
    from auth.users u
    left join totais t on t.usuario_id = u.id
    left join areas ar on ar.usuario_id = u.id
    left join horas h on h.usuario_id = u.id
    left join ranking rk on rk.usuario_id = u.id
    left join vigentes vg on vg.id_usuario = u.id
    left join hist hi on hi.id_usuario = u.id
    left join lidos li on li.usuario_id = u.id
    left join public.perfis_publicos pp on pp.usuario_id = u.id
    left join public.planos_estudo pe on pe.usuario_id = u.id
    where u.id = any(p_ids);
end $$;
revoke all on function public.dados_cartas_interno(uuid[]) from public, anon, authenticated;

commit;
