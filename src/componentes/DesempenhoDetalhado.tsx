import { useMemo } from 'react'
import type { Indice } from '../dados/tipos'
import type { RegistroQuestao } from '../estado/revisao'
import { calcularStreak } from '../estado/streak'
import { lerProvas, rotuloProva, type ProvaInteresse } from '../conta/perfilEstudo'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { GraficoColunas, GraficoLinha, Medidor } from './GraficosDesempenho'
import { FUSO_DIA, chaveDoDia, diaDaSemana, hojeBR, inicioDaChave, somarDias } from '../util/dia'

interface Evento { id: string; em: number; correta: boolean | null }

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const pctDe = (parte: number, todo: number) => (todo ? Math.round((100 * parte) / todo) : null)
const n = (v: number) => v.toLocaleString('pt-BR')
const dataCurta = (em: number) => new Date(em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO_DIA })

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
 * A página distribui as partes em capítulos (onde você está, como evoluiu).
 */
export function usarDetalhes({ indice, marcadas, limite, meta }: {
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

    // Últimas 8 semanas (a atual por último), em dias de São Paulo (src/util/dia.ts).
    const hoje = hojeBR()
    const segundaAtual = somarDias(hoje, -((diaDaSemana(hoje) + 6) % 7))
    const semanas = Array.from({ length: 8 }, (_, i) => {
      const segunda = somarDias(segundaAtual, -(7 - i) * 7)
      const inicio = inicioDaChave(segunda), fim = inicioDaChave(somarDias(segunda, 7))
      const daqui = contadas.filter(e => e.em >= inicio && e.em < fim)
      return { inicio, total: daqui.length, certas: daqui.filter(e => e.correta).length, dias: new Set(daqui.map(e => chaveDoDia(e.em))).size }
    })

    const porDia = DIAS.map(() => ({ total: 0, certas: 0 }))
    for (const e of contadas) { const g = porDia[diaDaSemana(e.em)]; g.total++; if (e.correta) g.certas++ }

    const grupos = GRUPOS.map(g => {
      const ids = [...infoPorId].filter(([, info]) => g.pertence(info.prova, info.area)).map(([id]) => id)
      const doGrupo = new Set(ids)
      const ev = contadas.filter(e => doGrupo.has(e.id))
      const vistas = ids.filter(id => marcadas[id]).length
      return { ...g, total: ids.length, vistas, respostas: ev.length, certas: ev.filter(e => e.correta).length, meu: g.interesse.some(i => interesse.includes(i)) }
    }).filter(g => g.total > 0)

    const inicio28 = inicioDaChave(somarDias(hoje, -27))
    const dias28 = new Set(contadas.filter(e => e.em >= inicio28).map(e => chaveDoDia(e.em))).size
    const respostas28 = contadas.filter(e => e.em >= inicio28).length
    const vistasTotal = [...infoPorId.keys()].filter(id => marcadas[id]).length
    const streak = calcularStreak(marcadas)
    return {
      total: contadas.length, certas, primeiras, repetidas, recuperadas, comErro, semanas, porDia, grupos,
      dias28, respostas28, vistasTotal, validas, streak,
    }
  }, [indice, marcadas, limite, interesse.join(',')])
  return { d, interesse }
}

export type Detalhes = ReturnType<typeof usarDetalhes>

