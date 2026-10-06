/**
 * De onde veio quem cria a conta (anúncio, bio do Instagram, Google, link de
 * um colega…). Na chegada ao site, o endereço com utm_source/utm_medium/
 * utm_campaign (o link marcado do anúncio) ou, sem ele, o site de onde a
 * pessoa veio fica guardado neste aparelho. No cadastro, vai junto com o
 * perfil (metadados da conta, campo "origem") e o painel do administrador
 * conta os cadastros por origem. Não usa cookie nem sai do site: é a mesma
 * informação que o próprio endereço do link carrega.
 *
 * Exemplos de link marcado:
 *   ortoquestoes.com.br/?utm_source=instagram&utm_medium=anuncio&utm_campaign=teot-tepot
 *   ortoquestoes.com.br/?utm_source=instagram&utm_medium=bio
 */

// Fora do prefixo "ortoquestoes:", que é apagado quando o visitante não tem conta.
const CHAVE = 'oq-origem'
/** O primeiro contato vale por 30 dias: depois disso, uma nova chegada substitui. */
const VALIDADE = 30 * 86_400_000

export interface Origem {
  fonte: string
  meio?: string
  campanha?: string
  conteudo?: string
  /** Chegou por um link marcado (utm), e não só pelo site de origem. */
  marcada?: boolean
  /** Primeira página aberta no site. */
  pagina?: string
  em: string
}

const texto = (v: string | null | undefined, minusculo = false) => {
  const t = (v ?? '').trim().slice(0, 80)
  return t ? (minusculo ? t.toLowerCase() : t) : undefined
}

/** Site de origem (document.referrer) em nome legível; null quando é o próprio site ou não há. */
function fontePorReferencia(referencia: string): { fonte: string; meio: string } | null {
  let host = ''
  try { host = new URL(referencia).hostname.replace(/^www\./, '') } catch { return null }
  if (!host || host === location.hostname.replace(/^www\./, '')) return null
  if (/(^|\.)instagram\.com$/.test(host)) return { fonte: 'instagram', meio: 'link' }
  if (/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(host)) return { fonte: 'facebook', meio: 'link' }
  if (/(^|\.)google\./.test(host)) return { fonte: 'google', meio: 'busca' }
  if (/(^|\.)bing\.com$|duckduckgo\.com$|search\.yahoo\.com$/.test(host)) return { fonte: host.split('.').slice(-2, -1)[0], meio: 'busca' }
  if (/whatsapp\.com$|wa\.me$/.test(host)) return { fonte: 'whatsapp', meio: 'link' }
  if (/(^|\.)t\.co$|twitter\.com$|x\.com$/.test(host)) return { fonte: 'x', meio: 'link' }
  if (/youtube\.com$|youtu\.be$/.test(host)) return { fonte: 'youtube', meio: 'link' }
  return { fonte: host, meio: 'link' }
}

function ler(): Origem | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    const o = bruto ? (JSON.parse(bruto) as Origem) : null
    return o && typeof o.fonte === 'string' && typeof o.em === 'string' ? o : null
  } catch { return null }
}

/** Chamada uma vez, ao abrir o site, antes de qualquer troca de endereço. */
export function capturarOrigem(): void {
  try {
    // utm na busca (?utm_source=…) ou depois do # (#/?utm_source=…).
    const p = new URLSearchParams(location.search)
    const depoisDoHash = location.hash.split('?')[1]
    if (depoisDoHash) new URLSearchParams(depoisDoHash).forEach((v, k) => { if (!p.has(k)) p.set(k, v) })

    const fonte = texto(p.get('utm_source'), true)
    let nova: Omit<Origem, 'em' | 'pagina'> | null = null
    if (fonte) {
      nova = { fonte, meio: texto(p.get('utm_medium'), true), campanha: texto(p.get('utm_campaign')), conteudo: texto(p.get('utm_content')), marcada: true }
    } else if (p.has('fbclid')) {
      // O Instagram e o Facebook acrescentam fbclid a todo link clicado lá dentro.
      nova = { fonte: 'instagram/facebook', meio: 'link' }
    } else if (document.referrer) {
      nova = fontePorReferencia(document.referrer)
    }
    if (!nova) return

    const atual = ler()
    const atualValida = atual && Date.now() - Date.parse(atual.em) < VALIDADE
    // Vale o primeiro contato; só um link marcado substitui uma origem que veio sem marcação.
    if (atualValida && (atual.marcada || !nova.marcada)) return

    const pagina = location.hash.replace(/^#/, '').split('?')[0] || '/'
    localStorage.setItem(CHAVE, JSON.stringify({ ...nova, pagina, em: new Date().toISOString() }))
  } catch { /* armazenamento indisponível: o cadastro sai como "direto" */ }
}

/** Para os metadados do cadastro. Sem origem guardada, a conta fica como acesso direto. */
export function dadosOrigem(): { origem: Origem } {
  const o = ler()
  if (o && Date.now() - Date.parse(o.em) < VALIDADE) return { origem: o }
  return { origem: { fonte: 'direto', em: new Date().toISOString() } }
}
