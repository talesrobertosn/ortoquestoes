-- Metas comerciais, público-alvo e auditoria de pagamentos (Tales, 05/11/2026).
--
--   1. metas_comerciais: a camada EDITÁVEL das metas mensais ("vigente"). A versão fixa do cenário moderado
--      (moderado-2026-11) também é gravada aqui, só para registro, e nunca pode ser alterada pelo painel.
--      listar_metas_comerciais_admin, salvar_meta_comercial_admin (só meses futuros) e
--      remover_meta_comercial_admin (volta à original).
--   2. contas_fora_publico: contas fora do público-alvo (residentes e ortopedistas). Ficam registradas e
--      continuam na receita (pagamento real é real), mas saem dos números de aquisição, ativação, retenção e
--      conversão. marcar_fora_publico_admin (uma ou várias), desmarcar_fora_publico_admin e
--      listar_fora_publico_admin. Nada é apagado.
--   3. decisoes_eventos_pagamento: o histórico de decisões sobre cada aviso do Mercado Pago (resolvido com
--      conciliação confirmada, ou ignorado), com nota, quem e quando. registrar_decisao_evento_admin e
--      listar_decisoes_eventos_admin. A decisão não muda o aviso nem a assinatura.
--   4. auditoria_pagamentos_admin: inconsistências para conferir (Pix aprovado sem assinatura, assinatura
--      ativa sem cobrança, duas assinaturas de cartão renovando para a mesma pessoa, avisos com falha de
--      consulta ainda sem decisão). Só leitura.
--
-- Aditiva e idempotente: cria tabelas e funções se não existirem e pode ser rodada de novo. Não altera nem
-- apaga dados existentes. Não precisa de backup, mas rode primeiro em horário calmo.
begin;

-- ─────────────────────────────── 1. Metas ───────────────────────────────
create table if not exists public.metas_comerciais (
  versao text not null check (versao in ('moderado-2026-11', 'vigente')),
  mes date not null check (extract(day from mes) = 1),
  cadastros integer not null check (cadastros >= 0),
  novos_pagantes integer not null check (novos_pagantes >= 0),
  ativos_fim integer not null check (ativos_fim >= 0),
  receita_equivalente numeric(12,2) not null check (receita_equivalente >= 0),
  faturamento numeric(12,2) not null check (faturamento >= 0),
  editado_em timestamptz not null default now(),
  editado_por uuid references auth.users(id) on delete set null,
  primary key (versao, mes)
);
alter table public.metas_comerciais enable row level security;
revoke all on public.metas_comerciais from anon, authenticated;

-- A versão fixa, para registro (nunca editada pelo painel).
insert into public.metas_comerciais (versao, mes, cadastros, novos_pagantes, ativos_fim, receita_equivalente, faturamento) values
  ('moderado-2026-11', '2026-11-01', 102, 22, 58, 1882, 2899),
  ('moderado-2026-11', '2026-12-01',  96, 21, 65, 2107, 3082),
  ('moderado-2026-11', '2027-01-01',  90, 20, 71, 2314, 2999),
  ('moderado-2026-11', '2027-02-01',  85, 18, 77, 2497, 2911),
  ('moderado-2026-11', '2027-03-01',  80, 17, 82, 2651, 2969),
  ('moderado-2026-11', '2027-04-01',  75, 16, 85, 2746, 3011),
  ('moderado-2026-11', '2027-05-01',  70, 15, 88, 2840, 2841),
  ('moderado-2026-11', '2027-06-01',  66, 14, 90, 2912, 2779),
  ('moderado-2026-11', '2027-07-01',  62, 13, 93, 2970, 2650),
  ('moderado-2026-11', '2027-08-01',  58, 12, 94, 3018, 2521),
  ('moderado-2026-11', '2027-09-01',  55, 12, 95, 3046, 2932),
  ('moderado-2026-11', '2027-10-01',  52, 11, 91, 2952, 4809)
on conflict (versao, mes) do nothing;

