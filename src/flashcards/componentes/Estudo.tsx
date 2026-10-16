import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { registrarEstudo } from '../aprendizagem'
import { gravar, ler } from '../../estado/armazenamento'
import { revisarHoje } from '../../estado/revisao'
import { indiceDoAcervo, todasAsCartas } from '../dados/acervo'
import { tocar } from '../efeitos/sons'
import { CHAVE_REGISTROS, type RegistroFlashcard } from '../progresso'
import type { Flashcard } from '../tipos'
import { autorizarFlashcard, FLASHCARDS_NO_SERVIDOR, novaChave, sincronizarProgresso, type LimiteFlashcard } from '../servidor'
import { contarSessaoTerminada } from '../opiniao'
import { href } from '../../util/rotas'
import { Cartao, familiasDe } from './Cartao'
import { Sprite } from './Sprite'
import { HUMOR, NomeEmChamas, SERIE_VAZIA, avancarSerie, humorDe, somDoHumor, type Humor } from './ClimaEstudo'
import { ContextoConta } from '../../conta/ContextoConta'
import { recurso } from '../../config'

import { diarioBiblioteca, type PassoBiblioteca } from '../biblioteca/sessao'
import { DiarioBiblioteca, EstanteDaSessao } from './DiarioBiblioteca'
import { CHAVE_PLANO, calcularCronograma, migrarPlano, rotuloTempo, sessaoDoCronograma, type Cronograma } from '../cronograma'
import { ehAcerto, horaDaSessao, HORAS_BIBLIOTECA } from '../biblioteca/horas'
import { FundoBiblioteca } from './FundoBiblioteca'
import '../../estilos/paginas/BibliotecaEstudo.css'

type Avaliacao = 'errei' | 'hesitei' | 'sabia'

interface Categoria {
  id: string
  nome: string
  icone: string
  cor: string
  descricao?: string
  filtro: (c: Flashcard, r: RegistroFlashcard | undefined) => boolean
  /** Ordem: pendentes e errados primeiro, depois os nunca vistos. */
}

const ICONE_AREA: Record<string, [string, string]> = {
  trauma: ['tala', '#e07a5a'], mao: ['mao', '#e8b87a'], 'ombro-cotovelo': ['escudo', '#6aa8f0'], joelho: ['halter', '#8fc0e8'],
  quadril: ['amuleto', '#f2c45a'], 'pe-tornozelo': ['bigorna', '#b8b0a0'], pediatria: ['estrela', '#ffd27a'], tumores: ['lupa', '#8fe0a0'],
  coluna: ['insignia', '#d8a0ff'], 'conceitos-basicos': ['livro', '#d8b878'], osteometabolicas: ['frasco', '#7fe0c8'],
}

/** Domínio: acertou da última vez e a revisão ainda não venceu. */
const dominado = (r?: RegistroFlashcard) => !!r && r.c === true && !revisarHoje(r)
const pendente = (r?: RegistroFlashcard) => !!r && revisarHoje(r)

const TAMANHOS = [10, 20, 30] as const
const CHAVE_ALTERNATIVAS = 'flashcards:estudo-alternativas'
const TIPOS = ['Na prova', 'Relâmpago', 'Imagem', 'Anatomia'] as const

/**
 * Modo Estudo: a Biblioteca escolhe o que revisar (por área, revisões
 * pendentes, erros, temas que mais caem, imagens, anatomia), e a sessão vira
 * o flashcard e pergunta como foi. A fila de revisão dos flashcards é
 * independente da fila das questões.
 */
