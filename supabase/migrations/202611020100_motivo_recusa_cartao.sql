-- Motivo da recusa do cartão e avisos ligados à pessoa (painel, 02/11/2026).
--   1. assinaturas.motivo_falha / falha_em: o webhook grava o status_detail do Mercado Pago quando a
--      cobrança é recusada (cc_rejected_insufficient_amount, cc_rejected_call_for_authorize…) e limpa
--      quando uma cobrança é aprovada. O painel traduz para português.
--   2. eventos_pagamento.id_usuario: o webhook anota de quem é o aviso quando descobre (as cobranças
--      mensais do cartão chegam com o número do pagamento, que não é o da assinatura).
--   3. listar_assinaturas_admin, assinatura_usuario_admin e listar_eventos_pagamento_admin passam a
--      devolver esses campos.
-- Aditiva: só cria colunas e troca funções de leitura do painel. Pode ser rodada de novo.
-- O webhook funciona com ou sem esta parte (a anotação é à parte e ignora coluna ausente).
begin;

alter table public.assinaturas add column if not exists motivo_falha text;
alter table public.assinaturas add column if not exists falha_em timestamptz;
alter table public.eventos_pagamento add column if not exists id_usuario uuid;
create index if not exists eventos_pagamento_usuario_idx on public.eventos_pagamento (id_usuario);

drop function if exists public.listar_assinaturas_admin();
create function public.listar_assinaturas_admin()
returns table (
  id_usuario uuid, usuario text, plano text, status text,
  proxima_cobranca timestamptz, ultima_atualizacao timestamptz,
  nome text, criada_em timestamptz, inicio_periodo timestamptz, fim_periodo timestamptz,
  ultima_cobranca_em timestamptz, cancelar_ao_fim boolean, cancelada_em timestamptz,
  meio text, motivo_falha text, falha_em timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select a.id_usuario, u.email::text, a.plano, a.status,
           case when a.status = 'ativa' and not a.cancelar_ao_fim then a.fim_periodo else null end,
           a.atualizada_em,
           nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), ''),
           a.criada_em, a.inicio_periodo, a.fim_periodo, a.ultima_cobranca_em, a.cancelar_ao_fim, a.cancelada_em,
           case when a.id_externo like 'pix:%' then 'pix' else 'cartao' end,
           a.motivo_falha, a.falha_em
    from public.assinaturas a
    join auth.users u on u.id = a.id_usuario
    order by a.criada_em desc;
end $$;
revoke all on function public.listar_assinaturas_admin() from public, anon, authenticated;
grant execute on function public.listar_assinaturas_admin() to authenticated;

