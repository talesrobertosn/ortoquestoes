-- Parte 31 (18/10/2026): e-mails, os dados que faltavam ao motor e as nove campanhas diárias.
-- Cole no SQL Editor do Supabase e execute. Roda depois da parte 30. Pode rodar de novo.
--
-- O que muda (docs/emails/PLANO.md, seção 8):
-- 1. dados_cartas_interno (e com ela perfil_carta_admin, listar_cartas_admin e dados_carta_usuario)
--    passa a devolver também: cidade, nascimento, ultimo_login, data_prova, prova_cronograma,
--    dias_para_prova (do cronograma), resumos_lidos e resumos_titulos (Biblioteca). Só chaves novas
--    no jsonb: nenhum tipo de retorno muda, nada do que já vinha some.
-- 2. emails_enviados ganha um índice único (id_usuario, referencia) para as cartas com referência
--    (tipo = 'carta'), para dois envios automáticos iguais não saírem. Antes, uma limpeza das
--    duplicatas que já existirem: fica a mais antiga enviada; as outras que falharam são apagadas e
--    as que saíram de verdade ficam no histórico com a referência marcada ("#duplicada:<id>").
-- 3. A cadência no banco ignora os transacionais (pix_hoje, pagamento_aprovado, obrigado_tempo,
--    relato_resolvido, alerta_admin), como TIPOS_TRANSACIONAIS em cartas.ts: emails_48h e o novo
--    emails_14d de dados_carta_envio, e as campanhas abaixo.
-- 4. biblioteca_catalogo: os resumos publicados, lidos de biblioteca/indice.json pela função
--    enviar-email (registrar_catalogo_biblioteca). O índice não tem data de publicação: o que já
--    existe na primeira leitura fica sem data (não é "novo"); cada resumo que aparecer depois entra
--    com a data em que foi visto pela primeira vez.
-- 5. Nove RPCs de candidatas (só service_role), uma por campanha: candidatos_assinou_sem_cronograma,
--    candidatos_assinante_parado_7, candidatos_simulado_resultado, candidatos_vespera_prova,
--    candidatos_depois_prova, candidatos_aniversario, candidatos_um_ano,
--    candidatos_indicacao_deu_certo e candidatos_resumo_do_tema. Todas devolvem
--    (id_usuario, referencia, dados) e já tiram: e-mail não confirmado, administrador, quem desligou
--    as cartas (ou tudo), quem já recebeu a mesma referência e quem está no teto de cadência.
-- 6. O agendamento (pg_cron) NÃO está aqui: fica em sql-202610181200-parte31-agendamento.sql, porque
--    precisa da URL do projeto e do segredo EMAIL_SEGREDO.
-- Segurança: as funções que leem tabelas são security definer com search_path vazio; as internas não são
-- executáveis por anon nem authenticated; as de candidatas e o catálogo, só por service_role.
begin;

-- 1. Transacional e cadência --------------------------------------------------
-- Os mesmos tipos de TIPOS_TRANSACIONAIS (cartas.ts): o tipo do registro ou a família do modelo
-- (as cartas automáticas gravam tipo = 'carta' e modelo = <tipo>).
create or replace function public.email_transacional_interno(p_tipo text, p_modelo text)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(p_tipo, '') in ('pix_hoje', 'pagamento_aprovado', 'obrigado_tempo', 'relato_resolvido', 'alerta_admin')
      or split_part(coalesce(p_modelo, ''), ':', 1) in ('pix_hoje', 'pagamento_aprovado', 'obrigado_tempo', 'relato_resolvido', 'alerta_admin');
$$;
revoke all on function public.email_transacional_interno(text, text) from public, anon, authenticated;

