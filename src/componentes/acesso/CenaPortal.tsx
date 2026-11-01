import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { recurso } from '../../config'
import { usarTema } from '../../estado/tema'
import { Mascote } from '../mascote/Mascote'
import { luzNoBicho, type Luz } from '../mascote/luz'
import { EVENTO_RESPOSTA_ACESSO } from './QuestaoAcesso'

/*
 * O salão de leitura do castelo, o plano de abertura da tela de entrar (01/11/2026; scripts/gerar_cena_portal.py).
 * De dia (tema claro) é o amanhecer em pedra clara; no tema escuro, a noite das tochas. O esqueleto de jaleco é o
 * anfitrião: em pé junto ao atril, acena de vez em quando e comemora quando a pessoa acerta a questão da ficha. A luz
 * das tochas e da janela cai nele (componentes/mascote/luz.ts). Os textos e o painel de entrar (inteiro, com margem,
 * à direita) são HTML por cima da cena; no celular, a cena vem primeiro e o título e o painel descem.
 */
const ARTE = { w: 480, h: 160, movelX0: 150, movelX1: 446 }
const lugar = (x: number, y: number, w: number, h: number) => ({
  '--l': `${(x / ARTE.w) * 100}%`, '--lm': `${((x - ARTE.movelX0) / (ARTE.movelX1 - ARTE.movelX0)) * 100}%`,
  '--t': `${(y / ARTE.h) * 100}%`, '--w': `${(w / ARTE.w) * 100}%`, '--wm': `${(w / (ARTE.movelX1 - ARTE.movelX0)) * 100}%`, '--h': `${(h / ARTE.h) * 100}%`,
}) as CSSProperties
/** As chamas pintadas na cena (pontos da arte): respiram de leve por cima da pintura. */
export const CHAMAS_PORTAL: { x: number; y: number; r: number }[] = [{ x: 243.5, y: 61.5, r: 10 }, { x: 336.5, y: 61.5, r: 10 }, { x: 151.5, y: 107.5, r: 8 }]
/** O esqueleto: o quadro de 64 x 85 pixels de arte (o desenho dentro dele tem uns 35 x 69: o atril chega na cintura,
 * a janela e as estantes ficam bem mais altas que ele), pés em y = 152, centrado em x = 228. */
const ESQUELETO = { x: 196, y: 67, w: 64, h: 85 }

/** `texto`: selo, título e frase, no canto calmo; `children`: o painel de entrar, inteiro dentro da cena, à direita. */
export function CenaPortal({ texto, children }: { texto: ReactNode; children: ReactNode }) {
  const { tema } = usarTema()
  const hora = tema === 'escuro' ? 'noite' : 'dia'
  const [festa, definirFesta] = useState(0)
  useEffect(() => {
    const ouvir = (e: Event) => { if ((e as CustomEvent<{ acertou: boolean }>).detail?.acertou) definirFesta((n) => n + 1) }
    window.addEventListener(EVENTO_RESPOSTA_ACESSO, ouvir)
    return () => window.removeEventListener(EVENTO_RESPOSTA_ACESSO, ouvir)
  }, [])
  const arte = (sufixo: string) => recurso(`pixel/paginas/portal-${hora}${sufixo}.webp`)
  const luzes: Luz[] = hora === 'noite'
    ? CHAMAS_PORTAL.map((c): Luz => ({ x: c.x, y: c.y, forca: 0.9, alcance: 170, tipo: 'fogo' }))
    : [{ x: 300, y: 0, forca: 0.6, alcance: 520, tipo: 'sol' }]
  const luz = luzNoBicho(ESQUELETO.x + ESQUELETO.w / 2, ESQUELETO.y + ESQUELETO.h / 2, luzes, hora === 'noite' ? 'noite' : 'manha')
  return (
    <section className={`pc pc--${hora}`} aria-labelledby="ac-titulo">
      <div className="pc-palco" aria-hidden="true">
        <picture>
          <source media="(max-width: 47.99rem)" srcSet={arte('-movel')} width={888} height={480} />
          <img className="pc-palco__arte" src={arte('')} srcSet={`${arte('-960')} 960w, ${arte('')} 1440w`} sizes="(max-width: 76rem) 100vw, 76rem"
            width={1440} height={480} alt="" decoding="async" fetchPriority="high" draggable={false} />
        </picture>
        {hora === 'noite' && CHAMAS_PORTAL.map((c, i) => <span key={i} className="pc-chama" style={{ ...lugar(c.x - c.r, c.y - c.r, c.r * 2, c.r * 2), '--atraso': `${-i * 1.3}s` } as CSSProperties} />)}
        <span className={`pc-esqueleto ${luz.className} bicho-sombra`} style={{ ...lugar(ESQUELETO.x, ESQUELETO.y, ESQUELETO.w, ESQUELETO.h), ...luz.style }}>
          <Mascote comportamento="acesso_jaleco" fantasia="nenhuma" falar={false} interativo={false} decorativo reacao={festa ? 'comemora2' : null} key={`festa-${festa}`} />
        </span>
      </div>
      <div className="pc-texto">{texto}</div>
      {children}
    </section>
  )
}
