import { useMemo, useState } from 'react'
import { BarrasHorizontais, GraficoColunas, type Ponto } from './AdminGraficos'
import { porcentagem } from './formatos'
import { cobrancas, type AssinaturaBase } from './receita'
import type { LinhaUsuario } from './AdminUsuarios'

/**
 * Ritmo de cadastros e de assinaturas: quantos por semana e por mês, em que dia
 * da semana e em que horário eles acontecem. Tudo no horário de São Paulo e
 * calculado com as listas que o painel já carregou (sem consulta nova).
 */

const FUSO = 'America/Sao_Paulo'
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
// Segunda primeiro, como no calendário de estudo; domingo fecha a semana.
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0]
const FAIXAS: Array<[string, number, number]> = [['Madrugada (0h–6h)', 0, 6], ['Manhã (6h–12h)', 6, 12], ['Tarde (12h–18h)', 12, 18], ['Noite (18h–24h)', 18, 24]]
const DIA_MS = 86_400_000

let formato: Intl.DateTimeFormat | null = null
/** Dia (AAAA-MM-DD) e hora de um instante no horário de São Paulo. */
function emSaoPaulo(instante: Date) {
  formato ??= new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(formato.formatToParts(instante).map(x => [x.type, x.value]))
  const dia = `${p.year}-${p.month}-${p.day}`
  return { dia, hora: Number(p.hour) % 24, semana: new Date(`${dia}T12:00:00Z`).getUTCDay() }
}
/** Segunda-feira da semana de um dia AAAA-MM-DD. */
function inicioSemana(dia: string) {
  const d = new Date(`${dia}T12:00:00Z`)
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DIA_MS).toISOString().slice(0, 10)
}
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const nomeMes = (chave: string, curto = false) => new Date(`${chave}-15T12:00:00Z`).toLocaleDateString('pt-BR', curto ? { month: 'short', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' }).replace('.', '')

type Periodo = 'semana' | 'mes'
interface Analise {
  porPeriodo: Record<Periodo, Ponto[]>
  /** Atual e anterior, para o resumo do topo. */
  esta: Record<Periodo, [number, number]>
  dias: number[]
  faixas: number[]
  total: number
}

function analisar(instantes: Date[], hoje: Date): Analise {
  const agoraSp = emSaoPaulo(hoje)
  const semanas: string[] = []
  for (let i = 11; i >= 0; i--) semanas.push(inicioSemana(new Date(new Date(`${agoraSp.dia}T12:00:00Z`).getTime() - i * 7 * DIA_MS).toISOString().slice(0, 10)))
  const meses: string[] = []
  const [ano, mes] = agoraSp.dia.split('-').map(Number)
  for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(ano, mes - 1 - i, 15)); meses.push(d.toISOString().slice(0, 7)) }

  const porSemana = new Map(semanas.map(k => [k, 0])), porMes = new Map(meses.map(k => [k, 0]))
  const dias = [0, 0, 0, 0, 0, 0, 0], faixas = [0, 0, 0, 0]
  for (const instante of instantes) {
    const { dia, hora, semana } = emSaoPaulo(instante)
    const s = inicioSemana(dia), m = dia.slice(0, 7)
    if (porSemana.has(s)) porSemana.set(s, porSemana.get(s)! + 1)
    if (porMes.has(m)) porMes.set(m, porMes.get(m)! + 1)
    dias[semana]++
    faixas[FAIXAS.findIndex(([, de, ate]) => hora >= de && hora < ate)]++
  }
  const ultimaSemana = semanas[semanas.length - 1]
  const pontosSemana = semanas.map(k => {
    const fim = new Date(new Date(`${k}T12:00:00Z`).getTime() + 6 * DIA_MS).toISOString().slice(0, 10)
    return { rotulo: k === ultimaSemana ? `Esta semana (${ddmm(k)} a ${ddmm(fim)})` : `Semana de ${ddmm(k)} a ${ddmm(fim)}`, rotuloCurto: ddmm(k), valor: porSemana.get(k)! }
  })
  const pontosMes = meses.map(k => ({ rotulo: nomeMes(k), rotuloCurto: nomeMes(k, true), valor: porMes.get(k)! }))
  const par = (p: Ponto[]): [number, number] => [p[p.length - 1]?.valor ?? 0, p[p.length - 2]?.valor ?? 0]
  return { porPeriodo: { semana: pontosSemana, mes: pontosMes }, esta: { semana: par(pontosSemana), mes: par(pontosMes) }, dias, faixas, total: instantes.length }
}

/** "32% mais por dia no fim de semana" ou o contrário; nada quando não há base para comparar. */
function comparaFimDeSemana(dias: number[]): string | null {
  const util = (dias[1] + dias[2] + dias[3] + dias[4] + dias[5]) / 5
  const fds = (dias[0] + dias[6]) / 2
  if (util + fds === 0) return null
  if (util === 0) return 'Só aconteceram no fim de semana até agora.'
  if (fds === 0) return 'Só aconteceram em dia útil até agora.'
  const dif = Math.round(((fds - util) / util) * 100)
  const media = `média por dia: ${fds.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} no fim de semana e ${util.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} em dia útil`
  if (Math.abs(dif) < 10) return `Fim de semana e dia útil empatam (${media}).`
  return `Por dia, o fim de semana tem ${Math.abs(dif)}% ${dif > 0 ? 'mais' : 'menos'} que o dia útil (${media}).`
}

