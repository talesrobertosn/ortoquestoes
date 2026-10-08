# E-mail de confirmação de cadastro (configurar no painel do Supabase)

Duas configurações que ficam no painel do Supabase, fora do código, e que mais pesam na taxa de
quem cria a conta e nunca confirma. Fazer uma vez.

## 1. Enviar pelo Resend (SMTP próprio)

Sem SMTP próprio, o Supabase manda pelo servidor padrão dele: limite de poucos e-mails por hora
para o projeto inteiro e remetente genérico, que cai muito em spam. O site já usa o Resend para os
outros e-mails (`supabase/functions/_shared/email.ts`), com o domínio verificado.

Painel do Supabase > Authentication > Emails > SMTP Settings > Enable custom SMTP:

| Campo | Valor |
|---|---|
| Sender email | `contato@ortoquestoes.com.br` (o mesmo domínio verificado no Resend) |
| Sender name | `Orto Questões` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a mesma `RESEND_API_KEY` dos secrets das funções (não colar em arquivo do repositório) |

Depois, em Authentication > Rate Limits, subir "Rate limit for sending emails" (por exemplo 100 por hora).

## 2. Link que funciona em qualquer navegador

Hoje o link de confirmação usa o fluxo PKCE: se a pessoa abre o e-mail no celular e o link cai no
navegador do aplicativo de e-mail (e não no navegador onde se cadastrou), o e-mail é confirmado,
mas ela não entra direto. O site já mostra "E-mail confirmado! Agora é só entrar", mas o ideal é
o link já entrar sozinho. O site entende o formato `?token_hash=...&type=email` em qualquer
navegador (`src/conta/retornoAuth.ts`).

Painel do Supabase > Authentication > Emails > Templates > **Confirm signup**:

- Subject: `Confirme seu e-mail no Orto Questões`
- Message body: colar o conteúdo inteiro de
  [`supabase/modelos-email/confirmar-cadastro.html`](../supabase/modelos-email/confirmar-cadastro.html).

É o modelo antigo (tabelas, saudação com o nome, benefícios, link reserva), com três mudanças: o
link usa `{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=email` no lugar de
`{{ .ConfirmationURL }}`; entrou o mensageiro em pixel art com o selo "Missão: confirmar o
e-mail", igual ao pop-up do site; e um pré-cabeçalho, o texto que aparece ao lado do assunto na
caixa de entrada.

Em Authentication > URL Configuration, o **Site URL** precisa ser `https://ortoquestoes.com.br`, sem barra no fim (o modelo já põe a barra).

Depois de salvar, criar uma conta de teste com um e-mail próprio, abrir o link no celular (dentro
do aplicativo do Gmail) e conferir que o site entra direto.
