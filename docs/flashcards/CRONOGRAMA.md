# Cronograma de criação de flashcards

Gerado por `scripts/flashcards/cronograma.py plano` em 15/10/2026. Não edite à mão: rode o comando de novo.

## Como funciona

- **A ordem é a da prova.** Cada assunto entra na fila pelo número de questões de prova oficial (TEOT, TARO, CET-PR, TECOC, ENARE) que teve no acervo, a mesma contagem da página *Temas que mais caem*.
- **Dois tipos de flashcard.** A fábrica automática transforma a própria questão em flashcard (um por questão). Os **autorais** são escritos a partir do comentário: uma linha de tabela, um tipo de classificação, o par que a prova troca, a armadilha. São eles que o cronograma organiza.
- **Meta por assunto** = questões de prova do assunto × peso do nível (nível 4: 1.0, nível 3: 0.7, nível 2: 0.4, nível 1: 0.2), com mínimo de 3.
- **Ritmo:** 60 flashcards autorais por semana, a partir de 19/10/2026. Para mudar: `--ritmo` e `--inicio`.
- **Nada inventado.** Todo autoral cita um trecho literal do comentário, e o validador confere a resposta e as alternativas contra esse texto (docs/flashcards/CRIACAO.md).

## Situação agora

|  | Total |
|---|---|
| Flashcards publicados (fábrica) | 4302 |
| Flashcards autorais publicados | 1202 |
| Meta de autorais (todos os assuntos) | 3646 |
| Faltam | 2698 |
| Semanas no ritmo atual | 45 |
| Previsão de término | 29/08/2027 |

### Por área

| Área | Questões de prova | Fábrica | Autorais | Meta | Faltam |
|---|---|---|---|---|---|
| Ortopedia pediátrica | 953 | 524 | 346 | 691 | 401 |
| Trauma adulto | 872 | 951 | 207 | 639 | 462 |
| Ombro e cotovelo | 529 | 399 | 250 | 440 | 225 |
| Mão e punho | 514 | 937 | 156 | 395 | 279 |
| Pé e tornozelo | 328 | 227 | 0 | 254 | 254 |
| Coluna | 321 | 281 | 94 | 267 | 212 |
| Tumores ósseos e de partes moles | 305 | 217 | 0 | 255 | 255 |
| Joelho | 277 | 185 | 0 | 253 | 253 |
| Conceitos básicos | 237 | 248 | 0 | 180 | 180 |
| Quadril | 234 | 255 | 149 | 203 | 108 |
| Osteometabólicas | 89 | 78 | 0 | 69 | 69 |

## Fila de assuntos (os 40 que mais caem)

Coluna *Fábrica*: flashcards automáticos que tocam o assunto (um flashcard pode ter dois assuntos). Coluna *Fontes*: questões do assunto cujo comentário tem tabela, classificação ou linha "Na prova", as melhores para autorais.

