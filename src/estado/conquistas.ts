/**
 * Conquistas, no espírito das de jogo: várias famílias, cada uma com níveis,
 * e algumas secretas que só se revelam quando desbloqueadas. Tudo é calculado
 * a partir do que já fica guardado na conta (respostas e sessões), então uma
 * conquista vale para sempre e aparece igual em qualquer aparelho sincronizado.
 *
 * A família "questões" continua sendo o emblema padrão ao lado do nome; a
 * pessoa pode trocar por até três conquistas à escolha (a vitrine).
 */
import type { RegistroQuestao } from './revisao'
import { dominada } from './revisao'
import { calcularStreak, META_STREAK_DIARIA } from './streak'
import { chaveDia } from './planoRevisao'

export type NivelMedalha = 'bronze' | 'prata' | 'ouro' | 'esmeralda' | 'lendario'

export interface Conquista {
  /** Identificador estável: nome do arquivo da arte e valor gravado na vitrine. */
  id: string
  minimo: number
  rotulo: string
  /** Texto curto no centro da medalha desenhada (quando ainda não há arte). */
  curto: string
  nivel: NivelMedalha
}

export type FamiliaId =
  | 'questoes' | 'sequencia' | 'dias' | 'acertos' | 'dominadas' | 'temas' | 'sessoes'
  | 'maratona' | 'precisao' | 'redencao' | 'gabarito' | 'secretas'

export interface Emblema extends Conquista {
  familia: FamiliaId
  /** O que é preciso fazer, escrito para quem ainda não conseguiu. */
  descricao: string
  /** Métrica que decide a conquista (cada família secreta usa a sua). */
  metrica: keyof Metricas
  /** Só se revela depois de desbloqueada. */
  secreta?: boolean
}

export interface Familia { id: FamiliaId; titulo: string; unidade: (n: number) => string }

const n = (v: number) => v.toLocaleString('pt-BR')

export const FAMILIAS: readonly Familia[] = [
  { id: 'questoes', titulo: 'Questões respondidas', unidade: (v) => `${n(v)} questões` },
  { id: 'sequencia', titulo: 'Sequência atual', unidade: (v) => `${v} dias seguidos` },
  { id: 'dias', titulo: 'Dias de estudo', unidade: (v) => `${v} dias com estudo` },
  { id: 'acertos', titulo: 'Acertos', unidade: (v) => `${n(v)} acertos` },
  { id: 'dominadas', titulo: 'Domínio', unidade: (v) => `${n(v)} dominadas` },
  { id: 'temas', titulo: 'Exploração', unidade: (v) => `${v} temas` },
  { id: 'sessoes', titulo: 'Sessões concluídas', unidade: (v) => `${n(v)} sessões` },
  { id: 'maratona', titulo: 'Maratona', unidade: (v) => `${v} questões num dia` },
  { id: 'precisao', titulo: 'Precisão', unidade: (v) => `${v} acertos seguidos` },
  { id: 'redencao', titulo: 'Redenção', unidade: (v) => `${n(v)} erros corrigidos` },
  { id: 'gabarito', titulo: 'Gabarito', unidade: (v) => `${v} ${v === 1 ? 'sessão perfeita' : 'sessões perfeitas'}` },
  { id: 'secretas', titulo: 'Secretas', unidade: () => 'secreta' },
]

type Linha = [id: string, minimo: number, rotulo: string, curto: string, nivel: NivelMedalha, descricao: string]

function familia(f: FamiliaId, metrica: keyof Metricas, linhas: Linha[], secreta = false): Emblema[] {
  return linhas.map(([id, minimo, rotulo, curto, nivel, descricao]) => ({ id, minimo, rotulo, curto, nivel, descricao, familia: f, metrica, secreta }))
}

