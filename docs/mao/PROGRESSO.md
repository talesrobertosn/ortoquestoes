# Andamento: provas de Cirurgia da Mão em OrtoQuestões Simulados

Roteiro em [PROTOCOLO.md](PROTOCOLO.md). Atualizar **a cada lote**, antes do commit. Aqui não entra texto das
provas: só número da questão, assunto em palavras nossas, fonte e situação.

Situações: `a fazer`, `em lote NN`, `publicada`, `pendente: sem fonte`, `pendente: conferir à mão`, `anulada no original`.

## Resumo

| Prova | Arquivo local | Questões | Publicadas | Pendentes | Ids | Gabarito (A/B/C/D) |
|---|---|---|---|---|---|---|
| SIMÃO 2021 | SIMAO-2021-questoes.json | 100 | 0 | 0 | | |
| SIMÃO 2022 | SIMAO-2022-questoes.json | 100 | 0 | 0 | | |
| SIMÃO 2023 | Prova  Simão 2023 - sem resposta.pdf | 100 | 19 | 1 | mao-1932 a mao-1950 | A 5, B 5, C 5, D 4 |
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
- Computador do Tales (Windows): os JSON de `provas-separadas.zip` não chegaram a esta máquina; as provas
  foram separadas com `questoes` a partir dos PDFs (mesma numeração), e as respostas vêm de [dicas/](dicas/).

## Modelo de seção por prova

Copiar para cada prova nova (ex.: `## SIMÃO 2024`):

| Nº | Assunto (palavras nossas) | Formato | Green: cap. e páginas | Tema / subtema | Lote | Id | Situação |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | a fazer |

## SIMÃO 2023

Separada de `Prova  Simão 2023 - sem resposta.pdf` (100 questões; a 12 conferida à mão pela dica). Resposta da
correção em [dicas/simao-2023.md](dicas/simao-2023.md). Lotes por capítulo do Green; páginas impressas anotadas
quando o lote é escrito (até lá, só o capítulo). Cotovelo (lote 20) vai no tema `ombro-cotovelo`.

