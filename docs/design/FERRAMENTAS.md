# Ferramentas de design (orientação do Tales, 31/10/2026)

"Usar sempre que possível; a ideia é você ficar especialista em design." Em todo pedido de design (telas do site,
componentes, páginas, posts, banners), use as skills abaixo junto com o brainstorm interno de sempre. Elas
**somam** às regras do projeto; não substituem as decisões já aprovadas pelo Tales.

**Antes de qualquer tarefa visual: ler `DESIGN.md` (sistema visual) e `PRODUCT.md` (produto e público) na raiz.**
O fluxo completo está em `docs/design/WORKFLOW.md`; os padrões de posts, em `docs/design/INSTAGRAM.md`.
Teste do ambiente: `bash scripts/design/testar_design.sh`.

| Etapa | Skill | Para quê |
|---|---|---|
| Pesquisar antes de desenhar | `refero-design` | Referências de estilo, telas e fluxos; trava de referência e registro das decisões |
| Decidir e fundamentar | `ui-ux-pro-max` | Biblioteca de estilos, paletas por produto, pares de fontes, regras de UX, acessibilidade e gráficos |
| Conceber | `frontend-design`, `theme-factory`, `canvas-design` | Direção visual com personalidade; temas (sempre derivados do DESIGN.md, nunca um tema pronto); peças estáticas |
| Construir | `ui-styling`, `design-system` | Componentes no estilo shadcn, tema escuro, tokens de cor, espaço e tipografia |
| Revisar e polir | `impeccable` | Auditoria, crítica, polimento, animação, "mais ousado" ou "mais discreto", DESIGN.md |
| Posts e peças | `instagram-carrossel`, `banner-design`, `brand`, `canvas-design` | Banners, pôsteres e peças estáticas com direção de arte; consistência de marca (os posts seguem docs/marketing/orientacoes.md) |
| Arte pixel e mascote | `arte-hd2d` | Cenários HD-2D e o esqueleto (modelo E); sempre arte própria feita por código |

## O que não muda
- Nada de imagem gerada por IA: não usar os geradores de logo, ícone e identidade da skill `design` (Gemini e afins).
- Prints antes de publicar (celular e computador, claro e escuro) e publicar só com o OK do Tales.
- Todas as funções da tela continuam; nomes claros, fantasia só na arte.
- Ideias guardadas ficam em `docs/design/ideias/` (por exemplo, a interface shadcn com a arte HD-2D).

O Impeccable foi instalado só no ambiente da sessão (binário grande e verificações automáticas); se faltar, rode
`npx impeccable install` (o site impeccable.style precisa estar liberado na rede do ambiente).

## Instalação e origem (31/10/2026)

| Skill | Origem | Licença | Observação |
|---|---|---|---|
| impeccable | pbakaus/impeccable (`npx impeccable install`) | Apache 2.0 | binário de 22 MB e hooks: só no ambiente da sessão (fora do git); lê DESIGN.md e PRODUCT.md sozinho |
| ui-ux-pro-max, design, design-system, ui-styling, brand, banner-design, slides | nextlevelbuilder/ui-ux-pro-max-skill (`npx skills add`) | MIT | busca local em Python; geradores de logo/ícone por IA não são usados |
| frontend-design, canvas-design, theme-factory | anthropics/skills (`npx skills add anthropics/skills --skill ...`) | Apache 2.0 | o plugin `frontend-design@claude-plugins-official` não existe neste ambiente; a skill de mesmo conteúdo veio do repositório |
| instagram-carrossel | adaptação própria de cirotrigo/instagram-carousel-skill | o original não declara licença: texto e código próprios | troca o servidor e o Drive do Studio Lagosta pelo acervo e pelos tokens do site; exporta com Playwright para Python |
| refero-design | referodesign/refero_skill | (ver skills-lock.json) | pesquisa de referências; a conexão Refero não está ligada |

Playwright para Python: `pip3 install playwright && python3 -m playwright install chromium` (o Chromium do Node em
`/opt/pw-browsers` continua o mesmo).