/** Os números de estudo: primeira tentativa, revisão, recuperação, acervo visto, ritmo e dias. */
export function DetalhesNumeros({ detalhes: { d } }: { detalhes: Detalhes }) {
  if (!d.total) return null
  const acertoPrimeira = pctDe(d.primeiras.filter(e => e.correta).length, d.primeiras.length)
  const acertoRevisao = pctDe(d.repetidas.filter(e => e.correta).length, d.repetidas.length)
  const melhorDia = d.porDia.map((g, i) => ({ ...g, i })).filter(g => g.total >= 10).sort((a, b) => b.certas / b.total - a.certas / a.total)[0]
  const diaMaisAtivo = d.porDia.map((g, i) => ({ ...g, i })).sort((a, b) => b.total - a.total)[0]
  const visto = pctDe(d.vistasTotal, d.validas) ?? 0
  return (
    <section className="ds-numeros" aria-labelledby="ds-numeros-titulo">
      <h3 id="ds-numeros-titulo" className="so-leitor">Seus números</h3>
      <dl className="ds-numeros__lista">
        <div className="ds-numero"><dt>Acerto na 1ª tentativa</dt><dd>{acertoPrimeira === null ? '–' : `${acertoPrimeira}%`}</dd><small>{n(d.primeiras.length)} questões vistas pela primeira vez</small></div>
        <div className="ds-numero"><dt>Acerto nas revisões</dt><dd>{acertoRevisao === null ? '–' : `${acertoRevisao}%`}</dd><small>{acertoRevisao !== null && acertoPrimeira !== null ? `${acertoRevisao >= acertoPrimeira ? '+' : ''}${acertoRevisao - acertoPrimeira} pontos sobre a 1ª vez` : `${n(d.repetidas.length)} respostas repetidas`}</small></div>
        <div className="ds-numero"><dt>Erros recuperados</dt><dd>{pctDe(d.recuperadas, d.comErro) ?? 0}%</dd><small>{n(d.recuperadas)} de {n(d.comErro)} questões que você errou já foram acertadas depois</small></div>
        <div className="ds-numero"><dt>Acervo visto</dt><dd>{visto}%</dd><small>{n(d.vistasTotal)} de {n(d.validas)} questões</small><Medidor valor={visto} fina /></div>
        <div className="ds-numero"><dt>Ritmo</dt><dd>{d.dias28 ? n(Math.round(d.respostas28 / d.dias28)) : 0}</dd><small>questões por dia de estudo (últimas 4 semanas, {d.dias28} dia(s))</small></div>
        {diaMaisAtivo?.total > 0 && <div className="ds-numero"><dt>Dia que mais estuda</dt><dd>{DIAS[diaMaisAtivo.i]}</dd><small>{pctDe(diaMaisAtivo.total, d.total)}% das suas respostas</small></div>}
        {melhorDia && <div className="ds-numero"><dt>Dia de melhor acerto</dt><dd>{DIAS[melhorDia.i]}</dd><small>{pctDe(melhorDia.certas, melhorDia.total)}% de acerto em {n(melhorDia.total)} respostas</small></div>}
      </dl>
    </section>
  )
}

/** Resultado por grupo de prova, com a prova de interesse do perfil em destaque. */
export function DetalhesProvas({ detalhes: { d, interesse } }: { detalhes: Detalhes }) {
  if (!d.total) return null
  const meu = d.grupos.find(g => g.meu)
  return (
    <section className="px-cartao ds-cartao" aria-labelledby="ds-provas-titulo">
      <div className="ds-cartao__cabeca">
        <h3 id="ds-provas-titulo">Por prova</h3>
        <p>{meu ? <>Sua prova de interesse ({interesse.map(rotuloProva).join(', ')}) aparece em destaque.</> : <>Marque sua prova em <a href={href('/conta?secao=perfil')}>Minha conta › Perfil</a> para ver o destaque.</>}</p>
      </div>
      <ul className="ds-provas">
        {d.grupos.map(g => {
          const p = pctDe(g.certas, g.respostas)
          const visto = pctDe(g.vistas, g.total) ?? 0
          return <li key={g.id} className={g.meu ? 'ds-prova ds-prova--minha' : 'ds-prova'}>
            <div className="ds-prova__topo">
              <strong>{g.rotulo}{g.meu && <span className="ds-prova__selo"><Icone nome="alvo" tamanho={12} /> sua prova</span>}</strong>
              <span className="ds-num">{p === null ? 'sem respostas' : <><b>{p}%</b> de acerto</>}</span>
            </div>
            <Medidor valor={visto} fina />
            <small>{n(g.vistas)} de {n(g.total)} questões vistas ({visto}%) · {n(g.respostas)} respostas no período</small>
          </li>
        })}
      </ul>
    </section>
  )
}

