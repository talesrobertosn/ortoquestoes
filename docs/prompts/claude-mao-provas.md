# Comando para o Claude Code local: provas de Cirurgia da Mão → OrtoQuestões Simulados

Para o Tales colar no Claude Code (outra conta ou outro computador), aberto na pasta do repositório `ortoquestoes`.
Trocar só a linha **PROVA DESTA VEZ**. Se a sessão acabar no meio, abrir outra e colar o mesmo comando:
ele continua de onde parou pelo [PROGRESSO.md](../mao/PROGRESSO.md).

---

## Segunda conta do Claude Code no mesmo PC (20/10/2026): use este

**Antes de colar:** pare a sessão da outra conta (as duas não podem publicar ao mesmo tempo, porque os ids
são sequenciais). No Claude Code (app desktop), saia da conta atual e entre com a outra, abra a pasta
`C:\Users\tales_zh0ni7\ortoquestoes` e cole o texto abaixo. Git, gh, Node, Python, poppler e a biblioteca
`~/OrtoQuestoes-Biblioteca` já estão instalados e são os mesmos para as duas contas; não precisa instalar nada.
Se o `gh` pedir login, rode `gh auth login` uma vez.

```text
Continue o trabalho das provas de Cirurgia da Mão do OrtoQuestões exatamente de onde a outra conta parou,
sozinho, sem me pedir confirmação. Eu autorizo aplicar os lotes no acervo, fazer commit e push no branch
claude/relaxed-franklin-0snpiu e fazer o merge dos PRs para claude/pdfs-questoes-tp64dr.

1. cd ~/ortoquestoes ; git checkout claude/relaxed-franklin-0snpiu ; git pull origin claude/relaxed-franklin-0snpiu
   e depois git pull origin claude/pdfs-questoes-tp64dr (resolva conflito em indice.json ou busca.json
   rodando de novo scripts/gerar_indice.py).
2. Leia por inteiro, antes de qualquer coisa: CLAUDE.md, AGENTS.md, docs/mao/PROTOCOLO.md (principalmente
   as seções 6, 7 e 7.1), docs/mao/PROGRESSO.md (comece pela seção "Retomada": ela diz o ponto exato e
   como o trabalho vem sendo feito), docs/mao/ferramentas/README.md e o exemplo docs/exemplos/mao-0853.json.
   Abra também dois lotes já publicados como modelo de tom e profundidade:
   ~/OrtoQuestoes-Biblioteca/lotes/simao-2023/lote_16.py e lote_17.py.
3. Confira que as ferramentas estão na biblioteca (~/OrtoQuestoes-Biblioteca/.oq/progresso.py, revisar.sh,
   exportar.py e lotes/simao-2023/_revisar.py). Se faltar alguma, copie de docs/mao/ferramentas/.
4. Siga a fila da "Retomada" na ordem: lotes 18, 19 e 20 do SIMÃO 2023 (o 20 vai no tema ombro-cotovelo),
   pendentes 89 e 38, fechamento do SIMÃO 2023 (seção 9), refazer os comentários do SIMÃO 2026 e depois
   SBCM 2024, SBCM 2022, SIMÃO 2022, SBCM 2023, SIMÃO 2024, SIMÃO 2021 e os comentários do ENARE.

COMO ESCREVER (o que o Tales aprovou e pediu):
- Questão bem parecida com a original: a mesma pergunta, os mesmos dados e as mesmas alternativas, com
  outras palavras e outra ordem; o comando copia tem que passar (nenhuma sequência de 7 palavras igual).
  Só mude o ângulo se a original tiver duas respostas pelo livro ou repetir uma questão da mesma prova,
  e explique isso no comentário.
- Leia de verdade o trecho do Green que decide (grep em ~/OrtoQuestoes-Biblioteca/.oq/texto/), com a
  página impressa da marca "===== ... p. N" acima da linha. Nunca invente página; se só o resumo traz o
  fato, diga que é do resumo. Releia a página antes de citar.
- Comentário com tom de professor, explicando os porquês: conceito do zero, tabela quando compara,
  correta e cada errada com parágrafo próprio e com a página quando o motivo vem do livro.
- Citação literal do Green com flexibilidade: muita quando a resposta depende da letra do livro, nenhuma
  quando não acrescenta. Sem parágrafo-padrão de citação.
- "Por que esta questão foi criada." começa com "Inspirada na questão N do SIMÃO 2023, que ...".
- Lote sempre com PROVA ("SIMÃO" ou "SBCM") e ANO; tema e até três subtemas da taxonomia.
- Sem travessão, sem emoji, sem itálico, sem "assinale", sem EXCETO.
- Gabarito equilibrado (veja o acumulado na linha da prova no Resumo do PROGRESSO).

CICLO DE CADA LOTE DE 5 (Windows: use PYTHONUTF8=1):
  copia -> aplicar_lote --conferir -> aplicar_lote -> gerar_indice -> validar_acervo ->
  python -I ~/OrtoQuestoes-Biblioteca/.oq/progresso.py ... -> git add public/acervo docs/mao ->
  commit "SIMÃO 2023: questões ... (ids)" terminando com a linha Co-Authored-By ->
  timeout 180 git push -q origin HEAD.
  A cada 2 a 4 lotes: npx tsc -b e PYTHONUTF8=1 npm test, PR para claude/pdfs-questoes-tp64dr e merge.

NUNCA: livro, resumo ou prova original no git; fato que você não leu; divulgar quantidades totais do
acervo; refazer o que está "publicada" sem motivo.

Ao terminar cada lote, diga em uma linha o que publicou e siga. Antes de parar (limite de uso ou fim do
dia), atualize a seção "Retomada" do PROGRESSO com o ponto exato e faça commit e push.
```

