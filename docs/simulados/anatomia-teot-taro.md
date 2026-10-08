# Anatomia: engenharia reversa do TEOT e do TARO

Leitura em 08/10/2026. Análise das questões existentes, sem criação de questões, sem
alteração de enunciados, gabaritos ou comentários oficiais. O mapa descreve o acervo,
não estima a distribuição de todas as provas nem prevê assuntos futuros.

## Recorte e método

Foram lidos 417 registros, com enunciado, todas as alternativas e gabarito cadastrado:
337 obtidos por subtema contendo `anatom` ou ocorrência de `anatom` no texto e 80
complementares sobre identificação de estruturas, inervação, vascularização,
estruturas em risco e relações anatômicas, mesmo fora desses subtemas. A seleção
foi revisada pelo conteúdo: um item que menciona artéria, mas pede classificação de
GUSTILO, por exemplo, não entra como pergunta de anatomia.

O recorte final tem **328 registros**: 87 TEOT, 123 TARO e 118 identificados apenas
como TEOT/TARO, sem ano. Foram retirados 35 registros pelo foco não anatômico e 55
marcados com `duplicataDe`; há uma interseção entre esses conjuntos, totalizando 89
exclusões. Não foram encontradas duplicatas textuais remanescentes com mesma prova,
ano, alternativas e gabarito após normalização de pontuação e acentos. Isso não é
uma auditoria de equivalência de todas as figuras ou das provas originais.

A lista dos 328 IDs, as exclusões, os vínculos de duplicata e as medidas estão em
[anatomia-teot-taro-recorte.json](anatomia-teot-taro-recorte.json). Questões sem ano
servem para leitura de estilo e repertório, mas não para atribuir repetição a um ano
ou comparar TEOT com TARO. Questões sem gabarito são perguntas observadas, não
respostas médicas confirmadas. A inspeção visual cobriu 11 imagens representativas;
não se afirma ter conferido visualmente todas as imagens ou validado todos os
gabaritos contra a bibliografia.

## Comparação de formato

| Medida no recorte com quatro alternativas | TEOT 2021–2025 | TARO 2021–2026 | TARO 2007–2020 |
|---|---:|---:|---:|
| Questões | 87 | 56 | 57 |
| Com imagem cadastrada | 73 (84%) | 43 (77%) | 0 |
| Mediana do enunciado, caracteres | 54 | 74 | 91 |
| Mediana da alternativa, caracteres | 20 | 20 | 22,5 |
| Com “respectivamente” | 5 | 6 | 6 |
| Com EXCETO/INCORRETA | 0 | 0 | 0 |
| Gabaritos A/B/C/D | 24/23/22/18 | 12/10/14/19 | 12/8/12/15 |
| Sem gabarito | 0 | 1 | 10 |

As contagens antigas de imagem descrevem o cadastro: ausência de arquivo não prova
que a prova original não tivesse figuras. No conjunto final, 311 itens têm quatro
alternativas; os outros 17 são dez itens Certo/Errado de TARO 2006 e sete itens com
cinco alternativas e identificação TEOT/TARO sem ano. Não misturar esses formatos
na orientação para simulados atuais. Há 21 registros sem gabarito no recorte total.

| Ano | TEOT | TARO |
|---|---:|---:|
| 2021 | 7 | 8 |
| 2022 | 4 | 8 |
| 2023 | 28 | 4 |
| 2024 | 27 | 9 |
| 2025 | 21 | 14 |
| 2026 | sem prova TEOT no recorte | 13 |

As provas recentes mostram anatomia visual em todos esses anos no recorte. O salto
de contagens do TEOT a partir de 2023 pode refletir cobertura e classificação do
acervo, além de cobrança; não interpretar como aumento comprovado do peso na prova.

## Famílias de fatos e provas que sustentam o mapa

“Repetição do fato”, “repetição da estrutura” e “repetição do formato” são coisas
diferentes. Um enunciado “A estrutura assinalada é” repetido não comprova que a banca
cobrou o mesmo fato. A estrutura desenhada, as setas e as alternativas precisam ser
consideradas. As respostas abaixo são as do cadastro da banca, com ressalvas ao fim.

