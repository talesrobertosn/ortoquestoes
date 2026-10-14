import { recurso } from '../../config'
import type { diarioBiblioteca } from '../biblioteca/sessao'

const CLIMAS: Record<string, string> = { calmo: 'Céu calmo', chama: 'Em chamas', gloria: 'Glória', chuva: 'Chuva', tempestade: 'Tempestade', nevoa: 'Névoa', arcoiris: 'Arco-íris' }

export function DiarioBiblioteca({ diario }: { diario: ReturnType<typeof diarioBiblioteca> }) {
  return <section className="fc-diario" aria-label="Diário da sessão">
    <h3>Seu diário de hoje</h3>
    {diario.maisSegura && <p>Área com mais segurança: <strong>{diario.maisSegura.area}</strong> · você marcou “Sabia” em {diario.maisSegura.sabia} de {diario.maisSegura.total} flashcards.</p>}
    <p className="fc-diario__nota">O clima mostra como você avaliou cada trecho desta sessão.</p>
    <ol>{diario.trechos.map(t => <li key={t.inicio} className={'fc-diario__trecho fc-diario__trecho--' + t.clima}>
      <span>{CLIMAS[t.clima] ?? t.clima}</span><small>{t.inicio === t.fim ? `Flashcard ${t.inicio}` : `Flashcards ${t.inicio}–${t.fim}`}</small>
    </li>)}</ol>
  </section>
}

/** Um livro por “Sabia” da sessão, sem afirmar domínio permanente da matéria. */
export function EstanteDaSessao({ livros, reduzido }: { livros: number; reduzido: boolean }) {
  return <div className="fc-estante" aria-label={`${livros} livros guardados nesta sessão`}>
    <div aria-hidden="true">{Array.from({ length: Math.min(8, livros) }, (_, i) => <img key={`${livros}-${i}`} className={i === Math.min(8, livros) - 1 && !reduzido ? 'fc-estante__voando' : ''} src={recurso('flashcards/interface/livro-sessao.png')} alt="" />)}</div>
    <small>{livros ? `${livros} livro${livros === 1 ? '' : 's'} guardado${livros === 1 ? '' : 's'}` : 'Cada “Sabia” guarda um livro'}</small>
  </div>
}
