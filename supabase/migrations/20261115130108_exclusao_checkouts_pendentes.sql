-- Exclusão definitiva: somente a Edge Function (service_role), depois de cancelar
-- cobranças recorrentes no provedor. Limpeza e Auth na mesma transação.
create or replace function public.dados_exclusao_conta_servidor(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'acesso_negado'; end if;
  if exists(select 1 from public.administradores where id_usuario=p_id) then raise exception 'administrador_protegido'; end if;
  return jsonb_build_object(
    'assinaturas',coalesce((select jsonb_agg(jsonb_build_object('id',id,'externo',id_externo)) from public.assinaturas where id_usuario=p_id and coalesce(id_externo,'') not like 'pix:%' and status not in ('cancelada','reembolsada','expirada')), '[]'::jsonb),
    'arquivos',coalesce((select jsonb_agg(jsonb_build_object('bucket',bucket_id,'nome',name)) from storage.objects where owner_id=p_id::text or owner=p_id),'[]'::jsonb),
    'checkout',exists(select 1 from public.aceites_assinatura where id_usuario=p_id),
    'legado',exists(select 1 from privado.assinaturas where usuario_id=p_id));
end $$;
revoke all on function public.dados_exclusao_conta_servidor(uuid) from public, anon, authenticated;
grant execute on function public.dados_exclusao_conta_servidor(uuid) to service_role;

