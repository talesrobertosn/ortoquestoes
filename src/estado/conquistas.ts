/**
 * Conquistas, no espírito das de jogo: várias famílias, cada uma com níveis,
 * e algumas secretas que só se revelam quando desbloqueadas. Tudo é calculado
 * a partir do que já fica guardado na conta (respostas e sessões), então uma
 * conquista vale para sempre e aparece igual em qualquer aparelho sincronizado.
 *
 * A família "questões" continua sendo o emblema padrão ao lado do nome; a
 * pessoa pode trocar por até três conquistas à escolha (a vitrine).
 *
 * Emblema tem que ser difícil (estilo souls-like): ler docs/emblemas.md antes de criar um.
 */
import type { RegistroQuestao } from './revisao'
import { dominada } from './revisao'
import { calcularStreak, META_STREAK_DIARIA } from './streak'
import { chaveDia } from './planoRevisao'
import { diasRetaFinal } from '../dados/planoEstudo'
import type { FeitosServidor } from '../conta/feitos'

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
  | 'resistencia' | 'colecao' | 'anotacoes' | 'pseudartrose' | 'imagem' | 'certeza' | 'provas' | 'assuntos'
  | 'horaDeOuro' | 'calibrado' | 'contraCorrente' | 'completo' | 'notaDeCorte' | 'curva' | 'runSemDano' | 'chefes'
  | 'pontual' | 'filaZerada' | 'cronograma' | 'nacional' | 'arena' | 'indicacao' | 'revisor' | 'editorial' | 'secretas'

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
  { id: 'pseudartrose', titulo: 'Pseudartrose', unidade: (v) => `${n(v)} erros antigos dominados` },
  { id: 'imagem', titulo: 'Olho de radiologista', unidade: (v) => `${n(v)} acertos com imagem` },
  { id: 'certeza', titulo: 'Certeza cirúrgica', unidade: (v) => `${v} acertos com certeza seguidos` },
  { id: 'provas', titulo: 'Provas vencidas', unidade: (v) => `${v} ${v === 1 ? 'prova vencida' : 'provas vencidas'}` },
  { id: 'assuntos', titulo: 'Generalista', unidade: (v) => `${v} assuntos com 80%` },
  { id: 'horaDeOuro', titulo: 'Hora de ouro', unidade: (v) => `${v} acertos numa hora` },
  { id: 'calibrado', titulo: 'Calibragem', unidade: (v) => `${v}% de acerto quando tem certeza` },
  { id: 'contraCorrente', titulo: 'Contra a corrente', unidade: (v) => `${n(v)} acertos que a turma erra` },
  { id: 'completo', titulo: 'Ortopedista completo', unidade: (v) => `${v} temas com 80%` },
  { id: 'notaDeCorte', titulo: 'Nota de corte', unidade: (v) => `${v} provas de 100 com 70%` },
  { id: 'curva', titulo: 'Curva de aprendizado', unidade: (v) => `+${v} pontos de acerto` },
  { id: 'runSemDano', titulo: 'Run sem dano', unidade: (v) => `${v} dias seguidos com 70%` },
  { id: 'chefes', titulo: 'Chefões', unidade: (v) => `${v}` },
  { id: 'pontual', titulo: 'Questão do Dia', unidade: (v) => `${v} dias seguidos` },
  { id: 'filaZerada', titulo: 'Fila zerada', unidade: (v) => `${v} dias seguidos` },
  { id: 'cronograma', titulo: 'Cronograma', unidade: (v) => `${v} dias de meta seguidos` },
  { id: 'nacional', titulo: 'Simulado Nacional', unidade: (v) => `${v} edições seguidas` },
  { id: 'arena', titulo: 'Arena semanal', unidade: (v) => `${v} semanas seguidas` },
  { id: 'indicacao', titulo: 'Indicação', unidade: (v) => `${v} amigos` },
  { id: 'revisor', titulo: 'Revisor de banca', unidade: (v) => `${v} erros corrigidos` },
  { id: 'editorial', titulo: 'Conselho editorial', unidade: (v) => `${n(v)} comentários avaliados` },
  { id: 'secretas', titulo: 'Secretas', unidade: () => 'secreta' },
]

/** Mestre de tema: acertos no tema e acertos seguidos no tema. */
export const MESTRE_ACERTOS = 100
export const MESTRE_SEGUIDOS = 10
/** Aproveitamento só vale a partir deste número de questões respondidas. */
export const APROVEITAMENTO_MINIMO = 200

/**
 * Emblemas difíceis de propósito (estilo souls-like): a pessoa tem que brigar por eles.
 * Pseudartrose: questão errada pelo menos esta quantidade de vezes e hoje dominada.
 */
