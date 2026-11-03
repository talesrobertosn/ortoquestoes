import { Icone } from '../Icone'
import { recurso } from '../../config'
import { href } from '../../util/rotas'
import { linkConta } from '../../conta/passagem'
import { real } from '../../dados/planos'
import { LEMBRETE_DESTAQUE, PLANOS_PIPOCA, cobranca, descontoPct, economia, porMes, seloPlano, semMoeda, type Plano } from '../../dados/vendas'
import { IconePix, IconeCartao } from './IconesPagamento'

const TAMANHO: Record<string, string> = { mensal: '1 mês', semestral: '6 meses', anual: '12 meses' }

/* Fatia de pizza em pixel (9×9), desenhada em SVG para ficar nítida e leve: k contorno, b borda, y queijo, r calabresa. */
const PIZZA = ['kkkkkkkkk', 'kbbbbbbbk', 'kyyryyyyk', '.kyyyyrk.', '.kyryyyk.', '..kyyyk..', '..kyryk..', '...kyk...', '....k....']
const CORES_PIZZA: Record<string, string> = { k: '#1b1208', b: '#c9832e', y: '#f4cf7c', r: '#b3423a' }
function PizzaPixel() {
  const rastro: Record<string, string> = {}
  PIZZA.forEach((linha, y) => [...linha].forEach((c, x) => { if (c !== '.') rastro[c] = (rastro[c] ?? '') + `M${x} ${y}h1v1h-1z` }))
  return (
    <svg className="vd-plano__pizza" viewBox="0 0 9 9" width={18} height={18} aria-hidden="true" shapeRendering="crispEdges">
      {Object.entries(rastro).map(([c, d]) => <path key={c} d={d} fill={CORES_PIZZA[c]} />)}
    </svg>
  )
}

/**
 * Os três planos lado a lado. Desde 03/11/2026 o mensal é o destaque (Tales): vem à
 * esquerda, maior, com o selo, o baú e o botão dourado, e o semestral e o anual ficam
 * ao lado, com o desconto certo à mostra. No celular, o mensal vem primeiro, inteiro,
 * e os outros dois logo abaixo, lado a lado, para comparar sem rolar de lado. No computador, as linhas dos três
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
        const classe = 'botao botao--largo vd-plano__cta' + (p.destaque ? ' vd-botao-destaque' : ' vd-botao-contorno')
        const dados = { 'data-funil': `plano-${p.id}-${local}` }
        return (
          <article key={p.id} role="listitem" className={`vd-plano vd-plano--${p.id}` + (p.destaque ? ' vd-plano--destaque' : '')} aria-labelledby={`vd-plano-${local}-${p.id}`}>
            {selo && <span className="vd-plano__selo"><Icone nome="estrela" tamanho={13} /> {selo}</span>}
            {p.destaque && local === 'topo' && <img className="vd-plano__bau" src={recurso('pixel/planos.png')} alt="" width={64} height={64} draggable={false} />}
            <header className="vd-plano__topo">
              <h3 id={`vd-plano-${local}-${p.id}`}>{p.nome}</h3>
              <span className="vd-plano__tamanho">{TAMANHO[p.id]}</span>
            </header>
            <p className="vd-plano__chamada">{p.id === 'mensal' && <PizzaPixel />}{p.chamada}</p>
            <p className="vd-plano__mes" aria-label={`${real(porMes(p))} por mês`}><small>R$</small><strong>{semMoeda(porMes(p))}</strong><small>/mês</small></p>
            {/* O selo vai dentro do total: os cartões alinham as linhas por subgrid e precisam do mesmo número de filhos. */}
            <p className="vd-plano__total">{cobranca(p)}{/* Onde a chamada some (celular e tablet), a pizza vem na versão curta, numa linha, junto ao preço. */}{p.id === 'mensal' && <span className="vd-plano__pizza-curta"><PizzaPixel />Custa menos que uma pizza por mês</span>}{p.id !== 'mensal' && planosAntigos.includes(p.id) && <span className="vd-plano__abertura">Seu preço de sempre</span>}</p>
            <p className="vd-plano__ganho">
              {desconto > 0
                ? <><span className="vd-plano__desconto">-{desconto}%</span> economia de {real(economia(p))}</>
                : <span className="vd-plano__neutro">Sem fidelidade · cancele quando quiser</span>}
            </p>
            {p.destaque ? <p className="vd-plano__lembrete">{LEMBRETE_DESTAQUE}</p> : <span className="vd-plano__vazio" aria-hidden="true" />}
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
