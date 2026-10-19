import { useCallback, useEffect, useRef, useState } from 'react'
import type { EstadoSessao } from '../dados/tipos'
import { codigoErroSN, snSalvar } from '../dados/apiSimuladoNacional'
import { respostasParaServidor } from '../dados/provaNacional'
import { ler } from './armazenamento'
import { CHAVE_SESSAO } from './sessao'

export type SituacaoSalvamento = 'salvo' | 'salvando' | 'pendente' | 'sem-rede' | 'encerrado'
export interface EstadoSalvamento { situacao: SituacaoSalvamento; salvoEm: number | null }

/** Espera depois da última marcação antes de subir o lote. */
export const ESPERA_SALVAR_MS = 3000

/**
 * Salvamento da prova do Simulado Nacional no servidor (sn_salvar). Cada
 * marcação entra na lista de pendentes da sessão; o lote sobe ~3 s depois da
 * última, ao esconder a aba, ao fechar a página e quando a rede volta. Só sai
 * da lista o que subiu com a mesma letra (trocar no meio do envio sobe de novo).
 */
export function usarSalvamentoNacional(
  sessao: EstadoSessao | null,
  definirSessao: (f: (atual: EstadoSessao | null) => EstadoSessao | null) => void,
): EstadoSalvamento & { salvarAgora: () => Promise<void> } {
  const [estado, definirEstado] = useState<EstadoSalvamento>({ situacao: 'salvo', salvoEm: null })
  const emVoo = useRef<Promise<void> | null>(null)
  const encerrado = useRef(false)
  const nacional = sessao?.nacional && !sessao.concluidaEm ? sessao.nacional : null
  const pendentes = sessao?.pendentesNacional?.length ?? 0
  const revisarPendente = !!sessao?.revisarPendente

  const enviar = useCallback(async (keepalive = false): Promise<void> => {
    if (encerrado.current) return
    if (emVoo.current) { await emVoo.current; return enviar(keepalive) }
    const s = ler<EstadoSessao | null>(CHAVE_SESSAO, null)
    if (!s?.nacional || s.concluidaEm) return
    const ids = s.pendentesNacional ?? []
    if (!ids.length && !s.revisarPendente) return
    const respostas = respostasParaServidor(s, ids)
    const revisar = s.revisarPendente ? [...s.revisar] : null
    definirEstado((e) => ({ ...e, situacao: 'salvando' }))
    const pedido = snSalvar(s.nacional, respostas, revisar, keepalive ? { keepalive: true } : undefined)
      .then((r) => {
        definirSessao((atual) => {
          if (!atual || atual.nacional !== s.nacional) return atual
          const restantes = (atual.pendentesNacional ?? []).filter((id) => (atual.respostas[id]?.escolhida ?? null) !== (respostas[id] ?? null))
          const revisarIgual = revisar !== null && revisar.length === atual.revisar.length && revisar.every((id, i) => atual.revisar[i] === id)
          return { ...atual, pendentesNacional: restantes, revisarPendente: atual.revisarPendente && !revisarIgual }
        })
        definirEstado({ situacao: 'salvo', salvoEm: Date.parse(r?.salvo_em ?? '') || Date.now() })
      })
      .catch((falha) => {
        const codigo = codigoErroSN(falha)
        if (codigo === 'tempo_esgotado' || codigo === 'ja_entregue' || codigo === 'nao_iniciado') {
          encerrado.current = true
          definirEstado((e) => ({ ...e, situacao: 'encerrado' }))
        } else definirEstado((e) => ({ ...e, situacao: 'sem-rede' }))
      })
      .finally(() => { emVoo.current = null })
    emVoo.current = pedido
    return pedido
  }, [definirSessao])

  useEffect(() => { encerrado.current = false }, [nacional])

  // Marcou: sobe depois da pausa. Sem rede, tenta de novo a cada 10 s.
  useEffect(() => {
    if (!nacional || (!pendentes && !revisarPendente)) return
    definirEstado((e) => (e.situacao === 'sem-rede' ? e : { ...e, situacao: 'pendente' }))
    const t = window.setTimeout(() => void enviar(), ESPERA_SALVAR_MS)
    const novamente = window.setInterval(() => void enviar(), 10_000)
    return () => { window.clearTimeout(t); window.clearInterval(novamente) }
  }, [nacional, pendentes, revisarPendente, enviar])

  // Esconder a aba, fechar a página ou voltar a rede: sobe na hora.
  useEffect(() => {
    if (!nacional) return
    const aoEsconder = () => { if (document.visibilityState === 'hidden') void enviar(true) }
    const aoSair = () => void enviar(true)
    const aoVoltarRede = () => void enviar()
    document.addEventListener('visibilitychange', aoEsconder)
    window.addEventListener('pagehide', aoSair)
    window.addEventListener('beforeunload', aoSair)
    window.addEventListener('online', aoVoltarRede)
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder)
      window.removeEventListener('pagehide', aoSair)
      window.removeEventListener('beforeunload', aoSair)
      window.removeEventListener('online', aoVoltarRede)
    }
  }, [nacional, enviar])

  return { ...estado, salvarAgora: () => enviar() }
}
