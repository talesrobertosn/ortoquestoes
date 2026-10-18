-- Parte 31, opcional (18/10/2026): o agendamento diário das campanhas de e-mail.
-- NÃO roda sozinho e não está em supabase/migrations: precisa da URL do projeto e de dois segredos,
-- que não podem ficar no repositório. Cole no SQL Editor DEPOIS da parte 31, trocando os três
-- marcadores <...>. Pode rodar de novo: cron.schedule com o mesmo nome substitui o agendamento.
--
-- Antes: em Database › Extensions, ligue pg_cron e pg_net (ou use Integrations › Cron, que faz o
-- mesmo pela tela: chamada HTTP POST para a função enviar-email, com os mesmos cabeçalhos e corpo).
--
-- O que agenda: todo dia às 7h de Brasília (10h UTC; Brasília não tem horário de verão desde 2019),
-- uma chamada à função enviar-email com {"acao": "campanhas_diarias"}. A função lê as candidatas de
-- cada uma das nove campanhas (candidatos_<tipo>, até 20 por campanha) e manda pelo caminho dos
-- automáticos: confere de novo, pessoa por pessoa, quem desligou os e-mails, o e-mail confirmado, a
-- referência já enviada e o teto de cadência. Quem ficou de fora pela cadência volta no dia seguinte.
--
-- Marcadores:
--   <PROJETO>        o id do projeto (a parte antes de .supabase.co na URL do projeto)
--   <ANON_KEY>       a chave anon (Project Settings › API), para passar pelo gateway das Functions
--   <EMAIL_SEGREDO>  o MESMO valor do segredo EMAIL_SEGREDO das Edge Functions
-- Se preferir não deixar o segredo escrito no comando, guarde-o no Vault (Project Settings › Vault,
-- nome "email_segredo") e troque a linha do x-segredo pela versão comentada logo abaixo dela.

select cron.schedule(
  'emails-campanhas-diarias',
  '0 10 * * *',
  $agendamento$
  select net.http_post(
    url := 'https://<PROJETO>.supabase.co/functions/v1/enviar-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-segredo', '<EMAIL_SEGREDO>'
      -- 'x-segredo', (select decrypted_secret from vault.decrypted_secrets where name = 'email_segredo')
    ),
    body := jsonb_build_object('acao', 'campanhas_diarias', 'limite', 20),
    timeout_milliseconds := 140000
  );
  $agendamento$
);

-- Opcional: uma segunda rodada às 12h de Brasília (15h UTC), para quem ficou para depois pelo limite
-- do lote. Não manda nada em dobro (cada carta tem referência única). Tire os dois traços para usar.
-- select cron.schedule('emails-campanhas-meio-dia', '0 15 * * *', $agendamento$
--   select net.http_post(
--     url := 'https://<PROJETO>.supabase.co/functions/v1/enviar-email',
--     headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer <ANON_KEY>', 'x-segredo', '<EMAIL_SEGREDO>'),
--     body := jsonb_build_object('acao', 'campanhas_diarias', 'limite', 20),
--     timeout_milliseconds := 140000);
--   $agendamento$);

-- Para conferir:   select jobid, jobname, schedule, active from cron.job;
-- Últimas rodadas: select status, return_message, start_time from cron.job_run_details order by start_time desc limit 10;
-- Respostas HTTP:  select status_code, content from net._http_response order by created desc limit 5;
-- Para desligar:   select cron.unschedule('emails-campanhas-diarias');
-- Para testar sem mandar nada, chame a função com {"acao": "campanhas_diarias", "simular": true}.
