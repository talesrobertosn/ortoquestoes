-- Cripta do Residente: ranking separado por dificuldade (Normal e Difícil).
--
-- Não destrutiva: só acrescenta uma coluna com valor padrão e funções novas.
-- Depende de 202610130100_flashcards_limite_e_progresso.sql e de
-- 202610130200_flashcards_ranking.sql.
--
-- Regras (diretriz do Tales, 13/10/2026):
--   - a dificuldade é gravada quando a corrida abre e não muda depois
--     (não há função que a altere; o "on conflict do nothing" impede trocar);
--   - o Fácil não entra na competição: o servidor recusa abrir corrida Fácil;
--   - indicador: o maior andar aceito pelo servidor numa corrida (a mesma
--     validação de 202610130200: 2 flashcards autorizados por andar vencido,
--     nunca para trás, Torre até 100);
--   - desempate determinístico: quem chegou primeiro àquele andar (o momento
--     em que o servidor aceitou o andar, guardado em atualizada_em) e, por fim,
--     o id da conta;
--   - só apelido público e posição; nunca e-mail. Respeita quem saiu do ranking.
-- As corridas abertas antes desta parte ficam como Normal (o ranking estava
-- desligado, então não deve haver nenhuma).

begin;

alter table public.flashcards_corridas add column if not exists nivel text not null default 'normal';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'flashcards_corridas_nivel_valido') then
    alter table public.flashcards_corridas add constraint flashcards_corridas_nivel_valido check (nivel in ('normal', 'dificil'));
  end if;
end $$;
create index if not exists flashcards_corridas_ranking_idx on public.flashcards_corridas (modo, nivel, andar desc, atualizada_em asc);

-- Abre a corrida já com a dificuldade. Fácil não abre (fica fora do ranking).
create or replace function public.iniciar_corrida_flashcards(p_id uuid, p_modo text, p_nivel text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_modo not in ('masmorra', 'torre') then raise exception 'modo_invalido'; end if;
  if p_nivel not in ('normal', 'dificil') then raise exception 'nivel_fora_do_ranking'; end if;
  insert into public.flashcards_corridas(id, id_usuario, modo, nivel) values (p_id, auth.uid(), p_modo, p_nivel) on conflict (id) do nothing;
end $$;
revoke all on function public.iniciar_corrida_flashcards(uuid, text, text) from public;
grant execute on function public.iniciar_corrida_flashcards(uuid, text, text) to authenticated;

-- Ranking por modo e dificuldade: maior andar de cada conta, desempate por quem chegou primeiro.
create or replace function public.ranking_cripta(p_modo text, p_nivel text)
returns table(posicao bigint, apelido text, andar integer, alcancado_em timestamptz, eh_voce boolean)
language sql security definer set search_path = '' stable as $$
  with melhores as (
    select distinct on (c.id_usuario) c.id_usuario, c.andar, c.atualizada_em
      from public.flashcards_corridas c
     where c.modo = p_modo and c.nivel = p_nivel and c.andar > 1
     order by c.id_usuario, c.andar desc, c.atualizada_em asc
  ),
  ranking as (
    select coalesce(pp.apelido, public.nome_publico_ranking(u.raw_user_meta_data)) as apelido, m.andar, m.atualizada_em, m.id_usuario,
           row_number() over (order by m.andar desc, m.atualizada_em asc, m.id_usuario asc) as posicao
      from melhores m
      join auth.users u on u.id = m.id_usuario
      left join public.perfis_publicos pp on pp.usuario_id = m.id_usuario
     where coalesce(pp.participa_ranking, true)
       and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = m.id_usuario)
  )
  select posicao, apelido, andar, atualizada_em, id_usuario = auth.uid() from ranking where p_modo in ('masmorra', 'torre') and p_nivel in ('normal', 'dificil')
   order by posicao limit 50;
$$;
revoke all on function public.ranking_cripta(text, text) from public;
grant execute on function public.ranking_cripta(text, text) to authenticated, anon;

-- Posição da própria conta (quando está fora dos 50 primeiros).
create or replace function public.minha_posicao_cripta(p_modo text, p_nivel text)
returns table(posicao bigint, andar integer, alcancado_em timestamptz)
language sql security definer set search_path = '' stable as $$
  with melhores as (
    select distinct on (c.id_usuario) c.id_usuario, c.andar, c.atualizada_em
      from public.flashcards_corridas c
     where c.modo = p_modo and c.nivel = p_nivel and c.andar > 1
     order by c.id_usuario, c.andar desc, c.atualizada_em asc
  ),
  ranking as (
    select m.*, row_number() over (order by m.andar desc, m.atualizada_em asc, m.id_usuario asc) as posicao
      from melhores m
      left join public.perfis_publicos pp on pp.usuario_id = m.id_usuario
     where coalesce(pp.participa_ranking, true)
       and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = m.id_usuario)
  )
  select posicao, andar, atualizada_em from ranking where id_usuario = auth.uid();
$$;
revoke all on function public.minha_posicao_cripta(text, text) from public;
grant execute on function public.minha_posicao_cripta(text, text) to authenticated;

commit;
