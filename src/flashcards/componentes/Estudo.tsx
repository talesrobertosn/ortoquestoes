import { useCallback, useEffect, useMemo, useState } from 'react'
import { gravar, ler } from '../../estado/armazenamento'
import { proximoRegistro, revisarHoje } from '../../estado/revisao'
import { indiceDoAcervo, todasAsCartas } from '../dados/acervo'
import { tocar } from '../efeitos/sons'
import { CHAVE_HISTORICO, CHAVE_RECORDES, CHAVE_REGISTROS, lembrarVisto, RECORDES_VAZIOS, type Recordes, type RegistroFlashcard } from '../progresso'
import type { Flashcard } from '../tipos'
import { autorizarFlashcard, FLASHCARDS_NO_SERVIDOR, type LimiteFlashcard } from '../servidor'
import { href } from '../../util/rotas'
import { Cartao } from './Cartao'
import { Sprite } from './Sprite'

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
const TIPOS = ['Na prova', 'Relâmpago', 'Imagem', 'Anatomia'] as const

/**
 * Modo Estudo: a Biblioteca escolhe o que revisar (por área, revisões
 * pendentes, erros, temas que mais caem, imagens, anatomia), e a sessão vira
 * o flashcard e pergunta como foi. A fila de revisão dos flashcards é
 * independente da fila das questões.
 */
