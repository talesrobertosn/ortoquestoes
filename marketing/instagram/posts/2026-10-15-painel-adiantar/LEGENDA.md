# Painel de partidas: adiantar no Cronograma (feed e stories, 15/10)

Propaganda de função: o **Adiantar** do Cronograma (o que se faz além da meta sai de amanhã) e as
**revisões e flashcards como extras**, que entraram no site em 14/10 (PR #246).

## Estilo novo: painel de partidas

Painel de aeroporto com letras em plaquinhas que viram. Cada dia de estudo é um "voo": **feito**
(verde), **adiantado** (dourado) ou **no horário** (azul); domingo aparece apagado, como folga.
É feito só com HTML e CSS (`post.html`): nada gerado por IA, nada baixado, sem desenho de anatomia.

## Ordem e horários

| O quê | Arquivos | Quando |
|---|---|---|
| Feed (carrossel) | feed-01 a feed-05 | das 7h às 8h |
| Stories | story-01 a story-03 | no almoço ou das 18h às 19h |

Os stories não têm figurinha. Se quiser o link, use o modelo "Treine grátis".

## Conferência

- **Regra real:** o que passa da meta sai do próximo dia de estudo, até zerar a meta dele; o resto
  vai para o seguinte (`src/dados/planoEstudo.ts`, teste `fixtures/testar_cronograma_adiantar.mjs`).
  "Antes, amanhã ia de 60 para 59" é o comportamento antigo: o extra se diluía pelo plano todo.
- **Botões:** +10, +20, +30, "Amanhã inteiro" e "2 dias", como no cartão Hoje.
- **Telas:** reais, do modo demonstração (`#/cronograma?demo=1&feita`), com a nota "Tela ilustrativa".
- **Assinatura:** o Cronograma é para assinantes (quem não assina vê só a vitrine). Sem preço.
- **Números de exemplo** (60, 30, 68 → 48): ilustrativos. Não citamos o total de questões.

## Como refazer

`node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-10-15-painel-adiantar/post.html`

## Legenda do feed

Novo no Cronograma do Orto Questões: adiantar agora alivia o dia seguinte de verdade.

Fez 30 questões além da meta de hoje? Amanhã cai 30. Fez um dia inteiro a mais? Amanhã fica livre. No cartão Hoje, você escolhe quanto adiantar (+10, +20, +30, amanhã inteiro ou 2 dias), e cada botão mostra o efeito antes de começar.

E a meta do dia ficou mais simples: são as questões novas. Revisões e flashcards continuam lá, como extras, se sobrar tempo.

O Cronograma monta o seu estudo até a prova, dia a dia, começando pelo que mais cai. Mais no nosso perfil, @ortoquestoes.

#ortopedia #residenciamedica #teot #cronogramadeestudos #ortoquestoes
