import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usarIndice } from '../../dados/usarIndice'
import {
  ROTULO_MOTIVO, corDaNota, distribuicaoNotas, efeitoReescritas, faixaDaNota, mediaFormatada, motivosSomados,
  notaMaisComum, notasPorSemana, resumoGeral, saldoNotas, type FaixaNota, type NotaRecente, type ResumoNota,
} from '../../dados/notasComentario'
import { Barras, Ranking, Achado } from '../ui/graficos'
import { Icone } from '../ui/Icone'
import { inteiro } from '../ui/formato'
import { Estado, Metrica, Painel } from '../ui/kit'

/*
 * Painel das notas dos comentários (Tales, 14/11/2026: "um hub para avaliar essas questões de maneira bem criativa;
 * gosto bastante de dados e estatística"). Tudo sai de duas leituras que o painel já faz: o resumo por questão
 * (todas as notas) e as 500 notas mais recentes. Nada aqui gera aviso: aviso só para nota ruim.
 */

const COR_FAIXA: Record<FaixaNota, string> = { prioridade: 'var(--a3-erro)', atencao: 'var(--a3-aviso, #b7791f)', post: 'var(--a3-ok, #2f855a)', normal: 'var(--a3-cinza)' }
const ROTULO_PONTO: Record<FaixaNota, string> = { prioridade: 'Prioridade', atencao: 'Atenção', post: 'Sugestão de post', normal: 'Sem alerta' }
const dataCurta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const pct = (n: number, total: number) => total ? Math.round((n / total) * 100) : 0

export function HubNotas({ resumos, recentes, titulo, abrir }: {
  resumos: ResumoNota[]; recentes: NotaRecente[]; titulo: (id: string) => string; abrir: (id: string) => void
}) {
  const geral = useMemo(() => resumoGeral(resumos), [resumos])
  const dist = useMemo(() => distribuicaoNotas(recentes), [recentes])
  const saldo = saldoNotas(dist.contagem)
  const moda = notaMaisComum(dist.contagem)
  const semanas = useMemo(() => notasPorSemana(recentes, 12), [recentes])
  const motivos = useMemo(() => motivosSomados(resumos), [resumos])
  const reescritas = useMemo(() => efeitoReescritas(resumos), [resumos])
  const fas = dist.contagem[8] + dist.contagem[9]
  const ruins = dist.contagem.slice(0, 5).reduce((t, n) => t + n, 0)
  const faixas = useMemo(() => {
    const m: Record<FaixaNota, number> = { prioridade: 0, atencao: 0, post: 0, normal: 0 }
    for (const r of resumos) m[faixaDaNota(r)]++
    return m
  }, [resumos])

  if (!resumos.length && !recentes.length) return <Estado icone="estrela" titulo="Ainda não chegou nenhuma nota" texto="Quando os alunos derem nota aos comentários, a distribuição, a tendência e os destaques aparecem aqui." />

  return <div className="a3-pilha nh">
    <div className="a3-grade a3-grade--4 nh-kpis">
      <Metrica rotulo="Média geral" valor={geral.media === null ? null : mediaFormatada(geral.media)} unidade="de 10" qualidade="derivado" nota={`${inteiro(geral.notas)} notas em ${inteiro(geral.questoes)} questões`} />
      <Metrica rotulo="Saldo das notas" valor={saldo === null ? null : `${saldo > 0 ? '+' : ''}${saldo}`} qualidade="derivado" nota="% de 9 e 10 menos % de 1 a 6 (de -100 a +100)" />
      <Metrica rotulo="Notas 9 e 10" valor={`${pct(fas, dist.total)}%`} qualidade="derivado" nota={`${inteiro(fas)} das ${inteiro(dist.total)} recentes`} />
      <Metrica rotulo="Notas de 5 ou menos" valor={`${pct(ruins, dist.total)}%`} qualidade="derivado" nota={`${inteiro(ruins)} recentes; só estas avisam`} />
    </div>

    <div className="a3-grade a3-grade--2 nh-duas">
      <Painel titulo="Como as notas se distribuem" descricao={`As ${inteiro(dist.total)} notas mais recentes, na mesma régua que o aluno vê.${dist.semNota ? ` ${inteiro(dist.semNota)} avaliações antigas, sem nota, ficam de fora.` : ''}`}>
        <Regua contagem={dist.contagem} moda={moda} />
      </Painel>
      <Painel titulo="Semana a semana" descricao="Quantas notas chegaram e a média de cada semana (12 semanas). A cor do quadrado é a da média.">
        <Semanas semanas={semanas} />
      </Painel>
    </div>

    <Painel titulo="Mapa das questões" descricao="Cada ponto é uma questão: à direita, mais notas; no alto, média maior. Clique num ponto para abrir a questão no editor.">
      <Dispersao resumos={resumos} titulo={titulo} abrir={abrir} />
      <ul className="nh-legenda" aria-label="Legenda">
        {(['prioridade', 'atencao', 'post', 'normal'] as FaixaNota[]).map(f => <li key={f}><i style={{ background: COR_FAIXA[f] }} />{ROTULO_PONTO[f]} <b>{faixas[f]}</b></li>)}
      </ul>
    </Painel>

    <div className="a3-grade a3-grade--2 nh-duas">
      <Painel titulo="O que faltou, segundo quem deu nota baixa" descricao="Motivos marcados em todas as notas de 5 ou menos.">
        {motivos.length ? <Barras cor="ouro" total={motivos.reduce((t, [, n]) => t + n, 0)} itens={motivos.map(([m, n]) => ({ nome: ROTULO_MOTIVO[m] ?? m, valor: n }))} /> : <p className="a3-mudo">Ninguém marcou motivo ainda.</p>}
      </Painel>
      <Painel titulo="Efeito das reescritas" descricao="Média da versão anterior do comentário e da atual, nas questões reescritas depois de receber nota.">
        {reescritas.length ? <ul className="nh-antes-depois">{reescritas.slice(0, 8).map(r => <li key={r.id_questao}>
          <button type="button" onClick={() => abrir(r.id_questao)} title="Abrir no editor">
            <span className="nh-antes-depois__nome">{titulo(r.id_questao)}</span>
            <span className="nh-antes-depois__notas">
              <b style={{ color: corDaNota(r.antes) }}>{mediaFormatada(r.antes)}</b>
              <Icone nome="seta" tamanho={14} />
              <b style={{ color: corDaNota(r.depois) }}>{mediaFormatada(r.depois)}</b>
              <small className={r.ganho >= 0 ? 'nh-sobe' : 'nh-desce'}>{r.ganho >= 0 ? '+' : ''}{mediaFormatada(r.ganho)}</small>
            </span>
          </button></li>)}</ul> : <p className="a3-mudo">Quando um comentário com nota for reescrito, o antes e o depois aparecem aqui.</p>}
      </Painel>
    </div>

    <Achados resumos={resumos} dist={dist.contagem} moda={moda} semanas={semanas} titulo={titulo} />
    <PorTema resumos={resumos} />
  </div>
}

