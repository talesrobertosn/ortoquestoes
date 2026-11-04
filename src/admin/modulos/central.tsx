import { useMemo, type ReactNode } from 'react'
import { pedacosAtividade } from '../../componentes/admin/formatos'
import { cobrancas as cobrancasDe } from '../../componentes/admin/receita'
import { viuPlanos } from '../../componentes/admin/sinais'
import { diaSP } from '../../componentes/admin/estudoHoje'
import { usarPainel } from '../dados/painel'
import { nomeDe, type LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { inteiro, reais } from '../ui/formato'
import { Barras, Colunas } from '../ui/graficos'
import { temperatura } from './Inicio'

/**
 * Central de controle da página Agora (Tales, 04/11/2026: "um hub de controle grande, como a tela do Big Brother;
 * estatística, quantos viram os planos, o que estão vendo, comparações com a semana e o mês passados").
 * Nada aqui faz consulta nova ao Supabase: tudo sai do que a página já carrega (pessoas a cada 3 minutos, o resto a cada 5).
 */

const DIA_MS = 86_400_000
const FUSO_MS = 3 * 3_600_000
/** Início da semana (segunda, 0h de São Paulo) e do mês, como instantes. */
function marcos(agora = Date.now()) {
  const sp = new Date(agora - FUSO_MS)
  const meiaNoite = Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate()) + FUSO_MS
  const segunda = meiaNoite - ((sp.getUTCDay() + 6) % 7) * DIA_MS
  const inicioMes = Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), 1) + FUSO_MS
  const inicioMesPassado = Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth() - 1, 1) + FUSO_MS
  const diasNoMesPassado = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), 0)).getUTCDate()
  // "Mesma altura do mês passado": o mesmo tempo decorrido desde o dia 1º, travado no tamanho do mês.
  const mesmaAlturaMes = Math.min(inicioMesPassado + (agora - inicioMes), inicioMesPassado + diasNoMesPassado * DIA_MS)
  return { agora, meiaNoite, segunda, inicioMes, inicioMesPassado, mesmaAlturaMes }
}

interface Comparacao { rotulo: string; valor: number; antes: number; contra: string; formato?: (n: number) => string; icone: ReactNode; tom?: 'verde' | 'ouro' }

export function Comparacoes() {
  const p = usarPainel()
  const c = useMemo((): Comparacao[] | null => {
    if (!p.usuariosReais) return null
    const m = marcos()
    const entre = (t: number, de: number, ate: number) => t >= de && t < ate
    const cad = p.usuariosReais.map(u => new Date(u.criado_em).getTime())
    const todas = p.reais ? cobrancasDe(p.reais, p.cobrancas).map(x => ({ t: x.em.getTime(), valor: x.valor, nova: x.tipo === 'nova' })) : []
    const conta = (lista: number[], de: number, ate: number) => lista.filter(t => entre(t, de, ate)).length
    const soma = (de: number, ate: number) => todas.filter(x => entre(x.t, de, ate)).reduce((s, x) => s + x.valor, 0)
    const novas = (de: number, ate: number) => todas.filter(x => x.nova && entre(x.t, de, ate)).length
    const semanaAntes = [m.segunda - 7 * DIA_MS, m.agora - 7 * DIA_MS] as const
    const hojeAntes = [m.meiaNoite - DIA_MS, m.agora - DIA_MS] as const
    const viram = (dias: number) => p.usuariosReais!.filter(u => !u.plano_vigente && viuPlanos(p.sinais.get(u.id_usuario), dias)).length
    return [
      { rotulo: 'Cadastros nesta semana', valor: conta(cad, m.segunda, m.agora), antes: conta(cad, ...semanaAntes), contra: 'semana passada até agora', icone: <Icone nome="pessoas" tamanho={16} /> },
      { rotulo: 'Cadastros no mês', valor: conta(cad, m.inicioMes, m.agora), antes: conta(cad, m.inicioMesPassado, m.mesmaAlturaMes), contra: 'mês passado, mesma altura', icone: <Icone nome="calendario" tamanho={16} /> },
      { rotulo: 'Assinantes novos na semana', valor: novas(m.segunda, m.agora), antes: novas(...semanaAntes), contra: 'semana passada até agora', icone: <Icone nome="estrela" tamanho={16} />, tom: 'ouro' },
      { rotulo: 'Assinantes novos no mês', valor: novas(m.inicioMes, m.agora), antes: novas(m.inicioMesPassado, m.mesmaAlturaMes), contra: 'mês passado, mesma altura', icone: <Icone nome="estrela" tamanho={16} />, tom: 'ouro' },
      { rotulo: 'Recebido hoje', valor: soma(m.meiaNoite, m.agora), antes: soma(...hojeAntes), contra: 'ontem até esta hora', formato: reais, icone: <Icone nome="receita" tamanho={16} />, tom: 'ouro' },
      { rotulo: 'Recebido na semana', valor: soma(m.segunda, m.agora), antes: soma(...semanaAntes), contra: 'semana passada até agora', formato: reais, icone: <Icone nome="receita" tamanho={16} />, tom: 'ouro' },
      { rotulo: 'Recebido no mês', valor: soma(m.inicioMes, m.agora), antes: soma(m.inicioMesPassado, m.mesmaAlturaMes), contra: 'mês passado, mesma altura', formato: reais, icone: <Icone nome="receita" tamanho={16} />, tom: 'ouro' },
      { rotulo: 'Viram os planos', valor: viram(7), antes: viram(30), contra: 'em 7 dias · em 30 dias', icone: <Icone nome="olho" tamanho={16} /> },
    ]
  }, [p.usuariosReais, p.reais, p.cobrancas, p.sinais])
  if (!c) return null
  return <section className="cc-comparacoes" aria-label="Comparações com a semana e o mês passados">
    {c.map(x => {
      const f = x.formato ?? inteiro
      const ehPlanos = x.rotulo === 'Viram os planos'
      const delta = x.valor - x.antes
      const pctDelta = x.antes ? Math.round((delta / x.antes) * 100) : null
      return <article key={x.rotulo} className={`cc-comp cc-comp--${x.tom ?? 'verde'}`}>
        <span className="cc-comp__rotulo"><span className="cc-comp__icone" aria-hidden="true">{x.icone}</span>{x.rotulo}</span>
        <b className="cc-comp__valor">{f(x.valor)}</b>
        {ehPlanos ? <small>{inteiro(x.valor)} em 7 dias · {inteiro(x.antes)} em 30 dias (não assinantes)</small>
          : <small><span className={delta > 0 ? 'sobe' : delta < 0 ? 'desce' : 'igual'}>{delta > 0 ? '↑' : delta < 0 ? '↓' : '='} {pctDelta === null ? (delta ? f(Math.abs(delta)) : 'igual') : `${Math.abs(pctDelta)}%`}</span> contra {f(x.antes)} ({x.contra})</small>}
      </article>
    })}
  </section>
}

