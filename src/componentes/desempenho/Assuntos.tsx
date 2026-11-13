import { useMemo, useState, type CSSProperties } from 'react'
import { Icone } from '../Icone'
import { href } from '../../util/rotas'
import { usarLargura } from '../GraficosDesempenho'
import { AREAS } from '../../dados/incidencia'
import { intervalo, MINIMO_LEITURA, type ComparacaoTurma, type LinhaAssunto, type ResumoIndicado } from '../../dados/desempenho'

/*
 * Aba Assuntos (14/11/2026): a mesma informação de dois jeitos. Tabela: tema → assunto, com acerto de primeira
 * (com a margem e "poucos dados" abaixo de 10 respostas), quanto do acervo já viu, tendência dos últimos 30 dias,
 * erros pendentes, a turma (assinantes) e os atalhos para treinar e ler o resumo. Mapa: quanto o tema cai na prova
 * contra o seu acerto, com o canto "cai muito e você erra" em destaque.
 */

type Ordem = 'prioridade' | 'piora' | 'acerto' | 'respondidas' | 'incidencia'
const ORDENS: Array<[Ordem, string]> = [['prioridade', 'Prioridade para a prova'], ['piora', 'Piora recente'], ['acerto', 'Menor acerto'], ['respondidas', 'Mais respondidas'], ['incidencia', 'Mais cai na prova']]
const nomeNoAcervo = new Map<string, string>()
for (const a of AREAS) for (const f of a.focos) nomeNoAcervo.set(`${a.slug}|${f.nome}`, f.noAcervo ?? f.nome)

function ordenar(lista: LinhaAssunto[], ordem: Ordem) {
  const acerto = (l: LinhaAssunto) => (l.n ? l.certas / l.n : 2)
  const f: Record<Ordem, (a: LinhaAssunto, b: LinhaAssunto) => number> = {
    prioridade: (a, b) => b.prioridade - a.prioridade || b.incidencia - a.incidencia,
    piora: (a, b) => (a.tendencia ?? 999) - (b.tendencia ?? 999),
    acerto: (a, b) => acerto(a) - acerto(b) || b.n - a.n,
    respondidas: (a, b) => b.respondidas - a.respondidas,
    incidencia: (a, b) => b.incidencia - a.incidencia,
  }
  return [...lista].sort(f[ordem])
}

/** Barra de acerto com a faixa da margem (95%) por trás; apagada com poucos dados. */
export function BarraAcerto({ certas, n }: { certas: number; n: number }) {
  if (!n) return <span className="as-barra as-barra--vazia">sem respostas</span>
  const p = Math.round((certas / n) * 100)
  const [lo, hi] = intervalo(certas, n)
  const pouco = n < MINIMO_LEITURA
  return (
    <span className={'as-barra' + (pouco ? ' as-barra--pouco' : '')} title={`${certas} de ${n} certas · margem de ${Math.round(lo * 100)}% a ${Math.round(hi * 100)}%`}>
      <span className="as-barra__trilho" aria-hidden="true">
        <i className="as-barra__margem" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />
        <i className="as-barra__valor" style={{ width: `${p}%` }} />
      </span>
      <b className="ds-num">{p}%</b>
      {pouco && <small>poucos dados</small>}
    </span>
  )
}

function Tendencia({ v }: { v: number | null }) {
  if (v === null) return <span className="as-tend as-tend--nada" title="Precisa de 5 respostas nos últimos 30 dias e 5 antes">–</span>
  return <span className={'as-tend ds-num' + (v > 2 ? ' as-tend--sobe' : v < -2 ? ' as-tend--desce' : '')}>{v > 0 ? '▲' : v < 0 ? '▼' : '='} {Math.abs(v)}</span>
}

