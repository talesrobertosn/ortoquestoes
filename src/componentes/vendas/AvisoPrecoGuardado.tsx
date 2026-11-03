import { Sprite } from '../../biblioteca/salao/Sprite'
import type { Grade, Paleta } from '../../biblioteca/salao/sprites'
import { DIAS_PARA_RENOVAR, real, type Plano } from '../../dados/planos'
import type { PrecoGuardado } from '../../conta/precoAntigo'

/** Cadeado dourado em pixel: o preço da pessoa está trancado, não sobe. */
export const CADEADO: Grade = [
  '...kkkkk...',
  '..kMMMMMk..',
  '.kMk...kMk.',
  '.kMk...kMk.',
  '.kMk...kMk.',
  'kkkkkkkkkkk',
  'kaaaaaaaaak',
  'kaAAAAAAAak',
  'kaAAAkAAAak',
  'kaAAkkkAAak',
  'kaAAAkAAAak',
  'kaAAAAAAAak',
  'kaaaaaaaaak',
  'kkkkkkkkkkk',
]
export const PALETA_CADEADO: Paleta = { k: '#1b1208', M: '#9aa3ad', a: '#f0c46a', A: '#c8962f' }

const diaMes = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
const juntar = (itens: string[]) => itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}` : itens[0] ?? ''

/**
 * Aviso para quem já assinava antes do reajuste (Tales, 03/11/2026), no lugar do bilhete de
 * abertura e acima dos planos da renovação: os preços subiram, mas o plano que a pessoa paga
 * continua pelo valor de antes enquanto ela renovar. Com o plano já encerrado, mostra até
 * quando ainda dá para voltar pelo mesmo preço.
 */
export function AvisoPrecoGuardado({ guardados, planos, agora = Date.now() }: {
  guardados: readonly PrecoGuardado[]
  /** Os planos com o preço desta pessoa (planosDaPessoa). */
  planos: readonly Plano[]
  agora?: number
}) {
  const itens = guardados.flatMap((g) => {
    const plano = planos.find((p) => p.id === g.plano)
    return plano ? [{ ...g, plano, encerrado: g.ate - DIAS_PARA_RENOVAR * 864e5 <= agora }] : []
  })
  if (!itens.length) return null
  const valores = juntar(itens.map((i) => `o ${i.plano.nome.toLowerCase()} por ${real(i.plano.total)} (${real(i.plano.total / i.plano.meses)} por mês)`))
  const encerrados = itens.filter((i) => i.encerrado)
  const prazo = encerrados.length ? Math.min(...encerrados.map((i) => i.ate)) : null
  return (
    <aside className="vd-abertura vd-abertura--guardado" aria-labelledby="vd-guardado-titulo">
      <span className="vd-abertura__cadeado"><Sprite grade={CADEADO} paleta={PALETA_CADEADO} px={3} /></span>
      <div className="vd-abertura__texto">
        <p className="vd-abertura__selo">Seu preço está guardado</p>
        <h2 id="vd-guardado-titulo">Os preços subiram, o seu não</h2>
        {prazo === null
          ? <p>Como você está com a gente desde antes do reajuste, mantivemos o seu valor: {valores}. Enquanto você continuar renovando, no Pix ou no cartão, ele <strong>nunca muda</strong>: é o seu preço para sempre. Se o plano acabar, você ainda tem {DIAS_PARA_RENOVAR} dias para voltar pelo mesmo valor.</p>
          : <p>Como você estava com a gente desde antes do reajuste, guardamos o seu valor: {valores}. Renove até <strong>{diaMes(prazo)}</strong> e ele fica com você para sempre, enquanto continuar renovando. Depois dessa data, vale o preço atual dos planos. Aproveite!</p>}
      </div>
    </aside>
  )
}
