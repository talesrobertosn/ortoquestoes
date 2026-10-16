import { chaveDoDia, numeroDoDia } from '../util/dia'

/**
 * Cronômetro de leitura ativa dos resumos (emblemas de tempo e de dias, 16/10/2026).
 *
 * Só conta enquanto o leitor está aberto, a aba visível e a pessoa mexeu nele (rolou, tocou,
 * clicou, teclou) nos últimos OCIOSO_MS; cada passo soma no máximo o tempo real decorrido, até
 * PASSO_MS, então nunca passa de 60 segundos por minuto, nem com o relógio do aparelho pulando.
 * O tempo vai para o documento de leitura do capítulo (`segundos`) pela gravação que já existe
 * (a da posição, com folga): junto com ela quando há pelo menos GRAVAR_JUNTO_S acumulados, sozinho
 * a cada GRAVAR_SOZINHO_S de leitura sem rolar e, ao sair, o que sobrou. O dia de São Paulo entra
 * em `dias` quando a sessão soma MINUTO_DO_DIA_S de leitura naquele dia.
 */
export const PASSO_MS = 5_000
export const OCIOSO_MS = 120_000
export const GRAVAR_JUNTO_S = 30
export const GRAVAR_SOZINHO_S = 120
export const MINUTO_DO_DIA_S = 60

export interface Cronometro {
  /** Segundos ainda não gravados. */
  pendente: number
  ultimoPasso: number
  ultimaAtividade: number
  /** Dia (chave) e segundos de leitura nele nesta sessão. */
  dia: string
  noDia: number
  /** Último dia já gravado em `dias` por esta sessão. */
  diaGravado: string | null
}

export function novoCronometro(agora = Date.now()): Cronometro {
  return { pendente: 0, ultimoPasso: agora, ultimaAtividade: agora, dia: chaveDoDia(agora), noDia: 0, diaGravado: null }
}

export function registrarAtividade(c: Cronometro, agora = Date.now()) { c.ultimaAtividade = agora }

/** Um passo do relógio: soma o tempo decorrido (até PASSO_MS) se a leitura está ativa. */
export function passoCronometro(c: Cronometro, visivel: boolean, agora = Date.now()) {
  const decorrido = Math.max(0, Math.min(PASSO_MS, agora - c.ultimoPasso))
  c.ultimoPasso = agora
  if (!visivel || agora - c.ultimaAtividade > OCIOSO_MS || decorrido <= 0) return
  const s = decorrido / 1000
  const dia = chaveDoDia(agora)
  if (dia !== c.dia) { c.dia = dia; c.noDia = 0 }
  c.noDia += s
  c.pendente += s
}

/**
 * O que gravar agora (e zera o pendente), ou null. Sem `forcar`, só a partir de GRAVAR_JUNTO_S;
 * forçado (sair, esconder a aba), grava o que houver. O dia vai junto quando completou o minuto.
 */
export function retirarTempo(c: Cronometro, forcar = false): { segundos: number; dia?: number } | null {
  const segundos = Math.floor(c.pendente)
  const diaNovo = c.noDia >= MINUTO_DO_DIA_S && c.diaGravado !== c.dia
  if (segundos <= 0 || (!forcar && segundos < GRAVAR_JUNTO_S && !diaNovo)) return null
  c.pendente -= segundos
  if (!diaNovo) return { segundos }
  c.diaGravado = c.dia
  return { segundos, dia: numeroDoDia(c.dia) }
}
