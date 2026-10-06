/**
 * Cookies de medição de anúncios (pixel do Meta) e o consentimento da pessoa.
 *
 * O pixel só é carregado depois de "Aceitar" no aviso de cookies; quem recusa
 * (ou ainda não escolheu) não baixa nada do Meta. A escolha fica guardada neste
 * aparelho e pode ser trocada a qualquer momento pelo link "Cookies" do rodapé.
 *
 * O número do pixel fica em PIXEL_PADRAO; a variável VITE_META_PIXEL_ID da
 * publicação (GitHub, Settings > Secrets and variables > Actions > Variables),
 * se existir, tem prioridade.
 */

// Fora do prefixo "ortoquestoes:", que é apagado quando o visitante não tem conta.
const CHAVE = 'oq-cookies'
/** Muda se a lista do que é medido mudar, para perguntar de novo. */
const VERSAO = 1
/** Pixel (conjunto de dados) do Orto Questões no Meta. Não é segredo: aparece no código de qualquer site com pixel. */
const PIXEL_PADRAO = '1631525295341827'
export const PIXEL_META = String(import.meta.env.VITE_META_PIXEL_ID ?? '').trim() || PIXEL_PADRAO
export const EVENTO_ABRIR_COOKIES = 'ortoquestoes:abrir-cookies'

export type Escolha = 'aceito' | 'recusado'

export function lerConsentimento(): Escolha | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    const v = bruto ? (JSON.parse(bruto) as { escolha?: Escolha; versao?: number }) : null
    return v && v.versao === VERSAO && (v.escolha === 'aceito' || v.escolha === 'recusado') ? v.escolha : null
  } catch { return null }
}

export function definirConsentimento(escolha: Escolha) {
  try { localStorage.setItem(CHAVE, JSON.stringify({ escolha, versao: VERSAO, em: new Date().toISOString() })) } catch { /* vale só nesta visita */ }
  if (escolha === 'aceito') iniciarPixel()
  else if (window.fbq) window.fbq('consent', 'revoke')
}

/** Reabre o aviso (link "Cookies" do rodapé). */
export const abrirPreferenciasCookies = () => window.dispatchEvent(new Event(EVENTO_ABRIR_COOKIES))

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

let iniciado = false
/** Carrega o pixel (código padrão do Meta) e conta a página atual e cada troca de página. */
export function iniciarPixel() {
  if (!PIXEL_META || lerConsentimento() !== 'aceito') return
  if (iniciado) { window.fbq?.('consent', 'grant'); return }
  iniciado = true
  if (!window.fbq) {
    const f: Fbq = function (...args: unknown[]) {
      if (f.callMethod) f.callMethod(...args)
      else f.queue!.push(args)
    } as Fbq
    f.push = f; f.loaded = true; f.version = '2.0'; f.queue = []
    window.fbq = f; window._fbq = f
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(s)
  }
  window.fbq('init', PIXEL_META)
  window.fbq('track', 'PageView')
  window.addEventListener('hashchange', () => window.fbq?.('track', 'PageView'))
}

/** Evento padrão do Meta (cadastro, início de compra). Só sai com o consentimento dado. */
export function eventoMeta(nome: 'CompleteRegistration' | 'InitiateCheckout', dados?: Record<string, unknown>) {
  if (!PIXEL_META || lerConsentimento() !== 'aceito' || !window.fbq) return
  window.fbq('track', nome, dados)
}
