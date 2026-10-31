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

## Próximo

Seguir a fila (`scripts/biblioteca/fila_editorial.py`). Na sequência: displasias esqueléticas e síndromes, paralisia cerebral, escoliose idiopática e princípios de osteossíntese. Os temas mistos (outros temas de trauma, outras doenças congênitas) seguem adiados.
