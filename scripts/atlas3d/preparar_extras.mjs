// Acrescenta ao Atlas 3D o que veio direto do Z-Anatomy completo (Startup.blend, CC BY-SA 4.0):
//   modelos/insercoes.glb + insercoes.json  áreas de origem e inserção muscular pintadas sobre o osso
//   modelos/regions.glb + camada "region"   regiões topográficas da superfície (fossa poplítea, região deltóidea…)
//   nomes-ta2.json                          nome em português da Terminologia Anatômica (TA2) para cada estrutura
//   arvore.json                             onde cada estrutura fica na hierarquia do Z-Anatomy (sistema › parte › …)
//   modelos/female.glb + camada "female"   pelve feminina (útero, colo, ovários, tubas) da HuBMAP, se <z>/feminino/female.glb existir
//
// Antes, no Blender 3.6 (fora do git, ver docs/atlas3d/ANDAMENTO.md):
//   blender --background --factory-startup --disable-autoexec Startup.blend --python scripts/atlas3d/blender/inventario.py -- <z>/trabalho/inventario.json
//   blender --background --factory-startup --disable-autoexec Startup.blend --python scripts/atlas3d/blender/exportar_extras.py -- <z>/trabalho/extras
// Uso: node scripts/atlas3d/preparar_extras.mjs <pasta zanatomy>
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SAIDA = join(RAIZ, 'public', 'atlas3d', 'v1')
const z = process.argv[2]
if (!z || !existsSync(join(z, 'trabalho', 'extras', 'insercoes.glb'))) {
  console.error('uso: node scripts/atlas3d/preparar_extras.mjs <pasta zanatomy com trabalho/extras e trabalho/inventario.json>')
  process.exit(1)
}
const ler = (p) => JSON.parse(readFileSync(p, 'utf8'))
const inventario = ler(join(z, 'trabalho', 'inventario.json')).objetos
const porNome = new Map(inventario.map((o) => [o.nome, o]))

