# Pagamento por Pix

Pix é pagamento único do período integral: mensal R$ 39,90, semestral R$ 209,40 e anual R$ 358,80. Quem já assinava antes do reajuste de 7/11/2026 mantém semestral R$ 179,90 e anual R$ 239,90 (ver `docs/reajuste-planos-2026-11.md`). Não há renovação automática. O preço é definido no servidor e o prazo começa na aprovação confirmada pelo Mercado Pago. Um usuário com período pago vigente não compra outro pelo Pix. Um Pix pendente é recuperado em vez de gerar nova cobrança; outro plano exige aguardar a expiração.

## Publicação

1. Aplicar `supabase/migrations/202610011700_pagamentos_pix.sql`, após as migrations existentes.
2. Publicar `criar-pix`, `webhook-mercado-pago`, `gerenciar-plano` e `criar-checkout`. A função `criar-pix` exige autenticação Supabase. O webhook continua público com validação HMAC obrigatória.
3. Configurar notificações `payment` na aplicação do Mercado Pago apontando para o webhook existente. A conta vendedora deve ter uma chave Pix cadastrada.
4. Manter as travas existentes `PAGAMENTOS_HABILITADOS`, `VITE_PAGAMENTOS_HABILITADOS` e `MERCADO_PAGO_INTEGRACAO_VALIDADA` com a configuração já usada para pagamentos. Não são necessárias novas flags específicas de Pix. A restrição de contas de teste continua obedecendo `MERCADO_PAGO_RESTRITO_CONTAS_TESTE`.
5. Publicar o frontend somente depois da migration e das funções; a opção Pix aparece quando os pagamentos já estão habilitados.

Não foram alterados secrets nem flags de produção. Access Token, service role e webhook secret permanecem exclusivamente no servidor. O CPF é enviado ao provedor e não gravado na tabela de pedidos; notificações do provedor continuam seguindo o armazenamento de eventos existente.

## Confirmação e reembolso

A referência `pix:<UUID do pedido>` liga o pagamento à conta autenticada. O servidor consulta `/v1/payments/{id}` e confere ID, referência, meio Pix, BRL, valor e ambiente. Só a RPC privada `confirmar_pagamento_pix` concede acesso, com bloqueio da linha e identificador único. Repetições não criam outra assinatura nem mudam sua data final. Reembolso/chargeback são terminais, inclusive quando uma aprovação atrasada chega depois. Pix pendente, expirado ou rejeitado nunca libera acesso.

As assinaturas Pix usam `id_externo=pix:<UUID>` e `cancelar_ao_fim=true`, para que os controles existentes reconheçam acesso sem nova cobrança. O botão de garantia reembolsa o pagamento Pix diretamente, sem consultar uma preapproval que não existe. O acesso só é revogado após confirmação do reembolso.

Não foram executados testes de pagamento, conforme solicitado. O build inicial do frontend foi realizado antes dessa orientação. A cobrança real e a publicação das funções dependem do ambiente Supabase e da conta Mercado Pago.

Documentação oficial consultada em 01/10/2026:
- https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix
- https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/additional-content/notifications/webhooks

O ticket hospedado pelo Mercado Pago exibe QR Code e Pix Copia e Cola. A validade usada é 24 horas. A implementação não utiliza Pix Automático.

## QR Code na própria página (16/10/2026)

`criar-pix` devolve também `qr_code` (Pix Copia e Cola) e `qr_code_base64` (imagem do QR), opcionais e
validados, tirados de `point_of_interaction.transaction_data`. A janela de pagamento mostra o QR, o código
e o botão "Copiar código Pix"; sem esses campos (função antiga ainda publicada), mostra o link do Mercado
Pago como antes. Arquivo para colar no painel: `supabase/colar-no-painel/criar-pix.ts`. Teste de ponta a
ponta com Supabase e Mercado Pago simulados: `npm run test:compra`.
