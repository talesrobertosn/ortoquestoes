-- Parte 3 de 3 da migração 202610060100 (e-mail de renovação do Pix).
-- Cole TUDO no SQL Editor do Supabase e clique em Run (sem selecionar nada).
begin;
-- Lembrete de renovação para quem pagou no Pix: acesso termina em até 3 dias
-- (e meio, para o envio diário não perder ninguém), sem outra assinatura que
-- vá além (já renovou ou passou para o cartão). Um e-mail por compra.
create or replace function public.candidatos_renovacao_pix_interno()
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_restantes integer, plano text, fim_periodo timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id_usuario, 'pix:' || a.id::text, u.email::text,
         nullif(btrim(u.raw_user_meta_data->>'nome'), ''),
         (select count(*) from public.progresso_usuario p where p.usuario_id = a.id_usuario and p.tipo = 'respondidas' and p.valor <> 'null'::jsonb),
         greatest(0, ceil(extract(epoch from (a.fim_periodo - now())) / 86400))::integer,
         a.plano, a.fim_periodo
  from public.assinaturas a
  join auth.users u on u.id = a.id_usuario
  where a.id_externo like 'pix:%' and a.status = 'ativa'
    and a.fim_periodo > now() and a.fim_periodo <= now() + interval '3 days 12 hours'
    and u.email is not null and u.email_confirmed_at is not null
    and coalesce((select pe.lembretes from public.preferencias_email pe where pe.id_usuario = a.id_usuario), true)
    and not exists (
      select 1 from public.assinaturas b
      where b.id_usuario = a.id_usuario and b.id <> a.id and b.status = 'ativa'
        and coalesce(b.fim_periodo, 'infinity') > a.fim_periodo
    )
    and not exists (
      select 1 from public.emails_enviados e
      where e.tipo = 'lembrete' and e.id_usuario = a.id_usuario and e.referencia = 'pix:' || a.id::text and e.status in ('enviado', 'enviando')
    )
  order by a.fim_periodo;
$$;
revoke all on function public.candidatos_renovacao_pix_interno() from public, anon, authenticated;

create or replace function public.destinatarios_renovacao_pix(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_restantes integer, plano text, fim_periodo timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from public.candidatos_renovacao_pix_interno()
  limit greatest(1, least(coalesce(p_limite, 40), 200));
$$;
revoke all on function public.destinatarios_renovacao_pix(integer) from public, anon, authenticated;
grant execute on function public.destinatarios_renovacao_pix(integer) to service_role;

-- Resumo do painel com a campanha nova.
create or replace function public.resumo_lembretes_admin()
returns table (campanha text, pessoas bigint, enviados_7d bigint, enviados_total bigint, falharam_7d bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select c.campanha,
           case when c.campanha = 'renovacao_pix' then (select count(*) from public.candidatos_renovacao_pix_interno())
                else (select count(*) from public.candidatos_lembrete_interno(c.campanha)) end,
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days'),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'falhou' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days')
    from (values ('nunca', 'nunca'), ('tres_dias', 'tres:%'), ('sete_dias', 'sete:%'), ('renovacao_pix', 'pix:%')) as c(campanha, prefixo);
end $$;
revoke all on function public.resumo_lembretes_admin() from public, anon, authenticated;
grant execute on function public.resumo_lembretes_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
