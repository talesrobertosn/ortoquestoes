/**
 * Identidade sonora do Torneio, sintetizada na hora com Web Audio (nenhum
 * arquivo, nenhuma licença de terceiros, nenhuma trilha de outro jogo).
 *
 * Mixagem: efeitos, ambiente e música em barramentos separados → compressor
 * de cola → ganho de saída → limitador. Assim o volume fica forte no celular
 * sem distorcer quando vários golpes se somam.
 *
 * Variedade: cada impacto tem quatro receitas (pedra, metal, abafado, mágico),
 * sorteadas sem repetir a anterior, com variação de altura e intensidade.
 * Os golpes dos adversários têm timbre próprio (Golem, Serpente, Guardião).
 *
 * Música: sequenciador procedural com temas por cenário e um tema de chefe
 * (acordes, baixo, arpejo e percussão), que abaixa sozinho nos golpes fortes.
 * O navegador só deixa tocar depois do primeiro toque ou tecla: `destravar()`.
 */

export type Som =
  | 'hover' | 'selecao' | 'giro' | 'compra' | 'confirmar' | 'abrir' | 'fechar' | 'transicao'
  | 'carga' | 'disparo' | 'impacto-leve' | 'impacto-medio' | 'impacto-forte' | 'critico'
  | 'erro' | 'preparo-inimigo' | 'golpe-inimigo' | 'dano' | 'escudo' | 'escudo-quebra' | 'cura'
  | 'combo' | 'derrota-inimigo' | 'vitoria-chefe' | 'derrota' | 'poder' | 'recompensa' | 'pista'
  | 'fase' | 'furia' | 'lendario' | 'imortal' | 'veneno' | 'evolucao' | 'acerto'

export type Ambiente = 'campo' | 'masmorra' | 'salao' | 'biblioteca'
export type Musica = 'campo' | 'masmorra' | 'salao' | 'biblioteca' | 'chefe'
/** Timbre do golpe de cada adversário. */
export type Timbre = 'golem' | 'serpente' | 'guardiao' | 'heroi' | undefined

let ctx: AudioContext | null = null
let saida: GainNode, efeitos: GainNode, ambiente: GainNode, musica: GainNode, reverb: ConvolverNode, envio: GainNode
let ligado = true
let volEfeitos = 0.8, volAmbiente = 0.35, volMusica = 0.45
let ambienteAtual: { nome: Ambiente; parar: () => void } | null = null
let ambientePedido: Ambiente | null = null
let musicaAtual: { nome: Musica; parar: () => void } | null = null
let musicaPedida: Musica | null = null

/** Ganho geral das vozes: as receitas foram afinadas baixas, a saída compensa. */
const G = 1.7

function criar() {
  if (ctx) return
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new C({ latencyHint: 'interactive' })
  } catch { ctx = null; return }
  const cola = ctx.createDynamicsCompressor()
  cola.threshold.value = -18; cola.knee.value = 8; cola.ratio.value = 4; cola.attack.value = 0.004; cola.release.value = 0.22
  const ganhoSaida = ctx.createGain(); ganhoSaida.gain.value = 1.9
  const limitador = ctx.createDynamicsCompressor()
  limitador.threshold.value = -2; limitador.knee.value = 0; limitador.ratio.value = 20; limitador.attack.value = 0.001; limitador.release.value = 0.08
  saida = ctx.createGain()
  saida.connect(cola); cola.connect(ganhoSaida); ganhoSaida.connect(limitador); limitador.connect(ctx.destination)
  efeitos = ctx.createGain(); efeitos.connect(saida)
  ambiente = ctx.createGain(); ambiente.connect(saida)
  musica = ctx.createGain(); musica.connect(saida)
  // reverberação de sala de pedra (resposta gerada por ruído decaindo)
  reverb = ctx.createConvolver()
  const dur = 1.4, n = Math.floor(ctx.sampleRate * dur)
  const ir = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3) }
  reverb.buffer = ir
  envio = ctx.createGain(); envio.gain.value = 0.24
  envio.connect(reverb); reverb.connect(efeitos)
  aplicarVolumes()
}

