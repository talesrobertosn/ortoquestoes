-- Beta público dos flashcards: opiniões dos usuários (diretriz do Tales, 13/10/2026).
--
-- Não destrutiva: só cria uma tabela e funções novas.
-- O que é guardado (e só isto): categoria, as respostas que a pessoa escreveu ou
-- escolheu, o tipo de aparelho e a tela de onde veio. Nada de prints, respostas
-- médicas, histórico detalhado ou e-mail. A conta fica ligada ao registro só para
-- o administrador poder responder; a leitura é restrita a administradores.

begin;

create table if not exists public.opinioes_flashcards (
  id bigint generated always as identity primary key,
  id_usuario uuid null references auth.users(id) on delete set null,
  categoria text not null check (categoria in ('som', 'visual', 'desempenho', 'conteudo', 'outro')),
  facil_estudar smallint null check (facil_estudar between 1 and 5),
  experiencia_visual smallint null check (experiencia_visual between 1 and 5),
  som_celular text null check (som_celular in ('sim', 'nao', 'nao_testei')),
  problema text null check (length(problema) <= 1500),
  melhorar text null check (length(melhorar) <= 1500),
  origem text not null default 'central' check (origem in ('central', 'fim_sessao', 'fim_partida', 'convite')),
  aparelho text null check (aparelho in ('celular', 'tablet', 'computador')),
  status text not null default 'aberta' check (status in ('aberta', 'lida', 'resolvida')),
  criada_em timestamptz not null default now()
);
create index if not exists opinioes_flashcards_data_idx on public.opinioes_flashcards (criada_em desc);
alter table public.opinioes_flashcards enable row level security;

create or replace function public.enviar_opiniao_flashcards(
  p_categoria text, p_facil smallint, p_visual smallint, p_som text, p_problema text, p_melhorar text, p_origem text, p_aparelho text
) returns bigint language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if coalesce(btrim(p_problema), '') = '' and coalesce(btrim(p_melhorar), '') = '' and p_facil is null and p_visual is null and p_som is null then
    raise exception 'opiniao_vazia';
  end if;
  -- no máximo 10 opiniões por conta a cada hora (evita envio repetido por engano)
  if (select count(*) from public.opinioes_flashcards where id_usuario = auth.uid() and criada_em > now() - interval '1 hour') >= 10 then
    raise exception 'muitas_opinioes';
  end if;
  insert into public.opinioes_flashcards(id_usuario, categoria, facil_estudar, experiencia_visual, som_celular, problema, melhorar, origem, aparelho)
  values (auth.uid(), p_categoria, p_facil, p_visual, p_som, nullif(btrim(coalesce(p_problema, '')), ''), nullif(btrim(coalesce(p_melhorar, '')), ''), coalesce(p_origem, 'central'), p_aparelho)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.enviar_opiniao_flashcards(text, smallint, smallint, text, text, text, text, text) from public, anon;
grant execute on function public.enviar_opiniao_flashcards(text, smallint, smallint, text, text, text, text, text) to authenticated;

create or replace function public.listar_opinioes_flashcards_admin()
returns table (id bigint, categoria text, facil_estudar smallint, experiencia_visual smallint, som_celular text, problema text, melhorar text, origem text, aparelho text, status text, criada_em timestamptz, usuario text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select o.id, o.categoria, o.facil_estudar, o.experiencia_visual, o.som_celular, o.problema, o.melhorar, o.origem, o.aparelho, o.status, o.criada_em, u.email::text
      from public.opinioes_flashcards o left join auth.users u on u.id = o.id_usuario
     order by (o.status = 'aberta') desc, o.criada_em desc
     limit 500;
end $$;
revoke all on function public.listar_opinioes_flashcards_admin() from public, anon, authenticated;
grant execute on function public.listar_opinioes_flashcards_admin() to authenticated;

commit;
