import { real } from '../../dados/planos'
import { baixarCsv, porcentagem } from './formatos'
import { NOME_MES, type Mes } from './receita'

/**
 * Mês a mês: quantas assinaturas novas (cartão e Pix), quantas renovações
 * automáticas, quantos cancelamentos de verdade (renovação desligada),
 * reembolsos e Pix que terminaram sem renovar (é o normal do Pix), com a
 * receita e o churn do cartão. O mês atual vem primeiro.
 */
export function TabelaMensal({ meses }: { meses: Mes[] }) {
  const linhas = [...meses].reverse()
  const churn = (m: Mes, i: number) => {
    const anterior = linhas[i + 1]?.baseCartao ?? 0
    return anterior ? porcentagem(m.cancelamentos, anterior) : null
  }
  return <>
    <div className="adm-linha-nota">
      <p className="adm-nota">Churn = cancelamentos do mês sobre os cartões que renovavam sozinhos no fim do mês anterior. Pix não entra no churn: ele é pago uma vez e termina sem renovar.</p>
      <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-mes-a-mes-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Mês', 'Receita', 'Novas no cartão', 'Novas no Pix', 'Receita de novas', 'Renovações automáticas', 'Receita de renovações', 'Cancelamentos', 'Reembolsos', 'Valor reembolsado', 'Pix encerrados', 'Cartões renovando no fim do mês', 'Churn (%)'],
        linhas.map((m, i) => [NOME_MES(m.chave), m.receita.toFixed(2).replace('.', ','), m.novasCartao, m.novasPix, m.receitaNovas.toFixed(2).replace('.', ','), m.renovacoes, m.receitaRenovacoes.toFixed(2).replace('.', ','), m.cancelamentos, m.reembolsos, m.valorReembolsado.toFixed(2).replace('.', ','), m.pixEncerrados, m.baseCartao, churn(m, i)]))}>Exportar</button>
    </div>
    <div className="adm-tabela-rolagem" role="region" aria-label="Assinaturas e receita mês a mês" tabIndex={0}><table className="tabela adm-retencao adm-mensal">
      <thead><tr>
        <th scope="col">Mês</th><th scope="col">Receita</th><th scope="col">Novas</th><th scope="col">Renovações</th>
        <th scope="col">Cancelamentos</th><th scope="col">Reembolsos</th><th scope="col">Pix encerrados</th><th scope="col">Cartões renovando</th><th scope="col">Churn</th>
      </tr></thead>
      <tbody>{linhas.map((m, i) => {
        const c = churn(m, i)
        return <tr key={m.chave}>
          <th scope="row">{NOME_MES(m.chave)}</th>
          <td className="numerico"><strong>{real(m.receita)}</strong></td>
          <td className="numerico">{m.novasCartao + m.novasPix}<small> ({m.novasCartao} cartão · {m.novasPix} Pix)</small></td>
          <td className="numerico">{m.renovacoes}{m.renovacoes > 0 && <small> · {real(m.receitaRenovacoes)}</small>}</td>
          <td className="numerico">{m.cancelamentos}</td>
          <td className="numerico">{m.reembolsos}{m.reembolsos > 0 && <small> · {real(m.valorReembolsado)}</small>}</td>
          <td className="numerico">{m.pixEncerrados}</td>
          <td className="numerico">{m.baseCartao}</td>
          <td>{c === null ? '—' : <span className="adm-celula" style={{ '--p': `${Math.min(100, c)}%` } as React.CSSProperties}>{c}%</span>}</td>
        </tr>
      })}</tbody>
    </table></div>
  </>
}
