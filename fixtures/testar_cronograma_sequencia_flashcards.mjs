// Cronograma dos flashcards reprojetado (15/10/2026): sequência por incidência,
// revisões antes das novidades, meta flexível (passar adianta, ficar abaixo só
// reprograma), data-alvo sem erro e migração do formato antigo sem perda.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

process.env.TZ = 'America/Sao_Paulo'
globalThis.window = Object.assign(new EventTarget(), { localStorage: undefined, sessionStorage: undefined })
globalThis.CustomEvent ??= class extends Event { constructor(t, o) { super(t); this.detail = o?.detail } }
const pasta = await mkdtemp(join(tmpdir(), 'oq-crono-'))
const arquivo = join(pasta, 'c.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/flashcards/cronograma'; export * from './src/flashcards/rotaCronograma'; export * from './src/flashcards/biblioteca/horas'; export { proximoRegistro } from './src/estado/revisao'`, resolveDir: process.cwd() },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const DIA = 86400000
  // quinta-feira, 15/10/2026, 10h em São Paulo
  const t0 = new Date(2026, 9, 15, 10, 0).getTime()
  const carta = (id, areaId, assunto, dificuldade = 2) => ({ id, questao: id, area: areaId, areaId, assunto, tipo: 'Relâmpago', raridade: 'comum', dificuldade, frente: '', resposta: '', explicacao: '', opcoes: ['a', 'b'], certa: 0 })
  const cartas = [
    // ordem embaralhada de propósito: o plano não depende da ordem do acervo
    ...Array.from({ length: 30 }, (_, i) => carta(`mao-${String(i).padStart(2, '0')}`, 'mao', 'Anatomia da mão e punho', (i % 3) + 1)),
    ...Array.from({ length: 25 }, (_, i) => carta(`ped-${String(i).padStart(2, '0')}`, 'pediatria', 'Lesões fisárias', (i % 3) + 1)),
    ...Array.from({ length: 12 }, (_, i) => carta(`out-${i}`, 'joelho', 'Assunto sem contagem')),
  ]
  // "Outras fraturas na criança" tem a maior contagem (95), mas é assunto de resto: vai para o fim, como na fábrica.
  const comResto = [...cartas, carta('resto-1', 'pediatria', 'Outras fraturas na criança')]
  assert.equal(m.ordenarPlano(comResto).at(-1).cartas[0].assunto, 'Outras fraturas na criança')

  // Incidência: Lesões fisárias (77 questões de prova) vem antes de Anatomia da mão (68); sem contagem fica por último.
  const ordem = m.ordenarPlano(cartas)
  assert.deepEqual(ordem.map((g) => g.cartas[0].assunto), ['Lesões fisárias', 'Anatomia da mão e punho', 'Assunto sem contagem'])
  // Dentro do assunto: do mais fácil para o mais difícil, e sempre a mesma ordem (nada aleatório).
  assert.ok(ordem[0].cartas.every((c, i, v) => !i || v[i - 1].dificuldade <= c.dificuldade))
  assert.deepEqual(m.ordenarPlano([...cartas].reverse()).map((g) => g.cartas.map((c) => c.id)), ordem.map((g) => g.cartas.map((c) => c.id)))

  // Sem plano salvo: plano sugerido (tudo, 20 por dia, segunda a sábado). Nada de erro.
  let c = m.calcularCronograma(null, cartas, {}, t0)
  assert.equal(c.plano.ritmo, 20); assert.equal(c.ehDiaDeEstudo, true)
  assert.equal(c.metaNovos, 20); assert.equal(c.novosHoje.length, 20)
  assert.deepEqual(c.semana[0].assuntos.map((f) => [f.assunto, f.n]), [['Lesões fisárias', 20]])
  // Amanhã (sexta): termina Lesões fisárias (5) e começa Anatomia da mão (15).
  assert.equal(c.amanha.dia, '2026-10-16')
  assert.deepEqual(c.amanha.assuntos.map((f) => [f.assunto, f.n]), [['Lesões fisárias', 5], ['Anatomia da mão e punho', 15]])
  // Domingo é folga: nenhum novo previsto, e a semana tem sete dias.
  assert.equal(c.semana.length, 7)
  const domingo = c.semana.find((d) => d.dia === '2026-10-18')
  assert.equal(domingo.estudo, false); assert.equal(domingo.novos, 0)
  // 67 novos a 20 por dia: qui 20, sex 20, sáb 20, (dom folga), seg 7.
  assert.equal(c.previsao, '2026-10-19')
  assert.equal(c.assuntos[0].estado, 'agora'); assert.equal(c.assuntos[0].inicio, '2026-10-15'); assert.equal(c.assuntos[0].fim, '2026-10-16')

  // Responder: os novos de hoje saem da fila e a meta de hoje anda.
  const regs = {}
  const responder = (id, certo, quando) => { regs[id] = m.proximoRegistro(regs[id], certo, quando, certo ? 'seguro' : 'chute') }
  for (const id of c.novosHoje.slice(0, 12)) responder(id, true, t0 + 1000)
  c = m.calcularCronograma(null, cartas, regs, t0 + 2000)
  assert.equal(c.novosFeitosHoje, 12); assert.equal(c.novosHoje.length, 8)
  assert.equal(c.metaFeita, false)

  // Passar da meta: fazer 30 hoje adianta o plano (a previsão chega antes) e não gera aviso.
  const antes = c.previsao
  for (const id of m.sessaoDoCronograma(c, 10).slice(0, 18)) responder(id, true, t0 + 3000)
  c = m.calcularCronograma(null, cartas, regs, t0 + 4000)
  assert.equal(c.novosFeitosHoje, 30); assert.equal(c.metaFeita, true); assert.equal(c.sessaoHoje.length, 0)
  assert.ok(c.previsao <= antes)
  // Com a meta feita, "adiantar" oferece os próximos da fila.
  assert.equal(m.sessaoDoCronograma(c, 10).length, 10)

  // Revisões vencidas entram ANTES das novidades, e o errado vem primeiro.
  const amanhaCedo = new Date(2026, 9, 16, 8, 0).getTime()
  const errado = c.assuntos[0].novos.length ? null : ordem[0].cartas[3].id
  responder(errado, false, t0 + 5000)
  c = m.calcularCronograma(null, cartas, regs, amanhaCedo)
  assert.equal(c.revisoes[0], errado)
  assert.equal(c.sessaoHoje[0], errado)
  assert.equal(c.sessaoHoje.length, c.revisoes.length + c.novosHoje.length)
  assert.equal(c.novosFeitosHoje, 0); assert.equal(c.metaNovos, 20)

  // Ficar abaixo da meta: no dia seguinte a fila só continua de onde parou (sem dívida acumulada).
  const depois = m.calcularCronograma(null, cartas, regs, amanhaCedo + 3 * DIA) // segunda-feira
  assert.equal(depois.metaNovos, 20)
  assert.equal(depois.novosHoje[0], c.novosHoje[0])

  // Data-alvo apertada: nenhuma situação de erro; previsão realista e o ritmo que chegaria na data.
  const apertado = m.calcularCronograma({ data: '2026-10-17', areas: [], diasSemana: [], ritmo: 5, criadoEm: t0 }, cartas, {}, t0)
  assert.equal(apertado.previsao, '2026-10-28') // 67 a 5 por dia, todos os dias
  assert.equal(apertado.alvo.diasDeEstudo, 3); assert.equal(apertado.alvo.ritmoNaData, 23)
  assert.ok(apertado.alvo.folga < 0)
  assert.equal('situacao' in apertado, false)
  // Data que já passou: só é ignorada (sem alvo, sem erro).
  assert.equal(m.calcularCronograma({ data: '2026-10-01', areas: [], diasSemana: [], ritmo: 5, criadoEm: t0 }, cartas, {}, t0).alvo, null)

  // Áreas: só as escolhidas entram.
  const soMao = m.calcularCronograma({ areas: ['mao'], diasSemana: [], ritmo: 10, criadoEm: t0 }, cartas, {}, t0)
  assert.equal(soMao.totalFlashcards, 30); assert.deepEqual(soMao.assuntos.map((a) => a.areaId), ['mao'])

  // Folga hoje: meta zero, mas dá para adiantar.
  const folga = m.calcularCronograma({ areas: [], diasSemana: [1], ritmo: 10, criadoEm: t0 }, cartas, {}, t0)
  assert.equal(folga.ehDiaDeEstudo, false); assert.equal(folga.sessaoHoje.length, 0)
  assert.equal(m.sessaoDoCronograma(folga, 10).length, 10)
  assert.equal(folga.amanha.dia, '2026-10-19')

  // Migração do formato antigo (data obrigatória, ritmo como teto): nada se perde.
  const antigo = { data: '2027-01-10', areas: ['mao', 'joelho'], diasSemana: [5, 1, 3], ritmo: 30, criadoEm: 123, extra: 'mantido' }
  const novo = m.migrarPlano(antigo)
  assert.deepEqual(novo, { ...antigo, versao: 2, diasSemana: [1, 3, 5] })
  assert.equal(m.migrarPlano(null), null); assert.equal(m.migrarPlano('lixo'), null)
  assert.equal(m.migrarPlano({ ritmo: 'x' }).ritmo, 20)
  assert.equal(m.migrarPlano({ ritmo: 30, data: 'ontem' }).data, null)

  // Cripta seguindo o cronograma: rota para o assunto de hoje (filtro do Mapa do especialista).
  const rota = m.rotaDoCronograma(m.calcularCronograma(null, cartas, {}, t0))
  assert.deepEqual(rota, { modo: 'so', area: 'pediatria', subtemas: ['Lesões fisárias'], restam: 20 })

  // A Entrada guarda a rota; a Arena aplica uma vez (na Cripta, nunca na Torre) e a guarda some.
  const mapa = new Map()
  globalThis.window.sessionStorage = { getItem: (k) => mapa.get(k) ?? null, setItem: (k, v) => mapa.set(k, v), removeItem: (k) => mapa.delete(k) }
  m.guardarRotaDoCronograma(rota)
  assert.equal(m.aplicarRotaDoCronograma({ modo: 'torre', rota: null }).rota, null)
  m.guardarRotaDoCronograma(rota)
  assert.deepEqual(m.aplicarRotaDoCronograma({ modo: 'masmorra', rota: null }).rota, rota)
  assert.equal(mapa.size, 0)

  // Horas da Biblioteca: amanhecer -> noite com os acertos (cerca de um quinto da sessão por hora).
  assert.equal(m.horaDaSessao(0, 20).hora.id, 'amanhecer'); assert.equal(m.horaDaSessao(0, 20).faltam, 4)
  assert.equal(m.horaDaSessao(8, 20).hora.id, 'tarde'); assert.equal(m.horaDaSessao(99, 20).hora.id, 'noite'); assert.equal(m.horaDaSessao(99, 20).faltam, 0)
  assert.equal(m.passoDaHora(5), 2); assert.equal(m.passoDaHora(200), 6)
  assert.equal(m.ehAcerto(null, 'hesitei'), true); assert.equal(m.ehAcerto(false, 'sabia'), false)

  // Tempo: 20 flashcards ~ 10 min; 150 ~ 1h15.
  assert.equal(m.rotuloTempo(20), '~10 min'); assert.equal(m.rotuloTempo(150), '~1h15')

  console.log('cronograma dos flashcards (sequência): ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
