# Piloto automático: capítulo do Tales → OrtoQuestões Simulados + resumo → site

Pedido do Tales (17/10/2026): "garanta que tudo isso seja salvo no MD para que só eu falar 'faça resumo disso',
sem dar nenhum comando muito específico, saiba que é exatamente isso e faça sozinho, do jeito que vem fazendo".

Este arquivo é o roteiro completo, de ponta a ponta, do jeito que os capítulos de 16 e 17/10/2026 foram feitos
(colo do fêmur, transtrocantérica, cotovelo, luxação do joelho, toracolombar, rádio e ulna, úmero proximal,
síndrome compartimental, escápula, clavícula, tálus, carpo, mão, patela, diáfise do fêmur e fêmur distal).
Quando o Tales mandar um PDF com uma frase curta, **siga este roteiro sem pedir confirmação** e publique no fim.
Os detalhes técnicos estão nos guias citados; aqui está a ordem, as decisões e o jeito.

## 1. O que cada pedido curto quer dizer

| O Tales escreve | O que fazer |
| --- | --- |
| "faça resumo disso", "resumo de X", "apenas resumo", "já temos as questões" | **Só o resumo.** Cite em `treino=` os simulados que já existem do capítulo (`registro.py` mostra quais). |
| "faça questões", "só as questões" | **Só os OrtoQuestões Simulados** do capítulo. |
| "questões e resumo", "questões e depois resumo", "faça tudo", PDF mandado sem dizer nada | **Os dois:** primeiro os simulados, depois o resumo citando-os. |
| "faça resumo disso" e o capítulo **não tem nenhum simulado** ainda | Faça só o resumo (é o que foi pedido) e, no relatório, ofereça em uma linha fazer os simulados. |
| "tem alguns temas aí", "dois capítulos" | Um fluxo completo **por capítulo** (ver 3). |
| "lembra de subir", "pode publicar" | Já está autorizado sempre: publicar no fim sem perguntar (ver 9). |
| "ignora", "veio por engano" | Marcar no [CHECKLIST.md](CHECKLIST.md) como ignorado e não fazer. |

Nunca pergunte "quer que eu faça?" para algo que está nesta tabela. Pergunte só se o PDF não for um capítulo
(ou estiver ilegível) ou se o pedido contradizer uma regra de ouro abaixo.

**Ordem dos temas (Tales, 17/10/2026):** ele segue a lista do site "Trauma adulto" ordenada por número de questões de
prova (prioridade máxima → alta → média → baixa). Em 17/10/2026 estava no **anel pélvico** (mandou junto o acetábulo).
Os próximos dessa lista que ainda não têm resumo: planalto tibial, fraturas por estresse, úmero distal, diáfise da
tíbia, subtrocantérica, fraturas expostas, coluna cervical alta, luxação do quadril e cabeça femoral, luxação
acromioclavicular, rádio distal, tornozelo e, depois, os de prioridade baixa. Quando ele mandar um capítulo fora dessa
ordem, faça normalmente; a ordem serve para saber o que esperar e para conferir se o PDF é o tema certo.

## 2. Regras de ouro (nunca quebrar)

1. Todo resumo e todo simulado saem **só do capítulo que o Tales enviou** nesta sessão. Sem PDF, peça o PDF.
2. **Nunca inventar** prova, ano, id de questão ou estatística. Prova e ano vêm do acervo.
3. **Preservar o gabarito oficial.** Divergência entre gabarito e livro vai em `alerta:` (resumo) ou `alerta`
   (comentário), explicando as duas posições, sem ensinar algo falso para defender a banca.
4. **Não divulgar quantidades totais do acervo** em texto nenhum.
5. **Sem imagem gerada por IA** e sem figura protegida sem licença: o resumo cita número e legenda da figura.
6. Todo resumo é **aberto** (`acesso: gratis`); resolver as questões citadas é do assinante.
7. SQL, quando houver, vai como texto no chat (AGENTS.md).

## 3. Abrir o PDF e descobrir o que ele é

O nome do arquivo engana com frequência (já veio "calcaneus" que era tálus, "cabeça do rádio" que era úmero
distal, "toracolombar" com o anel pélvico junto). Então, antes de tudo:

1. `pdfinfo` para o número de páginas e, página a página, as primeiras linhas (`pdftotext -f N -l N`): o
   número do capítulo no topo ("57", "58"...), o título e os autores marcam onde cada capítulo começa.
2. Monte o mapa: capítulo, título, autores, páginas. Página solta do capítulo seguinte (só a primeira) é ignorada.
3. Extraia o texto de cada capítulo para o scratchpad (`pdftotext -layout -f A -l B`; se vier com colunas
   misturadas ou páginas duplicadas/giradas, use o recorte de [README.md](README.md), passo 1).
