# Instagram do OrtoQuestões

Modelos em HTML para os posts do @ortoquestoes. Cada `<section id>` de um HTML vira um PNG:

```
node marketing/instagram/gerar.mjs marketing/instagram/casos/01-tcg/caso.html
```

Os PNGs saem em `saida/`, ao lado do HTML (fora do git). As fontes (Plus Jakarta Sans, Inter,
Caveat, Pixelify Sans, Playfair Display e Source Serif 4, licença OFL) estão em `fontes/`.

Ao entregar um post, mande também a legenda do feed como texto na conversa (além da `LEGENDA.md`):
no celular é mais fácil de copiar.

Regras da marca: sem emoji; não mencionar IA nos posts (só nos Termos e no Sobre); telas
com dados de exemplo levam a nota "Tela ilustrativa". Não citar o número total de questões do acervo:
o destaque é serem as questões das provas oficiais, comentadas (o número só aparece na página
de assinatura).

**Orientações gerais de marketing (público, horários, frequência, regras): [docs/marketing/orientacoes.md](../../docs/marketing/orientacoes.md).**

**Regras permanentes (mais novas que as seções abaixo; prevalecem sobre elas):**

- **Stories sem figurinha:** nada de quiz, enquete, sim/não, caixa de pergunta nem link (o
  Instagram entrega menos quando o story tira o usuário do aplicativo). O story é uma imagem
  simples para baixar e postar; a pergunta vai escrita e a resposta sai no story seguinte.
- **Sem desenho de anatomia:** nada de SVG ou CSS que imite osso, articulação, músculo, nervo ou
  vaso. Usar a imagem real da questão ou só texto com apresentação criativa; objeto simples
  (parafuso, ícone) só de vez em quando.

## Apresentação da plataforma (`apresentacao.html`)

7 stories (1080×1920): capa, Treinar, Comentários, Revisão, Desempenho, Ranking e chamada
final com espaço para a figurinha de link. As telas do celular vêm de `telas.mjs`, que abre
o site com uma conta de exemplo (Supabase simulado) e salva capturas em `telas/`:

```
npm run build && npx vite preview --port 4175   # em outro terminal
node marketing/instagram/telas.mjs '' treinar dados revisao ranking
```

## Marca (`marca.html`)

Foto de perfil (escura e clara) e a prévia do link (`saida/previa.jpg`, copiada para `public/` com
nome novo a cada troca). O nome é escrito por extenso, "Orto Questões"; o símbolo são três
alternativas com a certa em dourado. Não usar letra dentro de círculo.

## Relançamento (`relancamento/posts.html`)

Três posts de feed, cada um num estilo, para variar a grade: A apresentação (editorial claro),
B questão comentada (quiz escuro, Maisonneuve) e C contagem até a prova (dourado). Legendas e
ordem de postagem em `relancamento/LEGENDAS.md`.

## Stories de cadastro (`cadastro.html`)

2 stories (1080×1920) para levar a pessoa a criar a conta:

1. Contagem até a prova teórica do TEOT e do TEPOT 2027 (10/01/2027), "A prova está chegando.
   Comece a treinar hoje." e a tela inicial no celular. O número de dias é calculado no dia em
   que as imagens são geradas: gere de novo no dia de postar.
2. Os quatro passos (entrar no site, criar a conta grátis, fazer a primeira sessão, conhecer as
   funções e montar o Cronograma) e o endereço. Colocar a figurinha de link logo abaixo.

```
node marketing/instagram/telas.mjs ''
node marketing/instagram/gerar.mjs marketing/instagram/cadastro.html
```

## Stories do Cronograma (`cronograma.html`)

8 stories de venda (1080×1920) em folha de caderno pautado (linhas azuis, margem vermelha,
espiral, anotações à mão em Caveat, fita adesiva e post-it). Todos levam o selo verde
"Cronograma" no topo, e os passos abrem com "Como o Cronograma monta o seu estudo", para ficar
claro que a propaganda é de uma função do site:

1. A data oficial (prova teórica online do TEOT e do TEPOT 2027, SBOT, 10/01/2027) e o gancho
   "o site monta o seu estudo até lá", com
   post-it "faltam N dias". N é calculado no dia em que as imagens são geradas: gere de novo
   no dia de postar.
2. "Conheça o Cronograma": a função do site em destaque e os três passos.
3. Como ele escolhe (1): primeiro as áreas que mais caem (só as três primeiras visíveis).
4. Como ele escolhe (2): dentro da área, os assuntos que mais caem (Trauma adulto, três visíveis).
5. Como ele escolhe (3): toda semana diz o que entra e por quê (tela real da semana).
6. Como ele escolhe (4): e pesa o seu erro (tela real com a contagem até 10/01).
7. Linha do tempo de hoje até a prova (exemplo).
8. Chamada para a prévia grátis, com o preço do anual.

