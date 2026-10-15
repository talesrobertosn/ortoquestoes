import { useEffect, useState } from 'react'
import { armazenamentoCheio, EVENTO_ARMAZENAMENTO_CHEIO } from '../estado/armazenamento'
import { Icone } from './Icone'

/**
 * Quando o navegador fica sem espaço, o progresso passa a viver só na memória
 * da aba e na nuvem. A pessoa precisa saber disso antes de fechar a aba offline.
 */
export function AvisoArmazenamento() {
  const [visivel, definirVisivel] = useState(armazenamentoCheio)
  useEffect(() => {
    const aoEncher = () => definirVisivel(true)
    window.addEventListener(EVENTO_ARMAZENAMENTO_CHEIO, aoEncher)
    return () => window.removeEventListener(EVENTO_ARMAZENAMENTO_CHEIO, aoEncher)
  }, [])
  if (!visivel) return null
  return <div className="aviso-site aviso-site--alerta nao-imprime" role="alert">
    <div className="conteudo aviso-site__interno">
      <Icone nome="alerta" tamanho={16} />
      <p>O armazenamento deste navegador está cheio. Seu progresso continua indo para a nuvem enquanto houver internet, mas não fica guardado neste aparelho. Libere espaço do navegador para voltar ao normal.</p>
      <button type="button" className="aviso-site__fechar" onClick={() => definirVisivel(false)} aria-label="Fechar aviso"><Icone nome="fechar" tamanho={16} /></button>
    </div>
  </div>
}
