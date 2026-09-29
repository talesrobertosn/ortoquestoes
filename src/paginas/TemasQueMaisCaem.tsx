import { useMemo } from 'react'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { embaralhar } from '../dados/embaralhar'
import { FILTROS_VAZIOS, type Indice } from '../dados/tipos'
import { AREAS, ROTULO_NIVEL, TOP_ASSUNTOS, areaPorId, idsDoFoco, type AreaIncidencia, type Foco, type Nivel } from '../dados/incidencia'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarSessao } from '../estado/sessao'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { ConvitePremium, SeloAssinante } from '../componentes/Premium'
import { href, navegar } from '../util/rotas'

const QUESTOES_POR_TREINO = 20
type Respondidas = Record<string, RegistroQuestao>

interface Marca { total: number; feitas: number; acerto: number | null }
function marca(ids: string[], respondidas: Respondidas): Marca {
  let feitas = 0, certas = 0, validas = 0
  for (const id of ids) {
    const r = respondidas[id]
    if (!r) continue
    feitas++
    if (r.c === true) { certas++; validas++ } else if (r.c === false) validas++
  }
  return { total: ids.length, feitas, acerto: validas >= 5 ? Math.round((certas / validas) * 100) : null }
}

/** Não feitas primeiro, depois as erradas, depois o resto; sorteadas dentro de cada grupo. */
function ordemDeTreino(ids: string[], respondidas: Respondidas, semente: number): string[] {
  const novas = ids.filter((id) => !respondidas[id])
  const erradas = ids.filter((id) => respondidas[id]?.c === false)
  const resto = ids.filter((id) => respondidas[id] && respondidas[id].c !== false)
  return [...embaralhar(novas, semente), ...embaralhar(erradas, semente), ...embaralhar(resto, semente)].slice(0, QUESTOES_POR_TREINO)
}

function Chamas({ nivel }: { nivel: Nivel }) {
  return (
    <span className={`ti-nivel ti-nivel--${nivel}`} title={ROTULO_NIVEL[nivel]}>
      <span className="ti-nivel__barras" aria-hidden="true">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= nivel ? 'cheia' : ''} />)}</span>
      {ROTULO_NIVEL[nivel]}
    </span>
  )
}

export function TemasQueMaisCaem() {
  const { premium, logado, carregado } = usarPremium()
  const { indice } = usarIndice()
  const [respondidas] = usarArmazenado<Respondidas>('respondidas', {})
  const { sessao, iniciar } = usarSessao()

  if (logado && !carregado) return <Carregando linhas={4} rotulo="Carregando" />
  if (!premium) return <Convite />
  if (!indice) return <Carregando linhas={6} rotulo="Carregando o ranking" />

  function treinar(area: AreaIncidencia, foco?: Foco) {
    if (!indice) return
    const ids = ordemDeTreino(idsDoFoco(indice, area, foco), respondidas, Date.now())
    if (!ids.length) return
    if (sessao && !sessao.concluidaEm && !window.confirm('Substituir a sessão em andamento? Seu histórico será mantido.')) return
    const subtemas = [area.subtema, foco ? (foco.noAcervo ?? foco.nome) : undefined].filter((s): s is string => !!s)
    iniciar({ ...FILTROS_VAZIOS, temas: subtemas.length ? [] : [area.slug], subtemas, embaralhar: true, limite: ids.length }, ids)
    navegar('/sessao')
  }

  return <Ranking indice={indice} respondidas={respondidas} treinar={treinar} />
}

