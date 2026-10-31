# Fluxo mestre: os 284 temas, sem perder o ritmo nem o padrão

Tales, 31/10/2026: "faça um grande brainstorm de como fazer tudo o que você deve fazer, o fluxograma inteiro de trabalho, organizado, e principalmente sem perder o ritmo, sem perder o padrão, sem ficar preguiçoso. Parece que você começa bem e depois decai."

Este documento junta, num lugar só, o que está espalhado em [PILOTO-AUTOMATICO.md](PILOTO-AUTOMATICO.md), [CAPITULO-RESUMO-E-QUESTOES.md](CAPITULO-RESUMO-E-QUESTOES.md), [REFAZER-RESUMOS-E-COMENTARIOS.md](REFAZER-RESUMOS-E-COMENTARIOS.md), [../comentarios-resumos/FLUXO.md](../comentarios-resumos/FLUXO.md) e [../padrao-editorial-comentarios.md](../padrao-editorial-comentarios.md), e acrescenta o que faltava: portões que não dependem de boa vontade e regras contra o cansaço.

## 1. A meta

Cada um dos **284 temas** de "Temas que mais caem" (`src/dados/incidencia.json`) recebe o **pacote completo**:

1. **Resumo** de 45 KB ou mais, no livro que as questões do tema indicam;
2. **Comentário em miniaula** de todas as questões do tema, com o **Campbell's Operative Orthopaedics, 15ª ed. (2026)** como fonte preferida (completar com o livro especializado quando o Campbell 15 não trouxer o ponto);
3. **OrtoQuestões Simulados** nas lacunas, escritos no estilo da banca real;
4. **Ligação** resumo e questões (convite "Leia o resumo" e `!questoes`), figuras do livro onde ajudam;
5. **Página de SEO** do resumo (eventualmente; os resumos já são abertos em `/resumos/<id>/`);
6. **Relatório** com print e **PR mesclada**.

Placar de cobertura: `~/OrtoQuestoes-Biblioteca/COBERTURA-284-TEMAS.md` (OK, AMPLIAR, CRIAR). Em 31/10/2026: 68 OK, 21 AMPLIAR, 195 CRIAR.

## 2. A ordem da fila

1. Terminar a fila TEOT/TARO (`python3 scripts/biblioteca/fila_teot_taro.py --proximo`), que hoje está no Rockwood and Wilkins' Fractures in Children (cap. 28 joelho, cap. 29 tíbia).
2. Depois, os 284 do mais cobrado para o menos cobrado, pela tabela de cobertura: primeiro os **AMPLIAR** de temas grandes (anatomia da mão, genuvaro, manguito, anatomia do ombro, neuropatia ulnar, anatomia do quadril, DDQ, anatomia do pé, flexores, osteomielite), depois os **CRIAR** na ordem do ranking.
3. Um tema genérico ("Outras fraturas na criança", "Outros temas de trauma") se fecha pelos capítulos que o compõem, não por um resumo genérico.

## 3. O ciclo de um tema (uma PR)

Cada tema passa pelas mesmas dez etapas, sempre na mesma ordem. Nenhuma etapa é pulada; se não couber na sessão, a PR fica menor (menos questões), nunca mais rasa.

