import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { recurso } from '../config'
import { carregarIndice } from '../dados/acervo'
import { consultaTreinoAssunto } from '../dados/resumao'
import { href, navegar } from '../util/rotas'
import { Icone, type NomeIcone } from './Icone'

/**
 * Busca do menu (pedido do Tales, 16/10/2026: "o site agora tem muita coisa"). Uma caixa só acha:
 * as páginas do site (pelo nome, pelo que fazem e por sinônimos), o trecho exato de um resumo da Biblioteca
 * (uma classificação, um epônimo; abre o resumo direto nele), os assuntos para treinar questões, os
 * flashcards do assunto e, sempre, a busca da palavra no texto das questões.
 * Os índices pesados (resumos, acervo, flashcards) só são baixados quando a pessoa começa a digitar.
 */

export interface PaginaBusca { destino: string; rotulo: string; texto: string; icone: NomeIcone; chaves?: string }

interface Resultado { chave: string; tipo: 'pagina' | 'resumo' | 'assunto' | 'flashcards' | 'questoes'; titulo: ReactNode; detalhe?: ReactNode; destino: string; icone: NomeIcone; peso: number }
interface IndiceResumos { capitulos: Array<{ id: string; t: string; e: string }>; itens: Array<[number, string, string, string]> }
interface IndiceFlash { areas: Record<string, { nome: string; assuntos?: Record<string, number> }> }

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const termosDe = (q: string) => normalizar(q).split(/[^a-z0-9]+/).filter((t) => t.length >= 2)
const contemTodos = (alvo: string, termos: string[]) => termos.every((t) => alvo.includes(t))

let resumosP: Promise<IndiceResumos | null> | null = null
const carregarResumos = () => (resumosP ??= fetch(recurso('biblioteca/busca.json')).then((r) => (r.ok ? r.json() as Promise<IndiceResumos> : null)).catch(() => { resumosP = null; return null }))
let flashP: Promise<IndiceFlash | null> | null = null
const carregarFlash = () => (flashP ??= fetch(recurso('flashcards/indice.json')).then((r) => (r.ok ? r.json() as Promise<IndiceFlash> : null)).catch(() => { flashP = null; return null }))

/** Trecho em volta do primeiro termo, com os termos em negrito. */
function trecho(texto: string, termos: string[]): ReactNode {
  const alvo = normalizar(texto)
  const i = Math.max(0, ...termos.map((t) => alvo.indexOf(t)).filter((x) => x >= 0).slice(0, 1))
  const ini = Math.max(0, i - 60), fim = Math.min(texto.length, i + 110)
  const pedaco = (ini > 0 ? '…' : '') + texto.slice(ini, fim) + (fim < texto.length ? '…' : '')
  const norm = normalizar(pedaco)
  const marcas: Array<[number, number]> = []
  for (const t of termos) { let k = norm.indexOf(t); while (k >= 0) { marcas.push([k, k + t.length]); k = norm.indexOf(t, k + t.length) } }
  if (!marcas.length || norm.length !== pedaco.length) return pedaco
  marcas.sort((a, b) => a[0] - b[0])
  const partes: ReactNode[] = []; let pos = 0
  for (const [a, b] of marcas) { if (b <= pos) continue; const de = Math.max(a, pos); if (de > pos) partes.push(pedaco.slice(pos, de)); partes.push(<b key={de}>{pedaco.slice(de, b)}</b>); pos = b }
  partes.push(pedaco.slice(pos))
  return partes
}