-- Teto de cadência (cadenciaBloqueia em cartas.ts): nenhum e-mail não transacional nas últimas
-- 48 horas e menos de 3 nos últimos 14 dias. Falha não conta.
create or replace function public.cadencia_livre_interno(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  with recentes as (
    select e.enviado_em from public.emails_enviados e
    where e.id_usuario = p_id and e.status in ('enviado', 'enviando')
      and e.enviado_em > now() - interval '14 days'
      and not public.email_transacional_interno(e.tipo, e.modelo)
  )
  select not exists (select 1 from recentes r where r.enviado_em > now() - interval '48 hours')
     and (select count(*) from recentes) < 3;
$$;
revoke all on function public.cadencia_livre_interno(uuid) from public, anon, authenticated;

-- Travas comuns das campanhas: e-mail confirmado, não é administrador, quer cartas (e não
-- desligou tudo: quer_cartas_interno), não recebeu esta referência e a cadência permite.
create or replace function public.campanha_elegivel_interno(p_id uuid, p_referencia text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u where u.id = p_id and u.email is not null and u.email_confirmed_at is not null)
     and not exists (select 1 from public.administradores a where a.id_usuario = p_id)
     and public.quer_cartas_interno(p_id)
     and not exists (select 1 from public.emails_enviados e where e.id_usuario = p_id and e.referencia = p_referencia
                     and e.status in ('enviado', 'enviando'))
     and public.cadencia_livre_interno(p_id);
$$;
revoke all on function public.campanha_elegivel_interno(uuid, text) from public, anon, authenticated;

-- 2. Catálogo da Biblioteca ----------------------------------------------------
create table if not exists public.biblioteca_catalogo (
  id_capitulo text primary key check (id_capitulo ~ '^[a-z0-9-]{3,80}$'),
  titulo text not null check (char_length(titulo) between 2 and 160),
  especialidade text check (especialidade is null or char_length(especialidade) <= 40),
  -- null: já estava publicado quando o acompanhamento começou (não conta como novo).
  publicado_em timestamptz,
  visto_em timestamptz not null default now()
);
alter table public.biblioteca_catalogo enable row level security;
revoke all on public.biblioteca_catalogo from public, anon, authenticated;

-- A função enviar-email manda o que está em biblioteca/indice.json: [{id, titulo, especialidade}].
-- Devolve quantos resumos novos entraram.
create or replace function public.registrar_catalogo_biblioteca(p_capitulos jsonb)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare
  v_primeira boolean := not exists (select 1 from public.biblioteca_catalogo);
  v_novos integer;
begin
  if jsonb_typeof(p_capitulos) is distinct from 'array' then raise exception 'catalogo_invalido' using errcode = '22023'; end if;
  with entrada as (
    select distinct on (x->>'id') x->>'id' as id, left(btrim(x->>'titulo'), 160) as titulo, nullif(left(btrim(x->>'especialidade'), 40), '') as especialidade
    from jsonb_array_elements(p_capitulos) x
    where jsonb_typeof(x) = 'object' and (x->>'id') ~ '^[a-z0-9-]{3,80}$' and char_length(btrim(coalesce(x->>'titulo', ''))) >= 2
  ),
  gravados as (
    insert into public.biblioteca_catalogo as c (id_capitulo, titulo, especialidade, publicado_em)
    select e.id, e.titulo, e.especialidade, case when v_primeira then null else now() end from entrada e
    on conflict (id_capitulo) do update set titulo = excluded.titulo, especialidade = excluded.especialidade
    returning (xmax = 0) as inserido
  )
  select count(*) filter (where inserido) into v_novos from gravados;
  return case when v_primeira then 0 else v_novos end;
end $$;
revoke all on function public.registrar_catalogo_biblioteca(jsonb) from public, anon, authenticated;
grant execute on function public.registrar_catalogo_biblioteca(jsonb) to service_role;

-- 3. O que o motor precisa de cada pessoa (parte 27 + os campos da parte 31) ------
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
      select r.usuario_id, r.posicao from public.calcular_ranking_interno('geral') r where r.usuario_id = any(p_ids)
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

-- 4. Travas antes de enviar: emails_48h sem os transacionais, e emails_14d (novo) --
create or replace function public.dados_carta_envio(p_id uuid, p_modelo text)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'email', u.email::text,
    'nome', nullif(btrim(u.raw_user_meta_data->>'nome'), ''),
    'confirmado', u.email_confirmed_at is not null,
    'novidades', lower(coalesce(u.raw_user_meta_data->>'receber_novidades', '')) = 'true',
    'administrador', exists (select 1 from public.administradores a where a.id_usuario = u.id),
    'assinante', public.motivo_premium_interno(u.id) in ('assinatura', 'cortesia', 'administrador'),
    'quer_cartas', public.quer_cartas_interno(u.id),
    -- Mesmo tipo de carta nos últimos 30 dias (todos os convites contam como um tipo só).
    'mesmo_tipo_30d', exists (select 1 from public.emails_enviados e where e.id_usuario = u.id and e.tipo = 'carta'
                               and e.status in ('enviado', 'enviando') and e.enviado_em > now() - interval '30 days'
                               and (split_part(coalesce(e.modelo, ''), ':', 1) = split_part(coalesce(p_modelo, ''), ':', 1)
                                    or (e.modelo like 'convite%' and p_modelo like 'convite%'))),
    -- Cadência (parte 31): os transacionais ficam de fora, como em cartas.ts.
    'emails_48h', (select count(*) from public.emails_enviados e where e.id_usuario = u.id
                   and not public.email_transacional_interno(e.tipo, e.modelo)
                   and e.status in ('enviado', 'enviando') and e.enviado_em > now() - interval '48 hours'),
    'emails_14d', (select count(*) from public.emails_enviados e where e.id_usuario = u.id
                   and not public.email_transacional_interno(e.tipo, e.modelo)
                   and e.status in ('enviado', 'enviando') and e.enviado_em > now() - interval '14 days')
  )
  from auth.users u where u.id = p_id;