| Etapa | O que fazer | Saída | Portão (não avança sem) |
| --- | --- | --- | --- |
| A. Dossiê | `fila_teot_taro.py --ligacao` ou `dossie_tema.py`; listar **todas** as questões do tema (oficiais, simulados, outras áreas) e os comentários com `baseResumo` que citam o resumo | Lista de questões com prova, ano, gabarito, protegida ou não | Lista conferida contra o `baseResumo` (mexer num resumo invalida os comentários que o citam) |
| B. Livro | Ver que livro as questões citam; localizar o capítulo no `campbell15` e no livro especializado (`scripts/livros.py capitulos / buscar / ler`) | Capítulo extraído em `lotes/<livro>/capNN/` | Livro na pasta; nunca escrever de memória |
| C. Leitura inteira | Ler o capítulo **inteiro** em janelas (30 a 40 KB por vez), anotando fatos, números, figuras e tabelas | Ficha de fatos com a seção de cada um | Nenhuma seção do capítulo sem ler; ler antes de escrever, não durante |
| D. Mapa de cobrança | `MAPA-COBRANCA.md`: o que cada prova cobrou, em que formato, e as lacunas | Mapa com lacunas reais | Cada lacuna vem do livro, não da imaginação |
| E. Engenharia reversa | Ler as oficiais do tema e anotar o molde: tamanho do enunciado, abertura, número de alternativas, tipo de distrator, pegadinhas | Molde da banca escrito no topo do `lote_proj.py` | Molde escrito antes da primeira questão |
| F. Simulados | Escrever no molde da banca (ver seção 5) | `lote_proj.py` aplicado com `aplicar_lote.py` | `checar_simulados.py` verde (seção 6) |
| G. Resumo | Escrever a partir da ficha de fatos, seção por seção do capítulo, com `!tabela`, `!figura` e `!questoes` | Resumo de 45 KB ou mais | `gerar.mjs` verde, `trava_profundidade.py` verde, sem seção-enchimento (seção 7) |
| H. Comentários | Todas as questões do tema, Campbell 15 primeiro, miniaula sem molde | `loteA.py` (oficiais) e `loteB.py` (simulados) aplicados | `lote_comentarios.py` sem CURTO, `checar_comentarios.py` verde |
| I. Conferência | `pos_aplicar.sh`, `npm test`, print de uma questão, leitura em voz alta de 3 comentários sorteados | Print em `/private/tmp/claude-501/telas` | Testes verdes e os 3 comentários aprovados na releitura |
| J. Publicação | Relatórios (TEOT-TARO, EXECUCAO), checkpoint, merge da base, `publicar_pr.sh`, enviar o print | PR mesclada | MESCLADO no fim do script |

Questões protegidas de Cirurgia da Mão (SBCM, SIMÃO, ENARE Cirurgia da Mão, USP-SP, UFG, PUC-SP, INTO, FMRP-USP, IAUPE, Einstein, UERJ): nunca reescrever; se o resumo mudar, tirar só o `baseResumo` delas (ou só a fonte daquele resumo).

## 4. O padrão do resumo

- Uma seção por seção real do capítulo, na ordem em que a prova cobra; nenhuma seção existe só para somar caracteres.
- `radar=confirmado` só com questão de prova real como `central`; o resto é `fundamento`, `clinico` ou `oportunidade`.
- Fatos com número e com a seção do livro; nada sem fonte; lacuna do livro principal completada por outro livro, citado no texto e no `fonte:` do cabeçalho.
- Tabelas obrigatórias onde há classificação, limites ou condutas; figuras recortadas do livro (nunca SVG) quando a classificação é visual.
- Fechamento com "Na prova" e uma revisão rápida; casos clínicos só quando ensinam a decisão, não para encher.
- Livro sempre pelo nome completo.

## 5. O padrão dos simulados (estilo da prova)

1. **Engenharia reversa primeiro** (etapa E). A questão nova tem que parecer saída da mesma prova.
2. **Enunciado curto e direto**, como a banca abre ("Na fratura de TILLAUX, o fragmento que sofre avulsão é"); sem "segundo o capítulo", sem "segundo o livro".
3. **Alternativas curtas, paralelas e do mesmo tipo** (quatro direções, quatro números, quatro epônimos, quatro condutas), com tamanho parecido; 4 no TEOT e no TARO, 5 no ENARE, Certo ou Errado no estilo do TARO antigo.
4. **Distratores plausíveis**: o valor vizinho, a estrutura ao lado, o mecanismo invertido, a pegadinha clássica do tema. Nada de "sempre", "nunca", "dispensa", "qualquer" para facilitar a eliminação.
5. **A correta não se denuncia**: nunca a mais longa, nunca a única que explica, nunca a única com número.
6. **Um fato por questão.** Nada de alternativa-resumo com três fatos.
7. Gabarito distribuído entre as letras; caso clínico só quando a banca do tema usa caso clínico.
8. O comentário do simulado explica "Por que esta questão foi criada"; nas oficiais, não.

## 6. Portões automáticos (não dependem de disposição)

Já existem: `lote_comentarios.py` (recusa comentário curto, avisa molde repetido), `trava_profundidade.py` (resumo abaixo de 45 KB), `gerar.mjs` (radar sem questão real, blocos), `npm test` (proveniência, letras, índices), `publicar_pr.sh` (só mescla com checks verdes).

A construir (próxima PR de ferramentas):

- **`scripts/simulados/checar_simulados.py`**, rodado dentro de `aplicar_lote.py --conferir`, que recusa:
  - correta 30% mais longa que a média das erradas, ou a mais longa de todas;
  - enunciado com "segundo o", "conforme o capítulo", "de acordo com o livro";
  - alternativa com "sempre", "nunca", "qualquer", "dispensa", "obrigatoriamente" (só aviso, para revisão);
  - alternativas de tamanhos muito desiguais (desvio grande);
  - lote com o mesmo gabarito em mais da metade das questões.
