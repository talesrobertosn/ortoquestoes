-- E-mails › Prontas para enviar (Tales, 05/11/2026).
--
-- listar_sugestoes_cartas_admin: quem estudou nos últimos 90 dias ou criou a conta nos últimos 30, com os
-- mesmos dados das cartas pessoais (dados_cartas_interno). O painel escolhe a carta que combina com cada
-- pessoa e o administrador envia uma a uma. Só leitura: não envia nada e não altera dados.
-- Fica de fora quem recebeu e-mail nas últimas 48 horas, quem não confirmou o e-mail, administradores e
-- (se a tabela existir) as contas marcadas fora do público-alvo. O envio continua conferindo as travas no
-- servidor (função enviar-email, origem "lote"). Idempotente: pode rodar de novo.
begin;

create or replace function public.listar_sugestoes_cartas_admin()
returns table (id_usuario uuid, dados jsonb, bloqueio text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_ids uuid[];
  v_fora uuid[] := '{}';
begin
  perform public.exigir_administrador();
  if to_regclass('public.contas_fora_publico') is not null then
    execute 'select coalesce(array_agg(id_usuario), ''{}'') from public.contas_fora_publico' into v_fora;
  end if;

  with epocas as (
    select p.usuario_id, max(p.versao) as epoca from public.progresso_usuario p
    where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
    group by p.usuario_id
  ),
  contagem as (
    select p.usuario_id, max(p.atualizado_em) as ultima
    from public.progresso_usuario p
    left join epocas e on e.usuario_id = p.usuario_id
    where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
      and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
    group by p.usuario_id
  )
  select array_agg(x.id) into v_ids from (
    select u.id
    from auth.users u
    left join contagem c on c.usuario_id = u.id
    where u.email is not null and u.email_confirmed_at is not null
      and not exists (select 1 from public.administradores a where a.id_usuario = u.id)
      and not (u.id = any(v_fora))
      and (c.ultima > now() - interval '90 days' or u.created_at > now() - interval '30 days')
      and not exists (select 1 from public.emails_enviados e where e.id_usuario = u.id
                      and e.tipo not in ('alerta_admin', 'relato_resolvido')
                      and e.status in ('enviado', 'enviando') and e.enviado_em > now() - interval '48 hours')
    order by coalesce(c.ultima, u.created_at) desc
    limit 300
  ) x;

  if v_ids is null then return; end if;

  return query
    select d.id_usuario, d.dados,
           case when not coalesce((d.dados->>'quer_cartas')::boolean, false) then 'nao_quer_cartas' end
    from public.dados_cartas_interno(v_ids) d;
end $$;
revoke all on function public.listar_sugestoes_cartas_admin() from public, anon, authenticated;
grant execute on function public.listar_sugestoes_cartas_admin() to authenticated;

commit;