---

## Comando antigo (primeira versão, outro computador)

```text
Você vai transformar uma prova de Cirurgia da Mão em OrtoQuestões Simulados no site OrtoQuestões, com
comentários de altíssima qualidade citando o livro e a página. Trabalhe sozinho, sem me pedir confirmação,
e publique aos poucos.

PROVA DESTA VEZ: SIMÃO 2024   (arquivo em ~/OrtoQuestoes-Biblioteca/provas/)

REGRA DAS BANCAS: só SBCM e SIMÃO viram OrtoQuestões Simulados (reescritas, mesmo ano). Questões de
outras instituições (ABC, Unesp, USP etc.) entram com o nome e o texto reais, como prova oficial de
cirurgia da mão, e muitas já estão no site: case antes com scripts/casar_prova.py (PROTOCOLO, seção 0).

PASSO 1. LEIA ANTES DE QUALQUER COISA, POR INTEIRO:
  - CLAUDE.md e AGENTS.md
  - docs/mao/PROTOCOLO.md  (o roteiro inteiro: siga na ordem, sem pular etapa)
  - docs/mao/PROGRESSO.md  (o que já foi feito; nunca refaça o que está "publicada")
  - docs/padrao-editorial-comentarios.md e o exemplo docs/exemplos/mao-0853.json
  - docs/simulados/simao-engenharia-reversa.md (como a banca pergunta e como reescrever sem copiar)
  - scripts/simulados/exemplo_lote.py

PASSO 2. SE A PROVA AINDA NÃO ESTÁ NO PROGRESSO, FAÇA A FASE 0 COMPLETA (PROTOCOLO, seção 3):
  inventario, indexar, questoes, plano. Depois classifique TODAS as questões da prova no PROGRESSO
  (número, assunto em palavras suas, formato, capítulo e páginas do Green, tema e subtema, lote) antes de
  escrever a primeira. Agrupe em lotes de 5 por capítulo do Green. Faça commit e push só do PROGRESSO.
  Se a prova já está classificada, pule para o passo 3 na primeira questão "a fazer".

PASSO 3. PARA CADA LOTE DE 5 (PROTOCOLO, seções 4 a 8):
  a) git pull origin claude/pdfs-questoes-tp64dr
  b) Para cada questão: ache as páginas (plano, buscar, ler), LEIA DE VERDADE o trecho que decide e o
     entorno que explica o porquê (seção 4), resolva a questão pelo livro e anote a página impressa.
  c) Reescreva a questão quase igual, mesma pergunta e mesmo ano, trocando as palavras (seção 6), e escreva o comentário no padrão
     editorial (seção 7): aula do tema do zero, cada alternativa com parágrafo próprio inclusive a correta,
     citações "(Green, cap. N, p. X)" no texto, "Por que esta questão foi criada." e "Na prova:".
     Qualidade vem antes de economia: pode gastar no comentário.
  d) copia  ->  aplicar_lote --conferir  ->  aplicar_lote  ->  gerar_indice  ->  validar_acervo
  e) Atualize o PROGRESSO (ids, situação "publicada", pendências) e faça commit e push:
     git add public/acervo docs/mao/PROGRESSO.md ; mensagem "SIMÃO 2024: questões X a Y (ids)".
  f) A cada 2 a 4 lotes: npx tsc -b && npm test, e publique (PR para claude/pdfs-questoes-tp64dr e merge).
  g) Diga em uma linha o que publicou e siga para o próximo lote sem esperar resposta.

NUNCA:
  - colocar livro, resumo enviado ou prova original no git (confira git status antes de cada commit);
  - copiar enunciado ou alternativa da prova (o comando copia precisa passar);
  - escrever fato que você não leu no livro ou no resumo; sem fonte = "pendente: sem fonte";
  - citar como página a folha do PDF: só a página impressa que você conferiu lendo;
  - escrever comentário curto ou alternativa com "está incorreta" sem explicar o motivo;
  - divulgar quantidades totais do acervo.

QUANDO A PROVA ACABAR: faça a seção 9 do PROTOCOLO e me mande o relatório curto (o que foi publicado, ids,
divergências entre a banca e o Green, pendências).
```

