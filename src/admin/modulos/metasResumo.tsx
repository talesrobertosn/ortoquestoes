import { useMemo } from 'react'
import { taxaPixSugerida } from '../../componentes/admin/financeiro'
import { MES, NOME_MES, cobrancas as cobrancasDe } from '../../componentes/admin/receita'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { usarPainel } from '../dados/painel'
import { META_OFICIAL, ROTULO_SITUACAO, esperadoAteHoje, metasVigentes, projetarMes, realizadoPorMes, situacao, type LinhaMetaBanco, type MetaMes } from '../dados/metas'
import { usarNav } from '../nav'
import { Icone } from '../ui/Icone'
import { usarTaxaPix } from './taxaPix'
import { inteiro, reais } from '../ui/formato'

type Chave = 'faturamento' | 'cadastros' | 'novosPagantes' | 'ativosFim' | 'receitaEquivalente'
const NOME: Record<Chave, string> = { faturamento: 'Faturamento', cadastros: 'Cadastros', novosPagantes: 'Novos pagantes', ativosFim: 'Pagantes ativos', receitaEquivalente: 'Receita equivalente' }
const DINHEIRO: Record<Chave, boolean> = { faturamento: true, cadastros: false, novosPagantes: false, ativosFim: false, receitaEquivalente: true }
const FLUXO: Record<Chave, boolean> = { faturamento: true, cadastros: true, novosPagantes: true, ativosFim: false, receitaEquivalente: false }

/**
 * A meta do mês como referência permanente (Tales, 05/11/2026): uma faixa compacta no alto do Crescimento,
 * do Financeiro e da página Agora, com o realizado, a meta, o esperado até hoje e a situação. Clicar abre Metas.
 * Desde 22/11/2026 a meta vem do plano com o ciclo do TEOT (META_OFICIAL).
 */
export function FaixaMetas({ chaves, titulo = 'Metas do mês' }: { chaves: Chave[]; titulo?: string }) {
  const p = usarPainel()
  const nav = usarNav()
  const metasQ = usarRpc<LinhaMetaBanco[]>(p.conta, 'listar_metas_comerciais_admin')
  const sugerida = useMemo(() => p.reais ? taxaPixSugerida(p.reais).taxa : 0.8, [p.reais])
  const { taxa } = usarTaxaPix(sugerida)
  const d = useMemo(() => {
    if (!p.reais || !p.usuariosReais) return null
    const atual = MES(new Date())
    const metas = metasVigentes(META_OFICIAL, Array.isArray(metasQ.dados) ? metasQ.dados : null)
    const meta = metas.find(x => x.mes === atual)
    if (!meta) return null
    const todas = cobrancasDe(p.reais, p.cobrancas)
    const cadastros = p.usuariosReais.map(u => new Date(u.criado_em)).filter(x => Number.isFinite(x.getTime()))
    const [real] = realizadoPorMes([atual], cadastros, todas, new Map())
    const proj = projetarMes({ cadastros, cobrancas: todas, assinaturas: p.reais, taxaPix: taxa, meta })
    return { meta, real, proj }
  }, [p.reais, p.usuariosReais, p.cobrancas, metasQ.dados, taxa])
  if (!d) return null
  const { meta, real, proj } = d
  return <a className="mt-faixa" href={nav.link('metas')} onClick={e => { e.preventDefault(); nav.ir('metas') }} aria-label={`${titulo}: abrir Metas`}>
    <span className="mt-faixa__titulo"><Icone nome="grafico" tamanho={16} />{titulo} · {NOME_MES(meta.mes).replace(/ de \d{4}$/, '')}<small>realizado / objetivo</small></span>
    {chaves.map(k => {
      const v = real[k] as number, alvo = (meta as MetaMes)[k]
      const s = situacao(proj[k].centro, alvo)
      const esperado = FLUXO[k] ? esperadoAteHoje(alvo, proj.diasPassados, proj.diasNoMes) : null
      const f = (n: number) => DINHEIRO[k] ? reais(n).replace(/,\d\d$/, '') : inteiro(Math.round(n))
      return <span key={k} className={`mt-faixa__item mt-faixa__item--${s}`} title={ROTULO_SITUACAO[s]}>
        <span>{NOME[k]}</span>
        <b>{f(v)} <small>/ {f(alvo)}</small></b>
        <span className="mt-barra"><i style={{ width: `${Math.min(100, alvo ? (v / alvo) * 100 : 100)}%` }} />{esperado !== null && alvo > 0 && <em style={{ left: `${Math.min(100, (esperado / alvo) * 100)}%` }} />}</span>
        <small className="mt-faixa__sit"><i aria-hidden="true" />{s === 'acima' ? 'projeção alcança' : s === 'proximo' ? 'projeção próxima' : 'projeção abaixo'}</small>
      </span>
    })}
    <span className="mt-faixa__ir">Ver metas <Icone nome="direita" tamanho={14} /></span>
  </a>
}
