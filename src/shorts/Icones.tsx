/* Ícones do player dos Shorts (desenhados no protótipo aprovado em 25/11/2026). */
const T = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const CORACAO = 'M12 20.3s-7.6-4.6-9.2-9.4C1.6 7.2 3.9 4 7.3 4c2 0 3.6 1.1 4.7 2.7C13.1 5.1 14.7 4 16.7 4c3.4 0 5.7 3.2 4.5 6.9-1.6 4.8-9.2 9.4-9.2 9.4z'
const SALVAR = 'M6.5 3.5h11a1 1 0 011 1v16l-6.5-4.3-6.5 4.3v-16a1 1 0 011-1z'

const DESENHOS = {
  x: <path d="M6 6l12 12M18 6L6 18" {...T} strokeWidth={2.4} />,
  coracao: <path d={CORACAO} {...T} />,
  coracaoCheio: <path d={CORACAO} fill="currentColor" />,
  balao: <><path d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v8a2.5 2.5 0 01-2.5 2.5H10l-4.6 3.8c-.4.3-.9 0-.9-.4V16A2.5 2.5 0 014 13.5z" {...T} /><path d="M8 8.5h8M8 12h5" {...T} /></>,
  enviar: <path d="M13.5 4.5l7 6.8-7 6.7v-3.9C8.6 14 5.6 15.6 3.5 19.5 4.2 13.7 7.4 9.6 13.5 8.6z" {...T} />,
  salvar: <path d={SALVAR} {...T} />,
  salvarCheio: <path d={SALVAR} fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />,
  bandeira: <path d="M5.5 21V4m0 0h11.2l-2 4.2 2 4.3H5.5" {...T} />,
  ajuste: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" {...T} /><circle cx="15" cy="7" r="2.2" {...T} /><circle cx="9" cy="17" r="2.2" {...T} /></>,
  play: <path d="M8 5.2v13.6c0 .8.9 1.3 1.6.8l10.3-6.8c.6-.4.6-1.2 0-1.6L9.6 4.4C8.9 3.9 8 4.4 8 5.2z" fill="currentColor" />,
  cima: <path d="M6 14.5l6-6 6 6" {...T} strokeWidth={2.4} />,
  baixo: <path d="M6 9.5l6 6 6-6" {...T} strokeWidth={2.4} />,
  esq: <path d="M14.5 6l-6 6 6 6" {...T} strokeWidth={2.4} />,
  dir: <path d="M9.5 6l6 6-6 6" {...T} strokeWidth={2.4} />,
  visto: <path d="M5 12.5l4.2 4.2L19 7" {...T} strokeWidth={3} />,
  cadeado: <><rect x="5" y="10.5" width="14" height="10" rx="2.4" {...T} /><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" {...T} /></>,
  lupa: <><circle cx="10.5" cy="10.5" r="6" {...T} /><path d="M15 15l5 5M8 10.5h5M10.5 8v5" {...T} /></>,
  chama: <path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.5 2.6-5.3 3.6-8.8 2.3 1.3 3 3.4 3 5.1 1-.6 1.8-1.8 2-3.3 2.4 2 4.4 4.3 4.4 7.1 0 3.5-2.7 6.1-6.5 6.1z" fill="currentColor" />,
  livro: <path d="M4 5.5C6.5 4.3 9.3 4.3 12 6c2.7-1.7 5.5-1.7 8-.5v13c-2.5-1.2-5.3-1.2-8 .5-2.7-1.7-5.5-1.7-8-.5zM12 6v13" {...T} />,
  revisao: <><path d="M4.5 12a7.5 7.5 0 0113-5.1M19.5 12a7.5 7.5 0 01-13 5.1" {...T} /><path d="M17.5 3.5v3.6h-3.6M6.5 20.5v-3.6h3.6" {...T} /></>,
  pular: <path d="M6 6l7 6-7 6M15 6v12" {...T} />,
} as const

export type NomeIconeSh = keyof typeof DESENHOS

export function IconeSh({ nome, className }: { nome: NomeIconeSh; className?: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>{DESENHOS[nome]}</svg>
}

/** O símbolo dos Shorts: o ladrilho em pé com o play dourado. */
export function SimboloShorts({ tamanho = 24, className }: { tamanho?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" className={className}>
      <rect x="5" y="2.5" width="14" height="19" rx="3.2" fill="var(--verdete)" />
      <path d="M10.2 8.6v6.8l5.6-3.4z" fill="var(--ouro)" />
    </svg>
  )
}
