# Continuar o OrtoQuestões no MacBook

Documento único com todas as orientações que o Tales deu ao Claude até 30/10/2026.

## Como começar

**No Terminal do Mac, rode uma vez:**

```bash
curl -fsSL https://raw.githubusercontent.com/talesrobertosn/ortoquestoes/claude/pdfs-questoes-tp64dr/scripts/macbook/preparar.sh | bash
```

O script faz quatro coisas:
- cria `~/OrtoQuestoes-Biblioteca` com as pastas `livros`, `provas`, `resumos`, `lotes`, `figuras` e `prints`;
- instala as ferramentas (git, gh, node, poppler, python, pillow);
- clona o repositório em `~/ortoquestoes`;
- extrai o zip do material de trabalho (lotes, figuras, prints e checkpoint), se ele estiver em Downloads ou na Mesa. No Windows, ele está em `Downloads\OrtoQuestoes-material-de-trabalho-2026-10-30.zip`: copie esse arquivo para o Mac antes de rodar o comando.

Depois, copie os livros para `~/OrtoQuestoes-Biblioteca/livros`, abra o Claude Code em `~/ortoquestoes` e mande:

> Leia docs/prompts/CONTINUAR-NO-MACBOOK.md e siga tudo, continuamente.

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
   - commit terminado em `Co-Authored-By: Claude <noreply@anthropic.com>`;
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

## Onde paramos (30/10/2026, madrugada, no Windows)

**Ciclos já publicados** (PRs 646 a 653, todas mescladas):

1. **Anatomia da mão e punho:**
   - resumo `netter-anatomia-mao-punho-antebraco`;
   - 15 simulados (mao-2559 a 2573);
   - 11 comentários oficiais em miniaula;
   - **pendentes** cerca de 32 comentários básicos: questões com imagem e questões que pedem o Green ou o Campbell.
2. **Genuvaro, genuvalgo e torções, parte A:**
   - resumo `tachdjian6-alinhamento-torcoes-coxa-vara`;
   - 12 simulados (pediatria-1399 a 1410);
   - 28 comentários oficiais;
   - 6 figuras do Tachdjian em 13 comentários.

3. **Genuvaro, parte B (deficiências dos membros):**
   - resumo `tachdjian6-deficiencias-membros`;
   - simulados pediatria-1411 a 1418;
   - 12 comentários oficiais;
   - figuras de AITKEN e JONES.
4. **Manguito rotador:**
   - resumo `campbell14-manguito-rotador`;
   - simulados ombro-cotovelo-0686 a 0695;
   - 16 comentários oficiais;
   - lacunas sem fonte local (TECOC, peitoral maior, YOCUM, PASTA) listadas no checkpoint local.
5. **Anatomia do ombro:**
   - resumo `netter-anatomia-ombro-braco`;
   - simulados ombro-cotovelo-0696 a 0703;
   - 12 comentários oficiais.

**Próximo:** ciclo 5, Neuropatia ulnar e outras compressões, das provas gerais da área de mão. Fontes: o cap. 26 do Green (Neuropatias compressivas), em PDF próprio na pasta de livros, e o cap. 77 do Campbell 2021. Depois, Omartrose e artroplastia do ombro (Campbell, cap. 12).

**Atenção ao tamanho dos comentários:** os ciclos 3 e 4 ficaram com comentários curtos (mediana de 1,8 a 2,1 mil caracteres). Volte à miniaula completa, calibrada pela `mao-2164`, variando o estilo.

**Publicação:** use sempre `bash scripts/publicar_pr.sh "Título" corpo.md`. Ele só mescla quando os checks passam.

**Pendências isoladas:**
- O tutorial da Biblioteca reapareceu numa conta que já o tinha visto; investigar `src/conta/avisosVistos.ts` e `GuiaTour`.
- Rockwood infantil: cap. 5, com lote A escrito e não aplicado, e cap. 3. Entram quando a fila chegar a eles.

**Livros para os próximos ciclos:**
- Campbell 2021: o Tales diz que é o mais importante.
- Rockwood adulto, 10ª ed.
- The Adult Hip 2017, para artroplastia do quadril.
- Netter, Tachdjian e Lovell and Winter, 7ª ed.
- Green, em capítulos separados, só para a mão.

**Tarefa agendada no Windows:** a "OrtoQuestões: retomar a fila editorial" roda a cada 2 horas no app do Windows. A última rodada é às 10h07 de 30/10/2026; depois ela não volta a rodar, para não disputar com o Mac. Se ainda aparecer, desative-a no app do Windows, seção Agendadas.
