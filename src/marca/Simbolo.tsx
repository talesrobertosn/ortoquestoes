/**
 * Símbolo do Orto Questões: três alternativas de uma questão (bolinha e
 * linha), com a do meio destacada como a resposta certa.
 *
 * - 'selo': ladrilho verde com as alternativas em branco e a certa em dourado.
 *   É o mesmo desenho do favicon e do ícone do aplicativo.
 * - 'traco': só as alternativas, na cor do texto (currentColor), para selos
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

/** As três linhas do símbolo, no quadro de 32 por 32. A do meio é a certa. */
export const LINHAS_SIMBOLO = [
  { cx: 9, cy: 10, r: 2, x: 13, y: 8.4, largura: 11, certa: false },
  { cx: 9, cy: 16, r: 2.6, x: 13, y: 14.4, largura: 12, certa: true },
  { cx: 9, cy: 22, r: 2, x: 13, y: 20.4, largura: 8, certa: false },
] as const

export function Simbolo({ tamanho = 28, variante = 'selo', titulo = null }: Props) {
  const selo = variante === 'selo'
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={titulo ? 'img' : 'presentation'}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      {titulo && <title>{titulo}</title>}
      {selo && <rect width="32" height="32" rx="8" fill={COR_MARCA} />}
      {LINHAS_SIMBOLO.map((l) => {
        const cor = selo ? (l.certa ? COR_DESTAQUE : '#FFFFFF') : 'currentColor'
        const opacidade = l.certa ? 1 : selo ? 0.55 : 0.5
        return (
          <g key={l.cy} fill={cor} opacity={opacidade}>
            <circle cx={l.cx} cy={l.cy} r={l.r} />
            <rect x={l.x} y={l.y} width={l.largura} height="3.2" rx="1.6" />
          </g>
        )
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
