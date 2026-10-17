import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { EsperaPixel } from '../componentes/EsperaPixel'
import type { Session } from '@supabase/auth-js'
import { definirUsuarioLocal, gravar, limparTudo } from '../estado/armazenamento'
import { supabase, contasDisponiveis } from './supabase'
import { iniciarSincronizacao, type StatusSync } from './sincronizacao'
import { estadoVazio, type Documento } from './modeloSync'
import { navegar } from '../util/rotas'
import { gerarId } from '../util/id'
import { retornoAuth, definirAvisoConta, textoErroLink, validarRetornoUmaVez } from './retornoAuth'
import { concluirGoogle, textoErroGoogle } from './google'
import { tomarVoltar } from './passagem'
import { aplicarPerfilPendente } from './perfilPendente'
import { aplicarConviteRecebido, conferirMinhaIndicacao } from './indicacao'
import { esquecerRegistroAparelho, vigiarAparelho } from './aparelho'
import { ler } from '../estado/armazenamento'
import type { RegistroQuestao } from '../estado/revisao'
import { vigiarSessaoEntreAparelhos } from '../estado/sessao'

const STATUS_INICIAL: StatusSync = { estado: 'sincronizando', pendentes: 0, conflitos: [], pronto: false, rejeitados: [] }
interface ContaContexto {
  sessao: Session | null
  carregando: boolean
  recuperacao: boolean
  encerrarRecuperacao: () => void
  status: StatusSync
  sincronizar: () => void
  /** Sincroniza e espera terminar (no máximo `ms`); resolve na hora para visitantes. */
  aguardarSincronia: (ms?: number) => Promise<void>
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
  // A pessoa chegou por um link de confirmação do cadastro: a carta "Boas-vindas no dia da
  // confirmação" sai no primeiro login depois dele (emailsAutomaticos), assim que a sessão existir.
  // Estado (e não ref): o efeito abaixo precisa rodar de novo quando a confirmação chega depois da sessão.
  const [confirmouAgora, definirConfirmouAgora] = useState(false)
  // Quando esta sessão começou e para quem já conferimos a volta (uma vez por conta e sessão).
  const inicioSessao = useRef(Date.now())
  const retornoConferido = useRef<string | null>(null)
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
      definirAvisoConta(retorno.google ? textoErroGoogle(retorno.erro) : textoErroLink(retorno.erro, retorno.recuperacao))
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
        // Link de confirmação (type=email ou signup) aceito: a boas-vindas do dia sai quando a sessão entrar.
        if (ok && !retorno.recuperacao && (retorno.tokenHash?.type === 'email' || retorno.tokenHash?.type === 'signup')) definirConfirmouAgora(true)
        // Cadastro confirmado: volta para onde a pessoa pediu a conta (planos, treinar...).
        irPara(ok ? (retorno.recuperacao ? '/conta' : tomarVoltar() ?? '/') : retorno.recuperacao ? '/conta?modo=recuperar' : '/conta')
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
      // Saiu (por vontade própria, sessão expirada ou outro aparelho): o
      // próximo login aqui precisa se registrar de novo como o aparelho da conta.
      if (evento === 'SIGNED_OUT') esquecerRegistroAparelho()
      const url = new URL(window.location.href)
      // SIGNED_IN também pode ocorrer ao retomar a aba ou renovar a sessão.
      // Não navegue nesse evento: a tela de login trata a entrada explícita,
      // e o retorno de link por e-mail é tratado acima por concluir().
      if (url.searchParams.has('conta') && (evento === 'INITIAL_SESSION' || evento === 'PASSWORD_RECOVERY')) {
        const deRecuperacao = url.searchParams.get('conta') === 'recuperar'
        const doGoogle = url.searchParams.get('conta') === 'google'
        if (proxima && deRecuperacao) definirRecuperacao(true)
        // ?code= sem sessão: o link PKCE foi aberto em outro navegador (ou
        // expirou). Sem este aviso a pessoa caía na tela de entrar sem saber
        // por quê.
        const falhou = !proxima && url.searchParams.has('code') && !aguardandoRetorno
        if (falhou) definirAvisoConta(doGoogle ? textoErroGoogle('navegador') : textoErroLink('navegador', deRecuperacao))
        // Volta do Google: aceite dos Termos e nome no perfil, e a pessoa volta
        // para onde estava. Fora do callback, que não pode aguardar o Auth.
        const destinoGoogle = doGoogle && proxima ? concluirGoogle(cliente, proxima.user) : null
        // Link de confirmação do cadastro (?conta=confirmar&code=): mesma volta guardada no cadastro.
        const destinoCadastro = !doGoogle && !deRecuperacao && proxima ? tomarVoltar() : null
        if (!doGoogle && !deRecuperacao && proxima && url.searchParams.get('conta') === 'confirmar') definirConfirmouAgora(true)
        url.searchParams.delete('conta'); url.searchParams.delete('code'); url.hash = destinoGoogle ?? destinoCadastro ?? (falhou && deRecuperacao ? '/conta?modo=recuperar' : '/conta')
        window.history.replaceState(null, '', url.href)
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      }
    })
    return () => { ativo = false; data.subscription.unsubscribe(); sync.current?.parar() }
  }, [])
  useEffect(() => {
    if (!supabase || !sessao?.user.id) return
    sync.current = iniciarSincronizacao(supabase, sessao.user.id, definirStatus)
    // A sessão de questões em andamento é deste aparelho: as respostas que chegam
    // de outro aparelho entram nela (ver reconciliarSessao).
    const pararSessao = vigiarSessaoEntreAparelhos()
    return () => { sync.current?.parar(); sync.current = null; pararSessao() }
  }, [sessao?.user.id])
  // Tudo enviado ao servidor: é a hora de ver se um emblema novo pede e-mail de parabéns.
  useEffect(() => {
    if (!sessao?.user.id || status.estado !== 'salvo' || status.pendentes > 0) return
    const mapa = ler<Record<string, RegistroQuestao>>('respondidas', {})
    const respondidas = Object.keys(mapa).length
    // Sob demanda: a tabela de conquistas (e o bestiário dos flashcards que ela
    // consulta) pesava ~60 KB no código inicial só para esta checagem.
    void import('./emailsMarco').then(({ verificarMarcoEmail }) => verificarMarcoEmail(respondidas)).catch(() => undefined)
    void conferirMinhaIndicacao(sessao.user.id, respondidas)
    // "Que bom te ver de volta": uma vez por conta e sessão, com o progresso já sincronizado
    // (a última resposta pode ter sido em outro aparelho). Nenhum erro de e-mail sobe daqui.
    if (retornoConferido.current !== sessao.user.id) {
      retornoConferido.current = sessao.user.id
      void import('./emailsAutomaticos').then(({ conferirRetorno }) => conferirRetorno(mapa, inicioSessao.current)).catch(() => undefined)
    }
  }, [sessao?.user.id, status.estado, status.pendentes])
  // Chegou pelo link de confirmação e a sessão entrou: boas-vindas no dia da confirmação (uma vez; o servidor também confere).
  useEffect(() => {
    if (!sessao?.user.id || !confirmouAgora) return
    definirConfirmouAgora(false)
    void import('./emailsAutomaticos').then(({ avisarConfirmacao }) => avisarConfirmacao()).catch(() => undefined)
  }, [sessao?.user.id, confirmouAgora])
  // Perfil preenchido no passo 2 do cadastro antes de confirmar o e-mail: entra na conta agora.
  useEffect(() => {
    if (!supabase || !sessao?.user) return
    void aplicarPerfilPendente(supabase, sessao.user).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao?.user.id])
  // Convite de indicação guardado antes de criar a conta: usa assim que entrar.
  useEffect(() => {
    if (!sessao?.user.id) return
    void aplicarConviteRecebido().then((r) => {
      if (r === 'ok') definirAvisoConta('Convite aceito. Responda 20 questões e você e quem te convidou ganham 7 dias do plano completo.')
    })
  }, [sessao?.user.id])
  // Uma conta, um aparelho por vez: ver conta/aparelho.ts.
  useEffect(() => {
    const cliente = supabase
    if (!cliente || !sessao?.user.id) return
    return vigiarAparelho(sessao.user.id, (outro) => {
      definirAvisoConta(`Sua conta foi aberta em outro aparelho${outro ? ` (${outro})` : ''}. Ela fica aberta em um aparelho por vez, então saímos daqui. O que você estudou neste aparelho ficou guardado: é só entrar de novo para continuar (e aí o outro aparelho é que sai).`)
      void cliente.auth.signOut({ scope: 'local' }).finally(() => navegar('/conta'))
    })
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
    sincronizar: () => { void sync.current?.sincronizar() },
    aguardarSincronia: (ms) => sync.current?.aguardar(ms) ?? Promise.resolve(), resolver: (doc, manterLocal) => sync.current?.resolver(doc, manterLocal),
    reenviarRejeitados: () => sync.current?.reenviarRejeitados(), descartarRejeitados: () => sync.current?.descartarRejeitados() }}>
    {carregando ? <EsperaPixel rotulo="Preparando sua conta" acao={<button className="botao" onClick={() => { definirUsuarioLocal(null); definirCarregando(false); navegar('/') }}>Continuar sem conta</button>} /> : <div key={sessao?.user.id ?? 'visitante'}>{children}</div>}
  </Contexto.Provider>
}
export function usarConta() {
  const conta = useContext(Contexto)
  if (!conta) throw new Error('Provedor de conta indisponível')
  return conta
}
export const ContextoConta = Contexto