export const PSEUDARTROSE_ERROS = 3
/** Generalista: o assunto conta com pelo menos estas respostas e este acerto. */
export const ASSUNTO_MINIMO = 5
export const ASSUNTO_ACERTO = 0.8
/** Prova vencida (TEOT ou TARO de um ano): todas as questões respondidas e este acerto sobre o total. */
export const PROVA_ACERTO = 0.7
/** Véspera: a sessão concluída no dia anterior à prova precisa deste tamanho e deste acerto. */
export const VESPERA_QUESTOES = 100
export const VESPERA_ACERTO = 0.7
/** Datas da prova teórica do TEOT e do TEPOT (AAAA-MM-DD). Acrescentar a de cada ano. */
export const DATAS_PROVA = ['2027-01-10'] as const
/** Lei de Wolff: a primeira semana da escada precisa de pelo menos isto. */
export const WOLFF_PRIMEIRA_SEMANA = 50
/** Tríade terrível: sessões perfeitas no mesmo dia, cada uma com pelo menos isto. */
export const TRIADE_QUESTOES = 20

/** Calibrado: só conta com pelo menos esta quantidade de respostas marcadas com certeza. */
export const CALIBRADO_MINIMO = 300
/** Ortopedista completo: acerto de primeira e respostas mínimas em cada tema. */
export const COMPLETO_ACERTO = 0.8
export const COMPLETO_MINIMO = 100
/** Nota de corte: sessões com pelo menos estas questões e este acerto. */
export const CORTE_QUESTOES = 100
export const CORTE_ACERTO = 0.7
/** Curva de aprendizado: compara as primeiras e as últimas questões respondidas pela primeira vez. */
export const CURVA_JANELA = 500
/** Run sem dano: acerto mínimo de cada dia da sequência. */
export const RUN_ACERTO = 0.7
/** Chefões. TEOT inteiro: tempo por questão de prova real (100 questões em 4 horas). */
export const CHEFE_TEOT_ACERTO = 0.75
export const CHEFE_SEGUNDOS_POR_QUESTAO = 144
export const SEM_MORRER_QUESTOES = 100
export const SEM_MORRER_ACERTO = 0.85
/** Simulado Nacional: elite (10% melhores) e campeão só valem em edições com pelo menos tantos classificados. */
export const NACIONAL_MINIMO_CLASSIFICADOS = 20

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
  ...familia('pseudartrose', 'pseudartrose', [
    ['pseudartrose-10', 10, 'Pseudartrose tratada', '10', 'ouro', `Domine 10 questões que você errou ${PSEUDARTROSE_ERROS} vezes ou mais, acertando também em todas as revisões.`],
    ['pseudartrose-50', 50, 'Enxerto e placa', '50', 'esmeralda', `Domine 50 questões que você errou ${PSEUDARTROSE_ERROS} vezes ou mais.`],
    ['pseudartrose-150', 150, 'Consolidação impossível', '150', 'lendario', `Domine 150 questões que você errou ${PSEUDARTROSE_ERROS} vezes ou mais.`],
  ]),
  ...familia('imagem', 'imagem', [
    ['imagem-50', 50, 'Olho de radiologista', '50', 'prata', 'Acerte 50 questões com imagem.'],
    ['imagem-200', 200, 'Negatoscópio', '200', 'ouro', 'Acerte 200 questões com imagem.'],
    ['imagem-500', 500, 'Raio X humano', '500', 'lendario', 'Acerte 500 questões com imagem.'],
  ]),
  ...familia('certeza', 'certeza', [
    ['certeza-30', 30, 'Certeza cirúrgica', '30', 'ouro', 'Acerte 30 questões seguidas marcadas com "tenho certeza". Qualquer erro zera; acerto com dúvida ou chute não soma.'],
    ['certeza-60', 60, 'Mão de cirurgião', '60', 'esmeralda', 'Acerte 60 questões seguidas com "tenho certeza", sem nenhum erro no meio.'],
    ['certeza-120', 120, 'Sem tremor', '120', 'lendario', 'Acerte 120 questões seguidas com "tenho certeza", sem nenhum erro no meio.'],
  ]),
  ...familia('provas', 'provasVencidas', [
    ['provas-1', 1, 'Prova vencida', '1', 'ouro', `Responda todas as questões de um TEOT ou de um TARO de um ano e fique com pelo menos ${PROVA_ACERTO * 100}% delas certas.`],
    ['provas-8', 8, 'Arqueólogo de provas', '8', 'esmeralda', `Vença 8 provas (TEOT ou TARO de um ano): todas as questões respondidas e ${PROVA_ACERTO * 100}% certas.`],
    ['provas-20', 20, 'Guardião das provas', '20', 'lendario', `Vença 20 provas (TEOT ou TARO de um ano): todas as questões respondidas e ${PROVA_ACERTO * 100}% certas.`],
  ]),
  ...familia('assuntos', 'assuntos', [
    ['assuntos-30', 30, 'Generalista', '30', 'ouro', `Tenha ${ASSUNTO_ACERTO * 100}% de acerto em 30 assuntos diferentes, com pelo menos ${ASSUNTO_MINIMO} questões respondidas em cada.`],
    ['assuntos-100', 100, 'Ortopedista geral', '100', 'esmeralda', `Tenha ${ASSUNTO_ACERTO * 100}% de acerto em 100 assuntos diferentes, com pelo menos ${ASSUNTO_MINIMO} questões em cada.`],
    ['assuntos-200', 200, 'Tratado vivo', '200', 'lendario', `Tenha ${ASSUNTO_ACERTO * 100}% de acerto em 200 assuntos diferentes, com pelo menos ${ASSUNTO_MINIMO} questões em cada.`],
  ]),
  ...familia('horaDeOuro', 'horaDeOuro', [
    ['hora-30', 30, 'Hora de ouro', '30', 'ouro', 'Acerte 30 questões dentro de uma mesma hora.'],
    ['hora-50', 50, 'Sala vermelha', '50', 'esmeralda', 'Acerte 50 questões dentro de uma mesma hora.'],
    ['hora-70', 70, 'Politrauma', '70', 'lendario', 'Acerte 70 questões dentro de uma mesma hora.'],
  ]),
  ...familia('calibrado', 'calibrado', [
    ['calibrado-90', 90, 'Calibrado', '90%', 'ouro', `Acerte 90% das respostas marcadas com "tenho certeza", com pelo menos ${CALIBRADO_MINIMO} delas.`],
    ['calibrado-95', 95, 'Olho de lince', '95%', 'esmeralda', `Acerte 95% das respostas marcadas com "tenho certeza", com pelo menos ${CALIBRADO_MINIMO} delas.`],
    ['calibrado-98', 98, 'Vidente', '98%', 'lendario', `Acerte 98% das respostas marcadas com "tenho certeza", com pelo menos ${CALIBRADO_MINIMO} delas.`],
  ]),
  ...familia('contraCorrente', 'contraCorrente', [
    ['contra-50', 50, 'Contra a corrente', '50', 'ouro', 'Acerte de primeira 50 questões em que a turma acerta menos da metade.'],
    ['contra-150', 150, 'Lobo solitário', '150', 'esmeralda', 'Acerte de primeira 150 questões em que a turma acerta menos da metade.'],
    ['contra-300', 300, 'Cavaleiro errante', '300', 'lendario', 'Acerte de primeira 300 questões em que a turma acerta menos da metade.'],
  ]),
  ...familia('completo', 'completo', [
    ['completo-4', 4, 'Escudeiro das áreas', '4', 'ouro', `Tenha ${COMPLETO_ACERTO * 100}% de acerto de primeira em 4 temas, com pelo menos ${COMPLETO_MINIMO} questões respondidas em cada.`],
    ['completo-8', 8, 'Cavaleiro das áreas', '8', 'esmeralda', `Tenha ${COMPLETO_ACERTO * 100}% de acerto de primeira em 8 temas, com pelo menos ${COMPLETO_MINIMO} questões em cada.`],
    ['completo-11', 11, 'Ortopedista completo', '11', 'lendario', `Tenha ${COMPLETO_ACERTO * 100}% de acerto de primeira em todos os 11 temas, com pelo menos ${COMPLETO_MINIMO} questões em cada.`],
  ]),
  ...familia('notaDeCorte', 'notaDeCorte', [
    ['corte-3', 3, 'Nota de corte', '3', 'ouro', `Conclua 3 sessões de pelo menos ${CORTE_QUESTOES} questões com ${CORTE_ACERTO * 100}% de acerto.`],
    ['corte-10', 10, 'Aprovado de novo', '10', 'esmeralda', `Conclua 10 sessões de pelo menos ${CORTE_QUESTOES} questões com ${CORTE_ACERTO * 100}% de acerto.`],
    ['corte-25', 25, 'Titular da banca', '25', 'lendario', `Conclua 25 sessões de pelo menos ${CORTE_QUESTOES} questões com ${CORTE_ACERTO * 100}% de acerto.`],
  ]),
  ...familia('curva', 'curva', [
    ['curva-10', 10, 'Curva de aprendizado', '+10', 'ouro', `Acerte de primeira 10 pontos percentuais a mais nas suas últimas ${CURVA_JANELA} questões novas do que nas primeiras ${CURVA_JANELA}.`],
    ['curva-15', 15, 'Ascensão', '+15', 'esmeralda', `Melhore 15 pontos de acerto de primeira entre as suas primeiras e as últimas ${CURVA_JANELA} questões novas.`],
    ['curva-20', 20, 'Transformação', '+20', 'lendario', `Melhore 20 pontos de acerto de primeira entre as suas primeiras e as últimas ${CURVA_JANELA} questões novas.`],
  ]),
  ...familia('runSemDano', 'runSemDano', [
    ['run-7', 7, 'Run sem dano', '7', 'ouro', `Estude ${META_STREAK_DIARIA} questões por dia, 7 dias seguidos, com pelo menos ${RUN_ACERTO * 100}% de acerto em cada dia.`],
    ['run-30', 30, 'Intocável', '30', 'esmeralda', `Estude ${META_STREAK_DIARIA} questões por dia, 30 dias seguidos, com pelo menos ${RUN_ACERTO * 100}% de acerto em cada dia.`],
    ['run-60', 60, 'Imortal', '60', 'lendario', `Estude ${META_STREAK_DIARIA} questões por dia, 60 dias seguidos, com pelo menos ${RUN_ACERTO * 100}% de acerto em cada dia.`],
  ]),
  ...familia('chefes', 'semMorrer', [
    ['chefe-sem-morrer', 1, 'Sem morrer', '85%', 'esmeralda', `Conclua um simulado cronometrado de pelo menos ${SEM_MORRER_QUESTOES} questões com ${SEM_MORRER_ACERTO * 100}% de acerto.`],
  ]),
  ...familia('chefes', 'chefeTeot', [
    ['chefe-teot', 1, 'Chefe: TEOT inteiro', 'TEOT', 'lendario', `Faça uma prova do TEOT de um ano inteira, num simulado só, com no máximo ${CHEFE_SEGUNDOS_POR_QUESTAO / 60 * 100} minutos para cada 100 questões, e acerte ${CHEFE_TEOT_ACERTO * 100}%.`],
  ]),
  ...familia('chefes', 'newGamePlus', [
    ['chefe-new-game', 1, 'New Game+', 'NG+', 'lendario', 'Domine todas as questões de um tema inteiro.'],
  ]),
  ...familia('chefes', 'platina', [
    ['chefe-platina', 1, 'Platina', 'PT', 'lendario', 'Conquiste todos os outros emblemas que não são secretos (a sequência de dias não entra).'],
  ]),
  ...familia('pontual', 'pontual', [
    ['pontual-30', 30, 'Pontual', '30', 'ouro', 'Responda a Questão do Dia 30 dias seguidos.'],
    ['pontual-100', 100, 'Guardião do dia', '100', 'esmeralda', 'Responda a Questão do Dia 100 dias seguidos.'],
    ['pontual-365', 365, 'Sentinela eterna', '365', 'lendario', 'Responda a Questão do Dia 365 dias seguidos.'],
  ]),
  ...familia('filaZerada', 'filaZerada', [
    ['fila-7', 7, 'Fila zerada', '7', 'ouro', `Zere a fila de Revisar hoje 7 dias seguidos, estudando pelo menos ${META_STREAK_DIARIA} questões em cada dia.`],
    ['fila-30', 30, 'Mesa limpa', '30', 'esmeralda', `Zere a fila de Revisar hoje 30 dias seguidos, estudando pelo menos ${META_STREAK_DIARIA} questões em cada dia.`],
    ['fila-90', 90, 'Masmorra vazia', '90', 'lendario', `Zere a fila de Revisar hoje 90 dias seguidos, estudando pelo menos ${META_STREAK_DIARIA} questões em cada dia.`],
  ]),
  ...familia('cronograma', 'cronograma', [
    ['cronograma-28', 28, 'Cronograma em dia', '28', 'ouro', 'Cumpra a meta do Cronograma 28 dias de estudo seguidos (as folgas do seu plano não quebram).'],
    ['cronograma-84', 84, 'Cronograma impecável', '84', 'esmeralda', 'Cumpra a meta do Cronograma 84 dias de estudo seguidos (12 semanas).'],
  ]),
  ...familia('cronograma', 'cronogramaCompleto', [
    ['cronograma-completo', 1, 'Do início ao fim', 'fim', 'lendario', 'Cumpra a meta do Cronograma em todos os dias de estudo, do dia em que montou o plano até a reta final da prova.'],
  ]),
  ...familia('nacional', 'nacionalSeguidas', [
    ['nacional-3', 3, 'Presença confirmada', '3', 'ouro', 'Entregue no tempo 3 edições seguidas do Simulado Nacional.'],
    ['nacional-6', 6, 'Veterano nacional', '6', 'esmeralda', 'Entregue no tempo 6 edições seguidas do Simulado Nacional.'],
    ['nacional-12', 12, 'Um ano de nacionais', '12', 'lendario', 'Entregue no tempo 12 edições seguidas do Simulado Nacional.'],
  ]),
  ...familia('nacional', 'nacionalElite', [
    ['nacional-elite', 1, 'Elite nacional', '10%', 'esmeralda', `Termine um Simulado Nacional entre os 10% melhores (edição com pelo menos ${NACIONAL_MINIMO_CLASSIFICADOS} classificados).`],
  ]),
  ...familia('nacional', 'nacionalCampeao', [
    ['nacional-campeao', 1, 'Campeão nacional', '1º', 'lendario', `Termine um Simulado Nacional em 1º lugar (edição com pelo menos ${NACIONAL_MINIMO_CLASSIFICADOS} classificados).`],
  ]),
  ...familia('arena', 'arenaCampeao', [
    ['arena-campeao', 1, 'Campeão da semana', '1º', 'ouro', 'Termine uma semana em 1º lugar no ranking semanal.'],
  ]),
  ...familia('arena', 'arenaPodio', [
    ['arena-podio-4', 4, 'Dono da arena', '4', 'esmeralda', 'Termine 4 semanas seguidas no pódio (1º a 3º) do ranking semanal.'],
  ]),
  ...familia('arena', 'arenaReinado', [
    ['arena-rei', 4, 'Rei da arena', '4×1º', 'lendario', 'Termine 4 semanas seguidas em 1º lugar no ranking semanal.'],
  ]),
  ...familia('indicacao', 'indicadosAssinantes', [
    ['indicacao-1', 1, 'Padrinho', '1', 'ouro', 'Indique um amigo que assine o Orto Questões.'],
    ['indicacao-3', 3, 'Chefe da residência', '3', 'esmeralda', 'Indique 3 amigos que assinem o Orto Questões.'],
    ['indicacao-10', 10, 'Fundador do serviço', '10', 'lendario', 'Indique 10 amigos que assinem o Orto Questões.'],
  ]),
  ...familia('indicacao', 'indicados30', [
    ['indicacao-turma', 5, 'Turma completa', '5', 'esmeralda', 'Indique 5 amigos que estudem pelo menos 30 dias cada um.'],
  ]),
  ...familia('revisor', 'relatosResolvidos', [
    ['revisor-3', 3, 'Revisor de banca', '3', 'ouro', 'Relate 3 erros em questões que forem corrigidos no acervo.'],
    ['revisor-10', 10, 'Inquisidor de gabaritos', '10', 'esmeralda', 'Relate 10 erros em questões que forem corrigidos no acervo.'],
    ['revisor-25', 25, 'Guardião do acervo', '25', 'lendario', 'Relate 25 erros em questões que forem corrigidos no acervo.'],
  ]),
  ...familia('editorial', 'comentariosAvaliados', [
    ['editorial-100', 100, 'Conselho editorial', '100', 'ouro', 'Avalie os comentários de 100 questões (útil ou não, com o motivo).'],
    ['editorial-300', 300, 'Crítico implacável', '300', 'esmeralda', 'Avalie os comentários de 300 questões.'],
    ['editorial-1000', 1000, 'Escriba-mor', '1k', 'lendario', 'Avalie os comentários de 1.000 questões.'],
  ]),
  ...familia('secretas', 'chuteMestre', [
    ['secreta-chute', 5, 'Chute de mestre', 'gol', 'esmeralda', 'Acerte 5 chutes seguidos (questões marcadas como chute).'],
  ], true),
  ...familia('secretas', 'triade', [
    ['secreta-triade', 3, 'Tríade terrível', 'III', 'lendario', `Gabarite 3 sessões de pelo menos ${TRIADE_QUESTOES} questões no mesmo dia.`],
  ], true),
  ...familia('secretas', 'vespera', [
    ['secreta-vespera', 1, 'Véspera', 'D-1', 'esmeralda', `Na véspera da prova teórica do TEOT, conclua uma sessão de ${VESPERA_QUESTOES} questões com ${VESPERA_ACERTO * 100}% de acerto.`],
  ], true),
  ...familia('secretas', 'wolff', [
    ['secreta-wolff', 6, 'Lei de Wolff', 'W', 'esmeralda', `Estude 6 semanas seguidas, cada uma com mais questões que a anterior, começando com pelo menos ${WOLFF_PRIMEIRA_SEMANA}.`],
  ], true),
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
  pseudartrose: number
  imagem: number
  /** Maior sequência de acertos com certeza (qualquer erro zera; dúvida e chute não somam). */
  certeza: number
  provasVencidas: number
  assuntos: number
  /** Mais acertos dentro de uma janela de 60 minutos. */
  horaDeOuro: number
  chuteMestre: number
  triade: number
  vespera: number
  wolff: number
  calibrado: number
  contraCorrente: number
  completo: number
  notaDeCorte: number
  curva: number
  runSemDano: number
  semMorrer: number
  chefeTeot: number
  newGamePlus: number
  platina: number
  pontual: number
  filaZerada: number
  cronograma: number
  cronogramaCompleto: number
  nacionalSeguidas: number
  nacionalElite: number
  nacionalCampeao: number
  arenaCampeao: number
  arenaPodio: number
  arenaReinado: number
  indicadosAssinantes: number
  indicados30: number
  relatosResolvidos: number
  comentariosAvaliados: number
  /** Emblemas já conquistados e travados no servidor: não se perdem. */
  travadas?: ReadonlySet<string>
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

