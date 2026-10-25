import type { Estrutura } from '../tipos'
import { nomeDe } from './nomes'

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Sinônimos e abreviações de quem busca → termo em inglês do catálogo. Só o que é
 * equivalente de fato; termos sem tradução revisada continuam achados pelo inglês e pelo latim.
 */
const SINONIMOS: [RegExp, string][] = [
  [/\bnervo\b/, 'nerve'], [/\bmusculo\b/, 'muscle'], [/\barteria\b/, 'artery'], [/\bveia\b/, 'vein'], [/\bligamento\b/, 'ligament'],
  [/\bfibular comum\b|\bciatico popliteo externo\b/, 'common fibular nerve'], [/\bciatico\b/, 'sciatic'], [/\bfemoral\b/, 'femoral'],
  [/\bulnar\b/, 'ulnar'], [/\bmediano\b/, 'median'], [/\bradial\b/, 'radial'], [/\baxilar\b/, 'axillary'], [/\bmusculocutaneo\b/, 'musculocutaneous'],
  [/\btibial\b/, 'tibial'], [/\bobturatorio\b/, 'obturator'], [/\bsupraescapular\b/, 'suprascapular'], [/\binterosseo posterior\b/, 'posterior interosseous'],
  [/\binterosseo anterior\b/, 'anterior interosseous'], [/\bpoplitea\b/, 'popliteal'], [/\bbraquial\b/, 'brachial'], [/\bcircunflexa\b/, 'circumflex'],
  [/\blca\b|\bcruzado anterior\b/, 'anterior cruciate'], [/\blcp\b|\bcruzado posterior\b/, 'posterior cruciate'], [/\blcm\b|\bcolateral medial\b/, 'medial collateral'],
  [/\blcl\b|\bcolateral lateral\b/, 'lateral collateral'], [/\bmenisco\b/, 'meniscus'], [/\bdeltoide\b/, 'deltoid'], [/\bmanguito\b/, 'rotator'],
  [/\bsupraespinal\b|\bsupraespinhoso\b/, 'supraspinatus'], [/\binfraespinal\b|\binfraespinhoso\b/, 'infraspinatus'], [/\bsubescapular\b/, 'subscapularis'],
  [/\bredondo menor\b/, 'teres minor'], [/\bredondo maior\b/, 'teres major'], [/\bbiceps\b/, 'biceps'], [/\btriceps\b/, 'triceps'], [/\bquadriceps\b/, 'quadriceps'],
  [/\bgluteo\b/, 'gluteus'], [/\bpiriforme\b/, 'piriformis'], [/\bpsoas\b/, 'psoas'], [/\bsartorio\b/, 'sartorius'], [/\bgracil\b/, 'gracilis'],
  [/\bgastrocnemio\b/, 'gastrocnemius'], [/\bsoleo\b/, 'soleus'], [/\btendao calcaneo\b|\baquiles\b/, 'calcaneal tendon'], [/\bplantar\b/, 'plantar'],
  [/\bfalange\b/, 'phalanx'], [/\bmetacarpo\b/, 'metacarpal'], [/\bmetatarso\b/, 'metatarsal'], [/\bvertebra\b/, 'vertebra'], [/\bcostela\b/, 'rib'],
]

/** Busca por português (nome revisado), inglês, latim e sinônimos; mais relevante primeiro. */
export function buscar(estruturas: Estrutura[], consulta: string, limite = 30): Estrutura[] {
  const q = normal(consulta.trim())
  if (q.length < 2) return []
  const traduzida = SINONIMOS.reduce((acc, [re, en]) => acc.replace(re, en), q)
  const termos = [...new Set([q, traduzida])]
  const pontuadas: { e: Estrutura; p: number }[] = []
  const vistos = new Set<string>()
  for (const e of estruturas) {
    const pt = normal(nomeDe(e))
    const campos = [pt, normal(e.en), normal(e.la ?? ''), e.id.replace(/_/g, ' ')]
    let p = 0
    for (const t of termos) {
      for (const [i, c] of campos.entries()) {
        if (!c) continue
        if (c === t) p = Math.max(p, 100 - i)
        else if (c.startsWith(t)) p = Math.max(p, 80 - i)
        else if (c.includes(' ' + t) || c.includes(t)) p = Math.max(p, 50 - i)
        else if (t.split(' ').every((w) => c.includes(w))) p = Math.max(p, 30 - i)
      }
    }
    if (!p) continue
    // um nome por estrutura bilateral (o lado aparece no resultado e é escolhido depois)
    const chave = `${pt}|${e.s}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    pontuadas.push({ e, p: p + (e.k === 'bone' ? 3 : 0) })
  }
  return pontuadas.sort((a, b) => b.p - a.p || nomeDe(a.e).localeCompare(nomeDe(b.e))).slice(0, limite).map((x) => x.e)
}