export const EMBLEMAS: readonly Emblema[] = [
  ...familia('questoes', 'questoes', [
    ['questoes-50', 50, 'Primeiros passos', '50', 'bronze', 'Responda 50 questões diferentes.'],
    ['questoes-100', 100, 'Interno', '100', 'bronze', 'Responda 100 questões diferentes.'],
    ['questoes-250', 250, 'R1', '250', 'prata', 'Responda 250 questões diferentes.'],
    ['questoes-500', 500, 'R2', '500', 'prata', 'Responda 500 questões diferentes.'],
    ['questoes-1000', 1000, 'R3', '1k', 'ouro', 'Responda 1.000 questões diferentes.'],
    ['questoes-2000', 2000, 'Preceptor', '2k', 'ouro', 'Responda 2.000 questões diferentes.'],
    ['questoes-3000', 3000, 'Chefe de serviço', '3k', 'esmeralda', 'Responda 3.000 questões diferentes.'],
    ['questoes-4000', 4000, 'Lenda do OrtoQuestões', '4k', 'lendario', 'Responda 4.000 questões diferentes.'],
  ]),
  ...familia('sequencia', 'sequencia', [
    ['sequencia-3', 3, 'Aquecendo', '3d', 'bronze', `Estude ${META_STREAK_DIARIA} questões por dia, 3 dias seguidos.`],
    ['sequencia-7', 7, 'Semana firme', '7d', 'bronze', `Estude ${META_STREAK_DIARIA} questões por dia, 7 dias seguidos.`],
    ['sequencia-14', 14, 'Quinzena sem folga', '14d', 'prata', `Estude ${META_STREAK_DIARIA} questões por dia, 14 dias seguidos.`],
    ['sequencia-30', 30, 'Mês de ferro', '30d', 'prata', `Estude ${META_STREAK_DIARIA} questões por dia, 30 dias seguidos.`],
    ['sequencia-60', 60, 'Bimestre blindado', '60d', 'ouro', `Estude ${META_STREAK_DIARIA} questões por dia, 60 dias seguidos.`],
    ['sequencia-100', 100, 'Cem dias', '100d', 'ouro', `Estude ${META_STREAK_DIARIA} questões por dia, 100 dias seguidos.`],
    ['sequencia-200', 200, 'Inquebrável', '200d', 'esmeralda', `Estude ${META_STREAK_DIARIA} questões por dia, 200 dias seguidos.`],
    ['sequencia-365', 365, 'Um ano sem faltar', '365', 'lendario', `Estude ${META_STREAK_DIARIA} questões por dia, 365 dias seguidos.`],
  ]),
  ...familia('dias', 'dias', [
    ['dias-3', 3, 'Recém-chegado', '3', 'bronze', 'Estude em 3 dias diferentes, seguidos ou não.'],
    ['dias-7', 7, 'Frequentador', '7', 'bronze', 'Estude em 7 dias diferentes.'],
    ['dias-15', 15, 'Rosto conhecido', '15', 'prata', 'Estude em 15 dias diferentes.'],
    ['dias-30', 30, 'Da casa', '30', 'prata', 'Estude em 30 dias diferentes.'],
    ['dias-60', 60, 'Morador do hospital', '60', 'ouro', 'Estude em 60 dias diferentes.'],
    ['dias-100', 100, 'Centenário', '100', 'ouro', 'Estude em 100 dias diferentes.'],
    ['dias-200', 200, 'Veterano de plantão', '200', 'esmeralda', 'Estude em 200 dias diferentes.'],
    ['dias-365', 365, 'Um ano de estrada', '365', 'lendario', 'Estude em 365 dias diferentes.'],
  ]),
  ...familia('acertos', 'acertos', [
    ['acertos-50', 50, 'Mão firme', '50', 'bronze', 'Acerte 50 questões.'],
    ['acertos-250', 250, 'Olho clínico', '250', 'prata', 'Acerte 250 questões.'],
    ['acertos-1000', 1000, 'Diagnóstico certeiro', '1k', 'ouro', 'Acerte 1.000 questões.'],
    ['acertos-2500', 2500, 'Oráculo da ortopedia', '2,5k', 'esmeralda', 'Acerte 2.500 questões.'],
  ]),
  ...familia('dominadas', 'dominadas', [
    ['dominadas-10', 10, 'Fixou', '10', 'bronze', 'Domine 10 questões, acertando também nas revisões.'],
    ['dominadas-100', 100, 'Memória de elefante', '100', 'prata', 'Domine 100 questões.'],
    ['dominadas-500', 500, 'Biblioteca viva', '500', 'ouro', 'Domine 500 questões.'],
    ['dominadas-1000', 1000, 'Enciclopédia ortopédica', '1k', 'lendario', 'Domine 1.000 questões.'],
  ]),
  ...familia('temas', 'temas', [
    ['temas-3', 3, 'Curioso', '3', 'bronze', 'Responda questões de 3 temas diferentes.'],
    ['temas-6', 6, 'Explorador', '6', 'prata', 'Responda questões de 6 temas diferentes.'],
    ['temas-11', 11, 'Mapa completo', '11', 'ouro', 'Responda questões de todos os 11 temas.'],
  ]),
  ...familia('sessoes', 'sessoes', [
    ['sessoes-1', 1, 'Primeira missão', '1', 'bronze', 'Conclua uma sessão de treino ou simulado.'],
    ['sessoes-10', 10, 'Missões em dia', '10', 'prata', 'Conclua 10 sessões.'],
    ['sessoes-50', 50, 'Veterano de campanha', '50', 'ouro', 'Conclua 50 sessões.'],
    ['sessoes-100', 100, 'Comandante', '100', 'esmeralda', 'Conclua 100 sessões.'],
  ]),
  ...familia('maratona', 'maratona', [
    ['maratona-50', 50, 'Maratonista', '50', 'prata', 'Responda 50 questões num mesmo dia.'],
    ['maratona-100', 100, 'Ultramaratona', '100', 'ouro', 'Responda 100 questões num mesmo dia.'],
    ['maratona-200', 200, 'Plantão de 24 horas', '200', 'esmeralda', 'Responda 200 questões num mesmo dia.'],
  ]),
  ...familia('precisao', 'precisao', [
    ['precisao-10', 10, 'Em chamas', '10', 'bronze', 'Acerte 10 questões seguidas.'],
    ['precisao-25', 25, 'Imparável', '25', 'ouro', 'Acerte 25 questões seguidas.'],
    ['precisao-50', 50, 'Perfeição clínica', '50', 'lendario', 'Acerte 50 questões seguidas.'],
  ]),
  ...familia('redencao', 'redencao', [
    ['redencao-10', 10, 'Volta por cima', '10', 'bronze', 'Acerte 10 questões que você tinha errado.'],
    ['redencao-100', 100, 'Redenção', '100', 'prata', 'Acerte 100 questões que você tinha errado.'],
    ['redencao-500', 500, 'Fênix', '500', 'esmeralda', 'Acerte 500 questões que você tinha errado.'],
  ]),
  ...familia('gabarito', 'gabarito', [
    ['gabarito-1', 1, 'Gabaritou', '100%', 'prata', 'Acerte todas as questões de uma sessão com pelo menos 10.'],
    ['gabarito-10', 10, 'Mestre do gabarito', '10×', 'esmeralda', 'Gabarite 10 sessões com pelo menos 10 questões.'],
  ]),
  ...familia('secretas', 'madrugada', [
    ['secreta-madrugada', 1, 'Coruja de plantão', '3h', 'ouro', 'Responda uma questão entre meia-noite e 5 da manhã.'],
  ], true),
  ...familia('secretas', 'fimDeSemana', [
    ['secreta-fim-de-semana', 100, 'Sem folga no fim de semana', 'S/D', 'ouro', 'Responda 100 questões em sábados e domingos.'],
  ], true),
]

