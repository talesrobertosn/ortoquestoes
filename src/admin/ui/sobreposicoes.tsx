import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icone, type NomeIconeAdmin } from './Icone'
import { normalizar } from './formato'

/** Prende o Tab dentro da caixa, fecha no Esc e devolve o foco a quem abriu. */
function usarPrisao(aberta: boolean, aoFechar: () => void) {
  const caixa = useRef<HTMLDivElement>(null)
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar
  useEffect(() => {
    if (!aberta) return
    const antes = document.activeElement as HTMLElement | null
    const el = caixa.current
    requestAnimationFrame(() => (el?.querySelector<HTMLElement>('[data-foco-inicial]') ?? el?.querySelector<HTMLElement>('button, [href], input, select, textarea'))?.focus())
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); fechar.current(); return }
      if (e.key !== 'Tab' || !el) return
      const focaveis = [...el.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(f => f.offsetParent !== null)
      if (!focaveis.length) return
      const [primeiro, ultimo] = [focaveis[0], focaveis[focaveis.length - 1]]
      if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', tecla)
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = rolagem; antes?.focus?.() }
  }, [aberta])
  return caixa
}

/** Raiz das sobreposições dentro do painel (herda os tokens .a3). */
const raiz = () => document.getElementById('a3-camadas') ?? document.body

/** Gaveta lateral: ficha de pessoa, detalhe de cobrança, revisão de envio. No celular, tela cheia. */
export function Gaveta({ aberta, aoFechar, titulo, subtitulo, topo, children, largura }: {
  aberta: boolean; aoFechar: () => void; titulo: ReactNode; subtitulo?: ReactNode; topo?: ReactNode; children: ReactNode; largura?: number
}) {
  const caixa = usarPrisao(aberta, aoFechar)
  const id = useId()
  if (!aberta) return null
  return createPortal(<>
    <div className="a3-veu" onClick={aoFechar} aria-hidden="true" />
    <div ref={caixa} className="a3-gaveta" role="dialog" aria-modal="true" aria-labelledby={id} style={largura ? { width: `min(${largura}px, calc(100vw - 16px))` } : undefined}>
      <header className="a3-gaveta__cabeca">
        {topo}
        <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 3 }}>
          <h2 id={id} className="a3-titulo-2" style={{ overflowWrap: 'anywhere' }}>{titulo}</h2>
          {subtitulo && <div className="a3-mudo" style={{ fontSize: 13 }}>{subtitulo}</div>}
        </div>
        <button type="button" className="a3-botao a3-botao--fantasma a3-botao--icone" onClick={aoFechar} aria-label="Fechar"><Icone nome="fechar" /></button>
      </header>
      <div className="a3-gaveta__corpo">{children}</div>
    </div>
  </>, raiz())
}

/* ───────────── Confirmação (promessa) ───────────── */

interface PedidoConfirmar { titulo: string; texto?: ReactNode; sim: string; nao?: string; perigo?: boolean; campo?: { rotulo: string; valorInicial?: string }; resolver: (ok: boolean, valor?: string) => void }
let pedido: PedidoConfirmar | null = null
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach(o => o())

/**
 * Pede confirmação explícita antes de uma ação com efeito (reprocessar, enviar, cortesia, publicar).
 * Resolve `true` só no botão de confirmar; Esc, Cancelar e clique fora resolvem `false`.
 */
export function confirmar(p: Omit<PedidoConfirmar, 'resolver'>): Promise<boolean> {
  return new Promise(resolver => { pedido?.resolver(false); pedido = { ...p, resolver }; avisar() })
}

/** Como `confirmar`, com um campo de texto (anotação opcional). Resolve o texto (pode ser vazio) ou null se cancelar. */
export function pedirTexto(p: Omit<PedidoConfirmar, 'resolver' | 'campo'> & { rotulo: string; valorInicial?: string }): Promise<string | null> {
  const { rotulo, valorInicial, ...resto } = p
  return new Promise(resolver => { pedido?.resolver(false); pedido = { ...resto, campo: { rotulo, valorInicial }, resolver: (ok, valor) => resolver(ok ? (valor ?? '') : null) }; avisar() })
}

export function HospedeConfirmar() {
  const atual = useSyncExternalStore(cb => { ouvintes.add(cb); return () => { ouvintes.delete(cb) } }, () => pedido)
  const [valor, definirValor] = useState('')
  useEffect(() => { definirValor(atual?.campo?.valorInicial ?? '') }, [atual])
  const fechar = (ok: boolean) => { atual?.resolver(ok, valor); pedido = null; avisar() }
  const caixa = usarPrisao(!!atual, () => fechar(false))
  const id = useId()
  if (!atual) return null
  return createPortal(<>
    <div className="a3-veu" onClick={() => fechar(false)} aria-hidden="true" />
    <div ref={caixa} className="a3-dialogo" role="alertdialog" aria-modal="true" aria-labelledby={id}>
      <h2 id={id}>{atual.titulo}</h2>
      {atual.texto && <div className="a3-mudo" style={{ display: 'grid', gap: 8 }}>{atual.texto}</div>}
      {atual.campo && <label className="a3-campo"><span>{atual.campo.rotulo}</span><textarea className="a3-entrada" value={valor} onChange={e => definirValor(e.target.value)} data-foco-inicial /></label>}
      <div className="a3-dialogo__acoes">
        <button type="button" className="a3-botao a3-botao--contorno" onClick={() => fechar(false)} {...(atual.campo ? {} : { 'data-foco-inicial': true })}>{atual.nao ?? 'Cancelar'}</button>
        <button type="button" className={'a3-botao' + (atual.perigo ? ' a3-botao--perigo' : '')} onClick={() => fechar(true)}>{atual.sim}</button>
      </div>
    </div>
  </>, raiz())
}

