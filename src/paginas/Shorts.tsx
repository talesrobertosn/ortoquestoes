import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as PE } from 'react'
import { recurso, SITE } from '../config'
import { usarConta } from '../conta/ContextoConta'
import { usarAssinante } from '../conta/plano'
import { AvaliarComentario } from '../componentes/AvaliarComentario'
import { RelatarErro } from '../componentes/RelatarErro'
import { Referencias, TextoEditorial } from '../componentes/TextoEditorial'
import { carregarQuestoes } from '../dados/acervo'
import { usarComentarioIA } from '../dados/comentarios'
import { urlImagem } from '../dados/edicoes'
import { usarLetrasAcervo } from '../dados/letrasAcervo'
import { letraExibida, letraGuardada, ordemParaRevisao, reordenarComentario } from '../dados/ordemAlternativas'
import type { Indice, Letra, Questao } from '../dados/tipos'
import { usarIndice } from '../dados/usarIndice'
import { lerUltimaExibida, registrarExibida } from '../estado/ordemExibida'
import { lerRespondidas, registrarRespostaShort, usarFavoritos } from '../estado/sessao'
import {
  CHAVE_VOLTA, alternarCoracao, anotarVista, carregarIndiceShorts, carregarTotaisCoracoes, definirTotalCoracoes, enviarResposta,
  enviarVistas, gravarAjustes, gravarHistorico, lerAjustes, lerCoracoes, lerHistorico, lerSaldo, sincronizarHistorico,
  totalCoracoes, type SaldoShorts,
} from '../shorts/dados'
import { IconeSh, SimboloShorts } from '../shorts/Icones'
import { tocarAcerto } from '../shorts/som'
import { registrar, sortear, textoRevisao, type AjustesShorts, type Historico, type ItemShort, type RespostaShort } from '../shorts/sorteio'
import { href, navegar, usarRota } from '../util/rotas'
import '../estilos/componentes/ShortsCapas.css'
import '../estilos/paginas/Shorts.css'

/*
 * Shorts (25/11/2026, pedido do Tales: "como um Reels ou um Shorts, para treino rápido no banco, no avião, entre uma
 * cirurgia e outra"). Uma questão por tela, em pé; responde com um toque, o porquê sobe numa gaveta e a próxima vem
 * deslizando. O sorteio e a revisão escondida estão em src/shorts/sorteio.ts; o visual veio do protótipo aprovado
 * (prototipos/shorts). Sem conta: um Short; conta grátis: 5 por dia (servidor, responder_short); assinante: sem limite.
 */

type Slide =
  | { chave: string; tipo: 'questao'; item: ItemShort; revisao: RespostaShort | null }
  | { chave: string; tipo: 'limite' }
  | { chave: string; tipo: 'bloco'; ids: string[] }

interface Feito { letra: Letra; certo: boolean; ms: number }
type EstadoGaveta = 'fechada' | 'espiar' | 'aberta'

const ARTE_TEORIA = 'pixel/inicio/cena-observatorio-noite-960.webp'
/** Artes HD-2D do site para as questões sem imagem (sem as cenas de Natal); a mesma questão sempre ganha a mesma. */
const ARTES = ['cena-abrigo-manha', 'cena-abrigo-tarde', 'cena-abrigo-noite', 'cena-cais-manha', 'cena-cais-tarde', 'cena-cais-noite',
  'cena-forja-manha', 'cena-forja-tarde', 'cena-forja-noite', 'cena-manha', 'cena-tarde', 'cena-noite', 'cena-observatorio-manha',
  'cena-observatorio-tarde', 'cena-observatorio-noite', 'secao-biblioteca', 'secao-torre', 'secao-correio']
function artePara(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return `pixel/inicio/${ARTES[h % ARTES.length]}-960.webp`
}
const PASSAR_EM = 5000
let contador = 0
const novaChave = () => `s${++contador}`

