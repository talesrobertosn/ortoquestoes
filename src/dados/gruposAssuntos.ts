/**
 * Grupos de assuntos de cada área (27/10/2026), o nível do meio da navegação por assunto:
 * Área (tema do acervo) > Grupo > Assunto (subtema da taxonomia, src/dados/taxonomia.json).
 *
 * Não é uma classificação nova: cada grupo só junta, à mão e por nome exato, assuntos que já existem
 * na taxonomia (nada de procurar palavras no texto do flashcard ou da questão). Um flashcard entra no
 * grupo do assunto que ele já tem. Assunto que não estiver aqui (nome novo, de outra área) cai em
 * "Outros assuntos" da própria área, para nunca sumir da Biblioteca. O teste
 * fixtures/testar_filtro_flashcards.mjs garante que todo assunto da taxonomia está em exatamente um grupo.
 * Área com um grupo só não mostra esse nível (vai direto da área aos assuntos).
 */
export interface GrupoAssuntos { id: string; nome: string; assuntos: string[] }

export const OUTROS_ASSUNTOS: Omit<GrupoAssuntos, 'assuntos'> = { id: 'outros', nome: 'Outros assuntos' }

const g = (id: string, nome: string, assuntos: string[]): GrupoAssuntos => ({ id, nome, assuntos })

