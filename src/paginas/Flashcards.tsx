import { reiniciarVolume, tocarMusica, tocarAmbiente } from '../flashcards/efeitos/sons'
import { lazy, Suspense, useEffect } from 'react'
import { CentralFlashcards, CronogramaFlashcards, DesempenhoFlashcards } from './CentralFlashcards'
import { navegar } from '../util/rotas'

// O jogo (fontes, folhas de estilo e motor) só carrega quando a pessoa entra nele;
// a central e as páginas de desempenho e cronograma abrem leves.
const Jogo = lazy(() => import('./FlashcardsJogo'))

/**
 * Flashcards (beta público, 13/10/2026):
 *   #/flashcards            central do site (revisões de hoje, atalhos, opinião)
 *   #/flashcards/desempenho e /cronograma: páginas do site
 *   #/flashcards/entrada    Entrada da Cripta (escolha do modo, Altar e Bestiário)
 *   #/flashcards/cripta     a Cripta sem fim
 *   #/flashcards/torre      a Torre do Título, 100 andares
 *   #/flashcards/biblioteca o Estudo calmo
 *   #/flashcards/ranking    leva ao ranking do site, aba Flashcards
 */
export function Flashcards({ secao }: { secao?: string }) {
  useEffect(() => {
    if (!["cripta","masmorra","biblioteca","estudo","entrada","torre"].includes(secao ?? '')) { reiniciarVolume();tocarMusica(null);tocarAmbiente(null) }
  },[secao])
  useEffect(() => () => { reiniciarVolume();tocarMusica(null);tocarAmbiente(null) },[])

  if (secao === 'torre') return <Redirecionar destino="/flashcards/entrada" />
  if (['cripta', 'masmorra', 'torre', 'biblioteca', 'estudo', 'entrada'].includes(secao ?? '')) return <Suspense fallback={null}><Jogo secao={secao!} /></Suspense>
  if (secao === 'ranking') return <Redirecionar destino="/ranking?aba=flashcards" />
  if (secao === 'desempenho') return <DesempenhoFlashcards />
  if (secao === 'cronograma') return <CronogramaFlashcards />
  return <CentralFlashcards />
}

function Redirecionar({ destino }: { destino: string }) {
  useEffect(() => { navegar(destino, true) }, [destino])
  return null
}
