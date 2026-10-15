import { useEffect, useState } from 'react'
import { JanelaCentral } from './JanelaCentral'

/**
 * Confirmação no visual do site, no lugar de window.confirm (que no celular é
 * uma caixa cinza do sistema, sem marca e fácil de tocar sem ler).
 * Uso: `if (!(await confirmar({ titulo, texto, sim: 'Substituir' }))) return`.
 * O <HospedeConfirmacao /> fica montado uma vez no App.
 */
export interface PedidoConfirmacao {
  titulo: string
  texto?: string
  /** Rótulo da ação; diz o que acontece ("Substituir"), não "OK". */
  sim: string
  /** Rótulo de desistir; padrão "Cancelar". */
  nao?: string
}

type Pendente = PedidoConfirmacao & { responder: (sim: boolean) => void }
let mostrar: ((p: Pendente) => void) | null = null

export function confirmar(pedido: PedidoConfirmacao): Promise<boolean> {
  // Sem o hospedeiro montado (teste, página isolada), cai no diálogo do navegador.
  if (!mostrar) return Promise.resolve(window.confirm(pedido.texto ? `${pedido.titulo}\n\n${pedido.texto}` : pedido.titulo))
  return new Promise((resolver) => mostrar!({ ...pedido, responder: resolver }))
}

export function HospedeConfirmacao() {
  const [pendente, definirPendente] = useState<Pendente | null>(null)
  useEffect(() => {
    mostrar = definirPendente
    return () => { mostrar = null }
  }, [])
  const responder = (sim: boolean) => { pendente?.responder(sim); definirPendente(null) }
  return (
    <JanelaCentral aberta={!!pendente} aoFechar={() => responder(false)} rotulo={pendente?.titulo ?? 'Confirmar'} className="jc__caixa--compacta">
      {pendente && <div className="confirmar">
        <h2>{pendente.titulo}</h2>
        {pendente.texto && <p>{pendente.texto}</p>}
        <div className="confirmar__acoes">
          <button type="button" className="botao" onClick={() => responder(false)}>{pendente.nao ?? 'Cancelar'}</button>
          <button type="button" className="botao botao--principal" onClick={() => responder(true)}>{pendente.sim}</button>
        </div>
      </div>}
    </JanelaCentral>
  )
}
