begin;

create or replace function public.listar_eventos_pagamento_admin()
returns table (
  id bigint,
  id_evento text,
  tipo text,
  id_recurso text,
  status_processamento text,
  erro text,
  recebido_em timestamptz,
  processado_em timestamptz
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
    select e.id, e.id_evento, e.tipo, e.id_recurso,
           e.status_processamento,
           case when e.erro is null then null
                when e.erro ~ '^[a-z0-9_:-]{1,80}$' then e.erro
                else 'erro_interno' end,
           e.recebido_em, e.processado_em
    from public.eventos_pagamento e
    order by e.recebido_em desc
    limit 200;
end;
$$;

revoke all on function public.listar_eventos_pagamento_admin() from public, anon, authenticated;
grant execute on function public.listar_eventos_pagamento_admin() to authenticated;

commit;
