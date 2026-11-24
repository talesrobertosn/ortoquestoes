-- Conta tentativas de hoje sem expandir o histórico em linhas SQL.
do $mudanca$
declare
  definicao text := replace(pg_get_functiondef('public.listar_usuarios_admin()'::regprocedure), E'\r\n', E'\n');
  antigo text := $antes$then (select count(*) from jsonb_array_elements(p.valor->'historico') h
                        where jsonb_typeof(h->'em') = 'number' and to_timestamp((h->>'em')::double precision / 1000) >= v_hoje)$antes$;
  novo text := $depois$then jsonb_array_length(jsonb_path_query_array(
                    p.valor->'historico', 'strict $[*] ? (@.em.type() == "number" && @.em >= $inicio)',
                    v_inicio_ms, true
                  ))$depois$;
  inicio text := E'\nbegin\n  perform public.exigir_administrador();';
begin
  if strpos(definicao, novo) > 0 then return; end if;
  if strpos(definicao, antigo) = 0 or strpos(definicao, inicio) = 0 then
    raise exception 'A consulta de usuários mudou. Revise a migração antes de aplicá-la.';
  end if;
  execute replace(replace(definicao, antigo, novo), inicio,
    E'\n  v_inicio_ms jsonb := jsonb_build_object(''inicio'', extract(epoch from v_hoje) * 1000);' || inicio);
end
$mudanca$;
