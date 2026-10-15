-- Parte 25: ficha da pessoa no painel (quem viu os planos, flashcards e locais de trabalho), 15/10/2026.
-- Cole TUDO no SQL Editor do Supabase e clique em Run. Depende das partes 12 (monitor de usuários) e 18/19 (flashcards).
-- Só leitura: não cria tabela nem altera dados. Pode colar mais de uma vez.
-- Enquanto não for colada, o painel continua funcionando: a ficha só não mostra flashcards nem o selo "Viu os planos".

-- Ficha da pessoa no painel: quem olhou os planos, flashcards e locais de trabalho (15/10/2026).
-- Só leitura: as duas funções abaixo não criam tabela, não alteram nem apagam dados, e não
-- passam a coletar nada novo. Tudo sai do que o site já guarda:
--   - visitas_usuario (migração 202610080100, Termos item 5.6): páginas abertas com a conta,
--     por até 30 dias. "Viu os planos" = abriu /assinatura (página de planos e preços);
--     /condicoes-assinatura é o passo seguinte, antes do checkout;
--   - flashcards_autorizados, flashcards_progresso e flashcards_corridas (partes 18 e 19);
--   - os metadados do perfil (situacao, ano_residencia, servico e, agora, locais_trabalho,
--     a lista opcional de outros hospitais ou serviços onde a pessoa trabalha).
--
-- 1. sinais_usuarios_admin(): uma linha por conta que tem algum desses sinais (planos nos
--    últimos 30 dias, flashcards, Cripta ou locais de trabalho). A lista de pessoas usa
--    para o selo "Viu os planos" e o filtro; não pesa como listar_usuarios_admin.
-- 2. ficha_extra_usuario_admin(p_id): para a ficha: perfil, visitas aos planos e o
--    estudo de flashcards (cartas, acerto, dias com flashcards, partidas, andar máximo).
-- As duas exigem administrador (exigir_administrador) e não são executáveis por anon.
-- Roda depois da 202610080100 e das partes 18 e 19 dos flashcards. Pode rodar mais de uma vez.
begin;

