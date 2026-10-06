# Padrão das questões OrtoQuestões Simulados (TEOT e TARO)

Questões autorais feitas por engenharia reversa das provas anteriores do TEOT e do TARO, a partir
de um capítulo da bibliografia (por exemplo, Rockwood), visando o aprendizado. Este guia resume o
que as provas reais fazem, medido no acervo em 06/10/2026 (TARO 2018 a 2026 e TEOT 2021 a 2025,
cerca de 1.600 questões válidas), e vira a lista de conferência de cada lote.

## O que as provas fazem (medido)

| Parâmetro | TARO 2018+ | TEOT |
|---|---|---|
| Alternativas | 4 (A a D) | 4 (A a D) |
| Gabarito | A 23%, B 20%, C 29%, D 28% | A 21%, B 27%, C 29%, D 23% |
| Enunciado (mediana) | cerca de 100 caracteres | cerca de 100 caracteres |
| Alternativa (mediana) | cerca de 25 caracteres | cerca de 23 caracteres |
| Questão negativa (EXCETO, INCORRETA) | 0% | 0% |
| Com imagem | 12% | 26% |
| Caso clínico com idade | 3% | 5% |

Formato:

- O enunciado é uma **frase incompleta que a alternativa completa** (71% terminam numa palavra,
  26% em dois-pontos, quase nunca em ponto de interrogação). Aberturas típicas: "Na fratura...",
  "No tratamento...", "A fratura...", "Na avaliação...", "Na lesão...", "Na luxação...",
  "A estrutura...".
- As alternativas começam com **minúscula** (75%) e terminam com ponto quando completam a frase.
- **Ordem das alternativas:** crescente de tamanho em 72% das questões; números sempre em ordem
  crescente (81%). A correta é a mais longa só em 27% (o acaso), ou seja, o tamanho não entrega a
  resposta.
- **Pares cruzados (2 por 2)** em cerca de um quarto das questões: dois atributos binários
  combinados (varo ou valgo com antecurvato ou recurvato; maior ou menor que 15 mm com tróclea
  normal ou displásica; pior ou melhor com polo superior ou inferior). "Respectivamente" aparece em
  cerca de 4%.
- **Epônimos em CAIXA ALTA** (29%): O'DRISCOLL, PIPKIN, DENIS, HARDINGE, LAPRADE, KAEDING e
  MILLER. Classificações e epônimos aparecem em cerca de 1 em cada 5 questões.
- **Imagem:** "Na imagem a seguir...", "A estrutura assinalada é...", "A imagem radiográfica a
  seguir representa...", "as imagens a seguir demonstram a técnica de...".

O que é cobrado: fato pontual do livro, quase sempre um único dado. Anatomia e estruturas em
risco, o "mais frequente", epidemiologia, deformidade e desvio dos fragmentos, ponto técnico do
tratamento (ponto de entrada, rotação da placa, distância segura), classificação (tipo e
subtipo), incidência radiográfica, complicação mais comum. Números exatos do texto (graus,
milímetros, porcentagens, prazos) são frequentes.

## Como escrever cada questão

1. Escolher **um fato** do capítulo que a banca cobraria: um número, um "mais frequente", um tipo
   de classificação, uma estrutura em risco, um desvio, um passo técnico. Nada que dependa de
   opinião ou de outra obra.
2. Enunciado curto (60 a 160 caracteres), frase incompleta, sem negativa, sem "assinale".
3. Quatro alternativas da mesma classe gramatical e do mesmo campo (só nervos, só graus, só tipos
   de uma mesma classificação), curtas, em ordem crescente de tamanho; números em ordem
   crescente. Usar o par cruzado 2 por 2 quando o fato tiver dois atributos.
4. Distratores plausíveis e verdadeiros em outro contexto (o nervo de outro acesso, o tipo vizinho
   da classificação, o valor de outra fratura), nunca absurdos.
5. Epônimos em CAIXA ALTA, como a banca escreve.
6. Gabarito distribuído no lote, sem padrão, puxando um pouco para C e D.
7. Caso clínico só de vez em quando (até 1 em 10) e curto.
8. Imagem quando a figura do livro permitir uma pergunta do tipo da prova (estrutura assinalada,
   técnica demonstrada, classificação da imagem). Legenda: "Fonte: Rockwood and Green's Fractures
   in Adults, edição, figura N (página P)". Não usar figura que entregue a resposta.

## Comentário

Diretriz do dono do projeto (06/10/2026): cada questão de OrtoQuestões Simulados deve funcionar como
**ler o livro**. O comentário é uma aula independente do trecho do capítulo, no padrão enriquecido
de `docs/padrao-editorial-comentarios.md` e da referência `docs/exemplos/mao-0853.json`. Vale para
toda questão de simulado feita a partir de agora.

- **Conceito:** ensina o trecho do capítulo do zero: definições, mecanismo, números do livro com o
  contexto de cada um, exemplos e figuras citadas, ligação com outros pontos do mesmo capítulo e a
  armadilha da prova. Parágrafos de texto que conectam as ideias; tabela ou lista só quando
  comparam ou ordenam de fato. Na escala da referência (em geral 5 a 8 mil caracteres no total).
- **Cada alternativa, inclusive a correta:** parágrafo próprio com o que a afirmação significa, o
  mecanismo que a sustenta ou derruba, onde aquele dado aparece no livro (o distrator costuma ser
  um número ou conceito verdadeiro de outro contexto) e como diferenciar.
- **Não fazer:** comentário curto em tópicos, frases telegráficas ("Errada. O número importa
  menos."), marca-texto (`==...==`) espalhado. A primeira versão do Rockwood capítulo 1 foi
  recusada por isso e reescrita.
- Sempre apoiado no capítulo, com a referência do livro, capítulo, seção e figura ou tabela (e a
  página quando o material enviado tiver a numeração impressa). O conteúdo vem do texto enviado;
  o que não estiver nele não entra como afirmação, salvo conta direta de um princípio do próprio
  capítulo (por exemplo, a quarta potência do diâmetro), apresentada como tal.

## No acervo

- `prova: null`, `ano: null`, `simulado: true`, sem `area`: a questão mostra só a etiqueta
  OrtoQuestões Simulados e os subtemas, sem nome de prova (entram no treino de Ortopedia e
  no Cronograma, mas não no cálculo dos Temas que mais caem).
- Origem: arquivo do capítulo e página; referência no comentário com livro, edição, capítulo e
  página.
- O aviso da questão explica que ela é autoral, feita por engenharia reversa das provas anteriores
  a partir da bibliografia, visando o aprendizado, e que não é questão oficial.
