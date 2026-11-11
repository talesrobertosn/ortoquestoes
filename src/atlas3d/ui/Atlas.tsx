import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Motor, type Corte, type EixoCorte, type Passagem, type Vista } from '../motor/Motor'
import { carregarAreas, carregarArvore, carregarCatalogo, carregarNomesTa2, carregarPontos } from '../motor/carregador'
import { GRUPOS, ORDEM_GRUPOS, grupoDe } from '../config'
import type { Arvore, Catalogo, Estrutura, Grupo, Ponto, Selecao } from '../tipos'
import { REGIOES, REGIOES_CORPO, caixasDaRegiao, regiaoPorId, type Lateralidade } from '../dados/regioes'
import { nomeCompleto, nomeDe, registrarNomes, registrarNomesTa2 } from '../dados/nomes'
import { fichaDe, carregarVinculos, type Vinculo } from '../dados/fichas'
import { buscar } from '../dados/busca'
import { Icone } from '../../componentes/Icone'
import { usarTelaLarga } from '../../componentes/JanelaCentral'
import { usarArmazenado } from '../../estado/usarArmazenado'
import { navegar } from '../../util/rotas'
import { PainelFicha } from './PainelFicha'
import { PainelQuestoes } from './PainelQuestoes'
import { EsperaPixel } from '../../componentes/EsperaPixel'
import { usarConta } from '../../conta/ContextoConta'
import { usarPremium } from '../../conta/premium'
import { ConviteAtlas, type TipoConvite } from './ConviteAtlas'
import { GuiaControles } from './GuiaControles'
import { CartaoRapido } from './CartaoRapido'
import { ModalDetalhes } from './ModalDetalhes'
import { FichaAnatomica, FixacoesDoOsso } from './FichaAnatomica'
import { baseDoId, carregarAnatomia, idNoLado, registroDaEstrutura, type IndiceAnatomico } from '../dados/anatomia'
import { CORES_RELACAO, areasDoMusculo, areasNoOsso, fixadosNoOsso, idsDoRegistro, indexarAreas, indexarPontos, marcosNoOsso, montarAreas, montarRelacoes, relacionadosDe, type IndiceAreas, type Mundo, type Relacao } from '../dados/relacoes'
import { AreasDoOsso, FichaGeral, Trilha } from './FichaGeral'
import { faixaPorAltura } from '../dados/faixas'
import { CORES_PRESET, PRESETS, type Preset } from '../dados/presets'
import { GRUPOS_DO_MODO, SISTEMAS, SO_CORPO, caminhoDoNo, indexarArvore, nosDoSistema, type Modo, type Sistema } from '../dados/modos'
import { PainelExplorar } from './PainelExplorar'
import { Navegador } from './Navegador'
import type { TemaEstudo } from '../dados/temasEstudo'
import { Rotulos } from './Rotulos'
import { hex } from './cor'
import '../../estilos/paginas/Atlas3D.css'

// o Teste-se (e a lista de grupos) só baixa quando a pessoa abre: o atlas abre mais leve
const ModoEstudo = lazy(() => import('./ModoEstudo').then((m) => ({ default: m.ModoEstudo })))

/** Na conta grátis: ossos e músculos. O resto, para assinantes (aparece por alguns segundos e convida). */
const GRATIS = new Set<Grupo>(['osso', 'musculo'])
const PREVIA_MS = 3000
interface Preferencias { recentes: string[]; favoritos: string[]; dicasVistas: boolean; rotulos?: boolean }
const PREF_PADRAO: Preferencias = { recentes: [], favoritos: [], dicasVistas: false }
/** Um sistema aberto (ou uma parte dele): os nós da hierarquia e como mostrar. */
interface Aberto { nos: number[]; titulo: string; cor?: string; sistema?: string }

/**
 * Atlas 3D. Abre como pop-up por cima do site (como os flashcards) e também pelo endereço
 * #/atlas/<região>?e=<estrutura>&f=<faixa>&lado=d|e&m=corpo. Dois modos: Ortopedia (a casa) e Corpo inteiro.
 */
