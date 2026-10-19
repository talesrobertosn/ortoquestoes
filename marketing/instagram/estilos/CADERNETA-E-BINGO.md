# Caderneta de topografia e Bingo da prova: modelos aprovados

Tales pediu em 19/10/2026 para salvar os dois como modelos ("salve esses dois modelos na nossa lista de modelos para poder ser usado mais tarde"). Primeira entrega: `posts/2026-10-19-topografia-bingo/` (feed com `coluna-0283`, TARO 2026; stories com `trauma-0220`, TEOT 2021). Registre como `caderneta-topografia` e `bingo-da-prova` em `historico.json` (o `bingo` de 09/10 é outro post, o Bingo do plantão) e siga a [ordem de rodízio](ORDEM.md).

| Estilo | Formato | Modelo |
|---|---|---|
| Caderneta de topografia | feed, 6 slides de 1080×1350 | [caderneta-topografia/modelo.html](caderneta-topografia/modelo.html) |
| Bingo da prova | stories, 4 telas de 1080×1920 | [bingo-da-prova/modelo.html](bingo-da-prova/modelo.html) |

Gere o exemplo com `node marketing/instagram/gerar.mjs marketing/instagram/estilos/<estilo>/modelo.html` (sai igual ao post aprovado). Para um post novo, copie o `modelo.html` para a pasta do post, troque o caminho das imagens e telas (`img/` e `telas/` da pasta do post) e os textos.

## Caderneta de topografia (feed)

**Quando usar:** questões de figura com ângulos, linhas, medidas ou parâmetros com nomes parecidos (equilíbrio sagital, ângulos do quadril e do pé, índices radiográficos). A metáfora é medir em campo: a figura chega com "medição pendente" e o post faz a leitura.

1. **Capa:** cabeçalho de caderneta ("Caderneta de campo · tema", "Fl. 01/06"), gancho em serifa com a segunda frase em itálico vermelho, a figura real em cartão branco com anéis e pinos coloridos sobre os rótulos da própria figura, a coluna "Medição pendente" (α = ?, β = ?) e o carimbo com prova e ano.
2. **Questão:** enunciado oficial em serifa, figura à esquerda, alternativas à direita e "Comente a sua letra antes de arrastar".
3. **Fichas técnicas:** um cartão por conceito (sigla grande, nome, definição do comentário) com selo do tipo (aqui "Morfológico" e "Posicional").
4. **Leitura da figura:** a figura maior com pinos numerados e, ao lado, o que cada pino mede; carimbo "Gabarito: X".
5. **Conferência das alternativas:** a certa em destaque, as erradas riscadas em vermelho com o motivo, e a faixa escura "Na prova".
6. **Convite:** "Entre no site e treine grátis", MacBook e iPhone com a própria questão aberta no site (telas reais), o site em pílula escura e "o caminho está no perfil".

**Acabamento:** papel `#F6F1E4` com grade azul fina (36 px e 180 px), tinta `#1C2A39`, vermelho `#C0392B` e azul `#2C6CB0`. As cores dos destaques **vêm das linhas da figura da questão**; numa figura com outras cores, troque as duas. Títulos em Source Serif 4, texto em Inter, rótulos em DejaVu Sans Mono. Anéis e pinos só sobre os rótulos que a figura já tem; nada de desenhar linha ou ângulo novo.

## Bingo da prova (stories)

**Quando usar:** questões em que **um número decide** (valores de corte, graus, milímetros, porcentagens, idades). As alternativas viram bolas de bingo.

1. **7h, gancho:** marca, etiqueta "Bingo da prova · prova e ano", a frase "Um desses números..." e as quatro bolas (cores neutras, a certa sem destaque).
2. **7h, cartela:** a questão inteira num cartão creme, a figura real (amplie no máximo 1,5 vez) e as alternativas em casas 2×2; "Responda de cabeça. O sorteio sai ao meio-dia."
3. **12h, sorteio:** a bola certa grande com brilho, a frase-regra e as outras bolas riscadas, cada uma com o motivo; faixa dourada "Na prova".
4. **18h, convite:** "Acertou o número? Agora treine as outras.", iPhone com a questão real no site, botão "Treine grátis" e o site escrito. **Sem figurinha.**

**Acabamento:** feltro verde (`#0B3D34` a `#062620`) com textura de pontos, bolas creme com faixa colorida (azul, vermelho, roxo, laranja) e disco branco, dourado `#F4CF7C` nos destaques. O grau sobe como expoente (classe `small` dentro do disco).

## Revisão antes de entregar

- [ ] Enunciado, alternativas e gabarito iguais ao acervo; motivos das erradas tirados do comentário.
- [ ] Pinos e anéis sem cobrir linha importante da figura; nada cortado ou encostando.
- [ ] Telas reais recapturadas no dia (`telas.mjs`), com "Tela ilustrativa".
- [ ] Stories: o que importa entre 250 e 1580 px; sem figurinha em nenhum story.
