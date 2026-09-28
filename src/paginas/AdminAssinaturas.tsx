import { useCallback, useEffect, useMemo, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'

interface LinhaAssinatura {
  id_usuario: string
  usuario: string
  plano: string
  status: string
  proxima_cobranca: string | null
  ultima_atualizacao: string
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

const data = (valor: string | null) => valor ? new Date(valor).toLocaleString('pt-BR') : '—'
const corresponde = (termos: Array<string | null>, busca: string) => termos.some((termo) => termo?.toLocaleLowerCase('pt-BR').includes(busca))
const STATUS_ASSINATURA: Record<string, string> = {
  ativa: 'Em dia', cancelada: 'Cancelada', reembolsada: 'Reembolsada',
  falha_pagamento: 'Falha no pagamento', pendente: 'Aguardando pagamento', pausada: 'Pausada',
}
const STATUS_EVENTO: Record<string, string> = {
  recebido: 'Recebido', processado: 'Processado', ignorado: 'Ignorado com segurança', erro: 'Precisa de atenção',
}
const TIPOS_EVENTO: Record<string, string> = {
  payment: 'Pagamento', subscription_authorized_payment: 'Cobrança da assinatura',
  subscription_preapproval: 'Assinatura', subscription_preapproval_plan: 'Plano',
}
const FILTROS_ASSINATURA = [
  ['todos', 'Todas'], ['ativa', 'Em dia'], ['pendente', 'Aguardando'],
  ['falha_pagamento', 'Falha no pagamento'], ['cancelada', 'Canceladas'], ['reembolsada', 'Reembolsadas'],
] as const

function motivoEvento(erro: string | null) {
  if (!erro) return '—'
  if (erro === 'erro_interno') return 'Erro no processamento. O motivo técnico foi omitido por segurança; consulte os logs da Function.'
  return erro.replace(/_/g, ' ')
}

export function AdminAssinaturas() {
  const { sessao } = usarConta()
  const [linhas, definirLinhas] = useState<LinhaAssinatura[] | null>(null)
  const [eventos, definirEventos] = useState<LinhaEvento[] | null>(null)
  const [erro, definirErro] = useState('')
  const [aviso, definirAviso] = useState('')
  const [busca, definirBusca] = useState('')
  const [status, definirStatus] = useState('todos')
  const [buscaEvento, definirBuscaEvento] = useState('')
  const [statusEvento, definirStatusEvento] = useState('todos')
  const [reprocessando, definirReprocessando] = useState<number | null>(null)

  const carregar = useCallback(async () => {
    if (!sessao) return
    try {
      const [assinaturas, ultimosEventos] = await Promise.all([
        chamarRpc<LinhaAssinatura[]>('listar_assinaturas_admin', {}),
        chamarRpc<LinhaEvento[]>('listar_eventos_pagamento_admin', {}),
      ])
      definirLinhas(assinaturas); definirEventos(ultimosEventos); definirErro('')
    } catch (falha) {
      definirErro(String(falha).includes('(403)')
        ? 'Acesso negado. Esta área é exclusiva de administradores.'
        : 'Não foi possível carregar os dados administrativos. Tente novamente mais tarde.')
    }
  }, [sessao])
  useEffect(() => { void carregar() }, [carregar])

  const filtradas = useMemo(() => (linhas ?? []).filter((linha) =>
    (status === 'todos' || linha.status === status)
      && corresponde([linha.usuario, linha.plano, linha.status, STATUS_ASSINATURA[linha.status]], busca.trim().toLocaleLowerCase('pt-BR')),
  ), [linhas, busca, status])
  const eventosFiltrados = useMemo(() => (eventos ?? []).filter((evento) =>
    (statusEvento === 'todos' || evento.status_processamento === statusEvento)
      && corresponde([evento.id_evento, evento.tipo, TIPOS_EVENTO[evento.tipo ?? ''], evento.id_recurso, evento.erro], buscaEvento.trim().toLocaleLowerCase('pt-BR')),
  ), [eventos, buscaEvento, statusEvento])

  async function reprocessar(id: number) {
    if (reprocessando !== null) return
    definirReprocessando(id); definirAviso('')
    try {
      await chamarFuncao('webhook-mercado-pago?acao=reprocessar', { id_evento: id })
      definirAviso('Reprocessamento solicitado. Atualize a lista para conferir o resultado.')
      await carregar()
    } catch {
      definirAviso('Não foi possível reprocessar este evento. Nenhum status financeiro foi alterado por esta página.')
    } finally { definirReprocessando(null) }
  }

  if (!sessao) return <article className="empilha limite-leitura"><h1>Administração de assinaturas</h1><p>Entre na sua conta para continuar.</p><a className="botao" href={href('/conta')}>Entrar</a></article>
  return <article className="empilha-2 conta-pagina">
    <header className="admin-assinaturas__cabeca"><div><p className="meta">ÁREA RESTRITA</p><h1>Administração de assinaturas</h1><p>Uma visão das assinaturas e dos eventos, com acesso autorizado pelo servidor.</p></div><button className="botao botao--fantasma" type="button" onClick={() => void carregar()}>Atualizar dados</button></header>
    {erro ? <p role="alert">{erro}</p> : linhas === null || eventos === null ? <p role="status">Verificando acesso…</p> : <>
      <section className="admin-assinaturas__resumo" aria-label="Resumo administrativo">
        <div><span>Assinaturas registradas</span><strong>{linhas.length}</strong></div>
        <div><span>Em dia</span><strong>{linhas.filter(linha => linha.status === 'ativa').length}</strong></div>
        <div><span>Falha no pagamento</span><strong>{linhas.filter(linha => linha.status === 'falha_pagamento').length}</strong></div>
        <div><span>Eventos que precisam de atenção (últimos 200)</span><strong>{eventos.filter(evento => evento.status_processamento === 'erro').length}</strong></div>
      </section>
      <nav className="admin-assinaturas__atalhos" aria-label="Seções da administração"><a href="#titulo-assinaturas-admin" onClick={e => { e.preventDefault(); document.getElementById('titulo-assinaturas-admin')?.scrollIntoView({ behavior: 'smooth' }) }}>Assinaturas</a><a href="#titulo-eventos-admin" onClick={e => { e.preventDefault(); document.getElementById('titulo-eventos-admin')?.scrollIntoView({ behavior: 'smooth' }) }}>Eventos de pagamento</a></nav>
      <section className="empilha admin-assinaturas__secao" aria-labelledby="titulo-assinaturas-admin">
        <div><h2 id="titulo-assinaturas-admin">Assinaturas</h2><p>Encontre rapidamente quem está em dia, aguardando, cancelou ou recebeu reembolso.</p></div>
        <div className="admin-assinaturas__atalhos" role="group" aria-label="Filtros rápidos de assinatura">
          {FILTROS_ASSINATURA.map(([valor, rotulo]) => <button key={valor} className="admin-assinaturas__filtro-rapido" type="button" aria-pressed={status === valor} onClick={() => definirStatus(valor)}>{rotulo}<span>{valor === 'todos' ? linhas.length : linhas.filter(linha => linha.status === valor).length}</span></button>)}
        </div>
        <div className="admin-assinaturas__filtros">
          <label className="campo">Buscar usuário, plano ou status<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
          <label className="campo">Status<select className="entrada" value={status} onChange={e => definirStatus(e.target.value)}>
            <option value="todos">Todos</option>{[...new Set(linhas.map(l => l.status))].sort().map(valor => <option key={valor} value={valor}>{STATUS_ASSINATURA[valor] ?? valor}</option>)}
          </select></label>
        </div>
        <p role="status">Exibindo {filtradas.length} de {linhas.length} assinatura(s).</p>
        {filtradas.length === 0 ? <p>Nenhuma assinatura corresponde à busca.</p> : <div className="admin-assinaturas__tabela" role="region" aria-label="Tabela de assinaturas" tabIndex={0}>
          <table className="tabela"><thead><tr><th scope="col">Usuário</th><th scope="col">Plano</th><th scope="col">Status e orientação</th><th scope="col">Próxima cobrança</th><th scope="col">Atualização</th></tr></thead>
            <tbody>{filtradas.map((linha) => <tr key={`${linha.id_usuario}:${linha.ultima_atualizacao}`}>
              <td>{linha.usuario}</td><td className="admin-assinaturas__plano">{linha.plano}</td><td><span className={`admin-assinaturas__estado admin-assinaturas__estado--${linha.status}`}>{STATUS_ASSINATURA[linha.status] ?? linha.status}</span>{linha.status === 'falha_pagamento' && <small className="admin-assinaturas__ajuda">A cobrança não foi confirmada. O motivo específico não está disponível neste painel; confira os eventos e o Mercado Pago.</small>}</td><td>{data(linha.proxima_cobranca)}</td><td>{data(linha.ultima_atualizacao)}</td>
            </tr>)}</tbody></table>
        </div>}
      </section>
      <section className="empilha admin-assinaturas__secao" aria-labelledby="titulo-eventos-admin">
        <div><h2 id="titulo-eventos-admin">Eventos de pagamento</h2><p>Últimos {eventos.length} eventos. Os eventos ignorados podem ser esperados; os que mostram erro precisam de revisão. O painel não mostra payloads nem credenciais.</p></div>
        <div className="admin-assinaturas__filtros">
          <label className="campo">Buscar evento, recurso ou erro<input className="entrada" type="search" value={buscaEvento} onChange={e => definirBuscaEvento(e.target.value)} /></label>
          <label className="campo">Processamento<select className="entrada" value={statusEvento} onChange={e => definirStatusEvento(e.target.value)}>
            <option value="todos">Todos</option>{['recebido', 'processado', 'ignorado', 'erro'].map(valor => <option key={valor} value={valor}>{STATUS_EVENTO[valor]}</option>)}
          </select></label>
        </div>
        <p role="status">Exibindo {eventosFiltrados.length} evento(s); {eventos.filter(e => e.status_processamento === 'erro').length} com erro.</p>
        {eventosFiltrados.length === 0 ? <p>Nenhum evento corresponde à busca.</p> : <div className="admin-assinaturas__tabela" role="region" aria-label="Tabela de eventos de pagamento" tabIndex={0}>
          <table className="tabela"><thead><tr><th scope="col">Recebido</th><th scope="col">Tipo</th><th scope="col">Recurso</th><th scope="col">Processamento</th><th scope="col">Erro</th><th scope="col">Ação</th></tr></thead>
            <tbody>{eventosFiltrados.map(evento => <tr key={evento.id}>
              <td>{data(evento.recebido_em)}</td><td><strong>{TIPOS_EVENTO[evento.tipo ?? ''] ?? evento.tipo ?? '—'}</strong><small className="admin-assinaturas__ajuda">{evento.tipo}</small></td><td className="numerico">{evento.id_recurso ?? '—'}</td><td><span className={`admin-assinaturas__estado admin-assinaturas__estado--${evento.status_processamento}`}>{STATUS_EVENTO[evento.status_processamento] ?? evento.status_processamento}</span></td><td>{motivoEvento(evento.erro)}</td>
              <td>{evento.status_processamento === 'erro' && <button className="botao" type="button" disabled={reprocessando !== null} onClick={() => void reprocessar(evento.id)}>Reprocessar</button>}</td>
            </tr>)}</tbody></table>
        </div>}
        {aviso && <p role="status">{aviso}</p>}
      </section>
    </>}
  </article>
}
