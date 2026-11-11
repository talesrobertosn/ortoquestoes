/**
 * Símbolo do Orto Questões: o ladrilho das alternativas (marca aprovada pelo
 * Tales em 11/11/2026). Três linhas de resposta; a do meio, a certa, é
 * dourada, com o visto dentro da bolinha.
 *
 * - 'selo': o ladrilho. As cores vêm de --marca-* em tokens.css, então o
 *   tema escuro troca o ladrilho sozinho. Mesmo desenho do favicon e do
 *   ícone do aplicativo (public/favicon.svg, scripts/gerar_icones.py).
 *   Abaixo de 24 px usa a versão mini: sem o visto e com traços mais grossos.
 * - 'traco': só as alternativas, na cor do texto (currentColor), para selos
 *   pequenos dentro de botões e etiquetas.
 *
 * Variações temáticas (Natal, por exemplo) devem partir deste desenho.
 */
export type VarianteSimbolo = 'selo' | 'traco'

interface Props {
  tamanho?: number
  variante?: VarianteSimbolo
  titulo?: string | null
}

export const COR_MARCA = '#14655E'
export const COR_DESTAQUE = '#F4CF7C'

/** Uma alternativa no quadro de 100: a bolinha e a linha da resposta. */
export interface Alternativa {
  cx: number
  cy: number
  r: number
  x: number
  y: number
  largura: number
  altura: number
  certa: boolean
}

/** Desenho cheio, para 24 px ou mais. */
export const ALTERNATIVAS: readonly Alternativa[] = [
  { cx: 30, cy: 30, r: 6.5, x: 43, y: 25.5, largura: 34, altura: 9, certa: false },
  { cx: 30, cy: 50, r: 9, x: 43, y: 45, largura: 40, altura: 10, certa: true },
  { cx: 30, cy: 70, r: 6.5, x: 43, y: 65.5, largura: 26, altura: 9, certa: false },
]

/** Versão mini, para tamanhos pequenos: traços grossos e sem o visto. */
export const ALTERNATIVAS_MINI: readonly Alternativa[] = [
  { cx: 28, cy: 27, r: 9, x: 44, y: 20, largura: 36, altura: 14, certa: false },
  { cx: 28, cy: 50, r: 11, x: 44, y: 42, largura: 40, altura: 16, certa: true },
  { cx: 28, cy: 73, r: 9, x: 44, y: 66, largura: 26, altura: 14, certa: false },
]

/** O visto dentro da bolinha certa (desenho cheio). */
export const CAMINHO_VISTO = 'M25.8 50.2l2.9 3 5.6-6'

export function Simbolo({ tamanho = 28, variante = 'selo', titulo = null }: Props) {
  const selo = variante === 'selo'
  const mini = tamanho < 24
  const alternativas = mini ? ALTERNATIVAS_MINI : ALTERNATIVAS
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={titulo ? 'img' : 'presentation'}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      {titulo && <title>{titulo}</title>}
      {selo && (
        <rect
          x="1.5" y="1.5" width="97" height="97" rx="23"
          style={{ fill: `var(--marca-ladrilho, ${COR_MARCA})`, stroke: 'var(--marca-contorno, none)', strokeWidth: 3 }}
        />
      )}
      {alternativas.map((a) => {
        const estilo = a.certa
          ? { fill: selo ? `var(--marca-certa, ${COR_DESTAQUE})` : 'currentColor' }
          : selo
            ? { fill: 'var(--marca-osso, #F6EEDB)', opacity: 'var(--marca-osso-opacidade, .5)' }
            : { fill: 'currentColor', opacity: 0.45 }
        return (
          <g key={a.cy} style={estilo}>
            <circle cx={a.cx} cy={a.cy} r={a.r} />
            <rect x={a.x} y={a.y} width={a.largura} height={a.altura} rx={a.altura / 2} />
          </g>
        )
      })}
      {selo && !mini && (
        <path
          d={CAMINHO_VISTO}
          fill="none"
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: `var(--marca-ladrilho, ${COR_MARCA})` }}
        />
      )}
    </svg>
  )
}

/** Nome escrito por extenso: "Orto" forte e "Questões" leve. */
function Nome({ tamanho }: { tamanho: number }) {
  return (
    <span
      className="marca-horizontal__texto"
      style={{
        fontFamily: 'var(--fonte-marca)',
        fontSize: tamanho,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontWeight: 800 }}>Orto</span>{' '}
      <span style={{ fontWeight: 500 }}>Questões</span>
    </span>
  )
}

/** Marca horizontal: símbolo + nome. `simbolo` deixa o ladrilho maior que a
 * altura do nome (no topo do site, para a marca ficar visível). */
export function MarcaHorizontal({ altura = 26, simbolo }: { altura?: number; simbolo?: number }) {
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: altura * 0.4 }}
      aria-hidden="true"
    >
      <Simbolo tamanho={simbolo ?? altura} />
      <Nome tamanho={altura * 0.74} />
    </span>
  )
}

/** Marca empilhada, para espaços estreitos. */
export function MarcaEmpilhada({ altura = 48 }: { altura?: number }) {
  return (
    <span
      style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: altura * 0.2 }}
      aria-hidden="true"
    >
      <Simbolo tamanho={altura} />
      <Nome tamanho={altura * 0.36} />
    </span>
  )
}
