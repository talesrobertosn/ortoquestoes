import type { Box3 } from 'three'
import type { Estrutura, Grupo } from '../tipos'
import { caixasDaRegiao, regiaoPorId } from './regioes'
import { type IndiceArvore, SISTEMAS, idsDoSistema } from './modos'

/**
 * Temas do Teste-se (Tales, 11/11/2026: "estudo ortopédico mais focal", "grupos musculares, tipo membro inferior,
 * coluna, pé", "igualmente para nervo e vasos"). Cada região vai do grupo amplo ao focal, em cada camada: músculos,
 * nervos, vasos, ossos e ligamentos. Os temas juntam estruturas por nós da hierarquia do Z-Anatomy (compartimentos,
 * plexos, a artéria axilar e seus ramos) ou pela caixa de uma região (ligamentos do joelho). Nos membros, o teste
 * usa o lado direito: um membro só, sem nome repetido.
 */
export interface TemaEstudo {
  id: string
  nome: string
  resumo: string
  secao: string
  grupos: Grupo[]
  /** nós da arvore.json (nome em português, como na hierarquia) */
  nos?: string[]
  /** região do atlas cuja caixa recorta a camada */
  regiao?: string
  /** só o lado direito (e as estruturas da linha média) */
  direito?: boolean
  cor?: string
}

export const SECOES_ESTUDO = ['Membro superior', 'Membro inferior', 'Coluna e tronco', 'Cabeça e pescoço', 'Corpo inteiro'] as const
const [MS, MI, COLUNA, CABECA] = SECOES_ESTUDO

const mus = (id: string, secao: string, nome: string, resumo: string, nos: string[], direito = true): TemaEstudo => ({ id, secao, nome, resumo, grupos: ['musculo'], nos, direito })
const ner = (id: string, secao: string, nome: string, resumo: string, nos: string[], direito = true): TemaEstudo => ({ id, secao, nome, resumo, grupos: ['nervo'], nos, direito })
const art = (id: string, secao: string, nome: string, resumo: string, nos: string[], direito = true): TemaEstudo => ({ id, secao, nome, resumo, grupos: ['arteria'], nos, direito })
const vei = (id: string, secao: string, nome: string, resumo: string, nos: string[], direito = true): TemaEstudo => ({ id, secao, nome, resumo, grupos: ['veia'], nos, direito })
const oss = (id: string, secao: string, nome: string, resumo: string, nos: string[], direito = true): TemaEstudo => ({ id, secao, nome, resumo, grupos: ['osso'], nos, direito })
const lig = (id: string, secao: string, nome: string, resumo: string, regiao: string, direito = true): TemaEstudo => ({ id, secao, nome, resumo, grupos: ['ligamento'], regiao, direito })

