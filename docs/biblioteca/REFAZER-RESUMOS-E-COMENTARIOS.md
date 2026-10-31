# Refazer resumos e comentários curtos (prioridade máxima)

**Pedido do Tales, 30/10/2026:** "comentários estão horríveis, super curtos. Refazer sim."

Os resumos e os comentários feitos nos ciclos 3 a 20 da fila editorial ficaram muito abaixo do padrão do site. **Antes de seguir a fila, refaça tudo o que está listado aqui.** Faça um tema por vez e uma PR por tema, publicando com `bash scripts/publicar_pr.sh`.

## O padrão (não negociável)

| Item | Ficou com | Padrão |
| --- | --- | --- |
| **Resumo** | 4 a 18 KB | **no mínimo 45 KB**, o nível de `rockwood10-53-colo-femur` e `rockwood10-66-talus`; o roteiro `PILOTO-AUTOMATICO.md` sugere 60 a 90 KB, de 35 a 60 minutos de leitura |
| **Comentário** (conceito, correta e incorretas somados) | mediana de 1,7 a 2,6 mil caracteres | **no mínimo 4,5 mil**; as referências `mao-2164` e `mao-0853` têm cerca de 6 mil |

**Para medir:**
```bash
python3 scripts/biblioteca/medir_profundidade.py resumo <id>
python3 scripts/biblioteca/medir_profundidade.py faixa <tema> <primeiro-id> <último-id>
python3 scripts/biblioteca/medir_profundidade.py comentarios <id> <id> ...
```
Não publique enquanto aparecer "CURTO".

## Por que ficou curto, e o que fazer diferente

1. **Leia o capítulo inteiro** do livro, de ponta a ponta, com `scripts/livros.py ler`. Não leia só os trechos que respondem às questões oficiais. O resumo é uma aula do capítulo, não um índice das questões.
2. **Resumo:** siga a seção 6 de `docs/biblioteca/PILOTO-AUTOMATICO.md`.
   - Ordem das seções = ordem da cobrança.
   - Fundamentos que explicam o porquê: anatomia, vascularização, biomecânica, fisiopatologia.
   - Clínica, imagem, classificações completas em tabela, tratamento com indicações e técnica, complicações e resultados com os números do livro.
   - Os blocos `!questoes` ligados a todas as questões do tema.
3. **Comentário em miniaula**, no padrão da `mao-2164`:
   - uma aula independente, que ensina o mecanismo com exemplo e comparação;
   - a correta bem fundamentada;
   - **cada alternativa errada com um parágrafo próprio e de verdade**: o que ela afirma, onde ela seria verdadeira e por que confunde;
   - variar o estilo de um comentário para outro, sem modelo engessado;
   - fecho "Por que esta questão foi criada" só nos simulados, e "O que a banca quis testar" nas oficiais.
4. **Preserve** os gabaritos, os `alerta` e os ids das questões. Reescreva o texto por cima, com `scripts/aplicar_comentarios.py`, que substitui o comentário.
5. **Confira de novo a letra da correta contra o gabarito do acervo** antes de aplicar, como no método do guia.

## O que refazer, tema por tema

Os rascunhos atuais de cada ciclo estão em `OrtoQuestoes-Biblioteca/lotes/<pasta>/`, nos arquivos `lote_a.py` e `oficiais*.py`. Use-os só como ponto de partida e reescreva.

### Ordem sugerida: Campbell primeiro, porque foi o que ficou pior