---

## Variações da linha da prova

- `PROVA DESTA VEZ: SIMÃO 2025`
- `PROVA DESTA VEZ: SBCM 2025` (prova de título da Sociedade Brasileira de Cirurgia da Mão; no lote,
  `PROVA = "SBCM"` e `ANO = 2025`)
- `PROVA DESTA VEZ: continuar` (pega a primeira prova com questões "a fazer" no PROGRESSO)

---

## Comando de continuação com as regras de 20/10/2026 (autoridade do Green e selo do ano)

```text
Continue as provas de Cirurgia da Mão, sem me pedir confirmação.

1. cd ~/ortoquestoes && git pull origin claude/relaxed-franklin-0snpiu
2. Releia docs/mao/PROTOCOLO.md, principalmente a seção 7.1 (nova), e docs/mao/PROGRESSO.md.

REGRAS NOVAS (valem para todo lote daqui em diante):
- Leia de verdade as páginas do Green de cada questão (comando "ler"), não só o "buscar".
- O comentário tem que passar autoridade: cite o Green no meio do texto, como um professor em aula,
  com capítulo e página ("No Green, 8ª ed., cap. 55, p. 2063, os autores ..."). Pelo menos duas
  citações com capítulo e página por questão, e a página também nas alternativas erradas quando o
  motivo vem do livro.
- Uma ou duas citações literais curtas por questão, entre aspas (no máximo duas frases). Se a tradução
  automática ficar estranha, cite o original em inglês e explique em português logo depois.
- Se não achar o capítulo ou a página, cite o que tiver (resumo, outro livro, a correção da banca) e diga
  isso. Nunca invente página.
- Tom de professor explicando para o residente, humano e com porquês, nada robótico.
  Continua: sem travessão, sem emoji, sem itálico.
- Todo lote com PROVA ("SIMÃO" ou "SBCM", exatamente assim) e ANO da prova espelhada; nunca misture
  provas ou anos no mesmo lote. No site isso vira o selo "Inspirada no SIMÃO 2023" e o filtro por ano,
  que vai alimentar o cronograma e os temas que mais caem da cirurgia da mão. Tema e subtemas certos
  (até três da taxonomia, todos os que a questão cobra).
- "Por que esta questão foi criada." começa com "Inspirada na questão N do SIMÃO 2023 (ou SBCM 2024)".

3. Termine o SIMÃO 2023. Depois acrescente as citações literais aos lotes do SIMÃO 2023 que já foram
   publicados sem elas, com scripts/simulados/enriquecer.py (só acrescenta texto).
4. Siga nesta ordem: SBCM 2024, SBCM 2022, SIMÃO 2022, SBCM 2023, SIMÃO 2024, SIMÃO 2021. Depois os
   comentários do ENARE Cirurgia da Mão 2022, 2023 e 2025 (texto oficial, sem reescrever).
5. Lotes de 5. A cada lote: copia, aplicar_lote --conferir, aplicar, gerar_indice, validar_acervo,
   PROGRESSO atualizado, commit e push (git add só de public/acervo e docs/mao). A cada 2 a 4 lotes,
   tsc e npm test, e publique pelo PR para claude/pdfs-questoes-tp64dr como vem fazendo.
6. Salve sempre antes de parar. Se o limite acabar, o próximo "continue" retoma pelo PROGRESSO.
```
