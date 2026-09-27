import { ResumoAssinatura } from '../componentes/ResumoAssinatura'
import { usarConta } from '../conta/ContextoConta'
import { href } from '../util/rotas'

export function DetalhesAssinatura() {
  const { sessao } = usarConta()
  if (!sessao) return <article className="empilha limite-leitura">
    <h1>Dados da assinatura</h1>
    <p>Entre na sua conta para consultar e gerenciar a assinatura.</p>
    <a className="botao" href={href('/conta')}>Entrar na minha conta</a>
  </article>

  return <article className="empilha-2 conta-pagina">
    <a className="conta-assinatura__voltar" href={href('/conta')}>← Voltar para Minha conta</a>
    <header><h1>Dados da assinatura</h1><p>Consulte cobranças e datas. Se precisar, escolha entre impedir a próxima renovação ou pedir reembolso dentro da garantia.</p></header>
    <ResumoAssinatura detalhada />
  </article>
}