$$;
revoke all on function public.dados_carta_envio(uuid, text) from public, anon, authenticated;
grant execute on function public.dados_carta_envio(uuid, text) to service_role;

-- 5. Uma carta automática por pessoa e referência ----------------------------------
-- Limpeza segura das duplicatas que já existirem (nenhum envio de verdade se perde):
-- fica a primeira enviada (ou, sem nenhuma enviada, a mais antiga); as outras que falharam são
-- apagadas; as outras que saíram ficam no histórico com a referência marcada.
with grupos as (
  select e.id, e.status,
         row_number() over (partition by e.id_usuario, e.referencia
                            order by (e.status = 'enviado') desc, (e.status = 'enviando') desc, e.enviado_em, e.id) as n
  from public.emails_enviados e
  where e.tipo = 'carta' and e.referencia is not null
)
delete from public.emails_enviados e using grupos g where e.id = g.id and g.n > 1 and g.status = 'falhou';

with grupos as (
  select e.id,
         row_number() over (partition by e.id_usuario, e.referencia
                            order by (e.status = 'enviado') desc, (e.status = 'enviando') desc, e.enviado_em, e.id) as n
  from public.emails_enviados e
  where e.tipo = 'carta' and e.referencia is not null
)
update public.emails_enviados e set referencia = e.referencia || '#duplicada:' || e.id
from grupos g where e.id = g.id and g.n > 1;

create unique index if not exists emails_enviados_carta_unica
  on public.emails_enviados (id_usuario, referencia) where tipo = 'carta' and referencia is not null;

-- 6. Campanhas diárias: quem recebe hoje (só service_role) ---------------------------
-- Todas devolvem (id_usuario, referencia, dados). A referência é a que a função enviar-email grava
-- (tipo ou "tipo:sufixo"); dados traz o que a carta usa. p_limite: 1 a 80 (padrão 40).

