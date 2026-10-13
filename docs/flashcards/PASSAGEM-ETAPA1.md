# Passagem: Etapa 1 da direção criativa (concluída em 13/10/2026)

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

**Próximo:** Etapa 2, o herói com progressão corporal real em 6 estágios (aprendiz até lenda adulta).

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
