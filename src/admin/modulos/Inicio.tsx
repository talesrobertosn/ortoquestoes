import { assinaturasNaLista, perfilNaLista } from '../dados/perfilNaLista'
import { ResumoPessoa } from '../ui/ResumoPessoa'
import type { AssinaturaBase } from '../../componentes/admin/receita'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarIndiceBibliotecaLeve } from '../../biblioteca/conteudo'
import { quadroDoDia } from '../../componentes/admin/agora'
import { diaSP } from '../../componentes/admin/estudoHoje'
import { acertoReal, registrarTitulosResumos } from '../../componentes/admin/formatos'
import { CORTESIA_ADMIN, PLANO_CORTESIA, rotuloPlano } from '../../componentes/admin/rotulos'
import { indicacaoEmDestaque, planosEmDestaque, viuPlanos, type SinalUsuario } from '../../componentes/admin/sinais'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { serieLimpa, usarFunil, usarSerie } from '../dados/consultas'
import { Comparacoes, Destaques, Graficos, Termometro } from './central'
import { FaixaMetas } from './metasResumo'
import { usarPainel } from '../dados/painel'
import { nomeDe, type LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { combina, haQuanto, horario, iniciais, inteiro, normalizar, reais } from '../ui/formato'
import { Busca, Carregando, Estado, Painel, Selo } from '../ui/kit'
import { Faz, LinhaDoDia, Listas } from './dia'
import './hub.css'
import { LinhaFila, useIrDestino, usarFila } from './fila'

/** Último sinal da pessoa (aparelho, atividade ou login), para saber se entrou hoje. */
const ultimoSinal = (u: LinhaUsuario) => [u.visto_em, u.ultima_atividade, u.ultimo_login].filter(Boolean).sort().slice(-1)[0] ?? null
const viuHoje = (s: SinalUsuario | undefined, hoje: string) => !!s?.planos_ultima && diaSP(s.planos_ultima) === hoje
/** "às 15:32" se foi hoje, "ontem às 20:10" se foi ontem (o amarelo dura 24 horas). */
const quandoPlanos = (v: string | null | undefined, hoje: string) => !v ? '' : diaSP(v) === hoje ? `às ${horario(v)}` : `ontem às ${horario(v)}`
/** Assinante; lead = abriu os planos nas últimas 24 horas (fica amarelo); grátis = o resto. */
type Tipo = 'assinante' | 'lead' | 'gratis'

/**
 * Temperatura de um não assinante (02/11/2026): soma sinais de interesse em comprar, para saber em quem focar.
 * Viu os planos hoje (+2) ou na semana (+1); bateu o limite grátis hoje (+2); muitas questões no total (+1 a partir
 * de 50, +1 a partir de 200); online agora (+1). Frio 0–1 · Morno 2 · Quente 3–4 · Fervendo 5+.
 */
export function temperatura(u: LinhaUsuario, s: SinalUsuario | undefined, hoje: string, limite: number | null) {
  let pontos = 0
  if (viuHoje(s, hoje)) pontos += 2
  else if (viuPlanos(s, 7)) pontos += 1
  if (limite !== null && limite > 0 && (u.respondidas_hoje ?? 0) >= limite) pontos += 2
  if (u.respondidas >= 50) pontos += 1
  if (u.respondidas >= 200) pontos += 1
  if (u.online) pontos += 1
  const nivel = pontos >= 5 ? 'fervendo' : pontos >= 3 ? 'quente' : pontos === 2 ? 'morno' : 'frio'
  return { pontos, nivel, rotulo: { fervendo: 'Fervendo', quente: 'Quente', morno: 'Morno', frio: 'Frio' }[nivel] } as const
}

/** Os números de cada pessoa, como no painel antigo: número em cima, rótulo embaixo. Hoje e total em destaque. */
function Questoes({ u }: { u: LinhaUsuario }) {
  const hoje = u.respondidas_hoje ?? 0
  // Acerto real (Tales, 11/11/2026): primeira tentativa de cada questão, não o acerto depois da revisão.
  const real = acertoReal(u)
  return <span className="a3-numeros-pessoa" aria-label={`${hoje} questões hoje, ${u.respondidas} no total`}>
    <span className={'destaque' + (hoje ? '' : ' zero')}><b className="num">{inteiro(hoje)}</b><small>hoje</small></span>
    <span className="destaque"><b className="num">{inteiro(u.respondidas)}</b><small>no total</small></span>
    <span><b className="num">{inteiro(u.respondidas_7d)}</b><small>na semana</small></span>
    <span title="Acerto real: a primeira tentativa de cada questão"><b className="num">{real === null ? '—' : `${real}%`}</b><small>acerto real</small></span>
  </span>
}

/** Quanto do limite grátis do dia a pessoa já usou (só com o limite ligado). */
function Limite({ u, limite }: { u: LinhaUsuario; limite: number | null }) {
  if (limite === null || limite <= 0) return null
  const hoje = u.respondidas_hoje ?? 0
  const pct = Math.min(1, hoje / limite)
  const bateu = hoje >= limite
  return <span className={'a3-limite' + (bateu ? ' bateu' : pct >= .7 ? ' perto' : '')}>
    <span className="a3-limite__trilho" aria-hidden="true"><i style={{ width: `${pct * 100}%` }} /></span>
    <small>{bateu ? `bateu o limite grátis (${limite})` : `${hoje} de ${limite} grátis hoje`}</small>
  </span>
}

function Temperatura({ t }: { t: ReturnType<typeof temperatura> }) {
  return <b className={`a3-temp a3-temp--${t.nivel}`} title="Viu os planos, bateu o limite, questões no total e online agora">{t.rotulo}</b>
}

type Filtro = 'todos' | 'assinante' | 'nao' | 'lead'
/** As listas da página: o que está acontecendo agora e tudo de hoje. Cada número do topo abre uma delas. */
type Vista = 'online' | 'entraram' | 'assinantes' | 'viram' | 'limite' | 'estudaram' | 'cadastros' | 'ausentes' | 'viram30'
// 12 de cada vez: a linha do dia fica logo abaixo, sem rolar demais (Tales, 04/11/2026).
const POR_VEZ = 12

/**
 * Página inicial do painel (revisão de 02/11/2026, pedido do Tales: "botões clicáveis, mostrar fácil assinantes hoje e
 * tudo de hoje"). De cima para baixo:
 * 1. Topo com dois grupos de números, todos clicáveis: "Agora no site" (online, assinantes online, não assinantes online)
 *    e "Hoje" (quem entrou: total, assinantes e não assinantes; assinantes ausentes, viram os planos, bateram o limite, estudaram, cadastros, recebido).
 * 2. Pessoas: UMA lista com abas (online agora, assinantes hoje, viram os planos hoje, bateram o limite, estudaram hoje,
 *    cadastros hoje, assinantes que não entraram, viram os planos em 30 dias). Clicar num número abre a aba certa.
 * 3. Pede ação e a linha do dia; 4. as tabelas do dia.
 * A lista de pessoas se atualiza a cada 3 minutos e o resto a cada 5; o botão Atualizar busca na hora.
 */
export default function Inicio() {
  const p = usarPainel()
  const nav = usarNav()
  const assinaturas = useMemo(() => assinaturasNaLista(p.assinaturas ?? []), [p.assinaturas])
  // 35 dias: os gráficos comparam semanas; continua uma consulta só, a cada 5 minutos.
  const serieQ = usarSerie(35, true)
  const { funil } = usarFunil()
  const fila = usarFila()
  const irDestino = useIrDestino()
  const [vista, definirVista] = useState<Vista>('online')
  const [filtro, definirFiltro] = useState<Filtro>('todos')
  const [busca, definirBusca] = useState('')
  const [limiteLista, definirLimiteLista] = useState(POR_VEZ)
  const [, recontar] = useState(0)
  useEffect(() => { carregarIndiceBibliotecaLeve().then(i => { registrarTitulosResumos(i.capitulos); recontar(k => k + 1) }).catch(() => undefined) }, [])
  useEffect(() => { definirLimiteLista(POR_VEZ) }, [vista, filtro, busca])
  const sinaisLista = Array.isArray(p.sinaisQ.dados) ? p.sinaisQ.dados : null
  const quadro = useMemo(() => quadroDoDia({ usuarios: p.usuarios, sinais: sinaisLista, serie: Array.isArray(serieQ.dados) ? serieQ.dados : null, resumo: p.resumo, funil, assinaturas: p.reais, cobrancas: p.cobrancas }),
    [p.usuarios, sinaisLista, serieQ.dados, p.resumo, funil, p.reais, p.cobrancas])
  const nm = quadro.numeros
  const configQ = usarRpc<Array<{ paywall_ativo: boolean; limite_diario_gratis: number }>>(p.conta, 'obter_config_comercial_admin')
  const cfg = Array.isArray(configQ.dados) ? configQ.dados[0] : undefined
  const limite = cfg?.paywall_ativo ? Number(cfg.limite_diario_gratis) : null

  const g = useMemo(() => {
    if (!p.usuarios) return null
    const hoje = diaSP(Date.now())
    const sinal = (u: LinhaUsuario) => p.sinais.get(u.id_usuario)
    // Administrador conta como assinante no "Agora no site" (Tales, 05/11/2026): tem acesso completo, então não é
    // "não assinante" nem possível pagador. Continua fora das listas de quem paga (assinantes hoje, ausentes).
    const tipoDe = (u: LinhaUsuario): Tipo => u.administrador || u.plano_vigente ? 'assinante' : planosEmDestaque(sinal(u)?.planos_ultima) ? 'lead' : 'gratis'
    const ordemTipo: Record<Tipo, number> = { lead: 0, assinante: 1, gratis: 2 }
    // Administradores aparecem no que é presença (online, estudaram, cadastros), com o selo "Admin" (Tales, 03/11/2026),
    // e ficam fora das listas de quem paga ou pode pagar (assinantes, viram os planos, limite, ausentes).
    const pessoas = p.usuarios.filter(u => !u.administrador)
    const recente = (a: LinhaUsuario, b: LinhaUsuario) => (ultimoSinal(b) ?? '').localeCompare(ultimoSinal(a) ?? '')
    const porPlanos = (a: LinhaUsuario, b: LinhaUsuario) => (sinal(b)?.planos_ultima ?? '').localeCompare(sinal(a)?.planos_ultima ?? '')
    const online = p.usuarios.filter(u => u.online).sort((a, b) => ordemTipo[tipoDe(a)] - ordemTipo[tipoDe(b)]
      || temperatura(b, sinal(b), hoje, limite).pontos - temperatura(a, sinal(a), hoje, limite).pontos
      || (b.pagina_em ?? b.visto_em ?? '').localeCompare(a.pagina_em ?? a.visto_em ?? ''))
    const assinantes = pessoas.filter(u => u.plano_vigente)
    const entrouHoje = (u: LinhaUsuario) => { const s = ultimoSinal(u); return !!s && diaSP(s) === hoje }
    const porQuestoes = (a: LinhaUsuario, b: LinhaUsuario) => (b.respondidas_hoje ?? 0) - (a.respondidas_hoje ?? 0) || recente(a, b)
    const comOnlinePrimeiro = (a: LinhaUsuario, b: LinhaUsuario) => Number(b.online) - Number(a.online) || porQuestoes(a, b)
    // Todos que entraram hoje (Tales, 14/11/2026: "mostrar também os não assinantes e o total"), sem administradores.
    const entraram = pessoas.filter(entrouHoje).sort(comOnlinePrimeiro)
    const listas: Record<Vista, LinhaUsuario[]> = {
      online,
      entraram,
      assinantes: assinantes.filter(entrouHoje).sort((a, b) => Number(b.online) - Number(a.online) || porQuestoes(a, b)),
      viram: pessoas.filter(u => !u.plano_vigente && viuHoje(sinal(u), hoje)).sort(porPlanos),
      limite: limite ? pessoas.filter(u => !u.plano_vigente && (u.respondidas_hoje ?? 0) >= limite).sort(porQuestoes) : [],
      estudaram: quadro.estudaram.map(f => f.pessoa).sort(porQuestoes),
      cadastros: p.usuarios.filter(u => diaSP(u.criado_em) === hoje).sort((a, b) => b.criado_em.localeCompare(a.criado_em)),
      ausentes: assinantes.filter(u => !entrouHoje(u)).sort(recente),
      viram30: pessoas.filter(u => !u.plano_vigente && viuPlanos(sinal(u)) && !viuHoje(sinal(u), hoje)).sort(porPlanos),
    }
    return {
      hoje, tipoDe, listas, totalAssinantes: assinantes.length, cortesias: assinantes.filter(u => u.plano_vigente === PLANO_CORTESIA).length,
      planos: (['mensal', 'semestral', 'anual'] as const).map(pl => ({ pl, n: assinantes.filter(u => u.plano_vigente === pl).length })),
      hojeConta: { assinante: entraram.filter(u => u.plano_vigente).length, nao: entraram.filter(u => !u.plano_vigente).length,
        novos: entraram.filter(u => !u.plano_vigente && diaSP(u.criado_em) === hoje).length },
      conta: { assinante: online.filter(u => tipoDe(u) === 'assinante').length, lead: online.filter(u => tipoDe(u) === 'lead').length, gratis: online.filter(u => tipoDe(u) === 'gratis').length },
    }
  }, [p.usuarios, p.sinais, limite, quadro.estudaram])
  const semSinais = !p.sinaisQ.dados
  const termo = normalizar(busca.trim())
  const comFiltro = vista === 'online' || vista === 'entraram'
  const daVista = g ? g.listas[vista].filter(u => (!comFiltro || filtro === 'todos' || (filtro === 'nao' ? g.tipoDe(u) !== 'assinante' : g.tipoDe(u) === filtro)) && combina([u.nome, u.email, perfilNaLista(u).etapa, ...perfilNaLista(u).objetivos], termo)) : []
  const vistos = daVista.slice(0, limiteLista)

  /** Abre uma lista a partir de um número do topo e rola até ela. */
  const abrir = (v: Vista, f: Filtro = 'todos') => {
    definirVista(v); definirFiltro(f); definirBusca('')
    requestAnimationFrame(() => document.getElementById('a3-pessoas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const ativo = (v: Vista, f: Filtro = 'todos') => vista === v && ((v !== 'online' && v !== 'entraram') || filtro === f)
  const n = (v: Vista) => g ? g.listas[v].length : null
  const dataHoje0 = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo' })
  const dataHoje = dataHoje0.charAt(0).toUpperCase() + dataHoje0.slice(1)

  const VISTAS: Array<{ id: Vista; rotulo: string; titulo: string; texto: string }> = [
    { id: 'online', rotulo: 'Online agora', titulo: 'Online agora', texto: 'Quem usou o site nos últimos 5 minutos. Quem viu os planos hoje vem primeiro.' },
    { id: 'entraram', rotulo: 'Entraram hoje', titulo: 'Entraram hoje', texto: `${n('entraram') ?? 0} ${n('entraram') === 1 ? 'pessoa entrou' : 'pessoas entraram'} hoje: ${g?.hojeConta.assinante ?? 0} assinantes e ${g?.hojeConta.nao ?? 0} não assinantes. Online primeiro, depois quem mais respondeu.` },
    { id: 'assinantes', rotulo: 'Assinantes hoje', titulo: 'Assinantes que entraram hoje', texto: `${n('assinantes') ?? 0} de ${g?.totalAssinantes ?? 0} assinantes entraram hoje. Online primeiro, depois quem mais respondeu.` },
    { id: 'viram', rotulo: 'Viram os planos hoje', titulo: 'Viram os planos hoje', texto: 'Não assinantes que abriram a página de preços hoje, online ou não. Os mais quentes para uma carta.' },
    ...(limite ? [{ id: 'limite' as Vista, rotulo: 'Bateram o limite', titulo: 'Bateram o limite grátis hoje', texto: `Responderam as ${limite} questões grátis do dia e ficaram sem.` }] : []),
    { id: 'estudaram', rotulo: 'Estudaram hoje', titulo: 'Estudaram hoje', texto: 'Questões, flashcards ou resumos hoje. Quem mais respondeu primeiro.' },
    { id: 'cadastros', rotulo: 'Cadastros hoje', titulo: 'Criaram a conta hoje', texto: 'Do mais recente ao mais antigo.' },
    { id: 'ausentes', rotulo: 'Assinantes que não entraram', titulo: 'Assinantes que não entraram hoje', texto: 'Quem paga e ainda não apareceu hoje. Quem sumiu há mais tempo fica no fim.' },
    { id: 'viram30', rotulo: 'Viram os planos em 30 dias', titulo: 'Viram os planos nos últimos 30 dias', texto: 'Não assinantes que olharam os preços antes de hoje e não estão online.' },
  ]
  const atual = VISTAS.find(v => v.id === vista) ?? VISTAS[0]
  const vazio: Record<Vista, string> = { online: g?.listas.online.length ? 'Ninguém neste filtro agora' : 'Ninguém online agora', entraram: g?.listas.entraram.length ? 'Ninguém neste filtro hoje' : 'Ninguém entrou hoje ainda', assinantes: 'Nenhum assinante entrou hoje ainda', viram: semSinais ? 'Sinal de planos indisponível' : 'Ninguém viu os planos hoje', limite: 'Ninguém bateu o limite hoje', estudaram: 'Ninguém estudou hoje ainda', cadastros: 'Nenhum cadastro hoje ainda', ausentes: 'Todos os assinantes entraram hoje', viram30: 'Ninguém nos últimos 30 dias' }

  return <div className="a3-pilha a3-pilha--larga">
    <section className="ag-topo" aria-label="Resumo de agora e de hoje">
      <header className="ag-topo__cab">
        <div><h1 className="ag-topo__titulo">Agora</h1><span className="ag-topo__data">{dataHoje}</span></div>
        {g && <p className="ag-topo__frase"><i className="ag-pulso" aria-hidden="true" />{g.listas.online.length} {g.listas.online.length === 1 ? 'pessoa online' : 'pessoas online'} · {inteiro(n('entraram') ?? 0)} {n('entraram') === 1 ? 'entrou' : 'entraram'} hoje ({g.hojeConta.assinante} {g.hojeConta.assinante === 1 ? 'assinante' : 'assinantes'} e {g.hojeConta.nao} não) · {inteiro(n('estudaram') ?? 0)} {n('estudaram') === 1 ? 'estudou' : 'estudaram'}</p>}
      </header>
      {g && <div className="ag-topo__grade">
        <div className="ag-vivo">
          <div className="ag-vivo__cab"><h2><i className="ag-pulso" aria-hidden="true" />Agora no site</h2><small>últimos 5 minutos</small></div>
          <button type="button" className={'ag-vivo__total' + (ativo('online') ? ' ativo' : '')} aria-pressed={ativo('online')} onClick={() => abrir('online')}><b className="num">{g.listas.online.length}</b><span>{g.listas.online.length === 1 ? 'pessoa online' : 'pessoas online'}<small>ver quem é ›</small></span></button>
          <div className="ag-vivo__barra" role="img" aria-label={`${g.conta.assinante} assinantes, ${g.conta.lead} viram os planos, ${g.conta.gratis} grátis`}>
            {g.conta.assinante > 0 && <i className="ag-c-assinante" style={{ flexGrow: g.conta.assinante }} />}{g.conta.lead > 0 && <i className="ag-c-lead" style={{ flexGrow: g.conta.lead }} />}{g.conta.gratis > 0 && <i className="ag-c-gratis" style={{ flexGrow: g.conta.gratis }} />}{!g.listas.online.length && <i className="ag-c-vazio" style={{ flexGrow: 1 }} />}
          </div>
          <div className="ag-vivo__tipos">
            <button type="button" aria-pressed={ativo('online', 'assinante')} onClick={() => abrir('online', 'assinante')}><i className="ag-c-assinante" />Assinantes <b>{g.conta.assinante}</b><small>de {g.totalAssinantes}</small></button>
            <button type="button" aria-pressed={ativo('online', 'nao')} onClick={() => abrir('online', 'nao')}><i className="ag-c-gratis" />Não assinantes <b>{g.conta.gratis + g.conta.lead}</b><small>{g.conta.lead ? `${g.conta.lead} ${g.conta.lead === 1 ? 'viu' : 'viram'} os planos` : 'online agora'}</small></button>
          </div>
          {g.listas.online.length > 0 && <ul className="ag-rostos" aria-label="Quem está online">{g.listas.online.slice(0, 14).map(u => <li key={u.id_usuario}><button type="button" className={`ag-rosto ag-rosto--${g.tipoDe(u)}`} title={`${nomeDe(u)} · ${g.tipoDe(u) === 'assinante' ? 'assinante' : g.tipoDe(u) === 'lead' ? 'viu os planos' : 'grátis'}`} onClick={() => nav.abrirPessoa(u.id_usuario)}>{iniciais(nomeDe(u))}</button></li>)}{g.listas.online.length > 14 && <li><button type="button" className="ag-rosto ag-rosto--mais" onClick={() => abrir('online')}>+{g.listas.online.length - 14}</button></li>}</ul>}
        </div>
        <div className="ag-hoje">
          <div className="ag-vivo__cab"><h2>Hoje</h2><small>desde a meia-noite</small></div>
          {/* Quem entrou hoje: o total, a barra assinantes × não assinantes e um botão para cada lado (14/11/2026). */}
          <div className="ag-entraram">
            <button type="button" className={'ag-vivo__total ag-entraram__total' + (ativo('entraram') ? ' ativo' : '')} aria-pressed={ativo('entraram')} onClick={() => abrir('entraram')}>
              <b className="num">{inteiro(n('entraram') ?? 0)}</b><span>{n('entraram') === 1 ? 'pessoa entrou hoje' : 'pessoas entraram hoje'}<small>ver quem é ›</small></span>
            </button>
            <div className="ag-vivo__barra" role="img" aria-label={`${g.hojeConta.assinante} assinantes e ${g.hojeConta.nao} não assinantes entraram hoje`}>
              {g.hojeConta.assinante > 0 && <i className="ag-c-assinante" style={{ flexGrow: g.hojeConta.assinante }} />}{g.hojeConta.nao > 0 && <i className="ag-c-gratis" style={{ flexGrow: g.hojeConta.nao }} />}{!n('entraram') && <i className="ag-c-vazio" style={{ flexGrow: 1 }} />}
            </div>
            <div className="ag-vivo__tipos">
              <button type="button" aria-pressed={ativo('entraram', 'assinante')} onClick={() => abrir('entraram', 'assinante')}><i className="ag-c-assinante" />Assinantes <b>{g.hojeConta.assinante}</b>
                <small>de {g.totalAssinantes}{g.totalAssinantes ? ` · ${Math.round(g.hojeConta.assinante / g.totalAssinantes * 100)}%` : ''}</small></button>
              <button type="button" aria-pressed={ativo('entraram', 'nao')} onClick={() => abrir('entraram', 'nao')}><i className="ag-c-gratis" />Não assinantes <b>{g.hojeConta.nao}</b>
                <small>{g.hojeConta.novos ? `${g.hojeConta.novos} ${g.hojeConta.novos === 1 ? 'conta nova' : 'contas novas'} hoje` : 'grátis e quem viu os planos'}</small></button>
            </div>
          </div>
          <div className="ag-hoje__grade">
            <Numero cor="assinante" rotulo="Ausentes" valor={n('ausentes')} nota="assinantes sem entrar hoje" ativo={ativo('ausentes')} aoClicar={() => abrir('ausentes')} />
            <Numero cor="lead" rotulo="Viram os planos" valor={semSinais ? null : n('viram')} nota={semSinais ? 'sinal indisponível' : 'não assinantes'} ativo={ativo('viram')} aoClicar={() => abrir('viram')} />
            {limite ? <Numero cor="gratis" rotulo="Bateram o limite" valor={n('limite')} nota={`de ${limite} grátis`} ativo={ativo('limite')} aoClicar={() => abrir('limite')} /> : null}
            <Numero cor="claro" rotulo="Estudaram" valor={n('estudaram')} nota={`${inteiro(g.listas.estudaram.reduce((t, u) => t + (u.respondidas_hoje ?? 0), 0))} questões`} ativo={ativo('estudaram')} aoClicar={() => abrir('estudaram')} />
            <Numero cor="claro" rotulo="Cadastros" valor={n('cadastros')} nota={nm.cadastros7d !== null ? `${inteiro(nm.cadastros7d)} em 7 dias` : 'hoje'} ativo={ativo('cadastros')} aoClicar={() => abrir('cadastros')} />
            <Numero cor="dinheiro" rotulo="Recebido" valor={nm.valorPago.hoje} formato={reais} nota={nm.valorPago.hoje === null ? 'hoje' : `${inteiro(nm.pagaram.hoje ?? 0)} ${nm.pagaram.hoje === 1 ? 'pagamento' : 'pagamentos'}`} aoClicar={() => nav.ir('cobrancas')} />
            <button type="button" className="ag-acesso" onClick={() => nav.ir('assinaturas')} aria-label={`${g.totalAssinantes} assinantes com acesso: ${g.planos.map(x => `${x.n} ${x.pl}`).join(', ')}${g.cortesias ? `, ${g.cortesias} cortesias` : ''}. Abrir Assinantes`}>
              <span className="ag-acesso__topo"><i aria-hidden="true" />Assinantes com acesso<b>{inteiro(g.totalAssinantes)}</b></span>
              <span className="ag-acesso__barra" aria-hidden="true">{g.planos.map(x => x.n > 0 && <i key={x.pl} className={`ag-plano-${x.pl}`} style={{ flexGrow: x.n }} />)}{g.cortesias > 0 && <i className="ag-plano-cortesia" style={{ flexGrow: g.cortesias }} />}</span>
              <span className="ag-acesso__lista">{g.planos.map(x => <span key={x.pl}><i className={`ag-plano-${x.pl}`} aria-hidden="true" />{x.pl === 'mensal' ? 'Mensal' : x.pl === 'semestral' ? 'Semestral' : 'Anual'} <b>{x.n}</b></span>)}{g.cortesias > 0 && <span><i className="ag-plano-cortesia" aria-hidden="true" />Cortesia <b>{g.cortesias}</b></span>}<span className="ag-acesso__ir">ver assinantes ›</span></span>
            </button>
          </div>
        </div>
      </div>}
    </section>

    {!g ? <div className="a3-painel" style={{ padding: 20 }}>{p.usuariosQ.erro ? <Estado tipo="erro" titulo="A lista de pessoas não carregou" texto={p.erroDados} /> : <Carregando linhas={5} texto="Vendo quem está online…" />}</div> :
      <section className="a3-painel a3-ancora" id="a3-pessoas" aria-label="Pessoas">
        <div className="a3-abas-locais a3-abas-locais--rolam" role="tablist" aria-label="Qual lista">
          {VISTAS.map(v => <button key={v.id} type="button" role="tab" aria-selected={vista === v.id} className={v.id === 'online' ? 'vivo' : undefined}
            onClick={() => { definirVista(v.id); definirFiltro('todos') }}>{v.rotulo}<span className="a3-cont">{n(v.id)}</span></button>)}
        </div>
        <div className="a3-secao-cabeca">
          <div><h2>{vista === 'online' && <i className="a3-ponto a3-ponto--vivo" aria-hidden="true" />} {atual.titulo} <span className="a3-bolha">{daVista.length}</span></h2><p>{atual.texto}</p></div>
        </div>
        <div className="a3-filtros">
          {vista === 'entraram' && <div className="a3-chips" role="group" aria-label="Filtrar quem entrou hoje">
            <Filtro ativo={filtro === 'todos'} aoClicar={() => definirFiltro('todos')} contagem={g.listas.entraram.length}>Todos</Filtro>
            <Filtro ativo={filtro === 'assinante'} aoClicar={() => definirFiltro('assinante')} contagem={g.hojeConta.assinante}>Assinantes</Filtro>
            <Filtro ativo={filtro === 'nao'} aoClicar={() => definirFiltro('nao')} contagem={g.hojeConta.nao}>Não assinantes</Filtro>
          </div>}
          {vista === 'online' && <div className="a3-chips" role="group" aria-label="Filtrar quem está online">
            <Filtro ativo={filtro === 'todos'} aoClicar={() => definirFiltro('todos')} contagem={g.listas.online.length}>Todos</Filtro>
            <Filtro ativo={filtro === 'assinante'} aoClicar={() => definirFiltro('assinante')} contagem={g.conta.assinante}>Assinantes</Filtro>
            <Filtro ativo={filtro === 'nao'} aoClicar={() => definirFiltro('nao')} contagem={g.conta.gratis + g.conta.lead}>Não assinantes</Filtro>
            <Filtro ativo={filtro === 'lead'} aoClicar={() => definirFiltro('lead')} contagem={g.conta.lead}>Viram os planos em 24 h</Filtro>
          </div>}
          <Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar por nome, e-mail, etapa ou objetivo" />
        </div>
        {!daVista.length ? <div style={{ padding: 20 }}><Estado compacto icone={vista === 'ausentes' ? 'certo' : 'pessoas'} titulo={termo ? 'Ninguém com esse nome nesta lista' : vazio[vista]} /></div> : <>
          <ul className="a3-pessoas-lista">{vistos.map(u => u.online
            ? <LinhaOnline key={u.id_usuario} u={u} assinatura={assinaturas.get(u.id_usuario)} tipo={g.tipoDe(u)} hoje={g.hoje} limite={limite} />
            : <LinhaFora key={u.id_usuario} u={u} assinatura={assinaturas.get(u.id_usuario)} tipo={g.tipoDe(u)} hoje={g.hoje} />)}</ul>
          {daVista.length > limiteLista && <div className="a3-paginacao"><span>{vistos.length} de {daVista.length}</span>
            <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => definirLimiteLista(daVista.length)}>Ver todos os {daVista.length}</button></div>}
        </>}
      </section>}
    <Comparacoes />
    <FaixaMetas chaves={['faturamento', 'cadastros', 'novosPagantes', 'ativosFim']} />


    <div className="a3-grade a3-grade--12" style={{ alignItems: 'start' }}>
      <div style={{ gridColumn: 'span 5' }} id="a3-acao" className="a3-ancora">
        <Painel justo titulo={fila.length ? 'Pede ação' : 'Nada pedindo ação'} descricao={fila.length ? 'Do mais grave ao menos grave' : 'Sem falha de pagamento, relato aberto ou fonte fora do ar.'}>
          {fila.length ? <ol className="a3-fila">{fila.map(i => <LinhaFila key={i.id} item={i} aoAgir={irDestino} />)}</ol>
            : <div style={{ padding: '0 20px 20px' }}><Estado compacto icone="certo" titulo="Tudo em dia" /></div>}
        </Painel>
      </div>
      <div style={{ gridColumn: 'span 7' }} id="a3-linha" className="a3-ancora"><LinhaDoDia quadro={quadro} /></div>
    </div>

    <section className="cr-secao" aria-labelledby="cc-observatorio">
      <header className="cr-secao__cabeca"><span className="cr-secao__numero" aria-hidden="true"><Icone nome="grafico" tamanho={16} /></span><div><h2 id="cc-observatorio">Números do dia a dia</h2><p>Cadastros, estudo, questões e assinaturas em colunas, quem está perto de assinar e quem mais estudou.</p></div></header>
      <Graficos serie={serieLimpa(serieQ.dados)} />
      <div className="cr-grade-2"><Termometro limite={limite} /><Destaques /></div>
    </section>

    <div id="a3-listas" className="a3-ancora"><Listas quadro={quadro} /></div>
    <p className="a3-mudo a3-pequeno">Online é quem deu sinal nos últimos 5 minutos. A lista de pessoas se atualiza sozinha a cada 3 minutos e o resto a cada 5; o botão Atualizar, lá em cima, busca na hora.</p>
  </div>
}

function Numero({ cor, rotulo, valor, nota, ativo, aoClicar, formato = inteiro }: { cor: 'vivo' | 'claro' | 'dinheiro' | Tipo; rotulo: string; valor: number | null; nota: string; ativo?: boolean; aoClicar: () => void; formato?: (n: number) => string }) {
  return <button type="button" className={`ag-numero ag-numero--${cor}`} aria-pressed={ativo ?? false} onClick={aoClicar}>
    <span><i aria-hidden="true" />{rotulo}</span>
    <b className="num">{valor === null ? '—' : formato(valor)}</b>
    <small>{nota}</small>
  </button>
}

function Filtro({ ativo, aoClicar, contagem, children }: { ativo: boolean; aoClicar: () => void; contagem: number; children: ReactNode }) {
  return <button type="button" className="a3-chip" aria-pressed={ativo} onClick={aoClicar}>{children}<span>{inteiro(contagem)}</span></button>
}

/** "Assinante · Anual" ou só "Cortesia" (quem tem acesso de presente, sem pagar). */
const rotuloAssinante = (plano: string | null) => plano === PLANO_CORTESIA ? 'Cortesia' : `Assinante · ${rotuloPlano(plano)}`
const ROTULO_TIPO: Record<Tipo, string> = { assinante: 'Assinante', lead: 'Viu os planos em 24 h', gratis: 'Não assinante' }

export function LinhaOnline({ u, tipo, hoje, limite, assinatura }: { assinatura?: AssinaturaBase; u: LinhaUsuario; tipo: Tipo; hoje: string; limite: number | null }) {
  const p = usarPainel()
  const nav = usarNav()
  const s = p.sinais.get(u.id_usuario)
  return <li className={tipo + (indicacaoEmDestaque(s?.indicacao_ultima) ? ' a3-indicacao' : '')}>
    <button type="button" className="a3-pessoa-linha" onClick={() => nav.abrirPessoa(u.id_usuario)}>
      <span className="a3-avatar">{iniciais(u.nome ?? u.email)}<i className="a3-ponto a3-ponto--vivo" /></span>
      <span className="a3-pessoa-linha__texto">
        <ResumoPessoa usuario={u} assinatura={assinatura} carregando={!p.assinaturas && !p.assinaturasQ.erro} mostrarEmail={false}>
          {u.administrador ? <><b className="a3-tag a3-tag--suave">{CORTESIA_ADMIN}</b><Selo solido>Admin</Selo></>
            : tipo === 'assinante' ? <b className="a3-tag a3-tag--assinante">{rotuloAssinante(u.plano_vigente)}</b>
            : tipo === 'lead' ? <b className="a3-tag a3-tag--lead">Viu os planos {quandoPlanos(s?.planos_ultima, hoje)}</b>
            : <b className="a3-tag a3-tag--suave">Não assinante</b>}
          {tipo !== 'assinante' && !u.administrador && <Temperatura t={temperatura(u, s, hoje, limite)} />}
        </ResumoPessoa>
        <span className="a3-pessoa-linha__faz"><Faz u={u} /></span>
        <span className="a3-pessoa-linha__meta">
          {indicacaoEmDestaque(s?.indicacao_ultima) && <span className="a3-tag a3-tag--indicacao" title={s?.indicacao_ultima ? `Última visita: ${new Date(s.indicacao_ultima).toLocaleString('pt-BR')}` : undefined}>Viu Indique e ganhe em 24 h · {haQuanto(s?.indicacao_ultima)}</span>}
          {tipo !== 'assinante' && !u.administrador && <Limite u={u} limite={limite} />}
          {tipo === 'gratis' && !u.administrador && viuPlanos(s) && <span>viu os planos {haQuanto(s?.planos_ultima)}</span>}
          {tipo !== 'assinante' && <span>conta {haQuanto(u.criado_em)}</span>}
          {u.aparelho && <span>{u.aparelho}</span>}
        </span>
      </span>
    </button>
    <span className="a3-pessoa-linha__acoes">
      <Questoes u={u} />
      <span className="a3-pessoa-linha__links">
        <button type="button" className="a3-link-acao" onClick={() => nav.abrirPessoa(u.id_usuario)}><Icone nome="usuario" tamanho={15} />Ver ficha</button>
        {!u.administrador && <button type="button" className="a3-link-acao" onClick={() => nav.abrirPessoa(u.id_usuario, 'carta')}><Icone nome="carta" tamanho={15} />Enviar carta</button>}
      </span>
    </span>
  </li>
}

export function LinhaFora({ u, tipo, hoje, assinatura }: { assinatura?: AssinaturaBase; u: LinhaUsuario; tipo: Tipo; hoje: string }) {
  const p = usarPainel()
  const nav = usarNav()
  const s = p.sinais.get(u.id_usuario)
  const sinal = ultimoSinal(u)
  return <li className={tipo + (indicacaoEmDestaque(s?.indicacao_ultima) ? ' a3-indicacao' : '')}>
    <button type="button" className="a3-pessoa-linha" onClick={() => nav.abrirPessoa(u.id_usuario)}>
      <span className="a3-avatar">{iniciais(u.nome ?? u.email)}</span>
      <span className="a3-pessoa-linha__texto">
        <ResumoPessoa usuario={u} assinatura={assinatura} carregando={!p.assinaturas && !p.assinaturasQ.erro} mostrarEmail={false}>{u.administrador ? <><b className="a3-tag a3-tag--suave">{CORTESIA_ADMIN}</b><Selo solido>Admin</Selo></>
          : <b className={`a3-tag a3-tag--${tipo === 'assinante' ? 'assinante' : tipo === 'lead' ? 'lead' : 'suave'}`}>{tipo === 'assinante' ? rotuloAssinante(u.plano_vigente) : ROTULO_TIPO[tipo]}</b>}</ResumoPessoa>
        <span className="a3-pessoa-linha__meta">
          {indicacaoEmDestaque(s?.indicacao_ultima) && <span className="a3-tag a3-tag--indicacao" title={s?.indicacao_ultima ? `Última visita: ${new Date(s.indicacao_ultima).toLocaleString('pt-BR')}` : undefined}>Viu Indique e ganhe em 24 h · {haQuanto(s?.indicacao_ultima)}</span>}
          <span>{sinal ? `última vez ${haQuanto(sinal)}` : 'nunca entrou'}</span>
          {viuPlanos(s) && <span>viu os planos {tipo === 'lead' ? quandoPlanos(s?.planos_ultima, hoje) : haQuanto(s?.planos_ultima)} · {s?.planos_vezes ?? 0} {s?.planos_vezes === 1 ? 'vez' : 'vezes'} em 30 dias</span>}
        </span>
      </span>
    </button>
    <span className="a3-pessoa-linha__acoes">
      <Questoes u={u} />
      <span className="a3-pessoa-linha__links">
        <button type="button" className="a3-link-acao" onClick={() => nav.abrirPessoa(u.id_usuario)}><Icone nome="usuario" tamanho={15} />Ver ficha</button>
        {!u.administrador && <button type="button" className="a3-link-acao" onClick={() => nav.abrirPessoa(u.id_usuario, 'carta')}><Icone nome="carta" tamanho={15} />Enviar carta</button>}
      </span>
    </span>
  </li>
}
