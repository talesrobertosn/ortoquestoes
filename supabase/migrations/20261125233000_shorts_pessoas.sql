-- Shorts: quem está usando (Tales, 25/11/2026: "confere se aparece no painel do administrador que o usuário está
-- vendo no Shorts"). Guarda, por pessoa, quando ela viu os Shorts pela última vez e quantas questões passou na tela;
-- o painel ganha a lista de pessoas (vendo agora, Shorts de hoje, total e acerto). Só cria uma tabela, um gatilho e
-- funções; não altera nem apaga dados existentes. Rodar depois de 20261125220000_shorts.sql.
begin;

create table if not exists public.shorts_atividade (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  primeira_em timestamptz not null default now(),
  visto_em timestamptz not null default now(),
  vistas integer not null default 0
);
alter table public.shorts_atividade enable row level security;
-- Quem já respondeu antes deste SQL também entra na lista.
insert into public.shorts_atividade (usuario_id, primeira_em, visto_em)
  select r.usuario_id, min(r.criado_em), max(r.criado_em) from public.shorts_respostas r group by r.usuario_id
  on conflict (usuario_id) do nothing;

-- Responder também conta como estar vendo.
create or replace function public.shorts_marcar_atividade()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.shorts_atividade (usuario_id, visto_em) values (new.usuario_id, now())
    on conflict (usuario_id) do update set visto_em = now();
  return new;
end $$;
revoke all on function public.shorts_marcar_atividade() from public, anon, authenticated;
drop trigger if exists shorts_respostas_atividade on public.shorts_respostas;
create trigger shorts_respostas_atividade after insert on public.shorts_respostas for each row execute function public.shorts_marcar_atividade();

-- Vistas e pulos em lotes; chamada vazia serve de sinal de "está nos Shorts agora" (o aparelho manda a cada minuto).
create or replace function public.registrar_vistas_shorts(p_vistas text[], p_puladas text[])
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_n integer := coalesce(array_length((coalesce(p_vistas, '{}'))[1:100], 1), 0);
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  insert into public.shorts_atividade (usuario_id, visto_em, vistas) values (v_usuario, now(), v_n)
    on conflict (usuario_id) do update set visto_em = now(), vistas = public.shorts_atividade.vistas + v_n;
  insert into public.shorts_contagem (id_questao, vistas, puladas)
    select v.id, count(*)::integer, 0 from unnest((coalesce(p_vistas, '{}'))[1:100]) as v(id) where v.id ~ '^[a-z0-9-]{3,80}$' group by v.id
    on conflict (id_questao) do update set vistas = public.shorts_contagem.vistas + excluded.vistas, atualizado_em = now();
  insert into public.shorts_contagem (id_questao, vistas, puladas)
    select p.id, 0, count(*)::integer from unnest((coalesce(p_puladas, '{}'))[1:100]) as p(id) where p.id ~ '^[a-z0-9-]{3,80}$' group by p.id
    on conflict (id_questao) do update set puladas = public.shorts_contagem.puladas + excluded.puladas, atualizado_em = now();
end $$;
revoke all on function public.registrar_vistas_shorts(text[], text[]) from public, anon;
grant execute on function public.registrar_vistas_shorts(text[], text[]) to authenticated;

-- Painel: as pessoas que usaram os Shorts, da mais recente para a mais antiga.
create or replace function public.shorts_pessoas_admin()
returns table (id_usuario uuid, usuario text, primeira_em timestamptz, visto_em timestamptz, vistas integer,
               hoje integer, total integer, acertos integer, revisoes integer, ilimitado boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_inicio timestamptz := date_trunc('day', clock_timestamp() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  perform public.exigir_administrador();
  return query
    select a.usuario_id, u.email::text, a.primeira_em, a.visto_em, a.vistas,
      coalesce(r.hoje, 0)::integer, coalesce(r.total, 0)::integer, coalesce(r.acertos, 0)::integer, coalesce(r.revisoes, 0)::integer,
      public.shorts_sem_limite(a.usuario_id)
    from public.shorts_atividade a
    left join auth.users u on u.id = a.usuario_id
    left join (select s.usuario_id, count(*) filter (where s.criado_em >= v_inicio) as hoje, count(*) as total,
                 count(*) filter (where s.certo) as acertos, count(*) filter (where s.revisao) as revisoes
               from public.shorts_respostas s group by s.usuario_id) r on r.usuario_id = a.usuario_id
    order by a.visto_em desc
    limit 300;
end $$;
revoke all on function public.shorts_pessoas_admin() from public, anon;
grant execute on function public.shorts_pessoas_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
