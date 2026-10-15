import { EMBLEMAS, emblemaPorId, ehFamiliaFlashcards, podeIrParaVitrine, VITRINE_MAXIMO, type Emblema, type NivelMedalha } from '../estado/conquistas'
import { Dica } from './Inventario'
import { Medalha } from './Medalha'

const PESO: Record<NivelMedalha, number> = { bronze: 1, prata: 2, ouro: 3, esmeralda: 4, lendario: 5 }
const ORDEM = new Map(EMBLEMAS.map((e, i) => [e.id, i]))

/** O emblema de Flashcards mais alto entre os conquistados (nível e, no empate, o mais adiante na família). */
export function melhorEmblemaFlashcards(ids: readonly string[] | null | undefined): Emblema | null {
  let melhor: Emblema | null = null
  for (const id of ids ?? []) {
    const e = emblemaPorId(id)
    if (!e || !ehFamiliaFlashcards(e.familia)) continue
    if (!melhor || PESO[e.nivel] > PESO[melhor.nivel] || (PESO[e.nivel] === PESO[melhor.nivel] && (ORDEM.get(e.id) ?? 0) > (ORDEM.get(melhor.id) ?? 0))) melhor = e
  }
  return melhor
}

/**
 * Emblemas ao lado do nome no ranking de Flashcards: primeiro o melhor emblema
 * de Flashcards da pessoa (travado no servidor), depois a vitrine que ela
 * escolheu, até três no total.
 */
export function EmblemasFlashcards({ vitrine, flashcards, tamanho = 26, classe = '' }: { vitrine?: readonly string[] | null; flashcards?: readonly string[] | null; tamanho?: number; classe?: string }) {
  const melhor = melhorEmblemaFlashcards(flashcards)
  const lista: Emblema[] = melhor ? [melhor] : []
  for (const id of vitrine ?? []) {
    const e = emblemaPorId(id)
    if (e && podeIrParaVitrine(e) && !lista.some((x) => x.id === e.id)) lista.push(e)
  }
  if (!lista.length) return null
  return <span className={'emblemas-nome ' + classe}>
    {lista.slice(0, VITRINE_MAXIMO).map((e) => <Dica key={e.id} titulo={e.rotulo} texto={e.descricao} arte={<Medalha conquista={e} tamanho={64} />}>
      <Medalha conquista={e} tamanho={tamanho} />
    </Dica>)}
  </span>
}
