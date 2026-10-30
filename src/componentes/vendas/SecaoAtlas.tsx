import { useEffect, useRef, useState } from 'react'
import { BASE_ASSETS } from '../../atlas3d/config'
import { recurso } from '../../config'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import '../../estilos/componentes/SecaoAtlas.css'

/**
 * Quatro pontos do mini-atlas, posicionados na imagem da capa (atlas3d/capa-esqueleto.png, 316 × 740; o lado
 * esquerdo da imagem é o direito do esqueleto). As classificações e os links saem das fichas do atlas
 * (src/atlas3d/dados/fichas.json) e das seções dos resumos do Rockwood que elas citam.
 */
const PONTOS = [
  { chave: 'femur-proximal', nome: 'Fêmur proximal', x: 37, y: 51, atlas: '/atlas/pelve-quadril?e=femur_r&f=proximal', lesoes: 'Colo do fêmur, transtrocantérica e subtrocantérica', classificacoes: ['Garden', 'Pauwels', 'AO 31A'], resumo: { id: 'rockwood10-53-colo-femur', secao: 'classificacoes', rotulo: 'Fratura do colo do fêmur · Rockwood, cap. 53' } },
  { chave: 'umero-proximal', nome: 'Úmero proximal', x: 29, y: 21.5, atlas: '/atlas/ombro?e=humerus_r&f=proximal', lesoes: 'Fratura do úmero proximal e osteonecrose da cabeça', classificacoes: ['Neer', 'AO', 'Hertel'], resumo: { id: 'rockwood10-36-umero-proximal', secao: 'neer-ao-e-os-padroes-de-fratura', rotulo: 'Fratura do úmero proximal · Rockwood, cap. 36' } },
  { chave: 'tibia-proximal', nome: 'Tíbia proximal', x: 42.5, y: 75.5, atlas: '/atlas/joelho?e=tibia_r&f=proximal', lesoes: 'Planalto tibial e luxação do joelho', classificacoes: ['Schatzker', 'AO 41', 'Schenck'], resumo: { id: 'rockwood10-62-planalto-tibial', secao: 'classificacao-de-schatzker', rotulo: 'Fratura do planalto tibial · Rockwood, cap. 62' } },
  { chave: 'tibia-distal', nome: 'Tornozelo e pilão', x: 41, y: 92.5, atlas: '/atlas/tornozelo-pe?e=tibia_r&f=distal', lesoes: 'Fraturas do tornozelo e do pilão tibial', classificacoes: ['Danis-Weber', 'Lauge-Hansen', 'Rüedi-Allgöwer'], resumo: { id: 'rockwood10-65-tornozelo', secao: 'a-classificacao-de-lauge-hansen-e-a-de-danis-web', rotulo: 'Fraturas do tornozelo · Rockwood, cap. 65' } },
]

const CAMADAS = [
  { quem: 'Sem conta', o: 'Ossos' },
  { quem: 'Conta grátis', o: 'Ossos e músculos' },
  { quem: 'Assinante', o: 'Todas as camadas: nervos, artérias, veias, ligamentos e fáscias', pro: true },
]

/**
 * Atlas 3D na página de vendas (pedido do Tales, 30/10/2026). Um mini-atlas na própria página: a imagem do
 * esqueleto com pinos dourados; cada pino abre a ficha da região, como no atlas de verdade. Não carrega o
 * motor 3D (a página continua leve); só o mapa de questões por região, quando a seção chega perto da tela.
 */
