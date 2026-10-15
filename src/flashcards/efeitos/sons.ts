import { misturaBiblioteca, faseDaFaixa, suavizarEmenda } from './mixBiblioteca'
import { carregarAudioArquivo } from './audioArquivo'
/**
 * Identidade sonora do Torneio, sintetizada na hora com Web Audio (nenhum
 * arquivo, nenhuma licença de terceiros, nenhuma trilha de outro jogo).
 *
 * Mixagem: efeitos, ambiente e música em barramentos separados → compressor
 * de cola → ganho de saída → limitador → volume geral. O volume fica no fim da
 * cadeia (15/10/2026): antes ele entrava antes do compressor, que "levantava" o
 * som de novo, e 20% soava quase como 100%.
 *
 * Variedade: cada impacto tem quatro receitas (pedra, metal, abafado, mágico),
 * sorteadas sem repetir a anterior, com variação de altura e intensidade.
 * Os golpes dos adversários têm timbre próprio (Golem, Serpente, Guardião).
 *
 * Música: sequenciador procedural com temas por cenário e um tema de chefe
 * (acordes, baixo, arpejo e percussão), que abaixa sozinho nos golpes fortes.
 * O navegador só deixa tocar depois do primeiro toque ou tecla: `destravar()`.
 */

import { recurso } from '../../config'
import { ler } from '../../estado/armazenamento'

export type Som =
  | 'hover' | 'selecao' | 'giro' | 'compra' | 'confirmar' | 'abrir' | 'fechar' | 'transicao'
  | 'carga' | 'disparo' | 'impacto-leve' | 'impacto-medio' | 'impacto-forte' | 'critico'
  | 'erro' | 'preparo-inimigo' | 'golpe-inimigo' | 'dano' | 'escudo' | 'escudo-quebra' | 'cura'
  | 'combo' | 'derrota-inimigo' | 'vitoria-chefe' | 'derrota' | 'poder' | 'recompensa' | 'pista'
  | 'fase' | 'furia' | 'lendario' | 'imortal' | 'veneno' | 'evolucao' | 'acerto'
  | 'raio' | 'moedas' | 'queimadura' | 'divide' | 'roubo' | 'ajuda' | 'porta' | 'sino' | 'sopro' | 'renascer' | 'compra-loja'
  | 'espada-gigante' | 'pedregulho' | 'mandibula' | 'carregado'
  | 'jingle-vitoria' | 'jingle-derrota' | 'jingle-tesouro' | 'jingle-patamar' | 'jingle-topo' | 'jingle-chefe'

export type Ambiente = 'chuva' | 'campo' | 'masmorra' | 'salao' | 'biblioteca' | 'covil' | 'torre'
  | 'forja' | 'coliseu' | 'jardim' | 'laboratorio' | 'caverna' | 'templo' | 'passarela' | 'catacumba' | 'treino' | 'arquivo'
export type Musica = Exclude<Ambiente, 'chuva'> | 'chefe' | 'elite' | 'loja' | 'sabio' | 'entrada' | 'dragao'
/** Timbre do golpe de cada adversário. */
export type Timbre = string | undefined
/**
 * Família sonora de cada adversário. Os arquétipos novos herdam uma receita
 * próxima (o Leviatã chicoteia como serpente, o Ent pesa como golem) ou ganham
 * a sua: asas (alado), ossos que estalam, lamento espectral, quitina de inseto.
 */
const FAMILIA_SOM: Record<string, string> = {
  corvo: 'alado', morcego: 'alado', harpia: 'alado', esqueleto: 'osso', espectro: 'espectral',
  cavaleiro: 'guardiao', rei: 'guardiao', arconte: 'guardiao', mao: 'serpente', leviata: 'serpente',
  aranha: 'inseto', escaravelho: 'inseto', goblin: 'raptor', quimera: 'dragao', ent: 'golem', cogumelo: 'gosma',
}
const familiaSom = (t: Timbre) => (t && FAMILIA_SOM[t]) || t

let ctx: AudioContext | null = null
let saida: GainNode, mestre: GainNode, efeitos: GainNode, ambiente: GainNode, musica: GainNode, reverb: ConvolverNode, envio: GainNode
let ligado = true
/**
 * Volume geral: 30% na primeira vez, na escala nova (pedido do Tales, 15/10/2026: "som muito alto,
 * deixar nativamente mais baixo"); depois vale o que a pessoa escolheu, salvo nos ajustes
 * ('flashcards:ajustes', campo volume, com escalaVolume 2) e lido de novo a cada entrada.
 * Volumes salvos na escala antiga (antes do compressor) não valem mais: recomeçam do inicial.
 */
export const VOLUME_INICIAL = 0.3
export const ESCALA_VOLUME = 2
function volumeSalvo(): number {
  const a = ler<{ volume?: unknown; escalaVolume?: unknown }>('flashcards:ajustes', {})
  const v = a.volume
  return a.escalaVolume === ESCALA_VOLUME && typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : VOLUME_INICIAL
}
/** O ouvido percebe volume em escala logarítmica: o quadrado faz 50% soar como "metade". */
const curvaVolume = (v: number) => v * v
let volumeGeral = volumeSalvo()
let volEfeitos = 0.7, volAmbiente = 0.35, volMusica = 0.45
let ambienteAtual: { nome: Ambiente; parar: () => void } | null = null
let ambientePedido: Ambiente | null = null
let musicaAtual: { nome: Musica; parar: () => void; procedural?: boolean; inicio?: number; duracao?: number } | null = null
let musicaPedida: Musica | null = null
let filtroMusica: BiquadFilterNode
let climaMusical: string | null = null, leituraMusicalTranquila = false
let coralAtual: { fonte: AudioBufferSourceNode; ganho: GainNode; inicio: number } | null = null

function pararCoral() {
  const c = coralAtual; coralAtual = null
  if (!c || !ctx) return
  c.ganho.gain.setTargetAtTime(.0001, ctx.currentTime, .25)
  c.fonte.onended = () => c.ganho.disconnect()
  c.fonte.stop(ctx.currentTime + 1.5)
}

