# Padrão editorial permanente: cada questão é uma aula independente

Diretriz de Tales Roberto, aprovada em 04/10/2026. Aplica-se a todo pedido de
“enriquecer”, “comentar”, “melhorar” ou “reescrever comentários”, em qualquer tema ou prova.
Esta é a referência editorial do projeto. Substitui limites antigos de caracteres,
número de frases e proibições de tabelas ou listas dos prompts de enriquecimento.

## Professor humano, não molde (Tales, 31/10/2026)

Depois da refação do quadril pelo Callaghan, em que os comentários saíram todos com o mesmo esqueleto
(abertura, explicação, três blocos do livro, "Por que esta questão foi criada", "Na prova", correta e
erradas) e com blocos copiados entre questões para chegar a 4,5 mil caracteres, Tales pediu: "seja
humano, seja flexível, não ser engessado em tudo". Valem estas regras, acima das anteriores:

- **Sempre miniaula, nunca molde.** Um professor que comenta cada questão com o livro aberto escreve cada
  uma de um jeito. Às vezes começa pelo caso, às vezes pelo mecanismo, pela figura, pela pegadinha, pela
  história ou por uma tabela de contraste; a questão fácil pode ser telegráfica.
- **Tamanho proporcional à importância.** Não há mínimo de 4,5 mil. Referência solta: fato seco (data,
  nome, número) de 0,8 a 2 mil caracteres; conceito com uma pegadinha de 2 a 3 mil; mecanismo de 3 a 5
  mil; conduta, caso clínico e questão-chave do tema de 4 a 8 mil, com figura quando ajudar. A trava só
  barra o raso (menos de 800).
- **Nada copiado.** Nenhum parágrafo se repete entre comentários do mesmo tema. Se duas questões
  precisam do mesmo fato, cada uma o conta do seu ângulo, com palavras próprias; o resto fica no resumo,
  com o convite "Leia o resumo". O `lote_comentarios.py` recusa parágrafo longo repetido no lote.
- **"Na prova" só quando fizer sentido**, quando houver uma frase de memória que valha a pena.
- **"Por que esta questão foi criada" é só para OrtoQuestões Simulados.** Questão de prova real não leva
  esse fecho (o conversor recusa). "O que a banca quis testar" também é opcional: só quando a intenção da
  banca ensinar algo.
- **Alternativas com peso diferente.** A distratora perigosa ganha um parágrafo; a absurda, meia linha.
- **Figuras do livro** quando o aluno precisa ver (liberadas nos comentários, uso interno, nunca SVG).

## Miniaula, 22/10/2026 (padrão do site para todas as questões)

Depois do piloto da `mao-2164` (fratura de SEYMOUR), Tales definiu a **miniaula escrita** como padrão de
todos os comentários do site. Referência: [exemplos/mao-2164.json](exemplos/mao-2164.json). Prompt pronto
para Claude e Codex: [prompts/comentarios-miniaula.md](prompts/comentarios-miniaula.md).

- Abrir com o caso concreto, ensinar a partir dos fundamentos, fazer o aluno enxergar (forças,
  deslocamento, exame físico, imagem), relacionar à prática só no que importa e fechar com o
  aprendizado decisivo.
- **Naturalidade:** prosa de professor humano, que flui. Nunca rótulos mecânicos ("Peça 1", "Passo 2",
  "O problema da questão"); títulos, quando houver, são frases naturais em negrito, e nem todo
  parágrafo precisa de um (Tales, 22/10/2026: "peça 1, peça 2 ficou simplesmente horrível").
- Cada alternativa, inclusive a correta, com motivo próprio, sem repetir a aula.
- **Tamanho flexível:** o mais importante recebe mais texto, o menos importante recebe menos.
- **Citação moderada:** citar menos do que no piloto, mas ainda citar; a referência curta sustenta os
  fatos importantes (em geral uma por parágrafo) e a citação literal fica para quando a letra do livro
  decide. Nas questões da mão, sempre Green com capítulo e página, o que só se faz no computador com
  os livros locais.

## Ajuste editorial de 08/10/2026, pedido do dono

### Profundidade solicitada em 10/10/2026

