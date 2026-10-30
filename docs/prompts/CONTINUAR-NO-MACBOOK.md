# Continuar o OrtoQuestões em outro computador (Mac ou Windows)

Documento único com todas as orientações que o Tales deu ao Claude até 30/10/2026. Vale para o MacBook e para qualquer outro PC.

> **PRIORIDADE MÁXIMA (Tales, 30/10/2026):** os resumos e os comentários dos ciclos 3 a 20 ficaram curtos demais. Antes de seguir a fila, refaça tudo o que está em [docs/biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md](../biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md).
> - **Resumo:** no mínimo 45 KB (o roteiro sugere 60 a 90 KB).
> - **Comentário:** no mínimo 4,5 mil caracteres.
>
> Meça com `scripts/biblioteca/medir_profundidade.py`.

## Como começar

### No Mac (Terminal, uma vez)

```bash
curl -fsSL https://raw.githubusercontent.com/talesrobertosn/ortoquestoes/claude/pdfs-questoes-tp64dr/scripts/macbook/preparar.sh | bash
```

O script faz quatro coisas:
- cria `~/OrtoQuestoes-Biblioteca` com as pastas `livros`, `provas`, `resumos`, `lotes`, `figuras` e `prints`;
- instala as ferramentas (git, gh, node, poppler, python, pillow);
- clona o repositório em `~/ortoquestoes`;
- extrai o zip do material de trabalho (lotes, figuras, prints e checkpoint), se ele estiver em Downloads ou na Mesa.

### No Windows (PowerShell, uma vez)

Instale antes Git, GitHub CLI, Node, Python 3 e Poppler (`winget install Git.Git GitHub.cli OpenJS.NodeJS.LTS Python.Python.3.12 oschwartz10612.Poppler`). Depois:

```powershell
git clone https://github.com/talesrobertosn/ortoquestoes.git $HOME\ortoquestoes; cd $HOME\ortoquestoes; git checkout claude/pdfs-questoes-tp64dr; gh auth login
```

Crie a pasta `$HOME\OrtoQuestoes-Biblioteca` e extraia nela o zip do material de trabalho.

### Nos dois

1. Baixe da nuvem o material de trabalho (lotes, figuras, prints e `CHECKPOINT-GERAL.md`). Ele está guardado como rascunho de release no GitHub, visível só para você:
   ```bash
   gh release download material-2026-10-30 -R talesrobertosn/ortoquestoes -D ~/Downloads
   ```
   Depois, no Mac, rode o `preparar.sh`, que já extrai o zip de Downloads. No Windows, extraia o zip em `OrtoQuestoes-Biblioteca`.
2. Copie os livros para `OrtoQuestoes-Biblioteca/livros` (os mesmos nomes de arquivo; o Green em capítulos separados).
3. Abra o Claude Code na pasta do repositório e mande:

> Leia docs/prompts/CONTINUAR-NO-MACBOOK.md e siga tudo, continuamente, começando pelo REFAZER-RESUMOS-E-COMENTARIOS.md.

---

## Para o Claude: quem é quem e o que fazer

Você continua um trabalho longo no **OrtoQuestões** (ortoquestoes.com.br), um banco de questões de prova de ortopedia (TEOT, TARO, TEPOP, SBOT-SP, CET-PR, ENARE, SBCM, SIMÃO) com comentários em miniaula, OrtoQuestões Simulados (questões próprias) e uma Biblioteca de Resumos de capítulos de livros. O dono é o **Tales**, médico ortopedista.

**Responda sempre em português do Brasil**, de forma organizada: títulos curtos, listas ou tabelas, o essencial primeiro, sem parágrafos longos e sem travessões.

### Leitura obrigatória antes de começar
1. Este arquivo inteiro.
2. `CLAUDE.md` e `AGENTS.md`.
3. `docs/padrao-editorial-comentarios.md`, `docs/prompts/comentarios-miniaula.md` e `docs/exemplos/mao-2164.json`, a referência de miniaula.
4. `docs/biblioteca/RELATORIO-EXECUCAO.md`, o relatório dos ciclos, e `docs/biblioteca/FILA-EDITORIAL.md`, a fila.
5. Se existir, `~/OrtoQuestoes-Biblioteca/CHECKPOINT-GERAL.md`, que diz onde paramos.

