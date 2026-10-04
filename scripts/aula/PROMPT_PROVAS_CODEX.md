# Prompt para acrescentar provas do TARO/TEOT e comentar as questões novas (Codex / ChatGPT)

Cole o texto abaixo, a partir da linha "Você vai trabalhar...", no Codex conectado ao repositório
`talesrobertosn/ortoquestoes`, na branch `claude/pdfs-questoes-tp64dr`. Antes, coloque os PDFs das
provas na pasta `pdfs/` do repositório (ela é ignorada pelo git: os PDFs não sobem para o GitHub).

---

Você vai trabalhar no repositório `talesrobertosn/ortoquestoes`, um banco de questões de prova de título
em ortopedia (TEOT, TARO, TECOC, ENARE). Trabalhe SEMPRE na branch `claude/pdfs-questoes-tp64dr`, faça
commits pequenos e dê push nela. Escreva tudo em português do Brasil.

## Regras que não mudam

- Nunca apague questão do acervo. Uma prova enviada pelo dono do projeto entra inteira: o que já existe
  no site é marcado com a prova e o ano; o que não existe é acrescentado.
- Nunca suba PDF para o repositório. Eles ficam em `pdfs/`, que o git ignora.
- Não escreva o nome de cursos preparatórios, apostilas ou e-books em nenhum arquivo. A fonte das provas é
  a banca (SBOT); a página pública das provas do TARO é
  https://sbot.org.br/comissoes/sobre-a-sbot-comissao-ensino-treinamento/taro/
- A prova de quadril se chama só "Fellowship Quadril". Não use a sigla da sociedade de quadril em lugar
  nenhum.
- Gabarito: só é "oficial" o que veio da banca (gabarito no fim do caderno ou arquivo de gabarito). Sem
  gabarito oficial, a questão entra com a resposta pela bibliografia (campo `provavel` no comentário), o
  site mostra "Resposta pela bibliografia" com aviso e a questão não conta no desempenho do usuário.
- Arquivos `public/acervo/temas/*.json` usam indentação de 2 espaços; `public/acervo/comentarios/*.json`
  usam 1 espaço. Use os scripts abaixo, que já gravam certo; não edite os JSON à mão.

## Parte 1: acrescentar uma prova nova

Exemplo para o TARO 2005 (troque prova, ano e arquivo):

1. Compare o caderno com o acervo:
   `python3 scripts/casar_prova.py pdfs/taro2005.pdf --prova TARO --ano 2005 --nome taro2005.pdf`
   O relatório sai em `relatorios/taro-2005.csv` com uma linha por questão: "no site" (já existe),
   "conferir" (parecida, semelhança entre 0,70 e 0,86) ou "falta no site". Se o caderno tiver gabarito
   em arquivo separado, acrescente `--gabarito pdfs/gabarito2005.pdf`. A coluna "no site, GABARITO
   DIFERENTE" aponta questões em que o gabarito da banca não bate com o do site: liste para o dono do
   projeto decidir, não troque sozinho.
2. Marque prova e ano nas que já existem: rode o mesmo comando com `--aplicar`.
3. Extraia as que faltam:
   `python3 scripts/adicionar_prova.py extrair pdfs/taro2005.pdf --prova TARO --ano 2005 --nome taro2005.pdf`
   Cadernos antigos de "Certo / Errado / Não sei" (como o TARO 2006): acrescente `--certo-errado`; cada
   afirmação vira uma questão com as alternativas A) Certo e B) Errado.
   O resultado fica em `relatorios/novas/taro-2005.json`.
4. Abra cada par marcado como "conferir" (enunciado do PDF ao lado do enunciado do site). Se for a mesma
   questão, ajuste prova, ano e `origem` da questão do site. Se for outra questão (outro ano, outras
   alternativas, outro tema), rode o `extrair` de novo com `--incluir-parecidas` e acrescente.
