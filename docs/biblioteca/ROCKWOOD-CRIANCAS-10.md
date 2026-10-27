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
| 6 | Compartment Syndrome in Children | 263 a 305 | A fazer |
| 7 | Pathologic Fractures and Nonaccidental Injuries | 306 a 444 | A fazer |
| 8 | Hand and Carpal Bones | 445 a 633 | A fazer |
| 9 | Distal Radius and Ulna | 634 a 789 | 9ª ed. já tem resumo (`wilkins9-08`); atualizar com a 10ª |
| 10 | Diaphyseal Radius and Ulna | 790 a 935 | 9ª ed. já tem resumo (`wilkins9-09`); atualizar |
| 11 | Radial Neck and Olecranon | 936 a 1084 | A fazer |
| 12 | Monteggia Fracture-Dislocation | 1085 a 1219 | A fazer |
| 13 | Evaluation of the Injured Pediatric Elbow | 1220 a 1271 | 9ª ed. já tem resumo; atualizar |
| 14 | Supracondylar Fractures | 1272 a 1425 | 9ª ed. já tem resumo; atualizar |
| 15 | T-Condylar Fractures | 1426 a 1475 | 9ª ed. já tem resumo; atualizar |
| 16 | Medial Epicondyle and Elbow Dislocations | 1476 a 1594 | 9ª ed. já tem resumo; atualizar |
| 17 | Lateral Condylar and Capitellar | 1595 a 1670 | 9ª ed. já tem resumo; atualizar |
| 18 | Distal Humeral Physeal, Medial Condyle, Lateral Epicondylar | 1671 a 1771 | 9ª ed. já tem resumo; atualizar |
| 19 | Shoulder Dislocation and Proximal Humerus | 1772 a 1943 | A fazer |
| 20 | Clavicle and Scapula | 1944 a 2072 | A fazer |
| 21 | Cervical Spine | 2073 a 2164 | A fazer |
| 22 | Thoracolumbar Spine | 2165 a 2226 | A fazer |
| 23 | Pelvic and Acetabular | 2227 a 2334 | A fazer |
| 24 | Hip | 2335 a 2436 | A fazer |
| 25 | Femoral Shaft | 2437 a 2555 | Feito em 26/10/2026: `rockwoodcriancas10-25-diafise-femur`, `pediatria-1122` a `1136` |
| 26 | Distal Femoral Physis | 2556 a 2642 | Feito em 26/10/2026: `rockwoodcriancas10-26-fise-distal-femur`, `pediatria-1094` a `1107` |
| 27 | Proximal Tibial Physeal | 2643 a 2695 | Feito em 26/10/2026: `rockwoodcriancas10-27-fise-proximal-tibia`, `pediatria-1108` a `1121` |
| 28 | Intra-Articular Injuries of the Knee | 2696 a 2826 | A fazer |
| 29 | Tibia and Fibula Shaft | 2827 a 2957 | Feito em 27/10/2026: `rockwoodcriancas10-29-diafise-tibia`, `pediatria-1137` a `1152` |
| 30 | Ankle | 2958 a 3099 | Feito em 27/10/2026: `rockwoodcriancas10-30-tornozelo`, `pediatria-1153` a `1167` |
| 31 | Foot | 3100 a 3352 | A fazer |

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
