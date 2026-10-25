// Prepara os arquivos publicados do Atlas Ortopédico 3D em public/atlas3d/<versão>/.
//
// Fonte: os arquivos do Anatomy Atlas 3D (Grypa-JJ, código MIT; geometria CC BY-SA, ver LICENCAS.md),
// extraídos do pacote oficial da versão 0.1.3 (pasta assets/public/_atlas_v2). Uso:
//   node scripts/atlas3d/preparar_assets.mjs <pasta _atlas_v2 extraída>
//
// O que sai:
//   modelos/<camada>.glb   as 10 camadas Draco, sem alteração (cada nó = id estável da estrutura)
//   draco/                 decodificador Draco do three (mesma versão do pacote npm)
//   estruturas.json        catálogo único: id, camada, lado, nome EN, latim (TA2) e caixa (mm)
//   pontos.json            pontos anatômicos dos ossos (posição em mm, nome EN)
//   LICENCAS.md            atribuição e licenças da geometria e do código de origem
// As caixas vêm do cabeçalho de cada GLB (min/max do atributo POSITION): não é preciso decodificar
// a geometria para saber onde cada estrutura está, e a página usa isso para regiões e enquadramento.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSAO = 'v1'
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const fonte = process.argv[2]
if (!fonte || !existsSync(join(fonte, 'dist', 'bones.glb'))) {
  console.error('uso: node scripts/atlas3d/preparar_assets.mjs <pasta _atlas_v2 com dist/*.glb>')
  process.exit(1)
}
const saida = join(RAIZ, 'public', 'atlas3d', VERSAO)
mkdirSync(join(saida, 'modelos'), { recursive: true })
mkdirSync(join(saida, 'draco'), { recursive: true })

// camada -> [arquivo do catálogo, arquivo GLB]
const CAMADAS = {
  bone: ['bones', 'bones.glb'],
  muscle: ['muscles', 'muscles.glb'],
  connective: ['connective', 'connective.glb'],
  fascia: ['fascia', 'fascia.glb'],
  nerve: ['nerves', 'nerves.glb'],
  vessel: ['vessels', 'vessels.glb'],
  lymph: ['lymph', 'lymph.glb'],
  organ: ['organs', 'organs.glb'],
  brain: ['brain', 'brain.glb'],
  tooth: ['teeth', 'teeth.glb'],
}

function caixasDoGlb(caminho) {
  const b = readFileSync(caminho)
  const tamanho = b.readUInt32LE(12)
  const gltf = JSON.parse(b.subarray(20, 20 + tamanho).toString('utf8'))
  const caixas = new Map()
  for (const no of gltf.nodes) {
    if (no.mesh === undefined || !no.name) continue
    if (no.translation || no.rotation || no.scale || no.matrix) throw new Error(`nó com transformação inesperada: ${no.name}`)
    const prim = gltf.meshes[no.mesh].primitives[0]
    const acc = gltf.accessors[prim.attributes.POSITION]
    caixas.set(no.name, [...acc.min, ...acc.max].map((v) => Math.round(v * 10) / 10))
  }
  return caixas
}

const latim = JSON.parse(readFileSync(join(fonte, 'build_full', 'ta2_latin_lookup_v2.json'), 'utf8'))
const chaveLatim = (en) => (en || '').replace(/^\(|\)$/g, '').trim().toLowerCase()

const estruturas = []
const resumo = {}
for (const [camada, [catalogo, glb]] of Object.entries(CAMADAS)) {
  const lista = JSON.parse(readFileSync(join(fonte, 'dist', `all_${catalogo}_labeled_v2.json`), 'utf8'))
  const caixas = caixasDoGlb(join(fonte, 'dist', glb))
  copyFileSync(join(fonte, 'dist', glb), join(saida, 'modelos', glb))
  let n = 0
  for (const e of lista) {
    const caixa = caixas.get(e.id)
    if (!caixa) continue // estrutura do catálogo sem malha no GLB: o visualizador original também a descarta
    const en = (e.en || '').replace(/^\((.*)\)$/, '$1').trim()
    const item = { id: e.id, k: camada, s: e.side === 'l' ? 'e' : e.side === 'r' ? 'd' : 'm', en, b: caixa }
    const la = latim[chaveLatim(e.en)]
    if (la && la.toLowerCase() !== en.toLowerCase()) item.la = la
    estruturas.push(item)
    n++
  }
  resumo[camada] = { estruturas: n, arquivo: glb, kb: Math.round(readFileSync(join(fonte, 'dist', glb)).length / 1024) }
}
writeFileSync(join(saida, 'estruturas.json'), JSON.stringify({ versao: VERSAO, camadas: resumo, estruturas }))

const pontos = JSON.parse(readFileSync(join(fonte, 'dist', 'bone_landmarks_v2.json'), 'utf8'))
  .map((p) => ({ o: p.boneId, en: (p.en || '').replace(/^\((.*)\)$/, '$1').trim(), p: p.pos.map((v) => Math.round(v * 10) / 10), ...(p.approx ? { a: 1 } : {}) }))
writeFileSync(join(saida, 'pontos.json'), JSON.stringify(pontos))

const three = join(RAIZ, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf')
for (const f of ['draco_decoder.wasm', 'draco_wasm_wrapper.js', 'draco_decoder.js']) copyFileSync(join(three, f), join(saida, 'draco', f))

console.log(`estruturas: ${estruturas.length} · pontos: ${pontos.length}`)
console.log(resumo)
