# SIMÃO: engenharia reversa para OrtoQuestões Simulados de cirurgia da mão

**SIMÃO** é o Simulado do Exame para Obtenção do Título de Especialista em Cirurgia da Mão. Em 18/10/2026 o
Tales enviou as 100 questões do SIMÃO 2026 (docx sem gabarito) com o pedido:

- comentar todas e publicar à medida que ficarem prontas;
- **não copiar** as questões, que são autorais dos organizadores: cada uma é reescrita com variação;
- classificar todas como **OrtoQuestões Simulados** no padrão do SIMÃO;
- aprender os padrões, para depois escrever questões semelhantes a partir do **Green's Operative Hand
  Surgery**, que ele vai mandar.

Este arquivo guarda o que aprendemos. Atualize a cada lote novo.

## Como as questões entram no site

| Campo | Valor |
|---|---|
| `prova` | `"SIMÃO"` (aparece no topo da questão, ao lado de "OrtoQuestões Simulados") |
| `simulado` | `true` |
| `area` | `"cirurgia-mao"`: entra no treino de Cirurgia da mão, não no de TEOT/TARO |
| tema | `mao` na maioria; `ombro-cotovelo` para cotovelo (Mason, Monteggia, instabilidade, colateral medial) |
| `origem.arquivo` | `SIMAO-2026-Questoes.docx`; `origem.pagina` = número da questão no SIMÃO |
| gabarito | definido pela bibliografia (Green), pois o SIMÃO não veio com gabarito |
| referência | `Green's Operative Hand Surgery, 8ª edição (Wolfe, Pederson, Kozin, Cohen)`; capítulo só quando há certeza |

Ferramenta: `scripts/simulados/aplicar_lote.py`. O lote declara `PROVA = "SIMÃO"` e `AREA = "cirurgia-mao"`.

## O retrato da banca (SIMÃO 2026, 100 questões, 98 únicas)

Duas se repetem no arquivo: a 25 é igual à 99 (Mason e ligamentos), e a 26 é igual à 83 (Learmonth).

### Formato
- **Quatro alternativas** (a a d), sempre com uma só correta.
- **Enunciado curto e direto** em cerca de 60%: "O retalho inguinal é suprido pela artéria:", "A
  artéria interóssea anterior geralmente origina da:". Cobra um fato só.
- **"Sobre X:" ou "Em relação a X:"** com quatro afirmativas, uma verdadeira (cerca de 25%): fraturas de
  metacarpo, botoeira, cistos sinoviais, enxertos de pele, anestesia, polidactilia.
- **Lacuna dupla** ("é a extensão do ____ e está ausente no ____") em 4 questões. No site, reescrever
  como par com "respectivamente" (o aplicador recusa lacuna).
- **Caso clínico longo**, com raciocínio e alternativas compridas que explicam o porquê. É o padrão
  novo e o mais difícil: placa volar e Soong (48), isquemia quente no reimplante (58), FDP do indicador e
  do médio (73), sutura flexora na zona 2 (74), Leddy-Packer tipo IV (94), faceta semilunar (36),
  plexo pré-ganglionar (11), polegar empalmado na espasticidade (12). Nesses, as alternativas erradas
  misturam um fato certo com uma justificativa errada.

