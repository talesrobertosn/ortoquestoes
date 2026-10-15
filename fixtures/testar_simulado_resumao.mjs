// Simulado Nacional e Resumão (otimização de 15/10/2026, docs/simulados/OTIMIZACAO-15-10.md):
// situação da edição (inclusive a que ainda não abriu), prazo, correção agrupada por tema,
// evolução do histórico, busca sem acento e "próxima área não lida" do resumão.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-sn-'))
const arquivo = join(pasta, 's.mjs')
try {
  await build({
    stdin: {
      contents: [
        `export { situacaoEdicao, prazoEdicao, segundosRestantesProva, resumirCorrecao, evolucaoHistorico } from './src/dados/simuladoNacional'`,
        `export { filtrarResumao, termosDaBusca, normalizarBusca, proximaNaoLida, contarFrases, minutosDeLeitura, consultaTreinoAssunto } from './src/dados/resumao'`,
      ].join('\n'),
      resolveDir: process.cwd(), loader: 'ts',
    },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', loader: { '.css': 'empty' }, external: ['react', 'react-dom', 'react/*', 'react-dom/*'],
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
  })
  const m = await import(pathToFileURL(arquivo))
  const t = (iso) => Date.parse(iso)
  const ed = { abre_em: '2026-11-01T03:00:00Z', fecha_em: '2026-12-01T02:59:59Z', duracao_min: 120, minha: null }

  // Situação: antes de abrir não é "encerrada" (bug antigo), depois de fechar é.
  assert.equal(m.situacaoEdicao(ed, t('2026-10-29T12:00:00Z')), 'em-breve')
  assert.equal(m.situacaoEdicao(ed, t('2026-11-10T12:00:00Z')), 'aberta')
  assert.equal(m.situacaoEdicao(ed, t('2026-12-02T12:00:00Z')), 'encerrada')
  const comecou = { ...ed, minha: { iniciado_em: '2026-11-10T12:00:00Z', entregue_em: null } }
  assert.equal(m.situacaoEdicao(comecou, t('2026-11-10T13:00:00Z')), 'andamento')
  assert.equal(m.situacaoEdicao(comecou, t('2026-11-10T14:01:00Z')), 'tempo-esgotado')
  assert.equal(m.situacaoEdicao({ ...comecou, minha: { ...comecou.minha, entregue_em: '2026-11-10T13:30:00Z' } }, t('2026-11-11T00:00:00Z')), 'entregue')
  assert.equal(m.segundosRestantesProva('2026-11-10T12:00:00Z', 120, t('2026-11-10T13:00:00Z')), 3600)
  assert.equal(m.segundosRestantesProva('2026-11-10T12:00:00Z', 120, t('2026-11-10T15:00:00Z')), 0)

  // Prazo: abre/encerra, dias arredondados como a data ao lado, horas e minutos no fim.
  assert.equal(m.prazoEdicao(ed, t('2026-10-29T03:00:01Z')), 'abre em 3 dias')
  assert.equal(m.prazoEdicao(ed, t('2026-11-30T20:00:00Z')), 'encerra em 6 horas')
  assert.equal(m.prazoEdicao(ed, t('2026-12-01T02:30:00Z')), 'encerra em 30 min')
  assert.equal(m.prazoEdicao(ed, t('2026-12-01T04:00:00Z')), null)

  // Correção: certas, erradas, em branco e o que rever agrupado por tema.
  const temas = { a: 'Mão e punho', b: 'Joelho', c: 'Mão e punho', d: 'Joelho', e: 'Coluna' }
  const r = m.resumirCorrecao([
    { id_questao: 'a', gabarito: 'A', marcada: 'B' },
    { id_questao: 'b', gabarito: 'C', marcada: 'C' },
    { id_questao: 'c', gabarito: 'D', marcada: null },
    { id_questao: 'd', gabarito: 'E', marcada: 'A' },
    { id_questao: 'e', gabarito: 'B', marcada: 'B' },
  ], (id) => temas[id])
  assert.deepEqual([r.certas, r.erradas, r.brancas], [2, 2, 1])
  assert.deepEqual(r.paraRever, ['a', 'c', 'd'])
  assert.deepEqual(r.porTema, [{ tema: 'Mão e punho', ids: ['a', 'c'] }, { tema: 'Joelho', ids: ['d'] }])

  // Histórico: mais recente primeiro, variação sobre a edição anterior feita.
  const h = m.evolucaoHistorico([
    { edicao: '2026-09', acertos: 29, total: 50, noTempo: true },
    { edicao: '2026-10', acertos: 31, total: 50, noTempo: true },
    { edicao: '2026-08', acertos: 24, total: 50, noTempo: false },
  ])
  assert.deepEqual(h.map((x) => [x.edicao, x.nota, x.variacao]), [['2026-10', 62, 4], ['2026-09', 58, 10], ['2026-08', 48, null]])

  // Resumão: busca sem acento, todos os termos, no texto, no assunto ou na área.
  const areas = [
    { nome: 'Mão e punho', slug: 'mao', focos: [
      { nome: 'Fraturas do escafoide', nivel: 4, frases: [{ texto: 'Pseudartrose do **escafóide** proximal.', id: 'm1' }, { texto: 'Outra frase.', id: 'm2' }] },
      { nome: 'Dedo em gatilho', nivel: 3, frases: [{ texto: 'Polia A1.', id: 'm3' }] },
    ] },
    { nome: 'Joelho', slug: 'joelho', focos: [{ nome: 'LCA', nivel: 4, frases: [{ texto: 'Lachman é o mais sensível.', id: 'j1' }] }] },
  ]
  assert.deepEqual(m.termosDaBusca('  Escafóide  a '), ['escafoide'])
  const achou = m.filtrarResumao(areas, { busca: 'escafoide pseudartrose', soMaxima: false })
  assert.equal(m.contarFrases(achou), 1)
  assert.equal(achou[0].focos[0].frases[0].id, 'm1')
  // O nome do assunto também conta: "gatilho" acha a frase da polia.
  assert.equal(m.filtrarResumao(areas, { busca: 'gatilho', soMaxima: false })[0].focos[0].frases[0].id, 'm3')
  assert.equal(m.contarFrases(m.filtrarResumao(areas, { busca: '', soMaxima: true })), 3)
  assert.equal(m.filtrarResumao(areas, { busca: 'inexistente', soMaxima: false }).length, 0)
  assert.equal(m.filtrarResumao(areas, { busca: '', soMaxima: false }), areas)

  // Próxima área não lida dá a volta e pula a atual.
  assert.equal(m.proximaNaoLida(areas, [], undefined).slug, 'mao')
  assert.equal(m.proximaNaoLida(areas, ['mao'], 'mao').slug, 'joelho')
  assert.equal(m.proximaNaoLida(areas, ['joelho'], 'joelho').slug, 'mao')
  assert.equal(m.proximaNaoLida(areas, ['mao', 'joelho'], 'joelho'), null)
  assert.equal(m.consultaTreinoAssunto('Lesões fisárias'), '/treinar?subtemas=Les%C3%B5es%20fis%C3%A1rias&situacao=naoRespondidas')

  // O arquivo publicado: todo assunto do resumão é um subtema do acervo (o link de treino funciona).
  const resumao = JSON.parse(await readFile('public/acervo/resumao.json', 'utf8'))
  const indice = JSON.parse(await readFile('public/acervo/indice.json', 'utf8'))
  const subtemas = new Set(indice.subtemas)
  for (const a of resumao.areas) for (const f of a.focos) assert.ok(subtemas.has(f.nome), `assunto do resumão fora do acervo: ${f.nome}`)
  assert.ok(m.minutosDeLeitura(resumao.areas[0]) >= 1)
  console.log('Simulado Nacional e Resumão: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
