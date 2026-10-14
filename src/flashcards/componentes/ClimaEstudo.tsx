/**
 * Humor da Biblioteca (pedido do Tales, 14/10/2026): o clima da sessão de
 * estudo muda conforme a pessoa acerta, erra ou hesita.
 *
 *   3 "Sabia" seguidos   o flashcard pega fogo: aura de chamas em volta dele
 *                        (escarlate); 6, fogo azul; 9, chama arcana (ver AuraDeFogo)
 *   20 seguidos          Glória da Biblioteca: aura de ouro e tudo brilha
 *   3 erros seguidos     começa a chover (com o aviso de por quê)
 *   5 erros seguidos     tempestade: escurece, relâmpagos e trovão
 *   3 "Hesitei" seguidos (ou 30 s parado sem virar)   névoa da dúvida
 *   primeiro acerto depois da chuva                    arco-íris
 *
 * Só aparência: não muda a revisão espaçada, o registro nem o servidor.
 */
import { useEffect, useRef } from 'react'
import { tocar } from '../efeitos/sons'
import { AuraDeFogo } from './AuraDeFogo'

export type TipoHumor = 'calmo' | 'chama' | 'gloria' | 'chuva' | 'tempestade' | 'nevoa' | 'arcoiris'
export interface Humor { tipo: TipoHumor; nivel: number; titulo: string; sub: string }
export interface Serie { acertos: number; erros: number; hesitacoes: number; arcoiris: boolean; parado: boolean }

export const SERIE_VAZIA: Serie = { acertos: 0, erros: 0, hesitacoes: 0, arcoiris: false, parado: false }
/** Limiares (fáceis de ajustar). */
export const HUMOR = { chama: [3, 6, 9], gloria: 20, chuva: 3, tempestade: 5, nevoa: 3, paradoSegundos: 30 }

export function avancarSerie(s: Serie, a: 'sabia' | 'hesitei' | 'errei'): Serie {
  if (a === 'sabia') return { acertos: s.acertos + 1, erros: 0, hesitacoes: 0, arcoiris: s.erros >= HUMOR.chuva, parado: false }
  // hesitar não apaga o fogo, mas também não o aumenta
  if (a === 'hesitei') return { acertos: s.acertos, erros: 0, hesitacoes: s.hesitacoes + 1, arcoiris: false, parado: false }
  return { acertos: 0, erros: s.erros + 1, hesitacoes: 0, arcoiris: false, parado: false }
}

export function humorDe(s: Serie): Humor {
  if (s.erros >= HUMOR.tempestade) return { tipo: 'tempestade', nivel: Math.min(3, 1 + Math.floor((s.erros - HUMOR.tempestade) / 2)), titulo: `Tempestade · ${s.erros} erros seguidos`, sub: 'Respire. Leia o verso com calma: um "Sabia" já abre o céu.' }
  if (s.erros >= HUMOR.chuva) return { tipo: 'chuva', nivel: 1, titulo: `Começou a chover · ${s.erros} erros seguidos`, sub: `Com ${HUMOR.tempestade} vira tempestade. Um "Sabia" abre o céu.` }
  if (s.arcoiris) return { tipo: 'arcoiris', nivel: 1, titulo: 'O céu abriu!', sub: 'Depois da chuva, um acerto. Continue assim.' }
  if (s.acertos >= HUMOR.gloria) return { tipo: 'gloria', nivel: 3, titulo: `Glória da Biblioteca · ${s.acertos} seguidas`, sub: 'A biblioteca inteira brilha por você.' }
  const [c1, c2, c3] = HUMOR.chama
  if (s.acertos >= c3) return { tipo: 'chama', nivel: 3, titulo: `Chama arcana · ${s.acertos} seguidas`, sub: `${HUMOR.gloria} seguidas: Glória da Biblioteca.` }
  if (s.acertos >= c2) return { tipo: 'chama', nivel: 2, titulo: `Fogo azul · ${s.acertos} seguidas`, sub: `${c3} seguidas: chama arcana.` }
  if (s.acertos >= c1) return { tipo: 'chama', nivel: 1, titulo: `Em chamas · ${s.acertos} seguidas`, sub: `${c2} seguidas: fogo azul.` }
  if (s.hesitacoes >= HUMOR.nevoa) return { tipo: 'nevoa', nivel: 1, titulo: 'Névoa da dúvida', sub: `${s.hesitacoes} hesitações seguidas. Releia o comentário: a névoa some quando você souber.` }
  if (s.parado) return { tipo: 'nevoa', nivel: 1, titulo: 'Névoa da dúvida', sub: 'Parado há um tempo? Vire o flashcard: errar aqui também ensina.' }
  return { tipo: 'calmo', nivel: 0, titulo: '', sub: '' }
}