### O que mais cai (por assunto)
| Assunto | Questões | Peso |
|---|---|---|
| Nervos, paralisias, plexo e transferências | 7, 11, 12, 26, 27, 33, 38, 51, 57, 69, 71, 73, 82, 85, 90 | 15 |
| Congênitas e embriologia | 1, 6, 15, 20, 28, 43, 44, 60, 63, 70, 93, 100 | 12 |
| Anatomia (vascular, fáscia, nervo, ligamentos) | 2, 23, 31, 40, 59, 67, 72, 77, 95, 97, 98 | 11 |
| Carpo (escafoide, SL, Kienböck, capitato, artrodeses parciais) | 13, 29, 45, 54, 56, 62, 68, 80, 89 | 9 |
| Retalhos, enxertos, microcirurgia, reimplante, amputação | 17, 19, 24, 47, 52, 58, 66, 78, 81 | 9 |
| Tendões e deformidades dos dedos | 8, 10, 18, 46, 53, 74, 79, 94 | 8 |
| Metacarpos e falanges | 5, 21, 35, 39, 84 | 5 |
| Artrose, artrodese, mão reumatoide | 22, 41, 50, 65, 76 | 5 |
| Cotovelo | 25/99, 86, 88, 92 | 4 |
| Rádio distal | 4, 36, 48 | 3 |
| Dupuytren | 3, 37, 96 | 3 |
| TFCC e artroscopia | 16, 30, 34 | 3 |
| Ligamentos dos dedos e do polegar | 14, 42, 91 | 3 |
| Tumores e cistos | 9, 61, 64 | 3 |
| Infecção | 32, 75 | 2 |
| Outros (SDCR, queimadura, anestesia) | 49, 55, 87 | 3 |

**Leitura:** nervo (com transferências tendíneas e nervosas) e congênita somam mais de um quarto da
prova. Anatomia aplicada aparece em todo bloco. Trauma ósseo puro é minoria: a banca prefere a
decisão (quando operar, qual técnica, qual limite).

