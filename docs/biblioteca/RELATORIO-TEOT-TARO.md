# Relatório da refação pelos temas que mais caem no TEOT e no TARO

Pedido do Tales (31/10/2026): foco nas questões do TEOT e do TARO, até 100% dos temas que mais caem, com relatório.
Fila e placar: `python3 scripts/biblioteca/fila_teot_taro.py` (`--resumo`, `--proximo`). Roteiro de trabalho:
[MEGA-PROMPT-TEOT-TARO.md](../prompts/MEGA-PROMPT-TEOT-TARO.md).

## Placar

| Data | Temas feitos (15 ou mais questões TEOT/TARO) | Questões TEOT/TARO refeitas |
| --- | --- | --- |
| 31/10/2026 | 4 de 88 | 313 de 2.291 |

## Entregas

| Data | PR | Subtema | Resumo | Comentários | Alertas e observações |
| --- | --- | --- | --- | --- | --- |
| 31/10/2026 | 719 | Outras malformações congênitas (mão) | `green8-malformacoes-congenitas`, 15 para 61 KB, 4 figuras do Green 7 e 12 tabelas | 54 (44 de TARO, TEOT, TEPOP, SBOT-SP, CET-PR e Ortopedia; 10 simulados), de 0,9 a 2,8 mil caracteres | gabarito contra o livro em mao-0020, mao-0025 e mao-0250; faltam 6 questões TARO do subtema que o dossiê não listou (mao-0145, 0161, 0332, 0333, 0510, 0511) |

## Pendências e lacunas

- Questões dos subtemas já refeitos que o dossiê não listou (o `fila_teot_taro.py` mostra todas).
- Tabelas cruas no `rockwood10-65-tornozelo` e no `rockwoodcriancas9-17-fise-distal-umero`: converter junto com a revalidação dos 57 comentários que dependem deles.
- coluna-0422 sem fonte nos livros locais.
- Depois da fila: simulados do Fellowship do quadril (bloco 5 do Callaghan) e os simulados antigos de anatomia do quadril (quadril-0645 a 0708).
