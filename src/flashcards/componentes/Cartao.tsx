import { memo, useEffect, useRef, useState } from 'react'
import { recurso } from '../../config'
import { href } from '../../util/rotas'
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
  return (
    <figure ref={ref} className={'fc-carta__figura' + (apertada ? ' fc-carta__figura--apertada' : '')}>
      <button type="button" className="fc-carta__imagem" onClick={abrir} aria-label="Abrir a imagem maior">
        <img src={img.src} alt="Figura da questão de origem" loading="eager" />
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
 * Flashcard físico: moldura por raridade, pergaminho, cabeçalho com brasão e
 * altura que acompanha o conteúdo. O giro acontece em duas metades: até 90°,
 * troca a face e volta de -90°; assim o verso ocupa a altura que precisa e o
 * texto nunca aparece espelhado.
 */
export const Cartao = memo(function Cartao({ carta, virada, dicaFrente, aoTocar, aoAmpliar, chave, resultado, assistida, aoGirar, reduzido, rodapeVerso, classe, familias = [] }: Props) {
  const [lado, definirLado] = useState<'frente' | 'verso'>(virada ? 'verso' : 'frente')
  const [giro, definirGiro] = useState<'' | 'sai' | 'entra'>('')
  const [origemAberta, definirOrigem] = useState(false)
  const alvo = virada ? 'verso' : 'frente'
  const tempo = useRef(0)

  useEffect(() => {
    if (alvo === lado) return
    window.clearTimeout(tempo.current)
    if (reduzido) { definirLado(alvo); return }
    aoGirar?.()
    definirGiro('sai')
    tempo.current = window.setTimeout(() => {
      definirLado(alvo)
      definirGiro('entra')
      tempo.current = window.setTimeout(() => definirGiro(''), 260)
    }, 200)
    return () => window.clearTimeout(tempo.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alvo])

  // Novo flashcard: volta para a frente sem girar.
  useEffect(() => { definirLado(virada ? 'verso' : 'frente'); definirGiro(''); definirOrigem(false) }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  const img = carta.imagem && { src: recurso('imagens/' + carta.imagem.arquivo), legenda: carta.imagem.legenda }
  const frente = lado === 'frente'
  return (
    <article
      className={`fc-carta fc-carta--${carta.raridade}${giro ? ' fc-carta--' + giro : ''}${!frente ? ' fc-carta--verso' : ''}${resultado && !frente ? ' fc-carta--' + resultado : ''}${familias.map((f) => ' fc-carta--fam-' + f).join('')}${classe ? ' ' + classe : ''}`}
      key={chave}
      aria-label={`Flashcard: ${carta.assunto}`}
    >
      <div className="fc-carta__borda">
        <span className="fc-carta__gema" aria-hidden="true" />
        <span className="fc-carta__canto fc-carta__canto--1" aria-hidden="true" /><span className="fc-carta__canto fc-carta__canto--2" aria-hidden="true" />
        <span className="fc-carta__canto fc-carta__canto--3" aria-hidden="true" /><span className="fc-carta__canto fc-carta__canto--4" aria-hidden="true" />
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