export function SecaoAtlas() {
  const [ativo, definirAtivo] = useState(0)
  const [questoes, definirQuestoes] = useState<Record<string, number> | null>(null)
  const raiz = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    let vivo = true
    const carregar = () => fetch(`${BASE_ASSETS}questoes.json`).then((r) => (r.ok ? r.json() : {}))
      .then((v: Record<string, { l?: string[]; a?: string[] }>) => {
        if (!vivo) return
        const contas: Record<string, number> = {}
        for (const p of PONTOS) contas[p.chave] = new Set([...(v[p.chave]?.l ?? []), ...(v[p.chave]?.a ?? [])]).size
        definirQuestoes(contas)
      }).catch(() => undefined)
    if (typeof IntersectionObserver === 'undefined') { carregar(); return () => { vivo = false } }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); carregar() } }, { rootMargin: '400px 0px' })
    io.observe(el)
    return () => { vivo = false; io.disconnect() }
  }, [])

  const p = PONTOS[ativo]
  const n = questoes?.[p.chave] ?? 0

  return (
    <section ref={raiz} className="vd-secao vd-atlas" aria-labelledby="vd-titulo-atlas">
      <header className="vd-cabeca" data-revelar>
        <p className="vd-sobre">Atlas 3D · novo</p>
        <h2 id="vd-titulo-atlas">Clique no osso. <em>Veja a fratura.</em></h2>
        <p>Um esqueleto inteiro em 3D para girar, aproximar e clicar. Cada região abre as classificações de fratura que caem na prova, o trecho do resumo que as explica e as questões daquela estrutura. Experimente aqui embaixo.</p>
      </header>

      <div className="vd-atlas__palco" data-revelar>
        <div className="vd-atlas__corpo">
          <img src={recurso('atlas3d/capa-esqueleto.png')} width={316} height={740} alt="Esqueleto do Atlas 3D com quatro regiões marcadas" loading="lazy" decoding="async" draggable={false} />
          {PONTOS.map((ponto, i) => (
            <button
              key={ponto.chave} type="button"
              className={'vd-atlas__pino' + (i === ativo ? ' vd-atlas__pino--ativo' : '')}
              style={{ left: `${ponto.x}%`, top: `${ponto.y}%` }}
              aria-pressed={i === ativo}
              aria-label={ponto.nome}
              onClick={() => definirAtivo(i)}
            >{i + 1}</button>
          ))}
          <span className="vd-atlas__eixo" aria-hidden="true">3D</span>
        </div>

        <div className="vd-atlas__ficha" aria-live="polite">
          <p className="vd-atlas__dica"><Icone nome="alvo" tamanho={14} /> Toque nos números do esqueleto</p>
          <div className="vd-atlas__cartao" key={p.chave}>
            <span className="vd-atlas__regiao"><span className="px-numero">{ativo + 1}</span> {p.nome}</span>
            <p className="vd-atlas__lesoes">{p.lesoes}</p>
            <p className="vd-atlas__rotulo">Classificações que caem</p>
            <ul className="vd-atlas__chips">{p.classificacoes.map((c) => <li key={c}>{c}</li>)}</ul>
            <p className="vd-atlas__questoes">{n > 0 ? <><b className="numerico">{n}</b> questões de prova ligadas a esta região</> : 'Questões de prova ligadas a esta região'}</p>
            <a className="vd-atlas__resumo" href={href(`/resumos/${p.resumo.id}?bloco=h-${p.resumo.secao}`)}><Icone nome="livro" tamanho={15} /> <span>{p.resumo.rotulo}</span></a>
            <a className="botao botao--ouro vd-atlas__ver" href={href(p.atlas)}><Icone nome="cubo" tamanho={16} /> Ver no Atlas 3D</a>
          </div>
        </div>
      </div>

      <div className="vd-atlas__base" data-revelar>
        <ol className="vd-atlas__passos">
          <li><span className="px-numero">1</span><div><h3>Gire e aproxime</h3><p>Com o dedo ou o mouse, no celular e no computador, sem instalar nada.</p></div></li>
          <li><span className="px-numero">2</span><div><h3>Clique no osso</h3><p>A ficha abre as fraturas e as classificações daquela parte do osso.</p></div></li>
          <li><span className="px-numero">3</span><div><h3>Treine na hora</h3><p>As questões da estrutura e o trecho do resumo ficam a um toque.</p></div></li>
        </ol>
        <div className="vd-atlas__camadas">
          <p className="vd-atlas__rotulo">O que cada plano vê</p>
          <ul>{CAMADAS.map((c) => <li key={c.quem} className={c.pro ? 'vd-atlas__camada--pro' : ''}><span>{c.quem}</span><b>{c.o}</b></li>)}</ul>
          <a className="vd-link" href={href('/atlas')}>Testar o Atlas grátis agora <Icone nome="direita" tamanho={14} /></a>
        </div>
      </div>
    </section>
  )
}
