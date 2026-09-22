import { href } from '../util/rotas'

/** Negrito (**texto**) e destaque (==texto==) dentro de uma linha. */
function formatarLinha(linha: string) {
  return linha.split(/(\*\*[^*]+\*\*|==[^=]+==)/g).map((parte, j) => {
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) return <strong key={j}>{parte.slice(2, -2)}</strong>
    if (parte.startsWith('==') && parte.endsWith('==') && parte.length > 4) return <mark key={j} className="te-destaque">{parte.slice(2, -2)}</mark>
    return parte
  })
}

type TipoLinha = 'lista' | 'numerada' | 'nota' | 'titulo' | 'texto'
function tipoDaLinha(linha: string): TipoLinha {
  if (linha.startsWith('- ')) return 'lista'
  if (/^\d+\.\s/.test(linha)) return 'numerada'
  if (linha.startsWith('> ')) return 'nota'
  if (linha.startsWith('### ')) return 'titulo'
  return 'texto'
}

/**
 * Agrupa linhas consecutivas do mesmo tipo: itens com "- " viram lista,
 * "1. " lista numerada, "> " um quadro de destaque ("Na prova") e "### " um
 * subtítulo. Funciona mesmo quando a lista vem colada à frase de introdução
 * no mesmo parágrafo, que é como normalmente se escreve.
 */
function agruparLinhas(linhas: string[]) {
  const grupos: { tipo: TipoLinha; linhas: string[] }[] = []
  for (const linha of linhas) {
    const tipo = tipoDaLinha(linha)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.tipo === tipo && tipo !== 'titulo' && tipo !== 'texto') ultimo.linhas.push(linha)
    else grupos.push({ tipo, linhas: [linha] })
  }
  return grupos
}

/** Texto seguro: parágrafos, negrito, destaque, subtítulos, listas e notas, sem interpretar HTML. */
export function TextoEditorial({ texto }: { texto: string }) {
  const blocos = texto.split(/\n\s*\n/).filter((b) => b.trim())
  return (
    <div className="texto-editorial">
      {blocos.map((bloco, i) => {
        const linhas = bloco.split('\n').map((l) => l.trim()).filter(Boolean)
        return agruparLinhas(linhas).map((grupo, j) => {
          const chave = `${i}-${j}`
          if (grupo.tipo === 'lista') return <ul key={chave}>{grupo.linhas.map((l, k) => <li key={k}>{formatarLinha(l.slice(2))}</li>)}</ul>
          if (grupo.tipo === 'numerada') return <ol key={chave}>{grupo.linhas.map((l, k) => <li key={k}>{formatarLinha(l.replace(/^\d+\.\s/, ''))}</li>)}</ol>
          if (grupo.tipo === 'nota') return <aside key={chave} className="te-nota">{grupo.linhas.map((l, k) => <p key={k}>{formatarLinha(l.slice(2))}</p>)}</aside>
          if (grupo.tipo === 'titulo') return <h4 key={chave} className="te-titulo">{formatarLinha(grupo.linhas[0].slice(4))}</h4>
          return <p key={chave}>{formatarLinha(grupo.linhas[0])}</p>
        })
      })}
    </div>
  )
}
export function Referencias({ itens, notaIA }: { itens?: string[]; notaIA?: boolean }) {
  if (!notaIA && !itens?.length) return null
  return (
    <details className="referencias">
      <summary>{itens?.length ? `Referências · ${itens.length}` : 'Sobre este comentário'}</summary>
      {notaIA && (
        <p className="referencias__nota">
          Comentário baseado na bibliografia de referência da ortopedia. A redação pode contar com
          apoio de inteligência artificial; quando houver revisão médica individual, ela será
          indicada. <a href={href('/sobre')}>Como os comentários são feitos</a>
        </p>
      )}
      {itens?.length ? <ul>{itens.map((r, i) => <li key={i}>{r}</li>)}</ul> : null}
    </details>
  )
}
