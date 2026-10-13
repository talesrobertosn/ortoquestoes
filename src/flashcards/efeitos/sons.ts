/**
 * Identidade sonora do Torneio, sintetizada na hora com Web Audio (nenhum
 * arquivo, nenhuma licença de terceiros). Cada som é feito de camadas (ataque,
 * corpo, cauda), passa por um barramento de efeitos com reverberação curta e
 * varia um pouco de altura a cada vez, para não soar repetido.
 * Ambiente (vento, chamas, sala) num barramento separado, com volume próprio.
 * O navegador só deixa tocar depois do primeiro toque ou tecla: `destravar()`.
 */

export type Som =
  | 'hover' | 'selecao' | 'giro' | 'compra' | 'confirmar' | 'abrir' | 'fechar' | 'transicao'
  | 'carga' | 'disparo' | 'impacto-leve' | 'impacto-medio' | 'impacto-forte' | 'critico'
  | 'erro' | 'preparo-inimigo' | 'golpe-inimigo' | 'dano' | 'escudo' | 'escudo-quebra' | 'cura'
  | 'combo' | 'derrota-inimigo' | 'vitoria-chefe' | 'derrota' | 'poder' | 'recompensa' | 'pista'
  | 'fase' | 'furia' | 'lendario' | 'imortal'

export type Ambiente = 'campo' | 'masmorra' | 'salao' | 'biblioteca'

let ctx: AudioContext | null = null
let mestre: GainNode, efeitos: GainNode, ambiente: GainNode, reverb: ConvolverNode, envio: GainNode, compressor: DynamicsCompressorNode
let ligado = true
let volEfeitos = 0.7, volAmbiente = 0.35
let ambienteAtual: { nome: Ambiente; parar: () => void } | null = null
let ambientePedido: Ambiente | null = null

function criar() {
  if (ctx) return
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new C()
  } catch { ctx = null; return }
  compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = -14; compressor.ratio.value = 4; compressor.attack.value = 0.003; compressor.release.value = 0.2
  mestre = ctx.createGain(); mestre.connect(compressor); compressor.connect(ctx.destination)
  efeitos = ctx.createGain(); efeitos.connect(mestre)
  ambiente = ctx.createGain(); ambiente.connect(mestre)
  // reverberação curta de sala de pedra (resposta gerada por ruído decaindo)
  reverb = ctx.createConvolver()
  const dur = 1.1, n = Math.floor(ctx.sampleRate * dur)
  const ir = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2) }
  reverb.buffer = ir
  envio = ctx.createGain(); envio.gain.value = 0.22
  envio.connect(reverb); reverb.connect(efeitos)
  aplicarVolumes()
}

function aplicarVolumes() {
  if (!ctx) return
  const t = ctx.currentTime
  mestre.gain.setTargetAtTime(ligado ? 1 : 0, t, 0.03)
  efeitos.gain.setTargetAtTime(volEfeitos * 0.9, t, 0.03)
  ambiente.gain.setTargetAtTime(volAmbiente * 0.5, t, 0.3)
}

export function configurarSom(o: { ligado: boolean; efeitos: number; ambiente: number }) {
  ligado = o.ligado; volEfeitos = o.efeitos; volAmbiente = o.ambiente
  aplicarVolumes()
}

/** Chamar num toque ou tecla: cria o contexto e retoma o ambiente pedido. */
export function destravar() {
  criar()
  if (ctx?.state === 'suspended') void ctx.resume()
  if (ambientePedido && (!ambienteAtual || ambienteAtual.nome !== ambientePedido)) tocarAmbiente(ambientePedido)
}

export function somDisponivel() { return !!ctx && ctx.state === 'running' }

const varia = (v: number, k = 0.06) => v * (1 + (Math.random() * 2 - 1) * k)

