/**
 * Números dos emblemas da Biblioteca de Resumos (pedido do Tales, 16/10/2026).
 *
 * Os emblemas em si ficam em src/estado/conquistas.ts (famílias "bib…" e a secreta da coruja),
 * junto com todos os outros. Aqui só se lê o que a Biblioteca já guarda na chave sincronizada
 * `biblioteca` (marcações m.<id> e leituras l.<capitulo>): tudo no aparelho, sem SQL novo.
 *   - marcações: grifos coloridos que não foram apagados (o marcador de página não conta);
 *   - notas: marcações com nota escrita (pelo menos NOTA_MINIMA letras);
 *   - abertos: capítulos abertos pelo menos uma vez;
 *   - concluídos: capítulos lidos até o fim com pelo menos CONCLUIR_MINIMO_S de leitura ativa
 *     (passar o dedo até o fim em 10 segundos não conta; leituras de antes do cronômetro, sim);
 *   - minutos e dias: o cronômetro de leitura ativa (src/biblioteca/tempoLeitura.ts).
 */
import type { DocBiblioteca } from './tipos'

/** Nota que conta: pelo menos isto de texto. */
export const NOTA_MINIMA = 3
/** Resumo concluído: chegou ao fim com pelo menos estes segundos de leitura ativa. */
export const CONCLUIR_MINIMO_S = 5 * 60

export interface MetricasBiblioteca {
  bibMarcas: number
  bibNotas: number
  bibAbertos: number
  bibConcluidos: number
  /** Minutos de leitura ativa, somados em todos os resumos. */
  bibMinutos: number
  /** Dias diferentes com pelo menos 1 minuto de leitura ativa. */
  bibDias: number
  /** Secreta: abriu um resumo entre meia-noite e 5 da manhã. */
  bibCoruja: number
}
export const METRICAS_BIBLIOTECA_VAZIAS: MetricasBiblioteca = { bibMarcas: 0, bibNotas: 0, bibAbertos: 0, bibConcluidos: 0, bibMinutos: 0, bibDias: 0, bibCoruja: 0 }

export function metricasBiblioteca(docs: Record<string, DocBiblioteca | null | undefined> | null | undefined): MetricasBiblioteca {
  const m = { ...METRICAS_BIBLIOTECA_VAZIAS }
  if (!docs || typeof docs !== 'object') return m
  const dias = new Set<number>()
  let segundos = 0
  for (const d of Object.values(docs)) {
    if (!d || typeof d !== 'object') continue
    if (d.tipo === 'marca') {
      if (d.apagadaEm || d.marcador) continue
      m.bibMarcas++
      if (String(d.nota ?? '').trim().length >= NOTA_MINIMA) m.bibNotas++
    } else if (d.tipo === 'leitura') {
      const s = Math.max(0, Number(d.segundos) || 0)
      segundos += s
      if (d.aberturas?.length || d.progresso > 0 || s > 0) m.bibAbertos++
      if (d.concluidoEm && (d.segundos === undefined || s >= CONCLUIR_MINIMO_S)) m.bibConcluidos++
      for (const dia of d.dias ?? []) if (Number.isInteger(dia)) dias.add(dia)
      if (d.aberturas?.some((em) => new Date(em).getHours() < 5)) m.bibCoruja = 1
    }
  }
  m.bibMinutos = Math.floor(segundos / 60)
  m.bibDias = dias.size
  return m
}
