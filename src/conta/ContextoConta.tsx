import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { definirUsuarioLocal, gravar, limparTudo } from '../estado/armazenamento'
import { supabase, contasDisponiveis } from './supabase'
import { iniciarSincronizacao, type StatusSync } from './sincronizacao'
import { estadoVazio, type Documento } from './modeloSync'
import { navegar } from '../util/rotas'
import { gerarId } from '../util/id'
import { retornoAuth, definirAvisoConta, textoErroLink, validarRetornoUmaVez } from './retornoAuth'

const STATUS_INICIAL: StatusSync = { estado: 'sincronizando', pendentes: 0, conflitos: [], pronto: false, rejeitados: [] }
interface ContaContexto {
  sessao: Session | null
  carregando: boolean
  recuperacao: boolean
  encerrarRecuperacao: () => void
  status: StatusSync
  sincronizar: () => void
  reiniciarProgresso: () => void
  resolver: (doc: Documento, manterLocal: boolean) => void
  reenviarRejeitados: () => void
  descartarRejeitados: () => void
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
    const cliente = supabase
    const retorno = retornoAuth()
    const irPara = (hash: string) => {
      const url = new URL(window.location.href)
      url.searchParams.delete('conta'); url.searchParams.delete('code'); url.hash = hash
      window.history.replaceState(null, '', url.href)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
    if (retorno?.erro) {
      definirAvisoConta(textoErroLink(retorno.erro, retorno.recuperacao))
      irPara(retorno.recuperacao ? '/conta?modo=recuperar' : '/conta')
    }
    // Link com sessão no hash ou com token_hash: a conta só termina de
    // carregar depois de validar o link, para não piscar a tela de entrar.
    let aguardandoRetorno = Boolean(retorno && !retorno.erro && (retorno.tokens || retorno.tokenHash))
    if (retorno && aguardandoRetorno) {
      const concluir = (ok: boolean) => {
        if (!ativo) return
        aguardandoRetorno = false
        if (ok && retorno.recuperacao) definirRecuperacao(true)
        if (!ok) definirAvisoConta(textoErroLink('otp_expired', retorno.recuperacao))
        irPara(ok ? (retorno.recuperacao ? '/conta' : '/') : retorno.recuperacao ? '/conta?modo=recuperar' : '/conta')
        definirCarregando(false)
      }
      void validarRetornoUmaVez(async () => {
        const { error } = retorno.tokenHash ? await cliente.auth.verifyOtp(retorno.tokenHash) : await cliente.auth.setSession(retorno.tokens!)
        return !error
      }).then(concluir)
    }
    // Callback síncrono: não aguardar chamadas do Auth dentro deste evento.
    const { data } = supabase.auth.onAuthStateChange((evento, proxima) => {
      if (!ativo) return
      const id = proxima?.user.id ?? null
      if (id !== usuarioAtual.current) {
        sync.current?.parar(); sync.current = null
        definirStatus(STATUS_INICIAL)
        usuarioAtual.current = id; definirUsuarioLocal(id)
      }
      definirSessao(proxima); if (!aguardandoRetorno) definirCarregando(false)
      if (evento === 'PASSWORD_RECOVERY') definirRecuperacao(true)
      const url = new URL(window.location.href)
      if (evento === 'SIGNED_IN' && proxima && !recuperacao) {
        url.searchParams.delete('conta'); url.searchParams.delete('code'); url.hash = '/'
        window.history.replaceState(null, '', url.href)
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      } else if (url.searchParams.has('conta') && (evento === 'INITIAL_SESSION' || evento === 'PASSWORD_RECOVERY')) {
        const deRecuperacao = url.searchParams.get('conta') === 'recuperar'
        if (proxima && deRecuperacao) definirRecuperacao(true)
        // ?code= sem sessão: o link PKCE foi aberto em outro navegador (ou
        // expirou). Sem este aviso a pessoa caía na tela de entrar sem saber
        // por quê.
        const falhou = !proxima && url.searchParams.has('code') && !aguardandoRetorno
        if (falhou) definirAvisoConta(textoErroLink('navegador', deRecuperacao))
        url.searchParams.delete('conta'); url.searchParams.delete('code'); url.hash = falhou && deRecuperacao ? '/conta?modo=recuperar' : '/conta'
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
    reiniciarProgresso: () => {
      if (!supabase || !sessao) return
      sync.current?.parar()
      gravar('reinicio:pendente', gerarId(), 'nuvem')
      gravar('sincronia:v1', estadoVazio(), 'nuvem')
      limparTudo('nuvem')
      gravar('reinicio:em', Date.now(), 'nuvem')
      sync.current = iniciarSincronizacao(supabase, sessao.user.id, definirStatus)
    },
    sincronizar: () => { void sync.current?.sincronizar() }, resolver: (doc, manterLocal) => sync.current?.resolver(doc, manterLocal),
    reenviarRejeitados: () => sync.current?.reenviarRejeitados(), descartarRejeitados: () => sync.current?.descartarRejeitados() }}>
    {carregando ? <div className="conteudo empilha" role="status"><p>Preparando sua conta…</p><button className="botao" onClick={() => { definirUsuarioLocal(null); definirCarregando(false); navegar('/') }}>Continuar sem conta</button></div> : <div key={sessao?.user.id ?? 'visitante'}>{children}</div>}
  </Contexto.Provider>
}
export function usarConta() {
  const conta = useContext(Contexto)
  if (!conta) throw new Error('Provedor de conta indisponível')
  return conta
}