| # | Assunto | Área | Questões de prova | Nível | Fábrica | Autorais / meta | Fontes | Semana |
|---|---|---|---|---|---|---|---|---|
| 1 | Lesões fisárias | Ortopedia pediátrica | 77 | cai muito | 52 | 81 / 77 | 75 | feito |
| 2 | Anatomia da mão e punho | Mão e punho | 68 | cai muito | 180 | 95 / 68 | 161 | feito |
| 3 | Genuvaro, genuvalgo e torções | Ortopedia pediátrica | 60 | cai muito | 43 | 68 / 60 | 57 | feito |
| 4 | Fratura da cabeça do rádio e instabilidade do cotovelo | Trauma adulto | 57 | cai muito | 67 | 59 / 57 | 49 | feito |
| 5 | Lesões do manguito rotador | Ombro e cotovelo | 56 | cai muito | 43 | 70 / 56 | 18 | feito |
| 6 | Côndilo lateral, epicôndilo medial e rádio proximal na criança | Ortopedia pediátrica | 53 | cai muito | 29 | 84 / 53 | 41 | feito |
| 7 | Anatomia do ombro | Ombro e cotovelo | 52 | cai muito | 65 | 54 / 52 | 20 | feito |
| 8 | Luxação do joelho e lesões ligamentares | Trauma adulto | 50 | cai muito | 43 | 58 / 50 | 17 | feito |
| 9 | Neuropatia ulnar e outras compressões | Mão e punho | 48 | cai muito | 57 | 61 / 48 | 64 | feito |
| 10 | Omartrose e artroplastia do ombro | Ombro e cotovelo | 48 | cai muito | 38 | 56 / 48 | 14 | feito |
| 11 | Anatomia do quadril | Quadril | 47 | cai muito | 93 | 95 / 47 | 70 | feito |
| 12 | Artroplastia total: componentes e fixação | Quadril | 45 | cai muito | 57 | 48 / 45 | 179 | feito |
| 13 | Fraturas do antebraço e punho na criança | Ortopedia pediátrica | 45 | cai muito | 26 | 45 / 45 | 33 | feito |
| 14 | Fraturas do fêmur e da perna na criança | Ortopedia pediátrica | 42 | cai muito | 25 | 55 / 42 | 35 | feito |
| 15 | Instabilidade anterior do ombro | Ombro e cotovelo | 42 | cai muito | 52 | 52 / 42 | 20 | feito |
| 16 | Fraturas da coluna toracolombar | Trauma adulto | 41 | cai muito | 81 | 23 / 41 | 60 | 1 |
| 17 | Fraturas diafisárias do antebraço | Trauma adulto | 41 | cai muito | 65 | 61 / 41 | 39 | feito |
| 18 | Anatomia da coluna | Coluna | 40 | cai muito | 45 | 62 / 40 | 26 | feito |
| 19 | Fratura do úmero proximal | Trauma adulto | 40 | cai muito | 35 | 0 / 40 | 27 | 1 |
| 20 | Anatomia do pé e tornozelo | Pé e tornozelo | 39 | cai muito | 59 | 0 / 39 | 57 | 1 |
| 21 | Displasia do desenvolvimento do quadril | Ortopedia pediátrica | 39 | cai muito | 26 | 0 / 39 | 52 | 2 |
| 22 | Instabilidade do cotovelo | Ombro e cotovelo | 37 | cai muito | 28 | 0 / 37 | 13 | 3 |
| 23 | Lesões dos tendões flexores | Mão e punho | 37 | cai muito | 68 | 0 / 37 | 71 | 3 |
| 24 | Metástases ósseas | Tumores ósseos e de partes moles | 35 | cai muito | 40 | 0 / 35 | 22 | 4 |
| 25 | Síndrome compartimental | Trauma adulto | 35 | cai muito | 29 | 1 / 35 | 24 | 5 |
| 26 | Hérnia de disco lombar | Coluna | 34 | cai muito | 23 | 0 / 34 | 16 | 5 |
| 27 | Estadiamento, biópsia e margens | Tumores ósseos e de partes moles | 33 | cai muito | 31 | 0 / 33 | 17 | 6 |
| 28 | Lesão do ligamento cruzado anterior | Joelho | 33 | cai muito | 21 | 0 / 33 | 6 | 6 |
| 29 | Lesões do bíceps | Ombro e cotovelo | 33 | cai muito | 28 | 0 / 33 | 7 | 7 |
| 30 | Osteomielite aguda | Conceitos básicos | 33 | cai muito | 25 | 0 / 33 | 8 | 7 |
| 31 | Displasias esqueléticas e síndromes | Ortopedia pediátrica | 32 | cai muito | 18 | 0 / 32 | 32 | 8 |
| 32 | Lesão medular e síndromes medulares | Coluna | 31 | cai muito | 34 | 0 / 31 | 29 | 8 |
| 33 | Paralisia cerebral | Ortopedia pediátrica | 31 | cai muito | 22 | 0 / 31 | 35 | 9 |
| 34 | Anatomia do joelho | Joelho | 30 | cai muito | 58 | 0 / 30 | 32 | 9 |
| 35 | Escoliose idiopática | Coluna | 30 | cai muito | 23 | 0 / 30 | 24 | 10 |
| 36 | Fratura da escápula | Trauma adulto | 30 | cai muito | 76 | 0 / 30 | 74 | 10 |
| 37 | Princípios de osteossíntese | Conceitos básicos | 30 | cai muito | 64 | 0 / 30 | 21 | 11 |
| 38 | Artroplastia total do joelho | Joelho | 29 | cai muito | 19 | 0 / 29 | 9 | 11 |
| 39 | Fratura da clavícula | Trauma adulto | 29 | cai muito | 54 | 0 / 29 | 50 | 12 |
| 40 | Fraturas do tálus e do calcâneo | Trauma adulto | 29 | cai muito | 29 | 0 / 29 | 28 | 12 |

## OrtoQuestões Simulados

As questões dos OrtoQuestões Simulados (TEOT e TARO escritos pela casa, sem prova oficial) entram na fábrica e nos autorais como as de prova, com a marca `"colecao": "simulados"` no flashcard. Elas não contam para a incidência (que é só de prova oficial), mas seguem a mesma ordem: `cronograma.py proximo --simulados` abre o assunto de maior incidência que ainda tem questão de simulado sem autoral.

|  | Total |
|---|---|
| Questões de simulado com comentário | 799 |
| Flashcards da fábrica tirados delas | 754 |
| Flashcards autorais tirados delas | 284 |

