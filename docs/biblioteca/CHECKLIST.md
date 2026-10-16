# Biblioteca: checklist de temas

Para continuar com qualquer agente. **Antes de fazer um tema, leia [README.md](README.md)**: regras do Tales,
passo a passo (extrair o PDF, engenharia reversa das questões, escrever, gerar, conferir), formato de
autoria e testes. O resumo de referência, que mostra o nível esperado, é
[`conteudo/biblioteca/rockwood10-53-colo-femur.md`](../../conteudo/biblioteca/rockwood10-53-colo-femur.md).

## Regra de ouro

**Só fazer resumo de capítulo de livro ou artigo que o Tales enviou.** Os PDFs ficam na sessão em que
foram enviados (não vão para o repositório, por direito autoral). Se o tema está "enviado" aqui mas o
arquivo não está disponível na sua sessão, **peça ao Tales para reenviar**; não escreva de memória.

Plano gratuito: no máximo **5** resumos com `acesso: gratis` (o gerador confere). Os demais são
`acesso: assinante`. Grátis hoje (2 de 5): colo do fêmur e transtrocantérica.

## Temas enviados pelo Tales

| # | Tema | Arquivo enviado | Estado |
| --- | --- | --- | --- |
| 1 | Fratura do colo do fêmur | fratura_colo_femur.pdf (Rockwood and Green's Fractures in Adults, 10ª ed., cap. 53) | [x] Feito em 16/10/2026: `rockwood10-53-colo-femur`, grátis |
| 2 | Fratura transtrocantérica | transtrocanterica.pdf (Rockwood and Green's, 10ª ed., cap. 54) | [x] Feito em 16/10/2026: `rockwood10-54-transtrocanterica`, grátis |
| 3 | Fratura da cabeça do rádio, luxação do cotovelo e tríade terrível | cotovelo_deslocado.pdf (enviado em 16/10/2026, 62 páginas): Rockwood 10ª ed., cap. 40 · Elbow Dislocations and Terrible Triad Injuries (King, Beingessner, Pollock). Cobre luxação simples, cabeça do rádio, coronoide, tríade terrível, instabilidade posteromedial e ulna proximal | [x] Feito em 16/10/2026: `rockwood10-40-cotovelo-cabeca-radio`, grátis (3 de 5) |
| 4 | Fratura do úmero distal | tema_1_cabeca_do_radio.pdf (enviado em 16/10/2026): na verdade é o cap. 39 do Rockwood (Distal Humerus Fractures) | [ ] Na fila (o nome do arquivo dizia cabeça do rádio; o capítulo certo da cabeça do rádio chegou depois, ver linha 3). |

Ao terminar um tema: marque aqui, anote o id do capítulo, se é grátis, e qualquer divergência entre o
livro e um gabarito oficial que tenha ido para `alerta:`.

## Fila: do que mais cai para o que menos cai (TEOT e TARO)

Ordem dos subtemas do acervo pelo número de questões de prova real do TEOT e do TARO (sem simulados do
site nem duplicatas). Use para escolher o próximo tema quando o Tales pedir "o que mais cai" e para
pedir a ele o capítulo certo. Só a ordem é mostrada (sem quantidades). Para recalcular:

```bash
python3 - <<'PY'
import json,collections,re
ind=json.load(open('public/acervo/indice.json')); sub=ind['subtemas']; pr=ind['provas']
c=collections.Counter(s for q in ind['questoes'] if not q.get('sim') and q.get('p') is not None and not q.get('dup') and re.search('TEOT|TARO', pr[q['p']]) for s in q['s'])
print('\n'.join(f'{i+1}. {sub[s]}' for i,(s,_) in enumerate(c.most_common())))
PY
```

Os primeiros 120 (a lista completa sai do comando acima):

1. [ ] Outras fraturas na criança (Ortopedia pediátrica)
2. [ ] Lesões fisárias (Ortopedia pediátrica)
3. [ ] Anatomia da mão e punho (Mão e punho)
4. [ ] Genuvaro, genuvalgo e torções (Ortopedia pediátrica)
5. [ ] Fraturas da coluna toracolombar (Trauma adulto)
6. [ ] Luxação do joelho e lesões ligamentares (Trauma adulto)
7. [ ] Anatomia do ombro (Ombro e cotovelo)
8. [ ] Anatomia do quadril (Quadril)
9. [ ] Côndilo lateral, epicôndilo medial e rádio proximal na criança (Ortopedia pediátrica)
10. [ ] Neuropatia ulnar e outras compressões (Mão e punho)
11. [ ] Outras malformações congênitas (Mão e punho)
12. [ ] Artroplastia total: componentes e fixação (Quadril)
13. [ ] Anatomia do pé e tornozelo (Pé e tornozelo)
14. [ ] Outros temas de trauma (Trauma adulto)
15. [ ] Lesões do manguito rotador (Ombro e cotovelo)
16. [ ] Lesões dos tendões flexores (Mão e punho)
17. [ ] Anatomia da coluna (Coluna)
18. [ ] Fraturas do antebraço e punho na criança (Ortopedia pediátrica)
19. [ ] Fraturas diafisárias do antebraço (Trauma adulto)
20. [x] Fratura da cabeça do rádio e instabilidade do cotovelo (Trauma adulto) — feito: `rockwood10-40-cotovelo-cabeca-radio` (também cobre olécrano e Monteggia posterior)
21. [ ] Síndrome compartimental (Trauma adulto)
22. [ ] Fraturas do fêmur e da perna na criança (Ortopedia pediátrica)
23. [ ] Fraturas dos metacarpos e falanges (Trauma adulto)
24. [ ] Estadiamento, biópsia e margens (Tumores ósseos e de partes moles)
25. [ ] Metástases ósseas (Tumores ósseos e de partes moles)
26. [ ] Omartrose e artroplastia do ombro (Ombro e cotovelo)
27. [ ] Hérnia de disco lombar (Coluna)
28. [ ] Displasia do desenvolvimento do quadril (Ortopedia pediátrica)
29. [ ] Osteomielite aguda (Conceitos básicos)
30. [ ] Instabilidade do cotovelo (Ombro e cotovelo)
31. [ ] Instabilidade anterior do ombro (Ombro e cotovelo)
32. [ ] Anatomia do joelho (Joelho)
33. [ ] Outras doenças congênitas (Ortopedia pediátrica)
34. [ ] Lesão do ligamento cruzado anterior (Joelho)
35. [ ] Lesão medular e síndromes medulares (Coluna)
36. [ ] Lesões do bíceps (Ombro e cotovelo)
37. [ ] Displasias esqueléticas e síndromes (Ortopedia pediátrica)
38. [ ] Paralisia cerebral (Ortopedia pediátrica)
39. [ ] Escoliose idiopática (Coluna)
40. [ ] Fraturas do tálus e do calcâneo (Trauma adulto)
41. [ ] Fratura da diáfise do fêmur (Trauma adulto)
42. [ ] Condrossarcoma (Tumores ósseos e de partes moles)
43. [ ] Princípios de osteossíntese (Conceitos básicos)
44. [ ] Espondilólise e espondilolistese (Coluna)
45. [ ] Fratura do úmero proximal (Trauma adulto)
46. [ ] Fratura da patela e lesão do aparelho extensor (Trauma adulto)
47. [ ] Ossificação e crescimento (Ortopedia pediátrica)
48. [ ] Artroplastia total do joelho (Joelho)
49. [ ] Hálux valgo (Pé e tornozelo)
50. [ ] Lesão do ligamento cruzado posterior (Joelho)
51. [ ] Outras infecções osteoarticulares (Conceitos básicos)
52. [ ] Fratura do planalto tibial (Trauma adulto)
53. [ ] Fraturas por estresse (Trauma adulto)
54. [ ] Tíbia vara (Blount) (Ortopedia pediátrica)
55. [ ] Lesões de nervos periféricos (Mão e punho)
56. [ ] Instabilidade do carpo (Mão e punho)
57. [ ] Lesões dos tendões extensores (Mão e punho)
58. [ ] Fratura do úmero distal (Trauma adulto) — capítulo recebido (Rockwood cap. 39, tema_1_cabeca_do_radio.pdf)
59. [ ] Fraturas expostas (Trauma adulto)
60. [ ] Pé torto congênito (Ortopedia pediátrica)
61. [ ] Joelho da criança (Ortopedia pediátrica)
62. [ ] Fraturas da pelve e do quadril na criança (Ortopedia pediátrica)
63. [ ] Exame físico da mão e punho (Mão e punho)
64. [ ] Fratura do anel pélvico (Trauma adulto)
65. [ ] Fratura da escápula (Trauma adulto)
66. [x] Fratura do colo do fêmur (Trauma adulto) — **feito:** `rockwood10-53-colo-femur`
67. [ ] Fratura da clavícula (Trauma adulto)
68. [ ] Fratura da diáfise da tíbia (Trauma adulto)
69. [ ] Artrogripose e doenças neuromusculares (Ortopedia pediátrica)
70. [ ] Tumor de células gigantes (Tumores ósseos e de partes moles)
71. [ ] Osteossarcoma (Tumores ósseos e de partes moles)
72. [ ] Tumores benignos de partes moles (Tumores ósseos e de partes moles)
73. [ ] Exame físico do ombro (Ombro e cotovelo)
74. [ ] Fratura subtrocantérica (Trauma adulto)
75. [ ] Fraturas da coluna cervical alta (Trauma adulto)
76. [ ] Marcha na criança (Ortopedia pediátrica)
77. [ ] Displasia fibrosa (Tumores ósseos e de partes moles)
78. [ ] Pseudartrose e retardo de consolidação (Conceitos básicos)
79. [ ] Dor e analgesia (Conceitos básicos)
80. [ ] Mão reumatoide (Mão e punho)
81. [ ] Retalhos e cobertura cutânea (Mão e punho)
82. [ ] Plexo braquial e paralisia obstétrica (Mão e punho)
83. [ ] Doença de Dupuytren (Mão e punho)
84. [ ] Lesões meniscais (Joelho)
85. [ ] Pé diabético e neuroartropatia de Charcot (Pé e tornozelo)
86. [ ] Fratura do escafoide e do carpo (Trauma adulto)
87. [ ] Fraturas supracondilianas do úmero (Ortopedia pediátrica)
88. [ ] Lesões ligamentares dos dedos (Mão e punho)
89. [ ] Outros temas do ombro e cotovelo (Ombro e cotovelo)
90. [ ] Ruptura dos tendões patelar e quadricipital (Joelho)
91. [ ] Hérnia de disco e mielopatia cervical (Coluna)
92. [ ] Fratura do fêmur distal (Trauma adulto)
93. [ ] Epifisiólise proximal do fêmur (Ortopedia pediátrica)
94. [ ] Artrite séptica (Conceitos básicos)
95. [ ] Rizartrose e artrose da mão (Mão e punho)
96. [ ] Fratura do rádio distal (Trauma adulto)
97. [ ] Capsulite adesiva (Ombro e cotovelo)
98. [ ] Imagem do ombro e cotovelo (Ombro e cotovelo)
99. [ ] Osteonecrose da cabeça femoral (Quadril)
100. [ ] Luxação do quadril e fratura da cabeça femoral (Trauma adulto)
101. [ ] Fratura do acetábulo (Trauma adulto)
102. [ ] Coluna e pescoço da criança (Ortopedia pediátrica)
103. [ ] Doença de Legg-Calvé-Perthes (Ortopedia pediátrica)
104. [ ] Lesões musculares (Conceitos básicos)
105. [ ] Osteoporose: diagnóstico (Osteometabólicas)
106. [ ] Biomecânica e marcha (Pé e tornozelo)
107. [ ] Osteocondrite dissecante (Joelho)
108. [ ] Fraturas da coluna cervical (Coluna)
109. [ ] Imagem do pé e tornozelo (Pé e tornozelo)
110. [ ] Coalizões tarsais (Pé e tornozelo)
111. [ ] Fratura do tornozelo (Trauma adulto)
112. [ ] Epicondilite lateral e medial (Ombro e cotovelo)
113. [ ] Artroscopia e vias de acesso do ombro (Ombro e cotovelo)
114. [ ] Estenose do canal lombar (Coluna)
115. [ ] Exame neurológico e radiculopatias (Coluna)
116. [ ] Tendões fibulares e outras tendinopatias (Pé e tornozelo)
117. [ ] Fraturas do tornozelo e do pilão tibial (Pé e tornozelo)
118. [ ] Tendão calcâneo (Pé e tornozelo)
119. [ ] Entorse e instabilidade lateral do tornozelo (Pé e tornozelo)
120. [ ] Pé plano adquirido do adulto (Pé e tornozelo)
...
122. [x] Fratura transtrocantérica (Trauma adulto) — **feito:** `rockwood10-54-transtrocanterica`
