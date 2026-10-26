# Post de 27/10/2026: lançamento do Atlas Ortopédico 3D

Pedido do Tales (26/10/2026): post apresentando o Atlas 3D, "o primeiro (modelo padrão) e mais um", design premium.
Telas reais do atlas capturadas no próprio site (`capturar.mjs`, conta de exemplo assinante; `telas/` fica fora do
git), em MacBook e iPhone desenhados em CSS, com lupas e pinos. Sem desenho de anatomia: todo modelo que aparece é a
tela real do atlas.

- **Feed (modelo padrão, verde):** carrossel de 6.
- **Stories A (modelo padrão):** 3 stories.
- **Stories B, a opção extra (Negatoscópio, estilo novo):** a tela real do atlas presa num negatoscópio aceso, como
  um filme de radiografia ("você viu na radiografia, agora gire a peça").

Use um dos dois conjuntos de stories (ou A num dia e B em outro). Sem figurinha.

## Ordem e horários

| Imagem | O que é | Quando |
|---|---|---|
| `png/feed-1.png` a `png/feed-6.png` | Capa; ficha anatômica (abdutor curto do polegar); visualizações prontas (manguito); do osso à classificação (escafoide); questão ao lado da peça; tudo o que o atlas tem e o acesso | Manhã, 7h às 8h |
| `png/story-1.png` a `png/story-3.png` | O que é; "Clique. A ficha abre." (celular); ossos e músculos grátis com a conta | Noite, os três juntos |
| `png/story-raiox-1.png` a `png/story-raiox-3.png` | Opção extra: negatoscópio com o escafoide; ficha com Herbert e Fisher; questão ao lado da peça | Outro dia, à noite |

## Legenda do feed

> Anatomia ortopédica, agora em 3D. O Atlas 3D do Orto Questões está no ar, em versão beta: gire o corpo, escolha as camadas e clique em qualquer estrutura para ver origem, inserção, inervação, ação e por que ela importa na prova.
>
> A ficha de cada osso traz as classificações dos resumos e as questões de prova sobre ele, para responder com a peça na tela.
>
> Ossos e músculos liberados com a conta grátis. O caminho está no nosso perfil, @ortoquestoes.
>
> #ortopedia #residenciamedica #anatomia #teot #taro

## Conferência

- [x] Todas as telas são capturas reais do atlas (ficha do abdutor curto do polegar, escafoide com Herbert e Fisher,
  visualização pronta do manguito, pelve com nervos e artérias); a fonte das fichas no site é o Netter de Anatomia Ortopédica.
- [x] Acesso conferido em `docs/atlas3d/ANDAMENTO.md`: conta grátis com ossos e músculos; o resto na assinatura. Sem preço.
- [x] "11 regiões" conferido em `src/atlas3d/dados/regioes.ts`; cortes, transparência e visualizações citadas existem no atlas.
- [x] "Tela ilustrativa" onde aparece o placar da conta de exemplo (questão no atlas).
- [x] Sem emoji, sem IA, sem número total do acervo, sem link clicável; site escrito na imagem e "o caminho está no nosso perfil".
- [x] Stories com o que importa entre 250 px e 1580 px; nada cortado, sobreposto ou encostando; contador 1/6 a 6/6.
