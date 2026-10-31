import { useState } from 'react'
import { CENAS, FRASES_GERAIS, duracaoCena } from '../../componentes/espera/cenas'
import { GatoEspera } from '../../componentes/espera/GatoEspera'
import { EsperaPixel } from '../../componentes/EsperaPixel'
import '../../estilos/componentes/EsperaPixel.css'

/**
 * Painel de prévia do Gato Aventureiro (só em desenvolvimento: #/dev/gato; fora do pacote publicado).
 * Escolher a cena, tocar/pausar, reiniciar, quadro a quadro, velocidade, fundo claro/escuro, tamanho real e ampliado,
 * frases e a espera completa simulando um carregamento curto e um longo.
 */
export default function PreviaGato() {
  const [cena, definirCena] = useState(CENAS[0].id)
  const [pausado, definirPausado] = useState(false)
  const [quadro, definirQuadro] = useState<number | undefined>(undefined)
  const [velocidade, definirVelocidade] = useState(1)
  const [escuro, definirEscuro] = useState(false)
  const [reiniciar, definirReiniciar] = useState(0)
  const [frase, definirFrase] = useState('')
  const [espera, definirEspera] = useState<null | number>(null)
  const simular = (ms: number) => { definirEspera(ms); window.setTimeout(() => definirEspera(null), ms) }
  const c = CENAS.find((x) => x.id === cena)!
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 16, padding: 16, maxWidth: 1100, margin: '0 auto', overflowWrap: 'anywhere' }}>
      <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 2rem)', textWrap: 'balance' }}>Prévia do Gato Aventureiro <small>(desenvolvimento)</small></h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <select value={cena} onChange={(e) => { definirCena(e.target.value); definirReiniciar((n) => n + 1) }}>{CENAS.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.rara ? ' (rara)' : ''}</option>)}</select>
        <button onClick={() => definirPausado(!pausado)}>{pausado ? 'Tocar' : 'Pausar'}</button>
        <button onClick={() => definirReiniciar((n) => n + 1)}>Reiniciar</button>
        <button onClick={() => definirQuadro(((quadro ?? -1) + 1) % 8)}>Quadro a quadro ({quadro ?? '-'})</button>
        <button onClick={() => definirQuadro(undefined)}>Soltar quadro</button>
        <label>Velocidade <select value={velocidade} onChange={(e) => definirVelocidade(Number(e.target.value))}>{[0.25, 0.5, 1, 2].map((v) => <option key={v} value={v}>{v}x</option>)}</select></label>
        <button onClick={() => definirEscuro(!escuro)}>Fundo {escuro ? 'claro' : 'escuro'}</button>
        <button onClick={() => simular(400)}>Espera curta (0,4 s)</button>
        <button onClick={() => simular(15000)}>Espera longa (15 s)</button>
      </div>
      <p>{c.nome} · {(duracaoCena(c) / 1000).toFixed(1)} s · trechos: {c.trechos.map((t) => t.linha).join(' → ')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'end', padding: 24, borderRadius: 12, overflowX: 'auto', background: escuro ? '#171e1d' : '#f1f3f2', color: escuro ? '#eee' : '#111' }}>
        <GatoEspera key={reiniciar} escala={1} controle={{ cena, pausado, quadroFixo: quadro, velocidade, reiniciar }} aoMudarFrase={definirFrase} />
        <GatoEspera key={reiniciar + 'g'} escala={2} controle={{ cena, pausado, quadroFixo: quadro, velocidade, reiniciar }} />
        <GatoEspera key={reiniciar + 'G'} escala={4} controle={{ cena, pausado, quadroFixo: quadro, velocidade, reiniciar }} />
      </div>
      <p>Frase: {frase}</p>
      <details><summary>Todas as frases</summary><ul>{[...CENAS.flatMap((x) => x.frases), ...FRASES_GERAIS].map((f, i) => <li key={i}>{f}</li>)}</ul></details>
      {espera !== null && <div style={{ border: '1px dashed', padding: 8 }}><EsperaPixel rotulo="Simulando" /></div>}
    </div>
  )
}
