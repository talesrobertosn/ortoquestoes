# E-mails de confirmação de cadastro e de senha nova (configurar no painel do Supabase)

Estes dois e-mails saem do Supabase Auth, fora do código, por isso ficam em
`supabase/modelos-email/` e precisam ser colados no painel uma vez. Desde 17/10/2026 os dois
falam com a voz do grupo ("a gente"), sem apresentar o Tales no texto (pedido de 18/10/2026: "tratar mais como um grupo e não uma pessoa;
precisa ser mais fofo"), e assinam "Com carinho, / Tales, do Orto Questões".
Desde 18/10/2026, a pedido do Tales, voltaram ao visual em cartão (fundo cinza-claro, cartão branco,
um botão verde e uma caixa de dica ou de segurança), que ele achou mais bonito.

## 1. Enviar pelo Resend (SMTP próprio)

Sem SMTP próprio, o Supabase manda pelo servidor padrão dele: limite de poucos e-mails por hora
para o projeto inteiro e remetente genérico, que cai muito em spam. O site já usa o Resend para os
outros e-mails (`supabase/functions/_shared/email.ts`), com o domínio verificado.

Painel do Supabase > Authentication > Emails > SMTP Settings > Enable custom SMTP:

| Campo | Valor |
|---|---|
| Sender email | `contato@ortoquestoes.com.br` (o mesmo domínio verificado no Resend) |
| Sender name | `Tales, do Orto Questões` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | a mesma `RESEND_API_KEY` dos secrets das funções (não colar em arquivo do repositório) |

Depois, em Authentication > Rate Limits, subir "Rate limit for sending emails" (por exemplo 100 por hora).

## 2. Colar os dois modelos (passo a passo)

Os dois modelos usam o formato `?token_hash=...&type=...`, que o site entende em qualquer
navegador (`src/conta/retornoAuth.ts`): quem abre o e-mail no celular, dentro do aplicativo do
Gmail, já entra direto, sem precisar voltar ao navegador em que se cadastrou.

1. Painel do Supabase > Authentication > Emails > Templates.
2. Aba **Confirm signup**:
   - Subject: `Falta só um toque para a sua conta ficar pronta`
   - Message body: apagar o conteúdo e colar o arquivo inteiro de
     [`supabase/modelos-email/confirmar-cadastro.html`](../supabase/modelos-email/confirmar-cadastro.html).
   - Salvar.
3. Aba **Reset password** (recuperação de senha):
   - Subject: `Vamos criar a sua senha nova?`
   - Message body: apagar o conteúdo e colar o arquivo inteiro de
     [`supabase/modelos-email/recuperar-senha.html`](../supabase/modelos-email/recuperar-senha.html).
   - Salvar.
4. Authentication > URL Configuration: o **Site URL** precisa ser `https://ortoquestoes.com.br`,
   sem barra no fim (os modelos já põem a barra). Conferir que `https://ortoquestoes.com.br/**`
   está nas Redirect URLs.
5. Testar: criar uma conta de teste com um e-mail próprio, abrir o link no celular (dentro do
   aplicativo do Gmail) e conferir que o site entra direto. Depois pedir "esqueci a senha" na tela
   de entrada e conferir que o segundo e-mail chega com o nome e que o botão abre a tela de senha nova.

O nome da pessoa entra em `{{ .Data.nome }}` (o site grava `nome` nos metadados ao cadastrar); sem
nome, a saudação vira "Oi, tudo bem?". Os dois modelos não têm imagem, tabela nem botão de cor
forte além do único botão de ação, de propósito: é o que mantém o e-mail com cara de carta.
