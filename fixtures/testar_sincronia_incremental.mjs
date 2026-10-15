// Sincronização incremental do progresso (parte 24 do SQL) com dois e três
// aparelhos de verdade: cada aparelho roda src/conta/sincronizacao.ts numa
// thread própria (localStorage, window e navigator separados) e conversa com um
// servidor falso que imita as funções sincronizar_progresso e
// ler_progresso_desde do Supabase.
import assert from 'node:assert/strict'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { fileURLToPath, pathToFileURL } from 'node:url'

const USUARIO = 'conta-teste'

if (isMainThread) await principal()
else await aparelho()

async function principal() {
  const { build } = await import('esbuild')
  const { mkdtemp, rm } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const pasta = await mkdtemp(join(tmpdir(), 'orto-sincronia-'))
  const aparelhos = []
  try {
    const pacote = join(pasta, 'sync.mjs')
    await build({ stdin: { contents: `export * from './src/conta/sincronizacao'; export * from './src/conta/modeloSync'; export * from './src/estado/armazenamento';`, resolveDir: process.cwd() }, outfile: pacote, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' } })

    // ---- Servidor falso: mesmas regras da migração 202609120001 e da parte 24.
    const linhas = []
    let versao = 0
    const semLeitura = new Set() // aparelhos cujo banco "não tem" ler_progresso_desde
    const registro = [] // { aparelho, op, ... } para conferir o que trafegou
    const copia = l => ({ tipo: l.tipo, item: l.item, valor: structuredClone(l.valor), versao: l.versao, operacao: l.operacao })
    const daConta = () => linhas.filter(l => l.usuario_id === USUARIO).sort((a, b) => a.versao - b.versao)
    function sincronizarProgresso(alteracoes) {
      if (!Array.isArray(alteracoes) || alteracoes.length > 100) return { data: null, error: { code: 'P0001', message: 'Lote inválido' }, status: 400 }
      // Transação: se um item falha, nada do lote fica gravado.
      const rascunho = linhas.map(l => ({ ...l }))
      let v = versao
      const saida = []
      for (const e of alteracoes) {
        if (e.base < 0) return { data: null, error: { code: 'P0001', message: 'Versão inválida' }, status: 400 }
        let atual = rascunho.find(l => l.usuario_id === USUARIO && l.tipo === e.tipo && l.item === e.item)
        if (!atual) {
          if (e.base !== 0) return { data: null, error: { code: 'P0001', message: 'Versão inicial inválida' }, status: 400 }
          atual = { usuario_id: USUARIO, tipo: e.tipo, item: e.item, valor: e.valor, operacao: e.operacao, versao: ++v }
          rascunho.push(atual)
        } else if (atual.operacao === e.operacao) {
          // repetição da mesma operação: não grava de novo
        } else if (atual.versao === e.base) {
          Object.assign(atual, { valor: e.valor, operacao: e.operacao, versao: ++v })
        }
        saida.push(copia(atual))
      }
      linhas.splice(0, linhas.length, ...rascunho)
      versao = v
      return { data: saida, error: null, status: 200 }
    }
    function atender(nome, pedido) {
      registro.push({ aparelho: nome, ...pedido })
      if (pedido.op === 'rpc' && pedido.nome === 'sincronizar_progresso') return sincronizarProgresso(pedido.args.alteracoes)
      if (pedido.op === 'rpc' && pedido.nome === 'ler_progresso_desde') {
        if (semLeitura.has(nome)) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.ler_progresso_desde' }, status: 404 }
        const limite = Math.min(Math.max(pedido.args.p_limite ?? 500, 1), 1000)
        const data = daConta().filter(l => l.versao > pedido.args.p_cursor).slice(0, limite).map(copia)
        registro.at(-1).linhas = data.length
        return { data, error: null, status: 200 }
      }
      if (pedido.op === 'select') {
        let lista = linhas.filter(l => pedido.filtros.every(([k, v]) => l[k] === v)).sort((a, b) => a.versao - b.versao)
        if (pedido.intervalo) lista = lista.slice(pedido.intervalo[0], pedido.intervalo[1] + 1)
        registro.at(-1).linhas = lista.length
        return { data: lista.map(copia), error: null, status: 200 }
      }
      // Depois da parte 21 a gravação direta é recusada.
      return { data: null, error: { code: '42501', message: 'permission denied for table progresso_usuario' }, status: 403 }
    }
    function criar(nome) {
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { pacote: pathToFileURL(pacote).href, nome } })
      const esperando = new Map()
      let seq = 0
      w.on('message', m => {
        if (m.tipo === 'pedido') { w.postMessage({ tipo: 'resposta', id: m.id, resposta: atender(nome, m.pedido) }); return }
        const p = esperando.get(m.id); esperando.delete(m.id)
        if (m.erro) p.rejeitar(new Error(`${nome}: ${m.erro}`)); else p.resolver(m.valor)
      })
      w.on('error', e => { throw e })
      const cmd = (comando, ...args) => new Promise((resolver, rejeitar) => { const id = ++seq; esperando.set(id, { resolver, rejeitar }); w.postMessage({ tipo: 'comando', id, comando, args }) })
      const a = { nome, w, cmd, ler: chave => cmd('ler', chave), gravar: (chave, valor) => cmd('gravar', chave, valor), esperar: () => cmd('esperar'), sincronizar: () => cmd('sincronizar'), online: v => cmd('online', v) }
      aparelhos.push(a)
      return a
    }
    const pedidosDe = (nome, desde) => registro.slice(desde).filter(r => r.aparelho === nome)
    const servidor = tipo => Object.fromEntries(daConta().filter(l => l.tipo === tipo && l.valor !== null).map(l => [l.item, l.valor]))

    // Progresso já existente: 1.200 respostas (três páginas de leitura).
    for (let i = 0; i < 1200; i++) linhas.push({ usuario_id: USUARIO, tipo: 'respondidas', item: `q${i}`, valor: { c: i % 2 === 0, q: 1000 + i }, operacao: crypto.randomUUID(), versao: ++versao })
    linhas.push({ usuario_id: 'outra-conta', tipo: 'notas', item: 'privada', valor: 'não é sua', operacao: crypto.randomUUID(), versao: ++versao })

    // 1) Primeira sincronização de cada aparelho: leitura completa, paginada pela função.
    const celular = criar('celular'), pc = criar('pc')
    await celular.cmd('iniciar'); await pc.cmd('iniciar')
    await celular.esperar(); await pc.esperar()
    assert.equal(Object.keys(await celular.ler('respondidas')).length, 1200)
    assert.equal(Object.keys(await pc.ler('respondidas')).length, 1200)
    const primeiras = pedidosDe('celular', 0).filter(r => r.nome === 'ler_progresso_desde')
    assert.deepEqual(primeiras.map(r => r.args.p_cursor), [0, 500, 1000], 'primeira leitura completa e paginada por cursor')
    assert.equal(pedidosDe('celular', 0).filter(r => r.op === 'select').length, 0, 'com a função, nada de select da tabela inteira')
    assert.equal((await celular.cmd('estado')).cursor, 1200)

    // 2) Delta: responder uma questão envia só aquele item e lê só o que mudou.
    let marca = registro.length
    await celular.gravar('respondidas', { ...(await celular.ler('respondidas')), q5000: { c: true, q: 5000 } })
    await celular.esperar()
    const envios = pedidosDe('celular', marca).filter(r => r.nome === 'sincronizar_progresso')
    assert.equal(envios.length, 1)
    assert.deepEqual(envios[0].args.alteracoes.map(a => a.item), ['q5000'], 'só o item novo sobe')
    const leituras = pedidosDe('celular', marca).filter(r => r.nome === 'ler_progresso_desde')
    assert.ok(leituras.length >= 1 && leituras.every(r => r.args.p_cursor >= 1200), 'leitura a partir do cursor, não do zero')
    assert.ok(leituras.reduce((s, r) => s + r.linhas, 0) <= 2, 'quase nada trafega na leitura incremental')
    marca = registro.length
    await pc.sincronizar(); await pc.esperar()
    const doPc = pedidosDe('pc', marca).filter(r => r.nome === 'ler_progresso_desde')
    assert.deepEqual(doPc.map(r => [r.args.p_cursor, r.linhas]), [[1200, 1]], 'o PC recebe só a resposta nova')
    assert.deepEqual((await pc.ler('respondidas')).q5000, { c: true, q: 5000 })

    // 3) Conflito entre dois aparelhos, ambos offline, mesmo item e itens diferentes.
    await celular.online(false); await pc.online(false)
    const rc = await celular.ler('respondidas'), rp = await pc.ler('respondidas')
    await celular.gravar('respondidas', { ...rc, q7: { c: false, q: 7000 } }) // respondeu antes
    await pc.gravar('respondidas', { ...rp, q7: { c: true, q: 8000 } }) // respondeu depois: vale esta
    await celular.gravar('favoritos', ['q10'])
    await pc.gravar('notas', { q11: 'anotação do PC' })
    await celular.online(true); await celular.sincronizar(); await celular.esperar()
    await pc.online(true); await pc.sincronizar(); await pc.esperar()
    await celular.sincronizar(); await celular.esperar()
    for (const tipo of ['respondidas', 'favoritos', 'notas']) {
      const c = await celular.ler(tipo), p = await pc.ler(tipo)
      assert.deepEqual(c, p, `celular e PC iguais em ${tipo}`)
    }
    assert.deepEqual((await celular.ler('respondidas')).q7, { c: true, q: 8000 }, 'na resposta vale a mais recente')
    assert.deepEqual(servidor('respondidas').q7, { c: true, q: 8000 })
    assert.deepEqual(await pc.ler('favoritos'), ['q10'], 'favorito do celular chegou ao PC')
    assert.deepEqual(await celular.ler('notas'), { q11: 'anotação do PC' }, 'nota do PC chegou ao celular')
    for (const a of [celular, pc]) {
      const e = await a.cmd('estado')
      assert.equal(Object.keys(e.pendentes).length, 0); assert.equal(Object.keys(e.conflitos).length, 0)
      assert.equal(Object.keys(e.rejeitados ?? {}).length, 0, 'nenhum item recusado por versão')
    }

    // 4) Banco sem a parte 24 (ou site antigo): leitura completa, como antes, sem estragar nada.
    const antigo = criar('antigo')
    semLeitura.add('antigo')
    await antigo.cmd('iniciar'); await antigo.esperar()
    marca = registro.length
    assert.equal(Object.keys(await antigo.ler('respondidas')).length, 1201)
    await antigo.gravar('respondidas', { ...(await antigo.ler('respondidas')), q1: { c: true, q: 9000 } })
    await antigo.esperar()
    await antigo.gravar('notas', { ...(await antigo.ler('notas')), q12: 'do aparelho sem a função' })
    await antigo.esperar()
    const pedidosAntigo = pedidosDe('antigo', 0)
    assert.equal(pedidosAntigo.filter(r => r.nome === 'ler_progresso_desde').length, 1, 'tenta a função uma vez e desiste')
    assert.ok(pedidosAntigo.filter(r => r.op === 'select').length >= 3, 'cai na leitura completa')
    assert.ok(pedidosAntigo.filter(r => r.nome === 'sincronizar_progresso').every(r => r.args.alteracoes.length === 1), 'o envio continua por item')
    // Os aparelhos novos veem o que o antigo gravou, pela leitura incremental.
    marca = registro.length
    await celular.sincronizar(); await celular.esperar()
    assert.ok(pedidosDe('celular', marca).filter(r => r.nome === 'ler_progresso_desde').every(r => r.args.p_cursor > 0))
    assert.deepEqual((await celular.ler('respondidas')).q1, { c: true, q: 9000 })
    assert.equal((await celular.ler('notas')).q12, 'do aparelho sem a função')
    // E o antigo vê o que os novos gravam.
    await pc.gravar('favoritos', ['q10', 'q20']); await pc.esperar()
    await antigo.sincronizar(); await antigo.esperar()
    assert.deepEqual(await antigo.ler('favoritos'), ['q10', 'q20'])
    // No fim, todos iguais.
    await celular.sincronizar(); await celular.esperar()
    for (const tipo of ['respondidas', 'favoritos', 'notas']) {
      assert.deepEqual(await celular.ler(tipo), await antigo.ler(tipo), `antigo e novo iguais em ${tipo}`)
    }

    // 5) Zerar o progresso num aparelho chega aos outros pela leitura incremental.
    await pc.cmd('reiniciar'); await pc.esperar()
    await pc.gravar('respondidas', { q1: { c: false, q: 10000 } }); await pc.esperar()
    marca = registro.length
    await celular.sincronizar(); await celular.esperar()
    assert.ok(pedidosDe('celular', marca).filter(r => r.nome === 'ler_progresso_desde').every(r => r.args.p_cursor > 0))
    assert.deepEqual(await celular.ler('respondidas'), { q1: { c: false, q: 10000 } })
    assert.deepEqual(await celular.ler('notas'), {})
    assert.equal(linhas.find(l => l.usuario_id === 'outra-conta').valor, 'não é sua')

    // 6) Recarregar a página relê tudo uma vez (rede de segurança) e depois volta ao cursor.
    await celular.cmd('parar'); marca = registro.length
    await celular.cmd('iniciar'); await celular.esperar()
    assert.equal(pedidosDe('celular', marca).find(r => r.nome === 'ler_progresso_desde').args.p_cursor, 0)
    marca = registro.length
    await celular.sincronizar(); await celular.esperar()
    assert.ok(pedidosDe('celular', marca).filter(r => r.nome === 'ler_progresso_desde').every(r => r.args.p_cursor > 0))

    console.log('Sincronia incremental: delta na leitura e no envio, conflito entre dois aparelhos, banco sem a função e reinício passaram.')
  } finally {
    for (const a of aparelhos) await a.w.terminate()
    await rm(pasta, { recursive: true, force: true })
  }
}

