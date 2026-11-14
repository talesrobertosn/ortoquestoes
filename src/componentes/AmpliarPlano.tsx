import { IconePixel } from './IconePixel'
import { Icone } from './Icone'
import { ContaDias } from './ContaDias'
import { real, type Plano } from '../dados/planos'
import { diaMes } from '../conta/periodoPix'
import { dias, diasEntre } from '../conta/dias'
import '../estilos/componentes/AmpliarPlano.css'

/**
 * Ampliar o plano (Tales, 14/11/2026): quem paga um plano mais curto passa para um mais longo
 * sem perder dia e sem pagar em dobro. O plano novo é emendado no fim do período já pago: no Pix,
 * o período novo começa quando o atual termina; no cartão, a primeira cobrança fica para essa data
 * e a renovação do plano curto é desligada sozinha. Cada opção mostra a conta dos dias: o que a
 * pessoa já tem, o que compra e o total, em dias e em meses.
 *
 * `estilo`: "vd" na página de planos (botão dourado da temporada), "dp" em Dados da assinatura
 * (botões do padrão do Desempenho: verde cheio no destaque, contorno no outro).
 */
export function AmpliarPlano({ atual, opcoes, fim, cartao, aoAmpliar, estilo = 'vd', titulo = true }: {
  atual: Plano
  opcoes: readonly Plano[]
  fim: number
  cartao: boolean
  aoAmpliar: (p: Plano) => void
  estilo?: 'vd' | 'dp'
  titulo?: boolean
}) {
  const porMesAtual = atual.total / atual.meses
  const tem = diasEntre(Date.now(), fim)
  const classeBotao = (p: Plano) => estilo === 'dp'
    ? 'dp-botao' + (p.destaque ? ' dp-botao--principal' : '')
    : 'botao ' + (p.destaque ? 'vd-botao-destaque' : 'botao--principal')
  return <section className={`ampliar ampliar--${estilo}`} aria-labelledby={titulo ? 'ampliar-titulo' : undefined} aria-label={titulo ? undefined : 'Ampliar o plano'}>
    {titulo && <div className="ampliar__topo">
      <span className="ampliar__icone"><IconePixel nome="planos" tamanho={44} /></span>
      <div>
        <h3 id="ampliar-titulo">Ampliar o plano</h3>
        <p>Vai estudar por mais tempo? Passe para um plano mais longo e pague <strong>menos por mês</strong>. Os <strong>{dias(tem)}</strong> que você ainda tem continuam valendo: o plano novo só começa em <strong>{diaMes(fim)}</strong>, quando o {atual.nome.toLowerCase()} termina.</p>
      </div>
    </div>}

    <ul className="ampliar__opcoes">
      {opcoes.map((p) => {
        const economia = Math.round((porMesAtual * p.meses - p.total) * 100) / 100
        return <li key={p.id} className={'ampliar__opcao' + (p.destaque ? ' ampliar__opcao--destaque' : '')}>
          <div className="ampliar__opcao-nome">
            <strong>{p.nome}</strong>
            {p.destaque && <span className="ampliar__selo"><Icone nome="estrela" tamanho={12} /> Melhor preço</span>}
          </div>
          <p className="ampliar__opcao-mes"><strong>{real(p.total / p.meses)}</strong><small>/mês</small></p>
          <p className="ampliar__opcao-total">{real(p.total)} {p.meses === 12 ? 'por ano' : `a cada ${p.meses} meses`}{economia > 0 && <> · <span className="ampliar__opcao-economia">economia de <strong>{real(economia)}</strong></span></>}</p>
          <ContaDias fimAtual={fim} meses={p.meses} compacta />
          <button type="button" className={classeBotao(p) + ' ampliar__botao'} onClick={() => aoAmpliar(p)} data-funil={`ampliar-${p.id}-${estilo}`}>
            Ampliar para o {p.nome.toLowerCase()} <Icone nome="direita" tamanho={16} />
          </button>
        </li>
      })}
    </ul>

    <p className="ampliar__nota"><Icone nome="calendario" tamanho={14} /> <span>{cartao
      ? <>Nada é cobrado hoje. A primeira cobrança do plano novo acontece em <strong>{diaMes(fim)}</strong>, e a renovação do {atual.nome.toLowerCase()} é desligada sozinha: nunca há cobrança em dobro.</>
      : <>Pague hoje pelo Pix ou deixe no cartão, que só cobra em <strong>{diaMes(fim)}</strong>. Os dias do plano novo se somam aos que você já tem.</>}</span></p>
  </section>
}
