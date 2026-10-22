# Protocolo da Cirurgia da Mão: livros locais → OrtoQuestões Simulados por prova

Pedido do Tales (19/10/2026). Ele vai usar o Claude Code **em outro computador, em outra conta**, com os
livros (o principal é o **Green**, em português) e os resumos salvos numa pasta local. A partir das provas do
**SIMÃO** (Simulado do Exame para Obtenção do Título de Especialista em Cirurgia da Mão) e da **prova de
título da SBCM** (Sociedade Brasileira de Cirurgia da Mão), fazemos **OrtoQuestões Simulados**: cada questão
da prova vira uma questão nossa, **parecida, mas não igual**, com comentário de aula citando o livro e a
página.

O comando pronto para colar na outra conta está em [docs/prompts/claude-mao-provas.md](../prompts/claude-mao-provas.md).
O andamento fica em [PROGRESSO.md](PROGRESSO.md). Este arquivo explica o porquê de cada passo.

## 0. Qual prova vira simulado e qual entra com o nome real (regra do Tales, 19/10/2026)

Os arquivos misturam provas. A regra é uma só:

| Banca | O que fazer |
|---|---|
| **SBCM** (prova de título da Sociedade Brasileira de Cirurgia da Mão) e **SIMÃO** | **OrtoQuestões Simulados**: questão reescrita com outras palavras, mesmo ano, `simulado: true`, `prova` = `"SBCM"` ou `"SIMÃO"` e `ano` da prova (seções 5 a 8) |
| **Todas as outras** (ABC, Unesp, USP, UFG, PUC-SP, INTO, Einstein, FMRP, IAUPE, UERJ etc.) | **Questão oficial com o nome real**: texto original, `prova` = nome da instituição, `ano` real, `area: "cirurgia-mao"`, sem `simulado`. Não reescrever |

Para as provas com nome real:

1. **Muitas já estão no site.** Antes de acrescentar, casar com o acervo:
   `python3 scripts/casar_prova.py CADERNO.pdf --prova "Unesp" --ano 2024` (relatório em `relatorios/`).
   A questão que já existe não entra de novo; no máximo ganha prova, ano e gabarito oficial que faltavam
   (`--aplicar`) e comentário, se estiver sem.
2. As que faltam: `python3 scripts/adicionar_prova.py extrair CADERNO.pdf --prova "Unesp" --ano 2024` e
   depois `aplicar` com o lote (com `"area": "cirurgia-mao"`, tema, resposta e comentário no padrão da
   seção 7). Gabarito oficial preservado; sem gabarito, a resposta vem do livro e fica marcada como não
   oficial. Divergência com o Green vai em `alerta`.
3. Nome da prova exatamente como já está no acervo (conferir com `scripts/simulados/registro.py` ou no
   filtro "Prova de origem" do site) para não criar duas grafias da mesma instituição.
4. Registrar a importação em [docs/importacoes/cirurgia-mao-outubro-2026.md](../importacoes/cirurgia-mao-outubro-2026.md)
   (ou num arquivo novo do mês) e no [PROGRESSO](PROGRESSO.md).
5. O caderno original dessas provas também fica só na pasta local (regra 1 abaixo); no acervo entra a
   questão, como nas provas oficiais que já estão no site.

## 1. Regras de ouro (nunca quebrar)

1. **Livro, resumo e prova original nunca vão para o GitHub.** Ficam na pasta local
   (`~/OrtoQuestoes-Biblioteca`, fora do repositório). O script se recusa a trabalhar numa pasta dentro do
   repositório que não esteja no `.gitignore`. Antes de cada commit: `git status` e conferir que só entraram
   `public/acervo/...`, `docs/mao/...` e lotes. Resumos **feitos por nós** podem ir para o repositório (é
   a Biblioteca do site); os resumos que o Tales mandar, não.
2. **Nada de SBCM ou SIMÃO na íntegra.** Nessas duas, não copiar enunciado nem alternativa (as outras bancas entram com o texto real, seção 0). Cada questão é reescrita com outro
   ângulo (seção 6). O script `copia` barra 7 palavras seguidas iguais ao original.
3. **Toda afirmação sai do livro ou do resumo enviado**, nunca de memória. Se o fato não está na
   biblioteca, a questão fica "pendente: sem fonte" no PROGRESSO e não é publicada.
4. **Página só quando é a página impressa do livro**, conferida lendo a página (o número no topo ou no
   rodapé). Resumo não tem página: cita-se o nome do resumo e a seção. Nunca citar a "folha do PDF" como
   página.
