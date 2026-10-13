-- Cripta do Residente: ranking da Cripta (andar mais fundo), da Torre do Título
-- (andar mais alto) e de flashcards únicos respondidos.
--
-- Não destrutiva: cria uma tabela de corridas, uma coluna opcional no livro de
-- flashcards autorizados e funções novas. Nada é apagado nem reescrito.
-- Depende de 202610130100_flashcards_limite_e_progresso.sql.
--
-- Anti-trapaça (o cliente nunca decide o recorde sozinho):
--   - cada partida abre uma corrida no servidor (iniciar_corrida_flashcards);
--   - cada flashcard autorizado com a corrida conta para ela;
--   - registrar_andar_flashcards só aceita o andar se a corrida tiver pelo
--     menos 2 flashcards autorizados por andar vencido e não andar para trás;
--   - a Torre não passa de 100.
-- Os ids e os nomes seguem o ranking geral (apelido público, ocultos fora).
--
-- Ligar no build depois de aplicar: VITE_FLASHCARDS_RANKING=1.

begin;

alter table public.flashcards_autorizados add column if not exists id_corrida uuid null;
create index if not exists flashcards_autorizados_corrida_idx on public.flashcards_autorizados (id_corrida) where id_corrida is not null;

create table if not exists public.flashcards_corridas (
  id uuid primary key,
  id_usuario uuid not null references auth.users(id) on delete cascade,
  modo text not null check (modo in ('masmorra', 'torre')),
  andar integer not null default 1 check (andar between 1 and 10000),
  iniciada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now()
);
create index if not exists flashcards_corridas_usuario_idx on public.flashcards_corridas (id_usuario, modo, andar desc);
alter table public.flashcards_corridas enable row level security;
drop policy if exists flashcards_corridas_ler on public.flashcards_corridas;
create policy flashcards_corridas_ler on public.flashcards_corridas for select to authenticated using (id_usuario = auth.uid());

create or replace function public.iniciar_corrida_flashcards(p_id uuid, p_modo text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_modo not in ('masmorra', 'torre') then raise exception 'modo_invalido'; end if;
  insert into public.flashcards_corridas(id, id_usuario, modo) values (p_id, auth.uid(), p_modo) on conflict (id) do nothing;
end $$;
revoke all on function public.iniciar_corrida_flashcards(uuid, text) from public;
grant execute on function public.iniciar_corrida_flashcards(uuid, text) to authenticated;

-- Liga um flashcard já autorizado (pela chave de idempotência) à corrida da conta.
create or replace function public.vincular_flashcard_corrida(p_chave_idempotencia uuid, p_corrida uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  update public.flashcards_autorizados a set id_corrida = p_corrida
   where a.chave_idempotencia = p_chave_idempotencia and a.id_usuario = auth.uid() and a.id_corrida is null
     and exists (select 1 from public.flashcards_corridas c where c.id = p_corrida and c.id_usuario = auth.uid());
end $$;
revoke all on function public.vincular_flashcard_corrida(uuid, uuid) from public;
grant execute on function public.vincular_flashcard_corrida(uuid, uuid) to authenticated;

create or replace function public.registrar_andar_flashcards(p_corrida uuid, p_andar integer)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_corrida public.flashcards_corridas%rowtype;
  v_respostas integer;
  v_aceito integer;
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select * into v_corrida from public.flashcards_corridas where id = p_corrida and id_usuario = auth.uid() for update;
  if not found then raise exception 'corrida_inexistente'; end if;
  select count(*) into v_respostas from public.flashcards_autorizados where id_corrida = p_corrida and id_usuario = auth.uid();
  -- no mínimo 2 flashcards por andar vencido (ninguém vence um adversário em menos)
  v_aceito := least(greatest(p_andar, 1), 1 + v_respostas / 2, case when v_corrida.modo = 'torre' then 100 else 10000 end);
  if v_aceito > v_corrida.andar then
    update public.flashcards_corridas set andar = v_aceito, atualizada_em = now() where id = p_corrida;
  end if;
  return greatest(v_aceito, v_corrida.andar);
end $$;
revoke all on function public.registrar_andar_flashcards(uuid, integer) from public;
grant execute on function public.registrar_andar_flashcards(uuid, integer) to authenticated;

-- Ranking: 'masmorra' (andar mais fundo), 'torre' (andar mais alto) ou 'unicos' (flashcards únicos).
create or replace function public.ranking_flashcards(p_tipo text)
returns table(posicao bigint, apelido text, valor bigint, eh_voce boolean)
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
           row_number() over (order by v.valor desc, v.quando asc) as posicao
      from valores v
      join auth.users u on u.id = v.usuario_id
      left join public.perfis_publicos pp on pp.usuario_id = v.usuario_id
     where coalesce(pp.participa_ranking, true)
       and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = v.usuario_id)
  )
  select posicao, apelido, valor, usuario_id = auth.uid() as eh_voce from ranking order by posicao limit 50;
$$;
revoke all on function public.ranking_flashcards(text) from public;
grant execute on function public.ranking_flashcards(text) to authenticated, anon;

commit;
