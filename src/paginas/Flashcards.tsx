import '@fontsource/cinzel/latin-700.css'
import '@fontsource/cinzel/latin-900.css'
import '@fontsource/alegreya/latin-400.css'
import '@fontsource/alegreya/latin-700.css'
import '@fontsource/alegreya/latin-800.css'
import '../estilos/paginas/Flashcards.css'
import { Arena } from '../flashcards/componentes/Arena'
import { Entrada } from '../flashcards/componentes/Entrada'
import { CentralFlashcards, CronogramaFlashcards, DesempenhoFlashcards } from './CentralFlashcards'
import { useEffect } from 'react'
import { navegar } from '../util/rotas'

/**
 * Flashcards (beta público, 13/10/2026):
 *   #/flashcards            central do site (revisões de hoje, atalhos, opinião)
 *   #/flashcards/desempenho e /cronograma: páginas do site
 *   #/flashcards/entrada    Entrada da Cripta (escolha do modo, Altar e Bestiário)
 *   #/flashcards/cripta     a Cripta sem fim
 *   #/flashcards/torre      a Torre do Título, 100 andares
 *   #/flashcards/biblioteca o Estudo calmo
 *   #/flashcards/ranking    leva ao ranking do site, aba Cripta
 */
export function Flashcards({ secao }: { secao?: string }) {
  if (secao === 'cripta' || secao === 'masmorra') return <Arena key="cripta" modo="masmorra" />
  if (secao === 'torre') return <Arena key="torre" modo="torre" />
  if (secao === 'biblioteca' || secao === 'estudo') return <Arena key="biblioteca" modo="masmorra" abrirEstudo />
  if (secao === 'ranking') return <Redirecionar destino="/ranking?aba=cripta" />
  if (secao === 'entrada') return <Entrada />
  if (secao === 'desempenho') return <DesempenhoFlashcards />
  if (secao === 'cronograma') return <CronogramaFlashcards />
  return <CentralFlashcards />
}

function Redirecionar({ destino }: { destino: string }) {
  useEffect(() => { navegar(destino, true) }, [destino])
  return null
}
