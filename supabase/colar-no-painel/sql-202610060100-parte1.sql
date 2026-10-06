-- Parte 1 de 3 da migração 202610060100 (painel: etapa, provas e meio de pagamento).
-- Cole TUDO no SQL Editor do Supabase e clique em Run (sem selecionar nada).
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

notify pgrst, 'reload schema';
commit;
