import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'oq-calendarios-'))
const anterior = process.env.TZ
try {
  const arquivo = join(pasta, 'calendarios.mjs')
  await build({ stdin: { contents: "export * from './src/dados/calendarioCronograma'; export * from './src/dados/calendarioIcs'; export * from './src/util/dia'", resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))
  for (const fuso of ['America/Sao_Paulo','UTC','America/Los_Angeles','Pacific/Auckland']) {
    process.env.TZ = fuso
    const d = m.diaCivil
    const criado = d('2026-01-05'), hoje = d('2026-02-15'), prova = d('2026-11-02')
    let limites = m.limitesCalendario(criado, hoje, prova)
    assert.equal(m.chaveCivil(limites.inicial), '2026-02-15')
    assert.equal(m.chaveCivil(limites.primeiroMes), '2026-01-01')
    limites = m.limitesCalendario(criado, d('2027-02-15'), prova)
    assert.equal(m.chaveCivil(limites.inicial), '2026-11-02', 'plano encerrado deve abrir no mês da prova')
    assert.equal(m.chaveCivil(m.selecaoNoMes('2026-01-31', d('2026-02-01'), criado, prova)), '2026-02-28')
    assert.equal(m.chaveCivil(m.selecaoNoMes('2028-01-31', d('2028-02-01'), criado, d('2029-01-01'))), '2028-02-29')
    assert.equal(m.chaveCivil(m.selecaoNoMes('2026-10-16', d('2026-11-01'), criado, prova)), '2026-11-02', 'seleção não ultrapassa prova')
    const fase = data => m.faseNoCalendario(d(data), criado, d('2026-10-29'), prova, d('2026-10-20'), d('2026-10-27'), d('2026-11-01'))
    assert.equal(fase('2026-10-25'), 'passado', 'reta final já vivida deve mostrar histórico')
    assert.equal(fase('2026-10-29'), 'prova')
    assert.equal(fase('2026-11-01'), 'vespera')
    assert.equal(fase('2026-11-02'), 'dia-prova')
    assert.equal(fase('2026-11-03'), 'depois')
    const plano = { data_prova: '2026-11-02', prova: 'TEOT', opcoes: { provaExtra: { data: '2026-10-30', nome: 'Prova; revisão, coluna\r\nTeste' } } }
    const calculo = {
      dias: [{ data: d('2026-10-19'), total: 30, mini: true, itens: [{ nome: 'Ortopedia pediátrica', assuntos: ['Classificações; detalhes, acentuação '.repeat(15)] }] }],
      inicioRetaFinal: d('2026-10-20'), inicioModoProva: d('2026-10-27'), vespera: d('2026-11-01'),
    }
    const copia = structuredClone({ plano, calculo })
    const ics = m.gerarIcs(calculo, plano, 19, Date.parse('2026-10-16T15:00:00Z'))
    const linhas = ics.split('\r\n')
    assert.ok(linhas.every(l => Buffer.byteLength(l, 'utf8') <= 75), `linha .ics longa em ${fuso}`)
    assert.ok(ics.endsWith('END:VCALENDAR\r\n'))
    assert.ok(!ics.includes('\ufffd'), 'acentos não podem se partir na dobra')
    const desdobrado = ics.replace(/\r\n /g, '')
    const provaIcs = desdobrado.split('BEGIN:VEVENT').find(e => e.includes('UID:cronograma-prova-20261102@'))
    assert.ok(provaIcs, `prova mudou de data em ${fuso}`)
    assert.match(provaIcs, /DTSTART:20261102T190000/)
    assert.match(provaIcs, /DTEND:20261102T200000/)
    assert.ok(!provaIcs.includes('BEGIN:VALARM'), 'prova não recebe alarme de estudo')
    assert.match(desdobrado, /Prova\\; revisão\\, coluna\\nTeste/)
    assert.match(desdobrado, /começa o modo prova/)
    assert.match(desdobrado, /véspera da prova/)
    assert.equal(desdobrado.split('BEGIN:VEVENT').length - 1, 6)
    const emReta = m.gerarIcs(calculo, plano, 7, Date.parse('2026-10-28T15:00:00Z')).replace(/\r\n /g, '')
    assert.ok(!emReta.includes('SUMMARY:Orto Questões: começa a reta final'), 'não reintroduzir alarme de marco passado')
    const h23 = m.gerarIcs(calculo, plano, 23, Date.parse('2026-10-16T15:00:00Z')).replace(/\r\n /g, '')
    assert.match(h23, /DTEND:20261103T000000/)
    assert.deepEqual({ plano, calculo }, copia, 'exportação não grava nem altera o plano')
  }
  const fonte = await readFile('src/paginas/CronogramaFlashcards.tsx', 'utf8')
  assert.match(fonte, /usarDiaAtual\(\)/)
  assert.match(fonte, /\[cartas, salvo, registros, dia\]/)
  assert.match(fonte, /addEventListener\('storage', outraAba\)/)
  assert.match(fonte, /\[versao, conta\]/)
  console.log('Calendários: quatro fusos, horário de verão, plano encerrado, fevereiro/bissexto, histórico na reta final, .ics válido/acentos/marcos/alarme e ausência de mutações: OK')
} finally {
  if (anterior === undefined) delete process.env.TZ; else process.env.TZ = anterior
  await rm(pasta, { recursive: true, force: true })
}
