begin;

alter table public.aceites_assinatura add column if not exists meio_pagamento text not null default 'cartao'
  check (meio_pagamento in ('cartao', 'pix'));

create table public.pedidos_pix (
  id uuid primary key default gen_random_uuid(),
  id_usuario uuid not null references auth.users(id) on delete cascade,
  plano text not null check (plano in ('mensal', 'semestral', 'anual')),
  valor_centavos integer not null,
  meses integer not null,
  pagamento_id text unique,
  status text not null default 'criando' check (status in ('criando','pending','approved','cancelled','rejected','refunded','charged_back','expired')),
  expira_em timestamptz not null default now() + interval '24 hours',
  criada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  check ((plano='mensal' and meses=1 and valor_centavos=3990)
    or (plano='semestral' and meses=6 and valor_centavos=17990)
    or (plano='anual' and meses=12 and valor_centavos=23990))
);
create unique index pedidos_pix_abertos_usuario on public.pedidos_pix(id_usuario) where status in ('criando','pending');
alter table public.pedidos_pix enable row level security;
revoke all on public.pedidos_pix from anon, authenticated;
grant all on public.pedidos_pix to service_role;

-- Só a função privada, após consultar o provedor, pode confirmar pagamento.
-- Bloqueio da linha e id_externo único impedem crédito duplicado por replay.
create function public.confirmar_pagamento_pix(p_pedido uuid, p_pagamento text, p_status text, p_aprovado_em timestamptz)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.pedidos_pix%rowtype;
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
    insert into public.assinaturas(id_usuario,id_externo,plano,status,inicio_periodo,fim_periodo,cancelar_ao_fim,ultima_cobranca_id,ultima_cobranca_em)
    values(v.id_usuario,'pix:'||v.id,v.plano,'ativa',p_aprovado_em,p_aprovado_em+make_interval(months=>v.meses),true,p_pagamento,p_aprovado_em)
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
