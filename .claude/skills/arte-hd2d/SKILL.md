---
name: arte-hd2d
description: Fluxo de arte do Orto Questões aprovado pelo Tales (30/10/2026) — cenários pixel art "HD-2D" (estilo Octopath Traveler) pintados por código com luz calculada, o mascote esqueleto chibi em SVG e a montagem nas telas. Use SEMPRE que o Tales pedir arte, ilustração, cenário, fundo, pixel art, "estilo HD-2D/ray tracing/Octopath", mascote, ou "deixar mais bonito" alguma tela, banner ou post do site.
---

# Arte HD-2D do Orto Questões

O Tales disse (30/10/2026): "agora está do jeito que eu sempre quis". A arte é o ponto forte do site e o que vende.
**Não economize processamento nem tokens na arte.** Detalhe extremo, mesmo em coisas simples.

Antes de pintar, leia `DESIGN.md` (raiz): a arte é a camada colorida; a interface em volta segue os tokens dele.

## Regras que não mudam

1. **Arte original, feita por código.** Cada pixel sai de um script Python (numpy + PIL) do repositório. Nada baixado,
   nada de IA de imagem, nenhum personagem de terceiros. Se ele mandar imagens de referência, faça um personagem ou
   cenário **original no mesmo estilo**, nunca uma cópia.
2. **Nomes claros, fantasia só na arte.** Botões e títulos com os nomes reais do site (Treinar, Revisão, Resumos...).
   Ortopedista precisa entender tudo sem traduzir a fantasia.
3. **Toda funcionalidade continua.** Redesenhar nunca tira botão, link, número, regra de tato ou função.
4. **Prints antes de publicar** (computador e celular, claro e escuro; manhã, tarde e noite quando houver). Publicar
   só quando ele autorizar ("pode subir").
5. **Ele pediu brainstorm?** Apresente e espere. Senão, decida e faça (brainstorm interno, como em CLAUDE.md).

## O estilo (referências vivas)

Leia os scripts antes de pintar qualquer coisa nova e copie a técnica (cada script é autossuficiente):

| Cenário | Script | Saída |
|---|---|---|
| Acampamento do topo (3 horas do dia) | `scripts/gerar_cena_inicio.py` | `public/pixel/inicio/cena-{manha,tarde,noite}[-960].webp` |
| Gabinete de anatomia (Atlas 3D) | `scripts/gerar_cena_atlas.py` | `secao-atlas[-960].webp` |
| Salão da biblioteca (Resumos) | `scripts/gerar_cena_biblioteca.py` | `secao-biblioteca[-960].webp` |
| Arena e salão dos troféus | `scripts/gerar_cena_arena.py` | `secao-arena`, `secao-trofeus` |
| Torre do relógio, baú, correio | `scripts/gerar_cena_vila.py` | `secao-torre`, `secao-bau`, `secao-correio` |
| Fogo da sequência e tochas | `scripts/gerar_sprites_inicio.py` | `fogo.png`, `tocha.png` |

A técnica, em ordem:
1. **Pintar em pixel art pequena** (ex.: 480 x 160 ou 480 x 200), camada por camada (fundo, meio, objetos, frente),
   com classe `Camada`, ruído controlado (sementes fixas) e objetos com 3 a 7 tons, contorno e textura (madeira, pedra,
   musgo, tecido, metal com brilho, lombadas uma a uma).
2. **Ampliar 3x** e montar com luz calculada por pixel: desfoque por camada (profundidade de campo: fundo e primeiro
   plano desfocados, foco no meio), luzes pontuais quentes (vela, lamparina, fogueira) com borda em faixas, sombras
   projetadas, feixes de luz volumétricos com poeira, luar frio, bloom, mapeamento de tom (não estourar), correção de
   cor (altas luzes quentes, sombras frias), vinheta e grão leve. Use desfoque em float para luzes acima de 1.
3. **Composição para a interface:** o lado da tela onde vai texto (em geral os 40–45% da esquerda) fica mais calmo e
   escuro, com detalhe mas pouco contraste; os focos (o objeto principal, a luz mais forte) do centro para a direita.
4. **Exportar webp** em 1440 de largura e uma versão de 960 para o celular (qualidade 82–85, menos de ~200 KB cada).
5. **Revisar olhando** (ferramenta Read no .webp, também recortes ampliados), criticar com honestidade (detalhe,
   drama da luz, áreas chapadas ou borradas, emendas entre camadas) e repetir **pelo menos 4–6 rodadas**.

Para várias cenas independentes, pinte em paralelo (um agente por cena), com este arquivo e os scripts como referência,
e confira cada resultado antes de usar.

## O mascote

Esqueletinho original de armadura (crânio grande com rachadura, órbitas pretas grandes, expressão séria, ombreira,
cinto e pano vermelho), em pixel art HD-2D: `scripts/gerar_mascote.py` gera `public/pixel/mascote/esqueleto.png`
(uma linha por comportamento, 8 quadros de 96 x 128) e `gato.png`; a lista das linhas fica em
`src/componentes/mascote/sprites.ts`. Use `<Mascote />` em qualquer tela: `comportamento` fixo, `fantasia`
(`halloween` em outubro, automático: manto de capuz, foice, lanterna de abóbora, castiçal e morcegos), `falar={false}`,
`interativo={false}` (dentro de link). Falas em `falas.ts`. O Tales recusou: touca, sorriso/expressão feliz, bochecha
rosada, esqueleto realista grande, versão vetorial "chapada" (também a de traço limpo, em 31/10/2026) e sorvete.
Rosto escolhido em 31/10/2026 ("modelo E"): três-quartos para a esquerda, sem dentes, órbita grande com aro de osso
claro e a outra estreita na borda, fundo cinza-escuro sem brilho, nariz pequeno embaixo à esquerda (`ROSTO=tres_quartos`,
o padrão do script; os outros modelos ficam no script só para comparação). Antes de mudar o rosto, mande modelos lado a lado. Comportamento novo = nova linha no script +
`sprites.ts` + 8 a 10 falas. No cenário, o mascote e o gato recebem a luz da hora do dia (filtros em `InicioHd.css`).

## Montar na tela

- Cenário como fundo: variáveis `--cena-*` com `urlCss()` (url absoluto) e o véu escuro do lado do texto
  (ver o fim de `src/estilos/paginas/InicioHd.css`).
- Objetos animados por cima do cenário (fogo, mascote, gato) num "palco" com a proporção da arte
  (`CenaDiorama.tsx`): posições em % da arte, então o que a pintura deixa livre precisa bater com essas posições.
- Interface no estilo dos jogos: vidro escuro com filete dourado e losangos nos cantos, botão de cristal, barras com nome
  claro, fonte pixel só em títulos curtos. Acessível: texto real, arte com aria-hidden, teclado, "menos animação".
- Conferir com `scripts/capturar_telas.mjs` (`--agora` para manhã/tarde/noite, `--escuro`, `--roteiro`) e mandar os
  prints; depois `npm test` e `node fixtures/testar_orcamento_chunks.mjs`.
