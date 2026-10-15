import { useMemo } from 'react'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { embaralhar } from '../dados/embaralhar'
import { FILTROS_VAZIOS, type Indice } from '../dados/tipos'
import { AREAS, BASE_CONTAGEM, TOP_ASSUNTOS, areaPorId, idsDoFoco, type AreaIncidencia, type Foco, type Nivel } from '../dados/incidencia'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarSessao } from '../estado/sessao'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { Degustacao, SeloAssinante } from '../componentes/Premium'
import { NivelCobranca } from '../componentes/NivelCobranca'
import { IconePixel } from '../componentes/IconePixel'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/TemasQueMaisCaem.css'
import { VoltarAoTopo } from '../componentes/IndicePagina'

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
  const { iniciarComAviso } = usarSessao()

  if (logado && !carregado) return <Carregando linhas={4} rotulo="Carregando" />
  if (!indice) return <Carregando linhas={6} rotulo="Carregando o ranking" />

  async function treinar(area: AreaIncidencia, foco?: Foco) {
    if (!indice) return
    const ids = ordemDeTreino(idsDoFoco(indice, area, foco), respondidas, Date.now())
    if (!ids.length) return
    const subtemas = [area.subtema, foco ? (foco.noAcervo ?? foco.nome) : undefined].filter((s): s is string => !!s)
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, temas: subtemas.length ? [] : [area.slug], subtemas, embaralhar: true, limite: ids.length }, ids))) return
    navegar('/sessao')
  }

  return <><Ranking indice={indice} respondidas={respondidas} treinar={treinar} aberto={premium} /><VoltarAoTopo /></>
}

/** As três áreas com mais questões de prova, num pódio (2º, 1º, 3º). */
function Podio() {
  const top = AREAS.filter((a) => !a.subtema).slice(0, 3)
  if (top.length < 3) return null
  const ordem = [top[1], top[0], top[2]]
  return (
    <ol className="ti-podio" aria-label="As três áreas que mais caem">
      {ordem.map((a) => {
        const lugar = top.indexOf(a) + 1
        return (
          <li key={a.id} className={`ti-podio__lugar ti-podio__lugar--${lugar}`}>
            <span className="ti-podio__nome">{a.nome}</span>
            <span className="ti-podio__pct numerico">{(a.pct ?? 0).toLocaleString('pt-BR')}%</span>
            <span className="ti-podio__degrau" aria-label={`${lugar}º lugar`}><b className="numerico">{lugar}</b></span>
          </li>
        )
      })}
    </ol>
  )
}

/** Quantos itens o não assinante vê antes do desfoque. */
const PREVIA_TOP = 3