async function aparelho() {
  const { pacote, nome } = workerData
  const dados = new Map()
  globalThis.window = new EventTarget()
  window.localStorage = { getItem: k => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, v), removeItem: k => dados.delete(k), key: i => [...dados.keys()][i], get length() { return dados.size } }
  globalThis.document = new EventTarget()
  document.visibilityState = 'visible'
  const nav = { onLine: true }
  // Um dos aparelhos tem Web Locks (uma aba sincroniza por vez); o outro não.
  if (nome === 'pc') nav.locks = { async request(_nome, _opcoes, fn) { return fn({ name: _nome }) } }
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true })
  const m = await import(pacote)
  m.definirUsuarioLocal(USUARIO)
  const pendentes = new Map()
  let seq = 0
  const pedir = pedido => new Promise(resolver => { const id = ++seq; pendentes.set(id, resolver); parentPort.postMessage({ tipo: 'pedido', id, pedido }) })
  const cliente = {
    rpc: (nome, args) => pedir({ op: 'rpc', nome, args }),
    from() {
      const filtros = []
      let intervalo, escrita
      const q = {
        select() { return q }, eq(k, v) { filtros.push([k, v]); return q }, order() { return q }, range(a, b) { intervalo = [a, b]; return q },
        upsert(v) { escrita = v; return q },
        then(ok, erro) { return pedir(escrita ? { op: 'upsert', linhas: escrita } : { op: 'select', filtros, intervalo }).then(ok, erro) },
      }
      return q
    },
  }
  let sync, status
  const iniciar = () => { sync = m.iniciarSincronizacao(cliente, USUARIO, s => { status = s }) }
  async function esperar() {
    for (let i = 0; i < 300; i++) {
      if (status?.estado === 'salvo' && status.pendentes === 0) return
      await new Promise(r => setTimeout(r, 10))
    }
    throw new Error(`não sincronizou: ${JSON.stringify({ ...status, conflitos: undefined })}`)
  }
  const comandos = {
    iniciar, parar: () => sync.parar(), esperar, sincronizar: () => sync.sincronizar(),
    ler: chave => m.ler(chave, null),
    gravar: (chave, valor) => { m.gravar(chave, valor) },
    estado: () => m.ler('sincronia:v1', null),
    online(v) { navigator.onLine = v; if (v) window.dispatchEvent(new Event('online')) },
    // Mesmo roteiro de ContextoConta.reiniciarProgresso.
    reiniciar() {
      sync.parar()
      m.gravar('reinicio:pendente', crypto.randomUUID(), 'nuvem')
      m.gravar('sincronia:v1', m.estadoVazio(), 'nuvem')
      m.limparTudo('nuvem')
      iniciar()
    },
  }
  parentPort.on('message', async msg => {
    if (msg.tipo === 'resposta') { const r = pendentes.get(msg.id); pendentes.delete(msg.id); r(msg.resposta); return }
    try {
      const valor = await comandos[msg.comando](...msg.args)
      parentPort.postMessage({ tipo: 'feito', id: msg.id, valor: valor === undefined ? null : structuredClone(valor) })
    } catch (e) { parentPort.postMessage({ tipo: 'feito', id: msg.id, erro: e?.stack ?? String(e) }) }
  })
}
