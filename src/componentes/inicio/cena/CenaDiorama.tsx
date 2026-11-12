import { createPortal } from 'react-dom'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { recurso } from '../../../config'
import { Mascote } from '../../mascote/Mascote'
import { folhaGato, type IdLinhaDragao, type IdLinhaGato } from '../../mascote/sprites'
import { DURACAO_DRAGAO, DragaoPixel } from '../../mascote/DragaoPixel'
import { CorujaPixel, type EstadoCoruja } from '../../../biblioteca/sala/CorujaPixel'
import { CONCEITOS_CORUJA, FALAS_ESPADA, FALAS_ESPADA_APAGADA, FALAS_GATO, proximaFala } from '../../mascote/falasBichos'
import { FALAS_PAUSA_APAGADA, FALAS_PAUSA_FOGUEIRA } from '../../mascote/falas'
import { EVENTO_AMOSTRA } from '../AmostraRespondivel'
import { urlCss } from '../../../config'
import { luzNoBicho, mapasDeLuz, type Luz } from '../../mascote/luz'
import { cenarioDaHora, faixaDoCenario, type Cenario } from './cenarios'
import { climaAgora, type Clima } from './clima'
import { Nevasca } from './Nevasca'
import { EVENTO_ROTEIRO, ROTEIROS, tempoDeLer, type Acao, type Bicho, type Roteiro } from './roteiros'
import type { IdComportamento } from '../../mascote/comportamentos'
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
  const bichos = [...heroi.querySelectorAll('.hd-mascote .mascote__corpo, .hd-mascote:not([data-lado="oculto"]) .mascote__balao, .hd-balao:not(.hd-balao--sem-lugar), .hd-gato:not(.hd-gato--fora), .hd-coruja:not(.hd-coruja--fora), .hd-espada__toque, .hd-fogueira')].filter((e) => e !== balao).map(caixa)
  const tampas = [...heroi.querySelectorAll(TAMPAS)].map(caixa)
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
      return tampas.every((t) => cruza(c, t) === 0) && bichos.every((t) => cruza(c, t) === 0)
    })
    for (const [k, [dy, longe]] of tentativas.entries()) { const dx = acha(dy, longe); if (dx !== undefined) return { dx, dy, nivel: k } }
    // A resposta ao toque na espada procura também os intervalos livres entre o título e os bichos.
    if (balao.classList.contains('hd-balao--espada')) {
      for (let distancia = 12; distancia <= v.h; distancia += 12) {
        for (const dy of [-distancia, distancia]) {
          const dx = acha(dy, Infinity)
          if (dx !== undefined) return { dx, dy, nivel: dy > 0 ? 5 : 4 }
        }
      }
    }
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
const avisarFala = (quem: 'gato' | 'coruja' | 'esqueleto' | 'diretor' | 'espada') => window.dispatchEvent(new CustomEvent(EVENTO_FALA, { detail: quem }))
const ouvirFala = (f: (quem: string) => void) => {
  const ouvir = (e: Event) => f(String((e as CustomEvent).detail))
  window.addEventListener(EVENTO_FALA, ouvir)
  return () => window.removeEventListener(EVENTO_FALA, ouvir)
}

const reduzMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const DURACAO_PASSO = 3600
/** O diretor de cena pede à coruja que troque de poleiro voando. */
const EVENTO_VOO = 'hd-coruja-voar'
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
function CorujaDoAcampamento({ poleiros: POLEIROS, luzes, periodo }: { poleiros: Cenario['coruja']; luzes: readonly Luz[]; periodo: Periodo }) {
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
      // Quantos poleiros estão livres agora: o diretor só pede um voo quando há para onde ir.
      el.dataset.livres = String(POLEIROS.filter((_, i) => livreAqui(i)).length)
    }
    escolher()
    const primeira = window.setTimeout(escolher, 600)
    const vez = window.setInterval(() => { if (!document.hidden) escolher() }, 2500)
    window.addEventListener('resize', escolher)
    return () => { window.clearTimeout(primeira); window.clearInterval(vez); window.removeEventListener('resize', escolher) }
  }, [])
  // O diretor de cena pede um voo: ela decola, cruza a cena até outro poleiro livre e pousa.
  const [voo, definirVoo] = useState<'voando' | 'pousando' | null>(null)
  useEffect(() => {
    let fim = 0, pouso = 0
    const voar = () => {
      const el = ref.current, palco = el?.closest('.hd-palco'), heroi = el?.closest('.jn-heroi, .hd-topo'), cena = el?.closest('.hd-cena')
      if (!el || !palco || !heroi || !cena || reduzMovimento()) return
      const P = caixa(palco)
      const outros = [...heroi.querySelectorAll(OUTROS)].map(caixa)
      const livres = POLEIROS.map((pt, i) => ({ i, c: { x: P.x + ((pt.x - CORUJA.w / 2) / 480) * P.w, y: P.y + ((pt.y - CORUJA.h) / 200) * P.h, w: (CORUJA.w / 480) * P.w, h: (CORUJA.h / 200) * P.h } }))
        .filter(({ c }) => livre(c, heroi, cena) && outros.every((o) => cruza(c, o) === 0)).map(({ i }) => i)
      definirPoleiro((atual) => {
        const opcoes = livres.filter((i) => i !== atual)
        if (atual === null || !opcoes.length) return atual
        definirVoo('voando')
        fim = window.setTimeout(() => { definirVoo('pousando'); pouso = window.setTimeout(() => definirVoo(null), 900) }, 1800)
        return opcoes[Math.floor(Math.random() * opcoes.length)]
      })
    }
    window.addEventListener(EVENTO_VOO, voar)
    return () => { window.removeEventListener(EVENTO_VOO, voar); window.clearTimeout(fim); window.clearTimeout(pouso) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const estado: EstadoCoruja = voo ?? (acenou ? 'acenando' : ROTINA_CORUJA[passo])
  useEffect(() => { if (!acenou) return; const t = window.setTimeout(() => definirAcenou(0), 1400); return () => window.clearTimeout(t) }, [acenou])
  useEffect(() => { if (!fala) return; const t = window.setTimeout(() => definirFala(null), 11000); return () => window.clearTimeout(t) }, [fala])
  const pt = POLEIROS[poleiro ?? 0]
  // A luz da cena na coruja: do lado da fogueira (ou do sol, da lua) que estiver mais perto do poleiro.
  const luz = luzNoBicho(pt.x, pt.y - 12, luzes, periodo)
  // A coruja é a sábia: cada toque explica um conceito que cai na prova.
  // Segredo (09/11/2026): três perguntas seguidas e a coruja cochila. Entra no álbum dos bichos.
  const toques = useRef<number[]>([])
  const tocar = () => {
    const agora = Date.now()
    toques.current = [...toques.current.filter((t) => agora - t < 6000), agora]
    definirAcenou((n) => n + 1)
    if (toques.current.length >= 3) {
      toques.current = []
      definirFala('Zzz... três perguntas seguidas. Até a coruja precisa de revisão espaçada.')
      guardarNoAlbum('coruja-cochilo')
    } else definirFala(proximaFala('coruja', CONCEITOS_CORUJA))
    avisarFala('coruja')
  }
  // Um fala de cada vez: se o gato começa a falar, a coruja fecha o balão dela.
  useEffect(() => ouvirFala((quem) => { if (quem !== 'coruja') definirFala(null) }), [])
  return <>
    <button ref={ref} type="button" className={`hd-coruja ${luz.className}` + (voo === 'voando' ? ' hd-coruja--voando' : '') + (poleiro === null ? ' hd-coruja--fora' : '')} onClick={tocar}
      aria-label="Falar com a coruja" tabIndex={poleiro === null ? -1 : undefined} aria-hidden={poleiro === null || undefined}
      style={{ ...lugar(pt.x - CORUJA.w / 2, pt.y - CORUJA.h * 31 / 32, CORUJA.w, CORUJA.h), ...luz.style }}>
      <CorujaPixel key={`${estado}-${acenou}`} estado={estado} />
    </button>
    {fala && poleiro !== null && <span ref={balao} className={`hd-balao hd-balao--longo hd-balao--coruja ${pt.x > 250 ? 'hd-balao--esquerda' : 'hd-balao--direita'}`} role="status"
      onClick={() => definirFala(null)} style={{ left: `${(pt.x / 480) * 100}%`, top: `${((pt.y - CORUJA.h - 1) / 200) * 100}%` }}>{fala}</span>}
  </>
}


/** Os bichos lembram de você: o dia da última visita fica no aparelho (sem servidor). Devolve quantos dias se passaram. */
const CHAVE_VISITA = 'bichos:ultima-visita'
let diasDaVisita: number | null = null
function diasDesdeUltimaVisita(): number {
  if (diasDaVisita !== null) return diasDaVisita
  try {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const antes = Number(localStorage.getItem(CHAVE_VISITA) ?? 0)
    localStorage.setItem(CHAVE_VISITA, String(hoje.getTime()))
    return (diasDaVisita = antes ? Math.round((hoje.getTime() - antes) / 86400000) : 0)
  } catch { return (diasDaVisita = 0) }
}
const POR_EXTENSO = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez']
/** A cena de quem volta depois de alguns dias: o gato contou, a coruja acolhe, o esqueleto acena. */
function roteiroDaVolta(dias: number): Roteiro {
  const n = dias <= 10 ? POR_EXTENSO[dias] : String(dias)
  return { id: 'volta', peso: 0, passos: [
    { quem: 'gato', fala: `${n.charAt(0).toUpperCase()}${n.slice(1)} dias fora. Eu contei. Dormindo, mas contei.`, acao: { tipo: 'gato-pose', id: 'sentado' } },
    { quem: 'coruja', fala: 'Que bom que voltou. Uma revisão curta já reacende tudo.' },
    { quem: 'esqueleto', fala: 'A fogueira guardou brasa para você.', acao: { tipo: 'pose', id: 'acenar' } }] }
}

/** As raridades já vistas (o álbum dos bichos): ficam no aparelho, sem servidor. */
const CHAVE_ALBUM = 'bichos:album'
function guardarNoAlbum(id: string) {
  try {
    const album: string[] = JSON.parse(localStorage.getItem(CHAVE_ALBUM) ?? '[]')
    if (!album.includes(id)) localStorage.setItem(CHAVE_ALBUM, JSON.stringify([...album, id]))
  } catch { /* sem armazenamento */ }
}

type Controles = {
  /** A cena começou ou acabou (o esqueleto fica quieto enquanto o roteiro fala por ele). */
  emCena: (sim: boolean) => void
  pose: (id: IdComportamento | null) => void
  gatoIr: (ate: 'fogo' | 'esqueleto' | 'longe') => void
  gatoPose: (id: IdLinhaGato) => void
  estrela: () => void
}
const SELETOR_BICHO: Record<Bicho, string> = { esqueleto: '.hd-mascote .mascote__corpo', gato: '.hd-gato:not(.hd-gato--fora)', coruja: '.hd-coruja:not(.hd-coruja--fora)' }

/**
 * O diretor de cena (01/11/2026, docs/design/MASCOTES.md): de tempos em tempos sorteia um roteiro (roteiros.ts) com os
 * três bichos e o encena, uma fala de cada vez, num balão que procura lugar livre como os outros. Só roda com a aba
 * à vista e a cena na tela; no celular, bem mais espaçado. Um toque em qualquer bicho interrompe a cena na hora.
 * Com "menos movimento", só as conversas (ninguém anda nem voa).
 */
function DiretorDeCena({ palco, periodo, cenario, repertorio, controles }: { palco: RefObject<HTMLDivElement | null>; periodo: Periodo; cenario: string; repertorio?: readonly IdComportamento[]; controles: Controles }) {
  const [fala, definirFala] = useState<{ quem: Bicho; texto: string; x: number; y: number; n: number } | null>(null)
  const balao = useRef<HTMLSpanElement>(null)
  const ctl = useRef(controles)
  ctl.current = controles
  useLayoutEffect(() => {
    if (!fala) return
    const alvo = palco.current?.querySelector(SELETOR_BICHO[fala.quem])
    encaixarBalao(balao.current, alvo?.getBoundingClientRect().height ?? 40)
  }, [fala, palco])
  useEffect(() => {
    const el = palco.current
    if (!el) return
    let visivel = true, rodando = 0, timer = 0, ultimo = '', falas = 0
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(([e]) => { visivel = e.isIntersecting }) : null
    io?.observe(el)
    const celular = () => typeof matchMedia !== 'undefined' && matchMedia('(max-width: 60rem)').matches
    const esperar = (ms: number, vez: number) => new Promise<boolean>((ok) => window.setTimeout(() => ok(vez === rodando), ms))
    const parar = () => { rodando++; definirFala(null); ctl.current.pose(null); ctl.current.emCena(false) }
    // Alguém tocou num bicho (ou ele falou sozinho): a cena para.
    const tirar = ouvirFala((quem) => { if (quem !== 'diretor') parar() })
    const aVista = (b: Bicho) => !!el.querySelector(SELETOR_BICHO[b])
    const sortear = (): Roteiro | null => {
      const agora = new Date()
      const raridade = Math.random() < 0.4
      const opcoes = ROTEIROS.filter((r) => r.id !== ultimo && (!r.raro || raridade) && (!r.horas || r.horas.includes(periodo)) && (!r.cenarios || r.cenarios.includes(cenario))
        && (!r.quando || r.quando(agora)) && (r.precisa ?? []).every(aVista)
        // No cenário com repertório próprio (o esqueleto sentado no banco do vale), só cenas com as atividades dele.
        && (!repertorio?.length || r.passos.every((p) => p.acao?.tipo !== 'pose' || repertorio.includes(p.acao.id)))
        && (r.passos.every((p) => p.acao?.tipo !== 'coruja-voar') || Number(el.querySelector<HTMLElement>('.hd-coruja')?.dataset.livres ?? 0) >= 2)
        && (!reduzMovimento() || r.passos.every((p) => !p.acao || p.acao.tipo === 'pose' || p.acao.tipo === 'gato-pose')))
      const total = opcoes.reduce((n, r) => n + r.peso, 0)
      let sorte = Math.random() * total
      return opcoes.find((r) => (sorte -= r.peso) < 0) ?? null
    }
    const agir = (a: Acao) => {
      if (a.tipo === 'pose') ctl.current.pose(a.id)
      else if (a.tipo === 'gato-ir') ctl.current.gatoIr(a.ate)
      else if (a.tipo === 'gato-pose') ctl.current.gatoPose(a.id)
      else if (a.tipo === 'coruja-voar') window.dispatchEvent(new Event(EVENTO_VOO))
      else if (a.tipo === 'estrela') ctl.current.estrela()
    }
    const encenar = async (r: Roteiro) => {
      const vez = ++rodando
      ultimo = r.id
      ctl.current.emCena(true)
      if (r.raro) guardarNoAlbum(r.id)
      for (const passo of r.passos) {
        if (passo.acao) agir(passo.acao)
        if (passo.fala && passo.quem) {
          // Quem não está à vista nesta largura de tela só não fala; a cena segue com os outros.
          const alvo = el.querySelector(SELETOR_BICHO[passo.quem])
          if (!alvo) continue
          const P = el.getBoundingClientRect(), b = alvo.getBoundingClientRect()
          avisarFala('diretor')
          definirFala({ quem: passo.quem, texto: passo.fala, x: ((b.left + b.width / 2 - P.left) / P.width) * 100, y: ((b.top - P.top) / P.height) * 100, n: ++falas })
          if (!(await esperar(tempoDeLer(passo.fala), vez))) return
          definirFala(null)
          if (!(await esperar(350, vez))) return
        } else if (!(await esperar(passo.espera ?? 1500, vez))) return
      }
      if (!(await esperar(2500, vez))) return
      ctl.current.pose(null)
      ctl.current.emCena(false)
    }
    // Para testar um roteiro: ?roteiro=monteggia na URL (ou sessionStorage['inicio:roteiro']) e ele entra em 2 s.
    let pedido: string | null = null
    try { pedido = new URLSearchParams(location.hash.split('?')[1] ?? location.search).get('roteiro') ?? sessionStorage.getItem('inicio:roteiro') } catch { /* sem armazenamento */ }
    // Quem volta depois de dois dias ou mais é recebido logo na primeira cena.
    const dias = diasDesdeUltimaVisita()
    const agendar = (primeira: boolean) => {
      const forcado = primeira && pedido ? (pedido === 'volta' ? roteiroDaVolta(4) : ROTEIROS.find((r) => r.id === pedido) ?? null)
        : primeira && dias >= 2 ? roteiroDaVolta(dias) : null
      const [min, max] = forcado ? (pedido ? [2, 2] : [6, 9]) : primeira ? [8, 14] : celular() ? [60, 120] : [35, 70]
      timer = window.setTimeout(() => {
        const ocupado = el.querySelector('.hd-balao, .mascote__balao')
        const r = forcado ?? (!document.hidden && visivel && !ocupado ? sortear() : null)
        if (r) void encenar(r).finally(() => agendar(false))
        else agendar(false)
      }, (min + Math.random() * (max - min)) * 1000)
    }
    agendar(true)
    // Um segredo pediu uma cena (a palavra digitada na página inicial): ela entra na hora, por cima do que estiver.
    const pedirCena = (e: Event) => {
      const r = ROTEIROS.find((x) => x.id === String((e as CustomEvent).detail))
      if (r) { parar(); void encenar(r) }
    }
    window.addEventListener(EVENTO_ROTEIRO, pedirCena)
    return () => { window.clearTimeout(timer); rodando++; io?.disconnect(); tirar(); window.removeEventListener(EVENTO_ROTEIRO, pedirCena) }
  }, [palco, periodo, cenario, repertorio])
  if (!fala) return null
  return <span ref={balao} key={fala.n} className={`hd-balao hd-balao--longo hd-balao--diretor hd-balao--de-${fala.quem} ${fala.x > 52 ? 'hd-balao--esquerda' : 'hd-balao--direita'}`} role="status"
    onClick={() => definirFala(null)} style={{ left: `${fala.x}%`, top: `${fala.y}%` }}>{fala.texto}</span>
}

type PropsCena = {
  linhaFogo: number; periodo: Periodo
  descanso?: boolean
  festa?: number
}

/** A escolha muda só na virada da faixa; o palco novo reinicia bichos e balões sem coordenadas antigas. */
/** Largura do quadro do dragão na pintura (px da arte de 480 x 200; o quadro é 2:1, pés a 93% da altura, corpo a 73% da largura). */
const DRAGAO_W = 132

/**
 * A visita do dragão (Tales, 10/11/2026: "eventualmente o dragão aparece, mas não sempre"): numa visita em cada cinco
 * às cenas que têm lugar para ele, o dragão do tesouro chega voando pelo alto, pousa no chão livre, olha em volta,
 * sopra fogo na direção da fogueira, boceja e vai embora. Um toque e ele sopra de novo. Com "menos movimento" não
 * vem. Prévia: ?dragao=1 no endereço.
 */
function DragaoDaCena({ ponto }: { ponto: { x: number; y: number } }) {
  const [fase, definirFase] = useState<'longe' | 'chegando' | 'pousado' | 'saindo'>('longe')
  const [linha, definirLinha] = useState<IdLinhaDragao>('voando')
  const relogios = useRef<number[]>([])
  useEffect(() => {
    const depois = (f: () => void, ms: number) => { relogios.current.push(window.setTimeout(f, ms)) }
    let forcado = false
    try { forcado = /[?&]dragao=1/.test(location.search + location.hash) } catch { /* sem janela */ }
    const parado = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (parado || !(forcado || Math.random() < 0.2)) return
    let t = forcado ? 1200 : 6000
    depois(() => { definirFase('chegando'); definirLinha('voando') }, t); t += 1700
    depois(() => { definirFase('pousado'); definirLinha('pousando') }, t); t += DURACAO_DRAGAO.pousando * 1000
    depois(() => {
      definirLinha('parado')
      try {
        const album: string[] = JSON.parse(localStorage.getItem('bichos:album') ?? '[]')
        if (!album.includes('dragao-praca')) localStorage.setItem('bichos:album', JSON.stringify([...album, 'dragao-praca']))
      } catch { /* sem armazenamento */ }
    }, t); t += 1600
    for (const gesto of ['olhando', 'fogo', 'bocejando', 'olhando', 'rugindo'] as const) {
      const dur = DURACAO_DRAGAO[gesto] * 1000
      depois(() => definirLinha((l) => (l === 'parado' ? gesto : l)), t)
      depois(() => definirLinha((l) => (l === gesto ? 'parado' : l)), t + dur + 150)
      t += dur + 2600
    }
    depois(() => definirLinha('decolando'), t); t += DURACAO_DRAGAO.decolando * 1000
    depois(() => { definirFase('saindo'); definirLinha('voando') }, t); t += 1700
    depois(() => definirFase('longe'), t)
    const todos = relogios.current
    return () => todos.forEach((r) => window.clearTimeout(r))
  }, [])
  const tocar = () => {
    if (fase !== 'pousado' || linha !== 'parado') return
    definirLinha('fogo')
    relogios.current.push(window.setTimeout(() => definirLinha((l) => (l === 'fogo' ? 'parado' : l)), DURACAO_DRAGAO.fogo * 1000 + 200))
  }
  if (fase === 'longe') return null
  return (
    <span className={`hd-dragao hd-dragao--${fase}`} style={{ left: `${((ponto.x - DRAGAO_W * 0.732) / 480) * 100}%`, top: `${((ponto.y - DRAGAO_W * 0.464) / 200) * 100}%`, width: `${(DRAGAO_W / 480) * 100}%` }}>
      <DragaoPixel estado={linha} />
      <button type="button" className="hd-dragao__toque" onClick={tocar} aria-label="O dragão do tesouro: tocar para ele soltar fogo" />
    </span>
  )
}

export function CenaDiorama(props: PropsCena) {
  const [cenario, definirCenario] = useState(() => cenarioDaHora())
  useEffect(() => {
    let timer = 0
    const atualizar = () => {
      window.clearTimeout(timer)
      const agora = new Date()
      if (!document.hidden) definirCenario(cenarioDaHora(agora))
      timer = window.setTimeout(atualizar, Math.max(100, faixaDoCenario(agora).proxima - agora.getTime()))
    }
    atualizar()
    const voltar = () => { if (!document.hidden) atualizar() }
    window.addEventListener('focus', voltar)
    document.addEventListener('visibilitychange', voltar)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('focus', voltar)
      document.removeEventListener('visibilitychange', voltar)
    }
  }, [])
  return <CenaNoPalco key={cenario.id} {...props} cenario={cenario} />
}

function CenaNoPalco({ linhaFogo, periodo, descanso = false, festa = 0, cenario }: PropsCena & { cenario: Cenario }) {
  const [fogoX, fogoY] = cenario.fogo ?? [240, 146]
  const mascote = cenario.mascote ?? { x: 262, y: 96, w: 46, h: 66.7 }
  const lugarFogo = (x: number, y: number, w: number, h: number) => lugar(x + fogoX - 240, y + fogoY - 146, w, h)
  const [reacaoAmostra, definirReacaoAmostra] = useState<{ id: 'comemora2' | 'quadro'; n: number } | null>(null)
  // A pausa na fogueira (01/11/2026): um toque no fogo e o esqueleto senta para se aquecer, a luz esquenta e o gato
  // ronrona. É só um respiro: não conta dia, não mexe na sequência e acaba sozinha (ou com outro toque no fogo).
  const [pausa, definirPausa] = useState(0)
  useEffect(() => { if (!pausa) return; const t = window.setTimeout(() => definirPausa(0), PAUSA_MS); return () => window.clearTimeout(t) }, [pausa])
  const fogoAceso = linhaFogo > 0
  const comEspada = cenario.espada !== false
  // A luz que a chama joga no aço tem a cor dela: laranja até o Fogaréu, azul na Chama azul, violeta na arcana.
  const luzEspada = linhaFogo === 5 ? '120, 185, 255' : linhaFogo === 6 ? '195, 130, 255' : '255, 165, 75'
  const PONTOS_GATO = cenario.gato
  const repouso: IdLinhaGato = descanso || (pausa && fogoAceso) ? 'ronronando' : 'dormindo'
  const poseDoPonto = (i: number): IdLinhaGato => (PONTOS_GATO[i].pose === 'repouso' ? repouso : PONTOS_GATO[i].pose)
  const [gato, definirGato] = useState<IdLinhaGato>(() => cenario.posePadrao ? poseDoPonto(0) : repouso)
  const [ponto, definirPonto] = useState(0)
  const [andando, definirAndando] = useState<'direita' | 'esquerda' | null>(null)
  const [semLugar, definirSemLugar] = useState(false)
  // A espada (09/11/2026, pedido do Tales: referência a Dark Souls, e "tem que aparecer muito fácil"). O primeiro
  // toque já traz a faixa dourada atravessando a tela (entra no álbum); os outros sempre falam, e a cada 4 a faixa volta.
  const [falaEspada, definirFalaEspada] = useState<string | null>(null)
  const [faiscas, definirFaiscas] = useState(0)
  const [consolidado, definirConsolidado] = useState(0)
  const toquesEspada = useRef<number[]>([])
  const balaoEspada = useRef<HTMLSpanElement>(null)
  useEffect(() => ouvirFala((quem) => { if (quem !== 'espada') definirFalaEspada(null) }), [])
  useLayoutEffect(() => {
    if (!falaEspada) return
    encaixarBalao(balaoEspada.current, 30)
    // Recalcula depois que a fala automática do mascote sai do DOM.
    const quadro = requestAnimationFrame(() => encaixarBalao(balaoEspada.current, 30))
    return () => cancelAnimationFrame(quadro)
  }, [falaEspada])
  useEffect(() => { if (!falaEspada) return; const t = window.setTimeout(() => definirFalaEspada(null), tempoDeLer(falaEspada)); return () => window.clearTimeout(t) }, [falaEspada])
  useEffect(() => { if (!consolidado) return; const t = window.setTimeout(() => definirConsolidado(0), 4200); return () => window.clearTimeout(t) }, [consolidado])
  const tocarEspada = () => {
    const agora = Date.now()
    toquesEspada.current = [...toquesEspada.current, agora]
    definirFaiscas(agora)
    avisarFala('espada')
    if (toquesEspada.current.length % 4 === 1) {
      definirFalaEspada(null)
      definirConsolidado(agora)
      guardarNoAlbum('chama-consolidada')
      return
    }
    definirFalaEspada(fogoAceso ? proximaFala('espada', FALAS_ESPADA) : proximaFala('espada-apagada', FALAS_ESPADA_APAGADA))
  }
  // Segredos de teclado na página inicial (fora de campos de texto): palavras que os bichos entendem e o código antigo
  // dos videogames. Nenhum aparece escrito no site; o álbum dos bichos só dá pistas.
  useEffect(() => {
    let digitado = ''
    let setas: string[] = []
    const CODIGO = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']
    const cena = (id: string) => window.dispatchEvent(new CustomEvent(EVENTO_ROTEIRO, { detail: id }))
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable="true"]')) return
      const k = e.key.toLowerCase()
      setas = [...setas, k].slice(-CODIGO.length)
      if (setas.join() === CODIGO.join()) { setas = []; cena('codigo-antigo'); return }
      if (e.key.length !== 1) return
      digitado = (digitado + k).slice(-12)
      if (digitado.endsWith('louvaosol')) { digitado = ''; cena('louva-o-sol') }
      else if (digitado.endsWith('estus')) { digitado = ''; cena('estus') }
      else if (digitado.endsWith('miau')) {
        digitado = ''
        guardarNoAlbum('miau')
        definirGato((g) => (g === 'dormindo' || g === 'ronronando' ? 'acordado' : g))
        definirFalaGato('Miau? Você fala gato? Então já sabe que eu não vou levantar.')
        avisarFala('gato')
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [])
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
        const bichos = [...heroi.querySelectorAll('.hd-gato:not(.hd-gato--fora), .hd-coruja:not(.hd-coruja--fora), .hd-balao:not(.hd-balao--sem-lugar), .hd-espada__toque, .hd-fogueira')].map(caixa)
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

  // Sem parallax com o mouse (Tales, 02/11/2026: a arte "dava uma sambada" quando o mouse passava; a cena fica parada).

  const particulas = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 70 + 5, t: 6 + (i % 5) * 1.6, d: -((i * 1.7) % 8) })), [])
  const brasas = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ dx: ((i * 29) % 13) - 6, t: 1.8 + (i % 4) * 0.5, d: -((i * 0.7) % 3) })), [])
  // Na pausa, a fogueira respira mais alto: uma revoada de fagulhas sobe mais longe e mais devagar.
  const fagulhas = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ dx: ((i * 37) % 23) - 11, t: 2.6 + (i % 5) * 0.55, d: -((i * 0.43) % 3.4) })), [])
  const imagem = (larg: number, arquivo = cenario.arquivo) => recurso(`pixel/inicio/${arquivo}-${periodo}${larg === 960 ? '-960' : ''}.webp`)
  // O tempo (clima.ts): igual para todos, conferido a cada meio minuto. A pintura nevada entra devagar por cima.
  const [clima, definirClima] = useState<Clima>(() => climaAgora())
  const [transicao, definirTransicao] = useState(false)
  useEffect(() => {
    if (!cenario.neve) return
    const t = window.setInterval(() => { if (!document.hidden) definirClima(climaAgora()) }, 30_000)
    // Na primeira pintura a neve já está (ou não está) lá; só as mudanças com a página aberta são devagar.
    const liga = window.setTimeout(() => definirTransicao(true), 1500)
    return () => { window.clearInterval(t); window.clearTimeout(liga) }
  }, [cenario.neve])
  const nevadoArquivo = cenario.neve?.arquivo
  const coberto = !!nevadoArquivo && clima.coberto
  // As luzes da cena para os bichos (componentes/mascote/luz.ts): a fogueira, mais forte na pausa, e o céu da hora.
  const luzes: Luz[] = [
    { x: fogoX, y: fogoY - 6, forca: fogoAceso ? (pausa ? 1.15 : 0.95) : 0.06, alcance: 175, tipo: linhaFogo === 5 ? 'azul' : linhaFogo === 6 ? 'arcana' : 'fogo' },
    periodo === 'noite' ? { x: 400, y: 0, forca: 0.32, alcance: 620, tipo: 'lua' } : { x: 470, y: periodo === 'tarde' ? 70 : 10, forca: periodo === 'tarde' ? 0.42 : 0.36, alcance: 620, tipo: 'sol' },
  ]
  const luzMascote = luzNoBicho(mascote.x + mascote.w / 2, mascote.y + mascote.h / 2, luzes, periodo)
  const classeMascote = `hd-mascote ${luzMascote.className} bicho-sombra`
  const estiloMascote = { ...lugar(mascote.x, mascote.y, mascote.w, mascote.h), ...luzMascote.style }
  const luzGato = luzNoBicho(PONTOS_GATO[ponto].x + 18, PONTOS_GATO[ponto].y + 9, luzes, periodo)

  // O diretor de cena: a atividade que ele pede ao esqueleto, a estrela cadente e o gato dourado (uma visita em 150).
  // Um contador (e não o relógio) dá a cada pedido do diretor uma chave nova, mesmo com o relógio parado.
  const contaDiretor = useRef(0)
  const [poseDiretor, definirPoseDiretor] = useState<{ id: IdComportamento; n: number } | null>(null)
  const [emCena, definirEmCena] = useState(false)
  const [estrela, definirEstrela] = useState(0)
  useEffect(() => { if (!estrela) return; const t = window.setTimeout(() => definirEstrela(0), 1600); return () => window.clearTimeout(t) }, [estrela])
  const [dourado] = useState(() => Math.random() < 1 / 10)
  useEffect(() => { if (dourado) guardarNoAlbum('gato-dourado') }, [dourado])
  const levarGato = (ate: 'fogo' | 'esqueleto' | 'longe') => {
    const { gato: g, ponto: atual } = agora.current
    if (reduzMovimento() || g === 'tala' || g === 'andando' || g === 'acordando') return
    const alvo = ate === 'fogo' ? fogoX : mascote.x + mascote.w / 2
    const opcoes = pontosLivres().filter((i) => i !== atual)
    if (!opcoes.length) return
    const perto = (i: number) => Math.abs(PONTOS_GATO[i].x + 18 - alvo)
    const destino = [...opcoes].sort((a, b) => (ate === 'longe' ? perto(b) - perto(a) : perto(a) - perto(b)))[0]
    if (ate !== 'longe' && perto(destino) >= perto(atual)) return
    definirAndando(PONTOS_GATO[destino].x < PONTOS_GATO[atual].x ? 'esquerda' : 'direita')
    definirGato('andando')
    definirPonto(destino)
    window.setTimeout(() => { definirAndando(null); definirGato((x) => (x === 'andando' ? 'acordado' : x)) }, DURACAO_PASSO)
  }
  const controles: Controles = {
    emCena: definirEmCena,
    pose: (id) => definirPoseDiretor(id ? { id, n: ++contaDiretor.current } : null),
    gatoIr: levarGato,
    gatoPose: (id) => {
      definirGato((g) => (g === 'tala' || g === 'andando' ? g : id))
      // Comemorar e brincar são de momento: depois de um tempo ele volta a se acomodar no lugar.
      if (['comemorando', 'brincando', 'pulando', 'assustado', 'lambendo', 'cacando', 'derretido'].includes(id)) window.setTimeout(() => definirGato((g) => (g === id ? poseDoPonto(agora.current.ponto) : g)), 6000)
    },
    estrela: () => definirEstrela(++contaDiretor.current),
  }

  const permitirFalaMascote = !emCena && !falaEspada && !consolidado
  return (
    // Só os bichos e a fogueira são alcançáveis (teclado e leitor de tela); o resto da arte é enfeite (aria-hidden).
    <div className="hd-cena">
      <div ref={palco} className={`hd-palco hd-palco--${periodo} hd-palco--${cenario.id}${pausa && fogoAceso ? ' hd-palco--pausa' : ''}${clima.nevando && cenario.neve ? ' hd-palco--nevando' : ''}`}>
        <img className="hd-palco__fundo" src={imagem(1440)} srcSet={`${imagem(960)} 960w, ${imagem(1440)} 1440w`} sizes="(max-width: 60rem) 170vw, 100vw"
          width={1440} height={600} alt="" decoding="async" fetchPriority="high" />
        {/* A neve no chão (clima.ts): a versão nevada da pintura, que aparece devagar quando a nevasca cobre o cenário. */}
        {nevadoArquivo && (coberto || transicao) && <img className={`hd-palco__fundo hd-palco__nevado${coberto ? ' hd-palco__nevado--sim' : ''}${transicao ? ' hd-palco__nevado--devagar' : ''}`}
          src={imagem(1440, nevadoArquivo)} srcSet={`${imagem(960, nevadoArquivo)} 960w, ${imagem(1440, nevadoArquivo)} 1440w`} sizes="(max-width: 60rem) 170vw, 100vw"
          width={1440} height={600} alt="" decoding="async" loading={coberto ? 'eager' : 'lazy'} />}
        {/* O trenzinho de montanha que cruza o fundo do vale de tempos em tempos (scripts/cenarios/inicio_vale.py). */}
        {cenario.trem && <span className="hd-trem" aria-hidden="true" style={{
          ...lugar(cenario.trem.de[0], Math.min(cenario.trem.de[1], cenario.trem.ate[1]) - 8, cenario.trem.ate[0] - cenario.trem.de[0], Math.abs(cenario.trem.ate[1] - cenario.trem.de[1]) + 9),
          '--sprite-trem': urlCss('pixel/inicio/trem-vale.png'), '--linha-trem': periodo === 'noite' || clima.nevando ? 1 : 0,
          '--subida': `${((cenario.trem.de[1] - cenario.trem.ate[1]) / (Math.abs(cenario.trem.ate[1] - cenario.trem.de[1]) + 9)) * 100}%`,
        } as CSSProperties}><i /></span>}
        <span className="hd-luz-fogo" aria-hidden="true" style={{ left: `${(fogoX / 480) * 100}%`, top: `${((fogoY - 6) / 200) * 100}%`, '--forca': linhaFogo === 0 ? 0.2 : 1 } as CSSProperties} />
        {/* A pausa vira um quadro de cinema: a borda do acampamento escurece e um calor âmbar respira em volta do fogo. */}
        <span className="hd-vinheta" aria-hidden="true" />
        <span className="hd-calor" aria-hidden="true" style={lugarFogo(130, 50, 220, 150)} />
        <span className={`hd-fogo hd-fogo--${linhaFogo}`} aria-hidden="true" style={{ ...lugarFogo(220, 104, 40, 48), '--linha': linhaFogo } as CSSProperties} />
        {/* Ray tracing na espada (Tales, 01/11/2026): os raios de luz que sobem do fogo e a aura em volta da lâmina, atrás
            dela, na cor da chama do momento; o cintilar na guarda vem depois, por cima (InicioHd.css, .hd-espada__*). */}
        {comEspada && fogoAceso && <span className="hd-espada__raios" aria-hidden="true" style={{ ...lugarFogo(206, 58, 68, 92), '--luz-espada': luzEspada } as CSSProperties} />}
        {comEspada && fogoAceso && <span className="hd-espada__aura" aria-hidden="true" style={{ ...lugarFogo(226, 100, 28, 54), '--luz-espada': luzEspada } as CSSProperties} />}
        {/* A marca do site: a espada fincada na fogueira (scripts/sprites/espada_fogueira.py), em todos os cenários. */}
        {comEspada && <span className={`hd-espada${linhaFogo === 0 ? ' hd-espada--apagada' : ''}`} aria-hidden="true" style={{ ...lugarFogo(234, 109, 12, 40), '--sprite-espada': urlCss('pixel/inicio/espada.png'), '--luz-espada': luzEspada } as CSSProperties} />}
        {comEspada && fogoAceso && <span className="hd-espada__brilho" aria-hidden="true" style={{ ...lugarFogo(235, 111, 10, 10), '--luz-espada': luzEspada } as CSSProperties} />}
        {/* Fogo e espada juntos (01/11/2026, "tipo Dark Souls"): uma segunda chama, só a parte de baixo, passa na frente
            da lâmina; a luz da fogueira e a brasa ficam recortadas no desenho da espada (InicioHd.css, .hd-espada). */}
        {comEspada && linhaFogo > 0 && <span className={`hd-fogo hd-fogo--${linhaFogo} hd-fogo--frente`} aria-hidden="true" style={{ ...lugarFogo(222, 106, 36, 44), '--linha': linhaFogo } as CSSProperties} />}
        {linhaFogo > 0 && <span className="hd-brasas" aria-hidden="true" style={comEspada ? lugarFogo(233, 90, 14, 36) : lugarFogo(232, 96, 16, 30)}>{brasas.map((b, i) => <i key={i} style={{ '--dx': `${b.dx * 3}px`, '--t': `${b.t}s`, '--d': `${b.d}s` } as CSSProperties} />)}</span>}
        {pausa > 0 && fogoAceso && <span className="hd-brasas hd-brasas--pausa" aria-hidden="true" style={lugarFogo(222, 60, 36, 70)}>{fagulhas.map((b, i) => <i key={i} style={{ '--dx': `${b.dx * 3}px`, '--t': `${b.t}s`, '--d': `${b.d}s` } as CSSProperties} />)}</span>}
        {/* A fogueira se toca: pausa de jornada opcional (clique, toque ou teclado). Sem botão desenhado: é o próprio fogo. */}
        <button type="button" className="hd-fogueira" style={lugarFogo(218, 100, 44, 54)} aria-pressed={pausa > 0}
          aria-label={fogoAceso ? 'Descansar na fogueira' : 'Sentar na fogueira apagada'} onClick={() => { if (!pausa) avisarFala('esqueleto'); definirPausa((p) => (p ? 0 : Date.now())) }} />
        {/* A espada se toca pelo punho e pela parte de cima da lâmina; o resto da fogueira continua sendo a pausa. */}
        {comEspada && <button type="button" className="hd-espada__toque" style={lugarFogo(229, 104, 22, 22)} aria-label="Tocar na espada fincada na fogueira" onClick={tocarEspada} />}
        {comEspada && faiscas > 0 && !reduzMovimento() && <span key={faiscas} className="hd-espada__faiscas" aria-hidden="true" style={lugarFogo(232, 104, 16, 16)}>{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ '--a': `${i * 60 + 20}deg` } as CSSProperties} />)}</span>}
        {falaEspada && <span ref={balaoEspada} className="hd-balao hd-balao--longo hd-balao--espada" role="status" onClick={() => definirFalaEspada(null)}
          style={{ left: `${(fogoX / 480) * 100}%`, top: `${((fogoY - 43) / 200) * 100}%` }}>{falaEspada}</span>}
        {consolidado > 0 && createPortal(<span key={consolidado} className="hd-consolidado" role="status"><span>Conhecimento consolidado</span></span>, document.body)}
        {/* O mascote, em pé ao lado da fogueira: um comportamento diferente a cada visita (componentes/mascote). */}
        {pausa
          ? <Mascote key={`pausa-${pausa}`} className={classeMascote} decorativo falar={permitirFalaMascote} comportamento={fogoAceso ? 'fogueira' : 'descansando'} falas={fogoAceso ? FALAS_PAUSA_FOGUEIRA : FALAS_PAUSA_APAGADA} style={estiloMascote} />
          : poseDiretor
          ? <Mascote key={`diretor-${poseDiretor.n}`} className={classeMascote} decorativo falar={false} comportamento={poseDiretor.id} style={estiloMascote} />
          : descanso
          ? <Mascote key="descanso" className={classeMascote} decorativo falar={permitirFalaMascote} comportamento="fogueira" reacao={festa ? 'comemora2' : null} style={estiloMascote} />
          : reacaoAmostra?.id === 'quadro'
            ? <Mascote key={`quadro-${reacaoAmostra.n}`} className={classeMascote} decorativo falar={permitirFalaMascote} comportamento="quadro" style={estiloMascote} />
            : <Mascote key="dia" comportamento={cenario.posePadrao} repertorio={cenario.repertorio} className={classeMascote} decorativo falar={permitirFalaMascote} reacao={reacaoAmostra?.id === 'comemora2' ? 'comemora2' : null} style={estiloMascote} />}
        {pausa > 0 && <span className="so-leitor" role="status">{fogoAceso ? 'Pausa na fogueira: o esqueleto senta para se aquecer e o gato ronrona.' : 'A fogueira está apagada; o esqueleto senta um instante ao lado dela.'}</span>}
        {/* O gato (pixel art de scripts/gerar_mascote.py): dorme; um clique e acorda; outro e aparece com a tala. */}
        <button type="button" aria-label="Falar com o gato" tabIndex={semLugar ? -1 : undefined} aria-hidden={semLugar || undefined}
          className={`hd-gato ${luzGato.className}${dourado ? ' hd-gato--dourado' : ''}${andando ? ` hd-gato--andando hd-gato--${andando}` : ''}${semLugar ? ' hd-gato--fora' : ''}`}
          style={{ ...lugar(PONTOS_GATO[ponto].x, PONTOS_GATO[ponto].y - 4.5, 36, 27), '--passo': `${DURACAO_PASSO}ms`, ...luzGato.style } as CSSProperties}
          onClick={() => {
            toquesGato.current++
            jaAndou.current = false
            if (toquesGato.current % 4 === 0) { definirFalaGato(null); definirGato('tala'); return }
            definirGato((g) => (g === 'dormindo' || g === 'ronronando' ? 'acordado' : g))
            definirFalaGato(dourado && toquesGato.current === 1 ? 'Hoje acordei dourado. Não se acostume.' : proximaFala('gato', FALAS_GATO))
            avisarFala('gato')
          }}>
          <span className="bicho-sombra__chao" aria-hidden="true" />
          <span className={`hd-gato__sprite${gato === 'acordando' ? ' hd-gato__sprite--uma-vez' : ''}`} aria-hidden="true" style={{ '--sprite': urlCss(folhaGato(gato).src.slice(1)), '--linha': folhaGato(gato).linha, '--linhas': folhaGato(gato).linhas, ...mapasDeLuz(folhaGato(gato).src) } as CSSProperties} />
        </button>
        {/* O balão abre para o lado livre da cena: nunca por baixo da caixa da missão. */}
        {falaGato && gato !== 'tala' && !andando && <span ref={balaoGato} className={`hd-balao hd-balao--longo hd-balao--gato ${PONTOS_GATO[ponto].x > 250 ? 'hd-balao--esquerda' : 'hd-balao--direita'}`} role="status" onClick={() => definirFalaGato(null)}
          style={{ left: `${((PONTOS_GATO[ponto].x + 18) / 480) * 100}%`, top: `${((PONTOS_GATO[ponto].y - 2) / 200) * 100}%` }}>{falaGato}</span>}
        {gato === 'tala' && !andando && <span ref={balaoGato} role="status" className={`hd-balao ${PONTOS_GATO[ponto].x > 250 ? 'hd-balao--esquerda' : 'hd-balao--direita'}`}
          style={{ left: `${((PONTOS_GATO[ponto].x + 18) / 480) * 100}%`, top: `${((PONTOS_GATO[ponto].y - 2) / 200) * 100}%` }}>Tala ok. Retorno em 3 semanas.</span>}
        {estrela > 0 && <span className="hd-estrela-cadente" aria-hidden="true" />}
        <DiretorDeCena palco={palco} periodo={periodo} cenario={cenario.id} repertorio={cenario.repertorio} controles={controles} />
        <CorujaDoAcampamento key={cenario.id} poleiros={cenario.coruja} luzes={luzes} periodo={periodo} />
        {cenario.dragao && <DragaoDaCena key={`dragao-${cenario.id}`} ponto={cenario.dragao} />}
        {/* Nos cenários com tempo (clima.ts), a neve só cai durante a nevasca; com tempo firme, o céu fica limpo. */}
        {!(cenario.neve && cenario.particulas === 'neve' && !clima.nevando) && <span className={`hd-particulas hd-particulas--${cenario.particulas}`} aria-hidden="true">{particulas.map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, '--t': `${p.t}s`, '--d': `${p.d}s` } as CSSProperties} />)}</span>}
        {cenario.neve && clima.nevando && <Nevasca intensidade={clima.intensidade} />}
      </div>
    </div>
  )
}
