# Continuar a sessão de 16/10/2026, parte B (para qualquer agente)

Continuação de `docs/CONTINUAR-SESSAO-16-10.md` (branch `claude/eager-meitner-bumj65`), que traz
as regras fixas do Tales, como publicar e a lista do PR #291 ao #318. Leia os dois, junto com
`AGENTS.md` e `CLAUDE.md`, antes de continuar.

## Como trabalhamos (resumo; o resto está no documento anterior)

- **Base do site:** `claude/pdfs-questoes-tp64dr`. Um merge nela publica no GitHub Pages.
- Cada entrega vira um PR, mesclado depois de `npm test`, `npx tsc --noEmit`, `npm run validar`,
  `npm run build`, `git diff --check` e conferência visual com Playwright (Chromium em
  `/opt/pw-browsers/chromium`) em 1400×860 e 390×844.
- O revisor automático (Codex) comenta nos PRs: verifique cada achado; se for real, corrija,
  responda no fio e resolva.
- Tales autorizou subir tudo sem perguntar, menos SQL e Edge Functions (ele mesmo cola). Última
  parte de SQL: **28** (nenhum SQL novo nesta sessão).

## Publicado nesta sessão (PRs mesclados)

| PR | Entrega |
|---|---|
| #319 | Fogueira da sequência em 8 estágios (Cinzas a Chama lendária), dias na cor do estágio, artes próprias dos atalhos de flashcards |
| #320 | Flashcards: "espaço" some no toque, botão de virar cabe deitado, número da entrada legível, Biblioteca não baixa a batalha |
| #321 | Página inicial do visitante: 10 amostras em rodízio (8 oficiais e 2 Simulados), "Ler comentário completo" leva a criar conta |
| #322 | Site mais rápido: pré-carga por intenção, service worker com prazo, CLS perto de zero, cronograma no celular 7,1 s → 4,6 s (`docs/DESEMPENHO-SITE-16-10.md`) |
| #323 | Simulados colo do fêmur (`trauma-1539` a `1567`) e transtrocantérica (`trauma-1568` a `1592`), mapas da banca; enunciados sem lacuna; `aplicar_lote.py` bloqueia "..." |

Relato de erro da `joelho-0225` (TARO 2010, sinal de WILSON): conferido, **não precisa
corrigir** (posição inicial 90° com rotação interna; o relato confundiu com a marcha em rotação
externa, que o comentário já explica). Pode marcar como resolvido no painel.

## Em andamento quando pausamos (16/10, manhã)

O trabalho de cada frente está salvo como patch em `.wip-16-10-b/` nesta branch
(`claude/dazzling-einstein-eibri5`), feito com `git diff --binary` em relação ao ponto de onde a
frente saiu da base. Todos aplicam na base atual. Para retomar:

```
git fetch origin claude/pdfs-questoes-tp64dr claude/dazzling-einstein-eibri5
git checkout -B <sua-branch> origin/claude/pdfs-questoes-tp64dr
git show origin/claude/dazzling-einstein-eibri5:.wip-16-10-b/<nome>.patch > /tmp/<nome>.patch
git apply --3way /tmp/<nome>.patch
```

Revise, termine, teste e abra o PR. **Nunca publique a pasta `.wip-16-10-b/`.**

| Frente | Patch | Estado |
|---|---|---|
| Cronograma com o calendário em evidência, calendário da Revisão no mesmo estilo, "Teste do cronograma" automático (quinzenal, semanal nas 4 semanas antes da reta final, mais um na revisão forte), casos de borda | `cronograma-calendario.patch` | Dois commits prontos do agente ("motor do Teste do cronograma e teto diário da meta" e "calendário em evidência, Revisão no mesmo estilo e casos de borda"). Falta: trazer a base nova (o PR #323 mudou 3 linhas de `src/dados/planoEstudo.ts`, no fim da fila, e o acervo cresceu 54 questões), rodar todos os testes, conferir as telas em 1400×860, 390×844 e 844×390 (assinante, gratuito, escuro) e abrir o PR. Planos de dados ficam no JSON `opcoes` do plano (sem SQL). |
| Easter eggs e eventos aleatórios (lista na seção "Fila combinada" do documento anterior) | `easter-eggs-eventos.patch` | Parcial e **sem commit do agente**: mudanças em `App.tsx`, `Conta.tsx` (opção de desligar), `armazenamento.ts`, `CenasPixel.tsx`, `recursos.css`, `PLANO-DE-IDEIAS.md` e o doc `docs/EASTER-EGGS-E-EVENTOS.md`. Leia o doc para ver o que está feito e o que falta. Regras: nunca no meio de uma questão nem em simulado; somem sozinhos; opção de desligar em Minha conta; reduced-motion; sem vantagem no ranking; sem SQL; código sob demanda (o orçamento de `fixtures/testar_orcamento_chunks.mjs` vale). |
| Três posts do Instagram | `posts-instagram.patch` | **Desaprovados pelo Tales** ("muito texto, muita informação, muito carrossel"; e o Cofre já foi usado 6 vezes na semana). O patch tem a versão desaprovada (`marketing/kit/fila/post-31.json` a `post-33.json`); refazer do zero nesse formato: |

**Como refazer os posts (orientação do Tales, 16/10/2026):**
- Feed: carrossel de no máximo **3 lâminas** (questão com imagem e alternativas curtas; resposta
  numa frase de até ~15 palavras; convite de uma linha + "ortoquestoes.com.br"). Questão de
  anatomia da mão ou do ombro dos OrtoQuestões Simulados, com a lâmina-convite dizendo o que são
  os Simulados (engenharia reversa da banca).
- Stories: no máximo **3** (questão com imagem; resposta numa frase; convite numa frase sobre o
  cronograma).
- Story extra (como o site faz o tempo render: entre cirurgias, no pronto-socorro, à noite em
  casa): **1 story com até ~15 palavras** + botão "Treine grátis" (modelo Treine grátis, sem
  notebook nem cartões).
- **Não usar o Cofre de duas chaves.** Conferir a frequência dos estilos antes de escolher (uso
  desde 09/10: GPS 2, Cupom fiscal 2, Treine grátis 2; Snellen, VAR e Mecânica fina 1 cada).
  Proposta: VAR da questão enxuto no feed e Mecânica fina enxuta nos stories (`coluna-0281`).
- Os modelos do kit geram número fixo de lâminas: criar a variante curta dentro do modelo, sem
  estilo novo. Registrar em `docs/marketing/orientacoes.md`: pouco texto, até 3 lâminas, até 3
  stories, e não repetir um estilo mais de uma ou duas vezes por semana.
- Mandar ao Tales para aprovar. Não publicar em rede social. Rodar `registrar.mjs` só depois da
  aprovação.

## Depois (fila do documento anterior, ainda valendo)

- Revisão (`#/revisao`) ainda com CLS 0,6 (`docs/DESEMPENHO-SITE-16-10.md`).
- Simulados antigos de trauma (`trauma-1237` a `trauma-1370`) ainda têm enunciados com "______"
  (feitos antes da regra de 07/10): reescrever como par com "respectivamente", sem mudar
  alternativas nem gabarito.
- Pendências do Tales fora do código, bugs e ideias: ver o documento anterior.
