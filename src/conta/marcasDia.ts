import type { OpcoesPlano, PlanoSalvo } from '../dados/planoEstudo'
import { hojeBR } from '../util/dia'

/**
 * O que a pessoa fez hoje no cronograma fora das questões: resumão lido (por
 * área), rodada de flashcards e mini-simulado.
 *
 * Até 15/10/2026 isso morava só no aparelho (`cronograma:dia` e
 * `resumao:lido-hoje`): o computador mostrava "a fazer" o que já tinha sido
 * feito no MacBook. Agora o registro do dia também vai para o plano no
 * servidor (`planos_estudo.opcoes.marcasDia`, gravado por ajustar_opcoes_plano,
 * que só mexe na conta de quem chama), e a tela junta as duas fontes. Só o dia
 * de hoje fica guardado: um registro pequeno, que se substitui sozinho.
 */
export interface MarcasDia {
  /** "AAAA-MM-DD", dia de São Paulo. */
  em: string
  resumao?: string[]
  flashcards?: boolean
  mini?: boolean
}

export const marcasVazias = (em = hojeBR()): MarcasDia => ({ em })

/** As marcas de hoje guardadas no plano (vazias se forem de outro dia ou estiverem malformadas). */
export function marcasDoPlano(plano: Pick<PlanoSalvo, 'opcoes'> | null | undefined, hoje = hojeBR()): MarcasDia {
  const m = (plano?.opcoes as OpcoesPlano | null | undefined)?.marcasDia
  if (!m || typeof m !== 'object' || m.em !== hoje) return marcasVazias(hoje)
  return {
    em: hoje,
    ...(Array.isArray(m.resumao) ? { resumao: m.resumao.filter((s): s is string => typeof s === 'string').slice(0, 30) } : {}),
    ...(m.flashcards === true ? { flashcards: true } : {}),
    ...(m.mini === true ? { mini: true } : {}),
  }
}

/** Junta duas marcas do mesmo dia: o que foi feito em qualquer aparelho conta. */
export function juntarMarcas(a: MarcasDia, b: MarcasDia): MarcasDia {
  if (a.em !== b.em) return a.em > b.em ? a : b
  const resumao = [...new Set([...(a.resumao ?? []), ...(b.resumao ?? [])])]
  return {
    em: a.em,
    ...(resumao.length ? { resumao } : {}),
    ...(a.flashcards || b.flashcards ? { flashcards: true } : {}),
    ...(a.mini || b.mini ? { mini: true } : {}),
  }
}

/** true quando `b` já tem tudo o que `a` tem. */
export function contemMarcas(b: MarcasDia, a: MarcasDia): boolean {
  if (a.em !== b.em) return a.em < b.em
  return (!a.flashcards || !!b.flashcards) && (!a.mini || !!b.mini) && (a.resumao ?? []).every((s) => (b.resumao ?? []).includes(s))
}

/**
 * Opções do plano com as marcas deste aparelho somadas às do servidor, ou null
 * se o servidor já tem tudo (nada a gravar). Usado com salvarOpcoes, que relê
 * o plano antes: o que outro aparelho marcou no meio tempo não se perde.
 */
export function opcoesComMarcas(atual: Pick<PlanoSalvo, 'opcoes'>, locais: MarcasDia, hoje = hojeBR()): OpcoesPlano | null {
  if (locais.em !== hoje) return null
  const doServidor = marcasDoPlano(atual, hoje)
  if (contemMarcas(doServidor, locais)) return null
  return { ...(atual.opcoes ?? {}), marcasDia: juntarMarcas(doServidor, locais) }
}