function Ranking({ indice, respondidas, treinar }: { indice: Indice; respondidas: Respondidas; treinar: (area: AreaIncidencia, foco?: Foco) => void }) {
  // Questões de cada área e de cada assunto, calculadas uma vez por acervo.
  const mapa = useMemo(() => new Map(AREAS.map((a) => [a.id, { area: idsDoFoco(indice, a), focos: new Map(a.focos.map((f) => [f.nome, idsDoFoco(indice, a, f)])) }])), [indice])

  return (
    <div className="empilha-2 ti">
      <section className="ti-heroi">
        <p className="ti-heroi__selo"><Icone nome="fogo" tamanho={15} /> Temas que mais caem</p>
        <h1>Estude primeiro o que a prova mais cobra</h1>
        <p>O ranking das áreas e dos assuntos que mais caem no TEOT e no TARO, das provas anteriores. Cada assunto abre um treino com as questões dele, começando pelas que você ainda não fez.</p>
        <ul className="ti-heroi__legenda" aria-label="Legenda">
          {([4, 3, 2, 1] as Nivel[]).map((n) => <li key={n}><Chamas nivel={n} /></li>)}
        </ul>
      </section>

      <section className="cartao cartao__corpo ti-top" aria-labelledby="ti-top-titulo">
        <header className="ti-secao__cabeca">
          <div>
            <h2 id="ti-top-titulo">Os 20 assuntos campeões</h2>
            <p className="texto-2">Somando todas as áreas, do mais cobrado para o menos. Se o tempo está curto, comece por aqui.</p>
          </div>
          <SeloAssinante />
        </header>
        <ol className="ti-top__lista">
          {TOP_ASSUNTOS.map((t, i) => {
            const area = areaPorId(t.area)!
            const foco = area.focos.find((f) => f.nome === t.nome)!
            const ids = mapa.get(area.id)?.focos.get(foco.nome) ?? []
            const m = marca(ids, respondidas)
            return (
              <li key={`${t.area}-${t.nome}`} className="ti-top__item">
                <span className="ti-top__posicao numerico">{i + 1}</span>
                <span className="ti-top__nome"><strong>{t.rotulo}</strong><small>{area.nome}{ids.length ? ` · ${m.feitas} de ${m.total} feitas${m.acerto !== null ? ` · ${m.acerto}% de acerto` : ''}` : ''}</small></span>
                {ids.length > 0
                  ? <button type="button" className="botao ti-botao" onClick={() => treinar(area, foco)}>Treinar</button>
                  : <span className="ti-top__sem">Em breve</span>}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="ti-areas" aria-labelledby="ti-areas-titulo">
        <header className="ti-secao__cabeca ti-secao__cabeca--solta">
          <div>
            <h2 id="ti-areas-titulo">Ranking das áreas</h2>
            <p className="texto-2">Da área que mais cai para a que menos cai. Abra uma área para ver os assuntos em ordem.</p>
          </div>
        </header>
        <ol className="ti-areas__lista">
          {AREAS.map((area, i) => {
            const dados = mapa.get(area.id)!
            const m = marca(dados.area, respondidas)
            const porNivel = ([4, 3, 2, 1] as Nivel[]).map((n) => ({ n, focos: area.focos.filter((f) => f.nivel === n) })).filter((g) => g.focos.length)
            return (
              <li key={area.id}>
                <details className="ti-area" open={i === 0}>
                  <summary>
                    <span className="ti-area__posicao numerico">{i + 1}º</span>
                    <span className="ti-area__nome">
                      <strong>{area.nome}</strong>
                      <span className="ti-area__peso" aria-label={`Peso na prova: ${area.peso} de 10`}><span style={{ width: `${area.peso * 10}%` }} /></span>
                      <small>{m.total ? `${m.feitas} de ${m.total} questões feitas${m.acerto !== null ? ` · ${m.acerto}% de acerto` : ''}` : 'Sem questões no acervo ainda'}</small>
                    </span>
                    <Icone nome="baixo" tamanho={18} />
                  </summary>
                  <div className="ti-area__corpo">
                    {porNivel.map((g) => (
                      <div key={g.n} className="ti-grupo">
                        <Chamas nivel={g.n} />
                        <div className="ti-grupo__focos">
                          {g.focos.map((f) => {
                            const ids = dados.focos.get(f.nome) ?? []
                            const mf = marca(ids, respondidas)
                            const completo = ids.length > 0 && mf.feitas === ids.length
                            return ids.length
                              ? <button key={f.nome} type="button" className={'ti-foco' + (completo ? ' ti-foco--feito' : '')} onClick={() => treinar(area, f)} title={`Você fez ${mf.feitas} de ${mf.total} questões deste assunto no acervo`}>
                                  {completo && <Icone nome="certo" tamanho={13} />}{f.nome}
                                </button>
                              : <span key={f.nome} className="ti-foco ti-foco--sem">{f.nome}</span>
                          })}
                        </div>
                      </div>
                    ))}
                    {m.total > 0 && <button type="button" className="botao ti-botao ti-area__treinar" onClick={() => treinar(area)}><Icone nome="raio" tamanho={15} /> Treinar {area.nome.toLowerCase()}</button>}
                  </div>
                </details>
              </li>
            )
          })}
        </ol>
      </section>

      <p className="ti-nota">
        Toque em um assunto para treinar as questões dele; o sinal de visto marca os que você já fez inteiros. O ranking vem da frequência dos assuntos em provas anteriores e serve para priorizar o estudo; não é previsão do que vai cair. O <a href={href('/plano-de-estudo')}>plano até a prova</a> já usa esta ordem.
      </p>
    </div>
  )
}

function Convite() {
  const exemplo = ['███████ ████', '█████ █ ██████', '████ █ █████', '████████ ██████', '██████']
  return (
    <div className="empilha-2 ti">
      <section className="ti-heroi">
        <p className="ti-heroi__selo"><Icone nome="fogo" tamanho={15} /> Temas que mais caem</p>
        <h1>Estude primeiro o que a prova mais cobra</h1>
        <p>O ranking das áreas e dos assuntos que mais caem no TEOT e no TARO, das provas anteriores, com um treino pronto para cada assunto.</p>
      </section>
      <ConvitePremium
        icone="fogo"
        titulo="Saiba onde a prova aperta"
        texto={<p>Das 12 grandes áreas às dezenas de assuntos dentro de cada uma, em ordem do que mais cai. E o plano até a prova usa essa ordem para decidir o que você estuda primeiro.</p>}
        itens={['Os 20 assuntos campeões de cobrança', 'Ranking das 12 áreas, com os assuntos de cada uma', 'Um toque e começa o treino daquele assunto', 'Seu progresso e acerto em cada tema']}
      >
        <ol className="ti-teaser" aria-hidden="true">
          {exemplo.map((t, i) => <li key={i}><span className="numerico">{i + 1}º</span><span>{t}</span><Chamas nivel={(4 - Math.min(3, Math.floor(i / 2))) as Nivel} /></li>)}
        </ol>
      </ConvitePremium>
    </div>
  )
}
