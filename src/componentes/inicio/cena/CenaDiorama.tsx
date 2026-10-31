import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { recurso } from '../../../config'
import { Mascote } from '../../mascote/Mascote'
import { folhaGato, type IdLinhaGato } from '../../mascote/sprites'
import { EVENTO_AMOSTRA } from '../AmostraRespondivel'
import { urlCss } from '../../../config'
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

/** Os cantos do chão por onde o gato passeia (pixels da arte) e a pose em cada um; "repouso" dorme ou ronrona. */
const PONTOS_GATO = [
  { x: 219, y: 150, pose: 'repouso' },
  { x: 176, y: 166, pose: 'sentado' },
  { x: 256, y: 170, pose: 'observando' },
  { x: 300, y: 165, pose: 'fogueira' },
  { x: 322, y: 150, pose: 'sentado' },
  { x: 236, y: 168, pose: 'repouso' },
] as const
const DURACAO_PASSO = 3600

export function CenaDiorama({ linhaFogo, periodo, descanso = false, festa = 0 }: {
  linhaFogo: number; periodo: Periodo
  /** Meta do dia cumprida (31/10/2026): o esqueleto senta para se aquecer na fogueira e o gato ronrona. */
  descanso?: boolean
  /** Muda de valor para disparar a comemoração curta da meta cumprida (esqueleto pula e o gato comemora). */
  festa?: number
}) {
  const repouso: IdLinhaGato = descanso ? 'ronronando' : 'dormindo'
  const poseDoPonto = (i: number): IdLinhaGato => (PONTOS_GATO[i].pose === 'repouso' ? repouso : PONTOS_GATO[i].pose)
  const [gato, definirGato] = useState<IdLinhaGato>(repouso)
  const [ponto, definirPonto] = useState(0)
  const [andando, definirAndando] = useState<'direita' | 'esquerda' | null>(null)
  const [semLugar, definirSemLugar] = useState(false)
  const palco = useRef<HTMLDivElement>(null)
  const espera = useRef(0)
  const agora = useRef({ gato, ponto })
  agora.current = { gato, ponto }

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
      for (const lado of ['cima', 'esquerda', 'direita', 'baixo']) {
        mascote.dataset.lado = lado
        if (livre(caixa(balao), heroi, cena)) return
      }
      // Sem lugar livre (tela muito estreita), a fala não aparece: melhor do que cortada ou por baixo de um texto.
      mascote.dataset.lado = 'oculto'
    }
    const observador = new MutationObserver(posicionar)
    observador.observe(mascote, { childList: true, subtree: true, characterData: true })
    const medidor = new ResizeObserver(posicionar)
    medidor.observe(heroi); heroi.querySelectorAll(TAMPAS).forEach((e) => medidor.observe(e))
    return () => { observador.disconnect(); medidor.disconnect() }
  })

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
  const [reacaoAmostra, definirReacaoAmostra] = useState<{ id: 'comemora2' | 'quadro'; n: number } | null>(null)
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
        if (g !== 'tala' && g !== 'comemorando' && g !== 'acordando') {
          const opcoes = pontosLivres().filter((i) => i !== atual)
          if (!opcoes.length) { passear(); return }
          const destino = opcoes[Math.floor(Math.random() * opcoes.length)]
          definirAndando(PONTOS_GATO[destino].x < PONTOS_GATO[atual].x ? 'esquerda' : 'direita')
          definirGato('andando')
          definirPonto(destino)
          chegada = window.setTimeout(() => { definirAndando(null); definirGato(poseDoPonto(destino)) }, DURACAO_PASSO)
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
  const imagem = (larg: number) => recurso(`pixel/inicio/cena-${periodo}${larg === 960 ? '-960' : ''}.webp`)

  return (
    <div className="hd-cena" aria-hidden="true">
      <div ref={palco} className={`hd-palco hd-palco--${periodo}`}>
        <img className="hd-palco__fundo" src={imagem(1440)} srcSet={`${imagem(960)} 960w, ${imagem(1440)} 1440w`} sizes="(max-width: 60rem) 170vw, 100vw"
          width={1440} height={600} alt="" decoding="async" fetchPriority="high" />
        <span className="hd-luz-fogo" style={{ left: `${(240 / 480) * 100}%`, top: `${(140 / 200) * 100}%`, '--forca': linhaFogo === 0 ? 0.2 : 1 } as CSSProperties} />
        <span className={`hd-fogo hd-fogo--${linhaFogo}`} style={{ ...lugar(220, 104, 40, 48), '--linha': linhaFogo } as CSSProperties} />
        {linhaFogo > 0 && <span className="hd-brasas" style={lugar(232, 96, 16, 30)}>{brasas.map((b, i) => <i key={i} style={{ '--dx': `${b.dx * 3}px`, '--t': `${b.t}s`, '--d': `${b.d}s` } as CSSProperties} />)}</span>}
        {/* O mascote, em pé ao lado da fogueira: um comportamento diferente a cada visita (componentes/mascote). */}
        {descanso
          ? <Mascote key="descanso" className="hd-mascote" comportamento="fogueira" reacao={festa ? 'comemora2' : null} style={lugar(262, 96, 46, 66.7)} />
          : reacaoAmostra?.id === 'quadro'
            ? <Mascote key={`quadro-${reacaoAmostra.n}`} className="hd-mascote" comportamento="quadro" style={lugar(262, 96, 46, 66.7)} />
            : <Mascote key="dia" className="hd-mascote" reacao={reacaoAmostra?.id === 'comemora2' ? 'comemora2' : null} style={lugar(262, 96, 46, 66.7)} />}
        {/* O gato (pixel art de scripts/gerar_mascote.py): dorme; um clique e acorda; outro e aparece com a tala. */}
        <button type="button" tabIndex={-1} className={`hd-gato${andando ? ` hd-gato--andando hd-gato--${andando}` : ''}${semLugar ? ' hd-gato--fora' : ''}`}
          style={{ ...lugar(PONTOS_GATO[ponto].x, PONTOS_GATO[ponto].y - 4.5, 36, 27), '--passo': `${DURACAO_PASSO}ms` } as CSSProperties}
          onClick={() => definirGato((g) => (g === 'tala' ? 'tala' : g === 'dormindo' || g === 'ronronando' ? 'acordado' : 'tala'))}>
          <span className={`hd-gato__sprite${gato === 'acordando' ? ' hd-gato__sprite--uma-vez' : ''}`} style={{ '--sprite': urlCss(folhaGato(gato).src.slice(1)), '--linha': folhaGato(gato).linha, '--linhas': folhaGato(gato).linhas } as CSSProperties} />
        </button>
        {/* O balão abre para o lado livre da cena: nunca por baixo da caixa da missão. */}
        {gato === 'tala' && <span className={`hd-balao ${PONTOS_GATO[ponto].x > 250 ? 'hd-balao--esquerda' : 'hd-balao--direita'}`}
          style={{ left: `${((PONTOS_GATO[ponto].x + (PONTOS_GATO[ponto].x > 250 ? 4 : 30)) / 480) * 100}%`, top: `${((PONTOS_GATO[ponto].y - 2) / 200) * 100}%` }}>Tala ok. Retorno em 3 semanas.</span>}
        <span className="hd-particulas">{particulas.map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, '--t': `${p.t}s`, '--d': `${p.d}s` } as CSSProperties} />)}</span>
      </div>
    </div>
  )
}
