import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { recurso } from '../../config'
import { usarPeriodo, type Periodo } from '../../estado/aparencia'
import { gravar, ler } from '../../estado/armazenamento'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import { Mascote } from '../mascote/Mascote'
import { fantasiaDoMes, type IdComportamento } from '../mascote/comportamentos'
import { LUGARES, imagemLugar, type Caixa, type IdLugar } from './lugares'
import './Vila.css'

/**
 * O topo pintado das páginas (a Vila do Orto, 30/10/2026). O cenário do lugar com a luz da hora do dia (ou a
 * escolhida em Minha conta › Aparência); por cima, vivos: nuvens e sol ou estrelas e vaga-lumes (lá fora), poeira
 * na luz e brasas (lá dentro), às vezes chuva, o mascote fazendo algo daquele lugar e um segredo para achar. As
 * placas levam aos lugares vizinhos e ao mapa. Tudo é decorativo (aria-hidden), menos as placas e o segredo.
 * Animações param fora da tela e com "menos animação".
 */
const CHAVE_VISITAS = 'vila:visitados'
const CHAVE_SEGREDOS = 'vila:segredos'
const CHAVE_ULTIMO = 'vila:ultimo'
/** Neve de 15 de dezembro a 6 de janeiro. */
const natal = (d = new Date()) => (d.getMonth() === 11 && d.getDate() >= 15) || (d.getMonth() === 0 && d.getDate() <= 6)
/** Neblina de madrugada (da meia-noite às 5h, hora de Brasília). */
const madrugada = (d = new Date()) => Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' }).format(d)) < 5
const HALLOWEEN: IdComportamento[] = ['foice', 'abobora', 'velas', 'morcegos']

export const lugaresVisitados = (): IdLugar[] => ler<IdLugar[]>(CHAVE_VISITAS, [])
export const segredosDaVila = (): IdLugar[] => ler<IdLugar[]>(CHAVE_SEGREDOS, [])

/** Posição e tamanho em porcentagem do palco, a partir de pixels da arte (480 x 160). */
export const naArte = ({ x, y, w, h }: Caixa): CSSProperties => ({ left: `${(x / 480) * 100}%`, top: `${(y / 160) * 100}%`, width: `${(w / 480) * 100}%`, height: `${(h / 160) * 100}%` })

