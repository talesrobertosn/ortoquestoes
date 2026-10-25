import {
  ACESFilmicToneMapping, Box3, BufferGeometry, Color, DirectionalLight, DoubleSide, Group, HemisphereLight, Material, Mesh,
  MeshStandardMaterial, PerspectiveCamera, Plane, Raycaster, SRGBColorSpace, Scene, SphereGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GRUPOS, corDe, grupoDe } from '../config'
import type { Estrutura, Faixa, Grupo, Selecao } from '../tipos'
import { carregarCamada } from './carregador'
import { faixaPorAltura, ehOssoLongo } from '../dados/faixas'

export type Vista = 'anterior' | 'posterior' | 'direita' | 'esquerda' | 'superior' | 'inferior'
export type EixoCorte = 'axial' | 'sagital' | 'coronal'
export interface Corte { eixo: EixoCorte; posicao: number; inverter: boolean }
export interface Passagem { id: string; faixa?: Faixa; x: number; y: number }

/** Direção da câmera para cada vista (Z para cima, esquerda do paciente = +X, anterior = −Y). */
const DIRECOES: Record<Vista, [number, number, number]> = {
  anterior: [0, -1, 0.04], posterior: [0, 1, 0.04], direita: [-1, 0, 0.04], esquerda: [1, 0, 0.04],
  superior: [0.02, -0.08, 1], inferior: [0.02, -0.08, -1],
}
const COR_SELECAO = new Color('#1d8a7f')
const COR_PASSAGEM = new Color('#4fb3a8')

interface Registro { estrutura: Estrutura; grupo: Grupo; malha?: Mesh }
type Estado = 'base' | 'fantasma'

export interface OpcoesMotor {
  aoSelecionar?: (s: Selecao | null) => void
  aoPassar?: (p: Passagem | null) => void
  aoCarregar?: (grupo: Grupo, fracao: number) => void
}

/**
 * Motor do Atlas Ortopédico 3D. Uma malha por estrutura, materiais compartilhados por
 * camada e cor, e renderização sob demanda: a cena só é desenhada quando algo muda
 * (câmera, visibilidade, seleção). Durante o giro a resolução cai um pouco e volta
 * ao parar, para manter a fluidez em aparelhos intermediários.
 */
export class Motor {
  readonly cena = new Scene()
  readonly camera: PerspectiveCamera
  readonly renderer: WebGLRenderer
  readonly controles: OrbitControls
  private raiz = new Group()
  private registros = new Map<string, Registro>()
  private materiais = new Map<string, MeshStandardMaterial>()
  private visiveis: Mesh[] = []
  private ligados = new Set<Grupo>()
  private opacidades = new Map<Grupo, number>()
  private ocultas = new Set<string>()
  private isoladas: Set<string> | null = null
  private regiao: Box3[] | null = null
  private selecao: Selecao | null = null
  private passagem: Passagem | null = null
  private sobreposicao: Mesh | null = null
  private planoCorte: Plane | null = null
  private caixaModelo = new Box3(new Vector3(-300, -150, 0), new Vector3(300, 150, 1750))
  private raycaster = new Raycaster()
  private ponteiro = new Vector2()
  private quadroPendente = 0
  private interagindo = false
  private animacao: { de: [Vector3, Vector3]; para: [Vector3, Vector3]; inicio: number; duracao: number } | null = null
  private pixelRatioPleno: number
  private ultimoClique: { x: number; y: number; ids: string[]; indice: number } | null = null
  private observador: ResizeObserver
  private carregando = new Map<Grupo, Promise<void>>()
  private descartado = false
  /** quadros desenhados (métrica de depuração exposta em window.__atlas3d) */
  quadros = 0

