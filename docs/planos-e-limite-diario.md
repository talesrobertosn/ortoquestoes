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
  MERCADO_PAGO_WEBHOOK_SECRET=... \
  PAGAMENTOS_HABILITADOS=false \
  MERCADO_PAGO_INTEGRACAO_VALIDADA=false
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo ambiente das Edge Functions. A service role jamais vai para o navegador.

## Mercado Pago: pendências obrigatórias

O titular ainda precisa criar/configurar a conta de vendedor como pessoa física. Antes de mudar `MERCADO_PAGO_INTEGRACAO_VALIDADA`, conferir novamente na documentação oficial e em sandbox:

- disponibilidade de assinaturas recorrentes para a conta e meios de pagamento aceitos;
- aceitação de `frequency=1`, `6` e `12` com `frequency_type=months` em preapproval;
- evento atual para preapproval (`subscription_preapproval`) e evento de cobrança (`payment`);
- composição atual do manifesto `x-signature` (`data.id`, `x-request-id` e `ts`);
- presença de `external_reference`, `next_payment_date`, `metadata.preapproval_id` ou `subscription_id` nas respostas reais;
- regras da conta para reembolso via `/v1/payments/{id}/refunds`.

Esses pontos **não puderam ser validados neste ambiente**, pois tanto a ferramenta de navegação quanto o acesso direto à documentação oficial retornaram bloqueio do proxy. Por segurança, as funções recusam checkout e webhook enquanto `MERCADO_PAGO_INTEGRACAO_VALIDADA` não for explicitamente `true`.

Configurar o webhook somente por HTTPS para a função `webhook-mercado-pago`. A função valida a assinatura antes de ler/processar o evento, grava o evento com chave única e responde rapidamente; o processamento ocorre em background. Não se armazenam dados de cartão.

## Política operacional

- Todos os planos são recorrentes: mensal R$ 39,90; semestral R$ 179,90; anual R$ 239,90.
- Cancelamento é automático. Fora da garantia, interrompe futuras cobranças e preserva acesso até `fim_periodo`.
- Até sete dias de cada cobrança, `gerenciar-plano` solicita reembolso integral, cancela a recorrência e encerra o acesso pago imediatamente.
- Falha, vencimento e reembolso devolvem a conta ao limite sem apagar dados.

## Roteiro seguro de produção

1. Aplicar migration e confirmar `paywall_ativo=false`, `pagamentos_ativos=false`.
2. Executar `supabase/tests/paywall.sql` em ambiente descartável.
3. Criar um usuário Supabase próprio e inserir seu UUID em `contas_teste`.
4. Publicar frontend ainda com ambas as flags Vite falsas: usuários reais não percebem mudança.
5. Publicar Edge Functions com as duas flags privadas falsas.
6. Ativar apenas `VITE_LIMITES_HABILITADOS=true` em uma prévia protegida e testar a conta de teste: respostas 1–17, aviso 18–20, bloqueio 21, repetição da mesma chave e virada de meia-noite de São Paulo.
7. Validar sandbox do Mercado Pago, assinatura do webhook, duplicatas, aprovação, falha, cancelamento e reembolso em até sete dias.
8. Somente depois definir `MERCADO_PAGO_INTEGRACAO_VALIDADA=true`, `PAGAMENTOS_HABILITADOS=true` e `VITE_PAGAMENTOS_HABILITADOS=true`.
9. Manter `paywall_ativo=false` enquanto o checkout é observado com a conta de teste.
10. Ativar `paywall_ativo=true` em janela acompanhada. Para rollback instantâneo, voltar esse campo para `false`; não é necessário deploy.
