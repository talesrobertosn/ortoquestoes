-- Contas gratuitas. Esta migração não ativa quotas, cobrança ou bloqueios de estudo.
begin;
create table public.progresso_usuario (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('respondidas', 'favoritos', 'notas', 'historico')),
  item text not null check (item ~ '^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$'),
  valor jsonb not null,
  versao bigint generated always as identity unique,
  operacao uuid not null,
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, tipo, item),
  constraint tamanho_documento check (octet_length(valor::text) <= 131072),
  constraint forma_documento check (
    valor = 'null'::jsonb or
    (tipo = 'notas' and jsonb_typeof(valor) = 'string' and length(valor #>> '{}') <= 20000) or
    (tipo = 'favoritos' and valor = 'true'::jsonb) or
    (tipo = 'respondidas' and jsonb_typeof(valor) = 'object'
      and valor ?& array['c','q'] and valor->'c' in ('true'::jsonb, 'false'::jsonb, 'null'::jsonb)
      and jsonb_typeof(valor->'q') = 'number') or
    (tipo = 'historico' and jsonb_typeof(valor) = 'object' and valor ?& array['id','descricao','concluidaEm']
      and jsonb_typeof(valor->'id') = 'string' and jsonb_typeof(valor->'descricao') = 'string'
      and jsonb_typeof(valor->'concluidaEm') = 'number')
  )
);
create index progresso_usuario_cursor on public.progresso_usuario (usuario_id, versao);
alter table public.progresso_usuario enable row level security;
revoke all on public.progresso_usuario from anon, authenticated;
grant select on public.progresso_usuario to authenticated;
create policy "Cada pessoa consulta apenas seu progresso" on public.progresso_usuario
  for select to authenticated using ((select auth.uid()) = usuario_id);
grant insert, update on public.progresso_usuario to authenticated;
create policy "Cada pessoa insere apenas seu progresso" on public.progresso_usuario
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "Cada pessoa altera apenas seu progresso" on public.progresso_usuario
  for update to authenticated using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

-- Escritas só por esta função. usuario_id vem da sessão verificada, nunca de parâmetros.
-- A versão esperada evita perda silenciosa quando dois dispositivos alteram o mesmo item.
create function public.sincronizar_progresso(alteracoes jsonb)
returns setof public.progresso_usuario
language plpgsql security definer set search_path = '' as $$
declare
  dono uuid := auth.uid();
  entrada jsonb;
  atual public.progresso_usuario;
  base bigint;
  id_operacao uuid;
begin
  if dono is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
  if jsonb_typeof(alteracoes) <> 'array' or jsonb_array_length(alteracoes) > 100 then
    raise exception 'Lote inválido';
  end if;
  -- Serializa os lotes da mesma conta; outras contas continuam independentes.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(dono::text, 0));
  for entrada in select value from jsonb_array_elements(alteracoes) loop
    if not (entrada ?& array['tipo','item','valor','base','operacao']) then raise exception 'Alteração incompleta'; end if;
    base := (entrada->>'base')::bigint;
    id_operacao := (entrada->>'operacao')::uuid;
    if base is null or base < 0 then raise exception 'Versão inválida'; end if;
    select * into atual from public.progresso_usuario
      where usuario_id = dono and tipo = entrada->>'tipo' and item = entrada->>'item' for update;
    if not found then
      if base <> 0 then raise exception 'Versão inicial inválida'; end if;
      insert into public.progresso_usuario (usuario_id, tipo, item, valor, operacao)
        values (dono, entrada->>'tipo', entrada->>'item', entrada->'valor', id_operacao) returning * into atual;
    elsif atual.operacao = id_operacao then
      null; -- Resposta de rede perdida: repetir a mesma operação não grava outra vez.
    elsif atual.versao = base then
      update public.progresso_usuario set valor = entrada->'valor', operacao = id_operacao,
        versao = default, atualizado_em = now()
        where usuario_id = dono and tipo = entrada->>'tipo' and item = entrada->>'item' returning * into atual;
    end if;
    -- No conflito, devolve a versão corrente sem sobrescrever nenhuma informação.
    return next atual;
  end loop;
end;
$$;
revoke all on function public.sincronizar_progresso(jsonb) from public, anon;
grant execute on function public.sincronizar_progresso(jsonb) to authenticated;

-- Limpa a conta inteira sem apagar as linhas: os tombstones permitem que todos
-- os dispositivos recebam a exclusão na próxima sincronização.
create function public.apagar_progresso()
returns void
language plpgsql security definer set search_path = '' as $$
declare dono uuid := auth.uid();
begin
  if dono is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
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
-- Versão com retorno explícito: algumas versões do PostgREST não expõem
-- funções que retornam void no endpoint RPC.
create function public.apagar_progresso_conta()
returns integer
language plpgsql security definer set search_path = '' as $$
declare dono uuid := auth.uid(); total integer;
begin
  if dono is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
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
-- Garante que o PostgREST reconheça a função imediatamente após a migração.
notify pgrst, 'reload schema';

-- Reserva exclusiva do servidor para uma etapa futura. Nenhum cliente acessa ou altera planos.
create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;
create table privado.assinaturas (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  provedor text,
  assinatura_externa text unique,
  status text not null default 'inativa' check (status in ('inativa','ativa','cancelada','atrasada')),
  valida_ate timestamptz,
  atualizado_em timestamptz not null default now()
);
alter table privado.assinaturas enable row level security;
revoke all on privado.assinaturas from public, anon, authenticated;
comment on table privado.assinaturas is 'Reservado para cobrança futura via servidor/webhook; não utilizado para limitar acesso nesta versão gratuita.';
commit;
