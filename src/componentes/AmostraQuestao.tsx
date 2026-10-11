import { href } from '../util/rotas'
import { Icone } from './Icone'

/**
 * Miniatura de uma questão comentada para a abertura de quem ainda não tem
 * conta: mostra o produto em vez de descrevê-lo. É a questão aprovada como
 * referência editorial (mao-0853, UFG 2017), que abre sem conta pelo link.
 */
const ALTERNATIVAS: Array<[string, string, 'certa' | 'errada' | '']> = [
  ['A', 'maior espessura com maior tendência à retração.', 'errada'],
  ['B', 'não fechamento por primeira intenção da zona doadora.', ''],
  ['C', 'maior maleabilidade que o enxerto parcial, após a cicatrização.', 'certa'],
  ['D', 'pele pigmentada após a cicatrização.', ''],
]

export function AmostraQuestao() {
  return (
    <figure className="amostra" aria-label="Exemplo de questão comentada">
      <figcaption className="amostra__topo">
        <span className="amostra__prova">UFG · 2017</span>
        <span className="amostra__tema">Mão e punho</span>
      </figcaption>
      <p className="amostra__enunciado">É uma das características do enxerto de pele total:</p>
      <ol className="amostra__alternativas">
        {ALTERNATIVAS.map(([letra, texto, estado]) => (
          <li key={letra} className={estado ? `amostra__alt amostra__alt--${estado}` : 'amostra__alt'}>
            <b>{letra}</b><span>{texto}</span>
            {estado === 'certa' && <Icone nome="certo" tamanho={16} />}
          </li>
        ))}
      </ol>
      <div className="amostra__comentario">
        <p className="amostra__rotulo">Comentário</p>
        <p><strong>Por que C:</strong> o enxerto total leva toda a derme, a estrutura mecânica da pele. Retrai menos ao cicatrizar e acompanha a flexão dos dedos.</p>
        <p><strong>Por que não A:</strong> ele retrai mais logo após a retirada, mas menos durante a cicatrização, que é o que importa na mão.</p>
      </div>
      <a className="amostra__link" href={href('/questao/mao-0853')}>Ver esta questão e o comentário completo <Icone nome="direita" tamanho={14} /></a>
    </figure>
  )
}
