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

## Melhorias de sistema feitas no caminho

| PR | Melhoria |
| --- | --- |
| 651 | SEO: o título do índice /resumos/ passa a sair dos livros da Biblioteca; o banco de questões fala em residência. |
| 652 | O validador recusa o fecho de simulado em questão oficial. Estante com a descrição de cada livro, lombadas curtas e "Caps. 16 a 18". O leitor abre em sépia por padrão. |
| 653 | `scripts/figuras_livro.py`: localizar, gerar prévia, recortar e anexar figuras de livro aos comentários. |
| 654 | `scripts/livros.py` (leitura enxuta dos livros) e a passagem para o MacBook (`docs/prompts/CONTINUAR-NO-MACBOOK.md`, `scripts/macbook/preparar.sh`). |
| 656 | `fila_editorial.py` preserva os comentários que já citam um resumo da Biblioteca. |
| 660 | `scripts/publicar_pr.sh` só mescla com os checks verdes. |

## Próximo

Ciclo 5: Neuropatia ulnar e outras compressões (mão, provas gerais; Green cap. 26 local e Campbell cap. 77). Depois, Omartrose e artroplastia do ombro.
