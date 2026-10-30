import { useState, type CSSProperties } from 'react'
import { href } from '../../../util/rotas'
import { ler, gravar } from '../../../estado/armazenamento'

/**
 * "Treinar por tema" como uma prancha de anatomia em pergaminho (30/10/2026, pedido do Tales). O corpo desenhado a tinta
 * com uma marca em cada região; cada região tem a sua etiqueta com o nome real do tema e a porcentagem já respondida, e
 * a névoa da marca sai conforme o progresso. Os temas que não são uma região (trauma, pediatria, tumores, conceitos e
 * osteometabólicas) viram estandartes embaixo da prancha. Quem prefere lista tem o botão "Ver em lista" (fica lembrado).
 */
export interface TemaMapa { slug: string; nome: string; quantidade: number; feitas: number; destino: string }

/** Onde fica cada região no desenho (x, y no viewBox 0 0 260 420) e de que lado vai a etiqueta. */
const REGIOES: Record<string, { x: number; y: number; lado: 'e' | 'd' }> = {
  'ombro-cotovelo': { x: 92, y: 112, lado: 'e' },
  mao: { x: 60, y: 222, lado: 'e' },
  coluna: { x: 130, y: 178, lado: 'd' },
  quadril: { x: 158, y: 222, lado: 'd' },
  joelho: { x: 104, y: 312, lado: 'e' },
  'pe-tornozelo': { x: 160, y: 398, lado: 'd' },
}

const pct = (t: TemaMapa) => (t.quantidade ? Math.round((t.feitas / t.quantidade) * 100) : 0)
const rotuloPct = (t: TemaMapa) => (t.feitas > 0 ? `${Math.max(1, pct(t))}%` : 'Novo')

