import { useId, useState, type KeyboardEvent } from 'react'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import { apelidoLivro, numeroCapitulo, type EstadoLeitura, type FiltrosEstante } from './estante'
import type { ResumoCapitulo } from './tipos'

interface Livro { chave: string; rotulo: string; capitulos: ResumoCapitulo[] }

/**
 * Painel "Encontre o resumo" no topo da estante (pedido do Tales, 30/10/2026: "deixa em cima normal uma lista para
 * filtrar o livro em um menu suspenso, que leva ao tema também; um caminho para facilitar achar o livro").
 * Caminho clicável (Biblioteca › livro › tema), menus Livro e Tema, busca com sugestões e os filtros de área e progresso.
 * Escolher um tema leva até a lombada na estante e abre a ficha (aoIrPara); escolher um livro rola até a estante dele.
 */
export function EncontreResumo({ livros, filtros, filtrados, ativos, areas, progressos, tema, mudar, limpar, aoIrPara, aoIrLivro }: {
  livros: Livro[]
  filtros: FiltrosEstante
  filtrados: ResumoCapitulo[]
  ativos: boolean
  areas: Array<{ slug: string; nome: string }>
  progressos: Array<{ v: EstadoLeitura | null; nome: string }>
  tema: ResumoCapitulo | null
  mudar: (m: Partial<FiltrosEstante>) => void
  limpar: () => void
  aoIrPara: (c: ResumoCapitulo) => void
  aoIrLivro: (chave: string) => void
}) {
  const ids = useId()
  const [sugerir, definirSugerir] = useState(false)
  const [marcada, definirMarcada] = useState(0)
  const livro = livros.find((l) => l.chave === filtros.livro) ?? null
  const total = livros.reduce((n, l) => n + l.capitulos.length, 0)
  const sugestoes = filtros.q.trim() ? filtrados.slice(0, 6) : []
  const nomeLivro = (l: Livro) => `${apelidoLivro(l.capitulos[0].livro)} · ${l.rotulo.split(' · ')[1]}`

  const escolherLivro = (chave: string) => {
    mudar({ livro: chave || null })
    if (chave) aoIrLivro(chave)
  }
  const escolherTema = (id: string) => {
    const c = livros.flatMap((l) => l.capitulos).find((x) => x.id === id)
    if (c) aoIrPara(c)
  }
  const teclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!sugestoes.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); definirSugerir(true); definirMarcada((i) => (i + 1) % sugestoes.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); definirMarcada((i) => (i - 1 + sugestoes.length) % sugestoes.length) }
    else if (e.key === 'Enter') { e.preventDefault(); definirSugerir(false); aoIrPara(sugestoes[Math.min(marcada, sugestoes.length - 1)]) }
    else if (e.key === 'Escape') definirSugerir(false)
  }

  return (
    <section className="rs-achar" id="rs-estante" aria-labelledby={`${ids}-t`}>
      <div className="rs-achar__topo">
        <h2 id={`${ids}-t`}><Icone nome="busca" tamanho={18} /> Encontre o resumo</h2>
        <nav className="rs-caminho" aria-label="Caminho até o resumo">
          <button type="button" onClick={limpar} aria-current={!livro && !tema ? 'page' : undefined}>Biblioteca</button>
          {(livro || tema) && <><Icone nome="direita" tamanho={14} /><button type="button" onClick={() => aoIrLivro((livro ?? livros.find((l) => l.capitulos.includes(tema!)))!.chave)} aria-current={!tema ? 'page' : undefined}>
            {nomeLivro(livro ?? livros.find((l) => l.capitulos.includes(tema!))!)}
          </button></>}
          {tema && <><Icone nome="direita" tamanho={14} /><a href={href(`/resumos/${tema.id}`)} aria-current="page">{tema.titulo}</a></>}
        </nav>
      </div>

      <div className="rs-achar__linha">
        <label className="rs-achar__campo">
          <span>1. Livro</span>
          <select value={filtros.livro ?? ''} onChange={(e) => escolherLivro(e.target.value)}>
            <option value="">Todos os livros ({total})</option>
            {livros.map((l) => <option key={l.chave} value={l.chave}>{nomeLivro(l)} ({l.capitulos.length})</option>)}
          </select>
        </label>
        <label className="rs-achar__campo">
          <span>2. Tema</span>
          <select value={tema?.id ?? ''} onChange={(e) => escolherTema(e.target.value)}>
            <option value="">{livro ? `Escolha o tema do ${apelidoLivro(livro.capitulos[0].livro)}` : 'Escolha o tema'}</option>
            {livro
              ? livro.capitulos.map((c) => <option key={c.id} value={c.id}>Cap. {numeroCapitulo(c)} · {c.titulo}</option>)
              : livros.map((l) => <optgroup key={l.chave} label={nomeLivro(l)}>{l.capitulos.map((c) => <option key={c.id} value={c.id}>Cap. {numeroCapitulo(c)} · {c.titulo}</option>)}</optgroup>)}
          </select>
        </label>
        <div className="rs-achar__busca" data-guia="busca">
          <label className="rs-achar__campo">
            <span>ou busque</span>
            <span className="rs-achar__entrada"><Icone nome="busca" tamanho={16} />
              <input type="search" value={filtros.q} placeholder="Tema, classificação ou autor (ex.: Schatzker)"
                role="combobox" aria-expanded={sugerir && sugestoes.length > 0} aria-controls={`${ids}-s`} aria-autocomplete="list"
                aria-activedescendant={sugerir && sugestoes.length ? `${ids}-s-${Math.min(marcada, sugestoes.length - 1)}` : undefined}
                onChange={(e) => { mudar({ q: e.target.value }); definirSugerir(true); definirMarcada(0) }}
                onFocus={() => definirSugerir(true)} onBlur={() => window.setTimeout(() => definirSugerir(false), 150)} onKeyDown={teclar} />
            </span>
          </label>
          {sugerir && sugestoes.length > 0 && <ul className="rs-sugestoes" id={`${ids}-s`} role="listbox" aria-label="Resumos encontrados">
            {sugestoes.map((c, i) => <li key={c.id} id={`${ids}-s-${i}`} role="option" aria-selected={i === marcada}
              onMouseDown={(e) => { e.preventDefault(); definirSugerir(false); aoIrPara(c) }} onMouseEnter={() => definirMarcada(i)}>
              <strong>{c.titulo}</strong><small>{apelidoLivro(c.livro)} · Cap. {numeroCapitulo(c)} · {c.questoes.length} questões de prova</small>
            </li>)}
          </ul>}
        </div>
      </div>

      <div className="rs-achar__filtros" data-guia="filtros">
        <label><span>Área</span><select value={filtros.area ?? ''} onChange={(e) => mudar({ area: e.target.value || null })}><option value="">Todas as áreas</option>{areas.map((a) => <option key={a.slug} value={a.slug}>{a.nome}</option>)}</select></label>
        <div className="rs-busca__progresso" role="group" aria-label="Progresso">{progressos.map((p) => <button key={p.nome} type="button" aria-pressed={filtros.progresso === p.v} onClick={() => mudar({ progresso: p.v })}>{p.nome}</button>)}</div>
        {ativos && <p className="rs-achar__resultado" role="status"><b className="numerico">{filtrados.length}</b> {filtrados.length === 1 ? 'resumo' : 'resumos'} na estante <button type="button" onClick={limpar}><Icone nome="fechar" tamanho={14} /> Limpar</button></p>}
      </div>
    </section>
  )
}
