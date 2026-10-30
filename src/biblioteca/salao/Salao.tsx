import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { recurso } from '../../config'
import { DATAS_PROVA } from '../../estado/conquistas'
import type { Indice } from '../../dados/tipos'
import { corDaArea } from '../../dados/coresAreas'
import { href, navegar } from '../../util/rotas'
import { Icone } from '../../componentes/Icone'
import { JanelaCentral } from '../../componentes/JanelaCentral'
import { apelidoLivro, capitulosDoResumo, tituloLombada, estadoLeitura, numeroCapitulo, rotuloLivro, sobreLivro } from '../estante'
import { ordemDoDia } from '../recomendar'
import type { Leitura, ResumoCapitulo } from '../tipos'
import { hojeBR } from '../../util/dia'
import { Sprite } from './Sprite'
import {
  ABOBORA, CORUJA_ACORDADA, CORUJA_DORMINDO, GATO_ACORDADO, GATO_DORMINDO, GATO_ORELHA, LAMPARINA, MORCEGO, PALETA_ABOBORA, PALETA_CORUJA,
  PALETA_GATO, PALETA_LAMPARINA, PALETA_LAMPARINA_APAGADA, PALETA_MORCEGO, PALETA_PLANTA, PALETA_XICARA, PLANTA, PLANTA_FLORIDA, XICARA,
} from './sprites'
import { EVENTO_SEGREDO, NOME_RARIDADE, SEGREDOS, acharSegredo, diasAteProva, epoca, madrugada, palavraMagica, raridade, segredosAchados, type IdSegredo } from './segredos'
import { RAROS } from './raros'
import { FRASES_AREAS_AMOSTRA } from '../porta'
import { ligarSom, somLigado, tocar } from './sons'
import '../../estilos/paginas/Salao.css'

/** As provas em que o capítulo já caiu, como chips: "TARO 2007–2024". Só das questões citadas no resumo (ids). */
export function provasDoCapitulo(indice: Indice | null, ids: string[]): string[] {
  if (!indice) return []
  const porProva = new Map<string, number[]>()
  for (const id of ids) {
    const q = indice.questoes.find((x) => x.id === id)
    if (!q || q.p === null || q.p === undefined) continue
    const p = indice.provas[q.p]
    const l = porProva.get(p) ?? []; if (q.a) l.push(q.a); porProva.set(p, l)
  }
  return [...porProva].sort((a, b) => b[1].length - a[1].length).map(([p, anos]) => anos.length ? `${p} ${Math.min(...anos)}${Math.max(...anos) !== Math.min(...anos) ? `–${Math.max(...anos)}` : ''}` : p)
}

const ABRIR_MS = 520
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const cliqueComum = (e: MouseEvent) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

/** Dicas da coruja (um toque, uma dica). */
const DICAS = [
  'A cor da lombada é a área; a altura, o tempo de leitura.',
  'A pedrinha na base da lombada diz o quanto o capítulo cai na prova: comum, raro, épico ou lendário.',
  'Fita pendurada é livro que você começou. Estrela dourada é livro lido até o fim.',
  'No fichário, busque por classificação: "Schatzker", "Neer", "Garden"...',
  'Leia o resumo do tema antes das questões: você chega sabendo o que a banca procura.',
  'Dizem que este salão guarda segredos. Um deles leva às pistas de todos os outros.',
]

interface Frase { texto: string; id: string; origem?: string }
interface Livro { chave: string; rotulo: string; capitulos: ResumoCapitulo[] }

export interface PropsSalao {
  capitulos: ResumoCapitulo[]
  livros: Livro[]
  /** Ids que passam nos filtros do fichário (os outros recuam na estante). */
  achados: Set<string>
  filtrosAtivos: boolean
  busca: string
  leituras: Record<string, Leitura | undefined>
  destaques: number
  premium: boolean
  indice: Indice | null
  continuar: Array<{ c: ResumoCapitulo; l?: Leitura }>
  aviso?: ReactNode
  fichario?: ReactNode
  botaoModo: ReactNode
  aoAbrirGuia: () => void
  /** Pedido do painel "Encontre o resumo": ir até a lombada e abrir a ficha (n muda a cada pedido). */
  irPara?: { id: string; n: number } | null
  /** Pedido do painel: rolar até a estante do livro. */
  irLivro?: { chave: string; n: number } | null
}

/** Id da estante de um livro no endereço da página (o painel do topo rola até ele). */
export const idEstante = (chave: string) => `sl-l-${chave.normalize('NFD').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()}`

/** Cor da capa de cada obra (placa da estante e popup), para reconhecer o livro de longe. */
const CAPAS: Array<[RegExp, string]> = [
  [/Fractures in Adults/i, '#a8322d'], [/Fractures in Children/i, '#2b5c9e'], [/Campbell/i, '#23395b'],
  [/Tachdjian/i, '#1f6f78'], [/Green/i, '#2f6b3a'], [/Netter/i, '#b5762a'],
]
export const corDaCapa = (livro: string) => CAPAS.find(([r]) => r.test(livro))?.[1] ?? '#5b3519'

/** Popup da lombada: aonde ele aparece e se ficou preso (toque no celular). */
interface Pop { c: ResumoCapitulo; x: number; topo: number; base: number; preso: boolean }

/**
 * Salão da Biblioteca (pedido do Tales, 30/10/2026: "como se a página inteira fosse um jogo"). Uma estante
 * de madeira por livro, com uma lombada por resumo; a ficha de item ao tocar; a mesa de leitura, o quadro-negro
 * e a escrivaninha; e os segredos (segredos.ts). Dia no tema claro, noite no escuro, tudo em CSS e box-shadow.
 */
