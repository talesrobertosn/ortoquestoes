# Oficina do encaixe: modelo aprovado

Aprovado pelo Tales em 10/11/2026 ("lindo"; "ficou bastante bom, pode adicionar isso no padrão... que tudo seja
extremamente bom assim e criativo"). É, ao mesmo tempo, um **estilo do arsenal** (stories) e a **régua de qualidade**
de todo post daqui em diante: o nível de acabamento desta campanha é o mínimo, não o teto. Siga também
[PADRAO-AULA.md](PADRAO-AULA.md), que define a aula; este guia mostra como a arte chega lá.

Referência executável: [`posts/2026-11-10-oficina-encaixe/`](../posts/2026-11-10-oficina-encaixe/) (questão
`trauma-0187`, TEOT 2022, parâmetros radiográficos do tornozelo):

```
python3 marketing/instagram/posts/2026-11-10-oficina-encaixe/arte_oficina.py   # pinta a arte em arte/
node marketing/instagram/gerar.mjs marketing/instagram/posts/2026-11-10-oficina-encaixe/stories.html
```

## Por que funcionou

1. **A metáfora explica o próprio termo.** "Mortalha" é o nome do encaixe na marcenaria, então o tema não enfeita:
   ensina. O tálus é a espiga, tíbia e fíbula são a mortalha, e cada medida tem a sua ferramenta (paquímetro para os
   milímetros da sindesmose, transferidor para o ângulo talocrural, esquadro e etiqueta de tolerância no fim).
2. **Arte pintada pixel por pixel, por código** (`arte_oficina.py`, mesma técnica de `.claude/skills/arte-hd2d/`):
   - o cenário de fundo em 360 x 640 ampliado 3x, com luz calculada: parede de tábuas com veio ondulado e nós, travessas
     pregadas, janela com o sol da tarde em feixes com poeira, prateleira com potes de parafusos, lata e plaina,
     ferramentas penduradas, bancada de faia com maravalhas, macete, lápis, régua e um bloco com a mortalha riscada;
     sombras de contato, mancha de sol, brilho, correção de cor e vinheta;
   - os objetos soltos em PNG transparente, cada um com 4 a 6 tons por material, contorno e brilho: o encaixe de espiga
     e mortalha em isométrico (veio reto nas faces, anéis no corte), o paquímetro com escala e nônio, o transferidor de
     latão graduado, o esquadro, o grampo, o lápis de carpinteiro, a etiqueta kraft com ilhós e barbante.
3. **As imagens reais estão no centro da aula:** a figura da prova e as radiografias que o Tales mandou (normal e
   alterada), presas como filmes na folha de croqui. Comparação lado a lado (normal × lesão, espaço claro ×
   sobreposição) ensina mais que qualquer texto. Nas radiografias, só recorte, zoom e moldura; indicações (setas) ficam
   do lado de fora da imagem.
4. **Uma lição por story, numerada** ("Lição 1 · o nome já explica"), com título curto, duas a quatro frases que
   traduzem o termo, o número que cai na prova e o livro com a página no rodapé. A questão aparece logo no segundo
   story e a resposta chega quando a pessoa já sabe ler as medidas.
5. **Acabamento de objeto real em cada detalhe da interface:** placa de latão com parafusos no cabeçalho, folha de
   croqui quadriculada com fita crepe, anotações à mão em Caveat (azul e vermelho de lápis), filmes com faixa de
   identificação onde o grampo morde, carimbo da resposta, ficha final em etiqueta de papel.

## Roteiro (6 stories, ajuste à questão)

1. **O conceito pela metáfora** (o objeto em pixel art grande + as incidências normais).
2. **A questão como caiu** (figura, enunciado e alternativas iguais ao acervo).
3. **Primeira medida com a primeira ferramenta**, comparando duas imagens.
4. **Segunda medida com a segunda ferramenta + a resposta** e por que cada errada erra.
5. **A medida vizinha que a prova também cobra** (normal × alterada) e o número que dá peso a ela.
6. **A ficha de tolerâncias** (todas as medidas e valores) + "Treine grátis" e o site.

## Como reaproveitar em outro tema

Troque o ofício, não o nível. Ideias com a mesma força: relojoaria (mão, punho), alfaiataria (moldes, ângulos),
carpintaria naval (coluna), laboratório de ourives (pequenos ossos), oficina mecânica (biomecânica do joelho). O que
precisa continuar igual: metáfora que explica o termo, arte própria em pixel art feita por código com luz, imagens
reais comparadas, uma lição por tela, livro e página, e revisão no tamanho real até não sobrar nada sobreposto,
cortado ou borrado.

## Revisão obrigatória (o que foi corrigido nesta campanha e não pode voltar)

- Texto encostando em imagem ou em objeto; legenda quebrando em duas linhas em cima de outra coisa.
- Grampo, lápis ou ferramenta cobrindo o osso: o grampo morde a faixa de cima do filme, por fora da imagem.
- Zoom por CSS que vaza do quadro: recorte a imagem em Python antes (`img/*-zoom.png`).
- Números do material enviado diferentes do livro do comentário (6 mm × 5 mm): siga o livro e diga, numa linha, que
  outras referências usam outro corte.
