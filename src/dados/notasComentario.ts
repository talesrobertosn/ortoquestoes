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

/* ───────────── Painel das notas (14/11/2026): estatística para o administrador ───────────── */

/** Uma nota da lista recente (listar_avaliacoes_comentario_admin). */
export interface NotaRecente { id_questao: string; util: boolean; nota?: number | null; atualizado_em: string; motivo?: string | null; observacao?: string | null }

/** Nota ruim: 5 ou menos (ou o "não ajudou" antigo). Só ela gera aviso no painel; nota boa não avisa. */
export const ehNotaRuim = (a: { nota?: number | null; util: boolean }) => valorDaAvaliacao(a) <= NOTA_PEDE_MOTIVO

/** Quantas notas de 1 a 10 (índice 0 = nota 1). As antigas, sem nota, ficam de fora e são contadas à parte. */
export function distribuicaoNotas(linhas: NotaRecente[]): { contagem: number[]; semNota: number; total: number } {
  const contagem = Array.from({ length: 10 }, () => 0)
  let semNota = 0
  for (const l of linhas) {
    if (l.nota && l.nota >= 1 && l.nota <= 10) contagem[l.nota - 1]++
    else semNota++
  }
  return { contagem, semNota, total: contagem.reduce((t, n) => t + n, 0) }
}

/**
 * Saldo das notas, no espírito do NPS: % de 9 e 10 menos % de 1 a 6. Vai de -100 a 100.
 * Acima de 0, há mais fãs do comentário do que gente insatisfeita.
 */
export function saldoNotas(contagem: number[]): number | null {
  const total = contagem.reduce((t, n) => t + n, 0)
  if (!total) return null
  const fas = contagem[8] + contagem[9]
  const criticos = contagem.slice(0, 6).reduce((t, n) => t + n, 0)
  return Math.round(((fas - criticos) / total) * 100)
}

/** Início da semana (segunda-feira, 0h, horário local). */
export function inicioSemana(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dia = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - dia)
  return x
}

/** Notas por semana, das mais antigas para a atual: quantidade e média (as antigas valem 8 e 3). */
export function notasPorSemana(linhas: NotaRecente[], semanas = 12, agora = new Date()): Array<{ inicio: Date; n: number; media: number | null; ruins: number }> {
  const atual = inicioSemana(agora)
  const lista = Array.from({ length: semanas }, (_, i) => { const d = new Date(atual); d.setDate(d.getDate() - 7 * (semanas - 1 - i)); return { inicio: d, n: 0, soma: 0, ruins: 0 } })
  for (const l of linhas) {
    const s = inicioSemana(new Date(l.atualizado_em)).getTime()
    const alvo = lista.find(x => x.inicio.getTime() === s)
    if (!alvo) continue
    alvo.n++; alvo.soma += valorDaAvaliacao(l); if (ehNotaRuim(l)) alvo.ruins++
  }
  return lista.map(x => ({ inicio: x.inicio, n: x.n, media: x.n ? x.soma / x.n : null, ruins: x.ruins }))
}

/** Média geral ponderada de todas as questões (cada nota pesa igual), total de notas e de questões. */
export function resumoGeral(resumos: Array<Pick<ResumoNota, 'n' | 'media'>>): { media: number | null; notas: number; questoes: number } {
  let soma = 0, notas = 0
  for (const r of resumos) { soma += Number(r.media) * r.n; notas += r.n }
  return { media: notas ? soma / notas : null, notas, questoes: resumos.length }
}

/** Motivos marcados em todas as questões, do mais comum para o menos. */
export function motivosSomados(resumos: Array<Pick<ResumoNota, 'motivos'>>): Array<[string, number]> {
  const m = new Map<string, number>()
  for (const r of resumos) for (const [k, v] of Object.entries(r.motivos ?? {})) m.set(k, (m.get(k) ?? 0) + Number(v))
  return [...m].sort((a, b) => b[1] - a[1])
}

/** Questões reescritas (mais de uma versão avaliada): média da versão anterior e da atual. Maior ganho primeiro. */
export function efeitoReescritas(resumos: ResumoNota[]): Array<{ id_questao: string; antes: number; depois: number; nAntes: number; nDepois: number; ganho: number }> {
  const lista: Array<{ id_questao: string; antes: number; depois: number; nAntes: number; nDepois: number; ganho: number }> = []
  for (const r of resumos) {
    const v = r.versoes ?? []
    if (v.length < 2) continue
    const a = v[v.length - 2], d = v[v.length - 1]
    const antes = Number(a.media), depois = Number(d.media)
    lista.push({ id_questao: r.id_questao, antes, depois, nAntes: a.n, nDepois: d.n, ganho: depois - antes })
  }
  return lista.sort((x, y) => y.ganho - x.ganho)
}

/** A nota mais dada (moda), ou null sem notas. */
export function notaMaisComum(contagem: number[]): number | null {
  let melhor = -1, nota = null as number | null
  contagem.forEach((n, i) => { if (n > melhor && n > 0) { melhor = n; nota = i + 1 } })
  return nota
}
