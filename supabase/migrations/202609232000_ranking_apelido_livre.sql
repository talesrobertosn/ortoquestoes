-- Ranking: apelido livre de novo, com participação padrão e saída opcional.
--
-- * Toda conta com 5+ questões respondidas aparece no ranking por padrão.
-- * Cada pessoa pode escolher um apelido (perfis_publicos.apelido). Sem
--   apelido (null), aparece o nome do cadastro + inicial do sobrenome,
--   calculado por public.nome_publico_ranking(), como antes.
-- * Cada pessoa pode sair do ranking (perfis_publicos.participa_ranking =
--   false) e voltar quando quiser.
-- * O banco limpa o apelido e recusa palavrões e ofensas comuns (filtro
--   básico). O responsável continua podendo ocultar alguém pelo SQL Editor:
--     insert into public.ranking_ocultos (usuario_id, motivo)
--     select id, 'apelido ofensivo' from auth.users where email = 'pessoa@exemplo.com';
--   ou apagar só o apelido (a pessoa volta a aparecer com o nome do cadastro):
--     update public.perfis_publicos set apelido = null
--     where usuario_id = (select id from auth.users where email = 'pessoa@exemplo.com');
begin;

-- 1. Fim do nome forçado (202609231200).
drop trigger if exists perfis_publicos_apelido on public.perfis_publicos;
drop trigger if exists ranking_nome_do_perfil on auth.users;
drop function if exists public.definir_apelido_ranking();
drop function if exists public.sincronizar_apelido_ranking();

-- 2. Apelido opcional e participação padrão.
alter table public.perfis_publicos alter column apelido drop not null;
alter table public.perfis_publicos drop constraint if exists tamanho_apelido;
alter table public.perfis_publicos add constraint tamanho_apelido
  check (apelido is null or char_length(apelido) between 2 and 30);
alter table public.perfis_publicos alter column participa_ranking set default true;

-- As linhas atuais guardam o nome calculado (não um apelido escolhido) e a
-- escolha antiga de participar, anterior ao ranking obrigatório: todos
-- voltam ao padrão (nome do cadastro, participando). Sem mexer em
-- atualizado_em.
alter table public.perfis_publicos disable trigger perfis_publicos_atualizado_em;
update public.perfis_publicos set apelido = null, participa_ranking = true;
alter table public.perfis_publicos enable trigger perfis_publicos_atualizado_em;

-- 3. Limpeza e filtro do apelido.
create or replace function public.apelido_ofensivo(texto text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  base text := translate(lower(coalesce(texto, '')),
    'áàâãäéèêëíìîïóòôõöúùûüç0134578@$',
    'aaaaaeeeeiiiiooooouuuucoieastbas');
  palavras text := ' ' || btrim(regexp_replace(base, '[^a-z]+', ' ', 'g')) || ' ';
  junto text := regexp_replace(base, '[^a-z]', '', 'g');
begin
  -- Radicais que não aparecem dentro de nomes comuns: vale mesmo colado.
  if junto ~ '(caralh|bucet|arromb|vagabund|punhet|boquet|xoxot|xerec|estupr|cuzao|vtnc|hitler|nazist|retardad|desgracad|filhodaput|fdp|pqp|viadinh|viadao)' then
    return true;
  end if;
  -- Palavras que só ofendem sozinhas (evita barrar "aviador", "deputado", "Pinto").
  return palavras ~ ' (viado|viados|puta|putas|putinha|porra|merda|bosta|foda|fodase|fodido|fodida|corno|corna|piranha|macaco|macaca|nazi|otario|otaria|idiota|imbecil|traveco|sapatao|safado|safada|cacete|bicha|bichona|vadia|prostituta|cu|cuzinho) ';
end;
$$;
revoke all on function public.apelido_ofensivo(text) from public, anon, authenticated;

-- security definer: chama apelido_ofensivo(), que não tem grant para authenticated.
create or replace function public.normalizar_apelido_ranking()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.apelido is null then return new; end if;
  new.apelido := btrim(regexp_replace(new.apelido, '\s+', ' ', 'g'));
  if new.apelido = '' then new.apelido := null; return new; end if;
  if new.apelido ~ '[[:cntrl:]<>]' then
    raise exception 'apelido_invalido' using errcode = '22023', hint = 'Use letras, números e espaços.';
  end if;
  if char_length(new.apelido) < 2 or char_length(new.apelido) > 30 then
    raise exception 'apelido_tamanho' using errcode = '22023', hint = 'O apelido deve ter de 2 a 30 caracteres.';
  end if;
  if public.apelido_ofensivo(new.apelido) then
    raise exception 'apelido_nao_permitido' using errcode = '22023', hint = 'Escolha outro apelido.';
  end if;
  return new;
end;
$$;
revoke all on function public.normalizar_apelido_ranking() from public, anon, authenticated;
drop trigger if exists perfis_publicos_normaliza_apelido on public.perfis_publicos;
create trigger perfis_publicos_normaliza_apelido
  before insert or update of apelido on public.perfis_publicos
  for each row execute function public.normalizar_apelido_ranking();

-- 4. Ranking com apelido (ou nome do cadastro), padrão participando.
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
    select coalesce(pp.apelido, public.nome_publico_ranking(u.raw_user_meta_data)) as apelido,
           cp.total, cg.total_geral, cp.usuario_id,
           row_number() over (order by cp.total desc, u.created_at asc) as posicao
    from contagem_periodo cp
    join contagem_geral cg on cg.usuario_id = cp.usuario_id
    join auth.users u on u.id = cp.usuario_id
    left join public.perfis_publicos pp on pp.usuario_id = cp.usuario_id
    where coalesce(pp.participa_ranking, true)
      and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = cp.usuario_id)
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
    left join public.perfis_publicos pp on pp.usuario_id = cp.usuario_id
    where coalesce(pp.participa_ranking, true)
      and not exists (select 1 from public.ranking_ocultos o where o.usuario_id = cp.usuario_id)
  )
  select posicao, total, total_geral from ranking where usuario_id = auth.uid();
$$;

notify pgrst, 'reload schema';
commit;
