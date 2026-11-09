# Abrigo das Águas — aprovado em 09/11/2026

Tales aprovou a prévia do pátio molhado com arco de pedra, lago, castelo, fogueira com espada e os três mascotes oficiais. Pediu publicá-la e organizar um sorteio por horário, igual para todo mundo.

## Arte e montagem

- Fonte reproduzível: `scripts/cenarios/inicio_abrigo.py`, usando os pincéis do acampamento e a paisagem do cais. Semente 20261109; pixel art 480×200, iluminação em float 3×, sombra dos pilares, reflexo do céu/castelo no lago, luz quente, névoa e bloom controlado.
- Seis WebPs: manhã/tarde/noite, 1440×600 e 960×400. A pintura contém pedras, lenha e cinzas; personagens, espada e chama são camadas React, preservando cliques, falas e os oito estados do fogo. Não pintar chama ou personagem duplicado no fundo.
- Âncoras próprias: fogo (274,151), mascote (293,103,42,60); gato inicialmente no tapete (222,149), coruja no pedestal (370,101), com alternativas livres. JSON em `scripts/cenarios/cena-abrigo.json`; contrato no catálogo `cenarios.ts`.
- No celular, o recorte acompanha o centro do abrigo (x≈300), para os três personagens ficarem à vista. Os cenários anteriores mantêm seus pontos e recortes.
- Tema da interface continua separado da iluminação do cenário. A preferência existente por manhã/tarde/noite permanece; o terreno sorteado é compartilhado.

## Rodízio compartilhado da inicial

Seis faixas fixas, no fuso **America/Sao_Paulo**: 00–04h, 04–08h, 08–12h, 12–16h, 16–20h e 20–24h. A lista de seis cenários é embaralhada uma vez por data com Fisher–Yates e gerador determinístico semeado pelo dia. Todos os aparelhos calculam a mesma ordem; não depende do fuso local, da conta, de `Math.random()` ou de armazenamento por visita. Cada cenário aparece uma vez por dia, permanecendo nas recargas até a próxima faixa.

O temporizador troca na virada da faixa. Ao voltar à aba ou janela, recalcula o cenário vigente; a troca remonta o palco para não carregar posições, balões ou animações do cenário anterior. A prévia explícita `#/?cenario=abrigo` continua disponível; a antiga preferência oculta `sessionStorage['inicio:cenario']` não interfere mais no rodízio normal. Não é necessário banco, RPC ou SQL.

## Validação

`fixtures/testar_cenarios_inicio.mjs`: quatro fusos, 120 dias sem repetição dentro do dia, limites exatos, recargas, catálogo imutável e as 36 imagens dos seis cenários. Incluído em `npm test`.

`fixtures/e2e_abrigo_inicio.mjs`: manhã/tarde/noite, imagem carregada, um mascote por tipo, presença dos bichos, pausa na fogueira e ausência de transbordamento de 320 a 1920 px. Temas claro/escuro e visitantes/contas, com API fictícia.

`fixtures/e2e_sorteio_inicio.mjs`: virada automática da faixa sem recarregar, reload estável e correção ao recuperar foco, usando relógio simulado.
