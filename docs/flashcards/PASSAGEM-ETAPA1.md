# Passagem: direção criativa da Cripta (Etapas 1 e 2 concluídas, 3 em andamento; 13/10/2026)

Pedido: "DIREÇÃO CRIATIVA E REFORMULAÇÃO ARTÍSTICA — CRIPTA DO RESIDENTE" (etapas 1 a 8).

## Situação em 13/10/2026 (fim da Etapa 1)

**Concluído** (PR para `claude/pdfs-questoes-tp64dr`, relatório "Cripta: Etapa 1" no PR):
- **Floresta das Fises Antigas no jogo**, cena `campo`:
  - raízes em leque, pé dos troncos sem linha reta;
  - tabuleiro da clareira;
  - vaga-lumes, folhas e borboletas.
- **Alternativas 1 a 4 redesenhadas**, com 8 estados.
- **Modo Estudo com o mesmo acabamento:**
  - Biblioteca Ancestral pintada offline;
  - alternativas antes de virar, com interruptor;
  - placas Errei/Hesitei/Sabia;
  - painéis forjados.
- **Celular deitado** com layout próprio, sem o aviso "Gire o celular".

**Capturas e medidas:** os roteiros ficam em `.capturas/` (fora do git). Para recriar:
- `capturar.mjs`: Batalha, alternativas e Estudo nos três tamanhos;
- `estados.mjs <pasta> <w> <h> <dpr>`: estados das alternativas;
- `medir.mjs <porta>`: quadros por segundo.

Todos usam `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`, semente fixa em `Math.random` e `__torneio.ir(1, 3)`.

**Etapa 1:** integrada na base pelo PR #219.

## Etapa 2: herói em 6 estágios (concluída, PR seguinte ao #219)
- O mesmo herói (rosto, capacete branco, pluma azul) cresce do aprendiz chibi à lenda adulta. A tabela `PROP` em `scripts/sprites/heroi.py` controla, por estágio:
  - pernas e tronco;
  - ombros;
  - cabeça;
  - braços;
  - grossura;
  - escudo.
- Joelheiras a partir do estágio 3. A lenda (6) tem armadura de pérola com filetes de ouro e lâmina de luz azulada.
- **Motor** (`scripts/sprites/motor.py`): `Osso.escalado(esc)` amplia as formas presas a um osso, sem mexer nos filhos.
- **Quadro do herói:** 112×120 (antes 96×96).
- **Hud** (`componentes/Hud.tsx`, `escalaAssada`):
  - o tamanho na tela usa o corpo do aprendiz (`heroi-1`) como referência;
  - o herói cresce só para cima, com os pés na mesma linha;
  - o multiplicador antigo `1 + 0.06 * (estagio - 1)` saiu do `Arena.tsx`.
- **Assar:** `cd scripts/sprites && python3 assar.py heroi --estagio N` (N de 1 a 6), depois `python3 scripts/sprites/indice.py`.
- **Capturas:** `node .capturas/heroi.mjs <pasta> <w> <h> <dpr>` mostra os 6 estágios no jogo.

## Etapa 3: chefes, começando pelo Dragão de Ossos (em andamento)
- **Primeira passada** em `scripts/sprites/dragao.py`. A versão anterior está no histórico do git.
  - O crânio ficou 1,5 vez maior, via `cab_o.escalado(1.5)`, com um segundo par de chifres.
  - Pescoço, coluna e cauda estão mais grossos.
  - As costelas viraram arcos curvos que descem da coluna; antes eram toros vistos de perfil e sumiam.
  - Caixa torácica maior, com núcleo de fogo-fátuo maior.
  - Patas robustas (as da frente 25% mais grossas), garras grandes e fogo nas juntas.
  - Asas maiores, com a membrana indo até perto das pontas dos dedos e a borda rasgada.
- **Falta:**
  - conferir no jogo, no andar 12 (Dragão de Ossos, cenário `covil`): `__torneio.ir(12, semente)`;
  - checar se o quadro de 264×216 ainda cabe tudo (asas e cauda);
  - ajustar `CRESCE.dragao` no Hud, se ficar grande demais;
  - passar o mesmo tratamento ao Guardião.
- Variantes `escarlate` e `ancestral` ainda usam o desenho antigo em código, porque não têm folha própria.

## Etapas 4 a 8 (não começadas)
4. **Interface mais leve.** A hierarquia é: pergunta, alternativas, personagens e estado.
   - Proposta: reduzir a placa do adversário e os selos.
   - Esconder "Fúria em N" atrás de um ícone.
   - Topo mais fino.
5. **Demais cenários pintados offline**, com o mesmo pintor (`scripts/cenarios/`). Veja "Como fazer um cenário novo" em `ARTE.md`.
   - Ordem sugerida: Masmorra, Covil e Torre.
6. **Gameplay e NPCs:**
   - sinergias;
   - ferreiro e curandeiro;
   - baú;
   - sala secreta;
   - eventos.
