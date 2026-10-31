import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icone } from '../../componentes/Icone'
import { AREAS_BIBLIOTECA } from '../busca'
import { FILTROS_PADRAO, type EstadoLeitura, type FiltrosEstante, type OrdemEstante } from '../estante'
import type { Agrupar } from './Lista'

export type Modo = 'estante' | 'lista'

const PROGRESSOS: Array<{ v: EstadoLeitura | null; nome: string }> = [{ v: null, nome: 'Todos' }, { v: 'novo', nome: 'Não iniciados' }, { v: 'andamento', nome: 'Em andamento' }, { v: 'concluido', nome: 'Concluídos' }]
const ORDENS: Array<{ v: OrdemEstante; nome: string }> = [{ v: 'livro', nome: 'Ordem do livro' }, { v: 'cobrados', nome: 'Mais cobrados primeiro' }, { v: 'recentes', nome: 'Lidos por último' }, { v: 'titulo', nome: 'Título (A a Z)' }]
const AGRUPAR: Array<{ v: Agrupar; nome: string }> = [{ v: 'livro', nome: 'Por livro' }, { v: 'area', nome: 'Por área' }, { v: 'nenhum', nome: 'Sem grupos' }]

interface Props {
  modo: Modo
  aoModo: (m: Modo) => void
  filtros: FiltrosEstante
  mudar: (m: Partial<FiltrosEstante>) => void
  limpar: () => void
  livros: Array<{ chave: string; rotulo: string; total: number }>
  areas: Array<{ slug: string; total: number }>
  contagem: Record<'todos' | EstadoLeitura, number>
  total: number
  achados: number
  agrupar: Agrupar
  aoAgrupar: (a: Agrupar) => void
  relevancia: boolean
}

/**
 * A barra da Biblioteca 3.0 (31/10/2026): Estante ou Lista (os mesmos filtros e a mesma busca nas duas), o progresso
 * em quatro botões sempre à vista, e o resto (livro, área, ordem e grupos) num painel compacto: no computador abre
 * embaixo do botão, no celular sobe de baixo. Os filtros escolhidos viram etiquetas com X, e "Limpar filtros" zera tudo.
 */
