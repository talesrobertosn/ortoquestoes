import { proximoRegistro, type RegistroQuestao } from './revisao'
import { useCallback } from 'react'
import type { EstadoSessao, Filtros, Letra, Resposta } from '../dados/tipos'
import { ROTULO_AREA } from '../dados/tipos'
import { usarArmazenado } from './usarArmazenado'
import { EVENTO_DADOS, gravar, ler, type MudancaDados } from './armazenamento'
import { confirmar } from '../componentes/Confirmar'
import { navegar } from '../util/rotas'
import { chaveDoDia } from '../util/dia'

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
    (id: string, escolhida: Letra | null, correta: boolean | null, segundos: number, confianca: 'seguro' | 'duvida' | 'chute') => {
      // Persistência acontece fora do updater do React. Updaters podem ser
      // reexecutados ou descartados em celulares, o que fazia respostas
      // ficarem apenas no estado visual da sessão.
      const salvo = ler<EstadoSessao | null>(CHAVE_SESSAO, null)
      // O modo simulado também registra cada resposta imediatamente. A prova
      // pode esconder o gabarito, mas nunca deve esconder o salvamento.
      // Simulado Nacional: nada vai para o histórico local antes da entrega (o caderno de erros e a
      // revisão mostrariam o que está certo no meio da prova); a resposta sobe para o servidor.
      if (salvo && !salvo.nacional && !salvo.respostas[id]) registrarRespondida(id, correta, confianca, escolhida)
      definirSessao((atual) => {
        if (!atual) return atual
        const resposta: Resposta = { escolhida, correta: atual.nacional ? null : correta, segundos, confianca }
        const pendentes = atual.nacional ? { pendentesNacional: [...new Set([...(atual.pendentesNacional ?? []), id])] } : {}
        return { ...atual, respostas: { ...atual.respostas, [id]: resposta }, ...pendentes }
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
        return { ...atual, revisar, ...(atual.nacional ? { revisarPendente: true } : {}) }
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
      // Só as respondidas aqui: as que vieram de outro aparelho já estão no histórico de lá.
      const respondidas = atual ? Object.values(atual.respostas).filter((r) => !r.outroAparelho).length : 0
      // Respondida por inteiro mas sem "Concluir"/"Entregar" ainda conta: sem
      // concluidaEm, ela não está no histórico e sumiria sem aviso.
      const emAndamento = !!atual && !atual.concluidaEm && respondidas > 0
      // A sessão do cronograma de um dia anterior dá lugar à de hoje sem perguntar:
      // o que foi respondido nela vai para o histórico e já conta no plano.
      if (emAndamento && opcoes.origem === 'cronograma' && atual!.origem === 'cronograma' && chaveDoDia(atual!.criadaEm) !== chaveDoDia()) {
        registrarHistorico({ ...atual!, concluidaEm: Date.now() })
        return true
      }
      // Retomar o mesmo Simulado Nacional não é substituir.
      if (emAndamento && !(opcoes.nacional && atual!.nacional === opcoes.nacional)) {
        const sim = await confirmar({
          titulo: 'Substituir a sessão em andamento?',
          texto: `Você respondeu ${respondidas} de ${atual!.ids.length}. A sessão atual vai para o histórico com o que já foi feito.`,
          sim: 'Começar a nova',
          nao: 'Continuar a atual',
          // Continuar a atual leva até ela (o X só fecha e deixa a pessoa onde está).
          aoNao: () => navegar('/sessao'),
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
export function registrarResposta(id: string, correta: boolean | null, confianca: 'seguro' | 'duvida' | 'chute', escolhida?: Letra | null) {
  registrarRespondida(id, correta, confianca, escolhida)
}

function registrarRespondida(id: string, correta: boolean | null, confianca: 'seguro' | 'duvida' | 'chute', escolhida?: Letra | null) {
  const mapa = ler<Record<string, RegistroQuestao>>(CHAVE_RESPONDIDAS, {})
  mapa[id] = proximoRegistro(mapa[id], correta, Date.now(), confianca, escolhida ?? undefined)
  gravar(CHAVE_RESPONDIDAS, mapa)
}

/**
 * Traz para a sessão em andamento as respostas que chegaram de outro aparelho.
 *
 * A sessão (`sessao:atual`) é deste aparelho e não sobe para a nuvem; as
 * respostas (`respondidas`) sobem. Sem esta conciliação, a sessão do
 * cronograma começada aqui continuava oferecendo "Continuar: faltam N" com as
 * mesmas questões que a pessoa já tinha feito no outro aparelho, e ela as
 * refazia. Regras:
 * - conta a tentativa feita depois que a sessão começou (em qualquer aparelho);
 * - na sessão de questões novas do cronograma (e no diagnóstico), que só tem
 *   questões que este aparelho via como não feitas, qualquer resposta conta:
 *   a sessão pode ter sido montada antes de a sincronização trazer o que o
 *   outro aparelho fez;
 * - Simulado Nacional e sessões concluídas ficam como estão.
 * Devolve a sessão nova, ou null quando nada muda.
 */
export function reconciliarSessao(sessao: EstadoSessao | null, respondidas: Record<string, RegistroQuestao>): EstadoSessao | null {
  if (!sessao || sessao.concluidaEm || sessao.nacional || !Array.isArray(sessao.ids)) return null
  const soNovas = (sessao.origem === 'cronograma' || sessao.origem === 'diagnostico') && !sessao.simulado
  let respostas: Record<string, Resposta> | null = null
  for (const id of sessao.ids) {
    if (sessao.respostas[id]) continue
    const r = respondidas[id]
    if (!r || typeof r !== 'object') continue
    const tentativas = r.historico?.length ? r.historico : [{ em: r.q, correta: r.c, confianca: r.confianca ?? 'seguro' }]
    const ultima = [...tentativas].reverse().find((t) => t.em >= sessao.criadaEm) ?? (soNovas ? tentativas[tentativas.length - 1] : undefined)
    if (!ultima) continue
    respostas ??= { ...sessao.respostas }
    respostas[id] = {
      escolhida: ultima.em === r.q && r.m ? r.m as Letra : null,
      correta: ultima.correta,
      segundos: 0,
      confianca: ultima.confianca ?? r.confianca,
      outroAparelho: true,
    }
  }
  if (!respostas) return null
  // Parada numa questão já respondida, com as seguintes feitas no outro aparelho:
  // "Continuar" leva direto à próxima que falta, sem passar uma por uma.
  let posicao = sessao.posicao
  const atual = sessao.ids[posicao]
  if (atual && respostas[atual]) {
    const proxima = sessao.ids.findIndex((id, i) => i > posicao && !respostas![id])
    const pulou = sessao.ids.slice(posicao + 1, proxima < 0 ? undefined : proxima).some((id) => respostas![id]?.outroAparelho && !sessao.respostas[id])
    if (proxima > posicao && pulou) posicao = proxima
  }
  return { ...sessao, respostas, posicao }
}

/** Confere a sessão deste aparelho sempre que chegam respostas da nuvem (e uma vez ao começar). */
export function vigiarSessaoEntreAparelhos(): () => void {
  const conferir = () => {
    const nova = reconciliarSessao(ler<EstadoSessao | null>(CHAVE_SESSAO, null), lerRespondidas())
    if (nova) gravar(CHAVE_SESSAO, nova)
  }
  const aoMudar = (evento: Event) => {
    const m = (evento as CustomEvent<MudancaDados>).detail
    if (m.chave === CHAVE_RESPONDIDAS && m.origem === 'nuvem') conferir()
  }
  window.addEventListener(EVENTO_DADOS, aoMudar)
  conferir()
  return () => window.removeEventListener(EVENTO_DADOS, aoMudar)
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
  // O Simulado Nacional entra no histórico depois da entrega, com a nota do servidor (registrarEntregaNacional).
  if (sessao.nacional) return
  // As que vieram de outro aparelho já entraram no histórico de lá.
  const respostas = Object.values(sessao.respostas).filter((r) => !r.outroAparelho)
  if (!respostas.length && Object.keys(sessao.respostas).length) return
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

/**
 * Depois da entrega do Simulado Nacional: as respostas entram no histórico local
 * (com a letra do acervo e a correção do servidor, para a revisão e o caderno de
 * erros) e a prova entra no histórico de sessões. Uma vez por edição neste aparelho.
 */
export function registrarEntregaNacional(
  sessao: EstadoSessao | null,
  edicao: string,
  entrega: { acertos: number; total: number; segundos: number },
  gabarito: Array<{ id_questao: string; permutacao: string; gabarito: string; marcada: string | null }>,
) {
  const chave = `nacional:registrado:${edicao}`
  if (ler<boolean>(chave, false)) return
  gravar(chave, true)
  const local = sessao?.nacional === edicao ? sessao : null
  for (const item of gabarito) {
    if (!item.marcada) continue
    const original = item.permutacao ? item.permutacao['ABCDE'.indexOf(item.marcada)] : item.marcada
    registrarRespondida(item.id_questao, item.marcada === item.gabarito, local?.respostas[item.id_questao]?.confianca ?? 'seguro', (original ?? item.marcada) as Letra)
  }
  const criadaEm = local?.criadaEm ?? Date.now() - entrega.segundos * 1000
  const resumo: ResumoHistorico = {
    id: `nacional-${edicao}`, criadaEm, concluidaEm: local?.concluidaEm ?? Date.now(), total: entrega.total,
    respondidas: gabarito.filter((g) => g.marcada).length, acertos: entrega.acertos, segundos: entrega.segundos,
    descricao: `Simulado Nacional · ${nomeEdicao(edicao)}`, ...(local?.limiteSegundos ? { limite: local.limiteSegundos } : {}),
  }
  const historico = ler<ResumoHistorico[]>(CHAVE_HISTORICO, []).filter((h) => h.id !== resumo.id)
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
