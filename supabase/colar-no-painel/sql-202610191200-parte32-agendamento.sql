-- Parte 32, agendamento (19/10/2026): a entrega automática do Simulado Nacional.
-- Cole no SQL Editor DEPOIS da parte 32. Não está em supabase/migrations porque precisa do pg_cron
-- ligado no projeto. Pode rodar de novo: cron.schedule com o mesmo nome substitui o agendamento.
--
-- Antes: em Database › Extensions, ligue pg_cron (ou use Integrations › Cron, que faz o mesmo pela
-- tela: um job "SQL snippet" com o comando abaixo, de 10 em 10 minutos).
--
-- O que agenda: de 10 em 10 minutos, public.sn_entregar_vencidas(). Ela entrega, com o que foi salvo,
-- toda prova que passou do prazo + 5 minutos sem ser entregue (a aba fechou, a bateria acabou).
-- A entrega fica com entrega_automatica = true e fora do prazo (não entra no ranking), mas a pessoa
-- vê o resultado e a correção. Não chama nada fora do banco: não precisa de URL nem de segredo.

select cron.schedule(
  'simulado-nacional-entregar-vencidas',
  '*/10 * * * *',
  $agendamento$ select public.sn_entregar_vencidas(); $agendamento$
);

-- Para conferir:   select jobid, jobname, schedule, active from cron.job;
-- Últimas rodadas: select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
-- Para rodar agora: select public.sn_entregar_vencidas();   (devolve quantas provas entregou)
-- Para desligar:   select cron.unschedule('simulado-nacional-entregar-vencidas');