- **`scripts/biblioteca/checar_comentarios.py`**, rodado dentro de `lote_comentarios.py`, que recusa:
  - comentário de oficial com "Por que esta questão foi criada";
  - parágrafo idêntico (ou quase) em dois comentários do mesmo lote;
  - comentário sem citação de livro em `referencias`;
  - números no comentário que não aparecem no resumo nem no texto do capítulo (aviso, para conferir a fonte).
- **`scripts/biblioteca/checar_resumo.py`**: sinaliza seções genéricas repetidas entre resumos ("Perguntas que a banca faz", "Três casos") quando passam de uma fração do texto, para o resumo crescer pelo conteúdo do capítulo e não por moldura.

## 7. Por que o trabalho decai, e o remédio de cada causa

Diagnóstico honesto do que aconteceu em 31/10/2026: os primeiros capítulos saíram com leitura inteira e simulados cuidados; nos últimos, a leitura passou a ser por palavras-chave, os resumos chegaram a 45 KB com seções de moldura (perguntas, tempos, casos), os simulados ficaram com a correta longa e distratores fracos, e algumas frases sem fonte precisaram ser apagadas depois.

| Causa | Sinal | Remédio |
| --- | --- | --- |
| Contexto cheio depois de muitos capítulos na mesma sessão | Leitura por palavra-chave, respostas mais curtas | Um capítulo grande por vez; checkpoint ao fim de cada PR; recomeçar a sessão limpa a cada 3 ou 4 PRs, lendo só o checkpoint e este documento |
| Pressa para fechar o número (45 KB, quantidade de questões) | Seções de moldura, frases genéricas | O tamanho vem do capítulo: se o resumo não chega a 45 KB, falta ler, não falta inventar seção |
| Escrever antes de ler | Fatos sem fonte, correções depois | Etapa C fechada antes da G; a ficha de fatos é a única fonte do resumo e dos comentários |
| Simulado escrito sem olhar a prova | Correta longa, distrator absurdo | Etapa E obrigatória e `checar_simulados.py` |
| Comentários em série | Mesma abertura e mesmo fecho | Escrever 4 a 6 por vez, variando a entrada (caso, anatomia, armadilha, número), e reler 3 sorteados na etapa I |
| Cansaço de ferramenta (pular `--conferir`, pular print) | Erros que só aparecem no CI | O ciclo é sempre o mesmo, inclusive no décimo capítulo; o roteiro da seção 3 é seguido em ordem |

Autoauditoria a cada 3 PRs: sortear 5 questões publicadas (2 oficiais, 3 simulados) e 1 seção de resumo; comparar com a primeira PR do dia. Se caiu, a próxima PR é de revisão daquilo antes de seguir a fila.

## 8. Ritmo

- **Unidade de trabalho**: um capítulo ou tema por PR, com o pacote completo. Capítulo enorme vira duas PRs (resumo e oficiais; depois simulados e o resto), nunca uma PR rasa.
- **Não parar entre PRs**: publicar não encerra o turno; a próxima entrada da fila começa em seguida, salvo quando o Tales manda parar.
- **Relatório a cada PR**: o que foi feito, o que falta, o próximo passo e um print de questão comentada.
- **Checkpoint**: um bloco "ESTADO" no topo de `~/OrtoQuestoes-Biblioteca/CHECKPOINT-GERAL.md` ao fim de cada PR e antes de qualquer pausa, com branch, o que foi lido e o que falta.

## 9. Checklist de saída de cada PR

- [ ] Todas as questões do tema comentadas (oficiais e simulados), protegidas só desvinculadas
- [ ] Simulados novos no molde da banca, `checar_simulados.py` verde
- [ ] Resumo de 45 KB ou mais, seção por seção do capítulo, sem moldura de enchimento
- [ ] Gabaritos oficiais preservados; divergências no alerta
- [ ] Campbell 15 como fonte dos comentários quando cobre o tema; livros pelo nome completo
- [ ] Figuras recortadas do livro conferidas na imagem
- [ ] `pos_aplicar.sh` e `npm test` verdes
- [ ] 3 comentários relidos em voz alta
- [ ] Relatórios e checkpoint atualizados; PR mesclada; print enviado