function aplicarVolumes() {
  if (!ctx) return
  const t = ctx.currentTime
  saida.gain.setTargetAtTime(ligado ? 1 : 0, t, 0.03)
  efeitos.gain.setTargetAtTime(volEfeitos, t, 0.03)
  ambiente.gain.setTargetAtTime(volAmbiente * 0.6, t, 0.3)
  musica.gain.setTargetAtTime(volMusica * 0.55, t, 0.3)
}

export function configurarSom(o: { ligado: boolean; efeitos: number; ambiente: number; musica?: number }) {
  ligado = o.ligado; volEfeitos = o.efeitos; volAmbiente = o.ambiente
  if (o.musica !== undefined) volMusica = o.musica
  aplicarVolumes()
}

/** Chamar num toque ou tecla: cria o contexto e retoma o ambiente e a música pedidos. */
export function destravar() {
  criar()
  if (ctx?.state === 'suspended') void ctx.resume().then(() => { retomar() })
  retomar()
}
function retomar() {
  if (!ctx || ctx.state !== 'running') return
  if (ambientePedido && ambienteAtual?.nome !== ambientePedido) tocarAmbiente(ambientePedido)
  if (musicaPedida && musicaAtual?.nome !== musicaPedida) tocarMusica(musicaPedida)
}

export function somDisponivel() { return !!ctx && ctx.state === 'running' }

const varia = (v: number, k = 0.06) => v * (1 + (Math.random() * 2 - 1) * k)

function nota(freq: number, inicio: number, dur: number, tipo: OscillatorType = 'sine', ganho = 0.3, ate?: number, eco = true, destino?: AudioNode) {
  if (!ctx) return
  const t = ctx.currentTime + inicio
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(freq, t)
  if (ate) o.frequency.exponentialRampToValueAtTime(Math.max(20, ate), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, ganho * G), t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(destino ?? efeitos); if (eco) g.connect(envio)
  o.start(t); o.stop(t + dur + 0.05)
}

let ruidoBuf: AudioBuffer | null = null
function bufRuido() {
  if (!ctx) return null
  if (!ruidoBuf) {
    ruidoBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const d = ruidoBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return ruidoBuf
}

function ruido(inicio: number, dur: number, ganho: number, freq: number, tipo: BiquadFilterType = 'lowpass', ate?: number, q = 0.8, eco = true, destino?: AudioNode) {
  if (!ctx) return
  const b = bufRuido(); if (!b) return
  const t = ctx.currentTime + inicio
  const src = ctx.createBufferSource(); src.buffer = b
  const f = ctx.createBiquadFilter(); f.type = tipo; f.Q.value = q
  f.frequency.setValueAtTime(freq, t); if (ate) f.frequency.exponentialRampToValueAtTime(Math.max(30, ate), t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, ganho * G), t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f); f.connect(g); g.connect(destino ?? efeitos); if (eco) g.connect(envio)
  src.start(t, Math.random()); src.stop(t + dur + 0.05)
}

/** Abaixa a música por um instante, para o golpe aparecer. */
function abaixarMusica(quanto = 0.35, ms = 450) {
  if (!ctx || !musica) return
  const t = ctx.currentTime, alvo = volMusica * 0.55
  musica.gain.cancelScheduledValues(t)
  musica.gain.setTargetAtTime(alvo * quanto, t, 0.02)
  musica.gain.setTargetAtTime(alvo, t + ms / 1000, 0.25)
}

/** Sorteio sem repetir a última escolha (por categoria). */
const ultimas = new Map<string, number>()
function sortear(categoria: string, n: number) {
  let k = Math.floor(Math.random() * n)
  if (k === ultimas.get(categoria)) k = (k + 1 + Math.floor(Math.random() * (n - 1))) % n
  ultimas.set(categoria, k)
  return k
}

