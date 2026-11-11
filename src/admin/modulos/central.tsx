import { useMemo, useState, type ReactNode } from 'react'
import { cobrancas as cobrancasDe } from '../../componentes/admin/receita'
import { viuPlanos } from '../../componentes/admin/sinais'
import { diaSP } from '../../componentes/admin/estudoHoje'
import { usarPainel } from '../dados/painel'
import { nomeDe, type LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { inteiro, reais } from '../ui/formato'
import { Barras, Colunas } from '../ui/graficos'
import { Segmento } from '../ui/kit'
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


/**
 * O placar de comparações do Início (refeito em 11/11/2026: "deixar essa parte mais bonitinha"). Quatro blocos
 * (cadastros, assinantes novos, recebido e quem viu os planos), cada período com o valor, o mesmo trecho do
 * período anterior em barras na mesma escala e a variação em pílula. Clicar no título abre a página do assunto.
 */
export function Comparacoes() {
  const p = usarPainel()
  const nav = usarNav()
  const c = useMemo(() => {
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
    const linha = (rotulo: string, valor: number, antes: number, contra: string) => ({ rotulo, valor, antes, contra })
    const blocos: Array<{ titulo: string; icone: 'pessoas' | 'estrela' | 'receita' | 'olho'; tom: 'verde' | 'ouro'; destino: 'crescimento' | 'assinaturas' | 'financeiro' | 'usuarios'; dinheiro?: boolean; planos?: boolean; linhas: Array<ReturnType<typeof linha>> }> = [
      { titulo: 'Cadastros', icone: 'pessoas', tom: 'verde', destino: 'crescimento', linhas: [
        linha('Hoje', conta(cad, m.meiaNoite, m.agora), conta(cad, ...hojeAntes), 'ontem até esta hora'),
        linha('Nesta semana', conta(cad, m.segunda, m.agora), conta(cad, ...semanaAntes), 'semana passada até agora'),
        linha('No mês', conta(cad, m.inicioMes, m.agora), conta(cad, m.inicioMesPassado, m.mesmaAlturaMes), 'mês passado, mesma altura'),
      ] },
      { titulo: 'Assinantes novos', icone: 'estrela', tom: 'ouro', destino: 'assinaturas', linhas: [
        linha('Hoje', novas(m.meiaNoite, m.agora), novas(...hojeAntes), 'ontem até esta hora'),
        linha('Nesta semana', novas(m.segunda, m.agora), novas(...semanaAntes), 'semana passada até agora'),
        linha('No mês', novas(m.inicioMes, m.agora), novas(m.inicioMesPassado, m.mesmaAlturaMes), 'mês passado, mesma altura'),
      ] },
      { titulo: 'Recebido', icone: 'receita', tom: 'ouro', destino: 'financeiro', dinheiro: true, linhas: [
        linha('Hoje', soma(m.meiaNoite, m.agora), soma(...hojeAntes), 'ontem até esta hora'),
        linha('Nesta semana', soma(m.segunda, m.agora), soma(...semanaAntes), 'semana passada até agora'),
        linha('No mês', soma(m.inicioMes, m.agora), soma(m.inicioMesPassado, m.mesmaAlturaMes), 'mês passado, mesma altura'),
      ] },
      { titulo: 'Viram os planos', icone: 'olho', tom: 'verde', destino: 'usuarios', planos: true, linhas: [
        linha('Em 7 dias', viram(7), 0, 'quem ainda não assina'),
        linha('Em 30 dias', viram(30), 0, 'quem ainda não assina'),
      ] },
    ]
    return blocos
  }, [p.usuariosReais, p.reais, p.cobrancas, p.sinais])
  if (!c) return null
  return <section className="cc-placar" aria-label="Comparações com ontem, a semana e o mês passados">
    {c.map(g => {
      const f = g.dinheiro ? (n: number) => reais(n).replace(/,00$/, '') : inteiro
      return <article key={g.titulo} className={`cc-bloco cc-bloco--${g.tom}`}>
        <a className="cc-bloco__cab" href={nav.link(g.destino)} onClick={e => { e.preventDefault(); nav.ir(g.destino) }}><span className="cc-comp__icone" aria-hidden="true"><Icone nome={g.icone} tamanho={15} /></span>{g.titulo}<Icone nome="direita" tamanho={13} /></a>
        {g.linhas.map(x => {
          const delta = x.valor - x.antes, maior = Math.max(1, x.valor, x.antes)
          const pct = x.antes ? Math.round((delta / x.antes) * 100) : null
          return <div key={x.rotulo} className="cc-bloco__linha">
            <span className="cc-bloco__periodo">{x.rotulo}</span>
            <b className="cc-bloco__valor">{f(x.valor)}</b>
            {g.planos ? <small className="cc-bloco__contra">{x.contra}</small> : <>
              <span className={'cc-bloco__var ' + (delta > 0 ? 'sobe' : delta < 0 ? 'desce' : 'igual')}>{delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {pct === null ? (delta ? f(Math.abs(delta)) : 'igual') : `${Math.abs(pct)}%`}</span>
              <span className="cc-bloco__barras" aria-hidden="true"><i style={{ width: `${x.valor / maior * 100}%` }} /><i className="antes" style={{ width: `${x.antes / maior * 100}%` }} /></span>
              <small className="cc-bloco__contra">contra {f(x.antes)} ({x.contra})</small>
            </>}
          </div>
        })}
      </article>
    })}
  </section>
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

type Janela = '7' | '30' | 'semanas' | 'comparar'
const SEMANA_CURTA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const SEMANA_LONGA = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']

/**
 * Cadastros, pessoas que estudaram, questões e assinaturas novas por dia, com quatro jeitos de ver
 * (Tales, 04/11/2026): 7 dias, 30 dias, semana a semana (qual semana foi melhor) e esta semana contra a passada,
 * dia a dia (qual dia da semana rende mais).
 */
export function Graficos({ serie }: { serie: Array<{ dia: string; cadastros: number; ativos: number; respostas: number }> | null }) {
  const p = usarPainel()
  const [janela, definirJanela] = useState<Janela>('7')
  const dados = useMemo(() => {
    if (!serie?.length) return null
    const novasPorDia = new Map<string, number>()
    if (p.reais) for (const c of cobrancasDe(p.reais, p.cobrancas)) if (c.tipo === 'nova') { const d = diaSP(c.em.getTime()); novasPorDia.set(d, (novasPorDia.get(d) ?? 0) + 1) }
    const dias = [...serie].sort((a, b) => a.dia.localeCompare(b.dia)).map(d => ({ dia: d.dia, cadastros: Number(d.cadastros), ativos: Number(d.ativos), respostas: Number(d.respostas), assinaram: novasPorDia.get(d.dia) ?? 0 }))
    return dias
  }, [serie, p.reais, p.cobrancas])
  if (!dados) return null
  type Chave = 'cadastros' | 'ativos' | 'respostas' | 'assinaram'
  const hoje = dados[dados.length - 1]?.dia ?? diaSP(Date.now())
  const semanaDe = (dia: string) => { const d = new Date(`${dia}T12:00:00Z`); return (d.getUTCDay() + 6) % 7 }
  const somarDias = (dia: string, n: number) => new Date(new Date(`${dia}T12:00:00Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10)
  const segunda = somarDias(hoje, -semanaDe(hoje))
  const porDia = new Map(dados.map(d => [d.dia, d]))
  const rotDia = (dia: string, i: number, n: number) => ({ longo: new Date(`${dia}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' }), curto: i === n - 1 ? 'hoje' : n <= 7 ? SEMANA_CURTA[semanaDe(dia)] : `${dia.slice(8, 10)}/${dia.slice(5, 7)}`, parcial: i === n - 1 })

  const montar = (k: Chave) => {
    if (janela === '7' || janela === '30') {
      const l = dados.slice(-Number(janela))
      return { pontos: l.map((d, i) => ({ ...rotDia(d.dia, i, l.length), partes: [d[k]] })), lado: false, resumo: null as ReactNode }
    }
    if (janela === 'semanas') {
      const semanas = Array.from({ length: 5 }, (_, i) => somarDias(segunda, (i - 4) * 7))
      const pontos = semanas.map((s, i) => {
        const soma = Array.from({ length: 7 }, (_, j) => porDia.get(somarDias(s, j))?.[k] ?? 0).reduce((a, b) => a + b, 0)
        return { longo: `Semana de ${s.slice(8, 10)}/${s.slice(5, 7)} a ${somarDias(s, 6).slice(8, 10)}/${somarDias(s, 6).slice(5, 7)}`, curto: i === 4 ? 'esta' : `${s.slice(8, 10)}/${s.slice(5, 7)}`, partes: [soma], parcial: i === 4 }
      })
      const completas = pontos.slice(0, 4)
      const melhor = completas.reduce((m, x) => x.partes[0] > m.partes[0] ? x : m, completas[0])
      return { pontos, lado: false, resumo: melhor && melhor.partes[0] > 0 ? <>Melhor semana: <b>{melhor.longo.toLowerCase()}</b>, com {inteiro(melhor.partes[0])}.</> : null }
    }
    // Esta semana × a passada, dia a dia; os dias que ainda não chegaram ficam vazios.
    const hojeI = semanaDe(hoje)
    const pontos = SEMANA_CURTA.map((c, j) => {
      const passada = porDia.get(somarDias(segunda, j - 7))?.[k] ?? 0
      const esta = j <= hojeI ? porDia.get(somarDias(segunda, j))?.[k] ?? 0 : 0
      return { longo: SEMANA_LONGA[j] + (j === hojeI ? ' (hoje, em andamento)' : j > hojeI ? ' (ainda não chegou)' : ''), curto: c, partes: [passada, esta] }
    })
    const ateHoje = (q: 0 | 1) => pontos.slice(0, hojeI + 1).reduce((s, x) => s + x.partes[q], 0)
    const a = ateHoje(1), b = ateHoje(0)
    const melhorDia = pontos.reduce((m, x, j) => x.partes[0] > pontos[m].partes[0] ? j : m, 0)
    return { pontos, lado: true, resumo: <>Até {SEMANA_LONGA[hojeI]}: <b>{inteiro(a)}</b> nesta semana contra {inteiro(b)} na passada{b ? ` (${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%)` : ''}. Semana passada, o dia mais forte foi {SEMANA_LONGA[melhorDia]}.</> }
  }
  const CARTOES: Array<{ k: Chave; titulo: string; cor: 'verde' | 'claro' | 'ouro' }> = [
    { k: 'cadastros', titulo: 'Cadastros', cor: 'verde' }, { k: 'ativos', titulo: 'Pessoas que estudaram', cor: 'claro' },
    { k: 'respostas', titulo: 'Questões respondidas', cor: 'claro' }, { k: 'assinaram', titulo: 'Assinaram (primeira compra)', cor: 'ouro' },
  ]
  const sub: Record<Janela, string> = { '7': 'por dia, últimos 7 dias', '30': 'por dia, últimos 30 dias', semanas: 'soma de cada semana (segunda a domingo), últimas 5', comparar: 'dia a dia: semana passada (claro) × esta semana (cheio)' }
  return <section className="cc-graficos" aria-label="Gráficos do dia a dia">
    <div className="cr-acoes"><Segmento rotulo="Como ver" valor={janela} aoMudar={definirJanela} opcoes={[['7', '7 dias'], ['30', '30 dias'], ['semanas', 'Semana a semana'], ['comparar', 'Esta × passada']]} /></div>
    <div className="cr-grade-2">{CARTOES.map(c => { const m = montar(c.k); return <article key={c.k} className={`cr-cartao${janela === 'comparar' ? ` cc-comparar cc-comparar--${c.cor}` : ''}`}>
      <h3>{c.titulo} <small>{sub[janela]}</small></h3>
      {m.resumo && <p className="cr-conclusao">{m.resumo}</p>}
      <Colunas descricao={`${c.titulo}: ${sub[janela]}`} pontos={m.pontos} lado={m.lado} cor={c.cor} altura={190}
        media={!m.lado} destacarMaior={janela === 'semanas'}
        series={m.lado ? [{ nome: 'Semana passada' }, { nome: 'Esta semana', estilo: 2 }] : [{ nome: c.titulo }]} />
    </article> })}</div>
  </section>
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
