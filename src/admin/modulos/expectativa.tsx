import { useMemo } from 'react'
import { meioDe, precoDe, renovaSozinha, vigentesPorPessoa, type Cobranca } from '../../componentes/admin/receita'
import type { LinhaAssinatura } from '../dados/painel'
import { inteiro, reais } from '../ui/formato'
import { Colunas, type PontoColuna } from '../ui/graficos'

type Grupo = 'cartao' | 'pix' | 'saindo'
interface Linha { chave: string; plano: string; nomePlano: string; meses: number; grupo: Grupo; pessoas: number; preco: number; porMes: number }

const NOME_GRUPO: Record<Grupo, string> = { cartao: 'Cartão, renova sozinho', pix: 'Pix, precisa pagar de novo', saindo: 'Cancelaram, acesso até o fim' }

/**
 * "Quanto entra por mês com quem assina hoje" (Tales, 04/11/2026: "temos em média 21 assinantes mensais, então a
 * expectativa se esses 21 assinarem…"). A conta fica escrita, linha a linha: pessoas × preço que cada uma pagou,
 * convertido para o mês (semestral ÷ 6, anual ÷ 12). Quem cancelou ainda tem acesso, mas não entra na expectativa.
 */
export function Expectativa({ assinaturas, todas }: { assinaturas: LinhaAssinatura[]; todas: Cobranca[] }) {
  const d = useMemo(() => {
    const ultimoValor = new Map<string, number>()
    for (const c of [...todas].sort((a, b) => a.em.getTime() - b.em.getTime())) ultimoValor.set(c.id_usuario, c.valor)
    const linhas = new Map<string, Linha>()
    for (const a of vigentesPorPessoa(assinaturas)) {
      const p = precoDe(a.plano)
      if (!p) continue
      const grupo: Grupo = renovaSozinha(a) ? 'cartao' : meioDe(a) === 'pix' ? 'pix' : 'saindo'
      const preco = ultimoValor.get(a.id_usuario) ?? p.total
      // Preço antigo e novo convivem: cada preço vira uma linha, para a conta bater.
      const chave = `${grupo}|${a.plano}|${preco.toFixed(2)}`
      const l = linhas.get(chave) ?? { chave, plano: a.plano, nomePlano: p.nome, meses: p.meses, grupo, pessoas: 0, preco, porMes: 0 }
      l.pessoas++; l.porMes += preco / p.meses
      linhas.set(chave, l)
    }
    const lista = [...linhas.values()].sort((a, b) => ['cartao', 'pix', 'saindo'].indexOf(a.grupo) - ['cartao', 'pix', 'saindo'].indexOf(b.grupo) || a.meses - b.meses || b.pessoas - a.pessoas)
    const soma = (g: Grupo) => lista.filter(l => l.grupo === g).reduce((s, l) => ({ pessoas: s.pessoas + l.pessoas, porMes: s.porMes + l.porMes }), { pessoas: 0, porMes: 0 })
    const cartao = soma('cartao'), pix = soma('pix'), saindo = soma('saindo')
    // Assinantes novos: média dos últimos 3 meses completos.
    const agora = new Date()
    const meses = Array.from({ length: 3 }, (_, i) => { const x = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 1 - i, 15)); return x.toISOString().slice(0, 7) })
    const novasPorMes = new Map(meses.map(m => [m, { n: 0, valor: 0 }]))
    for (const c of todas) { if (c.tipo !== 'nova') continue; const m = new Date(c.em.getTime() - 3 * 3_600_000).toISOString().slice(0, 7); const x = novasPorMes.get(m); if (x) { x.n++; x.valor += c.valor / (precoDe(c.plano)?.meses ?? 1) } }
    const comDado = [...novasPorMes.values()]
    const mediaNovas = comDado.reduce((s, x) => s + x.n, 0) / 3
    const mediaNovasValor = comDado.reduce((s, x) => s + x.valor, 0) / 3
    return { lista, cartao, pix, saindo, esperado: cartao.porMes + pix.porMes, pessoas: cartao.pessoas + pix.pessoas, mediaNovas, mediaNovasValor }
  }, [assinaturas, todas])

  const pontos: PontoColuna[] = [
    { longo: 'Cartão, renova sozinho', curto: 'Cartão', partes: [d.cartao.porMes, 0] },
    { longo: 'Pix, se pagarem de novo', curto: 'Pix', partes: [0, d.pix.porMes] },
    { longo: 'Total esperado por mês', curto: 'Total', partes: [d.cartao.porMes, d.pix.porMes] },
  ]
  return <section className="a3-painel a3-expectativa" aria-labelledby="a3-exp-titulo">
    <div className="a3-expectativa__topo">
      <div className="a3-expectativa__frase">
        <span className="a3-rotulo">Quanto entra por mês com quem assina hoje</span>
        <h2 id="a3-exp-titulo" className="a3-expectativa__valor">{reais(d.esperado)}<small> por mês</small></h2>
        <p>Hoje são <b>{inteiro(d.pessoas)} {d.pessoas === 1 ? 'assinante' : 'assinantes'}</b> que continuam pagando. Se todos continuarem, entram <b>{reais(d.esperado)} por mês</b>: {reais(d.cartao.porMes)} do cartão, que renova sozinho, e {reais(d.pix.porMes)} do Pix, se pagarem de novo quando o acesso acabar.</p>
        {d.mediaNovas > 0 && <p className="a3-mudo">Nos últimos 3 meses chegaram, em média, <b>{d.mediaNovas.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} assinantes novos por mês</b>; cada mês assim soma cerca de <b>{reais(d.mediaNovasValor)}</b> a esse valor.</p>}
      </div>
      <div className="a3-expectativa__grafico"><Colunas descricao="Receita esperada por mês: cartão, Pix e total" pontos={pontos} series={[{ nome: 'Cartão' }, { nome: 'Pix', estilo: 2 }]} formato={reais} altura={180} media={false} /></div>
    </div>
    <div className="a3-tabela-caixa">
      <table className="a3-tabela a3-tabela--compacta a3-expectativa__conta">
        <caption className="a3-so-leitor">A conta: pessoas × preço, convertido para o mês</caption>
        <thead><tr><th scope="col">Plano</th><th scope="col" className="so-largo">Como paga</th><th scope="col" className="num">Pessoas</th><th scope="col" className="num so-largo">Preço pago</th><th scope="col" className="num">Por mês</th></tr></thead>
        <tbody>{d.lista.map(l => <tr key={l.chave} className={l.grupo === 'saindo' ? 'fora' : undefined}>
          <th scope="row">{l.nomePlano}<span className="a3-sub so-celular">{NOME_GRUPO[l.grupo]}</span></th>
          <td className="so-largo">{NOME_GRUPO[l.grupo]}</td>
          <td className="num">{inteiro(l.pessoas)}</td>
          <td className="num so-largo">{reais(l.preco)}{l.meses > 1 && <span className="a3-sub">÷ {l.meses} = {reais(l.preco / l.meses)}/mês</span>}</td>
          <td className="num"><b>{l.grupo === 'saindo' ? <s>{reais(l.porMes)}</s> : reais(l.porMes)}</b><span className="a3-sub">{inteiro(l.pessoas)} × {reais(l.preco / l.meses)}</span></td>
        </tr>)}</tbody>
        <tfoot><tr><th scope="row">Esperado por mês</th><td className="so-largo" /><td className="num">{inteiro(d.pessoas)}</td><td className="so-largo" /><td className="num"><b>{reais(d.esperado)}</b></td></tr></tfoot>
      </table>
    </div>
    {d.saindo.pessoas > 0 && <p className="a3-mudo a3-pequeno" style={{ margin: 0 }}>Riscado: {inteiro(d.saindo.pessoas)} {d.saindo.pessoas === 1 ? 'pessoa desligou' : 'pessoas desligaram'} a renovação do cartão. Ainda {d.saindo.pessoas === 1 ? 'tem' : 'têm'} acesso, mas não {d.saindo.pessoas === 1 ? 'entra' : 'entram'} na conta ({reais(d.saindo.porMes)} por mês a menos).</p>}
  </section>
}
