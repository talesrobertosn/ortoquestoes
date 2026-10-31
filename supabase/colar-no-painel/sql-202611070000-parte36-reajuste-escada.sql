-- Parte 36 (reajuste dos planos): cole no SQL Editor do Supabase e execute ANTES de colar as funções.
-- Antes, confira o nome da restrição (o esperado é pedidos_pix_check):
--   select conname from pg_constraint where conrelid = 'public.pedidos_pix'::regclass and contype = 'c';
-- Mesmo conteúdo de supabase/migrations/202611070000_reajuste_escada.sql.
-- Reajuste do semestral e do anual (Tales, 31/10/2026): escada de R$ 5 por mês, 39,90 / 34,90 / 29,90.
-- Semestral R$ 209,40 e anual R$ 358,80 para quem ainda não assina. Quem já pagou antes do reajuste
-- mantém o preço antigo (R$ 179,90 e R$ 239,90) para sempre, no cartão e no Pix.
--
-- O corte é o momento em que este SQL roda: rode-o primeiro, e as funções logo depois, na mesma tarde.
-- Para mudar o corte depois: update public.reajuste_precos set corte = '2026-11-07 15:00-03';
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

-- Tem direito ao preço antigo quem tem uma assinatura (cartão ou Pix) criada antes do corte, com
-- pagamento aprovado e sem reembolso. criada_em não muda nas renovações do cartão, então quem
-- assinou antes continua no preço antigo mesmo renovando depois. Quem foi reembolsado volta como novo.
create or replace function public.tem_preco_antigo(p_usuario uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.assinaturas a cross join public.reajuste_precos r
    where a.id_usuario = p_usuario
      and a.criada_em < r.corte
      and a.ultima_cobranca_em is not null
      and a.status <> 'reembolsada')
$$;
revoke all on function public.tem_preco_antigo(uuid) from public, anon, authenticated;
grant execute on function public.tem_preco_antigo(uuid) to service_role;

-- Para a página de planos mostrar o preço de cada pessoa. Só responde sobre a própria conta.
create or replace function public.meu_preco_antigo()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null and public.tem_preco_antigo(auth.uid())
$$;
revoke all on function public.meu_preco_antigo() from public, anon;
grant execute on function public.meu_preco_antigo() to authenticated;

commit;