  constructor(private recipiente: HTMLElement, private opcoes: OpcoesMotor = {}) {
    const largura = Math.max(1, recipiente.clientWidth)
    const altura = Math.max(1, recipiente.clientHeight)
    this.camera = new PerspectiveCamera(38, largura / altura, 5, 12000)
    this.camera.up.set(0, 0, 1)
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.pixelRatioPleno = Math.min(window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(this.pixelRatioPleno)
    this.renderer.setSize(largura, altura)
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.localClippingEnabled = true
    this.renderer.domElement.className = 'atlas-canvas'
    recipiente.appendChild(this.renderer.domElement)

    // Luz que acompanha a câmera: a estrutura vista de qualquer ângulo fica bem iluminada.
    this.cena.add(new HemisphereLight(0xf4f1ea, 0x3a3230, 0.9))
    const chave = new DirectionalLight(0xfff4e8, 1.6)
    chave.position.set(-0.4, 0.3, 1)
    const recorte = new DirectionalLight(0xdfe8ff, 0.5)
    recorte.position.set(0.6, -0.2, -0.6)
    this.camera.add(chave, recorte)
    this.cena.add(this.camera, this.raiz)

    this.controles = new OrbitControls(this.camera, this.renderer.domElement)
    this.controles.enableDamping = true
    this.controles.dampingFactor = 0.12
    this.controles.rotateSpeed = 0.75
    this.controles.zoomSpeed = 0.9
    this.controles.screenSpacePanning = true
    this.controles.minDistance = 40
    this.controles.maxDistance = 6000
    this.controles.addEventListener('change', () => this.pedirQuadro())
    this.controles.addEventListener('start', () => { this.interagindo = true; this.animacao = null; this.ajustarResolucao() })
    this.controles.addEventListener('end', () => { this.interagindo = false; this.ajustarResolucao(); this.pedirQuadro() })

    const canvas = this.renderer.domElement
    canvas.addEventListener('pointermove', this.aoMover)
    canvas.addEventListener('pointerdown', this.aoApertar)
    canvas.addEventListener('pointerup', this.aoSoltar)
    canvas.addEventListener('pointerleave', this.aoSair)
    canvas.addEventListener('dblclick', this.aoDuploClique)
    this.observador = new ResizeObserver(() => this.redimensionar())
    this.observador.observe(recipiente)
    ;(window as unknown as { __atlas3d?: Motor }).__atlas3d = this
  }

  // ---------- estruturas e camadas ----------

  registrar(estruturas: Estrutura[]) {
    for (const e of estruturas) this.registros.set(e.id, { estrutura: e, grupo: grupoDe(e) })
    const caixa = new Box3()
    for (const e of estruturas) if (e.k === 'bone') caixa.union(new Box3(new Vector3(e.b[0], e.b[1], e.b[2]), new Vector3(e.b[3], e.b[4], e.b[5])))
    if (!caixa.isEmpty()) this.caixaModelo = caixa
  }

  estrutura(id: string) { return this.registros.get(id)?.estrutura }
  grupoDe(id: string) { return this.registros.get(id)?.grupo }
  grupoLigado(g: Grupo) { return this.ligados.has(g) }

  /** Baixa e monta uma camada (artérias e veias vêm do mesmo arquivo). */
  carregarGrupo(grupo: Grupo): Promise<void> {
    const existente = this.carregando.get(grupo)
    if (existente) return existente
    const def = GRUPOS[grupo]
    const p = carregarCamada(def.camada, arquivoDe(def.camada), (f) => this.opcoes.aoCarregar?.(grupo, f)).then((geos) => {
      if (this.descartado) return
      for (const reg of this.registros.values()) {
        if (reg.grupo !== grupo || reg.malha) continue
        const geo = geos.get(reg.estrutura.id)
        if (!geo) continue
        const malha = new Mesh(geo, this.material(reg, 'base'))
        malha.userData.id = reg.estrutura.id
        malha.renderOrder = grupo === 'osso' ? 0 : 1
        malha.visible = false
        reg.malha = malha
        this.raiz.add(malha)
      }
      this.opcoes.aoCarregar?.(grupo, 1)
    })
    this.carregando.set(grupo, p)
    p.catch(() => this.carregando.delete(grupo))
    return p
  }

  async ligarGrupo(grupo: Grupo, ligado: boolean) {
    if (ligado) { this.ligados.add(grupo); await this.carregarGrupo(grupo) } else this.ligados.delete(grupo)
    this.aplicarVisibilidade()
  }

  definirOpacidade(grupo: Grupo, opacidade: number) {
    this.opacidades.set(grupo, opacidade)
    for (const [chave, mat] of this.materiais) {
      if (!chave.startsWith(`${grupo}|`) || !chave.endsWith('|base')) continue
      mat.opacity = opacidade
      mat.transparent = opacidade < 0.999
      mat.depthWrite = opacidade >= 0.999
      mat.needsUpdate = true
    }
    this.pedirQuadro()
  }
  opacidadeDe(grupo: Grupo) { return this.opacidades.get(grupo) ?? GRUPOS[grupo].opacidade }

  ocultar(id: string) { this.ocultas.add(id); if (this.selecao?.id === id) this.selecionar(null); this.aplicarVisibilidade() }
  mostrarTodas() { this.ocultas.clear(); this.aplicarVisibilidade() }
  get quantasOcultas() { return this.ocultas.size }

  /** Isola as estruturas pedidas; com fantasma, as outras ficam translúcidas em vez de sumir. */
  isolar(ids: string[] | null, fantasma = true) {
    this.isoladas = ids ? new Set(ids) : null
    this.fantasma = fantasma
    this.aplicarVisibilidade()
  }
  private fantasma = true
  get estaIsolado() { return !!this.isoladas }

  /** Restringe a cena a caixas (região ortopédica, uma por lado). null = corpo inteiro. */
  definirRegiao(caixas: Box3[] | null) { this.regiao = caixas?.length ? caixas : null; this.aplicarVisibilidade() }
  private get caixaDaRegiao() { if (!this.regiao) return null; const c = new Box3(); for (const r of this.regiao) c.union(r); return c }

  private dentroDaRegiao(e: Estrutura) {
    if (!this.regiao) return true
    // basta a estrutura cruzar a região: nervos e vasos longos atravessam várias
    return this.regiao.some((r) => e.b[3] >= r.min.x && e.b[0] <= r.max.x && e.b[4] >= r.min.y && e.b[1] <= r.max.y && e.b[5] >= r.min.z && e.b[2] <= r.max.z)
  }

  aplicarVisibilidade() {
    this.visiveis = []
    for (const reg of this.registros.values()) {
      const m = reg.malha
      if (!m) continue
      const id = reg.estrutura.id
      let vis = this.ligados.has(reg.grupo) && !this.ocultas.has(id) && this.dentroDaRegiao(reg.estrutura)
      let estado: Estado = 'base'
      if (vis && this.isoladas && !this.isoladas.has(id)) {
        if (this.fantasma) estado = 'fantasma'
        else vis = false
      }
      m.visible = vis
      m.material = this.material(reg, estado)
      if (vis && estado === 'base') this.visiveis.push(m)
    }
    if (this.selecao && !this.registros.get(this.selecao.id)?.malha?.visible) this.selecionar(null)
    else this.atualizarSobreposicao()
    this.pedirQuadro()
  }

  private material(reg: Registro, estado: Estado) {
    const cor = corDe(reg.estrutura, reg.grupo)
    const chave = `${reg.grupo}|${cor}|${estado}`
    let mat = this.materiais.get(chave)
    if (!mat) {
      const def = GRUPOS[reg.grupo]
      mat = new MeshStandardMaterial({ color: cor, roughness: reg.grupo === 'osso' ? 0.7 : 0.55, metalness: 0.02, side: DoubleSide })
      mat.polygonOffset = true
      mat.polygonOffsetFactor = def.deslocamento
      mat.polygonOffsetUnits = def.deslocamento
      const opacidade = estado === 'fantasma' ? 0.1 : this.opacidadeDe(reg.grupo)
      mat.opacity = opacidade
      mat.transparent = opacidade < 0.999
      mat.depthWrite = opacidade >= 0.999
      if (this.planoCorte) mat.clippingPlanes = [this.planoCorte]
      this.materiais.set(chave, mat)
    }
    return mat
  }

  // ---------- seleção ----------

  selecionar(s: Selecao | null, avisar = true) {
    this.selecao = s
    this.atualizarSobreposicao()
    this.pedirQuadro()
    if (avisar) this.opcoes.aoSelecionar?.(s)
  }
  get selecionada() { return this.selecao }

  /** Destaque desenhado por cima da malha; nos ossos longos, só a faixa (proximal, diáfise, distal). */
  private atualizarSobreposicao() {
    if (this.sobreposicao) { this.raiz.remove(this.sobreposicao); (this.sobreposicao.material as Material).dispose(); this.sobreposicao = null }
    const alvo = this.selecao ?? (this.passagem ? { id: this.passagem.id, faixa: this.passagem.faixa } : null)
    if (!alvo) return
    const reg = this.registros.get(alvo.id)
    if (!reg?.malha?.visible) return
    const ehSelecao = !!this.selecao
    const mat = new MeshStandardMaterial({
      color: ehSelecao ? COR_SELECAO : COR_PASSAGEM, emissive: ehSelecao ? COR_SELECAO : COR_PASSAGEM,
      emissiveIntensity: ehSelecao ? 0.35 : 0.2, roughness: 0.5, side: DoubleSide, transparent: !ehSelecao, opacity: ehSelecao ? 1 : 0.55,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    })
    const planos: Plane[] = []
    if (alvo.faixa && ehOssoLongo(reg.estrutura)) {
      const [z0, z1] = limitesDaFaixa(reg.estrutura, alvo.faixa)
      planos.push(new Plane(new Vector3(0, 0, 1), -z0), new Plane(new Vector3(0, 0, -1), z1))
    }
    if (this.planoCorte) planos.push(this.planoCorte)
    if (planos.length) mat.clippingPlanes = planos
    const malha = new Mesh(reg.malha.geometry, mat)
    malha.renderOrder = 3
    malha.raycast = () => {}
    this.sobreposicao = malha
    this.raiz.add(malha)
  }

  private acertos(evento: PointerEvent | MouseEvent) {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.ponteiro.set(((evento.clientX - r.left) / r.width) * 2 - 1, -((evento.clientY - r.top) / r.height) * 2 + 1)
    this.raycaster.setFromCamera(this.ponteiro, this.camera)
    const lista = this.raycaster.intersectObjects(this.visiveis, false)
    const corte = this.planoCorte
    return corte ? lista.filter((a) => corte.distanceToPoint(a.point) >= 0) : lista
  }

  private faixaNoPonto(id: string, z: number): Faixa | undefined {
    const e = this.registros.get(id)?.estrutura
    return e && ehOssoLongo(e) ? faixaPorAltura(e, z) : undefined
  }

  private inicioToque: { x: number; y: number; t: number } | null = null
  private aoApertar = (ev: PointerEvent) => { this.inicioToque = { x: ev.clientX, y: ev.clientY, t: performance.now() } }
  private aoSoltar = (ev: PointerEvent) => {
    const i = this.inicioToque
    this.inicioToque = null
    if (!i || Math.hypot(ev.clientX - i.x, ev.clientY - i.y) > 6) return // foi arraste, não clique
    const lista = this.acertos(ev)
    const ids = [...new Set(lista.map((a) => a.object.userData.id as string))]
    if (!ids.length) { this.ultimoClique = null; this.selecionar(null); return }
    // clicar de novo no mesmo ponto passa para a estrutura de baixo (útil para o que está encoberto)
    let indice = 0
    const u = this.ultimoClique
    if (u && Math.hypot(ev.clientX - u.x, ev.clientY - u.y) < 6 && u.ids.join() === ids.join()) indice = (u.indice + 1) % ids.length
    this.ultimoClique = { x: ev.clientX, y: ev.clientY, ids, indice }
    const id = ids[indice]
    const ponto = lista.find((a) => a.object.userData.id === id)!.point
    this.selecionar({ id, faixa: this.faixaNoPonto(id, ponto.z) })
  }
  private aoDuploClique = () => { if (this.selecao) this.focar([this.selecao.id], this.selecao.faixa) }
  private ultimoMovimento = 0
  private aoMover = (ev: PointerEvent) => {
    if (ev.pointerType !== 'mouse' || ev.buttons) return
    const agora = performance.now()
    if (agora - this.ultimoMovimento < 45) return
    this.ultimoMovimento = agora
    const a = this.acertos(ev)[0]
    const id = a?.object.userData.id as string | undefined
    const r = this.renderer.domElement.getBoundingClientRect()
    const nova = id ? { id, faixa: this.faixaNoPonto(id, a!.point.z), x: ev.clientX - r.left, y: ev.clientY - r.top } : null
    const mudou = nova?.id !== this.passagem?.id || nova?.faixa !== this.passagem?.faixa
    this.passagem = nova
    this.renderer.domElement.style.cursor = id ? 'pointer' : ''
    if (mudou && !this.selecao) { this.atualizarSobreposicao(); this.pedirQuadro() }
    this.opcoes.aoPassar?.(nova)
  }
  private aoSair = () => { this.passagem = null; this.opcoes.aoPassar?.(null); if (!this.selecao) { this.atualizarSobreposicao(); this.pedirQuadro() } }

  // ---------- câmera ----------

  caixaDe(ids: string[], faixa?: Faixa) {
    const caixa = new Box3()
    for (const id of ids) {
      const e = this.registros.get(id)?.estrutura
      if (!e) continue
      let [z0, z1] = [e.b[2], e.b[5]]
      if (faixa && ehOssoLongo(e)) [z0, z1] = limitesDaFaixa(e, faixa)
      caixa.union(new Box3(new Vector3(e.b[0], e.b[1], z0), new Vector3(e.b[3], e.b[4], z1)))
    }
    return caixa
  }

  /** Enquadra as estruturas (ou a caixa) com animação; mantém a direção atual da câmera. */
  focar(alvo: string[] | Box3, faixa?: Faixa, direcao?: Vector3) {
    const caixa = Array.isArray(alvo) ? this.caixaDe(alvo, faixa) : alvo
    if (caixa.isEmpty()) return
    const centro = caixa.getCenter(new Vector3())
    const tamanho = caixa.getSize(new Vector3())
    const raio = Math.max(tamanho.length() / 2, 30)
    const fov = (this.camera.fov * Math.PI) / 180
    const fovH = 2 * Math.atan(Math.tan(fov / 2) * this.camera.aspect)
    const dist = (raio / Math.sin(Math.min(fov, fovH) / 2)) * 1.25
    const dir = (direcao ?? this.camera.position.clone().sub(this.controles.target)).normalize()
    if (!Number.isFinite(dir.x) || dir.lengthSq() < 0.5) dir.set(0, -1, 0.04).normalize()
    this.animarPara(centro.clone().addScaledVector(dir, dist), centro)
  }

  enquadrarTudo(vista: Vista = 'anterior') { this.focar(this.caixaDaRegiao ?? this.caixaModelo, undefined, new Vector3(...DIRECOES[vista])) }

  vista(v: Vista) {
    const dir = new Vector3(...DIRECOES[v]).normalize()
    const alvo = this.controles.target.clone()
    const dist = this.camera.position.distanceTo(alvo)
    this.animarPara(alvo.clone().addScaledVector(dir, dist), alvo)
  }

  posicionarImediato(caixa?: Box3) {
    const c = caixa ?? this.caixaModelo
    this.focar(c, undefined, new Vector3(...DIRECOES.anterior))
    if (this.animacao) { this.camera.position.copy(this.animacao.para[0]); this.controles.target.copy(this.animacao.para[1]); this.animacao = null }
    this.controles.update()
    this.pedirQuadro()
  }

  private animarPara(posicao: Vector3, alvo: Vector3, duracao = 650) {
    this.animacao = { de: [this.camera.position.clone(), this.controles.target.clone()], para: [posicao, alvo], inicio: performance.now(), duracao }
    this.pedirQuadro()
  }

  // ---------- cortes ----------

  definirCorte(c: Corte | null) {
    if (!c) this.planoCorte = null
    else {
      const b = this.caixaDaRegiao ?? this.caixaModelo
      const eixo = c.eixo === 'axial' ? 'z' : c.eixo === 'sagital' ? 'x' : 'y'
      const valor = b.min[eixo] + (b.max[eixo] - b.min[eixo]) * c.posicao
      const eixoV = new Vector3(eixo === 'x' ? 1 : 0, eixo === 'y' ? 1 : 0, eixo === 'z' ? 1 : 0)
      // o three mantém os pontos com n·p + d ≥ 0: sem inverter fica o que está abaixo do valor, invertido o que está acima
      this.planoCorte = c.inverter ? new Plane(eixoV, -valor) : new Plane(eixoV.clone().negate(), valor)
    }
    for (const m of this.materiais.values()) { m.clippingPlanes = this.planoCorte ? [this.planoCorte] : null; m.needsUpdate = true }
    this.atualizarSobreposicao()
    this.pedirQuadro()
  }

  // ---------- quadro a quadro ----------

  pedirQuadro() {
    if (this.quadroPendente || this.descartado) return
    this.quadroPendente = requestAnimationFrame(this.quadro)
  }

  private quadro = (agora: number) => {
    this.quadroPendente = 0
    let continuar = false
    if (this.animacao) {
      const a = this.animacao
      const t = Math.min(1, (agora - a.inicio) / a.duracao)
      const e = 1 - Math.pow(1 - t, 3)
      this.camera.position.lerpVectors(a.de[0], a.para[0], e)
      this.controles.target.lerpVectors(a.de[1], a.para[1], e)
      if (t >= 1) this.animacao = null
      continuar = true
    }
    if (this.controles.update()) continuar = true
    this.renderer.render(this.cena, this.camera)
    this.quadros++
    if (continuar) this.pedirQuadro()
  }

  private ajustarResolucao() {
    const alvo = this.interagindo ? Math.max(1, this.pixelRatioPleno * 0.7) : this.pixelRatioPleno
    if (Math.abs(this.renderer.getPixelRatio() - alvo) > 0.01) this.renderer.setPixelRatio(alvo)
  }

  private margens = { direita: 0, inferior: 0 }
  /** Área coberta por painéis (ficha à direita, gaveta embaixo): o centro da cena vai para o espaço livre. */
  definirMargens(direita: number, inferior: number) {
    if (Math.abs(direita - this.margens.direita) < 1 && Math.abs(inferior - this.margens.inferior) < 1) return
    this.margens = { direita, inferior }
    this.redimensionar()
  }

  private redimensionar() {
    const w = Math.max(1, this.recipiente.clientWidth)
    const h = Math.max(1, this.recipiente.clientHeight)
    const { direita, inferior } = this.margens
    this.camera.aspect = (w + direita) / (h + inferior)
    if (direita || inferior) this.camera.setViewOffset(w + direita, h + inferior, direita, inferior, w, h)
    else this.camera.clearViewOffset()
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this.pedirQuadro()
  }

  /** Posição na tela de um ponto do modelo (para rótulos e pontos anatômicos). */
  naTela(p: Vector3) {
    const v = p.clone().project(this.camera)
    const r = this.renderer.domElement
    return { x: ((v.x + 1) / 2) * r.clientWidth, y: ((1 - v.y) / 2) * r.clientHeight, atras: v.z > 1 }
  }

  /** Pequenas esferas nos pontos anatômicos do osso selecionado. */
  private marcadores: Mesh[] = []
  mostrarPontos(pontos: Vector3[]) {
    for (const m of this.marcadores) this.raiz.remove(m)
    this.marcadores = []
    if (!pontos.length) { this.pedirQuadro(); return }
    const geo = new SphereGeometry(2.6, 12, 8)
    const mat = new MeshStandardMaterial({ color: 0x0f4f49, emissive: 0x14655e, emissiveIntensity: 0.4, depthTest: true })
    for (const p of pontos) {
      const m = new Mesh(geo, mat)
      m.position.copy(p)
      m.renderOrder = 4
      m.raycast = () => {}
      this.marcadores.push(m)
      this.raiz.add(m)
    }
    this.pedirQuadro()
  }

  descartar() {
    this.descartado = true
    cancelAnimationFrame(this.quadroPendente)
    this.observador.disconnect()
    const c = this.renderer.domElement
    c.removeEventListener('pointermove', this.aoMover)
    c.removeEventListener('pointerdown', this.aoApertar)
    c.removeEventListener('pointerup', this.aoSoltar)
    c.removeEventListener('pointerleave', this.aoSair)
    c.removeEventListener('dblclick', this.aoDuploClique)
    this.controles.dispose()
    const geos = new Set<BufferGeometry>()
    this.raiz.traverse((o) => { const m = o as Mesh; if (m.isMesh) geos.add(m.geometry) })
    for (const g of geos) g.dispose() // libera só a GPU: a geometria segue no cache do módulo para a próxima visita
    for (const m of this.materiais.values()) m.dispose()
    this.renderer.dispose()
    c.remove()
    const w = window as unknown as { __atlas3d?: Motor }
    if (w.__atlas3d === this) delete w.__atlas3d
  }
}

function arquivoDe(camada: string) {
  const mapa: Record<string, string> = {
    bone: 'bones.glb', muscle: 'muscles.glb', connective: 'connective.glb', fascia: 'fascia.glb', nerve: 'nerves.glb',
    vessel: 'vessels.glb', lymph: 'lymph.glb', organ: 'organs.glb', brain: 'brain.glb', tooth: 'teeth.glb',
  }
  return mapa[camada]
}

export function limitesDaFaixa(e: Estrutura, faixa: Faixa): [number, number] {
  const z0 = e.b[2], z1 = e.b[5], h = z1 - z0
  // osso longo em posição anatômica: proximal em cima (Z maior)
  if (faixa === 'proximal') return [z1 - h * 0.28, z1 + 1]
  if (faixa === 'distal') return [z0 - 1, z0 + h * 0.28]
  return [z0 + h * 0.28, z1 - h * 0.28]
}
