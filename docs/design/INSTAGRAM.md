# Padrões de Instagram do Orto Questões

Complementa `DESIGN.md` (sistema visual) e `docs/marketing/orientacoes.md` (regras da marca, horários, legenda).
A skill `instagram-carrossel` (`.claude/skills/instagram-carrossel/`) aplica estes padrões e exporta os PNGs.

## Formatos

| Formato | Tamanho (px) | Proporção | Uso | Zona segura (onde vai o que importa) |
|---|---|---|---|---|
| Quadrado | 1080 × 1080 | 1:1 | post único, aviso curto, citação | margem de 80 px em volta |
| Vertical (feed) | 1080 × 1350 | 4:5 | post e carrossel (o padrão do feed) | margem de 72 px; nada essencial nos 60 px de baixo (contador) |
| Story | 1080 × 1920 | 9:16 | stories de questão, resposta e convite | entre 250 px e 1580 px de altura; laterais de 64 px |
| Carrossel | 1080 × 1350 por slide | 4:5 | 3 a 10 slides em sequência | igual ao vertical; mesma grade em todos os slides |

A grade do feed mostra o post cortado em 3:4 no perfil: o título da capa precisa caber no meio (cerca de 1012 px de
altura centrais).

## Grade e tipografia

- Grade de 12 colunas com margem de 72 px (vertical) ou 80 px (quadrado); unidade de 8 px.
- Título: Plus Jakarta Sans 800, 72–96 px na capa, 52–64 px nos internos, tracking -0.03em, no máximo 3 linhas.
- Texto: Inter 500, 30–34 px, entrelinha 1.38, até 12 palavras por linha.
- Rótulo: Inter 800, 22–24 px, caixa alta, tracking +0.18em.
- Números de jogo: Jersey 10 (contador, numeração de passos).
- Mínimo legível no celular: 24 px. Nada abaixo disso, a não ser a fonte da imagem.

## Cor e superfície

- Duas bases, iguais ao site: **verde-noite** (`#0b3a35` a `#0a1f1c`, texto `#f6eedb`, destaque dourado `#f4cf7c`) e
  **papel claro** (`#f6f3ea`, texto `#12181a`, destaque `#14655e` e ouro-texto `#7a5710`).
- Um acento por peça. Gradiente só como luz (brilho suave atrás do foco), nunca como fundo chamativo.
- Arte HD-2D e mascote entram como imagem com moldura, quando têm papel (guia, reação, tema do dia).

## Estrutura dos carrosséis e stories de questão

1. **Capa (gancho):** a pergunta ou o detalhe que decide, sem entregar a resposta; marca no topo; contador 1/N.
2. **A questão como caiu:** imagem real da prova, enunciado e alternativas iguais ao acervo (id anotado).
3. **O raciocínio:** passos numerados, uma ideia por slide.
4. **A resposta:** letra, porquê das erradas e a frase "para a prova".
5. **Fecho:** "ortoquestoes.com.br" escrito e "o caminho está no nosso perfil" (sem link clicável na legenda).

Stories seguem a mesma lógica em 3 peças (pergunta às 7h, raciocínio às 12h, resposta às 18h), sem figurinha (a
figurinha de link só no story de convite, quando o Tales pedir).

## Conferência antes de entregar

- PNG aberto no tamanho real: nada cortado, sobreposto ou encostando nas bordas; zona segura respeitada.
- Hierarquia: um elemento dominante por slide; no máximo dois pesos tipográficos por bloco.
- Acentos, contador, marca, site; questão e gabarito conferidos com o acervo; questão não repetida
  (`marketing/instagram/publicadas.md`).
- `python3 scripts/design/conferir_pngs.py <pasta>` confere tamanho e formato dos PNGs.
