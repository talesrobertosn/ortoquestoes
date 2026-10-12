import { useCallback, useEffect, useRef, useState } from 'react'
import { gravar, ler } from '../../estado/armazenamento'
import { href, navegar } from '../../util/rotas'
import { BARALHO_DEMO } from '../dados/baralhoDemo'
import { Palco, centro } from '../efeitos/palco'
import { configurarSom, tocar } from '../efeitos/sons'
import { sementeNova } from '../motor/aleatorio'
import { BESTIARIO, inimigoDoAndar, type Inimigo } from '../motor/bestiario'
import { ENCAIXES, RECOMPENSAS, ehPoder, type Recompensa } from '../motor/poderes'
import { COMBO_MINIMO, criarMotor, type Evento, type Partida } from '../motor/regras'
import { CHAVE_AJUSTES, CHAVE_PARTIDA, CHAVE_REGISTROS, registrarResposta, type RegistroFlashcard } from '../progresso'
import { Cartao } from './Cartao'
import { Cenario, TampoMesa } from './Cenario'
import { Estudo } from './Estudo'
import { Sprite } from './Sprite'

export interface Ajustes { som: boolean; volume: number; efeitos: 'completos' | 'reduzidos' }
const AJUSTES_PADRAO: Ajustes = { som: false, volume: 0.6, efeitos: 'completos' }

const motor = criarMotor(BARALHO_DEMO)

/** Partida salva só vale se for da versão atual e se todos os flashcards ainda existirem. */
function partidaSalva(): Partida | null {
  const p = ler<Partida | null>(CHAVE_PARTIDA, null)
  if (!p || p.versao !== 1 || p.fase === 'fim') return null
  try {
    ;[...p.baralho, ...p.descarte, ...(p.atual ? [p.atual.id] : [])].forEach((id) => motor.carta(id))
    return p
  } catch { return null }
}

type Faixa = { texto: string; sub?: string; tom: 'ouro' | 'vermelho' | 'azul' | 'verde' | 'chefe' } | null
type Flutuante = { id: number; x: number; y: number; texto: string; tom: string; grande?: boolean; rotulo?: string }

interface Mostrado {
  vida: number
  vidaInimigo: number
  revelada: boolean
  resultado: 'certo' | 'errado' | null
  /** Posição marcada certa/errada na mão. */
  marcadas: { escolha: number; certa: number } | null
  inimigoCaiu: boolean
  heroiCaiu: boolean
}

