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
  | 'maratona' | 'precisao' | 'redencao' | 'gabarito' | 'mestre' | 'especialista' | 'aproveitamento'
  | 'resistencia' | 'colecao' | 'anotacoes' | 'secretas'

export interface Emblema extends Conquista {
  familia: FamiliaId
  /** O que é preciso fazer, escrito para quem ainda não conseguiu. */
  descricao: string
  /** Métrica que decide a conquista (cada família secreta usa a sua). */
  metrica: MetricaNumerica
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
  { id: 'mestre', titulo: 'Mestres de tema', unidade: (v) => `${v} acertos no tema` },
  { id: 'especialista', titulo: 'Especialistas por prova', unidade: (v) => `${n(v)} questões da prova` },
  { id: 'aproveitamento', titulo: 'Aproveitamento', unidade: (v) => `${v}% de acerto` },
  { id: 'resistencia', titulo: 'Resistência', unidade: (v) => `${v} questões numa sessão` },
  { id: 'colecao', titulo: 'Coleção', unidade: (v) => `${v} favoritas` },
  { id: 'anotacoes', titulo: 'Caderno de campo', unidade: (v) => `${v} anotações` },
  { id: 'secretas', titulo: 'Secretas', unidade: () => 'secreta' },
]

/** Mestre de tema: acertos no tema e acertos seguidos no tema. */
export const MESTRE_ACERTOS = 100
export const MESTRE_SEGUIDOS = 10
/** Aproveitamento só vale a partir deste número de questões respondidas. */
export const APROVEITAMENTO_MINIMO = 200

/** Grupos de prova dos emblemas de especialista (sufixo do id). */
export type GrupoProva = 'teot' | 'taro' | 'mao' | 'coluna' | 'enare' | 'tecoc' | 'quadril'

type Linha = [id: string, minimo: number, rotulo: string, curto: string, nivel: NivelMedalha, descricao: string]

