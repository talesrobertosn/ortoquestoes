// Salão da Biblioteca (30/10/2026): pixel art, segredos e a Sala dos raros.
// Lógica em src/biblioteca/salao/{sprites,segredos,raros}.ts.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-salao-'))
try {
  const carregar = async (arquivo) => {
    const saida = join(pasta, arquivo.replace(/\W/g, '_') + '.mjs')
    // armazenamento.ts lê o localStorage só quando chamado; aqui só as funções puras são usadas.
    await build({ entryPoints: [arquivo], outfile: saida, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env': '{"BASE_URL":"/","DEV":false}' }, logLevel: 'error' })
    return import(pathToFileURL(saida))
  }
  const sp = await carregar('src/biblioteca/salao/sprites.ts')
  const sg = await carregar('src/biblioteca/salao/segredos.ts')
  const { RAROS } = await carregar('src/biblioteca/salao/raros.ts')

  // Cada desenho: linhas da mesma largura e só letras da paleta.
  const pares = [['CORUJA_ACORDADA', 'PALETA_CORUJA'], ['CORUJA_DORMINDO', 'PALETA_CORUJA'], ['GATO_DORMINDO', 'PALETA_GATO'], ['GATO_ORELHA', 'PALETA_GATO'], ['GATO_ACORDADO', 'PALETA_GATO'],
    ['PLANTA', 'PALETA_PLANTA'], ['PLANTA_FLORIDA', 'PALETA_PLANTA'], ['LAMPARINA', 'PALETA_LAMPARINA'], ['LAMPARINA', 'PALETA_LAMPARINA_APAGADA'], ['ABOBORA', 'PALETA_ABOBORA'], ['MORCEGO', 'PALETA_MORCEGO'], ['XICARA', 'PALETA_XICARA']]
  for (const [g, p] of pares) {
    const grade = sp[g], paleta = sp[p]
    assert.equal(new Set(grade.map((l) => l.length)).size, 1, `${g}: linhas de larguras diferentes`)
    for (const l of grade) for (const ch of l) assert.ok(ch === '.' || paleta[ch], `${g}: letra "${ch}" fora de ${p}`)
  }
  assert.equal(sp.sombraPixel(['k.', '.k'], { k: '#000' }, 2), '2px 2px 0 0 #000,4px 4px 0 0 #000')

  // Segredos: ids únicos, palavras mágicas sem acento, épocas e véspera.
  assert.equal(new Set(sg.SEGREDOS.map((s) => s.id)).size, sg.SEGREDOS.length)
  for (const s of sg.SEGREDOS) assert.ok(s.nome && s.pista, s.id)
  assert.equal(sg.palavraMagica('  Garden ')?.segredo, 'garden')
  assert.equal(sg.palavraMagica('CAFÉ')?.segredo, 'cafe')
  assert.equal(sg.palavraMagica('garden fratura'), null)
  for (const p of Object.values(sg.PALAVRAS)) assert.ok(sg.SEGREDOS.some((s) => s.id === p.segredo))
  assert.equal(sg.epoca(new Date(2026, 9, 30)), 'halloween')
  assert.equal(sg.epoca(new Date(2026, 9, 23)), null)
  assert.equal(sg.epoca(new Date(2026, 11, 2)), 'natal')
  assert.equal(sg.madrugada(new Date(2026, 9, 30, 3)), true)
  assert.equal(sg.madrugada(new Date(2026, 9, 30, 5)), false)
  assert.equal(sg.diasAteProva(new Date(2027, 0, 9, 23), ['2027-01-10']), 1)
  assert.equal(sg.diasAteProva(new Date(2027, 0, 10, 8), ['2027-01-10']), 0)
  assert.equal(sg.diasAteProva(new Date(2027, 0, 11), ['2027-01-10']), null)
  assert.deepEqual([0, 14, 15, 39, 40, 79, 80].map(sg.raridade), ['comum', 'comum', 'raro', 'raro', 'epico', 'epico', 'lendario'])

  // Sala dos raros: cada curiosidade aponta para um resumo e uma seção que existem.
  for (const r of RAROS) {
    await access(`public/biblioteca/capitulos/${r.capitulo}.json`)
    const c = JSON.parse(await readFile(`public/biblioteca/capitulos/${r.capitulo}.json`, 'utf8'))
    assert.ok(c.secoes.some((s) => s.id === r.secao), `${r.titulo}: seção ${r.secao} não existe em ${r.capitulo}`)
  }
  console.log(`salão da biblioteca: ${pares.length} desenhos, ${sg.SEGREDOS.length} segredos e ${RAROS.length} raros conferidos`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
