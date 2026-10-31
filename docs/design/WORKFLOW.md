# Fluxo de design do Orto Questões

Vale para telas do site, componentes e materiais gráficos. Antes de começar, leia `DESIGN.md` e `PRODUCT.md`
(e, para posts, `docs/design/INSTAGRAM.md` e `docs/marketing/orientacoes.md`). As skills de cada etapa estão em
`docs/design/FERRAMENTAS.md`.

| # | Etapa | O que fazer | Ferramenta | Saída |
|---|---|---|---|---|
| 1 | Análise do contexto | Ler DESIGN.md e PRODUCT.md, a tela ou post atual e as regras do Tales; listar funções que não podem sumir | `impeccable` (`context`), leitura do código | resumo do pedido e restrições |
| 2 | Pesquisa de referências | 3 a 5 referências de ângulos diferentes; escolher uma direção dominante | `refero-design`, `ui-ux-pro-max` (`search.py`) | trava de referência e registro de decisões |
| 3 | Concepção visual | Esboço em HTML ou mockup estático; 2 a 3 opções quando a escolha muda o resultado | `frontend-design`, `canvas-design`, `theme-factory`, `arte-hd2d` | mockup em `docs/design/ideias/` ou na pasta do post |
| 4 | Implementação | Tokens de `tokens.css`, componentes existentes, nada de valor solto | `ui-styling`, `design-system` | código ou HTML do post |
| 5 | Captura de telas | Celular (390) e computador (1440), claro e escuro, horas do dia quando houver arte | `scripts/capturar_telas.mjs`, `marketing/instagram/gerar.mjs`, skill `instagram-carrossel` | PNGs |
| 6 | Crítica visual | Comparar com a referência e com DESIGN.md; listar o que destoa | `impeccable` (`critique`, `audit`), `scripts/design/comparar_visual.py` | lista de correções |
| 7 | Refinamento | Corrigir a lista inteira e capturar de novo | as mesmas | nova rodada de PNGs |
| 8 | Validação final | `npm test`, `npx tsc --noEmit -p .`, conferência dos PNGs, prints para o Tales | `scripts/design/conferir_pngs.py`, `scripts/design/testar_design.sh` | entrega e PR (publicação só com OK) |

## Comparação visual (Playwright)

- Antes e depois de uma mudança de tela: capture as duas versões com `scripts/capturar_telas.mjs` (mesma rota,
  mesma hora com `--agora`) e rode `python3 scripts/design/comparar_visual.py antes.png depois.png --saida diff.png`.
  O script mostra a porcentagem de pixels diferentes e salva a imagem com as diferenças em vermelho.
- Em refatoração que não deve mudar o visual, a diferença precisa ficar perto de 0%.

## Regras que não mudam

- Funções e nomes reais preservados; fantasia só na arte.
- Prints antes de publicar; publicar só com o OK do Tales.
- Nada de imagem gerada por IA, emoji, desenho de anatomia ou símbolo religioso.
