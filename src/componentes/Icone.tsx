/** Ícones desenhados em traço, 24×24, herdando currentColor. */

export const CAMINHOS: Record<string, string> = {
  certo: 'M4 12.5 9.5 18 20 6.5',
  errado: 'M6 6l12 12M18 6L6 18',
  estrela:
    'M12 3.5l2.6 5.5 5.9.8-4.3 4.2 1 6-5.2-2.8L6.8 20l1-6L3.5 9.8l5.9-.8z',
  mapa: 'M4 5h6v6H4zM14 5h6v6h-6zM4 13h6v6H4zM14 13h6v6h-6z',
  fechar: 'M6 6l12 12M18 6L6 18',
  esquerda: 'M14.5 5.5 8 12l6.5 6.5',
  direita: 'M9.5 5.5 16 12l-6.5 6.5',
  baixo: 'M5.5 9 12 15.5 18.5 9',
  cima: 'M5.5 15 12 8.5 18.5 15',
  busca: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16.2 16.2 21 21',
  alerta: 'M12 4 2.8 20h18.4zM12 10v4.5M12 17.4v.2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.8M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1.5-1.5',
  impressora:
    'M7 9V3.5h10V9M7 18H4.5v-7h15v7H17M7 14.5h10V21H7z',
  lixeira: 'M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5 7.5 21h9l1-14.5M10 10v7M14 10v7',
  sol: 'M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM12 1.8v2.2M12 20v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M1.8 12H4M20 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6',
  lua: 'M20 14.5A8.6 8.6 0 0 1 9.5 4 8.6 8.6 0 1 0 20 14.5z',
  riscar: 'M4 12h16M7 6.5c1.5-1.5 8.5-1.5 10 1.5M17 17.5c-1.5 1.5-8.5 1.5-10-1.5',
  filtro: 'M3.5 5.5h17l-6.5 7.5V20l-4-2v-5z',
  teclado:
    'M3 6.5h18v11H3zM6.5 10h.1M10 10h.1M13.5 10h.1M17 10h.1M6.5 14h11',
  reiniciar: 'M20 12a8 8 0 1 1-2.6-5.9M20 4v4.5h-4.5',
  baixar: 'M12 3.5v11M7.5 10.5 12 15l4.5-4.5M4.5 19.5h15',
  interrogacao: 'M9 9a3 3 0 1 1 4 2.8c-.8.3-1 .9-1 1.7v.8M12 17.6v.2',
  livro: 'M12 6.3C10 4.7 6.6 4.2 3.5 4.5V18c3.1-.3 6.5.2 8.5 1.7 2-1.5 5.4-2 8.5-1.7V4.5c-3.1-.3-6.5.2-8.5 1.8zM12 6.3v13.4',
  calendario: 'M4.5 4.5h15v15h-15zM4.5 9.2h15M8 3v3M16 3v3M8 13h.01M12 13h.01M16 13h.01M8 16.6h.01M12 16.6h.01',
  grafico: 'M4 20V13M9.5 20V8M15 20v-5M20 20V4M3.5 20h17',
  usuario: 'M12 12.3a4.15 4.15 0 1 0 0-8.3 4.15 4.15 0 0 0 0 8.3zM4.5 20a7.5 7.5 0 0 1 15 0',
  raio: 'M13 3 5 14h5.3l-.9 7 7.6-11h-5.3z',
  fogo: 'M12 2.5c.6 2.4-.6 3.8-2 5.3-1.6 1.7-3 3.4-3 6a5 5 0 0 0 10 0c0-1.4-.5-2.4-1.2-3.4.1 1.6-.5 2.6-1.4 3-.5-2-2-2.8-2-4.6 0-1.1.6-1.9 1.2-2.6-.7.2-1.2.6-1.6 1.1-.3-1.7.2-3.3 2-4.8Z',
  olho: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  instagram:
    'M7.8 3.5h8.4a4.3 4.3 0 0 1 4.3 4.3v8.4a4.3 4.3 0 0 1-4.3 4.3H7.8a4.3 4.3 0 0 1-4.3-4.3V7.8a4.3 4.3 0 0 1 4.3-4.3zM12 8.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8zM17.1 6.8h.1',
  'olho-riscado':
    'M4 4l16 16M9.9 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3.3 4M6.3 8.1A17 17 0 0 0 2.5 12S6 18.5 12 18.5c1 0 1.9-.2 2.7-.5M9.9 9.9a3 3 0 0 0 4.2 4.2',
}

export type NomeIcone = keyof typeof CAMINHOS

export function Icone({
  nome,
  tamanho = 20,
  espesso = 1.8,
}: {
  nome: NomeIcone
  tamanho?: number
  espesso?: number
}) {
  const d = CAMINHOS[nome]
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={espesso}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ flex: '0 0 auto' }}
    >
      <path d={d} />
    </svg>
  )
}

/** Estrela preenchida, para o estado "favoritada". */
export function EstrelaCheia({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      style={{ flex: '0 0 auto' }}
    >
      <path d={CAMINHOS.estrela} />
    </svg>
  )
}
