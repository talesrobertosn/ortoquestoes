import { useId } from 'react'
import type { Conquista, NivelMedalha } from '../estado/conquistas'
import { EMBLEMAS_COM_IMAGEM } from '../dados/imagensEmblemas'
import { recurso } from '../config'

const METAIS: Record<NivelMedalha, [string, string, string]> = {
  bronze: ['#f3c9a3', '#c07a45', '#8a4f25'],
  prata: ['#f4f7f8', '#b9c4c8', '#7d8a8f'],
  ouro: ['#fff1c2', '#e8b34f', '#a8761a'],
  esmeralda: ['#bff0e2', '#2f9c86', '#0f4f49'],
  lendario: ['#f1dcff', '#9b5de5', '#4b1d7a'],
}

/**
 * Medalha de uma conquista. Quando a conquista tem arte própria (pixel art em
 * public/emblemas), mostra a imagem; senão, o disco metálico desenhado em SVG
 * com o marco no centro. Bloqueada, aparece em cinza e translúcida.
 *
 * A arte tem 128 px. Reduzida com "pixelated" para tamanhos que não dividem 128 (24 px no
 * ranking: 5,3 vezes menor), o navegador pula pixels e o emblema fica serrilhado (relato do
 * Tales, 21/10/2026). Abaixo do tamanho original na tela, a redução é suave; acima, continua
 * nítida, em pixel.
 */
export const classeArte = (tamanho: number) => {
  const densidade = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  return tamanho * densidade < 128 ? ' medalha--suave' : ''
}

export function Medalha({ conquista, tamanho = 48, bloqueada = false, titulo }: { conquista: Conquista; tamanho?: number; bloqueada?: boolean; titulo?: string }) {
  const id = useId().replace(/:/g, '')
  if (EMBLEMAS_COM_IMAGEM.has(conquista.id)) {
    return <img className={'medalha medalha--arte' + classeArte(tamanho) + (bloqueada ? ' medalha--bloqueada' : '')} src={recurso(`emblemas/${conquista.id}.png`)}
      width={tamanho} height={tamanho} alt={titulo ?? conquista.rotulo} title={titulo} loading="lazy" decoding="async" draggable={false} />
  }
  const [claro, meio, escuro] = METAIS[conquista.nivel]
  const texto = conquista.curto
  const fonte = texto.length >= 4 ? 10.5 : texto.length === 3 ? 12.5 : 15
  const escuroTexto = conquista.nivel === 'esmeralda' || conquista.nivel === 'lendario'
  return (
    <svg className={'medalha' + (bloqueada ? ' medalha--bloqueada' : '')} width={tamanho} height={tamanho * 56 / 48} viewBox="0 0 48 56" role="img" aria-label={titulo ?? conquista.rotulo}>
      {titulo && <title>{titulo}</title>}
      <defs>
        <linearGradient id={`m-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={claro} />
          <stop offset="0.55" stopColor={meio} />
          <stop offset="1" stopColor={escuro} />
        </linearGradient>
        <linearGradient id={`b-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M15 32 10 53l6.5-3.5L21 55l4-20z" fill={escuro} />
      <path d="M33 32l5 21-6.5-3.5L27 55l-4-20z" fill={meio} />
      <circle cx="24" cy="22" r="20" fill={`url(#m-${id})`} />
      <circle cx="24" cy="22" r="20" fill={`url(#b-${id})`} />
      <circle cx="24" cy="22" r="15" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.3" />
      <circle cx="24" cy="22" r="19.3" fill="none" stroke={escuro} strokeOpacity="0.35" strokeWidth="1.2" />
      <text x="24" y="22" dy="0.36em" textAnchor="middle" fontSize={fonte} fontWeight="800" fill={escuroTexto ? '#ffffff' : escuro} fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">{texto}</text>
    </svg>
  )
}