function aplicarClimaMusical() {
  if (!ctx || !filtroMusica) return
  const mix = misturaBiblioteca(climaMusical, leituraMusicalTranquila)
  filtroMusica.frequency.setTargetAtTime(mix.corte, ctx.currentTime, .45)
  if (!mix.coral || musicaAtual?.nome !== 'biblioteca' || typeof musicaAtual.inicio !== 'number') { pararCoral(); return }
  if (coralAtual?.inicio === musicaAtual.inicio) return
  void carregarFaixa('biblioteca-coral').then(b => {
    if (!b || !ctx || !misturaBiblioteca(climaMusical, leituraMusicalTranquila).coral || musicaAtual?.nome !== 'biblioteca' || typeof musicaAtual.inicio !== 'number' || coralAtual?.inicio === musicaAtual.inicio) return
    pararCoral()
    const duracao = Math.min(b.duration, musicaAtual.duracao ?? b.duration)
    const fonte = ctx.createBufferSource(), ganho = ctx.createGain()
    fonte.buffer = b; fonte.loop = true; fonte.loopEnd = duracao
    ganho.gain.setValueAtTime(.0001, ctx.currentTime); ganho.gain.exponentialRampToValueAtTime(.16, ctx.currentTime + 1.4)
    fonte.connect(ganho); ganho.connect(musica)
    fonte.start(ctx.currentTime, faseDaFaixa(musicaAtual.inicio, ctx.currentTime, duracao))
    coralAtual = { fonte, ganho, inicio: musicaAtual.inicio }
  })
}

export function configurarClimaBiblioteca(clima: string | null, tranquilo = false) {
  climaMusical = clima; leituraMusicalTranquila = tranquilo; aplicarClimaMusical()
}

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
  mestre = ctx.createGain(); mestre.gain.value = 0
  saida.connect(cola); cola.connect(ganhoSaida); ganhoSaida.connect(limitador); limitador.connect(mestre); mestre.connect(ctx.destination)
  efeitos = ctx.createGain(); efeitos.connect(saida)
  ambiente = ctx.createGain(); ambiente.connect(saida)
  musica = ctx.createGain(); filtroMusica = ctx.createBiquadFilter(); filtroMusica.type = 'lowpass'; filtroMusica.Q.value = .5; musica.connect(filtroMusica); filtroMusica.connect(saida)
  // reverberação de sala de pedra (resposta gerada por ruído decaindo)
  reverb = ctx.createConvolver()
  const dur = 1.4, n = Math.floor(ctx.sampleRate * dur)
  const ir = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3) }
  reverb.buffer = ir
  envio = ctx.createGain(); envio.gain.value = 0.24
  envio.connect(reverb); reverb.connect(efeitos)
  aplicarVolumes()
  aplicarClimaMusical()
}

export const volumeDaSessao = () => volumeGeral
/** Ao sair e voltar, retoma o volume salvo (ou o inicial). */
export function reiniciarVolume() { volumeGeral = volumeSalvo(); aplicarVolumes() }

function aplicarVolumes() {
  if (!ctx) return
  const t = ctx.currentTime
  mestre.gain.setTargetAtTime(ligado ? curvaVolume(volumeGeral) : 0, t, 0.03)
  efeitos.gain.setTargetAtTime(volEfeitos, t, 0.03)
  ambiente.gain.setTargetAtTime(volAmbiente * 0.6, t, 0.3)
  // A música fica sempre bem abaixo dos efeitos (pedido do Tales, 15/10/2026: "música sempre mais baixa").
  musica.gain.setTargetAtTime(volMusica * 0.3, t, 0.3)
}

export function configurarSom(o: { ligado: boolean; efeitos: number; ambiente: number; musica?: number; volume?: number }) {
  if (o.volume !== undefined) volumeGeral = Math.max(0,Math.min(1,o.volume))
  ligado = o.ligado; volEfeitos = o.efeitos; volAmbiente = o.ambiente
  if (o.musica !== undefined) volMusica = o.musica
  aplicarVolumes()
}

/**
 * Chamar DENTRO de um gesto (toque, clique ou tecla): cria o contexto, retoma e
 * toca um silêncio de 1 amostra (o iOS só libera o Web Audio assim).
 * Correção do beta (13/10/2026): no celular o som não destravava porque o
 * gatilho era só `pointerdown`, que com o dedo não conta como gesto; e depois de
 * minimizar ou bloquear a tela o contexto ficava "interrupted" para sempre.
 */
export function destravar() {
  criar()
  if (!ctx) { falhaSom = 'sem-suporte'; return }
  try {
    // iOS 17+: tocar mesmo com a chave do silencioso (só depois de a pessoa escolher entrar com som)
    const sessao = (navigator as unknown as { audioSession?: { type: string } }).audioSession
    if (sessao && ligado) sessao.type = 'playback'
  } catch { /* navegador sem audioSession */ }
  try {
    const b = ctx.createBuffer(1, 1, ctx.sampleRate), f = ctx.createBufferSource()
    f.buffer = b; f.connect(ctx.destination); f.start(0)
  } catch { /* silêncio é só o empurrão; seguir */ }
  if (ctx.state !== 'running') {
    void ctx.resume().then(() => { falhaSom = null; retomar() }).catch(() => { falhaSom = 'bloqueado' })
  }
  retomar()
}

/** Por que o som não está tocando: sem suporte, bloqueado pelo navegador (falta um toque) ou faixa que não carregou. */
let falhaSom: 'sem-suporte' | 'bloqueado' | 'carregamento' | null = null
export function estadoDoSom(): 'ativo' | 'aguardando-toque' | 'sem-suporte' | 'carregamento' {
  if (falhaSom === 'sem-suporte') return 'sem-suporte'
  if (!ctx || ctx.state !== 'running') return 'aguardando-toque'
  return falhaSom === 'carregamento' ? 'carregamento' : 'ativo'
}

/**
 * Instala uma vez, na janela, o destrave por gesto e a pausa por visibilidade.
 * Cada toque tenta destravar enquanto o contexto não estiver tocando (não só o
 * primeiro), e nada mais acontece quando já está tocando. Ao esconder a aba, o
 * contexto é suspenso (sem trilha acumulada); ao voltar, tenta retomar, e se o
 * navegador exigir um toque, o próximo toque resolve.
 */
