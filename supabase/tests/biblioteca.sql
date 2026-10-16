-- Teste da parte 29 (Biblioteca). Rodar num banco com as migrações aplicadas e o schema auth do
-- Supabase (ou o stub usado em docs/biblioteca/README.md). Tudo dentro de uma transação desfeita.
begin;
insert into auth.users(id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b') on conflict do nothing;
set local role authenticated;

-- A grava uma marcação.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);
select tipo, item, versao from public.sincronizar_progresso('[{"tipo":"biblioteca","item":"m.t1","valor":{"tipo":"marca","id":"t1","capitulo":"c","ancora":{"trechos":[]},"cor":"amarelo","nota":"segredo de A","criadaEm":1,"editadaEm":1},"base":0,"operacao":"11111111-1111-1111-1111-111111111111"}]'::jsonb);
do $$ begin
  assert (select count(*) = 1 from public.progresso_usuario where tipo = 'biblioteca'), 'A deveria ver a própria marcação';
end $$;

-- Formato inválido é recusado (marcação sem âncora).
do $$ begin
  begin
    perform public.sincronizar_progresso('[{"tipo":"biblioteca","item":"m.t2","valor":{"tipo":"marca","capitulo":"c"},"base":0,"operacao":"22222222-2222-2222-2222-222222222222"}]'::jsonb);
    assert false, 'marcação sem âncora deveria ser recusada';
  exception when check_violation then null;
  end;
end $$;

-- B não lê, não altera e não apaga a linha de A, nem manipulando o item.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', true);
do $$ begin
  assert (select count(*) = 0 from public.progresso_usuario where tipo = 'biblioteca'), 'B não pode ver marcações de A';
  -- Escrita direta: ou o banco nega (sem permissão de update) ou a policy não deixa achar a linha.
  begin
    update public.progresso_usuario set valor = '{"tipo":"pref"}'::jsonb where tipo = 'biblioteca' and item = 'm.t1';
    assert not found, 'B não pode alterar marcações de A';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) = 0 from public.ler_progresso_desde(0, 500) where tipo = 'biblioteca'), 'leitura incremental de B não pode trazer A';
end $$;
-- O mesmo item gravado por B cria uma linha de B, sem tocar na de A.
select tipo, item from public.sincronizar_progresso('[{"tipo":"biblioteca","item":"m.t1","valor":{"tipo":"marca","id":"t1","capitulo":"c","ancora":{"trechos":[]},"cor":"azul","nota":"de B","criadaEm":2,"editadaEm":2},"base":0,"operacao":"33333333-3333-3333-3333-333333333333"}]'::jsonb);
reset role;
do $$ begin
  assert (select valor->>'nota' from public.progresso_usuario where usuario_id = '00000000-0000-0000-0000-00000000000a' and item = 'm.t1') = 'segredo de A', 'a nota de A não pode mudar';
  assert (select count(*) = 2 from public.progresso_usuario where tipo = 'biblioteca'), 'uma linha por conta';
end $$;
select 'biblioteca.sql: OK' as resultado;
rollback;
