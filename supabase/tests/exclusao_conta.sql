-- Apenas contas sintéticas e ROLLBACK. Não chamar sobre contas reais.
begin;
do $$
declare u uuid:=gen_random_uuid(); e text;
begin
  e:='teste-exclusao-'||u::text||'@example.invalid';
  insert into auth.users(id,email,aud,role) values(u,e,'authenticated','authenticated');
  insert into public.perfis_publicos(usuario_id,apelido) values(u,'Teste descartável');
  insert into public.preferencias_email(id_usuario) values(u);
  insert into public.progresso_usuario(usuario_id,tipo,item,valor,versao,operacao)
    values(u,'notas','teste-exclusao','"descartável"'::jsonb,1,gen_random_uuid());
  perform set_config('request.jwt.claims','{"role":"service_role"}',true);
  perform public.excluir_conta_servidor(u,e);
  if exists(select 1 from auth.users where id=u)
    or exists(select 1 from public.progresso_usuario where usuario_id=u)
    or exists(select 1 from public.preferencias_email where id_usuario=u)
    or exists(select 1 from public.perfis_publicos where usuario_id=u)
    then raise exception 'dados_restantes'; end if;
  -- Mesmo e-mail disponível imediatamente, com novo UUID.
  insert into auth.users(id,email,aud,role) values(gen_random_uuid(),e,'authenticated','authenticated');
  insert into auth.users(id,email,aud,role) values(u,'admin-'||e,'authenticated','authenticated');
  insert into public.administradores(id_usuario) values(u);
  begin
    perform public.excluir_conta_servidor(u,'admin-'||e);
    raise exception 'admin_foi_apagado';
  exception when others then if sqlerrm<>'administrador_protegido' then raise; end if;
  end;
  if has_function_privilege('anon','public.excluir_conta_servidor(uuid,text)','execute')
    or has_function_privilege('authenticated','public.excluir_conta_servidor(uuid,text)','execute')
    then raise exception 'permissao_indevida'; end if;
end $$;
rollback;
