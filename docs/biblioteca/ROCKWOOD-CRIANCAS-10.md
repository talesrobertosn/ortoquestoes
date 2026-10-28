# Rockwood and Wilkins' Fractures in Children, 10ª edição: resumos e OrtoQuestões Simulados

Pedido do Tales em 26/10/2026: fazer, capítulo a capítulo, os OrtoQuestões Simulados (engenharia reversa das
questões que já existem, gêmeas e questões de projeção, 10 a 15 por tema, mais nos importantes) e depois o
resumo **inspirado no capítulo**. Os capítulos 1 a 5 ficam com o ChatGPT Codex; o Claude faz os demais.
Mais tarde esses resumos serão usados para corrigir as questões que já existem, por isso cada capítulo deixa o
mapa das oficiais na seção "Mapa para correção" abaixo e em `docs/simulados/mapas-da-banca.md`.

## Decisões do Tales

- **Citação sem página (26/10/2026):** o PDF não tem fólio impresso. Citar livro, edição, capítulo, seção e
  figura ou tabela, sem página. No lote, `pag=None`.
- **Liberdade total (26/10/2026):** ordem, quantidade e formato flexíveis; não pedir confirmação.
- O comentário pode citar o resumo, o livro e o capítulo e orientar o aluno a fazer a questão oficial.
- **Página para o Google (27/10/2026):** todo resumo ganha página pública em `/resumos/<id>/`, gerada no deploy por
  `scripts/gerar_resumos_seo.py`. O título, a descrição, o JSON-LD (`keywords`) e o parágrafo "Para quem é" trazem as
  buscas do residente: "resumo Rockwood infantil/adulto", "resumo de ortopedia", "residência em ortopedia", TEOT, TARO e
  R4. Nada a fazer por capítulo além de publicar o resumo; livro novo pede ajuste em `livro_curto()`.

## Onde estão as coisas

- Livro: `~/OrtoQuestoes-Biblioteca/livros/Rockwood and Wilkins' Fractures in Children 10th Edition (1).pdf`
  (fora do git). Texto por capítulo em `~/OrtoQuestoes-Biblioteca/lotes/rockwood-criancas-10/capNN/`
  (`cap.txt` com `pdftotext -layout`, `raw.txt`, `limites.txt` com as folhas do PDF) e os lotes `lote_*.py`.
- Trabalho do Claude no worktree `~/ortoquestoes-rw10`, branch `claude/rockwood-criancas-10`, para não
  esbarrar no Codex, que usa a pasta principal.

## Capítulos e folhas do PDF

