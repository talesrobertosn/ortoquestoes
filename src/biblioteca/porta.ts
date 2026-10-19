/**
 * Porta da leitura para visitantes (pedido do Tales, 19/10/2026): quem não tem conta lê as
 * primeiras SECOES_ABERTAS partes de cada resumo no leitor do aplicativo; da seguinte em diante,
 * o texto dá lugar ao convite para criar a conta grátis. Com conta (grátis ou assinante), tudo abre.
 *
 * A unidade é a seção do capítulo (`secoes`, na ordem de leitura): é o que o índice do leitor lista
 * e o que não muda com fonte, largura ou aparelho (as "páginas" do modo paginado mudam).
 * As páginas estáticas do Google (/resumos/<id>/) continuam com o texto inteiro.
 */

export const SECOES_ABERTAS = 6

interface SecaoMinima { id: string; titulo: string; blocos?: Array<{ id: string }> }

export interface Porta {
  /** Quantas seções aparecem (todas, com conta). */
  abertas: number
  /** Há porta neste resumo para esta pessoa. */
  fechado: boolean
  /** A primeira seção fechada (para onde a pessoa volta depois de criar a conta). */
  primeiraFechada: SecaoMinima | null
  /** O endereço pedido (?bloco=) caiu numa seção fechada: qual, e a posição dela (1, 2, 3…). */
  pedida: { secao: SecaoMinima; numero: number } | null
}

/** Índice da seção que contém o bloco (`h-<seção>` é o título dela); -1 se não achar. */
export function secaoDoBloco(secoes: SecaoMinima[], bloco: string | null | undefined): number {
  if (!bloco) return -1
  return secoes.findIndex((s) => bloco === `h-${s.id}` || !!s.blocos?.some((b) => b.id === bloco))
}

export function calcularPorta(secoes: SecaoMinima[], visitante: boolean, bloco?: string | null): Porta {
  const fechado = visitante && secoes.length > SECOES_ABERTAS
  if (!fechado) return { abertas: secoes.length, fechado: false, primeiraFechada: null, pedida: null }
  const i = secaoDoBloco(secoes, bloco)
  return {
    abertas: SECOES_ABERTAS,
    fechado: true,
    primeiraFechada: secoes[SECOES_ABERTAS],
    pedida: i >= SECOES_ABERTAS ? { secao: secoes[i], numero: i + 1 } : null,
  }
}

/** Seção visível nesta porta? */
export const secaoAberta = (porta: Porta, indice: number) => indice < porta.abertas

/** Onde a pessoa volta depois de entrar: o resumo, já no começo da parte pedida (ou da primeira fechada). */
export function voltarDaPorta(capitulo: string, porta: Porta): string {
  const alvo = porta.pedida?.secao ?? porta.primeiraFechada
  return `/resumos/${capitulo}${alvo ? `?bloco=${encodeURIComponent(`h-${alvo.id}`)}` : ''}`
}

/** Link da conta (criar ou entrar) que volta para a parte em que a leitura parou. */
export const linkDaPorta = (modo: 'criar' | 'entrar', capitulo: string, porta: Porta) =>
  `/conta?modo=${modo}&voltar=${encodeURIComponent(voltarDaPorta(capitulo, porta))}`
