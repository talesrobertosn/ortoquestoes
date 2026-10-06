-- Parte 10: conserta o recálculo de "como a turma respondeu" e mostra um diagnóstico.
-- Rode depois das partes 1 a 9. Cole TUDO no SQL Editor do Supabase e clique em Run.
-- O resultado é uma linha com os números da turma (explicação no fim do arquivo).
create temp table if not exists _turma_antes as select e.atualizado_em from public.turma_estado e where e.id;

-- Como a turma respondeu: o recálculo apagava a tabela com "delete" sem where,
-- que o Supabase pode recusar nas chamadas vindas do site (extensão safeupdate).
-- Nesse caso o recálculo falhava sempre e os filtros "As que a turma mais erra"
-- e "A turma acerta, você errou" ficavam sem dados. Mesma função, com "where true".
-- Roda depois da 202610070300. Não altera dados de usuários.
begin;

create or replace function public.atualizar_turma_interno(p_forcar boolean default false)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if not p_forcar and (select e.atualizado_em from public.turma_estado e where e.id) > now() - interval '20 minutes' then return; end if;
  -- Quem chega enquanto outro recalcula usa o agregado anterior.
  if not pg_catalog.pg_try_advisory_xact_lock(hashtext('turma_estatisticas')) then return; end if;
  -- "where true": o Supabase pode recusar delete sem where vindo do site (safeupdate).
  delete from public.turma_estatisticas where true;
  insert into public.turma_estatisticas (id_questao, respondentes, acertos, com_letra, letras)
  with epocas as (
    select p.usuario_id, max(p.versao) as epoca
    from public.progresso_usuario p
    where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
    group by p.usuario_id
  ),
  base as (
    select regexp_replace(p.item, '^r[0-9]+:', '') as id_questao,
           coalesce(p.valor->'historico'->0->>'correta', p.valor->>'c') as primeira,
           coalesce(nullif(p.valor->>'p', ''),
                    case when coalesce((p.valor->>'tentativas')::int, 1) = 1 then nullif(p.valor->>'m', '') end) as letra
    from public.progresso_usuario p
    left join epocas e on e.usuario_id = p.usuario_id
    where p.tipo = 'respondidas' and p.valor <> 'null'::jsonb
      and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
  ),
  validas as (select * from base where primeira in ('true', 'false')),
  letras as (
    select v.id_questao, jsonb_object_agg(v.letra, v.n) as letras, sum(v.n)::int as com_letra
    from (select id_questao, letra, count(*) as n from validas where letra ~ '^[A-E]$' group by id_questao, letra) v
    group by v.id_questao
  )
  select v.id_questao, count(*)::int, count(*) filter (where v.primeira = 'true')::int,
         coalesce(max(l.com_letra), 0), coalesce((array_agg(l.letras))[1], '{}'::jsonb)
  from validas v left join letras l on l.id_questao = v.id_questao
  group by v.id_questao;
  update public.turma_estado set atualizado_em = now() where id;
end $$;
revoke all on function public.atualizar_turma_interno(boolean) from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;

-- Recalcula agora e mostra o diagnóstico.
select public.atualizar_turma_interno(true);
select (select a.atualizado_em from _turma_antes a limit 1) as ultimo_calculo_antes,
       (select e.atualizado_em from public.turma_estado e where e.id) as calculado_agora,
       count(*) as questoes_com_resposta,
       count(*) filter (where t.respondentes >= 3) as questoes_com_3_ou_mais,
       count(*) filter (where t.respondentes >= 3 and t.acertos * 100 < t.respondentes * 50) as turma_mais_erra,
       count(*) filter (where t.respondentes >= 3 and t.acertos * 100 >= t.respondentes * 80) as turma_acerta
from public.turma_estatisticas t;
-- ultimo_calculo_antes em 1970 = o recálculo nunca tinha funcionado (era o bug).
-- questoes_com_3_ou_mais baixo = falta gente respondendo as mesmas questões (amostra).
