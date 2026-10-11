-- Resumo quinzenal por e-mail e renovação antecipada do Pix (11/10/2026, pedido do dono).
--
--   1. dados_relatorio_periodo(p_id, p_inicio, p_fim, p_ref): os números do
--      relatório para qualquer período [p_inicio, p_fim), comparados com o
--      período anterior de mesmo tamanho. Mesmo formato de dados_relatorio_mensal.
--   2. destinatarios_relatorio_quinzenal(p_ref, p_limite): quem estudou na
--      quinzena (ao menos 1 questão), com e-mail confirmado e sem ter desligado
--      os relatórios. Na 2ª quinzena (enviada no dia 1º), quem recebe o
--      relatório mensal de assinante fica de fora: um e-mail só no mesmo dia.
--      Referência: "2026-10-q1" (dias 1 a 15) e "2026-10-q2" (16 ao fim).
--   3. resumo_quinzenal_admin(p_ref): pendentes, enviados e falhas no painel.
--   4. confirmar_pagamento_pix: quem paga um Pix novo com um Pix ainda valendo
--      não perde dias. O período novo começa quando o atual termina
--      (ex.: faltam 3 dias e paga o mensal: 3 dias + 1 mês).
--
-- Aditiva: só cria e troca funções. Pode ser rodada de novo.
begin;

