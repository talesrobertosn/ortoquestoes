import type { CalculoPlano, DiaPlano } from './planoEstudo'
import { diaCivil } from '../util/dia'

/** Frases do adiantar, usadas no cronograma e no fim da sessão (módulo pequeno, sem a página inteira). */
const DIA = 86_400_000
const semanaDia = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '')
const diferencaDias = (d: Date) => Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - diaCivil().getTime()) / DIA)

/** "no sábado", "na segunda": o nome do dia com o artigo certo. */
export const noDia = (d: Date) => `${d.getDay() === 0 || d.getDay() === 6 ? 'no' : 'na'} ${semanaDia(d)}`

/**
 * A regra do adiantar dita com os números (pedido do Tales, 16/10/2026): "Você adiantou 30
 * questões; amanhã sua meta é 32 (era 62)." O primeiro dia que perdeu questões para o
 * adiantamento de hoje, ou null se nada foi adiantado hoje.
 */
export function fraseAdiantado(calculo: Pick<CalculoPlano, 'extraHoje' | 'adiantarPedido' | 'dias'>): string | null {
  const ja = Math.max(calculo.extraHoje, calculo.adiantarPedido)
  const alvo = calculo.dias.slice(1).find((d) => d.adiantado > 0)
  if (!ja || !alvo) return null
  const quando = diferencaDias(alvo.data) === 1 ? 'amanhã' : noDia(alvo.data)
  const verbo = calculo.adiantarPedido > calculo.extraHoje ? 'Você está adiantando' : 'Você adiantou'
  const era = alvo.meta + alvo.adiantado
  return `${verbo} ${ja} ${ja === 1 ? 'questão' : 'questões'}; ${quando} ${alvo.meta === 0 ? `fica livre (a meta era ${era})` : `sua meta é ${alvo.meta} (era ${era})`}.`
}

/** "terça, 20/10": o dia da semana e a data, para os botões de puxar um dia. */
export const diaCurto = (d: Date) => `${semanaDia(d)}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`

/**
 * O botão de puxar o próximo dia (pedido do Tales, 19/10/2026): "Puxar as questões de amanhã
 * (terça, 20/10)" com "77 questões", ou, se o dia já foi começado, "Continuar terça, 20/10" com "faltam 69".
 */
export function textoPuxar(dia: Pick<DiaPlano, 'data' | 'total' | 'puxado'>, agora: Date | number = Date.now()): { rotulo: string; detalhe: string } {
  if (dia.puxado && dia.puxado.feitas > 0) return { rotulo: `Continuar ${diaCurto(dia.data)}`, detalhe: `faltam ${dia.total}` }
  const amanha = Math.round((new Date(dia.data.getFullYear(), dia.data.getMonth(), dia.data.getDate()).getTime() - diaCivil(agora).getTime()) / DIA) === 1
  return { rotulo: amanha ? `Puxar as questões de amanhã (${diaCurto(dia.data)})` : `Puxar as questões de ${diaCurto(dia.data)}`, detalhe: `${dia.total} ${dia.total === 1 ? 'questão' : 'questões'}` }
}

/** O selo de um dia puxado e começado: "Adiantado · 8 de 77" (null se ele não foi começado). */
export function textoAdiantadoDia(dia: Pick<DiaPlano, 'puxado'>): string | null {
  return dia.puxado && dia.puxado.feitas > 0 ? `Adiantado · ${dia.puxado.feitas} de ${dia.puxado.total}` : null
}

/** A mesma frase para quem chega no dia seguinte: "Você adiantou 30 questões de hoje; hoje sua meta é 32 (era 62)." */
export function fraseAdiantadoHoje(calculo: Pick<CalculoPlano, 'adiantadoHoje' | 'metaDiaria' | 'metaHojeSemAdiantar'>): string | null {
  const n = calculo.adiantadoHoje
  if (!n) return null
  return `Você adiantou ${n} ${n === 1 ? 'questão' : 'questões'} de hoje; hoje sua meta é ${calculo.metaDiaria} (era ${calculo.metaHojeSemAdiantar}).`
}
