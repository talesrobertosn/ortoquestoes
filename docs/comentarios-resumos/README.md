# Comentários de questões baseados em resumos

Pedido do Tales em 20/10/2026, depois de aprovar o piloto `mao-1079`: revisar as questões dos temas que têm resumo no site, identificar o comentário como **“Comentário baseado em resumo”**, catalogar tudo e permitir continuidade por qualquer agente. Publicação está autorizada; não esperar novos capítulos para trabalhar nos resumos já existentes.

## O que é e o que não é conclusão

O inventário inclui toda questão citada em um resumo ou com pelo menos um subtema em comum. **Estar nessa fila não prova que o resumo contém a resposta.** Leia enunciado, todas as alternativas, figuras e os trechos pertinentes. Um resumo de fraturas da mão não fundamenta automaticamente toda pergunta de tendão, pele ou deformidade de dedo.

Uma questão só recebe `baseResumo` depois de revisão editorial individual da aula e de **cada** alternativa, com todos os fatos necessários sustentados pelos trechos consultados. Acrescentar referência, trocar o título ou copiar um texto genérico para várias opções não conclui a revisão. A identificação na interface é exibida apenas para comentários com esses metadados. Revisão médica é outro atributo: manter `conferido: false`.

O pedido atual do dono de 27/10/2026 abrange **todas** as candidatas existentes,
inclusive SIMÃO/SBCM, e define como fontes os resumos Markdown e seus capítulos
JSON. Nesse fluxo específico, uma revisão com cobertura individual suficiente
é identificada como fonte secundária; não se exige nem se simula consulta do Green
local. As referências primárias anteriores ficam no histórico, sem serem usadas
como prova da nova revisão. Preservar o parágrafo específico “Por que esta questão
foi criada”, conferindo sua origem nos metadados. A exigência do Green com página
permanece para novos simulados e para qualquer revisão que declare fonte primária.
Essa orientação atual prevalece sobre a exclusão de SIMÃO/SBCM descrita nas
passagens `cNN` abaixo, que registra o escopo adotado por aquela passagem.

Não usar comentário antigo como fonte bibliográfica. Ele é material a auditar. Remover afirmações e referências não verificadas que não sejam necessárias; registrar pendência se um dado decisivo não estiver no resumo. Não atribuir leitura direta do livro quando foi consultado apenas o resumo. Referências devem dizer “Conteúdo consultado no resumo …”. Na aula, citar livro, edição, capítulo e seção. O resumo digital não tem página impressa: não transformar posição no PDF composto em página do livro.

Preservar enunciado, opções e resposta oficial. Divergências vão em `alerta`, com explicação das duas posições. Sem gabarito oficial, usar `provavel` só quando a fonte sustenta uma resposta única. Se duas alternativas forem defensáveis, registrar ambiguidade sem fabricar gabarito. Anuladas precisam de explicação de todas as alternativas e da anulação. Duplicadas não contam como revisão independente. Não sobrescrever `conferido: true`.

## Retomar o trabalho

Checkpoint detalhado da passagem atual: [RETOMADA-2026-10-20.md](RETOMADA-2026-10-20.md). Conferir o catálogo e o remoto, pois o checkpoint não substitui o estado de publicação.

1. Ler `AGENTS.md`, `docs/padrao-editorial-comentarios.md`, este protocolo e `ANDAMENTO.md`. O piloto está em `docs/mao/rockwood-piloto-comentario.md` e no lote `000-piloto.json`.
2. Atualizar a branch publicada sem perder trabalho alheio; criar branch de trabalho. Não publicar livros, PDFs ou provas originais.
3. Atualizar o catálogo:
   ```bash
   python3 scripts/comentarios-resumos/catalogo.py atualizar
   ```
4. Exportar um lote de 10 de um capítulo. Prioridade: sem comentário, depois os ainda não revisados. A exportação inclui questões, comentários antigos e os resumos candidatos completos:
   ```bash
   python3 scripts/comentarios-resumos/catalogo.py exportar \
     --capitulo rockwood10-45-fraturas-mao --limite 10 \
     --saida work/fila-mao.json
   ```
   `--capitulo` pode ser omitido para a fila geral. Figuras, anuladas e pendências têm estados próprios; não somem do inventário. Tratá-las separadamente, abrindo toda imagem indispensável antes de escrever.
