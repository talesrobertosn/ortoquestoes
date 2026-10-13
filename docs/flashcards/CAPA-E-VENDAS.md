# Capa e página de vendas (planejado, desligado)

## Capa (página inicial)

- Componente: `src/componentes/CartaoCripta.tsx` (variante `capa`), estilo em
  `src/estilos/componentes/CartaoCripta.css`.
- Lugar: ao lado do banner **Ranking e conquistas** da página inicial; os dois ficam lado a lado no
  computador e um embaixo do outro no celular (`.inicio-par`).
- Texto: "Cripta do Residente · Desça a Cripta ou suba a Torre do Título: flashcards das provas reais
  viram combate, e cada erro volta para a sua revisão." Botão **Entrar na Cripta** (`#/flashcards`).
- Arte: o Dragão de Ossos e o herói do estágio 3, os mesmos sprites do jogo.
- Liga com `VITE_FLASHCARDS_CAPA=1`. O código do jogo só é baixado com a trava ligada (lazy).

## Página de vendas (Assinatura)

- Componente: o mesmo `CartaoCripta`, variante `venda`, logo depois de "O que a assinatura faz por
  você" e antes do cronograma.
- Mensagem: os flashcards das provas reais viram um RPG; Cripta sem fim, Torre de 100 andares,
  chefes, dragões e ranking; **grátis: 10 flashcards por dia; assinante: sem limite**.
- Liga com `VITE_FLASHCARDS_VENDA=1`, **só depois** de aplicar a migration do limite e ligar
  `VITE_FLASHCARDS_LIMITE=true` (senão a promessa do limite não vale no servidor).

## Antes de ligar (lista do Tales)

- [ ] Aprovar o nome "Cripta do Residente" e o texto dos dois cartões.
- [ ] Aplicar as migrations e ligar o limite no servidor.
- [ ] Decidir se o cartão da capa aparece para quem não tem conta (hoje a rota pede conta).
- [ ] Post de divulgação no estilo dos modelos aprovados (docs/marketing/orientacoes.md).
