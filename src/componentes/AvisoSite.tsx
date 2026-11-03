import { useEffect, useRef, useState } from 'react'
import { chamarRpcPublica } from '../servicos/supabase'
import { Icone } from './Icone'

interface Aviso { id: number; texto: string; link: string | null; rotulo_link: string | null; tom: 'info' | 'destaque' | 'alerta' }
const CHAVE = 'oq-aviso-dispensado'
const CHAVE_ULTIMO = 'oq-aviso-ultimo'

function lerDispensado(): string {
  try { return localStorage.getItem(CHAVE) ?? '' } catch { return '' }
}
/**
 * A cópia guardada só vale por VALIDADE_COPIA: sem rede, um aviso com prazo que já venceu no
 * servidor não fica na tela para sempre (o servidor é quem sabe o fim de cada aviso).
 */
const VALIDADE_COPIA = 12 * 3600 * 1000
function lerGuardado(): Aviso | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ULTIMO)
    const guardado = bruto ? JSON.parse(bruto) as { aviso?: Aviso; em?: number } : null
    const a = guardado?.aviso
    if (!a || typeof a.id !== 'number' || typeof a.texto !== 'string') return null
    return typeof guardado.em === 'number' && Date.now() - guardado.em < VALIDADE_COPIA ? a : null
  } catch { return null }
}

/**
 * Faixa no topo do site, escrita pelo administrador no painel. Quem fecha não
 * vê mais aquele aviso neste aparelho; um aviso novo volta a aparecer (cada
 * publicação no painel cria um aviso com id novo, e é o id que fica guardado).
 *
 * Compacta (01/11/2026): uma linha só, em qualquer largura; quando o texto não
 * cabe, "Ver mais" abre o texto inteiro e o link ali mesmo. Antes, no celular, a
 * faixa passava de 150 px e empurrava a página para baixo da primeira tela.
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
  const [aberto, definirAberto] = useState(false)
  const [cortado, definirCortado] = useState(false)
  const texto = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    let vivo = true
    chamarRpcPublica<Aviso[]>('obter_aviso_site').then((lista) => {
      const a = lista?.[0] ?? null
      try {
        if (a) localStorage.setItem(CHAVE_ULTIMO, JSON.stringify({ aviso: a, em: Date.now() }))
        else localStorage.removeItem(CHAVE_ULTIMO)
      } catch { /* sem armazenamento */ }
      if (vivo) definirAviso(a && String(a.id) !== lerDispensado() ? a : null)
    }).catch(() => undefined)
    return () => { vivo = false }
  }, [])
  // "Ver mais" só aparece quando a linha corta o texto (a largura muda ao girar o celular).
  useEffect(() => {
    const el = texto.current
    if (!el || aberto) return
    const medir = () => definirCortado(el.scrollWidth > el.clientWidth + 1)
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [aviso, aberto])
  if (!aviso) return null
  const fechar = () => { try { localStorage.setItem(CHAVE, String(aviso.id)) } catch { /* sem armazenamento */ } definirAviso(null) }
  const externo = aviso.link?.startsWith('https://')
  return <div className={`aviso-site aviso-site--${aviso.tom}${aberto ? ' aviso-site--aberto' : ''} nao-imprime`} role="status">
    <div className="conteudo aviso-site__interno">
      <span className="aviso-site__icone"><Icone nome={aviso.tom === 'alerta' ? 'alerta' : 'raio'} tamanho={14} /></span>
      <p ref={texto} id="aviso-site-texto" className="aviso-site__texto">{aviso.texto}{aviso.link && <> <a href={aviso.link} tabIndex={cortado && !aberto ? -1 : undefined} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{aviso.rotulo_link || 'Saiba mais'}</a></>}</p>
      {(cortado || aberto) && <button type="button" className="aviso-site__mais" aria-expanded={aberto} aria-controls="aviso-site-texto" onClick={() => definirAberto(!aberto)}>{aberto ? 'Ver menos' : 'Ver mais'}</button>}
      <button type="button" className="aviso-site__fechar" onClick={fechar} aria-label="Fechar aviso" title="Fechar aviso"><Icone nome="fechar" tamanho={16} /></button>
    </div>
  </div>
}
