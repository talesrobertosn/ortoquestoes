-- Nota de 1 a 10 para cada comentário (13/11/2026, pedido do Tales): troca o "Este comentário te ajudou?".
-- A tabela continua a mesma (uma linha por pessoa e questão). Entram a nota e a data da versão do comentário que
-- foi avaliada (para comparar antes e depois de uma reescrita). "util" continua preenchido (nota 6 ou mais), para os
-- contadores e e-mails que já o leem. Avaliações antigas, sem nota, contam como 8 (ajudou) e 3 (não ajudou).
begin;

alter table public.avaliacoes_comentario add column if not exists nota smallint check (nota is null or nota between 1 and 10);
alter table public.avaliacoes_comentario add column if not exists comentario_em text check (comentario_em is null or char_length(comentario_em) <= 32);

alter table public.avaliacoes_comentario drop constraint if exists avaliacoes_comentario_motivo_check;
alter table public.avaliacoes_comentario add constraint avaliacoes_comentario_motivo_check
  check (motivo is null or motivo in ('confuso', 'raso', 'errado', 'faltou_imagem', 'outro'));

-- A fila de mensagens do painel ganha a nota e a versão.
drop function if exists public.listar_avaliacoes_comentario_admin();
create function public.listar_avaliacoes_comentario_admin()
returns table (id_questao text, util boolean, motivo text, observacao text, atualizado_em timestamptz, usuario text, nota smallint, comentario_em text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.administradores adm where adm.id_usuario = auth.uid()) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  return query
    select a.id_questao, a.util, a.motivo, a.observacao, a.atualizado_em, u.email::text, a.nota, a.comentario_em
    from public.avaliacoes_comentario a
    left join auth.users u on u.id = a.usuario_id
    order by a.atualizado_em desc
    limit 500;
end;
$$;
revoke all on function public.listar_avaliacoes_comentario_admin() from public, anon, authenticated;
grant execute on function public.listar_avaliacoes_comentario_admin() to authenticated;

-- Resumo por questão, de todas as avaliações: média, extremos, espalhamento, mensagens, motivos e versões.
drop function if exists public.notas_comentarios_admin();
create function public.notas_comentarios_admin()
returns table (
  id_questao text, n integer, media numeric, minima integer, maxima integer, desvio numeric,
  mensagens integer, legado integer, ultima_em timestamptz, motivos jsonb, versoes jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.administradores adm where adm.id_usuario = auth.uid()) then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
  return query
    with base as (
      select a.id_questao, a.motivo, a.observacao, a.atualizado_em, a.comentario_em, a.nota,
             coalesce(a.nota, case when a.util then 8 else 3 end)::integer as v
      from public.avaliacoes_comentario a
    )
    select b.id_questao, count(*)::integer, round(avg(b.v), 2), min(b.v), max(b.v), round(coalesce(stddev_pop(b.v), 0), 2),
           (count(*) filter (where nullif(btrim(b.observacao), '') is not null))::integer,
           (count(*) filter (where b.nota is null))::integer,
           max(b.atualizado_em),
           coalesce((select jsonb_object_agg(m.motivo, m.c) from (
             select x.motivo, count(*) c from base x where x.id_questao = b.id_questao and x.motivo is not null group by x.motivo) m), '{}'::jsonb),
           coalesce((select jsonb_agg(jsonb_build_object('comentario_em', w.comentario_em, 'n', w.c, 'media', w.media) order by w.comentario_em nulls first) from (
             select x.comentario_em, count(*) c, round(avg(x.v), 2) media from base x where x.id_questao = b.id_questao group by x.comentario_em) w), '[]'::jsonb)
    from base b
    group by b.id_questao;
end;
$$;
revoke all on function public.notas_comentarios_admin() from public, anon, authenticated;
grant execute on function public.notas_comentarios_admin() to authenticated;

notify pgrst, 'reload schema';
commit;
