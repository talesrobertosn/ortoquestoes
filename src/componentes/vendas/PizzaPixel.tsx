/* Usada no cartão do mensal (página de planos) e no aviso do limite grátis. */
/* Fatia de pizza em pixel (9×9), desenhada em SVG para ficar nítida e leve: k contorno, b borda, y queijo, r calabresa. */
const PIZZA = ['kkkkkkkkk', 'kbbbbbbbk', 'kyyryyyyk', '.kyyyyrk.', '.kyryyyk.', '..kyyyk..', '..kyryk..', '...kyk...', '....k....']
const CORES_PIZZA: Record<string, string> = { k: '#1b1208', b: '#c9832e', y: '#f4cf7c', r: '#b3423a' }
export function PizzaPixel({ className = 'vd-plano__pizza' }: { className?: string }) {
  const rastro: Record<string, string> = {}
  PIZZA.forEach((linha, y) => [...linha].forEach((c, x) => { if (c !== '.') rastro[c] = (rastro[c] ?? '') + `M${x} ${y}h1v1h-1z` }))
  return (
    <svg className={className} viewBox="0 0 9 9" width={18} height={18} aria-hidden="true" shapeRendering="crispEdges">
      {Object.entries(rastro).map(([c, d]) => <path key={c} d={d} fill={CORES_PIZZA[c]} />)}
    </svg>
  )
}
