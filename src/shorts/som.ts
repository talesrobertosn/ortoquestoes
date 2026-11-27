/*
 * Os sons dos Shorts. Composição própria, sintetizada no navegador (sem arquivo de áudio de terceiros).
 * - Acerto (26/11/2026, pedido do Tales: "um som bonitinho, de achar um baú, baixinho"): uma subida curta em ré maior
 *   com timbre de sininho e harpa, que termina num acorde que brilha e se apaga devagar, com um eco suave.
 *   A recompensa cresce com a sequência: 3 seguidas ganham uma nota a mais no alto; 5 ou mais, um brilho que desce.
 *   "Fixou!" (acertou a revisão surpresa) tem a versão do baú especial: duas notas de abertura antes da subida.
 * - Erro (27/11/2026, pedido do Tales: "bem rapidinho, bem simples, bem curto, pouco peso"): duas notinhas de
 *   videogame que descem (um "tóin-tóin" de 0,2 s), mais baixas que o acerto e sem eco.
 * - Celular (27/11/2026): antes o som pedia a sessão "ambient", que no iPhone obedece à chave do silencioso, e por
 *   isso não tocava no celular. Agora segue o que já funciona na Biblioteca e nos Flashcards: dentro do toque da
 *   pessoa, pede a sessão "playback", retoma o contexto (também do estado "interrupted" depois de bloquear a tela) e
 *   toca uma amostra de silêncio, que é o que o iOS exige para liberar o som. No alto-falante do celular o volume é
 *   um pouco maior, com um compressor para nada estourar. Desligar fica nos ajustes dos Shorts.
 */

let contexto: AudioContext | null = null
let saida: GainNode | null = null
let seco: GainNode | null = null

const toque = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches
/** Volume geral (0 a 1). Baixo de propósito no computador; um pouco maior no alto-falante do celular. */
const VOLUME = toque ? 0.22 : 0.09
const RE5 = 587.33
const nota = (semitons: number) => RE5 * Math.pow(2, semitons / 12)

function preparar(): { ctx: AudioContext; destino: GainNode; seco: GainNode } | null {
  try {
    if (!contexto) {
      const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Contexto) return null
      contexto = new Contexto()
      const comp = contexto.createDynamicsCompressor()
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2
      comp.connect(contexto.destination)
      saida = contexto.createGain()
      saida.gain.value = VOLUME
      seco = contexto.createGain()
      seco.gain.value = VOLUME
      // Eco suave: duas repetições curtas e abafadas, como o som se espalhando numa sala de pedra.
      const eco = contexto.createDelay(1)
      eco.delayTime.value = 0.16
      const volta = contexto.createGain()
      volta.gain.value = 0.28
      const abafar = contexto.createBiquadFilter()
      abafar.type = 'lowpass'
      abafar.frequency.value = 2600
      const corteGrave = contexto.createBiquadFilter()
      corteGrave.type = 'highpass'
      corteGrave.frequency.value = 280
      saida.connect(corteGrave)
      corteGrave.connect(comp)
      corteGrave.connect(eco)
      eco.connect(abafar)
      abafar.connect(volta)
      volta.connect(eco)
      volta.connect(comp)
      // O erro sai seco (sem eco), para ser curtinho.
      seco.connect(comp)
      const ctx = contexto
      document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx.state !== 'running') void ctx.resume().catch(() => undefined) })
    }
    destravar(contexto)
    return { ctx: contexto, destino: saida!, seco: seco! }
  } catch {
    return null
  }
}

/** Dentro do toque: sessão "playback" no iPhone (toca mesmo no silencioso), amostra de silêncio e retomada. */
function destravar(ctx: AudioContext) {
  try {
    const sessao = (navigator as unknown as { audioSession?: { type: string } }).audioSession
    if (sessao && sessao.type !== 'playback') sessao.type = 'playback'
  } catch { /* navegador sem audioSession */ }
  try {
    const b = ctx.createBuffer(1, 1, ctx.sampleRate), f = ctx.createBufferSource()
    f.buffer = b; f.connect(ctx.destination); f.start(0)
  } catch { /* o silêncio é só o empurrão */ }
  if (ctx.state !== 'running') void ctx.resume().catch(() => undefined)
}

