/** Losango do Pix, desenhado em traço como os outros ícones. */
export function IconePix({ tamanho = 16 }: { tamanho?: number }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z" /><path d="M7.6 9.2 10.4 12l-2.8 2.8M16.4 9.2 13.6 12l2.8 2.8" /></svg>
}

export function IconeCartao({ tamanho = 16 }: { tamanho?: number }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></svg>
}