Os comentários do Einstein devem ser reescritos: justificativas curtas não
atingiram a qualidade esperada. O exemplo adicional aprovado é `pediatria-0313`
(osteogênese imperfeita e classificação de Sillence). Desenvolver uma aula do
tema e explicar cada alternativa. Dimensionar a extensão pela complexidade de cada questão, sem faixa de caracteres
como meta ou teto. Em 21/10/2026, Tales reforçou que questões que merecem mais
atenção precisam de comentários maiores e detalhados; questões simples podem ser
menores. Desenvolver decisões clínicas, mecanismos, cenários que mudam a conduta e
alternativas plausíveis na medida necessária, sem repetir conteúdo para ganhar tamanho.
Questões complexas precisam de mais fundamentos, mecanismos, classificações e
relações clínicas; questões simples podem ser mais curtas. A concisão desejada
elimina redundância, não o conteúdo que o aluno precisa aprender.

O dono aprovou explicitamente a versão refeita de `mao-0459`, Einstein 2026,
questão 19 (estadiamento de Enneking): “ficou bem bom o comentario. esse deve
ser o padrao”. O conteúdo aprovado está em
[exemplos/einstein-2026-19.json](exemplos/einstein-2026-19.json).
Aplicar essa profundidade às provas da USP e aos próximos lotes: explicação do
tema, comparações úteis e análise desenvolvida de cada alternativa. A
organização pode variar; não repetir tabelas ou estruturas por obrigação.

A explicação precisa ser útil e natural. Não há piso de caracteres: um comentário
menor é preferível a texto esticado. Manter os fundamentos necessários e a análise
de cada alternativa, com tamanho proporcional à dúvida que ela cria.

Eliminar parágrafos artificiais sobre como a banca transforma a imagem, sobre a
existência da questão ou sobre a organização do lote. A engenharia reversa, com
IDs, provas e anos, fica no mapa e no plano. Quando uma pegadinha merecer explicação
no comentário, mostrar a diferença anatômica diretamente, sem um discurso sobre o
examinador. Evitar repetir que o dado aparece no recorte, narrar como ler as quatro
opções ou acrescentar atributos sem relação com a pergunta só para ganhar volume.
Usar títulos, tabelas e fechos apenas quando ajudarem o leitor.

Esta orientação prevalece sobre as metas antigas de 4.000/4.500 caracteres e a
exigência de parágrafos entre 400 e 700 caracteres dos roteiros de simulados.

## Referências para o aluno (08/10/2026)

Usar apenas a fonte bibliográfica pertinente: livro, edição confirmada e seção.
Não mostrar nome do PDF, posição da folha recortada, “fornecido pelo usuário”,
“recorte enviado” ou instruções de edição como “sem nomes e com seta amarela”.
A legenda pode ser simplesmente “Fonte: Netter, Atlas de Anatomia Ortopédica, 2ª edição.”
Os detalhes de adaptação e os arquivos usados ficam na documentação interna.

## Resultado esperado

O leitor deve compreender o assunto e conseguir resolver questões semelhantes, mesmo
sem conhecimento prévio do tema. Não basta explicar o gabarito ou alongar um comentário.
Cada comentário deve funcionar como uma aula autossuficiente, com conteúdo técnico,
mecanismos e raciocínio clínico, em português brasileiro.

