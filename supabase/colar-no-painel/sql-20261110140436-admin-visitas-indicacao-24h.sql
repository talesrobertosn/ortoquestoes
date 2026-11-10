-- Indique e ganhe: última visita nas 24 h corridas, apenas para administradores.
-- Reutiliza o histórico existente; não altera tabelas, coleta nem sinais dos planos.
create or replace function public.visitas_indicacao_admin()
returns table (id_usuario uuid, indicacao_ultima timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  return query
    select v.id_usuario, max(v.em)
    from public.visitas_usuario v
    where v.pagina = '/indicar'
      and v.em > now() - interval '24 hours'
      and v.em <= now()
    group by v.id_usuario;
end $$;
revoke all on function public.visitas_indicacao_admin() from public, anon, authenticated;
grant execute on function public.visitas_indicacao_admin() to authenticated;
