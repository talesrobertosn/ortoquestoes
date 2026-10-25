import type { Camada, Estrutura, Grupo } from './tipos'

export const VERSAO_ASSETS = 'v1'
export const BASE_ASSETS = `${import.meta.env.BASE_URL}atlas3d/${VERSAO_ASSETS}/`

export interface DefGrupo {
  rotulo: string
  camada: Camada
  cor: number
  /** opacidade de partida (fáscias são lâminas finas e começam translúcidas) */
  opacidade: number
  /** deslocamento de profundidade por camada: decide empates quando duas superfícies se tocam */
  deslocamento: number
  /** fora do foco ortopédico: fica no fim da lista, recolhido */
  secundario?: boolean
}

/** Ordem = ordem na tela. As cores seguem o padrão dos atlas, um pouco dessaturadas para conversar com o site. */
export const GRUPOS: Record<Grupo, DefGrupo> = {
  osso: { rotulo: 'Ossos', camada: 'bone', cor: 0xe8dcc6, opacidade: 1, deslocamento: -1.5 },
  musculo: { rotulo: 'Músculos', camada: 'muscle', cor: 0xa9413f, opacidade: 1, deslocamento: -0.6 },
  ligamento: { rotulo: 'Ligamentos e cápsulas', camada: 'connective', cor: 0xcfc59a, opacidade: 1, deslocamento: -1.0 },
  nervo: { rotulo: 'Nervos', camada: 'nerve', cor: 0xe9bf3c, opacidade: 1, deslocamento: -1.4 },
  arteria: { rotulo: 'Artérias', camada: 'vessel', cor: 0xc23b30, opacidade: 1, deslocamento: -1.3 },
  veia: { rotulo: 'Veias', camada: 'vessel', cor: 0x3561b0, opacidade: 1, deslocamento: -1.3 },
  fascia: { rotulo: 'Fáscias e bolsas', camada: 'fascia', cor: 0xe6dfcc, opacidade: 0.4, deslocamento: -0.9 },
  linfatico: { rotulo: 'Linfáticos', camada: 'lymph', cor: 0x5cb88a, opacidade: 1, deslocamento: -1.2, secundario: true },
  orgao: { rotulo: 'Órgãos', camada: 'organ', cor: 0xb97a5c, opacidade: 1, deslocamento: -0.8, secundario: true },
  encefalo: { rotulo: 'Encéfalo', camada: 'brain', cor: 0xd5a2a8, opacidade: 1, deslocamento: -0.7, secundario: true },
  dente: { rotulo: 'Dentes', camada: 'tooth', cor: 0xf0ead6, opacidade: 1, deslocamento: -1.1, secundario: true },
}
export const ORDEM_GRUPOS = Object.keys(GRUPOS) as Grupo[]

const VEIA = /\bveins?\b|\bvena\b|venous|\bsinus\b|venae/i
export function grupoDe(e: Estrutura): Grupo {
  switch (e.k) {
    case 'bone': return 'osso'
    case 'muscle': return 'musculo'
    case 'connective': return 'ligamento'
    case 'fascia': return 'fascia'
    case 'nerve': return 'nervo'
    case 'vessel': return VEIA.test(e.en) ? 'veia' : 'arteria'
    case 'lymph': return 'linfatico'
    case 'organ': return 'orgao'
    case 'brain': return 'encefalo'
    case 'tooth': return 'dente'
  }
}

/** Músculos coloridos por região (ajuda a separar grupos vizinhos), a partir do nome em inglês. */
const REGIOES_MUSCULO: [RegExp, number][] = [
  [/deltoid|supraspinatus|infraspinatus|teres|subscapularis|biceps brachii|triceps brachii|brachialis|coracobrachialis/i, 0xb24a3c],
  [/extensor carpi|flexor carpi|pronator|supinator|palmaris|flexor digitorum superficialis|flexor digitorum profundus|extensor digitorum(?! longus| brevis)|digiti minimi.*hand|brachioradialis|anconeus|opponens|pollicis|interossei.*hand|lumbrical.*hand|of (right|left) hand|extensor indicis/i, 0xc05a3c],
  [/gluteus|piriformis|obturator|quadratus femoris|psoas|iliacus|sartorius|rectus femoris|vastus|adductor (longus|brevis|magnus|minimus)|gracilis|biceps femoris|semitendinosus|semimembranosus|tensor fasciae latae|pectineus|gemellus/i, 0x9a3b3a],
  [/gastrocnemius|soleus|tibialis|peroneus|fibularis|hallucis|digitorum longus|digitorum brevis|popliteus|plantaris|interossei.*foot|lumbrical.*foot|of (right|left) foot|quadratus plantae/i, 0xac4644],
  [/latissimus|trapezius|rhomboid|erector|multifidus|quadratus lumborum|serratus posterior|spinalis|longissimus|iliocostalis|levator scapulae|semispinalis|splenius/i, 0x8f3450],
]
export function corDe(e: Estrutura, grupo: Grupo): number {
  if (grupo === 'musculo') for (const [re, cor] of REGIOES_MUSCULO) if (re.test(e.en)) return cor
  return GRUPOS[grupo].cor
}
