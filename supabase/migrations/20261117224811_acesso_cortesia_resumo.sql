begin;

create or replace function public.resumo_acesso_interno(p_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 with corte as (select * from public.acessos_cortesia where id_usuario=p_id),
 pago as (select max(fim_periodo) filter(where status in ('ativa','cancelada','vencida')) as ultimo,
   max(fim_periodo) filter(where (status='ativa' or(status='cancelada' and cancelar_ao_fim)) and fim_periodo>now()) as vigente
   from public.assinaturas where id_usuario=p_id),
 origens as (
   select i.confirmada_em,i.dias_padrinho as dias,'indicou'::text as tipo,
     coalesce(nullif(split_part(trim(u.raw_user_meta_data->>'nome'),' ',1),''),'Pessoa indicada') as nome
   from public.indicacoes i join auth.users u on u.id=i.id_convidado
   where i.id_padrinho=p_id and i.confirmada_em is not null and i.dias_padrinho>0
   union all
   select i.confirmada_em,i.dias_convidado,'foi_convidado',
     coalesce(nullif(split_part(trim(u.raw_user_meta_data->>'nome'),' ',1),''),'Pessoa que convidou')
   from public.indicacoes i join auth.users u on u.id=i.id_padrinho
   where i.id_convidado=p_id and i.confirmada_em is not null and i.dias_convidado>0
 )
 select jsonb_build_object('pago_ate',p.vigente,'ultimo_periodo_pago_ate',p.ultimo,
   'cortesia', (select jsonb_build_object('ate',c.ate,'sem_prazo',c.ate is null,
     'ativa',c.ate is null or c.ate>now(),'motivo',c.motivo,
     'por_indicacao',coalesce(c.motivo ilike 'Indicação:%',false),
     'origens',case when c.motivo ilike 'Indicação:%' then coalesce((
       select jsonb_agg(jsonb_build_object('nome',left(o.nome,60),'dias',o.dias,'tipo',o.tipo,'em',o.confirmada_em))
       from(select * from origens order by confirmada_em desc limit 12)o),'[]'::jsonb) else '[]'::jsonb end) from corte c))
 from pago p;
$$;
revoke all on function public.resumo_acesso_interno(uuid) from public,anon,authenticated;

create or replace function public.obter_resumo_acesso()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'autenticacao_necessaria'; end if;
 return public.resumo_acesso_interno(auth.uid()) #- '{cortesia,motivo}';
end $$;
revoke all on function public.obter_resumo_acesso() from public,anon,authenticated;
grant execute on function public.obter_resumo_acesso() to authenticated;

create or replace function public.listar_resumos_acesso_admin()
returns table(id_usuario uuid,resumo jsonb)
language plpgsql stable security definer set search_path='' as $$
begin
 perform public.exigir_administrador();
 return query select c.id_usuario,public.resumo_acesso_interno(c.id_usuario) from public.acessos_cortesia c;
end $$;
revoke all on function public.listar_resumos_acesso_admin() from public,anon,authenticated;
grant execute on function public.listar_resumos_acesso_admin() to authenticated;

-- Data que uma nova compra preserva: período pago e cortesia já existentes.
create or replace function public.inicio_proximo_periodo(p_usuario uuid,p_agora timestamptz default now())
returns timestamptz language sql stable security definer set search_path='' as $$
 select greatest(p_agora,
   (select max(a.fim_periodo) from public.assinaturas a where a.id_usuario=p_usuario
     and(a.status='ativa' or(a.status='cancelada' and a.cancelar_ao_fim)) and a.fim_periodo>p_agora),
   (select c.ate from public.acessos_cortesia c where c.id_usuario=p_usuario and c.ate>p_agora));
$$;
revoke all on function public.inicio_proximo_periodo(uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.inicio_proximo_periodo(uuid,timestamptz) to service_role;

-- Mantém a conciliação e a idempotência existentes. Só amplia a base de início do Pix.
do $$
declare d text; novo text;
begin
 d:=pg_get_functiondef('public.confirmar_pagamento_pix(uuid,text,text,timestamptz)'::regprocedure);
 novo:=regexp_replace(d,
   'select greatest\(p_aprovado_em, coalesce\(max\(a\.fim_periodo\), p_aprovado_em\)\) into v_inicio\s+from public\.assinaturas a\s+where a\.id_usuario=v\.id_usuario and a\.id_externo like ''pix:%'' and a\.id_externo <> ''pix:''\|\|v\.id\s+and a\.status=''ativa'' and a\.fim_periodo > p_aprovado_em;',
   'v_inicio := public.inicio_proximo_periodo(v.id_usuario,p_aprovado_em);');
 if novo=d then raise exception 'Trecho do início do Pix não encontrado; revisão necessária'; end if;
 novo:=replace(novo,'-- Trava as assinaturas da pessoa:',
   'perform pg_advisory_xact_lock(hashtextextended(''acesso:''||v.id_usuario::text,0));'||chr(10)||'    -- Trava as assinaturas da pessoa:');
 execute novo;
 d:=pg_get_functiondef('public.somar_dias_cortesia_interno(uuid,integer,text)'::regprocedure);
 novo:=replace(d,'if p_dias <= 0 then return; end if;',
   'perform pg_advisory_xact_lock(hashtextextended(''acesso:''||p_usuario::text,0));'||chr(10)||'  if p_dias <= 0 then return; end if;');
 if novo=d then raise exception 'Trecho da cortesia não encontrado; revisão necessária'; end if;
 execute novo;
end $$;
notify pgrst,'reload schema';
commit;
