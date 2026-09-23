-- O ranking deixa de aceitar apelido livre: qualquer texto digitado ficava
-- visível para todos (inclusive ofensas). O nome público passa a ser sempre
-- o primeiro nome + a inicial do sobrenome, tirados do perfil da conta
-- (auth.users.raw_user_meta_data), e é o próprio banco que o calcula: um
-- apelido enviado pelo cliente é ignorado.
begin;

create or replace function public.nome_publico_ranking(meta jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare
  primeiro text := regexp_replace(split_part(btrim(coalesce(meta->>'nome', '')), ' ', 1), '[^[:alpha:]À-ÿ''-]', '', 'g');
  sobrenome text := regexp_replace(btrim(coalesce(meta->>'sobrenome', '')), '[^[:alpha:]À-ÿ]', '', 'g');
  resultado text;
begin
  resultado := btrim(initcap(left(primeiro, 20)) || case when sobrenome <> '' then ' ' || upper(left(sobrenome, 1)) || '.' else '' end);
  if char_length(resultado) < 2 then return 'Participante'; end if;
  return resultado;
end;
$$;
revoke all on function public.nome_publico_ranking(jsonb) from public, anon, authenticated;

-- Todo insert/update em perfis_publicos recalcula o nome, ignorando o que veio.
create or replace function public.definir_apelido_ranking()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select public.nome_publico_ranking(u.raw_user_meta_data) into new.apelido
  from auth.users u where u.id = new.usuario_id;
  new.apelido := coalesce(new.apelido, 'Participante');
  return new;
end;
$$;
revoke all on function public.definir_apelido_ranking() from public, anon, authenticated;
drop trigger if exists perfis_publicos_apelido on public.perfis_publicos;
create trigger perfis_publicos_apelido
  before insert or update on public.perfis_publicos
  for each row execute function public.definir_apelido_ranking();

-- Quando a pessoa muda nome ou sobrenome em "Meu perfil", o ranking acompanha.
-- Nunca deixa uma falha aqui impedir a atualização da conta.
create or replace function public.sincronizar_apelido_ranking()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.perfis_publicos
     set apelido = public.nome_publico_ranking(new.raw_user_meta_data)
   where usuario_id = new.id;
  return new;
exception when others then
  return new;
end;
$$;
revoke all on function public.sincronizar_apelido_ranking() from public, anon, authenticated;
drop trigger if exists ranking_nome_do_perfil on auth.users;
create trigger ranking_nome_do_perfil
  after update of raw_user_meta_data on auth.users
  for each row when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.sincronizar_apelido_ranking();

-- Troca os apelidos já gravados, sem mexer em atualizado_em (desempate).
alter table public.perfis_publicos disable trigger perfis_publicos_atualizado_em;
update public.perfis_publicos set apelido = apelido;
alter table public.perfis_publicos enable trigger perfis_publicos_atualizado_em;

commit;
