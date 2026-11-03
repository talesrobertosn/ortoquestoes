import { recurso } from '../../config'
import { Icone } from '../Icone'
import { movimento, type LinhaRanking } from './regras'

/** A chama pequena de quem subiu forte (pixel art, 6 quadros; parada com "menos movimento"). */
export function Chama({ tamanho = 16 }: { tamanho?: 16 | 24 }) {
  return <span className={`cem-chama cem-chama--${tamanho}`} aria-hidden="true" style={{ backgroundImage: `url(${recurso(`ranking/cem/chama-${tamanho}.png`)})` }} />
}

/**
 * O movimento desde o último dia registrado (igual em todos os aparelhos): seta e número, "=", "novo" ou a chama.
 * Texto para o leitor de tela e no title; a cor nunca é a única pista.
 */
export function MovimentoSelo({ linha }: { linha: LinhaRanking }) {
  const m = movimento(linha)
  if (m.tipo === 'sem-historico') return null
  if (m.tipo === 'novo') return <span className="cem-mov cem-mov--novo" title={m.descricao}>novo<span className="so-leitor">: {m.descricao}</span></span>
  if (m.tipo === 'igual') return <span className="cem-mov cem-mov--igual" title={m.descricao}><span aria-hidden="true">=</span><span className="so-leitor">{m.descricao}</span></span>
  return <span className={`cem-mov cem-mov--${m.tipo}${m.fogo ? ' cem-mov--fogo' : ''}`} title={m.descricao}>
    <span aria-hidden="true" className="cem-mov__valor">{m.quantidade > 0 && <><Icone nome={m.tipo === 'subiu' ? 'cima' : 'baixo'} tamanho={13} />{m.quantidade}</>}{m.fogo && <Chama />}</span>
    <span className="so-leitor">{m.descricao}</span>
  </span>
}
