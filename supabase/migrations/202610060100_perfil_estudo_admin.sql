-- Perfil de estudo no painel do administrador.
-- 1) listar_usuarios_admin passa a trazer o ano da residência (R1, R2, R3) e as
--    provas de interesse (TARO, TEOT, mão, R4, atualização), que o cadastro e o
--    perfil gravam nos metadados do usuário. Mesmas colunas de antes, na mesma
--    ordem, e mais duas no fim.
-- 2) listar_assinaturas_admin passa a dizer o meio de pagamento (pix ou cartao).
--    A compra por Pix é avulsa e é gravada como "não renova"; sem essa coluna,
--    o painel a contava como cancelamento.
-- 3) Ranking: cada pessoa pode mostrar o serviço onde faz residência (o
--    "local da residência") ao lado do nome. Desligado por padrão
--    (perfis_publicos.mostrar_servico = false); o serviço vem do cadastro.
-- 4) Lembrete de renovação do Pix: quem pagou no Pix (acesso avulso, sem
--    renovação automática) recebe um e-mail quando faltam 3 dias para o acesso
--    acabar. Campanha "renovacao_pix" dos lembretes; uma vez por compra.
--    Pode ser disparada pelo painel ou pelo agendador diário (x-segredo).
-- Aditiva: não altera dados. Os retornos ganharam colunas, por isso o drop antes do create.
begin;

