# Instruções permanentes do OrtoQuestões

Para criar, enriquecer ou revisar comentários, leia primeiro
[docs/padrao-editorial-comentarios.md](docs/padrao-editorial-comentarios.md) e siga
integralmente seu padrão de aula independente e análise detalhada de cada alternativa.

Esse padrão é uma diretriz do dono do projeto de 04/10/2026, válida para todos os
temas e provas. Tem precedência sobre limites antigos de tamanho e restrições
editoriais dos prompts. O exemplo aprovado está em
[docs/exemplos/mao-0853.json](docs/exemplos/mao-0853.json).

Em 10/10/2026, o dono também aprovou o comentário refeito de `mao-0459`
(Einstein 2026, questão 19, estadiamento de Enneking) como padrão para os
próximos comentários e revisões. O exemplo completo está em
[docs/exemplos/einstein-2026-19.json](docs/exemplos/einstein-2026-19.json).
Manter a explicação do tema e a análise desenvolvida de cada alternativa,
com profundidade proporcional à questão, sem preencher texto por tamanho.

Não tratar uma justificativa breve por alternativa como enriquecimento concluído.
Não alterar gabaritos oficiais nem inventar evidência. As instruções atuais do
usuário prevalecem. Para tarefas sem relação com comentários, manter o escopo
solicitado e as convenções existentes do repositório.

Orientação do dono de 10/10/2026: tomar as decisões editoriais e de importação
necessárias sem pedir confirmação, inclusive ao reconciliar respostas antigas
sem fonte com um gabarito oficial enviado. Preservar a letra da banca e explicar
divergências médicas no campo `alerta`, sem ensinar uma afirmação falsa para
defender o gabarito. Registrar a origem e a alteração na documentação interna.
Publicação já está autorizada; concluir os checks e publicar sem nova pergunta.

Para criar questões de OrtoQuestões Simulados (TEOT e TARO) a partir de um capítulo da
bibliografia, leia antes
[docs/padrao-questoes-simulado-teot-taro.md](docs/padrao-questoes-simulado-teot-taro.md):
as questões devem ficar o mais próximas possível da prova real (diretriz do dono do projeto de
07/10/2026), no assunto, no nível e no formato, e o comentário segue o padrão enriquecido.
Use as ferramentas e o passo a passo de [scripts/simulados/README.md](scripts/simulados/README.md)
e consulte e atualize os mapas da banca em
[docs/simulados/mapas-da-banca.md](docs/simulados/mapas-da-banca.md) e as lições aprendidas do guia.
Antes de cada capítulo, faça a engenharia reversa do assunto (seção "Engenharia reversa por tema" de
[docs/padrao-questoes-simulado-teot-taro.md](docs/padrao-questoes-simulado-teot-taro.md)) e escreva o lote a partir dela.

Roteiro completo e autônomo (pedido do Tales, 17/10/2026: basta ele dizer "faça resumo disso"):
[docs/biblioteca/PILOTO-AUTOMATICO.md](docs/biblioteca/PILOTO-AUTOMATICO.md).

Pedido do dono (16/10/2026) sobre capítulos novos: ele pode pedir **só o resumo**, **só as questões** ou
**os dois**. Nos dois, faça **primeiro os OrtoQuestões Simulados e depois o resumo** (que cita os simulados novos em
`treino=`). Antes de escrever qualquer um, leia as questões que já caíram e os simulados que já existem (engenharia
reversa). Faça em média **10 simulados** por capítulo (12 se precisar; até 30 só em tema muito importante), todos
úteis: gêmeas do que já caiu ou questões novas com chance real de cair. No fim do comentário de cada simulado,
escreva **"Por que esta questão foi criada"**: em que prova e ano o fato caiu e como foi cobrado, ou por que o ponto
tem cara de prova. Toda questão precisa de um motivo. Resumos seguem [docs/biblioteca/README.md](docs/biblioteca/README.md).

Desde 16/10/2026 (pedido do Tales), cada simulado novo termina o `conceito` com um parágrafo curto
"**Por que esta questão foi criada.**" (prova e ano em que o fato caiu, ou o motivo de ter cara de prova);
ver a lição de mesmo nome no guia acima.

