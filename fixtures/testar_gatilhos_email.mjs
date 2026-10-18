// Gatilhos dos automáticos novos no site (17/10/2026, fase 2 dos e-mails): o site pede à função
// `enviar-email` (ação `automatico`) a carta certa, uma vez só, nas condições certas e nunca fora delas:
//   boas_vindas_dia0   ao confirmar o e-mail (avisarConfirmacao);
//   primeiras_10       junto da checagem do marco, só com 10 questões ou mais;
//   voltou             na primeira sincronização da sessão, só com 10 dias ou mais fora;
//   cronograma_pronto  depois de salvarPlano, e não nas regravações internas (opções, tirar simulados).
// Também: a marca "já pedi" no aparelho por tipo (true, ou o dia no "voltou"), "tentar depois" quando o
// servidor responde ainda_nao/adiado/falhou, nenhuma chamada sem conta, e erro de rede não sobe.
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(process.cwd(), 'node_modules', '.oq-gatilhos-'))
try {
  // Supabase falso: registra cada chamada à função e às RPCs.
  const arquivoFalso = join(pasta, 'supabase-falso.mjs')
  await writeFile(arquivoFalso, `
export const chamadas = []
export const contagem = { total: 0 }
export const rpcs = []
export let respostaFuncao = { resultado: 'enviado' }
export let falharFuncao = false
export function configurar({ resposta, falhar } = {}) { if (resposta !== undefined) respostaFuncao = resposta; if (falhar !== undefined) falharFuncao = falhar }
export async function chamarFuncao(nome, corpo) { chamadas.push({ nome, corpo }); contagem.total++; if (falharFuncao) throw new Error('Failed to fetch'); return respostaFuncao }
export class ErroRpc extends Error { constructor(m, status, codigo) { super(m); this.status = status; this.codigo = codigo } }
export let plano = null
export async function chamarRpc(nome, args) {
  rpcs.push({ nome, args })
  if (nome === 'salvar_plano_estudo') { plano = { data_prova: args.p_data_prova, intensidade: args.p_intensidade, folgas: args.p_folgas, prova: args.p_prova, base_respondidas: args.p_base, incluir_simulados: args.p_incluir_simulados ?? true, opcoes: args.p_opcoes ?? {}, criado_em: new Date().toISOString() }; return null }
  if (nome === 'obter_plano_estudo') return plano ? [plano] : []
  if (nome === 'ajustar_opcoes_plano') { plano = { ...plano, opcoes: { ...plano.opcoes, ...args.p_patch } }; return null }
  return null
}
export const supabase = null
`)
  const arquivo = join(pasta, 'g.mjs')
  await build({
    stdin: { contents: `export * from './src/conta/emailsAutomaticos'; export * from './src/conta/emailsMarco'; export * from './src/conta/cronograma'; export * from './src/estado/armazenamento'; export * as falso from './src/servicos/supabase'`, resolveDir: process.cwd(), loader: 'ts' },
    outfile: arquivo, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty', '.png': 'empty', '.svg': 'empty' },
    define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' }, logLevel: 'error',
    plugins: [{ name: 'supabase-falso', setup(b) { b.onResolve({ filter: /servicos\/supabase$/ }, () => ({ path: arquivoFalso })) } }],
  })

  // Navegador mínimo: localStorage, window, document, navigator.
  const dados = new Map()
  globalThis.window = new EventTarget()
  window.localStorage = { getItem: k => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, String(v)), removeItem: k => dados.delete(k), key: i => [...dados.keys()][i], get length() { return dados.size } }
  window.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  globalThis.localStorage = window.localStorage
  globalThis.document = new EventTarget()
  document.visibilityState = 'visible'
  Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })

  const m = await import(pathToFileURL(arquivo))
  const { falso } = m
  const DIA = 86_400_000
  const AGORA = Date.parse('2026-10-17T15:00:00-03:00')
  const esperar = () => new Promise((r) => setTimeout(r, 20))
  const automaticos = () => falso.chamadas.filter((c) => c.nome === 'enviar-email' && c.corpo.acao === 'automatico')
  const tipos = () => automaticos().map((c) => c.corpo.tipo)
  const zerar = () => { falso.chamadas.length = 0; falso.rpcs.length = 0; falso.configurar({ resposta: { resultado: 'enviado' }, falhar: false }); m.esquecerPedidosDaSessao() }
  const novaConta = (id) => { dados.clear(); m.definirUsuarioLocal(id); zerar() }

  // 1. Sem conta, nada é pedido.
  m.definirUsuarioLocal(null); zerar()
  assert.equal(await m.pedirAutomatico('primeiras_10'), null)
  assert.deepEqual(tipos(), [])

  // 2. Boas-vindas no dia da confirmação: uma vez por conta; a marca fica no aparelho e vale em outra sessão.
  novaConta('conta-a')
  assert.equal(await m.avisarConfirmacao(), 'enviado')
  assert.equal(await m.avisarConfirmacao(), null, 'segunda chamada na mesma sessão não vai à função')
  m.esquecerPedidosDaSessao()
  assert.equal(await m.avisarConfirmacao(), null, 'nova sessão, mesma conta: a marca no aparelho impede')
  assert.deepEqual(tipos(), ['boas_vindas_dia0'])
  assert.equal(m.jaPedido('boas_vindas_dia0'), true)
  assert.equal(m.jaPedido('primeiras_10'), false)
  // Outra conta no mesmo aparelho tem a própria marca.
  m.definirUsuarioLocal('conta-b'); m.esquecerPedidosDaSessao()
  assert.equal(await m.avisarConfirmacao(), 'enviado')
  assert.deepEqual(tipos(), ['boas_vindas_dia0', 'boas_vindas_dia0'])

  // 3. "Tentar depois": ainda_nao, adiado e falhou não gravam a marca; erro de rede também não, e não sobe.
  novaConta('conta-c')
  for (const resultado of ['ainda_nao', 'adiado', 'falhou', 'sql_pendente']) {
    falso.configurar({ resposta: { resultado } }); m.esquecerPedidosDaSessao()
    assert.equal(await m.pedirAutomatico('primeiras_10'), resultado)
    assert.equal(m.jaPedido('primeiras_10'), false, resultado)
  }
  falso.configurar({ falhar: true }); m.esquecerPedidosDaSessao()
  assert.equal(await m.pedirAutomatico('primeiras_10'), null, 'erro de rede vira null')
  assert.equal(m.jaPedido('primeiras_10'), false)
  // Respostas definitivas (enviado, ja_enviado, nao_quer, sem_email) gravam a marca.
  for (const resultado of ['ja_enviado', 'nao_quer', 'sem_email']) {
    novaConta(`conta-${resultado}`); falso.configurar({ resposta: { resultado } })
    assert.equal(await m.pedirAutomatico('primeiras_10'), resultado)
    assert.equal(m.jaPedido('primeiras_10'), true, resultado)
  }

  // 4. Primeiras 10 questões: junto do marco, só a partir de 10, uma vez; o marco continua funcionando.
  novaConta('conta-d')
  await m.verificarMarcoEmail(7); await esperar()
  assert.deepEqual(tipos(), [], 'com 7 questões nada sai')
  assert.equal(await m.avisarPrimeirasDez(9), null)
  await m.verificarMarcoEmail(12); await esperar()
  assert.deepEqual(tipos(), ['primeiras_10'])
  await m.verificarMarcoEmail(30); await esperar()
  assert.deepEqual(tipos(), ['primeiras_10'], 'não repete na mesma conta')
  assert.deepEqual(falso.chamadas.filter((c) => c.corpo.acao === 'marco').length, 0, 'com 30 questões ainda não há marco de carta')
  await m.verificarMarcoEmail(105); await esperar()
  assert.equal(falso.chamadas.filter((c) => c.corpo.acao === 'marco').length, 1, 'o marco de 100 continua sendo pedido')

  // 5. Que bom te ver de volta: só com 10 dias ou mais fora; a ausência vem da última visita deste aparelho
  //    ou, num aparelho novo, da última resposta sincronizada antes desta sessão.
  const resp = (quando) => ({ 'mao-0001': { c: true, q: quando, historico: [{ em: quando, correta: true, confianca: 'seguro' }] } })
  novaConta('conta-e')
  assert.equal(m.diasForaDe({}, AGORA - 1000, AGORA), null, 'sem dado, não dá para saber')
  assert.equal(m.diasForaDe(resp(AGORA - 12 * DIA), AGORA - 1000, AGORA), 12)
  assert.equal(m.diasForaDe(resp(AGORA - 3 * DIA), AGORA - 1000, AGORA), 3)
  // Uma resposta dada nesta sessão (depois de voltar) não zera a ausência.
  assert.equal(m.diasForaDe({ ...resp(AGORA - 12 * DIA), 'mao-0002': { c: true, q: AGORA - 60_000 } }, AGORA - 5 * 60_000, AGORA), 12)
  assert.equal(await m.conferirRetorno(resp(AGORA - 3 * DIA), AGORA - 1000, AGORA), null)
  assert.deepEqual(tipos(), [], 'com 3 dias fora nada sai')
  novaConta('conta-f')
  assert.equal(await m.conferirRetorno(resp(AGORA - 12 * DIA), AGORA - 1000, AGORA), 'enviado')
  assert.deepEqual(automaticos().map((c) => [c.corpo.tipo, c.corpo.dias_fora]), [['voltou', 12]])
  assert.equal(m.jaPedido('voltou', AGORA), true)
  // No dia seguinte a visita de hoje já foi registrada: 1 dia fora, nada sai.
  m.esquecerPedidosDaSessao()
  assert.equal(await m.conferirRetorno(resp(AGORA - 12 * DIA), AGORA + DIA - 1000, AGORA + DIA), null)
  assert.deepEqual(tipos().length, 1)
  // Volta de novo depois de 20 dias sem abrir: outra carta (a marca do "voltou" é por dia).
  m.esquecerPedidosDaSessao()
  assert.equal(await m.conferirRetorno(resp(AGORA - 12 * DIA), AGORA + 21 * DIA - 1000, AGORA + 21 * DIA), 'enviado')
  assert.deepEqual(automaticos().map((c) => c.corpo.dias_fora), [12, 20])
  // Marca do dia impede repetir no mesmo dia mesmo em sessão nova.
  m.esquecerPedidosDaSessao()
  assert.equal(await m.pedirAutomatico('voltou', { dias_fora: 20 }, AGORA + 21 * DIA + 3600_000), null)

  // 6. Cronograma pronto: depois de salvarPlano (com dias para a prova e a prova), uma vez; não nas regravações internas.
  novaConta('conta-g')
  const dadosPlano = { p_data_prova: '2027-01-10', p_intensidade: 'normal', p_folgas: [0], p_prova: 'TEOT', p_base: 120, p_recomecar: true }
  await m.salvarPlano(dadosPlano, true, { semanasDificeis: [] }); await esperar()
  assert.equal(automaticos().length, 1)
  assert.equal(automaticos()[0].corpo.tipo, 'cronograma_pronto')
  assert.equal(automaticos()[0].corpo.prova, 'TEOT')
  assert.ok(automaticos()[0].corpo.dias_para_prova >= 80 && automaticos()[0].corpo.dias_para_prova <= 90, `dias para a prova: ${automaticos()[0].corpo.dias_para_prova}`)
  await m.salvarPlano(dadosPlano, true, { semanasDificeis: [] }); await esperar()
  assert.equal(automaticos().length, 1, 'salvar de novo não repete')
  await m.salvarOpcoes(() => ({ semanasDificeis: ['2026-10-19'] })); await esperar()
  await m.ficarSoComOficiais(falso.plano); await esperar()
  assert.equal(automaticos().length, 1, 'mudar opções ou tirar os simulados não pede a carta')
  assert.ok(falso.rpcs.some((r) => r.nome === 'salvar_plano_estudo'), 'o plano foi salvo')
  // Servidor sem o cronograma gravado ainda ("sem_cronograma"): tenta de novo na próxima vez que salvar.
  novaConta('conta-h'); falso.configurar({ resposta: { resultado: 'sem_cronograma' } })
  await m.salvarPlano(dadosPlano, true); await esperar()
  assert.equal(m.jaPedido('cronograma_pronto'), false)
  falso.configurar({ resposta: { resultado: 'enviado' } }); m.esquecerPedidosDaSessao()
  await m.salvarPlano(dadosPlano, true); await esperar()
  assert.equal(automaticos().length, 2)
  assert.equal(m.jaPedido('cronograma_pronto'), true)
  // Um erro na função não derruba o salvamento do plano.
  novaConta('conta-i'); falso.configurar({ falhar: true })
  const salvo = await m.salvarPlano(dadosPlano, true); await esperar()
  assert.ok(salvo && salvo.data_prova === '2027-01-10', 'o plano foi salvo mesmo com a função fora')

  // 7. Nenhum gatilho do site pede os dois tipos que são do servidor.
  assert.ok(!tipos().some((t) => t === 'pagamento_aprovado' || t === 'obrigado_tempo'))

  console.log(`Gatilhos dos automáticos no site: ok (${falso.contagem.total} chamadas à função conferidas; boas_vindas_dia0, primeiras_10, voltou e cronograma_pronto uma vez só, nas condições certas).`)
} finally {
  await rm(pasta, { recursive: true, force: true })
}
