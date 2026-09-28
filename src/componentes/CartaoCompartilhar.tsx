import { useState } from 'react'
import { SITE } from '../config'
import { IconeWhatsapp, MENSAGEM } from './ConviteCompartilhar'
import { Icone } from './Icone'

/** Convite fixo na página inicial: sem pop-up, a pessoa usa quando quiser. */
export function CartaoCompartilhar() {
  const [copiado, definirCopiado] = useState(false)
  const copiar = async () => {
    try { await navigator.clipboard.writeText(SITE.url) } catch { window.prompt('Copie o link:', SITE.url) }
    definirCopiado(true)
    window.setTimeout(() => definirCopiado(false), 2500)
  }
  return (
    <section className="inicio-compartilhar" aria-labelledby="inicio-compartilhar-titulo">
      <div className="inicio-compartilhar__texto">
        <h2 id="inicio-compartilhar-titulo">Está gostando do OrtoQuestões?</h2>
        <p>Manda para quem está estudando com você. É de graça para eles, e cada colega que chega ajuda o projeto a crescer e a ganhar provas novas.</p>
      </div>
      <div className="inicio-compartilhar__acoes">
        <a className="inicio-compartilhar__whatsapp" href={`https://wa.me/?text=${encodeURIComponent(MENSAGEM)}`} target="_blank" rel="noopener noreferrer">
          <IconeWhatsapp tamanho={18} /> Enviar no WhatsApp
        </a>
        <button type="button" className="inicio-compartilhar__copiar" onClick={copiar}>
          <Icone nome={copiado ? 'certo' : 'link'} tamanho={16} /> {copiado ? 'Link copiado' : 'Copiar link'}
        </button>
      </div>
    </section>
  )
}
