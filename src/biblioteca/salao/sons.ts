import { ler, gravar } from '../../estado/armazenamento'

/**
 * Sons do salão, sintetizados na hora (Web Audio, sem arquivo). Começam desligados (regra da tela limpa,
 * 19/10/2026); a pessoa liga no botão do salão e a escolha fica guardada.
 */
export type Som = 'puxar' | 'pagina' | 'segredo' | 'miau' | 'pio' | 'tique' | 'gaveta'

const CHAVE = 'resumos:som'
export const somLigado = () => ler<boolean>(CHAVE, false)
export const ligarSom = (sim: boolean) => gravar(CHAVE, sim)

let contexto: AudioContext | null = null
function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!C) return null
  contexto ??= new C()
  if (contexto.state === 'suspended') void contexto.resume()
  return contexto
}

function nota(a: AudioContext, freq: number, inicio: number, dur: number, tipo: OscillatorType = 'square', volume = 0.05, ate?: number) {
  const o = a.createOscillator(), g = a.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(freq, a.currentTime + inicio)
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, a.currentTime + inicio + dur)
  g.gain.setValueAtTime(volume, a.currentTime + inicio)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + inicio + dur)
  o.connect(g).connect(a.destination)
  o.start(a.currentTime + inicio)
  o.stop(a.currentTime + inicio + dur + 0.02)
}

function ruido(a: AudioContext, dur: number, de: number, para: number, volume = 0.08) {
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate)
  const dados = buffer.getChannelData(0)
  for (let i = 0; i < dados.length; i++) dados[i] = (Math.random() * 2 - 1) * (1 - i / dados.length)
  const fonte = a.createBufferSource(), filtro = a.createBiquadFilter(), g = a.createGain()
  fonte.buffer = buffer
  filtro.type = 'bandpass'
  filtro.frequency.setValueAtTime(de, a.currentTime)
  filtro.frequency.exponentialRampToValueAtTime(para, a.currentTime + dur)
  g.gain.value = volume
  fonte.connect(filtro).connect(g).connect(a.destination)
  fonte.start()
}

export function tocar(som: Som) {
  if (!somLigado()) return
  const a = ctx()
  if (!a) return
  switch (som) {
    case 'puxar': ruido(a, 0.18, 900, 300, 0.07); break
    case 'pagina': ruido(a, 0.28, 2400, 700, 0.06); break
    case 'gaveta': ruido(a, 0.22, 300, 160, 0.1); nota(a, 120, 0.18, 0.08, 'square', 0.04); break
    case 'tique': nota(a, 1800, 0, 0.03, 'square', 0.03); break
    case 'miau': nota(a, 620, 0, 0.32, 'sawtooth', 0.03, 880); nota(a, 880, 0.3, 0.2, 'sawtooth', 0.025, 520); break
    case 'pio': nota(a, 420, 0, 0.18, 'sine', 0.09, 380); nota(a, 420, 0.28, 0.32, 'sine', 0.09, 360); break
    case 'segredo': [523, 659, 784, 1047].forEach((f, i) => nota(a, f, i * 0.09, 0.16, 'square', 0.045)); break
  }
}
