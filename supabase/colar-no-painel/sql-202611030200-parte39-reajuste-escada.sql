-- Parte 39 (reajuste dos planos): cole no SQL Editor do Supabase e execute ANTES de colar as funções.
-- Antes, confira o nome da restrição (o esperado é pedidos_pix_check):
--   select conname from pg_constraint where conrelid = 'public.pedidos_pix'::regclass and contype = 'c';
-- Mesmo conteúdo de supabase/migrations/202611030200_reajuste_escada.sql.
-- Reajuste do semestral e do anual (Tales, 31/10/2026): escada de R$ 5 por mês, 39,90 / 34,90 / 29,90.
-- Semestral R$ 209,40 e anual R$ 358,80 para quem ainda não assina. Quem já pagava antes do reajuste
-- mantém o preço antigo DO PLANO QUE PAGAVA (Tales, 03/11/2026): semestral R$ 179,90, anual R$ 239,90.
-- Vale enquanto a pessoa continuar assinando esse plano, no cartão ou no Pix. Se o plano acabar, ela
-- tem 30 dias para renovar pelo mesmo valor; depois disso passa ao preço novo. O mensal não mudou.
--
-- O corte é o momento em que este SQL roda: rode-o primeiro, e as funções logo depois, na mesma tarde.
-- Para mudar o corte depois: update public.reajuste_precos set corte = '2026-11-03 15:00-03';
begin;

create table if not exists public.reajuste_precos (
  id boolean primary key default true check (id),
  corte timestamptz not null
);
insert into public.reajuste_precos (corte) values (now()) on conflict (id) do nothing;
alter table public.reajuste_precos enable row level security;
revoke all on public.reajuste_precos from anon, authenticated;
grant all on public.reajuste_precos to service_role;

-- O Pix aceita o preço novo e o antigo de cada plano.
alter table public.pedidos_pix drop constraint if exists pedidos_pix_check;
alter table public.pedidos_pix add constraint pedidos_pix_check check (
  (plano = 'mensal' and meses = 1 and valor_centavos = 3990)
  or (plano = 'semestral' and meses = 6 and valor_centavos in (17990, 20940))
  or (plano = 'anual' and meses = 12 and valor_centavos in (23990, 35880)));

-- Até quando a pessoa pode pagar o preço antigo de um plano: 30 dias depois do fim do último período
-- desse plano que foi pago pelo preço antigo. Conta como "preço antigo" o período de uma assinatura
-- criada antes do corte (o cartão guarda a mesma assinatura nas renovações) ou, depois do corte, um Pix
-- ou um cartão contratado pelo valor antigo. Só contam pagamentos aprovados e não reembolsados.
-- Quem passou dos 30 dias e voltou pelo preço novo não recupera o antigo: os períodos novos não contam.
create or replace function public.preco_antigo_ate(p_usuario uuid, p_plano text)
returns timestamptz language sql stable security definer set search_path = public, pg_temp as $$
  select max(a.fim_periodo) + interval '30 days'
  from public.assinaturas a cross join public.reajuste_precos r
  where a.id_usuario = p_usuario
    and a.plano = p_plano
    and a.ultima_cobranca_em is not null
    and a.status <> 'reembolsada'
    and a.fim_periodo is not null
    and (a.criada_em < r.corte
      or (coalesce(a.id_externo, '') like 'pix:%' and exists (
        select 1 from public.pedidos_pix p
        where a.id_externo = 'pix:' || p.id::text and p.valor_centavos in (17990, 23990)))
      or (coalesce(a.id_externo, '') not like 'pix:%' and (
        select x.valor_centavos from public.aceites_assinatura x
        where x.id_usuario = a.id_usuario and x.plano = a.plano and x.meio_pagamento = 'cartao'
          and x.aceito_em <= a.criada_em + interval '1 day'
        order by x.aceito_em desc limit 1) in (17990, 23990)))
$$;
revoke all on function public.preco_antigo_ate(uuid, text) from public, anon, authenticated;
grant execute on function public.preco_antigo_ate(uuid, text) to service_role;

-- O que as funções de cobrança perguntam: esta pessoa paga o preço antigo deste plano agora?
create or replace function public.tem_preco_antigo(p_usuario uuid, p_plano text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.preco_antigo_ate(p_usuario, p_plano) > now(), false)
$$;
revoke all on function public.tem_preco_antigo(uuid, text) from public, anon, authenticated;
grant execute on function public.tem_preco_antigo(uuid, text) to service_role;

-- Para a página de planos: em quais planos a pessoa tem o preço antigo, o fim do plano atual e até
-- quando pode renovar por esse valor. Lista vazia para quem não tem. Só responde sobre a própria conta.
create or replace function public.meus_precos_antigos()
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('plano', p.plano, 'ate', p.ate) order by p.plano), '[]'::jsonb)
  from (
    select v.plano, public.preco_antigo_ate(auth.uid(), v.plano) as ate
    from (values ('semestral'), ('anual')) as v(plano)
    where auth.uid() is not null
  ) p
  where p.ate > now()
$$;
revoke all on function public.meus_precos_antigos() from public, anon;
grant execute on function public.meus_precos_antigos() to authenticated;

commit;