As telas vêm de `telas.mjs` (conta de assinante com cronograma até 10/01/2027; outra data com
`DATA_PROVA=AAAA-MM-DD`):

```
node marketing/instagram/telas.mjs cronograma semana
node marketing/instagram/gerar.mjs marketing/instagram/cronograma.html
```

No último story, colocar a figurinha de link para o site no espaço abaixo do endereço.

## Ranking e conquistas (`ranking/post.html`)

Carrossel de 3 slides no feed e os mesmos 3 em story, no visual pixel art da arena do
ranking (fonte Pixelify Sans, OFL, em `fontes/`): a novidade, como funciona (ranking, fogueira,
emblemas) e por que a constância ajuda. Telas, legenda e ordem em `ranking/LEGENDA.md`.
Para capturar uma tela de celular rolada até um elemento, `telas.mjs` aceita `nome=rota@seletor`.
Para a questão já respondida (comentário aberto), use `nome=questao/ID>B@seletor`, que escolhe a B
com "Certeza" antes de rolar; `LARGURA`, `ALTURA` e `ESCALA` mudam a tela (notebook: 1100, 688 e 2).

## Série "Caso para detetive"

Uma questão com imagem vira investigação: 4 alternativas = 4 suspeitos, cada pista
descarta um, até o veredito.

**Carrossel do feed (7 slides, 1080×1350):**

1. Capa: "Quatro suspeitos. Um culpado.", ficha da paciente e a primeira imagem.
2. Os suspeitos: as alternativas com um "perfil" curto; pede o palpite nos comentários antes de arrastar.
3. Pista 1: descarta o primeiro (carimbo "DESCARTADO").
4. Pista 2: descarta mais dois (carimbos "FORA") e mostra o placar de suspeitos restantes.
5. Pista 3: a prova final (ex.: lâmina) que entrega o culpado.
6. Veredito: carimbo "CULPADO" e o retrato falado para nunca mais errar.
7. Placar: "Em qual pista você cravou?", três níveis, pedido de comentário e marcação e o site.

**2 stories (1080×1920):** A mostra o caso com espaço livre para a figurinha de Quiz (4
opções, marcar a correta); B traz a resposta e o porquê das erradas, postado horas depois.

O conteúdo sai do comentário do site da questão (`public/acervo/comentarios/<tema>.json`).
Se o comentário estiver com `"conferido": false`, conferir o texto médico antes de postar.

Para um caso novo: copiar `casos/01-tcg/` para `casos/NN-nome/`, trocar `IMAGEM`, `W` e
`H` no script do fim do HTML, ajustar os recortes `data-crop="x y largura altura"` (em
pixels da imagem original) e os textos.

### Casos

| Nº | Questão | Prova | Ideia do jogo | Situação |
|---|---|---|---|---|
| 01 | `tumores-0065` | TEOT 2022 | Mulher, 30 anos, joelho: osteossarcoma, condroblastoma, condrossarcoma ou TCG. Pistas: idade, radiografia, RM e lâmina. | Publicado |
| 02 | `pediatria-0327` | TEOT 2025 | Radiografia de criança com seta: infecção, maus-tratos, tumor ou osteogênese imperfeita (resposta: maus-tratos). Pistas: onde está, o formato e o mecanismo. | Pronto (`casos/02-maus-tratos/`) |
| 03 | `pediatria-0449` | TEOT/TARO | Epifisiólise com a linha e o sinal desenhados: Klein, Scham ou Trethowan (resposta: Klein e Trethowan). | Próximo |
| 04 | `ombro-cotovelo-0309` | TECOC/SBCOC | Sinal radiográfico e diagnóstico: lightbulb, crescente, Mercedes ou Moloney (resposta: quebra da linha de Moloney, luxação posterior). Conferir se a imagem cadastrada corresponde à questão. | Ideia |
| 05 | `tumores-0203` | TEOT/TARO | Adolescente, 15 anos, dor no ombro: os mesmos suspeitos do caso 01, outro culpado (condroblastoma). Bom para retomar o retrato falado do TCG. | Ideia |

Outras candidatas: `pediatria-0102` (osteocondrose: Köhler), `pediatria-0194`
(Sinding-Larsen-Johansson e o mecanismo).

### Legendas

**Caso 02 (carrossel):**

