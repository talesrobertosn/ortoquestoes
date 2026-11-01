import { useMemo } from 'react'
import { receitaDoPeriodo } from './metricas'
import { ControlePeriodo, GraficoSerie, Indicador, Legenda, QuadroGrafico, inteiro, reais } from './PainelDados'
import type { AssinaturaBase, CobrancaReal } from './receita'
import { rotuloPlano } from './rotulos'
import type { Periodo } from './secoes'

const dataCurta = (dia: string) => dia.slice(8, 10) + '/' + dia.slice(5, 7)
const dataLonga = (dia: string) => new Date(`${dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })

/**
 * Receita › Resultados, faixa do período (01/11/2026): o que entrou de fato (confirmado) e o que é
 * reconstruído, dia a dia e nunca somados num número só; composição por meio e plano com N e %.
 * Abaixo dela continua o quadro completo de AdminFinanceiro (mês, ano, previsão, base, mês a mês).
 * Sem as cobranças gravadas, a faixa não aparece: o quadro de baixo já avisa e usa os preços dos planos.
 */
export function AdminReceitaPeriodo({ assinaturas, cobrancas, periodo, aoMudarPeriodo }: {
  assinaturas: AssinaturaBase[]; cobrancas: CobrancaReal[] | null; periodo: Periodo; aoMudarPeriodo: (p: Periodo) => void
}) {
  const r = useMemo(() => receitaDoPeriodo(assinaturas, cobrancas, periodo), [assinaturas, cobrancas, periodo])
  const base = `aos ${periodo} dias anteriores`
  const totalMeio = r.porMeio.pix + r.porMeio.cartao
  return <section className="adm-receita-periodo" aria-labelledby="adm-rp-titulo">
    <header className="adm-receita-periodo__cabeca">
      <div><h2 id="adm-rp-titulo">Últimos {periodo} dias</h2>
        <p>Mercado Pago é a fonte oficial. Aqui, <b>confirmado</b> é cobrança gravada pelo site; <b>reconstruído</b> é inferido do plano quando falta o registro (renovações antigas do cartão). Previsões ficam no quadro abaixo, separadas.</p></div>
      <ControlePeriodo periodo={periodo} aoMudar={aoMudarPeriodo} />
    </header>
    <div className="adm-receita-periodo__kpis">
      <Indicador metrica="receitaConfirmada" escala="grande" valor={reais(r.confirmada.atual)} variacao={r.confirmada} base={base} formato={reais} tendencia={r.porDia.map(d => d.confirmada)} />
      <Indicador metrica="receitaReconstruida" valor={reais(r.reconstruida)} nota="não soma ao confirmado" />
      <Indicador metrica="novasAssinaturas" valor={inteiro(r.novas.atual)} variacao={r.novas} base={base} nota={`${inteiro(r.renovacoes)} ${r.renovacoes === 1 ? 'renovação' : 'renovações'} no período`} />
    </div>
    <QuadroGrafico titulo="Receita por dia" pergunta="Quando o dinheiro entrou, e quanto de cada dia é registro ou reconstrução."
      fonte="cobrancas_admin + listar_assinaturas_admin · dia de São Paulo · contas de teste fora" qualidade="derivado"
      legenda={<Legenda series={[{ id: 'a', nome: 'Confirmado', estilo: 'a' }, { id: 'c', nome: 'Reconstruído', estilo: 'c' }]} />}
      estado={r.porDia.every(d => !d.confirmada && !d.reconstruida) ? { tipo: 'vazio', texto: `Nenhuma cobrança nos últimos ${periodo} dias (zero real, não falta de dado).` } : null}
      tabela={{ cabecalho: ['Dia', 'Confirmado', 'Reconstruído'], linhas: r.porDia.filter(d => d.confirmada || d.reconstruida).map(d => [dataLonga(d.dia), reais(d.confirmada), reais(d.reconstruida)]) }}>
      <GraficoSerie rotulo={`Receita por dia nos últimos ${periodo} dias, confirmada e reconstruída empilhadas. Use as setas para ler dia a dia.`} formato={reais}
        rotulos={r.porDia.map(d => ({ longo: dataLonga(d.dia), curto: dataCurta(d.dia) }))}
        barras={[{ id: 'a', nome: 'Confirmado', estilo: 'a', valores: r.porDia.map(d => d.confirmada) }, { id: 'c', nome: 'Reconstruído', estilo: 'c', valores: r.porDia.map(d => d.reconstruida) }]} />
    </QuadroGrafico>
    {totalMeio > 0 && <div className="adm-receita-periodo__composicao">
      <table className="tabela adm-composicao-tabela">
        <caption>Por meio de pagamento</caption>
        <thead><tr><th scope="col">Meio</th><th scope="col" className="numerico">Valor</th><th scope="col" className="numerico">Parte</th></tr></thead>
        <tbody>{([['Pix', r.porMeio.pix], ['Cartão', r.porMeio.cartao]] as const).map(([m, v]) => <tr key={m}><th scope="row">{m}</th><td className="numerico">{reais(v)}</td><td className="numerico">{Math.round((v / totalMeio) * 100)}%</td></tr>)}</tbody>
      </table>
      <table className="tabela adm-composicao-tabela">
        <caption>Por plano</caption>
        <thead><tr><th scope="col">Plano</th><th scope="col" className="numerico">Cobranças</th><th scope="col" className="numerico">Valor</th><th scope="col" className="numerico">Parte</th></tr></thead>
        <tbody>{r.porPlano.map(p => <tr key={p.plano}><th scope="row">{rotuloPlano(p.plano)}</th><td className="numerico">{p.quantidade}</td><td className="numerico">{reais(p.valor)}</td><td className="numerico">{Math.round((p.valor / totalMeio) * 100)}%</td></tr>)}</tbody>
      </table>
    </div>}
  </section>
}
