begin;

-- Reconhecer avisos não afirma que o conteúdo foi corrigido. Só as chaves novas
-- são devolvidas, para Desfazer preservar o que já estava lido anteriormente.
create or replace function public.ler_alertas_conteudo_admin()
returns table(tipo text, chave text)
language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
  with candidatos as (
    select 'relato'::text as tipo, r.id::text as chave
    from public.relatos_erro r where r.status='aberto'
    union all
    select 'avaliacao', a.id_questao||'|'||coalesce(u.email,'')||'|'||(to_jsonb(a.atualizado_em)#>>'{}')
    from public.avaliacoes_comentario a left join auth.users u on u.id=a.usuario_id
    where coalesce(a.nota,case when a.util then 10 else 0 end)<=5
  )
  insert into public.admin_lidos as l(tipo,chave,lido_por)
    select c.tipo,c.chave,auth.uid() from candidatos c
    where not exists(select 1 from public.admin_lidos lido where lido.tipo=c.tipo and lido.chave=c.chave)
    limit 500
    on conflict(tipo,chave) do nothing
    returning l.tipo,l.chave;
end $$;
revoke all on function public.ler_alertas_conteudo_admin() from public,anon,authenticated;
grant execute on function public.ler_alertas_conteudo_admin() to authenticated;

-- Fonte do hub, acessível apenas ao servidor. Uma tentativa recente por pessoa;
-- quem concluiu outro pagamento não recebe uma abordagem de cartão recusado.
create or replace function public.hub_cartoes_recusados(p_limite integer default 200)
returns table(id_usuario uuid,referencia text,dados jsonb)
language sql stable security definer set search_path='' as $$
  select distinct on(s.id_usuario) s.id_usuario,
    'cartao_recusado:'||s.id::text||':'||coalesce(s.falha_em,s.atualizada_em)::text,
    jsonb_build_object('falha_em',coalesce(s.falha_em,s.atualizada_em))
  from public.assinaturas s
  where s.status='falha_pagamento' and lower(s.provedor) not like '%pix%'
    and coalesce(s.falha_em,s.atualizada_em)>now()-interval '14 days'
    and not exists(select 1 from public.assinaturas a where a.id_usuario=s.id_usuario
      and (a.status='ativa' or (a.status='cancelada' and a.cancelar_ao_fim))
      and (a.fim_periodo is null or a.fim_periodo>now()))
  order by s.id_usuario,coalesce(s.falha_em,s.atualizada_em) desc
  limit least(greatest(coalesce(p_limite,200),1),200);
$$;
revoke all on function public.hub_cartoes_recusados(integer) from public,anon,authenticated;
grant execute on function public.hub_cartoes_recusados(integer) to service_role;

-- Ampliar a janela de seleção, preservando integralmente as regras de cada
-- campanha. A cadência, o consentimento e os limites por pessoa não mudam.
do $$
declare nome text; definicao text; ampliada text;
begin
  foreach nome in array array['aniversario','assinante_parado_7','depois_prova',
    'indicacao_deu_certo','resumo_do_tema','simulado_lembrete',
    'simulado_resultado','um_ano','vespera_prova'] loop
    select pg_get_functiondef(to_regprocedure('public.candidatos_'||nome||'(integer)')) into definicao;
    ampliada:=replace(definicao,'least(greatest(coalesce(p_limite, 40), 1), 80)',
      'least(greatest(coalesce(p_limite, 40), 1), 200)');
    if ampliada is null then raise exception 'campanha_ausente: %',nome; end if;
    execute ampliada;
  end loop;
end $$;

notify pgrst,'reload schema';
commit;