Os assuntos com mais questões de simulado, na ordem da fila:

| # | Assunto | Área | Questões de simulado | Fábrica (simulados) | Autorais (simulados) |
|---|---|---|---|---|---|
| 2 | Anatomia da mão e punho | Mão e punho | 46 | 46 | 20 |
| 4 | Fratura da cabeça do rádio e instabilidade do cotovelo | Trauma adulto | 22 | 22 | 19 |
| 7 | Anatomia do ombro | Ombro e cotovelo | 24 | 24 | 53 |
| 11 | Anatomia do quadril | Quadril | 64 | 63 | 54 |
| 15 | Instabilidade anterior do ombro | Ombro e cotovelo | 17 | 17 | 36 |
| 16 | Fraturas da coluna toracolombar | Trauma adulto | 30 | 28 | 0 |
| 17 | Fraturas diafisárias do antebraço | Trauma adulto | 31 | 31 | 42 |
| 18 | Anatomia da coluna | Coluna | 16 | 16 | 29 |
| 19 | Fratura do úmero proximal | Trauma adulto | 1 | 1 | 0 |
| 20 | Anatomia do pé e tornozelo | Pé e tornozelo | 36 | 36 | 0 |
| 24 | Metástases ósseas | Tumores ósseos e de partes moles | 14 | 13 | 0 |
| 25 | Síndrome compartimental | Trauma adulto | 1 | 1 | 0 |
| 27 | Estadiamento, biópsia e margens | Tumores ósseos e de partes moles | 2 | 2 | 0 |
| 32 | Lesão medular e síndromes medulares | Coluna | 15 | 12 | 0 |
| 34 | Anatomia do joelho | Joelho | 36 | 35 | 0 |

## Plano das próximas 12 semanas

- **Semana 1** (19/10 a 25/10), 60 flashcards: Fraturas da coluna toracolombar (18); Fratura do úmero proximal (40); Anatomia do pé e tornozelo (2).
- **Semana 2** (26/10 a 01/11), 60 flashcards: Anatomia do pé e tornozelo (37); Displasia do desenvolvimento do quadril (23).
- **Semana 3** (02/11 a 08/11), 60 flashcards: Displasia do desenvolvimento do quadril (16); Instabilidade do cotovelo (37); Lesões dos tendões flexores (7).
- **Semana 4** (09/11 a 15/11), 60 flashcards: Lesões dos tendões flexores (30); Metástases ósseas (30).
- **Semana 5** (16/11 a 22/11), 60 flashcards: Metástases ósseas (5); Síndrome compartimental (34); Hérnia de disco lombar (21).
- **Semana 6** (23/11 a 29/11), 60 flashcards: Hérnia de disco lombar (13); Estadiamento, biópsia e margens (33); Lesão do ligamento cruzado anterior (14).
- **Semana 7** (30/11 a 06/12), 60 flashcards: Lesão do ligamento cruzado anterior (19); Lesões do bíceps (33); Osteomielite aguda (8).
- **Semana 8** (07/12 a 13/12), 60 flashcards: Osteomielite aguda (25); Displasias esqueléticas e síndromes (32); Lesão medular e síndromes medulares (3).
- **Semana 9** (14/12 a 20/12), 60 flashcards: Lesão medular e síndromes medulares (28); Paralisia cerebral (31); Anatomia do joelho (1).
- **Semana 10** (21/12 a 27/12), 60 flashcards: Anatomia do joelho (29); Escoliose idiopática (30); Fratura da escápula (1).
- **Semana 11** (28/12 a 03/01), 60 flashcards: Fratura da escápula (29); Princípios de osteossíntese (30); Artroplastia total do joelho (1).
- **Semana 12** (04/01 a 10/01), 60 flashcards: Artroplastia total do joelho (28); Fratura da clavícula (29); Fraturas do tálus e do calcâneo (3).

O plano completo, semana a semana, fica em `scripts/flashcards/cronograma.json`.

## Rotina de cada lote

1. `python3 scripts/flashcards/cronograma.py proximo` mostra o assunto da vez e as questões-fonte, com o comentário inteiro (`--simulados` para as questões dos OrtoQuestões Simulados).
2. Escreva o lote (JSON) seguindo docs/flashcards/CRIACAO.md: uma ideia por flashcard, trecho literal do comentário, alternativas tiradas do próprio comentário ou da questão.
3. `python3 scripts/flashcards/cronograma.py aplicar lote.json` valida, guarda os aprovados em `scripts/flashcards/autorais/` e republica o acervo. Os reprovados voltam com o motivo.
4. `python3 scripts/flashcards/cronograma.py plano` atualiza esta página. Commit e PR, como nos comentários.