export function Atlas({ segmentos, consulta, aoFechar }: { segmentos: string[]; consulta: URLSearchParams; aoFechar: () => void }) {
  const palco = useRef<HTMLDivElement>(null)
  const motorRef = useRef<Motor | null>(null)
  const larga = usarTelaLarga('56rem')
  const [catalogo, definirCatalogo] = useState<Catalogo | null>(null)
  const [erro, definirErro] = useState<string | null>(null)
  const [progresso, definirProgresso] = useState<Record<string, number>>({})
  const [ligados, definirLigados] = useState<Set<Grupo>>(() => new Set(lerCamadas(consulta)))
  const [selecao, definirSelecao] = useState<Selecao | null>(null)
  // o nome sob o cursor vive num componente à parte: passar o mouse não redesenha o atlas inteiro
  const avisarPassagem = useRef<((p: Passagem | null) => void) | null>(null)
  const registrarPassagem = useCallback((f: ((p: Passagem | null) => void) | null) => { avisarPassagem.current = f }, [])
  const [regiaoId, definirRegiaoId] = useState<string | null>(segmentos[1] ?? null)
  const [lado, definirLado] = useState<Lateralidade>((consulta.get('lado') as Lateralidade) || 'ambos')
  // no celular o modelo vem primeiro: as regiões ficam no botão do topo
  const [explorar, definirExplorar] = useState(() => window.matchMedia('(min-width: 56rem)').matches && !consulta.get('e'))
  const [personalizar, definirPersonalizar] = useState(false)
  const [questoes, definirQuestoes] = useState<{ titulo: string; ids: string[] } | null>(null)
  // detalhes: no computador, o painel lateral aberto (ou recolhido no cartão); no celular, o modal
  const [detalhes, definirDetalhes] = useState(() => window.matchMedia('(min-width: 56rem)').matches)
  // estruturas vistas nesta visita, para voltar e avançar sem procurar de novo
  const trilha = useRef<Selecao[]>([])
  const [posTrilha, definirPosTrilha] = useState(-1)
  const andandoNaTrilha = useRef(false)
  const [busca, definirBusca] = useState('')
  const [corte, definirCorteUI] = useState<Corte | null>(null)
  const [vinculos, definirVinculos] = useState<Record<string, Vinculo> | null>(null)
  const [isolado, definirIsolado] = useState(false)
  const [pref, definirPref] = usarArmazenado<Preferencias>('atlas3d:preferencias', PREF_PADRAO)
  // sempre abre na Ortopedia (Tales, 11/11/2026); o Corpo inteiro de entrada só por link que peça (m=corpo)
  const [modo, definirModo] = useState<Modo>(() => (consulta.get('m') === 'corpo' ? 'corpo' : 'ortopedia'))
  const { sessao } = usarConta()
  const { premium } = usarPremium()
  const nivel: 'visitante' | 'conta' | 'assinante' = !sessao ? 'visitante' : premium ? 'assinante' : 'conta'
  const [convite, definirConvite] = useState<TipoConvite | null>(null)
  const [guia, definirGuia] = useState(false)
  const [aviso, definirAviso] = useState<string | null>(null)
  // banco anatômico e pontos do modelo: baixados uma vez, quando o atlas abre
  const [indice, definirIndice] = useState<IndiceAnatomico | null>(null)
  const [pontos, definirPontos] = useState<Map<string, Ponto> | null>(null)
  const [ativas, definirAtivas] = useState<Set<Relacao>>(new Set())
  const [contexto, definirContexto] = useState(false)
  const [pontosOsso, definirPontosOsso] = useState(false)
  const [preset, definirPreset] = useState<Preset | null>(null)
  const [aberto, definirAberto] = useState<Aberto | null>(null)
  const [estudo, definirEstudo] = useState(false)
  // atalho do Explorar: o Teste-se já abre num grupo (manguito, plexo braquial...)
  const [temaEstudo, definirTemaEstudo] = useState<string | null>(null)
  // do Z-Anatomy: áreas de origem e inserção, hierarquia (sistema › parte) e nomes da TA2
  const [idxAreas, definirIdxAreas] = useState<IndiceAreas | null>(null)
  const [arvore, definirArvore] = useState<Arvore | null>(null)
  const [, definirNomesTa2] = useState(false)
  const toque = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const previa = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (previa.current) clearTimeout(previa.current) }, [])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => definirAviso(null), 2600); return () => clearTimeout(t) }, [aviso])

  const motor = motorRef.current
  const regiao = regiaoPorId(regiaoId)
  const estrutura = selecao && catalogo ? catalogo.estruturas.find((e) => e.id === selecao.id) : undefined
  const idxArvore = useMemo(() => (arvore && catalogo ? indexarArvore(arvore, catalogo.estruturas) : null), [arvore, catalogo])

  // ---------- montar o motor ----------
  useEffect(() => {
    if (!palco.current) return
    const m = new Motor(palco.current, {
      aoSelecionar: (s) => definirSelecao(s),
      aoPassar: (p) => avisarPassagem.current?.(p),
      aoCarregar: (g, f) => definirProgresso((atual) => ({ ...atual, [g]: f })),
    })
    motorRef.current = m
    let vivo = true
    carregarCatalogo().then(async (cat) => {
      if (!vivo) return
      m.registrar(cat.estruturas)
      definirCatalogo(cat)
      const iniciais = lerCamadas(consulta)
      await Promise.all(iniciais.map((g) => m.ligarGrupo(g, true)))
      if (!vivo) return
      const r = regiaoPorId(segmentos[1])
      const ladoInicial = (consulta.get('lado') as Lateralidade) || 'ambos'
      if (r) m.definirRegiao(caixasDaRegiao(r, ladoInicial))
      m.posicionarImediato(r ? m.caixaDe([]).union(caixasDaRegiao(r, ladoInicial).reduce((a, b) => a.union(b))) : undefined)
      const e = consulta.get('e')
      const alvo = e ? cat.estruturas.find((x) => x.id === e) : undefined
      if (alvo) {
        // link direto: liga a camada grátis; camadas de assinante entram pelo efeito do plano (abaixo)
        const g = grupoDe(alvo)
        // link de um órgão (ou outra camada do corpo inteiro): é o único caso em que o atlas abre fora da Ortopedia
        if (SO_CORPO.has(g)) definirModo('corpo')
        if (!iniciais.includes(g) && GRATIS.has(g)) { definirLigados((atual) => new Set([...atual, g])); await m.ligarGrupo(g, true) }
        if (!vivo) return
        const f = (consulta.get('f') as Selecao['faixa']) || undefined
        m.selecionar({ id: alvo.id, faixa: f })
        m.focar([alvo.id], f)
      }
    }).catch(() => vivo && definirErro('Não foi possível abrir o atlas. Verifique a conexão e tente de novo.'))
    carregarVinculos().then((v) => vivo && definirVinculos(v)).catch(() => {})
    carregarAnatomia().then((a) => {
      // nomes do banco valem como nome em português onde o catálogo ainda não tem tradução (artérias, por exemplo);
      // só para registro de uma malha, para não dar o nome do grupo a cada parte
      registrarNomes(Object.fromEntries(a.registros.filter((r) => r.ids.length === 1).map((r) => [r.ids[0], r.nome])))
      if (vivo) definirIndice(a)
    }).catch(() => {})
    carregarPontos().then((p) => vivo && definirPontos(indexarPontos(p))).catch(() => {})
    carregarNomesTa2().then((n) => { registrarNomesTa2(n); if (vivo) definirNomesTa2(true) }).catch(() => {})
    carregarAreas().then((a) => vivo && definirIdxAreas(indexarAreas(a))).catch(() => {})
    carregarArvore().then((a) => vivo && definirArvore(a)).catch(() => {})
    return () => { vivo = false; m.descartar(); motorRef.current = null }
    // monta uma vez; o resto do estado conversa com o motor pelos efeitos abaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // link direto para uma estrutura de camada de assinante (órgão, vaso…): quem assina já chega com a camada ligada
  useEffect(() => {
    const m = motorRef.current
    if (!m || !estrutura || nivel !== 'assinante') return
    const g = grupoDe(estrutura)
    if (!ligados.has(g)) { definirLigados((a) => new Set([...a, g])); m.ligarGrupo(g, true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estrutura?.id, nivel])

  // aberto já no Corpo inteiro (link ou último modo usado): quem assina chega vendo os órgãos
  const orgaosIniciais = useRef(false)
  useEffect(() => {
    if (orgaosIniciais.current || !catalogo || modo !== 'corpo' || nivel !== 'assinante') return
    orgaosIniciais.current = true
    if (!ligados.has('orgao')) mudarGrupoRef.current?.('orgao', true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogo, modo, nivel])
  const mudarGrupoRef = useRef<((g: Grupo, ligar: boolean) => void) | null>(null)

  // ---------- endereço: o que está aberto vira link ----------
  const endereco = useCallback((extra?: (q: URLSearchParams) => void, regiaoNova: string | null = regiaoId) => {
    const q = new URLSearchParams()
    if (selecao) { q.set('e', selecao.id); if (selecao.faixa) q.set('f', selecao.faixa) }
    if (lado !== 'ambos' && regiaoNova) q.set('lado', lado)
    if (modo === 'corpo') q.set('m', 'corpo')
    extra?.(q)
    const s = q.toString()
    return `/atlas${regiaoNova ? `/${regiaoNova}` : ''}${s ? `?${s}` : ''}`
  }, [selecao, lado, modo, regiaoId])

  // ---------- seleção → ficha, endereço, recentes ----------
  useEffect(() => {
    if (!selecao) { definirQuestoes(null); if (!larga) definirDetalhes(false); navegar(endereco(), true); return }
    if (andandoNaTrilha.current) andandoNaTrilha.current = false
    else {
      const atual = trilha.current[posTrilha]
      if (!atual || atual.id !== selecao.id || atual.faixa !== selecao.faixa) {
        trilha.current = [...trilha.current.slice(0, posTrilha + 1), selecao].slice(-30)
        definirPosTrilha(trilha.current.length - 1)
      }
    }
    definirPref((p) => ({ ...p, recentes: [selecao.id, ...p.recentes.filter((r) => r !== selecao.id)].slice(0, 12) }))
    definirQuestoes(null)
    navegar(endereco(), true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecao?.id, selecao?.faixa])

  // ---------- margens da câmera: o modelo fica no espaço que os painéis deixam livre ----------
  useEffect(() => {
    const m = motorRef.current
    if (!m) return
    const raiz = palco.current?.parentElement
    const medir = () => {
      // no celular, o modal fica por cima sem mexer na câmera: só o cartão compacto conta
      if (!larga && detalhes) return
      const ficha = raiz?.querySelector<HTMLElement>('.atlas__ficha')
      const cartao = raiz?.querySelector<HTMLElement>('.at-rapido, .at-estudo, .at-nav')
      const direita = larga && ficha ? ficha.offsetWidth * 0.55 : 0
      // o Teste-se fica embaixo, no meio, também no computador: o alvo aparece acima dele
      const conta = cartao && (!larga || cartao.classList.contains('at-estudo'))
      const inferior = conta ? Math.min(cartao.offsetHeight, (raiz?.clientHeight ?? 0) * 0.46) * 0.85 : 0
      m.definirMargens(direita, inferior)
    }
    medir()
    const t = setTimeout(medir, 260) // depois da transição de entrada do cartão e do painel
    // o painel do Teste-se muda de altura (escolha do grupo, pergunta, resposta)
    const painel = raiz?.querySelector<HTMLElement>('.at-estudo')
    const obs = painel && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    if (painel) obs?.observe(painel)
    return () => { clearTimeout(t); obs?.disconnect() }
  }, [estrutura?.id, larga, detalhes, questoes, estudo, aberto])

  // ---------- camadas e plano ----------
  /** Liga ou desliga uma camada respeitando o plano: sem conta, convida a criar a conta;
   * na conta grátis, camada de assinante aparece por alguns segundos e depois convida. */
  const mudarGrupo = useCallback(async (g: Grupo, ligar: boolean, depois?: () => void) => {
    const m = motorRef.current
    if (!m) return
    if (nivel === 'visitante' && !(ligar && g === 'osso')) { definirConvite({ tipo: 'conta' }); return }
    definirLigados((atual) => { const novo = new Set(atual); if (ligar) novo.add(g); else novo.delete(g); return novo })
    await m.ligarGrupo(g, ligar)
    depois?.()
    if (ligar && nivel === 'conta' && !GRATIS.has(g)) {
      if (previa.current) clearTimeout(previa.current)
      previa.current = setTimeout(() => {
        definirConvite({ tipo: 'assinante', grupo: g })
        definirLigados((atual) => { const novo = new Set(atual); novo.delete(g); return novo })
        motorRef.current?.ligarGrupo(g, false)
      }, PREVIA_MS)
    }
  }, [nivel])
  mudarGrupoRef.current = mudarGrupo
  const alternarGrupo = useCallback((g: Grupo) => mudarGrupo(g, !ligados.has(g)), [ligados, mudarGrupo])
  const podeLigar = (g: Grupo) => nivel === 'assinante' || (nivel === 'conta' && GRATIS.has(g))
  const fechado = (g: Grupo) => nivel !== 'assinante' && !GRATIS.has(g)

  // ---------- regiões ----------
  const escolherRegiao = useCallback((id: string | null, novoLado: Lateralidade = lado) => {
    const m = motorRef.current
    if (!m) return
    const r = regiaoPorId(id)
    definirRegiaoId(id)
    definirLado(novoLado)
    const caixas = r ? caixasDaRegiao(r, novoLado) : null
    m.definirRegiao(caixas)
    m.selecionar(null)
    if (caixas) m.focar(caixas.reduce((a, b) => a.clone().union(b)), undefined)
    else m.enquadrarTudo()
    if (r?.vista) setTimeout(() => m.vista(r.vista!), 700)
    const q = new URLSearchParams()
    if (novoLado !== 'ambos' && id) q.set('lado', novoLado)
    if (modo === 'corpo') q.set('m', 'corpo')
    navegar(`/atlas${id ? `/${id}` : ''}${q.toString() ? `?${q}` : ''}`, true)
    if (!larga) definirExplorar(false)
  }, [lado, larga, modo])

  // ---------- isolamentos: visualização pronta, sistema aberto, relações ----------
  const soltarIsolamento = useCallback(() => {
    motorRef.current?.isolar(null)
    definirIsolado(false); definirPreset(null); definirAberto(null); definirContexto(false)
  }, [])

  /** Abre um sistema ou uma parte dele: liga as camadas, isola e enquadra. Quem não assina recebe o convite. */
  const abrir = useCallback(async (a: Aberto) => {
    const m = motorRef.current
    if (!m || !idxArvore) return
    const ids = [...new Set(a.nos.flatMap((n) => idxArvore.ids.get(n) ?? []))]
    const grupos = [...new Set(ids.map((id) => m.grupoDe(id)).filter(Boolean) as Grupo[])]
    const travado = grupos.find((g) => !podeLigar(g))
    if (travado && nivel !== 'conta') { definirConvite(nivel === 'visitante' ? { tipo: 'conta' } : { tipo: 'assinante', grupo: travado }); return }
    definirPreset(null); definirContexto(false)
    m.selecionar(null)
    // região de membro escondia o tronco: o sistema mostra onde ele estiver
    if (regiaoId) { definirRegiaoId(null); m.definirRegiao(null) }
    definirAberto(a)
    m.isolar(ids)
    definirIsolado(true)
    await Promise.all(grupos.filter((g) => !ligados.has(g)).map((g) => mudarGrupo(g, true)))
    const visiveis = ids.filter((id) => m.estaVisivel(id))
    if (visiveis.length) m.focar(visiveis)
    // o navegador do sistema assume o lugar do Explorar (o nome do sistema fica no botão do topo)
    definirExplorar(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idxArvore, ligados, mudarGrupo, nivel, regiaoId, larga])
  const abrirSistema = (s: Sistema) => { if (!idxArvore) return; abrir({ nos: nosDoSistema(idxArvore, s), titulo: s.nome, cor: s.cor, sistema: s.id }) }
  const abrirNo = (no: number) => {
    if (!idxArvore) return
    const raiz = caminhoDoNo(idxArvore, no)[0]
    const s = SISTEMAS.find((x) => nosDoSistema(idxArvore, x).some((n) => caminhoDoNo(idxArvore, no).includes(n)))
    abrir({ nos: [no], titulo: idxArvore.arvore.n[no][0], cor: s?.cor, sistema: s?.id ?? String(raiz) })
  }

  // ---------- modo ----------
  const trocarModo = useCallback((novo: Modo) => {
    const m = motorRef.current
    if (!m || novo === modo) return
    definirModo(novo)
    soltarIsolamento()
    m.selecionar(null)
    if (novo === 'ortopedia') {
      // as camadas do corpo inteiro saem; a região do tronco volta ao corpo todo
      for (const g of ligados) if (SO_CORPO.has(g)) { m.ligarGrupo(g, false) }
      definirLigados((a) => new Set([...a].filter((g) => !SO_CORPO.has(g))))
      if (regiaoId && REGIOES_CORPO.some((r) => r.id === regiaoId)) { definirRegiaoId(null); m.definirRegiao(null) }
      m.enquadrarTudo()
    } else {
      if (regiaoId && REGIOES.some((r) => r.id === regiaoId)) { definirRegiaoId(null); m.definirRegiao(null) }
      m.enquadrarTudo()
      // quem assina já entra vendo os órgãos no lugar
      if (nivel === 'assinante' && !ligados.has('orgao')) mudarGrupo('orgao', true)
    }
    if (larga) definirExplorar(true)
    const q = new URLSearchParams()
    if (novo === 'corpo') q.set('m', 'corpo')
    navegar(`/atlas${q.toString() ? `?${q}` : ''}`, true)
  }, [modo, ligados, regiaoId, nivel, larga, mudarGrupo, soltarIsolamento])

  // ---------- ações da seleção ----------
  const focarSelecao = () => { if (selecao) motorRef.current?.focar([selecao.id], selecao.faixa) }
  const isolarSelecao = () => {
    const m = motorRef.current
    if (!m || !selecao) return
    if (m.estaIsolado) soltarIsolamento()
    else { definirAberto(null); definirPreset(null); m.isolar([selecao.id]); definirIsolado(true); m.focar([selecao.id], selecao.faixa) }
  }
  const ocultarSelecao = () => { if (selecao) motorRef.current?.ocultar(selecao.id) }
  /**
   * Voltar ao início (Tales, 11/11/2026): o atlas como abriu, no modo atual. Sai do Teste-se, solta o isolamento e a
   * visualização pronta, mostra o que foi escondido, tira o corte, a seleção e o recorte de região e enquadra de frente.
   * As camadas ligadas ficam como estão (são escolha da pessoa, e ligar de novo custa download).
   */
  const voltarAoInicio = () => {
    const m = motorRef.current
    if (!m) return
    definirEstudo(false)
    soltarIsolamento()
    m.mostrarTodas()
    m.definirCorte(null); definirCorteUI(null)
    m.selecionar(null)
    definirAtivas(new Set()); definirPontosOsso(false)
    definirRegiaoId(null); definirLado('ambos'); m.definirRegiao(null)
    definirPersonalizar(false)
    if (!larga) definirExplorar(false)
    m.enquadrarTudo('anterior')
    navegar(`/atlas${modo === 'corpo' ? '?m=corpo' : ''}`, true)
  }
  const foraDoInicio = !!(selecao || isolado || preset || aberto || corte || regiaoId || estudo || motor?.quantasOcultas)
  const alternarFavorito = () => { if (!selecao) return; definirPref((p) => ({ ...p, favoritos: p.favoritos.includes(selecao.id) ? p.favoritos.filter((f) => f !== selecao.id) : [selecao.id, ...p.favoritos] })) }

  const irPara = (e: Estrutura) => {
    const m = motorRef.current
    if (!m) return
    const g = grupoDe(e)
    const continuar = () => { m.selecionar({ id: e.id }); m.focar([e.id]) }
    // a estrutura pode estar fora da região atual ou numa camada desligada; ir para um órgão leva ao Corpo inteiro
    if (regiao && !caixasDaRegiao(regiao, lado).some((c) => c.intersectsBox(m.caixaDe([e.id])))) { definirRegiaoId(null); m.definirRegiao(null) }
    if (modo === 'ortopedia' && !ehOrtopedica(e)) definirModo('corpo')
    if (!ligados.has(g)) mudarGrupo(g, true, continuar); else continuar()
    definirBusca('')
    if (!larga) definirExplorar(false)
  }

  const mudarCorte = (c: Corte | null) => { definirCorteUI(c); motorRef.current?.definirCorte(c) }

  // ---------- ferramentas ----------
  const salvarImagem = () => {
    const m = motorRef.current
    if (!m) return
    const dados = m.capturarImagem()
    const img = new Image()
    img.onload = () => {
      // fundo claro e assinatura discreta: a imagem serve para slide e resumo
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      const g = c.getContext('2d')!
      const escuro = document.documentElement.dataset.tema === 'escuro'
      g.fillStyle = escuro ? '#101a19' : '#f4f6f4'
      g.fillRect(0, 0, c.width, c.height)
      g.drawImage(img, 0, 0)
      const k = Math.max(1, c.width / 1200)
      g.font = `600 ${Math.round(14 * k)}px system-ui, sans-serif`
      g.fillStyle = escuro ? 'rgba(230,251,245,0.7)' : 'rgba(18,24,26,0.55)'
      g.textAlign = 'right'
      const nome = estrutura ? `${nomeCompleto(estrutura, selecao?.faixa)} · ` : ''
      g.fillText(`${nome}Atlas 3D · Orto Questões`, c.width - 16 * k, c.height - 16 * k)
      const a = document.createElement('a')
      a.href = c.toDataURL('image/png')
      a.download = `atlas3d-${(estrutura ? nomeDe(estrutura) : 'vista').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}.png`
      a.click()
      definirAviso('Imagem salva')
    }
    img.src = dados
  }
  const copiarLink = async () => {
    try { await navigator.clipboard.writeText(location.href); definirAviso('Link copiado: quem abrir vê esta mesma estrutura') } catch { definirAviso('Não deu para copiar o link aqui') }
  }

  // ---------- busca ----------
  // nomes do banco anatômico entram na busca ("Deltoide", "Ligamento de Lisfranc", "LCA")
  const extrasBusca = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const r of indice?.registros ?? []) for (const id of r.ids) m.set(id, [...(m.get(id) ?? []), r.nome, r.en])
    return m
  }, [indice])
  const todosResultados = useMemo(() => (catalogo && busca.trim().length >= 2 ? buscar(catalogo.estruturas, busca, 60, extrasBusca) : []), [catalogo, busca, extrasBusca])
  // estruturas que o banco põe numa região ortopédica (medula, raízes, cauda equina) contam como Ortopedia
  const ortoPeloBanco = useMemo(() => {
    const regioesOrto = new Set<string>(REGIOES.map((r) => r.id))
    return new Set((indice?.registros ?? []).filter((r) => regioesOrto.has(r.regiao)).flatMap((r) => r.ids))
  }, [indice])
  const ehOrtopedica = (e: Estrutura) => !SO_CORPO.has(grupoDe(e)) || ortoPeloBanco.has(baseDoId(e.id))
  const doModo = (e: Estrutura) => modo === 'corpo' || ehOrtopedica(e)
  const resultados = todosResultados.filter(doModo).slice(0, 30)
  const noOutroModo = modo === 'ortopedia' ? todosResultados.filter((e) => !doModo(e)).length : 0
  const normalBusca = busca.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const regioesAchadas = normalBusca.length >= 2 ? (modo === 'corpo' ? [...REGIOES_CORPO, ...REGIOES] : REGIOES).filter((r) => semAcento(r.nome).includes(normalBusca)) : []
  const presetsAchados = normalBusca.length >= 2 ? PRESETS.filter((p) => semAcento(`${p.nome} ${p.resumo}`).includes(normalBusca)) : []
  const ficha = estrutura ? fichaDe(estrutura, selecao?.faixa) : undefined
  const vinculo = ficha && vinculos ? vinculos[ficha.chave] : undefined
  const carregando = ORDEM_GRUPOS.filter((g) => ligados.has(g) && (progresso[g] ?? 0) < 1)
  // O que está aberto, para o "online agora" do painel do administrador (conta/aparelho.ts lê ao mandar o sinal).
  useEffect(() => {
    const e = selecao && catalogo ? catalogo.estruturas.find((x) => x.id === selecao.id) : undefined
    const vendo = questoes ? `respondendo: ${questoes.titulo}` : estudo ? 'Teste-se' : e ? nomeCompleto(e, selecao?.faixa) : ''
    try { if (vendo) sessionStorage.setItem('oq-atlas-vendo', vendo.slice(0, 80)); else sessionStorage.removeItem('oq-atlas-vendo') } catch { /* sem armazenamento: o painel mostra só a região */ }
  }, [selecao, catalogo, questoes, estudo])
  useEffect(() => () => { try { sessionStorage.removeItem('oq-atlas-vendo') } catch { /* idem */ } }, [])

  // ---------- teclado ----------
  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement)?.closest('input, textarea, [contenteditable]')) return
      const m = motorRef.current
      if (!m) return
      if (ev.key === 'Escape') {
        if (!larga && detalhes) definirDetalhes(false)
        else if (questoes) definirQuestoes(null)
        else if (estudo) definirEstudo(false)
        else if (selecao) m.selecionar(null)
        else if (isolado) soltarIsolamento()
      }
      else if (estudo) return // o Teste-se usa os números
      else if (ev.key === 'f' || ev.key === 'F') focarSelecao()
      else if (ev.key === 'i' || ev.key === 'I') isolarSelecao()
      else if (ev.key === 'h' || ev.key === 'H') ocultarSelecao()
      else if (ev.key === 't' || ev.key === 'T') iniciarEstudo()
      else if (ev.key === '/') { ev.preventDefault(); definirExplorar(true); setTimeout(() => document.querySelector<HTMLInputElement>('.at-busca input')?.focus(), 30) }
      else if (ev.key === '0') voltarAoInicio()
      else if (['1', '2', '3', '4', '5', '6'].includes(ev.key)) m.vista((['anterior', 'posterior', 'direita', 'esquerda', 'superior', 'inferior'] as Vista[])[Number(ev.key) - 1])
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  // ---------- relações anatômicas no modelo ----------
  const registro = estrutura && indice ? registroDaEstrutura(indice, estrutura) : undefined
  const mundo: Mundo | null = motor ? { existe: (id) => motor.existe(id), estrutura: (id) => motor.estrutura(id), grupoDe: (id) => motor.grupoDe(id) } : null
  // músculo fora do banco conferido: origem e inserção só pelas áreas desenhadas no modelo
  const areasMusculo = useMemo(() => (estrutura && idxAreas && !registro && grupoDe(estrutura) === 'musculo'
    ? areasDoMusculo(idxAreas, estrutura.s, [baseDoId(estrutura.id)], [estrutura.en]) : []
  ), [estrutura, idxAreas, registro])
  // cada estrutura abre com a origem e a inserção acesas (quando existem); o resto a pessoa liga
  useEffect(() => {
    const doModelo = (['origem', 'insercao'] as const).filter((x) => areasMusculo.some((a) => a.t === (x === 'origem' ? 'o' : 'i')))
    definirAtivas(new Set(registro && registro.tipo !== 'nervo' ? (['origem', 'insercao'] as const).filter((x) => registro[x]) : doModelo))
    definirPontosOsso(false)
    if (contexto) { motorRef.current?.isolar(null); definirIsolado(false) }
    definirContexto(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estrutura?.id, registro?.chave, areasMusculo.length])
  const montagem = useMemo(() => (registro && indice && pontos && mundo && estrutura
    ? montarRelacoes(registro, indice, estrutura.s, ativas, pontos, mundo, idxAreas)
    : areasMusculo.length ? montarAreas(areasMusculo, ativas) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [registro, indice, pontos, estrutura?.id, ativas, motor, idxAreas, areasMusculo])
  const ladoPreset: Estrutura['s'] = lado === 'e' ? 'e' : 'd'
  const destaquesPreset = useMemo(() => {
    if (!preset || !indice || !motor) return []
    const existe = (id: string) => motor.existe(id)
    return preset.chaves.flatMap((c, i) => {
      const r = indice.porChave.get(c)
      return (r?.ids ?? []).map((b) => idNoLado(b, ladoPreset, existe)).filter(Boolean).map((id) => ({ id: id as string, cor: CORES_PRESET[i % CORES_PRESET.length] }))
    })
  }, [preset, indice, motor, ladoPreset])
  const fixados = useMemo(() => (estrutura && indice && pontos && grupoDe(estrutura) === 'osso'
    ? fixadosNoOsso(indice, estrutura, selecao?.faixa, pontos, (z) => faixaPorAltura(estrutura, z)) : []
  ), [estrutura, indice, pontos, selecao?.faixa])
  const areasOsso = useMemo(() => (estrutura && idxAreas && grupoDe(estrutura) === 'osso'
    ? areasNoOsso(idxAreas, estrutura, selecao?.faixa, (z) => faixaPorAltura(estrutura, z)) : []
  ), [estrutura, idxAreas, selecao?.faixa])
  // onde a estrutura fica, da raiz (sistema) até a parte imediatamente acima; cada passo abre o grupo
  const passosArvore = useMemo(() => {
    if (!idxArvore || !estrutura) return [] as { nome: string; no: number }[]
    const i = idxArvore.arvore.e[estrutura.id]
    return i === undefined ? [] : caminhoDoNo(idxArvore, i).map((no) => ({ nome: idxArvore.arvore.n[no][0], no }))
  }, [idxArvore, estrutura])
  useEffect(() => {
    const m = motorRef.current
    if (!m || estudo) return // o Teste-se pinta o próprio destaque
    if (montagem) m.mostrarRelacoes(montagem.destaques, montagem.marcos, montagem.linhas, montagem.areas)
    else if (pontosOsso && estrutura && (fixados.length || areasOsso.length)) {
      // a área desenhada no osso é mais exata que o ponto: com áreas, os pontos ficam de fora
      const areas = areasOsso.map((a) => ({ id: a.id, cor: a.t === 'o' ? CORES_RELACAO.origem : CORES_RELACAO.insercao }))
      m.mostrarRelacoes([], !areas.length && pontos ? marcosNoOsso(fixados, estrutura, pontos) : [], [], areas)
    } else m.mostrarRelacoes(preset ? destaquesPreset : [])
    // as camadas recém-carregadas entram no desenho: depende de ligados e do progresso
  }, [montagem, fixados, areasOsso, pontosOsso, estrutura, pontos, ligados, progresso, preset, destaquesPreset, estudo])

  const alternarRelacao = (x: Relacao) => {
    const novo = new Set(ativas)
    if (novo.has(x)) novo.delete(x); else novo.add(x)
    definirAtivas(novo)
    // áreas do modelo ficam no osso: a camada de ossos precisa estar ligada
    if (novo.has(x) && !registro && areasMusculo.length && !ligados.has('osso')) mudarGrupo('osso', true)
    if (!novo.has(x) || !registro || !indice || !pontos || !mundo || !estrutura) return
    // liga a camada que a relação precisa (nervos, por exemplo), com as regras do plano
    const precisa = montarRelacoes(registro, indice, estrutura.s, new Set([x]), pontos, mundo).precisa
    for (const g of precisa) if (!ligados.has(g)) mudarGrupo(g, true)
  }
  const alternarContexto = () => {
    const m = motorRef.current
    if (!m || !registro || !indice || !mundo || !estrutura || !selecao) return
    if (contexto) { soltarIsolamento(); return }
    const ids = new Set<string>([selecao.id, ...relacionadosDe(registro, indice).flatMap((x) => idsDoRegistro(x, estrutura.s, mundo))])
    for (const d of montagem?.destaques ?? []) ids.add(d.id)
    for (const k of ['origem', 'insercao'] as const) for (const mk of registro[k]?.m ?? []) { const id = idNoLado(mk.split(':')[0], estrutura.s, mundo.existe); if (id) ids.add(id) }
    definirAberto(null); definirPreset(null)
    m.isolar([...ids])
    definirIsolado(true)
    definirContexto(true)
    m.focar([...ids].filter((id) => m.estaVisivel(id)))
  }
  const irParaChave = (chave: string) => {
    const r = indice?.porChave.get(chave)
    const m = motorRef.current
    if (!r?.ids.length || !m) return
    const id = idNoLado(r.ids[0], estrutura?.s ?? 'd', (x) => m.existe(x))
    const e = id ? m.estrutura(id) : undefined
    if (e) irPara(e)
  }
  // ---------- visualizações prontas ----------
  const aplicarPreset = (p: Preset) => {
    const m = motorRef.current
    if (!m || !indice) return
    if (modo !== 'ortopedia') trocarModo('ortopedia')
    escolherRegiao(p.regiao, lado === 'ambos' ? 'd' : lado)
    definirAberto(null); definirContexto(false)
    definirPreset(p)
    const existe = (id: string) => m.existe(id)
    const lado1: Estrutura['s'] = lado === 'e' ? 'e' : 'd'
    const ids = p.chaves.flatMap((c) => indice.porChave.get(c)?.ids ?? []).map((b) => idNoLado(b, lado1, existe)).filter(Boolean) as string[]
    // liga só as camadas que a pessoa já pode usar sem convite; o que é de outro plano aparece com cadeado na legenda
    const grupos = new Set(ids.map((id) => m.grupoDe(id)).filter(Boolean) as Grupo[])
    for (const g of grupos) if (!ligados.has(g) && podeLigar(g)) mudarGrupo(g, true)
    m.isolar(ids)
    definirIsolado(true)
    // a legenda assume; o modelo ganha o espaço do Explorar (que volta pelo botão do topo)
    definirExplorar(false)
  }

  // ---------- Teste-se ----------
  const iniciarEstudo = (tema: string | null = null) => {
    const m = motorRef.current
    if (!m || !catalogo) return
    m.selecionar(null)
    soltarIsolamento()
    definirPersonalizar(false)
    definirExplorar(false)
    definirTemaEstudo(tema)
    // de um grupo para outro: o Teste-se remonta já no grupo novo
    if (estudo) { definirEstudo(false); setTimeout(() => definirEstudo(true), 0) } else definirEstudo(true)
  }
  const gruposDoTema = (t: TemaEstudo, lista: Estrutura[]) => (t.grupos.length ? t.grupos : [...new Set(lista.map(grupoDe))])
  /** cadeado no tema: camada que esta pessoa não pode ligar (os sistemas do Corpo inteiro são da assinatura) */
  const temaFechado = (t: TemaEstudo) => (t.grupos.length ? t.grupos.some((g) => !ligados.has(g) && !podeLigar(g)) : nivel !== 'assinante')
  /** liga as camadas do grupo e tira o recorte de região; false quando o grupo pede conta ou assinatura */
  const prepararTema = async (t: TemaEstudo, lista: Estrutura[]) => {
    const m = motorRef.current
    if (!m) return false
    const gs = gruposDoTema(t, lista)
    const travado = gs.find((g) => !ligados.has(g) && !podeLigar(g))
    if (travado) { definirConvite(nivel === 'visitante' ? { tipo: 'conta' } : { tipo: 'assinante', grupo: travado }); return false }
    // um recorte de região esconderia o grupo: o teste usa o corpo todo
    if (regiaoId) { definirRegiaoId(null); m.definirRegiao(null) }
    await Promise.all(gs.filter((g) => !ligados.has(g)).map((g) => mudarGrupo(g, true)))
    // nervo, vaso, ligamento ou osso: o músculo translúcido tamparia o alvo; o osso fica como referência
    if (t.grupos.length && !t.grupos.includes('musculo') && ligados.has('musculo')) void mudarGrupo('musculo', false)
    return true
  }
  const gruposEstudo = useMemo(() => new Set([...ligados].filter((g) => modo === 'corpo' || !SO_CORPO.has(g))), [ligados, modo])

  // ---------- rótulos no modelo (o que está isolado, quando é um conjunto pequeno) ----------
  const idsRotulos = useMemo(() => {
    if (pref.rotulos === false || !isolado || !motor || estudo) return null
    const ids = motor.idsIsolados
    return ids && ids.length <= 40 ? ids : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref.rotulos, isolado, motor, estudo, preset, aberto, contexto, ligados, progresso, selecao?.id])

  // ---------- fichas ----------
  const anatomia = registro && indice ? (
    <FichaAnatomica registro={registro} indice={indice} ativas={ativas} semGeometria={montagem?.semGeometria ?? []} contexto={contexto}
      aoAlternar={alternarRelacao} aoContexto={alternarContexto} aoIr={irParaChave} />
  ) : undefined
  const estruturaDe = (id: string) => motorRef.current?.estrutura(id)
  const listaAreasOsso = areasOsso.length ? (
    <AreasDoOsso areas={areasOsso} semBotao={fixados.length > 0} mostrar={pontosOsso} aoMostrar={() => definirPontosOsso((v) => !v)} estrutura={estruturaDe} aoIr={irPara} />
  ) : null
  const fixacoes = (fixados.length && indice) || areasOsso.length ? (
    <>
      {fixados.length > 0 && indice && <FixacoesDoOsso itens={fixados} indice={indice} pontos={pontosOsso} comAreas={areasOsso.length > 0} aoPontos={() => definirPontosOsso((v) => !v)} aoIr={irParaChave} />}
      {listaAreasOsso && (fixados.length > 0
        ? <details className="fa-secao"><summary>Todos os músculos desenhados no modelo <small>{new Set(areasOsso.map((a) => a.mu ?? a.k)).size}</small></summary>{listaAreasOsso}</details>
        : listaAreasOsso)}
    </>
  ) : undefined
  const geral = estrutura && !registro ? (
    <FichaGeral estrutura={estrutura} areas={areasMusculo} ativas={ativas} aoAlternar={alternarRelacao} estruturaDe={estruturaDe} aoIr={irPara} />
  ) : undefined

  const painelDireito = estrutura ? (
    questoes
      ? <PainelQuestoes titulo={questoes.titulo} ids={questoes.ids} aoVoltar={() => definirQuestoes(null)} />
      : <PainelFicha key={`${estrutura.id}|${selecao?.faixa ?? ''}`} anatomia={anatomia} fixacoes={fixacoes} geral={geral}
          trilha={<Trilha passos={passosArvore} aoAbrir={abrirNo} />} estrutura={estrutura} faixa={selecao?.faixa} ficha={ficha} vinculo={vinculo} favorita={pref.favoritos.includes(estrutura.id)}
          isolada={isolado} aoFocar={focarSelecao} aoIsolar={isolarSelecao} aoOcultar={ocultarSelecao} aoFavoritar={alternarFavorito} aoCompartilhar={copiarLink}
          aoFechar={larga ? () => motorRef.current?.selecionar(null) : () => definirDetalhes(false)} aoRecolher={larga ? () => definirDetalhes(false) : undefined}
          aoResponder={(titulo, ids) => { definirQuestoes({ titulo, ids }); definirDetalhes(true) }} />
  ) : null

  const irNaTrilha = (passo: number) => {
    const alvo = trilha.current[posTrilha + passo]
    const m = motorRef.current
    if (!alvo || !m || !m.existe(alvo.id)) return
    andandoNaTrilha.current = true
    definirPosTrilha(posTrilha + passo)
    const g = m.grupoDe(alvo.id)
    const ir = () => { m.selecionar(alvo); m.focar([alvo.id], alvo.faixa) }
    if (g && !ligados.has(g)) mudarGrupo(g, true, ir); else ir()
  }
  const cartao = estrutura ? (
    <CartaoRapido estrutura={estrutura} ondeFica={passosArvore[passosArvore.length - 1]?.nome} faixa={selecao?.faixa} ficha={ficha} vinculo={vinculo} registro={registro} indice={indice} isolada={isolado}
      podeVoltar={posTrilha > 0} podeAvancar={posTrilha < trilha.current.length - 1}
      aoDetalhes={() => definirDetalhes(true)} aoFocar={focarSelecao} aoIsolar={isolarSelecao}
      aoVoltar={() => irNaTrilha(-1)} aoAvancar={() => irNaTrilha(1)}
      aoFechar={() => motorRef.current?.selecionar(null)} aoIr={irParaChave} />
  ) : null

  const gruposBarra = GRUPOS_DO_MODO[modo]
  const corpo = modo === 'corpo'
  const sistemaAtual = aberto?.sistema ? SISTEMAS.find((s) => s.id === aberto.sistema) : undefined
  const tituloExplorar = regiao ? `${regiao.nome}${regiao.membro && lado !== 'ambos' ? ` · ${lado === 'd' ? 'direito' : 'esquerdo'}` : ''}` : sistemaAtual ? sistemaAtual.nome : corpo ? 'Sistemas' : 'Regiões'

  return (
    <div className={`atlas${larga ? ' atlas--larga' : ' atlas--estreita'}${questoes && larga ? ' atlas--questoes' : ''}${estrutura && !estudo ? ' atlas--selecao' : ''}${corpo ? ' atlas--corpo' : ''}${estudo ? ' atlas--estudo' : ''}`} role="dialog" aria-modal="true" aria-label="Atlas 3D">
      <div className="atlas__palco" ref={palco} />

      {/* topo: explorar · modo · ferramentas */}
      <header className="atlas__topo">
        <button type="button" className={`at-chip at-chip--explorar${explorar ? ' at-chip--ativo' : ''}`} onClick={() => definirExplorar((v) => !v)} aria-expanded={explorar}>
          <Icone nome={corpo ? 'cubo' : 'mapa'} tamanho={17} /><span>{tituloExplorar}</span>
        </button>
        <div className="at-modo" role="radiogroup" aria-label="Modo do atlas">
          <button type="button" role="radio" aria-checked={!corpo} onClick={() => trocarModo('ortopedia')}><Icone nome="osso" tamanho={16} /><span className="at-modo__longo">Ortopedia</span><span className="at-modo__curto">Orto</span></button>
          <button type="button" role="radio" aria-checked={corpo} onClick={() => trocarModo('corpo')}><Icone nome="cubo" tamanho={16} /><span className="at-modo__longo">Corpo inteiro</span><span className="at-modo__curto">Corpo</span>{nivel !== 'assinante' && <Icone nome="cadeado" tamanho={11} />}</button>
          <i className="at-modo__marca" aria-hidden="true" />
        </div>
        <div className="atlas__acoes-topo">
          <button type="button" className={`at-chip at-chip--estudo${estudo ? ' at-chip--ativo' : ''}`} onClick={() => (estudo ? definirEstudo(false) : iniciarEstudo())} aria-pressed={estudo} title="Teste-se: treine os nomes por grupo (T)"><Icone nome="alvo" tamanho={17} /><span>Teste-se</span></button>
          {larga && <button type="button" className={`at-botao-icone at-ajuda${guia || !pref.dicasVistas ? ' at-botao-icone--ativo' : ''}`} onClick={() => definirGuia((v) => !v)} aria-expanded={guia || !pref.dicasVistas} aria-label="Como usar" title="Como usar"><Icone nome="interrogacao" tamanho={18} /></button>}
          <button type="button" className={`at-botao-icone${personalizar ? ' at-botao-icone--ativo' : ''}`} onClick={() => { definirPersonalizar((v) => !v); if (guia || !pref.dicasVistas) { definirGuia(false); definirPref((p) => ({ ...p, dicasVistas: true })) } }} aria-label="Ferramentas e ajustes" title="Ferramentas e ajustes"><Icone nome="ajustes" tamanho={19} /></button>
          <button type="button" className="at-botao-icone" onClick={aoFechar} aria-label="Fechar o atlas" title="Fechar (volta à página anterior)"><Icone nome="fechar" tamanho={19} /></button>
        </div>
      </header>

      {explorar && (
        <PainelExplorar modo={modo} aoTrocarModo={trocarModo} busca={busca} aoBuscar={definirBusca} resultados={resultados} noOutroModo={noOutroModo}
          regioesAchadas={regioesAchadas} presetsAchados={presetsAchados} regiao={regiao} lado={lado} aoRegiao={escolherRegiao}
          preset={preset} temBanco={!!indice} aoPreset={aplicarPreset} sistemaAtivo={aberto?.sistema} aoSistema={abrirSistema}
          fechado={fechado} assinante={nivel === 'assinante'} aoEstudar={iniciarEstudo} temaFechado={temaFechado} favoritos={pref.favoritos} recentes={pref.recentes} catalogo={catalogo} aoIr={irPara} />
      )}

      {/* ferramentas e ajustes */}
      {personalizar && motor && (
        <aside className="atlas__personalizar" aria-label="Ferramentas e ajustes">
          <h2 className="at-titulo-secao"><Icone nome="ajustes" tamanho={14} /> Ferramentas</h2>
          <div className="at-ferramentas">
            <button type="button" onClick={() => iniciarEstudo()}><Icone nome="alvo" tamanho={18} /><span>Teste-se<small>Treine os nomes por grupo</small></span></button>
            <button type="button" onClick={salvarImagem}><Icone nome="imagem" tamanho={18} /><span>Salvar imagem<small>PNG da vista atual</small></span></button>
            <button type="button" onClick={copiarLink}><Icone nome="link" tamanho={18} /><span>Copiar link<small>Abre nesta mesma vista</small></span></button>
            <button type="button" onClick={() => { definirPersonalizar(false); definirGuia(true) }}><Icone nome="interrogacao" tamanho={18} /><span>Como usar<small>Mouse, dedos e atalhos</small></span></button>
          </div>
          <label className="at-alternador">
            <input type="checkbox" checked={pref.rotulos !== false} onChange={(e) => definirPref((p) => ({ ...p, rotulos: e.target.checked }))} />
            <span><strong>Nomes no modelo</strong><small>Rótulos sobre o que estiver isolado</small></span>
          </label>
          <h2 className="at-titulo-secao"><Icone nome="olho" tamanho={14} /> Transparência das camadas</h2>
          {ORDEM_GRUPOS.filter((g) => ligados.has(g)).map((g) => (
            <label key={g} className="at-faixa-opacidade"><span><i className="at-ponto" style={{ background: hex(GRUPOS[g].cor) }} />{GRUPOS[g].rotulo}</span>
              <input type="range" min={0.1} max={1} step={0.05} defaultValue={motor.opacidadeDe(g)} onChange={(ev) => motor.definirOpacidade(g, Number(ev.target.value))} /></label>
          ))}
          <h2 className="at-titulo-secao"><Icone nome="riscar" tamanho={14} /> Corte</h2>
          <div className="at-segmentos" role="group" aria-label="Plano de corte">
            {([null, 'axial', 'sagital', 'coronal'] as (EixoCorte | null)[]).map((e) => (
              <button key={e ?? 'nenhum'} type="button" aria-pressed={(corte?.eixo ?? null) === e} onClick={() => mudarCorte(e ? { eixo: e, posicao: 0.5, inverter: false } : null)}>{e ? e[0].toUpperCase() + e.slice(1) : 'Sem corte'}</button>
            ))}
          </div>
          {corte && <>
            <input className="at-corte" type="range" min={0} max={1} step={0.005} value={corte.posicao} onChange={(ev) => mudarCorte({ ...corte, posicao: Number(ev.target.value) })} aria-label="Posição do corte" />
            <button type="button" className="at-link" onClick={() => mudarCorte({ ...corte, inverter: !corte.inverter })}><Icone nome="reiniciar" tamanho={15} /> Ver o outro lado do corte</button>
            <p className="at-nota">O corte é geométrico e educativo: não substitui tomografia nem ressonância.</p>
          </>}
          <button type="button" className="botao" onClick={voltarAoInicio}><Icone nome="casa" tamanho={16} /> Voltar ao início{motor.quantasOcultas ? ` (mostra ${motor.quantasOcultas} ocultas)` : ''}</button>
          <p className="at-nota">Atalhos: 0 volta ao início · / busca · T Teste-se · F foca · I isola · H esconde · 1 a 6 trocam a vista · Esc volta. Clicar de novo no mesmo ponto pega a estrutura de baixo.</p>
          <a className="at-nota at-nota--link" href={`${import.meta.env.BASE_URL}atlas3d/v1/LICENCAS.md`} target="_blank" rel="noreferrer">Modelos: BodyParts3D (DBCLS, CC BY-SA 2.1 JP), Z-Anatomy (CC BY-SA 4.0) e Human Reference Atlas (HuBMAP, CC BY 4.0)</a>
        </aside>
      )}

      {/* vistas */}
      <nav className="atlas__vistas" aria-label="Vistas">
        <button type="button" onClick={() => motor?.vista('anterior')} title="Anterior (1)">Ant</button>
        <button type="button" onClick={() => motor?.vista('posterior')} title="Posterior (2)">Post</button>
        <button type="button" onClick={() => motor?.vista('direita')} title="Lateral direita (3)">D</button>
        <button type="button" onClick={() => motor?.vista('esquerda')} title="Lateral esquerda (4)">E</button>
        <button type="button" onClick={() => motor?.vista('superior')} title="Superior (5)">Sup</button>
        <button type="button" className={`at-inicio${foraDoInicio ? ' at-inicio--ativo' : ''}`} onClick={voltarAoInicio} title="Voltar ao início: tira seleção, isolamento, corte e região (tecla 0)">
          <Icone nome="casa" tamanho={16} /><span>Início</span>
        </button>
      </nav>

      {/* camadas do modo */}
      <div className="atlas__camadas" role="group" aria-label="Camadas">
        {corpo && (
          <div className="at-sexo" role="radiogroup" aria-label="Sexo do modelo">
            <button type="button" role="radio" aria-checked={!ligados.has('feminino')} onClick={() => ligados.has('feminino') && mudarGrupo('feminino', false)} title="Pelve masculina">Masculino</button>
            <button type="button" role="radio" aria-checked={ligados.has('feminino')} onClick={() => { if (!ligados.has('feminino')) { mudarGrupo('feminino', true); if (!ligados.has('orgao') && podeLigar('orgao')) mudarGrupo('orgao', true) } }} title="Pelve feminina: útero, colo, ovários e tubas">Feminino{fechado('feminino') && <Icone nome="cadeado" tamanho={11} />}</button>
          </div>
        )}
        {gruposBarra.map((g, i) => (
          <button key={g} type="button" aria-pressed={ligados.has(g)} onClick={() => alternarGrupo(g)} title={GRUPOS[g].rotulo}
            className={corpo && SO_CORPO.has(g) && !SO_CORPO.has(gruposBarra[i - 1]) ? 'at-camada--inicio-corpo' : undefined}>
            <span className="at-ponto" style={{ background: hex(GRUPOS[g].cor) }} />
            <span className="at-camada-rotulo">{GRUPOS[g].rotulo.split(' ')[0]}</span>
            {fechado(g) && <span className="at-cadeado" aria-label="para assinantes"><Icone nome="cadeado" tamanho={12} /></span>}
            {ligados.has(g) && (progresso[g] ?? 0) < 1 && <span className="at-mini-progresso" style={{ ['--p' as string]: `${Math.round((progresso[g] ?? 0) * 100)}%` }} />}
          </button>
        ))}
      </div>

      {/* legenda da visualização pronta */}
      {preset && indice && !estrutura && !estudo && (
        <aside className="atlas__preset" aria-label={`Visualização: ${preset.nome}`}>
          <header><p className="tr-heroi__selo">Visualização</p><button type="button" className="at-botao-icone" onClick={soltarIsolamento} aria-label="Sair da visualização" title="Sair da visualização"><Icone nome="fechar" tamanho={16} /></button></header>
          <h2>{preset.nome}</h2>
          <ul>{preset.chaves.map((c, i) => {
            const r = indice.porChave.get(c)
            if (!r) return null
            const g = r.ids[0] && motor ? motor.grupoDe(idNoLado(r.ids[0], ladoPreset, (x) => motor.existe(x)) ?? '') : undefined
            const fora = !!g && !ligados.has(g)
            return <li key={c}><button type="button" onClick={() => irParaChave(c)} className={fora ? 'atlas__preset-fechado' : undefined}><i style={{ background: CORES_PRESET[i % CORES_PRESET.length] }} />{r.nome}{fora && <Icone nome="cadeado" tamanho={12} />}</button></li>
          })}</ul>
          <p className="at-nota">{(() => {
            const fora = new Set(preset.chaves.flatMap((c) => { const r = indice.porChave.get(c); const id = r?.ids[0] && motor ? idNoLado(r.ids[0], ladoPreset, (x) => motor.existe(x)) : undefined; const g = id ? motor?.grupoDe(id) : undefined; return g && !ligados.has(g) ? [g] : [] }))
            if (!fora.size) return 'Toque num nome para abrir a ficha.'
            if (nivel === 'visitante' && [...fora].some((g) => GRATIS.has(g))) return 'Com a conta grátis, os músculos também aparecem aqui. Toque num nome para abrir a ficha.'
            return 'Os itens com cadeado ficam nas camadas de assinante.'
          })()}</p>
        </aside>
      )}

      {/* sistema aberto: navegar pelas partes */}
      {aberto && idxArvore && !estrutura && !estudo && (
        <Navegador idx={idxArvore} nos={aberto.nos} titulo={aberto.titulo} cor={aberto.cor} estruturaDe={estruturaDe}
          aoAbrir={abrirNo} aoSubir={sistemaAtual && aberto.nos.length === 1 && caminhoDoNo(idxArvore, aberto.nos[0]).length > 1 ? () => abrirSistema(sistemaAtual) : undefined}
          aoEstrutura={irPara} aoSair={soltarIsolamento} />
      )}

      {/* nomes sobre o modelo */}
      {motor && idsRotulos && <Rotulos motor={motor} ids={idsRotulos} nome={(id) => { const e = motor.estrutura(id); return e ? nomeDe(e) : id }} />}

      {/* nome sob o cursor (só no computador, sem redesenhar o atlas a cada movimento) */}
      {larga && catalogo && !selecao && !estudo && <DicaPassagem catalogo={catalogo} registrar={registrarPassagem} />}

      {/* Teste-se */}
      {estudo && motor && catalogo && (
        <Suspense fallback={null}><ModoEstudo motor={motor} estruturas={catalogo.estruturas} grupos={gruposEstudo} modo={modo} arvore={idxArvore} temaInicial={temaEstudo}
          prepararTema={prepararTema} fechado={temaFechado} aoFechar={() => definirEstudo(false)}
          aoVerFicha={(e) => { definirEstudo(false); setTimeout(() => { motor.selecionar({ id: e.id }); if (larga) definirDetalhes(true) }, 0) }} /></Suspense>
      )}

      {/* seleção: cartão compacto; detalhes no painel lateral (computador) ou num modal (celular) */}
      {estrutura && !estudo && (larga
        ? (detalhes ? <aside className="atlas__ficha" aria-label="Ficha da estrutura">{painelDireito}</aside> : cartao)
        : <>{cartao}{detalhes && <ModalDetalhes rotulo={questoes ? questoes.titulo : `Ficha: ${nomeCompleto(estrutura, selecao?.faixa)}`} alto={!!questoes} aoFechar={() => definirDetalhes(false)}>{painelDireito}</ModalDetalhes>}</>)}

      {/* estados */}
      {!catalogo && !erro && <div className="atlas__carregando"><EsperaPixel rotulo="Montando o esqueleto" /></div>}
      {catalogo && carregando.length > 0 && <div className="atlas__aviso-carga">Carregando {carregando.map((g) => GRUPOS[g].rotulo.toLowerCase()).join(', ')}… {Math.round(Math.min(...carregando.map((g) => progresso[g] ?? 0)) * 100)}%</div>}
      {aviso && <div className="atlas__aviso" role="status">{aviso}</div>}
      {convite && <ConviteAtlas convite={convite} aoFechar={() => definirConvite(null)} />}
      {erro && <div className="atlas__carregando"><p>{erro}</p><button type="button" className="botao botao--principal" onClick={() => location.reload()}>Tentar de novo</button></div>}
      {catalogo && (guia || !pref.dicasVistas) && (
        <GuiaControles toque={toque} aoFechar={() => { definirGuia(false); definirPref((p) => ({ ...p, dicasVistas: true })) }} />
      )}
    </div>
  )
}

function lerCamadas(consulta: URLSearchParams): Grupo[] {
  const c = consulta.get('c')?.split(',').filter((g): g is Grupo => g in GRUPOS && GRATIS.has(g as Grupo))
  return c?.length ? c : ['osso']
}
export { hex }

/** O nome da estrutura sob o cursor, com estado próprio: só este rótulo muda quando o mouse passa. */
function DicaPassagem({ catalogo, registrar }: { catalogo: Catalogo; registrar: (f: ((p: Passagem | null) => void) | null) => void }) {
  const [passagem, definirPassagem] = useState<Passagem | null>(null)
  useEffect(() => { registrar(definirPassagem); return () => registrar(null) }, [registrar])
  if (!passagem) return null
  const e = catalogo.estruturas.find((x) => x.id === passagem.id)
  return e ? <div className="atlas__dica" style={{ left: passagem.x + 14, top: passagem.y + 14 }}>{nomeCompleto(e, passagem.faixa)}</div> : null
}
