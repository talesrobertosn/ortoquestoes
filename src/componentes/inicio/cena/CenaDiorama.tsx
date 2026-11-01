import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { recurso } from '../../../config'
import { Mascote } from '../../mascote/Mascote'
import { folhaGato, type IdLinhaGato } from '../../mascote/sprites'
import { CorujaPixel, type EstadoCoruja } from '../../../biblioteca/sala/CorujaPixel'
import { CONCEITOS_CORUJA, FALAS_GATO, proximaFala } from '../../mascote/falasBichos'
import { FALAS_PAUSA_APAGADA, FALAS_PAUSA_FOGUEIRA } from '../../mascote/falas'
import { EVENTO_AMOSTRA } from '../AmostraRespondivel'
import { urlCss } from '../../../config'
import { cenarioDaHora, type Cenario } from './cenarios'
import type { Periodo } from '../../../estado/aparencia'

/**
 * O cenário "HD-2D" do topo da página inicial (30/10/2026, pedido do Tales com o Octopath Traveler II de referência).
 * O fundo é pintado pixel a pixel por scripts/gerar_cena_inicio.py, com a luz calculada (feixes de sol, sombras, luz da
 * fogueira, profundidade de campo); há uma imagem para cada hora do dia. Por cima, animados e no lugar certo:
 * a fogueira da sequência (scripts/gerar_sprites_inicio.py, um estágio por linha), o esqueleto lendo no tronco e o
 * gato. O "palco" tem a proporção da arte (480 x 200) e cobre o espaço; as posições são porcentagens da arte.
 *
 * O esqueleto é o mascote (componentes/mascote): faz uma coisa diferente a cada visita e fala; dois cliques no gato
 * e ele aparece com uma tala.
 */
export { periodoAgora, type Periodo } from '../../../estado/aparencia'

/** Posição e tamanho em porcentagem do palco, a partir de pixels da arte (480 x 200). */
const lugar = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `${(x / 480) * 100}%`, top: `${(y / 200) * 100}%`, width: `${(w / 480) * 100}%`, height: `${(h / 200) * 100}%` })

/** O que fica por cima da cena: textos, a missão e a questão de amostra. Nada disso pode cobrir os mascotes ou a fala. */
const TAMPAS = '.jn-missao, .jn-vitrine__amostra, .jn-saudacao h1, .jn-saudacao p, .jn-vitrine__convite, .jn-vitrine__nota'
type Caixa = { x: number; y: number; w: number; h: number }
const caixa = (el: Element): Caixa => { const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height } }
const cruza = (a: Caixa, b: Caixa) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
/** A caixa está inteira dentro da área visível da cena e não encosta em nenhuma tampa? */
function livre(c: Caixa, heroi: Element, cena: Element): boolean {
  const v = caixa(cena)
  if (c.x < v.x || c.y < v.y || c.x + c.w > v.x + v.w || c.y + c.h > v.y + v.h) return false
  return [...heroi.querySelectorAll(TAMPAS)].every((t) => cruza(c, caixa(t)) === 0)
}

type Encaixe = { dx: number; dy: number; nivel: number }
/**
 * Onde o balão cabe se o bicho estiver deslocado em (ox, oy) px: nível 0–3 é perto do bicho, 4–5 longe, 8 nenhum.
 * Nível 8 (tela estreita demais): o balão some da vista e a frase fica só para o leitor de tela; nunca por cima de
 * texto, botão ou personagem (direção do atlas, 01/11/2026).
 */