/** O corpo em traço de tinta, de frente, como numa prancha antiga de anatomia. */
function Corpo() {
  const tinta = '#5a3a20'
  const osso = '#efe2c2'
  const o = { stroke: tinta, strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' }
  const ossoLongo = (x1: number, y1: number, x2: number, y2: number, g = 7) => (
    <g key={`${x1}-${y1}-${x2}`}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={tinta} strokeWidth={g + 3.5} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={osso} strokeWidth={g} strokeLinecap="round" />
    </g>
  )
  return (
    <g>
      {/* crânio */}
      <path d="M130 14 C104 14 94 34 96 52 C97 64 104 70 112 72 L112 80 L148 80 L148 72 C156 70 163 64 164 52 C166 34 156 14 130 14 Z" {...o} fill={osso} />
      <ellipse cx={119} cy={46} rx={7} ry={8} fill={tinta} /><ellipse cx={141} cy={46} rx={7} ry={8} fill={tinta} />
      <path d="M130 56 l-3 6 h6 Z" fill={tinta} />
      <path d="M116 72 h28 M120 72 v8 M127 72 v8 M134 72 v8 M140 72 v8" {...o} strokeWidth={2} />
      {/* coluna e costelas */}
      {Array.from({ length: 12 }, (_, k) => <rect key={k} x={125} y={84 + k * 11} width={10} height={8} rx={3} fill={osso} stroke={tinta} strokeWidth={2.2} />)}
      {Array.from({ length: 6 }, (_, k) => (
        <g key={k}>
          <path d={`M126 ${102 + k * 11} C ${104 - k} ${96 + k * 11} ${92 - k * 1.5} ${116 + k * 12} ${110 + k * 2} ${124 + k * 11}`} {...o} stroke={tinta} strokeWidth={6} />
          <path d={`M126 ${102 + k * 11} C ${104 - k} ${96 + k * 11} ${92 - k * 1.5} ${116 + k * 12} ${110 + k * 2} ${124 + k * 11}`} {...o} stroke={osso} strokeWidth={2.6} />
          <path d={`M134 ${102 + k * 11} C ${156 + k} ${96 + k * 11} ${168 + k * 1.5} ${116 + k * 12} ${150 - k * 2} ${124 + k * 11}`} {...o} stroke={tinta} strokeWidth={6} />
          <path d={`M134 ${102 + k * 11} C ${156 + k} ${96 + k * 11} ${168 + k * 1.5} ${116 + k * 12} ${150 - k * 2} ${124 + k * 11}`} {...o} stroke={osso} strokeWidth={2.6} />
        </g>
      ))}
      {ossoLongo(100, 96, 160, 96, 5)}
      {/* pelve */}
      <path d="M130 214 C112 206 96 212 98 228 C100 240 116 240 130 248 C144 240 160 240 162 228 C164 212 148 206 130 214 Z" {...o} fill={osso} />
      <circle cx={116} cy={232} r={5} fill={tinta} /><circle cx={144} cy={232} r={5} fill={tinta} />
      {/* braços e mãos */}
      {ossoLongo(98, 100, 84, 158)}{ossoLongo(84, 158, 70, 210, 6)}
      {ossoLongo(162, 100, 176, 158)}{ossoLongo(176, 158, 190, 210, 6)}
      {[-1, 0, 1, 2].map((k) => ossoLongo(68, 216, 60 + k * 5, 240, 2.6))}
      {[-1, 0, 1, 2].map((k) => ossoLongo(192, 216, 186 + k * 5, 240, 2.6))}
      {/* pernas e pés */}
      {ossoLongo(116, 242, 108, 312, 8)}{ossoLongo(108, 312, 108, 388, 7)}
      {ossoLongo(144, 242, 152, 312, 8)}{ossoLongo(152, 312, 152, 388, 7)}
      <circle cx={108} cy={312} r={6} {...o} fill={osso} /><circle cx={152} cy={312} r={6} {...o} fill={osso} />
      <path d="M108 390 l-16 10 l18 2 Z M152 390 l16 10 l-18 2 Z" {...o} fill={osso} />
    </g>
  )
}

export function MapaCorpo({ temas }: { temas: TemaMapa[] }) {
  const [lista, definirLista] = useState(() => ler<boolean>('inicio:temas-lista', false))
  const [foco, definirFoco] = useState<string | null>(null)
  const alternar = () => { definirLista((v) => { gravar('inicio:temas-lista', !v); return !v }) }
  const regionais = temas.filter((t) => REGIOES[t.slug])
  const outros = temas.filter((t) => !REGIOES[t.slug])

  return (
    <section className="hd-mapa" aria-labelledby="ip-temas-titulo">
      <header className="hd-faixa">
        <h2 id="ip-temas-titulo">Treinar por tema</h2>
        <p>Um toque monta a sessão do tema. A névoa sai conforme você passa por ele.</p>
        <button type="button" className="hd-botao hd-mapa__alternar" onClick={alternar} aria-pressed={lista}>{lista ? 'Ver no mapa do corpo' : 'Ver em lista'}</button>
      </header>

      {lista ? (
        <ul className="hd-regioes">
          {temas.map((t, i) => (
            <li key={t.slug}>
              <a className={'hd-regiao' + (t.feitas > 0 ? '' : ' hd-regiao--nova')} href={href(t.destino)} style={{ '--nevoa': `${100 - Math.max(t.feitas > 0 ? 2 : 0, pct(t))}%`, '--i': i } as CSSProperties}>
                <span className="hd-regiao__nome">{t.nome}</span>
                <span className="hd-regiao__pct numerico">{rotuloPct(t)}</span>
                <span className="hd-regiao__trilho" aria-hidden="true"><span style={{ width: `${Math.max(t.feitas > 0 ? 2 : 0, pct(t))}%` }} /></span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <div className="hd-prancha">
            <ul className="hd-prancha__etiquetas hd-prancha__etiquetas--e">
              {regionais.filter((t) => REGIOES[t.slug].lado === 'e').map((t) => <Etiqueta key={t.slug} t={t} foco={foco} definirFoco={definirFoco} />)}
            </ul>
            <svg className="hd-prancha__corpo" viewBox="0 0 260 420" role="img" aria-label="Mapa do corpo com os temas por região">
              <Corpo />
              {regionais.map((t) => {
                const r = REGIOES[t.slug]
                const p = pct(t)
                return (
                  <a key={t.slug} href={href(t.destino)} className={'hd-marca' + (foco === t.slug ? ' hd-marca--foco' : '')} onMouseEnter={() => definirFoco(t.slug)} onMouseLeave={() => definirFoco(null)}
                    onFocus={() => definirFoco(t.slug)} onBlur={() => definirFoco(null)} aria-label={`${t.nome}: ${rotuloPct(t)}. Treinar este tema`}>
                    <circle className="hd-marca__nevoa" cx={r.x} cy={r.y} r={24} style={{ opacity: 0.85 - (Math.min(100, p) / 100) * 0.75 } as CSSProperties} />
                    <circle className="hd-marca__anel" cx={r.x} cy={r.y} r={16} />
                    <circle className="hd-marca__centro" cx={r.x} cy={r.y} r={6} />
                  </a>
                )
              })}
            </svg>
            <ul className="hd-prancha__etiquetas hd-prancha__etiquetas--d">
              {regionais.filter((t) => REGIOES[t.slug].lado === 'd').map((t) => <Etiqueta key={t.slug} t={t} foco={foco} definirFoco={definirFoco} />)}
            </ul>
          </div>
          {outros.length > 0 && (
            <ul className="hd-bandeiras" aria-label="Outros temas">
              {outros.map((t) => (
                <li key={t.slug}>
                  <a href={href(t.destino)} className="hd-bandeira" style={{ '--p': `${Math.max(t.feitas > 0 ? 3 : 0, pct(t))}%` } as CSSProperties}>
                    <strong>{t.nome}</strong>
                    <span className="numerico">{rotuloPct(t)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

function Etiqueta({ t, foco, definirFoco }: { t: TemaMapa; foco: string | null; definirFoco: (s: string | null) => void }) {
  const p = Math.max(t.feitas > 0 ? 2 : 0, pct(t))
  return (
    <li>
      <a className={'hd-etiqueta' + (foco === t.slug ? ' hd-etiqueta--foco' : '')} href={href(t.destino)} onMouseEnter={() => definirFoco(t.slug)} onMouseLeave={() => definirFoco(null)}
        onFocus={() => definirFoco(t.slug)} onBlur={() => definirFoco(null)}>
        <strong>{t.nome}</strong>
        <span className="hd-etiqueta__linha"><span className="hd-etiqueta__trilho" aria-hidden="true"><span style={{ width: `${p}%` }} /></span><b className="numerico">{rotuloPct(t)}</b></span>
        <small>{t.quantidade.toLocaleString('pt-BR')} questões</small>
      </a>
    </li>
  )
}
