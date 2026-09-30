begin;

-- Avisos do painel marcados como lidos pelo administrador (avaliações de
-- comentário, pagamentos com problema). Um registro por item lido.
create table if not exists public.admin_lidos (
  tipo text not null check (tipo in ('avaliacao', 'pagamento')),
  chave text not null check (char_length(chave) between 1 and 300),
  lido_em timestamptz not null default now(),
  lido_por uuid references auth.users(id) on delete set null,
  primary key (tipo, chave)
);
alter table public.admin_lidos enable row level security;
revoke all on public.admin_lidos from public, anon, authenticated;

create or replace function public.listar_lidos_admin(p_tipo text)
returns table (chave text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select l.chave from public.admin_lidos l where l.tipo = p_tipo;
end $$;
revoke all on function public.listar_lidos_admin(text) from public, anon, authenticated;
grant execute on function public.listar_lidos_admin(text) to authenticated;

create or replace function public.marcar_lidos_admin(p_tipo text, p_chaves text[], p_lido boolean default true)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare v_n integer;
begin
  perform public.exigir_administrador();
  if coalesce(array_length(p_chaves, 1), 0) > 2000 then raise exception 'lote_grande' using errcode = '22023'; end if;
  if p_lido then
    insert into public.admin_lidos (tipo, chave, lido_por)
    select p_tipo, c, auth.uid() from unnest(p_chaves) as c
    on conflict (tipo, chave) do nothing;
  else
    delete from public.admin_lidos l where l.tipo = p_tipo and l.chave = any(p_chaves);
  end if;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.marcar_lidos_admin(text, text[], boolean) from public, anon, authenticated;
grant execute on function public.marcar_lidos_admin(text, text[], boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
