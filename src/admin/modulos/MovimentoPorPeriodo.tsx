import { compararMovimento, serieNegocio, diaCurto, type EventoNegocio } from '../dados/negocio'
import { baixarCsv } from '../../componentes/admin/formatos'
import { ComparacaoVisual } from '../ui/resumosVisuais'
import { Linhas } from '../ui/linhas'
import { Colunas } from '../ui/graficos'
import { inteiro } from '../ui/formato'

const PERIODOS = [
  {
    escala: 'dia',
    titulo: 'Hoje',
    anterior: 'Ontem',
    descricao: 'Desde a meia-noite, comparado com ontem até o mesmo horário.',
    ritmo: 'Acumulado ao longo do dia',
  },
  {
    escala: 'semana',
    titulo: 'Esta semana',
    anterior: 'Semana anterior',
    descricao: 'Desde segunda-feira, comparado com os mesmos dias e horário da semana anterior.',
    ritmo: 'Acumulado ao longo da semana',
  },
  {
    escala: 'mes',
    titulo: 'Este mês',
    anterior: 'Mês anterior',
    descricao: 'Desde o dia 1º, comparado com o mês anterior até o mesmo dia e horário.',
    ritmo: 'Acumulado ao longo do mês',
  },
] as const
const PRINCIPAIS = [
  ['cadastro', 'Novos cadastros'],
  ['nova', 'Primeiras assinaturas'],
] as const
const EXTRAS = [
  ['renovacao', 'Renovações'],
  ['volta', 'Voltaram a pagar'],
] as const
const hora = (t: number) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  }).format(t)
const data = (t: number) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
  }).format(t)
