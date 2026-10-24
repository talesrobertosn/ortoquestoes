# Resumos por engenharia reversa (stories)

Gerar: `node marketing/instagram/estilos/modelo-padrao/gerar.mjs marketing/instagram/posts/2026-10-20-resumos-engenharia/stories.html` (grava `png/`).

**Modelo padrão** (estilos/modelo-padrao), em variante **sépia** (`<body class="sepia">`), pedido do Tales em 20/10/2026: "um post explicando tudo nos stories apenas do nosso sistema de resumo por engenharia reversa, com print com fundo sépia". Telas reais do leitor em sépia, capturadas com `SO=estante,leitorMac,leitorCel node marketing/instagram/resumos-biblioteca/capturar.mjs` (conta de exemplo) e copiadas para `telas/`.

| Story | O quê |
|---|---|
| `story-1` | A ideia: resumos feitos de trás para frente (dois iPhones com o leitor em sépia) |
| `story-2` | Como nasce um resumo: ler o capítulo, desmontar as questões de prova, escrever na ordem do que mais cai |
| `story-3` | No meio do texto: o cartão "Já caiu" com prova e ano, a questão no painel, como caiu e a armadilha; alerta de gabarito diferente do livro |
| `story-4` | Radar de prova (cobrança confirmada, fundamento, clínico, oportunidade) e o leitor com destaques e o painel Aparência |
| `story-5` | Chamada: sem conta, 6 primeiras partes; conta grátis, tudo. Data da prova do TEOT e do TEPOT, cronograma e "Treine grátis" |

Sem figurinha (stories nunca levam figurinha de link). Postar em sequência, à noite ou de manhã.

## Conferência

- Tudo o que os stories dizem está em `docs/biblioteca/README.md`: passo a passo (ler o PDF inteiro, engenharia reversa das questões com prova, ano, gabarito, armadilhas e divergência do livro, escrever na ordem do que mais cai, texto autoral sem traduzir o livro), radar das seções, questão em painel sem perder a leitura, alerta de divergência, temas claro/sépia/escuro, porta de visitantes (6 partes) e conta grátis com tudo.
- Sem total do acervo (o "57 questões citadas" é da tela real do capítulo). Sem preço, sem emoji, sem menção a IA.

## Refazer as telas (`telas/` fica fora do git)

```bash
SO=estante,leitorMac,leitorCel node marketing/instagram/resumos-biblioteca/capturar.mjs
D=marketing/instagram/posts/2026-10-20-resumos-engenharia; T=marketing/instagram/resumos-biblioteca/telas; mkdir -p $D/telas
cp $T/{cel-leitor-capa,cel-leitor-hardinge,cartao-hardinge,mac-leitor,painel-aa}.png $D/telas/
python3 -c "from PIL import Image as I; T='$T/'; D='$D/telas/'; I.open(T+'cel-leitor-classificacoes.png').crop((0,600,1170,880)).save(D+'recorte-radar.png'); I.open(T+'cel-leitor-capa.png').crop((0,200,1170,1200)).save(D+'recorte-capa.png')"
```