| Família | Evidência, prova, ano e ID | O que reaparece ou muda | Como são feitos os distratores |
|---|---|---|---|
| Pronadores e planos do antebraço | TARO 2021, mao-0029; TARO 2024, mao-0167; TARO 2025, ombro-cotovelo-0320; TEOT 2024, ombro-cotovelo-0251 | Em 2021 cruza identificação e compartimento; em 2024/2025 pede identificação; TEOT 2024 cruza redondo/quadrado com mediano/interósseo anterior. As figuras de 2024 e 2025 inspecionadas apontam estruturas diferentes. | Trocar redondo por quadrado; músculo pelo vizinho; nervo principal pelo ramo. Não é repetição da mesma resposta. |
| Intrínsecos da mão | TEOT 2023, mao-0166; TEOT 2024, mao-0313; TEOT 2025, mao-0417; TARO 2025, mao-0442 | Lumbrical e interósseo dorsal voltam como identificação; mao-0165, TEOT 2023, acrescenta inervação de estrutura desenhada. | Lumbrical, interósseo palmar/dorsal e músculos do polegar na mesma região. |
| Extensores radiais e nervo radial | TARO 2007, ombro-cotovelo-0388; TEOT 2024, ombro-cotovelo-0247; TEOT 2025, mao-0410 | Relação entre nível de lesão, músculo preservado, reconhecimento e ramo de inervação. | Curto/longo e radial/interósseo posterior, cruzados em quatro combinações. |
| Plexo e musculocutâneo | TARO 2014, ombro-cotovelo-0047; TEOT 2025, ombro-cotovelo-0559 e 0564 | Inervação comum ao bíceps/coracobraquial; depois músculo atravessado pelo nervo e identificação do ramo do plexo. | Coracobraquial/cabeça curta do bíceps e mediano/musculocutâneo. |
| Supraescapular e compressão | TARO 2021, ombro-cotovelo-0019; complemento sem ano, ombro-cotovelo-0134 | Identificar o nervo e associá-lo ao local de compressão. mao-0032 é duplicata, não uma segunda cobrança de 2021. | Supraescapular/dorsal da escápula e incisura supraescapular/espinoglenoidal. |
| Espaço quadrangular | TARO 2013, ombro-cotovelo-0462; TARO 2008, ombro-cotovelo-0485, sem gabarito; complementos sem ano, 0113 e 0334 | Repertório de conteúdo dos espaços posteriores do ombro, por nervo, vaso ou par. A pergunta de 2008 confirma interesse no tema, mas não fornece resposta validada. | Estruturas dos espaços vizinhos: radial, braquial profunda e circunflexa da escápula. |
| Anatomia ligamentar do cotovelo | TARO 2016, ombro-cotovelo-0032; TEOT 2023, 0121; TARO 2026, 0451 | Feixe anterior medial/tubérculo sublime e identificação do colateral lateral ulnar. São famílias medial e lateral, não uma única estrutura repetida. | Anterior/posterior/transverso; lateral ulnar/lateral radial/anular. |
| Ligamentos e estabilidade do joelho | TARO 2023, joelho-0116; TEOT 2024, joelho-0144; TARO 2024, joelho-0159 | Localização/função do anterolateral, identificação e restrição rotacional atribuída ao poplíteo. | Intra/extra-articular e intervalo de flexão; varo/valgo e rotação interna/externa. |
| Inserções na tíbia e fíbula | TEOT 2023, quadril-0081; TARO 2026, joelho-0234 e 0265 | Inserção do músculo desenhado ou músculo que se insere no local apontado. As duas imagens de 2026 têm setas em áreas distintas e gabaritos distintos; não fundir pela semelhança do texto. | Cabeça da fíbula, GERDY, tuberosidade e côndilo; semimembranáceo, poplíteo, gastrocnêmio e sóleo. |
| Inervação da coxa | TARO 2012, quadril-0193; TARO 2022, quadril-0047; TEOT 2024, quadril-0131 e 0135 | Inervação textual de glúteo médio e identificação/inervação em figura. quadril-0203 é duplicata de 0193, não nova cobrança. | Femoral/obturador; glúteo superior/inferior; adutor curto/longo. |
| Vascularização da cabeça femoral e acessos | TARO 2015, quadril-0030; TARO 2021, quadril-0014; TEOT 2022, quadril-0040; TEOT 2025, quadril-0640 | Região vascular, ramo a preservar, trajeto entre músculos e corona mortis no acesso. Os termos dos ramos no item de 2021 precisam ser confrontados com a fonte antes de reutilizar. | Circunflexa medial/lateral, ramo ascendente/descendente/transverso, músculos rotadores vizinhos e outro acesso. |
| Tendões e compartimentos da perna | TARO 2012, joelho-0215; TEOT 2023, pe-tornozelo-0120; TEOT 2024, 0184; TEOT 2025, 0236; TARO 2026, 0303 | Compartimento/nervo/músculo; reconhecer tendão em vista medial, posterior ou secção. | Fibular longo/curto, flexores do hálux/dedos e tibial posterior; superficial/profundo e anterior/posterior. |
| Proteção neurovascular no tornozelo | TARO 2020, pe-tornozelo-0006; TEOT 2021, pe-tornozelo-0068; TEOT 2024, pe-tornozelo-0183 | Relação de afastamento no acesso anterior, proteção do tibial no posterolateral e identificação do sural. | Medial/lateral, outro tendão do acesso e outro nervo da mesma região. |
| ADAMKIEWICZ | TARO 2010, coluna-0262; TARO 2017, coluna-0027 | Repetição do fato nível/lado; resposta cadastrada T9–T11 à esquerda em ambos. Letras diferentes não significam mudança do fato. | Dois intervalos vertebrais cruzados com direita/esquerda. |
| Coluna: planos, ligamentos e proteção | TARO 2021, coluna-0023; TEOT 2021, coluna-0054; TEOT 2024, coluna-0164; TEOT 2025, coluna-0216 e 0222; TARO 2026, coluna-0281 e 0286 | Distância de segurança em C1, plano paraespinhal, identificação ligamentar e músculo do acesso anterior cervical. | Ligamentos adjacentes, músculos do mesmo plano e outra raiz/vaso próximos. |
| Embriologia | TARO 2019, coluna-0010; TARO 2024, ombro-cotovelo-0303; TEOT 2025, mao-0411 | Tema pontual persistente: fechamento, eixo controlado pela ZPA e semana/sentido de rotação. Não sustenta um lote predominantemente embriológico. | Região, eixos de desenvolvimento e semana/sentido em par 2 por 2. |

