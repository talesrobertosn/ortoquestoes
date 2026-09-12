import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { definirUsuarioLocal } from '../estado/armazenamento'
import { supabase, contasDisponiveis } from './supabase'
import { iniciarSincronizacao, type StatusSync } from './sincronizacao'
import type { Documento } from './modeloSync'
import { navegar } from '../util/rotas'

const STATUS_INICIAL: StatusSync = { estado: 'sincronizando', pendentes: 0, conflitos: [], pronto: false }
interface ContaContexto {
  sessao: Session | null
  carregando: boolean
  recuperacao: boolean
  encerrarRecuperacao: () => void
  status: StatusSync
  sincronizar: () => void
  resolver: (doc: Documento, manterLocal: boolean) => void
}
const Contexto = createContext<ContaContexto | null>(null)
export function ProvedorConta({ children }: { children: ReactNode }) {
  const [sessao, definirSessao] = useState<Session | null>(null)
  const [carregando, definirCarregando] = useState(contasDisponiveis)
  const [recuperacao, definirRecuperacao] = useState(false)
  const [status, definirStatus] = useState<StatusSync>(STATUS_INICIAL)
  const sync = useRef<ReturnType<typeof iniciarSincronizacao> | null>(null)
  const usuarioAtual = useRef<string | null>(null)
  useEffect(() => {
    if (!supabase) { definirUsuarioLocal(null); return }
    let ativo = true
    // Callback síncrono: não aguardar chamadas do Auth dentro deste evento.
    const { data } = supabase.auth.onAuthStateChange((evento, proxima) => {
      if (!ativo) return
      const id = proxima?.user.id ?? null
      if (id !== usuarioAtual.current) {
        sync.current?.parar(); sync.current = null
        definirStatus(STATUS_INICIAL)
        usuarioAtual.current = id; definirUsuarioLocal(id)
      }
      definirSessao(proxima); definirCarregando(false)
      if (evento === 'PASSWORD_RECOVERY') definirRecuperacao(true)
      const url = new URL(window.location.href)
      if (evento === 'SIGNED_IN' && proxima && !recuperacao) {
        url.searchParams.delete('conta'); url.searchParams.delete('code'); url.hash = '/'
        window.history.replaceState(null, '', url.href)
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      } else if (url.searchParams.has('conta') && (evento === 'INITIAL_SESSION' || evento === 'PASSWORD_RECOVERY')) {
        if (proxima && url.searchParams.get('conta') === 'recuperar') definirRecuperacao(true)
        url.searchParams.delete('conta'); url.searchParams.delete('code'); url.hash = '/conta'
        window.history.replaceState(null, '', url.href)
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      }
    })
    return () => { ativo = false; data.subscription.unsubscribe(); sync.current?.parar() }
  }, [])
  useEffect(() => {
    if (!supabase || !sessao?.user.id) return
    sync.current = iniciarSincronizacao(supabase, sessao.user.id, definirStatus)
    return () => { sync.current?.parar(); sync.current = null }
  }, [sessao?.user.id])
  return <Contexto.Provider value={{ sessao, carregando, recuperacao, encerrarRecuperacao: () => definirRecuperacao(false), status,
    sincronizar: () => { void sync.current?.sincronizar() }, resolver: (doc, manterLocal) => sync.current?.resolver(doc, manterLocal) }}>
    {carregando ? <div className="conteudo empilha" role="status"><p>Preparando sua conta…</p><button className="botao" onClick={() => { definirUsuarioLocal(null); definirCarregando(false); navegar('/') }}>Continuar sem conta</button></div> : <div key={sessao?.user.id ?? 'visitante'}>{children}</div>}
  </Contexto.Provider>
}
export function usarConta() {
  const conta = useContext(Contexto)
  if (!conta) throw new Error('Provedor de conta indisponível')
  return conta
}
