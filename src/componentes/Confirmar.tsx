import { useEffect, useRef, useState } from 'react'
import { JanelaCentral } from './JanelaCentral'

/**
 * Confirmação no visual do site, no lugar de window.confirm (que no celular é
 * uma caixa cinza do sistema, sem marca e fácil de tocar sem ler).
 * Uso: `if (!(await confirmar({ titulo, texto, sim: 'Substituir' }))) return`.
 * O <HospedeConfirmacao /> fica montado uma vez no App e hospeda também o pedirTexto.
 */
export interface PedidoConfirmacao {
  titulo: string
  texto?: string
  /** Rótulo da ação; diz o que acontece ("Substituir"), não "OK". */
  sim: string
  /** Rótulo de desistir; padrão "Cancelar". */
  nao?: string
}

/** Pergunta com resposta escrita, no lugar de window.prompt. */
export interface PedidoTexto {
  titulo: string
  texto?: string
  /** Rótulo do campo; padrão o título. */
  rotulo?: string
  valorInicial?: string
  /** Rótulo da ação; padrão "Salvar". */
  sim?: string
  nao?: string
  /** Sem resposta não deixa seguir (nome de modelo, por exemplo). */
  obrigatorio?: boolean
  maximo?: number
}

type Pendente = PedidoConfirmacao & { responder: (sim: boolean) => void }
type PendenteTexto = PedidoTexto & { responder: (valor: string | null) => void }
let mostrar: ((p: Pendente) => void) | null = null
let mostrarTexto: ((p: PendenteTexto) => void) | null = null

export function confirmar(pedido: PedidoConfirmacao): Promise<boolean> {
  // Sem o hospedeiro montado (teste, página isolada), cai no diálogo do navegador.
  if (!mostrar) return Promise.resolve(window.confirm(pedido.texto ? `${pedido.titulo}\n\n${pedido.texto}` : pedido.titulo))
  return new Promise((resolver) => mostrar!({ ...pedido, responder: resolver }))
}

/** Resolve com o texto digitado ou null se a pessoa desistiu. */
export function pedirTexto(pedido: PedidoTexto): Promise<string | null> {
  if (!mostrarTexto) return Promise.resolve(window.prompt(pedido.texto ? `${pedido.titulo}\n\n${pedido.texto}` : pedido.titulo, pedido.valorInicial ?? ''))
  return new Promise((resolver) => mostrarTexto!({ ...pedido, responder: resolver }))
}

export function HospedeConfirmacao() {
  const [pendente, definirPendente] = useState<Pendente | null>(null)
  useEffect(() => {
    mostrar = definirPendente
    return () => { mostrar = null }
  }, [])
  const responder = (sim: boolean) => { pendente?.responder(sim); definirPendente(null) }
  return <>
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
    <HospedeTexto />
  </>
}

function HospedeTexto() {
  const [pendente, definirPendente] = useState<PendenteTexto | null>(null)
  const [valor, definirValor] = useState('')
  const entrada = useRef<HTMLInputElement>(null)
  useEffect(() => {
    mostrarTexto = (p) => { definirValor(p.valorInicial ?? ''); definirPendente(p) }
    return () => { mostrarTexto = null }
  }, [])
  // A JanelaCentral põe o foco no X ao abrir; aqui o lugar certo é o campo.
  useEffect(() => {
    if (!pendente) return
    const t = window.setTimeout(() => { entrada.current?.focus(); entrada.current?.select() }, 0)
    return () => window.clearTimeout(t)
  }, [pendente])
  const responder = (resposta: string | null) => { pendente?.responder(resposta); definirPendente(null) }
  const vazio = !!pendente?.obrigatorio && !valor.trim()
  return (
    <JanelaCentral aberta={!!pendente} aoFechar={() => responder(null)} rotulo={pendente?.titulo ?? 'Responder'} className="jc__caixa--compacta">
      {pendente && <form className="confirmar" onSubmit={(e) => { e.preventDefault(); if (!vazio) responder(valor) }}>
        <h2>{pendente.titulo}</h2>
        {pendente.texto && <p>{pendente.texto}</p>}
        <label className="campo">{pendente.rotulo ?? pendente.titulo}
          <input ref={entrada} className="entrada" type="text" value={valor} maxLength={pendente.maximo} onChange={(e) => definirValor(e.target.value)} />
        </label>
        <div className="confirmar__acoes">
          <button type="button" className="botao" onClick={() => responder(null)}>{pendente.nao ?? 'Cancelar'}</button>
          <button type="submit" className="botao botao--principal" disabled={vazio}>{pendente.sim ?? 'Salvar'}</button>
        </div>
      </form>}
    </JanelaCentral>
  )
}
