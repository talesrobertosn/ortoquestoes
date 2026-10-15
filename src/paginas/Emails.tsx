import { useEffect, useState } from 'react'
import { chamarFuncaoPublica } from '../servicos/supabase'
import { href } from '../util/rotas'

/**
 * Destino dos links "não quero mais receber" dos e-mails (conquistas,
 * relatório mensal, lembretes ou cartas pessoais). Funciona sem login: o link leva uma assinatura que só o
 * servidor sabe gerar.
 */
export function Emails({ consulta }: { consulta?: URLSearchParams }) {
  const u = consulta?.get('u') ?? '', t = consulta?.get('t') ?? ''
  const bruto = consulta?.get('tipo')
  const tipo = bruto === 'relatorio' || bruto === 'lembretes' || bruto === 'cartas' ? bruto : 'conquistas'
  const relatorio = tipo === 'relatorio'
  const [estado, definirEstado] = useState<'enviando' | 'ok' | 'erro'>('enviando')
  useEffect(() => {
    if (!u || !t) { definirEstado('erro'); return }
    chamarFuncaoPublica('enviar-email', { acao: 'descadastrar', u, t, ...(tipo !== 'conquistas' ? { tipo } : {}) }).then(() => definirEstado('ok')).catch(() => definirEstado('erro'))
  }, [u, t, tipo])
  return <article className="empilha limite-leitura">
    <h1>{relatorio ? 'Resumos de estudo' : tipo === 'lembretes' ? 'Lembretes de estudo' : tipo === 'cartas' ? 'Mensagens pessoais' : 'E-mails de conquistas'}</h1>
    {estado === 'enviando' && <p role="status">Atualizando sua preferência…</p>}
    {estado === 'ok' && <>
      <p role="status">{relatorio
        ? 'Pronto: você não vai mais receber o resumo quinzenal nem o relatório do mês por e-mail. Se mudar de ideia, dá para ligar de novo em Minha conta, na parte de preferências.'
        : tipo === 'lembretes'
        ? 'Pronto: você não vai mais receber lembretes de estudo por e-mail. Se mudar de ideia, dá para ligar de novo em Minha conta, na parte de preferências.'
        : tipo === 'cartas'
        ? 'Pronto: você não vai mais receber as mensagens pessoais do Tales. Se mudar de ideia, dá para ligar de novo em Minha conta, na parte de preferências.'
        : 'Pronto: você não vai mais receber e-mails de parabéns pelos emblemas. Se mudar de ideia, dá para ligar de novo em Minha conta, na parte de preferências.'}</p>
      <a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a>
    </>}
    {estado === 'erro' && <>
      <p role="alert">Este link não funcionou. Ele pode ter sido copiado pela metade. Você também pode desligar esses e-mails em Minha conta, na parte de preferências.</p>
      <a className="botao" href={href('/conta')}>Abrir Minha conta</a>
    </>}
  </article>
}
