import { useEffect, useRef, useState } from 'react'
import { retornoConta, supabase } from '../conta/supabase'
import { textoErro } from '../conta/erros'
import { caixaDeEntrada } from '../conta/confirmacaoPendente'
import { recurso } from '../config'
import '../estilos/componentes/ModalConfirmarEmail.css'

const ESPERA_REENVIO_S = 60

interface Props {
  email: string
  /** Fechar no X (a confirmação continua pendente). */
  aoFechar: () => void
  /** "Errei o e-mail": volta ao formulário de cadastro. */
  aoCorrigir?: () => void
  /** "Já confirmei": vai para a tela de entrar. */
  aoEntrar?: () => void
}

/**
 * Pop-up de "confirme seu e-mail", no meio da tela e por cima de tudo: o
 * resto do site fica bloqueado até a pessoa fechar no X. Sem confirmar, a
 * conta não entra, e o aviso discreto no topo do formulário passava batido.
 */
export function ModalConfirmarEmail({ email, aoFechar, aoCorrigir, aoEntrar }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const [espera, definirEspera] = useState(ESPERA_REENVIO_S)
  const [enviando, definirEnviando] = useState(false)
  const [aviso, definirAviso] = useState<{ texto: string; erro?: boolean } | null>(null)
  const atalho = caixaDeEntrada(email)

  useEffect(() => {
    if (espera <= 0) return
    const t = window.setTimeout(() => definirEspera((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [espera])

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    caixa.current?.querySelector<HTMLElement>('.cf-email__acao')?.focus()
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') { evento.stopPropagation(); aoFechar() }
      if (evento.key !== 'Tab' || !caixa.current) return
      const focaveis = [...caixa.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')]
      if (!focaveis.length) return
      const ultimo = focaveis[focaveis.length - 1]
      if (evento.shiftKey && document.activeElement === focaveis[0]) { evento.preventDefault(); ultimo.focus() }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); focaveis[0].focus() }
    }
    document.addEventListener('keydown', aoTeclar, true)
    return () => {
      document.removeEventListener('keydown', aoTeclar, true)
      document.body.style.overflow = rolagem
      anterior?.focus?.()
    }
  }, [aoFechar])

  async function reenviar() {
    if (!supabase || enviando || espera > 0) return
    definirEnviando(true); definirAviso(null)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: retornoConta() } })
      if (error) throw error
      definirAviso({ texto: 'Pronto: mandamos uma carta nova. Use sempre o link do e-mail mais recente.' })
      definirEspera(ESPERA_REENVIO_S)
    } catch (e) {
      definirAviso({ texto: textoErro((e as { code?: string }).code), erro: true })
      definirEspera(ESPERA_REENVIO_S)
    } finally { definirEnviando(false) }
  }

  return (
    <div className="cf-email__veu" role="presentation">
      <div className="cf-email" role="dialog" aria-modal="true" aria-labelledby="cf-email-titulo" ref={caixa}>
        <button type="button" className="cf-email__fechar" onClick={aoFechar} aria-label="Fechar">X</button>
        <div className="cf-email__arte" aria-hidden="true">
          <img src={recurso('ranking/mensageiro.png')} width={72} height={90} alt="" draggable={false} />
          <span className="cf-email__carta" />
        </div>
        <p className="cf-email__selo">Missão: confirmar o e-mail</p>
        <h2 id="cf-email-titulo">Sua carta está a caminho!</h2>
        <p className="cf-email__texto">
          Enviamos um link de confirmação para <strong>{email}</strong>. Abra o e-mail e toque no link para liberar a sua conta: sem isso, não dá para entrar.
        </p>
        {atalho && <a className="botao botao--principal cf-email__acao" href={atalho.url} target="_blank" rel="noopener noreferrer">Abrir o {atalho.nome}</a>}
        <ul className="cf-email__dicas">
          <li>Não achou? Procure em <strong>Spam</strong>, <strong>Lixo eletrônico</strong> ou <strong>Promoções</strong>.</li>
          <li>O remetente é o Orto Questões. Pode levar até 2 minutos.</li>
          <li>Abriu o link em outro navegador? Sem problema: depois de confirmar, é só entrar com e-mail e senha.</li>
        </ul>
        {aviso && <p className={'cf-email__aviso' + (aviso.erro ? ' cf-email__aviso--erro' : '')} role="status">{aviso.texto}</p>}
        <div className="cf-email__botoes">
          <button type="button" className={'botao ' + (atalho ? 'botao--fantasma' : 'botao--principal cf-email__acao')} onClick={() => void reenviar()} disabled={enviando || espera > 0}>
            {enviando ? 'Enviando…' : espera > 0 ? `Reenviar (${espera}s)` : 'Reenviar e-mail'}
          </button>
          {aoEntrar && <button type="button" className="botao botao--fantasma" onClick={aoEntrar}>Já confirmei</button>}
        </div>
        {aoCorrigir && <button type="button" className="cf-email__corrigir" onClick={aoCorrigir}>Digitei o e-mail errado</button>}
      </div>
    </div>
  )
}
