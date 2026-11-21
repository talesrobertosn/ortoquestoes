/**
 * O modo Natal (Tales, 21/11/2026): o lugar único que diz se os enfeites de Natal estão no ar.
 * Plano e lista de páginas em docs/design/MODO-NATAL.md.
 *
 * - Liga sozinho de 21/11 ao Dia de Reis (6/1), no horário de Brasília, todo ano.
 * - `MODO_NATAL.ligado = false` desliga TUDO na hora, até os cenários de Natal do topo (o "desligar depois do Natal").
 * - Para testar antes: `?natal=1` na URL liga neste aparelho (fica guardado), `?natal=0` força desligado e
 *   `?natal=auto` volta a seguir a data.
 * - O CSS pergunta por `<html data-natal="sim">`; o código, por `modoNatalAtivo()`.
 */
export const MODO_NATAL = {
  /** A chave geral. Com false, nada de Natal aparece, nem dentro do período. */
  ligado: true,
  /**
   * No ar para todos? (Tales, 21/11/2026: os enfeites saíram do site; voltam só com a confirmação dele.) Com false, o
   * modo Natal só aparece em quem testa com `?natal=1`; os cenários de Natal do topo seguem a época deles, como antes.
   */
  noAr: false,
  /** [mês, dia] de começo e de fim (inclusive); vira o ano. */
  de: [11, 21] as const,
  ate: [1, 6] as const,
}

const CHAVE = 'oq:natal'
type Forcado = 'sim' | 'nao' | null

const relogio = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', month: '2-digit', day: '2-digit' })

/** O dia de hoje em Brasília, como mês e dia. */
function mesDiaBrasilia(agora: Date): [number, number] {
  const p = Object.fromEntries(relogio.formatToParts(agora).map((v) => [v.type, v.value]))
  return [Number(p.month), Number(p.day)]
}

/** A data está dentro do período do Natal? (só a data; a chave geral e a prévia ficam de fora) */
export function noPeriodoDoNatal(agora = new Date()): boolean {
  const [m, d] = mesDiaBrasilia(agora)
  const v = m * 100 + d, de = MODO_NATAL.de[0] * 100 + MODO_NATAL.de[1], ate = MODO_NATAL.ate[0] * 100 + MODO_NATAL.ate[1]
  return de <= ate ? v >= de && v <= ate : v >= de || v <= ate
}

/** A prévia de quem testa: lê `?natal=` da URL (e do hash) e guarda no aparelho. */
function forcado(): Forcado {
  try {
    if (typeof location === 'undefined') return null
    const pedido = new URLSearchParams(location.search).get('natal')
      ?? new URLSearchParams(location.hash.split('?')[1] ?? '').get('natal')
    if (pedido === '1' || pedido === 'sim') localStorage.setItem(CHAVE, 'sim')
    else if (pedido === '0' || pedido === 'nao') localStorage.setItem(CHAVE, 'nao')
    else if (pedido === 'auto') localStorage.removeItem(CHAVE)
    const salvo = localStorage.getItem(CHAVE)
    return salvo === 'sim' || salvo === 'nao' ? salvo : null
  } catch { return null }
}

/** O modo Natal está no ar agora? Chave geral, depois a prévia do aparelho, depois a data. */
export function modoNatalAtivo(agora = new Date()): boolean {
  if (!MODO_NATAL.ligado) return false
  const f = forcado()
  if (f) return f === 'sim'
  return MODO_NATAL.noAr && noPeriodoDoNatal(agora)
}

/** Marca o `<html>` com `data-natal="sim"` quando o modo está ativo (chamado uma vez, ao abrir o site). */
export function aplicarModoNatal(): void {
  try {
    if (modoNatalAtivo()) document.documentElement.dataset.natal = 'sim'
    else delete document.documentElement.dataset.natal
  } catch { /* sem janela */ }
}
