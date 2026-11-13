import { Icone } from '../Icone'
import { recurso } from '../../config'
import { href } from '../../util/rotas'
import { linkConta } from '../../conta/passagem'
import { real } from '../../dados/planos'
import { LEMBRETE_DESTAQUE, PLANOS_PIPOCA, SEM_FIDELIDADE, cobranca, descontoPct, economia, porMes, seloPlano, semMoeda, type Plano } from '../../dados/vendas'
import { IconePix, IconeCartao } from './IconesPagamento'
import { PizzaPixel } from './PizzaPixel'

const TAMANHO: Record<string, string> = { mensal: '1 mês', semestral: '6 meses', anual: '12 meses' }

/**
 * Os três planos lado a lado. Desde 13/11/2026 o anual é o destaque (Tales): o melhor preço, com o selo,
 * o baú e o botão dourado; o mensal e o semestral têm o botão verde. Todos dizem que custam menos que uma
 * pizza por mês, que não têm fidelidade e que há a garantia de 7 dias. No celular, o anual vem primeiro,
 * inteiro, e os outros dois logo abaixo, lado a lado, para comparar sem rolar de lado. No computador, as linhas dos três
 * cartões se alinham (subgrid): nome, preço, total, economia e botão na mesma altura.
 */
export function CartoesPlanos({ local, conta, pagamentos, semCompra, rotulo, aoEscolher, planos = PLANOS_PIPOCA, planosAntigos = [] }: {
  local: 'topo' | 'final'
  conta: boolean
  pagamentos: boolean
  semCompra: boolean
  rotulo: (p: Plano) => string
  aoEscolher: (p: Plano) => void
  /** Os planos com o preço desta pessoa (planosDaPessoa): o antigo nos planos que ela já pagava. */
  planos?: readonly Plano[]
  /** Os planos em que a pessoa mantém o preço de antes do reajuste (selo "Seu preço de sempre"). */
  planosAntigos?: readonly string[]
}) {
  return (
    <div className={`vd-planos vd-planos--${local}`} role="list" aria-label="Planos de assinatura">
      {planos.map((p) => {
        const selo = seloPlano(p)
        const desconto = descontoPct(p)
        const classe = 'botao botao--largo vd-plano__cta' + (p.destaque ? ' vd-botao-destaque' : ' vd-botao-verde')
        const dados = { 'data-funil': `plano-${p.id}-${local}` }
        return (
          <article key={p.id} role="listitem" className={`vd-plano vd-plano--${p.id}` + (p.destaque ? ' vd-plano--destaque' : '')} aria-labelledby={`vd-plano-${local}-${p.id}`}>
            {selo && <span className="vd-plano__selo"><Icone nome="estrela" tamanho={13} /> {selo}</span>}
            {p.destaque && local === 'topo' && <img className="vd-plano__bau" src={recurso('pixel/planos.png')} alt="" width={64} height={64} draggable={false} />}
            <header className="vd-plano__topo">
              <h3 id={`vd-plano-${local}-${p.id}`}>{p.nome}</h3>
              <span className="vd-plano__tamanho">{TAMANHO[p.id]}</span>
            </header>
            <p className="vd-plano__chamada"><PizzaPixel />{p.chamada}</p>
            <p className="vd-plano__mes" aria-label={`${real(porMes(p))} por mês`}><small>R$</small><strong>{semMoeda(porMes(p))}</strong><small>/mês</small></p>
            {/* O selo vai dentro do total: os cartões alinham as linhas por subgrid e precisam do mesmo número de filhos. */}
            <p className="vd-plano__total">{cobranca(p)}{/* Onde a chamada some (celular e tablet), a pizza vem na versão curta, numa linha, junto ao preço. */}<span className="vd-plano__pizza-curta"><PizzaPixel />Menos que uma pizza por mês</span>{p.id !== 'mensal' && planosAntigos.includes(p.id) && <span className="vd-plano__abertura">Seu preço de sempre</span>}</p>
            <p className="vd-plano__ganho">
              {desconto > 0
                ? <><span className="vd-plano__desconto">-{desconto}%</span> economia de {real(economia(p))}</>
                : <span className="vd-plano__neutro">Renova mês a mês</span>}
            </p>
            <p className="vd-plano__lembrete"><strong>{SEM_FIDELIDADE}</strong> {LEMBRETE_DESTAQUE}</p>
            {!conta && pagamentos
              ? <a className={classe} href={href(linkConta('criar', `/assinatura?plano=${p.id}`))} {...dados}>Assinar o {p.nome.toLowerCase()}</a>
              : <button className={classe} type="button" disabled={semCompra} onClick={() => aoEscolher(p)} {...dados}>{rotulo(p)}</button>}
            <p className="vd-plano__meios"><span className="vd-plano__pix"><IconePix tamanho={13} /> Pix</span> ou <span><IconeCartao tamanho={14} /> cartão</span></p>
          </article>
        )
      })}
    </div>
  )
}
