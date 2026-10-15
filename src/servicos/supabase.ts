import { PREFIXO_ARMAZENAMENTO } from '../config'
import { supabase as clienteConta, chave as chaveSupabase, url as urlConta } from '../conta/supabase'

const url = urlConta.replace(/\/+$/, '')

// O login antigo guardava uma cópia própria da sessão. Hoje a única sessão é a
// do cliente de conta; a cópia que tenha sobrado em algum navegador é apagada.
try { localStorage.removeItem(PREFIXO_ARMAZENAMENTO + 'auth:sessao') } catch { /* armazenamento indisponível */ }

// Token da sessão do cliente de conta, mantido pelos próprios eventos de
// autenticação. Ler daqui é imediato: `auth.getSession()` passa por uma trava
// interna do supabase-js que, no Chrome, pode ficar presa (renovação pendente,
// outra aba), e com ela o botão de responder parecia não fazer nada.
let tokenConta: { token: string; expiraEm: number } | null = null

if (clienteConta) {
  clienteConta.auth.onAuthStateChange((_evento, sessao) => {
    tokenConta = sessao ? { token: sessao.access_token, expiraEm: (sessao.expires_at ?? 0) * 1000 } : null
  })
}

async function tokenDoClienteConta(): Promise<string | null> {
  if (!clienteConta) return null
  const limite = new Promise<null>((resolver) => setTimeout(() => resolver(null), 4_000))
  const leitura = clienteConta.auth.getSession().then(({ data }) => data.session?.access_token ?? null).catch(() => null)
  return Promise.race([leitura, limite])
}

async function garantirToken(forcarLeitura = false) {
  if (!forcarLeitura && tokenConta && tokenConta.expiraEm > Date.now() + 30_000) return tokenConta.token
  return tokenDoClienteConta()
}

/** fetch com prazo: rede lenta não pode deixar um botão travado para sempre. */
async function buscarComPrazo(endereco: string, opcoes: RequestInit, prazoMs = 8_000, sinal?: AbortSignal): Promise<Response> {
  const controle = new AbortController()
  const temporizador = setTimeout(() => controle.abort(), prazoMs)
  // Quem chamou também pode desistir (tela fechada, pedido substituído).
  const desistir = () => controle.abort()
  if (sinal?.aborted) controle.abort()
  sinal?.addEventListener('abort', desistir)
  try {
    return await fetch(endereco, { ...opcoes, signal: controle.signal })
  } finally {
    clearTimeout(temporizador)
    sinal?.removeEventListener('abort', desistir)
  }
}

/**
 * Falha de RPC. A mensagem continua a de sempre (com o status entre
 * parênteses); `codigo` traz o motivo levantado pela função no banco, como
 * "premium_necessario" ou "ja_entregue", para a tela decidir o que mostrar.
 */
export class ErroRpc extends Error {
  constructor(mensagem: string, readonly status: number, readonly codigo: string) { super(mensagem) }
}

/** Opções de uma RPC: `sinal` cancela o pedido; `prazoMs` alonga o prazo de consultas pesadas do painel. */
export interface OpcoesRpc { sinal?: AbortSignal; prazoMs?: number }