/** Impacto em camadas, com quatro receitas que se alternam; a força escala tudo. */
function impacto(forca: number, timbre?: Timbre) {
  const f = forca * varia(1, 0.1)
  const receita = timbre === 'golem' ? 0 : timbre === 'guardiao' ? 1 : sortear('impacto', 4)
  ruido(0, 0.05, 0.5 * f, varia(4200, 0.15), 'highpass', undefined, 0.7, false)   // estalo
  nota(varia(85 + 30 * f, 0.1), 0, 0.26 + 0.16 * f, 'sine', 0.6 * f, 36)         // corpo grave
  switch (receita) {
    case 0: // pedra: cascalho e poeira
      ruido(0, 0.32 + 0.26 * f, 0.45 * f, 1500, 'lowpass', 150)
      for (let i = 0; i < 3; i++) ruido(0.04 + i * 0.05 * Math.random(), 0.05, 0.12 * f, varia(2400, 0.3), 'bandpass', undefined, 3, false)
      break
    case 1: // metal: anel de lâmina
      ruido(0, 0.22, 0.3 * f, 2600, 'bandpass', 900, 1.2)
      nota(varia(1240, 0.08), 0.005, 0.5, 'triangle', 0.07 * f, 1180); nota(varia(1730, 0.08), 0.005, 0.42, 'triangle', 0.05 * f, 1650)
      break
    case 2: // abafado: soco pesado
      ruido(0, 0.22 + 0.2 * f, 0.5 * f, 650, 'bandpass', 220, 0.9)
      nota(varia(52), 0, 0.4, 'sine', 0.45 * f, 32)
      break
    default: // mágico: varredura e faíscas
      ruido(0, 0.4, 0.32 * f, 5200, 'bandpass', 500, 1.5)
      ;[1568, 2093, 2637].forEach((fr, i) => nota(varia(fr, 0.04), 0.02 + i * 0.03, 0.25, 'sine', 0.035 * f))
  }
  if (forca > 0.8) nota(varia(1500), 0.01, 0.38, 'triangle', 0.08, 900)            // brilho mágico
  if (forca >= 1) abaixarMusica(0.3, 600)
}