drop function if exists public.listar_usuarios_admin();
create function public.listar_usuarios_admin()
returns table (
  id_usuario uuid, email text, nome text,
  criado_em timestamptz, ultimo_login timestamptz, ultima_atividade timestamptz,
  respondidas bigint, acertos bigint, erros bigint, respondidas_7d bigint,
  plano_vigente text, administrador boolean,
  online boolean, aparelho text,
  situacao text, servico text, cidade text, uf text,
  ano_residencia text, provas text
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
           sa.descricao,
           nullif(btrim(u.raw_user_meta_data->>'situacao'), ''),
           nullif(btrim(u.raw_user_meta_data->>'servico'), ''),
           nullif(btrim(u.raw_user_meta_data->>'cidade'), ''),
           nullif(btrim(u.raw_user_meta_data->>'uf'), ''),
           nullif(btrim(u.raw_user_meta_data->>'ano_residencia'), ''),
           -- Lista de provas (jsonb array) vira texto separado por vírgula.
           case when jsonb_typeof(u.raw_user_meta_data->'provas_interesse') = 'array'
                then nullif((select string_agg(x, ',') from jsonb_array_elements_text(u.raw_user_meta_data->'provas_interesse') x), '')
                else nullif(btrim(u.raw_user_meta_data->>'provas_interesse'), '') end
    from auth.users u
    left join por_usuario pu on pu.usuario_id = u.id
    left join vigentes vg on vg.id_usuario = u.id
    left join public.sessoes_aparelho sa on sa.id_usuario = u.id
    order by coalesce(pu.respondidas, 0) desc, u.created_at asc;
end $$;
revoke all on function public.listar_usuarios_admin() from public, anon, authenticated;
grant execute on function public.listar_usuarios_admin() to authenticated;


drop function if exists public.listar_assinaturas_admin();
create function public.listar_assinaturas_admin()
returns table (
  id_usuario uuid, usuario text, plano text, status text,
  proxima_cobranca timestamptz, ultima_atualizacao timestamptz,
  nome text, criada_em timestamptz, inicio_periodo timestamptz, fim_periodo timestamptz,
  ultima_cobranca_em timestamptz, cancelar_ao_fim boolean, cancelada_em timestamptz,
  meio text
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
           a.criada_em, a.inicio_periodo, a.fim_periodo, a.ultima_cobranca_em, a.cancelar_ao_fim, a.cancelada_em,
           case when a.id_externo like 'pix:%' then 'pix' else 'cartao' end
    from public.assinaturas a
    join auth.users u on u.id = a.id_usuario
    order by a.criada_em desc;
end $$;
revoke all on function public.listar_assinaturas_admin() from public, anon, authenticated;
grant execute on function public.listar_assinaturas_admin() to authenticated;

-- Ranking com o serviço (só de quem escolheu mostrar).
alter table public.perfis_publicos add column if not exists mostrar_servico boolean not null default false;

drop function if exists public.obter_ranking_com_movimento(text);

create function public.obter_ranking_com_movimento(periodo text default 'geral')
returns table(
  posicao bigint, apelido text, total bigint, total_geral bigint,
  eh_voce boolean, variacao bigint, variacao_semana bigint, novo boolean,
  referencia_em date, emblemas text[], sequencia integer, servico text
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  tem_historico boolean;
begin
  if auth.uid() is null then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  if periodo is null or periodo not in ('geral', 'semana') then
    raise exception 'periodo_invalido' using errcode = '22023';
  end if;

  select exists (
    select 1 from public.ranking_posicoes_diarias h
    where h.periodo = obter_ranking_com_movimento.periodo and h.dia < hoje
  ) into tem_historico;

  return query
    select r.posicao, r.apelido, r.total, r.total_geral,
           r.usuario_id = auth.uid() as eh_voce,
           case when anterior.posicao is null then null
                else anterior.posicao - r.posicao end as variacao,
           case when semana.posicao is null then null
                else semana.posicao - r.posicao end as variacao_semana,
           (tem_historico and anterior.posicao is null) as novo,
           anterior.dia as referencia_em,
           coalesce(pp.emblemas, '{}') as emblemas,
           case when pp.sequencia_em >= hoje - 1 then pp.sequencia_atual else 0 end as sequencia,
           case when coalesce(pp.mostrar_servico, false)
                then nullif(left(btrim(u.raw_user_meta_data->>'servico'), 80), '') end as servico
    from public.calcular_ranking_interno(periodo) r
    left join public.perfis_publicos pp on pp.usuario_id = r.usuario_id
    left join auth.users u on u.id = r.usuario_id
    left join lateral (
      select h.posicao, h.dia
      from public.ranking_posicoes_diarias h
      where h.usuario_id = r.usuario_id and h.periodo = obter_ranking_com_movimento.periodo
        and h.dia < hoje
      order by h.dia desc
      limit 1
    ) anterior on true
    left join lateral (
      select h.posicao
      from public.ranking_posicoes_diarias h
      where h.usuario_id = r.usuario_id and h.periodo = obter_ranking_com_movimento.periodo
        and h.dia < hoje and h.dia >= hoje - 7
      order by h.dia asc
      limit 1
    ) semana on true
    where r.posicao <= 50 or r.usuario_id = auth.uid()
    order by r.posicao;

  insert into public.ranking_posicoes_diarias (dia, periodo, usuario_id, posicao, registrada_em)
  select hoje, obter_ranking_com_movimento.periodo, r.usuario_id, r.posicao, now()
  from public.calcular_ranking_interno(periodo) r
  on conflict on constraint ranking_posicoes_diarias_pkey do update
    set posicao = excluded.posicao, registrada_em = excluded.registrada_em;

  delete from public.ranking_posicoes_diarias where dia < hoje - 30;
end;
$$;

revoke all on function public.obter_ranking_com_movimento(text) from public, anon, authenticated;
grant execute on function public.obter_ranking_com_movimento(text) to authenticated;


-- Lembrete de renovação para quem pagou no Pix: acesso termina em até 3 dias
-- (e meio, para o envio diário não perder ninguém), sem outra assinatura que
-- vá além (já renovou ou passou para o cartão). Um e-mail por compra.
create or replace function public.candidatos_renovacao_pix_interno()
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_restantes integer, plano text, fim_periodo timestamptz)
language sql stable security definer set search_path = '' as $$
  select a.id_usuario, 'pix:' || a.id::text, u.email::text,
         nullif(btrim(u.raw_user_meta_data->>'nome'), ''),
         (select count(*) from public.progresso_usuario p where p.usuario_id = a.id_usuario and p.tipo = 'respondidas' and p.valor <> 'null'::jsonb),
         greatest(0, ceil(extract(epoch from (a.fim_periodo - now())) / 86400))::integer,
         a.plano, a.fim_periodo
  from public.assinaturas a
  join auth.users u on u.id = a.id_usuario
  where a.id_externo like 'pix:%' and a.status = 'ativa'
    and a.fim_periodo > now() and a.fim_periodo <= now() + interval '3 days 12 hours'
    and u.email is not null and u.email_confirmed_at is not null
    and coalesce((select pe.lembretes from public.preferencias_email pe where pe.id_usuario = a.id_usuario), true)
    and not exists (
      select 1 from public.assinaturas b
      where b.id_usuario = a.id_usuario and b.id <> a.id and b.status = 'ativa'
        and coalesce(b.fim_periodo, 'infinity') > a.fim_periodo
    )
    and not exists (
      select 1 from public.emails_enviados e
      where e.tipo = 'lembrete' and e.id_usuario = a.id_usuario and e.referencia = 'pix:' || a.id::text and e.status in ('enviado', 'enviando')
    )
  order by a.fim_periodo;
$$;
revoke all on function public.candidatos_renovacao_pix_interno() from public, anon, authenticated;

create or replace function public.destinatarios_renovacao_pix(p_limite integer default 40)
returns table (id_usuario uuid, referencia text, email text, nome text, respondidas bigint, dias_restantes integer, plano text, fim_periodo timestamptz)
language sql stable security definer set search_path = '' as $$
  select * from public.candidatos_renovacao_pix_interno()
  limit greatest(1, least(coalesce(p_limite, 40), 200));
$$;
revoke all on function public.destinatarios_renovacao_pix(integer) from public, anon, authenticated;
grant execute on function public.destinatarios_renovacao_pix(integer) to service_role;

-- Resumo do painel com a campanha nova.
create or replace function public.resumo_lembretes_admin()
returns table (campanha text, pessoas bigint, enviados_7d bigint, enviados_total bigint, falharam_7d bigint)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select c.campanha,
           case when c.campanha = 'renovacao_pix' then (select count(*) from public.candidatos_renovacao_pix_interno())
                else (select count(*) from public.candidatos_lembrete_interno(c.campanha)) end,
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days'),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'enviado' and e.referencia like c.prefixo),
           (select count(*) from public.emails_enviados e where e.tipo = 'lembrete' and e.status = 'falhou' and e.referencia like c.prefixo and e.enviado_em >= now() - interval '7 days')
    from (values ('nunca', 'nunca'), ('tres_dias', 'tres:%'), ('sete_dias', 'sete:%'), ('renovacao_pix', 'pix:%')) as c(campanha, prefixo);
end $$;
revoke all on function public.resumo_lembretes_admin() from public, anon, authenticated;
grant execute on function public.resumo_lembretes_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
