import { somarMeses } from './periodoPix'

/**
 * A conta dos dias (Tales, 14/11/2026: "deixar claro quantos dias a pessoa tem + quantos vai comprar"): tudo em
 * dias inteiros e, ao lado, em meses do calendário, para ninguém ter de fazer conta de cabeça.
 */
export const DIA_MS = 864e5

/** Dias inteiros de `de` até `ate` (arredonda para cima: um pedaço de dia ainda é um dia de acesso). */
export function diasEntre(de: number, ate: number) {
  return Math.max(0, Math.ceil((ate - de) / DIA_MS))
}

export const dias = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'dia' : 'dias'}`
const meses = (n: number) => `${n} ${n === 1 ? 'mês' : 'meses'}`

/** "1 ano e 2 meses", "7 meses e 3 dias", "12 dias": a duração em meses do calendário. */
export function duracao(de: number, ate: number) {
  if (ate <= de) return '0 dias'
  let m = 0
  while (somarMeses(de, m + 1) <= ate + 3600e3) m++
  const resto = diasEntre(somarMeses(de, m), ate)
  const anos = Math.floor(m / 12), mesesRestantes = m % 12
  const partes = [anos ? `${anos} ${anos === 1 ? 'ano' : 'anos'}` : '', mesesRestantes ? meses(mesesRestantes) : '', resto ? dias(resto) : ''].filter(Boolean)
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : partes[0] ?? '0 dias'
}

export interface ContaDosDias {
  /** Dias que a pessoa ainda tem (0 quando não há período vigente). */
  tem: number
  /** Quando o período vigente acaba (ou agora, sem período). */
  inicioNovo: number
  /** Dias do plano comprado, contados a partir do fim do atual. */
  compra: number
  fimNovo: number
  total: number
}

/** O que a pessoa tem, o que compra e o total, com o plano novo emendado no fim do atual. */
export function contarDias(agora: number, fimAtual: number | null, mesesNovos: number): ContaDosDias {
  const inicioNovo = fimAtual && fimAtual > agora ? fimAtual : agora
  const fimNovo = somarMeses(inicioNovo, mesesNovos)
  return { tem: diasEntre(agora, inicioNovo), inicioNovo, compra: diasEntre(inicioNovo, fimNovo), fimNovo, total: diasEntre(agora, fimNovo) }
}