export const TEMAS_ORTOPEDIA: TemaEstudo[] = [
  mus('ms-musculos', MS, 'Todos os músculos do membro superior', 'Do ombro à mão', ['Músculos do membro superior']),
  mus('manguito', MS, 'Manguito rotador', 'Supraespinal, infraespinal, redondo menor e subescapular', ['Músculos do manguito rotador']),
  mus('escapuloumerais', MS, 'Músculos do ombro', 'Deltoide, redondo maior e o manguito', ['Músculos escapuloumerais']),
  mus('braco', MS, 'Músculos do braço', 'Compartimentos anterior e posterior', ['Compartimento anterior do braço', 'Compartimento posterior do braço']),
  mus('antebraco-flexores', MS, 'Antebraço: flexores', 'Compartimento anterior', ['Compartimento anterior do antebraço']),
  mus('antebraco-extensores', MS, 'Antebraço: extensores', 'Compartimento posterior', ['Compartimento posterior do antebraço']),
  mus('mao-musculos', MS, 'Músculos da mão', 'Tenar, hipotenar, lumbricais e interósseos', ['Músculos da mão']),
  ner('plexo-braquial', MS, 'Plexo braquial', 'Troncos, fascículos e nervos terminais', ['Plexo braquial']),
  art('ms-arterias', MS, 'Artérias do membro superior', 'Axilar, braquial, radial, ulnar e arcos', ['Artéria axilar']),
  vei('ms-veias', MS, 'Veias do membro superior', 'Axilar, braquiais e superficiais', ['Veia axilar']),
  oss('ossos-ms', MS, 'Ossos do membro superior', 'Da clavícula às falanges, com o carpo', ['Ossos do membro superior']),
  lig('ligamentos-ombro', MS, 'Ligamentos do ombro', 'Glenoumeral, acromioclavicular e coracoclavicular', 'ombro'),
  lig('ligamentos-cotovelo', MS, 'Ligamentos do cotovelo', 'Colaterais e anular', 'cotovelo'),
  lig('ligamentos-punho', MS, 'Ligamentos do punho e da mão', 'Carpo, metacarpos e dedos', 'punho-mao'),

  mus('mi-musculos', MI, 'Todos os músculos do membro inferior', 'Do quadril ao pé', ['Músculos do membro inferior']),
  mus('quadril', MI, 'Glúteos e iliopsoas', 'Superficiais, profundos e flexores do quadril', ['Músculos glúteos superficiais', 'Músculos glúteos profundos', 'Músculo iliopsoas']),
  mus('coxa-anterior', MI, 'Coxa: anterior e medial', 'Quadríceps, sartório e adutores', ['Compartimento anterior da coxa', 'Compartimento medial da coxa']),
  mus('isquiotibiais', MI, 'Coxa: posterior', 'Isquiotibiais', ['Compartimento posterior da coxa']),
  mus('perna', MI, 'Músculos da perna', 'Compartimentos anterior, lateral e posterior', ['Compartimento anterior da perna', 'Compartimento lateral da perna', 'Compartimento posterior da perna']),
  mus('pe-musculos', MI, 'Músculos do pé', 'Dorso e planta, camada por camada', ['Músculos do pé']),
  ner('plexo-lombossacral', MI, 'Plexo lombossacral', 'Femoral, obturatório, isquiático e ramos', ['Plexo lombossacro']),
  ner('isquiatico', MI, 'Nervo isquiático e ramos', 'Tibial, fibular comum, superficial e profundo', ['Nervo ciático']),
  art('mi-arterias', MI, 'Artérias do membro inferior', 'Femoral, poplítea e tibiais', ['Artéria femoral']),
  vei('mi-veias', MI, 'Veias do membro inferior', 'Femoral, poplítea, safenas e tibiais', ['Veia femoral']),
  oss('ossos-mi', MI, 'Ossos do membro inferior', 'Do quadril aos dedos', ['Ossos do membro inferior']),
  oss('ossos-pe', MI, 'Ossos do pé', 'Tarso, metatarso e falanges', ['Ossos do pé']),
  lig('ligamentos-quadril', MI, 'Ligamentos do quadril e da pelve', 'Iliofemoral, isquiofemoral, sacroilíacos', 'pelve-quadril', false),
  lig('ligamentos-joelho', MI, 'Ligamentos e meniscos do joelho', 'Cruzados, colaterais e meniscos', 'joelho'),
  lig('ligamentos-tornozelo', MI, 'Ligamentos do tornozelo e do pé', 'Lateral, deltoide e mediopé', 'tornozelo-pe'),

  mus('coluna-musculos', COLUNA, 'Músculos da coluna', 'Eretores, transversoespinais, suboccipitais e trapézio', ['Músculos epaxiais', 'Músculos hipaxiais das costas']),
  mus('tronco-musculos', COLUNA, 'Músculos do tórax e do abdome', 'Peitoral, intercostais, oblíquos e reto', ['Músculos do tórax', 'Músculos do abdômen']),
  mus('pelve-musculos', COLUNA, 'Assoalho pélvico', 'Levantador do ânus e coccígeo', ['Músculos da pelve'], false),
  ner('nervos-membros', COLUNA, 'Todos os nervos dos membros', 'Plexos braquial e lombossacral juntos', ['Plexo braquial', 'Plexo lombossacro']),
  art('aorta', COLUNA, 'Aorta e ramos', 'Tronco celíaco, mesentéricas, renais e ilíacas', ['Aorta'], false),
  vei('cavas', COLUNA, 'Veias cavas e ázigos', 'Cava superior, cava inferior e ilíacas', ['Veia cava superior', 'Veia cava inferior (parte torácica)'], false),
  oss('vertebras', COLUNA, 'Vértebras', 'Cervicais, torácicas, lombares, sacro e cóccix', ['Coluna vertebral'], false),
  { id: 'ligamentos-coluna', secao: COLUNA, nome: 'Ligamentos e discos da coluna', resumo: 'Longitudinais, amarelos, interespinais e discos', grupos: ['ligamento'], nos: ['Articulações da coluna vertebral'] },

  mus('pescoco-musculos', CABECA, 'Músculos do pescoço', 'Supra e infra-hióideos, faringe e laringe', ['Músculos do pescoço'], false),
  mus('cabeca-musculos', CABECA, 'Músculos da cabeça', 'Mímica, mastigação e extraoculares', ['Músculos da cabeça'], false),
  ner('nervos-cranianos', CABECA, 'Nervos cranianos', 'Trigêmeo, facial, vago e os demais', ['Nervos cranianos'], false),
  art('carotidas', CABECA, 'Artérias da cabeça e do pescoço', 'Carótidas, vertebrais e seus ramos', ['Artéria carótida comum direita', 'Artéria vertebral'], false),
  vei('jugulares', CABECA, 'Veias da cabeça e do pescoço', 'Jugulares e seios da dura-máter', ['Veia jugular interna', 'Veia craniana'], false),
  oss('cranio', CABECA, 'Ossos do crânio', 'Calota, base e face', ['Crânio'], false),
]

