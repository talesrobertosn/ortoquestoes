import { proximoRegistro, type RegistroQuestao } from './revisao'
import { useCallback } from 'react'
import type { EstadoSessao, Filtros, Letra, Resposta } from '../dados/tipos'
import { ROTULO_AREA } from '../dados/tipos'
import { usarArmazenado } from './usarArmazenado'
import { gravar, ler } from './armazenamento'
import { confirmar } from '../componentes/Confirmar'

export const CHAVE_SESSAO = 'sessao:atual'
export const CHAVE_HISTORICO = 'historico'
export const CHAVE_FAVORITOS = 'favoritos'
export const CHAVE_RESPONDIDAS = 'respondidas'

export interface ResumoHistorico {
  id: string
  criadaEm: number
  concluidaEm: number
  total: number
  respondidas: number
  acertos: number
  segundos: number
  descricao: string
  /** Simulado cronometrado: o limite, em segundos (para os emblemas de chefão). */
  limite?: number | null
  /** Recorte da sessão, quando escolhido: provas e anos. */
  provas?: string[]
  anos?: number[]
}

export interface OpcoesSessao {
  simulado?: boolean
  limiteSegundos?: number | null
  /** Edição do Simulado Nacional ("2026-10"): a entrega vai para o servidor. */
  nacional?: string
  /** Início vindo do servidor, para o cronômetro bater em qualquer aparelho. */
  criadaEm?: number
  origem?: 'cronograma' | 'diagnostico' | 'reta-final' | 'reativar'
}

