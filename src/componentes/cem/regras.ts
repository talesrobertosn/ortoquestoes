/**
 * Regras do ranking das questões (O Salão dos Cem, 31/10/2026), puras e testáveis (fixtures/testar_salao_cem.mjs).
 * Os números vêm do servidor (ranking_cache, recalculado de 10 em 10 minutos); aqui só se lê e se explica:
 * nada de ponto calculado no navegador.
 *
 * Desempate do servidor (202610212330_ranking_cache.sql): mais questões primeiro e, no empate, a conta mais antiga.
 * Por isso, para passar quem está logo acima, é preciso ter UMA questão a mais do que essa pessoa.
 */
export type Periodo = 'geral' | 'semana'
export interface LinhaRanking {
  posicao: number; apelido: string; total: number; total_geral: number; eh_voce: boolean
  variacao: number | null; variacao_semana: number | null; novo: boolean; referencia_em: string | null
  /** Vitrine escolhida pela pessoa e sequência viva (fogueira). Ausentes antes da migration. */
  emblemas?: string[] | null; sequencia?: number | null
  /** Serviço (local da residência), só de quem ligou a opção. */
  servico?: string | null
}
export type MinhaPosicao = { posicao: number; total: number; total_geral: number } | null

// Subir 3 posições de um dia para o outro, ou 5 na semana, acende o foguinho.
export const FOGO_NO_DIA = 3
export const FOGO_NA_SEMANA = 5
export const TOP_LISTA = 50
export const TOP_MAXIMO = 100

export function emChamas(linha: Pick<LinhaRanking, 'variacao' | 'variacao_semana'>): boolean {
  return (linha.variacao ?? 0) >= FOGO_NO_DIA || (linha.variacao_semana ?? 0) >= FOGO_NA_SEMANA
}

export const posicoes = (n: number) => `${n} ${n === 1 ? 'posição' : 'posições'}`
export const dataCurta = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/')

