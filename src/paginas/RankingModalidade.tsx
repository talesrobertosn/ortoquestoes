import { useMemo, useState } from 'react'
import { Icone } from '../componentes/Icone'
import { IconePixel } from '../componentes/IconePixel'
import type { Indice } from '../dados/tipos'
import { desempenhoEm, MODALIDADES, prioridade, rankingModalidade, type Modalidade, type Nivel, type TemaRanking } from '../dados/modalidades'
import type { RegistroQuestao } from '../estado/revisao'
import { href } from '../util/rotas'

type Respondidas = Record<string, RegistroQuestao>
const num = (n: number) => n.toLocaleString('pt-BR')
const questoes = (n: number) => `${num(n)} ${n === 1 ? 'questão' : 'questões'}`
const PREVIA = 6
const CRIAR_CONTA = '/conta?modo=criar&voltar=%2Ftemas-que-mais-caem'
const ROTULO_NIVEL: Record<Nivel, string> = { 4: 'Prioridade máxima', 3: 'Prioridade alta', 2: 'Prioridade média', 1: 'Prioridade baixa' }

const TITULO: Record<Modalidade['id'], string> = {
  teot: 'O que o TEOT mais cobra',
  taro: 'O que o TARO mais cobra',
  'mao-ingresso': 'O que as provas de ingresso em Cirurgia da Mão mais cobram',
  'mao-titulo': 'O que a prova de título da mão mais cobra',
}

interface Props {
  modalidade: Modalidade
  indice: Indice
  respondidas: Respondidas
  aberto: boolean
  logado: boolean
  treinar: (ids: string[], tema: string | null, m: Modalidade) => void
}

/**
 * Ranking de uma prova (27/10/2026), calculado do acervo em src/dados/modalidades.ts: muda sozinho
 * quando entram questões. Ordem pela fatia média por prova (cada edição pesa igual), presença em
 * quantas provas o assunto apareceu e, quando há anos suficientes, a tendência recente.
 */