export const GRUPOS_ASSUNTOS: Record<string, GrupoAssuntos[]> = {
  trauma: [
    g('principios', 'Princípios e politrauma', ['Politrauma e controle de danos', 'Fraturas expostas', 'Fixação externa e princípios de tratamento', 'Síndrome compartimental', 'Fraturas por estresse', 'Trauma pediátrico', 'Outros temas de trauma']),
    g('membro-superior', 'Membro superior', ['Fratura da clavícula', 'Fratura da escápula', 'Luxação acromioclavicular', 'Fratura do úmero proximal', 'Fratura da diáfise do úmero', 'Fratura do úmero distal', 'Fratura do olécrano', 'Fratura da cabeça do rádio e instabilidade do cotovelo', 'Fraturas diafisárias do antebraço', 'Fratura do rádio distal', 'Fratura do escafoide e do carpo', 'Fraturas dos metacarpos e falanges']),
    g('coluna', 'Coluna', ['Fraturas da coluna cervical alta', 'Fraturas da coluna cervical baixa', 'Fraturas da coluna toracolombar']),
    g('pelve', 'Pelve e acetábulo', ['Fratura do anel pélvico', 'Fratura do acetábulo']),
    g('quadril-femur', 'Quadril e fêmur', ['Luxação do quadril e fratura da cabeça femoral', 'Fratura do colo do fêmur', 'Fratura transtrocantérica', 'Fratura subtrocantérica', 'Fratura da diáfise do fêmur', 'Fratura do fêmur distal']),
    g('joelho-perna', 'Joelho e perna', ['Fratura da patela e lesão do aparelho extensor', 'Fratura do planalto tibial', 'Luxação do joelho e lesões ligamentares', 'Fratura da diáfise da tíbia', 'Fratura do pilão tibial']),
    g('tornozelo-pe', 'Tornozelo e pé', ['Fratura do tornozelo', 'Fraturas do tálus e do calcâneo', 'Fraturas do mediopé e antepé']),
  ],
  pediatria: [
    g('fraturas', 'Fraturas e trauma na criança', ['Fraturas supracondilianas do úmero', 'Côndilo lateral, epicôndilo medial e rádio proximal na criança', 'Fraturas do antebraço e punho na criança', 'Fraturas da clavícula e do úmero proximal na criança', 'Fraturas do fêmur e da perna na criança', 'Fraturas do tornozelo na criança', 'Fraturas do pé na criança', 'Fraturas da pelve e do quadril na criança', 'Trauma da coluna na criança', 'Lesões fisárias', 'Luxações na criança', 'Outras fraturas na criança', 'Maus-tratos']),
    g('quadril', 'Quadril da criança', ['Displasia do desenvolvimento do quadril', 'Doença de Legg-Calvé-Perthes', 'Epifisiólise proximal do fêmur', 'Sinovite transitória e artrite séptica do quadril', 'Coxa vara do desenvolvimento']),
    g('membro-inferior', 'Membros inferiores e pé', ['Genuvaro, genuvalgo e torções', 'Tíbia vara (Blount)', 'Pseudartrose congênita da tíbia e deformidades da perna', 'Joelho da criança', 'Pé torto congênito', 'Outras deformidades do pé na criança', 'Discrepância de comprimento dos membros', 'Deficiências longitudinais dos membros']),
    g('neuromusculares', 'Neuromusculares, displasias e metabólicas', ['Paralisia cerebral', 'Mielomeningocele', 'Artrogripose e doenças neuromusculares', 'Osteogênese imperfeita', 'Displasias esqueléticas e síndromes', 'Raquitismo e doenças metabólicas na criança', 'Outras doenças congênitas']),
    g('desenvolvimento', 'Crescimento e desenvolvimento', ['Desenvolvimento neuropsicomotor', 'Marcha na criança', 'Ossificação e crescimento', 'Osteocondroses']),
    g('outros-segmentos', 'Membro superior, coluna e infecções', ['Ombro e cotovelo da criança', 'Mão da criança', 'Coluna e pescoço da criança', 'Infecções e artrites na criança', 'Outros temas de ortopedia pediátrica']),
  ],
  mao: [
    g('anatomia', 'Anatomia, exame e imagem', ['Anatomia da mão e punho', 'Biomecânica da mão', 'Exame físico da mão e punho', 'Imagem da mão e punho', 'Anestesia em cirurgia da mão']),
    g('fraturas', 'Fraturas e lesões ligamentares', ['Fraturas do escafoide e do carpo', 'Fraturas dos metacarpos e falanges', 'Fratura do rádio distal', 'Lesões ligamentares dos dedos', 'Instabilidade do carpo', 'Fibrocartilagem triangular e punho ulnar']),
    g('tendoes', 'Tendões', ['Lesões dos tendões flexores', 'Lesões dos tendões extensores', 'Deformidades dos dedos', 'Tenossinovite de De Quervain', 'Dedo em gatilho e outras tenossinovites', 'Transferências tendinosas e paralisias']),
    g('nervos', 'Nervos e compressões', ['Síndrome do túnel do carpo', 'Neuropatia ulnar e outras compressões', 'Lesões de nervos periféricos', 'Plexo braquial e paralisia obstétrica', 'Síndrome da dor complexa regional']),
    g('degenerativas', 'Degenerativas e inflamatórias', ['Doença de Dupuytren', 'Mão reumatoide', 'Rizartrose e artrose da mão', 'Doença de Kienböck', 'Artrose do punho e artroscopia']),
    g('congenitas', 'Malformações congênitas', ['Sindactilia e polidactilia', 'Deficiências longitudinais e mão torta', 'Outras malformações congênitas']),
    g('plastica', 'Cirurgia plástica e microcirurgia', ['Retalhos e cobertura cutânea', 'Amputações e reimplantes', 'Microcirurgia e retalhos livres', 'Cicatrização e enxertos de pele', 'Queimaduras', 'Cirurgia plástica geral']),
    g('infeccoes-tumores', 'Infecções, tumores e outros', ['Infecções da mão', 'Tumores da mão', 'Cistos sinoviais e gangliões', 'Outros temas da mão']),
  ],
  'ombro-cotovelo': [
    g('anatomia', 'Anatomia, exame e imagem', ['Anatomia do ombro', 'Anatomia do cotovelo', 'Biomecânica do ombro e cotovelo', 'Exame físico do ombro', 'Exame físico do cotovelo', 'Imagem do ombro e cotovelo', 'Artroscopia e vias de acesso do ombro']),
    g('instabilidade', 'Instabilidade do ombro', ['Instabilidade anterior do ombro', 'Instabilidade posterior e multidirecional', 'Lesões SLAP e do lábio superior', 'Luxação acromioclavicular e esternoclavicular']),
    g('manguito', 'Manguito rotador e tendões', ['Lesões do manguito rotador', 'Lesão do subescapular', 'Impacto subacromial e acromioplastia', 'Tendinite calcária', 'Capsulite adesiva', 'Lesões do bíceps', 'Peitoral maior e outras rupturas tendíneas']),
    g('artroplastia', 'Artrose e artroplastia', ['Omartrose e artroplastia do ombro', 'Osteonecrose da cabeça umeral', 'Artrose e artroplastia do cotovelo']),
    g('fraturas', 'Fraturas', ['Fraturas do úmero proximal e da escápula', 'Fraturas do cotovelo e antebraço']),
    g('cotovelo', 'Cotovelo', ['Instabilidade do cotovelo', 'Epicondilite lateral e medial', 'Rigidez do cotovelo', 'Ossificação heterotópica', 'Artroscopia do cotovelo']),
    g('nervos', 'Nervos e outros', ['Lesões nervosas do ombro e cotovelo', 'Outros temas do ombro e cotovelo']),
  ],
  quadril: [
    g('anatomia', 'Anatomia, exame e vias de acesso', ['Anatomia do quadril', 'Biomecânica e marcha', 'Exame físico do quadril', 'Imagem do quadril', 'Vias de acesso ao quadril']),
    g('artroplastia', 'Artrose e artroplastia', ['Coxartrose', 'Artroplastia total: componentes e fixação', 'Infecção periprotética do quadril', 'Soltura, osteólise e revisão', 'Fraturas periprotéticas do quadril', 'Luxação e instabilidade da artroplastia']),
    g('jovem', 'Quadril do adulto jovem', ['Impacto femoroacetabular', 'Artroscopia do quadril e lesão labral', 'Osteonecrose da cabeça femoral', 'Displasia do quadril no adulto', 'Osteotomias do quadril']),
    g('partes-moles', 'Partes moles, fraturas e outros', ['Dor peritrocantérica e tendinopatias', 'Pubalgia e osteíte púbica', 'Fraturas do quadril e do acetábulo', 'Outros temas do quadril']),
  ],
  joelho: [
    g('anatomia', 'Anatomia, exame e imagem', ['Anatomia do joelho', 'Biomecânica do joelho', 'Exame físico do joelho', 'Imagem do joelho', 'Vias de acesso ao joelho', 'Artroscopia do joelho']),
    g('ligamentos', 'Ligamentos', ['Lesão do ligamento cruzado anterior', 'Reconstrução do LCA: enxertos e túneis', 'Lesão do ligamento cruzado posterior', 'Canto posterolateral', 'Ligamento colateral medial', 'Luxação do joelho']),
    g('menisco-cartilagem', 'Meniscos e cartilagem', ['Lesões meniscais', 'Menisco discoide', 'Lesões condrais', 'Osteocondrite dissecante', 'Osteonecrose do joelho']),
    g('extensor', 'Aparelho extensor e patela', ['Instabilidade femoropatelar', 'Tendinopatias do aparelho extensor', 'Ruptura dos tendões patelar e quadricipital', 'Fratura da patela']),
    g('artroplastia', 'Artrose e artroplastia', ['Gonartrose e osteotomias', 'Artroplastia total do joelho', 'Artroplastia unicompartimental']),
    g('outros-joelho', 'Criança e outros', ['Joelho na criança', 'Outros temas do joelho']),
  ],
  coluna: [
    g('anatomia', 'Anatomia, exame e imagem', ['Anatomia da coluna', 'Biomecânica da coluna', 'Exame neurológico e radiculopatias', 'Imagem da coluna', 'Vias de acesso à coluna']),
    g('degenerativa', 'Degenerativa', ['Lombalgia', 'Hérnia de disco lombar', 'Hérnia de disco e mielopatia cervical', 'Estenose do canal lombar', 'Espondilólise e espondilolistese']),
    g('deformidades', 'Deformidades', ['Escoliose idiopática', 'Escoliose congênita e neuromuscular', 'Cifose e doença de Scheuermann', 'Coluna cervical da criança e torcicolo']),
    g('trauma', 'Trauma e lesão medular', ['Lesão medular e síndromes medulares', 'Fraturas da coluna cervical', 'Fraturas da coluna toracolombar']),
    g('infeccoes-tumores', 'Infecções, tumores e inflamatórias', ['Infecções da coluna', 'Tumores da coluna', 'Espondiloartrites', 'Outros temas da coluna']),
  ],
  'pe-tornozelo': [
    g('anatomia', 'Anatomia, exame e imagem', ['Anatomia do pé e tornozelo', 'Biomecânica e marcha', 'Exame físico do pé e tornozelo', 'Imagem do pé e tornozelo']),
    g('antepe', 'Antepé', ['Hálux valgo', 'Hálux rígido', 'Metatarsalgia e neuroma de Morton', 'Dedos menores em garra e em martelo']),
    g('deformidades', 'Pé plano, cavo e deformidades', ['Pé plano adquirido do adulto', 'Pé plano flexível', 'Pé cavo', 'Coalizões tarsais', 'Deformidades congênitas do pé', 'Osteocondroses do pé']),
    g('tendoes', 'Tendões e calcanhar', ['Tendão calcâneo', 'Tendões fibulares e outras tendinopatias', 'Fasciíte plantar e dor no calcanhar']),
    g('tornozelo', 'Tornozelo', ['Entorse e instabilidade lateral do tornozelo', 'Lesões osteocondrais do tálus', 'Artrose do tornozelo, artrodese e artroplastia', 'Artroscopia do tornozelo', 'Lesão da sindesmose']),
    g('fraturas', 'Fraturas', ['Fraturas do tornozelo e do pilão tibial', 'Fraturas do retropé, mediopé e antepé']),
    g('sistemicas', 'Pé diabético, reumatoide e outros', ['Pé diabético e neuroartropatia de Charcot', 'Pé reumatoide', 'Outros temas do pé e tornozelo']),
  ],
  tumores: [
    g('principios', 'Princípios', ['Estadiamento, biópsia e margens']),
    g('cartilaginosos', 'Tumores cartilaginosos', ['Osteocondroma e exostoses múltiplas', 'Encondroma e encondromatoses', 'Condroblastoma', 'Fibroma condromixoide', 'Condrossarcoma']),
    g('osseos', 'Tumores formadores de osso', ['Osteoma osteoide', 'Osteoblastoma', 'Osteossarcoma']),
    g('outros-osseos', 'Outros tumores ósseos', ['Tumor de células gigantes', 'Sarcoma de Ewing', 'Displasia osteofibrosa e adamantinoma', 'Histiocitose de células de Langerhans', 'Cordoma', 'Mieloma múltiplo e plasmocitoma', 'Metástases ósseas']),
    g('pseudotumorais', 'Lesões pseudotumorais', ['Cisto ósseo simples', 'Cisto ósseo aneurismático', 'Displasia fibrosa', 'Fibroma não ossificante e defeito fibroso cortical', 'Doença de Paget', 'Outras lesões pseudotumorais']),
    g('partes-moles', 'Partes moles', ['Sarcomas de partes moles', 'Tumores benignos de partes moles']),
  ],
  'conceitos-basicos': [
    g('infeccoes', 'Infecções', ['Osteomielite aguda', 'Osteomielite crônica', 'Artrite séptica', 'Outras infecções osteoarticulares']),
    g('consolidacao', 'Consolidação e osteossíntese', ['Consolidação óssea', 'Pseudartrose e retardo de consolidação', 'Princípios de osteossíntese', 'Fixadores externos', 'Tratamento conservador e imobilização', 'Deformidades ósseas e alongamento']),
    g('ciencias-basicas', 'Ciências básicas e imagem', ['Biologia da cartilagem articular', 'Lesões musculares', 'Doenças autoinflamatórias ósseas', 'Imagem em ortopedia']),
    g('clinica', 'Clínica, pesquisa e outros', ['Dor e analgesia', 'Medicamentos e exames laboratoriais', 'Amputações e próteses', 'Metodologia científica e estatística', 'Outros temas de conceitos básicos']),
  ],
  // Áreas pequenas: um grupo só (a navegação vai direto da área aos assuntos).
  osteometabolicas: [
    g('todos', 'Osteometabólicas', ['Osteoporose: diagnóstico', 'Osteoporose: tratamento', 'Raquitismo e osteomalácia', 'Hiperparatireoidismo e osteodistrofia renal', 'Tuberculose osteoarticular', 'Espondiloartrites e outras artrites', 'Artrite reumatoide', 'Doença de Paget', 'Outros temas osteometabólicos']),
  ],
  'ortopedia-geral': [
    g('todos', 'Ortopedia geral', ['Infecção osteoarticular no adulto', 'Osteomielite', 'Artrite séptica', 'Artrite reumatoide', 'Espondiloartrites e artrite psoriásica', 'Gota e artropatias por cristais', 'Osteoartrose', 'Medicina esportiva e lesões por esforço repetitivo', 'Órteses, próteses e amputações', 'Reabilitação', 'Tromboprofilaxia e complicações clínicas']),
  ],
}

const porArea = new Map<string, Map<string, GrupoAssuntos>>()
/** O grupo de um assunto dentro da área (ou "Outros assuntos", se ele não estiver na tabela). */
export function grupoDoAssunto(area: string, assunto: string): Omit<GrupoAssuntos, 'assuntos'> {
  let mapa = porArea.get(area)
  if (!mapa) {
    mapa = new Map()
    for (const grupo of GRUPOS_ASSUNTOS[area] ?? []) for (const a of grupo.assuntos) mapa.set(a, grupo)
    porArea.set(area, mapa)
  }
  const grupo = mapa.get(assunto)
  return grupo ? { id: grupo.id, nome: grupo.nome } : OUTROS_ASSUNTOS
}
