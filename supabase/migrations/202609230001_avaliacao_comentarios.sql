-- "Este comentário te ajudou?": uma avaliação por pessoa e questão.
-- Cada pessoa só lê e escreve as próprias linhas. O resumo por questão é lido
-- pelo responsável no painel do Supabase (SQL editor), com a consulta ao fim
-- deste arquivo.

create table if not exists public.avaliacoes_comentario (
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id_questao text not null check (id_questao ~ '^[a-z0-9-]{3,80}$'),
  util boolean not null,
  motivo text check (motivo is null or motivo in ('confuso', 'raso', 'errado', 'outro')),
  observacao text check (observacao is null or char_length(observacao) <= 1000),
  atualizado_em timestamptz not null default now(),
  primary key (usuario_id, id_questao)
);

alter table public.avaliacoes_comentario enable row level security;

drop policy if exists "avaliacao: ler as proprias" on public.avaliacoes_comentario;
create policy "avaliacao: ler as proprias" on public.avaliacoes_comentario
  for select to authenticated using (usuario_id = auth.uid());

drop policy if exists "avaliacao: criar as proprias" on public.avaliacoes_comentario;
create policy "avaliacao: criar as proprias" on public.avaliacoes_comentario
  for insert to authenticated with check (usuario_id = auth.uid());

drop policy if exists "avaliacao: mudar as proprias" on public.avaliacoes_comentario;
create policy "avaliacao: mudar as proprias" on public.avaliacoes_comentario
  for update to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

grant select, insert, update on public.avaliacoes_comentario to authenticated;

-- Consulta para o responsável (não é executada pela migração):
--
-- select id_questao,
--        count(*) filter (where util)      as ajudou,
--        count(*) filter (where not util)  as nao_ajudou,
--        string_agg(distinct motivo, ', ') as motivos,
--        string_agg(observacao, ' | ')     as observacoes
-- from public.avaliacoes_comentario
-- group by id_questao
-- order by nao_ajudou desc, ajudou asc;
