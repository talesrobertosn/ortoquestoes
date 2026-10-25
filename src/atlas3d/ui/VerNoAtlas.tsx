import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { href, navegar, usarRota } from '../../util/rotas'
import { Icone } from '../../componentes/Icone'
import { corDaArea } from '../../dados/coresAreas'
import { carregarVinculos, LISTA_FICHAS, type Ficha } from '../dados/fichas'
import '../../estilos/componentes/VerNoAtlas.css'

/** Ossos da linha média (sem lado no id); nos demais, o atlas abre o lado direito. */
const LINHA_MEDIA = /^(sacrum|coccyx|atlas_c1|axis_c2|vertebra_)/
/** Região → área do acervo (cor), sem importar o módulo de regiões, que traz o motor 3D. */
const AREA_DA_REGIAO: Record<string, string> = { ombro: 'ombro-cotovelo', cotovelo: 'ombro-cotovelo', 'punho-mao': 'mao', coluna: 'coluna', 'pelve-quadril': 'quadril', joelho: 'joelho', 'tornozelo-pe': 'pe-tornozelo' }
const REPRESENTANTE: Record<string, string> = { 'mao-ossos': 'third_metacarpal_bone', 'mediope-antepe': 'navicular_bone' }

export function destinoNoAtlas(f: Ficha) {
  const base = REPRESENTANTE[f.chave] ?? f.ossos?.[0] ?? ''
  const id = LINHA_MEDIA.test(base) ? base : `${base}_r`
  return `/atlas/${f.regiao}?e=${id}${f.faixa ? `&f=${f.faixa}` : ''}`
}

/** Questão → ficha do atlas: primeiro a de anatomia (o termo aparece na questão), depois a de lesão. */
let indice: Promise<Map<string, Ficha>> | null = null
function fichaDaQuestao(id: string) {
  indice ??= carregarVinculos().then((v) => {
    const mapa = new Map<string, Ficha>()
    for (const tipo of ['a', 'l'] as const) for (const f of LISTA_FICHAS) for (const q of v[f.chave]?.[tipo] ?? []) if (!mapa.has(q)) mapa.set(q, f)
    return mapa
  })
  return indice.then((m) => m.get(id) ?? null)
}

const GIRO_MS = 620
const semMovimento = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Convite para o Atlas 3D no fim da questão (25/10/2026), irmão do livro da Biblioteca: um osso em
 * pixel art que flutua e gira devagar; no clique ele dá uma volta inteira e abre o atlas já focado
 * na estrutura da questão, com as classificações e as questões de anatomia. Sem ficha ligada, não aparece.
 */
export function VerNoAtlas({ questao }: { questao: string }) {
  const [ficha, definirFicha] = useState<Ficha | null | undefined>(undefined)
  const [girando, definirGirando] = useState(false)
  const relogio = useRef<number | undefined>(undefined)
  const dentroDoAtlas = usarRota().segmentos[0] === 'atlas'
  useEffect(() => {
    let vivo = true
    definirFicha(undefined)
    fichaDaQuestao(questao).then((f) => vivo && definirFicha(f)).catch(() => vivo && definirFicha(null))
    return () => { vivo = false }
  }, [questao])
  useEffect(() => () => window.clearTimeout(relogio.current), [])
  if (!ficha || dentroDoAtlas) return null // dentro do atlas, a questão já está ao lado do modelo
  const destino = destinoNoAtlas(ficha)
  const area = AREA_DA_REGIAO[ficha.regiao] ?? 'trauma'
  const abrir = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || semMovimento()) return
    e.preventDefault()
    if (girando) return
    definirGirando(true)
    relogio.current = window.setTimeout(() => navegar(destino), GIRO_MS)
  }
  return (
    <aside className={`va-convite${girando ? ' va-convite--girando' : ''}`} style={{ ['--va-area' as string]: corDaArea(area) }} aria-label="Ver esta estrutura no Atlas 3D">
      <a className="va-convite__palco" href={href(destino)} onClick={abrir} tabIndex={-1} aria-hidden="true">
        <span className="va-convite__flutua"><span className="va-osso"><span className="va-osso__ponta va-osso__ponta--a" /><span className="va-osso__corpo" /><span className="va-osso__ponta va-osso__ponta--b" /></span></span>
        <span className="va-convite__chao" />
        <span className="va-convite__eixo">3D</span>
      </a>
      <div className="va-convite__texto">
        <span className="va-convite__selo"><Icone nome="cubo" tamanho={14} />Atlas 3D <b>Beta</b></span>
        <h3 className="va-convite__titulo">{ficha.nome} em 3D</h3>
        <p className="va-convite__frase">Gire o osso, veja as classificações e responda as questões de anatomia dessa estrutura.</p>
        <a className="botao va-convite__botao" href={href(destino)} onClick={abrir}><Icone nome="cubo" tamanho={16} /> Ver no Atlas 3D</a>
      </div>
    </aside>
  )
}