### Onde fica cada coisa no Mac

| Pasta | O que é |
| --- | --- |
| `~/ortoquestoes` | Repositório (GitHub `talesrobertosn/ortoquestoes`). A base das PRs é `claude/pdfs-questoes-tp64dr`. |
| `~/OrtoQuestoes-Biblioteca/livros` | PDFs dos livros. **Nunca vão para o git.** |
| `~/OrtoQuestoes-Biblioteca/provas`, `resumos` | Provas originais e resumos que o Tales mandar. Nunca vão para o git. |
| `~/OrtoQuestoes-Biblioteca/lotes/<livro>/<tema>/` | Rascunhos de cada ciclo: `lote_a.py` e `lote_b.py` (simulados), `oficiais_N.py` (comentários), `CHECKPOINT.md`. |
| `~/OrtoQuestoes-Biblioteca/figuras/registro.json` | Registro das figuras recortadas dos livros. |
| `~/OrtoQuestoes-Biblioteca/prints` | Prints de acompanhamento (fora do site). |

### Ferramentas do próprio projeto (use antes de improvisar)

| Comando | Para quê |
| --- | --- |
| `python3 scripts/livros.py lista`, `capitulos`, `titulos`, `buscar`, `ler`, `secao` | Ler os livros sem gastar leitura: texto em cache, só os parágrafos limpos. Livro novo: acrescente o apelido em `LIVROS`. |
| `python3 scripts/figuras_livro.py localizar`, `previa`, `recortar`, `anexar` | Figuras dos livros nos comentários: achar a página pela legenda, recortar a 220 dpi otimizado e anexar ao comentário. |
| `python3 scripts/biblioteca/fila_editorial.py` | A fila pelos Temas que Mais Caem (rode de novo depois de cada ciclo). |
| `python3 scripts/simulados/aplicar_lote.py <pasta> <tema> lote_a,lote_b --conferir` | Confere e aplica os simulados; os ids saem em sequência. |
| `python3 scripts/aplicar_comentarios.py lote.json --seco` | Grava comentários; recebe `{id: comentário}` com `conceito`, `correta`, `incorretas`, `referencias` e, quando houver, `alerta`, `provavel` e `imagens`. |
| `python3 scripts/gerar_indice.py`, `node scripts/biblioteca/gerar.mjs`, `python3 scripts/validar_acervo.py` | Índices, Biblioteca e validação, sempre antes da PR. |
| `bash scripts/pos_aplicar.sh` | Faz tudo isso de uma vez, regenera as amostras da página inicial e roda os testes que mais quebram (amostras, Cronograma, ligações). Rode antes de toda PR. |
| `bash scripts/publicar_pr.sh "Título" corpo.md` | Push, PR, espera os checks e só mescla se passarem. |
| `python3 scripts/frases_livro.py cap.txt "regex" [n]` | Acha frases num capítulo extraído com `livros.py ler`, com a página do PDF. |

No Mac, rode o Python com `PYTHONUTF8=1` se aparecer erro de codificação.

---

## O ciclo de cada tema (Prompt Master V3)

**Ordem:** a da `FILA-EDITORIAL.md`, isto é, os Temas que Mais Caem. Produza **só o que falta**: não refaça resumos publicados nem comentários já otimizados.

1. **Engenharia reversa:** liste as questões oficiais do subtema (`public/acervo/temas/<area>.json`), com gabarito, o que o livro sustenta, as divergências e as que estão sem gabarito.
2. **Bibliografia:** leia o capítulo de verdade com `scripts/livros.py`.
3. **Simulados:** 10 a 15 OrtoQuestões Simulados em miniaula, com gabarito equilibrado, alternativas plausíveis e sem ambiguidade.
4. **Resumo** em `conteudo/biblioteca/<id>.md`, no formato dos anteriores:
   - frontmatter com `subtemas:`;
   - seções `# Título {radar=fundamento|confirmado|oportunidade}`;
   - blocos `!questoes central= relacionadas= treino=` até `!fim`, com `conceito:`, `como:`, `armadilha:` e `alerta:`;
   - `!tabela` quando ajudar;
   - `radar=confirmado` exige questão oficial em `central`.
