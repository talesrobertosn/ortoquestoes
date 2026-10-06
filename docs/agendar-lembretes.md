# Agendar o lembrete de renovação do Pix

Quem paga no Pix recebe acesso por um período fixo, sem renovação automática.
A campanha `renovacao_pix` manda um e-mail quando faltam 3 dias para o acesso
acabar (uma vez por compra, respeitando quem desligou os lembretes).

Ela já funciona pelo botão **Painel do administrador › Crescimento › Lembretes
por e-mail › Renovar a armadura (Pix)**. Para rodar sozinha todo dia, crie um
agendamento no Supabase (Integrations › Cron, que usa `pg_cron` e `pg_net`):

- Nome: `lembrete-renovacao-pix`
- Quando: todo dia às 9h de Brasília (`0 12 * * *`, em UTC)
- Tipo: chamada HTTP (Supabase Edge Function) `POST` para a função `enviar-email`
- Cabeçalhos: `Content-Type: application/json` e `x-segredo: <o mesmo valor do segredo EMAIL_SEGREDO das Functions>`
- Corpo: `{"acao": "lembretes", "campanha": "renovacao_pix", "limite": 40}`

O segredo fica só no Supabase (segredos das Functions e o cabeçalho do agendamento);
não o coloque no código nem neste repositório. Antes de agendar, aplique a
migração `supabase/migrations/202610060100_perfil_estudo_admin.sql` e publique a
função `enviar-email` (arquivo pronto em `supabase/colar-no-painel/enviar-email.ts`).
