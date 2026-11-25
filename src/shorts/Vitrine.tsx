/*
 * As portas dos Shorts (25/11/2026): a prateleira da Início (como os Shorts no YouTube), o cartão em pé do Treinar e o
 * quadradinho ao lado de "Continue sua jornada". As capas são sempre questões com imagem; o título é o começo do
 * enunciado (nunca o subtema, que às vezes entrega a resposta).
 */
import { useEffect, useRef, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { usarAssinante } from '../conta/plano'
import { urlImagem } from '../dados/edicoes'
import '../estilos/componentes/ShortsCapas.css'
import { abrirShorts, capasDoDia, carregarCapas, carregarTotaisCoracoes, LIMITE_GRATIS_SHORTS, totalCoracoes, type CapaShort } from './dados'
import { IconeSh, SimboloShorts } from './Icones'

const TEMAS: Record<string, string> = {
  joelho: 'Joelho', quadril: 'Quadril', coluna: 'Coluna', mao: 'Mão e punho', 'ombro-cotovelo': 'Ombro e cotovelo', 'pe-tornozelo': 'Pé e tornozelo',
  pediatria: 'Pediatria', trauma: 'Trauma', tumores: 'Tumores', 'conceitos-basicos': 'Conceitos básicos', osteometabolicas: 'Osteometabólicas',
}
const nomeTema = (slug: string) => TEMAS[slug] ?? slug

function usarCapas(n: number): CapaShort[] | null {
  const [capas, definir] = useState<CapaShort[] | null>(null)
  const [, definirTotais] = useState(0)
  useEffect(() => {
    let vivo = true
    carregarCapas().then((l) => {
      if (!vivo) return
      const dia = capasDoDia(l, n)
      definir(dia)
      carregarTotaisCoracoes(dia.map((c) => c.id)).then(() => vivo && definirTotais((x) => x + 1))
    }).catch(() => vivo && definir([]))
    return () => { vivo = false }
  }, [n])
  return capas
}

function Capa({ capa, primeira }: { capa: CapaShort; primeira?: boolean }) {
  const src = urlImagem(capa.arquivo)
  const retrato = capa.largura && capa.altura ? capa.largura / capa.altura <= 0.8 : false
  const coracoes = totalCoracoes(capa.id)
  return (
    <button type="button" className={`sh-capa${primeira ? ' sh-capa--primeira' : ''}`} onClick={() => abrirShorts(capa.id)} aria-label={`Abrir Short: ${capa.trecho}`}>
      <span className="sh-capa-fundo" style={{ backgroundImage: `url("${src}")` }} />
      <img className={`sh-capa-img${retrato ? '' : ' sh-contem'}`} src={src} alt="" loading="lazy" />
      {capa.prova && <span className="sh-capa-prova">{[capa.prova, capa.ano || ''].join(' ').trim()}</span>}
      <span className="sh-capa-play"><IconeSh nome="play" /></span>
      <span className="sh-capa-pe">
        <span className="sh-capa-tema">{nomeTema(capa.tema)}</span>
        <span className="sh-capa-trecho">{capa.trecho}</span>
        {coracoes > 0 && <span className="sh-capa-meta"><IconeSh nome="coracaoCheio" /> {coracoes}</span>}
      </span>
    </button>
  )
}

/** A prateleira da Início. */
export function PrateleiraShorts() {
  const capas = usarCapas(10)
  const trilho = useRef<HTMLDivElement>(null)
  if (capas && !capas.length) return null
  const rolar = (d: number) => trilho.current?.scrollBy({ left: d * 420, behavior: 'smooth' })
  return (
    <section className="sh-prateleira" aria-labelledby="sh-prateleira-titulo">
      {/* Cabeçalho numa linha só (Tales, 26/11/2026): as capas clicáveis são a primeira coisa que chama o olho. */}
      <div className="sh-prateleira-cabeca">
        <h2 id="sh-prateleira-titulo"><SimboloShorts tamanho={22} /> Shorts <span className="sh-selo-novo">Novo</span></h2>
        <p className="sh-prateleira-apoio">Questões rápidas: toque e deslize</p>
        <button type="button" className="sh-prateleira-ver" onClick={() => abrirShorts(capas?.[0]?.id ?? null)}>Assistir <IconeSh nome="play" /></button>
      </div>
      <div className="sh-trilho-moldura">
        <button type="button" className="sh-trilho-seta sh-trilho-seta--esq" onClick={() => rolar(-1)} aria-label="Voltar"><IconeSh nome="esq" /></button>
        <div className="sh-trilho" ref={trilho}>
          {capas ? capas.map((c, i) => <Capa key={c.id} capa={c} primeira={i === 0} />) : Array.from({ length: 5 }, (_, i) => <span key={i} className="sh-capa-carregando" />)}
        </div>
        <button type="button" className="sh-trilho-seta sh-trilho-seta--dir" onClick={() => rolar(1)} aria-label="Avançar"><IconeSh nome="dir" /></button>
      </div>
    </section>
  )
}

function textoCota(assinante: boolean, logado: boolean) {
  if (assinante) return <><b>Sem limite</b> na sua assinatura</>
  if (!logado) return <><b>Veja grátis</b> · responda com a conta</>
  return <><b>{LIMITE_GRATIS_SHORTS} grátis</b> por dia</>
}

/** O retângulo em pé do Treinar. */
export function CartaoShortsVertical() {
  const capas = usarCapas(1)
  const { sessao } = usarConta()
  const assinante = usarAssinante(sessao)
  const capa = capas?.[0]
  if (capas && !capa) return null
  const src = capa ? urlImagem(capa.arquivo) : null
  return (
    <button type="button" className="sh-vertical" onClick={() => abrirShorts(capa?.id ?? null)} aria-label="Abrir os Shorts: treino rápido">
      {src && <span className="sh-capa-fundo" style={{ backgroundImage: `url("${src}")` }} />}
      {src && <img className="sh-capa-img" src={src} alt="" />}
      <span className="sh-vertical-topo">
        <span className="sh-vertical-marca"><SimboloShorts tamanho={24} />Shorts</span>
        {capa?.prova && <span className="sh-capa-prova" style={{ position: 'static' }}>{[capa.prova, capa.ano || ''].join(' ').trim()}</span>}
      </span>
      <span className="sh-vertical-play"><IconeSh nome="play" /></span>
      <span className="sh-vertical-pe">
        <span className="sh-vertical-titulo">Treino rápido</span>
        <span className="sh-vertical-texto">Uma questão por tela. Toque na resposta, leia o porquê e deslize.</span>
        <span className="sh-vertical-cota">{textoCota(assinante, !!sessao)}</span>
      </span>
    </button>
  )
}

/** O quadradinho "Faça Shorts" ao lado de "Continue sua jornada". */
export function QuadradoShorts({ aoIr }: { aoIr?: () => void }) {
  const capas = usarCapas(1)
  const { sessao } = usarConta()
  const assinante = usarAssinante(sessao)
  const capa = capas?.[0]
  return (
    <button type="button" className="sh-quadrado" onClick={() => { aoIr?.(); abrirShorts(capa?.id ?? null) }} aria-label="Faça Shorts: questões rápidas, uma por tela">
      {capa && <img className="sh-quadrado-img" src={urlImagem(capa.arquivo)} alt="" loading="lazy" />}
      <span className="sh-quadrado-play"><IconeSh nome="play" /></span>
      <span className="sh-quadrado-textos">
        <small>Novo</small>
        <strong>Faça Shorts</strong>
        <span className="sh-quadrado-apoio">{assinante ? 'Questões rápidas, sem limite' : sessao ? `${LIMITE_GRATIS_SHORTS} grátis por dia` : 'Questões rápidas'}</span>
      </span>
    </button>
  )
}
