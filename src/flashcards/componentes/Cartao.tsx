import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { recurso } from '../../config'
import { href } from '../../util/rotas'
import { useDeslizar } from '../efeitos/deslizar'
import type { Flashcard } from '../tipos'
import { Sprite } from './Sprite'
import { Texto } from './Texto'

export const NOME_RARIDADE = { lendaria: 'Lendária', epica: 'Épica', rara: 'Rara', comum: 'Comum' } as const
export const NOME_DIFICULDADE = { 1: 'Fácil', 2: 'Moderada', 3: 'Difícil' } as const

interface Props {
  carta: Flashcard
  virada: boolean
  dicaFrente: string
  aoTocar?: () => void
  aoAmpliar: (img: { src: string; legenda: string }) => void
  /** Muda a cada compra, para a animação de entrada recomeçar. */
  chave: string | number
  resultado?: 'certo' | 'errado' | null
  assistida?: boolean
  /** Efeito sonoro do giro. */
  aoGirar?: () => void
  reduzido?: boolean
  /** Ações extras no rodapé do verso (os botões de autoavaliação do Estudo). */
  rodapeVerso?: React.ReactNode
  /** Classe extra (por exemplo, o flashcard se erguendo no ataque). */
  classe?: string
  /** Famílias visuais (imagem, anatomia, revisão, chefe): moldura e fita próprias, sem mudar a leitura. */
  familias?: FamiliaCarta[]
}

export type FamiliaCarta = 'imagem' | 'anatomia' | 'revisao' | 'chefe'
const FITA: Record<FamiliaCarta, string> = { imagem: 'Imagem', anatomia: 'Anatomia', revisao: 'Revisão', chefe: 'Duelo de chefe' }

/** Família do flashcard a partir dos dados (a revisão e o chefe vêm de quem chama). */
export function familiasDe(carta: Flashcard, extra: FamiliaCarta[] = []): FamiliaCarta[] {
  const f: FamiliaCarta[] = []
  if (carta.imagem) f.push('imagem')
  if (/anatomia/i.test(carta.tipo) || carta.areaId === 'anatomia') f.push('anatomia')
  return [...f, ...extra]
}

/**
 * Figura da questão: ocupa o espaço que sobra no flashcard e aparece sempre
 * inteira (encolhe para caber). Se sobrar pouco espaço, vira um botão com
 * miniatura que abre a imagem grande.
 */
function Figura({ img, aoAmpliar }: { img: { src: string; legenda: string }; aoAmpliar: Props['aoAmpliar'] }) {
  const ref = useRef<HTMLElement>(null)
  const [apertada, definirApertada] = useState(false)
  useEffect(() => {
    const fig = ref.current
    const carta = fig?.closest('.fc-carta')
    const palco = carta?.parentElement
    if (!fig || !carta || !palco) return
    // mede o espaço do lugar onde o flashcard está (não o próprio flashcard,
    // que encolhe junto com a imagem): sobra = altura do palco menos o resto do flashcard
    const medir = () => {
      const cabeca = carta.querySelector<HTMLElement>('.fc-carta__cabeca')?.offsetHeight ?? 0
      const pergunta = (fig.previousElementSibling as HTMLElement | null)?.offsetHeight ?? 0
      const pe = carta.querySelector<HTMLElement>('.fc-carta__pe')?.offsetHeight ?? 0
      const sobra = palco.clientHeight - cabeca - pergunta - pe - 110
      definirApertada(sobra < 120)
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(palco)
    return () => obs.disconnect()
  }, [])
  const abrir = (e: React.MouseEvent) => { e.stopPropagation(); aoAmpliar(img) }
  // Carregamento suave (15/10/2026): o quadro da figura já ocupa o lugar dela (sem pulo de
  // layout), mostra um brilho de espera e a figura entra com um esmaecer quando decodifica.
  // Se a rede falhar, aparece um aviso com "Tentar de novo" em vez de um ícone quebrado.
  const [estado, definirEstado] = useState<'carregando' | 'pronta' | 'falhou'>('carregando')
  const [tentativa, definirTentativa] = useState(0)
  const refImg = useRef<HTMLImageElement>(null)
  useEffect(() => {
    definirEstado('carregando')
    const el = refImg.current
    if (el?.complete && el.naturalWidth > 0) definirEstado('pronta')
  }, [img.src, tentativa])
  const src = tentativa ? `${img.src}${img.src.includes('?') ? '&' : '?'}t=${tentativa}` : img.src
  return (
    <figure ref={ref} className={'fc-carta__figura' + (apertada ? ' fc-carta__figura--apertada' : '')}>
      <button type="button" className={`fc-carta__imagem fc-carta__imagem--${estado}`} onClick={estado === 'falhou' ? (e) => { e.stopPropagation(); definirTentativa((t) => t + 1) } : abrir}
        aria-label={estado === 'falhou' ? 'A imagem não carregou: tentar de novo' : 'Abrir a imagem maior'} aria-busy={estado === 'carregando' || undefined}>
        <img ref={refImg} key={src} src={src} alt="Figura da questão de origem" loading="eager" decoding="async" draggable={false}
          onLoad={() => definirEstado('pronta')} onError={() => definirEstado('falhou')} />
        {estado === 'falhou' && <span className="fc-carta__imagem-aviso">A imagem não carregou. <b>Tentar de novo</b></span>}
      </button>
      <button type="button" className="fc-ver-imagem" onClick={abrir}>
        <img src={img.src} alt="" aria-hidden="true" />
        <span><strong>Ver imagem</strong><small>toque para abrir grande</small></span>
      </button>
      <figcaption>
        <span>{img.legenda}</span>
        <button type="button" className="fc-botao-pequeno fc-botao-pequeno--ouro" onClick={abrir}>Ampliar imagem</button>
      </figcaption>
    </figure>
  )
}

/**
 * Cópia do flashcard que acabou de sair, no mesmo lugar, deslizando para o
 * descarte (à direita) enquanto o novo chega do baralho (à esquerda). É só
 * enfeite: sem eventos, fora da leitura de tela e removida no fim.
 */
function descartar(velho: HTMLElement) {
  const pai = velho.parentElement
  if (!pai || typeof velho.animate !== 'function' || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)) return
  const copia = velho.cloneNode(true) as HTMLElement
  copia.classList.remove('fc-carta--chega', 'fc-carta--sai', 'fc-carta--entra', 'fc-carta--ataca')
  copia.classList.add('fc-carta--descartada')
  copia.setAttribute('aria-hidden', 'true')
  copia.removeAttribute('aria-label')
  copia.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
  Object.assign(copia.style, { position: 'absolute', top: velho.offsetTop + 'px', left: velho.offsetLeft + 'px', width: velho.offsetWidth + 'px', height: velho.offsetHeight + 'px', margin: '0', pointerEvents: 'none', zIndex: '0' })
  pai.appendChild(copia)
  const anim = copia.animate(
    [{ transform: 'none', opacity: 1 }, { transform: 'translate(26%, 3%) rotate(6deg) scale(.86)', opacity: 0 }],
    { duration: 380, easing: 'cubic-bezier(.5, 0, .75, .4)', fill: 'forwards' },
  )
  anim.onfinish = () => copia.remove()
  window.setTimeout(() => copia.remove(), 800)
}

