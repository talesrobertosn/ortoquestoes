import { useMemo } from 'react'
import type { Indice } from '../dados/tipos'
import type { RegistroQuestao } from '../estado/revisao'
import { calcularStreak } from '../estado/streak'
import { lerProvas, rotuloProva, type ProvaInteresse } from '../conta/perfilEstudo'
import { href } from '../util/rotas'
import { Icone } from './Icone'

interface Evento { id: string; em: number; correta: boolean | null }

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const SEMANA_MS = 7 * 86_400_000
const pctDe = (parte: number, todo: number) => (todo ? Math.round((100 * parte) / todo) : null)
const faixa = (p: number) => (p >= 70 ? 'bom' : p >= 50 ? 'medio' : 'baixo')
const n = (v: number) => v.toLocaleString('pt-BR')

/** Provas de preparação que contam tanto para o TEOT quanto para o TARO (origem a confirmar e CET-PR). */
const PROVAS_GERAIS = ['TEOT/TARO', 'CET-PR']

/** Grupos de prova do acervo, com o que cada prova de interesse do perfil inclui. */
const GRUPOS: Array<{ id: string; rotulo: string; interesse: ProvaInteresse[]; pertence: (prova: string, area?: string) => boolean }> = [
  { id: 'taro', rotulo: 'TARO', interesse: ['taro'], pertence: (p, a) => !a && (p === 'TARO' || PROVAS_GERAIS.includes(p)) },
  { id: 'teot', rotulo: 'TEOT', interesse: ['teot'], pertence: (p, a) => !a && (p === 'TEOT' || PROVAS_GERAIS.includes(p)) },
  { id: 'mao', rotulo: 'Cirurgia da mão', interesse: ['mao'], pertence: (_p, a) => a === 'mao' },
  { id: 'r4', rotulo: 'R4, fellowship e outras provas', interesse: ['r4'], pertence: (p, a) => a === 'coluna' || a === 'enare' || a === 'quadril' || (!a && !['TARO', 'TEOT', ...PROVAS_GERAIS].includes(p)) },
]

/**
 * Estatísticas a mais no desempenho: evolução semanal, resultado por prova
 * (com destaque para a prova de interesse do perfil), primeira tentativa
 * contra revisão, questões recuperadas, dia da semana e quanto do acervo
 * já foi visto. Tudo calculado no aparelho, a partir do histórico de respostas.
 */
