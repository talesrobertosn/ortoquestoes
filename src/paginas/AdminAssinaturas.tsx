import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'

interface LinhaAssinatura {
  id_usuario: string
  usuario: string
  plano: string
  status: string
  proxima_cobranca: string | null
  ultima_atualizacao: string
}

const data = (valor: string | null) => valor ? new Date(valor).toLocaleString('pt-BR') : '—'

export function AdminAssinaturas() {
  const { sessao } = usarConta()
  const [linhas, definirLinhas] = useState<LinhaAssinatura[] | null>(null)
  const [erro, definirErro] = useState('')

  useEffect(() => {
    if (!sessao) return
    let ativo = true
    chamarRpc<LinhaAssinatura[]>('listar_assinaturas_admin', {})
      .then((resultado) => { if (ativo) definirLinhas(resultado) })
      .catch((falha) => {
        if (!ativo) return
        definirErro(String(falha).includes('(403)')
          ? 'Acesso negado. Esta área é exclusiva de administradores.'
          : 'Não foi possível carregar as assinaturas. Tente novamente mais tarde.')
      })
    return () => { ativo = false }
  }, [sessao])

  if (!sessao) return <article className="empilha limite-leitura"><h1>Administração de assinaturas</h1><p>Entre na sua conta para continuar.</p><a className="botao" href={href('/conta')}>Entrar</a></article>

  return <article className="empilha-2 conta-pagina">
    <header><h1>Administração de assinaturas</h1><p>Consulta restrita, autorizada pelo servidor.</p></header>
    {erro ? <p role="alert">{erro}</p> : linhas === null ? <p role="status">Verificando acesso…</p> :
      linhas.length === 0 ? <p>Nenhuma assinatura registrada.</p> :
      <div className="admin-assinaturas__tabela">
        <table className="tabela">
          <thead><tr><th>Usuário</th><th>Plano</th><th>Status</th><th>Próxima cobrança</th><th>Atualização</th></tr></thead>
          <tbody>{linhas.map((linha) => <tr key={`${linha.id_usuario}:${linha.ultima_atualizacao}`}>
            <td>{linha.usuario}</td><td>{linha.plano}</td><td>{linha.status}</td><td>{data(linha.proxima_cobranca)}</td><td>{data(linha.ultima_atualizacao)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
  </article>
}
