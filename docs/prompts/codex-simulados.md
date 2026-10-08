# Prompt para agentes externos (ChatGPT Codex): capítulo do livro em OrtoQuestões Simulados

Este arquivo é o roteiro completo para outro agente (por exemplo, o ChatGPT Codex) repetir o
trabalho que é feito aqui: ler as questões oficiais do assunto, extrair os padrões da banca e criar
questões novas, já comentadas, no acervo. Ele é escrito de propósito em passos pequenos e
verificáveis. Siga na ordem. Não pule etapa. Não improvise ferramenta: use os scripts citados.

---

## 0. O que você vai receber

O pedido vem assim:

```
TEMA DO ACERVO: <slug, por exemplo ombro-cotovelo>
ASSUNTO: <por exemplo Instabilidade glenoumeral>
CAPÍTULO: <livro, edição, número e título, por exemplo Rockwood 10ª ed., cap. 35, Glenohumeral Instability>
PDF: <anexado ou caminho>
```

Se faltar o PDF do capítulo, PARE e peça. Nunca escreva questões de memória: tudo o que entra na
questão e no comentário precisa estar no texto do capítulo.

Slugs válidos de tema: mao, ombro-cotovelo, quadril, joelho, coluna, pe-tornozelo, trauma,
pediatria, tumores, conceitos-basicos, ortopedia-geral, osteometabolicas.

---

## 1. Ler antes de fazer qualquer coisa (obrigatório)

Leia por inteiro, nesta ordem:

1. `AGENTS.md`
2. `docs/padrao-questoes-simulado-teot-taro.md` (o padrão das questões e as lições aprendidas)
3. `docs/padrao-editorial-comentarios.md` (o padrão do comentário)
4. `docs/exemplos/mao-0853.json` (o exemplo aprovado de comentário: veja o tamanho e a profundidade)
5. `scripts/simulados/README.md` (o passo a passo com os comandos)
6. `scripts/simulados/exemplo_lote.py` (o formato do arquivo de lote)
7. `docs/simulados/mapas-da-banca.md`, em especial a seção **Instabilidade glenoumeral**, que é o
   modelo de engenharia reversa a imitar.

Depois, abra 3 questões de simulado já publicadas do mesmo tema para ver o resultado final. Elas
estão em `public/acervo/temas/<tema>.json` (as que têm `"simulado": true`) e os comentários em
`public/acervo/comentarios/<tema>.json` (mesmo id).

---

## 2. Preparar o ambiente

```
python3 -c "import pymupdf, PIL" || pip install pymupdf pillow
mkdir -p /tmp/simulado        # pasta de trabalho FORA do repositório
```

Se o PDF veio anexado, copie para `/tmp/simulado/capitulo.pdf`. **O PDF nunca entra no repositório**
(nem em commit, nem em `public/`, nem em `pdfs/`).

---

## 3. O que já existe

```
python3 scripts/simulados/registro.py
```

Anote: se esse capítulo ou assunto já tem simulados (não repetir), e a profundidade dos
comentários aprovados. O lote novo não precisa igualar ou superar o tamanho deles.

---

## 4. Engenharia reversa da banca (a etapa mais importante)

### 4.1 Listar as questões oficiais do assunto

Monte um regex com os termos do assunto (em português, com variações) e os subtemas do tema.
Para ver os subtemas válidos do tema:

```
python3 -c "import json;t=json.load(open('src/dados/taxonomia.json'));print([s for x in t['temas'] if x['slug']=='<tema>' for s in x['subtemas']])"
```

Exemplo real (instabilidade):

```
python3 scripts/simulados/mapear_banca.py --regex 'bankart|hill.?sachs|latarjet|instabilidade|luxa..o (anterior|posterior) do ombro|remplissage|glenoid track' --subtema 'Instabilidade' --tema ombro-cotovelo > /tmp/simulado/oficiais.txt
```

- A saída padrão (`oficiais.txt`) traz cada questão oficial do TEOT e do TARO com prova, ano,
  gabarito e alternativas.
- A saída de erro traz o resumo: anos, tamanho do enunciado e das alternativas, como terminam,
  imagem, caso clínico, pares, gabarito, aberturas, epônimos, enunciados repetidos e os simulados
  que já existem no recorte.
- Se o regex pegar questões de outro assunto, rode de novo com `--excluir id1,id2`.

