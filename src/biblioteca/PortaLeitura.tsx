import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { usarPremium } from '../conta/premium'
import { href, navegar } from '../util/rotas'
import { linkEntrarDaPorta, type Porta } from './porta'
import '../estilos/componentes/PortaLeitura.css'

/** Tempo do fecho abrindo antes de ir para os planos (o CSS anima em 520 ms). */
const ABERTURA_MS = 520
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

const BENEFICIOS: Array<{ icone: NomeIcone; titulo: string; texto: string }> = [
  { icone: 'livro', titulo: 'Todos os resumos inteiros', texto: 'Cada capítulo da Biblioteca do começo ao fim, na ordem em que a prova cobra.' },
  { icone: 'alvo', titulo: 'As questões no meio do texto', texto: 'Resolva as questões citadas sem sair da leitura, com gabarito e comentário.' },
  { icone: 'raio', titulo: 'Frases que caem, todas', texto: 'O que a banca pergunta, em uma frase por assunto, para reler em minutos.' },
  { icone: 'calendario', titulo: 'Cronograma até a prova', texto: 'O resumo do dia antes das questões, com revisão no tempo certo.' },
]

/**
 * A paywall dos resumos (pedido do Tales, 09/11/2026): no fim da prévia, o texto esmaece e aparece o livrinho
 * pixel fechado com a fita de ouro e o cadeado. Parado, flutua e a fita balança; com o mouse por cima, levanta;
 * no clique, o fecho abre e a capa entreabre antes de ir para os planos. O livro é um link de verdade
 * (Ctrl/Cmd e "reduzir movimento" vão direto) e fica aria-hidden: o botão com texto ao lado faz o mesmo.
 * Nunca diz quanto do texto a prévia mostra.
 */
export function PortaLeitura({ capitulo, titulo, numeroCapitulo, porta, minutosRestantes, questoesRestantes }: {
  capitulo: string
  titulo: string
  numeroCapitulo?: string
  porta: Porta
  minutosRestantes: number
  questoesRestantes: number
}) {
  const { logado, carregado, pagamentos_ativos } = usarPremium()
  const [abrindo, definirAbrindo] = useState(false)
  const [longe, definirLonge] = useState(false)
  const no = useRef<HTMLElement>(null)
  const relogio = useRef<number | undefined>(undefined)
  const planos = '/assinatura'
  useEffect(() => {
    const el = no.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => definirLonge(!e.isIntersecting), { rootMargin: '80px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => () => window.clearTimeout(relogio.current), [])

  const abrir = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (abrindo) { e.preventDefault(); return }
    if (semMovimento()) return
    e.preventDefault()
    definirAbrindo(true)
    relogio.current = window.setTimeout(() => navegar(planos), ABERTURA_MS)
  }

  const partes = porta.restantes.length
  const conferindo = logado && !carregado
  return (
    <section ref={no} id="porta-leitura" className={'pl' + (abrindo ? ' pl--abrindo' : '') + (longe ? ' pl--longe' : '')} data-bloco="porta" aria-labelledby="pl-titulo">
      <div className="pl-cartao">
        <div className="pl-palco">
          <a className="pl-livro" href={href(planos)} tabIndex={-1} aria-hidden="true" onClick={abrir}>
            <span className="pl-livro__flutua">
              <span className="pl-livro__folhas" />
              <span className="pl-livro__fita" />
              <span className="pl-livro__capa">
                <span className="pl-livro__moldura" />
                <span className="pl-livro__parte">Continua</span>
                <span className="pl-livro__filete" />
                <span className="pl-livro__resto">o resumo completo</span>
                {numeroCapitulo && <span className="pl-livro__cap">Cap. {numeroCapitulo}</span>}
              </span>
              <span className="pl-livro__fecho"><span className="pl-livro__argola" /><span className="pl-livro__cadeado" /></span>
              <span className="pl-livro__brilho pl-livro__brilho--a" />
              <span className="pl-livro__brilho pl-livro__brilho--b" />
              <span className="pl-livro__brilho pl-livro__brilho--c" />
            </span>
            <span className="pl-livro__chao" />
          </a>
          <ul className="pl-resta" aria-label="O que falta neste resumo">
            {partes > 0 && <li><b className="numerico">{partes}</b> {partes === 1 ? 'parte' : 'partes'} a seguir</li>}
            {minutosRestantes > 0 && <li><b className="numerico">~{minutosRestantes}</b> min de leitura</li>}
            {questoesRestantes > 0 && <li><b className="numerico">{questoesRestantes}</b> {questoesRestantes === 1 ? 'questão citada' : 'questões citadas'}</li>}
          </ul>
        </div>

        <div className="pl-texto">
          <p className="pl-selo"><Icone nome="cadeado" tamanho={13} /> Exclusivo para assinantes</p>
          <h2 id="pl-titulo">Continue lendo até o fim</h2>
          {porta.pedida && <p className="pl-pedida">
            <Icone nome="cadeado" tamanho={15} /> O link que você abriu leva à parte {porta.pedida.numero}, <strong>“{porta.pedida.secao.titulo}”</strong>.
          </p>}
          <p className="pl-frase">O restante de <strong>{titulo}</strong> está na assinatura do Orto Questões, junto com todos os outros resumos da Biblioteca. Depois de assinar, a leitura continua exatamente deste ponto.</p>
          <ul className="pl-lista">
            {BENEFICIOS.map((b) => <li key={b.titulo}>
              <span className="pl-lista__icone" aria-hidden="true"><Icone nome={b.icone} tamanho={18} /></span>
              <span><strong>{b.titulo}</strong><small>{b.texto}</small></span>
            </li>)}
          </ul>
          <div className="pl-acoes">
            {conferindo
              ? <p className="pl-conferindo" role="status"><span className="pl-conferindo__ponto" aria-hidden="true" /> Conferindo a sua assinatura…</p>
              : <a className="pl-botao" href={href(planos)} onClick={abrir}>Assinar e ler o resumo completo</a>}
            {!logado && <a className="pl-entrar" href={href(linkEntrarDaPorta(capitulo, porta))}>Já sou assinante · Entrar</a>}
          </div>
          {logado && carregado && !pagamentos_ativos && <p className="pl-nota">As assinaturas abrem em breve.</p>}
          {partes > 0 && <details className="pl-depois">
            <summary>O que vem a seguir</summary>
            <ol>{porta.restantes.map((s) => <li key={s.id + (s.continua ? '-c' : '')} className={porta.pedida?.secao.id === s.id ? 'pl-depois--pedida' : ''}>{s.titulo}{s.continua && <small> (continuação)</small>}</li>)}</ol>
          </details>}
        </div>
      </div>
    </section>
  )
}
