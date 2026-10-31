# Ferramentas de design (orientação do Tales, 31/10/2026)

"Usar sempre que possível; a ideia é você ficar especialista em design." Em todo pedido de design (telas do site,
componentes, páginas, posts, banners), use as skills abaixo junto com o brainstorm interno de sempre. Elas
**somam** às regras do projeto; não substituem as decisões já aprovadas pelo Tales.

| Etapa | Skill | Para quê |
|---|---|---|
| Pesquisar antes de desenhar | `refero-design` | Referências de estilo, telas e fluxos; trava de referência e registro das decisões |
| Decidir e fundamentar | `ui-ux-pro-max` | Biblioteca de estilos, paletas por produto, pares de fontes, regras de UX, acessibilidade e gráficos |
| Construir | `ui-styling`, `design-system` | Componentes no estilo shadcn, tema escuro, tokens de cor, espaço e tipografia |
| Revisar e polir | `impeccable` | Auditoria, crítica, polimento, animação, "mais ousado" ou "mais discreto", DESIGN.md |
| Posts e peças | `banner-design`, `brand`, `canvas-design` | Banners, pôsteres e peças estáticas com direção de arte; consistência de marca (os posts seguem docs/marketing/orientacoes.md) |
| Arte pixel e mascote | `arte-hd2d` | Cenários HD-2D e o esqueleto (modelo E); sempre arte própria feita por código |

## O que não muda
- Nada de imagem gerada por IA: não usar os geradores de logo, ícone e identidade da skill `design` (Gemini e afins).
- Prints antes de publicar (celular e computador, claro e escuro) e publicar só com o OK do Tales.
- Todas as funções da tela continuam; nomes claros, fantasia só na arte.
- Ideias guardadas ficam em `docs/design/ideias/` (por exemplo, a interface shadcn com a arte HD-2D).

O Impeccable foi instalado só no ambiente da sessão (binário grande e verificações automáticas); se faltar, rode
`npx impeccable install` (o site impeccable.style precisa estar liberado na rede do ambiente).
