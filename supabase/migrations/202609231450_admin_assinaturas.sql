begin;

create table if not exists public.administradores (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table public.administradores enable row level security;
revoke all on public.administradores from public, anon, authenticated;
-- Sem policy: apenas o dono da tabela e funções security definer podem ler.

create or replace function public.listar_assinaturas_admin()
returns table (
  id_usuario uuid,
  usuario text,
  plano text,
  status text,
  proxima_cobranca timestamptz,
  ultima_atualizacao timestamptz
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
    select a.id_usuario,
           u.email::text as usuario,
           a.plano,
           a.status,
           case when a.status = 'ativa' and not a.cancelar_ao_fim
                then a.fim_periodo else null end as proxima_cobranca,
           a.atualizada_em
    from public.assinaturas a
    join auth.users u on u.id = a.id_usuario
    order by a.atualizada_em desc;
end;
$$;

revoke all on function public.listar_assinaturas_admin() from public, anon, authenticated;
grant execute on function public.listar_assinaturas_admin() to authenticated;

commit;