let instalado = false
export function instalarDestrave() {
  if (instalado || typeof window === 'undefined') return
  instalado = true
  const tentar = () => { if (!ctx || ctx.state !== 'running') destravar() }
  for (const tipo of ['pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(tipo, tentar, { capture: true, passive: true })
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend().catch(() => undefined)
    else if (ctx.state !== 'running') void ctx.resume().then(() => retomar()).catch(() => undefined)
  })
  window.addEventListener('pageshow', () => { if (ctx && ctx.state !== 'running') void ctx.resume().then(() => retomar()).catch(() => undefined) })
}
function retomar() {
  if (!ctx || ctx.state !== 'running') return
  preCarregarTrilha()
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
function impacto(forca: number, t?: Timbre) {
  const timbre = familiaSom(t)
  const f = forca * varia(1, 0.1)
  const receita = timbre === 'golem' || timbre === 'inseto' ? 0 : timbre === 'guardiao' || timbre === 'osso' ? 1 : timbre === 'espectral' ? 3 : sortear('impacto', 4)
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

/**
 * Fanfarra curta (vitória, derrota, tesouro, patamar, topo): melodia, acordes
 * por tempo e, nas épicas, tímpanos. A música do cenário abaixa enquanto toca.
 */
function fanfarra(tonica: number, bpm: number, melodia: Array<[number, number, number]>, acordes: number[][], tipo: OscillatorType, epica = false) {
  const b = 60 / bpm
  const hz2 = (m: number) => 440 * Math.pow(2, (m - 69) / 12)
  const total = Math.max(...melodia.map(([, t, d]) => t + d))
  abaixarMusica(0.15, total * b * 1000 + 600)
  for (const [g, t, d] of melodia) { nota(hz2(tonica + g), t * b, d * b + 0.25, tipo, 0.1); nota(hz2(tonica + g + 12), t * b, d * b, 'sine', 0.03) }
  acordes.forEach((ac, i) => ac.forEach((g) => nota(hz2(tonica + g - 12), i * b, b * 1.1, 'triangle', 0.035)))
  if (epica) for (let i = 0; i < acordes.length; i++) { nota(70, i * b, 0.4, 'sine', 0.22, 45); if (i === acordes.length - 1) ruido(i * b, 1.4, 0.18, 7000, 'highpass', 3000, 0.6) }
}

export function tocar(som: Som, forca = 1, t?: Timbre) {
  if (!ligado || !ctx || ctx.state !== 'running') return
  const faixa = ARQUIVO_JINGLE[som]
  if (faixa && tocarJingle(faixa)) return
  const timbre = familiaSom(t)
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
      if (timbre === 'dragao') { nota(varia(55), 0, 0.7, 'sawtooth', 0.16, 110); nota(varia(82), 0, 0.7, 'sawtooth', 0.08, 165); ruido(0, 0.7, 0.24, 300, 'lowpass', 1600, 1) }
      else if (timbre === 'raptor') { nota(varia(900), 0, 0.3, 'sawtooth', 0.05, 1800); ruido(0, 0.3, 0.16, 2600, 'bandpass', 5200, 4) }
      else if (timbre === 'gosma') { ruido(0, 0.5, 0.2, 260, 'lowpass', 900, 6); nota(varia(140), 0, 0.5, 'sine', 0.12, 60) }
      else if (timbre === 'mimico') { [0, 0.08, 0.16].forEach((d) => { ruido(d, 0.05, 0.22, 900, 'bandpass', undefined, 3, false); nota(varia(2200), d, 0.08, 'triangle', 0.04) }) }
      else if (timbre === 'serpente') { ruido(0, 0.5, 0.18, 5000, 'highpass', 7000, 0.6); nota(varia(300), 0, 0.5, 'sawtooth', 0.04, 600) }
      else if (timbre === 'guardiao') { ruido(0, 0.5, 0.16, 800, 'bandpass', 3200, 2); nota(varia(98), 0, 0.5, 'sawtooth', 0.12, 196); nota(varia(147), 0, 0.5, 'sawtooth', 0.06, 294) }
      else if (timbre === 'alado') { [0, 0.14, 0.28].forEach((d) => ruido(d, 0.12, 0.16, 700, 'bandpass', 1400, 1.2)); nota(varia(1400), 0.3, 0.25, 'sawtooth', 0.04, 2200) }
      else if (timbre === 'osso') { [0, 0.07, 0.15, 0.2].forEach((d) => { ruido(d, 0.04, 0.2, varia(2800, 0.2), 'bandpass', undefined, 5, false); nota(varia(900, 0.15), d, 0.04, 'square', 0.03) }) }
      else if (timbre === 'espectral') { nota(varia(440), 0, 0.8, 'sine', 0.06, 330); nota(varia(466), 0.05, 0.75, 'sine', 0.05, 311); ruido(0, 0.8, 0.08, 3000, 'bandpass', 900, 3) }
      else if (timbre === 'inseto') { for (let i = 0; i < 6; i++) ruido(i * 0.045, 0.03, 0.16, varia(4200, 0.2), 'bandpass', undefined, 6, false) }
      else { nota(varia(70), 0, 0.45, 'sawtooth', 0.14, 140); ruido(0, 0.45, 0.16, 300, 'lowpass', 900) }
      break
    case 'golpe-inimigo':
      if (timbre === 'dragao') { ruido(0, 0.7, 0.42, 1400, 'bandpass', 200, 0.8); nota(varia(70), 0, 0.6, 'sawtooth', 0.14, 40) }
      else if (timbre === 'raptor') { [0, 0.12].forEach((d) => { ruido(d, 0.12, 0.34, 3400, 'bandpass', 900, 1.6); nota(varia(600), d, 0.1, 'sawtooth', 0.06, 300) }) }
      else if (timbre === 'gosma') { ruido(0, 0.35, 0.4, 500, 'lowpass', 120, 4); nota(varia(220), 0, 0.25, 'sine', 0.12, 70) }
      else if (timbre === 'mimico') { ruido(0, 0.06, 0.5, 1200, 'bandpass', undefined, 2, false); [2600, 3100, 2300].forEach((f, i) => nota(varia(f, 0.05), 0.02 + i * 0.02, 0.2, 'triangle', 0.05)); nota(varia(110), 0, 0.2, 'square', 0.08, 60) }
      else if (timbre === 'serpente') { ruido(0, 0.18, 0.35, 3000, 'bandpass', 800, 1.5); ruido(0.02, 0.5, 0.12, 6000, 'highpass', undefined, 0.6) }
      else if (timbre === 'guardiao') { ruido(0, 0.32, 0.36, 2600, 'bandpass', 500, 1.2); nota(varia(160), 0, 0.2, 'sawtooth', 0.1, 60) }
      else if (timbre === 'alado') { ruido(0, 0.2, 0.3, 1800, 'bandpass', 600, 1); nota(varia(1800), 0, 0.18, 'sawtooth', 0.05, 900); ruido(0.05, 0.08, 0.28, 3800, 'bandpass', undefined, 2, false) }
      else if (timbre === 'osso') { ruido(0, 0.06, 0.45, 2400, 'bandpass', undefined, 3, false); ruido(0.04, 0.2, 0.24, 1200, 'bandpass', 400, 2); nota(varia(300), 0, 0.12, 'square', 0.06, 120) }
      else if (timbre === 'espectral') { ruido(0, 0.5, 0.3, 5200, 'bandpass', 600, 2); nota(varia(660), 0, 0.4, 'sine', 0.07, 220); nota(varia(990), 0, 0.3, 'triangle', 0.04, 330) }
      else if (timbre === 'inseto') { ruido(0, 0.08, 0.4, 3000, 'bandpass', undefined, 4, false); ruido(0.06, 0.18, 0.2, 1500, 'bandpass', 600, 2); nota(varia(180), 0, 0.18, 'square', 0.05, 90) }
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
    case 'raio': ruido(0, 0.08, 0.45, 6000, 'highpass', undefined, 0.6, false); ruido(0.02, 0.35, 0.3, 3000, 'bandpass', 400, 2); nota(varia(1400), 0, 0.18, 'sawtooth', 0.05, 200); nota(varia(60), 0.02, 0.5, 'sine', 0.2, 35); break
    case 'moedas': for (let i = 0; i < 6; i++) { const f = varia([2093, 2349, 2637, 3136][i % 4], 0.03); nota(f, i * 0.045, 0.22, 'triangle', 0.05); nota(f * 1.5, i * 0.045 + 0.01, 0.12, 'sine', 0.02) } break
    case 'queimadura': ruido(0, 0.5, 0.16, 5000, 'highpass', 9000, 0.8); ruido(0, 0.3, 0.12, 900, 'bandpass', 2400, 2); break
    case 'divide': ruido(0, 0.4, 0.3, 400, 'lowpass', 1400, 8); nota(varia(180), 0, 0.3, 'sine', 0.12, 360); nota(varia(240), 0.12, 0.25, 'sine', 0.1, 480); break
    case 'roubo': ruido(0, 0.2, 0.2, 3000, 'bandpass', 800, 2); [1175, 880, 587].forEach((f, i) => nota(f, i * 0.06, 0.18, 'square', 0.04)); break
    case 'ajuda': ruido(0, 1, 0.1, 6000, 'highpass'); [523, 659, 784, 988, 1175, 1568].forEach((f, i) => nota(f, i * 0.08, 0.9, 'sine', 0.07)); nota(131, 0, 1.6, 'sine', 0.12); abaixarMusica(0.3, 1600); break
    case 'porta': ruido(0, 0.7, 0.2, 400, 'bandpass', 900, 6); nota(varia(110), 0, 0.6, 'sawtooth', 0.05, 160); nota(65, 0.45, 0.5, 'sine', 0.2, 40); ruido(0.45, 0.3, 0.25, 900, 'lowpass', 120); break
    case 'sino': [1568, 2093].forEach((f, i) => { nota(f, i * 0.12, 1.1, 'sine', 0.08); nota(f * 2.76, i * 0.12, 0.5, 'sine', 0.02) }); break
    case 'compra-loja': tocar('moedas'); [784, 1047].forEach((f, i) => nota(f, 0.15 + i * 0.08, 0.3, 'triangle', 0.08)); break
    case 'carregado':
      // golpe carregado de quem não cospe fogo (estocada, pistão, investida): só o rugido que cresce
      ruido(0, 1, 0.5, 600, 'bandpass', 2400, 0.7); ruido(0, 1, 0.25, 140, 'lowpass', 90); nota(varia(48), 0, 1, 'sawtooth', 0.14, 70); abaixarMusica(0.25, 1200)
      break
    case 'sopro':
      // rugido grave, a labareda que avança e o crepitar do fogo por cima
      ruido(0, 1, 0.5, 600, 'bandpass', 2400, 0.7); ruido(0, 1, 0.25, 140, 'lowpass', 90); nota(varia(48), 0, 1, 'sawtooth', 0.14, 70)
      nota(varia(73), 0.02, 0.9, 'sawtooth', 0.07, 98)
      for (let i = 0; i < 9; i++) ruido(0.1 + i * 0.09 + Math.random() * 0.04, 0.035, 0.12, varia(5200, 0.25), 'highpass', undefined, 0.8, false)
      abaixarMusica(0.25, 1200)
      break
    case 'espada-gigante':
      // a lâmina enorme corta o ar (varredura curta, porque a ponta chega ao alvo em uns 50 ms) e o aço canta;
      // o baque fica com o som 'critico', que toca no instante do impacto visível
      ruido(0, 0.16, 0.36, 700, 'bandpass', 6000, 1.1)
      nota(varia(523, 0.02), 0, 0.14, 'sawtooth', 0.04, 2093)
      ;[1760, 2637, 3520].forEach((f, i) => nota(varia(f, 0.02), 0.03 + i * 0.025, 0.9 - i * 0.15, 'triangle', 0.05))
      ;[1047, 1568, 2093].forEach((f, i) => nota(f, 0.12 + i * 0.05, 0.6, 'sine', 0.035))
      abaixarMusica(0.2, 1000)
      break
    case 'pedregulho': {
      // o assobio da pedra caindo do alto, o baque que racha o chão e o cascalho; com movimento
      // reduzido (forca 0) não há queda na tela: o baque vem na hora, sem o assobio
      const q = forca > 0 ? 0.42 : 0
      if (q) { nota(varia(1500, 0.04), 0, 0.42, 'sine', 0.05, 320); ruido(0, 0.42, 0.12, 900, 'bandpass', 300, 3) }
      ruido(q, 0.07, 0.55, 3000, 'highpass', undefined, 0.7, false)
      nota(varia(46), q, 0.9, 'sine', 0.7, 26); nota(varia(92), q, 0.4, 'square', 0.06, 40)
      ruido(q, 0.9, 0.5, 1300, 'lowpass', 110)
      for (let i = 0; i < 7; i++) ruido(q + 0.08 + i * 0.06 + Math.random() * 0.05, 0.05, 0.13, varia(2600, 0.35), 'bandpass', undefined, 3, false)
      abaixarMusica(0.2, 1300)
      break
    }
    case 'mandibula':
      // a tampa range ao abrir, desce e fecha com estalo de dentes sobre a tela
      nota(varia(96), 0, 0.16, 'sawtooth', 0.06, 70); ruido(0, 0.16, 0.12, 700, 'bandpass', 400, 6)
      ruido(0.16, 0.08, 0.6, 1100, 'bandpass', undefined, 1.6, false)
      nota(varia(70), 0.16, 0.45, 'sine', 0.5, 34); ruido(0.16, 0.35, 0.3, 600, 'lowpass', 120)
      ;[3100, 2700, 3400, 2500].forEach((f, i) => nota(varia(f, 0.05), 0.17 + i * 0.018, 0.08, 'square', 0.03))
      ;[1760, 2349].forEach((f, i) => nota(varia(f, 0.03), 0.2 + i * 0.02, 0.4, 'triangle', 0.035))
      abaixarMusica(0.25, 900)
      break
    case 'renascer': ruido(0, 1.4, 0.2, 300, 'lowpass', 8000); [262, 392, 523, 784, 1047, 1568].forEach((f, i) => nota(f, i * 0.11, 1.1, 'triangle', 0.08)); nota(65, 0, 2, 'sine', 0.2); abaixarMusica(0.15, 2200); break
    case 'jingle-vitoria': fanfarra(67, 132, [[0, 0, 0.5], [4, 0.5, 0.5], [7, 1, 0.5], [12, 1.5, 1.5], [11, 3, 0.5], [12, 3.5, 2]], [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], 'triangle'); break
    case 'jingle-chefe': fanfarra(62, 120, [[0, 0, 0.75], [7, 0.75, 0.25], [12, 1, 1], [10, 2, 0.5], [12, 2.5, 0.5], [14, 3, 0.5], [16, 3.5, 0.5], [19, 4, 3]], [[0, 4, 7], [-2, 2, 5], [5, 9, 12], [7, 11, 14], [0, 4, 7]], 'sawtooth', true); break
    case 'jingle-derrota': fanfarra(57, 76, [[7, 0, 1], [5, 1, 1], [3, 2, 1], [2, 3, 0.5], [0, 3.5, 2.5]], [[0, 3, 7], [-4, 0, 3], [-5, -2, 2], [0, 3, 7]], 'sine'); break
    case 'jingle-tesouro': fanfarra(72, 150, [[0, 0, 0.25], [4, 0.25, 0.25], [7, 0.5, 0.25], [12, 0.75, 0.25], [16, 1, 1.4]], [[0, 4, 7], [0, 4, 7]], 'triangle'); break
    case 'jingle-patamar': fanfarra(65, 112, [[0, 0, 0.5], [5, 0.5, 0.5], [9, 1, 0.5], [12, 1.5, 1.5]], [[0, 4, 7], [5, 9, 12]], 'triangle'); break
    case 'jingle-topo': fanfarra(60, 108, [[0, 0, 0.5], [4, 0.5, 0.5], [7, 1, 0.5], [12, 1.5, 1], [7, 2.5, 0.5], [12, 3, 0.5], [16, 3.5, 0.5], [19, 4, 1], [24, 5, 3]], [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14], [0, 4, 7], [0, 4, 7]], 'sawtooth', true); break
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
  if (nome === 'chuva') { camada(2800, .45, .18, .05, 'lowpass'); camada(6000, .4, .035, .12, 'bandpass') }
  else if (nome === 'campo') { camada(500, 0.6, 0.35, 0.08); camada(1600, 1.2, 0.06, 0.13, 'bandpass') }
  else if (nome === 'masmorra') { camada(160, 0.8, 0.5, 0.05); camada(2400, 3, 0.03, 0.4, 'bandpass') }
  else if (nome === 'salao') { camada(240, 0.7, 0.3, 0.06); camada(3000, 4, 0.025, 0.6, 'bandpass') }
  else if (nome === 'covil') { camada(110, 0.9, 0.55, 0.04); camada(700, 2, 0.06, 0.3, 'bandpass') }
  else if (nome === 'torre') { camada(900, 0.5, 0.25, 0.11); camada(2600, 1.5, 0.05, 0.2, 'bandpass') }
  else if (nome === 'forja') { camada(140, 0.9, 0.45, 0.07); camada(900, 2.5, 0.05, 0.5, 'bandpass') }
  else if (nome === 'coliseu') { camada(700, 0.8, 0.22, 0.09, 'bandpass'); camada(260, 0.6, 0.2, 0.05) }
  else if (nome === 'jardim') { camada(600, 0.5, 0.22, 0.1); camada(4200, 2, 0.02, 0.3, 'bandpass') }
  else if (nome === 'laboratorio') { camada(180, 4, 0.18, 0.02, 'bandpass'); camada(5200, 6, 0.012, 0.9, 'bandpass') }
  else if (nome === 'caverna') { camada(120, 0.7, 0.5, 0.03); camada(1400, 3, 0.03, 0.2, 'bandpass') }
  else if (nome === 'templo') { camada(420, 0.6, 0.26, 0.06); camada(1900, 1.5, 0.05, 0.15, 'bandpass') }
  else if (nome === 'passarela') { camada(700, 0.5, 0.4, 0.14); camada(2200, 1, 0.08, 0.25, 'bandpass') }
  else if (nome === 'catacumba') { camada(140, 0.8, 0.42, 0.04); camada(2600, 4, 0.02, 0.5, 'bandpass') }
  else if (nome === 'treino') { camada(520, 0.6, 0.28, 0.08); camada(1700, 1.2, 0.05, 0.12, 'bandpass') }
  else if (nome === 'arquivo') { camada(260, 0.5, 0.16, 0.03); camada(3600, 5, 0.018, 0.6, 'bandpass') }
  else { camada(300, 0.5, 0.18, 0.04); camada(3200, 5, 0.02, 0.7, 'bandpass') }
  // estalos de chama e madeira, pássaros no campo
  let vivo = true
  const detalhe = () => {
    if (!vivo || !ctx || nome === 'chuva') return
    if (nome === 'covil') { const k = Math.random(); ruido(0, 0.3 + k * 0.4, 0.04 + k * 0.05, 300 + k * 400, 'lowpass', 120, 1, false, sai); if (k > 0.7) ruido(0, 0.05, 0.04, 3000, 'bandpass', undefined, 3, false, sai) }
    else if (nome === 'torre') { if (Math.random() < 0.25) { const f = 1800 + Math.random() * 900; nota(f, 0, 0.1, 'sine', 0.01, f * 1.2, false, sai) } }
    else if (nome === 'forja') { if (Math.random() < 0.3) { const f = 1900 + Math.random() * 500; nota(f, 0, 0.5, 'triangle', 0.018, undefined, false, sai); nota(f * 2.7, 0, 0.3, 'sine', 0.008, undefined, false, sai); ruido(0, 0.04, 0.05, 3000, 'bandpass', undefined, 2, false, sai) } else ruido(0, 0.2, 0.03, 400, 'lowpass', 150, 1, false, sai) }
    else if (nome === 'caverna' || nome === 'catacumba') { if (Math.random() < 0.4) { const f = 1200 + Math.random() * 1400; nota(f, 0, 0.12, 'sine', 0.02, f * 0.5, true, sai) } }
    else if (nome === 'laboratorio') { if (Math.random() < 0.45) { const f = 500 + Math.random() * 700; nota(f, 0, 0.06, 'sine', 0.012, f * 1.6, false, sai) } else if (Math.random() < 0.2) nota(1760, 0, 0.05, 'square', 0.005, undefined, false, sai) }
    else if (nome === 'coliseu') { if (Math.random() < 0.15) ruido(0, 1.2, 0.05, 900, 'bandpass', 1400, 0.8, false, sai) }
    else if (nome === 'passarela') { if (Math.random() < 0.3) ruido(0, 1.4, 0.06, 500, 'bandpass', 1800, 1.4, false, sai); if (Math.random() < 0.2) { const k = Math.random(); ruido(0, 0.08, 0.03, 900 + k * 300, 'bandpass', undefined, 4, false, sai) } }
    else if (nome === 'templo') { if (Math.random() < 0.12) { const f = 880 * (Math.random() < 0.5 ? 1 : 1.5); nota(f, 0, 2.2, 'sine', 0.008, undefined, true, sai) } }
    else if (nome === 'arquivo') { if (Math.random() < 0.3) ruido(0, 0.25, 0.025, 4000, 'bandpass', 2000, 1.5, false, sai); else if (Math.random() < 0.15) nota(1568 + Math.random() * 800, 0, 0.9, 'sine', 0.006, undefined, true, sai) }
    else if (nome === 'campo' || nome === 'jardim' || nome === 'treino') { if (Math.random() < 0.35) { const f = 2400 + Math.random() * 1600; nota(f, 0, 0.08, 'sine', 0.012, f * 1.3, false, sai); nota(f * 1.1, 0.1, 0.07, 'sine', 0.01, f * 1.4, false, sai) } }
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
  /** Escala (semitons) para a melodia procedural; sem ela, só acompanhamento. */
  escala?: number[]
  melodia?: 'heroica' | 'misteriosa' | 'saltitante' | 'epica'
  timbreMelodia?: OscillatorType
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
  chefe: { bpm: 136, tonica: 52, acordes: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -1, 2]], arpejo: 'semicolcheia', bateria: 'epica', pad: 'sawtooth', brilhoPad: 1300, escala: [0, 2, 3, 5, 7, 8, 11], melodia: 'epica', timbreMelodia: 'sawtooth' },
  // covil do dragão: Dó frígio, pesado e lento, com tímpanos
  covil: { bpm: 72, tonica: 48, acordes: [[0, 3, 7], [1, 5, 8], [0, 3, 7], [-2, 1, 5]], arpejo: 'colcheia', bateria: 'tensa', pad: 'sawtooth', brilhoPad: 500, escala: [0, 1, 3, 5, 7, 8, 10], melodia: 'misteriosa', timbreMelodia: 'triangle' },
  // Torre do Título: Mi bemol maior, subida heroica
  torre: { bpm: 112, tonica: 51, acordes: [[0, 4, 7], [5, 9, 12], [-3, 0, 4], [7, 11, 14]], arpejo: 'colcheia', bateria: 'leve', pad: 'sawtooth', brilhoPad: 1200, escala: [0, 2, 4, 5, 7, 9, 11], melodia: 'heroica', timbreMelodia: 'triangle' },
  // Caixeira do Arsenal: Sol maior saltitante, sem pressa
  loja: { bpm: 118, tonica: 55, acordes: [[0, 4, 7], [5, 9, 12], [2, 5, 9], [7, 11, 14]], arpejo: 'colcheia', bateria: 'leve', pad: 'triangle', brilhoPad: 1600, escala: [0, 2, 4, 7, 9], melodia: 'saltitante', timbreMelodia: 'square' },
  // Velho Preceptor: Fá lídio, harpa e mistério
  sabio: { bpm: 66, tonica: 53, acordes: [[0, 4, 7], [2, 6, 9], [0, 4, 7], [-1, 2, 7]], arpejo: 'piano', bateria: null, pad: 'triangle', brilhoPad: 1800, escala: [0, 2, 4, 6, 7, 9, 11], melodia: 'misteriosa', timbreMelodia: 'sine' },
  // Entrada da Cripta: Ré menor dórico, portão antigo
  entrada: { bpm: 80, tonica: 50, acordes: [[0, 3, 7], [-2, 2, 5], [5, 9, 12], [0, 3, 7]], arpejo: 'semicolcheia', bateria: null, pad: 'sawtooth', brilhoPad: 700, escala: [0, 2, 3, 5, 7, 9, 10], melodia: 'misteriosa', timbreMelodia: 'triangle' },
  // elite: Fá menor, pulsação marcada, um degrau abaixo do chefe
  elite: { bpm: 126, tonica: 53, acordes: [[0, 3, 7], [-4, 0, 3], [-5, -2, 2], [-5, -1, 2]], arpejo: 'semicolcheia', bateria: 'tensa', pad: 'sawtooth', brilhoPad: 1100, escala: [0, 2, 3, 5, 7, 8, 11], melodia: 'heroica', timbreMelodia: 'sawtooth' },
  // Forja da Osteossíntese: Lá menor, martelo em semicolcheia
  forja: { bpm: 104, tonica: 45, acordes: [[0, 3, 7], [5, 8, 12], [-2, 2, 5], [3, 7, 10]], arpejo: 'semicolcheia', bateria: 'tensa', pad: 'sawtooth', brilhoPad: 700, escala: [0, 2, 3, 5, 7, 8, 10], melodia: 'heroica', timbreMelodia: 'square' },
  // Coliseu do Acetábulo: Dó menor marcial, tambores de arena
  coliseu: { bpm: 118, tonica: 48, acordes: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], arpejo: 'colcheia', bateria: 'epica', pad: 'sawtooth', brilhoPad: 1000, escala: [0, 2, 3, 5, 7, 8, 10], melodia: 'heroica', timbreMelodia: 'sawtooth' },
  // Jardim das Fises: Sol maior pastoral, harpa e flauta
  jardim: { bpm: 88, tonica: 55, acordes: [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [2, 7, 11]], arpejo: 'piano', bateria: null, pad: 'triangle', brilhoPad: 1800, escala: [0, 2, 4, 7, 9], melodia: 'saltitante', timbreMelodia: 'sine' },
  // Laboratório Biomecânico: Si menor, sequenciador e metrônomo
  laboratorio: { bpm: 110, tonica: 47, acordes: [[0, 3, 7], [-5, -2, 2], [-4, 0, 3], [5, 8, 12]], arpejo: 'semicolcheia', bateria: 'leve', pad: 'square', brilhoPad: 900, escala: [0, 2, 3, 5, 7, 9, 10], melodia: 'misteriosa', timbreMelodia: 'square' },
  // Caverna da Pseudoartrose: Fá sustenido frígio, lento e úmido
  caverna: { bpm: 64, tonica: 42, acordes: [[0, 3, 7], [1, 5, 8], [-2, 1, 5], [0, 3, 7]], arpejo: 'colcheia', bateria: 'tensa', pad: 'sawtooth', brilhoPad: 450, escala: [0, 1, 3, 5, 7, 8, 10], melodia: 'misteriosa', timbreMelodia: 'triangle' },
  // Templo do Escafoide: Ré com segunda aumentada, areia e sinos
  templo: { bpm: 92, tonica: 50, acordes: [[0, 4, 7], [1, 5, 8], [-2, 1, 5], [0, 4, 7]], arpejo: 'piano', bateria: 'tensa', pad: 'triangle', brilhoPad: 1300, escala: [0, 1, 4, 5, 7, 8, 10], melodia: 'misteriosa', timbreMelodia: 'triangle' },
  // Passarela Suspensa: Mi lídio, vento e altura
  passarela: { bpm: 120, tonica: 52, acordes: [[0, 4, 7], [2, 6, 9], [-3, 0, 4], [2, 6, 9]], arpejo: 'colcheia', bateria: 'leve', pad: 'sawtooth', brilhoPad: 1400, escala: [0, 2, 4, 6, 7, 9, 11], melodia: 'heroica', timbreMelodia: 'triangle' },
  // Cripta Óssea: Si bemol menor, órgão distante, sem bateria
  catacumba: { bpm: 60, tonica: 46, acordes: [[0, 3, 7], [-4, 0, 3], [-7, -4, 0], [-5, -1, 2]], arpejo: 'piano', bateria: null, pad: 'sawtooth', brilhoPad: 520, escala: [0, 2, 3, 5, 7, 8, 11], melodia: 'misteriosa', timbreMelodia: 'sine' },
  // Ala de Treino: Dó maior, animada, de quintal de quartel
  treino: { bpm: 112, tonica: 48, acordes: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], arpejo: 'colcheia', bateria: 'leve', pad: 'triangle', brilhoPad: 1600, escala: [0, 2, 4, 5, 7, 9, 11], melodia: 'saltitante', timbreMelodia: 'square' },
  // Biblioteca Ancestral: Mi bemol lídio, celesta e órgão
  arquivo: { bpm: 72, tonica: 51, acordes: [[0, 4, 7], [2, 6, 9], [-3, 0, 4], [-1, 2, 7]], arpejo: 'piano', bateria: null, pad: 'triangle', brilhoPad: 2000, escala: [0, 2, 4, 6, 7, 9, 11], melodia: 'misteriosa', timbreMelodia: 'sine' },
  // dragões: Ré menor harmônica, rápido e grandioso
  dragao: { bpm: 148, tonica: 50, acordes: [[0, 3, 7], [-4, 0, 3], [1, 5, 8], [-5, -1, 2]], arpejo: 'semicolcheia', bateria: 'epica', pad: 'sawtooth', brilhoPad: 1500, escala: [0, 2, 3, 5, 7, 8, 11], melodia: 'epica', timbreMelodia: 'sawtooth' },
}

