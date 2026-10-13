# Flashcards do Orto Questões: Torneio de Flashcards

Ponto de partida para quem for continuar este projeto: Claude, ChatGPT Codex ou outro agente.
Leia este arquivo e depois os outros desta pasta, nesta ordem:

1. [DECISOES.md](DECISOES.md): o que o dono do projeto (Tales) já decidiu. É a fonte de verdade.
2. [FORMATOS.md](FORMATOS.md): como escrever bons flashcards, com os tipos, as regras e exemplos reais do acervo.
3. [BATALHA.md](BATALHA.md): o desenho de jogo do modo Batalha (vida, dano, poderes, andares, chefes).
4. [ARQUITETURA.md](ARQUITETURA.md): dados, comandos da fábrica, filas de revisão, limite diário e telas.
5. [ROTEIRO.md](ROTEIRO.md): as etapas, com caixas de seleção. Atualize-as ao terminar cada passo.
6. [REFERENCIAS.md](REFERENCIAS.md): os jogos de cartas que o Tales mandou como inspiração e o que adotamos de cada um.
7. [ARTE.md](ARTE.md): a direção de arte HD-2D (pixel art nativa + diorama), o que mudou e quais assets são provisórios.

## Em uma frase

Uma aba **Flashcards** dentro de **Treinar**, com o **modo Estudo** (calmo: vira o flashcard e diz como foi) e o **modo Batalha** (jogo com vida, poderes, andares e chefes). Os dois têm visual de jogo de cartas, giro 3D e cenários em pixel art. Os flashcards saem das questões e dos comentários do acervo, começando pelos temas que mais caem e pela anatomia dos OrtoQuestões Simulados.

## Onde está cada coisa

| O quê | Onde |
|---|---|
| Batalha e Estudo no app (rota `#/flashcards`, fora da produção) | [src/flashcards/](../../src/flashcards/) |
| Protótipo visual (HTML autocontido, sem dependências) | [prototipos/flashcards/torneio.html](../../prototipos/flashcards/torneio.html) |
| Protótipo publicado (link privado do Tales, versão 2) | https://claude.ai/artifact/H9bLf2bWXvvjftgbFXtDxJ |
| Script de prints (celular e computador) | [prototipos/flashcards/testar-prototipo.mjs](../../prototipos/flashcards/testar-prototipo.mjs) |
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
  - a **versão 2** foi escrita como `torneio-v2.html` e, testada, virou `prototipos/flashcards/torneio.html` na noite de 12/10:
    - tabuleiro emoldurado;
    - adversário com vida em cima;
    - alternativas na mão em leque;
    - botão redondo;
    - golpe com esfera de luz;
    - partículas.
  - **Para continuar:**
    1. rodar `node prototipos/flashcards/testar-prototipo.mjs prototipos/flashcards/torneio.html <pasta-temporária>` (a v2 virou `torneio.html`; feito na noite de 12/10, ver abaixo).
    2. olhar os prints e corrigir;
    3. quando estiver bom, trocar o `torneio.html` pela v2 e republicar o artifact.
  - **Mudança de mecânica na v2 (proposta, falta o Tales aprovar):** o andar não tem mais 5 flashcards fixos. Cada andar tem um adversário com vida:
    - o acerto causa dano nele: fácil 10, moderada 20, difícil 30;
    - o erro faz ele golpear você, com os danos de sempre (2, 5 e 10);
    - derrotou o adversário, você sobe de andar e escolhe um poder.
    - Adversários: Golem de Gesso, Serpente do Ciático e o chefe Guardião do Acetábulo.
- **12/10/2026, noite:**
  - o script de prints voltou a rodar (acha o Playwright local ou o global);
  - os prints mostraram dois defeitos de layout, corrigidos:
    - o flashcard sumia do tabuleiro (a mesa caía numa linha de altura zero do grid);
    - no celular a página vazava para a direita (a coluna do `.app` crescia com o conteúdo);
  - no celular, o flashcard estreito da Batalha esconde o brasão e diminui a gema de dano, para o título caber;
  - o Tales mandou mais referências e pediu **"quanto mais efeitos visuais melhor"**. Entraram:
    - rastro de cometa na esfera do golpe e onda de choque no impacto;
    - corte dourado sobre o adversário no acerto (Runeterra) e garras vermelhas sobre você no erro;
    - número grande "CRÍTICO" ou "GOLPE DUPLO" quando o dano chega a 30 (Artifact);
    - barra de vida do adversário com rastro branco que esvazia depois do golpe;
    - aura girando atrás do flashcard, na cor da raridade, e brilho passando na alternativa levantada;
    - raios de luz e confete na vitória;
    - tudo desligado em "reduzir movimento".
  - `torneio.html` agora é a versão 2 (a versão 1 fica no histórico do git). O link antigo era da outra conta e não pôde ser atualizado; a v2 foi publicada num link novo (tabela acima).
- **12/10/2026, noite (Batalha no app):**
  - O Tales aprovou seguir: a Batalha é o modo de entrada, deve ser difícil (mais fácil morrer que matar) e ter arte de Runeterra/Hearthstone com toques de pixel art. Também mandou o briefing completo (ver [DECISOES.md](DECISOES.md)).
  - A Batalha agora roda **dentro do app**, em `src/flashcards/`, na rota `#/flashcards`, com o baralho de demonstração. A arquitetura está em [ARQUITETURA.md](ARQUITETURA.md), seção 0, e as regras e números em [BATALHA.md](BATALHA.md).
  - **No site, só por link:** https://ortoquestoes.com.br/#/flashcards (pedido do Tales em 12/10/2026, para ele testar). Nenhum menu aponta para lá; o atalho no Treinar só aparece no `npm run dev` ou com `VITE_FLASHCARDS=1`. Como o limite diário ainda não existe no servidor, não divulgar o link antes disso.
  - Prints conferidos em 390×844, 360×640 e 1440×900: texto da pergunta com 17 a 23 px, alternativas com 15,5 px, nada fora da tela.
  - **Para continuar:**
    1. O Tales joga e aprova.
    2. Ligar o limite diário no servidor e a sincronização.
    3. A fábrica de flashcards, para trocar o baralho de demonstração pelo acervo.
    4. Mais monstros por área.
- **13/10/2026 (redesenho HD-2D, PR em revisão, fora da produção):**
  - o Tales pediu arte no estilo HD-2D (Octopath Traveler II), modal premium, som sempre ligado e celular sem tamanhos aberrantes;
  - feita a fatia vertical (Batalha no Campo + Estudo na Biblioteca); detalhes e lista de assets provisórios em [ARTE.md](ARTE.md);
  - **Para continuar:** o Tales revisa os prints e o PR; depois, polir Serpente, Guardião, Masmorra e Salão. Só publicar com a aprovação dele.
- **Próximo passo (antigo):** etapa 1 do [ROTEIRO.md](ROTEIRO.md). O Tales avalia o protótipo e escolhe os ajustes de visual; depois vem a fábrica (`scripts/flashcards/`), com uma amostra de cerca de 30 flashcards para aprovação.

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
