-- Quem usou os Shorts nas últimas 12 horas fica rosa no painel (Tales, 26/11/2026: "deixa meio rosa por 12 horas
-- quem usou o Shorts"), como o amarelo de quem viu os planos e o azul de quem viu o Indique e ganhe. Lê o sinal que o
-- aparelho já manda (shorts_atividade) e as respostas do dia; só cria uma função de leitura, não altera dados.
-- Rodar depois de 20261125233000_shorts_pessoas.sql.
begin;

create or replace function public.visitas_shorts_admin()
returns table (id_usuario uuid, shorts_ultima timestamptz, shorts_hoje integer)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inicio timestamptz := date_trunc('day', clock_timestamp() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  perform public.exigir_administrador();
  return query
    select a.usuario_id, a.visto_em,
      (select count(*)::integer from public.shorts_respostas r where r.usuario_id = a.usuario_id and r.criado_em >= v_inicio)
    from public.shorts_atividade a
    where a.visto_em > now() - interval '12 hours';
end $$;
revoke all on function public.visitas_shorts_admin() from public, anon, authenticated;
grant execute on function public.visitas_shorts_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