/** Ritmos da melodia (posições de semicolcheia de cada nota e a duração em semicolcheias), por estilo. */
const RITMOS: Record<NonNullable<Tema['melodia']>, Array<Array<[number, number]>>> = {
  heroica: [[[0, 3], [3, 1], [4, 4], [8, 2], [10, 2], [12, 4]], [[0, 2], [2, 2], [4, 6], [12, 4]], [[0, 4], [4, 2], [6, 2], [8, 8]]],
  misteriosa: [[[0, 6], [6, 2], [8, 8]], [[0, 4], [4, 4], [8, 4], [12, 4]], [[0, 8], [10, 6]]],
  saltitante: [[[0, 1], [2, 1], [4, 1], [6, 2], [8, 1], [10, 1], [12, 3]], [[0, 2], [3, 1], [4, 2], [7, 1], [8, 4], [12, 2], [14, 2]]],
  epica: [[[0, 2], [2, 2], [4, 2], [6, 2], [8, 6], [14, 2]], [[0, 3], [3, 3], [6, 2], [8, 4], [12, 4]], [[0, 1], [1, 1], [2, 2], [4, 4], [8, 2], [10, 2], [12, 4]]],
}

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/* ------------------------------------------------------------ Trilha em arquivos
   Faixas orquestrais renderizadas offline (scripts/musica/), em public/flashcards/musica/.
   Enquanto o arquivo não chega, toca o tema procedural; quando chega, troca com fade. */

