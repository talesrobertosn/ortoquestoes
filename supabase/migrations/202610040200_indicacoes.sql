-- Programa de indicação: cada conta tem um código de convite. Quem cria a conta
-- pelo link e responde 20 questões confirma a indicação, e os dois ganham 7 dias
-- do plano completo (cortesia). Quem indica ganha por até 12 amigos confirmados.
-- Os dias entram depois da assinatura paga que estiver ativa, para não se
-- perderem. Aditiva: não altera dados existentes. Pode ser rodada de novo.
begin;

create table if not exists public.indicacoes_codigos (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  codigo text not null unique check (codigo ~ '^[A-Z2-9]{6}$'),
  criado_em timestamptz not null default now()
);
alter table public.indicacoes_codigos enable row level security;
revoke all on public.indicacoes_codigos from public, anon, authenticated;

create table if not exists public.indicacoes (
  id_convidado uuid primary key references auth.users(id) on delete cascade,
  id_padrinho uuid not null references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  confirmada_em timestamptz,
  dias_padrinho integer not null default 0,
  dias_convidado integer not null default 0,
  check (id_convidado <> id_padrinho)
);
create index if not exists indicacoes_padrinho on public.indicacoes (id_padrinho, confirmada_em);
alter table public.indicacoes enable row level security;
revoke all on public.indicacoes from public, anon, authenticated;

