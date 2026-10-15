-- Cronograma igual em todos os aparelhos (auditoria de 15/10/2026).
-- 1. ajustar_opcoes_plano(p_patch): grava só as chaves de opções que mudaram
--    (adiantados, semanasDificeis...), sem reenviar data, intensidade, folgas e base.
--    Dois aparelhos ajustando ao mesmo tempo não desfazem mais o ajuste um do outro.
-- 2. progresso_usuario passa a aceitar escrita só pela função sincronizar_progresso,
--    que confere a versão. A gravação direta (insert/update pela API) pulava essa
--    conferência e podia apagar o que outro aparelho tinha salvo.
-- Roda depois da 202610141300 (parte 20). Não altera dados.
begin;

drop function if exists public.ajustar_opcoes_plano(jsonb);
create function public.ajustar_opcoes_plano(p_patch jsonb)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare
  v_novas jsonb;
begin
  perform public.exigir_premium();
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'opcoes_invalidas' using errcode = '22023';
  end if;
  select p.opcoes || p_patch into v_novas from public.planos_estudo p where p.usuario_id = auth.uid() for update;
  if not found then raise exception 'plano_inexistente' using errcode = 'P0002'; end if;
  if pg_column_size(v_novas) > 4000 then raise exception 'opcoes_invalidas' using errcode = '22023'; end if;
  update public.planos_estudo set opcoes = v_novas, atualizado_em = now() where usuario_id = auth.uid();
  return true;
end $$;
revoke all on function public.ajustar_opcoes_plano(jsonb) from public, anon, authenticated;
grant execute on function public.ajustar_opcoes_plano(jsonb) to authenticated;

drop policy if exists "Cada pessoa insere apenas seu progresso" on public.progresso_usuario;
drop policy if exists "Cada pessoa altera apenas seu progresso" on public.progresso_usuario;
revoke insert, update, delete on public.progresso_usuario from anon, authenticated;

notify pgrst, 'reload schema';
commit;
