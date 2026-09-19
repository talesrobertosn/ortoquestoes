import { useCallback } from 'react'
import type { EstadoSessao, Filtros, Letra, Resposta } from '../dados/tipos'
import { usarArmazenado } from './usarArmazenado'
import { gravar, ler } from './armazenamento'

export const CHAVE_SESSAO = 'sessao:atual'
export const CHAVE_HISTORICO = 'historico'
export const CHAVE_FAVORITOS = 'favoritos'
export const CHAVE_RESPONDIDAS = 'respondidas'

export interface RegistroQuestao {
  /** Resultado e instante da tentativa mais recente (campos antigos preservados). */
  c: boolean | null
  q: number
  tentativas: number
  acertos: number
  erros: number
  /** Acertos consecutivos; dois acertos representam domínio inicial. */
  sequencia: number
  /** Próximo instante de revisão; null quando a questão está dominada. */
  revisarEm: number | null
}

export interface ResumoHistorico {
  id: string
  criadaEm: number
  concluidaEm: number
  total: number
  respondidas: number
  acertos: number
  segundos: number
  descricao: string
}

export interface OpcoesSessao {
  simulado?: boolean
  limiteSegundos?: number | null
}

export function novaSessao(
  filtros: Filtros,
  ids: string[],
  opcoes: OpcoesSessao = {},
): EstadoSessao {
  return {
    id: String(Date.now().toString(36)),
    criadaEm: Date.now(),
    filtros,
    ids,
    posicao: 0,
    respostas: {},
    revisar: [],
    riscadas: {},
    concluidaEm: null,
    simulado: opcoes.simulado ?? false,
    limiteSegundos: opcoes.limiteSegundos ?? null,
  }
}

export function usarSessao() {
  const [sessao, definirSessao] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)

  const iniciar = useCallback(
    (filtros: Filtros, ids: string[], opcoes: OpcoesSessao = {}) => {
      const nova = novaSessao(filtros, ids, opcoes)
      definirSessao(nova)
      return nova
    },
    [definirSessao],
  )

  const responder = useCallback(
    (id: string, escolhida: Letra, correta: boolean | null, segundos: number) => {
      definirSessao((atual) => {
        if (!atual) return atual
        const resposta: Resposta = { escolhida, correta, segundos }
        registrarRespondida(id, correta)
        return { ...atual, respostas: { ...atual.respostas, [id]: resposta } }
      })
    },
    [definirSessao],
  )

  const irPara = useCallback(
    (posicao: number) => {
      definirSessao((atual) => {
        if (!atual) return atual
        const limite = Math.max(0, Math.min(posicao, atual.ids.length - 1))
        return { ...atual, posicao: limite }
      })
    },
    [definirSessao],
  )

  const alternarRevisar = useCallback(
    (id: string) => {
      definirSessao((atual) => {
        if (!atual) return atual
        const revisar = atual.revisar.includes(id)
          ? atual.revisar.filter((x) => x !== id)
          : [...atual.revisar, id]
        return { ...atual, revisar }
      })
    },
    [definirSessao],
  )

  const alternarRiscada = useCallback(
    (id: string, letra: Letra) => {
      definirSessao((atual) => {
        if (!atual) return atual
        const atuais = atual.riscadas[id] ?? []
        const proximas = atuais.includes(letra)
          ? atuais.filter((l) => l !== letra)
          : [...atuais, letra]
        return { ...atual, riscadas: { ...atual.riscadas, [id]: proximas } }
      })
    },
    [definirSessao],
  )

  const finalizar = useCallback(() => {
    definirSessao((atual) => {
      if (!atual || atual.concluidaEm) return atual
      const concluida = { ...atual, concluidaEm: Date.now() }
      registrarHistorico(concluida)
      return concluida
    })
  }, [definirSessao])

  const encerrar = useCallback(() => definirSessao(null), [definirSessao])

  return { sessao, iniciar, responder, irPara, alternarRevisar, alternarRiscada, finalizar, encerrar, definirSessao }
}