drop function if exists public.sinais_usuarios_admin();
create function public.sinais_usuarios_admin()
returns table (
  id_usuario uuid,
  planos_vezes integer, planos_ultima timestamptz, condicoes_ultima timestamptz,
  flashcards_unicos integer, flashcards_7d integer, flashcards_ultima timestamptz,
  cripta_andar integer,
  locais_trabalho text
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    with planos as (
      select v.id_usuario,
             count(*) filter (where v.pagina = '/assinatura')::integer as vezes,
             max(v.em) filter (where v.pagina = '/assinatura') as ultima,
             max(v.em) filter (where v.pagina = '/condicoes-assinatura') as condicoes
      from public.visitas_usuario v
      where v.pagina in ('/assinatura', '/condicoes-assinatura') and v.em >= now() - interval '30 days'
      group by v.id_usuario
    ),
    cartas as (
      select a.id_usuario,
             count(distinct a.id_flashcard)::integer as unicos,
             count(*) filter (where a.criado_em >= now() - interval '7 days')::integer as semana,
             max(a.criado_em) as ultima
      from public.flashcards_autorizados a
      group by a.id_usuario
    ),
    cripta as (
      select c.id_usuario, max(c.andar)::integer as andar
      from public.flashcards_corridas c
      where c.modo = 'masmorra'
      group by c.id_usuario
    ),
    locais as (
      select u.id as id_usuario,
             nullif((select string_agg(btrim(x), ' · ')
                     from jsonb_array_elements_text(u.raw_user_meta_data->'locais_trabalho') x
                     where btrim(x) <> ''), '') as texto
      from auth.users u
      where jsonb_typeof(u.raw_user_meta_data->'locais_trabalho') = 'array'
    )
    select u.id,
           coalesce(p.vezes, 0), p.ultima, p.condicoes,
           coalesce(f.unicos, 0), coalesce(f.semana, 0), f.ultima,
           cr.andar,
           l.texto
    from auth.users u
    left join planos p on p.id_usuario = u.id
    left join cartas f on f.id_usuario = u.id
    left join cripta cr on cr.id_usuario = u.id
    left join locais l on l.id_usuario = u.id
    where p.id_usuario is not null or f.id_usuario is not null or cr.id_usuario is not null or l.texto is not null;
end $$;
revoke all on function public.sinais_usuarios_admin() from public, anon, authenticated;
grant execute on function public.sinais_usuarios_admin() to authenticated;

create or replace function public.ficha_extra_usuario_admin(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_hoje timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_inicio date := (now() at time zone 'America/Sao_Paulo')::date - 29;
  v_perfil jsonb;
  v_planos jsonb;
  v_registros jsonb;
  v_autorizados jsonb;
  v_corridas jsonb;
  v_progresso record;
begin
  perform public.exigir_administrador();

  select jsonb_build_object(
           'situacao', nullif(btrim(u.raw_user_meta_data->>'situacao'), ''),
           'ano_residencia', nullif(btrim(u.raw_user_meta_data->>'ano_residencia'), ''),
           'servico', nullif(btrim(u.raw_user_meta_data->>'servico'), ''),
           'locais_trabalho', case when jsonb_typeof(u.raw_user_meta_data->'locais_trabalho') = 'array'
                                   then u.raw_user_meta_data->'locais_trabalho' else '[]'::jsonb end,
           'provas', case when jsonb_typeof(u.raw_user_meta_data->'provas_interesse') = 'array'
                          then u.raw_user_meta_data->'provas_interesse' else '[]'::jsonb end,
           'perfil_atualizado_em', u.raw_user_meta_data->>'perfil_estudo_em')
    into v_perfil
  from auth.users u where u.id = p_id;

  -- Planos: cada linha de visitas_usuario é uma abertura da página (o sinal só grava quando a página muda).
  select jsonb_build_object(
           'vezes', count(*) filter (where v.pagina = '/assinatura'),
           'primeira', min(v.em) filter (where v.pagina = '/assinatura'),
           'ultima', max(v.em) filter (where v.pagina = '/assinatura'),
           'condicoes_vezes', count(*) filter (where v.pagina = '/condicoes-assinatura'),
           'condicoes_ultima', max(v.em) filter (where v.pagina = '/condicoes-assinatura'),
           'visitas', coalesce((select jsonb_agg(jsonb_build_object('pagina', x.pagina, 'em', x.em) order by x.em desc)
                                from (select w.pagina, w.em from public.visitas_usuario w
                                      where w.id_usuario = p_id and w.pagina in ('/assinatura', '/condicoes-assinatura')
                                        and w.em >= now() - interval '30 days'
                                      order by w.em desc limit 20) x), '[]'::jsonb))
    into v_planos
  from public.visitas_usuario v
  where v.id_usuario = p_id and v.pagina in ('/assinatura', '/condicoes-assinatura')
    -- O mesmo prazo dos Termos (item 5.6): só os últimos 30 dias, mesmo que a limpeza ainda não tenha passado.
    and v.em >= now() - interval '30 days';

  -- Progresso sincronizado dos flashcards (fila de revisão e recordes do aparelho).
  select p.registros, p.recordes, p.atualizado_em into v_progresso
  from public.flashcards_progresso p where p.id_usuario = p_id;

  if found then
    with regs as (
      select r.value as valor
      from jsonb_each(case when jsonb_typeof(v_progresso.registros) = 'object' then v_progresso.registros else '{}'::jsonb end) r
      where jsonb_typeof(r.value) = 'object'
    ),
    numeros as (
      select case when jsonb_typeof(valor->'acertos') = 'number' then (valor->>'acertos')::numeric
                  when valor->>'c' = 'true' then 1 else 0 end as acertos,
             case when jsonb_typeof(valor->'erros') = 'number' then (valor->>'erros')::numeric
                  when valor->>'c' = 'false' then 1 else 0 end as erros,
             coalesce(valor->'historico'->0->>'correta', valor->>'c') as primeira,
             case when jsonb_typeof(valor->'q') = 'number' then (valor->>'q')::double precision end as q,
             case when jsonb_typeof(valor->'proximaRevisao') = 'number' then (valor->>'proximaRevisao')::double precision end as proxima
      from regs
    )
    select jsonb_build_object(
             'cartas', count(*),
             'acertos', coalesce(sum(n.acertos), 0),
             'erros', coalesce(sum(n.erros), 0),
             'acertos_primeira', count(*) filter (where n.primeira = 'true'),
             'erros_primeira', count(*) filter (where n.primeira = 'false'),
             'para_revisar', count(*) filter (where n.proxima is not null and n.proxima <= extract(epoch from now()) * 1000),
             'ultima_resposta', to_timestamp(max(n.q) / 1000),
             'recordes', case when jsonb_typeof(v_progresso.recordes) = 'object' then v_progresso.recordes else '{}'::jsonb end,
             'sincronizado_em', v_progresso.atualizado_em)
      into v_registros
    from numeros n;
  end if;

  -- Cartas liberadas pelo servidor (Biblioteca e Cripta): a contagem que não depende do aparelho sincronizar.
  with lib as (
    select a.id_flashcard, a.criado_em, (a.criado_em at time zone 'America/Sao_Paulo')::date as dia
    from public.flashcards_autorizados a where a.id_usuario = p_id
  ),
  por_dia as (
    select l.dia, count(*) as n, count(distinct l.id_flashcard) as cartas from lib l where l.dia >= v_inicio group by l.dia
  )
  select jsonb_build_object(
           'respostas', (select count(*) from lib),
           'unicos', (select count(distinct id_flashcard) from lib),
           'hoje', (select count(*) from lib where criado_em >= v_hoje),
           'semana', (select count(*) from lib where criado_em >= now() - interval '7 days'),
           'primeira', (select min(criado_em) from lib),
           'ultima', (select max(criado_em) from lib),
           'dias_30', (select count(*) from por_dia),
           'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', d.dia, 'n', d.n, 'cartas', d.cartas) order by d.dia) from por_dia d), '[]'::jsonb))
    into v_autorizados;

  -- Partidas da Cripta (masmorra) e da Torre abertas no servidor.
  select jsonb_build_object(
           'partidas', count(*) filter (where c.modo = 'masmorra'),
           'partidas_torre', count(*) filter (where c.modo = 'torre'),
           'andar_max', max(c.andar) filter (where c.modo = 'masmorra'),
           'andar_max_dificil', max(c.andar) filter (where c.modo = 'masmorra' and c.nivel = 'dificil'),
           'torre_max', max(c.andar) filter (where c.modo = 'torre'),
           'ultima', max(c.iniciada_em),
           'recentes', coalesce((select jsonb_agg(jsonb_build_object('modo', x.modo, 'nivel', x.nivel, 'andar', x.andar, 'em', x.iniciada_em) order by x.iniciada_em desc)
                                 from (select k.modo, k.nivel, k.andar, k.iniciada_em from public.flashcards_corridas k
                                       where k.id_usuario = p_id order by k.iniciada_em desc limit 10) x), '[]'::jsonb))
    into v_corridas
  from public.flashcards_corridas c where c.id_usuario = p_id;

  return jsonb_build_object(
    'perfil', v_perfil,
    'planos', v_planos,
    'flashcards', jsonb_build_object('progresso', v_registros, 'servidor', v_autorizados, 'cripta', v_corridas));
end $$;
revoke all on function public.ficha_extra_usuario_admin(uuid) from public, anon, authenticated;
grant execute on function public.ficha_extra_usuario_admin(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