export function Estudo({ primeiro, aoAmpliar, reduzido }: { primeiro: string[]; aoAmpliar: (i: { src: string; legenda: string }) => void; reduzido: boolean }) {
  const cartas = todasAsCartas()
  const [registros, definirRegistros] = useState(() => ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {}))
  const [sessao, definirSessao] = useState<{ titulo: string; ids: string[] } | null>(null)
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
  const montar = useCallback((cat: Categoria) => {
    const lista = cartas.filter((c) => cat.filtro(c, registros[c.id]) && filtrosExtras(c))
    const peso = (c: Flashcard) => { const r = registros[c.id]; return r?.c === false ? 0 : pendente(r) ? 1 : !r ? 2 : 3 }
    // embaralha dentro de cada grupo para variar entre sessões
    const ordenada = lista.map((c) => ({ c, k: peso(c) + Math.random() * 0.9 })).sort((a, b) => a.k - b.k).map((x) => x.c)
    const n = tamanho === 'pendentes' ? ordenada.filter((c) => peso(c) <= 1).length || Math.min(10, ordenada.length) : tamanho
    return ordenada.slice(0, n).map((c) => c.id)
  }, [cartas, registros, filtrosExtras, tamanho])

  // Vindo da Batalha: os flashcards que derrubaram você abrem uma sessão na hora.
  useEffect(() => {
    if (primeiro.length) definirSessao({ titulo: 'Os que te derrubaram na Batalha', ids: [...new Set(primeiro)].filter((id) => cartas.some((c) => c.id === id)) })
  }, [primeiro, cartas])

  if (sessao && sessao.ids.length) {
    return <Sessao titulo={sessao.titulo} ids={sessao.ids} aoAmpliar={aoAmpliar} reduzido={reduzido}
      aoTerminar={() => { definirRegistros(ler(CHAVE_REGISTROS, {})); definirSessao(null) }} />
  }

  return (
    <div className="fc-biblioteca">
      <header className="fc-biblioteca__cabeca">
        <div>
          <h2>Biblioteca de flashcards</h2>
          <p>{cartas.length.toLocaleString('pt-BR')} flashcards das provas reais. Escolha o que revisar.</p>
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

/** Sessão de estudo: vira o flashcard e diz como foi. */
function Sessao({ titulo, ids, aoAmpliar, reduzido, aoTerminar }: { titulo: string; ids: string[]; aoAmpliar: (i: { src: string; legenda: string }) => void; reduzido: boolean; aoTerminar: () => void }) {
  const porId = useMemo(() => new Map(todasAsCartas().map((c) => [c.id, c])), [])
  const fila = useMemo(() => ids.filter((id) => porId.has(id)), [ids, porId])
  const [pos, definirPos] = useState(0)
  const [virada, definirVirada] = useState(false)
  const [feitos, definirFeitos] = useState<Record<Avaliacao, number>>({ errei: 0, hesitei: 0, sabia: 0 })
  const acabou = pos >= fila.length
  const carta = porId.get(fila[Math.min(pos, fila.length - 1)])!

  const [bloqueio, definirBloqueio] = useState<LimiteFlashcard | null>(null)
  // Ver o verso conta como um flashcard estudado: no plano grátis, o servidor decide (trava desligada por padrão).
  const virar = useCallback(async () => {
    if (virada || acabou) return
    if (FLASHCARDS_NO_SERVIDOR) {
      const r = await autorizarFlashcard(carta.id)
      if (!r.permitido) { definirBloqueio(r); return }
    }
    definirVirada(true)
  }, [virada, acabou, carta])

  const avaliar = useCallback((a: Avaliacao) => {
    if (!virada || acabou) return
    const registros = ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {})
    registros[carta.id] = { ...proximoRegistro(registros[carta.id], a !== 'errei', Date.now(), a === 'errei' ? 'chute' : a === 'hesitei' ? 'duvida' : 'seguro'), assistidos: registros[carta.id]?.assistidos }
    gravar(CHAVE_REGISTROS, registros)
    gravar(CHAVE_HISTORICO, lembrarVisto(ler<string[]>(CHAVE_HISTORICO, []), carta.id))
    const rec = { ...RECORDES_VAZIOS, ...ler<Partial<Recordes>>(CHAVE_RECORDES, {}) }
    gravar(CHAVE_RECORDES, { ...rec, respostas: rec.respostas + 1, atualizadoEm: Date.now() })
    tocar(a === 'sabia' ? 'cura' : a === 'hesitei' ? 'confirmar' : 'erro')
    definirFeitos((f) => ({ ...f, [a]: f[a] + 1 }))
    definirVirada(false)
    definirPos((p) => p + 1)
  }, [carta, virada, acabou])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const alvo = e.target as HTMLElement
      if (e.key === ' ' && alvo?.tagName !== 'BUTTON' && alvo?.tagName !== 'A') { e.preventDefault(); virar() }
      if (virada && e.key === '1') avaliar('errei')
      if (virada && e.key === '2') avaliar('hesitei')
      if (virada && e.key === '3') avaliar('sabia')
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [avaliar, virada, virar])

  const total = feitos.errei + feitos.hesitei + feitos.sabia
  if (acabou) {
    return (
      <div className="fc-estudo fc-estudo--fim">
        <div className="fc-janela fc-estudo__resumo">
          <h2>Sessão concluída</h2>
          <p className="fc-janela__sub">{titulo}: {total} flashcard{total === 1 ? '' : 's'} revisado{total === 1 ? '' : 's'}.</p>
          <dl className="fc-estudo__placar fc-estudo__placar--fim">
            <div className="sabia"><dt>Sabia</dt><dd>{feitos.sabia}</dd></div>
            <div className="hesitei"><dt>Hesitei</dt><dd>{feitos.hesitei}</dd></div>
            <div className="errei"><dt>Errei</dt><dd>{feitos.errei}</dd></div>
          </dl>
          <p className="fc-janela__nota">Os que você errou voltam hoje; os que hesitou, em 3 dias; os que sabia, em 10.</p>
          <div className="fc-janela__botoes"><button type="button" className="fc-botao" onClick={aoTerminar} autoFocus>Voltar à biblioteca</button></div>
        </div>
      </div>
    )
  }
  const atual = pos + 1
  return (
    <div className="fc-estudo">
      <aside className="fc-estudo__painel" aria-label="Progresso do estudo">
        <button type="button" className="fc-botao-pequeno fc-estudo__voltar" onClick={aoTerminar}>← Biblioteca</button>
        <p className="fc-estudo__titulo">{titulo}</p>
        <div className="fc-estudo__contagem"><b>{atual}</b><small>de {fila.length}</small></div>
        <div className="fc-estudo__barra" aria-hidden="true"><i style={{ width: (100 * atual) / fila.length + '%' }} /></div>
        <dl className="fc-estudo__placar">
          <div className="sabia"><dt>Sabia</dt><dd>{feitos.sabia}</dd></div>
          <div className="hesitei"><dt>Hesitei</dt><dd>{feitos.hesitei}</dd></div>
          <div className="errei"><dt>Errei</dt><dd>{feitos.errei}</dd></div>
        </dl>
      </aside>
      {bloqueio && (
        <div className="fc-veu" role="dialog" aria-modal="true" aria-labelledby="fc-limite-estudo">
          <div className="fc-janela">
            <h2 id="fc-limite-estudo">{bloqueio.falha ? 'Não deu para validar' : 'Limite grátis de hoje'}</h2>
            <p className="fc-janela__sub">{bloqueio.falha ? 'Não foi possível falar com o servidor agora. Confira a conexão e tente de novo.' : 'Você usou os 10 flashcards grátis destas 24 horas. Assinantes estudam sem limite.'}</p>
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
        />
      </div>
      <div className="fc-estudo__botoes">
        {virada ? (
          <>
            <button type="button" className="fc-botao-aval fc-botao-aval--errei" onClick={() => avaliar('errei')}><strong>Errei</strong><small>volta hoje · 1</small></button>
            <button type="button" className="fc-botao-aval fc-botao-aval--hesitei" onClick={() => avaliar('hesitei')}><strong>Hesitei</strong><small>volta em 3 dias · 2</small></button>
            <button type="button" className="fc-botao-aval fc-botao-aval--sabia" onClick={() => avaliar('sabia')}><strong>Sabia</strong><small>volta em 10 dias · 3</small></button>
          </>
        ) : (
          <button type="button" className="fc-principal fc-principal--largo pronto" onClick={() => { tocar('confirmar'); virar() }}><span>Virar o flashcard</span><small>espaço</small></button>
        )}
      </div>
    </div>
  )
}
