import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icone } from '../Icone'

/**
 * Peças pequenas de Minha conta: o interruptor que mostra "Salvando…/Salvo/Não salvou"
 * ao lado de cada preferência guardada no servidor, e o aviso flutuante (toast) com o
 * resultado das ações (perfil salvo, apelido salvo, senha alterada…).
 */

type EstadoSalvar = 'parado' | 'salvando' | 'salvo' | 'erro'

/** Interruptor de uma preferência do servidor. `aoMudar` devolve se gravou. */
export function InterruptorSalvo({ ligado, aoMudar, children, detalhe }: {
  ligado: boolean; aoMudar: (valor: boolean) => Promise<boolean>; children: ReactNode; detalhe?: ReactNode
}) {
  const [estado, definirEstado] = useState<EstadoSalvar>('parado')
  const id = useId()
  const relogio = useRef<number>()
  useEffect(() => () => window.clearTimeout(relogio.current), [])
  async function mudar(valor: boolean) {
    window.clearTimeout(relogio.current)
    definirEstado('salvando')
    const ok = await aoMudar(valor)
    definirEstado(ok ? 'salvo' : 'erro')
    relogio.current = window.setTimeout(() => definirEstado('parado'), ok ? 2200 : 5000)
  }
  return <div className="ct-pref">
    <label className="ct-pref__texto" htmlFor={id}><span>{children}</span>{detalhe && <small>{detalhe}</small>}</label>
    <span className="ct-pref__lado">
      <span className={`ct-salvo ct-salvo--${estado}`} aria-live="polite">
        {estado === 'salvando' && 'Salvando…'}
        {estado === 'salvo' && <><Icone nome="certo" tamanho={13} /> Salvo</>}
        {estado === 'erro' && <><Icone nome="alerta" tamanho={13} /> Não salvou</>}
      </span>
      <label className="ct-interruptor">
        <input id={id} type="checkbox" checked={ligado} disabled={estado === 'salvando'} onChange={(e) => void mudar(e.target.checked)} />
        <span className="ct-interruptor__trilho" aria-hidden="true" />
      </label>
    </span>
  </div>
}

/** Interruptor de uma preferência que fica no aparelho (vale na hora, sem servidor). */
export function InterruptorLocal({ ligado, aoMudar, children, detalhe }: { ligado: boolean; aoMudar: (valor: boolean) => void; children: ReactNode; detalhe?: ReactNode }) {
  const id = useId()
  return <div className="ct-pref">
    <label className="ct-pref__texto" htmlFor={id}><span>{children}</span>{detalhe && <small>{detalhe}</small>}</label>
    <span className="ct-pref__lado">
      <label className="ct-interruptor">
        <input id={id} type="checkbox" checked={ligado} onChange={(e) => aoMudar(e.target.checked)} />
        <span className="ct-interruptor__trilho" aria-hidden="true" />
      </label>
    </span>
  </div>
}

export type TipoAviso = 'ok' | 'erro' | 'info'
export interface AvisoConta { texto: string; tipo: TipoAviso; n: number }

/** Aviso flutuante no pé da tela. Sucesso some sozinho; erro fica até fechar. */
export function AvisoFlutuante({ aviso, aoFechar }: { aviso: AvisoConta | null; aoFechar: () => void }) {
  useEffect(() => {
    if (!aviso || aviso.tipo === 'erro') return
    const t = window.setTimeout(aoFechar, aviso.tipo === 'ok' ? 4500 : 8000)
    return () => window.clearTimeout(t)
  }, [aviso, aoFechar])
  if (!aviso) return null
  const icone = aviso.tipo === 'ok' ? 'certo' : aviso.tipo === 'erro' ? 'alerta' : 'interrogacao'
  return <div key={aviso.n} className={`ct-toast ct-toast--${aviso.tipo}`} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
    <span className="ct-toast__icone" aria-hidden="true"><Icone nome={icone} tamanho={16} /></span>
    <span className="ct-toast__texto">{aviso.texto}</span>
    <button type="button" className="ct-toast__fechar" onClick={aoFechar} aria-label="Fechar aviso"><Icone nome="fechar" tamanho={16} /></button>
  </div>
}
