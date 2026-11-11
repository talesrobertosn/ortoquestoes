/**
 * Símbolo do Orto Questões: o ladrilho das alternativas (marca aprovada pelo
 * Tales em 11/11/2026). Três linhas de resposta; a do meio, a certa, é
 * dourada, com o visto dentro da bolinha.
 *
 * - 'selo': o ladrilho. As cores vêm de --marca-* em tokens.css, então o
 *   tema escuro troca o ladrilho sozinho. Mesmo desenho do favicon e do
 *   ícone do aplicativo (public/favicon.svg, scripts/gerar_icones.py).
 *   O desenho muda com o tamanho para ficar nítido: cheio a partir de 48 px,
 *   médio de 24 a 47 px (traços grossos e visto grosso, alinhados à grade de
 *   pixels de 32 px, usado no topo) e mini abaixo de 24 px (sem o visto).
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

/** Versão média, de 24 a 47 px: traços grossos alinhados à grade de 32 px. */
export const ALTERNATIVAS_MEDIA: readonly Alternativa[] = [
  { cx: 28.1, cy: 25, r: 9.4, x: 43.75, y: 18.75, largura: 37.5, altura: 12.5, certa: false },
  { cx: 28.1, cy: 50, r: 12.5, x: 43.75, y: 42.2, largura: 40.6, altura: 15.6, certa: true },
  { cx: 28.1, cy: 75, r: 9.4, x: 43.75, y: 68.75, largura: 25, altura: 12.5, certa: false },
]

/** Versão mini, para tamanhos pequenos: traços grossos e sem o visto. */
export const ALTERNATIVAS_MINI: readonly Alternativa[] = [
  { cx: 28, cy: 27, r: 9, x: 44, y: 20, largura: 36, altura: 14, certa: false },
  { cx: 28, cy: 50, r: 11, x: 44, y: 42, largura: 40, altura: 16, certa: true },
  { cx: 28, cy: 73, r: 9, x: 44, y: 66, largura: 26, altura: 14, certa: false },
]

/** O visto dentro da bolinha certa (desenho cheio). */
export const CAMINHO_VISTO = 'M25.8 50.2l2.9 3 5.6-6'
const CAMINHO_VISTO_MEDIO = 'M22.4 50.6l4 4 7.3-8'

export function Simbolo({ tamanho = 28, variante = 'selo', titulo = null }: Props) {
  const selo = variante === 'selo'
  const mini = tamanho < 24
  const medio = !mini && tamanho < 48
  const alternativas = mini ? ALTERNATIVAS_MINI : medio ? ALTERNATIVAS_MEDIA : ALTERNATIVAS
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
          x="1.5" y="1.5" width="97" height="97" rx={mini || medio ? 24 : 23}
          style={{ fill: `var(--marca-ladrilho, ${COR_MARCA})`, stroke: 'var(--marca-contorno, none)', strokeWidth: 3 }}
        />
      )}
      {alternativas.map((a) => {
        const estilo = a.certa
          ? { fill: selo ? `var(--marca-certa, ${COR_DESTAQUE})` : 'currentColor' }
          : selo
            ? { fill: 'var(--marca-osso, #F6EEDB)', opacity: medio || mini ? 'calc(var(--marca-osso-opacidade, .5) * 1.24)' : 'var(--marca-osso-opacidade, .5)' }
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
          d={medio ? CAMINHO_VISTO_MEDIO : CAMINHO_VISTO}
          fill="none"
          strokeWidth={medio ? 4.6 : 2.8}
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
