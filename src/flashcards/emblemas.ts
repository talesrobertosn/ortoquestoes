import { useEffect, useMemo, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { gravar, ler, usuarioLocal } from '../estado/armazenamento'
import { usarArmazenado } from '../estado/usarArmazenado'
import { chamarRpc } from '../servicos/supabase'
import { metricasFlashcards, type MetricasFlashcards, type RecordesServidor } from './conquistas'
import { BESTIARIO_VAZIO, CHAVE_BESTIARIO, CHAVE_RECORDES, CHAVE_REGISTROS, type Bestiario, type Recordes, type RegistroFlashcard } from './progresso'
import { RANKING_NO_SERVIDOR } from './servidor'

/**
 * Liga os Flashcards aos emblemas do site: lê o que o jogo e a Biblioteca
 * guardam e o recorde conferido pelo servidor (RPC meus_recordes_flashcards,
 * migração 202610151800). Sem o SQL aplicado, o andar fica em zero.
 */
const CHAVE_SERVIDOR = 'flashcards:recordes-servidor'
const VALIDADE = 10 * 60_000
/** Só vale carregar o acervo (4 MB) para saber os lendários de quem já tem flashcards suficientes. */
const MINIMO_PARA_LENDARIOS = 50

type Salvo = { em: number; conta: string; dados: RecordesServidor } | null
let consultando: Promise<void> | null = null

function consultar(conta: string) {
  const salvo = ler<Salvo>(CHAVE_SERVIDOR, null)
  if (salvo?.conta === conta && Date.now() - salvo.em < VALIDADE) return
  consultando ??= chamarRpc<RecordesServidor>('meus_recordes_flashcards', {})
    .then((dados) => { if (usuarioLocal() === conta && dados) gravar(CHAVE_SERVIDOR, { em: Date.now(), conta, dados: { andar_masmorra: Number(dados.andar_masmorra) || 0, unicos: Number(dados.unicos) || 0 } }) })
    .catch(() => { /* SQL ainda não aplicado ou sem rede: o andar fica em zero */ })
    .finally(() => { consultando = null })
}

const lendariasDe = (cartas: ReadonlyArray<{ id: string; raridade: string }>) => new Set(cartas.filter((c) => c.raridade === 'lendaria').map((c) => c.id))

/** Métricas dos emblemas de Flashcards. `comLendarios` carrega o acervo se preciso (página de Conquistas). */
export function usarMetricasFlashcards(comLendarios = false): MetricasFlashcards {
  const { sessao } = usarConta()
  const conta = sessao?.user.id
  const [registros] = usarArmazenado<Record<string, Partial<RegistroFlashcard>>>(CHAVE_REGISTROS, {})
  const [bestiario] = usarArmazenado<Partial<Bestiario>>(CHAVE_BESTIARIO, BESTIARIO_VAZIO)
  const [recordes] = usarArmazenado<Partial<Recordes>>(CHAVE_RECORDES, {})
  const [salvo] = usarArmazenado<Salvo>(CHAVE_SERVIDOR, null)
  const [lendarias, definirLendarias] = useState<ReadonlySet<string> | null>(null)
  const quantos = Object.keys(registros ?? {}).length
  useEffect(() => { if (conta && RANKING_NO_SERVIDOR) consultar(conta) }, [conta])
  useEffect(() => {
    if (!comLendarios || lendarias || quantos < MINIMO_PARA_LENDARIOS) return
    let vivo = true
    // Import sob demanda: o acervo dos flashcards só desce na página de Conquistas.
    void import('./dados/acervo').then(({ carregarAcervo, indiceDoAcervo }) => carregarAcervo().then((cartas) => {
      if (vivo && indiceDoAcervo()) definirLendarias(lendariasDe(cartas))
    }))
    return () => { vivo = false }
  }, [comLendarios, lendarias, quantos])
  return useMemo(() => metricasFlashcards({
    registros: registros ?? {}, bestiario, recordes,
    servidor: conta && salvo?.conta === conta ? salvo.dados : null,
    lendarias,
  }), [registros, bestiario, recordes, salvo, conta, lendarias])
}
