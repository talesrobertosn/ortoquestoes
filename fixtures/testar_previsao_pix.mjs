// Previsão do financeiro (15/10/2026): além das renovações do cartão, uma estimativa de quanto entra
// se quem pagou Pix comprar de novo quando o acesso acaba, com a taxa de recompra observada.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'oq-'))
const arquivo = join(pasta, 'm.mjs')
try {
  await build({ stdin: { contents: `export * from './src/componentes/admin/receita'`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  const agora = new Date(2026, 9, 15, 12)
  const dia = (d) => new Date(2026, 9, 15 + d, 12).toISOString()
  const pix = (id, plano, compra, fim, extra = {}) => ({ id_usuario: id, plano, status: 'ativa', meio: 'pix', cancelar_ao_fim: true, criada_em: dia(compra), inicio_periodo: dia(compra), ultima_cobranca_em: dia(compra), fim_periodo: dia(fim), ...extra })
  const mensal = m.precoDe('mensal').total, semestral = m.precoDe('semestral').total
  const perto = (a, b) => assert.ok(Math.abs(a - b) < 0.01, `${a} ≠ ${b}`)

  // Taxa observada: A recomprou (Pix), B recomprou no cartão 10 dias depois do fim, C não voltou,
  // D terminou há 5 dias (ainda pode voltar, fica de fora), E foi reembolsado (fora).
  const lista = [
    pix('A', 'mensal', -90, -60), pix('A', 'mensal', -62, -32), pix('A', 'mensal', -33, 10),
    pix('B', 'mensal', -100, -70), { id_usuario: 'B', plano: 'mensal', status: 'cancelada', meio: 'cartao', cancelar_ao_fim: true, cancelada_em: dia(-20), criada_em: dia(-60), ultima_cobranca_em: dia(-60), fim_periodo: dia(-30) },
    pix('C', 'semestral', -250, -70),
    pix('D', 'mensal', -35, -5),
    pix('E', 'mensal', -100, -70, { status: 'reembolsada' }),
  ]
  const obs = m.renovacaoDoPix(lista, agora)
  // A tem dois Pix encerrados (ambos recomprados), B um (recomprado no cartão), C um (não).
  assert.equal(obs.encerrados, 4); assert.equal(obs.renovados, 3)

  // Projeção: só o Pix vigente de A conta (o antigo não), uma vez por pessoa.
  const vigentes = [
    pix('A', 'mensal', -33, 10), pix('A', 'mensal', -62, -32),
    pix('F', 'semestral', -150, 40),
    pix('G', 'mensal', -5, 25), pix('G', 'mensal', -5, 55), // G já recomprou adiantado: só o último conta
    pix('H', 'mensal', -20, 12), { id_usuario: 'H', plano: 'anual', status: 'ativa', meio: 'cartao', cancelar_ao_fim: false, criada_em: dia(-3), ultima_cobranca_em: dia(-3), fim_periodo: dia(360) }, // H tem cartão: fica no cartão
  ]
  const zero = m.aReceberNoPix(vigentes, 12, 0, agora)
  assert.equal(zero.valor, 0)
  const tudo1 = m.aReceberNoPix(vigentes, 1, 1, agora)
  perto(tudo1.valor, mensal) // só A (dia +10) cai dentro de 1 mês
  const p = 0.6
  const doze = m.aReceberNoPix(vigentes, 12, p, agora)
  assert.equal(doze.pessoas, 3)
  // A: mensal no dia +10 e depois todo mês até o limite (12 recompras, de +10 a ~+345): p + p² + ... + p¹²
  const serie = (n) => Array.from({ length: n }, (_, i) => p ** (i + 1)).reduce((s, v) => s + v, 0)
  // G: mensal a partir do dia +55: 11 recompras; F: semestral no dia +40 e de novo ~6 meses depois: 2
  const esperado = mensal * serie(12) + mensal * serie(11) + semestral * serie(2)
  perto(doze.valor, esperado)
  perto(doze.porMes.reduce((s, [, v]) => s + v.valor, 0), doze.valor)
  assert.equal(doze.porMes.length, 13)

  console.log('Previsão do Pix: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
