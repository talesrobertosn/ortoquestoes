# Andamento: provas de Cirurgia da Mão em OrtoQuestões Simulados

Roteiro em [PROTOCOLO.md](PROTOCOLO.md). Atualizar **a cada lote**, antes do commit. Aqui não entra texto das
provas: só número da questão, assunto em palavras nossas, fonte e situação.

Situações: `a fazer`, `em lote NN`, `publicada`, `pendente: sem fonte`, `pendente: conferir à mão`, `anulada no original`.

## Resumo

| Prova | Arquivo local | Questões | Publicadas | Pendentes | Ids | Gabarito (A/B/C/D) |
|---|---|---|---|---|---|---|
| SIMÃO 2021 | SIMAO-2021-questoes.json | 100 | 0 | 0 | | |
| SIMÃO 2022 | SIMAO-2022-questoes.json | 100 | 0 | 0 | | |
| SIMÃO 2023 | SIMAO-2023-questoes.json | 100 | 0 | 0 | | |
| SIMÃO 2024 | SIMAO-2024-questoes.json | 100 | 0 | 0 | | |
| SBCM 2022 | SBCM-2022-questoes.json | 100 | 0 | 0 | | |
| SBCM 2023 | SBCM-2023-questoes.json | 100 | 0 | 0 | | |
| SBCM 2024 | SBCM-2024-questoes.json | 100 | 0 | 0 | | |
| SIMÃO 2026 | SIMAO-2026-Questoes.docx | 100 | 100 | 0 | mao-1719 a mao-1810; ombro-cotovelo-0645 a 0652 | 25/25/25/25 |

(Linha nova por prova, criada na fase 0 do protocolo.)

**Separação feita em 19/10/2026** (nesta conta, a partir dos arquivos do Tales): cada prova virou um
`<PROVA>-<ANO>-questoes.json` com as questões originais, a resposta da correção e as referências. Esses JSON ficam
só em `~/OrtoQuestoes-Biblioteca/provas/` (nunca no git). Na fase 0, em vez de separar o PDF, rode
`python3 -I scripts/mao/biblioteca_local.py questoes provas/SIMAO-2023-questoes.json simao-2023`.
As respostas e as páginas do Green apontadas pela correção estão em [dicas/](dicas/).

| Prova | Resposta no material | Sem resposta única | Material de origem |
|---|---|---|---|
| SIMÃO 2021 | 76 | 24 (41 a 48 e 57 a 72 não estão na correção) | correção em slides + prova escaneada |
| SIMÃO 2022 | 99 | 1 (95) | correção em slides |
| SIMÃO 2023 | 100 | 0 (16 com ressalva) | correção Mão Expert |
| SIMÃO 2024 | 95 | 5 (14, 15, 34, 46, 60) | prova + correção Mão Expert |
| SBCM 2022 | 100 | 0 | prova + gabarito |
| SBCM 2023 | 96 | 4 (9, 72, 88, 100 com figura) | correção Mão Expert |
| SBCM 2024 | 100 | 0 (44 inferida) | correção Mão Expert |

Faltam: SIMÃO 2025 e as provas da SBCM de 2021 e 2025 (se existirem). O SIMÃO 2026 já está publicado.

## Edição do livro principal

Preencher na fase 0 com o que está na folha de rosto do arquivo do Green: título, edição, autores, tradução.
Essa é a linha do `REF` dos lotes.

- Green: _a preencher_

## Modelo de seção por prova

Copiar para cada prova nova (ex.: `## SIMÃO 2024`):

| Nº | Assunto (palavras nossas) | Formato | Green: cap. e páginas | Tema / subtema | Lote | Id | Situação |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | a fazer |