-- Assinou há 3 dias ou mais (a primeira assinatura, até 30 dias atrás) e não montou o cronograma.
create or replace function public.candidatos_assinou_sem_cronograma(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  with primeira as (
    select s.id_usuario, min(s.criada_em) as desde
    from public.assinaturas s where s.status <> 'pendente'
    group by s.id_usuario
  )
  select p.id_usuario, 'assinou_sem_cronograma', jsonb_build_object('assinou_em', p.desde)
  from primeira p
  where p.desde <= now() - interval '3 days' and p.desde > now() - interval '30 days'
    and public.motivo_premium_interno(p.id_usuario) = 'assinatura'
    and not exists (select 1 from public.planos_estudo pe where pe.usuario_id = p.id_usuario)
    and public.campanha_elegivel_interno(p.id_usuario, 'assinou_sem_cronograma')
  order by p.desde
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;

-- Assinante (pagamento vigente) cuja última resposta foi de 7 a 20 dias atrás. Uma por ausência.
create or replace function public.candidatos_assinante_parado_7(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  with ultima as (
    select p.usuario_id, max(p.atualizado_em) as em
    from public.progresso_usuario p
    where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
    group by p.usuario_id
  ),
  alvo as (
    select u.usuario_id, u.em,
           'assinante_parado_7:' || to_char((u.em at time zone 'America/Sao_Paulo')::date, 'YYYY-MM-DD') as referencia
    from ultima u
    where u.em <= now() - interval '7 days' and u.em > now() - interval '20 days'
  )
  select a.usuario_id, a.referencia, jsonb_build_object('dias_fora', floor(extract(epoch from (now() - a.em)) / 86400)::int)
  from alvo a
  where public.motivo_premium_interno(a.usuario_id) = 'assinatura'
    and public.campanha_elegivel_interno(a.usuario_id, a.referencia)
  order by a.em
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;

-- Resultado do Simulado Nacional: edições que fecharam nos últimos 3 dias, para quem entregou.
-- A posição (entre quem entregou no tempo) só vai para quem tem o plano, como no site.
create or replace function public.candidatos_simulado_resultado(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  with edicoes as (
    select e.edicao, e.titulo from public.simulado_edicoes e
    where e.fecha_em <= now() and e.fecha_em > now() - interval '3 days'
  ),
  entregues as (
    select sp.usuario_id, sp.edicao, ed.titulo, sp.acertos, sp.total, sp.no_tempo, sp.entregue_em,
           case when sp.no_tempo then row_number() over (partition by sp.edicao, sp.no_tempo order by sp.acertos desc, sp.segundos asc, sp.entregue_em asc) end as posicao,
           count(*) filter (where sp.no_tempo) over (partition by sp.edicao) as participantes
    from public.simulado_participacoes sp
    join edicoes ed on ed.edicao = sp.edicao
    where sp.entregue_em is not null
  )
  select x.usuario_id, 'simulado_resultado:' || x.edicao,
         jsonb_build_object('edicao', x.edicao, 'titulo', x.titulo, 'acertos', x.acertos, 'total', x.total,
                            'posicao', case when public.motivo_premium_interno(x.usuario_id) in ('assinatura', 'cortesia') then x.posicao end,
                            'participantes', x.participantes)
  from entregues x
  where public.campanha_elegivel_interno(x.usuario_id, 'simulado_resultado:' || x.edicao)
  order by x.entregue_em
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;

-- Véspera da prova do cronograma (amanhã, em Brasília). Uma por data.
create or replace function public.candidatos_vespera_prova(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  select pe.usuario_id, 'vespera_prova:' || to_char(pe.data_prova, 'YYYY-MM-DD'),
         jsonb_build_object('data_prova', pe.data_prova, 'prova', pe.prova)
  from public.planos_estudo pe
  where pe.data_prova = (now() at time zone 'America/Sao_Paulo')::date + 1
    and public.campanha_elegivel_interno(pe.usuario_id, 'vespera_prova:' || to_char(pe.data_prova, 'YYYY-MM-DD'))
  order by pe.usuario_id
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;

-- Depois da prova: a data do cronograma foi de 1 a 3 dias atrás. Uma por data.
create or replace function public.candidatos_depois_prova(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  select pe.usuario_id, 'depois_prova:' || to_char(pe.data_prova, 'YYYY-MM-DD'),
         jsonb_build_object('data_prova', pe.data_prova, 'prova', pe.prova,
                            'dias_depois', (now() at time zone 'America/Sao_Paulo')::date - pe.data_prova)
  from public.planos_estudo pe
  where pe.data_prova between (now() at time zone 'America/Sao_Paulo')::date - 3 and (now() at time zone 'America/Sao_Paulo')::date - 1
    and public.campanha_elegivel_interno(pe.usuario_id, 'depois_prova:' || to_char(pe.data_prova, 'YYYY-MM-DD'))
  order by pe.data_prova desc, pe.usuario_id
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;

-- Aniversário hoje (data de nascimento do cadastro, "AAAA-MM-DD"). 29/2 sai em 28/2 nos anos comuns.
create or replace function public.candidatos_aniversario(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  with hoje as (
    select d, to_char(d, 'MM-DD') as md, extract(day from (make_date(extract(year from d)::int, 3, 1) - 1))::int = 29 as bissexto
    from (select (now() at time zone 'America/Sao_Paulo')::date as d) x
  )
  select u.id, 'aniversario:' || extract(year from h.d)::int, '{}'::jsonb
  from auth.users u, hoje h
  where (u.raw_user_meta_data->>'nascimento') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    and (substr(u.raw_user_meta_data->>'nascimento', 6, 5) = h.md
         or (substr(u.raw_user_meta_data->>'nascimento', 6, 5) = '02-29' and h.md = '02-28' and not h.bissexto))
    and public.campanha_elegivel_interno(u.id, 'aniversario:' || extract(year from h.d)::int)
  order by u.created_at
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;

-- Um ano (ou mais) de Orto Questões: a conta faz N anos hoje e já respondeu alguma questão.
create or replace function public.candidatos_um_ano(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  with hoje as (
    select d, to_char(d, 'MM-DD') as md, extract(day from (make_date(extract(year from d)::int, 3, 1) - 1))::int = 29 as bissexto
    from (select (now() at time zone 'America/Sao_Paulo')::date as d) x
  ),
  contas as (
    select u.id, (u.created_at at time zone 'America/Sao_Paulo')::date as criada, u.created_at
    from auth.users u
  ),
  alvo as (
    select c.id, c.created_at, extract(year from age(h.d, c.criada))::int as anos
    from contas c, hoje h
    where (to_char(c.criada, 'MM-DD') = h.md or (to_char(c.criada, 'MM-DD') = '02-29' and h.md = '02-28' and not h.bissexto))
      and c.criada < h.d
  )
  select a.id, 'um_ano:' || a.anos, jsonb_build_object('anos', a.anos)
  from alvo a
  where a.anos >= 1
    and exists (select 1 from public.progresso_usuario p where p.usuario_id = a.id and p.tipo = 'respondidas' and p.valor <> 'null'::jsonb)
    and public.campanha_elegivel_interno(a.id, 'um_ano:' || a.anos)
  order by a.created_at
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;

-- Sua indicação deu certo: o convidado chegou a 20 questões (indicação confirmada nos últimos 14 dias,
-- ou ainda não confirmada, de até 90 dias, com 20 respondidas). Vai para quem indicou, uma por amigo.
-- "cortesia": os 7 dias de quem indicou ainda contam (até 12 amigos confirmados).
create or replace function public.candidatos_indicacao_deu_certo(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  with alvo as (
    select i.id_padrinho, i.id_convidado, i.confirmada_em, i.dias_padrinho, coalesce(i.confirmada_em, i.criado_em) as em,
           'indicacao_deu_certo:' || i.id_convidado::text as referencia
    from public.indicacoes i
    where (i.confirmada_em is not null and i.confirmada_em > now() - interval '14 days')
       or (i.confirmada_em is null and i.criado_em > now() - interval '90 days' and public.respondidas_interno(i.id_convidado) >= 20)
  )
  select a.id_padrinho, a.referencia,
         jsonb_build_object('confirmada', a.confirmada_em is not null,
                            'cortesia', case when a.confirmada_em is not null then a.dias_padrinho > 0
                                             else (select count(*) from public.indicacoes j where j.id_padrinho = a.id_padrinho and j.confirmada_em is not null) < 12 end)
  from alvo a
  where public.campanha_elegivel_interno(a.id_padrinho, a.referencia)
  order by a.em
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;

-- Saiu um resumo do seu tema (no máximo um por semana): um resumo publicado nos últimos 7 dias na
-- área em que a pessoa mais respondeu (10 questões ou mais), que ela ainda não abriu. Só quem aceitou
-- receber novidades (Termos 14.3). A semana é a ISO de Brasília.
create or replace function public.candidatos_resumo_do_tema(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  with semana as (
    select 'resumo_do_tema:' || to_char((now() at time zone 'America/Sao_Paulo')::date, 'IYYY-"s"IW') as referencia
  ),
  novos as (
    select c.* from public.biblioteca_catalogo c
    where c.publicado_em > now() - interval '7 days' and c.especialidade is not null
  ),
  -- Quem respondeu alguma questão na área de um resumo novo; depois, as áreas dessas pessoas.
  interessados as (
    select distinct p.usuario_id from public.progresso_usuario p
    where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
      and regexp_replace(regexp_replace(p.item, '^r[0-9]+:', ''), '-[0-9]+$', '') in (select n.especialidade from novos n)
  ),
  por_area as (
    select p.usuario_id, regexp_replace(regexp_replace(p.item, '^r[0-9]+:', ''), '-[0-9]+$', '') as area, count(*) as n
    from public.progresso_usuario p
    where p.usuario_id in (select i.usuario_id from interessados i) and p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
    group by 1, 2
  ),
  -- A área do resumo novo tem de ser a mais estudada da pessoa (empate conta), com 10 questões ou mais.
  topo as (
    select a.usuario_id, a.area from por_area a
    where a.n >= 10 and a.n = (select max(b.n) from por_area b where b.usuario_id = a.usuario_id)
  ),
  escolha as (
    select distinct on (t.usuario_id) t.usuario_id, n.id_capitulo, n.titulo, n.especialidade, n.publicado_em
    from topo t
    join novos n on n.especialidade = t.area
    where not exists (select 1 from public.progresso_usuario l where l.usuario_id = t.usuario_id and l.tipo = 'biblioteca'
                      and l.item = 'l.' || n.id_capitulo and l.valor <> 'null'::jsonb)
    order by t.usuario_id, n.publicado_em desc, n.id_capitulo
  )
  select e.usuario_id, s.referencia, jsonb_build_object('id', e.id_capitulo, 'titulo', e.titulo, 'especialidade', e.especialidade)
  from escolha e, semana s
  where exists (select 1 from auth.users u where u.id = e.usuario_id and lower(coalesce(u.raw_user_meta_data->>'receber_novidades', '')) = 'true')
    and public.campanha_elegivel_interno(e.usuario_id, s.referencia)
  order by e.publicado_em desc, e.usuario_id
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;

do $$
declare f text;
begin
  foreach f in array array['candidatos_assinou_sem_cronograma', 'candidatos_assinante_parado_7', 'candidatos_simulado_resultado',
                           'candidatos_vespera_prova', 'candidatos_depois_prova', 'candidatos_aniversario', 'candidatos_um_ano',
                           'candidatos_indicacao_deu_certo', 'candidatos_resumo_do_tema'] loop
    execute format('revoke all on function public.%I(integer) from public, anon, authenticated', f);
    execute format('grant execute on function public.%I(integer) to service_role', f);
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
