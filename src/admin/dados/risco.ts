/**
 * Detector de risco de abandono (Tales, 05/11/2026). Uma pontuação simples, transparente e configurável, para
 * achar quem pode se beneficiar de uma retomada. Não é previsão científica de cancelamento, e nada é enviado
 * automaticamente: o painel só sugere a ação.
 */
export interface Pesos {
  /** Dias sem estudar: a partir de cada limite, soma os pontos. */
  parado: Array<{ dias: number; pontos: number }>
  /** Queda: a semana atual abaixo desta fração da média semanal anterior. */
  queda: Array<{ fracao: number; pontos: number }>
  /** Média semanal mínima para a queda contar (quem estudava pouco não "cai"). */
  mediaMinima: number
  /** Vencimento sem renovação automática em até N dias. */
  vencimento: Array<{ dias: number; pontos: number }>
  semSessaoNaSemana: number
  /** Limites dos níveis: pontos ≥ moderado → moderado; ≥ alto → alto. */
  moderado: number; alto: number
}
export const PESOS_PADRAO: Pesos = {
  parado: [{ dias: 3, pontos: 1 }, { dias: 7, pontos: 3 }, { dias: 14, pontos: 4 }],
  queda: [{ fracao: 0.6, pontos: 1 }, { fracao: 0.3, pontos: 2 }],
  mediaMinima: 20,
  vencimento: [{ dias: 7, pontos: 2 }, { dias: 3, pontos: 3 }],
  semSessaoNaSemana: 1,
  moderado: 3, alto: 5,
}

export interface EntradaRisco {
  ultimaAtividade: string | null
  criadoEm: string
  respondidas: number
  respondidas7d: number
  /** Fim do acesso pago, quando não renova sozinho (Pix ou cartão desligado). */
  fimSemRenovar?: string | null
}
export type Nivel = 'baixo' | 'moderado' | 'alto'
export interface Risco { pontos: number; nivel: Nivel; motivos: string[]; acao: string }

const DIA = 86_400_000
const maiorQue = <T extends { pontos: number }>(lista: T[], ok: (x: T) => boolean) => lista.filter(ok).reduce((m, x) => Math.max(m, x.pontos), 0)

export function avaliarRisco(e: EntradaRisco, pesos: Pesos = PESOS_PADRAO, agora = Date.now()): Risco {
  const motivos: string[] = []
  let pontos = 0
  const diasParado = e.ultimaAtividade ? Math.floor((agora - new Date(e.ultimaAtividade).getTime()) / DIA) : Math.floor((agora - new Date(e.criadoEm).getTime()) / DIA)
  const p1 = maiorQue(pesos.parado, x => diasParado >= x.dias)
  if (p1) { pontos += p1; motivos.push(`${diasParado} dias sem estudar`) }
  // Média semanal antes desta semana: (total − semana) ÷ semanas de conta antes desta semana.
  const semanas = Math.max(0, (agora - new Date(e.criadoEm).getTime()) / DIA / 7 - 1)
  const media = semanas >= 1 ? Math.max(0, e.respondidas - e.respondidas7d) / semanas : 0
  if (media >= pesos.mediaMinima) {
    const fracao = e.respondidas7d / media
    const p2 = maiorQue(pesos.queda, x => fracao < x.fracao)
    if (p2) { pontos += p2; motivos.push(`semana em ${Math.round(fracao * 100)}% do ritmo de antes (${Math.round(media)} por semana)`) }
  }
  if (e.respondidas7d === 0 && e.respondidas > 0 && pesos.semSessaoNaSemana) { pontos += pesos.semSessaoNaSemana; motivos.push('nenhuma questão nos últimos 7 dias') }
  if (e.fimSemRenovar) {
    const dias = Math.ceil((new Date(e.fimSemRenovar).getTime() - agora) / DIA)
    const p3 = dias >= 0 ? maiorQue(pesos.vencimento, x => dias <= x.dias) : 0
    if (p3) { pontos += p3; motivos.push(dias === 0 ? 'acesso termina hoje' : `acesso termina em ${dias} ${dias === 1 ? 'dia' : 'dias'}, sem renovação automática`) }
  }
  const nivel: Nivel = pontos >= pesos.alto ? 'alto' : pontos >= pesos.moderado ? 'moderado' : 'baixo'
  const perto = e.fimSemRenovar && (new Date(e.fimSemRenovar).getTime() - agora) / DIA <= 7
  const acao = nivel === 'baixo' ? 'Nada a fazer agora.'
    : perto && diasParado >= 3 ? 'Carta gentil lembrando o vencimento e mostrando o progresso até aqui.'
    : perto ? 'Lembrete gentil de renovação (os dias que faltam não se perdem).'
    : diasParado >= 7 ? 'Carta de retomada: o cronograma reorganizado e um treino curto para voltar.'
    : 'Mensagem de incentivo com os temas em que a pessoa mais evoluiu.'
  return { pontos, nivel, motivos, acao }
}