export function Assuntos({ temas, assuntos, turma, resumos }: {
  temas: LinhaAssunto[]; assuntos: LinhaAssunto[]; turma: ComparacaoTurma | null; resumos: Map<string, ResumoIndicado>
}) {
  const [vista, definirVista] = useState<'tabela' | 'mapa'>('tabela')
  const [ordem, definirOrdem] = useState<Ordem>('prioridade')
  const [aberto, definirAberto] = useState<string | null>(null)
  const linhas = useMemo(() => ordenar(temas.filter((t) => t.noAcervo > 0), ordem), [temas, ordem])
  const filhos = useMemo(() => {
    const m = new Map<string, LinhaAssunto[]>()
    for (const a of assuntos) { if (!a.respondidas && !a.incidencia) continue; const l = m.get(a.tema) ?? []; l.push(a); m.set(a.tema, l) }
    for (const [k, l] of m) m.set(k, ordenar(l, ordem).slice(0, 14))
    return m
  }, [assuntos, ordem])

  return (
    <section className={'ds-cartao as' + (turma ? ' as--turma' : '')} aria-labelledby="as-titulo">
      <div className="ds-cartao__cabeca ds-cartao__cabeca--linha">
        <div>
          <h3 id="as-titulo">Tema por tema, assunto por assunto</h3>
          <p>Acerto de primeira vez. A faixa clara é a margem: com poucas respostas ela é larga, e o número ainda é uma pista.</p>
        </div>
        <div className="ds-seg ds-seg--mini seletor" role="group" aria-label="Ver como">
          <button type="button" aria-pressed={vista === 'tabela'} onClick={() => definirVista('tabela')}><Icone nome="menu" tamanho={14} /> Tabela</button>
          <button type="button" aria-pressed={vista === 'mapa'} onClick={() => definirVista('mapa')}><Icone nome="mapa" tamanho={14} /> Mapa</button>
        </div>
      </div>

      {vista === 'mapa' ? <MapaPrioridades temas={temas} assuntos={assuntos} /> : <>
        <label className="as-ordem">Ordenar por
          <select className="entrada" value={ordem} onChange={(e) => definirOrdem(e.target.value as Ordem)}>{ORDENS.map(([o, r]) => <option key={o} value={o}>{r}</option>)}</select>
        </label>
        <div className="as-tabela" role="table" aria-label="Desempenho por tema e assunto">
          <div className="as-linha as-linha--cabeca" role="row">
            <span role="columnheader">Tema</span><span role="columnheader">Acerto</span><span role="columnheader">Visto do acervo</span>
            <span role="columnheader" title="Últimos 30 dias contra antes">Tendência</span><span role="columnheader">Erros a refazer</span>
            {turma && <span role="columnheader">Turma</span>}<span role="columnheader"><span className="so-leitor">Ações</span></span>
          </div>
          {linhas.map((l) => {
            const t = turma?.porTema.get(l.tema)
            const sub = filhos.get(l.tema) ?? []
            const resumo = resumos.get(l.tema)
            const estaAberto = aberto === l.tema
            return <div key={l.chave} className={'as-grupo' + (estaAberto ? ' as-grupo--aberto' : '')} role="rowgroup">
              <div className="as-linha" role="row" style={{ '--prio': Math.min(1, l.prioridade / 40) } as CSSProperties}>
                <span role="cell" className="as-nome">
                  <button type="button" aria-expanded={estaAberto} onClick={() => definirAberto(estaAberto ? null : l.tema)} disabled={!sub.length}>
                    <Icone nome={estaAberto ? 'baixo' : 'direita'} tamanho={14} /> {l.nome}
                  </button>
                  {l.prioridade >= 20 && <span className="as-selo">prioridade</span>}
                </span>
                <span role="cell" data-rotulo="Acerto"><BarraAcerto certas={l.certas} n={l.n} /></span>
                <span role="cell" data-rotulo="Visto do acervo" className="ds-num">{l.respondidas} <small>de {l.noAcervo} · {Math.round((l.respondidas / Math.max(1, l.noAcervo)) * 100)}%</small></span>
                <span role="cell" data-rotulo="Tendência"><Tendencia v={l.tendencia} /></span>
                <span role="cell" data-rotulo="Erros a refazer" className="ds-num">{l.pendentes ? <a href={href(`/treinar?temas=${l.tema}&situacao=erradas&limite=${Math.min(20, l.pendentes)}`)}>{l.pendentes}</a> : '0'}</span>
                {turma && <span role="cell" data-rotulo="Turma" className="ds-num">{t && t.n >= MINIMO_LEITURA ? <span className={t.voce >= t.turma ? 'as-tend--sobe' : 'as-tend--desce'}>{t.voce >= t.turma ? '+' : ''}{Math.round(((t.voce - t.turma) / t.n) * 100)}</span> : '–'}</span>}
                <span role="cell" className="as-acoes">
                  <a href={href(`/treinar?temas=${l.tema}&limite=10`)} aria-label={`Treinar ${l.nome}`}><Icone nome="alvo" tamanho={15} /> Treinar</a>
                  {resumo && <a href={href(`/resumos/${resumo.capitulo.id}`)} title={resumo.capitulo.titulo}><Icone nome="livro" tamanho={15} /> Resumo</a>}
                </span>
              </div>
              {estaAberto && sub.map((a) => {
                const sub2 = nomeNoAcervo.get(a.chave) ?? a.nome
                return <div key={a.chave} className="as-linha as-linha--assunto" role="row">
                  <span role="cell" className="as-nome"><span>{a.nome}</span>{a.incidencia > 0 && <small className="as-inc">{a.incidencia} na prova</small>}</span>
                  <span role="cell" data-rotulo="Acerto"><BarraAcerto certas={a.certas} n={a.n} /></span>
                  <span role="cell" data-rotulo="Visto do acervo" className="ds-num">{a.respondidas} <small>de {a.noAcervo}</small></span>
                  <span role="cell" data-rotulo="Tendência"><Tendencia v={a.tendencia} /></span>
                  <span role="cell" data-rotulo="Erros a refazer" className="ds-num">{a.pendentes}</span>
                  {turma && <span role="cell" />}
                  <span role="cell" className="as-acoes">
                    <a href={href(`/treinar?temas=${a.tema}&subtemas=${encodeURIComponent(sub2)}&limite=10`)} aria-label={`Treinar ${a.nome}`}><Icone nome="alvo" tamanho={15} /> Treinar</a>
                  </span>
                </div>
              })}
            </div>
          })}
        </div>
      </>}
    </section>
  )
}

