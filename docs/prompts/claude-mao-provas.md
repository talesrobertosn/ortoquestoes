# Comando para o Claude Code local: provas de Cirurgia da Mão → OrtoQuestões Simulados

Para o Tales colar no Claude Code do outro computador, aberto na pasta do repositório `ortoquestoes`.
Trocar só a linha **PROVA DESTA VEZ**. Se a sessão acabar no meio, abrir outra e colar o mesmo comando:
ele continua de onde parou pelo [PROGRESSO.md](../mao/PROGRESSO.md).

---

```text
Você vai transformar uma prova de Cirurgia da Mão em OrtoQuestões Simulados no site OrtoQuestões, com
comentários de altíssima qualidade citando o livro e a página. Trabalhe sozinho, sem me pedir confirmação,
e publique aos poucos.

PROVA DESTA VEZ: SIMÃO 2024   (arquivo em ~/OrtoQuestoes-Biblioteca/provas/)

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
  c) Reescreva a questão com outro ângulo, sem copiar (seção 6), e escreva o comentário no padrão
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
