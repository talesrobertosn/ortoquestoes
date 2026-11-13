/*
 * Nota de 1 a 10 dos comentários (13/11/2026, pedido do Tales). Sem React, para testar
 * (fixtures/testar_notas_comentario.mjs). A régua fica no fim do comentário (AvaliarComentario) e o painel do
 * administrador separa as questões em faixas: prioridade, atenção e sugestão de post (notas 9 e 10).
 */

export type MotivoNota = 'confuso' | 'raso' | 'faltou_imagem' | 'outro' | 'errado'

/** Motivos oferecidos a quem dá nota baixa. "errado" fica só para avaliações antigas: erro vai pelo relato. */
export const MOTIVOS_NOTA: ReadonlyArray<readonly [MotivoNota, string]> = [
  ['confuso', 'Ficou confuso'],
  ['raso', 'Faltou profundidade'],
  ['faltou_imagem', 'Faltou imagem'],
  ['outro', 'Outro motivo'],
]
export const ROTULO_MOTIVO: Record<string, string> = { confuso: 'Ficou confuso', raso: 'Faltou profundidade', faltou_imagem: 'Faltou imagem', errado: 'Parece ter erro', outro: 'Outro motivo' }

/** Até esta nota, a régua pede (sem obrigar) o motivo. */
export const NOTA_PEDE_MOTIVO = 5
/** A partir desta nota, a avaliação conta como "ajudou" (coluna util, lida por contadores e e-mails). */
export const NOTA_AJUDOU = 6

export const ajudouComNota = (nota: number) => nota >= NOTA_AJUDOU

/** Valor de uma avaliação: a nota, ou 8 e 3 para as antigas de "Ajudou" e "Não ajudou". */
export const valorDaAvaliacao = (a: { nota?: number | null; util: boolean }) => a.nota ?? (a.util ? 8 : 3)

/** Cor de cada quadradinho da régua: do vermelho suave (1) ao verde (10), passando pelo âmbar. */
export function corDaNota(nota: number): string {
  const t = Math.min(1, Math.max(0, (nota - 1) / 9))
  const matiz = Math.round(4 + t * 146) // 4° (vermelho) a 150° (verde)
  return `hsl(${matiz} 62% 44%)`
}

/** Uma linha de notas_comentarios_admin(). */
export interface ResumoNota {
  id_questao: string
  n: number
  media: number | string
  minima: number
  maxima: number
  desvio: number | string
  mensagens: number
  legado: number
  ultima_em: string
  motivos: Record<string, number>
  versoes: Array<{ comentario_em: string | null; n: number; media: number | string }>
}

export type FaixaNota = 'prioridade' | 'atencao' | 'post' | 'normal'

export const ROTULO_FAIXA: Record<FaixaNota, string> = {
  prioridade: 'Prioridade alta',
  atencao: 'Atenção',
  post: 'Sugestão de post',
  normal: 'Sem alerta',
}

/**
 * A faixa de cada questão:
 * - prioridade: média abaixo de 6 com 3 notas ou mais, ou alguma nota de 1 a 3 com mensagem escrita;
 * - sugestão de post: média 9 ou mais, com 2 notas ou mais (as notas 9 e 10 dizem o que funciona);
 * - atenção: média abaixo de 7,5 ou notas muito espalhadas (desvio 3 ou mais), com 3 notas ou mais,
 *   ou alguma nota de 5 ou menos quando ainda há poucas notas;
 * - sem alerta: o resto.
 */
export function faixaDaNota(r: Pick<ResumoNota, 'n' | 'media' | 'minima' | 'desvio' | 'mensagens'>): FaixaNota {
  const media = Number(r.media), desvio = Number(r.desvio)
  if ((r.n >= 3 && media < 6) || (r.minima <= 3 && r.mensagens > 0)) return 'prioridade'
  if (r.n >= 2 && media >= 9) return 'post'
  if ((r.n >= 3 && (media < 7.5 || desvio >= 3)) || (r.n < 3 && r.minima <= 5)) return 'atencao'
  return 'normal'
}

/** Ordem dentro de cada faixa: as piores primeiro (ou as melhores, nas sugestões de post), depois as com mais notas. */
export function ordenarResumos(lista: ResumoNota[], faixa: FaixaNota): ResumoNota[] {
  const sinal = faixa === 'post' ? -1 : 1
  return [...lista].sort((a, b) => sinal * (Number(a.media) - Number(b.media)) || b.n - a.n)
}

/** Média com uma casa ("7,5"). */
export const mediaFormatada = (media: number | string) => Number(media).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
