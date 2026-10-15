-- Parte 26: emblemas de Flashcards no ranking e recordes conferidos pelo servidor, 15/10/2026.
-- Cole no SQL Editor do Supabase e execute. Pode colar mais de uma vez: só cria ou substitui funções novas, sem apagar dados.
-- Enquanto não for colada, o site continua funcionando: o ranking de Flashcards aparece sem os emblemas e os emblemas de andar ficam em zero.

-- Emblemas de Flashcards no ranking e recordes conferidos pelo servidor (15/10/2026).
-- Aditiva e idempotente: só cria (ou substitui) duas funções novas. Não altera tabelas
-- nem apaga dados. Pode rodar mais de uma vez.
-- Depende de 202610070500_emblemas_dificeis.sql (conquistas_usuario),
-- 202610021900_conquistas_vitrine.sql (perfis_publicos.emblemas) e
-- 202610130200_flashcards_ranking.sql (flashcards_corridas, flashcards_autorizados).
--
-- 1. meus_recordes_flashcards(): o andar mais fundo e os flashcards únicos da própria
--    conta, contados no servidor (corridas validadas). Os emblemas "Flashcards:
--    profundezas" usam só este andar; o recorde guardado no aparelho não conta.
-- 2. ranking_flashcards_emblemas(p_tipo): o mesmo ranking de ranking_flashcards (mesmos
--    critérios, apelido público, respeita quem saiu do ranking e os ocultos) e mais duas
--    colunas: a vitrine escolhida pela pessoa (emblemas) e os emblemas de Flashcards já
--    conquistados e travados (emblemas_flashcards, ids que começam com "fc-").
--    O site tenta esta função e, se ela ainda não existir, volta para ranking_flashcards.
begin;

create or replace function public.meus_recordes_flashcards()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  return jsonb_build_object(
    'andar_masmorra', coalesce((select max(c.andar) from public.flashcards_corridas c
                                 where c.id_usuario = v_uid and c.modo = 'masmorra'), 0),
    'unicos', (select count(distinct a.id_flashcard) from public.flashcards_autorizados a
                where a.id_usuario = v_uid)
  );
end $$;
revoke all on function public.meus_recordes_flashcards() from public, anon, authenticated;
grant execute on function public.meus_recordes_flashcards() to authenticated;

create or replace function public.ranking_flashcards_emblemas(p_tipo text)
returns table(posicao bigint, apelido text, valor bigint, eh_voce boolean, emblemas text[], emblemas_flashcards text[])
language sql security definer set search_path = '' stable as $$
  with valores as (
    select c.id_usuario as usuario_id, max(c.andar)::bigint as valor, min(c.atualizada_em) as quando
      from public.flashcards_corridas c
     where p_tipo in ('masmorra', 'torre') and c.modo = p_tipo
     group by c.id_usuario
    union all
    select a.id_usuario, count(distinct a.id_flashcard)::bigint, min(a.criado_em)
      from public.flashcards_autorizados a
     where p_tipo = 'unicos'
     group by a.id_usuario
  ),
  ranking as (
    select coalesce(pp.apelido, public.nome_publico_ranking(u.raw_user_meta_data)) as apelido, v.valor, v.usuario_id,
           coalesce(pp.emblemas, '{}'::text[]) as emblemas,
           row_number() over (order by v.valor desc, v.quando asc) as posicao
      from valores v
      join auth.users u on u.id = v.usuario_id
      left join public.perfis_publicos pp on pp.usuario_id = v.usuario_id
     where coalesce(pp.participa_ranking, true)
       and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = v.usuario_id)
  )
  select r.posicao, r.apelido, r.valor, r.usuario_id = auth.uid() as eh_voce, r.emblemas,
         coalesce((select array_agg(cu.emblema order by cu.emblema) from public.conquistas_usuario cu
                    where cu.usuario_id = r.usuario_id and cu.emblema like 'fc-%'), '{}'::text[]) as emblemas_flashcards
    from ranking r
   order by r.posicao
   limit 50;
$$;
revoke all on function public.ranking_flashcards_emblemas(text) from public;
grant execute on function public.ranking_flashcards_emblemas(text) to authenticated, anon;

notify pgrst, 'reload schema';
commit;
