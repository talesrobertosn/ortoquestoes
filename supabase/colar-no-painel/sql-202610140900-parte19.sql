-- Parte 19 (nova regra): conta grátis com uma vida na Cripta a cada 24 horas (14/10/2026).
-- Cole no SQL Editor do Supabase e execute. Depende da parte 18. Substitui a versão anterior da parte 19 (3 tentativas):
-- pode colar mesmo que a versão anterior (ou o rascunho "Biblioteca ou Cripta") já tenha sido colada.

-- Conta grátis: uma vida na Cripta a cada 24 horas (diretriz do Tales, 14/10/2026).
-- "Na biblioteca, a pessoa tem 10 flashcards e na cripta ela tem uma vida. Ela pode ir até o quanto
-- quiser, até morrer. Morreu, tem que esperar 24 horas para fazer de novo. A cada 24 horas reseta tudo.
-- O assinante pode fazer tudo normal." A regra não aparece escrita no site: a pessoa descobre jogando.
-- Substitui a regra das 3 tentativas da Cripta (202610140100_cripta_tres_tentativas.sql).
--
-- Regras:
--   - Biblioteca: segue igual (autorizar_flashcard, 10 flashcards por janela de 24 h);
--   - Cripta: janela própria de 24 h (flashcards_janela_cripta), que começa na primeira partida.
--     A janela aceita UMA corrida (uma vida), sem limite de andares nem de flashcards. Morrer ou
--     recomeçar abre outra corrida, que é recusada até a janela virar;
--   - os dois limites são independentes: usar um não gasta o outro;
--   - assinante, cortesia, administrador e paywall desligado: sem limite;
--   - a corrida é criada aqui se ainda não existir, e o flashcard autorizado é ligado a ela
--     (o ranking continua validando andares por flashcards da corrida).
-- Idempotente: repetir a mesma chave não gasta nada nem muda o resultado.

begin;

create table if not exists public.flashcards_janela_cripta (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  inicio timestamptz not null,
  id_corrida uuid,
  atualizado_em timestamptz not null default now()
);
alter table public.flashcards_janela_cripta enable row level security;

-- Biblioteca: a mesma função da parte 18. Recriada aqui porque um rascunho anterior desta parte 19
-- (Biblioteca OU Cripta) pode ter sido colado; isto desfaz aquele rascunho.
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

-- O retorno mudou (sai tentativa/tentativas, entra libera_em), por isso a função é recriada.
drop function if exists public.autorizar_flashcard_cripta(uuid, text, uuid, text);
create function public.autorizar_flashcard_cripta(p_chave_idempotencia uuid, p_id_flashcard text, p_corrida uuid, p_modo text)
returns table (permitido boolean, ilimitado boolean, libera_em timestamptz, motivo text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_agora timestamptz := clock_timestamp();
  v_janela interval := interval '24 hours';
  v_config public.configuracao_comercial%rowtype;
  v_teste boolean := false;
  v_ilimitado boolean := false;
  v_dono uuid;
  v_inicio timestamptz;
  v_corrida uuid;
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_id_flashcard is null or length(p_id_flashcard) > 160 then raise exception 'flashcard_invalido'; end if;
  if p_corrida is null then raise exception 'corrida_invalida'; end if;
  if p_modo not in ('masmorra', 'torre') then raise exception 'modo_invalido'; end if;

  -- a corrida é da conta (cria se ainda não existe; corrida de outra conta é recusada)
  insert into public.flashcards_corridas(id, id_usuario, modo) values (p_corrida, v_usuario, p_modo) on conflict (id) do nothing;
  select c.id_usuario into v_dono from public.flashcards_corridas c where c.id = p_corrida;
  if v_dono is distinct from v_usuario then raise exception 'corrida_de_outra_conta' using errcode = '42501'; end if;

  select * into v_config from public.configuracao_comercial where id = true;
  if not found then raise exception 'configuracao_ausente'; end if;
  select exists(select 1 from public.contas_teste where id_usuario = v_usuario and ativa) into v_teste;
  select exists(select 1 from public.administradores adm where adm.id_usuario = v_usuario)
      or exists(select 1 from public.acessos_cortesia c where c.id_usuario = v_usuario and coalesce(c.ate, 'infinity') > v_agora)
      or exists(select 1 from public.assinaturas a where a.id_usuario = v_usuario and (a.status = 'ativa' or (a.status = 'cancelada' and a.cancelar_ao_fim)) and coalesce(a.fim_periodo, 'infinity') > v_agora)
    into v_ilimitado;
  v_ilimitado := v_ilimitado or not (v_config.paywall_ativo or v_teste);

  if v_ilimitado then
    insert into public.flashcards_autorizados (chave_idempotencia, id_usuario, id_flashcard, contabilizado, criado_em, id_corrida)
      values (p_chave_idempotencia, v_usuario, p_id_flashcard, false, v_agora, p_corrida) on conflict do nothing;
    return query select true, true, null::timestamptz, null::text;
    return;
  end if;

  -- janela da Cripta, travada: duas abas não abrem duas vidas
  insert into public.flashcards_janela_cripta(id_usuario, inicio) values (v_usuario, v_agora) on conflict do nothing;
  select j.inicio, j.id_corrida into v_inicio, v_corrida from public.flashcards_janela_cripta j where j.id_usuario = v_usuario for update;
  if v_inicio + v_janela <= v_agora then
    update public.flashcards_janela_cripta set inicio = v_agora, id_corrida = null, atualizado_em = v_agora where id_usuario = v_usuario;
    v_inicio := v_agora;
    v_corrida := null;
  end if;

  if exists(select 1 from public.flashcards_autorizados where chave_idempotencia = p_chave_idempotencia and id_usuario = v_usuario) then
    return query select true, false, v_inicio + v_janela, null::text;
    return;
  end if;

  if v_corrida is not null and v_corrida <> p_corrida then
    return query select false, false, v_inicio + v_janela, 'Você usou a vida grátis da Cripta.'::text;
    return;
  end if;

  if v_corrida is null then
    update public.flashcards_janela_cripta set id_corrida = p_corrida, atualizado_em = v_agora where id_usuario = v_usuario;
  end if;
  insert into public.flashcards_autorizados (chave_idempotencia, id_usuario, id_flashcard, contabilizado, criado_em, id_corrida)
    values (p_chave_idempotencia, v_usuario, p_id_flashcard, false, v_agora, p_corrida) on conflict do nothing;
  return query select true, false, v_inicio + v_janela, null::text;
end $$;
revoke all on function public.autorizar_flashcard_cripta(uuid, text, uuid, text) from public;
grant execute on function public.autorizar_flashcard_cripta(uuid, text, uuid, text) to authenticated;

commit;
