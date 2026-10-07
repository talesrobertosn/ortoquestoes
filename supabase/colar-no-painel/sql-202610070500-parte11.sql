-- Parte 11: emblemas difíceis (dias registrados, trava dos emblemas e meus_feitos).
-- Rode depois das partes 1 a 10. Cole TUDO no SQL Editor do Supabase e clique em Run (sem selecionar nada).
-- Aditiva: só cria tabelas e funções novas; não altera dados existentes. Pode ser rodada de novo.
-- Emblemas difíceis: o que só o servidor sabe e a trava dos emblemas conquistados.
--
-- 1. feitos_diarios: dias em que a pessoa cumpriu algo que não fica no progresso
--    (respondeu a Questão do Dia, zerou a fila de revisão, cumpriu a meta do Cronograma).
-- 2. conquistas_usuario: emblemas já conquistados. Um emblema conquistado não se perde
--    (o histórico de sessões guarda só as 50 últimas, e o ranking diário só 30 dias).
-- 3. meus_feitos(): numa chamada, tudo o que os emblemas de servidor precisam da própria conta:
--    indicações que viraram assinatura, indicados com 30 dias de estudo, Simulado Nacional,
--    pódio do ranking semanal, relatos de erro resolvidos, comentários avaliados, acertos de
--    primeira nas questões que a turma erra, plano do Cronograma e os dias registrados.
-- Aditiva: não altera dados existentes. Pode ser rodada de novo.
begin;

create table if not exists public.feitos_diarios (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('questao_do_dia', 'fila_zerada', 'meta_cronograma')),
  dia date not null,
  primary key (usuario_id, tipo, dia)
);
alter table public.feitos_diarios enable row level security;
revoke all on public.feitos_diarios from public, anon, authenticated;

create table if not exists public.conquistas_usuario (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  emblema text not null check (emblema ~ '^[a-z0-9-]{1,40}$'),
  conquistado_em timestamptz not null default now(),
  primary key (usuario_id, emblema)
);
alter table public.conquistas_usuario enable row level security;
revoke all on public.conquistas_usuario from public, anon, authenticated;

