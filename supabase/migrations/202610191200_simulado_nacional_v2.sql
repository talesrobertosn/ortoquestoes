-- Migração: espelho da parte 32 em supabase/colar-no-painel/ (Simulado Nacional 2.0, 19/10/2026).
-- Cole no SQL Editor do Supabase e execute. Roda depois da parte 31. Pode rodar de novo.
--
-- O plano está em docs/superpowers/specs/2026-10-19-simulado-nacional-design.md e o acordo técnico
-- (nomes, parâmetros e formatos fixos) em docs/superpowers/specs/2026-10-19-simulado-nacional-contrato.md.
--
-- 1. Tabelas novas sn_edicoes, sn_itens e sn_participacoes. RLS ligado, nenhuma política, grants
--    revogados: todo acesso passa pelas funções abaixo (security definer, search_path = public).
--    A véspera é um TIPO de edição ('vespera'), não um sufixo; a edição guarda a permutação das
--    alternativas de cada questão e a correção é feita aqui, pela letra NOVA.
-- 2. A pessoa: sn_obter, sn_iniciar, sn_salvar (respostas salvas aos poucos, outro aparelho
--    continua), sn_entregar, sn_resultado, sn_ranking, sn_gabarito e sn_destaque_inicio.
--    O relógio é o do servidor: prazo_em = início + duração; salvar e entregar aceitam até 5 minutos
--    depois do prazo (rede lenta). Só entra no ranking quem entregou no prazo.
-- 3. O pg_cron (sql-202610191200-parte32-agendamento.sql) chama sn_entregar_vencidas de 10 em 10
--    minutos: quem fechou a aba tem a prova entregue com o que foi salvo.
-- 4. O painel: sn_admin_listar, sn_admin_salvar, sn_admin_config, sn_admin_trocar_item,
--    sn_admin_publicar, sn_admin_datas e sn_admin_estatisticas (só administradores: 'nao_admin').
-- 4b. Inscrição: sn_inscrever / sn_cancelar_inscricao (qualquer conta, enquanto a edição publicada não
--    fechou; começar a prova inscreve sozinho) e o lembrete por e-mail (candidatos_simulado_lembrete,
--    "abre amanhã" ou "abriu hoje", marcado com sn_marcar_lembrete pela função enviar-email).
--    aberto_a_todos (por edição): a prova não exige o plano e a posição sai para todos no prazo.
-- 5. Compatibilidade: autorizar_resposta (as questões de uma prova sn_ aberta não gastam o limite
--    grátis), meus_feitos (os emblemas contam as mensais novas) e candidatos_simulado_resultado
--    (o e-mail de resultado lê as tabelas novas) são redeclaradas com as mesmas assinaturas.
--
-- As tabelas antigas (simulado_*) NÃO são apagadas: quem fez o outubro antigo continua vendo o
-- resultado nos anteriores, como "Outubro de 2026 (versão anterior)" (edicao '2026-10-antiga').
-- Nenhuma edição é semeada aqui: o outubro novo é montado e publicado pelo painel (ou pelo script).
--
-- Erros (raise exception com um código curto, que o front lê): premium_necessario, edicao_fechada,
-- edicao_nao_aberta, ja_entregue, nao_iniciado, nao_entregue, tempo_esgotado, nao_admin,
-- edicao_com_participantes, edicao_invalida, autenticacao_necessaria, respostas_invalidas,
-- itens_invalidos, datas_invalidas, duracao_invalida, titulo_invalido, config_invalida.
begin;

-- ---------------------------------------------------------------------------
-- 1. Tabelas
-- ---------------------------------------------------------------------------
create table if not exists public.sn_edicoes (
  edicao text primary key,
  tipo text not null check (tipo in ('mensal', 'vespera')),
  titulo text not null check (char_length(titulo) between 3 and 120),
  descricao text,
  destaque_inicio boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  aberto_a_todos boolean not null default false,
  abre_em timestamptz not null,
  fecha_em timestamptz not null,
  duracao_min integer not null check (duracao_min between 10 and 360),
  publicado boolean not null default false,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  check (fecha_em > abre_em),
  check ((tipo = 'mensal' and edicao ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
      or (tipo = 'vespera' and edicao ~ '^[0-9]{4}-(0[1-9]|1[0-2])-vespera-[a-z0-9]+(-[a-z0-9]+)*$' and char_length(edicao) <= 60))
);
-- Para quem colou uma versão anterior da parte 32 sem estas colunas.
alter table public.sn_edicoes add column if not exists descricao text;
alter table public.sn_edicoes add column if not exists destaque_inicio boolean not null default true;
alter table public.sn_edicoes add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.sn_edicoes add column if not exists aberto_a_todos boolean not null default false;

create table if not exists public.sn_itens (
  edicao text not null references public.sn_edicoes(edicao) on delete cascade,
  ordem integer not null check (ordem between 1 and 200),
  id_questao text not null check (id_questao ~ '^[a-z0-9-]{3,80}$'),
  area text not null check (char_length(area) between 2 and 80),
  foco text check (foco is null or char_length(foco) <= 160),
  gabarito_original char(1) not null check (gabarito_original between 'A' and 'E'),
  permutacao text not null check (permutacao ~ '^[A-E]{2,5}$'),
  gabarito char(1) not null check (gabarito between 'A' and 'E'),
  primary key (edicao, ordem),
  unique (edicao, id_questao)
);

create table if not exists public.sn_participacoes (
  edicao text not null references public.sn_edicoes(edicao) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  iniciado_em timestamptz not null default now(),
  prazo_em timestamptz not null,
  respostas jsonb not null default '{}'::jsonb,
  revisar jsonb not null default '[]'::jsonb,
  salvo_em timestamptz,
  entregue_em timestamptz,
  entrega_automatica boolean default false,
  acertos integer,
  total integer,
  segundos integer,
  no_tempo boolean,
  por_area jsonb,
  primary key (edicao, usuario_id)
);
create index if not exists sn_participacoes_ranking on public.sn_participacoes (edicao, acertos desc, segundos asc, entregue_em asc) where entregue_em is not null and no_tempo;
create index if not exists sn_participacoes_abertas on public.sn_participacoes (prazo_em) where entregue_em is null;
create index if not exists sn_participacoes_usuario on public.sn_participacoes (usuario_id);

-- Inscrições: quem quer fazer a edição (e receber o lembrete). Começar a prova também inscreve.
create table if not exists public.sn_inscricoes (
  edicao text not null references public.sn_edicoes(edicao) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  inscrito_em timestamptz not null default now(),
  lembrete_enviado_em timestamptz,
  primary key (edicao, usuario_id)
);
create index if not exists sn_inscricoes_lembrete on public.sn_inscricoes (edicao) where lembrete_enviado_em is null;

alter table public.sn_edicoes enable row level security;
alter table public.sn_itens enable row level security;
alter table public.sn_participacoes enable row level security;
alter table public.sn_inscricoes enable row level security;
revoke all on public.sn_edicoes, public.sn_itens, public.sn_participacoes, public.sn_inscricoes from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Ajudantes internos (ninguém de fora executa)
-- ---------------------------------------------------------------------------

-- Só administradores: o mesmo critério de publicar_simulado_admin (eh_administrador), com o código do contrato.
create or replace function public.sn_exigir_admin_interno()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_administrador() then raise exception 'nao_admin' using errcode = '42501'; end if;
end $$;

-- Permutação válida: as n primeiras letras (2 a 5), cada uma uma vez. 'CADB': a letra nova A mostra a original C.
create or replace function public.sn_permutacao_valida_interno(p text)
returns boolean language sql immutable security definer set search_path = public as $$
  select coalesce(p ~ '^[A-E]{2,5}$'
    and (select count(distinct c) = char_length(p) and max(c) = chr(64 + char_length(p)) from regexp_split_to_table(p, '') c), false);
$$;

-- A letra NOVA que mostra a letra original (a posição dela na permutação).
create or replace function public.sn_letra_nova_interno(p_permutacao text, p_original text)
returns char(1) language sql immutable security definer set search_path = public as $$
  select case when strpos(p_permutacao, upper(p_original)) > 0 then chr(64 + strpos(p_permutacao, upper(p_original))) end;
$$;

-- A edição é visível: publicada, ou quem pergunta é administrador (prévia no painel).
create or replace function public.sn_visivel_interno(p_edicao text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sn_edicoes e where e.edicao = p_edicao and (e.publicado or public.eh_administrador()));
$$;

-- A edição em destaque: a véspera aberta, senão a mensal aberta, senão a próxima a abrir, senão a
-- última encerrada. Só edições publicadas.
create or replace function public.sn_destaque_interno()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select e.edicao from public.sn_edicoes e where e.publicado and e.tipo = 'vespera' and now() between e.abre_em and e.fecha_em order by e.abre_em desc, e.edicao desc limit 1),
    (select e.edicao from public.sn_edicoes e where e.publicado and e.tipo = 'mensal' and now() between e.abre_em and e.fecha_em order by e.abre_em desc, e.edicao desc limit 1),
    (select e.edicao from public.sn_edicoes e where e.publicado and e.abre_em > now() order by e.abre_em asc, e.edicao limit 1),
    (select e.edicao from public.sn_edicoes e where e.publicado and e.fecha_em < now() order by e.fecha_em desc, e.edicao desc limit 1));
