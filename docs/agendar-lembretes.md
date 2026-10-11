# Lembretes de renovação do Pix

Quem paga no Pix (mensal, semestral ou anual) recebe acesso por um período fixo,
sem renovação automática. Há dois lembretes, cada um uma vez por compra e
respeitando quem desligou os lembretes:

- `renovacao_pix`: quando faltam até 3 dias para o acesso acabar.
- `renovacao_pix_hoje`: no dia em que o acesso acaba (data de Brasília).

Os dois trazem os números da pessoa: questões respondidas, porcentagem de acerto
e questões dos últimos 7 dias. Quem já renovou (ou passou para o cartão) fica de fora.

## Pelo painel

**Painel do administrador › Crescimento › Lembretes por e-mail**: os cartões
"Pix: faltam 3 dias" e "Pix: termina hoje" mostram quem recebe agora (plano,
data do fim, questões e acerto). "Prévia" na linha de uma pessoa abre o e-mail
com os números dela; "Ver prévia" usa os seus. "Enviar para N" dispara.

## Sozinho, todo dia (opcional)

Crie um agendamento no Supabase (Integrations › Cron, que usa `pg_cron` e
`pg_net`) para cada lembrete:

- Nomes: `lembrete-pix-3-dias` e `lembrete-pix-hoje`
- Quando: todo dia às 9h de Brasília (`0 12 * * *`, em UTC)
- Tipo: chamada HTTP (Supabase Edge Function) `POST` para a função `enviar-email`
- Cabeçalhos: `Content-Type: application/json` e `x-segredo: <o mesmo valor do segredo EMAIL_SEGREDO das Functions>`
- Corpo: `{"acao": "lembretes", "campanha": "renovacao_pix", "limite": 40}`
  (no segundo, `"campanha": "renovacao_pix_hoje"`)

O segredo fica só no Supabase (segredos das Functions e o cabeçalho do agendamento);
não o coloque no código nem neste repositório. Antes, aplique as migrações
`202610060100_perfil_estudo_admin.sql` e `202610060200_renovacao_pix_dia.sql`
e publique a função `enviar-email` (arquivo pronto em `supabase/colar-no-painel/enviar-email.ts`).

## Renovação antecipada do Pix (11/10/2026)

Nos 7 dias finais de um Pix, a página de planos libera "Renovar no Pix" e a função
`criar-pix` aceita o pedido. Ao aprovar, `confirmar_pagamento_pix` começa o período
novo no fim do atual: faltando 3 dias, o mensal pago hoje vale 3 dias + 1 mês.
Os e-mails "Pix: faltam 3 dias" e "Pix: termina hoje" explicam isso. Migração
`202610110200_quinzenal_e_pix_antecipado.sql` (parte 14 em `supabase/colar-no-painel/`).

# Resumo quinzenal de estudo

Todo mundo que estudou na quinzena recebe o resumo: questões feitas, acerto comparado
com a quinzena anterior, temas que subiram e caíram e o próximo passo. É o mesmo
desenho do relatório do mês, que o Gmail entrega em Atualizações. No dia 1º, quem
recebe o relatório mensal de assinante fica de fora (um e-mail só no mesmo dia).
Quem desligou os relatórios em Minha conta (ou pelo link do rodapé) não recebe.

No painel: **Crescimento › Lembretes por e-mail › Resumo quinzenal** (prévia e envio
manual do que ficou pendente).

## Sozinho, nos dias 1 e 16

No Supabase (Integrations › Cron), crie o agendamento `resumo-quinzenal`:

- Quando: `5 12-20 1,16 * *` (de hora em hora, das 9h05 às 17h05 de Brasília, nos dias 1 e 16).
  Cada chamada manda um lote de até 80; as seguintes continuam de onde parou e não repetem ninguém.
- Tipo: chamada HTTP `POST` para a função `enviar-email`
- Cabeçalhos: `Content-Type: application/json` e `x-segredo: <o valor do segredo EMAIL_SEGREDO>`
- Corpo: `{"acao": "relatorios_quinzenais", "limite": 80}`
  (sem "quinzena", a função usa a última que terminou: no dia 16, os dias 1 a 15; no dia 1º, do 16 ao fim do mês anterior)
