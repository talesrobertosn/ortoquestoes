import type { CSSProperties, ReactNode } from 'react'
import { recurso } from '../config'
import '@fontsource/cinzel/latin-700.css'
import '@fontsource/cinzel/latin-900.css'

/**
 * Top 3 do ranking das questões em HD-2D (14/10/2026), na linha do Octopath Traveler II:
 * pixel art em camadas (scripts/cenarios/salao_campeoes.py) e, por cima, luz de vitral,
 * desfoque de profundidade, brilho e micromovimentos (velas, estandartes, poeira, troféus).
 * Nomes, posições e totais ficam em HTML, nas placas dos pedestais.
 */
export interface LugarSalao { posicao: number; nome: string; total: string; rotuloTotal: string; ehVoce?: boolean; extra?: ReactNode }

// Coordenadas da arte (320×240), as mesmas do script.
const W = 320, H = 240
const x = (v: number) => `${(v / W) * 100}%`
const y = (v: number) => `${(v / H) * 100}%`
const caixa = (x0: number, y0: number, w: number, h: number): CSSProperties => ({ left: x(x0), top: y(y0), width: x(w), height: y(h) })

const PLACA: Record<number, CSSProperties> = { 1: caixa(131, 119, 58, 74), 2: caixa(65, 139, 58, 54), 3: caixa(197, 150, 58, 44) }
const TROFEU: Record<number, CSSProperties> = { 1: caixa(137, 54, 46, 54), 2: caixa(75.5, 85, 37, 43), 3: caixa(207.5, 97, 37, 43) }
const LUGAR = ['', '1º lugar', '2º lugar', '3º lugar']

/** Poeira dourada e brasas, com posições fixas para não mudar a cada render. */
const POEIRA = Array.from({ length: 34 }, (_, i) => ({ l: 8 + ((i * 37.7) % 84), t: 6 + ((i * 53.3) % 70), d: 7 + (i % 5) * 1.6, a: -((i * 1.37) % 9), s: 1 + (i % 3) }))
const BRASAS = Array.from({ length: 12 }, (_, i) => ({ l: i % 2 ? 87.4 : 10.6, d: 2.2 + (i % 4) * 0.5, a: -((i * 0.61) % 3), dx: ((i * 7) % 9) - 4 }))

function Fogo({ cx }: { cx: number }) {
  return <span className="sc__fogo" style={caixa(cx - 11, 145, 22, 30)} aria-hidden="true">
    {[0, 1, 2].map((k) => <img key={k} src={recurso(`ranking/salao/fogo-${k}.png`)} alt="" draggable={false} style={{ animationDelay: `${-k * 0.12}s` }} />)}
  </span>
}

export function SalaoCampeoes({ lugares, titulo, subtitulo, chamada }: { lugares: LugarSalao[]; titulo: string; subtitulo: string; chamada?: ReactNode }) {
  const img = (nome: string) => recurso(`ranking/salao/${nome}.png`)
  return (
    <section className="sc" aria-labelledby="sc-titulo">
      <header className="sc__cabeca">
        <p className="sc__selo">Salão dos Campeões</p>
        <h2 id="sc-titulo" className="sc__titulo">{titulo}</h2>
        <p className="sc__sub">{subtitulo}</p>
      </header>
      <div className="sc__corpo">
      <div className="sc__janela">
        <div className="sc__mundo">
          <img className="sc__camada sc__fundo" src={img('fundo')} alt="" draggable={false} />
          <img className="sc__camada sc__vitral" src={img('vitral-luz')} alt="" draggable={false} aria-hidden="true" />
          <span className="sc__raios" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          <img className="sc__estandarte" style={caixa(84, 8, 24, 74)} src={img('estandarte-esq')} alt="" draggable={false} />
          <img className="sc__estandarte sc__estandarte--dir" style={caixa(212, 8, 24, 74)} src={img('estandarte-dir')} alt="" draggable={false} />
          <img className="sc__camada sc__palco" src={img('palco')} alt="" draggable={false} />
          <span className="sc__foco" aria-hidden="true" />
          <Fogo cx={34} /><Fogo cx={286} />
          <span className="sc__calor sc__calor--esq" aria-hidden="true" /><span className="sc__calor sc__calor--dir" aria-hidden="true" />
          {[1, 2, 3].map((p) => (
            <span key={p} className={`sc__trofeu sc__trofeu--${p}`} style={TROFEU[p]} aria-hidden="true">
              <img src={img(`trofeu-${p}`)} alt="" draggable={false} />
              <i className="sc__cintila" /><i className="sc__cintila sc__cintila--b" />
            </span>
          ))}
          <span className="sc__particulas" aria-hidden="true">
            {POEIRA.map((p, i) => <i key={i} className="sc__poeira" style={{ left: `${p.l}%`, top: `${p.t}%`, width: p.s * 2, height: p.s * 2, animationDuration: `${p.d}s`, animationDelay: `${p.a}s` }} />)}
            {BRASAS.map((b, i) => <i key={`b${i}`} className="sc__brasa" style={{ left: `${b.l}%`, animationDuration: `${b.d}s`, animationDelay: `${b.a}s`, ['--dx' as string]: `${b.dx}px` }} />)}
          </span>
          <img className="sc__camada sc__frente" src={img('frente')} alt="" draggable={false} />
          <span className="sc__grade" aria-hidden="true" />
          {/* nos pedestais, só o número grande do lugar: nome e total ficam nos cartões, legíveis em qualquer tela */}
          <ol className="sc__placas" aria-hidden="true">
            {lugares.map((l) => (
              <li key={l.posicao} className={`sc__placa sc__placa--${l.posicao}${l.ehVoce ? ' sc__placa--voce' : ''}`} style={PLACA[l.posicao]}>
                <span className="sc__numero">{l.posicao}º</span>
                <span className="sc__lugar">{LUGAR[l.posicao].replace(/^\dº /, '')}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <ol className="sc__lista" aria-label="Três primeiros colocados">
        {[...lugares].sort((a, b) => a.posicao - b.posicao).map((l) => (
          <li key={l.posicao} className={`sc__cartao sc__cartao--${l.posicao}${l.ehVoce ? ' sc__cartao--voce' : ''}`}>
            <span className="sc__medalha" aria-label={LUGAR[l.posicao]}><img src={img(`trofeu-${l.posicao}`)} alt="" draggable={false} /></span>
            <span className="sc__quem">
              <span className="sc__pos">{LUGAR[l.posicao]}</span>
              <strong className="sc__nome">{l.nome}{l.ehVoce && <span className="sc__voce">você</span>}</strong>
              {l.extra && <span className="sc__selos">{l.extra}</span>}
            </span>
            <span className="sc__total"><b className="numerico">{l.total}</b><small>{l.rotuloTotal}</small></span>
          </li>
        ))}
      </ol>
      </div>
      {chamada && <p className="sc__chamada">{chamada}</p>}
    </section>
  )
}