export function BarraFiltros(p: Props) {
  const id = useId()
  const [painel, definirPainel] = useState(false)
  const botao = useRef<HTMLButtonElement>(null)
  const caixa = useRef<HTMLDivElement>(null)
  const extras = (p.filtros.livro ? 1 : 0) + (p.filtros.area ? 1 : 0) + (p.filtros.ordem !== 'livro' ? 1 : 0)
  useEffect(() => {
    if (!painel) return
    const fora = (e: PointerEvent) => { if (!caixa.current?.contains(e.target as Node) && !botao.current?.contains(e.target as Node)) definirPainel(false) }
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') { definirPainel(false); botao.current?.focus() } }
    window.addEventListener('pointerdown', fora)
    window.addEventListener('keydown', tecla)
    window.setTimeout(() => caixa.current?.querySelector<HTMLElement>('button, input')?.focus(), 0)
    return () => { window.removeEventListener('pointerdown', fora); window.removeEventListener('keydown', tecla) }
  }, [painel])

  const rotuloLivro = p.livros.find((l) => l.chave === p.filtros.livro)?.rotulo
  const nomeArea = AREAS_BIBLIOTECA.find((a) => a.slug === p.filtros.area)?.nome
  const etiquetas: Array<{ chave: string; texto: ReactNode; tirar: () => void }> = []
  if (p.filtros.q.trim()) etiquetas.push({ chave: 'q', texto: <>“{p.filtros.q.trim()}”</>, tirar: () => p.mudar({ q: '' }) })
  if (rotuloLivro) etiquetas.push({ chave: 'livro', texto: rotuloLivro, tirar: () => p.mudar({ livro: null }) })
  if (nomeArea) etiquetas.push({ chave: 'area', texto: nomeArea, tirar: () => p.mudar({ area: null }) })
  if (p.filtros.progresso) etiquetas.push({ chave: 'progresso', texto: PROGRESSOS.find((x) => x.v === p.filtros.progresso)?.nome, tirar: () => p.mudar({ progresso: null }) })
  if (p.filtros.ordem !== 'livro') etiquetas.push({ chave: 'ordem', texto: ORDENS.find((o) => o.v === p.filtros.ordem)?.nome, tirar: () => p.mudar({ ordem: 'livro' }) })

  return (
    <div className="bb-barra-filtros" id="bb-resultados" data-guia="filtros">
      <div className="bb-barra-filtros__linha">
        <div className="bb-modo" role="group" aria-label="Como ver a biblioteca">
          <button type="button" aria-pressed={p.modo === 'estante'} onClick={() => p.aoModo('estante')}><Icone nome="livro" tamanho={16} /> Estante</button>
          <button type="button" aria-pressed={p.modo === 'lista'} onClick={() => p.aoModo('lista')}><Icone nome="menu" tamanho={16} /> Lista</button>
        </div>
        <div className="bb-progresso" role="group" aria-label="Progresso de leitura">
          {PROGRESSOS.map((x) => <button key={x.nome} type="button" aria-pressed={p.filtros.progresso === x.v} onClick={() => p.mudar({ progresso: x.v })}>
            {x.nome} <span className="numerico">{p.contagem[x.v ?? 'todos']}</span>
          </button>)}
        </div>
        <div className="bb-filtros-mais">
          <button ref={botao} type="button" className="bb-botao-filtros" aria-expanded={painel} aria-controls={`${id}-painel`} onClick={() => definirPainel(!painel)}>
            <Icone nome="filtro" tamanho={16} /> Filtros{extras > 0 && <span className="bb-botao-filtros__n numerico">{extras}</span>}
          </button>
          {painel && <>
            <div className="bb-painel-fundo" aria-hidden="true" onClick={() => definirPainel(false)} />
            <div ref={caixa} id={`${id}-painel`} className="bb-painel" role="dialog" aria-label="Filtros da biblioteca">
              <span className="bb-painel__alca" aria-hidden="true" />
              <fieldset>
                <legend>Livro</legend>
                <div className="bb-opcoes">
                  <button type="button" aria-pressed={!p.filtros.livro} onClick={() => p.mudar({ livro: null })}>Todos os livros</button>
                  {p.livros.map((l) => <button key={l.chave} type="button" aria-pressed={p.filtros.livro === l.chave} onClick={() => p.mudar({ livro: p.filtros.livro === l.chave ? null : l.chave })}>{l.rotulo}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend>Área</legend>
                <div className="bb-opcoes">
                  <button type="button" aria-pressed={!p.filtros.area} onClick={() => p.mudar({ area: null })}>Todas as áreas</button>
                  {p.areas.map((a) => <button key={a.slug} type="button" aria-pressed={p.filtros.area === a.slug} onClick={() => p.mudar({ area: p.filtros.area === a.slug ? null : a.slug })}>{AREAS_BIBLIOTECA.find((x) => x.slug === a.slug)?.nome ?? a.slug}</button>)}
                </div>
              </fieldset>
              <fieldset>
                <legend>Ordenar{p.modo === 'estante' ? <small> (na Lista; a estante segue a ordem de cada livro)</small> : null}</legend>
                <div className="bb-opcoes">{ORDENS.map((o) => <button key={o.v} type="button" aria-pressed={p.filtros.ordem === o.v} onClick={() => p.mudar({ ordem: o.v })}>{o.nome}</button>)}</div>
              </fieldset>
              {p.modo === 'lista' && <fieldset>
                <legend>Agrupar a lista</legend>
                <div className="bb-opcoes">{AGRUPAR.map((a) => <button key={a.v} type="button" aria-pressed={p.agrupar === a.v} onClick={() => p.aoAgrupar(a.v)}>{a.nome}</button>)}</div>
              </fieldset>}
              <div className="bb-painel__pe">
                <button type="button" className="bb-botao-linha" onClick={() => p.limpar()} disabled={!etiquetas.length}>Limpar filtros</button>
                <button type="button" className="bb-botao-ler" onClick={() => { definirPainel(false); botao.current?.focus() }}>Ver {p.achados} {p.achados === 1 ? 'resumo' : 'resumos'}</button>
              </div>
            </div>
          </>}
        </div>
      </div>
      <div className="bb-barra-filtros__resultado" role="status" aria-live="polite">
        <p className="bb-contagem"><b className="numerico">{p.achados}</b>{p.achados !== p.total ? <> de <span className="numerico">{p.total}</span></> : null} {p.total === 1 ? 'resumo' : 'resumos'}{p.relevancia && p.modo === 'lista' ? <span className="bb-contagem__ordem"> · mais relevantes primeiro</span> : null}</p>
        {etiquetas.length > 0 && <ul className="bb-etiquetas" aria-label="Filtros escolhidos">
          {etiquetas.map((e) => <li key={e.chave}><button type="button" onClick={e.tirar} aria-label={`Tirar o filtro ${typeof e.texto === 'string' ? e.texto : 'da busca'}`}>{e.texto} <Icone nome="fechar" tamanho={13} /></button></li>)}
          {etiquetas.length > 1 && <li><button type="button" className="bb-etiquetas__limpar" onClick={() => p.limpar()}>Limpar filtros</button></li>}
        </ul>}
      </div>
    </div>
  )
}
export { FILTROS_PADRAO }
