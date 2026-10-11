-- Parte 16: indicações no painel do administrador (quem indicou quem).
-- Rode depois das partes 1 a 15. Cole TUDO no SQL Editor do Supabase e clique em Run.
-- Aditiva: só cria uma função. Pode ser rodada de novo.
-- Indicações no painel do administrador (12/10/2026, pedido do dono).
--
-- listar_indicacoes_admin(): cada convite usado, com quem indicou e quem chegou
-- (nome e e-mail), quando, quantas questões o convidado já respondeu e se a
-- indicação já foi confirmada (20 questões) e quantos dias rendeu.
-- O resumo (resumo_indicacoes_admin) já existia desde a 202610040200.
--
-- Aditiva: só cria uma função. Pode ser rodada de novo.
begin;

create or replace function public.listar_indicacoes_admin()
returns table (
  id_convidado uuid, convidado text, email_convidado text,
  id_padrinho uuid, padrinho text, email_padrinho text,
  criado_em timestamptz, confirmada_em timestamptz, respondidas bigint,
  dias_padrinho integer, dias_convidado integer
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  perform public.exigir_administrador();
  return query
    select i.id_convidado,
           nullif(btrim(concat_ws(' ', c.raw_user_meta_data->>'nome', c.raw_user_meta_data->>'sobrenome')), ''),
           c.email::text,
           i.id_padrinho,
           nullif(btrim(concat_ws(' ', p.raw_user_meta_data->>'nome', p.raw_user_meta_data->>'sobrenome')), ''),
           p.email::text,
           i.criado_em, i.confirmada_em,
           public.respondidas_interno(i.id_convidado)::bigint,
           i.dias_padrinho, i.dias_convidado
    from public.indicacoes i
    join auth.users c on c.id = i.id_convidado
    join auth.users p on p.id = i.id_padrinho
    order by i.criado_em desc;
end $$;
revoke all on function public.listar_indicacoes_admin() from public, anon, authenticated;
grant execute on function public.listar_indicacoes_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
