/**
 * Visualizações prontas (pedido do Tales, 25/10/2026): conjuntos que caem nas provas, montados
 * com as chaves do banco anatômico. Cada item ganha uma cor; o resto fica translúcido. Só entram
 * agrupamentos que o livro de referência descreve (compartimentos, espaços, complexos ligamentares).
 */
export interface Preset {
  id: string
  nome: string
  resumo: string
  /** região do atlas onde a câmera vai (ids de dados/regioes.ts) */
  regiao: string
  /** chaves do banco anatômico, na ordem da legenda */
  chaves: string[]
}

export const PRESETS: Preset[] = [
  { id: 'manguito', nome: 'Manguito rotador', resumo: 'Os quatro tendões em ferradura nos tubérculos do úmero', regiao: 'ombro', chaves: ['supraespinal', 'infraespinal', 'redondo-menor', 'subescapular', 'supraescapular', 'axilar'] },
  { id: 'quadrangular', nome: 'Espaços do ombro', resumo: 'Quadrangular e triangular, com o nervo axilar e as circunflexas', regiao: 'ombro', chaves: ['redondo-menor', 'redondo-maior', 'triceps-braquial', 'axilar', 'art-circunflexa-posterior-do-umero', 'art-circunflexa-da-escapula'] },
  { id: 'estabilizadores-ombro', nome: 'Estabilizadores estáticos do ombro', resumo: 'Ligamentos glenoumerais, coracoumeral e lábio', regiao: 'ombro', chaves: ['lig-glenoumeral-superior', 'lig-glenoumeral-medio', 'lig-glenoumeral-inferior', 'lig-coracoumeral', 'labio-glenoidal'] },
  { id: 'acromioclavicular', nome: 'Acromioclavicular e coracoclavicular', resumo: 'O que segura a clavícula na escápula', regiao: 'ombro', chaves: ['lig-acromioclavicular', 'lig-conoide', 'lig-trapezoide', 'lig-coracoacromial'] },
  { id: 'braco-anterior', nome: 'Compartimento anterior do braço', resumo: 'Bíceps, braquial, coracobraquial e o musculocutâneo', regiao: 'braco', chaves: ['biceps-braquial', 'braquial', 'coracobraquial', 'musculocutaneo', 'art-braquial', 'mediano'] },
  { id: 'nervos-cotovelo', nome: 'Nervos no cotovelo', resumo: 'Ulnar, mediano e radial em volta do cotovelo', regiao: 'cotovelo', chaves: ['ulnar', 'mediano', 'radial', 'ramo-profundo-do-radial', 'interosseo-posterior', 'lig-colateral-ulnar'] },
  { id: 'ligamentos-cotovelo', nome: 'Ligamentos do cotovelo', resumo: 'Colaterais ulnar e radial e o anular', regiao: 'cotovelo', chaves: ['lig-colateral-ulnar', 'lig-colateral-radial', 'lig-anular', 'lig-quadrado'] },
  { id: 'flexores-antebraco', nome: 'Flexores do antebraço', resumo: 'Superficiais, intermédio e profundos', regiao: 'antebraco', chaves: ['pronador-redondo', 'flexor-radial-do-carpo', 'palmar-longo', 'flexor-ulnar-do-carpo', 'flexor-superficial-dos-dedos', 'flexor-profundo-dos-dedos', 'flexor-longo-do-polegar', 'pronador-quadrado'] },
  { id: 'extensores-antebraco', nome: 'Extensores do antebraço', resumo: 'Compartimento móvel, superficiais e profundos', regiao: 'antebraco', chaves: ['braquiorradial', 'extensor-radial-longo-do-carpo', 'extensor-radial-curto-do-carpo', 'extensor-dos-dedos', 'extensor-do-dedo-minimo', 'extensor-ulnar-do-carpo', 'supinador', 'abdutor-longo-do-polegar', 'extensor-curto-do-polegar', 'extensor-longo-do-polegar', 'extensor-do-indicador'] },
  { id: 'tenar-hipotenar', nome: 'Tenar e hipotenar', resumo: 'Músculos intrínsecos do polegar e do mínimo', regiao: 'punho-mao', chaves: ['abdutor-curto-do-polegar', 'flexor-curto-do-polegar', 'oponente-do-polegar', 'adutor-do-polegar', 'abdutor-do-dedo-minimo-da-mao', 'flexor-curto-do-dedo-minimo-da-mao', 'oponente-do-dedo-minimo-da-mao'] },
  { id: 'carpo', nome: 'Ligamentos do carpo', resumo: 'Escafossemilunar, semilunar-piramidal e extrínsecos', regiao: 'punho-mao', chaves: ['lig-escafossemilunar', 'lig-semilunar-piramidal', 'lig-radioescafocapitato', 'lig-ulnocapitato', 'lig-radiocarpal-dorsal', 'lig-intercarpal-dorsal', 'disco-radiulnar-distal'] },
  { id: 'abdutores-quadril', nome: 'Abdutores do quadril', resumo: 'Glúteos médio e mínimo, tensor e o glúteo superior', regiao: 'pelve-quadril', chaves: ['gluteo-medio', 'gluteo-minimo', 'tensor-da-fascia-lata', 'gluteo-superior'] },
  { id: 'rotadores-quadril', nome: 'Rotadores laterais curtos', resumo: 'Piriforme a quadrado femoral, com o isquiático', regiao: 'pelve-quadril', chaves: ['piriforme', 'gemeo-superior', 'obturador-interno', 'gemeo-inferior', 'quadrado-femoral', 'isquiatico', 'art-circunflexa-femoral-medial'] },
  { id: 'capsula-quadril', nome: 'Cápsula do quadril', resumo: 'Iliofemoral, pubofemoral, isquiofemoral e lábio', regiao: 'pelve-quadril', chaves: ['lig-iliofemoral', 'lig-pubofemoral', 'lig-isquiofemoral', 'labio-do-acetabulo', 'lig-da-cabeca-do-femur'] },
  { id: 'cabeca-femur', nome: 'Irrigação do colo do fêmur', resumo: 'Circunflexas femorais e a femoral profunda', regiao: 'pelve-quadril', chaves: ['art-circunflexa-femoral-medial', 'art-circunflexa-femoral-lateral', 'art-femoral-profunda', 'quadrado-femoral'] },
  { id: 'quadriceps', nome: 'Quadríceps', resumo: 'Reto femoral e os três vastos', regiao: 'coxa', chaves: ['reto-femoral', 'vasto-lateral', 'vasto-intermedio', 'vasto-medial', 'femoral'] },
  { id: 'isquiotibiais', nome: 'Isquiotibiais', resumo: 'Semitendíneo, semimembranáceo e bíceps femoral', regiao: 'coxa', chaves: ['semitendineo', 'semimembranaceo', 'biceps-femoral-cabeca-longa', 'biceps-femoral-cabeca-curta', 'isquiatico'] },
  { id: 'adutores', nome: 'Adutores da coxa', resumo: 'Compartimento medial e o nervo obturatório', regiao: 'coxa', chaves: ['adutor-longo', 'adutor-curto', 'adutor-magno', 'gracil', 'pectineo', 'obturatorio'] },
  { id: 'pata-de-ganso', nome: 'Pata de ganso', resumo: 'Sartório, grácil e semitendíneo na face medial da tíbia', regiao: 'joelho', chaves: ['sartorio', 'gracil', 'semitendineo'] },
  { id: 'pivo-central', nome: 'Pivô central e meniscos', resumo: 'LCA, LCP e meniscos', regiao: 'joelho', chaves: ['lca', 'lcp', 'menisco-medial', 'menisco-lateral', 'lig-transverso-do-joelho'] },
  { id: 'canto-posterolateral', nome: 'Canto posterolateral', resumo: 'Colateral fibular, popliteofibular e poplíteo', regiao: 'joelho', chaves: ['lcf', 'lig-popliteofibular', 'popliteo', 'lig-popliteo-arqueado', 'biceps-femoral-cabeca-longa', 'fibular-comum'] },
  { id: 'medial-joelho', nome: 'Estruturas mediais do joelho', resumo: 'Colateral tibial, menisco medial e poplíteo oblíquo', regiao: 'joelho', chaves: ['lct', 'menisco-medial', 'lig-popliteo-obliquo', 'semimembranaceo'] },
  { id: 'fossa-poplitea', nome: 'Fossa poplítea', resumo: 'Artéria poplítea atrás do LCP e os nervos', regiao: 'joelho', chaves: ['art-poplitea', 'art-geniculares', 'lcp', 'tibial', 'fibular-comum', 'gastrocnemio'] },
  { id: 'perna-anterior', nome: 'Compartimento anterior da perna', resumo: 'Tibial anterior, extensores, fibular profundo', regiao: 'perna', chaves: ['tibial-anterior', 'extensor-longo-do-halux', 'extensor-longo-dos-dedos', 'fibular-terceiro', 'fibular-profundo', 'art-tibial-anterior'] },
  { id: 'perna-lateral', nome: 'Compartimento lateral da perna', resumo: 'Fibulares e o fibular superficial', regiao: 'perna', chaves: ['fibular-longo', 'fibular-curto', 'fibular-superficial'] },
  { id: 'perna-posterior-superficial', nome: 'Posterior superficial da perna', resumo: 'Tríceps sural e plantar', regiao: 'perna', chaves: ['gastrocnemio', 'soleo', 'plantar', 'tendao-do-calcaneo', 'sural'] },
  { id: 'perna-posterior-profundo', nome: 'Posterior profundo da perna', resumo: 'Tibial posterior, flexores longos e o feixe tibial', regiao: 'perna', chaves: ['tibial-posterior', 'flexor-longo-dos-dedos', 'flexor-longo-do-halux', 'popliteo', 'tibial', 'art-tibial-posterior', 'art-fibular'] },
  { id: 'colateral-lateral-tornozelo', nome: 'Colateral lateral do tornozelo', resumo: 'Talofibulares anterior e posterior e calcaneofibular', regiao: 'tornozelo-pe', chaves: ['lig-talofibular-anterior', 'lig-calcaneofibular', 'lig-talofibular-posterior'] },
  { id: 'deltoide', nome: 'Ligamento deltóideo', resumo: 'Camadas superficial e profunda', regiao: 'tornozelo-pe', chaves: ['deltoide-tibionavicular', 'deltoide-tibiocalcaneo', 'deltoide-tibiotalar-posterior'] },
  { id: 'sindesmose', nome: 'Sindesmose', resumo: 'Tibiofibulares anterior e posterior e membrana', regiao: 'tornozelo-pe', chaves: ['lig-tibiofibular-anterior', 'lig-tibiofibular-posterior', 'membrana-interossea-da-perna'] },
  { id: 'tunel-do-tarso', nome: 'Atrás do maléolo medial', resumo: 'Tibial posterior, flexores longos, nervo e artéria tibiais', regiao: 'tornozelo-pe', chaves: ['tibial-posterior', 'flexor-longo-dos-dedos', 'flexor-longo-do-halux', 'tibial', 'art-tibial-posterior', 'plantar-medial', 'plantar-lateral'] },
  { id: 'medio-pe', nome: 'Ligamentos do mediopé', resumo: 'Mola, bifurcado, plantares e Lisfranc', regiao: 'tornozelo-pe', chaves: ['lig-mola', 'lig-bifurcado', 'lig-plantar-longo', 'lig-plantar-curto', 'lig-lisfranc'] },
  { id: 'planta', nome: 'Camadas da planta', resumo: 'Da 1ª à 4ª camada e os nervos plantares', regiao: 'tornozelo-pe', chaves: ['abdutor-do-halux', 'flexor-curto-dos-dedos', 'abdutor-do-dedo-minimo-do-pe', 'quadrado-plantar', 'lumbricais-do-pe', 'flexor-curto-do-halux', 'adutor-do-halux', 'interosseos-plantares', 'plantar-medial', 'plantar-lateral'] },
]

/** Paleta da legenda: cores que se distinguem bem sobre osso e músculo. */
export const CORES_PRESET = ['#e4572e', '#2e86de', '#f2b134', '#7b4fd1', '#17a398', '#e05297', '#8c6b3f', '#4caf50', '#1f3c88', '#d35400', '#6c757d']
