// Temas que mais caem por prova (27/10/2026): TEOT, TARO, ingresso e título da mão, sempre separados,
// recalculados do índice do acervo (questão nova, removida, anulada, cópia ou com assunto trocado).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/modalidades'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const mod = (id) => m.modalidadePorId(id)

  // ---------- acervo sintético ----------
  const base = () => ({
    versao: 1, geradoEm: null, total: 0, anos: [],
    temas: [{ slug: 'mao', nome: 'Mão e punho' }, { slug: 'trauma', nome: 'Trauma adulto' }],
    subtemas: ['Fratura do rádio distal', 'Lesões dos tendões flexores', 'Doença de Dupuytren', 'Fratura do fêmur'],
    provas: ['TEOT', 'TARO', 'USP-SP', 'SBCM', 'SIMÃO'],
    questoes: [],
  })
  let n = 0
  const q = (p, a, s, extra = {}) => ({ id: `q${++n}`, t: s.includes(3) ? 1 : 0, s, p, a, d: null, img: 0, an: 0, c: 0, cia: 0, cc: 0, ...extra })
  const ind = base()
  ind.questoes.push(
    q(0, 2023, [3]), q(0, 2023, [0]), q(0, 2024, [3]), // TEOT
    q(1, 2023, [3]), // TARO
    q(2, 2024, [0], { ar: 'mao' }), q(2, 2024, [0], { ar: 'mao' }), q(2, 2025, [1], { ar: 'mao' }), q(2, 2025, [2, 0], { ar: 'mao' }), // ingresso
    q(3, 2023, [1], { ar: 'mao', sim: 1 }), q(4, 2024, [1], { ar: 'mao', sim: 1 }), // título (autorais por engenharia reversa)
  )
  const teot = m.rankingModalidade(ind, mod('teot'))
  assert.equal(teot.amostra, 3, 'TEOT conta só TEOT')
  assert.equal(m.rankingModalidade(ind, mod('taro')).amostra, 1, 'TARO separado do TEOT')
  const ing = m.rankingModalidade(ind, mod('mao-ingresso'))
  assert.equal(ing.amostra, 4, 'ingresso: só provas de seleção da mão')
  assert.deepEqual(ing.fontes, ['USP-SP'])
  const tit = m.rankingModalidade(ind, mod('mao-titulo'))
  assert.equal(tit.amostra, 2, 'título: SBCM e SIMÃO')
  assert.deepEqual(tit.fontes, ['SBCM', 'SIMÃO'])
  assert.equal(m.rankingModalidade(ind, mod('mao-titulo'), 'SBCM').amostra, 1, 'filtro de fonte')
  // assunto principal: a questão com dois assuntos conta uma vez, pelo primeiro
  assert.equal(ing.temas.reduce((s, t) => s + t.n, 0), ing.amostra, 'cada questão conta uma vez')
  assert.equal(ing.temas.find((t) => t.nome === 'Doença de Dupuytren').n, 1)
  assert.equal(ing.temas.find((t) => t.nome === 'Fratura do rádio distal').n, 2)
  // percentuais somam 100 (com arredondamento de uma casa)
  assert.ok(Math.abs(ing.temas.reduce((s, t) => s + t.pct, 0) - 100) < 0.5)
  assert.ok(Math.abs(ing.areas.reduce((s, a) => s + a.pct, 0) - 100) < 0.5)
  // normalização por edição: 2024 tem 2 questões de rádio (100%), 2025 tem 0 de 2 → 50%
  assert.equal(ing.temas.find((t) => t.nome === 'Fratura do rádio distal').pctEdicao, 50)
  assert.equal(ing.edicoes.length, 2)

  // questão nova entra sozinha; anulada, cópia e sem assunto não contam
  ind.questoes.push(q(2, 2026, [2], { ar: 'mao' }))
  assert.equal(m.rankingModalidade(ind, mod('mao-ingresso')).amostra, 5, 'nova questão entrou')
  ind.questoes.push(q(2, 2026, [2], { ar: 'mao', an: 1 }), q(2, 2026, [2], { ar: 'mao', dup: 'q1' }), q(2, 2026, [], { ar: 'mao' }))
  const depois = m.rankingModalidade(ind, mod('mao-ingresso'))
  assert.equal(depois.amostra, 5, 'anulada, cópia e sem assunto ficam fora')
  assert.equal(depois.anuladas, 1)
  assert.equal(depois.semClassificacao, 1)
  // nova prova de ingresso (outra instituição) aparece sem configuração
  ind.provas.push('UNIFESP')
  ind.questoes.push(q(5, 2026, [1], { ar: 'mao' }))
  assert.ok(m.rankingModalidade(ind, mod('mao-ingresso')).fontes.includes('UNIFESP'), 'prova nova reconhecida')
  // troca de assunto muda o ranking; remoção também
  const alvo = ind.questoes.find((x) => x.p === 2 && x.s[0] === 0)
  alvo.s = [2]
  assert.equal(m.rankingModalidade(ind, mod('mao-ingresso')).temas.find((t) => t.nome === 'Fratura do rádio distal').n, 1, 'reclassificação')
  ind.questoes = ind.questoes.filter((x) => x !== alvo)
  assert.equal(m.rankingModalidade(ind, mod('mao-ingresso')).amostra, 5, 'remoção')
  // simulado autoral nunca entra no ranking de provas oficiais
  ind.questoes.push(q(2, 2026, [0], { ar: 'mao', sim: 1 }), q(0, 2024, [3], { sim: 1 }))
  assert.equal(m.rankingModalidade(ind, mod('mao-ingresso')).amostra, 5, 'autoral fora do ingresso')
  assert.equal(m.rankingModalidade(ind, mod('teot')).amostra, 3, 'autoral fora do TEOT')
  // desempenho e prioridade
  const d = m.desempenhoEm(['a', 'b', 'c', 'd'], { a: { c: true }, b: { c: false }, c: { c: false }, d: { c: null } })
  assert.deepEqual(d, { feitas: 4, validas: 3, certas: 1, acerto: 33 })
  assert.ok(m.prioridade({ pctEdicao: 10, ids: ['x'] }, { feitas: 0, validas: 0, certas: 0, acerto: null }) > m.prioridade({ pctEdicao: 10, ids: ['x'] }, { feitas: 1, validas: 1, certas: 1, acerto: 100 }))

  // ---------- acervo real ----------
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  for (const md of m.MODALIDADES) {
    const r = m.rankingModalidade(indice, md)
    assert.ok(r.amostra > 0, `${md.id} vazio`)
    assert.equal(r.temas.reduce((s, t) => s + t.n, 0), r.amostra, `${md.id}: soma dos temas`)
    const ids = r.temas.flatMap((t) => t.ids)
    assert.equal(new Set(ids).size, ids.length, `${md.id}: questão contada duas vezes`)
    for (const id of ids) { const x = indice.questoes.find((y) => y.id === id); assert.ok(!x.dup && x.an !== 1) }
    assert.ok(r.temas.every((t) => t.nivel >= 1 && t.nivel <= 4))
  }
  const fontesIng = m.rankingModalidade(indice, mod('mao-ingresso')).fontes
  assert.ok(!fontesIng.includes('SBCM') && !fontesIng.includes('SIMÃO') && !fontesIng.includes('TEOT'), 'ingresso misturado')
  assert.deepEqual(m.rankingModalidade(indice, mod('mao-titulo')).fontes, ['SBCM', 'SIMÃO'])
  console.log('Temas que mais caem por prova: separação, contagem única, anuladas, cópias, provas novas e acervo real: OK')
} finally { await rm(pasta, { recursive: true, force: true }) }
