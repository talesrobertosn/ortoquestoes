# Auditoria e continuidade dos Flashcards — 14/10/2026

Tales autorizou publicar os quatro blocos e continuar as pendências sem novas confirmações rotineiras. Cada bloco parte da base atual, fica em um PR, passa por tipagem/testes/build e conferência visual antes de publicar. A pausa de monstros novos permanece. Não alterar questões médicas, gabaritos, comentários, planos nem dados existentes de usuários.

## Publicação confirmada

PRs #247, #248, #249 e #250 mesclados. Deploy `38622895104`, commit `2471c5588b975f288ce4d4d67518eaba4c7dc195`, concluído com sucesso. O site público abriu sem erros JavaScript em computador e celular. Os PNGs dos três cenários, cortina, pedregulho de cristal e OGG foram lidos no domínio e tiveram suas assinaturas binárias conferidas. A sessão protegida não foi testada com conta real; os testes funcionais do jogo foram locais, com Supabase desativado.

## Bloco da Biblioteca — PR #252 mesclado

- **34:** livro autoral em Python/numpy, um por “Sabia” da sessão, com animação de chegada à estante. Não equivale a domínio permanente e não cria coleção na conta.
- **35:** diário ao concluir: trechos de clima, melhor sequência e área com maior proporção de “Sabia”, apenas com pelo menos três flashcards na área. São autoavaliações, não precisão médica aferida.
- **37:** Leitura tranquila é voluntária e vale só na sessão. Mantém chuva suave, sem clarões/aura/fanfarra, sem alterar a avaliação, seleção ou revisão dos flashcards.
- **77:** chuva em laço sintetizada com ruído filtrado no barramento Ambiente. O trovão existente continua ligado ao relâmpago no clima normal. Som desligado e volume continuam valendo.
- Nenhum SQL nem formato novo de progresso. O diário é estado React efêmero. O arquivo `biblioteca/sessao.ts` é puro e tem testes de amostra mínima, sequência, trechos e preservação das entradas.
- Capturas e testes deste bloco: `capturas/biblioteca-continuidade-14-10/`; Playwright em 1400×860, 390×844 e 844×390.

## Pendências antigas já resolvidas no código

- **76:** `tocarFaixa` entra em 1,6 s; a faixa anterior sai por ganho em 0,35 s e só para depois de 2,2 s. O fallback procedural também sobrepõe fades. Não havia necessidade de outra implementação de crossfade.
- **79:** `Entrada.tsx` já usa `Ator` no bestiário; o renderer lê as folhas novas. Nenhum sprite foi redesenhado nesta auditoria.
- **80:** `Estudo.tsx` mostra posição/total, barra e contagem Sabia/Hesitei/Errei. O contador já existia.

## Fila para continuar

| Grupo | Ideias | Próxima ação |
|---|---|---|
| Biblioteca | 36, 38, 39, 40 | Selos derivados, camadas musicais, leitores decorativos e estações; preservar dados existentes e pausa de monstros. |
| Entrada e personalização | 60, 63, 71, 72, 74 | Tutorial isolado, aparência opcional e informações que já existam no ranking. Não inventar campos públicos nem mexer em limites. |
| Cenários | 43–50 | Biomas autorais felizes, ciclo de luz e animais; sem anatomia nem mudança de dificuldade. |
| Música e desempenho | 70, 75, 82 | Benchmark reproduzível e trilha/loop. Medição em Chromium com viewport de celular não substitui aparelho físico. |
| Demonstração | 81 | Conferir apenas metadados de área; conteúdo médico fica fora do escopo. |
| Regras adicionais | 73 | Desafios não podem contaminar ranking/progresso. Precisam de isolamento antes de habilitar. |
| Em pausa | 53, 54, 56, 57 | Não produzir novos monstros/variantes até Tales retomar essa direção. Ossos nos sprites existentes também permanecem intocados. |

As caixas do plano são a referência de entrega, não uma promessa de que qualquer item sem marca já esteja pronto. Atualizar este relatório e CONTINUAR ao finalizar cada bloco, com PR, testes, capturas e publicação efetivamente observada.

## Bloco seguinte

Tutorial 63 concluído e benchmark 70 parcialmente validado. [Relatório](TUTORIAL-DESEMPENHO-14-10.md). Comparação das capturas antigas confirmou que o formulário e a capa já foram atualizados na versão publicada.

## Música (38, 75, 82)

Concluída para revisão e publicação, com síntese autoral e validação do player. [Relatório](MUSICA-CLIMA-14-10.md). O tutorial e o reparo de integração já estão na base; deploy #257 confirmado.

## Atualização após a publicação do início familiar

Publicados: tutorial #255/#257, música #258, estações #259, ciclo/fauna #260, seis paisagens #261 e abertura por acertos pessoais #262. Leitores 39 em validação no bloco atual. A fila da tabela acima é histórica: consultar as caixas do plano e o topo de CONTINUAR. Permanecem 36, 60, 71, 72, 73, 74 e 81; 70 exige medição física. Monstros 53/54/56/57 continuam em pausa. Nenhum SQL novo nos blocos publicados.
