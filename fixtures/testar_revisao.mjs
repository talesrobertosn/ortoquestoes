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
  assert.equal(m.revisarHoje(acerto, agora + 1 + 3 * 86400000), true)
  assert.equal(m.proximoRegistro(acerto, true, agora + 2).proximaRevisao, agora + 2 + 7 * 86400000)
  const terceiro = m.proximoRegistro(acerto, true, agora + 2)
  assert.equal(m.proximoRegistro(terceiro, true, agora + 3).proximaRevisao, agora + 3 + 14 * 86400000)
  const quarto = m.proximoRegistro(terceiro, true, agora + 3)
  // Certeza (confiança padrão) ganha uma cauda longa: o intervalo continua
  // crescendo por meses em vez de considerar a questão dominada com só
  // quatro acertos seguidos — só na oitava resposta certa consecutiva.
  assert.equal(m.proximoRegistro(quarto, true, agora + 4).proximaRevisao, agora + 4 + 30 * 86400000)
  const quinto = m.proximoRegistro(quarto, true, agora + 4)
  assert.equal(m.dominada(quinto), false)
  assert.equal(m.proximoRegistro(quinto, true, agora + 5).proximaRevisao, agora + 5 + 90 * 86400000)
  const sexto = m.proximoRegistro(quinto, true, agora + 5)
  assert.equal(m.proximoRegistro(sexto, true, agora + 6).proximaRevisao, agora + 6 + 180 * 86400000)
  const setimo = m.proximoRegistro(sexto, true, agora + 6)
  assert.equal(m.proximoRegistro(setimo, true, agora + 7).proximaRevisao, agora + 7 + 270 * 86400000)
  const oitavo = m.proximoRegistro(setimo, true, agora + 7)
  const dominada = m.proximoRegistro(oitavo, true, agora + 8)
  assert.equal(dominada.proximaRevisao, null)
  assert.equal(m.dominada(dominada), true)
  assert.equal(m.revisarHoje(dominada, agora + 400 * 86400000), false)
  assert.deepEqual([dominada.tentativas, dominada.acertos, dominada.erros], [9, 8, 1])
  assert.equal(m.dominada(m.proximoRegistro(dominada, false, agora + 3)), false)
  // Chute e dúvida continuam saindo da fila com quatro acertos seguidos.
  const chuteQuarto = [1, 2, 3, 4].reduce((r, i) => m.proximoRegistro(r, true, agora + i, 'chute'), undefined)
  assert.equal(m.dominada(chuteQuarto), true)
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
