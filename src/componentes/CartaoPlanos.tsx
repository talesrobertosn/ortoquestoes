import { usarConta } from '../conta/ContextoConta'
import { usarAssinante } from '../conta/plano'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { IconePixel } from './IconePixel'

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
        <strong>{assinante ? 'Sua assinatura' : 'Planos e assinatura'}</strong>{!assinante && <em>a partir de R$ 19,99/mês · Pix ou cartão</em>}
        <small>{assinante ? 'Plano, renovação e pagamentos em um só lugar.' : 'Cronograma pelo que mais cai, Simulado Nacional e questões sem limite.'}</small>
      </span>
      <span className="inicio-planos-atalho__acao">{assinante ? 'Ver detalhes' : 'Conhecer os planos'} <Icone nome="direita" tamanho={16} /></span>
    </a>
  )
}
