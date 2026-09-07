"""
Textos de abertura das páginas públicas por assunto.

Não são texto de enfeite para buscador: descrevem o que cada tema cobra nas
provas, e é isso que os torna úteis para quem chega pela busca. Escrevê-los à
mão, um a um, é deliberado — texto gerado em série sobre o mesmo molde é
exatamente o que faz uma página parecer conteúdo raso.
"""

# slug -> (título da página, frase de resumo, parágrafo de abertura)
TEXTOS: dict[str, tuple[str, str, str]] = {
    "mao": (
        "Questões de mão e punho",
        "Questões de prova de cirurgia da mão e punho, comentadas alternativa por alternativa.",
        "Mão e punho é o assunto que mais cobra anatomia fina e classificação: zonas de lesão "
        "tendínea, túnel do carpo e demais compressões nervosas, fratura do escafoide e a "
        "pseudartrose que vem depois, instabilidade escafossemilunar, doença de Dupuytren, "
        "Kienböck, fraturas do rádio distal e as deformidades congênitas da mão. É também o tema "
        "em que as bancas gostam de nomes próprios — Bayne, Wassel, Blauth, Green — e de detalhes "
        "de tratamento que só aparecem em prova.",
    ),
    "ombro-cotovelo": (
        "Questões de ombro e cotovelo",
        "Questões de prova de ombro e cotovelo, comentadas alternativa por alternativa.",
        "Ombro e cotovelo reúne o manguito rotador em toda a sua extensão — exame físico, "
        "classificação das roturas, reparo e transferências —, a instabilidade glenoumeral com "
        "lesão de Bankart e Hill-Sachs, a capsulite adesiva, as fraturas da extremidade proximal "
        "do úmero e da clavícula, a luxação acromioclavicular, a epicondilite e, do lado do "
        "cotovelo, a tríade terrível, as fraturas da cabeça do rádio e do olécrano e a rigidez "
        "pós-traumática.",
    ),
    "quadril": (
        "Questões de quadril",
        "Questões de prova de quadril, comentadas alternativa por alternativa.",
        "Quadril concentra dois blocos que caem sempre: a artroplastia — vias de acesso, "
        "biomateriais, par tribológico, soltura, luxação, revisão, classificação de Paprosky — e "
        "as fraturas do fêmur proximal, com a discussão entre osteossíntese e artroplastia. Somam-se "
        "o impacto femoroacetabular, a displasia do desenvolvimento do adulto, a osteonecrose da "
        "cabeça femoral e as classificações de Ficat, Steinberg e Crowe.",
    ),
    "joelho": (
        "Questões de joelho",
        "Questões de prova de joelho, comentadas alternativa por alternativa.",
        "Joelho é o assunto da instabilidade ligamentar — cruzado anterior e posterior, canto "
        "posterolateral, exame físico e escolha de enxerto —, das lesões meniscais e condrais, da "
        "artroplastia total e unicompartimental, das osteotomias ao redor do joelho e das fraturas "
        "do planalto tibial. Aparecem também a instabilidade femoropatelar e a osteocondrite "
        "dissecante.",
    ),
    "coluna": (
        "Questões de coluna",
        "Questões de prova de coluna vertebral, comentadas alternativa por alternativa.",
        "Coluna cobra desde a semiologia — Hoffmann, Lhermitte, Spurling, sinais de primeiro "
        "neurônio — até a cirurgia de deformidade. Os blocos que mais caem são a hérnia de disco "
        "lombar e cervical, a estenose de canal, a espondilolistese (Wiltse-Newman e "
        "Marchetti-Bartolozzi), a escoliose idiopática do adolescente e a infantil, o trauma "
        "raquimedular com suas síndromes medulares, a espondilodiscite e as metástases vertebrais "
        "com Tokuhashi, SINS e Weinstein-Boriani-Biagini.",
    ),
    "pe-tornozelo": (
        "Questões de pé e tornozelo",
        "Questões de prova de pé e tornozelo, comentadas alternativa por alternativa.",
        "Pé e tornozelo é um tema de classificações e de biomecânica: hálux valgo e hálux rígido "
        "com suas osteotomias, disfunção do tibial posterior (Johnson-Strom), pé cavovaro e o "
        "teste de Coleman, coalizão tarsal, lesões osteocondrais do tálus por Berndt e Harty, "
        "instabilidade lateral crônica, tendão calcâneo, pé diabético com Wagner, Brodsky e "
        "Eichenholtz, e as deformidades congênitas — pé torto, metatarso aduto e tálus vertical.",
    ),
    "trauma": (
        "Questões de trauma e fraturas",
        "Questões de prova de trauma ortopédico e fraturas, comentadas alternativa por alternativa.",
        "Trauma é o maior bloco das provas de ortopedia. Cobre o atendimento inicial e o controle "
        "de dano, a classificação AO das fraturas, fraturas expostas e a classificação de "
        "Gustilo-Anderson, síndrome compartimental, embolia gordurosa, princípios de osteossíntese "
        "e de consolidação, fixador externo, hastes intramedulares e placas, pseudartrose e "
        "consolidação viciosa, além das fraturas por segmento, da bacia ao pilão tibial.",
    ),
    "pediatria": (
        "Questões de ortopedia pediátrica",
        "Questões de prova de ortopedia pediátrica, comentadas alternativa por alternativa.",
        "Ortopedia pediátrica cobra a displasia do desenvolvimento do quadril, a epifisiólise "
        "proximal do fêmur, a doença de Legg-Calvé-Perthes, o pé torto congênito e o método de "
        "Ponseti, as fraturas da criança com Salter-Harris e as supracondilianas do úmero, as "
        "deformidades angulares e rotacionais dos membros, a paralisia cerebral, a paralisia "
        "braquial obstétrica, as displasias esqueléticas e a osteogênese imperfeita.",
    ),
    "tumores": (
        "Questões de tumores ósseos e de partes moles",
        "Questões de prova de tumores ósseos e de partes moles, comentadas alternativa por alternativa.",
        "Tumores é o tema em que a resposta quase sempre está no cruzamento de idade, localização "
        "e padrão radiográfico. Caem o osteossarcoma, o sarcoma de Ewing, o condrossarcoma, o "
        "tumor de células gigantes, o osteoma osteoide, o osteocondroma, o cisto ósseo simples e "
        "o aneurismático, a displasia fibrosa, as metástases ósseas e os sarcomas de partes moles "
        "— com o estadiamento de Enneking e os princípios de biópsia e de margem cirúrgica.",
    ),
    "conceitos-basicos": (
        "Questões de conceitos básicos em ortopedia",
        "Questões de prova sobre ciências básicas aplicadas à ortopedia, comentadas alternativa por alternativa.",
        "Conceitos básicos é o bloco das ciências aplicadas: biologia da consolidação óssea, "
        "biomateriais e propriedades mecânicas dos implantes, infecção musculoesquelética e "
        "infecção periprotética com os critérios da MSIS, antibioticoprofilaxia, tromboprofilaxia, "
        "cicatrização de tecidos, farmacologia aplicada e metodologia científica — níveis de "
        "evidência, tipos de estudo e interpretação estatística.",
    ),
    "osteometabolicas": (
        "Questões de doenças osteometabólicas",
        "Questões de prova sobre doenças metabólicas do osso, comentadas alternativa por alternativa.",
        "As doenças osteometabólicas cobram osteoporose e seu tratamento, com bisfosfonatos, "
        "denosumabe e teriparatida e as complicações de cada um; osteomalácia e raquitismo, "
        "incluindo o hipofosfatêmico ligado ao X; hiperparatireoidismo; doença de Paget; e as "
        "artropatias por cristais, gota e condrocalcinose.",
    ),
    "ortopedia-geral": (
        "Questões de ortopedia geral",
        "Questões de prova de ortopedia geral, comentadas alternativa por alternativa.",
        "Ortopedia geral reúne o que atravessa todos os segmentos: semiologia do aparelho "
        "locomotor, doenças reumatológicas com repercussão ortopédica, ortopedia do esporte, "
        "reabilitação, órteses e próteses, e os temas de organização do atendimento.",
    ),
}
