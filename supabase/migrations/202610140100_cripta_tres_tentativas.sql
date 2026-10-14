-- Cripta: o plano grátis testa com 3 tentativas (diretriz do Tales, 14/10/2026).
-- "O usuário gratuito pode testar a Cripta morrendo três vezes; depois disso, não consegue mais."
--
-- Regras:
--   - cada partida da Cripta é uma corrida (flashcards_corridas). Morrer encerra a corrida, e a
--     partida seguinte abre outra; recomeçar também abre outra. Por isso "3 mortes" = 3 corridas;
--   - conta grátis: só flashcards das 3 primeiras corridas (desde 14/10/2026) são autorizados.
--     A 4ª corrida é recusada. As tentativas não se renovam;
--   - na Cripta, a conta grátis NÃO gasta os 10 flashcards por 24 h da Biblioteca (são
--     limites separados: a Biblioteca segue em autorizar_flashcard);
--   - assinante, cortesia, administrador e paywall desligado: sem limite (como em autorizar_flashcard);
--   - a corrida é criada aqui se ainda não existir, e o flashcard autorizado é ligado a ela
--     (o ranking continua validando andares por flashcards da corrida).
-- Idempotente: repetir a mesma chave não gasta nada nem muda o resultado.

begin;

create or replace function public.autorizar_flashcard_cripta(p_chave_idempotencia uuid, p_id_flashcard text, p_corrida uuid, p_modo text)
returns table (permitido boolean, ilimitado boolean, tentativa integer, tentativas integer, motivo text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_agora timestamptz := clock_timestamp();
  v_config public.configuracao_comercial%rowtype;
  v_teste boolean := false;
  v_ilimitado boolean := false;
  v_dono uuid;
  v_ordem integer;
  v_inicio_regra constant timestamptz := '2026-10-14 00:00:00-03';
  v_tentativas constant integer := 3;
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_id_flashcard is null or length(p_id_flashcard) > 160 then raise exception 'flashcard_invalido'; end if;
  if p_corrida is null then raise exception 'corrida_invalida'; end if;
  if p_modo not in ('masmorra', 'torre') then raise exception 'modo_invalido'; end if;
  tentativas := v_tentativas;

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

  -- posição desta corrida entre as da conta desde o início da regra (empate: pelo id)
  select count(*) into v_ordem from public.flashcards_corridas c
   where c.id_usuario = v_usuario and c.iniciada_em >= v_inicio_regra
     and (c.iniciada_em, c.id) <= (select x.iniciada_em, x.id from public.flashcards_corridas x where x.id = p_corrida);
  tentativa := greatest(v_ordem, 1);
  ilimitado := v_ilimitado;

  if not v_ilimitado and v_ordem > v_tentativas then
    return query select false, false, tentativa, tentativas, 'Você já usou as 3 tentativas grátis da Cripta.'::text;
    return;
  end if;

  insert into public.flashcards_autorizados (chave_idempotencia, id_usuario, id_flashcard, contabilizado, criado_em, id_corrida)
    values (p_chave_idempotencia, v_usuario, p_id_flashcard, false, v_agora, p_corrida) on conflict do nothing;
  return query select true, v_ilimitado, tentativa, tentativas, null::text;
end $$;
revoke all on function public.autorizar_flashcard_cripta(uuid, text, uuid, text) from public;
grant execute on function public.autorizar_flashcard_cripta(uuid, text, uuid, text) to authenticated;

commit;
