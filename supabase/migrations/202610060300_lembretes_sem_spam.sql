-- Lembretes sem spam:
-- 1) Intervalo mínimo de 2 dias entre lembretes para a mesma pessoa, somando
--    todas as campanhas. A única exceção é "Pix: termina hoje", o último aviso
--    antes de o acesso acabar.
-- 2) O painel vê, em cada campanha, o nome de quem recebe, o último lembrete
--    que a pessoa recebeu (quando e qual) e quantos recebeu em 30 dias. Quem
--    está dentro do intervalo aparece como "aguardando" e não entra no envio.
-- Roda depois da 202610060200. Aditiva: não altera dados.
begin;

-- Pode receber agora? (sem lembrete enviado nas últimas 48 horas)
create or replace function public.lembrete_liberado_interno(p_usuario uuid, p_campanha text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_campanha = 'renovacao_pix_hoje' or not exists (
    select 1 from public.emails_enviados e
    where e.tipo = 'lembrete' and e.id_usuario = p_usuario
      and e.status in ('enviado', 'enviando') and e.enviado_em > now() - interval '2 days'
  );
$$;
revoke all on function public.lembrete_liberado_interno(uuid, text) from public, anon, authenticated;

-- Lotes para a Function de e-mail, agora respeitando o intervalo.
create or replace function public.destinatarios_lembrete(p_campanha text, p_limite integer default 40)
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_fora integer)
language sql stable security definer set search_path = '' as $$
  select c.* from public.candidatos_lembrete_interno(p_campanha) c
  where public.lembrete_liberado_interno(c.id_usuario, p_campanha)
  limit greatest(1, least(coalesce(p_limite, 40), 200));
$$;
revoke all on function public.destinatarios_lembrete(text, integer) from public, anon, authenticated;
grant execute on function public.destinatarios_lembrete(text, integer) to service_role;

create or replace function public.destinatarios_renovacao_pix(p_etapa text, p_limite integer default 40)
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_restantes integer, plano text, fim_periodo timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.* from public.candidatos_renovacao_pix_interno(p_etapa) c
  where public.lembrete_liberado_interno(c.id_usuario, case when p_etapa = 'hoje' then 'renovacao_pix_hoje' else 'renovacao_pix' end)
  limit greatest(1, least(coalesce(p_limite, 40), 200));
$$;
revoke all on function public.destinatarios_renovacao_pix(text, integer) from public, anon, authenticated;
grant execute on function public.destinatarios_renovacao_pix(text, integer) to service_role;

-- Painel: quem está em cada campanha, com o histórico de lembretes de cada pessoa.
drop function if exists public.listar_destinatarios_lembrete_admin(text);
create function public.listar_destinatarios_lembrete_admin(p_campanha text)
returns table (
  id_usuario uuid, nome text, email text, respondidas bigint, acertos bigint,
  dias_fora integer, dias_restantes integer, plano text, fim_periodo timestamptz,
  ultimo_lembrete_em timestamptz, ultimo_lembrete_assunto text, lembretes_30d bigint, liberado boolean
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    with base as (
      select c.id_usuario, c.email, c.respondidas, c.dias_fora, null::integer as dias_restantes, null::text as plano, null::timestamptz as fim_periodo
      from public.candidatos_lembrete_interno(p_campanha) c
      where p_campanha in ('nunca', 'tres_dias', 'sete_dias')
      union all
      select c.id_usuario, c.email, c.respondidas, null::integer, c.dias_restantes, c.plano, c.fim_periodo
      from public.candidatos_renovacao_pix_interno(case when p_campanha = 'renovacao_pix_hoje' then 'hoje' else 'tres_dias' end) c
      where p_campanha in ('renovacao_pix', 'renovacao_pix_hoje')
    )
    select b.id_usuario,
           nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), ''),
           b.email, b.respondidas,
           (select count(*) from public.progresso_usuario p where p.usuario_id = b.id_usuario and p.tipo = 'respondidas' and p.valor->>'c' = 'true'),
           b.dias_fora, b.dias_restantes, b.plano, b.fim_periodo,
           ul.enviado_em, ul.assunto,
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.id_usuario = b.id_usuario and e.status = 'enviado' and e.enviado_em > now() - interval '30 days'),
           public.lembrete_liberado_interno(b.id_usuario, p_campanha)
    from base b
    join auth.users u on u.id = b.id_usuario
    left join lateral (
      select e.enviado_em, e.assunto from public.emails_enviados e
      where e.tipo = 'lembrete' and e.id_usuario = b.id_usuario and e.status = 'enviado'
      order by e.enviado_em desc limit 1
    ) ul on true
    order by public.lembrete_liberado_interno(b.id_usuario, p_campanha) desc, ul.enviado_em asc nulls first;
end $$;
revoke all on function public.listar_destinatarios_lembrete_admin(text) from public, anon, authenticated;
grant execute on function public.listar_destinatarios_lembrete_admin(text) to authenticated;

-- Resumo: "pessoas" passa a contar só quem está liberado agora.
create or replace function public.resumo_lembretes_admin()
returns table (campanha text, pessoas bigint, enviados_7d bigint, enviados_total bigint, falharam_7d bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select c.campanha,
           case when c.campanha = 'renovacao_pix' then (select count(*) from public.candidatos_renovacao_pix_interno('tres_dias') x where public.lembrete_liberado_interno(x.id_usuario, 'renovacao_pix'))
                when c.campanha = 'renovacao_pix_hoje' then (select count(*) from public.candidatos_renovacao_pix_interno('hoje'))
                else (select count(*) from public.candidatos_lembrete_interno(c.campanha) x where public.lembrete_liberado_interno(x.id_usuario, c.campanha)) end,
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days'),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'falhou' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days')
    from (values ('nunca', 'nunca'), ('tres_dias', 'tres:%'), ('sete_dias', 'sete:%'), ('renovacao_pix', 'pix:%'), ('renovacao_pix_hoje', 'pixhoje:%')) as c(campanha, prefixo);
end $$;
revoke all on function public.resumo_lembretes_admin() from public, anon, authenticated;
grant execute on function public.resumo_lembretes_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
