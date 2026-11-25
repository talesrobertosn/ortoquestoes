# Instruções permanentes do OrtoQuestões

Regras de conteúdo (comentário, miniaula, resumo, simulado) resumidas numa página só, a mais recente: [docs/REGRAS-CONTEUDO.md](docs/REGRAS-CONTEUDO.md). Leia-a primeiro; os documentos citados abaixo ficam para detalhe.

Para qualquer arte, cenário, personagem (esqueleto, gato, coruja, cavaleiros), fala dos bichos ou tela do site, leia
primeiro [docs/design/DIRECAO-ARTISTICA.md](docs/design/DIRECAO-ARTISTICA.md): a direção artística aprovada pelo
dono (pipeline HD-2D, paleta, personagens, onde cada bicho aparece, o que ele recusou e como verificar antes de
publicar), junto de [DESIGN.md](DESIGN.md).

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
reversa). Faça **quantos simulados** o tema merecer, sem cota (Tales, 31/10/2026: tema bom, mais; tema ruim, menos; o ponto de partida sai de `scripts/biblioteca/fila_teot_taro.py` e se ajusta pelas lacunas do capítulo), todos
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

## Alternativas em ordem nova na revisão (desde 19/10/2026)

Pedido do Tales: na revisão, a pessoa lembrava a letra da certa em vez de raciocinar. Na primeira vez a
questão aparece na ordem da prova; da segunda em diante, numa ordem nova, com a certa fora da letra da
última vez (numéricas só invertem; Certo/Errado não muda). Liga e desliga em "Personalizar" na sessão.
Tudo o que é guardado (respostas, turma, caderno, riscadas) continua na letra da prova; só a tela troca.
Código em `src/dados/ordemAlternativas.ts`; testes em `fixtures/testar_ordem_alternativas.mjs` e
`fixtures/e2e_ordem_alternativas.mjs`.

**Quem escreve comentários:** o comentário pode citar alternativas pela letra ("Correta: C", "a alternativa B").
`scripts/letras_alternativas.py` confere cada letra e grava `public/acervo/letras.json`; questão com letra
duvidosa ("imagem A", "tipo C") fica sempre na ordem da prova. `aplicar_comentarios.py` e o deploy rodam o
script sozinhos; se mudar comentário por outro caminho, rode `python3 scripts/letras_alternativas.py`.
Para a questão poder embaralhar, prefira citar a alternativa como "alternativa C" ou "Correta: C (texto)".

## Shorts (desde 25/11/2026)

Questões em pé, uma por tela, como os Shorts do YouTube (pedido do Tales). Página `#/shorts` (`src/paginas/Shorts.tsx`),
portas em `src/shorts/Vitrine.tsx` (prateleira da Início, cartão em pé do Treinar, quadradinho do menu "Continue sua
jornada") e o item Shorts na barra de baixo do celular. Sorteio e revisão escondida em `src/shorts/sorteio.ts` (teste
`fixtures/testar_shorts.mjs`): imagem com mais chance (meta de ~60%, sem roteiro fixo, só a primeira é sempre com imagem)
e volta surpresa em 3 a 7 dias. Índice leve gerado por `scripts/gerar_shorts.py` (roda no deploy). Servidor em
`supabase/migrations/20261125220000_shorts.sql`: cota grátis de 5 por dia (`configuracao_comercial.limite_diario_shorts`),
histórico, corações (que gravam nota 10 na avaliação do comentário) e o painel (Conteúdo › Shorts). A resposta nos Shorts
conta no desempenho com a marca `sh` em `respondidas` e fica fora da fila da Revisão.

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

