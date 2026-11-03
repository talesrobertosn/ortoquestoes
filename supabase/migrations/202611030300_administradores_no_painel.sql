-- Administradores no painel (Tales, 03/11/2026): as contas de administrador aparecem no painel como qualquer
-- pessoa (online, listas, assinaturas e cobranças de teste), com o selo "Admin" e o acesso "Cortesia de
-- administrador". Não são assinantes pagantes: ficam fora da receita, da conversão e da contagem de assinantes.
--   1. listar_cortesias_admin ganha a coluna "tipo": 'cortesia' (tabela acessos_cortesia, como antes) ou
--      'administrador' (toda conta da tabela administradores, sem prazo). Nada é gravado em acessos_cortesia:
--      o acesso do administrador continua vindo do papel, como sempre.
--   2. listar_assinaturas_admin ganha a coluna "administrador", para o painel separar as compras de teste
--      do administrador pelo papel da conta, e não pelo nome.
-- Só troca funções de leitura do painel. Pode ser rodada de novo. O painel antigo ignora as colunas novas.
begin;

drop function if exists public.listar_cortesias_admin();
create function public.listar_cortesias_admin()
returns table (id_usuario uuid, ate timestamptz, motivo text, tipo text)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select c.id_usuario, c.ate, c.motivo, 'cortesia'::text
    from public.acessos_cortesia c
    where coalesce(c.ate, 'infinity'::timestamptz) > now()
      and not exists (select 1 from public.administradores adm where adm.id_usuario = c.id_usuario)
    union all
    select adm.id_usuario, null::timestamptz, 'Cortesia de administrador'::text, 'administrador'::text
    from public.administradores adm;
end $$;
revoke all on function public.listar_cortesias_admin() from public, anon, authenticated;
grant execute on function public.listar_cortesias_admin() to authenticated;

drop function if exists public.listar_assinaturas_admin();
create function public.listar_assinaturas_admin()
returns table (
  id_usuario uuid, usuario text, plano text, status text,
  proxima_cobranca timestamptz, ultima_atualizacao timestamptz,
  nome text, criada_em timestamptz, inicio_periodo timestamptz, fim_periodo timestamptz,
  ultima_cobranca_em timestamptz, cancelar_ao_fim boolean, cancelada_em timestamptz,
  meio text, motivo_falha text, falha_em timestamptz, administrador boolean
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
           case when a.id_externo like 'pix:%' then 'pix' else 'cartao' end,
           a.motivo_falha, a.falha_em,
           exists (select 1 from public.administradores adm where adm.id_usuario = a.id_usuario)
    from public.assinaturas a
    join auth.users u on u.id = a.id_usuario
    order by a.criada_em desc;
end $$;
revoke all on function public.listar_assinaturas_admin() from public, anon, authenticated;
grant execute on function public.listar_assinaturas_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