| Ciclo | Resumo a reescrever | Livro e capítulo | Simulados (comentário) | Oficiais (comentário) |
| --- | --- | --- | --- | --- |
| 19 (**feito em 30/10/2026, PR 700**: resumo 79 KB com 7 figuras dos livros; 38 comentários de 4,5 a 6,2 mil, todo o subtema) | `campbell14-biceps-distal` (era 4 KB) | Campbell cap. 48 (Distal biceps), cap. 46 (cabeça longa, peitoral) | ombro-cotovelo-0720 a 0723 | ombro-cotovelo-0027, 0033, 0238, 0302, 0391, 0450, 0566 |
| 18 (**feito em 30/10/2026**: resumo 52 KB com 3 figuras; 40 comentários, todo o subtema, inclusive menisco, rampa, eminência e ENARE R4) | `campbell14-lca` (era 7 KB) | Campbell cap. 45, seção do LCA (PDF 2531 a 2560) | joelho-0383 a 0387 | joelho-0021, 0032, 0080, 0188, 0209, 0227, 0249, 0253 |
| 15 (**feito em 31/10/2026**: resumo 47 KB com a Tabela 27.1 do MIRELS; 61 comentários de 4,5 a 5,5 mil, todo o subtema, inclusive os simulados antigos 0370 a 0383; só as protegidas de Cirurgia da Mão ficaram de fora) | `campbell14-metastases-osseas` (era 7 KB) | Campbell cap. 27 (Metastatic carcinoma) e cap. 42 (coluna) | tumores-0393 a 0398 | tumores-0021, 0051, 0064, 0072, 0086, 0088, 0092, 0109, 0129, 0130, 0135, 0187, 0190, 0202, 0270, 0282, 0293, 0325 |
| 16 (**feito em 31/10/2026**: resumo 54 KB, lombar, torácica e cervical; 50 comentários de 4,5 a 5,5 mil, todo o subtema; coluna-0422, hematoma subdural classificado por engano no subtema, ficou pendente por não ter fonte nos livros) | `campbell14-hernia-disco` (era 8 KB) | Campbell caps. 38 e 39 | coluna-0572 a 0577 | coluna-0005, 0021, 0026, 0028, 0033, 0039, 0041, 0057, 0060, 0073, 0083, 0096, 0100, 0161, 0191, 0193, 0258, 0311 |
| 11 (**feito em 31/10/2026**: resumo 45 KB com o Netter cap. 2; 84 comentários, todo o subtema, inclusive escoliose, trauma, tuberculose e anatomia geral do SES-DF) | `campbell14-anatomia-coluna` (era 8 KB) | Campbell cap. 37, Netter cap. 2 | coluna-0564 a 0571 | coluna-0023, 0027, 0054, 0167, 0208, 0262, 0265, 0281 |
| 10 (**feito em 31/10/2026**: resumo 46 KB com o Rockwood cap. 35; 65 comentários, todo o subtema; 22 com alerta onde os livros não trazem o dado) | `campbell14-instabilidade-ombro` (era 10 KB) | Campbell cap. 47 (ombro), cap. 52 (artroscopia) | ombro-cotovelo-0712 a 0719 | ombro-cotovelo-0010, 0020, 0026, 0028, 0069, 0076, 0244, 0295, 0330, 0331, 0347, 0350, 0354, 0360, 0392 |
| 20 (**feito em 31/10/2026**: resumo 52 KB com os vizinhos dos caps. 25 a 28 e 42; 45 comentários e as 3 originais de duplicatas; a mao-0459, original da 0266, ficou de fora por ser prova protegida do Einstein) | `campbell14-estadiamento-biopsia` (era 13 KB) | Campbell cap. 24 | tumores-0399 a 0406 | as 28 oficiais da PR 687 (lista em `lotes/campbell-2021/09-estadiamento/oficiais_*.py`) |
| 8 (**parte 1 feita em 31/10/2026**: resumo 45 KB e os 35 comentários ligados a ele; **parte 2 feita em 31/10/2026**: resumo novo `callaghan-polietileno-ceramica` (66 KB, Callaghan) e 37 comentários; **parte 3 feita em 31/10/2026**: resumo novo `callaghan-metais-cimento-tribologia` (67 KB) e 41 comentários; faltam cerca de 125 questões, por blocos do Callaghan: desgaste clínico e biologia, história, acessos e biomecânica, complicações e revisão) | `campbell14-ath-biomecanica-componentes` (era 16 KB) | Campbell cap. 3 (PDF 197 a 369) | quadril-0723 a 0732 | quadril-0003, 0009, 0029, 0032, 0038, 0054, 0055, 0056, 0057, 0059, 0062, 0074, 0079, 0116, 0128, 0129, 0151, 0163, 0174, 0205, 0208, 0221, 0330 |
| 6 (**feito em 31/10/2026**: resumo 45 KB; 61 comentários, todo o subtema, e as originais trauma-0270 e trauma-0329) | `campbell14-omartrose-artroplastia` (era 12 KB) | Campbell caps. 12 e 13 | ombro-cotovelo-0704 a 0711 | as 18 da PR 670 (`lotes/campbell-2021/02-omartrose/oficiais.py`) |
| 3 | `campbell14-manguito-rotador` (18 KB) | Campbell cap. 46 | ombro-cotovelo-0686 a 0695 | as 16 das PRs 660 e 661 (`lotes/campbell-2021/01-manguito/`) |