// ---------- TA2: inglês/latim → português ----------
const norm = (s) => (s || '').toLowerCase().replace(/[()]/g, ' ').replace(/[’'`]/g, '').replace(/\s+/g, ' ').trim()
const linhas = readFileSync(join(z, 'Models-of-human-anatomy-master', 'TA2.csv'), 'utf8').normalize('NFC').split(/\r?\n/).slice(1).filter(Boolean)
  .map((l) => l.split(';').map((x) => x.replace(/^"|"$/g, '').trim()))
const ta2En = new Map()
const ta2La = new Map()
for (const [, en, la, , , pt] of linhas) {
  if (!pt) continue
  if (!ta2En.has(norm(en))) ta2En.set(norm(en), { pt, la, en })
  if (la && !ta2La.has(norm(la))) ta2La.set(norm(la), { pt, la, en })
}
/** Português da TA2, com o acabamento do site; undefined quando a coluna repete o inglês ou o latim. */
/** Onde a TA2 repete o inglês ou o latim, mas há termo português corrente. */
const MANUAL = {
  'testis': 'Testículo', 'ductus deferens': 'Ducto deferente', 'glans penis': 'Glande do pênis', 'pleura': 'Pleura', 'retina': 'Retina',
  'ureter': 'Ureter', 'fascia lata': 'Fáscia lata', 'linea alba': 'Linha alba', 'cauda equina': 'Cauda equina', 'chorda tympani': 'Corda do tímpano',
  'nervous system & sense organs': 'Sistema nervoso e órgãos dos sentidos', 'palm': 'Palma da mão', 'semimembranosus bursa': 'Bolsa do semimembranáceo',
  'middle genicular artery': 'Artéria média do joelho', 'extensor carpi ulnaris': 'Extensor ulnar do carpo', 'uterine tube': 'Tuba uterina', 'levator ani': 'Levantador do ânus', 'subfacial prepatellar bursa': 'Bolsa pré-patelar subfascial',
}
/** Acabamento: grafia brasileira e erros conhecidos da coluna portuguesa da TA2. */
function polir(pt) {
  // "-óide" perdeu o acento no Acordo de 1990 (deltoide, etmoide, cuboide); "-óideo" continua acentuado
  return pt.normalize('NFC').replace(/Nódulos/g, 'Linfonodos').replace(/Nódulo/g, 'Linfonodo').replace(/nódulos/g, 'linfonodos').replace(/nódulo/g, 'linfonodo')
    .replace(/\bart\. /g, 'articulações ').replace(/\blibre\b/g, 'livre').replace(/^Sistema esqueletico$/, 'Sistema esquelético')
    .replace(/^Sistema digestivo$/, 'Sistema digestório').replace(/óide(?![a-zà-ú])/g, 'oide').replace(/\.$/, '')
}
function ptDe(en, la, camada) {
  if (MANUAL[norm(en)]) return MANUAL[norm(en)]
  const chaves = [en, en.replace(/ muscle$/i, ''), `${en} muscle`, en.replace(/^(right|left) /i, ''), en.replace(/ of (right|left) (hand|foot)$/i, ' of $2'), en.replace(/\*/g, '')]
  let r
  for (const c of chaves) if ((r = ta2En.get(norm(c)))) break
  if (!r && la) r = ta2La.get(norm(la))
  if (!r) return undefined
  let pt = r.pt.replace(/^\((.*)\)$/, '$1').trim()
  const n = norm(pt)
  if (n === norm(en) || n === norm(r.en) || n === norm(r.la) || (la && n === norm(la))) return undefined
  pt = polir(pt)
  // músculos: o site usa o nome sem "Músculo" na frente (a camada já diz o que é)
  if (camada === 'muscle') pt = pt.replace(/^Músculos? /, '')
  return pt.charAt(0).toUpperCase() + pt.slice(1)
}

// ---------- catálogo atual ----------
const catalogo = ler(join(SAIDA, 'estruturas.json'))
catalogo.estruturas = catalogo.estruturas.filter((e) => e.k !== 'region')
delete catalogo.camadas.region
const SUF = { d: '.r', e: '.l', m: '' }
const base = (id) => id.replace(/_[lr]$/, '')
const porEnLado = new Map()
for (const e of catalogo.estruturas) porEnLado.set(`${norm(e.en)}|${e.s}`, e)
const ladoDoNome = (n) => (/\.(?:[a-z]\d*)?l$/.test(n) ? 'e' : /\.(?:[a-z]\d*)?r$/.test(n) ? 'd' : 'm')
const semSufixo = (n) => n.replace(/\.[a-z0-9]+$/, '').replace(/^\((.*)\)$/, '$1').trim()

// ---------- áreas de origem e inserção ----------
const ins = ler(join(z, 'trabalho', 'extras', 'insercoes.json'))
const musculoPorEn = new Map()
for (const e of catalogo.estruturas) if (e.k === 'muscle') musculoPorEn.set(norm(e.en), base(e.id))
const areas = []
let semOsso = 0
for (const a of ins) {
  const m = a.nome.match(/\.(o|e)(\d*)([lr])$/)
  const s = m[3] === 'l' ? 'e' : 'd'
  const nomeMusculo = semSufixo(a.nome).replace(/\.\d+$/, '')
  const k = norm(nomeMusculo)
  const osso = a.pai ? porEnLado.get(`${norm(semSufixo(a.pai))}|${ladoDoNome(a.pai)}`) ?? porEnLado.get(`${norm(semSufixo(a.pai))}|m`) : undefined
  if (!osso) semOsso++
  const item = { id: a.id, k, t: m[1] === 'o' ? 'o' : 'i', s, b: a.b }
  if (m[2]) item.n = Number(m[2])
  const mu = musculoPorEn.get(k) ?? musculoPorEn.get(norm(`${nomeMusculo} muscle`))
  if (mu) item.mu = mu
  if (osso) item.o = osso.id
  // sem malha própria (ex.: "Erector spinae", "Biceps brachii" como um todo): o nome vai na área
  if (!mu) item.nm = ptDe(nomeMusculo, undefined, 'muscle') ?? nomeMusculo
  areas.push(item)
}
copyFileSync(join(z, 'trabalho', 'extras', 'insercoes.glb'), join(SAIDA, 'modelos', 'insercoes.glb'))
writeFileSync(join(SAIDA, 'insercoes.json'), JSON.stringify(areas))

// ---------- regiões do corpo (nova camada) ----------
const regs = ler(join(z, 'trabalho', 'extras', 'regioes.json'))
const vistosReg = new Set()
let nRegioes = 0
const glbReg = readFileSync(join(z, 'trabalho', 'extras', 'regioes.glb'))
// o GLB exportado nomeia os nós reg0000…; o site usa ids legíveis: reescreve os nomes no JSON do GLB
const tam = glbReg.readUInt32LE(12)
const gltf = JSON.parse(glbReg.subarray(20, 20 + tam).toString('utf8'))
const novoNome = new Map()
for (const r of regs) {
  const en = semSufixo(r.nome)
  if (/^regions of human body$/i.test(en)) continue
  const s = ladoDoNome(r.nome)
  let id = `regiao_${en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}${s === 'e' ? '_l' : s === 'd' ? '_r' : ''}`
  if (vistosReg.has(id)) continue
  vistosReg.add(id)
  novoNome.set(r.id, id)
  const ta = ta2En.get(norm(en))
  const item = { id, k: 'region', s, en, b: r.b }
  if (ta?.la && norm(ta.la) !== norm(en)) item.la = ta.la
  catalogo.estruturas.push(item)
  nRegioes++
}
for (const no of gltf.nodes) if (novoNome.has(no.name)) no.name = novoNome.get(no.name); else if (no.mesh !== undefined) delete no.mesh
writeFileSync(join(SAIDA, 'modelos', 'regions.glb'), regravarGlb(glbReg, gltf))
catalogo.camadas.region = { estruturas: nRegioes, arquivo: 'regions.glb', kb: Math.round(readFileSync(join(SAIDA, 'modelos', 'regions.glb')).length / 1024) }

// ---------- pelve feminina (HuBMAP, CC BY 4.0; ver scripts/atlas3d/blender/exportar_feminino.py) ----------
catalogo.estruturas = catalogo.estruturas.filter((e) => e.k !== 'female')
delete catalogo.camadas.female
const FEM = {
  fem_utero: ['Uterus', 'Uterus'], fem_colo_do_utero: ['Cervix of uterus', 'Cervix uteri'],
  fem_ovario_l: ['Ovary', 'Ovarium'], fem_ovario_r: ['Ovary', 'Ovarium'],
  fem_tuba_uterina_l: ['Uterine tube', 'Tuba uterina'], fem_tuba_uterina_r: ['Uterine tube', 'Tuba uterina'],
}
const femJson = join(z, 'feminino', 'female.json')
if (existsSync(femJson)) {
  const fem = ler(femJson)
  for (const p of fem.pecas) {
    const [en, la] = FEM[p.id]
    catalogo.estruturas.push({ id: p.id, k: 'female', s: p.id.endsWith('_l') ? 'e' : p.id.endsWith('_r') ? 'd' : 'm', en, la, b: p.b })
  }
  copyFileSync(join(z, 'feminino', 'female.glb'), join(SAIDA, 'modelos', 'female.glb'))
  catalogo.camadas.female = { estruturas: fem.pecas.length, arquivo: 'female.glb', kb: Math.round(readFileSync(join(SAIDA, 'modelos', 'female.glb')).length / 1024) }
}
writeFileSync(join(SAIDA, 'estruturas.json'), JSON.stringify(catalogo))

// ---------- nomes em português (TA2) ----------
const nomes = {}
let comNome = 0
for (const e of catalogo.estruturas) {
  const pt = ptDe(e.en, e.la, e.k)
  if (pt) { nomes[base(e.id)] = pt; comNome++ }
}
writeFileSync(join(SAIDA, 'nomes-ta2.json'), JSON.stringify(nomes))

// ---------- árvore: sistema › parte › … (pais no Z-Anatomy) ----------
const nos = []
const indiceNo = new Map()
function no(nome) {
  if (indiceNo.has(nome)) return indiceNo.get(nome)
  const o = porNome.get(nome)
  let pai = o?.pai ? no(o.pai) : -1
  const en = semSufixo(nome)
  const pt = polir(ptDe(en, undefined, '') ?? en)
  // "Região posterior do joelho" (lado) › "Região posterior do joelho" (grupo): um só degrau
  if (pai >= 0 && nos[pai][0] === pt) { indiceNo.set(nome, pai); return pai }
  const i = nos.length
  nos.push(pai >= 0 ? [pt, pai] : [pt])
  indiceNo.set(nome, i)
  return i
}
// por id (com lado): a veia axilar direita sai da subclávia direita, não da esquerda
const arvore = {}
let comArvore = 0
for (const e of catalogo.estruturas) {
  const candidatos = [`${e.en}${SUF[e.s]}`, e.en, `${e.en}.r`, `${e.en}.l`, `(${e.en})${SUF[e.s]}`, `(${e.en})`, `${e.en}*${SUF[e.s]}`]
  const o = candidatos.map((c) => porNome.get(c)).find(Boolean)
  if (!o?.pai) continue
  arvore[e.id] = no(o.pai)
  comArvore++
}
// a pelve feminina não vem do Z-Anatomy: entra na mesma árvore, em "Sistemas viscerais"
const visc = nos.findIndex((n) => n[0] === 'Sistemas viscerais')
if (visc >= 0) {
  const gen = nos.length
  nos.push(['Órgãos genitais femininos internos', visc])
  for (const e of catalogo.estruturas) if (e.k === 'female') arvore[e.id] = gen
}
writeFileSync(join(SAIDA, 'arvore.json'), JSON.stringify({ n: nos, e: arvore }))

console.log(`áreas: ${areas.length} (sem osso: ${semOsso}, ligadas a músculo do modelo: ${areas.filter((a) => a.mu).length})`)
console.log(`regiões: ${nRegioes} · nomes TA2: ${comNome}/${catalogo.estruturas.length} · na árvore: ${comArvore} (${nos.length} nós)`)

/** Regrava um GLB com o JSON alterado (o bloco binário não muda). */
function regravarGlb(original, json) {
  const tamJson = original.readUInt32LE(12)
  const binario = original.subarray(20 + tamJson)
  let texto = Buffer.from(JSON.stringify(json), 'utf8')
  const sobra = (4 - (texto.length % 4)) % 4
  texto = Buffer.concat([texto, Buffer.alloc(sobra, 0x20)])
  const cab = Buffer.alloc(12)
  cab.writeUInt32LE(0x46546c67, 0)
  cab.writeUInt32LE(2, 4)
  cab.writeUInt32LE(12 + 8 + texto.length + binario.length, 8)
  const blocoJson = Buffer.alloc(8)
  blocoJson.writeUInt32LE(texto.length, 0)
  blocoJson.writeUInt32LE(0x4e4f534a, 4)
  return Buffer.concat([cab, blocoJson, texto, binario])
}
