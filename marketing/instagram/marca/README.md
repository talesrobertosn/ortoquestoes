# Acervo da marca (11/11/2026)

Símbolos principais aprovados pelo Tales e as peças prontas para postar.

## O símbolo oficial do site

**O ladrilho das alternativas é o símbolo padrão do Orto Questões** (Tales, 11/11/2026): o ladrilho verdete com as
três linhas de resposta e a do meio em ouro, com o visto (o da "marca horizontal" do kit, `png/02-ladrilho-kit.png`).
Já está no topo do site (um pouco maior que o nome), no favicon, nos ícones do aplicativo e no rodapé
(`src/marca/Simbolo.tsx`, `public/favicon.svg`, `scripts/gerar_icones.py`). Abaixo de 24 px entra a versão mini, sem
o visto. Variações temáticas no futuro (Natal com gorrinho, por exemplo) partem deste mesmo desenho, sem trocar a
forma do ladrilho nem a posição da certa.

## Nos posts do Instagram

Os símbolos aprovados (ladrilho em todas as versões do kit, selo e brasão) são **variações da identidade** e entram
nos posts em rodízio: a cada post, um deles na assinatura, na capa ou no fechamento, sem repetir o mesmo dois posts
seguidos. As cores são a paleta padrão abaixo.

## As peças

- **Ladrilho das alternativas** (símbolo principal, pronto): kit em `png/02-ladrilho-kit.png` (marca horizontal,
  favicon mini sem o visto, ícone de app, uma cor).
- **Brasão do aventureiro** (pixel art com luz de tochas): `brasao-perfil.png` (1080 x 1080, foto de perfil) e
  `brasao-post.png` (1080 x 1350, com o nome). Gere com `python3 docs/design/marca-2026/brasao_rt.py`.
- **O que vira Q**: descartado (Tales, 11/11/2026: parecido demais com o logo de outro curso, que chegou primeiro).
  `png/01-q-variacoes.png` fica só como registro; não usar.
- **Paleta padrão**: `png/03-paleta.png`, tokens `--paleta-marca-*` em `src/estilos/tokens.css`.
- O leque das alternativas foi descartado.

## Rodízio de posts da marca (feed 1080 x 1350)

Intercalar com os posts de questão, um por vez, nesta ordem:

1. `png/post-1-ladrilho.png` — ladrilho creme sobre verdete, nome e "Questões de prova, comentadas".
2. `brasao-post.png` — o brasão em pixel art.
3. `png/post-2-ladrilho-creme.png` — "Cada questão tem uma resposta certa. Cada comentário diz por quê."
4. `png/post-3-selo.png` — o selo.
5. `png/post-4-noite.png` — "Entre as alternativas, a certa brilha."

Fotos de perfil: `png/perfil-ladrilho.png`, `png/perfil-ladrilho-noite.png` ou `brasao-perfil.png`.

Gere com `node marketing/instagram/gerar.mjs marketing/instagram/marca/marca.html` (sai em `saida/`, ignorada pelo git) e copie para `png/`.