### Depois: Tachdjian, Green e Netter

| Ciclo | Resumo a reescrever | Livro e capítulo | Simulados | Oficiais |
| --- | --- | --- | --- | --- |
| 17 | `tachdjian6-osteomielite` (8 KB) | Tachdjian cap. 23 | conceitos-basicos-0416 a 0420 | conceitos-basicos-0002, 0015, 0053, 0063, 0079, 0187, 0226, 0229, 0254 |
| 13 | `tachdjian6-ddq` (9 KB) | Tachdjian cap. 13 (PDF 499 a 611) | pediatria-1419 a 1426 | pediatria-0005, 0012, 0024, 0028, 0037, 0072, 0075, 0080, 0093, 0114, 0133, 0134, 0176, 0195, 0272, 0293, 0297, 0351, 0352, 0417, 0425, 0450, 0456, 0483 |
| 14 | `green8-tendoes-flexores` (7 KB) | Green cap. 6 | mao-2592 a 2597 | mao-0019, 0079, 0091, 0092, 0230, 0231, 0320, 0522, 0572, 0591 |
| 12 | `netter-anatomia-pe-tornozelo` (9 KB) | Netter caps. 9 e 10, Hoppenfeld | pe-tornozelo-0425 a 0430 | pe-tornozelo-0006, 0023, 0062, 0068, 0116, 0120, 0122, 0124, 0183, 0184, 0187, 0188, 0233, 0283 |
| 9 | `green8-malformacoes-congenitas` (15 KB) | Green caps. 35 a 38 | mao-2582 a 2591 | mao-0007, 0020, 0024, 0038, 0047, 0061, 0073, 0075, 0083, 0157, 0180, 0249, 0307, 0339, 0424, 0439, 0489, 0516, 0524, 0562 |
| 7 | `netter-anatomia-quadril-coxa` (16 KB) | Netter caps. 7 e 8 | quadril-0715 a 0722 | quadril-0007, 0014, 0017, 0030, 0047, 0067, 0070, 0071, 0083, 0087, 0131, 0132, 0133, 0135, 0138, 0141, 0161, 0189, 0190, 0193 |
| 5 | `green8-neuropatias-compressao` (15 KB) | Green cap. 26 | mao-2574 a 2581 | as 17 das PRs 666 a 668 (`lotes/mao-gerais/05-neuropatia-ulnar/`) |
| 4 | `netter-anatomia-ombro-braco` (12 KB) | Netter caps. 3 e 4 | ombro-cotovelo-0696 a 0703 | as 12 da PR 663 (`lotes/netter/02-anatomia-ombro/`) |
| 2 | `tachdjian6-deficiencias-membros` (15 KB) | Tachdjian cap. 21 | pediatria-1411 a 1418 | as 12 das PRs 657 e 658 |

Os ciclos 1 e 2A (`netter-anatomia-mao-punho-antebraco`, 21 KB, e `tachdjian6-alinhamento-torcoes-coxa-vara`, 27 KB) também estão abaixo dos 45 KB. Confira-os com `medir_profundidade.py` e refaça no fim.

## Ferramentas criadas no MacBook (30/10/2026)
- `scripts/biblioteca/dossie_tema.py "Subtema" --livro X --paginas A-B`: engenharia reversa (todas as questões do subtema e páginas do livro).
- `scripts/biblioteca/lote_comentarios.py LOTE.py SAIDA.json`: converte o lote escrito em Python, confere o gabarito e recusa comentário abaixo de 4,5 mil.
- `scripts/biblioteca/trava_profundidade.py`: roda no `pos_aplicar.sh` e no `publicar_pr.sh`; não deixa publicar resumo < 45 KB nem comentário < 4,5 mil.
- Figuras dos livros nos resumos: `!figura 48.47 imagem=ombro-cotovelo/arquivo.jpeg` (recorte com `scripts/figuras_livro.py`).
- Refaça o subtema inteiro (todas as oficiais do dossiê), não só a lista desta tabela: no bíceps eram 7 na lista e 33 no subtema.

## Registro
- Ao terminar cada tema, marque aqui com "feito", o número da PR e o tamanho final.
- Atualize também o `CHECKPOINT-GERAL.md`.
- Só volte à fila editorial (`FILA-EDITORIAL.md`) quando esta lista estiver toda feita.
