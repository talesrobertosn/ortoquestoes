import { useEffect, useMemo, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { BarrasHorizontais } from './AdminGraficos'
import { baixarCsv, dataHora, erroDoPainel, porcentagem } from './formatos'

interface Resumo { codigos: number; convidados: number; confirmados: number; confirmados_7d: number; dias_dados: number }
interface Linha {
  id_convidado: string; convidado: string | null; email_convidado: string | null
  id_padrinho: string; padrinho: string | null; email_padrinho: string | null
  criado_em: string; confirmada_em: string | null; respondidas: number; dias_padrinho: number; dias_convidado: number
}
const MIGRACAO = '202610120100_indicacoes_admin.sql'
const META = 20

/**
 * Indique e ganhe: quem indicou quem, quem já confirmou (20 questões) e quem
 * mais trouxe gente. O resumo vem da 202610040200; a lista, da 202610120100.
 */
export function AdminIndicacoes() {
  const [resumo, definirResumo] = useState<Resumo | null>(null)
  const [linhas, definirLinhas] = useState<Linha[] | null>(null)
  const [erro, definirErro] = useState('')
  const [filtro, definirFiltro] = useState<'todas' | 'confirmadas' | 'pendentes'>('todas')

  useEffect(() => {
    let vivo = true
    chamarRpc<Resumo[]>('resumo_indicacoes_admin', {}).then(([r]) => vivo && definirResumo(r ?? null)).catch(() => undefined)
    chamarRpc<Linha[]>('listar_indicacoes_admin', {}).then((l) => vivo && definirLinhas(l)).catch((f) => vivo && definirErro(erroDoPainel(f, MIGRACAO)))
    return () => { vivo = false }
  }, [])

  const padrinhos = useMemo(() => {
    const mapa = new Map<string, { nome: string; total: number; confirmados: number }>()
    for (const l of linhas ?? []) {
      const p = mapa.get(l.id_padrinho) ?? { nome: l.padrinho ?? l.email_padrinho ?? 'Sem nome', total: 0, confirmados: 0 }
      p.total++
      if (l.confirmada_em) p.confirmados++
      mapa.set(l.id_padrinho, p)
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total)
  }, [linhas])

  const visiveis = (linhas ?? []).filter((l) => filtro === 'todas' || (filtro === 'confirmadas' ? !!l.confirmada_em : !l.confirmada_em))
  const convidados = Number(resumo?.convidados ?? linhas?.length ?? 0)
  const confirmados = Number(resumo?.confirmados ?? (linhas ?? []).filter((l) => l.confirmada_em).length)

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-indicacoes">
    <div className="adm-secao__cabeca">
      <div><h2 id="adm-titulo-indicacoes">Indicações</h2><p>Quem chegou por convite de alguém. A indicação confirma quando o convidado responde {META} questões; aí os dois ganham os dias.</p></div>
      {linhas && linhas.length > 0 && <button type="button" className="adm-link" onClick={() => baixarCsv(`ortoquestoes-indicacoes-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Convidado', 'E-mail do convidado', 'Indicado por', 'E-mail de quem indicou', 'Entrou em', 'Questões', 'Confirmada em', 'Dias para quem indicou', 'Dias para o convidado'],
        linhas.map((l) => [l.convidado, l.email_convidado, l.padrinho, l.email_padrinho, dataHora(l.criado_em), l.respondidas, l.confirmada_em ? dataHora(l.confirmada_em) : '', l.dias_padrinho, l.dias_convidado]))}>Exportar</button>}
    </div>

    <div className="adm-kpis">
      <div className="adm-kpi adm-kpi--destaque"><span>Chegaram por indicação</span><strong>{convidados}</strong><small>{resumo ? `${resumo.codigos} pessoa(s) já pegaram o link` : 'contas criadas com convite'}</small></div>
      <div className="adm-kpi"><span>Confirmadas</span><strong>{confirmados}</strong><small>{porcentagem(confirmados, convidados) ?? 0}% chegaram às {META} questões</small></div>
      <div className="adm-kpi"><span>Confirmadas na semana</span><strong>{Number(resumo?.confirmados_7d ?? 0)}</strong><small>últimos 7 dias</small></div>
      <div className="adm-kpi"><span>Dias de plano dados</span><strong>{Number(resumo?.dias_dados ?? 0)}</strong><small>somando quem indicou e quem chegou</small></div>
    </div>

    {erro ? <p className="adm-alerta" role="alert">{erro}</p> : linhas === null ? <p role="status">Carregando…</p> : linhas.length === 0 ? <p className="adm-vazio">Ninguém chegou por indicação ainda.</p> : <div className="adm-duas">
      <div className="empilha">
        <h3>Quem mais indicou</h3>
        <BarrasHorizontais itens={padrinhos.slice(0, 8).map((p) => ({ rotulo: p.nome, valor: p.total, detalhe: `${p.confirmados} confirmada(s)` }))} />
      </div>
      <div className="empilha">
        <div className="adm-linha-nota">
          <h3>Cada convite</h3>
          <div className="adm-filtros" role="group" aria-label="Situação">
            {([['todas', 'Todas'], ['confirmadas', 'Confirmadas'], ['pendentes', 'Pendentes']] as const).map(([v, r]) => <button key={v} type="button" className="adm-chip" aria-pressed={filtro === v} onClick={() => definirFiltro(v)}>{r}</button>)}
          </div>
        </div>
        <div className="adm-tabela-rolagem" role="region" aria-label="Convites usados" tabIndex={0}><table className="tabela adm-retencao">
          <thead><tr><th scope="col">Quem chegou</th><th scope="col">Indicado por</th><th scope="col">Questões</th><th scope="col">Situação</th></tr></thead>
          <tbody>{visiveis.map((l) => <tr key={l.id_convidado}>
            <th scope="row" className="adm-servico">{l.convidado ?? l.email_convidado}<small className="adm-nota"> · {dataHora(l.criado_em)}</small></th>
            <td>{l.padrinho ?? l.email_padrinho}</td>
            <td><span className="adm-celula" style={{ '--p': `${Math.min(100, (Number(l.respondidas) / META) * 100)}%` } as React.CSSProperties}>{Number(l.respondidas)}/{META}</span></td>
            <td>{l.confirmada_em ? <span className="adm-bom">Confirmada · +{l.dias_padrinho} / +{l.dias_convidado} dias</span> : 'Pendente'}</td>
          </tr>)}</tbody>
        </table></div>
      </div>
    </div>}
  </section>
}