/** Compatibilidade: as duas listas originais, agora com identificador. */
export const CONQUISTAS: readonly Conquista[] = EMBLEMAS.filter((e) => e.familia === 'questoes')
export const CONQUISTAS_SEQUENCIA: readonly Conquista[] = EMBLEMAS.filter((e) => e.familia === 'sequencia')

export const VITRINE_MAXIMO = 3
/** A sequência aparece sozinha ao lado do nome (a fogueira); não entra na vitrine. */
export const podeIrParaVitrine = (e: Emblema) => e.familia !== 'sequencia'
export const emblemaPorId = (id: string): Emblema | undefined => EMBLEMAS.find((e) => e.id === id)

/** O emblema mais alto já alcançado, ou null se ainda não bateu o primeiro. */
export function conquistaAtual(total: number, lista: readonly Conquista[] = CONQUISTAS): Conquista | null {
  let atual: Conquista | null = null
  for (const c of lista) if (total >= c.minimo) atual = c
  return atual
}

/** O próximo emblema ainda não alcançado, para mostrar "faltam N". */
export function proximaConquista(total: number, lista: readonly Conquista[] = CONQUISTAS): Conquista | null {
  return lista.find((c) => total < c.minimo) ?? null
}

export interface Metricas {
  questoes: number
  sequencia: number
  dias: number
  acertos: number
  dominadas: number
  temas: number
  sessoes: number
  maratona: number
  precisao: number
  redencao: number
  gabarito: number
  madrugada: number
  fimDeSemana: number
}

