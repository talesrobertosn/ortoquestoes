# Ativação e rollback de assinaturas

Este roteiro não autoriza ativação. Enquanto o reembolso sandbox do chamado
`WCS-52311` não for confirmado pelo Mercado Pago, manter todas as travas públicas
e comerciais desligadas. Não usar status manual no banco para simular um reembolso.

## Antes de ativar

1. Confirmar o estado do projeto e o deploy das três Edge Functions. O webhook
   deve continuar sem JWT do gateway, com validação obrigatória de `x-signature`.
2. Confirmar a credencial privada do mesmo vendedor que recebeu a cobrança.
   Nunca registrar ou copiar tokens para o repositório, GitHub Variables ou chat.
3. Confirmar em sandbox, por resposta do provedor, cancelamento, reembolso
   `refunded`, associação ao usuário e processamento idempotente dos eventos.
4. Confirmar preços e periodicidades mensal R$ 39,90/1 mês, semestral
   R$ 179,90/6 meses e anual R$ 239,90/12 meses, em BRL.
5. Fazer revisão de autorização administrativa: RPCs disponíveis somente a
   `authenticated`, com verificação de UUID em `administradores`; usuário comum
   recebe acesso negado. A listagem não expõe payloads de webhook.
6. Conferir em produção as Repository Variables `VITE_LIMITES_HABILITADOS=false`
   e `VITE_PAGAMENTOS_HABILITADOS=false`, e no banco `paywall_ativo=false`,
   `pagamentos_ativos=false`, `limite_diario_gratis=20`.

## Sequência futura, somente após aprovação explícita

1. Habilitar a integração privada de produção com checkout ainda restrito a
   `contas_teste`. Validar que cada checkout abre com valor, moeda, recorrência
   e conta vendedora corretos, sem confirmar compra real sem autorização.
2. Validar webhook de produção e mecanismo de reembolso com credencial da mesma
   conta vendedora. Nunca marcar `reembolsada` antes de `refunded` confirmado.
3. Remover a restrição privada de `contas_teste` somente após a validação dos
   três checkouts. Ativar pagamentos públicos no backend e no build do frontend.
4. Manter `paywall_ativo=false` até confirmar que botões e checkout públicos
   funcionam. Ativar o limite apenas em janela acompanhada, com rollback pronto.

## Rollback

- Se checkout ou webhook falhar, desligar imediatamente `PAGAMENTOS_HABILITADOS`
  e `MERCADO_PAGO_INTEGRACAO_VALIDADA` nas Edge Functions. Reverter
  `VITE_PAGAMENTOS_HABILITADOS=false` no build público e aguardar o deploy.
- Se o limite impedir respostas indevidamente, definir `paywall_ativo=false` no
  banco e `VITE_LIMITES_HABILITADOS=false` no build público. Não alterar o limite
  diário de 20 nem apagar consumo ou histórico para mascarar o erro.
- Não apagar assinaturas, pagamentos nem eventos. Conservar logs sanitizados,
  IDs de correlação e resposta do provedor para diagnóstico; não expor tokens.
- Caso uma cobrança tenha ocorrido, cancelamento e reembolso são ações próprias
  do provedor e exigem confirmação oficial. Rollback de flags não estorna valores.

## Estado atual

Pagamentos públicos, limite público, `pagamentos_ativos` e `paywall_ativo`
permanecem desligados. O reembolso sandbox deve ser resolvido antes da ativação.
