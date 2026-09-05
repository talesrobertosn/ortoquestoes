# OrtoQuestões

Banco de questões de ortopedia e traumatologia para quem se prepara para o **TEOT** e o **TARO**.
Gratuito, sem cadastro, sem paywall e sem rastreador. Site estático, publicável no GitHub Pages.

Feito por Tales.

---

## Stack

**Vite + React + TypeScript, sem biblioteca de componentes, CSS escrito à mão.**
Justificativa em uma linha: o produto é um estado de sessão (filtros, respostas, mapa, atalhos de
teclado) renderizado sobre dados carregados sob demanda — React resolve isso com bem menos código
próprio do que HTML puro, e o bundle fica em ~63 kB comprimidos porque nenhuma biblioteca de
interface entra junto.

Roteamento por **hash** (`#/treinar`, `#/questao/mao-0001`): funciona igual em
`usuario.github.io/ortoquestoes` e em `ortoquestoes.com.br`, sem redirecionamento de 404 e sem
configuração de servidor.

## Rodar localmente

```bash
npm install
npm run dev            # http://localhost:5173/ortoquestoes/
npm run build          # gera dist/
npm run preview        # serve dist/ como será publicado
```

## Endereço de publicação

O caminho de publicação está definido em **um único lugar**, `vite.config.ts`:

```bash
BASE_ORTOQUESTOES=/ortoquestoes/ npm run build   # GitHub Pages em subdiretório (padrão)
BASE_ORTOQUESTOES=/ npm run build                # domínio próprio na raiz
```

Nenhum caminho absoluto para recurso interno existe no código: tudo deriva de
`import.meta.env.BASE_URL` através de `src/config.ts`. Migrar para o domínio próprio é trocar essa
variável — não há alteração de código.

---

## Importar um PDF de tema

As questões chegam em PDFs separados por tema. O pipeline é reproduzível e idempotente:
reprocessar o mesmo PDF gera o mesmo resultado, e reprocessar um tema não toca nos outros.

```bash
pip install pymupdf fonttools

# 1. importar (gabarito no fim do próprio PDF)
python3 scripts/importar_pdf.py pdfs/mao.pdf --tema mao

# 1b. ou com o gabarito em arquivo separado
python3 scripts/importar_pdf.py pdfs/pediatria.pdf --tema pediatria \
    --gabarito pdfs/pediatria-gabarito.pdf

# 2. reconstruir o índice que a interface baixa
python3 scripts/gerar_indice.py

# 3. validar antes de publicar
python3 scripts/validar_acervo.py
```

O slug do tema (`quadril`, `joelho`, `coluna`, …) vem de `src/dados/taxonomia.json`. Um tema que
não existe lá é recusado — a taxonomia é a fonte da verdade e deve ser editada primeiro.

### Etiquetas: deixe o PDF ditar

Quando o PDF já traz etiqueta de assunto em cada questão, ela vale mais do que qualquer lista
inventada — é o vocabulário de quem montou o banco. Um script lê e grava:

```bash
python3 scripts/etiquetas_do_pdf.py --tema quadril --seco pdfs/quadril.pdf   # só mostra
python3 scripts/etiquetas_do_pdf.py --tema quadril pdfs/quadril.pdf          # grava
```

O primeiro rótulo do cabeçalho é a área, e às vezes ela é o próprio tema com outra palavra
("Tumor" para "Tumores ósseos e de partes moles"). Declare isso com `--apelido` para não virar
uma etiqueta repetida em todas as questões:

```bash
python3 scripts/etiquetas_do_pdf.py --tema tumores --apelido Tumor pdfs/tumores.pdf
```

### Opções úteis

| Opção | Quando usar |
| --- | --- |
| `--gabarito arquivo.pdf` | o gabarito veio em arquivo separado |
| `--gabarito-formato grade` | forçar leitura posicional de folha de respostas |
| `--gabarito-formato lista` | forçar leitura de pares "número letra" pelo texto |
| `--faixa 1-202` | importar só parte da numeração, quando dois arquivos se sobrepõem |
| `--colunas 2` | PDF diagramado em duas colunas |
| `--prova TEOT --ano 2019` | o PDF não informa prova/ano em lugar nenhum |
| `--seco` | só ver o relatório, sem gravar nada |
| `--sem-render-lacunas` | não renderizar figuras vetoriais a partir das lacunas do texto |
| `--sobrescrever-revisadas` | reimportar por cima de questões já conferidas (perde a revisão) |
| `--area-minima-figura 0.01` | o PDF tem figuras pequenas sendo descartadas como enfeite |

