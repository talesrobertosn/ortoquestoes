# Prompt para o ChatGPT Codex: provas de Cirurgia da Mão neste computador

Para o Tales colar no Codex (app ou CLI), aberto na pasta `C:\Users\tales_zh0ni7\ortoquestoes`, para continuar
exatamente de onde o Claude parou em 22/10/2026. Escrito pelo Claude com tudo o que ele fazia na prática.

**Antes de colar:** feche as sessões do Claude Code que estiverem trabalhando nas provas (só um agente por vez
publica, porque os ids são sequenciais). Nada precisa ser instalado: Git, Git Bash, gh, Node, Python, poppler
(`pdftotext`, `pdftoppm`) e a biblioteca `C:\Users\tales_zh0ni7\OrtoQuestoes-Biblioteca` já estão aqui. Se o `gh`
pedir login, rode `gh auth login` uma vez.

---

```text
Você vai continuar, sozinho e sem me pedir confirmação, o trabalho das provas de Cirurgia da Mão do site
Orto Questões: transformar as provas da SBCM e do SIMÃO em OrtoQuestões Simulados e refazer comentários,
sempre com o livro Green's Operative Hand Surgery (8ª ed., tradução) que está no computador. Quem fazia isso
era o Claude; o padrão de qualidade dele foi aprovado e é o que você deve igualar.

AUTORIZAÇÃO: eu autorizo aplicar os lotes no acervo, fazer commit e push no branch
claude/relaxed-franklin-0snpiu e fazer o merge dos PRs para claude/pdfs-questoes-tp64dr, MAS SÓ DEPOIS
QUE O CHECK "verificar" PASSAR. Nunca force push, nunca mexa em configuração do repositório.

=== AMBIENTE (Windows 11) ===
- Repositório: C:\Users\tales_zh0ni7\ortoquestoes (no Git Bash: ~/ortoquestoes).
- Biblioteca, FORA do git: C:\Users\tales_zh0ni7\OrtoQuestoes-Biblioteca (~/OrtoQuestoes-Biblioteca):
    livros/*.pdf            capítulos do Green (o nome começa pelo número do arquivo, ex. "13- Instabilidade do carpo.pdf")
    .oq/texto/*.txt         texto de cada capítulo com marcas "===== livros\<pdf> | p. N | folha F ====="
    .oq/provas/*.json       provas originais
    lotes/<prova-ano>/      os lotes .py que você escreve (ex. lotes/sbcm-2023/lote_01.py)
- O shell padrão pode ser PowerShell. Para os scripts .sh use o Git Bash:
    & "C:\Program Files\Git\bin\bash.exe" -lc "cd ~/ortoquestoes && <comando>"
  Python sempre com PYTHONUTF8=1 (no Bash: export PYTHONUTF8=1; no PowerShell: $env:PYTHONUTF8=1).

=== PASSO 1: SINCRONIZAR E LER ===
1. git checkout claude/relaxed-franklin-0snpiu ; git pull origin claude/relaxed-franklin-0snpiu ;
   git pull origin claude/pdfs-questoes-tp64dr (conflito em public/acervo/indice.json ou busca.json:
   rode python scripts/gerar_indice.py de novo e siga).
2. Leia por inteiro, antes de escrever qualquer coisa:
   CLAUDE.md, AGENTS.md, docs/padrao-editorial-comentarios.md, docs/exemplos/mao-0853.json,
   docs/mao/PROTOCOLO.md (todas as seções, principalmente 0, 3, 4, 6, 7, 7.1, 8 e 9),
   docs/mao/PROGRESSO.md (a linha "Andamento" e a seção de retomada dizem o ponto exato),
   docs/mao/ferramentas/README.md, docs/simulados/simao-engenharia-reversa.md.
3. Abra como modelo de tom e profundidade os comentários que o Claude acabou de fazer:
   ~/OrtoQuestoes-Biblioteca/lotes/sbcm-2024/revisao_03.py, revisao_05.py e revisao_09.py (revisões de
   comentário) e ~/OrtoQuestoes-Biblioteca/lotes/sbcm-2022/lote_19.py e lote_21.py (questões novas).
   Seu texto tem que ficar igual a esses em estrutura, profundidade e cuidado com as fontes.

=== ONDE PARAR E RETOMAR (estado em 22/10/2026) ===
- Feito: SIMÃO 2023, SIMÃO 2026, SBCM 2022 (fechada) e a SBCM 2024 inteira com comentários refeitos.
- PRÓXIMO, nesta ordem (o Tales pediu foco nas provas da SBCM):
  a) SBCM 2023: prova nova. Se ainda não estiver classificada no PROGRESSO, faça a Fase 0 (PROTOCOLO,
     seção 3): inventário, classificação de todas as questões (número, assunto, capítulo e páginas do
     Green, tema, subtema, lote). Depois lotes de 5 em ~/OrtoQuestoes-Biblioteca/lotes/sbcm-2023/,
     PROVA = "SBCM", ANO = 2023. Pendentes conhecidas: 9, 72, 88 e 100 dependem de figura.
  b) Aprofundar as revisões 02, 15 e 18 da SBCM 2024 (mediana abaixo de 3.500 caracteres): novo arquivo
     de revisão com o mesmo id, lendo mais do Green.
  c) SIMÃO 2022, SIMÃO 2024, SIMÃO 2021 (questões novas, PROVA = "SIMÃO").
  d) SIMÃO 2026: refazer os comentários de ombro-cotovelo-0645 e 0647, que ficaram de fora.
  e) Comentários do ENARE Cirurgia da Mão 2022, 2023 e 2025 (texto oficial, sem reescrever a questão;
     ids em docs/importacoes/cirurgia-mao-outubro-2026.md).
- O PROGRESSO é a verdade: se ele disser algo diferente desta lista, siga o PROGRESSO.

=== COMO LER O LIVRO (o que mais diferencia um bom comentário) ===
- Ache o trecho com grep no texto do capítulo e descubra a página impressa:
    bash ~/OrtoQuestoes-Biblioteca/.oq/onde.sh "<trecho>" "livros__13"
  e leia a página inteira (texto bruto, sem as colunas cortadas):
    bash ~/OrtoQuestoes-Biblioteca/.oq/pagina.sh "13-" 537
- Armadilhas que já pegaram:
  * A 1ª folha de cada PDF é marcada com o NÚMERO DO CAPÍTULO ("p. 22 | folha 1"), não com a página.
    Para essa folha, passe a folha à mão: bash pagina.sh "22-" 977 1. A folha 2 leva a página seguinte.
  * O número do arquivo nem sempre é o número do capítulo do Green: "23- Rigidez do cotovelo.pdf" é o
    cap. 24, "24- Tendinites" é o cap. 25, "26-Neuropatias compressivas" é o cap. 28. Cite sempre o
    capítulo que aparece no cabeçalho da página ("CAPÍTULO 24 ...").
  * O texto em duas colunas corta frases; quando a frase sumir, use pagina.sh (pdftotext -raw) e, para
    tabelas e figuras, renderize a página e LEIA A IMAGEM:
    pdftoppm -f <folha> -l <folha> -r 120 -png "<pdf>" <saida>
    Foi assim que o Claude leu a Tabela 13.5 (EWAS), a 16.5 (fraturas do carpo) e a 51.4 (compartimentos).
- Releia a página antes de citar. Nunca escreva página que você não abriu.

=== COMO ESCREVER (o que o Tales aprovou e cobra) ===
Questão nova (prova SBCM ou SIMÃO):
- Bem parecida com a original: a mesma pergunta, os mesmos dados, as mesmas alternativas, com outras
  palavras e outra ordem. O comando copia tem que passar (nenhuma sequência de 7 palavras igual):
    python -X utf8 -I scripts/mao/biblioteca_local.py copia <arquivo-do-lote> <slug-da-prova>
- Só mude o ângulo se a original tiver duas respostas pelo livro, depender de figura que não dá para
  descrever ou divergir do Green; explique isso no comentário. Figura sem descrição possível = pendente.
Comentário (questões novas e revisões), padrão profundo:
- Mediana de 3.500 a 4.000 caracteres por questão (conceito + correta + incorretas). O aplicar_lote
  --conferir mostra a mediana; abaixo de 3.300, aprofunde antes de aplicar.
- "conceito": uma aula independente, em blocos com título em negrito ("**O mecanismo.** ..."):
  fundamento, mecanismo, o que o livro diz (com capítulo e página no meio do texto, como professor:
  "(Green, cap. 13, p. 537)"), uma TABELA sempre que houver comparação ou classificação, o parágrafo
  "**Por que esta questão foi criada.** Inspirada na questão N da SBCM 2023, que ..." e no fim
  "> **Na prova:** ..." com a regra de bolso.
- "correta": começa com "**X: texto.**" e explica por que está certa (o mecanismo, não só "o livro diz").
- Cada alternativa errada com parágrafo próprio de 300 a 600 caracteres: o que ela afirma, por que está
  errada, quando ela seria verdadeira (a que outro conceito ou classificação ela pertence) e a confusão
  que ela explora. Com página quando o motivo vem do livro.
- Citação literal do Green com flexibilidade: muita quando a resposta depende da letra do livro, nenhuma
  quando não acrescenta. Citação entre aspas, curta, com página.
- Proibido: travessão (— ou –), emoji, itálico, "assinale", EXCETO. Gabarito equilibrado entre A, B, C, D.
- Tema e até três subtemas da taxonomia; questão de cotovelo vai no tema ombro-cotovelo (arquivo de lote
  separado, aplicado com o tema ombro-cotovelo).
- REGRA DE OURO: nunca escreva fato que você não leu. Antes de aplicar, releia o seu texto e corte toda
  frase que veio da sua memória e não está na página citada (o Claude fazia essa limpeza em todo lote:
  inervação, anatomia fina, números, nomes de técnica). Raciocínio explicativo pode, desde que não vire
  um "fato" atribuído ao Green.

=== FORMATO DOS ARQUIVOS ===
- Lote de questões novas: copie o cabeçalho e o formato de ~/OrtoQuestoes-Biblioteca/lotes/sbcm-2022/lote_19.py
  (REF, ARQ, PROVA, ANO, AREA e QUESTOES com dict(sub, pag, num, gab, refs, enun, alts, conceito,
  correta, inc)). Modelo comentado: scripts/simulados/exemplo_lote.py.
- Revisão de comentário de questão já publicada: copie ~/OrtoQuestoes-Biblioteca/lotes/sbcm-2024/_comentario.py
  para a pasta da prova (trocando ARQ, ANO e a frase "Inspirada na questão {num} da ...") e use
  K.q("<id>", conceito=..., correta=..., inc={...}, refs=[...]); enunciado, alternativas e gabarito vêm do
  acervo e não mudam. Para ver o que está publicado:
    python -X utf8 ~/OrtoQuestoes-Biblioteca/.oq/ver_acervo.py mao 2028 2032

=== CICLO DE CADA LOTE (no Git Bash) ===
  cd ~/ortoquestoes && export PYTHONUTF8=1
  python -X utf8 -I scripts/mao/biblioteca_local.py copia ~/OrtoQuestoes-Biblioteca/lotes/<prova>/<lote>.py <slug>   (só lotes novos)
  python scripts/simulados/aplicar_lote.py ~/OrtoQuestoes-Biblioteca/lotes/<prova> mao <lote> --conferir
  python scripts/simulados/aplicar_lote.py ~/OrtoQuestoes-Biblioteca/lotes/<prova> mao <lote>
  python scripts/gerar_indice.py
  python scripts/validar_acervo.py            (tem que terminar em "Validação passou sem erros.")
  python -X utf8 -I ~/OrtoQuestoes-Biblioteca/.oq/progresso.py "SBCM 2023" <lote> "num|id|green|situacao" ... --gab "A x, B y, C z, D w"
      (só lotes novos; para revisões, atualize à mão a linha "Andamento" do PROGRESSO)
  git add public docs/mao/PROGRESSO.md && git commit -m "SBCM 2023: questões N a M (mao-XXXX a mao-YYYY)"
  Diga em uma linha o que publicou e siga para o próximo lote, sem esperar resposta.

=== A CADA 2 OU 3 LOTES: TESTE, PUSH, PR E MERGE ===
  PYTHONUTF8=1 npm test        (tem que passar)
  git push -q origin claude/relaxed-franklin-0snpiu
  gh pr create --base claude/pdfs-questoes-tp64dr --head claude/relaxed-franklin-0snpiu --title "..." --body "..."
  Merge SÓ se o check passar, sempre com este comando (o Claude já integrou um PR com o check falhando
  porque o comando de espera não barrava o merge; não repita):
    if gh pr checks <N> --watch --interval 30; then gh pr merge <N> --merge; else echo "verificar falhou, sem merge"; fi
- Se o "verificar" falhar em fixtures/testar_sincronia_aparelhos.mjs ("2 !== 10"): esse teste quebra
  quando roda entre a meia-noite e o começo da madrugada (horário de Brasília) e não tem relação com o
  acervo. Não faça merge; espere e rode de novo com gh run rerun <id> --failed. Qualquer outra falha:
  leia o log (gh run view <id> --log-failed), corrija, faça commit e push no mesmo branch.
- Comentários do robô "chatgpt-codex-connector" dizendo que a revisão falhou ou que a cota acabou não
  pedem correção nenhuma.

=== NUNCA ===
- Livro, resumo enviado ou prova original no git (confira git status antes de cada commit; só public/,
  docs/ e, quando for post, marketing/).
- Fato que você não leu; página que você não abriu; página da folha do PDF no lugar da página impressa.
- Divulgar quantidades totais do acervo.
- Refazer o que está "publicada" sem motivo; mudar enunciado, alternativa ou gabarito numa revisão.
- Merge com o check falhando.

=== SE EU PEDIR POST DE INSTAGRAM NO MEIO ===
Leia docs/marketing/orientacoes.md e o guia do estilo; rode node marketing/instagram/estilos/ordem.mjs
(um estilo que eu pedir vence a fila). Para gerar os PNGs neste computador:
  CHROMIUM="C:/Program Files/Google/Chrome/Application/chrome.exe" node marketing/instagram/gerar.mjs <post.html>
Abra cada PNG e confira antes de me mandar; mande também a legenda do feed em texto, pronta para copiar.

=== ANTES DE PARAR ===
Atualize no PROGRESSO a linha "Andamento" e a retomada com o ponto exato (prova, lote, próximo id),
faça commit e push. O próximo "continue" retoma por ela.
```

---

## Ferramentas que o prompt usa

Estão em `docs/mao/ferramentas/` (no git) e copiadas para `~/OrtoQuestoes-Biblioteca/.oq/`:

| Arquivo | Para quê |
|---|---|
| `pagina.sh` | Texto bruto de uma página impressa do Green (`bash pagina.sh "13-" 537`) |
| `onde.sh` | Página impressa de cada ocorrência de um trecho (`bash onde.sh "trecho" "livros__13"`) |
| `ver_acervo.py` | Enunciado, alternativas, gabarito e comentário publicados de uma faixa de ids |
| `progresso.py` | Atualiza a tabela da prova no PROGRESSO depois de cada lote |