5. **SEO:** a página do resumo sai sozinha no deploy (`gerar_resumos_seo.py`). Página nova só se for necessária (ver Regras).
6. **Comentários oficiais:** reescreva em miniaula só os que a fila marca como `basico`. Preserve o gabarito, o `alerta`, o `provavel` e as referências. Ponha figuras de livro quando ajudarem de verdade.
7. **Validar e publicar:**
   - crie o branch a partir de `origin/claude/pdfs-questoes-tp64dr`;
   - commit terminado com a linha de coautoria do Claude que o sistema indicar;
   - PR com corpo terminado em `🤖 Generated with [Claude Code](https://claude.com/claude-code)`;
   - **mescle só depois que o check "verificar" passar**;
   - confira o deploy ("Publicar no GitHub Pages").
8. **Registrar:** atualize `docs/biblioteca/RELATORIO-EXECUCAO.md` (no repositório) e o `CHECKPOINT-GERAL.md` (local), e siga para o próximo tema sem esperar.

---

## Regras editoriais

### Fatos e fontes
- **Nunca afirme fato que não leu.** Se não está no texto lido, não escreva, ou diga no `alerta` que não foi conferido.
- **Preserve o gabarito oficial.** Divergência com o livro vai no campo `alerta`, explicada com calma.
- **Citação:** livro, edição, capítulo e seção ou figura. A página impressa só entra quando aparece na própria página do livro; nunca use a página do PDF.
- **Autor:** cite pelo nome quando acrescentar, por exemplo Jon C. THOMPSON no Netter, John A. HERRING no Tachdjian, Daniel J. SUCATO e Robert Lane WIMBERLY nos capítulos que escreveram.

### Escrita
- Sem travessões (— ou –), sem itálico, sem emoji.
- Nomes próprios de classificações e autores em CAIXA ALTA (BLOUNT, LANGENSKIÖLD, HILGENREINER).
- Nunca divulgue o total de questões do acervo.

### Comentário em miniaula
É o padrão do site, nas questões oficiais e nos simulados.
- **O que nunca muda:** aula independente, que ensina o mecanismo; a correta bem fundamentada; cada alternativa errada com parágrafo próprio, dizendo o que ela afirma, onde seria verdadeira e por que confunde.
- **Tom humanizado:** escreva como um professor, de um jeito que dê prazer de ler, com criatividade e comparações do dia a dia.
- **Forma variada:** às vezes mais direto, às vezes menos. Varie a abertura (cena, pergunta, erro comum, história do autor), a ordem dos blocos, as tabelas, o tamanho e o fecho. Nada de modelo engessado.
- **Fonte prioritária:** o resumo da Biblioteca, citado pelo nome. Complete com outros livros que você leu de verdade.
- **Tamanho:** calibre pela `mao-2164`, mas com flexibilidade; o contexto manda.

### Fechos
- "**Por que esta questão foi criada.**" é **só para OrtoQuestões Simulados**, porque fomos nós que criamos a questão.
- Em prova oficial (TARO, TEOT, SBOT-SP, CET-PR, TEPOP etc.), feche falando da banca, por exemplo "**O que a banca quis testar.**". O `validar_acervo.py` recusa o fecho de simulado em questão oficial.
- SBCM e SIMÃO no acervo são OrtoQuestões Simulados: entram como `treino=`, nunca como `central=` nem `relacionadas=`.

### Figuras
- O Tales autorizou figuras recortadas dos livros nos comentários, com a fonte na legenda (livro, edição, capítulo, figura e página impressa quando confirmada).
- Use só quando a imagem ensinar de verdade: classificações, radiografias típicas, anatomia, ângulos, vias de acesso.
- Recorte limpo, peso otimizado.
- Nunca ponha figura de livro em página pública de SEO.

