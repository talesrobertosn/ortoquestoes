# Limite diário e planos

## Estado seguro inicial

Há três travas independentes e todas nascem desligadas:

1. `VITE_LIMITES_HABILITADOS=false`: o cliente preserva exatamente o fluxo anterior e não consulta o servidor antes de responder.
2. `configuracao_comercial.paywall_ativo=false`: a RPC autoriza sem contabilizar usuários reais.
3. `VITE_PAGAMENTOS_HABILITADOS=false`, `PAGAMENTOS_HABILITADOS=false` e `MERCADO_PAGO_INTEGRACAO_VALIDADA=false`: não há CTA ativo nem checkout na Edge Function.

Uma conta presente em `contas_teste` passa pela regra do limite mesmo com `paywall_ativo=false`. A tabela usa `id_usuario` do Supabase Auth; não use lista de e-mails.

## Banco

Aplicar `supabase/migrations/202609190001_paywall_planos.sql`. A migration é não destrutiva, ativa RLS, não fornece policies de escrita e cria:

- `configuracao_comercial`;
- `contas_teste`;
- `assinaturas`;
- `consumo_diario`;
- `respostas_autorizadas`, livro-razão idempotente;
- `eventos_pagamento`, caixa de entrada idempotente;
- RPCs `autorizar_resposta` e `obter_estado_conta`.

O dia e a próxima liberação são calculados no Postgres em `America/Sao_Paulo`. O cliente apenas apresenta o estado devolvido. A operação bloqueia a linha diária antes de conferir/incrementar, e a chave UUID impede consumo duplicado.

## Variáveis

No build público, copiar `.env.example` para `.env.local` e preencher URL e `VITE_SUPABASE_PUBLISHABLE_KEY`. `VITE_SUPABASE_ANON_KEY` é apenas fallback temporário para a chave anon pública legada. Nunca prefixar segredos com `VITE_`.

Nas Edge Functions:

