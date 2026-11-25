/** Onde a pessoa estava antes de abrir os Shorts (o X volta para lá), em sessionStorage. Módulo mínimo: o menu importa. */
export const CHAVE_VOLTA = 'sh:volta'

export function guardarVolta() {
  try { sessionStorage.setItem(CHAVE_VOLTA, location.hash.replace(/^#/, '') || '/') } catch { /* sem sessionStorage */ }
}
