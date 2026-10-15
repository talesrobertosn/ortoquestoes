/**
 * Ponte do Torneio com o servidor (migration 202610130100_flashcards_limite_e_progresso.sql):
 *  - autorizarFlashcard: o limite do plano grátis (10 flashcards por 24 h) é
 *    decidido no servidor; assinante sem limite. O cliente só mostra o aviso.
 *  - sincronizarProgresso: mescla a fila de revisão e os recordes da conta
 *    entre aparelhos (por flashcard, vale a resposta mais recente).
 * Tudo atrás de travas que nascem desligadas: sem VITE_LIMITES_HABILITADOS e
 * VITE_FLASHCARDS_LIMITE, nada é chamado (o recurso segue só pelo link).
 */
import { gravar, ler } from '../estado/armazenamento'
import { LIMITES_HABILITADOS } from '../estado/limiteDiario'
import { chamarRpc, chamarRpcPublica } from '../servicos/supabase'
import { CHAVE_RECORDES, CHAVE_REGISTROS, RECORDES_VAZIOS, type Recordes, type RegistroFlashcard } from './progresso'

/**
 * Beta público (13/10/2026, parte 18 do SQL aplicada): os flashcards consultam o servidor sempre que
 * VITE_FLASHCARDS_LIMITE=true. Quem decide se há limite é o próprio servidor, pela mesma chave das
 * questões (configuracao_comercial.paywall_ativo): com o paywall desligado, todos seguem sem limite;
 * ligado, o grátis tem 10 por 24 h e assinante, cortesia e administrador não têm limite.
 * O progresso e as corridas do ranking passam a ir para a conta.
 */
export const FLASHCARDS_NO_SERVIDOR = import.meta.env?.VITE_FLASHCARDS_LIMITE === 'true'
/** O cliente mostra o aviso do limite só quando o limite das questões também está ligado no build. */
export const AVISO_LIMITE_FLASHCARDS = LIMITES_HABILITADOS && FLASHCARDS_NO_SERVIDOR
/** Ranking no servidor (migration 202610130200_flashcards_ranking.sql): só com a outra trava e VITE_FLASHCARDS_RANKING=1. */
export const RANKING_NO_SERVIDOR = FLASHCARDS_NO_SERVIDOR && import.meta.env?.VITE_FLASHCARDS_RANKING === '1'

export interface LimiteFlashcard { permitido: boolean; ilimitado: boolean; restantes: number | null; liberaEm: string; motivo?: string; falha?: boolean }

/** UUID com fallback: Safari antes do 15.4 não tem crypto.randomUUID. */
export const novaChave = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)))

/** Pede ao servidor para contar este flashcard. Uma chave por resposta (repetir não gasta duas vezes). */
export async function autorizarFlashcard(idFlashcard: string, chave = novaChave()): Promise<LimiteFlashcard> {
  if (!FLASHCARDS_NO_SERVIDOR) return { permitido: true, ilimitado: true, restantes: null, liberaEm: '' }
  try {
    const prazo = new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('A validação demorou demais.')), 10_000))
    const r = (await Promise.race([chamarRpc<Array<Record<string, unknown>>>('autorizar_flashcard', { p_chave_idempotencia: chave, p_id_flashcard: idFlashcard }), prazo]))[0]
    return { permitido: Boolean(r.permitido), ilimitado: Boolean(r.ilimitado), restantes: r.restantes === null ? null : Number(r.restantes), liberaEm: String(r.libera_em), motivo: r.motivo ? String(r.motivo) : undefined }
  } catch (erro) {
    return { permitido: false, ilimitado: false, restantes: null, liberaEm: '', falha: true, motivo: erro instanceof Error ? erro.message : 'Não foi possível validar.' }
  }
}

export interface LimiteCripta extends LimiteFlashcard { cripta?: boolean }

/**
 * Cripta (parte 19 do SQL, regra de 14/10/2026): a conta grátis joga uma vida (uma corrida) a cada
 * 24 horas, sem limite de andares. Morrer ou recomeçar abre outra corrida, que só vale na janela
 * seguinte. A Biblioteca segue à parte, com 10 por 24 h. Assinante sem limite. A regra não aparece
 * escrita no site: a pessoa descobre jogando.
 * Enquanto a função não existir no banco (SQL ainda não colado), cai no limite antigo.
 */