7. **Música e polimento.**
8. **Bestiário:** qualidade antes de quantidade. Folhas assadas para os outros arquétipos.

**Restrições** (valem para todas as etapas): veja a seção "Contexto completo do pedido", abaixo.

## Histórico da Etapa 1
- Auditoria rápida do andar 1 (cenário "campo"): pátio genérico de muros de tijolo; no celular
  deitado (844×390) a tela se sobrepõe (cartão sob o baralho, título sob o botão de som).
- Novo pintor de cenários offline: `scripts/cenarios/pintor.py` (ruído, voronoi, rampas com
  pontilhado, contorno) e `scripts/cenarios/floresta.py` (Floresta das Fises Antigas).
  Gera 4 camadas por formato (fundo, meio, frente, luz), em paisagem 520×330 e retrato 250×470:
  `python3 scripts/cenarios/floresta.py <pasta> [paisagem|retrato]`.
  Ainda NÃO está ligado ao jogo nem salvo em `public/`.

## Problemas conhecidos da floresta (rascunho)
- Raízes ainda parecem garras e há uma linha reta na base dos troncos gigantes.
- Musgo dos troncos em manchas; a copa do alto precisa de bordas mais orgânicas.

## Próximos passos
1. Acertar raízes e base dos troncos; gerar em `public/flashcards/cenarios/`.
2. Ligar no jogo: em `pintarCena` (src/flashcards/efeitos/pintura.ts), para a cena `campo`,
   desenhar as imagens recortadas no centro (sem reescalar), pré-carregadas; camada `luz` em screen.
3. Tabuleiro próprio da clareira (círculo de pedras com musgo e raízes) em `tabuleiros.ts`.
4. Partículas: vaga-lumes, folhas caindo, borboletas (`criarAmbiente`).
5. Corrigir o layout do celular deitado; interface mais leve.
6. Capturas antes/depois (`.base-tmp.mjs golem:1:3`), testes, PR, relatório.

## Pedidos novos do Tales (13/10/2026, antes da troca de conta)
- **Botões das alternativas (1, 2, 3, 4) lá embaixo:** estão crus e feios. Redesenhar com
  acabamento de RPG (placa ou carta com material, número em medalhão bonito, estados normal,
  hover, selecionado, certo, errado e eliminado), sem perder a legibilidade do texto médico.
  Arquivos: `src/flashcards/componentes/Arena.tsx` (classe `fc-alternativa`) e
  `src/estilos/paginas/Flashcards.css`.
- **Tudo vale também para o modo Estudo** (um dos principais), não só para a Batalha:
  cenário, botões, cartas, painéis e alternativas. O modo Estudo fica em
  `src/flashcards/componentes/Estudo.tsx` (aba "Estudo" do `#/flashcards`).

## Contexto completo do pedido (resumo do brief "Direção criativa")
- Meta: RPG de fantasia em pixel art premium, original (referências de qualidade: Octopath II,
  Stardew Valley, Hades, Legends of Runeterra, Hearthstone, Slay the Spire, Monster Train),
  sem copiar nada.
- Etapas:
  1. cenário de referência;
  2. herói com progressão corporal real em 6 estágios (aprendiz até lenda adulta);
  3. chefes, começando pelo Dragão de Ossos;
  4. interface mais leve (hierarquia: pergunta, alternativas, personagens, estado);
  5. demais cenários;
  6. gameplay e NPCs (sinergias, ferreiro, curandeiro, baú, sala secreta, eventos);
  7. música e polimento;
  8. bestiário (qualidade antes de quantidade).
- Cada etapa termina com um relatório:
  - antes e depois na mesma resolução;
  - o que foi redesenhado de verdade e o que só foi ajustado;
  - o que ainda está fraco;
  - testes e desempenho.
- **Restrições:**
  - Publicar só na rota escondida `#/flashcards`.
  - Não ativar banner, menu, ranking público, divulgação nem página de vendas.
  - Não mudar assinaturas ou limites.
  - Não alterar questões, gabaritos, comentários nem dados de usuários.
  - Preservar as feature flags e o progresso salvo.
  - Trabalhar em branch e PR.
  - Rodar `npm test`, `npx tsc --noEmit`, `npm run build` e o Playwright (desktop, celular em
    pé e celular deitado).
- **Fluxo:**
  - Branch `claude/sharp-goodall-pl7kp7`, base `claude/pdfs-questoes-tp64dr`.
  - Merge na base publica no GitHub Pages; isso já está autorizado para a rota escondida.
- **Ferramentas de captura** (criar de novo se não existirem; ficavam fora do git):
  - servidor: `VITE_SUPABASE_URL=sem npx vite --port 5199`;
  - gancho `window.__torneio.ir(andar, semente)` para ir a um andar com semente fixa;
  - `window.__torneio.cena(nome)` para trocar o cenário.
- Histórico anterior: `docs/flashcards/AUDITORIA-ARTE.md` e `docs/flashcards/ARTE.md`.
