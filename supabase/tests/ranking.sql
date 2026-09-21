begin;
-- Teste de implantação seguro: RLS ligado e nada aberto para o público em geral.
do $$ begin
  assert (select relrowsecurity from pg_class where oid='public.perfis_publicos'::regclass), 'RLS ausente em perfis_publicos';
  assert (select count(*)=1 from pg_proc where proname='obter_ranking_publico'), 'RPC obter_ranking_publico ausente';
  assert (select count(*)=1 from pg_proc where proname='minha_posicao_ranking'), 'RPC minha_posicao_ranking ausente';
  assert (select prosecdef from pg_proc where proname='obter_ranking_publico'), 'obter_ranking_publico deveria ser security definer';
  assert (select prosecdef from pg_proc where proname='minha_posicao_ranking'), 'minha_posicao_ranking deveria ser security definer';
  assert not (select has_table_privilege('anon', 'public.perfis_publicos', 'select')), 'anon não deveria ler perfis_publicos direto';
  assert not (select has_function_privilege('anon', 'public.obter_ranking_publico()', 'execute')), 'anon não deveria chamar o ranking';
end $$;
rollback;
