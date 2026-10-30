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

## Próximo

Seguir a fila (`scripts/biblioteca/fila_editorial.py`). Na sequência: displasias esqueléticas e síndromes, paralisia cerebral, escoliose idiopática e princípios de osteossíntese. Os temas mistos (outros temas de trauma, outras doenças congênitas) seguem adiados.