### O que o pipeline faz

1. **Lê o texto pelos identificadores de glifo.** Muitos PDFs de prova usam fonte
   Type0/Identity-H sem `ToUnicode` utilizável. Nesses arquivos a extração comum devolve o
   enunciado embaralhado, **sem espaço nenhum**, e troca por espaço ou por U+FFFD os glifos que não
   consegue mapear — perda silenciosa. O pipeline usa `get_texttrace()` para pegar o glifo
   verdadeiro e traduz pelo `cmap` da fonte embutida no próprio PDF.
2. **Agrupa por linha visual.** Pedaços na mesma altura viram uma linha, e um vão largo dentro da
   linha separa blocos. É isso que permite ler um cabeçalho `Questão 288 | Tema | Etiqueta`, que no
   fluxo do PDF são quatro operações de texto sem relação nenhuma.
3. Detecta camada de texto. Sem camada, aplica reconhecimento óptico e **sinaliza no relatório** que
   o arquivo exige conferência mais atenta.
4. Segmenta as questões pela numeração, usando a maior subsequência crescente de números — é o que
   separa `12.` de início de questão de um `12` citado dentro do enunciado.
5. Separa enunciado das alternativas exigindo delimitador após a letra (`A)`, `(A)`, `A -`, `A=`).
   Sem isso, um enunciado que começa com "A radiografia…" seria lido como alternativa A. Se nada
   for encontrado com o padrão estrito, tenta o frouxo **e avisa**.
6. **Usa a etiqueta do próprio PDF como subtema** quando ela existe — etiqueta de origem não é
   proposta, é dado. Onde não existe, propõe a partir do enunciado e marca
   `subtemasPendentes: true`. Proposta nunca vira definitiva sem revisão humana.
7. Lê o gabarito no fim do próprio arquivo ou em arquivo separado. Reconhece dois formatos: pares
   "número letra" em texto, e **folha de respostas em grade**, lida por posição. Numeração de
   página de grade sem números impressos é **inferida pela geometria e o relatório diz exatamente
   quais questões conferir**. Questões anuladas recebem `anulada: true` e ficam fora do cálculo de
   desempenho.
8. Extrai as imagens do enunciado com nome previsível (`pediatria/pediatria-0288-1.jpeg`) e, quando
   a figura é vetorial, renderiza a lacuna vertical da página — sempre sinalizando o recorte para
   conferência. Crédito de figura ("Fonte: …") sai do enunciado e vai para `referencias` e para a
   legenda da imagem: nada é descartado, só colocado no campo certo.
9. Identifica prova e ano **só** em cabeçalho de prova de verdade (`TEOT 2019`). Um ano solto numa
   linha não conta: quase sempre é a quebra final de uma referência bibliográfica, e aceitá-lo
   contamina todas as questões seguintes. Sem cabeçalho, os campos ficam nulos e vão para o
   relatório.
10. Detecta **questões repetidas** no tema e separa as que têm resposta divergente — mesma pergunta
    com gabaritos que apontam para conteúdos diferentes é erro na fonte, e vai para o relatório sem
    que nenhuma cópia seja alterada.
11. Emite `relatorios/<tema>-<arquivo>.md` com os números, as listas para conferência e as 20
    extrações de menor confiança, com o trecho problemático.

**Regra central: em caso de dúvida, sinalizar e não adivinhar.** Uma questão com gabarito errado é
pior do que uma questão ausente.

### Conferir o relatório

Abra `relatorios/<tema>.md` e confira, nesta ordem:

1. **Alertas** — em especial qualquer numeração de gabarito que tenha sido inferida. O relatório
   nomeia as questões exatas a conferir no original.
2. **Questões sem gabarito** — se forem muitas, o formato do gabarito não foi reconhecido.
3. **Alternativas fora de 4 ou 5** — quase sempre significa quebra de segmentação.
4. **Repetidas com resposta divergente** — decisão sua: uma das cópias está errada na fonte.
5. **Citam figura sem imagem** — vá ao PDF e veja se a figura existe mesmo. Às vezes o próprio PDF
   de origem tem o espaço em branco.
