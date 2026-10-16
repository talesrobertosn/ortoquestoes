import { numeroPixel } from '../efeitos/numerosPixel'
import { indicesVisuais } from '../motor/hipnose'
import { vfxPorAndar, VFX_BIBLIOTECA } from '../efeitos/vfxPorAndar'
import { usarReducaoSistema } from './AparenciaFlashcards'
import { ControleVolume, Volume } from './Volume'
import { carregarFaixas } from '../dados/faixas'
import { INVESTIDA, atacar, estiloDe, projetilDoEstilo, soprar, tomFogo, type Impacto } from '../efeitos/ataques'
import { TABULEIRO } from '../efeitos/ambiente'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gravar, ler } from '../../estado/armazenamento'
import { href, navegar } from '../../util/rotas'
import { BARALHO_DEMO } from '../dados/baralhoDemo'
import { carregarAcervo } from '../dados/acervo'
import { agendarEnvioJogo, autorizarFlashcardCripta, FLASHCARDS_NO_SERVIDOR, novaChave, iniciarCorrida, instalarContinuidade, RANKING_NO_SERVIDOR, registrarAndar, sincronizarJogo, sincronizarProgresso, vincularFlashcard, type LimiteCripta } from '../servidor'
import { CHAVE_DO_MODO, EVENTO_PARTIDA_REMOTA, estavel, idDaPartida, idDoAparelho, limparPatamar, novoIdPartida, protegerModo, salvarPartidaLocal, salvarPatamar, tomarPendente, tomarVinda } from '../continuidade'
import { montarBaralho } from '../motor/selecao'
import type { Flashcard } from '../tipos'
import { Palco, centro, pixelVfx, precarregarVfx } from '../efeitos/palco'
import { ambienteBiblioteca } from '../biblioteca/sessao'
import type { Humor } from './ClimaEstudo'
import { PALETA_PERSONAGEM, type Personagem, type Pose } from '../efeitos/personagens'
import { configurarClimaBiblioteca, configurarSom, ESCALA_VOLUME, VOLUME_INICIAL, volumeDaSessao, destravar, instalarDestrave, tocar, tocarAmbiente, tocarMusica } from '../efeitos/sons'
import { sementeNova } from '../motor/aleatorio'
import { ESTAGIOS, LIMITES, TORRE, inimigoDoAndar, type Inimigo, type Modo } from '../motor/bestiario'
import { ENCAIXES, PATRONOS, RECOMPENSAS, ehPoder, type Recompensa, type TipoPoder } from '../motor/poderes'
import { registrarEstudo } from '../aprendizagem'
import { aplicarRotaDoCronograma } from '../rotaCronograma'
import { memoriaRotaInicial, rotaNaTela, type MemoriaRota } from '../rotaNaTela'
import { sairDoJogo } from '../fundo'
import { contarSessaoTerminada } from '../opiniao'
import { COMBO_MINIMO, criarMotor, desgaste, migrarPartida, NIVEIS, nivelDaPartida, QUEIMADURA, VENENO, type Evento, type MotivoCura, type NivelJogo, type Partida } from '../motor/regras'
import { ALTAR_VAZIO, ganharCristais, type EstadoAltar } from '../motor/altar'
import {
  BESTIARIO_VAZIO, CHAVE_AJUSTES, CHAVE_ALTAR, CHAVE_BESTIARIO, CHAVE_HISTORICO, CHAVE_PATAMAR, CHAVE_RECORDES, CHAVE_REGISTROS,
  CHAVE_SOM_ESCOLHIDO, RECORDES_VAZIOS, somPreferido, type Bestiario, type Recordes, type RegistroFlashcard, type SomEscolhido,
} from '../progresso'
import { AjudaDoPreceptor, Loja, Portas, Sabio, SalaEvento, TituloChefe } from './Salas'
import { Cartao, familiasDe } from './Cartao'
import { ComChaves } from './Chaves'
import { Cenario, TampoMesa, carregarPintura } from './Cenario'
import { precarregarCenario } from '../efeitos/cenariosPintados'
import { climaDoAndar } from '../efeitos/ambiente'
import { paisagemDaParada } from '../efeitos/paisagens'
import { Ator, BarraVida, Encaixe, precarregarAtor, Reliquia, ReliquiasCompactas } from './Hud'
import { Visualizador } from './Visualizador'
import { recurso } from '../../config'
import { ModalJogo } from './ModalJogo'
import { Sprite } from './Sprite'
import '../../estilos/paginas/FlashcardsCripta.css'

export interface Ajustes {
  versao: 3
  semTremor?: boolean
  altoContraste?: boolean
  textoMaior?: boolean
  som: boolean
  volume: number
  /** Escala do volume (2 = depois do compressor, curva do ouvido; 15/10/2026). */
  escalaVolume?: number
  volEfeitos: number
  volAmbiente: number
  volMusica: number
  efeitos: 'completos' | 'reduzidos'
  velocidade: 'normal' | 'rapida'
}
/** Som ligado por padrão (pedido do Tales em 12/10/2026); toca a partir do primeiro toque. */
const AJUSTES_PADRAO: Ajustes = { versao: 3, som: true, volume: VOLUME_INICIAL, escalaVolume: ESCALA_VOLUME, volEfeitos: 0.7, volAmbiente: 0.35, volMusica: 0.45, efeitos: 'completos', velocidade: 'normal' }

const ROTULO_CURA: Record<MotivoCura, string> = {
  sequencia: 'SEQUÊNCIA', lendaria: 'LENDÁRIA', pocao: 'POÇÃO', selo: 'SELO', roubo: 'ROUBO DE ENERGIA', vital: 'POÇÃO VITAL',
  insignia: 'INSÍGNIA', chefe: 'CHEFE VENCIDO', ritual: 'RITUAL', descanso: 'FOGUEIRA', coracao: 'CORAÇÃO', evolucao: 'EVOLUÇÃO',
  seiva: 'CALO VIVO', colheita: 'REMODELAÇÃO', florescer: 'CONSOLIDAÇÃO', cauterio: 'CAUTÉRIO', sabio: 'PRECEPTOR', ajuda: 'PRECEPTOR', renascer: 'FÊNIX', loja: 'POÇÃO', sala: 'DESCANSO',
}

/** Onde cada modo guarda a partida em andamento. */
/** Sprites desenhados menores que o Golem: ganham escala maior na arena e na apresentação. */
const PEQUENOS = new Set<string>(['serpente', 'raptor', 'gosma', 'cogumelo', 'mimico', 'corvo', 'morcego', 'goblin', 'esqueleto', 'escaravelho', 'aranha', 'cavaleiro', 'espectro', 'harpia', 'mao'])
const lerAltar = () => ({ ...ALTAR_VAZIO, ...ler<Partial<EstadoAltar>>(CHAVE_ALTAR, {}) }) as EstadoAltar
/** Nome do jogo e dos modos (usado no topo e na Entrada). */
export const NOME_MODO: Record<Modo, string> = { masmorra: 'Cripta do Residente', torre: 'Torre do Título' }

/** Recorde do andar no formato do ranking: Cripta (andar mais fundo) e Torre (andar mais alto), separados. */
function recordeDoAndar(rec: Recordes, p: Partida): Partial<Recordes> {
  if (!NIVEIS[nivelDaPartida(p)].ranqueado) return {}
  return p.modo === 'torre' ? { torreMaximo: Math.max(rec.torreMaximo ?? 0, p.andar) } : { andarMaximo: Math.max(rec.andarMaximo, p.andar) }
}

/** Uma regra de combate para todas as partidas novas. Níveis antigos só são lidos por compatibilidade. */
export function nivelEscolhido(): NivelJogo {
  return 'normal'
}

/** Tamanho de cada reposição do baralho (a seleção roda de novo quando acaba). */
const LOTE_DO_BARALHO = 40

/**
 * A Biblioteca (modo Estudo) e o clima dela vêm num pedaço à parte (fluidez, 15/10/2026):
 * quem abre a Cripta não baixa nem interpreta o Estudo antes da primeira carta. O pedaço é
 * buscado quando o navegador folga, então a troca de aba continua instantânea.
 */
const carregarEstudo = () => import('./Estudo')
const carregarClima = () => import('./ClimaEstudo')
const Estudo = lazy(() => carregarEstudo().then((m) => ({ default: m.Estudo })))
const ClimaEstudo = lazy(() => carregarClima().then((m) => ({ default: m.ClimaEstudo })))

let motor = criarMotor(BARALHO_DEMO)

/** Motor com o acervo carregado e a seleção procedural ponderada (motor/selecao.ts). */
function prepararMotor(cartas: Flashcard[], faixas: Map<string, 1 | 2 | 3> | null) {
  const medidas = cartas.map(c => ({ ...c, dificuldade: faixas?.get(c.questao) ?? c.dificuldade }))
  motor = criarMotor(medidas, {
    repor: (excluir, semente, nivel, rodada, aceita) => montarBaralho(cartas, {
      registros: ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {}),
      recentes: ler<string[]>(CHAVE_HISTORICO, []),
      agora: Date.now(),
      nivel, inicio: rodada, faixas, questoes: ler('respondidas', {}), aceita,
    }, semente, LOTE_DO_BARALHO, excluir),
  })
}

function partidaSalva(modo: Modo): Partida | null {
  const p = migrarPartida(ler<unknown>(CHAVE_DO_MODO[modo], null))
  if (!p || p.fase === 'fim' || p.modo !== modo) return null
  try {
    if (p.atual) motor.carta(p.atual.id)
    p.derrubaram.forEach((id) => motor.carta(id))
    // partidas salvas antes da continuidade ganham o id derivado agora (fica fixo daqui em diante)
    return { ...p, idPartida: idDaPartida(p) }
  } catch { return null }
}

/**
 * Partida nova com a corrida aberta no servidor. A corrida é a "vida" da conta grátis
 * (uma por 24 h, parte 19 do SQL) e vale para o ranking quando ele estiver ligado.
 */
function comCorrida(q: Partida): Partida {
  // toda partida nova ganha a sua identidade (continuidade entre aparelhos)
  const p: Partida = { ...q, idPartida: novoIdPartida() }
  if (!FLASHCARDS_NO_SERVIDOR) return p
  const idCorrida = novaChave()
  // o Fácil não conta para o ranking (só abre a corrida da vida grátis)
  if (NIVEIS[nivelDaPartida(p)].ranqueado && RANKING_NO_SERVIDOR) void iniciarCorrida(idCorrida, p.modo, nivelDaPartida(p) === 'dificil' ? 'dificil' : 'normal')
  return { ...p, idCorrida }
}

/** Torre: depois de cair, a subida recomeça do último patamar salvo. */
function patamarSalvo(): Partida | null {
  const p = migrarPartida(ler<unknown>(CHAVE_PATAMAR, null))
  if (!p || p.modo !== 'torre') return null
  try { if (p.atual) motor.carta(p.atual.id); return { ...p, semente: sementeNova(), idPartida: novoIdPartida() } } catch { return null }
}

