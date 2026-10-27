// Filtro por assunto da Biblioteca de flashcards (27/10/2026): Área > Grupo > Assunto, com o acervo real.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-filtro-'))
try {
  const arquivo = join(pasta, 'f.mjs')
  await build({ stdin: { contents: "export * from './src/flashcards/biblioteca/filtroAssunto'; export * from './src/dados/gruposAssuntos'", resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const taxonomia = JSON.parse(await readFile('src/dados/taxonomia.json', 'utf8'))
  const indice = JSON.parse(await readFile('public/flashcards/indice.json', 'utf8'))
  const cartas = (await Promise.all(Object.values(indice.areas).map(async (a) => JSON.parse(await readFile(`public/flashcards/${a.arquivo}`, 'utf8')).flashcards))).flat()
  const nomes = Object.fromEntries(Object.entries(indice.areas).map(([id, a]) => [id, a.nome]))

  // 1. a tabela de grupos cobre a taxonomia inteira, cada assunto em exatamente um grupo, sem inventar assunto
  for (const tema of taxonomia.temas) {
    const grupos = m.GRUPOS_ASSUNTOS[tema.slug]
    assert.ok(grupos?.length, `área sem grupos: ${tema.slug}`)
    const listados = grupos.flatMap((g) => g.assuntos)
    assert.equal(new Set(listados).size, listados.length, `${tema.slug}: assunto em dois grupos`)
    assert.deepEqual([...listados].sort(), [...tema.subtemas].sort(), `${tema.slug}: grupos diferentes da taxonomia`)
    assert.equal(new Set(grupos.map((g) => g.id)).size, grupos.length, `${tema.slug}: id de grupo repetido`)
  }

  // 2. nenhum flashcard se perde: todo flashcard está na área e em pelo menos um grupo
  const arvore = m.arvoreFlashcards(cartas, nomes)
  assert.equal(arvore.reduce((s, a) => s + a.total, 0), cartas.length, 'flashcard fora da árvore')
  for (const c of cartas) assert.ok(m.gruposDaCarta(c).length > 0)

  // 3. as quantidades da árvore são exatamente as do filtro (área, grupo e assunto)
  const conta = (f) => cartas.filter((c) => m.casaFiltro(c, f)).length
  for (const area of arvore) {
    assert.equal(conta({ area: area.id, grupo: null, assuntos: [] }), area.total, `área ${area.id}`)
    for (const g of area.grupos) {
      assert.equal(conta({ area: area.id, grupo: g.id, assuntos: [] }), g.total, `grupo ${area.id}/${g.id}`)
      for (const s of g.assuntos) assert.equal(conta({ area: area.id, grupo: g.id, assuntos: [s.nome] }), s.total, `assunto ${s.nome}`)
    }
  }

  // 4. exclusividade: o recorte só traz flashcards daquele assunto, e um assunto de pediatria não puxa o de trauma
  const ped = arvore.find((a) => a.id === 'pediatria')
  const fraturas = ped.grupos.find((g) => g.id === 'fraturas')
  const femur = fraturas.assuntos.find((s) => s.nome === 'Fraturas do fêmur e da perna na criança')
  assert.ok(femur.total > 0, 'sem flashcard de fêmur na criança')
  const recorte = cartas.filter((c) => m.casaFiltro(c, { area: 'pediatria', grupo: 'fraturas', assuntos: [femur.nome] }))
  assert.ok(recorte.every((c) => c.areaId === 'pediatria' && m.assuntosDaCarta(c).includes(femur.nome)))
  assert.ok(!recorte.some((c) => c.areaId === 'trauma'))
  assert.ok(conta({ area: 'pediatria', grupo: 'fraturas', assuntos: [] }) >= recorte.length)
  // dois assuntos somam (sem repetir o flashcard que tem os dois)
  const dois = ['Lesões fisárias', 'Fraturas supracondilianas do úmero']
  assert.equal(conta({ area: 'pediatria', grupo: 'fraturas', assuntos: dois }), cartas.filter((c) => c.areaId === 'pediatria' && m.assuntosDaCarta(c).some((a) => dois.includes(a))).length)

  // 5. assunto sem flashcard aparece com zero (a pessoa vê que existe) e o filtro dele fica vazio
  const vazio = arvore.flatMap((a) => a.grupos.flatMap((g) => g.assuntos.map((s) => ({ a, g, s })))).find((x) => x.s.total === 0)
  assert.ok(vazio, 'esperava ao menos um assunto ainda sem flashcard')
  assert.equal(conta({ area: vazio.a.id, grupo: vazio.g.id, assuntos: [vazio.s.nome] }), 0)

  // 6. normalizar: tira o que não existe e acerta o grupo do assunto escolhido sozinho
  assert.deepEqual(m.normalizarFiltro({ area: 'nada' }, arvore), m.FILTRO_VAZIO)
  assert.deepEqual(m.normalizarFiltro({ area: 'pediatria', grupo: 'inexistente', assuntos: ['Lesões fisárias', 'Assunto falso'] }, arvore), { area: 'pediatria', grupo: 'fraturas', assuntos: ['Lesões fisárias'] })
  // trocar de grupo descarta assunto que não é dele
  assert.deepEqual(m.normalizarFiltro({ area: 'pediatria', grupo: 'quadril', assuntos: ['Lesões fisárias'] }, arvore).assuntos, [])
  // área de um grupo só pula o nível do grupo
  assert.equal(m.temGrupos(arvore.find((a) => a.id === 'osteometabolicas')), false)
  assert.equal(m.temGrupos(ped), true)

  // 7. busca sem acento, assunto antes de grupo e de área
  const r = m.buscarAssunto(arvore, 'femur')
  assert.ok(r.some((x) => x.nome === 'Fraturas do fêmur e da perna na criança' && x.filtro.area === 'pediatria'))
  assert.equal(r[0].nivel, 'assunto')
  assert.deepEqual(m.buscarAssunto(arvore, 'f'), [], 'uma letra só não busca')
  assert.ok(m.buscarAssunto(arvore, 'fraturas e trauma').some((x) => x.nivel === 'grupo' && x.filtro.grupo === 'fraturas'))

  // 8. endereço: ida e volta
  const f = { area: 'pediatria', grupo: 'fraturas', assuntos: ['Lesões fisárias'] }
  assert.deepEqual(m.normalizarFiltro(m.filtroDaConsulta(m.consultaDoFiltro(f)), arvore), f)
  assert.deepEqual(m.caminhoDoFiltro(f, arvore), [ped.nome, 'Fraturas e trauma na criança', 'Lesões fisárias'])

  // 9. os filtros de tipo/dificuldade entram na contagem
  const soImagem = m.arvoreFlashcards(cartas, nomes, (c) => c.tipo === 'Imagem')
  assert.equal(soImagem.reduce((s, a) => s + a.total, 0), cartas.filter((c) => c.tipo === 'Imagem').length)

  console.log(`Filtro por assunto dos flashcards: taxonomia coberta, ${cartas.length} flashcards sem perda, contagens, exclusividade, vazio, busca e endereço: OK`)
} finally { await rm(pasta, { recursive: true, force: true }) }