function Ranking({ indice, respondidas, treinar, aberto }: { indice: Indice; respondidas: Respondidas; treinar: (area: AreaIncidencia, foco?: Foco) => void; aberto: boolean }) {
  // Questões de cada área e de cada assunto, calculadas uma vez por acervo.
  const mapa = useMemo(() => new Map(AREAS.map((a) => [a.id, { area: idsDoFoco(indice, a), focos: new Map(a.focos.map((f) => [f.nome, idsDoFoco(indice, a, f)])) }])), [indice])

  return (
    <div className="empilha-2 ti">
      <section className="ti-heroi">
        <div className="ti-heroi__texto">
          <p className="ti-heroi__selo"><Icone nome="grafico" tamanho={14} /> Temas que mais caem</p>
          <h1>Estude primeiro o que a prova mais cobra</h1>
          <p>Contamos as questões das provas oficiais (TEOT, TARO, TECOC e ENARE) uma por uma, por área e por assunto. Cada assunto abre um treino com as que você ainda não fez.</p>
          <ul className="ti-heroi__fatos" aria-label="A contagem">
            <li><b className="numerico">{BASE_CONTAGEM.toLocaleString('pt-BR')}</b> questões de prova contadas</li>
            <li><b className="numerico">{AREAS.filter((a) => !a.subtema).length}</b> áreas</li>
            <li><b className="numerico">{AREAS.reduce((s, a) => s + a.focos.length, 0)}</b> assuntos no ranking</li>
          </ul>
          {!aberto && <p className="ti-heroi__previa"><Icone nome="cadeado" tamanho={14} /> Você está vendo uma prévia. O ranking completo é do assinante.</p>}
          <ul className="ti-heroi__legenda" aria-label="Legenda">
            {([4, 3, 2, 1] as Nivel[]).map((n) => <li key={n}><NivelCobranca nivel={n} /></li>)}
          </ul>
        </div>
        <Podio />
      </section>

      <section className="cartao cartao__corpo ti-top" aria-labelledby="ti-top-titulo">
        <header className="ti-secao__cabeca">
          <div>
            <h2 id="ti-top-titulo">Os {TOP_ASSUNTOS.length} assuntos com mais questões de prova</h2>
            <p className="texto-2">Somando todas as áreas, do mais frequente para o menos. Se o tempo está curto, comece por aqui.</p>
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
                <span className="ti-top__nome"><strong>{t.rotulo}</strong><small>{area.nome} · {t.n} {t.n === 1 ? 'questão' : 'questões'} de prova{ids.length ? ` · você fez ${m.feitas}${m.acerto !== null ? `, ${m.acerto}% de acerto` : ''}` : ''}</small></span>
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
            <p className="texto-2">Da área com mais questões de prova para a com menos. Abra uma área para ver os assuntos em ordem, com a contagem de cada um.</p>
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
                    <span className="ti-area__posicao numerico" data-medalha={i < 3 ? i + 1 : undefined}>{i + 1}º</span>
                    <span className="ti-area__nome">
                      <strong>{area.nome}</strong>
                      <span className="ti-area__peso" aria-label={`${area.pct ?? 0}% das questões de prova`}><span style={{ width: `${area.peso * 10}%` }} /></span>
                      <small>{area.n ? `${area.n.toLocaleString('pt-BR')} questões de prova · ` : ''}{m.total ? `você fez ${m.feitas} de ${m.total}${m.acerto !== null ? `, ${m.acerto}% de acerto` : ''}` : 'Sem questões no acervo ainda'}</small>
                    </span>
                    {area.pct !== undefined && <span className="ti-area__pct numerico">{area.pct.toLocaleString('pt-BR')}%<small>da prova</small></span>}
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
                            const conta = f.n ? <span className="ti-foco__n numerico">{f.n}</span> : null
                            if (!aberto) return <span key={f.nome} className="ti-foco">{f.nome}{conta}</span>
                            return ids.length
                              ? <button key={f.nome} type="button" className={'ti-foco' + (completo ? ' ti-foco--feito' : '')} onClick={() => treinar(area, f)} title={`${f.n ?? 0} questões de prova · você fez ${mf.feitas} de ${mf.total}`}>
                                  {completo && <Icone nome="certo" tamanho={13} />}{f.nome}{conta}
                                </button>
                              : <span key={f.nome} className="ti-foco ti-foco--sem">{f.nome}{conta}</span>
                          })}
                        </div>
                      </div>
                    ))}
                    {!aberto && <p className="ti-area__guardado"><Icone nome="cadeado" tamanho={14} /> Os assuntos de prioridade alta, média e baixa ficam guardados para assinantes.</p>}
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

      <section className="ti-proximo" aria-label="Próximos passos">
        <a className="ti-proximo__cartao" href={href('/cronograma')}>
          <IconePixel nome="planos" tamanho={44} />
          <span><strong>Siga esta ordem sem pensar</strong><small>O cronograma usa este ranking: as áreas que mais caem ganham mais espaço e cada dia começa pelo assunto de prioridade máxima. No fim, duas semanas de reta final.</small></span>
          <Icone nome="direita" tamanho={18} />
        </a>
        <a className="ti-proximo__cartao ti-proximo__cartao--simulados" href={href('/treinar?simulados=1')}>
          <IconePixel nome="simulado" tamanho={44} />
          <span><strong>OrtoQuestões Simulados</strong><small>Questões novas desses mesmos assuntos, feitas por engenharia reversa das provas reais: o mesmo padrão da banca, a partir da bibliografia. Para fixar o conteúdo, e não só decorar as provas antigas.</small></span>
          <Icone nome="direita" tamanho={18} />
        </a>
      </section>

      <p className="ti-nota">
        Toque em um assunto para treinar as questões dele; o sinal de visto marca os que você já fez inteiros. O número ao lado de cada assunto é quantas questões de prova oficial dele há no acervo ({BASE_CONTAGEM.toLocaleString('pt-BR')} contadas no total, sem cópias, anuladas ou questões autorais). A prioridade divide os assuntos de cada área em quatro partes iguais pela contagem: máxima para o quarto com mais questões, baixa para o quarto com menos. O ranking serve para priorizar o estudo; não é previsão do que vai cair. O <a href={href('/cronograma')}>cronograma</a> já usa esta ordem.
      </p>
    </div>
  )
}
