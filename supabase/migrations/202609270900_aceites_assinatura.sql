begin;

-- Registro da oferta e da versão aceita antes de cada checkout. O usuário
-- autenticado não recebe acesso direto à tabela; somente a Edge Function,
-- após validar a sessão, escreve por meio da service role.
create table if not exists public.aceites_assinatura (
  id uuid primary key default gen_random_uuid(),
  id_usuario uuid not null references auth.users(id) on delete cascade,
  versao text not null,
  plano text not null check (plano in ('mensal', 'semestral', 'anual')),
  valor_centavos integer not null check (valor_centavos > 0),
  periodicidade_meses integer not null check (periodicidade_meses in (1, 6, 12)),
  aceito_em timestamptz not null default now()
);

create index if not exists aceites_assinatura_usuario_data_idx
  on public.aceites_assinatura (id_usuario, aceito_em desc);

alter table public.aceites_assinatura enable row level security;
revoke all on public.aceites_assinatura from anon, authenticated;

commit;