/** deitado: celular na horizontal (tela baixa e mais larga que alta), com layout próprio em três colunas. */
type FaixaTela = 'celular' | 'deitado' | 'baixa' | 'larga'
function usarFaixa(): FaixaTela {
  // mesmo corte do CSS "Celular deitado": (orientation: landscape) and (max-height: 520px) and (min-width: 480px)
  const calcular = (): FaixaTela => {
    const w = window.innerWidth, h = window.innerHeight
    if (h <= 520 && w > h && w >= 480) return 'deitado'
    return w <= 640 ? 'celular' : h <= 820 ? 'baixa' : 'larga'
  }
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

/**
 * Entrada do Torneio: carrega o acervo publicado pela fábrica e só então monta
 * o jogo. Se a rede falhar, joga com o baralho de demonstração.
 */
export function Arena({ modo = 'masmorra', abrirEstudo = false }: { modo?: Modo; abrirEstudo?: boolean }) {
  const [pronto, definirPronto] = useState(false)
  const [vinda, definirVinda] = useState<number | undefined>()
  useEffect(() => {
    let vivo = true
    // enquanto o acervo chega, o primeiro andar já vai baixando (herói e Golem de Gesso; a floresta vem pelo Cenario abaixo).
    // Na Biblioteca não: ninguém luta antes de trocar de aba, e o celular baixava ~370 kB de batalha à toa (auditoria 16/10).
    if (!abrirEstudo) {
      precarregarAtor('heroi', 'heroi-1')
      precarregarAtor('golem')
    }
    // A sincronia do progresso (duas chamadas ao servidor) não segura a entrada por mais de 2,5 s:
    // ela continua em segundo plano e as próximas reposições do baralho já usam o resultado.
    const sincronia = Promise.race([sincronizarProgresso(), new Promise((ok) => window.setTimeout(ok, 2500))])
    // Continuidade (15/10/2026): a partida da conta chega ANTES de a partida ser montada; vale a mais
    // recente entre este aparelho e o servidor. Rede lenta: até 4 s, depois segue com a do aparelho
    // (se a da conta chegar depois e for mais nova, a arena a adota quando puder).
    const jogo = FLASHCARDS_NO_SERVIDOR
      ? Promise.race([sincronizarJogo().catch(() => null), new Promise<null>((ok) => window.setTimeout(() => ok(null), 4000))])
      : Promise.resolve(null)
    // a pintura em código (mesa e cenas sem arte pintada) vem num pedaço à parte, em paralelo com o acervo
    const pintura = carregarPintura().catch(() => null)
    void Promise.all([carregarAcervo(), sincronia, carregarFaixas(), jogo, pintura]).then(([cartas, , faixas, r]) => {
      if (!vivo) return
      prepararMotor(cartas, faixas)
      // tomada uma vez (no modo estrito do React o efeito roda duas vezes)
      definirVinda(r ? tomarVinda(modo) : undefined)
      definirPronto(true)
    })
    return () => { vivo = false }
  }, [])
  if (!pronto) {
    return (
      <ModalJogo titulo={abrirEstudo ? 'Biblioteca de Flashcards' : NOME_MODO[modo]} aoPedirFechar={sairDoJogo}>
        <div className="fc-arena fc-carregando" role="status">
          <Cenario cena={abrirEstudo ? 'biblioteca' : 'campo'} reduzido />
          <div className="fc-carregando__caixa">
            <span className="fc-carregando__baralho" aria-hidden="true"><i /><i /><i /></span>
            <strong>{abrirEstudo ? 'Abrindo a Biblioteca' : modo === 'torre' ? 'Subindo a escadaria' : 'Descendo à Cripta'}</strong>
            <small>Milhares de flashcards das provas reais e dos simulados</small>
          </div>
        </div>
      </ModalJogo>
    )
  }
  return <ArenaJogo modo={modo} abrirEstudo={abrirEstudo} vinda={vinda} />
}

/** Mudanças que vão para a conta na hora (as outras esperam até 5 s). */
function mudancaImportante(a: Partida, b: Partida): boolean {
  if (a.andar !== b.andar || b.fase === 'fim' || a.ouro > b.ouro || a.reliquias.length !== b.reliquias.length) return true
  const respondendo = (a.fase === 'pergunta' && b.fase === 'resposta') || (a.fase === 'resposta' && b.fase === 'pergunta')
  if (a.fase !== b.fase && !respondendo) return true
  return estavel(a.encaixes) !== estavel(b.encaixes) || estavel(a.sala) !== estavel(b.sala)
}

const AVISO_OUTRO_APARELHO = (andar: number) => `Continuando a partida do seu outro aparelho (andar ${andar})`

function ArenaJogo({ modo: modoJogo, abrirEstudo, vinda }: { modo: Modo; abrirEstudo: boolean; vinda?: number }) {
  const [ajustes, definirAjustesBruto] = useState<Ajustes>(() => {
    const salvos = ler<Partial<Ajustes>>(CHAVE_AJUSTES, {})
    const reduzSistema = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    // Ajustes da versão 1 (som desligado por padrão) não valem mais; a 2 ganha o volume da música.
    const versao = salvos.versao as number | undefined
    const validos = versao === 3 ? salvos : versao === 2 ? { ...salvos, versao: 3 as const } : {}
    // sem ajuste salvo nesta conta, vale a escolha da primeira entrada feita neste aparelho
    const som = somPreferido(ler<SomEscolhido>(CHAVE_SOM_ESCOLHIDO, false))
    return { ...AJUSTES_PADRAO, efeitos: reduzSistema ? 'reduzidos' : 'completos', ...(som === undefined ? {} : { som }), ...validos, volume: volumeDaSessao(), escalaVolume: ESCALA_VOLUME }
  })
  const ajustesRef = useRef(ajustes)
  const definirAjustes = (a: Partial<Ajustes>) => { const n = { ...ajustesRef.current, ...a }; ajustesRef.current = n; gravar(CHAVE_AJUSTES, n); definirAjustesBruto(n) }
  const sistemaReduzido = usarReducaoSistema()
  const reduzido = sistemaReduzido || ajustes.efeitos === 'reduzidos'
  const semTremor = reduzido || !!ajustes.semTremor
  const faixaTela = usarFaixa()

  const [modo, definirModo] = useState<'batalha' | 'estudo'>(abrirEstudo ? 'estudo' : 'batalha')
  // aplicarRotaDoCronograma: "Seguir o cronograma" na Entrada (rotaCronograma.ts); sem rota guardada, nada muda
  const [partida, definirPartida] = useState<Partida>(() => {
    // a partida deste modo fica protegida: a sincronização não a troca por baixo (a arena adota quando puder)
    protegerModo(modoJogo)
    return aplicarRotaDoCronograma(partidaSalva(modoJogo) ?? (modoJogo === 'torre' ? patamarSalvo() : null) ?? comCorrida(motor.novaPartida(sementeNova(), { modo: modoJogo, talentos: lerAltar().talentos, nivel: nivelEscolhido() }).estado))
  })
  const partidaRef = useRef(partida)
  /** A partida como chegou (do aparelho ou da conta): salvá-la de novo não muda o carimbo. */
  const intocadaRef = useRef<Partida | null>(partida)
  const anteriorRef = useRef(partida)
  /** Carimbo da última gravação: uma partida remota só é adotada se for mais nova. */
  const carimboRef = useRef(partida.atualizadoEm ?? 0)
  const [aviso, definirAviso] = useState<string | null>(() => (vinda !== undefined && partida.aparelho && partida.aparelho !== idDoAparelho() ? AVISO_OUTRO_APARELHO(partida.andar) : null))
  const [remotaPendente, definirRemotaPendente] = useState(0)
  const [mostrado, definirMostrado] = useState<Mostrado>(() => ({
    vida: partida.vida, vidaInimigo: partida.inimigo.vida, revelada: partida.fase !== 'pergunta', resultado: null, marcadas: null, inimigoCaiu: false, heroiCaiu: false,
  }))
  const mostradoRef = useRef(mostrado)
  mostradoRef.current = mostrado
  const [animando, definirAnimando] = useState(false)
  const [selecionada, definirSelecionada] = useState<number | null>(null)
  const [faixa, definirFaixa] = useState<Faixa>(null)
  const [apresentacao, definirApresentacao] = useState<{ inimigo: Inimigo; ciclo: number; andar: number } | null>(null)
  const refFlutuantes = useRef<HTMLDivElement>(null)
  const [ampliada, definirAmpliada] = useState<{ src: string; legenda: string } | null>(null)
  const [ajustesAbertos, definirAjustesAbertos] = useState(false)
  const refAbrirAjustes = useRef<HTMLButtonElement>(null)
  const [painel, definirPainel] = useState<'heroi' | 'inimigo' | null>(null)
  const [bloqueio, definirBloqueio] = useState<LimiteCripta | null>(null)
  const [lamina, definirLamina] = useState(0)
  const [ajuda, definirAjuda] = useState<number | null>(null)
  const [tituloChefe, definirTituloChefe] = useState<Inimigo | null>(null)
  const [cristaisAltar, definirCristaisAltar] = useState(() => lerAltar().cristais)
  const validando = useRef(false)
  const chaves = useRef(new Map<number, string>())
  const [confirmarSaida, definirConfirmarSaida] = useState(false)
  const [confirmarRecomeco, definirConfirmarRecomeco] = useState(false)
  const [transicao, definirTransicao] = useState(false)
  const [vermelho, definirVermelho] = useState(0)
  const [eliminando, definirEliminando] = useState<number | null>(null)
  const [atacando, definirAtacando] = useState(false)
  const [cenarioVisivel, definirCenarioVisivel] = useState(() => inimigoDoAndar(partida.andar, partida.sementeBase, partida.modo).inimigo.cenario)
  const [estudoPrimeiro, definirEstudoPrimeiro] = useState<string[]>([])
  const [humorEstudo, definirHumorEstudo] = useState<Humor | null>(null)
  const [leituraTranquila, definirLeituraTranquila] = useState(false)

  const canvasPalco = useRef<HTMLCanvasElement>(null)
  const palco = useRef<Palco | null>(null)
  const refInimigo = useRef<HTMLDivElement>(null)
  const refHeroi = useRef<HTMLDivElement>(null)
  const refCarta = useRef<HTMLDivElement>(null)
  const refMao = useRef<HTMLDivElement>(null)
  const refSlots = useRef<HTMLDivElement>(null)
  const refMesa = useRef<HTMLElement>(null)
  // O herói e o botão principal NÃO deslizam mais (15/10/2026): um alvo de toque que se
  // move faz o dedo errar. No celular deitado, o deslize medido errado ainda jogava o botão
  // para fora da tela (y 439 numa tela de 390) a cada flashcard novo. Agora eles ficam
  // parados no rodapé em todos os formatos (FlashcardsCripta.css) e só o flashcard desliza.
  const refBlocoHeroi = useRef<HTMLDivElement>(null)
  const refBlocoAcao = useRef<HTMLDivElement>(null)
  const geracao = useRef(0)
  const inicioAnimacao = useRef(0)
  const idFlutuante = useRef(0)

  /* ---------- Som ---------- */
  useEffect(() => { configurarSom({ ligado: ajustes.som, efeitos: ajustes.volEfeitos, ambiente: ajustes.volAmbiente, musica: ajustes.volMusica, volume: ajustes.volume }) }, [ajustes.som, ajustes.volEfeitos, ajustes.volAmbiente, ajustes.volMusica, ajustes.volume])
  useEffect(() => {
    // destrave por gesto e pausa por visibilidade, instalados uma vez para o jogo todo (sons.ts)
    instalarDestrave()
  }, [])
  useEffect(() => { tocarAmbiente(modo === 'estudo' ? ambienteBiblioteca(leituraTranquila, humorEstudo?.tipo) : cenarioVisivel) }, [modo, cenarioVisivel, leituraTranquila, humorEstudo?.tipo])
  useEffect(() => { configurarClimaBiblioteca(modo === 'estudo' ? humorEstudo?.tipo ?? 'calmo' : null, modo === 'estudo' && leituraTranquila); return () => configurarClimaBiblioteca(null) }, [modo, humorEstudo?.tipo, leituraTranquila])
  const adversarioEmCena = inimigoDoAndar(partida.andar, partida.sementeBase, partida.modo).inimigo
  useEffect(() => { precarregarVfx(modo === 'estudo' ? VFX_BIBLIOTECA : vfxPorAndar(adversarioEmCena.sprite, adversarioEmCena.variante)) }, [modo, adversarioEmCena.sprite, adversarioEmCena.variante])
  // a Biblioteca chega antes de a pessoa trocar de aba (sem atrasar a primeira carta)
  useEffect(() => {
    const ocioso = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const buscar = () => { void carregarEstudo(); void carregarClima() }
    const t = window.setTimeout(() => (ocioso ? ocioso(buscar, { timeout: 5000 }) : buscar()), 3500)
    return () => window.clearTimeout(t)
  }, [])
  // Pré-carregamento do caminho: o adversário e a cena deste andar já, os do próximo andar quando o navegador folgar.
  // Na Biblioteca, só quando a pessoa passa para a Batalha.
  useEffect(() => {
    if (modo !== 'batalha') return
    precarregarAtor(adversarioEmCena.sprite as Personagem, adversarioEmCena.variante)
    precarregarAtor('heroi', partida.estagio > 1 ? `heroi-${partida.estagio}` : undefined)
    const proximo = inimigoDoAndar(partida.andar + 1, partida.sementeBase, partida.modo).inimigo
    const depois = () => {
      precarregarAtor(proximo.sprite as Personagem, proximo.variante)
      precarregarCenario(proximo.cenario)
      // o próximo estágio do herói aparece depois do chefe
      if (proximo.chefe || adversarioEmCena.chefe) precarregarAtor('heroi', `heroi-${Math.min(6, partida.estagio + 1)}`)
    }
    const ocioso = (window as unknown as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const t = window.setTimeout(() => (ocioso ? ocioso(depois, { timeout: 4000 }) : depois()), 2500)
    return () => window.clearTimeout(t)
  }, [modo, partida.andar, partida.sementeBase, partida.modo, partida.estagio, adversarioEmCena.sprite, adversarioEmCena.variante, adversarioEmCena.chefe])
  const chefeEmCena = modo === 'batalha' && adversarioEmCena.chefe
  const trilha = modo === 'estudo' ? 'biblioteca'
    : partida.fase === 'loja' ? 'loja' : partida.fase === 'sabio' || partida.fase === 'sala' ? 'sabio'
    : chefeEmCena ? (adversarioEmCena.sprite === 'dragao' ? 'dragao' : 'chefe')
    : modo === 'batalha' && adversarioEmCena.nivel === 'elite' ? 'elite' : cenarioVisivel
  useEffect(() => { tocarMusica(trilha) }, [trilha])
  useEffect(() => () => { tocarAmbiente(null); tocarMusica(null) }, [])

  useEffect(() => {
    partidaRef.current = partida
    // Continuidade: cada mudança sai com carimbo e vai para a conta (importante na hora; o resto em até 5 s)
    const intocada = partida === intocadaRef.current
    const em = intocada ? partida.atualizadoEm ?? 0 : Date.now()
    salvarPartidaLocal(partida, em)
    carimboRef.current = em
    if (!intocada) agendarEnvioJogo(mudancaImportante(anteriorRef.current, partida))
    anteriorRef.current = partida
  }, [partida])
  // Salva ao esconder a aba e ao fechar; ao voltar, confere o outro aparelho. Ao sair do jogo, envia o que faltar.
  useEffect(() => {
    protegerModo(modoJogo)
    const desinstalar = instalarContinuidade()
    const aoChegar = (e: Event) => { if ((e as CustomEvent<{ modo: Modo }>).detail?.modo === modoJogo) definirRemotaPendente((n) => n + 1) }
    window.addEventListener(EVENTO_PARTIDA_REMOTA, aoChegar)
    definirRemotaPendente((n) => n + 1)
    return () => { window.removeEventListener(EVENTO_PARTIDA_REMOTA, aoChegar); protegerModo(null); desinstalar() }
  }, [modoJogo])
  /**
   * Partida mais nova vinda de outro aparelho com o jogo aberto (a sincronia chegou depois da
   * entrada, ou a pessoa voltou à aba depois de jogar no outro aparelho). Só troca fora de
   * animação e de validação, e nunca por cima da tela de fim.
   */
  useEffect(() => {
    if (!remotaPendente || animando || validando.current || modo !== 'batalha') return
    const v = tomarPendente(modoJogo)
    const atual = partidaRef.current
    if (!v || v.em <= carimboRef.current || atual.fase === 'fim') return
    let estado: Partida | null = null
    if (v.partida) {
      try {
        if (v.partida.atual) motor.carta(v.partida.atual.id)
        estado = { ...v.partida, idPartida: v.id, atualizadoEm: v.em, aparelho: v.aparelho }
      } catch { estado = null }
      if (!estado) return
    } else {
      // lápide de outra partida não mexe nesta; desta mesma, a partida acabou no outro aparelho
      if (v.id !== idDaPartida(atual)) return
      estado = comCorrida(motor.novaPartida(sementeNova(), { modo: modoJogo, talentos: lerAltar().talentos, nivel: nivelEscolhido() }).estado)
    }
    geracao.current++
    palco.current?.limpar()
    intocadaRef.current = v.partida ? estado : null
    partidaRef.current = estado
    definirPartida(estado)
    definirSelecionada(null)
    definirFaixa(null)
    definirMostrado({ vida: estado.vida, vidaInimigo: estado.inimigo.vida, revelada: estado.fase !== 'pergunta', resultado: null, marcadas: null, inimigoCaiu: false, heroiCaiu: false })
    const { inimigo: i } = inimigoDoAndar(estado.andar, estado.sementeBase, estado.modo)
    definirCenarioVisivel(i.cenario)
    definirCristaisAltar(lerAltar().cristais)
    definirAviso(v.partida ? AVISO_OUTRO_APARELHO(estado.andar) : 'A partida anterior foi encerrada no seu outro aparelho')
  }, [remotaPendente, animando, modo, modoJogo])
  useEffect(() => {
    if (!aviso) return
    const t = window.setTimeout(() => definirAviso(null), 6500)
    return () => window.clearTimeout(t)
  }, [aviso])

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
    const { inimigo, ciclo } = inimigoDoAndar(partida.andar, partida.sementeBase, partida.modo)
    if (partida.fase === 'pergunta' && partida.rodada === 0) definirApresentacao({ inimigo, ciclo, andar: partida.andar })
    lembrarBestiario(inimigo.id, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const carta = partida.atual ? motor.carta(partida.atual.id) : null
  // Contador da rota (Mapa do especialista, Desvio de área, assunto de hoje): quantos ainda faltam
  const memoriaRota = useRef<MemoriaRota>(memoriaRotaInicial(partida.rota, partida.atual?.id))
  const rotaVisivel = useMemo(() => {
    const r = rotaNaTela(memoriaRota.current, partida.rota, partida.atual?.id, (id) => { try { return motor.carta(id) } catch { return undefined } })
    if (!r) return null
    const nome = motor.areasDaRota().find((a) => a.area === r.area)?.nome ?? r.area
    return { ...r, nome }
  }, [partida.rota, partida.atual?.id])
  // família da carta da mesa: imagem, anatomia, revisão (errou da última vez) e duelo de chefe
  const familiasCarta = useMemo(() => {
    if (!carta) return []
    const errou = ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {})[carta.id]?.c === false
    return familiasDe(carta, [...(errou ? ['revisao' as const] : []), ...(motor.inimigoAtual(partida).chefe ? ['chefe' as const] : [])])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carta?.id, partida.andar])
  const inimigo = motor.inimigoAtual(partida)
  const intencao = motor.intencao(partida)
  const atributos = motor.atributos(partida)

  const ampliarImagem = useCallback((i: { src: string; legenda: string }) => { tocar('selecao'); definirAmpliada(i) }, [])
  const somDoGiro = useCallback(() => tocar('giro'), [])

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
    // direto no DOM: um número de dano não pode redesenhar a arena inteira (era o que travava o golpe)
    const camada = refFlutuantes.current
    if (!camada) return
    const no = document.createElement('span')
    no.className = 'fc-flutua' + (extra?.grande ? ' fc-flutua--grande' : '')
    no.style.left = xx + 'px'; no.style.top = Math.max(40, y + (extra?.y ?? 0)) + 'px'; no.style.color = tom
    no.dataset.id = String(id)
    const pixels = numeroPixel(texto)
    if (pixels) { no.classList.add('fc-flutua--numero'); no.appendChild(pixels) }
    else no.textContent = texto
    if (extra?.rotulo) { const r = document.createElement('small'); r.textContent = extra.rotulo; no.appendChild(r) }
    camada.appendChild(no)
    window.setTimeout(() => no.remove(), extra?.grande ? 1500 : 1150)
  }, [])

  const tremer = useCallback((forca: number) => {
    const b = refMesa.current?.closest<HTMLElement>('.fc-batalha')
    if (semTremor || !b) return
    // a força vai no próprio elemento que treme (antes ficava na mesa e nunca chegava à animação)
    b.style.setProperty('--tremor', String(Math.min(1.6, forca)))
    if (forca >= 1.2) animar(b, 'fc-terremoto', 720)
    else animar(b, 'fc-treme', 420)
  }, [semTremor])

  /**
   * Investida do crítico: o adversário cresce, salta até o meio da tela e bate
   * no chão (o terremoto vem no momento da batida). Resolve na batida.
   */
  const investir = useCallback(async (g: number, tipo: 'pisao' | 'bote' | 'salto') => {
    const el = refInimigo.current, alvo = refHeroi.current
    if (!el || !alvo || reduzido) return true
    const a = el.getBoundingClientRect(), h = alvo.getBoundingClientRect()
    const meioX = (h.left + h.width / 2 + window.innerWidth / 2) / 2
    const ix = meioX - (a.left + a.width / 2)
    const iy = Math.min(80, (h.top + h.height) - (a.top + a.height)) * 0.6
    el.style.setProperty('--ix', `${ix}px`)
    el.style.setProperty('--iy', `${iy}px`)
    el.style.setProperty('--ie', String(Math.min(2, Math.max(1.4, 260 / Math.max(80, a.height)))))
    animar(el, `fc-investida--${tipo}`, 820 * fator)
    return esperar(tipo === 'bote' ? 300 : 440, g)
  }, [reduzido, fator, esperar])

  const sincronizar = useCallback((p: Partida) => {
    definirMostrado((m) => ({ ...m, vida: p.vida, vidaInimigo: p.inimigo.vida, revelada: p.fase !== 'pergunta', heroiCaiu: p.vida <= 0, inimigoCaiu: p.inimigo.vida <= 0 && p.fase !== 'pergunta' }))
  }, [])

  // Só no desenvolvimento: os testes de tela leem o estado para escolher a alternativa certa ou errada.
  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __torneio: unknown }).__torneio = { partida, animando, certa: partida.atual ? partida.atual.ordem.indexOf(motor.carta(partida.atual.id).certa) : -1, certaVisual: partida.atual ? indicesVisuais(partida.atual).indexOf(partida.atual.ordem.indexOf(motor.carta(partida.atual.id).certa)) : -1, definir: (p: Partida) => { partidaRef.current = p; definirPartida(p); sincronizar(p) }, cena: definirCenarioVisivel,
    // capturas reproduzíveis: leva a partida a um andar e semente, com o adversário do jeito que o motor o prepara
    quem: (andar: number, semente: number) => inimigoDoAndar(andar, semente, partidaRef.current.modo).inimigo.id,
    ir: (andar: number, semente: number) => {
      const p = partidaRef.current, { inimigo: i } = inimigoDoAndar(andar, semente, p.modo)
      const q = { ...p, andar, sementeBase: semente, inimigo: { ...p.inimigo, id: i.id, vida: i.vida, vidaMax: i.vida, barreira: i.barreira ?? 0, fase: 1 as const, rodadas: 0, errosSeguidos: 0, furia: false, hipnoseUsada: false, hipnosePendente: false } }
      partidaRef.current = q; definirPartida(q); sincronizar(q); definirCenarioVisivel(i.cenario)
    } } })

  const pular = useCallback(() => {
    geracao.current++
    palco.current?.limpar()
    definirAnimando(false)
    definirFaixa(null)
    definirTransicao(false)
    definirEliminando(null)
    definirAtacando(false)
    definirCenarioVisivel(inimigoDoAndar(partidaRef.current.andar, partidaRef.current.sementeBase, partidaRef.current.modo).inimigo.cenario)
    sincronizar(partidaRef.current)
  }, [sincronizar])

  // pré-carrega a figura do próximo flashcard do baralho, para ela já estar pronta
  // pré-carrega (e decodifica) as figuras dos dois próximos flashcards do baralho, para elas já estarem prontas
  const proximosIds = partida.baralho.slice(0, 2).join('|')
  useEffect(() => {
    for (const id of proximosIds ? proximosIds.split('|') : []) {
      let prox: Flashcard | null = null
      try { prox = motor.carta(id) } catch { prox = null }
      if (!prox?.imagem) continue
      const im = new Image(); im.decoding = 'async'; im.src = recurso('imagens/' + prox.imagem.arquivo)
      void im.decode?.().catch(() => undefined)
    }
  }, [proximosIds])

  const arte = (r: React.RefObject<HTMLDivElement | null>) => r.current?.querySelector('.fc-ator__corpo')
  /** Troca a pose do sprite (preparo, golpe, dano, vitória) por um tempo e volta a respirar. */
  const posar = useCallback((r: React.RefObject<HTMLDivElement | null>, pose: Pose, ms: number) => {
    const el = r.current
    if (!el) return
    el.dataset.pose = pose
    window.clearTimeout(Number(el.dataset.poseTempo))
    el.dataset.poseTempo = String(window.setTimeout(() => { delete el.dataset.pose }, ms * fator))
  }, [fator])

  /** Bestiário: quem você já encontrou e quem já venceu (para a Entrada). */
  const lembrarBestiario = useCallback((id: string, vencido: boolean) => {
    const b = { ...BESTIARIO_VAZIO, ...ler<Partial<Bestiario>>(CHAVE_BESTIARIO, {}) }
    const lista = vencido ? b.vencidos : b.vistos
    if (lista.includes(id)) return
    gravar(CHAVE_BESTIARIO, { ...b, vistos: b.vistos.includes(id) ? b.vistos : [...b.vistos, id], vencidos: vencido ? [...b.vencidos, id] : b.vencidos })
    agendarEnvioJogo()
  }, [])
  /** Cristais de conhecimento vão direto para o Altar (não se perdem se a partida cair). */
  const ganharNoAltar = useCallback((valor: number) => {
    const a = ganharCristais(lerAltar(), valor)
    gravar(CHAVE_ALTAR, a)
    definirCristaisAltar(a.cristais)
    agendarEnvioJogo()
  }, [])

  const encenarBruto = useCallback(async (eventos: Evento[], depois: Partida) => {
    const g = ++geracao.current
    const P = palco.current
    inicioAnimacao.current = Date.now()
    definirAnimando(true)
    const combo = depois.sequencia
    const adv = inimigoDoAndar(depois.andar, depois.sementeBase, depois.modo).inimigo
    const quemInimigo = adv.sprite as Personagem
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
          posar(refHeroi, 'preparo', 380)
          tocar('carga')
          P?.carga(topoCarta, cor, forte ? 34 : 22, forte ? 120 : 90)
          if (!(await esperar(320, g))) return
          // 4-6: disparo com rastro; a luz passa pela mesa
          const para = centro(refInimigo.current)
          posar(refHeroi, 'golpe', 520)
          tocar('disparo', forte ? 1.2 : 1)
          window.setTimeout(() => { if (g === geracao.current) definirMostrado((m) => ({ ...m, revelada: true })) }, 240 * fator)
          // a lâmina de energia em pixel art (a cor conta a história: azul, ouro no combo, fogo no 5+, arcano no golpe duplo)
          const tom = ev.duplo ? 'arcano' : ev.critico ? 'ouro' : combo >= 5 ? 'fogo' : combo >= COMBO_MINIMO || depois.estagio >= 4 ? 'ouro' : 'azul'
          const px = pixelVfx()
          // o som da espada gigante toca mesmo com "Reduzir movimento" (só a animação fica de fora)
          if (ev.critico || ev.duplo) tocar('espada-gigante')
          if (P && (ev.critico || ev.duplo) && !reduzido) {
            // crítico: a espada gigante atravessa a tela na diagonal e rasga o ar
            animar(refMesa.current?.closest('.fc-batalha'), 'fc-pausa-impacto', 140)
            if (!reduzido) definirLamina((n) => n + 1)
            await P.espadaGigante(para, Math.atan2(Math.min(260, window.innerHeight * 0.3), Math.min(600, window.innerWidth * 0.5)))
          } else if (P) await P.voar(`lamina-${tom}`, topoCarta, para, { duracao: forte ? 0.32 : 0.28, curva: 0.18, escala: px * (forte ? 1.5 : 1.2), brilho: cor, rastro: cor })
          P?.efeito(`corte-${tom}`, para, { escala: px * (forte ? 1.5 : 1.1), espelhar: combo % 2 === 0 })
          P?.efeito(`faisca-${tom}`, para, { escala: px * (forte ? 1.5 : 1.1), atraso: 0.04 })
          if (ev.critico || ev.duplo) P?.efeito(`corte-${tom}`, para, { escala: px * 1.7, angulo: 1.2, atraso: 0.08, brilho: cor })
          definirAtacando(false)
          if (g !== geracao.current) return
          // 7-13: impacto
          animar(arte(refInimigo), forte ? 'fc-anim-atingido-forte' : 'fc-anim-atingido', 640)
          posar(refInimigo, 'dano', 560)
          P?.clarao(para, cor, forte ? 320 : medio ? 230 : 170, forte ? 0.8 : 0.55)
          P?.fragmentos(para, PALETA_PERSONAGEM[quemInimigo], forte ? 22 : medio ? 14 : 8, forte ? 420 : 300)
          P?.explosao(para, { cor, cor2: '#fff3c0', n: forte ? 18 : 10, forca: forte ? 340 : 240, formas: ['quadrado', 'brilho'] })
          // raios extras do Mestre do Raio: caem do alto sobre o adversário
          if (ev.raio > 0) window.setTimeout(() => { if (g !== geracao.current) return; P?.raio({ x: para.x + 30, y: Math.max(0, para.y - 260) }, para, '#9fe0ff', 3, 2); tocar('raio'); flutuar(refInimigo.current, `+${ev.raio}`, '#bfe8ff', { y: -40, x: -70, rotulo: 'RAIO' }) }, 140 * fator)
          if (ev.critico || ev.duplo) {
            // linhas de velocidade convergindo no alvo (a tela já escureceu e a espada passou)
            P?.linhas(para, cor)
          }
          tocar(ev.critico || ev.duplo ? 'critico' : forte ? 'impacto-forte' : medio ? 'impacto-medio' : 'impacto-leve', 1, quemInimigo)
          tremer(forte ? 1 : medio ? 0.55 : 0.3)
          if (ev.critico || ev.duplo) flutuar(refInimigo.current, `-${ev.valor}`, '#ffd34a', { grande: true, rotulo: ev.duplo ? 'GOLPE DUPLO' : ev.sorte ? 'CRÍTICO DE SORTE' : 'CRÍTICO', x: 70, y: -10 })
          else flutuar(refInimigo.current, `-${ev.valor}`, '#ffe6a8', { y: -20, x: 50 })
          if (ev.absorvido > 0) flutuar(refInimigo.current, `armadura −${ev.absorvido}`, '#cfe2ff', { y: -70, x: -20 })
          if (ev.barreira > 0) { flutuar(refInimigo.current, `barreira −${ev.barreira}`, '#9fe0ff', { y: -100, x: 10 }); P?.onda(para, '#7fd8ff', 130, 10) }
          if (ev.eco > 0) window.setTimeout(() => { if (g !== geracao.current) return; P?.corte(para, '#7fd8ff', 80); tocar('impacto-leve', 1, quemInimigo); flutuar(refInimigo.current, `+${ev.eco}`, '#9fe8ff', { y: 10, x: 90, rotulo: 'ECO' }) }, 220 * fator)
          if (ev.especial) flutuar(refInimigo.current, 'MARCA DO MESTRE', '#ffe08a', { y: -130 })
          animar(arte(refInimigo), 'fc-anim-clarao', 160)
          definirMostrado((m) => ({ ...m, vidaInimigo: Math.max(0, m.vidaInimigo - (ev.valor - ev.barreira)) }))
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
          tocar('preparo-inimigo', 1, quemInimigo)
          P?.carga(centro(refInimigo.current), '#ff5a3c', 18, 80)
          if (!(await esperar(400, g))) return
          animar(arte(refInimigo), 'fc-anim-ataca', 440)
          posar(refInimigo, 'golpe', 620)
          const de = centro(refInimigo.current), para = centro(refHeroi.current)
          let impacto: Impacto = { cor: '#ff5a3c', cor2: '#ffb090', material: [], garras: true }
          const estilo = estiloDe(adv.sprite, adv.variante)
          // a boca do dragão fica no alto, à esquerda da figura (ele olha para o herói)
          const caixaInimigo = refInimigo.current?.getBoundingClientRect()
          const boca = caixaInimigo ? { x: caixaInimigo.left + caixaInimigo.width * 0.2, y: caixaInimigo.top + caixaInimigo.height * 0.32 } : undefined
          if (ev.carregado) {
            definirFaixa({ texto: ev.carregado, sub: 'Golpe carregado', tom: 'vermelho' })
            tocar(estilo === 'fogo' ? 'sopro' : 'carregado')
            if (estilo === 'fogo' && P) {
              // o Sopro do dragão: chamas em pixel art atravessam a arena
              await soprar(P, boca ?? { x: de.x - 40, y: de.y - 10 }, para, tomFogo(adv.variante), 0.75)
              tremer(1)
            } else {
              if (INVESTIDA[estilo] && !(await investir(g, INVESTIDA[estilo]!))) return
              if (P) impacto = await atacar(P, estilo, de, para, ev.rajada, { critico: true, variante: adv.variante, tremer })
            }
            if (!(await esperar(200, g))) return
            definirFaixa(null)
          } else {
            tocar('golpe-inimigo', 1, quemInimigo)
            // crítico: o adversário vem até o meio da tela (investida) e solta o superpoder do arquétipo
            if (ev.critico && INVESTIDA[estilo]) {
              if (!(await investir(g, INVESTIDA[estilo]!))) return
              tremer(INVESTIDA[estilo] === 'pisao' ? 1.4 : 1)
            }
            // cada arquétipo ataca do seu jeito (efeitos/ataques.ts)
            if (P) impacto = await atacar(P, estilo, de, para, ev.rajada, { critico: ev.critico, variante: adv.variante, tremer, boca })
          }
          if (g !== geracao.current) return
          animar(arte(refHeroi), 'fc-anim-atingido', 640)
          posar(refHeroi, 'dano', 560)
          P?.clarao(para, impacto.cor, 200, 0.6)
          P?.explosao(para, { cor: impacto.cor, cor2: impacto.cor2, n: 10, forca: 260, formas: ['quadrado', 'brilho'] })
          P?.fragmentos(para, ['#9fb0c8', '#f4f8ff', '#3f78c8'], 6, 240)
          tocar(ev.critico ? 'critico' : 'dano', 1, quemInimigo)
          if (ev.veneno) tocar('veneno')
          if (!ev.critico) tremer(ev.valor >= 25 ? 1 : 0.6)
          definirVermelho((v) => v + (ev.critico ? 2 : 1))
          flutuar(refHeroi.current, `-${ev.valor}`, '#ff8a6a', { y: -70, grande: ev.critico || !!ev.carregado || ev.valor >= 25, rotulo: ev.carregado ? 'SOPRO' : ev.critico ? 'CRÍTICO' : ev.rajada > 1 ? `${ev.rajada} MORDIDAS` : ev.furia ? 'FÚRIA' : ev.veneno ? `VENENO +${ev.veneno}` : undefined })
          definirMostrado((m) => ({ ...m, vida: Math.max(0, m.vida - ev.valor) }))
          if (!(await esperar(260, g))) return
          break
        }
        case 'escudo': {
          animar(arte(refInimigo), 'fc-anim-ataca', 440)
          posar(refInimigo, 'golpe', 600)
          if (!(await esperar(180, g))) return
          const de = centro(refInimigo.current), para = centro(refHeroi.current)
          tocar('golpe-inimigo', 1, quemInimigo)
          // o golpe próprio do adversário vem e bate na bolha do escudo (pixel art)
          const proj = projetilDoEstilo(estiloDe(adv.sprite, adv.variante), adv.variante)
          if (P && proj) await P.voar(proj, de, para, { duracao: 0.32, curva: -0.25, escala: pixelVfx() * 1.2 })
          else if (P) { P.linhas(para, '#fff1c2', 12); await new Promise((r) => window.setTimeout(r, 140)) }
          if (g !== geracao.current) return
          P?.efeito('escudo', para, { escala: pixelVfx() * 1.4, brilho: '#7fb8ff' })
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
          P?.subir(centro(refHeroi.current), '#7fe08f', 20, 70)
          { const h = centro(refHeroi.current); for (let k = 0; k < Math.min(4, 1 + Math.floor(ev.valor / 6)); k++) P?.efeito('coracao', { x: h.x + (k - 1.5) * 20 + (Math.random() - 0.5) * 8, y: h.y }, { escala: pixelVfx(), vy: -80 - k * 10, atraso: k * 0.08, vida: 0.95, laco: true, some: 0.35 }) }
          P?.clarao(centro(refHeroi.current), '#5fdc7a', 200, 0.7, 0.6)
          animar(refHeroi.current, 'fc-anim-cura', 900)
          tocar('cura')
          flutuar(refHeroi.current, `+${ev.valor}`, '#8ff0a0', { y: -50, x: 60, rotulo: ROTULO_CURA[ev.motivo] })
          definirMostrado((m) => ({ ...m, vida: Math.min(depois.vidaMax, m.vida + ev.valor) }))
          if (!(await esperar(200, g))) return
          break
        }
        case 'mitigado': {
          const nome = ev.motivo === 'barreira' ? 'Barreira' : ev.motivo === 'foco' ? 'Foco' : 'Preceptor'
          P?.onda(centro(refHeroi.current), '#9fd0ff', 100, 12)
          tocar('escudo')
          flutuar(refHeroi.current, `${nome} −${ev.valor}`, '#bfe0ff', { y: -110, x: 30 })
          if (!(await esperar(160, g))) return
          break
        }
        case 'regenera': {
          P?.subir(centro(refInimigo.current), '#9fe8a0', 16, 60)
          flutuar(refInimigo.current, `+${ev.valor}`, '#9fe8a0', { y: -40, x: -40, rotulo: 'REGENERA' })
          definirMostrado((m) => ({ ...m, vidaInimigo: Math.min(depois.inimigo.vidaMax, m.vidaInimigo + ev.valor) }))
          break
        }
        case 'evolucao': {
          tocar('evolucao')
          P?.subir(centro(refHeroi.current), '#ffe08a', 46, 90)
          P?.clarao(centro(refHeroi.current), '#ffcf5a', 420, 1, 0.9)
          P?.onda(centro(refHeroi.current), '#ffe08a', 180, 14)
          animar(refHeroi.current, 'fc-anim-cura', 900)
          definirFaixa({ texto: 'Evolução!', sub: `Agora você é ${ev.nome}: mais vida, ataque e defesa`, tom: 'ouro' })
          if (!(await esperar(1500, g))) return
          definirFaixa(null)
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
          if (caixa) { P?.dissolver(caixa, PALETA_PERSONAGEM[quemInimigo]); P?.fragmentos(centro(refInimigo.current), PALETA_PERSONAGEM[quemInimigo], 30, 520) }
          // o "puf" de vitória em pixel art, maior no chefe, com estrelas
          P?.efeito('puf', centro(refInimigo.current), { escala: pixelVfx() * (ev.chefe ? 2.4 : 1.7) })
          P?.efeito('faisca-ouro', centro(refInimigo.current), { escala: pixelVfx() * (ev.chefe ? 2 : 1.4), atraso: 0.06 })
          P?.clarao(centro(refInimigo.current), '#ffe08a', 500, 1, 0.8)
          definirMostrado((m) => ({ ...m, inimigoCaiu: true }))
          posar(refHeroi, 'vitoria', 1800)
          tocar(ev.chefe ? 'vitoria-chefe' : 'derrota-inimigo', 1, quemInimigo)
          window.setTimeout(() => tocar(ev.chefe ? 'jingle-chefe' : 'jingle-vitoria'), 500 * fator)
          lembrarBestiario(adv.id, true)
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
          tocar('jingle-tesouro')
          break
        }
        case 'heroi-derrotado': {
          if (!(await esperar(300, g))) return
          const caixa = refHeroi.current?.getBoundingClientRect()
          if (caixa) P?.dissolver(caixa, PALETA_PERSONAGEM.heroi)
          posar(refInimigo, 'vitoria', 4000)
          definirMostrado((m) => ({ ...m, heroiCaiu: true }))
          tocar('derrota')
          window.setTimeout(() => tocar('jingle-derrota'), 700 * fator)
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
          lembrarBestiario(ev.inimigo.id, false)
          if (ev.inimigo.chefe && !reduzido) {
            definirTituloChefe(ev.inimigo)
            tocar('fase')
            if (!(await esperar(1700, g))) { definirTituloChefe(null); return }
            definirTituloChefe(null)
          }
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
        case 'ouro': {
          if (ev.motivo === 'inimigo' || ev.motivo === 'porta' || ev.motivo === 'brilhante') { P?.moedas(centro(refInimigo.current), ev.motivo === 'brilhante' ? 6 : 16); tocar('moedas') }
          flutuar(ev.motivo === 'inimigo' || ev.motivo === 'brilhante' ? refInimigo.current : refHeroi.current, `+${ev.valor}`, '#ffd24a', { y: -10, x: -60, rotulo: 'MOEDAS' })
          break
        }
        case 'cristais': {
          ganharNoAltar(ev.valor)
          break
        }
        case 'envenenado': {
          // a picada deixa o herói Envenenado: nuvem tóxica, aviso e o selo com a conta dos acertos
          const h = centro(refHeroi.current)
          P?.efeito('nuvem-veneno', { x: h.x, y: h.y - 10 }, { escala: pixelVfx() })
          tocar('veneno')
          flutuar(refHeroi.current, ev.dano > 2 ? `VENENO ×${ev.dano}` : 'ENVENENADO', '#a8f070', { y: -110, x: 30, rotulo: `Acerte ${ev.faltam} seguidos` })
          if (!(await esperar(260, g))) return
          break
        }
        case 'veneno': {
          if (ev.valor > 0) {
            const h = centro(refHeroi.current)
            for (let k = 0; k < 3; k++) P?.efeito('bolhas', { x: h.x + (k - 1) * 22, y: h.y - 10 }, { escala: pixelVfx(), atraso: k * 0.08, vida: 0.9, laco: true, some: 0.3 })
            animar(arte(refHeroi), 'fc-anim-veneno', 600)
            tocar('veneno')
            flutuar(refHeroi.current, `-${ev.valor}`, '#a8f070', { y: -40, x: -50, rotulo: ev.faltam > 0 ? `VENENO · faltam ${ev.faltam}` : 'VENENO' })
            definirMostrado((m) => ({ ...m, vida: Math.max(1, m.vida - ev.valor) }))
            if (!(await esperar(200, g))) return
          }
          break
        }
        case 'chamuscado': {
          const h = centro(refHeroi.current)
          for (let k = 0; k < 4; k++) P?.efeito('labareda-escarlate', { x: h.x + (k - 1.5) * 16, y: h.y + 10 }, { escala: pixelVfx(), vy: -60, atraso: k * 0.06 })
          tocar('queimadura')
          flutuar(refHeroi.current, 'EM CHAMAS', '#ffb062', { y: -110, x: 30, rotulo: `${ev.faltam} flashcards · acerto difícil apaga` })
          if (!(await esperar(240, g))) return
          break
        }
        case 'arde': {
          if (ev.valor > 0) {
            const h = centro(refHeroi.current)
            for (let k = 0; k < 3; k++) P?.efeito('labareda-escarlate', { x: h.x + (k - 1) * 18, y: h.y + 6 }, { escala: pixelVfx() * 0.9, vy: -50, atraso: k * 0.07 })
            animar(arte(refHeroi), 'fc-anim-queima', 600)
            tocar('queimadura')
            flutuar(refHeroi.current, `-${ev.valor}`, '#ffb062', { y: -40, x: -50, rotulo: ev.faltam > 0 ? `QUEIMANDO · faltam ${ev.faltam}` : 'QUEIMANDO' })
            definirMostrado((m) => ({ ...m, vida: Math.max(1, m.vida - ev.valor) }))
            if (!(await esperar(200, g))) return
          }
          break
        }
        case 'apagou': {
          const h = centro(refHeroi.current)
          P?.efeito('puf', { x: h.x, y: h.y - 10 }, { escala: pixelVfx() })
          tocar(ev.motivo === 'dificil' ? 'escudo' : 'cura')
          flutuar(refHeroi.current, 'FOGO APAGADO', '#cfe8ff', { y: -110, rotulo: ev.motivo === 'dificil' ? 'acerto difícil' : 'o fogo passou' })
          if (!(await esperar(220, g))) return
          break
        }
        case 'veneno-curado': {
          const h = centro(refHeroi.current)
          P?.subir(h, '#b8ff8a', 26, 70)
          for (let k = 0; k < 4; k++) P?.efeito('coracao', { x: h.x + (k - 1.5) * 26, y: h.y }, { escala: pixelVfx(), vy: -90 - k * 12, atraso: k * 0.07, vida: 1, laco: true, some: 0.4 })
          tocar('cura')
          flutuar(refHeroi.current, 'VENENO CURADO', '#c8ffa0', { y: -110, rotulo: '5 acertos seguidos' })
          if (!(await esperar(260, g))) return
          break
        }
        case 'queimadura': {
          P?.subir(centro(refInimigo.current), '#ff7a2a', 14, 70)
          tocar('queimadura')
          flutuar(refInimigo.current, `-${ev.valor}`, '#ffa060', { y: 20, x: 60, rotulo: `BRASA ×${ev.brasas}` })
          definirMostrado((m) => ({ ...m, vidaInimigo: Math.max(0, m.vidaInimigo - ev.valor) }))
          if (!(await esperar(220, g))) return
          break
        }
        case 'contra': {
          const de = centro(refHeroi.current), para = centro(refInimigo.current)
          if (P) await P.projetil(de, para, { cor: '#ffd76a', nucleo: '#fff6d0', tam: 10, duracao: 0.28, rastro: 2 })
          if (g !== geracao.current) return
          P?.corte(para, '#ffd76a', 70); tocar('impacto-leve', 1, quemInimigo)
          flutuar(refInimigo.current, `-${ev.valor}`, '#ffe08a', { y: -50, x: 40, rotulo: ev.motivo === 'reflexo' ? 'REFLEXO' : 'CONTRA-ATAQUE' })
          definirMostrado((m) => ({ ...m, vidaInimigo: Math.max(0, m.vidaInimigo - ev.valor) }))
          break
        }
        case 'divide': {
          tocar('divide')
          P?.onda(centro(refInimigo.current), '#cfe2ff', 150, 14)
          animar(arte(refInimigo), 'fc-anim-divide', 700)
          definirFaixa({ texto: 'Ele se dividiu!', sub: `Barreira de ${ev.barreira}: seus acertos batem nela primeiro`, tom: 'azul' })
          if (!(await esperar(900, g))) return
          definirFaixa(null)
          break
        }
        case 'grudou': {
          const h = centro(refHeroi.current)
          for (let k = 0; k < 3; k++) P?.efeito('respingo-gosma', { x: h.x + (k - 1) * 20, y: h.y + 14 }, { escala: pixelVfx(), atraso: k * 0.06 })
          tocar('divide')
          flutuar(refHeroi.current, 'GRUDADO', '#9ff0b8', { y: -110, x: 30, rotulo: 'o próximo erro dói +50%' })
          if (!(await esperar(200, g))) return
          break
        }
        case 'desgrudou': {
          flutuar(refHeroi.current, 'DESGRUDOU', '#d8ffe8', { y: -100, x: -30 })
          break
        }
        case 'tremor': {
          tocar('roubo')
          if (refSlots.current) { const c = centro(refSlots.current); P?.efeito('rachadura', c, { escala: pixelVfx() * 0.8 }); P?.efeito('poeira', c, { escala: pixelVfx() }) }
          flutuar(refSlots.current, `${RECOMPENSAS[ev.poder].nome} −1`, '#e8d8b0', { y: -30, rotulo: 'TREMOR' })
          break
        }
        case 'hipnose': {
          definirFaixa({ texto: 'Olhar petrificante', sub: 'As alternativas do próximo flashcard mudam de lugar.', tom: 'azul' })
          if (!(await esperar(1100, g))) return
          definirFaixa(null)
          break
        }
        case 'roubou': {
          tocar('roubo')
          if (inimigo.sprite === 'mimico' && P && !reduzido) {
            const slots = refSlots.current?.querySelectorAll('.fc-encaixe')
            const origem = slots?.[partida.encaixes.findIndex(e => e.tipo === ev.poder)] ?? refSlots.current
            void P.voar('orbe', centro(origem), centro(refInimigo.current), { duracao: .65, curva: -.6, escala: pixelVfx()*.7 })
          }
          if (refSlots.current) P?.explosao(centro(refSlots.current), { cor: '#c8a0ff', n: 14, forca: 200 })
          flutuar(refSlots.current, `${RECOMPENSAS[ev.poder].nome} −1`, '#d8c0ff', { y: -30, rotulo: 'ROUBADO' })
          break
        }
        case 'ajuda': {
          definirAjuda(ev.cura)
          tocar('ajuda')
          P?.subir(centro(refHeroi.current), '#bfe8ff', 30, 80)
          P?.clarao(centro(refHeroi.current), '#9fd8ff', 300, 1, 0.8)
          animar(refHeroi.current, 'fc-anim-cura', 900)
          flutuar(refHeroi.current, `+${ev.cura}`, '#bfe8ff', { y: -50, x: 60, rotulo: 'PRECEPTOR' })
          definirMostrado((m) => ({ ...m, vida: Math.min(depois.vidaMax, m.vida + ev.cura) }))
          if (!(await esperar(1700, g))) return
          definirAjuda(null)
          break
        }
        case 'renascer': {
          tocar('renascer')
          P?.subir(centro(refHeroi.current), '#ffa05a', 50, 90); P?.clarao(centro(refHeroi.current), '#ffb070', 420, 1, 1)
          definirFaixa({ texto: 'Fênix!', sub: `Você renasce com ${ev.vida} de vida`, tom: 'ouro' })
          definirMostrado((m) => ({ ...m, vida: ev.vida }))
          if (!(await esperar(1300, g))) return
          definirFaixa(null)
          break
        }
        case 'ampulheta': { tocar('poder'); flutuar(refInimigo.current, 'Paciência reiniciada', '#f0d090', { y: -60 }); break }
        case 'trocou': { tocar('giro'); break }
        case 'rota': {
          tocar('poder')
          const nome = motor.areasDaRota().find((a) => a.area === ev.area)?.nome ?? ev.area
          flutuar(refHeroi.current, ev.modo === 'so' ? `Próximos: ${nome}` : `Sem ${nome}`, ev.modo === 'so' ? '#9ff0c8' : '#ffc89a', { y: -70, x: 40, rotulo: ev.modo === 'so' ? 'MAPA' : 'DESVIO' })
          break
        }
        case 'patamar': {
          salvarPatamar(depois)
          tocar('jingle-patamar')
          definirFaixa({ texto: `Patamar ${ev.andar}`, sub: 'Progresso salvo: se cair, você volta daqui', tom: 'azul' })
          if (!(await esperar(1300, g))) return
          definirFaixa(null)
          break
        }
        case 'torre-concluida': {
          tocar('jingle-topo')
          P?.confete({ x: window.innerWidth / 2, y: window.innerHeight * 0.4 }, 220)
          definirFaixa({ texto: 'Topo da Torre!', sub: 'Você venceu os 100 andares do Título', tom: 'chefe' })
          if (!(await esperar(3000, g))) return
          definirFaixa(null)
          break
        }
        case 'portas': case 'loja': case 'sabio': case 'comprou': case 'sala':
          break
        case 'sinergia':
          flutuar(refHeroi.current, ev.nome, '#c9a0ff', { y: -90, rotulo: 'SINERGIA' })
          break
        case 'sala-resultado':
          if (ev.azar) { definirFaixa({ texto: 'Armadilha!', sub: ev.texto, tom: 'vermelho' }); tremer(0.6); if (!(await esperar(1600, g))) return; definirFaixa(null) }
          break
        case 'recompensas':
          break
      }
    }
    if (g === geracao.current) { definirAnimando(false); sincronizar(depois) }
  }, [esperar, flutuar, fator, sincronizar, inimigo.nome, tremer, reduzido, posar])

  /**
   * Encenação à prova de falha (15/10/2026). Uma exceção no meio da animação (um
   * elemento que sumiu, um efeito que faltou) deixava `animando` ligado para sempre:
   * as telas de recompensa, portas e fim só aparecem com `animando` desligado, e o
   * jogo parava sem aviso. O estado da partida já está certo; só a encenação falhou,
   * então ela é pulada e o resultado aparece.
   */
  const encenar = useCallback(async (eventos: Evento[], depois: Partida) => {
    try { await encenarBruto(eventos, depois) }
    catch (falha) { console.error('Animação da Cripta interrompida', falha); pular() }
  }, [encenarBruto, pular])

  // Vigia: nenhuma sequência legítima passa de ~9 s (chefe derrotado com evolução).
  // Se passar, algo prendeu a encenação: pula para o jogo nunca ficar parado.
  useEffect(() => {
    if (!animando) return
    const t = window.setInterval(() => { if (Date.now() - inicioAnimacao.current > 12000) pular() }, 1000)
    return () => window.clearInterval(t)
  }, [animando, pular])

  /* ---------- Ações ---------- */
  const aplicar = useCallback((r: { estado: Partida; eventos: Evento[] }) => {
    // Ação recusada pelo motor: mesmo estado. Encerrar muda o estado sem animação e precisa passar.
    if (!r.eventos.length && r.estado === partidaRef.current) return
    const resposta = r.eventos.find((e): e is Extract<Evento, { tipo: 'resposta' }> => e.tipo === 'resposta')
    if (resposta) {
      // resposta objetiva na Cripta: atualiza a revisão sem presumir confiança (registrarEstudo, aprendizagem.ts)
      registrarEstudo({ chave: `cripta:${r.estado.sementeBase}:${r.estado.modo}:${r.estado.rodada}:${resposta.id}`, id: resposta.id, modo: 'cripta', objetiva: resposta.certo, assistida: resposta.assistida })
      const rec = { ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }
      gravar(CHAVE_RECORDES, { ...rec, ...recordeDoAndar(rec, r.estado), melhorSequencia: Math.max(rec.melhorSequencia, r.estado.melhorSequencia), atualizadoEm: Date.now() })
    }
    if (r.estado.fase === 'fim' && partidaRef.current.fase !== 'fim') {
      const rec = { ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }
      gravar(CHAVE_RECORDES, {
        ...rec, ...recordeDoAndar(rec, r.estado), chefesDerrotados: rec.chefesDerrotados + r.estado.chefesDerrotados, melhorSequencia: Math.max(rec.melhorSequencia, r.estado.melhorSequencia),
        torreConcluida: (rec.torreConcluida ?? 0) + Number(r.estado.torreConcluida), atualizadoEm: Date.now(),
      })
      void sincronizarProgresso()
      contarSessaoTerminada()
    }
    if (r.estado.idCorrida && r.estado.andar > partidaRef.current.andar) void registrarAndar(r.estado.idCorrida, r.estado.andar)
    partidaRef.current = r.estado
    definirPartida(r.estado)
    if (r.eventos.length) void encenar(r.eventos, r.estado)
    else sincronizar(r.estado)
  }, [encenar, sincronizar])

  const responder = useCallback(async (posicao: number) => {
    const p = partidaRef.current
    if (p.fase !== 'pergunta' || apresentacao || validando.current) return
    // Plano grátis: o servidor decide se este flashcard ainda cabe nas 24 h (trava desligada por padrão).
    if (FLASHCARDS_NO_SERVIDOR && p.atual) {
      validando.current = true
      const chave = chaves.current.get(p.rodada) ?? novaChave()
      chaves.current.set(p.rodada, chave)
      // partida salva antes da regra da vida grátis: abre a corrida agora
      let q = p
      if (!q.idCorrida) { q = { ...p, idCorrida: novaChave() }; partidaRef.current = q; definirPartida(q) }
      // Uma falha aqui deixava `validando` preso e o jogo parava de aceitar toques
      // sem aviso. Agora o toque simplesmente não conta e a pessoa tenta de novo.
      let r: Awaited<ReturnType<typeof autorizarFlashcardCripta>>
      try { r = await autorizarFlashcardCripta(q.atual!.id, chave, q.idCorrida!, q.modo) }
      catch (falha) { console.error('Flashcard não autorizado', falha); return }
      finally { validando.current = false }
      if (!r.permitido) { definirBloqueio(r); return }
      // sem a função nova no banco, o flashcard foi autorizado pelo limite antigo: liga à corrida à parte
      if (!r.cripta && q.idCorrida) void vincularFlashcard(chave, q.idCorrida)
      if (partidaRef.current !== q) return
    }
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
  const [rotaAberta, definirRotaAberta] = useState<'mapa' | 'desvio' | null>(null)
  const usarPoder = useCallback((tipo: TipoPoder) => {
    if (apresentacao) return
    if (tipo === 'mapa' || tipo === 'desvio') { tocar('selecao'); definirRotaAberta(tipo); return }
    aplicar(motor.usarPoder(partidaRef.current, tipo))
  }, [aplicar, apresentacao])
  const confirmarRota = useCallback((area: string, subtemas: string[]) => {
    const tipo = rotaAberta
    definirRotaAberta(null)
    if (tipo) aplicar(motor.usarRota(partidaRef.current, tipo, area, subtemas))
  }, [aplicar, rotaAberta])

  const escolherRecompensa = useCallback((r: Recompensa) => {
    if (animando) pular()
    aplicar(motor.escolher(partidaRef.current, r))
  }, [animando, aplicar, pular])

  const entrarPorta = useCallback((k: number) => { if (animando) pular(); aplicar(motor.entrar(partidaRef.current, k)) }, [animando, aplicar, pular])
  const comprarNaLoja = useCallback((k: number) => aplicar(motor.comprarNaLoja(partidaRef.current, k)), [aplicar])
  const sairDaLoja = useCallback(() => aplicar(motor.sairDaLoja(partidaRef.current)), [aplicar])
  const aceitarSabio = useCallback((k: number) => { tocar('poder'); aplicar(motor.aceitarSabio(partidaRef.current, k)) }, [aplicar])
  const escolherNaSala = useCallback((k: number) => { tocar('poder'); aplicar(motor.escolherNaSala(partidaRef.current, k)) }, [aplicar])

  const novaPartida = useCallback(() => {
    pular()
    const rec = { ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }
    gravar(CHAVE_RECORDES, { ...rec, partidas: rec.partidas + 1, atualizadoEm: Date.now() })
    if (partidaRef.current.modo === 'torre') limparPatamar()
    const r0 = motor.novaPartida(sementeNova(), { modo: partidaRef.current.modo, talentos: lerAltar().talentos, nivel: nivelEscolhido() })
    const r = { ...r0, estado: comCorrida(r0.estado) }
    definirMostrado({ vida: r.estado.vida, vidaInimigo: r.estado.inimigo.vida, revelada: false, resultado: null, marcadas: null, inimigoCaiu: false, heroiCaiu: false })
    aplicar(r)
  }, [aplicar, pular])

  /** Torre: volta ao último patamar com o herói de lá (sementes novas para os flashcards). */
  const voltarAoPatamar = useCallback(() => {
    const salvo = migrarPartida(ler<unknown>(CHAVE_PATAMAR, null))
    if (!salvo || salvo.modo !== 'torre') { novaPartida(); return }
    pular()
    // a subida que recomeça do patamar é outra partida (a que caiu fica encerrada)
    const estado: Partida = { ...salvo, semente: sementeNova(), idPartida: novoIdPartida() }
    try { if (estado.atual) motor.carta(estado.atual.id) } catch { novaPartida(); return }
    partidaRef.current = estado
    definirPartida(estado)
    definirMostrado({ vida: estado.vida, vidaInimigo: estado.inimigo.vida, revelada: false, resultado: null, marcadas: null, inimigoCaiu: false, heroiCaiu: false })
    definirCenarioVisivel(inimigoDoAndar(estado.andar, estado.sementeBase, 'torre').inimigo.cenario)
    definirApresentacao({ inimigo: inimigoDoAndar(estado.andar, estado.sementeBase, 'torre').inimigo, ciclo: 0, andar: estado.andar })
    tocar('transicao')
  }, [novaPartida, pular])

  const encerrar = useCallback(() => { pular(); aplicar(motor.encerrar(partidaRef.current)) }, [aplicar, pular])

  const revisarNoEstudo = useCallback(() => {
    definirEstudoPrimeiro(partidaRef.current.derrubaram)
    definirModo('estudo')
  }, [])

  // enquanto o servidor autoriza a resposta, ninguém sai: o resultado precisa ser aplicado e salvo
  const fechar = useCallback(() => { if (validando.current) return; tocar('fechar'); sairDoJogo() }, [])
  const pedirFechar = useCallback(() => {
    const p = partidaRef.current
    if (p.fase === 'fim' || (p.rodada === 0 && modo === 'batalha')) fechar()
    else definirConfirmarSaida(true)
  }, [fechar, modo])

  useEffect(() => {
    if (!ajustesAbertos) return
    const frame = requestAnimationFrame(() => document.getElementById('fc-menu-continuar')?.focus())
    return () => { cancelAnimationFrame(frame); refAbrirAjustes.current?.focus({preventScroll:true}) }
  }, [ajustesAbertos])

  // Teclado: 1 a 4 respondem; Enter/espaço seguem; P usa a pista; Esc pula a animação ou pede para fechar.
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const alvo = e.target as HTMLElement
      if (alvo && ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName) && e.key !== 'Escape') return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (ampliada) definirAmpliada(null)
        else if (ajustesAbertos) { definirAjustesAbertos(false); definirConfirmarRecomeco(false) }
        else if (painel) definirPainel(null)
        else if (confirmarSaida) definirConfirmarSaida(false)
        else if (apresentacao) definirApresentacao(null)
        else if (animando) pular()
        else pedirFechar()
        return
      }
      if (modo !== 'batalha' || ajustesAbertos || ampliada || confirmarSaida || painel) return
      const p = partidaRef.current
      if (apresentacao && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); definirApresentacao(null); return }
      if (/^[1-4]$/.test(e.key) && p.fase === 'pergunta') { e.preventDefault(); escolherAlternativa(indicesVisuais(p.atual)[+e.key - 1], true); return }
      if ((e.key === 'p' || e.key === 'P') && p.fase === 'pergunta') { usarPista(); return }
      if (e.key === 'Enter' || (e.key === ' ' && alvo?.tagName !== 'BUTTON' && alvo?.tagName !== 'A')) {
        if (p.fase === 'resposta') { e.preventDefault(); seguir() }
        else if (p.fase === 'pergunta' && selecionada !== null) { e.preventDefault(); responder(selecionada) }
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [modo, ajustesAbertos, painel, ampliada, confirmarSaida, apresentacao, animando, pular, pedirFechar, escolherAlternativa, usarPista, seguir, responder, selecionada])

  useEffect(() => {
    if (!apresentacao) return
    const t = window.setTimeout(() => definirApresentacao(null), reduzido ? 900 : 2600)
    return () => window.clearTimeout(t)
  }, [apresentacao, reduzido])

  /* ---------- Tela ---------- */
  const fase2 = partida.inimigo.fase === 2
  const ordem = partida.atual?.ordem ?? []
  // um flashcard por compra: responder avança a rodada, mas o flashcard da mesa é o mesmo
  // (antes ele "chegava do baralho" de novo bem na hora da resposta, e a mão também)
  const chaveDaMesa = partida.atual ? `${partida.atual.respondida ? partida.rodada - 1 : partida.rodada}-${partida.atual.id}` : ''
  const pistas = partida.encaixes.find((e) => e.tipo === 'pista')?.carga ?? 0
  const rodadasFuria = Math.max(0, inimigo.paciencia - partida.inimigo.rodadas)
  // os adversários novos são desenhados maiores; a Serpente ainda está no tamanho antigo
  const pequeno = PEQUENOS.has(inimigo.sprite)
  const escalaInimigo = (pequeno ? (faixaTela === 'larga' ? 2.5 : faixaTela === 'celular' ? 1.3 : faixaTela === 'deitado' ? 1 : 1.6) : faixaTela === 'larga' ? 2 : faixaTela === 'celular' ? 1 : faixaTela === 'deitado' ? 0.75 : 1.3) * (inimigo.variante === 'rainha' ? 1.25 : 1)
  const escalaHeroi = faixaTela === 'celular' ? 1.5 : faixaTela === 'deitado' ? 1.1 : faixaTela === 'baixa' ? 2 : 3
  const botao = partida.fase === 'pergunta'
    ? { texto: 'Atacar', sub: selecionada !== null ? `alternativa ${indicesVisuais(partida.atual).indexOf(selecionada) + 1}` : 'escolha uma', ativo: selecionada !== null && !apresentacao, acao: () => selecionada !== null && responder(selecionada), classe: selecionada !== null ? 'pronto' : '' }
    : partida.fase === 'resposta'
      ? { texto: 'Seguir', sub: 'Enter', ativo: true, acao: seguir, classe: 'seguir' }
      : animando
        // vitória, queda ou portas ainda em cena: o botão pula a animação e mostra a próxima tela
        ? { texto: 'Seguir', sub: 'pular animação', ativo: true, acao: pular, classe: 'seguir' }
        : { texto: partida.fase === 'fim' ? 'Fim' : 'Andar', sub: '', ativo: false, acao: () => {}, classe: '' }
  const mostrarRecompensas = partida.fase === 'recompensa' && !animando
  const mostrarFim = partida.fase === 'fim' && !animando
  const ciclo = inimigoDoAndar(partida.andar, partida.sementeBase, partida.modo).ciclo
  const torre = partida.modo === 'torre'
  const cansaco = desgaste(partida)
  const parada = modo === 'batalha' && ['loja', 'sabio', 'sala', 'portas'].includes(partida.fase)

  const classes = ['fc-arena', `fc-arena--${modo}`, `fc-arena--${faixaTela}`, `fc-arena--fase-${partida.fase}`, reduzido ? 'fc-arena--reduzida' : '', mostrado.vida <= 25 && modo === 'batalha' ? 'fc-arena--perigo' : ''].filter(Boolean).join(' ')

  return (
    <ModalJogo titulo={modo === 'estudo' ? 'Biblioteca de Flashcards' : NOME_MODO[partida.modo]} aoPedirFechar={pedirFechar} transicao={`${modo}:${cenarioVisivel}:${['loja','sabio','sala','fim'].includes(partida.fase) ? partida.fase : 'jogo'}`}>
      <div className={classes} data-cenario={cenarioVisivel} data-modo={partida.modo} data-parada={parada ? 'true' : undefined}>
        <Cenario cena={paisagemDaParada(partida, modo === 'batalha', cenarioVisivel)} reduzido={reduzido} clima={modo === 'estudo' ? 'dia' : climaDoAndar(partida.andar)} />
        <Suspense fallback={null}>
          {modo === 'estudo' && leituraTranquila && <ClimaEstudo humor={{tipo:'chuva', nivel:1, titulo:'Leitura tranquila', sub:''}} reduzido={reduzido} tranquilo />}
          {modo === 'estudo' && !leituraTranquila && humorEstudo && humorEstudo.tipo !== 'calmo' && <ClimaEstudo humor={humorEstudo} reduzido={reduzido} />}
        </Suspense>

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
                <span className="fc-topo__titulo">{NOME_MODO[partida.modo]}</span>
                {torre ? (
                  <span className="fc-topo__progresso">
                    <span className="fc-escalada" role="meter" aria-label={`Andar ${partida.andar} de ${TORRE.andares}`} aria-valuemin={1} aria-valuemax={TORRE.andares} aria-valuenow={partida.andar}><i style={{ width: `${partida.andar}%` }} /></span>
                    <b>Andar {partida.andar}</b>/{TORRE.andares} <span aria-hidden="true">·</span> <b>{partida.pontos}</b> pts <span className="fc-bolsa" title={`${partida.ouro} moedas para a Caixeira do Arsenal · ${cristaisAltar} cristais no Altar`}><Sprite nome="moeda" className="fc-sprite--icone" /><b>{partida.ouro}</b></span>{cansaco < 1 && <span className="fc-desgaste" title={`Desgaste: as curas rendem ${Math.round(cansaco * 100)}% neste trecho`}>cura {Math.round(cansaco * 100)}%</span>}
                  </span>
                ) : (
                  <span className="fc-topo__progresso">
                    <span className="fc-trilha" aria-label={`Andar ${((partida.andar - 1) % 3) + 1} de 3 do ato ${Math.floor((partida.andar - 1) / 3) + 1}`}>
                      {[0, 1, 2].map((i) => {
                        const n = (partida.andar - 1) % 3
                        return <i key={i} className={(i < n ? 'feito' : i === n ? 'atual' : '') + (i === 2 ? ' chefe' : '')} title={i === 2 ? 'Chefe do ato' : 'Confronto'} />
                      })}
                    </span>
                    <b>Andar {partida.andar}</b>{ciclo ? ` · ato ${ciclo + 1}` : ''} <span aria-hidden="true">·</span> <b>{partida.pontos}</b> pts <span className="fc-bolsa" title={`${partida.ouro} moedas para a Caixeira do Arsenal · ${cristaisAltar} cristais no Altar`}><Sprite nome="moeda" className="fc-sprite--icone" /><b>{partida.ouro}</b></span>{cansaco < 1 && <span className="fc-desgaste" title={`Desgaste: as curas rendem ${Math.round(cansaco * 100)}% neste trecho`}>cura {Math.round(cansaco * 100)}%</span>}
                  </span>
                )}
              </>
            ) : (
              <><span className="fc-topo__titulo">Biblioteca do Torneio</span><span className="fc-topo__progresso">Modo Estudo · revisão calma</span></>
            )}
          </div>
          <div className="fc-topo__acoes">
            <button ref={refAbrirAjustes} type="button" className="fc-topo-botao" onClick={() => { tocar('selecao'); definirAjustesAbertos(true) }} aria-label="Menu: som, ajustes, recomeçar e voltar ao menu inicial" aria-haspopup="dialog" title="Menu">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              <span className="fc-topo-botao__texto">Menu</span>
            </button>
                        <Volume valor={ajustes.som ? ajustes.volume : 0} aoMudar={volume => definirAjustes({ volume, som: volume > 0 })} />
          </div>
        </header>

        {modo === 'estudo' ? (
          <Suspense fallback={<div className="fc-estudo fc-estudo--chegando" role="status"><span>Abrindo a Biblioteca…</span></div>}>
            <Estudo primeiro={estudoPrimeiro} aoAmpliar={definirAmpliada} reduzido={reduzido} aoHumor={definirHumorEstudo} aoTranquilo={definirLeituraTranquila} />
          </Suspense>
        ) : (
          <div className="fc-batalha" aria-hidden={parada || undefined}>
            {/* Adversário em cena, de pé sobre a arena */}
            <section className={`fc-inimigo${inimigo.chefe ? ' fc-inimigo--chefe' : ''}${fase2 ? ' fc-inimigo--fase2' : ''}${partida.inimigo.furia ? ' fc-inimigo--furia' : ''}`} aria-label={`Adversário: ${inimigo.nome}`}>
              <Ator ref={refInimigo} contido quem={inimigo.sprite as Personagem} variante={inimigo.variante} escala={escalaInimigo} chefe={inimigo.chefe} classe={'fc-ator--inimigo' + (inimigo.nivel === 'elite' ? ' fc-ator--elite' : '') + (mostrado.inimigoCaiu ? ' fc-ator--caiu' : '')}>
                <button type="button" className="fc-ator__toque" aria-label={`Ver ${inimigo.nome}: atributos e habilidades`} onClick={() => { tocar('selecao'); definirPainel('inimigo') }} />
              </Ator>
              <div className="fc-placa">
                <div className="fc-placa__nome">
                  {inimigo.chefe && <em className="fc-selo fc-selo--chefe">Chefe</em>}
                  {inimigo.nivel === 'elite' && <em className="fc-selo fc-selo--elite">Elite</em>}
                  <strong>{inimigo.nome}</strong>
                  {fase2 && <em className="fc-selo fc-selo--fase">{inimigo.fase2?.nome}</em>}
                </div>
                <BarraVida atual={mostrado.vidaInimigo} maximo={partida.inimigo.vidaMax} tipo={inimigo.chefe ? 'chefe' : 'inimigo'} rotulo={`Vida de ${inimigo.nome}`} />
                {(() => {
                  // Interface mais leve (Etapa 4): no máximo dois selos à vista, pelo que mais muda a luta
                  // (fúria e o golpe especial); o resto fica num "+N" que abre o painel do adversário.
                  const selos = [
                    partida.inimigo.furia ? <span key="furia" className="fc-info fc-info--furia">Fúria · dano ×1,5</span> : <span key="furia" className="fc-info" title="Rodadas até a Fúria">Fúria em {rodadasFuria}</span>,
                    // o superpoder do adversário aparece logo depois da Fúria
                    inimigo.envenena && <span key="envenena" className="fc-info fc-info--veneno" title={`A picada envenena: −${inimigo.envenena} por flashcard até ${VENENO.acertos} acertos seguidos`}>Picada venenosa</span>,
                    inimigo.queima && <span key="queima" className="fc-info fc-info--furia" title={`O Sopro deixa você em chamas por ${QUEIMADURA.flashcards} flashcards; um acerto difícil apaga`}>Sopro que queima</span>,
                    inimigo.gruda && <span key="gruda" className="fc-info fc-info--grude" title="Depois de acertar você, o próximo erro dói 50% a mais; um acerto desgruda">Grude</span>,
                    inimigo.tremor && <span key="tremor" className="fc-info" title="O crítico derruba 1 carga de um poder equipado">Tremor</span>,
                    inimigo.carrega && <span key="carrega" className="fc-info fc-info--furia" title="Golpe carregado, avisado na intenção">{inimigo.carrega.nome} a cada {inimigo.carrega.aCada}</span>,
                    partida.inimigo.barreira > 0 && <span key="barreira" className="fc-info fc-info--barreira" title="Absorve o dano dos seus acertos antes da vida">Barreira {partida.inimigo.barreira}</span>,
                    partida.inimigo.brasas > 0 && <span key="brasas" className="fc-info fc-info--brasa">Brasas ×{partida.inimigo.brasas}</span>,
                    inimigo.rajada && inimigo.rajada > 1 && <span key="rajada" className="fc-info" title="Passa pela Barreira reativa">{inimigo.rajada} mordidas</span>,
                    atributos.armadura > 0 && <span key="armadura" className="fc-info fc-info--armadura">Armadura {atributos.armadura}</span>,
                    inimigo.regenera && partida.inimigo.regenerado < inimigo.regenera.total && <span key="regenera" className="fc-info fc-info--regenera" title={`Recupera ${inimigo.regenera.porRodada} por rodada, até ${inimigo.regenera.total} neste confronto`}>Regenera {inimigo.regenera.porRodada}</span>,
                    inimigo.porErroSeguido > 0 && <span key="pressao" className="fc-info">{inimigo.chefe ? 'Pressão' : 'Veneno'} +{inimigo.porErroSeguido} por erro seguido</span>,
                    inimigo.rouba && <span key="rouba" className="fc-info">Rouba cargas</span>,
                    inimigo.divide && !partida.inimigo.dividido && <span key="divide" className="fc-info">Se divide em {Math.round(inimigo.divide.abaixoDe * 100)}%</span>,
                  ].filter(Boolean)
                  const resto = selos.length - 2
                  return (
                    <div className="fc-placa__info">
                      <span className="fc-info fc-info--andar">Andar {partida.andar}{torre ? '/100' : ''} · {partida.pontos} pts</span>
                      {selos.slice(0, 2)}
                      {resto > 0 && <button type="button" className="fc-info fc-info--mais" onClick={() => { tocar('selecao'); definirPainel('inimigo') }} aria-label={`Mais ${resto} habilidades do adversário`}>+{resto}</button>}
                    </div>
                  )
                })()}
              </div>
              {/* na resposta a intenção some sem tirar o lugar: a mesa não sobe 10 px a cada resposta (16/10/2026) */}
              {(partida.fase === 'pergunta' || partida.fase === 'resposta') && (
                <div aria-hidden={partida.fase !== 'pergunta' || undefined} className={`fc-intencao${partida.fase !== 'pergunta' ? ' fc-intencao--oculta' : ''}${intencao.furia ? ' fc-intencao--furia' : ''}${intencao.bloqueado ? ' fc-intencao--bloqueado' : ''}${(intencao.critico || intencao.carregado) && !intencao.bloqueado ? ' fc-intencao--critico' : ''}${intencao.carregado && !intencao.bloqueado ? ' fc-intencao--sopro' : ''}`}
                  title={intencao.bloqueado ? 'O escudo bloqueia o próximo golpe' : `Intenção do adversário: o dano exato que você leva se errar${intencao.carregado ? ` (${intencao.carregado})` : intencao.critico ? ' (golpe crítico)' : ''}${intencao.protecoes.length ? `, já com ${intencao.protecoes.join(' e ')}` : ''}`}>
                  <span className="fc-intencao__gema">{intencao.bloqueado ? <Sprite nome="escudo" className="fc-sprite--icone" /> : <b>{intencao.dano}</b>}</span>
                  <span className="fc-intencao__simbolo" aria-hidden="true"><Sprite nome={intencao.bloqueado ? 'escudo' : intencao.carregado && inimigo.variante === 'basilisco' ? 'cartas' : intencao.carregado && inimigo.queima ? 'chama' : inimigo.envenena ? 'frasco' : inimigo.rouba ? 'bolsa' : intencao.rajada > 1 ? 'espadas' : 'espada'} /></span><small>{intencao.bloqueado ? 'escudo pronto' : intencao.carregado ? 'sopro se errar' : intencao.critico ? 'crítico se errar' : intencao.rajada > 1 ? `${intencao.rajada} mordidas` : 'se errar'}</small>
                </div>
              )}
            </section>

            {/* Estrado de pedra com o flashcard */}
            <section className="fc-mesa" ref={refMesa} aria-label="Mesa da batalha" data-tabuleiro={TABULEIRO[cenarioVisivel] ?? 'mesa'}>
              <TampoMesa cenario={cenarioVisivel} />
              <span className="fc-gema fc-gema--1" aria-hidden="true" /><span className="fc-gema fc-gema--2" aria-hidden="true" />
              <span className="fc-gema fc-gema--3" aria-hidden="true" /><span className="fc-gema fc-gema--4" aria-hidden="true" />
              <div className="fc-pilha fc-pilha--baralho" aria-label={`${partida.baralho.length} flashcards no baralho`}><span className="fc-costas" /><span className="fc-costas" /><span className="fc-costas" /><b>{partida.baralho.length}</b><small>Baralho</small></div>
              <div className="fc-pilha fc-pilha--descarte" aria-label={`${partida.descarte.length} no descarte`}>{partida.descarte.length > 0 && <><span className="fc-costas" /><span className="fc-costas" /></>}<b>{partida.descarte.length}</b><small>Descarte</small></div>
              {rotaVisivel && (
                <p className={`fc-rota-hud fc-rota-hud--${rotaVisivel.modo}`} role="status" aria-label={`Rota de estudo: ${rotaVisivel.modo === 'so' ? '' : 'sem '}${rotaVisivel.nome}, faltam ${rotaVisivel.faltam} de ${rotaVisivel.total} flashcards`}>
                  <Sprite nome={rotaVisivel.modo === 'so' ? 'bussola' : 'pergaminho'} className="fc-sprite--icone" />
                  <span className="fc-rota-hud__area">{rotaVisivel.modo === 'so' ? rotaVisivel.nome : `Sem ${rotaVisivel.nome}`}</span>
                  <b>{rotaVisivel.faltam}</b><small>{rotaVisivel.faltam === 1 ? 'falta' : 'faltam'}</small>
                </p>
              )}
              <div className="fc-mesa__palco" ref={refCarta}>
                {carta && partida.atual && (
                  <Cartao
                    chave={chaveDaMesa}
                    carta={carta}
                    virada={mostrado.revelada && partida.fase !== 'pergunta'}
                    dicaFrente={faixaTela === 'celular' ? 'Escolha a resposta abaixo' : faixaTela === 'deitado' ? 'Escolha a resposta ao lado' : 'Escolha a resposta na sua mão · teclas 1 a 4'}
                    aoAmpliar={ampliarImagem}
                    resultado={partida.fase !== 'pergunta' ? mostrado.resultado : null}
                    assistida={partida.atual.assistida}
                    aoGirar={somDoGiro}
                    reduzido={reduzido}
                    classe={(atacando ? 'fc-carta--ataca' : '') + (partida.atual.brilhante ? ' fc-carta--brilhante' : '')}
                    familias={familiasCarta}
                  />
                )}
              </div>
            </section>

            {/* Você */}
            <section className="fc-jogador" aria-label="Você">
              <div className="fc-heroi" ref={refBlocoHeroi}>
                <Ator ref={ajustes.textoMaior ? undefined : refHeroi} quem="heroi" variante={partida.estagio > 1 ? `heroi-${partida.estagio}` : undefined} escala={escalaHeroi} classe={`fc-ator--heroi fc-ator--estagio-${partida.estagio}` + (mostrado.heroiCaiu ? ' fc-ator--caiu' : '') + (partida.veneno ? ' fc-ator--envenenado' : '') + (partida.grudado ? ' fc-ator--grudado' : '')}>
                  {partida.encaixes.some((e) => e.tipo === 'escudo') && <span className="fc-bolha-escudo" />}
                  {partida.veneno && <span className="fc-envenenado" aria-hidden="true" style={{ backgroundImage: `url(${recurso('flashcards/vfx/bolhas.png')})` }} />}
                  {partida.queimadura && <span className="fc-em-chamas" aria-hidden="true">{[0, 1, 2].map((k) => <i key={k} style={{ backgroundImage: `url(${recurso('flashcards/vfx/chama-escarlate.png')})`, animationDelay: `${-k * 170}ms` }} />)}</span>}
                  <button type="button" className="fc-ator__toque" aria-label="Ver o seu herói: atributos, poderes e relíquias" onClick={() => { tocar('selecao'); definirPainel('heroi') }} />
                </Ator>
                <div className="fc-heroi__dados" ref={ajustes.textoMaior ? refHeroi : undefined}>
                  <div className="fc-heroi__nome"><Sprite nome="coracao" className="fc-sprite--coracao" />{ajustes.textoMaior ? <button type="button" className="fc-heroi-detalhes" onClick={() => definirPainel('heroi')} aria-label="Ver seus atributos, poderes e relíquias">Você</button> : <strong title={ESTAGIOS[partida.estagio - 1].nome}>Você</strong>}
                    <em className={`fc-estagio fc-estagio--${partida.estagio}`} title={`Estágio ${partida.estagio}: ${ESTAGIOS[partida.estagio - 1].nome}`}>{['I', 'II', 'III', 'IV', 'V', 'VI'][partida.estagio - 1]}</em>
                    <span className="fc-bolsa fc-bolsa--celular" aria-label={`${partida.ouro} moedas`}><Sprite nome="moeda" className="fc-sprite--icone" /><b>{partida.ouro}</b></span>

                    <span className={`fc-combo${partida.sequencia >= COMBO_MINIMO ? ' fc-combo--ativo' : ''}`} aria-label={`Sequência de ${partida.sequencia} acertos`}>
                      {Array.from({ length: 5 }, (_, i) => <i key={i} className={i < Math.min(5, partida.sequencia) ? 'aceso' : ''} />)}
                      <span>{partida.sequencia >= COMBO_MINIMO ? `Combo ×${partida.sequencia}` : `Sequência ${partida.sequencia}`}</span>
                    </span>
                  </div>
                  <BarraVida atual={mostrado.vida} maximo={partida.vidaMax} tipo="heroi" rotulo="Sua vida" />
                  {partida.grudado && (
                    <div className="fc-veneno-selo fc-veneno-selo--grude" role="status" title="Grudado pela gosma: o próximo erro dói 50% a mais. Um acerto desgruda.">
                      <b>Grudado</b><span>próximo erro +50%</span>
                    </div>
                  )}
                  {partida.queimadura && (
                    <div className="fc-veneno-selo fc-veneno-selo--fogo" role="status" title={`Em chamas: cada flashcard tira ${partida.queimadura.dano} de vida (nunca abaixo de 1), por mais ${partida.queimadura.faltam}. Acertar um flashcard difícil apaga o fogo.`}>
                      <b>Em chamas</b><span>−{partida.queimadura.dano} por flashcard</span>
                      <span className="fc-veneno-selo__conta" aria-label={`Faltam ${partida.queimadura.faltam} flashcards`}>
                        {Array.from({ length: QUEIMADURA.flashcards }, (_, i) => <i key={i} className={i < partida.queimadura!.faltam ? 'feito' : ''} />)}
                      </span>
                    </div>
                  )}
                  {partida.veneno && (
                    <div className="fc-veneno-selo" role="status" title={`Envenenado: cada flashcard tira ${partida.veneno.dano} de vida (nunca abaixo de 1). Acerte ${VENENO.acertos} seguidos para curar; um erro recomeça a conta.`}>
                      <b>Envenenado</b><span>−{partida.veneno.dano} por flashcard</span>
                      <span className="fc-veneno-selo__conta" aria-label={`Faltam ${partida.veneno.faltam} acertos seguidos`}>
                        {Array.from({ length: VENENO.acertos }, (_, i) => <i key={i} className={i < VENENO.acertos - partida.veneno!.faltam ? 'feito' : ''} />)}
                      </span>
                    </div>
                  )}
                  <div className="fc-encaixes" ref={refSlots} aria-label="Poderes equipados">
                    {Array.from({ length: ENCAIXES }, (_, i) => {
                      const e = partida.encaixes[i]
                      const pronto = !!e && !!RECOMPENSAS[e.tipo].ativo && partida.fase === 'pergunta' && !partida.atual?.respondida && !apresentacao
                      // pista: sobram mais de 2 alternativas; poção: falta vida; os outros ativos (ampulheta, carta na manga, mapa, desvio) sempre
                      const usavel = pronto && (e!.tipo === 'pista' ? ordem.length - (partida.atual?.eliminadas.length ?? 0) > 2 : e!.tipo === 'vital' ? partida.vida < partida.vidaMax : true)
                      // por que não dá para usar agora (aparece na dica do poder)
                      const motivo = !e || usavel ? undefined
                        : partida.fase !== 'pergunta' || partida.atual?.respondida ? 'use no próximo flashcard, antes de responder'
                        : apresentacao ? 'use quando a luta começar'
                        : e.tipo === 'pista' ? 'já sobram só duas alternativas'
                        : e.tipo === 'vital' ? 'sua vida está cheia' : undefined
                      return <Encaixe key={i} tipo={e?.tipo} carga={e?.carga} extra={e?.tipo === 'pocao' ? partida.pocao : undefined} usavel={usavel} motivo={motivo} aoUsar={() => e && usarPoder(e.tipo)} />
                    })}
                    {[...new Set(partida.reliquias)].map((r) => <Reliquia key={r} tipo={r} copias={partida.reliquias.filter((x) => x === r).length} />)}
                    <ReliquiasCompactas lista={partida.reliquias} />
                  </div>
                </div>
              </div>

              <div className={`fc-mao${partida.fase !== 'pergunta' ? ' fc-mao--respondida' : ''}`} ref={refMao} role="group" aria-label="Sua mão: alternativas">
                {carta && indicesVisuais(partida.atual).map((pos, visual) => {
                  const opcao = ordem[pos]
                  const eliminada = partida.atual!.eliminadas.includes(pos)
                  const m = mostrado.marcadas
                  const estado = m && m.certa >= 0 ? (pos === m.certa ? 'certa' : pos === m.escolha ? 'errada' : 'apagada') : m && pos === m.escolha ? 'jogada' : ''
                  return (
                    <div key={chaveDaMesa + '-' + pos} className={`fc-slot-mao${selecionada === pos ? ' fc-slot-mao--sel' : ''}`} style={{ ['--i' as string]: visual, ['--n' as string]: ordem.length }}>
                      <button
                        type="button"
                        className={`fc-alternativa${carta.opcoes[opcao].trim().length <= 4 ? ' fc-alternativa--curta' : ''}${carta.opcoes[opcao].length > 56 ? ' fc-alternativa--muito-longa' : carta.opcoes[opcao].length > 34 ? ' fc-alternativa--longa' : ''}${Math.max(...carta.opcoes[opcao].split(/\s+/).map((x) => x.length)) > 12 ? ' fc-alternativa--palavra-longa' : ''}${eliminada ? ' fc-alternativa--eliminada' : ''}${eliminando === pos ? ' fc-alternativa--queimando' : ''}${estado ? ' fc-alternativa--' + estado : ''}`}
                        disabled={partida.fase !== 'pergunta' || eliminada || !!apresentacao}
                        onClick={() => escolherAlternativa(pos, false)}
                        onPointerEnter={() => { if (partida.fase === 'pergunta' && !eliminada && faixaTela !== 'celular') tocar('hover') }}
                        aria-pressed={selecionada === pos}
                        aria-label={`Alternativa ${visual + 1}: ${carta.opcoes[opcao]}${eliminada ? ' (eliminada pela pista)' : ''}`}
                      >
                        <i aria-hidden="true">{visual + 1}</i>
                        <span>{carta.opcoes[opcao]}</span>
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="fc-acao" ref={refBlocoAcao}>
                <button type="button" className={`fc-principal ${botao.classe}`} disabled={!botao.ativo} onClick={() => { tocar('confirmar'); botao.acao() }}>
                  <span className="fc-principal__runa" aria-hidden="true" />
                  <Sprite nome={botao.classe === 'seguir' ? 'porta' : 'espada'} className="fc-sprite--icone fc-principal__icone" />
                  <span className="fc-principal__texto"><span>{botao.texto}</span>{botao.sub && <small>{botao.sub}</small>}</span>
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
        <div className="fc-flutuantes" aria-hidden="true" ref={refFlutuantes} />
        {lamina > 0 && <div className="fc-lamina" key={'l-' + lamina} aria-hidden="true"><i /></div>}
        <div className="fc-borda-vermelha" key={'v-' + vermelho} data-ativo={vermelho > 0 ? 1 : 0} aria-hidden="true" />
        {transicao && <div className="fc-transicao" aria-hidden="true" />}

        {aviso && modo === 'batalha' && <div className="fc-aviso-aparelho" role="status" onClick={() => definirAviso(null)}>{aviso}</div>}

        {faixa && modo === 'batalha' && (
          <div className={`fc-faixa fc-faixa--${faixa.tom}`} role="status" onClick={pular}>
            {faixa.tom === 'chefe' && <span className="fc-faixa__raios" aria-hidden="true" />}
            <strong>{faixa.texto}</strong>{faixa.sub && <small>{faixa.sub}</small>}
          </div>
        )}

        {apresentacao && modo === 'batalha' && (
          <div className={`fc-apresenta${apresentacao.inimigo.chefe ? ' fc-apresenta--chefe' : ''}`} role="dialog" aria-label={`Andar ${apresentacao.andar}: ${apresentacao.inimigo.nome}`} onClick={() => definirApresentacao(null)}>
            <div className="fc-apresenta__cartaz">
              <span className="fc-apresenta__andar">Andar {apresentacao.andar}{torre ? ' da Torre' : apresentacao.ciclo ? ` · ato ${apresentacao.ciclo + 1}` : ''}{apresentacao.inimigo.chefe ? ' · Chefe' : apresentacao.inimigo.nivel === 'elite' ? ' · Elite' : ''}</span>
              <div className="fc-apresenta__palco"><Ator quem={apresentacao.inimigo.sprite as Personagem} variante={apresentacao.inimigo.variante} escala={(PEQUENOS.has(apresentacao.inimigo.sprite) ? 1.4 : apresentacao.inimigo.sprite === 'dragao' ? 0.8 : 1) * (faixaTela === 'celular' ? 1.6 : 2.4)} chefe={apresentacao.inimigo.chefe} /></div>
              <strong>{apresentacao.inimigo.nome}</strong>
              <em>{apresentacao.inimigo.lema}</em>
              <p>{apresentacao.inimigo.habilidade}</p>
              <p className="fc-apresenta__numeros"><span>Vida {apresentacao.inimigo.vida}</span><span>Força ×{apresentacao.inimigo.forca}</span>{apresentacao.inimigo.armadura > 0 && <span>Armadura {apresentacao.inimigo.armadura}</span>}</p>
              <small>Toque para começar</small>
            </div>
          </div>
        )}

        {mostrarRecompensas && modo === 'batalha' && <Recompensas partida={partida} aoEscolher={escolherRecompensa} aoEncerrar={encerrar} rapido={reduzido || ajustes.velocidade === 'rapida'} />}
        {partida.fase === 'portas' && !animando && modo === 'batalha' && <Portas partida={partida} aoEntrar={entrarPorta} rapido={reduzido || ajustes.velocidade === 'rapida'} />}
        {partida.fase === 'loja' && !animando && modo === 'batalha' && <Loja partida={partida} aoComprar={comprarNaLoja} aoSair={sairDaLoja} />}
        {partida.fase === 'sabio' && !animando && modo === 'batalha' && <Sabio partida={partida} aoAceitar={aceitarSabio} />}
        {partida.fase === 'sala' && !animando && modo === 'batalha' && <SalaEvento partida={partida} aoEscolher={escolherNaSala} />}
        {ajuda !== null && modo === 'batalha' && <AjudaDoPreceptor cura={ajuda} />}
        {tituloChefe && modo === 'batalha' && <TituloChefe nome={tituloChefe.nome} lema={tituloChefe.lema} quem={tituloChefe.sprite as Personagem} variante={tituloChefe.variante} />}
        {mostrarFim && modo === 'batalha' && <Fim partida={partida} aoNova={novaPartida} aoRevisar={revisarNoEstudo} aoSair={fechar} aoPatamar={voltarAoPatamar} />}

        {ampliada && <Visualizador src={ampliada.src} legenda={ampliada.legenda} aoFechar={() => definirAmpliada(null)} />}

        {bloqueio && (
          <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-limite-titulo">
            <div className="fc-janela">
              <h2 id="fc-limite-titulo">{bloqueio.falha ? 'Não deu para validar' : 'Limite grátis de hoje'}</h2>
              <p className="fc-janela__sub">{bloqueio.falha ? 'Não foi possível falar com o servidor agora. Confira a conexão e tente de novo.'
                : bloqueio.cripta ? `Sua jornada grátis na Cripta acabou por hoje${bloqueio.liberaEm ? `; volte depois das ${new Date(bloqueio.liberaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}. Assinantes jogam sem limite.`
                : `Seu acesso grátis acabou por agora${bloqueio.liberaEm ? `; libera às ${new Date(bloqueio.liberaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}. Assinantes jogam sem limite.`}</p>
              <div className="fc-janela__botoes">
                <button type="button" className="fc-botao fc-botao--secundario" onClick={() => definirBloqueio(null)}>{bloqueio.falha ? 'Tentar de novo' : 'Agora não'}</button>
                {!bloqueio.falha && <a className="fc-botao" href={href('/assinatura')}>Ver os planos</a>}
              </div>
            </div>
          </div>
        )}

        {painel && <Painel tipo={painel} partida={partida} intencao={intencao} aoFechar={() => definirPainel(null)} />}
        {rotaAberta && <EscolherRota tipo={rotaAberta} areaAtual={partida.atual ? motor.carta(partida.atual.id) : null} aoEscolher={confirmarRota} aoFechar={() => definirRotaAberta(null)} />}

        {confirmarSaida && (
          <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-sair-titulo">
            <div className="fc-janela">
              <h2 id="fc-sair-titulo">Voltar ao site?</h2>
              <p className="fc-janela__sub">Sua partida fica salva neste aparelho e continua de onde parou quando você voltar.</p>
              <div className="fc-janela__botoes">
                <button type="button" className="fc-botao fc-botao--secundario" onClick={fechar}>Voltar ao site</button>
                <button type="button" className="fc-botao" onClick={() => definirConfirmarSaida(false)} autoFocus>Continuar jogando</button>
              </div>
            </div>
          </div>
        )}

        {ajustesAbertos && (
          <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-menu-titulo" onClick={() => { definirAjustesAbertos(false); definirConfirmarRecomeco(false) }}>
            <div className="fc-janela fc-menu" onClick={(e) => e.stopPropagation()}>
              <h2 id="fc-menu-titulo">Menu</h2>
              {/* Partida: continuar, recomeçar (com confirmação) e voltar ao menu inicial (15/10/2026) */}
              <div className="fc-menu__acoes">
                <button id="fc-menu-continuar" type="button" className="fc-botao" onClick={() => definirAjustesAbertos(false)}>Continuar</button>
                {modo === 'batalha' && (confirmarRecomeco
                  ? <div className="fc-menu__confirma" role="group" aria-label="Confirmar recomeço">
                      <p>Recomeçar do andar 1? A partida do andar {partida.andar} será encerrada. Recorde, cristais e talentos continuam.</p>
                      <div className="fc-janela__botoes">
                        <button type="button" className="fc-botao fc-botao--secundario" onClick={() => definirConfirmarRecomeco(false)}>Cancelar</button>
                        <button type="button" className="fc-botao" onClick={() => { definirConfirmarRecomeco(false); definirAjustesAbertos(false); novaPartida() }}>Recomeçar</button>
                      </div>
                    </div>
                  : <button type="button" className="fc-botao fc-botao--secundario" onClick={() => { tocar('selecao'); definirConfirmarRecomeco(true) }}>Recomeçar a partida</button>)}
                <button type="button" className="fc-botao fc-botao--secundario" onClick={() => { if (validando.current) return; tocar('selecao'); definirAjustesAbertos(false); navegar('/flashcards/entrada') }}>Voltar ao menu inicial</button>
              </div>
              <fieldset className="fc-grupo fc-menu__som">
                <legend>Som</legend>
                <ControleVolume rotulo="Volume geral" valor={ajustes.som ? ajustes.volume : 0} aoMudar={(volume) => definirAjustes({ volume, som: volume > 0 })} comPassos />
                <ControleVolume rotulo="Efeitos" valor={ajustes.volEfeitos} desligado={!ajustes.som} aoMudar={(volEfeitos) => definirAjustes({ volEfeitos })} aoSoltar={() => tocar('impacto-medio')} />
                <ControleVolume rotulo="Música" valor={ajustes.volMusica} desligado={!ajustes.som} aoMudar={(volMusica) => definirAjustes({ volMusica })} />
                <ControleVolume rotulo="Ambiente" valor={ajustes.volAmbiente} desligado={!ajustes.som} aoMudar={(volAmbiente) => definirAjustes({ volAmbiente })} />
                <button type="button" className={'fc-menu__mudo' + (ajustes.som ? '' : ' fc-menu__mudo--on')} aria-pressed={!ajustes.som} onClick={() => { destravar(); const som = !ajustes.som; definirAjustes({ som, volume: som && ajustes.volume === 0 ? VOLUME_INICIAL : ajustes.volume }); if (som) window.setTimeout(() => tocar('poder'), 50) }}>{ajustes.som ? 'Silenciar tudo' : 'Ligar o som'}</button>
              </fieldset>
              <fieldset className="fc-grupo">
                <legend>Movimento</legend>
                <label className="fc-ajuste"><input id="fc-efeitos" type="checkbox" checked={reduzido} onChange={(e) => definirAjustes({ efeitos: e.target.checked ? 'reduzidos' : 'completos' })} /><span>Reduzir movimento (sem tremor, partículas e giro)</span></label>
                <label className="fc-ajuste"><input id="fc-rapido" type="checkbox" checked={ajustes.velocidade === 'rapida'} onChange={(e) => definirAjustes({ velocidade: e.target.checked ? 'rapida' : 'normal' })} /><span>Animações rápidas</span></label>
              </fieldset>
              <fieldset className="fc-grupo">
                <legend>Leitura e conforto</legend>
                <label className="fc-ajuste"><input type="checkbox" checked={!!ajustes.semTremor} onChange={e=>definirAjustes({semTremor:e.target.checked})}/><span>Sem tremor da tela</span></label>
                <label className="fc-ajuste"><input type="checkbox" checked={!!ajustes.altoContraste} onChange={e=>definirAjustes({altoContraste:e.target.checked})}/><span>Alto contraste</span></label>
                <label className="fc-ajuste"><input type="checkbox" checked={!!ajustes.textoMaior} onChange={e=>definirAjustes({textoMaior:e.target.checked})}/><span>Texto maior</span></label>
              </fieldset>
              {sistemaReduzido && <p className="fc-janela__nota">O aparelho está configurado para reduzir movimento.</p>}
              <p className="fc-janela__nota">Teclado: 1 a 4 respondem, Enter segue, P usa a pista, Esc pula a animação ou fecha.</p>
            </div>
          </div>
        )}
      </div>
    </ModalJogo>
  )
}

/**
 * Escolha da rota de estudo: no Mapa do especialista, a área e (opcional) até
 * 10 subtemas dela; no Desvio de área, só a área que sai. Mostra a contagem
 * real de flashcards da Batalha em cada opção.
 */
function EscolherRota({ tipo, areaAtual, aoEscolher, aoFechar }: { tipo: 'mapa' | 'desvio'; areaAtual: Flashcard | null; aoEscolher: (area: string, subtemas: string[]) => void; aoFechar: () => void }) {
  const areas = useMemo(() => motor.areasDaRota(), [])
  const [area, definirArea] = useState<string | null>(tipo === 'desvio' && areaAtual ? (areaAtual.areaId ?? areaAtual.area) : null)
  const [subtemas, definirSubtemas] = useState<string[]>([])
  const d = RECOMPENSAS[tipo]
  const escolhida = areas.find((a) => a.area === area)
  const alternar = (t: string) => definirSubtemas((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]))
  return (
    <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-rota-titulo" onClick={aoFechar}>
      <div className="fc-janela fc-janela--larga fc-rota" onClick={(e) => e.stopPropagation()} style={{ ['--cor' as string]: d.cor }}>
        <h2 id="fc-rota-titulo"><Sprite nome={d.icone} className="fc-sprite--icone" /> {d.nome}</h2>
        <p className="fc-janela__sub">{tipo === 'mapa' ? 'Escolha a área dos próximos 10 flashcards.' : 'Escolha a área que fica de fora nos próximos 10 flashcards.'}</p>
        <div className="fc-rota__lista" role="listbox" aria-label="Áreas">
          {areas.map((a) => (
            <button key={a.area} type="button" role="option" aria-selected={area === a.area} className={'fc-rota__opcao' + (area === a.area ? ' fc-rota__opcao--on' : '')} onClick={() => { tocar('hover'); definirArea(a.area); definirSubtemas([]) }}>
              <strong>{a.nome}</strong><small>{a.total} flashcards</small>
            </button>
          ))}
        </div>
        {tipo === 'mapa' && escolhida && escolhida.subtemas.length > 0 && (
          <>
            <p className="fc-janela__nota">Quer afinar? Marque subtemas (opcional). Sem marcar, vale a área toda.</p>
            <div className="fc-rota__subtemas">
              {escolhida.subtemas.slice(0, 10).map((t) => (
                <button key={t.nome} type="button" aria-pressed={subtemas.includes(t.nome)} className={'fc-rota__sub' + (subtemas.includes(t.nome) ? ' fc-rota__sub--on' : '')} onClick={() => alternar(t.nome)}>{t.nome} <small>{t.total}</small></button>
              ))}
            </div>
          </>
        )}
        <div className="fc-janela__botoes">
          <button type="button" className="fc-botao fc-botao--secundario" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="fc-botao" disabled={!area} onClick={() => area && aoEscolher(area, subtemas)}>{tipo === 'mapa' ? 'Seguir o mapa' : 'Desviar'}</button>
        </div>
      </div>
    </div>
  )
}

/** Painel do herói ou do adversário: atributos, efeitos e histórico. Nunca mostra nada da resposta. */
function Painel({ tipo, partida, intencao, aoFechar }: { tipo: 'heroi' | 'inimigo'; partida: Partida; intencao: ReturnType<typeof motor.intencao>; aoFechar: () => void }) {
  const est = ESTAGIOS[partida.estagio - 1]
  const i = inimigoDoAndar(partida.andar, partida.sementeBase, partida.modo).inimigo
  const at = motor.atributos(partida)
  const nivel = { comum: 'Comum', elite: 'Elite', chefe: 'Chefe' }[i.nivel]
  return (
    <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-painel-titulo" onClick={aoFechar}>
      <div className="fc-janela fc-janela--larga fc-painel" onClick={(e) => e.stopPropagation()}>
        {tipo === 'heroi' ? (
          <>
            <h2 id="fc-painel-titulo">{est.nome}</h2>
            <p className="fc-janela__sub">Estágio {partida.estagio} de {ESTAGIOS.length} · evolui a cada chefe vencido</p>
            <dl className="fc-numeros">
              <div><dt>Vida</dt><dd>{partida.vida}<small>/{partida.vidaMax}</small></dd></div>
              <div><dt>Ataque extra</dt><dd>+{est.ataque}</dd></div>
              <div><dt>Defesa</dt><dd>−{est.defesa}<small> por golpe</small></dd></div>
              <div><dt>Sequência</dt><dd>{partida.sequencia}<small> (melhor {partida.melhorSequencia})</small></dd></div>
            </dl>
            <p className="fc-janela__nota">Acerto fácil, moderado e difícil causam 10, 20 e 30. O difícil é o crítico. A partir de 3 seguidos, +5 por acerto.</p>
            <h3>Poderes</h3>
            {partida.encaixes.length ? <ul className="fc-lista-efeitos">{partida.encaixes.map((e) => <li key={e.tipo} style={{ ['--cor' as string]: RECOMPENSAS[e.tipo].cor }}><Sprite nome={RECOMPENSAS[e.tipo].icone} className="fc-sprite--icone" /><span><strong>{RECOMPENSAS[e.tipo].nome} ×{e.carga}</strong><small>{RECOMPENSAS[e.tipo].texto} {RECOMPENSAS[e.tipo].detalhe}</small></span></li>)}</ul> : <p className="fc-janela__nota">Nenhum poder equipado.</p>}
            <dl className="fc-numeros">
              <div><dt>Moedas</dt><dd>{partida.ouro}</dd></div>
              <div><dt>Cristais nesta partida</dt><dd>{partida.cristais}</dd></div>
              <div><dt>Curas rendem</dt><dd>{Math.round(desgaste(partida) * 100)}%</dd></div>
            </dl>
            <h3>Relíquias e bênçãos</h3>
            {partida.reliquias.length ? <ul className="fc-lista-efeitos">{[...new Set(partida.reliquias)].map((r) => <li key={r} style={{ ['--cor' as string]: RECOMPENSAS[r].cor }}><Sprite nome={RECOMPENSAS[r].icone} className="fc-sprite--icone" /><span><strong>{RECOMPENSAS[r].nome}{partida.reliquias.filter((x) => x === r).length > 1 ? ` ×${partida.reliquias.filter((x) => x === r).length}` : ''}</strong><small>{RECOMPENSAS[r].texto}</small></span></li>)}</ul> : <p className="fc-janela__nota">Nenhuma relíquia ainda.</p>}
            <h3>Nesta partida</h3>
            <dl className="fc-numeros">
              <div><dt>Acertos</dt><dd>{partida.acertos}<small> de {partida.acertos + partida.erros}</small></dd></div>
              <div><dt>Assistidos</dt><dd>{partida.assistidos}</dd></div>
              <div><dt>Dano sofrido</dt><dd>{partida.danoSofrido}</dd></div>
              <div><dt>Dano evitado</dt><dd>{partida.danoEvitado}</dd></div>
              <div><dt>Cura</dt><dd>{partida.curaTotal}</dd></div>
              <div><dt>Adversários</dt><dd>{partida.derrotados}</dd></div>
            </dl>
          </>
        ) : (
          <>
            <h2 id="fc-painel-titulo">{i.nome}</h2>
            <p className="fc-janela__sub"><em>{i.lema}</em> · {nivel} · andar {partida.andar}</p>
            <dl className="fc-numeros">
              <div><dt>Vida</dt><dd>{partida.inimigo.vida}<small>/{partida.inimigo.vidaMax}</small></dd></div>
              <div><dt>Força</dt><dd>×{at.forca}</dd></div>
              <div><dt>Armadura</dt><dd>{at.armadura}</dd></div>
              {at.barreira > 0 && <div><dt>Barreira</dt><dd>{at.barreira}</dd></div>}
              <div><dt>Crítico</dt><dd>{Math.round(i.critico * 100)}%</dd></div>
              <div><dt>Fúria</dt><dd>{partida.inimigo.furia ? 'ativa' : `em ${Math.max(0, i.paciencia - partida.inimigo.rodadas)}`}</dd></div>
            </dl>
            <h3>Habilidades</h3>
            <ul className="fc-lista-efeitos">
              <li><span><strong>Estilo</strong><small><ComChaves texto={i.habilidade} /></small></span></li>
              {i.porErroSeguido > 0 && <li><span><strong>{i.chefe ? 'Pressão' : 'Veneno'}</strong><small>+{i.porErroSeguido} de dano por erro seguido.</small></span></li>}
              {i.regenera && <li><span><strong>Regeneração</strong><small>Recupera {i.regenera.porRodada} por rodada, até {i.regenera.total} neste confronto (faltam {Math.max(0, i.regenera.total - partida.inimigo.regenerado)}).</small></span></li>}
              {i.rajada && i.rajada > 1 && <li><span><strong>Mordidas</strong><small>O golpe vem em {i.rajada} partes e passa pela Barreira reativa (o Escudo arcano ainda bloqueia).</small></span></li>}
              {i.carrega && <li><span><strong>{i.carrega.nome}</strong><small>A cada {i.carrega.aCada} rodadas, golpe carregado (dano ×{i.carrega.mult}, teto do crítico). O aviso aparece na intenção.</small></span></li>}
              {i.rouba && <li><span><strong>Mão leve</strong><small>No seu erro, rouba 1 carga de um poder equipado.</small></span></li>}
              {i.divide && <li><span><strong>Divisão</strong><small>Uma vez, abaixo de {Math.round(i.divide.abaixoDe * 100)}% da vida, se divide e ganha barreira de {Math.round(i.divide.barreira * 100)}% da vida máxima.</small></span></li>}
              {i.fase2 && <li><span><strong>Segunda fase: {i.fase2.nome}</strong><small>Abaixo de {Math.round(i.fase2.abaixoDe * 100)}% da vida: força ×{i.fase2.forca}, armadura {i.fase2.armadura}{i.fase2.barreira ? `, nova barreira de ${i.fase2.barreira}` : ''}.</small></span></li>}
              <li><span><strong>Fúria</strong><small>Depois de {i.paciencia} rodadas, todo golpe sai ×1,5.</small></span></li>
              <li><span><strong>Teto do golpe</strong><small>Nunca passa de {Math.round(LIMITES[i.nivel] * 100)}% da sua vida máxima ({Math.round(LIMITES.critico * 100)}% no crítico).</small></span></li>
            </ul>
            <h3>Intenção agora</h3>
            <p className="fc-janela__nota">{partida.fase === 'pergunta' ? (intencao.bloqueado ? 'O seu escudo bloqueia o próximo golpe.' : `Se você errar este flashcard: ${intencao.dano} de dano${intencao.critico ? ', golpe crítico' : ''}${intencao.protecoes.length ? `, já contando ${intencao.protecoes.join(' e ')}` : ''}.`) : 'Aguardando o próximo flashcard.'}</p>
          </>
        )}
        <div className="fc-janela__botoes"><button type="button" className="fc-botao" onClick={aoFechar}>Fechar</button></div>
      </div>
    </div>
  )
}

function Recompensas({ partida, aoEscolher, aoEncerrar, rapido }: { partida: Partida; aoEscolher: (r: Recompensa) => void; aoEncerrar: () => void; rapido: boolean }) {
  const chefe = !!inimigoDoAndar(partida.andar, partida.sementeBase, partida.modo).inimigo.chefe
  const proximo = inimigoDoAndar(partida.andar + 1, partida.sementeBase, partida.modo)
  const cheios = partida.encaixes.length >= ENCAIXES
  const [escolhida, definirEscolhida] = useState<Recompensa | null>(null)
  const vivo = useRef(true)
  useEffect(() => { vivo.current = true; return () => { vivo.current = false } }, [])
  const escolher = useCallback((r: Recompensa) => {
    if (escolhida) return
    definirEscolhida(r)
    tocar(['rara', 'epica', 'lendaria'].includes(RECOMPENSAS[r].raridade) ? 'lendario' : 'recompensa')
    window.setTimeout(() => {
      if (!vivo.current) return
      aoEscolher(r)
      // se a escolha não passou (a tela continua aberta), as outras opções voltam a responder
      window.setTimeout(() => { if (vivo.current) definirEscolhida(null) }, 1200)
    }, rapido ? 260 : 720)
  }, [escolhida, aoEscolher, rapido])
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { const k = Number(e.key); if (k >= 1 && k <= partida.recompensas.length) escolher(partida.recompensas[k - 1]) }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [escolher, partida.recompensas])
  const nomeRaridade = { comum: 'Comum', incomum: 'Incomum', rara: 'Rara', epica: 'Épica', lendaria: 'Lendária' } as const
  const nomeTipo = { poder: 'Poder', reliquia: 'Relíquia', evento: 'Evento' } as const
  const pat = partida.categoria === 'bencao' && partida.patronoDaSala ? PATRONOS[partida.patronoDaSala] : null
  return (
    <div className={`fc-veu fc-veu--recompensa${escolhida ? ' fc-veu--escolheu' : ''}`} role="dialog" aria-modal="true" aria-labelledby="fc-rec-titulo">
      <div className="fc-tesouro">
        <span className="fc-tesouro__luz" aria-hidden="true" />
        <header className="fc-tesouro__cabeca">
          <h2 id="fc-rec-titulo">{chefe ? 'Tesouro do chefe' : pat ? `Bênção: ${pat.nome}` : 'Escolha sua recompensa'}</h2>
          <p>Próximo: <b>andar {partida.andar + 1}</b>, {proximo.inimigo.nome}{proximo.inimigo.nivel === 'elite' ? ' (elite)' : proximo.inimigo.chefe ? ' (chefe)' : ''}{proximo.ciclo ? ` · ato ${proximo.ciclo + 1}` : ''}</p>
        </header>
        <div className="fc-recompensas">
          {partida.recompensas.map((r, i) => {
            const d = RECOMPENSAS[r]
            const enc = ehPoder(r) ? partida.encaixes.find((e) => e.tipo === r) : undefined
            const copias = d.tipo === 'reliquia' ? partida.reliquias.filter((x) => x === r).length : enc?.carga ?? 0
            const substitui = ehPoder(r) && !enc && cheios ? RECOMPENSAS[partida.encaixes[0].tipo].nome : null
            const estado = escolhida === r ? ' fc-recompensa--escolhida' : escolhida ? ' fc-recompensa--recua' : ''
            return (
              <button key={r} type="button" className={`fc-recompensa fc-recompensa--${d.tipo} fc-recompensa--${d.raridade}${estado}`} style={{ ['--cor' as string]: d.cor, ['--i' as string]: i }}
                onClick={() => escolher(r)} onPointerEnter={() => { if (!escolhida) tocar('hover') }} autoFocus={i === 0} disabled={!!escolhida && escolhida !== r}>
                {[1, 2, 3, 4].map((k) => <span key={k} className={`fc-recompensa__canto fc-recompensa__canto--${k}`} aria-hidden="true" />)}
                <span className="fc-recompensa__fita">{d.requer ? 'Bênção em dupla' : d.patrono ? 'Bênção' : nomeTipo[d.tipo]} · {nomeRaridade[d.raridade]}</span>
                <span className="fc-recompensa__pedestal"><span className="fc-recompensa__icone"><Sprite nome={d.icone} /></span></span>
                <strong>{d.nome}</strong>
                <span className="fc-recompensa__texto"><ComChaves texto={d.texto} /></span>
                <small className="fc-recompensa__detalhe">{d.detalhe}</small>
                {(d.patrono || d.requer) && <span className="fc-recompensa__patrono">{(d.requer ?? [d.patrono!]).map((x) => <em key={x} style={{ ['--cor' as string]: PATRONOS[x].cor }}><Sprite nome={PATRONOS[x].icone} className="fc-sprite--icone" />{PATRONOS[x].nome}</em>)}</span>}
                {copias > 0 && <small className="fc-recompensa__aviso">Você já tem {d.tipo === 'reliquia' ? `${copias} cópia${copias > 1 ? 's' : ''}` : `${copias} carga${copias > 1 ? 's' : ''}`}</small>}
                {substitui && <small className="fc-recompensa__aviso fc-recompensa__aviso--troca">Encaixes cheios: substitui {substitui}</small>}
                <span className="fc-recompensa__tecla" aria-hidden="true">{i + 1}</span>
              </button>
            )
          })}
        </div>
        {chefe && !escolhida && <button type="button" className="fc-botao fc-botao--secundario fc-tesouro__sair" onClick={aoEncerrar}>Encerrar com a vitória</button>}
      </div>
    </div>
  )
}

function Fim({ partida, aoNova, aoRevisar, aoSair, aoPatamar }: { partida: Partida; aoNova: () => void; aoRevisar: () => void; aoSair: () => void; aoPatamar: () => void }) {
  const total = partida.acertos + partida.erros
  const venceu = partida.venceu
  const derrubaram = partida.derrubaram.map((id) => motor.carta(id))
  const ultimo = inimigoDoAndar(partida.andar, partida.sementeBase, partida.modo).inimigo
  const caiu = partida.vida <= 0
  const torre = partida.modo === 'torre'
  const patamar = torre && caiu ? migrarPartida(ler<unknown>(CHAVE_PATAMAR, null)) : null
  return (
    <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-fim-titulo">
      <div className={`fc-janela fc-janela--larga${venceu ? ' fc-janela--chefe' : ''}`}>
        <h2 id="fc-fim-titulo">{partida.torreConcluida ? 'Você chegou ao topo da Torre!' : caiu ? `Você caiu no andar ${partida.andar}` : `Partida encerrada no andar ${partida.andar}`}</h2>
        {torre && caiu && <p className="fc-janela__nota">{patamar ? `Seu progresso está salvo no patamar do andar ${patamar.andar - 1}: volte de lá com o herói, os poderes e as relíquias que tinha.` : 'Ainda não há patamar salvo: os patamares ficam a cada 5 andares.'}</p>}
        <p className="fc-janela__sub">{caiu ? `${ultimo.nome} levou a melhor desta vez.` : 'Bom descanso, herói.'}{venceu ? ` Você venceu ${partida.chefesDerrotados} chefe${partida.chefesDerrotados > 1 ? 's' : ''} e chegou a ${ESTAGIOS[partida.estagio - 1].nome}.` : ''}</p>
        <dl className="fc-numeros">
          <div><dt>Andar</dt><dd>{partida.andar}</dd></div>
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
          <a className="fc-botao fc-botao--secundario" href={href('/flashcards?opiniao=fim_partida')}>Enviar opinião</a>
          <button type="button" className="fc-botao fc-botao--secundario" onClick={() => navegar('/flashcards/entrada')}>Menu</button>
          <button type="button" className="fc-botao fc-botao--secundario" onClick={aoSair}>Voltar ao site</button>
          {patamar ? (
            <>
              <button type="button" className="fc-botao fc-botao--secundario" onClick={aoNova}>Recomeçar do térreo</button>
              <button type="button" className="fc-botao" onClick={aoPatamar} autoFocus>Voltar ao patamar {patamar.andar - 1}</button>
            </>
          ) : <button type="button" className="fc-botao" onClick={aoNova} autoFocus>{torre ? 'Subir de novo' : 'Nova partida'}</button>}
        </div>
      </div>
    </div>
  )
}