export function tocar(som: Som, forca = 1, timbre?: Timbre) {
  if (!ligado || !ctx || ctx.state !== 'running') return
  switch (som) {
    case 'hover': nota(varia(1800, 0.1), 0, 0.05, 'sine', 0.03, undefined, false); break
    case 'selecao': ruido(0, 0.08, 0.1, 3000, 'bandpass', 5000, 2); nota(varia(880, 0.04), 0, 0.12, 'triangle', 0.09); break
    case 'giro': ruido(0, 0.24, 0.12, 1200, 'bandpass', 4200, 1.2); break
    case 'compra': ruido(0, 0.25, 0.15, 800, 'bandpass', 3600, 1); nota(varia(520), 0.12, 0.1, 'triangle', 0.05); break
    case 'confirmar': nota(varia(660, 0.03), 0, 0.09, 'triangle', 0.12); nota(varia(990, 0.03), 0.06, 0.16, 'triangle', 0.11); break
    case 'abrir': ruido(0, 0.6, 0.12, 300, 'lowpass', 2400); [392, 523, 659].forEach((f, i) => nota(f, 0.1 + i * 0.07, 0.5, 'sine', 0.08)); break
    case 'fechar': ruido(0, 0.4, 0.1, 2400, 'lowpass', 300); nota(392, 0.05, 0.3, 'sine', 0.06); break
    case 'transicao': ruido(0, 0.9, 0.2, 200, 'lowpass', 1800); nota(55, 0, 0.9, 'sine', 0.14); break
    case 'carga': nota(varia(220), 0, 0.32, 'sawtooth', 0.06, 880); ruido(0, 0.32, 0.09, 600, 'bandpass', 5200, 3); nota(varia(110), 0, 0.32, 'sine', 0.08, 220); break
    case 'disparo': ruido(0, 0.36, 0.26 * forca, varia(2400, 0.1), 'bandpass', 600, 1.4); nota(varia(700, 0.08), 0, 0.3, 'triangle', 0.07, 260); break
    case 'acerto': [880, 1319].forEach((f, i) => nota(varia(f, 0.02), i * 0.05, 0.22, 'sine', 0.07)); break
    case 'impacto-leve': impacto(0.55, timbre); break
    case 'impacto-medio': impacto(0.85, timbre); break
    case 'impacto-forte': impacto(1.15, timbre); break
    case 'critico':
      impacto(1.35, timbre); nota(varia(60), 0, 0.7, 'sine', 0.4, 30)
      ;[784, 1175, 1568, 2349].forEach((f, i) => nota(f, 0.04 + i * 0.05, 0.45, 'triangle', 0.08))
      ruido(0, 0.5, 0.25, 7000, 'highpass', 2500, 0.7)
      abaixarMusica(0.2, 900)
      break
    case 'erro': nota(varia(233, 0.03), 0, 0.16, 'square', 0.06); nota(varia(185, 0.03), 0.1, 0.32, 'square', 0.06); break
    case 'preparo-inimigo':
      if (timbre === 'serpente') { ruido(0, 0.5, 0.18, 5000, 'highpass', 7000, 0.6); nota(varia(300), 0, 0.5, 'sawtooth', 0.04, 600) }
      else if (timbre === 'guardiao') { ruido(0, 0.5, 0.16, 800, 'bandpass', 3200, 2); nota(varia(98), 0, 0.5, 'sawtooth', 0.12, 196); nota(varia(147), 0, 0.5, 'sawtooth', 0.06, 294) }
      else { nota(varia(70), 0, 0.45, 'sawtooth', 0.14, 140); ruido(0, 0.45, 0.16, 300, 'lowpass', 900) }
      break
    case 'golpe-inimigo':
      if (timbre === 'serpente') { ruido(0, 0.18, 0.35, 3000, 'bandpass', 800, 1.5); ruido(0.02, 0.5, 0.12, 6000, 'highpass', undefined, 0.6) }
      else if (timbre === 'guardiao') { ruido(0, 0.32, 0.36, 2600, 'bandpass', 500, 1.2); nota(varia(160), 0, 0.2, 'sawtooth', 0.1, 60) }
      else { ruido(0, 0.3, 0.36, 1600, 'bandpass', 300, 1.1); nota(varia(120), 0, 0.26, 'sawtooth', 0.1, 50) }
      break
    case 'dano': impacto(0.95, timbre); nota(varia(110), 0.02, 0.4, 'square', 0.07, 55); break
    case 'veneno': ruido(0, 0.6, 0.14, 1800, 'bandpass', 600, 4); [330, 311].forEach((f, i) => nota(f, i * 0.12, 0.3, 'sawtooth', 0.04)); break
    case 'escudo': nota(varia(1320), 0, 0.55, 'sine', 0.14); nota(varia(1980), 0.01, 0.45, 'sine', 0.08); ruido(0, 0.15, 0.12, 5000, 'highpass'); break
    case 'escudo-quebra': ruido(0, 0.45, 0.4, 6000, 'highpass', 2000, 0.8); [2600, 2100, 1700, 1300].forEach((f, i) => nota(varia(f, 0.1), i * 0.03, 0.18, 'triangle', 0.07)); break
    case 'cura': [523, 659, 784, 1047, 1319].forEach((f, i) => nota(f, i * 0.06, 0.55, 'sine', 0.08)); ruido(0, 0.6, 0.06, 6000, 'highpass'); break
    case 'combo': { const base = [784, 880, 988][sortear('combo', 3)]; nota(varia(base, 0.01), 0, 0.12, 'triangle', 0.1); nota(base * 1.5, 0.07, 0.22, 'triangle', 0.1); break }
    case 'derrota-inimigo': impacto(1.05, timbre); ruido(0.1, 1.2, 0.32, 900, 'lowpass', 120); [392, 523, 659, 784].forEach((f, i) => nota(f, 0.3 + i * 0.1, 0.6, 'triangle', 0.09)); break
    case 'vitoria-chefe': impacto(1.25); [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => nota(f, 0.25 + i * 0.13, 0.7, 'triangle', 0.1)); nota(131, 0.25, 2, 'sine', 0.16); abaixarMusica(0.1, 2500); break
    case 'derrota': [392, 330, 262, 196].forEach((f, i) => nota(f, i * 0.25, 0.7, 'sine', 0.12)); ruido(0, 1.4, 0.16, 400, 'lowpass', 80); abaixarMusica(0.1, 3000); break
    case 'poder': [587, 880, 1175].forEach((f, i) => nota(f, i * 0.07, 0.4, 'triangle', 0.09)); break
    case 'recompensa': ruido(0, 0.5, 0.12, 3000, 'highpass'); [659, 880, 1319].forEach((f, i) => nota(f, i * 0.09, 0.5, 'sine', 0.09)); break
    case 'evolucao': ruido(0, 1.2, 0.16, 400, 'lowpass', 6000); [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => nota(f, i * 0.09, 0.9, 'triangle', 0.08)); nota(65, 0, 1.6, 'sine', 0.2); abaixarMusica(0.15, 1800); break
    case 'pista': ruido(0, 0.35, 0.18, 2200, 'bandpass', 600, 1); nota(varia(988), 0.05, 0.25, 'sine', 0.07); break
    case 'fase': impacto(1.25); nota(55, 0, 1.4, 'sawtooth', 0.14, 41); ruido(0, 1.2, 0.28, 260, 'lowpass', 90); abaixarMusica(0.2, 1400); break
    case 'furia': nota(110, 0, 0.6, 'sawtooth', 0.12, 220); nota(116, 0, 0.6, 'sawtooth', 0.09, 233); break
    case 'lendario': [1047, 1319, 1568, 2093].forEach((f, i) => nota(f, i * 0.05, 0.6, 'sine', 0.06)); break
    case 'imortal': nota(262, 0, 1.2, 'sine', 0.14); [523, 784, 1047].forEach((f, i) => nota(f, 0.15 + i * 0.1, 0.9, 'triangle', 0.08)); break
  }
}

