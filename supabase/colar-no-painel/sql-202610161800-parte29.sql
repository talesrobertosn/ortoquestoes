-- Biblioteca de resumos (16/10/2026). Parte 29: colar no SQL Editor do Supabase. Roda depois da parte 28.
--
-- Marcações, notas, posição de leitura e preferências dos resumos (#/resumos) passam a ser
-- sincronizadas pela mesma tabela das respostas (progresso_usuario), com um tipo novo:
-- 'biblioteca'. Cada marcação é uma linha (item "m.<id>"), cada capítulo lido é outra
-- ("l.<capítulo>") e as preferências de leitura uma terceira ("pref"). Assim valem a mesma
-- versão por linha, a trava otimista (sincronizar_progresso confere a base) e as mesmas
-- policies: cada conta só lê e grava as próprias linhas (usuario_id = auth.uid()).
--
-- O que muda:
-- 1. o check de `tipo` aceita 'biblioteca';
-- 2. o check `forma_documento` aceita, para 'biblioteca', um objeto com `tipo` em
--    ('marca','leitura','pref') e nota de até 20.000 caracteres (o tamanho total continua
--    limitado a 128 kB por linha pelo check `tamanho_documento`).
-- Nenhuma função, policy ou dado existente muda. Não apaga nada. Pode rodar de novo.
begin;

-- O check de tipo nasceu sem nome explícito: remove qualquer check de tipo antigo, seja qual for o nome.
do $$
declare r record;
begin
  for r in select conname from pg_constraint
    where conrelid = 'public.progresso_usuario'::regclass and contype = 'c'
      and conname not in ('forma_documento', 'tamanho_documento')
      and pg_get_constraintdef(oid) ilike '%tipo%respondidas%'
  loop
    execute format('alter table public.progresso_usuario drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.progresso_usuario add constraint progresso_usuario_tipo_check
  check (tipo in ('respondidas', 'favoritos', 'notas', 'historico', 'biblioteca'));

alter table public.progresso_usuario drop constraint if exists forma_documento;
alter table public.progresso_usuario add constraint forma_documento check (
  valor = 'null'::jsonb or
  (tipo = 'notas' and jsonb_typeof(valor) = 'string' and length(valor #>> '{}') <= 20000) or
  (tipo = 'favoritos' and valor = 'true'::jsonb) or
  (tipo = 'respondidas' and jsonb_typeof(valor) = 'object'
    and valor ?& array['c','q'] and valor->'c' in ('true'::jsonb, 'false'::jsonb, 'null'::jsonb)
    and jsonb_typeof(valor->'q') = 'number') or
  (tipo = 'historico' and jsonb_typeof(valor) = 'object' and valor ?& array['id','descricao','concluidaEm']
    and jsonb_typeof(valor->'id') = 'string' and jsonb_typeof(valor->'descricao') = 'string'
    and jsonb_typeof(valor->'concluidaEm') = 'number') or
  -- Em check, NULL conta como aprovado: cada condição da biblioteca vem com coalesce(..., false).
  (tipo = 'biblioteca' and jsonb_typeof(valor) = 'object'
    and coalesce(valor->>'tipo' in ('marca', 'leitura', 'pref'), false)
    and (coalesce(valor->>'tipo' <> 'marca', false) or (
      coalesce(jsonb_typeof(valor->'ancora') = 'object', false)
      and coalesce(jsonb_typeof(valor->'capitulo') = 'string', false)
      and coalesce(length(valor->>'nota'), 0) <= 20000)))
);

commit;
