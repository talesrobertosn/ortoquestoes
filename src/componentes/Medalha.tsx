import { useId } from 'react'
import type { Conquista, NivelMedalha } from '../estado/conquistas'

const METAIS: Record<NivelMedalha, [string, string, string]> = {
  bronze: ['#f3c9a3', '#c07a45', '#8a4f25'],
  prata: ['#f4f7f8', '#b9c4c8', '#7d8a8f'],
  ouro: ['#fff1c2', '#e8b34f', '#a8761a'],
  esmeralda: ['#bff0e2', '#2f9c86', '#0f4f49'],
}

/**
 * Medalha desenhada em SVG: disco metálico com fitas, anel interno e o marco
 * no centro. Bloqueada, aparece em cinza e translúcida.
 */
export function Medalha({ conquista, tamanho = 48, bloqueada = false, titulo }: { conquista: Conquista; tamanho?: number; bloqueada?: boolean; titulo?: string }) {
  const id = useId().replace(/:/g, '')
  const [claro, meio, escuro] = METAIS[conquista.nivel]
  const texto = conquista.curto
  const fonte = texto.length >= 4 ? 10.5 : texto.length === 3 ? 12.5 : 15
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
      <text x="24" y="22" dy="0.36em" textAnchor="middle" fontSize={fonte} fontWeight="800" fill={conquista.nivel === 'esmeralda' ? '#ffffff' : escuro} fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">{texto}</text>
    </svg>
  )
}
