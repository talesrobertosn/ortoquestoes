/**
 * Selo discreto de novidade (pedido do Tales, 25/10/2026: o fogo no menu ficou feio, "deveria ser mais
 * elegante"). Uma pílula dourada fina com um brilho que passa devagar; com "reduzir movimento", parada.
 */
export function SeloNovo({ texto = 'Novo' }: { texto?: string }) {
  return <span className="selo-novo">{texto}</span>
}
