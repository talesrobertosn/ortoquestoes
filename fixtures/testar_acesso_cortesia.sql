-- Executar após a migração de acesso. Tudo é revertido; não usa gateway nem envia e-mail.
begin;
do $$
declare u uuid:=gen_random_uuid(); amigo uuid:=gen_random_uuid(); pedido uuid:=gen_random_uuid();
 v jsonb; inicio timestamptz; fim timestamptz; negado boolean:=false; ref text:='999'||to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS');
begin
 insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values
  (u,'cortesia-'||u||'@example.invalid','{"nome":"Pessoa de teste"}',now()),
  (amigo,'amigo-'||amigo||'@example.invalid','{"nome":"Ana Teste"}',now());
 insert into public.acessos_cortesia(id_usuario,ate,motivo) values(u,now()+interval '7 days','Indicação: convidou um amigo');
 insert into public.indicacoes(id_convidado,id_padrinho,confirmada_em,dias_padrinho,dias_convidado) values(amigo,u,now(),7,7);
 if public.inicio_proximo_periodo(u)<>now()+interval '7 days' then raise exception 'Cortesia não foi preservada'; end if;
 perform set_config('request.jwt.claim.sub',u::text,true);
 v:=public.obter_resumo_acesso();
 if v#>>'{cortesia,origens,0,nome}'<>'Ana' or (v#>'{cortesia}')?'motivo' then raise exception 'Origem ou privacidade incorreta'; end if;
 begin perform public.listar_resumos_acesso_admin(); exception when others then negado:=true; end;
 if not negado then raise exception 'Conta comum leu painel'; end if;
 insert into public.pedidos_pix(id,id_usuario,plano,meses,valor_centavos) values(pedido,u,'mensal',1,3990);
 perform public.confirmar_pagamento_pix(pedido,ref,'approved',now());
 select inicio_periodo,fim_periodo into inicio,fim from public.assinaturas where id_externo='pix:'||pedido;
 if inicio<>now()+interval '7 days' or fim<>inicio+interval '1 month' then raise exception 'Compra não somou após a cortesia'; end if;
 perform public.confirmar_pagamento_pix(pedido,ref,'approved',now());
 if (select count(*) from public.assinaturas where id_externo='pix:'||pedido)<>1 or
  (select fim_periodo from public.assinaturas where id_externo='pix:'||pedido)<>fim then raise exception 'Pix duplicado alterou o saldo'; end if;
 perform public.somar_dias_cortesia_interno(u,7,'Indicação: convidou um amigo');
 if (select ate from public.acessos_cortesia where id_usuario=u)<>fim+interval '7 days' then raise exception 'Nova indicação não foi somada após o pago'; end if;
 if has_function_privilege('anon','public.obter_resumo_acesso()','execute') or
  has_function_privilege('authenticated','public.inicio_proximo_periodo(uuid,timestamptz)','execute') then raise exception 'Permissões excessivas'; end if;
 perform set_config('request.jwt.claim.sub',amigo::text,true);
 if public.obter_resumo_acesso()->'cortesia'<>'null'::jsonb then raise exception 'Conta leu cortesia alheia'; end if;
end $$;
rollback;