export async function autorizarFlashcardCripta(idFlashcard: string, chave: string, corrida: string, modo: 'masmorra' | 'torre'): Promise<LimiteCripta> {
  if (!FLASHCARDS_NO_SERVIDOR) return { permitido: true, ilimitado: true, restantes: null, liberaEm: '' }
  try {
    const prazo = new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('A validação demorou demais.')), 10_000))
    const r = (await Promise.race([chamarRpc<Array<Record<string, unknown>>>('autorizar_flashcard_cripta', { p_chave_idempotencia: chave, p_id_flashcard: idFlashcard, p_corrida: corrida, p_modo: modo }), prazo]))[0]
    return { permitido: Boolean(r.permitido), ilimitado: Boolean(r.ilimitado), restantes: null, liberaEm: r.libera_em ? String(r.libera_em) : '', motivo: r.motivo ? String(r.motivo) : undefined, cripta: true }
  } catch (erro) {
    // 404: a função ainda não foi criada no banco; segue o limite de 10 por 24 h
    if (erro instanceof Error && 'status' in erro && (erro as { status?: number }).status === 404) return autorizarFlashcard(idFlashcard, chave)
    return { permitido: false, ilimitado: false, restantes: null, liberaEm: '', falha: true, motivo: erro instanceof Error ? erro.message : 'Não foi possível validar.' }
  }
}

/** Mescla dois conjuntos de registros: por flashcard, fica o de resposta mais recente. */
export function mesclarRegistros(a: Record<string, RegistroFlashcard>, b: Record<string, RegistroFlashcard>) {
  const saida = { ...a }
  for (const [id, r] of Object.entries(b)) {
    const atual = saida[id]
    if (!atual || (r.q ?? 0) > (atual.q ?? 0)) saida[id] = r
  }
  return saida
}

export function mesclarRecordes(a: Partial<Recordes>, b: Partial<Recordes>): Recordes {
  const x = { ...RECORDES_VAZIOS, ...a }, y = { ...RECORDES_VAZIOS, ...b }
  return {
    versao: 1, andarMaximo: Math.max(x.andarMaximo, y.andarMaximo), partidas: Math.max(x.partidas, y.partidas),
    torreMaximo: Math.max(x.torreMaximo ?? 0, y.torreMaximo ?? 0), torreConcluida: Math.max(x.torreConcluida ?? 0, y.torreConcluida ?? 0),
    chefesDerrotados: Math.max(x.chefesDerrotados, y.chefesDerrotados), melhorSequencia: Math.max(x.melhorSequencia, y.melhorSequencia),
    respostas: Math.max(x.respostas, y.respostas), atualizadoEm: Math.max(x.atualizadoEm, y.atualizadoEm),
  }
}

/** Traz o progresso da conta, mescla com o do aparelho e grava os dois lados. */
export async function sincronizarProgresso(): Promise<boolean> {
  if (!FLASHCARDS_NO_SERVIDOR) return false
  try {
    const [remoto] = await chamarRpc<Array<{ registros: Record<string, RegistroFlashcard>; recordes: Partial<Recordes> }>>('ler_progresso_flashcards', {})
    const registros = mesclarRegistros(ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {}), remoto?.registros ?? {})
    const recordes = mesclarRecordes(ler<Partial<Recordes>>(CHAVE_RECORDES, {}), remoto?.recordes ?? {})
    gravar(CHAVE_REGISTROS, registros)
    gravar(CHAVE_RECORDES, recordes)
    await chamarRpc('salvar_progresso_flashcards', { p_registros: registros, p_recordes: recordes })
    return true
  } catch {
    return false
  }
}

/* ------------------------------------------------------------ Ranking (desligado por padrão) */

export type TipoRanking = 'masmorra' | 'torre' | 'unicos'
export interface LinhaRanking {
  posicao: number; apelido: string; valor: number; ehVoce: boolean
  /** Vitrine escolhida pela pessoa e emblemas de Flashcards travados (parte 25 do SQL; ausentes antes dela). */
  emblemas?: string[]; emblemasFlashcards?: string[]
}

