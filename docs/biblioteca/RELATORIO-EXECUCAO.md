# Relatório de execução da fila editorial

Registro de cada ciclo do Prompt Master V3 e do modo autônomo (Tales, 30/10/2026), para acompanhar o trabalho ao voltar.
A fila sai de `scripts/biblioteca/fila_editorial.py` (docs/biblioteca/FILA-EDITORIAL.md). Livros, provas e PDFs nunca entram no git.

Estados usados: em execução, concluído, publicado, pendente de correção, bloqueado por dependência externa, preservado por otimização anterior.

## Ciclo 1 · Anatomia da mão e punho (mão; provas gerais, TEOT 12 e TARO 28)

- **Estado:** publicado, com o repasse dos comentários ainda pendente.
- **Fontes:** Netter Atlas de Anatomia Ortopédica, 2ª ed. (Jon C. Thompson), caps. 5 e 6; Netter's Concise, 2ª ed.
- **Resumo:** `netter-anatomia-mao-punho-antebraco` (PR 647).
- **Simulados:** 15 (mao-2559 a 2573), PRs 646 e 647.
- **Comentários oficiais reescritos:** 11 em miniaula (mao-0344, 0225, 0394, 0549, 0027, 0066, 0084, 0497, 0518, 0630, 0632), PR 648.
- **Pendente:** cerca de 32 comentários básicos. São questões com imagem e questões que dependem do Green ou do Campbell (NAVARRO, RICHE-CANNIEU, ossificação, embriologia, BENNETT etc.).
- **Problemas e correções:** o teste do Adiantar do Cronograma quebrava por arredondamento com o acervo maior; passou a tolerar até 2 questões (PR 647).
- **Print:** mao-0497, comentário publicado.

## Ciclo 2 · Genuvaro, genuvalgo e torções (pediatria; 60 questões de prova, TEOT 7 e TARO 37)

- **Estado:** parte A publicada; parte B (deficiências dos membros) por fazer.
- **Fontes:** Tachdjian's Pediatric Orthopaedics, 6ª ed. (2021), caps. 4, 16, 17 e 18; Lovell and Winter, 7ª ed., cap. 4.
- **Resumo:** `tachdjian6-alinhamento-torcoes-coxa-vara`, que declara Genuvaro, genuvalgo e torções; Tíbia vara (Blount); Coxa vara do desenvolvimento (PR 649).
- **Simulados:** 12 (pediatria-1399 a 1410), mediana de 4,3 mil caracteres (PR 649).
- **Comentários oficiais reescritos:** 28 em miniaula (PR 650). O fecho "Por que esta questão foi criada" virou "O que a banca quis testar" nas oficiais (PR 652).
- **Figuras:** seis recortes do Tachdjian (16.1, 16.3, 17.1, 17.3, 18.13 e 18.19), em 13 comentários. Foi o primeiro uso do campo `imagens`.
- **Alertas:**
  - 0423: o gabarito liga o encurvamento posteromedial à pseudartrose; o livro diz calcâneo valgo.
  - 0407: o limite de 100 graus do ângulo cervicodiafisário não está no livro.
  - 0726: o "recurvado" não está confirmado no livro.
  - 0311: os valores do ângulo coxa-pé não estão no livro.
  - 0778: a resposta provável D foi confirmada.
- **Pendente (parte B):**
  - resumo das deficiências longitudinais (Tachdjian, cap. 21);
  - as 12 questões de DFFP, hemimelia fibular e tibial;
  - as 19 questões fora do tema, que ficam para os ciclos dos seus temas.
- **Prints:** pediatria-0085 com a figura; estante com o Tachdjian (2026-10-30, desktop).

## Ciclo 2, parte B · Deficiências dos membros (pediatria)

- **Estado:** publicado (PRs 655 a 658).
- **Fontes:** Tachdjian 6ª ed., cap. 21; Campbell 2021, cap. 29 (Derek M. KELLY).
- **Resumo:** `tachdjian6-deficiencias-membros`.
- **Simulados:** pediatria-1411 a 1418.
- **Comentários oficiais:** 12.
- **Figuras:** AITKEN (Fig. 21.13, p. 886) e JONES (Fig. 21.34, p. 901).
- **Alertas:** 0154 (PALEY fibular não está nos livros) e 0153 (GILLESPIE no lugar de AITKEN).

## Ciclo 3 · Lesões do manguito rotador (ombro; 56 questões)

- **Estado:** publicado (PRs 659 a 661).
- **Fontes:** Campbell 2021, caps. 46, 52 e 12.
- **Resumo:** `campbell14-manguito-rotador`.
- **Simulados:** ombro-cotovelo-0686 a 0695.
- **Comentários oficiais:** 16.
- **Lacunas sem fonte local** (questões do TECOC e do peitoral maior, YOCUM, PASTA, porcentagens de GOUTALLIER): ver o checkpoint.
- **Problema:** a PR 659 foi mesclada com o teste vermelho, porque o `| head` mascarava a falha. A PR 660 corrigiu o teste do Adiantar (teto de 100 em `hoje.n`) e criou `scripts/publicar_pr.sh`.
- **Print:** 0056 (bear hug).

## Ciclo 4 · Anatomia do ombro (52 questões)

- **Estado:** publicado (PRs 662 e 663).
- **Fonte:** Netter's Concise, 2ª ed., caps. 3 e 4.
- **Resumo:** `netter-anatomia-ombro-braco`.
- **Simulados:** ombro-cotovelo-0696 a 0703.
- **Comentários oficiais:** 12.
- **Pendentes:** as imagens de cotovelo e antebraço classificadas no subtema, e os ligamentos coracoclaviculares.
- **Observação:** os comentários deste ciclo ficaram curtos (mediana de 1,8 mil caracteres); os próximos voltam ao tamanho de miniaula completa.

## Ciclo 5 · Neuropatias de compressão (mão, provas gerais)

- **Estado:** publicado (PRs 666 a 668).
- **Fonte:** Green 8ª ed., cap. 26.
- **Resumo:** `green8-neuropatias-compressao`.
- **Simulados:** mao-2574 a 2581.
- **Comentários oficiais:** 17.
- **Pendentes:** túnel do carpo (testes e números) e desfiladeiro torácico, sem trecho lido suficiente.
- **Problema:** um comentário novo da mao-0102, amostra da página inicial, quebrou o teste das amostras. Por isso foi criado `scripts/pos_aplicar.sh`.

## Ciclo 6 · Omartrose e artroplastia do ombro

- **Estado:** publicado (PRs 669 e 670).
- **Fonte:** Campbell 14ª ed., caps. 12 e 13.
- **Resumo:** `campbell14-omartrose-artroplastia`.
- **Simulados:** ombro-cotovelo-0704 a 0711.
- **Comentários oficiais:** 18.
- **Pendentes:** questões do TECOC sem fonte local.

## Ciclo 7 · Anatomia do quadril (47 questões)

- **Estado:** publicado (PRs 671 e 672).
- **Fonte:** Netter's Concise, 2ª ed., caps. 7 e 8.
- **Resumo:** `netter-anatomia-quadril-coxa`.
- **Simulados:** quadril-0715 a 0722.
- **Comentários oficiais:** 20, sendo 11 de imagem, explicados pelo que o gabarito indica.
- **Problemas:**
  - A PR 671 falhou porque o `indice.json` não entrou no commit. O lembrete agora está em `pos_aplicar.sh`.
  - A PR 672 pegou o teste `testar_sincronia_aparelhos` perto da meia-noite: os relógios simulados de -7 e +9 minutos caem em dias diferentes. O teste foi rodado de novo depois das 00h10.

## Ciclo 8 · Artroplastia total do quadril: componentes e fixação (45 questões)

- **Fonte:** Campbell 14ª ed., cap. 3 (página impressa = PDF menos 19).
- **Resumo:** `campbell14-ath-biomecanica-componentes`.
- **Simulados:** quadril-0723 a 0732.
- **Comentários oficiais:** 23.
- **Pendentes:** Vancouver, infecção, artrodese, recapeamento e as questões antigas sem gabarito.

## Ciclos 9 a 13

| Ciclo | Tema | Fonte | PR | Simulados | Oficiais |
| --- | --- | --- | --- | --- | --- |
| 9 | Outras malformações congênitas (mão) | Green 8ª ed., caps. 35 a 38 | 674 | mao-2582 a 2591 | 20 |
| 10 | Instabilidade anterior do ombro | Campbell 14ª ed., cap. 47 | 675 | ombro-cotovelo-0712 a 0719 | 15 |
| 11 | Anatomia da coluna | Campbell 14ª ed., cap. 37; Netter cap. 2 | 676 | coluna-0564 a 0571 | 8 |
| 12 | Anatomia do pé e tornozelo | Netter caps. 9 e 10; Hoppenfeld | 677 | pe-tornozelo-0425 a 0430 | 14 |
| 13 | Displasia do desenvolvimento do quadril | Tachdjian 6ª ed., cap. 13 | 678 | pediatria-1419 a 1426 | 24 |

