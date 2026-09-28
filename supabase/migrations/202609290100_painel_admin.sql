-- Painel do administrador: visão geral (usuários, ativos, respostas),
-- usuários com total de questões e acerto (ranking privado, só para quem
-- está em public.administradores) e assinaturas com as datas de início.
--
-- "Ativo" = sincronizou ao menos uma resposta no período. A data vem de
-- progresso_usuario.atualizado_em, gravada quando a resposta chega ao
-- servidor. Respostas de antes de um "reiniciar progresso" não contam, a
-- mesma regra do ranking.
--
-- Também: uma conta, um aparelho por vez. Cada aparelho logado se registra
-- em sessoes_aparelho ao entrar e manda um sinal a cada minuto. Se outro
-- aparelho entrou depois, o sinal responde "inativo" e o site sai da conta
-- nesse aparelho (o progresso local fica guardado). O mesmo sinal alimenta
-- o "online agora" do painel.
begin;

create table if not exists public.sessoes_aparelho (
  id_usuario uuid primary key references auth.users(id) on delete cascade,
  aparelho text not null check (aparelho ~ '^[A-Za-z0-9-]{8,64}$'),
  descricao text check (descricao is null or char_length(descricao) <= 80),
  entrou_em timestamptz not null default now(),
  visto_em timestamptz not null default now()
);
create index if not exists sessoes_aparelho_visto_idx on public.sessoes_aparelho (visto_em desc);
alter table public.sessoes_aparelho enable row level security;
revoke all on public.sessoes_aparelho from public, anon, authenticated;
-- Sem policy: só as funções abaixo leem e escrevem.

-- Chamada no login: este aparelho passa a ser o da conta. Quem estava
-- antes descobre no próximo sinal.
-- Devolve true (e não void): o PostgREST responde 204 sem corpo a funções
-- void, e o cliente do site espera sempre um JSON.
drop function if exists public.registrar_aparelho(text, text);
create function public.registrar_aparelho(p_aparelho text, p_descricao text)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  insert into public.sessoes_aparelho as s (id_usuario, aparelho, descricao, entrou_em, visto_em)
  values (auth.uid(), p_aparelho, left(p_descricao, 80), now(), now())
  on conflict (id_usuario) do update
    set aparelho = excluded.aparelho, descricao = excluded.descricao, entrou_em = now(), visto_em = now();
  return true;
end $$;
revoke all on function public.registrar_aparelho(text, text) from public, anon, authenticated;
grant execute on function public.registrar_aparelho(text, text) to authenticated;

-- Sinal periódico. ativo = este ainda é o aparelho da conta; senão devolve
-- a descrição do aparelho que entrou depois, para o aviso.
create or replace function public.sinal_aparelho(p_aparelho text)
returns table (ativo boolean, outro_aparelho text)
language plpgsql volatile security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_linha public.sessoes_aparelho%rowtype;
begin
  if auth.uid() is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  select * into v_linha from public.sessoes_aparelho s where s.id_usuario = auth.uid();
  if not found then
    -- Conta que já estava logada antes deste recurso: adota o aparelho.
    insert into public.sessoes_aparelho (id_usuario, aparelho) values (auth.uid(), p_aparelho)
    on conflict (id_usuario) do nothing;
    return query select true, null::text;
    return;
  end if;
  if v_linha.aparelho = p_aparelho then
    update public.sessoes_aparelho s set visto_em = now() where s.id_usuario = auth.uid();
    return query select true, null::text;
  else
    return query select false, v_linha.descricao;
  end if;
end $$;
revoke all on function public.sinal_aparelho(text) from public, anon, authenticated;
grant execute on function public.sinal_aparelho(text) to authenticated;

create or replace function public.eh_administrador()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
     and exists (select 1 from public.administradores adm where adm.id_usuario = auth.uid());
$$;
revoke all on function public.eh_administrador() from public, anon, authenticated;
grant execute on function public.eh_administrador() to authenticated;

create or replace function public.exigir_administrador()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.eh_administrador() then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
end $$;
revoke all on function public.exigir_administrador() from public, anon, authenticated;

