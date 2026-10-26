# Andamento: provas de Cirurgia da Mão em OrtoQuestões Simulados

Roteiro em [PROTOCOLO.md](PROTOCOLO.md). Atualizar **a cada lote**, antes do commit. Aqui não entra texto das
provas: só número da questão, assunto em palavras nossas, fonte e situação.

Situações: `a fazer`, `em lote NN`, `publicada`, `pendente: sem fonte`, `pendente: conferir à mão`, `anulada no original`.

## Resumo

| Prova | Arquivo local | Questões | Publicadas | Pendentes | Ids | Gabarito (A/B/C/D) |
|---|---|---|---|---|---|---|
| SIMÃO 2021 | SIMAO-2021-questoes.json | 100 | 0 | 0 | | |
| SIMÃO 2022 | SIMAO-2022-questoes.json | 100 | 0 | 0 | | |
| SIMÃO 2023 | Prova  Simão 2023 - sem resposta.pdf | 100 | 97 | 3 | mao-1932 a mao-2022; ombro-cotovelo-0658 a ombro-cotovelo-0663 | A 25, B 24, C 24, D 24 |
| SIMÃO 2024 | SIMAO-2024-questoes.json | 100 | 0 | 0 | | |
| SBCM 2022 | PROVA SBCM 2022 - SEM RESPOSTA.pdf (separada em .oq/provas/sbcm-2022.json) | 100 | 89 | 11 | mao-2106 a mao-2188; ombro-cotovelo-0670 a ombro-cotovelo-0675 | A 22, B 23, C 22, D 22 |
| SBCM 2023 | Prova SBCM 2023 - sem resposta.pdf (.oq/provas/sbcm-2023.json) | 100 | 99 | 1 | mao-2189 a mao-2277; ombro-cotovelo-0676 a ombro-cotovelo-0685 | A 25, B 25, C 25, D 24 |
| SBCM 2024 | PROVA SBCM 2024 - sem resposta.pdf (separada em .oq/provas/sbcm-2024.json) | 100 | 89 | 11 | mao-2023 a mao-2105; ombro-cotovelo-0664 a ombro-cotovelo-0669 | A 22, B 22, C 22, D 23 |
| SIMÃO 2026 | SIMAO-2026-Questoes.docx | 100 | 100 | 0 | mao-1719 a mao-1810; ombro-cotovelo-0645 a 0652 (comentários refeitos em 20/10, exceto 0645 e 0647) | 25/25/25/25 |

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
| SBCM 2023 | ver [dicas/sbcm-2023.md](dicas/sbcm-2023.md) | | correção da prova |
| SBCM 2024 | 100 | 0 (44 inferida) | correção Mão Expert |

**Fila de comentários de provas oficiais (entraram só com a resposta em 19/10/2026):** ENARE Cirurgia da Mão
2022, 2023 e 2025 (ids em [docs/importacoes/cirurgia-mao-outubro-2026.md](../importacoes/cirurgia-mao-outubro-2026.md)).
Comentar no padrão, com o Green, depois das provas da SBCM e do SIMÃO (texto oficial, sem reescrever).

Faltam: SIMÃO 2025 e as provas da SBCM de 2021 e 2025 (se existirem). O SIMÃO 2026 já está publicado.

**SIMÃO 2026: refazer os comentários (pedido do Tales, 20/10/2026).** As 100 questões (mao-1719 a mao-1810;
ombro-cotovelo-0645 a 0652) estão publicadas, mas com comentário no padrão antigo (mediana de cerca de 3.000
caracteres em conceito e correta). Refazer no padrão atual: aula do Green com capítulo e página, tom de professor,
citação literal só onde ajuda e "Por que esta questão foi criada." com o número da questão. Entra logo depois de
terminar o SIMÃO 2023 (lotes 15 a 20), antes do SBCM 2024. Enunciado, alternativas, gabarito e id ficam como estão.

## Edição do livro principal

Preencher na fase 0 com o que está na folha de rosto do arquivo do Green: título, edição, autores, tradução.
Essa é a linha do `REF` dos lotes.

- Green: capítulos avulsos da tradução automática (Google) do **Green's Operative Hand Surgery, 8ª edição**
  (Wolfe, Pederson, Kozin e Cohen), um PDF por capítulo, com a paginação impressa do original (o cap. 58 vai
  até a p. 2182). Não há folha de rosto: a edição foi reconhecida pelo cap. 1 (Anestesia, de Elaine I. Yang,
  que agradece o autor da edição anterior) e pela correção das provas, que cita a 8ª. REF dos lotes:
  `Green's Operative Hand Surgery, 8ª ed. (Wolfe, Pederson, Kozin, Cohen; tradução)`.
- Outros livros locais: Pediatric Hand and Upper Limb Surgery (inglês), Congenital Deformities of the Hand and
  Upper Limb (Wang e Yao, Springer 2018, inglês), Pardini (Cirurgia da Mão; Traumatismo da Mão), estes dois
  ainda escaneados, sem texto.
- Atenção ao número dos arquivos: "4- T. extensor" é o cap. 5; "23- Rigidez do cotovelo" é o cap. 24; "24- Tendinites
  e lesões tendineas do cotovelo" é o cap. 25; "25- Artroscopia do cotovelo" é o cap. 26; "26-Neuropatias
  compressivas" é o cap. 28. Os demais batem com o número do capítulo. Cite sempre o número do cabeçalho da página.
- Computador do Tales (Windows): os JSON de `provas-separadas.zip` não chegaram a esta máquina; as provas
  foram separadas com `questoes` a partir dos PDFs (mesma numeração), e as respostas vêm de [dicas/](dicas/).

## Modelo de seção por prova

Copiar para cada prova nova (ex.: `## SIMÃO 2024`):

| Nº | Assunto (palavras nossas) | Formato | Green: cap. e páginas | Tema / subtema | Lote | Id | Situação |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | a fazer |

## Retomada atual (25/10/2026)

**SBCM 2023 fechada** no modelo de miniaula (docs/prompts/comentarios-miniaula.md): 99 publicadas (mao-2189 a mao-2277 e
ombro-cotovelo-0676 a 0685), gabarito A 25, B 25, C 25, D 24. Pendente só a 56 (inervação da cápsula anterior do cotovelo:
nenhum livro ou resumo local traz o dado). Figuras 22, 25, 37, 63, 65, 75, 81 e 100 viraram questões descritas em texto,
conferidas na prova com resposta (`provas/Prova SBCM 2023 - com resposta.pdf`, que traz a citação original do Green).
Questões refeitas por defeito no original: 9 (sem gabarito), 72 (sem resposta única), 88 (alternativa partida) e 67
(enunciado segue a Tabela 38.2). Na 40, a tradução do Green perdeu a frase sobre a juntura; vale a frase original citada
na correção. Lotes em `~/OrtoQuestoes-Biblioteca/lotes/sbcm-2023/lote_03_natural.py` a `lote_22.py`.

Ferramentas de leitura usadas (scratch, recriáveis): `pg.sh "<arquivo>" PÁG` (pdftotext -raw da página impressa, achando a
folha pelos marcadores do .oq/texto), `busca.py "<arquivo>" REGEX` e `ver.py <slug> NUM...` (questão original + resposta
da correção). Tabelas e figuras do Green: `pdftoppm -r 90 -f FOLHA` e ler a imagem.

**Próximo:** comentar o ENARE de pré-requisito em Cirurgia da Mão (2021/22, 2022/23 e 2024/25; 119 questões sem comentário,
ids em docs/importacoes/cirurgia-mao-outubro-2026.md), depois SIMÃO 2022, 2024 e 2021, e por fim passar para miniaula
o SIMÃO 2026. Também há `provas/MÃO EXPERT - SBCM 2025.pdf` na biblioteca: a SBCM 2025 existe e entra na fila.

## Piloto de miniaula, 22/10/2026

Ajuste posterior pedido pelo Tales: mao-2199 reescrita em prosa natural, sem peças numeradas nem estrutura rígida. Revisão local em revisao_watson_natural.py; enunciado, alternativas, gabarito e fontes preservados.

**Andamento:** por novo pedido do Tales, publicar uma única questão pendente com o modelo de
`docs/prompts/comentarios-miniaula.md`: SBCM 2023, questão 59, teste de WATSON, `mao-2199`.
Fonte lida: Green cap. 13, p. 508 a 510, incluindo a legenda da Fig. 13.22.
Sem divergência de gabarito: o clunk de redução ocorre ao retirar a pressão; a baixa especificidade
do teste está explicada. Lote local: `lotes/sbcm-2023/piloto_miniaula_59.py`.

Lotes 01 e 02 já publicados no PR #471. Gabarito acumulado com o piloto: A 3, B 2, C 3, D 3.
Os lotes 03 e 04 foram redigidos e aplicados somente no branch `claude/relaxed-franklin-0snpiu`,
preservados em 55cec011 e 84296019, mas NÃO foram incorporados ao site. O pedido mais recente foi
mostrar uma única questão no novo modelo. Antes de retomar esses lotes, rever seus comentários
no modelo de miniaula e reaplicar sobre o acervo publicado, com IDs novos: o id mao-2199 agora
pertence ao piloto WATSON, e os IDs antigos desses rascunhos não devem ser mesclados diretamente.
Os textos completos permanecem na biblioteca local e no histórico do branch.

Próximo id sequencial publicado: mao-2200. Primeiro lote anterior ainda não publicado: lote_03
(91, 40, 79, 34, 37). A 40 não teve o detalhe da juntura confirmado nas p. 345 a 347 do cap. 8.
Lote_05 (22, 42, 59, 75, 80): a 59 já está concluída neste piloto e não deve entrar outra vez.

## Retomada (atualizado em 20/10/2026, fim da sessão da conta 1)

**Ponto exato:** SIMÃO 2023 com 97 publicadas (mao-1932 a mao-2022 e ombro-cotovelo-0658 a 0663); só faltam as 3 sem fonte; as 63 primeiras já revisadas no
padrão novo. Próximo trabalho, nesta ordem:

1. (feito) Lote 18: 15, 56, 55, 73 publicadas (mao-2015 a mao-2018). A 37 (osteoblastoma) ficou
   "pendente: sem fonte": o Green (cap. 59, p. 2220) só fala da coluna e da localização medular, e não há resumo
   do cap. 59; a correção cita o livro da SBCM de lesões não traumáticas, que não está na biblioteca.
2. (feito) Lote 19: 46, 57, 64, 68 publicadas (mao-2019 a mao-2022).
3. (feito) Lote 20, ombro-cotovelo: 16, 65, 29, 69, 48, 49 publicadas (ombro-cotovelo-0658 a 0663).
4. (conferido) 89, 38 e 37 seguem "pendente: sem fonte": os resumos só repetem a questão (89) ou listam o
   teste de Egawa sem descrevê-lo (38).
5. (feito) Fim do SIMÃO 2023: gabarito A 25, B 24, C 24, D 24; lições e divergências no fim de
   docs/simulados/simao-engenharia-reversa.md.
6. **SIMÃO 2026: refazer os comentários** (em andamento). Método: `~/OrtoQuestoes-Biblioteca/lotes/simao-2026/`
   com `_comentario.py` (cópia em docs/mao/ferramentas/) e um `revisao_NN.py` por grupo de 5 ids, na ordem do
   acervo (lista em `.oq/simao2026-lista.txt`). Só o comentário muda; enunciado, alternativas, gabarito e id ficam.
   Aplicar: `aplicar_lote.py ~/OrtoQuestoes-Biblioteca/lotes/simao-2026 mao revisao_NN` (os 8 de cotovelo,
   ombro-cotovelo-0645 a 0652, num arquivo à parte com o tema ombro-cotovelo).
   **Concluído em 20/10/2026:** revisões 01 a 20. Todas as 92 de mão (mao-1719 a mao-1810) e 6 de cotovelo
   (ombro-cotovelo-0646, 0648 a 0652, revisao_20.py aplicada com o tema ombro-cotovelo) refeitas. A 0645 (bifurcação
   alta da braquial, cerca de 15%) e a 0647 (origem da braquial no redondo maior) ficaram com o comentário anterior:
   os livros e resumos locais não trazem esses dados, e o comentário não pode ser refeito com fonte. Se o Tales mandar
   um livro de anatomia, refazer as duas.
   Atalho: `bash ~/OrtoQuestoes-Biblioteca/.oq/revisar2026.sh NN AAAA BBBB` aplica, valida, atualiza a linha
   acima e faz commit local (cópia em docs/mao/ferramentas/). Push e PR a cada 2 a 4 revisões (AGENTS.md,
   "Eficiência de desenvolvimento e GitHub Actions"). Divergências registradas nos comentários: mao-1753
   (enxerto de nervo: cap. 30 cerca de 3 semanas, cap. 43 1 a 2 semanas) e mao-1783 (Garcia-Elias: a
   alternativa chama de estágio 5 o irredutível, que na Tabela 13.4 do Green é o 6).
