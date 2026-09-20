import { useState } from 'react'
import { entrarComSenha, enviarLinkAcesso, supabaseConfigurado } from '../servicos/supabase'
import { navegar } from '../util/rotas'

export function Entrar() {
  const [email, definirEmail] = useState('')
  const [senha, definirSenha] = useState('')
  const [mensagem, definirMensagem] = useState<string | null>(null)
  const configurado = supabaseConfigurado()
  return (
    <article className="limite-leitura empilha">
      <h1>Entrar ou criar conta</h1>
      <p>Entre com e-mail e senha ou receba um link mágico. Se a conta ainda não existir, ela será criada após a confirmação do link.</p>
      {!configurado && <p className="aviso-ia">A entrada está desativada nesta publicação.</p>}
      <form className="cartao cartao__corpo empilha" onSubmit={async (e) => {
        e.preventDefault(); definirMensagem('Enviando…')
        try { await enviarLinkAcesso(email); definirMensagem('Confira seu e-mail e abra o link de acesso neste navegador.') }
        catch (erro) { definirMensagem(erro instanceof Error ? erro.message : 'Não foi possível entrar.') }
      }}>
        <label className="campo"><span className="campo__rotulo">E-mail</span><input className="entrada" type="email" required autoComplete="email" value={email} onChange={(e) => definirEmail(e.target.value)} /></label>
        <label className="campo"><span className="campo__rotulo">Senha</span><input className="entrada" type="password" autoComplete="current-password" value={senha} onChange={(e) => definirSenha(e.target.value)} /></label>
        <button className="botao botao--principal" type="button" disabled={!configurado || !senha} onClick={async () => {
          definirMensagem('Entrando…')
          try {
            await entrarComSenha(email, senha)
            navegar('/assinatura', true)
          } catch (erro) {
            definirMensagem(erro instanceof Error ? erro.message : 'Não foi possível entrar.')
          } finally {
            definirSenha('')
          }
        }}>Entrar com senha</button>
        <button className="botao" type="submit" disabled={!configurado}>Enviar link mágico</button>
        {mensagem && <p className="meta" role="status">{mensagem}</p>}
      </form>
    </article>
  )
}