/** O que as pessoas estão vendo: online agora e quem passou hoje, pela última página de cada uma. */
export function VendoAgora() {
  const p = usarPainel()
  const d = useMemo(() => {
    if (!p.usuarios) return null
    const hoje = diaSP(Date.now())
    const agrupar = (l: LinhaUsuario[]) => { const m = new Map<string, number>(); for (const u of l) { const n = pedacosAtividade(u).nome; m.set(n, (m.get(n) ?? 0) + 1) } return [...m].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor) }
    const online = p.usuarios.filter(u => u.online && u.pagina)
    const hojeL = p.usuarios.filter(u => u.pagina && u.pagina_em && diaSP(u.pagina_em) === hoje)
    return { online: agrupar(online), nOnline: online.length, hoje: agrupar(hojeL), nHoje: hojeL.length }
  }, [p.usuarios])
  if (!d) return null
  return <article className="cr-cartao">
    <h3>O que estão vendo <small>pela última página de cada pessoa</small></h3>
    <div className="cc-duas">
      <div><span className="cc-sub"><i className="a3-ponto a3-ponto--vivo" aria-hidden="true" /> Online agora · {inteiro(d.nOnline)}</span>
        {d.online.length ? <Barras itens={d.online} total={d.nOnline} limite={8} /> : <p className="a3-mudo">Ninguém online agora.</p>}</div>
      <div><span className="cc-sub">Hoje, a última página · {inteiro(d.nHoje)}</span>
        {d.hoje.length ? <Barras itens={d.hoje} total={d.nHoje} limite={8} cor="claro" /> : <p className="a3-mudo">Ninguém registrou página hoje.</p>}</div>
    </div>
  </article>
}