6. **As 20 de menor confiança** — leia o trecho de cada uma no PDF original.

Depois de conferir uma questão no JSON do tema, marque `"revisado": true`. A partir daí a
reimportação **preserva** aquela questão inteira. Comentário, referências e dificuldade são
preservados sempre, revisada ou não — o pipeline nunca apaga trabalho humano.

---

### Figura que falta no PDF

Às vezes o PDF de origem cita uma figura e o espaço vem em branco, ou traz um
ícone de imagem quebrada. O relatório lista essas questões, e a imagem entra à mão:

```bash
python3 scripts/anexar_imagem.py --listar-faltantes pediatria
python3 scripts/anexar_imagem.py pediatria-0483 ~/prints/linha-perkins.png \
    --legenda "Fonte: Tachdjian, 6. ed."
python3 scripts/gerar_indice.py
```

A imagem entra marcada com `"manual": true` e, por causa dessa marca, **sobrevive
a qualquer reimportação do PDF** — o pipeline reextrai as figuras do arquivo e
mantém as anexadas à mão por cima.

## Publicar uma atualização

```bash
python3 scripts/gerar_indice.py && python3 scripts/validar_acervo.py   # tem que passar
npm run build
git add -A && git commit -m "acervo: importa tema X" && git push
```

### Primeira publicação

Uma vez só, no repositório: **Settings → Pages → Source: GitHub Actions**.

Feito isso, `.github/workflows/publicar.yml` publica a cada push. Ele valida o acervo e roda os
testes antes de construir: se a validação falhar, nada vai ao ar. O endereço fica

```
https://<usuario>.github.io/ortoquestoes/
```

O workflow dispara em `main`, `master` e nas branches `claude/**` — enquanto o repositório não
tiver branch principal, a publicação sai da branch de trabalho.

> **Nunca copie o conteúdo de `dist/` para a raiz do repositório.** O `index.html` construído
> ocupa o mesmo caminho do `index.html` que é o código-fonte, e sobrescrevê-lo quebra o build
> (`Rollup failed to resolve import "/ortoquestoes/assets/..."`). O site publicado sai do
> workflow ou de uma branch separada, nunca de dentro da branch de código.

### Subir o build à mão

Se preferir não usar Actions, `npm run build` gera `dist/`, que é o site inteiro e funciona em
qualquer hospedagem estática. Para o GitHub Pages por branch, jogue o conteúdo de `dist/` na raiz
de uma branch `gh-pages` e aponte **Settings → Pages → Source: Deploy from a branch**. O
`.nojekyll` já vai junto no build, para o Pages não tentar processar os arquivos com Jekyll.

---

## Estrutura

```
public/acervo/indice.json      metadados de todas as questões, sem enunciado (é o que a home baixa)
public/acervo/temas/<slug>.json questões completas de um tema, carregadas sob demanda
public/imagens/<slug>/          figuras extraídas dos PDFs
public/marca/                   marca horizontal, empilhada, símbolo; favicon na raiz de public/
src/dados/taxonomia.json        temas e subtemas — fonte da verdade, editável
src/dados/tipos.ts              modelo de dados, espelhado no pipeline
scripts/importar_pdf.py         pipeline de importação
scripts/gerar_indice.py         reconstrói o índice a partir dos temas
scripts/validar_acervo.py       validação, retorna código de erro
scripts/anexar_imagem.py        anexa à mão a figura que falta no PDF de origem
scripts/etiquetas_do_pdf.py     lê as etiquetas do PDF e atualiza a taxonomia
scripts/sinonimos.json          palavras-chave por subtema, para a proposta de classificação
scripts/texto_pdf.py            extração por identificador de glifo, para fonte sem ToUnicode
scripts/gabarito.py             leitura de gabarito em lista ou em folha de respostas
fixtures/gerar_pdf_teste.py     PDF sintético para exercitar o pipeline
fixtures/verificacao.mjs        verificação de ponta a ponta no navegador
fixtures/testar_deteccao.py     casos que o detector de figura ausente precisa acertar
docs/logotipo.html              as três direções de logotipo, lado a lado
```

### Formato de uma questão