/** Atalhos do Explorar: os grupos que mais fazem sentido com a região aberta (sem região, uma amostra do corpo). */
const TEMAS_DA_REGIAO: Record<string, string[]> = {
  '': ['manguito', 'plexo-braquial', 'mi-musculos', 'ossos-pe'],
  ombro: ['manguito', 'escapuloumerais', 'plexo-braquial', 'ligamentos-ombro'],
  cotovelo: ['braco', 'antebraco-flexores', 'antebraco-extensores', 'ligamentos-cotovelo'],
  'punho-mao': ['mao-musculos', 'ossos-ms', 'ligamentos-punho', 'antebraco-flexores'],
  braco: ['braco', 'plexo-braquial', 'ms-arterias', 'escapuloumerais'],
  antebraco: ['antebraco-flexores', 'antebraco-extensores', 'ms-arterias', 'plexo-braquial'],
  coluna: ['coluna-musculos', 'vertebras', 'ligamentos-coluna', 'nervos-membros'],
  'pelve-quadril': ['quadril', 'plexo-lombossacral', 'ligamentos-quadril', 'pelve-musculos'],
  coxa: ['coxa-anterior', 'isquiotibiais', 'mi-arterias', 'isquiatico'],
  joelho: ['ligamentos-joelho', 'coxa-anterior', 'isquiotibiais', 'mi-arterias'],
  perna: ['perna', 'isquiatico', 'mi-arterias', 'mi-veias'],
  'tornozelo-pe': ['pe-musculos', 'ossos-pe', 'ligamentos-tornozelo', 'perna'],
}
export function temasDaRegiao(regiao?: string | null): TemaEstudo[] {
  const ids = TEMAS_DA_REGIAO[regiao ?? ''] ?? TEMAS_DA_REGIAO['']
  return ids.map((id) => TEMAS_ORTOPEDIA.find((t) => t.id === id)).filter((t): t is TemaEstudo => !!t)
}

/** No Corpo inteiro, cada sistema vira um tema (com as camadas que ele usa). */
export function temasDoCorpo(): TemaEstudo[] {
  return SISTEMAS.filter((s) => s.id !== 'regioes' && s.id !== 'genital')
    .map((s) => ({ id: `sistema-${s.id}`, secao: 'Corpo inteiro', nome: s.nome, resumo: s.resumo, grupos: [], nos: s.nos, cor: s.cor }))
}

const centro = (e: Estrutura) => [(e.b[0] + e.b[3]) / 2, (e.b[1] + e.b[4]) / 2, (e.b[2] + e.b[5]) / 2] as const
const dentro = (caixas: Box3[], e: Estrutura) => { const [x, y, z] = centro(e); return caixas.some((c) => x >= c.min.x && x <= c.max.x && y >= c.min.y && y <= c.max.y && z >= c.min.z && z <= c.max.z) }

/** As estruturas de um tema (ainda sem filtrar por nome em português nem por tamanho). */
export function estruturasDoTema(t: TemaEstudo, estruturas: Estrutura[], idx: IndiceArvore | null, grupoDe: (e: Estrutura) => Grupo): Estrutura[] {
  let lista = estruturas
  if (t.nos) {
    if (!idx) return []
    const sistema = SISTEMAS.find((s) => `sistema-${s.id}` === t.id)
    const ids = new Set(sistema ? idsDoSistema(idx, sistema) : t.nos.flatMap((n) => (idx.porNome.get(n) ?? []).flatMap((no) => idx.ids.get(no) ?? [])))
    lista = lista.filter((e) => ids.has(e.id))
  }
  if (t.grupos.length) lista = lista.filter((e) => t.grupos.includes(grupoDe(e)))
  if (t.regiao) {
    const r = regiaoPorId(t.regiao)
    if (r) { const caixas = caixasDaRegiao(r, t.direito ? 'd' : 'ambos'); lista = lista.filter((e) => dentro(caixas, e)) }
  }
  if (t.direito) lista = lista.filter((e) => e.s !== 'e')
  return lista
}
