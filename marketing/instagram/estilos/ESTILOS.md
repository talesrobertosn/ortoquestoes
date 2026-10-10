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

## Regras permanentes (valem sobre qualquer instrução antiga deste guia)

1. **Stories sem figurinha.** Nada de quiz, enquete, sim/não, caixa de pergunta nem link: o
   Instagram entrega menos o story que manda o usuário para fora do aplicativo, e a ideia é
   baixar a imagem e postar rápido. O story é só a imagem: sem retângulo tracejado reservado.
   A pergunta vai escrita no story e a resposta sai no story seguinte (ou no feed).
2. **Sem desenho de anatomia.** Nada de SVG ou CSS que imite osso, articulação, músculo, nervo ou
   vaso: para uma marca de ortopedia, qualquer coisa parecida com erro anatômico é inadmissível.
   Usar a imagem real da questão (radiografia, foto da prova) ou só texto com apresentação
   criativa. Objeto simples (parafuso, placa, ícone de aviso) pode aparecer de vez em quando, com
   moderação.

Os posts e modelos antigos que ainda mostram espaço para figurinha ficam como histórico; ao
reaproveitar, tirar esse espaço.

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
- **Story semeador:** arena pixel art com as 4 cartas escritas (sem figurinha).

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
- **Story semeador:** tela bloqueada com a notificação (sem figurinha).

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
- **Story semeador:** folha de caderno com uma linha (sem figurinha).

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
- **Stories:** `s1-linha` é a capa com as linhas grandes; `s2-estacoes` lista as
  estações (sem figurinha nem link). Ficam no próprio `modelo.html`.

## 5. Cena do crime (`posts/2026-10-08-cena-do-crime-tornozelo/`)

**Ideia:** a questão vira investigação. A imagem da prova é a evidência presa num quadro de
cortiça, as alternativas são os suspeitos e a classificação é o "manual do detetive". Funciona
melhor com questões de imagem e classificação que reconstrói mecanismo (Lauge-Hansen, Weber,
Salter-Harris, Neer).

- **Quando serve:** a questão traz imagem; as alternativas são tipos de uma mesma
  classificação; e cada tipo deixa uma marca que dá para ver na radiografia (traço, desvio,
  direção da luxação). Melhores: Lauge-Hansen e Young-Burgess (ambas contam o mecanismo),
  Salter-Harris, Schatzker, Bado, Weber. Funcionam com algum ajuste: Garden, Neer, Mason,
  Hawkins, Sanders.
- **Quando não serve:** conduta, epidemiologia, anatomia decorada, questão sem imagem, ou
  alternativas que não são "suspeitos" da mesma família. Para essas, usar Plantão das 3h14 ou
  Ache os 3 erros.

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
  à tarde; sem figurinhas nem link.

## 6. Vitrine nos aparelhos (`posts/2026-10-09-ortoquestoes-simulados/`)

**Ideia:** propaganda de uma função ou novidade do site mostrada em telas reais dentro de um
iPhone e de um MacBook feitos em CSS (sem imagem de aparelho de terceiros).

- **Formato:** carrossel 1080×1350 de 6 slides e 3 stories 1080×1920, no fundo escuro da marca
  (verde-noite com dourado), Jakarta e Inter.
- **Estrutura:** capa com os dois aparelhos e a promessa → como funciona (passos numerados) → a
  tela no celular com o que reparar → o comentário em dois celulares → o notebook → chamada.
- **Telas:** `telas.mjs` captura a questão respondida com `nome=questao/ID>B@seletor`; para o
  notebook, `LARGURA=1100 ALTURA=688 ESCALA=2` (a 1440 a letra fica pequena demais no mockup).
- **Regras:** "Tela ilustrativa" em todo slide com tela; nas propagandas dos simulados, a nota de
  que as questões são autorais e sem vínculo com as instituições das provas.
- **Bom para:** novidades do site (simulados, Cronograma, Simulado Nacional, ranking) e anúncios
  pagos para quem ainda não conhece o Orto Questões.

## 7. Jornal (`jornal/`)

Modelo: `jornal/modelo.html` (original publicado: `posts/2026-10-07-diario-segond/`).

