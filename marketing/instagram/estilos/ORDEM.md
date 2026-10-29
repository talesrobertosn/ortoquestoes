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

**Mecânica fina / Relojoaria anatômica não se usa mais** (Tales, 27/10/2026: "nunca mais usar esse tema, já foi usado tipo 8 vezes"). Saiu de `ordem.json`; não escolher nem por sorteio nem por pedido genérico de stories.

Ordem atual:

| Feed | Stories |
|---|---|
| 1. Jornal | 1. Cartaz de cinema |
| 2. Cofre de duas chaves | 2. Busca (aprovado em 22/10/2026) |
| 3. Busca (aprovado em 22/10/2026) | 3. ~~Mecânica fina~~ (fora do rodízio desde 27/10/2026) |
| 4. Tabela de Snellen | 4. Raspadinha da prova |
| 5. GPS do nervo | 5. Planta de engenharia |
| 6. Caderneta de topografia | 6. Exame de DNA |
| 7. Museu | 7. Bingo da prova |
| 8. VAR da questão | 8. Leilão (usado em 21/10/2026; ainda sem modelo aprovado) |
| 9. Laboratório de patologia | 9. Radar premium |
| 10. Jogo de cartas | 10. Cupom fiscal (versão questão primeiro) |
| 11. Embarque |  |
| 12. Ache os 3 erros |  |
| 13. Linhas do metrô |  |
| 14. Plantão das 3h14 |  |
| 15. Modelo padrão |  |
| 16. Conversa do grupo R+ |  |

Os stories de propaganda (Treine grátis, Créditos finais) ficam fora da fila: entram quando o Tales pedir, sempre **sem figurinha de link** (orientação de 19/10/2026).
