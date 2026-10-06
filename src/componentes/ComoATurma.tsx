import type { CSSProperties } from 'react'
import type { Questao } from '../dados/tipos'
import { MINIMO_TURMA, usarTurmaQuestao } from '../dados/turma'
import { usarPremium } from '../conta/premium'
import { href } from '../util/rotas'
import { Icone } from './Icone'

const pct = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 100) : 0)
export const pessoas = (n: number) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'pessoa' : 'pessoas'}`

export interface TurmaNasAlternativas {
  respondentes: number
  acertoPrimeira: number
  /** Porcentagem de cada letra; nulo enquanto há pouca gente com a letra registrada. */
  porLetra: Record<string, number> | null
  /** A errada mais marcada, quando passa de 20%. */
  pegadinha: string | null
}

/**
 * Para o assinante: como a turma respondeu, para mostrar a porcentagem embaixo
 * de cada alternativa da própria questão. Nulo para quem não assina.
 */
export function usarTurmaNasAlternativas(questao: Questao, ativo: boolean): TurmaNasAlternativas | null {
  const { logado, premium } = usarPremium()
  const valida = !!questao.gabarito && !questao.anulada
  const { dados } = usarTurmaQuestao(questao.id, ativo && logado && premium && valida)
  if (!ativo || !premium || !valida || !dados || dados.letras === null) return null
  const comLetra = dados.com_letra ?? 0
  const porLetra = comLetra >= MINIMO_TURMA && dados.respondentes >= MINIMO_TURMA
    ? Object.fromEntries(questao.alternativas.map((a) => [a.letra, pct(dados.letras?.[a.letra] ?? 0, comLetra)]))
    : null
  const pior = porLetra ? Object.entries(porLetra).filter(([l]) => l !== questao.gabarito).sort((a, b) => b[1] - a[1])[0] : undefined
  return { respondentes: dados.respondentes, acertoPrimeira: pct(dados.acertos ?? 0, dados.respondentes), porLetra, pegadinha: pior && pior[1] >= 20 ? pior[0] : null }
}

/**
 * Para quem não assina: o convite discreto no pé da questão, depois do
 * comentário. O assinante vê a porcentagem dentro de cada alternativa
 * (usarTurmaNasAlternativas), sem caixa à parte.
 */
export function ComoATurma({ questao }: { questao: Questao }) {
  const { logado, premium } = usarPremium()
  const valida = !!questao.gabarito && !questao.anulada
  const { dados, falhou } = usarTurmaQuestao(questao.id, logado && valida && !premium)
  if (premium || !logado || !valida || falhou || !dados) return null

  const exemplo = [62, 18, 12, 8]
  return (
    <section className="tu tu--convite" aria-label="Como a turma respondeu">
      <div className="tu-convite__texto">
        <p className="tu-convite__titulo"><Icone nome="grupo" tamanho={18} /> Como a turma respondeu</p>
        <p className="tu-convite__descricao">
          {dados.respondentes >= MINIMO_TURMA
            ? <><strong>{pessoas(dados.respondentes)}</strong> já responderam esta questão. Assinando, você vê quantos por cento marcaram cada alternativa, direto embaixo de cada uma, e descobre na hora onde a maioria cai.</>
            : 'Assinando, você vê quantos por cento da turma marcam cada alternativa, direto embaixo de cada uma, em todas as questões.'}
        </p>
        <a className="botao botao--ouro" href={href('/assinatura')}><Icone nome="cadeado" tamanho={16} /> Exclusivo para assinantes</a>
      </div>
      <div className="tu-convite__demo" aria-hidden="true">
        {questao.alternativas.slice(0, 4).map((a, i) => (
          <span key={a.letra} className={'tu-demo' + (i === 0 ? ' tu-demo--destaque' : '')} style={{ '--w': `${exemplo[i] ?? 6}%` } as CSSProperties}>
            <b>{a.letra}</b>
            <i>{exemplo[i] ?? 6}%</i>
          </span>
        ))}
      </div>
    </section>
  )
}
