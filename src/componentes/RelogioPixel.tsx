import { useEffect, useState } from 'react'
import '../estilos/componentes/RelogioPixel.css'

/** A janela do gratuito dura 24 h a partir da primeira questão (autorizar_resposta). */
export const JANELA_GRATIS_MS = 24 * 60 * 60 * 1000

// Ampulheta em grade de 15 x 18 pixels: [primeira, última] coluna de vidro de
// cada linha do bulbo de cima (linhas 2 a 7) e do de baixo (10 a 15), com o
// gargalo nas linhas 8 e 9.
const BULBO_CIMA: Array<[number, number]> = [[2, 12], [2, 12], [3, 11], [4, 10], [5, 9], [6, 8]]
const BULBO_BAIXO: Array<[number, number]> = [[6, 8], [5, 9], [4, 10], [3, 11], [2, 12], [2, 12]]
const CELULAS_BULBO = BULBO_CIMA.reduce((s, [a, b]) => s + b - a + 1, 0)

/** Células de um bulbo, de baixo para cima quando pedido, cada linha do centro para as bordas. */
function celulas(bulbo: Array<[number, number]>, primeiraLinha: number, deBaixoParaCima: boolean): Array<[number, number]> {
  const linhas = bulbo.map(([a, b], i) => ({ y: primeiraLinha + i, a, b }))
  if (deBaixoParaCima) linhas.reverse()
  const lista: Array<[number, number]> = []
  for (const { y, a, b } of linhas) {
    const xs = Array.from({ length: b - a + 1 }, (_, i) => a + i).sort((p, q) => Math.abs(p - 7) - Math.abs(q - 7))
    for (const x of xs) lista.push([x, y])
  }
  return lista
}
const AREIA_CIMA = celulas(BULBO_CIMA, 2, true)
const AREIA_BAIXO = celulas(BULBO_BAIXO, 10, true)

function Ampulheta({ fracao, escala }: { fracao: number; escala: number }) {
  const cima = Math.round(Math.min(1, Math.max(0, fracao)) * CELULAS_BULBO)
  const vidro: Array<[number, number]> = []
  ;[...BULBO_CIMA.map(([a, b], i) => [a, b, 2 + i]), [7, 7, 8], [7, 7, 9], ...BULBO_BAIXO.map(([a, b], i) => [a, b, 10 + i])]
    .forEach(([a, b, y]) => { vidro.push([a - 1, y], [b + 1, y]) })
  const px = (x: number, y: number, classe: string, chave: string) => <rect key={chave} className={classe} x={x} y={y} width={1} height={1} />
  return (
    <svg className="relogio-pixel__ampulheta" viewBox="0 0 15 18" width={15 * escala} height={18 * escala} shapeRendering="crispEdges" aria-hidden="true">
      <rect className="rp-madeira" x={0} y={0} width={15} height={2} />
      <rect className="rp-madeira" x={0} y={16} width={15} height={2} />
      <rect className="rp-madeira-sombra" x={0} y={1} width={15} height={1} />
      <rect className="rp-madeira-sombra" x={0} y={17} width={15} height={1} />
      <rect className="rp-madeira" x={0} y={2} width={1} height={14} />
      <rect className="rp-madeira" x={14} y={2} width={1} height={14} />
      {vidro.map(([x, y], i) => px(x, y, 'rp-vidro', `v${i}`))}
      {AREIA_CIMA.slice(0, cima).map(([x, y], i) => px(x, y, 'rp-areia', `c${i}`))}
      {AREIA_BAIXO.slice(0, CELULAS_BULBO - cima).map(([x, y], i) => px(x, y, 'rp-areia rp-areia--baixo', `b${i}`))}
      {cima > 0 && <g className="rp-fio">
        {px(7, 8, 'rp-areia', 'f1')}{px(7, 9, 'rp-areia', 'f2')}
        <rect className="rp-areia rp-grao" x={7} y={10} width={1} height={1} />
      </g>}
      <rect className="rp-brilho" x={3} y={3} width={1} height={2} />
    </svg>
  )
}

function partes(segundos: number) {
  const dois = (n: number) => String(n).padStart(2, '0')
  return [dois(Math.floor(segundos / 3600)), dois(Math.floor((segundos % 3600) / 60)), dois(segundos % 60)]
}

/**
 * Contagem regressiva até as questões grátis voltarem: uma ampulheta em pixel
 * art que esvazia ao longo das 24 h da janela e o tempo em dígitos de jogo.
 * `janelaMs`, `rodape` e `minutos` servem a outras contagens (o ranking, que atualiza de 10 em 10 minutos).
 */
export function RelogioPixel({ liberaEm, rotulo = 'Grátis de novo em', compacto = false, janelaMs = JANELA_GRATIS_MS, rodape, minutos = false, legivel = false }: {
  liberaEm: string; rotulo?: string; compacto?: boolean; janelaMs?: number; rodape?: string; minutos?: boolean
  /** Números e textos em fonte comum (a pixel confundia os dígitos; pedido do Tales, 21/10/2026). */
  legivel?: boolean
}) {
  const fim = Date.parse(liberaEm)
  const [agora, definirAgora] = useState(Date.now())
  useEffect(() => {
    const intervalo = window.setInterval(() => definirAgora(Date.now()), 1000)
    return () => window.clearInterval(intervalo)
  }, [])
  if (!Number.isFinite(fim)) return null
  const faltam = Math.max(0, Math.ceil((fim - agora) / 1000))
  const [h, m, s] = partes(faltam)
  const quando = new Date(fim).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }).replace('.', '')
  const falado = minutos ? `${Number(m)} minutos e ${Number(s)} segundos` : `${Number(h)} horas e ${Number(m)} minutos`
  return (
    <div className={'relogio-pixel' + (compacto ? ' relogio-pixel--compacto' : '') + (legivel ? ' relogio-pixel--legivel' : '')} role="timer" aria-label={`${rotulo} ${falado}`}>
      <Ampulheta fracao={(fim - agora) / janelaMs} escala={compacto ? 3 : 4} />
      <div className="relogio-pixel__texto" aria-hidden="true">
        <span className="relogio-pixel__rotulo">{rotulo}</span>
        <span className="relogio-pixel__digitos">{minutos ? <>{m}<i>:</i>{s}</> : <>{h}<i>:</i>{m}<i>:</i>{s}</>}</span>
        <span className="relogio-pixel__quando">{rodape ?? (faltam > 0 ? `Volta ${quando}` : 'Já voltou!')}</span>
      </div>
    </div>
  )
}
