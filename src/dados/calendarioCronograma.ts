/** Datas civis do calendário: nunca somar 24 h a uma meia-noite local (há fusos com horário de verão). */
import { diaCivil } from '../util/dia'

export type FaseCalendario = 'antes' | 'passado' | 'hoje' | 'conteudo' | 'revisao' | 'prova' | 'vespera' | 'dia-prova' | 'depois'
export const mesCivil = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
export const limitarData = (d: Date, inicio: Date, fim: Date) => new Date(Math.max(inicio.getTime(), Math.min(fim.getTime(), d.getTime())))
export function limitesCalendario(criado: Date, hoje: Date, prova: Date) {
  const inicio = new Date(Math.min(criado.getTime(), hoje.getTime(), prova.getTime()))
  return { inicio, primeiroMes: mesCivil(inicio), ultimoMes: mesCivil(prova), inicial: limitarData(hoje, inicio, prova) }
}
export function selecaoNoMes(chave: string, mes: Date, inicio: Date, fim: Date): Date {
  const numero = diaCivil(chave).getDate()
  const ultimo = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  return limitarData(new Date(mes.getFullYear(), mes.getMonth(), Math.min(numero, ultimo)), inicio, fim)
}
export function faseNoCalendario(data: Date, criado: Date, hoje: Date, prova: Date, reta: Date, modoProva: Date, vespera: Date): FaseCalendario {
  if (data < criado) return 'antes'
  if (data.getTime() === prova.getTime()) return 'dia-prova'
  if (data > prova) return 'depois'
  // Um dia já vivido mostra o que a pessoa fez, inclusive dentro da reta final.
  if (data < hoje) return 'passado'
  if (data.getTime() === vespera.getTime()) return 'vespera'
  if (data >= modoProva) return 'prova'
  if (data >= reta) return 'revisao'
  return data.getTime() === hoje.getTime() ? 'hoje' : 'conteudo'
}
