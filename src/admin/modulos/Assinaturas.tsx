import { useMemo, useState } from 'react'
import { contaDeTeste } from '../../componentes/admin/contasTeste'
import { baixarCsv } from '../../componentes/admin/formatos'
import { meioDe, precoDe, renovaSozinha, vigente, vigentesPorPessoa } from '../../componentes/admin/receita'
import { motivoRecusa, proximaData, rotuloMeio, rotuloPlano, situacaoAssinatura, type Tom } from '../../componentes/admin/rotulos'
import { usarPainel, type LinhaAssinatura } from '../dados/painel'
import { usarNav } from '../nav'
import type { GrupoAssinatura } from '../rotas'
import { chaveFalha } from '../dados/metricas'
import { Icone } from '../ui/Icone'
import { combina, data, haQuanto, iniciais, inteiro, normalizar, reais } from '../ui/formato'
import { Busca, Carregando, Estado, FiltrosAtivos, Selo } from '../ui/kit'
import { Tabela, type Coluna } from '../ui/tabela'
import { RiscoAbandono } from './riscoAbandono'
import { carteiraHoje } from '../dados/hub'
import { Composicao } from '../ui/torres'
import './hub.css'

type Grupo = GrupoAssinatura
type Recorte = 'tudo' | '7' | '30' | '90' | '365'
const GRUPOS: Array<[Grupo, string, string]> = [
  ['vigentes', 'Com acesso', 'Pagaram e o acesso vale agora (inclui quem desligou a renovação e ainda tem dias).'],
  ['pendente', 'Pendentes', 'Abriram o pagamento e ainda não pagaram.'],
  ['falha_pagamento', 'Cartão recusado', 'O cartão não passou: ao assinar (nada foi cobrado, nunca teve acesso) ou na renovação (pode perder o acesso). Marque "Resolvido" quando tratar.'],
  ['encerradas', 'Encerradas', 'Expiradas, canceladas sem acesso, reembolsadas ou pausadas.'],
  ['todas', 'Todas', 'Todas as linhas do banco, inclusive as de teste do dono.'],
]
const RECORTES: Array<[Recorte, string]> = [['tudo', 'desde sempre'], ['7', 'últimos 7 dias'], ['30', 'últimos 30 dias'], ['90', 'últimos 3 meses'], ['365', 'último ano']]
const TOM: Record<Tom, 'ok' | 'aviso' | 'erro' | undefined> = { ok: 'ok', aviso: 'aviso', ruim: 'erro', neutro: undefined }
const inicioDe = (a: LinhaAssinatura) => a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao
const passa = (a: LinhaAssinatura, g: Grupo) => g === 'todas' ? true : g === 'vigentes' ? vigente(a) : g === 'encerradas' ? !vigente(a) && ['cancelada', 'vencida', 'reembolsada', 'pausada'].includes(a.status) : a.status === g

/** Quanto do período pago já passou: a régua de cada assinatura. */
function Vigencia({ a }: { a: LinhaAssinatura }) {
  const ini = a.inicio_periodo ? new Date(a.inicio_periodo).getTime() : null, fim = a.fim_periodo ? new Date(a.fim_periodo).getTime() : null
  if (!ini || !fim || fim <= ini) return <span className="fraco">sem período</span>
  const agora = Date.now(), p = Math.min(1, Math.max(0, (agora - ini) / (fim - ini)))
  const dias = Math.ceil((fim - agora) / 86_400_000)
  const acabou = dias <= 0
  return <span className="a3-vigencia" title={`${data(a.inicio_periodo)} até ${data(a.fim_periodo)}`}>
    <span className="a3-vigencia__trilho" aria-hidden="true"><i style={{ width: `${p * 100}%` }} className={acabou ? 'fim' : dias <= 7 ? 'perto' : undefined} /></span>
    <span className="a3-sub">{acabou ? `terminou ${haQuanto(a.fim_periodo)}` : `${inteiro(dias)} ${dias === 1 ? 'dia' : 'dias'} restantes`}</span>
  </span>
}

