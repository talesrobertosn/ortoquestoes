import { useMemo } from 'react'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { embaralhar } from '../dados/embaralhar'
import { FILTROS_VAZIOS, type Indice } from '../dados/tipos'
import { AREAS, TOP_ASSUNTOS, areaPorId, idsDoFoco, type AreaIncidencia, type Foco, type Nivel } from '../dados/incidencia'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarSessao } from '../estado/sessao'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Degustacao, SeloAssinante } from '../componentes/Premium'
import { NivelCobranca } from '../componentes/NivelCobranca'
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

/** Linhas de enchimento da prévia: texto neutro, nunca o conteúdo real. */
const GUARDADO = ['Assunto guardado para assinantes', 'Outro assunto do ranking', 'Assunto muito cobrado', 'Mais um assunto campeão', 'Assunto da lista completa']
const AREAS_GUARDADAS = ['Área guardada', 'Outra área do ranking', 'Área da lista completa', 'Mais uma área', 'Área guardada para assinantes']

export function TemasQueMaisCaem() {
  const { premium, logado, carregado } = usarPremium()
  const { indice } = usarIndice()
  const [respondidas] = usarArmazenado<Respondidas>('respondidas', {})
  const { sessao, iniciar } = usarSessao()

  if (logado && !carregado) return <Carregando linhas={4} rotulo="Carregando" />
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

  return <Ranking indice={indice} respondidas={respondidas} treinar={treinar} aberto={premium} />
}

/** Quantos itens o não assinante vê antes do desfoque. */
const PREVIA_TOP = 3