| Cap. | Título | Folhas | Situação |
| --- | --- | --- | --- |
| 1 | Epidemiology of Fractures in Children | 25 a 61 | Codex: `rockwoodcriancas10-01-epidemiologia-fraturas`, `pediatria-1083` a `1093` |
| 2 | Fracture Repair in Children | 62 a 126 | Codex |
| 3 | Pharmacology of Pediatric Fracture Care | 127 a 145 | Codex |
| 4 | Cast and Splint Immobilization | 146 a 204 | Codex |
| 5 | Management of the Severely Injured Child | 205 a 262 | Codex |
| 6 | Compartment Syndrome in Children | 263 a 305 | Feito em 28/10/2026: `rockwoodcriancas10-06-sindrome-compartimental`, `pediatria-1315` a `1329` |
| 7 | Pathologic Fractures and Nonaccidental Injuries | 306 a 444 | Feito em 27/10/2026: `rockwoodcriancas10-07-patologicas-maus-tratos`, `pediatria-1196` a `1210` |
| 8 | Hand and Carpal Bones | 445 a 633 | Feito em 28/10/2026: `rockwoodcriancas10-08-mao-carpo`, `pediatria-1345` a `1359` |
| 9 | Distal Radius and Ulna | 634 a 789 | 9ª ed. já tem resumo (`wilkins9-08`); atualizar com a 10ª |
| 10 | Diaphyseal Radius and Ulna | 790 a 935 | 9ª ed. já tem resumo (`wilkins9-09`); atualizar |
| 11 | Radial Neck and Olecranon | 936 a 1084 | Feito em 28/10/2026: `rockwoodcriancas10-11-colo-radio-olecrano`, `pediatria-1270` a `1284` |
| 12 | Monteggia Fracture-Dislocation | 1085 a 1219 | Feito em 28/10/2026: `rockwoodcriancas10-12-monteggia`, `pediatria-1285` a `1299` |
| 13 | Evaluation of the Injured Pediatric Elbow | 1220 a 1271 | Atualizado em 28/10/2026: `rockwoodcriancas9-12-avaliacao-cotovelo` (versão 2), `pediatria-1360` a `1362` (JONES, linha radiocapitelar, metanálise do coxim, ultrassonografia) |
| 14 | Supracondylar Fractures | 1272 a 1425 | Atualizado em 28/10/2026: `rockwoodcriancas9-13-supracondiliana` (versão 2, novos autores), `pediatria-1363` e `1364` (IIA e IIB, fio medial mini-aberto) |
| 15 | T-Condylar Fractures | 1426 a 1475 | 9ª ed. já tem resumo; atualizar |
| 16 | Medial Epicondyle and Elbow Dislocations | 1476 a 1594 | 9ª ed. já tem resumo; atualizar |
| 17 | Lateral Condylar and Capitellar | 1595 a 1670 | 9ª ed. já tem resumo; atualizar |
| 18 | Distal Humeral Physeal, Medial Condyle, Lateral Epicondylar | 1671 a 1771 | 9ª ed. já tem resumo; atualizar |
| 19 | Shoulder Dislocation and Proximal Humerus | 1772 a 1943 | Feito em 27/10/2026: `rockwoodcriancas10-19-ombro-umero`, `pediatria-1211` a `1224` |
| 20 | Clavicle and Scapula | 1944 a 2072 | Feito em 28/10/2026: `rockwoodcriancas10-20-clavicula-escapula`, `pediatria-1225` a `1239` |
| 21 | Cervical Spine | 2073 a 2164 | Feito em 28/10/2026: `rockwoodcriancas10-21-coluna-cervical`, `pediatria-1240` a `1254` |
| 22 | Thoracolumbar Spine | 2165 a 2226 | Feito em 28/10/2026: `rockwoodcriancas10-22-coluna-toracolombar`, `pediatria-1255` a `1269` |
| 23 | Pelvic and Acetabular | 2227 a 2334 | Feito em 27/10/2026: `rockwoodcriancas10-23-pelve-acetabulo`, `pediatria-1168` a `1181` |
| 24 | Hip | 2335 a 2436 | Feito em 27/10/2026: `rockwoodcriancas10-24-quadril`, `pediatria-1182` a `1195` |
| 25 | Femoral Shaft | 2437 a 2555 | Feito em 26/10/2026: `rockwoodcriancas10-25-diafise-femur`, `pediatria-1122` a `1136` |
| 26 | Distal Femoral Physis | 2556 a 2642 | Feito em 26/10/2026: `rockwoodcriancas10-26-fise-distal-femur`, `pediatria-1094` a `1107` |
| 27 | Proximal Tibial Physeal | 2643 a 2695 | Feito em 26/10/2026: `rockwoodcriancas10-27-fise-proximal-tibia`, `pediatria-1108` a `1121` |
| 28 | Intra-Articular Injuries of the Knee | 2696 a 2826 | Feito em 28/10/2026: `rockwoodcriancas10-28-joelho-intra-articular`, `pediatria-1300` a `1314` |
| 29 | Tibia and Fibula Shaft | 2827 a 2957 | Feito em 27/10/2026: `rockwoodcriancas10-29-diafise-tibia`, `pediatria-1137` a `1152` |
| 30 | Ankle | 2958 a 3099 | Feito em 27/10/2026: `rockwoodcriancas10-30-tornozelo`, `pediatria-1153` a `1167` |
| 31 | Foot | 3100 a 3352 | Feito em 28/10/2026: `rockwoodcriancas10-31-pe`, `pediatria-1330` a `1344` |

**Ordem do Claude:** pelo que mais cai em prova (subtemas com mais questões oficiais): 26, 27, 25, 29, 30, 23, 24, 7,
19, 20, 21, 22, 11, 12, 28, 31, 8, 6; depois as atualizações da 9ª para a 10ª edição (9, 10, 13 a 18), só com o que
mudou ou faltava.

## Como cada capítulo é feito

1. Extrair o texto (já feito para todos) e ler o capítulo inteiro, tabelas e legendas incluídas.
2. Engenharia reversa: `mapear_banca.py` por regex e subtema, todas as provas; listar as oficiais diretas e os
   simulados vizinhos para não duplicar.
