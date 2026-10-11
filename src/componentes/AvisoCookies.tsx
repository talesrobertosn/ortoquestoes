import { useEffect, useState } from 'react'
import { definirConsentimento, EVENTO_ABRIR_COOKIES, iniciarPixel, lerConsentimento, PIXEL_META } from '../conta/consentimento'
import { href } from '../util/rotas'

/**
 * Aviso de cookies: uma faixa fina no pé da tela, que não cobre o conteúdo. Aparece na primeira visita (e quando a pessoa toca em
 * "Cookies" no rodapé) só se houver pixel configurado. Aceitar libera o pixel
 * do Meta; recusar não carrega nada de fora. O site funciona igual nos dois casos.
 */
export function AvisoCookies() {
  const [aberto, definirAberto] = useState(() => Boolean(PIXEL_META) && lerConsentimento() === null)

  useEffect(() => {
    if (!PIXEL_META) return
    iniciarPixel()
    const abrir = () => definirAberto(true)
    window.addEventListener(EVENTO_ABRIR_COOKIES, abrir)
    return () => window.removeEventListener(EVENTO_ABRIR_COOKIES, abrir)
  }, [])

  if (!aberto) return null
  const escolher = (aceitar: boolean) => { definirConsentimento(aceitar ? 'aceito' : 'recusado'); definirAberto(false) }
  return <section className="aviso-cookies nao-imprime" role="region" aria-label="Aviso de cookies">
    <p>
      Usamos cookies do Meta para medir nossos anúncios. O estudo funciona igual se você recusar. <a href={href('/termos')}>Saiba mais</a>
    </p>
    <div className="aviso-cookies__botoes">
      <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => escolher(false)}>Recusar</button>
      <button type="button" className="botao botao--principal botao--pequeno" onClick={() => escolher(true)}>Aceitar</button>
    </div>
  </section>
}
