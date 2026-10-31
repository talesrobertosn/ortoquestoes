import { gravar, ler } from '../../estado/armazenamento'

/**
 * Sons da Biblioteca 3.0 (31/10/2026), sintetizados na hora com Web Audio: nada de arquivo, nada de música de
 * terceiros. Começam desligados (regra da tela limpa); a pessoa liga no botão "Som" e a escolha fica no aparelho.
 *
 * Por que o botão antigo parecia mudo (auditoria de 31/10/2026): o volume era de 0,03 a 0,1 sem ganho geral, o bipe
 * de confirmação durava 30 ms a 1800 Hz (quase inaudível), o contexto era retomado fora do gesto (num setTimeout),
 * nada destravava o iPhone (chave do silencioso e o "interrupted" depois de bloquear a tela) e, sem conta, a escolha
 * se perdia a cada recarga. Agora:
 * - `destravar()` roda DENTRO do clique (cria, retoma e toca uma amostra de silêncio; no iOS 17+ pede a sessão
 *   "playback" para tocar mesmo no silencioso, só depois de a pessoa ligar o som);
 * - um ganho geral confortável passa por um compressor (nada estoura, nada some);
 * - aba escondida suspende o contexto; ao voltar, retoma;
 * - poucos sons, desenhados para a cena: livro deslizando na madeira, página virando, toque na madeira, o pio da
 *   coruja, o miado, o tique do relógio, o sopro da vela e o carrilhão dos segredos. Nenhum no passar do mouse.
 */
export type Som = 'puxar' | 'pagina' | 'madeira' | 'pio' | 'miau' | 'tique' | 'vela' | 'segredo' | 'ligar'

const CHAVE = 'resumos:som'
export const somLigado = () => ler<boolean>(CHAVE, false)

let ctx: AudioContext | null = null
let saida: GainNode | null = null
const VOLUME = 0.7

function criar(): AudioContext | null {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!C) return null
  try {
    ctx = new C()
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2
    saida = ctx.createGain()
    saida.gain.value = VOLUME
    saida.connect(comp).connect(ctx.destination)
    instalarVisibilidade()
  } catch { ctx = null }
  return ctx
}

/** Chamar dentro de um gesto (clique, toque, tecla): cria, retoma e toca uma amostra de silêncio (o iOS só libera assim). */
export function destravar() {
  const a = criar()
  if (!a) return
  try {
    const sessao = (navigator as unknown as { audioSession?: { type: string } }).audioSession
    if (sessao && somLigado()) sessao.type = 'playback'
  } catch { /* navegador sem audioSession */ }
  try {
    const b = a.createBuffer(1, 1, a.sampleRate), f = a.createBufferSource()
    f.buffer = b; f.connect(a.destination); f.start(0)
  } catch { /* o silêncio é só o empurrão */ }
  if (a.state !== 'running') void a.resume().catch(() => undefined)
}

let visibilidade = false
function instalarVisibilidade() {
  if (visibilidade || typeof document === 'undefined') return
  visibilidade = true
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend().catch(() => undefined)
    else if (somLigado()) void ctx.resume().catch(() => undefined)
  })
  window.addEventListener('pageshow', () => { if (ctx && somLigado() && ctx.state !== 'running') void ctx.resume().catch(() => undefined) })
}

/** Liga ou desliga (dentro do clique do botão). Ao ligar, toca a página virando: a pessoa ouve na hora que funcionou. */
export function ligarSom(sim: boolean) {
  gravar(CHAVE, sim)
  if (sim) { destravar(); tocar('ligar') }
  else if (ctx) void ctx.suspend().catch(() => undefined)
}

/** Se o aparelho consegue tocar (Web Audio existe). Sem ele, o botão some em vez de fingir que funciona. */
export const somDisponivel = () => typeof window !== 'undefined' && !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext)

// ─── instrumentos ────────────────────────────────────────────────────────

function envelope(a: AudioContext, g: GainNode, inicio: number, ataque: number, pico: number, queda: number) {
  const t = a.currentTime + inicio
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(pico, t + ataque)
  g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + queda)
}

let ruidoBranco: AudioBuffer | null = null
function bufferRuido(a: AudioContext) {
  if (ruidoBranco && ruidoBranco.sampleRate === a.sampleRate) return ruidoBranco
  const n = Math.floor(a.sampleRate * 1.2)
  ruidoBranco = a.createBuffer(1, n, a.sampleRate)
  const d = ruidoBranco.getChannelData(0)
  // ruído marrom suave (passeio aleatório): soa como atrito de papel e madeira, sem chiado agudo
  let ultimo = 0
  for (let i = 0; i < n; i++) { const b = Math.random() * 2 - 1; ultimo = (ultimo + 0.04 * b) / 1.02; d[i] = ultimo * 3.2 + b * 0.18 }
  return ruidoBranco
}

