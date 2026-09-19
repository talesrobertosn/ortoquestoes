/** Texto seguro: apenas parágrafos e negrito, sem interpretar HTML. */
export function TextoEditorial({ texto }: { texto: string }) {
  return <div className="texto-editorial">{texto.split(/\n\s*\n|\n/).filter(p => p.trim()).map((p, i) => (
    <p key={i}>{p.split(/(\*\*[^*]+\*\*)/g).map((parte, j) => parte.startsWith('**') && parte.endsWith('**') ? <strong key={j}>{parte.slice(2, -2)}</strong> : parte)}</p>
  ))}</div>
}
export function Referencias({ itens }: { itens?: string[] }) {
  if (!itens?.length) return null
  return <details className="referencias"><summary>Referências · {itens.length}</summary><ul>{itens.map((r, i) => <li key={i}>{r}</li>)}</ul></details>
}
