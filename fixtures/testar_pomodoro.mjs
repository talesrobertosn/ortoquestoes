// Pomodoro da sessão: fases, pausa, retomada, troca de ritmo e o que volta do armazenamento.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-pomodoro-'))
try {
  const arquivo = join(pasta, 'pomodoro.mjs')
  await build({ entryPoints: ['src/util/pomodoro.ts'], outfile: arquivo, bundle: true, platform: 'node', format: 'esm' })
  const m = await import(pathToFileURL(arquivo))
  const MIN = 60_000
  const t0 = 1_000_000

  let e = m.estadoInicial()
  assert.equal(m.restante(e, t0), 25 * MIN)
  assert.equal(m.correndo(e), false)

  // Começa, passa 10 minutos, pausa: faltam 15 e o relógio para.
  e = m.iniciar(e, t0)
  assert.equal(m.restante(e, t0 + 10 * MIN), 15 * MIN)
  e = m.pausar(e, t0 + 10 * MIN)
  assert.equal(m.correndo(e), false)
  assert.equal(m.restante(e, t0 + 60 * MIN), 15 * MIN)
  // Retoma: o fim é recalculado a partir de agora.
  e = m.iniciar(e, t0 + 60 * MIN)
  assert.equal(m.restante(e, t0 + 61 * MIN), 14 * MIN)

  // Fim do foco: vira pausa já correndo e conta um ciclo.
  let r = m.atualizar(e, t0 + 75 * MIN)
  assert.equal(r.terminou, 'foco')
  assert.equal(r.estado.fase, 'pausa')
  assert.equal(r.estado.ciclos, 1)
  assert.equal(m.restante(r.estado, t0 + 75 * MIN), 5 * MIN)
  // Fim da pausa: volta ao foco parado, esperando a pessoa.
  r = m.atualizar(r.estado, t0 + 80 * MIN)
  assert.equal(r.terminou, 'pausa')
  assert.equal(r.estado.fase, 'foco')
  assert.equal(m.correndo(r.estado), false)
  assert.equal(r.estado.restanteMs, 25 * MIN)

  // Página fechada durante foco e pausa inteiros: ao voltar, foco parado e o ciclo contado.
  const longe = m.atualizar(m.iniciar(m.estadoInicial(), t0), t0 + 3 * 60 * MIN)
  assert.equal(longe.estado.fase, 'foco')
  assert.equal(longe.estado.ciclos, 1)
  assert.equal(m.correndo(longe.estado), false)

  // Antes do fim, nada muda.
  const cedo = m.iniciar(m.estadoInicial(), t0)
  assert.equal(m.atualizar(cedo, t0 + MIN).terminou, null)

  // Ritmo 50/10: recomeça o foco com 50 minutos, parado, e guarda os ciclos.
  e = m.trocarRitmo({ ...r.estado, ciclos: 3 }, 50, 10)
  assert.equal(e.restanteMs, 50 * MIN)
  assert.equal(e.ciclos, 3)
  assert.equal(m.atualizar(m.iniciar(e, t0), t0 + 50 * MIN).estado.restanteMs, 10 * MIN)

  assert.equal(m.formatarRelogio(25 * MIN), '25:00')
  assert.equal(m.formatarRelogio(61_500), '01:02')

  // Armazenamento: aceita o formato certo, recusa lixo e ritmo desconhecido.
  assert.deepEqual(m.validar(JSON.parse(JSON.stringify(e))), e)
  assert.equal(m.validar(null), null)
  assert.equal(m.validar({ ...e, minutosFoco: 40 }), null)
  assert.equal(m.validar({ ...e, fase: 'outra' }), null)
  assert.equal(m.validar({ ...e, restanteMs: 99 * MIN }), null)
  console.log('Pomodoro da sessão: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