/** Ruído filtrado com uma varredura de frequência (papel, madeira, sopro). */
function sopro(a: AudioContext, o: { inicio?: number; dur: number; tipo: BiquadFilterType; de: number; para: number; q?: number; pico: number; ataque?: number }) {
  const f = a.createBufferSource(), filtro = a.createBiquadFilter(), g = a.createGain()
  f.buffer = bufferRuido(a)
  filtro.type = o.tipo
  filtro.Q.value = o.q ?? 0.9
  const t = a.currentTime + (o.inicio ?? 0)
  filtro.frequency.setValueAtTime(o.de, t)
  filtro.frequency.exponentialRampToValueAtTime(o.para, t + o.dur)
  envelope(a, g, o.inicio ?? 0, o.ataque ?? 0.012, o.pico, o.dur)
  f.connect(filtro).connect(g).connect(saida!)
  f.start(t, Math.random() * 0.5)
  f.stop(t + o.dur + 0.1)
}

/** Nota com envelope (seno, triângulo...), com glissando e vibrato opcionais. */
function nota(a: AudioContext, o: { inicio?: number; freq: number; ate?: number; dur: number; tipo?: OscillatorType; pico: number; ataque?: number; vibrato?: number }) {
  const osc = a.createOscillator(), g = a.createGain()
  const t = a.currentTime + (o.inicio ?? 0)
  osc.type = o.tipo ?? 'sine'
  osc.frequency.setValueAtTime(o.freq, t)
  if (o.ate) osc.frequency.exponentialRampToValueAtTime(o.ate, t + o.dur)
  if (o.vibrato) {
    const lfo = a.createOscillator(), prof = a.createGain()
    lfo.frequency.value = 5.5; prof.gain.value = o.vibrato
    lfo.connect(prof).connect(osc.frequency)
    lfo.start(t); lfo.stop(t + o.dur + 0.1)
  }
  envelope(a, g, o.inicio ?? 0, o.ataque ?? 0.01, o.pico, o.dur)
  osc.connect(g).connect(saida!)
  osc.start(t); osc.stop(t + (o.ataque ?? 0.01) + o.dur + 0.05)
}

/** Sino suave (parciais de um sino pequeno), para o carrilhão dos segredos. */
function sino(a: AudioContext, freq: number, inicio: number, pico: number) {
  for (const [k, p] of [[1, 1], [2.76, 0.35], [5.4, 0.16]] as const) nota(a, { inicio, freq: freq * k, dur: 1.1 / k + 0.2, pico: pico * p, ataque: 0.004 })
}

export function tocar(som: Som) {
  if (!somLigado()) return
  const a = criar()
  if (!a || !saida) return
  if (a.state !== 'running') void a.resume().catch(() => undefined)
  switch (som) {
    case 'puxar': // o livro desliza na prateleira e encosta
      sopro(a, { dur: 0.2, tipo: 'lowpass', de: 1600, para: 420, pico: 0.55, ataque: 0.02 })
      nota(a, { inicio: 0.17, freq: 190, ate: 120, dur: 0.12, tipo: 'triangle', pico: 0.28 })
      break
    case 'pagina': // a página vira: duas rajadas de papel
    case 'ligar':
      sopro(a, { dur: 0.16, tipo: 'bandpass', de: 3200, para: 1400, q: 0.7, pico: 0.5 })
      sopro(a, { inicio: 0.1, dur: 0.22, tipo: 'bandpass', de: 2400, para: 700, q: 0.7, pico: 0.38 })
      break
    case 'madeira': // toque na madeira (escada, estante)
      nota(a, { freq: 240, ate: 180, dur: 0.14, tipo: 'triangle', pico: 0.4, ataque: 0.002 })
      nota(a, { freq: 410, ate: 330, dur: 0.08, tipo: 'sine', pico: 0.18, ataque: 0.002 })
      sopro(a, { dur: 0.05, tipo: 'highpass', de: 2500, para: 1800, pico: 0.2, ataque: 0.002 })
      break
    case 'pio': // "hu-huuu" da coruja
      nota(a, { freq: 410, ate: 380, dur: 0.22, pico: 0.42, ataque: 0.04, vibrato: 4 })
      nota(a, { inicio: 0.32, freq: 400, ate: 340, dur: 0.5, pico: 0.46, ataque: 0.06, vibrato: 7 })
      break
    case 'miau':
      nota(a, { freq: 560, ate: 820, dur: 0.18, tipo: 'sawtooth', pico: 0.09, ataque: 0.03 })
      nota(a, { inicio: 0.17, freq: 820, ate: 470, dur: 0.3, tipo: 'sawtooth', pico: 0.08, ataque: 0.01 })
      nota(a, { freq: 560, ate: 820, dur: 0.18, tipo: 'sine', pico: 0.18, ataque: 0.03 })
      nota(a, { inicio: 0.17, freq: 820, ate: 470, dur: 0.3, tipo: 'sine', pico: 0.16 })
      break
    case 'tique': // tique-taque do relógio
      for (const [i, f] of [[0, 2300], [0.18, 1700]] as const) {
        nota(a, { inicio: i, freq: f, dur: 0.035, tipo: 'square', pico: 0.12, ataque: 0.001 })
        sopro(a, { inicio: i, dur: 0.03, tipo: 'highpass', de: 3000, para: 2600, pico: 0.25, ataque: 0.001 })
      }
      break
    case 'vela': // sopro na chama (apagar ou acender a arandela)
      sopro(a, { dur: 0.32, tipo: 'lowpass', de: 900, para: 260, pico: 0.42, ataque: 0.05 })
      break
    case 'segredo': // carrilhão: dó, mi, sol, dó
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => sino(a, f, i * 0.11, 0.22))
      break
  }
}