function Ranking({ indice, respondidas, treinar, aberto }: { indice: Indice; respondidas: Respondidas; treinar: (area: AreaIncidencia, foco?: Foco) => void; aberto: boolean }) {
  // Questões de cada área e de cada assunto, calculadas uma vez por acervo.
  const mapa = useMemo(() => new Map(AREAS.map((a) => [a.id, { area: idsDoFoco(indice, a), focos: new Map(a.focos.map((f) => [f.nome, idsDoFoco(indice, a, f)])) }])), [indice])

  return (
    <div className="empilha-2 ti">
      <section className="ti-heroi">
        <p className="ti-heroi__selo"><Icone nome="fogo" tamanho={15} /> Temas que mais caem</p>
        <h1>Estude primeiro o que a prova mais cobra</h1>
        <p>O ranking das áreas e dos assuntos que mais caem no TEOT e no TARO, das provas anteriores. Cada assunto abre um treino com as questões dele, começando pelas que você ainda não fez.</p>
        {!aberto && <p className="ti-heroi__previa"><Icone nome="cadeado" tamanho={14} /> Você está vendo uma prévia. O ranking completo é do assinante.</p>}
        <ul className="ti-heroi__legenda" aria-label="Legenda">
          {([4, 3, 2, 1] as Nivel[]).map((n) => <li key={n}><NivelCobranca nivel={n} /></li>)}
        </ul>
      </section>

      <section className="cartao cartao__corpo ti-top" aria-labelledby="ti-top-titulo">
        <header className="ti-secao__cabeca">
          <div>
            <h2 id="ti-top-titulo">Os 20 assuntos campeões</h2>
            <p className="texto-2">Somando todas as áreas, do mais cobrado para o menos. Se o tempo está curto, comece por aqui.</p>
          </div>
          {!aberto && <SeloAssinante />}
        </header>
        <ol className="ti-top__lista">
          {TOP_ASSUNTOS.slice(0, aberto ? TOP_ASSUNTOS.length : PREVIA_TOP).map((t, i) => {
            const area = areaPorId(t.area)!
            const foco = area.focos.find((f) => f.nome === t.nome)!
            const ids = mapa.get(area.id)?.focos.get(foco.nome) ?? []
            const m = marca(ids, respondidas)
            return (
              <li key={`${t.area}-${t.nome}`} className="ti-top__item">
                <span className="ti-top__posicao numerico">{i + 1}</span>
                <span className="ti-top__nome"><strong>{t.rotulo}</strong><small>{area.nome}{ids.length ? ` · ${m.feitas} de ${m.total} feitas${m.acerto !== null ? ` · ${m.acerto}% de acerto` : ''}` : ''}</small></span>
                {!aberto
                  ? <a className="botao ti-botao" href={href('/assinatura')}><Icone nome="cadeado" tamanho={14} /> Treinar</a>
                  : ids.length > 0
                    ? <button type="button" className="botao ti-botao" onClick={() => treinar(area, foco)}>Treinar</button>
                    : <span className="ti-top__sem">Em breve</span>}
              </li>
            )
          })}
        </ol>
        {!aberto && <Degustacao className="ti-degustacao" titulo={`Os outros ${TOP_ASSUNTOS.length - PREVIA_TOP} assuntos campeões`} texto={<p>A lista completa, com treino de cada assunto em um toque, fica guardada para assinantes.</p>} acao="Ver o ranking completo">
          <ol className="ti-top__lista" start={PREVIA_TOP + 1}>
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="ti-top__item">
                <span className="ti-top__posicao numerico">{PREVIA_TOP + i + 1}</span>
                <span className="ti-top__nome"><strong>{GUARDADO[i % GUARDADO.length]}</strong><small>Área do assunto · 0 de 40 feitas</small></span>
                <span className="botao ti-botao">Treinar</span>
              </li>
            ))}
          </ol>
        </Degustacao>}
      </section>

      <section className="ti-areas" aria-labelledby="ti-areas-titulo">
        <header className="ti-secao__cabeca ti-secao__cabeca--solta">
          <div>
            <h2 id="ti-areas-titulo">Ranking das áreas</h2>
            <p className="texto-2">Da área que mais cai para a que menos cai. Abra uma área para ver os assuntos em ordem.</p>
          </div>
        </header>
        <ol className="ti-areas__lista">
          {AREAS.slice(0, aberto ? AREAS.length : 1).map((area, i) => {
            const dados = mapa.get(area.id)!
            const m = marca(dados.area, respondidas)
            const porNivel = ([4, 3, 2, 1] as Nivel[]).map((n) => ({ n, focos: area.focos.filter((f) => f.nivel === n) })).filter((g) => g.focos.length).slice(0, aberto ? 4 : 1)
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
                        <NivelCobranca nivel={g.n} />
                        <div className="ti-grupo__focos">
                          {g.focos.map((f) => {
                            const ids = dados.focos.get(f.nome) ?? []
                            const mf = marca(ids, respondidas)
                            const completo = ids.length > 0 && mf.feitas === ids.length
                            if (!aberto) return <span key={f.nome} className="ti-foco">{f.nome}</span>
                            return ids.length
                              ? <button key={f.nome} type="button" className={'ti-foco' + (completo ? ' ti-foco--feito' : '')} onClick={() => treinar(area, f)} title={`Você fez ${mf.feitas} de ${mf.total} questões deste assunto no acervo`}>
                                  {completo && <Icone nome="certo" tamanho={13} />}{f.nome}
                                </button>
                              : <span key={f.nome} className="ti-foco ti-foco--sem">{f.nome}</span>
                          })}
                        </div>
                      </div>
                    ))}
                    {!aberto && <p className="ti-area__guardado"><Icone nome="cadeado" tamanho={14} /> Os assuntos que caem com frequência, às vezes e pouco ficam guardados para assinantes.</p>}
                    {aberto && m.total > 0 && <button type="button" className="botao ti-botao ti-area__treinar" onClick={() => treinar(area)}><Icone nome="raio" tamanho={15} /> Treinar {area.nome.toLowerCase()}</button>}
                  </div>
                </details>
              </li>
            )
          })}
        </ol>
        {!aberto && <Degustacao className="ti-degustacao" titulo={`As outras ${AREAS.length - 1} áreas, em ordem`} texto={<p>Da segunda área que mais cai à que menos cai, com todos os assuntos de cada uma e o seu progresso.</p>} acao="Liberar o ranking das áreas">
          <ol className="ti-areas__lista">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i}><div className="ti-area"><div className="ti-area__falso">
                <span className="ti-area__posicao numerico">{i + 2}º</span>
                <span className="ti-area__nome"><strong>{AREAS_GUARDADAS[i]}</strong><span className="ti-area__peso"><span style={{ width: `${70 - i * 10}%` }} /></span><small>0 de 200 questões feitas</small></span>
              </div></div></li>
            ))}
          </ol>
        </Degustacao>}
      </section>

      <p className="ti-nota">
        Toque em um assunto para treinar as questões dele; o sinal de visto marca os que você já fez inteiros. O ranking vem da frequência dos assuntos em provas anteriores e serve para priorizar o estudo; não é previsão do que vai cair. O <a href={href('/cronograma')}>cronograma</a> já usa esta ordem.
      </p>
    </div>
  )
}
