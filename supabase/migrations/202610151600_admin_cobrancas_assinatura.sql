-- Painel do administrador (auditoria de 15/10/2026, T6.8 e T6.9). Só leitura: nenhuma
-- função abaixo altera assinatura, pedido, evento ou dado de usuário.
-- 1. cobrancas_admin(): as cobranças que o banco gravou. No Pix, cada pedido pago,
--    com o valor que o Mercado Pago confirmou e a data da aprovação. No cartão, a
--    última cobrança aprovada de cada assinatura (o banco só guarda a última), com o
--    valor contratado no checkout (aceites_assinatura). Reembolsos vêm marcados.
-- 2. assinatura_usuario_admin(p_usuario): para a aba "Assinatura e pagamentos" da
--    ficha: assinaturas, pedidos Pix e os avisos do Mercado Pago ligados à pessoa.
-- 3. listar_eventos_pagamento_admin() passa a dizer de quem é cada aviso (quando dá
--    para ligar: assinatura, último pagamento do cartão ou pedido Pix). O retorno
--    ganhou colunas no fim, por isso o drop antes do create.
-- Índice novo em eventos_pagamento(id_recurso) para essas ligações. Não altera dados.
begin;

create index if not exists eventos_pagamento_recurso_idx on public.eventos_pagamento (id_recurso);

drop function if exists public.cobrancas_admin();
create function public.cobrancas_admin()
returns table (
  id_usuario uuid, usuario text, nome text, plano text, meio text,
  valor numeric, em timestamptz, id_pagamento text, situacao text, id_assinatura uuid
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select p.id_usuario, u.email::text,
           nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), ''),
           p.plano, 'pix'::text, round(p.valor_centavos / 100.0, 2),
           coalesce(a.ultima_cobranca_em, a.inicio_periodo, p.atualizada_em),
           p.pagamento_id,
           case when p.status in ('refunded', 'charged_back') then 'reembolsada' else 'paga' end,
           a.id
    from public.pedidos_pix p
    join auth.users u on u.id = p.id_usuario
    left join public.assinaturas a on a.id_externo = 'pix:' || p.id::text
    where p.status in ('approved', 'refunded', 'charged_back')
    union all
    select a.id_usuario, u.email::text,
           nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), ''),
           a.plano, 'cartao'::text, round(ac.valor_centavos / 100.0, 2),
           a.ultima_cobranca_em, a.ultima_cobranca_id,
           case when a.status = 'reembolsada' then 'reembolsada' else 'paga' end,
           a.id
    from public.assinaturas a
    join auth.users u on u.id = a.id_usuario
    left join lateral (
      select x.valor_centavos from public.aceites_assinatura x
      where x.id_usuario = a.id_usuario and x.plano = a.plano and x.meio_pagamento = 'cartao'
        and x.aceito_em <= a.criada_em + interval '1 day'
      order by x.aceito_em desc
      limit 1
    ) ac on true
    where coalesce(a.id_externo, '') not like 'pix:%' and a.ultima_cobranca_em is not null
    order by 7 desc;
end $$;
revoke all on function public.cobrancas_admin() from public, anon, authenticated;
grant execute on function public.cobrancas_admin() to authenticated;

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
        where q.id_recurso in (select r.id from recursos r)
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
           dono.id_usuario, u.email::text,
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
    ) dono on e.id_recurso is not null
    left join auth.users u on u.id = dono.id_usuario
    order by e.recebido_em desc
    limit 200;
end $$;
revoke all on function public.listar_eventos_pagamento_admin() from public, anon, authenticated;
grant execute on function public.listar_eventos_pagamento_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
