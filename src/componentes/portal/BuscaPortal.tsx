import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { recurso } from '../../config'
import { carregarIndice } from '../../dados/acervo'
import { consultaTreinoAssunto } from '../../dados/resumao'
import { carregarIndiceBiblioteca } from '../../biblioteca/conteudo'
import { palavras, sugerir, trechosAchados } from '../../biblioteca/busca'
import { normalizar, rotuloLivro } from '../../biblioteca/estante'
import type { IndiceBiblioteca } from '../../biblioteca/tipos'
import { gravar, ler } from '../../estado/armazenamento'
import { navegar } from '../../util/rotas'
import { Icone } from '../Icone'
import { IconePixel } from './IconePixel'
import type { IconeMenu, Pagina } from './rotas'

/**
 * A busca do Portal (31/10/2026): uma caixa só, a primeira coisa do menu. Acha, em grupos:
 * - Ferramentas: as páginas do site (nome, frase e palavras de quem procura);
 * - Resumos: o capítulo e a PARTE do resumo (classificações, epônimos), pela mesma busca da Biblioteca (busca.ts:
 *   sem acento, palavra por palavra, siglas validadas e uma letra de folga), sobre o índice leve (284 KB);
 * - Assuntos: os subtemas do acervo, para treinar questões do assunto;
 * - Flashcards do assunto;
 * - e sempre "Buscar nas questões" (texto do enunciado e das alternativas).
 * Campo vazio mostra os acessos recentes (só neste aparelho). Nada de resultado inventado: tudo sai dos índices reais.
 */

interface Resultado { chave: string; grupo: 'Ferramentas' | 'Resumos' | 'Assuntos' | 'Flashcards' | 'Recentes' | 'Questões'; titulo: ReactNode; texto?: ReactNode; destino: string; icone: IconeMenu | null; rotulo: string }
interface IndiceFlash { areas: Record<string, { nome: string; assuntos?: Record<string, number> }> }
interface Recente { rotulo: string; destino: string; grupo: Resultado['grupo']; icone: IconeMenu | null }

const CHAVE_RECENTES = 'menu:recentes'
let flashP: Promise<IndiceFlash | null> | null = null
const carregarFlash = () => (flashP ??= fetch(recurso('flashcards/indice.json')).then((r) => (r.ok ? r.json() as Promise<IndiceFlash> : null)).catch(() => { flashP = null; return null }))

function Realce({ texto, q }: { texto: string; q: string }) {
  const faixas = trechosAchados(texto, q)
  if (!faixas.length) return <>{texto}</>
  const partes: ReactNode[] = []
  let i = 0
  faixas.forEach(([a, b], k) => { if (a > i) partes.push(texto.slice(i, a)); partes.push(<mark key={k}>{texto.slice(a, b)}</mark>); i = b })
  if (i < texto.length) partes.push(texto.slice(i))
  return <>{partes}</>
}

