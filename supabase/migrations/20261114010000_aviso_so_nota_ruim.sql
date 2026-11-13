-- Aviso do painel só para nota ruim (Tales, 14/11/2026): "notificação só se tiver nota ruim; nota boa não tem que
-- me notificar". contadores_admin() passa a contar toda nota de 5 ou menos (util = false), com ou sem mensagem,
-- ainda não marcada como lida. Nota boa entra nas estatísticas do painel sem gerar aviso. Antes contava só as
-- notas baixas com mensagem escrita.
-- Só troca uma função de leitura; não altera dados.
begin;

create or replace function public.contadores_admin()
returns table (
  usuarios bigint,
  online_agora bigint,
  relatos_abertos bigint,
  avaliacoes_para_ler bigint
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    with recentes as (
      select a.id_questao, a.util, a.atualizado_em, u.email::text as email
      from public.avaliacoes_comentario a
      left join auth.users u on u.id = a.usuario_id
      order by a.atualizado_em desc
      limit 500
    )
    select
      (select count(*) from auth.users),
      (select count(*) from public.sessoes_aparelho s where s.visto_em >= now() - interval '3 minutes'),
      (select count(*) from public.relatos_erro r where r.status = 'aberto'),
      (select count(*) from recentes a
        where not a.util
          and not exists (
            select 1 from public.admin_lidos l
            where l.tipo = 'avaliacao'
              -- A mesma chave que o painel grava ao marcar como lida: questão|e-mail|data (como sai no JSON).
              and l.chave = a.id_questao || '|' || coalesce(a.email, '') || '|' || (to_jsonb(a.atualizado_em) #>> '{}')
          ));
end $$;
revoke all on function public.contadores_admin() from public, anon, authenticated;
grant execute on function public.contadores_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
