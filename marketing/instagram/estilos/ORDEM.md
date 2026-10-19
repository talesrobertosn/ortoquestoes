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

Ordem atual:

| Feed | Stories |
|---|---|
| 1. Jornal | 1. Cartaz de cinema |
| 2. Cofre de duas chaves | 2. Mecânica fina |
| 3. Tabela de Snellen | 3. Raspadinha da prova |
| 4. GPS do nervo | 4. Planta de engenharia |
| 5. Caderneta de topografia | 5. Exame de DNA |
| 6. Museu | 6. Bingo da prova |
| 7. VAR da questão | 7. Radar premium |
| 8. Laboratório de patologia | 8. Cupom fiscal (versão questão primeiro) |
| 9. Jogo de cartas | |
| 10. Embarque | |
| 11. Ache os 3 erros | |
| 12. Linhas do metrô | |
| 13. Plantão das 3h14 | |
| 14. Modelo padrão | |

Os stories de propaganda (Treine grátis, Créditos finais) ficam fora da fila: entram quando o Tales pedir, sempre **sem figurinha de link** (orientação de 19/10/2026).
