# Flashcards do Orto Questões: Torneio de Flashcards

Ponto de partida para quem for continuar este projeto: Claude, ChatGPT Codex ou outro agente.
Leia este arquivo e depois os outros desta pasta, nesta ordem:

1. [DECISOES.md](DECISOES.md): o que o dono do projeto (Tales) já decidiu. É a fonte de verdade.
2. [FORMATOS.md](FORMATOS.md): como escrever bons flashcards, com os tipos, as regras e exemplos reais do acervo.
3. [BATALHA.md](BATALHA.md): o desenho de jogo do modo Batalha (vida, dano, poderes, andares, chefes).
4. [ARQUITETURA.md](ARQUITETURA.md): dados, comandos da fábrica, filas de revisão, limite diário e telas.
5. [ROTEIRO.md](ROTEIRO.md): as etapas, com caixas de seleção. Atualize-as ao terminar cada passo.
6. [REFERENCIAS.md](REFERENCIAS.md): os jogos de cartas que o Tales mandou como inspiração e o que adotamos de cada um.

## Em uma frase

Uma aba **Flashcards** dentro de **Treinar**, com o **modo Estudo** (calmo: vira o flashcard e diz como foi) e o **modo Batalha** (jogo com vida, poderes, andares e chefes). Os dois têm visual de jogo de cartas, giro 3D e cenários em pixel art. Os flashcards saem das questões e dos comentários do acervo, começando pelos temas que mais caem e pela anatomia dos OrtoQuestões Simulados.

## Onde está cada coisa

| O quê | Onde |
|---|---|
| Protótipo visual (HTML autocontido, sem dependências) | [prototipos/flashcards/torneio.html](../../prototipos/flashcards/torneio.html) |
| Protótipo publicado (link privado do Tales) | https://claude.ai/artifact/J7653MBJ9VzGZ6Suv2FmjL |
| Gerador do Resumão (base para extrair as linhas "Na prova") | [scripts/gerar_resumao.py](../../scripts/gerar_resumao.py) |
| Motor da revisão espaçada de questões (intervalos por confiança) | [src/estado/revisao.ts](../../src/estado/revisao.ts) |
| Limite diário do plano grátis (contrato no servidor) | [docs/planos-e-limite-diario.md](../planos-e-limite-diario.md) |
| Ordem dos temas que mais caem | `src/dados/incidencia.json` e a página Temas que mais caem |

## Estado atual (atualize aqui)

- **12/10/2026:**
  - brainstorm aprovado e decisões registradas;
  - protótipo visual com os modos Estudo e Batalha e 3 cenários (Salão das velas, Campo, Masmorra);
  - 12 flashcards de exemplo tirados de questões reais.
- **Próximo passo:** etapa 1 do [ROTEIRO.md](ROTEIRO.md). O Tales avalia o protótipo e escolhe os ajustes de visual; depois vem a fábrica (`scripts/flashcards/`), com uma amostra de cerca de 30 flashcards para aprovação.

## Regras que valem para todo o projeto

- **Nome para o usuário:** "flashcards", nunca "cartas" (decisão do Tales). O modo jogo se chama "Batalha" e o espaço "Torneio de Flashcards".
- **Conteúdo médico:**
  - sempre de uma questão real do acervo e do comentário dela, com o id;
  - nada inventado, e o gabarito oficial é preservado;
  - quando o comentário diverge do gabarito, o flashcard segue o comentário e cita a divergência.
- **Imagens:**
  - só as figuras reais das questões, com a legenda de fonte;
  - enfeites em pixel art podem (velas, bandeiras, brasões, ícones de poder), mas **sem desenho de anatomia**: osso, músculo, nervo ou vaso, nem caveira;
- **Limite do plano grátis:** 10 flashcards por dia, contados no servidor; assinante sem limite. Não contornar a checagem de assinatura no cliente.
- **Mudanças:** em branch e PR revisável, com os testes do repositório (`npm test`, `npx tsc --noEmit`, `npm run build`).