function nota(freq: number, inicio: number, dur: number, tipo: OscillatorType = 'sine', ganho = 0.3, ate?: number, eco = true) {
  if (!ctx) return
  const t = ctx.currentTime + inicio
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = tipo
  o.frequency.setValueAtTime(freq, t)
  if (ate) o.frequency.exponentialRampToValueAtTime(Math.max(20, ate), t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(ganho, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(efeitos); if (eco) g.connect(envio)
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

function ruido(inicio: number, dur: number, ganho: number, freq: number, tipo: BiquadFilterType = 'lowpass', ate?: number, q = 0.8, eco = true) {
  if (!ctx) return
  const b = bufRuido(); if (!b) return
  const t = ctx.currentTime + inicio
  const src = ctx.createBufferSource(); src.buffer = b
  const f = ctx.createBiquadFilter(); f.type = tipo; f.Q.value = q
  f.frequency.setValueAtTime(freq, t); if (ate) f.frequency.exponentialRampToValueAtTime(Math.max(30, ate), t + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ganho, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f); f.connect(g); g.connect(efeitos); if (eco) g.connect(envio)
  src.start(t, Math.random()); src.stop(t + dur + 0.05)
}

/** Impacto em camadas: estalo, corpo grave e cauda; a força escala tudo. */
function impacto(forca: number) {
  ruido(0, 0.05, 0.5 * forca, 4000, 'highpass', undefined, 0.7, false)       // estalo
  nota(varia(90 + 30 * forca), 0, 0.25 + 0.15 * forca, 'sine', 0.55 * forca, 38) // corpo grave
  ruido(0, 0.3 + 0.25 * forca, 0.4 * forca, 1400, 'lowpass', 160)            // pedra e poeira
  if (forca > 0.8) nota(varia(1500), 0.01, 0.35, 'triangle', 0.08, 900)        // brilho mágico
}

export function tocar(som: Som, forca = 1) {
  if (!ligado || !ctx || ctx.state !== 'running') return
  switch (som) {
    case 'hover': nota(varia(1800, 0.1), 0, 0.05, 'sine', 0.025, undefined, false); break
    case 'selecao': ruido(0, 0.08, 0.08, 3000, 'bandpass', 5000, 2); nota(varia(880), 0, 0.12, 'triangle', 0.07); break
    case 'giro': ruido(0, 0.22, 0.09, 1200, 'bandpass', 4200, 1.2); break
    case 'compra': ruido(0, 0.25, 0.12, 800, 'bandpass', 3600, 1); nota(varia(520), 0.12, 0.1, 'triangle', 0.04); break
    case 'confirmar': nota(varia(660), 0, 0.09, 'triangle', 0.1); nota(varia(990), 0.06, 0.16, 'triangle', 0.09); break
    case 'abrir': ruido(0, 0.6, 0.1, 300, 'lowpass', 2400); [392, 523, 659].forEach((f, i) => nota(f, 0.1 + i * 0.07, 0.5, 'sine', 0.06)); break
    case 'fechar': ruido(0, 0.4, 0.08, 2400, 'lowpass', 300); nota(392, 0.05, 0.3, 'sine', 0.05); break
    case 'transicao': ruido(0, 0.9, 0.18, 200, 'lowpass', 1800); nota(55, 0, 0.9, 'sine', 0.12); break
    case 'carga': nota(varia(220), 0, 0.32, 'sawtooth', 0.05, 880); ruido(0, 0.32, 0.07, 600, 'bandpass', 5200, 3); break
    case 'disparo': ruido(0, 0.36, 0.22 * forca, 2400, 'bandpass', 600, 1.4); nota(varia(700), 0, 0.3, 'triangle', 0.06, 260); break
    case 'impacto-leve': impacto(0.5); break
    case 'impacto-medio': impacto(0.8); break
    case 'impacto-forte': impacto(1.1); break
    case 'critico': impacto(1.3); [784, 1175, 1568].forEach((f, i) => nota(f, 0.04 + i * 0.05, 0.4, 'triangle', 0.07)); break
    case 'erro': nota(varia(233), 0, 0.16, 'square', 0.05); nota(varia(185), 0.1, 0.32, 'square', 0.05); break
    case 'preparo-inimigo': nota(varia(70), 0, 0.4, 'sawtooth', 0.12, 140); ruido(0, 0.4, 0.12, 300, 'lowpass', 900); break
    case 'golpe-inimigo': ruido(0, 0.28, 0.3, 1800, 'bandpass', 400, 1.2); nota(varia(160), 0, 0.2, 'sawtooth', 0.08, 70); break
    case 'dano': impacto(0.9); nota(varia(110), 0.02, 0.4, 'square', 0.06, 55); break
    case 'escudo': nota(varia(1320), 0, 0.5, 'sine', 0.12); nota(varia(1980), 0.01, 0.4, 'sine', 0.07); ruido(0, 0.15, 0.1, 5000, 'highpass'); break
    case 'escudo-quebra': ruido(0, 0.45, 0.35, 6000, 'highpass', 2000, 0.8); [2600, 2100, 1700, 1300].forEach((f, i) => nota(varia(f, 0.1), i * 0.03, 0.18, 'triangle', 0.06)); break
    case 'cura': [523, 659, 784, 1047, 1319].forEach((f, i) => nota(f, i * 0.06, 0.55, 'sine', 0.07)); ruido(0, 0.6, 0.05, 6000, 'highpass'); break
    case 'combo': nota(varia(784), 0, 0.12, 'triangle', 0.08); nota(varia(1175), 0.07, 0.2, 'triangle', 0.08); break
    case 'derrota-inimigo': impacto(1); ruido(0.1, 1.2, 0.3, 900, 'lowpass', 120); [392, 523, 659, 784].forEach((f, i) => nota(f, 0.3 + i * 0.1, 0.6, 'triangle', 0.08)); break
    case 'vitoria-chefe': impacto(1.2); [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => nota(f, 0.25 + i * 0.13, 0.7, 'triangle', 0.09)); nota(131, 0.25, 2, 'sine', 0.15); break
    case 'derrota': [392, 330, 262, 196].forEach((f, i) => nota(f, i * 0.25, 0.7, 'sine', 0.1)); ruido(0, 1.4, 0.15, 400, 'lowpass', 80); break
    case 'poder': [587, 880, 1175].forEach((f, i) => nota(f, i * 0.07, 0.4, 'triangle', 0.08)); break
    case 'recompensa': ruido(0, 0.5, 0.1, 3000, 'highpass'); [659, 880, 1319].forEach((f, i) => nota(f, i * 0.09, 0.5, 'sine', 0.07)); break
    case 'pista': ruido(0, 0.35, 0.16, 2200, 'bandpass', 600, 1); nota(varia(988), 0.05, 0.25, 'sine', 0.06); break
    case 'fase': impacto(1.2); nota(55, 0, 1.4, 'sawtooth', 0.12, 41); ruido(0, 1.2, 0.25, 260, 'lowpass', 90); break
    case 'furia': nota(110, 0, 0.6, 'sawtooth', 0.1, 220); nota(116, 0, 0.6, 'sawtooth', 0.08, 233); break
    case 'lendario': [1047, 1319, 1568, 2093].forEach((f, i) => nota(f, i * 0.05, 0.6, 'sine', 0.05)); break
    case 'imortal': nota(262, 0, 1.2, 'sine', 0.12); [523, 784, 1047].forEach((f, i) => nota(f, 0.15 + i * 0.1, 0.9, 'triangle', 0.07)); break
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
  const saida = ctx.createGain(); saida.gain.setValueAtTime(0.0001, t); saida.gain.exponentialRampToValueAtTime(1, t + 1.5); saida.connect(ambiente)
  const nos: AudioScheduledSourceNode[] = []
  const camada = (freq: number, q: number, ganho: number, lfo: number, tipo: BiquadFilterType = 'lowpass') => {
    const src = ctx!.createBufferSource(); src.buffer = b; src.loop = true
    const f = ctx!.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q
    const g = ctx!.createGain(); g.gain.value = ganho
    const o = ctx!.createOscillator(); o.frequency.value = lfo
    const og = ctx!.createGain(); og.gain.value = freq * 0.35
    o.connect(og); og.connect(f.frequency)
    src.connect(f); f.connect(g); g.connect(saida)
    src.start(t, Math.random() * 1.5); o.start(t)
    nos.push(src, o)
  }
  if (nome === 'campo') { camada(500, 0.6, 0.35, 0.08); camada(1600, 1.2, 0.06, 0.13, 'bandpass') }
  else if (nome === 'masmorra') { camada(160, 0.8, 0.5, 0.05); camada(2400, 3, 0.03, 0.4, 'bandpass') }
  else if (nome === 'salao') { camada(240, 0.7, 0.3, 0.06); camada(3000, 4, 0.025, 0.6, 'bandpass') }
  else { camada(300, 0.5, 0.18, 0.04); camada(3200, 5, 0.02, 0.7, 'bandpass') }
  // estalos de chama e madeira, de vez em quando
  let vivo = true
  const estalos = () => {
    if (!vivo || !ctx) return
    if (nome !== 'campo') { const k = Math.random(); ruido(0, 0.04 + k * 0.05, 0.04 + k * 0.05, 2000 + k * 2000, 'bandpass', undefined, 2, false) }
    window.setTimeout(estalos, 300 + Math.random() * 1400)
  }
  estalos()
  ambienteAtual = {
    nome,
    parar: () => {
      vivo = false
      const t2 = ctx!.currentTime
      saida.gain.setTargetAtTime(0.0001, t2, 0.4)
      window.setTimeout(() => { nos.forEach((n) => { try { n.stop() } catch { /* já parado */ } }); saida.disconnect() }, 2000)
    },
  }
}
