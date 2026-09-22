import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const pasta = await mkdtemp(join(tmpdir(), 'ortoquestoes-test-'))
try {
  const arquivo = join(pasta, 'revisao.mjs')
  await build({ stdin: { contents: `export * from './src/estado/revisao'; export * from './src/estado/backup'; export * from './src/dados/acervo'; export * from './src/dados/tipos'; export * from './src/util/rotas';`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' } })
  const m = await import(pathToFileURL(arquivo))
  const agora = 1000000000
  const erro = m.proximoRegistro(undefined, false, agora)
  assert.equal(m.revisarHoje(erro, agora), true)
  const acerto = m.proximoRegistro(erro, true, agora + 1)
  assert.equal(m.revisarHoje(acerto, agora + 2), false)
  // Certeza (confiança padrão): volta em 10, 30, 90 e 180 dias e sai da fila
  // quando é acertada também na revisão de 180 dias.
  assert.equal(acerto.proximaRevisao, agora + 1 + 10 * 86400000)
  assert.equal(m.revisarHoje(acerto, agora + 1 + 10 * 86400000), true)
  const segundo = m.proximoRegistro(acerto, true, agora + 2)
  assert.equal(segundo.proximaRevisao, agora + 2 + 30 * 86400000)
  const terceiro = m.proximoRegistro(segundo, true, agora + 3)
  assert.equal(terceiro.proximaRevisao, agora + 3 + 90 * 86400000)
  assert.equal(m.dominada(terceiro), false)
  const quarto = m.proximoRegistro(terceiro, true, agora + 4)
  assert.equal(quarto.proximaRevisao, agora + 4 + 180 * 86400000)
  assert.equal(m.dominada(quarto), false)
  const dominada = m.proximoRegistro(quarto, true, agora + 5)
  assert.equal(m.revisarHoje(quarto, agora + 4 + 180 * 86400000), true)
  assert.equal(dominada.proximaRevisao, null)
  assert.equal(m.dominada(dominada), true)
  assert.equal(m.revisarHoje(dominada, agora + 400 * 86400000), false)
  assert.deepEqual([dominada.tentativas, dominada.acertos, dominada.erros], [6, 5, 1])
  assert.equal(m.dominada(m.proximoRegistro(dominada, false, agora + 3)), false)
  // Chute: 1, 3, 7 e 14 dias. Dúvida: 3, 7, 21 e 45 dias.
  const chutes = [1, 2, 3, 4].reduce((r, i) => [...r, m.proximoRegistro(r.at(-1), true, agora + i, 'chute')], [undefined]).slice(1)
  assert.deepEqual(chutes.map((r, i) => (r.proximaRevisao - (agora + i + 1)) / 86400000), [1, 3, 7, 14])
  const duvidas = [1, 2, 3, 4].reduce((r, i) => [...r, m.proximoRegistro(r.at(-1), true, agora + i, 'duvida')], [undefined]).slice(1)
  assert.deepEqual(duvidas.map((r, i) => (r.proximaRevisao - (agora + i + 1)) / 86400000), [3, 7, 21, 45])
  // Chute sai da fila quando acerta também a revisão de 14 dias (quinto acerto seguido).
  const chuteQuarto = [1, 2, 3, 4].reduce((r, i) => m.proximoRegistro(r, true, agora + i, 'chute'), undefined)
  assert.equal(m.dominada(chuteQuarto), false)
  assert.equal(m.dominada(m.proximoRegistro(chuteQuarto, true, agora + 5, 'chute')), true)
  assert.equal(m.revisarHoje(m.proximoRegistro(undefined, null, agora), agora), false)
  assert.equal(m.revisarHoje({ c: false, q: agora }, agora), true)
  assert.equal(m.revisarHoje({ c: true, q: agora }, agora + 3 * 86400000), true)
  assert.equal(m.proximoRegistro({ c: true, q: agora }, true, agora + 1).tentativas, 2)
  for (const situacao of ['revisarHoje', 'dominadas']) {
    const f = { ...m.FILTROS_VAZIOS, situacao, limite: 7 }
    assert.deepEqual(m.consultaParaFiltros(new URLSearchParams(m.filtrosParaConsulta(f))), f)
  }
  const indice = { questoes: [{ id: '1', t: 0, s: [], p: null, a: null, d: null, an: 0, c: 1, img: 0 }, { id: '2', t: 0, s: [], p: null, a: null, d: null, an: 0, c: 1, img: 0 }], temas: [{ slug: 'teste', nome: 'Teste' }], provas: [], subtemas: [] }
  const contexto = { respondidas: { '1': erro, '2': dominada }, favoritos: [], textos: null }
  assert.deepEqual(m.montarSessao(indice, { ...m.FILTROS_VAZIOS, situacao: 'revisarHoje' }, 1, contexto), ['1'])
  const contagens = m.contar(indice, m.FILTROS_VAZIOS, contexto)
  assert.equal(contagens.porSituacao.revisarHoje, 1)
  assert.equal(contagens.porSituacao.dominadas, 1)
  const backup = { aplicativo: 'OrtoQuestões', versao: 1, exportadoEm: new Date().toISOString(), respondidas: { '1': erro }, favoritos: ['1'], notas: { '1': '**Lembrar**' }, historico: [] }
  assert.deepEqual(m.validarBackup(JSON.stringify(backup)), backup)
  for (const invalido of [{ ...backup, versao: 2 }, { ...backup, respondidas: { '1': { c: 'sim', q: 1 } } }, { ...backup, notas: { '1': 3 } }, { ...backup, historico: [{}] }]) assert.throws(() => m.validarBackup(JSON.stringify(invalido)))
  console.log('Revisão, migração do histórico, filtros, URLs e validação de backup: todos os testes passaram.')
} finally { await rm(pasta, { recursive: true, force: true }) }