function planejarBalao(balao: HTMLElement, alturaBicho: number, deslocs: { x: number; y: number }[]): Encaixe[] {
  const heroi = balao.closest('.jn-heroi, .hd-topo'), cena = balao.closest('.hd-cena')
  balao.style.removeProperty('translate'); balao.style.removeProperty('--cauda-x'); balao.classList.remove('hd-balao--embaixo', 'hd-balao--sem-lugar')
  if (!heroi || !cena) return deslocs.map(() => ({ dx: 0, dy: 0, nivel: 0 }))
  const b0 = caixa(balao), c0 = caixa(cena), h0 = caixa(heroi)
  // A parte visível da cena: o herói corta a cena embaixo (a faixa da sequência vem logo depois).
  const v = { x: Math.max(c0.x, h0.x), y: Math.max(c0.y, h0.y), w: Math.min(c0.x + c0.w, h0.x + h0.w) - Math.max(c0.x, h0.x), h: Math.min(c0.y + c0.h, h0.y + h0.h) - 8 - Math.max(c0.y, h0.y) }
  const passos: number[] = [0]
  for (let d = 12; d <= v.w; d += 12) passos.push(d, -d)
  // Evita também o esqueleto e a fala dele; prefere ficar perto do bicho (em cima ou embaixo) a ir longe.
  // Também os outros bichos e as outras falas (a coruja e o gato falando ao mesmo tempo não se cobrem).
  const bichos = [...heroi.querySelectorAll('.hd-mascote .mascote__corpo, .hd-mascote:not([data-lado="oculto"]) .mascote__balao, .hd-balao:not(.hd-balao--sem-lugar), .hd-gato:not(.hd-gato--fora), .hd-coruja:not(.hd-coruja--fora)')].filter((e) => e !== balao).map(caixa)
  const embaixo = b0.h + alturaBicho + 14
  const perto = b0.w * 0.6
  // Nunca por cima de um bicho ou de outra fala: sem lugar livre de verdade, o nível 8 tira o balão da vista.
  const tentativas: [number, number][] = [[0, perto], [-28, perto], [-56, perto], [embaixo, perto], [0, Infinity], [embaixo, Infinity]]
  return deslocs.map((o) => {
    const b = { ...b0, x: b0.x + o.x, y: b0.y + o.y }
    const acha = (dy: number, longe: number) => passos.find((dx) => {
      if (Math.abs(dx) > longe) return false
      const c = { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h }
      if (c.x < v.x || c.y < v.y || c.x + c.w > v.x + v.w || c.y + c.h > v.y + v.h) return false
      return livre(c, heroi, cena) && bichos.every((t) => cruza(c, t) === 0)
    })
    for (const [k, [dy, longe]] of tentativas.entries()) { const dx = acha(dy, longe); if (dx !== undefined) return { dx, dy, nivel: k } }
    return { dx: 0, dy: 0, nivel: 8 }
  })
}
function aplicarEncaixe(balao: HTMLElement, e: Encaixe) {
  balao.classList.toggle('hd-balao--embaixo', e.nivel < 8 && e.dy > 0)
  balao.classList.toggle('hd-balao--sem-lugar', e.nivel === 8)
  balao.style.translate = `${Math.round(e.dx)}px ${Math.round(e.dy)}px`
  balao.style.setProperty('--cauda-x', `${Math.round(-e.dx)}px`)
}
/**
 * Encaixa o balão de fala de um bicho num lugar à vista (pedido do Tales, 01/11/2026: "as frases do gato ainda estão
 * aparecendo escondidas"): em cima do bicho; se encosta num texto ou cartão, desliza para os lados ou desce para baixo
 * dele; sem lugar nenhum (tela muito estreita), a frase vai só para o leitor de tela. Nunca cortado nem por cima.
 */
function encaixarBalao(balao: HTMLElement | null, alturaBicho: number) {
  if (balao) aplicarEncaixe(balao, planejarBalao(balao, alturaBicho, [{ x: 0, y: 0 }])[0])
}

/** Um bicho fala de cada vez na cena: quem começa a falar avisa, e o outro fecha o balão. */
const EVENTO_FALA = 'hd-bicho-fala'
const avisarFala = (quem: 'gato' | 'coruja' | 'esqueleto') => window.dispatchEvent(new CustomEvent(EVENTO_FALA, { detail: quem }))
const ouvirFala = (f: (quem: string) => void) => {
  const ouvir = (e: Event) => f(String((e as CustomEvent).detail))
  window.addEventListener(EVENTO_FALA, ouvir)
  return () => window.removeEventListener(EVENTO_FALA, ouvir)
}

const reduzMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const DURACAO_PASSO = 3600
const PAUSA_MS = 20000

/**
 * A coruja bibliotecária (desenho do Tales, 01/11/2026) pousada no acampamento: fica parada, olha, lê um pouco e às
 * vezes acena; um toque e ela acena de volta. Pousa no primeiro poleiro que estiver à vista e livre (nenhum texto,
 * cartão, mascote ou balão de fala por cima ou por baixo): a placa de madeira, o alto da barraca, o lampião, o arco de
 * pedra ou os caixotes. Confere de novo quando a tela muda e de tempos em tempos (o balão do esqueleto vem e vai).
 */
