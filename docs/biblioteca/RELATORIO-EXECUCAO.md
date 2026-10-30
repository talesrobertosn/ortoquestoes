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

## Melhorias de sistema feitas no caminho

| PR | Melhoria |
| --- | --- |
| 651 | SEO: o título do índice /resumos/ passa a sair dos livros da Biblioteca; o banco de questões fala em residência. |
| 652 | O validador recusa o fecho de simulado em questão oficial. Estante com a descrição de cada livro, lombadas curtas e "Caps. 16 a 18". O leitor abre em sépia por padrão. |
| em andamento | `scripts/figuras_livro.py`: localizar, gerar prévia, recortar e anexar figuras de livro aos comentários. |

## Próximo

Ciclo 2, parte B: deficiências dos membros. Depois, Manguito rotador (posição 2 da fila).
