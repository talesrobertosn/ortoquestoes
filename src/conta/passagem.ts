/**
 * Para onde levar a pessoa depois de entrar ou criar a conta.
 *
 * Os convites de criar conta (planos, treinar, cronograma, questão avulsa)
 * mandam `voltar=` na rota de /conta. Entrar com senha usa na hora; o
 * cadastro, porém, termina longe dali: na volta do link de confirmação (que
 * pode abrir em outra aba) ou na volta do Google. Por isso o destino fica
 * guardado neste navegador até a sessão chegar, e quem cuida da volta o retira.
 */

const CHAVE = 'ortoquestoes:voltar-depois'
// O link de confirmação costuma ser aberto em minutos, às vezes no dia seguinte.
const VALIDADE_MS = 24 * 60 * 60 * 1000

/** Só rotas internas, e nunca a própria página de conta (seria voltar para o formulário). */
export function rotaVoltar(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//')) return null
  if (valor === '/' || valor === '/conta' || valor.startsWith('/conta?') || valor.startsWith('/conta/')) return null
  return valor
}

/** Rota atual, pronta para ir em `voltar=`; null na capa e na própria conta. */
export function voltarDaqui(): string | null {
  return rotaVoltar(window.location.hash.replace(/^#/, '') || '/')
}

/** Link para /conta no modo pedido, levando a rota atual (ou a indicada) em `voltar=`. */
export function linkConta(modo: 'entrar' | 'criar' | 'recuperar', voltar: string | null = voltarDaqui()): string {
  const destino = rotaVoltar(voltar)
  return `/conta?modo=${modo}${destino ? `&voltar=${encodeURIComponent(destino)}` : ''}`
}

export function guardarVoltar(valor: string | null | undefined) {
  const rota = rotaVoltar(valor)
  try {
    if (rota) localStorage.setItem(CHAVE, JSON.stringify({ rota, em: Date.now() }))
    else localStorage.removeItem(CHAVE)
  } catch { /* sem armazenamento: volta para o padrão */ }
}

/** Retira o destino guardado (vale uma vez). */
export function tomarVoltar(): string | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    localStorage.removeItem(CHAVE)
    const { rota, em } = JSON.parse(bruto) as { rota?: string; em?: number }
    return em && Date.now() - em < VALIDADE_MS ? rotaVoltar(rota) : null
  } catch { return null }
}

// E-mail digitado no pop-up de entrar, levado para "Esqueceu a senha?" na
// página de conta. Fica só na memória da aba: e-mail não vai para o endereço.
let emailLevado = ''
export function levarEmail(email: string) { emailLevado = email.trim() }
export function emailTrazido(): string { return emailLevado }
export function esquecerEmailTrazido() { emailLevado = '' }