### Provas protegidas
Não mexa nas provas específicas de Cirurgia da Mão: SBCM, SIMÃO, ENARE Cirurgia da Mão, USP-SP, UFG, PUC-SP, INTO, FMRP-USP, IAUPE, Einstein e UERJ. As provas gerais (TEOT, TARO) da área de mão entram na fila normalmente.

### SEO
- Página nova quando for necessária, sobretudo para quem procura o site ("curso de ortopedia", "residência em ortopedia", "banco de questões de ortopedia").
- Antes de criar, veja se já existe: há páginas de banco, TEOT, TARO, R1, simulado, flashcards, curso preparatório, cirurgia da mão e guias (R1 a R3, R4, curso de ortopedia).
- Evite páginas em série, duplicadas ou vazias.

### E-mails e mensagens em nome do Tales
Sempre extremamente gentis e formais (ver CLAUDE.md).

---

## Modo autônomo (Tales, 30/10/2026)

**Autorização:** o Tales autorizou o fluxo inteiro sem pedir aprovação a cada etapa. Isso inclui corrigir bugs e testes, commit, push, PR, merge depois do "verificar" e deploy.

**Não pergunte "posso continuar?".** Ao terminar uma tarefa, comece a próxima.

**Problemas:** investigue a causa, escolha a solução mais segura e simples, teste e registre. Um bloqueio isolado não para a fila: registre e passe a outra tarefa independente. Não desative testes nem verificações para forçar publicação.

**Autoconferência:** antes de publicar, confira:
- gabarito certo e sem duas respostas possíveis;
- fato lido e referência verdadeira;
- todas as alternativas explicadas;
- testes passando e só as mudanças previstas no commit.

**Prints:** de vez em quando, tire um print real do site (questão comentada, sobretudo com figura), recarregando a página antes. Salve em `~/OrtoQuestoes-Biblioteca/prints` e mostre ao Tales. Não espere resposta para seguir.

**Regras como critério:** seja flexível. "Não tome regras como absoluto", "seja criativo", "crie suas próprias ferramentas": quando um passo se repetir, transforme-o em script ou skill para gastar menos.

**Limites de segurança que continuam valendo:**
- não digitar senhas;
- não apagar dados de usuários;
- não expor credenciais;
- não fazer gastos;
- não burlar limites de uso.

**Retomada:** grave checkpoints a cada etapa. Se o uso acabar, a próxima sessão lê o checkpoint e continua de onde parou, sem recomeçar.

---

## Onde paramos (30/10/2026, de madrugada, no Windows)

### Ciclos publicados (todos mesclados, check verde e deploy concluído)

