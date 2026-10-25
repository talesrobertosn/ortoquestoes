// Liga as fichas do Atlas 3D (src/atlas3d/dados/fichas.json) às questões do acervo.
//   lesões:   questões dos subtemas de fratura e lesão listados na ficha
//   anatomia: questões dos subtemas de anatomia da ficha que citam um dos termos no enunciado ou nas alternativas
// Saída: public/atlas3d/v1/questoes.json  {chave: {l: [ids], a: [ids]}}
// Rodar depois de importar questões novas: node scripts/atlas3d/vincular_questoes.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const fichas = JSON.parse(readFileSync(join(RAIZ, 'src/atlas3d/dados/fichas.json'), 'utf8'))
const pasta = join(RAIZ, 'public/acervo/temas')
const questoes = []
for (const f of readdirSync(pasta).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(join(pasta, f), 'utf8'))
  for (const q of Array.isArray(d) ? d : d.questoes) if (!q.anulada) questoes.push(q)
}
const normal = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const subtemasExistentes = new Set(questoes.flatMap((q) => q.subtemas || []))
const textoDe = new Map(questoes.map((q) => [q.id, ' ' + normal([q.enunciado, ...(q.alternativas || []).map((a) => a.texto)].join(' ')) + ' ']))

const saida = {}
const avisos = []
for (const f of fichas) {
  for (const s of [...f.lesoes, ...f.anatomia.subtemas]) if (!subtemasExistentes.has(s)) avisos.push(`${f.chave}: subtema inexistente "${s}"`)
  const lesoes = new Set(f.lesoes)
  const anat = new Set(f.anatomia.subtemas)
  // termo curto (até 3 letras) só como palavra inteira; os demais também pegam o começo de palavra (trocanter → trocantérica)
  const termos = f.anatomia.termos.map((t) => {
    const e = normal(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(e.length <= 3 ? `[^a-z0-9]${e}[^a-z0-9]` : `[^a-z0-9]${e}`)
  })
  const l = questoes.filter((q) => (q.subtemas || []).some((s) => lesoes.has(s))).map((q) => q.id)
  const a = questoes.filter((q) => (q.subtemas || []).some((s) => anat.has(s)) && termos.some((re) => re.test(textoDe.get(q.id)))).map((q) => q.id)
  saida[f.chave] = { l, a }
}
writeFileSync(join(RAIZ, 'public/atlas3d/v1/questoes.json'), JSON.stringify(saida))
for (const [k, v] of Object.entries(saida)) console.log(k.padEnd(18), 'lesões', String(v.l.length).padStart(4), '· anatomia', String(v.a.length).padStart(4))
if (avisos.length) console.log('\n' + avisos.join('\n'))
