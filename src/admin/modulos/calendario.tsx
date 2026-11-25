import { useMemo, useState } from 'react'
import { DIA, MES, NOME_MES, somarMesChave, type Cobranca } from '../../componentes/admin/receita'
import { rotuloPlano } from '../../componentes/admin/rotulos'
import type { LinhaAssinatura } from '../dados/painel'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { iniciais, inteiro, reais } from '../ui/formato'
import { CENARIOS, type Pagante } from './Receita'

/**
 * Calendário de pagamentos (Tales, 05/11/2026): o mês atual e o próximo, dia a dia, com quem paga cada um.
 * Mensal no cartão e no Pix juntos; semestral e anual no dia em que vencem. O Pix entra como "vai pagar de novo",
 * e os totais mostram também o cenário escolhido (pessimista, 50%… todos). Dias que já passaram mostram o que
 * de fato entrou. Clique num dia para ver as pessoas, com o botão da ficha.
 */

type Tipo = 'mensal-cartao' | 'mensal-pix' | 'semestral' | 'anual'
interface Item { id: string; nome: string; plano: string; meio: 'cartao' | 'pix'; valor: number; tipo: Tipo; pago: boolean; ciclo?: number }

const tipoDe = (plano: string, meio: 'cartao' | 'pix'): Tipo => plano === 'semestral' ? 'semestral' : plano === 'anual' ? 'anual' : meio === 'pix' ? 'mensal-pix' : 'mensal-cartao'
const ROTULO: Record<Tipo, string> = { 'mensal-cartao': 'Mensal · cartão', 'mensal-pix': 'Mensal · Pix', semestral: 'Semestral', anual: 'Anual' }
const SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const DIA_MS = 86_400_000

