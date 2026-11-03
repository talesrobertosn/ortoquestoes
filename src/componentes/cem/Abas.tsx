import { href } from '../../util/rotas'
import { Icone } from '../Icone'

/** As abas do ranking: questões, Torneio de Flashcards (beta) e o inventário de conquistas. */
export function AbasRanking({ atual, conquistadas, total }: { atual: 'questoes' | 'flashcards' | 'conquistas'; conquistadas?: number; total?: number }) {
  const aba = (nome: typeof atual) => (atual === nome ? 'page' as const : undefined)
  return <nav className="rk-secoes cem-abas" aria-label="Ranking e conquistas">
    <a className="rk-secoes__aba" href={href('/ranking')} aria-current={aba('questoes')}><Icone nome="trofeu" tamanho={18} /> Questões</a>
    <a className="rk-secoes__aba" href={href('/ranking?aba=flashcards')} aria-current={aba('flashcards')}><Icone nome="raio" tamanho={18} /> Flashcards <span className="selo-beta">Beta</span></a>
    <a className="rk-secoes__aba" href={href('/conquistas')} aria-current={aba('conquistas')}><Icone nome="medalha" tamanho={18} /> Conquistas{total ? <span className="rk-secoes__contador numerico">{conquistadas}/{total}</span> : null}</a>
  </nav>
}
