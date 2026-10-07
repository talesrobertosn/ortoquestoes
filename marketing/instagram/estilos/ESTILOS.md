# Estilos oficiais de post

Os formatos de 4/10/2026 (o trio de estudo e o mapa de metrô das novidades) viraram estilos fixos da marca. Para variar a grade,
sorteie um estilo a cada post novo (aleatório, sem repetir o último) e acompanhe com o story semeador
do mesmo estilo.

```
node marketing/instagram/estilos/sortear.mjs                 # sorteia e mostra a ficha
node marketing/instagram/estilos/sortear.mjs criar lesao-de-monteggia   # sorteia e já cria a pasta do post
node marketing/instagram/estilos/sortear.mjs criar plantao lesao-de-monteggia   # escolhe o estilo
```

`criar` copia o `modelo.html` do estilo para `posts/AAAA-MM-DD-<slug>/post.html`, junto com uma
`LEGENDA.md` pronta para preencher, e anota o sorteio em `estilos/historico.json`. Depois é trocar
os textos (mantendo a estrutura e o CSS) e gerar as imagens:

```
node marketing/instagram/gerar.mjs marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html
```

Cada `modelo.html` é o post original completo: serve de referência de acabamento. Troque o
conteúdo, não o visual. Regras gerais da marca no `README.md` desta pasta (sem emoji, sem
mencionar IA, não citar o número total de questões).

---

## 1. Jogo de cartas (`cartas/`)

**Ideia:** diagnósticos que se confundem viram cartas colecionáveis com atributos, e a última
rodada é uma questão de prova.

- **Formato:** carrossel de feed, 1080×1350, 7 slides, visual pixel art da arena (fonte Pixelify
  Sans para títulos de carta, Jakarta e Inter no resto).
- **Estrutura:** capa ("Quatro X. Quatro cartas.") → uma carta por diagnóstico (4 slides) →
  rodada (o caso, com as cartas como alternativas) → resposta com o porquê.
- **Cada carta:** nome, desenho em pixel art (osso com a região em vermelho), 4 atributos fixos
  (idade, onde mora, imagem, lâmina ou equivalente) e o "golpe especial": o detalhe que decide
  a questão.
- **Bom para:** grupos de 4 que a banca troca entre si. Ideias: tumores de pequenas células,
  lesões benignas que imitam malignas, osteocondroses (Köhler, Freiberg, Sever, Osgood),
  displasias esqueléticas, artrites inflamatórias, lesões do plexo braquial.
- **Legenda:** "Quatro X. Quatro cartas. [caso em uma linha]." → o que decide a rodada → "jogue
  sua letra nos comentários" → salvar e marcar quem confunde A com B → site e hashtags.
- **Story semeador:** arena pixel art com figurinha de **Quiz** de 4 opções (as 4 cartas).

## 2. Plantão das 3h14 (`plantao/`)

**Ideia:** uma conversa de madrugada entre o R1 e o R3 que ensina uma conduta de urgência
pela dúvida que o R1 tem.

- **Formato:** carrossel de feed, 1080×1350, 5 slides, verde-noite com tela de celular.
- **Estrutura:** capa (hora grande + notificação do R1 com a dúvida errada) → conversa
  (balões, o R3 corrige) → conduta (o que fazer agora) → o número/critério que a prova cobra
  → resumo em 5 linhas para salvar, em cartão creme.
- **Regras:** pessoas e conversa fictícias (o rodapé diz isso); a dúvida do R1 é sempre o erro
  clássico da prova; horário diferente a cada post (ex.: 02h47, 04h05), sempre de madrugada.
- **Bom para:** urgências e condutas. Ideias: luxação do quadril (tempo até redução), fratura
  exposta (Gustilo e antibiótico), síndrome da cauda equina, artrite séptica do quadril na
  criança (Kocher), luxação do joelho e lesão vascular (ITB), epifisiólise instável.
- **Legenda:** a mensagem do R1 entre aspas → "Não está." + o detalhe que a banca cobra →
  "arraste para ler a conversa" → "o último slide é o resumo em 5 linhas" → site e hashtags.
- **Story semeador:** tela bloqueada com a notificação e figurinha de **Enquete** (Sim/Não).

## 3. Ache os 3 erros (`ache-o-erro/`)

**Ideia:** o resumo de caderno de um colega, com 7 linhas e 3 erros, que o leitor precisa achar.

- **Formato:** carrossel de feed, 1080×1350, 3 slides, folha de caderno pautado (letra Caveat).
- **Estrutura:** desafio (7 linhas numeradas, 3 com erro sutil) → correção em caneta vermelha
  (risca e reescreve as 3) → placar ("achou 3: pronto para a prova", etc.) e chamada.