export function Calendario({ pagamentos, todas, assinaturas, taxa, escolher }: {
  pagamentos: Array<{ quem: Pagante; em: Date; chave: string; ciclo: number }>; todas: Cobranca[]; assinaturas: LinhaAssinatura[]
  taxa: number; escolher: (t: number) => void
}) {
  const nav = usarNav()
  const hoje = DIA(new Date())
  const meses = [MES(new Date()), somarMesChave(MES(new Date()), 1)]
  const [mesI, definirMesI] = useState(0)
  const [dia, definirDia] = useState<string | null>(hoje)

  const porDia = useMemo(() => {
    const nomes = new Map<string, string>()
    for (const a of assinaturas) if (!nomes.has(a.id_usuario) || a.nome) nomes.set(a.id_usuario, a.nome || a.usuario || a.id_usuario.slice(0, 8))
    const m = new Map<string, Item[]>()
    const juntar = (d: string, it: Item) => m.set(d, [...(m.get(d) ?? []), it])
    // O que já entrou no mês atual (dias que já passaram, e hoje até agora).
    for (const c of todas) { const d = DIA(c.em); if (d.slice(0, 7) === meses[0] && d <= hoje) juntar(d, { id: c.id_usuario, nome: nomes.get(c.id_usuario) ?? 'Assinante', plano: c.plano, meio: c.meio, valor: c.valor, tipo: tipoDe(c.plano, c.meio), pago: true }) }
    // O que ainda vai vencer, do agora até o fim do mês que vem.
    for (const x of pagamentos) { const d = DIA(x.em); if (meses.includes(d.slice(0, 7))) juntar(d, { id: x.quem.id, nome: x.quem.nome, plano: x.quem.plano, meio: x.quem.meio, valor: x.quem.preco, tipo: tipoDe(x.quem.plano, x.quem.meio), pago: false, ciclo: x.ciclo }) }
    return m
  }, [pagamentos, todas, assinaturas, hoje, meses[0]]) // eslint-disable-line react-hooks/exhaustive-deps

  const chave = meses[mesI]
  const [ano, mes] = chave.split('-').map(Number)
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const primeiroSemana = (new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay() + 6) % 7
  const diasDoMes = Array.from({ length: diasNoMes }, (_, i) => `${chave}-${String(i + 1).padStart(2, '0')}`)
  const valorEsperado = (it: Item) => it.pago ? it.valor : it.meio === 'pix' ? it.valor * taxa ** (it.ciclo ?? 1) : it.valor
  const doMes = diasDoMes.flatMap(d => porDia.get(d) ?? [])
  const soma = (l: Item[], f: (i: Item) => number) => l.reduce((s, i) => s + f(i), 0)
  const recebido = soma(doMes.filter(i => i.pago), i => i.valor)
  const certo = soma(doMes.filter(i => !i.pago && i.meio === 'cartao'), i => i.valor)
  const pixTodos = soma(doMes.filter(i => !i.pago && i.meio === 'pix'), i => i.valor)
  const maxDia = Math.max(1, ...diasDoMes.map(d => soma(porDia.get(d) ?? [], valorEsperado)))
  const porTipo = (t: Tipo) => doMes.filter(i => !i.pago && i.tipo === t)
  const dSel = dia && dia.slice(0, 7) === chave ? dia : null
  const itensSel = dSel ? (porDia.get(dSel) ?? []) : []
  // Os próximos dias com pagamento, para quem não quer abrir o calendário.
  const proximos = useMemo(() => [...porDia.keys()].filter(d => d >= hoje).sort().slice(0, 5), [porDia, hoje])

  return <section className="fi-secao" aria-labelledby="fi-calendario">
    <div className="hb-titulo"><div><span className="hb-kicker">Calendário</span><h2 id="fi-calendario">Quem paga em cada dia</h2>
      <p>Mensais no cartão e no Pix, semestrais e anuais, no dia em que vencem. Os dias que já passaram mostram o que entrou de verdade; os próximos, quem deve pagar (o Pix pela porcentagem escolhida). Toque num dia para ver as pessoas.</p></div></div>

    <div className="cal-fin">
      <div className="cal-fin__topo">
        <div className="cal-fin__meses" role="tablist" aria-label="Mês">{meses.map((k, i) => <button key={k} type="button" role="tab" aria-selected={mesI === i} onClick={() => { definirMesI(i); definirDia(i === 0 ? hoje : `${k}-01`) }}>
          <span>{i === 0 ? 'Este mês' : 'Mês que vem'}</span><b>{NOME_MES(k).replace(/ de \d{4}$/, '')}</b></button>)}</div>
        <div className="cal-fin__cenario" role="group" aria-label="Quantos do Pix pagam de novo">
          <span>Pix pagando de novo:</span>
          {CENARIOS.map(c => <button key={c.nome} type="button" aria-pressed={Math.abs(c.taxa - taxa) < 0.001} onClick={() => escolher(c.taxa)}>{c.nome === 'Pessimista' ? `Pessimista ${Math.round(c.taxa * 100)}%` : c.nome === 'Metade' ? '50%' : c.nome === 'Todos' ? '100%' : c.nome}</button>)}
        </div>
      </div>

      <div className="cal-fin__placar">
        {mesI === 0 && <div className="cal-fin__placar-item cal-fin__placar-item--pago"><span>Já entrou</span><b>{reais(recebido)}</b><small>até hoje</small></div>}
        <div className="cal-fin__placar-item"><span>Cartão agendado</span><b>{reais(certo)}</b><small>{inteiro(doMes.filter(i => !i.pago && i.meio === 'cartao').length)} cobranças {mesI === 0 ? 'até o fim do mês' : 'no mês'}</small></div>
        <div className="cal-fin__placar-item cal-fin__placar-item--pix"><span>Pix, se todos pagarem</span><b>{reais(pixTodos)}</b><small>{inteiro(doMes.filter(i => !i.pago && i.meio === 'pix').length)} vencimentos</small></div>
        <div className="cal-fin__placar-item cal-fin__placar-item--total"><span>Total com {Math.round(taxa * 100)}% do Pix</span><b>{reais(soma(doMes, valorEsperado))}</b><small>se todos: {reais(recebido + certo + pixTodos)}</small></div>
      </div>

      <ul className="cal-fin__legenda">
        {(['mensal-cartao', 'mensal-pix', 'semestral', 'anual'] as Tipo[]).map(t => <li key={t}><i className={`cal-fin__ficha cal-fin__ficha--${t}`} aria-hidden="true" />{ROTULO[t]} <b>{porTipo(t).length}</b></li>)}
        <li><i className="cal-fin__ficha cal-fin__ficha--pago" aria-hidden="true" />Já pago</li>
      </ul>

      <div className="cal-fin__grade" role="grid" aria-label={`Pagamentos de ${NOME_MES(chave)}`}>
        {SEMANA.map(s => <span key={s} className="cal-fin__semana" role="columnheader">{s}</span>)}
        {Array.from({ length: primeiroSemana }, (_, i) => <span key={`v${i}`} className="cal-fin__vazio" aria-hidden="true" />)}
        {diasDoMes.map(d => {
          const itens = porDia.get(d) ?? []
          const total = soma(itens, valorEsperado)
          const passou = d < hoje, ehHoje = d === hoje
          const intensidade = total / maxDia
          return <button key={d} type="button" role="gridcell" aria-selected={dSel === d}
            className={'cal-fin__dia' + (ehHoje ? ' hoje' : '') + (passou ? ' passou' : '') + (itens.length ? ' tem' : '')}
            style={itens.length ? { '--forca': `${Math.round(8 + intensidade * 30)}%` } as React.CSSProperties : undefined}
            aria-label={`${Number(d.slice(8))} de ${NOME_MES(chave)}: ${itens.length ? `${itens.length} pagamentos, ${reais(total)}` : 'nenhum pagamento'}`}
            onClick={() => definirDia(d)}>
            <span className="cal-fin__num">{Number(d.slice(8))}{ehHoje && <em>hoje</em>}</span>
            {itens.length > 0 && <>
              <span className="cal-fin__fichas">{itens.slice(0, 4).map((it, k) => <i key={k} className={`cal-fin__ficha cal-fin__ficha--${it.pago ? 'pago' : it.tipo}`} title={`${it.nome} · ${ROTULO[it.tipo]}`}>{iniciais(it.nome)}</i>)}{itens.length > 4 && <i className="cal-fin__ficha cal-fin__ficha--mais">+{itens.length - 4}</i>}</span>
              <span className="cal-fin__valor">{reais(total).replace(/,00$/, '')}</span>
            </>}
          </button>
        })}
      </div>

      <div className="cal-fin__dia-aberto" aria-live="polite">
        {!dSel ? <p className="a3-mudo">Toque num dia para ver quem paga.</p> : <>
          <h3>{new Date(`${dSel}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })}
            <small>{itensSel.length ? `${itensSel.length} ${itensSel.length === 1 ? 'pagamento' : 'pagamentos'} · ${reais(soma(itensSel, valorEsperado))}${itensSel.some(i => !i.pago && i.meio === 'pix') ? ` (com ${Math.round(taxa * 100)}% do Pix)` : ''}` : 'ninguém paga neste dia'}</small></h3>
          {itensSel.length > 0 && <ul className="cal-fin__pessoas">{itensSel.map((it, k) => <li key={k} className={`cal-fin__pessoa cal-fin__pessoa--${it.pago ? 'pago' : it.tipo}`}>
            <span className="cal-fin__avatar">{iniciais(it.nome)}</span>
            <span className="cal-fin__pessoa-texto"><b>{it.nome}</b><small>{ROTULO[it.tipo]}{it.plano !== 'mensal' ? ` · ${rotuloPlano(it.plano)}` : ''}</small></span>
            <span className="cal-fin__estado">{it.pago ? <><Icone nome="certo" tamanho={14} />Pago</> : it.meio === 'cartao' ? 'Renova sozinho' : 'Pix: precisa pagar de novo'}</span>
            <b className="cal-fin__pessoa-valor">{reais(it.valor)}</b>
            <button type="button" className="cal-fin__ficha-btn" onClick={() => nav.abrirPessoa(it.id)}>Ficha</button>
          </li>)}</ul>}
        </>}
      </div>

      {proximos.length > 0 && <div className="cal-fin__proximos">
        <span className="cal-fin__proximos-titulo">Próximos dias com pagamento</span>
        <ol>{proximos.map(d => { const it = porDia.get(d) ?? []; const dias = Math.round((new Date(`${d}T12:00:00Z`).getTime() - new Date(`${hoje}T12:00:00Z`).getTime()) / DIA_MS); return <li key={d}>
          <button type="button" onClick={() => { definirMesI(meses.indexOf(d.slice(0, 7)) < 0 ? 0 : meses.indexOf(d.slice(0, 7))); definirDia(d) }}>
            <b>{dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `${d.slice(8, 10)}/${d.slice(5, 7)}`}</b>
            <span>{it.map(i => i.nome.split(' ')[0]).slice(0, 3).join(', ')}{it.length > 3 ? ` e mais ${it.length - 3}` : ''}</span>
            <em>{reais(soma(it, valorEsperado))}</em>
          </button></li> })}</ol>
      </div>}
    </div>
  </section>
}
