# Atlas unificado: as páginas fora das cenas (01/11/2026)

Direção do Tales em 01/11/2026: "centenas de identidades visuais causam agonia visual; as paletas precisam seguir a
página inicial". Metáfora: **atlas de estudo**, com papel claro para ler, verdete para agir, grafite para compreender e
ouro para celebrar. A arte HD-2D continua dando atmosfera dentro da moldura dela; o que muda é a camada de interface em
volta, que passa a ser a mesma em todas as páginas.

> **Decisão em uma frase:** cenas diferentes, um só mundo; fora da pintura, toda página usa as mesmas peças de Treinar.

## Peças comuns (base.css, seção "Atlas"; tokens em tokens.css)

| Peça | Classe | Quando usar |
|---|---|---|
| Cabeçalho de página | `.pagina-cabeca`, `__trilha`, `__frase` | Páginas sem cena no topo (Login, Treinar). Trilha em maiúsculas, título Plus Jakarta em `--titulo-pagina`. |
| Folha | `.folha` | Formulário, painel de ação, lista longa. Branco, borda fina, raio 16, `--sombra-folha`. Um objeto por folha. |
| Lista plana | `.lista-atlas` | Linhas separadas por traço fino, sem cartão por item (Ranking, status da Conta, passos). |
| Seletor em trilho | `.seletor` | Período, abas Entrar/Criar, Estante/Lista. A opção escolhida fica branca com contorno verdete (no escuro, véu verdete). |
| Busca | `.busca-atlas` | Campo com lupa, 48 px, foco verdete. |
| Número de passo | `.numero-passo` | Círculo verdete-véu com o número em Jersey 10 (o `.px-numero` dourado fica na temporada pixel). |
| Foco de campo | `.entrada:focus` | Borda verdete com `--anel-foco` em todo o site. |

Regras que vieram junto: raios 10 (controle) e 16 (folha), 20 só na moldura da cena (`--mundo-raio`); sombra pixel dura
só no mundo ilustrado; texto sobre verdete sempre `--sobre-destaque` (nunca `#fff`, que some no tema escuro, onde o
verdete é claro); no máximo uma área cheia de verdete por tela; ouro só na métrica hero, no plano de quem assina e nas
conquistas.

## O que mudou em cada página

- **Login (`#/entrar`):** saiu o quadro escuro do topo. Cabeçalho claro de atlas com a frase sorteada; o mascote de
  jaleco mora num quadrinho verde-noite ao lado (o único escuro da página), nunca sobre os campos. Formulário numa
  folha, abas no seletor comum, campos com o foco comum, botão verdete sem sombra de degrau. No celular de 390 px, a
  folha do formulário começa a ~210 px do topo (antes, ~305).
- **Minha conta:** o topo virou crachá + nome + **uma** próxima ação (ver sincronização, termos novos, completar perfil
  ou continuar estudando, nessa prioridade) e a situação em três linhas (plano, sincronização, perfil), cada uma com a
  ação dela. Saíram as três métricas em caixas e os quatro atalhos que repetiam o Menu; ficou uma linha com
  respondidas, acerto, revisões e "Ver desempenho". A seção aberta na lista usa a seleção de Treinar (véu e filete).
  Lógica de perfil, sincronização, segurança e backup intocada.
- **Desempenho:** o observatório continua como cena; a bancada de latão com rebites, os selos marrons dos capítulos, o
  aro de latão das lentes e a "mesa da lamparina" de "O que fazer agora" passaram para o papel. O acerto geral é a
  única métrica em ouro. "Montar uma sessão" é o único botão cheio; os passos têm ação secundária clara.
- **Flashcards:** a cena do Arquivo fica menor no celular (a frase do chão sai; o "Como funciona" diz o mesmo) e
  "Estudar flashcards" sobe para a primeira tela e vira o cristal (era dourado); folhas com raio 16 e a sombra comum; passos com `.numero-passo`.
- **Ranking:** abaixo do Salão dos Cem, a classificação virou lista plana com linhas (sem cartão por pessoa), sua linha
  com véu e filete verdete, posições em grafite (o metal fica no pódio), marcos "Top 10/Top 50" em régua cinza; abas e
  período no seletor comum (o período tinha `color: #fff` sobre verdete, ilegível no escuro).
- **Biblioteca:** a interface já era porcelana e verdete; Estante/Lista foi para o seletor comum e os botões verdete
  passaram a usar `--sobre-destaque`.

## Botão principal: cristal ou verdete

A direção pedia botão principal verdete em todo o site; a versão aprovada em 01/11 (#779/#780, "Pode subir") usa o
**cristal azul** da página inicial para começar em Treinar e no Menu. Decisão de 01/11/2026 (Tales deu autonomia às
sessões; regra valendo para todas):

- **Cristal (`.cristal`)** só para a ação de **começar a estudar**: iniciar sessão, estudar flashcards, a ação do dia do
  cronograma e revisar agora. Nesta entrega: "Estudar flashcards" (antes dourado) e o "Continuar estudando" de Minha
  conta.
- **Verdete cheio** nas demais ações principais: entrar no login, salvar, confirmar, assinar, montar uma sessão, ver
  sincronização, completar o perfil.
- **Secundários** com o contorno verdete (como o `.jn-botao` da inicial).
- Menu e Treinar ficam como estão.

Prancha comparando as duas opções: `docs/design/ideias/2026-11-01-atlas-unificado/botao-principal.png`.

## Como conferir

- `node scripts/capturar_telas.mjs <rota> <prefixo> --com-dados [--escuro] [--estreito] [--aviso] [--sem-cracha] --pasta DIR`
  (`--aviso` abre a faixa global de exemplo; `--sem-cracha` esconde o "Complete seu perfil" das contas de teste).
- No celular, use um `--roteiro` que role a página (o print de página inteira sai com as barras fixas no meio).
- Prancha antes/depois: `docs/design/ideias/2026-11-01-atlas-unificado/`.

## Fica para depois

- Cronogramas (Ortopedia, Mão ingresso e título) com as mesmas peças; a cena da Mão compatível com a Torre do Tempo.
- O Menu como "página de papel" e a ordem proposta em `TREINAR-MESA-LEVE.md`.
- Na Biblioteca escura, uma caveira na estante da direita (cena): conferir com a sessão de sazonalidade se é resíduo
  de Halloween.
