import { usarConta } from '../conta/ContextoConta'
import { usarAssinante } from '../conta/plano'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { IconePixel } from './IconePixel'
import { A_PARTIR_DE } from '../dados/planos'
import { fraseGratis } from '../config'

/**
 * Acesso fácil aos planos, no tom de um atalho: sem preço, sem urgência.
 * Para quem já assina, vira o caminho para os dados da assinatura.
 */
export function CartaoPlanos() {
  const { sessao } = usarConta()
  const assinante = usarAssinante(sessao)
  return (
    <a className="inicio-planos-atalho" href={href(assinante ? '/conta/assinatura' : '/assinatura')}>
      <span className="inicio-planos-atalho__icone"><IconePixel nome="planos" tamanho={52} /></span>
      <span className="inicio-planos-atalho__texto">
        <strong>{assinante ? 'Sua assinatura' : 'Planos e assinatura'}</strong>{!assinante && <em>a partir de {A_PARTIR_DE}/mês · Pix ou cartão</em>}
        <small>{assinante ? 'Plano, renovação e pagamentos em um só lugar.' : fraseGratis('cartaoPlanos')}</small>
      </span>
      <span className="inicio-planos-atalho__acao">{assinante ? 'Ver detalhes' : 'Conhecer os planos'} <Icone nome="direita" tamanho={16} /></span>
    </a>
  )
}

/**
 * Faixa fina dos planos no começo da página inicial (pedido do Tales, 25/10/2026: o botão de planos tem
 * de ser fácil de achar). Some para quem já assina.
 */
export function FaixaPlanos() {
  const { sessao } = usarConta()
  const assinante = usarAssinante(sessao)
  if (assinante) return null
  return (
    <a className="faixa-planos ip-entra" href={href('/assinatura')}>
      <IconePixel nome="planos" tamanho={36} />
      <span className="faixa-planos__texto"><strong>Planos e assinatura</strong><small>Cronograma até a prova, Simulado Nacional e o Atlas completo · a partir de {A_PARTIR_DE}/mês · Pix ou cartão</small></span>
      <span className="faixa-planos__acao">Ver planos <Icone nome="direita" tamanho={16} /></span>
    </a>
  )
}
