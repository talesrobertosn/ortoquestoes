# Biblioteca de Resumos: lançamento no Instagram (16/10/2026)

Pedido do Tales: explicar por completo a nova página `#/resumos`, com telas reais do site editadas
(aparelhos, recortes ampliados e anotações) para ler bem no celular. Três stories e um carrossel de feed.

**Estilo:** visual do modelo aprovado **Treine grátis** (verde-noite, dourado, Jakarta e Inter, MacBook e
iPhone em CSS com telas reais), com duas peças novas: a **lupa** (recorte ampliado de uma tela real, com
moldura dourada) e os **pinos numerados** que ligam cada parte do cartão à explicação ao lado. O Créditos
finais foi usado em 16/10, por isso ficou de fora. Último Treine grátis: 12/10 (intervalo de 2 dias ok).
Ainda não registrado em `estilos/historico.json` (registre `treine-gratis` no dia em que publicar).

Nenhuma questão é publicada como post: os cartões mostrados são do resumo do colo do fêmur (Rockwood 10,
cap. 53), com prova e ano exatamente como aparecem na tela (TEOT 2024, via de Hardinge; ENARE R4 Ortopedia
2025, alerta do Garden II). Sem preço, sem total do acervo, sem emoji, sem menção a IA.

## Arquivos

| Arquivo | O que é |
|---|---|
| `post.html` | Todas as peças: `story-1..3` (1080×1920) e `feed-1..7` (1080×1350) |
| `capturar.mjs` | Sobe o site (vite) com o Supabase falso de `fixtures/e2e_biblioteca.mjs` (conta assinante de exemplo) e grava as telas em `telas/` |
| `gerar.mjs` | Transforma cada `<section id>` em `png/<id>.png` |
| `telas/` | Capturas reais (fora do git, como `marketing/instagram/telas/`); refaça com `capturar.mjs` |
| `png/` | As imagens finais |

```
node marketing/instagram/resumos-biblioteca/capturar.mjs   # telas reais (uns 2 minutos)
node marketing/instagram/resumos-biblioteca/gerar.mjs      # PNGs em png/ (ou: gerar.mjs story / gerar.mjs feed-3)
```

## Ordem de publicação

1. **Feed (7h às 8h):** carrossel `feed-1` a `feed-7`, com a legenda abaixo.
2. **Stories (12h ou 18h às 19h):** `story-1`, `story-2`, `story-3`, nessa ordem.
   - `story-1` e `story-2`: sem figurinha nenhuma.
   - `story-3` é o story de propaganda: a **figurinha de link** vai no espaço vazio entre a frase
     "Abra a Biblioteca pelo link aqui embaixo" e o "ortoquestoes.com.br" (y ≈ 1640 a 1760).
     Texto da figurinha: **Leia grátis**. Link (abre direto na estante, sem precisar de conta):

```
https://ortoquestoes.com.br/?utm_source=instagram&utm_medium=stories&utm_campaign=biblioteca-resumos#/resumos
```

## O que cada imagem mostra

| PNG | Conteúdo |
|---|---|
| `story-1` | "O Rockwood na ordem em que a prova cobra." MacBook com a estante e iPhone no resumo (cartão "Já caiu: TEOT 2024"); quatro cartões: já caiu ano a ano, como caiu e a armadilha, leitor de e-book, abertos para todos e novos toda semana |
| `story-2` | "Primeiro o que já caiu. Depois o texto." Cartão real ampliado (Hardinge, TEOT 2024) com pinos 1 a 4: prova e ano com o conceito, treino nos OrtoQuestões Simulados, como caiu, a armadilha; faixa do alerta quando o gabarito diverge do livro |
| `story-3` | "Leia como num e-book." MacBook com o painel Aparência (sépia), iPhone em modo páginas e tema escuro, lupa do menu de seleção (5 cores, Nota, Copiar, Questões); recorte do cronograma "Antes das questões, leia o resumo"; botão "Leia grátis" e espaço da figurinha |
| `feed-1` | Capa: "Resumos que ensinam pelo que cai." Leitor com destaques no MacBook e iPhone; "Abertos para todos" e "Novos toda semana" |
| `feed-2` | "Engenharia reversa." Como o resumo é escrito; lupa do radar da seção Classificações ("Cobrança confirmada · 5 questões") e legenda dos quatro rótulos do radar |
| `feed-3` | "Caiu assim no TEOT 2024." Cartão ampliado e anotado (1 a 4) e a faixa "Caiu em várias provas? O cartão lista todas" |
| `feed-4` | "O que caiu e o que pode cair." Cartão do alerta (ENARE R4 Ortopedia 2025, livro x gabarito) e cartão "Treine este ponto" (boa chance de aparecer), com a explicação dos OrtoQuestões Simulados |
| `feed-5` | "Um e-book feito para estudar." Leitor com lupas do tema (claro, sépia, escuro) e do menu de seleção; seis recursos |
| `feed-6` | "Antes das questões, leia o resumo." Cronograma de demonstração com lupas do aviso do dia e do "Combina com o tema de hoje" |
| `feed-7` | "Só os temas que mais caem." Os seis capítulos já publicados, "Abertos para todos" e o site |

## Legenda do feed (copiar)

```
Chegou a Biblioteca de Resumos do Orto Questões.

Não é um resumo qualquer. Antes de escrever, levantamos as questões de prova sobre o capítulo e fizemos a engenharia reversa: o resumo segue a ordem do que mais cai, e no meio do texto você vê qual questão cobrou aquele ponto, de que prova e de que ano, como a banca perguntou e qual era a armadilha. Quando o gabarito oficial diverge do livro, um alerta explica as duas posições.

O leitor é um e-book de verdade: destaques em cores, notas salvas na sua conta, tema claro, sépia ou escuro, tamanho da letra, modo páginas e busca no capítulo.

Começamos pelo Rockwood and Green, só com os temas que mais caem no TEOT, e saem resumos novos toda semana. No cronograma, o resumo que combina com o tema do dia aparece antes das questões: leia primeiro, depois treine com as provas e com os OrtoQuestões Simulados.

Os resumos são abertos para todos. O caminho está no nosso perfil, @ortoquestoes.

#ortopedia #residenciamedica #teot #taro #rockwood
```

## Textos curtos para os stories (se quiser escrever por cima)

- `story-1`: sem texto extra (a imagem já explica).
- `story-2`: sem texto extra.
- `story-3`: figurinha de link "Leia grátis" no espaço livre.

## Conferência

- [x] Telas reais do site (conta de exemplo, Supabase falso); "Tela ilustrativa" em todas as peças com aparelho.
- [x] Prova e ano tirados da tela (TEOT 2024, TEOT 2023, SBOT-SP, ENARE R4 Ortopedia 2025); nada inventado.
- [x] Sem total do acervo, sem preço, sem emoji, sem IA, sem nome de curso preparatório, sem desenho de anatomia.
- [x] Stories: conteúdo importante entre y=250 e y≈1590; só o `story-3` tem espaço para figurinha.
- [x] Legenda com 5 hashtags, sem link e sem endereço do site.