const ARQUIVO_MUSICA: Partial<Record<Musica, string>> = {
  entrada: 'cripta', chefe: 'chefe', elite: 'elite', dragao: 'dragao', torre: 'torre', biblioteca: 'biblioteca', arquivo: 'biblioteca',
  // Etapa 7 (13/10/2026): trilha própria da floresta, da masmorra, do covil e das salas
  campo: 'passeio', masmorra: 'masmorra', covil: 'covil', loja: 'sala', sabio: 'sala',
  salao: 'batalha', forja: 'batalha', coliseu: 'batalha', jardim: 'passeio',
  laboratorio: 'batalha', caverna: 'batalha', templo: 'batalha', passarela: 'batalha', catacumba: 'batalha', treino: 'passeio',
}
const ARQUIVO_JINGLE: Partial<Record<Som, string>> = { 'jingle-vitoria': 'vitoria', 'jingle-chefe': 'vitoria', 'jingle-topo': 'vitoria', 'jingle-derrota': 'derrota', 'jingle-tesouro': 'recompensa', 'jingle-patamar': 'recompensa' }
const buffers = new Map<string, AudioBuffer>()
const carregando = new Map<string, Promise<AudioBuffer | null>>()

function carregarFaixa(nome: string): Promise<AudioBuffer | null> {
  const ja = buffers.get(nome)
  if (ja) return Promise.resolve(ja)
  let p = carregando.get(nome)
  if (!p && ctx) {
    const c = ctx
    const opus = !!document.createElement('audio').canPlayType('audio/ogg; codecs=opus')
    p = carregarAudioArquivo(nome, { opus, url: arquivo => recurso(`flashcards/musica/${arquivo}`), decodificar: async b => {
      const audio = await c.decodeAudioData(b)
      if (nome === 'sala') for (let canal = 0; canal < audio.numberOfChannels; canal++) suavizarEmenda(audio.getChannelData(canal), audio.sampleRate)
      return audio
    } })
      .then(buf => { if (buf) buffers.set(nome, buf); else { carregando.delete(nome); falhaSom = 'carregamento' }; return buf })
    carregando.set(nome, p)
  }
  return p ?? Promise.resolve(null)
}