### 4.2 Ler TODAS as questões e escrever o mapa

Leia o `oficiais.txt` inteiro, questão por questão. Não resuma pelo resumo automático. Depois,
escreva uma seção nova em `docs/simulados/mapas-da-banca.md`, no mesmo formato da seção
"Instabilidade glenoumeral", com:

1. **Recorte:** quantas questões, de que anos, quantas por ano.
2. **Fatos carimbados:** os fatos que a banca repete, agrupados (epidemiologia, anatomia, exame e
   imagem, classificação, conduta, técnica e estrutura em risco, complicação), cada um com a prova
   e o ano. Exemplo de linha do mapa real: "Idade é o principal fator de recidiva (TARO 2010, 2012 e
   2024; distratores esporte de colisão, arremesso, hiperfrouxidão)".
3. **Tendência:** o que apareceu nos últimos 5 anos e o que sumiu.
4. **Forma:** abertura típica, tamanho, final em palavra ou dois-pontos, uso de "respectivamente",
   pares 2 por 2, imagem, caso clínico.
5. **Como o examinador pensa:** o tipo de pergunta ("o principal", "o mais frequente", "a estrutura
   em risco"), quais atributos ele cruza nos pares, de onde vêm os distratores (fato verdadeiro de
   outro contexto do mesmo assunto) e em que letras o gabarito se concentra.
6. **Divergências e lacunas:** gabarito que contraria o capítulo; assuntos do capítulo que a banca
   ainda não cobrou mas têm cara de prova.

### 4.3 Escrever o PLANO antes das questões

Crie `/tmp/simulado/plano.md` com uma tabela, uma linha por questão que você pretende fazer:

| # | Fato do capítulo (com página) | Por que esta questão existe | Formato |
|---|---|---|---|
| 1 | Nervos em risco no LATARJET (p. N do r.txt) | Fato carimbado: TARO 2019 (musculocutâneo) e TEOT 2024 (axilar e musculocutâneo); outro ângulo: em que tempo da cirurgia cada um corre risco | par com "respectivamente" |
| 2 | Remplissage: o que é e quando indicar (p. N) | Tendência recente: TARO 2021 e 2022 | direta |

A coluna "Por que esta questão existe" só aceita três motivos:

- **Fato carimbado** que a banca repete, cobrado por outro ângulo (pode ser bem parecido com a
  questão real: tudo bem, desde que reforce o fato que cai).
- **Tendência recente** da banca (apareceu de 2021 para cá).
- **Lacuna com cara de prova:** número, corte, epônimo, "o principal" ou "o mais frequente" do
  capítulo que a banca ainda não cobrou.

Se uma questão não cabe em nenhum dos três, ela não entra. **Não faça questão só por fazer.**
Corte também: detalhe de estudo experimental (cadáver, animal, série de N casos), biologia
molecular fina, número sem consequência prática, opinião do autor, e o que já existe nos
simulados do acervo (o resumo do passo 4.1 lista). No máximo 1 ou 2 questões "difíceis de banca"
por lote.

**Quantidade:** a que o capítulo sustenta com qualidade. Em geral 15 a 25. Não é meta: 12 boas
valem mais que 30 fracas.

---

## 5. Extrair o capítulo

```
python3 -I scripts/simulados/extrair_capitulo.py /tmp/simulado/capitulo.pdf /tmp/simulado cap35
```

Gera `r.txt` (texto por página, com "===== PAGINA N ====="), `secoes.txt` (mapa dos títulos),
`figuras.txt` (legendas por página), `img/` (figuras) e `mosaico*.png` (miniaturas).
Leia o `r.txt` inteiro antes de escrever. Use o número de página do `r.txt` no campo `pag`.

---

## 6. Escrever as questões em lotes

Copie o modelo para cada lote de 6 a 9 questões:

```
cp scripts/simulados/exemplo_lote.py /tmp/simulado/lote_a.py
```

Preencha `CAP`, `REF` (livro, edição, capítulo, título e autores), `ARQ` (nome do PDF, só como
referência) e a lista `QUESTOES`. Cada questão é um `dict` com:

