import { useEffect, useRef, useState } from 'react'
import { GatoPixel } from '../mascote/GatoPixel'
import { CorujaPixel } from '../../biblioteca/sala/CorujaPixel'
import { CONCEITOS_CORUJA, FALAS_GATO, proximaFala } from '../mascote/falasBichos'
import '../../estilos/componentes/VisitaCronograma.css'

/**
 * Easter egg do cronograma (pedido do Tales, 31/10/2026): de vez em quando a coruja ou o gato aparecem na calçada
 * da torre e sentam em cima de um botão (na borda de cima, sem cobrir o nome dele). Um toque e eles falam: a coruja
 * explica um conceito que cai na prova, o gato solta uma preguiça (as mesmas falas do Salão dos Cem).
 *
 * Antes de pousar, mede se o lugar está livre (nenhum texto ou controle embaixo, dentro da página); se nenhum
 * lugar servir, ninguém aparece. Recalcula quando a página muda de tamanho. Só um bicho por visita, nunca os dois.
 * Para conferir: `#/cronograma?visita=gato` (ou coruja; `visita=nenhuma` desliga).
 */
type Bicho = 'gato' | 'coruja'
const CHANCE = 0.4
/** Onde eles podem sentar, em ordem de preferência (a primeira com espaço livre ganha). */
const POLEIROS = ['.ccs-alternar', '.cp-dificil .botao', '.cp-hoje .cp-botao', '.cp-recolhido > summary', '.cr-rodape__link']
/** As caixas da página: o bicho senta na borda de uma delas, nunca por cima de outra (os cartões vizinhos). */
const CAIXAS = '.cc-janela, .cc-detalhe, .cp-hoje, .cp-amanha, .cp-semana, .cp-recolhido, .cp-indo > div, .bib-caixa, .pe-aviso, .cp-conta__linha, ' +
  '.cf-hoje, .cf-crono, .cf-modo, .cf-links a, .cf-aviso, .cf-convite, .cf-passos li, .cf-numero, .cf-bloco, .cp-onde, .cfh-heroi'
const TAMANHO: Record<Bicho, { w: number; h: number }> = { gato: { w: 72, h: 54 }, coruja: { w: 66, h: 48 } }

function sortear(): Bicho | null {
  const pedido = /[?&]visita=(gato|coruja|nenhuma)/.exec(typeof location === 'undefined' ? '' : location.hash)?.[1]
  if (pedido) return pedido === 'nenhuma' ? null : pedido as Bicho
  if (Math.random() >= CHANCE) return null
  return Math.random() < 0.5 ? 'gato' : 'coruja'
}

interface Ret { x: number; y: number; w: number; h: number }
const cruza = (a: Ret, b: Ret) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

/** Os retângulos de tudo o que não pode ser coberto: cada linha de texto e cada controle da página. */
function ocupados(raiz: HTMLElement, fora: HTMLElement): Ret[] {
  const lista: Ret[] = []
  const passo = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (!n.textContent?.trim() || fora.contains(n) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })
  const faixa = document.createRange()
  for (let n = passo.nextNode(); n; n = passo.nextNode()) {
    faixa.selectNodeContents(n)
    for (const r of faixa.getClientRects()) if (r.width && r.height) lista.push({ x: r.left, y: r.top, w: r.width, h: r.height })
  }
  for (const el of raiz.querySelectorAll('a, button, summary, input, select, textarea, img, svg, [role="progressbar"]')) {
    if (fora.contains(el)) continue
    const r = el.getBoundingClientRect()
    if (r.width && r.height) lista.push({ x: r.left, y: r.top, w: r.width, h: r.height })
  }
  return lista
}

