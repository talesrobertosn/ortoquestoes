# Cronograma de criação de flashcards

Gerado por `scripts/flashcards/cronograma.py plano` em 13/10/2026. Não edite à mão: rode o comando de novo.

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
| Flashcards autorais publicados | 10 |
| Meta de autorais (todos os assuntos) | 3646 |
| Faltam | 3636 |
| Semanas no ritmo atual | 61 |
| Previsão de término | 19/12/2027 |

### Por área

| Área | Questões de prova | Fábrica | Autorais | Meta | Faltam |
|---|---|---|---|---|---|
| Ortopedia pediátrica | 953 | 524 | 10 | 691 | 681 |
| Trauma adulto | 872 | 951 | 0 | 639 | 639 |
| Ombro e cotovelo | 529 | 399 | 0 | 440 | 440 |
| Mão e punho | 514 | 937 | 0 | 395 | 395 |
| Pé e tornozelo | 328 | 227 | 0 | 254 | 254 |
| Coluna | 321 | 281 | 0 | 267 | 267 |
| Tumores ósseos e de partes moles | 305 | 217 | 0 | 255 | 255 |
| Joelho | 277 | 185 | 0 | 253 | 253 |
| Conceitos básicos | 237 | 248 | 0 | 180 | 180 |
| Quadril | 234 | 255 | 0 | 203 | 203 |
| Osteometabólicas | 89 | 78 | 0 | 69 | 69 |

## Fila de assuntos (os 40 que mais caem)

Coluna *Fábrica*: flashcards automáticos que tocam o assunto (um flashcard pode ter dois assuntos). Coluna *Fontes*: questões do assunto cujo comentário tem tabela, classificação ou linha "Na prova", as melhores para autorais.

| # | Assunto | Área | Questões de prova | Nível | Fábrica | Autorais / meta | Fontes | Semana |
|---|---|---|---|---|---|---|---|---|
| 1 | Lesões fisárias | Ortopedia pediátrica | 77 | cai muito | 52 | 6 / 77 | 75 | 1 |
| 2 | Anatomia da mão e punho | Mão e punho | 68 | cai muito | 180 | 0 / 68 | 161 | 2 |
| 3 | Genuvaro, genuvalgo e torções | Ortopedia pediátrica | 60 | cai muito | 43 | 0 / 60 | 57 | 3 |
| 4 | Fratura da cabeça do rádio e instabilidade do cotovelo | Trauma adulto | 57 | cai muito | 67 | 0 / 57 | 49 | 4 |
| 5 | Lesões do manguito rotador | Ombro e cotovelo | 56 | cai muito | 43 | 0 / 56 | 18 | 5 |
| 6 | Côndilo lateral, epicôndilo medial e rádio proximal na criança | Ortopedia pediátrica | 53 | cai muito | 29 | 0 / 53 | 41 | 6 |
| 7 | Anatomia do ombro | Ombro e cotovelo | 52 | cai muito | 65 | 0 / 52 | 20 | 7 |
| 8 | Luxação do joelho e lesões ligamentares | Trauma adulto | 50 | cai muito | 43 | 0 / 50 | 17 | 7 |
| 9 | Neuropatia ulnar e outras compressões | Mão e punho | 48 | cai muito | 57 | 0 / 48 | 64 | 8 |
| 10 | Omartrose e artroplastia do ombro | Ombro e cotovelo | 48 | cai muito | 38 | 0 / 48 | 14 | 9 |
| 11 | Anatomia do quadril | Quadril | 47 | cai muito | 93 | 0 / 47 | 70 | 10 |
| 12 | Artroplastia total: componentes e fixação | Quadril | 45 | cai muito | 57 | 0 / 45 | 179 | 11 |
| 13 | Fraturas do antebraço e punho na criança | Ortopedia pediátrica | 45 | cai muito | 26 | 0 / 45 | 33 | 11 |
| 14 | Fraturas do fêmur e da perna na criança | Ortopedia pediátrica | 42 | cai muito | 25 | 0 / 42 | 35 | 12 |
| 15 | Instabilidade anterior do ombro | Ombro e cotovelo | 42 | cai muito | 52 | 0 / 42 | 20 | 13 |
| 16 | Fraturas da coluna toracolombar | Trauma adulto | 41 | cai muito | 81 | 0 / 41 | 60 | 14 |
| 17 | Fraturas diafisárias do antebraço | Trauma adulto | 41 | cai muito | 65 | 0 / 41 | 39 | 14 |
| 18 | Anatomia da coluna | Coluna | 40 | cai muito | 45 | 0 / 40 | 26 | 15 |
| 19 | Fratura do úmero proximal | Trauma adulto | 40 | cai muito | 35 | 0 / 40 | 27 | 16 |
| 20 | Anatomia do pé e tornozelo | Pé e tornozelo | 39 | cai muito | 59 | 0 / 39 | 57 | 16 |
| 21 | Displasia do desenvolvimento do quadril | Ortopedia pediátrica | 39 | cai muito | 26 | 0 / 39 | 52 | 17 |
| 22 | Instabilidade do cotovelo | Ombro e cotovelo | 37 | cai muito | 28 | 0 / 37 | 13 | 18 |
| 23 | Lesões dos tendões flexores | Mão e punho | 37 | cai muito | 68 | 0 / 37 | 71 | 18 |
| 24 | Metástases ósseas | Tumores ósseos e de partes moles | 35 | cai muito | 40 | 0 / 35 | 22 | 19 |
| 25 | Síndrome compartimental | Trauma adulto | 35 | cai muito | 29 | 0 / 35 | 24 | 19 |
| 26 | Hérnia de disco lombar | Coluna | 34 | cai muito | 23 | 0 / 34 | 16 | 20 |
| 27 | Estadiamento, biópsia e margens | Tumores ósseos e de partes moles | 33 | cai muito | 31 | 0 / 33 | 17 | 21 |
| 28 | Lesão do ligamento cruzado anterior | Joelho | 33 | cai muito | 21 | 0 / 33 | 6 | 21 |
| 29 | Lesões do bíceps | Ombro e cotovelo | 33 | cai muito | 28 | 0 / 33 | 7 | 22 |
| 30 | Osteomielite aguda | Conceitos básicos | 33 | cai muito | 25 | 0 / 33 | 8 | 22 |
| 31 | Displasias esqueléticas e síndromes | Ortopedia pediátrica | 32 | cai muito | 18 | 0 / 32 | 32 | 23 |
| 32 | Lesão medular e síndromes medulares | Coluna | 31 | cai muito | 34 | 0 / 31 | 29 | 23 |
| 33 | Paralisia cerebral | Ortopedia pediátrica | 31 | cai muito | 22 | 0 / 31 | 35 | 24 |
| 34 | Anatomia do joelho | Joelho | 30 | cai muito | 58 | 0 / 30 | 32 | 24 |
| 35 | Escoliose idiopática | Coluna | 30 | cai muito | 23 | 0 / 30 | 24 | 25 |
| 36 | Fratura da escápula | Trauma adulto | 30 | cai muito | 76 | 0 / 30 | 74 | 25 |
| 37 | Princípios de osteossíntese | Conceitos básicos | 30 | cai muito | 64 | 0 / 30 | 23 | 26 |
| 38 | Artroplastia total do joelho | Joelho | 29 | cai muito | 19 | 0 / 29 | 9 | 26 |
| 39 | Fratura da clavícula | Trauma adulto | 29 | cai muito | 54 | 0 / 29 | 50 | 27 |
| 40 | Fraturas do tálus e do calcâneo | Trauma adulto | 29 | cai muito | 29 | 0 / 29 | 28 | 27 |