/** Receita › Assinaturas: quem paga, por qual meio e plano, e até quando vale o acesso. */
export default function Assinaturas() {
  const p = usarPainel()
  const nav = usarNav()
  const grupo = nav.estado.grupo
  const definirGrupo = (g: Grupo) => nav.ajustar({ grupo: g })
  const { lidos, marcar } = p.lidosPagamento
  const [plano, definirPlano] = useState<'todos' | 'mensal' | 'semestral' | 'anual'>('todos')
  const [meio, definirMeio] = useState<'todos' | 'pix' | 'cartao'>('todos')
  const [recorte, definirRecorte] = useState<Recorte>('tudo')
  const [busca, definirBusca] = useState('')
  const linhas = p.assinaturas

  const noRecorte = useMemo(() => (a: LinhaAssinatura) => (recorte === 'tudo' || Date.now() - new Date(inicioDe(a)).getTime() <= Number(recorte) * 86_400_000)
    && (plano === 'todos' || a.plano === plano) && (meio === 'todos' || meioDe(a) === meio), [recorte, plano, meio])
  const contagem = useMemo(() => Object.fromEntries(GRUPOS.map(([g]) => [g, (linhas ?? []).filter(a => passa(a, g) && noRecorte(a)).length])) as Record<Grupo, number>, [linhas, noRecorte])
  const termo = normalizar(busca.trim())
  const visiveis = useMemo(() => (linhas ?? []).filter(a => passa(a, grupo) && noRecorte(a) && combina([a.nome, a.usuario, rotuloPlano(a.plano), situacaoAssinatura(a).rotulo, rotuloMeio(meioDe(a))], termo)), [linhas, grupo, noRecorte, termo])
  // Renovação: a pessoa já tinha uma assinatura paga antes desta (no Pix cada compra é uma linha; passar do Pix ao cartão também).
  const ordemNaPessoa = useMemo(() => {
    const mapa = new Map<LinhaAssinatura, number>(), porPessoa = new Map<string, LinhaAssinatura[]>()
    for (const a of linhas ?? []) if (a.status !== 'pendente' && a.status !== 'falha_pagamento') porPessoa.set(a.id_usuario, [...(porPessoa.get(a.id_usuario) ?? []), a])
    for (const l of porPessoa.values()) l.sort((x, y) => new Date(inicioDe(x)).getTime() - new Date(inicioDe(y)).getTime()).forEach((a, i) => mapa.set(a, i))
    return mapa
  }, [linhas])

  if (!linhas) return p.assinaturasQ.erro ? <Estado tipo="erro" titulo="As assinaturas não carregaram" texto={p.erroDados} /> : <Carregando linhas={8} texto="Carregando as assinaturas…" />

  const colunas: Array<Coluna<LinhaAssinatura>> = [
    { id: 'pessoa', titulo: 'Assinante', ordem: a => (a.nome ?? a.usuario ?? '').toLowerCase(), celula: a => <span className="a3-pessoa-cel">
      <span className="a3-avatar">{iniciais(a.nome ?? a.usuario)}</span>
      <span style={{ minWidth: 0, display: 'grid', gap: 3 }}>
        <span className="a3-nome">{a.nome || a.usuario}</span>
        {a.nome && <span className="a3-sub">{a.usuario}</span>}
        <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(ordemNaPessoa.get(a) ?? 0) > 0 && <Selo contorno>Renovação</Selo>}
          {a.administrador ? <Selo solido>Admin</Selo> : contaDeTeste(a) && <Selo tom="aviso">Teste</Selo>}
        </span>
      </span>
    </span> },
    { id: 'situacao', titulo: 'Situação', rotuloCelular: 'Situação', ordem: a => situacaoAssinatura(a).rotulo, celula: a => { const s = situacaoAssinatura(a); return <span title={s.detalhe} style={{ display: 'grid', gap: 3, justifyItems: 'start' }}><Selo tom={TOM[s.tom]}>{s.rotulo}</Selo>{a.status === 'falha_pagamento' && <span className="a3-sub">{motivoRecusa(a.motivo_falha).texto}</span>}</span> } },
    { id: 'plano', titulo: 'Plano', rotuloCelular: 'Plano', ordem: a => precoDe(a.plano)?.total ?? 0, celula: a => <span>{rotuloPlano(a.plano)} · {rotuloMeio(meioDe(a))}<span className="a3-sub">{precoDe(a.plano) ? reais(precoDe(a.plano)!.total) : '—'}{meioDe(a) === 'cartao' ? (a.cancelar_ao_fim ? ' · não renova' : ' · renova sozinho') : ' · compra avulsa'}</span></span> },
    { id: 'vigencia', titulo: 'Período pago', soLargo: true, ordem: a => a.fim_periodo ?? '', celula: a => <Vigencia a={a} /> },
    { id: 'desde', titulo: 'Desde', numero: true, rotuloCelular: 'Desde', ordem: a => inicioDe(a), celula: a => <span>{data(inicioDe(a))}<span className="a3-sub">{haQuanto(inicioDe(a))}</span></span> },
    { id: 'proxima', titulo: 'Próximo marco', numero: true, soLargo: true, ordem: a => proximaData(a).valor ?? '', celula: a => { const x = proximaData(a); return <span>{x.valor ? data(x.valor) : '—'}<span className="a3-sub">{x.rotulo.toLowerCase()}</span></span> } },
    ...(grupo === 'falha_pagamento' ? [{ id: 'resolver', titulo: '', rotuloCelular: 'Tratado', celula: (a: LinhaAssinatura) => {
      const k = chaveFalha(a), feito = lidos.has(k)
      return <button type="button" className={'a3-botao a3-botao--pequeno ' + (feito ? 'a3-botao--fantasma' : 'a3-botao--contorno')} aria-pressed={feito}
        onClick={() => marcar([k], !feito)}><Icone nome={feito ? 'certo' : 'olho'} tamanho={14} />{feito ? 'Resolvido' : 'Marcar resolvido'}</button>
    } } as Coluna<LinhaAssinatura>] : []),
  ]
  const exportar = () => baixarCsv(`ortoquestoes-assinaturas-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Nome', 'E-mail', 'Plano', 'Meio', 'Situação', 'Assinante desde', 'Última cobrança paga', 'Data', 'Qual data', 'Cancela ao fim', 'Teste'],
    visiveis.map(a => { const x = proximaData(a); return [a.nome, a.usuario, rotuloPlano(a.plano), rotuloMeio(meioDe(a)), situacaoAssinatura(a).rotulo, data(inicioDe(a)), a.ultima_cobranca_em ? data(a.ultima_cobranca_em) : '', x.valor ? data(x.valor) : '', x.rotulo, a.cancelar_ao_fim ? 'sim' : 'não', a.administrador ? 'admin' : contaDeTeste(a) ? 'sim' : ''] }))
  const filtrosAtivos = [
    ...(plano !== 'todos' ? [{ id: 'p', rotulo: rotuloPlano(plano), remover: () => definirPlano('todos') }] : []),
    ...(meio !== 'todos' ? [{ id: 'm', rotulo: rotuloMeio(meio), remover: () => definirMeio('todos') }] : []),
    ...(recorte !== 'tudo' ? [{ id: 'r', rotulo: `Assinou nos ${RECORTES.find(r => r[0] === recorte)![1]}`, remover: () => definirRecorte('tudo') }] : []),
    ...(busca.trim() ? [{ id: 'b', rotulo: `“${busca.trim()}”`, remover: () => definirBusca('') }] : []),
  ]
  const dica = GRUPOS.find(g => g[0] === grupo)![2]

  return <div className="a3-pilha a3-pilha--larga hb hb-assin">
    <header className="hb-cabeca">
      <div className="hb-cabeca__sobre"><b>Assinantes</b><span>uma pessoa por conta, sem teste</span></div>
      <h1>Quem paga, como paga<br />e quando precisa pagar de novo.</h1>
      <p>Cartão renova sozinho no fim do período. Pix é pago uma vez: a pessoa precisa pagar de novo quando o acesso acaba.</p>
      <div className="hb-controles" style={{ marginTop: 14 }}><button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={exportar} disabled={!visiveis.length}><Icone nome="baixar" tamanho={15} />CSV deste recorte</button></div>
    </header>
    <PlacarAssinantes />

    <div className="a3-abas-grandes" role="tablist" aria-label="Situação das assinaturas">
      {GRUPOS.map(([g, rotulo]) => <button key={g} type="button" role="tab" aria-selected={grupo === g} className="a3-aba-grande" onClick={() => definirGrupo(g)}>
        <span className="a3-aba-grande__numero">{inteiro(contagem[g])}</span><span>{rotulo}</span>
      </button>)}
    </div>

    {grupo === 'vigentes' && <RiscoAbandono />}

    <section className="a3-painel" aria-label="Lista de assinaturas">
      <div className="a3-filtros">
        <Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar nome, e-mail, plano ou situação" />
        <label className="a3-filtro"><Icone nome="filtro" tamanho={14} />Plano
          <select value={plano} onChange={e => definirPlano(e.target.value as typeof plano)}><option value="todos">todos</option><option value="mensal">Mensal</option><option value="semestral">Semestral</option><option value="anual">Anual</option></select></label>
        <label className="a3-filtro">Meio
          <select value={meio} onChange={e => definirMeio(e.target.value as typeof meio)}><option value="todos">Pix e cartão</option><option value="pix">Pix</option><option value="cartao">Cartão</option></select></label>
        <label className="a3-filtro"><Icone nome="calendario" tamanho={14} />Assinou
          <select value={recorte} onChange={e => definirRecorte(e.target.value as Recorte)}>{RECORTES.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></label>
      </div>
      <FiltrosAtivos itens={filtrosAtivos} aoLimpar={() => { definirPlano('todos'); definirMeio('todos'); definirRecorte('tudo'); definirBusca('') }} />
      <p className="a3-mudo a3-pequeno" style={{ padding: '0 20px 12px' }} role="status">{dica} Mostrando {inteiro(visiveis.length)} de {inteiro(linhas.length)}.{p.testes ? ' As compras de administrador (selo "Admin") e as de teste do dono (selo "Teste") aparecem aqui e ficam fora dos números.' : ''}</p>
      <Tabela key={grupo} rotulo="Assinaturas" linhas={visiveis} colunas={colunas} chave={a => `${a.id_usuario}:${a.ultima_atualizacao}:${inicioDe(a)}`} porPagina={50}
        ordemInicial={{ coluna: 'desde', sentido: 'desc' }} aoAbrir={a => nav.abrirPessoa(a.id_usuario, 'assinatura')}
        vazio={<div style={{ padding: 20 }}><Estado icone="receita" titulo="Nenhuma assinatura neste recorte" texto={filtrosAtivos.length ? 'Tire um filtro para ver mais.' : undefined} /></div>} />
    </section>
  </div>
}

/**
 * O topo de Assinantes (11/11/2026, Tales: "melhora a página de assinantes"): quantos têm acesso, por plano e por
 * como pagam, e quem vence nos próximos 30 dias (o Pix precisa pagar de novo; o cartão renova sozinho), semana a
 * semana, com o nome de cada pessoa para abrir a ficha.
 */
function PlacarAssinantes() {
  const p = usarPainel()
  const nav = usarNav()
  const d = useMemo(() => {
    if (!p.reais) return null
    const agora = Date.now()
    const carteira = carteiraHoje(p.reais, agora)
    const vig = vigentesPorPessoa(p.reais, agora).filter(a => precoDe(a.plano) && a.fim_periodo)
    const semanas = [0, 1, 2, 3].map(i => ({ de: agora + i * 7 * 86_400_000, ate: agora + (i + 1) * 7 * 86_400_000 }))
    const vencem = semanas.map(s => vig.filter(a => { const f = new Date(a.fim_periodo!).getTime(); return f >= s.de && f < s.ate }).sort((a, b) => a.fim_periodo!.localeCompare(b.fim_periodo!)))
    const pix = vig.filter(a => meioDe(a) === 'pix').length, renova = vig.filter(renovaSozinha).length
    return { carteira, vencem, semanas, pix, renova, desligou: vig.length - pix - renova }
  }, [p.reais])
  if (!d) return null
  const cor = { mensal: 'verde', semestral: 'azul', anual: 'ouro' } as const
  const nomeSemana = (i: number) => i === 0 ? 'Próximos 7 dias' : `Daqui a ${i * 7 + 1}–${(i + 1) * 7} dias`
  return <section className="hb-secao" aria-label="Resumo dos assinantes">
    <div className="hb-placar hb-placar--assin">
      <article className="hb-heroi">
        <span className="hb-kicker">Com acesso pago agora</span>
        <h2 className="hb-heroi__valor">{inteiro(d.carteira.total)}</h2>
        <Composicao rotulo="Assinantes por plano" partes={d.carteira.linhas.map(l => ({ nome: l.nome, valor: l.total, cor: cor[l.plano], detalhe: `${l.pix} Pix · ${l.cartaoRenova} cartão${l.cartaoDesligou ? ` · ${l.cartaoDesligou} desligou` : ''}` }))} />
      </article>
      <dl className="hb-lado">
        <div><dt>Pagam com Pix</dt><dd>{inteiro(d.pix)}</dd><small>precisam pagar de novo a cada vencimento</small></div>
        <div><dt>Cartão que renova sozinho</dt><dd>{inteiro(d.renova)}</dd><small>a cobrança cai no fim do período</small></div>
        <div><dt>Desligaram a renovação</dt><dd>{inteiro(d.desligou)}</dd><small>têm acesso até o fim e depois saem</small></div>
      </dl>
    </div>
    <div className="hb-painel">
      <div className="hb-titulo"><div><h3>Quem vence nos próximos 30 dias</h3><p>Dourado: Pix (precisa pagar de novo). Verde: cartão (renova sozinho). Cinza: desligou a renovação. Toque num nome para abrir a ficha.</p></div></div>
      <div className="hb-vence">{d.vencem.map((l, i) => <div key={i} className="hb-vence__col">
        <h4>{nomeSemana(i)} <b>{l.length}</b></h4>
        {l.length ? <ul>{l.map(a => { const m = meioDe(a), tipo = m === 'pix' ? 'pix' : renovaSozinha(a) ? 'cartao' : 'sai'; return <li key={`${a.id_usuario}${a.fim_periodo}`}><button type="button" className={`hb-vence__pessoa hb-vence__pessoa--${tipo}`} onClick={() => nav.abrirPessoa(a.id_usuario, 'assinatura')}>
          <span>{a.nome || a.usuario}</span><small>{rotuloPlano(a.plano)} · {data(a.fim_periodo)}</small></button></li> })}</ul> : <p className="hb-nota">Ninguém vence.</p>}
      </div>)}</div>
    </div>
  </section>
}
