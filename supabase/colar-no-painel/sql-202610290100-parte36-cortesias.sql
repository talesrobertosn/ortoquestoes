-- Parte 36 (29/10/2026): selo e filtro "Cortesia" na lista de pessoas do painel. Cole no SQL
-- Editor do Supabase e execute. Mesmo conteúdo de supabase/migrations/202610290100_cortesias_admin.sql.
-- Cortesias na lista de pessoas do painel (29/10/2026, pedido do Tales: "saber se o usuário está
-- com cortesia ativa"). Só leitura: não cria tabela, não altera nem apaga dados.
--
-- cortesias_admin(): uma linha por conta em acessos_cortesia (a mesma tabela da ficha e de
-- definir_cortesia_admin), com o prazo (null = sem prazo) e o motivo. O painel decide o que está
-- ativo (sem prazo ou prazo no futuro), mostra o selo "Cortesia" e o filtro da lista.
-- Exige administrador (exigir_administrador) e não é executável por anon.
-- Roda depois da 202609290200 (painel admin 2). Pode rodar mais de uma vez.
begin;

drop function if exists public.cortesias_admin();
create function public.cortesias_admin()
returns table (id_usuario uuid, ate timestamptz, motivo text, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select c.id_usuario, c.ate, c.motivo, c.criado_em
    from public.acessos_cortesia c;
end $$;
revoke all on function public.cortesias_admin() from public, anon, authenticated;
grant execute on function public.cortesias_admin() to authenticated;

commit;
