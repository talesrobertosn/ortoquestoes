-- Relatos de erro marcados como lidos (Tales, 14/11/2026: "um botão para ler tudo, tirar todas as notificações sem
-- justificar"). O relato continua em aberto (para resolver ou descartar depois); só deixa de contar no aviso do
-- painel. Usa a mesma tabela admin_lidos, com tipo 'relato' e a chave = id do relato.
-- Só amplia a lista de tipos aceitos e troca uma função de leitura; não altera nem apaga dados.
begin;

alter table public.admin_lidos drop constraint if exists admin_lidos_tipo_check;
alter table public.admin_lidos add constraint admin_lidos_tipo_check check (tipo in ('avaliacao', 'pagamento', 'relato'));

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
      -- Relatos em aberto ainda não marcados como lidos.
      (select count(*) from public.relatos_erro r
        where r.status = 'aberto'
          and not exists (select 1 from public.admin_lidos l where l.tipo = 'relato' and l.chave = r.id::text)),
      -- Notas de 5 ou menos ainda não lidas (nota boa não avisa).
      (select count(*) from recentes a
        where not a.util
          and not exists (
            select 1 from public.admin_lidos l
            where l.tipo = 'avaliacao'
              and l.chave = a.id_questao || '|' || coalesce(a.email, '') || '|' || (to_jsonb(a.atualizado_em) #>> '{}')
          ));
end $$;
revoke all on function public.contadores_admin() from public, anon, authenticated;
grant execute on function public.contadores_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