/** Quanto cai na prova (x) contra o seu acerto de primeira (y). O canto de baixo à direita é a prioridade. */
function MapaPrioridades({ temas, assuntos }: { temas: LinhaAssunto[]; assuntos: LinhaAssunto[] }) {
  const [nivel, definirNivel] = useState<'temas' | 'assuntos'>('temas')
  const [foco, definirFoco] = useState<LinhaAssunto | null>(null)
  const [ref, L] = usarLargura<HTMLDivElement>(640)
  const pontos = (nivel === 'temas' ? temas : assuntos).filter((l) => l.n >= 3 && l.incidencia > 0)
  const A = L < 520 ? 280 : 320, m = { e: 44, d: 16, t: 14, b: 40 }
  const maxX = Math.max(1, ...pontos.map((p) => p.incidencia))
  const x = (v: number) => m.e + (Math.sqrt(v) / Math.sqrt(maxX)) * (L - m.e - m.d)
  // O eixo do acerto começa um pouco abaixo do menor ponto (múltiplo de 10%), para os círculos não ficarem espremidos.
  const piso = Math.max(0, Math.floor((Math.min(0.5, ...pontos.map((p) => p.certas / p.n)) - 0.1) * 10) / 10)
  const y = (v: number) => m.t + ((1 - v) / (1 - piso)) * (A - m.t - m.b)
  const grade = [piso, (piso + 1) / 2, 1]
  const r = (n: number) => Math.min(16, 4 + Math.sqrt(n) * 1.1)
  const meioX = x(maxX * 0.25), meioY = y(0.6)
  return (
    <div className="mp" ref={ref}>
      <div className="mp__topo">
        <p>Cada círculo é um {nivel === 'temas' ? 'tema' : 'assunto'}: para a direita, cai mais na prova; para cima, você acerta mais. O tamanho é quantas respostas você deu. O canto vermelho é onde estudar primeiro.</p>
        <div className="ds-seg ds-seg--mini seletor" role="group" aria-label="Nível do mapa">
          <button type="button" aria-pressed={nivel === 'temas'} onClick={() => definirNivel('temas')}>Temas</button>
          <button type="button" aria-pressed={nivel === 'assuntos'} onClick={() => definirNivel('assuntos')}>Assuntos</button>
        </div>
      </div>
      {pontos.length < 2 ? <p className="ds-vazio">Responda algumas questões em temas diferentes para o mapa aparecer.</p> :
        <svg viewBox={`0 0 ${L} ${A}`} width={L} height={A} role="img" aria-label={`Mapa de prioridades dos ${nivel}`}>
          <rect x={meioX} y={meioY} width={L - m.d - meioX} height={A - m.b - meioY} className="mp__alvo" />
          <text x={L - m.d - 8} y={A - m.b - 8} textAnchor="end" className="mp__alvo-texto">cai muito e você erra</text>
          {grade.map((v) => <g key={v}><line x1={m.e} x2={L - m.d} y1={y(v)} y2={y(v)} className="ds-grafico__grade" /><text x={m.e - 6} y={y(v) + 4} textAnchor="end" className="ds-grafico__tique">{Math.round(v * 100)}%</text></g>)}
          <line x1={m.e} x2={L - m.d} y1={A - m.b} y2={A - m.b} className="ds-grafico__base" />
          <text x={(L + m.e) / 2} y={A - 8} textAnchor="middle" className="mp__eixo">quanto cai na prova →</text>
          {pontos.sort((a, b) => b.n - a.n).map((p) => {
            const ac = p.certas / p.n
            const tom = ac < 0.5 ? 'ruim' : ac < 0.7 ? 'medio' : 'bom'
            return <circle key={p.chave} cx={x(p.incidencia)} cy={y(ac)} r={r(p.n)} className={`mp__ponto mp__ponto--${tom}` + (foco?.chave === p.chave ? ' mp__ponto--foco' : '')}
              tabIndex={0} role="button" aria-label={`${p.nome}: ${Math.round(ac * 100)}% de acerto, ${p.incidencia} questões na prova`}
              onMouseEnter={() => definirFoco(p)} onFocus={() => definirFoco(p)}
              onClick={() => { location.hash = href(`/treinar?temas=${p.tema}&limite=10`) }} onKeyDown={(e) => { if (e.key === 'Enter') location.hash = href(`/treinar?temas=${p.tema}&limite=10`) }} />
          })}
          {nivel === 'temas' && pontos.filter((p) => p.chave !== foco?.chave).map((p) => <text key={`t${p.chave}`} x={Math.min(L - m.d - 4, Math.max(m.e + 4, x(p.incidencia)))} y={y(p.certas / p.n) + r(p.n) + 13} textAnchor="middle" className="mp__nome">{p.nome.length > 22 ? p.nome.slice(0, 20) + '…' : p.nome}</text>)}
          {foco && <text x={Math.min(L - m.d - 4, Math.max(m.e + 4, x(foco.incidencia)))} y={Math.max(12, y(foco.certas / foco.n) - r(foco.n) - 6)} textAnchor="middle" className="mp__rotulo">{foco.nome}</text>}
        </svg>}
      <p className="ds-grafico__leitura" aria-live="polite">{foco ? `${foco.nome}: ${Math.round((foco.certas / foco.n) * 100)}% de acerto em ${foco.n} respostas · ${foco.incidencia} questões nas provas oficiais. Clique para treinar.` : 'Passe o mouse ou o foco num círculo para ver o nome.'}</p>
    </div>
  )
}
