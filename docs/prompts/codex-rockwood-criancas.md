# Prompt para o ChatGPT Codex: Rockwood and Wilkins' Fractures in Children → simulados + resumos

Pedido do Tales (24/10/2026): o Codex lê os capítulos do **Rockwood and Wilkins' Fractures in Children** e faz,
capítulo por capítulo, os **OrtoQuestões Simulados** (10 a 15 por capítulo, no máximo) e **depois** o **resumo**
da Biblioteca, os dois por **engenharia reversa** das questões que já caíram, com imagem quando a prova usa imagem.
Colar o bloco abaixo no Codex e anexar o PDF do capítulo (ou dos capítulos).

---

```
ORTOQUESTÕES: ROCKWOOD AND WILKINS' FRACTURES IN CHILDREN → SIMULADOS + RESUMO (ENGENHARIA REVERSA)

Você trabalha no repositório talesrobertosn/ortoquestoes. Vou anexar o PDF de um ou mais capítulos do
Rockwood and Wilkins' Fractures in Children. Para CADA capítulo, faça nesta ordem:
(1) engenharia reversa das questões que já caíram, (2) 10 a 15 OrtoQuestões Simulados, (3) o resumo da
Biblioteca citando as questões reais e os simulados, (4) conferência e publicação.
Tudo sai SÓ do capítulo anexado. Sem o PDF, pare e peça. Nunca escreva de memória.

AUTORIZAÇÃO
Pode aplicar no acervo, fazer commit e push num branch seu (codex/rockwood-criancas-capNN), abrir PR para
claude/pdfs-questoes-tp64dr e fazer o merge SÓ se o check "verificar" passar:
  if gh pr checks <N> --watch --interval 30; then gh pr merge <N> --merge; else echo "verificar falhou, sem merge"; fi
Se falhar: leia o log (gh run view <id> --log-failed), corrija e faça push no mesmo branch.
Nunca force push, nunca commit vazio, nunca pule ou desligue teste, nunca mexa em configuração do repositório.

LEIA ANTES (inteiros, nesta ordem)
1. AGENTS.md e CLAUDE.md
2. docs/biblioteca/CAPITULO-RESUMO-E-QUESTOES.md e docs/biblioteca/PILOTO-AUTOMATICO.md (o fluxo completo)
3. docs/prompts/codex-simulados.md (passo a passo dos simulados, com os comandos)
4. docs/padrao-questoes-simulado-teot-taro.md (padrão da questão e lições aprendidas)
5. docs/padrao-editorial-comentarios.md, seção "Miniaula, 22/10/2026", e docs/prompts/comentarios-miniaula.md
   (o comentário é uma MINIAULA escrita); exemplos aprovados: docs/exemplos/mao-2164.json e mao-0853.json
6. docs/biblioteca/README.md (formato do resumo) e os resumos-modelo do MESMO livro, que mostram o jeito de
   escrever: conteudo/biblioteca/rockwoodcriancas9-13-supracondiliana.md e
   conteudo/biblioteca/wilkins9-09-diafise-antebraco-crianca.md
7. docs/biblioteca/CHECKLIST.md e docs/simulados/mapas-da-banca.md (o que já foi feito)

O QUE JÁ EXISTE DESTE LIVRO (não refazer)
Caps. 8 (rádio e ulna distais), 9 (diáfise do antebraço), 12 (avaliação do cotovelo), 13 (supracondiliana),
14 (fratura em T), 15 (luxação do cotovelo e epicôndilo medial), 16 (côndilo lateral) e 17 (fise distal do
úmero) já têm simulados e resumo. Se o PDF trouxer um deles, ignore (ou, se eu pedir, só atualize o resumo).
Prioridade dos que faltam: os subtemas de pediatria com mais questões de prova, entre eles "Fraturas do
fêmur e da perna na criança", "Fraturas do tornozelo na criança", "Fraturas da clavícula e do úmero proximal
na criança", "Fraturas da pelve e do quadril na criança", "Trauma da coluna na criança", "Fraturas do pé na
criança" e "Outras fraturas na criança". Confirme a ordem pela contagem de questões oficiais do acervo.

PASSO 0: DESCOBRIR O QUE O PDF É
O nome do arquivo engana. Leia pdfinfo e as primeiras linhas de cada página (pdftotext -f N -l N): número
do capítulo, título, autores e páginas. Monte o mapa capítulo → páginas. Diga em uma linha o que encontrou.
O PDF NUNCA entra no git (nem em public/, nem em pdfs/). Trabalhe numa pasta fora do repositório.

PASSO 1: ENGENHARIA REVERSA DAS QUESTÕES (obrigatória, antes de escrever qualquer questão)
1. python3 -I scripts/simulados/registro.py → o que já existe de simulado (não repetir).
2. python3 scripts/simulados/mapear_banca.py --regex '<termos do assunto, em português, com variações>'
   --subtema '<subtema do acervo>' --tema pediatria > oficiais.txt
   Rode também com --tema trauma quando o assunto aparecer lá (muita questão de criança está em Trauma).
3. LEIA TODAS as questões oficiais do assunto (TEOT, TARO, TEPOT, SBOT-SP, R4...), uma por uma, e TODOS os
   simulados já publicados do tema (public/acervo/temas/pediatria.json com "simulado": true e os comentários
   em public/acervo/comentarios/pediatria.json). As questões novas têm de PARECER com as antigas: mesma
   abertura, mesmo tamanho, mesmo tipo de distrator, mesmo jeito de perguntar.
4. Escreva a seção do assunto em docs/simulados/mapas-da-banca.md: recorte (quantas, quais anos), fatos
   carimbados com prova e ano, tendência dos últimos 5 anos, forma, como o examinador pensa, e as
   divergências entre gabarito e capítulo.

PASSO 2: O PLANO E OS SIMULADOS (10 a 15 por capítulo, NUNCA mais que 15)
1. Plano numa tabela: fato do capítulo (com página) | motivo | formato. Só três motivos valem:
   - GÊMEA de questão que já caiu (o mesmo fato por outro ângulo; pode ser bem parecida);
   - TENDÊNCIA recente da banca (2021 em diante);
   - LACUNA com cara de prova (número, classificação, "o mais frequente", conduta) que ainda não caiu.
   Sem motivo, a questão não entra. 10 boas valem mais que 15 fracas.
2. Extraia o capítulo: python3 -I scripts/simulados/extrair_capitulo.py capitulo.pdf PASTA capNN
   (gera r.txt por página, secoes.txt, figuras.txt, img/ e mosaico*.png).
3. Escreva os lotes a partir de scripts/simulados/exemplo_lote.py. Formato TEOT/TARO: enunciado curto
   (60 a 160 caracteres) como frase incompleta, sem EXCETO, INCORRETA, "assinale" ou lacuna; quatro
   alternativas da mesma classe, em ordem crescente de tamanho, distratores verdadeiros em outro contexto do
   mesmo capítulo; epônimos em CAIXA ALTA; gabarito equilibrado entre A, B, C e D.
4. IMAGEM: use figura do capítulo quando a banca usa imagem para aquele ponto (radiografia para
   classificar, sinal radiográfico, estrutura assinalada, técnica). Em geral 2 a 4 questões com imagem por
   capítulo. Recorte o painel certo de img/ (campo img do lote). Se a figura traz escrita a resposta
   (rótulo, tipo, seta com nome), cubra com retângulo branco num arquivo novo e ABRA A IMAGEM PARA CONFERIR
   antes de aplicar. Nunca imagem gerada por IA.
5. COMENTÁRIO = MINIAULA (padrão de 22/10/2026): o conceito parte do problema da questão, ensina pelos
   fundamentos (anatomia, fise, biomecânica, mecanismo), faz o aluno enxergar na imagem e no exame, fecha
   com "> **Na prova:** ..." e termina com o parágrafo "**Por que esta questão foi criada.**" (em que prova
   e ano o fato caiu e como foi cobrado, ou por que é lacuna com cara de prova). correta começa com
   "**X: texto da alternativa.**"; cada incorreta com frase-título em negrito e motivo próprio. Prosa
   natural de professor, tamanho flexível, citação moderada do livro (capítulo e página). Proibido:
   travessão, meia-risca, itálico com asterisco simples, ==, emoji, rótulos mecânicos ("Passo 1").
6. Confira até zerar erros E avisos:
   python3 scripts/simulados/aplicar_lote.py PASTA pediatria lote_a,lote_b --conferir
   Revisão manual de cada questão: tem motivo no plano? o fato está na página citada do r.txt? só uma
   alternativa é defensável pelo capítulo? as erradas são verdadeiras em outro contexto? o comentário
   ensina quem nunca leu o capítulo? nada que o capítulo não sustente?
7. Aplique (sem --conferir), depois gerar_indice.py e validar_acervo.py, sempre dentro do lock:
   mkdir -p /tmp/claude-0 && flock /tmp/claude-0/acervo.lock -c '...'

PASSO 3: O RESUMO (DEPOIS dos simulados), TAMBÉM POR ENGENHARIA REVERSA
1. Arquivo conteudo/biblioteca/rockwoodcriancas9-<cap>-<tema>.md, no MESMO jeito de escrever dos resumos
   anteriores deste livro (leia os dois modelos acima antes). Primeira seção "Como ler este capítulo"
   {radar=fundamento}: de onde veio o texto, quanto e como o tema cai, os blocos em que a banca gira e um
   "> Na prova:" com as frases-chave.
2. ORDEM DAS SEÇÕES = ORDEM DA COBRANÇA da banca (do mapa do passo 1), não o índice do livro. Profundidade
   proporcional ao que cai, sem cortar os fundamentos que explicam o porquê (fise, remodelação, vascularização).
3. Depois de cada ponto cobrado, um bloco !questoes com central= (a questão real que melhor representa),
   relacionadas= (as outras reais), treino= (os simulados novos), e as linhas conceito:, como:, armadilha:
   e alerta: (quando o gabarito diverge do livro; o gabarito oficial é preservado e as duas posições são
   explicadas). Cite TODAS as questões reais que o capítulo ensina e TODOS os simulados do capítulo.
4. Radar honesto: "confirmado" só com questão real na seção.
5. Figuras no resumo: bloco "!figura N-M" com a legenda (o leitor mostra número e legenda; a imagem só
   aparece com licença de reprodução, regra do docs/biblioteca/README.md).
6. Linha subtemas: com todos os nomes de subtema do acervo que são esse tema (exatos, de
   public/acervo/indice.json), para o convite "Leia o resumo" aparecer no fim de TODAS as questões do tema.
   Depois: flock ... 'node scripts/biblioteca/gerar.mjs' e python3 -I scripts/biblioteca/cobertura.py, e
   acrescente os subtemas do mesmo tema que ele sugerir.
7. Texto autoral, português claro de quem ensina para a prova, negrito no que decide a questão. Nunca
   tradução corrida. Nada de total de questões do acervo.

PASSO 4: CONFERIR, REGISTRAR E PUBLICAR
1. flock /tmp/claude-0/acervo.lock -c 'node scripts/biblioteca/gerar.mjs && python3 scripts/validar_acervo.py'
   npx tsc -b && npm test && node fixtures/testar_revisao.mjs && npm run build
2. Registre: uma linha no docs/biblioteca/CHECKLIST.md (arquivo, páginas, capítulo, autores, id do resumo,
   ids dos simulados, alertas) e o "Aproveitamento do capítulo" no fim da seção em mapas-da-banca.md.
3. git status: só podem aparecer public/acervo/..., public/imagens/pediatria/..., public/biblioteca/...,
   conteudo/biblioteca/<id>.md, docs/biblioteca/CHECKLIST.md e docs/simulados/mapas-da-banca.md.
   Nenhum PDF. Nunca altere questão oficial, gabarito oficial ou comentário de outra questão. Nunca
   "conferido": true.
4. Um commit por capítulo ("Rockwood crianças cap. NN: N simulados e resumo <id>"), push, PR e merge
   conforme a autorização.

RELATÓRIO FINAL (curto, para o Tales)
Por capítulo: ids dos simulados, quantos com imagem, id do resumo, quantas questões reais citadas, as
divergências gabarito × livro com prova e ano, e o que o PDF tinha de diferente do nome. Link do PR.
```