type MetricaNumerica = Exclude<keyof Metricas, 'porTema' | 'seguidosTema' | 'porProva' | 'travadas'>

interface SessaoConcluida {
  respondidas: number
  acertos: number
  concluidaEm?: number
  total?: number
  /** Limite de tempo do simulado, em segundos (sessões antigas não têm). */
  limite?: number | null
  provas?: string[]
  anos?: number[]
}
/** O que os emblemas precisam saber de cada questão, vindo do índice do acervo. */
export interface DadosAcervo {
  imagem: ReadonlySet<string>
  subtemas: ReadonlyMap<string, readonly number[]>
  /** Prova vencível ("TEOT 2024") de cada questão; anuladas e cópias ficam de fora. */
  prova: ReadonlyMap<string, string>
  totalProva: ReadonlyMap<string, number>
  /** Questões de cada tema (sem anuladas e cópias), para o New Game+. */
  totalTema?: ReadonlyMap<string, number>
  anuladas?: ReadonlySet<string>
}
export interface Extras {
  favoritas?: number
  notas?: number
  /** Grupos de prova de cada questão, vindos do índice do acervo. */
  grupos?: ReadonlyMap<string, readonly GrupoProva[]>
  acervo?: DadosAcervo
  servidor?: FeitosServidor | null
}

