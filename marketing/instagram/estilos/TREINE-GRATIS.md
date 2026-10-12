# Treine grátis: modelo aprovado

Tales aprovou este modelo em 12/10/2026 ("esse é um modelo bom"). Vale para Claude, Codex e os demais agentes. Ele faz parte do arsenal, mas não é padrão obrigatório. Respeite o intervalo de 2 dias entre usos do mesmo estilo e confira `historico.json` antes de usar (o estilo é registrado como `treine-gratis`).

Referência executável: [treine-gratis/modelo.html](treine-gratis/modelo.html), um story de 1080×1920. Primeira entrega: `posts/2026-10-12-story-treine-gratis/`. Versão de feed em carrossel (7 slides de 1080×1350, um recurso por slide e a chamada no fim): `posts/2026-10-12-carrossel-treine-gratis/`.

## Quando escolher

**A ideia.** É o story que convida a criar a conta. Ele mostra o site funcionando em dois aparelhos (MacBook e iPhone, feitos em CSS, com telas reais) e lista o que a pessoa ganha de graça. Termina num botão dourado "Treine grátis" e num espaço livre para a figurinha de link, que leva direto ao cadastro.

**Funciona melhor:**
- à tarde ou à noite (18h às 19h), depois de um story com questão: primeiro se entrega algo útil e só depois se pede o cadastro;
- em campanhas para quem ainda não conhece o site;
- em versões com outra tela no notebook (questão com imagem, Simulados, Cronograma) para não repetir o print.

**Evite:** usar como story de questão. Os stories de questão continuam sem figurinha.

## Roteiro (uma tela)

1. **Topo (y=236):** a marca Orto Questões à esquerda e a etiqueta da prova (por exemplo "TEOT · TARO") à direita, em menta.
2. **Título (y=340):** duas linhas em Jakarta 88 px, com a parte final em dourado, por exemplo "Treine com as provas que **já caíram.**" Uma linha de subtítulo diz o que é o site.
3. **Aparelhos (y≈670 a 1250):** o MacBook com a questão respondida e o comentário à vista, e o iPhone inclinado 4 graus por cima, à direita, com Desempenho, Revisão ou Ranking. Abaixo vai a nota "Tela ilustrativa".
4. **Recursos (y=1302):** quatro cartões em duas colunas, cada um com um visto dourado, um título curto e uma linha de apoio. Só cite o que existe no plano gratuito (confira a tabela "Gratuito ou assinante" da página de assinatura).
5. **Chamada (y=1540):** o botão dourado "Treine grátis" com seta e, abaixo, "Crie sua conta pelo link aqui embaixo" com uma seta para baixo.
6. **Espaço da figurinha (y≈1690 a 1790):** fica vazio, sem nada desenhado. Abaixo vai "ortoquestoes.com.br" em cinza.

## O link (sempre marcado)

A figurinha usa um link com utm, para o Admin mostrar de onde veio cada cadastro:

```
https://ortoquestoes.com.br/?utm_source=instagram&utm_medium=stories&utm_campaign=<campanha>#/conta?modo=criar&voltar=%2Ftreinar
```

- O link abre direto em "criar conta" e, depois do cadastro, leva para Treinar.
- Troque o `<campanha>` a cada story (`treine-gratis`, `treine-gratis-2`, `treine-gratis-cronograma`) para comparar qual trouxe mais contas.
- No Instagram, personalize o texto da figurinha para "Treine grátis".
- Os utm precisam vir antes do `#`. O site lê os dois lugares, mas assim o link fica mais limpo.

## Acabamento

- **Fundo:** verde-noite da marca, com halos verde e dourado e pontilhado só na metade de cima.
- **Cores:** dourado #F4CF7C (destaque e botão), menta #7FD1BF (etiqueta), creme e cinza #A9BBB7 nos textos de apoio.
- **Fontes:** Plus Jakarta Sans 800 nos títulos, no botão e nos cartões; Inter no corpo.
- **Telas:** use o tema escuro, para combinar com o fundo. Os comandos de captura estão no comentário do topo do modelo:
  - notebook: `LARGURA=1100 ALTURA=688 ESCALA=2`;
  - celular: esconda a faixa "Sincronizando" com `ESCONDER='.dp-heroi__sync'`.
- **Margens:** 80 px dos lados. Nada importante acima de y=230 (cabeçalho do Instagram) nem abaixo de y=1800 (barra de resposta).
- **Proibido:** preço, número total do acervo, emoji, menção a IA e desenho de anatomia.

## Como reutilizar

1. Leia `docs/marketing/orientacoes.md` e confira `historico.json`.
2. Capture as telas com `telas.mjs`, com o site rodando em `npx vite preview --port 4175`. Se a questão do notebook for oficial, anote o id em `publicadas.md` como tela de exemplo.
3. Copie o modelo para `marketing/instagram/posts/AAAA-MM-DD-<slug>/post.html`. A profundidade das pastas é a mesma, então os caminhos de fontes e telas continuam valendo.
4. Troque o título, a etiqueta, as telas (`data-mac` e `data-tela`) e os quatro recursos.
5. Gere com `node marketing/instagram/gerar.mjs <post.html>` e confira se há sobreposição, texto cortado e se o espaço da figurinha está livre.
6. Escreva o `LEGENDA.md` com o link marcado completo e o texto da figurinha. Mande também o link como texto na conversa.
7. Registre o estilo `treine-gratis` em `historico.json`.

## Revisão antes de entregar

- [ ] Os recursos citados são do plano gratuito.
- [ ] "Tela ilustrativa" está visível.
- [ ] O link tem utm, abre em "criar conta" e foi testado no preview, com a origem gravada em `oq-origem`.
- [ ] O espaço da figurinha está vazio e acima de y=1800.
- [ ] O título tem no máximo duas linhas e não encosta nos aparelhos.
