import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Icone } from '../../componentes/Icone'
import { navegar } from '../../util/rotas'
import { sugerir, trechosAchados } from '../busca'
import { estadoLeitura } from '../estante'
import type { Leitura, ResumoCapitulo } from '../tipos'
import { ESTADO_NOME, pctLido, referencia } from './comum'

/** O texto com os trechos achados em <mark> (sem acento e palavra por palavra, como a busca). */
export function Realce({ texto, q }: { texto: string; q: string }) {
  const faixas = q.trim() ? trechosAchados(texto, q) : []
  if (!faixas.length) return <>{texto}</>
  const partes: ReactNode[] = []
  let i = 0
  faixas.forEach(([a, b], k) => { if (a > i) partes.push(texto.slice(i, a)); partes.push(<mark key={k}>{texto.slice(a, b)}</mark>); i = b })
  if (i < texto.length) partes.push(texto.slice(i))
  return <>{partes}</>
}

type Opcao =
  | { tipo: 'resumo'; c: ResumoCapitulo; secao?: { id: string; titulo: string } }
  | { tipo: 'parte'; c: ResumoCapitulo; secao: { id: string; titulo: string } }
  | { tipo: 'livro'; chave: string; rotulo: string; total: number }
  | { tipo: 'area'; slug: string; nome: string; total: number }
  | { tipo: 'todos'; total: number }

/**
 * A busca principal da Biblioteca 3.0 (31/10/2026): um campo só, "Qual assunto você quer estudar?", com sugestões em
 * grupos (assuntos, partes dos resumos, livros e áreas) que abrem direto o que foi achado. Caixa de combinação acessível
 * (padrão combobox da WAI-ARIA): setas, Enter, Esc; Ctrl+K ou / em qualquer lugar da página leva até ela.
 */