5. Monte o lote (um JSON fora do repositório, por exemplo `/tmp/taro-2005.json`). O mínimo é tema e
   resposta de cada número:
   ```json
   {"prova": "TARO", "ano": 2005, "arquivo": "taro2005.pdf", "gabaritoOficial": false,
    "itens": [{"numero": 1, "tema": "mao", "resposta": "D"},
              {"numero": 2, "tema": "trauma", "resposta": "B"}]}
   ```
   Temas válidos: coluna, conceitos-basicos, joelho, mao, ombro-cotovelo, osteometabolicas, pe-tornozelo,
   pediatria, quadril, trauma, tumores. Com gabarito oficial, use `"gabaritoOficial": true` e a letra da
   banca. Sem ele, decida a resposta pela bibliografia (Rockwood, Campbell, Tachdjian, Green, Skeletal
   Trauma, Lovell e Winter, conforme o tema) e mantenha `false`.
6. Confira e aplique:
   `python3 scripts/adicionar_prova.py aplicar /tmp/taro-2005.json --seco` (só confere)
   `python3 scripts/adicionar_prova.py aplicar /tmp/taro-2005.json` (grava)
   O script dá o id novo, as etiquetas de assunto e a origem (arquivo, página, número no caderno).
   Questões que citam figura entram com `figuraPendente`; anote os números para o dono do projeto.
7. Regere e valide:
   ```
   python3 scripts/gerar_indice.py
   python3 scripts/gerar_incidencia.py
   python3 scripts/validar_acervo.py
   npm test
   npx tsc --noEmit -p .
   ```
   Tudo precisa passar sem erro. Depois `git add public/acervo src/dados/incidencia.json src/dados/taxonomia.json relatorios`,
   commit ("TARO 2005: 100 questões no acervo, 37 novas") e push.
8. Ao terminar, informe: quantas questões a prova tem, quantas já estavam no site, quantas entraram,
   quantas ficaram para decisão (gabarito diferente, figura pendente, "conferir" sem conclusão).

## Parte 2: comentar as questões que entraram só com a resposta

Padrão obrigatório: [aula independente e alternativas explicadas em profundidade](../../docs/padrao-editorial-comentarios.md).
Leia o [exemplo aprovado de enxertos](../../docs/exemplos/mao-0853.json).
Essa exigência vale para todas as provas importadas, incluindo Cirurgia da Mão,
ENARE e seleções de R4. Não reduzir as alternativas a uma ou duas frases nem
aplicar limites antigos de caracteres. Tabelas e listas são permitidas quando úteis.

As questões lançadas só com a resposta mostram "O comentário desta questão está em preparação". Para
listá-las por tema:

`python3 scripts/aula/fila.py pediatria 10 --pendentes`

Siga então o fluxo e o formato "aula" de `scripts/aula/PROMPT_CODEX.md` (lote em texto com
`@@ id`, `## conceito`, `## correta` e uma seção por alternativa errada, aplicado com
`python3 scripts/aula/montar.py /tmp/lote.txt`). O `montar.py` preserva a resposta pela bibliografia e o
aviso de gabarito. Em questão de certo/errado (TARO 2006), a seção da alternativa errada é `## B` quando a
resposta é Certo e `## A` quando é Errado; o conceito explica o tema e diz, no "Na prova:", por que a
afirmação está certa ou onde está o erro dela.

Se, ao estudar a questão, você concluir que a resposta registrada está errada, não troque em silêncio:
liste o id, a resposta atual, a que você propõe e a referência, para o dono do projeto decidir.

Pendentes no momento da passagem: as 250 afirmações do TARO 2006 e 13 questões do TARO 2007 a 2010 que
eram parecidas com outras do acervo (mao-0655, tumores-0358, mao-0656, pediatria-0837 a 0841,
ombro-cotovelo-0518, pe-tornozelo-0371, trauma-1192, trauma-1193, coluna-0357). Rode o `fila.py` com
`--pendentes` em cada tema para ver o número atual.