**Escopo confirmado pelo pedido atual do dono (27/10/2026):** nesta revisão de
comentários existentes, o usuário pediu “TODAS as questões de temas que têm resumo”
e definiu que “As fontes são conteudo/biblioteca/*.md e
public/biblioteca/capitulos/*.json”, com `baseResumo` somente após conferir cada
alternativa. Isso inclui as candidatas existentes de SIMÃO/SBCM no catálogo.
É uma exceção específica de fonte secundária neste fluxo: não exigir nem inventar
leitura ou páginas do Green para classificar um comentário efetivamente conferido
contra o resumo. Identificar a fonte consultada como resumo; conservar as
referências primárias anteriores no histórico de revisão, sem apresentá-las como
reconsultadas. A regra do Green e de páginas conferidas continua valendo para
criar novos simulados da mão e para revisões que declarem fonte primária.
Preservar também o motivo específico de criação dos simulados existentes,
conferindo prova, ano e número com seus metadados de origem. Lacunas continuam
pendentes e não recebem selo. Esta exceção não muda gabaritos nem revisão médica.

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

## Eficiência de desenvolvimento e GitHub Actions (Tales, 20/10/2026)

Regra compartilhada por Codex, Claude Code e demais agentes: produzir mais trabalho
útil por ciclo de publicação, preservando qualidade, testes, integrações e o site.
Agrupar mudanças relacionadas em entregas funcionais; usar commits locais
intermediários e enviá-los juntos. Evitar push a cada ajuste pequeno. Em sessões
intensas, buscar intervalos aproximados de 30–60 minutos entre pushes quando
compatível com o trabalho, sem espera artificial, prazo rígido ou atraso de uma
entrega concluída ou do fim da sessão. Correções críticas, colaboração, testes
remotos necessários e publicações urgentes justificam push imediato.

Lotes editoriais de dez questões continuam sendo unidades de revisão e evidência;
não exigem um push, PR ou deploy por lote. Acumular lotes relacionados já validados
em uma entrega quando houver capacidade, sem reduzir a profundidade dos comentários.
Antes de enviar, conferir branches, PRs e commits remotos para preservar trabalho
concorrente. Não usar force push, commits/pushes vazios nem mudanças irrelevantes
para provocar CI. Aguardar checks do head efetivo e conferir a publicação real.

Os dois workflows e os critérios conservadores de impacto estão documentados em
[docs/OPERACAO-ACTIONS.md](docs/OPERACAO-ACTIONS.md). Não usar `[skip ci]` para
contornar validações. Novas entradas do aplicativo ou dos testes devem continuar
exigindo CI; ao mudar filtros, verificar dependências e testar mudanças mistas,
exclusões, renomes e falhas de comparação. Esta seção é a fonte única dessas
orientações; CLAUDE.md deve apontar para ela, sem manter regras paralelas.

Em 20/10/2026, Tales aprovou como referência de profundidade o comentário de
[pediatria-1036](https://ortoquestoes.com.br/#/questao/pediatria-1036), registrado em
[023-exemplo-aprofundado-mao-sem-pulso.json](docs/comentarios-resumos/lotes/023-exemplo-aprofundado-mao-sem-pulso.json).
Seguir a aula com mecanismo, comparação dos cenários, raciocínio próprio para cada
alternativa, controvérsias explícitas e fonte conferida; extensão sozinha não basta.

## Tom dos e-mails (Tales, 15/11/2026)

Antes de alterar mensagens, ler [docs/emails/TOM.md](docs/emails/TOM.md). A orientação atual
substitui o tom antigo “fofo/amigo”: mensagens claras, úteis e cordiais, sem P.S., pressão emocional,
culpa pela ausência ou recuos como “sem cobrança”, “a escolha é sua” e “a porta fica aberta”.
Não preencher mensagens só para alongar. Preservar personalização com fatos reais e regras de envio.

## Avisos e novos achievements (Tales, 17/11/2026)

Antes de criar, alterar ou notificar uma conquista, ler [docs/conquistas/AVISOS.md](docs/conquistas/AVISOS.md).
É o contrato compartilhado por Codex e Claude: catálogo único, triagem por família, expectativa com objeto fechado,
comemoração com a medalha real, apresentação compacta no celular e limites contra repetição. Novos emblemas de
família existente entram automaticamente; nova família exige perfil, arte e testes. Não reativar as visitas
aleatórias de `Encontros`. Preservar catálogo e medalhas ganhas. Conferir a galeria `#/dev/conquistas` e rodar
`fixtures/testar_avisos_conquistas.mjs` (incluído no `npm test`) antes de publicar.

## E-mails focados no estudo (Tales, 17/11/2026)

Não recitar cadastro: serviço/hospital, cidade, R1–R3/ortopedista, objetivos declarados e horário
não preenchem e-mails. O texto incentiva começar/continuar as questões. Abaixo de 50% ou sem
amostra, não expor taxa; com bom acerto, reconhecer o resultado e sugerir a próxima faixa,
elogiar a melhor área, recomendar atenção ao tema a revisar e parabenizar ranking real.
Taxa positiva e tema a revisar podem coexistir, sem mostrar nota ruim nem falar “pior área”.
Esta instrução substitui a antiga proibição de combinar acerto e área a melhorar. TOM.md detalha.

## E-mails de reta final e boas-vindas (Tales, 22/11/2026)

Na reta final e na véspera, reconhecer o volume de estudo, mostrar o acerto mesmo abaixo de 50%
quando houver amostra suficiente, citar a melhor área, indicar um tema a revisar e parabenizar
a colocação quando houver ranking recente. Citar o percentual e o número de questões por área
quando houver amostra, inclusive para a área a revisar. Ligar o dado a uma ação concreta, escrever
transições de carta e variar assunto, percurso e conselho com o desempenho. Desejar boa prova.
Nas boas-vindas, ensinar um jeito de começar pelas questões e como o Cronograma poupa tempo.
Os demais e-mails mantêm os seus motivos e regras de envio, no mesmo tom cordial. Ver `docs/emails/TOM.md`.

## Automáticos e cortesia na assinatura (Tales, 17/11/2026)

Primeiras dez questões, retorno e cronograma pronto não geram mais e-mail. Otimizar os
automáticos já existentes; outros contatos ficam manuais no hub. Não criar e-mail de cortesia.
A tela da assinatura e o painel devem distinguir período pago e cortesia, com validade e
primeiro nome das indicações quando disponíveis. Nova compra preserva os dias de acesso,
com a conta dos dias no checkout; nunca prometer soma apenas na interface. Ver
[docs/conta/ACESSO-CORTESIA.md](docs/conta/ACESSO-CORTESIA.md).
