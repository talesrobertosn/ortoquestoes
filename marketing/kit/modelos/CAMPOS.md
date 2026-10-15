# Campos dos modelos do kit

Cada post da fila tem `questao` (copiada do acervo por `questao.mjs`) e `pecas`: uma lista de
`{ "estilo": "...", "conteudo": { ... } }`. Abaixo, os campos de `conteudo` de cada estilo.
Campo marcado com (p) tem padrão: se faltar, o modelo usa o texto do modelo aprovado ou tira do
comentário do acervo. O exemplo completo de cada estilo está no `EXEMPLO` do próprio HTML e em
qualquer JSON da fila com o mesmo estilo: **copiar um JSON da fila é o jeito mais rápido**.

**Marcação em qualquer texto:** `**negrito**`, `[[destaque na cor do estilo]]`, `*itálico*`, `\n` quebra a linha.
Os textos do enunciado e das alternativas vêm sempre de `questao` (não se reescrevem); `negritos` e
`grifos` só marcam trechos que já existem no enunciado.

## snellen (feed, 5 imagens)
- `linhas`: 7 linhas da tabela, da maior para a menor (máx. ~4, 6, 9, 12, 17, 30 e 40 letras). As 6 e 7 são a pista miúda. Nunca o gabarito.
- `negritos`, `grifos` (grifo amarelo no enunciado), `optotipos` (p: as alternativas, se forem curtas; senão vira lista).
- `dica_questao`, `lupa_rotulo` (p), `lupa_texto` (curto, até 3 linhas), `lupa_cartoes` (2 frases).
- `chamada_resposta`, `motivos` {A..D} (p: comentário), `rotulos` (p), `selo_gabarito`, `rodape_resposta`.
- `vermelho` e `verde` {rotulo, texto}, `cartao_final` (opcional). Etiquetas e rodapés (p).

## var (feed 5 + stories 3)
- `incluir`: "ambos" (p), "feed" ou "stories". `area`: rótulo curto do placar (até ~7 letras: PÉ, OMBRO, TRAUMA).
- `destaques`: trechos do enunciado em dourado.
- `capa` {titulo, lide, escalacao: 4 nomes curtos, selo (p), tarja (p)}.
- `lance` {lide, tarja} (p). `replay` {titulo, lide, blocos: 2 × {rotulo, titulo, texto}, leitura, tarja}.
- `decisao` {motivos {A..D} (p: comentário), tarja (p)}.
- `sumula` {linhas: até 5 × {item, desc, chip: em | imp | banco, rotulo}, para_prova, fecho (p), tarja (p)}.
- `story1` {titulo}; `story2` {titulo, fichas: 2 × {nome, texto, st (p)}, lide}; `story3` {titulo, blocos (p: os do replay), para_prova}.

## cofre-duas-chaves (feed, 6 imagens) e mecanica-fina (stories, 6 imagens)
Comuns: `imagem` (p: a 1ª imagem da questão), `fonte` (p: legenda da imagem), `rodape` (p), `negritos`, `alternativas_formatadas` (só marcação).
- Cofre: `capa` {tag, titulo, sub, chaves: 2 rótulos da porta, porta (p)}; `questao_slide` {tag, titulo, pedido_titulo, pedido_texto} (p);
  `leitura` {titulo, paineis: 2 × {titulo, texto}, nota {titulo, texto}}; `resposta` {titulo, tamanho (p 75), sub, chaves: 2, comparacao {letra: {titulo, texto}} (p), guardar};
  `passos` {tag, titulo, sub, itens: 3 × {titulo, texto}, destaque {rotulo, titulo, texto}, nota}; `final` {celular {titulo, texto, itens}, recursos, nota, cta_titulo, cta_texto} (p).
- Mecânica: `capa` {tag, titulo, sub, pilulas (p), altura_imagem (p 540)}; `questao_slide` {tag, titulo, pedido, altura_imagem (p 400)};
  `raciocinio` {titulo, sub, passos: 3, altura_imagem (p 400)}; `resposta` {tag, titulo, destaque {titulo, texto}, mostrador (até 3 letras), mostrador_texto, comparacao, guardar};
  `passos` {tag, titulo, itens: 3, destaque, nota}; `final` {tag, titulo, celular, recursos, nota, cta_titulo, cta_texto}.
- Imagem em pé (retrato) fica pequena na Mecânica: aumente `altura_imagem` (ex.: 460) e confira se o texto coube.

## cupom-fiscal (stories, 3 imagens)
- Questão curta (enunciado até ~140 letras, alternativas até ~45). `enunciado_formatado` e `alternativas_formatadas` só mudam a marcação.
- `gancho` (fora do papel, 2 linhas), `gancho_sub` (p), `explicacao`: 2 parágrafos, `erradas` {letra: uma linha}, `regra` (2 linhas).
- Cupom final (p): `itens` (5 recursos reais), `chamada_final`, `sub_final`. Nunca preço (a variante com preço é só a pedido).

## treine-gratis (story de propaganda, 1 imagem)
- `etiqueta`, `titulo` (2 linhas), `sub` (até 2 linhas), `recursos`: 4 × {titulo, apoio} (só o que o plano gratuito tem, ou dizer que é do assinante).
- `tela_notebook`, `tela_celular`: caminhos de telas reais (assets.md, "Telas do site"); `captura`: o comando que gera as telas.
- `botao` (p "Treine grátis"), `dica` (p), `utm_campaign` (troque a cada story). No JSON do post: `link_figurinha`.