// Regra dos 10 (docs/emails/TOM.md): números pequenos de questões sempre por extenso.
const EXTENSO = ['zero', 'uma', 'duas', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove']
export const nQuestoes = (n: number) => n < 10 ? `${EXTENSO[n]} ${n === 1 ? 'questão' : 'questões'}` : `${n.toLocaleString('pt-BR')} questões`

export function iniciais(apelido: string): string {
  const partes = apelido.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '?'
}

/** O estado do movimento de uma linha, em palavras (a cor nunca é a única pista). */
export type TipoMovimento = 'novo' | 'subiu' | 'desceu' | 'igual' | 'sem-historico'
export interface Movimento { tipo: TipoMovimento; quantidade: number; fogo: boolean; descricao: string }
export function movimento(linha: LinhaRanking): Movimento {
  const { variacao: valor, referencia_em: referencia, variacao_semana: semana } = linha
  const fogo = emChamas(linha)
  if (linha.novo) return { tipo: 'novo', quantidade: 0, fogo: false, descricao: 'Entrou no ranking desde o último registro' }
  if (!referencia) return { tipo: 'sem-historico', quantidade: 0, fogo: false, descricao: '' }
  const quantidade = Math.abs(valor ?? 0)
  // Parado no dia, mas em chamas pela semana: conta como subida (a chama é de quem subiu).
  const tipo: TipoMovimento = (valor ?? 0) > 0 || (!valor && fogo) ? 'subiu' : (valor ?? 0) < 0 ? 'desceu' : 'igual'
  const partes = [valor ? `${valor > 0 ? 'Subiu' : 'Desceu'} ${posicoes(quantidade)} desde ${dataCurta(referencia)}` : `Mesma posição desde ${dataCurta(referencia)}`]
  if (semana && semana > 0) partes.push(`subiu ${posicoes(semana)} na semana`)
  if (fogo) partes.push('em chamas')
  return { tipo, quantidade, fogo, descricao: partes.join(', ') }
}

/** Quem mais subiu (a Escadaria da Ascensão): até três, pelo salto do dia e, sem ele, pelo da semana. */
export interface Ascensao { linha: LinhaRanking; salto: number; quando: 'hoje' | 'na semana'; de: number; para: number; fogo: boolean }
export function ascensao(linhas: LinhaRanking[]): Ascensao[] {
  return linhas
    .filter((l) => (l.variacao ?? 0) > 0 || (l.variacao_semana ?? 0) >= FOGO_NA_SEMANA)
    .sort((a, b) => (b.variacao ?? 0) - (a.variacao ?? 0) || (b.variacao_semana ?? 0) - (a.variacao_semana ?? 0) || a.posicao - b.posicao)
    .slice(0, 3)
    .map((linha) => {
      const hoje = linha.variacao ?? 0, semana = linha.variacao_semana ?? 0
      const salto = hoje > 0 ? hoje : semana
      return { linha, salto, quando: hoje > 0 ? 'hoje' : 'na semana', de: linha.posicao + salto, para: linha.posicao, fogo: emChamas(linha) }
    })
}

/**
 * A próxima meta da jornada, só com dados reais: quem está logo acima (na lista que o servidor mandou) ou, fora da
 * lista, a última vaga do top visível. Líder não tem ninguém para passar: a meta vira a vantagem sobre o segundo.
 */
export type Meta =
  | { tipo: 'passar'; faltam: number; alvo: number; nome: string; posicao: number; abaixo: number | null }
  | { tipo: 'entrar'; faltam: number; alvo: number; top: number; abaixo: null }
  | { tipo: 'lider'; vantagem: number | null; segundo: string | null }
  | { tipo: 'nenhuma' }
export function proximaMeta(linhas: LinhaRanking[], eu: { posicao: number; total: number }): Meta {
  if (eu.posicao === 1) {
    const segundo = linhas.find((l) => l.posicao === 2)
    return { tipo: 'lider', vantagem: segundo ? eu.total - segundo.total : null, segundo: segundo?.apelido ?? null }
  }
  const acima = linhas.find((l) => l.posicao === eu.posicao - 1)
  if (acima) {
    const faltam = Math.max(1, acima.total - eu.total + 1)
    const abaixo = linhas.find((l) => l.posicao === eu.posicao + 1)
    return { tipo: 'passar', faltam, alvo: eu.total + faltam, nome: acima.apelido, posicao: acima.posicao, abaixo: abaixo?.total ?? null }
  }
  // Fora da lista: a meta é a última vaga do top que veio (100 se veio inteiro, senão 50 ou o que houver).
  const lista = linhas.filter((l) => !l.eh_voce || l.posicao <= TOP_MAXIMO)
  const ultima = lista.reduce<LinhaRanking | null>((u, l) => (l.posicao < eu.posicao && (!u || l.posicao > u.posicao) ? l : u), null)
  if (!ultima) return { tipo: 'nenhuma' }
  const top = ultima.posicao >= TOP_MAXIMO ? TOP_MAXIMO : ultima.posicao >= TOP_LISTA ? TOP_LISTA : ultima.posicao
  const faltam = Math.max(1, ultima.total - eu.total + 1)
  return { tipo: 'entrar', faltam, alvo: eu.total + faltam, top, abaixo: null }
}

/**
 * Progresso honesto até a meta: o caminho entre quem está logo abaixo (ou zero) e o alvo, para a barra mexer de
 * verdade a cada questão em vez de ficar sempre perto de 100%.
 */
export function progressoMeta(meu: number, alvo: number, abaixo: number | null): number {
  const piso = abaixo !== null && abaixo < meu ? abaixo : 0
  const p = (meu - piso) / Math.max(1, alvo - piso)
  return Math.min(0.98, Math.max(0.04, p))
}

/**
 * Cerimônia do novo campeão: só quando uma lista confirmada pelo servidor traz um líder diferente do último que este
 * aparelho viu NO MESMO período. A primeira visita só guarda; trocar de período nunca dispara.
 */
export function novoCampeao(guardado: string | null, atual: string | null): boolean {
  return !!guardado && !!atual && guardado !== atual
}
