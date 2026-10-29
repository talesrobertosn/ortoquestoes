import { Fragment, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { carregarCapitulo, carregarIndiceBiblioteca, pedacos, questoesReais, textoPuro, textosDoCapitulo } from '../biblioteca/conteudo'
import { criarAncora, faixasDoBloco, resolverAncora, type Ancora, type AncoraResolvida } from '../biblioteca/ancoras'
import { CORES, ehTexto, type Bloco, type Capitulo, type CorMarca, type Marca, type Preferencias, type Radar, type ResumoCapitulo } from '../biblioteca/tipos'
import { chaveLivro, numeroCapitulo, proximoCapitulo, rotuloLivro, voltarAEstante } from '../biblioteca/estante'
import { GuiaTour, deveAbrirGuia, usarGuiaNaConta, type PassoGuia } from '../biblioteca/GuiaTour'
import { usarBiblioteca, usarEstadoSalvamento } from '../biblioteca/usarBiblioteca'
import { FrasesDoTema } from '../biblioteca/FrasesDoTema'
import { GRAVAR_SOZINHO_S, PASSO_MS, novoCronometro, passoCronometro, registrarAtividade, retirarTempo } from '../biblioteca/tempoLeitura'
import { usarIndice } from '../dados/usarIndice'
import type { Indice } from '../dados/tipos'
import { Icone } from '../componentes/Icone'
import { Carregando, Estado } from '../componentes/Estados'
import { href, navegar, usarRota } from '../util/rotas'
import { usarPremium } from '../conta/premium'
import { ConvitePremium } from '../componentes/Premium'
import { usarSessao } from '../estado/sessao'
import { AREAS_TREINO, FILTROS_VAZIOS } from '../dados/tipos'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis } from '../conta/supabase'
import { calcularPorta, linkDaPorta, SECOES_ABERTAS } from '../biblioteca/porta'
import { PortaLeitura } from '../biblioteca/PortaLeitura'
import { usarSemCopia } from '../biblioteca/semCopia'
import { flashcardsDosSubtemas, linkFlashcards, usarAreasDosFlashcards } from '../biblioteca/ligacoes'
import '../estilos/paginas/Resumos.css'

const QuestaoDireta = lazy(() => import('./QuestaoDireta').then((m) => ({ default: m.QuestaoDireta })))

/**
 * Leitor dos resumos da Biblioteca (16/10/2026). Ver docs/biblioteca/README.md.
 * - A posição de leitura é guardada como (bloco, fração do bloco), nunca como pixel ou página:
 *   troca de fonte, de largura, de modo (rolagem ⇄ paginado) e de aparelho voltam ao mesmo trecho.
 * - As marcações são desenhadas pelo React a partir das âncoras (biblioteca/ancoras.ts), sem
 *   mexer no DOM por fora: a seleção continua estável e nenhuma animação interfere nela.
 */

const NOME_COR: Record<CorMarca, string> = { amarelo: 'Amarelo', verde: 'Verde', azul: 'Azul', rosa: 'Rosa', roxo: 'Roxo' }
const RADAR: Record<Radar, { rotulo: string; texto: string }> = {
  confirmado: { rotulo: 'Cobrança confirmada', texto: 'Há questões de prova real no acervo sobre esta seção.' },
  fundamento: { rotulo: 'Fundamento', texto: 'Base necessária para resolver as questões relacionadas.' },
  clinico: { rotulo: 'Relevância clínica', texto: 'Conteúdo importante na prática; nenhuma questão encontrada no conjunto analisado.' },
  oportunidade: { rotulo: 'Possível cobrança', texto: 'Tema com potencial de cobrança. É uma possibilidade, não uma previsão.' },
}
const LARGURA: Record<Preferencias['largura'], number> = { estreita: 560, media: 680, larga: 820 }
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const PASSOS_LEITOR: PassoGuia[] = [
  { titulo: 'Ajuda do leitor', texto: 'Um minuto para conhecer os controles. A sua posição de leitura é salva sozinha: pode fechar a página quando quiser e voltar no mesmo parágrafo.' },
  { alvo: '[data-guia="lr-trilha"]', titulo: 'Onde você está', texto: 'Livro, capítulo e o estado do salvamento. O botão da esquerda volta para a Biblioteca do jeito que você a deixou.' },
  { alvo: '[data-guia="lr-indice"]', titulo: 'Índice', texto: 'Todas as partes do capítulo. A parte em que você está fica marcada, e as já lidas ficam mais claras.' },
  { alvo: '[data-guia="lr-busca"]', titulo: 'Buscar no capítulo', texto: 'Ache uma classificação ou um nome próprio e pule direto para o trecho.' },
  { alvo: '[data-guia="lr-marcador"]', titulo: 'Marcar página', texto: 'Guarda este lugar para reencontrar depois, sem pintar o texto. Os marcadores ficam na lista de Notas, de onde também saem.' },
  { alvo: '[data-guia="lr-notas"]', titulo: 'Destaques e notas', texto: 'Selecione qualquer trecho para destacar em cinco cores ou escrever uma nota. Tudo aparece aqui e no seu caderno, em todos os aparelhos.' },
  { alvo: '[data-guia="lr-aa"]', titulo: 'Aparência', texto: 'Tema claro, sépia ou escuro, tamanho da letra, espaço entre linhas, largura e leitura em páginas.' },
  { alvo: '.lr-cobranca__lista button', titulo: 'Questões de prova no texto', texto: 'Cada chip é uma questão que já caiu (prova e ano). Ela abre ao lado da leitura; ao voltar, você está no mesmo parágrafo.' },
]

interface MarcaNoTexto { id: string; inicio: number; fim: number; cor: CorMarca; nota: boolean }
interface Selecao { ancora: Ancora; texto: string; x: number; y: number; embaixo: boolean; secao: string | null }

export function LeitorResumo({ id, consulta }: { id: string; consulta: URLSearchParams }) {
  const acesso = usarPremium()
  const [capitulo, definirCapitulo] = useState<Capitulo | null | undefined>(undefined)
  const [falhou, definirFalhou] = useState(false)
  useEffect(() => {
    let vivo = true
    definirCapitulo(undefined); definirFalhou(false)
    carregarCapitulo(id).then((c) => { if (vivo) definirCapitulo(c) }).catch(() => { if (vivo) definirFalhou(true) })
    return () => { vivo = false }
  }, [id])
  if (falhou) return <Estado titulo="Não foi possível abrir o resumo." acoes={<button type="button" className="botao botao--principal" onClick={() => location.reload()}>Tentar de novo</button>}><p>Confira a conexão.</p></Estado>
  if (capitulo === undefined) return <Carregando linhas={8} rotulo="Abrindo o resumo" />
  if (capitulo === null) return <Estado titulo="Resumo não encontrado." acoes={<a className="botao botao--principal" href={href('/resumos')}>Ver a biblioteca</a>}><p>O endereço pode ter mudado.</p></Estado>
  // Desde 16/10/2026 todos os resumos são abertos (acesso: gratis); o portão fica para um resumo marcado como assinante.
  if (capitulo.acesso !== 'gratis' && !acesso.premium) {
    if (acesso.logado && !acesso.carregado) return <Carregando linhas={6} rotulo="Conferindo o acesso" />
    return <ResumoFechado capitulo={capitulo} />
  }
  return <Leitor capitulo={capitulo} blocoInicial={consulta.get('bloco')} />
}

function ResumoFechado({ capitulo }: { capitulo: Capitulo }) {
  return (
    <div className="rs empilha-2">
      <header className="rs-topo">
        <a className="rs-voltar" href={href('/resumos')}><Icone nome="esquerda" tamanho={16} /> Biblioteca</a>
        <p className="rs-topo__selo"><Icone nome="cadeado" tamanho={15} /> Exclusivo para assinantes</p>
        <h1>{capitulo.titulo}</h1>
        <p>{capitulo.resumo}</p>
        <p className="rs-livro__ref">A partir de {capitulo.livro}, {capitulo.edicao}. {capitulo.capitulo}. ~{capitulo.minutos} min de leitura.</p>
        <div className="rs-topo__acoes"><a className="botao botao--principal" href={href('/assinatura')}>Ver os planos</a><a className="botao" href={href('/resumos')}>Ler um resumo aberto</a></div>
      </header>
      <section aria-labelledby="rs-dentro"><h2 id="rs-dentro" className="rs-rotulo">O que tem dentro</h2>
        <ol className="rs-sumario">{capitulo.secoes.map((s) => <li key={s.id}>{s.titulo}</li>)}</ol>
      </section>
    </div>
  )
}