export function BuscaPrincipal({ capitulos, leituras, valor, aoMudar, aoAbrirResumo, aoFiltrarLivro, aoFiltrarArea, aoVerResultados, aoPrimeiraBusca }: {
  capitulos: ResumoCapitulo[]
  leituras: Record<string, Leitura | undefined>
  valor: string
  aoMudar: (q: string) => void
  aoAbrirResumo: (c: ResumoCapitulo) => void
  aoFiltrarLivro: (chave: string) => void
  aoFiltrarArea: (slug: string) => void
  aoVerResultados: () => void
  aoPrimeiraBusca?: () => void
}) {
  const id = useId()
  const campo = useRef<HTMLInputElement>(null)
  const [aberta, definirAberta] = useState(false)
  const [ativa, definirAtiva] = useState(-1)
  const q = valor.trim()
  const s = useMemo(() => (q ? sugerir(capitulos, q) : null), [capitulos, q])
  const opcoes: Opcao[] = useMemo(() => {
    if (!s) return []
    const lista: Opcao[] = [
      ...s.resumos.map((a): Opcao => ({ tipo: 'resumo', c: a.c, secao: a.secao })),
      ...s.partes.filter((p) => !s.resumos.slice(0, 2).some((a) => a.c.id === p.c.id && a.secao?.id === p.secao.id)).map((p): Opcao => ({ tipo: 'parte', ...p })),
      ...s.livros.map((l): Opcao => ({ tipo: 'livro', ...l })),
      ...s.areas.map((a): Opcao => ({ tipo: 'area', ...a })),
    ]
    if (s.total > s.resumos.length) lista.push({ tipo: 'todos', total: s.total })
    return lista
  }, [s])
  useEffect(() => { definirAtiva(-1) }, [q])

  // Ctrl+K / Cmd+K e "/" levam ao campo (fora de outros campos de texto).
  useEffect(() => {
    const tecla = (e: globalThis.KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      const emCampo = !!alvo && (/^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName) || alvo.isContentEditable)
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); campo.current?.focus(); campo.current?.select() }
      else if (e.key === '/' && !emCampo && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); campo.current?.focus() }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])

  const escolher = (o: Opcao) => {
    definirAberta(false)
    if (o.tipo === 'resumo') aoAbrirResumo(o.c)
    else if (o.tipo === 'parte') navegar(`/resumos/${o.c.id}?bloco=${encodeURIComponent(`h-${o.secao.id}`)}`)
    else if (o.tipo === 'livro') { aoMudar(''); aoFiltrarLivro(o.chave) }
    else if (o.tipo === 'area') { aoMudar(''); aoFiltrarArea(o.slug) }
    else aoVerResultados()
  }
  const teclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); definirAberta(true); definirAtiva((i) => (opcoes.length ? (i + 1) % opcoes.length : -1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); definirAberta(true); definirAtiva((i) => (opcoes.length ? (i - 1 + opcoes.length) % opcoes.length : -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (aberta && ativa >= 0 && opcoes[ativa]) escolher(opcoes[ativa])
      else if (q) { definirAberta(false); aoVerResultados() }
    } else if (e.key === 'Escape') {
      if (aberta && q) { e.preventDefault(); definirAberta(false) }
      else if (q) { e.preventDefault(); aoMudar('') }
    }
  }
  const mostrar = aberta && !!q
  const idOpcao = (i: number) => `${id}-op-${i}`
  let i = -1
  const opcao = (o: Opcao, conteudo: ReactNode, chave: string) => {
    i++
    const k = i
    return <li key={chave} id={idOpcao(k)} role="option" aria-selected={ativa === k} className={'bb-sug__item' + (ativa === k ? ' bb-sug__item--ativa' : '')}
      onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(o)} onMouseMove={() => ativa !== k && definirAtiva(k)}>{conteudo}</li>
  }
  const grupo = (titulo: string, itens: ReactNode[]) => itens.length ? <li role="presentation" className="bb-sug__grupo"><p className="bb-sug__titulo" aria-hidden="true">{titulo}</p><ul role="group" aria-label={titulo}>{itens}</ul></li> : null
  const porTipo = <T extends Opcao['tipo']>(t: T) => opcoes.filter((o): o is Extract<Opcao, { tipo: T }> => o.tipo === t)

  return (
    <div className="bb-busca" data-guia="busca">
      <label className="bb-busca__rotulo" htmlFor={`${id}-campo`}>Qual assunto você quer estudar?</label>
      <div className={'bb-busca__caixa' + (mostrar ? ' bb-busca__caixa--aberta' : '')}>
        <Icone nome="busca" tamanho={20} />
        <input ref={campo} id={`${id}-campo`} type="search" role="combobox" autoComplete="off" spellCheck={false} enterKeyHint="search"
          aria-expanded={mostrar} aria-controls={`${id}-lista`} aria-autocomplete="list" aria-activedescendant={mostrar && ativa >= 0 ? idOpcao(ativa) : undefined}
          aria-describedby={`${id}-dica`}
          placeholder="Assunto, classificação, livro ou capítulo" value={valor}
          onChange={(e) => { if (!valor && e.target.value) aoPrimeiraBusca?.(); aoMudar(e.target.value); definirAberta(true) }}
          onFocus={() => q && definirAberta(true)} onBlur={() => definirAberta(false)} onKeyDown={teclar} />
        {valor && <button type="button" className="bb-busca__limpar" onClick={() => { aoMudar(''); campo.current?.focus() }} aria-label="Limpar a busca"><Icone nome="fechar" tamanho={18} /></button>}
        <kbd className="bb-busca__atalho" aria-hidden="true">Ctrl K</kbd>
      </div>
      <p id={`${id}-dica`} className="so-leitor">Digite e use as setas para escolher uma sugestão. Enter abre; Esc fecha.</p>
      <p className="so-leitor" role="status" aria-live="polite">{q ? (s?.total ? `${s.total} ${s.total === 1 ? 'resumo encontrado' : 'resumos encontrados'}` : 'Nenhum resumo encontrado') : ''}</p>
      {mostrar && (
        <ul id={`${id}-lista`} role="listbox" aria-label="Sugestões" className="bb-sug">
          {opcoes.length === 0 && <li className="bb-sug__nada" role="presentation">Nada para “{q}”. Tente o nome do osso, da lesão ou da classificação.</li>}
          {grupo('Assuntos', porTipo('resumo').map((o) => {
            const l = leituras[o.c.id]
            const e = estadoLeitura(l)
            return opcao(o, <>
              <span className="bb-sug__titulo-item"><Realce texto={o.c.titulo} q={q} /></span>
              <span className="bb-sug__sub">{referencia(o.c)}{o.secao ? <> · em <Realce texto={o.secao.titulo} q={q} /></> : null}</span>
              <span className={`bb-sug__estado bb-sug__estado--${e}`}>{e === 'andamento' ? `${pctLido(l)}%` : ESTADO_NOME[e]}</span>
            </>, `r-${o.c.id}`)
          }))}
          {grupo('Partes dos resumos', porTipo('parte').map((o) => opcao(o, <>
            <span className="bb-sug__titulo-item"><Realce texto={o.secao.titulo} q={q} /></span>
            <span className="bb-sug__sub">{o.c.titulo} · abre direto nesta parte</span>
          </>, `p-${o.c.id}-${o.secao.id}`)))}
          {grupo('Livros', porTipo('livro').map((o) => opcao(o, <>
            <span className="bb-sug__titulo-item"><Realce texto={o.rotulo} q={q} /></span>
            <span className="bb-sug__sub">Mostrar os resumos deste livro</span>
          </>, `l-${o.chave}`)))}
          {grupo('Áreas', porTipo('area').map((o) => opcao(o, <>
            <span className="bb-sug__titulo-item"><Realce texto={o.nome} q={q} /></span>
            <span className="bb-sug__sub">Mostrar os resumos da área</span>
          </>, `a-${o.slug}`)))}
          {porTipo('todos').map((o) => opcao(o, <span className="bb-sug__todos">Ver os {o.total} resultados <Icone nome="direita" tamanho={15} /></span>, 'todos'))}
        </ul>
      )}
    </div>
  )
}
