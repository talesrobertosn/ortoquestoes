import type { Estrutura, Faixa } from '../tipos'

/**
 * Nomes em português (Terminologia Anatômica em português). Sem tradução automática:
 * cada entrada foi escrita à mão. Estrutura sem entrada mostra o nome em inglês do
 * catálogo e, quando houver, o latino (TA2). Ver docs/atlas3d/NOMES.md.
 */
const OSSOS: Record<string, string> = {
  anterior_cells_of_ethmoid_bone: 'Células etmoidais anteriores', middle_cells_of_ethmoid_bone: 'Células etmoidais médias',
  posterior_cells_of_ethmoid_bone: 'Células etmoidais posteriores', atlas_c1: 'Atlas (C1)', axis_c2: 'Áxis (C2)',
  body_of_sternum: 'Corpo do esterno', manubrium_of_sternum: 'Manúbrio do esterno', xiphoid_process: 'Processo xifoide',
  calcaneus: 'Calcâneo', talus: 'Tálus', navicular_bone: 'Navicular', cuboid_bone: 'Cuboide',
  medial_cuneiform_bone: 'Cuneiforme medial', intermediate_cuneiform_bone: 'Cuneiforme intermédio', lateral_cuneiform_bone: 'Cuneiforme lateral',
  sesamoid_bones_of_foot: 'Sesamoides do pé', capitate_bone: 'Capitato', hamate_bone: 'Hamato', lunate_bone: 'Semilunar',
  pisiform_bone: 'Pisiforme', scaphoid_bone: 'Escafoide', trapezium_bone: 'Trapézio', trapezoid_bone: 'Trapezoide', triquetrum_bone: 'Piramidal',
  clavicle: 'Clavícula', scapula: 'Escápula', humerus: 'Úmero', radius: 'Rádio', ulna: 'Ulna',
  hip_bone: 'Osso do quadril', sacrum: 'Sacro', coccyx: 'Cóccix', femur: 'Fêmur', patella: 'Patela', tibia: 'Tíbia', fibula: 'Fíbula',
  ethmoid_bone: 'Etmoide', frontal_bone: 'Frontal', occipital_bone: 'Occipital', parietal_bone: 'Parietal', temporal_bone: 'Temporal',
  sphenoid_bone: 'Esfenoide', sinus_of_frontal_bone: 'Seio frontal', sinus_of_sphenoid_bone: 'Seio esfenoidal', nasal_bone: 'Nasal',
  lacrimal_bone: 'Lacrimal', palatine_bone: 'Palatino', inferior_nasal_concha_bone: 'Concha nasal inferior', vomer: 'Vômer',
  zygomatic_bone: 'Zigomático', maxilla: 'Maxila', mandible: 'Mandíbula', hyoid_bone: 'Hioide', malleus: 'Martelo', incus: 'Bigorna', stapes: 'Estribo',
}
const ORDINAL: Record<string, string> = { first: '1º', second: '2º', third: '3º', fourth: '4º', fifth: '5º', sixth: '6º', seventh: '7º', eighth: '8º', ninth: '9º', tenth: '10º', eleventh: '11º', twelfth: '12º' }
const DEDO_MAO: Record<string, string> = { first: 'do polegar', second: 'do indicador', third: 'do dedo médio', fourth: 'do anular', fifth: 'do dedo mínimo' }
const DEDO_PE: Record<string, string> = { first: 'do hálux', second: 'do 2º dedo do pé', third: 'do 3º dedo do pé', fourth: 'do 4º dedo do pé', fifth: 'do 5º dedo do pé' }
const FALANGE: Record<string, string> = { proximal: 'Falange proximal', middle: 'Falange média', distal: 'Falange distal' }

function osso(base: string): string | undefined {
  if (OSSOS[base]) return OSSOS[base]
  let m = base.match(/^(proximal|middle|distal)_phalanx_of_(\w+?)_finger_of_(hand|foot)$/)
  if (m) return `${FALANGE[m[1]]} ${(m[3] === 'hand' ? DEDO_MAO : DEDO_PE)[m[2]]}`
  m = base.match(/^(\w+?)_(metacarpal|metatarsal)_bone$/)
  if (m) return `${ORDINAL[m[1]]} ${m[2] === 'metacarpal' ? 'metacarpo' : 'metatarso'}`
  m = base.match(/^(\w+?)_rib$/)
  if (m) return `${ORDINAL[m[1]].replace('º', 'ª')} costela`
  m = base.match(/^vertebra_([ctl])(\d+)$/)
  if (m) return `Vértebra ${m[1].toUpperCase()}${m[2]}`
  return undefined
}

export function baseDoId(id: string) { return id.replace(/_[lr]$/, '') }

/** Nome principal em português, ou o inglês do catálogo quando ainda não há tradução revisada. */
export function nomeDe(e: Estrutura): string {
  const base = baseDoId(e.id)
  return (e.k === 'bone' ? osso(base) : EXTRAS[base]) ?? e.en
}
export function temNomePt(e: Estrutura) { const base = baseDoId(e.id); return !!(e.k === 'bone' ? osso(base) : EXTRAS[base]) }

export const LADO: Record<string, string> = { e: 'esquerdo', d: 'direito', m: '' }

/** Estruturas não ósseas com nome revisado (cresce aos poucos; ver docs/atlas3d/NOMES.md). */
const EXTRAS: Record<string, string> = {}
export function registrarNomes(nomes: Record<string, string>) { Object.assign(EXTRAS, nomes) }

/** Nome com a parte do osso longo: "Fêmur proximal", "Diáfise da tíbia", "Rádio distal". */
export function nomeCompleto(e: Estrutura, faixa?: Faixa) {
  const nome = nomeDe(e)
  if (!faixa) return nome
  if (faixa === 'diafise') return `Diáfise ${/a$/.test(nome) ? 'da' : 'do'} ${nome.toLowerCase()}`
  return `${nome} ${faixa}`
}

export const SINGULAR: Record<string, string> = {
  osso: 'Osso', musculo: 'Músculo', ligamento: 'Ligamento ou cápsula', nervo: 'Nervo', arteria: 'Artéria', veia: 'Veia',
  fascia: 'Fáscia ou bolsa', linfatico: 'Linfático', orgao: 'Órgão', encefalo: 'Encéfalo', dente: 'Dente',
}