const CORUJA = { w: 33, h: 24 }
const ROTINA_CORUJA: EstadoCoruja[] = ['parada', 'olhando', 'parada', 'lendo', 'lendo', 'parada', 'acenando']
const OUTROS = '.hd-mascote, .mascote__balao, .hd-balao:not(.hd-balao--coruja), .hd-gato'
function CorujaDoAcampamento({ poleiros: POLEIROS }: { poleiros: Cenario['coruja'] }) {
  const [passo, definirPasso] = useState(0)
  const [acenou, definirAcenou] = useState(0)
  // Começa escondida e escolhe o poleiro logo ao montar (antes aparecia 1 s no primeiro poleiro, às vezes em dobro).
  const [poleiro, definirPoleiro] = useState<number | null>(null)
  const [fala, definirFala] = useState<string | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  const balao = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => { if (fala) encaixarBalao(balao.current, ref.current?.getBoundingClientRect().height ?? 40) }, [fala, poleiro])
  useEffect(() => {
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => { if (!document.hidden) definirPasso((p) => (p + 1) % ROTINA_CORUJA.length) }, 5200)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => {
    const escolher = () => {
      const el = ref.current, palco = el?.closest('.hd-palco'), heroi = el?.closest('.jn-heroi, .hd-topo'), cena = el?.closest('.hd-cena')
      if (!el || !palco || !heroi || !cena) return
      // Na vitrine do computador a coruja já está pousada no cartão da amostra: aqui ela não aparece (nunca duas).
      const naVitrine = heroi.querySelector<HTMLElement>('.jn-vitrine__coruja')
      if (naVitrine && getComputedStyle(naVitrine).display !== 'none') { definirPoleiro(null); return }
      const P = caixa(palco)
      const outros = [...heroi.querySelectorAll(OUTROS)].map(caixa)
      const livreAqui = (i: number) => {
        const pt = POLEIROS[i]
        const c = { x: P.x + ((pt.x - CORUJA.w / 2) / 480) * P.w, y: P.y + ((pt.y - CORUJA.h) / 200) * P.h, w: (CORUJA.w / 480) * P.w, h: (CORUJA.h / 200) * P.h }
        return livre(c, heroi, cena) && outros.every((o) => cruza(c, o) === 0)
      }
      definirPoleiro((atual) => (atual !== null && livreAqui(atual) ? atual : POLEIROS.findIndex((_, i) => livreAqui(i)) >= 0 ? POLEIROS.findIndex((_, i) => livreAqui(i)) : null))
    }
    escolher()
    const primeira = window.setTimeout(escolher, 600)
    const vez = window.setInterval(() => { if (!document.hidden) escolher() }, 2500)
    window.addEventListener('resize', escolher)
    return () => { window.clearTimeout(primeira); window.clearInterval(vez); window.removeEventListener('resize', escolher) }
  }, [])
  const estado: EstadoCoruja = acenou ? 'acenando' : ROTINA_CORUJA[passo]
  useEffect(() => { if (!acenou) return; const t = window.setTimeout(() => definirAcenou(0), 1400); return () => window.clearTimeout(t) }, [acenou])
  useEffect(() => { if (!fala) return; const t = window.setTimeout(() => definirFala(null), 11000); return () => window.clearTimeout(t) }, [fala])
  const pt = POLEIROS[poleiro ?? 0]
  // A coruja é a sábia: cada toque explica um conceito que cai na prova.
  const tocar = () => { definirAcenou((n) => n + 1); definirFala(proximaFala('coruja', CONCEITOS_CORUJA)); avisarFala('coruja') }
  // Um fala de cada vez: se o gato começa a falar, a coruja fecha o balão dela.
  useEffect(() => ouvirFala((quem) => { if (quem !== 'coruja') definirFala(null) }), [])
  return <>
    <button ref={ref} type="button" className={'hd-coruja' + (poleiro === null ? ' hd-coruja--fora' : '')} onClick={tocar}
      aria-label="Falar com a coruja" tabIndex={poleiro === null ? -1 : undefined} aria-hidden={poleiro === null || undefined}
      style={lugar(pt.x - CORUJA.w / 2, pt.y - CORUJA.h * 31 / 32, CORUJA.w, CORUJA.h)}>
      <CorujaPixel key={`${estado}-${acenou}`} estado={estado} />
    </button>
    {fala && poleiro !== null && <span ref={balao} className={`hd-balao hd-balao--longo hd-balao--coruja ${pt.x > 250 ? 'hd-balao--esquerda' : 'hd-balao--direita'}`} role="status"
      onClick={() => definirFala(null)} style={{ left: `${(pt.x / 480) * 100}%`, top: `${((pt.y - CORUJA.h - 1) / 200) * 100}%` }}>{fala}</span>}
  </>
}

