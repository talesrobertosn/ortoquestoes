import { IconePixel } from './IconePixel'
import { Icone } from './Icone'
import { real, type Plano } from '../dados/planos'
import { diaMes, somarMeses } from '../conta/periodoPix'

const dataLonga = (ms: number) => new Date(ms).toLocaleDateString('pt-BR')

/**
 * Ampliar o plano (Tales, 14/11/2026): quem paga um plano mais curto passa para um mais longo
 * sem perder dia e sem pagar em dobro. O plano novo é emendado no fim do período já pago: no Pix,
 * o período novo começa quando o atual termina; no cartão, a primeira cobrança fica para essa data
 * e a renovação do plano curto é desligada sozinha. A linha do tempo mostra isso à vista.
 */
export function AmpliarPlano({ atual, opcoes, fim, cartao, aoAmpliar }: {
  atual: Plano
  opcoes: readonly Plano[]
  fim: number
  cartao: boolean
  aoAmpliar: (p: Plano) => void
}) {
  const porMesAtual = atual.total / atual.meses
  return <section className="ampliar" aria-labelledby="ampliar-titulo">
    <div className="ampliar__topo">
      <span className="ampliar__icone"><IconePixel nome="planos" tamanho={44} /></span>
      <div>
        <h3 id="ampliar-titulo">Ampliar o plano</h3>
        <p>Vai estudar por mais tempo? Passe para um plano mais longo e pague <strong>menos por mês</strong>. Os dias que você já pagou continuam valendo: o plano novo só começa em <strong>{diaMes(fim)}</strong>, quando o {atual.nome.toLowerCase()} termina.</p>
      </div>
    </div>

    <div className="ampliar__linha" aria-hidden="true">
      <div className="ampliar__barra">
        <span className="ampliar__seg ampliar__seg--atual" />
        <span className="ampliar__seg ampliar__seg--novo" />
      </div>
      <div className="ampliar__marcas">
        <span><b>Hoje</b><small>{atual.nome} até {diaMes(fim)}</small></span>
        <span className="ampliar__marca-novo"><b>Plano novo</b><small>a partir de {diaMes(fim)}</small></span>
      </div>
    </div>

    <ul className="ampliar__opcoes">
      {opcoes.map((p) => {
        const economia = Math.round((porMesAtual * p.meses - p.total) * 100) / 100
        return <li key={p.id} className={'ampliar__opcao' + (p.destaque ? ' ampliar__opcao--destaque' : '')}>
          <div className="ampliar__opcao-nome">
            <strong>{p.nome}</strong>
            <span>{p.meses} meses · {real(p.total)}</span>
          </div>
          <p className="ampliar__opcao-mes"><strong>{real(p.total / p.meses)}</strong><small>/mês</small></p>
          {economia > 0 && <p className="ampliar__opcao-economia">economia de <strong>{real(economia)}</strong> no período</p>}
          <p className="ampliar__opcao-ate">Acesso até <strong>{dataLonga(somarMeses(fim, p.meses))}</strong></p>
          <button type="button" className={'botao botao--largo ' + (p.destaque ? 'vd-botao-destaque' : 'botao--principal')} onClick={() => aoAmpliar(p)} data-funil={`ampliar-${p.id}`}>
            Ampliar para o {p.nome.toLowerCase()} <Icone nome="direita" tamanho={16} />
          </button>
        </li>
      })}
    </ul>

    <p className="ampliar__nota"><Icone nome="calendario" tamanho={14} /> <span>{cartao
      ? <>Nada é cobrado hoje. A primeira cobrança do plano novo acontece em <strong>{diaMes(fim)}</strong>, e a renovação do {atual.nome.toLowerCase()} é desligada sozinha: nunca há cobrança em dobro.</>
      : <>Pague hoje pelo Pix ou deixe no cartão, que só cobra em <strong>{diaMes(fim)}</strong>. O período novo se soma ao que você já tem.</>}</span></p>
  </section>
}
