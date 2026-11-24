# Stories com alternativas (modelo aprovado)

Aprovado pelo Tales em 18/11/2026 ("salva isso no repositório como alternativa, stories com alternativas. Sempre
quando eu pedir, fazer algo parecido. A temática também adaptar"). É o formato de stories que **mais gerou
interação**: a questão com as alternativas escritas e a **enquete A, B, C, D do Instagram** colocada pelo Tales por
cima, numa área livre. Nasceu do story do osteoma osteoide (`png/referencia-osteoma-instagram.png`, 65% acertaram a
C) e virou modelo com a versão "tela do celular" da incidência de HEINIG.

**Quando usar:** sempre que o Tales pedir "stories com alternativas", "story com enquete", "com a caixinha do ABCD"
ou "igual àquele que deu certo". Fica **fora do rodízio** de `ORDEM.md`: entra a pedido. É a exceção aprovada à
regra "stories sem figurinha" (só a enquete das letras; figurinha de link continua proibida).

Modelo executável (3 stories, questão `trauma-0753`, TEOT 2025, variante "tela do celular"):

```
node marketing/instagram/gerar.mjs marketing/instagram/estilos/stories-com-alternativas/modelo.html
```

Prévias aprovadas em `estilos/stories-com-alternativas/png/`; post original em `posts/2026-11-18-vidro-heinig/`.

## O que não muda (a estrutura)

De 2 a 3 stories, nesta ordem:

| Story | Horário | O que leva |
|---|---|---|
| 1. A questão | 7h | Prova e ano (TEOT ou TARO de 2023 a 2025 de preferência), a imagem da questão, o enunciado igual ao acervo e **as quatro alternativas escritas por extenso**, com a letra em destaque. Embaixo, a **área livre para a enquete** e uma dica curta ("Vote na sua letra", "a resposta chega às 12h"). |
| 2. A resposta | 12h | A alternativa certa em dourado, **um trecho real do comentário com o livro** ("Segundo o Rockwood", "De acordo com o Campbell", "No Green"), a figura do comentário quando ajudar e uma linha por alternativa errada. |
| 3. O convite | 19h | O site gratuito: "Treine grátis", ortoquestoes.com.br escrito na imagem, "o caminho está no nosso perfil" e o que o site tem, com os nomes reais das páginas. Pode ir junto do story 2 quando o Tales pedir só 2. |

## A área da enquete (o ponto mais importante)

- **Nada desenhado.** Sem caixa, sem moldura, sem tracejado, sem cantos marcados e sem as letras "fantasmas":
  o Tales achou feio ("o Instagram nunca consegue preencher da maneira correta"). Só o **espaço vazio** e,
  em cima dele, a dica discreta com uma setinha.
- **Tamanho:** a enquete de 4 opções ocupa cerca de **480 × 450 px** no story de 1080 × 1920 (medido no print do
  osteoma). Deixe pelo menos **450 px de altura livre** abaixo da dica (no modelo, de 1440 a 1900 px), sem texto nem imagem
  importante por baixo; o fundo pode continuar (degradê, cenário).
- O Tales escolhe onde soltar a enquete; as alternativas escritas ficam **acima** da área, para que a enquete não
  cubra nenhuma delas.
- Na enquete do Instagram, as opções são só as letras **A, B, C e D**.

## O que muda a cada vez (a temática)

A temática **se adapta à questão e ao pedido**, sem repetir a mesma duas vezes seguidas. Exemplos:

- **Tela do celular** (o modelo): papel de parede em degradê nas cores do site (verde-noite, verdete, menta e um
  brilho creme-dourado), tela de bloqueio às 7:00 com a questão como **notificação** do Orto Questões (ladrilho
  como ícone, figura como anexo) e as alternativas como botões de vidro; central de notificações às 12:00 com a
  resposta e um aviso agrupado "Por que não as outras"; central de controle com os blocos das páginas reais
  (Treinar, Revisão, Caderno de erros, Simulados, Resumos, Flashcards, Cronograma, Atlas 3D). Sem logotipo ou nome
  de outra empresa.
- **Negatoscópio / filme de raio X** (o do osteoma): filme pendurado com prendedor, alternativas em tira de filme.
- Outras ideias que combinam: cartão de embarque, cardápio, placar, receituário, prontuário, painel de aeroporto.
  Qualquer estilo do arsenal (`ESTILOS.md`) serve de moldura, desde que a área livre da enquete exista.

Quando o Tales não pedir uma temática, use as **cores do site** com acabamento de vidro suave e degradê de cores
(nunca fundo branco chapado com manchas: ele achou feio) ou a tela do celular. Pixel art HD-2D só se ele pedir.

## Referência aprovada: a carta de domingo com a vitrine do site (22/11/2026)

O Tales aprovou ("esse ficou bem bom; lembre do caminho de como você fez, para quando eu pedir algo semelhante") o post
`posts/2026-11-22-carta-bayne-klug/` (questão `mao-0406`, TEOT 2025). É a régua para pedidos parecidos: questão com
enquete, resposta com o livro e um **story extra de propaganda com prints reais do site**.

**O visual que ele pediu e aprovou** (depois de achar a primeira versão quadrada e difícil de ler):
- cantos arredondados em tudo (carta 40 px, fotos e painéis 26 a 30 px, alternativas 28 px, selo arredondado);
- letra fácil: títulos e alternativas em Plus Jakarta, texto em Inter; a letra de mão (Caveat) só no cumprimento e
  na assinatura; nada de texto corrido em fonte decorativa;
- carta organizada em blocos: etiqueta, cumprimento, texto curto, foto com fita, enunciado com etiqueta da prova,
  alternativas grandes em 2 colunas; fundo em degradê verde do site com brilho dourado.

**Os 3 stories:**
1. A questão (manhã): a carta com a imagem da prova, o enunciado e as alternativas; área livre embaixo para a enquete.
2. A resposta (13h): a certa em dourado, a figura do livro com legenda em cada painel, o trecho "Segundo o Green"
   com a página, e uma régua visual que ensina a regra (no caso, "conte os ossos" de 1 a 4).
3. A vitrine (19h30, "P.S."): "Cada comentário é uma miniaula", montagem com prints reais e grandes do site,
   etiquetas das outras funções (Caderno de erros, Flashcards, Simulados) e o botão "Comece a treinar grátis",
   com "até 20 questões comentadas por dia" (`LIMITE_GRATIS_ATUAL` em `src/config.ts`) e "Telas ilustrativas".

**Os prints da vitrine (o que o Tales pediu para acertar):**
- **Resumo:** print do leitor **no computador**, largura toda do story, mostrando o título do capítulo e o primeiro
  parágrafo legíveis; de preferência o capítulo do mesmo tema da questão. Etiqueta "Resumos dos capítulos dos
  principais livros".
- **Atlas 3D:** o modelo **centralizado**, sem os painéis e menus em volta, com uma camada colorida ligada (artérias).
- **Cronograma:** o **calendário do mês** (botão "Abrir o mês inteiro" e o mês seguinte, que vem cheio de dias com as
  áreas coloridas), não o painel do celular.
- **Comentário:** o comentário real num iPhone (`posts/2026-11-13-errata-metastases/img/cel-certa.png`).
- Etiquetas nos cantos que não cobrem texto importante.

**Como capturar (passo a passo que funcionou):**
1. `npm ci --ignore-scripts` (se não houver `node_modules`), `npx vite build` e `npx vite preview --port 4175` em segundo plano.
2. Com `PASTA=<saída>/ TEMA=claro LARGURA=1440 ALTURA=900 ESCALA=2`, rodar o
   `posts/2026-11-22-carta-bayne-klug/capturar-telas.mjs` (conta de exemplo com cronograma montado, a partir de
   `marketing/instagram/telas.mjs`):
   `node capturar-telas.mjs calendario`, `CAMADA=Artérias node capturar-telas.mjs atlas` e
   `CAP=<id do capítulo em public/biblioteca/capitulos> node capturar-telas.mjs resumo`.
   No Atlas, fechar o tutorial com Esc (clicar no X derrubou a página).
3. Recortar com PIL na proporção exata de cada moldura do story (resumo do título até o fim do primeiro parágrafo;
   Atlas só o modelo; calendário a partir do título do mês) e conferir cada recorte antes de montar.
4. Gerar, conferir no tamanho real e nomear os PNGs com o dia (`dom22-1-questao.png` etc.).

## Regras que continuam

- **Nunca citar horário** (Tales, 23/11/2026): a questão sobe de manhã e a resposta sobe "à tardezinha", junto com a
  propaganda, sem hora marcada. Nada de "a resposta chega às 12h"; use "a resposta chega mais tarde" ou "volte à tarde".
  **Regra do story 3** (Tales, 23/11/2026): todo story 3 leva **sempre um print de um trecho do resumo** do mesmo tema;
  pode somar 1 ou 2 prints de outras páginas (Cronograma, Caderno de erros, Atlas 3D...), recortados com as bordas
  arredondadas, 2 ou 3 imagens no story. Também cabe um recorte e um recorte de comentário de outra questão da mesma área que cite o livro (TEOT de preferência).

- Questão real do acervo (`node marketing/kit/questao.mjs buscar <tema> --imagem`), inédita em `publicadas.md`, com
  enunciado, alternativas e gabarito iguais ao acervo. A busca do modelo: TEOT de 2023 a 2025, com imagem, quatro
  alternativas curtas e comentário citando um livro.
- Citação só do que está no comentário (livro, edição, capítulo e página quando houver). Comentário com
  `conferido: false` não é apresentado como revisado.
- Figura da prova pequena: use a mesma figura do livro, em alta, com a fonte escrita embaixo ("Figura da prova, a
  mesma do Rockwood…, Fig. 32-13A").
- Sem emoji, sem IA, sem número total de questões, sem figurinha de link, sem desenho de anatomia.
- O que importa entre 250 e 1580 px de altura (o topo e a barra de resposta do Instagram cobrem as pontas).

## Dia 27/11/2026 (Tales, 24/11/2026, versão final)

No dia 27 só propaganda, sem questão: plano anual por **R$ 239 no ano**, só nesse dia (o Tales configura o preço no
site). Mensagem: o preço mais baixo do mercado, sem citar nome nem preço de outros cursos. Peças em
`posts/2026-11-27-propaganda-anual/`. Fora desse dia, a frase segura é "não temos promoção no momento, mas garanto o
preço mais baixo do mercado".

## Conferência antes de entregar

1. `node marketing/instagram/gerar.mjs <post>/stories.html` e `python3 scripts/design/conferir_pngs.py <post>/saida --formato story`.
2. Abrir cada PNG no tamanho real: alternativas legíveis, área da enquete vazia e com 450 px ou mais, nada cortado,
   sobreposto ou órfão (palavra sozinha na linha).
3. Copiar os PNGs para a pasta do post, escrever a `LEGENDA.md` (ordem, horários, "colocar a enquete A, B, C, D na
   área livre"), registrar o id em `publicadas.md` e `{"estilo": "stories-com-alternativas"}` em `historico.json`.
