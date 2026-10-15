-- Cartas pessoais do Tales (15/10/2026). Parte 27 em supabase/colar-no-painel/.
--
-- O que muda:
-- 1. emails_enviados ganha modelo (situação da carta, ex. "convite_50" ou "ativo:70-80"),
--    versao (a versão sorteada, para não repetir) e origem (manual, lote ou automatico).
--    Novo tipo de e-mail: "carta". Os registros antigos ficam como estão.
-- 2. preferencias_email ganha "cartas" (receber as cartas pessoais). Quem desligou todos os
--    outros e-mails também fica de fora das cartas.
-- 3. Funções:
--    - dados_cartas_interno(ids): o que o motor de cartas precisa de cada pessoa (questões,
--      acerto, áreas, horário, ranking, sequência, flashcards, planos) e o histórico de e-mails.
--      Interna: só as funções abaixo chamam.
--    - perfil_carta_admin(id): a ficha da pessoa no painel (administrador).
--    - listar_cartas_admin(segmento): os grupos da seção "Cartas" (administrador):
--      convite_20 (não assina, 21 a 50 questões), convite_50 (não assina, mais de 50),
--      nunca_comecou (conta confirmada há 1 dia ou mais, nenhuma questão) e sumiu
--      (respondia e está de 10 a 90 dias sem responder). Cada linha diz se a pessoa está
--      bloqueada e por quê (admin, não quer cartas, sem e-mail confirmado, convite sem o
--      aceite de novidades dos Termos 14.3, mesmo tipo nos últimos 30 dias).
--    - dados_carta_envio(id, modelo): para a Edge Function conferir as travas antes de enviar
--      (service_role).
--    - dados_carta_usuario(id): o perfil para os e-mails automáticos (service_role).
--    - definir_cartas_admin(id, quer): o administrador desliga as cartas de quem respondeu "parar".
--    - obter_preferencia_cartas() / definir_preferencia_cartas(valor): a própria pessoa, em Minha conta.
-- Segurança: as funções de painel chamam exigir_administrador(); as internas e as da Edge Function
-- não são executáveis por anon nem authenticated. Não apaga nem altera dados. Pode rodar de novo.
-- Roda depois da 202610152000 (parte 25) e da 202610151800 (parte 26).
begin;

-- 1. Histórico mais completo ------------------------------------------------
alter table public.emails_enviados add column if not exists modelo text;
alter table public.emails_enviados add column if not exists versao text;
alter table public.emails_enviados add column if not exists origem text;
alter table public.emails_enviados drop constraint if exists emails_enviados_tipo_check;
alter table public.emails_enviados add constraint emails_enviados_tipo_check
  check (tipo in ('marco', 'parabens', 'alerta_admin', 'relatorio', 'lembrete', 'relato_resolvido', 'carta'));
alter table public.emails_enviados drop constraint if exists emails_enviados_origem_check;
alter table public.emails_enviados add constraint emails_enviados_origem_check
  check (origem is null or origem in ('manual', 'lote', 'automatico'));
alter table public.emails_enviados drop constraint if exists emails_enviados_modelo_check;
alter table public.emails_enviados add constraint emails_enviados_modelo_check
  check ((modelo is null or char_length(modelo) <= 60) and (versao is null or char_length(versao) <= 80));
create index if not exists emails_enviados_usuario_idx on public.emails_enviados (id_usuario, enviado_em desc);

-- 2. Preferência das cartas ------------------------------------------------
alter table public.preferencias_email add column if not exists cartas boolean not null default true;

create or replace function public.quer_cartas_interno(p_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select pe.cartas and (pe.conquistas or pe.lembretes or pe.relatorio_mensal)
                   from public.preferencias_email pe where pe.id_usuario = p_id), true);
$$;
revoke all on function public.quer_cartas_interno(uuid) from public, anon, authenticated;

-- Origem dos registros antigos (sem a coluna preenchida).
create or replace function public.origem_email_interno(p_tipo text, p_origem text, p_por uuid)
returns text language sql immutable set search_path = '' as $$
  select coalesce(p_origem, case when p_tipo in ('marco', 'relatorio') or p_por is null then 'automatico'
                                 when p_tipo = 'lembrete' then 'lote' else 'manual' end);
$$;
revoke all on function public.origem_email_interno(text, text, uuid) from public, anon, authenticated;

-- 3. O que o motor precisa de cada pessoa ----------------------------------
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
    )
    from auth.users u
    left join totais t on t.usuario_id = u.id
    left join areas ar on ar.usuario_id = u.id
    left join horas h on h.usuario_id = u.id
    left join ranking rk on rk.usuario_id = u.id
    left join vigentes vg on vg.id_usuario = u.id
    left join hist hi on hi.id_usuario = u.id
    left join public.perfis_publicos pp on pp.usuario_id = u.id
    where u.id = any(p_ids);
end $$;
revoke all on function public.dados_cartas_interno(uuid[]) from public, anon, authenticated;