4. Confira no [CHECKLIST.md](CHECKLIST.md) se o capítulo já tem resumo. **Se já tem** e o pedido inclui
   questões, faça os simulados e **atualize** o resumo existente (nova `versao`, `treino=` com os novos,
   acréscimos do capítulo), sem reescrever o que está bom e sem perder citação real.
5. Diga ao Tales em uma frase o que o PDF tem de verdade quando não bater com o nome, e siga.

## 4. Dividir o trabalho

- **Um agente por capítulo**, em paralelo, cada um com o fluxo inteiro (simulados → resumo). Use o modelo de
  instrução da seção 10.
- **Só um processo escreve no acervo por vez.** Todo comando que grava `public/acervo` ou `public/biblioteca`
  roda dentro de `flock /tmp/claude-0/acervo.lock -c '...'` (aplicar_lote sem `--conferir`, enriquecer,
  gerar_indice, validar_acervo, `gerar.mjs`).
- **Capítulos vizinhos do mesmo PDF** (diáfise e fêmur distal, patela e luxação do joelho) se sobrepõem:
  diga a cada agente a fronteira do outro e mande ler o `registro.py` de novo antes de aplicar, para não criar
  gêmeas entre si (aconteceu em trauma-1661/1663 e foi corrigido trocando o conteúdo dos próprios ids).
- Agentes **não fazem commit nem push**; quem coordena junta, confere e publica.

## 5. OrtoQuestões Simulados (quando pedidos)

Guias: [docs/padrao-questoes-simulado-teot-taro.md](../padrao-questoes-simulado-teot-taro.md),
[scripts/simulados/README.md](../../scripts/simulados/README.md), [mapas-da-banca.md](../simulados/mapas-da-banca.md)
e o padrão editorial dos comentários ([docs/padrao-editorial-comentarios.md](../padrao-editorial-comentarios.md),
referência [docs/exemplos/mao-0853.json](../exemplos/mao-0853.json)).

1. **Engenharia reversa primeiro.** `python3 -I scripts/simulados/registro.py` (o que já existe) e
   `mapear_banca.py` (questões oficiais do assunto: prova, ano, gabarito, como foi perguntado, armadilha,
   fatos repetidos). Leia também os simulados existentes do tema para não duplicar.
2. **Quantos:** em média **10** por capítulo; 12 se precisar; 14 a 15 em tema que cai muito (diáfise do fêmur);
   até 30 só em tema muito importante. Todos úteis: **gêmea do que já caiu** (mesmo fato, outro ângulo) ou
   **lacuna com chance real** (ponto do capítulo com cara de prova que ainda não caiu).
3. **Formato:** o da prova real (TEOT/TARO): enunciado curto, quatro alternativas plausíveis, gabarito
   distribuído entre A, B, C e D, sem figura, caso clínico só quando a banca usa caso para aquele ponto.
4. **Comentário:** aula independente (fundamento, mecanismo, por que cada alternativa está certa ou errada,
   inclusive a correta), com tamanho proporcional à questão e sem molde fixo (ver "Professor humano, não molde"
   no padrão editorial). Como são simulados, o `conceito` termina com o parágrafo
   **"Por que esta questão foi criada."**: em que prova e ano o fato caiu e como foi cobrado, ou por que o
   ponto tem cara de prova.
5. **Aplicar:** escreva os lotes (a partir de `exemplo_lote.py`) no scratchpad, rode
   `aplicar_lote.py PASTA tema lote_a,lote_b --conferir`, depois sem `--conferir` dentro do lock, seguido de
   `gerar_indice.py` e `validar_acervo.py`.
6. **Registrar** o mapa do assunto no fim de [mapas-da-banca.md](../simulados/mapas-da-banca.md) (Edit pontual):
   recorte, o que a banca cobra, divergências e lições.

## 6. O resumo: o jeito de escrever

Formato técnico (front matter, blocos `!questoes`, `!figura`, `!tabela`, radar) em [README.md](README.md).
Modelos de nível: [`rockwood10-53-colo-femur.md`](../../conteudo/biblioteca/rockwood10-53-colo-femur.md) e
[`rockwood10-66-talus.md`](../../conteudo/biblioteca/rockwood10-66-talus.md).

- **Nome:** `conteudo/biblioteca/<livro><edição>-<capítulo>-<tema>.md` (ex.: `rockwood10-58-femur-distal`).
  `fonte:` diz o arquivo enviado, a data e as páginas; `subtemas:` usa os nomes exatos do acervo; `resumo:` é
  uma linha com os epônimos e números que mais caem.
- **Primeira seção sempre "Como ler este capítulo"** `{radar=fundamento}`: de onde veio o texto, quanto e como
  o tema cai, os poucos blocos em que a banca gira, e um `> Na prova:` com as frases-chave em negrito.
- **Ordem das seções = ordem da cobrança**, não o índice do livro. Profundidade proporcional ao que cai, sem
  cortar os fundamentos que explicam o porquê (anatomia, vascularização, biomecânica, forças deformantes).
