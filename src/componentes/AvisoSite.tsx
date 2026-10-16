import { useEffect, useState } from 'react'
import { chamarRpcPublica } from '../servicos/supabase'
import { Icone } from './Icone'

interface Aviso { id: number; texto: string; link: string | null; rotulo_link: string | null; tom: 'info' | 'destaque' | 'alerta' }
const CHAVE = 'oq-aviso-dispensado'
const CHAVE_ULTIMO = 'oq-aviso-ultimo'

function lerDispensado(): string {
  try { return localStorage.getItem(CHAVE) ?? '' } catch { return '' }
}
function lerGuardado(): Aviso | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ULTIMO)
    const a = bruto ? JSON.parse(bruto) as Aviso : null
    return a && typeof a.id === 'number' && typeof a.texto === 'string' ? a : null
  } catch { return null }
}

/**
 * Faixa no topo do site, escrita pelo administrador no painel. Quem fecha não
 * vê mais aquele aviso neste aparelho; um aviso novo volta a aparecer.
 */
export function AvisoSite() {
  // O último aviso visto já aparece na abertura: esperar o servidor para
  // desenhar a faixa empurrava a página inteira para baixo (deslocamento de
  // layout) a cada visita enquanto houvesse aviso. O servidor confirma logo
  // depois, e troca ou tira a faixa se o aviso mudou.
  const [aviso, definirAviso] = useState<Aviso | null>(() => {
    const guardado = lerGuardado()
    return guardado && String(guardado.id) !== lerDispensado() ? guardado : null
  })
  useEffect(() => {
    let vivo = true
    chamarRpcPublica<Aviso[]>('obter_aviso_site').then((lista) => {
      const a = lista?.[0] ?? null
      try {
        if (a) localStorage.setItem(CHAVE_ULTIMO, JSON.stringify(a))
        else localStorage.removeItem(CHAVE_ULTIMO)
      } catch { /* sem armazenamento */ }
      if (vivo) definirAviso(a && String(a.id) !== lerDispensado() ? a : null)
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
