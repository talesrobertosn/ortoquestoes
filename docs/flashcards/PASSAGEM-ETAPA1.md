# Passagem: direção criativa da Cripta (Etapas 1 a 8 concluídas em 13/10/2026)

## Para continuar em outra conta (leia primeiro)
- **Repositório e branches:**
  - repositório `talesrobertosn/ortoquestoes`;
  - branch de trabalho `claude/sharp-goodall-pl7kp7`;
  - base `claude/pdfs-questoes-tp64dr`.
  - O merge na base publica no GitHub Pages; isso já está autorizado para a rota escondida `#/flashcards`.
- **Relatórios (artefatos privados do Tales):**
  - Etapa 1: https://claude.ai/artifact/USHFDMekPZmT5ptqcsVd1y
  - Etapas 2 a 8: https://claude.ai/artifact/FZJtaBEu91gh6qbxLs5T9M
- **Servidor local:** `VITE_SUPABASE_URL=sem npx vite --port 5199`.
- **Dependências:** `npm install`. As fontes `@fontsource` precisam estar instaladas.
- **Roteiros de captura** (ficam fora do git, em `.capturas/`, e precisam ser recriados):
  - todos usam o Chromium em `/opt/pw-browsers/chromium`;
  - todos usam semente fixa em `Math.random`;
  - todos usam o gancho `window.__torneio` (`ir(andar, semente)`, `definir(partida)`, `cena(nome)`; só no modo de desenvolvimento).
- **Testes antes do PR:**
  - `npm test`;
  - `npx tsc --noEmit`;
  - `npm run build`;
  - Playwright em 1400×860, 390×844 e 844×390.
- **Próximos passos sugeridos**, em ordem (detalhes nas seções das etapas abaixo):
  1. folhas em volume para raptor, mímico e esqueleto (estreiam cedo);
  2. pintar Torre e Salão;
  3. variantes escarlate e ancestral do dragão;
  4. reduzir o escudo do herói no estágio 6;
  5. revisar a emenda da faixa "sala".


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

## Etapa 3: chefes (concluída)
- **Dragão de Ossos** (`scripts/sprites/dragao.py`):
  - crânio 1,5× (`cab_o.escalado(1.5)`) com segundo par de chifres;
  - pescoço, coluna e cauda grossos;
  - costelas como arcos curvos;
  - patas robustas com garras e fogo-fátuo nas juntas;
  - asas maiores com membrana rasgada.
  - No Hud, `CRESCE.dragao` passou de 1,2 para 1,5.
- **Guardião do Acetábulo** (`guardiao.py`):
  - tabardo vermelho com barra de ouro;
  - rebites no peitoral;
  - escudo-taça com anel e quatro runas gravados na superfície.
- O topo da arena fica acima dos personagens (`.fc-arena > .fc-topo { z-index: 6 }`). No celular, o flashcard fica acima do adversário.

## Etapa 4: interface mais leve (concluída)
- A placa do adversário mostra no máximo dois selos (fúria e golpe especial). O resto vai num botão `+N`, que abre o painel do adversário (`Arena.tsx`, bloco "Interface mais leve").
- Encaixes vazios e pilhas ficam mais apagados, e o cenário escurece em volta do flashcard (`Flashcards.css`).
- Flashcard com imagem em tela baixa: o botão "Ver imagem" fica preso à base do miolo, e a pergunta fica menor.

## Etapa 5: cenários pintados (concluída para Floresta, Biblioteca, Covil e Masmorra)
- `scripts/cenarios/covil.py` e `scripts/cenarios/masmorra.py`, ligados em `CENAS_PINTADAS`.
- O clima do andar (chuva, noite) não entra nas cenas internas (`INTERNAS` em `Cenario.tsx`).
- **Faltam:** Torre, Salão, Catacumba, Forja e os outros biomas. Siga "Como fazer um cenário novo" em `ARTE.md`.

## Etapa 6: gameplay e NPCs (concluída)
- **Motor** (`motor/regras.ts`): a fase `sala` é genérica, com `Sala`, `OpcaoSala` e `EfeitoSala`.
  - Custos: moedas ou parte da vida (nunca derruba).
  - Efeitos: cura, moedas, cristais, vida máxima, cargas, relíquia e poder.
  - O azar do baú é sorteado pela semente.
- **Portas:** no máximo uma sala por corredor, a partir do 2º andar. A secreta, com 5% de chance, só a partir do 3º.
- **Salas:**
  - Mestre Ferreiro;
  - Irmã do Calo Ósseo (curandeira);
  - Baú esquecido;
  - Sala secreta;
  - quatro encontros: fonte, residente perdido, pedra de amolar e prontuários.
- **Sinergias** (`SINERGIAS`):
  - Imobilização completa: gesso + placas, +1 Barreira;
  - Plantão de estudos: lupa + livro, +1 pergaminho;
  - Pronto-socorro: insígnia + coração, cura 6.
  - Valem no início de cada adversário.
- **Interface:** `SalaEvento` em `Salas.tsx`. Testes em `fixtures/testar_flashcards.mjs`. As partidas salvas antes migram com `sala: null`.

## Etapa 7: música e polimento (concluída)
- **Faixas novas** (`scripts/musica/temas.py`):
  - floresta (cena campo e jardim);
  - masmorra;
  - covil;
  - sala (loja, Preceptor e salas).
- **Mapa** em `ARQUIVO_MUSICA` (`efeitos/sons.ts`). A floresta é pré-carregada.
- **Conferência:** `python3 scripts/musica/conferir.py`. A emenda da `sala` (0,245) é a maior; se der clique audível, encurte a cauda da harpa no último compasso.

## Etapa 8: bestiário (concluída nesta rodada)
- **Variantes de material para as folhas assadas:** `python3 scripts/sprites/assar.py <arquétipo> --variante <v>` grava `<arquétipo>-<v>.png`, e o Hud usa a folha quando ela existe. Variantes:
  - golem: cristal, cimento, rubro e obsidiana;
  - guardião: prata e real;
  - serpente: elétrica;
  - gosma: ácida e rainha (com coroa).
- **Gosma de Cimento** modelada em volume (`scripts/sprites/gosma.py`): massa com parafusos e bolhas, olhos acesos, escorridos, esticar e achatar.
- **Faltam folhas para:**
  - raptor, mímico, corvo, esqueleto, goblin, cavaleiro, escaravelho, aranha, morcego, mão, espectro, quimera, harpia e os outros arquétipos de `efeitos/bestas.ts`;
  - as variantes escarlate e ancestral do dragão.
  - A ordem sugerida é pelo andar de estreia (`andarMin` em `motor/bestiario.ts`).

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
