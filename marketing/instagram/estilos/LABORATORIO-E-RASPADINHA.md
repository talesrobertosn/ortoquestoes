# Laboratório de patologia e Raspadinha da prova: modelos aprovados

Tales aprovou os dois temas em 18/10/2026 ("ficou muito bom o post de tumor, ficou muito bom o post da raspadinha... pode somar no nosso arsenal de temáticas"), pedindo acabamento caprichado. Primeira entrega: `posts/2026-10-17-laboratorio-tcg/` (feed com `tumores-0309`, TARO 2026; stories com `pediatria-0120`, TARO 2022). Registre como `laboratorio` e `raspadinha` em `historico.json` e respeite os 2 dias entre usos.

| Estilo | Formato | Modelo |
|---|---|---|
| Laboratório de patologia | feed, 3 slides de 1080×1350 | [laboratorio/modelo.html](laboratorio/modelo.html) |
| Raspadinha da prova | stories, 3 telas de 1080×1920 | [raspadinha/modelo.html](raspadinha/modelo.html) |

Gere com `node marketing/instagram/gerar.mjs marketing/instagram/estilos/<estilo>/modelo.html`. As telas do Cronograma vêm de `marketing/kit/telas/` (recapture no dia do post para o "faltam N dias" bater com o texto; comandos no `LEGENDA.md` do post original).

## Laboratório de patologia (feed)

**Quando usar:** questões com lâmina de histologia, ou com imagem que pede "laudo" (tumores, infecção, osteometabólicas). Funciona melhor quando a questão traz imagem e lâmina juntas.

1. **Lâmina:** a histologia real dentro da ocular do microscópio (anel com marcas e retículo fino), o gancho em uma linha ("Qual tumor está nessa lâmina?"), **o enunciado oficial completo** logo abaixo e as alternativas em grade 2×2.
2. **Laudo:** cartão claro com o painel de imagens da questão, **pinos dourados nos cantos de cada imagem** (nunca sobre a lesão), a letra do gabarito, três pistas numeradas que batem com os pinos e a faixa "Para a prova" no pé do cartão.
3. **Próximo exame:** data da prova, "faltam N dias", MacBook e iPhone com o Cronograma real, a frase do cronograma e o botão "Treine grátis".

**Acabamento:** verde-petróleo com grade suave; menta `#7FE2D6`, rosa HE `#F4A9C6`, dourado `#F4CF7C`. Não inventar aumento, coloração ou dado que a questão não dá. Não ampliar demais a histologia (perde nitidez).

## Raspadinha da prova (stories)

**Quando usar:** questões de imagem com alternativas curtas (epônimos, classificações, sinais). A brincadeira é raspar para ver a resposta.

1. **Bilhete:** título "Raspadinha da prova", prova e ano, a imagem real, o enunciado exato, as quatro alternativas e a área prateada "Raspe no próximo story" com a moeda.
2. **Resultado:** a área raspada (lascas prateadas nas bordas) com "Você raspou: letra · resposta", as alternativas com a certa em verde e uma ou duas linhas do comentário.
3. **Chamada:** "Fique pronto. Prepare-se.", data e dias até a prova, o iPhone com o Cronograma, o botão "Treine grátis" e, abaixo da seta, espaço livre para a figurinha de link com utm. O site fica acima de 1700 px.

**Acabamento:** fundo roxo com pontos e brilhos, bilhete creme com faixas coloridas, roxo `#7A2CC4`, rosa `#FF4F8B`, amarelo `#FFCF4A`. Prefira imagem com pelo menos 450 px de largura e não amplie mais que duas vezes.

## Revisão antes de entregar

- [ ] Enunciado, alternativas e gabarito iguais ao acervo (o gancho pode ser livre, mas o enunciado oficial aparece).
- [ ] Pinos e carimbos fora da lesão e do texto; nada cortado ou encostando.
- [ ] "Faltam N dias" igual no texto e na tela capturada.
- [ ] Stories: o que importa entre 250 e 1700 px; figurinha só no terceiro story.
