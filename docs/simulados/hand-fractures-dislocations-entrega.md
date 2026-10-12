# Entrega: Hand Fractures and Dislocations

12/10/2026. Rockwood 10ª edição, capítulo 45, lido integralmente. 25 questões novas, `mao-1694` a `mao-1718`, com oito figuras originais, sem recorte ou modificação anatômica. Referências, engenharia reversa e plano em arquivos correspondentes deste diretório.

O lote combina variações de fatos recorrentes e temas novos: instabilidade funcional da IFP, sinal do V, diferença entre luxação IFD aberta e fechada e ramo motor ulnar junto à CMC do quinto. Os comentários não mostram nomes de PDFs, folhas do recorte ou instruções de edição. Os percentuais conflitantes do capítulo não foram convertidos em regras universais.

## Presença nos filtros

Cada questão conserva `simulado: true`, `prova: null`, `ano: null` e ausência de `area`. O campo `areasAdicionais: ["cirurgia-mao"]` gera `aa: ["mao"]` no índice. O filtro compara tanto a área principal quanto a presença adicional. Não há cópia de questão: ID, histórico e comentário são únicos. TEOT/TARO e cronograma continuam recebendo o lote na ortopedia base. Provas oficiais de Cirurgia da Mão continuam fora da base.

O teste `fixtures/testar_simulados_areas.mjs` cobre os dois filtros, TEOT/TARO, contagens, seleção conjunta sem duplicação, ausência de vazamento para R4 e preservação do isolamento das provas oficiais. Outros simulados não receberam a marca adicional.

## Auditoria

| Nº | ID | Gabarito | Folha interna | Caracteres do comentário | Figura |
|---|---|---|---:|---:|---|
| 1 | mao-1694 | D | 9 | 2131 | Não |
| 2 | mao-1695 | D | 7 | 2247 | Não |
| 3 | mao-1696 | C | 10 | 1981 | mao/mao-1696-1.jpeg |
| 4 | mao-1697 | B | 18 | 2282 | Não |
| 5 | mao-1698 | B | 60 | 1846 | Não |
| 6 | mao-1699 | B | 22 | 1963 | mao/mao-1699-1.jpeg |
| 7 | mao-1700 | C | 21 | 2148 | Não |
| 8 | mao-1701 | C | 21 | 2063 | mao/mao-1701-1.jpeg |
| 9 | mao-1702 | A | 36 | 2189 | mao/mao-1702-1.jpeg |
| 10 | mao-1703 | D | 46 | 2173 | Não |
| 11 | mao-1704 | A | 40 | 2205 | mao/mao-1704-1.jpeg |
| 12 | mao-1705 | A | 54 | 2217 | Não |
| 13 | mao-1706 | B | 55 | 2150 | Não |
| 14 | mao-1707 | C | 61 | 2122 | Não |
| 15 | mao-1708 | D | 61 | 1753 | Não |
| 16 | mao-1709 | B | 63 | 1984 | Não |
| 17 | mao-1710 | D | 71 | 2124 | Não |
| 18 | mao-1711 | A | 60 | 1997 | mao/mao-1711-1.jpeg |
| 19 | mao-1712 | D | 82 | 2025 | Não |
| 20 | mao-1713 | D | 85 | 2028 | Não |
| 21 | mao-1714 | C | 82 | 2122 | Não |
| 22 | mao-1715 | C | 108 | 2022 | Não |
| 23 | mao-1716 | A | 109 | 1942 | mao/mao-1716-1.jpeg |
| 24 | mao-1717 | B | 109 | 1977 | mao/mao-1717-1.jpeg |
| 25 | mao-1718 | A | 111 | 1979 | Não |

Gabarito A6/B6/C6/D7. Comentários finais: mínimo 1.753, mediana 2.063, máximo 2.282 caracteres. A ordem numérica é crescente; nas demais questões, alternativas ordenadas por extensão. Preservados integralmente os 1.577 registros anteriores do tema e os 1.568 comentários anteriores. Todas as questões novas conservam `revisado: false` e comentários `conferido: false`; revisão editorial e checagem de fonte não são revisão médica individual.

## Verificação

- Aplicação em lotes de 8, 8 e 9 pelo pipeline de simulados, conferência de cada alternativa e das oito imagens individualmente.
- Validação do acervo sem erros, índice/avulsos regenerados, npm test e build concluídos; revisão, reinício e sincronização passaram.
- Playwright com autenticação simulada e todas as requisições Supabase interceptadas, sem respostas reais gravadas: 25 questões e 100 análises carregadas no desktop e no celular de 390 px, sem overflow horizontal.
- Tabelas de deformidades e WEISS-HASTINGS e imagens revisadas visualmente na interface. Manifesto de dimensões e hashes em `hand-fractures-dislocations-imagens.json`.
- Publicação na branch do site seguida de comparação online de questões, comentários, avulsos, imagens e metadados do índice.
