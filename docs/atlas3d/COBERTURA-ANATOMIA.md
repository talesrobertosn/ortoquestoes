# Cobertura do banco anatômico do Atlas 3D

Gerado por `scripts/atlas3d/montar_anatomia.mjs` a partir de 23 lote(s). Não editar à mão.

## Totais

| Tipo | Registros | Verificados | Pendentes | Conflitos | Com malha 3D |
|---|---|---|---|---|---|
| musculo | 193 | 192 | 0 | 1 | 193 |
| nervo | 92 | 90 | 0 | 2 | 84 |
| ligamento | 97 | 95 | 1 | 1 | 97 |
| osso | 8 | 8 | 0 | 0 | 8 |
| arteria | 53 | 52 | 0 | 1 | 53 |
| veia | 10 | 10 | 0 | 0 | 10 |
| fascia | 9 | 9 | 0 | 0 | 9 |
| orgao | 58 | 58 | 0 | 0 | 58 |
| encefalo | 25 | 25 | 0 | 0 | 25 |
| linfatico | 12 | 12 | 0 | 0 | 12 |
| dente | 2 | 2 | 0 | 0 | 2 |

## Por região

| Região | Músculos | Nervos | Ligamentos | Artérias |
|---|---|---|---|---|
| coluna | 35 | 9 | 2 | 0 |
| ombro | 15 | 16 | 17 | 10 |
| braco | 4 | 8 | 0 | 5 |
| cotovelo | 0 | 0 | 6 | 0 |
| antebraco | 20 | 6 | 1 | 4 |
| punho-mao | 10 | 8 | 20 | 3 |
| pelve-quadril | 13 | 14 | 10 | 8 |
| coxa | 14 | 0 | 0 | 3 |
| joelho | 1 | 0 | 14 | 2 |
| perna | 13 | 7 | 1 | 3 |
| tornozelo-pe | 12 | 2 | 21 | 2 |
| cabeca-pescoco | 43 | 21 | 3 | 3 |
| torax | 5 | 0 | 2 | 4 |
| abdome | 5 | 0 | 0 | 4 |
| pelve-perineo | 3 | 0 | 0 | 1 |
| sistema-nervoso-central | 0 | 0 | 0 | 1 |
| corpo-inteiro | 0 | 1 | 0 | 0 |

## Campos preenchidos (músculos)

| Campo | Músculos |
|---|---|
| origem | 188 de 193 |
| inserção | 189 de 193 |
| inervação | 180 de 193 |
| ação | 188 de 193 |
| importância ortopédica | 93 de 193 |
| relações | 18 de 193 |
| marco 3D da origem | 80 de 193 |
| marco 3D da inserção | 56 de 193 |
| origem marcada no modelo (marco ou osso) | 126 de 193 |
| inserção marcada no modelo (marco ou osso) | 121 de 193 |

## Pendentes e conflitos

- **Nervo peitoral medial** (conflito): O Netter atribui C5–C7; a maioria dos textos de anatomia dá C8–T1 para o nervo do fascículo medial. Rever antes de exibir as raízes como definitivas.
- **Ramo recorrente (motor) do nervo mediano** (conflito): O Netter atribui a esse ramo também os dois lumbricais laterais; a maioria dos textos põe os lumbricais nos ramos digitais palmares do mediano. A inervação dos lumbricais pelo mediano não muda.
- **Lumbricais do pé** (conflito): O Netter traz duas divisões: na tabela de músculos, só o 1º lumbrical pelo plantar medial (2º a 4º pelo lateral); no texto dos nervos, os dois mediais pelo plantar medial. A segunda forma é a mais citada nos textos de anatomia.
- **Ligamento colateral fibular (LCF)** (conflito): O Netter escreve 'região medial da cabeça da fíbula'; a prancha mostra a inserção na face lateral, e a maioria dos textos descreve a face lateral.
- **Ligamentos radiossemilunares longo e curto** (pendente): O modelo 3D não separa esses dois ligamentos; o id ligado ('radiate_carpal_ligament', ligamento radiado do carpo) é a melhor aproximação disponível e precisa de conferência visual antes de virar 'verificado'.
- **Artéria circunflexa anterior do úmero** (conflito): O Netter traz as duas afirmações na mesma tabela: a circunflexa anterior (ramo ascendente) como suprimento primário da cabeça e a posterior como a que supre a maior parte da cabeça. Estudos de perfusão mais recentes dão a maior parte à circunflexa posterior.

## Malhas de músculo ainda sem registro (6)

Músculos da cabeça, face, laringe e faringe ficam fora do foco ortopédico do livro de referência.

`opponens_digiti_minimi_muscle_of_foot`, `iliopectineal_arch`, `intermuscular_gluteal_bursae`, `superficial_transverse_metacarpal_ligament`, `superficial_transverse_metatarsal_ligament`, `temporoparietalis_muscle`

## Avisos

- 01-coluna.json › alca-cervical: sem malha no modelo 3D (só texto)
- 01-coluna.json › raizes-cervicais: sem malha no modelo 3D (só texto)
- 01-coluna.json › suboccipital: sem malha no modelo 3D (só texto)
- 01-coluna.json › ramos-posteriores: sem malha no modelo 3D (só texto)
- 05-mao.json › recorrente-do-mediano: sem malha no modelo 3D (só texto)
- 06-quadril-coxa.json › gluteo-inferior: sem malha no modelo 3D (só texto)
- 06-quadril-coxa.json › nervo-do-obturador-interno: sem malha no modelo 3D (só texto)
- 06-quadril-coxa.json › nervo-do-quadrado-femoral: sem malha no modelo 3D (só texto)
- 07-perna.json › tendao-do-calcaneo: músculo sem nervo
- 30-musculos-cabeca-pescoco.json › anel-tendineo-comum: músculo sem nervo
- 30-musculos-cabeca-pescoco.json › tarsos-das-palpebras: músculo sem nervo
- 31-musculos-tronco.json › ligamento-inguinal: músculo sem nervo
