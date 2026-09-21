-- Ranking público, opcional. Nome, sobrenome e demais dados de "Meu perfil"
-- continuam privados como já era: esta tabela só existe porque a pessoa
-- decide ativamente participar e escolher como aparece para as demais.
begin;

create table public.perfis_publicos (
  usuario_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  apelido text not null,
  participa_ranking boolean not null default false,
  atualizado_em timestamptz not null default now(),
  constraint tamanho_apelido check (char_length(btrim(apelido)) between 2 and 40),
  constraint apelido_sem_marcacao check (apelido !~ '[<>]')
);

alter table public.perfis_publicos enable row level security;
revoke all on public.perfis_publicos from anon, authenticated;

grant select on public.perfis_publicos to authenticated;
-- Uma linha só é visível a terceiros quando a própria pessoa ligou o
-- ranking; o dono sempre enxerga a própria linha, para saber o estado atual.
create policy "Perfil público visível a quem participa, e sempre ao dono" on public.perfis_publicos
  for select to authenticated using (participa_ranking = true or (select auth.uid()) = usuario_id);

grant insert, update on public.perfis_publicos to authenticated;
create policy "Cada pessoa cria apenas seu perfil público" on public.perfis_publicos
  for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "Cada pessoa altera apenas seu perfil público" on public.perfis_publicos
  for update to authenticated using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create function public.tocar_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;
create trigger perfis_publicos_atualizado_em
  before update on public.perfis_publicos
  for each row execute function public.tocar_atualizado_em();

-- Lê todas as contas para contar (por isso security definer), mas só
-- devolve posição, apelido e total de quem ligou o ranking — nunca o
-- conteúdo das respostas, e-mail ou qualquer outro dado de perfil.
create function public.obter_ranking_publico()
returns table(posicao bigint, apelido text, total bigint, eh_voce boolean)
language sql security definer set search_path = '' stable as $$
  with contagem as (
    select usuario_id, count(*) as total
    from public.progresso_usuario
    where tipo = 'respondidas' and valor <> 'null'::jsonb
    group by usuario_id
  ),
  ranking as (
    select pp.apelido, c.total, c.usuario_id,
           row_number() over (order by c.total desc, pp.atualizado_em asc) as posicao
    from contagem c
    join public.perfis_publicos pp on pp.usuario_id = c.usuario_id and pp.participa_ranking = true
  )
  select posicao, apelido, total, usuario_id = auth.uid() as eh_voce
  from ranking
  order by posicao
  limit 50;
$$;
revoke all on function public.obter_ranking_publico() from public, anon;
grant execute on function public.obter_ranking_publico() to authenticated;

-- Complemento do topo 50: a posição de quem está participando, mesmo fora
-- da lista. Devolve zero linhas para quem não participa ou ainda não
-- respondeu nenhuma questão.
create function public.minha_posicao_ranking()
returns table(posicao bigint, total bigint)
language sql security definer set search_path = '' stable as $$
  with contagem as (
    select usuario_id, count(*) as total
    from public.progresso_usuario
    where tipo = 'respondidas' and valor <> 'null'::jsonb
    group by usuario_id
  ),
  ranking as (
    select c.usuario_id, c.total,
           row_number() over (order by c.total desc) as posicao
    from contagem c
    join public.perfis_publicos pp on pp.usuario_id = c.usuario_id and pp.participa_ranking = true
  )
  select posicao, total from ranking where usuario_id = auth.uid();
$$;
revoke all on function public.minha_posicao_ranking() from public, anon;
grant execute on function public.minha_posicao_ranking() to authenticated;

notify pgrst, 'reload schema';
commit;