export function Arena() {
  const [ajustes, definirAjustesBruto] = useState<Ajustes>(() => {
    const salvos = ler<Partial<Ajustes>>(CHAVE_AJUSTES, {})
    const reduzSistema = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    return { ...AJUSTES_PADRAO, efeitos: reduzSistema ? 'reduzidos' : 'completos', ...salvos }
  })
  const definirAjustes = (a: Partial<Ajustes>) => definirAjustesBruto((v) => { const n = { ...v, ...a }; gravar(CHAVE_AJUSTES, n); return n })
  const reduzido = ajustes.efeitos === 'reduzidos'

  const [modo, definirModo] = useState<'batalha' | 'estudo'>('batalha')
  const [partida, definirPartida] = useState<Partida>(() => partidaSalva() ?? motor.novaPartida(sementeNova()).estado)
  const partidaRef = useRef(partida)
  const [mostrado, definirMostrado] = useState<Mostrado>(() => ({
    vida: partida.vida, vidaInimigo: partida.inimigo.vida, revelada: partida.fase !== 'pergunta', resultado: null, marcadas: null, inimigoCaiu: false, heroiCaiu: false,
  }))
  const [animando, definirAnimando] = useState(false)
  const [selecionada, definirSelecionada] = useState<number | null>(null)
  const [faixa, definirFaixa] = useState<Faixa>(null)
  const [apresentacao, definirApresentacao] = useState<{ inimigo: Inimigo; ciclo: number; andar: number } | null>(null)
  const [flutuantes, definirFlutuantes] = useState<Flutuante[]>([])
  const [ampliada, definirAmpliada] = useState<{ src: string; legenda: string } | null>(null)
  const [ajustesAbertos, definirAjustesAbertos] = useState(false)
  const [transicao, definirTransicao] = useState(false)
  const [tremor, definirTremor] = useState(0)
  const [vermelho, definirVermelho] = useState(0)
  const [pulsos, definirPulsos] = useState<Record<string, number>>({})
  const [eliminando, definirEliminando] = useState<number | null>(null)
  const [cenarioVisivel, definirCenarioVisivel] = useState(() => inimigoDoAndar(partida.andar).inimigo.cenario)
  const [estudoPrimeiro, definirEstudoPrimeiro] = useState<string[]>([])

  const canvasPalco = useRef<HTMLCanvasElement>(null)
  const palco = useRef<Palco | null>(null)
  const refInimigo = useRef<HTMLDivElement>(null)
  const refHeroi = useRef<HTMLDivElement>(null)
  const refCarta = useRef<HTMLDivElement>(null)
  const refMao = useRef<HTMLDivElement>(null)
  const refSlots = useRef<HTMLDivElement>(null)
  const geracao = useRef(0)
  const idFlutuante = useRef(0)

  useEffect(() => { configurarSom(ajustes.som, ajustes.volume) }, [ajustes.som, ajustes.volume])
  useEffect(() => { partidaRef.current = partida; gravar(CHAVE_PARTIDA, partida) }, [partida])
  // Só no desenvolvimento: os testes de tela leem o estado para escolher a alternativa certa ou errada.
  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __torneio: unknown }).__torneio = { partida, certa: partida.atual ? partida.atual.ordem.indexOf(motor.carta(partida.atual.id).certa) : -1, definir: (p: Partida) => { partidaRef.current = p; definirPartida(p); sincronizar(p) } } })

  useEffect(() => {
    if (!canvasPalco.current) return
    const p = new Palco(canvasPalco.current)
    palco.current = p
    const aoRedimensionar = () => p.redimensionar()
    window.addEventListener('resize', aoRedimensionar)
    return () => { window.removeEventListener('resize', aoRedimensionar); p.limpar() }
  }, [])
  useEffect(() => { if (palco.current) palco.current.reduzido = reduzido }, [reduzido])

  // Trava a rolagem da página enquanto a arena está aberta.
  useEffect(() => {
    const antes = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.classList.add('fc-aberta')
    return () => { document.documentElement.style.overflow = antes; document.body.classList.remove('fc-aberta') }
  }, [])

  // Apresenta o primeiro adversário ao abrir.
  useEffect(() => {
    const { inimigo, ciclo } = inimigoDoAndar(partida.andar)
    if (partida.fase === 'pergunta' && partida.rodada === 0) definirApresentacao({ inimigo, ciclo, andar: partida.andar })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const carta = partida.atual ? motor.carta(partida.atual.id) : null
  const inimigo = motor.inimigoAtual(partida)
  const intencao = motor.intencao(partida)

  /* ---------- Diretor de efeitos ---------- */

  const esperar = useCallback((ms: number, g: number) => new Promise<boolean>((resolver) => {
    const fator = reduzido ? 0.35 : 1
    window.setTimeout(() => resolver(g === geracao.current), ms * fator)
  }), [reduzido])

  const flutuar = useCallback((el: Element | null, texto: string, tom: string, extra?: Partial<Flutuante>) => {
    const { x, y } = centro(el)
    const id = ++idFlutuante.current
    const margem = Math.min(window.innerWidth / 2, 40 + texto.length * 9)
    const xx = Math.min(Math.max(x + (extra?.x ?? 0), margem), window.innerWidth - margem)
    definirFlutuantes((f) => [...f, { id, x: xx, y: y + (extra?.y ?? 0), texto, tom, grande: extra?.grande, rotulo: extra?.rotulo }])
    window.setTimeout(() => definirFlutuantes((f) => f.filter((v) => v.id !== id)), extra?.grande ? 1400 : 1100)
  }, [])

  const pulsar = (nome: string) => definirPulsos((p) => ({ ...p, [nome]: (p[nome] ?? 0) + 1 }))

  /** Sincroniza o que está na tela com o estado real (fim ou pulo da animação). */
  const sincronizar = useCallback((p: Partida) => {
    definirMostrado((m) => ({ ...m, vida: p.vida, vidaInimigo: p.inimigo.vida, revelada: p.fase !== 'pergunta', heroiCaiu: p.vida <= 0, inimigoCaiu: p.inimigo.vida <= 0 && p.fase !== 'pergunta' }))
  }, [])

  const pular = useCallback(() => {
    geracao.current++
    palco.current?.limpar()
    definirAnimando(false)
    definirFaixa(null)
    definirTransicao(false)
    definirEliminando(null)
    definirCenarioVisivel(inimigoDoAndar(partidaRef.current.andar).inimigo.cenario)
    sincronizar(partidaRef.current)
  }, [sincronizar])

  const encenar = useCallback(async (eventos: Evento[], depois: Partida) => {
    const g = ++geracao.current
    const P = palco.current
    definirAnimando(true)
    const comboAtual = depois.sequencia
    for (const ev of eventos) {
      if (g !== geracao.current) return
      switch (ev.tipo) {
        case 'resposta': {
          definirMostrado((m) => ({ ...m, marcadas: { escolha: ev.escolha, certa: ev.certa }, resultado: ev.certo ? 'certo' : 'errado' }))
          tocar(ev.certo ? 'selecao' : 'erro')
          if (!ev.certo) {
            // revela já: o erro não pode atrasar a leitura da explicação
            window.setTimeout(() => { if (g === geracao.current) definirMostrado((m) => ({ ...m, revelada: true })) }, reduzido ? 60 : 650)
          }
          break
        }
        case 'dano-inimigo': {
          const de = centro(refCarta.current), para = centro(refInimigo.current)
          const forte = ev.critico || ev.duplo || ev.combo >= COMBO_MINIMO
          const cor = ev.duplo ? '#c58cff' : ev.critico ? '#ffcf5a' : comboAtual >= 5 ? '#ff9a3c' : '#ffe08a'
          tocar('disparo')
          window.setTimeout(() => { if (g === geracao.current) definirMostrado((m) => ({ ...m, revelada: true })) }, reduzido ? 60 : 260)
          if (P) await P.projetil(de, para, { cor, nucleo: '#fff6d0', tam: 12 + Math.min(10, comboAtual * 2) + (forte ? 4 : 0), duracao: 0.4, rastro: forte ? 5 : 3 })
          if (g !== geracao.current) return
          pulsar('inimigo-dano')
          P?.corte(para, cor, ev.critico ? 92 : 70)
          if (ev.critico || ev.duplo) window.setTimeout(() => P?.corte(para, '#ffffff', 80, 0.6), 70)
          P?.explosao(para, { cor, cor2: '#fff3c0', n: forte ? 40 : 24, forca: forte ? 360 : 260 })
          P?.onda(para, cor, forte ? 150 : 100)
          tocar(ev.critico || ev.duplo ? 'critico' : 'impacto')
          if (ev.critico || ev.duplo) { if (!reduzido) definirTremor((t) => t + 1) ; flutuar(refInimigo.current, `-${ev.valor}`, '#ffd34a', { grande: true, rotulo: ev.duplo ? 'GOLPE DUPLO' : 'CRÍTICO', x: 50, y: 36 }) }
          else flutuar(refInimigo.current, `-${ev.valor}`, '#ffd98a', { y: 30 })
          if (ev.absorvido > 0) flutuar(refInimigo.current, `armadura -${ev.absorvido}`, '#c9d4e6', { y: -40, x: -40 })
          definirMostrado((m) => ({ ...m, vidaInimigo: Math.max(0, m.vidaInimigo - ev.valor) }))
          if (!(await esperar(260, g))) return
          break
        }
        case 'combo': {
          pulsar('combo')
          if (ev.sequencia >= COMBO_MINIMO) tocar('combo')
          break
        }
        case 'dano-heroi': {
          pulsar('inimigo-ataca')
          if (!(await esperar(160, g))) return
          const de = centro(refInimigo.current), para = centro(refHeroi.current)
          tocar('golpe-inimigo')
          if (P) await P.projetil(de, para, { cor: '#ff5a3c', nucleo: '#ffd0c0', tam: 15, duracao: 0.36, curva: -0.3, rastro: 4 })
          if (g !== geracao.current) return
          pulsar('heroi-dano')
          P?.explosao(para, { cor: '#ff5a3c', cor2: '#ffb090', n: 30, forca: 300 })
          P?.corte(para, '#ff4a2a', 60, -0.9)
          if (!reduzido) definirTremor((t) => t + 1)
          definirVermelho((v) => v + 1)
          flutuar(refHeroi.current, `-${ev.valor}`, '#ff7a5c', { y: -54, grande: ev.valor >= 25, rotulo: ev.furia ? 'FÚRIA' : ev.veneno ? `VENENO +${ev.veneno}` : undefined })
          definirMostrado((m) => ({ ...m, vida: Math.max(0, m.vida - ev.valor) }))
          if (!(await esperar(220, g))) return
          break
        }
        case 'escudo': {
          pulsar('inimigo-ataca')
          if (!(await esperar(160, g))) return
          const de = centro(refInimigo.current), para = centro(refHeroi.current)
          tocar('golpe-inimigo')
          if (P) await P.projetil(de, para, { cor: '#ff5a3c', nucleo: '#ffd0c0', tam: 14, duracao: 0.34, curva: -0.3 })
          if (g !== geracao.current) return
          pulsar('escudo')
          P?.onda(para, '#7fb8ff', 90, 14)
          tocar('escudo')
          if (!(await esperar(140, g))) return
          P?.cacos(para)
          tocar('escudo-quebra')
          flutuar(refHeroi.current, 'Bloqueado', '#9cc6ff', { y: -54 })
          break
        }
        case 'imortal': {
          definirFaixa({ texto: 'Imortal!', sub: 'Você resiste com 1 de vida', tom: 'ouro' })
          P?.subir(centro(refHeroi.current), '#ffcf5a', 30)
          tocar('poder')
          definirMostrado((m) => ({ ...m, vida: 1 }))
          if (!(await esperar(900, g))) return
          definirFaixa(null)
          break
        }
        case 'cura': {
          P?.subir(centro(refHeroi.current), '#7fe08f')
          tocar('cura')
          flutuar(refHeroi.current, `+${ev.valor}`, '#7fe08f', { y: -30, x: 30, rotulo: ev.motivo === 'pocao' ? 'POÇÃO' : ev.motivo === 'lendaria' ? 'LENDÁRIA' : 'SEQUÊNCIA' })
          definirMostrado((m) => ({ ...m, vida: Math.min(depois.vidaMax, m.vida + ev.valor) }))
          if (!(await esperar(180, g))) return
          break
        }
        case 'pocao': {
          if (ev.perdida) flutuar(refSlots.current, 'A poção se perdeu', '#ffb090', { y: -30 })
          break
        }
        case 'fase-chefe': {
          tocar('fase')
          if (!reduzido) definirTremor((t) => t + 1)
          definirFaixa({ texto: ev.nome, sub: 'O chefe perde a armadura e bate mais forte', tom: 'vermelho' })
          if (!(await esperar(1100, g))) return
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
          if (!(await esperar(250, g))) return
          const caixa = refInimigo.current?.getBoundingClientRect()
          if (caixa) P?.dissolver(caixa, ['#ece6d8', '#e3b04b', '#fff3c0', '#9aa6b5'])
          definirMostrado((m) => ({ ...m, inimigoCaiu: true }))
          tocar(ev.chefe ? 'vitoria-chefe' : 'derrota-inimigo')
          if (ev.chefe) {
            P?.confete({ x: window.innerWidth / 2, y: window.innerHeight * 0.45 }, 140)
            definirFaixa({ texto: 'Chefe derrotado!', sub: `${inimigo.nome} caiu. A masmorra é sua.`, tom: 'chefe' })
            if (!(await esperar(2200, g))) return
          } else {
            P?.confete(centro(refInimigo.current), 50)
            definirFaixa({ texto: 'Vitória!', sub: `${inimigo.nome} derrotado`, tom: 'ouro' })
            if (!(await esperar(1300, g))) return
          }
          definirFaixa(null)
          break
        }
        case 'heroi-derrotado': {
          if (!(await esperar(300, g))) return
          const caixa = refHeroi.current?.getBoundingClientRect()
          if (caixa) P?.dissolver(caixa, ['#4f8fd6', '#9aa6b5', '#ece6d8'])
          definirMostrado((m) => ({ ...m, heroiCaiu: true }))
          tocar('derrota')
          definirFaixa({ texto: 'Você caiu', sub: 'Os flashcards que te derrubaram vão para a revisão', tom: 'vermelho' })
          if (!(await esperar(1600, g))) return
          definirFaixa(null)
          break
        }
        case 'pista': {
          definirEliminando(ev.posicao)
          tocar('pista')
          const alvo = refMao.current?.querySelectorAll('.fc-alternativa')[ev.posicao]
          if (alvo) P?.explosao(centro(alvo), { cor: '#e8d28a', cor2: '#ff9a3c', n: 22, forca: 160, gravidade: -120, formas: ['quadrado', 'brilho'] })
          if (!(await esperar(420, g))) return
          definirEliminando(null)
          break
        }
        case 'equipou': {
          tocar('poder')
          pulsar('slots')
          break
        }
        case 'novo-inimigo': {
          if (ev.trocaCenario) {
            definirTransicao(true)
            if (!(await esperar(380, g))) return
            definirCenarioVisivel(ev.inimigo.cenario)
            if (!(await esperar(80, g))) return
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
          break
        }
        case 'recompensas':
          break
      }
    }
    if (g === geracao.current) { definirAnimando(false); sincronizar(depois) }
  }, [esperar, flutuar, reduzido, sincronizar, inimigo.nome])

  /* ---------- Ações ---------- */

  const aplicar = useCallback((r: { estado: Partida; eventos: Evento[] }) => {
    // Ação recusada pelo motor: mesmo estado. Encerrar muda o estado sem animação e precisa passar.
    if (!r.eventos.length && r.estado === partidaRef.current) return
    // Progresso educacional: grava uma vez por resposta, no mesmo passo da regra.
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

  // Teclado: 1 a 4 respondem; Enter/espaço seguem; P usa a pista; Esc pula a animação.
  useEffect(() => {
    if (modo !== 'batalha') return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || ajustesAbertos || ampliada) return
      const alvo = e.target as HTMLElement
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName)) return
      const p = partidaRef.current
      if (apresentacao && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) { e.preventDefault(); definirApresentacao(null); return }
      if (e.key === 'Escape') { if (animando) pular(); return }
      if (/^[1-4]$/.test(e.key) && p.fase === 'pergunta') { e.preventDefault(); escolherAlternativa(+e.key - 1, true); return }
      if ((e.key === 'p' || e.key === 'P') && p.fase === 'pergunta') { usarPista(); return }
      if (e.key === 'Enter' || (e.key === ' ' && alvo?.tagName !== 'BUTTON' && alvo?.tagName !== 'A')) {
        if (p.fase === 'resposta') { e.preventDefault(); seguir() }
        else if (p.fase === 'pergunta' && selecionada !== null) { e.preventDefault(); responder(selecionada) }
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [modo, ajustesAbertos, ampliada, apresentacao, animando, pular, escolherAlternativa, usarPista, seguir, responder, selecionada])

  // Apresentação do adversário some sozinha.
  useEffect(() => {
    if (!apresentacao) return
    const t = window.setTimeout(() => definirApresentacao(null), reduzido ? 900 : 2300)
    return () => window.clearTimeout(t)
  }, [apresentacao, reduzido])

  /* ---------- Tela ---------- */

  const vidaPct = (100 * mostrado.vida) / partida.vidaMax
  const vidaInimigoPct = (100 * mostrado.vidaInimigo) / partida.inimigo.vidaMax
  const fase2 = partida.inimigo.fase === 2
  const ordem = partida.atual?.ordem ?? []
  const pistas = partida.encaixes.find((e) => e.tipo === 'pista')?.carga ?? 0
  const rodadasFuria = Math.max(0, inimigo.paciencia - partida.inimigo.rodadas)
  const botao = partida.fase === 'pergunta'
    ? { texto: 'Jogar', ativo: selecionada !== null && !apresentacao, acao: () => selecionada !== null && responder(selecionada), classe: selecionada !== null ? 'pronto' : '' }
    : partida.fase === 'resposta'
      ? { texto: 'Seguir', ativo: true, acao: seguir, classe: 'seguir' }
      : partida.fase === 'recompensa'
        ? { texto: 'Poder', ativo: false, acao: () => {}, classe: '' }
        : { texto: 'Fim', ativo: false, acao: () => {}, classe: '' }
  const mostrarRecompensas = partida.fase === 'recompensa' && !animando
  const mostrarFim = partida.fase === 'fim' && !animando

  const classes = ['fc-arena', `fc-arena--${cenarioVisivel}`, reduzido ? 'fc-arena--reduzida' : '', modo === 'estudo' ? 'fc-arena--estudo' : '', mostrado.vida <= 25 && modo === 'batalha' ? 'fc-arena--perigo' : ''].filter(Boolean).join(' ')

  return (
    <div className={classes} data-cenario={cenarioVisivel}>
      <Cenario cenario={modo === 'estudo' ? 'salao' : cenarioVisivel} reduzido={reduzido} />

      <div className="fc-barra-topo">
        <button type="button" className="fc-topo-botao" onClick={() => navegar('/treinar')} aria-label="Sair do Torneio">‹ Sair</button>
        <div className="fc-abas" role="tablist" aria-label="Modo">
          <button type="button" role="tab" aria-selected={modo === 'batalha'} onClick={() => definirModo('batalha')}>Batalha</button>
          <button type="button" role="tab" aria-selected={modo === 'estudo'} onClick={() => { pular(); definirModo('estudo') }}>Estudo</button>
        </div>
        <button type="button" className="fc-topo-botao" onClick={() => definirAjustesAbertos(true)} aria-label="Som e efeitos">{ajustes.som ? 'Som ligado' : 'Ajustes'}</button>
      </div>

      {modo === 'estudo' ? (
        <Estudo primeiro={estudoPrimeiro} aoAmpliar={definirAmpliada} />
      ) : (
        <>
          <section className={`fc-mesa${tremor ? ' fc-treme' : ''}`} key={'mesa-' + tremor} aria-label="Mesa da batalha">
            <TampoMesa cenario={cenarioVisivel} />
            <span className="fc-mesa__canto fc-mesa__canto--1" /><span className="fc-mesa__canto fc-mesa__canto--2" />
            <span className="fc-mesa__canto fc-mesa__canto--3" /><span className="fc-mesa__canto fc-mesa__canto--4" />
            <div className="fc-mesa__linha" aria-hidden="true"><i /></div>

            <div className={`fc-inimigo${inimigo.chefe ? ' fc-inimigo--chefe' : ''}${fase2 ? ' fc-inimigo--fase2' : ''}${partida.inimigo.furia ? ' fc-inimigo--furia' : ''}`}>
              <div ref={refInimigo} className={`fc-retrato fc-retrato--inimigo${mostrado.inimigoCaiu ? ' fc-retrato--caiu' : ''}`} key={'ri-' + (pulsos['inimigo-dano'] ?? 0) + '-' + (pulsos['inimigo-ataca'] ?? 0)} data-dano={pulsos['inimigo-dano'] ? 1 : 0}>
                <div className={`fc-retrato__arte${pulsos['inimigo-dano'] ? ' fc-anim-atingido' : ''}${pulsos['inimigo-ataca'] ? ' fc-anim-ataca' : ''}`}>
                  <Sprite nome={inimigo.sprite} className="fc-sprite--inimigo" />
                </div>
              </div>
              <div className="fc-placa">
                <div className="fc-placa__nome">
                  <strong>{inimigo.nome}</strong>
                  {inimigo.chefe && <em className="fc-selo fc-selo--chefe">Chefe</em>}
                  {fase2 && <em className="fc-selo fc-selo--fase">Fase 2</em>}
                </div>
                <div className="fc-vida fc-vida--inimigo" role="meter" aria-label={`Vida de ${inimigo.nome}`} aria-valuemin={0} aria-valuemax={partida.inimigo.vidaMax} aria-valuenow={mostrado.vidaInimigo}>
                  <s style={{ width: vidaInimigoPct + '%' }} /><i style={{ width: vidaInimigoPct + '%' }} /><b>{mostrado.vidaInimigo} / {partida.inimigo.vidaMax}</b>
                </div>
                <div className="fc-placa__info">
                  <span className="fc-info">Andar {partida.andar}</span>
                  {partida.inimigo.furia ? <span className="fc-info fc-info--furia">Fúria: dano ×1,5</span> : <span className="fc-info" title="Rodadas até a Fúria">Fúria em {rodadasFuria}</span>}
                  {partida.fase === 'pergunta' && <span className="fc-info fc-info--se-errar">{intencao.bloqueado ? 'Se errar: o escudo bloqueia' : `Se errar: -${intencao.dano}${intencao.veneno ? ` (veneno +${intencao.veneno})` : ''}`}</span>}
                  {motor.atributos(partida).armadura > 0 && <span className="fc-info fc-info--armadura">Armadura {motor.atributos(partida).armadura}</span>}
                </div>
              </div>
              {partida.fase === 'pergunta' && !intencao.bloqueado && intencao.dano > 0 && (
                <div className={`fc-intencao${intencao.furia ? ' fc-intencao--furia' : ''}`} title="Intenção do adversário: o dano que você leva se errar">
                  <b>-{intencao.dano}</b>
                  <small>se errar{intencao.veneno ? ` (+${intencao.veneno} veneno)` : ''}</small>
                </div>
              )}
              {partida.fase === 'pergunta' && intencao.bloqueado && (
                <div className="fc-intencao fc-intencao--bloqueado" title="O escudo bloqueia o próximo golpe"><Sprite nome="escudo" className="fc-sprite--icone" /><b>0</b><small>escudo pronto</small></div>
              )}
            </div>

            <div className="fc-pilha fc-pilha--baralho" aria-hidden="true"><span className="fc-costas" /><span className="fc-costas" /><span className="fc-costas" /><b>{partida.baralho.length}</b><small>Baralho</small></div>
            <div className="fc-pilha fc-pilha--descarte" aria-hidden="true">{partida.descarte.length > 0 && <><span className="fc-costas" /><span className="fc-costas" /></>}<b>{partida.descarte.length}</b><small>Descarte</small></div>
            <div className="fc-palco-carta" ref={refCarta}>
              {carta && partida.atual && (
                <Cartao
                  chave={partida.rodada + '-' + partida.atual.id}
                  carta={carta}
                  virada={mostrado.revelada && partida.fase !== 'pergunta'}
                  intencao={null}
                  dicaFrente="Responda com uma alternativa da sua mão"
                  aoAmpliar={definirAmpliada}
                  resultado={partida.fase !== 'pergunta' ? mostrado.resultado : null}
                  assistida={partida.atual.assistida}
                />
              )}
            </div>
          </section>

          <section className="fc-jogador" aria-label="Você">
            <div className="fc-dica" aria-live="polite">
              {partida.fase === 'pergunta' && (selecionada === null ? 'Toque numa alternativa para levantar. Toque de novo, ou em Jogar, para atacar.' : 'Toque de novo na alternativa ou em Jogar.')}
              {partida.fase === 'resposta' && !animando && (mostrado.resultado === 'certo' ? 'Acertou! Leia o verso e siga.' : 'Leia a resposta no verso e siga.')}
            </div>
            <div className="fc-heroi-barra">
              <div className="fc-heroi">
                <div ref={refHeroi} className={`fc-retrato fc-retrato--heroi${mostrado.heroiCaiu ? ' fc-retrato--caiu' : ''}`} key={'rh-' + (pulsos['heroi-dano'] ?? 0) + '-' + (pulsos['escudo'] ?? 0)}>
                  <div className={`fc-retrato__arte${pulsos['heroi-dano'] ? ' fc-anim-atingido' : ''}${pulsos['escudo'] ? ' fc-anim-bloqueio' : ''}`}><Sprite nome="heroi" /></div>
                  {partida.encaixes.some((e) => e.tipo === 'escudo') && <span className="fc-bolha-escudo" aria-hidden="true" />}
                </div>
                <div className="fc-heroi__vida">
                  <div className="fc-coracao"><Sprite nome="coracao" /><b>{mostrado.vida}</b></div>
                  <div className="fc-vida fc-vida--heroi" role="meter" aria-label="Sua vida" aria-valuemin={0} aria-valuemax={partida.vidaMax} aria-valuenow={mostrado.vida}>
                    <s style={{ width: vidaPct + '%' }} /><i style={{ width: vidaPct + '%' }} />
                  </div>
                  <div className={`fc-combo${partida.sequencia >= COMBO_MINIMO ? ' fc-combo--ativo' : ''}`} key={'c-' + (pulsos['combo'] ?? 0)} aria-label={`Sequência de ${partida.sequencia} acertos`}>
                    {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < Math.min(5, partida.sequencia) ? 'aceso' : ''} />)}
                    <span>{partida.sequencia >= COMBO_MINIMO ? `Combo ×${partida.sequencia}` : `Sequência ${partida.sequencia}`}</span>
                  </div>
                </div>
              </div>
              <div className="fc-encaixes" ref={refSlots} key={'s-' + (pulsos['slots'] ?? 0)} aria-label="Poderes equipados">
                {Array.from({ length: ENCAIXES }, (_, i) => {
                  const e = partida.encaixes[i]
                  if (!e) return <span key={i} className="fc-encaixe fc-encaixe--vazio" aria-label="Encaixe vazio" />
                  const d = RECOMPENSAS[e.tipo]
                  const usavel = e.tipo === 'pista' && partida.fase === 'pergunta' && !partida.atual?.respondida && ordem.length - (partida.atual?.eliminadas.length ?? 0) > 2
                  return (
                    <button key={i} type="button" className={`fc-encaixe${usavel ? ' fc-encaixe--usavel' : ''}`} style={{ ['--cor' as string]: d.cor }} disabled={!usavel} onClick={usarPista}
                      title={`${d.nome}: ${d.texto}${e.tipo === 'pocao' ? ` (faltam ${partida.pocao})` : ''}${usavel ? ' Toque para usar (tecla P).' : ''}`} aria-label={`${d.nome}${e.carga > 1 ? `, ${e.carga} cargas` : ''}${usavel ? ', toque para usar' : ''}`}>
                      <Sprite nome={d.icone} className="fc-sprite--icone" />
                      {e.carga > 1 && <b>{e.carga}</b>}
                      {e.tipo === 'pocao' && <b>{partida.pocao}</b>}
                    </button>
                  )
                })}
                {partida.reliquias.length > 0 && (
                  <div className="fc-reliquias" aria-label="Relíquias">
                    {partida.reliquias.map((r) => <span key={r} className="fc-reliquia" title={`${RECOMPENSAS[r].nome}: ${RECOMPENSAS[r].texto}`} style={{ ['--cor' as string]: RECOMPENSAS[r].cor }}><Sprite nome={RECOMPENSAS[r].icone} className="fc-sprite--icone" /></span>)}
                  </div>
                )}
              </div>
              <div className="fc-baralho" aria-label={`${partida.baralho.length} flashcards no baralho`}><span className="fc-costas" /><b>{partida.baralho.length}</b></div>
              <button type="button" className={`fc-redondo ${botao.classe}`} disabled={!botao.ativo} onClick={botao.acao}>{botao.texto}</button>
            </div>

            <div className={`fc-mao${partida.fase !== 'pergunta' ? ' fc-mao--respondida' : ''}`} ref={refMao} role="group" aria-label="Sua mão: alternativas">
              {carta && ordem.map((opcao, pos) => {
                const eliminada = partida.atual!.eliminadas.includes(pos)
                const m = mostrado.marcadas
                const estado = m ? (pos === m.certa ? 'certa' : pos === m.escolha ? 'errada' : 'apagada') : ''
                return (
                  <div key={partida.rodada + '-' + pos} className={`fc-slot-mao${selecionada === pos ? ' fc-slot-mao--sel' : ''}`} style={{ ['--i' as string]: pos, ['--n' as string]: ordem.length }}>
                    <button
                      type="button"
                      className={`fc-alternativa${eliminada ? ' fc-alternativa--eliminada' : ''}${eliminando === pos ? ' fc-alternativa--queimando' : ''}${estado ? ' fc-alternativa--' + estado : ''}`}
                      disabled={partida.fase !== 'pergunta' || eliminada || !!apresentacao}
                      onClick={() => escolherAlternativa(pos, false)}
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
            {pistas > 0 && partida.fase === 'pergunta' && <p className="fc-dica fc-dica--pista">Pista ×{pistas}: toque no pergaminho para eliminar uma errada (tecla P).</p>}
          </section>
        </>
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
            <div className="fc-apresenta__retrato"><Sprite nome={apresentacao.inimigo.sprite} /></div>
            <strong>{apresentacao.inimigo.nome}</strong>
            <em>{apresentacao.inimigo.lema}</em>
            <p>{apresentacao.inimigo.habilidade}</p>
            <p className="fc-apresenta__numeros">Vida {inimigoDoAndar(apresentacao.andar).inimigo.vida} · Força ×{inimigoDoAndar(apresentacao.andar).inimigo.forca}</p>
            <small>Toque para começar</small>
          </div>
        </div>
      )}

      {mostrarRecompensas && modo === 'batalha' && (
        <Recompensas partida={partida} aoEscolher={escolherRecompensa} aoEncerrar={encerrar} />
      )}

      {mostrarFim && modo === 'batalha' && (
        <Fim partida={partida} aoNova={novaPartida} aoRevisar={revisarNoEstudo} aoSair={() => navegar('/treinar')} />
      )}

      {ampliada && (
        <div className="fc-veu" role="dialog" aria-modal="true" aria-label="Imagem ampliada" onClick={() => definirAmpliada(null)}>
          <figure className="fc-ampliada" onClick={(e) => e.stopPropagation()}>
            <img src={ampliada.src} alt="Figura da questão de origem, ampliada" />
            <figcaption>{ampliada.legenda}</figcaption>
            <button type="button" className="fc-botao" onClick={() => definirAmpliada(null)} autoFocus>Fechar</button>
          </figure>
        </div>
      )}

      {ajustesAbertos && (
        <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-ajustes-titulo" onClick={() => definirAjustesAbertos(false)}>
          <div className="fc-janela" onClick={(e) => e.stopPropagation()}>
            <h2 id="fc-ajustes-titulo">Som e efeitos</h2>
            <label className="fc-ajuste">
              <input id="fc-som" type="checkbox" checked={ajustes.som} onChange={(e) => { definirAjustes({ som: e.target.checked }); if (e.target.checked) { configurarSom(true, ajustes.volume); tocar('poder') } }} />
              <span>Som ligado</span>
            </label>
            <label className="fc-ajuste fc-ajuste--volume">
              <span>Volume</span>
              <input id="fc-volume" type="range" min={0} max={1} step={0.05} value={ajustes.volume} disabled={!ajustes.som} onChange={(e) => definirAjustes({ volume: +e.target.value })} />
            </label>
            <label className="fc-ajuste">
              <input id="fc-efeitos" type="checkbox" checked={ajustes.efeitos === 'reduzidos'} onChange={(e) => definirAjustes({ efeitos: e.target.checked ? 'reduzidos' : 'completos' })} />
              <span>Reduzir efeitos (sem tremor, partículas e giro)</span>
            </label>
            <p className="fc-janela__nota">Teclado: 1 a 4 respondem, Enter segue, P usa a pista, Esc pula a animação.</p>
            <div className="fc-janela__botoes">
              <button type="button" className="fc-botao fc-botao--secundario" onClick={() => { definirAjustesAbertos(false); novaPartida() }}>Recomeçar partida</button>
              <button type="button" className="fc-botao" onClick={() => definirAjustesAbertos(false)} autoFocus>Pronto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Recompensas({ partida, aoEscolher, aoEncerrar }: { partida: Partida; aoEscolher: (r: Recompensa) => void; aoEncerrar: () => void }) {
  const chefe = partida.venceu && partida.chefesDerrotados > 0 && inimigoDoAndar(partida.andar).inimigo.chefe
  const proximo = inimigoDoAndar(partida.andar + 1)
  const cheios = partida.encaixes.length >= ENCAIXES
  return (
    <div className="fc-veu fc-veu--recompensa" role="dialog" aria-modal="true" aria-labelledby="fc-rec-titulo">
      <div className={`fc-janela fc-janela--larga${chefe ? ' fc-janela--chefe' : ''}`}>
        <h2 id="fc-rec-titulo">{chefe ? 'Tesouro do chefe' : 'Escolha um poder'}</h2>
        <p className="fc-janela__sub">
          Próximo: andar {partida.andar + 1}, {proximo.inimigo.nome}{proximo.ciclo ? ` (ciclo ${proximo.ciclo + 1}, mais forte)` : ''}.
        </p>
        <div className="fc-recompensas">
          {partida.recompensas.map((r, i) => {
            const d = RECOMPENSAS[r]
            const repetido = ehPoder(r) && partida.encaixes.some((e) => e.tipo === r)
            const substitui = ehPoder(r) && !repetido && cheios ? RECOMPENSAS[partida.encaixes[0].tipo].nome : null
            return (
              <button key={r} type="button" className={`fc-recompensa fc-recompensa--${d.tipo}`} style={{ ['--cor' as string]: d.cor, ['--i' as string]: i }} onClick={() => aoEscolher(r)} autoFocus={i === 0}>
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
          <div><dt>Acertos</dt><dd>{partida.acertos} de {total}</dd></div>
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
                  <a href={href(`/questao/${c.questao}`)} target="_blank" rel="noopener" className="fc-botao-pequeno">Fazer a questão</a>
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
