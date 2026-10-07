# Emblemas: princípios e banco de ideias

## Princípio (decisão do dono do projeto, 07/10/2026)

Emblema não é o que qualquer um consegue. Tem que ser **difícil e desafiador**, no espírito de um
souls-like: a pessoa precisa brigar pelo emblema. Ao criar um emblema novo:

- o primeiro nível já exige esforço real (nada de "responda 10 questões");
- os níveis altos (esmeralda e lendário) são para pouquíssimas pessoas;
- sempre que der, medir **qualidade** (acerto, constância, domínio) e não só volume;
- exceção aceita: emblemas limitados pelo acervo (imagem: 608 questões com imagem) podem ter
  metas menores;
- não tirar emblema de quem já conquistou: endurecer é criar níveis novos acima.

O código está em `src/estado/conquistas.ts`; os dados do índice que os emblemas usam são montados
em `src/estado/usarConquistas.ts`; o teste é `node fixtures/testar_conquistas.mjs`. A arte em pixel
art, quando existir, vai em `public/emblemas/<id>.png` e o id entra em `src/dados/imagensEmblemas.ts`;
até lá aparece a medalha desenhada.

## Feitos em 07/10/2026

| Família | Níveis | Regra |
|---|---|---|
| Pseudartrose | 10 ouro, 50 esmeralda, 150 lendário | Questões erradas 3 vezes ou mais e hoje **dominadas** (acertadas em todas as revisões). |
| Olho de radiologista | 50 prata, 200 ouro, 500 lendário | Acertos em questões com imagem. |
| Certeza cirúrgica | 30 ouro, 60 esmeralda, 120 lendário | Acertos seguidos marcados com "tenho certeza"; qualquer erro zera; acerto com dúvida ou chute não soma. |
| Provas vencidas | 1 ouro, 8 esmeralda, 20 lendário | TEOT ou TARO de um ano com todas as questões respondidas e 70% delas certas. |
| Generalista | 30 ouro, 100 esmeralda, 200 lendário | Assuntos com pelo menos 5 questões respondidas e 80% de acerto. |
| Hora de ouro | 30 ouro, 50 esmeralda, 70 lendário | Acertos dentro de uma mesma janela de 60 minutos. |
| Secreta: Chute de mestre | esmeralda | 5 chutes certos seguidos. |
| Secreta: Tríade terrível | lendário | 3 sessões perfeitas de 20+ questões no mesmo dia. |
| Secreta: Véspera | esmeralda | No dia anterior à prova teórica do TEOT, sessão de 100 questões com 70%. Atualizar `DATAS_PROVA` todo ano. |
| Secreta: Lei de Wolff | esmeralda | 6 semanas seguidas, cada uma com mais questões que a anterior, começando com 50. |

## Guardados para depois (precisam de dado do servidor ou de registro novo)

| Ideia | Regra proposta (já endurecida) | O que falta |
|---|---|---|
| Pontual | Responder a Questão do Dia 30 dias, depois 100 e 365 | Registrar em que dia cada questão do dia foi respondida. |
| Simulado Nacional | Participar de 3 edições seguidas; ficar entre os 10% melhores; 1º lugar (lendário) | Ler a classificação de cada edição. |
| Cronograma impecável | Cumprir a meta semanal 4, 12 semanas seguidas; lendário: do primeiro dia até a prova sem falhar nenhuma semana | Guardar o resultado de cada semana do Cronograma. |
| Pódio da liga | Terminar a semana no pódio 4 semanas seguidas; 1º lugar; chegar à liga mais alta | Histórico de posição da liga por semana. |
| Indicação | Amigos indicados que **assinam**: 1 "Padrinho", 3 "Chefe da residência", 10 "Fundador do serviço" | Ler as indicações convertidas. |

## Banco de ideias (brainstorm, ainda não decidido)

**Aproveitamento**
- *Ortopedista completo*: 80% de acerto de primeira em **todos os 11 temas**, com pelo menos 100 questões em cada.
- *Nota de corte*: 10 sessões de 100 questões com 70% ou mais (simulado de prova inteira).
- *Curva de aprendizado*: aproveitamento das últimas 500 questões 15 pontos acima das primeiras 500.
- *Calibrado*: com 300+ respostas marcadas com certeza, 95% delas certas (saber o que sabe).
- *Contra a corrente*: acertar de primeira 50 questões que a maioria da turma erra (o filtro "a turma erra" já existe).

**Constância e cronograma**
- *Fila zerada*: terminar o dia com a fila de revisão vazia 30 dias seguidos.
- *Run sem dano*: 30 dias seguidos de sequência com pelo menos 70% de acerto em cada dia.

**Chefes (boss fights)**
- *Chefe: TEOT inteiro*: uma prova do TEOT de um ano numa única sessão cronometrada, no tempo da prova, com 75%.
- *Sem morrer*: sessão cronometrada de 100 questões com 85%.
- *New Game+*: dominar todas as questões de um tema.
- *Platina*: todos os emblemas não secretos.

**Comunidade e qualidade do acervo**
- *Professor*: 10 comentários seus na comunidade marcados como úteis.
- *Revisor de banca*: 5 erros reportados por você e corrigidos no acervo.

**Indicação**
- *Turma completa*: 5 amigos indicados que estudaram 30 dias.