### Como a banca cobra
- **Epônimo puro** (técnica ou estrutura com nome de autor): Burkhalter (PR para ERCC como "internal
  splint"), Fowler (tenotomia da banda central), Learmonth (submuscular), Moberg, Landsmeer, Vickers,
  Parona, Cannieu-Riché, Kanavel, Elson, Grind.
- **Classificação pelo número ou pela letra:** Thomas, Blauth (IIIA x IIIB pela CMC estável), Doyle (IV
  A/B/C), Narakas (Horner no grupo IV), Schmitt (RM com contraste e viabilidade), Kurtzman-Stern,
  Cooney (clinodactilia), Garcia-Elias (estágios 1 a 6), Shinoda, Mason, Leddy-Packer, Soong e a
  classificação internacional da mão tetraplégica.
- **Número exato:** percentuais (divisão alta da braquial ~15%; lumbrical do anular com inervação dupla
  ~50%), graus (rotação, artrodese do polegar), mm e cm (Moberg até ~2 cm; enxerto ósseo
  vascularizado acima de 6 a 8 cm), tempo (enxerto de nervo em 3 a 4 semanas no trauma grave;
  separação precoce da sindactilia polegar-indicador; embriogênese completa na 8ª semana; isquemia).
- **Anatomia vascular** em várias formas: origem da interóssea anterior (interóssea comum), anastomose
  interóssea anterior-posterior (base do retalho interósseo posterior), artéria do retalho inguinal
  (ilíaca circunflexa superficial, cobrada duas vezes), artéria do braço lateral, ALT, dedo do pé
  (artéria metatarsal dorsal dominante).
- **Repetição dentro da mesma prova:** o retalho inguinal (24 e 66), o Learmonth (26 e 83), o Mason (25
  e 99), a polidactilia central (44 e 100). O que a banca acha importante ela pergunta duas vezes,
  de ângulos diferentes.

### Distratores que a banca usa
- **Inversões:** dorsal e volar, flexão e extensão, supinação e pronação, medial e lateral, pré e
  pós-ganglionar.
- **Números vizinhos:** 1, 2, 3 ou 4 mm; 2, 3, 4 ou 5 cm; 30, 40, 50 ou 60%; 10, 30, 50 ou 80%.
- **Epônimos da mesma família:** Cannieu-Riché, Martin-Gruber, Marinacci e Berrettini; Cleland e
  Grayson; ligamento natatório e banda espiral.
- **Absolutos:** "obrigatoriamente", "sempre", "apenas", "nunca", "isolada". Quase sempre marcam a
  alternativa errada nas questões de afirmativas.
- **Certo com justificativa errada:** nos casos longos, a alternativa errada começa com o diagnóstico
  certo e erra na conduta ou no porquê.

### Defeitos do original (não repetir)
- Erros de digitação ("in", "la", "transescaforperilunar").
- Questões com mais de uma resposta defensável ou com a resposta ambígua. Na reescrita, ajuste o
  enunciado ou um distrator para ficar uma só resposta pela bibliografia, e explique no comentário.
- Questões repetidas: no site, cada par vira **duas questões diferentes** (outro ângulo do mesmo
  assunto), nunca a mesma duas vezes.

## Como reescrever sem copiar (regra do Tales: "não fazer 100% igual, dar uma variada")
1. **Mantenha o fato cobrado**, que é o que a banca acha importante, e **mude o ângulo**: se o
   original pede a artéria do retalho, a nova pode dar a artéria e pedir o retalho; se pede o tipo
   pela descrição, a nova dá o tipo e pede a característica.
2. **Troque o cenário** nos casos clínicos (idade, dedo, mecanismo, achado de exame), preservando a
   decisão.
3. **Reescreva todas as alternativas** com palavras próprias, troque pelo menos um distrator e mude a
   ordem. O gabarito da nova não precisa ficar na mesma letra; equilibre A, B, C e D no lote.
4. **Nada de frase copiada:** nenhuma sequência longa idêntica ao original.
5. **Formato do site:** sem lacuna, sem "assinale", sem EXCETO/INCORRETA; pergunta direta ou par com
   "respectivamente". Sem travessão, sem itálico, sem marca-texto.
6. **Comentário em formato aula** (docs/padrao-editorial-comentarios.md): o conceito explicado a partir
   do zero, o mecanismo, a decisão, a análise de cada alternativa (inclusive a correta) e a frase "Na
   prova:". Quando o fato vem do Green e você tem segurança, diga; quando a literatura diverge, diga
   também.

## Mapa das 98 questões (o que cada uma cobra)

| # | Assunto | O que a banca quis | Formato |
|---|---|---|---|
| 1 | Macrodactilia grave | rigidez e volume grandes: amputação do raio | conduta |
| 2 | Interóssea anterior | nasce da interóssea comum (ramo da ulnar) | anatomia direta |
| 3 | Dermofasciectomia no Dupuytren | ressecar toda a fáscia lateral, com o tecido do ligamento de Cleland | técnica |
| 4 | Thomas no rádio distal | desvio volar com traço oblíquo justa-articular | classificação |
| 5 | Diáfise do metacarpo | afirmativas: desvio, tolerância, encurtamento e pseudogarra, rotação e sobreposição | afirmativas |
| 6 | Blauth IIIA x IIIB | CMC estável no IIIA muda a reconstrução | classificação aplicada |
| 7 | Burkhalter | PR para ERCC como "internal splint" junto do reparo do radial | epônimo |
| 8 | Botoeira | crônica flexível começa com órtese; Elson útil; lesão aberta da banda central se repara | afirmativas |
| 9 | BPOP (lesão de Nora) | benigna, da superfície cortical, sem continuidade medular; imita osteossarcoma parosteal | afirmativas |
| 10 | Instabilidade do EUC | testar em supinação passiva com o punho em flexão (ou extensão, conferir no Green) | exame |
| 11 | Plexo pré-ganglionar | Horner, músculos de inervação proximal, potencial sensitivo distal preservado | raciocínio |
| 12 | Polegar empalmado | alongar tenares, liberar adutor e redirecionar o ELP | técnica |
| 13 | Fratura do capitato | classificação (transversa do corpo, a mais comum, associada a perilunar) | classificação |
| 14 | Luxação dorsal MCF | indicador e mínimo (bordas da mão) | fato |
| 15 | Crista ectodérmica apical | defeito causa deficiência transversa | embriologia |
| 16 | Portal volar radial | entre o radioescafocapitato e o radiossemilunar longo | artroscopia |
| 17 | Amputação de raio | efeito sobre a força de pronossupinação | biomecânica |
| 18 | Fowler | tenotomia da banda central no martelo crônico | epônimo |
| 19 | Moberg | defeitos de polpa do polegar até cerca de 2 cm | número |
| 20 | Luxação congênita da cabeça do rádio | linha radiocapitelar não passa pelo capítulo; associações sindrômicas | afirmativas |
| 21 | Parafusos na falange proximal | mínimo de parafusos e distância da borda | número |
| 22 | Rizartrose | Grind: compressão axial e rotação (o que provoca subluxação são os testes de translação e de alavanca) | exame |
| 23 | Fáscia palmar | banda central = extensão do palmar longo; ausente no polegar | anatomia |
| 24 | Retalhos | braço lateral pela colateral radial posterior | afirmativas |
| 25/99 | Mason II e III | lesões ligamentares associadas são comuns (lateral e medial) | fato |
| 26/83 | Learmonth | transposição submuscular sob a massa flexo-pronadora | epônimo |
| 27 | Desfiladeiro torácico | ENMG geralmente normal | afirmativas |
| 28 | Ausência de dedos (transversa) | deficiência transversa; transferência microvascular do dedo do pé | par |
| 29 | Artrodese escafocapitato | indicação: Kienböck | indicação |
| 30 | TFCC agudo isolado | tratamento não cirúrgico inicial | conduta |
| 31 | Anastomose motora na palma | Cannieu-Riché (mediano e ulnar) | epônimo |
| 32 | Kanavel | dedo fletido, edema fusiforme, dor na bainha, dor à extensão passiva | sinais |
| 33 | Paralisia cerebral | escada de reconstrução da função da mão | hierarquia |
| 34 | TFCC proximal (foveal) | hook positivo, trampolim negativo | artroscopia |
| 35 | Unicondilar da falange | desviada: redução aberta e fixação | afirmativas |
| 36 | Faceta semilunar | aumento AP e perda de concentricidade: split coronal | imagem |
| 37 | Dupuytren | banda espiral desloca o feixe neurovascular | afirmativas |
| 38 | Grácil duplo (Doi) | 1º músculo: flexão do cotovelo e extensão dos dedos pelo acessório | técnica |
| 39 | Colo do metacarpo | cominuição volar e intrínsecos volares ao eixo geram flexão | mecanismo |
| 40 | Divisão alta da braquial | cerca de 15% | número |
| 41 | Artrodese IFP | contraindicação: partes moles ruins | indicação |
| 42 | LCU do polegar | ponto de reinserção e flexão da MCF | número |
| 43 | Fanconi | teste de quebra cromossômica (diepoxibutano) | exame |
| 44/100 | Polidactilia central | dedo mais afetado; síndromes; tipos pós-axiais | fato e afirmativas |
| 45 | Biomecânica SL | escafoide flexiona e prona, semilunar estende (DISI) | biomecânica |
| 46 | Doyle | IV C: fragmento acima de 50% com subluxação volar | classificação |
| 47 | Enxerto ósseo vascularizado | defeitos acima de 6 a 8 cm | número |
| 48 | Placa volar e FLP | Soong 2, distal à watershed, sem cobertura do PQ | caso longo |
| 49 | SDCR | dor por estímulo normalmente indolor = alodinia; "reação anormalmente dolorosa" (texto do original) é hiperpatia pela IASP | definição |
| 50 | AR e déficit de extensão | ruptura extensora, subluxação MCF, paralisia do NIP | lista |
| 51 | Escápula alada na obstétrica | torácico longo (C5 a C7): lesão proximal | raciocínio |
| 52 | Reimplante digital | AAS é a medicação mais usada | fato |
| 53 | De Quervain | fatores de risco corretos (septo do EPB, gestação, pós-parto) | lista |
| 54 | Schmitt | RM com contraste, viabilidade do semilunar | par |
| 55 | Kurtzman e Stern | queimadura: tipos pela estrutura acometida | classificação |
| 56 | Pseudoartrose com DISI | corrigir o DISI junto da pseudoartrose | conduta |
| 57 | Narakas | Horner no grupo IV | classificação |
| 58 | Isquemia no reimplante | limites de isquemia quente e fria no dedo | caso longo |
| 59 | Landsmeer | da bainha flexora volar à IFP até o extensor terminal | anatomia |
| 60 | Madelung (Vickers) | gordura autóloga no defeito da fisiólise | técnica |
| 61 | Sarcoma na falange média | margem: amputação do raio (ou no nível adequado, conferir) | oncologia |
| 62 | Garcia-Elias | o que separa o estágio 4 (redutível: tenodese) do 5 (irredutível com cartilagem normal: artrodese intercárpica parcial) | algoritmo |
| 63 | Cooney | clinodactilia com polidactilia = complexa | classificação |
| 64 | Cistos | dorsal sobre o SL; pedículo até a origem evita recidiva | afirmativas |
| 65 | Artrodese MCF | posição e consolidação | afirmativas |
| 66 | Retalho inguinal | ilíaca circunflexa superficial | anatomia |
| 67 | Túnel cubital | teto: fáscia do FUC e ligamento de Osborne | anatomia |
| 68 | Escafocapitato | perda de movimento esperada | número |
| 69 | Hanseníase e ulnar | nervo frio e superficial | mecanismo |
| 70 | Embriologia | estruturas completas ao fim da 8ª semana | número |
| 71 | Tetraplegia | transferências nervosas (supinador para NIP etc.) | afirmativas |
| 72 | ARUD | incisura sigmoide com raio maior que a cabeça da ulna | biomecânica |
| 73 | FDP do indicador e do médio | lesão do interósseo anterior | raciocínio |
| 74 | Flexor na zona 2 | sutura central com mais fios e bloqueio, mais epitendínea | caso |
| 75 | Tenossinovite purulenta | Pasteurella em mordida (o original erra a espécie) | afirmativas |
| 76 | Shinoda | túnel do carpo na AR: grupos e conduta | classificação |
| 77 | Artéria braquial | continuação da axilar, borda medial do bíceps | anatomia |
| 78 | Dedo do pé | artéria metatarsal dorsal dominante | anatomia |
| 79 | Dedo em gatilho | melhor resposta conservadora: início recente | prognóstico |
| 80 | Dissociação SL | escafoide flexiona e prona; dados do Terry Thomas e do Watson | afirmativas |
| 81 | Enxertos de pele | pele total contrai menos e resiste mais | afirmativas |
| 82 | Paralisia do mediano | alta x baixa pelo interósseo anterior | afirmativas |
| 84 | Colo do metacarpo | 4º e 5º toleram mais angulação | indicação |
| 85 | Enxerto de nervo no trauma grave | 3 a 4 semanas | número |
| 86 | Instabilidade posterolateral | antebraço supinado gira lateralmente fora do úmero | biomecânica |
| 87 | Anestesia | regional: menos tempo de recuperação, menos opioide e náusea | afirmativas |
| 88 | Colateral medial do cotovelo | feixe anterior é o mais forte | anatomia |
| 89 | Escafoide conservador | fraturas em crianças | indicação |
| 90 | Ulnar alto | NIA (ramo do pronador quadrado) para o ramo motor do ulnar | transferência |
| 91 | LCU agudo | abertura sem ponto final firme | exame |
| 92 | Monteggia | Bado I: ápice da ulna e cabeça do rádio anteriores (o original só oferecia direções combinadas) | fato |
| 93 | Sindactilia polegar-indicador | separar cedo, entre 3 e 6 meses | conduta |
| 94 | Leddy-Packer IV | fixar o osso e reinserir o FDP | caso longo |
| 95 | Espaço de Parona | entre o pronador quadrado e os flexores | anatomia |
| 96 | Dupuytren | janela de correção | número |
| 97 | Anastomose interóssea | base do retalho interósseo posterior | aplicação |
| 98 | Lumbrical do anular | inervação dupla em cerca de 50% | número |

"Conferir" na tabela marca os pontos em que a resposta depende de um detalhe que deve ser confirmado no
Green antes de virar fato no comentário.

## Lições dos lotes (18/10/2026, as 100 questões publicadas)

As 98 questões únicas do SIMÃO 2026 viraram 100 OrtoQuestões Simulados: cada par repetido rendeu duas
questões de ângulos diferentes. Estão em `mao-1719` a `mao-1810` (92) e `ombro-cotovelo-0645` a `0652`
(8), com `prova: "SIMÃO"`. Gabarito final: A 25, B 25, C 25, D 25. As anotações completas de cada frente,
com o que conferir no Green, estão em [simao-notas/](simao-notas/):

| Frente | Assuntos | Notas |
|---|---|---|
| A | congênitas, embriologia, tumores e cistos, infecção, SDCR, queimadura, anestesia | [grupo-A.md](simao-notas/grupo-A.md) |
| B | nervos, plexo, obstétrica, transferências, espasticidade, tetraplegia | [grupo-B.md](simao-notas/grupo-B.md) |
| C | anatomia, retalhos, enxertos, microcirurgia, reimplante | [grupo-C.md](simao-notas/grupo-C.md) |
| D | carpo, rádio distal, TFCC, cotovelo | [grupo-D.md](simao-notas/grupo-D.md) |
| E | tendões, dedos, metacarpos e falanges, artrose e artrodese, mão reumatoide, Dupuytren, ligamentos | [grupo-E.md](simao-notas/grupo-E.md) |

### O que aprendemos
- **Cerca de um quarto do original tinha defeito**: mais de uma resposta defensável (2, 5, 81, 95),
  definição trocada (49: o texto é de hiperpatia), espécie errada (75: Pasteurella, não Pseudomonas),
  tipo inexistente na classificação (55: Kurtzman e Stern não tem tipo IV), número sem fonte (17, 42, 56),
  epônimo grafado errado (31: Berrettini). Antes de escrever a partir de um original, **resolva a
  questão pela bibliografia** e só depois reescreva.
- **Classificações com numeração que varia entre autores** (Thomas II e III, capitato 1 a 4, Shinoda):
  pergunte o que é estável (o tipo I de Thomas, o padrão mais comum do capitato, a conduta) e explique a
  divergência no comentário.
- **Números finos** (percentuais de variação anatômica, ângulos de artrodese, limites de isquemia, janela
  do Dupuytren): o comentário dá a faixa e avisa que varia entre séries; a resposta não deve depender de
  um número que o Green não traga.
- **Casos longos**: a alternativa errada traz o diagnóstico certo com a conduta ou a justificativa errada.
  É o formato que mais discrimina e o que mais vale imitar nas questões novas.
- **Checagem de cópia**: nenhuma sequência de 7 palavras do original sobreviveu nos enunciados e nas
  alternativas (verificado automaticamente). Nomes de transferências ("pronador redondo para o extensor
  radial curto do carpo") são exceção inevitável.
- **Formato do comentário**: aula a partir do zero, um parágrafo "Por que esta questão foi criada" e o
  fecho "Na prova:". Mediana de cerca de 4.200 caracteres.

### A conferir quando o Green chegar
Cada nota de frente tem a lista. Os principais:
- teste do EUC (punho em flexão ou extensão);
- limite do Moberg (1,5 ou 2 cm);
- janela de correção do Dupuytren e o tecido do ligamento de Cleland na dermofasciectomia;
- Schmitt padrão B;
- hook e trampolim na lesão foveal isolada;
- escada da paralisia cerebral (o "primeiro nível");
- perda de movimento após artrodese escafocapitato;
- enxerto de nervo em 3 a 4 semanas no trauma grave;
- Cooney (corte de 45°);
- polidactilia central (dedo mais duplicado);
- separação da sindactilia de borda (3 a 6 meses).

### Receita para as próximas (a partir do Green)
1. Escolha um capítulo do Green e liste o que o SIMÃO cobrou dele (tabela acima).
2. Para cada fato cobrado, escreva uma questão nova em outro ângulo, no formato que a banca usa para o
   assunto (epônimo, classificação, número ou caso).
3. Use os distratores da família certa (epônimos vizinhos, números vizinhos, inversões).
4. Lote com `PROVA = "SIMÃO"` e `AREA = "cirurgia-mao"`; `--conferir`; aplicar; validar.
