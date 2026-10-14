# Monstros novos e bestiário com arte nova

Este guia vale para qualquer agente: Claude Code, Codex ou ChatGPT.

- **Pedido do Tales (14/10/2026):** "modelos de monstros para inspirar, se inspire em todos, podendo assumir vários estilos artísticos diferentes".
- **Plano geral:** este trabalho são as ideias 52 a 57 e 79 de [../PLANO-DE-IDEIAS.md](../PLANO-DE-IDEIAS.md).
- **Ao terminar um monstro:** marque-o na tabela abaixo e no plano.

## Regras que não mudam

- **Arte só nossa:** pintada por script em `scripts/sprites/`. Não use imagem baixada, gerada por IA nem copiada das referências. As referências servem para estudar forma, paleta e leitura, não para decalcar.
- **Nomes e humor ortopédicos:** os nomes seguem o tom do bestiário, como "Goblin da Fratura" ou "Esqueleto do Metacarpo". Os desenhos não mostram anatomia realista nem sangue.
- **Gabarito e questões:** não mexa em questões, gabaritos e comentários. O bestiário só muda a aparência e o sabor.

## As referências que o Tales mandou (descrição, porque as imagens não estão no repositório)

1. **"Seabed objects pixel art".** São pixel art detalhados, de uns 48 a 64 px, com contorno escuro colorido e luz do alto à esquerda:
   - estátua de sereia em pedra clara;
   - caranguejo vinho com manchas claras e pinças escuras;
   - recife de coral com corais vermelhos;
   - concha-casa roxa listrada com porta de madeira;
   - casco de tartaruga verde, âncora, conchas, cristal azul, estrela-do-mar e esqueleto de peixe.

   **Lição:** muitos tons por material, de 5 a 6, e textura de manchas e listras sem virar ruído.
2. **Brutamontes verde.** Pixel art "HD" de uns 64 px, com estes traços:
   - corcunda e braços longos;
   - pele verde-escura com placas;
   - boca enorme com dentes e baba azul;
   - faixas douradas nos braços;
   - espinhos nas costas;
   - leitura pela silhueta: massa grande em cima e pernas curtas.
3. **Goblin minimalista.** Uns 24 px, verde-limão chapado, olhos semicerrados, orelhas pontudas, tanga marrom e porrete com cravos. Tem contorno escuro esverdeado, poucos tons (2 ou 3) e sombra elíptica no chão.

   **Lição:** carisma com pouquíssimos pixels, muito parecido com o nosso cavaleiro chibi.
4. **"Low level monster icons", 32×32.** Cores saturadas e contorno escuro, em cinco bichos:
   - cogumelo-aranha de chapéu vermelho com pintas e pernas de osso;
   - slime verde com uma espada cravada e olhos laranja;
   - planta carnívora com boca aberta;
   - mandrágora-cebola com cara brava e raízes;
   - abóbora com tentáculos de folha.
5. **Quatro inimigos pequenos, de uns 32 px, com paleta terrosa e sóbria:**
   - esqueleto com escudo redondo e espada curta;
   - goblin com adaga, olhos amarelos e postura de ataque;
   - cogumelo com olhos vermelhos e corpo bege;
   - toco de árvore com um olho só e galhos como garras.

**Vários estilos, como pediu o Tales.** Cada família pode ter o próprio estilo, desde que caiba na mesa:
- **Chibi carismático (ref. 3):** goblin, cogumelo, mandrágora, abóbora.
- **Detalhado de muitos tons (refs. 1 e 4):** caranguejo, planta carnívora, slime da espada.
- **Brutamontes HD (ref. 2):** chefes e elites grandes.
- **Sóbrio e terroso (ref. 5):** esqueleto, toco, catacumba.

**O que todos devem ter:**
- contorno escuro colorido (nunca preto puro);
- luz do alto à esquerda;
- sombra no chão;
- leitura clara em 2× e 3×, na escala do jogo.

## O que já tem arte nova e o que falta

O formato de cada folha é o do motor: uma linha por animação, mais um `.json` ao lado e o índice `src/flashcards/efeitos/assados.ts`. As animações obrigatórias são:

| Animação | Quadros |
|---|---|
| `parado` | 4 |
| `preparo` | 3 |
| `golpe` | 6 |
| `dano` | 3 |
| `derrota` | 5 |
| `vitoria` | 4 |

O quadro típico é de 128×128, com a âncora nos pés.