/** Uma nota de sininho: fundamental em seno, um harmônico em triângulo e um parcial de sino que some rápido. */
function sininho(ctx: BaseAudioContext, destino: AudioNode, freq: number, inicio: number, duracao: number, forca = 1) {
  const parciais: Array<[number, OscillatorType, number, number]> = [
    [1, 'sine', 1, duracao],
    [2, 'triangle', 0.22, duracao * 0.55],
    [2.76, 'sine', 0.12, duracao * 0.3], // o "brilho" de sino, inarmônico e curto
  ]
  for (const [razao, tipo, peso, dur] of parciais) {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = tipo
    osc.frequency.value = freq * razao
    env.gain.setValueAtTime(0.0001, inicio)
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.9 * peso * forca), inicio + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, inicio + dur)
    osc.connect(env)
    env.connect(destino)
    osc.start(inicio)
    osc.stop(inicio + dur + 0.05)
  }
}

export interface OpcoesAcerto {
  /** Acertos seguidos, contando este. */
  sequencia?: number
  /** Acertou uma revisão surpresa. */
  fixou?: boolean
}

/** Toca o som de acerto. Chamar dentro do toque da pessoa. Silencioso se o navegador não deixar. */
export function tocarAcerto(opcoes: OpcoesAcerto = {}) {
  const pronto = preparar()
  if (!pronto) return
  compor(pronto.ctx, pronto.destino, pronto.ctx.currentTime + 0.02, opcoes)
}

/** Monta as notas a partir de `t` (também serve para gravar uma prévia num OfflineAudioContext). */
export function compor(ctx: BaseAudioContext, destino: AudioNode, inicio: number, { sequencia = 1, fixou = false }: OpcoesAcerto = {}) {
  let t = inicio
  // Abertura do "baú especial": duas notas que pedem a resolução.
  if (fixou) {
    sininho(ctx, destino, nota(-5), t, 0.35, 0.7)
    sininho(ctx, destino, nota(-3), t + 0.11, 0.35, 0.75)
    t += 0.24
  }
  // A subida: ré, fá#, lá, dó#, mi (um arpejo de ré maior com nona), rápida e leve.
  const subida = [0, 4, 7, 11, 14]
  if (sequencia >= 3) subida.push(16)
  subida.forEach((s, i) => sininho(ctx, destino, nota(s), t + i * 0.068, 0.42, 0.62 + i * 0.05))
  const fim = t + subida.length * 0.068 + 0.04
  // O acorde que brilha: ré, fá#, lá uma oitava acima, longo, com a quinta no alto.
  for (const [s, forca] of [[12, 0.75], [16, 0.55], [19, 0.6], [24, fixou ? 0.5 : 0.32]] as const) {
    sininho(ctx, destino, nota(s), fim, fixou ? 1.6 : 1.25, forca)
  }
  // Cinco ou mais seguidas: um brilho que desce por cima, como pó de estrela.
  if (sequencia >= 5) {
    ;[28, 26, 24, 21, 19].forEach((s, i) => sininho(ctx, destino, nota(s), fim + 0.12 + i * 0.05, 0.3, 0.28))
  }
}

/** Toca o som de erro: curtinho e leve. Chamar dentro do toque da pessoa. */
export function tocarErro() {
  const pronto = preparar()
  if (!pronto) return
  comporErro(pronto.ctx, pronto.seco, pronto.ctx.currentTime + 0.02)
}

/** Duas notinhas que descem (si para fá, 0,2 s no total), em onda triangular abafada: um "tóin-tóin" de videogame. */
export function comporErro(ctx: BaseAudioContext, destino: AudioNode, inicio: number) {
  const filtro = ctx.createBiquadFilter()
  filtro.type = 'lowpass'
  filtro.frequency.value = 1800
  filtro.connect(destino)
  for (const [freq, t, dur, forca] of [[493.88, 0, 0.08, 0.55], [349.23, 0.085, 0.13, 0.5]] as const) {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, inicio + t)
    // Uma caidinha no fim de cada nota, como o "bonk" dos jogos antigos.
    osc.frequency.exponentialRampToValueAtTime(freq * 0.94, inicio + t + dur)
    env.gain.setValueAtTime(0.0001, inicio + t)
    env.gain.exponentialRampToValueAtTime(forca, inicio + t + 0.006)
    env.gain.exponentialRampToValueAtTime(0.0001, inicio + t + dur)
    osc.connect(env)
    env.connect(filtro)
    osc.start(inicio + t)
    osc.stop(inicio + t + dur + 0.03)
  }
}
