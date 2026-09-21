function formatarLinha(linha: string) {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((parte, j) =>
    parte.startsWith('**') && parte.endsWith('**') ? <strong key={j}>{parte.slice(2, -2)}</strong> : parte,
  )
}

/**
 * Agrupa linhas consecutivas que começam com "- " em uma lista, mesmo quando
 * vêm coladas a uma frase de introdução no mesmo parágrafo (sem linha em
 * branco antes) — é assim que normalmente se escreve "veja os três casos:"
 * seguido direto dos itens.
 */
function agruparLinhas(linhas: string[]) {
  const grupos: { lista: boolean; linhas: string[] }[] = []
  for (const linha of linhas) {
    const eLista = linha.startsWith('- ')
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.lista === eLista) ultimo.linhas.push(linha)
    else grupos.push({ lista: eLista, linhas: [linha] })
  }
  return grupos
}

/** Texto seguro: parágrafos, negrito e listas, sem interpretar HTML. */
export function TextoEditorial({ texto }: { texto: string }) {
  const blocos = texto.split(/\n\s*\n/).filter((b) => b.trim())
  return (
    <div className="texto-editorial">
      {blocos.map((bloco, i) => {
        const linhas = bloco.split('\n').map((l) => l.trim()).filter(Boolean)
        return agruparLinhas(linhas).map((grupo, j) =>
          grupo.lista ? (
            <ul key={`${i}-${j}`}>
              {grupo.linhas.map((l, k) => <li key={k}>{formatarLinha(l.slice(2))}</li>)}
            </ul>
          ) : (
            grupo.linhas.map((l, k) => <p key={`${i}-${j}-${k}`}>{formatarLinha(l)}</p>)
          ),
        )
      })}
    </div>
  )
}
export function Referencias({ itens }: { itens?: string[] }) {
  return (
    <details className="referencias">
      <summary>{itens?.length ? `Referências · ${itens.length}` : 'Sobre este comentário'}</summary>
      <p className="referencias__nota">
        Este comentário foi produzido com apoio de inteligência artificial. Quando houver revisão
        médica, ela será indicada explicitamente.
      </p>
      {itens?.length ? <ul>{itens.map((r, i) => <li key={i}>{r}</li>)}</ul> : null}
    </details>
  )
}
