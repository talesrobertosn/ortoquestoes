# Ativação e rollback de assinaturas

Em 26/09/2026, o titular autorizou abrir assinaturas reais mesmo com o reembolso
sandbox do chamado `WCS-52311` ainda recusado pela API. O reembolso automático
continua não validado: a página deve oferecer atendimento manual se a solicitação
falhar, e nenhum status financeiro pode ser alterado sem confirmação do provedor.
O paywall permanece desligado até autorização específica posterior.

## Antes de ativar

1. Confirmar o estado do projeto e o deploy das três Edge Functions. O webhook
   deve continuar sem JWT do gateway, com validação obrigatória de `x-signature`.
2. Confirmar a credencial privada do mesmo vendedor que recebeu a cobrança.
   Nunca registrar ou copiar tokens para o repositório, GitHub Variables ou chat.
3. Confirmar que cancelamento, associação ao usuário e processamento idempotente
   dos eventos funcionam; verificar o canal de atendimento manual da garantia.
   O reembolso sandbox segue pendente de resposta oficial no chamado `WCS-52311`.
4. Confirmar preços e periodicidades mensal R$ 39,90/1 mês, semestral
   R$ 209,40/6 meses e anual R$ 358,80/12 meses, em BRL. Quem já assinava
   antes do reajuste de 7/11/2026 mantém R$ 179,90 e R$ 239,90.
5. Fazer revisão de autorização administrativa: RPCs disponíveis somente a
   `authenticated`, com verificação de UUID em `administradores`; usuário comum
   recebe acesso negado. A listagem não expõe payloads de webhook.
6. Conferir em produção `VITE_LIMITES_HABILITADOS=false`, `paywall_ativo=false`
   e `limite_diario_gratis=20`. Conferir os estados de pagamentos contra a fase
   da implantação antes de cada mudança.

## Sequência autorizada para abrir pagamentos

1. Habilitar a integração privada de produção com checkout ainda restrito a
   `contas_teste`. Validar que cada checkout abre com valor, moeda, recorrência
   e conta vendedora corretos, sem confirmar compra real sem autorização.
2. Validar webhook de produção com segredo HMAC, URL e eventos de assinaturas e
   pagamentos. Nunca marcar `reembolsada` antes de `refunded` confirmado.
3. Publicar termos e página de planos que deixem claro que o gratuito está sem
   limite nesta fase, a assinatura é opcional e a garantia pode exigir suporte
   manual quando o provedor recusar a automação.
4. Remover a restrição privada de `contas_teste`; ativar pagamentos públicos no
   backend, no banco e no build do frontend. Confirmar os três botões e os
   valores/periodicidades antes da primeira compra real pelo titular.
5. Manter `paywall_ativo=false` e `VITE_LIMITES_HABILITADOS=false`. Não ativar o
   limite sem autorização posterior e verificação do checkout real.

## Rollback

- Se o checkout falhar, desligar novas contratações com
  `PAGAMENTOS_HABILITADOS=false` e reverter
  `VITE_PAGAMENTOS_HABILITADOS=false` no build público. Manter o webhook e a
  conciliação ativos para assinaturas já existentes. Se o próprio webhook
  falhar, investigar e corrigir a entrega sem desabilitar a recepção; se isso
  não for possível, cancelar e conciliar as assinaturas existentes com o
  provedor antes de desativar `MERCADO_PAGO_INTEGRACAO_VALIDADA`.
- Se o limite impedir respostas indevidamente, definir `paywall_ativo=false` no
  banco e `VITE_LIMITES_HABILITADOS=false` no build público. Não alterar o limite
  diário de 20 nem apagar consumo ou histórico para mascarar o erro.
- Não apagar assinaturas, pagamentos nem eventos. Conservar logs sanitizados,
  IDs de correlação e resposta do provedor para diagnóstico; não expor tokens.
- Caso uma cobrança tenha ocorrido, cancelamento e reembolso são ações próprias
  do provedor e exigem confirmação oficial. Rollback de flags não estorna valores.

## Estado atual

Antes da sequência acima, os pagamentos públicos, o limite público,
`pagamentos_ativos` e `paywall_ativo` permanecem desligados. Registrar aqui o
estado efetivamente confirmado após cada etapa; não inferir ativação de um merge.