| Ciclo | Tema | Fonte | Resumo | Simulados | PRs |
| --- | --- | --- | --- | --- | --- |
| 1 | Anatomia da mão e punho | Netter | `netter-anatomia-mao-punho-antebraco` | mao-2559 a 2573 | 646 a 648 |
| 2 | Genuvaro, torções; deficiências | Tachdjian | `tachdjian6-alinhamento-torcoes-coxa-vara`, `tachdjian6-deficiencias-membros` | pediatria-1399 a 1418 | 649 a 658 |
| 3 | Manguito rotador | Campbell cap. 46 | `campbell14-manguito-rotador` | ombro-cotovelo-0686 a 0695 | 659 a 661 |
| 4 | Anatomia do ombro | Netter | `netter-anatomia-ombro-braco` | ombro-cotovelo-0696 a 0703 | 662 a 663 |
| 5 | Neuropatias compressivas | Green cap. 26 | `green8-neuropatias-compressao` | mao-2574 a 2581 | 666 a 668 |
| 6 | Omartrose e artroplastia do ombro | Campbell caps. 12 e 13 | `campbell14-omartrose-artroplastia` | ombro-cotovelo-0704 a 0711 | 669 a 670 |
| 7 | Anatomia do quadril | Netter caps. 7 e 8 | `netter-anatomia-quadril-coxa` | quadril-0715 a 0722 | 671 a 672 |
| 8 | Artroplastia do quadril | Campbell cap. 3 | `campbell14-ath-biomecanica-componentes` | quadril-0723 a 0732 | 673 |
| 9 | Malformações congênitas da mão | Green caps. 35 a 38 | `green8-malformacoes-congenitas` | mao-2582 a 2591 | 674 |
| 10 | Instabilidade anterior do ombro | Campbell cap. 47 | `campbell14-instabilidade-ombro` | ombro-cotovelo-0712 a 0719 | 675 |
| 11 | Anatomia da coluna | Campbell cap. 37 | `campbell14-anatomia-coluna` | coluna-0564 a 0571 | 676 |
| 12 | Anatomia do pé e tornozelo | Netter caps. 9 e 10, Hoppenfeld | `netter-anatomia-pe-tornozelo` | pe-tornozelo-0425 a 0430 | 677 |
| 13 | Displasia do desenvolvimento do quadril | Tachdjian cap. 13 | `tachdjian6-ddq` | pediatria-1419 a 1426 | 678 |
| 14 | Tendões flexores | Green cap. 6 | `green8-tendoes-flexores` | mao-2592 a 2597 | 680 |
| 15 | Metástases ósseas | Campbell cap. 27 | `campbell14-metastases-osseas` | tumores-0393 a 0398 | 681 |
| 16 | Hérnia de disco lombar e cervical | Campbell caps. 38 e 39 | `campbell14-hernia-disco` | coluna-0572 a 0577 | 682 |
| 17 | Osteomielite aguda | Tachdjian cap. 23 | `tachdjian6-osteomielite` | conceitos-basicos-0416 a 0420 | 683 |
| 18 | Lesão do LCA | Campbell cap. 45 | `campbell14-lca` | joelho-0383 a 0387 | 684 |
| 19 | Ruptura distal do bíceps | Campbell cap. 48 | `campbell14-biceps-distal` | ombro-cotovelo-0720 a 0723 | 685 |

### Página impressa por livro (para citar a página certa)
Campbell 2021: a diferença entre a página do PDF e a impressa muda por capítulo. Confira no cabeçalho de `livros.py ler`. Já medidas: cap. 3 (PDF menos 19), cap. 27 (menos 107), cap. 37 (menos 193), cap. 38 (menos 195), cap. 39 (menos 200), cap. 45 (menos 249), cap. 47 (menos 275), cap. 48 (menos 283). Tachdjian: cap. 13 (menos 77), cap. 23 (menos 146). Netter e Green traduzido: sem página impressa no texto; cite capítulo e seção.

### O que falta

**0. Refazer os resumos e os comentários curtos** (veja `docs/biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md`). Isso vem antes de tudo.

**1. Seguir a fila** (`python3 scripts/biblioteca/fila_editorial.py`). Próximos candidatos:
- Estadiamento, biópsia e margens (tumores; Campbell cap. 24);
- Displasias esqueléticas e síndromes (Tachdjian cap. 36);
- Paralisia cerebral (Tachdjian);
- e os demais na ordem da `FILA-EDITORIAL.md`.

Adiados por serem mistos, sem capítulo-fonte único: "Outros temas de trauma" e "Outras doenças congênitas". Faça-os em pedaços, por assunto.

