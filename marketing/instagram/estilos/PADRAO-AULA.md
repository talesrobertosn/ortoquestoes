# Padrão aula: o post que ensina de verdade

**Padrão oficial dos posts de questão desde 09/11/2026.** O Tales aprovou a campanha do índice de REIMERS
("esse eu queria que seja o nosso novo padrão para postagens"): a quantidade de texto, o tipo de explicação, a citação
do livro, o uso das imagens e a temática. Todo post de questão (feed e stories) segue este guia. Os estilos do arsenal
(`ESTILOS.md`, rodízio de `ordem.mjs`) continuam valendo, mas como **moldura** de uma aula como esta, nunca no lugar
dela.

Referência executável: [`posts/2026-11-09-reimers-var/`](../posts/2026-11-09-reimers-var/), com `campanha.html`
(7 slides de feed e 4 stories) e `LEGENDA.md`. Gere com
`node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-11-09-reimers-var/campanha.html`.

## Régua de qualidade: a Oficina do encaixe (10/11/2026)

O Tales aprovou a [Oficina do encaixe](OFICINA-DO-ENCAIXE.md) e pediu que **todo post a partir dela tenha a mesma
dedicação**: "que tudo seja extremamente bom assim e criativo". Na prática:

- **Arte própria em pixel art, pintada por código, com luz** (cenário e objetos), como em
  `posts/2026-11-10-oficina-encaixe/arte_oficina.py` e na skill `arte-hd2d`. Nada de fundo chapado com caixas de texto.
- **Tema que explica o termo** e objetos do tema fazendo o papel de cada medida ou conceito.
- **Imagens reais comparadas** (normal × alterada) e indicações sempre fora da radiografia.
- **Acabamento de objeto real** em cada peça (placa, papel, fita, filme, carimbo) e revisão no tamanho real, várias
  rodadas, até não sobrar nada sobreposto, cortado ou borrado. Não economize processamento nem tokens na arte.

## A ideia em uma frase

Quem nunca estudou o assunto olha o post, **entende, aprende e consegue explicar** depois. O conteúdo é pensado para
quem está começando (o nível de um R1), mas fala com todo mundo: **nunca escreva "R1", "para iniciantes" ou "aprenda do
zero" nas peças**.

## O que o Tales pediu, com as palavras dele (09/11/2026)

- "Tem que ser uma maneira que a pessoa consiga aprender do zero: ver, aprender, entender, explicar."
- "Usa a quantidade de palavras conforme necessário. Só não faz um slide só de texto."
- "Seja flexível em tudo. Coisas que precisam de mais atenção, dê mais atenção; as que precisam de menos, dê menos."
- "Se em algum momento ficar em dúvida se está certo ser flexível, me pergunte: dê a sua ideia e a gente conversa."
- "Revise antes de mandar, produza bem, nem que gaste mais."

## Roteiro da aula

A aula sobe um degrau por tela. Adapte à questão; não é molde fixo.

1. **O gancho com a metáfora.** A capa diz a pergunta em linguagem comum e já traduz a metáfora ("A bola saiu?":
   a bola é a cabeça do fêmur, o gol é o acetábulo). A imagem real da questão aparece grande.
2. **A questão como caiu.** Enunciado, figura e alternativas iguais ao acervo; "comente a sua letra".
3. **O porquê.** O mecanismo clínico que faz a pergunta existir (no REIMERS: adutores e flexores espásticos puxam a
   cabeça para fora, e o risco cresce com o GMFCS, num gráfico). Sem o porquê, o número não faz sentido.
4. **Como ler a imagem.** As referências explicadas uma a uma, com a figura do comentário quando ela ensina melhor
   (no REIMERS: o desenho normal × luxado com HILGENREINER, PERKINS e SHENTON) e um "como ler o desenho".
