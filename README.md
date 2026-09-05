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
pip install pymupdf

# 1. importar
python3 scripts/importar_pdf.py pdfs/mao.pdf --tema mao

# 2. reconstruir o índice que a interface baixa
python3 scripts/gerar_indice.py

# 3. validar antes de publicar
python3 scripts/validar_acervo.py
```

O slug do tema (`mao`, `joelho`, `coluna`, …) vem de `src/dados/taxonomia.json`. Um tema que não
existe lá é recusado — a taxonomia é a fonte da verdade e deve ser editada primeiro.

### Opções úteis

| Opção | Quando usar |
| --- | --- |
| `--colunas 2` | PDF diagramado em duas colunas |
| `--prova TEOT --ano 2019` | o PDF não informa prova/ano em lugar nenhum |
| `--seco` | só ver o relatório, sem gravar nada |
| `--sem-render-lacunas` | não renderizar figuras vetoriais a partir das lacunas do texto |
| `--sobrescrever-revisadas` | reimportar por cima de questões já conferidas (perde a revisão) |
| `--area-minima-figura 0.01` | o PDF tem figuras pequenas sendo descartadas como enfeite |

### O que o pipeline faz

1. Detecta camada de texto. Sem camada, aplica reconhecimento óptico e **sinaliza no relatório** que
   o arquivo exige conferência mais atenta.
2. Segmenta as questões pela numeração, usando a maior subsequência crescente de números — é o que
   separa `12.` de início de questão de um `12` citado dentro do enunciado.
3. Separa enunciado das alternativas exigindo delimitador após a letra (`A)`, `(A)`, `A -`). Sem
   isso, um enunciado que começa com "A radiografia…" seria lido como alternativa A. Se nada for
   encontrado com o padrão estrito, tenta o frouxo **e avisa**.
4. Localiza o gabarito no fim do documento (cabeçalho, ou página majoritariamente composta de pares
   número-letra), interpreta coluna, linha ou tabela, e marca `anulada: true` onde a prova anulou.
   Questões anuladas ficam fora do cálculo de desempenho.
5. Extrai as imagens do enunciado com nome previsível (`mao/mao-0003-1.png`) e, quando a figura é
   vetorial, renderiza a lacuna vertical da página — sempre sinalizando para conferência do recorte.
6. Identifica prova e ano quando o PDF informa; quando não informa, deixa **nulo** e registra no
   relatório. Nada é inventado.
7. Propõe subtema a partir do enunciado, sempre marcado como `subtemasPendentes: true`. Proposta
   nunca vira definitiva sem revisão humana.
8. Emite `relatorios/<tema>.md` com os números, as listas para conferência e as 20 extrações de
   menor confiança, com o trecho problemático.

**Regra central: em caso de dúvida, sinalizar e não adivinhar.** Uma questão com gabarito errado é
pior do que uma questão ausente.

### Conferir o relatório

Abra `relatorios/<tema>.md` e confira, nesta ordem:

1. **Questões sem gabarito** — se forem muitas, o formato do gabarito não foi reconhecido.
2. **Alternativas fora de 4 ou 5** — quase sempre significa quebra de segmentação.
3. **Citam figura sem imagem** — vá ao PDF e veja se a figura existe.
4. **As 20 de menor confiança** — leia o trecho de cada uma no PDF original.

Depois de conferir uma questão no JSON do tema, marque `"revisado": true`. A partir daí a
reimportação **preserva** aquela questão inteira. Comentário, referências e dificuldade são
preservados sempre, revisada ou não — o pipeline nunca apaga trabalho humano.

---

## Publicar uma atualização

```bash
python3 scripts/gerar_indice.py && python3 scripts/validar_acervo.py   # tem que passar
npm run build
git add -A && git commit -m "acervo: importa tema X" && git push
```

O workflow `.github/workflows/publicar.yml` publica no GitHub Pages a cada push na branch padrão.
Para funcionar, é preciso habilitar uma vez em **Settings → Pages → Source: GitHub Actions**.

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
scripts/sinonimos.json          palavras-chave por subtema, para a proposta de classificação
fixtures/gerar_pdf_teste.py     PDF sintético para exercitar o pipeline
fixtures/verificacao.mjs        verificação de ponta a ponta no navegador
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

`comentario`, `referencias`, `dificuldade`, `ano`, `prova` e `imagens` são opcionais. A interface se
comporta corretamente com qualquer um ausente, com cinco alternativas e com questões anuladas.
`origem` existe para voltar ao PDF e conferir; `revisado` diz se um humano já validou a extração.

---

## Verificação antes de entregar

```bash
npm run build
npm run preview &                                   # serve em /ortoquestoes/
CHROMIUM=/caminho/do/chromium node fixtures/verificacao.mjs
```

A verificação exercita: filtros e contadores, dez questões respondidas pelo teclado, mapa pelo
atalho, resumo, link direto de questão, id inexistente, 320 pixels sem rolagem horizontal e sem
texto cortado, tema escuro, funcionamento com `localStorage` bloqueado e console limpo.

Para exercitar o pipeline sem um PDF real:

```bash
python3 fixtures/gerar_pdf_teste.py fixtures/teste-mao.pdf
python3 scripts/importar_pdf.py fixtures/teste-mao.pdf --tema mao --seco
```

---

## Marca

Três direções desenhadas em SVG estão em `docs/logotipo.html`, lado a lado em 16, 24 e 48 pixels e
sobre fundo escuro. A escolhida por padrão é a **B — letra Q com cauda de fio de Kirschner**, por ser
a única que continua legível a 16 pixels: o contorno do Q tem contraforma grande e a cauda é um
traço único. Para trocar a marca do site inteiro, mude `DIRECAO_MARCA` em `src/marca/Simbolo.tsx`.

## Licença

Os enunciados pertencem às bancas das provas originais e estão reproduzidos para fins de estudo. O
código do site é de uso livre.
