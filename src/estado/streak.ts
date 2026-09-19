import { chaveDia } from './planoRevisao'
import type { RegistroQuestao } from './revisao'

/** Quantas questões por dia mantêm a sequência viva. */
export const META_STREAK_DIARIA = 5

/** Dias de sequência que valem uma comemoração (e uma imagem para compartilhar). */
export const MARCOS_STREAK = [3, 7, 14, 21, 30, 50, 100, 150, 200, 365, 500, 1000]

export interface Streak {
  /** Sequência viva: conta a partir de hoje (se a meta já foi batida) ou de ontem. */
  atual: number
  /** Maior sequência já alcançada, incluindo a atual. */
  recorde: number
  hojeContagem: number
  metaHojeAtingida: boolean
  /** Tinha sequência, ainda não respondeu hoje: precisa estudar para não zerar. */
  emRisco: boolean
}

const numeroDoDia = (chave: string) => Math.floor(new Date(`${chave}T00:00:00Z`).getTime() / 86400000)

/**
 * Conta questões respondidas por dia a partir do histórico curto que já fica
 * em cada questão (até 8 eventos mais recentes) e, quando ele não existe
 * ainda — respostas de antes desse campo existir —, cai para o único
 * carimbo de data que sempre existe (o da última resposta).
 */
export function calcularStreak(
  registros: Record<string, Partial<RegistroQuestao>>,
  agora = Date.now(),
): Streak {
  const porDia = new Map<string, number>()
  for (const registro of Object.values(registros)) {
    const eventos = registro.historico?.length
      ? registro.historico.map((e) => e.em)
      : registro.q
        ? [registro.q]
        : []
    for (const em of eventos) {
      const chave = chaveDia(em)
      porDia.set(chave, (porDia.get(chave) ?? 0) + 1)
    }
  }

  const diasAtivos = new Set(
    [...porDia.entries()].filter(([, quantidade]) => quantidade >= META_STREAK_DIARIA).map(([chave]) => numeroDoDia(chave)),
  )

  const hojeChave = chaveDia(agora)
  const hojeContagem = porDia.get(hojeChave) ?? 0
  const metaHojeAtingida = hojeContagem >= META_STREAK_DIARIA
  const hojeNumero = numeroDoDia(hojeChave)

  let atual = 0
  for (let cursor = metaHojeAtingida ? hojeNumero : hojeNumero - 1; diasAtivos.has(cursor); cursor--) atual++

  let recorde = 0
  let sequencia = 0
  let anterior: number | null = null
  for (const dia of [...diasAtivos].sort((a, b) => a - b)) {
    sequencia = anterior !== null && dia === anterior + 1 ? sequencia + 1 : 1
    anterior = dia
    recorde = Math.max(recorde, sequencia)
  }

  return {
    atual,
    recorde: Math.max(recorde, atual),
    hojeContagem,
    metaHojeAtingida,
    emRisco: !metaHojeAtingida && atual > 0,
  }
}

/** O próximo marco ainda não alcançado, para mostrar "faltam N dias". */
export function proximoMarco(atual: number): number | null {
  return MARCOS_STREAK.find((marco) => marco > atual) ?? null
}

/**
 * Variações da frase que descreve a sequência, para não repetir sempre
 * "estudando ortopedia" — todas encaixam em "Você está {frase} há N dias".
 * A escolha depende do tamanho da sequência (determinística, não muda a
 * cada nova renderização da mesma sequência).
 */
const FRASES_SEQUENCIA = [
  'respondendo questões',
  'resolvendo questões de ortopedia',
  'treinando com questões do banco',
  'mantendo as questões em dia',
  'encarando questões de prova',
]

export function fraseSequencia(dias: number): string {
  return FRASES_SEQUENCIA[dias % FRASES_SEQUENCIA.length]
}
