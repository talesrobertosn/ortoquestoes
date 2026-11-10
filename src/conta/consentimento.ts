/**
 * Cookies de medição de anúncios (Meta e OpenAI) e o consentimento da pessoa.
 *
 * O pixel só é carregado depois de "Aceitar" no aviso de cookies; quem recusa
 * (ou ainda não escolheu) não baixa nenhum dos dois pixels. A escolha fica guardada neste
 * aparelho e pode ser trocada a qualquer momento pelo link "Cookies" do rodapé.
 *
 * O número do pixel fica em PIXEL_PADRAO; a variável VITE_META_PIXEL_ID da
 * publicação (GitHub, Settings > Secrets and variables > Actions > Variables),
 * se existir, tem prioridade.
 */

// Fora do prefixo "ortoquestoes:", que é apagado quando o visitante não tem conta.
const CHAVE = 'oq-cookies'
/** Muda se a lista do que é medido mudar, para perguntar de novo. */
const VERSAO = 2
/** Pixel (conjunto de dados) do Orto Questões no Meta. Não é segredo: aparece no código de qualquer site com pixel. */
const PIXEL_PADRAO = '1631525295341827'
export const PIXEL_META = String(import.meta.env.VITE_META_PIXEL_ID ?? '').trim() || PIXEL_PADRAO
/** Identificador público fornecido no Ads Manager; não é uma chave de API. */
export const PIXEL_OPENAI = String(import.meta.env.VITE_OPENAI_PIXEL_ID ?? '').trim() || 'Gk93oxGio9qeR7y5bs4Wop'
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
  else {
    window.fbq?.('consent', 'revoke')
    window.oaiq?.('consent', false)
  }
}

/** Reabre o aviso (link "Cookies" do rodapé). */
export const abrirPreferenciasCookies = () => window.dispatchEvent(new Event(EVENTO_ABRIR_COOKIES))

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

let iniciado = false
let openaiIniciado = false
let ouvindoNavegacao = false
/** Carrega os dois SDKs após o aceite e mede a navegação SPA sem reinstalá-los. */
export function iniciarPixel() {
  if (lerConsentimento() !== 'aceito') return
  iniciarMeta()
  iniciarOpenAI()
  if (!ouvindoNavegacao) {
    ouvindoNavegacao = true
    window.addEventListener('hashchange', () => {
      if (lerConsentimento() !== 'aceito') return
      window.fbq?.('track', 'PageView')
      paginaOpenAI()
    })
  }
}

function iniciarMeta() {
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
}

/** Evento padrão do Meta (cadastro, início de compra). Só sai com o consentimento dado. */
export function eventoMeta(nome: 'CompleteRegistration' | 'AddToCart' | 'InitiateCheckout', dados?: Record<string, unknown>) {
  if (!PIXEL_META || lerConsentimento() !== 'aceito' || !window.fbq) return
  window.fbq('track', nome, dados)
}


/** SDK oficial: https://developers.openai.com/ads/measurement-pixel */
type Oaiq = ((...args: unknown[]) => void) & { q?: unknown[][] }
declare global { interface Window { oaiq?: Oaiq } }

function iniciarOpenAI() {
  if (!PIXEL_OPENAI || lerConsentimento() !== 'aceito') return
  if (openaiIniciado) { window.oaiq?.('consent', true); return }
  openaiIniciado = true
  if (!window.oaiq) {
    const fila: Oaiq = (...args: unknown[]) => { fila.q!.push(args) }
    fila.q = []
    window.oaiq = fila
    const s = document.createElement('script')
    s.async = true
    s.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js'
    document.head.appendChild(s)
  }
  // Consentimento explícito antes de init. A correspondência automática é configurada
  // no Ads Manager; o aviso de cookies e os Termos descrevem esse tratamento.
  window.oaiq('consent', false)
  window.oaiq('init', { pixelId: PIXEL_OPENAI, debug: import.meta.env.DEV })
  window.oaiq('consent', true)
  paginaOpenAI()
}

function paginaOpenAI() {
  if (lerConsentimento() !== 'aceito' || /^#\/admin(?:[/?]|$)/.test(window.location.hash)) return
  // Não encaminha hash, parâmetros, tokens de autenticação ou assunto estudado.
  window.oaiq?.('measure', 'page_viewed', { type: 'contents' }, { opt_out: true })
}

/** Mesmos marcos do funil para Meta e ChatGPT Ads, sempre depois do consentimento. */
export function eventoAnuncio(nome: 'CompleteRegistration' | 'AddToCart' | 'InitiateCheckout', dados?: Record<string, unknown>) {
  if (lerConsentimento() !== 'aceito') return
  iniciarPixel()
  eventoMeta(nome, dados)
  if (nome === 'CompleteRegistration') {
    window.oaiq?.('measure', 'registration_completed', { type: 'customer_action' }, { opt_out: true })
    return
  }
  const valor = typeof dados?.value === 'number' ? dados.value : NaN
  if (!Number.isFinite(valor) || valor < 0) return
  // A OpenAI recebe centavos inteiros; o Meta continua recebendo reais.
  const evento = nome === 'AddToCart' ? 'items_added' : 'checkout_started'
  window.oaiq?.('measure', evento, { type: 'contents', amount: Math.round(valor * 100), currency: 'BRL' }, { opt_out: true })
}
