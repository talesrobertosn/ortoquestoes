# Objetos pixel animados (diretriz do Tales, 19/10/2026)

O Tales aprovou o livro da Biblioteca que aparece embaixo das questões ("esse negócio de imagem que abre, mexe, é bem
legal; a gente pode usar futuramente em outros pontos do site; vamos ter um foco maior em imagens").

**Regra:** sempre que uma tela tiver espaço para isso, prefira um **objeto pixel animado** à caixa só de texto. O
objeto deve ter três estados, um para parado, outro para o mouse por cima e outro para o clique. Use objetos que
representem a função, como livro, ingresso, troféu, relógio, calendário, chave, bilhete ou baú. O site já foi além
dos ícones soltos.

## A referência
- O livro está em `src/biblioteca/EstudarAssunto.tsx` e `src/estilos/componentes/BibliotecaConvite.css`, aprovado em 19/10/2026.
- Ele é desenhado só em HTML e CSS, sem imagem, a partir de uma unidade de pixel (`--u`). Todos os tamanhos são múltiplos dela.
- Contorno firme de 2 px, sombra "de degrau" e as cores da área (`--bib-area`) com o ouro da marca (`--px-ouro`).
- **Texto real dentro do objeto:** a capa traz o livro, o tema e o capítulo. Ele informa, e não é só enfeite.
- **Parado:** flutua devagar, a sombra no chão acompanha e de tempos em tempos a capa se entreabre e brilha.
- **Mouse por cima:** inclina e se levanta.
- **Clique:** em cerca de meio segundo a capa abre em 3D, as páginas viram e o brilho dourado aparece. Só depois a navegação acontece.

## O que todo objeto animado precisa ter
1. **Só `transform` e `opacity`** nas animações, para rodar liso no celular.
2. **Movimento reduzido:** com `prefers-reduced-motion`, nada se mexe e o clique navega na hora.
3. **Fora da tela, para:** use IntersectionObserver para pausar a animação de repouso.
4. **Continua sendo link de verdade:** com Ctrl, Cmd, Shift, Alt ou botão do meio, abre na hora, sem animação. O objeto pode ficar `aria-hidden` se houver um botão com texto ao lado.
5. **Leve:** o CSS do objeto vai num arquivo próprio, carregado só onde ele aparece. O teste de orçamento de CSS global (`fixtures/testar_orcamento_chunks.mjs`) não pode estourar.
6. **Funciona nos dois temas:** claro, que é o padrão, e escuro. Confira os dois nas capturas.
7. **Sem imagem gerada por IA e sem desenho de anatomia** (regra da marca). Para conteúdo médico, use a imagem real da questão.
8. **Tela limpa primeiro** (regra de 19/10): o objeto entra onde ajuda a entender ou convida a uma ação, e não para enfeitar.

## Ideias para os próximos pontos
Ficam aqui para quando o Tales pedir ou quando a tela for refeita:
- **Simulado Nacional:** um ingresso que destaca o canhoto ao se inscrever.
- **Conquistas:** um baú que abre ao ganhar o emblema.
- **Ranking:** um troféu que gira.
- **Cronograma:** uma folha de calendário que vira ao puxar o dia seguinte.
- **Caderno de erros:** um caderno que abre.
- **Flashcards:** a carta que vira.
- **Fim da sessão:** um placar que conta.

Antes de criar um objeto novo, capture parado, com o mouse por cima e quadros da animação de clique, no celular e no computador, nos temas claro e escuro, com `scripts/capturar_telas.mjs --roteiro`. Veja as imagens e só depois mande para o Tales.