- **Regras:** os erros são os que a banca troca nas alternativas (lado, número, epônimo,
  direção); as outras 4 linhas precisam estar 100% certas. Anotar na `LEGENDA.md` quais
  linhas são os erros e por quê.
- **Bom para:** temas com muitos detalhes decorados. Ideias: luxação perilunar, fratura do
  rádio distal (parâmetros radiográficos), DDQ (sinais e manobras), pé torto (Ponseti),
  Legg-Calvé-Perthes, lesões do LCA e do menisco.
- **Legenda:** "Seu colega fez um resumo de X. Sete linhas, três erros." → comente os números
  das linhas → "são os detalhes que a banca troca" → marcar o colega → site e hashtags.
- **Story semeador:** folha de caderno com uma linha e figurinha de **Enquete** (Certa/Errada).

## 4. Linhas do metrô (`linhas/`)

**Ideia:** cada categoria de prova é uma linha de metrô com cor própria, e cada instituição é uma
estação. Feito para novidades do site (nova categoria, nova banca, novo recurso).

- **Formato:** carrossel de feed, 1080×1350, 5 slides, papel creme quadriculado, Jakarta e Inter.
  Cores fixas das linhas: TEOT e TARO verde `#14655E`, cirurgia da mão mostarda `#C9952F`,
  R4 ENARE vermelho `#C8513C`, R4 Coluna azul `#2E64A8`.
- **Estrutura:** capa com as linhas empilhadas em letra grande (precisa ser lida na grade do
  perfil, sem abrir: é o post para fixar) → uma linha por slide com as estações (instituições)
  → como embarcar (tela ilustrativa do site) → chamada com os 4 trilhos no rodapé.
- **Regras:** sem números de questões; instituições como estações, com "e mais" em estação
  tracejada; a linha principal (TEOT e TARO) sempre aparece.
- **Bom para:** anunciar categorias, bancas ou recursos novos; post fixado do perfil.
- **Legenda:** "Novas linhas no Orto Questões." → o que entrou → onde marcar no site → marcar
  quem está indo para aquela prova → site e hashtags.
- **Stories:** `s1-linha` é a capa com as linhas grandes, **sem enquete**; `s2-estacoes` lista as
  estações e leva só a figurinha de **link**. Ficam no próprio `modelo.html`.

## 5. Cena do crime (`posts/2026-10-08-cena-do-crime-tornozelo/`)

**Ideia:** a questão vira investigação. A imagem da prova é a evidência presa num quadro de
cortiça, as alternativas são os suspeitos e a classificação é o "manual do detetive". Funciona
melhor com questões de imagem e classificação que reconstrói mecanismo (Lauge-Hansen, Weber,
Salter-Harris, Neer).

- **Formato:** carrossel 1080×1350, 6 slides, fundo escuro, fita amarela de isolamento, quadro
  de cortiça e polaroides com alfinete feitos em CSS, bilhetes adesivos em Caveat. O único SVG
  é o símbolo da marca.
- **Estrutura:** capa com a evidência → as evidências com perguntas neutras nos bilhetes →
  manual do detetive (a regra) → os suspeitos (enunciado real e alternativas em fichas, "comente
  sua letra antes de arrastar") → interrogatório (por que cada errada é inocente, carimbo verde)
  → veredito (carimbo vermelho, estágios e o que importa na prova e no plantão).
- **Regras:** não entregar a resposta antes do slide 5; carimbos fora do texto; enunciado e
  gabarito iguais ao acervo.
- **Stories:** `s1-cena` (a evidência e "a investigação está no feed") de manhã e `s2-veredito`
  à tarde; sem figurinhas nem link quando o pedido for "story normal".

## Stories semeadores (`stories/`)

Um story por estilo (1080×1920), postado 1 a 2 horas antes do post correspondente: faz a
pergunta, deixa um retângulo tracejado para a figurinha interativa e chama para o feed. Depois
de publicar o post, compartilhe-o no story com "resposta aqui". Stories não levam legenda.
`stories/modelo.html` tem os três visuais (`s1-cartas`, `s2-plantao`, `s3-caderno`): apague as
seções que não for usar.

## Antes de publicar

- Conteúdo médico revisado (o post diz qual é a fonte: livro-texto ou questão `tema-NNNN`).
- Gerar as imagens e olhar uma a uma: texto cortado, sobreposição, acentos, contador "N/total".
- Registrar o post na seção "Estilos oficiais" do `README.md` se virar referência.
