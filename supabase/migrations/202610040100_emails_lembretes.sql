-- E-mails de lembrete (reengajamento), disparados pelo painel do administrador:
--   nunca      contas com pelo menos um dia que ainda não responderam nenhuma questão
--   tres_dias  quem respondia e está de 3 a 6 dias sem aparecer
--   sete_dias  quem respondia e está de 7 a 90 dias sem aparecer
-- "Aparecer" é o mais recente entre: resposta sincronizada, sinal do aparelho e login.
-- Cada pessoa recebe no máximo um e-mail por ausência (a referência leva o dia do último
-- acesso), e o de boas-vindas só uma vez. Quem desligar os lembretes em Minha conta ou
-- pelo link do e-mail não recebe mais. Aditiva: não altera dados existentes.
begin;

alter table public.preferencias_email add column if not exists lembretes boolean not null default true;

alter table public.emails_enviados drop constraint if exists emails_enviados_tipo_check;
alter table public.emails_enviados add constraint emails_enviados_tipo_check
  check (tipo in ('marco', 'parabens', 'alerta_admin', 'relatorio', 'lembrete'));
create unique index if not exists emails_enviados_lembrete_unico
  on public.emails_enviados (id_usuario, referencia) where tipo = 'lembrete';

-- Quem está em cada campanha agora. Interna: só as funções abaixo chamam.
create or replace function public.candidatos_lembrete_interno(p_campanha text)
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_fora integer)
language sql stable security definer set search_path = '' as $$
  with progresso as (
    select p.usuario_id, count(*) filter (where p.valor <> 'null'::jsonb) as respondidas, max(p.atualizado_em) as ultima
    from public.progresso_usuario p
    where p.tipo = 'respondidas'
    group by p.usuario_id
  ),
  contas as (
    select u.id, u.email::text as email, u.created_at,
           nullif(btrim(u.raw_user_meta_data->>'nome'), '') as nome,
           coalesce(pr.respondidas, 0) as respondidas,
           greatest(pr.ultima, sa.visto_em, u.last_sign_in_at, u.created_at) as ultimo_acesso
    from auth.users u
    left join progresso pr on pr.usuario_id = u.id
    left join public.sessoes_aparelho sa on sa.id_usuario = u.id
    where u.email is not null and u.email_confirmed_at is not null
      and coalesce((select pe.lembretes from public.preferencias_email pe where pe.id_usuario = u.id), true)
  ),
  campanha as (
    select c.id, c.email, c.nome, c.respondidas, c.ultimo_acesso,
           case p_campanha
             when 'nunca' then 'nunca'
             when 'tres_dias' then 'tres:' || to_char(c.ultimo_acesso at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')
             when 'sete_dias' then 'sete:' || to_char(c.ultimo_acesso at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')
           end as referencia
    from contas c
    where case p_campanha
            when 'nunca' then c.respondidas = 0 and c.created_at <= now() - interval '1 day'
            when 'tres_dias' then c.respondidas > 0 and c.ultimo_acesso <= now() - interval '3 days' and c.ultimo_acesso > now() - interval '7 days'
            when 'sete_dias' then c.respondidas > 0 and c.ultimo_acesso <= now() - interval '7 days' and c.ultimo_acesso > now() - interval '90 days'
            else false
          end
  )
  select ca.id, ca.referencia, ca.email, ca.nome, ca.respondidas,
         floor(extract(epoch from (now() - ca.ultimo_acesso)) / 86400)::integer
  from campanha ca
  where not exists (
    select 1 from public.emails_enviados e
    where e.tipo = 'lembrete' and e.id_usuario = ca.id and e.referencia = ca.referencia and e.status in ('enviado', 'enviando')
  )
  order by ca.ultimo_acesso desc;
$$;
revoke all on function public.candidatos_lembrete_interno(text) from public, anon, authenticated;

-- Lote para a Function de e-mail (service_role).
create or replace function public.destinatarios_lembrete(p_campanha text, p_limite integer default 40)
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_fora integer)
language sql stable security definer set search_path = '' as $$
  select * from public.candidatos_lembrete_interno(p_campanha)
  limit greatest(1, least(coalesce(p_limite, 40), 200));
$$;
revoke all on function public.destinatarios_lembrete(text, integer) from public, anon, authenticated;
grant execute on function public.destinatarios_lembrete(text, integer) to service_role;

-- Painel: quantas pessoas cada botão alcança agora e quantos e-mails já saíram.
create or replace function public.resumo_lembretes_admin()
returns table (campanha text, pessoas bigint, enviados_7d bigint, enviados_total bigint, falharam_7d bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select c.campanha,
           (select count(*) from public.candidatos_lembrete_interno(c.campanha)),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days'),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'falhou' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days')
    from (values ('nunca', 'nunca'), ('tres_dias', 'tres:%'), ('sete_dias', 'sete:%')) as c(campanha, prefixo);
end $$;
revoke all on function public.resumo_lembretes_admin() from public, anon, authenticated;
grant execute on function public.resumo_lembretes_admin() to authenticated;

-- Preferência em Minha conta.
create or replace function public.obter_preferencia_lembretes()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select pe.lembretes from public.preferencias_email pe where pe.id_usuario = auth.uid()), true);
$$;
revoke all on function public.obter_preferencia_lembretes() from public, anon, authenticated;
grant execute on function public.obter_preferencia_lembretes() to authenticated;

create or replace function public.definir_preferencia_lembretes(p_lembretes boolean)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  insert into public.preferencias_email (id_usuario, lembretes, atualizado_em) values (auth.uid(), coalesce(p_lembretes, true), now())
  on conflict (id_usuario) do update set lembretes = excluded.lembretes, atualizado_em = now();
  return coalesce(p_lembretes, true);
end $$;
revoke all on function public.definir_preferencia_lembretes(boolean) from public, anon, authenticated;
grant execute on function public.definir_preferencia_lembretes(boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