> Uma seta. Uma denúncia.
>
> TEOT 2025: a banca aponta para um único detalhe na radiografia do joelho de uma criança pequena. Infecção, maus-tratos, tumor ou osteogênese imperfeita?
>
> Crave a letra nos comentários antes de arrastar. São três pistas até o veredito.
>
> Salve para revisar e marque quem da sua residência precisa ver esta.
>
> Treine grátis: o caminho está no nosso perfil, @ortoquestoes
>
> #ortopedia #TEOT #residenciamedica #ortopediapediatrica #traumatologia

**Stories do Cronograma:** sem legenda e sem figurinha (regra de 07/10/2026).

## Resumos de caderno (feed, 1080×1350)

Carrosséis de estudo no mesmo caderno pautado dos stories do Cronograma. Cada um em
`resumos/NN-tema/post.html`, com a legenda em `LEGENDA.md`:

```
node marketing/instagram/gerar.mjs marketing/instagram/resumos/01-supracondiliana/post.html
```

- **01 Supracondiliana do úmero na criança** (pronto): Gartland, raio X, nervos (pedra, papel,
  tesoura e OK), mão sem pulso, complicações e chamada para treinar.

## Classificação em pixel art (feed, 1080×1350)

Carrosséis no visual da arena do ranking, com um herói medieval em pixel art: a classificação
contada como as fases de uma aventura (vida em corações, o arco do pé como ponte de pedra),
seguida de uma questão de prova ("chefão final") e da resposta com o porquê das erradas. Os
sprites estão em `classificacoes/sprites.js` (mapas de caracteres, sem imagem externa).

- **01 Johnson e Strom** (pronto): disfunção do tibial posterior, questão `pe-tornozelo-0094`.
- **02 Lichtman, stories** (pronto): 3 stories (1080×1920) sobre a doença de Kienböck, com o
  semilunar como pedra em forma de lua que endurece, racha e desaba. Sem questão: o último story
  chama para o site; colocar a figurinha de link no espaço tracejado.

## Questões comentadas, visual profissional (feed 1080×1350 e stories 1080×1920)

Uma questão com imagem no estilo de revista clínica: papel claro, tinta verde, radiografia num
visor escuro com régua e legenda técnica, alternativas como gabarito de prova e uma tabela para
revisar. Cada uma em `questoes/NN-tema/post.html`, com legenda e instruções em `LEGENDA.md`.

- **01 Hawkins III** (pronto): `trauma-0764`, TEOT 2025, fratura do colo do tálus.

## Estilos oficiais (`estilos/`)

Jogo de cartas, Plantão das 3h14, Ache os 3 erros e Radar premium são estilos fixos da marca,
com modelo e ficha em `estilos/ESTILOS.md`. Radar premium é exclusivo para uma sequência de 4 stories,
com painéis arredondados, acabamento suave e metáfora visual de radar. Para o próximo post, sorteie
o estilo (aleatório, sem repetir o último) ou chame o estilo específico e crie a pasta já com o modelo:

```
node marketing/instagram/estilos/sortear.mjs criar <slug>
```

## Trio de 4/10 (`posts/2026-10-04-*`)

Três posts de feed, cada um com um formato novo, e três stories que os semeiam. Legenda e
instruções no `LEGENDA.md` de cada pasta.

- **Jogo de cartas** (`2026-10-04-trunfo`, 7 slides, pixel art): osteossarcoma, Ewing, TCG e
  condroblastoma como cartas com atributos, e uma rodada final de prova.
- **Plantão das 3h14** (`2026-10-04-plantao`, 5 slides): a conversa fictícia entre o R1 e o R3
  sobre síndrome compartimental na tíbia, com resumo para salvar.
- **Ache os 3 erros** (`2026-10-04-ache-o-erro`, 3 slides, caderno): o resumo de escafoide de um
  colega com três erros, a correção em caneta vermelha e o placar.
- **Stories** (`2026-10-04-stories`): um por post, cada um com espaço para figurinha de quiz ou
  enquete e chamada para o feed.

## Novas linhas (`posts/2026-10-04-novas-linhas`)

Anúncio das categorias novas (cirurgia da mão, R4 ENARE, R4 Coluna) no visual de mapa de metrô:
carrossel de 5 slides e 2 stories, sem números de questões.

## Arsenal aprovado: Cofre e Mecânica fina
Modelos aprovados por Tales em 11/10/2026: [Cofre de duas chaves](estilos/cofre-duas-chaves/modelo.html), seis imagens de feed, e [Mecânica fina](estilos/mecanica-fina/modelo.html), seis stories na versão final de mão. [Guia de escolha, adaptação e revisão para Claude/Codex](estilos/COFRE-E-MECANICA-FINA.md). Possibilidades do arsenal, sem obrigatoriedade de repetir. Copiar o HTML para uma nova pasta de post e gerar pelo script habitual.
