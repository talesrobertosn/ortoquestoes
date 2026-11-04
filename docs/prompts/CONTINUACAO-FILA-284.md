# Prompt de continuação: fila dos 284 temas (resumos + miniaulas)

Cole tudo abaixo num chat novo do Claude Code aberto em ~/ortoquestoes.

---

Você vai continuar, sem parar e sem me perguntar nada, o trabalho da fila dos 284 "Temas que mais caem" do Orto Questões. Autonomia total: decida sozinho, resolva os problemas, publique no site. Responda sempre em português. Só pare para me perguntar se precisar de um LIVRO que não está no acervo (aí pode pedir e esperar).

## 1. Leia antes de tudo (nesta ordem)
1. `~/ortoquestoes/CLAUDE.md` e `AGENTS.md` (regras do projeto).
2. `~/OrtoQuestoes-Biblioteca/ferramentas/LEIA-ME.md` (ferramentas e caminhos).
3. O topo de `~/OrtoQuestoes-Biblioteca/CHECKPOINT-GERAL.md` (estado atual).
4. `~/OrtoQuestoes-Biblioteca/COBERTURA-284-TEMAS.md` (a fila; Status OK = feito, CRIAR = a fazer).
5. `~/OrtoQuestoes-Biblioteca/ferramentas/brief_criar.md` e `brief_coment.md` (os roteiros dos agentes; não os reescreva, só use).
6. As memórias do projeto (MEMORY.md), em especial "Miniaula no porte real" e "Comparar bibliografias".

