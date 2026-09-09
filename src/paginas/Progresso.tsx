import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarProgresso } from '../dados/acervo'
import { href } from '../util/rotas'
import { Carregando } from '../componentes/Estados'
import type { Progresso as DadosProgresso } from '../dados/tipos'

/** Porcentagem com uma casa, ou "0" quando ainda não há nada. */
function pct(parte: number, todo: number) {
  if (!todo) return 0
  return (100 * parte) / todo
}

function formatarPct(valor: number) {
  // Abaixo de 1% uma casa decimal viraria "0,0%" e esconderia o que existe.
  return valor > 0 && valor < 1
    ? valor.toFixed(2).replace('.', ',')
    : valor.toFixed(1).replace('.', ',')
}

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function Progresso() {
  const { indice, carregando } = usarIndice()
  const [progresso, definirProgresso] = useState<DadosProgresso | null>(null)

  useEffect(() => {
    let vivo = true
    carregarProgresso().then((dados) => vivo && definirProgresso(dados))
    return () => {
      vivo = false
    }
  }, [])

  const resumo = useMemo(() => {
    if (!indice || indice.total === 0) return null
    // Anuladas ficam de fora, como em todo o resto do site: elas não entram em
    // sessão, não recebem comentário e, no denominador, tornariam os 100%
    // inalcançáveis por construção.
    const validas = indice.questoes.filter((q) => q.an === 0)
    const total = validas.length
    const ia = validas.filter((q) => q.cia).length
    const comunidade = validas.filter((q) => q.cc).length

    const porTema = indice.temas.map((tema, i) => {
      const daqui = validas.filter((q) => q.t === i)
      return {
        slug: tema.slug,
        nome: tema.nome,
        total: daqui.length,
        ia: daqui.filter((q) => q.cia).length,
        comunidade: daqui.filter((q) => q.cc).length,
      }
    })
    // Do mais coberto para o menos: a lista vira, sozinha, a fila de trabalho.
    porTema.sort((a, b) => pct(b.ia, b.total) - pct(a.ia, a.total))

    return { total, ia, comunidade, porTema }
  }, [indice])

  return (
    <div className="empilha-2">
      <section className="limite-leitura">
        <h1>Como o acervo está sendo comentado</h1>
        <p style={{ marginTop: '0.75rem' }}>
          Cada questão do OrtoQuestões pode receber duas explicações independentes: um
          comentário escrito por inteligência artificial e os comentários da comunidade de
          ortopedistas e residentes. Esta página mostra, sem maquiagem, quanto do acervo já
          tem cada um deles — inclusive o que ainda falta.
        </p>
      </section>

      {carregando && <Carregando linhas={3} rotulo="Carregando o acervo" />}

      {resumo && (
        <>
          <section>
            <div className="painel-progresso">
              <Cartao
                rotulo="Comentadas por IA"
                valor={`${formatarPct(pct(resumo.ia, resumo.total))}%`}
                apoio={`${resumo.ia.toLocaleString('pt-BR')} de ${resumo.total.toLocaleString('pt-BR')} questões`}
                fracao={pct(resumo.ia, resumo.total)}
              />
              <Cartao
                rotulo="Comentadas pela comunidade"
                valor={resumo.comunidade.toLocaleString('pt-BR')}
                apoio={
                  resumo.comunidade === 1
                    ? 'questão, até agora — o começo de tudo'
                    : `questões (${formatarPct(pct(resumo.comunidade, resumo.total))}% do acervo)`
                }
                fracao={pct(resumo.comunidade, resumo.total)}
              />
            </div>
            <p className="meta" style={{ marginTop: '0.75rem' }}>
              Os comentários da comunidade não competem com os da IA: eles convivem na mesma
              questão. <a href={href('/contato')}>Mande o seu</a> — sai com o seu nome, o seu
              serviço e a data.
            </p>
          </section>

          {progresso && progresso.marcos.length >= 3 && (
            <GraficoEvolucao marcos={progresso.marcos} />
          )}

          <section>
            <h2>Por tema</h2>
            <p className="meta" style={{ marginTop: '0.25rem' }}>
              Do mais comentado para o menos. Um clique leva às questões do tema.
            </p>
            <div className="rolagem-x" style={{ marginTop: '0.75rem' }}>
              <table className="tabela tabela--progresso">
                <thead>
                  <tr>
                    <th scope="col">Tema</th>
                    <th scope="col" className="numerico">
                      Questões
                    </th>
                    <th scope="col">Comentadas por IA</th>
                    <th scope="col" className="numerico">
                      Comunidade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.porTema.map((tema) => {
                    const parte = pct(tema.ia, tema.total)
                    return (
                      <tr key={tema.slug}>
                        <th scope="row" style={{ fontWeight: 400 }}>
                          <a href={href(`/treinar?temas=${tema.slug}`)}>{tema.nome}</a>
                        </th>
                        <td className="numerico">{tema.total.toLocaleString('pt-BR')}</td>
                        <td>
                          <span className="barra-cobertura">
                            <span
                              className="barra-cobertura__parte"
                              style={{ width: `${parte}%` }}
                            />
                          </span>
                          <span className="barra-cobertura__valor numerico">
                            {formatarPct(parte)}%
                          </span>
                        </td>
                        <td className="numerico">{tema.comunidade.toLocaleString('pt-BR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="limite-leitura">
            <h2>O que estes números não dizem</h2>
            <p style={{ marginTop: '0.5rem' }}>
              Uma questão contada como comentada tem explicação para a alternativa certa e para
              cada uma das erradas — não um parágrafo solto. Mas o comentário da IA{' '}
              <strong>ainda não foi conferido por um ortopedista</strong>, e a própria interface
              diz isso em cada questão. As questões cujo gabarito oficial parece errado levam um
              aviso em destaque antes de qualquer explicação, e as que não consegui sustentar com
              segurança ficam sem comentário de propósito: uma questão com gabarito errado é pior
              do que uma questão ausente.
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              É por isso que a coluna da comunidade importa mais do que o seu tamanho sugere.{' '}
              <a href={href('/sobre')}>Leia sobre o projeto</a>.
            </p>
          </section>
        </>
      )}
    </div>
  )
}

function Cartao({
  rotulo,
  valor,
  apoio,
  fracao,
}: {
  rotulo: string
  valor: string
  apoio: string
  fracao: number
}) {
  return (
    <div className="cartao-progresso">
      <p className="cartao-progresso__rotulo">{rotulo}</p>
      <p className="cartao-progresso__valor">{valor}</p>
      <p className="cartao-progresso__apoio">{apoio}</p>
      <span className="barra-cobertura" aria-hidden="true">
        <span className="barra-cobertura__parte" style={{ width: `${Math.max(fracao, 0.4)}%` }} />
      </span>
    </div>
  )
}

/**
 * Evolução da cobertura da IA. Uma série só — por isso não há legenda: o
 * título já diz o que está plotado. A série da comunidade não entra aqui de
 * propósito: com uma questão em quase quatro mil, a linha ficaria colada no
 * eixo e faria o gráfico mentir sobre as duas grandezas ao mesmo tempo.
 */
function GraficoEvolucao({ marcos }: { marcos: { data: string; total: number; ia: number }[] }) {
  const [ativo, definirAtivo] = useState<number | null>(null)

  const L = 44
  const R = 16
  const T = 16
  const B = 30
  const larg = 720
  const alt = 220
  const plotoW = larg - L - R
  const plotoH = alt - T - B

  const pontos = marcos.map((m) => ({ ...m, valor: pct(m.ia, m.total) }))
  const x = (i: number) => L + (pontos.length === 1 ? plotoW / 2 : (i * plotoW) / (pontos.length - 1))
  const y = (v: number) => T + plotoH - (v / 100) * plotoH

  const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.valor)}`).join(' ')
  const area = `${linha} L ${x(pontos.length - 1)} ${T + plotoH} L ${x(0)} ${T + plotoH} Z`
  const ultimo = pontos[pontos.length - 1]
  const destacado = ativo === null ? pontos.length - 1 : ativo

  return (
    <section>
      <h2>Evolução</h2>
      <p className="meta" style={{ marginTop: '0.25rem' }}>
        Porcentagem do acervo com comentário de IA, dia a dia.
      </p>
      <figure className="grafico" style={{ marginTop: '0.75rem' }}>
        <svg
          viewBox={`0 0 ${larg} ${alt}`}
          className="grafico__svg"
          role="img"
          aria-label={`Cobertura dos comentários de IA de ${formatarData(pontos[0].data)} a ${formatarData(ultimo.data)}, chegando a ${formatarPct(ultimo.valor)} por cento.`}
          onMouseLeave={() => definirAtivo(null)}
        >
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={L}
                x2={larg - R}
                y1={y(v)}
                y2={y(v)}
                className="grafico__grade"
              />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" className="grafico__tique">
                {v}%
              </text>
            </g>
          ))}

          <path d={area} className="grafico__area" />
          <path d={linha} className="grafico__linha" />

          {pontos.map((p, i) => (
            <text key={p.data} x={x(i)} y={alt - 10} textAnchor="middle" className="grafico__tique">
              {formatarData(p.data)}
            </text>
          ))}

          {/* Faixas de acerto largas: o alvo do ponteiro não é o ponto de 8px. */}
          {pontos.map((p, i) => (
            <rect
              key={p.data}
              x={x(i) - plotoW / Math.max(pontos.length - 1, 1) / 2}
              y={T}
              width={plotoW / Math.max(pontos.length - 1, 1)}
              height={plotoH}
              fill="transparent"
              onMouseEnter={() => definirAtivo(i)}
            />
          ))}

          <line
            x1={x(destacado)}
            x2={x(destacado)}
            y1={T}
            y2={T + plotoH}
            className="grafico__mira"
          />
          <circle cx={x(destacado)} cy={y(pontos[destacado].valor)} r="5" className="grafico__ponto" />
        </svg>
        <figcaption className="grafico__legenda">
          <strong className="numerico">{formatarPct(pontos[destacado].valor)}%</strong> em{' '}
          {formatarData(pontos[destacado].data)} —{' '}
          <span className="numerico">{pontos[destacado].ia.toLocaleString('pt-BR')}</span> de{' '}
          <span className="numerico">{pontos[destacado].total.toLocaleString('pt-BR')}</span>{' '}
          questões.
        </figcaption>
      </figure>

      <details className="grafico__tabela">
        <summary>Ver os números em tabela</summary>
        <div className="rolagem-x" style={{ marginTop: '0.5rem' }}>
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Data</th>
                <th scope="col" className="numerico">
                  Comentadas
                </th>
                <th scope="col" className="numerico">
                  Acervo
                </th>
                <th scope="col" className="numerico">
                  Cobertura
                </th>
              </tr>
            </thead>
            <tbody>
              {[...pontos].reverse().map((p) => (
                <tr key={p.data}>
                  <td className="numerico">{formatarData(p.data)}</td>
                  <td className="numerico">{p.ia.toLocaleString('pt-BR')}</td>
                  <td className="numerico">{p.total.toLocaleString('pt-BR')}</td>
                  <td className="numerico">{formatarPct(p.valor)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  )
}
