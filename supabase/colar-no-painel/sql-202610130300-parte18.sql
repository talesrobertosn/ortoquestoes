-- Parte 18: flashcards (limite grátis, progresso na conta, ranking da Cripta por dificuldade e opiniões do beta).
-- Rode depois das partes 1 a 17. Cole TUDO no SQL Editor do Supabase e clique em Run.
-- Pode ser rodada de novo: nada é apagado (create if not exists, create or replace, on conflict).
-- Junta, em ordem: 202610130100_flashcards_limite_e_progresso.sql, 202610130200_flashcards_ranking.sql,
-- 202610130300_flashcards_ranking_dificuldade.sql e 202610130400_flashcards_opinioes_beta.sql.

-- Torneio de Flashcards: limite do plano grátis no servidor e progresso sincronizado.
--
-- Não destrutiva: só cria tabelas, policies e funções novas. Segue o mesmo
-- padrão de autorizar_resposta (202610110100_limite_janela_24h.sql):
--   - plano grátis: 10 flashcards por janela de 24 h (docs/planos-e-limite-diario.md);
--   - assinante, administrador e cortesia: sem limite;
--   - a decisão é do servidor; o contador do cliente é só aviso;
--   - chave de idempotência: a mesma resposta repetida (rede instável, duas abas) não gasta duas vezes.
--
-- O livro de flashcards autorizados também é a fonte do ranking futuro de
-- "flashcards únicos respondidos" (repetição não conta), calculado no servidor.
--
-- Depois de aplicar, ligar no build: VITE_FLASHCARDS_LIMITE=true (com VITE_LIMITES_HABILITADOS=true).

begin;

create table if not exists public.flashcards_janela_gratis (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  inicio timestamptz not null,
  quantidade integer not null default 0 check (quantidade >= 0),
  atualizado_em timestamptz not null default now()
);
alter table public.flashcards_janela_gratis enable row level security;

create table if not exists public.flashcards_autorizados (
  chave_idempotencia uuid primary key,
  id_usuario uuid not null references auth.users(id) on delete cascade,
  id_flashcard text not null check (length(id_flashcard) <= 160),
  contabilizado boolean not null,
  criado_em timestamptz not null default now()
);
create index if not exists flashcards_autorizados_usuario_idx on public.flashcards_autorizados (id_usuario, id_flashcard);
alter table public.flashcards_autorizados enable row level security;

-- Progresso dos flashcards (fila de revisão, recordes), um registro por conta.
create table if not exists public.flashcards_progresso (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  registros jsonb not null default '{}'::jsonb,
  recordes jsonb not null default '{}'::jsonb,
  atualizado_em timestamptz not null default now(),
  constraint flashcards_progresso_tamanho check (pg_column_size(registros) < 4000000 and pg_column_size(recordes) < 20000)
);
alter table public.flashcards_progresso enable row level security;

drop policy if exists flashcards_progresso_ler on public.flashcards_progresso;
create policy flashcards_progresso_ler on public.flashcards_progresso for select to authenticated using (id_usuario = auth.uid());
drop policy if exists flashcards_progresso_inserir on public.flashcards_progresso;
create policy flashcards_progresso_inserir on public.flashcards_progresso for insert to authenticated with check (id_usuario = auth.uid());
drop policy if exists flashcards_progresso_atualizar on public.flashcards_progresso;
create policy flashcards_progresso_atualizar on public.flashcards_progresso for update to authenticated using (id_usuario = auth.uid()) with check (id_usuario = auth.uid());

