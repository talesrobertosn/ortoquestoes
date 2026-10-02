-- Painel do administrador, parte 3: a lista de usuários passa a trazer o perfil
-- (situação, serviço, cidade e UF), para destacar de onde cada pessoa é e
-- buscar por serviço. Mesmas colunas de antes, na mesma ordem, e mais quatro no fim.
-- Aditiva: não altera dados. O retorno ganhou colunas, por isso o drop antes do create.
begin;

drop function if exists public.listar_usuarios_admin();
create function public.listar_usuarios_admin()
returns table (
  id_usuario uuid, email text, nome text,
  criado_em timestamptz, ultimo_login timestamptz, ultima_atividade timestamptz,
  respondidas bigint, acertos bigint, erros bigint, respondidas_7d bigint,
  plano_vigente text, administrador boolean,
  online boolean, aparelho text,
  situacao text, servico text, cidade text, uf text
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
           nullif(btrim(u.raw_user_meta_data->>'uf'), '')
    from auth.users u
    left join por_usuario pu on pu.usuario_id = u.id
    left join vigentes vg on vg.id_usuario = u.id
    left join public.sessoes_aparelho sa on sa.id_usuario = u.id
    order by coalesce(pu.respondidas, 0) desc, u.created_at asc;
end $$;
revoke all on function public.listar_usuarios_admin() from public, anon, authenticated;
grant execute on function public.listar_usuarios_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
