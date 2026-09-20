begin;
-- Teste de implantação seguro: a migration deve nascer desligada.
do $$ begin
  assert (select paywall_ativo=false and pagamentos_ativos=false and limite_diario_gratis=20 from public.configuracao_comercial where id=true), 'configuração inicial insegura';
  assert (select relrowsecurity from pg_class where oid='public.assinaturas'::regclass), 'RLS ausente em assinaturas';
  assert (select relrowsecurity from pg_class where oid='public.consumo_diario'::regclass), 'RLS ausente em consumo';
  assert (select count(*)=1 from pg_proc where proname='autorizar_resposta'), 'RPC ausente';
end $$;
rollback;