export function Estudo({ primeiro, aoAmpliar, reduzido, aoHumor, aoTranquilo }: { primeiro: string[]; aoAmpliar: (i: { src: string; legenda: string }) => void; reduzido: boolean; aoHumor?: (h: Humor | null) => void; aoTranquilo?: (v: boolean) => void }) {
  const cartas = todasAsCartas()
  const [registros, definirRegistros] = useState(() => ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {}))
  const [sessao, definirSessaoBruta] = useState<{ titulo: string; ids: string[]; chave: number; cronograma?: boolean } | null>(null)
  const definirSessao = useCallback((s: { titulo: string; ids: string[]; cronograma?: boolean } | null) => definirSessaoBruta(s && { ...s, chave: Date.now() + Math.random() }), [])
  // Cronograma dos flashcards (15/10/2026): a sessão de hoje é exatamente a mesma da central e da página do cronograma.
  const crono = useMemo<Cronograma | null>(() => (cartas.length < 50 ? null : calcularCronograma(migrarPlano(ler<unknown>(CHAVE_PLANO, null)), cartas, registros)), [cartas, registros])
  const seguirCronograma = useCallback((extra = 0) => {
    if (cartas.length < 50) return
    // sempre dos registros mais novos: no fim de uma sessão, "adiantar" já sabe o que foi feito
    const agora = calcularCronograma(migrarPlano(ler<unknown>(CHAVE_PLANO, null)), cartas, ler(CHAVE_REGISTROS, {}))
    const ids = sessaoDoCronograma(agora, extra || (agora.sessaoHoje.length ? 0 : agora.plano.ritmo))
    if (ids.length) { tocar('abrir'); definirSessao({ titulo: agora.sessaoHoje.length && !extra ? 'Cronograma: sessão de hoje' : 'Cronograma: adiantando', ids, cronograma: true }) }
  }, [cartas, definirSessao])
  const [tamanho, definirTamanho] = useState<number | 'pendentes'>(20)
  const [tipos, definirTipos] = useState<string[]>([])
  const [dificuldade, definirDificuldade] = useState<number | null>(null)
  const [soNovos, definirSoNovos] = useState(false)
  const [filtrosAbertos, definirFiltrosAbertos] = useState(() => typeof matchMedia === 'undefined' || !matchMedia('(max-width: 640px)').matches)
  const filtrosAtivos = tipos.length + Number(dificuldade !== null) + Number(soNovos)

  const categorias = useMemo<Categoria[]>(() => {
    const indice = indiceDoAcervo()
    const areas = indice ? Object.entries(indice.areas).map(([id, a]) => ({ id, nome: a.nome })) : [...new Map(cartas.map((c) => [c.areaId ?? c.area, c.area])).entries()].map(([id, nome]) => ({ id, nome }))
    return [
      { id: 'pendentes', nome: 'Revisões pendentes', icone: 'vela', cor: '#ffb070', descricao: 'Venceram hoje', filtro: (_c, r) => pendente(r) },
      { id: 'errados', nome: 'Flashcards errados', icone: 'chama', cor: '#ff7a5c', descricao: 'Errou da última vez', filtro: (_c, r) => r?.c === false },
      { id: 'hesitei', nome: 'Hesitei', icone: 'olho', cor: '#ffd98a', descricao: 'Acertou com dúvida da última vez', filtro: (_c, r) => r?.c === true && r.confianca === 'duvida' },
      { id: 'novos', nome: 'Nunca estudados', icone: 'estrela', cor: '#9fe0ff', descricao: 'Ainda não vistos', filtro: (_c, r) => !r },
      { id: 'caem', nome: 'Temas que mais caem', icone: 'coroa', cor: '#ffcf5a', descricao: 'Lendários: maior incidência', filtro: (c) => c.raridade === 'lendaria' },
      { id: 'imagem', nome: 'Com imagem', icone: 'olho', cor: '#c9b6ff', descricao: 'Radiografias e figuras', filtro: (c) => !!c.imagem },
      { id: 'anatomia', nome: 'Anatomia', icone: 'pergaminho', cor: '#e8d28a', descricao: 'Figuras com seta', filtro: (c) => c.tipo === 'Anatomia' },
      { id: 'todos', nome: 'Todos os flashcards', icone: 'brasao', cor: '#e9b955', filtro: () => true },
      ...areas.map((a) => ({ id: 'area:' + a.id, nome: a.nome, icone: ICONE_AREA[a.id]?.[0] ?? 'livro', cor: ICONE_AREA[a.id]?.[1] ?? '#d8b878', filtro: (c: Flashcard) => (c.areaId ?? c.area) === a.id })),
    ]
  }, [cartas])

  const filtrosExtras = useCallback((c: Flashcard) => (!tipos.length || tipos.includes(c.tipo)) && (dificuldade === null || c.dificuldade === dificuldade) && (!soNovos || !registros[c.id]), [tipos, dificuldade, soNovos, registros])

  const resumo = useMemo(() => categorias.map((cat) => {
    let total = 0, estudados = 0, dom = 0, pend = 0
    for (const c of cartas) {
      const r = registros[c.id]
      if (!cat.filtro(c, r) || !filtrosExtras(c)) continue
      total++
      if (r) estudados++
      if (dominado(r)) dom++
      if (pendente(r)) pend++
    }
    return { cat, total, estudados, dominio: estudados ? Math.round((100 * dom) / total) : 0, pendentes: pend }
  }), [categorias, cartas, registros, filtrosExtras])

  /** Monta a fila: pendentes e errados, depois nunca vistos, depois o resto; sem repetir. */
  const montar = useCallback((cat: Categoria, limite?: number) => {
    const lista = cartas.filter((c) => cat.filtro(c, registros[c.id]) && filtrosExtras(c))
    const peso = (c: Flashcard) => { const r = registros[c.id]; return r?.c === false ? 0 : pendente(r) ? 1 : !r ? 2 : 3 }
    // embaralha dentro de cada grupo para variar entre sessões
    const ordenada = lista.map((c) => ({ c, k: peso(c) + Math.random() * 0.9 })).sort((a, b) => a.k - b.k).map((x) => x.c)
    const n = limite ?? (tamanho === 'pendentes' ? ordenada.filter((c) => peso(c) <= 1).length || Math.min(10, ordenada.length) : tamanho)
    return ordenada.slice(0, n).map((c) => c.id)
  }, [cartas, registros, filtrosExtras, tamanho])

  // Link direto (central, revisões de hoje, cronograma): #/flashcards/biblioteca?categoria=pendentes&area=mao&n=20
  // abre a sessão na hora. "area" pode repetir; com categoria=plano usa as áreas e a meta do cronograma.
  const [linkUsado, definirLinkUsado] = useState(false)
  useEffect(() => {
    if (linkUsado || cartas.length < 50) return
    const q = new URLSearchParams(window.location.hash.split('?')[1] ?? '')
    const id = q.get('categoria')
    if (!id) return
    definirLinkUsado(true)
    const areas = q.getAll('area')
    const n = Math.max(1, Math.min(200, Number(q.get('n')) || 20))
    const base = categorias.find((c) => c.id === (id === 'plano' ? 'pendentes' : id))
    if (!base) return
    if (id === 'plano') {
      // a sessão de hoje do cronograma (revisões primeiro, depois os novos da fila); &extra=N adianta
      seguirCronograma(Math.max(0, Math.min(200, Number(q.get('extra')) || 0)))
      return
    }
    const assunto = q.get('assunto')
    const naArea = (c: Flashcard) => (!areas.length || areas.includes(c.areaId ?? c.area ?? '')) && (!assunto || c.assunto === assunto)
    const ids = montar({ ...base, filtro: (c, r) => base.filtro(c, r) && naArea(c) }, n)
    if (ids.length) definirSessao({ titulo: assunto ?? base.nome, ids })
  }, [linkUsado, cartas, categorias, montar, seguirCronograma, definirSessao])

  // Vindo da Batalha: os flashcards que derrubaram você abrem uma sessão na hora.
  useEffect(() => {
    if (primeiro.length) definirSessao({ titulo: 'Os que te derrubaram na Batalha', ids: [...new Set(primeiro)].filter((id) => todasAsCartas().some((c) => c.id === id)) })
  }, [primeiro, definirSessao])

  if (sessao && sessao.ids.length) {
    return <Sessao key={sessao.chave} titulo={sessao.titulo} ids={sessao.ids} aoAmpliar={aoAmpliar} reduzido={reduzido} aoHumor={aoHumor} aoTranquilo={aoTranquilo}
      cronograma={sessao.cronograma} aoAdiantar={(n) => { definirRegistros(ler(CHAVE_REGISTROS, {})); seguirCronograma(n) }}
      aoTerminar={() => { definirRegistros(ler(CHAVE_REGISTROS, {})); definirSessao(null) }} />
  }

  return (
    <div className="fc-biblioteca">
      <header className="fc-biblioteca__cabeca">
        <div>
          <h2>Biblioteca de flashcards</h2>
          <p><OrigemDoAcervo cartas={cartas} /> Escolha o que revisar.</p>
        </div>
        <button type="button" className="fc-botao-pequeno fc-biblioteca__mostrar" aria-expanded={filtrosAbertos} onClick={() => definirFiltrosAbertos((v) => !v)}>
          Filtros · {tamanho === 'pendentes' ? 'pendentes' : `${tamanho} por sessão`}{filtrosAtivos ? ` · ${filtrosAtivos} ativo${filtrosAtivos > 1 ? 's' : ''}` : ''}
        </button>
        <div className="fc-biblioteca__filtros" role="group" aria-label="Filtros" hidden={!filtrosAbertos}>
          <div className="fc-pilulas" role="group" aria-label="Tamanho da sessão">
            {TAMANHOS.map((t) => <button key={t} type="button" aria-pressed={tamanho === t} onClick={() => definirTamanho(t)}>{t}</button>)}
            <button type="button" aria-pressed={tamanho === 'pendentes'} onClick={() => definirTamanho('pendentes')}>Pendentes</button>
          </div>
          <div className="fc-pilulas" role="group" aria-label="Tipo de flashcard">
            {TIPOS.map((t) => <button key={t} type="button" aria-pressed={tipos.includes(t)} onClick={() => definirTipos((v) => v.includes(t) ? v.filter((x) => x !== t) : [...v, t])}>{t}</button>)}
          </div>
          <div className="fc-pilulas" role="group" aria-label="Dificuldade">
            {[1, 2, 3].map((d) => <button key={d} type="button" aria-pressed={dificuldade === d} onClick={() => definirDificuldade((v) => v === d ? null : d)}>{['Fácil', 'Moderada', 'Difícil'][d - 1]}</button>)}
            <button type="button" aria-pressed={soNovos} onClick={() => definirSoNovos((v) => !v)}>Só novos</button>
          </div>
        </div>
      </header>
      {crono && <CartaoCronogramaEstudo c={crono} sugerido={!ler<unknown>(CHAVE_PLANO, null)} aoSeguir={seguirCronograma} />}
      <div className="fc-categorias">
        {resumo.map(({ cat, total, estudados, dominio, pendentes }) => (
          <button key={cat.id} type="button" className="fc-categoria" style={{ ['--cor' as string]: cat.cor }} disabled={!total}
            onClick={() => { const ids = montar(cat); if (ids.length) { tocar('abrir'); definirSessao({ titulo: cat.nome, ids }) } }}
            onPointerEnter={() => tocar('hover')}>
            <span className="fc-categoria__icone"><Sprite nome={cat.icone} /></span>
            <span className="fc-categoria__texto">
              <strong>{cat.nome}</strong>
              <small>{total.toLocaleString('pt-BR')} flashcards{cat.descricao ? ` · ${cat.descricao}` : ''}</small>
            </span>
            <span className="fc-categoria__numeros">
              <span className="fc-categoria__barra" aria-hidden="true"><i style={{ width: dominio + '%' }} /></span>
              <small>{estudados ? `${dominio}% dominado · ${estudados} estudados` : 'Nunca estudado'}</small>
              {pendentes > 0 && <em>{pendentes} para hoje</em>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Quantos flashcards há e de onde vêm (15/10/2026): o número sai do acervo carregado, e os que vêm
 * de OrtoQuestões Simulados (`colecao: 'simulados'`) não são "das provas reais".
 */
function OrigemDoAcervo({ cartas }: { cartas: Flashcard[] }) {
  const simulados = useMemo(() => cartas.filter((c) => c.colecao === 'simulados').length, [cartas])
  const n = (x: number) => x.toLocaleString('pt-BR')
  if (!simulados) return <>{n(cartas.length)} flashcards das questões comentadas das provas reais.</>
  return <>{n(cartas.length)} flashcards das questões comentadas: {n(cartas.length - simulados)} das provas reais e {n(simulados)} dos OrtoQuestões Simulados.</>
}

/** "Seguir cronograma" no alto da Biblioteca: a sessão de hoje em um toque. */
function CartaoCronogramaEstudo({ c, sugerido, aoSeguir }: { c: Cronograma; sugerido: boolean; aoSeguir: (extra?: number) => void }) {
  const hoje = c.semana[0].assuntos
  const revisoes = c.sessaoHoje.length - c.novosHoje.length
  const proximos = c.assuntos.find((a) => a.novos.length)
  const total = c.sessaoHoje.length
  const partes = [revisoes ? `${revisoes} ${revisoes === 1 ? 'revisão' : 'revisões'}` : '', c.novosHoje.length ? `${c.novosHoje.length} ${c.novosHoje.length === 1 ? 'novo' : 'novos'}` : ''].filter(Boolean)
  if (c.concluido) return null
  return (
    <section className="fc-crono-estudo" aria-labelledby="fc-crono-estudo">
      <span className="fc-crono-estudo__icone" aria-hidden="true"><Sprite nome="pergaminho" /></span>
      <div className="fc-crono-estudo__texto">
        <h3 id="fc-crono-estudo">{total ? 'Seguir cronograma' : c.ehDiaDeEstudo ? 'Meta de hoje feita' : 'Hoje é folga no cronograma'}</h3>
        <p>
          {total ? <>Hoje: <strong>{hoje.map((f) => f.assunto).join(' · ') || 'revisões'}</strong> · {partes.join(' + ')} · {rotuloTempo(total)}</>
            : <>Quer adiantar? Os próximos são de <strong>{proximos?.assunto ?? 'todos os assuntos'}</strong>. Tudo o que passar da meta adianta o plano.</>}
        </p>
        {/* sem plano salvo vale o plano sugerido (o mesmo da central e de Meu cronograma): dizer isso, com o atalho para ajustar */}
        {sugerido && <p className="fc-crono-estudo__sugerido">Plano sugerido: todos os assuntos, na ordem dos que mais caem, {c.plano.ritmo} novos por dia.</p>}
        <a className="fc-crono-estudo__ver" href={href('/flashcards/cronograma')}>{sugerido ? 'Ajustar o plano' : 'Ver o cronograma'}</a>
      </div>
      {(total > 0 || c.novosRestantes > 0) && (
        <button type="button" className="fc-principal fc-crono-estudo__botao pronto" onClick={() => aoSeguir(total ? 0 : c.plano.ritmo)}>
          <span className="fc-principal__texto"><span>{total ? `Começar · ${total}` : `Adiantar ${Math.min(c.plano.ritmo, c.novosRestantes)}`}</span><small>{total ? 'a sessão de hoje' : 'do próximo dia'}</small></span>
        </button>
      )}
    </section>
  )
}

/** Sessão de estudo: vira o flashcard e diz como foi. */
function Sessao({ titulo, ids, aoAmpliar, reduzido, aoTerminar, aoHumor, aoTranquilo, cronograma, aoAdiantar }: { titulo: string; ids: string[]; aoAmpliar: (i: { src: string; legenda: string }) => void; reduzido: boolean; aoTerminar: () => void; aoHumor?: (h: Humor | null) => void; aoTranquilo?: (v: boolean) => void; cronograma?: boolean; aoAdiantar?: (n: number) => void }) {
  const porId = useMemo(() => new Map(todasAsCartas().map((c) => [c.id, c])), [])
  const fila = useMemo(() => ids.filter((id) => porId.has(id)), [ids, porId])
  const [pos, definirPos] = useState(0)
  const sessao = useMemo(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random()), [])
  const [virada, definirVirada] = useState(false)
  const [feitos, definirFeitos] = useState<Record<Avaliacao, number>>({ errei: 0, hesitei: 0, sabia: 0 })
  const acabou = pos >= fila.length
  // A hora da Biblioteca anda com os acertos: amanhecer -> dia -> tarde -> pôr do sol -> noite (biblioteca/horas.ts)
  const [acertos, definirAcertos] = useState(0)
  const hora = horaDaSessao(acertos, fila.length)
  // Humor da Biblioteca: a sequência de acertos, erros e hesitações muda o clima da sala
  const [serie, definirSerie] = useState(SERIE_VAZIA)
  const [melhor, definirMelhor] = useState(0)
  const [passos, definirPassos] = useState<PassoBiblioteca[]>([])
  const [tranquilo, definirTranquilo] = useState(false)
  const ultimoAvaliado = useRef(-1)
  const diario = useMemo(() => diarioBiblioteca(passos), [passos])
  useEffect(() => { aoTranquilo?.(tranquilo && !acabou); return () => aoTranquilo?.(false) }, [tranquilo, acabou, aoTranquilo])
  const humor = useMemo(() => humorDe(serie), [serie])
  const humorAntes = useRef(humor)
  useEffect(() => { if (!tranquilo) somDoHumor(humorAntes.current, humor); humorAntes.current = humor; aoHumor?.(acabou ? null : humor) }, [humor, acabou, aoHumor, tranquilo])
  useEffect(() => () => aoHumor?.(null), [aoHumor])
  const conta = useContext(ContextoConta)
  const meta = conta?.sessao?.user.user_metadata
  const nome = String(meta?.nome ?? '').trim().split(/\s+/)[0] || 'Você'
  const nomeMostrado = nome !== 'Você' && meta?.situacao === 'ortopedista' ? `Dr. ${nome}` : nome
  const carta = porId.get(fila[Math.min(pos, fila.length - 1)])!
  // pré-carrega a imagem dos dois próximos flashcards: a figura chega pronta, sem pulo
  useEffect(() => {
    for (const id of fila.slice(pos + 1, pos + 3)) {
      const img = porId.get(id)?.imagem
      if (img) { const i = new Image(); i.decoding = 'async'; i.src = recurso('imagens/' + img.arquivo) }
    }
  }, [pos, fila, porId])

  // Alternativas no Estudo (13/10/2026): responder antes de virar, com correção na hora.
  // Opcional (lembrado no aparelho); só aparece quando o flashcard tem alternativas boas.
  const [comAlternativas, definirComAlternativas] = useState(() => ler<boolean>(CHAVE_ALTERNATIVAS, true))
  const [escolha, definirEscolha] = useState<number | null>(null)
  const ordem = useMemo(() => {
    const idx = carta.opcoes.map((_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
    return idx
  }, [carta])
  const mostrarAlternativas = comAlternativas && carta.batalha !== false && carta.opcoes.length >= 2
  const errouNaAlternativa = escolha !== null && ordem[escolha] !== carta.certa

  const [bloqueio, definirBloqueio] = useState<LimiteFlashcard | null>(null)
  // Ver o verso conta como um flashcard estudado: no plano grátis, o servidor decide (trava desligada por padrão).
  // Trava em voo e chave fixa por flashcard: um toque duplo em "Virar" gastava
  // dois flashcards grátis (duas chamadas, cada uma com chave nova).
  const virando = useRef(false)
  const chavesVirar = useRef(new Map<string, string>())
  // Quem o servidor já disse que não tem limite vira na hora: a contagem segue igual (mesma chave), em segundo plano.
  const semLimite = useRef(false)
  const [validando, definirValidando] = useState(false)
  const virar = useCallback(async () => {
    if (virada || acabou || virando.current) return
    if (FLASHCARDS_NO_SERVIDOR) {
      // Por posição na fila: o mesmo flashcard que volta mais adiante conta de novo.
      const vez = `${pos}:${carta.id}`
      const chave = chavesVirar.current.get(vez) ?? novaChave()
      chavesVirar.current.set(vez, chave)
      if (semLimite.current) {
        void autorizarFlashcard(carta.id, chave).then((r) => { if (!r.permitido && !r.falha) { semLimite.current = false; definirBloqueio(r) } else if (!r.ilimitado) semLimite.current = false })
      } else {
        virando.current = true
        const espera = window.setTimeout(() => definirValidando(true), 250)
        let r: LimiteFlashcard
        try { r = await autorizarFlashcard(carta.id, chave) } finally { virando.current = false; window.clearTimeout(espera); definirValidando(false) }
        if (!r.permitido) { definirBloqueio(r); return }
        semLimite.current = r.ilimitado
      }
    }
    definirVirada(true)
    definirSerie((v) => (v.parado ? { ...v, parado: false } : v))
    return true
  }, [virada, acabou, carta, pos])

  // parado muito tempo sem virar: a névoa da dúvida chega devagar
  useEffect(() => {
    if (virada || acabou) return
    const t = window.setTimeout(() => definirSerie((v) => ({ ...v, parado: true })), HUMOR.paradoSegundos * 1000)
    return () => window.clearTimeout(t)
  }, [pos, virada, acabou])

  const responder = useCallback(async (pos: number) => {
    if (virada || acabou || escolha !== null) return
    const ok = await virar()
    if (!ok) return
    definirEscolha(pos)
    tocar(ordem[pos] === carta.certa ? 'cura' : 'erro')
  }, [virada, acabou, escolha, virar, ordem, carta])

  const avaliar = useCallback((a: Avaliacao) => {
    if (!virada || acabou || ultimoAvaliado.current === pos) return
    ultimoAvaliado.current = pos
    // um evento por flashcard desta sessão: clique duplo ou tecla repetida não contam de novo
    const objetiva = escolha === null ? null : ordem[escolha] === carta.certa
    registrarEstudo({ chave: `${sessao}:${pos}:${carta.id}`, id: carta.id, modo: 'estudo', objetiva, avaliacao: a })
    if (ehAcerto(objetiva, a)) definirAcertos((n) => n + 1)
    tocar(a === 'sabia' ? 'cura' : a === 'hesitei' ? 'confirmar' : 'erro')
    definirFeitos((f) => ({ ...f, [a]: f[a] + 1 }))
    const novaSerie = avancarSerie(serie, a)
    definirSerie(novaSerie)
    definirMelhor(m => Math.max(m, novaSerie.acertos))
    definirPassos(v => [...v, { area: carta.area || 'Geral', avaliacao: a, clima: humorDe(novaSerie).tipo }])
    definirVirada(false)
    definirEscolha(null)
    definirPos((p) => p + 1)
  }, [carta, virada, acabou, sessao, pos, escolha, ordem, serie])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const alvo = e.target as HTMLElement
      if (alvo?.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('.fc-veu[aria-modal="true"]')?.getClientRects().length) return
      if (e.key === ' ' && alvo?.tagName !== 'BUTTON' && alvo?.tagName !== 'A') { e.preventDefault(); virar() }
      if (!virada && mostrarAlternativas && /^[1-4]$/.test(e.key) && +e.key <= ordem.length) { responder(+e.key - 1); return }
      // Enter aceita a avaliação sugerida pela alternativa (certa: Sabia; errada: Errei)
      if (virada && e.key === 'Enter' && escolha !== null && alvo?.tagName !== 'BUTTON' && alvo?.tagName !== 'A') { e.preventDefault(); avaliar(ordem[escolha] === carta.certa ? 'sabia' : 'errei'); return }
      if (virada && e.key === '1') avaliar('errei')
      if (virada && e.key === '2') avaliar('hesitei')
      if (virada && e.key === '3') avaliar('sabia')
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [avaliar, virada, virar, responder, mostrarAlternativas, ordem, escolha, carta])

  const total = feitos.errei + feitos.hesitei + feitos.sabia
  // fim de sessão: conta para o convite de opinião do beta e manda o progresso para a conta
  useEffect(() => { if (acabou && total) { contarSessaoTerminada(); void sincronizarProgresso() } }, [acabou, total])
  // foco no "Voltar" sem rolar o resumo (com autoFocus o título "Sessão concluída" ficava cortado no alto)
  const voltarRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (acabou) voltarRef.current?.focus({ preventScroll: true }) }, [acabou])
  if (acabou) {
    return (
      <>
      <FundoBiblioteca indice={hora.indice} reduzido={reduzido} />
      <div className="fc-estudo fc-estudo--fim">
        <div className="fc-janela fc-estudo__resumo">
          <h2>Sessão concluída</h2>
          <p className="fc-janela__sub">{titulo}: {total} flashcard{total === 1 ? '' : 's'} revisado{total === 1 ? '' : 's'}.</p>
          <dl className="fc-estudo__placar fc-estudo__placar--fim">
            <div className="sabia"><dt>Sabia</dt><dd>{feitos.sabia}</dd></div>
            <div className="hesitei"><dt>Hesitei</dt><dd>{feitos.hesitei}</dd></div>
            <div className="errei"><dt>Errei</dt><dd>{feitos.errei}</dd></div>
          </dl>
          {melhor >= 3 && <p className="fc-estudo__melhor">Melhor sequência: <b>{melhor}</b> {melhor >= HUMOR.gloria ? '· Glória da Biblioteca' : melhor >= HUMOR.chama[2] ? '· chama arcana' : melhor >= HUMOR.chama[1] ? '· fogo azul' : '· em chamas'}</p>}
          <p className="fc-estudo__hora-fim">A luz chegou a: <b>{hora.hora.nome}</b> · {acertos} {acertos === 1 ? 'acerto' : 'acertos'}</p>
          <DiarioBiblioteca diario={diario} />
          {cronograma && <FimCronograma aoAdiantar={aoAdiantar} />}
          <p className="fc-janela__nota">Os que você errou voltam hoje; os que hesitou, em 3 dias; os que sabia, em 10.</p>
          <div className="fc-janela__botoes">
            <a className="fc-botao fc-botao--secundario" href={href('/flashcards?opiniao=fim_sessao')}>Enviar opinião</a>
            <button ref={voltarRef} type="button" className="fc-botao" onClick={aoTerminar}>Voltar à biblioteca</button>
          </div>
        </div>
      </div>
      </>
    )
  }
  const atual = pos + 1
  return (
    <>
    <FundoBiblioteca indice={hora.indice} reduzido={reduzido} />
    <div className={`fc-estudo${validando ? ' fc-estudo--validando' : ''}`} aria-busy={validando || undefined}>
      <aside className="fc-estudo__painel" aria-label="Progresso do estudo">
        <button type="button" className="fc-botao-pequeno fc-estudo__voltar" onClick={aoTerminar}>← Biblioteca</button>
        <NomeEmChamas nome={nomeMostrado} humor={humor} />
        <p className="fc-estudo__titulo">{titulo}</p>
        {humor.tipo !== 'calmo' && (
          <div key={humor.tipo + humor.nivel} className={`fc-humor fc-humor--${humor.tipo}`} role="status">
            <strong>{humor.titulo}</strong>
            <small>{humor.sub}</small>
          </div>
        )}
        <div className="fc-estudo__contagem"><b>{atual}</b><small>de {fila.length}</small></div>
        <p className="fc-estudo__hora" key={hora.hora.id} title={hora.hora.frase}>
          <span className="fc-estudo__hora-pontos" aria-hidden="true">{HORAS_BIBLIOTECA.map((h, i) => <i key={h.id} data-ativa={i <= hora.indice || undefined} />)}</span>
          <span><b>{hora.hora.nome}</b><small>{hora.faltam ? `${hora.faltam} ${hora.faltam === 1 ? 'acerto' : 'acertos'} para a próxima luz` : hora.hora.frase}</small></span>
        </p>
        <div className="fc-estudo__barra" aria-hidden="true"><i style={{ width: (100 * atual) / fila.length + '%' }} /></div>
        <dl className="fc-estudo__placar">
          <div className="sabia"><dt>Sabia</dt><dd>{feitos.sabia}</dd></div>
          <div className="hesitei"><dt>Hesitei</dt><dd>{feitos.hesitei}</dd></div>
          <div className="errei"><dt>Errei</dt><dd>{feitos.errei}</dd></div>
        </dl>
        <div className="fc-velas" aria-label={`${feitos.sabia} velas acesas: uma por "Sabia" nesta sessão`} title="Uma vela acende a cada &quot;Sabia&quot; nesta sessão">
          {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < feitos.sabia % 10 || (feitos.sabia >= 10 && feitos.sabia % 10 === 0) ? 'acesa' : ''} style={{ backgroundImage: `url(${recurso('flashcards/vfx/vela.png')})`, animationDelay: `${-i * 110}ms` }} />)}
          {feitos.sabia >= 10 && <b>×{Math.floor(feitos.sabia / 10)}</b>}
        </div>
        <EstanteDaSessao livros={feitos.sabia} reduzido={reduzido} />
        <button type="button" className="fc-interruptor" role="switch" aria-checked={tranquilo} aria-label="Leitura tranquila" title="Leitura tranquila: chuva calma" onClick={() => definirTranquilo(v => !v)}>
          <span className="fc-interruptor__trilho" aria-hidden="true"><i /></span><span>Leitura tranquila</span>
        </button>
        <button type="button" className="fc-interruptor" role="switch" aria-checked={comAlternativas} aria-label="Alternativas" title="Mostrar alternativas"
          onClick={() => { const v = !comAlternativas; definirComAlternativas(v); gravar(CHAVE_ALTERNATIVAS, v); tocar('selecao') }}>
          <span className="fc-interruptor__trilho" aria-hidden="true"><i /></span>
          <span>Alternativas</span>
        </button>
      </aside>
      {humor.tipo !== 'calmo' && <div key={'aviso-' + humor.tipo + humor.nivel} className={`fc-humor-aviso fc-humor--${humor.tipo}`} aria-hidden="true"><strong>{humor.titulo}</strong><small>{humor.sub}</small></div>}
      {bloqueio && (
        <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-limite-estudo">
          <div className="fc-janela">
            <h2 id="fc-limite-estudo">{bloqueio.falha ? 'Não deu para validar' : 'Limite grátis de hoje'}</h2>
            <p className="fc-janela__sub">{bloqueio.falha ? 'Não foi possível falar com o servidor agora. Confira a conexão e tente de novo.' : 'Seu acesso grátis acabou por agora. Assinantes estudam sem limite.'}</p>
            <div className="fc-janela__botoes">
              <button type="button" className="fc-botao fc-botao--secundario" onClick={() => definirBloqueio(null)}>Fechar</button>
              {!bloqueio.falha && <a className="fc-botao" href={href('/assinatura')}>Ver os planos</a>}
            </div>
          </div>
        </div>
      )}
      <div className="fc-estudo__mesa">
        <Cartao
          chave={pos}
          carta={carta}
          virada={virada}
          dicaFrente="Toque no flashcard para virar · espaço"
          aoTocar={virar}
          aoAmpliar={aoAmpliar}
          aoGirar={() => tocar('giro')}
          reduzido={reduzido}
          familias={familiasDe(carta, ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {})[carta.id]?.c === false ? ['revisao'] : [])}
        />
      </div>
      {virada && escolha !== null && (
        <div className="fc-mao fc-mao--estudo fc-mao--respondida fc-estudo__respondidas" aria-label="Sua resposta">
          {ordem.map((opcao, pos) => (
            <div key={pos} className="fc-slot-mao">
              <button type="button" disabled className={`fc-alternativa${opcao === carta.certa ? ' fc-alternativa--certa' : pos === escolha ? ' fc-alternativa--errada' : ' fc-alternativa--apagada'}`}>
                <i aria-hidden="true">{pos + 1}</i><span>{carta.opcoes[opcao]}</span>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className={`fc-estudo__botoes${!virada && mostrarAlternativas ? ' fc-estudo__botoes--alternativas' : ''}`}>
        {virada ? (
          <>
            {escolha !== null && <p className={`fc-estudo__veredito fc-estudo__veredito--${errouNaAlternativa ? 'errou' : 'acertou'}`} role="status">{errouNaAlternativa ? 'Você errou na alternativa. Como foi de verdade?' : 'Acertou! Foi com segurança?'}<small className="fc-estudo__dica-tecla"> Enter aceita o sugerido</small></p>}
            <button type="button" className={`fc-botao-aval fc-botao-aval--errei${errouNaAlternativa ? ' fc-botao-aval--sugerido' : ''}`} onClick={() => avaliar('errei')}><i aria-hidden="true">1</i><strong>Errei</strong><small>volta hoje</small></button>
            <button type="button" className="fc-botao-aval fc-botao-aval--hesitei" onClick={() => avaliar('hesitei')}><i aria-hidden="true">2</i><strong>Hesitei</strong><small>volta em 3 dias</small></button>
            <button type="button" className={`fc-botao-aval fc-botao-aval--sabia${escolha !== null && !errouNaAlternativa ? ' fc-botao-aval--sugerido' : ''}`} onClick={() => avaliar('sabia')}><i aria-hidden="true">3</i><strong>Sabia</strong><small>volta em 10 dias</small></button>
          </>
        ) : mostrarAlternativas ? (
          <>
            <div className="fc-mao fc-mao--estudo" role="group" aria-label="Alternativas">
              {ordem.map((opcao, pos) => {
                const texto = carta.opcoes[opcao]
                return (
                  <div key={pos + '-' + carta.id} className="fc-slot-mao">
                    <button type="button" onClick={() => responder(pos)} onPointerEnter={() => tocar('hover')}
                      className={`fc-alternativa${texto.trim().length <= 4 ? ' fc-alternativa--curta' : ''}${texto.length > 56 ? ' fc-alternativa--muito-longa' : texto.length > 34 ? ' fc-alternativa--longa' : ''}${Math.max(...texto.split(/\s+/).map((x) => x.length)) > 12 ? ' fc-alternativa--palavra-longa' : ''}`}
                      aria-label={`Alternativa ${pos + 1}: ${texto}`}>
                      <i aria-hidden="true">{pos + 1}</i>
                      <span>{texto}</span>
                    </button>
                  </div>
                )
              })}
            </div>
            <button type="button" className="fc-botao-pequeno fc-estudo__so-virar" onClick={() => { tocar('confirmar'); virar() }}>Virar sem responder · espaço</button>
          </>
        ) : (
          <button type="button" className="fc-principal fc-principal--largo pronto" onClick={() => { tocar('confirmar'); virar() }}><span className="fc-principal__texto"><span>Virar o flashcard</span><small className="fc-estudo__tecla">espaço</small></span></button>
        )}
      </div>
    </div>
    </>
  )
}

/** Fim de uma sessão do cronograma: o que falta hoje, o que vem amanhã e a opção de adiantar. */
function FimCronograma({ aoAdiantar }: { aoAdiantar?: (n: number) => void }) {
  const c = useMemo(() => calcularCronograma(migrarPlano(ler<unknown>(CHAVE_PLANO, null)), todasAsCartas(), ler(CHAVE_REGISTROS, {})), [])
  const amanha = c.amanha
  return (
    <div className="fc-fim-crono">
      {c.sessaoHoje.length
        ? <p><b>Faltam {c.sessaoHoje.length} para a meta de hoje.</b> Pode seguir agora ou mais tarde: a fila espera.</p>
        : <p><b>{c.ehDiaDeEstudo ? 'Meta de hoje feita.' : 'Adiantou num dia de folga.'}</b> {c.novosFeitosHoje > c.metaNovos && c.metaNovos ? `Você adiantou ${c.novosFeitosHoje - c.metaNovos} do plano.` : 'O que passar disso adianta o plano.'}</p>}
      {amanha && <p className="fc-fim-crono__amanha">Amanhã: {amanha.novos ? `${amanha.assuntos.map((f) => f.assunto).join(' · ')} · ${amanha.novos} novos` : 'só as revisões que vencerem'}</p>}
      {aoAdiantar && (c.sessaoHoje.length > 0 || c.novosRestantes > 0) && (
        <button type="button" className="fc-botao fc-botao--secundario" onClick={() => aoAdiantar(c.sessaoHoje.length ? 0 : c.plano.ritmo)}>
          {c.sessaoHoje.length ? `Continuar a sessão de hoje (${c.sessaoHoje.length})` : `Adiantar mais ${Math.min(c.plano.ritmo, c.novosRestantes)}`}
        </button>
      )}
    </div>
  )
}