export function BuscaPortal({ paginas, aoIr, focar, aoDigitar }: { paginas: Pagina[]; aoIr: () => void; focar: boolean; aoDigitar?: (digitando: boolean) => void }) {
  const id = useId()
  const campo = useRef<HTMLInputElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const [q, definirQ] = useState('')
  const qAdiada = useDeferredValue(q)
  const [focado, definirFocado] = useState(false)
  const [ativo, definirAtivo] = useState(0)
  const [biblioteca, definirBiblioteca] = useState<IndiceBiblioteca | null>(null)
  const [subtemas, definirSubtemas] = useState<string[]>([])
  const [flash, definirFlash] = useState<IndiceFlash | null>(null)
  const [estado, definirEstado] = useState<'parado' | 'carregando' | 'pronto' | 'erro'>('parado')
  const [recentes, definirRecentes] = useState<Recente[]>(() => ler<Recente[]>(CHAVE_RECENTES, []))

  useEffect(() => { if (focar) window.setTimeout(() => campo.current?.focus(), 30) }, [focar])
  useEffect(() => { aoDigitar?.(!!q.trim()) }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  // Os índices descem no primeiro foco ou na primeira tecla (o menu abre sem esperar por eles).
  const carregar = () => {
    if (estado !== 'parado') return
    definirEstado('carregando')
    Promise.allSettled([
      carregarIndiceBiblioteca().then(definirBiblioteca),
      carregarIndice().then((i) => definirSubtemas(i.subtemas)),
      carregarFlash().then(definirFlash),
    ]).then((r) => definirEstado(r.every((x) => x.status === 'rejected') ? 'erro' : 'pronto'))
  }

  // Palavras de cada assunto e de cada grupo de flashcards, preparadas uma vez (não a cada tecla).
  const subtemasProntos = useMemo(() => subtemas.map((sub) => ({ sub, w: normalizar(sub).split(/[^a-z0-9]+/) })), [subtemas])
  const flashProntos = useMemo(() => (flash ? Object.entries(flash.areas).flatMap(([area, a]) => Object.keys(a.assuntos ?? {}).map((assunto) => ({ area, nome: a.nome, assunto, total: a.assuntos![assunto], w: normalizar(assunto).split(/[^a-z0-9]+/) }))) : []), [flash])
  const paginasProntas = useMemo(() => paginas.map((p) => ({ p, nome: normalizar(p.rotulo), w: normalizar(`${p.rotulo} ${p.texto} ${p.chaves ?? ''}`).split(/[^a-z0-9]+/) })), [paginas])

  const resultados = useMemo<Resultado[]>(() => {
    const termo = qAdiada.trim()
    if (!termo) return recentes.map((r) => ({ chave: 'rec' + r.destino, grupo: 'Recentes', titulo: r.rotulo, destino: r.destino, icone: r.icone, rotulo: r.rotulo }))
    const termos = palavras(termo)
    const saida: Resultado[] = []
    // Ferramentas
    const ferramentas = paginasProntas.map(({ p, nome, w }) => {
      const todos = termos.every((t) => w.some((x) => x.startsWith(t)))
      return todos ? { p, peso: termos.every((t) => nome.includes(t)) ? 2 : 1 } : null
    }).filter((x): x is { p: Pagina; peso: number } => !!x).sort((a, b) => b.peso - a.peso)
    const vistos = new Set<string>()
    for (const { p } of ferramentas.slice(0, 4)) {
      if (vistos.has(p.destino + p.rotulo)) continue
      vistos.add(p.destino + p.rotulo)
      saida.push({ chave: 'f' + p.destino + p.rotulo, grupo: 'Ferramentas', titulo: <Realce texto={p.rotulo} q={termo} />, texto: p.texto, destino: p.destino, icone: p.icone, rotulo: p.rotulo })
    }
    // Resumos e partes
    if (biblioteca) {
      const s = sugerir(biblioteca.capitulos, termo, 4)
      for (const a of s.resumos) saida.push({
        chave: 'r' + a.c.id, grupo: 'Resumos', rotulo: a.c.titulo, icone: 'resumos',
        titulo: <Realce texto={a.c.titulo} q={termo} />,
        texto: a.secao ? <>Parte: <Realce texto={a.secao.titulo} q={termo} /> · {rotuloLivro(a.c)}</> : rotuloLivro(a.c),
        destino: a.secao ? `/resumos/${a.c.id}?bloco=${encodeURIComponent(`h-${a.secao.id}`)}` : `/resumos/${a.c.id}`,
      })
    }
    // Assuntos (questões do assunto)
    let n = 0
    for (const { sub, w: alvo } of subtemasProntos) {
      if (n >= 3) break
      if (termos.every((t) => alvo.some((w) => w.startsWith(t)))) {
        n++
        saida.push({ chave: 's' + sub, grupo: 'Assuntos', rotulo: `Treinar: ${sub}`, icone: 'treinar', titulo: <Realce texto={sub} q={termo} />, texto: 'Questões ainda não respondidas deste assunto', destino: consultaTreinoAssunto(sub) })
      }
    }
    // Flashcards do assunto
    let k = 0
    for (const f of flashProntos) {
      if (k >= 2) break
      if (termos.every((t) => f.w.some((w) => w.startsWith(t)))) {
        k++
        saida.push({ chave: 'fc' + f.area + f.assunto, grupo: 'Flashcards', rotulo: `Flashcards: ${f.assunto}`, icone: 'flashcards', titulo: <Realce texto={f.assunto} q={termo} />, texto: `${f.nome} · ${f.total} flashcards`,
          destino: `/flashcards/biblioteca?${new URLSearchParams({ categoria: 'area:' + f.area, area: f.area, assunto: f.assunto, n: '20' })}` })
      }
    }
    saida.push({ chave: 'q', grupo: 'Questões', rotulo: `Buscar “${termo}” nas questões`, icone: null, titulo: <>Buscar “{termo}” nas questões</>, texto: 'Enunciados e alternativas de todo o acervo', destino: `/treinar?busca=${encodeURIComponent(termo)}` })
    return saida
  }, [qAdiada, paginasProntas, biblioteca, subtemasProntos, flashProntos, recentes])

  useEffect(() => { definirAtivo(0) }, [qAdiada])
  useEffect(() => { lista.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [ativo])

  const ir = (r: Resultado) => {
    if (r.grupo !== 'Questões') {
      const novo: Recente = { rotulo: r.rotulo, destino: r.destino, grupo: r.grupo === 'Recentes' ? 'Ferramentas' : r.grupo, icone: r.icone }
      gravar(CHAVE_RECENTES, [novo, ...recentes.filter((x) => x.destino !== r.destino)].slice(0, 5))
      definirRecentes(ler<Recente[]>(CHAVE_RECENTES, []))
    }
    aoIr()
    navegar(r.destino)
  }
  const teclas = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); definirQ(''); return }
    if (!resultados.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); definirAtivo((a) => Math.min(resultados.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); definirAtivo((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const r = resultados[ativo]; if (r) ir(r) }
  }
  const mostrar = (focado || !!q) && resultados.length > 0
  const grupos = [...new Set(resultados.map((r) => r.grupo))]
  const idx = (r: Resultado) => resultados.indexOf(r)

  return (
    <div className={'pt-busca' + (mostrar ? ' pt-busca--aberta' : '')} role="search">
      <label className="pt-busca__campo" htmlFor={`${id}-q`}>
        <Icone nome="busca" tamanho={20} />
        <span className="so-leitor">Buscar no site</span>
        <input ref={campo} id={`${id}-q`} type="search" value={q} autoComplete="off" spellCheck={false} enterKeyHint="search"
          placeholder="Buscar ferramenta, resumo ou assunto (Garden, revisão…)"
          onFocus={() => { definirFocado(true); carregar() }} onBlur={() => window.setTimeout(() => definirFocado(false), 150)}
          onChange={(e) => { carregar(); definirQ(e.target.value) }} onKeyDown={teclas}
          role="combobox" aria-expanded={mostrar} aria-controls={`${id}-lista`} aria-autocomplete="list"
          aria-activedescendant={mostrar ? `${id}-r${ativo}` : undefined} />
        {q ? <button type="button" className="pt-busca__limpar" onClick={() => { definirQ(''); campo.current?.focus() }} aria-label="Limpar a busca"><Icone nome="fechar" tamanho={16} /></button>
          : <kbd className="pt-busca__atalho" aria-hidden="true">Ctrl K</kbd>}
      </label>
      <p className="so-leitor" role="status" aria-live="polite">{q.trim() ? (estado === 'carregando' ? 'Carregando os índices' : `${Math.max(0, resultados.length - 1)} resultados`) : ''}</p>
      {mostrar && (
        <ul ref={lista} id={`${id}-lista`} className="pt-resultados" role="listbox" aria-label={q.trim() ? 'Resultados da busca' : 'Acessos recentes'}>
          {q.trim() && estado === 'carregando' && <li className="pt-resultados__aviso" role="presentation"><span className="pt-girando" aria-hidden="true" /> Abrindo os resumos e os assuntos…</li>}
          {q.trim() && estado === 'erro' && <li className="pt-resultados__aviso" role="presentation">Não deu para carregar os resumos agora. As ferramentas e a busca nas questões continuam aqui.</li>}
          {grupos.map((g) => (
            <li key={g} role="presentation" className="pt-resultados__grupo">
              <p className="pt-resultados__titulo" aria-hidden="true">{g === 'Questões' ? 'Mais' : g}</p>
              <ul role="group" aria-label={g}>
                {resultados.filter((r) => r.grupo === g).map((r) => {
                  const i = idx(r)
                  return <li key={r.chave} id={`${id}-r${i}`} role="option" aria-selected={i === ativo} className={'pt-resultado' + (i === ativo ? ' pt-resultado--ativo' : '')}
                    onMouseDown={(e) => e.preventDefault()} onClick={() => ir(r)} onMouseMove={() => i !== ativo && definirAtivo(i)}>
                    <span className="pt-resultado__icone">{r.icone ? <IconePixel nome={r.icone} tamanho={24} /> : <Icone nome="busca" tamanho={18} />}</span>
                    <span className="pt-resultado__texto"><strong>{r.titulo}</strong>{r.texto && <small>{r.texto}</small>}</span>
                    <Icone nome="direita" tamanho={15} />
                  </li>
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
