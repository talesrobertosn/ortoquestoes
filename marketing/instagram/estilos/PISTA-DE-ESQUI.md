# Pista de esqui (feed e stories)

Estilo novo de 20/10/2026, ainda sem aprovação do Tales como modelo. Primeira entrega:
`posts/2026-10-20-pista-de-esqui-polegar/` (mao-1802, OrtoQuestões Simulados no padrão SIMÃO,
polegar do esquiador). Registre como `pista-de-esqui` em `historico.json` e respeite os 2 dias entre usos.

## A ideia

A questão vira uma estação de esqui: placas de pista, símbolos de dificuldade, neve e azul profundo,
com o dourado da marca. O raciocínio "desce" do círculo verde ao losango preto duplo, e as alternativas
viram pistas abertas ou fechadas.

**Quando usar:** questões ligadas a esporte de inverno ou queda (polegar do esquiador, lesões do
esqui, fraturas por queda), e qualquer questão em que a resposta sai em degraus de dificuldade
crescente. Também serve para falar dos OrtoQuestões Simulados (o "mapa das pistas").

## Roteiro

**Feed (3 slides de 1080×1350):**
1. **Placa:** selo dourado "OrtoQuestões Simulados · SIMÃO" (ou a prova), gancho grande em branco e
   dourado, a placa branca com borda marinho num par de postes de madeira, o losango preto e a
   pergunta, sem a resposta. Seta dourada "A questão no próximo slide" presa nos postes.
2. **Mapa da pista:** quadro branco com cabeçalho marinho ("Pista SIMÃO"), o enunciado oficial e as
   quatro alternativas com a letra em quadrado marinho (todas iguais, para não dar dica). Faixa
   dourada "Comente a sua letra antes de descer para o slide 3".
3. **Descida:** "Resposta X" no título; o quadro "Do verde à preta dupla" com quatro trechos (círculo
   verde, quadrado azul, losango preto, losango duplo), um passo do comentário em cada; a faixa
   "Na prova"; o cartão que explica os OrtoQuestões Simulados; site e @ortoquestoes.

**Stories (3 telas de 1080×1920):**
1. **Checkpoint do teleférico:** cabo e cabine dourada no alto (cenário), selo "Checkpoint do
   teleférico", uma afirmação Sim/Não tirada do comentário e o espaço vazio com cantos dourados para a
   enquete (só Sim / Não, pedido do Tales). Placa azul "A resposta sai no próximo story".
2. **Resposta:** "Sim." ou "Não." gigante em dourado, a frase que fecha, o porquê e a questão inteira
   em pistas: a certa "Aberta" (verde, texto exato da alternativa), as outras "Fechada" (vermelho).
3. **O mapa:** as quatro estações dos OrtoQuestões Simulados (lemos o que caiu, escrevemos de novo
   não 100% igual, comentamos tudo, você treina misturado ou "Só OrtoQuestões Simulados"), as "pistas
   abertas" (simulados que existem no site), o botão "Treine grátis", o site e a nota de que são
   questões autorais.

## Acabamento

- Céu azul-noite (`#051629` a `#2E6BA6`) com neve em três camadas de pontos esparsos; serra em
  polígonos com picos nevados (um pico por elemento, para não sair fiapo entre eles); encosta branca
  com a textura de pista batida.
- Cores: marinho `#0A2540`, verde `#1E9E57`, azul `#1F5FBF`, preto `#111417`, vermelho `#D7263D`,
  dourado `#F4CF7C`. Plus Jakarta Sans 800 nos títulos e placas, Inter no texto.
- Texto longo sempre em quadro sólido (branco ou marinho), nunca direto sobre a neve; nos títulos
  sobre o céu, `text-shadow` leve (`.sombra`).
- O grau do Jakarta deixa espaço antes da vírgula: use `<i class="g">°</i>` nesse caso.
- Sem desenho de anatomia: placas, postes, serra, neve e teleférico são só cenário.

## Revisão antes de entregar

- [ ] Enunciado, alternativas e gabarito iguais ao acervo; afirmação do story 1 tirada do comentário.
- [ ] A capa e o story 1 não entregam a resposta; as letras do slide 2 são todas iguais.
- [ ] Nada cortado, encostando ou com o cabo do teleférico passando sobre texto.
- [ ] Stories: o que importa entre 250 e 1580 px; só o story 1 tem o espaço da enquete.
- [ ] Legenda com no máximo 5 hashtags, sem link e levando para o perfil.