/** A régua do aluno, deitada: dez colunas coloridas do vermelho ao verde, a altura é a quantidade. */
function Regua({ contagem, moda }: { contagem: number[]; moda: number | null }) {
  const max = Math.max(1, ...contagem)
  const total = contagem.reduce((t, n) => t + n, 0)
  if (!total) return <p className="a3-mudo">Nenhuma nota de 1 a 10 ainda.</p>
  return <div className="nh-regua" role="img" aria-label={`Distribuição das notas: ${contagem.map((n, i) => `nota ${i + 1}: ${n}`).join(', ')}`}>
    {contagem.map((n, i) => <div key={i} className={'nh-regua__col' + (moda === i + 1 ? ' nh-regua__col--moda' : '')} style={{ '--h': `${(n / max) * 100}%`, '--c': corDaNota(i + 1) } as React.CSSProperties}>
      <span className="nh-regua__valor">{n || ''}</span>
      <span className="nh-regua__barra" />
      <span className="nh-regua__nota">{i + 1}</span>
      <span className="nh-regua__pct">{pct(n, total)}%</span>
    </div>)}
  </div>
}

/** Doze semanas: a coluna é a quantidade, o quadrado embaixo traz a média, na cor da régua. */
function Semanas({ semanas }: { semanas: ReturnType<typeof notasPorSemana> }) {
  const max = Math.max(1, ...semanas.map(s => s.n))
  if (!semanas.some(s => s.n)) return <p className="a3-mudo">Sem notas nas últimas 12 semanas.</p>
  return <div><div className="nh-semanas">
    {semanas.map((s, i) => <div key={i} className={'nh-semanas__col' + (i === semanas.length - 1 ? ' nh-semanas__col--atual' : '')} title={`Semana de ${dataCurta(s.inicio)}: ${s.n} notas${s.media !== null ? `, média ${mediaFormatada(s.media)}` : ''}${s.ruins ? `, ${s.ruins} de 5 ou menos` : ''}`}>
      <span className="nh-semanas__n">{s.n || ''}</span>
      <span className="nh-semanas__barra" style={{ height: `${(s.n / max) * 100}%` }}>{s.ruins ? <i style={{ height: `${(s.ruins / Math.max(1, s.n)) * 100}%` }} /> : null}</span>
      <span className="nh-semanas__media" style={{ background: s.media === null ? 'transparent' : corDaNota(s.media) }}>{s.media === null ? '·' : mediaFormatada(s.media)}</span>
      <span className="nh-semanas__data">{dataCurta(s.inicio)}</span>
    </div>)}
  </div><p className="nh-semanas__nota"><i /> parte vermelha da coluna: notas de 5 ou menos</p></div>
}

