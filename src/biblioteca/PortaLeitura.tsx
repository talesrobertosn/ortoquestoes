import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Icone } from '../componentes/Icone'
import { href, navegar } from '../util/rotas'
import { SECOES_ABERTAS, linkDaPorta, type Porta } from './porta'
import '../estilos/componentes/PortaLeitura.css'

/** Tempo do fecho abrindo antes de ir para a conta (o CSS anima em 520 ms). */
const ABERTURA_MS = 520
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A porta do leitor para quem não tem conta (pedido do Tales, 19/10/2026): depois da 6ª parte, um
 * livrinho pixel fechado com a fita de ouro e o fecho com cadeado. Parado, flutua e a fita balança;
 * com o mouse por cima, levanta; no clique, o fecho abre e a capa entreabre antes de ir para a conta.
 * O livro é um link de verdade (Ctrl/Cmd e "reduzir movimento" vão direto) e fica aria-hidden: o botão
 * com texto ao lado faz o mesmo.
 */
export function PortaLeitura({ capitulo, numeroCapitulo, porta, restantes }: {
  capitulo: string
  numeroCapitulo?: string
  porta: Porta
  restantes: Array<{ id: string; titulo: string }>
}) {
  const [abrindo, definirAbrindo] = useState(false)
  const [longe, definirLonge] = useState(false)
  const no = useRef<HTMLElement>(null)
  const relogio = useRef<number | undefined>(undefined)
  const criar = linkDaPorta('criar', capitulo, porta)
  const entrar = linkDaPorta('entrar', capitulo, porta)
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
    relogio.current = window.setTimeout(() => navegar(criar), ABERTURA_MS)
  }

  return (
    <section ref={no} id="porta-leitura" className={'pl' + (abrindo ? ' pl--abrindo' : '') + (longe ? ' pl--longe' : '')} data-bloco="porta" aria-labelledby="pl-titulo">
      <div className="pl-palco">
        <a className="pl-livro" href={href(criar)} tabIndex={-1} aria-hidden="true" onClick={abrir}>
          <span className="pl-livro__flutua">
            <span className="pl-livro__folhas" />
            <span className="pl-livro__fita" />
            <span className="pl-livro__capa">
              <span className="pl-livro__moldura" />
              <span className="pl-livro__parte">Parte {SECOES_ABERTAS + 1}</span>
              <span className="pl-livro__filete" />
              <span className="pl-livro__resto">em diante</span>
              {numeroCapitulo && <span className="pl-livro__cap">Cap. {numeroCapitulo}</span>}
            </span>
            <span className="pl-livro__fecho"><span className="pl-livro__argola" /><span className="pl-livro__cadeado" /></span>
            <span className="pl-livro__brilho pl-livro__brilho--a" />
            <span className="pl-livro__brilho pl-livro__brilho--b" />
            <span className="pl-livro__brilho pl-livro__brilho--c" />
          </span>
          <span className="pl-livro__chao" />
        </a>
      </div>

      <div className="pl-texto">
        <h2 id="pl-titulo">Você leu as {SECOES_ABERTAS} primeiras partes deste resumo</h2>
        {porta.pedida && <p className="pl-pedida">
          <Icone nome="cadeado" tamanho={15} /> O link que você abriu leva à parte {porta.pedida.numero}, <strong>“{porta.pedida.secao.titulo}”</strong>.
        </p>}
        <p className="pl-frase">Para continuar, crie sua conta: <strong>é grátis</strong> e não pede cartão. Depois de criar, você volta para cá, {porta.pedida ? 'direto nessa parte' : `no começo da parte ${SECOES_ABERTAS + 1}`}.</p>
        <p className="pl-rotulo">Com a conta grátis, você:</p>
        <ul className="pl-lista">
          <li><Icone nome="livro" tamanho={17} /> Lê todos os resumos da Biblioteca inteiros</li>
          <li><Icone nome="lapis" tamanho={17} /> Marca trechos e escreve notas, guardados na conta</li>
          <li><Icone nome="bandeira" tamanho={17} /> Continua de onde parou, no celular ou no computador</li>
        </ul>
        <div className="pl-acoes">
          <a className="pl-botao" href={href(criar)} onClick={abrir}>Criar conta grátis e continuar lendo</a>
          <a className="pl-entrar" href={href(entrar)}>Já tenho conta · Entrar</a>
        </div>
        {restantes.length > 0 && <details className="pl-depois">
          <summary>O que vem nas próximas {restantes.length} partes</summary>
          <ol start={SECOES_ABERTAS + 1}>{restantes.map((s) => <li key={s.id} className={porta.pedida?.secao.id === s.id ? 'pl-depois--pedida' : ''}>{s.titulo}</li>)}</ol>
        </details>}
      </div>
    </section>
  )
}