drop function if exists public.resumo_admin();
create function public.resumo_admin()
returns table (
  online_agora bigint,
  usuarios bigint, novos_7d bigint,
  ativos_hoje bigint, ativos_7d bigint, ativos_30d bigint,
  respondidas_hoje bigint, respondidas_7d bigint,
  assinantes_vigentes bigint
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_inicio_hoje timestamptz := (((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo');
begin
  perform public.exigir_administrador();
  return query
    with atividade as (
      select p.usuario_id, p.atualizado_em
      from public.progresso_usuario p
      where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
        and p.atualizado_em >= now() - interval '30 days'
    )
    select
      (select count(*) from public.sessoes_aparelho s where s.visto_em >= now() - interval '3 minutes'),
      (select count(*) from auth.users),
      (select count(*) from auth.users u where u.created_at >= now() - interval '7 days'),
      (select count(distinct a.usuario_id) from atividade a where a.atualizado_em >= v_inicio_hoje),
      (select count(distinct a.usuario_id) from atividade a where a.atualizado_em >= now() - interval '7 days'),
      (select count(distinct a.usuario_id) from atividade a),
      (select count(*) from atividade a where a.atualizado_em >= v_inicio_hoje),
      (select count(*) from atividade a where a.atualizado_em >= now() - interval '7 days'),
      (select count(distinct s.id_usuario) from public.assinaturas s
        where (s.status = 'ativa' or (s.status = 'cancelada' and s.cancelar_ao_fim))
          and coalesce(s.fim_periodo, 'infinity') > now());
end $$;
revoke all on function public.resumo_admin() from public, anon, authenticated;
grant execute on function public.resumo_admin() to authenticated;

drop function if exists public.listar_usuarios_admin();
create function public.listar_usuarios_admin()
returns table (
  id_usuario uuid, email text, nome text,
  criado_em timestamptz, ultimo_login timestamptz, ultima_atividade timestamptz,
  respondidas bigint, acertos bigint, erros bigint, respondidas_7d bigint,
  plano_vigente text, administrador boolean,
  online boolean, aparelho text
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    with epocas as (
      select p.usuario_id, max(p.versao) as epoca
      from public.progresso_usuario p
      where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
      group by p.usuario_id
    ),
    validas as (
      select p.usuario_id, p.valor->>'c' as c, p.atualizado_em
      from public.progresso_usuario p
      left join epocas e on e.usuario_id = p.usuario_id
      where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
        and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
    ),
    por_usuario as (
      select v.usuario_id,
             count(*) as respondidas,
             count(*) filter (where v.c = 'true') as acertos,
             count(*) filter (where v.c = 'false') as erros,
             count(*) filter (where v.atualizado_em >= now() - interval '7 days') as respondidas_7d,
             max(v.atualizado_em) as ultima_atividade
      from validas v
      group by v.usuario_id
    ),
    vigentes as (
      select distinct on (s.id_usuario) s.id_usuario, s.plano
      from public.assinaturas s
      where (s.status = 'ativa' or (s.status = 'cancelada' and s.cancelar_ao_fim))
        and coalesce(s.fim_periodo, 'infinity') > now()
      order by s.id_usuario, s.atualizada_em desc
    )
    select u.id, u.email::text,
           nullif(btrim(concat_ws(' ', u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'sobrenome')), ''),
           u.created_at, u.last_sign_in_at, pu.ultima_atividade,
           coalesce(pu.respondidas, 0), coalesce(pu.acertos, 0), coalesce(pu.erros, 0),
           coalesce(pu.respondidas_7d, 0),
           vg.plano,
           exists (select 1 from public.administradores adm where adm.id_usuario = u.id),
           coalesce(sa.visto_em >= now() - interval '3 minutes', false),
           sa.descricao
    from auth.users u
    left join por_usuario pu on pu.usuario_id = u.id
    left join vigentes vg on vg.id_usuario = u.id
    left join public.sessoes_aparelho sa on sa.id_usuario = u.id
    order by coalesce(pu.respondidas, 0) desc, u.created_at asc;
end $$;
revoke all on function public.listar_usuarios_admin() from public, anon, authenticated;
grant execute on function public.listar_usuarios_admin() to authenticated;

-- Mesmas colunas de antes, na mesma ordem, e mais as datas: quando a pessoa
-- assinou, o período atual e a última cobrança paga.
drop function if exists public.listar_assinaturas_admin();
create function public.listar_assinaturas_admin()
returns table (
  id_usuario uuid, usuario text, plano text, status text,
  proxima_cobranca timestamptz, ultima_atualizacao timestamptz,
  nome text, criada_em timestamptz, inicio_periodo timestamptz, fim_periodo timestamptz,
  ultima_cobranca_em timestamptz, cancelar_ao_fim boolean
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
           a.criada_em, a.inicio_periodo, a.fim_periodo, a.ultima_cobranca_em, a.cancelar_ao_fim
    from public.assinaturas a
    join auth.users u on u.id = a.id_usuario
    order by a.criada_em desc;
end $$;
revoke all on function public.listar_assinaturas_admin() from public, anon, authenticated;
grant execute on function public.listar_assinaturas_admin() to authenticated;

-- O webhook grava o erro como String(new Error('codigo')), ou seja
-- "Error: codigo". A checagem de formato recusava o prefixo e o painel
-- mostrava "erro_interno" para tudo. Agora o prefixo sai antes da checagem;
-- texto livre (que pode ter dados sensíveis) continua escondido.
create or replace function public.listar_eventos_pagamento_admin()
returns table (
  id bigint, id_evento text, tipo text, id_recurso text,
  status_processamento text, erro text, recebido_em timestamptz, processado_em timestamptz
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
           e.recebido_em, e.processado_em
    from public.eventos_pagamento e
    order by e.recebido_em desc
    limit 200;
end $$;
revoke all on function public.listar_eventos_pagamento_admin() from public, anon, authenticated;
grant execute on function public.listar_eventos_pagamento_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