5. **Gabarito pelo livro.** Se a prova trouxer gabarito oficial e ele divergir do Green, a questão nova é
   escrita para ter uma só resposta pelo livro, e o comentário explica a divergência com as duas posições.
   Nunca ensinar algo falso para concordar com a banca.
6. **Não divulgar quantidades totais do acervo** em texto nenhum.
7. **Lotes pequenos e publicados um a um** (seção 8): se o limite da conta acabar, o trabalho já feito está
   salvo e o próximo continua do PROGRESSO.

## 2. Preparar o computador novo (uma vez)

1. Instalar o Claude Code, o Git, o Node 20+ e o Python 3. Instalar o **pdftotext** (pacote poppler):
   Mac `brew install poppler`; Linux `sudo apt install poppler-utils`; Windows, poppler para Windows e a
   pasta `bin` no PATH (ou usar o WSL).
2. Clonar o repositório e entrar no branch de publicação:
   `git clone https://github.com/talesrobertosn/ortoquestoes && cd ortoquestoes && git checkout claude/pdfs-questoes-tp64dr && npm ci`.
3. Criar a biblioteca, **fora** do repositório:

   ```
   ~/OrtoQuestoes-Biblioteca/
     livros/     Green (o PDF traduzido inteiro ou por capítulos) e os outros livros
     resumos/    resumos simples e compostos (pdf, docx, md ou txt)
     provas/     SIMAO 2024.pdf, SIMAO 2025.docx, SBCM 2025.pdf ... (gabarito no mesmo arquivo ou em "... gabarito")
   ```

   Nome do arquivo de prova sempre com a **banca e o ano** (é assim que o script e o PROGRESSO se acham).
   Outra pasta? `export OQ_BIBLIOTECA=/caminho` (ou `--pasta /caminho` em cada comando).

## 3. Fase 0: classificar tudo antes de começar

Antes de escrever qualquer questão, a IA monta o mapa completo. Comandos (sempre `python3 -I`):

```bash
python3 -I scripts/mao/biblioteca_local.py inventario     # o que é cada arquivo
python3 -I scripts/mao/biblioteca_local.py indexar        # texto página a página, com página impressa e capítulo
python3 -I scripts/mao/biblioteca_local.py questoes "provas/SIMAO 2024.pdf" simao-2024   # separa a prova em questões
python3 -I scripts/mao/biblioteca_local.py plano simao-2024                                # páginas sugeridas por questão
```

1. **Inventário** (`.oq/inventario.md`): cada arquivo vira **livro**, **resumo simples** (um tema),
   **resumo composto** (vários temas ou capítulos), **prova**, **gabarito** ou **outro**, com páginas,
   faixa de página impressa e capítulos detectados. Conferir e corrigir o que estiver errado renomeando o
   arquivo. PDF "SEM TEXTO" é escaneado: precisa de OCR (por exemplo `ocrmypdf entrada.pdf saida.pdf`)
   antes de indexar.
2. **Edição do livro:** abrir a folha de rosto do Green (`ler "<arquivo>" 1 6 --pdf`) e anotar título,
   edição, autores e tradução exatamente como estão. Essa linha vira o `REF` dos lotes.
3. **Separar a prova** (`questoes`): confere quantas saíram e as marcadas "conferir à mão" (alternativas a
   mais ou a menos). Se a prova é imagem ou a numeração não bateu, separar à mão lendo o arquivo.
4. **Classificar cada questão da prova** e escrever no [PROGRESSO.md](PROGRESSO.md), na seção da prova, uma
   linha por questão **sem copiar o texto**: número, assunto, o que cobra (em palavras nossas), formato
   (epônimo, classificação, número, anatomia, afirmativas "Sobre X", caso clínico), capítulo do Green e
   páginas onde está a resposta, tema e subtema do acervo, situação (`a fazer`). Agrupar em **lotes de 5
   por capítulo do Green**, para ler cada trecho do livro uma vez só.
5. **Dicas reescritas:** se existir `docs/mao/dicas/<prova-ano>.md` (resumo que veio com a prova,
   reescrito em palavras nossas), ler antes de buscar no livro. A dica orienta a busca; a resposta e a
   página saem do Green. Ver [dicas/README.md](dicas/README.md).
6. Conferir a lista do que **já existe** para não repetir: `python3 scripts/simulados/registro.py` e as
   tabelas de [simao-engenharia-reversa.md](../simulados/simao-engenharia-reversa.md) (o SIMÃO 2026 já foi
   feito: `mao-1719` a `mao-1810` e `ombro-cotovelo-0645` a `0652`).

Só depois disso começa a escrita.

## 4. Como ler o livro para cada questão (o que ler de verdade e o que passar rápido)

