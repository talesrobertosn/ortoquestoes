import { iniciais, type Ascensao } from './regras'
import { Chama } from './Movimento'

/**
 * Escadaria da Ascensão (antes "Subindo rápido"): as três pessoas que mais subiram, uma em cada patamar, da
 * esquerda (degrau mais baixo) para a direita. O salto vem da comparação com o último dia registrado (ou da semana,
 * quando o dia não mexeu); a chama só acende com a regra real (3+ posições no dia ou 5+ na semana).
 */
export function Escadaria({ subidas }: { subidas: Ascensao[] }) {
  if (!subidas.length) return null
  return <section className="cem-escada" aria-labelledby="cem-escada-t">
    <header className="cem-escada__cabeca">
      <p className="cem-rotulo">Escadaria da Ascensão</p>
      <h2 id="cem-escada-t">Quem mais subiu</h2>
      <p className="cem-escada__sub">Posições ganhas desde o último dia registrado ou na semana.</p>
    </header>
    <ol className="cem-escada__degraus">
      {subidas.map((s, i) => <li key={s.linha.posicao} className={`cem-degrau cem-degrau--${i + 1}${s.linha.eh_voce ? ' cem-degrau--voce' : ''}`}>
        <span className="cem-degrau__salto">
          <b className="numerico">+{s.salto}</b>
          <small>{s.salto === 1 ? 'posição' : 'posições'} {s.quando}</small>
        </span>
        <span className="cem-degrau__quem">
          <span className="cem-degrau__avatar" aria-hidden="true">{iniciais(s.linha.apelido)}</span>
          <span>
            <strong className="cem-degrau__nome">{s.linha.apelido}{s.linha.eh_voce && <span className="cem-voce">você</span>}</strong>
            <span className="cem-degrau__rota numerico"><span className="so-leitor">De </span>#{s.de} <span aria-hidden="true">→</span><span className="so-leitor"> para </span> <b>#{s.para}</b></span>
          </span>
        </span>
        {s.fogo && <span className="cem-degrau__fogo" title="Em chamas"><Chama tamanho={24} /><span className="so-leitor">Em chamas</span></span>}
      </li>)}
    </ol>
  </section>
}