export function RankingModalidade({ modalidade: m, indice, respondidas, aberto, logado, treinar }: Props) {
  const [fonte, definirFonte] = useState<string | null>(null)
  const [area, definirArea] = useState<string | null>(null)
  const [todos, definirTodos] = useState(false)
  const ranking = useMemo(() => rankingModalidade(indice, m, fonte), [indice, m, fonte])
  const geral = useMemo(() => (fonte ? rankingModalidade(indice, m) : ranking), [indice, m, fonte, ranking])
  // TEOT e TARO: o lugar do mesmo assunto na outra prova, para comparar prioridades
  const outra = m.id === 'teot' ? 'taro' : m.id === 'taro' ? 'teot' : null
  const lugarNaOutra = useMemo(() => {
    if (!outra) return null
    const r = rankingModalidade(indice, MODALIDADES.find((x) => x.id === outra)!)
    return new Map(r.temas.filter((t) => !t.nome.startsWith('Outr')).map((t, i) => [t.nome, i + 1]))
  }, [indice, outra])

  const temas = area ? ranking.temas.filter((t) => t.area === area) : ranking.temas
  const lugar = new Map(ranking.temas.map((t, i) => [t.nome, i + 1]))
  const maxArea = Math.max(1, ...ranking.areas.map((a) => a.pct))
  const anoMin = ranking.anos[0], anoMax = ranking.anos[ranking.anos.length - 1]
  const desempenho = (t: TemaRanking) => desempenhoEm(t.ids, respondidas)
  const fezAlgo = logado && ranking.temas.some((t) => t.ids.some((id) => respondidas[id]))
  const sugeridos = [...ranking.temas].filter((t) => !t.nome.startsWith('Outr'))
    .sort((a, b) => (fezAlgo ? prioridade(b, desempenho(b)) - prioridade(a, desempenho(a)) : b.pctEdicao - a.pctEdicao)).slice(0, 3)
  const livre = (t: TemaRanking) => aberto || (lugar.get(t.nome) ?? 99) <= PREVIA
  const cronograma = m.grupo === 'mao' ? `/cronograma-mao?prova=${m.id === 'mao-titulo' ? 'titulo' : 'ingresso'}` : '/cronograma'
  const grupos = ([4, 3, 2, 1] as Nivel[]).map((n) => ({ n, temas: temas.filter((t) => t.nivel === n) })).filter((g) => g.temas.length)
  const visiveis = todos || area ? grupos : grupos.filter((g) => g.n >= 3)
  const escondidos = grupos.filter((g) => !visiveis.includes(g)).reduce((s, g) => s + g.temas.length, 0)

  function acao(t: TemaRanking) {
    if (!logado) return <a className="tq-acao" href={href(CRIAR_CONTA)} aria-label={`Criar conta para treinar ${t.nome}`}><span>Treinar</span><Icone nome="direita" tamanho={14} /></a>
    if (!livre(t)) return null
    return <button type="button" className="tq-acao" onClick={() => treinar(t.ids, t.nome, m)} aria-label={`Treinar ${t.nome}`}><span>Treinar</span><Icone nome="direita" tamanho={14} /></button>
  }
  function linha(t: TemaRanking) {
    const pos = lugar.get(t.nome) ?? 0
    if (!livre(t)) return (
      <li key={t.nome} className="tq-foco tq-foco--fechado">
        <span className="tq-foco__marca tq-num" aria-hidden="true">{pos}º</span>
        <span className="tq-foco__nome"><strong><Icone nome="cadeado" tamanho={13} /> Assunto do assinante</strong><small className="tq-num">{t.area} · {num(t.pctEdicao)}% por prova</small></span>
      </li>
    )
    const d = desempenho(t)
    const feito = logado && d.feitas > 0
    const naOutra = lugarNaOutra?.get(t.nome)
    return (
      <li key={t.nome} className={'tq-foco' + (feito ? ' tq-foco--feito' : '')}>
        <span className="tq-foco__marca tq-num" aria-hidden="true">{pos}º</span>
        <span className="tq-foco__nome">
          <strong>{t.nome}{t.tendencia && <span className={`tq-tendencia tq-tendencia--${t.tendencia}`}>{t.tendencia === 'alta' ? 'em alta' : 'em queda'}</span>}</strong>
          <small className="tq-num">
            {num(t.pctEdicao)}% por prova · em {t.presenca} de {t.edicoes} {t.edicoes === 1 ? 'prova' : 'provas'} · {questoes(t.n)}
            {naOutra ? ` · ${naOutra}º no ${outra === 'teot' ? 'TEOT' : 'TARO'}` : ''}
            {feito ? <> · <span className="tq-foco__feito">você fez {num(d.feitas)}{d.acerto !== null ? `, ${d.acerto}% de acerto` : ''}</span></> : null}
          </small>
        </span>
        {acao(t)}
      </li>
    )
  }

  return (
    <div className="empilha-2 tq tq-mod">
      <section className="tq-heroi" aria-labelledby="tq-mod-titulo">
        <div className="tq-heroi__texto">
          <p className="tr-heroi__selo">Temas que mais caem · {m.curto}</p>
          <h1 id="tq-mod-titulo">{TITULO[m.id]}</h1>
          <p className="tq-heroi__lead">{m.descricao}</p>
          <p>Contamos as {questoes(ranking.amostra)} {m.id === 'mao-titulo' ? 'feitas a partir de' : 'de'} {ranking.edicoes.length} {ranking.edicoes.length === 1 ? 'prova' : 'provas'}{anoMin ? ` (${anoMin === anoMax ? anoMin : `${anoMin} a ${anoMax}`})` : ''} e separamos pelo assunto principal de cada uma. O ranking se atualiza sozinho quando entram questões novas.</p>
          {m.id === 'mao-titulo' && <p className="tq-heroi__previa"><Icone nome="alerta" tamanho={14} /><span><b>Questões no padrão da prova, não as oficiais.</b> Para cada questão da SBCM e do SIMÃO escrevemos uma nossa, no mesmo assunto. Elas mostram o que a prova cobrou; o SIMÃO é o simulado do exame, e o exame oficial é a SBCM.</span></p>}
        </div>
        {geral.fontes.length > 1 && (
          <div className="tq-fontes" role="group" aria-label="Provas contadas">
            <button type="button" aria-pressed={!fonte} onClick={() => definirFonte(null)}>{m.id === 'mao-titulo' ? 'SBCM e SIMÃO' : 'Todas as provas'}</button>
            {geral.fontes.map((f) => <button key={f} type="button" aria-pressed={fonte === f} onClick={() => definirFonte(f)}>{f}</button>)}
          </div>
        )}
      </section>

      <section className="tq-sugestao" aria-labelledby="tq-sug-titulo">
        <header className="tq-cabeca"><span className="px-numero" aria-hidden="true">1</span><div>
          <h2 id="tq-sug-titulo">{fezAlgo ? 'O que estudar agora' : 'Por onde começar'}</h2>
          <p className="texto-2">{fezAlgo ? 'Pesa o quanto o assunto cai, o quanto você erra e o quanto falta fazer.' : 'Os assuntos que mais pesam nesta prova.'}</p>
        </div></header>
        <ol className="tq-sugestao__lista">
          {sugeridos.map((t) => {
            const d = desempenho(t)
            return (
              <li key={t.nome}>
                <strong>{livre(t) ? t.nome : 'Assunto do assinante'}</strong>
                <small className="tq-num">{num(t.pctEdicao)}% por prova · em {t.presenca} de {t.edicoes}{fezAlgo && d.acerto !== null ? ` · você acerta ${d.acerto}%` : fezAlgo && !d.feitas ? ' · você ainda não fez' : ''}</small>
                {acao(t)}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="tq-explorar" aria-labelledby="tq-mod-areas">
        <div className="tq-grafico">
          <header className="tq-cabeca"><span className="px-numero" aria-hidden="true">2</span><div>
            <h2 id="tq-mod-areas">Grandes áreas</h2>
            <p className="texto-2">Quanto cada área ocupa das questões contadas. Toque para ver só os assuntos dela.</p>
          </div></header>
          <ol className="tq-barras">
            {ranking.areas.map((a, i) => (
              <li key={a.nome}>
                <button type="button" className={'tq-barra' + (area === a.nome ? ' tq-barra--atual' : '')} aria-pressed={area === a.nome} onClick={() => definirArea(area === a.nome ? null : a.nome)}>
                  <span className="tq-barra__lugar numerico">{i + 1}º</span>
                  <span className="tq-barra__nome"><strong>{a.nome}</strong><small className="tq-num">{questoes(a.n)}</small></span>
                  <span className="tq-barra__trilho" aria-hidden="true"><span className="tq-barra__marca" style={{ width: `${(a.pct / maxArea) * 100}%` }} /></span>
                  <span className="tq-barra__pct numerico">{num(a.pct)}%</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="tq-detalhe" aria-labelledby="tq-mod-ranking">
          <header className="tq-cabeca"><span className="px-numero" aria-hidden="true">3</span><div>
            <h2 id="tq-mod-ranking">{area ? area : 'Ranking dos assuntos'}</h2>
            <p className="texto-2">{area ? <button type="button" className="tq-link" onClick={() => definirArea(null)}>Ver todas as áreas</button> : 'Do que mais cai para o que menos cai. A porcentagem é a média por prova.'}</p>
          </div></header>
          {visiveis.map((g) => (
            <div key={g.n} className="tq-grupo">
              <div className="tq-grupo__cabeca"><span className={`tq-nivel tq-nivel--${g.n}`}>{ROTULO_NIVEL[g.n]}</span><small className="tq-num">{g.temas.length} {g.temas.length === 1 ? 'assunto' : 'assuntos'}</small></div>
              <ul className="tq-focos">{g.temas.map(linha)}</ul>
            </div>
          ))}
          {escondidos > 0 && <button type="button" className="tq-alternar tq-mais" onClick={() => definirTodos(true)}><Icone nome="baixo" tamanho={15} /> Ver os outros {escondidos} assuntos (prioridade média e baixa)</button>}
          {!aberto && <p className="tq-heroi__previa"><Icone nome="cadeado" tamanho={14} /><span><b>Prévia:</b> os {PREVIA} primeiros assuntos aparecem inteiros. Assinando, você vê todos e treina cada um. <a href={href('/assinatura')}>Conhecer os planos</a></span></p>}
          {logado && aberto && temas.length > 0 && <button type="button" className="botao tq-ouro tq-area__treinar" onClick={() => treinar(temas.flatMap((t) => t.ids), area, m)}><Icone nome="raio" tamanho={15} /> {area ? 'Treinar esta área' : 'Treinar os que mais caem'}</button>}
        </div>
      </section>

      <section className="tq-proximo" aria-label="Próximos passos">
        <a className="tq-proximo__cartao" href={href(cronograma)}>
          <IconePixel nome="planos" tamanho={44} />
          <span><strong>{m.grupo === 'mao' ? `Cronograma: ${m.curto.toLocaleLowerCase('pt-BR')}` : 'Siga esta ordem no cronograma'}</strong><small>Você coloca a data da prova e o tempo que tem; o plano começa pelo que mais cai e se ajusta ao seu desempenho.</small></span>
          <Icone nome="direita" tamanho={18} />
        </a>
      </section>

      <details className="tq-metodo">
        <summary>Como contamos</summary>
        <ul>
          <li><b>De onde vêm:</b> {m.origem}.</li>
          <li><b>Cada questão conta uma vez,</b> pelo assunto principal; cópias e anuladas ({num(ranking.anuladas)} nesta prova) não entram{ranking.semClassificacao ? `, nem ${questoes(ranking.semClassificacao)} ainda sem assunto` : ''}.</li>
          <li><b>Por prova:</b> a porcentagem é a média da fatia do assunto em cada prova, para uma prova maior não pesar mais que as outras.</li>
          <li><b>Em alta ou em queda:</b> só com três anos ou mais e cinco questões do assunto, comparando as duas edições mais recentes com as anteriores.</li>
          {m.grupo === 'mao' && <li><b>Ingresso e título não se misturam:</b> as provas de seleção para a residência e a prova de título têm rankings e cronogramas próprios.</li>}
          <li><b>Não é previsão:</b> é o que caiu nas provas que estão no acervo. Serve para decidir por onde começar; os assuntos de prioridade baixa também caem.</li>
        </ul>
      </details>
    </div>
  )
}