**Ideia:** a questão vira edição extra de um jornal fictício, o "Diário do Plantão": manchete,
foto com legenda (a imagem real da prova), classificados com os suspeitos e o veredito em
reportagem. Só tipografia e a imagem da questão, nenhum desenho.

- **Quando serve:** questão de imagem com alternativas que são achados ou sinais diferentes
  (cada um tem um "endereço" na imagem), ou questão só de texto que rende manchete.
- **Formato:** carrossel 1080×1350 de 5 slides, papel de jornal claro, Playfair Display nos
  títulos e Source Serif 4 no texto (OFL, em `fontes/`), Jakarta nos rótulos, vermelho só no
  chapéu e no carimbo.
- **Estrutura:** primeira página (manchete que não entrega a resposta, foto) → a pergunta como caiu
  e "comente a sua letra" → classificados (cada alternativa com o que é e onde aparece) → o
  veredito (resposta e mecanismo) → para a prova (tabela de endereços e frase para guardar).
- **Regras:** nome de jornal inventado, sem imitar jornal real; imagem só a da questão.

## 8. Cartaz de cinema (`cinema/`), só stories

Modelo: `cinema/modelo.html` (original publicado: `posts/2026-10-07-cartaz-triade-terrivel/`).
Aprovado como um dos melhores formatos: usar sempre que aparecer uma entidade com nome de filme.
Não entra no sorteio do feed; criar com `sortear.mjs criar cinema <slug>`.

**Ideia:** uma entidade com nome dramático vira filme de terror: elenco no topo, título enorme,
slogan, a questão como "roteiro" e a resposta nos créditos finais, com cena pós-créditos.

- **Quando serve:** nomes que já soam como filme (tríade terrível, luxatio erecta, Essex-Lopresti,
  fratura do enforcado, lesão de Lisfranc) e questões de sequência ou ordem, que viram "ordem de
  entrada em cena".
- **Formato:** 2 stories 1080×1920, fundo preto com luz vermelha, garras em CSS (efeito, não
  anatomia), título em Jakarta esticado na vertical; sem figurinha.
- **Estrutura:** `s1-cartaz` (elenco, título, slogan, enunciado e alternativas reais, "escolha o
  seu final", bloco de créditos com o mecanismo) → `s2-creditos` (spoiler, resposta, cada estrutura com seu papel,
  cena pós-créditos com outra questão da banca e o site).
- **Como trocar o filme:** elenco no topo = as três estruturas ou achados da questão; título =
  o nome da entidade (primeira linha pequena espaçada, segunda enorme em vermelho); slogan de
  três frases curtas, a última em negrito; "O roteiro" = enunciado e alternativas exatamente como
  no acervo; bloco de créditos com o mecanismo ("baseado em fatos reais"); no `s2-creditos`,
  "Resposta X" e cada estrutura com o seu papel ("abre o filme", "participação especial"), e a
  cena pós-créditos com outra questão da banca sobre o mesmo tema.
- **Regras:** conteúdo importante entre 250 e 1700 px de altura (fora das barras do Instagram);
  selo "R3" é piada e não imita classificação oficial; sem figurinha.

## 9. Receituário (`receita/`)

Modelo: `receita/modelo.html` (5 slides de feed e 2 stories; original: `posts/2026-10-08-receita-fratura-exposta/`).

**Ideia:** a questão vira uma receita médica para completar: o enunciado é a prescrição com as
palavras em dúvida circuladas em vermelho, e cada slide decide uma palavra. Só tipografia (papel de
receituário pautado, letra de médico em Caveat, o símbolo de receita em Playfair).

- **Quando serve:** questões de conduta e prescrição (antibiótico, dose, momento, via), e as de par
  2 por 2 em que cada atributo vira uma "palavra" da receita.
- **Estrutura (5 slides):** a receita incompleta com o gancho → a questão como caiu → 1ª decisão →
  2ª decisão (a pegadinha) → a receita completa, o carimbo da resposta e a frase para a prova.

## Stories semeadores (`stories/`)

