/**
 * Retorno dos links enviados por e-mail (confirmação de cadastro e
 * redefinição de senha).
 *
 * O site usa roteamento por hash (#/conta, #/treinar...). O Supabase, porém,
 * devolve alguns resultados no próprio hash: erros (#error=...&error_code=
 * otp_expired) e sessões do fluxo implícito (#access_token=...&type=recovery).
 * Sem tratamento, o roteador lia esse hash como uma rota e mostrava "Página
 * não encontrada". Este módulo é avaliado antes de criar o cliente do
 * Supabase e antes do primeiro render: ele guarda esses parâmetros e limpa o
 * hash na hora, para que nem o roteador nem o cliente os vejam.
 *
 * Também reconhece o formato recomendado para o modelo de e-mail,
 * ?token_hash=...&type=recovery, que funciona mesmo quando o link é aberto em
 * outro navegador ou aparelho (o fluxo PKCE com ?code= só funciona no mesmo
 * navegador em que o pedido foi feito).
 */

export type TipoLink = 'recovery' | 'signup' | 'email' | 'invite' | 'magiclink' | 'email_change'
const TIPOS: readonly string[] = ['recovery', 'signup', 'email', 'invite', 'magiclink', 'email_change']

export interface RetornoAuth {
  /** Sessão entregue no hash (fluxo implícito). */
  tokens?: { access_token: string; refresh_token: string }
  /** Link no formato ?token_hash=...&type=... */
  tokenHash?: { token_hash: string; type: TipoLink }
  /** Código de erro devolvido pelo Supabase (otp_expired, access_denied...). */
  erro?: string
  /** O link era de redefinição de senha. */
  recuperacao: boolean
}

function capturar(): RetornoAuth | null {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL(window.location.href)
    const bruto = url.hash.replace(/^#/, '')
    // Hash de rota do próprio site começa com "/"; parâmetros do Supabase, não.
    const hash = bruto && !bruto.startsWith('/') && bruto.includes('=') ? new URLSearchParams(bruto) : null
    const busca = url.searchParams
    const ler = (chave: string) => busca.get(chave) ?? hash?.get(chave) ?? null
    const tipo = ler('type')
    const erro = ler('error_code') ?? ler('error')
    const access = hash?.get('access_token'), refresh = hash?.get('refresh_token')
    const tokenHash = busca.get('token_hash')
    if (!hash && !erro && !tokenHash) return null
    const retorno: RetornoAuth = {
      recuperacao: tipo === 'recovery' || busca.get('conta') === 'recuperar',
      ...(erro ? { erro } : {}),
      ...(access && refresh ? { tokens: { access_token: access, refresh_token: refresh } } : {}),
      ...(tokenHash && tipo && TIPOS.includes(tipo) ? { tokenHash: { token_hash: tokenHash, type: tipo as TipoLink } } : {}),
    }
    // Limpa o endereço já: o roteador nunca vê o hash de parâmetros e os
    // tokens não ficam no histórico do navegador.
    for (const chave of ['token_hash', 'type', 'error', 'error_code', 'error_description']) url.searchParams.delete(chave)
    if (hash) url.hash = '/conta'
    window.history.replaceState(null, '', url.href)
    return retorno
  } catch {
    return null
  }
}

const capturado: RetornoAuth | null = capturar()

/** Retorno capturado ao carregar a página (null se a página não veio de um link de e-mail). */
export function retornoAuth(): RetornoAuth | null { return capturado }

let validacao: Promise<boolean> | null = null
/**
 * Valida o link uma única vez por carregamento, mesmo que o efeito que a pede
 * rode duas vezes (StrictMode, remontagem): um token de e-mail só vale uma vez.
 */
export function validarRetornoUmaVez(executar: () => Promise<boolean>): Promise<boolean> {
  validacao ??= executar().catch(() => false)
  return validacao
}

let aviso = ''
/** Mensagem para a página da conta mostrar depois de um retorno com problema. */
export function definirAvisoConta(texto: string) { aviso = texto }
export function avisoConta(): string { return aviso }

export function textoErroLink(codigo: string, recuperacao: boolean): string {
  const oque = recuperacao ? 'de redefinição de senha' : 'de confirmação'
  if (codigo === 'otp_expired') return `Este link ${oque} expirou ou já foi usado. Peça um novo link abaixo e abra o mais recente.`
  if (codigo === 'navegador') return `Não foi possível abrir o link ${oque} neste navegador. Abra o link no mesmo navegador em que fez o pedido, ou peça um novo link abaixo.`
  return `O link ${oque} não pôde ser aceito. Peça um novo link abaixo e tente novamente.`
}