const TOM_CHAMA = ['escarlate', 'escarlate', 'fatuo', 'ancestral'] as const
export const tomDaChama = (h: Humor) => (h.tipo === 'gloria' ? 'ouro' : TOM_CHAMA[h.nivel] ?? 'escarlate')

/**
 * Camada do clima: fica entre o cenário e a interface. Chuva, fagulhas e
 * cintilas num canvas de pixels (só anima enquanto o humor pede); névoa,
 * escuridão, raios de luz e arco-íris em CSS.
 */
export function ClimaEstudo({ humor, reduzido, tranquilo = false }: { humor: Humor; reduzido: boolean; tranquilo?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const animado = !reduzido && (humor.tipo === 'chuva' || humor.tipo === 'tempestade' || humor.tipo === 'gloria')
  const aura = !reduzido && (humor.tipo === 'chama' || humor.tipo === 'gloria')

  useEffect(() => {
    const cv = ref.current
    if (!cv || !animado) return
    const c = cv.getContext('2d')!
    const PX = 3
    let W = 0, H = 0
    const medir = () => { W = Math.ceil(cv.clientWidth / PX); H = Math.ceil(cv.clientHeight / PX); cv.width = W; cv.height = H }
    medir()
    window.addEventListener('resize', medir)
    const tempestade = humor.tipo === 'tempestade', chuva = tempestade || humor.tipo === 'chuva'
    const n = chuva ? (tempestade ? 150 + humor.nivel * 40 : 90) : 60
    const vento = tempestade ? 0.45 + humor.nivel * 0.1 : chuva ? 0.18 : 0
    type P = { x: number; y: number; v: number; f: number; k: number }
    const ps: P[] = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 0.6 + Math.random() * 0.8, f: Math.random() * 6.28, k: Math.floor(Math.random() * 3) }))
    const respingos: Array<{ x: number; y: number; t: number }> = []
    let raio: { pts: Array<[number, number]>; t: number } | null = null
    let proximoRaio = performance.now() + 1500 + Math.random() * 2500
    let quadro = 0, antes = performance.now()
    const passo = (agora: number) => {
      const dt = Math.min(50, agora - antes) / 16.7
      antes = agora
      c.clearRect(0, 0, W, H)
      if (chuva) {
        c.fillStyle = tempestade ? 'rgba(170, 190, 225, .55)' : 'rgba(170, 200, 235, .5)'
        for (const p of ps) {
          p.y += (tempestade ? 4.2 : 3.2) * p.v * dt; p.x += vento * 4 * p.v * dt
          if (p.y > H) { if (Math.random() < 0.35) respingos.push({ x: p.x, y: H - 1 - Math.random() * H * 0.25, t: 0 }); p.y = -4; p.x = Math.random() * (W + 40) - 40 }
          if (p.x > W) p.x -= W
          const comp = tempestade ? 5 : 4
          for (let i = 0; i < comp; i++) c.fillRect(Math.round(p.x - vento * i), Math.round(p.y - i), 1, 1)
        }
        c.fillStyle = 'rgba(200, 220, 245, .55)'
        for (const r of respingos) { r.t += dt; const a = Math.round(r.t / 3); c.fillRect(Math.round(r.x) - a, Math.round(r.y), 1, 1); c.fillRect(Math.round(r.x) + a, Math.round(r.y), 1, 1) }
        for (let i = respingos.length - 1; i >= 0; i--) if (respingos[i].t > 9) respingos.splice(i, 1)
        if (tempestade && agora > proximoRaio) {
          // relâmpago: um raio em zigue-zague de pixels e o clarão da tela (CSS)
          let x = W * (0.15 + Math.random() * 0.7), y = 0
          const pts: Array<[number, number]> = [[x, y]]
          while (y < H * (0.45 + Math.random() * 0.3)) { y += 3 + Math.random() * 6; x += (Math.random() - 0.5) * 9; pts.push([x, y]) }
          raio = { pts, t: 0 }
          raiz.current?.classList.remove('fc-clima--clarao'); void raiz.current?.offsetWidth; raiz.current?.classList.add('fc-clima--clarao')
          window.setTimeout(() => tocar('raio'), 120 + Math.random() * 300)
          proximoRaio = agora + Math.max(1400, 5200 - humor.nivel * 1100) + Math.random() * 2600
        }
        if (raio) {
          raio.t += dt
          if (raio.t < 9 && (raio.t < 3 || Math.floor(raio.t) % 2 === 0)) {
            for (const [cor, lg] of [['rgba(190, 210, 255, .55)', 3], ['#ffffff', 1]] as const) {
              c.fillStyle = cor
              for (let i = 1; i < raio.pts.length; i++) {
                const [x0, y0] = raio.pts[i - 1], [x1, y1] = raio.pts[i], k = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
                for (let j = 0; j <= k; j++) c.fillRect(Math.round(x0 + ((x1 - x0) * j) / k) - (lg >> 1), Math.round(y0 + ((y1 - y0) * j) / k), lg, 1)
              }
            }
          } else if (raio.t >= 9) raio = null
        }
      } else {
        // glória: cintilas em cruz que acendem e apagam, e poeira de ouro descendo devagar
        for (const p of ps) {
          p.f += 0.05 * p.v * dt; p.y += 0.12 * p.v * dt
          if (p.y > H) { p.y = -2; p.x = Math.random() * W }
          const a = Math.max(0, Math.sin(p.f))
          if (a < 0.05) continue
          const x = Math.round(p.x), y = Math.round(p.y)
          c.globalAlpha = a
          c.fillStyle = '#fff4b8'; c.fillRect(x, y, 1, 1)
          if (a > 0.6 && p.k > 0) { c.fillStyle = '#ffcf4a'; c.fillRect(x - 1, y, 1, 1); c.fillRect(x + 1, y, 1, 1); c.fillRect(x, y - 1, 1, 1); c.fillRect(x, y + 1, 1, 1) }
          if (a > 0.9 && p.k === 2) { c.fillStyle = '#ec8a1c'; c.fillRect(x - 2, y, 1, 1); c.fillRect(x + 2, y, 1, 1); c.fillRect(x, y - 2, 1, 1); c.fillRect(x, y + 2, 1, 1) }
        }
        c.globalAlpha = 1
      }
      quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => { cancelAnimationFrame(quadro); window.removeEventListener('resize', medir) }
  }, [animado, humor.tipo, humor.nivel])

  return (
    <div ref={raiz} className={`fc-clima fc-clima--${humor.tipo} fc-clima--nivel-${humor.nivel}${tranquilo ? ' fc-clima--tranquilo' : ''}`} aria-hidden="true">
      <span className="fc-clima__veu" />
      {humor.tipo === 'gloria' && <span className="fc-clima__raios" />}
      {humor.tipo === 'arcoiris' && <span className="fc-clima__arcoiris" />}
      {humor.tipo === 'nevoa' && <><span className="fc-clima__nevoa" /><span className="fc-clima__nevoa fc-clima__nevoa--2" /></>}
      {aura && <AuraDeFogo tom={tomDaChama(humor)} nivel={humor.nivel} />}
      {animado && <canvas ref={ref} className="fc-clima__chuva" />}
    </div>
  )
}

/** O nome da pessoa: na sequência de acertos ele brilha na cor da aura (o fogo mesmo fica em volta do flashcard). */
export function NomeEmChamas({ nome, humor }: { nome: string; humor: Humor }) {
  const acesa = humor.tipo === 'chama' || humor.tipo === 'gloria'
  const tom = tomDaChama(humor)
  return (
    <p className={`fc-nome-chamas${acesa ? ` fc-nome-chamas--acesa fc-nome-chamas--${tom} fc-nome-chamas--nivel-${humor.nivel}` : ''}`}>
      <span className="fc-nome-chamas__texto">{nome}</span>
    </p>
  )
}

/** Toca o som certo quando o humor muda (subir de chama, glória, céu abrindo). */
export function somDoHumor(antes: Humor, depois: Humor) {
  if (antes.tipo === depois.tipo && antes.nivel === depois.nivel) return
  if (depois.tipo === 'gloria') tocar('lendario')
  else if (depois.tipo === 'chama' && (antes.tipo !== 'chama' || depois.nivel > antes.nivel)) tocar('combo')
  else if (depois.tipo === 'arcoiris') tocar('cura')
  else if (depois.tipo === 'tempestade' && antes.tipo !== 'tempestade') tocar('raio')
}
