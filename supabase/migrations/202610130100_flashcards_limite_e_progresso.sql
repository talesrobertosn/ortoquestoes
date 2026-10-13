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