| Sprite (bestiário) | Situação | Estilo sugerido | Inspiração |
|---|---|---|---|
| golem, serpente, guardião, dragão, gosma (e variantes) | ✅ assados | já definidos | — |
| herói (6 estágios) | ✅ chibi | `cavaleiro_chibi.py` | — |
| **goblin** (Goblin da Fratura) | ✅ chibi (14/10) | `goblin.py` | verde-limão, olhos semicerrados, faixa de gesso, tala no braço, porrete com parafusos de osso |
| **esqueleto** (Esqueleto do Metacarpo) | ⬜ | sóbrio e terroso | ref. 5: escudo redondo de madeira e espada curta |
| **ent** (Guardião da Fise, chefe) | ⬜ | brutamontes HD | refs. 5 e 2: toco com um olho só, galhos-garra, musgo |
| raptor, corvo, morcego, aranha, escaravelho | ⬜ | detalhado | ref. 1 (manchas e carapaça); a aranha pode virar o "cogumelo-aranha" da ref. 4 |
| mímico | ⬜ | detalhado | baú com dentes e língua (já há a mandíbula em `vfx.py`) |
| cavaleiro, rei, arconte, espectro, quimera, harpia, mão, leviatã | ⬜ | brutamontes HD (chefes) | ref. 2: massa, placas, faixas douradas |
| **novos:** cogumelo saltitante, mandrágora, planta carnívora, abóbora, caranguejo, slime da espada | ⬜ ainda não existem | chibi (cogumelo, mandrágora, abóbora); detalhado (planta, caranguejo, slime) | refs. 1 e 4 |

### Ideias de nome para os novos

Seguem o humor do bestiário:

| Monstro | Nome sugerido | Ideia |
|---|---|---|
| Cogumelo saltitante | **Cogumelo da Necrose** | andar do Jardim, comum e quase fofo |
| Mandrágora | **Mandrágora do Enxerto** | grita no crítico e assusta o herói |
| Planta carnívora | **Dioneia da Cartilagem** | morde duas vezes |
| Abóbora | **Abóbora do Halloween Ortopédico** | evento sazonal, só em outubro |
| Caranguejo | **Caranguejo do Gesso Fechado** | andar da praia secreta; armadura alta, anda de lado |
| Slime da espada | **Slime do Pino Esquecido** | gosma com um fio de Kirschner cravado; elite |
| Brutamontes | **Ogro da Pseudoartrose** | elite pesado de corcunda |

## Como fazer um monstro (receita testada)

1. **Gerador:** comece de `scripts/sprites/cavaleiro_chibi.py`, que é pixel art 2D nativa. Ele já tem:
   - máscaras de forma: elipse, polígono, cápsula e curva;
   - normais e rampas com desvio de matiz;
   - contorno seletivo e luz de recorte;
   - a classe `Quadro`;
   - poses por parâmetros e `gravar_folha` (em `motor.py`).

   Crie `scripts/sprites/<bicho>.py` com as mesmas funções `poses()` e `principal()`.
2. **Prévia:** `python3 scripts/sprites/<bicho>.py --previa /tmp/x.png --escala 5`. Faça e refaça até ficar bonito, como pediu o Tales. Veja também cada animação (`--anim golpe` e as outras).
3. **Assar:** `python3 scripts/sprites/<bicho>.py`, depois `python3 scripts/sprites/indice.py`.
4. **Ligar no jogo:**
   - em `src/flashcards/componentes/Hud.tsx`, ajuste a escala em `CRESCE` se for preciso;
   - em `src/flashcards/efeitos/ataques.ts`, ligue o estilo do golpe (`ESTILO`);
   - em `src/flashcards/motor/bestiario.ts`, crie o monstro novo, com `id`, nome, `sprite`, cenário, andar mínimo, atributos, `lema` e `habilidade`;
   - se o sprite for novo, acrescente o nome em `SpriteInimigo`.
5. **Superpoder (opcional):** siga os que já existem em `regras.ts`: `envenena`, `queima`, `gruda` e `tremor`. Cada um precisa de teste em `fixtures/testar_flashcards.mjs`.
6. **Validar:**
   - `npm test`, `npx tsc --noEmit` e `npm run build`;
   - capturas com Playwright em 1400×860, 390×844 e 844×390. O roteiro `scripts/tmp-tela/golpes.mjs` fica fora do git: recrie-o a partir de `__torneio.ir(andar, semente)`.

## Ordem sugerida

1. ~~**Goblin**, chibi (ref. 3)~~: feito em `scripts/sprites/goblin.py`. Ele importa as ferramentas do `cavaleiro_chibi.py` e soma rampas próprias: é o modelo mais curto para os próximos chibis.
2. **Esqueleto**, sóbrio (ref. 5).
3. **Ent** (Guardião da Fise), o toco de um olho só (ref. 5).
4. **Cogumelo da Necrose**, monstro novo do Jardim (refs. 4 e 5).
5. **Mímico** e **aranha** (refs. 1 e 4).
6. **Chefes humanoides** no estilo brutamontes (ref. 2).
