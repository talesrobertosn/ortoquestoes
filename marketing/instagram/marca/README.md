# Acervo da marca (11/11/2026)

Símbolos principais aprovados pelo Tales e as peças prontas para postar.

- **Ladrilho das alternativas** (símbolo principal, pronto): kit em `png/02-ladrilho-kit.png` (marca horizontal,
  favicon mini sem o visto, ícone de app, uma cor).
- **Brasão do aventureiro** (pixel art com luz de tochas): `brasao-perfil.png` (1080 x 1080, foto de perfil) e
  `brasao-post.png` (1080 x 1350, com o nome). Gere com `python3 docs/design/marca-2026/brasao_rt.py`.
- **O que vira Q**: o original lembrava outro curso; nova rodada B2 (Q de ladrilho), B3 (três arcos) e B4 (Q marcado)
  em `png/01-q-variacoes.png`, aguardando a escolha.
- **Paleta padrão**: `png/03-paleta.png`, tokens `--paleta-marca-*` em `src/estilos/tokens.css`.
- O leque das alternativas foi descartado.

## Rodízio de posts da marca (feed 1080 x 1350)

Intercalar com os posts de questão, um por vez, nesta ordem:

1. `png/post-1-ladrilho.png` — ladrilho creme sobre verdete, nome e "Questões de prova, comentadas".
2. `brasao-post.png` — o brasão em pixel art.
3. `png/post-2-ladrilho-creme.png` — "Cada questão tem uma resposta certa. Cada comentário diz por quê."
4. `png/post-3-selo.png` — o selo.
5. `png/post-4-noite.png` — "Entre as alternativas, a certa brilha."
6. (quando escolhido) o novo Q.

Fotos de perfil: `png/perfil-ladrilho.png`, `png/perfil-ladrilho-noite.png` ou `brasao-perfil.png`.

Gere com `node marketing/instagram/gerar.mjs marketing/instagram/marca/marca.html` (sai em `saida/`, ignorada pelo git) e copie para `png/`.
