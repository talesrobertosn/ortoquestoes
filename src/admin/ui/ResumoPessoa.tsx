import type { ReactNode } from 'react'
import type { AssinaturaBase } from '../../componentes/admin/receita'
import { renovaSozinha } from '../../componentes/admin/receita'
import { PLANO_CORTESIA } from '../../componentes/admin/rotulos'
import { nomeDe, type LinhaUsuario } from '../dados/pessoas'
import { diasAteVencimento, perfilNaLista } from '../dados/perfilNaLista'
import { data } from './formato'
import { Icone } from './Icone'

/** Identidade visível sem abrir a ficha; não consulta nada por pessoa. */
export function ResumoPessoa({ usuario: u, assinatura, carregando = false, mostrarEmail = true, children }: { usuario: LinhaUsuario; assinatura?: AssinaturaBase; carregando?: boolean; mostrarEmail?: boolean; children?: ReactNode }) {
  const { etapa, objetivos } = perfilNaLista(u)
  const pago = !!u.plano_vigente && u.plano_vigente !== PLANO_CORTESIA && !u.administrador
  const fim = assinatura?.fim_periodo
  const dias = fim ? diasAteVencimento(fim) : null
  const perto = dias !== null && dias >= 0 && dias <= 7
  return <>
    <span className="a3-identidade__nome"><span className="a3-nome">{nomeDe(u)}</span>{etapa && <span className="a3-etapa" title="Etapa informada no perfil">{etapa}</span>}{children}</span>
    {pago && <span className={`a3-vencimento${perto ? ' a3-vencimento--perto' : ''}`} title={assinatura ? renovaSozinha(assinatura) ? 'Fim do período pago atual; renovação automática no cartão.' : 'Fim do acesso pago; sem renovação automática.' : undefined}>
      <Icone nome="calendario" tamanho={13} />
      {fim && dias !== null ? <><time dateTime={fim}>Acesso até {data(fim)}</time>{dias >= 0 && <span className="a3-vencimento__dias">{dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `${dias} dias`}</span>}</> : <span>{carregando ? 'Consultando vencimento…' : 'Vencimento indisponível'}</span>}
    </span>}
    {!!objetivos.length && <span className="a3-objetivos" aria-label="Objetivos de estudo informados">{objetivos.slice(0, 2).map(o => <span key={o} className="a3-objetivo">{o}</span>)}{objetivos.length > 2 && <span className="a3-objetivo a3-objetivo--mais" title={objetivos.slice(2).join(' · ')} aria-label={`Outros objetivos: ${objetivos.slice(2).join(', ')}`}>+{objetivos.length - 2}</span>}</span>}
    {mostrarEmail && <span className="a3-sub a3-identidade__email">{u.email ?? 'conta sem e-mail'}</span>}
  </>
}