/** Não assinantes por temperatura (sinais de que podem comprar) e os mais quentes, com o botão da ficha. */
export function Termometro({ limite }: { limite: number | null }) {
  const p = usarPainel()
  const nav = usarNav()
  const d = useMemo(() => {
    if (!p.usuarios) return null
    const hoje = diaSP(Date.now())
    const pessoas = p.usuarios.filter(u => !u.administrador && !u.plano_vigente).map(u => ({ u, t: temperatura(u, p.sinais.get(u.id_usuario), hoje, limite) }))
    const conta = (n: string) => pessoas.filter(x => x.t.nivel === n).length
    return { niveis: [['Fervendo', conta('fervendo')], ['Quente', conta('quente')], ['Morno', conta('morno')], ['Frio', conta('frio')]] as Array<[string, number]>, total: pessoas.length,
      top: pessoas.filter(x => x.t.pontos >= 3).sort((a, b) => b.t.pontos - a.t.pontos || b.u.respondidas - a.u.respondidas).slice(0, 6) }
  }, [p.usuarios, p.sinais, limite])
  if (!d) return null
  return <article className="cr-cartao">
    <h3>Termômetro de quem ainda não assina <small>viu os planos, bateu o limite, questões no total e online agora</small></h3>
    <Barras cor="ouro" total={d.total} itens={d.niveis.map(([nome, valor]) => ({ nome, valor }))} />
    {d.top.length > 0 && <>
      <span className="cc-sub">Os mais quentes agora</span>
      <ul className="cc-quentes">{d.top.map(({ u, t }) => <li key={u.id_usuario}>
        <button type="button" onClick={() => nav.abrirPessoa(u.id_usuario)}>
          <span className="a3-nome">{nomeDe(u)}</span>
          <span className="a3-sub">{inteiro(u.respondidas)} questões · {t.rotulo}{u.online ? ' · online' : ''}</span>
        </button>
        <button type="button" className="cc-carta" onClick={() => nav.abrirPessoa(u.id_usuario, 'carta')}><Icone nome="carta" tamanho={14} />Carta</button>
      </li>)}</ul>
    </>}
  </article>
}

/** Os últimos 7 dias em colunas: cadastros, pessoas que estudaram e questões. */
export function Semana({ serie }: { serie: Array<{ dia: string; cadastros: number; ativos: number; respostas: number }> | null }) {
  if (!serie?.length) return null
  const l = [...serie].sort((a, b) => a.dia.localeCompare(b.dia)).slice(-7)
  const rot = (d: string, i: number) => ({ longo: new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' }), curto: i === l.length - 1 ? 'hoje' : new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''), parcial: i === l.length - 1 })
  const g = (k: 'cadastros' | 'ativos' | 'respostas') => l.map((d, i) => ({ ...rot(d.dia, i), partes: [Number(d[k])] }))
  return <div className="cr-grade-3">
    <article className="cr-cartao"><h3>Cadastros <small>últimos 7 dias</small></h3><Colunas descricao="Cadastros nos últimos 7 dias" pontos={g('cadastros')} series={[{ nome: 'Cadastros' }]} altura={170} /></article>
    <article className="cr-cartao"><h3>Pessoas que estudaram <small>últimos 7 dias</small></h3><Colunas descricao="Pessoas que estudaram nos últimos 7 dias" pontos={g('ativos')} series={[{ nome: 'Pessoas' }]} altura={170} cor="claro" /></article>
    <article className="cr-cartao"><h3>Questões respondidas <small>últimos 7 dias</small></h3><Colunas descricao="Questões nos últimos 7 dias" pontos={g('respostas')} series={[{ nome: 'Questões' }]} altura={170} cor="claro" /></article>
  </div>
}

/** Quem mais estudou hoje e na semana. */
export function Destaques() {
  const p = usarPainel()
  const nav = usarNav()
  const d = useMemo(() => {
    if (!p.usuariosReais) return null
    const hoje = [...p.usuariosReais].filter(u => (u.respondidas_hoje ?? 0) > 0).sort((a, b) => (b.respondidas_hoje ?? 0) - (a.respondidas_hoje ?? 0)).slice(0, 6)
    const semana = [...p.usuariosReais].filter(u => u.respondidas_7d > 0).sort((a, b) => b.respondidas_7d - a.respondidas_7d).slice(0, 6)
    return { hoje, semana }
  }, [p.usuariosReais])
  if (!d) return null
  const lista = (l: LinhaUsuario[], v: (u: LinhaUsuario) => number, cor: 'verde' | 'claro') => l.length ? <ul className="cc-podio">{l.map((u, i) => <li key={u.id_usuario}>
    <span className={`cc-podio__pos cc-podio__pos--${cor}`}>{i + 1}</span>
    <button type="button" onClick={() => nav.abrirPessoa(u.id_usuario)}><span className="a3-nome">{nomeDe(u)}</span><span className="a3-sub">{u.plano_vigente ? 'assinante' : 'não assinante'}{u.online ? ' · online' : ''}</span></button>
    <b>{inteiro(v(u))}</b>
  </li>)}</ul> : <p className="a3-mudo">Ninguém ainda.</p>
  return <article className="cr-cartao">
    <h3>Quem mais estudou <small>questões respondidas</small></h3>
    <div className="cc-duas">
      <div><span className="cc-sub">Hoje</span>{lista(d.hoje, u => u.respondidas_hoje ?? 0, 'verde')}</div>
      <div><span className="cc-sub">Nos últimos 7 dias</span>{lista(d.semana, u => u.respondidas_7d, 'claro')}</div>
    </div>
  </article>
}
