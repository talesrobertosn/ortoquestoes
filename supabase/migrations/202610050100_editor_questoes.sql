-- Editor de questões no painel do administrador.
--
--   1. questoes_edicoes: a versão editada de uma questão (enunciado, alternativas,
--      gabarito, prova, ano, anulada, imagens e comentário). O acervo continua
--      estático; o site lê esta tabela e aplica a edição por cima da questão.
--   2. Bucket "questoes" no Storage: imagens enviadas pelo editor (leitura
--      pública, escrita só de administrador).
--   3. Relatos de erro: marca quando a pessoa foi avisada por e-mail de que o
--      relato foi resolvido, e libera o tipo "relato_resolvido" no registro de
--      e-mails.
--
-- Rodar inteiro, de uma vez, no SQL Editor do Supabase. Pode rodar de novo sem erro.

-- ---------------------------------------------------------------------------
-- 1. Edições
-- ---------------------------------------------------------------------------
create table if not exists public.questoes_edicoes (
  id_questao text primary key check (id_questao ~ '^[a-z0-9-]{3,80}$'),
  dados jsonb not null check (jsonb_typeof(dados) = 'object' and octet_length(dados::text) <= 60000),
  editado_em timestamptz not null default now(),
  editado_por uuid references auth.users(id) on delete set null
);
alter table public.questoes_edicoes enable row level security;
revoke all on public.questoes_edicoes from public, anon, authenticated;

-- Todas as edições, para o site aplicar. Pública: o conteúdo das questões já é público.
create or replace function public.edicoes_questoes()
returns table (id_questao text, dados jsonb, editado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.id_questao, e.dados, e.editado_em from public.questoes_edicoes e;
$$;
revoke all on function public.edicoes_questoes() from public;
grant execute on function public.edicoes_questoes() to anon, authenticated;

create or replace function public.salvar_edicao_questao(p_id text, p_dados jsonb)
returns timestamptz language plpgsql volatile security definer set search_path = '' as $$
declare v_quando timestamptz := now();
begin
  perform public.exigir_administrador();
  insert into public.questoes_edicoes (id_questao, dados, editado_em, editado_por)
  values (p_id, p_dados, v_quando, auth.uid())
  on conflict (id_questao) do update set dados = excluded.dados, editado_em = excluded.editado_em, editado_por = excluded.editado_por;
  return v_quando;
end $$;
revoke all on function public.salvar_edicao_questao(text, jsonb) from public, anon, authenticated;
grant execute on function public.salvar_edicao_questao(text, jsonb) to authenticated;

-- Desfaz a edição: a questão volta a ser a do acervo.
create or replace function public.remover_edicao_questao(p_id text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  delete from public.questoes_edicoes e where e.id_questao = p_id;
  return found;
end $$;
revoke all on function public.remover_edicao_questao(text) from public, anon, authenticated;
grant execute on function public.remover_edicao_questao(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Imagens (Storage)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('questoes', 'questoes', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "questoes: leitura publica" on storage.objects;
create policy "questoes: leitura publica" on storage.objects
  for select using (bucket_id = 'questoes');

drop policy if exists "questoes: admin envia" on storage.objects;
create policy "questoes: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'questoes' and (select public.eh_administrador()));

drop policy if exists "questoes: admin altera" on storage.objects;
create policy "questoes: admin altera" on storage.objects
  for update to authenticated
  using (bucket_id = 'questoes' and (select public.eh_administrador()));

drop policy if exists "questoes: admin apaga" on storage.objects;
create policy "questoes: admin apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'questoes' and (select public.eh_administrador()));

-- ---------------------------------------------------------------------------
-- 3. Aviso de relato resolvido
-- ---------------------------------------------------------------------------
alter table public.relatos_erro add column if not exists avisado_em timestamptz;

alter table public.emails_enviados drop constraint if exists emails_enviados_tipo_check;
alter table public.emails_enviados add constraint emails_enviados_tipo_check
  check (tipo in ('marco', 'parabens', 'alerta_admin', 'relatorio', 'lembrete', 'relato_resolvido'));

-- A lista do painel passa a dizer se a pessoa já foi avisada.
drop function if exists public.listar_relatos_admin();
create or replace function public.listar_relatos_admin()
returns table (id bigint, id_questao text, tipo text, texto text, status text, nota_admin text, criado_em timestamptz, resolvido_em timestamptz, usuario text, avisado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select r.id, r.id_questao, r.tipo, r.texto, r.status, r.nota_admin, r.criado_em, r.resolvido_em, u.email::text, r.avisado_em
    from public.relatos_erro r left join auth.users u on u.id = r.id_usuario
    order by (r.status = 'aberto') desc, r.criado_em desc
    limit 500;
end $$;
revoke all on function public.listar_relatos_admin() from public, anon, authenticated;
grant execute on function public.listar_relatos_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Simulado de véspera
-- ---------------------------------------------------------------------------
-- Além das edições mensais ("2026-11"), aceita edições especiais com sufixo,
-- como o simulado de véspera da prova ("2027-01-vespera").
alter table public.simulado_edicoes drop constraint if exists simulado_edicoes_edicao_check;
alter table public.simulado_edicoes add constraint simulado_edicoes_edicao_check
  check (edicao ~ '^[0-9]{4}-[0-9]{2}(-[a-z]{3,12})?$');
