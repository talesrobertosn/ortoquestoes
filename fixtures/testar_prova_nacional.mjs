// Simulado Nacional 2.0, parte C (docs/superpowers/specs/2026-10-19-simulado-nacional-contrato.md):
// a permutação das alternativas no cartão e na correção (letra nova ↔ original), a sessão da prova
// montada a partir de sn_iniciar (respostas do servidor, pendentes do aparelho), o que sobe no
// salvamento, os alertas de tempo, a máquina de estados da página (situação + inscrição), o cartão
// do Início, as datas em São Paulo e as frases do resultado (regras de tato).
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-prova-nacional-'))
const arquivo = join(pasta, 'p.mjs')
try {
  await build({ entryPoints: ['src/dados/provaNacional.ts'], outfile: arquivo, bundle: true, platform: 'node', format: 'esm', logLevel: 'error' })
  const m = await import(pathToFileURL(arquivo))

  // ---- Permutação: a letra nova i mostra a alternativa original permutacao[i]
  const questao = {
    id: 'trauma-0001', tema: 'Trauma adulto', subtemas: [], prova: 'TEOT', ano: 2024, dificuldade: null, enunciado: 'Qual?', imagens: [],
    alternativas: [{ letra: 'A', texto: 'alfa' }, { letra: 'B', texto: 'beta' }, { letra: 'C', texto: 'gama' }, { letra: 'D', texto: 'delta' }],
    gabarito: 'A',
  }
  const p = m.permutarQuestao(questao, 'CADB')
  assert.deepEqual(p.alternativas.map((a) => a.letra), ['A', 'B', 'C', 'D'], 'letras novas em ordem')
  assert.deepEqual(p.alternativas.map((a) => a.texto), ['gama', 'alfa', 'delta', 'beta'], 'nova A mostra a original C, nova B a A…')
  assert.equal(p.gabarito, 'B', 'gabarito original A aparece na letra nova B')
  assert.equal(questao.alternativas[0].texto, 'alfa', 'a questão do acervo não muda')
  assert.equal(m.permutarQuestao(questao, null), questao, 'sem permutação, a mesma questão')
  assert.equal(m.permutarQuestao(questao, 'CADBE'), questao, 'permutação de tamanho errado é ignorada')
  assert.equal(m.permutarQuestao(questao, 'CADC'), questao, 'letra repetida é ignorada')
  assert.equal(m.permutarQuestao({ ...questao, gabarito: null }, 'CADB').gabarito, null)
  // Ida e volta: para toda letra nova, a original e de novo a nova
  for (const nova of 'ABCD') assert.equal(p.alternativas['ABCD'.indexOf(nova)].texto, questao.alternativas['ABCD'.indexOf(m.paraOriginal('CADB', nova))].texto)
  assert.equal(m.paraOriginal('CADB', 'A'), 'C')
  assert.equal(m.paraOriginal('CADB', 'D'), 'B')
  assert.equal(m.paraOriginal('CADB', null), null)
  assert.equal(m.paraOriginal(null, 'B'), 'B')

  // ---- Correção: ordem da edição, gabarito e marcada em letras novas, a original ao lado
  const corr = m.alternativasDaCorrecao(questao, 'CADB', 'B', 'D')
  assert.deepEqual(corr.map((a) => [a.letra, a.original, a.texto, a.gabarito, a.marcada]), [
    ['A', 'C', 'gama', false, false], ['B', 'A', 'alfa', true, false], ['C', 'D', 'delta', false, false], ['D', 'B', 'beta', false, true],
  ])
  const semPerm = m.alternativasDaCorrecao(questao, '', 'A', null)
  assert.deepEqual(semPerm.map((a) => a.original), ['A', 'B', 'C', 'D'])

  // ---- Sessão da prova a partir de sn_iniciar
  const filtros = { temas: [], subtemas: [], areas: ['base'], provas: [], anos: [] }
  const inicio = {
    edicao: '2026-10', iniciado_em: '2026-10-25T14:00:00Z', prazo_em: '2026-10-25T16:00:00Z', duracao_min: 120,
    itens: [{ ordem: 2, id_questao: 'q2', permutacao: 'BA' }, { ordem: 1, id_questao: 'q1', permutacao: 'CADB' }, { ordem: 3, id_questao: 'q3', permutacao: 'ABCDE' }],
    respostas: { q1: 'C', q2: null, q9: 'A' }, revisar: ['q2', 'q9'],
  }
  const nova = m.montarSessaoNacional(inicio, null, filtros)
  assert.deepEqual(nova.ids, ['q1', 'q2', 'q3'], 'na ordem da edição')
  assert.equal(nova.permutacoes.q1, 'CADB')
  assert.equal(nova.respostas.q1.escolhida, 'C')
  assert.equal(nova.respostas.q1.correta, null, 'a correção é do servidor')
  assert.ok(!nova.respostas.q2 && !nova.respostas.q9, 'null apaga e fora da edição não entra')
  assert.deepEqual(nova.revisar, ['q2'])
  assert.equal(nova.prazoEm, Date.parse('2026-10-25T16:00:00Z'))
  assert.equal(nova.limiteSegundos, 7200)
  assert.equal(nova.id, 'nacional-2026-10')
  assert.equal(nova.posicao, 1, 'começa na primeira em branco')
  assert.equal(nova.simulado, true)
  // Outro aparelho marcou q2; este aparelho tem q3 pendente (sem rede) e trocou q1, já salva
  const local = { ...nova, posicao: 2, respostas: { q1: { escolhida: 'A', correta: null, segundos: 40, confianca: 'duvida' }, q3: { escolhida: 'E', correta: null, segundos: 12, confianca: 'chute' } }, pendentesNacional: ['q3'], revisar: ['q3'], revisarPendente: true }
  const retomada = m.montarSessaoNacional({ ...inicio, respostas: { q1: 'C', q2: 'B' } }, local, filtros)
  assert.equal(retomada.respostas.q1.escolhida, 'C', 'o servidor vence o que não está pendente')
  assert.equal(retomada.respostas.q1.segundos, 0, 'letra diferente: não herda o tempo')
  assert.equal(retomada.respostas.q2.escolhida, 'B', 'traz a do outro aparelho')
  assert.equal(retomada.respostas.q3.escolhida, 'E', 'a pendente deste aparelho fica')
  assert.equal(retomada.respostas.q3.confianca, 'chute')
  assert.deepEqual(retomada.pendentesNacional, ['q3'])
  assert.deepEqual(retomada.revisar, ['q3'], 'a lista de rever pendente fica')
  assert.equal(retomada.posicao, 2, 'continua onde parou')
  // Pendente apagada aqui (null) apaga a do servidor
  const apagada = m.montarSessaoNacional(inicio, { ...nova, respostas: {}, pendentesNacional: ['q1'] }, filtros)
  assert.ok(!apagada.respostas.q1)
  // Sessão de outra edição ou concluída não se mistura
  assert.equal(m.montarSessaoNacional(inicio, { ...local, nacional: '2026-09' }, filtros).respostas.q3, undefined)

  // ---- O que sobe para o servidor
  assert.deepEqual(m.respostasParaServidor(retomada), { q1: 'C', q2: 'B', q3: 'E' })
  assert.deepEqual(m.respostasParaServidor(apagada, ['q1', 'q2']), { q1: null, q2: null }, 'pendentes vazias sobem como null')

  // ---- Relógio, alertas e o resumo antes de entregar
  assert.equal(m.restanteDaProva({ prazoEm: 10_000, criadaEm: 0, limiteSegundos: 999 }, 4_000), 6, 'o prazo do servidor manda')
  assert.equal(m.restanteDaProva({ criadaEm: 0, limiteSegundos: 60 }, 30_000), 30)
  assert.equal(m.restanteDaProva({ criadaEm: 0, limiteSegundos: null }, 0), null)
  assert.equal(m.alertaDeTempo(1000, []), null)
  assert.equal(m.alertaDeTempo(899, []), 15)
  assert.equal(m.alertaDeTempo(899, [15]), null)
  assert.equal(m.alertaDeTempo(300, [15]), 5)
  assert.equal(m.alertaDeTempo(200, []), 5, 'abrir já perto do fim avisa só os 5')
  assert.equal(m.alertaDeTempo(0, []), null)
  assert.deepEqual(m.resumoParaEntregar(retomada), { brancas: 0, revisar: 1, total: 3 })
  assert.deepEqual(m.resumoParaEntregar(nova), { brancas: 2, revisar: 1, total: 3 })

  // ---- Máquina de estados da página
  const abre = '2026-10-24T11:00:00Z', fecha = '2026-11-01T02:59:59Z'
  const antes = Date.parse('2026-10-20T12:00:00Z'), durante = Date.parse('2026-10-26T12:00:00Z'), depois = Date.parse('2026-11-01T12:00:00Z')
  const base = { abre_em: abre, fecha_em: fecha, minha: null, minha_inscricao: null, aberto_a_todos: true }
  const gratis = { logado: true, premium: false }
  const e = (ed, pessoa, agora) => m.estadoDaPagina({ ...base, ...ed }, pessoa, agora)
  assert.equal(e({}, { logado: false, premium: false }, antes), 'visitante')
  assert.equal(e({}, { logado: false, premium: false }, durante), 'visitante')
  assert.equal(e({}, { logado: false, premium: false }, depois), 'encerrada', 'visitante vê o ranking final')
  assert.equal(e({}, gratis, antes), 'inscrever')
  assert.equal(e({ minha_inscricao: '2026-10-19T10:00:00Z' }, gratis, antes), 'inscrito')
  assert.equal(e({ minha_inscricao: '2026-10-19T10:00:00Z' }, gratis, durante), 'comecar', 'abriu: inscrito começa')
  assert.equal(e({}, gratis, durante), 'comecar', 'aberta a todos: conta grátis começa')
  assert.equal(e({ aberto_a_todos: false }, gratis, durante), 'assinar')
  assert.equal(e({ aberto_a_todos: false }, gratis, antes), 'assinar')
  assert.equal(e({ aberto_a_todos: false }, { logado: true, premium: true }, antes), 'inscrever')
  const minha = (prazo, entregue = null) => ({ minha: { iniciado_em: '2026-10-26T11:00:00Z', prazo_em: prazo, entregue_em: entregue, acertos: null, total: null, segundos: null, no_tempo: null, respondidas: 3 } })
  assert.equal(e(minha('2026-10-26T13:00:00Z'), gratis, durante), 'continuar')
  assert.equal(e({ ...minha('2026-10-26T13:00:00Z'), aberto_a_todos: false }, gratis, durante), 'continuar', 'quem começou continua sem o plano')
  assert.equal(e(minha('2026-10-26T11:30:00Z'), gratis, durante), 'entregando', 'tempo esgotado sem entrega')
  assert.equal(e(minha('2026-10-26T13:00:00Z', '2026-10-26T12:30:00Z'), gratis, durante), 'resultado')
  assert.equal(e(minha('2026-10-26T13:00:00Z', '2026-10-26T12:30:00Z'), gratis, depois), 'resultado')
  assert.equal(e({}, gratis, depois), 'encerrada')
  assert.equal(m.estadoDaPagina({ ...base, abre_em: null }, gratis, antes), 'encerrada')

  // ---- O cartão do Início
  const d = { abre_em: abre, inscrito: false, minha_situacao: null }
  assert.equal(m.estadoDaChamada(d, false, antes), 'visitante')
  assert.equal(m.estadoDaChamada(d, true, antes), 'inscrever')
  assert.equal(m.estadoDaChamada({ ...d, inscrito: true }, true, antes), 'inscrito')
  assert.equal(m.estadoDaChamada({ ...d, inscrito: true }, true, durante), 'comecar')
  assert.equal(m.estadoDaChamada({ ...d, minha_situacao: 'andamento' }, true, durante), 'continuar')
  assert.equal(m.estadoDaChamada({ ...d, minha_situacao: 'entregue' }, true, durante), 'resultado')

  // ---- Datas em São Paulo e contagem
  assert.deepEqual(m.dataDaEdicao('2026-10-24T08:00:00-03:00'), { semana: 'sábado', data: '24/10', hora: '8h' })
  assert.deepEqual(m.dataDaEdicao('2026-10-25T08:00:00-03:00'), { semana: 'domingo', data: '25/10', hora: '8h' }, 'o dia da semana vem da data')
  assert.deepEqual(m.dataDaEdicao('2026-10-31T23:59:59-03:00'), { semana: 'sábado', data: '31/10', hora: '23h59' })
  assert.equal(m.dataPorExtenso('2026-10-24T11:00:00Z'), 'sábado, 24/10, às 8h')
  assert.equal(m.diaDoRankingFinal('2026-10-31T23:59:59-03:00'), '01/11')
  assert.equal(m.contagem((5 * 24 + 3) * 3_600_000), '5 dias e 3 h')
  assert.equal(m.contagem(24 * 3_600_000), '1 dia')
  assert.equal(m.contagem(3 * 3_600_000 + 20 * 60_000), '3 h e 20 min')
  assert.equal(m.contagem(12 * 60_000 - 1), '12 min')
  assert.equal(m.contagem(0), 'agora')
  assert.equal(m.tempoCurto(72 * 60 + 30), '1h12')
  assert.equal(m.tempoCurto(48 * 60), '48 min')
  assert.equal(m.nomeDaEdicao('Simulado Nacional · Outubro de 2026'), 'Outubro de 2026')
  assert.equal(m.nomeDaEdicao(null), 'Simulado Nacional')

  // ---- Calendário
  const ics = m.icsDaEdicao({ edicao: '2026-10', titulo: 'Simulado Nacional · Outubro de 2026', abre_em: '2026-10-24T11:00:00Z', fecha_em: fecha, duracao_min: 120 }, 'https://ortoquestoes.com.br/#/simulado-nacional', Date.parse('2026-10-19T12:00:00Z'))
  assert.match(ics, /DTSTART:20261024T110000Z/)
  assert.match(ics, /DTEND:20261024T130000Z/)
  assert.match(ics, /UID:simulado-nacional-2026-10@ortoquestoes\.com\.br/)
  assert.ok(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75), 'linhas de até 75 octetos')

  // ---- Resultado: prontidão e frase (sem % abaixo de 50, área fraca sem número)
  const areas = m.prontidaoPorArea([
    { area: 'Trauma adulto', certas: 9, total: 10, media: 60 },
    { area: 'Joelho', certas: 1, total: 3, media: 55 },
    { area: 'Coluna', certas: 2, total: 3, media: 60 },
  ])
  assert.deepEqual(areas.map((a) => [a.area, a.estado]), [['Trauma adulto', 'pronto'], ['Coluna', 'caminho'], ['Joelho', 'reforcar']])
  const frase = m.fraseDoResultado(areas, 'Tales')
  assert.equal(frase, 'Tales, seus pontos fortes nesta prova: Trauma adulto. O que mais rende revisar agora: Joelho.')
  assert.doesNotMatch(frase, /\d/, 'sem números na frase')
  assert.match(m.fraseDoResultado(areas.filter((a) => a.estado === 'reforcar'), ''), /^O que mais rende revisar agora: Joelho\./)
  assert.match(m.fraseDoResultado(areas.filter((a) => a.estado === 'caminho'), ''), /^Você está no caminho/)

  console.log('Simulado Nacional (página e prova): permutação, sessão, salvamento, estados da página e do Início, datas e frases OK')
} finally {
  await rm(pasta, { recursive: true, force: true })
}
