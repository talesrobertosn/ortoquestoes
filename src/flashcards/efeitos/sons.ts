/**
 * Sons da Batalha, sintetizados na hora com Web Audio (nenhum arquivo de áudio
 * para baixar). Desligados por padrão; o contexto de áudio só nasce depois que
 * a pessoa liga o som (o navegador exige um toque antes de tocar).
 */

export type Som =
  | 'compra' | 'selecao' | 'disparo' | 'impacto' | 'critico' | 'erro' | 'golpe-inimigo'
  | 'escudo' | 'escudo-quebra' | 'cura' | 'combo' | 'derrota-inimigo' | 'vitoria-chefe'
  | 'derrota' | 'poder' | 'pista' | 'fase' | 'furia'

let ctx: AudioContext | null = null
let mestre: GainNode | null = null
let volume = 0.6
let ligado = false

export function configurarSom(liga: boolean, vol: number) {
  ligado = liga
  volume = vol
  if (ligado && !ctx) {
    try {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new C()
      mestre = ctx.createGain()
      mestre.connect(ctx.destination)
    } catch { ctx = null }
  }
  if (ctx?.state === 'suspended' && ligado) void ctx.resume()
  if (mestre && ctx) mestre.gain.setTargetAtTime(ligado ? volume * 0.5 : 0, ctx.currentTime, 0.02)
}

function nota(freq: number, inicio: number, dur: number, tipo: OscillatorType = 'sine', ganho = 0.3, deslize?: number) {
  if (!ctx || !mestre) return
  const t = ctx.currentTime + inicio
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(freq, t)
  if (deslize) o.frequency.exponentialRampToValueAtTime(deslize, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(ganho, t + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(mestre)
  o.start(t); o.stop(t + dur + 0.05)
}

function ruido(inicio: number, dur: number, ganho = 0.25, filtro = 1200, tipo: BiquadFilterType = 'lowpass') {
  if (!ctx || !mestre) return
  const t = ctx.currentTime + inicio
  const tam = Math.max(1, Math.floor(ctx.sampleRate * dur))
  const buf = ctx.createBuffer(1, tam, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < tam; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / tam)
  const src = ctx.createBufferSource(); src.buffer = buf
  const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = filtro
  const g = ctx.createGain(); g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(mestre)
  src.start(t)
}

export function tocar(som: Som) {
  if (!ligado || !ctx) return
  switch (som) {
    case 'compra': ruido(0, 0.18, 0.12, 3000, 'bandpass'); break
    case 'selecao': nota(660, 0, 0.08, 'triangle', 0.12); break
    case 'disparo': nota(320, 0, 0.32, 'sawtooth', 0.08, 900); ruido(0, 0.3, 0.08, 2400, 'bandpass'); break
    case 'impacto': ruido(0, 0.25, 0.35, 900); nota(140, 0, 0.22, 'square', 0.12, 60); break
    case 'critico': ruido(0, 0.4, 0.45, 1400); nota(110, 0, 0.35, 'square', 0.16, 40); nota(880, 0.03, 0.3, 'triangle', 0.1, 1760); break
    case 'erro': nota(220, 0, 0.18, 'square', 0.1); nota(164, 0.12, 0.3, 'square', 0.1); break
    case 'golpe-inimigo': ruido(0, 0.3, 0.4, 600); nota(90, 0, 0.3, 'sawtooth', 0.16, 45); break
    case 'escudo': nota(1200, 0, 0.25, 'triangle', 0.14); nota(1800, 0.02, 0.3, 'sine', 0.08); break
    case 'escudo-quebra': ruido(0, 0.35, 0.3, 5000, 'highpass'); nota(900, 0, 0.2, 'triangle', 0.1, 300); break
    case 'cura': [523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.07, 0.3, 'sine', 0.12)); break
    case 'combo': nota(784, 0, 0.12, 'triangle', 0.12); nota(1175, 0.08, 0.18, 'triangle', 0.12); break
    case 'derrota-inimigo': ruido(0, 0.6, 0.3, 800); [392, 523, 659].forEach((f, i) => nota(f, 0.15 + i * 0.1, 0.4, 'triangle', 0.13)); break
    case 'vitoria-chefe': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => nota(f, i * 0.12, 0.45, 'triangle', 0.14)); break
    case 'derrota': [392, 330, 262, 196].forEach((f, i) => nota(f, i * 0.22, 0.5, 'sine', 0.15)); break
    case 'poder': nota(587, 0, 0.2, 'triangle', 0.12); nota(880, 0.1, 0.35, 'triangle', 0.12); break
    case 'pista': ruido(0, 0.25, 0.1, 4000, 'bandpass'); nota(988, 0.05, 0.2, 'sine', 0.08); break
    case 'fase': nota(110, 0, 0.8, 'sawtooth', 0.12, 55); ruido(0, 0.8, 0.2, 300); break
    case 'furia': nota(150, 0, 0.5, 'square', 0.12, 220); break
  }
}
