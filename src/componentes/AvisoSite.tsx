import { useEffect, useState } from 'react'
import { chamarRpcPublica } from '../servicos/supabase'
import { Icone } from './Icone'

interface Aviso { id: number; texto: string; link: string | null; rotulo_link: string | null; tom: 'info' | 'destaque' | 'alerta' }
const CHAVE = 'oq-aviso-dispensado'

/**
 * Faixa no topo do site, escrita pelo administrador no painel. Quem fecha não
 * vê mais aquele aviso neste aparelho; um aviso novo volta a aparecer.
 */
export function AvisoSite() {
  const [aviso, definirAviso] = useState<Aviso | null>(null)
  useEffect(() => {
    let vivo = true
    chamarRpcPublica<Aviso[]>('obter_aviso_site').then(([a]) => {
      let dispensado = ''
      try { dispensado = localStorage.getItem(CHAVE) ?? '' } catch { /* sem armazenamento */ }
      if (vivo && a && String(a.id) !== dispensado) definirAviso(a)
    }).catch(() => undefined)
    return () => { vivo = false }
  }, [])
  if (!aviso) return null
  const fechar = () => { try { localStorage.setItem(CHAVE, String(aviso.id)) } catch { /* sem armazenamento */ } definirAviso(null) }
  const externo = aviso.link?.startsWith('https://')
  return <div className={`aviso-site aviso-site--${aviso.tom} nao-imprime`} role="status">
    <div className="conteudo aviso-site__interno">
      <Icone nome={aviso.tom === 'alerta' ? 'alerta' : 'raio'} tamanho={16} />
      <p>{aviso.texto}{aviso.link && <> <a href={aviso.link} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{aviso.rotulo_link || 'Saiba mais'}</a></>}</p>
      <button type="button" className="aviso-site__fechar" onClick={fechar} aria-label="Fechar aviso"><Icone nome="fechar" tamanho={16} /></button>
    </div>
  </div>
}
