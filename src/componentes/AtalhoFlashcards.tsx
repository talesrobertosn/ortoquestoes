import { useMemo } from 'react'
import { FLASHCARDS_LIBERADO } from '../config'
import { ler } from '../estado/armazenamento'
import { revisarHoje } from '../estado/revisao'
import { CHAVE_REGISTROS, type RegistroFlashcard } from '../flashcards/progresso'
import { href } from '../util/rotas'
import { Icone } from './Icone'

/**
 * Ponte discreta das páginas de questões para os flashcards (beta público,
 * 13/10/2026). Os números dos flashcards nunca se misturam com os das
 * questões: aqui só aparece o atalho, com a contagem das revisões de flashcards.
 */
export function AtalhoFlashcards({ tipo }: { tipo: 'desempenho' | 'revisao' | 'cronograma' }) {
  const hoje = useMemo(() => Object.values(ler<Record<string, RegistroFlashcard>>(CHAVE_REGISTROS, {})).filter((r) => revisarHoje(r)).length, [])
  if (!FLASHCARDS_LIBERADO) return null
  const t = {
    desempenho: { destino: '/flashcards/desempenho', titulo: 'Desempenho nos flashcards', texto: 'Flashcards únicos, revisões, autoavaliação e acerto por assunto, separados das questões.' },
    revisao: { destino: hoje ? '/flashcards/biblioteca?categoria=pendentes&n=' + Math.min(hoje, 50) : '/flashcards', titulo: hoje ? `${hoje} ${hoje === 1 ? 'flashcard vence' : 'flashcards vencem'} hoje` : 'Revisão de flashcards', texto: hoje ? 'Revisão espaçada dos flashcards, à parte da fila de questões.' : 'Os flashcards têm a própria fila de revisão espaçada.' },
    cronograma: { destino: '/flashcards/cronograma', titulo: 'Cronograma de flashcards', texto: 'Data-alvo, assuntos e ritmo diário só para os flashcards. Grátis, salvo neste aparelho.' },
  }[tipo]
  return (
    <a className="atalho-flashcards nao-imprime" href={href(t.destino)}>
      <Icone nome="raio" tamanho={20} />
      <span><strong>{t.titulo} <span className="selo-beta">Beta</span></strong><small>{t.texto}</small></span>
      <Icone nome="direita" tamanho={18} />
    </a>
  )
}
