-- Painel do administrador: ler as avaliações de "Este comentário te ajudou?".
-- As avaliações já eram gravadas em avaliacoes_comentario, mas cada pessoa só
-- lê as próprias; o responsável precisava do SQL editor. Esta função devolve
-- as mais recentes para quem está em public.administradores.
--
-- Pode ser aplicada sozinha: recria o que faltar da 202609230001.
begin;

create table if not exists public.avaliacoes_comentario (
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id_questao text not null check (id_questao ~ '^[a-z0-9-]{3,80}$'),
  util boolean not null,
  motivo text check (motivo is null or motivo in ('confuso', 'raso', 'errado', 'outro')),
  observacao text check (observacao is null or char_length(observacao) <= 1000),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, id_questao)
);

alter table public.avaliacoes_comentario enable row level security;

drop policy if exists "avaliacao: ler as proprias" on public.avaliacoes_comentario;
create policy "avaliacao: ler as proprias" on public.avaliacoes_comentario
  for select to authenticated using (usuario_id = auth.uid());

drop policy if exists "avaliacao: criar as proprias" on public.avaliacoes_comentario;
create policy "avaliacao: criar as proprias" on public.avaliacoes_comentario
  for insert to authenticated with check (usuario_id = auth.uid());

drop policy if exists "avaliacao: mudar as proprias" on public.avaliacoes_comentario;
create policy "avaliacao: mudar as proprias" on public.avaliacoes_comentario
  for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

grant select, insert, update on public.avaliacoes_comentario to authenticated;

create or replace function public.listar_avaliacoes_comentario_admin()
returns table (
  id_questao text,
  util boolean,
  motivo text,
  observacao text,
  atualizado_em timestamptz,
  usuario text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.administradores adm
    where adm.id_usuario = auth.uid()
  ) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;

  return query
    select a.id_questao, a.util, a.motivo, a.observacao, a.atualizado_em, u.email::text
    from public.avaliacoes_comentario a
    left join auth.users u on u.id = a.usuario_id
    order by a.atualizado_em desc
    limit 500;
end;
$$;

revoke all on function public.listar_avaliacoes_comentario_admin() from public, anon, authenticated;
grant execute on function public.listar_avaliacoes_comentario_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