/** Ambiente em laço, com volume próprio. Troca suave entre cenas. */
export function tocarAmbiente(nome: Ambiente | null) {
  ambientePedido = nome
  if (!ctx || ctx.state !== 'running') return
  if (ambienteAtual?.nome === nome) return
  ambienteAtual?.parar()
  ambienteAtual = null
  if (!nome) return
  const b = bufRuido(); if (!b) return
  const t = ctx.currentTime
  const sai = ctx.createGain(); sai.gain.setValueAtTime(0.0001, t); sai.gain.exponentialRampToValueAtTime(1, t + 1.5); sai.connect(ambiente)
  const nos: AudioScheduledSourceNode[] = []
  const camada = (freq: number, q: number, ganho: number, lfo: number, tipo: BiquadFilterType = 'lowpass') => {
    const src = ctx!.createBufferSource(); src.buffer = b; src.loop = true
    const f = ctx!.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q
    const g = ctx!.createGain(); g.gain.value = ganho
    const o = ctx!.createOscillator(); o.frequency.value = lfo
    const og = ctx!.createGain(); og.gain.value = freq * 0.35
    o.connect(og); og.connect(f.frequency)
    src.connect(f); f.connect(g); g.connect(sai)
    src.start(t, Math.random() * 1.5); o.start(t)
    nos.push(src, o)
  }
  if (nome === 'campo') { camada(500, 0.6, 0.35, 0.08); camada(1600, 1.2, 0.06, 0.13, 'bandpass') }
  else if (nome === 'masmorra') { camada(160, 0.8, 0.5, 0.05); camada(2400, 3, 0.03, 0.4, 'bandpass') }
  else if (nome === 'salao') { camada(240, 0.7, 0.3, 0.06); camada(3000, 4, 0.025, 0.6, 'bandpass') }
  else { camada(300, 0.5, 0.18, 0.04); camada(3200, 5, 0.02, 0.7, 'bandpass') }
  // estalos de chama e madeira, pássaros no campo
  let vivo = true
  const detalhe = () => {
    if (!vivo || !ctx) return
    if (nome === 'campo') { if (Math.random() < 0.35) { const f = 2400 + Math.random() * 1600; nota(f, 0, 0.08, 'sine', 0.012, f * 1.3, false, sai); nota(f * 1.1, 0.1, 0.07, 'sine', 0.01, f * 1.4, false, sai) } }
    else { const k = Math.random(); ruido(0, 0.04 + k * 0.05, 0.03 + k * 0.04, 2000 + k * 2000, 'bandpass', undefined, 2, false, sai) }
    window.setTimeout(detalhe, 300 + Math.random() * 1600)
  }
  detalhe()
  ambienteAtual = {
    nome,
    parar: () => {
      vivo = false
      const t2 = ctx!.currentTime
      sai.gain.setTargetAtTime(0.0001, t2, 0.4)
      window.setTimeout(() => { nos.forEach((n) => { try { n.stop() } catch { /* já parado */ } }); sai.disconnect() }, 2000)
    },
  }
}

