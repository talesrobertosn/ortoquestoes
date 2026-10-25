import { Fragment, useEffect, useState } from 'react'
import { carregarCapitulo, pedacos } from '../../biblioteca/conteudo'
import { ehTexto, type Bloco, type Capitulo } from '../../biblioteca/tipos'
import { href } from '../../util/rotas'
import { Icone } from '../../componentes/Icone'

function Texto({ t }: { t: string }) {
  return <>{pedacos(t).map((p, i) => (p.negrito ? <strong key={i}>{p.texto}</strong> : <Fragment key={i}>{p.texto}</Fragment>))}</>
}

function Blocos({ blocos, capitulo }: { blocos: Bloco[]; capitulo: Capitulo }) {
  const grupos: Array<Bloco | Bloco[]> = []
  for (const b of blocos) {
    const ultimo = grupos[grupos.length - 1]
    if (b.tipo === 'li' && Array.isArray(ultimo)) ultimo.push(b)
    else grupos.push(b.tipo === 'li' ? [b] : b)
  }
  return <>{grupos.map((g) => {
    if (Array.isArray(g)) return <ul key={g[0].id}>{g.filter(ehTexto).map((b) => <li key={b.id}><Texto t={b.t} /></li>)}</ul>
    const b = g
    if (b.tipo === 'p') return <p key={b.id}><Texto t={b.t} /></p>
    if (b.tipo === 'h3') return <h4 key={b.id}><Texto t={b.t} /></h4>
    if (b.tipo === 'prova') return <p key={b.id} className="at-naprova"><span>Na prova</span><Texto t={b.t} /></p>
    if (b.tipo === 'tabela') return (
      <div key={b.id} className="at-tabela"><table><caption>{b.titulo}</caption>
        <thead><tr>{b.cab.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{b.linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}><Texto t={c} /></td>)}</tr>)}</tbody></table></div>)
    if (b.tipo === 'figura' && b.imagem && b.licenca === 'autorizada') return (
      <figure key={b.id} className="at-figura"><img src={b.imagem} alt={b.legenda} loading="lazy" /><figcaption><b>Figura {b.numero}.</b> {b.legenda} <cite>{capitulo.livro}</cite></figcaption></figure>)
    return null // blocos de questões: a ficha já tem o botão "Responder"
  })}</>
}

/** Seções de um resumo da Biblioteca (as classificações já escritas e conferidas), com o link para o capítulo. */
export function SecaoBiblioteca({ capitulo: id, secoes }: { capitulo: string; secoes: string[] }) {
  const [cap, definirCap] = useState<Capitulo | null | undefined>(undefined)
  useEffect(() => { let vivo = true; carregarCapitulo(id).then((c) => vivo && definirCap(c)).catch(() => vivo && definirCap(null)); return () => { vivo = false } }, [id])
  if (cap === undefined) return <div className="at-carregando" aria-busy="true"><span /><span /><span /></div>
  if (!cap) return null
  const lista = cap.secoes.filter((s) => secoes.includes(s.id))
  return (
    <section className="at-biblio">
      {lista.map((s) => (
        <details key={s.id} className="at-biblio__secao" open={lista.length === 1 || s.id === lista[0].id}>
          <summary>{s.titulo}</summary>
          <Blocos blocos={s.blocos} capitulo={cap} />
        </details>
      ))}
      <a className="at-biblio__ler" href={href(`/resumos/${cap.id}${lista[0]?.blocos[0] ? `?bloco=${encodeURIComponent(lista[0].blocos[0].id)}` : ''}`)}>
        <Icone nome="livro" tamanho={17} /><span><strong>{cap.titulo}</strong><small>{cap.livro}, {cap.edicao}</small></span><Icone nome="direita" tamanho={16} />
      </a>
    </section>
  )
}
