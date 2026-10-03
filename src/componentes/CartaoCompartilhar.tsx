import { useState } from 'react'
import { SITE, recurso } from '../config'
import { usarConta } from '../conta/ContextoConta'
import { DIAS_POR_AMIGO, QUESTOES_PARA_CONFIRMAR, linkIndicacao, textoIndicacao, usarMinhaIndicacao } from '../conta/indicacao'
import { href } from '../util/rotas'
import { IconeWhatsapp } from './ConviteCompartilhar'
import { TEXTO_CONVITE } from './ConviteDiario'
import { Icone } from './Icone'

/**
 * Convite fixo na página inicial: sem pop-up, a pessoa usa quando quiser.
 * Com conta, o link é o pessoal do programa de indicação (dias grátis para os dois).
 */
export function CartaoCompartilhar() {
  const { sessao } = usarConta()
  const { dados } = usarMinhaIndicacao(sessao?.user.id)
  const [copiado, definirCopiado] = useState(false)
  const link = dados ? linkIndicacao(dados.codigo) : SITE.url
  const texto = dados ? textoIndicacao(dados.codigo) : TEXTO_CONVITE
  const copiar = async () => {
    try { await navigator.clipboard.writeText(link) } catch { window.prompt('Copie o link:', link) }
    definirCopiado(true)
    window.setTimeout(() => definirCopiado(false), 2500)
  }
  return (
    <section className="inicio-compartilhar" aria-labelledby="inicio-compartilhar-titulo">
      <img className="inicio-compartilhar__mensageiro" src={recurso('ranking/mensageiro.png')} width={64} height={80} alt="" draggable={false} />
      <div className="inicio-compartilhar__texto">
        <p className="inicio-compartilhar__selo">Missão: recrute seus amigos</p>
        <h2 id="inicio-compartilhar-titulo">{dados ? `Indique e ganhe ${DIAS_POR_AMIGO} dias do plano completo` : 'Está gostando do OrtoQuestões?'}</h2>
        <p>{dados
          ? <>O site cresce no boca a boca. Cada colega da residência que entra pelo seu link e responde {QUESTOES_PARA_CONFIRMAR} questões vale {DIAS_POR_AMIGO} dias grátis para você e {DIAS_POR_AMIGO} para ele. <a href={href('/indicar')}>Ver minhas indicações</a></>
          : 'O site cresce no boca a boca. Manda para quem está estudando com você: tem questões gratuitas todo dia, e cada colega que chega ajuda o projeto a crescer e a ganhar provas novas.'}</p>
      </div>
      <div className="inicio-compartilhar__acoes">
        <a className="inicio-compartilhar__whatsapp" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer">
          <IconeWhatsapp tamanho={18} /> Enviar no WhatsApp
        </a>
        <button type="button" className="inicio-compartilhar__copiar" onClick={copiar}>
          <Icone nome={copiado ? 'certo' : 'link'} tamanho={16} /> {copiado ? 'Link copiado' : 'Copiar meu link'}
        </button>
      </div>
    </section>
  )
}
