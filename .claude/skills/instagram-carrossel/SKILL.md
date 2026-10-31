---
name: instagram-carrossel
description: >
  Gera carrosséis, posts quadrados e verticais e stories de Instagram do Orto Questões com a identidade do site
  (DESIGN.md e docs/design/INSTAGRAM.md), a partir de uma questão real do acervo, e exporta os PNGs com Playwright.
  Use sempre que o Tales pedir carrossel, post, slides, stories ou peça para o Instagram, junto com as orientações de
  marketing (docs/marketing/orientacoes.md) e, quando ele citar um modelo aprovado, o guia desse modelo.
---

# Instagram do Orto Questões: carrossel, post e stories

Adaptação da skill `cirotrigo/instagram-carousel-skill` (fluxo em fases com aprovação, prévia e export via
Playwright) para o nosso projeto: no lugar do servidor e do Drive do Studio Lagosta, usamos o acervo de questões,
a arte própria e os tokens do site. O repositório original não declara licença; por isso esta skill tem texto e
código próprios, sem copiar os arquivos dele.

## Antes de tudo (sempre)

1. Ler `DESIGN.md`, `docs/design/INSTAGRAM.md` e `docs/marketing/orientacoes.md` (regras da marca: sem emoji, sem IA,
   sem figurinha nos stories de questão, legenda sem link, no máximo 5 hashtags).
2. Ver o estilo do dia: `node marketing/instagram/estilos/ordem.mjs` (pedido do Tales vence a fila).
3. Escolher a questão real e inédita: `node marketing/kit/questao.mjs buscar <tema> --imagem`; conferir também o
   **assunto** em `marketing/instagram/publicadas.md` e em `marketing/instagram/posts/` (não repetir tema recente).

## Fase 1: formato, copy e aprovação

| Formato | JSON `formato` | Tamanho | Quando |
|---|---|---|---|
| Carrossel / vertical | `vertical` | 1080×1350 | conteúdo em sequência (capa → questão → raciocínio → resposta → fecho) |
| Quadrado | `quadrado` | 1080×1080 | post único curto |
| Story | `story` | 1080×1920 | série de 3 (pergunta 7h, raciocínio 12h, resposta 18h) |

Tema visual: `noite` (verde-noite e dourado) ou `papel` (claro, verdete). Escreva os textos de cada slide (rótulo,
título, texto) com o enunciado, as alternativas e o gabarito **iguais ao acervo** e a explicação tirada do comentário
da questão. Quando o Tales estiver acompanhando, mostre a tabela de slides antes de montar.

## Fase 2: imagens

Use a imagem real da questão (`public/imagens/...`), recortes de telas reais do site (`scripts/capturar_telas.mjs`)
ou a arte própria (`public/pixel/`, mascote modelo E). Nada de imagem gerada por IA, banco de imagens ou desenho de
anatomia em CSS/SVG.

## Fase 3: montar, revisar e exportar

1. Copie `exemplo.json` para a pasta do post e preencha (`saida`: `marketing/instagram/posts/AAAA-MM-DD-<slug>`).
   Tipos de slide: `capa`, `questao`, `passos`, `resposta`, `fecho`, `texto`. Use `<em>` no título para o destaque
   e `**negrito**` no texto.
2. Gere: `python3 .claude/skills/instagram-carrossel/montar.py <arquivo.json>` (HTML `peca.html`, `previa.html` com
   todas as peças lado a lado e os PNGs em `png/`). Com `--sem-png`, só o HTML.
3. Confira: `python3 scripts/design/conferir_pngs.py <pasta>/png --formato vertical` e abra cada PNG no tamanho real
   (texto cortado, zona segura, acentos, contador, marca). Corrija e gere de novo.
4. Para um modelo aprovado com HTML próprio (Cofre, Snellen, Embarque...), use o modelo e
   `node marketing/instagram/gerar.mjs <post.html>`; a conferência é a mesma.

## Fase 4: entregar e registrar

Mande os PNGs (e a legenda do feed como texto), registre o estilo em `marketing/instagram/estilos/historico.json`
e o id em `marketing/instagram/publicadas.md`, e escreva a `LEGENDA.md` com a ordem e os horários.

## Dependências

Python 3 e Playwright para Python (`pip3 install playwright && python3 -m playwright install chromium`). As fontes
(Plus Jakarta Sans, Inter, Jersey 10; OFL) vêm de `marketing/instagram/fontes/`.