-- 4. Painel: a ficha da pessoa ----------------------------------------------
create or replace function public.perfil_carta_admin(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform public.exigir_administrador();
  select d.dados into v from public.dados_cartas_interno(array[p_id]) d;
  return v;
end $$;
revoke all on function public.perfil_carta_admin(uuid) from public, anon, authenticated;
grant execute on function public.perfil_carta_admin(uuid) to authenticated;

-- 5. Painel: os grupos da seção Cartas --------------------------------------
create or replace function public.listar_cartas_admin(p_segmento text)
returns table (id_usuario uuid, dados jsonb, bloqueio text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_ids uuid[];
begin
  perform public.exigir_administrador();
  if p_segmento is null or p_segmento not in ('convite_20', 'convite_50', 'nunca_comecou', 'sumiu') then
    raise exception 'segmento_invalido' using errcode = '22023';
  end if;

  -- Primeiro, quem entra no grupo (conta leve); depois, os dados completos só dessas pessoas.
  with epocas as (
    select p.usuario_id, max(p.versao) as epoca from public.progresso_usuario p
    where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
    group by p.usuario_id
  ),
  contagem as (
    select p.usuario_id, count(*) as n, max(p.atualizado_em) as ultima
    from public.progresso_usuario p
    left join epocas e on e.usuario_id = p.usuario_id
    where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
      and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
    group by p.usuario_id
  ),
  base as (
    select u.id, coalesce(c.n, 0) as n, c.ultima, u.created_at,
           exists (select 1 from public.assinaturas s where s.id_usuario = u.id
                   and (s.status = 'ativa' or (s.status = 'cancelada' and s.cancelar_ao_fim))
                   and coalesce(s.fim_periodo, 'infinity') > now()) as assina
    from auth.users u
    left join contagem c on c.usuario_id = u.id
    where u.email is not null
  )
  select array_agg(b.id order by b.n desc, b.created_at) into v_ids
  from (
    select b.* from base b
    where case p_segmento
      when 'convite_20' then not b.assina and b.n between 21 and 50
      when 'convite_50' then not b.assina and b.n > 50
      when 'nunca_comecou' then b.n = 0 and b.created_at <= now() - interval '1 day'
      when 'sumiu' then b.n > 0 and b.ultima <= now() - interval '10 days' and b.ultima > now() - interval '90 days'
    end
    order by b.n desc, b.created_at
    limit 600
  ) b;

  if v_ids is null then return; end if;

  return query
    select d.id_usuario, d.dados,
           case
             when (d.dados->>'administrador')::boolean then 'administrador'
             when not (d.dados->>'confirmado')::boolean then 'email_nao_confirmado'
             when not (d.dados->>'quer_cartas')::boolean then 'nao_quer_cartas'
             when p_segmento like 'convite%' and (d.dados->>'assinante')::boolean then 'assinante'
             when p_segmento like 'convite%' and not (d.dados->>'novidades')::boolean then 'sem_aceite_novidades'
             when exists (select 1 from public.emails_enviados e where e.id_usuario = d.id_usuario and e.tipo = 'carta'
                          and e.status in ('enviado', 'enviando') and e.enviado_em > now() - interval '30 days'
                          and case when p_segmento like 'convite%' then e.modelo like 'convite%'
                                   else split_part(coalesce(e.modelo, ''), ':', 1) = p_segmento end) then 'mesmo_tipo_30_dias'
           end
    from public.dados_cartas_interno(v_ids) d
    order by (d.dados->>'respondidas')::int desc;
end $$;
revoke all on function public.listar_cartas_admin(text) from public, anon, authenticated;
grant execute on function public.listar_cartas_admin(text) to authenticated;

-- 6. Edge Function: travas antes de enviar e perfil dos automáticos -----------
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
    'emails_48h', (select count(*) from public.emails_enviados e where e.id_usuario = u.id and e.tipo not in ('alerta_admin', 'relato_resolvido')
                   and e.status in ('enviado', 'enviando') and e.enviado_em > now() - interval '48 hours')
  )
  from auth.users u where u.id = p_id;
$$;
revoke all on function public.dados_carta_envio(uuid, text) from public, anon, authenticated;
grant execute on function public.dados_carta_envio(uuid, text) to service_role;

create or replace function public.dados_carta_usuario(p_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select d.dados from public.dados_cartas_interno(array[p_id]) d;
$$;
revoke all on function public.dados_carta_usuario(uuid) from public, anon, authenticated;
grant execute on function public.dados_carta_usuario(uuid) to service_role;

-- 7. Preferência: o administrador (quem respondeu "parar") e a própria pessoa --
create or replace function public.definir_cartas_admin(p_id uuid, p_quer boolean)
returns boolean
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  insert into public.preferencias_email (id_usuario, cartas, atualizado_em) values (p_id, coalesce(p_quer, true), now())
  on conflict (id_usuario) do update set cartas = excluded.cartas, atualizado_em = now();
  return coalesce(p_quer, true);
end $$;
revoke all on function public.definir_cartas_admin(uuid, boolean) from public, anon, authenticated;
grant execute on function public.definir_cartas_admin(uuid, boolean) to authenticated;

create or replace function public.obter_preferencia_cartas()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select pe.cartas from public.preferencias_email pe where pe.id_usuario = auth.uid()), true);
$$;
revoke all on function public.obter_preferencia_cartas() from public, anon, authenticated;
grant execute on function public.obter_preferencia_cartas() to authenticated;

create or replace function public.definir_preferencia_cartas(p_cartas boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'acesso_negado' using errcode = '42501'; end if;
  insert into public.preferencias_email (id_usuario, cartas, atualizado_em) values (auth.uid(), coalesce(p_cartas, true), now())
  on conflict (id_usuario) do update set cartas = excluded.cartas, atualizado_em = now();
end $$;
revoke all on function public.definir_preferencia_cartas(boolean) from public, anon, authenticated;
grant execute on function public.definir_preferencia_cartas(boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