## 2. Regras do Tales que nunca mudam
- **Qualidade acima de tudo.** Miniaula é aula completa: o que é a doença, o que acontece (mecanismo), a classificação ou os números do livro, por que a correta está certa e por que CADA errada não é. Cerca de 2 a 3 mil caracteres no conceito, mais quando a questão pede. Nunca encurtar para economizar token: a economia vem de ler pouco dos livros, nunca do tamanho do comentário.
- **Flexibilidade.** Cada questão e cada tema é julgado por si, não é linha de produção. Comparar livros lado a lado (com página) QUANDO os livros divergem no fato que decide a questão (o Tales elogiou a tumores-0330, prognóstico do EWING, Tachdjian x Campbell).
- **Nada sem fonte.** Só fatos do resumo e da ficha (que vêm dos livros, com página). Se o livro não traz, dizer isso; nunca inventar.
- **Gabarito oficial sempre preservado.** Divergência do livro vai no `alerta`. Questão sem gabarito oficial: `provavel` = `gabaritoBibliografia` (se existir) e o alerta do bloco !questoes do resumo tem de dizer o mesmo (alinhe o resumo quando o agente avisar que divergiu).
- **Amostras da página inicial** (`ferramentas/amostras_ids.txt`) nunca levam `alerta` nem `provavel`.
- **Escrita:** sem travessão nem meia-risca, sem itálico, sem emoji; nomes de pessoas e classificações em MAIÚSCULAS; livros com nome completo; "Por que esta questão foi criada" só nos simulados; nada de figura de livro nas páginas públicas.
- **Limites absolutos:** não digitar senhas, não criar contas, não expor credenciais; não apagar dados de usuários; não gastar dinheiro; livros, resumos enviados e provas originais nunca vão para o git; questões protegidas de Cirurgia da Mão nunca têm o enunciado reescrito (ver docs/mao/PROTOCOLO.md).
- **Commits** terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; **PRs** terminam com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## 3. Onde trabalhar
- **Worktree próprio: `~/oq-pub`.** Outra sessão usa `~/ortoquestoes`; nunca trabalhe lá (só leia). Antes de cada lote: `cd ~/oq-pub && git fetch -q origin claude/pdfs-questoes-tp64dr && git checkout -qb claude/criar-loteNN origin/claude/pdfs-questoes-tp64dr` (NN crescente; o último usado foi 52, então comece em 53).
- Sempre `eval "$(/opt/homebrew/bin/brew shellenv)"` antes dos comandos.
- Ferramentas e arquivos de trabalho em `~/OrtoQuestoes-Biblioteca/ferramentas` (F). Fichas, resumos, listas e JSONs dos agentes ficam em `F/trab/`.
- Livros em `~/OrtoQuestoes-Biblioteca/livros`. Leitor: `python3 scripts/livros.py capitulos|titulos|buscar|ler <alias>`. Aliases úteis: campbell15, green7, tach, rwa, rwc, adulthip, sizinio5 (HEBERT), lw (Lovell and Winter 7ª), dahlin (Dahlin's Bone Tumors 6ª), hoppenfeld-pt (sem texto: OCR do cap. 6 em F/trab/viascol/hop6.txt; F/trab/viascol/ocr.swift faz OCR de outras páginas). No lw e no dahlin o índice falha: use `buscar` ou `pdftotext -f N -l M`.

## 4. O ciclo de cada tema (é exatamente o que eu vinha fazendo)
**Passo 1, lista de questões:** `python3 F/bin/qs.py <tema-json> "<subtema exato>" F/trab/<k>_qs.txt` (tema-json = mao, quadril, coluna, joelho, ombro-cotovelo, pe-tornozelo, pediatria, trauma, tumores, osteometabolicas, conceitos-basicos). O subtema exato está na COBERTURA.

**Passo 2, decidir:** se já existe um resumo que cobre o tema (ex.: o tema é parte de um capítulo já resumido), NÃO crie outro: lance um agente "ligar" que produz a versão 2 do resumo existente (subtemas separados por "; ", versao 2, até 70.000 caracteres) e liga as questões novas. Exemplos já feitos: osteoporose, artrite séptica, tumores de partes moles, impacto femoroacetabular.

**Passo 3, agente CRIAR** (Agent, general-purpose, em segundo plano): prompt curto que manda ler e seguir `F/brief_criar.md`, rodar scripts a partir de `~/oq-pub` sem editar nada lá, e dá: o tema e o que ele abrange, o id (prefixo do livro principal: campbell15-, green-, tachdjian6-, rockwood10-, callaghan-, hebert-, lw-, dahlin-, hoppenfeld-, ao-), especialidade, subtema exato, a lista `F/trab/<k>_qs.txt`, os livros (principal e complementos) e a saída `F/trab/<k>_fatos.md` e `F/trab/<k>_resumo.md`. **O número do capítulo do cabeçalho não pode repetir outro resumo do mesmo livro e edição** (confira com `grep -h "^capitulo:" ~/oq-pub/conteudo/biblioteca/<prefixo>-*.md`); se o capítulo certo estiver usado, o agente escolhe outro capítulo livre que trate do tema e cita o certo no corpo, ou usa outro livro (muitas vezes o HEBERT) e o id muda para o prefixo desse livro. A estante aceita capítulo com decimal (HEBERT 21.2, 21.5).

**Passo 4, instalar o resumo:** `REPO=$HOME/oq-pub bash F/bin/instalar.sh <id> F/trab/<k>_resumo.md F/trab/<k>_ligadas.txt`. Ele copia, passa questões que não são de prova real para `treino=`, troca duplicatas pela original, roda gerar, checar_resumo e npm test, e grava a lista das ligadas com comentário raso em `<k>_ligadas.txt`. Se o id do arquivo não bater com o livro, corrija a linha `id:` antes (sed). Confira que as duplicatas trocadas têm o mesmo gabarito (pequeno python que lê public/acervo/temas/*.json). Se o teste falhar, leia o erro e conserte (ex.: subtemas com vírgula em vez de "; "). Commit.

**Passo 5, miniaulas:** agente que segue `F/brief_coment.md` com a lista `F/trab/<k>_ligadas.txt`, o resumo e a ficha como únicas fontes, pasta `~/OrtoQuestoes-Biblioteca/lotes/<pasta>/coment/` e JSONs em `F/trab/`. Listas grandes: divida com `split -l 12` e use prefixos e refs separados por agente (refs_a.py, refs_b.py; lotes loteA1, loteB1...). Mande comparar os livros nos pontos em que o resumo registrou divergência. Cirurgia da Mão: mandar ler docs/mao/PROTOCOLO.md.

**Passo 6, aplicar:** `python3 scripts/aplicar_comentarios.py F/trab/<json>` para cada lote; `npm run validar`; commit. Se o agente avisar que o arquivo do lote mudou depois da validação, rode de novo `python3 scripts/biblioteca/lote_comentarios.py <lote.py> <json>` e `python3 F/bin/porte.py <json>` antes de aplicar. Se o agente apontar que o alerta do resumo contradiz o comentário, ajuste a linha `alerta:` do resumo (python que substitui a linha) e rode `node scripts/biblioteca/gerar.mjs`.

**Passo 7, publicar:** atualize `docs/biblioteca/RELATORIO-EXECUCAO.md` (troque o "| (este PR) |" pelo número do último PR mesclado e insira nova linha "| (este PR) | ..." depois dele), marque o tema como "OK (dd/mm) | <id>" na COBERTURA (regex na linha "| <Tema> | ... | CRIAR |  |"), escreva `F/trab/corpo.md` (o que entrou, livros, alertas relevantes, portões, e a linha final do Claude Code) e rode `REPO=$HOME/oq-pub bash F/bin/publicar.sh "<Título>" F/trab/corpo.md`. Ele faz merge da base, portões, PR e merge (imprime MESCLADO). Se disser "CHECK FALHOU" mas o check passar depois, faça `gh pr merge <n> --merge`. Se der conflito real, investigue (nunca descarte trabalho alheio). Depois, abra um branch novo para o próximo lote.

**Ritmo:** mantenha cerca de 4 agentes trabalhando (resumos e miniaulas misturados). Publique a cada 2 ou 3 temas prontos. A ordem da fila é a da COBERTURA, de cima para baixo, PULANDO as miscelâneas ("Outros temas de ...", que ficam para o fim). Se um agente parar por limite de uso, retome com SendMessage quando o uso voltar ("O limite de uso voltou. Continue de onde parou ...").

## 5. Despertador e relatório
- Crie um despertador horário com CronCreate (minuto 17, recorrente) cujo texto manda conferir o CHECKPOINT, retomar agentes parados, aplicar e publicar lotes prontos e lançar o próximo tema se houver menos de 3 agentes; se tudo estiver andando e nada pronto, não fazer nada. Expira em 7 dias: recrie antes.
- Atualize o topo do CHECKPOINT-GERAL.md de vez em quando (branch atual, o que está rodando, último PR).
- A cada uma hora mais ou menos, mande ao Tales um relatório curto (o que foi publicado, o que está rodando, o que vem) e um print. Para o print: `preview_start` com o servidor "site" do .claude/launch.json, navegue para `http://localhost:<porta>/#/resumos/<id>`, recuse os cookies, role até uma tabela ou bloco "Já caiu", tire o screenshot, copie para `~/OrtoQuestoes-Biblioteca/print-<id>.jpg`, envie com SendUserFile e pare o servidor. (A tela de questão exige login; não entre com conta.)

## 6. Onde parou (04/11/2026)
- Último PR publicado: **911**. Placar: 205 temas OK de 284 (confira contando "| OK" na COBERTURA).
- Branch em ~/oq-pub no fim da sessão anterior: o último lote foi publicado; comece um branch novo (claude/criar-lote53).
- Se ainda houver em `F/trab/` estes arquivos de resumo SEM instalação (confira se o id já está em ~/oq-pub/conteudo/biblioteca), instale e publique:
  - `acec_resumo.md` → versão 2 de `rockwood10-luxacao-acromioclavicular` (com a esternoclavicular; subtema "Luxação acromioclavicular e esternoclavicular").
  - `peitoral_resumo.md` → id `campbell15-peitoral-maior` ou `hebert-peitoral-maior` (o que estiver na linha id).
  - `fixext_resumo.md` → `ao-fixadores-externos`.
  - `biomao_resumo.md` → `green-biomecanica-mao`.
  Depois de instalar cada um, lance as miniaulas da `<k>_ligadas.txt` correspondente.
- Próximos temas da fila depois desses (pulando "Outros temas"): confira na COBERTURA as linhas com CRIAR a partir do nº 199.
- Pendências para o Tales (já anotadas em `~/OrtoQuestoes-Biblioteca/REVISAR-TALES.md`): figura da pe-tornozelo-0295; resumos campbell14 com questão real em treino=; tumores-0361 (gabarito oficial contra o SCAGLIETTI).