/* ───────────── Avisos rápidos (resultado de operação) ───────────── */

interface AvisoRapido { id: number; texto: ReactNode; tom: 'ok' | 'erro' | 'info' }
let avisos: AvisoRapido[] = []
const ouvintesAvisos = new Set<() => void>()
let seq = 0
/** Resultado de uma operação: sucesso some em 5 s; erro fica até fechar (nunca escondido). */
export function avisoRapido(texto: ReactNode, tom: AvisoRapido['tom'] = 'ok') {
  const id = ++seq
  avisos = [...avisos.slice(-3), { id, texto, tom }]
  ouvintesAvisos.forEach(o => o())
  if (tom !== 'erro') window.setTimeout(() => { avisos = avisos.filter(a => a.id !== id); ouvintesAvisos.forEach(o => o()) }, 5000)
}
export function HospedeAvisos() {
  const lista = useSyncExternalStore(cb => { ouvintesAvisos.add(cb); return () => { ouvintesAvisos.delete(cb) } }, () => avisos)
  if (!lista.length) return null
  return createPortal(<div className="a3-avisos-rapidos" role="status" aria-live="polite">
    {lista.map(a => <div key={a.id} className={`a3-aviso-rapido a3-aviso-rapido--${a.tom}`}>
      <Icone nome={a.tom === 'erro' ? 'alerta' : a.tom === 'ok' ? 'certo' : 'info'} />
      <div style={{ flex: 1 }}>{a.texto}</div>
      <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno a3-botao--icone" aria-label="Fechar aviso"
        onClick={() => { avisos = avisos.filter(x => x.id !== a.id); ouvintesAvisos.forEach(o => o()) }}><Icone nome="fechar" tamanho={14} /></button>
    </div>)}
  </div>, raiz())
}

/* ───────────── Paleta de comandos (Ctrl/Cmd+K) ───────────── */

export interface ItemPaleta { id: string; grupo: string; titulo: string; detalhe?: string; icone: NomeIconeAdmin; palavras?: string; executar: () => void }

/**
 * Busca global e atalhos: partes do painel, pessoas, questões por id, ações seguras de navegação.
 * Nada destrutivo roda daqui: as ações abrem a tela onde a operação pede confirmação.
 */
export function Paleta({ aberta, aoFechar, itens, buscarMais }: {
  aberta: boolean; aoFechar: () => void; itens: ItemPaleta[]; buscarMais?: (termo: string) => ItemPaleta[]
}) {
  const [termo, definirTermo] = useState('')
  const [indice, definirIndice] = useState(0)
  const caixa = usarPrisao(aberta, aoFechar)
  // Zera ao fechar (não ao abrir): quem digita logo depois do Ctrl K não cai no termo da busca anterior.
  useEffect(() => { if (!aberta) { definirTermo(''); definirIndice(0) } }, [aberta])
  const t = normalizar(termo.trim())
  const lista = !aberta ? [] : [
    ...itens.filter(i => !t || normalizar(`${i.titulo} ${i.detalhe ?? ''} ${i.palavras ?? ''} ${i.grupo}`).includes(t)),
    ...(t.length >= 2 && buscarMais ? buscarMais(termo.trim()) : []),
  ].slice(0, 40)
  useEffect(() => { definirIndice(0) }, [termo])
  if (!aberta) return null
  const executar = (i: ItemPaleta) => { aoFechar(); i.executar() }
  const grupos = [...new Set(lista.map(i => i.grupo))]
  return createPortal(<>
    <div className="a3-veu" onClick={aoFechar} aria-hidden="true" />
    <div ref={caixa} className="a3-paleta" role="dialog" aria-modal="true" aria-label="Buscar no painel">
      <div className="a3-paleta__busca">
        <Icone nome="busca" />
        <input data-foco-inicial autoFocus value={termo} onChange={e => definirTermo(e.target.value)} placeholder="Buscar parte, pessoa, questão ou ação…"
          role="combobox" aria-expanded aria-controls="a3-paleta-lista" aria-activedescendant={lista[indice] ? `a3-p-${lista[indice].id}` : undefined}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); definirIndice(i => Math.min(lista.length - 1, i + 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); definirIndice(i => Math.max(0, i - 1)) }
            else if (e.key === 'Enter' && lista[indice]) { e.preventDefault(); executar(lista[indice]) }
          }} />
        <span className="a3-kbd">Esc</span>
      </div>
      <div className="a3-paleta__lista" id="a3-paleta-lista" role="listbox">
        {!lista.length ? <p className="a3-paleta__vazio">Nada encontrado para “{termo}”.</p> : grupos.map(g => <div key={g} role="group" aria-label={g}>
          <div className="a3-paleta__grupo a3-rotulo">{g}</div>
          {lista.filter(i => i.grupo === g).map(i => {
            const k = lista.indexOf(i)
            return <button key={i.id} id={`a3-p-${i.id}`} type="button" role="option" aria-selected={k === indice} className="a3-paleta__item"
              onMouseMove={() => definirIndice(k)} onClick={() => executar(i)}>
              <Icone nome={i.icone} /><span>{i.titulo}</span>{i.detalhe && <small>{i.detalhe}</small>}
            </button>
          })}
        </div>)}
      </div>
      <div className="a3-paleta__pe"><span><span className="a3-kbd">↑</span> <span className="a3-kbd">↓</span> escolher</span><span><span className="a3-kbd">↵</span> abrir</span></div>
    </div>
  </>, raiz())
}