- **Tom:** português claro de quem ensina para a prova, frases diretas, explicando a regra e a razão da regra.
  Negrito nos números, epônimos e condutas que decidem a questão; epônimos em VERSALETE no estilo do acervo
  (HAWKINS, CANALE, BLUMENSAAT). Listas e tabelas quando organizam (classificações, indicações, valores).
  Texto autoral: nunca tradução corrida nem trecho longo copiado. Números e condutas são os do capítulo.
- **Questões no meio do texto:** depois de cada ponto cobrado, um `!questoes` com `central=` (a questão real
  que melhor representa), `relacionadas=` (as outras reais do mesmo ponto), `treino=` (simulados), e as linhas
  `conceito:` (o fato em uma frase), `como:` (prova/ano e como perguntaram), `armadilha:` (o distrator que pega)
  e, quando houver, `alerta:` (gabarito × livro). Cite sempre a cópia mantida, nunca a marcada como duplicata.
- **Radar honesto:** `confirmado` só com questão real na seção; `fundamento`, `clinico` ou `oportunidade`
  nos demais. O `gerar.mjs` recusa `confirmado` sem questão real.
- **Fatos que a banca cobra e o capítulo não traz:** a questão entra como relacionada, e o texto avisa que o
  dado não está no capítulo. Erro do próprio livro: explique o certo no texto, sem alarde.
- Questões sem gabarito no acervo podem ser citadas; diga o que o livro sustenta, nunca apresente resposta
  como oficial.
- Tamanho típico: 35 a 60 minutos de leitura (60 a 90 KB de texto).

## 7. Conferir

Antes, ligue o resumo a todas as questões do tema (linha `subtemas:` completa e `python3 -I scripts/biblioteca/cobertura.py`): veja [CAPITULO-RESUMO-E-QUESTOES.md](CAPITULO-RESUMO-E-QUESTOES.md), seção 3.

```bash
flock /tmp/claude-0/acervo.lock -c 'node scripts/biblioteca/gerar.mjs && python3 scripts/validar_acervo.py'
npx tsc -b && npm test && node fixtures/testar_revisao.mjs
```

Se um teste quebrar porque o acervo cresceu (orçamento de tamanho, sorteios que dependem do tamanho),
conserte a suposição do teste ou o código; **nunca** pule ou desligue teste. Para ver no navegador:
`npx vite`, abrir `#/resumos/<id>` no computador e no celular.

## 8. Fechar a documentação

- [CHECKLIST.md](CHECKLIST.md): uma linha na tabela "Temas enviados pelo Tales" (arquivo, páginas, capítulo,
  autores, id, simulados em `treino=`, principais alertas) e o tema marcado na fila.
- [mapas-da-banca.md](../simulados/mapas-da-banca.md): já feito no passo 5.6.

## 9. Publicar (sem perguntar)

1. Commit só dos arquivos do trabalho (pathspecs; não leve rascunho de outro agente), com as linhas de
   atribuição da sessão. Commit de rascunho no branch é permitido; **merge só do que está pronto**, porque a
   Biblioteca é gerada a partir de todos os `.md` de uma vez.
2. `git push -u origin <branch de trabalho>`.
3. PR do branch de trabalho para `claude/pdfs-questoes-tp64dr` e merge (dispara o `publicar.yml`, que gera as
   páginas `/resumos/<id>/` e o sitemap). Corpo curto: o que entrou, ids, alertas, validação.
4. Resumo novo entra sozinho no sitemap; não precisa reenviar no Search Console (opcional: pedir indexação
   de `https://ortoquestoes.com.br/resumos/<id>/` na Inspeção de URL).

## 10. Modelo de instrução para um agente por capítulo

> Você trabalha em /home/user/ortoquestoes. Leia AGENTS.md, CLAUDE.md, docs/biblioteca/PILOTO-AUTOMATICO.md e os
> guias que ele cita. TAREFA: capítulo N do <livro, edição> — "<título>" (<autores>). Texto em <scratchpad>/capN/cap.txt
> (PDF: <caminho>, páginas A–B). Pedido do Tales: "<frase dele>" ⇒ <só resumo | só simulados | os dois>.
> <Se os dois:> primeiro os simulados que o tema merecer (seção 5; sem cota), aplicados dentro do lock; depois o resumo
> `conteudo/biblioteca/<id>.md` (seção 6) citando-os em `treino=`. <Se o resumo já existe: atualize-o.>
> <Fronteira com o capítulo vizinho, se houver.> Atualize CHECKLIST e mapas com Edit pontual. Não faça commit nem push.
> No fim, responda: ids criados, id do resumo, alertas, dúvidas e problemas.

## 11. O relatório para o Tales

Curto, em português, sem jargão técnico: o que foi para o site (com o link do PR), uma tabela por capítulo
(simulados novos, resumo novo ou atualizado, quantas divergências), as divergências gabarito × livro mais
importantes com prova e ano, o que o PDF tinha de diferente do nome, e o que ficou esperando por ele.