5. **O raciocínio ou a conta.** Passo a passo, com zoom na figura da questão e, se ajudar, um **exemplo resolvido**
   marcado como "exemplo" (6 ÷ 20 × 100 = 30%). A resposta aparece aqui.
6. **Treinar o olho e as pegadinhas.** Um segundo caso (outra imagem do comentário) e por que cada alternativa errada
   está errada, numa frase cada.
7. **O que fazer com isso + convite.** Os números que caem na prova, num visual (régua, placar, tabela curta), e o
   convite "Treine grátis".

**Stories: de 4 a 6, conforme a aula pedir** (Tales, 10/11/2026). É o que mais gente vê, então são a aula condensada: o problema e a pergunta; a leitura da
imagem; o raciocínio com a resposta; o que o número significa e o convite. Cada story com imagem ou gráfico.

## Quantidade de texto

- **Na medida.** O porquê e a leitura da imagem pedem duas a quatro frases; um rótulo pede três palavras.
- **Nenhum slide só de palavras.** Toda tela tem a figura, um zoom, um gráfico, uma régua ou um esquema.
- Frases curtas, em ordem direta; termos técnicos traduzidos na primeira vez ("adutores, os músculos que fecham a
  coxa").
- Tamanhos mínimos: corpo 22 a 30 px no feed e 25 a 34 px nos stories.

## Imagens

- **A da questão e as do comentário** (o Tales liberou as imagens das questões), sempre com a fonte escrita embaixo
  das que vêm de fora ("Fonte: PMC12690503", "Fonte: learningradiology.com").
- **Zoom por recorte** da figura original, sem desenhar nada sobre o osso. Figura pequena: amplie com Lanczos
  (2× a 4×) antes de usar e evite zoom que borre.
- Esquemas próprios **abstratos** podem e ajudam: bola cruzando a linha, régua de 0 a 100%, gráfico de barras,
  placar. Desenho de osso, articulação ou músculo continua proibido.

## Citação do livro

Toda tela de explicação leva, no rodapé, o livro e a página tirados do comentário ou do resumo do site
("Tachdjian's Pediatric Orthopaedics, 6ª ed., p. 1466"). Nada inventado: os números e as frases vêm do comentário da
questão e do resumo (`conteudo/biblioteca/`). Se o comentário tiver alerta ou estiver como `conferido: false`, não o
apresente como revisado.

## Temática

- Uma metáfora que **ajuda a entender**, dita já na capa e usada com leveza nas outras telas (no REIMERS, o VAR:
  linhas calibradas, replay, decisão). Se a metáfora precisar ser explicada, ela atrapalha: troque.
- Proponha a temática antes de produzir quando o Tales pedir brainstorm; ele recusa temas que não comunicam.

## Legenda

Abre com uma promessa direta ("Entenda de uma vez o índice de REIMERS."), explica o conceito em poucas frases e em
passos numerados, traz os números com a fonte, pede a letra nos comentários, sugere salvar e mandar para um colega e
leva ao perfil ("treine grátis, o caminho está no nosso perfil, @ortoquestoes"). Sem link, sem endereço do site, no
máximo 5 hashtags. A legenda sozinha precisa ensinar a quem não abrir o carrossel.

## Antes de entregar

- Abrir cada PNG no tamanho real e numa prévia reduzida: nada sobreposto, cortado ou borrado; texto legível no
  celular.
- Conferir enunciado, alternativas e gabarito com o acervo, e cada número com o comentário ou o resumo.
- Mandar as peças com a legenda pronta para copiar.

## Outras orientações do Tales que valem para posts (novembro de 2026)

- **Cirurgia da Mão** é especialidade com prova própria: fale em **prova de ingresso** e **prova de título**. O
  SIMÃO é um simulado da SBCM e não precisa ser citado; quando o Tales pedir, nem a SBCM.
- Em posts de propaganda, a mensagem principal vem no começo e no fim; a questão é só o "tira-gosto".
- Clareza primeiro: "o usuário não lê; tem que bater o olho e entender".