O livro é grande; ler o capítulo inteiro por questão gasta o limite à toa, e ler só uma frase gera
comentário raso. A regra é: **ler a fundo o trecho que decide a questão e o entorno que explica o porquê;
passar rápido pelo resto.**

**Como achar o trecho:** começar pelas páginas do `plano`. Se não tiverem o assunto, `buscar` com outros
termos: o epônimo (MOBERG, KANAVEL, BLAUTH), o nome em português e a palavra original em inglês (o texto
traduzido às vezes conserva o termo), sinônimos ("dedo em gatilho" e "tenossinovite estenosante"). Depois
`ler "<arquivo>" PAG PAG_FIM` (páginas impressas).

**Ler de verdade (sempre):**

| Tipo de questão | O que ler a fundo |
|---|---|
| Epônimo (técnica, sinal, estrutura) | o parágrafo da definição, a figura e a legenda, e para que serve (indicação) |
| Classificação | a tabela ou o quadro inteiro, a linha que muda a conduta e o tratamento por tipo |
| Número (mm, cm, graus, %, semanas) | a frase do número com o contexto, e se o livro diz que varia entre séries |
| Anatomia | a seção de anatomia do capítulo, as legendas das figuras, variações e relações em risco |
| "Sobre X" com afirmativas | cada afirmativa como uma busca separada: as quatro precisam de fonte |
| Caso clínico | diagnóstico (exame e imagem), indicações, algoritmo, **método preferido dos autores** e complicações |
| Conduta ou técnica | indicação e contraindicação, o passo que a questão cobra, armadilhas e complicações |

Ler também, sempre: o parágrafo antes e o depois do trecho (é ali que está o mecanismo), os quadros de
"pontos-chave", "armadilhas" e "método preferido dos autores", e a tabela que compara as opções.

**Passar rápido (só se a questão perguntar):** introdução histórica, revisão longa de séries da
literatura, passo a passo cirúrgico detalhado que a questão não cobra, resultados de estudos com números
sem consequência prática.

**Não ler:** lista de referências, índice remissivo, agradecimentos.

**Resumos:** servem para achar rápido o que a banca valoriza e para conferir. Se o resumo e o livro
divergirem, vale o livro, e a divergência é explicada no comentário. O comentário cita o livro; o resumo
só é citado (sem página, "Resumo de <tema>, seção <x>") quando o fato só existe nele.

## 5. Resolver antes de reescrever

Para cada questão original:

1. Resolver pela bibliografia: qual é a resposta pelo Green e em que página. Anotar a página impressa.
2. Ver se o original tem defeito (mais de uma resposta, definição trocada, número sem fonte, erro de
   grafia de epônimo). Cerca de um quarto do SIMÃO 2026 tinha: ver as lições em
   [simao-engenharia-reversa.md](../simulados/simao-engenharia-reversa.md).
3. Se houver gabarito oficial, comparar. Divergência vira um parágrafo "**Divergência.**" no comentário.
4. Se o livro não tiver o fato: buscar nos resumos e nos outros livros; sem fonte, marcar "pendente: sem
   fonte" no PROGRESSO e seguir para a próxima.

## 6. Reescrever sem copiar (OrtoQuestões Simulados)

**Ajuste do Tales (19/10/2026):** a questão nova fica **muito parecida com a original**, a mesma pergunta,
o mesmo fato, a mesma resposta, a mesma prova e o **mesmo ano** (`ANO` do lote). Só se **trocam as
palavras**: sinônimos, outra ordem na frase, outra ordem das alternativas. Isso substitui, para estas provas,
a regra antiga de "mudar o ângulo" do SIMÃO 2026.

1. **Mesma pergunta, outras palavras:** "O retalho inguinal é nutrido por qual artéria?" no lugar de "O
   retalho inguinal é suprido pela artéria:". Nomes técnicos (artérias, epônimos, transferências) ficam
   como são.
2. **Caso clínico:** mesmos dados que decidem (idade, dedo, achado), contados com outras palavras.
3. **Alternativas:** as mesmas ideias, com redação própria e em outra ordem; pode trocar um distrator
   claramente defeituoso por outro da mesma família. A letra do gabarito pode mudar (equilibrar no lote).
4. Formato do site: quatro alternativas (A a D; se o original tiver cinco, fica com quatro), sem
   "assinale", sem EXCETO ou INCORRETA, sem lacuna "____" (usar "respectivamente"), sem travessão, sem
   itálico, sem marca-texto. Epônimos em CAIXA ALTA.