-- Marca o dia de hoje (horário de Brasília) para um tipo de feito.
create or replace function public.registrar_feito(p_tipo text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_tipo is null or p_tipo not in ('questao_do_dia', 'fila_zerada', 'meta_cronograma') then
    raise exception 'tipo_invalido' using errcode = '22023';
  end if;
  insert into public.feitos_diarios (usuario_id, tipo, dia)
  values (auth.uid(), p_tipo, (now() at time zone 'America/Sao_Paulo')::date)
  on conflict do nothing;
end $$;
revoke all on function public.registrar_feito(text) from public, anon, authenticated;
grant execute on function public.registrar_feito(text) to authenticated;

-- Guarda emblemas conquistados (só acrescenta; nunca apaga).
create or replace function public.registrar_conquistas(p_ids text[])
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_ids is null or cardinality(p_ids) = 0 then return; end if;
  if cardinality(p_ids) > 300 then raise exception 'lista_grande' using errcode = '22023'; end if;
  insert into public.conquistas_usuario (usuario_id, emblema)
  select auth.uid(), x from unnest(p_ids) x where x ~ '^[a-z0-9-]{1,40}$'
  on conflict do nothing;
end $$;
revoke all on function public.registrar_conquistas(text[]) from public, anon, authenticated;
grant execute on function public.registrar_conquistas(text[]) to authenticated;

create or replace function public.meus_feitos()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_resultado jsonb;
begin
  if v_uid is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select jsonb_build_object(
    'conquistas', coalesce((select jsonb_agg(c.emblema order by c.emblema) from public.conquistas_usuario c where c.usuario_id = v_uid), '[]'::jsonb),
    'dias', coalesce((select jsonb_object_agg(x.tipo, x.dias) from (
        select f.tipo, jsonb_agg(f.dia order by f.dia) as dias from public.feitos_diarios f
        where f.usuario_id = v_uid and f.dia >= (now() at time zone 'America/Sao_Paulo')::date - 800
        group by f.tipo) x), '{}'::jsonb),
    -- Indicados que assinaram (assinatura que chegou a começar, por cartão ou Pix).
    'indicados_assinantes', (select count(*) from public.indicacoes i
        where i.id_padrinho = v_uid and exists (
          select 1 from public.assinaturas a where a.id_usuario = i.id_convidado
            and a.inicio_periodo is not null and a.status not in ('pendente', 'reembolsada'))),
    -- Indicados com pelo menos 30 dias diferentes de estudo.
    'indicados_30_dias', (select count(*) from public.indicacoes i
        where i.id_padrinho = v_uid and (
          select count(distinct d.dia) from (
            select (to_timestamp(((e->>'em')::double precision) / 1000) at time zone 'America/Sao_Paulo')::date as dia
            from public.progresso_usuario p
            cross join lateral jsonb_array_elements(case when jsonb_typeof(p.valor->'historico') = 'array' then p.valor->'historico' else '[]'::jsonb end) e
            where p.usuario_id = i.id_convidado and p.tipo = 'respondidas' and (e->>'em') ~ '^[0-9]+(\.[0-9]+)?$'
            union
            select (to_timestamp(((p.valor->>'q')::double precision) / 1000) at time zone 'America/Sao_Paulo')::date
            from public.progresso_usuario p
            where p.usuario_id = i.id_convidado and p.tipo = 'respondidas' and (p.valor->>'q') ~ '^[0-9]+(\.[0-9]+)?$'
          ) d) >= 30),
    -- Edições mensais já abertas e a classificação da pessoa em cada uma que entregou no tempo.
    'simulado_edicoes', coalesce((select jsonb_agg(e.edicao order by e.edicao) from public.simulado_edicoes e
        where e.edicao ~ '^[0-9]{4}-[0-9]{2}$' and e.abre_em <= now()), '[]'::jsonb),
    'simulado_participacoes', coalesce((select jsonb_agg(jsonb_build_object('edicao', o.edicao, 'posicao', o.posicao, 'classificados', o.classificados) order by o.edicao)
        from (
          select sp.edicao, sp.usuario_id,
                 row_number() over (partition by sp.edicao order by sp.acertos desc, sp.segundos asc, sp.entregue_em asc) as posicao,
                 count(*) over (partition by sp.edicao) as classificados
          from public.simulado_participacoes sp
          where sp.entregue_em is not null and sp.no_tempo
            and sp.edicao in (select x.edicao from public.simulado_participacoes x where x.usuario_id = v_uid and x.entregue_em is not null and x.no_tempo)
        ) o where o.usuario_id = v_uid), '[]'::jsonb),
    -- Posições diárias no ranking semanal (o banco guarda 30 dias; a conquista fica travada).
    'ranking_semana', coalesce((select jsonb_agg(jsonb_build_object('dia', h.dia, 'posicao', h.posicao) order by h.dia)
        from public.ranking_posicoes_diarias h where h.usuario_id = v_uid and h.periodo = 'semana'), '[]'::jsonb),
    'relatos_resolvidos', (select count(*) from public.relatos_erro r where r.id_usuario = v_uid and r.status = 'resolvido'),
    'comentarios_avaliados', (select count(*) from public.avaliacoes_comentario a where a.usuario_id = v_uid),
    -- Acertos de primeira nas questões em que a turma acerta menos da metade (10+ respondentes).
    'contra_corrente', (select count(distinct regexp_replace(p.item, '^r[0-9]+:', ''))
        from public.progresso_usuario p
        join public.turma_estatisticas t on t.id_questao = regexp_replace(p.item, '^r[0-9]+:', '')
        where p.usuario_id = v_uid and p.tipo = 'respondidas'
          and coalesce(p.valor->'historico'->0->>'correta', p.valor->>'c') = 'true'
          and t.respondentes >= 10 and t.acertos * 2 < t.respondentes),
    'plano', (select jsonb_build_object('data_prova', pe.data_prova, 'folgas', pe.folgas, 'criado_em', pe.criado_em)
        from public.planos_estudo pe where pe.usuario_id = v_uid)
  ) into v_resultado;
  return v_resultado;
end $$;
revoke all on function public.meus_feitos() from public, anon, authenticated;
grant execute on function public.meus_feitos() to authenticated;

notify pgrst, 'reload schema';
commit;
