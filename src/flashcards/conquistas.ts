/**
 * Conquistas da Cripta do Residente, prontas para entrar no sistema de
 * emblemas do site (src/estado/conquistas.ts) quando o Tales liberar.
 *
 * Hoje NADA disto aparece nas conquistas: o arquivo só define os emblemas e
 * calcula os números a partir do que o jogo já guarda (recordes, registros e
 * bestiário). Para ligar (docs/flashcards/CONQUISTAS.md):
 *   1. acrescentar as famílias de FAMILIAS_CRIPTA em FamiliaId e FAMILIAS;
 *   2. acrescentar EMBLEMAS_CRIPTA em EMBLEMAS;
 *   3. somar `metricasCripta(...)` às métricas em calcularMetricas (Extras);
 *   4. trocar os recordes locais pelos do servidor (corridas validadas), para
 *      que ninguém ganhe emblema editando o aparelho.
 *
 * Seguem docs/emblemas.md: difíceis desde o primeiro nível (estilo
 * souls-like), níveis altos para pouquíssimas pessoas, qualidade além de volume.
 */
import { BESTIARIO } from './motor/bestiario'
import type { Bestiario, Recordes } from './progresso'

export type NivelCripta = 'bronze' | 'prata' | 'ouro' | 'esmeralda' | 'lendario'
export type FamiliaCripta = 'cripta' | 'torre' | 'flashcardsUnicos' | 'bestiario' | 'dragoes'

export interface EmblemaCripta {
  id: string
  familia: FamiliaCripta
  minimo: number
  rotulo: string
  curto: string
  nivel: NivelCripta
  descricao: string
  secreta?: boolean
}

export const FAMILIAS_CRIPTA: Array<{ id: FamiliaCripta; titulo: string; unidade: (v: number) => string }> = [
  { id: 'cripta', titulo: 'Profundezas da Cripta', unidade: (v) => `andar ${v}` },
  { id: 'torre', titulo: 'Torre do Título', unidade: (v) => `${v}/100` },
  { id: 'flashcardsUnicos', titulo: 'Flashcards únicos', unidade: (v) => `${v.toLocaleString('pt-BR')} flashcards` },
  { id: 'bestiario', titulo: 'Bestiário', unidade: (v) => `${v} adversários vencidos` },
  { id: 'dragoes', titulo: 'Caçador de dragões', unidade: (v) => `${v}` },
]

const e = (familia: FamiliaCripta, id: string, minimo: number, rotulo: string, curto: string, nivel: NivelCripta, descricao: string, secreta = false): EmblemaCripta =>
  ({ id, familia, minimo, rotulo, curto, nivel, descricao, secreta })

export const EMBLEMAS_CRIPTA: readonly EmblemaCripta[] = [
  e('cripta', 'cripta-6', 6, 'Desceu do primeiro ato', 'A2', 'bronze', 'Chegue ao andar 6 da Cripta numa partida.'),
  e('cripta', 'cripta-12', 12, 'Diante do dragão', 'A4', 'prata', 'Chegue ao andar 12 da Cripta (o covil do Dragão de Ossos).'),
  e('cripta', 'cripta-21', 21, 'Fundo da Cripta', 'A7', 'ouro', 'Chegue ao andar 21 da Cripta numa partida.'),
  e('cripta', 'cripta-30', 30, 'Abismo do residente', 'A10', 'esmeralda', 'Chegue ao andar 30 da Cripta numa partida.'),
  e('cripta', 'cripta-45', 45, 'Sem fundo', 'A15', 'lendario', 'Chegue ao andar 45 da Cripta numa partida.'),
  e('torre', 'torre-20', 20, 'Segundo patamar do chefe', '20', 'bronze', 'Chegue ao andar 20 da Torre do Título.'),
  e('torre', 'torre-40', 40, 'Meio caminho', '40', 'prata', 'Chegue ao andar 40 da Torre do Título.'),
  e('torre', 'torre-60', 60, 'Acima das nuvens', '60', 'ouro', 'Chegue ao andar 60 da Torre do Título.'),
  e('torre', 'torre-80', 80, 'Ar rarefeito', '80', 'esmeralda', 'Chegue ao andar 80 da Torre do Título.'),
  e('torre', 'torre-100', 100, 'Título conquistado', '100', 'lendario', 'Vença o Dragão Ancestral no andar 100 da Torre.'),
  e('flashcardsUnicos', 'flashcards-300', 300, 'Baralho próprio', '300', 'bronze', 'Responda 300 flashcards diferentes.'),
  e('flashcardsUnicos', 'flashcards-1000', 1000, 'Mil cartas', '1k', 'prata', 'Responda 1.000 flashcards diferentes.'),
  e('flashcardsUnicos', 'flashcards-2000', 2000, 'Colecionador', '2k', 'ouro', 'Responda 2.000 flashcards diferentes.'),
  e('flashcardsUnicos', 'flashcards-3000', 3000, 'Arquivista', '3k', 'esmeralda', 'Responda 3.000 flashcards diferentes.'),
  e('flashcardsUnicos', 'flashcards-4000', 4000, 'Acervo inteiro', '4k', 'lendario', 'Responda 4.000 flashcards diferentes.'),
  e('bestiario', 'bestiario-8', 8, 'Caçador', '8', 'prata', 'Vença 8 adversários diferentes.'),
  e('bestiario', 'bestiario-todos', BESTIARIO.length, 'Bestiário completo', 'ALL', 'lendario', 'Vença todos os adversários do Bestiário.'),
  e('dragoes', 'dragao-de-ossos', 1, 'Ossos ao pó', 'D', 'ouro', 'Vença o Dragão de Ossos.', true),
  e('dragoes', 'dragoes-todos', 3, 'Matador de dragões', 'DDD', 'esmeralda', 'Vença os três dragões.', true),
]

export type MetricasCripta = Record<FamiliaCripta, number>

/** Números das famílias a partir do que o jogo já guarda. */
export function metricasCripta(recordes: Partial<Recordes>, unicos: number, bestiario: Partial<Bestiario>): MetricasCripta {
  const vencidos = bestiario.vencidos ?? []
  const dragoes = BESTIARIO.filter((i) => i.sprite === 'dragao' && vencidos.includes(i.id)).length
  return {
    cripta: recordes.andarMaximo ?? 0,
    // a Torre só conta 100 quando o topo foi vencido (chegar ao andar 100 não basta)
    torre: Math.min(recordes.torreConcluida ? 100 : 99, recordes.torreMaximo ?? 0),
    flashcardsUnicos: unicos,
    bestiario: vencidos.length,
    dragoes: (vencidos.includes('dragao-de-ossos') ? 1 : 0) + (dragoes >= 3 ? 2 : 0),
  }
}

export const conquistadosCripta = (m: MetricasCripta) => EMBLEMAS_CRIPTA.filter((x) => m[x.familia] >= x.minimo)
