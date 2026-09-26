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
      && corresponde([linha.usuario, linha.plano, linha.status], busca.trim().toLocaleLowerCase('pt-BR')),
  ), [linhas, busca, status])
  const eventosFiltrados = useMemo(() => (eventos ?? []).filter((evento) =>
    (statusEvento === 'todos' || evento.status_processamento === statusEvento)
      && corresponde([evento.id_evento, evento.tipo, evento.id_recurso, evento.erro], buscaEvento.trim().toLocaleLowerCase('pt-BR')),
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
    <header><h1>Administração de assinaturas</h1><p>Consulta restrita, autorizada pelo servidor.</p></header>
    {erro ? <p role="alert">{erro}</p> : linhas === null || eventos === null ? <p role="status">Verificando acesso…</p> : <>
      <section className="empilha" aria-labelledby="titulo-assinaturas-admin">
        <h2 id="titulo-assinaturas-admin">Assinaturas</h2>
        <p role="status">Total registrado: {linhas.length}. Exibindo {filtradas.length} com os filtros atuais.</p>
        <div className="admin-assinaturas__filtros">
          <label className="campo">Buscar usuário, plano ou status<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>
          <label className="campo">Status<select className="entrada" value={status} onChange={e => definirStatus(e.target.value)}>
            <option value="todos">Todos</option>{[...new Set(linhas.map(l => l.status))].sort().map(valor => <option key={valor} value={valor}>{valor}</option>)}
          </select></label>
        </div>
        {filtradas.length === 0 ? <p>Nenhuma assinatura corresponde à busca.</p> : <div className="admin-assinaturas__tabela" role="region" aria-label="Tabela de assinaturas" tabIndex={0}>
          <table className="tabela"><thead><tr><th scope="col">Usuário</th><th scope="col">Plano</th><th scope="col">Status</th><th scope="col">Próxima cobrança</th><th scope="col">Atualização</th></tr></thead>
            <tbody>{filtradas.map((linha) => <tr key={`${linha.id_usuario}:${linha.ultima_atualizacao}`}>
              <td>{linha.usuario}</td><td>{linha.plano}</td><td>{linha.status}</td><td>{data(linha.proxima_cobranca)}</td><td>{data(linha.ultima_atualizacao)}</td>
            </tr>)}</tbody></table>
        </div>}
      </section>
      <section className="empilha" aria-labelledby="titulo-eventos-admin">
        <h2 id="titulo-eventos-admin">Eventos de pagamento</h2>
        <p>Últimos {eventos.length} eventos. O painel não mostra payloads nem credenciais.</p>
        <div className="admin-assinaturas__filtros">
          <label className="campo">Buscar evento, recurso ou erro<input className="entrada" type="search" value={buscaEvento} onChange={e => definirBuscaEvento(e.target.value)} /></label>
          <label className="campo">Processamento<select className="entrada" value={statusEvento} onChange={e => definirStatusEvento(e.target.value)}>
            <option value="todos">Todos</option>{['recebido', 'processado', 'ignorado', 'erro'].map(valor => <option key={valor} value={valor}>{valor}</option>)}
          </select></label>
        </div>
        <p role="status">Exibindo {eventosFiltrados.length} evento(s); {eventos.filter(e => e.status_processamento === 'erro').length} com erro.</p>
        {eventosFiltrados.length === 0 ? <p>Nenhum evento corresponde à busca.</p> : <div className="admin-assinaturas__tabela" role="region" aria-label="Tabela de eventos de pagamento" tabIndex={0}>
          <table className="tabela"><thead><tr><th scope="col">Recebido</th><th scope="col">Tipo</th><th scope="col">Recurso</th><th scope="col">Processamento</th><th scope="col">Erro</th><th scope="col">Ação</th></tr></thead>
            <tbody>{eventosFiltrados.map(evento => <tr key={evento.id}>
              <td>{data(evento.recebido_em)}</td><td>{evento.tipo ?? '—'}</td><td>{evento.id_recurso ?? '—'}</td><td>{evento.status_processamento}</td><td>{evento.erro ?? '—'}</td>
              <td>{evento.status_processamento === 'erro' && <button className="botao" type="button" disabled={reprocessando !== null} onClick={() => void reprocessar(evento.id)}>Reprocessar</button>}</td>
            </tr>)}</tbody></table>
        </div>}
        {aviso && <p role="status">{aviso}</p>}
        <button className="botao botao--fantasma" type="button" onClick={() => void carregar()}>Atualizar dados</button>
      </section>
    </>}
  </article>
}
