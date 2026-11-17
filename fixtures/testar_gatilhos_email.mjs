// Gatilhos dos automáticos novos no site (17/10/2026, fase 2 dos e-mails): o site pede à função
// `enviar-email` (ação `automatico`) a carta certa, uma vez só, nas condições certas e nunca fora delas:
//   boas_vindas_dia0   ao confirmar o e-mail (avisarConfirmacao);
//   primeiras_10       junto da checagem do marco, só com 10 questões ou mais;
//   voltou             na primeira sincronização da sessão, só com 10 dias ou mais fora;
//   cronograma_pronto  depois de salvarPlano, e não nas regravações internas (opções, tirar simulados).
// Também: a marca "já pedi" no aparelho por tipo (true, ou o dia no "voltou"), "tentar depois" quando o
// servidor responde ainda_nao/adiado/falhou, nenhuma chamada sem conta, e erro de rede não sobe.
import assert from 'node:assert/strict'
import { mock } from 'node:test'
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
  // O plano e os intervalos abaixo pertencem à mesma data de referência.
  // Fixar Date também cobre as funções que consultam o relógio sem receber AGORA.
  mock.timers.enable({ apis: ['Date'], now: AGORA })
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

  // A confirmação tenta novamente quando há falha transitória, sem duplicar envio.
  for(const resultado of ['ainda_nao','falhou','adiado','sql_pendente','email_nao_configurado']) {
    novaConta(`confirmacao-${resultado}`);falso.configurar({resposta:{resultado}})
    assert.equal(await m.pedirAutomatico('boas_vindas_dia0'),resultado)
    assert.equal(m.jaPedido('boas_vindas_dia0'),false)
    falso.configurar({resposta:{resultado:'enviado'}})
    assert.equal(await m.pedirAutomatico('boas_vindas_dia0'),'enviado')
  }
  // Os três tipos removidos não fazem chamadas, mesmo se um chamador antigo insistir.
  novaConta('removidos')
  for(const tipo of ['primeiras_10','voltou','cronograma_pronto']) assert.equal(await m.pedirAutomatico(tipo,{dias_fora:30}),null)
  await m.avisarPrimeirasDez(15)
  await m.conferirRetorno({'q':{q:AGORA-30*DIA}},AGORA-1000,AGORA)
  await m.avisarCronogramaPronto('2027-01-10','TEOT',AGORA)
  assert.deepEqual(tipos(),[])
  await m.verificarMarcoEmail(12);await esperar();assert.equal(falso.chamadas.length,0)
  await m.verificarMarcoEmail(105);await esperar();assert.equal(falso.chamadas.filter(c=>c.corpo.acao==='marco').length,1)
  // Salvar e ajustar o cronograma continua funcionando, sem gerar e-mail.
  novaConta('cronograma-sem-email')
  const dadosPlano={p_data_prova:'2027-01-10',p_intensidade:'normal',p_folgas:[0],p_prova:'TEOT',p_base:120,p_recomecar:true}
  await m.salvarPlano(dadosPlano,true,{semanasDificeis:[]});await esperar()
  await m.salvarOpcoes(()=>({semanasDificeis:['2026-10-19']}));await esperar()
  assert.ok(falso.rpcs.some(r=>r.nome==='salvar_plano_estudo'))
  assert.deepEqual(tipos(),[])
  console.log('Gatilhos: boas-vindas com retry e deduplicação; três tipos removidos sem chamadas; conquistas preservadas; cronograma salvo sem e-mail.')
} finally {
  mock.timers.reset()
  await rm(pasta, { recursive: true, force: true })
}