6b. **Comentários mais profundos (pedido do Tales, 22/10/2026: "os comentarios estão ficando muito fracos").**
   Padrão: docs/padrao-editorial-comentarios.md e mao-0853 (conceito como aula; cada alternativa com parágrafo
   próprio, uns 400 a 600 caracteres, com mecanismo, quando seria verdadeira e a confusão explorada). Ler um trecho
   maior do Green em volta da resposta antes de escrever. Medianas antes: SBCM 2024 conceito 1.684 e alternativa 143;
   SBCM 2022 1.534 e 126. Ordem: (1) refazer a SBCM 2022 publicada com `lotes/sbcm-2022/revisao_NN.py` (atalho
   `_comentario.py`, mesmo enunciado e gabarito); (2) lotes novos da SBCM 2022 já no padrão; (3) refazer a SBCM 2024.
   **Etapa (1) concluída em 22/10/2026:** revisao_01 a 09 refazem mao-2106 a 2150 (medianas por questão de 3.500 a 4.200
   caracteres). Na 2143 a alternativa B virou extensor ulnar do carpo, porque o Green cita OMER com o FDS (p. 1223).
   PR #456 leva as revisões 01 a 07; as 08 e 09 vão no próximo push. Etapa (2) em curso: lote 12 publicado no padrão
   (mao-2151 a 2155, PR #456 já juntado antes dele). Lotes 13 a 16 publicados (mao-2156 a 2175; PR #457 juntado com 12 a 14; 15 e 16 no PR seguinte).
   **SBCM 2022 fechada em 22/10/2026:** lotes 17 a 21 publicados (mao-2176 a mao-2188 e ombro-cotovelo-0670 a 0675);
   89 publicadas, gabarito A 22, B 23, C 22, D 22; a 38 saiu da pendência pela imagem da p. 398 (lote 21). Pendentes:
   19, 21, 34, 44, 45 e 54 (figura); 5, 52, 74, 89 e 95 (sem fonte). Lições no fim de docs/simulados/simao-engenharia-reversa.md.
   **Próximo (etapa 3 do 6b): refazer os comentários da SBCM 2024** (mao-2023 a mao-2105 e ombro-cotovelo-0664 a 0669)
   no padrão profundo, como `lotes/sbcm-2022/revisao_01.py` a `revisao_09.py` (atalho `_comentario.py` na pasta
   `lotes/sbcm-2024/`, mesmo enunciado e gabarito). Depois SIMÃO 2022, SBCM 2023, SIMÃO 2024, SIMÃO 2021 e ENARE.
   Andamento (lista em `.oq/sbcm2024-lista.txt`, na ordem do acervo): revisões 01 a 18 feitas: SBCM 2024 inteira refeita no padrão profundo (mao-2023 a 2105 e ombro-cotovelo-0664 a 0669), em 22/10/2026. Aprofundar depois as revisões 02, 15 e 18 (mediana abaixo de 3.500 caracteres). Próximo: SBCM 2023, fase 0 concluída; lotes 01 e 02 publicados, mais piloto_miniaula_59 (mao-2199, WATSON). Próximo id mao-2200; seguir a Retomada atual acima, que distingue os rascunhos dos lotes 03/04 da publicação efetiva. Lotes locais em `lotes/sbcm-2023/`.
7. **SBCM 2024 fechada em 21/10/2026** (89 publicadas: mao-2023 a mao-2105 e ombro-cotovelo-0664 a 0669; pendentes 2, 19, 23, 71, 72, 76 e 79, figura, e 25, 26, 27 e 28, sem fonte; lições em docs/simulados/simao-engenharia-reversa.md). **SBCM 2022 fechada em 22/10/2026** (ver 6b; antes: lotes 01 a 16 publicados: mao-2106 a mao-2175; pendentes 19, 21, 34, 44, 45 e 54, figura, e 5, 38, 74 e 89, sem fonte. Fase 0 feita em 21/10/2026: prova em `.oq/provas/sbcm-2022.json` e `.txt`, 100 questões classificadas e divididas em 20 lotes na seção SBCM 2022 abaixo; lotes em `~/OrtoQuestoes-Biblioteca/lotes/sbcm-2022/`, `PROVA = "SBCM"`, `ANO = 2022`, copia com o slug `sbcm-2022`). Dica: quando o texto
   em colunas vier truncado, `pdftotext -enc UTF-8 -raw -f FOLHA -l FOLHA "<pdf>"` recupera o trecho.
   (fase 0 feita em 20/10/2026: prova separada em `.oq/provas/sbcm-2024.json`, 100 questões
   classificadas e divididas em 20 lotes na seção SBCM 2024 abaixo; lotes em `~/OrtoQuestoes-Biblioteca/lotes/sbcm-2024/`,
   `PROVA = "SBCM"`, `ANO = 2024`, copia com o slug `sbcm-2024`). Depois SBCM 2022,
   SIMÃO 2022, SBCM 2023, SIMÃO 2024, SIMÃO 2021; depois ENARE 2022, 2023 e 2025.

**Como foi feito até aqui (repetir igual):**
- Lote novo em `~/OrtoQuestoes-Biblioteca/lotes/simao-2023/lote_NN.py` (modelo: `lote_14.py` a `lote_17.py`).
- Fontes: `grep` em `~/OrtoQuestoes-Biblioteca/.oq/texto/livros__<capítulo>.txt` e `resumos__*.txt`; a
  página impressa é a da marca `===== ... p. N` imediatamente acima da linha. O texto tem duas colunas
  misturadas: ler com `cut -c1-95` (coluna esquerda) e `cut -c90-` (direita).
- Ciclo: `copia` → `aplicar_lote --conferir` → aplicar → `gerar_indice` → `validar_acervo` →
  `progresso.py` → commit local (só `public/acervo` e `docs/mao`). A cada 2 a 4 lotes: `npx tsc -b`,
  `PYTHONUTF8=1 npm test`, um push, PR de `claude/relaxed-franklin-0snpiu` para `claude/pdfs-questoes-tp64dr` e merge.
- O gabarito acumulado do SIMÃO 2023 está na linha do Resumo; equilibrar a letra certa em cada lote.
- Feedback do Tales em 20/10/2026: questões bem próximas do original (mesma pergunta, mesmas
  alternativas, outras palavras); citação do Green flexível (muita quando a resposta depende da letra do
  livro, nenhuma quando não acrescenta); páginas sempre conferidas; tom de professor.
- Ferramentas arquivadas em [ferramentas/](ferramentas/README.md).

## Revisão das questões já publicadas (pedido do Tales, 20/10/2026)

"Deixar as questões mais parecidas com as originais, todas elas": cada lote publicado ganha um
`lotes/simao-2023/revisao_NN.py` (na biblioteca, fora do git) que carrega o `lote_NN.py`, aproxima enunciado e
alternativas da prova (passando no `copia`), acrescenta a citação literal do Green com capítulo e página e faz o
"Por que esta questão foi criada." começar por "Inspirada na questão N do SIMÃO 2023". Aplicar com
`bash ~/OrtoQuestoes-Biblioteca/.oq/revisar.sh NN "questões" "ids"` (usa `aplicar_lote.py` com `id=`, que revisa no lugar).

| Revisão | Questões | Ids | Situação |
|---|---|---|---|
| 01 | 1, 2, 7, 9, 74 | mao-1932 a 1936 | revisada |
| 02 | 19, 21, 41, 78, 97 | mao-1937 a 1941 | revisada |
| 03 | 17, 87, 25, 24 | mao-1942 a 1945 | revisada |
| 04 | 18, 22, 77, 88, 90 | mao-1946 a 1950 | revisada |
| 05 | 44, 58, 71, 82, 85 | mao-1951 a 1955 | revisada (71 volta à pergunta original, resposta da banca: Green cap. 13, p. 500, padrão reverso) |
| 06 | 20, 30, 86, 84, 81 | mao-1956 a 1960 | revisada (81 volta às alternativas da prova) |
| 07 | 5, 50, 6, 61, 66 | mao-1961 a 1965 | revisada |
| 08 | 8, 12, 34, 100, 35 | mao-1966 a 1970 | revisada (34 volta à pergunta da prova) |
| 09 | 4, 26, 39, 42, 67 | mao-1971 a 1975 | revisada |
| 10 | 60, 51, 93, 43 | mao-1976 a 1979 | revisada |
| 11 | 53, 59, 72, 83, 95 | mao-1980 a 1984 | revisada |
| 12 | 31, 80, 54, 99, 14 | mao-1985 a 1989 | revisada |
| 13 | 45, 13, 36, 96, 70 | mao-1990 a 1994 | revisada |

Depois das revisões: lotes 14 a 20 do SIMÃO 2023 já no padrão novo (redação próxima, citação literal).

## SIMÃO 2023

Separada de `Prova  Simão 2023 - sem resposta.pdf` (100 questões; a 12 conferida à mão pela dica). Resposta da
correção em [dicas/simao-2023.md](dicas/simao-2023.md). Lotes por capítulo do Green; páginas impressas anotadas
quando o lote é escrito (até lá, só o capítulo). Cotovelo (lote 20) vai no tema `ombro-cotovelo`.

| Nº | Assunto (palavras nossas) | Formato | Green: cap. e páginas | Tema / subtema | Lote | Id | Situação |
|---|---|---|---|---|---|---|---|
| 1 | Diáfise da falange proximal: para onde aponta o ápice e qual músculo deforma | fato com mecanismo | cap. 7, p. 268, 290, 299, 304 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1932 | publicada |
| 2 | Falange média: traço mais frequente na diáfise | fato | cap. 7, p. 290, 291, 299 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1933 | publicada |
| 3 | Madelung: ligamento de VICKERS, posição e ossos que une | epônimo e anatomia | cap. 38, p. 1503 e 1505 | mao / Deficiências longitudinais e mão torta | 16 | mao-2005 | publicada |
| 4 | Canal de GUYON, zona III: tipo de déficit | anatomia aplicada | cap. 28 (arquivo 26), p. 1103 | mao / Neuropatia ulnar e outras compressões | 09 | mao-1971 | publicada |
| 5 | Artrose radiolunar isolada: causa mais comum | fato | cap. 12, p. 454, 457, 458 | mao / Artrose do punho e artroscopia | 07 | mao-1961 | publicada |
| 6 | Rizartrose avançada: postura do polegar (adução e MCF) | fato | cap. 11, p. 422, 423 | mao / Rizartrose e artrose da mão | 07 | mao-1963 | publicada |
| 7 | Cabeça do metacarpo: raio mais fraturado | fato | cap. 7, p. 260 a 263 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1934 | publicada |
| 8 | Mão reumatoide: ressecção da ulna distal (indicação, extensão, sinovectomia, ERC) | afirmativas | cap. 55, p. 2063 a 2065 | mao / Mão reumatoide | 08 | mao-1966 | publicada |
| 9 | Colo do metacarpo: indicações cirúrgicas (pseudogarra, rotação, dedos radiais, encurtamento) | afirmativas | cap. 7, p. 263, 268 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1935 | publicada |
| 10 | Braquidactilia na síndrome de APERT: com o que se associa | classificação | cap. 36, p. 1405 | mao / Outras malformações congênitas | 14 | mao-1995 | publicada |
| 11 | Medida da pressão compartimental: contraindicação | fato | cap. 51, p. 1971 | mao / Outros temas da mão | 17 | mao-2011 | publicada |
| 12 | Túnel do carpo leve na artrite reumatoide sem tenossinovite: conduta | conduta | cap. 55, p. 2050 (Tabela 55.4) | mao / Síndrome do túnel do carpo | 08 | mao-1967 | publicada |
| 13 | Infecção crônica: unhas azuladas e baqueteamento | sinal | cap. 3, p. 69 | mao / Infecções da mão | 13 | mao-1991 | publicada |
| 14 | MACS na paralisia cerebral: nível pela descrição | classificação | cap. 32, p. 1245, 1246 (Tabela 32.3) | mao / Transferências tendinosas e paralisias | 12 | mao-1989 | publicada |
| 15 | Cisto sinovial: componente predominante do conteúdo | fato | cap. 59, p. 2195 | mao / Cistos sinoviais e gangliões | 18 | mao-2015 | publicada |
| 16 | Cabeça do rádio, HOTCHKISS tipo II (a correção ressalva) | classificação | cap. 19, p. 900 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | ombro-cotovelo-0658 | publicada |
| 17 | Flexor na zona 1: quando cabe a reinserção ou sutura primária (coto distal) | número | cap. 6, p. 216, 219 | mao / Lesões dos tendões flexores | 03 | mao-1942 | publicada |
| 18 | Escafoide: ordem de frequência por região | fato | cap. 16, p. 677 a 680 | mao / Fraturas do escafoide e do carpo | 04 | mao-1946 | publicada |
| 19 | Pseudobotoeira: estruturas contraídas na flexão da IFP | mecanismo | cap. 5, p. 198 a 201; cap. 10, p. 388, 389 | mao / Lesões ligamentares dos dedos | 02 | mao-1937 | publicada |
| 20 | Rádio distal consolidado: de onde vêm as queixas residuais | fato | cap. 15, p. 604, 608, 646 | mao / Fratura do rádio distal | 06 | mao-1956 | publicada |
| 21 | Botoeira crônica: estágio com contratura fixa e da banda lateral | classificação | cap. 5 (arquivo "4- T. extensor"), p. 199 a 202 | mao / Lesões dos tendões extensores | 02 | mao-1938 | publicada |
| 22 | Escafoide: fator que aumenta a pseudoartrose | fato | cap. 16, p. 678 a 682 | mao / Fraturas do escafoide e do carpo | 04 | mao-1947 | publicada |
| 23 | Polidactilia central: dedo mais acometido | fato | cap. 36, p. 1387 | mao / Sindactilia e polidactilia | 14 | mao-1996 | publicada |
| 24 | Ponta do dedo, ALLEN: zona proximal à lúnula | classificação | cap. 49, p. 1907 a 1911; cap. 9, p. 365 | mao / Amputações e reimplantes | 03 | mao-1945 | publicada |
| 25 | Hematoma subungueal com retirada da unha: o que fazer com a lâmina | conduta | cap. 9, p. 365 a 367 | mao / Lesões ligamentares dos dedos | 03 | mao-1944 | publicada |
| 26 | Túnel do carpo: fibras que o eletrodiagnóstico avalia | fato | cap. 28 (arquivo 26), p. 1093, 1094 | mao / Síndrome do túnel do carpo | 09 | mao-1972 | publicada |
| 27 | Mão torta ulnar: associação mais comum | fato | cap. 38, p. 1500 | mao / Deficiências longitudinais e mão torta | 16 | mao-2006 | publicada |
| 28 | Carcinoma espinocelular: lesão precursora | fato | cap. 58, p. 2164 e 2170 | mao / Tumores da mão | 17 | mao-2014 | publicada |
| 29 | Tríade terrível: acesso para o coronoide | técnica | cap. 22, p. 985 | ombro-cotovelo / Instabilidade do cotovelo | 20 | ombro-cotovelo-0660 | publicada |
| 30 | FERNANDEZ (rádio distal): mecanismo e fratura correspondente | classificação | cap. 15, p. 607, 608 | mao / Fratura do rádio distal | 06 | mao-1957 | publicada |
| 31 | Plexo braquial: sinal de lesão pós-ganglionar | raciocínio | cap. 34, p. 1308, 1309 | mao / Plexo braquial e paralisia obstétrica | 12 | mao-1985 | publicada |
| 32 | Mão em espelho (dimelia ulnar): características | afirmativas | cap. 36, p. 1389 a 1391 | mao / Outras malformações congênitas | 16 | mao-2007 | publicada |
| 33 | Macrodactilia: diagnóstico, associação e tratamento | afirmativas | cap. 36, p. 1438 a 1445 | mao / Outras malformações congênitas | 14 | mao-1997 | publicada |
| 34 | Pseudogota: local mais comum do depósito de pirofosfato | fato | cap. 56, p. 2115; cap. 55, p. 2043 | mao / Mão reumatoide | 08 | mao-1968 | publicada |
| 35 | Dupuytren: grupo de fatores de risco | lista | cap. 4, p. 148, 149 | mao / Doença de Dupuytren | 08 | mao-1970 | publicada |
| 36 | Tenossinovite flexora (PANG): fator de mau prognóstico | fato | cap. 2, p. 21, 33 | mao / Infecções da mão | 13 | mao-1992 | publicada |
| 37 | Osteoblastoma no punho: osso e exame de escolha (correção: não está no Green) | par | cap. 59, p. 2220 (só coluna e localização medular) | mao / Tumores da mão | 18 |  | pendente: sem fonte |
| 38 | Túnel cubital: sinal da excursão lateral do dedo médio | epônimo | cap. 28 (arquivo 26): sinal não descrito | mao / Neuropatia ulnar e outras compressões | 09 |  | pendente: sem fonte (Egawa só aparece pelo nome no resumo do cap. 28; nenhum livro local define o sinal) |
| 39 | Ramo profundo do ulnar no Guyon: músculos acometidos | anatomia | cap. 28 (arquivo 26), p. 1103 | mao / Neuropatia ulnar e outras compressões | 09 | mao-1973 | publicada |
| 40 | Luxação congênita da cabeça do rádio: lado e direção mais comuns | fato | cap. 38, p. 1513 e 1515; resumo cap. 38 | mao / Outras malformações congênitas | 16 | mao-2008 | publicada |
| 41 | IFP: causa mais comum da contratura em extensão | fato | cap. 10, p. 388, 389, 395, 403, 404 (a "causa mais comum" está no resumo do cap. 10) | mao / Deformidades dos dedos | 02 | mao-1939 | publicada |
| 42 | Nervo cutâneo lateral do antebraço: origem e onde emerge | anatomia | cap. 30, p. 1151; cap. 28, p. 1113 | mao / Anatomia da mão e punho | 09 | mao-1974 | publicada |
| 43 | Paralisia obstétrica: achado e o que ele significa | par | cap. 40, p. 1561 a 1563 | mao / Plexo braquial e paralisia obstétrica | 10 | mao-1979 | publicada |
| 44 | GARCIA-ELIAS: estágio da lesão parcial reparável com ângulo normal | classificação | cap. 13, p. 512 a 514 | mao / Instabilidade do carpo | 05 | mao-1951 | publicada |
| 45 | Paralisia cerebral: punho em flexão e indicações | afirmativas | cap. 32, p. 1251 | mao / Transferências tendinosas e paralisias | 13 | mao-1990 | publicada |
| 46 | Retalho lateral do braço: artéria | anatomia | cap. 45, p. 1756 | mao / Microcirurgia e retalhos livres | 19 | mao-2019 | publicada |
| 47 | Zona de atividade polarizante: molécula responsável | embriologia | cap. 35, p. 1365 | mao / Outras malformações congênitas | 15 | mao-2003 | publicada |
| 48 | MONTEGGIA posterior: padrão mais comum | classificação | cap. 20, p. 939 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | ombro-cotovelo-0662 | publicada |
| 49 | Úmero distal: vias de acesso | afirmativas | cap. 18, p. 875 e 881 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | ombro-cotovelo-0663 | publicada |
| 50 | Artrodese total do punho: indicações e complicações | afirmativas | cap. 12, p. 453, 460 a 465 | mao / Artrose do punho e artroscopia | 07 | mao-1962 | publicada |
| 51 | Lesão nervosa: regeneração, ENMG, SUNDERLAND, TINEL | afirmativas | cap. 30, p. 1152, 1153, 1157 | mao / Lesões de nervos periféricos | 10 | mao-1977 | publicada |
| 52 | Camptodactilia na artrogripose | afirmativas | cap. 39, p. 1556 | mao / Outras malformações congênitas | 17 | mao-2010 | publicada |
| 53 | Paralisia radial: vantagem do flexor superficial sobre o FUC para os dedos | transferência | cap. 31, p. 1191, 1228, 1229 | mao / Transferências tendinosas e paralisias | 11 | mao-1980 | publicada |
| 54 | Tetraplegia: quando operar o membro superior | número | cap. 33, p. 1265, 1266 | mao / Transferências tendinosas e paralisias | 12 | mao-1987 | publicada |
| 55 | Enxerto de pele na palma: espessura e mecanorreceptores | afirmativas | cap. 44, p. 1702 | mao / Cicatrização e enxertos de pele | 18 | mao-2017 | publicada |
| 56 | Sarcoma sinovial | afirmativas | cap. 59, p. 2215 | mao / Tumores da mão | 18 | mao-2016 | publicada |
| 57 | Vascularização lateral do braço (braquial profunda e colaterais) | afirmativas | cap. 45, p. 1756 | mao / Microcirurgia e retalhos livres | 19 | mao-2020 | publicada |
| 58 | Instabilidade carpal não dissociativa | afirmativas | cap. 13, p. 537 a 539 | mao / Instabilidade do carpo | 05 | mao-1952 | publicada |
| 59 | VOCHE e MERLE: abdução do mínimo na paralisia ulnar | epônimo | cap. 31, p. 1223, 1224 | mao / Transferências tendinosas e paralisias | 11 | mao-1981 | publicada |
| 60 | Desfiladeiro torácico: compressão distal associada mais comum | fato | cap. 29, p. 1132, 1133 | mao / Neuropatia ulnar e outras compressões | 10 | mao-1976 | publicada |
| 61 | EATON e LITTLER: estágio pela descrição | classificação | cap. 11, p. 423, 424 | mao / Rizartrose e artrose da mão | 07 | mao-1964 | publicada |
| 62 | Polidactilia central: ordem de frequência dos dedos | fato | cap. 36, p. 1387 | mao / Sindactilia e polidactilia | 14 | mao-1998 | publicada |
| 63 | Sinostose radioulnar proximal | afirmativas | cap. 38, p. 1515 a 1518 | mao / Outras malformações congênitas | 16 | mao-2009 | publicada |
| 64 | Retalhos: pedículo de cada um (braço lateral, chinês, escapular, inguinal) | afirmativas | cap. 45, p. 1748 a 1762 | mao / Microcirurgia e retalhos livres | 19 | mao-2021 | publicada |
| 65 | Cabeça do rádio: centro da zona segura | número | cap. 19, p. 901 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | ombro-cotovelo-0659 | publicada |
| 66 | Rizartrose: osteotomia do primeiro metacarpo | afirmativas | cap. 11, p. 423 a 426, 429, 432 | mao / Rizartrose e artrose da mão | 07 | mao-1965 | publicada |
| 67 | Ramo sensitivo do radial (WARTENBERG): anatomia e manobra | afirmativas | cap. 28 (arquivo 26), p. 1113 | mao / Neuropatia ulnar e outras compressões | 09 | mao-1975 | publicada |
| 68 | Grande dorsal e serrátil: tipo de retalho e artérias | par | cap. 45, p. 1748 e 1774 | mao / Microcirurgia e retalhos livres | 19 | mao-2022 | publicada |
| 69 | Luxação do cotovelo: mecanismo mais comum | mecanismo | cap. 22, p. 978 | ombro-cotovelo / Instabilidade do cotovelo | 20 | ombro-cotovelo-0661 | publicada |
| 70 | Anestesia em procedimento bilateral | afirmativas | cap. 1, p. 2 | mao / Anestesia em cirurgia da mão | 13 | mao-1994 | publicada |
| 71 | Perilunar dorsal: ligamentos cuja lesão permite a luxação | anatomia | cap. 13, p. 491, 492, 499, 500 | mao / Instabilidade do carpo | 05 | mao-1953 | publicada (o original apoiava a resposta no radioescafolunar, que o Green não considera ligamento verdadeiro; reescrita pela ruptura do SL dorsal no estágio I de Mayfield) |
| 72 | Lesão baixa do mediano: músculo preservado | anatomia | cap. 31, p. 1191, 1192 | mao / Transferências tendinosas e paralisias | 11 | mao-1982 | publicada |
| 73 | Reimplante de dedo: sequência clássica | sequência | cap. 42, p. 1657; resumo cap. 42 | mao / Amputações e reimplantes | 18 | mao-2018 | publicada |
| 74 | Pseudoartrose de metacarpo: tratamento | conduta | cap. 7, p. 263, 281, 282 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1936 | publicada |
| 75 | Mão de APERT: quais dedos se fundem | fato | cap. 36, p. 1389 | mao / Sindactilia e polidactilia | 14 | mao-1999 | publicada |
| 76 | Sindactilia: complicações pós-operatórias mais raras | fato | cap. 36, p. 1378 | mao / Sindactilia e polidactilia | 15 | mao-2000 | publicada |
| 77 | Risco de KIENBÖCK (VIEGAS, ZAPICO, variância, vascularização) | afirmativas | cap. 16, p. 727 a 729 | mao / Doença de Kienböck | 04 | mao-1948 | publicada |
| 78 | Tenotomia de FOWLER: estrutura que precisa estar íntegra | epônimo | cap. 5, p. 195 a 198 | mao / Lesões dos tendões extensores | 02 | mao-1940 | publicada (o original tinha duas respostas: o tendão terminal também precisa estar em continuidade; reescrita pergunta o que evita a botoeira) |
| 79 | Adulto: fraturas mais associadas à síndrome compartimental do membro superior | fato | cap. 51, p. 1969 | mao / Outros temas da mão | 17 | mao-2012 | publicada |
| 80 | Plexo braquial: quando fazer o eletrodiagnóstico | número | cap. 34, p. 1309, 1310 | mao / Plexo braquial e paralisia obstétrica | 12 | mao-1986 | publicada |
| 81 | Artroscopia: o que se vê pelo portal 3-4 | anatomia | cap. 17, p. 765 | mao / Artrose do punho e artroscopia | 06 | mao-1960 | publicada (pelo 3-4 veem-se vários ligamentos; reescrita pela primeira estrutura vista, o Testut) |
| 82 | Dissociação SL aguda (ANDERSSON): padrão mais comum | classificação | cap. 13, p. 492, 514 | mao / Instabilidade do carpo | 05 | mao-1954 | publicada |
| 83 | BURKHALTER: transferência precoce na paralisia radial | epônimo | cap. 31, p. 1228, 1229 | mao / Transferências tendinosas e paralisias | 11 | mao-1983 | publicada |
| 84 | ARUD crônica após consolidação viciosa | afirmativas | cap. 14, p. 577, 578 | mao / Fibrocartilagem triangular e punho ulnar | 06 | mao-1959 | publicada (divergência: a correção marca a discrepância do antebraço; o Green sustenta literalmente o desvio coronal, que ficou como resposta) |
| 85 | DCSS: de qual ligamento se origina | anatomia | cap. 13, p. 491 a 493, 512 a 514 | mao / Instabilidade do carpo | 05 | mao-1955 | publicada |
| 86 | Ângulo da gota de lágrima: o que representa e o ligamento inserido | par | cap. 15, p. 604; cap. 13, p. 491 | mao / Fratura do rádio distal | 06 | mao-1958 | publicada |
| 87 | Reabilitação do flexor: início do fortalecimento isolado | número | cap. 6, p. 225 a 227 | mao / Lesões dos tendões flexores | 03 | mao-1943 | publicada |
| 88 | Biomecânica da fratura do escafoide e do perilunar | afirmativas | cap. 16, p. 678 | mao / Fraturas do escafoide e do carpo | 04 | mao-1949 | publicada |
| 89 | Falange proximal: desvios aceitáveis no tratamento conservador | número | cap. 7 (p. 299 e 304 não trazem os graus) | mao / Fraturas dos metacarpos e falanges | 01 | | pendente: sem fonte (11 e 21 graus não estão no Green nem nos outros livros locais; o original troca coronal por perfil) |
| 90 | LICHTMAN atualizada: em que se baseia | classificação | cap. 16, p. 729 a 733 | mao / Doença de Kienböck | 04 | mao-1950 | publicada |
| 91 | Clinodactilia: deformidade que entra na classificação | classificação | cap. 36, p. 1433 | mao / Deformidades dos dedos | 15 | mao-2001 | publicada |
| 92 | SDCR: como se faz o diagnóstico | fato | cap. 53, p. 2005 | mao / Síndrome da dor complexa regional | 17 | mao-2013 | publicada |
| 93 | Nervo sural no tornozelo: relação com o tendão calcâneo | anatomia | cap. 30, p. 1166 a 1168 | mao / Lesões de nervos periféricos | 10 | mao-1978 | publicada |
| 94 | Banda de constrição | afirmativas | cap. 36, p. 1404 e 1405 | mao / Outras malformações congênitas | 15 | mao-2002 | publicada |
| 95 | Paralisia radial: primeiro músculo do antebraço a voltar | fato | cap. 31, p. 1227, 1228 (Quadro 31.1) | mao / Transferências tendinosas e paralisias | 11 | mao-1984 | publicada |
| 96 | Tenossinovite do polegar comunicando com o mínimo: espaço | anatomia | cap. 2, p. 33 a 35 | mao / Infecções da mão | 13 | mao-1993 | publicada |
| 97 | Martelo: deformidade secundária | fato | cap. 5, p. 190, 196, 198 | mao / Lesões dos tendões extensores | 02 | mao-1941 | publicada |
| 98 | Nervo mediano: folheto embrionário de origem | embriologia | cap. 35, p. 1363 | mao / Outras malformações congênitas | 15 | mao-2004 | publicada |
| 99 | Classificação internacional da mão tetraplégica: grupo 4 | classificação | cap. 33, p. 1268 (Tabela 33.3), 1286 | mao / Transferências tendinosas e paralisias | 12 | mao-1988 | publicada |
| 100 | Mão reumatoide: VAUGHAN-JACKSON, MANNERFELT, IFD, capitato | afirmativas | cap. 55, p. 2044, 2050, 2052, 2057, 2061 | mao / Mão reumatoide | 08 | mao-1969 | publicada |

Lotes: 01 (1, 2, 7, 9, 74; a 89 ficou sem fonte) · 02 (19, 21, 41, 78, 97) · 03 (17, 87, 25, 24) · 04 (18, 22, 77, 88, 90) ·
05 (44, 58, 71, 82, 85) · 06 (20, 30, 86, 84, 81) · 07 (5, 50, 6, 61, 66) · 08 (8, 12, 34, 100, 35) ·
09 (4, 26, 38, 39, 42) · 10 (67, 60, 51, 93, 43) · 11 (53, 59, 72, 83, 95) · 12 (31, 80, 54, 99, 14) ·
13 (45, 13, 36, 96, 70) · 14 (10, 23, 33, 62, 75) · 15 (76, 91, 94, 47, 98) · 16 (3, 27, 32, 40, 63) ·
17 (52, 11, 79, 92, 28) · 18 (15, 37, 56, 55, 73) · 19 (46, 57, 64, 68) · 20 cotovelo (16, 65, 29, 69, 48, 49).

## SBCM 2024

Separada de `PROVA SBCM 2024 - sem resposta.pdf` em 20/10/2026 (100 questões; a 85 tem só três alternativas no
original e a 27 veio com alternativas emendadas: conferir à mão). Resposta da correção em [dicas/sbcm-2024.md](dicas/sbcm-2024.md).
As páginas da correção são do Green original e coincidem com a paginação impressa da tradução, por isso o capítulo abaixo
vem da página; ler a página antes de citar. "figura": a original depende de imagem; reescrever descrevendo o achado no
enunciado, ou deixar pendente. Cotovelo vai no tema `ombro-cotovelo` (lote 20). Fontes fora da biblioteca (The Wrist,
livros da SBCM): procurar o fato no Green; sem fonte, "pendente: sem fonte".

| Nº | Assunto (palavras nossas) | Formato | Green: cap. e páginas | Tema / subtema | Lote | Id | Situação |
|---|---|---|---|---|---|---|---|
| 1 | Dupuytren: comorbidades mais associadas | lista | cap. 4, p. 148 e 149 | mao / Doença de Dupuytren | 01 | mao-2023 | publicada |
| 2 | Técnica de tenorrafia (autor e zonas indicadas) | epônimo, figura | cap. 6, p. 239 | mao / Lesões dos tendões flexores | 01 |  | pendente: figura e zonas sem fonte no Green |
| 3 | Luxação MF dorsal complexa do polegar: estrutura interposta | fato | cap. 8, p. 358 | mao / Lesões ligamentares dos dedos | 02 | mao-2030 | publicada |
| 4 | Artrose mediocárpica no SNAC/SLAC: tratamento de escolha | conduta | cap. 12, p. 446 e 449 | mao / Artrose do punho e artroscopia | 03 | mao-2035 | publicada |
| 5 | Instabilidade carpal não dissociativa: característica | afirmativas | cap. 13, p. 501 e 537 | mao / Instabilidade do carpo | 04 | mao-2036 | publicada |
| 6 | Reconstrução da ARUD: autor e ligamentos | epônimo, figura | cap. 14, p. 579 | mao / Fibrocartilagem triangular e punho ulnar | 04 | mao-2039 | publicada |
| 7 | SLADE e GEISSLER: tipo com união fibrosa e traço mínimo | classificação | cap. 16, p. 696 | mao / Fraturas do escafoide e do carpo | 06 | mao-2045 | publicada |
| 8 | Acesso medial over-the-top na capsulotomia: vantagem | técnica | cap. 24, p. 1013 | ombro-cotovelo / Rigidez do cotovelo | 20 | ombro-cotovelo-0664 | publicada |
| 9 | Radial no cotovelo: cinco sítios de compressão | lista | cap. 28, p. 1116 | mao / Neuropatia ulnar e outras compressões | 10 | mao-2066 | publicada |
| 10 | Paralisia radial alta: transferência sempre presente | transferência | cap. 31, p. 1228 a 1230 | mao / Transferências tendinosas e paralisias | 11 | mao-2069 | publicada |
| 11 | Plexo: nervo que sai direto da raiz | anatomia | cap. 34, p. 1304 | mao / Plexo braquial e paralisia obstétrica | 13 | mao-2079 | publicada |
| 12 | Exemplo de deficiência longitudinal | classificação | cap. 38, p. 1494 e 1495; cap. 36, p. 1395 | mao / Deficiências longitudinais e mão torta | 15 | mao-2086 | publicada |
| 13 | MADELUNG: causa associada | fato | cap. 38, p. 1503 e 1505 | mao / Deficiências longitudinais e mão torta | 15 | mao-2087 | publicada |
| 14 | Sinal de PUTTI na paralisia obstétrica | sinal | cap. 40, p. 1578 | mao / Plexo braquial e paralisia obstétrica | 14 | mao-2082 | publicada |
| 15 | Retalho bipediculado do polegar | epônimo | cap. 44, p. 1719; cap. 48, p. 1851 | mao / Retalhos e cobertura cutânea | 17 | mao-2096 | publicada |
| 16 | Rigidez articular: resultados conforme a causa | afirmativas | cap. 10, p. 392 | mao / Deformidades dos dedos | 02 | mao-2031 | publicada |
| 17 | Paralisia cerebral: segunda prioridade na hierarquia | fato | cap. 32, p. 1248 | mao / Transferências tendinosas e paralisias | 12 | mao-2074 | publicada |
| 18 | Rádio distal na criança: fator de perda de redução | fato | cap. 41, p. 1625 | mao / Fratura do rádio distal | 05 | mao-2044 | publicada |
| 19 | Enxerto vascularizado para Kienböck: artéria | anatomia, figura | cap. 16, seção de enxertos vascularizados no Kienböck | mao / Doença de Kienböck | 07 |  | pendente: figura (o Green aceita várias artérias para o enxerto do Kienböck) |
| 20 | Polegar hipoplásico: tendão preferido na oponentoplastia | transferência | cap. 37, p. 1457 | mao / Outras malformações congênitas | 16 | mao-2090 | publicada |
| 21 | Carcinoma basocelular: formas | afirmativas | cap. 58, p. 2166 e 2167 | mao / Tumores da mão | 08 | mao-2054 | publicada |
| 22 | Síndrome compartimental neonatal | afirmativas | cap. 51, p. 1967 | mao / Outros temas da mão | 09 | mao-2062 | publicada |
| 23 | Artropatia pela imagem | diagnóstico, figura | cap. 55, p. 2040 e 2041 | mao / Mão reumatoide | 08 |  | pendente: figura (diagnóstico pela imagem) |
| 24 | Bloqueio interescalênico | afirmativas | cap. 1, p. 2 e 5 | mao / Anestesia em cirurgia da mão | 09 | mao-2061 | publicada |
| 25 | Prega palmar formada pela flexão das MF ulnares | anatomia | sem página na correção | mao / Anatomia da mão e punho | 19 |  | pendente: sem fonte (pregas palmares não descritas no Green) |
| 26 | Linha de KAPLAN com a borda radial do médio: referência | anatomia | sem página na correção | mao / Anatomia da mão e punho | 19 |  | pendente: sem fonte (linha cardinal de KAPLAN não está no Green) |
| 27 | Ângulo escafossemilunar da flexão à extensão | número | correção cita The Wrist | mao / Instabilidade do carpo | 04 |  | pendente: sem fonte (valores do ângulo SL não estão no Green) |
| 28 | Teste de BERGER | epônimo | correção cita The Wrist | mao / Exame físico da mão e punho | 11 |  | pendente: sem fonte (teste de BERGER não está no Green; os PDFs do Pardini são imagem, sem texto pesquisável) |
| 29 | Melhor indicação da transferência de dedo do pé | indicação | cap. 36, p. 1404 e 1423 | mao / Outras malformações congênitas | 16 | mao-2091 | publicada |
| 30 | Kienböck na criança: conduta (algoritmo de Lichtman) | conduta | cap. 16, p. 733 | mao / Doença de Kienböck | 06 | mao-2049 | publicada |
| 31 | Procedimento de LEECHAVENGVONGS | afirmativas | cap. 34, p. 1328 a 1330 | mao / Plexo braquial e paralisia obstétrica | 13 | mao-2080 | publicada (ângulo: divisão anterior do axilar, rotina no Green) |
| 32 | Germes de mordida animal, humana e em diabético ou usuário de droga | par | cap. 2, p. 17 e 18 | mao / Infecções da mão | 09 | mao-2058 | publicada |
| 33 | Contratura em flexão da IFP: vias de acesso | técnica | cap. 10, p. 400 | mao / Deformidades dos dedos | 03 | mao-2032 | publicada |
| 34 | Rádio distal: o que é a lágrima | anatomia | cap. 15, p. 604 | mao / Fratura do rádio distal | 05 | mao-2041 | publicada |
| 35 | Cisto: pseudorrecidiva após ressecção artroscópica | conduta | cap. 17, p. 773 e 774 | mao / Cistos sinoviais e gangliões | 07 | mao-2050 | publicada |
| 36 | Lesão crônica do radial: transferências de nervo | transferência | cap. 31, p. 1238 | mao / Lesões de nervos periféricos | 11 | mao-2070 | publicada |
| 37 | Espasticidade: deformidade comum | fato | cap. 32, p. 1248 | mao / Transferências tendinosas e paralisias | 12 | mao-2075 | publicada |
| 38 | Malformações do membro: semanas de gestação | número | cap. 35, p. 1363 | mao / Outras malformações congênitas | 14 | mao-2085 | publicada |
| 39 | Uma mão para comer e outra para limpar: qual doença | princípio | cap. 39, p. 1534 | mao / Outras malformações congênitas | 12 | mao-2076 | publicada |
| 40 | Retalho de KITE: artéria | anatomia | cap. 48, p. 1851 | mao / Retalhos e cobertura cutânea | 17 | mao-2097 | publicada |
| 41 | Anterolateral da coxa: ramo da circunflexa femoral lateral | anatomia | cap. 45, p. 1767 | mao / Microcirurgia e retalhos livres | 18 | mao-2103 | publicada |
| 42 | Nervo ulnar no braço: relações | anatomia | cap. 28, p. 1105 | mao / Neuropatia ulnar e outras compressões | 10 | mao-2067 | publicada |
| 43 | Cabeça do metacarpo: raio mais fraturado | fato | cap. 7, p. 260 | mao / Fraturas dos metacarpos e falanges | 02 | mao-2027 | publicada |
| 44 | Tuberculose no membro superior: o que raramente envolve | fato | cap. 3, p. 106 | mao / Infecções da mão | 09 | mao-2059 | publicada |
| 45 | WEISS-HASTINGS: tipo coronal dorsal | classificação | cap. 7, p. 284 e 285 | mao / Fraturas dos metacarpos e falanges | 02 | mao-2028 | publicada |
| 46 | GARCIA-ELIAS: propriocepção nas lesões escafossemilunares | classificação | cap. 13, p. 513 e 514 | mao / Instabilidade do carpo | 04 | mao-2037 | publicada |
| 47 | Olécrano, MAYO: fratura com subluxação | classificação | cap. 20, p. 939 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | ombro-cotovelo-0665 | publicada |
| 48 | Ossificação heterotópica, HASTINGS e GRAHAM: perda parcial da pronossupinação | classificação | cap. 21, p. 967 | ombro-cotovelo / Ossificação heterotópica | 20 | ombro-cotovelo-0666 | publicada |
| 49 | Mediano com intrínsecos paralisados: postura do polegar | fato | cap. 31, p. 1192 | mao / Transferências tendinosas e paralisias | 11 | mao-2071 | publicada |
| 50 | Paralisia obstétrica: segunda lesão mais comum | fato | cap. 40, p. 1562 e 1563 | mao / Plexo braquial e paralisia obstétrica | 14 | mao-2083 | publicada |
| 51 | ASIA: grau pela função motora preservada | classificação | cap. 33, p. 1267 (Tabela 33.1) | mao / Transferências tendinosas e paralisias | 13 | mao-2077 | publicada |
| 52 | APERT: tipo em que se resseca um dedo | classificação | cap. 36, p. 1382 e 1389 | mao / Sindactilia e polidactilia | 16 | mao-2092 | publicada |
| 53 | BAYNE modificada, tipo 3: rádio distal | classificação | cap. 38, p. 1495 (Tabela 38.2) | mao / Deficiências longitudinais e mão torta | 15 | mao-2088 | publicada |
| 54 | Artrogripose distal tipo 3: nome e achados | classificação | cap. 39, p. 1535 (Tabela 39.1) | mao / Outras malformações congênitas | 16 | mao-2093 | publicada |
| 55 | Curativo a vácuo: quando não usar | contraindicação | cap. 43, p. 1684 | mao / Retalhos e cobertura cutânea | 10 | mao-2064 | publicada |
| 56 | Pele palmar: estruturas da figura | anatomia, figura | cap. 44, p. 1702 e 1703 (Fig. 44.2) | mao / Anatomia da mão e punho | 18 | mao-2099 | publicada (ângulo: localização dos receptores, sem as letras da figura) |
| 57 | Retalho homodigital dorsorradial do polegar: tamanho e fechamento | número | cap. 48, p. 1851 | mao / Retalhos e cobertura cutânea | 17 | mao-2098 | publicada |
| 58 | Retalho radial do antebraço: perfurantes e dimensões | anatomia, número | cap. 45, p. 1759 | mao / Microcirurgia e retalhos livres | 18 | mao-2102 | publicada |
| 59 | Tuberculose óssea na criança: local mais comum | fato | cap. 3, p. 119 | mao / Infecções da mão | 08 | mao-2057 | publicada |
| 60 | Tetraplegia: função do punho e mão a obter | fato | cap. 33, p. 1268 e 1272 | mao / Transferências tendinosas e paralisias | 13 | mao-2078 | publicada |
| 61 | Paralisia obstétrica: sinal de avulsão | sinal | cap. 40, p. 1563 (Tabela 40.1) | mao / Plexo braquial e paralisia obstétrica | 14 | mao-2084 | publicada |
| 62 | Oponentoplastia de BURKHALTER: tendão | epônimo | cap. 31, p. 1196 e 1209 | mao / Transferências tendinosas e paralisias | 12 | mao-2072 | publicada |
| 63 | Retalhos venosos | afirmativas | cap. 45, p. 1748 e 1749 | mao / Microcirurgia e retalhos livres | 19 | mao-2104 | publicada |
| 64 | Cisto volar: localização habitual | anatomia | cap. 59, p. 2201 | mao / Cistos sinoviais e gangliões | 07 | mao-2051 | publicada |
| 65 | Dedo em gatilho: nervo digital em maior risco | anatomia | cap. 56, p. 2109 | mao / Dedo em gatilho e outras tenossinovites | 07 | mao-2052 | publicada |
| 66 | CMC do polegar: estabilizador primário | anatomia | cap. 11, p. 423 | mao / Rizartrose e artrose da mão | 03 | mao-2033 | publicada |
| 67 | Escafoide: porcentagem invisível na radiografia inicial | número | cap. 16, p. 682 | mao / Fraturas do escafoide e do carpo | 06 | mao-2046 | publicada |
| 68 | Escafoide: comprimento do parafuso | número | cap. 16, p. 689 | mao / Fraturas do escafoide e do carpo | 06 | mao-2047 | publicada |
| 69 | Dupuytren: estruturas da figura | anatomia, figura | cap. 4, p. 156 | mao / Doença de Dupuytren | 01 | mao-2024 | publicada |
| 70 | Rizartrose: estágio de EATON pela imagem | classificação, figura | cap. 11, p. 423 | mao / Rizartrose e artrose da mão | 03 | mao-2034 | publicada |
| 71 | CMC do polegar: ligamentos da figura | anatomia, figura | cap. 11, p. 423 | mao / Rizartrose e artrose da mão | 03 |  | pendente: figura (letras dos ligamentos) |
| 72 | Radiografia: diagnóstico | diagnóstico, figura | cap. 38 | mao / Deficiências longitudinais e mão torta | 15 |  | pendente: depende da radiografia |
| 73 | Ângulo da lágrima no desvio anterior | número | cap. 15, p. 604 e 610 | mao / Fratura do rádio distal | 05 | mao-2042 | publicada |
| 74 | Amputação no eponíquio: zonas de TAMAI e ALLEN | classificação | cap. 49, p. 1908 | mao / Amputações e reimplantes | 10 | mao-2065 | publicada |
| 75 | Tensor da fáscia lata: tipo de suprimento muscular | classificação | cap. 44, p. 1731 e 1732 | mao / Retalhos e cobertura cutânea | 18 | mao-2100 | publicada |
| 76 | Deformidade de dedo pela imagem | diagnóstico, figura | cap. 36 | mao / Deformidades dos dedos | 16 |  | pendente: depende da imagem |
| 77 | Retalho da imagem para a ponta do polegar | epônimo, figura | cap. 48, p. 1850 e 1853 (Fig. 48.6) | mao / Retalhos e cobertura cutânea | 19 | mao-2105 | publicada (caso da figura descrito) |
| 78 | CURTIS estágio II: estrutura seccionada | classificação | cap. 5, p. 201 e 202 | mao / Lesões dos tendões extensores | 01 | mao-2025 | publicada |
| 79 | Embriologia: camadas da figura | anatomia, figura | cap. 35, p. 1364 (Fig. 35.1) | mao / Outras malformações congênitas | 14 |  | pendente: figura com letras; conceito já em mao-2004 |
| 80 | PANEVA-HOLEVICH: tendão inserido na falange distal | epônimo | cap. 6, p. 232 e 241 | mao / Lesões dos tendões flexores | 01 | mao-2026 | publicada |
| 81 | Marsupialização: onde se faz | técnica | cap. 2, p. 25 | mao / Infecções da mão | 09 | mao-2060 | publicada |
| 82 | Paralisia cerebral: tipo de instabilidade cárpica | classificação | cap. 13, p. 501 e 502 | mao / Instabilidade do carpo | 04 | mao-2038 | publicada |
| 83 | Procedimento da imagem na ARUD | epônimo, figura | cap. 14, p. 586 e 587 | mao / Fibrocartilagem triangular e punho ulnar | 05 | mao-2040 | publicada |
| 84 | Fratura-luxação radiocárpica: tipo de FERNANDEZ | classificação | cap. 15, p. 607 e 610 | mao / Fratura do rádio distal | 05 | mao-2043 | publicada |
| 85 | Carpo sem o escafoide: osso mais fraturado | fato | cap. 16, p. 712 | mao / Fraturas do escafoide e do carpo | 06 | mao-2048 | publicada |
| 86 | Incidência radiocapitelar: posição e inclinação | imagem | cap. 19, p. 899 | ombro-cotovelo / Imagem do ombro e cotovelo | 20 | ombro-cotovelo-0667 | publicada |
| 87 | Epicondilite medial: origens mais acometidas | fato | cap. 25, p. 1026 | ombro-cotovelo / Epicondilite lateral e medial | 20 | ombro-cotovelo-0668 | publicada |
| 88 | Desfiladeiro torácico: compressão associada mais comum | fato | cap. 29, p. 1132 e 1133 | mao / Neuropatia ulnar e outras compressões | 11 | mao-2068 | publicada |
| 89 | LITTLER para a garra ulnar: tendão | epônimo | cap. 31, p. 1214 | mao / Transferências tendinosas e paralisias | 12 | mao-2073 | publicada |
| 90 | Grácil para o bíceps: nervo motor | anatomia | cap. 34, p. 1335 | mao / Plexo braquial e paralisia obstétrica | 13 | mao-2081 | publicada |
| 91 | Macrodactilia, FLATT: tipo com neurofibromatose | classificação | cap. 36, p. 1438 | mao / Outras malformações congênitas | 17 | mao-2094 | publicada |
| 92 | Sinostose radioulnar bilateral: posição da osteotomia | número | cap. 38, p. 1516 | mao / Outras malformações congênitas | 15 | mao-2089 | publicada |
| 93 | Último osso do carpo a ossificar | fato | cap. 41, p. 1618 | mao / Anatomia da mão e punho | 17 | mao-2095 | publicada |
| 94 | Retalho interósseo posterior reverso: entre quais músculos | anatomia | cap. 44, p. 1731 | mao / Retalhos e cobertura cutânea | 18 | mao-2101 | publicada |
| 95 | Mão: número de compartimentos | número | cap. 51, p. 1972 e 1975 | mao / Outros temas da mão | 10 | mao-2063 | publicada |
| 96 | Lápis na xícara: qual artrite | imagem | cap. 55, p. 2040 e 2041 | mao / Mão reumatoide | 07 | mao-2053 | publicada |
| 97 | Queimadura: grau em que aparecem bolhas | fato | cap. 57, p. 2122 e 2123 | mao / Queimaduras | 08 | mao-2055 | publicada |
| 98 | Aneurisma na mão: artéria mais acometida | fato | cap. 60, p. 2240 e 2251 | mao / Outros temas da mão | 08 | mao-2056 | publicada |
| 99 | Instabilidade rotatória posterolateral: estrutura principal | anatomia | cap. 22, p. 977 | ombro-cotovelo / Instabilidade do cotovelo | 20 | ombro-cotovelo-0669 | publicada |
| 100 | Incidência de BREWERTON: o que mostra | imagem | cap. 7, p. 261 | mao / Lesões ligamentares dos dedos | 02 | mao-2029 | publicada |

Lotes: 01 (1, 69, 78, 80, 2) · 02 (43, 45, 100, 3, 16) · 03 (33, 66, 70, 71, 4) · 04 (5, 46, 82, 27, 6) · 05 (83, 34, 73, 84, 18) · 06 (7, 67, 68, 85, 30) · 07 (19, 35, 64, 65, 96) · 08 (23, 21, 97, 98, 59) · 09 (32, 44, 81, 24, 22) · 10 (95, 55, 74, 9, 42) · 11 (28, 88, 10, 36, 49) · 12 (62, 89, 17, 37, 39) · 13 (51, 60, 11, 31, 90) · 14 (14, 50, 61, 38, 79) · 15 (12, 13, 53, 72, 92) · 16 (20, 29, 52, 54, 76) · 17 (91, 93, 15, 40, 57) · 18 (56, 75, 94, 58, 41) · 19 (63, 77, 25, 26) · 20 (8, 47, 48, 86, 87, 99).

## SBCM 2022

Separada de `PROVA SBCM 2022 - SEM RESPOSTA.pdf` em 21/10/2026 (100 questões em `.oq/provas/sbcm-2022.json`; a 5, a 26 e a
82 têm só três alternativas no original, e a 82 repete a mesma alternativa em A e B). Resposta da folha de gabarito em
[dicas/sbcm-2022.md](dicas/sbcm-2022.md), sem página: achar a seção pelo capítulo e citar a página impressa lida.
"figura": a original depende de imagem; reescrever descrevendo o achado ou deixar pendente. Cotovelo no tema
`ombro-cotovelo` (lote 20). Repetidas na prova (1 e 33, STRUTHERS; 53 e 91, BLAUTH; 71 e 82, retalho inguinal):
ângulos diferentes.

| Nº | Assunto (palavras nossas) | Formato | Green: cap. e páginas | Tema / subtema | Lote | Id | Situação |
|---|---|---|---|---|---|---|---|
| 1 | Ligamento de STRUTHERS: músculo de inserção anômala | anatomia | cap. 28, p. 1100 | mao / Neuropatia ulnar e outras compressões | 08 | mao-2133 | publicada |
| 2 | FERNANDEZ (rádio distal): tipo com suspeita de lesão escafossemilunar | classificação | cap. 15, p. 615 (Fig. 15.15) | mao / Fratura do rádio distal | 06 | mao-2129 | publicada |
| 3 | Banda sagital, lesão fechada: banda e dedos mais acometidos | fato | cap. 5, p. 185 e 204 | mao / Lesões dos tendões extensores | 02 | mao-2110 | publicada |
| 4 | LICHTMAN: grau IV do teste de instabilidade mediocárpica | classificação | cap. 13, p. 539 | mao / Instabilidade do carpo | 05 | mao-2124 | publicada (gabarito pelo Green: grau IV = C; o oficial D é o grau V) |
| 5 | Luxação isolada do escafoide tipo II: articulação desalinhada | classificação | cap. 16 | mao / Fraturas do escafoide e do carpo | 07 |  | pendente: sem fonte (tipos da luxação isolada do escafoide não estão no Green) |
| 6 | Desfiladeiro torácico: valor do potencial evocado somatossensitivo | fato | cap. 29, p. 1137 | mao / Neuropatia ulnar e outras compressões | 09 | mao-2139 | publicada |
| 7 | O que mimetiza a paralisia ulnar | fato | cap. 28, p. 1105 e 1121 | mao / Lesões de nervos periféricos | 09 | mao-2138 | publicada (ângulo: o Green não cita CMT; C8 também seria defensável) |
| 8 | Pronação do antebraço na paralisia cerebral: evolução | fato | cap. 32, p. 1248 e 1250 | mao / Transferências tendinosas e paralisias | 10 | mao-2144 | publicada (gabarito pelo Green: espástica; o oficial B era flácida) |
| 9 | Plexo: romboide e serrátil paralisados indicam | fato | cap. 34, p. 1308 | mao / Plexo braquial e paralisia obstétrica | 11 | mao-2146 | publicada |
| 10 | KELIKIAN/KELLAM: braquidactilia na ELLIS-VAN CREVELD | classificação | cap. 36 p. 1405 | mao / Outras malformações congênitas | 12 | mao-2152 | publicada |
| 11 | CLEARY e OMER tipo IV (sinostose radioulnar): cabeça do rádio | classificação | cap. 38 p. 1516 e 1518 | mao / Outras malformações congênitas | 13 | mao-2159 | publicada |
| 12 | Retalho escapular ou paraescapular e sua artéria | anatomia, figura | cap. 45 p. 1762 e 1764 | mao / Microcirurgia e retalhos livres | 15 | mao-2170 | publicada (sem a figura: descreve o desenho do paraescapular) |
| 13 | Osteocondroma na mão: localização típica | fato | cap. 59, p. 2219 | mao / Tumores da mão | 18 | mao-2183 | publicada |
| 14 | MAFFUCCI: risco aumentado | fato | cap. 59, p. 2219 | mao / Tumores da mão | 19 | mao-2184 | publicada |
| 15 | Pioderma gangrenoso: tratamento | conduta | cap. 3, p. 86 | mao / Infecções da mão | 01 | mao-2107 | publicada |
| 16 | PANEVA-HOLEVICH: tendão do enxerto | epônimo | cap. 6, p. 232 e 241 | mao / Lesões dos tendões flexores | 02 | mao-2111 | publicada |
| 17 | Enxerto ósseo da foto: área doadora | figura | cap. 8, p. 338 | mao / Lesões ligamentares dos dedos | 03 | mao-2116 | publicada (caso da foto descrito) |
| 18 | Osteoartrite inflamatória dos dedos: mais sintomática e mais acometida | fato | cap. 11, p. 409 | mao / Rizartrose e artrose da mão | 04 | mao-2122 | publicada |
| 19 | Técnica da figura: qual instabilidade trata | figura | cap. 13 | mao / Instabilidade do carpo | 05 |  | pendente: figura |
| 20 | Luxação dorsal da ARUD: posição do punho | fato | cap. 14, p. 574 | mao / Fibrocartilagem triangular e punho ulnar | 06 | mao-2127 | publicada |
| 21 | Pseudartrose do escafoide: técnica da foto | figura | cap. 16 | mao / Fraturas do escafoide e do carpo | 07 |  | pendente: depende da foto |
| 22 | Colateral medial do cotovelo: porção mais resistente | anatomia | cap. 22, p. 977 | ombro-cotovelo / Instabilidade do cotovelo | 20 | ombro-cotovelo-0670 | publicada |
| 23 | FROMENT, EGAWA e DUCHENNE sem déficit sensitivo: zona do canal de GUYON | fato | cap. 28, p. 1103 | mao / Neuropatia ulnar e outras compressões | 08 | mao-2135 | publicada |
| 24 | Classificação internacional da tetraplegia, grupo 4: músculos disponíveis | classificação | cap. 33, p. 1268 (Tabela 33.3) | mao / Transferências tendinosas e paralisias | 10 | mao-2145 | publicada |
| 25 | Polidactilia central: dedo mais duplicado | fato | cap. 36 p. 1387 | mao / Sindactilia e polidactilia | 12 | mao-2153 | publicada |
| 26 | Mão torta ulnar: anomalia associada | fato | cap. 38 p. 1500 | mao / Deficiências longitudinais e mão torta | 13 | mao-2160 | publicada (diverge do oficial HOLT-ORAM: Green dá deficiência fibular) |
| 27 | WATERS: tipo pela tomografia do ombro | classificação, figura | cap. 40 p. 1581 e 1582 | mao / Plexo braquial e paralisia obstétrica | 14 | mao-2162 | publicada (sem a tomografia: descreve a falsa glenoide, tipo IV) |
| 28 | Enxerto de pele: o que restaura a sensibilidade | fato | cap. 44 p. 1702 | mao / Cicatrização e enxertos de pele | 15 | mao-2166 | publicada |
| 29 | Retalho microcirúrgico cutâneo: exemplo | classificação | cap. 45 p. 1747 | mao / Microcirurgia e retalhos livres | 16 | mao-2171 | publicada |
| 30 | SDRC tipo 2: em que situação | fato | cap. 53, p. 2005 e 2007 | mao / Síndrome da dor complexa regional | 17 | mao-2178 | publicada |
| 31 | Tendinite calcária na mão e punho: tendão mais comum | fato | cap. 56, p. 2115 e 2116 | mao / Dedo em gatilho e outras tenossinovites | 17 | mao-2180 | publicada |
| 32 | Hamartoma fibrolipomatoso: nervo mais acometido | fato | cap. 59, p. 2209 | mao / Tumores da mão | 19 | mao-2185 | publicada |
| 33 | Ligamento de STRUTHERS: nervo comprimido | fato | cap. 28, p. 1100 | mao / Neuropatia ulnar e outras compressões | 08 | mao-2134 | publicada |
| 34 | Ligamentos do aparelho extensor da figura | anatomia, figura | cap. 5 | mao / Lesões dos tendões extensores | 02 |  | pendente: figura com letras |
| 35 | Melanoma que surge junto a um nevo | fato | cap. 58, p. 2171 | mao / Tumores da mão | 03 | mao-2118 | publicada |
| 36 | Síndrome do interósseo anterior: o que enfraquece | fato | cap. 28, p. 1100 | mao / Neuropatia ulnar e outras compressões | 08 | mao-2136 | publicada (alternativa B ajustada: duas eram certas pelo Green) |
| 37 | Flexor longo do polegar: reparo tardio com bom resultado até | número | cap. 6, p. 245 | mao / Lesões dos tendões flexores | 02 | mao-2112 | publicada |
| 38 | Rigidez da MF instável após liberação: tempo dos fios | número | cap. 10, p. 398 e 399 | mao / Deformidades dos dedos | 21 | mao-2188 | publicada |
| 39 | LEECHAVENGVONGS: ramo doador e alvo | técnica | cap. 34, p. 1329 | mao / Plexo braquial e paralisia obstétrica | 11 | mao-2147 | publicada |
| 40 | Paralisia alta do mediano: objetivo das transferências | fato | cap. 31, p. 1206 | mao / Transferências tendinosas e paralisias | 09 | mao-2141 | publicada |
| 41 | Ligamentos ulnocárpicos palmares: quantos e em que plano | anatomia | cap. 13, p. 491; cap. 14, p. 566 | mao / Fibrocartilagem triangular e punho ulnar | 06 | mao-2126 | publicada |
| 42 | CAMITZ: melhor indicação | indicação | cap. 31, p. 1199 | mao / Transferências tendinosas e paralisias | 10 | mao-2142 | publicada |
| 43 | NALEBUFF: polegar reumatoide da radiografia | classificação, figura | cap. 55, p. 2091 a 2093 | mao / Mão reumatoide | 18 | mao-2181 | publicada |
| 44 | Ângulo da lágrima (teardrop) na radiografia | número, figura | cap. 15, p. 604 | mao / Fratura do rádio distal | 06 |  | pendente: depende da radiografia |
| 45 | Ligamentos do punho da figura | anatomia, figura | cap. 13 | mao / Instabilidade do carpo | 05 |  | pendente: figura com letras |
| 46 | Contratura em flexão da IFP: o que liberar | técnica | cap. 10, p. 400 | mao / Deformidades dos dedos | 04 | mao-2119 | publicada |
| 47 | Contratura em extensão da IFP: o que liberar | técnica | cap. 10, p. 403 | mao / Deformidades dos dedos | 04 | mao-2120 | publicada |
| 48 | TSUGE, Volkmann moderada: melhor tratamento | conduta | cap. 51, p. 1978 a 1982 | mao / Outros temas da mão | 17 | mao-2176 | publicada |
| 49 | Plexo total: contraindicação da artrodese glenoumeral | conduta | cap. 34, p. 1341 | mao / Plexo braquial e paralisia obstétrica | 11 | mao-2148 | publicada |
| 50 | Reconstrução do plexo: principal contraindicação | conduta | cap. 34, p. 1311 | mao / Plexo braquial e paralisia obstétrica | 11 | mao-2149 | publicada |
| 51 | MONTEGGIA posterior: causa da instabilidade ulnoumeral | fato | cap. 20, p. 947 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | ombro-cotovelo-0671 | publicada |
| 52 | Artrite reumatoide: o que mais simula ruptura extensora | fato | cap. 55, p. 2051 (não diz qual é a mais comum) | mao / Mão reumatoide | 18 |  | pendente: sem fonte |
| 53 | BLAUTH: tipo sem tenares, com déficit esquelético e CMC instável | classificação | cap. 37 p. 1455 | mao / Outras malformações congênitas | 13 | mao-2156 | publicada |
| 54 | Estruturas da fáscia digital na figura (Dupuytren) | anatomia, figura | cap. 4 | mao / Doença de Dupuytren | 01 |  | pendente: figura com letras |
| 55 | Dupuytren: recorrência que começa em 6 a 12 semanas | classificação | cap. 4, p. 156 | mao / Doença de Dupuytren | 01 | mao-2109 | publicada (ângulo: definição do Green, sem o 6 a 12 semanas) |
| 56 | Flexor superficial dos dedos: anatomia | afirmativas | cap. 6, p. 214 | mao / Lesões dos tendões flexores | 02 | mao-2113 | publicada |
| 57 | Avulsão do colateral ulnar do polegar: quando ressecar e reinserir | número | cap. 8, p. 352 | mao / Lesões ligamentares dos dedos | 03 | mao-2114 | publicada |
| 58 | Artrodese dos quatro cantos: estágios de SLAC e SNAC | conduta | cap. 12, p. 450 e 453 | mao / Artrose do punho e artroscopia | 05 | mao-2123 | publicada |
| 59 | Instabilidade cárpica não dissociativa: causa | fato | cap. 13, p. 501 | mao / Instabilidade do carpo | 05 | mao-2125 | publicada |
| 60 | Luxação isolada da ARUD reduzida: posição estável | fato | cap. 14, p. 576 | mao / Fibrocartilagem triangular e punho ulnar | 06 | mao-2128 | publicada |
| 61 | SLADE e GEISSLER: cistos de 1 a 5 mm | classificação | cap. 16, p. 696 (Tabela 16.2) | mao / Fraturas do escafoide e do carpo | 07 | mao-2130 | publicada |
| 62 | Fratura cominutiva do capítulo: tipo | classificação | cap. 18, p. 866 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | ombro-cotovelo-0672 | publicada |
| 63 | Over-the-top medial: intervalo para a cápsula | técnica | cap. 24, p. 1013 | ombro-cotovelo / Rigidez do cotovelo | 20 | ombro-cotovelo-0673 | publicada |
| 64 | Síndrome do interósseo posterior: intervalo do acesso anterior | técnica | cap. 28, p. 1117 e 1118 | mao / Neuropatia ulnar e outras compressões | 09 | mao-2137 | publicada |
| 65 | Portal 6-U: uso principal | técnica | cap. 17, p. 762, 763 e 765 | mao / Artrose do punho e artroscopia | 08 | mao-2132 | publicada (Green: 6-U é portal de saída; o gabarito falava em entrada) |
| 66 | Acesso ao plexo: relações anatômicas | anatomia | cap. 34, p. 1313 | mao / Plexo braquial e paralisia obstétrica | 11 | mao-2150 | publicada (distratores trocados por relações do Green) |
| 67 | Deficiência transversal: exemplo | classificação | cap. 36 p. 1402 | mao / Outras malformações congênitas | 12 | mao-2154 | publicada |
| 68 | MADELUNG: afirmativas | afirmativas | cap. 38 p. 1503 a 1508 | mao / Deficiências longitudinais e mão torta | 14 | mao-2161 | publicada (alternativa do trauma repetitivo refeita) |
| 69 | MALLET: grau pelo exame do ombro | classificação | cap. 40 p. 1564 | mao / Plexo braquial e paralisia obstétrica | 14 | mao-2163 | publicada |
| 70 | Zetaplastia: ganho de comprimento pelo ângulo | número | cap. 44 p. 1714 | mao / Retalhos e cobertura cutânea | 15 | mao-2167 | publicada (ângulo de 60 graus, que faltava no original) |
| 71 | Retalho inguinal: a circunflexa ilíaca superficial | afirmativas | cap. 44 p. 1736 | mao / Retalhos e cobertura cutânea | 15 | mao-2168 | publicada |
| 72 | Gluconato de cálcio subdérmico: qual queimadura química | conduta | cap. 57, p. 2144 | mao / Queimaduras | 18 | mao-2182 | publicada |
| 73 | Bloqueio interescalênico: nervo que mais falha | fato | cap. 1, p. 5 e 8 | mao / Anestesia em cirurgia da mão | 01 | mao-2106 | publicada |
| 74 | Encurtamento do capitato no Kienböck: artrodese associada | técnica | cap. 16, p. 736 | mao / Doença de Kienböck | 07 |  | pendente: sem fonte (artrodese junto do encurtamento do capitato não está no Green) |
| 75 | Policização: o que fazer com a cabeça do 2º metacarpo | técnica | cap. 37 p. 1464 | mao / Outras malformações congênitas | 13 | mao-2157 | publicada (pergunta pela articulação MCF; o Green deixa a cabeça em flexão) |
| 76 | Sinal de HUTCHINSON na melanoníquia | sinal | cap. 58, p. 2162 | mao / Tumores da mão | 03 | mao-2117 | publicada |
| 77 | IFD hiperestende mais que a IFP: o que falta nela | anatomia | cap. 8, p. 326; cap. 10, p. 390 | mao / Lesões ligamentares dos dedos | 03 | mao-2115 | publicada (IFD sem checkrein: cap. 10, p. 390) |
| 78 | Osteocondromatose múltipla hereditária: herança | fato | cap. 38, p. 1523 e 1524 | mao / Tumores da mão | 19 | mao-2186 | publicada |
| 79 | Prótese da cabeça do rádio: tamanho pelo diâmetro | técnica | cap. 19, p. 918 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | ombro-cotovelo-0674 | publicada |
| 80 | Bíceps distal: incisão única versus dupla | fato | cap. 25, p. 1035 a 1037 | ombro-cotovelo / Lesões do bíceps | 20 | ombro-cotovelo-0675 | publicada |
| 81 | Macrodactilia: forma mais comum | fato | cap. 36 p. 1438 | mao / Outras malformações congênitas | 12 | mao-2155 | publicada |
| 82 | Retalho inguinal: artéria e onde emerge | anatomia | cap. 44 p. 1736 | mao / Retalhos e cobertura cutânea | 15 | mao-2169 | publicada (original com A e B iguais; refeita) |
| 83 | Enxerto vascularizado do côndilo femoral medial: área da figura | figura | cap. 46 p. 1800 e 1801 | mao / Microcirurgia e retalhos livres | 16 | mao-2174 | publicada (sem a figura) |
| 84 | Carpo fraturado em atletas de raquete, golfe e beisebol | fato | cap. 16, p. 718 | mao / Fraturas do escafoide e do carpo | 07 | mao-2131 | publicada |
| 85 | Desfiladeiro torácico: local mais comum de compressão | fato | cap. 29, p. 1129 | mao / Neuropatia ulnar e outras compressões | 09 | mao-2140 | publicada |
| 86 | Dedo mínimo abduzido na paralisia ulnar: transferência | transferência | cap. 31, p. 1223 | mao / Transferências tendinosas e paralisias | 10 | mao-2143 | publicada |
| 87 | Fratura de SEYMOUR: o que se interpõe | fato | cap. 41 p. 1602 | mao / Fraturas dos metacarpos e falanges | 14 | mao-2164 | publicada |
| 88 | Síndrome compartimental neonatal: achados | fato | cap. 51, p. 1967 e 1972 | mao / Outros temas da mão | 17 | mao-2177 | publicada |
| 89 | Toxina botulínica: mecanismo | fato | cap. 32 | mao / Transferências tendinosas e paralisias | 10 |  | pendente: sem fonte (mecanismo da toxina botulínica não está no Green) |
| 90 | Embriologia: blastemas e tensão de oxigênio | fato | cap. 35 p. 1368 | mao / Outras malformações congênitas | 12 | mao-2151 | publicada (distrator refeito: B e D iguais na original) |
| 91 | BLAUTH: tipos com indicação de policização | classificação | cap. 37 p. 1455 | mao / Outras malformações congênitas | 13 | mao-2158 | publicada |
| 92 | Reimplante de dedos: melhores indicações | indicação | cap. 42 p. 1653 | mao / Amputações e reimplantes | 14 | mao-2165 | publicada |
| 93 | Anterolateral da coxa: artéria das perfurantes | anatomia | cap. 45 p. 1767 | mao / Microcirurgia e retalhos livres | 16 | mao-2172 | publicada |
| 94 | GILLIES: reconstrução osteoplástica do polegar | técnica | cap. 48 p. 1859 a 1862 | mao / Retalhos e cobertura cutânea | 16 | mao-2175 | publicada (GILLIES só citado como fora de uso; pergunta a osteoplástica clássica) |
| 95 | Artrite psoriática: deformidades mais comuns | fato | cap. 55 (padrão de deformidade não descrito) | mao / Mão reumatoide | 18 |  | pendente: sem fonte |
| 96 | ENNEKING: estágio IIA | classificação | cap. 59, p. 2186 | mao / Tumores da mão | 19 | mao-2187 | publicada |
| 97 | Braquial profunda: ramo mais calibroso | anatomia | cap. 45 p. 1756 | mao / Microcirurgia e retalhos livres | 16 | mao-2173 | publicada (pergunta o ramo do retalho lateral do braço: 'mais calibroso' não está no Green) |
| 98 | Paroníquia: mecanismo e agente | fato | cap. 2, p. 20 | mao / Infecções da mão | 01 | mao-2108 | publicada |
| 99 | SECRETAN: causa | fato | cap. 54, p. 2036 e 2037 | mao / Outros temas da mão | 17 | mao-2179 | publicada |
| 100 | Capsulotomia volar da IFP: marco dos ligamentos checkrein | anatomia | cap. 10, p. 387 e 400 | mao / Deformidades dos dedos | 04 | mao-2121 | publicada |

Lotes: 01 (73, 15, 98, 54, 55) · 02 (3, 34, 16, 37, 56) · 03 (57, 77, 17, 76, 35) · 04 (38, 46, 47, 100, 18) · 05 (58, 4, 19, 45, 59) · 06 (41, 20, 60, 2, 44) · 07 (5, 61, 74, 84, 21) · 08 (65, 1, 33, 23, 36) · 09 (64, 7, 6, 85, 40) · 10 (42, 86, 8, 89, 24) · 11 (9, 39, 49, 50, 66) · 12 (90, 10, 25, 67, 81) · 13 (53, 75, 91, 11, 26) · 14 (68, 27, 69, 87, 92) · 15 (28, 70, 71, 82, 12) · 16 (29, 93, 97, 83, 94) · 17 (48, 88, 30, 99, 31) · 18 (43, 52, 95, 72, 13) · 19 (14, 32, 78, 96) · 20 (22, 51, 62, 63, 79, 80).

## SBCM 2023

Fase 0 em 22/10/2026: 100 questões extraídas de `Prova SBCM 2023 - sem resposta.pdf` para
`.oq/provas/sbcm-2023.json`. Inventário e índice locais existentes conferidos; plano automático de busca
em `.oq/planos/sbcm-2023.md`. Edição do livro conforme seção acima.
As páginas marcadas **pista** vêm da correção em [dicas/sbcm-2023.md](dicas/sbcm-2023.md):
ainda precisam de leitura integral e confirmação antes de sustentar qualquer comentário. Não são citações conferidas.
Capítulos e subtemas classificados manualmente a partir da pergunta. O lote pode reunir capítulos vizinhos
quando há menos de cinco itens no capítulo, como nas provas anteriores; cotovelo fica em arquivo próprio.
Na 32, a extração engoliu a alternativa A no enunciado, que precisa ser conferida no PDF antes da redação.
9, 72 e 88 não são questões de figura: têm alternativas ambíguas ou malformadas; adaptar apenas após resolver pelo Green.
22, 25, 37, 63, 65, 75, 81 e 100 exigem inspeção visual antes de decidir se o achado pode ser descrito.
Não há gabarito oficial extraído do caderno: as letras nas dicas são da correção e devem ser comparadas com o livro.

| Nº | Assunto (palavras nossas) | Formato | Green: cap. e páginas | Tema / subtema | Lote | Id | Situação |
|---|---|---|---|---|---|---|---|
| 1 | BURTON: botoeira fixa com bandas laterais retraídas | classificação | cap. 5, p. 200 e 201 | mao / Lesões dos tendões extensores | 01 | mao-2189 | publicada |
| 2 | LEDDY-PACKER: flexor profundo retraído até a palma | classificação | cap. 6, p. 216 | mao / Lesões dos tendões flexores | 01 | mao-2191 | publicada |
| 3 | Artroplastia do punho: fragilidade óssea como contraindicação | conduta | cap. 12, p. 483 (pista) | mao / Artrose do punho e artroscopia | 04 | mao-2206 | publicada |
| 4 | Instabilidade adaptativa após consolidação viciosa do rádio | mecanismo | cap. 13, p. 501 (pista) | mao / Instabilidade do carpo | 04 | mao-2208 | publicada |
| 5 | SOONG: proeminência da placa e risco aos flexores | classificação | cap. 15, p. 628 (pista) | mao / Fratura do rádio distal | 06 | mao-2217 | publicada |
| 6 | TEISEN-HJARBAEK: fratura sagital do semilunar | classificação | cap. 16, p. 724 (pista) | mao / Fraturas do escafoide e do carpo | 07 | mao-2219 | publicada |
| 7 | Bíceps distal sem reparo: perda de supinação e flexão | número | cap. 25, p. 1034 (pista) | ombro-cotovelo / Lesões do bíceps | 20 | ombro-cotovelo-0682 | publicada |
| 8 | Triângulo interescalênico: limites e conteúdo | anatomia | cap. 29, p. 1130 (pista) | mao / Neuropatia ulnar e outras compressões | 08 | mao-2227 | publicada |
| 9 | Ulnar baixo: nível da lesão e preservação extrínseca | afirmativas | cap. 31, p. 1208 (pista) | mao / Transferências tendinosas e paralisias | 09 | mao-2229 | publicada (original sem gabarito; refeita com resposta única) |
| 10 | LEECHAVENGVONGS: identificação do axilar e divisão receptora | técnica | cap. 34, p. 34 (pista) | mao / Plexo braquial e paralisia obstétrica | 10 | mao-2237 | publicada |
| 11 | FLATT: macrodactilia com hiperostose | classificação | cap. 36, p. 1438 (pista) | mao / Outras malformações congênitas | 11 | mao-2240 | publicada |
| 12 | Sinostose unilateral: posição do antebraço dominante | conduta | cap. 38, p. 1517 (pista) | mao / Outras malformações congênitas | 12 | mao-2244 | publicada |
| 13 | Ossificação do carpo: primeiros centros e cronologia | afirmativas | cap. 41, p. 1618 (pista) | mao / Anatomia da mão e punho | 13 | mao-2251 | publicada |
| 14 | Rádio distal: arcos vasculares volares | anatomia | cap. 15, página a localizar | mao / Fratura do rádio distal | 07 | mao-2218 | publicada |
| 15 | Pseudocontratura de VOLKMANN: etiologia não isquêmica | mecanismo | cap. 51, p. 1968 (pista) | mao / Outros temas da mão | 16 | mao-2264 | publicada |
| 16 | Artropatias: padrão simétrico e poliarticular | comparação | cap. 55, p. 2044 (pista) | mao / Mão reumatoide | 16 | mao-2267 | publicada |
| 17 | Queimadura química: indicação de gluconato de cálcio | conduta | cap. 57, p. 2144 (pista) | mao / Queimaduras | 17 | mao-2271 | publicada |
| 18 | Aneurisma ulnar traumático: camada arterial lesada | mecanismo | cap. 60, p. 2242 (pista) | mao / Outros temas da mão | 18 | mao-2276 | publicada |
| 19 | DUPUYTREN: associação com índice de massa corporal baixo | associação | cap. 4, p. 149 | mao / Doença de Dupuytren | 02 | mao-2197 | publicada |
| 20 | DURAN: excursão tendínea para evitar aderências | número | cap. 6, p. 224 e 225 | mao / Lesões dos tendões flexores | 01 | mao-2192 | publicada |
| 21 | Fusão escafocapitato: indicação na pseudartrose | conduta | cap. 12, p. 443 (pista) | mao / Artrose do punho e artroscopia | 04 | mao-2207 | publicada |
| 22 | Reconstrução ligamentar da fileira proximal pela figura | técnica, figura | cap. 13, p. 544 (pista) | mao / Instabilidade do carpo | 05 | mao-2211 | publicada (figura descrita em texto) |
| 23 | ARUD: orientação coronal mais frequente | anatomia | cap. 14, p. 563 (pista) | mao / Fibrocartilagem triangular e punho ulnar | 06 | mao-2214 | publicada |
| 24 | Incidência do escafoide: posição dos dedos e punho | imagem | cap. 16, p. 680 (pista) | mao / Fraturas do escafoide e do carpo | 07 | mao-2220 | publicada |
| 25 | Fratura do úmero distal: risco de necrose troclear na figura | figura | cap. 18, p. 865 (pista) | ombro-cotovelo / Fraturas do cotovelo e antebraço | 19 | ombro-cotovelo-0676 | publicada (figura descrita em texto) |
| 26 | Radial acima do cotovelo: intervalo muscular | anatomia | cap. 31, p. 1226 (pista) | mao / Transferências tendinosas e paralisias | 09 | mao-2230 | publicada |
| 27 | GREEN: tensionamento da transferência do flexor ulnar | técnica | cap. 32, p. 1232 (pista) | mao / Transferências tendinosas e paralisias | 09 | mao-2232 | publicada |
| 28 | Dorsal da escápula: origem no plexo | anatomia | cap. 34, p. 1305 (pista) | mao / Plexo braquial e paralisia obstétrica | 11 | mao-2238 | publicada |
| 29 | Ausência transversa digital por bandas constritivas | etiologia | cap. 36, p. 1402 (pista) | mao / Outras malformações congênitas | 11 | mao-2241 | publicada |
| 30 | VICKERS: conexões do ligamento anômalo | anatomia | cap. 38, p. 1503 (pista) | mao / Deficiências longitudinais e mão torta | 12 | mao-2245 | publicada |
| 31 | Osteotomia umeral na paralisia obstétrica: via e nível | técnica | cap. 40, p. 1586 (pista) | mao / Plexo braquial e paralisia obstétrica | 13 | mao-2249 | publicada |
| 32 | KITE: nervo responsável pela sensibilidade do retalho | anatomia | cap. 44, p. 1718 (pista) | mao / Retalhos e cobertura cutânea | 14 | mao-2253 | publicada |
| 33 | Enxerto do côndilo femoral medial: pedículo | anatomia | cap. 16, p. 706 (pista) | mao / Microcirurgia e retalhos livres | 07 | mao-2221 | publicada |
| 34 | Tumor glômico: coloração subungueal e diagnóstico | afirmativas | cap. 9, p. 382 (pista) | mao / Tumores da mão | 03 | mao-2202 | publicada |
| 35 | MANNERFELT: ruptura do flexor longo do polegar | epônimo | cap. 55, p. 2061 (pista) | mao / Mão reumatoide | 17 | mao-2268 | publicada |
| 36 | Queimadura: profundidade de maior dor | comparação | cap. 57, p. 2123 (pista) | mao / Queimaduras | 17 | mao-2272 | publicada |
| 37 | Eponíquio, polia e colateral nas letras da figura | anatomia, figura | cap. 10, p. 389 (pista) | mao / Lesões ligamentares dos dedos | 03 | mao-2203 | publicada (figura descrita em texto) |
| 38 | Tenossinovite tuberculosa: dactilite e corpos de arroz | diagnóstico | cap. 3, p. 91, 96, 97, 109 e 110 | mao / Infecções da mão | 02 | mao-2196 | publicada (corpos de arroz não são patognomônicos) |
| 39 | Sutura flexora: fios múltiplos e resistência ao longo do tempo | comparação | cap. 6, p. 217 e 225 | mao / Lesões dos tendões flexores | 01 | mao-2193 | publicada |
| 40 | Juntura intertendinosa interposta na luxação MCF | mecanismo | cap. 8, p. 347 (pista) | mao / Lesões ligamentares dos dedos | 22 | mao-2277 | publicada (frase do Green conferida no original em inglês; a tradução a omitiu) |
| 41 | Prótese IFP de pirocarbono: quanto preservar dos colaterais | técnica | cap. 11, p. 417 (pista) | mao / Rizartrose e artrose da mão | 04 | mao-2204 | publicada |
| 42 | GARCIA-ELIAS estágio 6: limites da reconstrução | conduta | cap. 13, p. 526 (pista) | mao / Instabilidade do carpo | 05 | mao-2209 | publicada |
| 43 | Luxação volar isolada da ARUD: posição estável após redução | conduta | cap. 14, p. 576 (pista) | mao / Fibrocartilagem triangular e punho ulnar | 06 | mao-2215 | publicada |
| 44 | Escafoide por via dorsal: flexão e risco de deslocamento | técnica | cap. 16, p. 685 (pista) | mao / Fraturas do escafoide e do carpo | 07 | mao-2222 | publicada |
| 45 | Úmero distal: padrão transcolunar e superfície articular | classificação | cap. 18, p. 865 (pista) | ombro-cotovelo / Fraturas do cotovelo e antebraço | 19 | ombro-cotovelo-0677 | publicada |
| 46 | Descompressão ulnar: nervo cutâneo em risco | anatomia | cap. 28, p. 1107 (pista) | mao / Neuropatia ulnar e outras compressões | 08 | mao-2226 | publicada |
| 47 | Tetraplegia: prioridade da extensão do cotovelo | conduta | cap. 33, p. 1272-1273 (pista) | mao / Transferências tendinosas e paralisias | 10 | mao-2233 | publicada |
| 48 | Polidactilia central: dedo mais duplicado | fato | cap. 36, p. 1387 (pista) | mao / Sindactilia e polidactilia | 11 | mao-2242 | publicada |
| 49 | Deficiência ulnar: lateralidade e associações | afirmativas | cap. 38, p. 1500 (pista) | mao / Deficiências longitudinais e mão torta | 12 | mao-2246 | publicada |
| 50 | Plexo infantil: ultrassom dinâmico do ombro | imagem | cap. 40, p. 1582 (pista) | mao / Plexo braquial e paralisia obstétrica | 13 | mao-2250 | publicada |
| 51 | Enxerto de pele: pressão e contato com o leito | técnica | cap. 44, p. 1709 (pista) | mao / Cicatrização e enxertos de pele | 14 | mao-2254 | publicada |
| 52 | Retalho lateral do braço: artéria nutridora | anatomia | cap. 45, p. 1756 (pista) | mao / Microcirurgia e retalhos livres | 14 | mao-2256 | publicada |
| 53 | Amputação do raio médio: efeito na pinça de chave | mecanismo | cap. 49, p. 1923 (pista) | mao / Amputações e reimplantes | 15 | mao-2261 | publicada |
| 54 | SDRC: dor, sono e rigidez como achados inespecíficos | diagnóstico | cap. 53, p. 2011 (pista) | mao / Síndrome da dor complexa regional | 16 | mao-2266 | publicada |
| 55 | Fibroma digital infantil: localização habitual | fato | cap. 59, página a localizar | mao / Tumores da mão | 18 | mao-2274 | publicada |
| 56 | Cápsula anterior do cotovelo: inervação | anatomia | cap. 24, página a localizar | ombro-cotovelo / Anatomia do cotovelo | 20 |  | pendente: sem fonte (inervação da cápsula anterior não está nos livros locais) |
| 57 | SEYMOUR: fise exposta e risco infeccioso | conduta | cap. 41, p. 1602 (pista) | mao / Fraturas dos metacarpos e falanges | 13 | mao-2252 | publicada |
| 58 | Artrodese do mínimo: posições das três articulações | número | cap. 11, p. 414 (pista) | mao / Rizartrose e artrose da mão | 04 | mao-2205 | publicada |
| 59 | WATSON: momento do estalido do escafoide | exame | cap. 13, p. 508 a 510 (Fig. 13.22) | mao / Instabilidade do carpo | piloto_miniaula_59 | mao-2199 | publicada (piloto do modelo de miniaula de 22/10/2026) |
| 60 | MONTEGGIA: restauração do alinhamento ulnar | conduta | cap. 20, p. 938 (pista) | ombro-cotovelo / Fraturas do cotovelo e antebraço | 19 | ombro-cotovelo-0679 | publicada |
| 61 | NAKAMURA: sutura transóssea na lesão foveal | técnica | cap. 17, p. 788 (pista) | mao / Fibrocartilagem triangular e punho ulnar | 08 | mao-2223 | publicada |
| 62 | ESSEX-LOPRESTI: preservar ou substituir cabeça radial | conduta | cap. 21, p. 968 (pista) | ombro-cotovelo / Fraturas do cotovelo e antebraço | 19 | ombro-cotovelo-0680 | publicada |
| 63 | RIORDAN: inserção da oponentoplastia na figura | técnica, figura | cap. 31, p. 1194 (pista) | mao / Transferências tendinosas e paralisias | 09 | mao-2231 | publicada (figura descrita em texto) |
| 64 | Tetraplegia: músculo que separa grupos 2 e 3 | classificação | cap. 33, p. 1268 (pista) | mao / Transferências tendinosas e paralisias | 10 | mao-2234 | publicada |
| 65 | Tetraplegia: técnica para pronação pela figura | técnica, figura | cap. 33, p. 1278 (pista) | mao / Transferências tendinosas e paralisias | 10 | mao-2235 | publicada (figura descrita em texto) |
| 66 | BAUER-FLATT: retalho dorsal na comissura da sindactilia | técnica | cap. 36, p. 1379 (pista) | mao / Sindactilia e polidactilia | 12 | mao-2243 | publicada |
| 67 | BAYNE-KLUG: deficiência radial parcial | classificação | cap. 38, p. 1496 (pista) | mao / Deficiências longitudinais e mão torta | 12 | mao-2247 | publicada (enunciado segue a Tabela 38.2: falta a porção distal) |
| 68 | Artrogripose: posição habitual do antebraço | fato | cap. 39, p. 1531 (pista) | mao / Outras malformações congênitas | 13 | mao-2248 | publicada |
| 69 | TAMAI e ALLEN: nível com perda da matriz ungueal | classificação | cap. 49, p. 1908 (pista) | mao / Amputações e reimplantes | 15 | mao-2262 | publicada |
| 70 | Grande dorsal livre: suprimento arterial | anatomia | cap. 45, p. 1770 (pista) | mao / Microcirurgia e retalhos livres | 14 | mao-2257 | publicada |
| 71 | MOBERG: contratura como complicação | complicação | cap. 44, p. 1719-1720 (pista) | mao / Retalhos e cobertura cutânea | 14 | mao-2255 | publicada |
| 72 | Bíceps distal roto: testes e déficits com alternativas defeituosas | exame | cap. 25, p. 1033-1034 (pista) | ombro-cotovelo / Lesões do bíceps | 20 | ombro-cotovelo-0683 | publicada (original sem resposta única; refeita) |
| 73 | Bíceps distal: neuropraxia na via anterior única | complicação | cap. 25, p. 1036 (pista) | ombro-cotovelo / Lesões do bíceps | 20 | ombro-cotovelo-0684 | publicada |
| 74 | Cisto ósseo aneurismático: osso mais acometido na mão | fato | cap. 59, p. 2222 (pista) | mao / Tumores da mão | 18 | mao-2275 | publicada |
| 75 | Ligamentos volares do punho nas letras da figura | anatomia, figura | cap. 13, p. 490 (pista) | mao / Instabilidade do carpo | 05 | mao-2212 | publicada (figura descrita em texto) |
| 76 | Panarício herpético: distribuição digital | fato | cap. 2, p. 52 e 53 | mao / Infecções da mão | 02 | mao-2194 | publicada |
| 77 | PARONA: origem da disseminação pelos flexores | anatomia | cap. 2, p. 33 e 34 | mao / Infecções da mão | 02 | mao-2195 | publicada (mínimo entre os dedos oferecidos; também pode vir do polegar) |
| 78 | Rotação viciosa isolada do metacarpo: sítio de osteotomia | conduta | cap. 7, p. 280 e 281 | mao / Fraturas dos metacarpos e falanges | 02 | mao-2198 | publicada |
| 79 | BENNETT: ligamento que mantém o fragmento menor | anatomia | cap. 8, p. 7 (pista) | mao / Lesões ligamentares dos dedos | 03 | mao-2201 | publicada |
| 80 | Punho: fração de carga pela fossa semilunar | número | cap. 13, p. 496 (pista) | mao / Instabilidade do carpo | 05 | mao-2210 | publicada |
| 81 | Membrana interóssea: bandas na figura | anatomia, figura | cap. 21, p. 21 (pista) | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | ombro-cotovelo-0681 | publicada (figura descrita em texto) |
| 82 | Embriologia: contribuição do mesoderma somítico | origem | cap. 35, p. 35 (pista) | mao / Outras malformações congênitas | 11 | mao-2239 | publicada |
| 83 | Retalho lateral do braço na modalidade fascial | classificação | cap. 45, p. 45 (pista) | mao / Microcirurgia e retalhos livres | 15 | mao-2258 | publicada |
| 84 | Côndilo femoral medial: quadrante da retirada | técnica | cap. 46, p. 46 (pista) | mao / Microcirurgia e retalhos livres | 15 | mao-2259 | publicada |
| 85 | Escafoide proximal: portal de visualização | técnica | cap. 17, p. 796 (pista) | mao / Artrose do punho e artroscopia | 08 | mao-2224 | publicada |
| 86 | EWAS IIIB: componente dorsal lesionado | classificação | cap. 13, página a localizar | mao / Instabilidade do carpo | 06 | mao-2213 | publicada |
| 87 | ELSON: diagnóstico da lesão da banda central | exame | cap. 5, p. 184 e 200; cap. 6, p. 225 | mao / Lesões dos tendões extensores | 01 | mao-2190 | publicada (manobra especificada para distinguir ELSON de BOYES) |
| 88 | Melanoma: lentigo maligno e exposição solar | fato | cap. 58, p. 58 (pista) | mao / Tumores da mão | 18 | mao-2273 | publicada (original com alternativa partida; refeita com resposta única) |
| 89 | Extensor curto do polegar: divisão do interósseo posterior | anatomia | cap. 30, p. 28 (pista) | mao / Transferências tendinosas e paralisias | 09 | mao-2228 | publicada |
| 90 | Quatro cantos artroscópica: portais para escafoidectomia | técnica | cap. 17, p. 17 (pista) | mao / Artrose do punho e artroscopia | 08 | mao-2225 | publicada |
| 91 | SWANSON: fratura exposta atendida após 24 horas | classificação | cap. 7, p. 7 (pista) | mao / Fraturas dos metacarpos e falanges | 03 | mao-2200 | publicada |
| 92 | TFCC: funções da superfície articular e transmissão de carga | afirmativas | cap. 14, p. 14 (pista) | mao / Fibrocartilagem triangular e punho ulnar | 06 | mao-2216 | publicada |
| 93 | Úmero distal: tipo I da progressão articular | classificação | cap. 18, p. 18 (pista) | ombro-cotovelo / Fraturas do cotovelo e antebraço | 19 | ombro-cotovelo-0678 | publicada |
| 94 | Epicôndilo lateral: origem comum dos extensores | anatomia | cap. 25, p. 25 (pista) | ombro-cotovelo / Epicondilite lateral e medial | 20 | ombro-cotovelo-0685 | publicada |
| 95 | Tetraplegia: ramo do ERCC para flexor longo do polegar | transferência | cap. 33, p. 33 (pista) | mao / Transferências tendinosas e paralisias | 10 | mao-2236 | publicada |
| 96 | FELDON: pescoço de cisne rígido sem artrose | classificação | cap. 55, p. 55 (pista) | mao / Mão reumatoide | 17 | mao-2269 | publicada |
| 97 | NALEBUFF: polegar reumatoide com flexão interfalângica | classificação | cap. 55, p. 55 (pista) | mao / Mão reumatoide | 17 | mao-2270 | publicada |
| 98 | Compartimento volar superficial: músculos incluídos | anatomia | cap. 51, p. 1972 (pista) | mao / Outros temas da mão | 16 | mao-2265 | publicada |
| 99 | Amputação do antebraço: comprimento para prótese | número | cap. 50, p. 50 (pista) | mao / Amputações e reimplantes | 16 | mao-2263 | publicada |
| 100 | JUMPING MAN: composição da zetaplastia nos desenhos | técnica, figura | cap. 48, p. 1878 (pista) | mao / Retalhos e cobertura cutânea | 15 | mao-2260 | publicada (figura descrita em texto) |

Lotes: 01 (1, 87, 2, 20, 39) · 02 (76, 77, 38, 19, 78) · 03 (91, 40, 79, 34, 37) · 04 (41, 58, 3, 21, 4) · 05 (22, 42, 59, 75, 80) · 06 (86, 23, 43, 92, 5) · 07 (14, 6, 24, 33, 44) · 08 (61, 85, 90, 46, 8) · 09 (89, 9, 26, 63, 27) · 10 (47, 64, 65, 95, 10) · 11 (28, 82, 11, 29, 48) · 12 (66, 12, 30, 49, 67) · 13 (68, 31, 50, 13, 57) · 14 (32, 51, 71, 52, 70) · 15 (83, 84, 100, 53, 69) · 16 (99, 15, 98, 54, 16) · 17 (35, 96, 97, 17, 36) · 18 (88, 55, 74, 18) · 19 (25, 45, 93, 60, 62) · 20 (81, 56, 7, 72, 73) · 21 (94).

## SIMÃO 2024

Fase 0 em 26/10/2026: 100 questões extraídas de `SIMÃO 2024 - sem resposta.pdf` (texto com marcas bidi; separado por
script próprio) para `.oq/provas/simao-2024.json`. Respostas da correção em [dicas/simao-2024.md](dicas/simao-2024.md);
14, 15, 34, 46 e 60 sem resposta única no material (resolver pelo Green). Lotes em
`~/OrtoQuestoes-Biblioteca/lotes/simao-2024/`, no modelo de miniaula.

| Nº | Assunto (palavras nossas) | Formato | Green: cap. e páginas | Tema / subtema | Lote | Id | Situação |
|---|---|---|---|---|---|---|---|
| 2 | Braquidactilia: segundo osso mais encurtado | número/fato | cap. 36, p. 1392 a 1394 | mao / Outras malformações congênitas | 01 | mao-2278 | publicada |
| 4 | PATTERSON: tipo IV (amputação) | classificação | cap. 36, p. 1404 e 1421 | mao / Outras malformações congênitas | 01 | mao-2279 | publicada |
| 16 | Polidactilia central: dedo mais envolvido | fato | cap. 36, p. 1387 e 1389 | mao / Sindactilia e polidactilia | 01 | mao-2280 | publicada |
| 21 | Deficiência ulnar: frequência da sindactilia | número | cap. 38, p. 1500 | mao / Deficiências longitudinais e mão torta | 02 | mao-2284 | publicada |
| 22 | Pseudoartrose congênita da ulna: neurofibromatose | fato | cap. 38, p. 1520 | mao / Outras malformações congênitas | 02 | mao-2285 | publicada |
| 69 | BAYNE e KLUG: tipo 2 (rádio hipoplásico proximal e distal) | classificação | cap. 38, p. 1495 (Tabela 38.2) | mao / Deficiências longitudinais e mão torta | 02 | mao-2286 | publicada |
| 86 | PATTERSON: acrossindactilia pelo achado clínico (2º ângulo) | classificação | cap. 36, p. 1404 e 1421 | mao / Outras malformações congênitas | 01 | mao-2281 | publicada |
| 90 | Macrodactilia: histologia (menos glândulas sudoríparas) | fato | cap. 36, p. 1438 e 1439 | mao / Outras malformações congênitas | 01 | mao-2282 | publicada |
| 93 | Fise em C (braquete epifisário longitudinal): clinodactilia | fato/imagem | cap. 36, p. 1433 | mao / Deformidades dos dedos | 02 | mao-2283 | publicada |
| 98 | MADELUNG: resultados das osteotomias | afirmativas | cap. 38, p. 1503, 1506 e 1509 | mao / Outras malformações congênitas | 02 | mao-2287 | publicada |
