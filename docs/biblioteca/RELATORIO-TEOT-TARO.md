# Relatório da refação pelos temas que mais caem no TEOT e no TARO

Pedido do Tales (31/10/2026): foco nas questões do TEOT e do TARO, até 100% dos temas que mais caem, com relatório.
Fila e placar: `python3 scripts/biblioteca/fila_teot_taro.py` (`--resumo`, `--proximo`). Roteiro de trabalho:
[MEGA-PROMPT-TEOT-TARO.md](../prompts/MEGA-PROMPT-TEOT-TARO.md).

## Placar

| Data | Temas feitos (15 ou mais questões TEOT/TARO) | Questões TEOT/TARO refeitas |
| --- | --- | --- |
| 31/10/2026 (início) | 4 de 88 | 313 de 2.291 |
| 31/10/2026 (critério novo: questão ligada a resumo de 45 KB) | 2 de 88 | 311 de 2.291 |

## Entregas

| Data | PR | Subtema | Resumo | Simulados novos (e por quê) | Comentários | Alertas e observações |
| --- | --- | --- | --- | --- | --- | --- |
| 31/10/2026 | 719 | Outras malformações congênitas (mão) | `green8-malformacoes-congenitas`, 15 para 61 KB, 4 figuras do Green 7 e 12 tabelas | nenhum: o subtema já tinha 10 simulados do ciclo 9 | 54 (44 de TARO, TEOT, TEPOP, SBOT-SP, CET-PR e Ortopedia; 10 simulados), de 0,9 a 2,8 mil caracteres | gabarito contra o livro em mao-0020, mao-0025 e mao-0250; faltam 6 questões TARO do subtema que o dossiê não listou (mao-0145, 0161, 0332, 0333, 0510, 0511) |
| 31/10/2026 | (este PR) | Fratura da fise proximal e da tuberosidade da tíbia (parte do guarda-chuva "Outras fraturas na criança", com "Fraturas do fêmur e da perna na criança" e "Lesões fisárias") | `rockwoodcriancas10-27-fise-proximal-tibia`, 21 para 45 KB, 4 figuras (caps. 27 e 29) e 12 tabelas, com o COZEN do cap. 29 | 5 projeções (pediatria-1427 a 1431): o script dava 0, mas o mapa achou lacunas cobráveis (tratamento do COZEN, idades de MUBARAK, estágios de EHRENBORG, fratura oculta, lesão ligamentar nas III e IV) num capítulo cobrado 26 vezes | 42 (28 oficiais de TEOT, TARO, TEPOP, ENARE R4, SBOT-SP e 14 simulados), de 0,9 a 2,4 mil caracteres, 6 com figura | gabarito contra o livro em pediatria-0918 (TEOT 2025) e 0646; 6 sem gabarito com resposta provável |

## Pendências e lacunas

- Questões dos subtemas já refeitos que o dossiê não listou (o `fila_teot_taro.py` mostra todas).
- Tabelas cruas no `rockwood10-65-tornozelo` e no `rockwoodcriancas9-17-fise-distal-umero`: converter junto com a revalidação dos 57 comentários que dependem deles.
- coluna-0422 sem fonte nos livros locais.
- Depois da fila: simulados do Fellowship do quadril (bloco 5 do Callaghan) e os simulados antigos de anatomia do quadril (quadril-0645 a 0708).