## Tendência e modo de pensar do examinador

1. **Reconhecimento topográfico domina o recorte recente.** Atlas, dissecção,
   vista posterior/medial, corte transversal, RM e artroscopia aparecem. O candidato
   precisa localizar a seta na perspectiva da imagem, não apenas reconhecer um nome.
   A inspeção de quadril-0641 mostra RM; coluna-0281 mostra corte transversal;
   mao-0415 mostra quatro estruturas numeradas e pede a anastomose MARTIN-GRUBER.
2. **Duas etapas elevam a dificuldade sem alongar o caso.** Identificar músculo e
   informar inervação, identificar região e recuperar inserção, reconhecer nervo e
   localizar compressão. TEOT 2024, ombro-cotovelo-0251, e TEOT 2025, 0559, são modelos.
3. **O distrator é o vizinho anatômico.** Curto/longo, superficial/profundo,
   medial/lateral, anterior/posterior e nervo/ramo são trocas recorrentes. Em pares
   2 por 2, uma alternativa pode acertar a estrutura e errar o segundo atributo.
   Nem toda alternativa com “e” forma um verdadeiro par cruzado; não usar a
   heurística automática do script como contagem manual desses pares.
4. **O acesso é um cenário para anatomia aplicada.** Nervo em risco, vaso protegido,
   plano entre músculos e direção de afastamento. O nome da cirurgia não basta:
   muda-se o acesso ou o nível e muda a estrutura em risco.
