// Cronograma de Cirurgia da Mão (27/10/2026): ingresso e título, recalculado a cada dia a partir da
// configuração, das respostas e da data. Usa o acervo real.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/cronogramaMao'; export * from './src/dados/modalidades'; export { hojeBR, somarDias, diaDaSemana } from './src/util/dia'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const AGORA = Date.parse('2026-10-27T12:00:00-03:00')
  const hoje = m.hojeBR(AGORA)
  const todosOsDias = [0, 1, 2, 3, 4, 5, 6]
  const cfg = (extra = {}) => ({ ...m.configInicial('ingresso', AGORA), dias: todosOsDias, criadoEm: hoje, ...extra })
  const poolIngresso = new Set(m.rankingModalidade(indice, m.modalidadePorId('mao-ingresso')).temas.flatMap((t) => t.ids))
  const poolTitulo = new Set(m.rankingModalidade(indice, m.modalidadePorId('mao-titulo')).temas.flatMap((t) => t.ids))

  // data futura: meta, sessão de hoje só com questões de ingresso, prioridade máxima primeiro
  const p = m.calcularPlanoMao(indice, {}, cfg(), AGORA)
  assert.equal(p.hoje.tipo, 'estudo')
  assert.ok(p.metaHoje >= 5 && p.idsHoje.length === p.metaHoje, `meta ${p.metaHoje}, ids ${p.idsHoje.length}`)
  assert.ok(p.idsHoje.every((id) => poolIngresso.has(id)), 'ingresso usou questão de fora')
  assert.equal(new Set(p.idsHoje).size, p.idsHoje.length, 'questão repetida no dia')
  assert.equal(p.feitas, 0)
  assert.equal(p.proximos.length, 7)

  // data mais perto: a meta sobe, mas no máximo 25% acima do tempo da pessoa
  const perto = m.calcularPlanoMao(indice, {}, cfg({ dataProva: m.somarDias(hoje, 30) }), AGORA)
  assert.ok(perto.metaHoje > p.metaHoje)
  assert.ok(perto.metaHoje <= Math.round(perto.capacidadeDia * 1.25), 'meta passou do teto')
  assert.ok(perto.projecao <= 100)

  // dia sem estudo: folga, nenhuma questão
  const semHoje = todosOsDias.filter((d) => d !== m.diaDaSemana(hoje))
  const folga = m.calcularPlanoMao(indice, {}, cfg({ dias: semHoje }), AGORA)
  assert.equal(folga.hoje.tipo, 'folga'); assert.equal(folga.idsHoje.length, 0)

  // pouco tempo: capacidade mínima de 5 questões e projeção baixa
  const pouco = m.calcularPlanoMao(indice, {}, cfg({ minutosDia: 10 }), AGORA)
  assert.equal(pouco.capacidadeDia, 5)

  // atividade concluída: o que foi feito sai da fila e conta no progresso, sem sumir do histórico
  const respostas = Object.fromEntries(p.idsHoje.map((id, i) => [id, { c: i % 2 === 0, q: AGORA - 3600000 }]))
  const depois = m.calcularPlanoMao(indice, respostas, cfg(), AGORA)
  assert.equal(depois.feitas, p.idsHoje.length)
  assert.ok(depois.idsHoje.every((id) => !respostas[id] || respostas[id].c === false), 'questão feita voltou como nova')
  assert.ok(depois.ritmo > 0)

  // erros antigos voltam como revisão (até um quarto do dia), espalhados entre as novas
  const antigas = Object.fromEntries(p.idsHoje.map((id) => [id, { c: false, q: AGORA - 5 * 86400000 }]))
  const comRevisao = m.calcularPlanoMao(indice, antigas, cfg(), AGORA)
  assert.ok(comRevisao.revisaoHoje > 0 && comRevisao.revisaoHoje <= Math.floor(comRevisao.metaHoje / 4) + 1)
  assert.ok(comRevisao.idsHoje.some((id) => antigas[id]), 'sem revisão de erros')

  // desempenho muda a prioridade: errar tudo num assunto o põe na frente de um igual que a pessoa acerta
  const [a, b] = p.temas
  const errosA = Object.fromEntries(a.ids.slice(0, 6).map((id) => [id, { c: false, q: AGORA - 86400000 }]))
  const acertosB = Object.fromEntries(b.ids.slice(0, 6).map((id) => [id, { c: true, q: AGORA - 86400000 }]))
  const pr = m.calcularPlanoMao(indice, { ...errosA, ...acertosB }, cfg(), AGORA)
  const pa = pr.temas.find((t) => t.nome === a.nome).prioridade, pb = pr.temas.find((t) => t.nome === b.nome).prioridade
  assert.ok(pa > pb, 'erro não aumentou a prioridade')

  // atraso: plano criado há 40 dias sem nada feito não joga tudo no dia de hoje
  const atrasado = m.calcularPlanoMao(indice, {}, cfg({ criadoEm: m.somarDias(hoje, -40), dataProva: m.somarDias(hoje, 45) }), AGORA)
  assert.ok(atrasado.metaHoje <= Math.round(atrasado.capacidadeDia * 1.25))

  // simulado a cada 14 dias e reta final nas duas últimas semanas
  const sim = m.calcularPlanoMao(indice, {}, cfg({ criadoEm: m.somarDias(hoje, -14) }), AGORA)
  assert.equal(sim.hoje.tipo, 'simulado'); assert.ok(sim.idsHoje.length >= 30 && sim.idsHoje.length <= 40)
  const reta = m.calcularPlanoMao(indice, {}, cfg({ dataProva: m.somarDias(hoje, 10) }), AGORA)
  assert.equal(reta.hoje.tipo, 'reta-final')
  const passou = m.calcularPlanoMao(indice, {}, cfg({ dataProva: m.somarDias(hoje, -1) }), AGORA)
  assert.ok(passou.encerrado)

  // título: questões no padrão da prova primeiro; o essencial não usa as de ingresso
  const tit = m.calcularPlanoMao(indice, {}, { ...m.configInicial('titulo', AGORA), dias: todosOsDias, criadoEm: hoje }, AGORA)
  assert.ok(tit.idsHoje.every((id) => poolTitulo.has(id)), 'título começou por questão de ingresso')
  const essencial = m.calcularPlanoMao(indice, {}, { ...m.configInicial('titulo', AGORA), dias: todosOsDias, criadoEm: hoje, cobertura: 'essencial' }, AGORA)
  assert.ok(essencial.temas.every((t) => t.ids.every((id) => poolTitulo.has(id)) && t.nivel >= 3))
  assert.ok(essencial.total < tit.total)
  assert.notDeepEqual(tit.temas.slice(0, 5).map((t) => t.nome), p.temas.slice(0, 5).map((t) => t.nome), 'título e ingresso com a mesma prioridade')

  // prontidão e progresso nunca passam de 100 e não se confundem
  for (const x of [p, depois, comRevisao, tit]) { assert.ok(x.prontidao >= 0 && x.prontidao <= 100); assert.ok(x.cobertura >= 0 && x.cobertura <= 100) }

  // configuração vinda da conta
  assert.equal(m.lerConfig(null), null)
  assert.equal(m.lerConfig({ tipo: 'pref', prova: 'outra', dataProva: '2027-01-01', dias: [] }), null)
  const lida = m.lerConfig({ tipo: 'pref', prova: 'titulo', dataProva: '2027-03-10', dias: [1, 9, 3], minutosDia: 9999, cobertura: 'x', em: 5 })
  assert.deepEqual([lida.dias, lida.minutosDia, lida.cobertura], [[1, 3], 300, 'completa'])
  assert.equal(m.itemConfigMao('ingresso'), 'c.mao-ingresso')
  console.log('Cronograma da mão: data, folga, pouco tempo, feito, revisão, prioridade, atraso, simulado, reta final e título: OK')
} finally { await rm(pasta, { recursive: true, force: true }) }
