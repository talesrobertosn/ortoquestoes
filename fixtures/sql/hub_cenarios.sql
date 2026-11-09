-- Concatenar à nova migração sem COMMIT; terminar com ROLLBACK. Não chama HTTP.
do $$
declare
 a uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); v uuid:=gen_random_uuid(); w uuid:=gen_random_uuid();
 r uuid; j jsonb; n integer; antes integer; pendentes integer;
begin
 if has_function_privilege('anon','public.hub_concluir(uuid)','execute')
    or has_function_privilege('authenticated','public.hub_iniciar(uuid,jsonb,jsonb)','execute') then raise exception 'RPC administrativa exposta'; end if;
 insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
  (a,'auditoria-'||a||'@example.invalid',now(),'{}'),
  (u,'auditoria-'||u||'@example.invalid',now(),'{}'),
  (v,'auditoria-'||v||'@example.invalid',now(),'{}'),
  (w,'auditoria-'||w||'@example.invalid',now(),'{}');
 insert into public.administradores(id_usuario) values(a);
 if public.hub_bloqueio(u,'assinou_sem_cronograma','cartas')<>'Modelo aposentado; o cronograma é opcional' then raise exception 'Modelo retirado liberado'; end if;
 if exists(select 1 from public.candidatos_assinou_sem_cronograma()) then raise exception 'Campanha retirada ainda seleciona pessoas'; end if;
 select count(*) into antes from public.email_fila f join public.email_rodadas d on d.id=f.rodada where d.dia=(now() at time zone 'America/Sao_Paulo')::date;
 j:=jsonb_build_object('id_usuario',u,'tipo','pausa','referencia','auditoria','assunto','Teste revertido');
 r:=public.hub_iniciar(a,jsonb_build_array(j),'{"cenario":"fogo_apagando"}');
 perform public.hub_iniciar(a,jsonb_build_array(j),'{"cenario":"fogo_apagando"}');
 select count(*) into n from public.email_fila where rodada=r;
 if n<>antes+1 then raise exception 'Duplo clique duplicou'; end if;
 -- Simula fila concluída e acrescenta outro cenário ao mesmo dia.
 update public.email_rodadas set status='concluida' where id=r;
 j:=j||jsonb_build_object('id_usuario',v,'tipo','pix_3_dias');
 if public.hub_iniciar(a,jsonb_build_array(j),'{"cenario":"pix_3_dias"}')<>r then raise exception 'Segundo cenário criou outro dia'; end if;
 if (select status from public.email_rodadas where id=r)<>'ativa' then raise exception 'Nova seleção não reativou fila'; end if;
 -- A pausa é respeitada mesmo recebendo uma nova seleção.
 update public.email_rodadas set status='pausada' where id=r;
 j:=j||jsonb_build_object('id_usuario',w,'tipo','reta_final');
 perform public.hub_iniciar(a,jsonb_build_array(j),'{"cenario":"reta_final"}');
 if (select status from public.email_rodadas where id=r)<>'pausada' then raise exception 'Nova seleção desfez pausa'; end if;
 select count(*) into n from public.email_fila where rodada=r and id_usuario in(u,v,w);
 if n<>3 then raise exception 'Segundo cenário perdeu destinatários'; end if;
 -- Um novo cenário para a mesma pessoa não cria segunda mensagem diária.
 perform public.hub_iniciar(a,jsonb_build_array(j||jsonb_build_object('id_usuario',u)));
 if (select count(*) from public.email_fila where rodada=r and id_usuario=u)<>1 then raise exception 'Pessoa repetida no dia'; end if;
 update public.email_rodadas set status='ativa' where id=r;
 perform public.hub_concluir(r);
 if (select status from public.email_rodadas where id=r)<>'ativa' then raise exception 'Conclusão encerrou fila com pendentes'; end if;
 update public.email_fila set status='enviado' where rodada=r and id_usuario in(u,v,w);
 perform public.hub_concluir(r);
 select count(*) into pendentes from public.email_fila where rodada=r and status in('pendente','processando');
 if (select status from public.email_rodadas where id=r)<>(case when pendentes=0 then 'concluida' else 'ativa' end) then raise exception 'Conclusão incorreta'; end if;
end $$;
select 'hub_cenarios_ok' as resultado;
rollback;
