-- Limite grátis em janela de 24 horas (11/10/2026, pedido do dono).
--
-- Antes: 20 questões por dia, zerando à meia-noite de São Paulo.
-- Agora: como o limite de uso do Claude, a janela começa na primeira questão
-- contabilizada e as 20 questões voltam 24 horas depois desse início. Quem
-- responde a primeira às 22h não perde a cota à meia-noite; quem esgota às 9h
-- volta às 9h do dia seguinte (se a primeira tiver sido às 9h).
--
--   1. janela_gratis: uma linha por pessoa com o início da janela atual e
--      quantas questões ela já gastou nessa janela.
--   2. autorizar_resposta passa a decidir pela janela. libera_em é o fim da
--      janela (início + 24 h). consumo_diario continua sendo somado pelo dia de
--      São Paulo, porque a sequência de dias e o painel dependem dele.
--
-- Aditiva: não altera nem apaga dados existentes. Pode ser rodada de novo.
-- Na primeira resposta depois de aplicada, cada pessoa abre uma janela nova.
begin;

create table if not exists public.janela_gratis (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  inicio timestamptz not null,
  quantidade integer not null default 0 check (quantidade >= 0),
  atualizado_em timestamptz not null default now()
);
alter table public.janela_gratis enable row level security;
revoke all on public.janela_gratis from anon, authenticated;
grant select on public.janela_gratis to authenticated;
drop policy if exists "usuario le janela propria" on public.janela_gratis;
create policy "usuario le janela propria" on public.janela_gratis for select to authenticated using (id_usuario = auth.uid());

-- Mesmas regras da versão de 202609300100 (administrador, cortesia, Simulado
-- Nacional e assinatura não gastam cota); só a contagem do gratuito mudou.
create or replace function public.autorizar_resposta(p_chave_idempotencia uuid, p_id_questao text)
returns table (permitido boolean, paywall_ativo boolean, ilimitado boolean, consumidas integer, limite integer, restantes integer, libera_em timestamptz, sequencia integer, motivo text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_usuario uuid := auth.uid();
  v_agora timestamptz := clock_timestamp();
  v_dia date := (v_agora at time zone 'America/Sao_Paulo')::date;
  v_janela interval := interval '24 hours';
  v_libera timestamptz := v_agora + interval '24 hours';
  v_config public.configuracao_comercial%rowtype;
  v_teste boolean := false;
  v_ilimitado boolean := false;
  v_consumidas integer := 0;
  v_inicio timestamptz;
  v_sequencia integer := 0;
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  if p_id_questao is null or length(p_id_questao) > 160 then raise exception 'questao_invalida'; end if;
  select * into v_config from public.configuracao_comercial where id = true;
  if not found then raise exception 'configuracao_ausente'; end if;
  select exists(select 1 from public.contas_teste where id_usuario=v_usuario and ativa) into v_teste;
  paywall_ativo := v_config.paywall_ativo or v_teste;
  limite := v_config.limite_diario_gratis;

  if not paywall_ativo then
    return query select true, false, true, 0, limite, null::integer, v_libera, 0, null::text;
    return;
  end if;

  select exists(select 1 from public.administradores adm where adm.id_usuario=v_usuario)
      or exists(select 1 from public.acessos_cortesia c where c.id_usuario=v_usuario and coalesce(c.ate, 'infinity') > v_agora)
      or exists(select 1 from public.simulado_participacoes sp
                join public.simulado_itens si on si.edicao = sp.edicao and si.id_questao = regexp_replace(p_id_questao, '^r[0-9]+:', '')
                join public.simulado_edicoes se on se.edicao = sp.edicao
                where sp.usuario_id = v_usuario and sp.entregue_em is null
                  and v_agora <= sp.iniciado_em + make_interval(mins => se.duracao_min + 30))
    into v_ilimitado;
  if not v_ilimitado then
  select exists(select 1 from public.assinaturas a where a.id_usuario=v_usuario and (a.status='ativa' or (a.status='cancelada' and a.cancelar_ao_fim)) and coalesce(a.fim_periodo, 'infinity') > v_agora) into v_ilimitado;
  end if;
  if v_ilimitado then
    insert into public.respostas_autorizadas values (p_chave_idempotencia,v_usuario,p_id_questao,v_dia,false,v_agora) on conflict do nothing;
    return query select true, true, true, 0, limite, null::integer, v_libera, 0, null::text;
    return;
  end if;

  -- A janela é travada antes de qualquer leitura: duas abas respondendo ao
  -- mesmo tempo não passam juntas da 20ª questão.
  insert into public.janela_gratis(id_usuario, inicio, quantidade) values (v_usuario, v_agora, 0) on conflict do nothing;
  select j.inicio, j.quantidade into v_inicio, v_consumidas from public.janela_gratis j where j.id_usuario=v_usuario for update;
  if v_inicio + v_janela <= v_agora then
    -- Janela vencida: a próxima questão contabilizada abre outra a partir de agora.
    update public.janela_gratis set inicio=v_agora, quantidade=0, atualizado_em=v_agora where id_usuario=v_usuario;
    v_inicio := v_agora;
    v_consumidas := 0;
  end if;
  v_libera := v_inicio + v_janela;

  -- Repetição da mesma resposta (rede instável, duas abas): não gasta de novo.
  if exists(select 1 from public.respostas_autorizadas where chave_idempotencia=p_chave_idempotencia and id_usuario=v_usuario) then
    return query select true,true,false,v_consumidas,limite,greatest(limite-v_consumidas,0),v_libera,0,null::text;
    return;
  end if;

  if v_consumidas >= limite then
    with dias as (select dia, dia - row_number() over(order by dia)::int as grupo from public.consumo_diario where id_usuario=v_usuario and quantidade>0 and dia<=v_dia), atual as (select grupo from dias where dia >= v_dia - 1 order by dia desc limit 1) select count(*) into v_sequencia from dias where grupo=(select grupo from atual);
    return query select false,true,false,v_consumidas,limite,0,v_libera,coalesce(v_sequencia,0),'Você atingiu o limite de questões grátis.'::text;
    return;
  end if;

  insert into public.respostas_autorizadas values(p_chave_idempotencia,v_usuario,p_id_questao,v_dia,true,v_agora);
  update public.janela_gratis set quantidade=quantidade+1, atualizado_em=v_agora where id_usuario=v_usuario returning quantidade into v_consumidas;
  insert into public.consumo_diario(id_usuario,dia,quantidade,atualizado_em) values(v_usuario,v_dia,1,v_agora)
    on conflict (id_usuario,dia) do update set quantidade=public.consumo_diario.quantidade+1, atualizado_em=v_agora;
  return query select true,true,false,v_consumidas,limite,greatest(limite-v_consumidas,0),v_libera,0,null::text;
end $$;
revoke all on function public.autorizar_resposta(uuid,text) from public;
grant execute on function public.autorizar_resposta(uuid,text) to authenticated;

commit;