export function novaSessao(
  filtros: Filtros,
  ids: string[],
  opcoes: OpcoesSessao = {},
): EstadoSessao {
  return {
    id: opcoes.nacional ? `nacional-${opcoes.nacional}` : String(Date.now().toString(36)),
    criadaEm: opcoes.criadaEm ?? Date.now(),
    filtros,
    ids,
    posicao: 0,
    respostas: {},
    revisar: [],
    riscadas: {},
    concluidaEm: null,
    simulado: opcoes.simulado ?? false,
    limiteSegundos: opcoes.limiteSegundos ?? null,
    ...(opcoes.nacional ? { nacional: opcoes.nacional } : {}),
    ...(opcoes.origem ? { origem: opcoes.origem } : {}),
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
    (id: string, escolhida: Letra, correta: boolean | null, segundos: number, confianca: 'seguro' | 'duvida' | 'chute') => {
      // Persistência acontece fora do updater do React. Updaters podem ser
      // reexecutados ou descartados em celulares, o que fazia respostas
      // ficarem apenas no estado visual da sessão.
      const salvo = ler<EstadoSessao | null>(CHAVE_SESSAO, null)
      // O modo simulado também registra cada resposta imediatamente. A prova
      // pode esconder o gabarito, mas nunca deve esconder o salvamento.
      if (salvo && !salvo.respostas[id]) registrarRespondida(id, correta, confianca, escolhida)
      definirSessao((atual) => {
        if (!atual) return atual
        const resposta: Resposta = { escolhida, correta, segundos, confianca }
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
    const salvo = ler<EstadoSessao | null>(CHAVE_SESSAO, null)
    if (salvo && !salvo.concluidaEm) registrarHistorico(salvo)
    definirSessao((atual) => {
      if (!atual || atual.concluidaEm) return atual
      const concluida = { ...atual, concluidaEm: Date.now() }
      return concluida
    })
  }, [definirSessao])

  const encerrar = useCallback(() => definirSessao(null), [definirSessao])

  /**
   * Começa uma sessão nova avisando antes de substituir uma em andamento. A
   * anterior é finalizada (entra no histórico com o que foi respondido), em vez
   * de sumir: sete páginas trocavam a sessão, umas sem perguntar, outras com
   * window.confirm, e nenhuma guardava a anterior.
   * Devolve false quando a pessoa prefere continuar a atual. `liberarParaNova`
   * é só a pergunta (para quem precisa perguntar antes de chamar o servidor).
   */
  const liberarParaNova = useCallback(async (opcoes: OpcoesSessao = {}) => {
      const atual = ler<EstadoSessao | null>(CHAVE_SESSAO, null)
      const respondidas = atual ? Object.keys(atual.respostas).length : 0
      // Respondida por inteiro mas sem "Concluir"/"Entregar" ainda conta: sem
      // concluidaEm, ela não está no histórico e sumiria sem aviso.
      const emAndamento = !!atual && !atual.concluidaEm && respondidas > 0
      // Retomar o mesmo Simulado Nacional não é substituir.
      if (emAndamento && !(opcoes.nacional && atual!.nacional === opcoes.nacional)) {
        const sim = await confirmar({
          titulo: 'Substituir a sessão em andamento?',
          texto: `Você respondeu ${respondidas} de ${atual!.ids.length}. A sessão atual vai para o histórico com o que já foi feito.`,
          sim: 'Começar a nova',
          nao: 'Continuar a atual',
        })
        if (!sim) return false
        registrarHistorico({ ...atual!, concluidaEm: Date.now() })
      }
      return true
  }, [])
  const iniciarComAviso = useCallback(
    async (filtros: Filtros, ids: string[], opcoes: OpcoesSessao = {}) => {
      if (!(await liberarParaNova(opcoes))) return false
      iniciar(filtros, ids, opcoes)
      return true
    },
    [iniciar, liberarParaNova],
  )

  return { sessao, iniciar, iniciarComAviso, liberarParaNova, responder, irPara, alternarRevisar, alternarRiscada, finalizar, encerrar, definirSessao }
}

/**
 * Registra uma resposta no histórico local. Vale para qualquer lugar em que a
 * questão seja respondida — dentro de uma sessão ou por link direto —, senão o
 * desempenho conta menos do que a pessoa realmente fez.
 *
 * A confiança não tem valor padrão: ela decide quando a questão volta, e um
 * padrão silencioso já fez toda resposta ser contada como "tinha certeza".
 */
export function registrarResposta(id: string, correta: boolean | null, confianca: 'seguro' | 'duvida' | 'chute', escolhida?: Letra) {
  registrarRespondida(id, correta, confianca, escolhida)
}

function registrarRespondida(id: string, correta: boolean | null, confianca: 'seguro' | 'duvida' | 'chute', escolhida?: Letra) {
  const mapa = ler<Record<string, RegistroQuestao>>(CHAVE_RESPONDIDAS, {})
  mapa[id] = proximoRegistro(mapa[id], correta, Date.now(), confianca, escolhida)
  gravar(CHAVE_RESPONDIDAS, mapa)
}

export function lerRespondidas(): Record<string, RegistroQuestao> {
  return ler(CHAVE_RESPONDIDAS, {})
}

export function descreverFiltros(filtros: Filtros): string {
  const partes: string[] = []
  const assuntos = filtros.temas.length + filtros.subtemas.length
  partes.push(assuntos === 0 ? 'Todos os assuntos' : `${assuntos} assunto(s)`)
  if (filtros.areas.length !== 1 || filtros.areas[0] !== 'base') partes.push(filtros.areas.map((a) => ROTULO_AREA[a]).join(' + '))
  if (filtros.provas.length) partes.push(filtros.provas.join(', '))
  if (filtros.soSimulados) partes.push('OrtoQuestões Simulados')
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
    descricao: sessao.nacional
      ? `Simulado Nacional · ${nomeEdicao(sessao.nacional)}`
      : (sessao.simulado ? 'Simulado · ' : '') + descreverFiltros(sessao.filtros),
    ...(sessao.simulado && sessao.limiteSegundos ? { limite: sessao.limiteSegundos } : {}),
    ...(sessao.filtros?.provas?.length ? { provas: sessao.filtros.provas } : {}),
    ...(sessao.filtros?.anos?.length ? { anos: sessao.filtros.anos } : {}),
  }
  // A mesma sessão entra uma vez só: se o Simulado Nacional falha ao começar
  // depois do aviso, a anterior continua aberta e pode ser registrada de novo
  // (outra tentativa ou o "Concluir" dela). Fica o registro mais recente.
  const historico = ler<ResumoHistorico[]>(CHAVE_HISTORICO, [])
    .filter((h) => !(h.id === resumo.id && h.criadaEm === resumo.criadaEm))
  gravar(CHAVE_HISTORICO, [resumo, ...historico].slice(0, 50))
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
/** "2026-10" → "outubro de 2026". */
export function nomeEdicao(edicao: string): string {
  const [a, m, sufixo] = edicao.split('-')
  const [ano, mes] = [Number(a), Number(m)]
  if (!MESES[mes - 1]) return edicao
  return sufixo === 'vespera' ? `véspera da prova (${MESES[mes - 1]} de ${ano})` : `${MESES[mes - 1]} de ${ano}`
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