- `sub`: lista com o nome EXATO de um subtema do tema (veja o comando do passo 4.1);
- `pag`: página do `r.txt` onde está o fato;
- `gab`: letra correta;
- `enun`: enunciado;
- `alts`: lista com as 4 alternativas, na ordem A, B, C, D;
- `conceito`, `correta` e `inc`: o comentário (seção 7);
- `img` (opcional): `("arquivo_sem_ext", "figura 35-12", (x0, y0, x1, y1))`, com o arquivo em
  `/tmp/simulado/img/`.

### Regras do enunciado e das alternativas (todas obrigatórias)

1. Enunciado curto, 60 a 160 caracteres, como **frase incompleta que a alternativa completa**.
   Aberturas da banca: "Na fratura...", "Na luxação...", "No tratamento...", "A estrutura...".
2. **Proibido:** EXCETO, INCORRETA, "assinale", "qual das alternativas", ponto de interrogação no
   fim, e **lacuna de completar** ("______"). Quando forem dois dados, use "são,
   respectivamente," e alternativas "dado 1; dado 2".
3. Quatro alternativas **distintas**, da mesma classe (só nervos, só graus, só tipos da mesma
   classificação), começando com **minúscula**, terminando com ponto quando completam a frase,
   em **ordem crescente de tamanho**; números sempre em ordem crescente.
4. Distratores **verdadeiros em outro contexto** do mesmo assunto (o nervo de outro acesso, o tipo
   vizinho da classificação, o valor de outra fratura). Nunca absurdos.
5. Pares 2 por 2 (dois atributos combinados) em cerca de um quarto das questões.
6. Epônimos em **CAIXA ALTA**: BANKART, HILL-SACHS, LATARJET, NEER.
7. Caso clínico só de vez em quando (até 1 em 10), curto.
8. Gabarito equilibrado no conjunto (cerca de 25% cada letra, puxando um pouco para C e D), sem
   sequência previsível.
9. Figura só quando permite pergunta do tipo da prova (estrutura assinalada, classificação da
   imagem, técnica demonstrada). Recorte o painel certo. Se a figura traz escrita a resposta (um
   rótulo, um tipo), cubra com retângulo branco num arquivo novo em `/tmp/simulado/img/` e **abra a
   imagem para conferir** antes de aplicar.

---

## 7. O comentário (o padrão que mais erra; leia com atenção)

**Atualização do dono em 08/10/2026:** comentário natural e útil, sem piso de
caracteres. Explicar cada alternativa sem enchimento. A engenharia reversa e os
motivos para criar a questão ficam no mapa e no plano, não em parágrafos artificiais
no comentário. Esta diretriz substitui os limites de extensão abaixo.

O comentário é **uma aula do trecho do capítulo**, que permite entender o assunto sem abrir o
livro. Siga `docs/padrao-editorial-comentarios.md` e a profundidade de `docs/exemplos/mao-0853.json`, ajustada ao assunto.

- `conceito`: ensina do zero, em parágrafos que conectam as ideias. Definição, mecanismo, os números
  do livro com o contexto de cada um, a figura ou tabela citada, relações relevantes com outros pontos do
  capítulo. Tabela só quando
  compara de verdade. Use o fecho `> **Na prova:**` somente quando ele ajudar.
- `correta`: começa EXATAMENTE com `**X: texto da alternativa.**` (X = letra do gabarito) e explica
  por que está certa, com o dado do livro e onde ele aparece. Acrescente contexto
  somente quando ele ajudar a entender a resposta.
- `inc`: um texto para CADA uma das três letras erradas. Cada um tem uma **explicação própria, sem extensão fixa**: o que a alternativa diz, de onde vem esse dado no livro (o distrator é
  verdadeiro em outro contexto), por que não serve aqui e como diferenciar. Comece com uma frase
  curta em negrito, por exemplo `**É o nervo do acesso posterior.**`.
- **Tamanho:** sem mínimo de caracteres. Escrever o necessário para entender a relação e
  diferenciar cada alternativa; cortar repetição e conteúdo que não ajuda a resolver.
- **Só o que o capítulo diz.** Não invente número, autor, mecanismo ou estatística. Se o texto e a
  legenda do livro divergem, pergunte só o valor que não diverge. Se a banca cobrou algo de outra
  edição, cobre uma relação inequívoca do capítulo atual e registre a diferença no mapa.
- **Proibido no texto:** travessão (—) e meia-risca (–) (use vírgula, dois-pontos ou parênteses),
  itálico com asterisco simples (`*assim*`), marca-texto `==assim==`, emoji, frases telegráficas
  ("Errada. Não é isso.").
