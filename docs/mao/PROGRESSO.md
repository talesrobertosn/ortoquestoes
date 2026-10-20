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
   Feito: revisões 01 a 04 (mao-1719 a mao-1738). Próximo: revisão 05 (mao-1739 a mao-1743).
7. SBCM 2024, SBCM 2022, SIMÃO 2022, SBCM 2023, SIMÃO 2024, SIMÃO 2021; depois ENARE 2022, 2023 e 2025.

**Como foi feito até aqui (repetir igual):**
- Lote novo em `~/OrtoQuestoes-Biblioteca/lotes/simao-2023/lote_NN.py` (modelo: `lote_14.py` a `lote_17.py`).
- Fontes: `grep` em `~/OrtoQuestoes-Biblioteca/.oq/texto/livros__<capítulo>.txt` e `resumos__*.txt`; a
  página impressa é a da marca `===== ... p. N` imediatamente acima da linha. O texto tem duas colunas
  misturadas: ler com `cut -c1-95` (coluna esquerda) e `cut -c90-` (direita).
- Ciclo: `copia` → `aplicar_lote --conferir` → aplicar → `gerar_indice` → `validar_acervo` →
  `progresso.py` → commit e push (só `public/acervo` e `docs/mao`). A cada 2 a 4 lotes: `npx tsc -b`,
  `PYTHONUTF8=1 npm test`, PR de `claude/relaxed-franklin-0snpiu` para `claude/pdfs-questoes-tp64dr` e merge.
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
