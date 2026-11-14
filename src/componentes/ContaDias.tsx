import { contarDias, dias, duracao } from '../conta/dias'
import '../estilos/componentes/ContaDias.css'

const dataCurta = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const dataLonga = (ms: number) => new Date(ms).toLocaleDateString('pt-BR')

/**
 * A conta dos dias à vista: "você já tem" + "você compra" = "acesso total", cada parte em dias e em meses,
 * com as datas. Sem período vigente, mostra só o que a pessoa compra e até quando vale.
 */
export function ContaDias({ fimAtual, meses, agora = Date.now(), compacta = false, rotuloCompra = 'Você compra' }: {
  fimAtual: number | null
  meses: number
  agora?: number
  compacta?: boolean
  rotuloCompra?: string
}) {
  const c = contarDias(agora, fimAtual, meses)
  const temAlgo = c.tem > 0
  const descricao = `${temAlgo ? `Você já tem ${dias(c.tem)}, ` : ''}compra ${dias(c.compra)} e fica com ${dias(c.total)} de acesso, até ${dataLonga(c.fimNovo)}.`
  return (
    <div className={'cdias' + (compacta ? ' cdias--compacta' : '') + (temAlgo ? '' : ' cdias--so-compra')} role="group" aria-label={descricao}>
      {temAlgo && <>
        <div className="cdias__parte" aria-hidden="true">
          <small>Você já tem</small>
          <b>{dias(c.tem)}</b>
          <span>até {dataCurta(c.inicioNovo)}</span>
        </div>
        <span className="cdias__op" aria-hidden="true">+</span>
      </>}
      <div className="cdias__parte cdias__parte--compra" aria-hidden="true">
        <small>{rotuloCompra}</small>
        <b>{dias(c.compra)}</b>
        <span>{meses === 12 ? '1 ano' : `${meses} ${meses === 1 ? 'mês' : 'meses'}`}{temAlgo ? `, de ${dataCurta(c.inicioNovo)}` : ''}</span>
      </div>
      {temAlgo && <>
        <span className="cdias__op" aria-hidden="true">=</span>
        <div className="cdias__parte cdias__parte--total" aria-hidden="true">
          <small>Acesso total</small>
          <b>{dias(c.total)}</b>
          <span>{duracao(agora, c.fimNovo)} · até {dataLonga(c.fimNovo)}</span>
        </div>
      </>}
      {!temAlgo && <div className="cdias__parte cdias__parte--total" aria-hidden="true">
        <small>Acesso até</small>
        <b>{dataLonga(c.fimNovo)}</b>
        <span>a partir de hoje</span>
      </div>}
    </div>
  )
}
