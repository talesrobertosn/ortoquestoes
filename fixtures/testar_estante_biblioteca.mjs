// Vitrine da Biblioteca (redesenho de 27/10/2026): livro de cada resumo, ordem dos capítulos, filtros no
// endereço e o próximo capítulo publicado. A lógica está em src/biblioteca/estante.ts.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-estante-'))
try {
  const saida = join(pasta, 'estante.mjs')
  await build({ entryPoints: ['src/biblioteca/estante.ts'], outfile: saida, bundle: true, platform: 'node', format: 'esm' })
  const m = await import(pathToFileURL(saida))
  const { capitulos } = JSON.parse(await readFile('public/biblioteca/indice.json', 'utf8'))
  const cap = (id) => capitulos.find((c) => c.id === id)

  // Livro: "(2025)" não separa edições; nomes curtos.
  assert.equal(m.chaveLivro({ livro: 'X', edicao: '9ª edição (2020)' }), m.chaveLivro({ livro: 'X', edicao: '9ª edição' }))
  assert.equal(m.rotuloLivro({ livro: "Rockwood and Wilkins' Fractures in Children", edicao: '10ª edição (2025)' }), 'Rockwood infantil · 10ª ed.')
  assert.equal(m.rotuloLivro({ livro: "Rockwood and Green's Fractures in Adults", edicao: '10ª edição (2025)' }), 'Rockwood adulto · 10ª ed.')
  assert.equal(m.numeroCapitulo({ capitulo: 'Capítulo 19 · Shoulder' }), 19)
  assert.equal(m.numeroCapitulo({ capitulo: 'Sem número' }), Number.MAX_SAFE_INTEGER)

  // Estante: cada resumo em exatamente um livro, capítulos em ordem crescente; a edição nova antes da antiga.
  const livros = m.livrosDaEstante(capitulos)
  assert.equal(livros.reduce((n, l) => n + l.capitulos.length, 0), capitulos.length)
  for (const l of livros) {
    const ns = l.capitulos.map(m.numeroCapitulo)
    assert.deepEqual(ns, [...ns].sort((a, b) => a - b), `capítulos fora de ordem em ${l.rotulo}`)
  }
  assert.ok(livros.some((l) => l.rotulo === 'Rockwood infantil · 10ª ed.'))
  // Edição nova antes da antiga, com capítulos sintéticos (os resumos reais da 9ª edição foram atualizados para a 10ª).
  const base = cap('rockwoodcriancas10-19-ombro-umero')
  const edicoes = m.livrosDaEstante([{ ...base, id: 'nove', edicao: '9ª edição' }, { ...base, id: 'dez', edicao: '10ª edição (2025)' }]).map((l) => l.rotulo)
  assert.deepEqual(edicoes, ['Rockwood infantil · 10ª ed.', 'Rockwood infantil · 9ª ed.'])

  // Estado de leitura.
  assert.equal(m.estadoLeitura(undefined), 'novo')
  assert.equal(m.estadoLeitura({ em: 5 }), 'andamento')
  assert.equal(m.estadoLeitura({ em: 5, concluidoEm: 9 }), 'concluido')

  // Filtros: livro, área, progresso, busca (inclusive nos títulos das partes) e ordem.
  const leituras = { 'rockwoodcriancas10-19-ombro-umero': { em: 30, progresso: 40 }, 'rockwood10-65-tornozelo': { em: 50, progresso: 100, concluidoEm: 60 } }
  const f = (x) => m.filtrarEstante(capitulos, { ...m.FILTROS_PADRAO, ...x }, leituras)
  const chaveInfantil10 = m.chaveLivro(cap('rockwoodcriancas10-19-ombro-umero'))
  assert.ok(f({ livro: chaveInfantil10 }).every((c) => m.chaveLivro(c) === chaveInfantil10))
  assert.ok(f({ area: 'mao' }).every((c) => c.especialidade === 'mao'))
  assert.deepEqual(f({ progresso: 'andamento' }).map((c) => c.id), ['rockwoodcriancas10-19-ombro-umero'])
  assert.deepEqual(f({ progresso: 'concluido' }).map((c) => c.id), ['rockwood10-65-tornozelo'])
  assert.equal(f({ progresso: 'novo' }).length, capitulos.length - 2)
  assert.ok(f({ q: 'umero proximal' }).some((c) => c.id === 'rockwoodcriancas10-19-ombro-umero'), 'busca sem acento')
  assert.equal(f({ q: 'zzzz-nada' }).length, 0)
  assert.deepEqual(f({ ordem: 'recentes' }).slice(0, 2).map((c) => c.id), ['rockwood10-65-tornozelo', 'rockwoodcriancas10-19-ombro-umero'])
  const cobrados = f({ ordem: 'cobrados' }).map((c) => c.questoes.length)
  assert.deepEqual(cobrados, [...cobrados].sort((a, b) => b - a))
  assert.equal(m.filtrosAtivos(m.FILTROS_PADRAO), false)
  assert.equal(m.filtrosAtivos({ ...m.FILTROS_PADRAO, ordem: 'titulo' }), false, 'ordenar não conta como filtro')

  // Endereço: ida e volta; valores estranhos voltam ao padrão.
  const ida = { q: 'colo', livro: chaveInfantil10, area: 'pediatria', progresso: 'andamento', ordem: 'cobrados' }
  assert.deepEqual(m.filtrosDaConsulta(new URLSearchParams(m.consultaDosFiltros(ida))), ida)
  assert.equal(m.consultaDosFiltros(m.FILTROS_PADRAO), '')
  assert.deepEqual(m.filtrosDaConsulta(new URLSearchParams('progresso=xx&ordem=yy')), m.FILTROS_PADRAO)

  // Próximo capítulo: o seguinte publicado do mesmo livro e edição; nenhum depois do último.
  // (Sem ids fixos: cada capítulo publicado muda o "próximo"; a varredura abaixo confere a ordem do livro inteiro.)
  const proximoDo19 = m.proximoCapitulo(capitulos, cap('rockwoodcriancas10-19-ombro-umero'))
  assert.ok(proximoDo19 && m.chaveLivro(proximoDo19) === chaveInfantil10 && m.numeroCapitulo(proximoDo19) > 19, 'o próximo fica no mesmo livro e adiante')
  // Capítulos sintéticos: os resumos reais da 9ª edição vão sendo atualizados para a 10ª e mudariam o teste.
  const de = (id, edicao, n) => ({ ...cap('rockwoodcriancas10-19-ombro-umero'), id, edicao, capitulo: `Capítulo ${n} · Teste` })
  assert.equal(m.proximoCapitulo([de('dez-19', '10ª edição (2025)', 19), de('nove-17', '9ª edição', 17)], de('nove-12', '9ª edição', 12))?.id, 'nove-17', 'outra edição não conta')
  for (const l of livros) {
    assert.equal(m.proximoCapitulo(capitulos, l.capitulos[l.capitulos.length - 1]), null, `último de ${l.rotulo}`)
    for (let i = 0; i + 1 < l.capitulos.length; i++) assert.equal(m.proximoCapitulo(capitulos, l.capitulos[i])?.id, l.capitulos[i + 1].id)
  }
  console.log(`estante da biblioteca: ${livros.length} livros conferidos`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
