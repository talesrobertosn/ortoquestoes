// Fuso único (auditoria de 15/10/2026): "hoje", sequência, meta, revisão e cronograma usam o dia de
// São Paulo (src/util/dia.ts), qualquer que seja o fuso do aparelho. Também confere o relógio de
// tempo visível por questão (src/util/tempoVisivel.ts): pausa em segundo plano e continua ao voltar.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

// Mesmo esquema dos outros testes: React externo, saída dentro do node_modules do projeto.
const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-dia-'))
const arquivo = join(pasta, 'd.mjs')
try {
  await build({
    stdin: {
      contents: [
        `export * from './src/util/dia'`,
        `export { criarRelogio } from './src/util/tempoVisivel'`,
        `export { calcularStreak } from './src/estado/streak'`,
        `export { inicioDia, chaveDia, distribuirRevisoes } from './src/estado/planoRevisao'`,
        `export { diasAte, diasRetaFinal } from './src/dados/planoEstudo'`,
      ].join('\n'),
      resolveDir: process.cwd(), loader: 'ts',
    },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' }, external: ['react', 'react-dom', 'react/*', 'react-dom/*'],
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const t = (iso) => Date.parse(iso)
  const MIN = 60_000, HORA = 3_600_000, DIA = 86_400_000

  for (const fuso of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Europe/Lisbon']) {
    process.env.TZ = fuso
    const em = `(${fuso})`

    // 23h30 de 14/10 em São Paulo ainda é dia 14 (em UTC já é 15; em Tóquio, 15 de manhã).
    assert.equal(m.FUSO_DIA, 'America/Sao_Paulo')
    assert.equal(m.chaveDoDia(t('2026-10-15T02:30:00Z')), '2026-10-14', `23h30 em SP ${em}`)
    assert.equal(m.chaveDoDia(new Date('2026-10-15T03:00:00Z')), '2026-10-15', `meia-noite em SP ${em}`)
    assert.equal(m.hojeBR(t('2026-10-15T02:59:59Z')), '2026-10-14', `hojeBR ${em}`)

    // Início do dia e do dia seguinte: meia-noite de São Paulo (03:00 UTC).
    assert.equal(m.inicioDoDia(t('2026-10-15T20:00:00Z')), t('2026-10-15T03:00:00Z'), `inicioDoDia ${em}`)
    assert.equal(m.inicioDoDia(t('2026-10-15T02:30:00Z')), t('2026-10-14T03:00:00Z'), `inicioDoDia 23h30 ${em}`)
    assert.equal(m.inicioDoDiaSeguinte(t('2026-10-15T20:00:00Z')), t('2026-10-16T03:00:00Z'), `inicioDoDiaSeguinte ${em}`)
    assert.equal(m.inicioDaChave('2026-12-31'), t('2026-12-31T03:00:00Z'), `inicioDaChave ${em}`)
    assert.equal(m.msAteAmanha(t('2026-10-15T02:30:00Z')), 30 * MIN, `msAteAmanha ${em}`)

    // Horário de verão antigo (até 2019): o dia 04/11/2018 começou às 01h (a meia-noite pulou),
    // o dia 16/02/2019 começou em UTC−2 e o 17/02/2019 já em UTC−3.
    assert.equal(m.inicioDaChave('2018-11-04'), t('2018-11-04T03:00:00Z'), `verão começa ${em}`)
    assert.equal(m.chaveDoDia(m.inicioDaChave('2018-11-04')), '2018-11-04')
    assert.equal(m.inicioDaChave('2019-02-16'), t('2019-02-16T02:00:00Z'), `verão termina, véspera ${em}`)
    assert.equal(m.inicioDaChave('2019-02-17'), t('2019-02-17T03:00:00Z'), `verão termina ${em}`)
    assert.equal(m.chaveDoDia(t('2019-02-17T02:30:00Z')), '2019-02-16', 'a hora repetida ainda é dia 16')

    // Dia da semana, soma e diferença de dias pelo calendário de São Paulo.
    assert.equal(m.diaDaSemana('2026-10-15'), 4, `quinta ${em}`)
    assert.equal(m.diaDaSemana(t('2026-10-18T02:00:00Z')), 6, `sábado 23h em SP ${em}`)
    assert.equal(m.diaDaSemana(t('2026-10-18T03:00:00Z')), 0, `domingo 0h em SP ${em}`)
    assert.equal(m.somarDias('2026-12-31', 1), '2027-01-01')
    assert.equal(m.somarDias('2028-03-01', -1), '2028-02-29')
    assert.equal(m.diasEntre('2026-10-15', '2026-11-15'), 31)
    assert.equal(m.diasEntre('2026-10-15', '2026-10-14'), -1)
    assert.equal(m.chaveDoNumero(m.numeroDoDia('2026-10-15')), '2026-10-15')
    assert.deepEqual(m.partesDaChave('2026-02-09'), [2026, 2, 9])

    // Data civil: meia-noite local com o ano, o mês e o dia de São Paulo.
    const civil = m.diaCivil(t('2026-10-15T02:30:00Z'))
    assert.deepEqual([civil.getFullYear(), civil.getMonth(), civil.getDate(), civil.getHours()], [2026, 9, 14, 0], `diaCivil ${em}`)
    assert.equal(m.chaveCivil(civil), '2026-10-14')
    assert.equal(m.chaveCivil(m.diaCivil('2027-01-10')), '2027-01-10')

    // Revisão: os dias são os de São Paulo (antes, o fuso do aparelho).
    assert.equal(m.inicioDia(t('2026-10-15T02:30:00Z')), t('2026-10-14T03:00:00Z'), `planoRevisao.inicioDia ${em}`)
    assert.equal(m.chaveDia(t('2026-10-15T02:30:00Z')), '2026-10-14', `planoRevisao.chaveDia ${em}`)
    // Folga no domingo: a revisão que vence no domingo de SP vai para segunda.
    const agoraRev = t('2026-10-17T15:00:00Z') // sábado, meio-dia em SP
    const registros = { a: { c: true, q: agoraRev - DIA, proximaRevisao: t('2026-10-18T13:00:00Z') } }
    const porDia = m.distribuirRevisoes(registros, { limite: null, folgas: [0] }, 5, agoraRev)
    assert.deepEqual([...porDia.keys()], [t('2026-10-19T03:00:00Z')], `folga de domingo em SP ${em}`)

    // Sequência: 5 questões às 23h30 do dia 14 e 5 às 00h30 do dia 15 (SP) são dois dias seguidos.
    const historico = (inicio) => Array.from({ length: 5 }, (_, i) => ({ em: inicio + i * MIN, correta: true, confianca: 'seguro' }))
    const reg = {
      x: { c: true, q: t('2026-10-15T02:30:00Z'), historico: historico(t('2026-10-15T02:30:00Z')) },
      y: { c: true, q: t('2026-10-15T03:30:00Z'), historico: historico(t('2026-10-15T03:30:00Z')) },
    }
    const s = m.calcularStreak(reg, t('2026-10-15T13:00:00Z'))
    assert.equal(s.atual, 2, `sequência de 2 dias ${em}`)
    assert.equal(s.hojeContagem, 5, `hoje em SP ${em}`)
    assert.equal(s.ateDia, '2026-10-15')
    const s2 = m.calcularStreak({ x: reg.x }, t('2026-10-15T13:00:00Z'))
    assert.equal(s2.atual, 1, `sequência viva desde ontem ${em}`)
    assert.equal(s2.emRisco, true)
    assert.equal(s2.ateDia, '2026-10-14', `ateDia ontem ${em}`)

    // Cronograma: dias até a prova contados a partir do dia de São Paulo.
    assert.equal(m.diasAte('2026-10-20', t('2026-10-15T02:30:00Z')), 6, `diasAte 23h30 ${em}`)
    assert.equal(m.diasAte('2026-10-20', t('2026-10-15T12:00:00Z')), 5, `diasAte ${em}`)
    // Plano criado às 22h de Brasília (01h UTC do dia seguinte): conta o dia de Brasília.
    assert.equal(m.diasRetaFinal('2026-09-02T01:00:00Z', '2026-10-13'), 14, `reta final com 42 dias ${em}`)
    assert.equal(m.diasRetaFinal('2026-09-03T01:00:00Z', '2026-10-13'), 7, `reta final com 41 dias ${em}`)
  }

  // Relógio de tempo visível: pausa em segundo plano, continua ao voltar para a questão.
  let agora = 0
  const guardado = new Map()
  const r = m.criarRelogio(() => agora, guardado)
  r.trocar('s1:q1', true)
  agora = 10_000; r.pausar()            // aba em segundo plano aos 10 s
  agora = 100_000; r.retomar()          // volta aos 100 s: os 90 s escondidos não contam
  agora = 105_000
  assert.equal(r.ms(), 15_000, 'só o tempo visível')
  r.trocar('s1:q2', true)               // vai para a próxima questão
  agora = 125_000
  assert.equal(r.ms(), 20_000, 'a próxima começa do zero')
  r.trocar('s1:q1', true)               // volta para a primeira: continua de onde parou
  agora = 127_000
  assert.equal(r.ms(), 17_000, 'voltar continua o relógio')
  r.trocar('s2:q1', true)               // a mesma questão em outra sessão começa do zero
  agora = 128_000
  assert.equal(r.ms(), 1_000, 'outra sessão começa do zero')
  r.trocar('s1:q3', false)              // abriu escondida: não conta até ficar visível
  agora = 200_000
  assert.equal(r.ms(), 0, 'aberta em segundo plano não conta')
  r.retomar(); agora = 203_000
  assert.equal(r.ms(), 3_000)
  r.pausar(); r.pausar(); agora = 300_000
  assert.equal(r.ms(), 3_000, 'pausar duas vezes não soma')
  assert.equal(guardado.get('s1:q1'), 17_000)
  assert.equal(guardado.get('s1:q2'), 20_000)

  console.log('Dia de São Paulo: chave, início, semana, verão antigo, data civil, revisão, sequência e cronograma em 7 fusos; relógio visível por questão OK.')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