5. Gabarito equilibrado no lote e no fim da prova (A, B, C e D parecidos).
6. Questão repetida dentro da mesma prova vira **duas questões de ângulos diferentes**.
7. Rodar `copia` em todo lote antes de aplicar: nenhuma sequência de 7 palavras iguais ao original (nomes
   técnicos longos inevitáveis são a exceção; anote no PROGRESSO).

**Provas que vêm dentro de resumos:** às vezes as questões estão só no fim de um resumo. As questões
originais já separadas por prova e ano ficam em `~/OrtoQuestoes-Biblioteca/provas/` (por exemplo
`SIMAO-2024-questoes.json`, no mesmo formato do comando `questoes`); a parte de texto do resumo continua em
`resumos/`. Nesse caso, copie o JSON para `.oq/provas/<slug>.json` e pule o comando `questoes`.

## 7. O comentário (o mais importante: pode gastar)

Seguir integralmente [docs/padrao-editorial-comentarios.md](../padrao-editorial-comentarios.md) e imitar a
profundidade de [docs/exemplos/mao-0853.json](../exemplos/mao-0853.json) e
[docs/exemplos/einstein-2026-19.json](../exemplos/einstein-2026-19.json). Abrir um exemplo **antes** do
primeiro lote de cada sessão. Em resumo:

- **`conceito`** é uma aula do tema a partir do zero: definição, anatomia ou mecanismo, a classificação ou
  o número com o contexto, a decisão clínica e a armadilha. Tabela quando compara de fato. Cita o livro no
  texto onde o fato aparece: "(Green, cap. 12, p. 384)". Termina com o parágrafo
  **"Por que esta questão foi criada."**: "No SIMÃO 2024 a banca cobrou X; aqui o mesmo fato volta por Y."
  (sem copiar a questão original) e com o fecho "> **Na prova:** ...".
- **`correta`** começa com `**X: texto.**` e explica por que está certa, com o dado e a página.
- **`inc`**: cada alternativa errada com parágrafo próprio: o que ela diz, de onde vem (o contexto em que
  seria verdadeira), por que não serve aqui e como diferenciar. Nada de "está incorreta" sem motivo.
- Mediana de 3.500 a 5.000 caracteres por questão; mais em caso clínico e classificação, menos em fato
  simples. Sem enchimento.
- `refs` da questão: as páginas usadas, por exemplo
  `"Green's Operative Hand Surgery, 8ª ed. (tradução), capítulo 12 (Dupuytren), p. 380 a 384"`.

### 7.1 Autoridade do Green e tom de professor (pedido do Tales, 20/10/2026)

O motivo de mandar o Green e os resumos é **o comentário passar autoridade**. Por isso, em toda questão:

1. **Ler de verdade as páginas** antes de escrever (`ler "<arquivo do capítulo>" PAG PAG_FIM`), não só o resultado
   do `buscar`. Anotar a página impressa de cada fato usado.
2. **Citar o Green de forma explícita, como um professor faz em aula**, no meio do texto e não só no fim:
   "No Green (8ª ed., cap. 55, p. 2063), os autores são diretos: ..."; "É o que o capítulo de fraturas
   de metacarpo chama de ...". Pelo menos duas citações com capítulo e página por questão (no conceito e na
   alternativa correta), e a página também nas alternativas erradas quando o motivo do erro vem do livro.
3. **Citação literal com flexibilidade** (ajuste do Tales, 20/10/2026: "quando precisar citar muito cite muito; quando não
   fizer sentido não cite"). Citar bastante quando a resposta depende da letra exata do livro (classificação, número, frase
   que a banca copiou, divergência com a banca); não citar quando a frase não acrescenta nada ao que a página já sustenta.
   Nada de parágrafo-padrão de citação em toda questão. Como a tradução é automática, quando o trecho em português ficar
   estranho, citar **o original em inglês** e dar o sentido em português logo depois. Nada de copiar parágrafos inteiros.
4. **Se o capítulo ou a página não forem achados**, citar o que houver (o resumo, outro livro local, a correção
   da prova como "segundo a correção da banca") e dizer isso com honestidade. Nunca inventar página.
5. **Tom humano**: explicar como um professor conversando com o residente ("repare que", "o raciocínio é",
   "a banca gosta de trocar"), ligando as ideias com porquês. Evitar frases secas em série, listas no lugar de
   explicação e repetição de fórmulas. Continuam valendo: sem travessão, sem emoji, sem itálico.
