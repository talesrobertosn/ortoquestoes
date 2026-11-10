-- Os amigos que entraram pelo meu link (página Indicar, 09/11/2026, pedido do Tales): o primeiro nome de cada um
-- (como a página do convite já mostra o de quem convidou), quando entrou, quantas das 20 questões já respondeu e se
-- confirmou, com os dias que a confirmação deu a quem indicou. Mais recentes primeiro. Só leitura; pode rodar de novo.
begin;

create or replace function public.meus_amigos_indicados()
returns table (nome text, entrou_em timestamptz, respondidas integer, confirmada_em timestamptz, dias integer)
language plpgsql stable security definer set search_path = '' as $$
declare v_usuario uuid := auth.uid();
begin
  if v_usuario is null then raise exception 'autenticacao_necessaria' using errcode = '42501'; end if;
  return query
  select coalesce(nullif(split_part(btrim(coalesce(u.raw_user_meta_data->>'nome', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')), ' ', 1), ''), 'Um colega'),
         i.criado_em,
         least(20, public.respondidas_interno(i.id_convidado))::integer,
         i.confirmada_em,
         i.dias_padrinho
  from public.indicacoes i
  join auth.users u on u.id = i.id_convidado
  where i.id_padrinho = v_usuario
  order by i.criado_em desc
  limit 50;
end $$;
revoke all on function public.meus_amigos_indicados() from public, anon, authenticated;
grant execute on function public.meus_amigos_indicados() to authenticated;

commit;
