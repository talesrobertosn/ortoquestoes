-- Continuidade da Cripta entre aparelhos (15/10/2026). Parte 28 em supabase/colar-no-painel/.
--
-- Bug relatado pelo Tales: "no notebook eu estava no Golem; no computador, no Senhor do Anel
-- Pélvico". A partida em andamento (andar, vida, poderes, relíquias, inimigo, sala), o Bestiário,
-- o Altar e o patamar da Torre ficavam só no localStorage de cada aparelho.
--
-- O que muda:
-- 1. flashcards_progresso ganha `jogo jsonb` (estado do jogo da conta, formato versionado pelo
--    cliente: { versao: 1, partidas, patamar, encerradas, bestiario, altar }) e `jogo_em`
--    (carimbo do servidor da última gravação, usado como trava otimista). Limite de 256 kB.
-- 2. ler_progresso_flashcards() devolve também jogo e jogo_em (o site antigo ignora as colunas a mais).
-- 3. salvar_progresso_flashcards ganha p_jogo e p_jogo_base opcionais (default null): chamada com
--    os dois parâmetros de antes continua igual. Com p_jogo, grava o jogo só se p_jogo_base for o
--    jogo_em atual (ou se ainda não houver jogo salvo); senão deixa como está.
-- 4. Funções leves, sem os registros (que podem ter megabytes):
--    - ler_jogo_flashcards(): jogo e jogo_em da própria conta;
--    - salvar_jogo_flashcards(p_jogo, p_base): grava com a mesma trava otimista e devolve
--      (salvo, jogo, jogo_em). Recusado, devolve o jogo atual para o aparelho mesclar e tentar de novo.
--
-- Segurança: as funções usam auth.uid(); cada conta só lê e grava a própria linha (as policies
-- da parte 18 continuam). Nada de limite, corrida, ranking ou vida grátis muda: a vida a cada
-- 24 h continua decidida por autorizar_flashcard_cripta (parte 19).
-- Não apaga dados. Pode rodar de novo. Roda depois da parte 18 (202610130300), que criou a tabela.
begin;

alter table public.flashcards_progresso add column if not exists jogo jsonb;
alter table public.flashcards_progresso add column if not exists jogo_em timestamptz;

alter table public.flashcards_progresso drop constraint if exists flashcards_progresso_jogo_tamanho;
alter table public.flashcards_progresso add constraint flashcards_progresso_jogo_tamanho
  check (jogo is null or (jsonb_typeof(jogo) = 'object' and pg_column_size(jogo) < 262144));

-- Leitura completa (registros, recordes e jogo). Mudou o retorno: precisa recriar.
drop function if exists public.ler_progresso_flashcards();
create function public.ler_progresso_flashcards()
returns table (registros jsonb, recordes jsonb, atualizado_em timestamptz, jogo jsonb, jogo_em timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.registros, p.recordes, p.atualizado_em, p.jogo, p.jogo_em from public.flashcards_progresso p where p.id_usuario = auth.uid()
$$;
revoke all on function public.ler_progresso_flashcards() from public, anon;
grant execute on function public.ler_progresso_flashcards() to authenticated;

-- Leitura leve: só o jogo.
create or replace function public.ler_jogo_flashcards()
returns table (jogo jsonb, jogo_em timestamptz)
language sql stable security definer set search_path = public, pg_temp as $$
  select p.jogo, p.jogo_em from public.flashcards_progresso p where p.id_usuario = auth.uid()
$$;
revoke all on function public.ler_jogo_flashcards() from public, anon;
grant execute on function public.ler_jogo_flashcards() to authenticated;

-- Gravação do jogo com trava otimista: vale só sobre a versão que o aparelho conhece.
create or replace function public.salvar_jogo_flashcards(p_jogo jsonb, p_base timestamptz default null)
returns table (salvo boolean, jogo jsonb, jogo_em timestamptz)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_atual jsonb;
  v_em timestamptz;
  v_agora timestamptz := clock_timestamp();
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_jogo is null or jsonb_typeof(p_jogo) <> 'object' or jsonb_typeof(p_jogo -> 'versao') is distinct from 'number' then raise exception 'formato_invalido'; end if;
  if pg_column_size(p_jogo) >= 262144 then raise exception 'jogo_grande_demais'; end if;
  -- a linha da conta existe antes de travar (quem nunca sincronizou os registros também grava o jogo)
  insert into public.flashcards_progresso(id_usuario) values (v_usuario) on conflict (id_usuario) do nothing;
  select p.jogo, p.jogo_em into v_atual, v_em from public.flashcards_progresso p where p.id_usuario = v_usuario for update;
  if v_em is not null and (p_base is null or p_base <> v_em) then
    return query select false, v_atual, v_em;
    return;
  end if;
  update public.flashcards_progresso p set jogo = p_jogo, jogo_em = v_agora where p.id_usuario = v_usuario;
  return query select true, p_jogo, v_agora;
end $$;
revoke all on function public.salvar_jogo_flashcards(jsonb, timestamptz) from public, anon;
grant execute on function public.salvar_jogo_flashcards(jsonb, timestamptz) to authenticated;

-- Gravação completa: os dois parâmetros de antes continuam valendo; o jogo é opcional.
-- A versão antiga (jsonb, jsonb) sai para a chamada com dois parâmetros não ficar ambígua.
drop function if exists public.salvar_progresso_flashcards(jsonb, jsonb);
create or replace function public.salvar_progresso_flashcards(p_registros jsonb, p_recordes jsonb, p_jogo jsonb default null, p_jogo_base timestamptz default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if jsonb_typeof(p_registros) <> 'object' or jsonb_typeof(p_recordes) <> 'object' then raise exception 'formato_invalido'; end if;
  insert into public.flashcards_progresso(id_usuario, registros, recordes, atualizado_em) values (auth.uid(), p_registros, p_recordes, now())
    on conflict (id_usuario) do update set registros = excluded.registros, recordes = excluded.recordes, atualizado_em = now();
  if p_jogo is not null then perform public.salvar_jogo_flashcards(p_jogo, p_jogo_base); end if;
end $$;
revoke all on function public.salvar_progresso_flashcards(jsonb, jsonb, jsonb, timestamptz) from public, anon;
grant execute on function public.salvar_progresso_flashcards(jsonb, jsonb, jsonb, timestamptz) to authenticated;

commit;

notify pgrst, 'reload schema';
