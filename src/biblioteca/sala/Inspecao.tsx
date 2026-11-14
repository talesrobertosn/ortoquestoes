import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react'
import { Icone } from '../../componentes/Icone'
import { JanelaCentral } from '../../componentes/JanelaCentral'
import { corDaArea } from '../../dados/coresAreas'
import type { Indice } from '../../dados/tipos'
import { href, navegar } from '../../util/rotas'
import { nomeArea } from '../busca'
import { apelidoLivro, capitulosDoResumo, estadoLeitura, numeroCapitulo, tituloOriginal } from '../estante'
import { NOME_RARIDADE, raridade } from '../salao/segredos'
import type { Leitura, ResumoCapitulo } from '../tipos'
import { carregarCapitulo } from '../conteudo'
import type { Periodo } from './usarSalao'
import { ESTADO_NOME, acaoLeitura, cliqueComum, corDaCapa, parouEm, pctLido, pecaArmario, provasDoCapitulo, semMovimento, temMouse, texturas } from './comum'
import { tocar } from './sons'

/** Abrir o livro (14/11/2026): a capa abre, três folhas passam e a página cresce até virar o leitor. */
const ABRIR_MS = 900
const VOO_MS = 560
const VOLTA_MS = 420
const SUAVE = 'cubic-bezier(0.22, 0.8, 0.3, 1)'

