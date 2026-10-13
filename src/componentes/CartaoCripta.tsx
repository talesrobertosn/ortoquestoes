import { href } from '../util/rotas'
import { recurso } from '../config'
import '../estilos/componentes/CartaoCripta.css'

/**
 * Flashcards na página de planos (beta público, 13/10/2026). Só descreve o que
 * existe: o limite é o mesmo interruptor das questões (paywall_ativo no
 * servidor), sem preço nem benefício novo. A variante "capa" ficou sem uso: a
 * página inicial tem o próprio quadro (Inicio.tsx).
 */
export function CartaoCripta({ variante = 'venda', limites = false }: { variante?: 'capa' | 'venda'; limites?: boolean }) {
  return (
    <section className={`cripta-cartao cripta-cartao--${variante}`} aria-labelledby={`cripta-titulo-${variante}`}>
      <img className="cripta-cartao__capa" src={recurso('flashcards/promo/capa-larga.png')} alt="" width={520} height={330} loading="lazy" decoding="async" />
      <div className="cripta-cartao__texto">
        <p className="cripta-cartao__selo">Flashcards · beta público</p>
        <h2 id={`cripta-titulo-${variante}`}>Flashcards das provas reais, com revisão espaçada</h2>
        <p>Responda, veja o verso e diga se errou, hesitou ou sabia: a próxima revisão se marca sozinha. Para quem gosta de jogo, os mesmos flashcards viram o <em>Torneio de Flashcards</em>.</p>
        <ul className="cripta-cartao__lista">
          <li>Flashcards tirados das questões comentadas do acervo, por assunto</li>
          <li>{limites ? 'Conta grátis: 10 flashcards a cada 24 horas · Assinante: sem limite' : 'Abertos a todas as contas nesta fase'}</li>
          <li>Desempenho, cronograma e ranking único do Torneio</li>
        </ul>
      </div>
      <a className="botao botao--ouro cripta-cartao__entrar" href={href('/flashcards')}>Conhecer os flashcards</a>
    </section>
  )
}
