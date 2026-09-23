-- Ajuste da 202609231200: em vez de só a primeira palavra, o ranking mostra
-- o nome completo do cadastro + a inicial do sobrenome ("Ana Paula S.").
-- Continua sem apelido livre: o banco recalcula o nome a partir do perfil.
begin;

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

-- Recalcula os nomes já gravados, sem mexer em atualizado_em (desempate).
alter table public.perfis_publicos disable trigger perfis_publicos_atualizado_em;
update public.perfis_publicos set apelido = apelido;
alter table public.perfis_publicos enable trigger perfis_publicos_atualizado_em;

commit;