- Formatação aceita: `**negrito**`, parágrafos separados por linha em branco, listas com `-`,
  tabelas Markdown e citação com `>`.

---

## 8. Conferir (repita até zerar erros e avisos)

```
python3 scripts/simulados/aplicar_lote.py /tmp/simulado <tema> lote_a,lote_b,lote_c --conferir
```

O script bloqueia: alternativas repetidas, gabarito incoerente com as chaves de `inc`, `correta`
sem `**X:`, subtema inexistente, travessão, meia-risca, itálico simples, `==`, EXCETO, INCORRETA,
"assinale", lacuna e figura ausente. Avisa: enunciado fora da faixa. **Corrija todos os erros E todos os avisos.** Ele mostra a distribuição do gabarito e a
mediana dos comentários: ajuste até ficar equilibrado. A mediana é descritiva, não uma meta.

### Revisão manual, questão por questão (obrigatória, além do script)

Para cada questão, responda sim a todas. Se alguma for não, reescreva.

1. Esta questão tem um motivo no plano (carimbado, tendência ou lacuna)?
2. Ela poderia estar numa prova do TARO ou do TEOT de 2021 em diante?
3. O fato está no `r.txt`, na página indicada? (abra e confira)
4. Só uma alternativa é defensável pelo capítulo?
5. As erradas são verdadeiras em outro contexto do mesmo assunto?
6. Cada alternativa errada tem parágrafo próprio, sem copiar o texto da outra?
7. O comentário ensinaria alguém que nunca leu o capítulo?
8. Não há nenhuma afirmação que o capítulo não sustente?

---

## 9. Aplicar e validar

```
python3 scripts/simulados/aplicar_lote.py /tmp/simulado <tema> lote_a,lote_b,lote_c
python3 scripts/gerar_indice.py
python3 scripts/validar_acervo.py
npm test
node fixtures/testar_revisao.mjs
git status --short
```

Tudo tem de passar. O `git status` só pode mostrar:

- `public/acervo/temas/<tema>.json`
- `public/acervo/comentarios/<tema>.json`
- `public/acervo/indice.json`, `public/acervo/busca.json` e `public/acervo/progresso.json`
- `public/imagens/<tema>/...` (se houve figura)
- `docs/simulados/mapas-da-banca.md`

Se aparecer qualquer outro arquivo (principalmente um PDF), desfaça antes do commit.
**Nunca** altere questão oficial, gabarito oficial ou comentário de outra questão. **Nunca** marque
`"conferido": true`.

---

## 10. Registrar o aprendizado

No fim da seção do assunto em `docs/simulados/mapas-da-banca.md`, acrescente:

- **Aproveitamento do capítulo:** faixa de ids criados (por exemplo, ombro-cotovelo-0576 a 0598),
  quantas questões, quantas com figura, e os fatos cobertos.
- **Pendências:** divergências entre a banca e o capítulo, e o que ficou de fora e por quê.

Se aprendeu algo que vale para todos os capítulos, acrescente em "Lições aprendidas" de
`docs/padrao-questoes-simulado-teot-taro.md`.

---

## 11. Commit e resumo

Um commit só, com a mensagem:

```
Simulados: <assunto> (<livro> cap. <N>), <quantidade> questões comentadas
```

No resumo final (e na descrição do PR), mostre:

1. Uma tabela com id, gabarito, enunciado curto e o motivo da questão (do plano).
2. A distribuição do gabarito e a mediana dos comentários (do `--conferir`).
3. O que da banca ficou sem questão e por quê.
4. Qualquer divergência entre a banca e o capítulo.

---

## Lista rápida do que NÃO fazer

- Escrever questão de memória, sem o PDF.
- Pular a engenharia reversa ou o plano.
- Fazer questão sem motivo, só para aumentar o número.
- Enunciado negativo, com "assinale" ou com lacuna "______".
- Alternativas fora da ordem de tamanho ou com maiúscula no início.
- Comentário curto, em tópicos, ou com a alternativa correta sem explicação.
- Travessão, meia-risca, itálico com asterisco simples, `==`, emoji.
- PDF no repositório.
- Mexer em questões oficiais ou em comentários de outras questões.
- `"conferido": true`.