interface SessaoConcluida { respondidas: number; acertos: number }

/**
 * Lê as métricas das respostas e das sessões. Os eventos por dia vêm do
 * histórico curto de cada questão (as respostas mais recentes) ou, nos
 * registros antigos, da data da última resposta; por isso dias, maratona e
 * acertos seguidos são estimativas que só crescem com o uso.
 */
export function calcularMetricas(respondidas: Record<string, Partial<RegistroQuestao>>, sessoes: readonly SessaoConcluida[] = [], agora = Date.now()): Metricas {
  const temas = new Set<string>()
  const porDia = new Map<string, number>()
  const eventos: Array<{ em: number; correta: boolean | null }> = []
  let acertos = 0, dominadasTotal = 0, redencao = 0, madrugada = 0, fimDeSemana = 0
  for (const [id, registro] of Object.entries(respondidas)) {
    temas.add(id.replace(/-\d+$/, ''))
    if (registro.c === true) acertos++
    if (dominada(registro)) dominadasTotal++
    if (registro.c === true && ((registro.erros ?? 0) > 0 || registro.historico?.some((e) => e.correta === false))) redencao++
    const lista = registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c ?? null }] : []
    for (const evento of lista) {
      eventos.push(evento)
      const chave = chaveDia(evento.em)
      porDia.set(chave, (porDia.get(chave) ?? 0) + 1)
      const data = new Date(evento.em)
      if (data.getHours() < 5) madrugada++
      if (data.getDay() === 0 || data.getDay() === 6) fimDeSemana++
    }
  }
  eventos.sort((a, b) => a.em - b.em)
  let precisao = 0, seguidos = 0
  for (const evento of eventos) {
    if (evento.correta === true) precisao = Math.max(precisao, ++seguidos)
    else if (evento.correta === false) seguidos = 0
  }
  return {
    questoes: Object.keys(respondidas).length,
    // A sequência vale enquanto está viva: perdeu, o emblema some e recomeça do zero.
    sequencia: calcularStreak(respondidas, agora).atual,
    dias: porDia.size,
    acertos,
    dominadas: dominadasTotal,
    temas: temas.size,
    sessoes: sessoes.length,
    maratona: Math.max(0, ...porDia.values()),
    precisao,
    redencao,
    gabarito: sessoes.filter((s) => s.respondidas >= 10 && s.acertos === s.respondidas).length,
    madrugada,
    fimDeSemana,
  }
}

export const desbloqueado = (emblema: Emblema, metricas: Metricas) => metricas[emblema.metrica] >= emblema.minimo
