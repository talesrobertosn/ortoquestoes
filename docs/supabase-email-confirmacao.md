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
- Message body:

```html
<div style="margin:0;padding:24px 12px;background:#1b1208;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:460px;margin:0 auto;padding:28px 24px;background:#3a2913;border:4px solid #f4cf7c;color:#fbf3df;text-align:center">
    <img src="https://ortoquestoes.com.br/ranking/mensageiro.png" width="72" height="90" alt="" style="image-rendering:pixelated">
    <p style="display:inline-block;margin:14px 0 0;padding:4px 10px;background:#f4cf7c;color:#1b1208;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase">Missão: confirmar o e-mail</p>
    <h1 style="margin:14px 0 8px;font-size:24px;color:#ffffff">Falta só um toque</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Toque no botão para confirmar o seu e-mail e liberar a sua conta no Orto Questões: questões das provas oficiais, comentadas, com revisão e ranking.</p>
    <a href="{{ .SiteURL }}/?token_hash={{ .TokenHash }}&type=email" style="display:inline-block;padding:14px 26px;background:#f4cf7c;color:#1b1208;font-weight:700;font-size:16px;text-decoration:none">Confirmar meu e-mail</a>
    <p style="margin:20px 0 0;font-size:12px;color:#d8c9a6">Se você não criou uma conta, ignore este e-mail.</p>
  </div>
</div>
```

Em Authentication > URL Configuration, o **Site URL** precisa ser `https://ortoquestoes.com.br`.

Depois de salvar, criar uma conta de teste com um e-mail próprio, abrir o link no celular (dentro
do aplicativo do Gmail) e conferir que o site entra direto.