/* ------------------------------------------------------------ Música */

interface Tema {
  bpm: number
  /** Acordes (graus em semitons a partir da tônica), um por compasso. */
  acordes: number[][]
  tonica: number
  arpejo: 'colcheia' | 'semicolcheia' | 'piano'
  bateria: 'leve' | 'tensa' | 'epica' | null
  pad: OscillatorType
  brilhoPad: number
}

const TEMAS: Record<Musica, Tema> = {
  // aventura leve: Ré maior, I-vi-IV-V
  campo: { bpm: 96, tonica: 50, acordes: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], arpejo: 'colcheia', bateria: 'leve', pad: 'sawtooth', brilhoPad: 900 },
  // tensão: Ré menor, i-VI-iv-V
  masmorra: { bpm: 84, tonica: 50, acordes: [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -1, 2]], arpejo: 'semicolcheia', bateria: 'tensa', pad: 'sawtooth', brilhoPad: 600 },
  // cerimonial: Lá menor, i-VII-VI-V
  salao: { bpm: 100, tonica: 45, acordes: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], arpejo: 'colcheia', bateria: 'tensa', pad: 'sawtooth', brilhoPad: 800 },
  // estudo: Fá maior, piano calmo, sem bateria
  biblioteca: { bpm: 70, tonica: 53, acordes: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], arpejo: 'piano', bateria: null, pad: 'triangle', brilhoPad: 1400 },
  // chefe: Mi menor, i-VI-VII-V, rápido e com percussão épica
  chefe: { bpm: 136, tonica: 52, acordes: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], arpejo: 'semicolcheia', bateria: 'epica', pad: 'sawtooth', brilhoPad: 1300 },
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/** Toca o tema em laço com um agendador de antecipação (estável mesmo com a aba ocupada). */
export function tocarMusica(nome: Musica | null) {
  musicaPedida = nome
  if (!ctx || ctx.state !== 'running') return
  if (musicaAtual?.nome === nome) return
  musicaAtual?.parar()
  musicaAtual = null
  if (!nome) return
  const tema = TEMAS[nome]
  const c = ctx
  const sai = c.createGain(); sai.gain.setValueAtTime(0.0001, c.currentTime); sai.gain.exponentialRampToValueAtTime(1, c.currentTime + 2.5); sai.connect(musica)
  const eco = c.createDelay(1); eco.delayTime.value = (60 / tema.bpm) * 0.75
  const ecoG = c.createGain(); ecoG.gain.value = 0.22
  eco.connect(ecoG); ecoG.connect(eco); ecoG.connect(sai)
  const passo = 60 / tema.bpm / 4 // semicolcheia
  let proximo = c.currentTime + 0.1, n = 0, vivo = true

  const voz = (t: number, f: number, dur: number, tipo: OscillatorType, ganho: number, filtro?: number, comEco = false, ataque = 0.01) => {
    const o = c.createOscillator(), g = c.createGain()
    o.type = tipo; o.frequency.value = f
    let fim: AudioNode = o
    if (filtro) { const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filtro; o.connect(fl); fim = fl }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ganho, t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    fim.connect(g); g.connect(sai); if (comEco) g.connect(eco)
    o.start(t); o.stop(t + dur + 0.05)
  }
  const batida = (t: number, tipo: 'bumbo' | 'caixa' | 'chimbal' | 'tambor', ganho: number) => {
    if (tipo === 'bumbo' || tipo === 'tambor') {
      const o = c.createOscillator(), g = c.createGain()
      o.frequency.setValueAtTime(tipo === 'bumbo' ? 120 : 90, t); o.frequency.exponentialRampToValueAtTime(tipo === 'bumbo' ? 42 : 60, t + 0.18)
      g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (tipo === 'bumbo' ? 0.3 : 0.45))
      o.connect(g); g.connect(sai); o.start(t); o.stop(t + 0.5)
      return
    }
    const b = bufRuido(); if (!b) return
    const s = c.createBufferSource(); s.buffer = b
    const f = c.createBiquadFilter(); f.type = tipo === 'caixa' ? 'bandpass' : 'highpass'; f.frequency.value = tipo === 'caixa' ? 1800 : 7000; f.Q.value = tipo === 'caixa' ? 0.8 : 0.5
    const g = c.createGain(); g.gain.setValueAtTime(ganho, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (tipo === 'caixa' ? 0.18 : 0.05))
    s.connect(f); f.connect(g); g.connect(sai); s.start(t, Math.random()); s.stop(t + 0.25)
  }

  const agendar = () => {
    if (!vivo) return
    while (proximo < c.currentTime + 0.15) {
      const compasso = Math.floor(n / 16), dentro = n % 16
      const acorde = tema.acordes[compasso % tema.acordes.length]
      const raiz = tema.tonica + acorde[0]
      const t = proximo
      // acorde sustentado (pad) no começo do compasso
      if (dentro === 0) acorde.forEach((g) => { const f = hz(tema.tonica + g + 12); voz(t, f, passo * 16 * 1.05, tema.pad, 0.035, tema.brilhoPad, false, 0.4); voz(t, f * 1.004, passo * 16 * 1.05, tema.pad, 0.025, tema.brilhoPad, false, 0.5) })
      // baixo
      const baixo = tema.bateria === 'epica' ? dentro % 2 === 0 : tema.arpejo === 'piano' ? dentro === 0 || dentro === 8 : dentro % 4 === 0
      if (baixo) voz(t, hz(raiz - 12), passo * (tema.bateria === 'epica' ? 1.8 : 3.5), 'triangle', tema.bateria === 'epica' ? 0.16 : 0.13, 600)
      // arpejo
      const notas = [...acorde, acorde[0] + 12, acorde[1] + 12]
      if (tema.arpejo === 'piano') {
        if (dentro % 2 === 0) { const g = notas[(dentro / 2 + compasso) % notas.length]; voz(t, hz(tema.tonica + g + 12), 1.2, 'triangle', 0.05, 2200, true, 0.004); voz(t, hz(tema.tonica + g + 24), 0.6, 'sine', 0.015, undefined, true, 0.004) }
      } else if (tema.arpejo === 'colcheia') {
        if (dentro % 2 === 0) voz(t, hz(tema.tonica + notas[(dentro / 2) % notas.length] + 24), passo * 1.8, 'triangle', 0.035, 2600, true, 0.005)
      } else {
        const g = notas[(dentro * 3 + compasso) % notas.length]
        voz(t, hz(tema.tonica + g + 24), passo * 1.2, 'square', 0.014, 2200, true, 0.004)
      }
      // metais no chefe: acorde marcado no tempo 1 de cada compasso par
      if (tema.bateria === 'epica' && dentro === 0 && compasso % 2 === 0) acorde.forEach((g) => voz(t, hz(tema.tonica + g), passo * 6, 'sawtooth', 0.05, 1800, false, 0.02))
      // percussão
      if (tema.bateria === 'leve') { if (dentro === 0 || dentro === 8) batida(t, 'bumbo', 0.22); if (dentro % 4 === 2) batida(t, 'chimbal', 0.035) }
      else if (tema.bateria === 'tensa') { if (dentro === 0 || dentro === 10) batida(t, 'tambor', 0.28); if (dentro === 8) batida(t, 'caixa', 0.06); if (dentro % 2 === 1) batida(t, 'chimbal', 0.02) }
      else if (tema.bateria === 'epica') { if (dentro % 4 === 0) batida(t, 'bumbo', 0.3); if (dentro === 4 || dentro === 12) batida(t, 'caixa', 0.12); batida(t, 'chimbal', dentro % 2 ? 0.02 : 0.035); if (compasso % 4 === 3 && dentro >= 12) batida(t, 'tambor', 0.2) }
      proximo += passo; n++
    }
  }
  const relogio = window.setInterval(agendar, 40)
  agendar()
  musicaAtual = {
    nome,
    parar: () => {
      vivo = false
      window.clearInterval(relogio)
      sai.gain.setTargetAtTime(0.0001, c.currentTime, 0.5)
      window.setTimeout(() => { sai.disconnect(); ecoG.disconnect() }, 3000)
    },
  }
}
