-- Sincronização incremental do progresso (auditoria de 15/10/2026, T1.2). Não altera nem apaga dados.
-- 1. ler_progresso_desde(p_cursor, p_limite): devolve só as linhas da própria conta com
--    versão acima do cursor, em ordem de versão, até p_limite (1 a 1000) por chamada.
--    Antes de ler, espera as gravações em andamento da mesma conta (a mesma trava de
--    sincronizar_progresso, em modo compartilhado). Assim nenhuma linha de versão menor
--    aparece depois que o aparelho já avançou o cursor, e celular e computador continuam
--    vendo o mesmo progresso. Só lê.
-- 2. apagar_progresso() e apagar_progresso_conta() passam a usar a mesma trava antes de
--    gravar. O resto do corpo é o mesmo de antes (o site atual não as chama).
-- 3. Repete a trava de escrita da parte 21: progresso_usuario só muda por
--    sincronizar_progresso, que confere a versão. Uma gravação direta manteria a versão
--    antiga e a leitura incremental não a veria.
-- O envio continua por sincronizar_progresso, sem mudança: cada aparelho já manda só os
-- itens que mudaram, com a versão em que se baseou, e a conferência de versão continua igual.
begin;

drop function if exists public.ler_progresso_desde(bigint, integer);
create function public.ler_progresso_desde(p_cursor bigint, p_limite integer default 500)
returns table (tipo text, item text, valor jsonb, versao bigint, operacao uuid)
-- volatile (não stable): cada comando enxerga o que foi gravado até ele, inclusive
-- o que terminou enquanto esta função esperava a trava.
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  dono uuid := auth.uid();
begin
  if dono is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
  if p_cursor is null or p_cursor < 0 then raise exception 'Cursor inválido' using errcode = '22023'; end if;
  -- Mesma chave de sincronizar_progresso. Compartilhada: leituras não esperam umas pelas outras.
  perform pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended(dono::text, 0));
  return query
    select p.tipo, p.item, p.valor, p.versao, p.operacao
      from public.progresso_usuario p
      where p.usuario_id = dono and p.versao > p_cursor
      order by p.versao
      limit least(greatest(coalesce(p_limite, 500), 1), 1000);
end $$;
revoke all on function public.ler_progresso_desde(bigint, integer) from public, anon, authenticated;
grant execute on function public.ler_progresso_desde(bigint, integer) to authenticated;

create or replace function public.apagar_progresso()
returns void
language plpgsql security definer set search_path = '' as $$
declare dono uuid := auth.uid();
begin
  if dono is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(dono::text, 0));
  update public.progresso_usuario
    set valor = 'null'::jsonb,
        operacao = extensions.gen_random_uuid(),
        versao = default,
        atualizado_em = now()
    where usuario_id = dono;
  insert into public.progresso_usuario (usuario_id, tipo, item, valor, operacao)
    values (dono, 'historico', '__reinicio__', jsonb_build_object('id','__reinicio__','descricao','reinicio','concluidaEm',extract(epoch from now())), extensions.gen_random_uuid())
    on conflict (usuario_id, tipo, item) do update set valor = excluded.valor, operacao = excluded.operacao, versao = default, atualizado_em = now();
end;
$$;
revoke all on function public.apagar_progresso() from public, anon;
grant execute on function public.apagar_progresso() to authenticated;

create or replace function public.apagar_progresso_conta()
returns integer
language plpgsql security definer set search_path = '' as $$
declare dono uuid := auth.uid(); total integer;
begin
  if dono is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(dono::text, 0));
  update public.progresso_usuario
    set valor = 'null'::jsonb,
        operacao = extensions.gen_random_uuid(),
        versao = default,
        atualizado_em = now()
    where usuario_id = dono;
  insert into public.progresso_usuario (usuario_id, tipo, item, valor, operacao)
    values (dono, 'historico', '__reinicio__', jsonb_build_object('id','__reinicio__','descricao','reinicio','concluidaEm',extract(epoch from now())), extensions.gen_random_uuid())
    on conflict (usuario_id, tipo, item) do update set valor = excluded.valor, operacao = excluded.operacao, versao = default, atualizado_em = now();
  get diagnostics total = row_count;
  return total;
end;
$$;
revoke all on function public.apagar_progresso_conta() from public, anon;
grant execute on function public.apagar_progresso_conta() to authenticated;

drop policy if exists "Cada pessoa insere apenas seu progresso" on public.progresso_usuario;
drop policy if exists "Cada pessoa altera apenas seu progresso" on public.progresso_usuario;
revoke insert, update, delete on public.progresso_usuario from anon, authenticated;

notify pgrst, 'reload schema';
commit;