export function Shorts() {
  const rota = usarRota()
  const idInicial = rota.segmentos[1] ?? null
  const { sessao } = usarConta()
  const logado = !!sessao
  const assinanteLocal = usarAssinante(sessao)
  const { indice } = usarIndice()
  const letras = usarLetrasAcervo()
  const { favoritos, alternar: alternarFavorito } = usarFavoritos()

  const [itens, definirItens] = useState<ItemShort[] | null>(null)
  const [falhou, definirFalhou] = useState(false)
  const historico = useRef<Historico>(lerHistorico())
  const [ajustes, definirAjustesEstado] = useState<AjustesShorts>(lerAjustes)
  const [slides, definirSlides] = useState<Slide[]>([])
  const [questoes, definirQuestoes] = useState<Record<string, Questao>>({})
  const [feitos, definirFeitos] = useState<Record<string, Feito>>({})
  const [gavetas, definirGavetas] = useState<Record<string, EstadoGaveta>>({})
  const [atual, definirAtual] = useState(0)
  const [saldo, definirSaldo] = useState<SaldoShorts | null>(null)
  const [seq, definirSeq] = useState(0)
  const [meusCoracoes, definirMeusCoracoes] = useState<Set<string>>(() => new Set(lerCoracoes()))
  const [, definirVersaoTotais] = useState(0)
  const [configAberta, definirConfigAberta] = useState(false)
  const [zoom, definirZoom] = useState<string | null>(null)
  /** Convite para criar a conta (sem conta não se responde): o id da questão para voltar a ela. */
  const [convite, definirConvite] = useState<string | null | undefined>(undefined)
  const [aviso, definirAviso] = useState<string | null>(null)
  const [auto, definirAuto] = useState<{ chave: string; desde: number } | null>(null)
  const [estouro, definirEstouro] = useState<{ chave: string; x: number; y: number; n: number } | null>(null)
  const abertura = useRef(Date.now())
  const inicioSlide = useRef(Date.now())
  const feed = useRef<HTMLDivElement>(null)
  const pronto = useRef(false)
  const ilimitado = saldo?.ilimitado ?? false

  /* ---------- aviso rápido ---------- */
  const avisoT = useRef<ReturnType<typeof setTimeout>>()
  const avisar = useCallback((t: string) => {
    definirAviso(t); clearTimeout(avisoT.current); avisoT.current = setTimeout(() => definirAviso(null), 2400)
  }, [])

  /* ---------- tela cheia: trava a rolagem da página ---------- */
  useEffect(() => {
    document.body.classList.add('sh-travado')
    document.title = 'Shorts | Orto Questões'
    return () => { document.body.classList.remove('sh-travado'); enviarVistas() }
  }, [])

  /* ---------- o painel sabe quem está nos Shorts: um sinal ao abrir e a cada minuto com a tela à vista ---------- */
  useEffect(() => {
    if (!logado) return
    enviarVistas(true)
    const t = setInterval(() => { if (document.visibilityState === 'visible') enviarVistas(true) }, 60_000)
    return () => clearInterval(t)
  }, [logado])

  /* ---------- índice, histórico e saldo ---------- */
  useEffect(() => { carregarIndiceShorts().then(definirItens).catch(() => definirFalhou(true)) }, [])
  const [sincronizado, definirSincronizado] = useState(!logado)
  useEffect(() => {
    if (!logado) { definirSincronizado(true); return }
    let vivo = true
    Promise.all([sincronizarHistorico(), lerSaldo()]).then(([h, s]) => {
      if (!vivo) return
      historico.current = h; definirSaldo(s); definirSincronizado(true)
    })
    return () => { vivo = false }
  }, [logado])

  /* ---------- montar o feed ---------- */
  const proximas = useCallback((base: Slide[], n: number, a: AjustesShorts): Slide[] => {
    if (!itens) return base
    const lista = [...base]
    const noFeed = new Set(lista.flatMap((s) => (s.tipo === 'questao' ? [s.item.id] : [])))
    for (let i = 0; i < n; i++) {
      const qs = lista.filter((s): s is Extract<Slide, { tipo: 'questao' }> => s.tipo === 'questao')
      // Shorts desde a última revisão, contados na própria lista (sem estado guardado fora dela).
      const ultima = qs.map((x) => !!x.revisao).lastIndexOf(true)
      const r = sortear({
        itens, historico: historico.current, ajustes: a, noFeed, anterior: qs[qs.length - 1]?.item ?? null,
        posicao: qs.length, desdeRevisao: ultima < 0 ? qs.length : qs.length - 1 - ultima, agora: Date.now(), sorte: Math.random,
      })
      if (!r) break
      noFeed.add(r.item.id)
      lista.push({ chave: novaChave(), tipo: 'questao', item: r.item, revisao: r.revisao })
    }
    return lista
  }, [itens])

  useEffect(() => {
    if (!itens || !sincronizado || pronto.current) return
    pronto.current = true
    if (saldo && !saldo.ilimitado && saldo.feitas >= saldo.limite) { definirSlides([{ chave: novaChave(), tipo: 'limite' }]); return }
    const inicial = idInicial ? itens.find((q) => q.id === idInicial) : null
    const base: Slide[] = inicial ? [{ chave: novaChave(), tipo: 'questao', item: inicial, revisao: null }] : []
    definirSlides(proximas(base, inicial ? 3 : 4, ajustes))
  }, [itens, sincronizado, saldo, logado, idInicial, proximas, ajustes])

  // Mantém sempre três questões à frente.
  const bloqueado = slides.some((s) => s.tipo === 'limite')
  useEffect(() => {
    if (!pronto.current || bloqueado || !slides.length) return
    if (slides.length - 1 - atual < 3) definirSlides((s) => proximas(s, 3, ajustes))
  }, [atual, slides.length, bloqueado, proximas, ajustes])

  /* ---------- questões e corações do entorno ---------- */
  useEffect(() => {
    if (!indice) return
    const perto = slides.slice(Math.max(0, atual - 1), atual + 4).flatMap((s) => (s.tipo === 'questao' && !questoes[s.item.id] ? [s.item.id] : []))
    if (!perto.length) return
    let vivo = true
    carregarQuestoes(indice, perto).then((lista) => {
      if (vivo) definirQuestoes((q) => ({ ...q, ...Object.fromEntries(lista.map((x) => [x.id, x])) }))
    }).catch(() => undefined)
    carregarTotaisCoracoes(perto).then(() => vivo && definirVersaoTotais((v) => v + 1))
    return () => { vivo = false }
  }, [indice, slides, atual]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pré-carrega as imagens das duas próximas.
  useEffect(() => {
    for (const s of slides.slice(atual + 1, atual + 3)) {
      if (s.tipo !== 'questao') continue
      const q = questoes[s.item.id]
      if (q?.imagens[0]) new Image().src = urlImagem(q.imagens[0].arquivo)
    }
  }, [atual, slides, questoes])

  /* ---------- ordem das alternativas na revisão ---------- */
  const ordens = useMemo(() => {
    const o: Record<string, string | null> = {}
    for (const s of slides) {
      if (s.tipo !== 'questao' || !s.revisao) continue
      const q = questoes[s.item.id]
      if (!q) continue
      o[s.chave] = ordemParaRevisao(q, {
        letras: letras ?? null, registro: lerRespondidas()[q.id], desde: abertura.current,
        semente: `shorts:${abertura.current}`, ultimaExibida: lerUltimaExibida(q.id),
      })
    }
    return o
  }, [slides, questoes, letras])

  /* ---------- slide atual ---------- */
  useEffect(() => {
    const raiz = feed.current
    if (!raiz) return
    const obs = new IntersectionObserver((ents) => {
      for (const en of ents) {
        if (!en.isIntersecting || en.intersectionRatio < 0.6) continue
        const i = Number((en.target as HTMLElement).dataset.indice)
        definirAtual((anterior) => {
          if (anterior !== i) {
            const s = slides[anterior]
            if (s?.tipo === 'questao' && logado) anotarVista(s.item.id, !feitos[s.chave])
            inicioSlide.current = Date.now()
          }
          return i
        })
      }
    }, { root: raiz, threshold: [0.6] })
    raiz.querySelectorAll('.sh-tela').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [slides, feitos, logado])

  useEffect(() => {
    const s = slides[atual]
    if (s?.tipo === 'questao') history.replaceState(history.state, '', href(`/shorts/${s.item.id}`))
    if (auto && s?.chave !== auto.chave) definirAuto(null)
  }, [atual, slides]) // eslint-disable-line react-hooks/exhaustive-deps

  const ir = useCallback((delta: number) => {
    const el = feed.current?.querySelectorAll<HTMLElement>('.sh-tela')[atual + delta]
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [atual])

  /* ---------- passar sozinha depois de acertar ---------- */
  useEffect(() => {
    if (!auto) return
    const t = setTimeout(() => { definirAuto(null); ir(1) }, Math.max(0, PASSAR_EM - (Date.now() - auto.desde)))
    return () => clearTimeout(t)
  }, [auto, ir])
  const pausarAuto = useCallback(() => definirAuto(null), [])

  /* ---------- responder ---------- */
  const responder = useCallback((s: Extract<Slide, { tipo: 'questao' }>, exibida: Letra) => {
    const q = questoes[s.item.id]
    if (!q || feitos[s.chave]) return
    // Sem conta, a pessoa vê as questões à vontade, mas responder pede a conta (Tales, 25/11/2026).
    if (!logado) { definirConvite(q.id); return }
    if (saldo && !saldo.ilimitado && saldo.feitas >= saldo.limite) { avisar('Seus Shorts grátis de hoje acabaram'); return }
    const ordem = ordens[s.chave] ?? null
    const original = letraGuardada(ordem, exibida) as Letra
    const certo = original === q.gabarito
    const ms = Date.now() - inicioSlide.current
    const h = registrar(historico.current, q.id, certo, !!s.revisao, Date.now(), Math.random)
    historico.current = h; gravarHistorico(h)
    registrarRespostaShort(q.id, certo, original)
    if (ordem && q.gabarito) registrarExibida(q.id, letraExibida(ordem, q.gabarito))
    definirFeitos((f) => ({ ...f, [s.chave]: { letra: original, certo, ms } }))
    definirSeq((n) => (certo ? n + 1 : 0))
    if (certo && ajustes.som) tocarAcerto({ sequencia: seq + 1, fixou: !!s.revisao })
    try { navigator.vibrate?.(certo ? 14 : [18, 60, 18]) } catch { /* sem vibração */ }

    const indiceSlide = slides.findIndex((x) => x.chave === s.chave)
    const cortar = (fim: Slide) => definirSlides((lista) => {
      const i = lista.findIndex((x) => x.chave === s.chave)
      return i < 0 ? lista : [...lista.slice(0, i + 1), fim]
    })
    const nestaAbertura = Object.keys(feitos).length + 1
    {
      if (saldo && !saldo.ilimitado && saldo.feitas + 1 >= saldo.limite) cortar({ chave: novaChave(), tipo: 'limite' })
      if (saldo) definirSaldo({ ...saldo, feitas: saldo.feitas + 1 })
      enviarResposta(q.id, certo, !!s.revisao, h[q.id].voltaEm, ms / 1000).then((novo) => {
        definirSaldo(novo)
        if (!novo.ilimitado && novo.feitas >= novo.limite) cortar({ chave: novaChave(), tipo: 'limite' })
      }).catch(() => undefined)
      if ((saldo?.ilimitado || assinanteLocal) && nestaAbertura % 10 === 0) {
        const ids = [...slides.slice(0, indiceSlide + 1)].flatMap((x) => (x.tipo === 'questao' && (feitos[x.chave] || x.chave === s.chave) ? [x.item.id] : [])).slice(-10)
        definirSlides((lista) => {
          const i = lista.findIndex((x) => x.chave === s.chave)
          return [...lista.slice(0, i + 1), { chave: novaChave(), tipo: 'bloco', ids }, ...lista.slice(i + 1)]
        })
      }
    }
    setTimeout(() => definirGavetas((g) => ({ ...g, [s.chave]: g[s.chave] && g[s.chave] !== 'fechada' ? g[s.chave] : 'espiar' })), certo ? 650 : 900)
    if (certo && ajustes.passarSozinha) definirAuto({ chave: s.chave, desde: Date.now() + 650 })
  }, [questoes, feitos, logado, saldo, ordens, slides, avisar, ajustes.passarSozinha, ajustes.som, seq, assinanteLocal])

  /* ---------- coração ---------- */
  const coracao = useCallback((id: string, ligar?: boolean, onde?: { x: number; y: number; chave: string }) => {
    if (!logado) { definirConvite(id); return }
    const tinha = meusCoracoes.has(id)
    const novo = ligar ?? !tinha
    if (novo === tinha) { if (onde && novo) definirEstouro({ ...onde, n: Date.now() }); return }
    const proximo = new Set(meusCoracoes); if (novo) proximo.add(id); else proximo.delete(id)
    definirMeusCoracoes(proximo)
    definirTotalCoracoes(id, Math.max(0, totalCoracoes(id) + (novo ? 1 : -1)))
    if (onde && novo) definirEstouro({ ...onde, n: Date.now() })
    if (novo) { try { navigator.vibrate?.(10) } catch { /* sem vibração */ } }
    alternarCoracao(id, novo).then((n) => { if (n !== null) { definirTotalCoracoes(id, n); definirVersaoTotais((v) => v + 1) } })
  }, [logado, meusCoracoes, avisar])

  const compartilhar = useCallback((q: Questao) => {
    const url = `${SITE.url}#/shorts/${q.id}`
    const copiar = () => {
      navigator.clipboard?.writeText(url).then(() => avisar('Link copiado'), () => avisar(url))
    }
    if (navigator.share) navigator.share({ title: 'Você acertaria essa?', text: `${q.prova ?? 'Questão'} ${q.ano ?? ''} · ${q.tema}`.trim(), url }).catch((e: unknown) => { if ((e as Error)?.name !== 'AbortError') copiar() })
    else copiar()
  }, [avisar])

  /* ---------- fechar ---------- */
  const fechar = useCallback(() => {
    enviarVistas()
    let volta = '/'
    try { volta = sessionStorage.getItem(CHAVE_VOLTA) || '/' } catch { /* sem sessionStorage */ }
    navegar(volta)
  }, [])

  /* ---------- ajustes ---------- */
  const aplicarAjustes = (a: AjustesShorts) => {
    gravarAjustes(a); definirAjustesEstado(a); definirConfigAberta(false)
    if (!bloqueado) definirSlides((lista) => proximas(lista.slice(0, atual + 1), 3, a))
    avisar('Pronto: os próximos Shorts seguem seus ajustes')
  }

  /* ---------- teclado ---------- */
  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (zoom) { if (e.key === 'Escape') definirZoom(null); return }
      if (configAberta) { if (e.key === 'Escape') definirConfigAberta(false); return }
      if (convite !== undefined) { if (e.key === 'Escape') definirConvite(undefined); return }
      if ((e.target as HTMLElement)?.closest?.('textarea, input')) return
      const s = slides[atual]
      const k = e.key.toLowerCase()
      if (k === 'escape') fechar()
      else if (k === 'arrowdown' || k === 'j' || k === 'pagedown' || (k === ' ' && s?.tipo === 'questao' && feitos[s.chave])) { e.preventDefault(); ir(1) }
      else if (k === 'arrowup' || k === 'k' || k === 'pageup') { e.preventDefault(); ir(-1) }
      else if (s?.tipo === 'questao' && /^[a-e]$/.test(k) && !feitos[s.chave]) responder(s, k.toUpperCase() as Letra)
      else if (s?.tipo === 'questao' && k === 'h') coracao(s.item.id)
      else if (s?.tipo === 'questao' && k === 'c' && feitos[s.chave]) definirGavetas((g) => ({ ...g, [s.chave]: g[s.chave] === 'aberta' ? 'espiar' : 'aberta' }))
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [zoom, configAberta, convite, slides, atual, feitos, ir, fechar, responder, coracao])

  /* ---------- placar ---------- */
  const listaFeitos = Object.values(feitos)
  const acertos = listaFeitos.filter((f) => f.certo).length
  const limiteMostrado = logado && saldo && !saldo.ilimitado ? saldo.limite : null
  const feitasHoje = saldo?.feitas ?? listaFeitos.length

  const nomeTema = useCallback((slug: string) => (indice as Indice | null)?.temas.find((t) => t.slug === slug)?.nome ?? '', [indice])

  return (
    <div className="sh-pl" role="dialog" aria-modal="true" aria-label="Shorts">
      <div className="sh-pl-fundo" />
      <div className="sh-pl-feed" ref={feed}>
        {falhou && <div className="sh-tela"><div className="sh-palco"><div className="sh-coluna sh-vazio"><p>Não foi possível carregar os Shorts. Confira a conexão e tente de novo.</p><button type="button" className="sh-botao sh-botao--ouro" onClick={() => location.reload()}>Tentar de novo</button></div></div></div>}
        {!falhou && !slides.length && <div className="sh-tela"><div className="sh-palco"><div className="sh-coluna sh-vazio"><span className="sh-girando" aria-label="Carregando" /></div></div></div>}
        {slides.map((s, i) => {
          if (s.tipo === 'questao') {
            const q = questoes[s.item.id]
            return (
              <SlideQuestao key={s.chave} indice={i} slide={s} questao={q ?? null} indiceAcervo={indice} feito={feitos[s.chave] ?? null}
                ordem={ordens[s.chave] ?? null} gaveta={gavetas[s.chave] ?? 'fechada'} seq={seq} perto={Math.abs(i - atual) <= 2}
                coracaoLigado={meusCoracoes.has(s.item.id)} totalCoracoes={totalCoracoes(s.item.id)} favorita={favoritos.includes(s.item.id)}
                auto={auto?.chave === s.chave ? auto.desde : null} proxima={slides[i + 1] ?? null} questaoProxima={slides[i + 1]?.tipo === 'questao' ? questoes[(slides[i + 1] as Extract<Slide, { tipo: 'questao' }>).item.id] ?? null : null}
                aoResponder={(l) => responder(s, l)} aoGaveta={(e) => definirGavetas((g) => ({ ...g, [s.chave]: e }))}
                aoCoracao={(onde) => coracao(s.item.id, onde ? true : undefined, onde ? { ...onde, chave: s.chave } : undefined)}
                estouro={estouro?.chave === s.chave ? estouro : null}
                aoFavoritar={() => { alternarFavorito(s.item.id); avisar(favoritos.includes(s.item.id) ? 'Tirada das Favoritas' : 'Salva nas suas Favoritas') }}
                aoCompartilhar={() => q && compartilhar(q)} aoProxima={() => { pausarAuto(); ir(1) }} aoPausar={pausarAuto}
                aoAmpliar={(src) => definirZoom(src)} aoAvisar={avisar}
              />
            )
          }
          if (s.tipo === 'limite') {
            return <MuroLimite key={s.chave} indice={i} acertos={acertos} feitas={listaFeitos.length} limite={saldo?.limite ?? 5} coracoes={meusCoracoes.size}
              ms={listaFeitos.length ? listaFeitos.reduce((a, f) => a + f.ms, 0) / listaFeitos.length : 0} liberaEm={saldo?.liberaEm ?? null} />
          }
          return <FimDeBloco key={s.chave} indice={i} ids={s.ids} feitos={feitos} slides={slides} nomeTema={nomeTema} aoContinuar={() => ir(1)} />
        })}
      </div>

      <div className="sh-pl-topo">
        <button type="button" className="sh-pl-x" onClick={fechar} aria-label="Fechar os Shorts"><IconeSh nome="x" /></button>
        <div className="sh-pl-progresso">
          {!logado ? (
            <div className="sh-prog-assinante">
              <button type="button" className="sh-pilula sh-pilula--botao" onClick={() => definirConvite(slides[atual]?.tipo === 'questao' ? (slides[atual] as Extract<Slide, { tipo: 'questao' }>).item.id : null)}>
                <SimboloShorts tamanho={16} />Crie a conta para responder
              </button>
            </div>
          ) : limiteMostrado !== null && !ilimitado ? (
            <>
              <div className="sh-segmentos">{Array.from({ length: limiteMostrado }, (_, i) => {
                const f = listaFeitos[i - Math.max(0, feitasHoje - listaFeitos.length)]
                const cheio = i < feitasHoje
                return <i key={i} className={cheio ? (f && !f.certo ? 'sh-feito sh-errou' : 'sh-feito') : undefined} />
              })}</div>
              <div className="sh-prog-texto"><span><b>{Math.min(feitasHoje, limiteMostrado)} de {limiteMostrado}</b> {logado ? 'grátis hoje' : 'sem conta'}</span>
                {seq >= 2 ? <span className="sh-prog-seq"><IconeSh nome="chama" />{seq} seguidas</span> : <span />}</div>
            </>
          ) : (
            <div className="sh-prog-assinante">
              <span className="sh-pilula"><SimboloShorts tamanho={16} /><b>{feitasHoje}</b>&nbsp;hoje</span>
              {seq >= 2 && <span className="sh-pilula"><IconeSh nome="chama" />{seq} seguidas</span>}
            </div>
          )}
        </div>
        <button type="button" className="sh-pl-icone" onClick={() => definirConfigAberta(true)} aria-label="Ajustar os Shorts"><IconeSh nome="ajuste" /></button>
      </div>
      <button type="button" className="sh-pl-x-canto" onClick={fechar} aria-label="Fechar os Shorts"><IconeSh nome="x" /></button>
      <div className="sh-pl-setas">
        <button type="button" onClick={() => ir(-1)} disabled={atual === 0} aria-label="Questão anterior"><IconeSh nome="cima" /></button>
        <button type="button" onClick={() => ir(1)} disabled={atual >= slides.length - 1} aria-label="Próxima questão"><IconeSh nome="baixo" /></button>
      </div>

      {convite !== undefined && <ConviteConta id={convite} aoFechar={() => definirConvite(undefined)} />}
      {configAberta && <Ajustes inicial={ajustes} aoFechar={() => definirConfigAberta(false)} aoAplicar={aplicarAjustes} />}
      {zoom && (
        <div className="sh-zoom" role="dialog" aria-label="Imagem ampliada">
          <button type="button" className="sh-pl-x sh-zoom-x" onClick={() => definirZoom(null)} aria-label="Fechar a imagem"><IconeSh nome="x" /></button>
          <ZoomImagem src={zoom} />
        </div>
      )}
      <div className={aviso ? 'sh-aviso sh-visivel' : 'sh-aviso'} role="status" aria-live="polite">{aviso}</div>
    </div>
  )
}

/* =====================================================================
   Uma questão
   ===================================================================== */
interface PropsSlide {
  indice: number
  slide: Extract<Slide, { tipo: 'questao' }>
  questao: Questao | null
  indiceAcervo: Indice | null
  feito: Feito | null
  ordem: string | null
  gaveta: EstadoGaveta
  seq: number
  perto: boolean
  coracaoLigado: boolean
  totalCoracoes: number
  favorita: boolean
  auto: number | null
  proxima: Slide | null
  questaoProxima: Questao | null
  estouro: { x: number; y: number; n: number } | null
  aoResponder: (l: Letra) => void
  aoGaveta: (e: EstadoGaveta) => void
  aoCoracao: (onde?: { x: number; y: number }) => void
  aoFavoritar: () => void
  aoCompartilhar: () => void
  aoProxima: () => void
  aoPausar: () => void
  aoAmpliar: (src: string) => void
  aoAvisar: (t: string) => void
}

const temaCurto = (t: string) => t.replace('Tumores ósseos e de partes moles', 'Tumores').replace('Ortopedia pediátrica', 'Pediatria').replace('Trauma adulto', 'Trauma')

function SlideQuestao(p: PropsSlide) {
  const { questao: q, feito, ordem, slide } = p
  const [mais, definirMais] = useState(false)
  const [corta, definirCorta] = useState(false)
  const enunciado = useRef<HTMLParagraphElement>(null)
  const midia = useRef<HTMLDivElement>(null)
  const coluna = useRef<HTMLDivElement>(null)
  const [baixoAcoes, definirBaixoAcoes] = useState<number | null>(null)
  const [semRotulo, definirSemRotulo] = useState(false)
  const acoes = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const e = enunciado.current
    if (e && !mais) definirCorta(e.scrollHeight > e.clientHeight + 2)
  }, [q, mais])

  // No celular as ações ficam no pé da imagem, à direita.
  useLayoutEffect(() => {
    const m = midia.current, c = coluna.current
    if (!m || !c) return
    const medir = () => {
      definirBaixoAcoes(c.clientHeight - (m.offsetTop + m.offsetHeight) + 14)
      const a = acoes.current
      definirSemRotulo(window.innerWidth <= 760 && !!a && a.offsetHeight > m.offsetHeight - 84)
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(m); ro.observe(c)
    return () => ro.disconnect()
  }, [q, feito])

  // Um toque amplia; dois dão coração.
  const ultimoToque = useRef(0)
  const toqueT = useRef<ReturnType<typeof setTimeout>>()
  const tocarMidia = (e: React.MouseEvent) => {
    const agora = Date.now()
    const r = coluna.current?.getBoundingClientRect()
    if (agora - ultimoToque.current < 300) {
      clearTimeout(toqueT.current); ultimoToque.current = 0
      p.aoCoracao(r ? { x: e.clientX - r.left, y: e.clientY - r.top } : { x: 0, y: 0 })
      return
    }
    ultimoToque.current = agora
    const img = q?.imagens[0]
    toqueT.current = setTimeout(() => { if (img) p.aoAmpliar(urlImagem(img.arquivo)) }, 300)
  }

  const aberta = p.gaveta !== 'fechada'
  const esconderAcoes = aberta && typeof window !== 'undefined' && window.innerWidth <= 760
  const img = q?.imagens[0] ?? null
  const revisao = slide.revisao

  return (
    <section className={`sh-tela${feito ? ' sh-respondida' : ''}`} data-indice={p.indice} aria-label="Questão">
      <div className="sh-palco">
        <div className="sh-coluna" ref={coluna}>
          {img ? (
            <div className="sh-midia" ref={midia} onClick={tocarMidia}>
              <span className="sh-midia-fundo" style={{ backgroundImage: `url("${urlImagem(img.arquivo)}")` }} />
              {p.perto && <img src={urlImagem(img.arquivo)} alt="Imagem da questão" draggable={false} />}
              <span className="sh-zoom-dica"><IconeSh nome="lupa" /> Toque para ampliar</span>
              {q && q.imagens.length > 1 && <span className="sh-mais-imagens">+{q.imagens.length - 1}</span>}
            </div>
          ) : (
            <div className="sh-midia sh-midia--texto" ref={midia} onClick={tocarMidia}>
              <img className="sh-midia-arte" src={recurso(artePara(slide.item.id))} alt="" />
              <div className="sh-tipo"><small><IconeSh nome="livro" /> Questão de teoria</small><strong>{q ? temaCurto(q.tema) : ''}</strong></div>
            </div>
          )}
          {estouroEl(p.estouro)}
          <div className="sh-corpo">
            {!q ? <div className="sh-carregando-q"><i /><i /><i /></div> : <>
              <div className="sh-meta">
                {(q.prova || q.ano) && <span className="sh-prova">{[q.prova, q.ano].filter(Boolean).join(' ')}</span>}
                <span>{temaCurto(q.tema)}</span>
              </div>
              {revisao && (
                <p className={`sh-revisao${revisao.certo ? ' sh-revisao--certo' : ''}`}><IconeSh nome="revisao" />Revisão · {textoRevisao(revisao, Date.now())}</p>
              )}
              <p ref={enunciado} className={`sh-enunciado${mais ? '' : ' sh-recolhido'}`}>{q.enunciado}</p>
              {corta && !mais && <button type="button" className="sh-mais" onClick={() => definirMais(true)}>ver mais</button>}
              <ol className="sh-alts">
                {[...q.alternativas].sort((a, b) => letraExibida(ordem, a.letra).localeCompare(letraExibida(ordem, b.letra))).map((a) => {
                  const mostrada = letraExibida(ordem, a.letra) as Letra
                  const certa = !!feito && a.letra === q.gabarito
                  const errada = !!feito && a.letra === feito.letra && !feito.certo
                  return (
                    <li key={a.letra}>
                      <button type="button" className={`sh-alt${certa ? ' sh-certa sh-anima' : ''}${errada ? ' sh-errada sh-anima' : ''}`} disabled={!!feito} onClick={() => p.aoResponder(mostrada)}>
                        <span className="sh-alt-letra">{certa ? <IconeSh nome="visto" /> : mostrada}</span><span>{a.texto}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
              {feito && <button type="button" className="sh-reabrir" onClick={() => p.aoGaveta('espiar')}><IconeSh nome="balao" /> Ver o comentário</button>}
              {feito && <button type="button" className="sh-proxima-corpo" onClick={p.aoProxima}>Próxima <IconeSh nome="baixo" /></button>}
            </>}
          </div>
          {q && feito && <Gaveta {...p} questao={q} feito={feito} />}
        </div>
        <div ref={acoes} className={`sh-acoes${semRotulo ? ' sh-sem-rotulo' : ''}`}
          style={{ '--acoes-baixo': baixoAcoes !== null ? `${baixoAcoes}px` : undefined, opacity: esconderAcoes ? 0 : undefined, pointerEvents: esconderAcoes ? 'none' : undefined } as CSSProperties}>
          <button type="button" className={`sh-acao${p.coracaoLigado ? ' sh-pulsa' : ''}`} aria-pressed={p.coracaoLigado} aria-label="Coração" onClick={() => p.aoCoracao()}>
            <span className="sh-acao-bola"><IconeSh nome={p.coracaoLigado ? 'coracaoCheio' : 'coracao'} /></span><span className="sh-n">{p.totalCoracoes || 'Amei'}</span>
          </button>
          <button type="button" className="sh-acao" aria-label="Comentário" onClick={() => (feito ? p.aoGaveta('aberta') : p.aoAvisar('Responda primeiro: o porquê aparece logo depois'))}>
            <span className="sh-acao-bola"><IconeSh nome="balao" /></span><span>Porquê</span>
          </button>
          <button type="button" className="sh-acao" aria-label="Compartilhar" onClick={p.aoCompartilhar}>
            <span className="sh-acao-bola"><IconeSh nome="enviar" /></span><span>Enviar</span>
          </button>
          <button type="button" className="sh-acao" aria-pressed={p.favorita} aria-label="Salvar nas Favoritas" onClick={p.aoFavoritar}>
            <span className="sh-acao-bola"><IconeSh nome={p.favorita ? 'salvarCheio' : 'salvar'} /></span><span>Salvar</span>
          </button>
          {!feito && (
            <button type="button" className="sh-acao sh-acao--pular" aria-label="Pular esta questão" onClick={p.aoProxima}>
              <span className="sh-acao-bola"><IconeSh nome="pular" /></span><span>Pular</span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function estouroEl(e: { x: number; y: number; n: number } | null) {
  if (!e || Date.now() - e.n > 1000) return null
  return <div key={e.n} className="sh-estouro" style={{ left: e.x, top: e.y }}><IconeSh nome="coracaoCheio" /></div>
}

/* ---------- gaveta do comentário ---------- */
function Gaveta(p: PropsSlide & { questao: Questao; feito: Feito }) {
  const { questao: q, feito, ordem } = p
  const { comentario: bruto, carregando } = usarComentarioIA(q, p.indiceAcervo, true)
  const letrasAcervo = usarLetrasAcervo()
  const comentario = useMemo(() => (bruto && ordem ? reordenarComentario(bruto, ordem, letrasAcervo?.refs[q.id]).comentario : bruto), [bruto, ordem, letrasAcervo, q.id])
  const ref = useRef<HTMLDivElement>(null)
  const corpo = useRef<HTMLDivElement>(null)
  const arrasto = useRef<{ y0: number; t0: number; base: number; mexeu: boolean } | null>(null)
  const pos: Record<EstadoGaveta, number> = { aberta: 0, espiar: 0.3, fechada: 1 }
  const g = p.gaveta
  const gabarito = q.gabarito ? letraExibida(ordem, q.gabarito) : ''
  const marcada = letraExibida(ordem, feito.letra)
  const fixou = !!p.slide.revisao && feito.certo

  useEffect(() => { if (g === 'aberta' && corpo.current) corpo.current.scrollTop = 0 }, [g])

  const baixo = (e: PE<HTMLDivElement>) => {
    const el = ref.current; if (!el) return
    p.aoPausar()
    arrasto.current = { y0: e.clientY, t0: performance.now(), base: pos[g] * el.offsetHeight, mexeu: false }
    el.classList.add('sh-arrastando'); e.currentTarget.setPointerCapture(e.pointerId)
  }
  const mover = (e: PE<HTMLDivElement>) => {
    const a = arrasto.current, el = ref.current; if (!a || !el) return
    const dy = e.clientY - a.y0; if (Math.abs(dy) > 4) a.mexeu = true
    el.style.transform = `translateY(${Math.max(0, a.base + dy)}px)`
  }
  const soltar = (e: PE<HTMLDivElement>) => {
    const a = arrasto.current, el = ref.current; arrasto.current = null
    if (!a || !el) return
    el.classList.remove('sh-arrastando'); el.style.transform = ''
    if (!a.mexeu) { p.aoGaveta(g === 'aberta' ? 'espiar' : 'aberta'); return }
    const dy = e.clientY - a.y0, v = dy / (performance.now() - a.t0)
    const atual = (a.base + dy) / el.offsetHeight
    let alvo: EstadoGaveta = atual < 0.22 ? 'aberta' : atual < 0.72 ? 'espiar' : 'fechada'
    if (v > 0.6) alvo = g === 'aberta' ? 'espiar' : 'fechada'
    if (v < -0.6) alvo = 'aberta'
    p.aoGaveta(alvo)
  }

  // No fim do comentário, puxar mais para cima passa para a próxima.
  const puxou = useRef(0)
  const rolar = (e: React.WheelEvent<HTMLDivElement>) => {
    const c = corpo.current; if (!c || g !== 'aberta') return
    const noFim = c.scrollTop + c.clientHeight >= c.scrollHeight - 2
    if (noFim && e.deltaY > 0) { puxou.current += e.deltaY; if (puxou.current > 260) { puxou.current = 0; p.aoProxima() } } else puxou.current = 0
  }
  const toqueY = useRef<number | null>(null)
  const toqueInicio = (e: React.TouchEvent) => { toqueY.current = e.touches[0].clientY }
  const toqueFim = (e: React.TouchEvent) => {
    const c = corpo.current, y0 = toqueY.current; toqueY.current = null
    if (!c || y0 === null || g !== 'aberta') return
    const noFim = c.scrollTop + c.clientHeight >= c.scrollHeight - 2
    if (noFim && y0 - e.changedTouches[0].clientY > 90) p.aoProxima()
  }

  const prox = p.proxima
  const qp = p.questaoProxima
  const miniatura = qp ? (qp.imagens[0] ? urlImagem(qp.imagens[0].arquivo) : recurso(artePara(qp.id))) : null

  return (
    <div ref={ref} className="sh-gaveta" data-estado={g} aria-label="Comentário" onPointerDownCapture={p.aoPausar}>
      <div className="sh-gaveta-cabeca" onPointerDown={baixo} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
        <button type="button" className="sh-gaveta-subir" aria-label={g === 'aberta' ? 'Baixar o comentário' : 'Subir o comentário'}
          onPointerDown={(e) => e.stopPropagation()} onClick={() => p.aoGaveta(g === 'aberta' ? 'espiar' : 'aberta')}>
          <IconeSh nome={g === 'aberta' ? 'baixo' : 'cima'} />
        </button>
        <span className="sh-alca" />
        <div className={`sh-resultado ${feito.certo ? 'sh-resultado--certo' : 'sh-resultado--errado'}`}>
          <span className="sh-resultado-icone"><IconeSh nome={feito.certo ? 'visto' : 'x'} /></span>
          <div>
            <h3>{fixou ? 'Fixou!' : feito.certo ? 'Acertou' : `A certa é a ${gabarito}`}</h3>
            <p>{fixou ? `${p.slide.revisao && !p.slide.revisao.certo ? 'Errou' : 'Acertou'} da outra vez, acertou hoje.` : feito.certo ? 'Agora fixe o porquê.' : `Você marcou a ${marcada}. Veja onde estava a pegadinha.`}</p>
          </div>
          {feito.certo && p.seq >= 2 && <span className="sh-resultado-seq"><IconeSh nome="chama" />{p.seq} seguidas</span>}
        </div>
      </div>
      <div className="sh-gaveta-corpo" ref={corpo} onWheel={rolar} onTouchStart={toqueInicio} onTouchEnd={toqueFim}>
        {!comentario ? <p className="sh-conceito">{carregando ? 'Carregando o comentário…' : 'Esta questão ainda não tem comentário.'}</p> : <>
          <p className="sh-porque-rotulo">Por que a {gabarito}</p>
          <div className="sh-porque-certa"><TextoEditorial texto={comentario.correta} /></div>
          {comentario.conceito && <div className="sh-conceito"><TextoEditorial texto={comentario.conceito} realce /></div>}
          <div className="sh-outras">
            {(Object.entries(comentario.incorretas) as [Letra, string][]).sort(([a], [b]) => a.localeCompare(b)).map(([l, t]) => (
              <details key={l} className={`sh-outra${l === marcada && !feito.certo ? ' sh-marcada' : ''}`} open={l === marcada && !feito.certo}>
                <summary><span className="sh-alt-letra">{l}</span>{l === marcada && !feito.certo ? 'A que você marcou' : `Por que não a ${l}`}<IconeSh nome="baixo" /></summary>
                <div className="sh-outra-texto"><TextoEditorial texto={t} /></div>
              </details>
            ))}
          </div>
          {!!comentario.referencias?.length && <div className="sh-refs"><Referencias itens={comentario.referencias} /></div>}
          <div className="sh-nota"><AvaliarComentario idQuestao={q.id} versao={comentario.geradoEm ?? null} /></div>
        </>}
        <div className="sh-relatar"><RelatarErro idQuestao={q.id} /></div>
        <p className="sh-dica-fim">Puxe para cima no fim para ir à próxima</p>
      </div>
      <div className="sh-gaveta-pe">
        {g !== 'aberta' && <button type="button" className="sh-ler-tudo" onClick={() => p.aoGaveta('aberta')}><IconeSh nome="cima" />Ler tudo</button>}
        <button type="button" className="sh-proxima" onClick={p.aoProxima}>
          {miniatura && <span className="sh-proxima-mini" style={{ backgroundImage: `url("${miniatura}")` }} />}
          <span className="sh-proxima-texto">Próxima{qp ? <small>{temaCurto(qp.tema)} · {[qp.prova, qp.ano].filter(Boolean).join(' ')}</small> : prox && prox.tipo !== 'questao' ? <small>Seu resumo de hoje</small> : null}</span>
          {p.auto !== null ? <AnelAuto desde={p.auto} /> : <IconeSh nome="baixo" className="sh-proxima-seta" />}
        </button>
      </div>
    </div>
  )
}

function AnelAuto({ desde }: { desde: number }) {
  const C = 2 * Math.PI * 10
  const atraso = Math.max(0, desde - Date.now())
  return (
    <svg className="sh-anel-auto" viewBox="0 0 24 24" aria-label="Passando sozinha">
      <circle cx="12" cy="12" r="10" className="sh-anel-trilha" />
      <circle cx="12" cy="12" r="10" className="sh-anel-valor" strokeDasharray={C} style={{ animationDelay: `${atraso}ms`, animationDuration: `${PASSAR_EM}ms` } as CSSProperties} />
    </svg>
  )
}

/* ---------- zoom ---------- */
function ZoomImagem({ src }: { src: string }) {
  const [perto, definirPerto] = useState(false)
  return (
    <div className={`sh-zoom-area${perto ? ' sh-perto' : ''}`} onClick={() => definirPerto((x) => !x)}>
      <img src={src} alt="Imagem da questão ampliada" />
      <p className="sh-zoom-dica-texto">{perto ? 'Toque para afastar' : 'Toque para aproximar'}</p>
    </div>
  )
}

/* =====================================================================
   Muros e fim de bloco
   ===================================================================== */
function relogio(alvo: number) {
  let d = Math.max(0, Math.floor((alvo - Date.now()) / 1000))
  const h = String(Math.floor(d / 3600)).padStart(2, '0'); d %= 3600
  return `${h}:${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`
}
function usarRelogio(alvo: number) {
  const [t, definir] = useState(() => relogio(alvo))
  useEffect(() => { const i = setInterval(() => definir(relogio(alvo)), 1000); return () => clearInterval(i) }, [alvo])
  return t
}

function MuroLimite({ indice, acertos, feitas, limite, coracoes, ms, liberaEm }: { indice: number; acertos: number; feitas: number; limite: number; coracoes: number; ms: number; liberaEm: string | null }) {
  const meiaNoite = useMemo(() => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime() }, [])
  const t = usarRelogio(liberaEm ? Date.parse(liberaEm) : meiaNoite)
  return (
    <section className="sh-tela sh-muro" data-indice={indice}>
      <div className="sh-palco"><div className="sh-coluna">
        <span className="sh-muro-fundo" style={{ backgroundImage: `url("${recurso(ARTE_TEORIA)}")` }} />
        <div className="sh-muro-conteudo">
          <span className="sh-coruja sh-coruja--asas" aria-hidden="true" />
          <h2>Você fez seus {limite} Shorts de hoje</h2>
          <p className="sh-muro-apoio">Na assinatura os Shorts não acabam, e cada um conta no seu desempenho.</p>
          {feitas > 0 && (
            <div className="sh-muro-placar">
              <div><b>{acertos}/{feitas}</b><small>acertos</small></div>
              <div><b>{Math.max(1, Math.round(ms / 1000))}s</b><small>por questão</small></div>
              <div><b>{coracoes}</b><small>corações</small></div>
            </div>
          )}
          <a className="sh-botao sh-botao--ouro sh-botao--largo" href={href('/assinatura')}>Assinar e continuar</a>
          <p className="sh-muro-volta">Ou volte depois: novos Shorts em <b>{t}</b></p>
        </div>
      </div></div>
    </section>
  )
}

/** Sem conta: a questão aparece inteira, mas responder abre este convite (e volta para a mesma questão depois). */
function ConviteConta({ id, aoFechar }: { id: string | null; aoFechar: () => void }) {
  const voltar = encodeURIComponent(id ? `/shorts/${id}` : '/shorts')
  return (
    <div className="sh-convite" onClick={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div className="sh-convite-caixa" role="dialog" aria-modal="true" aria-labelledby="sh-convite-titulo">
        <button type="button" className="sh-pl-x sh-convite-x" onClick={aoFechar} aria-label="Fechar o convite"><IconeSh nome="x" /></button>
        <span className="sh-coruja sh-coruja--aceno" aria-hidden="true" />
        <h2 id="sh-convite-titulo">Crie sua conta para responder</h2>
        <p className="sh-muro-apoio">Leva um minuto e não pede cartão. Depois você volta direto para esta questão.</p>
        <ul className="sh-muro-lista">
          <li><IconeSh nome="visto" />Shorts grátis todo dia</li>
          <li><IconeSh nome="visto" />O porquê de cada alternativa, logo depois de responder</li>
          <li><IconeSh nome="visto" />Seus acertos e erros no desempenho</li>
        </ul>
        <a className="sh-botao sh-botao--ouro sh-botao--largo" href={href(`/conta?modo=criar&voltar=${voltar}`)}>Criar conta grátis</a>
        <a className="sh-botao sh-botao--fantasma sh-botao--largo" href={href(`/conta?voltar=${voltar}`)}>Já tenho conta, entrar</a>
        <button type="button" className="sh-convite-continuar" onClick={aoFechar}>Continuar só olhando</button>
      </div>
    </div>
  )
}

function FimDeBloco({ indice, ids, feitos, slides, nomeTema, aoContinuar }: { indice: number; ids: string[]; feitos: Record<string, Feito>; slides: Slide[]; nomeTema: (s: string) => string; aoContinuar: () => void }) {
  const lista = ids.map((id) => {
    const s = slides.find((x): x is Extract<Slide, { tipo: 'questao' }> => x.tipo === 'questao' && x.item.id === id)
    return s ? { tema: s.item.tema, certo: feitos[s.chave]?.certo ?? false, revisao: !!s.revisao } : null
  }).filter((x): x is { tema: string; certo: boolean; revisao: boolean } => !!x)
  const certas = lista.filter((x) => x.certo).length
  const revisoes = lista.filter((x) => x.revisao)
  const C = 2 * Math.PI * 62
  const [cheio, definirCheio] = useState(false)
  useEffect(() => { const t = setTimeout(() => definirCheio(true), 300); return () => clearTimeout(t) }, [])
  return (
    <section className="sh-tela sh-bloco" data-indice={indice}>
      <div className="sh-palco"><div className="sh-coluna"><div className="sh-bloco-conteudo">
        <div className="sh-anel">
          <svg viewBox="0 0 150 150"><circle className="sh-trilha" cx="75" cy="75" r="62" /><circle className="sh-valor" cx="75" cy="75" r="62" strokeDasharray={C} strokeDashoffset={cheio ? C * (1 - certas / Math.max(1, lista.length)) : C} /></svg>
          <span className="sh-anel-num">{certas}/{lista.length}<small>neste bloco</small></span>
        </div>
        <h2>Bloco de {lista.length} concluído</h2>
        <p className="sh-muro-apoio">{certas === lista.length ? 'Nenhum erro. Raro e bonito.' : 'As que você errou podem voltar daqui a alguns dias, sem aviso.'}
          {revisoes.length > 0 && ` ${revisoes.length} ${revisoes.length === 1 ? 'revisão' : 'revisões'}, ${revisoes.filter((r) => r.certo).length} fixada${revisoes.filter((r) => r.certo).length === 1 ? '' : 's'}.`}</p>
        <div className="sh-bloco-temas">{lista.map((x, i) => <span key={i} className={x.certo ? '' : 'sh-erro'}>{temaCurto(nomeTema(x.tema) || x.tema)}</span>)}</div>
        <button type="button" className="sh-botao sh-botao--ouro sh-botao--largo" onClick={aoContinuar}>Continuar deslizando</button>
        <a className="sh-botao sh-botao--fantasma sh-botao--largo" href={href('/dados')}>Ver meu desempenho</a>
      </div></div></div>
    </section>
  )
}

/* =====================================================================
   Ajustes
   ===================================================================== */
function Ajustes({ inicial, aoFechar, aoAplicar }: { inicial: AjustesShorts; aoFechar: () => void; aoAplicar: (a: AjustesShorts) => void }) {
  const [a, definir] = useState(inicial)
  const troca = (k: keyof AjustesShorts) => definir((x) => ({ ...x, [k]: !x[k] }))
  const provas: Array<[keyof AjustesShorts, string]> = [['teot', 'TEOT'], ['taro', 'TARO'], ['mao', 'Cirurgia da Mão'], ['outras', 'Outras provas']]
  const chaves: Array<[keyof AjustesShorts, string, string]> = [
    ['passarSozinha', 'Passar sozinha ao acertar', 'A próxima vem em 5 segundos; tocar no comentário pausa'],
    ['som', 'Som ao acertar', 'Um sininho baixinho, só quando você acerta'],
    ['soImagem', 'Só com imagem', 'Raio-X, ressonância, fotos e figuras'],
    ['soIneditas', 'Só inéditas', 'Questões que você ainda não fez nos Shorts'],
    ['revanche', 'Revisão surpresa', 'Às vezes uma questão volta, de 3 a 7 dias depois'],
  ]
  return (
    <div className="sh-folha-config" onClick={(e) => { if (e.target === e.currentTarget) aoFechar() }}>
      <div className="sh-folha-config-caixa" role="dialog" aria-labelledby="sh-t-config">
        <span className="sh-alca" aria-hidden="true" />
        <h3 id="sh-t-config">Seus Shorts</h3>
        <p className="sh-config-apoio">O que entra no sorteio. Com TEOT e TARO, entram também as questões com imagem das outras provas de ortopedia geral.</p>
        <p className="sh-config-rotulo">Provas</p>
        <div className="sh-chips">{provas.map(([k, r]) => <button key={k} type="button" className="sh-chip-sel" aria-pressed={!!a[k]} onClick={() => troca(k)}>{r}</button>)}</div>
        <div className="sh-chaves">
          {chaves.map(([k, t, d]) => (
            <label key={k} className="sh-chave"><span><strong>{t}</strong><small>{d}</small>
              {k === 'som' && <button type="button" className="sh-ouvir" onClick={(e) => { e.preventDefault(); tocarAcerto({ sequencia: 5 }) }}>Ouvir</button>}
            </span><input type="checkbox" checked={!!a[k]} onChange={() => troca(k)} /><i /></label>
          ))}
        </div>
        <button type="button" className="sh-botao sh-botao--largo" onClick={() => aoAplicar(a)}>Aplicar</button>
      </div>
    </div>
  )
}