/**
 * Pré-carrega as fanfarras curtas (chamado no primeiro toque). Fluidez, 15/10/2026:
 * antes baixava de uma vez cinco faixas (1,1 MB, com as músicas do passeio e da
 * batalha) no mesmo instante em que o jogo pedia a cena, os sprites e as figuras.
 * Agora a música do lugar vem só quando toca (tocarMusica) e as fanfarras esperam
 * o navegador folgar. Com o som desligado, nada é baixado.
 */
let trilhaAgendada = false
export function preCarregarTrilha() {
  if (trilhaAgendada || !ligado || volumeGeral <= 0) return
  trilhaAgendada = true
  const ocioso = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  const baixar = () => { for (const n of ['vitoria', 'recompensa', 'derrota']) void carregarFaixa(n) }
  window.setTimeout(() => (ocioso ? ocioso(baixar, { timeout: 5000 }) : baixar()), 4000)
}

function tocarFaixa(nome: Musica, buf: AudioBuffer) {
  const c = ctx!
  const sai = c.createGain(); sai.gain.setValueAtTime(0.0001, c.currentTime); sai.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.6); sai.connect(musica)
  const src = c.createBufferSource(); src.buffer = buf; src.loop = true
  const inicio = c.currentTime
  src.connect(sai); src.start(inicio)
  musicaAtual = {
    nome, inicio, duracao: buf.duration,
    parar: () => {
      pararCoral()
      sai.gain.cancelScheduledValues(c.currentTime)
      sai.gain.setTargetAtTime(0.0001, c.currentTime, 0.35)
      window.setTimeout(() => { try { src.stop() } catch { /* já parou */ } sai.disconnect() }, 2200)
    },
  }
  aplicarClimaMusical()
}

