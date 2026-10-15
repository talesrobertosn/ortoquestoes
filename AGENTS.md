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

Agentes externos (por exemplo, ChatGPT Codex) que forem criar simulados a partir de um capítulo devem
seguir o roteiro passo a passo de [docs/prompts/codex-simulados.md](docs/prompts/codex-simulados.md).

Para qualquer conteúdo de divulgação (Instagram, propaganda, e-mail), siga
[docs/marketing/orientacoes.md](docs/marketing/orientacoes.md): público, horários de postagem,
frequência e regras da marca definidas pelo dono do projeto. Para fazer os posts, siga o roteiro
[docs/prompts/codex-instagram.md](docs/prompts/codex-instagram.md) (imagens em HTML a partir dos
modelos; nunca imagem gerada por IA).
Para os estilos aprovados, prefira o kit [marketing/kit/README.md](marketing/kit/README.md): fila pronta e um comando por post
(roteiro curto para o Codex em [docs/prompts/codex-post-rapido.md](docs/prompts/codex-post-rapido.md)).

## Flashcards (Torneio de Flashcards, desde 12/10/2026)

Projeto de vários dias, feito com Claude e com ChatGPT. Antes de mexer em qualquer coisa de
flashcards, leia [docs/flashcards/README.md](docs/flashcards/README.md): decisões do dono, formatos,
desenho da Batalha, arquitetura, roteiro e o protótipo em `prototipos/flashcards/`.

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