**O que mudou no método.**
- Desde o ciclo 8, cada comentário oficial tem o gabarito conferido contra o acervo antes de ser aplicado. O conversor recusa o lote se a letra da correta não bater com o gabarito, ou se faltar alguma alternativa.
- Divergências entre o livro e a banca ficam em alerta, com o gabarito preservado.
- `testar_sincronia_aparelhos` falha perto da meia-noite, por causa dos relógios simulados de -7 e +9 minutos. Basta rodar de novo depois das 00h10.
- `aplicar_comentarios.py` teve um erro transitório do Windows (Errno 22) ao gravar o arquivo. Repetir resolveu.

## Ciclos 14 a 20

| Ciclo | Tema | Fonte | PR | Simulados | Oficiais |
| --- | --- | --- | --- | --- | --- |
| 14 | Tendões flexores | Green 8ª ed., cap. 6 | 680 | mao-2592 a 2597 | 10 |
| 15 | Metástases ósseas | Campbell 14ª ed., cap. 27 | 681 | tumores-0393 a 0398 | 18 |
| 16 | Hérnia de disco lombar e cervical | Campbell 14ª ed., caps. 38 e 39 | 682 | coluna-0572 a 0577 | 18 |
| 17 | Osteomielite aguda | Tachdjian 6ª ed., cap. 23 | 683 | conceitos-basicos-0416 a 0420 | 9 |
| 18 | Lesão do LCA | Campbell 14ª ed., cap. 45 | 684 | joelho-0383 a 0387 | 8 |
| 19 | Ruptura distal do bíceps | Campbell 14ª ed., cap. 48 | 685 | ombro-cotovelo-0720 a 0723 | 7 |
| 20 | Estadiamento, biópsia e margens | Campbell 14ª ed., cap. 24 (apoio dos caps. 25 a 28) | 687 | tumores-0399 a 0406 | 28 |

**No ciclo 20.** Os comentários voltaram ao tamanho pedido (mediana de cerca de 2,7 mil caracteres). Um conversor por lote confere o gabarito contra o acervo e recusa travessão e o fecho de simulado nas oficiais. Ficaram pendentes a classificação de TOMITA (o Campbell só traz a figura) e uma questão sem gabarito. No Windows, `aplicar_lote.py` precisa de `PYTHONUTF8=1`.

## Refação no MacBook (30 e 31/10/2026)

Resumos curtos refeitos como aula (45 KB ou mais) e todos os comentários do subtema reescritos em miniaula (4,5 mil caracteres ou mais), na ordem de `REFAZER-RESUMOS-E-COMENTARIOS.md`.

| PR | Tema | Resumo | Comentários |
| --- | --- | --- | --- |
| 700 | Bíceps distal e cabeça longa | 79 KB, 7 figuras (Campbell e Green 7ª) | 38 |
| 701 | LCA | 52 KB, 3 figuras | 40 |
| 702 | Metástases ósseas e fratura patológica | 47 KB, Tabela 27.1 (MIRELS) | 61, com os simulados antigos 0370 a 0383 |
| 703 | Hérnia de disco lombar, torácica e cervical | 54 KB | 50 (coluna-0422 pendente: hematoma subdural sem fonte nos livros) |
| 704 | Estante da Biblioteca: o Campbell volta a ser um livro só | (sistema) | |
| 705 | Anatomia da coluna e vias de acesso | 45 KB, com o Netter cap. 2 | 84, todo o subtema |
| 706 | Instabilidade do ombro | 46 KB, Campbell cap. 47 e Rockwood cap. 35 | 65 (os 7 que já estavam no padrão ficaram); 0448 saiu da vitrine da página inicial por ter alerta |
| 707 | Estadiamento, biópsia e margens | 52 KB, Campbell cap. 24 e vizinhos | 45 + 3 originais de duplicatas (0318, 0319, 0136); 0266 desligada do resumo (original é a mao-0459, protegida) |
| 708 | ATQ: biomecânica e componentes (parte 1) | 45 KB, Campbell cap. 3 | 35 (quadril-0330 com alerta: o livro fala em rotação externa, o gabarito em medial) |
| (este) | Omartrose, artroplastia e artrodese do ombro | 45 KB, Campbell caps. 12 e 13 | 61 + 2 originais de trauma (0346 com alerta: o livro indica a anatômica, o gabarito a reversa) |

## Melhorias de sistema feitas no caminho

