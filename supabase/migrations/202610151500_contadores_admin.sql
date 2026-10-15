-- Contadores leves do painel do administrador (auditoria de 15/10/2026, T6.3).
-- contadores_admin(): só os números que o cabeçalho e os avisos das abas usam:
--   usuarios             contas cadastradas (aviso da aba Usuários);
--   online_agora         contas com sinal nos últimos 3 minutos;
--   relatos_abertos      relatos de erro ainda em aberto;
--   avaliacoes_para_ler  "não ajudou" com texto, entre as 500 avaliações mais
--                        recentes (as mesmas que a aba Conteúdo lista), ainda não
--                        marcadas como lidas em admin_lidos.
-- Antes o painel baixava a lista inteira de usuários (a consulta mais pesada) e
-- montava a aba Conteúdo escondida, com estatísticas, relatos, 500 avaliações e
-- arquivos do acervo, só para mostrar esses números.
-- Roda depois da 202610151200 (parte 21). Só cria uma função de leitura; não altera dados.
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
      select a.id_questao, a.util, a.observacao, a.atualizado_em, u.email::text as email
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
          and coalesce(a.observacao, '') ~ '\S'
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
