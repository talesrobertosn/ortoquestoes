# Ordem de rodízio dos estilos

Pedido do Tales em 19/10/2026: os modelos aprovados seguem **uma ordem fixa**, para não ficar repetindo nem escolhendo ao acaso. Vale para Claude, Codex e qualquer agente; substitui o sorteio de `sortear.mjs`, que fica só para montar a pasta (`sortear.mjs criar <estilo> <slug>`).

```
node marketing/instagram/estilos/ordem.mjs            # próximo estilo do feed e dos stories, hoje
node marketing/instagram/estilos/ordem.mjs 2026-10-21  # para outra data
```

Como funciona ([ordem.json](ordem.json)):

1. **Combinados primeiro:** um estilo combinado com o Tales para um dia (por exemplo, o Leilão em 20/10) passa na frente. Depois de usado, apague-o de `combinados`.
2. **Depois, a volta:** em cada fila (feed e stories), o próximo é o que vem logo depois do último usado em `historico.json`. Ao chegar ao fim da lista, volta ao começo.
3. **Intervalo:** um estilo usado há menos de 3 dias é pulado (regra dos 2 dias livres).
4. **Pedido do Tales vence a fila:** "no modelo padrão" ou um estilo citado por ele é o que vale; registre no histórico e a fila segue dali.
5. **Modelo novo aprovado:** entra na lista, logo depois do estilo com o visual mais diferente dele (claro depois de escuro, por exemplo).

Ordem atual (em 10/11/2026 entrou nos stories a **Oficina do encaixe**, logo depois da Busca, em 13/11/2026 a **Errata**, no fim da fila, e em 17/11/2026 a **Câmara escura**, também depois da Busca; ver `ordem.json`):

| Feed | Stories |
|---|---|
| 1. Jornal | 1. Cartaz de cinema |
| 2. Cofre de duas chaves | 2. Busca (aprovado em 22/10/2026) |
| 3. Busca (aprovado em 22/10/2026) | 3. Câmara escura (aprovada em 17/11/2026) |
| 4. Tabela de Snellen | 4. Oficina do encaixe (aprovado em 10/11/2026) |
| 5. GPS do nervo | 5. Mecânica fina |
| 6. Caderneta de topografia | 6. Planta de engenharia |
| 7. Museu | 7. Exame de DNA |
| 8. VAR da questão | 8. Bingo da prova |
| 9. Laboratório de patologia | 9. Leilão (usado em 21/10/2026; ainda sem modelo aprovado) |
| 10. Jogo de cartas | 10. Radar premium |
| 11. Embarque | 11. Cupom fiscal (versão questão primeiro) |
| 12. Ache os 3 erros | 12. Errata (aprovado em 13/11/2026) |
| 13. Linhas do metrô |  |
| 14. Plantão das 3h14 |  |
| 15. Modelo padrão |  |
| 16. Conversa do grupo R+ |  |

**Raspadinha da prova: retirada (Tales, 03/11/2026).** Nunca mais sugerir nem usar, nem como ideia ou variação. Ele já recusou muitas vezes.

Os **Stories com alternativas** ([guia](STORIES-COM-ALTERNATIVAS.md), aprovados em 18/11/2026) também ficam fora da fila: entram quando o Tales pedir. Os stories de propaganda (Treine grátis, Créditos finais) ficam fora da fila: entram quando o Tales pedir, sempre **sem figurinha de link** (orientação de 19/10/2026).
