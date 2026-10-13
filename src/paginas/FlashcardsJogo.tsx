import '@fontsource/cinzel/latin-700.css'
import '@fontsource/cinzel/latin-900.css'
import '@fontsource/alegreya/latin-400.css'
import '@fontsource/alegreya/latin-700.css'
import '@fontsource/alegreya/latin-800.css'
import '../estilos/paginas/Flashcards.css'
import { Arena } from '../flashcards/componentes/Arena'
import { Entrada } from '../flashcards/componentes/Entrada'

/** O jogo dos flashcards (Cripta, Torre, Biblioteca e a Entrada temática), carregado à parte. */
export default function FlashcardsJogo({ secao }: { secao: string }) {
  if (secao === 'cripta' || secao === 'masmorra') return <Arena key="cripta" modo="masmorra" />
  if (secao === 'torre') return <Arena key="torre" modo="torre" />
  if (secao === 'biblioteca' || secao === 'estudo') return <Arena key="biblioteca" modo="masmorra" abrirEstudo />
  return <Entrada />
}
