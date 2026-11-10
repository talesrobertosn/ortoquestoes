import assert from 'node:assert/strict'
import { build } from 'esbuild'
import vm from 'node:vm'

const { outputFiles } = await build({ entryPoints: ['src/componentes/admin/sinais.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' })
const module = { exports: {} }
vm.runInNewContext(outputFiles[0].text, { module })
const { indicacaoEmDestaque, indexarSinais, planosEmDestaque } = module.exports
const agora = Date.parse('2026-11-10T03:10:00Z') // 00h10 em São Paulo: ontem ainda pode estar nas 24 h.
const hora = 3_600_000
const iso = ms => new Date(ms).toISOString()
for (const horas of [0, 1, 23, 23.999]) assert.equal(indicacaoEmDestaque(iso(agora - horas*hora), agora), true)
for (const valor of [null, undefined, '', 'inválido', iso(agora + 1), iso(agora - 24*hora), iso(agora - 25*hora)]) {
  assert.equal(indicacaoEmDestaque(valor, agora), false, String(valor))
}
const plano = { id_usuario: 'ambos', planos_vezes: 2, planos_ultima: iso(agora - hora) }
const mapa = indexarSinais([plano], [{ id_usuario: 'ambos', indicacao_ultima: iso(agora - 2*hora) }, { id_usuario: 'somente-indicacao', indicacao_ultima: iso(agora - hora) }])
assert.equal(mapa.get('ambos').planos_vezes, 2)
assert.equal(planosEmDestaque(mapa.get('ambos').planos_ultima, agora), true)
assert.equal(indicacaoEmDestaque(mapa.get('ambos').indicacao_ultima, agora), true)
assert.equal(mapa.get('somente-indicacao').planos_vezes, 0)
assert.equal(plano.indicacao_ultima, undefined, 'Não modifica a resposta anterior da RPC')
assert.equal(indexarSinais([plano], []).get('ambos').indicacao_ultima, undefined, 'A atualização não guarda destaque vencido')
console.log('Indicação no admin: 24 h corridas, virada do dia, expiração, datas inválidas e coexistência com planos OK')