function Leitor({ capitulo, blocoInicial }: { capitulo: Capitulo; blocoInicial: string | null }) {
  // Resumo → flashcards do mesmo tema (pelos subtemas do resumo; sem flashcard publicado, nada aparece).
  const areasFc = usarAreasDosFlashcards()
  const alvoFc = useMemo(() => flashcardsDosSubtemas(areasFc, capitulo.subtemas ?? [], capitulo.especialidade), [areasFc, capitulo])
  // Com os flashcards abertos por cima (pop-up do jogo), o leitor vira fundo e desce para baixo deles.
  const deFundo = usarRota().segmentos[0] !== 'resumos'
  const { indice } = usarIndice()
  // Resumos abertos para todos (pedido do Tales, 16/10/2026); resolver as questões citadas é do assinante.
  const { premium } = usarPremium()
  // Visitante (sem conta) lê as SECOES_ABERTAS primeiras partes; a conta grátis abre o resto (Tales, 19/10/2026).
  const { sessao } = usarConta()
  const porta = useMemo(() => calcularPorta(capitulo.secoes, contasDisponiveis && !sessao, blocoInicial), [capitulo.secoes, sessao, blocoInicial])
  const secoesVisiveis = porta.fechado ? capitulo.secoes.slice(0, porta.abertas) : capitulo.secoes
  const bib = usarBiblioteca()
  const { preferencias: prefSalva, definirPreferencias } = bib
  // Primeira vez no leitor: o tema acompanha o do site (escuro abre escuro).
  const pref = useMemo(() => prefSalva.em ? prefSalva : { ...prefSalva, tema: document.documentElement.dataset.tema === 'escuro' ? 'escuro' as const : prefSalva.tema }, [prefSalva])
  const salvamento = usarEstadoSalvamento()
  const { ordem, textos, secaoDe } = useMemo(() => textosDoCapitulo(capitulo), [capitulo])
  const leitura = bib.leituras[capitulo.id]
  // A estante (para a trilha e o próximo capítulo publicado do mesmo livro).
  const [estante, definirEstante] = useState<ResumoCapitulo[]>([])
  useEffect(() => { let vivo = true; carregarIndiceBiblioteca().then((d) => { if (vivo) definirEstante(d.capitulos) }).catch(() => {}); return () => { vivo = false } }, [])
  const proximo = useMemo(() => proximoCapitulo(estante, capitulo), [estante, capitulo])
  const [guia, definirGuia] = useState(false)
  // Primeira vez no leitor: a ajuda abre sozinha depois que o texto assentou (só uma vez por conta).
  const metaGuia = usarGuiaNaConta('leitor')
  useEffect(() => { if (deFundo || !deveAbrirGuia('leitor', metaGuia)) return; const t = window.setTimeout(() => definirGuia(true), 1200); return () => window.clearTimeout(t) }, [!!metaGuia]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Marcações: reencontra cada âncora no texto atual ──
  const doCapitulo = useMemo(() => bib.marcas.filter((m) => m.capitulo === capitulo.id), [bib.marcas, capitulo.id])
  const resolvidas = useMemo(() => doCapitulo.map((m) => ({ marca: m, r: resolverAncora(m.ancora, ordem, textos) })), [doCapitulo, ordem, textos])
  const porBloco = useMemo(() => {
    const mapa = new Map<string, MarcaNoTexto[]>()
    for (const { marca, r } of [...resolvidas].sort((a, b) => a.marca.criadaEm - b.marca.criadaEm)) {
      if (r.estado === 'orfa' || marca.marcador) continue
      for (const t of r.trechos) { const l = mapa.get(t.bloco) ?? []; l.push({ id: marca.id, inicio: t.inicio, fim: t.fim, cor: marca.cor, nota: !!marca.nota.trim() }); mapa.set(t.bloco, l) }
    }
    return mapa
  }, [resolvidas])
  const marcadores = useMemo(() => new Set(resolvidas.filter(({ marca, r }) => marca.marcador && r.estado !== 'orfa').map(({ r }) => r.trechos[0]?.bloco)), [resolvidas])
  // Âncora que mudou de lugar (revisão editorial): grava a posição nova, sem perder o trecho original.
  useEffect(() => {
    for (const { marca, r } of resolvidas) if (r.estado === 'movida') bib.editarMarca(marca.id, { ancora: { ...marca.ancora, versao: capitulo.versao, trechos: r.trechos } })
  }, [resolvidas]) // eslint-disable-line react-hooks/exhaustive-deps

  // O leitor ocupa a tela: a página do site por trás não rola (no celular o dedo arrastaria o rodapé).
  useEffect(() => {
    const antes = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    return () => { document.documentElement.style.overflow = antes }
  }, [])

  // ── Painéis ──
  const [painel, definirPainel] = useState<'indice' | 'notas' | 'busca' | 'aparencia' | null>(null)
  const [questao, definirQuestao] = useState<string | null>(null)
  const [foco, definirFoco] = useState(false)
  const [selecao, definirSelecao] = useState<Selecao | null>(null)
  const [aberta, definirAberta] = useState<{ id: string; x: number; y: number; embaixo: boolean } | null>(null)
  const [reassociar, definirReassociar] = useState<string | null>(null)
  const [aviso, definirAviso] = useState<AvisoLeitor | null>(null)
  const [busca, definirBusca] = useState('')

  // Questão aberta ao lado: entra no histórico, para o Voltar do navegador (e do celular) fechar só ela
  // e devolver a leitura no mesmo parágrafo; o foco volta ao chip que a abriu.
  const origemQuestao = useRef<HTMLElement | null>(null)
  const fecharQuestaoBotao = useRef<HTMLButtonElement>(null)
  const naHistoria = () => !!(history.state as { lrQuestao?: string } | null)?.lrQuestao
  const abrirQuestao = useCallback((idQ: string) => {
    origemQuestao.current = document.activeElement as HTMLElement | null
    definirQuestao(idQ)
    if (!naHistoria()) history.pushState({ ...(history.state ?? {}), lrQuestao: idQ }, '')
  }, [])
  const fecharQuestao = useCallback(() => { if (naHistoria()) history.back(); else definirQuestao(null) }, [])
  useEffect(() => {
    const voltou = () => { if (!naHistoria()) definirQuestao(null) }
    window.addEventListener('popstate', voltou)
    return () => window.removeEventListener('popstate', voltou)
  }, [])
  useEffect(() => {
    if (questao) { fecharQuestaoBotao.current?.focus({ preventScroll: true }); return }
    origemQuestao.current?.focus({ preventScroll: true }); origemQuestao.current = null
  }, [questao])

  const rolagem = useRef<HTMLDivElement>(null)
  const pagina = useRef<HTMLElement>(null)
  usarSemCopia(pagina)
  const paginado = pref.modo === 'paginado'
  const [paginas, definirPaginasEstado] = useState({ atual: 0, total: 1, passo: 0 })
  // Ref junto com o estado: os callbacks de rolagem leem a página atual sem ficar com valor antigo.
  const paginasRef = useRef(paginas)
  const definirPaginas = useCallback((f: typeof paginas | ((p: typeof paginas) => typeof paginas)) => {
    definirPaginasEstado((p) => { const n = typeof f === 'function' ? f(p) : f; paginasRef.current = n; return n })
  }, [])
  const [progresso, definirProgresso] = useState(leitura?.progresso ?? 0)
  const posicao = useRef<{ bloco: string; fracao: number } | null>(null)
  const [secaoAtual, definirSecaoAtual] = useState<string | null>(null)

  const elementoDoBloco = (b: string) => pagina.current?.querySelector<HTMLElement>(`[data-bloco="${CSS.escape(b)}"]`) ?? null

  // ── Paginado: colunas CSS do tamanho da tela; uma "página" = uma coluna ──
  const [geometria, definirGeometria] = useState({ largura: 0, altura: 0 })
  useLayoutEffect(() => {
    const el = rolagem.current
    if (!el) return
    const medir = () => definirGeometria({ largura: el.clientWidth, altura: el.clientHeight })
    medir()
    const ro = new ResizeObserver(medir); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const colunaLargura = Math.min(LARGURA[pref.largura], Math.max(260, geometria.largura - 48))
  const vao = Math.max(48, geometria.largura - colunaLargura)
  const estiloPagina: CSSProperties = {
    ['--lr-fonte' as string]: `${pref.fonte}px`, ['--lr-entrelinha' as string]: String(pref.entrelinha), ['--lr-largura' as string]: `${LARGURA[pref.largura]}px`,
    ...(paginado && geometria.largura ? { width: colunaLargura, marginLeft: vao / 2, columnWidth: colunaLargura, columnGap: vao, height: geometria.altura } : {}),
  }

  const medirPaginas = useCallback(() => {
    const el = rolagem.current, art = pagina.current
    if (!el || !art || !paginado) return
    const passo = colunaLargura + vao
    const total = Math.max(1, Math.round((art.scrollWidth + vao) / passo))
    definirPaginas((p) => ({ atual: Math.min(p.atual, total - 1), total, passo }))
  }, [paginado, colunaLargura, vao, definirPaginas])

  /** O bloco no topo da tela agora e quanto dele já passou. */
  const lerPosicao = useCallback((): { bloco: string; fracao: number } | null => {
    const el = rolagem.current, art = pagina.current
    if (!el || !art) return null
    const caixa = el.getBoundingClientRect()
    const blocos = art.querySelectorAll<HTMLElement>('[data-bloco]')
    for (const b of blocos) {
      const r = b.getBoundingClientRect()
      const visivel = paginado ? r.right > caixa.left + 8 && r.left < caixa.right - 8 && r.bottom > caixa.top : r.bottom > caixa.top + 72
      if (!visivel) continue
      const fracao = paginado ? 0 : Math.min(1, Math.max(0, (caixa.top + 72 - r.top) / Math.max(1, r.height)))
      return { bloco: b.dataset.bloco!, fracao }
    }
    return null
  }, [paginado])

  const irPara = useCallback((bloco: string, fracao = 0, piscar = false) => {
    const el = rolagem.current, alvo = elementoDoBloco(bloco)
    if (!el || !alvo) return
    if (paginado) {
      const caixa = el.getBoundingClientRect(), r = alvo.getBoundingClientRect()
      const passo = colunaLargura + vao
      const atual = Math.max(0, Math.floor((r.left - caixa.left + el.scrollLeft - vao / 2 + 4) / passo))
      el.scrollLeft = atual * passo
      definirPaginas((p) => ({ ...p, atual }))
    } else {
      const caixa = el.getBoundingClientRect(), r = alvo.getBoundingClientRect()
      el.scrollTop += r.top - caixa.top - 72 + r.height * fracao
    }
    if (piscar) { alvo.classList.remove('lr-piscar'); void alvo.offsetWidth; alvo.classList.add('lr-piscar'); setTimeout(() => alvo.classList.remove('lr-piscar'), 2600) }
  }, [paginado, colunaLargura, vao])

  // ── Abrir: volta à última posição (ou ao bloco pedido no endereço, destacado) ──
  const abriu = useRef(false)
  useLayoutEffect(() => {
    if (abriu.current || !geometria.largura) return
    abriu.current = true
    medirPaginas()
    // Link (?bloco=) para uma parte fechada ao visitante: abre direto na porta, que diz qual parte era.
    const alvo = porta.pedida ? 'porta' : blocoInicial && elementoDoBloco(blocoInicial) ? blocoInicial : leitura?.bloco
    if (alvo) requestAnimationFrame(() => irPara(alvo, blocoInicial ? 0 : leitura?.deslocamento ?? 0, !!blocoInicial && !porta.pedida))
    if (!blocoInicial && leitura?.bloco && (leitura.progresso ?? 0) > 2) {
      const secao = capitulo.secoes.find((s) => s.id === secaoDe.get(leitura.bloco) || `h-${s.id}` === leitura.bloco)
      definirAviso({ texto: `Continuando de onde você parou${secao ? `: ${secao.titulo}` : ''}.`, acao: { rotulo: 'Ir ao início', fazer: () => { const el = rolagem.current; if (el) { el.scrollTop = 0; el.scrollLeft = 0; definirPaginas((p) => ({ ...p, atual: 0 })) } } } })
    }
    bib.salvarLeitura(capitulo.id, { aberturas: [Date.now(), ...(leitura?.aberturas ?? [])].slice(0, 20) })
  }, [geometria.largura]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fonte, largura, modo: guarda o trecho antes e volta a ele depois do novo layout.
  const layout = `${pref.modo}|${pref.fonte}|${pref.entrelinha}|${pref.largura}|${pref.fonteFamilia}|${pref.prova}|${geometria.largura}x${geometria.altura}`
  const layoutAnterior = useRef(layout)
  useLayoutEffect(() => {
    if (layoutAnterior.current === layout) return
    layoutAnterior.current = layout
    const p = posicao.current
    medirPaginas()
    if (p) { const el = rolagem.current; if (el && !paginado) el.scrollLeft = 0; irPara(p.bloco, p.fracao) }
  }, [layout]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Salvar a posição (com folga: não grava a cada pixel) ──
  const temporizador = useRef<ReturnType<typeof setTimeout>>()
  // Tempo de leitura ativa (emblemas dos resumos): vai na mesma gravação da posição (src/biblioteca/tempoLeitura.ts).
  const cronometro = useRef(novoCronometro())
  /** `forcar`: ao sair ou esconder a aba, grava também o tempo que sobrou. */
  const salvarAgora = useCallback((forcar = false) => {
    clearTimeout(temporizador.current)
    const p = posicao.current
    const tempo = retirarTempo(cronometro.current, forcar)
    if (!p && !tempo) return
    const pct = Math.round(progressoAtual())
    bib.salvarLeitura(capitulo.id, p ? { bloco: p.bloco, deslocamento: Math.round(p.fracao * 100) / 100, progresso: pct, ...(pct >= 98 && !leitura?.concluidoEm && !porta.fechado ? { concluidoEm: Date.now() } : {}) } : {}, tempo)
  }, [capitulo.id, leitura?.concluidoEm, porta.fechado]) // eslint-disable-line react-hooks/exhaustive-deps
  /** Com a porta, o fim do texto visível é a parte 6, não o fim do resumo: o progresso conta só a fração aberta. */
  function progressoAtual() {
    return progressoDaTela() * (porta.fechado ? porta.abertas / capitulo.secoes.length : 1)
  }
  function progressoDaTela() {
    const el = rolagem.current
    if (!el) return 0
    const pg = paginasRef.current
    if (paginado) return pg.total <= 1 ? 100 : (Math.round(el.scrollLeft / Math.max(1, pg.passo)) / (pg.total - 1)) * 100
    const max = el.scrollHeight - el.clientHeight
    return max <= 0 ? 100 : (el.scrollTop / max) * 100
  }
  const aoRolar = useCallback(() => {
    registrarAtividade(cronometro.current)
    posicao.current = lerPosicao()
    definirProgresso(progressoAtual())
    const b = posicao.current?.bloco
    if (b) definirSecaoAtual(b.startsWith('h-') ? b.slice(2) : secaoDe.get(b) ?? null)
    clearTimeout(temporizador.current)
    temporizador.current = setTimeout(salvarAgora, 1200)
  }, [lerPosicao, salvarAgora, secaoDe]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const sair = () => { if (document.visibilityState === 'hidden') salvarAgora(true) }
    const fechar = () => salvarAgora(true)
    document.addEventListener('visibilitychange', sair)
    window.addEventListener('pagehide', fechar)
    return () => { document.removeEventListener('visibilitychange', sair); window.removeEventListener('pagehide', fechar); salvarAgora(true) }
  }, [salvarAgora])
  // O relógio da leitura ativa: um passo a cada PASSO_MS; parado sem mexer há 2 minutos ou com a aba escondida.
  useEffect(() => {
    const mexeu = () => registrarAtividade(cronometro.current)
    const eventos = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const
    for (const e of eventos) window.addEventListener(e, mexeu, { passive: true })
    const relogio = setInterval(() => {
      passoCronometro(cronometro.current, document.visibilityState === 'visible')
      // Lendo sem rolar (uma tabela, uma figura): grava o tempo sozinho de vez em quando.
      if (cronometro.current.pendente >= GRAVAR_SOZINHO_S) salvarAgora()
    }, PASSO_MS)
    return () => { clearInterval(relogio); for (const e of eventos) window.removeEventListener(e, mexeu) }
  }, [salvarAgora])

  const mudarPagina = useCallback((delta: number) => {
    const el = rolagem.current
    if (!el || !paginado) return
    definirPaginas((p) => {
      const atual = Math.max(0, Math.min(p.total - 1, p.atual + delta))
      el.scrollTo({ left: atual * p.passo, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      return { ...p, atual }
    })
    setTimeout(aoRolar, 350)
  }, [paginado, aoRolar])

  // ── Seleção de texto → menu flutuante ──
  const posicaoNoBloco = (no: Node, deslocamento: number): { bloco: string; offset: number } | null => {
    const el = (no.nodeType === Node.TEXT_NODE ? no.parentElement : no as Element)?.closest<HTMLElement>('[data-texto]')
    if (!el || !pagina.current?.contains(el)) return null
    const r = document.createRange(); r.setStart(el, 0); r.setEnd(no, deslocamento)
    return { bloco: el.dataset.texto!, offset: r.toString().length }
  }
  const conferirSelecao = useCallback(() => {
    const s = window.getSelection()
    if (!s || s.isCollapsed || !s.rangeCount) { definirSelecao(null); return }
    const r = s.getRangeAt(0)
    const ini = posicaoNoBloco(r.startContainer, r.startOffset), fim = posicaoNoBloco(r.endContainer, r.endOffset)
    if (!ini || !fim) { definirSelecao(null); return }
    const ancora = criarAncora(capitulo.id, capitulo.versao, ordem, textos, ini, fim)
    if (!ancora) { definirSelecao(null); return }
    const caixa = r.getBoundingClientRect()
    // No toque, o menu do sistema aparece em cima do trecho: o nosso vai embaixo.
    const embaixo = caixa.top < 120 || matchMedia('(pointer: coarse)').matches
    definirAberta(null)
    definirSelecao({ ancora, texto: ancora.trechos.map((t) => t.exato).join('\n'), x: caixa.left + caixa.width / 2, y: embaixo ? caixa.bottom : caixa.top, embaixo, secao: secaoDe.get(ini.bloco) ?? null })
  }, [capitulo.id, capitulo.versao, ordem, textos, secaoDe]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let quadro = 0
    const agendar = () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(conferirSelecao) }
    document.addEventListener('selectionchange', agendar)
    return () => { cancelAnimationFrame(quadro); document.removeEventListener('selectionchange', agendar) }
  }, [conferirSelecao])

  const limparSelecao = () => { window.getSelection()?.removeAllRanges(); definirSelecao(null) }
  function destacar(cor: CorMarca, comNota = false) {
    if (!selecao) return
    if (reassociar) {
      bib.editarMarca(reassociar, { ancora: selecao.ancora })
      definirReassociar(null); limparSelecao(); definirAviso({ texto: 'Marcação associada ao novo trecho.' })
      return
    }
    const m = bib.criarMarca(capitulo.id, selecao.ancora, cor)
    const { x, y, embaixo } = selecao
    limparSelecao()
    if (comNota) definirAberta({ id: m.id, x, y, embaixo })
  }
  const questoesDaSecao = (secao: string | null) => {
    const s = capitulo.secoes.find((x) => x.id === secao)
    return s?.blocos.find((b): b is Extract<Bloco, { tipo: 'questoes' }> => b.tipo === 'questoes') ?? null
  }

  // Toque numa marcação existente (sem seleção ativa) abre o cartão dela.
  function aoClicarTexto(e: React.MouseEvent) {
    const alvo = (e.target as HTMLElement).closest<HTMLElement>('[data-marca]')
    // Páginas: tocar na borda esquerda ou direita vira a página, como num leitor de livros.
    if (!alvo && paginado && window.getSelection()?.isCollapsed && !(e.target as HTMLElement).closest('button, a, input, textarea')) {
      const borda = Math.min(90, window.innerWidth * 0.14)
      if (e.clientX < borda) { mudarPagina(-1); return }
      if (e.clientX > window.innerWidth - borda) { mudarPagina(1); return }
    }
    if (!alvo || !window.getSelection()?.isCollapsed) return
    const caixa = alvo.getBoundingClientRect()
    const embaixo = caixa.top < 160
    definirSelecao(null)
    definirAberta({ id: alvo.dataset.marca!, x: caixa.left + caixa.width / 2, y: embaixo ? caixa.bottom : caixa.top, embaixo })
  }

  // Tocar fora do cartão da marcação fecha o cartão (e salva a nota, pelo onBlur).
  useEffect(() => {
    if (!aberta) return
    const fora = (e: PointerEvent) => { const t = e.target as HTMLElement; if (!t.closest('.lr-cartao') && !t.closest('[data-marca]')) definirAberta(null) }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  }, [aberta])

  // ── Marcador de página (fita na margem do bloco no topo) ──
  const blocoTopo = () => posicao.current?.bloco ?? lerPosicao()?.bloco
  const marcadorAtual = resolvidas.find(({ marca, r }) => marca.marcador && r.trechos[0]?.bloco === blocoTopo())
  function alternarMarcador() {
    const b = blocoTopo()
    if (!b) return
    if (marcadorAtual) { const idM = marcadorAtual.marca.id; bib.apagarMarca(idM); definirAviso({ texto: 'Marcador removido.', desfazer: () => bib.restaurarMarca(idM) }); return }
    const texto = textos.get(b)
    if (!texto) return
    const ancora = criarAncora(capitulo.id, capitulo.versao, ordem, textos, { bloco: b, offset: 0 }, { bloco: b, offset: Math.min(texto.length, 80) })
    if (ancora) { bib.criarMarca(capitulo.id, ancora, 'amarelo', { marcador: true }); definirAviso({ texto: 'Página marcada. Ela fica em Notas, na lista de marcadores.', acao: { rotulo: 'Ver marcadores', fazer: () => definirPainel('notas') } }) }
  }

  // ── Teclado ──
  useEffect(() => {
    // Com os flashcards abertos por cima, as teclas são deles (Espaço vira o flashcard, não a página do resumo).
    if (deFundo || guia) return
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, [contenteditable="true"]')) { if (e.key === 'Escape') (e.target as HTMLElement).blur(); return }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') { if (questao) fecharQuestao(); else if (aberta || selecao) { definirAberta(null); limparSelecao() } else if (painel) definirPainel(null); else if (foco) definirFoco(false); return }
      if (questao) return
      if (paginado && (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ')) { e.preventDefault(); mudarPagina(1) }
      else if (paginado && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { e.preventDefault(); mudarPagina(-1) }
      else if (e.key === '/') { e.preventDefault(); definirPainel('busca') }
      else if (e.key === 'i') definirPainel((p) => p === 'indice' ? null : 'indice')
      else if (e.key === 'n') definirPainel((p) => p === 'notas' ? null : 'notas')
      else if (e.key === 'f') definirFoco((f) => !f)
      else if (e.key === '?') definirGuia(true)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [paginado, mudarPagina, painel, questao, aberta, selecao, foco, deFundo, guia, abrirQuestao, fecharQuestao])

  // Deslizar no modo paginado (sem atrapalhar a seleção de texto).
  const toque = useRef<{ x: number; y: number; t: number } | null>(null)
  const aoTocar = (e: React.TouchEvent) => { const t = e.touches[0]; toque.current = { x: t.clientX, y: t.clientY, t: Date.now() } }
  const aoSoltar = (e: React.TouchEvent) => {
    const i = toque.current; toque.current = null
    if (!i || !paginado || !window.getSelection()?.isCollapsed) return
    const t = e.changedTouches[0], dx = t.clientX - i.x, dy = t.clientY - i.y
    if (Date.now() - i.t < 600 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) mudarPagina(dx < 0 ? 1 : -1)
  }

  // ── Busca no capítulo (realce pela CSS Custom Highlight API, sem mexer no DOM) ──
  const resultados = useMemo(() => {
    const q = normalizar(busca.trim())
    if (q.length < 2) return []
    const r: Array<{ bloco: string; antes: string; achado: string; depois: string; secao: string }> = []
    for (const b of ordem) {
      const t = textos.get(b) ?? '', n = normalizar(t)
      const i = n.indexOf(q)
      if (i < 0) continue
      r.push({ bloco: b, antes: t.slice(Math.max(0, i - 50), i), achado: t.slice(i, i + q.length), depois: t.slice(i + q.length, i + q.length + 70), secao: capitulo.secoes.find((s) => s.id === secaoDe.get(b))?.titulo ?? '' })
    }
    return r
  }, [busca, ordem, textos, secaoDe, capitulo.secoes])
  useEffect(() => {
    const api = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights
    const H = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight
    if (!api || !H) return
    api.delete('lr-busca')
    const q = normalizar(busca.trim())
    if (painel !== 'busca' || q.length < 2 || !pagina.current) return
    const faixas: Range[] = []
    for (const el of pagina.current.querySelectorAll<HTMLElement>('[data-texto]')) {
      const andador = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      for (let no = andador.nextNode(); no; no = andador.nextNode()) {
        const n = normalizar(no.textContent ?? '')
        for (let i = n.indexOf(q); i >= 0; i = n.indexOf(q, i + q.length)) { const r = document.createRange(); r.setStart(no, i); r.setEnd(no, i + q.length); faixas.push(r) }
      }
    }
    api.set('lr-busca', new H(...faixas))
    return () => { api.delete('lr-busca') }
  }, [busca, painel, layout])

  // Treinar o capítulo: uma sessão com as questões de prova real citadas (e as de treino), na ordem do texto.
  const { iniciarComAviso } = usarSessao()
  const idsDoCapitulo = useMemo(() => [...new Set(capitulo.secoes.flatMap((s) => s.blocos.flatMap((b) => b.tipo === 'questoes' ? [...questoesReais(b), ...b.treino] : [])))], [capitulo])
  async function treinarCapitulo() {
    salvarAgora(true)
    if (!premium) { navegar('/assinatura'); return }
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, areas: AREAS_TREINO, embaralhar: false, limite: idsDoCapitulo.length }, idsDoCapitulo))) return
    navegar('/sessao')
  }
  const minutosRestantes = Math.max(1, Math.round(capitulo.minutos * (1 - Math.min(100, progresso) / 100)))

  const aberto = aberta ? resolvidas.find(({ marca }) => marca.id === aberta.id)?.marca ?? null : null
  const orfas = resolvidas.filter(({ r }) => r.estado === 'orfa')
  const destaquesDoCapitulo = doCapitulo.filter((m) => !m.marcador).length
  const progressoSecoes = useMemo(() => {
    const idx = posicao.current ? ordem.indexOf(posicao.current.bloco) : -1
    return new Set(capitulo.secoes.filter((s) => { const ultimo = [...s.blocos].reverse().find(ehTexto); return ultimo && idx >= ordem.indexOf(ultimo.id) }).map((s) => s.id))
  }, [progresso, capitulo.secoes, ordem]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`lr lr--${pref.tema}${painel ? ' lr--com-painel' : ''}${foco ? ' lr--foco' : ''}${paginado ? ' lr--paginado' : ''}${pref.fonteFamilia === 'sem-serifa' ? ' lr--sem-serifa' : ''}${pref.justificar ? ' lr--justificado' : ''}${pref.prova ? '' : ' lr--sem-prova'}${deFundo ? ' lr--fundo' : ''}`} data-tema-leitor={pref.tema}>
      <header className="lr-barra">
        <a className="lr-botao lr-botao--voltar" href={href(voltarAEstante())} aria-label="Voltar à Biblioteca" title="Voltar à Biblioteca"><Icone nome="esquerda" tamanho={20} /><span className="lr-botao__rotulo">Biblioteca</span></a>
        <div className="lr-barra__titulo" data-guia="lr-trilha">
          <small className="lr-barra__livro">{rotuloLivro(capitulo)} · Cap. {numeroCapitulo(capitulo)}</small>
          <strong>{capitulo.titulo}</strong>
          <span className={`lr-salvo lr-salvo--${salvamento.estado}`} title={salvamento.detalhe} role="status" aria-live="polite">
            <i aria-hidden="true" />{salvamento.texto}{progresso > 1 && !porta.fechado ? <span className="lr-salvo__pct numerico"> · {Math.round(Math.min(100, progresso))}% lido</span> : null}
          </span>
        </div>
        <div className="lr-barra__acoes">
          <button type="button" className="lr-botao" data-guia="lr-indice" onClick={() => definirPainel(painel === 'indice' ? null : 'indice')} aria-pressed={painel === 'indice'} aria-label="Índice" title="Índice (i)"><Icone nome="menu" tamanho={20} /><span className="lr-botao__rotulo">Índice</span></button>
          <button type="button" className="lr-botao" data-guia="lr-busca" onClick={() => definirPainel(painel === 'busca' ? null : 'busca')} aria-pressed={painel === 'busca'} aria-label="Buscar no capítulo" title="Buscar no capítulo (/)"><Icone nome="busca" tamanho={20} /><span className="lr-botao__rotulo">Buscar</span></button>
          <button type="button" className="lr-botao" data-guia="lr-marcador" onClick={alternarMarcador} aria-pressed={!!marcadorAtual} aria-label={marcadorAtual ? 'Remover o marcador desta página' : 'Marcar esta página'} title={marcadorAtual ? 'Página marcada: toque para remover' : 'Marcar esta página para voltar depois'}><Icone nome="bandeira" tamanho={19} /><span className="lr-botao__rotulo">{marcadorAtual ? 'Marcada' : 'Marcar página'}</span></button>
          <button type="button" className="lr-botao" data-guia="lr-notas" onClick={() => definirPainel(painel === 'notas' ? null : 'notas')} aria-pressed={painel === 'notas'} aria-label={`Destaques, notas e marcadores${doCapitulo.length ? ` (${doCapitulo.length})` : ''}`} title="Destaques, notas e marcadores (n)"><Icone nome="lapis" tamanho={19} /><span className="lr-botao__rotulo">Notas</span>{doCapitulo.length > 0 && <small className="lr-botao__n numerico" aria-hidden="true">{doCapitulo.length}</small>}</button>
          <button type="button" className="lr-botao lr-botao--aa" data-guia="lr-aa" onClick={() => definirPainel(painel === 'aparencia' ? null : 'aparencia')} aria-pressed={painel === 'aparencia'} aria-label="Aparência do texto" title="Aparência: tema, letra, espaçamento e largura"><span className="lr-botao__aa" aria-hidden="true">AA</span><span className="lr-botao__rotulo">Aparência</span></button>
          <button type="button" className="lr-botao lr-botao--foco" onClick={() => definirFoco(!foco)} aria-pressed={foco} aria-label="Modo concentração" title="Concentração: só o texto (f)"><Icone nome="olho" tamanho={19} /></button>
          <button type="button" className="lr-botao lr-botao--ajuda" onClick={() => { definirPainel(null); definirGuia(true) }} aria-label="Ajuda do leitor" title="Ajuda do leitor (?)"><Icone nome="interrogacao" tamanho={19} /></button>
        </div>
        <span className="lr-progresso" role="progressbar" aria-label="Progresso no capítulo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, progresso))}><span style={{ width: `${Math.min(100, progresso)}%` }} /></span>
      </header>

      <div className="lr-rolagem" ref={rolagem} onScroll={aoRolar} onTouchStart={aoTocar} onTouchEnd={aoSoltar}>
        <article className="lr-pagina" ref={pagina} style={estiloPagina} onClick={aoClicarTexto} lang="pt-BR">
          <header className="lr-capa">
            <nav className="lr-trilha" aria-label="Trilha"><ol>
              <li><a href={href(voltarAEstante())}>Biblioteca</a></li>
              <li><a href={href(`/resumos?livro=${encodeURIComponent(chaveLivro(capitulo))}`)}>{rotuloLivro(capitulo)}</a></li>
              <li aria-current="page">Cap. {numeroCapitulo(capitulo)}</li>
            </ol></nav>
            <div className="lr-capa__topo">
              <p className="lr-capa__numero" aria-hidden="true">Capítulo <b>{numeroCapitulo(capitulo)}</b></p>
              <div>
                <p className="lr-capa__selo">Resumo OrtoQuestões · {indice?.temas.find((t) => t.slug === capitulo.especialidade)?.nome ?? capitulo.especialidade}</p>
                <h1>{capitulo.titulo}</h1>
              </div>
            </div>
            <p className="lr-capa__ref">A partir de <cite>{capitulo.livro}</cite>, {capitulo.edicao}. {capitulo.capitulo}. {capitulo.autores}.</p>
            <p className="lr-capa__meta"><span>~{capitulo.minutos} min de leitura</span>{idsDoCapitulo.length > 0 && <span>{idsDoCapitulo.length} questões citadas</span>}{leitura?.concluidoEm && <span className="lr-capa__ok"><Icone nome="certo" tamanho={14} /> Concluído</span>}{alvoFc && <a className="lr-capa__fc" href={href(linkFlashcards(alvoFc, capitulo.titulo))}><Icone nome="raio" tamanho={14} /> Estudar flashcards deste tema</a>}</p>
            <p className="lr-capa__dica">Selecione qualquer trecho para destacar ou anotar. Tudo fica salvo na sua conta.</p>
            {porta.fechado && <p className="lr-capa__porta">Sem conta, você lê as {SECOES_ABERTAS} primeiras das {capitulo.secoes.length} partes. A leitura completa é grátis com a conta: <a href={href(linkDaPorta('criar', capitulo.id, porta))}>criar conta grátis</a>.</p>}
          </header>
          {secoesVisiveis.map((s) => {
            const reais = new Set(s.blocos.flatMap((b) => b.tipo === 'questoes' ? questoesReais(b) : []))
            return (
              <section key={s.id} className="lr-secao" id={`secao-${s.id}`} aria-labelledby={`t-${s.id}`}>
                <h2 id={`t-${s.id}`} data-bloco={`h-${s.id}`}>{s.titulo}</h2>
                <p className={`lr-radar lr-radar--${s.radar}`} title={RADAR[s.radar].texto}>
                  {s.radar === 'confirmado' ? (reais.size ? <>{RADAR.confirmado.rotulo} · {reais.size} {reais.size === 1 ? 'questão' : 'questões'}</> : 'Nenhuma questão encontrada no conjunto analisado') : RADAR[s.radar].rotulo}
                </p>
                <Blocos blocos={s.blocos} porBloco={porBloco} marcadores={marcadores} capitulo={capitulo} indice={indice} aoAbrirQuestao={abrirQuestao} />
              </section>
            )
          })}
          {porta.fechado && <PortaLeitura capitulo={capitulo.id} numeroCapitulo={capitulo.capitulo.match(/\d+/)?.[0]} porta={porta} restantes={capitulo.secoes.slice(porta.abertas)} />}
          {!porta.fechado && capitulo.subtemas?.length ? <FrasesDoTema subtemas={capitulo.subtemas} /> : null}
          {porta.fechado ? <p className="lr-capa__ref">Texto autoral do OrtoQuestões, com as ideias e os números do capítulo; não substitui a leitura do original.</p> : <footer className="lr-fim" data-bloco="fim" aria-labelledby="lr-fim-titulo">
            <div className="lr-fim__cartao">
              <span className="lr-fim__selo" aria-hidden="true"><Icone nome="certo" tamanho={22} /></span>
              <div><strong id="lr-fim-titulo">Você concluiu {capitulo.titulo}</strong><span>{rotuloLivro(capitulo)} · Cap. {numeroCapitulo(capitulo)}. Agora, fixe com as questões: elas voltam na revisão no tempo certo.</span></div>
            </div>
            <ul className="lr-fim__grade">
              {idsDoCapitulo.length > 0 && <li><button type="button" className="lr-fim__acao lr-fim__acao--forte" onClick={treinarCapitulo}><Icone nome={premium ? 'alvo' : 'cadeado'} tamanho={20} /><span><strong>Praticar as {idsDoCapitulo.length} questões</strong><small>{premium ? 'Uma sessão com as questões citadas, na ordem do texto' : 'Para assinantes: gabarito, comentário e revisão'}</small></span></button></li>}
              {proximo && <li><a className="lr-fim__acao" href={href(`/resumos/${proximo.id}`)}><Icone nome="direita" tamanho={20} /><span><strong>Próximo capítulo</strong><small>Cap. {numeroCapitulo(proximo)} · {proximo.titulo} · ~{proximo.minutos} min</small></span></a></li>}
              {destaquesDoCapitulo > 0 && <li><button type="button" className="lr-fim__acao" onClick={() => definirPainel('notas')}><Icone nome="lapis" tamanho={20} /><span><strong>Revisar meus destaques</strong><small>{destaquesDoCapitulo} {destaquesDoCapitulo === 1 ? 'destaque' : 'destaques'} neste capítulo</small></span></button></li>}
              {alvoFc && <li><a className="lr-fim__acao" href={href(linkFlashcards(alvoFc, capitulo.titulo))}><Icone nome="raio" tamanho={20} /><span><strong>Flashcards deste tema</strong><small className="numerico">{alvoFc.total} cartões</small></span></a></li>}
              <li><a className="lr-fim__acao" href={href(voltarAEstante())}><Icone nome="livro" tamanho={20} /><span><strong>Voltar à Biblioteca</strong><small>{proximo ? 'Escolher outro capítulo' : 'Este é o último capítulo publicado deste livro por enquanto'}</small></span></a></li>
            </ul>
            <p className="lr-capa__ref">Fonte: {capitulo.fonte}. Texto autoral do OrtoQuestões, com as ideias e os números do capítulo; não substitui a leitura do original. <a href={href('/resumos/caderno')}>Meu caderno de estudo</a>.</p>
          </footer>}
        </article>
      </div>

      {paginado && <nav className="lr-paginas" aria-label="Páginas">
        <button type="button" className="lr-botao" onClick={() => mudarPagina(-1)} disabled={paginas.atual === 0} aria-label="Página anterior"><Icone nome="esquerda" tamanho={20} /></button>
        <span className="numerico">{paginas.atual + 1} de {paginas.total} · ~{minutosRestantes} min restantes</span>
        <button type="button" className="lr-botao" onClick={() => mudarPagina(1)} disabled={paginas.atual >= paginas.total - 1} aria-label="Próxima página"><Icone nome="direita" tamanho={20} /></button>
      </nav>}
      {!paginado && !porta.fechado && progresso > 1 && progresso < 99 && <p className="lr-restante numerico" aria-hidden="true">{Math.round(progresso)}% · ~{minutosRestantes} min restantes</p>}
      {foco && <button type="button" className="lr-sair-foco" onClick={() => definirFoco(false)}>Sair da concentração</button>}

      {selecao && <MenuSelecao selecao={selecao} reassociando={!!reassociar} temQuestoes={!!questoesDaSecao(selecao.secao)} aoCor={(c) => destacar(c)} aoNota={() => destacar('amarelo', true)}        aoQuestoes={() => { const q = questoesDaSecao(selecao.secao); limparSelecao(); if (q) { irPara(q.id, 0, true) } }} aoCancelarReassociar={() => { definirReassociar(null); limparSelecao() }} />}
      {aberto && aberta && <CartaoMarca marca={aberto} pos={aberta} aoFechar={() => definirAberta(null)} aoCor={(c) => bib.editarMarca(aberto.id, { cor: c })} aoNota={(nota) => bib.editarMarca(aberto.id, { nota })}
        aoFavorita={() => bib.editarMarca(aberto.id, { favorita: !aberto.favorita })}        aoResolverConflito={(notas, nota) => bib.editarMarca(aberto.id, { notasDeOutroAparelho: notas, ...(nota !== undefined ? { nota } : {}) })}
        aoApagar={() => { const idM = aberto.id; bib.apagarMarca(idM); definirAberta(null); definirAviso({ texto: 'Destaque removido.', desfazer: () => bib.restaurarMarca(idM) }) }} />}

      {painel && <aside className={`lr-painel lr-painel--${painel}`} aria-labelledby="lr-painel-titulo">
        <header className="lr-painel__topo"><strong id="lr-painel-titulo">{painel === 'indice' ? 'Índice' : painel === 'notas' ? 'Destaques, notas e marcadores' : painel === 'busca' ? 'Buscar no capítulo' : 'Aparência'}</strong><button type="button" className="lr-botao" onClick={() => definirPainel(null)} aria-label="Fechar o painel" title="Fechar (Esc)"><Icone nome="fechar" tamanho={18} /></button></header>
        {painel === 'indice' && <div className="lr-indice__caixa"><p className="lr-indice__resumo numerico">{Math.round(Math.min(100, progresso))}% lido · ~{minutosRestantes} min restantes</p><ol className="lr-indice">{capitulo.secoes.map((s, i) => { const fechada = i >= porta.abertas; const atual = s.id === secaoAtual; return <li key={s.id} className={fechada ? 'lr-indice--fechada' : atual ? 'lr-indice--atual' : progressoSecoes.has(s.id) ? 'lr-indice--lida' : ''}>
          <button type="button" aria-current={atual ? 'location' : undefined} onClick={() => { irPara(fechada ? 'porta' : `h-${s.id}`, 0, fechada); if (matchMedia('(max-width: 52rem)').matches) definirPainel(null) }} aria-label={fechada ? `${s.titulo} (crie a conta grátis para ler)` : undefined}><span>{s.titulo}</span>{fechada && <span className="lr-indice__cadeado" title="Leitura completa grátis com conta"><Icone nome="cadeado" tamanho={14} /></span>}{atual && <span className="lr-indice__aqui">Você está aqui</span>}<i className={`lr-ponto lr-ponto--${s.radar}`} title={RADAR[s.radar].rotulo} /></button>
        </li> })}</ol></div>}
        {painel === 'busca' && <div className="lr-busca">
          <input type="search" autoFocus value={busca} onChange={(e) => definirBusca(e.target.value)} placeholder="Ex.: Garden, Pauwels, cimentada" aria-label="Buscar no capítulo" />
          {busca.trim().length >= 2 && <p className="lr-busca__n">{resultados.length ? `${resultados.length} ${resultados.length === 1 ? 'trecho' : 'trechos'}` : 'Nada encontrado neste capítulo.'}</p>}
          <ul>{resultados.slice(0, 60).map((r) => <li key={r.bloco}><button type="button" onClick={() => { irPara(elementoDoBloco(r.bloco) ? r.bloco : 'porta', 0, true); if (matchMedia('(max-width: 52rem)').matches) definirPainel(null) }}><small>{r.secao}</small><span>…{r.antes}<mark>{r.achado}</mark>{r.depois}…</span></button></li>)}</ul>
        </div>}
        {painel === 'notas' && <PainelNotas resolvidas={resolvidas} ordem={ordem} orfas={orfas} capitulo={capitulo} aoIr={(m, r) => { const t = r.trechos[0]; if (t) irPara(t.bloco, 0, true); if (matchMedia('(max-width: 52rem)').matches) definirPainel(null); void m }}
          aoReassociar={(idM) => { definirReassociar(idM); definirPainel(null); definirAviso({ texto: 'Selecione no texto o trecho novo e toque em "Associar aqui".' }) }} aoApagar={(idM) => { bib.apagarMarca(idM); definirAviso({ texto: 'Marcação removida.', desfazer: () => bib.restaurarMarca(idM) }) }} />}
        {painel === 'aparencia' && <Aparencia pref={pref} aoMudar={definirPreferencias} foco={foco} aoFoco={() => definirFoco(!foco)} />}
      </aside>}

      {questao && <aside className="lr-questao" role="dialog" aria-modal="true" aria-labelledby="lr-questao-titulo">
        <header className="lr-painel__topo"><button type="button" className="lr-botao" ref={fecharQuestaoBotao} onClick={fecharQuestao} aria-label="Voltar à leitura" title="Voltar à leitura (Esc)"><Icone nome="esquerda" tamanho={18} /></button><strong id="lr-questao-titulo">Questão · {rotuloQuestao(indice, questao)}</strong><span className="lr-questao__dica">A leitura continua de onde você parou.</span></header>
        <div className="lr-questao__corpo">{premium
          ? <Suspense fallback={<Carregando linhas={5} />}><QuestaoDireta id={questao} /></Suspense>
          : <ConvitePremium icone="alvo" titulo="Resolva as questões do resumo" texto={<p>Os resumos são abertos para todos. Para fazer as questões citadas no texto, com gabarito, comentário e revisão no tempo certo, assine o OrtoQuestões.</p>} itens={['Todas as questões citadas nos resumos', 'Treinar o capítulo inteiro em uma sessão', 'Cronograma até a prova e Simulado Nacional']} />}</div>
        <footer className="lr-questao__rodape"><button type="button" className="botao botao--principal" onClick={fecharQuestao}><Icone nome="esquerda" tamanho={16} /> Voltar ao parágrafo</button></footer>
      </aside>}
      {questao && <button type="button" className="lr-veu" aria-label="Voltar à leitura" tabIndex={-1} onClick={fecharQuestao} />}

      {aviso && <Aviso aviso={aviso} aoFechar={() => definirAviso(null)} />}
      {guia && <GuiaTour id="leitor" titulo="Ajuda do leitor" passos={PASSOS_LEITOR} rolar={false} aoFechar={() => definirGuia(false)} />}
    </div>
  )
}

// ─── Blocos ───────────────────────────────────────────────────────────────

function Blocos({ blocos, porBloco, marcadores, capitulo, indice, aoAbrirQuestao }: { blocos: Bloco[]; porBloco: Map<string, MarcaNoTexto[]>; marcadores: Set<string | undefined>; capitulo: Capitulo; indice: Indice | null; aoAbrirQuestao: (id: string) => void }) {
  // Itens de lista seguidos viram uma lista só.
  const grupos: Array<Bloco | Bloco[]> = []
  for (const b of blocos) {
    const ultimo = grupos[grupos.length - 1]
    if (b.tipo === 'li' && Array.isArray(ultimo)) ultimo.push(b)
    else grupos.push(b.tipo === 'li' ? [b] : b)
  }
  return <>{grupos.map((g) => {
    if (Array.isArray(g)) return <ul key={g[0].id} className="lr-lista">{g.filter(ehTexto).map((b) => <li key={b.id} data-bloco={b.id} className={marcadores.has(b.id) ? 'lr-marcado' : ''}><Texto bloco={b} marcas={porBloco.get(b.id)} /></li>)}</ul>
    const b = g
    if (b.tipo === 'p') return <p key={b.id} data-bloco={b.id} className={marcadores.has(b.id) ? 'lr-marcado' : ''}><Texto bloco={b} marcas={porBloco.get(b.id)} /></p>
    if (b.tipo === 'h3') return <h3 key={b.id} data-bloco={b.id} className={marcadores.has(b.id) ? 'lr-marcado' : ''}><Texto bloco={b} marcas={porBloco.get(b.id)} /></h3>
    if (b.tipo === 'prova') return <p key={b.id} data-bloco={b.id} className={'lr-naprova' + (marcadores.has(b.id) ? ' lr-marcado' : '')}><span className="lr-naprova__rotulo" aria-hidden="true">Na prova</span><Texto bloco={b} marcas={porBloco.get(b.id)} /></p>
    if (b.tipo === 'questoes') return <CartaoQuestoes key={b.id} bloco={b} indice={indice} aoAbrir={aoAbrirQuestao} />
    if (b.tipo === 'figura') return <Figura key={b.id} bloco={b} capitulo={capitulo} />
    if (b.tipo === 'tabela') return <div key={b.id} className="lr-tabela" data-bloco={b.id}><table><caption>{b.titulo}</caption><thead><tr>{b.cab.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{b.linhas.map((l, i) => <tr key={i}>{l.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
    return null
  })}</>
}

/** O texto de um bloco com as marcações desenhadas. Só texto dentro de [data-texto]: os deslocamentos contam sobre ele. */
function Texto({ bloco, marcas }: { bloco: Extract<Bloco, { t: string }>; marcas?: MarcaNoTexto[] }) {
  const runs = useMemo(() => pedacos(bloco.t), [bloco.t])
  const tamanho = useMemo(() => textoPuro(bloco.t).length, [bloco.t])
  const conteudo = useMemo(() => {
    if (!marcas?.length) return runs.map((r, i) => r.negrito ? <strong key={i}>{r.texto}</strong> : <Fragment key={i}>{r.texto}</Fragment>)
    const faixas = faixasDoBloco(tamanho, marcas)
    const porId = new Map(marcas.map((m) => [m.id, m]))
    const saida: ReactNode[] = []
    let pos = 0, k = 0
    for (const r of runs) {
      const ini = pos, fim = pos + r.texto.length
      pos = fim
      for (const f of faixas) {
        const a = Math.max(ini, f.inicio), b = Math.min(fim, f.fim)
        if (b <= a) continue
        const pedaco = r.texto.slice(a - ini, b - ini)
        const corpo = r.negrito ? <strong>{pedaco}</strong> : pedaco
        if (!f.ids.length) { saida.push(<Fragment key={k++}>{corpo}</Fragment>); continue }
        const topo = porId.get(f.ids[f.ids.length - 1])!
        const comNota = f.ids.some((x) => porId.get(x)?.nota)
        const ultimoPedaco = b === Math.max(...marcas.filter((m) => f.ids.includes(m.id)).map((m) => Math.min(m.fim, tamanho)))
        saida.push(<mark key={k++} data-marca={topo.id} className={`lr-marca lr-marca--${topo.cor}${f.ids.length > 1 ? ' lr-marca--dupla' : ''}${comNota && ultimoPedaco ? ' lr-marca--nota' : ''}`}>{corpo}</mark>)
      }
    }
    return saida
  }, [runs, tamanho, marcas])
  return <span data-texto={bloco.id}>{conteudo}</span>
}

function rotuloQuestao(indice: Indice | null, id: string): string {
  const q = indice?.questoes.find((x) => x.id === id)
  if (!q) return id
  if (q.sim && (q.p === null || q.p === undefined)) return 'Simulado OrtoQuestões'
  const prova = q.p !== null && q.p !== undefined ? indice!.provas[q.p] : ''
  return [prova, q.a].filter(Boolean).join(' ') || id
}

function CartaoQuestoes({ bloco, indice, aoAbrir }: { bloco: Extract<Bloco, { tipo: 'questoes' }>; indice: Indice | null; aoAbrir: (id: string) => void }) {
  const [aberto, definirAberto] = useState(false)
  const reais = questoesReais(bloco)
  const temComo = !!(bloco.como || bloco.armadilhas?.length || bloco.alerta)
  return (
    <aside className={`lr-cobranca${reais.length ? '' : ' lr-cobranca--treino'}`} data-bloco={bloco.id} aria-label={reais.length ? 'Já caiu na prova' : 'Treino'}>
      <p className="lr-cobranca__topo">
        <span className="lr-cobranca__selo">{reais.length ? (reais.length === 1 ? `Já caiu: ${rotuloQuestao(indice, reais[0])}` : `${reais.length} questões de prova sobre isto`) : 'Treine este ponto'}</span>
      </p>
      <p className="lr-cobranca__conceito">{bloco.conceito}</p>
      {reais.length > 0 && <ul className="lr-cobranca__lista">{reais.map((id) => <li key={id}>
        <button type="button" onClick={() => aoAbrir(id)} title={`Resolver a questão ${id}`}><span>{rotuloQuestao(indice, id)}</span>{bloco.central.includes(id) ? <em>conceito central</em> : <em>relacionada</em>}<Icone nome="direita" tamanho={14} /></button>
      </li>)}</ul>}
      {bloco.treino.length > 0 && <p className="lr-cobranca__treino">
        <span>{bloco.treino.length === 1 ? 'Questão de treino:' : 'Questões de treino:'}</span>{bloco.treino.map((id, i) => <button key={id} type="button" onClick={() => aoAbrir(id)} title={`OrtoQuestões Simulados · ${id}`}>{bloco.treino.length === 1 ? 'Resolver' : `Treino ${i + 1}`}</button>)}
      </p>}
      {temComo && <>
        <button type="button" className="lr-cobranca__como" aria-expanded={aberto} onClick={() => definirAberto(!aberto)}>Como isso cai na prova? <Icone nome={aberto ? 'cima' : 'baixo'} tamanho={14} /></button>
        {aberto && <div className="lr-cobranca__analise">
          {bloco.como && <p>{bloco.como}</p>}
          {bloco.armadilhas?.length ? <><p className="lr-cobranca__sub">Armadilhas</p><ul>{bloco.armadilhas.map((a) => <li key={a}>{a}</li>)}</ul></> : null}
          {bloco.alerta && <p className="lr-cobranca__alerta"><Icone nome="alerta" tamanho={15} /> {bloco.alerta}</p>}
        </div>}
      </>}
      {reais.length > 0 && <button type="button" className="lr-cobranca__resolver" onClick={() => aoAbrir(bloco.central[0] ?? reais[0])}>Resolver a questão</button>}
    </aside>
  )
}

function Figura({ bloco, capitulo }: { bloco: Extract<Bloco, { tipo: 'figura' }>; capitulo: Capitulo }) {
  const [ampliada, definirAmpliada] = useState(false)
  const [zoom, definirZoom] = useState(1)
  return (
    <figure className="lr-figura" data-bloco={bloco.id}>
      {bloco.imagem && bloco.licenca === 'autorizada'
        ? <button type="button" className="lr-figura__imagem" onClick={() => definirAmpliada(true)} aria-label={`Ampliar a figura ${bloco.numero}`}><img src={bloco.imagem} alt={bloco.legenda} loading="lazy" /></button>
        : <div className="lr-figura__pendente"><Icone nome="livro" tamanho={22} /><span><strong>Figura {bloco.numero} do capítulo original</strong>Imagem não publicada aqui: a licença de reprodução digital ainda não foi confirmada. Consulte a figura no livro.</span></div>}
      <figcaption><b>Figura {bloco.numero}.</b> {bloco.legenda} <cite>{capitulo.livro}, {capitulo.edicao}.</cite></figcaption>
      {ampliada && bloco.imagem && <div className="lr-luz" role="dialog" aria-modal="true" aria-label={`Figura ${bloco.numero}`} onClick={(e) => { if (e.target === e.currentTarget) definirAmpliada(false) }}>
        <div className="lr-luz__barra"><span>Figura {bloco.numero}</span><button type="button" className="lr-botao" onClick={() => definirZoom((z) => Math.max(1, z - 0.5))} aria-label="Diminuir">−</button><button type="button" className="lr-botao" onClick={() => definirZoom((z) => Math.min(4, z + 0.5))} aria-label="Aumentar">+</button><button type="button" className="lr-botao" onClick={() => definirAmpliada(false)} aria-label="Fechar"><Icone nome="fechar" tamanho={18} /></button></div>
        <div className="lr-luz__area"><img src={bloco.imagem} alt={bloco.legenda} style={{ transform: `scale(${zoom})` }} /></div>
        <p>{bloco.legenda}</p>
      </div>}
    </figure>
  )
}

// ─── Menus e painéis ──────────────────────────────────────────────────────

function posicionar(x: number, y: number, embaixo: boolean): CSSProperties {
  const largura = typeof window !== 'undefined' ? window.innerWidth : 1000
  const esquerda = Math.min(Math.max(12, x), largura - 12)
  return { left: esquerda, top: y, transform: `translate(-50%, ${embaixo ? '12px' : 'calc(-100% - 12px)'})` }
}

function MenuSelecao({ selecao, reassociando, temQuestoes, aoCor, aoNota, aoQuestoes, aoCancelarReassociar }: { selecao: Selecao; reassociando: boolean; temQuestoes: boolean; aoCor: (c: CorMarca) => void; aoNota: () => void; aoQuestoes: () => void; aoCancelarReassociar: () => void }) {
  // Evita perder a seleção ao tocar no menu.
  const segurar = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault()
  if (reassociando) return <div className="lr-menu" style={posicionar(selecao.x, selecao.y, selecao.embaixo)} onPointerDown={segurar} onMouseDown={segurar} role="toolbar" aria-label="Reassociar marcação">
    <button type="button" className="lr-menu__acao lr-menu__acao--forte" onClick={() => aoCor('amarelo')}>Associar aqui</button>
    <button type="button" className="lr-menu__acao" onClick={aoCancelarReassociar}>Cancelar</button>
  </div>
  return (
    <div className="lr-menu" style={posicionar(selecao.x, selecao.y, selecao.embaixo)} onPointerDown={segurar} onMouseDown={segurar} role="toolbar" aria-label="Trecho selecionado">
      <span className="lr-menu__cores">{CORES.map((c) => <button key={c} type="button" className={`lr-cor lr-cor--${c}`} onClick={() => aoCor(c)} aria-label={`Destacar em ${NOME_COR[c].toLowerCase()}`} title={NOME_COR[c]} />)}</span>
      <button type="button" className="lr-menu__acao" onClick={aoNota}><Icone nome="lapis" tamanho={15} /> Nota</button>
      {temQuestoes && <button type="button" className="lr-menu__acao" onClick={aoQuestoes}><Icone nome="alvo" tamanho={15} /> Questões</button>}
    </div>
  )
}

function CartaoMarca({ marca, pos, aoFechar, aoCor, aoNota, aoFavorita, aoApagar, aoResolverConflito }: {
  marca: Marca; pos: { x: number; y: number; embaixo: boolean }; aoFechar: () => void; aoCor: (c: CorMarca) => void; aoNota: (n: string) => void; aoFavorita: () => void; aoApagar: () => void
  aoResolverConflito: (restantes: string[], nota?: string) => void
}) {
  const [nota, definirNota] = useState(marca.nota)
  const temporizador = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => { definirNota(marca.nota) }, [marca.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const mudar = (n: string) => { definirNota(n); clearTimeout(temporizador.current); temporizador.current = setTimeout(() => aoNota(n), 600) }
  useEffect(() => () => clearTimeout(temporizador.current), [])
  const fechar = () => { if (nota !== marca.nota) aoNota(nota); aoFechar() }
  const alternativas = marca.notasDeOutroAparelho ?? []
  return (
    <div className="lr-cartao" style={posicionar(pos.x, pos.y, pos.embaixo)} role="dialog" aria-label="Marcação">
      <div className="lr-cartao__topo">
        <span className="lr-menu__cores">{CORES.map((c) => <button key={c} type="button" className={`lr-cor lr-cor--${c}`} aria-pressed={marca.cor === c} onClick={() => aoCor(c)} aria-label={NOME_COR[c]} />)}</span>
        <button type="button" className="lr-botao" onClick={fechar} aria-label="Fechar"><Icone nome="fechar" tamanho={16} /></button>
      </div>
      <textarea value={nota} onChange={(e) => mudar(e.target.value)} onBlur={() => { if (nota !== marca.nota) aoNota(nota) }} placeholder="Sua nota (ex.: revisar antes do simulado)" rows={3} maxLength={20000} autoFocus={!marca.nota} aria-label="Nota" />
      {alternativas.length > 0 && <div className="lr-conflito">
        <p><Icone nome="alerta" tamanho={14} /> Esta nota foi editada em outro aparelho ao mesmo tempo. Nada foi apagado; escolha o que fica.</p>
        {alternativas.map((a) => <div key={a} className="lr-conflito__item"><blockquote>{a}</blockquote>
          <span><button type="button" onClick={() => { definirNota(a); aoResolverConflito(alternativas.filter((x) => x !== a), a) }}>Usar esta</button>
            <button type="button" onClick={() => { const j = `${nota}\n\n${a}`.trim(); definirNota(j); aoResolverConflito(alternativas.filter((x) => x !== a), j) }}>Juntar</button>
            <button type="button" onClick={() => aoResolverConflito(alternativas.filter((x) => x !== a))}>Descartar</button></span></div>)}
      </div>}
      <div className="lr-cartao__acoes">
        <button type="button" onClick={aoFavorita} aria-pressed={!!marca.favorita}><Icone nome="estrela" tamanho={15} /> {marca.favorita ? 'Favorito' : 'Favoritar'}</button>
        <button type="button" className="lr-cartao__apagar" onClick={aoApagar}><Icone nome="lixeira" tamanho={15} /> Remover</button>
      </div>
    </div>
  )
}

function PainelNotas({ resolvidas, ordem, orfas, capitulo, aoIr, aoReassociar, aoApagar }: { resolvidas: Array<{ marca: Marca; r: AncoraResolvida }>; ordem: string[]; orfas: Array<{ marca: Marca; r: AncoraResolvida }>; capitulo: Capitulo; aoIr: (m: Marca, r: AncoraResolvida) => void; aoReassociar: (id: string) => void; aoApagar: (id: string) => void }) {
  const [cor, definirCor] = useState<CorMarca | null>(null)
  const lista = resolvidas.filter(({ r, marca }) => r.estado !== 'orfa' && !marca.marcador && (!cor || marca.cor === cor))
    .sort((a, b) => ordem.indexOf(a.r.trechos[0]?.bloco) - ordem.indexOf(b.r.trechos[0]?.bloco) || a.r.trechos[0]?.inicio - b.r.trechos[0]?.inicio)
  const marcadores = resolvidas.filter(({ r, marca }) => marca.marcador && r.estado !== 'orfa')
  const secaoDoBloco = (b?: string) => capitulo.secoes.find((s) => s.blocos.some((x) => x.id === b))?.titulo ?? ''
  return (
    <div className="lr-notas">
      <div className="lr-notas__filtro" role="group" aria-label="Filtrar por cor">
        <button type="button" aria-pressed={!cor} onClick={() => definirCor(null)}>Todas</button>
        {CORES.map((c) => <button key={c} type="button" className={`lr-cor lr-cor--${c}`} aria-pressed={cor === c} onClick={() => definirCor(cor === c ? null : c)} aria-label={NOME_COR[c]} />)}
      </div>
      <p className="lr-notas__grupo">{marcadores.length ? `${marcadores.length} ${marcadores.length === 1 ? 'marcador' : 'marcadores'}` : 'Marcadores'}</p>
      {marcadores.length ? <ul className="lr-notas__marcadores">{marcadores.map(({ marca, r }) => <li key={marca.id}><button type="button" onClick={() => aoIr(marca, r)}><small><Icone nome="bandeira" tamanho={12} /> {secaoDoBloco(r.trechos[0]?.bloco)}</small><span>{r.trechos[0]?.exato.slice(0, 80)}…</span></button>
        <button type="button" className="lr-notas__tirar" onClick={() => aoApagar(marca.id)} aria-label={`Remover o marcador de ${secaoDoBloco(r.trechos[0]?.bloco) || 'esta página'}`} title="Remover marcador"><Icone nome="fechar" tamanho={14} /></button></li>)}</ul>
        : <p className="lr-notas__ajuda">Use Marcar página, na barra de cima, para guardar um lugar. A posição de leitura já é salva sozinha; o marcador é para o trecho que você quer reencontrar.</p>}
      {orfas.length > 0 && <><p className="lr-notas__grupo lr-notas__grupo--alerta">Precisam de nova associação</p>
        <p className="lr-notas__ajuda">O texto destas marcações mudou numa revisão do resumo. Elas foram preservadas como estavam.</p>
        <ul>{orfas.map(({ marca }) => <li key={marca.id} className="lr-notas__orfa"><blockquote>{marca.ancora.trechos.map((t) => t.exato).join(' … ')}</blockquote>{marca.nota && <p>{marca.nota}</p>}
          <span><button type="button" onClick={() => aoReassociar(marca.id)}>Reassociar</button><button type="button" onClick={() => aoApagar(marca.id)}>Apagar</button></span></li>)}</ul></>}
      <p className="lr-notas__grupo">{lista.length ? `${lista.length} ${lista.length === 1 ? 'destaque' : 'destaques'}` : 'Nenhum destaque ainda'}</p>
      {!lista.length && <p className="lr-notas__ajuda">Selecione um trecho do texto e escolha uma cor. As marcações ficam salvas na sua conta e aparecem em todos os aparelhos.</p>}
      <ul>{lista.map(({ marca, r }) => <li key={marca.id}><button type="button" onClick={() => aoIr(marca, r)}>
        <small><i className={`lr-ponto-cor lr-cor--${marca.cor}`} /> {secaoDoBloco(r.trechos[0]?.bloco)}{marca.favorita ? ' · ★' : ''}</small>
        <span className="lr-notas__trecho">{r.trechos.map((t) => t.exato).join(' … ').slice(0, 220)}</span>
        {marca.nota && <span className="lr-notas__nota">{marca.nota}</span>}
        {marca.notasDeOutroAparelho?.length ? <span className="lr-notas__conflito">Nota editada em dois aparelhos: abra para escolher</span> : null}
      </button></li>)}</ul>
    </div>
  )
}

function Aparencia({ pref, aoMudar, foco, aoFoco }: { pref: Preferencias; aoMudar: (m: Partial<Omit<Preferencias, 'tipo' | 'em'>>) => void; foco: boolean; aoFoco: () => void }) {
  return (
    <div className="lr-aparencia">
      <p className="lr-aparencia__rotulo">Tema</p>
      <div className="lr-aparencia__temas" role="radiogroup" aria-label="Tema">
        {(['claro', 'sepia', 'escuro'] as const).map((t) => <button key={t} type="button" role="radio" aria-checked={pref.tema === t} className={`lr-tema lr-tema--${t}`} onClick={() => aoMudar({ tema: t })}>
          <span className="lr-tema__amostra" aria-hidden="true"><b>Aa</b><i /><i /><i /></span>{t === 'claro' ? 'Claro' : t === 'sepia' ? 'Sépia' : 'Escuro'}</button>)}
      </div>
      <p className="lr-aparencia__previa" style={{ fontSize: `${Math.min(pref.fonte, 22)}px`, lineHeight: pref.entrelinha, fontFamily: pref.fonteFamilia === 'serifa' ? 'var(--lr-serifa)' : undefined }}>A fratura do colo do fêmur no idoso pede artroplastia quando o desvio é grande.</p>
      <p className="lr-aparencia__rotulo">Tamanho da letra</p>
      <div className="lr-aparencia__linha"><button type="button" onClick={() => aoMudar({ fonte: Math.max(14, pref.fonte - 1) })} aria-label="Diminuir a letra">A−</button><span className="numerico">{pref.fonte}</span><button type="button" onClick={() => aoMudar({ fonte: Math.min(28, pref.fonte + 1) })} aria-label="Aumentar a letra">A+</button></div>
      <p className="lr-aparencia__rotulo">Espaço entre linhas</p>
      <div className="lr-aparencia__linha" role="radiogroup" aria-label="Espaço entre linhas">{[1.45, 1.7, 1.95].map((v, i) => <button key={v} type="button" role="radio" aria-checked={pref.entrelinha === v} onClick={() => aoMudar({ entrelinha: v })}>{['Justo', 'Normal', 'Amplo'][i]}</button>)}</div>
      <p className="lr-aparencia__rotulo">Largura do texto</p>
      <div className="lr-aparencia__linha" role="radiogroup" aria-label="Largura">{(['estreita', 'media', 'larga'] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={pref.largura === v} onClick={() => aoMudar({ largura: v })}>{v === 'estreita' ? 'Estreita' : v === 'media' ? 'Média' : 'Larga'}</button>)}</div>
      <p className="lr-aparencia__rotulo">Letra</p>
      <div className="lr-aparencia__linha" role="radiogroup" aria-label="Família da letra"><button type="button" role="radio" aria-checked={pref.fonteFamilia === 'serifa'} className="lr-serifa" onClick={() => aoMudar({ fonteFamilia: 'serifa' })}>Livro</button><button type="button" role="radio" aria-checked={pref.fonteFamilia === 'sem-serifa'} onClick={() => aoMudar({ fonteFamilia: 'sem-serifa' })}>Moderna</button></div>
      <p className="lr-aparencia__rotulo">Leitura</p>
      <div className="lr-aparencia__linha" role="radiogroup" aria-label="Modo de leitura"><button type="button" role="radio" aria-checked={pref.modo === 'rolagem'} onClick={() => aoMudar({ modo: 'rolagem' })}>Rolagem</button><button type="button" role="radio" aria-checked={pref.modo === 'paginado'} onClick={() => aoMudar({ modo: 'paginado' })}>Páginas</button></div>
      <label className="lr-aparencia__chave"><input type="checkbox" checked={pref.justificar} onChange={(e) => aoMudar({ justificar: e.target.checked })} /> Texto justificado</label>
      <label className="lr-aparencia__chave"><input type="checkbox" checked={pref.prova} onChange={(e) => aoMudar({ prova: e.target.checked })} /> Mostrar questões e radar de prova</label>
      <label className="lr-aparencia__chave"><input type="checkbox" checked={foco} onChange={aoFoco} /> Modo concentração (só o texto)</label>
      <p className="lr-aparencia__nota">As preferências ficam na sua conta e valem em todos os aparelhos.</p>
      <details className="lr-aparencia__atalhos"><summary>Atalhos do teclado</summary>
        <dl><dt>i</dt><dd>índice</dd><dt>/</dt><dd>buscar</dd><dt>n</dt><dd>notas</dd><dt>f</dt><dd>concentração</dd><dt>?</dt><dd>ajuda do leitor</dd><dt>← →</dt><dd>páginas</dd><dt>Esc</dt><dd>fechar</dd></dl>
      </details>
    </div>
  )
}

interface AvisoLeitor { texto: string; desfazer?: () => void; acao?: { rotulo: string; fazer: () => void } }
function Aviso({ aviso, aoFechar }: { aviso: AvisoLeitor; aoFechar: () => void }) {
  useEffect(() => { const t = setTimeout(aoFechar, aviso.desfazer || aviso.acao ? 6000 : 3000); return () => clearTimeout(t) }, [aviso]) // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="lr-aviso" role="status">{aviso.texto}
    {aviso.desfazer && <button type="button" onClick={() => { aviso.desfazer!(); aoFechar() }}>Desfazer</button>}
    {aviso.acao && <button type="button" onClick={() => { aviso.acao!.fazer(); aoFechar() }}>{aviso.acao.rotulo}</button>}
  </div>
}

export const irParaResumo = (capitulo: string, bloco?: string) => navegar(`/resumos/${capitulo}${bloco ? `?bloco=${encodeURIComponent(bloco)}` : ''}`)
