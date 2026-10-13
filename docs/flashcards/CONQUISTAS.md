# Conquistas da Cripta (prontas, fora do sistema)

`src/flashcards/conquistas.ts` define 19 emblemas em 5 famílias, seguindo [docs/emblemas.md](../emblemas.md)
(difíceis desde o primeiro nível):

| Família | Níveis |
|---|---|
| Profundezas da Cripta | andar 6, 12, 21, 30, 45 |
| Torre do Título | andar 20, 40, 60, 80 e vencer o topo (100) |
| Flashcards únicos | 300, 1.000, 2.000, 3.000, 4.000 |
| Bestiário | 8 adversários diferentes vencidos, todos |
| Caçador de dragões (secretas) | Dragão de Ossos; os três dragões |

`metricasCripta(recordes, únicos, bestiário)` calcula os números com o que o jogo já guarda.

## Para ligar ao sistema do site

1. Em `src/estado/conquistas.ts`: acrescentar as famílias em `FamiliaId`/`FAMILIAS` e os emblemas em `EMBLEMAS`.
2. Em `calcularMetricas`: somar `metricasCripta(...)` (passar pelos `Extras`).
3. Trocar os recordes locais pelos do servidor (corridas validadas, [RANKING.md](RANKING.md)) para que
   ninguém ganhe emblema editando o aparelho.
4. Arte em pixel art em `public/emblemas/<id>.png` (estilo RPG medieval: portão, torre, grimório,
   dragão estilizado; nada de anatomia).