export function DesempenhoDetalhado({ indice, marcadas, limite, meta }: {
  indice: Indice | null
  marcadas: Record<string, RegistroQuestao>
  limite: number
  meta?: Record<string, unknown>
}) {
  const interesse = lerProvas(meta?.provas_interesse)
  const d = useMemo(() => {
    const infoPorId = new Map<string, { prova: string; area?: string }>()
    let validas = 0
    if (indice) for (const q of indice.questoes) {
      if (q.an || q.dup) continue
      validas++
      infoPorId.set(q.id, { prova: q.p === null ? '' : indice.provas[q.p] ?? '', area: q.ar })
    }
    // Eventos do período; a primeira tentativa de cada questão é a primeira de sempre (não a do período).
    const eventos: Array<Evento & { primeira: boolean }> = []
    let recuperadas = 0, comErro = 0
    for (const [id, registro] of Object.entries(marcadas)) {
      const historico = (registro.historico?.length ? registro.historico : registro.q ? [{ em: registro.q, correta: registro.c }] : []).slice().sort((a, b) => a.em - b.em)
      historico.forEach((e, i) => { if (e.em >= limite) eventos.push({ id, em: e.em, correta: e.correta, primeira: i === 0 && (registro.tentativas ?? 1) <= historico.length }) })
      const errou = historico.findIndex(e => e.correta === false)
      if (errou >= 0) { comErro++; if (historico.slice(errou + 1).some(e => e.correta === true)) recuperadas++ }
    }
    const contadas = eventos.filter(e => e.correta !== null)
    const certas = contadas.filter(e => e.correta).length
    const primeiras = contadas.filter(e => e.primeira), repetidas = contadas.filter(e => !e.primeira)

    // Últimas 8 semanas (a atual por último).
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const inicioSemanaAtual = hoje.getTime() - ((hoje.getDay() + 6) % 7) * 86_400_000
    const semanas = Array.from({ length: 8 }, (_, i) => {
      const inicio = inicioSemanaAtual - (7 - i) * SEMANA_MS
      const daqui = contadas.filter(e => e.em >= inicio && e.em < inicio + SEMANA_MS)
      return { inicio, total: daqui.length, certas: daqui.filter(e => e.correta).length, dias: new Set(daqui.map(e => new Date(e.em).toDateString())).size }
    })

    const porDia = DIAS.map(() => ({ total: 0, certas: 0 }))
    for (const e of contadas) { const g = porDia[new Date(e.em).getDay()]; g.total++; if (e.correta) g.certas++ }

    const grupos = GRUPOS.map(g => {
      const ids = [...infoPorId].filter(([, info]) => g.pertence(info.prova, info.area)).map(([id]) => id)
      const doGrupo = new Set(ids)
      const ev = contadas.filter(e => doGrupo.has(e.id))
      const vistas = ids.filter(id => marcadas[id]).length
      return { ...g, total: ids.length, vistas, respostas: ev.length, certas: ev.filter(e => e.correta).length, meu: g.interesse.some(i => interesse.includes(i)) }
    }).filter(g => g.total > 0)

    const dias28 = new Set(contadas.filter(e => e.em >= hoje.getTime() - 27 * 86_400_000).map(e => new Date(e.em).toDateString())).size
    const respostas28 = contadas.filter(e => e.em >= hoje.getTime() - 27 * 86_400_000).length
    const vistasTotal = [...infoPorId.keys()].filter(id => marcadas[id]).length
    const streak = calcularStreak(marcadas)
    return {
      total: contadas.length, certas, primeiras, repetidas, recuperadas, comErro, semanas, porDia, grupos,
      dias28, respostas28, vistasTotal, validas, streak,
    }
  }, [indice, marcadas, limite, interesse.join(',')])

  if (!d.total) return null
  const acertoPrimeira = pctDe(d.primeiras.filter(e => e.correta).length, d.primeiras.length)
  const acertoRevisao = pctDe(d.repetidas.filter(e => e.correta).length, d.repetidas.length)
  const melhorDia = d.porDia.map((g, i) => ({ ...g, i })).filter(g => g.total >= 10).sort((a, b) => b.certas / b.total - a.certas / a.total)[0]
  const diaMaisAtivo = d.porDia.map((g, i) => ({ ...g, i })).sort((a, b) => b.total - a.total)[0]
  const maiorSemana = Math.max(1, ...d.semanas.map(s => s.total))
  const meu = d.grupos.find(g => g.meu)

  return (
    <>
      <section className="cartao cartao__corpo dp-cartao">
        <div className="dp-cartao__cabeca"><div><h2>Seus números</h2><p className="texto-2">No período escolhido, a partir do histórico de cada questão.</p></div></div>
        <div className="dp-kpis">
          <div className="dp-kpi"><span>Acerto na 1ª tentativa</span><strong>{acertoPrimeira === null ? '–' : `${acertoPrimeira}%`}</strong><small>{n(d.primeiras.length)} questões vistas pela primeira vez</small></div>
          <div className="dp-kpi"><span>Acerto nas revisões</span><strong>{acertoRevisao === null ? '–' : `${acertoRevisao}%`}</strong><small>{acertoRevisao !== null && acertoPrimeira !== null ? `${acertoRevisao >= acertoPrimeira ? '+' : ''}${acertoRevisao - acertoPrimeira} pontos sobre a 1ª vez` : `${n(d.repetidas.length)} respostas repetidas`}</small></div>
          <div className="dp-kpi"><span>Erros recuperados</span><strong>{pctDe(d.recuperadas, d.comErro) ?? 0}%</strong><small>{n(d.recuperadas)} de {n(d.comErro)} questões que você errou já foram acertadas depois</small></div>
          <div className="dp-kpi"><span>Acervo visto</span><strong>{pctDe(d.vistasTotal, d.validas) ?? 0}%</strong><small>{n(d.vistasTotal)} de {n(d.validas)} questões</small></div>
          <div className="dp-kpi"><span>Ritmo</span><strong>{d.dias28 ? n(Math.round(d.respostas28 / d.dias28)) : 0}</strong><small>questões por dia de estudo (últimas 4 semanas, {d.dias28} dia(s))</small></div>
          <div className="dp-kpi"><span>Sequência</span><strong>{d.streak.atual} {d.streak.atual === 1 ? 'dia' : 'dias'}</strong><small>recorde de {d.streak.recorde} {d.streak.recorde === 1 ? 'dia' : 'dias'}</small></div>
          {diaMaisAtivo?.total > 0 && <div className="dp-kpi"><span>Dia que mais estuda</span><strong>{DIAS[diaMaisAtivo.i]}</strong><small>{pctDe(diaMaisAtivo.total, d.total)}% das suas respostas</small></div>}
          {melhorDia && <div className="dp-kpi"><span>Dia de melhor acerto</span><strong>{DIAS[melhorDia.i]}</strong><small>{pctDe(melhorDia.certas, melhorDia.total)}% de acerto em {n(melhorDia.total)} respostas</small></div>}
        </div>
      </section>

      <div className="dp-duas">
        <section className="cartao cartao__corpo dp-cartao">
          <div className="dp-cartao__cabeca"><div><h2>Semana a semana</h2><p className="texto-2">Últimas 8 semanas: respostas, dias de estudo e acerto.</p></div></div>
          <div className="rolagem-x"><table className="tabela dp-tabela">
            <thead><tr><th scope="col">Semana</th><th scope="col" className="numerico">Respostas</th><th scope="col" className="numerico">Dias</th><th scope="col">Acerto</th></tr></thead>
            <tbody>{[...d.semanas].reverse().map((s, i, lista) => {
              const p = pctDe(s.certas, s.total)
              const anterior = lista[i + 1] ? pctDe(lista[i + 1].certas, lista[i + 1].total) : null
              return <tr key={s.inicio}>
                <th scope="row">{i === 0 ? 'Esta semana' : new Date(s.inicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</th>
                <td className="numerico"><span className="dp-mini-barra" style={{ width: `${(s.total / maiorSemana) * 100}%` }} aria-hidden="true" />{n(s.total)}</td>
                <td className="numerico">{s.dias}</td>
                <td>{p === null ? '–' : <span className={`dp-texto--${faixa(p)}`}><strong>{p}%</strong>{anterior !== null && p !== anterior && <small className="dp-variacao"> {p > anterior ? '▲' : '▼'} {Math.abs(p - anterior)}</small>}</span>}</td>
              </tr>
            })}</tbody>
          </table></div>
        </section>

        <section className="cartao cartao__corpo dp-cartao">
          <div className="dp-cartao__cabeca"><div><h2>Por prova</h2><p className="texto-2">{meu ? <>Sua prova de interesse ({interesse.map(rotuloProva).join(', ')}) aparece em destaque.</> : <>Marque sua prova em <a href={href('/conta?secao=perfil')}>Minha conta › Perfil</a> para ver o destaque.</>}</p></div></div>
          <ul className="dp-provas">
            {d.grupos.map(g => {
              const p = pctDe(g.certas, g.respostas)
              const visto = pctDe(g.vistas, g.total) ?? 0
              return <li key={g.id} className={g.meu ? 'dp-prova dp-prova--minha' : 'dp-prova'}>
                <div className="dp-prova__topo"><strong>{g.rotulo}{g.meu && <span className="dp-prova__selo"><Icone nome="alvo" tamanho={12} /> sua prova</span>}</strong><span className={p === null ? '' : `dp-texto--${faixa(p)}`}>{p === null ? 'sem respostas' : `${p}% de acerto`}</span></div>
                <span className="dp-tema__trilho" aria-hidden="true"><span className="dp-faixa--bom" style={{ width: `${visto}%` }} /></span>
                <small>{n(g.vistas)} de {n(g.total)} questões vistas ({visto}%) · {n(g.respostas)} respostas no período</small>
              </li>
            })}
          </ul>
        </section>
      </div>

      <section className="cartao cartao__corpo dp-cartao">
        <div className="dp-cartao__cabeca"><div><h2>Dia da semana</h2><p className="texto-2">A altura da barra é quanto você responde (o número em cima); embaixo, o acerto do dia.</p></div></div>
        <div className="dp-semana">
          {d.porDia.map((g, i) => {
            const p = pctDe(g.certas, g.total)
            const maior = Math.max(1, ...d.porDia.map(x => x.total))
            return <div key={i} className="dp-semana__dia" title={`${DIAS[i]}: ${n(g.total)} respostas${p === null ? '' : `, ${p}% de acerto`}`}>
              <small className="dp-semana__total numerico">{n(g.total)}</small>
              <span className="dp-semana__barra"><span className={p === null ? '' : `dp-faixa--${faixa(p)}`} style={{ height: `${g.total ? Math.max(6, (g.total / maior) * 100) : 0}%` }} /></span>
              <strong>{p === null ? '–' : `${p}%`}</strong>
              <small>{DIAS[i].slice(0, 3)}</small>
            </div>
          })}
        </div>
      </section>
    </>
  )
}
