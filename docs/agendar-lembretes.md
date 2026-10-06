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