const HORA = 60 * 60 * 1000
const DIA = 86400000
/** "AAAA-MM-DD" → número do dia (só a data do calendário, sem fuso). */
function numeroDia(chave: string) {
  const [a, m, d] = chave.split('-').map(Number)
  return Math.round(Date.UTC(a, m - 1, d) / DIA)
}
const diaDaSemana = (numero: number) => new Date(numero * DIA).getUTCDay()
/** Maior sequência de dias seguidos; os dias em `pular` (folgas) não quebram nem somam. */
function maiorSequencia(dias: readonly string[], pular: readonly number[] = []): number {
  const numeros = [...new Set(dias.map(numeroDia))].sort((a, b) => a - b)
  let maior = 0, atual = 0, anterior = NaN
  for (const d of numeros) {
    let seguido = atual > 0
    for (let x = anterior + 1; seguido && x < d; x++) if (!pular.includes(diaDaSemana(x))) seguido = false
    atual = seguido ? atual + 1 : 1
    maior = Math.max(maior, atual)
    anterior = d
  }
  return maior
}
/** Maior sequência de itens seguidos (em ordem) que cumprem a condição. */
function maiorSeguidos<T>(lista: readonly T[], ok: (x: T) => boolean): number {
  let maior = 0, atual = 0
  for (const x of lista) { atual = ok(x) ? atual + 1 : 0; maior = Math.max(maior, atual) }
  return maior
}

