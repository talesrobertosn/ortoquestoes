import { useCallback, useEffect, useRef, useState } from 'react'
import { gravar, ler } from '../../estado/armazenamento'
import { href, navegar } from '../../util/rotas'
import { BARALHO_DEMO } from '../dados/baralhoDemo'
import { Palco, centro } from '../efeitos/palco'
import { PALETA_PERSONAGEM, type Personagem, type Pose } from '../efeitos/personagens'
import { configurarSom, destravar, tocar, tocarAmbiente } from '../efeitos/sons'
import { sementeNova } from '../motor/aleatorio'
import { BESTIARIO, inimigoDoAndar, type Inimigo } from '../motor/bestiario'
import { ENCAIXES, RECOMPENSAS, ehPoder, type Recompensa } from '../motor/poderes'
import { COMBO_MINIMO, criarMotor, type Evento, type Partida } from '../motor/regras'
import { CHAVE_AJUSTES, CHAVE_PARTIDA, CHAVE_REGISTROS, registrarResposta, type RegistroFlashcard } from '../progresso'
import { Cartao } from './Cartao'
import { Cenario, TampoMesa } from './Cenario'
import { Estudo } from './Estudo'
import { Ator, BarraVida, Encaixe } from './Hud'
import { ModalJogo } from './ModalJogo'
import { Sprite } from './Sprite'

export interface Ajustes {
  versao: 2
  som: boolean
  volEfeitos: number
  volAmbiente: number
  efeitos: 'completos' | 'reduzidos'
  velocidade: 'normal' | 'rapida'
}
/** Som ligado por padrão (pedido do Tales em 12/10/2026); toca a partir do primeiro toque. */
const AJUSTES_PADRAO: Ajustes = { versao: 2, som: true, volEfeitos: 0.7, volAmbiente: 0.35, efeitos: 'completos', velocidade: 'normal' }

const motor = criarMotor(BARALHO_DEMO)

function partidaSalva(): Partida | null {
  const p = ler<Partida | null>(CHAVE_PARTIDA, null)
  if (!p || p.versao !== 1 || p.fase === 'fim') return null
  try {
    ;[...p.baralho, ...p.descarte, ...(p.atual ? [p.atual.id] : [])].forEach((id) => motor.carta(id))
    return p
  } catch { return null }
}

type FaixaTela = 'celular' | 'baixa' | 'larga'
function usarFaixa(): FaixaTela {
  const calcular = (): FaixaTela => (window.innerWidth <= 640 ? 'celular' : window.innerHeight <= 820 ? 'baixa' : 'larga')
  const [faixa, definir] = useState(calcular)
  useEffect(() => {
    const aoMudar = () => definir(calcular())
    window.addEventListener('resize', aoMudar)
    return () => window.removeEventListener('resize', aoMudar)
  }, [])
  return faixa
}

/** Reinicia uma animação CSS num elemento (dano, ataque, bloqueio). */
function animar(el: Element | null | undefined, classe: string, ms = 700) {
  if (!el) return
  el.classList.remove(classe)
  void (el as HTMLElement).offsetWidth
  el.classList.add(classe)
  window.setTimeout(() => el.classList.remove(classe), ms)
}

type Faixa = { texto: string; sub?: string; tom: 'ouro' | 'vermelho' | 'azul' | 'verde' | 'chefe' } | null
type Flutuante = { id: number; x: number; y: number; texto: string; tom: string; grande?: boolean; rotulo?: string }

interface Mostrado {
  vida: number
  vidaInimigo: number
  revelada: boolean
  resultado: 'certo' | 'errado' | null
  marcadas: { escolha: number; certa: number } | null
  inimigoCaiu: boolean
  heroiCaiu: boolean
}

