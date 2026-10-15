import { href } from '../util/rotas'
import '../estilos/paginas/TextoEditorial.css'

/**
 * Negrito (**texto**), itálico (*texto*) e destaque (==texto==) dentro de uma
 * linha. O itálico (nomes científicos, termos em inglês: *Mycobacterium
 * tuberculosis*, *lag screw*) aparecia com os asteriscos em 171 comentários.
 * Sem lookbehind na regex: Safari antigo não entende e o módulo inteiro quebraria.
 */
const MARCAS = /(\*\*\*[^*]+\*\*\*|\*\*(?:[^*]|\*[^*]+\*)+\*\*|==[^=]+==|\*[^*\s](?:[^*]*[^*\s])?\*)/g
function formatarLinha(linha: string) {
  const partes = linha.split(MARCAS)
  return partes.map((parte, j) => {
    // ***negrito e itálico*** (nome de germe em destaque, por exemplo).
    if (parte.startsWith('***') && parte.endsWith('***') && parte.length > 6) return <strong key={j}><em>{parte.slice(3, -3)}</em></strong>
    // O negrito pode ter itálico dentro: **Correta: D (*Kingella kingae*).**
    if (parte.startsWith('**') && parte.endsWith('**') && parte.length > 4) return <strong key={j}>{formatarLinha(parte.slice(2, -2))}</strong>
    if (parte.startsWith('==') && parte.endsWith('==') && parte.length > 4) return <mark key={j} className="te-destaque">{parte.slice(2, -2)}</mark>
    // "2*3*4" não é itálico: o asterisco de abertura precisa vir depois de espaço ou pontuação.
    if (parte.length > 2 && parte.startsWith('*') && parte.endsWith('*') && !/[\p{L}\p{N}]$/u.test(partes[j - 1] ?? '')) return <em key={j}>{parte.slice(1, -1)}</em>
    return parte
  })
}

/** Só a formatação em linha (**negrito** e ==destaque==), sem parágrafos: enunciados e alternativas. */
export function TextoEmLinha({ texto }: { texto: string }) {
  return <>{formatarLinha(texto)}</>
}

type TipoLinha = 'lista' | 'numerada' | 'nota' | 'titulo' | 'tabela' | 'texto'
function tipoDaLinha(linha: string): TipoLinha {
  if (linha.startsWith('- ')) return 'lista'
  if (/^\d+\.\s/.test(linha)) return 'numerada'
  if (linha.startsWith('> ')) return 'nota'
  if (linha.startsWith('### ') || linha.startsWith('## ')) return 'titulo'
  if (linha.startsWith('|') && linha.endsWith('|')) return 'tabela'
  return 'texto'
}

/**
 * Agrupa linhas consecutivas do mesmo tipo: itens com "- " viram lista,
 * "1. " lista numerada, "> " um quadro de destaque ("Na prova") e "### " um
 * subtítulo e linhas "| a | b |" uma tabela (a primeira é o cabeçalho). Funciona mesmo quando a lista vem colada à frase de introdução
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

/** Separa as células de "| a | b |"; "\\|" é uma barra dentro da célula, não uma divisória. */
export function celulasDaLinha(linha: string): string[] {
  const SUBSTITUTO = '\u0000'
  return linha.slice(1, -1).replace(/\\\|/g, SUBSTITUTO).split('|').map((c) => c.trim().replace(/\u0000/g, '|'))
}

/**
 * Tabela simples em markdown; a linha separadora "|---|" é ignorada. Com três
 * colunas ou mais, no celular cada linha vira um cartão ("Coluna: valor"), em
 * vez de uma tabela cortada que só rola de lado sem aviso.
 */
function Tabela({ linhas }: { linhas: string[] }) {
  const celulas = linhas
    .filter((l) => !/^\|[\s:|-]+\|$/.test(l))
    .map(celulasDaLinha)
  const [cabecalho, ...corpo] = celulas
  if (!cabecalho) return null
  const cartoes = cabecalho.length >= 3
  return (
    <div className={'te-tabela' + (cartoes ? ' te-tabela--cartoes' : '')}>
      <table>
        <thead><tr>{cabecalho.map((c, k) => <th key={k}>{formatarLinha(c)}</th>)}</tr></thead>
        <tbody>{corpo.map((linha, k) => <tr key={k}>{linha.map((c, m) => <td key={m} data-rotulo={cartoes && m > 0 ? cabecalho[m]?.replace(/\*\*|==/g, '') : undefined}>{formatarLinha(c)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

/** Texto seguro: parágrafos, negrito, itálico, destaque, subtítulos, listas, tabelas e notas, sem interpretar HTML. */
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
          if (grupo.tipo === 'tabela') return <Tabela key={chave} linhas={grupo.linhas} />
          if (grupo.tipo === 'titulo') return <h4 key={chave} className="te-titulo">{formatarLinha(grupo.linhas[0].replace(/^#{2,3} /, ''))}</h4>
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
          Comentário baseado na bibliografia de referência da ortopedia. Confira sempre na fonte
          indicada; quando houver revisão médica individual, ela será indicada.{' '}
          <a href={href('/sobre')}>Como os comentários são feitos</a>
        </p>
      )}
      {itens?.length ? <ul>{itens.map((r, i) => <li key={i}>{r}</li>)}</ul> : null}
    </details>
  )
}
