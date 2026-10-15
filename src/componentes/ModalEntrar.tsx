import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../conta/supabase'
import { textoErro } from '../conta/erros'
import { href, navegar } from '../util/rotas'
import { Icone } from './Icone'
import { BotaoGoogle } from './BotaoGoogle'
import { ModalConfirmarEmail } from './ModalConfirmarEmail'
import { limparConfirmacaoPendente } from '../conta/confirmacaoPendente'
import { levarEmail, linkConta } from '../conta/passagem'

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
  const [erro, definirErro] = useState<{ texto: string; codigo?: string; n: number } | null>(null)
  const [pendente, definirPendente] = useState<string | null>(null)
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
    definirErro(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
      if (error) throw error
      limparConfirmacaoPendente()
      definirSenha('')
      fechar()
    } catch (e) {
      const codigo = (e as { code?: string }).code
      if (codigo === 'email_not_confirmed') { definirPendente(email.trim()); return }
      definirErro((anterior) => ({ texto: textoErro(codigo), codigo, n: (anterior?.n ?? 0) + 1 }))
      if (codigo === 'invalid_credentials') referencia.current?.querySelector<HTMLInputElement>('input[type=password]')?.select()
    } finally {
      definirOcupado(false)
    }
  }

  if (pendente) return <ModalConfirmarEmail email={pendente} aoFechar={() => { definirPendente(null); fechar() }} aoEntrar={() => definirPendente(null)} />

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
        <BotaoGoogle />
        <form className="empilha" onSubmit={enviar}>
          <label className="campo">
            E-mail
            <input className="entrada" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => definirEmail(e.target.value)} />
          </label>
          <label className="campo">
            Senha
            <input className={'entrada' + (erro?.codigo === 'invalid_credentials' ? ' entrada--invalida' : '')} type="password" autoComplete="current-password" required value={senha} onChange={(e) => definirSenha(e.target.value)} />
          </label>
          {erro && <div key={erro.n} className="aviso-formulario aviso-formulario--erro aviso-formulario--destaque" role="alert">
            <Icone nome="alerta" tamanho={20} />
            <span>{erro.texto}{erro.codigo === 'invalid_credentials' && ' Criou a conta pelo Google? Use o botão do Google acima.'}</span>
          </div>}
          <button className="botao botao--principal botao--largo" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
        </form>
        <a
          href={href(linkConta('recuperar'))}
          onClick={() => { levarEmail(email); fechar() }}
          className="texto-2"
        >
          Esqueceu sua senha?
        </a>
        <div className="modal-central__rodape">
          <span className="texto-2">Ainda não tem conta?</span>
          <button
            type="button"
            className="botao botao--principal"
            onClick={() => { fechar(); navegar(linkConta('criar')) }}
          >
            Criar conta gratuita
          </button>
        </div>
      </div>
    </>
  )
}