drop function if exists public.assinatura_usuario_admin(uuid);
create function public.assinatura_usuario_admin(p_usuario uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform public.exigir_administrador();
  if p_usuario is null then raise exception 'usuario_invalido' using errcode = '22023'; end if;
  with recursos as (
    select a.id_externo as id from public.assinaturas a where a.id_usuario = p_usuario and a.id_externo is not null
    union
    select a.ultima_cobranca_id from public.assinaturas a where a.id_usuario = p_usuario and a.ultima_cobranca_id is not null
    union
    select p.pagamento_id from public.pedidos_pix p where p.id_usuario = p_usuario and p.pagamento_id is not null
  )
  select jsonb_build_object(
    'assinaturas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'plano', a.plano, 'status', a.status,
        'meio', case when a.id_externo like 'pix:%' then 'pix' else 'cartao' end,
        'id_externo', a.id_externo,
        'inicio_periodo', a.inicio_periodo, 'fim_periodo', a.fim_periodo,
        'cancelar_ao_fim', a.cancelar_ao_fim, 'cancelada_em', a.cancelada_em,
        'ultima_cobranca_id', a.ultima_cobranca_id, 'ultima_cobranca_em', a.ultima_cobranca_em,
        'criada_em', a.criada_em, 'atualizada_em', a.atualizada_em,
        'motivo_falha', a.motivo_falha, 'falha_em', a.falha_em,
        'valor', case when a.id_externo like 'pix:%' then (
            select round(p.valor_centavos / 100.0, 2) from public.pedidos_pix p where a.id_externo = 'pix:' || p.id::text
          ) else (
            select round(x.valor_centavos / 100.0, 2) from public.aceites_assinatura x
            where x.id_usuario = a.id_usuario and x.plano = a.plano and x.meio_pagamento = 'cartao'
              and x.aceito_em <= a.criada_em + interval '1 day'
            order by x.aceito_em desc limit 1
          ) end
      ) order by a.criada_em desc)
      from public.assinaturas a where a.id_usuario = p_usuario
    ), '[]'::jsonb),
    'pix', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'plano', p.plano, 'valor', round(p.valor_centavos / 100.0, 2), 'status', p.status,
        'pagamento_id', p.pagamento_id, 'expira_em', p.expira_em, 'criada_em', p.criada_em, 'atualizada_em', p.atualizada_em
      ) order by p.criada_em desc)
      from (
        select q.id, q.plano, q.valor_centavos, q.status, q.pagamento_id, q.expira_em, q.criada_em, q.atualizada_em
        from public.pedidos_pix q where q.id_usuario = p_usuario order by q.criada_em desc limit 50
      ) p
    ), '[]'::jsonb),
    'eventos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'id_evento', e.id_evento, 'tipo', e.tipo, 'id_recurso', e.id_recurso,
        'status_processamento', e.status_processamento,
        'erro', case when e.erro is null then null
                     when regexp_replace(e.erro, '^Error: ', '') ~ '^[a-z0-9_:-]{1,80}$'
                       then regexp_replace(e.erro, '^Error: ', '')
                     else 'erro_interno' end,
        'recebido_em', e.recebido_em, 'processado_em', e.processado_em
      ) order by e.recebido_em desc)
      from (
        select q.id, q.id_evento, q.tipo, q.id_recurso, q.status_processamento, q.erro, q.recebido_em, q.processado_em
        from public.eventos_pagamento q
        where q.id_recurso in (select r.id from recursos r) or q.id_usuario = p_usuario
        order by q.recebido_em desc limit 100
      ) e
    ), '[]'::jsonb),
    'conta_teste', exists (select 1 from public.contas_teste t where t.id_usuario = p_usuario and t.ativa)
  ) into v;
  return v;
end $$;
revoke all on function public.assinatura_usuario_admin(uuid) from public, anon, authenticated;
grant execute on function public.assinatura_usuario_admin(uuid) to authenticated;

drop function if exists public.listar_eventos_pagamento_admin();
create function public.listar_eventos_pagamento_admin()
returns table (
  id bigint, id_evento text, tipo text, id_recurso text,
  status_processamento text, erro text, recebido_em timestamptz, processado_em timestamptz,
  id_usuario uuid, usuario text, nome text
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select e.id, e.id_evento, e.tipo, e.id_recurso, e.status_processamento,
           case when e.erro is null then null
                when regexp_replace(e.erro, '^Error: ', '') ~ '^[a-z0-9_:-]{1,80}$'
                  then regexp_replace(e.erro, '^Error: ', '')
                else 'erro_interno' end,
           e.recebido_em, e.processado_em,
           coalesce(e.id_usuario, dono.id_usuario), u.email::text,
           nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), '')
    from public.eventos_pagamento e
    left join lateral (
      select x.id_usuario from (
        select a.id_usuario, 1 as ordem from public.assinaturas a where a.id_externo = e.id_recurso
        union all
        select p.id_usuario, 2 from public.pedidos_pix p where p.pagamento_id = e.id_recurso
        union all
        select a.id_usuario, 3 from public.assinaturas a where a.ultima_cobranca_id = e.id_recurso
      ) x
      order by x.ordem
      limit 1
    ) dono on e.id_recurso is not null and e.id_usuario is null
    left join auth.users u on u.id = coalesce(e.id_usuario, dono.id_usuario)
    order by e.recebido_em desc
    limit 200;
end $$;
revoke all on function public.listar_eventos_pagamento_admin() from public, anon, authenticated;
grant execute on function public.listar_eventos_pagamento_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