Um story por estilo (1080×1920), postado 1 a 2 horas antes do post correspondente: faz a
pergunta e chama para o feed, sem figurinha (regra 1). Depois de publicar o post, pode
compartilhá-lo no story. Stories não levam legenda.
`stories/modelo.html` tem os três visuais (`s1-cartas`, `s2-plantao`, `s3-caderno`): apague as
seções que não for usar.

## Antes de publicar

- Conteúdo médico revisado (o post diz qual é a fonte: livro-texto ou questão `tema-NNNN`).
- Gerar as imagens e olhar uma a uma: texto cortado, sobreposição, acentos, contador "N/total".
- Registrar o post na seção "Estilos oficiais" do `README.md` se virar referência.

## Museu (`museu/`)

**Ideia:** a imagem real da questão vira obra de arte emoldurada numa galeria escura, com placa de
museu, audioguia e catálogo. Aprovado pelo dono em 08/10/2026 ("esse estilo aí é muito bom").

- **Formato:** carrossel de feed, 1080x1350, 6 slides; parede verde-carvão com luz de spot, rodapé
  de madeira, moldura dourada com passe-partout, placas em papel creme. Fontes Playfair Display
  (títulos, itálico dourado) e Source Serif 4 (texto).
- **Estrutura:** capa (obra + placa "Autor desconhecido" + gancho) → ficha da obra (questão inteira)
  → audioguia (3 faixas: o que observar) → atribuição (placa com a resposta) → catálogo (tabela que
  a prova cobra) → outras assinaturas (por que não são as outras) + "Para a prova".
- **Precisa de:** questão com imagem real (radiografia, ressonância, foto da prova). Imagem
  horizontal usa o `modelo.html` (pseudoluxação AC, o post aprovado); vertical, o
  `modelo-vertical.html` (lesão de Stener; essa questão já foi publicada, não repetir).
- **Criar:** `node marketing/instagram/estilos/sortear.mjs criar museu <slug>`.
- **Stories:** `s1` obra + "Quem assina?" + alternativas curtas; `s2` obra + placa com a resposta.

## GPS do nervo (`gps/`)

Passo a passo completo, em dupla com a Planta: [GPS-E-PLANTA.md](GPS-E-PLANTA.md).

**Ideia:** o trajeto de um nervo (ou tendão, ou artéria) vira navegação de GPS: faixa verde de
instrução ("Pegue a saída do ramo profundo"), mapa escuro abstrato só com ruas, linha azul da rota
e folha branca no rodapé. Nada de desenhar anatomia: a anatomia vem só da imagem real da questão,
mostrada como "câmera ao vivo do trecho".

- **Formato:** carrossel 1080x1350, 6 slides: capa (rota + "Ative o GPS") → questão com a câmera →
  rota completa passo a passo → "Você chegou" (resposta) → outras rotas (por que não são as outras)
  → acidente no trecho (se lesar) + para a prova + treine grátis.
- **Bom para:** trajetos de nervo, vias de acesso, pontos de compressão.

## Planta de engenharia (`planta/`, só stories)

**Ideia:** planta técnica azul com grade, para falar da **engenharia reversa** dos OrtoQuestões
Simulados: questões autorais feitas a partir do que as provas oficiais cobram.

- **Formato:** 3 stories 1080x1920: como nasce uma questão (3 passos) → a questão na "prancha" →
  resposta + "Treine grátis". Sem figurinha nem link.
- **Bom para:** divulgar os Simulados e novidades do acervo (ex.: a parte de anatomia).

## Cápsula (`posts/2026-10-10-bula-propaganda/`), propaganda de 3 segundos

Fundo amarelo com raios de cartaz, "QUESTÕES GRÁTIS" gigante (grátis em vermelho com contorno e sombra
preta), uma cápsula enorme verde e vermelha ("1 por dia · até a prova"), três etiquetas curtas
(Comentadas, Simulados, Ranking) e a faixa preta "Crie sua conta grátis · ortoquestoes.com.br".
Imagem única no feed e um story. Regra da propaganda: o que importa é lido em 3 segundos, grande e
colorido; nada de bloco de texto. A primeira versão (bula com texto pequeno) foi recusada por isso.