3. Simulados primeiro: gêmeas das oficiais (outro ângulo do mesmo fato) e projeções (o que a 10ª edição traz com
   cara de prova). Comentário em miniaula (`docs/prompts/comentarios-miniaula.md`), com "Por que esta questão foi
   criada." citando a oficial pelo id, e a referência por capítulo e seção. Limpar toda frase que não esteja no
   capítulo.
4. Resumo depois, `conteudo/biblioteca/rockwoodcriancas10-NN-<tema>.md`, inspirado no capítulo, na ordem da cobrança,
   com `central=`, `relacionadas=` e `treino=`. Declarar em `subtemas:` só o subtema que o capítulo realmente cobre
   (o site convida qualquer questão do subtema para o resumo).
5. `aplicar_lote --conferir`, aplicar, `gerar_indice.py`, `node scripts/biblioteca/gerar.mjs`, `validar_acervo.py`,
   CHECKLIST, mapas da banca, esta página; PR e merge só com o "verificar" passando.

## Mapa para correção das questões existentes

Para a revisão futura dos comentários das oficiais com estes resumos.

| Capítulo | Oficiais citadas | Observações |
| --- | --- | --- |
| 26 | `pediatria-0654`, `0635`, `0552`, `0608`, `0590`, `0570`, `0825`, `0569`, `0111`, `0174`, `0065`, `0538`, `0559`, `0622`, `0641` | `0825` (TARO 2006) sem gabarito: o capítulo sustenta Errado. `0641`: causa da ponte fora do capítulo. `0569`: o capítulo confirma que a fise distal do fêmur é extrassinovial, com irrigação rica. |
| 27 | `pediatria-0542`, `0948`, `0544`, `0529`, `0661`, `0602`, `0847`, `0779`, `0840`, `0580`, `0946`, `0713`, `0752`, `0516`, `0616`, `0560`, `0918`, `0836`, `0579`, `0705`, `0601`, `0545`, `0646`, `0621`, `0716`, `0174` | `0918` (TEOT 2025) diverge da revisão do capítulo (síndrome compartimental 0%). Sem gabarito: `0779` (capítulo sustenta III), `0716` (3 a 6 anos e valgo), `0713`, `0752`, `0840`, `0836` não sustentadas. Metafisária e COZEN: rever com o cap. 29. |
| 25 | `pediatria-0863`, `0912`, `0541`, `0556`, `0951`, `0709`, `0565`, `0591`, `0844`, `0647`, `0623`, `0619`, `0603`, `0907`, `0743`, `0749`, `0813`, `0935` | Sem gabarito: `0935` (capítulo sustenta gesso), `0749` (sustenta mais dor), `0743` (mais próxima: até 3 cm), `0813` (não sustentada). `0951`: alternativa B fala em varo, o capítulo descreve valgo após placa distal. |
| 29 | `pediatria-0549`, `0752`, `0516`, `0545`, `0601`, `0579`, `0705`, `0646`, `0621`, `0716`, `0818`, `0630`, `0916`, `0950` | `0549` (TARO 2023): gabarito na cortical lateral, o capítulo diz medial. Sem gabarito: `0752` (lateral em extensão), `0716` (3 a 6 anos e valgo), `0818` (Certo). Espinha tibial (`0535`, `0700`, `0711`, `0735`, `0949`) fica para o cap. 28. |
| 30 | `pediatria-0910`, `0650`, `0557`, `0955`, `0923`, `0543`, `0546`, `0568`, `0842`, `0686`, `0905`, `0615`, `0588`, `0662`, `0867`, `0517`, `0637`, `0820`, `0928`, `1081`, `0531`, `0570` | `0531` (TARO 2025): valgo como complicação mais comum; o capítulo dá varo para a ponte medial e valgo para a parada da fíbula. `0615` (SBOT-SP): TILLAUX "III ou IV", o capítulo diz III. Sem gabarito: `0820` (Certo), `0928` (III e II), `0923` (figura). |
| 23 | `pediatria-0613`, `0947`, `0567`, `0620`, `0645`, `0660`, `0845`, `0694` | `0567` (TARO 2022): IIIB e IV instáveis; o capítulo chama o IIIB de estável, mas grave. `0694` (TARO 2014): o capítulo não dá a complicação mais frequente do tipo III; aponta a consolidação viciosa do anel como principal desfecho adverso em geral. |
| 24 | `pediatria-0515`, `0530`, `0599`, `0651`, `0858`, `0920`, `0721`, `0707`, `0730`, `0581`, `0819`, `0814`, `0799`, `0537`, `0561` | `0581` (TEOT 2023): RATLIFF III como "epifisária parcial"; o capítulo diz colo (metafisária). Sem gabarito: `0721` (varo), `0730` (tipo II com parafusos), `0819` (Errado); `0814` e `0799` não sustentadas. `0561`: o nome da manobra não está no capítulo. |
| 7 | `pediatria-0010`, `0066`, `0097`, `0468`, `0160`, `0481`, `0173`, `0362`, `0383`, `0422`, `0164`, `0478`, `0146`, `0327`, `0366`, `0526`, `0065` | `0422` (TARO 2011): antebraço não sustentado. `0065` (TARO 2015): o capítulo põe a diáfise do fêmur antes do fêmur distal. `0526` (TARO 2025): gene do calo hiperplásico fora do capítulo. |
| 19 | `pediatria-0571`, `0524`, `0617`, `0695`, `0945`, `0667`, `0595`, `0642`, `0848`, `0714`, `0753`, `0631`, `0953`, `0618`, `0821` | `0642` (TARO 2019): varo; o capítulo diz valgo. `0617` (TARO 2017): posteromedial; o capítulo diz anterolateral. `0695` não sustentada. Sem gabarito: `0714` (III), `0753` (periósteo), `0821` (não sustentada). |
| 20 | `pediatria-0643`, `0685`, `0657`, `0706`, `0002`, `0633`, `0550`, `0822`, `0533`, `0558` | `0550` (TARO 2023): exposição; o capítulo diz desvio posterior. `0002` (TARO 2020): o capítulo sustenta só o lado direito. `0558` (TEOT 2024): sinal do esternocleidomastóideo não discutido. Sem gabarito: `0822` (sustentada). |
| 21 | `pediatria-0587`, `0851`, `0717`, `0638`, `1080`, `0605`, `0770`, `0576` | `1080` (ENARE 2023): POWERS; o capítulo usa o CCI. `0638` (TARO 2019): o nível C3 não é citado. Sem gabarito: `0717` e `0770` (sustentadas). SCIWORA (`0755`, `0833`) fora do capítulo. |
| 22 | `pediatria-0913`, `coluna-0302`, `pediatria-0627`, `coluna-0227`, `coluna-0312`, `pediatria-0833` | `coluna-0227` e `coluna-0312`: o capítulo sustenta só a gravidade abaixo de 8 anos e o estiramento. `pediatria-0627`: sexo e segmento não citados. Sem gabarito: `pediatria-0833`. Não citadas: `coluna-0179` (tratamento da SCIWORA) e `pediatria-0755`. |
| 11 | `pediatria-0640`, `0748`, `0926`, `0815`, `0564`, `0841`, `0611`, `0659`, `0954` | `0954` (TEPOP 2024): o capítulo diz mais de 4 mm ou articulação incongruente. Sem gabarito: `0748`, `0926`, `0815`, `0841` (sustentadas). Não citada: `0934` (imagem da técnica). |
| 12 | `pediatria-0712`, `0724`, `0924`, `0930`, `0929`, `0659`, `0539`, `0831`, `0742` | Sem gabarito, sustentadas: `0724`, `0924`, `0930`, `0929`, `0831`, `0742`. Não citadas: `0664` (sinostose; não sustentada), `0754`, `0911`, `1055` (pronação dolorosa), `0925` (imagem). |
| 28 | `pediatria-0711`, `0700`, `0949`, `0535`, `0624`, `0693`, `0735`, `0824` | `0624` e `0693`: hiperextensão; o capítulo diz valgo com rotação externa. Sem gabarito: `0735` (sustentada), `0824` (o capítulo usa a combinada intra e extra-articular). |
| 6 | `pediatria-0850`, `0666`, `0827` | Sem gabarito: `0827` (o capítulo aponta o compartimento flexor profundo, não os flexores do carpo). |
| 31 | `pediatria-0626`, `0596`, `0718`, `0704`, `0582`, `0597` | Sem gabarito: `0718` (o capítulo aponta base do segundo metatarsal com cuboide). Relacionadas: `0518` (SEVER) e `0512` (apófise do quinto). |
| 8 | `pediatria-0583`, `0609`, `0644`, `0522`, `0562`, `0823` | `0522`: gabarito tipo A; o capítulo dá o D como equivalente ao BENNETT. Sem gabarito: `0823` (sustentada). |
