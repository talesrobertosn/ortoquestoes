import { useCallback, useEffect, useState } from 'react'
import { atualizar, correndo, estadoInicial, iniciar, pausar, reiniciar, trocarRitmo, validar, type EstadoPomodoro, type FasePomodoro } from '../util/pomodoro'

// O que aparece na tela da sessão (19/10/2026, pedido do Tales: "dar opção de esconder o mapa e etc").
// Regra do Tales: de entrada a tela é sempre limpa (só a questão); placar, mapa ao lado, Pomodoro,
// atalhos e dica de teclas ficam como opção visível em "Personalizar", para a pessoa adicionar.
// Fica só neste aparelho: é jeito de estudar, não dado de estudo.
export interface PreferenciasSessao {
  placar: boolean
  mapa: boolean
  atalhos: boolean
  dicasTeclado: boolean
  pomodoro: boolean
  somPomodoro: boolean
}

export const PREFERENCIAS_PADRAO: PreferenciasSessao = { placar: false, mapa: false, atalhos: false, dicasTeclado: false, pomodoro: false, somPomodoro: true }

const CHAVE_PREFERENCIAS = 'oq:sessao:preferencias:v2'
const CHAVE_POMODORO = 'oq:sessao:pomodoro:v1'

function lerJson(chave: string): unknown {
  try { return JSON.parse(localStorage.getItem(chave) ?? 'null') } catch { return null }
}
function gravarJson(chave: string, valor: unknown) {
  try { localStorage.setItem(chave, JSON.stringify(valor)) } catch { /* sem armazenamento: vale só nesta visita */ }
}

export function usarPreferenciasSessao() {
  const [preferencias, definir] = useState<PreferenciasSessao>(() => {
    const salvas = lerJson(CHAVE_PREFERENCIAS)
    const base = { ...PREFERENCIAS_PADRAO }
    if (salvas && typeof salvas === 'object') {
      for (const chave of Object.keys(base) as Array<keyof PreferenciasSessao>) {
        const valor = (salvas as Record<string, unknown>)[chave]
        if (typeof valor === 'boolean') base[chave] = valor
      }
    }
    return base
  })
  const alternar = useCallback((chave: keyof PreferenciasSessao) => {
    definir((atual) => {
      const nova = { ...atual, [chave]: !atual[chave] }
      gravarJson(CHAVE_PREFERENCIAS, nova)
      return nova
    })
  }, [])
  return { preferencias, alternar }
}

/** Som curto de fim de fase: duas notas suaves. Sem áudio no aparelho, só o aviso escrito. */
function tocarAviso(fase: FasePomodoro) {
  try {
    const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Contexto) return
    const audio = new Contexto()
    const notas = fase === 'foco' ? [660, 880] : [880, 660]
    notas.forEach((frequencia, i) => {
      const osc = audio.createOscillator()
      const volume = audio.createGain()
      const inicio = audio.currentTime + i * 0.22
      osc.type = 'sine'
      osc.frequency.value = frequencia
      volume.gain.setValueAtTime(0.0001, inicio)
      volume.gain.exponentialRampToValueAtTime(0.18, inicio + 0.02)
      volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.2)
      osc.connect(volume).connect(audio.destination)
      osc.start(inicio)
      osc.stop(inicio + 0.22)
    })
    window.setTimeout(() => void audio.close().catch(() => {}), 800)
  } catch { /* sem áudio */ }
}

/** O relógio do Pomodoro da sessão. Um só por página (Sessao), passado às duas vistas. */
export function usarPomodoro(ligado: boolean, som: boolean) {
  const [estado, definirEstado] = useState<EstadoPomodoro>(() => validar(lerJson(CHAVE_POMODORO)) ?? estadoInicial())
  const [agora, definirAgora] = useState(() => Date.now())
  const [aviso, definirAviso] = useState<string | null>(null)

  const mudar = useCallback((fazer: (e: EstadoPomodoro, agora: number) => EstadoPomodoro) => {
    definirEstado((atual) => {
      const novo = fazer(atual, Date.now())
      gravarJson(CHAVE_POMODORO, novo)
      return novo
    })
    definirAgora(Date.now())
  }, [])

  useEffect(() => {
    if (!ligado || !correndo(estado)) return
    const passo = () => {
      const instante = Date.now()
      definirAgora(instante)
      const { estado: novo, terminou } = atualizar(estado, instante)
      if (terminou) {
        gravarJson(CHAVE_POMODORO, novo)
        definirEstado(novo)
        definirAviso(terminou === 'foco' ? 'Foco concluído. Hora da pausa.' : 'Pausa encerrada. Quando quiser, comece o próximo foco.')
        if (som) tocarAviso(terminou)
      }
    }
    passo()
    const id = window.setInterval(passo, 1000)
    return () => window.clearInterval(id)
  }, [ligado, som, estado])

  useEffect(() => {
    if (!aviso) return
    const id = window.setTimeout(() => definirAviso(null), 8000)
    return () => window.clearTimeout(id)
  }, [aviso])

  return {
    estado,
    agora,
    aviso,
    iniciar: () => { definirAviso(null); mudar(iniciar) },
    pausar: () => mudar(pausar),
    reiniciar: () => { definirAviso(null); mudar((e) => reiniciar(e)) },
    trocarRitmo: (foco: number, pausa: number) => mudar((e) => trocarRitmo(e, foco, pausa)),
  }
}

export type ControlePomodoro = ReturnType<typeof usarPomodoro>