$$;

-- Só as respostas que valem: questões da edição e letras que existem na questão (ou null, que apaga).
create or replace function public.sn_filtrar_respostas_interno(p_edicao text, p_respostas jsonb)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(i.id_questao, case when jsonb_typeof(r.valor) = 'null' then null else to_jsonb(upper(r.valor #>> '{}')) end), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(p_respostas) = 'object' then p_respostas else '{}'::jsonb end) r(chave, valor)
  join public.sn_itens i on i.edicao = p_edicao and i.id_questao = r.chave
  where jsonb_typeof(r.valor) = 'null'
     or (jsonb_typeof(r.valor) = 'string' and upper(r.valor #>> '{}') ~ '^[A-E]$'
         and upper(r.valor #>> '{}') <= chr(64 + char_length(i.permutacao)));
$$;

-- O resultado gravado de uma participação (o formato de sn_entregar).
create or replace function public.sn_resultado_gravado_interno(p_edicao text, p_usuario uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('acertos', sp.acertos, 'total', sp.total, 'segundos', sp.segundos, 'no_tempo', sp.no_tempo,
                            'por_area', coalesce(sp.por_area, '{}'::jsonb))
  from public.sn_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = p_usuario;
$$;

-- Corrige e grava a entrega (pela letra nova). no_tempo: entregue até prazo_em + 5 minutos.
create or replace function public.sn_corrigir_interno(p_edicao text, p_usuario uuid, p_automatica boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_part public.sn_participacoes;
  v_acertos integer;
  v_total integer;
  v_por_area jsonb;
begin
  select * into v_part from public.sn_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = p_usuario for update;
  if not found then raise exception 'nao_iniciado' using errcode = '22023'; end if;
  if v_part.entregue_em is not null then return public.sn_resultado_gravado_interno(p_edicao, p_usuario); end if;

  select count(*) filter (where v_part.respostas->>i.id_questao = i.gabarito::text), count(*)
    into v_acertos, v_total
  from public.sn_itens i where i.edicao = p_edicao;
  select coalesce(jsonb_object_agg(t.area, jsonb_build_object('certas', t.certas, 'total', t.total)), '{}'::jsonb) into v_por_area
  from (select i.area, count(*) filter (where v_part.respostas->>i.id_questao = i.gabarito::text) as certas, count(*) as total
        from public.sn_itens i where i.edicao = p_edicao group by i.area) t;

  update public.sn_participacoes sp set
    entregue_em = now(),
    entrega_automatica = coalesce(p_automatica, false),
    acertos = v_acertos, total = v_total,
    segundos = greatest(0, least(extract(epoch from now() - sp.iniciado_em), extract(epoch from sp.prazo_em - sp.iniciado_em)))::integer,
    no_tempo = now() <= sp.prazo_em + interval '5 minutes',
    por_area = v_por_area
  where sp.edicao = p_edicao and sp.usuario_id = p_usuario;
  return public.sn_resultado_gravado_interno(p_edicao, p_usuario);
end $$;

-- Valida os itens do painel e devolve as linhas prontas (com o gabarito novo calculado aqui).
create or replace function public.sn_itens_validados_interno(p_itens jsonb)
returns table (ordem integer, id_questao text, area text, foco text, gabarito_original char(1), permutacao text, gabarito char(1))
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_n integer;
begin
  if jsonb_typeof(p_itens) is distinct from 'array' or jsonb_array_length(p_itens) < 10 or jsonb_array_length(p_itens) > 200 then
    raise exception 'itens_invalidos' using errcode = '22023';
  end if;
  v_n := jsonb_array_length(p_itens);
  return query
    with x as (
      select coalesce(case when (it->>'ordem') ~ '^[0-9]{1,3}$' then (it->>'ordem')::int end, -1) as ordem,
             it->>'id_questao' as id_questao, btrim(it->>'area') as area, nullif(btrim(coalesce(it->>'foco', '')), '') as foco,
             upper(it->>'gabarito_original') as gabarito_original, upper(it->>'permutacao') as permutacao
      from jsonb_array_elements(p_itens) it
    )
    select x.ordem, x.id_questao, x.area, x.foco, x.gabarito_original::char(1), x.permutacao, public.sn_letra_nova_interno(x.permutacao, x.gabarito_original)
    from x order by x.ordem;
  if exists (
    select 1 from (
      select coalesce(case when (it->>'ordem') ~ '^[0-9]{1,3}$' then (it->>'ordem')::int end, -1) as ordem, it
      from jsonb_array_elements(p_itens) it) y
    where y.ordem < 1 or y.ordem > v_n
       or coalesce(y.it->>'id_questao', '') !~ '^[a-z0-9-]{3,80}$'
       or char_length(btrim(coalesce(y.it->>'area', ''))) not between 2 and 80
       or char_length(coalesce(y.it->>'foco', '')) > 160
       or not public.sn_permutacao_valida_interno(upper(y.it->>'permutacao'))
       or coalesce(upper(y.it->>'gabarito_original'), '') !~ '^[A-E]$'
       or strpos(upper(y.it->>'permutacao'), upper(y.it->>'gabarito_original')) = 0)
     or (select count(distinct it->>'ordem') from jsonb_array_elements(p_itens) it) <> v_n
     or (select count(distinct it->>'id_questao') from jsonb_array_elements(p_itens) it) <> v_n then
    raise exception 'itens_invalidos' using errcode = '22023';
  end if;
end $$;

-- O resumo de uma edição para o painel (o formato de cada linha de sn_admin_listar).
create or replace function public.sn_resumo_admin_interno(p_edicao text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'edicao', e.edicao, 'tipo', e.tipo, 'titulo', e.titulo, 'descricao', e.descricao, 'destaque_inicio', e.destaque_inicio,
    'config', e.config, 'aberto_a_todos', e.aberto_a_todos,
    'abre_em', e.abre_em, 'fecha_em', e.fecha_em, 'duracao_min', e.duracao_min, 'publicado', e.publicado,
    'total', (select count(*) from public.sn_itens i where i.edicao = e.edicao),
    'inscritos', (select count(*) from public.sn_inscricoes i where i.edicao = e.edicao),
    'participantes', (select count(*) from public.sn_participacoes sp where sp.edicao = e.edicao),
    'entregas', (select count(*) from public.sn_participacoes sp where sp.edicao = e.edicao and sp.entregue_em is not null),
    'media', (select round(avg(sp.acertos::numeric * 100 / nullif(sp.total, 0)), 1) from public.sn_participacoes sp
              where sp.edicao = e.edicao and sp.entregue_em is not null and sp.no_tempo),
    'ids', coalesce((select jsonb_agg(i.id_questao order by i.ordem) from public.sn_itens i where i.edicao = e.edicao), '[]'::jsonb))
  from public.sn_edicoes e where e.edicao = p_edicao;
$$;

-- As regras das datas: antes de abrir (ou sem publicar), muda tudo; depois de aberta, só estende o fechamento.
create or replace function public.sn_conferir_datas_interno(p_ed public.sn_edicoes, p_abre timestamptz, p_fecha timestamptz)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if p_abre is null or p_fecha is null or p_fecha <= p_abre then raise exception 'datas_invalidas' using errcode = '22023'; end if;
  if p_ed.publicado and p_ed.abre_em <= now()
     and (p_abre is distinct from p_ed.abre_em or p_fecha < p_ed.fecha_em) then
    raise exception 'datas_invalidas' using errcode = '22023';
  end if;
end $$;

-- Quantos inscritos (para a página: só a partir de 10).
create or replace function public.sn_inscritos_publico_interno(p_edicao text)
returns integer language sql stable security definer set search_path = public as $$
  select case when n >= 10 then n end from (select count(*)::int as n from public.sn_inscricoes i where i.edicao = p_edicao) x;
$$;

revoke all on function public.sn_inscritos_publico_interno(text) from public, anon, authenticated;
revoke all on function public.sn_exigir_admin_interno() from public, anon, authenticated;
revoke all on function public.sn_permutacao_valida_interno(text) from public, anon, authenticated;
revoke all on function public.sn_letra_nova_interno(text, text) from public, anon, authenticated;
revoke all on function public.sn_visivel_interno(text) from public, anon, authenticated;
revoke all on function public.sn_destaque_interno() from public, anon, authenticated;
revoke all on function public.sn_filtrar_respostas_interno(text, jsonb) from public, anon, authenticated;
revoke all on function public.sn_resultado_gravado_interno(text, uuid) from public, anon, authenticated;
revoke all on function public.sn_corrigir_interno(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.sn_itens_validados_interno(jsonb) from public, anon, authenticated;
revoke all on function public.sn_resumo_admin_interno(text) from public, anon, authenticated;
revoke all on function public.sn_conferir_datas_interno(public.sn_edicoes, timestamptz, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. A pessoa
-- ---------------------------------------------------------------------------

-- A edição (a pedida, ou a em destaque), o que a pessoa já fez nela e o histórico.
create or replace function public.sn_obter(p_edicao text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_edicao text := coalesce(p_edicao, public.sn_destaque_interno());
  v_ed public.sn_edicoes;
  v_part public.sn_participacoes;
  v_entregas integer;
  v_anteriores jsonb;
begin
  if v_edicao is not null and public.sn_visivel_interno(v_edicao) then
    select * into v_ed from public.sn_edicoes e where e.edicao = v_edicao;
  end if;
  if v_ed.edicao is not null and v_uid is not null then
    select * into v_part from public.sn_participacoes sp where sp.edicao = v_ed.edicao and sp.usuario_id = v_uid;
  end if;
  select count(*) into v_entregas from public.sn_participacoes sp where sp.edicao = v_ed.edicao and sp.entregue_em is not null;

  -- Encerradas (até 12), com a versão antiga de outubro para quem a fez.
  select coalesce(jsonb_agg(a.item order by a.abre_em desc), '[]'::jsonb) into v_anteriores
  from (
    select x.item, x.abre_em from (
      select jsonb_build_object('edicao', e.edicao, 'titulo', e.titulo, 'tipo', e.tipo,
               'minha', (select jsonb_build_object('acertos', sp.acertos, 'total', sp.total, 'no_tempo', sp.no_tempo)
                         from public.sn_participacoes sp where sp.edicao = e.edicao and sp.usuario_id = v_uid and sp.entregue_em is not null)) as item,
             e.abre_em
      from public.sn_edicoes e
      where e.publicado and e.fecha_em < now() and e.edicao is distinct from v_ed.edicao
      union all
      select jsonb_build_object('edicao', '2026-10-antiga', 'titulo', 'Outubro de 2026 (versão anterior)', 'tipo', 'mensal',
               'minha', case when sp.entregue_em is not null then jsonb_build_object('acertos', sp.acertos, 'total', sp.total, 'no_tempo', sp.no_tempo) end),
             se.abre_em
      from public.simulado_participacoes sp join public.simulado_edicoes se on se.edicao = sp.edicao
      where v_uid is not null and sp.edicao = '2026-10' and sp.usuario_id = v_uid
    ) x order by x.abre_em desc limit 12
  ) a;

  return jsonb_build_object(
    'edicao', v_ed.edicao, 'tipo', v_ed.tipo, 'titulo', v_ed.titulo, 'descricao', v_ed.descricao,
    'destaque_inicio', v_ed.destaque_inicio, 'aberto_a_todos', v_ed.aberto_a_todos,
    'config', case when v_ed.edicao is not null then jsonb_strip_nulls(jsonb_build_object('provas', v_ed.config->'provas', 'cotas', v_ed.config->'cotas')) end,
    'abre_em', v_ed.abre_em, 'fecha_em', v_ed.fecha_em, 'duracao_min', v_ed.duracao_min,
    'total', case when v_ed.edicao is not null then (select count(*) from public.sn_itens i where i.edicao = v_ed.edicao) end,
    'por_area', coalesce((select jsonb_agg(jsonb_build_object('area', t.area, 'n', t.n) order by t.n desc, t.area)
                          from (select i.area, count(*) as n from public.sn_itens i where i.edicao = v_ed.edicao group by i.area) t), '[]'::jsonb),
    'participantes', case when v_entregas >= 10 then v_entregas end,
    'inscritos', case when v_ed.edicao is not null then public.sn_inscritos_publico_interno(v_ed.edicao) end,
    'minha_inscricao', (select i.inscrito_em from public.sn_inscricoes i where i.edicao = v_ed.edicao and i.usuario_id = v_uid),
    'tambem_no_ar', coalesce((select jsonb_agg(jsonb_build_object('edicao', e.edicao, 'titulo', e.titulo, 'tipo', e.tipo) order by e.abre_em desc)
                              from public.sn_edicoes e where e.publicado and now() between e.abre_em and e.fecha_em
                                and e.edicao is distinct from v_ed.edicao), '[]'::jsonb),
    'minha', case when v_part.edicao is not null then jsonb_build_object(
      'iniciado_em', v_part.iniciado_em, 'prazo_em', v_part.prazo_em, 'entregue_em', v_part.entregue_em,
      'acertos', v_part.acertos, 'total', v_part.total, 'segundos', v_part.segundos, 'no_tempo', v_part.no_tempo,
      'respondidas', (select count(*) from jsonb_each(v_part.respostas) r where jsonb_typeof(r.value) = 'string')) end,
    'anteriores', v_anteriores,
    'agora', now());
end $$;
revoke all on function public.sn_obter(text) from public;
grant execute on function public.sn_obter(text) to anon, authenticated;

-- A chamada da página inicial: a edição em destaque, se o admin deixou ligada e ela está aberta
-- ou abre em até 7 dias. Senão, null.
create or replace function public.sn_destaque_inicio()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_ed public.sn_edicoes;
  v_part public.sn_participacoes;
begin
  select * into v_ed from public.sn_edicoes e where e.edicao = public.sn_destaque_interno();
  if not found or not v_ed.destaque_inicio
     or not (now() between v_ed.abre_em and v_ed.fecha_em or (v_ed.abre_em > now() and v_ed.abre_em <= now() + interval '7 days')) then
    return null;
  end if;
  if auth.uid() is not null then
    select * into v_part from public.sn_participacoes sp where sp.edicao = v_ed.edicao and sp.usuario_id = auth.uid();
  end if;
  return jsonb_build_object(
    'edicao', v_ed.edicao, 'titulo', v_ed.titulo, 'tipo', v_ed.tipo, 'abre_em', v_ed.abre_em, 'fecha_em', v_ed.fecha_em,
    'total', (select count(*) from public.sn_itens i where i.edicao = v_ed.edicao), 'duracao_min', v_ed.duracao_min,
    'inscrito', auth.uid() is not null and exists (select 1 from public.sn_inscricoes i where i.edicao = v_ed.edicao and i.usuario_id = auth.uid()),
    'minha_situacao', case
      when v_part.edicao is null then null
      when v_part.entregue_em is not null then 'entregue'
      when now() <= v_part.prazo_em + interval '5 minutes' then 'andamento'
    end);
end $$;
revoke all on function public.sn_destaque_inicio() from public;
grant execute on function public.sn_destaque_inicio() to anon, authenticated;

-- Começa (ou retoma) a prova. Começar exige o plano (menos numa edição aberto_a_todos) e inscreve a
-- pessoa; retomar não exige (quem perdeu a assinatura no meio continua a mesma prova). Não devolve gabarito.
create or replace function public.sn_iniciar(p_edicao text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ed public.sn_edicoes;
  v_part public.sn_participacoes;
begin
  if v_uid is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select * into v_ed from public.sn_edicoes e where e.edicao = p_edicao and e.publicado;
  if not found then raise exception 'edicao_invalida' using errcode = '22023'; end if;
  select * into v_part from public.sn_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = v_uid;
  if found and v_part.entregue_em is not null then raise exception 'ja_entregue' using errcode = '22023'; end if;
  if not found then
    if now() < v_ed.abre_em then raise exception 'edicao_nao_aberta' using errcode = '22023'; end if;
    if now() > v_ed.fecha_em then raise exception 'edicao_fechada' using errcode = '22023'; end if;
    if not v_ed.aberto_a_todos and not public.tem_premium_interno(v_uid) then raise exception 'premium_necessario' using errcode = '42501'; end if;
    insert into public.sn_inscricoes (edicao, usuario_id) values (p_edicao, v_uid) on conflict (edicao, usuario_id) do nothing;
    insert into public.sn_participacoes (edicao, usuario_id, iniciado_em, prazo_em)
    values (p_edicao, v_uid, now(), least(now() + make_interval(mins => v_ed.duracao_min), v_ed.fecha_em + interval '1 day'))
    on conflict (edicao, usuario_id) do nothing;
    select * into v_part from public.sn_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = v_uid;
  end if;
  return jsonb_build_object(
    'edicao', p_edicao, 'iniciado_em', v_part.iniciado_em, 'prazo_em', v_part.prazo_em, 'duracao_min', v_ed.duracao_min,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('ordem', i.ordem, 'id_questao', i.id_questao, 'permutacao', i.permutacao) order by i.ordem)
                       from public.sn_itens i where i.edicao = p_edicao), '[]'::jsonb),
    'respostas', v_part.respostas, 'revisar', v_part.revisar);
end $$;
revoke all on function public.sn_iniciar(text) from public, anon, authenticated;
grant execute on function public.sn_iniciar(text) to authenticated;

-- Salva as respostas aos poucos (a última vence). Só até prazo_em + 5 minutos e antes da entrega.
-- p_respostas: {id_questao: letra NOVA | null}; p_revisar (opcional): a lista inteira dos marcados para rever.
create or replace function public.sn_salvar(p_edicao text, p_respostas jsonb, p_revisar jsonb default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_part public.sn_participacoes;
begin
  if v_uid is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if jsonb_typeof(coalesce(p_respostas, '{}'::jsonb)) <> 'object' or (p_revisar is not null and jsonb_typeof(p_revisar) <> 'array') then
    raise exception 'respostas_invalidas' using errcode = '22023';
  end if;
  select * into v_part from public.sn_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = v_uid for update;
  if not found then raise exception 'nao_iniciado' using errcode = '22023'; end if;
  if v_part.entregue_em is not null then raise exception 'ja_entregue' using errcode = '22023'; end if;
  if now() > v_part.prazo_em + interval '5 minutes' then raise exception 'tempo_esgotado' using errcode = '22023'; end if;
  update public.sn_participacoes sp set
    respostas = sp.respostas || public.sn_filtrar_respostas_interno(p_edicao, p_respostas),
    revisar = case when p_revisar is null then sp.revisar else coalesce((
      select jsonb_agg(to_jsonb(r.id) order by r.n) from (
        select distinct on (x.valor #>> '{}') x.valor #>> '{}' as id, x.n
        from jsonb_array_elements(p_revisar) with ordinality x(valor, n)
        where jsonb_typeof(x.valor) = 'string'
          and exists (select 1 from public.sn_itens i where i.edicao = p_edicao and i.id_questao = x.valor #>> '{}')
        order by x.valor #>> '{}', x.n) r), '[]'::jsonb) end,
    salvo_em = now()
  where sp.edicao = p_edicao and sp.usuario_id = v_uid;
  return jsonb_build_object('salvo_em', now());
end $$;
revoke all on function public.sn_salvar(text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sn_salvar(text, jsonb, jsonb) to authenticated;

-- Entrega: mescla as respostas finais (se ainda dentro de prazo + 5 min), corrige e grava.
-- Repetir devolve o resultado gravado. Não exige o plano.
create or replace function public.sn_entregar(p_edicao text, p_respostas jsonb default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_part public.sn_participacoes;
begin
  if v_uid is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_respostas is not null and jsonb_typeof(p_respostas) <> 'object' then raise exception 'respostas_invalidas' using errcode = '22023'; end if;
  if not exists (select 1 from public.sn_edicoes e where e.edicao = p_edicao) then raise exception 'edicao_invalida' using errcode = '22023'; end if;
  select * into v_part from public.sn_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = v_uid for update;
  if not found then raise exception 'nao_iniciado' using errcode = '22023'; end if;
  if v_part.entregue_em is not null then return public.sn_resultado_gravado_interno(p_edicao, v_uid); end if;
  if p_respostas is not null and now() <= v_part.prazo_em + interval '5 minutes' then
    update public.sn_participacoes sp set respostas = sp.respostas || public.sn_filtrar_respostas_interno(p_edicao, p_respostas), salvo_em = now()
    where sp.edicao = p_edicao and sp.usuario_id = v_uid;
  end if;
  return public.sn_corrigir_interno(p_edicao, v_uid, false);
end $$;
revoke all on function public.sn_entregar(text, jsonb) from public, anon, authenticated;
grant execute on function public.sn_entregar(text, jsonb) to authenticated;

-- Entrega automática (pg_cron, de 10 em 10 minutos): toda prova com prazo + 5 min vencido.
create or replace function public.sn_entregar_vencidas()
returns integer language plpgsql volatile security definer set search_path = public as $$
declare
  v record;
  v_n integer := 0;
begin
  for v in
    select sp.edicao, sp.usuario_id from public.sn_participacoes sp
    where sp.entregue_em is null and sp.prazo_em + interval '5 minutes' < now()
    order by sp.prazo_em
    for update skip locked
  loop
    perform public.sn_corrigir_interno(v.edicao, v.usuario_id, true);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.sn_entregar_vencidas() from public, anon, authenticated;
grant execute on function public.sn_entregar_vencidas() to service_role;

-- O resultado de quem entregou. Posição e percentil só para quem tem o plano (ou com a edição
-- aberto_a_todos) e entregou no prazo; o desempenho por área vai para todos;
-- as médias (geral, de tempo e por área) só das entregas no prazo.
create or replace function public.sn_resultado(p_edicao text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ed public.sn_edicoes;
  v_part public.sn_participacoes;
  v_colocados integer;
  v_media numeric;
  v_media_segundos integer;
  v_posicao integer;
  v_areas jsonb;
begin
  if v_uid is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select * into v_ed from public.sn_edicoes e where e.edicao = p_edicao;
  select * into v_part from public.sn_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = v_uid;
  if not found or v_part.entregue_em is null then raise exception 'nao_entregue' using errcode = '22023'; end if;

  select count(*), round(avg(sp.acertos::numeric * 100 / nullif(sp.total, 0)), 1), round(avg(sp.segundos))::integer
    into v_colocados, v_media, v_media_segundos
  from public.sn_participacoes sp where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo;

  if v_part.no_tempo and (v_ed.aberto_a_todos or public.tem_premium_interno(v_uid)) then
    select o.posicao into v_posicao from (
      select sp.usuario_id, row_number() over (order by sp.acertos desc, sp.segundos asc, sp.entregue_em asc) as posicao
      from public.sn_participacoes sp where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo) o
    where o.usuario_id = v_uid;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('area', k.area, 'certas', (k.v->>'certas')::int, 'total', (k.v->>'total')::int,
           'media', (select round(avg((sp.por_area->k.area->>'certas')::numeric * 100 / nullif((sp.por_area->k.area->>'total')::numeric, 0)), 1)
                     from public.sn_participacoes sp
                     where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo and sp.por_area ? k.area)) order by k.area), '[]'::jsonb)
    into v_areas
  from jsonb_each(coalesce(v_part.por_area, '{}'::jsonb)) k(area, v);

  return jsonb_build_object(
    'acertos', v_part.acertos, 'total', v_part.total, 'segundos', v_part.segundos, 'no_tempo', v_part.no_tempo,
    'entregue_em', v_part.entregue_em,
    'posicao', v_posicao, 'colocados', v_colocados,
    'percentil', case when v_posicao is null then null
                      when v_colocados > 1 then round(100 - (v_posicao - 1)::numeric * 100 / (v_colocados - 1))::int
                      else 100 end,
    'media', v_media, 'media_segundos', v_media_segundos,
    'por_area', v_areas,
    'encerrada', now() > v_ed.fecha_em);
end $$;
revoke all on function public.sn_resultado(text) from public, anon, authenticated;
grant execute on function public.sn_resultado(text) to authenticated;

-- Ranking (geral ou de uma área): acertos desc, segundos asc, entregue_em asc; só entregas no prazo.
-- Quem saiu do ranking (perfis_publicos.participa_ranking = false ou ranking_ocultos) não aparece,
-- mas continua ocupando a posição; a própria pessoa sempre se vê. O apelido é o do ranking atual.
create or replace function public.sn_ranking(p_edicao text, p_area text default null, p_limite integer default 10)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_limite integer := least(greatest(coalesce(p_limite, 10), 1), 100);
  v_colocados integer;
  v_entregas_no_tempo integer;
  v_ordem jsonb;
  v_top jsonb;
  v_voce jsonb;
  v_melhores jsonb := '[]'::jsonb;
begin
  if not public.sn_visivel_interno(p_edicao) then raise exception 'edicao_invalida' using errcode = '22023'; end if;

  -- A classificação inteira, uma vez, como jsonb (a função é stable: sem tabela temporária).
  select coalesce(jsonb_agg(jsonb_build_object('usuario_id', o.usuario_id, 'posicao', o.posicao, 'acertos', o.acertos, 'total', o.total,
                                               'segundos', o.segundos, 'visivel', o.visivel) order by o.posicao), '[]'::jsonb)
    into v_ordem
  from (
    select b.usuario_id, row_number() over (order by b.acertos desc, b.segundos asc, b.entregue_em asc)::int as posicao,
           b.acertos, b.total, b.segundos,
           coalesce(pp.participa_ranking, true) and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = b.usuario_id) as visivel
    from (
      select sp.usuario_id, sp.segundos, sp.entregue_em,
             case when p_area is null then sp.acertos else (sp.por_area->p_area->>'certas')::int end as acertos,
             case when p_area is null then sp.total else (sp.por_area->p_area->>'total')::int end as total
      from public.sn_participacoes sp
      where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo and (p_area is null or sp.por_area ? p_area)
    ) b
    left join public.perfis_publicos pp on pp.usuario_id = b.usuario_id
  ) o;

  v_colocados := jsonb_array_length(v_ordem);
  select coalesce(jsonb_agg(jsonb_build_object('posicao', r.posicao, 'apelido', public.apelido_publico_interno(r.usuario_id),
           'acertos', r.acertos, 'total', r.total, 'segundos', r.segundos, 'eh_voce', r.usuario_id is not distinct from v_uid) order by r.posicao), '[]'::jsonb)
    into v_top
  from jsonb_to_recordset(v_ordem) r(usuario_id uuid, posicao integer, acertos integer, total integer, segundos integer, visivel boolean)
  where r.posicao <= v_limite and (r.visivel or r.usuario_id is not distinct from v_uid);
  select jsonb_build_object('posicao', r.posicao, 'acertos', r.acertos, 'total', r.total, 'segundos', r.segundos)
    into v_voce
  from jsonb_to_recordset(v_ordem) r(usuario_id uuid, posicao integer, acertos integer, total integer, segundos integer, visivel boolean)
  where r.usuario_id = v_uid;

  select count(*) into v_entregas_no_tempo from public.sn_participacoes sp where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo;
  if v_entregas_no_tempo >= 10 then
    select coalesce(jsonb_agg(jsonb_build_object('area', m.area, 'apelido', public.apelido_publico_interno(m.usuario_id), 'certas', m.certas, 'total', m.total) order by m.area), '[]'::jsonb)
      into v_melhores
    from (
      select distinct on (k.area) k.area, sp.usuario_id, (k.v->>'certas')::int as certas, (k.v->>'total')::int as total
      from public.sn_participacoes sp
      cross join lateral jsonb_each(sp.por_area) k(area, v)
      left join public.perfis_publicos pp on pp.usuario_id = sp.usuario_id
      where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo
        and coalesce(pp.participa_ranking, true) and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = sp.usuario_id)
      order by k.area, (k.v->>'certas')::int desc, sp.segundos asc, sp.entregue_em asc
    ) m;
  end if;

  return jsonb_build_object('colocados', v_colocados, 'top', v_top, 'voce', v_voce, 'melhores_por_area', v_melhores);
end $$;
revoke all on function public.sn_ranking(text, text, integer) from public;
grant execute on function public.sn_ranking(text, text, integer) to anon, authenticated;

-- Gabarito (letra nova) e o que a pessoa marcou, só depois de entregar.
create or replace function public.sn_gabarito(p_edicao text)
returns table (ordem integer, id_questao text, permutacao text, gabarito char(1), marcada char(1))
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if not exists (select 1 from public.sn_participacoes sp where sp.edicao = p_edicao and sp.usuario_id = auth.uid() and sp.entregue_em is not null) then
    raise exception 'nao_entregue' using errcode = '22023';
  end if;
  return query
    select i.ordem, i.id_questao, i.permutacao, i.gabarito, (sp.respostas->>i.id_questao)::char(1)
    from public.sn_itens i
    join public.sn_participacoes sp on sp.edicao = i.edicao and sp.usuario_id = auth.uid()
    where i.edicao = p_edicao order by i.ordem;
end $$;
revoke all on function public.sn_gabarito(text) from public, anon, authenticated;
grant execute on function public.sn_gabarito(text) to authenticated;

-- Inscrição: qualquer conta, enquanto a edição está publicada e não fechou. Repetir não muda a data.
-- inscritos: o total, só a partir de 10 (como na página).
create or replace function public.sn_inscrever(p_edicao text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ed public.sn_edicoes;
begin
  if v_uid is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select * into v_ed from public.sn_edicoes e where e.edicao = p_edicao and e.publicado;
  if not found then raise exception 'edicao_invalida' using errcode = '22023'; end if;
  if now() > v_ed.fecha_em then raise exception 'edicao_fechada' using errcode = '22023'; end if;
  insert into public.sn_inscricoes (edicao, usuario_id) values (p_edicao, v_uid) on conflict (edicao, usuario_id) do nothing;
  return jsonb_build_object(
    'inscrito_em', (select i.inscrito_em from public.sn_inscricoes i where i.edicao = p_edicao and i.usuario_id = v_uid),
    'inscritos', public.sn_inscritos_publico_interno(p_edicao));
end $$;
revoke all on function public.sn_inscrever(text) from public, anon, authenticated;
grant execute on function public.sn_inscrever(text) to authenticated;

-- Cancela a inscrição (e o lembrete). Quem já começou a prova continua com ela.
create or replace function public.sn_cancelar_inscricao(p_edicao text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if not exists (select 1 from public.sn_edicoes e where e.edicao = p_edicao and e.publicado) then raise exception 'edicao_invalida' using errcode = '22023'; end if;
  delete from public.sn_inscricoes i where i.edicao = p_edicao and i.usuario_id = v_uid;
  return jsonb_build_object('inscrito_em', null, 'inscritos', public.sn_inscritos_publico_interno(p_edicao));
end $$;
revoke all on function public.sn_cancelar_inscricao(text) from public, anon, authenticated;
grant execute on function public.sn_cancelar_inscricao(text) to authenticated;

-- A função enviar-email marca o lembrete enviado (só o service role).
create or replace function public.sn_marcar_lembrete(p_edicao text, p_usuario uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
begin
  update public.sn_inscricoes i set lembrete_enviado_em = coalesce(i.lembrete_enviado_em, now())
  where i.edicao = p_edicao and i.usuario_id = p_usuario;
  return found;
end $$;
revoke all on function public.sn_marcar_lembrete(text, uuid) from public, anon, authenticated;
grant execute on function public.sn_marcar_lembrete(text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4. O painel do administrador
-- ---------------------------------------------------------------------------

create or replace function public.sn_admin_listar()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.sn_exigir_admin_interno();
  return coalesce((select jsonb_agg(public.sn_resumo_admin_interno(e.edicao) order by e.abre_em desc, e.edicao desc) from public.sn_edicoes e), '[]'::jsonb);
end $$;
revoke all on function public.sn_admin_listar() from public, anon, authenticated;
grant execute on function public.sn_admin_listar() to authenticated;

-- Cria ou regrava uma edição. Cada item: {ordem, id_questao, area, foco, gabarito_original, permutacao};
-- o gabarito novo é calculado aqui. Com participantes, os itens, o tipo e a duração não mudam
-- (edicao_com_participantes) e as datas seguem as regras de sn_admin_datas.
-- p_descricao null mantém a atual; p_config vazio ({}) mantém a atual.
-- (Versões anteriores desta parte, com menos parâmetros, saem antes: a chamada continua compatível.)
drop function if exists public.sn_admin_salvar(text, text, text, timestamptz, timestamptz, integer, jsonb, boolean);
drop function if exists public.sn_admin_salvar(text, text, text, timestamptz, timestamptz, integer, jsonb, boolean, text, boolean, jsonb);
create or replace function public.sn_admin_salvar(
  p_edicao text, p_tipo text, p_titulo text, p_abre_em timestamptz, p_fecha_em timestamptz, p_duracao_min integer,
  p_itens jsonb, p_publicar boolean, p_descricao text default null, p_destaque_inicio boolean default true, p_config jsonb default '{}'::jsonb,
  p_aberto_a_todos boolean default false)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_ed public.sn_edicoes;
  v_tem_participantes boolean;
  v_mudou_itens boolean;
begin
  perform public.sn_exigir_admin_interno();
  if p_tipo is null or p_tipo not in ('mensal', 'vespera') or p_edicao is null
     or (p_tipo = 'mensal' and p_edicao !~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
     or (p_tipo = 'vespera' and (p_edicao !~ '^[0-9]{4}-(0[1-9]|1[0-2])-vespera-[a-z0-9]+(-[a-z0-9]+)*$' or char_length(p_edicao) > 60)) then
    raise exception 'edicao_invalida' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_titulo, ''))) not between 3 and 120 then raise exception 'titulo_invalido' using errcode = '22023'; end if;
  if p_abre_em is null or p_fecha_em is null or p_fecha_em <= p_abre_em then raise exception 'datas_invalidas' using errcode = '22023'; end if;
  if p_duracao_min is null or p_duracao_min not between 10 and 360 then raise exception 'duracao_invalida' using errcode = '22023'; end if;
  if p_config is not null and jsonb_typeof(p_config) <> 'object' then raise exception 'config_invalida' using errcode = '22023'; end if;
  perform 1 from public.sn_itens_validados_interno(p_itens);

  select * into v_ed from public.sn_edicoes e where e.edicao = p_edicao for update;
  v_tem_participantes := exists (select 1 from public.sn_participacoes sp where sp.edicao = p_edicao);
  if v_ed.edicao is not null and v_tem_participantes then
    select exists (
      (select v.ordem, v.id_questao, v.area, v.foco, v.gabarito_original, v.permutacao from public.sn_itens_validados_interno(p_itens) v
       except select i.ordem, i.id_questao, i.area, i.foco, i.gabarito_original, i.permutacao from public.sn_itens i where i.edicao = p_edicao)
      union all
      (select i.ordem, i.id_questao, i.area, i.foco, i.gabarito_original, i.permutacao from public.sn_itens i where i.edicao = p_edicao
       except select v.ordem, v.id_questao, v.area, v.foco, v.gabarito_original, v.permutacao from public.sn_itens_validados_interno(p_itens) v)
    ) into v_mudou_itens;
    if v_mudou_itens or p_tipo <> v_ed.tipo or p_duracao_min <> v_ed.duracao_min or not coalesce(p_publicar, v_ed.publicado) then
      raise exception 'edicao_com_participantes' using errcode = '22023';
    end if;
    perform public.sn_conferir_datas_interno(v_ed, p_abre_em, p_fecha_em);
  end if;

  insert into public.sn_edicoes as e (edicao, tipo, titulo, descricao, destaque_inicio, config, aberto_a_todos, abre_em, fecha_em, duracao_min, publicado)
  values (p_edicao, p_tipo, btrim(p_titulo), nullif(btrim(coalesce(p_descricao, '')), ''), coalesce(p_destaque_inicio, true),
          coalesce(p_config, '{}'::jsonb), coalesce(p_aberto_a_todos, false), p_abre_em, p_fecha_em, p_duracao_min, coalesce(p_publicar, false))
  on conflict (edicao) do update set
    tipo = excluded.tipo, titulo = excluded.titulo,
    descricao = case when p_descricao is null then e.descricao else excluded.descricao end,
    destaque_inicio = excluded.destaque_inicio,
    aberto_a_todos = excluded.aberto_a_todos,
    config = case when p_config is null or p_config = '{}'::jsonb then e.config else excluded.config end,
    abre_em = excluded.abre_em, fecha_em = excluded.fecha_em, duracao_min = excluded.duracao_min,
    publicado = case when p_publicar is null then e.publicado else excluded.publicado end,
    atualizado_em = now();

  if not v_tem_participantes then
    delete from public.sn_itens i where i.edicao = p_edicao;
    insert into public.sn_itens (edicao, ordem, id_questao, area, foco, gabarito_original, permutacao, gabarito)
    select p_edicao, v.ordem, v.id_questao, v.area, v.foco, v.gabarito_original, v.permutacao, v.gabarito
    from public.sn_itens_validados_interno(p_itens) v;
  end if;
  return public.sn_resumo_admin_interno(p_edicao);
end $$;
revoke all on function public.sn_admin_salvar(text, text, text, timestamptz, timestamptz, integer, jsonb, boolean, text, boolean, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.sn_admin_salvar(text, text, text, timestamptz, timestamptz, integer, jsonb, boolean, text, boolean, jsonb, boolean) to authenticated;

-- Título, descrição, a chamada na página inicial e o aberto_a_todos, a qualquer hora (mesmo com
-- participantes). null mantém o valor atual; descrição vazia ('') apaga.
drop function if exists public.sn_admin_config(text, text, text, boolean);
create or replace function public.sn_admin_config(p_edicao text, p_titulo text, p_descricao text, p_destaque_inicio boolean, p_aberto_a_todos boolean default null)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.sn_exigir_admin_interno();
  if not exists (select 1 from public.sn_edicoes e where e.edicao = p_edicao) then raise exception 'edicao_invalida' using errcode = '22023'; end if;
  if p_titulo is not null and char_length(btrim(p_titulo)) not between 3 and 120 then raise exception 'titulo_invalido' using errcode = '22023'; end if;
  update public.sn_edicoes e set
    titulo = coalesce(btrim(p_titulo), e.titulo),
    descricao = case when p_descricao is null then e.descricao else nullif(btrim(p_descricao), '') end,
    destaque_inicio = coalesce(p_destaque_inicio, e.destaque_inicio),
    aberto_a_todos = coalesce(p_aberto_a_todos, e.aberto_a_todos),
    atualizado_em = now()
  where e.edicao = p_edicao;
  return public.sn_resumo_admin_interno(p_edicao);
end $$;
revoke all on function public.sn_admin_config(text, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.sn_admin_config(text, text, text, boolean, boolean) to authenticated;

-- Troca uma questão (pela mesma ordem). Só sem participantes.
create or replace function public.sn_admin_trocar_item(p_edicao text, p_ordem integer, p_item jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_n integer;
  v_novos jsonb;
begin
  perform public.sn_exigir_admin_interno();
  if not exists (select 1 from public.sn_edicoes e where e.edicao = p_edicao) then raise exception 'edicao_invalida' using errcode = '22023'; end if;
  if exists (select 1 from public.sn_participacoes sp where sp.edicao = p_edicao) then raise exception 'edicao_com_participantes' using errcode = '22023'; end if;
  if jsonb_typeof(p_item) is distinct from 'object' or not exists (select 1 from public.sn_itens i where i.edicao = p_edicao and i.ordem = p_ordem) then
    raise exception 'itens_invalidos' using errcode = '22023';
  end if;
  -- A edição inteira com o item trocado passa pela mesma validação (ids repetidos, permutação, gabarito).
  select jsonb_agg(case when i.ordem = p_ordem then p_item || jsonb_build_object('ordem', p_ordem)
                        else jsonb_build_object('ordem', i.ordem, 'id_questao', i.id_questao, 'area', i.area, 'foco', i.foco,
                                                'gabarito_original', i.gabarito_original, 'permutacao', i.permutacao) end order by i.ordem)
    into v_novos
  from public.sn_itens i where i.edicao = p_edicao;
  perform 1 from public.sn_itens_validados_interno(v_novos);
  update public.sn_itens i set id_questao = v.id_questao, area = v.area, foco = v.foco, gabarito_original = v.gabarito_original,
         permutacao = v.permutacao, gabarito = v.gabarito
  from public.sn_itens_validados_interno(v_novos) v
  where i.edicao = p_edicao and i.ordem = p_ordem and v.ordem = p_ordem;
  get diagnostics v_n = row_count;
  update public.sn_edicoes e set atualizado_em = now() where e.edicao = p_edicao;
  return public.sn_resumo_admin_interno(p_edicao);
end $$;
revoke all on function public.sn_admin_trocar_item(text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.sn_admin_trocar_item(text, integer, jsonb) to authenticated;

-- Publica ou despublica. Despublicar só sem participantes; publicar exige pelo menos 10 itens.
create or replace function public.sn_admin_publicar(p_edicao text, p_publicado boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  perform public.sn_exigir_admin_interno();
  if not exists (select 1 from public.sn_edicoes e where e.edicao = p_edicao) then raise exception 'edicao_invalida' using errcode = '22023'; end if;
  if not coalesce(p_publicado, false) and exists (select 1 from public.sn_participacoes sp where sp.edicao = p_edicao) then
    raise exception 'edicao_com_participantes' using errcode = '22023';
  end if;
  if coalesce(p_publicado, false) and (select count(*) from public.sn_itens i where i.edicao = p_edicao) < 10 then
    raise exception 'itens_invalidos' using errcode = '22023';
  end if;
  update public.sn_edicoes e set publicado = coalesce(p_publicado, false), atualizado_em = now() where e.edicao = p_edicao;
  return public.sn_resumo_admin_interno(p_edicao);
end $$;
revoke all on function public.sn_admin_publicar(text, boolean) from public, anon, authenticated;
grant execute on function public.sn_admin_publicar(text, boolean) to authenticated;

-- Muda as datas: antes de abrir, livre; depois de aberta (publicada e abre_em no passado), só estende
-- o fechamento. null mantém a data atual.
create or replace function public.sn_admin_datas(p_edicao text, p_abre_em timestamptz, p_fecha_em timestamptz)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_ed public.sn_edicoes;
begin
  perform public.sn_exigir_admin_interno();
  select * into v_ed from public.sn_edicoes e where e.edicao = p_edicao for update;
  if not found then raise exception 'edicao_invalida' using errcode = '22023'; end if;
  perform public.sn_conferir_datas_interno(v_ed, coalesce(p_abre_em, v_ed.abre_em), coalesce(p_fecha_em, v_ed.fecha_em));
  update public.sn_edicoes e set abre_em = coalesce(p_abre_em, e.abre_em), fecha_em = coalesce(p_fecha_em, e.fecha_em), atualizado_em = now()
  where e.edicao = p_edicao;
  return public.sn_resumo_admin_interno(p_edicao);
end $$;
revoke all on function public.sn_admin_datas(text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.sn_admin_datas(text, timestamptz, timestamptz) to authenticated;

-- Acompanhar: participantes, entregas, média (no prazo), por área (no prazo) e as 10 questões que mais erraram.
create or replace function public.sn_admin_estatisticas(p_edicao text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  perform public.sn_exigir_admin_interno();
  if not exists (select 1 from public.sn_edicoes e where e.edicao = p_edicao) then raise exception 'edicao_invalida' using errcode = '22023'; end if;
  return jsonb_build_object(
    'inscritos', (select count(*) from public.sn_inscricoes i where i.edicao = p_edicao),
    'participantes', (select count(*) from public.sn_participacoes sp where sp.edicao = p_edicao),
    'entregas', (select count(*) from public.sn_participacoes sp where sp.edicao = p_edicao and sp.entregue_em is not null),
    'no_tempo', (select count(*) from public.sn_participacoes sp where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo),
    'media', (select round(avg(sp.acertos::numeric * 100 / nullif(sp.total, 0)), 1) from public.sn_participacoes sp
              where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo),
    'por_area', coalesce((select jsonb_agg(jsonb_build_object('area', t.area, 'certas', t.certas, 'total', t.total,
                                   'media', round(t.certas::numeric * 100 / nullif(t.total, 0), 1)) order by t.area)
                          from (select k.area, sum((k.v->>'certas')::int) as certas, sum((k.v->>'total')::int) as total
                                from public.sn_participacoes sp cross join lateral jsonb_each(sp.por_area) k(area, v)
                                where sp.edicao = p_edicao and sp.entregue_em is not null and sp.no_tempo
                                group by k.area) t), '[]'::jsonb),
    'mais_erradas', coalesce((select jsonb_agg(jsonb_build_object('id_questao', t.id_questao, 'ordem', t.ordem, 'erros', t.erros, 'total', t.total) order by t.erros desc, t.ordem)
                              from (select i.id_questao, i.ordem,
                                           count(*) filter (where (sp.respostas->>i.id_questao) is distinct from i.gabarito::text) as erros,
                                           count(*) as total
                                    from public.sn_itens i
                                    join public.sn_participacoes sp on sp.edicao = i.edicao and sp.entregue_em is not null
                                    where i.edicao = p_edicao
                                    group by i.id_questao, i.ordem
                                    order by erros desc, i.ordem limit 10) t), '[]'::jsonb));
end $$;
revoke all on function public.sn_admin_estatisticas(text) from public, anon, authenticated;
grant execute on function public.sn_admin_estatisticas(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Compatibilidade
-- ---------------------------------------------------------------------------

-- autorizar_resposta: a versão de 202610110100_limite_janela_24h.sql, copiada como está, mais um caso:
-- as questões de uma prova sn_ aberta (não entregue, até prazo_em + 30 min) não gastam o limite grátis.
create or replace function public.autorizar_resposta(p_chave_idempotencia uuid, p_id_questao text)
returns table (permitido boolean, paywall_ativo boolean, ilimitado boolean, consumidas integer, limite integer, restantes integer, libera_em timestamptz, sequencia integer, motivo text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_agora timestamptz := clock_timestamp();
  v_dia date := (v_agora at time zone 'America/Sao_Paulo')::date;
  v_janela interval := interval '24 hours';
  v_libera timestamptz := v_agora + interval '24 hours';
  v_config public.configuracao_comercial%rowtype;
  v_teste boolean := false;
  v_ilimitado boolean := false;
  v_consumidas integer := 0;
  v_inicio timestamptz;
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
      or exists(select 1 from public.sn_participacoes snp
                join public.sn_itens sni on sni.edicao = snp.edicao and sni.id_questao = regexp_replace(p_id_questao, '^r[0-9]+:', '')
                where snp.usuario_id = v_usuario and snp.entregue_em is null
                  and v_agora <= snp.prazo_em + interval '30 minutes')
    into v_ilimitado;
  if not v_ilimitado then
  select exists(select 1 from public.assinaturas a where a.id_usuario=v_usuario and (a.status='ativa' or (a.status='cancelada' and a.cancelar_ao_fim)) and coalesce(a.fim_periodo, 'infinity') > v_agora) into v_ilimitado;
  end if;
  if v_ilimitado then
    insert into public.respostas_autorizadas values (p_chave_idempotencia,v_usuario,p_id_questao,v_dia,false,v_agora) on conflict do nothing;
    return query select true, true, true, 0, limite, null::integer, v_libera, 0, null::text;
    return;
  end if;

  -- A janela é travada antes de qualquer leitura: duas abas respondendo ao
  -- mesmo tempo não passam juntas da 20ª questão.
  insert into public.janela_gratis(id_usuario, inicio, quantidade) values (v_usuario, v_agora, 0) on conflict do nothing;
  select j.inicio, j.quantidade into v_inicio, v_consumidas from public.janela_gratis j where j.id_usuario=v_usuario for update;
  if v_inicio + v_janela <= v_agora then
    -- Janela vencida: a próxima questão contabilizada abre outra a partir de agora.
    update public.janela_gratis set inicio=v_agora, quantidade=0, atualizado_em=v_agora where id_usuario=v_usuario;
    v_inicio := v_agora;
    v_consumidas := 0;
  end if;
  v_libera := v_inicio + v_janela;

  -- Repetição da mesma resposta (rede instável, duas abas): não gasta de novo.
  if exists(select 1 from public.respostas_autorizadas where chave_idempotencia=p_chave_idempotencia and id_usuario=v_usuario) then
    return query select true,true,false,v_consumidas,limite,greatest(limite-v_consumidas,0),v_libera,0,null::text;
    return;
  end if;

  if v_consumidas >= limite then
    with dias as (select dia, dia - row_number() over(order by dia)::int as grupo from public.consumo_diario where id_usuario=v_usuario and quantidade>0 and dia<=v_dia), atual as (select grupo from dias where dia >= v_dia - 1 order by dia desc limit 1) select count(*) into v_sequencia from dias where grupo=(select grupo from atual);
    return query select false,true,false,v_consumidas,limite,0,v_libera,coalesce(v_sequencia,0),'Você atingiu o limite de questões grátis.'::text;
    return;
  end if;

  insert into public.respostas_autorizadas values(p_chave_idempotencia,v_usuario,p_id_questao,v_dia,true,v_agora);
  update public.janela_gratis set quantidade=quantidade+1, atualizado_em=v_agora where id_usuario=v_usuario returning quantidade into v_consumidas;
  insert into public.consumo_diario(id_usuario,dia,quantidade,atualizado_em) values(v_usuario,v_dia,1,v_agora)
    on conflict (id_usuario,dia) do update set quantidade=public.consumo_diario.quantidade+1, atualizado_em=v_agora;
  return query select true,true,false,v_consumidas,limite,greatest(limite-v_consumidas,0),v_libera,0,null::text;
end $$;
revoke all on function public.autorizar_resposta(uuid,text) from public;
grant execute on function public.autorizar_resposta(uuid,text) to authenticated;

-- meus_feitos: a versão de 202610070500_emblemas_dificeis.sql, copiada como está. Mudam só as duas
-- chaves do simulado: as edições mensais novas (sn_edicoes publicadas) entram ao lado das antigas, e as
-- entregas no prazo das mensais novas contam como as antigas. Uma linha por edição: se a pessoa fez o
-- outubro antigo e o novo, fica a melhor colocação.
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
    -- Edições mensais já abertas (antigas e novas) e a classificação da pessoa em cada uma que entregou no tempo.
    'simulado_edicoes', coalesce((select jsonb_agg(m.edicao order by m.edicao) from (
        select e.edicao from public.simulado_edicoes e
        where e.edicao ~ '^[0-9]{4}-[0-9]{2}$' and e.abre_em <= now()
        union
        select s.edicao from public.sn_edicoes s
        where s.tipo = 'mensal' and s.publicado and s.abre_em <= now()) m), '[]'::jsonb),
    'simulado_participacoes', coalesce((select jsonb_agg(jsonb_build_object('edicao', d.edicao, 'posicao', d.posicao, 'classificados', d.classificados) order by d.edicao)
        from (
          select distinct on (o.edicao) o.edicao, o.posicao, o.classificados
          from (
            select sp.edicao, sp.usuario_id,
                   row_number() over (partition by sp.edicao order by sp.acertos desc, sp.segundos asc, sp.entregue_em asc) as posicao,
                   count(*) over (partition by sp.edicao) as classificados
            from public.simulado_participacoes sp
            where sp.entregue_em is not null and sp.no_tempo
              and sp.edicao in (select x.edicao from public.simulado_participacoes x where x.usuario_id = v_uid and x.entregue_em is not null and x.no_tempo)
            union all
            select sp.edicao, sp.usuario_id,
                   row_number() over (partition by sp.edicao order by sp.acertos desc, sp.segundos asc, sp.entregue_em asc) as posicao,
                   count(*) over (partition by sp.edicao) as classificados
            from public.sn_participacoes sp
            where sp.entregue_em is not null and sp.no_tempo
              and sp.edicao in (select x.edicao from public.sn_participacoes x join public.sn_edicoes s on s.edicao = x.edicao
                                where x.usuario_id = v_uid and x.entregue_em is not null and x.no_tempo and s.tipo = 'mensal' and s.publicado)
          ) o where o.usuario_id = v_uid
          order by o.edicao, o.posicao::numeric / o.classificados, o.classificados desc
        ) d), '[]'::jsonb),
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

-- candidatos_simulado_resultado: a versão da parte 31, com a mesma assinatura, lendo as tabelas novas
-- (edições publicadas). A posição usa o mesmo "premium" do site (tem_premium_interno, ou a edição
-- aberto_a_todos), como sn_resultado.
-- O corpo só é conferido ao rodar (check_function_bodies desligado só aqui): campanha_elegivel_interno é da
-- parte 31, e o teste da parte 31 aplica esta migração antes de colar a parte 31.
set local check_function_bodies = off;
create or replace function public.candidatos_simulado_resultado(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  with edicoes as (
    select e.edicao, e.titulo, e.aberto_a_todos from public.sn_edicoes e
    where e.publicado and e.fecha_em <= now() and e.fecha_em > now() - interval '3 days'
  ),
  entregues as (
    select sp.usuario_id, sp.edicao, ed.titulo, ed.aberto_a_todos, sp.acertos, sp.total, sp.no_tempo, sp.entregue_em,
           case when sp.no_tempo then row_number() over (partition by sp.edicao, sp.no_tempo order by sp.acertos desc, sp.segundos asc, sp.entregue_em asc) end as posicao,
           count(*) filter (where sp.no_tempo) over (partition by sp.edicao) as participantes
    from public.sn_participacoes sp
    join edicoes ed on ed.edicao = sp.edicao
    where sp.entregue_em is not null
  )
  select x.usuario_id, 'simulado_resultado:' || x.edicao,
         jsonb_build_object('edicao', x.edicao, 'titulo', x.titulo, 'acertos', x.acertos, 'total', x.total,
                            'posicao', case when x.aberto_a_todos or public.tem_premium_interno(x.usuario_id) then x.posicao end,
                            'participantes', x.participantes)
  from entregues x
  where public.campanha_elegivel_interno(x.usuario_id, 'simulado_resultado:' || x.edicao)
  order by x.entregue_em
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;
revoke all on function public.candidatos_simulado_resultado(integer) from public, anon, authenticated;
grant execute on function public.candidatos_simulado_resultado(integer) to service_role;

-- Lembrete do Simulado Nacional (campanha simulado_lembrete): quem se inscreveu numa edição publicada
-- que abre nas próximas 24 horas ("abre_amanha") ou abriu nas últimas 24 horas e não fechou
-- ("abriu_hoje"), ainda sem lembrete e sem ter começado a prova. O tipo do lembrete vai em
-- dados.tipo_lembrete (a assinatura é a mesma das outras campanhas: id_usuario, referencia, dados).
-- Um lembrete por pessoa e edição (referência simulado_lembrete:<edicao>); as travas são as da parte 31
-- (campanha_elegivel_interno: e-mail confirmado, sem administrador, quem desligou as cartas, a mesma
-- referência, a cadência).
create or replace function public.candidatos_simulado_lembrete(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, dados jsonb)
language sql stable security definer set search_path = '' as $$
  select i.usuario_id, 'simulado_lembrete:' || e.edicao,
         jsonb_build_object('edicao', e.edicao, 'titulo', e.titulo, 'tipo', e.tipo,
                            'tipo_lembrete', case when e.abre_em > now() then 'abre_amanha' else 'abriu_hoje' end,
                            'abre_em', e.abre_em, 'fecha_em', e.fecha_em, 'duracao_min', e.duracao_min,
                            'total', (select count(*) from public.sn_itens it where it.edicao = e.edicao),
                            'precisa_plano', not e.aberto_a_todos and not public.tem_premium_interno(i.usuario_id))
  from public.sn_inscricoes i
  join public.sn_edicoes e on e.edicao = i.edicao
  where e.publicado and i.lembrete_enviado_em is null
    and ((e.abre_em > now() and e.abre_em <= now() + interval '24 hours')
      or (e.abre_em <= now() and e.abre_em > now() - interval '24 hours' and now() < e.fecha_em))
    and not exists (select 1 from public.sn_participacoes sp where sp.edicao = i.edicao and sp.usuario_id = i.usuario_id)
    and public.campanha_elegivel_interno(i.usuario_id, 'simulado_lembrete:' || e.edicao)
  order by i.inscrito_em
  limit least(greatest(coalesce(p_limite, 40), 1), 80);
$$;
revoke all on function public.candidatos_simulado_lembrete(integer) from public, anon, authenticated;
grant execute on function public.candidatos_simulado_lembrete(integer) to service_role;

notify pgrst, 'reload schema';
commit;