/**
 * Registra uma resposta no histórico local. Vale para qualquer lugar em que a
 * questão seja respondida — dentro de uma sessão ou por link direto —, senão o
 * desempenho conta menos do que a pessoa realmente fez.
 */
export function registrarResposta(id: string, correta: boolean | null) {
  registrarRespondida(id, correta)
}

function registrarRespondida(id: string, correta: boolean | null) {
  const mapa = ler<Record<string, Partial<RegistroQuestao> & { c: boolean | null; q: number }>>(
    CHAVE_RESPONDIDAS,
    {},
  )
  const agora = Date.now()
  const anterior = mapa[id]
  const sequencia = correta === true ? (anterior?.sequencia ?? 0) + 1 : 0
  // Erros voltam imediatamente; o primeiro acerto reaparece em três dias. No
  // segundo acerto seguido, a questão sai da fila diária como dominada.
  const revisarEm =
    correta === null ? (anterior?.revisarEm ?? null) : correta === false ? agora : sequencia < 2 ? agora + 3 * 864e5 : null
  mapa[id] = {
    c: correta,
    q: agora,
    tentativas: (anterior?.tentativas ?? (anterior ? 1 : 0)) + 1,
    acertos: (anterior?.acertos ?? 0) + (correta === true ? 1 : 0),
    erros: (anterior?.erros ?? 0) + (correta === false ? 1 : 0),
    sequencia,
    revisarEm,
  }
  gravar(CHAVE_RESPONDIDAS, mapa)
}

export function lerRespondidas(): Record<string, RegistroQuestao> {
  const antigos = ler<Record<string, Partial<RegistroQuestao> & { c: boolean | null; q: number }>>(
    CHAVE_RESPONDIDAS,
    {},
  )
  return Object.fromEntries(Object.entries(antigos).map(([id, r]) => [id, {
    c: r.c,
    q: r.q,
    tentativas: r.tentativas ?? 1,
    acertos: r.acertos ?? (r.c === true ? 1 : 0),
    erros: r.erros ?? (r.c === false ? 1 : 0),
    sequencia: r.sequencia ?? (r.c === true ? 1 : 0),
    revisarEm: r.revisarEm ?? (r.c === false ? r.q : null),
  }]))
}

export function descreverFiltros(filtros: Filtros): string {
  const partes: string[] = []
  const assuntos = filtros.temas.length + filtros.subtemas.length
  partes.push(assuntos === 0 ? 'Todos os assuntos' : `${assuntos} assunto(s)`)
  if (filtros.provas.length) partes.push(filtros.provas.join(', '))
  if (filtros.anos.length) partes.push(filtros.anos.join(', '))
  return partes.join(' · ')
}

function registrarHistorico(sessao: EstadoSessao) {
  const respostas = Object.values(sessao.respostas)
  const resumo: ResumoHistorico = {
    id: sessao.id,
    criadaEm: sessao.criadaEm,
    concluidaEm: sessao.concluidaEm ?? Date.now(),
    total: sessao.ids.length,
    respondidas: respostas.length,
    acertos: respostas.filter((r) => r.correta === true).length,
    segundos: respostas.reduce((soma, r) => soma + r.segundos, 0),
    descricao:
      (sessao.simulado ? 'Simulado · ' : '') + descreverFiltros(sessao.filtros),
  }
  const historico = ler<ResumoHistorico[]>(CHAVE_HISTORICO, [])
  gravar(CHAVE_HISTORICO, [resumo, ...historico].slice(0, 50))
}

export function lerHistorico(): ResumoHistorico[] {
  return ler<ResumoHistorico[]>(CHAVE_HISTORICO, [])
}

export function usarFavoritos() {
  const [favoritos, definir] = usarArmazenado<string[]>(CHAVE_FAVORITOS, [])
  const alternar = useCallback(
    (id: string) =>
      definir((atuais) => (atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id])),
    [definir],
  )
  return { favoritos, alternar }
}
