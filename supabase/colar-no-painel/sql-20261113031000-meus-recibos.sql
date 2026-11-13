-- Recibo eletrônico (13/11/2026, Condições da Assinatura, item 2.3): cada pessoa consulta os próprios pagamentos
-- aprovados, para emitir o recibo em Detalhes da assinatura. Só leitura e só da conta conectada (auth.uid()).
-- No Pix, cada pedido pago; no cartão, a última cobrança aprovada de cada assinatura (o banco guarda só a última),
-- com o valor aceito no checkout. Mesma regra de cobrancas_admin().
begin;

drop function if exists public.meus_recibos();
create function public.meus_recibos()
returns table (id_pagamento text, plano text, meio text, valor numeric, em timestamptz, situacao text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then raise exception 'sem_sessao' using errcode = '42501'; end if;
  return query
    select p.pagamento_id, p.plano, 'pix'::text, round(p.valor_centavos / 100.0, 2),
           coalesce(a.ultima_cobranca_em, a.inicio_periodo, p.atualizada_em),
           case when p.status in ('refunded', 'charged_back') then 'reembolsada' else 'paga' end
    from public.pedidos_pix p
    left join public.assinaturas a on a.id_externo = 'pix:' || p.id::text
    where p.id_usuario = v_usuario and p.status in ('approved', 'refunded', 'charged_back') and p.pagamento_id is not null
    union all
    select a.ultima_cobranca_id, a.plano, 'cartao'::text, round(ac.valor_centavos / 100.0, 2),
           a.ultima_cobranca_em,
           case when a.status = 'reembolsada' then 'reembolsada' else 'paga' end
    from public.assinaturas a
    left join lateral (
      select x.valor_centavos from public.aceites_assinatura x
      where x.id_usuario = a.id_usuario and x.plano = a.plano and x.meio_pagamento = 'cartao'
        and x.aceito_em <= a.criada_em + interval '1 day'
      order by x.aceito_em desc
      limit 1
    ) ac on true
    where a.id_usuario = v_usuario and coalesce(a.id_externo, '') not like 'pix:%'
      and a.ultima_cobranca_em is not null and a.ultima_cobranca_id is not null
    order by 5 desc;
end $$;
revoke all on function public.meus_recibos() from public, anon;
grant execute on function public.meus_recibos() to authenticated;

commit;
