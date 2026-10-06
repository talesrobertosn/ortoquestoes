# Anúncio: TEOT e TEPOT, apresentação do Orto Questões

Anúncio de 6/10/2026 para quem ainda não conhece o site. Público principal: residentes de
ortopedia (TEOT e TEPOT, prova teórica on-line em 10/01/2027). Público secundário: ortopedistas
que vão fazer R4 ou a especialidade de Cirurgia da Mão.

A capa explica o projeto inteiro, porque costuma ser a única imagem que a pessoa vê: é um banco
de questões, de quais provas, com comentário de cada alternativa, o Cronograma com questões
diárias e a chamada para criar a conta. Carrossel de 5 slides (1080×1350) e 2 stories
(1080×1920), com telas reais do site (conta de exemplo, "tela ilustrativa").

```
npm run build && npx vite preview --port 4175        # em outro terminal
node marketing/instagram/telas.mjs "provas=treinar@.tr-foco__titulo" cronograma   # e a questão trauma-0012 respondida
# recortes 390x844 (3x) em marketing/instagram/telas/lu-questao, lu-conceito, lu-comentario, lu-cronograma
node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-10-06-anuncio-teot-tepot/post.html
```

"Faltam N dias" é calculado na hora de gerar. Gere de novo no dia de postar e a cada nova rodada
do anúncio.

Ordem do feed: f1 capa (o que é o Orto Questões), f2 Cronograma, f3 cada questão é uma aula,
f4 o que vem com a conta, f5 ingresso ("O show é em janeiro").

O Cronograma é função de assinante: leva o selo "Assinante" e a nota da prévia grátis (o dia de
hoje e as duas primeiras semanas).

## Legenda do feed

O TEOT e o TEPOT estão chegando: a prova teórica é em 10 de janeiro.

O Orto Questões é um banco de questões on-line para a ortopedia. Tem as provas anteriores do TEOT e do TARO, organizadas por tema, e também Cirurgia da Mão (com as questões de cirurgia plástica que caem na especialidade), Fellowship de Quadril, R4 Ombro e Cotovelo, R4 Coluna, R4 Quadril e ENARE R4.

Cada questão é uma aula: o tema explicado e cada alternativa comentada, a certa e cada errada com o porquê.

Quer garantir a nota? Comece a fazer questões desde já. O Cronograma divide o estudo até a prova em questões diárias, começando pelo que mais cai.

Crie sua conta e treine grátis todos os dias. Link na bio: ortoquestoes.com.br

#ortopedia #TEOT #TEPOT #residenciamedica #TARO

## Texto do anúncio (Gerenciador de Anúncios)

- Texto principal: "O TEOT e o TEPOT são em 10 de janeiro. O Orto Questões é um banco de questões on-line com as provas do TEOT e do TARO, Cirurgia da Mão (com cirurgia plástica), Fellowship de Quadril e R4, com cada alternativa comentada. O Cronograma te dá questões diárias até a prova. Crie sua conta e treine grátis todos os dias."
- Título: "Banco de questões para o TEOT e o TEPOT"
- Botão: "Cadastre-se" (ou "Saiba mais"), destino ortoquestoes.com.br
- Parâmetros de URL (campo do anúncio, em "Rastreamento"): `utm_source=instagram&utm_medium=anuncio&utm_campaign=teot-tepot`.
  Assim o painel (Crescimento > De onde vêm os cadastros) separa as contas que vieram deste anúncio.
- Link da bio do Instagram: `https://ortoquestoes.com.br/?utm_source=instagram&utm_medium=bio`

## Stories

- s1: a capa em pé. Serve sozinha como anúncio de story. O topo (cerca de 230 px) e a base
  (cerca de 260 px) ficam livres para o nome do perfil e o botão do anúncio.
- s2: o Cronograma. No story orgânico, colocar a figurinha de link para ortoquestoes.com.br
  abaixo do botão dourado.