export function Arena() {
  const [ajustes, definirAjustesBruto] = useState<Ajustes>(() => {
    const salvos = ler<Partial<Ajustes>>(CHAVE_AJUSTES, {})
    const reduzSistema = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    // Ajustes da versão anterior (som desligado por padrão) não valem mais.
    const validos = salvos.versao === 2 ? salvos : {}
    return { ...AJUSTES_PADRAO, efeitos: reduzSistema ? 'reduzidos' : 'completos', ...validos }
  })
  const definirAjustes = (a: Partial<Ajustes>) => definirAjustesBruto((v) => { const n = { ...v, ...a }; gravar(CHAVE_AJUSTES, n); return n })
  const reduzido = ajustes.efeitos === 'reduzidos'
  const faixaTela = usarFaixa()

  const [modo, definirModo] = useState<'batalha' | 'estudo'>('batalha')
  const [partida, definirPartida] = useState<Partida>(() => partidaSalva() ?? motor.novaPartida(sementeNova()).estado)
  const partidaRef = useRef(partida)
  const [mostrado, definirMostrado] = useState<Mostrado>(() => ({
    vida: partida.vida, vidaInimigo: partida.inimigo.vida, revelada: partida.fase !== 'pergunta', resultado: null, marcadas: null, inimigoCaiu: false, heroiCaiu: false,
  }))
  const mostradoRef = useRef(mostrado)
  mostradoRef.current = mostrado
  const [animando, definirAnimando] = useState(false)
  const [selecionada, definirSelecionada] = useState<number | null>(null)
  const [faixa, definirFaixa] = useState<Faixa>(null)
  const [apresentacao, definirApresentacao] = useState<{ inimigo: Inimigo; ciclo: number; andar: number } | null>(null)
  const [flutuantes, definirFlutuantes] = useState<Flutuante[]>([])
  const [ampliada, definirAmpliada] = useState<{ src: string; legenda: string } | null>(null)
  const [ajustesAbertos, definirAjustesAbertos] = useState(false)
  const [confirmarSaida, definirConfirmarSaida] = useState(false)
  const [transicao, definirTransicao] = useState(false)
  const [vermelho, definirVermelho] = useState(0)
  const [eliminando, definirEliminando] = useState<number | null>(null)
  const [atacando, definirAtacando] = useState(false)
  const [cenarioVisivel, definirCenarioVisivel] = useState(() => inimigoDoAndar(partida.andar).inimigo.cenario)
  const [estudoPrimeiro, definirEstudoPrimeiro] = useState<string[]>([])

  const canvasPalco = useRef<HTMLCanvasElement>(null)
  const palco = useRef<Palco | null>(null)
  const refInimigo = useRef<HTMLDivElement>(null)
  const refHeroi = useRef<HTMLDivElement>(null)
  const refCarta = useRef<HTMLDivElement>(null)
  const refMao = useRef<HTMLDivElement>(null)
  const refSlots = useRef<HTMLDivElement>(null)
  const refMesa = useRef<HTMLElement>(null)
  const geracao = useRef(0)
  const idFlutuante = useRef(0)

  /* ---------- Som ---------- */
  useEffect(() => { configurarSom({ ligado: ajustes.som, efeitos: ajustes.volEfeitos, ambiente: ajustes.volAmbiente }) }, [ajustes.som, ajustes.volEfeitos, ajustes.volAmbiente])
  useEffect(() => {
    let feito = false
    const primeiro = () => { if (feito) return; feito = true; destravar(); tocar('abrir') }
    window.addEventListener('pointerdown', primeiro, { capture: true })
    window.addEventListener('keydown', primeiro, { capture: true })
    return () => { window.removeEventListener('pointerdown', primeiro, { capture: true }); window.removeEventListener('keydown', primeiro, { capture: true }) }
  }, [])
  useEffect(() => { tocarAmbiente(modo === 'estudo' ? 'biblioteca' : cenarioVisivel) }, [modo, cenarioVisivel])
  useEffect(() => () => tocarAmbiente(null), [])

  useEffect(() => { partidaRef.current = partida; gravar(CHAVE_PARTIDA, partida) }, [partida])

  useEffect(() => {
    if (!canvasPalco.current) return
    const p = new Palco(canvasPalco.current)
    palco.current = p
    const aoRedimensionar = () => p.redimensionar()
    window.addEventListener('resize', aoRedimensionar)
    return () => { window.removeEventListener('resize', aoRedimensionar); p.limpar() }
  }, [])
  useEffect(() => { if (palco.current) palco.current.reduzido = reduzido }, [reduzido])

  useEffect(() => {
    const { inimigo, ciclo } = inimigoDoAndar(partida.andar)
    if (partida.fase === 'pergunta' && partida.rodada === 0) definirApresentacao({ inimigo, ciclo, andar: partida.andar })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const carta = partida.atual ? motor.carta(partida.atual.id) : null
  const inimigo = motor.inimigoAtual(partida)
  const intencao = motor.intencao(partida)
  const atributos = motor.atributos(partida)

  /* ---------- Diretor de efeitos ---------- */
  const fator = (reduzido ? 0.3 : 1) * (ajustes.velocidade === 'rapida' ? 0.6 : 1)
  const esperar = useCallback((ms: number, g: number) => new Promise<boolean>((resolver) => {
    window.setTimeout(() => resolver(g === geracao.current), ms * fator)
  }), [fator])

  const flutuar = useCallback((el: Element | null, texto: string, tom: string, extra?: Partial<Flutuante>) => {
    const { x, y } = centro(el)
    const id = ++idFlutuante.current
    const margem = Math.min(window.innerWidth / 2, 40 + texto.length * 9)
    const xx = Math.min(Math.max(x + (extra?.x ?? 0), margem), window.innerWidth - margem)
    definirFlutuantes((f) => [...f, { id, x: xx, y: Math.max(40, y + (extra?.y ?? 0)), texto, tom, grande: extra?.grande, rotulo: extra?.rotulo }])
    window.setTimeout(() => definirFlutuantes((f) => f.filter((v) => v.id !== id)), extra?.grande ? 1500 : 1150)
  }, [])

  const tremer = useCallback((forca: number) => {
    if (reduzido || !refMesa.current) return
    refMesa.current.style.setProperty('--tremor', String(forca))
    animar(refMesa.current.closest('.fc-batalha'), 'fc-treme', 420)
  }, [reduzido])

  const sincronizar = useCallback((p: Partida) => {
    definirMostrado((m) => ({ ...m, vida: p.vida, vidaInimigo: p.inimigo.vida, revelada: p.fase !== 'pergunta', heroiCaiu: p.vida <= 0, inimigoCaiu: p.inimigo.vida <= 0 && p.fase !== 'pergunta' }))
  }, [])

  // Só no desenvolvimento: os testes de tela leem o estado para escolher a alternativa certa ou errada.
  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __torneio: unknown }).__torneio = { partida, certa: partida.atual ? partida.atual.ordem.indexOf(motor.carta(partida.atual.id).certa) : -1, definir: (p: Partida) => { partidaRef.current = p; definirPartida(p); sincronizar(p) } } })

  const pular = useCallback(() => {
    geracao.current++
    palco.current?.limpar()
    definirAnimando(false)
    definirFaixa(null)
    definirTransicao(false)
    definirEliminando(null)
    definirAtacando(false)
    definirCenarioVisivel(inimigoDoAndar(partidaRef.current.andar).inimigo.cenario)
    sincronizar(partidaRef.current)
  }, [sincronizar])

  const arte = (r: React.RefObject<HTMLDivElement | null>) => r.current?.querySelector('.fc-ator__corpo')
  /** Troca a pose do sprite (preparo, golpe, dano, vitória) por um tempo e volta a respirar. */
  const posar = useCallback((r: React.RefObject<HTMLDivElement | null>, pose: Pose, ms: number) => {
    const el = r.current
    if (!el) return
    el.dataset.pose = pose
    window.clearTimeout(Number(el.dataset.poseTempo))
    el.dataset.poseTempo = String(window.setTimeout(() => { delete el.dataset.pose }, ms * fator))
  }, [fator])

  const encenar = useCallback(async (eventos: Evento[], depois: Partida) => {
    const g = ++geracao.current
    const P = palco.current
    definirAnimando(true)
    const combo = depois.sequencia
    const quemInimigo = inimigoDoAndar(depois.andar).inimigo.sprite as Personagem
    for (const ev of eventos) {
      if (g !== geracao.current) return
      switch (ev.tipo) {
        case 'resposta': {
          definirMostrado((m) => ({ ...m, marcadas: { escolha: ev.escolha, certa: ev.certa }, resultado: ev.certo ? 'certo' : 'errado' }))
          if (!ev.certo) {
            tocar('erro')
            // a explicação aparece logo: o erro não atrasa a leitura
            window.setTimeout(() => { if (g === geracao.current) definirMostrado((m) => ({ ...m, revelada: true })) }, 700 * fator)
          }
          break
        }
        case 'dano-inimigo': {
          const forte = ev.critico || ev.duplo || ev.combo >= 5
          const medio = !forte && (ev.valor >= 20 || ev.combo >= COMBO_MINIMO)
          const cor = ev.duplo ? '#c58cff' : ev.critico ? '#ffcf5a' : combo >= 5 ? '#ff9a3c' : combo >= COMBO_MINIMO ? '#ffd27a' : '#9fd8ff'
          // 1-3: a alternativa brilha, a energia se concentra e o flashcard se ergue
          const alt = refMao.current?.querySelectorAll('.fc-alternativa')[mostradoRef.current.marcadas?.escolha ?? 0]
          const caixa = refCarta.current?.getBoundingClientRect()
          const topoCarta = caixa ? { x: caixa.left + caixa.width / 2, y: caixa.top + 24 } : centro(refCarta.current)
          if (alt) P?.carga(centro(alt), cor, 14, 60)
          definirAtacando(true)
          tocar('carga')
          P?.carga(topoCarta, cor, forte ? 34 : 22, forte ? 120 : 90)
          if (!(await esperar(320, g))) return
          // 4-6: disparo com rastro; a luz passa pela mesa
          const para = centro(refInimigo.current)
          tocar('disparo', forte ? 1.2 : 1)
          window.setTimeout(() => { if (g === geracao.current) definirMostrado((m) => ({ ...m, revelada: true })) }, 240 * fator)
          if (P) await P.projetil(topoCarta, para, { cor, nucleo: '#fff6d0', tam: 12 + Math.min(10, combo * 2) + (forte ? 6 : 0), duracao: forte ? 0.46 : 0.38, rastro: forte ? 6 : 3 })
          definirAtacando(false)
          if (g !== geracao.current) return
          // 7-13: impacto
          animar(arte(refInimigo), forte ? 'fc-anim-atingido-forte' : 'fc-anim-atingido', 640)
          posar(refInimigo, 'dano', 560)
          P?.clarao(para, cor, forte ? 380 : medio ? 280 : 200, forte ? 1 : 0.75)
          P?.fragmentos(para, PALETA_PERSONAGEM[quemInimigo], forte ? 30 : medio ? 20 : 12, forte ? 460 : 330)
          P?.explosao(para, { cor, cor2: '#fff3c0', n: forte ? 40 : 22, forca: forte ? 380 : 260 })
          P?.onda(para, cor, forte ? 170 : 110)
          if (ev.critico || ev.duplo) { P?.corte(para, cor, 96); window.setTimeout(() => P?.corte(para, '#ffffff', 84, 0.6), 70 * fator) }
          tocar(ev.critico || ev.duplo ? 'critico' : forte ? 'impacto-forte' : medio ? 'impacto-medio' : 'impacto-leve')
          tremer(forte ? 1 : medio ? 0.55 : 0.3)
          if (ev.critico || ev.duplo) flutuar(refInimigo.current, `-${ev.valor}`, '#ffd34a', { grande: true, rotulo: ev.duplo ? 'GOLPE DUPLO' : 'CRÍTICO', x: 70, y: -10 })
          else flutuar(refInimigo.current, `-${ev.valor}`, '#ffe6a8', { y: -20, x: 50 })
          if (ev.absorvido > 0) flutuar(refInimigo.current, `armadura −${ev.absorvido}`, '#cfe2ff', { y: -70, x: -20 })
          definirMostrado((m) => ({ ...m, vidaInimigo: Math.max(0, m.vidaInimigo - ev.valor) }))
          if (!(await esperar(300, g))) return
          break
        }
        case 'combo': {
          animar(document.querySelector('.fc-combo'), 'fc-combo--pulso', 500)
          if (ev.sequencia >= COMBO_MINIMO) tocar('combo')
          break
        }
        case 'dano-heroi': {
          // preparação: o adversário carrega o golpe
          animar(arte(refInimigo), 'fc-anim-prepara', 440)
          posar(refInimigo, 'preparo', 520)
          tocar('preparo-inimigo')
          P?.carga(centro(refInimigo.current), '#ff5a3c', 18, 80)
          if (!(await esperar(400, g))) return
          animar(arte(refInimigo), 'fc-anim-ataca', 440)
          posar(refInimigo, 'golpe', 620)
          const de = centro(refInimigo.current), para = centro(refHeroi.current)
          tocar('golpe-inimigo')
          if (P) await P.projetil(de, para, { cor: '#ff5a3c', nucleo: '#ffd0c0', tam: 15, duracao: 0.34, curva: -0.25, rastro: 4 })
          if (g !== geracao.current) return
          animar(arte(refHeroi), 'fc-anim-atingido', 640)
          posar(refHeroi, 'dano', 560)
          P?.garras(para)
          P?.clarao(para, '#ff3a20', 240, 0.8)
          P?.explosao(para, { cor: '#ff5a3c', cor2: '#ffb090', n: 26, forca: 300 })
          P?.fragmentos(para, ['#9fb0c8', '#f4f8ff', '#3f78c8'], 10, 260)
          tocar('dano')
          tremer(ev.valor >= 25 ? 1 : 0.6)
          definirVermelho((v) => v + 1)
          flutuar(refHeroi.current, `-${ev.valor}`, '#ff8a6a', { y: -70, grande: ev.valor >= 25, rotulo: ev.furia ? 'FÚRIA' : ev.veneno ? `VENENO +${ev.veneno}` : undefined })
          definirMostrado((m) => ({ ...m, vida: Math.max(0, m.vida - ev.valor) }))
          if (!(await esperar(260, g))) return
          break
        }
        case 'escudo': {
          animar(arte(refInimigo), 'fc-anim-ataca', 440)
          posar(refInimigo, 'golpe', 600)
          if (!(await esperar(180, g))) return
          const de = centro(refInimigo.current), para = centro(refHeroi.current)
          tocar('golpe-inimigo')
          if (P) await P.projetil(de, para, { cor: '#ff5a3c', nucleo: '#ffd0c0', tam: 14, duracao: 0.32, curva: -0.25 })
          if (g !== geracao.current) return
          animar(refHeroi.current, 'fc-anim-bloqueio', 640)
          P?.onda(para, '#7fb8ff', 110, 16)
          P?.clarao(para, '#5fa8ff', 260, 0.9)
          tocar('escudo')
          if (!(await esperar(160, g))) return
          P?.cacos(para)
          tocar('escudo-quebra')
          flutuar(refHeroi.current, 'Bloqueado', '#bfe0ff', { y: -70 })
          break
        }
        case 'imortal': {
          definirFaixa({ texto: 'Imortal!', sub: 'Você resiste com 1 de vida', tom: 'ouro' })
          P?.subir(centro(refHeroi.current), '#ffcf5a', 40, 70)
          P?.clarao(centro(refHeroi.current), '#ffcf5a', 320, 1, 0.8)
          tocar('imortal')
          definirMostrado((m) => ({ ...m, vida: 1 }))
          if (!(await esperar(1000, g))) return
          definirFaixa(null)
          break
        }
        case 'cura': {
          P?.subir(centro(refHeroi.current), '#7fe08f', 28, 70)
          P?.clarao(centro(refHeroi.current), '#5fdc7a', 200, 0.7, 0.6)
          animar(refHeroi.current, 'fc-anim-cura', 900)
          tocar('cura')
          flutuar(refHeroi.current, `+${ev.valor}`, '#8ff0a0', { y: -50, x: 60, rotulo: ev.motivo === 'pocao' ? 'POÇÃO' : ev.motivo === 'lendaria' ? 'LENDÁRIA' : 'SEQUÊNCIA' })
          definirMostrado((m) => ({ ...m, vida: Math.min(depois.vidaMax, m.vida + ev.valor) }))
          if (!(await esperar(200, g))) return
          break
        }
        case 'pocao': {
          if (ev.perdida) flutuar(refSlots.current, 'A poção se perdeu', '#ffb090', { y: -30 })
          break
        }
        case 'fase-chefe': {
          tocar('fase')
          tremer(1)
          P?.clarao(centro(refInimigo.current), '#ff3a20', 600, 1, 0.9)
          definirFaixa({ texto: ev.nome, sub: 'O chefe perde a armadura e bate mais forte', tom: 'vermelho' })
          if (!(await esperar(1200, g))) return
          definirFaixa(null)
          break
        }
        case 'furia': {
          tocar('furia')
          definirFaixa({ texto: 'Fúria!', sub: `${inimigo.nome} perdeu a paciência: dano ×1,5`, tom: 'vermelho' })
          if (!(await esperar(1000, g))) return
          definirFaixa(null)
          break
        }
        case 'inimigo-derrotado': {
          if (!(await esperar(240, g))) return
          const caixa = refInimigo.current?.getBoundingClientRect()
          if (caixa) { P?.dissolver(caixa, PALETA_PERSONAGEM[quemInimigo]); P?.fragmentos(centro(refInimigo.current), PALETA_PERSONAGEM[quemInimigo], 40, 520) }
          P?.clarao(centro(refInimigo.current), '#ffe08a', 500, 1, 0.8)
          definirMostrado((m) => ({ ...m, inimigoCaiu: true }))
          tocar(ev.chefe ? 'vitoria-chefe' : 'derrota-inimigo')
          tremer(ev.chefe ? 1 : 0.6)
          if (ev.chefe) {
            P?.confete({ x: window.innerWidth / 2, y: window.innerHeight * 0.45 }, 160)
            definirFaixa({ texto: 'Chefe derrotado!', sub: `${inimigo.nome} caiu. A masmorra é sua.`, tom: 'chefe' })
            if (!(await esperar(2300, g))) return
          } else {
            P?.confete(centro(refInimigo.current), 60)
            definirFaixa({ texto: 'Vitória!', sub: `${inimigo.nome} derrotado`, tom: 'ouro' })
            if (!(await esperar(1400, g))) return
          }
          definirFaixa(null)
          tocar('recompensa')
          break
        }
        case 'heroi-derrotado': {
          if (!(await esperar(300, g))) return
          const caixa = refHeroi.current?.getBoundingClientRect()
          if (caixa) P?.dissolver(caixa, PALETA_PERSONAGEM.heroi)
          definirMostrado((m) => ({ ...m, heroiCaiu: true }))
          tocar('derrota')
          definirFaixa({ texto: 'Você caiu', sub: 'Os flashcards que te derrubaram vão para a revisão', tom: 'vermelho' })
          if (!(await esperar(1700, g))) return
          definirFaixa(null)
          break
        }
        case 'pista': {
          definirEliminando(ev.posicao)
          tocar('pista')
          const alvo = refMao.current?.querySelectorAll('.fc-alternativa')[ev.posicao]
          if (alvo) P?.explosao(centro(alvo), { cor: '#e8d28a', cor2: '#ff9a3c', n: 24, forca: 170, gravidade: -140, formas: ['quadrado', 'brilho'] })
          if (!(await esperar(440, g))) return
          definirEliminando(null)
          break
        }
        case 'equipou': {
          tocar('poder')
          animar(refSlots.current, 'fc-encaixes--pulso', 700)
          if (refSlots.current) P?.clarao(centro(refSlots.current), RECOMPENSAS[ev.recompensa].cor, 160, 0.8, 0.6)
          break
        }
        case 'novo-inimigo': {
          if (ev.trocaCenario) {
            definirTransicao(true)
            tocar('transicao')
            if (!(await esperar(420, g))) return
            definirCenarioVisivel(ev.inimigo.cenario)
            if (!(await esperar(140, g))) return
            definirTransicao(false)
          }
          definirMostrado((m) => ({ ...m, inimigoCaiu: false, vidaInimigo: depois.inimigo.vida }))
          definirApresentacao({ inimigo: ev.inimigo, ciclo: ev.ciclo, andar: depois.andar })
          break
        }
        case 'compra': {
          tocar('compra')
          definirMostrado((m) => ({ ...m, revelada: false, resultado: null, marcadas: null }))
          definirSelecionada(null)
          if (motor.carta(ev.id).raridade === 'lendaria') window.setTimeout(() => tocar('lendario'), 300)
          break
        }
        case 'recompensas':
          break
      }
    }
    if (g === geracao.current) { definirAnimando(false); sincronizar(depois) }
  }, [esperar, flutuar, fator, sincronizar, inimigo.nome, tremer])

  /* ---------- Ações ---------- */
  const aplicar = useCallback((r: { estado: Partida; eventos: Evento[] }) => {
    // Ação recusada pelo motor: mesmo estado. Encerrar muda o estado sem animação e precisa passar.
    if (!r.eventos.length && r.estado === partidaRef.current) return
    const resposta = r.eventos.find((e): e is Extract<Evento, { tipo: 'resposta' }> => e.tipo === 'resposta')
    if (resposta) {
      const registros = ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {})
      registros[resposta.id] = registrarResposta(registros[resposta.id], resposta.certo, resposta.assistida)
      gravar(CHAVE_REGISTROS, registros)
    }
    partidaRef.current = r.estado
    definirPartida(r.estado)
    if (r.eventos.length) void encenar(r.eventos, r.estado)
    else sincronizar(r.estado)
  }, [encenar, sincronizar])

  const responder = useCallback((posicao: number) => {
    const p = partidaRef.current
    if (p.fase !== 'pergunta' || apresentacao) return
    definirMostrado((m) => ({ ...m, marcadas: { escolha: posicao, certa: -1 } }))
    mostradoRef.current = { ...mostradoRef.current, marcadas: { escolha: posicao, certa: -1 } }
    aplicar(motor.responder(p, posicao))
    definirSelecionada(null)
  }, [aplicar, apresentacao])

  const escolherAlternativa = useCallback((posicao: number, direto: boolean) => {
    const p = partidaRef.current
    if (p.fase !== 'pergunta' || !p.atual || p.atual.eliminadas.includes(posicao) || apresentacao) return
    if (direto || selecionada === posicao) responder(posicao)
    else { definirSelecionada(posicao); tocar('selecao') }
  }, [apresentacao, responder, selecionada])

  const seguir = useCallback(() => {
    const p = partidaRef.current
    if (animando) pular()
    if (p.fase === 'resposta') aplicar(motor.seguir(p))
  }, [animando, aplicar, pular])

  const usarPista = useCallback(() => { if (!apresentacao) aplicar(motor.usarPista(partidaRef.current)) }, [aplicar, apresentacao])

  const escolherRecompensa = useCallback((r: Recompensa) => {
    if (animando) pular()
    aplicar(motor.escolher(partidaRef.current, r))
  }, [animando, aplicar, pular])

  const novaPartida = useCallback(() => {
    pular()
    const r = motor.novaPartida(sementeNova())
    definirMostrado({ vida: r.estado.vida, vidaInimigo: r.estado.inimigo.vida, revelada: false, resultado: null, marcadas: null, inimigoCaiu: false, heroiCaiu: false })
    aplicar(r)
  }, [aplicar, pular])

  const encerrar = useCallback(() => { pular(); aplicar(motor.encerrar(partidaRef.current)) }, [aplicar, pular])

  const revisarNoEstudo = useCallback(() => {
    definirEstudoPrimeiro(partidaRef.current.derrubaram)
    definirModo('estudo')
  }, [])

  const fechar = useCallback(() => { tocar('fechar'); navegar('/treinar') }, [])
  const pedirFechar = useCallback(() => {
    const p = partidaRef.current
    if (p.fase === 'fim' || (p.rodada === 0 && modo === 'batalha')) fechar()
    else definirConfirmarSaida(true)
  }, [fechar, modo])

  // Teclado: 1 a 4 respondem; Enter/espaço seguem; P usa a pista; Esc pula a animação ou pede para fechar.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const alvo = e.target as HTMLElement
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName) && e.key !== 'Escape') return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (ampliada) definirAmpliada(null)
        else if (ajustesAbertos) definirAjustesAbertos(false)
        else if (confirmarSaida) definirConfirmarSaida(false)
        else if (apresentacao) definirApresentacao(null)
        else if (animando) pular()
        else pedirFechar()
        return
      }
      if (modo !== 'batalha' || ajustesAbertos || ampliada || confirmarSaida) return
      const p = partidaRef.current
      if (apresentacao && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); definirApresentacao(null); return }
      if (/^[1-4]$/.test(e.key) && p.fase === 'pergunta') { e.preventDefault(); escolherAlternativa(+e.key - 1, true); return }
      if ((e.key === 'p' || e.key === 'P') && p.fase === 'pergunta') { usarPista(); return }
      if (e.key === 'Enter' || (e.key === ' ' && alvo?.tagName !== 'BUTTON' && alvo?.tagName !== 'A')) {
        if (p.fase === 'resposta') { e.preventDefault(); seguir() }
        else if (p.fase === 'pergunta' && selecionada !== null) { e.preventDefault(); responder(selecionada) }
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [modo, ajustesAbertos, ampliada, confirmarSaida, apresentacao, animando, pular, pedirFechar, escolherAlternativa, usarPista, seguir, responder, selecionada])

  useEffect(() => {
    if (!apresentacao) return
    const t = window.setTimeout(() => definirApresentacao(null), reduzido ? 900 : 2600)
    return () => window.clearTimeout(t)
  }, [apresentacao, reduzido])

  /* ---------- Tela ---------- */
  const fase2 = partida.inimigo.fase === 2
  const ordem = partida.atual?.ordem ?? []
  const pistas = partida.encaixes.find((e) => e.tipo === 'pista')?.carga ?? 0
  const rodadasFuria = Math.max(0, inimigo.paciencia - partida.inimigo.rodadas)
  // os adversários novos são desenhados maiores; a Serpente ainda está no tamanho antigo
  const escalaInimigo = inimigo.sprite === 'serpente' ? (faixaTela === 'larga' ? 3 : faixaTela === 'celular' ? 1.5 : 2) : faixaTela === 'larga' ? 2 : faixaTela === 'celular' ? 1 : 1.5
  const escalaHeroi = faixaTela === 'celular' ? 1.5 : faixaTela === 'baixa' ? 2 : 3
  const botao = partida.fase === 'pergunta'
    ? { texto: 'Atacar', sub: selecionada !== null ? `alternativa ${selecionada + 1}` : 'escolha uma', ativo: selecionada !== null && !apresentacao, acao: () => selecionada !== null && responder(selecionada), classe: selecionada !== null ? 'pronto' : '' }
    : partida.fase === 'resposta'
      ? { texto: 'Seguir', sub: 'Enter', ativo: true, acao: seguir, classe: 'seguir' }
      : { texto: partida.fase === 'recompensa' ? 'Poder' : 'Fim', sub: '', ativo: false, acao: () => {}, classe: '' }
  const mostrarRecompensas = partida.fase === 'recompensa' && !animando
  const mostrarFim = partida.fase === 'fim' && !animando
  const ciclo = inimigoDoAndar(partida.andar).ciclo

  const classes = ['fc-arena', `fc-arena--${modo}`, `fc-arena--${faixaTela}`, `fc-arena--fase-${partida.fase}`, reduzido ? 'fc-arena--reduzida' : '', mostrado.vida <= 25 && modo === 'batalha' ? 'fc-arena--perigo' : ''].filter(Boolean).join(' ')

  return (
    <ModalJogo titulo="Torneio de Flashcards" aoPedirFechar={pedirFechar}>
      <div className={classes} data-cenario={cenarioVisivel}>
        <Cenario cena={modo === 'estudo' ? 'biblioteca' : cenarioVisivel} reduzido={reduzido} />

        <header className="fc-topo">
          <div className="fc-abas" role="tablist" aria-label="Modo">
            <button type="button" role="tab" aria-selected={modo === 'batalha'} onClick={() => { tocar('selecao'); definirModo('batalha') }}>
              <Sprite nome="espada" className="fc-sprite--icone" /> Batalha
            </button>
            <button type="button" role="tab" aria-selected={modo === 'estudo'} onClick={() => { pular(); tocar('selecao'); definirModo('estudo') }}>
              <Sprite nome="pergaminho" className="fc-sprite--icone" /> Estudo
            </button>
          </div>
          <div className="fc-topo__centro">
            {modo === 'batalha' ? (
              <>
                <span className="fc-topo__titulo">Torneio de Flashcards</span>
                <span className="fc-topo__progresso">
                  <span className="fc-trilha" aria-label={`Andar ${partida.andar} de ${BESTIARIO.length}`}>
                    {BESTIARIO.map((b, i) => {
                      const n = ((partida.andar - 1) % BESTIARIO.length)
                      return <i key={b.id} className={i < n ? 'feito' : i === n ? 'atual' : ''} title={b.nome} />
                    })}
                  </span>
                  <b>Andar {partida.andar}</b>{ciclo ? ` · ciclo ${ciclo + 1}` : ''} <span aria-hidden="true">·</span> <b>{partida.pontos}</b> pts
                </span>
              </>
            ) : (
              <><span className="fc-topo__titulo">Biblioteca do Torneio</span><span className="fc-topo__progresso">Modo Estudo · revisão calma</span></>
            )}
          </div>
          <div className="fc-topo__acoes">
            <button type="button" className="fc-topo-botao" onClick={() => { destravar(); definirAjustes({ som: !ajustes.som }) }} aria-pressed={ajustes.som} aria-label={ajustes.som ? 'Desligar o som' : 'Ligar o som'} title={ajustes.som ? 'Som ligado' : 'Som desligado'}>
              {ajustes.som ? (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" /><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              )}
            </button>
            <button type="button" className="fc-topo-botao" onClick={() => definirAjustesAbertos(true)} aria-label="Ajustes de som e efeitos" title="Ajustes">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <span className="fc-topo-botao__texto">Ajustes</span>
            </button>
          </div>
        </header>

        {modo === 'estudo' ? (
          <Estudo primeiro={estudoPrimeiro} aoAmpliar={definirAmpliada} reduzido={reduzido} />
        ) : (
          <div className="fc-batalha">
            {/* Adversário em cena, de pé sobre a arena */}
            <section className={`fc-inimigo${inimigo.chefe ? ' fc-inimigo--chefe' : ''}${fase2 ? ' fc-inimigo--fase2' : ''}${partida.inimigo.furia ? ' fc-inimigo--furia' : ''}`} aria-label={`Adversário: ${inimigo.nome}`}>
              <Ator ref={refInimigo} quem={inimigo.sprite as Personagem} escala={escalaInimigo} chefe={inimigo.chefe} classe={'fc-ator--inimigo' + (mostrado.inimigoCaiu ? ' fc-ator--caiu' : '')} />
              <div className="fc-placa">
                <div className="fc-placa__nome">
                  {inimigo.chefe && <em className="fc-selo fc-selo--chefe">Chefe</em>}
                  <strong>{inimigo.nome}</strong>
                  {fase2 && <em className="fc-selo fc-selo--fase">{inimigo.fase2?.nome}</em>}
                </div>
                <BarraVida atual={mostrado.vidaInimigo} maximo={partida.inimigo.vidaMax} tipo={inimigo.chefe ? 'chefe' : 'inimigo'} rotulo={`Vida de ${inimigo.nome}`} />
                <div className="fc-placa__info">
                  <span className="fc-info fc-info--andar">Andar {partida.andar} · {partida.pontos} pts</span>
                  {partida.inimigo.furia ? <span className="fc-info fc-info--furia">Fúria · dano ×1,5</span> : <span className="fc-info" title="Rodadas até a Fúria">Fúria em {rodadasFuria}</span>}
                  {atributos.armadura > 0 && <span className="fc-info fc-info--armadura">Armadura {atributos.armadura}</span>}
                  {inimigo.porErroSeguido > 0 && <span className="fc-info">{inimigo.chefe ? 'Pressão' : 'Veneno'} +{inimigo.porErroSeguido} por erro seguido</span>}
                </div>
              </div>
              {partida.fase === 'pergunta' && (
                <div className={`fc-intencao${intencao.furia ? ' fc-intencao--furia' : ''}${intencao.bloqueado ? ' fc-intencao--bloqueado' : ''}`} title={intencao.bloqueado ? 'O escudo bloqueia o próximo golpe' : 'Intenção do adversário: o dano que você leva se errar'}>
                  <span className="fc-intencao__gema">{intencao.bloqueado ? <Sprite nome="escudo" className="fc-sprite--icone" /> : <b>{intencao.dano}</b>}</span>
                  <small>{intencao.bloqueado ? 'escudo pronto' : 'se errar'}</small>
                </div>
              )}
            </section>

            {/* Estrado de pedra com o flashcard */}
            <section className="fc-mesa" ref={refMesa} aria-label="Mesa da batalha">
              <TampoMesa cenario={cenarioVisivel} />
              <span className="fc-gema fc-gema--1" aria-hidden="true" /><span className="fc-gema fc-gema--2" aria-hidden="true" />
              <span className="fc-gema fc-gema--3" aria-hidden="true" /><span className="fc-gema fc-gema--4" aria-hidden="true" />
              <div className="fc-pilha fc-pilha--baralho" aria-label={`${partida.baralho.length} flashcards no baralho`}><span className="fc-costas" /><span className="fc-costas" /><span className="fc-costas" /><b>{partida.baralho.length}</b><small>Baralho</small></div>
              <div className="fc-pilha fc-pilha--descarte" aria-label={`${partida.descarte.length} no descarte`}>{partida.descarte.length > 0 && <><span className="fc-costas" /><span className="fc-costas" /></>}<b>{partida.descarte.length}</b><small>Descarte</small></div>
              <div className="fc-mesa__palco" ref={refCarta}>
                {carta && partida.atual && (
                  <Cartao
                    chave={partida.rodada + '-' + partida.atual.id}
                    carta={carta}
                    virada={mostrado.revelada && partida.fase !== 'pergunta'}
                    dicaFrente={faixaTela === 'celular' ? 'Escolha a resposta abaixo' : 'Escolha a resposta na sua mão · teclas 1 a 4'}
                    aoAmpliar={(i) => { tocar('selecao'); definirAmpliada(i) }}
                    resultado={partida.fase !== 'pergunta' ? mostrado.resultado : null}
                    assistida={partida.atual.assistida}
                    aoGirar={() => tocar('giro')}
                    reduzido={reduzido}
                    classe={atacando ? 'fc-carta--ataca' : ''}
                  />
                )}
              </div>
            </section>

            {/* Você */}
            <section className="fc-jogador" aria-label="Você">
              <div className="fc-heroi">
                <Ator ref={refHeroi} quem="heroi" escala={escalaHeroi} classe={'fc-ator--heroi' + (mostrado.heroiCaiu ? ' fc-ator--caiu' : '')}>
                  {partida.encaixes.some((e) => e.tipo === 'escudo') && <span className="fc-bolha-escudo" />}
                </Ator>
                <div className="fc-heroi__dados">
                  <div className="fc-heroi__nome"><Sprite nome="coracao" className="fc-sprite--coracao" /><strong>Você</strong>
                    <span className={`fc-combo${partida.sequencia >= COMBO_MINIMO ? ' fc-combo--ativo' : ''}`} aria-label={`Sequência de ${partida.sequencia} acertos`}>
                      {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < Math.min(5, partida.sequencia) ? 'aceso' : ''} />)}
                      <span>{partida.sequencia >= COMBO_MINIMO ? `Combo ×${partida.sequencia}` : `Sequência ${partida.sequencia}`}</span>
                    </span>
                  </div>
                  <BarraVida atual={mostrado.vida} maximo={partida.vidaMax} tipo="heroi" rotulo="Sua vida" />
                  <div className="fc-encaixes" ref={refSlots} aria-label="Poderes equipados">
                    {Array.from({ length: ENCAIXES }, (_, i) => {
                      const e = partida.encaixes[i]
                      const usavel = !!e && e.tipo === 'pista' && partida.fase === 'pergunta' && !partida.atual?.respondida && ordem.length - (partida.atual?.eliminadas.length ?? 0) > 2 && !apresentacao
                      return <Encaixe key={i} tipo={e?.tipo} carga={e?.carga} extra={e?.tipo === 'pocao' ? partida.pocao : undefined} usavel={usavel} aoUsar={usarPista} />
                    })}
                    {partida.reliquias.map((r) => <span key={r} className="fc-reliquia" title={`${RECOMPENSAS[r].nome}: ${RECOMPENSAS[r].texto}`} style={{ ['--cor' as string]: RECOMPENSAS[r].cor }}><Sprite nome={RECOMPENSAS[r].icone} className="fc-sprite--icone" /></span>)}
                  </div>
                </div>
              </div>

              <div className={`fc-mao${partida.fase !== 'pergunta' ? ' fc-mao--respondida' : ''}`} ref={refMao} role="group" aria-label="Sua mão: alternativas">
                {carta && ordem.map((opcao, pos) => {
                  const eliminada = partida.atual!.eliminadas.includes(pos)
                  const m = mostrado.marcadas
                  const estado = m && m.certa >= 0 ? (pos === m.certa ? 'certa' : pos === m.escolha ? 'errada' : 'apagada') : m && pos === m.escolha ? 'jogada' : ''
                  return (
                    <div key={partida.rodada + '-' + pos} className={`fc-slot-mao${selecionada === pos ? ' fc-slot-mao--sel' : ''}`} style={{ ['--i' as string]: pos, ['--n' as string]: ordem.length }}>
                      <button
                        type="button"
                        className={`fc-alternativa${eliminada ? ' fc-alternativa--eliminada' : ''}${eliminando === pos ? ' fc-alternativa--queimando' : ''}${estado ? ' fc-alternativa--' + estado : ''}`}
                        disabled={partida.fase !== 'pergunta' || eliminada || !!apresentacao}
                        onClick={() => escolherAlternativa(pos, false)}
                        onPointerEnter={() => { if (partida.fase === 'pergunta' && !eliminada && faixaTela !== 'celular') tocar('hover') }}
                        aria-pressed={selecionada === pos}
                        aria-label={`Alternativa ${pos + 1}: ${carta.opcoes[opcao]}${eliminada ? ' (eliminada pela pista)' : ''}`}
                      >
                        <i aria-hidden="true">{pos + 1}</i>
                        <span>{carta.opcoes[opcao]}</span>
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="fc-acao">
                <button type="button" className={`fc-principal ${botao.classe}`} disabled={!botao.ativo} onClick={() => { tocar('confirmar'); botao.acao() }}>
                  <span>{botao.texto}</span>{botao.sub && <small>{botao.sub}</small>}
                </button>
                <p className="fc-dica" aria-live="polite">
                  {partida.fase === 'pergunta' && (pistas > 0 ? `Pista ×${pistas}: toque no pergaminho (P)` : selecionada === null ? 'Toque numa alternativa' : 'Toque de novo ou em Atacar')}
                  {partida.fase === 'resposta' && !animando && (mostrado.resultado === 'certo' ? 'Leia o verso e siga' : 'Leia a explicação e siga')}
                </p>
              </div>
            </section>
          </div>
        )}

        <canvas ref={canvasPalco} className="fc-palco-efeitos" aria-hidden="true" />
        <div className="fc-flutuantes" aria-hidden="true">
          {flutuantes.map((f) => (
            <span key={f.id} className={'fc-flutua' + (f.grande ? ' fc-flutua--grande' : '')} style={{ left: f.x, top: f.y, color: f.tom }}>
              {f.texto}{f.rotulo && <small>{f.rotulo}</small>}
            </span>
          ))}
        </div>
        <div className="fc-borda-vermelha" key={'v-' + vermelho} data-ativo={vermelho > 0 ? 1 : 0} aria-hidden="true" />
        {transicao && <div className="fc-transicao" aria-hidden="true" />}
        <div className="fc-girar" role="status">
          <span className="fc-girar__celular" aria-hidden="true" />
          <strong>Gire o celular</strong>
          <small>O Torneio foi feito para a tela em pé.</small>
        </div>

        {faixa && modo === 'batalha' && (
          <div className={`fc-faixa fc-faixa--${faixa.tom}`} role="status" onClick={pular}>
            {faixa.tom === 'chefe' && <span className="fc-faixa__raios" aria-hidden="true" />}
            <strong>{faixa.texto}</strong>{faixa.sub && <small>{faixa.sub}</small>}
          </div>
        )}

        {apresentacao && modo === 'batalha' && (
          <div className={`fc-apresenta${apresentacao.inimigo.chefe ? ' fc-apresenta--chefe' : ''}`} role="dialog" aria-label={`Andar ${apresentacao.andar}: ${apresentacao.inimigo.nome}`} onClick={() => definirApresentacao(null)}>
            <div className="fc-apresenta__cartaz">
              <span className="fc-apresenta__andar">Andar {apresentacao.andar}{apresentacao.ciclo ? ` · Ciclo ${apresentacao.ciclo + 1}` : ''}{apresentacao.inimigo.chefe ? ' · Chefe' : ''}</span>
              <div className="fc-apresenta__palco"><Ator quem={apresentacao.inimigo.sprite as Personagem} escala={(apresentacao.inimigo.sprite === 'serpente' ? 1.5 : 1) * (faixaTela === 'celular' ? 2 : 3)} chefe={apresentacao.inimigo.chefe} /></div>
              <strong>{apresentacao.inimigo.nome}</strong>
              <em>{apresentacao.inimigo.lema}</em>
              <p>{apresentacao.inimigo.habilidade}</p>
              <p className="fc-apresenta__numeros"><span>Vida {inimigoDoAndar(apresentacao.andar).inimigo.vida}</span><span>Força ×{inimigoDoAndar(apresentacao.andar).inimigo.forca}</span></p>
              <small>Toque para começar</small>
            </div>
          </div>
        )}

        {mostrarRecompensas && modo === 'batalha' && <Recompensas partida={partida} aoEscolher={escolherRecompensa} aoEncerrar={encerrar} />}
        {mostrarFim && modo === 'batalha' && <Fim partida={partida} aoNova={novaPartida} aoRevisar={revisarNoEstudo} aoSair={fechar} />}

        {ampliada && (
          <div className="fc-veu fc-veu--imagem" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={() => definirAmpliada(null)}>
            <figure className="fc-ampliada" onClick={(e) => e.stopPropagation()}>
              <img src={ampliada.src} alt="Figura da questão de origem, ampliada" />
              <figcaption>{ampliada.legenda}</figcaption>
              <button type="button" className="fc-botao" onClick={() => definirAmpliada(null)} autoFocus>Fechar imagem</button>
            </figure>
          </div>
        )}

        {confirmarSaida && (
          <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-sair-titulo">
            <div className="fc-janela">
              <h2 id="fc-sair-titulo">Sair do Torneio?</h2>
              <p className="fc-janela__sub">Sua partida fica salva neste aparelho e continua de onde parou quando você voltar.</p>
              <div className="fc-janela__botoes">
                <button type="button" className="fc-botao fc-botao--secundario" onClick={fechar}>Sair</button>
                <button type="button" className="fc-botao" onClick={() => definirConfirmarSaida(false)} autoFocus>Continuar jogando</button>
              </div>
            </div>
          </div>
        )}

        {ajustesAbertos && (
          <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-ajustes-titulo" onClick={() => definirAjustesAbertos(false)}>
            <div className="fc-janela" onClick={(e) => e.stopPropagation()}>
              <h2 id="fc-ajustes-titulo">Ajustes</h2>
              <fieldset className="fc-grupo">
                <legend>Som</legend>
                <label className="fc-ajuste"><input id="fc-som" type="checkbox" checked={ajustes.som} onChange={(e) => { destravar(); definirAjustes({ som: e.target.checked }); if (e.target.checked) window.setTimeout(() => tocar('poder'), 50) }} /><span>Som ligado</span></label>
                <label className="fc-ajuste fc-ajuste--volume"><span>Efeitos</span><input id="fc-vol-efeitos" type="range" min={0} max={1} step={0.05} value={ajustes.volEfeitos} disabled={!ajustes.som} onChange={(e) => definirAjustes({ volEfeitos: +e.target.value })} onPointerUp={() => tocar('impacto-medio')} /></label>
                <label className="fc-ajuste fc-ajuste--volume"><span>Ambiente</span><input id="fc-vol-ambiente" type="range" min={0} max={1} step={0.05} value={ajustes.volAmbiente} disabled={!ajustes.som} onChange={(e) => definirAjustes({ volAmbiente: +e.target.value })} /></label>
              </fieldset>
              <fieldset className="fc-grupo">
                <legend>Movimento</legend>
                <label className="fc-ajuste"><input id="fc-efeitos" type="checkbox" checked={reduzido} onChange={(e) => definirAjustes({ efeitos: e.target.checked ? 'reduzidos' : 'completos' })} /><span>Reduzir movimento (sem tremor, partículas e giro)</span></label>
                <label className="fc-ajuste"><input id="fc-rapido" type="checkbox" checked={ajustes.velocidade === 'rapida'} onChange={(e) => definirAjustes({ velocidade: e.target.checked ? 'rapida' : 'normal' })} /><span>Animações rápidas</span></label>
              </fieldset>
              <p className="fc-janela__nota">Teclado: 1 a 4 respondem, Enter segue, P usa a pista, Esc pula a animação ou fecha.</p>
              <div className="fc-janela__botoes">
                <button type="button" className="fc-botao fc-botao--secundario" onClick={() => { definirAjustesAbertos(false); novaPartida() }}>Recomeçar partida</button>
                <button type="button" className="fc-botao" onClick={() => definirAjustesAbertos(false)} autoFocus>Pronto</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalJogo>
  )
}

function Recompensas({ partida, aoEscolher, aoEncerrar }: { partida: Partida; aoEscolher: (r: Recompensa) => void; aoEncerrar: () => void }) {
  const chefe = !!inimigoDoAndar(partida.andar).inimigo.chefe
  const proximo = inimigoDoAndar(partida.andar + 1)
  const cheios = partida.encaixes.length >= ENCAIXES
  return (
    <div className="fc-veu fc-veu--recompensa" role="dialog" aria-modal="true" aria-labelledby="fc-rec-titulo">
      <div className={`fc-janela fc-janela--larga${chefe ? ' fc-janela--chefe' : ''}`}>
        <h2 id="fc-rec-titulo">{chefe ? 'Tesouro do chefe' : 'Escolha um poder'}</h2>
        <p className="fc-janela__sub">Próximo: andar {partida.andar + 1}, {proximo.inimigo.nome}{proximo.ciclo ? ` (ciclo ${proximo.ciclo + 1}, mais forte)` : ''}.</p>
        <div className="fc-recompensas">
          {partida.recompensas.map((r, i) => {
            const d = RECOMPENSAS[r]
            const repetido = ehPoder(r) && partida.encaixes.some((e) => e.tipo === r)
            const substitui = ehPoder(r) && !repetido && cheios ? RECOMPENSAS[partida.encaixes[0].tipo].nome : null
            return (
              <button key={r} type="button" className={`fc-recompensa fc-recompensa--${d.tipo}`} style={{ ['--cor' as string]: d.cor, ['--i' as string]: i }} onClick={() => aoEscolher(r)} onPointerEnter={() => tocar('hover')} autoFocus={i === 0}>
                <span className="fc-recompensa__tipo">{d.tipo === 'reliquia' ? 'Relíquia' : 'Poder'}{d.rara ? ' rara' : ''}</span>
                <span className="fc-recompensa__icone"><Sprite nome={d.icone} /></span>
                <strong>{d.nome}</strong>
                <span className="fc-recompensa__texto">{d.texto}</span>
                {substitui && <small className="fc-recompensa__aviso">Encaixes cheios: substitui {substitui}</small>}
                {repetido && <small className="fc-recompensa__aviso">Soma ao que você já tem</small>}
              </button>
            )
          })}
        </div>
        {chefe && <button type="button" className="fc-botao fc-botao--secundario" onClick={aoEncerrar}>Encerrar com a vitória</button>}
      </div>
    </div>
  )
}

function Fim({ partida, aoNova, aoRevisar, aoSair }: { partida: Partida; aoNova: () => void; aoRevisar: () => void; aoSair: () => void }) {
  const total = partida.acertos + partida.erros
  const venceu = partida.venceu
  const derrubaram = partida.derrubaram.map((id) => motor.carta(id))
  const ultimo = BESTIARIO[(partida.andar - 1) % BESTIARIO.length]
  return (
    <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-fim-titulo">
      <div className={`fc-janela fc-janela--larga${venceu ? ' fc-janela--chefe' : ''}`}>
        <h2 id="fc-fim-titulo">{venceu ? 'Vitória no Torneio!' : `Você caiu no andar ${partida.andar}`}</h2>
        <p className="fc-janela__sub">{venceu ? `Você venceu ${partida.chefesDerrotados} chefe${partida.chefesDerrotados > 1 ? 's' : ''}.` : `${ultimo.nome} levou a melhor desta vez.`}</p>
        <dl className="fc-numeros">
          <div><dt>Pontos</dt><dd>{partida.pontos}</dd></div>
          <div><dt>Acertos</dt><dd>{partida.acertos}<small> de {total}</small></dd></div>
          <div><dt>Assistidos</dt><dd>{partida.assistidos}</dd></div>
          <div><dt>Melhor sequência</dt><dd>{partida.melhorSequencia}</dd></div>
          <div><dt>Adversários</dt><dd>{partida.derrotados}</dd></div>
        </dl>
        {derrubaram.length > 0 && (
          <>
            <h3>Os flashcards que te derrubaram</h3>
            <p className="fc-janela__nota">Entram na sua revisão de flashcards. Revise agora no modo Estudo ou faça a questão de origem.</p>
            <ul className="fc-lista-derrota">
              {derrubaram.map((c) => (
                <li key={c.id}>
                  <span><strong>{c.resposta}</strong><small>{c.assunto} · {c.questao}</small></span>
                  <a href={href(`/questao/${c.questao}`)} target="_blank" rel="noopener" className="fc-botao-pequeno">Fazer a questão ↗</a>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="fc-janela__botoes">
          {derrubaram.length > 0 && <button type="button" className="fc-botao fc-botao--secundario" onClick={aoRevisar}>Revisar no Estudo</button>}
          <button type="button" className="fc-botao fc-botao--secundario" onClick={aoSair}>Sair</button>
          <button type="button" className="fc-botao" onClick={aoNova} autoFocus>Nova partida</button>
        </div>
      </div>
    </div>
  )
}
