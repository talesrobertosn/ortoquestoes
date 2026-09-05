/**
 * Símbolo do OrtoQuestões — três direções desenhadas em código.
 *
 * A: ponto do interrogação substituído pela cabeça de um parafuso cortical.
 * B: letra Q cuja cauda é um fio de Kirschner atravessando a circunferência.
 * C: corte transversal de osso longo (cortical e canal medular) como o O.
 *
 * Trocar a marca do site inteiro = trocar a constante abaixo.
 */
export type DirecaoMarca = 'A' | 'B' | 'C'

export const DIRECAO_MARCA: DirecaoMarca = 'B'

interface Props {
  tamanho?: number
  direcao?: DirecaoMarca
  titulo?: string | null
}

export function Simbolo({ tamanho = 28, direcao = DIRECAO_MARCA, titulo = null }: Props) {
  const comuns = {
    width: tamanho,
    height: tamanho,
    viewBox: '0 0 32 32',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    role: titulo ? ('img' as const) : ('presentation' as const),
    'aria-hidden': titulo ? undefined : true,
    focusable: 'false' as const,
  }

  if (direcao === 'A') {
    return (
      <svg {...comuns}>
        {titulo && <title>{titulo}</title>}
        {/* Haste do ponto de interrogação */}
        <path
          d="M9.5 11.2a6.6 6.6 0 1 1 8.4 6.4c-1.4.45-2 1.4-2 2.9v1.1"
          stroke="currentColor"
          strokeWidth="3.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Cabeça de parafuso cortical no lugar do ponto */}
        <circle cx="15.9" cy="26.4" r="3.9" stroke="currentColor" strokeWidth="2.4" />
        <path
          d="M13.6 24.1l4.6 4.6M18.2 24.1l-4.6 4.6"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (direcao === 'C') {
    return (
      <svg {...comuns}>
        {titulo && <title>{titulo}</title>}
        {/* Cortical: contorno externo levemente ovalado, como uma diáfise em corte */}
        <path
          d="M16 2.6c7.1 0 12.8 5.6 12.8 13.4S22.6 29.4 16 29.4 3.2 23.8 3.2 16 8.9 2.6 16 2.6Z"
          stroke="currentColor"
          strokeWidth="3.4"
        />
        {/* Canal medular, deslocado como no osso real */}
        <path
          d="M16.9 9.6c3.7 0 6.3 2.9 6.3 6.6s-2.6 6.6-6.3 6.6-6.4-2.9-6.4-6.6 2.7-6.6 6.4-6.6Z"
          stroke="currentColor"
          strokeWidth="2.2"
        />
      </svg>
    )
  }

  return (
    <svg {...comuns}>
      {titulo && <title>{titulo}</title>}
      {/* Corpo do Q */}
      <circle cx="14" cy="14" r="9.6" stroke="currentColor" strokeWidth="3.3" />
      {/* Cauda: fio de Kirschner com ponta trocarte, atravessando a circunferência */}
      <path
        d="M14.37 16.63 16.63 14.37 24.63 22.37 26.2 26.2 22.37 24.63Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** Marca horizontal: símbolo + assinatura. Uma cor só, herda currentColor. */
export function MarcaHorizontal({
  altura = 26,
  direcao = DIRECAO_MARCA,
}: {
  altura?: number
  direcao?: DirecaoMarca
}) {
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: altura * 0.34 }}
      aria-hidden="true"
    >
      <Simbolo tamanho={altura} direcao={direcao} />
      <span
        style={{
          fontSize: altura * 0.72,
          letterSpacing: '-0.015em',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontWeight: 650 }}>Orto</span>
        <span style={{ fontWeight: 400 }}>Questões</span>
      </span>
    </span>
  )
}

/** Marca empilhada, para espaços estreitos e para a página de impressão. */
export function MarcaEmpilhada({
  altura = 48,
  direcao = DIRECAO_MARCA,
}: {
  altura?: number
  direcao?: DirecaoMarca
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: altura * 0.16,
      }}
      aria-hidden="true"
    >
      <Simbolo tamanho={altura} direcao={direcao} />
      <span style={{ fontSize: altura * 0.34, letterSpacing: '-0.01em', lineHeight: 1 }}>
        <span style={{ fontWeight: 650 }}>Orto</span>
        <span style={{ fontWeight: 400 }}>Questões</span>
      </span>
    </span>
  )
}