```sh
supabase secrets set \
  APP_ORIGIN=https://ortoquestoes.com.br \
  MERCADO_PAGO_ACCESS_TOKEN=... \
  MERCADO_PAGO_AMBIENTE=teste \
  MERCADO_PAGO_RESTRITO_CONTAS_TESTE=true \
  MERCADO_PAGO_PAYER_EMAIL_TESTE=... \
  MERCADO_PAGO_WEBHOOK_SECRET=... \
  PAGAMENTOS_HABILITADOS=false \
  MERCADO_PAGO_INTEGRACAO_VALIDADA=false
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo ambiente das Edge Functions. A service role jamais vai para o navegador.

## Mercado Pago: configuração privada

`criar-checkout` cria uma preapproval sem plano associado. O plano é definido no servidor pelo par validado de valor e periodicidade: mensal (R$ 39,90/1 mês), semestral (R$ 179,90/6 meses) ou anual (R$ 239,90/12 meses), sempre em BRL. No ambiente `teste`, a Function libera checkout somente para uma `contas_teste` ativa. Em produção, a trava privada `MERCADO_PAGO_RESTRITO_CONTAS_TESTE` restringe por padrão à mesma tabela; apenas o valor explícito `false` remove a restrição após validar cobrança, reembolso e os três checkouts públicos. Access Token e segredo de webhook nunca pertencem ao frontend, GitHub Variables, `.env.example` com valor real ou repositório.

Com Access Token de teste, a função só abre checkout para um usuário autenticado que tenha uma linha ativa em `contas_teste` e exige o secret privado `MERCADO_PAGO_PAYER_EMAIL_TESTE` como `payer_email`. Em produção, usa o e-mail autenticado. A preapproval leva o UUID do Supabase em `external_reference`, `back_url` de `APP_ORIGIN`, uma chave de idempotência e `auto_recurring` com `frequency_type=months`, valor e moeda BRL. A função não devolve nem registra o e-mail sandbox e não recebe ou armazena dados de cartão.

O webhook identifica a assinatura pelo par validado de frequência mensal e valor retornado em `auto_recurring`; não aceita periodicidade, moeda ou preço inesperados. `approved` e `authorized` ativam acesso; `pending` e `in_process` ficam pendentes, sem redução de acesso; `rejected`, `cancelled`, `charged_back`, `refunded` e vencimento devolvem a conta ao gratuito. Eventos `subscription_preapproval_plan` e outros que não mudam acesso são registrados e ignorados com segurança.

## Mercado Pago: pendências obrigatórias

O titular ainda precisa criar/configurar a conta de vendedor como pessoa física. Antes de mudar `MERCADO_PAGO_INTEGRACAO_VALIDADA`, conferir novamente na documentação oficial e em sandbox:

- disponibilidade de assinaturas recorrentes para a conta e meios de pagamento aceitos;
- aceitação de `frequency=1`, `6` e `12` com `frequency_type=months` em `preapproval_plan` de sandbox (confirmada em 2026-09-20);
- evento atual para preapproval (`subscription_preapproval`) e evento de cobrança (`payment`);
- composição atual do manifesto `x-signature` (`data.id`, `x-request-id` e `ts`);
- presença de `external_reference`, `next_payment_date`, `metadata.preapproval_id` ou `subscription_id` nas respostas reais;
- regras da conta para reembolso via `/v1/payments/{id}/refunds`.

As periodicidades de 1, 6 e 12 meses foram aceitas na criação de `preapproval_plan` com credencial de teste em 2026-09-20. O primeiro checkout sandbox ainda precisa validar o retorno, a associação da preapproval, os eventos reais, a assinatura HMAC e a atualização idempotente antes de qualquer ativação. Por segurança, as funções recusam checkout e webhook enquanto `MERCADO_PAGO_INTEGRACAO_VALIDADA` não for explicitamente `true`.

Configurar o webhook somente por HTTPS para a função `webhook-mercado-pago`. A função valida a assinatura antes de ler/processar o evento, grava o evento com chave única e responde rapidamente; o processamento ocorre em background. Não se armazenam dados de cartão. Não salvar URL nem segredo até a validação completa do primeiro checkout sandbox.

## Política operacional

- Todos os planos são recorrentes: mensal R$ 39,90; semestral R$ 179,90; anual R$ 239,90.
- Cancelamento é automático. Fora da garantia, interrompe futuras cobranças e preserva acesso até `fim_periodo`.
- Até sete dias de cada cobrança, `gerenciar-plano` solicita reembolso integral, inclusive de assinatura já cancelada. Só registra `reembolsada` após consulta confirmar o pagamento como `refunded` no Mercado Pago; então encerra o acesso pago imediatamente. Uma recusa do provedor não altera a assinatura e gera apenas códigos sanitizados nos logs.
- Falha, vencimento e reembolso devolvem a conta ao limite sem apagar dados.

## Roteiro seguro de produção

1. Aplicar migration e confirmar `paywall_ativo=false`, `pagamentos_ativos=false`.
2. Executar `supabase/tests/paywall.sql` em ambiente descartável.
3. Criar um usuário Supabase próprio e inserir seu UUID em `contas_teste`.
4. Publicar frontend ainda com ambas as flags Vite falsas: usuários reais não percebem mudança.
5. Publicar Edge Functions com as duas flags privadas falsas.
6. Ativar apenas `VITE_LIMITES_HABILITADOS=true` em uma prévia protegida e testar a conta de teste: respostas 1–17, aviso 18–20, bloqueio 21, repetição da mesma chave e liberação 24 h depois da primeira resposta da janela.
7. Validar sandbox do Mercado Pago, assinatura do webhook, duplicatas, aprovação, falha, cancelamento e reembolso em até sete dias.
8. Somente depois definir `MERCADO_PAGO_INTEGRACAO_VALIDADA=true`, `PAGAMENTOS_HABILITADOS=true` e `VITE_PAGAMENTOS_HABILITADOS=true`.
9. Manter `paywall_ativo=false` enquanto o checkout é observado com a conta de teste.
10. Ativar `paywall_ativo=true` em janela acompanhada. Para rollback instantâneo, voltar esse campo para `false`; não é necessário deploy.

## Janela de 24 horas (11/10/2026)

Pedido do dono: o gratuito deixou de zerar à meia-noite de São Paulo. Agora funciona como o
limite de uso do Claude: a janela começa na primeira questão contabilizada e as questões grátis
voltam inteiras 24 horas depois desse início. Migração `202610110100_limite_janela_24h.sql`
(cópia para colar em `supabase/colar-no-painel/sql-202610110100-parte13.sql`):

- `janela_gratis` guarda, por pessoa, o início da janela e quantas questões já gastou nela;
- `autorizar_resposta` decide pela janela e devolve `libera_em = início + 24 h`;
- `consumo_diario` continua somado pelo dia de São Paulo (sequência de dias e painel).

Na interface, o contador regressivo é o `RelogioPixel` (ampulheta em pixel art que esvazia ao
longo das 24 h), no convite do limite e no resumo da sessão.

## Torneio de Flashcards (13/10/2026)

- Migration `supabase/migrations/202610130100_flashcards_limite_e_progresso.sql` (não destrutiva): `flashcards_janela_gratis`, `flashcards_autorizados` (livro-razão idempotente e fonte do ranking de flashcards únicos), `flashcards_progresso` (fila de revisão e recordes, RLS só do dono) e as RPCs `autorizar_flashcard`, `flashcards_unicos`, `salvar_progresso_flashcards` e `ler_progresso_flashcards`.
- Contrato: **10 flashcards grátis por janela de 24 h**, contados no servidor; assinante, administrador e cortesia sem limite; `contas_teste` passam pela regra mesmo com o paywall desligado.
- No cliente, tudo fica atrás de `VITE_LIMITES_HABILITADOS=true` **e** `VITE_FLASHCARDS_LIMITE=true`. Com as travas desligadas (padrão), o Torneio não chama o servidor e segue só pelo link `#/flashcards`.
- Batalha: a resposta só é aplicada depois do "sim" do servidor (chave por rodada, sem gastar duas vezes). Estudo: virar o flashcard conta.
- **Antes de divulgar o Torneio:** aplicar a migration, ligar as duas travas no build e testar com uma conta de `contas_teste`.