| Nº | Assunto (palavras nossas) | Formato | Green: cap. e páginas | Tema / subtema | Lote | Id | Situação |
|---|---|---|---|---|---|---|---|
| 1 | Diáfise da falange proximal: para onde aponta o ápice e qual músculo deforma | fato com mecanismo | cap. 7, p. 268, 290, 299, 304 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1932 | publicada |
| 2 | Falange média: traço mais frequente na diáfise | fato | cap. 7, p. 290, 291, 299 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1933 | publicada |
| 3 | Madelung: ligamento de VICKERS, posição e ossos que une | epônimo e anatomia | cap. 38 | mao / Deficiências longitudinais e mão torta | 16 | | a fazer |
| 4 | Canal de GUYON, zona III: tipo de déficit | anatomia aplicada | cap. 26 | mao / Neuropatia ulnar e outras compressões | 09 | | a fazer |
| 5 | Artrose radiolunar isolada: causa mais comum | fato | cap. 12 | mao / Artrose do punho e artroscopia | 07 | | a fazer |
| 6 | Rizartrose avançada: postura do polegar (adução e MCF) | fato | cap. 11 | mao / Rizartrose e artrose da mão | 07 | | a fazer |
| 7 | Cabeça do metacarpo: raio mais fraturado | fato | cap. 7, p. 260 a 263 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1934 | publicada |
| 8 | Mão reumatoide: ressecção da ulna distal (indicação, extensão, sinovectomia, ERC) | afirmativas | cap. 55 | mao / Mão reumatoide | 08 | | a fazer |
| 9 | Colo do metacarpo: indicações cirúrgicas (pseudogarra, rotação, dedos radiais, encurtamento) | afirmativas | cap. 7, p. 263, 268 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1935 | publicada |
| 10 | Braquidactilia na síndrome de APERT: com o que se associa | classificação | cap. 36 | mao / Outras malformações congênitas | 14 | | a fazer |
| 11 | Medida da pressão compartimental: contraindicação | fato | cap. 51 | mao / Outros temas da mão | 17 | | a fazer |
| 12 | Túnel do carpo leve na artrite reumatoide sem tenossinovite: conduta | conduta | cap. 55 | mao / Síndrome do túnel do carpo | 08 | | a fazer |
| 13 | Infecção crônica: unhas azuladas e baqueteamento | sinal | cap. 3 | mao / Infecções da mão | 13 | | a fazer |
| 14 | MACS na paralisia cerebral: nível pela descrição | classificação | cap. 32 | mao / Transferências tendinosas e paralisias | 12 | | a fazer |
| 15 | Cisto sinovial: componente predominante do conteúdo | fato | cap. 59 | mao / Cistos sinoviais e gangliões | 18 | | a fazer |
| 16 | Cabeça do rádio, HOTCHKISS tipo II (a correção ressalva) | classificação | cap. 19 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | | a fazer |
| 17 | Flexor na zona 1: quando cabe a reinserção ou sutura primária (coto distal) | número | cap. 6, p. 216, 219 | mao / Lesões dos tendões flexores | 03 | mao-1942 | publicada |
| 18 | Escafoide: ordem de frequência por região | fato | cap. 16, p. 677 a 680 | mao / Fraturas do escafoide e do carpo | 04 | mao-1946 | publicada |
| 19 | Pseudobotoeira: estruturas contraídas na flexão da IFP | mecanismo | cap. 5, p. 198 a 201; cap. 10, p. 388, 389 | mao / Lesões ligamentares dos dedos | 02 | mao-1937 | publicada |
| 20 | Rádio distal consolidado: de onde vêm as queixas residuais | fato | cap. 15 | mao / Fratura do rádio distal | 06 | | a fazer |
| 21 | Botoeira crônica: estágio com contratura fixa e da banda lateral | classificação | cap. 5 (arquivo "4- T. extensor"), p. 199 a 202 | mao / Lesões dos tendões extensores | 02 | mao-1938 | publicada |
| 22 | Escafoide: fator que aumenta a pseudoartrose | fato | cap. 16, p. 678 a 682 | mao / Fraturas do escafoide e do carpo | 04 | mao-1947 | publicada |
| 23 | Polidactilia central: dedo mais acometido | fato | cap. 36 | mao / Sindactilia e polidactilia | 14 | | a fazer |
| 24 | Ponta do dedo, ALLEN: zona proximal à lúnula | classificação | cap. 49, p. 1907 a 1911; cap. 9, p. 365 | mao / Amputações e reimplantes | 03 | mao-1945 | publicada |
| 25 | Hematoma subungueal com retirada da unha: o que fazer com a lâmina | conduta | cap. 9, p. 365 a 367 | mao / Lesões ligamentares dos dedos | 03 | mao-1944 | publicada |
| 26 | Túnel do carpo: fibras que o eletrodiagnóstico avalia | fato | cap. 26 | mao / Síndrome do túnel do carpo | 09 | | a fazer |
| 27 | Mão torta ulnar: associação mais comum | fato | cap. 38 | mao / Deficiências longitudinais e mão torta | 16 | | a fazer |
| 28 | Carcinoma espinocelular: lesão precursora | fato | cap. 58 | mao / Tumores da mão | 17 | | a fazer |
| 29 | Tríade terrível: acesso para o coronoide | técnica | cap. 22 | ombro-cotovelo / Instabilidade do cotovelo | 20 | | a fazer |
| 30 | FERNANDEZ (rádio distal): mecanismo e fratura correspondente | classificação | cap. 15 | mao / Fratura do rádio distal | 06 | | a fazer |
| 31 | Plexo braquial: sinal de lesão pós-ganglionar | raciocínio | cap. 34 | mao / Plexo braquial e paralisia obstétrica | 12 | | a fazer |
| 32 | Mão em espelho (dimelia ulnar): características | afirmativas | cap. 38 | mao / Outras malformações congênitas | 16 | | a fazer |
| 33 | Macrodactilia: diagnóstico, associação e tratamento | afirmativas | cap. 36 | mao / Outras malformações congênitas | 14 | | a fazer |
| 34 | Pseudogota: local mais comum do depósito de pirofosfato | fato | cap. 55 | mao / Mão reumatoide | 08 | | a fazer |
| 35 | Dupuytren: grupo de fatores de risco | lista | cap. 4 (Dupuytren) | mao / Doença de Dupuytren | 08 | | a fazer |
| 36 | Tenossinovite flexora (PANG): fator de mau prognóstico | fato | cap. 2 | mao / Infecções da mão | 13 | | a fazer |
| 37 | Osteoblastoma no punho: osso e exame de escolha (correção: não está no Green) | par | cap. 59 (conferir fonte) | mao / Tumores da mão | 18 | | a fazer |
| 38 | Túnel cubital: sinal da excursão lateral do dedo médio | epônimo | cap. 26 | mao / Neuropatia ulnar e outras compressões | 09 | | a fazer |
| 39 | Ramo profundo do ulnar no Guyon: músculos acometidos | anatomia | cap. 26 | mao / Neuropatia ulnar e outras compressões | 09 | | a fazer |
| 40 | Luxação congênita da cabeça do rádio: lado e direção mais comuns | fato | cap. 38 | mao / Outras malformações congênitas | 16 | | a fazer |
| 41 | IFP: causa mais comum da contratura em extensão | fato | cap. 10, p. 388, 389, 395, 403, 404 (a "causa mais comum" está no resumo do cap. 10) | mao / Deformidades dos dedos | 02 | mao-1939 | publicada |
| 42 | Nervo cutâneo lateral do antebraço: origem e onde emerge | anatomia | cap. 26 | mao / Anatomia da mão e punho | 09 | | a fazer |
| 43 | Paralisia obstétrica: achado e o que ele significa | par | cap. 40 | mao / Plexo braquial e paralisia obstétrica | 10 | | a fazer |
| 44 | GARCIA-ELIAS: estágio da lesão parcial reparável com ângulo normal | classificação | cap. 13 | mao / Instabilidade do carpo | 05 | | a fazer |
| 45 | Paralisia cerebral: punho em flexão e indicações | afirmativas | cap. 32 | mao / Transferências tendinosas e paralisias | 13 | | a fazer |
| 46 | Retalho lateral do braço: artéria | anatomia | cap. 45 | mao / Microcirurgia e retalhos livres | 19 | | a fazer |
| 47 | Zona de atividade polarizante: molécula responsável | embriologia | cap. 35 | mao / Outras malformações congênitas | 15 | | a fazer |
| 48 | MONTEGGIA posterior: padrão mais comum | classificação | cap. 20 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | | a fazer |
| 49 | Úmero distal: vias de acesso | afirmativas | cap. 18 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | | a fazer |
| 50 | Artrodese total do punho: indicações e complicações | afirmativas | cap. 12 | mao / Artrose do punho e artroscopia | 07 | | a fazer |
| 51 | Lesão nervosa: regeneração, ENMG, SUNDERLAND, TINEL | afirmativas | cap. 30 | mao / Lesões de nervos periféricos | 10 | | a fazer |
| 52 | Camptodactilia na artrogripose | afirmativas | cap. 39 | mao / Outras malformações congênitas | 17 | | a fazer |
| 53 | Paralisia radial: vantagem do flexor superficial sobre o FUC para os dedos | transferência | cap. 31 | mao / Transferências tendinosas e paralisias | 11 | | a fazer |
| 54 | Tetraplegia: quando operar o membro superior | número | cap. 33 | mao / Transferências tendinosas e paralisias | 12 | | a fazer |
| 55 | Enxerto de pele na palma: espessura e mecanorreceptores | afirmativas | cap. 44 | mao / Cicatrização e enxertos de pele | 18 | | a fazer |
| 56 | Sarcoma sinovial | afirmativas | cap. 59 | mao / Tumores da mão | 18 | | a fazer |
| 57 | Vascularização lateral do braço (braquial profunda e colaterais) | afirmativas | cap. 45 | mao / Microcirurgia e retalhos livres | 19 | | a fazer |
| 58 | Instabilidade carpal não dissociativa | afirmativas | cap. 13 | mao / Instabilidade do carpo | 05 | | a fazer |
| 59 | VOCHE e MERLE: abdução do mínimo na paralisia ulnar | epônimo | cap. 31 | mao / Transferências tendinosas e paralisias | 11 | | a fazer |
| 60 | Desfiladeiro torácico: compressão distal associada mais comum | fato | cap. 29 | mao / Neuropatia ulnar e outras compressões | 10 | | a fazer |
| 61 | EATON e LITTLER: estágio pela descrição | classificação | cap. 11 | mao / Rizartrose e artrose da mão | 07 | | a fazer |
| 62 | Polidactilia central: ordem de frequência dos dedos | fato | cap. 36 | mao / Sindactilia e polidactilia | 14 | | a fazer |
| 63 | Sinostose radioulnar proximal | afirmativas | cap. 38 | mao / Outras malformações congênitas | 16 | | a fazer |
| 64 | Retalhos: pedículo de cada um (braço lateral, chinês, escapular, inguinal) | afirmativas | cap. 45 | mao / Microcirurgia e retalhos livres | 19 | | a fazer |
| 65 | Cabeça do rádio: centro da zona segura | número | cap. 19 | ombro-cotovelo / Fraturas do cotovelo e antebraço | 20 | | a fazer |
| 66 | Rizartrose: osteotomia do primeiro metacarpo | afirmativas | cap. 11 | mao / Rizartrose e artrose da mão | 07 | | a fazer |
| 67 | Ramo sensitivo do radial (WARTENBERG): anatomia e manobra | afirmativas | cap. 26 | mao / Neuropatia ulnar e outras compressões | 10 | | a fazer |
| 68 | Grande dorsal e serrátil: tipo de retalho e artérias | par | cap. 45 | mao / Microcirurgia e retalhos livres | 19 | | a fazer |
| 69 | Luxação do cotovelo: mecanismo mais comum | mecanismo | cap. 22 | ombro-cotovelo / Instabilidade do cotovelo | 20 | | a fazer |
| 70 | Anestesia em procedimento bilateral | afirmativas | cap. 1 | mao / Anestesia em cirurgia da mão | 13 | | a fazer |
| 71 | Perilunar dorsal: ligamentos cuja lesão permite a luxação | anatomia | cap. 13 | mao / Instabilidade do carpo | 05 | | a fazer |
| 72 | Lesão baixa do mediano: músculo preservado | anatomia | cap. 31 | mao / Transferências tendinosas e paralisias | 11 | | a fazer |
| 73 | Reimplante de dedo: sequência clássica | sequência | cap. 42 | mao / Amputações e reimplantes | 18 | | a fazer |
| 74 | Pseudoartrose de metacarpo: tratamento | conduta | cap. 7, p. 263, 281, 282 | mao / Fraturas dos metacarpos e falanges | 01 | mao-1936 | publicada |
| 75 | Mão de APERT: quais dedos se fundem | fato | cap. 36 | mao / Sindactilia e polidactilia | 14 | | a fazer |
| 76 | Sindactilia: complicações pós-operatórias mais raras | fato | cap. 36 | mao / Sindactilia e polidactilia | 15 | | a fazer |
| 77 | Risco de KIENBÖCK (VIEGAS, ZAPICO, variância, vascularização) | afirmativas | cap. 16, p. 727 a 729 | mao / Doença de Kienböck | 04 | mao-1948 | publicada |
| 78 | Tenotomia de FOWLER: estrutura que precisa estar íntegra | epônimo | cap. 5, p. 195 a 198 | mao / Lesões dos tendões extensores | 02 | mao-1940 | publicada (o original tinha duas respostas: o tendão terminal também precisa estar em continuidade; reescrita pergunta o que evita a botoeira) |
| 79 | Adulto: fraturas mais associadas à síndrome compartimental do membro superior | fato | cap. 51 | mao / Outros temas da mão | 17 | | a fazer |
| 80 | Plexo braquial: quando fazer o eletrodiagnóstico | número | cap. 34 | mao / Plexo braquial e paralisia obstétrica | 12 | | a fazer |
| 81 | Artroscopia: o que se vê pelo portal 3-4 | anatomia | cap. 17 | mao / Artrose do punho e artroscopia | 06 | | a fazer |
| 82 | Dissociação SL aguda (ANDERSSON): padrão mais comum | classificação | cap. 13 | mao / Instabilidade do carpo | 05 | | a fazer |
| 83 | BURKHALTER: transferência precoce na paralisia radial | epônimo | cap. 31 | mao / Transferências tendinosas e paralisias | 11 | | a fazer |
| 84 | ARUD crônica após consolidação viciosa | afirmativas | cap. 14 | mao / Fibrocartilagem triangular e punho ulnar | 06 | | a fazer |
| 85 | DCSS: de qual ligamento se origina | anatomia | cap. 13 | mao / Instabilidade do carpo | 05 | | a fazer |
| 86 | Ângulo da gota de lágrima: o que representa e o ligamento inserido | par | cap. 15 | mao / Fratura do rádio distal | 06 | | a fazer |
| 87 | Reabilitação do flexor: início do fortalecimento isolado | número | cap. 6, p. 225 a 227 | mao / Lesões dos tendões flexores | 03 | mao-1943 | publicada |
| 88 | Biomecânica da fratura do escafoide e do perilunar | afirmativas | cap. 16, p. 678 | mao / Fraturas do escafoide e do carpo | 04 | mao-1949 | publicada |
| 89 | Falange proximal: desvios aceitáveis no tratamento conservador | número | cap. 7 (p. 299 e 304 não trazem os graus) | mao / Fraturas dos metacarpos e falanges | 01 | | pendente: sem fonte (11 e 21 graus não estão no Green nem nos outros livros locais; o original troca coronal por perfil) |
| 90 | LICHTMAN atualizada: em que se baseia | classificação | cap. 16, p. 729 a 733 | mao / Doença de Kienböck | 04 | mao-1950 | publicada |
| 91 | Clinodactilia: deformidade que entra na classificação | classificação | cap. 36 | mao / Deformidades dos dedos | 15 | | a fazer |
| 92 | SDCR: como se faz o diagnóstico | fato | cap. 53 | mao / Síndrome da dor complexa regional | 17 | | a fazer |
| 93 | Nervo sural no tornozelo: relação com o tendão calcâneo | anatomia | cap. 30 | mao / Lesões de nervos periféricos | 10 | | a fazer |
| 94 | Banda de constrição | afirmativas | cap. 36 | mao / Outras malformações congênitas | 15 | | a fazer |
| 95 | Paralisia radial: primeiro músculo do antebraço a voltar | fato | cap. 31 | mao / Transferências tendinosas e paralisias | 11 | | a fazer |
| 96 | Tenossinovite do polegar comunicando com o mínimo: espaço | anatomia | cap. 2 | mao / Infecções da mão | 13 | | a fazer |
| 97 | Martelo: deformidade secundária | fato | cap. 5, p. 190, 196, 198 | mao / Lesões dos tendões extensores | 02 | mao-1941 | publicada |
| 98 | Nervo mediano: folheto embrionário de origem | embriologia | cap. 35 | mao / Outras malformações congênitas | 15 | | a fazer |
| 99 | Classificação internacional da mão tetraplégica: grupo 4 | classificação | cap. 33 | mao / Transferências tendinosas e paralisias | 12 | | a fazer |
| 100 | Mão reumatoide: VAUGHAN-JACKSON, MANNERFELT, IFD, capitato | afirmativas | cap. 55 | mao / Mão reumatoide | 08 | | a fazer |

Lotes: 01 (1, 2, 7, 9, 74; a 89 ficou sem fonte) · 02 (19, 21, 41, 78, 97) · 03 (17, 87, 25, 24) · 04 (18, 22, 77, 88, 90) ·
05 (44, 58, 71, 82, 85) · 06 (20, 30, 86, 84, 81) · 07 (5, 50, 6, 61, 66) · 08 (8, 12, 34, 100, 35) ·
09 (4, 26, 38, 39, 42) · 10 (67, 60, 51, 93, 43) · 11 (53, 59, 72, 83, 95) · 12 (31, 80, 54, 99, 14) ·
13 (45, 13, 36, 96, 70) · 14 (10, 23, 33, 62, 75) · 15 (76, 91, 94, 47, 98) · 16 (3, 27, 32, 40, 63) ·
17 (52, 11, 79, 92, 28) · 18 (15, 37, 56, 55, 73) · 19 (46, 57, 64, 68) · 20 cotovelo (16, 65, 29, 69, 48, 49).