/** Dispersão: notas (escala raiz, para os poucos não se amontoarem) × média. Faixas de fundo: abaixo de 6 e 9 ou mais. */
function Dispersao({ resumos, titulo, abrir }: { resumos: ResumoNota[]; titulo: (id: string) => string; abrir: (id: string) => void }) {
  const [foco, definirFoco] = useState<ResumoNota | null>(null)
  // A largura real da caixa: no celular o desenho não encolhe, só fica mais estreito.
  const caixa = useRef<HTMLDivElement>(null)
  const [L, definirL] = useState(960)
  useLayoutEffect(() => {
    const el = caixa.current
    if (!el) return
    const medir = () => definirL(Math.max(280, Math.round(el.getBoundingClientRect().width)))
    medir()
    const ro = new ResizeObserver(medir); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const A = L < 600 ? 260 : 300, m = { e: 40, d: 14, t: 12, b: 40 }
  const maxN = Math.max(4, ...resumos.map(r => r.n))
  const x = (n: number) => m.e + (Math.sqrt(n - 1) / Math.sqrt(maxN - 1)) * (L - m.e - m.d)
  const y = (v: number) => m.t + ((10 - v) / 9) * (A - m.t - m.b)
  const marcas = [1, 2, 5, 10, 20, 50, 100, 200, 500].filter(n => n <= maxN)
  return <div className="nh-mapa" ref={caixa}>
    <svg viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Mapa das questões: notas por média">
      <rect x={m.e} y={y(10)} width={L - m.e - m.d} height={y(9) - y(10)} className="nh-mapa__boa" />
      <rect x={m.e} y={y(6)} width={L - m.e - m.d} height={y(1) - y(6)} className="nh-mapa__ruim" />
      {[1, 4, 6, 8, 10].map(v => <g key={v}><line x1={m.e} x2={L - m.d} y1={y(v)} y2={y(v)} className="nh-mapa__grade" /><text x={m.e - 8} y={y(v) + 4} textAnchor="end" className="nh-mapa__eixo">{v}</text></g>)}
      {marcas.map(n => <text key={n} x={x(n)} y={A - 22} textAnchor="middle" className="nh-mapa__eixo">{n}</text>)}
      <text x={(L + m.e) / 2} y={A - 4} textAnchor="middle" className="nh-mapa__titulo">número de notas</text>
      <text x={12} y={A / 2} textAnchor="middle" transform={`rotate(-90 12 ${A / 2})`} className="nh-mapa__titulo">média</text>
      {resumos.map(r => { const f = faixaDaNota(r); return <circle key={r.id_questao} cx={x(r.n)} cy={y(Number(r.media))} r={foco?.id_questao === r.id_questao ? 7 : 4.5}
        fill={COR_FAIXA[f]} className="nh-mapa__ponto" tabIndex={0} role="button" aria-label={`${titulo(r.id_questao)}: média ${mediaFormatada(r.media)}, ${r.n} notas`}
        onMouseEnter={() => definirFoco(r)} onFocus={() => definirFoco(r)} onClick={() => abrir(r.id_questao)} onKeyDown={e => { if (e.key === 'Enter') abrir(r.id_questao) }} /> })}
    </svg>
    <p className="nh-mapa__foco" aria-live="polite">{foco ? <><b>{titulo(foco.id_questao)}</b> · média {mediaFormatada(foco.media)} · {inteiro(foco.n)} {foco.n === 1 ? 'nota' : 'notas'} · de {foco.minima} a {foco.maxima}</> : 'Passe o mouse num ponto para ver a questão.'}</p>
  </div>
}

/** Conclusões em frase, calculadas dos números (sem opinião). */
function Achados({ resumos, dist, moda, semanas, titulo }: { resumos: ResumoNota[]; dist: number[]; moda: number | null; semanas: ReturnType<typeof notasPorSemana>; titulo: (id: string) => string }) {
  const total = dist.reduce((t, n) => t + n, 0)
  const comMedia = semanas.filter(s => s.media !== null)
  const ultima = comMedia[comMedia.length - 1], anterior = comMedia[comMedia.length - 2]
  const melhor = [...resumos].filter(r => r.n >= 3).sort((a, b) => Number(b.media) - Number(a.media) || b.n - a.n)[0]
  const pior = [...resumos].filter(r => r.n >= 3).sort((a, b) => Number(a.media) - Number(b.media) || b.n - a.n)[0]
  const espalhada = [...resumos].filter(r => r.n >= 3).sort((a, b) => Number(b.desvio) - Number(a.desvio))[0]
  const itens: Array<{ titulo: string; texto: React.ReactNode; tom: 'verde' | 'ouro' | 'claro'; icone: React.ReactNode }> = []
  if (moda && total) itens.push({ titulo: 'Nota mais dada', texto: <><b>{moda}</b>, em {pct(dist[moda - 1], total)}% das notas recentes.</>, tom: 'verde', icone: <Icone nome="estrela" tamanho={18} /> })
  if (ultima && anterior) { const d = (ultima.media ?? 0) - (anterior.media ?? 0); itens.push({ titulo: 'Tendência da semana', texto: <>Média <b>{mediaFormatada(ultima.media ?? 0)}</b>, {Math.abs(d) < 0.05 ? 'igual à semana anterior' : `${d > 0 ? 'subiu' : 'caiu'} ${mediaFormatada(Math.abs(d))} em relação à anterior`}.</>, tom: d >= 0 ? 'verde' : 'ouro', icone: <Icone nome="grafico" tamanho={18} /> }) }
  if (melhor) itens.push({ titulo: 'Comentário mais bem avaliado', texto: <><b>{titulo(melhor.id_questao)}</b>: média {mediaFormatada(melhor.media)} em {melhor.n} notas. Bom modelo e bom post.</>, tom: 'verde', icone: <Icone nome="certo" tamanho={18} /> })
  if (pior && pior !== melhor) itens.push({ titulo: 'Reescrever primeiro', texto: <><b>{titulo(pior.id_questao)}</b>: média {mediaFormatada(pior.media)} em {pior.n} notas.</>, tom: 'ouro', icone: <Icone nome="lapis" tamanho={18} /> })
  if (espalhada && Number(espalhada.desvio) >= 2.5) itens.push({ titulo: 'Divide opiniões', texto: <><b>{titulo(espalhada.id_questao)}</b>: notas de {espalhada.minima} a {espalhada.maxima}. Vale ler as mensagens.</>, tom: 'claro', icone: <Icone nome="alerta" tamanho={18} /> })
  if (!itens.length) return null
  return <div className="a3-grade a3-grade--3 nh-achados">{itens.map(i => <Achado key={i.titulo} titulo={i.titulo} tom={i.tom} icone={i.icone}>{i.texto}</Achado>)}</div>
}

/** Média das notas por tema: onde o padrão dos comentários caiu. Só temas com 5 notas ou mais. */
export function PorTema({ resumos }: { resumos: ResumoNota[] }) {
  const { indice } = usarIndice()
  const temas = useMemo(() => {
    if (!indice) return []
    const temaDe = new Map(indice.questoes.map(q => [q.id, q.t]))
    const soma = new Map<number, { total: number; n: number; questoes: number }>()
    for (const r of resumos) { const t = temaDe.get(r.id_questao); if (t === undefined) continue; const x = soma.get(t) ?? { total: 0, n: 0, questoes: 0 }; x.total += Number(r.media) * r.n; x.n += r.n; x.questoes++; soma.set(t, x) }
    return [...soma].filter(([, v]) => v.n >= 5).map(([t, v]) => ({ nome: indice.temas[t]?.nome ?? String(t), media: v.total / v.n, n: v.n, questoes: v.questoes })).sort((a, b) => a.media - b.media)
  }, [indice, resumos])
  return <Painel titulo="Média das notas por tema" descricao="Da menor para a maior; só temas com 5 notas ou mais.">
    {!indice ? <p className="a3-mudo">Carregando os temas…</p> : temas.length === 0 ? <Estado compacto titulo="Ainda não há notas suficientes por tema" /> :
      <Ranking formato={v => mediaFormatada(v)} itens={temas.map(t => ({ nome: t.nome, valor: Math.round(t.media * 10) / 10, detalhe: `${inteiro(t.n)} notas · ${t.questoes} questões` }))} />}
  </Painel>
}