create or replace function public.listar_metas_comerciais_admin()
returns table (versao text, mes date, cadastros integer, novos_pagantes integer, ativos_fim integer, receita_equivalente numeric, faturamento numeric, editado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select m.versao, m.mes, m.cadastros, m.novos_pagantes, m.ativos_fim, m.receita_equivalente, m.faturamento, m.editado_em
    from public.metas_comerciais m order by m.versao, m.mes;
end $$;
revoke all on function public.listar_metas_comerciais_admin() from public, anon, authenticated;
grant execute on function public.listar_metas_comerciais_admin() to authenticated;

create or replace function public.salvar_meta_comercial_admin(p_mes date, p_cadastros integer, p_novos_pagantes integer, p_ativos_fim integer, p_receita_equivalente numeric, p_faturamento numeric)
returns timestamptz language plpgsql volatile security definer set search_path = '' as $$
declare v_mes date := date_trunc('month', p_mes)::date;
begin
  perform public.exigir_administrador();
  -- Só meses que ainda não começaram (relógio de São Paulo): o passado e o mês corrente ficam como estão.
  if v_mes <= date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date then raise exception 'so_meses_futuros'; end if;
  if v_mes < '2026-11-01' or v_mes > '2027-10-01' then raise exception 'fora_do_periodo_das_metas'; end if;
  insert into public.metas_comerciais (versao, mes, cadastros, novos_pagantes, ativos_fim, receita_equivalente, faturamento, editado_em, editado_por)
  values ('vigente', v_mes, p_cadastros, p_novos_pagantes, p_ativos_fim, p_receita_equivalente, p_faturamento, now(), auth.uid())
  on conflict (versao, mes) do update set cadastros = excluded.cadastros, novos_pagantes = excluded.novos_pagantes, ativos_fim = excluded.ativos_fim,
    receita_equivalente = excluded.receita_equivalente, faturamento = excluded.faturamento, editado_em = excluded.editado_em, editado_por = excluded.editado_por;
  return now();
end $$;
revoke all on function public.salvar_meta_comercial_admin(date, integer, integer, integer, numeric, numeric) from public, anon, authenticated;
grant execute on function public.salvar_meta_comercial_admin(date, integer, integer, integer, numeric, numeric) to authenticated;

create or replace function public.remover_meta_comercial_admin(p_mes date)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  delete from public.metas_comerciais m where m.versao = 'vigente' and m.mes = date_trunc('month', p_mes)::date;
  return found;
end $$;
revoke all on function public.remover_meta_comercial_admin(date) from public, anon, authenticated;
grant execute on function public.remover_meta_comercial_admin(date) to authenticated;

-- ─────────────────────────────── 2. Fora do público-alvo ───────────────────────────────
create table if not exists public.contas_fora_publico (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  motivo text check (motivo is null or length(motivo) <= 200),
  marcado_em timestamptz not null default now(),
  marcado_por uuid references auth.users(id) on delete set null
);
alter table public.contas_fora_publico enable row level security;
revoke all on public.contas_fora_publico from anon, authenticated;

create or replace function public.listar_fora_publico_admin()
returns table (id_usuario uuid, motivo text, marcado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select c.id_usuario, c.motivo, c.marcado_em from public.contas_fora_publico c order by c.marcado_em desc;
end $$;
revoke all on function public.listar_fora_publico_admin() from public, anon, authenticated;
grant execute on function public.listar_fora_publico_admin() to authenticated;

-- Marca uma ou várias contas (a marcação em massa por instituição manda a lista de ids).
create or replace function public.marcar_fora_publico_admin(p_ids uuid[], p_motivo text)
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare v integer;
begin
  perform public.exigir_administrador();
  if coalesce(array_length(p_ids, 1), 0) = 0 then return 0; end if;
  if array_length(p_ids, 1) > 500 then raise exception 'lote_grande_demais'; end if;
  insert into public.contas_fora_publico (id_usuario, motivo, marcado_em, marcado_por)
  select u.id, nullif(btrim(p_motivo), ''), now(), auth.uid() from auth.users u where u.id = any(p_ids)
  on conflict (id_usuario) do update set motivo = excluded.motivo, marcado_em = excluded.marcado_em, marcado_por = excluded.marcado_por;
  get diagnostics v = row_count;
  return v;
end $$;
revoke all on function public.marcar_fora_publico_admin(uuid[], text) from public, anon, authenticated;
grant execute on function public.marcar_fora_publico_admin(uuid[], text) to authenticated;

create or replace function public.desmarcar_fora_publico_admin(p_ids uuid[])
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare v integer;
begin
  perform public.exigir_administrador();
  delete from public.contas_fora_publico c where c.id_usuario = any(p_ids);
  get diagnostics v = row_count;
  return v;
end $$;
revoke all on function public.desmarcar_fora_publico_admin(uuid[]) from public, anon, authenticated;
grant execute on function public.desmarcar_fora_publico_admin(uuid[]) to authenticated;

-- ─────────────────────────────── 3. Decisões sobre avisos do Mercado Pago ───────────────────────────────
create table if not exists public.decisoes_eventos_pagamento (
  id bigserial primary key,
  id_evento bigint not null references public.eventos_pagamento(id) on delete cascade,
  decisao text not null check (decisao in ('conciliado', 'ignorado', 'reaberto')),
  nota text check (nota is null or length(nota) <= 1000),
  referencia_pagamento text check (referencia_pagamento is null or length(referencia_pagamento) <= 80),
  decidido_em timestamptz not null default now(),
  decidido_por uuid references auth.users(id) on delete set null
);
create index if not exists decisoes_eventos_pagamento_evento_idx on public.decisoes_eventos_pagamento (id_evento, decidido_em desc);
alter table public.decisoes_eventos_pagamento enable row level security;
revoke all on public.decisoes_eventos_pagamento from anon, authenticated;

create or replace function public.registrar_decisao_evento_admin(p_evento bigint, p_decisao text, p_nota text, p_referencia text)
returns timestamptz language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  if p_decisao not in ('conciliado', 'ignorado', 'reaberto') then raise exception 'decisao_invalida'; end if;
  if not exists (select 1 from public.eventos_pagamento e where e.id = p_evento) then raise exception 'evento_inexistente'; end if;
  insert into public.decisoes_eventos_pagamento (id_evento, decisao, nota, referencia_pagamento, decidido_por)
  values (p_evento, p_decisao, nullif(btrim(p_nota), ''), nullif(btrim(p_referencia), ''), auth.uid());
  return now();
end $$;
revoke all on function public.registrar_decisao_evento_admin(bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.registrar_decisao_evento_admin(bigint, text, text, text) to authenticated;

create or replace function public.listar_decisoes_eventos_admin()
returns table (id bigint, id_evento bigint, decisao text, nota text, referencia_pagamento text, decidido_em timestamptz, quem text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query select d.id, d.id_evento, d.decisao, d.nota, d.referencia_pagamento, d.decidido_em, u.email::text
    from public.decisoes_eventos_pagamento d left join auth.users u on u.id = d.decidido_por
    order by d.decidido_em desc limit 2000;
end $$;
revoke all on function public.listar_decisoes_eventos_admin() from public, anon, authenticated;
grant execute on function public.listar_decisoes_eventos_admin() to authenticated;

-- ─────────────────────────────── 4. Auditoria de pagamentos (só leitura) ───────────────────────────────
create or replace function public.auditoria_pagamentos_admin()
returns table (tipo text, id_usuario uuid, email text, detalhe text, referencia text, em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    -- Pix aprovado sem a assinatura correspondente: pagou e não ganhou acesso.
    select 'pix_aprovado_sem_acesso'::text, p.id_usuario, u.email::text,
           format('Pix %s aprovado, %s, sem assinatura pix:%s', p.plano, to_char(p.valor_centavos / 100.0, 'FM9999990D00'), p.id), p.pagamento_id, p.atualizada_em
    from public.pedidos_pix p join auth.users u on u.id = p.id_usuario
    where p.status = 'approved' and not exists (select 1 from public.assinaturas a where a.id_externo = 'pix:' || p.id)
    union all
    -- Duas ou mais assinaturas de cartão renovando sozinhas para a mesma pessoa: risco de cobrança dupla.
    select 'cartao_renovando_duas_vezes', a.id_usuario, u.email::text, format('%s assinaturas de cartão ativas renovando', count(*)), string_agg(a.id_externo, ', '), max(a.atualizada_em)
    from public.assinaturas a join auth.users u on u.id = a.id_usuario
    where a.status = 'ativa' and not a.cancelar_ao_fim and coalesce(a.id_externo, '') not like 'pix:%' and coalesce(a.fim_periodo, 'infinity') > now()
    group by a.id_usuario, u.email having count(*) > 1
    union all
    -- Assinatura ativa sem nenhuma cobrança gravada.
    select 'ativa_sem_cobranca', a.id_usuario, u.email::text, format('%s %s ativa sem cobrança gravada', a.plano, coalesce(a.id_externo, '')), a.id_externo, a.atualizada_em
    from public.assinaturas a join auth.users u on u.id = a.id_usuario
    where a.status = 'ativa' and a.ultima_cobranca_em is null and coalesce(a.fim_periodo, 'infinity') > now()
    union all
    -- Avisos com falha de consulta ao Mercado Pago ainda sem decisão (ou reabertos).
    select 'consulta_falhou_sem_decisao', null::uuid, null::text, format('Aviso %s (%s) com erro %s', e.id, coalesce(e.tipo, '—'), coalesce(e.erro, '—')), e.id_recurso, e.recebido_em
    from public.eventos_pagamento e
    where e.status_processamento = 'erro' and coalesce(e.erro, '') like '%consulta_mercado_pago_falhou%'
      and coalesce((select d.decisao from public.decisoes_eventos_pagamento d where d.id_evento = e.id order by d.decidido_em desc limit 1), 'reaberto') = 'reaberto';
end $$;
revoke all on function public.auditoria_pagamentos_admin() from public, anon, authenticated;
grant execute on function public.auditoria_pagamentos_admin() to authenticated;

commit;