export async function chamarRpc<T>(nome: string, corpo: Record<string, unknown>, { sinal, prazoMs }: OpcoesRpc = {}): Promise<T> {
  if (!clienteConta) throw new Error('Servidor não configurado.')
  const enviar = async (forcarLeitura: boolean) => {
    const token = await garantirToken(forcarLeitura)
    if (!token) throw new Error('Entre na sua conta para continuar.')
    return buscarComPrazo(`${url}/rest/v1/rpc/${nome}`, {
      method: 'POST',
      headers: { apikey: chaveSupabase, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    }, prazoMs, sinal)
  }
  let resposta = await enviar(false)
  // Token recusado (expirou entre a leitura e o envio): tenta uma vez com a sessão relida.
  if (resposta.status === 401) resposta = await enviar(true)
  if (!resposta.ok) {
    const detalhe = await resposta.json().then((d: { message?: string }) => d.message ?? '').catch(() => '')
    throw new ErroRpc(`O servidor não pôde validar a resposta (${resposta.status}).`, resposta.status, detalhe)
  }
  return await resposta.json() as T
}

/** O motivo que a função do banco levantou, ou '' quando a falha foi de rede. */
export const codigoErro = (falha: unknown) => falha instanceof ErroRpc ? falha.codigo : ''

/** Mensagem UTF-8 lida como Latin-1 ("pÃ¡gina"): devolve a acentuação certa. */
function repararAcentos(texto?: string): string | undefined {
  if (!texto || !/Ã.|Â./.test(texto)) return texto
  try { return decodeURIComponent(escape(texto)) } catch { return texto }
}

export async function chamarFuncao<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  if (!clienteConta) throw new Error('Servidor não configurado.')
  const token = await garantirToken()
  if (!token) throw new Error('Entre na sua conta para continuar.')
  const resposta = await buscarComPrazo(`${url}/functions/v1/${nome}`, {
    method: 'POST', headers: { apikey: chaveSupabase, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  }, 20_000)
  const dados = await resposta.json().catch(() => ({})) as T & { erro?: string }
  if (!resposta.ok) throw new Error(repararAcentos(dados.erro) ?? 'Não foi possível concluir a operação.')
  return dados
}

/**
 * Chamadas que não exigem conta: só a chave publicável. Servem ao aviso do
 * topo do site (lido por visitantes) e ao link de descadastro dos e-mails.
 */
export async function chamarRpcPublica<T>(nome: string, corpo: Record<string, unknown> = {}): Promise<T> {
  const resposta = await buscarComPrazo(`${url}/rest/v1/rpc/${nome}`, {
    method: 'POST', headers: { apikey: chaveSupabase, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  })
  if (!resposta.ok) throw new Error(`(${resposta.status})`)
  return await resposta.json() as T
}
export async function chamarFuncaoPublica<T>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  const resposta = await buscarComPrazo(`${url}/functions/v1/${nome}`, {
    method: 'POST', headers: { apikey: chaveSupabase, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  }, 20_000)
  const dados = await resposta.json().catch(() => ({})) as T & { erro?: string }
  if (!resposta.ok) throw new Error(dados.erro ?? `(${resposta.status})`)
  return dados
}

/**
 * Envia uma imagem ao Storage (bucket público "questoes") e devolve o endereço
 * público. Só administrador consegue gravar: a política do bucket confere.
 */
export async function enviarImagemQuestao(caminho: string, arquivo: Blob): Promise<string> {
  if (!clienteConta) throw new Error('Servidor não configurado.')
  const token = await garantirToken()
  if (!token) throw new Error('Entre na sua conta para continuar.')
  const alvo = caminho.split('/').map(encodeURIComponent).join('/')
  const resposta = await buscarComPrazo(`${url}/storage/v1/object/questoes/${alvo}`, {
    method: 'POST',
    headers: { apikey: chaveSupabase, Authorization: `Bearer ${token}`, 'Content-Type': arquivo.type || 'application/octet-stream', 'x-upsert': 'true' },
    body: arquivo,
  }, 60_000)
  if (!resposta.ok) {
    const detalhe = await resposta.json().then((d: { message?: string; error?: string }) => d.message ?? d.error ?? '').catch(() => '')
    const texto = detalhe.toLowerCase()
    if (texto.includes('bucket not found')) throw new Error('O espaço de imagens "questoes" ainda não existe no Supabase. Rode o SQL do editor de questões (202610050100_editor_questoes.sql).')
    if (texto.includes('row-level security') || texto.includes('permission denied') || resposta.status === 403) throw new Error('O Supabase recusou o envio: confira se rodou os SQL do editor de questões (202610050100 e 202610050200) e se sua conta está na tabela de administradores.')
    if (resposta.status === 413 || texto.includes('size')) throw new Error('A imagem passa do limite de 5 MB.')
    if (resposta.status === 415 || texto.includes('mime')) throw new Error('Formato de imagem não aceito. Use JPG, PNG, WebP ou GIF.')
    throw new Error(`Não foi possível enviar a imagem (${resposta.status}${detalhe ? ': ' + detalhe : ''}).`)
  }
  return `${url}/storage/v1/object/public/questoes/${alvo}`
}