function diferenca(atual: number, antes: number) {
  const delta = atual - antes
  if (!delta) return 'Mesmo número'
  const parte = `${delta > 0 ? '+' : '−'}${inteiro(Math.abs(delta))}`
  return antes > 0
    ? `${parte} · ${delta > 0 ? '+' : '−'}${((Math.abs(delta) / antes) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
    : `${parte} · antes era zero`
}
export function MovimentoPorPeriodo({
  eventos,
  agora,
  aoVer,
}: {
  eventos: EventoNegocio[]
  agora: Date
  aoVer: (titulo: string, eventos: EventoNegocio[]) => void
}) {
  const periodos = PERIODOS.map((p) => ({ ...p, ...compararMovimento(eventos, p.escala, agora) }))
  return (
    <div className="mp-periodos">
      <nav className="mp-panorama" aria-label="Resumo de cadastros e assinaturas por período">
        {periodos.map((p) => (
          <a
            key={p.escala}
            href={`#cr-movimento-${p.escala}`}
            onClick={(e) => {
              e.preventDefault()
              document.getElementById(`cr-movimento-${p.escala}`)?.scrollIntoView({
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'start',
              })
            }}
          >
            <span className="mp-panorama__titulo">
              {p.titulo}
              <small>{p.anterior.toLowerCase()}, no mesmo trecho</small>
            </span>
            {PRINCIPAIS.map(([tipo, rotulo]) => (
              <span className={`mp-panorama__metrica mp-panorama__metrica--${tipo}`} key={tipo}>
                <span>{rotulo}</span>
                <strong>{inteiro(p.contagens[tipo].atuais.length)}</strong>
                <small>
                  {p.contagens[tipo].anteriores.length} antes ·{' '}
                  {diferenca(p.contagens[tipo].atuais.length, p.contagens[tipo].anteriores.length)}
                </small>
              </span>
            ))}
            <span className="mp-panorama__abrir">Ver o período ↓</span>
          </a>
        ))}
      </nav>
      {periodos.map((p, indice) => {
        const j = p.janela
        const historico = serieNegocio(eventos, p.escala, agora)
        const tituloHistorico =
          p.escala === 'dia'
            ? 'Últimos 30 dias'
            : p.escala === 'semana'
              ? 'Últimas 12 semanas'
              : 'Últimos 12 meses'
        const faixa = (inicio: number, fim: number) => `${data(inicio)} a ${data(fim)} · até ${hora(fim)}`
        const arquivo = () =>
          baixarCsv(
            `crescimento-${p.escala}-comparativo.csv`,
            [
              'Métrica',
              'Atual',
              'Anterior até o mesmo momento',
              'Anterior completo',
              'Início atual',
              'Fim atual',
              'Início anterior',
              'Fim comparável anterior',
            ],
            [...PRINCIPAIS, ...EXTRAS].map(([tipo, rotulo]) => [
              rotulo,
              p.contagens[tipo].atuais.length,
              p.contagens[tipo].anteriores.length,
              p.contagens[tipo].anteriorCompleto.length,
              new Date(j.inicio).toISOString(),
              new Date(j.fim).toISOString(),
              new Date(j.anterior).toISOString(),
              new Date(j.ateAnterior).toISOString(),
            ]),
          )
        return (
          <section
            key={p.escala}
            className="ng-painel mp-periodo"
            id={`cr-movimento-${p.escala}`}
            aria-labelledby={`mp-titulo-${p.escala}`}
          >
            <header className="mp-periodo__cabeca">
              <div>
                <span className="ng-kicker">
                  {String(indice + 1).padStart(2, '0')} /{' '}
                  {p.escala === 'dia' ? 'Dia' : p.escala === 'semana' ? 'Semana' : 'Mês'}
                </span>
                <h3 id={`mp-titulo-${p.escala}`}>{p.titulo}</h3>
                <p>{p.descricao}</p>
              </div>
              <button
                type="button"
                className="a3-botao a3-botao--contorno a3-botao--pequeno"
                onClick={arquivo}
              >
                Baixar comparativo
              </button>
            </header>
            <div className="mp-janelas">
              <span>
                <b>{p.titulo}</b>{' '}
                {p.escala === 'dia' ? `${data(j.fim)} · até ${hora(j.fim)}` : faixa(j.inicio, j.fim)}
              </span>
              <span>
                <b>{p.anterior}</b>{' '}
                {p.escala === 'dia'
                  ? `${data(j.anterior)} · até ${hora(j.ateAnterior)}`
                  : faixa(
                      j.anterior,
                      Math.max(j.anterior, j.ateAnterior === j.inicio ? j.ateAnterior - 1 : j.ateAnterior),
                    )}
              </span>
            </div>
            {p.anteriorMaisCurto && (
              <p className="ng-nota">
                O mês anterior tinha menos dias. A comparação usa todo o período disponível, sem incluir
                registros do mês atual.
              </p>
            )}
            <div className="mp-metricas">
              {PRINCIPAIS.map(([tipo, rotulo]) => {
                const c = p.contagens[tipo],
                  total = c.atuais.length,
                  antes = c.anteriores.length
                return (
                  <article className={`mp-metrica mp-metrica--${tipo}`} key={tipo}>
                    <h4>{rotulo}</h4>
                    <div className="mp-numero">
                      <button
                        className="ng-numero"
                        type="button"
                        aria-label={`${rotulo}: ${total}, ${p.titulo.toLowerCase()}. Ver pessoas`}
                        onClick={() => aoVer(`${rotulo} · ${p.titulo.toLowerCase()}`, c.atuais)}
                      >
                        {inteiro(total)}
                        <span aria-hidden="true">→</span>
                      </button>
                      <span className={total > antes ? 'ng-positivo' : total < antes ? 'ng-negativo' : ''}>
                        {diferenca(total, antes)}
                      </span>
                    </div>
                    <ComparacaoVisual
                      atual={total}
                      anterior={antes}
                      rotuloAtual={`${p.titulo} até agora`}
                      rotuloAnterior={`${p.anterior} no mesmo trecho`}
                    />
                    <button
                      className="mp-ver-anterior"
                      type="button"
                      onClick={() =>
                        aoVer(`${rotulo} · ${p.anterior.toLowerCase()}, no mesmo trecho`, c.anteriores)
                      }
                    >
                      Ver {antes === 1 ? 'a pessoa' : `as ${inteiro(antes)} pessoas`} do período anterior →
                    </button>
                    <div className="mp-curva">
                      <h5>{p.ritmo}</h5>
                      <Linhas
                        pontos={p.pontos.map((pt) => ({ rotulo: pt.rotulo, valores: pt[tipo] }))}
                        series={[{ nome: p.titulo }, { nome: p.anterior, tracejada: true }]}
                        titulo={`${rotulo} acumulados: ${p.titulo.toLowerCase()} e ${p.anterior.toLowerCase()}, até o mesmo momento`}
                        altura={190}
                        inteiros
                      />
                    </div>
                    <div className="mp-periodo-completo">
                      <span>
                        {p.anterior} completo <b>{inteiro(c.anteriorCompleto.length)}</b>
                      </span>
                      <small>
                        Referência de fechamento; a comparação principal usa apenas o trecho equivalente.
                      </small>
                    </div>
                  </article>
                )
              })}
            </div>
            <div className="mp-outros">
              <div>
                <h4>Outras cobranças {p.titulo.toLowerCase()}</h4>
                <p>Separadas das primeiras assinaturas.</p>
              </div>
              {EXTRAS.map(([tipo, rotulo]) => {
                const c = p.contagens[tipo]
                return (
                  <div key={tipo}>
                    <span>{rotulo}</span>
                    <button
                      type="button"
                      className="ng-numero"
                      onClick={() => aoVer(`${rotulo} · ${p.titulo.toLowerCase()}`, c.atuais)}
                      aria-label={`${rotulo}: ${c.atuais.length}, ${p.titulo.toLowerCase()}. Ver pessoas`}
                    >
                      {inteiro(c.atuais.length)}
                    </button>
                    <small>
                      {diferenca(c.atuais.length, c.anteriores.length)} · {c.anteriores.length} antes
                    </small>
                  </div>
                )
              })}
            </div>
            <div className="mp-historico">
              <div>
                <h4>{tituloHistorico}</h4>
                <p>
                  Cadastros e primeiras assinaturas em cada período. A última coluna ainda está em andamento;
                  o comparativo equivalente está acima.
                </p>
              </div>
              <div className="mp-historico__rolagem">
                <div>
                  <Colunas
                    pontos={historico.map((s, i) => ({
                      longo: s.chave,
                      curto:
                        p.escala === 'mes'
                          ? new Intl.DateTimeFormat('pt-BR', {
                              month: 'short',
                              year: '2-digit',
                              timeZone: 'America/Sao_Paulo',
                            }).format(new Date(`${s.chave}-15T12:00:00Z`))
                          : diaCurto(s.chave),
                      partes: [s.cadastro, s.nova],
                      parcial: i === historico.length - 1,
                    }))}
                    series={[{ nome: 'Novos cadastros' }, { nome: 'Primeiras assinaturas', estilo: 2 }]}
                    lado
                    media={false}
                    descricao={`${tituloHistorico}: novos cadastros e primeiras assinaturas`}
                    altura={220}
                  />
                </div>
              </div>
              <small className="mp-historico__dica">
                No celular, arraste o gráfico para ver todos os períodos.
              </small>
              <details className="ng-dados">
                <summary>
                  Ver contagens{' '}
                  {p.escala === 'dia' ? 'por dia' : p.escala === 'semana' ? 'por semana' : 'por mês'}
                </summary>
                <div className="a3-tabela-caixa">
                  <table className="a3-tabela">
                    <thead>
                      <tr>
                        <th>Período</th>
                        <th className="num">Cadastros</th>
                        <th className="num">Primeiras assinaturas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((s, i) => (
                        <tr key={s.chave}>
                          <th scope="row">
                            {s.chave}
                            {i === historico.length - 1 ? ' · em andamento' : ''}
                          </th>
                          <td className="num">{s.cadastro}</td>
                          <td className="num">{s.nova}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </section>
        )
      })}
    </div>
  )
}