/** Acerto semana a semana (linha) e a tabela com respostas, dias e variação. */
export function DetalhesSemanas({ detalhes: { d } }: { detalhes: Detalhes }) {
  if (!d.total) return null
  const pontos = d.semanas.map((s, i) => {
    const p = pctDe(s.certas, s.total)
    const rotulo = i === d.semanas.length - 1 ? 'Esta semana' : `Semana de ${dataCurta(s.inicio)}`
    return {
      chave: String(s.inicio),
      valor: p,
      eixo: i === d.semanas.length - 1 ? 'Esta' : dataCurta(s.inicio),
      descricao: p === null ? `${rotulo}: sem respostas.` : `${rotulo}: ${p}% de acerto em ${n(s.total)} ${s.total === 1 ? 'resposta' : 'respostas'}, ${s.dias} ${s.dias === 1 ? 'dia' : 'dias'} de estudo.`,
    }
  })
  return (
    <section className="px-cartao ds-cartao" aria-labelledby="ds-semanas-titulo">
      <div className="ds-cartao__cabeca">
        <h3 id="ds-semanas-titulo">Acerto semana a semana</h3>
        <p>Últimas 8 semanas. Semana sem resposta deixa um vão na linha.</p>
      </div>
      <GraficoLinha pontos={pontos} rotulo="Acerto por semana nas últimas 8 semanas" />
      <details className="ds-tabela">
        <summary>Ver respostas, dias e acerto em tabela</summary>
        <div className="rolagem-x"><table className="tabela ds-tabela__tabela">
          <thead><tr><th scope="col">Semana</th><th scope="col" className="numerico">Respostas</th><th scope="col" className="numerico">Dias</th><th scope="col" className="numerico">Acerto</th></tr></thead>
          <tbody>{[...d.semanas].reverse().map((s, i, lista) => {
            const p = pctDe(s.certas, s.total)
            const anterior = lista[i + 1] ? pctDe(lista[i + 1].certas, lista[i + 1].total) : null
            return <tr key={s.inicio}>
              <th scope="row">{i === 0 ? 'Esta semana' : dataCurta(s.inicio)}</th>
              <td className="numerico">{n(s.total)}</td>
              <td className="numerico">{s.dias}</td>
              <td className="numerico">{p === null ? '–' : <><strong>{p}%</strong>{anterior !== null && p !== anterior && <small className="ds-variacao"> {p > anterior ? '▲' : '▼'} {Math.abs(p - anterior)}</small>}</>}</td>
            </tr>
          })}</tbody>
        </table></div>
      </details>
    </section>
  )
}

/** Quanto você responde em cada dia da semana (altura) e o acerto do dia (embaixo). */
export function DetalhesDiaSemana({ detalhes: { d } }: { detalhes: Detalhes }) {
  if (!d.total) return null
  const colunas = d.porDia.map((g, i) => {
    const p = pctDe(g.certas, g.total)
    return {
      chave: DIAS[i],
      valor: g.total,
      eixo: DIAS[i].slice(0, 3),
      eixo2: p === null ? '–' : `${p}%`,
      descricao: `${DIAS[i]}: ${n(g.total)} ${g.total === 1 ? 'resposta' : 'respostas'}${p === null ? '' : `, ${p}% de acerto`}.`,
    }
  })
  const maisAtivo = d.porDia.reduce((m, g, i) => (g.total > d.porDia[m].total ? i : m), 0)
  return (
    <section className="px-cartao ds-cartao" aria-labelledby="ds-dias-titulo">
      <div className="ds-cartao__cabeca">
        <h3 id="ds-dias-titulo">Dia da semana</h3>
        <p>A altura é quanto você responde (o número em cima); embaixo, o acerto do dia.</p>
      </div>
      <GraficoColunas colunas={colunas} rotulo="Respostas e acerto por dia da semana" valorNoTopo altura={110} padrao={maisAtivo} />
    </section>
  )
}