| PR | Melhoria |
| --- | --- |
| 651 | SEO: o título do índice /resumos/ passa a sair dos livros da Biblioteca; o banco de questões fala em residência. |
| 652 | O validador recusa o fecho de simulado em questão oficial. Estante com a descrição de cada livro, lombadas curtas e "Caps. 16 a 18". O leitor abre em sépia por padrão. |
| 653 | `scripts/figuras_livro.py`: localizar, gerar prévia, recortar e anexar figuras de livro aos comentários. |
| 654 | `scripts/livros.py` (leitura enxuta dos livros) e a passagem para o MacBook (`docs/prompts/CONTINUAR-NO-MACBOOK.md`, `scripts/macbook/preparar.sh`). |
| 656 | `fila_editorial.py` preserva os comentários que já citam um resumo da Biblioteca. |
| 660 | `scripts/publicar_pr.sh` só mescla com os checks verdes. |
| 668 | `scripts/pos_aplicar.sh`: regenera índices, Biblioteca e amostras e roda os testes que mais quebram. |
| 700 | `trava_profundidade.py` (recusa resumo menor que 45 KB ou comentário menor que 4,5 mil), `dossie_tema.py` (todas as questões do subtema com páginas do livro) e `lote_comentarios.py` (lote em .py, medido antes de aplicar). |
| 710 | ATQ parte 2: polietileno e cerâmica (resumo novo `callaghan-polietileno-ceramica`) | 66 KB, Callaghan caps. 12, 13, 14 e 19 | 37 simulados de Fellowship Quadril, todos ligados ao resumo como treino |
| 711 | ATQ parte 3: metais, cimento, tribologia e metal contra metal (resumo novo `callaghan-metais-cimento-tribologia`) | 67 KB, Callaghan caps. 15, 16, 17 e 20 (com trechos dos caps. 1 e 12) | 41 simulados de Fellowship Quadril, todos ligados ao resumo como treino |
| 712 | ATQ parte 4: medição do desgaste, biologia dos detritos e imagem (resumo novo `callaghan-desgaste-osteolise`) | 45 KB, Callaghan caps. 18 e 21 (com trechos dos caps. 23, 25 e 26) | 23 simulados de Fellowship Quadril, ligados ao resumo como treino |
| 714 | ATQ parte 5: história, biomecânica e cinemática (resumo novo `callaghan-historia-biomecanica`) | 45 KB, Callaghan caps. 1, 10 e 11 | 17 simulados de Fellowship Quadril, ligados ao resumo como treino |
| 716 | Tabelas soltas viram !tabela (68 em 15 resumos) e 26 figuras do Callaghan nos resumos | leitor com negrito nas células | os resumos do Rockwood de tornozelo e fise distal ficaram como estavam (proveniência revisada) |
| 717 | ATQ parte 6: anatomia e acessos (resumo novo `callaghan-anatomia-acessos`) | 45 KB, Callaghan caps. 2, 3, 6, 7 e 8, com 3 figuras novas recortadas | 21 simulados, 4 deles com figura do livro |
| 719 | Malformações congênitas da mão refeitas (prioridade TEOT/TARO) | 61 KB, Green 7 caps. 35 a 38 e Tachdjian cap. 12, 4 figuras do Green | 54 comentários no jeito novo (44 de TARO, TEOT e outras provas, 10 simulados) |
| 723 | Fise proximal e tuberosidade da tíbia (Rockwood crianças cap. 27, com o COZEN do cap. 29), refação TEOT/TARO | 21 para 45 KB, 4 figuras | 42 comentários e 5 simulados novos (pediatria-1427 a 1431) |
| 728 | Fraturas do colo do fêmur e luxação traumática do quadril na criança (Rockwood crianças cap. 24), refação TEOT/TARO | reescrito para 45 KB, 4 figuras | 31 comentários reescritos e 4 simulados novos (pediatria-1432 a 1435) |
| 729 | Ombro, úmero proximal e diáfise do úmero na criança (Rockwood crianças cap. 19), refação TEOT/TARO | 12 para 51 KB, 2 figuras | 30 comentários e 5 simulados novos (pediatria-1436 a 1440) |
| 730 | Colo do rádio, olécrano e coronoide na criança (Rockwood crianças cap. 11), refação TEOT/TARO | 12 para 46 KB, 4 figuras | 28 comentários e 4 simulados novos (pediatria-1441 a 1444) |
| 732 | Pelve e acetábulo da criança (Rockwood and Wilkins' Fractures in Children, cap. 23), refação TEOT/TARO | 14 para 45 KB, 2 figuras | 22 comentários e 3 simulados novos (pediatria-1445 a 1447) |
| 735 | Clavícula, escápula, AC e EC da criança (Rockwood and Wilkins' Fractures in Children, cap. 20), refação TEOT/TARO | 16 para 45 KB, 1 figura | 26 comentários e 3 simulados novos (pediatria-1448 a 1450) |
| 736 | Diáfise do fêmur da criança (Rockwood and Wilkins' Fractures in Children, cap. 25), refação TEOT/TARO | 30 para 45 KB | 38 comentários |
| 737 | MONTEGGIA da criança (Rockwood and Wilkins' Fractures in Children, cap. 12), refação TEOT/TARO | 10 para 50 KB, 3 figuras | 25 comentários e 3 simulados novos (pediatria-1451 a 1453); meta do cronograma estável ao puxar um mini-simulado |
| 738 | Coluna cervical da criança (Rockwood and Wilkins' Fractures in Children, cap. 21), refação TEOT/TARO | 13 para 49 KB, 3 figuras | 23 comentários e 3 simulados novos (pediatria-1454 a 1456) |
| 739 | Coluna toracolombar da criança (Rockwood and Wilkins' Fractures in Children, cap. 22), refação TEOT/TARO | 10 para 45 KB, 2 figuras | 21 comentários e 3 simulados novos (pediatria-1457 a 1459) |
| 740 | Pé da criança (Rockwood and Wilkins' Fractures in Children, cap. 31), refação TEOT/TARO | 11 para 45 KB, 2 figuras | 23 comentários e 3 simulados novos (pediatria-1460 a 1462) |
| 742 | Tornozelo da criança (Rockwood and Wilkins' Fractures in Children, cap. 30), refação TEOT/TARO | 17 para 45 KB, 2 figuras | 36 comentários e 3 simulados novos (pediatria-1463 a 1465) |
| 743 | Mão e carpo da criança (Rockwood and Wilkins' Fractures in Children, cap. 8), refação TEOT/TARO | 11 para 45 KB, 2 figuras | 23 comentários e 3 simulados novos (pediatria-1466 a 1468) |
| 749 | Joelho intra-articular da criança (Rockwood and Wilkins' Fractures in Children, cap. 28), refação TEOT/TARO pelo FLUXO-MESTRE | 10 para 73 KB, 3 figuras | 8 comentários oficiais, 15 simulados reescritos no estilo da prova e 3 novos (pediatria-1469 a 1471) |
| 751 | Tíbia e fíbula da criança (Rockwood and Wilkins' Fractures in Children, cap. 29), refação TEOT/TARO pelo FLUXO-MESTRE | 22 para 62 KB, 2 figuras | 6 comentários (5 oficiais e conceitos-basicos-0362), 16 simulados reescritos no estilo da prova e 3 novos (pediatria-1472 a 1474) |
| 752 | Revisão: simulados pediatria-1451 a 1468 no estilo da prova e moldura dos resumos 08 e 30 | 2 resumos com Campbell 15 no lugar da moldura | 18 simulados e comentários refeitos |
| 754 | Estilo dos simulados antigos: pé (cap. 31) e tornozelo (cap. 30) do Rockwood and Wilkins' Fractures in Children | sem mudança em resumo | 22 simulados reescritos no molde da banca (pediatria-1330 a 1344 e 1153 a 1167), conceito mantido; portão corrigido para não confundir DIAS-TACHDJIAN com citação de livro |
| 755 | Estilo dos simulados antigos: clavícula e escápula (cap. 20) e fise proximal da tíbia (cap. 27) do Rockwood and Wilkins' Fractures in Children | sem mudança em resumo | 31 simulados reescritos no molde da banca, conceito mantido com o nome completo do livro |
| 756 | Estilo dos simulados antigos: quadril (cap. 24) e colo do rádio e olécrano (cap. 11) do Rockwood and Wilkins' Fractures in Children | sem mudança em resumo | 30 simulados reescritos no molde da banca, conceito mantido |
| 758 | Estilo dos simulados antigos: mão e carpo (cap. 8) e MONTEGGIA (cap. 12) do Rockwood and Wilkins' Fractures in Children | sem mudança em resumo | 29 simulados reescritos no molde da banca, conceito mantido |
| 759 | Estilo dos simulados antigos: gesso e tala (cap. 4) e consolidação e fise (cap. 2) do Rockwood and Wilkins' Fractures in Children; análises sem "também" solto | sem mudança em resumo | 28 simulados reescritos; 54 análises de alternativa corrigidas no acervo (as protegidas de Cirurgia da Mão ficaram intactas); portão novo no checar_comentarios.py |
| 760 | Estilo dos simulados antigos: ombro e úmero (cap. 19) e coluna cervical (cap. 21) do Rockwood and Wilkins' Fractures in Children | sem mudança em resumo | 26 simulados reescritos no molde da banca, conceito mantido |
| 763 | Estilo dos simulados antigos: coluna toracolombar (cap. 22) e pelve e acetábulo (cap. 23) do Rockwood and Wilkins' Fractures in Children | sem mudança em resumo | 25 simulados reescritos no molde da banca, conceito mantido |
| 764 | Estilo dos simulados antigos: diáfise do fêmur (cap. 25 do Rockwood and Wilkins' Fractures in Children) e perna (cap. 18 do Tachdjian's Pediatric Orthopaedics) | sem mudança em resumo | 18 simulados reescritos; conceitos mantidos com o nome completo do Tachdjian's Pediatric Orthopaedics |
| 766 | Estilo dos simulados antigos: displasia do quadril (cap. 13), deficiências dos membros (cap. 21) e coxa vara (cap. 16) do Tachdjian's Pediatric Orthopaedics | sem mudança em resumo | 17 simulados reescritos no molde da banca, conceito mantido |
| 767 | Estilo dos simulados antigos: caps. 6, 7, 9 e 13 a 18 do Rockwood and Wilkins' Fractures in Children | sem mudança em resumo | 17 simulados reescritos no molde da banca, conceito mantido |
| 768 | Estilo dos simulados antigos: os 31 restantes da pediatria (epidemiologia, rádio distal, côndilo lateral, supracondiliana, fratura em T, fise distal do fêmur, lesões tumorais, maus-tratos, síndrome compartimental) | sem mudança em resumo | 31 simulados reescritos; a pediatria fica com 0 de 489 reprovados |
| 796 | AMPLIAR anatomia da mão, do punho e do antebraço: Netter caps. 5 e 6 com Campbell's Operative Orthopaedics, 15ª ed. (caps. 1, 67, 71, 74), Green's Operative Hand Surgery, 7ª ed. e Tachdjian's Pediatric Orthopaedics, 6ª ed. | versão 2, de 21 KB para 49 KB; seis seções novas (ossos e colunas do carpo, MARTIN-GRUBER e RICHE-CANNIEU com os sinais do ulnar, vias de THOMPSON, HENRY e BOYD, tendão flexor, nervo periférico, embriologia) | cerca de 70 questões ligadas (oficiais e OrtoQuestões Simulados); questões protegidas de Cirurgia da Mão intocadas |
| 798 | Estilo dos simulados antigos: anatomia da mão e punho (Netter caps. 5 e 6) | sem mudança em resumo | 20 simulados reescritos no molde da banca, conceito mantido; anatomia da mão fica com 0 reprovados (os 25 restantes da mão são de neuropatia ulnar, congênitas e flexores, para a etapa F de cada tema) |
| 800 | Miniaulas da anatomia da mão: 28 oficiais (TEOT, TARO, SBOT-SP e Ortopedia) refeitas com o Netter, o Campbell's Operative Orthopaedics, 15ª ed. e o Green's Operative Hand Surgery, 7ª ed. | sem mudança em resumo | 28 comentários (14 das seções novas, 14 do formato antigo); 13 figuras conferidas; mao-0167 e mao-0173 ficaram de fora por estarem marcadas como anuladas com gabarito nos dados |
| 802 | Miniaulas da anatomia da mão, parte 2: os 9 últimos comentários antigos do tema; capítulos do Green corrigidos (28 e 41) no resumo e nos 28 comentários do PR 800 | resumo: só citações de capítulo | 9 comentários novos e 28 reaplicados com a citação certa; anatomia da mão fica sem comentário no formato antigo, exceto mao-0167 e mao-0173 (anuladas com gabarito) |
| 804 | AMPLIAR genuvaro, genuvalgo, BLOUNT e coxa vara: Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 18 relido na tíbia vara, com o Campbell's Operative Orthopaedics, 15ª ed., caps. 32 e 34 | versão 2, de 27 KB para 52 KB; cinco seções novas (BLOUNT por dentro, LANGENSKIÖLD estágio a estágio, osteotomias e complicações, BLOUNT do adolescente, coxa vara pelo Campbell 15) | 30 questões oficiais a mais ligadas; miniaulas no próximo PR |
| 807 | Miniaulas do genuvaro, BLOUNT e coxa vara: 34 oficiais com comentário de 05/10 refeitas pela versão 2 do resumo (Tachdjian's Pediatric Orthopaedics, 6ª ed., e Campbell's Operative Orthopaedics, 15ª ed.) | sem mudança em resumo | 34 comentários; 6 figuras conferidas; alertas nas divergências (recurvato, barra no IV, 10 graus aos 4 anos, posteroinferior, rotação externa, V e VI no mesmo desenho) |
| 808 | Simulados novos do genuvaro, BLOUNT e coxa vara, das lacunas do mapa de cobrança (Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 16 e 18; Campbell's Operative Orthopaedics, 15ª ed., caps. 32 e 34) | resumo: só os blocos de treino | 12 OrtoQuestões Simulados (pediatria-1475 a 1486), 0 reprovados no portão de estilo |
| 811 | AMPLIAR manguito rotador com o Campbell's Operative Orthopaedics, 15ª ed. (cap. 51, cap. 57, caps. 13 e 14), lido por um agente com ficha de fatos por página | versão 2, de 18 KB para 51 KB; nove seções novas (anatomia fina, exame em números, imagem com HAMADA e ângulo crítico, impacto, indicações com Box 51.5 e DERWIN, técnica do reparo, LAFOSSE, irreparáveis, calcária) | cerca de 35 oficiais a mais ligadas; miniaulas no próximo PR |
| 812 | Miniaulas do manguito rotador, parte 1: tendinite calcária, imagem, indicações, prognóstico e transferências, pelo Campbell's Operative Orthopaedics, 15ª ed. | sem mudança em resumo | 22 comentários refeitos; alertas onde o Campbell 15 não sustenta o gabarito (ângulo crítico de 40 graus, infraespinal traumático, sexo e atividade) |
| 813 | Manguito rotador, parte 2: 5 miniaulas de imagem (músculos posteriores, rotura aguda e crônica do subescapular, cabo rotador) e os 10 OrtoQuestões Simulados do tema reescritos no molde da banca | sem mudança em resumo | 5 comentários; 10 simulados reescritos, conceito mantido; o manguito fica com 0 reprovados no portão de estilo |
| 815 | AMPLIAR anatomia do ombro e do braço: Netter caps. 3 e 4 relidos por inteiro, Campbell's Operative Orthopaedics, 15ª ed., caps. 1, 62 e 67, Green's Operative Hand Surgery, 7ª ed., cap. 35; e as anuladas da mão | versão 2, de 12 KB para 45 KB; nove seções novas | cerca de 25 oficiais a mais ligadas; mao-0167 e mao-0173 tratadas como anuladas (gabarito retirado, comentário com todas as alternativas) |
| 816 | Miniaulas da anatomia do ombro e do braço: 25 oficiais com comentário antigo refeitas pela versão 2 (Netter, Campbell's Operative Orthopaedics, 15ª ed., Green's Operative Hand Surgery, 7ª ed.) | sem mudança em resumo | 25 comentários; 19 figuras conferidas; alertas onde o livro não sustenta (bloqueio infraclavicular, complexo suspensório, cabeça curta do tríceps, redondo maior repetido no enunciado) |
| 817 | Estilo dos simulados antigos: anatomia do ombro (Netter cap. 3) | sem mudança em resumo | 8 simulados reescritos no molde da banca, conceito mantido; o subtema fica com 0 reprovados |
| 819 | AMPLIAR neuropatias compressivas do membro superior com o Green's Operative Hand Surgery, 7ª ed. (caps. 28, 29 e 31) e o Campbell's Operative Orthopaedics, 15ª ed. (caps. 82, 67 e 51); ficha e redação por agentes, revisão e portões no fluxo principal | versão 2, de 15 KB para 52 KB; nove seções novas (túnel do carpo em números e tratamento, pronador, túnel cubital, sinais do ulnar, GUYON, túnel radial e WARTENBERG, supraescapular e espaço quadrangular, desfiladeiro torácico) | 31 oficiais a mais ligadas, com alertas onde os livros não sustentam a banca |
| 820 | AMPLIAR anatomia da pelve, do quadril e da coxa: Netter caps. 7 e 8 relidos por inteiro, Campbell's Operative Orthopaedics, 15ª ed., caps. 1 e 4, Rockwood and Green's Fractures in Adults, 10ª ed., caps. 50 a 53; ficha e redação por agentes | versão 2, de 16 KB para 53 KB; 14 tabelas novas | 22 oficiais a mais ligadas; duplicatas trocadas pelas originais; alertas onde os livros não sustentam |
| 821 | AMPLIAR DDQ: Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 13 relido por inteiro (tabelas extraídas do PDF), com o Campbell's Operative Orthopaedics, 15ª ed., cap. 32; ficha e redação por agentes | versão 2, de 9 KB para 47 KB; 11 seções e 14 tabelas novas | 14 oficiais a mais ligadas; divergências entre os dois livros explicadas no texto |
| 822 | Miniaulas de três temas pela versão 2 dos resumos: DDQ (18), neuropatias compressivas (33) e anatomia do quadril (39); lotes escritos por agentes com brief fechado, validados e aplicados no fluxo principal | sem mudança em resumo | 90 comentários; figuras abertas; alertas onde os livros não sustentam a banca; pediatria-0789 mantém a resposta pela bibliografia (Certo) |
| 823 | AMPLIAR tendões flexores: Green's Operative Hand Surgery, 7ª ed., cap. 6 lido por inteiro, e Campbell's Operative Orthopaedics, 15ª ed., cap. 71; ficha e redação por agentes | versão 2, de 7 KB para 48 KB; 14 seções e 12 tabelas novas | questões oficiais de flexores ligadas; duplicatas trocadas pelas originais |
| 824 | AMPLIAR osteomielite: Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 23 (partes de osteomielite relidas por inteiro), e Campbell's Operative Orthopaedics, 15ª ed., caps. 22, 23, 25 e 49; ficha e redação por agentes | versão 2, de 8 KB para 47 KB; 13 seções e 9 tabelas novas | 16 oficiais ligadas; duplicatas trocadas pelas originais; alertas nas de infecção pós-osteossíntese que os livros não cobrem |
| 825 | AMPLIAR anatomia da perna, do tornozelo e do pé: Netter caps. 9 e 10 relidos por inteiro, Campbell's Operative Orthopaedics, 15ª ed., caps. 1, 53, 88, 92 a 94, Rockwood and Green's Fractures in Adults, 10ª ed. (anatomia); ficha e redação por agentes | versão 2, de 9 KB para 47 KB; 12 seções e 13 tabelas novas | oficiais ligadas com duplicatas trocadas pelas originais; divergência do feixe neurovascular anterior explicada pelo nível |
| 827 | AMPLIAR os seis últimos: fêmur distal, transtrocantérica, tálus e calcâneo (cap. 67 do Rockwood and Green inteiro), ossificação e crescimento, deficiências dos membros e maus-tratos, com Campbell's Operative Orthopaedics, 15ª ed., e Tachdjian's Pediatric Orthopaedics, 6ª ed.; 85 miniaulas novas (flexores 23, osteomielite 30, anatomia do pé 32) | seis resumos na versão 2, de 51 KB a 71 KB | duplicatas trocadas pelas originais; 100 hashes de capítulo reconciliados com trechos citados idênticos (reconciliação 265); gabaritos oficiais preservados, divergências em alerta (mao-1238, trauma-0799, trauma-0539) |
| 828 | CRIAR seis temas do zero: paralisia cerebral e pé torto (Tachdjian's Pediatric Orthopaedics, 6ª ed., e Campbell 15), escoliose idiopática (Tachdjian cap. 9, Campbell cap. 40), espondilólise e espondilolistese (Campbell caps. 42 e 46, Tachdjian cap. 11), tendões extensores (Green's Operative Hand Surgery, 7ª ed., caps. 5 e 55, Campbell cap. 71) e lesão medular (Rockwood and Green caps. 47 a 49, Campbell cap. 48); 228 miniaulas novas (paralisia cerebral 39, pé torto 34, escoliose 36, espondilolistese 30, lesão medular 30, extensores 59) | seis resumos novos, de 61 a 62 KB cada | 251 questões oficiais ligadas, duplicatas trocadas pelas originais; gabaritos oficiais preservados com alertas onde o livro diverge |
| 847 | OrtoQuestões Simulados dos quatro temas novos sem simulado, com mapa de cobrança e engenharia reversa das provas: paralisia cerebral 12, pé torto 13, escoliose idiopática 15, espondilolistese 14; prompt mestre com as lições do lote de criação | 54 simulados, gabaritos distribuídos, 0 reprovados no portão de estilo | anatomia básica sem fonte retirada de três questões do pé torto antes de aplicar |
| 848 | CRIAR cinco temas: hálux valgo (Campbell's Operative Orthopaedics, 15ª ed., cap. 87; Tachdjian cap. 19), artroplastia total do joelho (Campbell 15, cap. 8), displasias esqueléticas e síndromes (Tachdjian's Pediatric Orthopaedics, 6ª ed., caps. 34 a 37), outras doenças congênitas (Tachdjian caps. 12, 16, 18, 19 e 21; Campbell 15) e princípios de osteossíntese (AO Principles of Fracture Management, 3ª ed.; Rockwood and Green; Campbell 15, cap. 58) | cinco resumos novos, de 60 a 62 KB | 165 questões oficiais ligadas, duplicatas trocadas pelas originais, alertas onde o livro diverge |
| 849 | CRIAR anatomia do joelho (Netter Atlas de Anatomia Ortopédica, 2ª ed., caps. 8 e 9; Campbell's Operative Orthopaedics, 15ª ed., caps. 50, 1, 8 e 10); 148 miniaulas: hálux valgo 26, displasias e síndromes 25, outras congênitas 34, artroplastia do joelho 33, princípios de osteossíntese 30 | resumo novo de 62 KB e 148 comentários | capítulo do resumo do pé ajustado para 10, para a estante do Netter não empatar com o joelho |
| 850 | CRIAR condrossarcoma (Campbell's Operative Orthopaedics, 15ª ed., caps. 26, 27 e 29; Tachdjian caps. 25 e 26; Sizínio Hebert, 5ª ed.) e fratura do úmero distal (Rockwood and Green's Fractures in Adults, 10ª ed., cap. 39; Campbell 15, cap. 62); 31 miniaulas de anatomia do joelho | dois resumos novos (62 e 58 KB) | 42 questões oficiais ligadas; alertas onde o livro diverge (trauma-0927, trauma-0075, trauma-0103/0812) |
| 852 | CRIAR quatro temas: artrogripose e doenças neuromusculares (Tachdjian's Pediatric Orthopaedics, 6ª ed., caps. 12 e 31 a 37; Campbell 15, caps. 36 e 37), outras infecções osteoarticulares (Campbell 15, caps. 24 e 25; Tachdjian cap. 23; Rockwood and Green cap. 29), pseudartrose e retardo de consolidação (Rockwood and Green's Fractures in Adults, 10ª ed., caps. 3 e 30; Campbell 15, cap. 64) e exame físico da mão e do punho (Green's Operative Hand Surgery, 7ª ed., cap. 28 e outros; Netter; Campbell 15); 114 miniaulas (condrossarcoma 20, úmero distal 14, artrogripose 17, outras infecções 13, pseudartrose 21, exame da mão 29), escritas no modelo Sonnet com os mesmos portões | quatro resumos novos (60 a 62 KB) e 114 comentários | frases sem fonte retiradas antes de aplicar; alertas onde o livro diverge (mao-0338, trauma-0649, conceitos-basicos-0030) |
| 853 | CRIAR três temas: Legg-Calvé-Perthes (Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 14; Campbell 15, cap. 34), fratura subtrocantérica (Rockwood and Green's Fractures in Adults, 10ª ed., caps. 55 e 56; Campbell 15, cap. 60; Skeletal Trauma, 5ª ed.) e osteossarcoma (Campbell 15, caps. 26 e 29; Tachdjian cap. 26; Sizínio); 66 miniaulas (Perthes 24, subtrocantérica 22, osteossarcoma 20) | três resumos novos de 62 KB e 66 comentários | leitura só dos trechos cobrados (cerca de 230 mil tokens por resumo, antes 300 a 400 mil); capítulo do condrossarcoma ajustado para 27 |
| 854 | CRIAR quatro temas: epifisiólise proximal do fêmur (Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 15; Campbell 15, cap. 38), marcha na criança (Tachdjian cap. 5; Campbell 15; Sizínio), lesões de nervos periféricos (Green's Operative Hand Surgery, 7ª ed., caps. 30, 31 e 34; Campbell 15, caps. 67 e 73) e tumor de células gigantes (Campbell 15, caps. 26, 28 e 49; Sizínio); 114 miniaulas (epifisiólise 22, marcha 23, nervos 51, TCG 18) | quatro resumos novos (62 KB) e 114 comentários | pediatria-0855 pulada (gabarito E contra o livro); alertas onde o livro diverge (mao-0467, mao-1145, tumores-0268) |
| 856 | CRIAR três temas: lesões meniscais (Campbell's Operative Orthopaedics, 15ª ed., caps. 50 e 56; Tachdjian cap. 40), doença de Dupuytren (Green's Operative Hand Surgery, 7ª ed., cap. 4; Campbell 15, cap. 80) e retalhos e cobertura cutânea (Green 7, caps. 43 a 46 e 49; Campbell 15, caps. 21, 69 e 70); 48 miniaulas de Dupuytren; 42 miniaulas refeitas (meniscos 24 e TCG 18) depois da reclamação do Tales de comentários curtos | três resumos novos e 90 comentários no porte de miniaula | brief dos agentes corrigido: aula completa (o que é, o que acontece, classificação, por que a correta, por que cada errada), sem molde de tamanho; portão contra comentário raso |
| 858 | CRIAR dois temas: exame físico do ombro (Campbell's Operative Orthopaedics, 15ª ed., caps. 51 a 53, 57 e 14; Netter, cap. 3) e exame neurológico e radiculopatias (Campbell 15, caps. 40, 43, 45, 46 e 48; Netter, cap. 2; Sizínio; Tachdjian cap. 34); 127 miniaulas em aula completa (retalhos 89, exame do ombro 10, exame neurológico 28) | dois resumos novos (62 KB) e 127 comentários | publicação pelo script seguro (resolve gerados, procura marcador de conflito, valida e testa) |
| 859 | CRIAR três temas: hérnia de disco e mielopatia cervical (Campbell's Operative Orthopaedics, 15ª ed., caps. 43 a 45; Rockwood and Green cap. 48; Netter; Sizínio), tumores benignos de partes moles (Campbell 15, caps. 27, 30 e 83; Green 7, cap. 59; Tachdjian; Sizínio) e dor e analgesia (Campbell 15, caps. 2, 67 e 69; Skeletal Trauma 5, cap. 14A; Rockwood and Green; Green); 41 miniaulas em aula completa (cervical 10, partes moles 16, dor 15) | três resumos novos (61 a 62 KB) e 41 comentários | alertas onde o livro diverge (coluna-0361, tumores-0061, conceitos-basicos-0211) |
| 860 | CRIAR quatro temas: mão reumatoide (Green's Operative Hand Surgery, 7ª ed., cap. 55; Campbell 15, cap. 78), pé diabético e neuroartropatia de Charcot (Campbell 15, cap. 91; Sizínio), osteonecrose da cabeça femoral (Campbell 15, cap. 7 e outros) e displasia fibrosa (Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 25; Campbell 15); 77 miniaulas em aula completa (mão reumatoide 31, pé diabético 20, osteonecrose 26) | quatro resumos novos (60 a 62 KB) e 77 comentários | quadril-0528 corrigida no acervo (figura de outra questão e texto da folha colado na alternativa); alertas onde o livro diverge (mao-0350, mao-0405, pe-tornozelo-0340, quadril-0504) |
| 861 | CRIAR dois temas: artroscopia e vias de acesso do ombro (Campbell's Operative Orthopaedics, 15ª ed., caps. 57, 54 e 1; Netter) e capsulite adesiva (Campbell 15, caps. 51 e 57; Sizínio); 28 miniaulas em aula completa (displasia fibrosa 14, artroscopia 5, capsulite 9) | dois resumos novos (62 KB) e 28 comentários | exame do ombro passa ao cap. 52 na estante (capsulite ficou com o 51) |
| 862 | CRIAR três temas: luxação do quadril e fratura da cabeça femoral (Rockwood and Green's Fractures in Adults, 10ª ed., cap. 52; Campbell 15, caps. 60 e 65), osteoporose (Rockwood and Green, cap. 4; Campbell 15; Sizínio) e artrite séptica (Tachdjian's Pediatric Orthopaedics, 6ª ed., caps. 22 e 23; Campbell 15; Sizínio); 42 miniaulas em aula completa (luxação 8, osteoporose 15, artrite séptica 19) | três resumos novos (52 a 62 KB) e 42 comentários | o detector de duplicatas trata conceitos-basicos-0257 (VHS 40, gabarito C) como cópia da 0089 (gabarito B): anotado para revisão |
| 863 | CRIAR três temas: lesões musculares (Campbell's Operative Orthopaedics, 15ª ed., cap. 53 e outros; Tachdjian; Sizínio; Rockwood and Green), luxação acromioclavicular (Rockwood and Green's Fractures in Adults, 10ª ed., cap. 32; Campbell 15, caps. 65 e 66; Sizínio) e consolidação óssea (Rockwood and Green, cap. 2 e outros; AO; Campbell 15); 44 miniaulas em aula completa (musculares 18, AC 13, consolidação 13) | três resumos novos (62 KB) e 44 comentários | lista das questões de amostra incluída no brief dos agentes |
| 864 | CRIAR quatro temas: imagem do ombro e cotovelo (Campbell's Operative Orthopaedics, 15ª ed., cap. 3 e outros; Rockwood and Green), instabilidade femoropatelar (Campbell 15, caps. 52, 38, 50 e 8; Tachdjian; Rockwood and Green; Sizínio), osteocondrite dissecante (Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 40; Campbell 15) e epicondilite lateral e medial (Campbell 15, caps. 82, 51 e 57; Green 7; Sizínio); 47 miniaulas em aula completa (imagem 12, femoropatelar 20, osteocondrite 15) | quatro resumos novos (62 KB) e 47 comentários | alertas onde o livro diverge (joelho-0306, joelho-0006) |
| 865 | CRIAR quatro temas: plexo braquial e paralisia obstétrica (Green's Operative Hand Surgery, 7ª ed., caps. 34 e 40; Tachdjian; Campbell 15), fratura do rádio distal (Rockwood and Green's Fractures in Adults, 10ª ed., cap. 43; Green 7, cap. 15; Sizínio), coalizões tarsais (Campbell's Operative Orthopaedics, 15ª ed., cap. 88; Tachdjian) e pé cavo (Campbell 15, cap. 92; Tachdjian); 155 miniaulas em aula completa (epicondilite 12, plexo 58, rádio distal 33, coalizões 15, pé cavo 17) e o resumo de epicondilite do lote anterior com suas miniaulas | quatro resumos novos (57 a 62 KB) e 155 comentários | mao-1239 (ENARE R4 2025): gabarito oficial 'rotação medial' contra os três livros (SEVER-L'EPISCOPO é rotação lateral); conferir a chave |
| base (03/11) | CRIAR três temas: doença de KIENBÖCK (Green's Operative Hand Surgery, 7ª ed., cap. 16; Campbell's Operative Orthopaedics, 15ª ed., cap. 74), lesões nervosas do ombro e cotovelo (Campbell 15, cap. 14 e outros; Green 7, caps. 34 e 40) e mielomeningocele (Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 32; Campbell 15, cap. 36), com 35 miniaulas novas (22, 11 e 2). Alertas de `mao-0604` e `mao-0642` alinhados ao gabarito da bibliografia da banca. |
| 866 | CRIAR quatro temas: rizartrose e artrose da mão (Green's Operative Hand Surgery, 7ª ed., cap. 11; Campbell's Operative Orthopaedics, 15ª ed., cap. 78), espondiloartrites e outras artrites (Campbell 15, caps. 78, 90, 45 e 46; Tachdjian's Pediatric Orthopaedics, 6ª ed., caps. 22 e 23), tuberculose osteoarticular (Campbell 15, caps. 25 e 49; Tachdjian cap. 23) e exame físico do quadril (The Adult Hip, 3ª ed., cap. 22; Campbell 15, caps. 7 e 56; HEBERT), com 43 miniaulas novas (23, 11 e 9). Ids que não são de prova real passam para treino= automaticamente. |
| 867 | CRIAR dois temas: sarcoma de EWING (Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 26; Campbell's Operative Orthopaedics, 15ª ed., caps. 29 e 26) e estenose do canal lombar (Campbell 15, caps. 46 e 47; HEBERT), com 39 miniaulas novas (13 de EWING, 7 de estenose e as 19 do exame físico do quadril). |
| 868 | CRIAR dois temas: osteogênese imperfeita (Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 38; Campbell's Operative Orthopaedics, 15ª ed., cap. 34), com 5 miniaulas, e imagem do joelho (Campbell 15, caps. 10, 3, 50 e 52; HEBERT, caps. 15 e 16; Rockwood and Green, caps. 60 a 62). As miniaulas da imagem do joelho seguem no próximo PR. |
| 869 | CRIAR três temas: cifose e doença de SCHEUERMANN (Tachdjian's Pediatric Orthopaedics, 6ª ed., cap. 10; Campbell's Operative Orthopaedics, 15ª ed., cap. 41), tendões fibulares e outras tendinopatias (Campbell 15, caps. 94, 88 e 53; HEBERT) e imagem do pé e tornozelo (Campbell 15, cap. 93 e outros; Rockwood and Green, caps. 65 a 67; HEBERT), mais 17 miniaulas da imagem do joelho. |
| 870 | 42 miniaulas dos temas publicados no PR 869: cifose e doença de SCHEUERMANN (17), tendões fibulares e outras tendinopatias (13) e imagem do pé e tornozelo (12). Imagens das questões de tendões abertas e descritas; nenhuma contraria o gabarito. |
| 871 | CRIAR três temas: pseudartrose congênita da tíbia e deformidades da perna (Campbell's Operative Orthopaedics, 15ª ed., cap. 31; Tachdjian's Pediatric Orthopaedics, 6ª ed., caps. 18, 20 e 21; HEBERT), rigidez do cotovelo (Campbell 15, caps. 15, 51 e 57; Green's Operative Hand Surgery, 7ª ed., cap. 24; Rockwood and Green) e entorse e instabilidade lateral do tornozelo (Campbell 15, caps. 55, 94 e 59; Rockwood and Green; HEBERT). As miniaulas seguem no próximo PR. |
| 872 | 32 miniaulas dos temas do PR 871: entorse do tornozelo (15), pseudartrose congênita da tíbia (9) e rigidez do cotovelo (8). Alerta de `ombro-cotovelo-0491` alinhado ao gabarito da bibliografia da banca. |
| 874 | CRIAR dois temas: fraturas do retropé, mediopé e antepé (Rockwood and Green's Fractures in Adults, 10ª ed., caps. 67 e 68; Campbell's Operative Orthopaedics, 15ª ed., cap. 93), com 3 miniaulas, e lesões osteocondrais do tálus (Campbell 15, caps. 34, 94 e 55; Tachdjian; Rockwood and Green; HEBERT). |
| 886 | CRIAR pé plano adquirido do adulto (Campbell's Operative Orthopaedics, 15ª ed., caps. 90 e 88; HEBERT) e 8 miniaulas das lesões osteocondrais do tálus. Ferramentas da fila movidas para pasta permanente fora do git. |
| 887 | CRIAR três temas: imagem do quadril (The Adult Hip, caps. 23 a 25; Campbell's Operative Orthopaedics, 15ª ed.; Rockwood and Green; Tachdjian; HEBERT), artrose e artroplastia do cotovelo (Green's Operative Hand Surgery, 7ª ed., cap. 27; Campbell 15, cap. 15) e imagem da coluna (Campbell 15, cap. 43 e caps. 38 a 49; Rockwood and Green; Tachdjian; HEBERT), mais 8 miniaulas do pé plano adquirido. Leitor de livros com o Dahlin's Bone Tumors e o Lovell and Winter. |
| 888 | CRIAR três temas: cisto ósseo simples (Dahlin's Bone Tumors, 6ª ed., cap. 26; Lovell and Winter's Pediatric Orthopaedics, 7ª ed., cap. 13; Tachdjian; Campbell 15), mieloma múltiplo e plasmocitoma (Dahlin, cap. 16; Campbell 15; Rockwood and Green; HEBERT) e artrose do tornozelo, artrodese e artroplastia (Campbell's Operative Orthopaedics, 15ª ed., caps. 12 e 11; Rockwood and Green; HEBERT). Primeiros resumos com os livros de tumor enviados pelo Tales. |
| 889 | 52 miniaulas: imagem da coluna (20), imagem do quadril (17), cisto ósseo simples (12) e artrose do cotovelo (3), com comparação entre livros onde o número decide a questão. Alerta da `tumores-0361` corrigido: o gabarito oficial (ressecção em bloco) diverge do método de SCAGLIETTI no Dahlin e no Tachdjian. |
| 890 | CRIAR dois temas: exame físico do pé e tornozelo (Campbell's Operative Orthopaedics, 15ª ed., cap. 86 e outros; HEBERT; Tachdjian) e tendão calcâneo (HEBERT, 5ª ed., caps. 21.2 e 21.1; Campbell 15, caps. 53 e 88), mais 23 miniaulas: mieloma (14) e artrose do tornozelo (9). |
| 891 | CRIAR dois temas: amputações e próteses (Campbell's Operative Orthopaedics, 15ª ed., caps. 16 a 18 e 20; Tachdjian; HEBERT; Rockwood and Green) e dor peritrocantérica e tendinopatias (The Adult Hip, cap. 43 e outros; Campbell 15; HEBERT), mais 6 miniaulas do exame físico do pé. |
| 892 | CRIAR gonartrose e osteotomias (HEBERT, 5ª ed., cap. 16; Campbell's Operative Orthopaedics, 15ª ed., caps. 10, 8, 50 e 52), mais 36 miniaulas: amputações (14), tendão calcâneo (11) e dor peritrocantérica (11). |
| 893 | Osteoporose v2 (tratamento ligado ao resumo do Rockwood and Green, cap. 4, com 16 questões novas) e CRIAR fibrocartilagem triangular e punho ulnar (Green's Operative Hand Surgery, 7ª ed., cap. 14 e outros; Campbell 15, cap. 74; Rockwood and Green), mais 14 miniaulas da gonartrose. |
| 894 | CRIAR raquitismo e osteomalácia (Lovell and Winter's Pediatric Orthopaedics, 7ª ed., cap. 6; Tachdjian, cap. 38; Rockwood and Green; HEBERT), mais 40 miniaulas: fibrocartilagem triangular (29), osteoporose (6) e raquitismo (5). Alerta da `osteometabolicas-0091` alinhado à bibliografia da banca. |
| 895 | CRIAR dois temas: metatarsalgia e neuroma de MORTON (Campbell's Operative Orthopaedics, 15ª ed., caps. 89, 92 e 87; HEBERT; Tachdjian) e impacto femoroacetabular (The Adult Hip, cap. 35 e caps. 8, 11, 22, 23, 25 e 68; Campbell 15, caps. 7 e 56; HEBERT; Tachdjian). As miniaulas seguem no próximo PR. |
| 896 | CRIAR dois temas: doença de PAGET (Campbell's Operative Orthopaedics, 15ª ed., caps. 4, 27, 29 e 46; Dahlin; Rockwood and Green; The Adult Hip) e politrauma e controle de danos (Rockwood and Green, 10ª ed., cap. 14 e outros; AO; Campbell 15; HEBERT; Skeletal Trauma), mais 31 miniaulas: PAGET (11), metatarsalgia (11) e impacto femoroacetabular (9). |
| 897 | CRIAR dois temas: infecções da coluna (Campbell's Operative Orthopaedics, 15ª ed., cap. 49 e outros; Tachdjian; HEBERT; Rockwood and Green) e histiocitose de células de LANGERHANS (Lovell and Winter's Pediatric Orthopaedics, 7ª ed., caps. 10 e 13; Tachdjian; Dahlin; Campbell 15), mais 18 miniaulas: politrauma (13) e infecções da coluna (5). Alerta da `trauma-1171` alinhado à bibliografia da banca. |
| 898 | CRIAR dois temas: exame físico do joelho (HEBERT, 5ª ed., cap. 63; Campbell's Operative Orthopaedics, 15ª ed., caps. 50, 52, 56, 8 e 35; Tachdjian; Rockwood and Green) e deformidades ósseas e alongamento (Campbell 15, caps. 63, 31, 58 e 10; Tachdjian; Lovell and Winter; Rockwood and Green; HEBERT), mais 9 miniaulas da histiocitose de LANGERHANS. |
| 899 | CRIAR dois temas: dedo em gatilho e outras tenossinovites (Green's Operative Hand Surgery, 7ª ed., cap. 56 e caps. 2 e 37; Campbell 15, caps. 81 e 84; Tachdjian; HEBERT) e amputações e reimplantes da mão (Green 7, caps. 42 e 49 e outros; Campbell 15, caps. 20, 21 e 68), mais 20 miniaulas: exame físico do joelho (10) e deformidades e alongamento (10). |
| 900 | CRIAR síndrome do túnel do carpo (Green's Operative Hand Surgery, 7ª ed., caps. 28, 29, 31, 53 e 56; Campbell 15, caps. 82 e 78; HEBERT), mais 37 miniaulas de amputações e reimplantes da mão. |
| 901 | 45 miniaulas de mão: dedo em gatilho e outras tenossinovites (24) e síndrome do túnel do carpo (21), com Green, Campbell e HEBERT lado a lado onde divergem. |
| 902 | Artrite séptica v2 (sinovite transitória do quadril ligada ao resumo do Tachdjian 6, cap. 22, com Lovell and Winter 7 e HEBERT) e CRIAR lesões SLAP e do lábio superior (HEBERT, 5ª ed., caps. 5, 45 e 4; Campbell 15, caps. 57, 51 e 3). |
| 903 | CRIAR três temas: osteocondroses (Lovell and Winter's Pediatric Orthopaedics, 7ª ed., cap. 9; Tachdjian; Campbell 15; Rockwood and Wilkins), exame físico do cotovelo (HEBERT, 5ª ed., caps. 4, 48 e 47; Campbell 15; Green 7; Rockwood and Green) e hálux rígido (HEBERT, caps. 21.5 e 21.3; Campbell 15, caps. 87, 90, 55 e 36; Tachdjian). |
| 904 | Tumores de partes moles v2 (sarcomas de partes moles ligados ao resumo do Campbell 15, cap. 30, com Tachdjian, Lovell and Winter e Green), mais 20 miniaulas: hálux rígido (10), osteocondroses (7) e exame do cotovelo (3). |
| 905 | CRIAR dois temas: lombalgia (Campbell's Operative Orthopaedics, 15ª ed., caps. 46 e 24; HEBERT; Tachdjian) e pé plano flexível (Lovell and Winter's Pediatric Orthopaedics, 7ª ed., cap. 29; Tachdjian; HEBERT; Campbell 15), mais 10 miniaulas: lombalgia (5) e sarcomas de partes moles (5). |
| 906 | CRIAR dois temas: outras lesões pseudotumorais (Dahlin's Bone Tumors, 6ª ed., caps. 14 e 26; Campbell 15; Lovell and Winter; Tachdjian; Rockwood and Green; HEBERT) e deformidades dos dedos (Green's Operative Hand Surgery, 7ª ed., cap. 10 e outros; Campbell 15, caps. 71, 79 e 85; HEBERT), mais 7 miniaulas do pé plano flexível. |
| 907 | CRIAR medicamentos e exames laboratoriais (Rockwood and Green's Fractures in Adults, 10ª ed., cap. 26 e outros; Campbell 15; HEBERT), mais 21 miniaulas: deformidades dos dedos (17) e lesões pseudotumorais (4). |
| 908 | CRIAR biomecânica e marcha do pé e tornozelo (HEBERT, 5ª ed., cap. 1 e outros; Campbell 15; Rockwood and Green; Tachdjian), mais 10 miniaulas de medicamentos e exames laboratoriais. |
| 909 | CRIAR deformidades congênitas do pé (HEBERT, 5ª ed., caps. 20.5, 20.3 e 20.1; Lovell and Winter 7, cap. 29; Tachdjian; Campbell 15) e impacto femoroacetabular v2 com artroscopia do quadril e lesão labral (Campbell 15, cap. 56; HEBERT; The Adult Hip). |
| 910 | CRIAR vias de acesso à coluna (Hoppenfeld, Vias de Acesso em Cirurgia Ortopédica, 4ª ed., cap. 6, lido por OCR; Campbell 15, caps. 44 e 45; Rockwood and Green), mais 9 miniaulas de biomecânica e marcha do pé. |
| 911 | 26 miniaulas: deformidades congênitas do pé (14), artroscopia do quadril e lesão labral (8) e vias de acesso à coluna (4), com os livros comparados onde divergem. |
| 912 | Quatro resumos novos: biomecânica da mão (green-biomecanica-mao, 62 KB), peitoral maior e rupturas tendíneas (campbell15-peitoral-maior, 62 KB), fixadores externos (ao-fixadores-externos, 61 KB) e luxação acromioclavicular e esternoclavicular (versão 2, 68 KB); 14 miniaulas da biomecânica da mão, com Green, Campbell e Rockwood lado a lado onde divergem. |
| 913 | Dois resumos novos: pé reumatoide (hebert-pe-reumatoide, 62 KB, HEBERT 21.6 com o Campbell 15) e desenvolvimento neuropsicomotor (tachdjian6-desenvolvimento-neuropsicomotor, 62 KB, Tachdjian 1 com Rockwood and Wilkins, Lovell and Winter e HEBERT); 21 miniaulas: fixadores externos (9), peitoral maior (5) e luxação AC e EC (7), com os livros lado a lado onde divergem. |
| 914 | Fraturas do mediopé e antepé: versão 2 do resumo do retropé, mediopé e antepé (70 KB; SANGEORZAN, quebra-nozes, HARDCASTLE e MYERSON, 5º metatarso; 6 questões novas); 14 miniaulas: pé reumatoide (8) e desenvolvimento neuropsicomotor (6), com HEBERT, Campbell, Tachdjian, Rockwood and Wilkins e Lovell and Winter lado a lado. |
| 915 | Três resumos novos: fraturas do quadril e do acetábulo (callaghan-fraturas-quadril-acetabulo, 62 KB, 42 questões), osteotomias do quadril (callaghan-osteotomias-quadril, 62 KB, 18 questões) e encondroma e encondromatoses (dahlin-encondroma, 60 KB, Dahlin cap. 3 com Campbell, Green, Tachdjian e Lovell and Winter); 2 miniaulas do mediopé (cuboide em quebra-nozes e BÖHLER normal, com Rockwood 10 e a bibliografia da prova lado a lado). |
| 916 | 26 miniaulas: fraturas do quadril e do acetábulo (14), osteotomias do quadril (5) e encondroma (7), com CALLAGHAN, Rockwood, Campbell, HEBERT, Dahlin, Green, Tachdjian e Lovell and Winter lado a lado onde divergem; alerta da figura da quadril-0117 corrigido. |
| 917 | Dois resumos novos: menisco discoide (lw-menisco-discoide, 62 KB, Lovell and Winter cap. 31 com Tachdjian, Campbell e HEBERT) e artrose do punho e artroscopia (green-artrose-punho-artroscopia, 70 KB, Green 7 caps. 12 e 17 com Campbell e HEBERT; 50 questões ligadas); alerta da joelho-0299 alinhado no resumo de meniscos. |
| 918 | Anatomia do cotovelo: resumo novo (netter-anatomia-cotovelo, 62 KB, Netter com Campbell, Rockwood, Green e HEBERT; 24 questões ligadas); 24 miniaulas: menisco discoide (7) e artrose do punho e artroscopia (17), com os livros lado a lado onde divergem. |
| 919 | Dois resumos novos: hiperparatireoidismo e osteodistrofia renal (hebert-hiperparatireoidismo, 61 KB, HEBERT cap. 27 com Tachdjian, Lovell and Winter, Rockwood, Campbell e Dahlin) e fasciíte plantar e dor no calcanhar (hebert-fasciite-plantar, 62 KB, HEBERT 21.1 com Campbell e Tachdjian); 12 miniaulas da anatomia do cotovelo; alerta da pe-tornozelo-0257 corrigido no resumo do Netter. |
| 920 | Três resumos novos: coxartrose (callaghan-coxartrose, 62 KB, The Adult Hip cap. 41 com Campbell e HEBERT), condroblastoma (dahlin-condroblastoma, 60 KB, Dahlin cap. 4) e osteocondroma e exostoses múltiplas (dahlin-osteocondroma, 57 KB, Dahlin cap. 2), com Campbell, Tachdjian, Lovell and Winter, Green e HEBERT lado a lado; 5 miniaulas da fasciíte plantar. |
| 921 | 17 miniaulas: coxartrose (4), condroblastoma (6) e osteocondroma (7), com Dahlin, Campbell, Tachdjian, Lovell and Winter, Green, HEBERT e CALLAGHAN lado a lado onde divergem. |
| 922 | Impacto subacromial e acromioplastia: versão 3 do resumo do manguito rotador (70 KB; os acromiale, testes de NEER e HAWKINS, acromioplastia aberta e artroscópica, acromioclavicular); três resumos novos: biomecânica do joelho (hebert-biomecanica-joelho, 62 KB), metodologia científica e estatística (rockwood10-metodologia-cientifica, 62 KB, Rockwood cap. 8) e lesões condrais (campbell15-lesoes-condrais, 62 KB); alertas das questões sem gabarito alinhados ao gabarito pela bibliografia. |
| 923 | 36 miniaulas: manguito rotador (22, refeitas a partir da versão 3 do resumo), biomecânica do joelho (6), lesões condrais (4) e metodologia científica (4), com Campbell, HEBERT e Rockwood lado a lado onde divergem. |
| 924 | 21 miniaulas do manguito rotador (partes 3 e 4: tendinite calcária, os acromiale, GOUTALLIER, imagem, transferências, reabilitação), completando as 43 questões antigas refeitas; alertas da ombro-cotovelo-0565 e 0573 acrescentados ao resumo. |
| 925 | Artroscopia do tornozelo: resumo novo (campbell15-artroscopia-tornozelo, 62 KB, Campbell 15 caps. 54 e 55 com Rockwood and Green 10) e 5 miniaulas, com os capítulos do Campbell lado a lado onde se contradizem. |
| 926 | Três resumos novos: pubalgia e osteíte púbica (hebert-pubalgia, 62 KB, HEBERT 76 com Campbell 7), fraturas periprotéticas do quadril (callaghan-fraturas-periproteticas-quadril, 62 KB, The Adult Hip 88 com Rockwood e Campbell) e imagem em ortopedia (rockwood10-imagem-ortopedia, 62 KB, Rockwood 7 com Campbell, The Adult Hip, HEBERT e Tachdjian). |
| 927 | 19 miniaulas: pubalgia (6), fraturas periprotéticas do quadril (8) e imagem em ortopedia (5), com HEBERT, Campbell, CALLAGHAN, Rockwood e Tachdjian lado a lado; descrição da figura da quadril-0139 corrigida no resumo; amostra quadril-0078 da página inicial regenerada. |
| 928 | Três versões 2 com temas novos: osteonecrose do joelho (campbell15-lesoes-condrais v2, 70 KB), artroscopia do cotovelo (netter-anatomia-cotovelo v2, 70 KB) e ossificação heterotópica (campbell15-rigidez-cotovelo v2, 70 KB, com HASTINGS e GRAHAM e BROOKER); 4 miniaulas da osteonecrose do joelho. |
| 929 | Sindactilia e polidactilia: resumo novo (green-sindactilia-polidactilia, 61 KB, Green 7 caps. 35 a 38 com Tachdjian, Campbell, Lovell and Winter e HEBERT; 58 questões ligadas); 3 miniaulas do cotovelo (artroscopia e HASTINGS e GRAHAM). |
| 930 | Cisto ósseo aneurismático: versão 2 do resumo de cisto ósseo simples (dahlin-cisto-osseo-simples, 70 KB, com USP6, primário e secundário, imagem, variante sólida e tratamento em quatro livros); 19 miniaulas de sindactilia e polidactilia (partes 1 e 3), com Green, Tachdjian, Campbell, Lovell and Winter e HEBERT lado a lado. |
| 931 | Osteoma osteoide (dahlin-osteoma-osteoide, 62 KB), osteomielite crônica (tachdjian6-osteomielite v3, 70 KB: CIERNY-MADER, biofilme, MARJOLIN, MASQUELET) e escoliose congênita e neuromuscular (campbell15-escoliose-congenita-neuromuscular, 62 KB, Campbell cap. 40 com Tachdjian e Lovell and Winter); 16 miniaulas (sindactilia 10, osteoma osteoide 5, cisto aneurismático 1). |
| 932 | 41 miniaulas: osteomielite (36 questões antigas refeitas a partir da versão 3 do resumo) e escoliose congênita (5, com as figuras conferidas); alerta da figura da coluna-0220 retirado do resumo. |
| 933 | Reconstrução do LCA: enxertos e túneis: versão 3 do resumo do LCA (campbell14-lca, 70 KB; carga e rigidez dos enxertos, retirada dos flexores, aloenxerto e esterilização, marcos do túnel femoral, transtibial x portal anteromedial, fixação, ligamentização e falha, com Campbell 15 e HEBERT lado a lado). |
| 934 | Dois resumos novos: artroscopia do joelho (hebert-artroscopia-joelho, 52 KB, HEBERT cap. 64 com Campbell 15 caps. 10, 54 e 56) e imagem da mão e punho (green-imagem-mao-punho, 68 KB, Green 7 cap. 15 e outros com Rockwood e HEBERT; 37 questões ligadas). |
| 935 | Biomecânica do ombro e cotovelo: resumo novo (campbell15-biomecanica-ombro-cotovelo, 61 KB, Campbell 15 cap. 13 com Rockwood, Green e HEBERT); 23 miniaulas: imagem da mão e punho (16, com as figuras descritas e a dissertativa de SOONG), artroscopia do joelho (5) e LCA (2). |
| 936 | Trauma pediátrico (MONTEGGIA v3, fise distal do fêmur v3 com 55 KB, joelho intra-articular v3), displasia osteofibrosa e adamantinoma (tachdjian6-displasia-fibrosa v2), cordoma (dahlin-cordoma) e infecções e artrites na criança (lw-artrites-inflamatorias-crianca); 45 miniaulas. |
| 964 | Tratamento conservador e imobilização (versão 3 do resumo de gesso e tala, 59 KB: adulto, SARMIENTO, tração e coluna) e tumores da coluna (rockwood10-tumores-coluna, 60 KB, Rockwood cap. 25 com Campbell cap. 49). |
| 965 | Deficiências longitudinais e mão torta (resumo novo, Green 7 cap. 38); instabilidade posterior e multidirecional (v3 de instabilidade do ombro); dedos menores em garra e martelo (v2 de metatarsalgia); joelho na criança e vias de acesso ao joelho (5 resumos com versão nova); 12 miniaulas (tumores da coluna, imobilização, ombro); primeiras figuras de livro da fila; segunda tentativa automática do Pages |
| 968 | Coluna cervical da criança e torcicolo (resumo novo, Tachdjian 6 cap. 8, 3 figuras); osteoblastoma (v2 de osteoma osteoide); biomecânica da coluna (v3 de anatomia da coluna); tendinopatias do aparelho extensor e fratura da patela (v2 de patela e mecanismo extensor); artroplastia unicompartimental (v2 de gonartrose e osteotomias); 27 miniaulas com figuras (deficiências longitudinais, joelho na criança, vias do joelho, dedos menores) |
| 973 | Tumores da mão (resumo novo, Green 7 caps. 59 e 58, 49 questões) e displasia do quadril no adulto (resumo novo, The Adult Hip cap. 71); versões novas para discrepância de membros, raquitismo, osteocondroses do pé, sindesmose, fibroma condromixoide, espondiloartrites e artrite reumatoide, doenças autoinflamatórias, osteonecrose da cabeça umeral e fixação externa; 40 miniaulas com figuras |
| 975 | Miscelâneas: outros temas da coluna (campbell15-outros-coluna), do joelho (campbell15-outros-joelho) e osteometabólicos (hebert-outros-osteometabolicos), resumos novos com uma seção por assunto; 7 miniaulas dos temas pequenos |
| 976 | Miscelânea do quadril (callaghan-outros-quadril, The Adult Hip cap. 26: risco perioperatório, cápsula e ligamentos, luxação pura, artrodese e outros); 45 miniaulas das miscelâneas da coluna, do joelho, osteometabólicas e do quadril, com figuras |
| 977 | Miscelâneas de conceitos básicos (rockwood10-outros-conceitos-basicos) e de trauma (rockwood10-outros-trauma), resumos novos com uma seção por assunto; 18 miniaulas da miscelânea do ombro e cotovelo, com figuras |
| 981 | Miscelânea de ortopedia pediátrica e outras deformidades do pé na criança (tachdjian6-outros-pediatria, resumo novo); outros temas do pé e tornozelo (versão nova de 3 resumos: síndromes do túnel do tarso, pé paralítico, KAPPIS); outros temas da mão (green-outros-mao-1 e green-outros-mao-2, resumos novos); 13 miniaulas de conceitos básicos com figuras. Com este PR os 284 temas da cobertura têm resumo |
| 982 | Fechamento da fila dos 284 temas: 34 miniaulas das últimas miscelâneas (25 da mão, 9 de pediatria e pé), com figuras |
| 983 | Exemplo aprovado de miniaula com figura (docs/exemplos/pe-tornozelo-0107.json) e registro do padrão no CLAUDE.md |
| 985 | Comentários curtos de resumos antigos, onda 1: 59 miniaulas refeitas com figuras (35 de malformações congênitas da mão, 24 da fise proximal da tíbia) |
| (este PR) | Comentários curtos, onda 1: 44 miniaulas refeitas com figuras (23 do exame da mão e do punho, 21 do carpo); limpeza do resto de extração "Área livre PROVA APLICADA" em 14 questões e 4 flashcards |

## Próximo

Seguir a fila (`scripts/biblioteca/fila_editorial.py`). Na sequência: displasias esqueléticas e síndromes, paralisia cerebral, escoliose idiopática e princípios de osteossíntese. Os temas mistos (outros temas de trauma, outras doenças congênitas) seguem adiados.