/** Métricas que vêm do servidor (RPC meus_feitos); zero enquanto não houver dados. */
function metricasDoServidor(f: FeitosServidor | null | undefined, hoje: string) {
  const zero = { pontual: 0, filaZerada: 0, cronograma: 0, cronogramaCompleto: 0, nacionalSeguidas: 0, nacionalElite: 0, nacionalCampeao: 0,
    arenaCampeao: 0, arenaPodio: 0, arenaReinado: 0, indicadosAssinantes: 0, indicados30: 0, relatosResolvidos: 0, comentariosAvaliados: 0, contraCorrente: 0 }
  if (!f) return zero
  const folgas = f.plano?.folgas ?? []
  const metas = f.dias?.meta_cronograma ?? []
  let cronogramaCompleto = 0
  if (f.plano && f.plano.data_prova <= hoje) {
    // O dia em que o plano foi criado no relógio do aparelho, como o cronograma conta
    // (meiaNoite local). Com slice(0, 10) era o dia em UTC: plano criado às 22h de
    // Brasília exigia um dia a mais para "Do início ao fim".
    const inicio = numeroDia(chaveDia(new Date(f.plano.criado_em).getTime())), fim = numeroDia(f.plano.data_prova) - diasRetaFinal(f.plano.criado_em, f.plano.data_prova)
    const feitos = new Set(metas.map(numeroDia))
    let tudo = fim > inicio
    for (let d = inicio; tudo && d < fim; d++) if (!folgas.includes(diaDaSemana(d)) && !feitos.has(d)) tudo = false
    cronogramaCompleto = tudo ? 1 : 0
  }
  const participou = new Map((f.simulado_participacoes ?? []).map((p) => [p.edicao, p]))
  const contam = (f.simulado_participacoes ?? []).filter((p) => p.classificados >= NACIONAL_MINIMO_CLASSIFICADOS)
  // Semana do ranking: a última posição registrada de cada semana já encerrada (segunda a domingo).
  const semanaDe = (dia: string) => Math.floor((numeroDia(dia) + 3) / 7)
  const semanaAtual = semanaDe(hoje)
  const finais = new Map<number, { dia: string; posicao: number }>()
  for (const r of f.ranking_semana ?? []) {
    const s = semanaDe(r.dia)
    if (s < semanaAtual && (!finais.has(s) || finais.get(s)!.dia < r.dia)) finais.set(s, r)
  }
  const semanas = [...finais.keys()].sort((a, b) => a - b)
  const seguidas = (ok: (posicao: number) => boolean) => {
    let maior = 0, atual = 0, anterior = NaN
    for (const s of semanas) {
      atual = ok(finais.get(s)!.posicao) ? (s === anterior + 1 ? atual + 1 : 1) : 0
      maior = Math.max(maior, atual)
      anterior = s
    }
    return maior
  }
  return {
    pontual: maiorSequencia(f.dias?.questao_do_dia ?? []),
    filaZerada: maiorSequencia(f.dias?.fila_zerada ?? []),
    cronograma: maiorSequencia(metas, folgas),
    cronogramaCompleto,
    nacionalSeguidas: maiorSeguidos(f.simulado_edicoes ?? [], (e) => participou.has(e)),
    nacionalElite: contam.some((p) => p.posicao <= Math.max(1, Math.floor(p.classificados / 10))) ? 1 : 0,
    nacionalCampeao: contam.some((p) => p.posicao === 1) ? 1 : 0,
    arenaCampeao: seguidas((p) => p === 1) ? 1 : 0,
    arenaPodio: seguidas((p) => p <= 3),
    arenaReinado: seguidas((p) => p === 1),
    indicadosAssinantes: Number(f.indicados_assinantes) || 0,
    indicados30: Number(f.indicados_30_dias) || 0,
    relatosResolvidos: Number(f.relatos_resolvidos) || 0,
    comentariosAvaliados: Number(f.comentarios_avaliados) || 0,
    contraCorrente: Number(f.contra_corrente) || 0,
  }
}
/** Semana (segunda a domingo) do horário local, contada desde 1970. */
function semanaDe(em: number) {
  const d = new Date(em)
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000 + 3) / 7)
}
function vesperaDe(prova: string) {
  const [a, m, d] = prova.split('-').map(Number)
  return chaveDia(new Date(a, m - 1, d - 1, 12).getTime())
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
  const eventos: Array<{ em: number; correta: boolean | null; tema: string; confianca?: string }> = []
  const acervo = extras.acervo
  let pseudartrose = 0, imagem = 0
  const porAssunto = new Map<number, { r: number; c: number }>()
  const porProvaAno = new Map<string, number>()
  const primeirasTema = new Map<string, { n: number; c: number }>()
  const primeirasNoTempo: Array<{ em: number; certa: boolean }> = []
  const dominadasTema = new Map<string, number>()
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
    if (primeira !== null) {
      primeiras++
      if (primeira) primeirasCertas++
      const t = primeirasTema.get(tema) ?? { n: 0, c: 0 }
      t.n++
      if (primeira) t.c++
      primeirasTema.set(tema, t)
      const em = registro.historico?.[0]?.em ?? registro.q
      if (em) primeirasNoTempo.push({ em, certa: primeira })
    }
    if (dominada(registro) && !acervo?.anuladas?.has(id)) dominadasTema.set(tema, (dominadasTema.get(tema) ?? 0) + 1)
    if (registro.c === true && ((registro.erros ?? 0) > 0 || registro.historico?.some((e) => e.correta === false))) redencao++
    if ((registro.erros ?? 0) >= PSEUDARTROSE_ERROS && dominada(registro)) pseudartrose++
    if (acervo && registro.c !== null && registro.c !== undefined) {
      if (registro.c === true && acervo.imagem.has(id)) imagem++
      for (const s of acervo.subtemas.get(id) ?? []) {
        const a = porAssunto.get(s) ?? { r: 0, c: 0 }
        a.r++
        if (registro.c === true) a.c++
        porAssunto.set(s, a)
      }
      const prova = acervo.prova.get(id)
      if (prova && registro.c === true) porProvaAno.set(prova, (porProvaAno.get(prova) ?? 0) + 1)
      if (prova) porProvaAno.set(`${prova}#r`, (porProvaAno.get(`${prova}#r`) ?? 0) + 1)
    }
    const lista = registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c ?? null, confianca: registro.confianca }] : []
    for (const evento of lista) {
      eventos.push({ em: evento.em, correta: evento.correta, tema, confianca: evento.confianca })
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
  let certeza = 0, certezaAtual = 0, chuteMestre = 0, chuteAtual = 0
  for (const evento of eventos) {
    if (evento.correta === null) continue
    // Certeza: só acerto marcado com certeza soma; qualquer erro zera; acerto com dúvida ou chute não soma nem zera.
    if (!evento.correta) certezaAtual = 0
    else if ((evento.confianca ?? 'seguro') === 'seguro') certeza = Math.max(certeza, ++certezaAtual)
    if (evento.confianca === 'chute') chuteMestre = Math.max(chuteMestre, chuteAtual = evento.correta ? chuteAtual + 1 : 0)
  }
  // Hora de ouro: janela deslizante de 60 minutos sobre os acertos.
  const certos = eventos.filter((e) => e.correta === true).map((e) => e.em)
  let horaDeOuro = 0
  for (let i = 0, j = 0; j < certos.length; j++) {
    while (certos[j] - certos[i] >= HORA) i++
    horaDeOuro = Math.max(horaDeOuro, j - i + 1)
  }
  // Lei de Wolff: semanas consecutivas, cada uma com mais questões que a anterior.
  const porSemana = new Map<number, number>()
  for (const e of eventos) porSemana.set(semanaDe(e.em), (porSemana.get(semanaDe(e.em)) ?? 0) + 1)
  let wolff = 0, escada = 0, semanaAnterior = NaN, volumeAnterior = 0
  for (const semana of [...porSemana.keys()].sort((a, b) => a - b)) {
    const volume = porSemana.get(semana)!
    if (escada && semana === semanaAnterior + 1 && volume > volumeAnterior) escada++
    else escada = volume >= WOLFF_PRIMEIRA_SEMANA ? 1 : 0
    wolff = Math.max(wolff, escada)
    semanaAnterior = semana
    volumeAnterior = volume
  }
  // Calibragem: acerto entre as respostas com certeza (o padrão da tela é "tenho certeza").
  let comCerteza = 0, certasComCerteza = 0
  for (const e of eventos) if (e.correta !== null && (e.confianca ?? 'seguro') === 'seguro') { comCerteza++; if (e.correta) certasComCerteza++ }
  // Run sem dano: dias seguidos com a meta diária e 70% de acerto.
  const diaStats = new Map<string, { n: number; c: number }>()
  for (const e of eventos) {
    if (e.correta === null) continue
    const k = chaveDia(e.em), d = diaStats.get(k) ?? { n: 0, c: 0 }
    d.n++
    if (e.correta) d.c++
    diaStats.set(k, d)
  }
  const runSemDano = maiorSequencia([...diaStats].filter(([, d]) => d.n >= META_STREAK_DIARIA && d.c >= RUN_ACERTO * d.n).map(([k]) => k))
  // Curva de aprendizado: primeiras e últimas questões respondidas pela primeira vez.
  primeirasNoTempo.sort((a, b) => a.em - b.em)
  let curva = 0
  if (primeirasNoTempo.length >= 2 * CURVA_JANELA) {
    const pct = (l: typeof primeirasNoTempo) => (100 * l.filter((x) => x.certa).length) / l.length
    curva = Math.max(0, Math.floor(pct(primeirasNoTempo.slice(-CURVA_JANELA)) - pct(primeirasNoTempo.slice(0, CURVA_JANELA))))
  }
  let completo = 0
  for (const t of primeirasTema.values()) if (t.n >= COMPLETO_MINIMO && t.c >= COMPLETO_ACERTO * t.n) completo++
  let newGamePlus = 0
  for (const [tema, total] of acervo?.totalTema ?? []) if (total > 0 && (dominadasTema.get(tema) ?? 0) >= total) newGamePlus++
  const notaDeCorte = sessoes.filter((s) => s.respondidas >= CORTE_QUESTOES && s.acertos >= CORTE_ACERTO * s.respondidas).length
  const semMorrer = sessoes.some((s) => s.limite && (s.total ?? s.respondidas) >= SEM_MORRER_QUESTOES
    && s.acertos >= SEM_MORRER_ACERTO * (s.total ?? s.respondidas)) ? 1 : 0
  const chefeTeot = sessoes.some((s) => {
    if (!s.limite || s.provas?.length !== 1 || s.provas[0] !== 'TEOT' || s.anos?.length !== 1) return false
    const total = acervo?.totalProva.get(`TEOT ${s.anos[0]}`) ?? Infinity
    const n = s.total ?? s.respondidas
    return n >= total && s.limite <= CHEFE_SEGUNDOS_POR_QUESTAO * n && s.acertos >= CHEFE_TEOT_ACERTO * n
  }) ? 1 : 0
  let assuntos = 0
  for (const a of porAssunto.values()) if (a.r >= ASSUNTO_MINIMO && a.c >= ASSUNTO_ACERTO * a.r) assuntos++
  let provasVencidas = 0
  for (const [prova, total] of acervo?.totalProva ?? []) {
    if ((porProvaAno.get(`${prova}#r`) ?? 0) >= total && (porProvaAno.get(prova) ?? 0) >= PROVA_ACERTO * total) provasVencidas++
  }
  const perfeitasPorDia = new Map<string, number>()
  for (const s of sessoes) {
    if (s.concluidaEm && s.respondidas >= TRIADE_QUESTOES && s.acertos === s.respondidas) {
      const dia = chaveDia(s.concluidaEm)
      perfeitasPorDia.set(dia, (perfeitasPorDia.get(dia) ?? 0) + 1)
    }
  }
  const vesperas = new Set(DATAS_PROVA.map(vesperaDe))
  const vespera = sessoes.some((s) => s.concluidaEm && vesperas.has(chaveDia(s.concluidaEm))
    && s.respondidas >= VESPERA_QUESTOES && s.acertos >= VESPERA_ACERTO * s.respondidas) ? 1 : 0
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
    pseudartrose,
    imagem,
    certeza,
    provasVencidas,
    assuntos,
    horaDeOuro,
    chuteMestre,
    triade: Math.max(0, ...perfeitasPorDia.values()),
    vespera,
    wolff,
    calibrado: comCerteza >= CALIBRADO_MINIMO ? Math.floor((100 * certasComCerteza) / comCerteza) : 0,
    completo,
    notaDeCorte,
    curva,
    runSemDano,
    semMorrer,
    chefeTeot,
    newGamePlus,
    platina: 0,
    ...metricasDoServidor(extras.servidor, chaveDia(agora)),
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

export const desbloqueado = (emblema: Emblema, metricas: Metricas): boolean =>
  (emblema.familia !== 'sequencia' && !!metricas.travadas?.has(emblema.id)) || valorDe(emblema, metricas) >= emblema.minimo

/** Entra na Platina: tudo o que não é secreto, menos a sequência (que pode se perder) e a própria Platina. */
const contaParaPlatina = (e: Emblema) => !e.secreta && e.familia !== 'sequencia' && e.id !== 'chefe-platina'
/** Fecha as métricas: a Platina depende de todos os outros emblemas. */
export function completarMetricas(metricas: Metricas): Metricas {
  const platina = EMBLEMAS.filter(contaParaPlatina).every((e) => desbloqueado(e, metricas)) ? 1 : 0
  return { ...metricas, platina }
}
