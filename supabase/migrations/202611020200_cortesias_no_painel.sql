-- Cortesias no painel (Tales, 02/11/2026): quem tem acesso cortesia valendo conta como assinante no painel
-- do administrador, com o selo "Cortesia", e sai dos possíveis pagadores (temperatura, "viram os planos",
-- limite grátis, cartas de convite). Só leitura: devolve quem tem cortesia valendo agora.
-- Aditiva: só cria uma função. Pode ser rodada de novo.
begin;

create or replace function public.listar_cortesias_admin()
returns table (id_usuario uuid, ate timestamptz, motivo text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select c.id_usuario, c.ate, c.motivo
    from public.acessos_cortesia c
    where coalesce(c.ate, 'infinity'::timestamptz) > now();
end $$;
revoke all on function public.listar_cortesias_admin() from public, anon, authenticated;
grant execute on function public.listar_cortesias_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
