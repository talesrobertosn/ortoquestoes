-- Progressão dos flashcards para contas grátis e assinantes.
-- Somente grupos agregados; não libera percentuais do recurso premium.
begin;
create or replace function public.faixas_flashcards()
returns table(id_questao text, faixa integer)
language sql stable security definer set search_path = '' as $$
  with grupos as (
    select t.id_questao,
      percent_rank() over (order by t.acertos::numeric / nullif(t.respondentes, 0) desc) as ordem
    from public.turma_estatisticas t
    where t.respondentes >= 3
  )
  select id_questao, case when ordem <= 0.25 then 1 when ordem <= 0.75 then 2 else 3 end
  from grupos;
$$;
revoke all on function public.faixas_flashcards() from public, anon;
grant execute on function public.faixas_flashcards() to authenticated;
commit;
