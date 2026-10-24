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
 * - Título de cirurgia da mão (SBCM) e título de quadril (SBQ): provas das sociedades.
 * - R4 de coluna, R4 e fellowship: seleções para a subespecialização (ENARE e provas próprias).
 * O Tales chama o TEOT também de TEPOT: é a mesma prova (21/10/2026).
 */

export type Situacao = 'residente' | 'r4' | 'mao' | 'ortopedista' | 'estudante' | 'outro'
export type AnoResidencia = 'r1' | 'r2' | 'r3'
export type ProvaInteresse = 'taro' | 'teot' | 'mao' | 'titulo_mao' | 'coluna' | 'sbq' | 'r4' | 'atualizacao'

export const SITUACOES: Array<[Situacao, string]> = [
  ['residente', 'Residente de ortopedia (R1 a R3)'],
  ['r4', 'R4 ou fellowship em subespecialidade'],
  ['mao', 'Residente de cirurgia da mão'],  ['ortopedista', 'Ortopedista'],
  ['estudante', 'Estudante de medicina'],
  ['outro', 'Outro profissional'],
]

export const ANOS: Array<[AnoResidencia, string]> = [['r1', 'R1'], ['r2', 'R2'], ['r3', 'R3']]

export const PROVAS: Array<[ProvaInteresse, string, string]> = [
  ['taro', 'TARO', 'avaliação anual dos residentes, do R1 ao R3'],
  ['teot', 'TEOT', 'título de especialista, ao fim da residência'],
  ['mao', 'Entrada na cirurgia da mão', 'seleção para a residência em mão'],
  ['titulo_mao', 'Título de cirurgia da mão', 'prova da Sociedade Brasileira de Cirurgia da Mão'],
  ['coluna', 'R4 de coluna', 'seleção para a residência em coluna'],
  ['sbq', 'Título de quadril (SBQ)', 'prova da Sociedade Brasileira de Quadril'],
  ['r4', 'Outro R4 ou fellowship', 'seleção para outra subespecialidade'],
  ['atualizacao', 'Atualização', 'estudo sem prova marcada'],
]

/** Rótulo do botão de prova no perfil: o TEOT aparece junto do nome que o Tales também usa. */
export const rotuloBotaoProva = (p: string, rotulo = rotuloProva(p)) => (p === 'teot' ? 'TEOT / TEPOT' : rotulo)

/** Rótulo curto da etapa, para listas e tabelas ("R2", "R4 / fellowship"…). */
export function rotuloEtapa(situacao?: string | null, ano?: string | null): string {
  if (situacao === 'residente') return ano ? ANOS.find(([v]) => v === ano)?.[1] ?? 'Residente' : 'Residente (ano não informado)'
  return ({ r4: 'R4 / fellowship', mao: 'Residente de mão', ortopedista: 'Ortopedista', estudante: 'Estudante', outro: 'Outro' } as Record<string, string>)[situacao ?? ''] ?? 'Não informado'
}

export const rotuloProva = (p: string) => PROVAS.find(([v]) => v === p)?.[1] ?? p

/** Provas sugeridas para a etapa: a pessoa pode desmarcar e marcar outras. */
export function provasSugeridas(situacao: string, ano: string): ProvaInteresse[] {
  if (situacao === 'residente') return ano === 'r3' ? ['teot', 'taro'] : ['taro']
  if (situacao === 'r4') return ['teot']
  if (situacao === 'mao') return ['titulo_mao']
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

/**
 * Atalho de um toque para a etapa (aviso "Complete seu perfil"): cada botão já diz
 * a situação e, para residente, o ano. Mesmos valores gravados pelo formulário completo.
 */
export const ETAPAS_RAPIDAS: Array<{ id: string; rotulo: string; situacao: Situacao; ano: AnoResidencia | '' }> = [
  { id: 'estudante', rotulo: 'Estudante', situacao: 'estudante', ano: '' },
  { id: 'r1', rotulo: 'R1', situacao: 'residente', ano: 'r1' },
  { id: 'r2', rotulo: 'R2', situacao: 'residente', ano: 'r2' },
  { id: 'r3', rotulo: 'R3', situacao: 'residente', ano: 'r3' },
  { id: 'r4', rotulo: 'R4 ou fellow', situacao: 'r4', ano: '' },
  { id: 'mao', rotulo: 'Residente de cirurgia da mão', situacao: 'mao', ano: '' },
  { id: 'ortopedista', rotulo: 'Ortopedista', situacao: 'ortopedista', ano: '' },
  { id: 'outro', rotulo: 'Outro', situacao: 'outro', ano: '' },
]

/** Qual atalho corresponde ao que já está gravado ('' quando nenhum). */
export function etapaRapidaDe(situacao: string, ano: string): string {
  return ETAPAS_RAPIDAS.find((e) => e.situacao === situacao && (e.situacao !== 'residente' || e.ano === ano))?.id ?? ''
}

/** Até quantos locais de trabalho extras a pessoa informa, e o tamanho de cada nome. */
export const LOCAIS_MAXIMO = 8
export const LOCAL_TAMANHO = 80

/**
 * Outros hospitais ou serviços onde a pessoa trabalha, além do principal (campo
 * `locais_trabalho` dos metadados). Limpa espaços, tira vazios e repetidos (sem
 * diferença de maiúscula e acento) e o que for igual ao serviço principal.
 */
export function lerLocais(valor: unknown, principal = ''): string[] {
  const lista = Array.isArray(valor) ? valor : typeof valor === 'string' && valor ? valor.split(/[;\n]/) : []
  const chave = (t: string) => t.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
  const vistos = new Set<string>(principal.trim() ? [chave(principal)] : [])
  const saida: string[] = []
  for (const bruto of lista) {
    const texto = String(bruto ?? '').replace(/\s+/g, ' ').trim().slice(0, LOCAL_TAMANHO)
    if (texto.length < 2 || vistos.has(chave(texto))) continue
    vistos.add(chave(texto)); saida.push(texto)
    if (saida.length >= LOCAIS_MAXIMO) break
  }
  return saida
}

/** Para quem a pergunta é "onde trabalha" (e não "onde faz residência" ou "faculdade"). */
export const trabalhaComoEspecialista = (situacao: string) => situacao === 'ortopedista' || situacao === 'outro'


// Os passos do crachá ficam num arquivo leve, porque o App os consulta em toda página.
export * from './passosPerfil'