export function VisitaCronograma({ poleiros = POLEIROS }: { /** Onde podem sentar (os botões da página), em ordem de preferência. */ poleiros?: string[] } = {}) {
  const [bicho] = useState<Bicho | null>(sortear)
  const camada = useRef<HTMLDivElement>(null)
  const [lugar, definirLugar] = useState<{ x: number; y: number } | null>(null)
  const [fala, definirFala] = useState<string | null>(null)
  const [toques, definirToques] = useState(0)

  useEffect(() => {
    const el = camada.current, pagina = el?.parentElement
    if (!bicho || !el || !pagina) return
    const { w, h } = TAMANHO[bicho]
    let espera = 0, quadro = 0
    let poleiro: HTMLElement | null = null
    const lugarDe = (r: DOMRect, base: DOMRect) => {
      // Sentado na borda de cima, perto do canto direito; os pés afundam 4 px no botão.
      const x = Math.min(r.right - w - 6, base.right - w - 8), y = r.top - h + 4
      return { x, y }
    }
    /** Só acompanha o botão escolhido (a página mexeu: dados chegando, calendário trocando de vista, rolagem). */
    const posicionar = () => {
      if (!poleiro || !poleiro.isConnected) { medir(); return }
      const base = pagina.getBoundingClientRect(), r = poleiro.getBoundingClientRect()
      if (!r.width) { medir(); return }
      const { x, y } = lugarDe(r, base)
      definirLugar((a) => (a && Math.abs(a.x - (x - base.left)) < 0.5 && Math.abs(a.y - (y - base.top)) < 0.5 ? a : { x: x - base.left, y: y - base.top }))
    }
    /** Escolhe o poleiro: o primeiro botão com a borda de cima livre (nenhum texto ou controle embaixo do bicho). */
    const medir = () => {
      const base = pagina.getBoundingClientRect()
      const livres = ocupados(pagina, el)
      const caixas = [...pagina.querySelectorAll<HTMLElement>(CAIXAS)].map((c) => ({ c, r: c.getBoundingClientRect() }))
      for (const seletor of poleiros) {
        for (const alvo of pagina.querySelectorAll<HTMLElement>(seletor)) {
          const r = alvo.getBoundingClientRect()
          if (!r.width || r.width < w * 0.8) continue
          const { x, y } = lugarDe(r, base)
          if (x < base.left + 4 || y < base.top + 4) continue
          if (livres.some((o) => cruza({ x, y, w, h: h - 6 }, o))) continue
          // Por cima de outra caixa, não (a do próprio poleiro, ou uma que o contém, pode).
          if (caixas.some(({ c, r: rc }) => !c.contains(alvo) && rc.width && cruza({ x, y, w, h: h - 6 }, { x: rc.left, y: rc.top, w: rc.width, h: rc.height }))) continue
          poleiro = alvo
          definirLugar({ x: x - base.left, y: y - base.top })
          return
        }
      }
      poleiro = null
      definirLugar(null)
    }
    const agendar = () => { window.clearTimeout(espera); espera = window.setTimeout(medir, 250) }
    const acompanhar = () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(posicionar) }
    // Espera a página assentar (calendário, dados sincronizados) antes do primeiro pouso, e confere de novo depois.
    const tempos = [1400, 3500, 7000].map((t) => window.setTimeout(medir, t))
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(agendar)
    ro?.observe(pagina)
    window.addEventListener('scroll', acompanhar, { passive: true })
    pagina.addEventListener('click', acompanhar)
    return () => { tempos.forEach(window.clearTimeout); window.clearTimeout(espera); cancelAnimationFrame(quadro); ro?.disconnect(); window.removeEventListener('scroll', acompanhar); pagina.removeEventListener('click', acompanhar) }
  }, [bicho, poleiros])

  useEffect(() => {
    if (!fala) return
    const t = window.setTimeout(() => definirFala(null), bicho === 'coruja' ? 11000 : 5000)
    return () => window.clearTimeout(t)
  }, [fala, bicho])

  if (!bicho) return null
  const { w, h } = TAMANHO[bicho]
  const tocar = () => { definirToques((n) => n + 1); definirFala(bicho === 'coruja' ? proximaFala('coruja', CONCEITOS_CORUJA) : proximaFala('gato', FALAS_GATO)) }
  const nome = bicho === 'coruja' ? 'A coruja' : 'O gato'
  return (
    <div ref={camada} className="cv-camada">
      {lugar && <>
        <button type="button" className={`cv-bicho cv-bicho--${bicho}`} onClick={tocar} style={{ left: lugar.x, top: lugar.y, width: w, height: h }}
          aria-label={bicho === 'coruja' ? 'A coruja veio visitar: tocar para ouvir um conceito que cai na prova' : 'O gato veio visitar: tocar para ouvir o que ele tem a dizer'}>
          {bicho === 'coruja'
            ? <CorujaPixel key={toques} estado={fala ? 'acenando' : 'olhando'} />
            : <GatoPixel key={toques} estado={fala ? 'ronronando' : 'sentado'} />}
        </button>
        {fala && <span className={`cv-balao${lugar.x > w * 3 ? ' cv-balao--esquerda' : ''}`} onClick={() => definirFala(null)}
          style={lugar.x > w * 3 ? { right: `calc(100% - ${lugar.x + w}px)`, bottom: `calc(100% - ${lugar.y - 4}px)` } : { left: lugar.x, bottom: `calc(100% - ${lugar.y - 4}px)` }}>{fala}</span>}
        <p className="so-leitor" role="status">{fala ? `${nome} diz: ${fala}` : ''}</p>
      </>}
    </div>
  )
}