/** Tempos do giro (ms): a metade que sai e a que entra; o CSS usa os mesmos. */
const GIRO_SAI = 230
const GIRO_ENTRA = 340

/**
 * Flashcard físico: moldura por raridade, pergaminho, cabeçalho com brasão e
 * altura que acompanha o conteúdo. O giro acontece em duas metades: até 90°,
 * troca a face e volta de -90°; assim o verso ocupa a altura que precisa e o
 * texto nunca aparece espelhado.
 */
export const Cartao = memo(function Cartao({ carta, virada, dicaFrente, aoTocar, aoAmpliar, chave, resultado, assistida, aoGirar, reduzido, rodapeVerso, classe, familias = [] }: Props) {
  const alvo = virada ? 'verso' : 'frente'
  const [lado, definirLado] = useState<'frente' | 'verso'>(alvo)
  const [giro, definirGiro] = useState<'' | 'sai' | 'entra'>('')
  const [origemAberta, definirOrigem] = useState(false)
  const [chegando, definirChegando] = useState(true)
  // Flashcard novo (outra chave): já nasce no lado pedido, sem giro, e só chega do baralho.
  // Ajustado durante o render para o primeiro quadro do novo já sair certo.
  const [chaveVista, definirChaveVista] = useState(chave)
  if (chaveVista !== chave) {
    definirChaveVista(chave)
    definirLado(alvo)
    definirGiro('')
    definirOrigem(false)
    definirChegando(true)
  }
  const ladoAtual = useRef(lado)
  ladoAtual.current = lado
  const tempo = useRef(0)
  const refCarta = useRef<HTMLElement | null>(null)
  useDeslizar(refCarta, reduzido)
  // o flashcard que sai (outra chave) não some de estalo: uma cópia vai para o descarte
  const reduzidoAtual = useRef(reduzido)
  reduzidoAtual.current = reduzido
  const prenderCarta = useCallback((el: HTMLElement | null) => {
    const velho = refCarta.current
    refCarta.current = el
    if (!el && velho && !reduzidoAtual.current) descartar(velho)
  }, [])

  // Giro em duas metades. Um pedido novo cancela o anterior: nunca sobra meio-giro
  // de um flashcard para o próximo, e voltar atrás no meio só desfaz a saída.
  useEffect(() => {
    window.clearTimeout(tempo.current)
    if (alvo === ladoAtual.current) { definirGiro(''); return }
    if (reduzido) { definirLado(alvo); definirGiro(''); return }
    aoGirar?.()
    definirGiro('sai')
    tempo.current = window.setTimeout(() => {
      definirLado(alvo)
      definirGiro('entra')
      tempo.current = window.setTimeout(() => definirGiro(''), GIRO_ENTRA)
    }, GIRO_SAI)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo, chave])
  useEffect(() => () => window.clearTimeout(tempo.current), [])
  useEffect(() => {
    if (!chegando) return
    const t = window.setTimeout(() => definirChegando(false), 600)
    return () => window.clearTimeout(t)
  }, [chegando, chave])

  const img = carta.imagem && { src: recurso('imagens/' + carta.imagem.arquivo), legenda: carta.imagem.legenda }
  const frente = lado === 'frente'
  return (
    <article
      ref={prenderCarta}
      className={`fc-carta fc-carta--${carta.raridade}${chegando ? ' fc-carta--chega' : ''}${giro ? ' fc-carta--' + giro : ''}${!frente ? ' fc-carta--verso' : ''}${resultado && !frente ? ' fc-carta--' + resultado : ''}${familias.map((f) => ' fc-carta--fam-' + f).join('')}${classe ? ' ' + classe : ''}`}
      key={chave}
      aria-label={`Flashcard: ${carta.assunto}`}
    >
      <div className="fc-carta__borda">
        <span className="fc-carta__gema" aria-hidden="true" />
        <span className="fc-carta__canto fc-carta__canto--1" aria-hidden="true" /><span className="fc-carta__canto fc-carta__canto--2" aria-hidden="true" />
        <span className="fc-carta__canto fc-carta__canto--3" aria-hidden="true" /><span className="fc-carta__canto fc-carta__canto--4" aria-hidden="true" />
        {(carta.raridade === 'lendaria' || carta.raridade === 'epica') && <span className="fc-carta__aro" aria-hidden="true"><i /></span>}
        {carta.raridade === 'lendaria' && <span className="fc-carta__faiscas" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>}
        {familias.length > 0 && <span className="fc-carta__fitas">{familias.map((f) => <em key={f} className={`fc-fita fc-fita--${f}`}>{FITA[f]}</em>)}</span>}
        <div className="fc-carta__moldura">
          <header className="fc-carta__cabeca">
            <span className="fc-carta__emblema"><Sprite nome="brasao" /></span>
            <div className="fc-carta__titulo">
              <strong>{carta.assunto}</strong>
              <small>{carta.area} · {carta.tipo}</small>
            </div>
            <div className="fc-carta__selos">
              <span className={`fc-raridade fc-raridade--${carta.raridade}`}>{NOME_RARIDADE[carta.raridade]}</span>
              <span className={`fc-dificuldade fc-dificuldade--${carta.dificuldade}`} title={`Dificuldade ${NOME_DIFICULDADE[carta.dificuldade].toLowerCase()}`}>
                {'◆'.repeat(carta.dificuldade)}<span className="fc-visivel-leitor"> {NOME_DIFICULDADE[carta.dificuldade]}</span>
              </span>
            </div>
          </header>

          {frente ? (
            <div
              className={'fc-carta__miolo' + (aoTocar ? ' fc-carta__miolo--tocavel' : '') + (img ? ' fc-carta__miolo--com-imagem' : '')}
              onClick={aoTocar}
              role={aoTocar ? 'button' : undefined}
              tabIndex={aoTocar ? 0 : undefined}
              aria-label={aoTocar ? 'Virar o flashcard' : undefined}
              onKeyDown={(e) => { if (aoTocar && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); aoTocar() } }}
            >
              <p className="fc-carta__pergunta"><Texto texto={carta.frente} /></p>
              {img && <Figura img={img} aoAmpliar={aoAmpliar} />}
            </div>
          ) : (
            <div className="fc-carta__miolo fc-carta__miolo--verso" aria-live="polite">
              <p className="fc-carta__rotulo">
                {resultado === 'certo' ? (assistida ? 'Acerto assistido' : 'Você acertou') : resultado === 'errado' ? 'Você errou · a resposta é' : 'Resposta'}
              </p>
              <p className="fc-carta__resposta">{carta.resposta}</p>
              <p className="fc-carta__explicacao"><Texto texto={carta.explicacao} lacunasAbertas /></p>
              {carta.frente.includes('{{') && <p className="fc-carta__completa"><Texto texto={carta.frente} lacunasAbertas /></p>}
              {carta.alerta && <p className="fc-carta__alerta"><strong>Divergência com o gabarito:</strong> {carta.alerta}</p>}
              {img && (
                <button type="button" className="fc-botao-pequeno" onClick={() => aoAmpliar(img)}>Ver a imagem de novo</button>
              )}
              {origemAberta && (
                <p className="fc-carta__origem">
                  Questão <strong>{carta.questao}</strong> do acervo · {carta.area} · {carta.assunto}. O flashcard resume o comentário dessa questão e segue o gabarito oficial.
                </p>
              )}
            </div>
          )}

          <footer className="fc-carta__pe">
            {frente ? (
              <span className="fc-carta__dica">{dicaFrente}</span>
            ) : (
              <span className="fc-carta__acoes">
                <button type="button" className="fc-botao-pequeno" onClick={() => definirOrigem((v) => !v)} aria-expanded={origemAberta}>De onde veio</button>
                <a className="fc-botao-pequeno" href={href(`/questao/${carta.questao}`)} target="_blank" rel="noopener">Fazer a questão ↗</a>
              </span>
            )}
            <span className="fc-carta__id">{carta.questao}</span>
          </footer>
          {!frente && rodapeVerso}
        </div>
      </div>
    </article>
  )
})
