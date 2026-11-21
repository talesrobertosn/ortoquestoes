/**
 * Prévia dos resumos para quem não é assinante (pedido do Tales, 09/11/2026; substitui a porta das 6 partes
 * para visitantes, de 19/10/2026). Visitante e conta grátis leem o começo de cada resumo; dali em diante, a
 * paywall convida a assinar. Assinante (e cortesia, administrador) lê tudo.
 *
 * Desde 20/11/2026 (Tales) o leitor diz até que parte a prévia vai ("vai até a parte 2 de 13"). O ponto de corte vem pronto no
 * capítulo (`corte`, o id do último bloco aberto, calculado em scripts/biblioteca/gerar.mjs) e é o mesmo das
 * páginas públicas do Google (/resumos/<id>/), que também param ali.
 */

interface BlocoMinimo { id: string; tipo?: string }
interface SecaoMinima { id: string; titulo: string; blocos: BlocoMinimo[] }
interface CapituloMinimo<S extends SecaoMinima> { secoes: S[]; corte?: string | null; minutos?: number }

export interface Porta<S extends SecaoMinima = SecaoMinima> {
  /** Há paywall neste resumo para esta pessoa. */
  fechado: boolean
  /** As seções que aparecem; com a paywall, a última pode vir cortada (só os blocos abertos). */
  secoes: S[]
  /** Seções que ainda faltam, inteiras ou na continuação da seção cortada (para "O que vem a seguir"). */
  restantes: Array<{ id: string; titulo: string; continua: boolean }>
  /** Fração do texto que aparece (para o progresso da leitura); 1 sem paywall. */
  fracao: number
  /** O endereço pedido (?bloco=) caiu na parte fechada: a seção (e a posição dela: 1, 2, 3…). */
  pedida: { secao: SecaoMinima; numero: number } | null
  /** Onde a leitura continua depois de assinar ou entrar: o trecho pedido, ou o primeiro bloco fechado. */
  continuar: string | null
}

const peso = (b: BlocoMinimo) => JSON.stringify(b).length

/** Posição (seção, bloco) do último bloco aberto. Sem `corte` (capítulo antigo em cache), um terço das seções. */
function posicaoDoCorte(secoes: SecaoMinima[], corte?: string | null): [number, number] {
  for (let i = 0; corte && i < secoes.length; i++) {
    const j = secoes[i].blocos.findIndex((b) => b.id === corte)
    if (j >= 0) return [i, j]
  }
  const i = Math.max(0, Math.ceil(secoes.length / 3) - 1)
  return [i, secoes[i] ? secoes[i].blocos.length - 1 : -1]
}

export function calcularPorta<S extends SecaoMinima>(capitulo: CapituloMinimo<S>, bloqueado: boolean, bloco?: string | null): Porta<S> {
  const { secoes } = capitulo
  const aberto: Porta<S> = { fechado: false, secoes, restantes: [], fracao: 1, pedida: null, continuar: null }
  if (!bloqueado || !secoes.length) return aberto
  const [si, bi] = posicaoDoCorte(secoes, capitulo.corte)
  const cortada = secoes[si]
  const inteira = bi >= cortada.blocos.length - 1
  if (inteira && si === secoes.length - 1) return aberto
  const visiveis = [...secoes.slice(0, si), inteira ? cortada : { ...cortada, blocos: cortada.blocos.slice(0, bi + 1) }] as S[]
  const restantes = [
    ...(inteira ? [] : [{ id: cortada.id, titulo: cortada.titulo, continua: true }]),
    ...secoes.slice(si + 1).map((s) => ({ id: s.id, titulo: s.titulo, continua: false })),
  ]
  const total = secoes.reduce((t, s) => t + s.blocos.reduce((u, b) => u + peso(b), 0), 0)
  const lido = visiveis.reduce((t, s) => t + s.blocos.reduce((u, b) => u + peso(b), 0), 0)
  // Link para um trecho fechado (o convite "Leia o resumo" de uma questão, a busca): a paywall diz qual parte era.
  let pedida: Porta['pedida'] = null
  if (bloco) {
    const i = secoes.findIndex((s) => bloco === `h-${s.id}` || s.blocos.some((b) => b.id === bloco))
    const fechada = i > si || (i === si && !inteira && cortada.blocos.findIndex((b) => b.id === bloco) > bi)
    if (fechada) pedida = { secao: secoes[i], numero: i + 1 }
  }
  const continuar = pedida ? bloco! : inteira ? `h-${secoes[si + 1].id}` : cortada.blocos[bi + 1].id
  return { fechado: true, secoes: visiveis, restantes, fracao: total ? lido / total : 1, pedida, continuar }
}

/** Ids dos blocos que aparecem (para saber se um destino está aberto). */
export const blocosAbertos = (porta: Porta) => new Set(porta.secoes.flatMap((s) => [`h-${s.id}`, ...s.blocos.map((b) => b.id)]))

/** Volta para o resumo, já no trecho em que a prévia parou (ou no pedido). */
export const voltarDaPorta = (capitulo: string, porta: Porta) => `/resumos/${capitulo}${porta.continuar ? `?bloco=${encodeURIComponent(porta.continuar)}` : ''}`

/** Link de entrar (o assinante que ainda não entrou na conta) que volta para onde a prévia parou. */
export const linkEntrarDaPorta = (capitulo: string, porta: Porta) => `/conta?modo=entrar&voltar=${encodeURIComponent(voltarDaPorta(capitulo, porta))}`

/** Frases que caem sem assinatura: quantas áreas ficam abertas (a página das frases e o quadro-negro do salão). */
export const FRASES_AREAS_AMOSTRA = 1
