import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { recurso } from '../config'
import { usarPremium } from '../conta/premium'
import { Icone } from '../componentes/Icone'
import { corDaArea } from '../dados/coresAreas'
import { href, navegar } from '../util/rotas'
import { bibliotecaVisivel, resumosDosSubtemas, usarIndiceBiblioteca } from './recomendar'
import '../estilos/componentes/BibliotecaConvite.css'

/** Questão → trecho do resumo que a ensina (public/biblioteca/questoes.json, gerado pelo script da Biblioteca). */
interface Destino { c: string; b: string; s: string; t: string; p: 'central' | 'relacionada' | 'treino' }
let mapa: Promise<Record<string, Destino[]>> | null = null
const carregar = (): Promise<Record<string, Destino[]>> => (mapa ??= fetch(recurso('biblioteca/questoes.json')).then((r) => (r.ok ? r.json() as Promise<Record<string, Destino[]>> : {})).catch(() => { mapa = null; return {} }))

/** Tempo da abertura do livro antes de ir para o resumo (o CSS anima em 560 ms). */
const ABERTURA_MS = 560

/** "Rockwood and Green's Fractures in Adults" → "Rockwood & Green’s"; "Rockwood and Wilkins' …" → "Rockwood & Wilkins’". */
const nomeCurtoDoLivro = (livro: string) => livro.replace(/\s+Fractures in .*$/i, '').replace(/\s+and\s+/, ' & ').replace(/'/g, '’')

const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Convite para a Biblioteca no fim da questão (pedido do Tales, 16/10/2026: "bem bonito mesmo"; 19/10/2026:
 * o livrinho em pixel art, com o nome do livro, o capítulo e o tema na capa, que mexe e abre ao clicar).
 * Se a questão é citada num resumo, abre o parágrafo que a explica, destacado; se não é citada mas o
 * subtema dela é ensinado por um resumo, convida para o resumo do tema. Sem relação, não aparece.
 * O livro e o botão são links de verdade: Ctrl/Cmd, botão do meio e "reduzir movimento" vão direto.
 */
export function EstudarAssunto({ questao, subtemas = [] }: { questao: string; subtemas?: string[] }) {
  const [destino, definir] = useState<Destino | null | undefined>(undefined)
  const [abrindo, definirAbrindo] = useState(false)
  const [longe, definirLonge] = useState(false)
  const [no, definirNo] = useState<HTMLElement | null>(null)
  const relogio = useRef<number | undefined>(undefined)
  const biblioteca = usarIndiceBiblioteca()
  const { premium } = usarPremium()
  const ativo = bibliotecaVisivel()
  useEffect(() => {
    if (!ativo) return
    let vivo = true
    definir(undefined)
    definirAbrindo(false)
    carregar().then((m) => { if (vivo) definir(m[questao]?.[0] ?? null) })
    return () => { vivo = false }
  }, [questao, ativo])
  // O livro só se mexe na tela: fora dela, a animação para (bateria e processador do celular).
  useEffect(() => {
    if (!no || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => definirLonge(!e.isIntersecting), { rootMargin: '80px 0px' })
    io.observe(no)
    return () => io.disconnect()
  }, [no])
  useEffect(() => () => window.clearTimeout(relogio.current), [])
  if (!ativo || destino === undefined || !biblioteca) return null
  const capitulo = destino ? biblioteca.capitulos.find((c) => c.id === destino.c) : resumosDosSubtemas(biblioteca, subtemas)[0]
  if (!capitulo) return null
  const citada = !!destino && destino.c === capitulo.id
  const fechado = capitulo.acesso !== 'gratis' && !premium
  const destinoHref = citada ? `/resumos/${capitulo.id}?bloco=${encodeURIComponent(destino!.b)}` : `/resumos/${capitulo.id}`
  const numero = capitulo.capitulo.match(/\d+/)?.[0]
  const livroCurto = nomeCurtoDoLivro(capitulo.livro)
  const tema = capitulo.titulo.toLowerCase()
  const tituloLongo = capitulo.titulo.length > 34

  const abrir = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (abrindo) { e.preventDefault(); return }
    if (semMovimento()) return
    e.preventDefault()
    definirAbrindo(true)
    relogio.current = window.setTimeout(() => navegar(destinoHref), ABERTURA_MS)
  }

  return (
    <aside
      ref={definirNo}
      className={'bib-convite' + (abrindo ? ' bib-convite--abrindo' : '') + (longe ? ' bib-convite--longe' : '') + (fechado ? ' bib-convite--fechado' : '')}
      style={{ ['--bib-area' as string]: corDaArea(capitulo.especialidade) }}
      aria-label="Resumo deste tema na Biblioteca"
    >
      <div className="bib-convite__palco">
        <span className="bib-convite__brilho bib-convite__brilho--a" aria-hidden="true" />
        <span className="bib-convite__brilho bib-convite__brilho--b" aria-hidden="true" />
        <span className="bib-convite__brilho bib-convite__brilho--c" aria-hidden="true" />
        <span className="bib-convite__brilho bib-convite__brilho--d" aria-hidden="true" />
        <a className="bib-convite__capa" href={href(destinoHref)} tabIndex={-1} aria-hidden="true" onClick={abrir}>
          <span className="bib-convite__flutua">
            <span className="bib-convite__livro">
              <span className="bib-convite__contracapa" />
              <span className="bib-convite__miolo">
                <span className="bib-convite__pagina" />
                <span className="bib-convite__folha bib-convite__folha--1" />
                <span className="bib-convite__folha bib-convite__folha--2" />
                <span className="bib-convite__folha bib-convite__folha--3" />
              </span>
              <span className="bib-convite__fita" />
              <span className="bib-convite__capa-lombada" />
              <span className="bib-convite__verso" />
              <span className="bib-convite__tampa">
                <span className="bib-convite__capa-frente">
                  <span className="bib-convite__moldura" />
                  <span className="bib-convite__capa-livro">{livroCurto}</span>
                  <span className="bib-convite__capa-filete" />
                  <span className={'bib-convite__capa-titulo' + (tituloLongo ? ' bib-convite__capa-titulo--longo' : '')}>{capitulo.titulo}</span>
                  {numero && <span className="bib-convite__capa-numero">Cap. {numero}</span>}
                </span>
              </span>
            </span>
          </span>
          <span className="bib-convite__chao" />
        </a>
      </div>
      <div className="bib-convite__texto">
        <span className="bib-convite__selo"><span className="bib-convite__selo-ponto" aria-hidden="true" />Biblioteca<span className="bib-convite__selo-marca"> OrtoQuestões</span> <b>Beta</b></span>
        <h3 className="bib-convite__titulo">{citada ? 'Esta questão está explicada num resumo' : 'Tem um resumo sobre este tema'}</h3>
        <p className="bib-convite__frase">{citada
          ? <>O raciocínio dela está em <strong>“{destino!.s}”</strong>, no resumo de {tema}.</>
          : <>O resumo de <strong>{tema}</strong> segue a ordem em que as provas cobram o tema.</>}</p>
        <div className="bib-convite__acoes">
          <a className="botao bib-convite__botao" href={href(destinoHref)} onClick={abrir}>
            {fechado ? <Icone nome="cadeado" tamanho={16} /> : <Icone nome="livro" tamanho={16} />}
            {citada ? 'Ler o trecho que explica' : 'Ler o resumo'}
          </a>
          <small>~{capitulo.minutos} min · {numero ? `Cap. ${numero}` : capitulo.capitulo.split('·')[0].trim()} do {livroCurto}{fechado ? ' · para assinantes' : ''}</small>
        </div>
      </div>
    </aside>
  )
}