5. Ler o resumo por inteiro na primeira passagem do capítulo e aprofundar as seções necessárias para cada questão. Fontes editáveis: `conteudo/biblioteca/*.md`. Os blocos com IDs de destino estão em `public/biblioteca/capitulos/*.json`. `public/biblioteca/questoes.json` contém citações diretas. Resumo é fonte secundária; não corrigir o resumo de memória para conseguir justificar uma opção.
6. Escrever manualmente o conteúdo específico. O lote de aplicação é `{ "id": { "questaoSha256": "…", "comentarioAnteriorSha256": "…", "comentario": {…}, "fontes": […], "imagensConferidas": [] } }`. Use as funções `fingerprint_questao`, `sha` e `fonte` de `scripts/comentarios-resumos/catalogo.py` para gerar os metadados **depois de ler os trechos**. `fonte(idResumo, idsBlocos, capitulos)` registra livro, edição, capítulo, seções e hashes. O lote `001-mao.json` é um exemplo real. O hash da questão também inclui os bytes das figuras, para detectar troca de imagem no mesmo endereço. Hash não atesta qualidade clínica; protege a revisão já realizada contra mudanças de arquivos.
7. Conferir e aplicar dentro do lock:
   ```bash
   flock /tmp/claude-0/acervo.lock -c \
     'python3 scripts/comentarios-resumos/aplicar.py docs/comentarios-resumos/lotes/NNN-tema.json --conferir'
   flock /tmp/claude-0/acervo.lock -c \
     'python3 scripts/comentarios-resumos/aplicar.py docs/comentarios-resumos/lotes/NNN-tema.json'
   ```
   O script recusa questões ou comentários alterados desde a leitura, fonte modificada, blocos inexistentes, figura ausente, imagens sem inspeção registrada, alternativas faltantes e substituição de revisão médica. Para retirar um alerta anterior, o lote deve trazer `justificativaRemocaoAlerta`. Não adicionar revisão manual a comentários sem fonte suficiente.
8. O catálogo é atualizado depois da aplicação. Se resumo, questão ou comentário mudar, o item volta a `revalidar`. Reaplicar lote antigo deve falhar: exporte novamente e confira o que mudou. Não atualizar hashes para disfarçar falta de releitura.
9. Validar e publicar em lotes revisáveis:
   ```bash
   python3 scripts/letras_alternativas.py
   python3 fixtures/testar_comentarios_resumos.py
   python3 scripts/validar_acervo.py
   npm test
   npm run build
   git diff --check
   ```
   Enunciado e gabarito precisam permanecer intactos. O build produz os avulsos `acervo/c/<id>.json` a partir de `comentarios/<tema>.json`; não editar avulsos à mão. Como o comentário já existia, o índice não precisa de regeneração; para comentário novo, conferir se o campo `cia` já era verdadeiro e regenerar o índice se necessário, dentro do lock.
10. Conferir visualmente o primeiro exemplo de apresentação e casos especiais em computador/celular. O selo de fonte deve abrir o trecho usado; o convite da Biblioteca ao fim da questão continua disponível e prioriza a fonte registrada no comentário sobre sugestões genéricas por subtema. Commit só dos arquivos próprios; PR para `claude/pdfs-questoes-tp64dr`, checks, merge, deploy e conferência do avulso em produção. Não declarar publicado só porque houve push.

## Estados e evidência

`catalogo.json` é o inventário completo por ID; `ANDAMENTO.md` é a vista resumida. Não somar as contagens dos capítulos porque eles se sobrepõem.

- `pendente`: candidato ainda sem revisão individual.
- `pendente-inspecao-imagem`: há imagem a abrir; nunca inferir seu conteúdo do comentário antigo.
- `pendente-figura-ausente`: a figura indispensável não está disponível.
- `pendente-anulada`: revisar com o formato próprio, sem atribuir resposta oficial.
- `pendente-fonte`: o resumo não basta ou há uma ambiguidade registrada no campo `pendencia`.
- `duplicada`: seguir o ID canônico indicado em `motivo`.
- `preservar-revisao-medica`: conteúdo conferido por médico; não sobrescrever automaticamente.
- `revisada`: comentário revisado e metadados conferem com o estado atual dos arquivos. A disponibilidade no site depende do merge/deploy do commit.
- `revalidar`: texto ou fonte mudou após a revisão. Não contar como concluído.

Para registrar uma pendência, escrever `pendencia` no item correspondente de `catalogo.json` e rodar `atualizar`; o gerador preserva esse campo. Explicar exatamente qual afirmação falta, quais alternativas permanecem possíveis e que fonte permitirá resolver. Não mover questões pendentes para fora do escopo para melhorar porcentagem.

## Quando o Tales enviar o capítulo do livro

