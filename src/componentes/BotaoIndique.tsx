import { recurso } from '../config'
import { DIAS_POR_AMIGO } from '../conta/indicacao'
import { href } from '../util/rotas'
import { Icone } from './Icone'

/**
 * Botão do Indique e ganhe na página inicial (pedido do Tales, 27/10/2026):
 * um bilhete escuro com o baú em pixel flutuando e o selo de ouro dos dias,
 * que leva à página /indicar. A seção completa continua no fim da página.
 */
export function BotaoIndique() {
  return (
    <a className="ip-indique ip-entra" href={href('/indicar')}>
      <span className="ip-indique__bau" aria-hidden="true">
        <img src={recurso('pixel/planos.png')} width={56} height={56} alt="" draggable={false} />
        <i /><i /><i />
      </span>
      <span className="ip-indique__texto">
        <small>Missão: recrute seus amigos</small>
        <strong>Indique e ganhe</strong>
        <span>{DIAS_POR_AMIGO} dias grátis para você e para cada colega que entrar</span>
      </span>
      <span className="ip-indique__selo" aria-hidden="true">+{DIAS_POR_AMIGO} dias</span>
      <span className="ip-indique__seta" aria-hidden="true"><Icone nome="direita" tamanho={18} /></span>
    </a>
  )
}
