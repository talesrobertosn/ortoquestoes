import { useEffect, useState } from 'react'
import { chamarFuncaoPublica } from '../servicos/supabase'
import { href } from '../util/rotas'

/**
 * Destino do link "não quero mais receber e-mails de conquistas". Funciona
 * sem login: o link leva uma assinatura que só o servidor sabe gerar.
 */
export function Emails({ consulta }: { consulta?: URLSearchParams }) {
  const u = consulta?.get('u') ?? '', t = consulta?.get('t') ?? ''
  const [estado, definirEstado] = useState<'enviando' | 'ok' | 'erro'>('enviando')
  useEffect(() => {
    if (!u || !t) { definirEstado('erro'); return }
    chamarFuncaoPublica('enviar-email', { acao: 'descadastrar', u, t }).then(() => definirEstado('ok')).catch(() => definirEstado('erro'))
  }, [u, t])
  return <article className="empilha limite-leitura">
    <h1>E-mails de conquistas</h1>
    {estado === 'enviando' && <p role="status">Atualizando sua preferência…</p>}
    {estado === 'ok' && <>
      <p role="status">Pronto: você não vai mais receber e-mails de parabéns pelos emblemas. Se mudar de ideia, dá para ligar de novo em Minha conta, na parte de preferências.</p>
      <a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a>
    </>}
    {estado === 'erro' && <>
      <p role="alert">Este link não funcionou. Ele pode ter sido copiado pela metade. Você também pode desligar esses e-mails em Minha conta, na parte de preferências.</p>
      <a className="botao" href={href('/conta')}>Abrir Minha conta</a>
    </>}
  </article>
}
