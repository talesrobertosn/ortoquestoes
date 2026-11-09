-- Executar depois da migração dentro da MESMA transação e terminar com ROLLBACK.
-- Somente registros transacionais de teste; nenhum HTTP de envio é chamado.
do $$
declare u uuid; a uuid; r uuid; f uuid; e bigint; resultado jsonb; j jsonb; chave text:=gen_random_uuid()::text;
begin
  if has_function_privilege('authenticated','public.hub_proximo()','execute')
    or has_function_privilege('anon','public.hub_iniciar(uuid,jsonb,jsonb)','execute')
    then raise exception 'Fila exposta a papel sem autorização'; end if;
  if public.hub_bloqueio('00000000-0000-4000-8000-000000000000','sumiu','cartas',null)<>'Sem endereço de e-mail'
    then raise exception 'Conta inexistente foi liberada'; end if;
  select id into u from auth.users where public.hub_bloqueio(id,'auditoria_hub','cartas') is null
    and public.hub_bloqueio(id,'relatorio','relatorio') is null limit 1;
  select id_usuario into a from public.administradores limit 1;
  if u is null or a is null then raise exception 'Teste exige um admin e uma conta elegível; não alterar dados reais para forçar elegibilidade'; end if;
  insert into public.emails_enviados(id_usuario,tipo,modelo,referencia,status,enviado_em)
    select u,'carta','auditoria_hub',chave||':'||i,'enviado',now()-interval '1 hour' from generate_series(1,3) i;
  if public.hub_bloqueio(u,'outro_assunto','cartas')<>'Intervalo mínimo de 48 horas' then raise exception 'Intervalo de 48h não aplicado'; end if;
  update public.emails_enviados set enviado_em=now()-interval '3 days' where id_usuario=u and referencia like chave||':%';
  if public.hub_bloqueio(u,'outro_assunto','cartas')<>'Limite de três e-mails em 14 dias' then raise exception 'Teto de 14 dias não aplicado'; end if;
  if public.hub_bloqueio(u,'relatorio','relatorio') is not null then raise exception 'Exceção dos relatórios não preservada'; end if;
  update public.emails_enviados set enviado_em=now()-interval '20 days',modelo='sumiu' where id_usuario=u and referencia like chave||':%';
  if public.hub_bloqueio(u,'como_estao','cartas')<>'Mesmo assunto enviado nos últimos 30 dias' then raise exception 'Intenção equivalente não bloqueada'; end if;
  j:=jsonb_build_object('id_usuario',u,'email',(select email from auth.users where id=u),'tipo','relatorio','tipo_log','relatorio','categoria','relatorio',
    'referencia',chave,'assunto','Auditoria revertida','modelo','relatorio','versao','relatorio#v1','prioridade',20);
  r:=public.hub_iniciar(a,jsonb_build_array(j));
  if public.hub_iniciar(a,jsonb_build_array(j))<>r then raise exception 'Duplo clique criou duas rodadas'; end if;
  select id into f from public.hub_proximo();
  update public.email_rodadas set status='pausada' where id=r;
  resultado:=public.hub_reservar(f);
  if resultado->>'bloqueio'<>'Rodada pausada' or (select status from public.email_fila where id=f)<>'pendente' then raise exception 'Pausa perdeu item'; end if;
  update public.email_rodadas set status='ativa' where id=r;
  perform public.hub_proximo();
  resultado:=public.hub_reservar(f);e:=(resultado->>'envio_id')::bigint;
  if e is null then raise exception 'Reserva válida não criou registro: %',resultado; end if;
  resultado:=public.hub_reservar(f);
  if resultado->>'bloqueio'<>'Mensagem já reservada' then raise exception 'Reserva duplicada liberada'; end if;
  update public.emails_enviados set status='falhou' where id=e;
  update public.email_fila set status='falhou' where id=f;
  perform public.hub_repetir(r);perform public.hub_proximo();
  resultado:=public.hub_reservar(f);
  if (resultado->>'envio_id')::bigint<>e then raise exception 'Retry não reutilizou registro falho'; end if;
  update public.email_fila set status='incerto' where id=f;
  if public.hub_repetir(r)<>0 then raise exception 'Entrega incerta entrou no retry'; end if;
end $$;