## Plano das próximas 12 semanas

- **Semana 1** (19/10 a 25/10), 60 flashcards: Lesões fisárias (60).
- **Semana 2** (26/10 a 01/11), 60 flashcards: Lesões fisárias (11); Anatomia da mão e punho (49).
- **Semana 3** (02/11 a 08/11), 60 flashcards: Anatomia da mão e punho (19); Genuvaro, genuvalgo e torções (41).
- **Semana 4** (09/11 a 15/11), 60 flashcards: Genuvaro, genuvalgo e torções (19); Fratura da cabeça do rádio e instabilidade do cotovelo (41).
- **Semana 5** (16/11 a 22/11), 60 flashcards: Fratura da cabeça do rádio e instabilidade do cotovelo (16); Lesões do manguito rotador (44).
- **Semana 6** (23/11 a 29/11), 60 flashcards: Lesões do manguito rotador (12); Côndilo lateral, epicôndilo medial e rádio proximal na criança (48).
- **Semana 7** (30/11 a 06/12), 60 flashcards: Côndilo lateral, epicôndilo medial e rádio proximal na criança (5); Anatomia do ombro (52); Luxação do joelho e lesões ligamentares (3).
- **Semana 8** (07/12 a 13/12), 60 flashcards: Luxação do joelho e lesões ligamentares (47); Neuropatia ulnar e outras compressões (13).
- **Semana 9** (14/12 a 20/12), 60 flashcards: Neuropatia ulnar e outras compressões (35); Omartrose e artroplastia do ombro (25).
- **Semana 10** (21/12 a 27/12), 60 flashcards: Omartrose e artroplastia do ombro (23); Anatomia do quadril (37).
- **Semana 11** (28/12 a 03/01), 60 flashcards: Anatomia do quadril (10); Artroplastia total: componentes e fixação (45); Fraturas do antebraço e punho na criança (5).
- **Semana 12** (04/01 a 10/01), 60 flashcards: Fraturas do antebraço e punho na criança (40); Fraturas do fêmur e da perna na criança (20).

O plano completo, semana a semana, fica em `scripts/flashcards/cronograma.json`.

## Rotina de cada lote

1. `python3 scripts/flashcards/cronograma.py proximo` mostra o assunto da vez e as questões-fonte, com o comentário inteiro.
2. Escreva o lote (JSON) seguindo docs/flashcards/CRIACAO.md: uma ideia por flashcard, trecho literal do comentário, alternativas tiradas do próprio comentário ou da questão.
3. `python3 scripts/flashcards/cronograma.py aplicar lote.json` valida, guarda os aprovados em `scripts/flashcards/autorais/` e republica o acervo. Os reprovados voltam com o motivo.
4. `python3 scripts/flashcards/cronograma.py plano` atualiza esta página. Commit e PR, como nos comentários.