function Distribuicao({ titulo, unidade, analise }: { titulo: string; unidade: string; analise: Analise }) {
  const maisForte = analise.total ? ORDEM_DIAS.reduce((a, b) => (analise.dias[b] > analise.dias[a] ? b : a)) : null
  const faixaForte = analise.total ? analise.faixas.indexOf(Math.max(...analise.faixas)) : null
  const fds = comparaFimDeSemana(analise.dias)
  return <section className="empilha adm-secao">
    <div><h2>{titulo}</h2><p>{analise.total ? <>Dos {analise.total.toLocaleString('pt-BR')} {unidade} desde o início, o dia mais forte é <strong>{DIAS[maisForte!].toLocaleLowerCase('pt-BR')}</strong> e o horário, <strong>{FAIXAS[faixaForte!][0].split(' ')[0].toLocaleLowerCase('pt-BR')}</strong>.</> : `Ainda não há ${unidade}.`}</p></div>
    {analise.total > 0 && <>
      {fds && <p className="adm-nota">{fds}</p>}
      <BarrasHorizontais maximo={Math.max(1, ...analise.dias)} itens={ORDEM_DIAS.map(d => ({
        rotulo: DIAS[d], valor: analise.dias[d], detalhe: `${porcentagem(analise.dias[d], analise.total) ?? 0}% do total`,
        destaque: d === maisForte ? 'bom' as const : undefined,
      }))} />
      <h3 className="adm-subtitulo">Horário</h3>
      <BarrasHorizontais maximo={Math.max(1, ...analise.faixas)} itens={FAIXAS.map(([rotulo], i) => ({
        rotulo, valor: analise.faixas[i], detalhe: `${porcentagem(analise.faixas[i], analise.total) ?? 0}% do total`,
      }))} />
    </>}
  </section>
}

function variacao(atual: number, anterior: number) {
  if (!anterior) return atual ? 'sem base anterior' : 'igual ao anterior'
  const d = Math.round(((atual - anterior) / anterior) * 100)
  return d === 0 ? 'igual ao anterior' : `${d > 0 ? '+' : ''}${d}% sobre o anterior (${anterior})`
}

export function AdminRitmo({ usuarios, assinaturas }: { usuarios: LinhaUsuario[]; assinaturas: AssinaturaBase[] }) {
  const [periodo, definirPeriodo] = useState<Periodo>('semana')
  const { cadastros, assinantes } = useMemo(() => {
    const hoje = new Date()
    const datasCadastro = usuarios.map(u => new Date(u.criado_em)).filter(d => Number.isFinite(d.getTime()))
    // Novo assinante = primeira compra paga de cada pessoa; renovações e uma
    // segunda compra (Pix renovado à mão) não contam de novo.
    const primeira = new Map<string, Date>()
    for (const c of cobrancas(assinaturas)) if (c.tipo === 'nova' && !primeira.has(c.id_usuario)) primeira.set(c.id_usuario, c.em)
    return { cadastros: analisar(datasCadastro, hoje), assinantes: analisar([...primeira.values()], hoje) }
  }, [usuarios, assinaturas])

  const nomePeriodo = periodo === 'semana' ? ['Esta semana', 'semana'] : ['Este mês', 'mês']
  return <div className="empilha-2">
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-ritmo">
      <div className="adm-secao__cabeca">
        <div><h2 id="adm-titulo-ritmo">Cadastros e assinantes por {nomePeriodo[1]}</h2><p>Semana de segunda a domingo, horário de São Paulo. Assinante novo é a primeira compra paga de cada pessoa.</p></div>
        <div className="adm-filtros" role="group" aria-label="Agrupar por">
          {([['semana', 'Por semana'], ['mes', 'Por mês']] as const).map(([v, r]) => <button key={v} type="button" className="adm-chip" aria-pressed={periodo === v} onClick={() => definirPeriodo(v)}>{r}</button>)}
        </div>
      </div>
      <div className="adm-kpis">
        <div className="adm-kpi"><span>Cadastros · {nomePeriodo[0].toLocaleLowerCase('pt-BR')}</span><strong>{cadastros.esta[periodo][0]}</strong><small>{variacao(...cadastros.esta[periodo])}</small></div>
        <div className="adm-kpi"><span>Assinantes novos · {nomePeriodo[0].toLocaleLowerCase('pt-BR')}</span><strong>{assinantes.esta[periodo][0]}</strong><small>{variacao(...assinantes.esta[periodo])}</small></div>
        <div className="adm-kpi"><span>Conversão no período</span><strong>{porcentagem(assinantes.esta[periodo][0], cadastros.esta[periodo][0]) ?? 0}%</strong><small>assinantes novos sobre cadastros novos</small></div>
      </div>
      <div className="adm-graficos">
        <GraficoColunas titulo="Cadastros novos" subtitulo={periodo === 'semana' ? 'últimas 12 semanas' : 'últimos 12 meses'} pontos={cadastros.porPeriodo[periodo]} unidade="cadastros" rotuloTabela={periodo === 'semana' ? 'Semana' : 'Mês'} />
        <GraficoColunas titulo="Assinantes novos" subtitulo={periodo === 'semana' ? 'últimas 12 semanas' : 'últimos 12 meses'} pontos={assinantes.porPeriodo[periodo]} unidade="assinantes" rotuloTabela={periodo === 'semana' ? 'Semana' : 'Mês'} />
      </div>
    </section>

    <div className="adm-duas">
      <Distribuicao titulo="Quando as pessoas se cadastram" unidade="cadastros" analise={cadastros} />
      <Distribuicao titulo="Quando as pessoas assinam" unidade="assinantes" analise={assinantes} />
    </div>
  </div>
}
