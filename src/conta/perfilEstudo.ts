/**
 * Etapa de formação e provas de interesse: perguntadas no cadastro, editáveis
 * no perfil e pedidas uma única vez a quem já tinha conta. Ficam nos metadados
 * do usuário (user_metadata), como nome e serviço, e alimentam as estatísticas
 * do painel do administrador.
 *
 * Contexto das provas (para a explicação na tela):
 * - TARO (Teste de Avaliação dos Residentes em Ortopedia): prova anual da SBOT
 *   feita pelos residentes do R1 ao R3 dos serviços credenciados.
 * - TEOT (Título de Especialista em Ortopedia e Traumatologia): prova da SBOT
 *   ao fim da residência, que dá o título de especialista.
 * - Prova para cirurgia da mão: seleção feita depois da ortopedia para começar a
 *   residência em cirurgia da mão.
 * - R4 e fellowship: seleções para a subespecialização (ENARE e provas próprias).
 */

export type Situacao = 'residente' | 'r4' | 'mao' | 'ortopedista' | 'estudante' | 'outro'
export type AnoResidencia = 'r1' | 'r2' | 'r3'
export type ProvaInteresse = 'taro' | 'teot' | 'mao' | 'r4' | 'atualizacao'

export const SITUACOES: Array<[Situacao, string]> = [
  ['residente', 'Residente de ortopedia (R1 a R3)'],
  ['r4', 'R4 ou fellowship em subespecialidade'],
  ['mao', 'Residente de cirurgia da mão'],
  ['ortopedista', 'Ortopedista'],
  ['estudante', 'Estudante de medicina'],
  ['outro', 'Outro profissional'],
]

export const ANOS: Array<[AnoResidencia, string]> = [['r1', 'R1'], ['r2', 'R2'], ['r3', 'R3']]

export const PROVAS: Array<[ProvaInteresse, string, string]> = [
  ['taro', 'TARO', 'avaliação anual dos residentes, do R1 ao R3'],
  ['teot', 'TEOT', 'título de especialista, ao fim da residência'],
  ['mao', 'Prova para cirurgia da mão', 'seleção para a residência em mão'],
  ['r4', 'R4 ou fellowship', 'seleção para subespecialidade'],
  ['atualizacao', 'Atualização', 'estudo sem prova marcada'],
]

/** Rótulo curto da etapa, para listas e tabelas ("R2", "R4 / fellowship"…). */
export function rotuloEtapa(situacao?: string | null, ano?: string | null): string {
  if (situacao === 'residente') return ano ? ANOS.find(([v]) => v === ano)?.[1] ?? 'Residente' : 'Residente (ano não informado)'
  return ({ r4: 'R4 / fellowship', mao: 'Residente de mão', ortopedista: 'Ortopedista', estudante: 'Estudante', outro: 'Outro' } as Record<string, string>)[situacao ?? ''] ?? 'Não informado'
}

export const rotuloProva = (p: string) => PROVAS.find(([v]) => v === p)?.[1] ?? p

/** Provas sugeridas para a etapa: a pessoa pode desmarcar e marcar outras. */
export function provasSugeridas(situacao: string, ano: string): ProvaInteresse[] {
  if (situacao === 'residente') return ano === 'r3' ? ['teot', 'taro'] : ['taro']
  if (situacao === 'r4') return ['teot', 'r4']
  if (situacao === 'mao') return ['mao']
  if (situacao === 'ortopedista') return ['atualizacao']
  if (situacao === 'estudante') return ['taro']
  return []
}

/** Lê as provas dos metadados (lista; aceita texto solto de versões antigas). */
export function lerProvas(valor: unknown): ProvaInteresse[] {
  const lista = Array.isArray(valor) ? valor : typeof valor === 'string' && valor ? valor.split(',') : []
  return lista.map(String).filter((p): p is ProvaInteresse => PROVAS.some(([v]) => v === p))
}

/** Se o perfil já diz a etapa (com o ano, para residentes) e ao menos uma prova. */
export function perfilEstudoCompleto(meta: Record<string, unknown> | undefined | null): boolean {
  if (!meta) return false
  const situacao = String(meta.situacao ?? '')
  if (!situacao) return false
  if (situacao === 'residente' && !meta.ano_residencia) return false
  return lerProvas(meta.provas_interesse).length > 0
}
