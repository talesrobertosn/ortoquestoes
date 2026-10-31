# Prompt da noite: refazer resumos e comentários sem parar (MacBook)

Cole o bloco abaixo numa sessão do Claude Code aberta em `~/ortoquestoes`.

```text
Modo autônomo a noite toda. Responda sempre em português. Não pare para perguntar: ao terminar um tema, publique e emende o próximo.

LEIA ANTES: CLAUDE.md, AGENTS.md, docs/padrao-editorial-comentarios.md, docs/prompts/comentarios-miniaula.md,
docs/biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md (inclusive a seção "Ferramentas criadas no MacBook") e o fim de
~/OrtoQuestoes-Biblioteca/CHECKPOINT-GERAL.md, que diz onde a noite anterior parou.

AMBIENTE: rode sempre `eval "$(/opt/homebrew/bin/brew shellenv)"` antes de usar pdftotext, node ou gh. O python3 é 3.9:
use `from __future__ import annotations`. Livros: `python3 scripts/livros.py lista|titulos|buscar|ler`
(campbell21, rwa, rwc, tach, netter-ao, green7). O Hoppenfeld é escaneado e não serve.
Prints: `CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/capturar_telas.mjs /questao/<id> print --roteiro scripts/comentarios-resumos/roteiro-print.mjs --pasta <scratchpad>/telas`.

ORDEM DO TRABALHO:
1. Se existir a branch claude/refazer-metastases sem PR, termine-a primeiro: lotes em
   ~/OrtoQuestoes-Biblioteca/lotes/campbell-2021/05-metastases/ (v2_lote1 a 4 prontos; faltam as questões de MIRELS
   e as "vizinhas": 0063, 0352, 0186, 0169, 0338, 0395, 0088, 0109, 0190, 0202, 0325, 0293, 0264, 0397, 0398, 0362,
   0364 a 0369). No resumo, troque a frase "esse assunto de dermatologia não está nos capítulos lidos" pela ceratose
   actínica do Green, 7ª ed., cap. 58, p. 1972.
2. Depois siga a tabela do REFAZER na ordem: 16 hérnia de disco, 11 anatomia da coluna, 10 instabilidade do ombro,
   20 estadiamento, 8 ATQ, 6 omartrose, 3 manguito, depois Tachdjian, Green, Netter e a série rockwoodcriancas10.
   Acabou a tabela: FILA-EDITORIAL, pelos temas mais cobrados.

PARA CADA TEMA:
a) `python3 scripts/biblioteca/dossie_tema.py "<Subtema>" --livro <apelido> --paginas A-B`: lista TODAS as questões
   do subtema (oficiais, simulados e protegidas) e as páginas do livro. Refaça o subtema inteiro, não só a lista curta.
b) Engenharia reversa: o que cada banca cobrou e como; crie 3 a 6 simulados novos onde o tema é cobrado e o acervo
   não tem questão de treino.
c) Resumo como aula, mínimo 45 KB (conteudo/biblioteca/*.md), com página real do livro em cada afirmação forte,
   tabelas, "Na prova", blocos !questoes ligando cada questão à seção certa e figuras do livro (!figura N imagem=...)
   quando ajudarem. Nada sem fonte: se o livro não diz, não escreva ou registre no campo alerta.
d) Comentários em lotes .py em ~/OrtoQuestoes-Biblioteca/lotes/<livro>/<NN-tema>/v2_loteN.py, 6 a 8 por lote,
   convertidos com `python3 scripts/biblioteca/lote_comentarios.py LOTE.py SAIDA.json`. Mire 5.300 caracteres na
   primeira escrita (o mínimo é 4.500). Cada um é uma miniaula humana, sem molde fixo: abre com o raciocínio clínico,
   explica o mecanismo, cita o livro com página sem engessar, tabela quando ajudar, e explica TODAS as alternativas,
   inclusive a correta. Fecho "O que a banca quis testar." nas oficiais e "Por que esta questão foi criada." nos
   simulados. Questão sem gabarito oficial usa provavel= e diz isso no texto.
e) Aplique (`python3 scripts/aplicar_comentarios.py SAIDA.json`), rode scripts/pos_aplicar.sh, tire o print de uma
   questão do lote para conferir, marque a linha do REFAZER como feita, anote no CHECKPOINT-GERAL.md e publique com
   `scripts/publicar_pr.sh "Título" corpo.md`, que espera os checks e faz o merge. Branch nova a partir de
   origin/claude/pdfs-questoes-tp64dr atualizada (git fetch antes).

REGRAS QUE NÃO MUDAM:
- Preserve o gabarito oficial; divergência vai no campo alerta.
- Sem travessão, itálico ou emoji nos textos.
- Não mexa nas provas específicas de Cirurgia da Mão (SBCM, SIMÃO, ENARE Cirurgia da Mão, USP-SP, UFG, PUC-SP, INTO,
  FMRP-USP, IAUPE, Einstein, UERJ).
- Livros, resumos enviados e provas originais nunca vão para o git; figura de livro nunca em página pública de SEO.
- Não digite senhas, não apague dados, não exponha credenciais, não gaste dinheiro, não burle limites de uso.
- Commits terminam com "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"; corpo de PR termina com
  "🤖 Generated with [Claude Code](https://claude.com/claude-code)".
- Se um check falhar, corrija e publique de novo; se travar num tema, anote o motivo no CHECKPOINT e passe ao próximo.

Ao acordar, quero no CHECKPOINT-GERAL.md: temas fechados, PRs publicados, quantos comentários e simulados, e o que
ficou pendente com o motivo.
```
