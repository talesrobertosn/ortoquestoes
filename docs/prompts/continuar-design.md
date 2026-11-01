# Continuar o trabalho de design (passagem de bastão, 01/11/2026)

Leia este arquivo antes de mexer em design, arte ou nos bichos. Ele resume o que a conversa anterior fez e **como ela
pensava**, para você continuar no mesmo jeito.

## Como o Tales trabalha (e o que ele espera)
- Fala em português, curto, muitas vezes por voz (erros de digitação são normais). Responda em português, sem jargão.
- "Se for fazer algo preguiçoso, melhor nem fazer." Qualidade acima de tudo, principalmente na arte.
- Antes de mexer: **leia os arquivos** (DESIGN.md, PRODUCT.md, docs/design/DIRECAO-ARTISTICA.md, o componente).
  Faça um brainstorm interno e **decida sozinho**. Só apresente 3 ou 4 opções com recomendação quando ele escrever
  "brainstorm" (aí espere a escolha).
- **Sempre confira olhando:** `node scripts/capturar_telas.mjs <rota> <prefixo> --com-dados [--escuro] [--roteiro arq.mjs] [--pasta DIR]`
  gera prints de computador (1440) e celular (390). Para clicar nos bichos, use um roteiro
  (`export default async (pagina, foto, nome) => {...}`). Para fixar a hora, use `--agora 2026-11-01T21:00:00-03:00`.
  Não remova nós do DOM no roteiro: isso quebra o React e cria falsos bugs. Teste **celular e computador, claro e
  escuro**. A maior parte das reclamações dele é no celular.
- Mande os prints para ele (SendUserFile) e explique em poucas linhas.
- **Publicação:** só quando ele autorizar ("pode subir", "sobe tudo"). Com autorização:
  1. commit e push na branch;
  2. PR para `claude/pdfs-questoes-tp64dr` (a base, que publica no GitHub Pages);
  3. espere o check `verificar` ficar verde;
  4. faça o squash-merge com `expectedHeadSha`.

  Depois do merge, recomece a branch a partir da base com `git merge -s ours origin/<branch>` (force-push é negado).
  O teste `fixtures/testar_sincronia_aparelhos.mjs` pode falhar perto da meia-noite de Brasília: o relógio simulado dos
  aparelhos cruza o dia. Não é bug do PR; rode de novo longe da meia-noite.
- Antes de publicar: `npx tsc --noEmit -p .`, `npm test`, `npm run build` e `node fixtures/testar_orcamento_chunks.mjs`.
- Use agentes em paralelo para pintar cenários e para revisar bugs. Confira o resultado deles antes de usar.

## Regras de arte que não mudam
- A arte é feita **por código** (Python numpy + PIL), em pixel art "HD-2D": pintada em 480 px e ampliada 3x, com luz
  calculada por pixel, feixes, bloom, profundidade e sombras projetadas. A iluminação é o ponto forte. Também vale a
  arte que o Tales manda (PixelLab, ChatGPT): ele autoriza, ela fica no repositório e passa por um script de limpeza.
- Nada de emoji, símbolo religioso, anatomia desenhada em CSS/SVG ou texto em inglês na arte.
- **Nada cobre os bichos nem os balões deles.** Os bichos ficam sempre **pousados em algo firme** (a coruja nunca no ar).
- A tela começa limpa; o movimento é calmo (no celular, quase parado; "dá tontura" foi uma reclamação real).

## Os bichos (point and click)
- **Coruja** (`src/biblioteca/sala/CorujaPixel.tsx`, folha `public/pixel/mascote/coruja-nova.png`, gerada por
  `scripts/sprites/coruja_nova.py` a partir do PixelLab):
  - É a sábia: cada toque explica um conceito de prova (`CONCEITOS_CORUJA` em `src/componentes/mascote/falasBichos.ts`, 110 frases).
  - O script recorta cada linha da folha pela faixa real de pixels desenhados e alinha pelos pés.
  - O fundo transparente é só o que encosta na borda do quadro (antes apareciam buracos brancos).
  - Ao trocar a folha, suba o `?v=` em `SPRITE_CORUJA`.
- **Gato** (`GatoPixel`, `public/pixel/mascote/gato-fofo.png`):
  - É o preguiçoso: `FALAS_GATO` (46 frases).
  - As poses de transição (acordando, espreguiçando) tocam uma vez e param no último quadro.
- **Um bicho fala de cada vez.** O balão procura um lugar livre (`planejarBalao` em `CenaDiorama.tsx`): desliza, sobe ou desce, e desvia de textos, cartões e dos outros bichos. Se não couber perto, o gato anda até um canto onde caiba.
- **No menu** (`src/componentes/portal/Visitantes.tsx`):
  - A coruja fica no cabeçalho e o gato no rodapé.
  - No celular, a fala vira uma caixa de diálogo única (retrato, nome, frase e X), abaixo da busca.
  - O topo do menu mostra a chama da sequência, o cumprimento e o andamento de hoje (`FogueiraDoMenu.tsx`).
- **No ranking** (`src/componentes/cem/SalaoCem.tsx`): o gato e a coruja ficam juntos no chão, à direita do pódio.
- **Na Biblioteca** (`src/biblioteca/sala/`):
  - No celular, a cena fica calma e mostra a sala da janela à estante.
  - No tema escuro, a luz é a da noite.

## Página inicial: cinco cenários em rodízio
O contrato completo está em `docs/design/DIRECAO-ARTISTICA.md` (seção "Cenários da página inicial").
- **Os cenários:** acampamento (com a **espada fincada na fogueira**, o easter egg de Dark Souls), forja, cais,
  observatório e neve. Os scripts ficam em `scripts/cenarios/inicio_*.py` e os pontos dos bichos em `scripts/cenarios/cena-*.json`.
- **A lista e a troca:** a lista e a regra de troca ficam em `src/componentes/inicio/cena/cenarios.ts`. O dia é
  dividido em fatias iguais, e a ordem anda um passo por dia. Para testar um cenário, use `?cenario=forja` ou `sessionStorage['inicio:cenario']`.
- **Cenário novo:** o fogo animado fica em x 220-260, y 104-152; o esqueleto em x 262-308, com os pés em y 163; o lado
  esquerdo fica calmo para o texto; no celular só aparece x 140-340.

## Pendências conhecidas
- A **coruja nova feita no ChatGPT** ainda não entrou, porque a imagem só chegou como prévia. Peça para ele mandar a imagem
  sozinha numa mensagem. Depois, adapte `scripts/sprites/coruja_nova.py` à grade dela (8 linhas x 5 quadros) e suba o `?v=`.
- Para sprites novos, o Tales gosta de usar o ChatGPT: escreva para ele um prompt pronto (grade fixa, fundo liso, sem
  texto, mesma linha de chão, objetos iguais em todos os quadros).
