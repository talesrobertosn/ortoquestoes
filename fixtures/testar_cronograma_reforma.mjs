// Cronograma reformado (14/10/2026): passadas por incidência, blocos de ~3 dias com 30% de mistura,
// dias leves, semana difícil, teto para o atraso, mini-simulado e a sessão do dia com várias áreas.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/dados/planoEstudo'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const agora = new Date(2026, 9, 14, 9) // quarta, 14/10/2026
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const plano = (extra = {}) => ({ data_prova: '2027-01-10', intensidade: 'firme', folgas: [0], prova: 'TEOT', base_respondidas: 0, criado_em: agora.toISOString(), incluir_simulados: true, ...extra })
  const naoRespondida = new Set(indice.questoes.filter((q) => m.entraNoPlano(q, true)).map((q) => q.id))

  // 1. Plano firme, do zero: todas as questões agendadas são diferentes, do plano e cobrem o alvo.
  const c = m.calcularPlano(indice, {}, plano(), agora)
  const ids = c.dias.flatMap((d) => d.itens.flatMap((i) => i.ids))
  assert.equal(new Set(ids).size, ids.length, 'questão repetida no plano')
  assert.ok(ids.every((id) => naoRespondida.has(id)), 'questão fora do plano')
  assert.equal(ids.length, c.restante, 'o plano não agenda exatamente o que falta')
  assert.equal(c.projecao.maisCaiPct, 100, 'firme deveria cobrir toda a prioridade máxima')
  assert.equal(c.projecao.cortadas, 0)
  // 2. Passadas: a área principal de cada dia nunca volta para uma passada anterior.
  let maior = 1
  for (const d of c.dias) { const p = d.itens.find((i) => !i.mistura)?.passada; if (p) { assert.ok(p >= maior, `passada voltou em ${iso(d.data)}`); maior = p } }
  // 3. Mistura: num dia normal com duas áreas, ~30% vem da segunda; área principal não passa de 6 dias seguidos na 1ª passada.
  const normais = c.dias.filter((d) => d.tipo === 'estudo' && !d.mini && d.itens.some((i) => i.mistura) && d.itens.filter((i) => !i.mistura).length === 1)
  assert.ok(normais.length > 10, 'quase nenhum dia com mistura')
  for (const d of normais) { const mix = d.itens.filter((i) => i.mistura).reduce((s, i) => s + i.n, 0); assert.ok(mix / d.total <= 0.36, `mistura grande demais em ${iso(d.data)}`) }
  let seguidos = 0, ultima = ''
  for (const d of c.dias.filter((x) => x.tipo !== 'folga' && x.passada === 1)) { const p = d.itens.find((i) => !i.mistura)?.slug ?? ''; seguidos = p === ultima ? seguidos + 1 : 1; ultima = p; assert.ok(seguidos <= 6, `${p}: mais de 6 dias seguidos em foco`) }
  // 4. Folga sem meta; mini-simulado a cada duas semanas com meia meta.
  assert.ok(c.dias.filter((d) => d.tipo === 'folga').every((d) => d.total === 0))
  const minis = c.dias.filter((d) => d.mini)
  assert.ok(minis.length >= 4, 'mini-simulados faltando')
  assert.ok(minis.every((d) => d.meta <= Math.ceil(c.metaDiaNormal / 2)))
  // 5. Dia leve, semana difícil, começar por e área dominada.
  const seg = iso(new Date(2026, 9, 19))
  const c2 = m.calcularPlano(indice, {}, plano({ opcoes: { diasLeves: [3], qtdLeve: 15, semanasDificeis: [seg], comecarPor: 'joelho', dominadas: ['tumores'] } }), agora)
  assert.equal(c2.tipoHoje, 'leve'); assert.equal(c2.metaDiaria, 15)
  assert.ok(c2.dias.filter((d) => d.tipo === 'dificil').length === 6 && c2.dias.filter((d) => d.tipo === 'dificil').every((d) => d.meta === m.DIA_MINIMO), 'semana difícil sem o dia mínimo')
  assert.equal(c2.dias[0].itens.find((i) => !i.mistura)?.slug, 'joelho', 'começar por não abriu a fila')
  assert.ok(c2.dias.flatMap((d) => d.itens).filter((i) => i.slug === 'tumores').every((i) => i.passada === 1), 'área dominada com assunto fora da prioridade máxima')
  assert.ok(c2.metaDiaNormal > c.metaDiaNormal, 'dias leves e semana difícil deveriam subir a meta dos dias normais')
  // 6. Atraso: plano de 30 dias atrás sem nada feito; a meta para no teto e a projeção avisa.
  const antigo = new Date(agora.getTime() - 30 * 864e5)
  const c3 = m.calcularPlano(indice, {}, plano({ criado_em: antigo.toISOString() }), agora)
  assert.ok(c3.projecao.tetoAtivo && c3.projecao.cortadas > 0 && c3.projecao.alvoPct < 100, 'teto do atraso não agiu')
  assert.equal(c3.projecao.maisCaiPct, 100, 'o corte deveria sair do fim da fila, não da prioridade máxima')
  // 7. Leve menor que a 1ª passada: só prioridade máxima, dividida entre as áreas.
  const c4 = m.calcularPlano(indice, {}, plano({ intensidade: 'leve' }), agora)
  assert.ok(c4.dias.flatMap((d) => d.itens).every((i) => i.passada === 1), 'leve agendou fora da prioridade máxima')
  // 8. Sessão do dia com várias áreas: sem repetição, do tamanho pedido, mistura espalhada.
  const itens = c.hoje.itens.map((i) => ({ slug: i.slug, n: i.n, mistura: i.mistura }))
  const sessao = m.idsDoDiaPlano(indice, itens, {}, true, () => 0.5)
  assert.equal(new Set(sessao).size, sessao.length)
  assert.equal(sessao.length, itens.reduce((s, i) => s + i.n, 0))
  console.log(`Cronograma reformado: ${c.dias.length} dias, meta ${c.metaDiaNormal}, ${minis.length} mini-simulados, passadas, mistura, dia leve, semana difícil e teto corretos.`)
} finally { await rm(pasta, { recursive: true, force: true }) }
