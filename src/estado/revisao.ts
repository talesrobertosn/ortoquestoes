/** Os campos opcionais mantêm compatibilidade com o histórico antigo. */
export interface RegistroQuestao {
  c: boolean | null
  q: number
  tentativas?: number
  acertos?: number
  erros?: number
  sequencia?: number
  proximaRevisao?: number | null
  confianca?: 'seguro' | 'duvida' | 'chute'
  historico?: Array<{ em: number; correta: boolean | null; confianca: 'seguro' | 'duvida' | 'chute' }>
}
/**
 * Chute e dúvida saem da fila com quatro acertos espaçados — acertar sem
 * saber por quê não sustenta um intervalo muito maior que isso. Certeza
 * ganha uma cauda bem mais longa (até um ano): quem já domina o conceito
 * ainda se beneficia de revisões raras e bem espaçadas, e como o estudo
 * aqui dura meses, faz sentido reencontrar a questão daqui a um tempo em
 * vez de considerá-la resolvida para sempre depois de só quatro acertos.
 */
export const INTERVALOS: Record<'chute' | 'duvida' | 'seguro', number[]> = {
  chute: [1, 3, 7, 14],
  duvida: [2, 5, 10, 21],
  seguro: [3, 7, 14, 30, 90, 180, 270, 365],
}
export function dominada(registro?: Partial<RegistroQuestao>): boolean {
  if (!registro || registro.c !== true) return false
  return (registro.sequencia ?? 0) >= INTERVALOS[registro.confianca ?? 'seguro'].length
}
export function revisarHoje(registro?: Partial<RegistroQuestao>, agora = Date.now()): boolean {
  if (!registro || registro.c === null || dominada(registro)) return false
  const proxima = registro.proximaRevisao === undefined && registro.q !== undefined ? registro.q + 3 * 86400000 : registro.proximaRevisao
  return registro.c === false || (proxima != null && proxima <= agora)
}
export function proximoRegistro(anterior: RegistroQuestao | undefined, correta: boolean | null, agora = Date.now(), confianca: 'seguro' | 'duvida' | 'chute' = 'seguro'): RegistroQuestao {
  const sequencia = correta === true ? (anterior?.sequencia ?? (anterior?.c === true ? 1 : 0)) + 1 : 0
  const intervalos = INTERVALOS[confianca]
  return {
    c: correta, q: agora,
    tentativas: (anterior?.tentativas ?? (anterior ? 1 : 0)) + 1,
    acertos: (anterior?.acertos ?? (anterior?.c === true ? 1 : 0)) + Number(correta === true),
    erros: (anterior?.erros ?? (anterior?.c === false ? 1 : 0)) + Number(correta === false),
    sequencia,
    confianca,
    historico: [...(anterior?.historico ?? []), { em: agora, correta, confianca }].slice(-8),
    proximaRevisao: correta === null || sequencia >= intervalos.length ? null : correta === false ? agora : agora + intervalos[sequencia - 1] * 86400000,
  }
}
