-- Após a migração. Tudo é revertido; nenhuma pessoa, pagamento ou acesso é alterado.
begin;
set local statement_timeout = '30s';
select set_config('request.jwt.claims',jsonb_build_object('sub',(select id_usuario from public.administradores limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare v jsonb; v_id bigint;
begin
  v := public.jornada_crescimento_admin('{}',30);
  if jsonb_array_length(v->'serie') <> 30 then raise exception 'serie_incompleta'; end if;
  if exists(select 1 from jsonb_array_elements(v->'primeiros') p where (p->>'id_usuario')::uuid=auth.uid()) then raise exception 'admin_na_jornada'; end if;
  perform public.salvar_anotacao_negocio_admin(current_date,'Verificação transitória do painel de negócio');
  select a.id into v_id from public.listar_anotacoes_negocio_admin() a where a.texto='Verificação transitória do painel de negócio' order by a.id desc limit 1;
  if v_id is null then raise exception 'anotacao_nao_gravada'; end if;
  perform public.remover_anotacao_negocio_admin(v_id);
  if exists(select 1 from public.listar_anotacoes_negocio_admin() a where a.id=v_id) then raise exception 'anotacao_nao_removida'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.jornada_crescimento_admin(uuid[],integer)','EXECUTE') then raise exception 'jornada_publica'; end if;
  if has_table_privilege('authenticated','public.anotacoes_negocio','SELECT') then raise exception 'anotacoes_expostas'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000000","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
  begin
    perform public.jornada_crescimento_admin('{}',7);
    raise exception 'usuario_comum_leu_jornada';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;
