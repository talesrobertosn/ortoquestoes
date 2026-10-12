// Motor da Batalha de flashcards: regras, corridas e balanceamento ("mais fácil morrer do que matar").
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-fc-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/flashcards/motor/regras'; export * from './src/flashcards/motor/bestiario'; export { BARALHO_DEMO } from './src/flashcards/dados/baralhoDemo'; export * from './src/flashcards/progresso'`, resolveDir: process.cwd() },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const cartas = m.BARALHO_DEMO
  const motor = m.criarMotor(cartas)

  // O baralho de demonstração respeita o formato: gabarito dentro das opções, ids rastreáveis, sem HTML.
  for (const c of cartas) {
    assert.ok(c.certa >= 0 && c.certa < c.opcoes.length, `${c.id}: certa fora das opções`)
    assert.equal(new Set(c.opcoes).size, c.opcoes.length, `${c.id}: opções repetidas`)
    assert.match(c.questao, /^[a-z]+-\d{4}$/, `${c.id}: questão de origem`)
    assert.ok(!/<\/?[a-z]/i.test(c.frente + c.explicacao + c.resposta), `${c.id}: HTML no texto`)
  }

  // Mesma semente, mesma partida.
  const a = motor.novaPartida(42), b = motor.novaPartida(42)
  assert.deepEqual(a.estado, b.estado)
  assert.equal(a.eventos[0].tipo, 'novo-inimigo')

  // Responder duas vezes não conta duas vezes; seguir antes de responder não faz nada.
  let p = a.estado
  assert.equal(motor.seguir(p).eventos.length, 0)
  const certaPos = (q) => q.atual.ordem.indexOf(motor.carta(q.atual.id).certa)
  const r1 = motor.responder(p, certaPos(p))
  assert.ok(r1.eventos.some((e) => e.tipo === 'dano-inimigo'))
  const r2 = motor.responder(r1.estado, certaPos(p))
  assert.equal(r2.eventos.length, 0)
  assert.equal(r2.estado, r1.estado)

  // Erro: o dano é o da intenção mostrada antes.
  p = motor.seguir(r1.estado).estado
  const intencao = motor.intencao(p)
  const errada = p.atual.ordem.findIndex((o) => o !== motor.carta(p.atual.id).certa)
  const r3 = motor.responder(p, errada)
  const dano = r3.eventos.find((e) => e.tipo === 'dano-heroi')
  assert.equal(dano.valor, intencao.dano)
  assert.equal(r3.estado.vida, p.vida - intencao.dano)
  assert.ok(r3.estado.derrubaram.includes(p.atual.id))

  // Escudo absorve; pista elimina uma errada e marca o acerto como assistido.
  p = motor.seguir(r3.estado).estado
  p = { ...p, encaixes: [{ tipo: 'escudo', carga: 1 }, { tipo: 'pista', carga: 1 }] }
  const pista = motor.usarPista(p)
  assert.equal(pista.eventos[0].tipo, 'pista')
  assert.equal(pista.estado.atual.assistida, true)
  assert.notEqual(pista.estado.atual.ordem[pista.eventos[0].posicao], motor.carta(p.atual.id).certa)
  assert.equal(motor.responder(pista.estado, pista.eventos[0].posicao).eventos.length, 0, 'alternativa eliminada não pode ser jogada')
  const errada2 = pista.estado.atual.ordem.findIndex((o, k) => o !== motor.carta(p.atual.id).certa && !pista.estado.atual.eliminadas.includes(k))
  const r4 = motor.responder(pista.estado, errada2)
  assert.ok(r4.eventos.some((e) => e.tipo === 'escudo'))
  assert.ok(!r4.eventos.some((e) => e.tipo === 'dano-heroi'))
  assert.equal(r4.estado.vida, pista.estado.vida)

  // Equipar: mesmo poder empilha, o quarto tipo toma o lugar do mais antigo.
  let [enc] = m.equipar([], 'escudo')
  ;[enc] = m.equipar(enc, 'escudo')
  assert.deepEqual(enc, [{ tipo: 'escudo', carga: 2 }])
  ;[enc] = m.equipar(enc, 'pista'); [enc] = m.equipar(enc, 'duplo')
  const [cheio, saiu] = m.equipar(enc, 'imortal')
  assert.equal(cheio.length, 3); assert.equal(saiu, 'escudo')

  // Progresso educacional: acerto assistido não vira "certeza".
  const sem = m.registrarResposta(undefined, true, false, 1000)
  const com = m.registrarResposta(undefined, true, true, 1000)
  assert.equal(sem.confianca, 'seguro'); assert.equal(com.confianca, 'duvida')
  assert.equal(m.registrarResposta(undefined, false, false, 1000).c, false)
  const quaseDominado = { c: true, q: 1000, sequencia: 4, confianca: 'duvida', proximaRevisao: 1000 }
  const ajudado = m.registrarResposta(quaseDominado, true, true, 2000)
  assert.ok(ajudado.proximaRevisao !== null && ajudado.sequencia <= 4, 'acerto assistido não pode dominar')

  // Encerrar muda o estado mesmo sem eventos; poção substituída perde o desafio; imortal repetido não é oferecido.
  const fimVoluntario = motor.encerrar(a.estado)
  assert.equal(fimVoluntario.estado.fase, "fim")
  const comPocao = { ...a.estado, fase: 'recompensa', recompensas: ['duplo'], pocao: 2, encaixes: [{ tipo: 'pocao', carga: 1 }, { tipo: 'escudo', carga: 1 }, { tipo: 'pista', carga: 1 }] }
  assert.equal(motor.escolher(comPocao, 'duplo').estado.pocao, 0)
  for (let k = 0; k < 40; k++) {
    let q = motor.novaPartida(500 + k).estado
    q = { ...q, encaixes: [{ tipo: 'imortal', carga: 1 }], inimigo: { ...q.inimigo, vida: 1 } }
    const r = motor.responder(q, q.atual.ordem.indexOf(motor.carta(q.atual.id).certa))
    assert.ok(!r.estado.recompensas.includes('imortal'), 'imortal repetido oferecido')
  }

  // Balanceamento: simula partidas com quem acerta X% e mede até onde chega.
  function simular(taxa, semente) {
    let s = semente >>> 0
    const sorte = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
    let { estado } = motor.novaPartida(semente)
    for (let passo = 0; passo < 400; passo++) {
      if (estado.fase === 'fim') break
      if (estado.fase === 'recompensa') {
        if (estado.venceu) return { andar: estado.andar, chefe: true }
        estado = motor.escolher(estado, estado.recompensas[0]).estado
        continue
      }
      if (estado.fase === 'resposta') { estado = motor.seguir(estado).estado; continue }
      const c = motor.carta(estado.atual.id)
      const acerta = sorte() < taxa
      const pos = acerta ? estado.atual.ordem.indexOf(c.certa) : estado.atual.ordem.findIndex((o) => o !== c.certa)
      estado = motor.responder(estado, pos).estado
    }
    return { andar: estado.andar, chefe: estado.chefesDerrotados > 0 }
  }
  const tabela = {}
  for (const taxa of [0.5, 0.6, 0.7, 0.8, 0.9]) {
    let chefe = 0, andares = 0
    const N = 1500
    for (let k = 0; k < N; k++) { const r = simular(taxa, 1000 + k); chefe += r.chefe; andares += r.andar }
    tabela[taxa] = { chefe: chefe / N, andarMedio: andares / N }
  }
  console.log('Balanceamento (taxa de acerto → chance de vencer o chefe, andar médio):')
  for (const [t, v] of Object.entries(tabela)) console.log(`  ${Math.round(t * 100)}% → ${(v.chefe * 100).toFixed(1)}% · andar ${v.andarMedio.toFixed(2)}`)
  // Quem acerta 60% quase nunca vence o chefe; quem acerta 90% vence na maioria das vezes.
  assert.ok(tabela[0.6].chefe < 0.12, 'chefe fácil demais para 60%')
  assert.ok(tabela[0.7].chefe < 0.5, 'chefe fácil demais para 70%')
  assert.ok(tabela[0.9].chefe > 0.6, 'chefe impossível para 90%')
  console.log('Motor da Batalha: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
