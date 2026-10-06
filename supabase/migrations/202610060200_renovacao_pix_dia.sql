-- Lembretes de renovação do Pix em duas etapas:
--   renovacao_pix       3 dias antes do fim do acesso (de amanhã até 3 dias e meio);
--   renovacao_pix_hoje  no dia em que o acesso termina (data de São Paulo).
-- Um e-mail por compra em cada etapa (referências 'pix:<id>' e 'pixhoje:<id>').
-- O painel vê quem recebe agora (listar_renovacao_pix_admin), abre a prévia de
-- cada pessoa e envia pelo botão. Roda depois da 202610060100.
-- Aditiva: não altera dados.
begin;

drop function if exists public.destinatarios_renovacao_pix(integer);
drop function if exists public.candidatos_renovacao_pix_interno();
drop function if exists public.destinatarios_renovacao_pix(text, integer);
drop function if exists public.candidatos_renovacao_pix_interno(text);
drop function if exists public.listar_renovacao_pix_admin(text);

create function public.candidatos_renovacao_pix_interno(p_etapa text)
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_restantes integer, plano text, fim_periodo timestamptz)
language sql stable security definer set search_path = '' as $$
  with hoje as (select (now() at time zone 'America/Sao_Paulo')::date as dia),
  prefixo as (select case when p_etapa = 'hoje' then 'pixhoje:' else 'pix:' end as p)
  select a.id_usuario, (select p from prefixo) || a.id::text, u.email::text,
         nullif(btrim(u.raw_user_meta_data->>'nome'), ''),
         (select count(*) from public.progresso_usuario p where p.usuario_id = a.id_usuario and p.tipo = 'respondidas' and p.valor <> 'null'::jsonb),
         greatest(0, ((a.fim_periodo at time zone 'America/Sao_Paulo')::date - (select dia from hoje)))::integer,
         a.plano, a.fim_periodo
  from public.assinaturas a
  join auth.users u on u.id = a.id_usuario
  where a.id_externo like 'pix:%'
    and p_etapa in ('tres_dias', 'hoje')
    and (
      (p_etapa = 'tres_dias' and a.status = 'ativa'
        and (a.fim_periodo at time zone 'America/Sao_Paulo')::date > (select dia from hoje)
        and a.fim_periodo <= now() + interval '3 days 12 hours')
      or
      (p_etapa = 'hoje' and a.status in ('ativa', 'vencida')
        and (a.fim_periodo at time zone 'America/Sao_Paulo')::date = (select dia from hoje))
    )
    and u.email is not null and u.email_confirmed_at is not null
    and coalesce((select pe.lembretes from public.preferencias_email pe where pe.id_usuario = a.id_usuario), true)
    -- Já renovou (ou passou para o cartão): existe outra assinatura ativa que vai além.
    and not exists (
      select 1 from public.assinaturas b
      where b.id_usuario = a.id_usuario and b.id <> a.id and b.status = 'ativa'
        and coalesce(b.fim_periodo, 'infinity') > a.fim_periodo
    )
    and not exists (
      select 1 from public.emails_enviados e
      where e.tipo = 'lembrete' and e.id_usuario = a.id_usuario
        and e.referencia = (select p from prefixo) || a.id::text and e.status in ('enviado', 'enviando')
    )
  order by a.fim_periodo;
$$;
revoke all on function public.candidatos_renovacao_pix_interno(text) from public, anon, authenticated;

-- Lote para a Function de e-mail (service_role).
create function public.destinatarios_renovacao_pix(p_etapa text, p_limite integer default 40)
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_restantes integer, plano text, fim_periodo timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from public.candidatos_renovacao_pix_interno(p_etapa)
  limit greatest(1, least(coalesce(p_limite, 40), 200));
$$;
revoke all on function public.destinatarios_renovacao_pix(text, integer) from public, anon, authenticated;
grant execute on function public.destinatarios_renovacao_pix(text, integer) to service_role;

-- Painel: quem recebe agora, com nome, plano, data e o desempenho de cada um.
create function public.listar_renovacao_pix_admin(p_etapa text)
returns table (id_usuario uuid, nome text, email text, plano text, fim_periodo timestamptz, dias_restantes integer, respondidas bigint, acertos bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select c.id_usuario,
           nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), ''),
           c.email, c.plano, c.fim_periodo, c.dias_restantes, c.respondidas,
           (select count(*) from public.progresso_usuario p where p.usuario_id = c.id_usuario and p.tipo = 'respondidas' and p.valor->>'c' = 'true')
    from public.candidatos_renovacao_pix_interno(p_etapa) c
    join auth.users u on u.id = c.id_usuario;
end $$;
revoke all on function public.listar_renovacao_pix_admin(text) from public, anon, authenticated;
grant execute on function public.listar_renovacao_pix_admin(text) to authenticated;

-- Resumo do painel com as duas etapas do Pix.
create or replace function public.resumo_lembretes_admin()
returns table (campanha text, pessoas bigint, enviados_7d bigint, enviados_total bigint, falharam_7d bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select c.campanha,
           case when c.campanha = 'renovacao_pix' then (select count(*) from public.candidatos_renovacao_pix_interno('tres_dias'))
                when c.campanha = 'renovacao_pix_hoje' then (select count(*) from public.candidatos_renovacao_pix_interno('hoje'))
                else (select count(*) from public.candidatos_lembrete_interno(c.campanha)) end,
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days'),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'falhou' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days')
    from (values ('nunca', 'nunca'), ('tres_dias', 'tres:%'), ('sete_dias', 'sete:%'), ('renovacao_pix', 'pix:%'), ('renovacao_pix_hoje', 'pixhoje:%')) as c(campanha, prefixo);
end $$;
revoke all on function public.resumo_lembretes_admin() from public, anon, authenticated;
grant execute on function public.resumo_lembretes_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
