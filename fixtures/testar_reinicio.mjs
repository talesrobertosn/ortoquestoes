import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const pasta = await mkdtemp(join(tmpdir(), 'orto-reinicio-'))
const dados = new Map()
globalThis.window = new EventTarget()
window.localStorage = { getItem: k => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, v), removeItem: k => dados.delete(k), key: i => [...dados.keys()][i], get length() { return dados.size } }
globalThis.document = new EventTarget()
document.visibilityState = 'visible'
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true })
let sync
try {
  const arquivo = join(pasta, 'sync.mjs')
  await build({ stdin: { contents: `export * from './src/conta/sincronizacao'; export * from './src/conta/modeloSync'; export * from './src/estado/armazenamento';`, resolveDir: process.cwd() }, outfile: arquivo, bundle: true, platform: 'node', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"', 'import.meta.env.DEV': 'false' } })
  const m = await import(pathToFileURL(arquivo))
  const usuario = 'teste-conta'
  m.definirUsuarioLocal(usuario)
  let versao = 0
  let falhar = false
  const linhas = Array.from({ length: 510 }, (_, i) => ({ usuario_id: usuario, tipo: 'respondidas', item: `q${i}`, valor: { c: true, q: 1 }, operacao: crypto.randomUUID(), versao: ++versao }))
  linhas.push({ usuario_id: 'outra-conta', tipo: 'notas', item: 'privada', valor: 'preservar', operacao: crypto.randomUUID(), versao: ++versao })
  const cliente = {
    rpc: async () => ({ data: null, error: { code: 'PGRST202' } }),
    from() {
      const filtros = []
      let escrita, intervalo
      const q = {
        select() { return q }, eq(k, v) { filtros.push([k, v]); return q }, order() { return q }, range(a, b) { intervalo = [a, b]; return q },
        upsert(v) { escrita = Array.isArray(v) ? v : [v]; return q },
        then(ok, erro) {
          return Promise.resolve().then(() => {
            if (falhar) return { data: null, error: { message: 'Falha temporária' } }
            if (escrita) {
              for (const linha of escrita) {
                assert.match(linha.item, /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/)
                assert.equal(linha.usuario_id, usuario)
                const atual = linhas.find(l => l.usuario_id === linha.usuario_id && l.tipo === linha.tipo && l.item === linha.item)
                if (atual) Object.assign(atual, linha) // fallback não incrementa a identidade
                else linhas.push({ ...linha, versao: ++versao })
              }
              return { data: escrita.map(e => ({ ...linhas.find(l => l.usuario_id === e.usuario_id && l.tipo === e.tipo && l.item === e.item) })), error: null }
            }
            let lista = linhas.filter(l => filtros.every(([k, v]) => l[k] === v)).sort((a, b) => a.versao - b.versao)
            if (intervalo) lista = lista.slice(intervalo[0], intervalo[1] + 1)
            return { data: lista.map(l => ({ ...l })), error: null }
          }).then(ok, erro)
        },
      }
      return q
    },
  }
  let status
  const iniciar = () => { sync = m.iniciarSincronizacao(cliente, usuario, s => { status = s }) }
  const esperar = async () => {
    for (let i = 0; i < 100 && status?.estado !== 'salvo'; i++) await new Promise(r => setTimeout(r, 10))
    assert.equal(status?.estado, 'salvo')
  }
  iniciar(); await esperar()
  assert.equal(Object.keys(m.ler('respondidas', {})).length, 510)
  sync.parar()
  // Reinício offline sobrevive a recarregamento e protege estudo novo.
  navigator.onLine = false
  m.gravar('reinicio:pendente', crypto.randomUUID(), 'nuvem')
  m.gravar('sincronia:v1', m.estadoVazio(), 'nuvem')
  m.limparTudo('nuvem')
  iniciar()
  m.gravar('respondidas', { q0: { c: false, q: 2 } })
  sync.parar(); iniciar()
  assert.equal(status.estado, 'offline')
  navigator.onLine = true
  await sync.sincronizar(); await esperar()
  assert.deepEqual(m.ler('respondidas', {}), { q0: { c: false, q: 2 } })
  assert.equal(m.ler('reinicio:pendente', null), null)
  // Reinício remoto deve ser visto antes dos dados, mesmo na página 2.
  sync.parar()
  const token = crypto.randomUUID()
  linhas.push({ usuario_id: usuario, tipo: 'historico', item: `reinicio.v2.${token}`, valor: { id: `reinicio.v2.${token}`, descricao: 'reinício', concluidaEm: 1 }, operacao: token, versao: ++versao })
  m.gravar('sessao:atual', { ids: ['q0'] }, 'nuvem')
  iniciar(); await esperar()
  assert.deepEqual(m.ler('respondidas', {}), {})
  assert.equal(m.ler('sessao:atual', 'não apagada'), null)
  await sync.sincronizar()
  assert.deepEqual(m.ler('respondidas', {}), {})
  assert.equal(linhas.find(l => l.usuario_id === 'outra-conta').valor, 'preservar')
  // Um dispositivo antigo gravando depois do reinício continua fora da geração atual.
  linhas.push({ usuario_id: usuario, tipo: 'notas', item: 'antiga', valor: 'não reativar', operacao: crypto.randomUUID(), versao: ++versao })
  await sync.sincronizar()
  assert.deepEqual(m.ler('notas', {}), {})
  sync.parar()
  const segundoToken = crypto.randomUUID()
  m.gravar('reinicio:pendente', segundoToken, 'nuvem')
  m.gravar('sincronia:v1', m.estadoVazio(), 'nuvem')
  m.limparTudo('nuvem')
  falhar = true; iniciar()
  await new Promise(r => setTimeout(r, 20))
  assert.equal(status.estado, 'erro')
  assert.equal(m.ler('reinicio:pendente', null), segundoToken)
  assert.deepEqual(m.ler('respondidas', {}), {})
  falhar = false
  await sync.sincronizar(); await esperar()
  m.gravar('notas', { nova: 'após segundo reinício' })
  await esperar()
  sync.parar(); iniciar(); await esperar()
  assert.deepEqual(m.ler('notas', {}), { nova: 'após segundo reinício' })
  assert.deepEqual(m.ler('respondidas', {}), {})
  console.log('Reinício: RPC ausente, offline, F5, paginação, sessão antiga e isolamento de conta passaram.')
} finally { sync?.parar(); await rm(pasta, { recursive: true, force: true }) }
