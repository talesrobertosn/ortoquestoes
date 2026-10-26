# Cobertura do banco anatômico do Atlas 3D

Gerado por `scripts/atlas3d/montar_anatomia.mjs` a partir de 14 lote(s). Não editar à mão.

## Totais

| Tipo | Registros | Verificados | Pendentes | Conflitos | Com malha 3D |
|---|---|---|---|---|---|
| musculo | 131 | 130 | 0 | 1 | 131 |
| nervo | 63 | 61 | 0 | 2 | 55 |
| ligamento | 84 | 82 | 1 | 1 | 84 |
| arteria | 38 | 37 | 0 | 1 | 38 |

## Por região

| Região | Músculos | Nervos | Ligamentos | Artérias |
|---|---|---|---|---|
| coluna | 30 | 8 | 0 | 0 |
| ombro | 15 | 11 | 17 | 10 |
| braco | 4 | 8 | 0 | 5 |
| cotovelo | 0 | 0 | 6 | 0 |
| antebraco | 20 | 6 | 1 | 4 |
| punho-mao | 10 | 7 | 18 | 2 |
| pelve-quadril | 12 | 14 | 7 | 8 |
| coxa | 14 | 0 | 0 | 2 |
| joelho | 1 | 0 | 14 | 2 |
| perna | 13 | 7 | 1 | 3 |
| tornozelo-pe | 12 | 2 | 20 | 2 |

## Campos preenchidos (músculos)

| Campo | Músculos |
|---|---|
| origem | 128 de 131 |
| inserção | 129 de 131 |
| inervação | 130 de 131 |
| ação | 129 de 131 |
| importância ortopédica | 89 de 131 |
| relações | 14 de 131 |
| marco 3D da origem | 79 de 131 |
| marco 3D da inserção | 56 de 131 |
| origem marcada no modelo (marco ou osso) | 112 de 131 |
| inserção marcada no modelo (marco ou osso) | 112 de 131 |

## Pendentes e conflitos

- **Nervo peitoral medial** (conflito): O Netter atribui C5–C7; a maioria dos textos de anatomia dá C8–T1 para o nervo do fascículo medial. Rever antes de exibir as raízes como definitivas.
- **Ramo recorrente (motor) do nervo mediano** (conflito): O Netter atribui a esse ramo também os dois lumbricais laterais; a maioria dos textos põe os lumbricais nos ramos digitais palmares do mediano. A inervação dos lumbricais pelo mediano não muda.
- **Lumbricais do pé** (conflito): O Netter traz duas divisões: na tabela de músculos, só o 1º lumbrical pelo plantar medial (2º a 4º pelo lateral); no texto dos nervos, os dois mediais pelo plantar medial. A segunda forma é a mais citada nos textos de anatomia.
- **Ligamento colateral fibular (LCF)** (conflito): O Netter escreve 'região medial da cabeça da fíbula'; a prancha mostra a inserção na face lateral, e a maioria dos textos descreve a face lateral.
- **Ligamentos radiossemilunares longo e curto** (pendente): O modelo 3D não separa esses dois ligamentos; o id ligado ('radiate_carpal_ligament', ligamento radiado do carpo) é a melhor aproximação disponível e precisa de conferência visual antes de virar 'verificado'.
- **Artéria circunflexa anterior do úmero** (conflito): O Netter traz as duas afirmações na mesma tabela: a circunflexa anterior (ramo ascendente) como suprimento primário da cabeça e a posterior como a que supre a maior parte da cabeça. Estudos de perfusão mais recentes dão a maior parte à circunflexa posterior.

## Malhas de músculo ainda sem registro (78)

Músculos da cabeça, face, laringe e faringe ficam fora do foco ortopédico do livro de referência.

`opponens_digiti_minimi_muscle_of_foot`, `ary_epiglottic_part_of_oblique_arytenoid_muscle`, `bucinator`, `coccygeus_muscle`, `common_tendinous_ring`, `corrugator_supercilii`, `deep_part_of_masseter`, `depressor_anguli_oris`, `depressor_labii_inferioris`, `depressor_septi_nasi`, `diaphragm`, `external_abdominal_oblique_muscle`, `external_anal_sphincter`, `external_intercostal_muscles`, `external_part_of_thyro_arytenoid_muscle`, `frontalis_muscle`, `genioglossus_muscle`, `hyoglossus_muscle`, `iliococcygeus_muscle`, `iliopectineal_arch`, `inferior_head_of_lateral_pterygoid_muscle`, `inferior_oblique_muscle`, `inferior_pharyngeal_constrictor`, `inferior_rectus_muscle`, `inferior_tarsus`, `inguinal_ligament`, `innermost_intercostal_muscles`, `intermuscular_gluteal_bursae`, `internal_abdominal_oblique_muscle`, `internal_intercostal_muscles`, `lateral_crico_arytenoid_muscle`, `lateral_rectus_muscle`, `levator_anguli_oris`, `levator_labii_superioris`, `levator_nasolabialis`, `levator_palpebrae_superioris`, `longus_capitis_muscle`, `longus_colli_muscle`, `medial_pterygoid_muscle`, `medial_rectus_muscle`, `mentalis_muscle`, `middle_pharyngeal_constrictor`, `nasalis_muscle`, `oblique_part_of_cricothyroid_muscle`, `occipitalis_muscle`, `orbicularis_oris_muscle`, `orbital_part_of_orbicularis_oculi`, `palatopharyngeus_muscle`, `palpebral_part_of_orbicularis_oculi`, `posterior_crico_arytenoid_muscle`, `procerus_muscle`, `pubo_analis_muscle`, `pubococcygeus_muscle`, `pyramidalis_muscle`, `quadratus_lumborum_muscle`, `rectus_abdominis_muscle`, `rectus_anterior_capitis_muscle`, `rectus_lateralis_capitis_muscle`, `risorius_muscle`, `straight_part_of_cricothyroid_muscle`, `stylopharyngeus_muscle`, `superficial_part_of_masseter`, `superficial_transverse_metacarpal_ligament`, `superficial_transverse_metatarsal_ligament`, `superior_head_of_lateral_pterygoid_muscle`, `superior_oblique_muscle`, `superior_pharyngeal_constrictor`, `superior_rectus_muscle`, `superior_tarsus`, `temporalis_muscle`, `temporoparietalis_muscle`, `thyro_epiglottic_part_of_thyro_arytenoid_muscle`, `transverse_arytenoid_muscle`, `transversus_abdominis_muscle`, `transversus_thoracis_muscle`, `trochlea_of_superior_oblique_muscle`, `zygomaticus_major_muscle`, `zygomaticus_minor_muscle`

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