/** Abre a corrida no servidor: o andar só vale para o ranking se a corrida tiver flashcards autorizados. */
/** Abre a corrida no servidor com a dificuldade (gravada uma vez; o Fácil não abre corrida). */
export async function iniciarCorrida(id: string, modo: 'masmorra' | 'torre', nivel: 'normal' | 'dificil') {
  if (!RANKING_NO_SERVIDOR) return
  try { await chamarRpc('iniciar_corrida_flashcards', { p_id: id, p_modo: modo, p_nivel: nivel }) } catch { /* o jogo segue; o recorde fica só no aparelho */ }
}

export interface LinhaRankingCripta { posicao: number; apelido: string; andar: number; alcancadoEm: string; ehVoce: boolean }

/** Ranking da Cripta por dificuldade (parte 18: ranking_cripta). null = indisponível (rede, servidor ou trava). */
export async function lerRankingCripta(modo: 'masmorra' | 'torre', nivel: 'normal' | 'dificil'): Promise<LinhaRankingCripta[] | null> {
  if (!RANKING_NO_SERVIDOR) return null
  try {
    type Linha = { posicao: number; apelido: string; andar: number; alcancado_em: string; eh_voce: boolean }
    const corpo = { p_modo: modo, p_nivel: nivel }
    // com conta marca "você"; sem conta (ou sessão vencida) lê a lista pública
    const linhas = await chamarRpc<Linha[]>('ranking_cripta', corpo).catch(() => chamarRpcPublica<Linha[]>('ranking_cripta', corpo))
    return linhas.map((l) => ({ posicao: Number(l.posicao), apelido: l.apelido, andar: Number(l.andar), alcancadoEm: String(l.alcancado_em), ehVoce: Boolean(l.eh_voce) }))
  } catch { return null }
}

/** A posição da própria conta, mesmo fora dos 50 primeiros. */
export async function minhaPosicaoCripta(modo: 'masmorra' | 'torre', nivel: 'normal' | 'dificil'): Promise<{ posicao: number; andar: number } | null> {
  if (!RANKING_NO_SERVIDOR) return null
  try {
    const [l] = await chamarRpc<Array<{ posicao: number; andar: number }>>('minha_posicao_cripta', { p_modo: modo, p_nivel: nivel })
    return l ? { posicao: Number(l.posicao), andar: Number(l.andar) } : null
  } catch { return null }
}

export async function vincularFlashcard(chave: string, corrida: string) {
  if (!RANKING_NO_SERVIDOR) return
  try { await chamarRpc('vincular_flashcard_corrida', { p_chave_idempotencia: chave, p_corrida: corrida }) } catch { /* idem */ }
}

export async function registrarAndar(corrida: string, andar: number) {
  if (!RANKING_NO_SERVIDOR) return
  try { await chamarRpc('registrar_andar_flashcards', { p_corrida: corrida, p_andar: andar }) } catch { /* idem */ }
}

export async function lerRanking(tipo: TipoRanking): Promise<LinhaRanking[] | null> {
  if (!RANKING_NO_SERVIDOR) return null
  try {
    type Linha = { posicao: number; apelido: string; valor: number; eh_voce: boolean; emblemas?: string[] | null; emblemas_flashcards?: string[] | null }
    const corpo = { p_tipo: tipo }
    const ler = (nome: string) => chamarRpc<Linha[]>(nome, corpo).catch(() => chamarRpcPublica<Linha[]>(nome, corpo))
    // Com os emblemas (parte 25 do SQL); sem ela no banco, o ranking de antes.
    const linhas = await ler('ranking_flashcards_emblemas').catch(() => ler('ranking_flashcards'))
    return linhas.map((l) => ({
      posicao: Number(l.posicao), apelido: l.apelido, valor: Number(l.valor), ehVoce: Boolean(l.eh_voce),
      emblemas: Array.isArray(l.emblemas) ? l.emblemas : [], emblemasFlashcards: Array.isArray(l.emblemas_flashcards) ? l.emblemas_flashcards : [],
    }))
  } catch { return null }
}
