# Câmara escura: modelo aprovado

Tales pediu em 17/11/2026 três stories com uma temática nova a partir de uma questão com imagem, deu autonomia
total ("deixa bonito, chamativo, faz a pessoa querer entrar no site, enaltece o comentário") e aprovou o resultado
para o arsenal. Primeira entrega: `posts/2026-11-17-camara-escura-osteoma-osteoide/` (`tumores-0194`, TEOT 2024,
osteoma osteoide). Registre como `camara-escura` em `historico.json` e siga a [ordem de rodízio](ORDEM.md).

| Formato | Modelo |
|---|---|
| Stories, 3 telas de 1080×1920 | [camara-escura/modelo.html](camara-escura/modelo.html) |

Gere com `node marketing/instagram/gerar.mjs marketing/instagram/estilos/camara-escura/modelo.html`
(no Mac sem o Chromium do Playwright: `CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`).
Para um post novo, copie o `modelo.html` para a pasta do post e troque os textos e a imagem.

**A ideia:** a radiografia é um filme na sala de revelação. A pergunta é "o que este filme está revelando?", e a
resposta é a luz que acende.

1. **s1-questao (7h):** sala escura com luz vermelha de segurança ("SAFE"), grão de filme, varal com prendedores e
   a radiografia grande com a borda do filme (letras âmbar em Jersey 10). À direita: rótulo, título com o destaque
   dourado, uma dica curta que aponta onde olhar sem entregar e o cronômetro "No revelador". Embaixo, o enunciado
   igual ao acervo numa etiqueta de laboratório colada com fita ("Filme 1 de 3").
2. **s2-alternativas (12h):** a radiografia menor no varal, a pergunta resumida e as quatro alternativas como
   quadros de uma tira de negativo (letra em moeda dourada). Fecho: "Guarde a sua letra / a luz acende no próximo
   story".
3. **s3-revelado (18h, o resultado):** "Luz acesa": a base vira o verde-noite do site. A cópia revelada em papel
   fotográfico, limpa, com o achado escrito na legenda embaixo; a letra certa numa moeda dourada, o
   diagnóstico grande e três porquês numerados. Depois, o cartão **"No comentário do site · Aula completa"**:
   uma frase real do comentário (citação em serifa itálica), os livros citados como etiquetas e o que mais a aula
   traz (por que as erradas caem, tabela, figura). Fecha com "Treine de graça no Orto Questões", os três itens e o botão
   "Comece grátis agora".

**Quando usar:** questões em que a imagem decide e o achado é discreto (um detalhe da cortical, uma linha, um
sinal radiográfico). Radiografia vertical ocupa melhor o filme; a horizontal pede ajustar a largura do `.filme`.

**Cuidados:**
- Radiografia limpa no story 3, sem círculo ou marcação por cima (Tales, 17/11/2026); o achado vai na legenda da cópia.
- Só Plus Jakarta Sans, Inter e a serifa da citação: nada de fonte pixel (Jersey 10) nem manuscrita (Caveat), que o Tales achou ilegíveis.
- O fecho deixa claro que dá para treinar de graça: "Treine de graça", três itens (questões, resumo, comentário) e o botão "Comece grátis agora".
- Sem figurinha em nenhum dos três. Sem desenho de anatomia: só a imagem real e objetos simples (lâmpada,
  prendedor, tira de filme).
- O cartão do comentário sempre com frase e livros tirados do comentário real da questão
  (`public/acervo/comentarios/<tema>.json`); nunca inventar. Livro com nome e edição, sem página de PDF.
- Nada essencial abaixo de 1580 px (barra de resposta do Instagram).
