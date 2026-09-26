import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../conta/supabase'
import { textoErro } from '../conta/erros'
import { href, navegar } from '../util/rotas'
import { Icone } from './Icone'

/**
 * Entrar sem sair da página inicial: um pop-up pequeno e centralizado, não um
 * painel lateral inteiro para dois campos. Quem não tem conta ainda vê o link
 * de criar conta logo abaixo — o cadastro continua sendo o caminho principal,
 * este modal só evita o desvio de página para quem já tem senha.
 */
export function ModalEntrar({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const [email, definirEmail] = useState('')
  const [senha, definirSenha] = useState('')
  const [ocupado, definirOcupado] = useState(false)
  const [erro, definirErro] = useState('')
  const referencia = useRef<HTMLDivElement>(null)
  const anterior = useRef<HTMLElement | null>(null)
  const fechar = () => { definirSenha(''); aoFechar() }

  useEffect(() => {
    if (!aberto) return
    anterior.current = document.activeElement as HTMLElement | null
    referencia.current?.querySelector<HTMLElement>('input')?.focus()
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') { evento.stopPropagation(); fechar() }
      if (evento.key !== 'Tab' || !referencia.current) return
      const focaveis = [...referencia.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])')]
      if (!focaveis.length) return
      const ultimo = focaveis[focaveis.length - 1]
      if (evento.shiftKey && document.activeElement === focaveis[0]) {
        evento.preventDefault(); ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault(); focaveis[0].focus()
      }
    }
    document.addEventListener('keydown', aoTeclar, true)
    return () => {
      document.removeEventListener('keydown', aoTeclar, true)
      anterior.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto])

  if (!aberto) return null

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!supabase || ocupado) return
    definirOcupado(true)
    definirErro('')
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
      if (error) throw error
      definirSenha('')
      fechar()
    } catch (e) {
      definirErro(textoErro((e as { code?: string }).code))
    } finally {
      definirOcupado(false)
    }
  }

  return (
    <>
      <button className="veu" aria-label="Fechar" onClick={fechar} />
      <div className="modal-central" role="dialog" aria-modal="true" aria-label="Entrar na sua conta" ref={referencia}>
        <div className="modal-central__topo">
          <h2>Entrar</h2>
          <button type="button" className="botao-icone" onClick={fechar} aria-label="Fechar">
            <Icone nome="fechar" />
          </button>
        </div>
        <form className="empilha" onSubmit={enviar}>
          {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
          <label className="campo">
            E-mail
            <input className="entrada" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => definirEmail(e.target.value)} />
          </label>
          <label className="campo">
            Senha
            <input className="entrada" type="password" autoComplete="current-password" required value={senha} onChange={(e) => definirSenha(e.target.value)} />
          </label>
          <button className="botao botao--principal botao--largo" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <a
          href={href('/conta?modo=recuperar')}
          onClick={fechar}
          className="texto-2"
        >
          Esqueceu sua senha?
        </a>
        <div className="modal-central__rodape">
          <span className="texto-2">Ainda não tem conta?</span>
          <button
            type="button"
            className="botao botao--principal"
            onClick={() => { fechar(); navegar('/conta?modo=criar') }}
          >
            Criar conta gratuita
          </button>
        </div>
      </div>
    </>
  )
}
