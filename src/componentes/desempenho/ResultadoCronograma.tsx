import { useMemo } from 'react'
import { Icone } from '../Icone'
import { href } from '../../util/rotas'
import { usarPremium } from '../../conta/premium'
import { usarPlanoSalvo } from '../../conta/cronograma'
import { calcularPlano } from '../../dados/planoEstudo'
import { calcularConstancia, contarErrosQueImportam } from '../../dados/hubCronograma'
import { resumoJanela, type Evento, type Respondidas } from '../../dados/desempenho'
import type { Indice } from '../../dados/tipos'

/*
 * "Seu estudo está dando resultado?" (14/11/2026): o Cronograma visto do Desempenho. Planejado contra feito desde a
 * criação do plano, a constância dos últimos 14 dias, o acerto de primeira antes e depois do plano nos temas que o
 * plano reforçou, e o que ficou pendente. As mesmas definições do Cronograma (planoEstudo.ts e hubCronograma.ts).
 */
export function ResultadoCronograma({ indice, respondidas, eventos }: { indice: Indice | null; respondidas: Respondidas; eventos: Evento[] }) {
  const { premium, carregado } = usarPremium()
  const { plano } = usarPlanoSalvo(premium)
  const calculo = useMemo(() => (indice && plano ? calcularPlano(indice, respondidas, plano) : null), [indice, plano, respondidas])
  const dados = useMemo(() => {
    if (!indice || !plano || !calculo) return null
    const criado = Date.parse(plano.criado_em)
    const constancia = calcularConstancia(respondidas, plano, calculo)
    const reforcados = new Set(calculo.temas.filter((t) => t.reforcado).map((t) => t.slug))
    const doPlano = reforcados.size ? eventos.filter((e) => e.tema && reforcados.has(e.tema)) : eventos
    const antes = resumoJanela(doPlano, 0, criado)
    const depois = resumoJanela(doPlano, criado, Date.now() + 1)
    return { constancia, antes, depois, reforcados: reforcados.size, erros: contarErrosQueImportam(indice, respondidas) }
  }, [indice, plano, calculo, respondidas, eventos])

  if (!carregado) return null
  if (!premium || !plano || !calculo || !dados) {
    return (
      <section className="ds-cartao rc rc--convite" aria-labelledby="rc-titulo">
        <div className="ds-cartao__cabeca">
          <h3 id="rc-titulo">Seu estudo está dando resultado?</h3>
          <p>Com o Cronograma, este bloco compara o que foi planejado com o que você fez, a constância dos últimos 14 dias e se o acerto subiu nos temas que o plano reforçou.</p>
        </div>
        <a className="botao botao--ouro" href={href('/cronograma')}><Icone nome="calendario" tamanho={16} /> {premium ? 'Montar meu cronograma' : 'Conhecer o Cronograma'}</a>
      </section>
    )
  }
  const { esperadoAteHoje, feitas, ritmo } = calculo
  const pctFeito = esperadoAteHoje ? Math.min(150, Math.round((feitas / esperadoAteHoje) * 100)) : 100
  const ac = (r: { acerto: number | null; n: number }) => (r.acerto === null || r.n < 10 ? null : Math.round(r.acerto * 100))
  const antes = ac(dados.antes), depois = ac(dados.depois)
  return (
    <section className="ds-cartao rc" aria-labelledby="rc-titulo">
      <div className="ds-cartao__cabeca ds-cartao__cabeca--linha">
        <div>
          <h3 id="rc-titulo">Seu estudo está dando resultado?</h3>
          <p>Desde que o cronograma começou, em {new Date(plano.criado_em).toLocaleDateString('pt-BR')}.</p>
        </div>
        <a className="rc__link" href={href('/cronograma')}>Abrir o cronograma <Icone nome="direita" tamanho={14} /></a>
      </div>
      <div className="rc__grade">
        <div className="rc__bloco">
          <span className="rc__rotulo">Planejado × feito</span>
          <span className="rc__valor ds-num">{feitas.toLocaleString('pt-BR')} <small>de {esperadoAteHoje.toLocaleString('pt-BR')} questões</small></span>
          <span className="rc__trilho" aria-hidden="true"><i style={{ width: `${Math.min(100, pctFeito)}%` }} />{pctFeito > 100 && <b style={{ width: `${Math.min(50, pctFeito - 100)}%` }} />}</span>
          <span className={'rc__nota' + (ritmo >= 0 ? ' rc__nota--bom' : '')}>{ritmo >= 0 ? `${ritmo}% à frente do plano` : `${Math.abs(ritmo)}% atrás do plano`}</span>
        </div>
        <div className="rc__bloco">
          <span className="rc__rotulo">Constância · 14 dias</span>
          <span className="rc__valor ds-num">{dados.constancia.aderencia === null ? '–' : `${dados.constancia.aderencia}%`} <small>dos dias cumpridos</small></span>
          <span className="rc__dias" aria-hidden="true">{dados.constancia.ultimos.map((d) => <i key={d.dia.getTime()} className={`rc__dia rc__dia--${d.estado}`} title={`${d.dia.toLocaleDateString('pt-BR')}: ${d.n}`} />)}</span>
          <span className="rc__nota">sequência de {dados.constancia.sequencia} {dados.constancia.sequencia === 1 ? 'dia' : 'dias'}</span>
        </div>
        <div className="rc__bloco">
          <span className="rc__rotulo">Acerto de primeira {dados.reforcados ? 'nos temas reforçados' : ''}</span>
          <span className="rc__valor ds-num">{depois === null ? '–' : `${depois}%`} <small>{antes === null ? 'antes do plano: poucos dados' : `antes do plano: ${antes}%`}</small></span>
          {antes !== null && depois !== null && <span className={'rc__nota' + (depois >= antes ? ' rc__nota--bom' : '')}>{depois === antes ? 'igual a antes' : `${depois > antes ? '▲' : '▼'} ${Math.abs(depois - antes)} pontos desde o plano`}</span>}
        </div>
        <div className="rc__bloco">
          <span className="rc__rotulo">Pendências</span>
          <span className="rc__valor ds-num">{calculo.faltaHoje} <small>{calculo.faltaHoje === 1 ? 'questão para hoje' : 'questões para hoje'}</small></span>
          <span className="rc__nota">{dados.erros} {dados.erros === 1 ? 'erro' : 'erros'} nos assuntos que mais caem</span>
        </div>
      </div>
    </section>
  )
}