Provas de Cirurgia da Mão (SIMÃO e prova de título da SBCM) viram OrtoQuestões Simulados com `prova` e `ano`
da prova espelhada (ex.: "SIMÃO · 2024"), reescritas sem copiar e comentadas a partir dos livros locais (Green)
com a página impressa: roteiro em [docs/mao/PROTOCOLO.md](docs/mao/PROTOCOLO.md), andamento em
[docs/mao/PROGRESSO.md](docs/mao/PROGRESSO.md) (pedido do Tales, 19/10/2026). Só SBCM e SIMÃO viram simulado;
as demais instituições (ABC, Unesp etc.) entram como prova oficial com o nome real, sem duplicar o que já está no site.

Agentes externos (por exemplo, ChatGPT Codex) que forem criar simulados a partir de um capítulo devem
seguir o roteiro passo a passo de [docs/prompts/codex-simulados.md](docs/prompts/codex-simulados.md).

Para qualquer conteúdo de divulgação (Instagram, propaganda, e-mail), siga
[docs/marketing/orientacoes.md](docs/marketing/orientacoes.md): público, horários de postagem,
frequência e regras da marca definidas pelo dono do projeto. Para fazer os posts, siga o roteiro
[docs/prompts/codex-instagram.md](docs/prompts/codex-instagram.md) (imagens em HTML a partir dos
modelos; nunca imagem gerada por IA).
Para os estilos aprovados, prefira o kit [marketing/kit/README.md](marketing/kit/README.md): fila pronta e um comando por post
(roteiro curto para o Codex em [docs/prompts/codex-post-rapido.md](docs/prompts/codex-post-rapido.md)).

## Commits, pushes e GitHub Actions (diretriz do Tales, 20/10/2026)

O repositório é privado e os minutos do GitHub Actions estavam acabando: cada push num branch com PR aberto
roda o "Verificar Pull Request" (cerca de 3 min) e cada merge no branch de publicação roda a publicação (cerca de
3 min). Vale para Claude Code, Codex e qualquer outro agente; a produtividade não diminui, só as execuções redundantes.

- Trabalhar normalmente, com **commits locais** a cada passo lógico (um lote, uma correção), mas **agrupar os
  pushes**: um push quando um conjunto funcional estiver pronto, em geral a cada 30 a 60 minutos de trabalho
  intenso (no caso das provas e comentários, a cada 2 a 4 lotes, junto com o PR). Não é limite rígido: não
  esperar artificialmente quando a entrega terminou ou a sessão vai acabar.
- Push imediato continua valendo para correção crítica no site, colaboração com outro agente, teste remoto ou
  publicação urgente pedida pelo Tales.
- PR para o branch de publicação só com o pacote pronto (testes locais passando), e merge logo depois: evita
  verificações repetidas no mesmo PR. Não abrir PR para cada commit.
- Nunca: force push, commit ou push vazio, reescrever o histórico de branches de outros agentes, mexer em PR
  alheio em andamento.
- Antes do push, `git pull` do próprio branch e do branch de publicação; conflito em `public/acervo/indice.json`
  ou `busca.json` se resolve rodando de novo `python scripts/gerar_indice.py`.
- Os workflows (`.github/workflows/`) já ignoram mudanças que não entram no site (`docs/`, exceto
  `docs/ativacao-e-rollback-assinaturas.md` e `docs/comentarios-resumos/`, `marketing/`, `prototipos/`,
  `relatorios/`, `pdfs/`, `.claude/` e os `.md` da raiz). Se um teste ou script do build passar a ler um arquivo
  dessas pastas, acrescente o caminho à lista de exceções nos dois workflows.

## Flashcards (Torneio de Flashcards, desde 12/10/2026)

Projeto de vários dias, feito com Claude e com ChatGPT. Antes de mexer em qualquer coisa de
flashcards, leia [docs/flashcards/README.md](docs/flashcards/README.md): decisões do dono, formatos,
desenho da Batalha, arquitetura, roteiro e o protótipo em `prototipos/flashcards/`.

## Biblioteca de resumos (#/resumos, beta desde 16/10/2026)

