/** Os campos opcionais mantêm compatibilidade com o histórico antigo. */
export interface RegistroQuestao {
  c: boolean | null
  q: number
  tentativas?: number
  acertos?: number
  erros?: number
  sequencia?: number
  proximaRevisao?: number | null
}
export function dominada(registro?: Partial<RegistroQuestao>): boolean {
  return registro?.c === true && (registro.sequencia ?? 0) >= 4
}
export function revisarHoje(registro?: Partial<RegistroQuestao>, agora = Date.now()): boolean {
  if (!registro || registro.c === null || dominada(registro)) return false
  const proxima = registro.proximaRevisao === undefined && registro.q !== undefined ? registro.q + 3 * 86400000 : registro.proximaRevisao
  return registro.c === false || (proxima != null && proxima <= agora)
}
export function proximoRegistro(anterior: RegistroQuestao | undefined, correta: boolean | null, agora = Date.now()): RegistroQuestao {
  const sequencia = correta === true ? (anterior?.sequencia ?? (anterior?.c === true ? 1 : 0)) + 1 : 0
  const intervalos = [3, 7, 14, 30]
  return {
    c: correta, q: agora,
    tentativas: (anterior?.tentativas ?? (anterior ? 1 : 0)) + 1,
    acertos: (anterior?.acertos ?? (anterior?.c === true ? 1 : 0)) + Number(correta === true),
    erros: (anterior?.erros ?? (anterior?.c === false ? 1 : 0)) + Number(correta === false),
    sequencia,
    proximaRevisao: correta === null || sequencia >= 4 ? null : correta === false ? agora : agora + (intervalos[Math.max(0, sequencia - 1)] ?? 30) * 86400000,
  }
}
