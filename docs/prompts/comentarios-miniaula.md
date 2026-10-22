# Prompt: comentários em formato de miniaula (padrão do site)

Aprovado pelo Tales em 22/10/2026, depois do piloto da `mao-2164` (SEYMOUR). Vale para **todas as questões
do site**, de qualquer tema ou prova. Colar o bloco abaixo no Claude ou no Codex.

---

```
ORTOQUESTÕES: COMENTÁRIOS EM FORMATO DE MINIAULA (PADRÃO DO SITE)

Leia antes: AGENTS.md, docs/padrao-editorial-comentarios.md (seção "Miniaula, 22/10/2026"),
docs/exemplos/mao-2164.json (referência aprovada do formato), docs/exemplos/mao-0853.json e
docs/exemplos/einstein-2026-19.json, e pelo menos 3 comentários já publicados do mesmo tema.

TAREFA
Reescrever comentários existentes como uma MINIAULA ESCRITA, em lotes de 10 questões do tema/prova
que eu indicar (sem indicação: comece pelos comentários mais fracos, curtos ou telegráficos).
Não mudar enunciado, alternativas nem gabarito. Manter os campos: conceito, correta, incorretas,
referencias e alerta (só se houver divergência ou problema real).

COMO A MINIAULA É CONSTRUÍDA (conceito)
1. Partir do PROBLEMA da questão: em uma ou duas frases, o caso concreto e a pergunta que ele cria.
   Nada de introdução genérica ("A fratura X é uma lesão importante...").
2. Ensinar a partir dos FUNDAMENTOS, peça por peça: anatomia, fisiologia, biomecânica ou mecanismo
   que o aluno precisa para chegar à resposta sozinho. Cada peça termina numa conclusão que será usada.
3. Juntar as peças e fazer o aluno ENXERGAR: onde a força atua, para onde o fragmento vai, o que
   abre e o que fecha, como aparece no exame físico e na imagem (radiografia, RM, intraoperatório).
4. Prática só no que importa: por que isso muda a conduta, o que acontece se passar despercebido.
5. Tabela-resumo quando houver comparação ou lista de fatos que vale revisar (opcional).
6. Fechar com o aprendizado decisivo ("> **Na prova:** ..."), uma ou duas linhas.
Escrever em prosa de professor, com subtítulos em negrito curtos ("**O problema da questão.**",
"**Peça 1: ...**"). Negrito estratégico só no que decide a questão. Sem tópicos fragmentados, sem tom
de enciclopédia, sem travessões, sem emojis.

ALTERNATIVAS
- correta: começa com "**X: texto da alternativa.**", explica por que está certa pelo mecanismo da aula
  e o que isso implica na conduta, sem repetir a aula inteira.
- cada incorreta: uma frase-título em negrito com o motivo ("**É o vilão de outra lesão.**"), depois
  onde aquela estrutura/conduta realmente aparece, por que não se aplica aqui e a confusão que a
  banca explora. Cada uma com motivo próprio; nunca o mesmo parágrafo copiado.

TAMANHO FLEXÍVEL
Não há mínimo nem máximo. O que é mais importante (tema muito cobrado, mecanismo difícil, conduta
que muda o prognóstico, pegadinha clássica) merece mais texto; fato simples ou alternativa obviamente
absurda merece menos. Cortar redundância, nunca o que o aluno precisa entender.

FONTES E CITAÇÃO
- Só escrever fato que você leu na fonte. Não inventar número, página, autor ou consenso.
- Citar a fonte com MODERAÇÃO: a referência curta (livro, capítulo, página) aparece onde sustenta um
  fato importante, não em toda frase. Em geral uma referência por parágrafo basta; citação literal
  só quando a resposta depende da letra do livro (classificação, número, frase copiada pela banca,
  divergência). Na dúvida, menos citação e mais explicação.
- CIRURGIA DA MÃO (temas mao, SBCM, SIMÃO): fonte é o Green (livros locais), SEMPRE com capítulo e
  página: "(Green, cap. 41, p. 1602)". Isso só pode ser feito no computador que tem os livros
  (~/OrtoQuestoes-Biblioteca, protocolo em docs/mao/PROTOCOLO.md). Se os livros não estiverem
  disponíveis na sua máquina, NÃO reescreva questões da mão: pule para outros temas e avise.
  Livros e provas originais nunca vão para o git.
- Outros temas: usar a bibliografia já citada na questão ou fonte confiável conferida (Rockwood,
  Campbell, Tachdjian, Netter, diretrizes), com edição e seção. Não citar página que você não viu.
- Se o gabarito divergir da fonte, explicar no comentário e no alerta, preservando o gabarito.

PROCESSO
- Branch de trabalho, um PR revisável por lote; aplicar com os scripts do repositório
  (scripts/aplicar_comentarios.py, scripts/aula/montar.py ou, na mão,
  scripts/simulados/aplicar_lote.py), depois scripts/gerar_indice.py e scripts/validar_acervo.py.
- Não tocar em alterações de outras pessoas no acervo; não divulgar totais do acervo.
- Conferir visualmente a primeira questão do lote na interface (/#/questao/<id>).
- Ao final, entregar: IDs feitos, fontes conferidas, divergências encontradas e o link do PR.
```