6. **Selo do ano, sempre**: todo lote tem `PROVA` ("SIMÃO" ou "SBCM", exatamente assim) e `ANO` (o ano da prova
   espelhada), e um lote nunca mistura provas ou anos. É isso que aparece no site como "Inspirada no SIMÃO 2023"
   e alimenta o filtro por ano e, depois, o cronograma e os temas que mais caem da cirurgia da mão. Por isso
   tema e subtemas também precisam estar certos: até três subtemas da taxonomia, todos os que a questão
   realmente cobra.
7. **"Por que esta questão foi criada."** diz a prova, o ano e o número: "Inspirada na questão 35 do SIMÃO 2023,
   que cobrou ...".
8. **Lotes já publicados sem citação literal** (SIMÃO 2023 até onde já foi feito): ao terminar o SIMÃO 2023,
   acrescentar as citações com `scripts/simulados/enriquecer.py` (só acrescenta texto, não muda gabarito nem id).

## 8. Lotes, publicação e retomada

Cada lote tem **5 questões** do mesmo capítulo. Um lote é o ciclo inteiro:

1. `git pull origin claude/pdfs-questoes-tp64dr` (outra máquina pode ter publicado: os ids são sequenciais).
2. Escrever `lotes/<slug>/lote_NN.py` (modelo em `scripts/simulados/exemplo_lote.py`) **fora do repositório**,
   na biblioteca: `~/OrtoQuestoes-Biblioteca/lotes/simao-2024/lote_01.py`. Cabeçalho do lote:

   ```python
   REF = "<linha da folha de rosto do Green>"
   ARQ = "SIMAO 2024"            # nome lógico, só para auditoria
   PROVA = "SIMÃO"               # ou "SBCM"
   ANO = 2024                    # aparece como "SIMÃO · 2024" ao lado de "OrtoQuestões Simulados"
   AREA = "cirurgia-mao"         # treino de Cirurgia da mão
   QUESTOES = [dict(sub=["<subtema do acervo>"], pag=<folha do PDF do livro>, num=<nº na prova>, gab="C",
                    refs=["<livro, capítulo, p. X>"], enun="...", alts=[...4...],
                    conceito="""...""", correta="""**C: ...** ...""", inc={"A": "...", "B": "...", "D": "..."}), ...]
   ```

   Cotovelo (Mason, Monteggia, instabilidade, colateral medial) vai no tema `ombro-cotovelo`; o resto, `mao`.
3. Conferir: `python3 -I scripts/mao/biblioteca_local.py copia <lote> simao-2024` e
   `python3 scripts/simulados/aplicar_lote.py <pasta-dos-lotes> mao lote_01 --conferir`.
4. Aplicar (o mesmo comando sem `--conferir`), depois
   `python3 scripts/gerar_indice.py && python3 scripts/validar_acervo.py`.
5. Atualizar o [PROGRESSO.md](PROGRESSO.md): ids criados por número de questão, situação `publicada`,
   gabarito do lote, pendências.
6. Commit local só dos arquivos do acervo e do PROGRESSO (`git add public/acervo docs/mao/PROGRESSO.md`), com a
   mensagem `SIMÃO 2024: questões 1 a 5 (mao-NNNN a mao-NNNN)`. Sem push a cada lote (diretriz de 20/10/2026
   para poupar o GitHub Actions; ver AGENTS.md).
7. A cada 2 a 4 lotes (ou no fim do dia), `npx tsc -b && npm test`, um único `git push` e publicar: PR do branch de trabalho
   para `claude/pdfs-questoes-tp64dr` e merge (a publicação já está autorizada em AGENTS.md). Se o Claude
   Code estiver direto no branch de publicação, o push já publica.

**Retomar** (outra sessão, outra conta, outro dia): ler o PROGRESSO, achar a primeira questão `a fazer` e
seguir. Nunca refazer o que está `publicada`. Se uma sessão caiu no meio de um lote, conferir com
`git status` e `git log -3` se o lote foi aplicado antes de repetir.

## 9. Ao terminar uma prova

- Equilíbrio do gabarito e pendências no PROGRESSO.
- Lições novas (padrões da banca daquele ano, defeitos do original, divergências com o Green) no fim de
  [simao-engenharia-reversa.md](../simulados/simao-engenharia-reversa.md) (ou numa seção "Prova da SBCM").
- Relatório curto para o Tales: prova, quantas questões publicadas, ids, divergências mais importantes, o
  que ficou pendente e por quê.

## 10. Depois: resumos

Quando as provas estiverem feitas, os resumos por capítulo do Green seguem
[docs/biblioteca/README.md](../biblioteca/README.md) e [PILOTO-AUTOMATICO.md](../biblioteca/PILOTO-AUTOMATICO.md),
citando estes simulados em `treino=`. Nessa fase o resumo pode citar as páginas do livro.
