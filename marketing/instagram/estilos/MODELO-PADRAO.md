# Modelo padrão (aprovado pelo Tales em 16/10/2026)

Quando o Tales pedir um post **"no modelo padrão"**, é este: o lançamento da Biblioteca de Resumos
(`marketing/instagram/resumos-biblioteca/`), com **telas reais do site editadas**. Vale para stories
(1080×1920) e para o feed (1080×1350, carrossel).

## O que define o modelo

- **Telas reais, nunca inventadas**: capturas do próprio site (Playwright, `deviceScaleFactor` 2 a 3,
  conta de exemplo pelo Supabase falso de `fixtures/e2e_biblioteca.mjs`), colocadas em **MacBook e iPhone
  desenhados em CSS** e marcadas com "Tela ilustrativa" quando houver dado de exemplo.
- **Lupa**: recorte ampliado de um pedaço da tela real (cartão de questão, botão, aviso), com moldura
  dourada e etiqueta ("TELA REAL DO RESUMO").
- **Pinos numerados** dourados que ligam cada parte do recorte a uma explicação curta ao lado.
- **Título grande** (Plus Jakarta Sans 800, palavras de destaque em dourado), subtítulo em Inter,
  cartões de recurso com ✓, faixa de aviso, chips e, na propaganda, o botão grande com espaço para a
  figurinha de link.
- **Cor dominante: verde ou branco**, na tonalidade da marca:
  - **verde** (padrão): fundo verde-noite com brilhos verdes e dourados;
  - **branco**: fundo papel claro com os mesmos brilhos suaves, texto verde-escuro e dourado um tom mais
    escuro (`<body class="claro">`).
  Pode ajustar tonalidades (mais claro, mais escuro, mais dourado), mantendo o desenho.

## Como fazer um post novo neste modelo

1. Copie `marketing/instagram/estilos/modelo-padrao/modelo.html` para `marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html`.
2. Capture as telas do assunto do post (use `marketing/instagram/resumos-biblioteca/capturar.mjs` como base:
   ele sobe o site, entra com a conta de exemplo e grava em `telas/`, que fica fora do git).
   Ajuste os caminhos `src=` e o script do fim do HTML para a sua pasta `telas/`.
3. Troque textos, telas, recortes e pinos (mantenha a estrutura e o CSS).
4. Gere os PNGs:
   ```
   node marketing/instagram/estilos/modelo-padrao/gerar.mjs marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html          # verde
   node marketing/instagram/estilos/modelo-padrao/gerar.mjs marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html --claro  # branco
   ```
   (sem caminho, gera o próprio modelo; um terceiro argumento como `story` ou `feed-3` gera só essas peças).
5. Olhe cada PNG no tamanho do celular: texto grande, nada cortado e, nos stories, nada importante nos
   250 px de cima nem nos 340 px de baixo. Registre em `estilos/historico.json` no dia da publicação
   (`modelo-padrao`).

## Regras que continuam valendo

As de `docs/marketing/orientacoes.md`: sem emoji, sem mencionar IA, sem número total do acervo, sem
preço (salvo pedido), prova e ano só como aparecem no site, stories de questão sem figurinha (a de link só
no story de propaganda, com utm).

Referências prontas: `marketing/instagram/resumos-biblioteca/png/` (verde) e
`marketing/instagram/estilos/modelo-padrao/png-claro/` (branco).