function familia(f: FamiliaId, metrica: MetricaNumerica, linhas: Linha[], secreta = false): Emblema[] {
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
    ['questoes-4000', 4000, 'Lenda do Orto Questões', '4k', 'lendario', 'Responda 4.000 questões diferentes.'],
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
    ['acertos-4000', 4000, 'Lenda viva', '4k', 'lendario', 'Acerte 4.000 questões.'],
  ]),
  ...familia('dominadas', 'dominadas', [
    ['dominadas-10', 10, 'Fixou', '10', 'bronze', 'Domine 10 questões, acertando também nas revisões.'],
    ['dominadas-100', 100, 'Memória de elefante', '100', 'prata', 'Domine 100 questões.'],
    ['dominadas-500', 500, 'Biblioteca viva', '500', 'ouro', 'Domine 500 questões.'],
    ['dominadas-1000', 1000, 'Enciclopédia ortopédica', '1k', 'esmeralda', 'Domine 1.000 questões.'],
    ['dominadas-2000', 2000, 'Memória absoluta', '2k', 'lendario', 'Domine 2.000 questões.'],
  ]),
  ...familia('temas', 'temas', [
    ['temas-3', 3, 'Curioso', '3', 'bronze', 'Responda questões de 3 temas diferentes.'],
    ['temas-6', 6, 'Explorador', '6', 'prata', 'Responda questões de 6 temas diferentes.'],
    ['temas-11', 11, 'Mapa completo', '11', 'ouro', 'Responda questões de todos os 11 temas.'],
  ]),
  ...familia('sessoes', 'sessoes', [
    ['sessoes-1', 1, 'Primeira missão', '1', 'bronze', 'Conclua uma sessão de treino ou simulado.'],
    ['sessoes-10', 10, 'Missões em dia', '10', 'prata', 'Conclua 10 sessões.'],
    ['sessoes-25', 25, 'Veterano de campanha', '25', 'ouro', 'Conclua 25 sessões.'],
    ['sessoes-50', 50, 'Comandante', '50', 'esmeralda', 'Conclua 50 sessões.'],
    ['sessoes-150', 150, 'General de campanha', '150', 'lendario', 'Conclua 150 sessões.'],
  ]),
  ...familia('maratona', 'maratona', [
    ['maratona-50', 50, 'Maratonista', '50', 'prata', 'Responda 50 questões num mesmo dia.'],
    ['maratona-100', 100, 'Ultramaratona', '100', 'ouro', 'Responda 100 questões num mesmo dia.'],
    ['maratona-200', 200, 'Plantão de 24 horas', '200', 'esmeralda', 'Responda 200 questões num mesmo dia.'],
    ['maratona-300', 300, 'Plantão de 36 horas', '300', 'lendario', 'Responda 300 questões num mesmo dia.'],
  ]),
  ...familia('precisao', 'precisao', [
    ['precisao-10', 10, 'Em chamas', '10', 'bronze', 'Acerte 10 questões seguidas.'],
    ['precisao-25', 25, 'Imparável', '25', 'ouro', 'Acerte 25 questões seguidas.'],
    ['precisao-50', 50, 'Perfeição clínica', '50', 'esmeralda', 'Acerte 50 questões seguidas.'],
    ['precisao-100', 100, 'Cem sem errar', '100', 'lendario', 'Acerte 100 questões seguidas.'],
  ]),
  ...familia('redencao', 'redencao', [
    ['redencao-10', 10, 'Curativo', '10', 'bronze', 'Acerte 10 questões que você tinha errado.'],
    ['redencao-50', 50, 'Calo ósseo', '50', 'prata', 'Acerte 50 questões que você tinha errado.'],
    ['redencao-100', 100, 'Volta por cima', '100', 'ouro', 'Acerte 100 questões que você tinha errado.'],
    ['redencao-250', 250, 'Consolidação', '250', 'esmeralda', 'Acerte 250 questões que você tinha errado.'],
    ['redencao-500', 500, 'Fênix', '500', 'lendario', 'Acerte 500 questões que você tinha errado.'],
  ]),
  ...familia('gabarito', 'gabarito', [
    ['gabarito-1', 1, 'Gabaritou', '100%', 'prata', 'Acerte todas as questões de uma sessão com pelo menos 10.'],
    ['gabarito-10', 10, 'Mestre do gabarito', '10×', 'esmeralda', 'Gabarite 10 sessões com pelo menos 10 questões.'],
    ['gabarito-25', 25, 'Gabarito de ouro', '25×', 'lendario', 'Gabarite 25 sessões com pelo menos 10 questões.'],
  ]),
  ...familia('mestre', 'acertosTema', [
    ['mestre-coluna', 100, 'Mestre da coluna', 'Col', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de coluna, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-conceitos-basicos', 100, 'Mestre dos fundamentos', 'Fun', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de conceitos básicos, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-joelho', 100, 'Mestre do joelho', 'Joe', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de joelho, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-mao', 100, 'Mestre da mão', 'Mão', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de mão e punho, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-ombro-cotovelo', 100, 'Mestre do ombro e cotovelo', 'Omb', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de ombro e cotovelo, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-osteometabolicas', 100, 'Mestre do metabolismo ósseo', 'Ost', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de doenças osteometabólicas, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-pe-tornozelo', 100, 'Mestre do pé e tornozelo', 'Pé', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de pé e tornozelo, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-pediatria', 100, 'Mestre da pediatria', 'Ped', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de ortopedia pediátrica, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-quadril', 100, 'Mestre do quadril', 'Qua', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de quadril, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-trauma', 100, 'Mestre do trauma', 'Tra', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de trauma, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
    ['mestre-tumores', 100, 'Mestre dos tumores', 'Tum', 'esmeralda', `Acerte ${MESTRE_ACERTOS} questões de tumores, com pelo menos ${MESTRE_SEGUIDOS} acertos seguidos no tema.`],
  ]),
  ...familia('especialista', 'provaGrupo', [
    ['especialista-teot', 300, 'Especialista TEOT', 'TEOT', 'ouro', 'Responda 300 questões do TEOT.'],
    ['especialista-taro', 1000, 'Especialista TARO', 'TARO', 'ouro', 'Responda 1.000 questões do TARO.'],
    ['especialista-mao', 300, 'Cirurgião da mão', 'Mão', 'esmeralda', 'Responda 300 questões das provas de cirurgia da mão.'],
    ['especialista-coluna', 150, 'Cirurgião de coluna', 'R4C', 'esmeralda', 'Responda 150 questões das provas de R4 de coluna.'],
    ['especialista-enare', 100, 'R4 do ENARE', 'R4', 'ouro', 'Responda 100 questões do R4 do ENARE.'],
    ['especialista-tecoc', 100, 'Especialista em ombro e cotovelo', 'Omb', 'ouro', 'Responda 100 questões do TECOC.'],
    ['especialista-quadril', 150, 'Especialista em quadril', 'Qua', 'esmeralda', 'Responda 150 questões do Fellowship Quadril.'],
  ]),
  ...familia('aproveitamento', 'aproveitamento', [
    ['aproveitamento-60', 60, 'Consistente', '60%', 'prata', `Mantenha 60% de acerto na primeira tentativa, com pelo menos ${APROVEITAMENTO_MINIMO} questões respondidas.`],
    ['aproveitamento-70', 70, 'Afiado', '70%', 'ouro', `Mantenha 70% de acerto na primeira tentativa, com pelo menos ${APROVEITAMENTO_MINIMO} questões respondidas.`],
    ['aproveitamento-80', 80, 'Elite', '80%', 'esmeralda', `Mantenha 80% de acerto na primeira tentativa, com pelo menos ${APROVEITAMENTO_MINIMO} questões respondidas.`],
    ['aproveitamento-90', 90, 'Padrão-ouro', '90%', 'lendario', `Mantenha 90% de acerto na primeira tentativa, com pelo menos ${APROVEITAMENTO_MINIMO} questões respondidas.`],
  ]),

  ...familia('resistencia', 'sessaoLonga', [
    ['resistencia-30', 30, 'Fôlego de residente', '30', 'prata', 'Conclua uma sessão com pelo menos 30 questões.'],
    ['resistencia-60', 60, 'Prova de fogo', '60', 'ouro', 'Conclua uma sessão com pelo menos 60 questões.'],
    ['resistencia-100', 100, 'Simulado de titã', '100', 'esmeralda', 'Conclua uma sessão com pelo menos 100 questões.'],
  ]),
  ...familia('colecao', 'favoritas', [
    ['colecao-10', 10, 'Colecionador', '10', 'bronze', 'Marque 10 questões como favoritas.'],
    ['colecao-50', 50, 'Curador do acervo', '50', 'prata', 'Marque 50 questões como favoritas.'],
  ]),
  ...familia('anotacoes', 'notas', [
    ['anotacoes-5', 5, 'Diário de bordo', '5', 'bronze', 'Escreva anotações em 5 questões.'],
    ['anotacoes-25', 25, 'Caderno de campo', '25', 'prata', 'Escreva anotações em 25 questões.'],
    ['anotacoes-100', 100, 'Tratado de ortopedia', '100', 'ouro', 'Escreva anotações em 100 questões.'],
  ]),
  ...familia('secretas', 'madrugador', [
    ['secreta-madrugador', 10, 'Galo do plantão', '6h', 'prata', 'Responda 10 questões entre 5 e 7 da manhã.'],
  ], true),
  ...familia('secretas', 'sextou', [
    ['secreta-sextou', 20, 'Sextou no plantão', 'sex', 'ouro', 'Responda 20 questões numa sexta-feira depois das 20h.'],
  ], true),
  ...familia('secretas', 'madrugada', [
    ['secreta-madrugada', 1, 'Coruja de plantão', '3h', 'ouro', 'Responda uma questão entre meia-noite e 5 da manhã.'],
  ], true),
  ...familia('secretas', 'fimDeSemana', [
    ['secreta-fim-de-semana', 100, 'Sem folga no fim de semana', 'S/D', 'ouro', 'Responda 100 questões em sábados e domingos.'],
  ], true),
  ...familia('secretas', 'tresQuatorze', [
    ['secreta-3h14', 1, 'Plantão das 3h14', '3:14', 'ouro', 'Responda uma questão exatamente às 3h14 da madrugada.'],
  ], true),
  ...familia('secretas', 'noitesInsones', [
    ['secreta-insone', 10, 'Coruja veterana', 'zz', 'esmeralda', 'Estude de madrugada (entre meia-noite e 5h) em 10 noites diferentes.'],
  ], true),
  ...familia('secretas', 'virada', [
    ['secreta-virada', 1, 'Virada de jogo', '↺', 'esmeralda', 'Depois de errar 5 seguidas, acerte as 10 seguintes.'],
  ], true),
  ...familia('secretas', 'natal', [
    ['secreta-natal', 1, 'Plantão de Natal', '25', 'ouro', 'Estude no dia de Natal.'],
  ], true),
  ...familia('secretas', 'anoNovo', [
    ['secreta-ano-novo', 1, 'Ano novo, mesma meta', '1/1', 'ouro', 'Estude no primeiro dia do ano.'],
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
  sessaoLonga: number
  favoritas: number
  notas: number
  madrugador: number
  sextou: number
  tresQuatorze: number
  noitesInsones: number
  virada: number
  natal: number
  anoNovo: number
  /** Porcentagem de acerto na primeira tentativa (0 enquanto houver menos de APROVEITAMENTO_MINIMO questões). */
  aproveitamento: number
  /** Marcador das conquistas por tema: o valor real vem de porTema. */
  acertosTema: number
  porTema: Record<string, number>
  /** Maior sequência de acertos dentro de cada tema. */
  seguidosTema: Record<string, number>
  /** Marcador dos especialistas: o valor real vem de porProva. */
  provaGrupo: number
  porProva: Partial<Record<GrupoProva, number>>
}

type MetricaNumerica = Exclude<keyof Metricas, 'porTema' | 'seguidosTema' | 'porProva'>

interface SessaoConcluida { respondidas: number; acertos: number }
export interface Extras {
  favoritas?: number
  notas?: number
  /** Grupos de prova de cada questão, vindos do índice do acervo. */
  grupos?: ReadonlyMap<string, readonly GrupoProva[]>
}

/** Acertou na primeira vez? Sem erros, sim; com erros, só se o histórico guardado começa na primeira tentativa. */
function acertouDePrimeira(registro: Partial<RegistroQuestao>): boolean | null {
  if (registro.c === null || registro.c === undefined) return null
  if ((registro.erros ?? 0) === 0) return registro.c === true
  const historico = registro.historico ?? []
  if (historico.length && historico.length >= (registro.tentativas ?? Infinity)) return historico[0].correta === true
  return false
}

/**
 * Lê as métricas das respostas e das sessões. Os eventos por dia vêm do
 * histórico curto de cada questão (as respostas mais recentes) ou, nos
 * registros antigos, da data da última resposta; por isso dias, maratona e
 * acertos seguidos são estimativas que só crescem com o uso.
 */
export function calcularMetricas(respondidas: Record<string, Partial<RegistroQuestao>>, sessoes: readonly SessaoConcluida[] = [], extras: Extras = {}, agora = Date.now()): Metricas {
  const temas = new Set<string>()
  const porDia = new Map<string, number>()
  const eventos: Array<{ em: number; correta: boolean | null; tema: string }> = []
  const porProva: Partial<Record<GrupoProva, number>> = {}
  const noites = new Set<string>()
  let tresQuatorze = 0, natal = 0, anoNovo = 0, primeiras = 0, primeirasCertas = 0
  let acertos = 0, dominadasTotal = 0, redencao = 0, madrugada = 0, fimDeSemana = 0, madrugador = 0
  const porTema: Record<string, number> = {}
  const sextaNoite = new Map<string, number>()
  for (const [id, registro] of Object.entries(respondidas)) {
    const tema = id.replace(/-\d+$/, '')
    temas.add(tema)
    if (registro.c === true) { acertos++; porTema[tema] = (porTema[tema] ?? 0) + 1 }
    if (dominada(registro)) dominadasTotal++
    for (const g of extras.grupos?.get(id) ?? []) porProva[g] = (porProva[g] ?? 0) + 1
    const primeira = acertouDePrimeira(registro)
    if (primeira !== null) { primeiras++; if (primeira) primeirasCertas++ }
    if (registro.c === true && ((registro.erros ?? 0) > 0 || registro.historico?.some((e) => e.correta === false))) redencao++
    const lista = registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c ?? null }] : []
    for (const evento of lista) {
      eventos.push({ em: evento.em, correta: evento.correta, tema })
      const chave = chaveDia(evento.em)
      porDia.set(chave, (porDia.get(chave) ?? 0) + 1)
      const data = new Date(evento.em)
      if (data.getHours() < 5) { madrugada++; noites.add(chave) }
      if (data.getHours() === 3 && data.getMinutes() === 14) tresQuatorze++
      if (data.getMonth() === 11 && data.getDate() === 25) natal++
      if (data.getMonth() === 0 && data.getDate() === 1) anoNovo++
      if (data.getHours() >= 5 && data.getHours() < 7) madrugador++
      if (data.getDay() === 5 && data.getHours() >= 20) { const c = chaveDia(evento.em); sextaNoite.set(c, (sextaNoite.get(c) ?? 0) + 1) }
      if (data.getDay() === 0 || data.getDay() === 6) fimDeSemana++
    }
  }
  eventos.sort((a, b) => a.em - b.em)
  let precisao = 0, seguidos = 0, errosSeguidos = 0, aposErros = -1, virada = 0
  const seguidosTema: Record<string, number> = {}
  const atualTema: Record<string, number> = {}
  for (const evento of eventos) {
    if (evento.correta === true) {
      precisao = Math.max(precisao, ++seguidos)
      atualTema[evento.tema] = (atualTema[evento.tema] ?? 0) + 1
      seguidosTema[evento.tema] = Math.max(seguidosTema[evento.tema] ?? 0, atualTema[evento.tema])
      // Virada: 5 erros seguidos e, logo depois, 10 acertos seguidos.
      if (aposErros >= 0 && ++aposErros >= 10) { virada = 1; aposErros = -1 }
      errosSeguidos = 0
    } else if (evento.correta === false) {
      seguidos = 0
      atualTema[evento.tema] = 0
      aposErros = -1
      if (++errosSeguidos >= 5) aposErros = 0
    }
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
    sessaoLonga: Math.max(0, ...sessoes.map((s) => s.respondidas)),
    favoritas: extras.favoritas ?? 0,
    notas: extras.notas ?? 0,
    madrugador,
    sextou: Math.max(0, ...sextaNoite.values()),
    tresQuatorze,
    noitesInsones: noites.size,
    virada,
    natal,
    anoNovo,
    aproveitamento: primeiras >= APROVEITAMENTO_MINIMO ? Math.floor((100 * primeirasCertas) / primeiras) : 0,
    acertosTema: 0,
    porTema,
    seguidosTema,
    provaGrupo: 0,
    porProva,
  }
}

/** Valor atual da métrica de um emblema; os de tema leem o acerto daquele tema. */
export function valorDe(emblema: Emblema, metricas: Metricas): number {
  if (emblema.familia === 'mestre') {
    const tema = emblema.id.replace(/^mestre-/, '')
    const acertos = metricas.porTema[tema] ?? 0
    // Sem os acertos seguidos no tema, o progresso para logo antes da meta.
    return (metricas.seguidosTema?.[tema] ?? 0) >= MESTRE_SEGUIDOS ? acertos : Math.min(acertos, emblema.minimo - 1)
  }
  if (emblema.familia === 'especialista') return metricas.porProva?.[emblema.id.replace(/^especialista-/, '') as GrupoProva] ?? 0
  return metricas[emblema.metrica]
}

export const desbloqueado = (emblema: Emblema, metricas: Metricas) => valorDe(emblema, metricas) >= emblema.minimo