/** Uma cópia do livro que voa por cima de tudo (a janela corta o que sai dela). */
function copiaVoadora(livro: HTMLElement, insp: HTMLElement, r: DOMRect): HTMLElement {
  const voo = document.createElement('div')
  voo.className = `bb-voo ${[...insp.classList].filter((c) => c.startsWith('bb-insp--')).join(' ')}`
  voo.setAttribute('style', insp.getAttribute('style') ?? '')
  Object.assign(voo.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
  const copia = livro.cloneNode(true) as HTMLElement
  copia.style.animation = 'none'
  copia.classList.remove('bb-insp__livro--escondido')
  voo.appendChild(copia)
  document.body.appendChild(voo)
  return voo
}
/** Onde a lombada está agora na estante (a página pode ter rolado): só se estiver à vista. */
function lombadaNaTela(id: string): DOMRect | null {
  const el = document.querySelector<HTMLElement>(`.bb-vol[data-cap="${CSS.escape(id)}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return r.bottom > 0 && r.top < window.innerHeight && r.width > 0 ? r : null
}
/** O deslocamento que a janela ainda tem da animação de entrada (para mirar onde o livro vai ficar). */
function deslocamentoDaCaixa(el: HTMLElement): { x: number; y: number } {
  const caixa = el.closest<HTMLElement>('.jc__caixa')
  if (!caixa) return { x: 0, y: 0 }
  const m = new DOMMatrixReadOnly(getComputedStyle(caixa).transform === 'none' ? undefined : getComputedStyle(caixa).transform)
  return { x: m.m41, y: m.m42 }
}

/**
 * A ficha do volume (31/10/2026): o livro sai da estante e abre ao lado (no celular, sobe de baixo). Título inteiro,
 * livro, edição, capítulo, área, tempo, questões de prova e de simulado, as partes do resumo (cada uma abre o leitor
 * direto nela), as provas em que caiu e o progresso de verdade. Um botão só para ler, com o texto do estado
 * ("Ler o resumo", "Continuar a leitura", "Reler o resumo"); continuar abre na posição guardada pelo leitor.
 */
/** A cor do papel do leitor (claro, sépia ou escuro, como a pessoa deixou), para a página que cresce não piscar. */
const PAPEL_DO_LEITOR = { claro: '#fbfaf6', sepia: '#f3ead6', escuro: '#141816' } as const

export function Inspecao({ c, selo, origem, periodo, papel = 'sepia', leitura, fechado, indice, destaques, aoFechar }: {
  c: ResumoCapitulo; selo?: string; origem?: DOMRect; periodo: Periodo; papel?: keyof typeof PAPEL_DO_LEITOR; leitura?: Leitura; fechado: boolean; indice: Indice | null; destaques: number; aoFechar: () => void
}) {
  const [abrindo, definirAbrindo] = useState(false)
  const [voando, definirVoando] = useState(!!origem && !semMovimento())
  const [fechando, definirFechando] = useState(false)
  const [todasProvas, definirTodasProvas] = useState(false)
  const [todasPartes, definirTodasPartes] = useState(false)
  const relogio = useRef<number | undefined>(undefined)
  const raiz = useRef<HTMLDivElement>(null)
  const livro = useRef<HTMLDivElement>(null)
  const arrasto = useRef<{ y0: number; dy: number; id: number } | null>(null)
  useEffect(() => { tocar('puxar') }, [c.id])
  useEffect(() => () => window.clearTimeout(relogio.current), [])
  // O texto do resumo já começa a chegar enquanto a ficha está aberta: "Ler" abre o leitor sem espera.
  useEffect(() => { carregarCapitulo(c.id).catch(() => undefined) }, [c.id])

  // O livro sai da prateleira: uma cópia voa da lombada até a mesa, girando da lombada para a capa.
  useLayoutEffect(() => {
    if (!origem || semMovimento() || !livro.current || !raiz.current) { definirVoando(false); return }
    const fim = livro.current.getBoundingClientRect()
    const d = deslocamentoDaCaixa(livro.current)
    const alvo = new DOMRect(fim.left - d.x, fim.top - d.y, fim.width, fim.height)
    const voo = copiaVoadora(livro.current, raiz.current, alvo)
    const dx = origem.left + origem.width / 2 - (alvo.left + alvo.width / 2)
    const dy = origem.top + origem.height / 2 - (alvo.top + alvo.height / 2)
    const esc = Math.max(0.35, origem.height / alvo.height)
    const anim = voo.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${esc}) rotateY(78deg)`, opacity: 0.9 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 40}px) scale(${(esc + 1) / 2 + 0.08}) rotateY(30deg)`, opacity: 1, offset: 0.55 },
      { transform: 'translate(0, 0) scale(1) rotateY(0deg)', opacity: 1 },
    ], { duration: VOO_MS, easing: SUAVE })
    anim.onfinish = () => { voo.remove(); definirVoando(false) }
    return () => { anim.cancel(); voo.remove() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Devolver à estante: o livro volta voando para a lombada (se ela estiver à vista) e a janela some junto.
  const fecharComVolta = useCallback(() => {
    if (fechando) return
    const volta = lombadaNaTela(c.id)
    if (!volta || semMovimento() || !livro.current || !raiz.current) { aoFechar(); return }
    definirFechando(true)
    const de = livro.current.getBoundingClientRect()
    const voo = copiaVoadora(livro.current, raiz.current, de)
    const dx = volta.left + volta.width / 2 - (de.left + de.width / 2)
    const dy = volta.top + volta.height / 2 - (de.top + de.height / 2)
    const esc = Math.max(0.3, volta.height / de.height)
    voo.animate([
      { transform: 'translate(0, 0) scale(1) rotateY(0deg)' },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) scale(${(esc + 1) / 2}) rotateY(40deg)`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(${esc}) rotateY(82deg)`, opacity: 0.85 },
    ], { duration: VOLTA_MS, easing: 'cubic-bezier(0.5, 0, 0.6, 1)' }).onfinish = () => { voo.remove(); tocar('puxar'); aoFechar() }
  }, [aoFechar, c.id, fechando])

  // O livro acompanha o mouse de leve (só transform, a cada quadro).
  const quadro = useRef(0)
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (!temMouse() || semMovimento() || !livro.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5
    cancelAnimationFrame(quadro.current)
    quadro.current = requestAnimationFrame(() => { livro.current?.style.setProperty('--ry', `${(-14 + x * 16).toFixed(1)}deg`); livro.current?.style.setProperty('--rx', `${(-y * 8).toFixed(1)}deg`) })
  }
  const sair = () => { cancelAnimationFrame(quadro.current); livro.current?.style.removeProperty('--ry'); livro.current?.style.removeProperty('--rx') }

  // No celular a ficha é uma gaveta: arrastar a alça ou a mesa para baixo fecha.
  const caixaDe = () => raiz.current?.closest<HTMLElement>('.jc__caixa') ?? null
  const comecarArrasto = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || abrindo) return
    arrasto.current = { y0: e.clientY, dy: 0, id: e.pointerId }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const arrastar = (e: PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current; const cx = caixaDe()
    if (!a || a.id !== e.pointerId || !cx) return
    a.dy = Math.max(0, e.clientY - a.y0)
    cx.style.transition = 'none'
    cx.style.transform = `translateY(${a.dy}px)`
  }
  const soltar = (e: PointerEvent<HTMLDivElement>) => {
    const a = arrasto.current; const cx = caixaDe()
    arrasto.current = null
    if (!a || a.id !== e.pointerId || !cx) return
    cx.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.7, 0.3, 1)'
    if (a.dy > 110) { cx.style.transform = 'translateY(100%)'; window.setTimeout(aoFechar, 200) }
    else cx.style.transform = ''
  }
  const estado = estadoLeitura(leitura)
  const r = raridade(c.questoes.length)
  const provas = provasDoCapitulo(indice, c.questoes)
  const caps = capitulosDoResumo(c)
  const n = numeroCapitulo(c)
  const pct = pctLido(leitura)
  const parou = parouEm(c, leitura)
  const destino = `/resumos/${c.id}`
  const ler = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cliqueComum(e) || semMovimento()) return
    e.preventDefault()
    if (abrindo) return
    tocar('pagina')
    definirAbrindo(true)
    // A página: nasce do miolo do livro aberto e cresce até cobrir a tela, na cor do leitor; aí o leitor entra.
    const alvo = livro.current?.getBoundingClientRect()
    if (alvo) {
      const pagina = document.createElement('div')
      pagina.className = 'bb-pagina-voo'
      // O livro chega mais perto (scale 1.12) antes de abrir: a página nasce em cima da folha da direita já aberta.
      const w = alvo.width * 1.12, h = alvo.height * 1.12
      const x0 = alvo.left + alvo.width / 2 - w / 2, y0 = alvo.top + alvo.height / 2 - h / 2
      Object.assign(pagina.style, { left: `${x0}px`, top: `${y0}px`, width: `${w}px`, height: `${h}px`, background: PAPEL_DO_LEITOR[papel] })
      ;(raiz.current?.closest('.jc') ?? document.body).appendChild(pagina)
      const sx = window.innerWidth / w, sy = window.innerHeight / h
      pagina.animate([
        { transform: 'translate(0, 0) scale(1)', opacity: 0, offset: 0 },
        { transform: 'translate(0, 0) scale(1)', opacity: 0, offset: 0.6 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0.68 },
        { transform: `translate(${-x0}px, ${-y0}px) scale(${sx}, ${sy})`, opacity: 1 },
      ], { duration: ABRIR_MS, easing: 'cubic-bezier(0.55, 0, 0.35, 1)', fill: 'forwards' })
    }
    relogio.current = window.setTimeout(() => navegar(destino), ABRIR_MS)
  }
  const partes = c.secoes.filter((s) => !/^como ler/i.test(s.titulo))
  const original = tituloOriginal(c)
  return (
    <JanelaCentral aberta aoFechar={fecharComVolta} rotulo={`Ficha: ${c.titulo}`} className={`bb-inspecao${origem && !semMovimento() ? ' bb-inspecao--voo' : ''}${fechando ? ' bb-inspecao--fechando' : ''}`}>
      <div ref={raiz} className={`bb-insp bb-insp--${r}${abrindo ? ' bb-insp--abrindo' : ''}`}
        style={{ ...texturas(), '--cor': corDaArea(c.especialidade), '--capa': corDaCapa(c.livro), '--mesa': `url("${new URL(pecaArmario(`mesa-${periodo}.webp`), document.baseURI).href}")`, '--selos': `url("${new URL(pecaArmario('selos.png'), document.baseURI).href}")` } as CSSProperties}>
        <div className="bb-insp__palco" aria-hidden="true" onPointerMove={mover} onPointerLeave={sair}
          onPointerDown={comecarArrasto} onPointerUp={soltar} onPointerCancel={soltar} onPointerMoveCapture={arrastar}>
          <span className="bb-insp__alca" />
          <span className="bb-insp__aura" />
          {r === 'lendario' && <span className="bb-insp__fagulhas"><i /><i /><i /><i /><i /><i /></span>}
          <div className={`bb-insp__livro${voando ? ' bb-insp__livro--escondido' : ''}`} ref={livro}>
            <span className="bb-insp__lombada"><small>{apelidoLivro(c.livro)}</small></span>
            <span className="bb-insp__miolo" />
            <span className="bb-insp__folhas"><i /><i /><i /></span>
            <span className="bb-insp__pagina"><b>{c.titulo}</b><i /><i /><i /><i /></span>
            <span className="bb-insp__capa">
              <span className="bb-insp__canto bb-insp__canto--1" /><span className="bb-insp__canto bb-insp__canto--2" />
              <small>{apelidoLivro(c.livro)}</small>
              <b>{c.titulo}</b>
              <small>{caps.length > 1 ? `Caps. ${caps[0]}–${caps[caps.length - 1]}` : n === Number.MAX_SAFE_INTEGER ? '' : `Cap. ${n}`}</small>
              <span className={`bb-selo-cera bb-selo-cera--${r} bb-insp__selo-capa`} />
            </span>
            <span className="bb-insp__fita" />
          </div>
          <span className="bb-insp__sombra" />
        </div>
        <div className="bb-insp__dados">
          {selo && <p className="bb-insp__selo">{selo}</p>}
          <p className="bb-insp__linha">
            <span className={`bb-raridade bb-raridade--${r}`}><span className={`bb-selo-cera bb-selo-cera--${r}`} /> {NOME_RARIDADE[r]} na prova</span>
            <span className="bb-insp__area"><i style={{ background: 'var(--cor)' }} /> {nomeArea(c.especialidade)}</span>
          </p>
          <h2 className="bb-insp__titulo">{c.titulo}</h2>
          <p className="bb-insp__ref">
            <b>{c.livro}</b>, {c.edicao.replace(/\s*,\s*com\s.*$/i, '')}.<br />
            {c.capitulo.split('·')[0].trim()}{original ? <> · <i lang="en">{original}</i></> : null}
          </p>
          <dl className="bb-insp__atributos">
            <div><dt>Leitura</dt><dd className="numerico">~{c.minutos} min</dd></div>
            <div><dt>Questões de prova</dt><dd className="numerico">{c.questoes.length}</dd></div>
            <div><dt>Simulados</dt><dd className="numerico">{c.treino.length}</dd></div>
            <div><dt>Partes</dt><dd className="numerico">{partes.length}</dd></div>
          </dl>

          <div className={`bb-insp__progresso bb-insp__progresso--${estado}`}>
            <span className="bb-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
            <p><b>{estado === 'andamento' ? `${pct}% lido` : ESTADO_NOME[estado]}</b>{estado === 'andamento' && parou ? <> · parou em “{parou}”</> : null}{destaques > 0 ? <> · <a href={href('/resumos/caderno')}>{destaques} {destaques === 1 ? 'destaque' : 'destaques'} no caderno</a></> : null}</p>
          </div>

          <div className="bb-insp__acoes">
            <a className="bb-botao-ler" href={href(destino)} onClick={ler}>
              {fechado ? <Icone nome="cadeado" tamanho={18} /> : <Icone nome="livro" tamanho={18} />} {acaoLeitura(leitura)}
            </a>
            <button type="button" className="bb-botao-linha" onClick={fecharComVolta}>Devolver à estante</button>
          </div>

          {provas.length > 0 && <section className="bb-insp__bloco" aria-label="Provas em que o assunto caiu">
            <h3>Já caiu em</h3>
            <p className="bb-provas">{(todasProvas ? provas : provas.slice(0, 4)).map((x) => <span key={x}>{x}</span>)}
              {provas.length > 4 && <button type="button" onClick={() => definirTodasProvas(!todasProvas)} aria-expanded={todasProvas}>{todasProvas ? 'Menos' : `+${provas.length - 4} provas`}</button>}
            </p>
          </section>}

          {partes.length > 0 && <section className="bb-insp__bloco" aria-label="Partes do resumo">
            <h3>Partes do resumo</h3>
            <ol className="bb-insp__partes">
              {(todasPartes ? partes : partes.slice(0, 6)).map((s) => <li key={s.id}><a href={href(`/resumos/${c.id}?bloco=${encodeURIComponent(`h-${s.id}`)}`)}>{s.titulo}<Icone nome="direita" tamanho={14} /></a></li>)}
            </ol>
            {partes.length > 6 && <button type="button" className="bb-botao-texto" onClick={() => definirTodasPartes(!todasPartes)} aria-expanded={todasPartes}>{todasPartes ? 'Mostrar menos' : `Ver as ${partes.length} partes`}</button>}
          </section>}

          <section className="bb-insp__bloco" aria-label="Sobre o resumo">
            <h3>Em poucas linhas</h3>
            <p className="bb-insp__resumo">{c.resumo.length > 320 ? `${c.resumo.slice(0, 320).replace(/\s+\S*$/, '')}…` : c.resumo}</p>
            <p className="bb-insp__nota">Resumo autoral do OrtoQuestões, escrito a partir do capítulo citado. Não substitui o livro.</p>
          </section>
        </div>
      </div>
    </JanelaCentral>
  )
}