/** Fanfarra em arquivo, se já carregada: a música do cenário abaixa enquanto ela toca. */
function tocarJingle(nome: string): boolean {
  const buf = buffers.get(nome)
  if (!buf || !ctx) return false
  const g = ctx.createGain(); g.gain.value = 1.15; g.connect(saida)
  const src = ctx.createBufferSource(); src.buffer = buf; src.connect(g); src.start()
  src.onended = () => g.disconnect()
  abaixarMusica(0.12, Math.min(buf.duration, 7) * 1000)
  return true
}

/** Toca o tema em laço com um agendador de antecipação (estável mesmo com a aba ocupada). */
export function tocarMusica(nome: Musica | null) {
  musicaPedida = nome
  if (!ctx || ctx.state !== 'running') return
  if (musicaAtual?.nome === nome) return
  musicaAtual?.parar()
  pararCoral()
  musicaAtual = null
  if (!nome) return
  const arquivo = ARQUIVO_MUSICA[nome]
  if (arquivo) {
    const buf = buffers.get(arquivo)
    if (buf) { tocarFaixa(nome, buf); return }
    void carregarFaixa(arquivo).then((b) => {
      if (!b || musicaPedida !== nome || musicaAtual?.nome !== nome || !musicaAtual.procedural) return
      musicaAtual.parar(); musicaAtual = null
      tocarFaixa(nome, b)
    })
  }
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

  // melodia procedural: um motivo por compasso, das notas do acorde com passagens pela escala
  let motivo: Array<[number, number, number]> = []
  let ultimaNota = 7
  const novoMotivo = (compasso: number) => {
    if (!tema.escala || !tema.melodia) return []
    const ritmos = RITMOS[tema.melodia]
    const ritmo = ritmos[(compasso * 7 + Math.floor(compasso / 4)) % ritmos.length]
    const acorde = tema.acordes[compasso % tema.acordes.length]
    const graus = [...tema.escala, ...tema.escala.map((x) => x + 12)]
    return ritmo.map(([pos, dur], i): [number, number, number] => {
      const forte = pos % 4 === 0
      let alvo: number
      if (forte || i === ritmo.length - 1) {
        const tons = acorde.flatMap((x) => [x, x + 12]).filter((x) => x >= 0 && x <= 19)
        alvo = tons.reduce((m, x) => (Math.abs(x - ultimaNota) < Math.abs(m - ultimaNota) || (Math.abs(x - ultimaNota) === Math.abs(m - ultimaNota) && Math.random() < 0.5) ? x : m), tons[0] ?? 7)
      } else {
        const k = graus.findIndex((x) => x >= ultimaNota)
        const passo = Math.random() < 0.5 ? 1 : -1
        alvo = graus[Math.max(0, Math.min(graus.length - 1, (k < 0 ? 0 : k) + passo))]
      }
      ultimaNota = alvo
      return [pos, dur, alvo]
    })
  }

  const agendar = () => {
    if (!vivo) return
    // aba que volta depois de um tempo escondida: pula as notas perdidas em vez de tocar todas de uma vez
    if (proximo < c.currentTime - 0.1) proximo = c.currentTime + 0.05
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
      // melodia (o motivo muda a cada compasso; a cada 4, uma pausa para respirar)
      if (dentro === 0) motivo = compasso % 4 === 3 && tema.melodia !== 'epica' ? [] : novoMotivo(compasso)
      for (const [pos, dur, g] of motivo) if (pos === dentro) {
        const f = hz(tema.tonica + g + 12), tipo = tema.timbreMelodia ?? 'triangle'
        voz(t, f, passo * dur * 0.95, tipo, tipo === 'sawtooth' || tipo === 'square' ? 0.028 : 0.06, tipo === 'sawtooth' ? 2400 : 3200, true, 0.012)
        voz(t, f * 2, passo * dur * 0.6, 'sine', 0.012, undefined, true, 0.02)
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
    procedural: true,
    parar: () => {
      vivo = false
      window.clearInterval(relogio)
      sai.gain.setTargetAtTime(0.0001, c.currentTime, 0.5)
      window.setTimeout(() => { sai.disconnect(); ecoG.disconnect() }, 3000)
    },
  }
}