export function BuscaMenu({ paginas, aoIr }: { paginas: PaginaBusca[]; aoIr: () => void }) {
  const [q, definirQ] = useState('')
  const [resumos, definirResumos] = useState<IndiceResumos | null>(null)
  const [subtemas, definirSubtemas] = useState<string[]>([])
  const [flash, definirFlash] = useState<IndiceFlash | null>(null)
  const [ativo, definirAtivo] = useState(0)
  const carregou = useRef(false)
  const lista = useRef<HTMLUListElement>(null)

  const carregar = () => {
    if (carregou.current) return
    carregou.current = true
    carregarResumos().then(definirResumos)
    carregarIndice().then((i) => definirSubtemas(i.subtemas)).catch(() => undefined)
    carregarFlash().then(definirFlash)
  }

  const resultados = useMemo<Resultado[]>(() => {
    const termos = termosDe(q)
    if (!termos.length) return []
    const saida: Resultado[] = []
    for (const p of paginas) {
      const nome = normalizar(p.rotulo), tudo = normalizar(`${p.rotulo} ${p.texto} ${p.chaves ?? ''}`)
      if (contemTodos(tudo, termos)) saida.push({ chave: 'p' + p.destino + p.rotulo, tipo: 'pagina', titulo: p.rotulo, detalhe: p.texto, destino: p.destino, icone: p.icone, peso: contemTodos(nome, termos) ? 100 : 60 })
    }
    if (resumos) {
      const porCap = new Map<number, number>()
      for (const [ci, bloco, secao, texto] of resumos.itens) {
        const cap = resumos.capitulos[ci]
        const alvo = normalizar(`${texto} ${secao} ${cap.t}`)
        if (!contemTodos(alvo, termos)) continue
        const n = porCap.get(ci) ?? 0
        if (n >= 3) continue
        porCap.set(ci, n + 1)
        const titulo = bloco.startsWith('h-') && contemTodos(normalizar(secao), termos)
        saida.push({ chave: 'r' + cap.id + bloco, tipo: 'resumo', titulo: <>{cap.t} <small>› {secao}</small></>, detalhe: titulo ? 'Seção do resumo' : trecho(texto, termos), destino: `/resumos/${cap.id}?bloco=${encodeURIComponent(bloco)}`, icone: 'livro', peso: (titulo ? 90 : contemTodos(normalizar(texto), termos) ? 70 : 40) - n * 5 })
      }
      for (const cap of resumos.capitulos) if (contemTodos(normalizar(cap.t), termos)) saida.push({ chave: 'rc' + cap.id, tipo: 'resumo', titulo: <>Resumo: {cap.t}</>, detalhe: 'Abrir o resumo do capítulo', destino: `/resumos/${cap.id}`, icone: 'livro', peso: 95 })
    }
    for (const s of subtemas) if (contemTodos(normalizar(s), termos)) saida.push({ chave: 's' + s, tipo: 'assunto', titulo: <>Treinar: {s}</>, detalhe: 'Questões ainda não respondidas deste assunto', destino: consultaTreinoAssunto(s), icone: 'alvo', peso: 75 })
    if (flash) for (const [area, a] of Object.entries(flash.areas)) for (const assunto of Object.keys(a.assuntos ?? {})) {
      if (contemTodos(normalizar(assunto), termos)) saida.push({ chave: 'f' + area + assunto, tipo: 'flashcards', titulo: <>Flashcards: {assunto}</>, detalhe: `${a.nome} · ${a.assuntos![assunto]} flashcards`, destino: `/flashcards/biblioteca?${new URLSearchParams({ categoria: 'area:' + area, area, assunto, n: '20' })}`, icone: 'raio', peso: 65 })
    }
    const ordenados = saida.sort((a, b) => b.peso - a.peso).slice(0, 14)
    ordenados.push({ chave: 'q', tipo: 'questoes', titulo: <>Buscar “{q.trim()}” nas questões</>, detalhe: 'Enunciados e alternativas de todo o acervo', destino: `/treinar?busca=${encodeURIComponent(q.trim())}`, icone: 'busca', peso: 0 })
    return ordenados
  }, [q, paginas, resumos, subtemas, flash])

  useEffect(() => { definirAtivo(0) }, [q])
  useEffect(() => { lista.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [ativo])

  const ir = (r: Resultado) => { aoIr(); navegar(r.destino) }
  const teclas = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!resultados.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); definirAtivo((a) => Math.min(resultados.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); definirAtivo((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); ir(resultados[ativo]) }
  }
  const carregando = !!q.trim() && !resumos && carregou.current
  const ROTULO: Record<Resultado['tipo'], string> = { pagina: 'Página', resumo: 'Resumo', assunto: 'Questões', flashcards: 'Flashcards', questoes: 'Busca' }

  return (
    <div className="mn-busca" role="search">
      <label className="mn-busca__campo">
        <Icone nome="busca" tamanho={18} />
        <span className="so-leitor">Buscar no site</span>
        <input type="search" value={q} onFocus={carregar} onChange={(e) => { carregar(); definirQ(e.target.value) }} onKeyDown={teclas}
          placeholder="Buscar: Garden, tríade terrível, revisão, flashcards…" enterKeyHint="search" autoComplete="off"
          role="combobox" aria-expanded={resultados.length > 0} aria-controls="mn-busca-lista" aria-activedescendant={resultados.length ? `mn-busca-${ativo}` : undefined} />
        {q && <button type="button" className="mn-busca__limpar" onClick={() => definirQ('')} aria-label="Limpar a busca"><Icone nome="fechar" tamanho={15} /></button>}
      </label>
      {q.trim() && <ul className="mn-busca__lista" id="mn-busca-lista" role="listbox" ref={lista} aria-label="Resultados da busca">
        {resultados.map((r, i) => (
          <li key={r.chave} id={`mn-busca-${i}`} role="option" aria-selected={i === ativo}>
            <a className={`mn-busca__item mn-busca__item--${r.tipo}`} href={href(r.destino)} onClick={(e) => { e.preventDefault(); ir(r) }} onMouseEnter={() => definirAtivo(i)}>
              <span className="mn-busca__icone" aria-hidden="true"><Icone nome={r.icone} tamanho={17} /></span>
              <span className="mn-busca__texto"><strong>{r.titulo}</strong>{r.detalhe && <small>{r.detalhe}</small>}</span>
              <span className="mn-busca__tipo">{ROTULO[r.tipo]}</span>
            </a>
          </li>
        ))}
        {carregando && <li className="mn-busca__carregando" role="presentation">Procurando também nos resumos…</li>}
      </ul>}
    </div>
  )
}
