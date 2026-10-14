# Interface e acessibilidade: ideias 62 e 65

14/10/2026. Bloco no [PR #250](https://github.com/talesrobertosn/ortoquestoes/pull/250), em rascunho para revisão, sem merge.

Nos Ajustes, **Leitura e conforto** oferece sem tremor da tela, alto contraste e texto maior. As preferências usam os ajustes existentes do jogo, com campos opcionais, mantendo som, volume, velocidade e compatibilidade com os ajustes antigos. Batalha, Biblioteca e Entrada recebem a aparência comum. Não há migração de contas nem alteração em progresso salvo.

- **Sem tremor:** interrompe o tremor da câmera, mantendo outros efeitos; Reduzir movimento continua sendo a opção completa. A preferência do sistema é acompanhada inclusive quando muda com o jogo aberto.
- **Alto contraste:** papel uniforme claro, texto escuro, bordas fortes e estados certo/errado legíveis, mantendo os marcadores de resultado.
- **Texto maior:** pergunta, explicação e alternativas maiores. No computador, pergunta mais larga e quatro alternativas lado a lado. O avatar decorativo do herói é compactado, mas vida, poderes e atributos permanecem acessíveis no botão Você. O ponto dos efeitos passa ao HUD visível. Textos longos podem rolar dentro da carta ou da mão, sem empurrar o botão Atacar para fora da tela.
- **Foco:** os Ajustes recebem foco ao abrir e devolvem ao botão de origem ao fechar. Tab/Shift+Tab fica no diálogo interno ativo, sem passar por controles do jogo atrás.

**Cortina de pixels:** azulejo 16×16 pintado por `scripts/cenarios/cortina.py`, com oitenta blocos que revelam a nova tela em 0,55 s. Acompanha entrada, troca Batalha/Biblioteca, cenário e telas de sala/loja/fim; não dispara em cada resposta. Não bloqueia cliques, não atrasa a navegação, não altera estado da partida e se remove ao terminar. Com movimento reduzido pelo ajuste ou pelo sistema, nem renderiza os blocos. O alto contraste e texto maior não desativam a cortina por si só.

Validação:
- `npx tsc -b`, `npm test`, build.
- Playwright em 1400×860, 390×844 e 844×390: fonte aumentada (24,6→30 px no computador; 19→23 px no celular em pé), três preferências sem perder uma ao selecionar outra, foco preso e devolvido, botão de ação dentro da tela e retorno às telas mantendo as preferências da sessão.
- Um golpe crítico real foi executado com sem tremor ligado e todos os outros movimentos ativos: nenhuma classe de tremor foi aplicada à batalha.
- Cortina aparece e se remove em modo normal; não existe em movimento reduzido e na entrada com `prefers-reduced-motion`.

Capturas: `capturas/acessibilidade-14-10/`. Nenhuma modificação em questões médicas, gabaritos, comentários, assinaturas, limites, monstros ou SQL.
