import '@fontsource/cinzel/latin-700.css'
import '@fontsource/cinzel/latin-900.css'
import '@fontsource/alegreya/latin-400.css'
import '@fontsource/alegreya/latin-700.css'
import '@fontsource/alegreya/latin-800.css'
import '../estilos/paginas/Flashcards.css'
import { FLASHCARDS_RANKING } from '../config'
import { Arena } from '../flashcards/componentes/Arena'
import { Entrada } from '../flashcards/componentes/Entrada'
import { RankingCripta } from '../flashcards/componentes/RankingCripta'

/**
 * Cripta do Residente (masmorra dos flashcards):
 *   #/flashcards            Entrada (escolha do modo, Altar e Bestiário)
 *   #/flashcards/cripta     a Cripta sem fim
 *   #/flashcards/torre      a Torre do Título, 100 andares
 *   #/flashcards/biblioteca o Estudo calmo
 *   #/flashcards/ranking    ranking (atrás da trava, config.ts)
 */
export function Flashcards({ secao }: { secao?: string }) {
  if (secao === 'cripta' || secao === 'masmorra') return <Arena key="cripta" modo="masmorra" />
  if (secao === 'torre') return <Arena key="torre" modo="torre" />
  if (secao === 'biblioteca' || secao === 'estudo') return <Arena key="biblioteca" modo="masmorra" abrirEstudo />
  if (secao === 'ranking' && FLASHCARDS_RANKING) return <RankingCripta />
  return <Entrada />
}