export function Salao(p: PropsSalao) {
  const { capitulos, livros, leituras } = p
  const raiz = useRef<HTMLDivElement>(null)
  const agora = useAgora()
  const [ficha, definirFicha] = useState<{ c: ResumoCapitulo; selo?: string } | null>(null)
  const [pop, definirPop] = useState<Pop | null>(null)
  const [realce, definirRealce] = useState<string | null>(null)
  const [aviso, definirAviso] = useState<{ texto: string; n: number } | null>(null)
  const [chuva, definirChuva] = useState(0)
  const [achados, definirAchados] = useState<IdSegredo[]>(() => segredosAchados())
  const [som, definirSom] = useState(() => somLigado())
  const [passagem, definirPassagem] = useState<'fechada' | 'girando' | 'aberta'>('fechada')
  const [lampadas, definirLampadas] = useState([true, true])
  const [efeitos, definirEfeitos] = useState<Set<IdSegredo>>(new Set())
  const [gato, definirGato] = useState(0)
  const [coruja, definirCoruja] = useState<{ fala: number | null; girando: boolean }>({ fala: null, girando: false })
  const [escada, definirEscada] = useState(0)
  const [relogioGira, definirRelogioGira] = useState(false)
  const toquesCoruja = useRef<number[]>([])
  const toquesPlaca = useRef<number[]>([])
  const relogios = useRef<number[]>([])
  const depois = useCallback((f: () => void, ms: number) => { relogios.current.push(window.setTimeout(f, ms)) }, [])
  useEffect(() => () => relogios.current.forEach((t) => window.clearTimeout(t)), [])

  const avisar = useCallback((texto: string) => { definirAviso((a) => ({ texto, n: (a?.n ?? 0) + 1 })) }, [])
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => definirAviso(null), 5200); return () => window.clearTimeout(t) }, [aviso])
  const achar = useCallback((id: IdSegredo, texto?: string) => {
    if (acharSegredo(id)) {
      tocar('segredo')
      definirChuva((n) => n + 1)
      const s = SEGREDOS.find((x) => x.id === id)!
      avisar(`Segredo encontrado: ${s.nome} (${segredosAchados().length} de ${SEGREDOS.length})${texto ? `. ${texto}` : ''}`)
    } else if (texto) avisar(texto)
  }, [avisar])
  useEffect(() => {
    const atualizar = () => definirAchados(segredosAchados())
    window.addEventListener(EVENTO_SEGREDO, atualizar)
    return () => window.removeEventListener(EVENTO_SEGREDO, atualizar)
  }, [])

  // Hora e data: madrugada, época do ano e véspera de prova.
  const ehMadrugada = madrugada(agora)
  const estacao = epoca(agora)
  const faltam = diasAteProva(agora, DATAS_PROVA)
  useEffect(() => { if (ehMadrugada) achar('madrugada', 'Plantão? Estes cabem em poucos minutos.') }, [ehMadrugada]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (estacao) achar('sazonal', estacao === 'halloween' ? 'Abóboras no salão até o fim de outubro.' : 'Pisca-pisca no salão em dezembro.') }, [estacao]) // eslint-disable-line react-hooks/exhaustive-deps

  // Palavras mágicas do fichário.
  const magica = palavraMagica(p.busca)
  useEffect(() => {
    if (!magica) return
    definirEfeitos((e) => new Set(e).add(magica.segredo))
    if (magica.segredo === 'lowell') { definirGato(3); depois(() => definirGato(0), 2600) }
    achar(magica.segredo, magica.aviso)
  }, [magica?.segredo]) // eslint-disable-line react-hooks/exhaustive-deps

  // "ortoquestoes" digitado em qualquer lugar do salão (fora dos campos de texto).
  useEffect(() => {
    let buffer = ''
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null
      if (alvo && /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName)) return
      if (e.key.length !== 1) return
      buffer = (buffer + e.key.toLowerCase()).slice(-12)
      if (buffer.endsWith('ortoquestoes')) achar('orto', 'A biblioteca agradece a visita, colega.')
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [achar])

  const curtos = useMemo(() => [...capitulos].sort((a, b) => a.minutos - b.minutos).slice(0, 3), [capitulos])
  const lidos = capitulos.filter((c) => estadoLeitura(leituras[c.id]) === 'concluido').length

  const abrirFicha = (c: ResumoCapitulo, selo?: string) => { tocar('puxar'); definirFicha({ c, selo }) }
  const temMouse = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches
  const mostrarPop = (c: ResumoCapitulo, el: HTMLElement, preso = false) => {
    const r = el.getBoundingClientRect()
    definirPop({ c, x: r.left + r.width / 2, topo: r.top, base: r.bottom, preso })
  }
  const lombadaClique = (c: ResumoCapitulo) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cliqueComum(e)) return
    e.preventDefault()
    // No celular, o primeiro toque puxa o livro e mostra os dados; o segundo (ou "Abrir a ficha") abre.
    if (!temMouse() && pop?.c.id !== c.id) { tocar('puxar'); mostrarPop(c, e.currentTarget, true); return }
    definirPop(null)
    abrirFicha(c)
  }
  // Rolar a página tira o popup (ele fica preso à posição do livro na tela).
  useEffect(() => {
    if (!pop) return
    const fechar = () => definirPop(null)
    window.addEventListener('scroll', fechar, { passive: true, once: true })
    return () => window.removeEventListener('scroll', fechar)
  }, [pop])
  // Painel do topo: ir até a lombada (realce e ficha) ou até a estante do livro.
  useEffect(() => {
    if (!p.irPara) return
    const { id } = p.irPara
    const c = capitulos.find((x) => x.id === id)
    if (!c) return
    const el = raiz.current?.querySelector<HTMLElement>(`.sl-estante:not(.sl-estante--cobrados) [data-cap="${CSS.escape(id)}"]`)
    el?.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'center' })
    definirRealce(id)
    const t1 = window.setTimeout(() => abrirFicha(c), el && !semMovimento() ? 750 : 0)
    const t2 = window.setTimeout(() => definirRealce(null), 2600)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
  }, [p.irPara?.n]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!p.irLivro) return
    document.getElementById(idEstante(p.irLivro.chave))?.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' })
  }, [p.irLivro?.n]) // eslint-disable-line react-hooks/exhaustive-deps
  const cobrados = useMemo(() => [...capitulos].sort((a, b) => b.questoes.length - a.questoes.length).slice(0, 10), [capitulos])

  // ── Personagens e objetos ──
  const tocarGato = () => {
    tocar(gato >= 2 ? 'miau' : 'tique')
    const proximo = gato + 1
    if (proximo >= 4) {
      definirGato(4)
      const sorteado = capitulos[Math.floor(Math.random() * capitulos.length)]
      depois(() => { definirGato(0); abrirFicha(sorteado, 'O gato derrubou este livro da prateleira') ; achar('gato') }, semMovimento() ? 0 : 700)
    } else definirGato(proximo)
  }
  const tocarCoruja = () => {
    const t = Date.now()
    toquesCoruja.current = [...toquesCoruja.current.filter((x) => t - x < 2500), t]
    tocar('pio')
    if (toquesCoruja.current.length >= 5) {
      toquesCoruja.current = []
      definirCoruja({ fala: null, girando: true })
      depois(() => definirCoruja((c) => ({ ...c, girando: false })), 1400)
      achar('coruja', 'Corujas giram a cabeça até 270 graus. Não tente isso no seu pescoço.')
      return
    }
    definirCoruja((c) => ({ girando: false, fala: c.fala === null ? 0 : (c.fala + 1) % DICAS.length }))
  }
  const tocarPlaca = () => {
    const t = Date.now()
    toquesPlaca.current = [...toquesPlaca.current.filter((x) => t - x < 4000), t]
    if (toquesPlaca.current.length >= 7) { toquesPlaca.current = []; achar('orto', 'A biblioteca agradece a visita, colega.') }
  }
  const tocarLampada = (i: number) => {
    tocar('tique')
    const novas = lampadas.map((v, j) => (j === i ? !v : v))
    definirLampadas(novas)
    if (novas.every((v) => !v)) achar('lanterna', 'Use a lanterna: ela segue o seu dedo ou o mouse. Toque numa lamparina para acender.')
  }
  const tocarRelogio = () => {
    tocar('tique')
    definirRelogioGira(true)
    depois(() => definirRelogioGira(false), 1200)
    const curto = curtos[0]
    achar('relogio', `São ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Dá tempo de ler "${curto?.titulo}" em ~${curto?.minutos} min.`)
  }
  const tocarEscada = () => {
    tocar('tique')
    const n = escada + 1
    definirEscada(n)
    if (n >= 3) {
      const alto = [...capitulos].sort((a, b) => b.minutos - a.minutos)[0]
      depois(() => { definirEscada(0); abrirFicha(alto, 'O livro mais alto da biblioteca'); achar('escada') }, semMovimento() ? 0 : 900)
    }
  }
  const abrirPassagem = () => {
    tocar('gaveta')
    definirPassagem('girando')
    depois(() => { definirPassagem('aberta'); achar('passagem', 'Bem-vindo à Sala dos raros.') }, semMovimento() ? 0 : 650)
  }

  // Lanterna: o salão às escuras e um círculo de luz que segue o ponteiro.
  const breu = lampadas.every((v) => !v)
  const moverLuz = (e: PointerEvent<HTMLDivElement>) => {
    if (!breu || !raiz.current) return
    const r = raiz.current.getBoundingClientRect()
    raiz.current.style.setProperty('--luz-x', `${e.clientX - r.left}px`)
    raiz.current.style.setProperty('--luz-y', `${e.clientY - r.top}px`)
  }

  // A escada corre até o primeiro livro achado pela busca.
  const primeiraBusca = p.filtrosAtivos && p.busca.trim() ? livros.flatMap((l) => l.capitulos).find((c) => p.achados.has(c.id))?.id ?? null : null
  const [posEscada, definirPosEscada] = useState<CSSProperties | undefined>(undefined)
  useLayoutEffect(() => {
    const alvo = primeiraBusca ? raiz.current?.querySelector<HTMLElement>('.sl-lombada--alvo') : null
    definirPosEscada(alvo ? { left: alvo.offsetLeft - 44, top: alvo.offsetTop + alvo.offsetHeight + 10 - 210, right: 'auto' } : undefined)
  }, [primeiraBusca])
  const indicePassagem = Math.min(2, livros.length - 1)
  const lamparinas = efeitos.has('codman') ? [0, 1, 2, 3] : [0, 1]

  const classe = ['sl',
    breu && 'sl--breu', ehMadrugada && 'sl--madrugada', estacao && `sl--${estacao}`,
    efeitos.has('garden') && 'sl--jardim', efeitos.has('gesso') && 'sl--gesso',
  ].filter(Boolean).join(' ')

  return (
    <div ref={raiz} className={classe} onPointerMove={moverLuz}>
      {chuva > 0 && <ChuvaDeLivros key={chuva} />}
      {aviso && <p key={aviso.n} className="sl-aviso" role="status"><Sprite grade={CORUJA_ACORDADA} paleta={PALETA_CORUJA} px={2} /> <span>{aviso.texto}</span></p>}

      {/* ── Fachada: a parede do salão com a placa, a janela, as lamparinas e o relógio ── */}
      <header className="sl-fachada">
        {estacao === 'natal' && <span className="sl-pisca" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} />)}</span>}
        {faltam !== null && faltam <= 14 && <p className="sl-bandeirolas"><span aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} />)}</span><b>{faltam === 0 ? 'Hoje é dia de prova. Boa prova!' : faltam === 1 ? 'A prova é amanhã. Revise, durma e confie.' : `Faltam ${faltam} dias para a prova`}</b></p>}
        <div className="sl-parede">
          <span className="sl-janela" aria-hidden="true"><i /><i /><i /><i /><b className="sl-janela__astro" /></span>
          <span className="sl-feixe" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} />)}</span>
          {lamparinas.map((i) => {
            const acesa = i > 1 ? true : lampadas[i]
            return <button key={i} type="button" className={`sl-lamparina sl-lamparina--${i}${acesa ? ' sl-lamparina--acesa' : ''}`} onClick={() => i < 2 && tocarLampada(i)} aria-label={acesa ? 'Apagar a lamparina' : 'Acender a lamparina'} aria-pressed={acesa} disabled={i > 1}>
              <Sprite grade={LAMPARINA} paleta={acesa ? PALETA_LAMPARINA : PALETA_LAMPARINA_APAGADA} px={3} />
            </button>
          })}
          <button type="button" className={'sl-relogio' + (relogioGira ? ' sl-relogio--gira' : '')} onClick={tocarRelogio} aria-label={`Relógio: ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}>
            <i className="sl-relogio__h" style={{ transform: `rotate(${(agora.getHours() % 12) * 30 + agora.getMinutes() / 2}deg)` }} />
            <i className="sl-relogio__m" style={{ transform: `rotate(${agora.getMinutes() * 6}deg)` }} />
          </button>
          {estacao === 'halloween' && <span className="sl-morcegos" aria-hidden="true"><Sprite grade={MORCEGO} paleta={PALETA_MORCEGO} px={3} /><Sprite grade={MORCEGO} paleta={PALETA_MORCEGO} px={2} /></span>}

          <div className="sl-placa" onClick={tocarPlaca}>
            <p className="sl-placa__selo">Biblioteca OrtoQuestões{achados.includes('orto') && <span> · bibliotecário honorário</span>}</p>
            <h1>Biblioteca de <em>resumos</em></h1>
            <p className="sl-placa__conta numerico">{capitulos.length} resumos · {livros.length} livros · {lidos} {lidos === 1 ? 'lido' : 'lidos'} por você</p>
          </div>

          <div className="sl-poleiro">
            {coruja.fala !== null && <p className="sl-balao" role="status">{DICAS[coruja.fala]} <button type="button" onClick={(e) => { e.stopPropagation(); definirCoruja({ fala: null, girando: false }); p.aoAbrirGuia() }}>Fazer o tour</button></p>}
            <button type="button" className={'sl-coruja' + (coruja.girando ? ' sl-coruja--gira' : '')} onClick={tocarCoruja} aria-label="Coruja bibliotecária: uma dica" data-guia="ajuda">
              <Sprite grade={ehMadrugada || coruja.fala !== null || coruja.girando ? CORUJA_ACORDADA : CORUJA_DORMINDO} paleta={PALETA_CORUJA} px={4} />
            </button>
            <span className="sl-poleiro__tabua" aria-hidden="true" />
          </div>
        </div>

        <div className="sl-entrada">
          <p className="sl-lide">Estude pelos livros de referência, com foco no que cai nas provas. Cada livro da estante é um capítulo reescrito em português, que mostra onde o assunto já foi cobrado e abre as questões ali mesmo. <b>Leitura grátis.</b></p>
          {p.aviso}
          {ehMadrugada && <p className="sl-plantao"><Icone nome="lua" tamanho={15} /> <span>Plantão? Estes cabem em poucos minutos: {curtos.map((c, i) => <span key={c.id}>{i > 0 && ', '}<a href={href(`/resumos/${c.id}`)}>{c.titulo}</a> ({c.minutos} min)</span>)}.</span></p>}
          <div className="sl-acoes">
            {p.continuar[0]
              ? <a className="rs-botao-ouro" href={href(`/resumos/${p.continuar[0].c.id}`)}><Icone nome="livro" tamanho={18} /> Continuar de onde parei</a>
              : <button type="button" className="rs-botao-ouro" onClick={() => document.getElementById('sl-estantes')?.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' })}><Icone nome="livro" tamanho={18} /> Escolher um livro</button>}
            <button type="button" className="sl-botao" aria-pressed={som} onClick={() => { ligarSom(!som); definirSom(!som); if (!som) window.setTimeout(() => tocar('tique'), 0) }}>{som ? 'Som ligado' : 'Som desligado'}</button>
            {p.botaoModo}
          </div>
        </div>
        <span className="sl-planta sl-planta--esq" aria-hidden="true"><Sprite grade={efeitos.has('garden') ? PLANTA_FLORIDA : PLANTA} paleta={PALETA_PLANTA} px={4} /></span>
        <span className="sl-planta sl-planta--dir" aria-hidden="true"><Sprite grade={efeitos.has('garden') ? PLANTA_FLORIDA : PLANTA} paleta={PALETA_PLANTA} px={4} /></span>
        {estacao === 'halloween' && <span className="sl-aboboras" aria-hidden="true"><Sprite grade={ABOBORA} paleta={PALETA_ABOBORA} px={4} /><Sprite grade={ABOBORA} paleta={PALETA_ABOBORA} px={3} /></span>}
        <span className="sl-vagalumes" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} />)}</span>
      </header>

      {/* ── Móveis: mesa de leitura, quadro-negro e escrivaninha ── */}
      <div className="sl-moveis">
        <MesaLeitura continuar={p.continuar} capitulos={capitulos} />
        <QuadroNegro premium={p.premium} />
        <div className="sl-escrivaninha">
          <a className="sl-caderno" href={href('/resumos/caderno')} data-guia="caderno">
            <span className="sl-caderno__capa" aria-hidden="true"><i /></span>
            <span><strong>Meu caderno</strong><small>{p.destaques ? `${p.destaques} ${p.destaques === 1 ? 'destaque' : 'destaques'} e notas` : 'Seus destaques e notas, em todos os aparelhos'}</small></span>
          </a>
          <a className="sl-caixa-atlas" href={href('/atlas')}>
            <span className="sl-caixa-atlas__caixa" aria-hidden="true"><b>3D</b></span>
            <span><strong>Atlas 3D</strong><small>Clique no osso, veja a fratura</small></span>
          </a>
          <a className="sl-caixa-atlas" href={href('/resumos/frases')}>
            <span className="sl-caixa-atlas__caixa sl-caixa-atlas__caixa--giz" aria-hidden="true"><b>Aa</b></span>
            <span><strong>Frases que caem</strong><small>Uma frase por assunto, para a véspera</small></span>
          </a>
        </div>
      </div>

      {/* O painel "Encontre o resumo" (normal, sem pixel) logo antes das estantes, onde se procura o livro. */}
      {p.fichario && <div className="sl-encontre">{p.fichario}</div>}

      {efeitos.has('cafe') && <section className="sl-cafe" aria-label="Café de plantão">
        <Sprite grade={XICARA} paleta={PALETA_XICARA} px={4} className="sl-cafe__xicara" />
        <span className="sl-cafe__vapor" aria-hidden="true"><i /><i /><i /></span>
        <div><strong>Café de plantão</strong><p>Os três resumos mais curtos da biblioteca, para ler enquanto o café esfria:</p>
          <ul>{curtos.map((c) => <li key={c.id}><a href={href(`/resumos/${c.id}`)}>{c.titulo}</a> <small>~{c.minutos} min</small></li>)}</ul></div>
      </section>}

      {/* ── As estantes, uma por livro ── */}
      <div className="sl-estantes" id="sl-estantes" onMouseLeave={() => { if (pop && !pop.preso) definirPop(null) }}>
        {!p.filtrosAtivos && <section className="sl-estante sl-estante--larga sl-estante--cobrados" aria-labelledby="sl-cobrados">
          <header className="sl-estante__placa">
            <span className="sl-capa sl-capa--trofeu" aria-hidden="true"><b>★</b></span>
            <div className="sl-estante__nome">
              <h2 id="sl-cobrados"><span>Mais cobrados nas provas</span></h2>
              <p className="sl-estante__sobre">Os {cobrados.length} capítulos com mais questões de prova, de todos os livros. Bom lugar para começar.</p>
            </div>
          </header>
          <div className="sl-estante__corpo">
            <ul className="sl-prateleiras" aria-label="Mais cobrados nas provas">
              {cobrados.map((c) => <Lombada key={c.id} c={c} leitura={leituras[c.id]} fechado={c.acesso !== 'gratis' && !p.premium} apagada={false} alvo={false}
                ativo={pop?.c.id === c.id} livroNaLombada aoMostrar={(el) => temMouse() && mostrarPop(c, el)} aoEsconder={() => definirPop((x) => (x?.preso ? x : null))} aoClicar={lombadaClique(c)} />)}
            </ul>
          </div>
        </section>}
        {livros.map((l, li) => {
          const algum = !p.filtrosAtivos || l.capitulos.some((c) => p.achados.has(c.id))
          if (!algum) return null
          if (li === indicePassagem && passagem === 'aberta') return <SalaRaros key="raros" achados={achados} aoVoltar={() => { tocar('gaveta'); definirPassagem('fechada') }} />
          const lidosLivro = l.capitulos.filter((c) => estadoLeitura(leituras[c.id]) === 'concluido').length
          const completo = lidosLivro === l.capitulos.length
          const [nome, edicao] = [apelidoLivro(l.capitulos[0].livro), l.rotulo.split(' · ')[1]]
          return (
            <section key={l.chave} id={idEstante(l.chave)} className={'sl-estante' + (l.capitulos.length > 12 ? ' sl-estante--larga' : '') + (li === indicePassagem && passagem === 'girando' ? ' sl-estante--girando' : '')} aria-labelledby={`sl-e-${li}`}>
              <header className="sl-estante__placa">
                <span className="sl-capa" style={{ '--capa': corDaCapa(l.capitulos[0].livro) } as CSSProperties} aria-hidden="true"><b>{nome.split(' ')[0]}</b><small>{edicao}</small></span>
                <div className="sl-estante__nome">
                  <h2 id={`sl-e-${li}`}><span>{nome}</span> <small>{edicao} · {l.capitulos.length} {l.capitulos.length === 1 ? 'resumo' : 'resumos'}</small></h2>
                  <p className="sl-estante__sobre">{sobreLivro(l.capitulos[0].livro)}</p>
                </div>
                {li === 1 && <button type="button" className={`sl-gato sl-gato--${gato}`} onClick={tocarGato} aria-label="Gato da biblioteca">
                  <Sprite grade={gato === 0 ? GATO_DORMINDO : gato === 1 ? GATO_ORELHA : GATO_ACORDADO} paleta={PALETA_GATO} px={3} />
                  <span className="sl-gato__gesso" aria-hidden="true" />
                  {gato === 0 && <span className="sl-gato__zz" aria-hidden="true">z<small>z</small></span>}
                </button>}
                <p className={'sl-estante__conta' + (completo ? ' sl-estante__conta--completa' : '')}>{completo ? <><Icone nome="estrela" tamanho={13} /> Coleção completa</> : <><b className="numerico">{lidosLivro}</b> de {l.capitulos.length} lidos</>}</p>
              </header>
              <div className="sl-estante__corpo">
                {(primeiraBusca ? l.capitulos.some((c) => c.id === primeiraBusca) : li === 0) && (
                  <button type="button" className={`sl-escada sl-escada--${Math.min(escada, 3)}`} onClick={tocarEscada} aria-label="Escada da biblioteca" style={posEscada} />
                )}
                <ul className="sl-prateleiras" aria-label={`Resumos do ${l.rotulo}`}>
                  {l.capitulos.map((c, ci) => <Lombada key={c.id} c={c} guia={li === 0 && ci === 0} leitura={leituras[c.id]} fechado={c.acesso !== 'gratis' && !p.premium}
                    apagada={p.filtrosAtivos && !p.achados.has(c.id)} alvo={c.id === primeiraBusca || c.id === realce} ativo={pop?.c.id === c.id}
                    aoMostrar={(el) => temMouse() && mostrarPop(c, el)} aoEsconder={() => definirPop((x) => (x?.preso ? x : null))} aoClicar={lombadaClique(c)} />)}
                  <li className="sl-enfeite" aria-hidden="true">{li % 2 ? <span className="sl-ampulheta" /> : <span className="sl-pilha"><i /><i /><i /></span>}{li % 3 === 2 && <Sprite grade={PLANTA} paleta={PALETA_PLANTA} px={2} />}</li>
                  {li === indicePassagem && <li className="sl-torto"><button type="button" onClick={abrirPassagem} aria-label="Um livro torto na prateleira" /></li>}
                </ul>
              </div>
            </section>
          )
        })}
      </div>
      <div className="sl-piso" aria-hidden="true" />

      {pop && <PopLombada pop={pop} leitura={leituras[pop.c.id]} indice={p.indice} fechado={pop.c.acesso !== 'gratis' && !p.premium}
        aoAbrir={() => { const c = pop.c; definirPop(null); abrirFicha(c) }} aoFechar={() => definirPop(null)} />}
      {ficha && <FichaItem c={ficha.c} selo={ficha.selo} leitura={leituras[ficha.c.id]} fechado={ficha.c.acesso !== 'gratis' && !p.premium} indice={p.indice} aoFechar={() => definirFicha(null)} />}
    </div>
  )
}

/** Hora atual, atualizada a cada 30 segundos (relógio, madrugada, época). */
function useAgora() {
  const [agora, definir] = useState(() => new Date())
  useEffect(() => { const t = window.setInterval(() => definir(new Date()), 30000); return () => window.clearInterval(t) }, [])
  return agora
}

interface PropsLombada {
  c: ResumoCapitulo; leitura?: Leitura; fechado: boolean; apagada: boolean; alvo: boolean; ativo: boolean; guia?: boolean
  /** Na prateleira dos mais cobrados, a lombada leva também o nome curto do livro. */
  livroNaLombada?: boolean
  aoMostrar: (el: HTMLElement) => void; aoEsconder: () => void; aoClicar: (e: MouseEvent<HTMLAnchorElement>) => void
}
function Lombada({ c, leitura, fechado, apagada, alvo, ativo, guia, livroNaLombada, aoMostrar, aoEsconder, aoClicar }: PropsLombada) {
  const estado = estadoLeitura(leitura)
  const r = raridade(c.questoes.length)
  const n = numeroCapitulo(c)
  const estilo = {
    '--cor': corDaArea(c.especialidade),
    '--alt': `${142 + Math.round(Math.min(c.minutos, 70) / 70 * 34)}px`,
    '--larg': `${32 + Math.round(Math.min(c.questoes.length, 100) / 100 * 8)}px`,
  } as CSSProperties
  return (
    <li className={apagada ? 'sl-li--apagada' : undefined}>
      <a href={href(`/resumos/${c.id}`)} className={`sl-lombada sl-lombada--${estado}${alvo ? ' sl-lombada--alvo' : ''}${ativo ? ' sl-lombada--ativa' : ''}`} style={estilo} onClick={aoClicar}
        onMouseEnter={(e) => aoMostrar(e.currentTarget)} onMouseLeave={aoEsconder} onFocus={(e) => aoMostrar(e.currentTarget)} onBlur={aoEsconder}
        data-cap={c.id} data-guia={guia ? 'cartao' : undefined} tabIndex={apagada ? -1 : undefined} aria-describedby={ativo ? 'sl-pop' : undefined}>
        <span className="sl-lombada__num" aria-hidden="true">{n === Number.MAX_SAFE_INTEGER ? '·' : n}</span>
        <span className="sl-lombada__titulo" aria-hidden="true">{livroNaLombada ? `${apelidoLivro(c.livro)} · ` : ''}{tituloLombada(c.titulo)}</span>
        <span className={`sl-gema sl-gema--${r}`} aria-hidden="true" />
        {estado === 'andamento' && <span className="sl-lombada__fita" aria-hidden="true" />}
        {estado === 'concluido' && <span className="sl-lombada__selo" aria-hidden="true" />}
        {fechado && <span className="sl-lombada__cadeado" aria-hidden="true"><Icone nome="cadeado" tamanho={10} /></span>}
        <span className="so-leitor">{c.titulo}, {apelidoLivro(c.livro)}, capítulo {n}, cerca de {c.minutos} minutos, {c.questoes.length} questões de prova{estado === 'concluido' ? ', lido' : estado === 'andamento' ? `, ${leitura?.progresso ?? 0}% lido` : ''}{fechado ? ', para assinantes' : ''}</span>
      </a>
    </li>
  )
}

/** Popup ao passar o mouse (ou no primeiro toque): os dados do livro ao lado da lombada. */
function PopLombada({ pop, leitura, indice, fechado, aoAbrir, aoFechar }: { pop: Pop; leitura?: Leitura; indice: Indice | null; fechado: boolean; aoAbrir: () => void; aoFechar: () => void }) {
  const { c } = pop
  const estado = estadoLeitura(leitura)
  const pct = estado === 'concluido' ? 100 : leitura?.progresso ?? 0
  const r = raridade(c.questoes.length)
  const provas = provasDoCapitulo(indice, c.questoes)
  const largura = Math.min(300, window.innerWidth - 24)
  const x = Math.max(12 + largura / 2, Math.min(window.innerWidth - 12 - largura / 2, pop.x))
  const embaixo = pop.topo < 300
  const estilo = { left: x, top: embaixo ? pop.base + 12 : pop.topo - 12, width: largura, '--capa': corDaCapa(c.livro) } as CSSProperties
  // No celular o cartão fica preso embaixo: fecha pelo X, tocando fora, arrastando para baixo ou com Esc
  // (pedido do Tales, 30/10/2026: "é difícil fechar").
  const inicioToque = useRef<number | null>(null)
  const [arrasto, definirArrasto] = useState(0)
  useEffect(() => {
    if (!pop.preso) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') aoFechar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [pop.preso, aoFechar])
  return (<>
    {pop.preso && <div className="sl-pop-fundo" onClick={aoFechar} aria-hidden="true" />}
    <div id="sl-pop" role={pop.preso ? 'dialog' : 'tooltip'} aria-label={pop.preso ? `Dados do livro: ${c.titulo}` : undefined}
      className={`sl-pop${embaixo ? ' sl-pop--embaixo' : ''}${pop.preso ? ' sl-pop--preso' : ''}`}
      style={pop.preso && arrasto > 0 ? { ...estilo, transform: `translateY(${arrasto}px)`, transition: 'none' } : estilo}
      onTouchStart={(e) => { if (pop.preso) inicioToque.current = e.touches[0].clientY }}
      onTouchMove={(e) => { if (inicioToque.current !== null) definirArrasto(Math.max(0, e.touches[0].clientY - inicioToque.current)) }}
      onTouchEnd={() => { if (inicioToque.current !== null && arrasto > 70) aoFechar(); inicioToque.current = null; definirArrasto(0) }}>
      {pop.preso && <span className="sl-pop__alca" aria-hidden="true" />}
      {pop.preso && <button type="button" className="sl-pop__fechar" onClick={aoFechar} aria-label="Fechar"><Icone nome="fechar" tamanho={22} /></button>}
      <p className="sl-pop__livro"><b>{apelidoLivro(c.livro)}</b> · {c.capitulo.split('·')[0].trim()}<span className={`sl-raridade sl-raridade--${r}`}><span className={`sl-gema sl-gema--${r}`} /> {NOME_RARIDADE[r]}</span></p>
      <strong className="sl-pop__titulo">{c.titulo}</strong>
      <dl className="sl-pop__dados">
        <div><dt>Leitura</dt><dd>{c.minutos} min</dd></div>
        <div><dt>Questões de prova</dt><dd>{c.questoes.length}</dd></div>
        <div><dt>Simulados</dt><dd>{c.treino.length}</dd></div>
      </dl>
      {provas.length > 0 && <p className="sl-pop__provas"><span>Já caiu em</span> {provas.slice(0, 3).join(' · ')}{provas.length > 3 ? ` e mais ${provas.length - 3}` : ''}</p>}
      <ol className="sl-pop__partes">{c.secoes.slice(0, 3).map((s) => <li key={s.id}>{s.titulo}</li>)}{c.secoes.length > 3 && <li className="sl-pop__mais">e mais {c.secoes.length - 3} partes</li>}</ol>
      <div className="sl-pop__xp"><span style={{ width: `${pct}%` }} /><b>{estado === 'concluido' ? 'Lido até o fim' : estado === 'andamento' ? `${pct}% lido` : 'Ainda não aberto'}{fechado ? ' · assinantes' : ''}</b></div>
      {pop.preso
        ? <div className="sl-pop__acoes"><button type="button" className="rs-botao-ouro" onClick={aoAbrir}><Icone nome="livro" tamanho={16} /> Abrir a ficha</button><button type="button" className="botao" onClick={aoFechar}>Fechar</button></div>
        : <p className="sl-pop__dica">Clique para abrir a ficha</p>}
    </div>
  </>)
}

/** A ficha do livro, como um item de inventário: raridade, atributos e o botão de leitura. */
function FichaItem({ c, selo, leitura, fechado, indice, aoFechar }: { c: ResumoCapitulo; selo?: string; leitura?: Leitura; fechado: boolean; indice: Indice | null; aoFechar: () => void }) {
  const [abrindo, definirAbrindo] = useState(false)
  const relogio = useRef<number | undefined>(undefined)
  // Fechar a ficha (Esc, X ou "Devolver") durante a animação cancela a ida para o leitor.
  useEffect(() => () => window.clearTimeout(relogio.current), [])
  const estado = estadoLeitura(leitura)
  const r = raridade(c.questoes.length)
  const provas = provasDoCapitulo(indice, c.questoes)
  const caps = capitulosDoResumo(c)
  const pct = estado === 'concluido' ? 100 : leitura?.progresso ?? 0
  const destino = `/resumos/${c.id}`
  const ler = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cliqueComum(e) || semMovimento()) return
    e.preventDefault()
    if (abrindo) return
    tocar('pagina')
    definirAbrindo(true)
    relogio.current = window.setTimeout(() => navegar(destino), ABRIR_MS)
  }
  return (
    <JanelaCentral aberta aoFechar={aoFechar} rotulo={`Ficha: ${c.titulo}`} className="sl-janela-ficha">
      <div className={`sl-ficha sl-ficha--${r}${abrindo ? ' sl-ficha--abrindo' : ''}`} style={{ '--cor': corDaArea(c.especialidade) } as CSSProperties}>
        {selo && <p className="sl-ficha__selo">{selo}</p>}
        <div className="sl-ficha__livro" aria-hidden="true">
          <span className="sl-ficha__miolo"><i /><i /><i /></span>
          <span className="sl-ficha__capa"><small>{apelidoLivro(c.livro)}</small><b>{c.titulo}</b><small>Cap. {caps.length > 1 ? `${caps[0]}–${caps[caps.length - 1]}` : numeroCapitulo(c)}</small></span>
        </div>
        <div className="sl-ficha__dados">
          <span className={`sl-raridade sl-raridade--${r}`}><span className={`sl-gema sl-gema--${r}`} /> {NOME_RARIDADE[r]}</span>
          <h2>{c.titulo}</h2>
          <p className="sl-ficha__ref">{rotuloLivro(c)} · {c.capitulo.split('·')[0].trim()}</p>
          <dl className="sl-ficha__atributos">
            <div><dt>Leitura</dt><dd className="numerico">{c.minutos} min</dd></div>
            <div><dt>Questões de prova</dt><dd className="numerico">{c.questoes.length}</dd></div>
            <div><dt>Simulados</dt><dd className="numerico">{c.treino.length}</dd></div>
            <div><dt>Partes</dt><dd className="numerico">{c.secoes.length}</dd></div>
          </dl>
          {provas.length > 0 && <p className="sl-ficha__provas">{provas.slice(0, 4).map((x) => <span key={x}>{x}</span>)}{provas.length > 4 && <span>+{provas.length - 4}</span>}</p>}
          <p className="sl-ficha__resumo">{c.resumo.length > 240 ? `${c.resumo.slice(0, 240).replace(/\s+\S*$/, '')}…` : c.resumo}</p>
          <div className="sl-ficha__xp" aria-label={`${pct}% lido`}><span style={{ width: `${pct}%` }} /><b>{estado === 'concluido' ? 'Lido até o fim' : estado === 'andamento' ? `${pct}% lido` : 'Ainda não aberto'}</b></div>
          <div className="sl-ficha__acoes">
            <a className="rs-botao-ouro" href={href(destino)} onClick={ler}>{fechado ? <Icone nome="cadeado" tamanho={17} /> : <Icone nome="livro" tamanho={17} />} {estado === 'andamento' ? 'Continuar a leitura' : estado === 'concluido' ? 'Reler' : 'Ler o resumo'}</a>
            <button type="button" className="botao" onClick={aoFechar}>Devolver à estante</button>
          </div>
        </div>
      </div>
    </JanelaCentral>
  )
}

/** Mesa de leitura: o livro aberto de quem está lendo; sem leitura, a sugestão da bibliotecária. */
function MesaLeitura({ continuar, capitulos }: { continuar: Array<{ c: ResumoCapitulo; l?: Leitura }>; capitulos: ResumoCapitulo[] }) {
  const sugestao = useMemo(() => ordemDoDia(capitulos.filter((c) => raridade(c.questoes.length) === 'lendario'), hojeBR())[0] ?? capitulos[0], [capitulos])
  const atual = continuar[0]
  const c = atual?.c ?? sugestao
  return (
    <section className="sl-mesa" aria-label={atual ? 'Continuar estudando' : 'Sugestão da bibliotecária'} data-guia="continuar">
      <div className="sl-mesa__tampo" aria-hidden="true">
        <span className="sl-mesa__livro" style={{ '--cor': corDaArea(c.especialidade) } as CSSProperties}><i /><i /></span>
        <Sprite grade={LAMPARINA} paleta={PALETA_LAMPARINA} px={3} className="sl-mesa__luz" />
      </div>
      <div className="sl-mesa__texto">
        <p className="sl-rotulo">{atual ? 'Na mesa de leitura' : 'Sugestão da bibliotecária'}</p>
        <a href={href(`/resumos/${c.id}`)}><strong>{c.titulo}</strong></a>
        <small>{rotuloLivro(c)} · Cap. {numeroCapitulo(c)}{atual?.l ? ` · ${atual.l.progresso}% lido` : ` · lendário: ${c.questoes.length} questões de prova`}</small>
        {atual?.l && <span className="sl-mesa__barra"><span style={{ width: `${atual.l.progresso}%` }} /></span>}
        {continuar.length > 1 && <ul className="sl-mesa__outros">{continuar.slice(1).map(({ c: o, l }) => <li key={o.id}><a href={href(`/resumos/${o.id}`)}>{o.titulo}</a> <small className="numerico">{l?.progresso ?? 0}%</small></li>)}</ul>}
      </div>
    </section>
  )
}

/** Quadro-negro: uma frase que cai por dia (do adendo Frases que caem); um toque apaga e escreve outra. */
function QuadroNegro({ premium }: { premium: boolean }) {
  const [frases, definir] = useState<Frase[] | null>(null)
  const [i, definirI] = useState(0)
  const [apagando, definirApagando] = useState(false)
  useEffect(() => {
    let vivo = true
    const t = window.setTimeout(() => {
      fetch(recurso('acervo/resumao.json')).then((r) => (r.ok ? r.json() : null)).then((d: { areas: Array<{ focos: Array<{ frases: Frase[] }> }> } | null) => {
        if (!vivo || !d) return
        // Sem assinatura, só a amostra aberta da página das frases (FRASES_AREAS_AMOSTRA, a mesma da página).
        const todas = (premium ? d.areas : d.areas.slice(0, FRASES_AREAS_AMOSTRA)).flatMap((a) => a.focos.flatMap((f) => f.frases))
        definir(ordemDoDia(todas.map((f) => ({ ...f, id: f.id })), hojeBR()))
      }).catch(() => undefined)
    }, 400)
    return () => { vivo = false; window.clearTimeout(t) }
  }, [premium])
  const f = frases?.[i % (frases.length || 1)]
  const outra = () => {
    if (!frases) return
    tocar('pagina')
    if (semMovimento()) { definirI((x) => x + 1); return }
    definirApagando(true)
    window.setTimeout(() => { definirI((x) => x + 1); definirApagando(false) }, 380)
  }
  return (
    <section className="sl-quadro" aria-label="Frase que cai">
      <p className="sl-quadro__titulo">Cai na prova</p>
      <p className={'sl-quadro__giz' + (apagando ? ' sl-quadro__giz--apagando' : '')}>{f ? giz(f.texto) : 'Escrevendo a frase do dia…'}</p>
      <div className="sl-quadro__pe">
        {f?.origem && <small>{f.origem}</small>}
        <button type="button" onClick={outra} disabled={!frases}>Apagar e escrever outra</button>
        <a href={href('/resumos/frases')}>Todas as frases</a>
      </div>
      <span className="sl-quadro__apagador" aria-hidden="true" />
    </section>
  )
}
/** **negrito** do texto das frases vira <b>. */
function giz(texto: string): ReactNode {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) => (i % 2 ? <b key={i}>{parte}</b> : parte))
}

/** Sala dos raros (atrás da estante): curiosidades históricas dos resumos e a caderneta de segredos. */
function SalaRaros({ achados, aoVoltar }: { achados: IdSegredo[]; aoVoltar: () => void }) {
  return (
    <section className="sl-raros" aria-labelledby="sl-raros-titulo">
      <header>
        <p className="sl-rotulo">Atrás da estante</p>
        <h2 id="sl-raros-titulo">Sala dos raros</h2>
        <p>Curiosidades que os resumos guardam: quem descreveu primeiro, de onde veio o nome e o que os próprios autores contaram depois. Cada cartão leva ao trecho.</p>
      </header>
      <ul className="sl-raros__lista">
        {RAROS.map((r) => <li key={r.titulo}><a href={href(`/resumos/${r.capitulo}?bloco=h-${r.secao}`)}>
          <span className="sl-raros__ano numerico">{r.ano}</span>
          <strong>{r.titulo}</strong>
          <span>{r.texto}</span>
        </a></li>)}
      </ul>
      <Caderneta achados={achados} />
      <button type="button" className="rs-botao-ouro sl-raros__voltar" onClick={aoVoltar}><Icone nome="esquerda" tamanho={16} /> Voltar pela passagem</button>
    </section>
  )
}

function Caderneta({ achados }: { achados: IdSegredo[] }) {
  return (
    <div className="sl-caderneta">
      <p className="sl-rotulo">Caderneta de segredos · <span className="numerico">{achados.length} de {SEGREDOS.length}</span></p>
      <div className="sl-caderneta__barra"><span style={{ width: `${(achados.length / SEGREDOS.length) * 100}%` }} /></div>
      <ul>{SEGREDOS.map((s) => {
        const achado = achados.includes(s.id)
        return <li key={s.id} className={achado ? 'sl-caderneta--achado' : ''}>
          <span className="sl-caderneta__selo" aria-hidden="true">{achado ? '★' : '?'}</span>
          <span><strong>{achado ? s.nome : '???'}</strong><small>{s.pista}</small></span>
        </li>
      })}</ul>
    </div>
  )
}

/** Comemoração de segredo: lombadas caindo do teto. */
function ChuvaDeLivros() {
  const [viva, definir] = useState(true)
  useEffect(() => { const t = window.setTimeout(() => definir(false), 2200); return () => window.clearTimeout(t) }, [])
  if (!viva || semMovimento()) return null
  const cores = ['#c0392b', '#2f7a4a', '#2b6cb0', '#d69e2e', '#8e44ad', '#e3b860']
  return (
    <span className="sl-chuva" aria-hidden="true">{Array.from({ length: 22 }, (_, i) => (
      <i key={i} style={{ left: `${(i * 37) % 100}%`, background: cores[i % cores.length], animationDelay: `${(i % 7) * 0.09}s`, height: `${18 + (i * 7) % 16}px` } as CSSProperties} />
    ))}</span>
  )
}
