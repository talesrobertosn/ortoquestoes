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
- **12/10/2026, fim do dia (troca de conta):**
  - o Tales gostou da imagem e do mecanismo do protótipo 1 e mandou 5 referências (veja [REFERENCIAS.md](REFERENCIAS.md));
  - a **versão 2** está escrita em `prototipos/flashcards/torneio-v2.html`, **ainda sem teste visual**:
    - tabuleiro emoldurado;
    - adversário com vida em cima;
    - alternativas na mão em leque;
    - botão redondo;
    - golpe com esfera de luz;
    - partículas.
  - **Para continuar:**
    1. rodar `node prototipos/flashcards/testar-prototipo.mjs prototipos/flashcards/torneio-v2.html <pasta-temporária>`. O script tirava prints no celular e no computador, mas falhou na linha 6: o caminho do `import` do Playwright precisa ser ajustado, por exemplo para `playwright` ou `node_modules/playwright/index.js`.
    2. olhar os prints e corrigir;
    3. quando estiver bom, trocar o `torneio.html` pela v2 e republicar o artifact.
  - **Mudança de mecânica na v2 (proposta, falta o Tales aprovar):** o andar não tem mais 5 flashcards fixos. Cada andar tem um adversário com vida:
    - o acerto causa dano nele: fácil 10, moderada 20, difícil 30;
    - o erro faz ele golpear você, com os danos de sempre (2, 5 e 10);
    - derrotou o adversário, você sobe de andar e escolhe um poder.
    - Adversários: Golem de Gesso, Serpente do Ciático e o chefe Guardião do Acetábulo.
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