```json
{
  "id": "mao-0001",
  "tema": "Mão e punho",
  "subtemas": ["Síndrome do túnel do carpo"],
  "prova": "TEOT",
  "ano": 2019,
  "dificuldade": null,
  "enunciado": "…",
  "imagens": [{ "arquivo": "mao/mao-0001-1.png", "legenda": null }],
  "alternativas": [{ "letra": "A", "texto": "…" }],
  "gabarito": "A",
  "comentario": null,
  "referencias": [],
  "anulada": false,
  "revisado": false,
  "subtemasPendentes": true,
  "origem": { "arquivo": "mao.pdf", "pagina": 4, "numeroOriginal": 12 }
}
```

`comentario`, `comentariosComunidade`, `referencias`, `dificuldade`, `ano`, `prova` e `imagens` são
opcionais. A interface se
comporta corretamente com qualquer um ausente, com cinco alternativas e com questões anuladas.
`origem` existe para voltar ao PDF e conferir; `revisado` diz se um humano já validou a extração.

---

## Verificação antes de entregar

```bash
npm run build
npm run preview &                                   # serve em /ortoquestoes/
CHROMIUM=/caminho/do/chromium node fixtures/verificacao.mjs
```

A verificação exercita: filtros e contadores, árvore de assuntos com seleção múltipla sem fechar,
treino rápido, simulado com tempo (gabarito guardado até a entrega),
dez questões respondidas pelo teclado, mapa pelo atalho, resumo, link direto de questão, id
inexistente, desempenho por tema, formulário de comentário da comunidade, 320 pixels sem rolagem
horizontal e sem texto cortado, tema escuro, funcionamento com `localStorage` bloqueado e console
limpo.

O detector de figura ausente tem teste próprio, com casos tirados de enunciados reais:

```bash
python3 fixtures/testar_deteccao.py
```

Para exercitar o pipeline sem um PDF real:

```bash
python3 fixtures/gerar_pdf_teste.py fixtures/teste-mao.pdf
python3 scripts/importar_pdf.py fixtures/teste-mao.pdf --tema mao --seco
```

---

## Comentários da comunidade

O site não tem servidor nem cadastro, então não existe formulário que grave direto no acervo. O
caminho é o e-mail — mas **`mailto:` sozinho não serve**: quando o navegador não tem programa de
e-mail registrado, o clique não faz nada e a pessoa acha que o site quebrou. Por isso a ação
principal é copiar o texto, que funciona em qualquer lugar, e o e-mail vem como caminho
secundário (Gmail na web, ou o programa instalado). O fluxo: na questão respondida, **Comentar esta questão** abre um
formulário que monta a mensagem já estruturada (identificador da questão, link direto, gabarito,
enunciado, comentário, referência e o crédito de quem escreveu) e abre o programa de e-mail do
colega, onde ele anexa os prints do livro. A identificação fica guardada no navegador dele para não
ser redigitada a cada questão.

Do outro lado, o comentário conferido entra no JSON do tema:

```json
"comentariosComunidade": [
  {
    "texto": "…",
    "autor": "Dra. Fulana de Tal",
    "especialidade": "Ortopedia e Traumatologia",
    "subespecialidade": "Ortopedia pediátrica",
    "centro": "Hospital X, São Paulo",
    "referencias": ["Tachdjian, 6ª ed., p. 412"],
    "imagens": [{ "arquivo": "comunidade/sprengel-1.png", "legenda": "Tachdjian, p. 412" }],
    "data": "2026-09-05"
  }
]
```

A validação recusa contribuição sem texto ou sem crédito — o que é publicado tem autor. A
reimportação do PDF nunca apaga esse campo.

## Marca

Três direções desenhadas em SVG estão em `docs/logotipo.html`, lado a lado em 16, 24 e 48 pixels e
sobre fundo escuro. A escolhida por padrão é a **B — letra Q com cauda de fio de Kirschner**, por ser
a única que continua legível a 16 pixels: o contorno do Q tem contraforma grande e a cauda é um
traço único. Para trocar a marca do site inteiro, mude `DIRECAO_MARCA` em `src/marca/Simbolo.tsx`.

## Licença

Os enunciados pertencem às bancas das provas originais e estão reproduzidos para fins de estudo. O
código do site é de uso livre.