A referência aprovada é a questão `mao-0853`, UFG 2017, enxerto de pele total,
da seleção de Cirurgia da Mão. O conteúdo aprovado está em
[exemplos/mao-0853.json](exemplos/mao-0853.json); a implementação original está no
[PR #93](https://github.com/talesrobertosn/ortoquestoes/pull/93).
É referência de profundidade e qualidade, não um molde que precisa ser repetido.

## Aula do tema

- Começar pelos fundamentos necessários: definição, anatomia, fisiologia, biomecânica
  ou mecanismo patológico, conforme o assunto.
- Explicar termos técnicos, siglas, epônimos e classificações na primeira utilização.
  Não presumir que o leitor já sabe por que um achado muda o diagnóstico ou a conduta.
- Construir relações de causa e efeito: o que acontece, por que acontece e qual a
  consequência para exame, diagnóstico, tratamento ou função.
- Explicar classificações, critérios e valores de corte exigidos pela questão,
  com suas implicações e limitações. Não acrescentar classificações sem relação
  com o problema apenas para aumentar o volume.
- Relacionar o conteúdo à prática e à armadilha específica da banca. Usar exemplos
  clínicos claramente didáticos, sem inventar dados do caso original.
- Comparar situações próximas quando a distinção determina a resposta:
  imediato versus tardio, indicação versus contraindicação, adulto versus criança,
  classificações parecidas ou mecanismos opostos.
- Usar tabelas para comparações exatas, listas para passos ou critérios e quadros
  de destaque quando ajudam a ensinar. O texto principal deve conectar as ideias.

## Cada alternativa merece explicação própria

A alternativa correta também deve ser explicada em profundidade. Para cada alternativa,
certa ou errada, desenvolver o que for necessário para esclarecer:

1. O significado da afirmação e os conceitos envolvidos.
2. O mecanismo ou fundamento que a sustenta ou invalida.
3. A relação com o enunciado e o detalhe decisivo para julgá-la.
4. Quando seria verdadeira, se houver um contexto válido.
5. A confusão que levou a banca a usá-la e como diferenciar as situações.

Não aceitar justificativas como “está incorreta”, “não é indicado” ou “isso pertence a
outra classificação” sem explicar o motivo. Não distribuir profundidade apenas no
conceito e deixar as alternativas como frases telegráficas. Não copiar o mesmo
parágrafo em todas as opções.

Se uma opção tiver uma parte verdadeira e outra falsa, separar as duas. Se puder
ser verdadeira sob uma interpretação específica, mostrar essa interpretação e por
que a banca preferiu outra resposta. Não ensinar uma falsidade para defender o
gabarito. Discordâncias relevantes devem aparecer no campo `alerta`, preservando
o gabarito oficial. Sem resposta oficial, usar `provavel` e identificar a
resposta pela bibliografia, sem promovê-la a gabarito da banca.

## Profundidade, forma e evidência

Não há teto fixo de palavras, caracteres, parágrafos ou frases por alternativa.
O tamanho é determinado pelo raciocínio necessário, sem redundância ou desvios.
Não resumir mecanismos importantes para cumprir uma meta de tamanho ou de velocidade.

Variar a organização conforme a questão. Títulos, negrito, tabelas, listas e o fecho
“Na prova” são recursos opcionais, não obrigações de um template. Usar os formatos
suportados por `TextoEditorial.tsx`. Não usar travessões nem emojis nos comentários.

Pesquisar referências confiáveis e conferir as fontes efetivamente citadas.
Não inventar números, autores, edições, páginas, DOI ou consenso. Diferenciar
evidência, interpretação da banca e inferência. Informar controvérsia, limitação
metodológica e aplicabilidade quando relevantes. Não transformar associação de
estudos observacionais em recomendação universal.

Em questões com imagem, abrir a figura antes de escrever. Não inferir o achado
apenas pelo comentário antigo. Preservar enunciado, alternativas e gabarito.
Não marcar `conferido: true` sem revisão médica individual real.

Cirurgia da Mão deve ser identificada como especialidade própria, conforme os
metadados da prova; não agrupá-la automaticamente com fellowships de coluna,
quadril e outras áreas.

## Fluxo e critério de conclusão

Priorizar questões sem comentário; depois melhorar comentários insuficientes.
Anuladas, duplicadas e figuras indispensáveis ausentes exigem tratamento explícito,
sem serem contadas como questões regulares concluídas.

Trabalhar em lotes de 10 quando não houver outro tamanho solicitado. Usar
`scripts/aula/montar.py` e/ou `scripts/aplicar_comentarios.py` para aplicar e
validar. Preservar comentários já conferidos e a indentação dos arquivos.
Regenerar índice e arquivos avulsos conforme o pipeline existente quando necessário,
para que o comentário seja carregado pela interface; não reformar totais por estimativa.

Salvar em branches de trabalho e PRs revisáveis, salvo instrução explícita diferente.
Registrar IDs e fontes no checkpoint existente quando aplicável. Um comentário
não está concluído só porque o JSON passou: verificar o conteúdo de cada alternativa,
a coerência clínica e a apresentação.

Antes de concluir:
- O leitor entende o tema sem outra questão?
- Cada alternativa ensina seu mecanismo e seu contexto?
- As ambiguidades foram tratadas com honestidade?
- Fontes, números e nomenclatura foram conferidos?
- O gabarito e o caso original foram preservados?
- A interface carrega o comentário com parágrafos e tabelas legíveis, sem cortes?

Conferir visualmente o primeiro exemplo de um padrão novo e os casos com tabelas,
imagens ou mudanças de apresentação. Se o usuário pedir print, capturar a interface
renderizada e identificar se é prévia ou versão publicada.
