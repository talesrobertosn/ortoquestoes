// Painel › Simulados (Simulado Nacional 2.0, parte D): as contas puras da montagem
// (src/componentes/admin/montagemSimulado.ts). Padrões do formulário por mês (outubro de
// 2026 com as datas do contrato e aberto a todos), conferência das cotas, mensagens dos
// erros da parte 32, situação da edição, aviso do dia 25, configuração guardada e a
// reconstrução dos itens salvos (mesma ordem das alternativas).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-admin-simulados-'))
const arquivo = join(pasta, 's.mjs')
try {
  await build({
    stdin: { contents: `export * from './src/componentes/admin/montagemSimulado'\nexport { sortearEdicao, trocarItem } from './src/dados/simuladoNacional'\nexport { ErroRpc } from './src/servicos/supabase'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error',
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false', 'import.meta.env': '{}' },
  })
  const m = await import(pathToFileURL(arquivo))
  const dia = (iso) => new Date(iso)

  // ---- Mês sugerido: o atual se não tem edição (outubro de 2026 dá para montar agora), senão o seguinte livre
  assert.equal(m.mesPadrao([], dia('2026-10-19T15:00:00Z')), '2026-10')
  assert.equal(m.mesPadrao([{ edicao: '2026-10', tipo: 'mensal' }], dia('2026-10-19T15:00:00Z')), '2026-11')
  assert.equal(m.mesPadrao([{ edicao: '2026-10', tipo: 'mensal' }, { edicao: '2026-11', tipo: 'mensal' }], dia('2026-10-19T15:00:00Z')), '2026-12')
  // A véspera não ocupa o mês.
  assert.equal(m.mesPadrao([{ edicao: '2026-10-vespera-teot', tipo: 'vespera' }], dia('2026-10-19T15:00:00Z')), '2026-10')
  // Virada de ano, e 31/12 21h30 em Brasília ainda é dezembro.
  assert.equal(m.mesPadrao([{ edicao: '2026-12', tipo: 'mensal' }], dia('2027-01-01T00:30:00Z')), '2027-01')
  assert.equal(m.somarMeses('2026-12', 1), '2027-01')
  assert.equal(m.somarMeses('2027-01', -1), '2026-12')

  // ---- Padrões do formulário
  const out = m.formularioPadrao('2026-10')
  assert.equal(out.titulo, 'Simulado Nacional · Outubro de 2026')
  assert.equal(out.abre, '2026-10-25T08:00')
  assert.equal(out.fecha, '2026-10-31T23:59')
  assert.equal(m.localParaIso(out.abre), '2026-10-25T08:00:00-03:00')
  assert.equal(m.localParaIso(out.fecha, true), '2026-10-31T23:59:59-03:00')
  assert.equal(out.abertoATodos, true, 'outubro de 2026 é a edição de lançamento, aberta a todos')
  assert.equal(out.destaqueInicio, true)
  assert.equal(out.total, 50)
  assert.equal(out.duracao, 120)
  assert.deepEqual([...out.config.provas].sort(), ['TARO', 'TEOT', 'TEOT/TARO'])
  assert.equal(out.config.pesoRecentes, 2)
  assert.equal(out.config.anosRecentes, 5)
  assert.equal(out.config.nivelAltoPct, 60)
  assert.equal(out.config.cotas, null)
  assert.equal(out.variante, 0)
  const nov = m.formularioPadrao('2026-11')
  assert.equal(nov.titulo, 'Simulado Nacional · Novembro de 2026')
  assert.equal(nov.abre, '2026-11-01T00:00')
  assert.equal(nov.fecha, '2026-11-30T23:59')
  assert.equal(nov.abertoATodos, false)
  assert.equal(m.formularioPadrao('2027-02').fecha, '2027-02-28T23:59')
  assert.equal(m.formularioPadrao('2028-02').fecha, '2028-02-29T23:59')
  // Véspera: abre 7 dias antes da prova e fecha às 23:59 da véspera; o código leva o mês da prova.
  const v = m.formularioPadrao('2026-12', 'vespera', '2027-01-10')
  assert.equal(v.abre, '2027-01-03T00:00')
  assert.equal(v.fecha, '2027-01-09T23:59')
  assert.equal(v.titulo, 'Simulado de véspera · Janeiro de 2027')
  assert.equal(v.abertoATodos, false)
  assert.equal(m.codigoEdicao({ ...v, slug: 'TEOT 2027' }), '2027-01-vespera-teot-2027')
  assert.equal(m.codigoEdicao(out), '2026-10')
  assert.equal(m.slugVespera('  Prova Óssea / Março '), 'prova-ossea-marco')

  // ---- Conferência do formulário
  assert.equal(m.conferirFormulario(out), null)
  assert.match(m.conferirFormulario({ ...out, titulo: 'Oi' }), /3 a 120/)
  assert.match(m.conferirFormulario({ ...out, total: 9 }), /10 a 200/)
  assert.match(m.conferirFormulario({ ...out, total: 201 }), /10 a 200/)
  assert.match(m.conferirFormulario({ ...out, fecha: out.abre }), /depois da abertura/)
  assert.match(m.conferirFormulario({ ...out, config: { ...out.config, provas: [] } }), /prova/)
  assert.match(m.conferirFormulario({ ...v, slug: '---' }), /nome curto/)

  // ---- Cotas: soma conferida ao vivo
  const disp = new Map([['Trauma adulto', 120], ['Joelho', 60], ['Coluna', 3]])
  assert.deepEqual(m.conferirCotas({ 'Trauma adulto': 30, Joelho: 17, Coluna: 3 }, 50, disp), { soma: 50, total: 50, ok: true, semCandidatas: [], mensagem: 'Soma 50 de 50.' })
  const falta = m.conferirCotas({ 'Trauma adulto': 30, Joelho: 15, Coluna: 3 }, 50, disp)
  assert.equal(falta.ok, false); assert.equal(falta.mensagem, 'Soma 48 de 50: faltam 2.')
  assert.equal(m.conferirCotas({ 'Trauma adulto': 33, Joelho: 15, Coluna: 3 }, 50, disp).mensagem, 'Soma 51 de 50: sobram 1.')
  const demais = m.conferirCotas({ 'Trauma adulto': 30, Joelho: 15, Coluna: 5 }, 50, disp)
  assert.equal(demais.ok, false); assert.deepEqual(demais.semCandidatas, ['Coluna'])
  assert.equal(m.conferirCotas({ 'Trauma adulto': 30.5, Joelho: 16.5, Coluna: 3 }, 50, disp).ok, false)
  assert.equal(m.conferirCotas({ 'Trauma adulto': 52, Joelho: -2, Coluna: 0 }, 50, disp).ok, false)

  // ---- Erros da parte 32 em português
  const erro = (codigo, status = 400) => new m.ErroRpc('x', status, codigo)
  assert.equal(m.mensagemDeFalha(erro('edicao_com_participantes')), 'Esta edição já tem participantes: só dá para mudar título, descrição, destaque e estender o prazo.')
  assert.match(m.mensagemDeFalha(erro('nao_admin', 403)), /administradores/)
  assert.match(m.mensagemDeFalha(erro('datas_invalidas')), /estender o fechamento/)
  assert.match(m.mensagemDeFalha(erro('itens_invalidos')), /10 a 200/)
  assert.match(m.mensagemDeFalha(erro('titulo_invalido')), /3 a 120/)
  assert.match(m.mensagemDeFalha(erro('', 404)), /parte 32/)
  assert.match(m.mensagemDeFalha(new TypeError('Failed to fetch')), /conexão/)
  assert.match(m.mensagemDeFalha(erro('coisa_estranha')), /sem dizer o motivo/)
  for (const codigo of ['nao_admin', 'edicao_com_participantes', 'edicao_invalida', 'itens_invalidos', 'datas_invalidas', 'duracao_invalida', 'titulo_invalido', 'config_invalida'])
    assert.ok(m.mensagemDoCodigo(codigo), `sem mensagem para ${codigo}`)

  // ---- Situação da edição
  const ed = { publicado: true, abre_em: '2026-10-25T08:00:00-03:00', fecha_em: '2026-10-31T23:59:59-03:00' }
  const t = (iso) => Date.parse(iso)
  assert.equal(m.statusEdicao({ ...ed, publicado: false }, t('2026-10-26T12:00:00Z')), 'rascunho')
  assert.equal(m.statusEdicao(ed, t('2026-10-10T12:00:00Z')), 'agendada')
  assert.equal(m.statusEdicao(ed, t('2026-10-19T12:00:00Z')), 'inscricoes')
  assert.equal(m.statusEdicao(ed, t('2026-10-25T11:00:00Z')), 'no-ar')
  assert.equal(m.statusEdicao(ed, t('2026-11-01T03:00:00Z')), 'encerrada')
  assert.equal(m.ROTULO_STATUS.inscricoes, 'Inscrições abertas')

  // ---- Aviso do dia 25: a mensal do mês seguinte ainda não publicada
  assert.equal(m.mensalAtrasada([], dia('2026-10-24T20:00:00Z')), null)
  assert.equal(m.mensalAtrasada([], dia('2026-10-25T12:00:00Z')), '2026-11')
  assert.equal(m.mensalAtrasada([{ edicao: '2026-11', tipo: 'mensal', publicado: false }], dia('2026-10-28T12:00:00Z')), '2026-11', 'rascunho não conta')
  assert.equal(m.mensalAtrasada([{ edicao: '2026-11', tipo: 'mensal', publicado: true }], dia('2026-10-28T12:00:00Z')), null)
  // 25/10 01h UTC ainda é dia 24 em Brasília.
  assert.equal(m.mensalAtrasada([], dia('2026-10-25T01:00:00Z')), null)
  assert.equal(m.nomeDoMes('2026-11'), 'novembro de 2026')

  // ---- Usadas: as das edições novas publicadas, menos a que está sendo montada
  const usadas = m.idsUsados([
    { edicao: '2026-10', publicado: true, ids: ['a', 'b'] },
    { edicao: '2026-11', publicado: false, ids: ['c'] },
    { edicao: '2026-12', publicado: true, ids: ['d'] },
  ], '2026-12')
  assert.deepEqual([...usadas].sort(), ['a', 'b'])

  // ---- Configuração guardada (com a variante do "Sortear de novo") vai e volta
  const conf = { provas: ['TEOT'], pesoRecentes: 3, anosRecentes: 4, nivelAltoPct: 70, cotas: { Joelho: 10 } }
  const banco = m.configParaBanco(conf, 2)
  assert.deepEqual(banco, { provas: ['TEOT'], peso_recentes: 3, anos_recentes: 4, nivel_alto_pct: 70, cotas: { Joelho: 10 }, variante: 2 })
  assert.deepEqual(m.lerConfig(banco), { config: conf, variante: 2 })
  assert.deepEqual(m.lerConfig({}).config, { provas: ['TEOT', 'TARO', 'TEOT/TARO'], pesoRecentes: 2, anosRecentes: 5, nivelAltoPct: 60, cotas: null })
  assert.equal(m.sementeDe('2026-10', 0), '2026-10', 'sem variante, a semente é a do script')
  assert.equal(m.sementeDe('2026-10', 3), '2026-10~3')

  // ---- Reconstrução dos itens salvos: mesmos ids, mesma ordem, mesmas alternativas
  const AREAS = [['Trauma adulto', 'trauma', 90], ['Joelho', 'joelho', 40], ['Coluna', 'coluna', 20]]
  const cands = []
  for (const [area, areaSlug, n] of AREAS) for (let i = 0; i < n; i++) {
    const nAlternativas = i % 3 ? 5 : 4
    cands.push({ id: `${areaSlug}-${String(i).padStart(4, '0')}`, area, areaSlug, foco: `Foco ${i % 4}`, nivel: i % 5, ano: 2012 + (i % 14), prova: 'TEOT', gabarito: 'ABCDE'[i % nAlternativas], nAlternativas })
  }
  for (const semente of ['2026-10', '2026-10~2']) {
    const sorteio = m.sortearEdicao(cands, semente, { total: 30, anoAtual: 2026 })
    const troca = m.trocarItem(cands, sorteio, 5, semente, new Set())
    const final = sorteio.map((i) => (i.ordem === 5 ? troca : i))
    const { itens, faltando } = m.itensDaEdicao(cands, final.map((i) => i.id), semente)
    assert.deepEqual(faltando, [])
    assert.deepEqual(itens.map((i) => [i.ordem, i.id, i.permutacao, i.gabaritoNovo]), final.map((i) => [i.ordem, i.id, i.permutacao, i.gabaritoNovo]))
    const banco2 = m.itensParaBanco(itens)
    assert.deepEqual(Object.keys(banco2[0]).sort(), ['area', 'foco', 'gabarito_original', 'id_questao', 'ordem', 'permutacao'])
  }
  const parcial = m.itensDaEdicao(cands, ['joelho-0001', 'sumiu-0001', 'coluna-0002'], '2026-10')
  assert.deepEqual(parcial.faltando, ['sumiu-0001'])
  assert.deepEqual(parcial.itens.map((i) => [i.ordem, i.id]), [[1, 'joelho-0001'], [3, 'coluna-0002']])

  // ---- Texto
  assert.equal(m.trechoEnunciado('<p>Paciente de **30 anos**</p>  com dor'), 'Paciente de 30 anos com dor')
  assert.equal(m.trechoEnunciado('x'.repeat(200)).length, 120)
  assert.equal(m.dataPorExtenso('2026-10-25T08:00:00-03:00'), 'domingo, 25 de outubro, às 8h')
  assert.equal(m.dataPorExtenso('2026-10-31T23:59:59-03:00'), 'sábado, 31 de outubro, às 23h59')
  assert.equal(m.dataPorExtenso('2026-11-01T00:00:00-03:00'), 'domingo, 1 de novembro, à 0h')

  console.log('admin do Simulado Nacional: ok')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
