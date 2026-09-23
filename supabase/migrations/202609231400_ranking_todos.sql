-- O ranking deixa de ser opcional (por enquanto): entram todas as contas com
-- pelo menos 5 questões respondidas na época atual (ver 202609221800 sobre
-- "zerar progresso"). O nome exibido vem sempre do cadastro, pelo mesmo
-- public.nome_publico_ranking() — nome completo + inicial do sobrenome —,
-- redefinido aqui para que esta migração funcione sozinha.
-- perfis_publicos continua existindo, mas não é mais consultada pelo ranking.
--
-- Quem pedir para sair (Termos, item 14.7) ou usar nome ofensivo é ocultado
-- pelo responsável, no SQL Editor:
--   insert into public.ranking_ocultos (usuario_id, motivo)
--   select id, 'pediu para sair' from auth.users where email = 'pessoa@exemplo.com';
begin;

-- Sem grants: só o responsável (SQL Editor) lê e escreve.
create table if not exists public.ranking_ocultos (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  motivo text,
  criado_em timestamptz not null default now()
);
alter table public.ranking_ocultos enable row level security;
revoke all on public.ranking_ocultos from anon, authenticated;

create or replace function public.nome_publico_ranking(meta jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare
  nome text := btrim(left(btrim(regexp_replace(regexp_replace(coalesce(meta->>'nome', ''), '[^[:alpha:]À-ÿ'' -]', '', 'g'), '\s+', ' ', 'g')), 30));
  sobrenome text := regexp_replace(btrim(coalesce(meta->>'sobrenome', '')), '[^[:alpha:]À-ÿ]', '', 'g');
  resultado text;
begin
  resultado := btrim(initcap(nome) || case when sobrenome <> '' then ' ' || upper(left(sobrenome, 1)) || '.' else '' end);
  if char_length(resultado) < 2 then return 'Participante'; end if;
  return resultado;
end;
$$;
revoke all on function public.nome_publico_ranking(jsonb) from public, anon, authenticated;

create or replace function public.obter_ranking_publico(periodo text default 'geral')
returns table(posicao bigint, apelido text, total bigint, total_geral bigint, eh_voce boolean)
language sql security definer set search_path = '' stable as $$
  with epocas as (
    select usuario_id, max(versao) as epoca
    from public.progresso_usuario
    where tipo = 'historico' and (item = '__reinicio__' or item like 'reinicio.v2.%')
    group by usuario_id
  ),
  respostas_validas as (
    select p.usuario_id, p.atualizado_em
    from public.progresso_usuario p
    left join epocas e on e.usuario_id = p.usuario_id
    where p.tipo = 'respondidas'
      and p.valor <> 'null'::jsonb
      and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
  ),
  contagem_geral as (
    select usuario_id, count(*) as total_geral
    from respostas_validas
    group by usuario_id
    having count(*) >= 5
  ),
  contagem_periodo as (
    select usuario_id, count(*) as total
    from respostas_validas
    where periodo <> 'semana' or atualizado_em >= now() - interval '7 days'
    group by usuario_id
  ),
  ranking as (
    select public.nome_publico_ranking(u.raw_user_meta_data) as apelido, cp.total, cg.total_geral, cp.usuario_id,
           row_number() over (order by cp.total desc, u.created_at asc) as posicao
    from contagem_periodo cp
    join contagem_geral cg on cg.usuario_id = cp.usuario_id
    join auth.users u on u.id = cp.usuario_id
    where not exists (select 1 from public.ranking_ocultos o where o.usuario_id = cp.usuario_id)
  )
  select posicao, apelido, total, total_geral, usuario_id = auth.uid() as eh_voce
  from ranking
  order by posicao
  limit 50;
$$;

create or replace function public.minha_posicao_ranking(periodo text default 'geral')
returns table(posicao bigint, total bigint, total_geral bigint)
language sql security definer set search_path = '' stable as $$
  with epocas as (
    select usuario_id, max(versao) as epoca
    from public.progresso_usuario
    where tipo = 'historico' and (item = '__reinicio__' or item like 'reinicio.v2.%')
    group by usuario_id
  ),
  respostas_validas as (
    select p.usuario_id, p.atualizado_em
    from public.progresso_usuario p
    left join epocas e on e.usuario_id = p.usuario_id
    where p.tipo = 'respondidas'
      and p.valor <> 'null'::jsonb
      and (coalesce(e.epoca, 0) = 0 or p.item like ('r' || e.epoca || ':%'))
  ),
  contagem_geral as (
    select usuario_id, count(*) as total_geral
    from respostas_validas
    group by usuario_id
    having count(*) >= 5
  ),
  contagem_periodo as (
    select usuario_id, count(*) as total
    from respostas_validas
    where periodo <> 'semana' or atualizado_em >= now() - interval '7 days'
    group by usuario_id
  ),
  ranking as (
    select cp.usuario_id, cp.total, cg.total_geral,
           row_number() over (order by cp.total desc, u.created_at asc) as posicao
    from contagem_periodo cp
    join contagem_geral cg on cg.usuario_id = cp.usuario_id
    join auth.users u on u.id = cp.usuario_id
    where not exists (select 1 from public.ranking_ocultos o where o.usuario_id = cp.usuario_id)
  )
  select posicao, total, total_geral from ranking where usuario_id = auth.uid();
$$;

notify pgrst, 'reload schema';
commit;