create or replace function public.dados_relatorio_periodo(p_id uuid, p_inicio date, p_fim date, p_ref text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_inicio timestamptz := (p_inicio::timestamp at time zone 'America/Sao_Paulo');
  v_fim timestamptz := (p_fim::timestamp at time zone 'America/Sao_Paulo');
  v_ant timestamptz := ((p_inicio - (p_fim - p_inicio))::timestamp at time zone 'America/Sao_Paulo');
  v jsonb;
begin
  with eventos as (
    select regexp_replace(r.id_questao, '-[0-9]+$', '') as tema,
           to_timestamp((ev->>'em')::double precision / 1000) as em,
           ev->>'correta' as correta
    from public.respostas_validas_interno() r, jsonb_array_elements(r.eventos) ev
    where r.usuario_id = p_id and ev ? 'em'
  ),
  periodo as (select * from eventos e where e.em >= v_inicio and e.em < v_fim),
  anterior as (select * from eventos e where e.em >= v_ant and e.em < v_inicio)
  select jsonb_build_object(
    'email', (select u.email from auth.users u where u.id = p_id),
    'nome', (select nullif(btrim(u.raw_user_meta_data->>'nome'), '') from auth.users u where u.id = p_id),
    'mes', p_ref,
    'respostas', (select count(*) from periodo),
    'certas', (select count(*) from periodo where correta = 'true'),
    'erradas', (select count(*) from periodo where correta = 'false'),
    'dias_ativos', (select count(distinct (em at time zone 'America/Sao_Paulo')::date) from periodo),
    'respostas_anterior', (select count(*) from anterior),
    'certas_anterior', (select count(*) from anterior where correta = 'true'),
    'erradas_anterior', (select count(*) from anterior where correta = 'false'),
    'total_acumulado', (select count(*) from public.respostas_validas_interno() r where r.usuario_id = p_id),
    'temas', coalesce((select jsonb_agg(jsonb_build_object('tema', t.tema, 'certas', t.certas, 'total', t.total, 'certas_ant', t.certas_ant, 'total_ant', t.total_ant))
                       from (select coalesce(m.tema, a.tema) as tema, coalesce(m.certas, 0) as certas, coalesce(m.total, 0) as total,
                                    coalesce(a.certas, 0) as certas_ant, coalesce(a.total, 0) as total_ant
                             from (select tema, count(*) filter (where correta = 'true') as certas, count(*) filter (where correta in ('true','false')) as total from periodo group by tema) m
                             full join (select tema, count(*) filter (where correta = 'true') as certas, count(*) filter (where correta in ('true','false')) as total from anterior group by tema) a
                               on a.tema = m.tema) t), '[]'::jsonb),
    'simulado', (select jsonb_build_object('titulo', se.titulo, 'acertos', sp.acertos, 'total', sp.total)
                 from public.simulado_participacoes sp join public.simulado_edicoes se on se.edicao = sp.edicao
                 where sp.usuario_id = p_id and sp.entregue_em >= v_inicio and sp.entregue_em < v_fim
                 order by sp.entregue_em desc limit 1)
  ) into v;
  return v;
end $$;
revoke all on function public.dados_relatorio_periodo(uuid, date, date, text) from public, anon, authenticated;
grant execute on function public.dados_relatorio_periodo(uuid, date, date, text) to service_role;

-- Datas de uma quinzena pela referência "AAAA-MM-q1" ou "AAAA-MM-q2".
create or replace function public.limites_quinzena_interno(p_ref text, out inicio date, out fim date)
language plpgsql immutable set search_path = '' as $$
declare v_mes date;
begin
  if p_ref !~ '^\d{4}-(0[1-9]|1[0-2])-q[12]$' then raise exception 'quinzena_invalida'; end if;
  v_mes := to_date(left(p_ref, 7) || '-01', 'YYYY-MM-DD');
  if right(p_ref, 1) = '1' then inicio := v_mes; fim := v_mes + 15;
  else inicio := v_mes + 15; fim := (v_mes + interval '1 month')::date; end if;
end $$;
revoke all on function public.limites_quinzena_interno(text) from public, anon, authenticated;

create or replace function public.candidatos_relatorio_quinzenal_interno(p_ref text)
returns table (id_usuario uuid)
language sql stable security definer set search_path = '' as $$
  with q as (select * from public.limites_quinzena_interno(p_ref)),
  ativos as (
    select distinct r.usuario_id
    from public.respostas_validas_interno() r, jsonb_array_elements(r.eventos) ev, q
    where ev ? 'em'
      and to_timestamp((ev->>'em')::double precision / 1000) >= (q.inicio::timestamp at time zone 'America/Sao_Paulo')
      and to_timestamp((ev->>'em')::double precision / 1000) < (q.fim::timestamp at time zone 'America/Sao_Paulo')
  )
  select u.id from auth.users u join ativos a on a.usuario_id = u.id
  where u.email is not null and u.email_confirmed_at is not null
    and coalesce((select pe.relatorio_mensal from public.preferencias_email pe where pe.id_usuario = u.id), true)
    and not (right(p_ref, 2) = 'q2' and public.motivo_premium_interno(u.id) in ('assinatura', 'cortesia', 'administrador'))
    and not exists (select 1 from public.emails_enviados e where e.tipo = 'relatorio' and e.id_usuario = u.id and e.referencia = p_ref and e.status in ('enviado', 'enviando'))
  order by u.created_at;
$$;
revoke all on function public.candidatos_relatorio_quinzenal_interno(text) from public, anon, authenticated;

create or replace function public.destinatarios_relatorio_quinzenal(p_ref text, p_limite integer default 40)
returns table (id_usuario uuid)
language sql stable security definer set search_path = '' as $$
  select c.id_usuario from public.candidatos_relatorio_quinzenal_interno(p_ref) c
  limit greatest(1, least(coalesce(p_limite, 40), 500));
$$;
revoke all on function public.destinatarios_relatorio_quinzenal(text, integer) from public, anon, authenticated;
grant execute on function public.destinatarios_relatorio_quinzenal(text, integer) to service_role;

create or replace function public.resumo_quinzenal_admin(p_ref text)
returns table (pendentes bigint, enviados bigint, falharam bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select
    (select count(*) from public.candidatos_relatorio_quinzenal_interno(p_ref)),
    (select count(*) from public.emails_enviados e where e.tipo = 'relatorio' and e.referencia = p_ref and e.status = 'enviado'),
    (select count(*) from public.emails_enviados e where e.tipo = 'relatorio' and e.referencia = p_ref and e.status = 'falhou');
end $$;
revoke all on function public.resumo_quinzenal_admin(text) from public, anon, authenticated;
grant execute on function public.resumo_quinzenal_admin(text) to authenticated;

-- Pix pago com outro Pix ainda valendo: o período novo começa no fim do atual.
create or replace function public.confirmar_pagamento_pix(p_pedido uuid, p_pagamento text, p_status text, p_aprovado_em timestamptz)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v public.pedidos_pix%rowtype;
  v_inicio timestamptz;
begin
  select * into v from public.pedidos_pix where id=p_pedido for update;
  if not found then raise exception 'pedido_pix_nao_encontrado'; end if;
  if p_pagamento !~ '^[0-9]+$' or (v.pagamento_id is not null and v.pagamento_id <> p_pagamento) then
    raise exception 'pagamento_pix_divergente';
  end if;
  if p_status not in ('pending','approved','cancelled','rejected','refunded','charged_back','expired') then return v.status; end if;
  if v.status in ('refunded','charged_back') and p_status not in ('refunded','charged_back') then return v.status; end if;
  if v.status='approved' and p_status in ('pending','cancelled','rejected','expired') then return v.status; end if;
  if p_status='approved' then
    if p_aprovado_em is null or not isfinite(p_aprovado_em) or p_aprovado_em > now()+interval '5 minutes' then
      raise exception 'data_aprovacao_pix_invalida';
    end if;
    -- Trava as assinaturas da pessoa: dois Pix aprovados juntos não começam no mesmo dia.
    perform 1 from public.assinaturas where id_usuario=v.id_usuario for update;
    select greatest(p_aprovado_em, coalesce(max(a.fim_periodo), p_aprovado_em)) into v_inicio
      from public.assinaturas a
      where a.id_usuario=v.id_usuario and a.id_externo like 'pix:%' and a.id_externo <> 'pix:'||v.id
        and a.status='ativa' and a.fim_periodo > p_aprovado_em;
    insert into public.assinaturas(id_usuario,id_externo,plano,status,inicio_periodo,fim_periodo,cancelar_ao_fim,ultima_cobranca_id,ultima_cobranca_em)
    values(v.id_usuario,'pix:'||v.id,v.plano,'ativa',v_inicio,v_inicio+make_interval(months=>v.meses),true,p_pagamento,p_aprovado_em)
    on conflict(id_externo) do nothing;
  elsif p_status in ('refunded','charged_back') then
    update public.assinaturas set status='reembolsada',fim_periodo=now(),cancelar_ao_fim=true,atualizada_em=now()
      where id_externo='pix:'||v.id;
  end if;
  update public.pedidos_pix set status=p_status,pagamento_id=p_pagamento,atualizada_em=now() where id=v.id;
  return p_status;
end $$;
revoke all on function public.confirmar_pagamento_pix(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.confirmar_pagamento_pix(uuid,text,text,timestamptz) to service_role;

commit;
