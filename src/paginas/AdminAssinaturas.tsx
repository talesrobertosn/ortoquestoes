import { useCallback, useEffect, useMemo, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { AdminConteudo, type VistaConteudo } from '../componentes/admin/AdminConteudo'
import { AdminCrescimento } from '../componentes/admin/AdminCrescimento'
import { AdminConfiguracoes } from '../componentes/admin/AdminConfiguracoes'
import { AdminUsuarios, type LinhaUsuario } from '../componentes/admin/AdminUsuarios'
import {
  PLANOS, STATUS_ASSINATURA, STATUS_EVENTO, TIPOS_EVENTO, baixarCsv, corresponde, data, dataHora, erroDoPainel, haQuanto, nomeErro, normalizar,
} from '../componentes/admin/formatos'

interface LinhaAssinatura {
  id_usuario: string
  usuario: string
  plano: string
  status: string
  proxima_cobranca: string | null
  ultima_atualizacao: string
  // Da migração 202609290100 em diante.
  nome?: string | null
  criada_em?: string | null
  inicio_periodo?: string | null
  fim_periodo?: string | null
  ultima_cobranca_em?: string | null
  cancelar_ao_fim?: boolean
  // Da migração 202609290200 em diante.
  cancelada_em?: string | null
}
interface LinhaEvento {
  id: number
  id_evento: string
  tipo: string | null
  id_recurso: string | null
  status_processamento: string
  erro: string | null
  recebido_em: string
  processado_em: string | null
}
interface Resumo {
  online_agora: number
  usuarios: number; novos_7d: number
  ativos_hoje: number; ativos_7d: number; ativos_30d: number
  respondidas_hoje: number; respondidas_7d: number
  assinantes_vigentes: number
}

type Aba = 'geral' | 'usuarios' | 'conteudo' | 'crescimento' | 'assinaturas' | 'pagamentos' | 'configuracoes'
const ABAS: Array<[Aba, string, NomeIcone]> = [
  ['geral', 'Visão geral', 'grafico'], ['usuarios', 'Usuários', 'usuario'], ['conteudo', 'Conteúdo', 'livro'],
  ['crescimento', 'Crescimento', 'raio'], ['assinaturas', 'Assinaturas', 'estrela'], ['pagamentos', 'Pagamentos', 'relogio'],
  ['configuracoes', 'Ajustes', 'filtro'],
]
const MIGRACAO = '202609290100_painel_admin.sql'

/** Assinatura que dá acesso agora (em dia, ou cancelada que ainda vale até o fim do período). */
const vigente = (a: LinhaAssinatura) =>
  (a.status === 'ativa' || (a.status === 'cancelada' && !!a.cancelar_ao_fim)) && (!a.fim_periodo || new Date(a.fim_periodo) > new Date())
const inicioDe = (a: LinhaAssinatura) => a.criada_em ?? a.inicio_periodo ?? a.ultima_atualizacao

function lerUrl(): { aba: Aba; vista?: VistaConteudo } {
  const aba = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('aba')
  // Links antigos e os dos e-mails de alerta apontam para ?aba=avaliacoes ou relatos.
  if (aba === 'avaliacoes' || aba === 'relatos') return { aba: 'conteudo', vista: aba }
  return { aba: ABAS.some(([valor]) => valor === aba) ? aba as Aba : 'geral' }
}

export function AdminAssinaturas() {
  const { sessao } = usarConta()
  const [inicial] = useState(lerUrl)
  const [aba, definirAba] = useState<Aba>(inicial.aba)
  const [assinaturas, definirAssinaturas] = useState<LinhaAssinatura[] | null>(null)
  const [eventos, definirEventos] = useState<LinhaEvento[] | null>(null)
  const [usuarios, definirUsuarios] = useState<LinhaUsuario[] | null>(null)
  const [resumo, definirResumo] = useState<Resumo | null>(null)
  const [erroAcesso, definirErroAcesso] = useState('')
  const [erroNovo, definirErroNovo] = useState('')
  const [pendenciasConteudo, definirPendenciasConteudo] = useState<number | null>(null)
  const [atualizadoEm, definirAtualizadoEm] = useState<Date | null>(null)

  const carregar = useCallback(async () => {
    if (!sessao) return
    // Assinaturas e eventos existem desde antes; resumo e usuários dependem da
    // migração nova. Uma falha nestes não esconde o resto do painel.
    const [a, e, r, u] = await Promise.allSettled([
      chamarRpc<LinhaAssinatura[]>('listar_assinaturas_admin', {}),
      chamarRpc<LinhaEvento[]>('listar_eventos_pagamento_admin', {}),
      chamarRpc<Resumo[]>('resumo_admin', {}),
      chamarRpc<LinhaUsuario[]>('listar_usuarios_admin', {}),
    ])
    if (a.status === 'rejected') { definirErroAcesso(erroDoPainel(a.reason, MIGRACAO)); return }
    definirErroAcesso('')
    definirAssinaturas(a.value)
    definirEventos(e.status === 'fulfilled' ? e.value : [])
    if (r.status === 'fulfilled' && u.status === 'fulfilled') {
      definirResumo(r.value[0] ?? null); definirUsuarios(u.value); definirErroNovo('')
    } else definirErroNovo(erroDoPainel(r.status === 'rejected' ? r.reason : (u as PromiseRejectedResult).reason, MIGRACAO))
    definirAtualizadoEm(new Date())
  }, [sessao])
  useEffect(() => { void carregar() }, [carregar])
  // No celular as abas rolam de lado: a escolhida precisa ficar à vista.
  useEffect(() => {
    document.querySelector('.adm-aba[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [aba, assinaturas !== null])

  function trocarAba(nova: Aba) {
    definirAba(nova)
    const base = window.location.hash.split('?')[0] || '#/admin'
    history.replaceState(null, '', nova === 'geral' ? base : `${base}?aba=${nova}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!sessao) return <article className="empilha limite-leitura"><h1>Painel do administrador</h1><p>Entre na sua conta para continuar.</p><a className="botao" href={href('/conta')}>Entrar</a></article>

  const errosPagamento = eventos?.filter(ev => ev.status_processamento === 'erro').length ?? 0
  const contadores: Partial<Record<Aba, number>> = {
    usuarios: usuarios?.length, assinaturas: assinaturas?.filter(vigente).length,
    pagamentos: errosPagamento || undefined, conteudo: pendenciasConteudo || undefined,
  }

  return <article className="empilha-2 adm">
    <header className="adm-heroi">
      <div>
        <p className="adm-heroi__sobre"><Icone nome="alvo" tamanho={15} /> Área restrita</p>
        <h1>Painel do administrador</h1>
        <p>{atualizadoEm ? `Dados de ${atualizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.` : 'Verificando acesso…'} Só contas em administradores conseguem abrir.</p>
      </div>
      <button className="botao adm-heroi__atualizar" type="button" onClick={() => void carregar()}><Icone nome="reiniciar" tamanho={16} /> Atualizar</button>
    </header>

    {erroAcesso ? <p role="alert" className="adm-alerta">{erroAcesso}</p> : assinaturas === null ? <p role="status">Carregando o painel…</p> : <>
      <nav className="adm-abas" role="tablist" aria-label="Seções do painel">
        {ABAS.map(([valor, rotulo, icone]) => <button key={valor} type="button" role="tab" aria-selected={aba === valor} className="adm-aba" onClick={() => trocarAba(valor)}>
          <Icone nome={icone} tamanho={16} /><span>{rotulo}</span>{contadores[valor] ? <b className={valor === 'pagamentos' || valor === 'conteudo' ? 'adm-aba__alerta' : ''}>{contadores[valor]}</b> : null}
        </button>)}
      </nav>

      {erroNovo && (aba === 'geral' || aba === 'usuarios') && <p role="alert" className="adm-alerta">{erroNovo} Sem ela, usuários ativos e o ranking privado não aparecem; assinaturas, pagamentos e avaliações continuam funcionando.</p>}

      {aba === 'geral' && <VisaoGeral resumo={resumo} usuarios={usuarios} assinaturas={assinaturas} errosPagamento={errosPagamento} mensagens={pendenciasConteudo} irPara={trocarAba} />}
      {aba === 'usuarios' && usuarios && <AdminUsuarios usuarios={usuarios} />}
      {aba === 'assinaturas' && <Assinaturas linhas={assinaturas} />}
      {aba === 'pagamentos' && <Pagamentos eventos={eventos ?? []} recarregar={carregar} />}
      {aba === 'crescimento' && <AdminCrescimento assinaturas={assinaturas} />}
      {aba === 'configuracoes' && <AdminConfiguracoes />}
      {/* Montada sempre (escondida fora da aba) para o contador de pendências aparecer na barra. */}
      <div hidden={aba !== 'conteudo'}><AdminConteudo vistaInicial={inicial.vista} aoMudarPendencias={definirPendenciasConteudo} /></div>
    </>}
  </article>
}

function VisaoGeral({ resumo, usuarios, assinaturas, errosPagamento, mensagens, irPara }: {
  resumo: Resumo | null; usuarios: LinhaUsuario[] | null; assinaturas: LinhaAssinatura[]
  errosPagamento: number; mensagens: number | null; irPara: (aba: Aba) => void
}) {
  const vigentes = assinaturas.filter(vigente)
  const novasAssinaturas = [...assinaturas].sort((a, b) => new Date(inicioDe(b)).getTime() - new Date(inicioDe(a)).getTime()).slice(0, 4)
  const semana = (usuarios ?? []).filter(u => u.respondidas_7d > 0).sort((a, b) => b.respondidas_7d - a.respondidas_7d).slice(0, 5)
  const n = (valor: number | undefined) => valor === undefined ? '—' : valor.toLocaleString('pt-BR')

  return <div className="empilha-2">
    <section className="adm-kpis" aria-label="Números principais">
      <button type="button" className="adm-kpi adm-kpi--botao adm-kpi--online" onClick={() => irPara('usuarios')}><span><i className="adm-online" aria-hidden="true" /> Online agora</span><strong>{n(resumo?.online_agora)}</strong><small>com a conta aberta nos últimos 3 minutos</small></button>
      <div className="adm-kpi adm-kpi--destaque"><span>Usuários cadastrados</span><strong>{n(resumo?.usuarios)}</strong><small>{resumo ? `+${resumo.novos_7d} nos últimos 7 dias` : 'rode a migração nova'}</small></div>
      <div className="adm-kpi"><span>Ativos hoje</span><strong>{n(resumo?.ativos_hoje)}</strong><small>responderam ao menos 1 questão</small></div>
      <div className="adm-kpi"><span>Ativos na semana</span><strong>{n(resumo?.ativos_7d)}</strong><small>{resumo ? `${n(resumo.ativos_30d)} nos últimos 30 dias` : ''}</small></div>
      <div className="adm-kpi"><span>Questões respondidas</span><strong>{n(resumo?.respondidas_hoje)}</strong><small>{resumo ? `hoje · ${n(resumo.respondidas_7d)} na semana` : 'hoje'}</small></div>
      <div className="adm-kpi"><span>Assinantes com acesso</span><strong>{vigentes.length}</strong><small>{assinaturas.length} assinatura(s) no histórico</small></div>
      <button type="button" className={'adm-kpi adm-kpi--botao' + (errosPagamento ? ' adm-kpi--alerta' : '')} onClick={() => irPara('pagamentos')}><span>Pagamentos com problema</span><strong>{errosPagamento}</strong><small>{errosPagamento ? 'toque para revisar' : 'tudo certo'}</small></button>
      <button type="button" className={'adm-kpi adm-kpi--botao' + (mensagens ? ' adm-kpi--alerta' : '')} onClick={() => irPara('conteudo')}><span>Conteúdo para revisar</span><strong>{mensagens ?? '—'}</strong><small>relatos de erro e "não ajudou" com texto</small></button>
    </section>

    <div className="adm-duas">
      <section className="adm-secao empilha">
        <div className="adm-secao__cabeca"><h2>Mais ativos na semana</h2><button type="button" className="adm-link" onClick={() => irPara('usuarios')}>Ver todos <Icone nome="direita" tamanho={14} /></button></div>
        {!usuarios ? <p className="adm-vazio">Disponível depois da migração nova.</p> : semana.length === 0 ? <p className="adm-vazio">Ninguém respondeu questões nos últimos 7 dias.</p> : <ol className="adm-mini">
          {semana.map(u => <li key={u.id_usuario}><span className="adm-mini__nome">{u.nome ?? u.email}</span><span className="adm-mini__valor numerico">{u.respondidas_7d}</span></li>)}
        </ol>}
      </section>
      <section className="adm-secao empilha">
        <div className="adm-secao__cabeca"><h2>Assinaturas recentes</h2><button type="button" className="adm-link" onClick={() => irPara('assinaturas')}>Ver todas <Icone nome="direita" tamanho={14} /></button></div>
        {novasAssinaturas.length === 0 ? <p className="adm-vazio">Nenhuma assinatura ainda.</p> : <ol className="adm-mini">
          {novasAssinaturas.map(a => <li key={`${a.id_usuario}:${a.ultima_atualizacao}`}><span className="adm-mini__nome">{a.nome ?? a.usuario}<small>{PLANOS[a.plano] ?? a.plano} · {STATUS_ASSINATURA[a.status] ?? a.status}</small></span><span className="adm-mini__valor">{haQuanto(inicioDe(a))}</span></li>)}
        </ol>}
      </section>
    </div>
  </div>
}

type FiltroAssinatura = 'vigentes' | 'todas' | 'pendente' | 'falha_pagamento' | 'encerradas'
type Periodo = 'tudo' | '7' | '30' | '90' | '365'
const FILTROS_ASSINATURA: Array<[FiltroAssinatura, string]> = [
  ['vigentes', 'Pagantes com acesso'], ['todas', 'Todas'], ['pendente', 'Aguardando pagamento'],
  ['falha_pagamento', 'Falha no pagamento'], ['encerradas', 'Canceladas e encerradas'],
]
const PERIODOS: Array<[Periodo, string]> = [['tudo', 'Desde sempre'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 3 meses'], ['365', 'Último ano']]

function Assinaturas({ linhas }: { linhas: LinhaAssinatura[] }) {
  const [filtro, definirFiltro] = useState<FiltroAssinatura>('vigentes')
  const [periodo, definirPeriodo] = useState<Periodo>('tudo')
  const [ordem, definirOrdem] = useState<'recentes' | 'antigas'>('recentes')
  const [busca, definirBusca] = useState('')

  const passa = useCallback((a: LinhaAssinatura, f: FiltroAssinatura) =>
    f === 'todas' ? true : f === 'vigentes' ? vigente(a) : f === 'encerradas' ? !vigente(a) && ['cancelada', 'vencida', 'reembolsada', 'pausada'].includes(a.status) : a.status === f, [])

  const noPeriodo = useCallback((a: LinhaAssinatura) =>
    periodo === 'tudo' || Date.now() - new Date(inicioDe(a)).getTime() <= Number(periodo) * 86_400_000, [periodo])

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    return linhas.filter(a => passa(a, filtro) && noPeriodo(a) && corresponde([a.nome, a.usuario, PLANOS[a.plano], STATUS_ASSINATURA[a.status]], termo))
      .sort((x, y) => (new Date(inicioDe(y)).getTime() - new Date(inicioDe(x)).getTime()) * (ordem === 'recentes' ? 1 : -1))
  }, [linhas, filtro, noPeriodo, busca, ordem, passa])

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-assinaturas">
    <div className="adm-secao__cabeca"><div>
      <h2 id="adm-titulo-assinaturas">Assinaturas</h2>
      <p>Quem paga, desde quando e até quando vale o acesso.</p>
    </div></div>
    <div className="adm-filtros" role="group" aria-label="Filtrar assinaturas">
      {FILTROS_ASSINATURA.map(([valor, rotulo]) => <button key={valor} type="button" className="adm-chip" aria-pressed={filtro === valor} onClick={() => definirFiltro(valor)}>{rotulo}<span>{linhas.filter(a => passa(a, valor) && noPeriodo(a)).length}</span></button>)}
    </div>
    <div className="adm-busca adm-busca--tres">
      <label className="campo">Buscar nome ou e-mail<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
      <label className="campo">Assinou em<select className="entrada" value={periodo} onChange={e => definirPeriodo(e.target.value as Periodo)}>
        {PERIODOS.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
      </select></label>
      <label className="campo">Ordem<select className="entrada" value={ordem} onChange={e => definirOrdem(e.target.value as 'recentes' | 'antigas')}>
        <option value="recentes">Mais recentes primeiro</option><option value="antigas">Mais antigas primeiro</option>
      </select></label>
    </div>
    <div className="adm-linha-nota">
      <p className="adm-nota" role="status">Mostrando {visiveis.length} de {linhas.length} assinatura(s).</p>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-assinaturas-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Nome', 'E-mail', 'Plano', 'Status', 'Assinante desde', 'Última cobrança paga', 'Acesso até', 'Cancela ao fim'],
        visiveis.map(a => [a.nome, a.usuario, PLANOS[a.plano] ?? a.plano, STATUS_ASSINATURA[a.status] ?? a.status, data(inicioDe(a)), a.ultima_cobranca_em ? data(a.ultima_cobranca_em) : '', a.fim_periodo ? data(a.fim_periodo) : '', a.cancelar_ao_fim ? 'sim' : 'não']))}>
        <Icone nome="baixar" tamanho={15} /> Exportar planilha
      </button>
    </div>
    {visiveis.length === 0 ? <p className="adm-vazio">Nenhuma assinatura neste filtro.</p> : <ul className="adm-cartoes">
      {visiveis.map(a => {
        const inicio = inicioDe(a)
        return <li key={`${a.id_usuario}:${a.ultima_atualizacao}`} className={'adm-cartao' + (vigente(a) ? ' adm-cartao--ok' : a.status === 'falha_pagamento' ? ' adm-cartao--ruim' : '')}>
          <div className="adm-cartao__topo">
            <div><strong>{a.nome ?? a.usuario}</strong>{a.nome && <span className="adm-usuario__email">{a.usuario}</span>}</div>
            <span className={`adm-selo adm-estado--${a.status}`}>{STATUS_ASSINATURA[a.status] ?? a.status}</span>
          </div>
          <dl className="adm-cartao__dados">
            <div><dt>Plano</dt><dd>{PLANOS[a.plano] ?? a.plano}</dd></div>
            <div><dt>Assinante desde</dt><dd>{data(inicio)} <small>({haQuanto(inicio)})</small></dd></div>
            <div><dt>Última cobrança paga</dt><dd>{a.ultima_cobranca_em !== undefined ? data(a.ultima_cobranca_em) : '—'}</dd></div>
            <div><dt>{a.cancelar_ao_fim || a.status === 'cancelada' ? 'Acesso até' : 'Próxima cobrança'}</dt><dd>{data(a.proxima_cobranca ?? a.fim_periodo)}</dd></div>
          </dl>
          {a.status === 'falha_pagamento' && <small className="adm-ajuda">A cobrança não foi confirmada. Veja a aba Pagamentos e o Mercado Pago.</small>}
          {a.cancelar_ao_fim && a.status !== 'cancelada' && <small className="adm-ajuda">Pediu cancelamento: o acesso vale até o fim do período pago.</small>}
        </li>
      })}
    </ul>}
  </section>
}

function Pagamentos({ eventos, recarregar }: { eventos: LinhaEvento[]; recarregar: () => Promise<void> }) {
  const [busca, definirBusca] = useState('')
  const [status, definirStatus] = useState<'erro' | 'todos' | 'processado' | 'ignorado' | 'recebido'>(() => eventos.some(e => e.status_processamento === 'erro') ? 'erro' : 'todos')
  const [reprocessando, definirReprocessando] = useState<number | null>(null)
  const [aviso, definirAviso] = useState('')

  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim())
    return eventos.filter(e => (status === 'todos' || e.status_processamento === status)
      && corresponde([e.id_evento, e.tipo, TIPOS_EVENTO[e.tipo ?? ''], e.id_recurso, e.erro, nomeErro(e.erro)], termo))
  }, [eventos, busca, status])

  async function reprocessar(id: number) {
    if (reprocessando !== null) return
    definirReprocessando(id); definirAviso('')
    try {
      await chamarFuncao('webhook-mercado-pago?acao=reprocessar', { id_evento: id })
      definirAviso('Reprocessamento pedido. A lista foi atualizada; se continuar com erro, confira o Mercado Pago.')
      await recarregar()
    } catch {
      definirAviso('Não foi possível reprocessar. Nada foi alterado nas assinaturas.')
    } finally { definirReprocessando(null) }
  }

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-pagamentos">
    <div className="adm-secao__cabeca"><div>
      <h2 id="adm-titulo-pagamentos">Pagamentos</h2>
      <p>Avisos que o Mercado Pago mandou para o site (últimos {eventos.length}). "Ignorado" é normal: são avisos que não mudam nada. Só "Precisa de atenção" pede ação.</p>
    </div></div>
    <div className="adm-filtros" role="group" aria-label="Filtrar pagamentos">
      {(['erro', 'todos', 'processado', 'ignorado', 'recebido'] as const).map(valor => <button key={valor} type="button" className="adm-chip" aria-pressed={status === valor} onClick={() => definirStatus(valor)}>{valor === 'todos' ? 'Todos' : STATUS_EVENTO[valor]}<span>{valor === 'todos' ? eventos.length : eventos.filter(e => e.status_processamento === valor).length}</span></button>)}
    </div>
    <label className="campo adm-busca__unica">Buscar por tipo, número ou erro<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
    {aviso && <p role="status" className="adm-nota">{aviso}</p>}
    {visiveis.length === 0 ? <p className="adm-vazio">{status === 'erro' ? 'Nenhum pagamento com problema.' : 'Nenhum aviso neste filtro.'}</p> : <ul className="adm-cartoes">
      {visiveis.map(e => <li key={e.id} className={'adm-cartao' + (e.status_processamento === 'erro' ? ' adm-cartao--ruim' : '')}>
        <div className="adm-cartao__topo">
          <div><strong>{TIPOS_EVENTO[e.tipo ?? ''] ?? 'Aviso do Mercado Pago'}</strong><span className="adm-usuario__email">{dataHora(e.recebido_em)}</span></div>
          <span className={`adm-selo adm-estado--${e.status_processamento}`}>{STATUS_EVENTO[e.status_processamento] ?? e.status_processamento}</span>
        </div>
        {e.erro && <p className="adm-cartao__erro"><Icone nome="alerta" tamanho={15} /> {nomeErro(e.erro)}</p>}
        <dl className="adm-cartao__dados">
          <div><dt>Número no Mercado Pago</dt><dd className="numerico">{e.id_recurso ?? '—'}</dd></div>
          <div><dt>Processado em</dt><dd>{dataHora(e.processado_em)}</dd></div>
        </dl>
        <details className="adm-tecnico"><summary>Códigos técnicos</summary><p>Evento {e.id_evento} · tipo {e.tipo ?? '—'}{e.erro ? ` · erro ${e.erro}` : ''}</p></details>
        {e.status_processamento === 'erro' && <button className="botao" type="button" disabled={reprocessando !== null} onClick={() => void reprocessar(e.id)}>{reprocessando === e.id ? 'Reprocessando…' : 'Reprocessar'}</button>}
      </li>)}
    </ul>}
  </section>
}
