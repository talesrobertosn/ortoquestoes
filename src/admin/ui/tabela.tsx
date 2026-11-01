import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Icone } from './Icone'
import { inteiro } from './formato'

export interface Coluna<T> {
  id: string
  titulo: string
  /** Conteúdo da célula. */
  celula: (linha: T) => ReactNode
  /** Valor para ordenar (sem ele, a coluna não ordena). */
  ordem?: (linha: T) => number | string | null
  numero?: boolean
  /** Some no celular (a informação aparece em outra coluna ou na ficha). */
  soLargo?: boolean
  /** Rótulo da célula no celular (sem ele, a célula entra sem rótulo, como a principal). */
  rotuloCelular?: string
  largura?: number | string
}

/**
 * Tabela de dados do painel 3.0: cabeçalho fixo, ordenação acessível (aria-sort), paginação, linha
 * clicável (abre o detalhe), linha selecionada e, no celular, cada linha vira um bloco empilhado
 * (sem rolagem de lado na página). A página volta para 1 quando o conjunto muda.
 */
export function Tabela<T>({ linhas, colunas, chave, aoAbrir, selecionada, porPagina = 25, ordemInicial, rotulo, vazio, compacta = false, rodape }: {
  linhas: T[]; colunas: Array<Coluna<T>>; chave: (l: T) => string; aoAbrir?: (l: T) => void; selecionada?: string | null
  porPagina?: number; ordemInicial?: { coluna: string; sentido: 'asc' | 'desc' }; rotulo: string; vazio?: ReactNode; compacta?: boolean; rodape?: ReactNode
}) {
  const [ordem, definirOrdem] = useState(ordemInicial ?? null)
  const [pagina, definirPagina] = useState(0)
  const ordenadas = useMemo(() => {
    if (!ordem) return linhas
    const col = colunas.find(c => c.id === ordem.coluna)
    if (!col?.ordem) return linhas
    const f = col.ordem
    return [...linhas].sort((a, b) => {
      const x = f(a), y = f(b)
      if (x === y) return 0
      if (x === null || x === undefined) return 1
      if (y === null || y === undefined) return -1
      const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')
      return ordem.sentido === 'asc' ? r : -r
    })
  }, [linhas, colunas, ordem])
  useEffect(() => { definirPagina(0) }, [linhas, ordem])
  const total = ordenadas.length
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const visiveis = ordenadas.slice(pagina * porPagina, pagina * porPagina + porPagina)

  if (!total) return <>{vazio}</>
  return <>
    <div className="a3-tabela-caixa">
      <table className={`a3-tabela a3-tabela--adapta${compacta ? ' a3-tabela--compacta' : ''}`} aria-label={rotulo}>
        <thead><tr>{colunas.map(c => {
          const ativa = ordem?.coluna === c.id
          const sort = ativa ? (ordem!.sentido === 'asc' ? 'ascending' : 'descending') : 'none'
          return <th key={c.id} scope="col" className={(c.numero ? 'num ' : '') + (c.soLargo ? 'so-largo' : '')} aria-sort={c.ordem ? sort : undefined} style={{ width: c.largura }}>
            {c.ordem ? <button type="button" onClick={() => definirOrdem(ativa ? { coluna: c.id, sentido: ordem!.sentido === 'asc' ? 'desc' : 'asc' } : { coluna: c.id, sentido: c.numero ? 'desc' : 'asc' })}>
              {c.titulo}<Icone nome={ativa ? (ordem!.sentido === 'asc' ? 'cima' : 'baixo') : 'ordenar'} tamanho={13} />
            </button> : c.titulo}
          </th>
        })}</tr></thead>
        <tbody>{visiveis.map(l => {
          const k = chave(l)
          return <tr key={k} className={aoAbrir ? 'clicavel' : undefined} aria-selected={selecionada === k ? true : undefined}
            onClick={aoAbrir ? (e) => { if ((e.target as HTMLElement).closest('a,button,input,select,label')) return; aoAbrir(l) } : undefined}>
            {colunas.map((c, i) => <td key={c.id} className={(c.numero ? 'num ' : '') + (c.soLargo ? 'so-largo' : '')} data-rotulo={c.rotuloCelular}>
              {i === 0 && aoAbrir ? <button type="button" className="a3-tabela__abrir" onClick={() => aoAbrir(l)}>{c.celula(l)}</button> : c.celula(l)}
            </td>)}
          </tr>
        })}</tbody>
      </table>
    </div>
    {(paginas > 1 || rodape) && <div className="a3-paginacao">
      <span>{rodape ?? <>{inteiro(pagina * porPagina + 1)}–{inteiro(Math.min(total, (pagina + 1) * porPagina))} de {inteiro(total)}</>}</span>
      {paginas > 1 && <div>
        <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" disabled={pagina === 0} onClick={() => definirPagina(p => p - 1)}><Icone nome="esquerda" tamanho={14} /> Anterior</button>
        <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" disabled={pagina >= paginas - 1} onClick={() => definirPagina(p => p + 1)}>Próxima <Icone nome="direita" tamanho={14} /></button>
      </div>}
    </div>}
  </>
}