**2. Questões oficiais pendentes dos ciclos feitos.** Ficaram sem comentário porque o livro lido não as sustentava. A lista completa por ciclo está em `CHECKPOINT-GERAL.md`. As principais:
- **Extensores e banda sagital** (mao-0016, 0039, 0058, 0068, 0106, 0109, 0124, 0127, 0183, 0228, 0435, 0514): Green, "4- T. extensor".
- **Infecção pós-osteossíntese e CIERNY e MADER** (conceitos-basicos-0013, 0045, 0058, 0171, 0194, 0208, 0227): Campbell cap. 21.
- **Infecção vertebral do adulto** (conceitos-basicos-0035, 0054, 0072, 0078, 0225): Campbell cap. 42.
- **Peitoral maior, cabeça longa do bíceps e BENNETT** (ombro-cotovelo-0054, 0078, 0315, 0412, 0452, 0001, 0311, 0352, 0464).
- **Menisco** (joelho-0026, 0038, 0051, 0071, 0170, 0221, 0223): Campbell cap. 45, seção de menisco.
- **Artroplastia do quadril:** Vancouver, infecção, recapeamento e artrodese (Campbell caps. 3 a 5).
- **TECOC de ombro e cotovelo:** sem fonte local.
- **Mão:** túnel do carpo e desfiladeiro (ciclo 5) e cerca de 32 questões de anatomia da mão.
- **Imagem:** muitas questões de anatomia com imagem (coluna, quadril, pé). Só comente quando o gabarito deixar a estrutura clara.

**3. Pendências isoladas:**
- O tutorial da Biblioteca reapareceu numa conta que já o tinha visto. Investigar `src/conta/avisosVistos.ts` e `GuiaTour`.
- Rockwood infantil: cap. 5, com lote A escrito e não aplicado, e cap. 3.
- Mandar um print de questão nova ao Tales de vez em quando.

### Método que funcionou (ciclos 8 a 19)
1. Liste as oficiais do subtema, usando `oficial()` e `estado_comentario()` de `fila_editorial.py`. Pule as provas protegidas da mão.
2. Ache o capítulo com `livros.py capitulos`, `titulos` e `buscar`. Extraia com `livros.py ler <livro> p1 p2 > cap.txt` e procure com `scripts/frases_livro.py`.
3. Leia o capítulo inteiro, não só os trechos das questões. Escreva `lote_a.py`, com 10 a 15 simulados, e `oficiais.py`, só com as oficiais que o livro sustenta. Ponha `alerta` quando o livro divergir da banca e feche com "O que a banca quis testar".
4. Crie o branch a partir de `origin/claude/pdfs-questoes-tp64dr` e rode `aplicar_lote.py`.
5. Converta `oficiais.py` em JSON conferindo, para cada questão:
   - que a letra da correta é igual ao gabarito do acervo;
   - que as incorretas são exatamente as demais letras.

   Depois rode `aplicar_comentarios.py`. Essa conferência pegou um erro meu na quadril-0330.
6. Escreva o resumo `.md`:
   - `treino=` com os ids dos simulados recém-criados;
   - `alerta` para as relacionadas que o livro não sustenta.
7. Rode `bash scripts/pos_aplicar.sh`.
8. Faça commit de tudo, **inclusive `public/acervo/indice.json`**. Sem ele o check falha, porque não acha os ids novos.
9. Publique com `bash scripts/publicar_pr.sh`.

### Armadilhas conhecidas
- **`testar_sincronia_aparelhos` falha perto da meia-noite**, por causa dos relógios simulados de -7 e +9 minutos. Rode de novo depois das 00h10 (`gh run rerun <id> --failed`).
- **`testar_adiantar_ponta_a_ponta` pode quebrar por arredondamento** quando o acervo cresce. Já tem tolerância de até 2 questões; se voltar, ajuste a tolerância, sem desligar o teste.
- **No Windows:**
  - `aplicar_comentarios.py` às vezes dá `OSError Errno 22` ao gravar `comentarios/ombro-cotovelo.json`; repetir resolve, e depois confira o JSON;
  - caminhos longos de scratchpad quebram o Python, então use uma pasta temporária curta.
- **Comentários e resumos curtos:** este foi o maior erro. Comentário com menos de 4,5 mil caracteres e resumo com menos de 45 KB não podem ser publicados; meça antes com `medir_profundidade.py`.

### Tarefa agendada no Windows
A "OrtoQuestões: retomar a fila editorial" roda no app do Windows até 10h07 de 30/10/2026. Se for continuar em outro computador, desative-a no Windows (app, seção Agendadas), para as duas máquinas não trabalharem ao mesmo tempo.