Antes de criar ou mexer num resumo, leia [docs/biblioteca/README.md](docs/biblioteca/README.md) e o
checklist [docs/biblioteca/CHECKLIST.md](docs/biblioteca/CHECKLIST.md). Regras do Tales: **todo resumo sai
de um capítulo de livro ou artigo que ele enviou** (nunca de memória); no plano gratuito, no máximo 5
resumos abertos; as questões reais são citadas no meio do texto, com botão para resolver. Conteúdo em
`conteudo/biblioteca/*.md`, gerado com `node scripts/biblioteca/gerar.mjs`.

## Comentários baseados em resumos (pedido de 20/10/2026)

Para revisar questões dos temas com resumo, classificar a fonte ou retomar a fila, leia
[docs/comentarios-resumos/README.md](docs/comentarios-resumos/README.md) e
[docs/comentarios-resumos/ANDAMENTO.md](docs/comentarios-resumos/ANDAMENTO.md).
O inventário completo está em `docs/comentarios-resumos/catalogo.json`; atualize com
`python3 scripts/comentarios-resumos/catalogo.py atualizar`. Correspondência de subtema é
candidatura, não revisão concluída. Só atribuir `baseResumo` após conferir individualmente
conceito e todas as alternativas com os trechos usados. O selo é “Comentário baseado em resumo”.
Preservar gabaritos, registrar ambiguidades e fonte insuficiente; não inventar página impressa.
Publicar em lotes, sem nova confirmação, e continuar até tratar a fila inteira. Novos capítulos
que o Tales enviar depois constituem a próxima fase, com fonte primária e páginas conferidas.

## SQL para o Supabase (orientação do dono, 08/10/2026)

Toda migração nova também vai para `supabase/colar-no-painel/` e, ao entregar, o SQL completo é
mandado **como texto na conversa**, num bloco de código, para copiar direto no SQL Editor (o dono
não consegue copiar bem a partir do arquivo).

## Cripta do Residente (flashcards, beta público desde 13/10/2026)

Até 13/10/2026 a rota `#/flashcards` ficava escondida, sem menu, banner, ranking público nem página
de vendas. Nesse dia o Tales autorizou o **beta público** e essa restrição deixou de valer:
menu com selo Beta, quadro na página inicial, central `#/flashcards`, ranking da Cripta, desempenho,
revisão, cronograma, opinião e apresentação na página de planos. Continuam valendo: as regras atuais
de acesso, assinatura e limites (sem mudar preço nem inventar benefício), nada de e-mail, mensagem ou
post em rede social. **Nome (regra do Tales, 13/10/2026):** fora do jogo é sempre "Flashcards" ou
"Torneio de Flashcards", nunca "Cripta" nem "masmorra" (o público da medicina não sabe o que é);
"Cripta do Residente" só aparece dentro do jogo (entrada temática e partidas). O roteiro completo e o que já foi feito estão em
[docs/flashcards/LANCAMENTO-BETA.md](docs/flashcards/LANCAMENTO-BETA.md).

A lista geral de ideias com checklist (feito / a fazer) é o [docs/PLANO-DE-IDEIAS.md](docs/PLANO-DE-IDEIAS.md): marque o que concluir.
Para continuar o jogo, leia primeiro [docs/flashcards/CONTINUAR.md](docs/flashcards/CONTINUAR.md):
estado atual, próximos passos, restrições, como testar (Playwright em três tamanhos) e como publicar.
O último resumo do trabalho está em [docs/flashcards/RESUMO-CHATGPT.md](docs/flashcards/RESUMO-CHATGPT.md).

Diretriz de 13/10/2026: em mudanças visuais, enviar ocasionalmente capturas reais da interface
(computador e/ou celular) durante o trabalho, identificando prévia ou versão publicada.
Flashcards: a orientação mais recente de ranking único, progressão por acerto real da turma e
histórico pessoal, entrada sem Torre e cronograma próprio está em [docs/flashcards/JORNADA-UNICA.md](docs/flashcards/JORNADA-UNICA.md).

## Cronograma (reforma desde 14/10/2026)

Antes de mexer no cronograma (`#/cronograma`), leia [docs/cronograma/PLANO.md](docs/cronograma/PLANO.md):
princípios de apresentação ("onde você está, hoje, amanhã, esta semana, depois"), protótipo, etapas com checklist.
