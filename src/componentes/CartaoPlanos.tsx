import { usarConta } from '../conta/ContextoConta'
import { usarAssinante } from '../conta/plano'
import { href } from '../util/rotas'
import { Icone } from './Icone'

/**
 * Acesso fácil aos planos, no tom de um atalho: sem preço, sem urgência.
 * Quem já assina encontra os dados da assinatura em Minha conta.
 */
export function CartaoPlanos() {
  const { sessao } = usarConta()
  const assinante = usarAssinante(sessao)
  if (assinante) return null
  return (
    <a className="inicio-planos-atalho" href={href('/assinatura')}>
      <span className="inicio-planos-atalho__texto">
        <strong>Planos e assinatura</strong><em>a partir de R$ 19,99/mês · Pix ou cartão</em>
        <small>Cronograma pelo que mais cai, Simulado Nacional e questões sem limite.</small>
      </span>
      <span className="inicio-planos-atalho__acao">Conhecer os planos <Icone nome="direita" tamanho={16} /></span>
    </a>
  )
}
