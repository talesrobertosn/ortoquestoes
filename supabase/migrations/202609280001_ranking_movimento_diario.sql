-- Referência diária do ranking no servidor. O UUID nunca sai da RPC pública.
-- A comparação usa o registro mais recente de um dia anterior, não o navegador.
begin;

create table public.ranking_posicoes_diarias (
  dia date not null,
  periodo text not null check (periodo in ('geral', 'semana')),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  posicao bigint not null check (posicao > 0),
  registrada_em timestamptz not null default now(),
  primary key (dia, periodo, usuario_id)
);

create index ranking_posicoes_diarias_anterior
  on public.ranking_posicoes_diarias (periodo, usuario_id, dia desc);

alter table public.ranking_posicoes_diarias enable row level security;
revoke all on public.ranking_posicoes_diarias from public, anon, authenticated;

-- Mesmas regras do ranking atual: resposta distinta, reinícios, opt-out,
-- ocultações e desempate pela data de criação da conta.
create function public.calcular_ranking_interno(periodo text)
returns table(usuario_id uuid, posicao bigint, apelido text, total bigint, total_geral bigint)
language sql stable security definer set search_path = '' as $$
  with epocas as (
    select p.usuario_id, max(p.versao) as epoca
    from public.progresso_usuario p
    where p.tipo = 'historico' and (p.item = '__reinicio__' or p.item like 'reinicio.v2.%')
    group by p.usuario_id
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
    select r.usuario_id, count(*) as total_geral
    from respostas_validas r
    group by r.usuario_id
    having count(*) >= 5
  ),
  contagem_periodo as (
    select r.usuario_id, count(*) as total
    from respostas_validas r
    where periodo <> 'semana' or r.atualizado_em >= now() - interval '7 days'
    group by r.usuario_id
  )
  select cp.usuario_id,
         row_number() over (order by cp.total desc, u.created_at asc) as posicao,
         coalesce(pp.apelido, public.nome_publico_ranking(u.raw_user_meta_data)) as apelido,
         cp.total, cg.total_geral
  from contagem_periodo cp
  join contagem_geral cg on cg.usuario_id = cp.usuario_id
  join auth.users u on u.id = cp.usuario_id
  left join public.perfis_publicos pp on pp.usuario_id = cp.usuario_id
  where coalesce(pp.participa_ranking, true)
    and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = cp.usuario_id);
$$;
revoke all on function public.calcular_ranking_interno(text) from public, anon, authenticated;

create function public.obter_ranking_com_movimento(periodo text default 'geral')
returns table(
  posicao bigint, apelido text, total bigint, total_geral bigint,
  eh_voce boolean, variacao bigint, referencia_em date
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if auth.uid() is null then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  if periodo is null or periodo not in ('geral', 'semana') then
    raise exception 'periodo_invalido' using errcode = '22023';
  end if;

  return query
    select r.posicao, r.apelido, r.total, r.total_geral,
           r.usuario_id = auth.uid() as eh_voce,
           case when anterior.posicao is null then null
                else anterior.posicao - r.posicao end as variacao,
           anterior.dia as referencia_em
    from public.calcular_ranking_interno(periodo) r
    left join lateral (
      select h.posicao, h.dia
      from public.ranking_posicoes_diarias h
      where h.usuario_id = r.usuario_id and h.periodo = obter_ranking_com_movimento.periodo
        and h.dia < hoje
      order by h.dia desc
      limit 1
    ) anterior on true
    order by r.posicao
    limit 50;

  -- Atualiza a posição de hoje para todos os participantes, inclusive quem
  -- está fora do top 50. Sem agendador externo nem identificação no cliente.
  insert into public.ranking_posicoes_diarias (dia, periodo, usuario_id, posicao, registrada_em)
  select hoje, obter_ranking_com_movimento.periodo, r.usuario_id, r.posicao, now()
  from public.calcular_ranking_interno(periodo) r
  -- Pelo nome da restrição: "periodo" e "posicao" também são nomes da função.
  on conflict on constraint ranking_posicoes_diarias_pkey do update
    set posicao = excluded.posicao, registrada_em = excluded.registrada_em;
end;
$$;

revoke all on function public.obter_ranking_com_movimento(text) from public, anon, authenticated;
grant execute on function public.obter_ranking_com_movimento(text) to authenticated;

notify pgrst, 'reload schema';
commit;
