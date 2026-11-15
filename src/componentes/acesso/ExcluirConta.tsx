import { useRef, useState } from 'react'
import { usarConta } from '../../conta/ContextoConta'
import { excluirConta } from '../../conta/exclusao'
import { href } from '../../util/rotas'

/** Aceite explícito antes de uma exclusão irreversível; nenhum pedido é feito ao abrir. */
export function ExcluirConta() {
  const { sessao, encerrarContaExcluida } = usarConta()
  const [aberta, abrir] = useState(false), [aceito, aceitar] = useState(false), [ocupado, ocupar] = useState(false), [erro, definirErro] = useState('')
  const trava = useRef(false)
  if (!sessao?.user.email) return null
  async function apagar() {
    if (!aceito || trava.current || !sessao?.user.email) return
    trava.current = true; ocupar(true); definirErro('')
    try {
      const r = await excluirConta(sessao.user.email)
      if (!r.ok || !r.excluida) throw new Error('O servidor não confirmou a exclusão.')
      await encerrarContaExcluida()
    } catch (e) { definirErro(e instanceof Error ? e.message : 'Não foi possível concluir. Tente novamente.'); trava.current = false; ocupar(false) }
  }
  return <div className="empilha" style={{ marginTop: 20 }}>
    <button type="button" className="botao" aria-expanded={aberta} onClick={() => abrir(!aberta)} disabled={ocupado}>Excluir minha conta e meus dados</button>
    {aberta && <div className="cartao cartao__corpo empilha">
      <h3>Antes de excluir sua conta</h3>
      <p>Você está excluindo <strong>{sessao.user.email}</strong>. O cadastro, perfil, respostas, revisões, flashcards, anotações, histórico e arquivos vinculados no site serão apagados definitivamente. Exporte seu <a href={href('/dados')}>backup</a> antes, se quiser guardar uma cópia.</p>
      <p>O acesso termina com a exclusão, inclusive se houver um período já pago ou uma cortesia. Se houver renovação no cartão, tentaremos cancelá-la no Mercado Pago antes de apagar o cadastro. Se o cancelamento não for confirmado, a exclusão não será concluída. Pix avulso não tem renovação.</p>
      <p>Excluir a conta não solicita reembolso automaticamente. Se quiser pedir um reembolso ou tiver uma cobrança em discussão, <a href={href('/contato?assunto=exclusao-conta')}>fale com o suporte antes</a>. Consulte as <a href={href('/condicoes-assinatura')}>condições da assinatura</a>. Comprovantes no provedor de pagamento e mensagens já enviadas por e-mail não são apagados por esta ação.</p>
      <p>Você poderá criar outra conta com o mesmo e-mail. Ela começará do zero, sem recuperar o progresso ou o acesso da conta excluída.</p>
      <label className="linha"><input type="checkbox" checked={aceito} disabled={ocupado} onChange={e => aceitar(e.target.checked)} />Li e entendi. Solicito a exclusão definitiva da minha conta e dos dados vinculados no site.</label>
      {erro && <p role="alert">{erro}</p>}
      <div className="linha"><button className="botao" type="button" disabled={!aceito || ocupado} onClick={() => void apagar()}>{ocupado ? 'Cancelando renovação e excluindo…' : 'Excluir definitivamente'}</button><button className="botao" type="button" disabled={ocupado} onClick={() => { abrir(false); aceitar(false) }}>Manter minha conta</button></div>
    </div>}
  </div>
}