export function CenaDiorama({ linhaFogo, periodo, descanso = false, festa = 0 }: {
  linhaFogo: number; periodo: Periodo
  /** Meta do dia cumprida (31/10/2026): o esqueleto senta para se aquecer na fogueira e o gato ronrona. */
  descanso?: boolean
  /** Muda de valor para disparar a comemoração curta da meta cumprida (esqueleto pula e o gato comemora). */
  festa?: number
}) {
  // O cenário desta hora (cenarios.ts): decide uma vez ao abrir a página, para nada trocar de lugar no meio da visita.
  const [cenario] = useState(() => cenarioDaHora())
  const [reacaoAmostra, definirReacaoAmostra] = useState<{ id: 'comemora2' | 'quadro'; n: number } | null>(null)
  // A pausa na fogueira (01/11/2026): um toque no fogo e o esqueleto senta para se aquecer, a luz esquenta e o gato
  // ronrona. É só um respiro: não conta dia, não mexe na sequência e acaba sozinha (ou com outro toque no fogo).
  const [pausa, definirPausa] = useState(0)
  useEffect(() => { if (!pausa) return; const t = window.setTimeout(() => definirPausa(0), PAUSA_MS); return () => window.clearTimeout(t) }, [pausa])
  const fogoAceso = linhaFogo > 0
  const PONTOS_GATO = cenario.gato
  const repouso: IdLinhaGato = descanso || (pausa && fogoAceso) ? 'ronronando' : 'dormindo'
  const poseDoPonto = (i: number): IdLinhaGato => (PONTOS_GATO[i].pose === 'repouso' ? repouso : PONTOS_GATO[i].pose)
  const [gato, definirGato] = useState<IdLinhaGato>(repouso)
  const [ponto, definirPonto] = useState(0)
  const [andando, definirAndando] = useState<'direita' | 'esquerda' | null>(null)
  const [semLugar, definirSemLugar] = useState(false)
  // O gato é o preguiçoso: cada toque, uma frase; no 6º toque seguido, a tala (o segredo antigo).
  const [falaGato, definirFalaGato] = useState<string | null>(null)
  const toquesGato = useRef(0)
  useEffect(() => ouvirFala((quem) => { if (quem !== 'gato') definirFalaGato(null) }), [])
  const balaoGato = useRef<HTMLSpanElement>(null)
  // Se a fala não cabe perto do gato neste canto, ele anda até o canto livre mais próximo onde caiba (e fala de lá).
  const jaAndou = useRef(false)
  const passoFala = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(passoFala.current), [])
  useLayoutEffect(() => {
    const balao = balaoGato.current, el = palco.current
    if (andando || !balao || !el || !(falaGato || gato === 'tala')) return
    const altura = el.querySelector('.hd-gato')?.getBoundingClientRect().height ?? 40
    const P = caixa(el)
    const livres = pontosLivres()
    const opcoes = [ponto, ...(jaAndou.current || reduzMovimento() ? [] : livres.filter((i) => i !== ponto))]
    const planos = planejarBalao(balao, altura, opcoes.map((i) => ({ x: ((PONTOS_GATO[i].x - PONTOS_GATO[ponto].x) / 480) * P.w, y: ((PONTOS_GATO[i].y - PONTOS_GATO[ponto].y) / 200) * P.h })))
    if (planos[0].nivel <= 3 || opcoes.length === 1) { aplicarEncaixe(balao, planos[0]); return }
    // O canto mais perto (de onde o gato está) em que a fala cabe ao lado dele.
    const bons = opcoes.map((i, k) => ({ i, k })).filter(({ k }) => planos[k].nivel <= 3)
      .sort((a, b) => Math.abs(PONTOS_GATO[a.i].x - PONTOS_GATO[ponto].x) - Math.abs(PONTOS_GATO[b.i].x - PONTOS_GATO[ponto].x))
    if (!bons.length) { aplicarEncaixe(balao, planos[0]); return }
    const destino = bons[0].i, pose = gato
    jaAndou.current = true
    definirAndando(PONTOS_GATO[destino].x < PONTOS_GATO[ponto].x ? 'esquerda' : 'direita')
    if (pose !== 'tala') definirGato('andando')
    definirPonto(destino)
    window.clearTimeout(passoFala.current)
    passoFala.current = window.setTimeout(() => { definirAndando(null); definirGato((g) => (g === 'andando' ? 'acordado' : g)) }, DURACAO_PASSO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [falaGato, gato, ponto, andando])
  useEffect(() => { if (!falaGato || andando) return; const t = window.setTimeout(() => definirFalaGato(null), 5500); return () => window.clearTimeout(t) }, [falaGato, andando])
  const palco = useRef<HTMLDivElement>(null)
  const espera = useRef(0)
  const agora = useRef({ gato, ponto, falando: false })
  agora.current = { gato, ponto, falando: !!falaGato }

  /** Os cantos em que o gato fica inteiro à vista, sem nada por cima (medidos agora, nesta largura de tela). */
  const pontosLivres = (): number[] => {
    const el = palco.current, heroi = el?.closest('.jn-heroi, .hd-topo'), cena = el?.closest('.hd-cena')
    if (!el || !heroi || !cena) return PONTOS_GATO.map((_, i) => i)
    const P = caixa(el)
    return PONTOS_GATO.map((pt, i) => ({ i, c: { x: P.x + (pt.x / 480) * P.w, y: P.y + (pt.y / 200) * P.h, w: (36 / 480) * P.w, h: (22.5 / 200) * P.h } }))
      .filter(({ c }) => livre(c, heroi, cena)).map(({ i }) => i)
  }

  // Ao abrir e quando a tela muda de tamanho: se o canto do gato ficou coberto, ele já aparece num canto livre.
  useEffect(() => {
    let quadro = 0
    const conferir = () => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => {
        const livres = pontosLivres()
        // Nenhum canto livre nesta largura: o gato sai de cena em vez de ficar coberto.
        definirSemLugar(livres.length === 0)
        if (livres.length && !livres.includes(agora.current.ponto)) {
          definirPonto(livres[0])
          if (agora.current.gato !== 'tala' && agora.current.gato !== 'comemorando') definirGato(poseDoPonto(livres[0]))
        }
      })
    }
    const t = window.setTimeout(conferir, 600)
    // A questão de amostra e a missão mudam de altura (carregam, são respondidas): confere de novo a cada mudança.
    const heroi = palco.current?.closest('.jn-heroi, .hd-topo')
    const medidor = new ResizeObserver(conferir)
    if (heroi) { medidor.observe(heroi); heroi.querySelectorAll(TAMPAS).forEach((e) => medidor.observe(e)) }
    return () => { window.clearTimeout(t); cancelAnimationFrame(quadro); medidor.disconnect() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repouso])

  // A fala do esqueleto abre para o lado livre: em cima, à esquerda, à direita ou embaixo, o primeiro que não encosta
  // em texto nem em cartão e cabe inteiro na cena. Mede só quando um balão novo aparece.
  useEffect(() => {
    const el = palco.current
    const heroi = el?.closest('.jn-heroi, .hd-topo'), cena = el?.closest('.hd-cena')
    const mascote = el?.querySelector<HTMLElement>('.hd-mascote')
    if (!el || !heroi || !cena || !mascote) return
    const posicionar = () => {
      const balao = mascote.querySelector('.mascote__balao')
      if (!balao) { delete mascote.dataset.lado; return }
      // Mede com a animação de entrada parada (senão a caixa vem deslocada e o balão troca de lado).
      const b = balao as HTMLElement
      b.style.animation = 'none'
      try {
        // Também não cobre o gato, a coruja nem a fala deles.
        const bichos = [...heroi.querySelectorAll('.hd-gato:not(.hd-gato--fora), .hd-coruja:not(.hd-coruja--fora), .hd-balao:not(.hd-balao--sem-lugar)')].map(caixa)
        for (const lado of ['cima', 'esquerda', 'direita', 'baixo']) {
          mascote.dataset.lado = lado
          const c = caixa(balao)
          if (livre(c, heroi, cena) && bichos.every((t) => cruza(c, t) === 0)) return
        }
      } finally { b.style.animation = '' }
      // Sem lugar livre (tela muito estreita), a fala não aparece: melhor do que cortada ou por baixo de um texto.
      mascote.dataset.lado = 'oculto'
    }
    const observador = new MutationObserver(posicionar)
    observador.observe(mascote, { childList: true, subtree: true, characterData: true })
    const medidor = new ResizeObserver(posicionar)
    medidor.observe(heroi); heroi.querySelectorAll(TAMPAS).forEach((e) => medidor.observe(e))
    return () => { observador.disconnect(); medidor.disconnect() }
  }, [descanso, pausa, reacaoAmostra?.id, reacaoAmostra?.n])

  // O gato acompanha a cena: com a meta cumprida ele ronrona; numa comemoração, pula junto por um instante.
  useEffect(() => { definirGato(poseDoPonto(agora.current.ponto)) }, [repouso]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!festa || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    definirGato('comemorando')
    const fim = window.setTimeout(() => definirGato(poseDoPonto(agora.current.ponto)), 2600)
    return () => window.clearTimeout(fim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [festa])

  // Na vitrine, quem responde a questão de amostra ganha uma reação do esqueleto: comemora no acerto, aponta o caminho
  // (a dica) no erro. É só um enfeite: a resposta e o comentário não dependem dele.
  useEffect(() => {
    const ouvir = (e: Event) => {
      const acertou = Boolean((e as CustomEvent<{ acertou: boolean }>).detail?.acertou)
      definirReacaoAmostra({ id: acertou ? 'comemora2' : 'quadro', n: Date.now() })
      if (acertou) {
        definirGato('comemorando')
        window.setTimeout(() => definirGato((g) => (g === 'comemorando' ? poseDoPonto(agora.current.ponto) : g)), 2600)
      }
    }
    window.addEventListener(EVENTO_AMOSTRA, ouvir)
    return () => window.removeEventListener(EVENTO_AMOSTRA, ouvir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A tala é uma piada curta: depois de alguns segundos o balão some e o gato volta ao que estava fazendo.
  useEffect(() => {
    if (gato !== 'tala') return
    const fim = window.setTimeout(() => definirGato(poseDoPonto(agora.current.ponto)), 6000)
    return () => window.clearTimeout(fim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gato])

  // O passeio (1/11/2026): de tempos em tempos o gato atravessa o chão do acampamento até outro canto e se acomoda
  // numa pose que combina com o lugar. Não sai do lugar com "menos animação", com a tala ou comemorando.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let proximo = 0, chegada = 0
    const passear = () => {
      proximo = window.setTimeout(() => {
        const { gato: g, ponto: atual } = agora.current
        // Não sai passeando no meio de outra caminhada, com uma fala aberta ou com a tala.
        // Nem enquanto a coruja fala (o caminho poderia passar por baixo do balão dela).
        if (g !== 'tala' && g !== 'comemorando' && g !== 'acordando' && g !== 'andando' && !agora.current.falando && !palco.current?.querySelector('.hd-balao')) {
          const opcoes = pontosLivres().filter((i) => i !== atual)
          if (!opcoes.length) { passear(); return }
          const destino = opcoes[Math.floor(Math.random() * opcoes.length)]
          definirAndando(PONTOS_GATO[destino].x < PONTOS_GATO[atual].x ? 'esquerda' : 'direita')
          definirGato('andando')
          definirPonto(destino)
          chegada = window.setTimeout(() => { definirAndando(null); definirGato((g) => (g === 'andando' ? poseDoPonto(destino) : g)) }, DURACAO_PASSO)
        }
        passear()
      }, 16000 + Math.random() * 14000)
    }
    passear()
    return () => { window.clearTimeout(proximo); window.clearTimeout(chegada) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repouso])

  // Passar o mouse pelo acampamento acorda o gato devagar (acorda, boceja e fica olhando); ao sair, ele volta a dormir.
  useEffect(() => {
    const alvo = palco.current?.closest('.jn-heroi, .hd-topo') as HTMLElement | null
    if (!alvo || !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return
    const entrar = () => {
      window.clearTimeout(espera.current)
      espera.current = window.setTimeout(() => {
        definirGato((g) => (g === 'dormindo' || g === 'ronronando' ? 'acordando' : g))
        espera.current = window.setTimeout(() => definirGato((g) => (g === 'acordando' ? 'observando' : g)), 1400)
      }, 900)
    }
    const sair = () => {
      window.clearTimeout(espera.current)
      espera.current = window.setTimeout(() => definirGato((g) => (g === 'acordando' || g === 'observando' ? poseDoPonto(agora.current.ponto) : g)), 3500)
    }
    alvo.addEventListener('pointerenter', entrar)
    alvo.addEventListener('pointerleave', sair)
    return () => { window.clearTimeout(espera.current); alvo.removeEventListener('pointerenter', entrar); alvo.removeEventListener('pointerleave', sair) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repouso])

  // Parallax leve com o mouse (computador, sem "menos animação").
  useEffect(() => {
    const el = palco.current
    const alvo = el?.closest('.jn-heroi, .hd-topo') as HTMLElement | null
    if (!el || !alvo || !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return
    let quadro = 0
    const mover = (e: PointerEvent) => {
      cancelAnimationFrame(quadro)
      quadro = requestAnimationFrame(() => {
        const r = alvo.getBoundingClientRect()
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3))
        el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3))
      })
    }
    const sair = () => { el.style.setProperty('--mx', '0'); el.style.setProperty('--my', '0') }
    alvo.addEventListener('pointermove', mover)
    alvo.addEventListener('pointerleave', sair)
    return () => { cancelAnimationFrame(quadro); alvo.removeEventListener('pointermove', mover); alvo.removeEventListener('pointerleave', sair) }
  }, [])

  const particulas = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 70 + 5, t: 6 + (i % 5) * 1.6, d: -((i * 1.7) % 8) })), [])
  const brasas = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ dx: ((i * 29) % 13) - 6, t: 1.8 + (i % 4) * 0.5, d: -((i * 0.7) % 3) })), [])
  // Na pausa, a fogueira respira mais alto: uma revoada de fagulhas sobe mais longe e mais devagar.
  const fagulhas = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ dx: ((i * 37) % 23) - 11, t: 2.6 + (i % 5) * 0.55, d: -((i * 0.43) % 3.4) })), [])
  const imagem = (larg: number) => recurso(`pixel/inicio/${cenario.arquivo}-${periodo}${larg === 960 ? '-960' : ''}.webp`)

  return (
    // Só os bichos e a fogueira são alcançáveis (teclado e leitor de tela); o resto da arte é enfeite (aria-hidden).
    <div className="hd-cena">
      <div ref={palco} className={`hd-palco hd-palco--${periodo} hd-palco--${cenario.id}${pausa && fogoAceso ? ' hd-palco--pausa' : ''}`}>
        <img className="hd-palco__fundo" src={imagem(1440)} srcSet={`${imagem(960)} 960w, ${imagem(1440)} 1440w`} sizes="(max-width: 60rem) 170vw, 100vw"
          width={1440} height={600} alt="" decoding="async" fetchPriority="high" />
        <span className="hd-luz-fogo" aria-hidden="true" style={{ left: `${(240 / 480) * 100}%`, top: `${(140 / 200) * 100}%`, '--forca': linhaFogo === 0 ? 0.2 : 1 } as CSSProperties} />
        {/* A pausa vira um quadro de cinema: a borda do acampamento escurece e um calor âmbar respira em volta do fogo. */}
        <span className="hd-vinheta" aria-hidden="true" />
        <span className="hd-calor" aria-hidden="true" style={lugar(130, 50, 220, 150)} />
        <span className={`hd-fogo hd-fogo--${linhaFogo}`} aria-hidden="true" style={{ ...lugar(220, 104, 40, 48), '--linha': linhaFogo } as CSSProperties} />
        {/* O easter egg: a espada fincada na fogueira (scripts/sprites/espada_fogueira.py), com a chama dos dois lados. */}
        {cenario.espada && <span className={`hd-espada${linhaFogo === 0 ? ' hd-espada--apagada' : ''}`} aria-hidden="true" style={{ ...lugar(234, 109, 12, 40), '--sprite-espada': urlCss('pixel/inicio/espada.png') } as CSSProperties} />}
        {/* Fogo e espada juntos (01/11/2026, "tipo Dark Souls"): uma segunda chama, só a parte de baixo, passa na frente
            da lâmina; a luz da fogueira e a brasa ficam recortadas no desenho da espada (InicioHd.css, .hd-espada). */}
        {cenario.espada && linhaFogo > 0 && <span className={`hd-fogo hd-fogo--${linhaFogo} hd-fogo--frente`} aria-hidden="true" style={{ ...lugar(222, 106, 36, 44), '--linha': linhaFogo } as CSSProperties} />}
        {linhaFogo > 0 && <span className="hd-brasas" aria-hidden="true" style={cenario.espada ? lugar(233, 90, 14, 36) : lugar(232, 96, 16, 30)}>{brasas.map((b, i) => <i key={i} style={{ '--dx': `${b.dx * 3}px`, '--t': `${b.t}s`, '--d': `${b.d}s` } as CSSProperties} />)}</span>}
        {pausa > 0 && fogoAceso && <span className="hd-brasas hd-brasas--pausa" aria-hidden="true" style={lugar(222, 60, 36, 70)}>{fagulhas.map((b, i) => <i key={i} style={{ '--dx': `${b.dx * 3}px`, '--t': `${b.t}s`, '--d': `${b.d}s` } as CSSProperties} />)}</span>}
        {/* A fogueira se toca: pausa de jornada opcional (clique, toque ou teclado). Sem botão desenhado: é o próprio fogo. */}
        <button type="button" className="hd-fogueira" style={lugar(218, 100, 44, 54)} aria-pressed={pausa > 0}
          aria-label={fogoAceso ? 'Descansar na fogueira' : 'Sentar na fogueira apagada'} onClick={() => { if (!pausa) avisarFala('esqueleto'); definirPausa((p) => (p ? 0 : Date.now())) }} />
        {/* O mascote, em pé ao lado da fogueira: um comportamento diferente a cada visita (componentes/mascote). */}
        {pausa
          ? <Mascote key={`pausa-${pausa}`} className="hd-mascote" decorativo comportamento={fogoAceso ? 'fogueira' : 'descansando'} falas={fogoAceso ? FALAS_PAUSA_FOGUEIRA : FALAS_PAUSA_APAGADA} style={lugar(262, 96, 46, 66.7)} />
          : descanso
          ? <Mascote key="descanso" className="hd-mascote" decorativo comportamento="fogueira" reacao={festa ? 'comemora2' : null} style={lugar(262, 96, 46, 66.7)} />
          : reacaoAmostra?.id === 'quadro'
            ? <Mascote key={`quadro-${reacaoAmostra.n}`} className="hd-mascote" decorativo comportamento="quadro" style={lugar(262, 96, 46, 66.7)} />
            : <Mascote key="dia" className="hd-mascote" decorativo reacao={reacaoAmostra?.id === 'comemora2' ? 'comemora2' : null} style={lugar(262, 96, 46, 66.7)} />}
        {pausa > 0 && <span className="so-leitor" role="status">{fogoAceso ? 'Pausa na fogueira: o esqueleto senta para se aquecer e o gato ronrona.' : 'A fogueira está apagada; o esqueleto senta um instante ao lado dela.'}</span>}
        {/* O gato (pixel art de scripts/gerar_mascote.py): dorme; um clique e acorda; outro e aparece com a tala. */}
        <button type="button" aria-label="Falar com o gato" tabIndex={semLugar ? -1 : undefined} aria-hidden={semLugar || undefined}
          className={`hd-gato${andando ? ` hd-gato--andando hd-gato--${andando}` : ''}${semLugar ? ' hd-gato--fora' : ''}`}
          style={{ ...lugar(PONTOS_GATO[ponto].x, PONTOS_GATO[ponto].y - 4.5, 36, 27), '--passo': `${DURACAO_PASSO}ms` } as CSSProperties}
          onClick={() => {
            toquesGato.current++
            jaAndou.current = false
            if (toquesGato.current % 6 === 0) { definirFalaGato(null); definirGato('tala'); return }
            definirGato((g) => (g === 'dormindo' || g === 'ronronando' ? 'acordado' : g))
            definirFalaGato(proximaFala('gato', FALAS_GATO))
            avisarFala('gato')
          }}>
          <span className={`hd-gato__sprite${gato === 'acordando' ? ' hd-gato__sprite--uma-vez' : ''}`} aria-hidden="true" style={{ '--sprite': urlCss(folhaGato(gato).src.slice(1)), '--linha': folhaGato(gato).linha, '--linhas': folhaGato(gato).linhas } as CSSProperties} />
        </button>
        {/* O balão abre para o lado livre da cena: nunca por baixo da caixa da missão. */}
        {falaGato && gato !== 'tala' && !andando && <span ref={balaoGato} className={`hd-balao hd-balao--longo hd-balao--gato ${PONTOS_GATO[ponto].x > 250 ? 'hd-balao--esquerda' : 'hd-balao--direita'}`} role="status" onClick={() => definirFalaGato(null)}
          style={{ left: `${((PONTOS_GATO[ponto].x + 18) / 480) * 100}%`, top: `${((PONTOS_GATO[ponto].y - 2) / 200) * 100}%` }}>{falaGato}</span>}
        {gato === 'tala' && !andando && <span ref={balaoGato} role="status" className={`hd-balao ${PONTOS_GATO[ponto].x > 250 ? 'hd-balao--esquerda' : 'hd-balao--direita'}`}
          style={{ left: `${((PONTOS_GATO[ponto].x + 18) / 480) * 100}%`, top: `${((PONTOS_GATO[ponto].y - 2) / 200) * 100}%` }}>Tala ok. Retorno em 3 semanas.</span>}
        <CorujaDoAcampamento key={cenario.id} poleiros={cenario.coruja} />
        <span className={`hd-particulas hd-particulas--${cenario.particulas}`} aria-hidden="true">{particulas.map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, '--t': `${p.t}s`, '--d': `${p.d}s` } as CSSProperties} />)}</span>
      </div>
    </div>
  )
}
