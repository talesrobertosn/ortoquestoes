# Mega prompt: refazer os temas que mais caem no TEOT e no TARO até 100%

Cole o bloco abaixo numa sessão nova do Claude Code aberta em `~/ortoquestoes` (MacBook do Tales, com os livros em
`~/OrtoQuestoes-Biblioteca/livros`). Ele é autossuficiente: diz o objetivo, o critério de parada, o ciclo de
trabalho com os comandos, as regras e o relatório.

---

```
Você vai trabalhar sozinho, sem me perguntar nada, até terminar 100% dos temas que mais caem no TEOT e no TARO.
Responda sempre em português. Antes de qualquer coisa, leia nesta ordem: CLAUDE.md, AGENTS.md,
docs/padrao-editorial-comentarios.md (seção "Professor humano, não molde"), docs/biblioteca/REFAZER-RESUMOS-E-COMENTARIOS.md,
docs/biblioteca/PILOTO-AUTOMATICO.md (seção 6, resumo), docs/biblioteca/RELATORIO-TEOT-TARO.md e
~/OrtoQuestoes-Biblioteca/CHECKPOINT-GERAL.md.

## 1. Objetivo e critério de parada

Para cada subtema que mais cai no TEOT e no TARO: um resumo de aula com pelo menos 45 KB e todas as questões
TEOT/TARO do subtema com comentário em miniaula no jeito novo. As outras questões do mesmo subtema (outras bancas,
simulados) entram junto quando forem do mesmo resumo, menos as provas protegidas da mão.

A fila e o placar saem do acervo, nunca da memória:

    python3 scripts/biblioteca/fila_teot_taro.py --resumo     # placar: X de 88 temas feitos
    python3 scripts/biblioteca/fila_teot_taro.py --proximo    # próximo subtema e ids pendentes
    python3 scripts/biblioteca/fila_teot_taro.py              # fila inteira

Tema que mais cai = subtema com 15 ou mais questões TEOT/TARO (88 subtemas em 31/10/2026, 2.291 questões).
Questão refeita = comentário com geradoEm a partir de 2026-10-30. Tema feito = resumo com 45 KB ou mais e nenhuma
questão TEOT/TARO pendente. Só pare quando o --resumo disser 88 de 88 (ou "FILA CONCLUÍDA" no --proximo). Não
pare para perguntar, não pare ao fim de um tema, não pare porque o contexto encheu: o contexto é resumido
automaticamente; depois de cada resumo de contexto, releia o CHECKPOINT-GERAL.md e rode --proximo.

Ordem: a do script (mais pendentes primeiro). Pode antecipar um subtema quando ele divide o mesmo resumo com o que
você acabou de fazer (ex.: "Luxação do joelho" e "LCP" no rockwood10-61). Os simulados do Fellowship do quadril
(bloco 5 do Callaghan: quadril-0242 a 0304 e 0319 a 0321) e os 64 simulados antigos de anatomia do quadril
(quadril-0645 a 0708) ficam para depois da fila.

## 2. Regras que nunca mudam

- Não digitar senhas, não apagar dados de usuários, não expor credenciais, não gastar, não burlar limites de uso.
- Livros, resumos enviados e provas originais nunca vão para o git (ficam em ~/OrtoQuestoes-Biblioteca).
- Não mexer nas provas protegidas de Cirurgia da Mão: SBCM, SIMÃO, ENARE Cirurgia da Mão, USP-SP, UFG, PUC-SP, INTO,
  FMRP-USP, IAUPE, Einstein, UERJ. Pode ligá-las a um resumo, nunca reescrever o comentário delas.
- Preservar o gabarito oficial sempre. Se os livros discordam ou não trazem o dado, explique no campo alerta.
  Questão sem gabarito oficial (certo/errado antigas do TARO): mantenha o campo provavel e diga no alerta.
- Nada sem fonte: cada fato vem de um livro local lido por você (capítulo e página impressa quando houver) ou das
  notas de fontes já conferidas em ~/OrtoQuestoes-Biblioteca/lotes/**/NOTAS-FONTES.md e nos lotes antigos.
  Se não achar a fonte, não invente: escreva o raciocínio e ponha o alerta.
- Sem travessão (— ou –), sem itálico, sem emoji. Nomes próprios de classificações e epônimos em CAIXA ALTA, como
  nos comentários atuais (WASSEL, MADELUNG).
- Figura de livro: liberada em comentário e em resumo (uso interno), recortada da página do PDF; nunca desenhar SVG;
  nunca em página pública de SEO (o gerar_resumos_seo.py já tira a figura).
- Commits terminam com "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"; o corpo da PR termina com
  "🤖 Generated with [Claude Code](https://claude.com/claude-code)". Uma PR por tema (ou por resumo, quando vários
  subtemas dividem o mesmo resumo), sempre com scripts/publicar_pr.sh.

## 3. Ambiente

- Sempre antes de node, pdftotext ou npm: eval "$(/opt/homebrew/bin/brew shellenv)". python3 é o 3.9. Não há gh.
- Branch nova por tema, a partir da base: git fetch -q origin && git checkout -B claude/refazer-<tema> origin/claude/pdfs-questoes-tp64dr
- Arquivos temporários no scratchpad da sessão (ou /private/tmp/claude-501).

Livros (apelidos de scripts/livros.py): rwa (Rockwood adultos 10ª), rwc (Rockwood crianças 10ª), tach (Tachdjian 6ª),
campbell21, green7 (Green 7ª em inglês; o Green 8ª traduzido NÃO está neste Mac, use as notas antigas dele),
adulthip (Callaghan), netter-ao (Netter Atlas de Anatomia Ortopédica, PT), hoppenfeld-pt (escaneado, sem texto:
olhe as páginas com a prévia de figura). Comandos:

    python3 scripts/livros.py capitulos rwa
    python3 scripts/livros.py titulos rwa 61
    python3 scripts/livros.py buscar rwa "Schenck" --cap 61 --max 8
    python3 scripts/livros.py ler rwa 2650 2660 > /private/tmp/claude-501/cap.txt
    python3 scripts/livros.py secao tach "Radial Longitudinal Deficiency" --max 8000

## 4. O ciclo de um tema (repita até a fila acabar)

1. Rode --proximo. Anote o subtema, os ids pendentes e o resumo ligado.
2. Dossiê: python3 scripts/biblioteca/dossie_tema.py "<subtema>" > dossie.md. Atenção: o dossiê pode não listar
   questões que têm o subtema em segundo lugar; a lista de pendentes do fila_teot_taro.py é a que vale. Junte as
   duas, tire as protegidas da mão e despeje enunciado, alternativas e gabarito num arquivo para ler.
3. Questões com imagem: abra todas antes de comentar (public/imagens/<tema>/<id>-1.*). Monte pranchas de 10 com
   PIL e leia com a ferramenta Read. Anote o que a seta aponta.
4. Leitura do livro: leia o capítulo inteiro que sustenta o subtema (não só os trechos das questões). Extraia os
   Critical Points, as tabelas e as classificações. Salve as notas com página em
   ~/OrtoQuestoes-Biblioteca/lotes/<pasta-do-tema>/NOTAS-FONTES.md à medida que lê (sobrevive ao resumo de contexto).
   Aproveite os lotes antigos do tema (oficiais.py, lote_a.py), que trazem fatos já conferidos.
5. Simulados novos (antes dos comentários, quando o tema pedir): o --proximo mostra quantos já existem e um ponto
   de partida para novos (1 a cada 4 questões TEOT/TARO, +3 se a banca cobra muito desde 2021, menos os que já
   existem). Não é cota: depois de ler o capítulo, faça mais quando houver lacunas cobráveis (classificações,
   números e condutas que nenhuma questão treina) e menos, ou nenhum, quando o tema é estreito ou já está coberto.
   Escreva no relatório quantos fez e por quê. Formato e aplicação em docs/biblioteca/PILOTO-AUTOMATICO.md, seção 5
   (scripts/simulados/aplicar_lote.py, primeiro com --conferir). Simulado novo entra em treino= no resumo.
6. Comentários: escreva em lotes .py de 10 a 15 questões (formato abaixo) e converta cada lote.
7. Confira as afirmações sem fonte: releia cada lote procurando números, epônimos e frases que você não leu no
   livro; corte ou mande para o alerta.
8. Converta todos juntos (para pegar parágrafo repetido entre lotes) e aplique:
       python3 scripts/biblioteca/lote_comentarios.py TODOS.py saida.json --registro reg.json
       python3 scripts/aplicar_comentarios.py saida.json && bash scripts/pos_aplicar.sh
9. Resumo: reescreva (ou crie) com 45 KB ou mais, no jeito de escrever dos anteriores (formato abaixo).
   Antes de mudar um resumo existente, veja se algum comentário revisado depende dele (campo baseResumo):
       python3 -c "import json,glob;[print(i) for p in glob.glob('public/acervo/comentarios/*.json') for i,c in json.load(open(p)).get('comentarios',json.load(open(p))).items() if c.get('baseResumo') and any(f.get('resumo')=='<ID>' for f in c['baseResumo'].get('fontes',[]))]"
   Se houver, ou reescreva esses comentários no mesmo PR, ou deixe o resumo como na base (foi o que quebrou a PR 716
   com o Rockwood de tornozelo e o de fise distal do úmero).
10. Figuras: 2 a 5 por resumo, das que ensinam (classificação, via de acesso, radiografia típica):
       python3 scripts/figuras_livro.py localizar "<PDF>" "FIGURE 38.1"
       python3 scripts/figuras_livro.py previa "<PDF>" 1635 --saida /private/tmp/claude-501/prev
       python3 scripts/figuras_livro.py recortar "<PDF>" 1635 x0,y0,x1,y1 --tema mao --nome green7-38-1 --legenda "Fonte: ..., cap. 38, Fig. 38.1, p. 1330. ..." --registro reg.json
   Abra a prévia, escolha a caixa olhando a imagem, abra o recorte para conferir. Anexe a figura a 2 a 4 comentários
   pelo campo figuras do lote.
11. Valide e meça: node scripts/biblioteca/gerar.mjs; python3 scripts/biblioteca/medir_profundidade.py resumo <ID>;
    grep -c "—\|–" no resumo deve dar 0.
12. Conferência visual (obrigatória): print de uma questão respondida com figura e do resumo na altura de uma
    tabela e de uma figura, no computador e no celular:
       CHROMIUM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/capturar_telas.mjs /questao/<id> pref --roteiro scripts/comentarios-resumos/roteiro-print.mjs --pasta <dir>
    Para o resumo, um roteiro que rola até o texto da tabela e da figura (exemplo em
    docs/prompts/MEGA-PROMPT-TEOT-TARO.md, seção 7). Abra os prints e corrija o que estiver quebrado.
13. Documentação e publicação: linha no RELATORIO-TEOT-TARO.md (seção 6 abaixo), linha em
    docs/biblioteca/RELATORIO-EXECUCAO.md, marca de feito na tabela do REFAZER quando o tema estiver lá, bloco no
    CHECKPOINT-GERAL.md (fora do git). Commit e bash scripts/publicar_pr.sh "Título" corpo.md, que espera os checks e
    imprime MESCLADO. Se falhar, leia o log, corrija e publique de novo. Depois volte ao passo 1.

## 5. Como escrever

Comentário (lote .py):

    COMENTARIOS = {
    "mao-0075": dict(
    conceito="""miniaula...""",
    correta="""**D) rigidez em extensão do cotovelo.** frase curta com a fonte (Green, cap. 38, p. 1330).""",
    incorretas={"A": """...""", "B": """...""", "C": """..."""},   # só as letras erradas, nunca a correta
    alerta="""quando o livro discorda ou não traz o dado""",          # opcional
    referencias=[G38, T12, RES],
    figuras=["green7-38-1"],                                           # opcional, nomes do registro
    provavel="B",                                                      # só sem gabarito oficial
    ),
    }

- A correta começa com **LETRA) texto** usando a letra do gabarito do acervo (o site embaralha e troca as letras
  na tela sozinho).
- Professor humano, não molde: tamanho pela importância. Fato seco 0,8 a 2 mil caracteres; mecanismo 3 a 5 mil;
  caso clínico e questão-chave 4 a 8 mil. Piso de 800. Formas variadas: às vezes uma tabela, às vezes um caso, às
  vezes a história do epônimo, às vezes a pegadinha primeiro. Nunca o mesmo esqueleto em todas.
- Cada alternativa errada com explicação própria: o que afirma, onde seria verdade, por que confunde.
- Nada de parágrafo copiado entre comentários (o conversor recusa). Duas questões iguais de anos diferentes: a
  segunda remete à primeira e explora outro ângulo.
- "Por que esta questão foi criada" só nos OrtoQuestões Simulados. "O que a banca quis testar" e "Na prova" só
  quando acrescentam algo.
- Não use o completar.py nem blocos prontos.

Resumo (conteudo/biblioteca/<id>.md, versao +1 ao reescrever):

- Cabeçalho: id, versao, titulo, especialidade, acesso: gratis, livro (curto, aparece na capa), edicao (curta,
  aparece na legenda das figuras), capitulo, autores, fonte (livros e páginas lidos, data), subtemas (os mesmos do
  acervo), resumo (uma linha com os fatos-chave).
- Seções "# Título {radar=fundamento}" ou "{radar=confirmado}", na ordem da cobrança. Primeira seção "Como ler este
  capítulo" com a ideia que organiza o tema e um "> **Na prova:**". Última seção "Revisão rápida" em tabela.
- Fundamentos (anatomia, vascularização, biomecânica, fisiopatologia), clínica, imagem, classificações completas em
  tabela, tratamento com indicações e técnica, complicações e resultados com os números do livro.
- Tabelas sempre em !tabela Título ... !fim (tabela solta em markdown aparece quebrada no site).
- Figura: "!figura 38.1 imagem=mao/green7-38-1.jpeg", na linha seguinte "Fonte: ...", depois "!fim".
- Cada seção termina com o bloco das questões dela:
      !questoes central=<id> relacionadas=<id>,<id> treino=<simulados>
      conceito: ...
      como: O TARO 2015 perguntou ...; o TEOT 2022, ...
      armadilha: ...
      alerta: ... (quando houver)
      !fim
  Simulados sempre em treino=. Todas as questões do subtema ligadas a alguma seção.

## 6. Relatório

Depois de cada PR, acrescente uma linha na tabela de docs/biblioteca/RELATORIO-TEOT-TARO.md: data, PR, subtema(s),
resumo (antes e depois em KB, figuras e tabelas), simulados novos (quantos e por que esse número), comentários (quantos, de quais provas, faixa de tamanho), alertas
abertos, e o placar do --resumo. Registre também as lacunas (fato sem fonte local, questão sem gabarito, imagem
ilegível) na seção de pendências do mesmo arquivo.

Ao chegar a 88 de 88:
1. rode --resumo e cole o placar final no topo do RELATORIO-TEOT-TARO.md;
2. escreva no mesmo arquivo um resumo executivo: temas feitos, número de comentários e resumos, KB escritos,
   figuras, PRs, alertas mais importantes, pendências e o que vem depois (Fellowship do quadril, simulados antigos,
   temas com menos de 15 questões, FILA-EDITORIAL);
3. publique o relatório como página privada (Artifact) e me mande o link junto com o resumo executivo na resposta
   final. Se a ferramenta de página não existir, mande o texto do resumo executivo e o caminho do arquivo.

## 7. Roteiro de print do resumo (exemplo)

    export default async (p, foto) => {
      await p.waitForTimeout(2500)
      for (const [txt, nome] of [['<título de uma tabela>', 'tab'], ['<trecho da legenda de uma figura>', 'fig']]) {
        const el = p.getByText(txt).first()
        await el.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -350)); await p.waitForTimeout(800)
        await foto(nome)
      }
    }

Uso: node scripts/capturar_telas.mjs /resumos/<id> pref --roteiro roteiro.mjs --pasta <dir>

## 8. Onde estava o trabalho em 31/10/2026

- Feitos na refação: bíceps, LCA, metástases, hérnia de disco, anatomia da coluna, instabilidade do ombro,
  estadiamento, omartrose, artroplastia do quadril (Callaghan, partes 1 a 6) e malformações congênitas da mão
  (PR 719). O script ainda acusa algumas questões TARO/TEOT desses temas que o dossiê não pegou (por exemplo
  mao-0145, mao-0161, joelho-0067): comece por elas quando o --proximo apontar.
- Em andamento: anatomia do quadril e coxa (netter-anatomia-quadril-coxa, 15 KB), branch claude/refazer-netter-quadril.
  Plano, escopo e as imagens já conferidas em ~/OrtoQuestoes-Biblioteca/lotes/netter/03b-quadril-v2/PLANO.md.
- Pendências conhecidas: tabelas cruas no rockwood10-65-tornozelo e no rockwoodcriancas9-17-fise-distal-umero
  (exigem revalidar 57 comentários juntos); coluna-0422 sem fonte nos livros.
```