export function CenaPagina({ id }: { id: IdLugar }) {
  const lugar = LUGARES[id]
  const periodo = usarPeriodo()
  const raiz = useRef<HTMLElement>(null)
  const [visivel, definirVisivel] = useState(true)
  const [fala, definirFala] = useState<string | null>(null)
  const [achou, definirAchou] = useState(() => segredosDaVila().includes(id))
  // Chuva de vez em quando, só lá fora e nunca no mesmo lugar duas visitas seguidas.
  const chuva = useMemo(() => lugar.exterior && periodo !== 'noite' && !natal() && Math.random() < 0.14, [lugar.exterior, periodo])

  useEffect(() => {
    const vistos = lugaresVisitados()
    if (!vistos.includes(id)) gravar(CHAVE_VISITAS, [...vistos, id])
    definirAchou(segredosDaVila().includes(id))
    definirFala(null)
    // O mascote lembra de onde a pessoa veio ("Revisão ficou para trás. Bora subir no ranking?"), uma vez por chegada.
    const antes = ler<IdLugar | null>(CHAVE_ULTIMO, null)
    gravar(CHAVE_ULTIMO, id)
    if (!antes || antes === id || !LUGARES[antes]) return
    const t = window.setTimeout(() => definirFala(`${LUGARES[antes].pagina} ficou para trás. ${LUGARES[id].chegada}`), 1300)
    return () => window.clearTimeout(t)
  }, [id])

  // Fora da tela, nada se mexe (leve no celular).
  useEffect(() => {
    const el = raiz.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([e]) => definirVisivel(e.isIntersecting), { rootMargin: '80px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!fala) return
    const t = window.setTimeout(() => definirFala(null), 6500)
    return () => window.clearTimeout(t)
  }, [fala])

  const acharSegredo = () => {
    definirFala(lugar.segredo.fala)
    const lista = segredosDaVila()
    if (!lista.includes(id)) { gravar(CHAVE_SEGREDOS, [...lista, id]); definirAchou(true) }
  }

  const fantasia = fantasiaDoMes()
  const comportamento = fantasia === 'halloween' ? HALLOWEEN[id.length % HALLOWEEN.length] : lugar.mascote
  const img = (l: 960 | 1440) => recurso(imagemLugar(id, periodo, l))
  const vizinhos = lugar.saidas.slice(0, 2).map((s) => LUGARES[s])

  return (
    <section ref={raiz} className={`vl vl--${periodo} vl--${lugar.exterior ? 'fora' : 'dentro'}${visivel ? '' : ' vl--parado'}`} aria-label={`Cenário de ${lugar.pagina}`}>
      <div className="vl-cena">
        <div className="vl-palco" key={`${id}-${periodo}`}>
          <img className="vl-palco__fundo" src={img(1440)} srcSet={`${img(960)} 960w, ${img(1440)} 1440w`} sizes="(max-width: 60rem) 150vw, 72rem"
            width={1440} height={480} alt="" decoding="async" fetchPriority="high" />
          <Ceu periodo={periodo} exterior={lugar.exterior} chuva={chuva} />
          <button type="button" className={`vl-segredo${achou ? ' vl-segredo--achado' : ''}`} style={naArte(lugar.segredo)} onClick={acharSegredo}
            aria-label={achou ? `Segredo de ${lugar.pagina} já encontrado. Tocar de novo` : `Um segredo escondido no cenário de ${lugar.pagina}`}>
            <span className="vl-segredo__brilho" aria-hidden="true" />
          </button>
          <Mascote key={comportamento} className="vl-mascote" comportamento={comportamento} falar={false} style={naArte({ x: 334, y: 94, w: 42, h: 56 })} />
          {fala && <span className="vl-balao" role="status" style={{ left: `${(355 / 480) * 100}%`, top: `${(92 / 160) * 100}%` }}>{fala}</span>}
        </div>
      </div>
      <nav className="vl-placas" aria-label="Caminhos daqui">
        {vizinhos.map((v) => (
          <a key={v.id} className="vl-placa" href={href(v.destino)}><span>{v.pagina}</span><Icone nome="direita" tamanho={14} /></a>
        ))}
        <a className="vl-placa vl-placa--mapa" href={href('/mapa')}><Icone nome="mapa" tamanho={15} /><span>Mapa</span></a>
      </nav>
    </section>
  )
}

/** Céu vivo por cima da pintura: nuvens, raio de sol, estrelas e vaga-lumes; lá dentro, poeira e brasas. */
function Ceu({ periodo, exterior, chuva }: { periodo: Periodo; exterior: boolean; chuva: boolean }) {
  const pontos = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 37 + 9) % 96 + 2, y: (i * 53 + 5) % 60 + 4, t: 5 + (i % 5) * 1.3, d: -((i * 1.9) % 7) })), [])
  if (exterior) {
    return (
      <span className="vl-ceu" aria-hidden="true">
        {periodo !== 'noite' && <>
          <i className="vl-nuvem" style={{ '--y': '8%', '--t': '70s', '--d': '-12s', '--e': 1 } as CSSProperties} />
          <i className="vl-nuvem" style={{ '--y': '20%', '--t': '95s', '--d': '-55s', '--e': 0.7 } as CSSProperties} />
          <i className="vl-nuvem" style={{ '--y': '3%', '--t': '120s', '--d': '-80s', '--e': 0.85 } as CSSProperties} />
          <i className="vl-sol" />
        </>}
        {periodo === 'noite' && <>
          {pontos.slice(0, 10).map((p, i) => <i key={i} className="vl-estrela" style={{ left: `${p.x}%`, top: `${p.y * 0.5}%`, '--t': `${p.t / 2}s`, '--d': `${p.d}s` } as CSSProperties} />)}
          {pontos.slice(4).map((p, i) => <i key={`v${i}`} className="vl-vagalume" style={{ left: `${p.x}%`, top: `${40 + p.y * 0.8}%`, '--t': `${p.t}s`, '--d': `${p.d}s` } as CSSProperties} />)}
        </>}
        {chuva && <i className="vl-chuva" />}
        {natal() && pontos.map((p, i) => <i key={`n${i}`} className="vl-neve" style={{ left: `${p.x}%`, '--t': `${p.t + 3}s`, '--d': `${p.d}s` } as CSSProperties} />)}
        {periodo === 'noite' && madrugada() && <i className="vl-neblina" />}
      </span>
    )
  }
  return (
    <span className="vl-ceu" aria-hidden="true">
      {periodo !== 'noite' && <i className="vl-feixe" />}
      {pontos.map((p, i) => <i key={i} className={periodo === 'noite' ? 'vl-brasa' : 'vl-poeira'} style={{ left: `${p.x}%`, top: `${p.y + 20}%`, '--t': `${p.t}s`, '--d': `${p.d}s` } as CSSProperties} />)}
    </span>
  )
}
