# Anúncios no ChatGPT — medição do site

Implementação de 10/11/2026. Pixel público `Gk93oxGio9qeR7y5bs4Wop`.

## O que está instalado

`src/conta/consentimento.ts` carrega o SDK oficial de forma assíncrona, uma única vez,
depois do aceite de cookies. A recusa não carrega Meta nem OpenAI; revogar informa
os dois SDKs e bloqueia novos eventos, inclusive a navegação por hash.

A versão 2 do consentimento exige uma nova escolha, pois a autorização antiga
citava somente o Meta. Termos e privacidade atualizados em 10/11/2026. O dono
escolheu manter a correspondência avançada automática ativada na OpenAI:
o SDK pode detectar dados dos formulários e transformá-los em hashes no navegador
para correspondência. Isso está explicado no aviso e na cláusula 17.11.3.
Não enviar dados de estudo por parâmetros de eventos.

| Ação | Evento padrão OpenAI | Momento |
| --- | --- | --- |
| Visita | `page_viewed` | Após o aceite e na navegação; não conta rotas do admin |
| Cadastro | `registration_completed` | Criação por e-mail ou primeiro acesso de conta nova pelo Google |
| Escolha de plano | `items_added` | Seleção do plano por pessoa logada |
| Início de compra | `checkout_started` | Confirmação das condições para iniciar Pix/cartão |

Valores enviados em centavos inteiros e moeda BRL; o Meta mantém seus valores em reais.
Os valores de checkout representam intenção de compra, nunca receita recebida.
Não há evento `order_created` ou `subscription_created`: a confirmação de venda
precisa de integração específica com os pagamentos, contemplando Pix e cartão,
sem confundir pagamento pendente, cortesia ou acesso já ativo com compra nova.

Configuração opcional de publicação: variável GitHub Actions `VITE_OPENAI_PIXEL_ID`;
vazia usa o pixel público acima. Debug ligado apenas no desenvolvimento.
Nenhuma chave secreta de API vai para o navegador. Não exige SQL, migração ou Edge Function.

## Finalizar no Ads Manager

1. Em Conversões → Fonte de dados, selecionar este pixel.
2. Criar evento de conversão com o nome “Cadastro concluído” e o evento padrão
   `registration_completed`, associado a essa fonte.
3. Se desejar, criar “Início de compra” com `checkout_started`, para acompanhamento.
4. Abrir o site, aceitar cookies e conferir `page_viewed` em Fluxo de eventos.
   Um cadastro real consentido deve produzir `registration_completed`.
5. Associar o evento de cadastro à campanha, preservando os eventos já associados.
   Criar o evento não altera sozinho a campanha nem seu objetivo.

O objetivo de campanha existente não pode ser alterado. Se a atual é de cliques,
pode acompanhar conversões; otimizar para conversões exige criar uma campanha
com esse objetivo, escolhendo um evento padrão ativo. Não duplicar campanha,
aumentar orçamento ou ativar anúncios automaticamente como parte da instalação.

O painel também mostra verificação da empresa pendente: concluir por
“Iniciar verificação” na própria conta.

## Evidência

- `node fixtures/testar_pixels.mjs`: carregamento condicionado ao consentimento,
  instalação única, compatibilidade de eventos, BRL/centavos, revogação, admin,
  navegação SPA e ausência de compra fictícia.
- `fixtures/e2e_pixels.mjs`, com `scripts/capturar_telas.mjs`: recusa, aceite,
  pixel correto, mudança de rota e revogação em celular e computador, SDK simulado.
- Teste adicional com o SDK oficial baixado e requisições interceptadas confirmou
  os quatro payloads aceitos; nenhum evento de teste enviado à fonte real.

Referências oficiais consultadas em 10/11/2026:
https://developers.openai.com/ads/measurement-pixel
https://developers.openai.com/ads/conversion-tracking