create or replace function public.autorizar_flashcard(p_chave_idempotencia uuid, p_id_flashcard text)
returns table (permitido boolean, paywall_ativo boolean, ilimitado boolean, consumidas integer, limite integer, restantes integer, libera_em timestamptz, motivo text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_agora timestamptz := clock_timestamp();
  v_janela interval := interval '24 hours';
  v_libera timestamptz := v_agora + interval '24 hours';
  v_config public.configuracao_comercial%rowtype;
  v_teste boolean := false;
  v_ilimitado boolean := false;
  v_consumidas integer := 0;
  v_inicio timestamptz;
  v_limite constant integer := 10;
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_id_flashcard is null or length(p_id_flashcard) > 160 then raise exception 'flashcard_invalido'; end if;
  select * into v_config from public.configuracao_comercial where id = true;
  if not found then raise exception 'configuracao_ausente'; end if;
  select exists(select 1 from public.contas_teste where id_usuario = v_usuario and ativa) into v_teste;
  paywall_ativo := v_config.paywall_ativo or v_teste;
  limite := v_limite;

  if not paywall_ativo then
    insert into public.flashcards_autorizados values (p_chave_idempotencia, v_usuario, p_id_flashcard, false, v_agora) on conflict do nothing;
    return query select true, false, true, 0, limite, null::integer, v_libera, null::text;
    return;
  end if;

  select exists(select 1 from public.administradores adm where adm.id_usuario = v_usuario)
      or exists(select 1 from public.acessos_cortesia c where c.id_usuario = v_usuario and coalesce(c.ate, 'infinity') > v_agora)
      or exists(select 1 from public.assinaturas a where a.id_usuario = v_usuario and (a.status = 'ativa' or (a.status = 'cancelada' and a.cancelar_ao_fim)) and coalesce(a.fim_periodo, 'infinity') > v_agora)
    into v_ilimitado;
  if v_ilimitado then
    insert into public.flashcards_autorizados values (p_chave_idempotencia, v_usuario, p_id_flashcard, false, v_agora) on conflict do nothing;
    return query select true, true, true, 0, limite, null::integer, v_libera, null::text;
    return;
  end if;

  -- trava a janela antes de ler: duas abas não passam juntas do 10º flashcard
  insert into public.flashcards_janela_gratis(id_usuario, inicio, quantidade) values (v_usuario, v_agora, 0) on conflict do nothing;
  select j.inicio, j.quantidade into v_inicio, v_consumidas from public.flashcards_janela_gratis j where j.id_usuario = v_usuario for update;
  if v_inicio + v_janela <= v_agora then
    update public.flashcards_janela_gratis set inicio = v_agora, quantidade = 0, atualizado_em = v_agora where id_usuario = v_usuario;
    v_inicio := v_agora;
    v_consumidas := 0;
  end if;
  v_libera := v_inicio + v_janela;

  if exists(select 1 from public.flashcards_autorizados where chave_idempotencia = p_chave_idempotencia and id_usuario = v_usuario) then
    return query select true, true, false, v_consumidas, limite, greatest(limite - v_consumidas, 0), v_libera, null::text;
    return;
  end if;

  if v_consumidas >= limite then
    return query select false, true, false, v_consumidas, limite, 0, v_libera, 'Você atingiu o limite de flashcards grátis.'::text;
    return;
  end if;

  insert into public.flashcards_autorizados values (p_chave_idempotencia, v_usuario, p_id_flashcard, true, v_agora);
  update public.flashcards_janela_gratis set quantidade = quantidade + 1, atualizado_em = v_agora where id_usuario = v_usuario returning quantidade into v_consumidas;
  return query select true, true, false, v_consumidas, limite, greatest(limite - v_consumidas, 0), v_libera, null::text;
end $$;
revoke all on function public.autorizar_flashcard(uuid, text) from public;
grant execute on function public.autorizar_flashcard(uuid, text) to authenticated;

-- Flashcards únicos respondidos pela própria conta (base do ranking futuro).
create or replace function public.flashcards_unicos()
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select count(distinct id_flashcard)::integer from public.flashcards_autorizados where id_usuario = auth.uid()
$$;
revoke all on function public.flashcards_unicos() from public;
grant execute on function public.flashcards_unicos() to authenticated;

-- Sincronização do progresso: o cliente mescla (por flashcard, vale a resposta mais recente) e grava o resultado.
create or replace function public.salvar_progresso_flashcards(p_registros jsonb, p_recordes jsonb)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if jsonb_typeof(p_registros) <> 'object' or jsonb_typeof(p_recordes) <> 'object' then raise exception 'formato_invalido'; end if;
  insert into public.flashcards_progresso(id_usuario, registros, recordes, atualizado_em) values (auth.uid(), p_registros, p_recordes, now())
    on conflict (id_usuario) do update set registros = excluded.registros, recordes = excluded.recordes, atualizado_em = now();
end $$;
revoke all on function public.salvar_progresso_flashcards(jsonb, jsonb) from public;
grant execute on function public.salvar_progresso_flashcards(jsonb, jsonb) to authenticated;

create or replace function public.ler_progresso_flashcards()
returns table (registros jsonb, recordes jsonb, atualizado_em timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.registros, p.recordes, p.atualizado_em from public.flashcards_progresso p where p.id_usuario = auth.uid()
$$;
revoke all on function public.ler_progresso_flashcards() from public;
grant execute on function public.ler_progresso_flashcards() to authenticated;

commit;

-- Cripta do Residente: ranking da Cripta (andar mais fundo), da Torre do Título
-- (andar mais alto) e de flashcards únicos respondidos.
--
-- Não destrutiva: cria uma tabela de corridas, uma coluna opcional no livro de
-- flashcards autorizados e funções novas. Nada é apagado nem reescrito.
-- Depende de 202610130100_flashcards_limite_e_progresso.sql.
--
-- Anti-trapaça (o cliente nunca decide o recorde sozinho):
--   - cada partida abre uma corrida no servidor (iniciar_corrida_flashcards);
--   - cada flashcard autorizado com a corrida conta para ela;
--   - registrar_andar_flashcards só aceita o andar se a corrida tiver pelo
--     menos 2 flashcards autorizados por andar vencido e não andar para trás;
--   - a Torre não passa de 100.
-- Os ids e os nomes seguem o ranking geral (apelido público, ocultos fora).
--
-- Ligar no build depois de aplicar: VITE_FLASHCARDS_RANKING=1.

begin;

alter table public.flashcards_autorizados add column if not exists id_corrida uuid null;
create index if not exists flashcards_autorizados_corrida_idx on public.flashcards_autorizados (id_corrida) where id_corrida is not null;

create table if not exists public.flashcards_corridas (
  id uuid primary key,
  id_usuario uuid not null references auth.users(id) on delete cascade,
  modo text not null check (modo in ('masmorra', 'torre')),
  andar integer not null default 1 check (andar between 1 and 10000),
  iniciada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index if not exists flashcards_corridas_usuario_idx on public.flashcards_corridas (id_usuario, modo, andar desc);
alter table public.flashcards_corridas enable row level security;
drop policy if exists flashcards_corridas_ler on public.flashcards_corridas;
create policy flashcards_corridas_ler on public.flashcards_corridas for select to authenticated using (id_usuario = auth.uid());

create or replace function public.iniciar_corrida_flashcards(p_id uuid, p_modo text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_modo not in ('masmorra', 'torre') then raise exception 'modo_invalido'; end if;
  insert into public.flashcards_corridas(id, id_usuario, modo) values (p_id, auth.uid(), p_modo) on conflict (id) do nothing;
end $$;
revoke all on function public.iniciar_corrida_flashcards(uuid, text) from public;
grant execute on function public.iniciar_corrida_flashcards(uuid, text) to authenticated;

-- Liga um flashcard já autorizado (pela chave de idempotência) à corrida da conta.
create or replace function public.vincular_flashcard_corrida(p_chave_idempotencia uuid, p_corrida uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  update public.flashcards_autorizados a set id_corrida = p_corrida
   where a.chave_idempotencia = p_chave_idempotencia and a.id_usuario = auth.uid() and a.id_corrida is null
     and exists (select 1 from public.flashcards_corridas c where c.id = p_corrida and c.id_usuario = auth.uid());
end $$;
revoke all on function public.vincular_flashcard_corrida(uuid, uuid) from public;
grant execute on function public.vincular_flashcard_corrida(uuid, uuid) to authenticated;

create or replace function public.registrar_andar_flashcards(p_corrida uuid, p_andar integer)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_corrida public.flashcards_corridas%rowtype;
  v_respostas integer;
  v_aceito integer;
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select * into v_corrida from public.flashcards_corridas where id = p_corrida and id_usuario = auth.uid() for update;
  if not found then raise exception 'corrida_inexistente'; end if;
  select count(*) into v_respostas from public.flashcards_autorizados where id_corrida = p_corrida and id_usuario = auth.uid();
  -- no mínimo 2 flashcards por andar vencido (ninguém vence um adversário em menos)
  v_aceito := least(greatest(p_andar, 1), 1 + v_respostas / 2, case when v_corrida.modo = 'torre' then 100 else 10000 end);
  if v_aceito > v_corrida.andar then
    update public.flashcards_corridas set andar = v_aceito, atualizada_em = now() where id = p_corrida;
  end if;
  return greatest(v_aceito, v_corrida.andar);
end $$;
revoke all on function public.registrar_andar_flashcards(uuid, integer) from public;
grant execute on function public.registrar_andar_flashcards(uuid, integer) to authenticated;

-- Ranking: 'masmorra' (andar mais fundo), 'torre' (andar mais alto) ou 'unicos' (flashcards únicos).
create or replace function public.ranking_flashcards(p_tipo text)
returns table(posicao bigint, apelido text, valor bigint, eh_voce boolean)
language sql security definer set search_path = '' stable as $$
  with valores as (
    select c.id_usuario as usuario_id, max(c.andar)::bigint as valor, min(c.atualizada_em) as quando
      from public.flashcards_corridas c
     where p_tipo in ('masmorra', 'torre') and c.modo = p_tipo
     group by c.id_usuario
    union all
    select a.id_usuario, count(distinct a.id_flashcard)::bigint, min(a.criado_em)
      from public.flashcards_autorizados a
     where p_tipo = 'unicos'
     group by a.id_usuario
  ),
  ranking as (
    select coalesce(pp.apelido, public.nome_publico_ranking(u.raw_user_meta_data)) as apelido, v.valor, v.usuario_id,
           row_number() over (order by v.valor desc, v.quando asc) as posicao
      from valores v
      join auth.users u on u.id = v.usuario_id
      left join public.perfis_publicos pp on pp.usuario_id = v.usuario_id
     where coalesce(pp.participa_ranking, true)
       and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = v.usuario_id)
  )
  select posicao, apelido, valor, usuario_id = auth.uid() as eh_voce from ranking order by posicao limit 50;
$$;
revoke all on function public.ranking_flashcards(text) from public;
grant execute on function public.ranking_flashcards(text) to authenticated, anon;

commit;

-- Cripta do Residente: ranking separado por dificuldade (Normal e Difícil).
--
-- Não destrutiva: só acrescenta uma coluna com valor padrão e funções novas.
-- Depende de 202610130100_flashcards_limite_e_progresso.sql e de
-- 202610130200_flashcards_ranking.sql.
--
-- Regras (diretriz do Tales, 13/10/2026):
--   - a dificuldade é gravada quando a corrida abre e não muda depois
--     (não há função que a altere; o "on conflict do nothing" impede trocar);
--   - o Fácil não entra na competição: o servidor recusa abrir corrida Fácil;
--   - indicador: o maior andar aceito pelo servidor numa corrida (a mesma
--     validação de 202610130200: 2 flashcards autorizados por andar vencido,
--     nunca para trás, Torre até 100);
--   - desempate determinístico: quem chegou primeiro àquele andar (o momento
--     em que o servidor aceitou o andar, guardado em atualizada_em) e, por fim,
--     o id da conta;
--   - só apelido público e posição; nunca e-mail. Respeita quem saiu do ranking.
-- As corridas abertas antes desta parte ficam como Normal (o ranking estava
-- desligado, então não deve haver nenhuma).

begin;

alter table public.flashcards_corridas add column if not exists nivel text not null default 'normal';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'flashcards_corridas_nivel_valido') then
    alter table public.flashcards_corridas add constraint flashcards_corridas_nivel_valido check (nivel in ('normal', 'dificil'));
  end if;
end $$;
create index if not exists flashcards_corridas_ranking_idx on public.flashcards_corridas (modo, nivel, andar desc, atualizada_em asc);

-- Abre a corrida já com a dificuldade. Fácil não abre (fica fora do ranking).
create or replace function public.iniciar_corrida_flashcards(p_id uuid, p_modo text, p_nivel text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_modo not in ('masmorra', 'torre') then raise exception 'modo_invalido'; end if;
  if p_nivel not in ('normal', 'dificil') then raise exception 'nivel_fora_do_ranking'; end if;
  insert into public.flashcards_corridas(id, id_usuario, modo, nivel) values (p_id, auth.uid(), p_modo, p_nivel) on conflict (id) do nothing;
end $$;
revoke all on function public.iniciar_corrida_flashcards(uuid, text, text) from public;
grant execute on function public.iniciar_corrida_flashcards(uuid, text, text) to authenticated;

-- Ranking por modo e dificuldade: maior andar de cada conta, desempate por quem chegou primeiro.
create or replace function public.ranking_cripta(p_modo text, p_nivel text)
returns table(posicao bigint, apelido text, andar integer, alcancado_em timestamptz, eh_voce boolean)
language sql security definer set search_path = '' stable as $$
  with melhores as (
    select distinct on (c.id_usuario) c.id_usuario, c.andar, c.atualizada_em
      from public.flashcards_corridas c
     where c.modo = p_modo and c.nivel = p_nivel and c.andar > 1
     order by c.id_usuario, c.andar desc, c.atualizada_em asc
  ),
  ranking as (
    select coalesce(pp.apelido, public.nome_publico_ranking(u.raw_user_meta_data)) as apelido, m.andar, m.atualizada_em, m.id_usuario,
           row_number() over (order by m.andar desc, m.atualizada_em asc, m.id_usuario asc) as posicao
      from melhores m
      join auth.users u on u.id = m.id_usuario
      left join public.perfis_publicos pp on pp.usuario_id = m.id_usuario
     where coalesce(pp.participa_ranking, true)
       and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = m.id_usuario)
  )
  select posicao, apelido, andar, atualizada_em, id_usuario = auth.uid() from ranking where p_modo in ('masmorra', 'torre') and p_nivel in ('normal', 'dificil')
   order by posicao limit 50;
$$;
revoke all on function public.ranking_cripta(text, text) from public;
grant execute on function public.ranking_cripta(text, text) to authenticated, anon;

-- Posição da própria conta (quando está fora dos 50 primeiros).
create or replace function public.minha_posicao_cripta(p_modo text, p_nivel text)
returns table(posicao bigint, andar integer, alcancado_em timestamptz)
language sql security definer set search_path = '' stable as $$
  with melhores as (
    select distinct on (c.id_usuario) c.id_usuario, c.andar, c.atualizada_em
      from public.flashcards_corridas c
     where c.modo = p_modo and c.nivel = p_nivel and c.andar > 1
     order by c.id_usuario, c.andar desc, c.atualizada_em asc
  ),
  ranking as (
    select m.*, row_number() over (order by m.andar desc, m.atualizada_em asc, m.id_usuario asc) as posicao
      from melhores m
      left join public.perfis_publicos pp on pp.usuario_id = m.id_usuario
     where coalesce(pp.participa_ranking, true)
       and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = m.id_usuario)
  )
  select posicao, andar, atualizada_em from ranking where id_usuario = auth.uid();
$$;
revoke all on function public.minha_posicao_cripta(text, text) from public;
grant execute on function public.minha_posicao_cripta(text, text) to authenticated;

commit;

-- Beta público dos flashcards: opiniões dos usuários (diretriz do Tales, 13/10/2026).
--
-- Não destrutiva: só cria uma tabela e funções novas.
-- O que é guardado (e só isto): categoria, as respostas que a pessoa escreveu ou
-- escolheu, o tipo de aparelho e a tela de onde veio. Nada de prints, respostas
-- médicas, histórico detalhado ou e-mail. A conta fica ligada ao registro só para
-- o administrador poder responder; a leitura é restrita a administradores.

begin;

create table if not exists public.opinioes_flashcards (
  id bigint generated always as identity primary key,
  id_usuario uuid null references auth.users(id) on delete set null,
  categoria text not null check (categoria in ('som', 'visual', 'desempenho', 'conteudo', 'outro')),
  facil_estudar smallint null check (facil_estudar between 1 and 5),
  experiencia_visual smallint null check (experiencia_visual between 1 and 5),
  som_celular text null check (som_celular in ('sim', 'nao', 'nao_testei')),
  problema text null check (length(problema) <= 1500),
  melhorar text null check (length(melhorar) <= 1500),
  origem text not null default 'central' check (origem in ('central', 'fim_sessao', 'fim_partida', 'convite')),
  aparelho text null check (aparelho in ('celular', 'tablet', 'computador')),
  status text not null default 'aberta' check (status in ('aberta', 'lida', 'resolvida')),
  criada_em timestamptz not null default now()
);
create index if not exists opinioes_flashcards_data_idx on public.opinioes_flashcards (criada_em desc);
alter table public.opinioes_flashcards enable row level security;

create or replace function public.enviar_opiniao_flashcards(
  p_categoria text, p_facil smallint, p_visual smallint, p_som text, p_problema text, p_melhorar text, p_origem text, p_aparelho text
) returns bigint language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if coalesce(btrim(p_problema), '') = '' and coalesce(btrim(p_melhorar), '') = '' and p_facil is null and p_visual is null and p_som is null then
    raise exception 'opiniao_vazia';
  end if;
  -- no máximo 10 opiniões por conta a cada hora (evita envio repetido por engano)
  if (select count(*) from public.opinioes_flashcards where id_usuario = auth.uid() and criada_em > now() - interval '1 hour') >= 10 then
    raise exception 'muitas_opinioes';
  end if;
  insert into public.opinioes_flashcards(id_usuario, categoria, facil_estudar, experiencia_visual, som_celular, problema, melhorar, origem, aparelho)
  values (auth.uid(), p_categoria, p_facil, p_visual, p_som, nullif(btrim(coalesce(p_problema, '')), ''), nullif(btrim(coalesce(p_melhorar, '')), ''), coalesce(p_origem, 'central'), p_aparelho)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.enviar_opiniao_flashcards(text, smallint, smallint, text, text, text, text, text) from public, anon;
grant execute on function public.enviar_opiniao_flashcards(text, smallint, smallint, text, text, text, text, text) to authenticated;

create or replace function public.listar_opinioes_flashcards_admin()
returns table (id bigint, categoria text, facil_estudar smallint, experiencia_visual smallint, som_celular text, problema text, melhorar text, origem text, aparelho text, status text, criada_em timestamptz, usuario text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select o.id, o.categoria, o.facil_estudar, o.experiencia_visual, o.som_celular, o.problema, o.melhorar, o.origem, o.aparelho, o.status, o.criada_em, u.email::text
      from public.opinioes_flashcards o left join auth.users u on u.id = o.id_usuario
     order by (o.status = 'aberta') desc, o.criada_em desc
     limit 500;
end $$;
revoke all on function public.listar_opinioes_flashcards_admin() from public, anon, authenticated;
grant execute on function public.listar_opinioes_flashcards_admin() to authenticated;

commit;

