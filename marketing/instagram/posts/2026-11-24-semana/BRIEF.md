# Brief comum dos agentes (stories da semana 24 a 30/11/2026)

Leia antes: `marketing/instagram/estilos/STORIES-COM-ALTERNATIVAS.md` (inteiro) e o piloto aprovado
`marketing/instagram/posts/2026-11-24-ficha-vancouver/stories.html` (e os PNGs `ter24-*.png` da mesma pasta),
que usa `../../estilos/stories-com-alternativas/base.css` e `../2026-11-24-semana/semana.css` (peças comuns: fundo,
grade, .op, .errada, .print2, .iphone, .etq, .botao, .chip, fontes Jersey e Pixelify para o toque de pixel).

## Cada dia (pasta própria em marketing/instagram/posts/)
- `stories.html` com 3 `<section id="...">` de 1080x1920 (ids `qua25-1-questao`, `qua25-2-resposta`, `qua25-3-convite` etc.).
- Story 1 (manhã): tema visual do dia, com toque de pixel art (fontes Jersey/Pixelify, ícones de `public/pixel/*.png` com
  `class="px"`, molduras em degrau `.pixbox`, grade). Não precisa ser HD-2D. Prova e ano, imagem da questão, enunciado e
  alternativas **literais do acervo** (`node marketing/kit/questao.mjs <id>`), letra em destaque. Embaixo, a dica
  "Vote na sua letra" + uma linha sem horário ("a resposta chega mais tarde") e **pelo menos 450 px vazios** até o fim
  (nada desenhado: sem caixa, sem moldura). Alternativas acima da área.
- Story 2 (à tardezinha): a certa em dourado, o raciocínio que ensina (passos, régua, tabela curta), um trecho do
  comentário com o livro e a página **exatamente como no comentário**, uma linha por alternativa errada. Figura do
  comentário só se ajudar (as imagens estão em `public/imagens/<area>/`).
- Story 3 (à tardezinha, propaganda): **sempre o print do trecho do resumo** (`img/resumo-trecho.png`, já recortado,
  na seção do tema) grande, com etiqueta do livro/capítulo; mais 1 ou 2 prints com cantos arredondados (o comentário real
  de outra questão TEOT da mesma área num iPhone: `img/cel-comentario.png`; e a página do dia: os `img/bruto-*.png`
  capturados em 2880x1800, recorte com PIL só a parte que interessa, sem números totais de questões e sem avisos de Natal).
  Botão "Treine grátis" ou "Comece a treinar grátis", rodapé "Até 20 questões comentadas por dia · ortoquestoes.com.br · Telas ilustrativas".
- Nunca citar horário. Sem emoji, sem IA, sem figurinha de link, sem número total de questões, sem desenho de anatomia,
  sem inventar dado clínico que a questão não traz. Comentários estão com `conferido: false`: nada de "revisado",
  "conferido", "validado". O que importa entre 250 e 1580 px de altura. Cantos arredondados, letra fácil (Jakarta/Inter;
  Jersey/Pixelify só em rótulos curtos). Português correto, com acentos.

## Gerar e conferir
```
export CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
node marketing/instagram/gerar.mjs <pasta>/stories.html
python3 scripts/design/conferir_pngs.py <pasta>/saida --formato story
```
Abra cada PNG (Read) e corrija: texto cortado, sobreposto, palavra órfã, área da enquete, legibilidade. Repita até ficar
limpo. Depois copie os PNGs de `saida/` para a pasta do dia e escreva `LEGENDA.md` (modelo:
`posts/2026-11-23-vidro-tagt/LEGENDA.md`, mas **sem horários**: "manhã" e "à tardezinha"; story 1 leva
"colocar a enquete A, B, C, D na área livre"). Não mexa em `publicadas.md`, `historico.json` nem em pastas de outros dias,
e não faça commit. Responda só com: pastas, PNGs gerados, fontes citadas e qualquer dúvida de conteúdo.

## Referência do Tales para o story 3
`marketing/instagram/posts/2026-11-24-semana/referencia-story3-tales.png` (aprovado por ele): título curto, trecho do
resumo grande no alto, iPhone com o comentário e prints menores (Atlas, Cronograma) com cantos arredondados, chips e
botão dourado. **Não copie sempre o mesmo arranjo**: o Tales pediu variação e criatividade (ex.: prints em leque,
em polaroids, numa vitrine, numa linha do tempo, num quadro de avisos), desde que o trecho do resumo esteja sempre lá.