-- Soma dias de cortesia. Cortesia sem prazo (dada no painel) fica como está.
-- Os dias contam a partir do maior entre agora, a cortesia atual e o fim da
-- assinatura paga ativa.
create or replace function public.somar_dias_cortesia_interno(p_usuario uuid, p_dias integer, p_motivo text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare v_base timestamptz;
begin
  if p_dias <= 0 then return; end if;
  if exists (select 1 from public.acessos_cortesia c where c.id_usuario = p_usuario and c.ate is null) then return; end if;
  select greatest(
    now(),
    coalesce((select c.ate from public.acessos_cortesia c where c.id_usuario = p_usuario), now()),
    coalesce((select max(a.fim_periodo) from public.assinaturas a where a.id_usuario = p_usuario
              and (a.status = 'ativa' or (a.status = 'cancelada' and a.cancelar_ao_fim)) and a.fim_periodo > now()), now())
  ) into v_base;
  insert into public.acessos_cortesia (id_usuario, ate, motivo) values (p_usuario, v_base + make_interval(days => p_dias), p_motivo)
  on conflict (id_usuario) do update set ate = excluded.ate, motivo = excluded.motivo;
end $$;
revoke all on function public.somar_dias_cortesia_interno(uuid, integer, text) from public, anon, authenticated;

create or replace function public.respondidas_interno(p_usuario uuid)
returns bigint language sql stable security definer set search_path = '' as $$
  select count(*) from public.progresso_usuario p
  where p.usuario_id = p_usuario and p.tipo = 'respondidas' and p.valor <> 'null'::jsonb;
$$;
revoke all on function public.respondidas_interno(uuid) from public, anon, authenticated;

-- Confirma a indicação de um convidado que já respondeu 20 questões e paga os dias.
create or replace function public.confirmar_indicacao_interno(p_convidado uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare v_padrinho uuid; v_ja integer;
begin
  select i.id_padrinho into v_padrinho from public.indicacoes i
  where i.id_convidado = p_convidado and i.confirmada_em is null for update;
  if v_padrinho is null then return false; end if;
  if public.respondidas_interno(p_convidado) < 20 then return false; end if;
  select count(*) into v_ja from public.indicacoes i where i.id_padrinho = v_padrinho and i.confirmada_em is not null;
  update public.indicacoes set confirmada_em = now(), dias_convidado = 7, dias_padrinho = case when v_ja < 12 then 7 else 0 end
  where id_convidado = p_convidado;
  perform public.somar_dias_cortesia_interno(p_convidado, 7, 'Indicação: amigo convidado');
  if v_ja < 12 then perform public.somar_dias_cortesia_interno(v_padrinho, 7, 'Indicação: convidou um amigo'); end if;
  return true;
end $$;
revoke all on function public.confirmar_indicacao_interno(uuid) from public, anon, authenticated;

-- Meu código (criado na primeira vez) e o resumo das minhas indicações.
create or replace function public.minha_indicacao()
returns table (codigo text, convidados bigint, confirmados bigint, dias_ganhos bigint, limite integer, cortesia_ate timestamptz, fui_convidado boolean, minha_confirmada boolean)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare v_usuario uuid := auth.uid(); v_codigo text; v_alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; v_pendente uuid;
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select c.codigo into v_codigo from public.indicacoes_codigos c where c.id_usuario = v_usuario;
  if v_codigo is null then
    loop
      select string_agg(substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1), '') into v_codigo from generate_series(1, 6);
      exit when not exists (select 1 from public.indicacoes_codigos c where c.codigo = v_codigo);
    end loop;
    insert into public.indicacoes_codigos (id_usuario, codigo) values (v_usuario, v_codigo)
    on conflict (id_usuario) do nothing;
    select c.codigo into v_codigo from public.indicacoes_codigos c where c.id_usuario = v_usuario;
  end if;
  -- Aproveita a visita para confirmar quem já chegou às 20 questões.
  for v_pendente in select i.id_convidado from public.indicacoes i where i.id_padrinho = v_usuario and i.confirmada_em is null loop
    perform public.confirmar_indicacao_interno(v_pendente);
  end loop;
  perform public.confirmar_indicacao_interno(v_usuario);
  return query select v_codigo,
    (select count(*) from public.indicacoes i where i.id_padrinho = v_usuario),
    (select count(*) from public.indicacoes i where i.id_padrinho = v_usuario and i.confirmada_em is not null),
    (select coalesce(sum(i.dias_padrinho), 0) from public.indicacoes i where i.id_padrinho = v_usuario)
      + (select coalesce(sum(i.dias_convidado), 0) from public.indicacoes i where i.id_convidado = v_usuario),
    12,
    (select c.ate from public.acessos_cortesia c where c.id_usuario = v_usuario),
    exists (select 1 from public.indicacoes i where i.id_convidado = v_usuario),
    exists (select 1 from public.indicacoes i where i.id_convidado = v_usuario and i.confirmada_em is not null);
end $$;
revoke all on function public.minha_indicacao() from public, anon, authenticated;
grant execute on function public.minha_indicacao() to authenticated;

-- Usa um código de convite. Só para contas novas (até 7 dias) que ainda não
-- responderam 20 questões e não foram convidadas antes.
create or replace function public.usar_convite(p_codigo text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare v_usuario uuid := auth.uid(); v_padrinho uuid; v_criada timestamptz;
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select c.id_usuario into v_padrinho from public.indicacoes_codigos c where c.codigo = upper(btrim(coalesce(p_codigo, '')));
  if v_padrinho is null then return 'codigo_invalido'; end if;
  if v_padrinho = v_usuario then return 'proprio_codigo'; end if;
  if exists (select 1 from public.indicacoes i where i.id_convidado = v_usuario) then return 'ja_convidado'; end if;
  select u.created_at into v_criada from auth.users u where u.id = v_usuario;
  if v_criada < now() - interval '7 days' or public.respondidas_interno(v_usuario) >= 20 then return 'conta_antiga'; end if;
  insert into public.indicacoes (id_convidado, id_padrinho) values (v_usuario, v_padrinho) on conflict do nothing;
  return 'ok';
end $$;
revoke all on function public.usar_convite(text) from public, anon, authenticated;
grant execute on function public.usar_convite(text) to authenticated;

-- Quem convidou, para a página do convite: só o primeiro nome.
create or replace function public.previa_convite(p_codigo text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(split_part(btrim(u.raw_user_meta_data->>'nome'), ' ', 1), ''), 'Um colega')
  from public.indicacoes_codigos c join auth.users u on u.id = c.id_usuario
  where c.codigo = upper(btrim(coalesce(p_codigo, '')));
$$;
revoke all on function public.previa_convite(text) from public, anon, authenticated;
grant execute on function public.previa_convite(text) to anon, authenticated;

-- Painel: números do programa.
create or replace function public.resumo_indicacoes_admin()
returns table (codigos bigint, convidados bigint, confirmados bigint, confirmados_7d bigint, dias_dados bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.exigir_administrador();
  return query select
    (select count(*) from public.indicacoes_codigos),
    (select count(*) from public.indicacoes),
    (select count(*) from public.indicacoes i where i.confirmada_em is not null),
    (select count(*) from public.indicacoes i where i.confirmada_em >= now() - interval '7 days'),
    (select coalesce(sum(i.dias_padrinho + i.dias_convidado), 0) from public.indicacoes i);
end $$;
revoke all on function public.resumo_indicacoes_admin() from public, anon, authenticated;
grant execute on function public.resumo_indicacoes_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
