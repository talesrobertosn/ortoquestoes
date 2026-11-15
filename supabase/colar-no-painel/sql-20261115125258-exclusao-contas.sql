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
    'legado',exists(select 1 from privado.assinaturas where usuario_id=p_id));
end $$;
revoke all on function public.dados_exclusao_conta_servidor(uuid) from public, anon, authenticated;
grant execute on function public.dados_exclusao_conta_servidor(uuid) to service_role;

create or replace function public.excluir_conta_servidor(p_id uuid, p_email text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'acesso_negado'; end if;
  if exists(select 1 from public.administradores where id_usuario=p_id) then raise exception 'administrador_protegido'; end if;
  select email into v_email from auth.users where id=p_id for update;
  if not found then return true; end if;
  if lower(coalesce(v_email,'')) <> lower(coalesce(p_email,'')) then raise exception 'conta_divergente'; end if;
  if exists(select 1 from public.assinaturas where id_usuario=p_id and coalesce(id_externo,'') not like 'pix:%' and status not in ('cancelada','reembolsada','expirada')) then raise exception 'renovacao_pendente'; end if;
  if exists(select 1 from privado.assinaturas where usuario_id=p_id) then raise exception 'assinatura_legada'; end if;
  if exists(select 1 from storage.objects where owner_id=p_id::text or owner=p_id) then raise exception 'arquivos_pendentes'; end if;
  -- Sem FK ou com SET NULL: apagar o conteúdo pessoal, não só soltar o vínculo.
  delete from public.ranking_cache where usuario_id=p_id;
  delete from public.relatos_erro where id_usuario=p_id;
  delete from public.opinioes_flashcards where id_usuario=p_id;
  delete from public.eventos_pagamento where id_usuario=p_id;
  -- Invalida fotografias do painel que possam conter nome/email/progresso.
  delete from public.cache_admin;
  update public.email_rodadas set resumo='{}'::jsonb where resumo::text like '%'||p_id::text||'%';
  update public.emails_enviados set enviado_por=null where enviado_por=p_id;
  -- As FKs ON DELETE CASCADE removem perfil, progresso, planos, ranking,
  -- flashcards, preferências, fila de e-mail, cobrança, sessões e identidades.
  delete from auth.refresh_tokens where user_id=p_id::text;
  delete from auth.users where id=p_id;
  return true;
end $$;
revoke all on function public.excluir_conta_servidor(uuid,text) from public, anon, authenticated;
grant execute on function public.excluir_conta_servidor(uuid,text) to service_role;
