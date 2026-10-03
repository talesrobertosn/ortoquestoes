/**
 * Símbolo do Orto Questões: uma coluna de alternativas. Quatro vértebras em
 * perfil (corpo, pedículo e processo espinhoso), com a terceira em dourado
 * como a resposta certa.
 *
 * - 'selo': ladrilho com as vértebras. As cores vêm de --marca-* em
 *   tokens.css, então o tema escuro troca o ladrilho sozinho. É o mesmo
 *   desenho do favicon e do ícone do aplicativo.
 * - 'traco': só as vértebras, na cor do texto (currentColor), para selos
 *   pequenos dentro de botões e etiquetas.
 */
export type VarianteSimbolo = 'selo' | 'traco'

interface Props {
  tamanho?: number
  variante?: VarianteSimbolo
  titulo?: string | null
}

export const COR_MARCA = '#14655E'
export const COR_DESTAQUE = '#F4CF7C'

/** Uma vértebra em perfil, frente à esquerda, no quadro de 64 por 64:
 * corpo e pedículo emendado no processo espinhoso. */
export const CAMINHO_VERTEBRA =
  'M3.2 0H18.8A3.2 3.2 0 0 1 22 3.2V5.4A3.2 3.2 0 0 1 18.8 8.6H3.2A3.2 3.2 0 0 1 0 5.4V3.2A3.2 3.2 0 0 1 3.2 0Z' +
  'M21 2.6H24.6L34.2 5.2Q35.6 5.8 35 7.2L34.4 8.4Q33.8 9.6 32.4 9.1L24.6 6.2H21Z'

/** Onde cada vértebra fica no quadro de 64. A terceira é a certa. */
export const VERTEBRAS = [
  { x: 13, y: 9.5, certa: false },
  { x: 11, y: 21.2, certa: false },
  { x: 11, y: 32.9, certa: true },
  { x: 13, y: 44.6, certa: false },
] as const

export function Simbolo({ tamanho = 28, variante = 'selo', titulo = null }: Props) {
  const selo = variante === 'selo'
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={titulo ? 'img' : 'presentation'}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      {titulo && <title>{titulo}</title>}
      {selo && (
        <rect
          x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25"
          style={{ fill: `var(--marca-ladrilho, ${COR_MARCA})`, stroke: 'var(--marca-contorno, none)', strokeWidth: 1.5 }}
        />
      )}
      {VERTEBRAS.map((v) => {
        const estilo = v.certa
          ? { fill: selo ? `var(--marca-certa, ${COR_DESTAQUE})` : 'currentColor' }
          : selo
            ? { fill: 'var(--marca-osso, #FFFFFF)', opacity: 'var(--marca-osso-opacidade, .55)' }
            : { fill: 'currentColor', opacity: 0.5 }
        return <path key={v.y} d={CAMINHO_VERTEBRA} transform={`translate(${v.x} ${v.y})`} style={estilo} />
      })}
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

/** Marca horizontal: símbolo + nome. */
export function MarcaHorizontal({ altura = 26 }: { altura?: number }) {
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: altura * 0.36 }}
      aria-hidden="true"
    >
      <Simbolo tamanho={altura} />
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
