import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import {
  JANELAS_ABERTAS, OCIOSO, PASSO, PAUSA_COMPARTILHOU, PAUSA_ZERA, bichoDoDia, estadoDoDia, hoje, passo, rotaLivre,
  type Estado,
} from './convite/regras'

/**
 * Quando a carta de convite aparece (as regras estão em convite/regras.ts): no máximo uma vez por dia, depois de
 * 5 minutos de uso de verdade, e de novo a cada hora de uso contínuo. Nunca interrompe uma sessão de questões nem
 * telas de login e pagamento: espera a pessoa sair delas. Quem compartilha fica um mês sem ver.
 *
 * Este arquivo fica pequeno de propósito (roda em toda página); a carta, os bichos e o CSS só descem quando chega
 * a hora (convite/CartaConvite.tsx). Desde 12/11/2026 quem entrega é a coruja ou o gato, e a carta é o Indique e ganhe.
 */

// Global em armazenamento.ts: sobrevive à limpeza de dados de visitante.
const CHAVE = 'ortoquestoes:convite-diario'

const CartaConvite = lazy(() => import('./convite/CartaConvite').then((m) => ({ default: m.CartaConvite })))

function ler(): Estado {
  try {
    return estadoDoDia(JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Estado | null, hoje())
  } catch {
    return estadoDoDia(null, hoje())
  }
}
function gravar(estado: Estado) {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)) } catch { /* sem armazenamento: não conta tempo */ }
}

/** Verdadeiro se a carta já apareceu hoje (para os outros convites não repetirem o pedido). */
export function conviteDiarioMostradoHoje(): boolean {
  return ler().mostrado
}

export function ConviteDiario({ caminho }: { caminho: string }) {
  const [aberto, definirAberto] = useState(false)
  const atividade = useRef(Date.now())
  const continuo = useRef(0)
  const rota = useRef(caminho)
  rota.current = caminho

  useEffect(() => {
    const mexeu = () => { atividade.current = Date.now() }
    const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    eventos.forEach((e) => window.addEventListener(e, mexeu, { passive: true }))
    const relogio = window.setInterval(() => {
      const agora = Date.now()
      const parado = agora - atividade.current
      if (parado > PAUSA_ZERA) continuo.current = 0
      if (document.visibilityState !== 'visible' || parado > OCIOSO) return
      const r = passo(ler(), continuo.current, agora)
      continuo.current = r.continuo
      gravar(r.estado)
      if (!r.abrir) return
      // Espera a pessoa sair da sessão (ou do login/pagamento) e de qualquer outra janela aberta.
      if (!rotaLivre(rota.current) || document.querySelector(JANELAS_ABERTAS)) return
      gravar({ ...r.estado, mostrado: true })
      continuo.current = 0
      definirAberto(true)
    }, PASSO * 1000)
    return () => {
      window.clearInterval(relogio)
      eventos.forEach((e) => window.removeEventListener(e, mexeu))
    }
  }, [])

  if (!aberto) return null
  return (
    <Suspense fallback={null}>
      <CartaConvite
        bicho={bichoDoDia(hoje())}
        aoFechar={() => definirAberto(false)}
        aoCompartilhar={() => gravar({ ...ler(), mostrado: true, pausaAte: Date.now() + PAUSA_COMPARTILHOU })}
      />
    </Suspense>
  )
}