Tratar como uma nova fase de fonte primária. Conferir edição e página impressa, aprofundar pontos não cobertos pelo resumo e resolver pendências. Não apagar a proveniência anterior: registrar a passagem de resumo para livro e manter o histórico em lote/commit. Novos resumos entram automaticamente no inventário na próxima atualização. O trabalho só está integralmente concluído quando não houver candidatos sem tratamento; pendências devem permanecer identificadas e não podem ser chamadas de comentários concluídos.

## Continuidade automática (20/10/2026)

Depois do pedido explícito de continuar sem depender de novas mensagens, foi ativada uma tarefa de retomada por hora (maior frequência da ferramenta). Cada execução deve consultar o remoto e os PRs abertos antes de selecionar IDs, executar a revisão e a publicação, e continuar de um checkpoint durável. Não é apenas um lembrete. Não encerrar depois de um lote se houver capacidade de seguir; não confundir revisão incompleta com conclusão integral. Enquanto houver só pendências reais de fonte, verificar material novo sem commits nem notificações repetitivas. O estado efetivo e as eventuais falhas de cada execução precisam ser conferidos; a existência da tarefa não substitui o catálogo nem comprova publicação.

## Passagem de 27/10/2026 (Claude): lotes `cNN`

Pedido do Tales: usar os resumos publicados para aprofundar os comentários de todas as questões ligadas a eles, em miniaula, com cada alternativa explicada e o resumo como fonte registrada. Para não colidir com os lotes numerados do Codex (que seguem na pediatria), esta passagem usa o prefixo `c` (`c01`, `c02`...).

- `scripts/comentarios-resumos/montar.py rascunho.json lote.json` monta o lote a partir de um rascunho escrito à mão (comentário e blocos lidos): calcula os hashes e a fonte, acrescenta a referência padrão e não mexe no texto.
- Temas: os capítulos de adulto mais cobrados e com mais pendências, começando por cotovelo (`rockwood10-40`) e coluna cervical (`rockwood10-48`). SIMÃO e SBCM ficam fora, pela regra da mão (Green com página, só com os livros).
- Questão cuja resposta depende de dado ausente do resumo vai para `pendente-fonte`, com a frase exata que falta; não recebe `baseResumo`.
- O link para o resumo exato já aparece no fim da questão: o convite da Biblioteca abre o trecho registrado em `baseResumo`, e o selo "Comentário baseado em resumo" leva à seção.

Próximos: o resto do cotovelo (questões que pedem outras fontes já estão anotadas), luxação do joelho (`rockwood10-61`), patela (`rockwood10-60`), tálus (`rockwood10-66`), escápula (`rockwood10-33`), toracolombar (`rockwood10-49`).

**Continuação (lotes `c04` e `c05`).** Todos os capítulos de adulto acima e mão, carpo, Galeazzi e a fise do rádio foram tratados: 40 miniaulas novas com fonte registrada (o link do convite e do selo abre o primeiro bloco da fonte, por isso ele é a seção mais específica) e as demais candidatas viraram `pendente-fonte` com a frase exata que falta. A maior parte da fila "pendente" de adulto era candidata só por subtema (artroplastia, menisco, osteotomia, calcâneo, SCIWORA, Dupuytren, rizartrose, tumores da mão): nenhum resumo publicado cobre esses assuntos. Para registrar lacunas em lote: `python3 scripts/comentarios-resumos/pendencias.py lacunas.json` (JSON `{id: texto}`; recusa item já revisado). Divergência entre gabarito e livro vai no `alerta`, com a questão revisada; quando duas alternativas ficam defensáveis ou o resumo diz que não decide, a questão fica pendente. O que sobra pendente fora de SIMÃO/SBCM é pediátrico (epidemiologia, fêmur, antebraço e cotovelo da criança).

**Imagens e anuladas (lotes `c07` e `c08`).** As 34 questões que esperavam inspeção de imagem foram abertas uma a uma: 13 viraram miniaula com a figura descrita no comentário (`imagensConferidas` no lote) e 21 ficaram em `pendente-fonte`, com a imagem já conferida e a frase do que falta. Das anuladas, duas foram revisadas (análise de todas as alternativas e do ponto que tornou a questão discutível, sem eleger resposta). `coluna-0088` e `trauma-0322` têm o texto pronto, mas o validador recusa anulada que ainda traz `gabarito` nos dados; decidir antes se esse campo sai. A figura de `pe-tornozelo-0295` (dissecção da perna) não corresponde ao enunciado sobre o deltoide; o comentário avisa e responde pela anatomia.