5. **Uma mesma estrutura admite vários comandos.** “É o músculo”, “é inervado por”,
   “insere-se em”, “a estrutura que se insere aqui é”, “a função é”. A variação
   relevante está no atributo e na perspectiva, não em acrescentar uma história
   clínica longa. A série dos pronadores demonstra esse mecanismo.
6. **O enunciado visual é especialmente curto.** A mediana TEOT é 54 caracteres,
   menor que a recomendação geral para questões autorais. Ao planejar futuros
   itens, evitar texto supérfluo para alongar uma identificação simples; observar
   também as exigências do verificador vigente. Os comentários precisam ensinar
   orientação, relações, inervação e diferenças dos distratores, mesmo quando a
   pergunta é curta.
7. **Distribuição do gabarito não é pista.** TEOT recente está distribuído;
   TARO recente tem mais D (19 de 55 gabaritos conhecidos). Isso descreve uma
   amostra pequena, não autoriza inferir a resposta pela letra nem criar padrão.

A anatomia regional permanece. O recorte recente favorece reconhecer e relacionar
em figura, enquanto os itens antigos disponíveis são principalmente textuais.
Não há base para dizer que embriologia, vascularização ou acessos desapareceram,
nem para estimar uma porcentagem da prova inteira usando apenas esses itens.

## Pendências e limites antes de transformar o mapa em simulados

- **Comando visual sem arquivo:** mao-0577 (TARO 2026), pe-tornozelo-0119 (TEOT 2023)
  e quadril-0137 (TEOT/TARO sem ano). Entram como comandos observados, mas não permitem
  confirmar a seta ou reproduzir a figura. Não completar imagens de memória.
- **Anatomia da figura e gabarito:** ombro-cotovelo-0131, sem ano, traz “cabeça curta
  do tríceps braquial” como correta cadastrada. O tríceps é descrito por cabeças
  longa, lateral e medial. O item e a imagem precisam de confronto com a origem;
  não reutilizar essa resposta como fato de referência, nem alterá-la nesta análise.
- **Vascularização da cabeça femoral:** quadril-0014 (TARO 2021) e os termos de ramo
  vascular usados nas alternativas exigem validação bibliográfica contextual.
  O mapa registra a pergunta e o gabarito, não resolve a nomenclatura por inferência.
- **Anastomose MARTIN-GRUBER:** mao-0453, sem ano, traz tipos/percentuais e descrições
  que devem ser conferidos na fonte. Para caracterizar a prova recente, preferir
  mao-0415, TEOT 2025, preservando a leitura da figura.
- **Lumbricais e ligamento oblíquo posterior:** mao-0084 (TARO 2014) e joelho-0094
  (sem ano) exigem verificar precisão das expressões e das alternativas na fonte
  antes de usar seu gabarito como base de conteúdo novo.
- **Ausência de gabarito:** os 21 IDs constam do JSON do recorte. Não contar esses
  registros na distribuição de letras nem apresentar a alternativa como confirmada.
- **Duplicação entre temas:** mao-0429/ombro-cotovelo-0320 e
  joelho-0108/quadril-0081 são exemplos. Preservar os itens no banco, mas contar
  uma única ocorrência da mesma prova ao medir cobrança.
- **Sem capítulo novo:** não há plano de novas questões, distribuição de lote ou
  aplicação ao acervo nesta etapa. O próximo capítulo deverá ser confrontado com
  este mapa e com as questões oficiais do assunto específico.

## Aplicação do aprendizado

Para um futuro lote de anatomia, priorizar figuras com orientação e seta legíveis,
identificação seguida de relação anatômica e anatomia dos acessos. A quantidade e
as imagens dependem do capítulo fornecido: os percentuais observados orientam o
estilo, não impõem fabricar figuras. Distratores devem ser estruturas ou atributos
vizinhos sustentados pela mesma bibliografia. A referência do comentário deve usar
livro, edição, capítulo, seção e figura/tabela; a posição da folha de um PDF isolado
fica apenas na auditoria interna, conforme a orientação do dono do projeto.
