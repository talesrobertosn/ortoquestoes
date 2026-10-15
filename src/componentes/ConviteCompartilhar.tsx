import { useEffect, useRef, useState } from 'react'
import { SITE, TEXTO_GRATIS } from '../config'
import { Simbolo } from '../marca/Simbolo'
import { Icone } from './Icone'

/**
 * Balão pequeno, no canto, convidando a compartilhar o site. Não bloqueia
 * nada e só aparece no resumo de uma sessão que foi bem (quem decide é a
 * página, pela prop `ativo`): é quando a pessoa está satisfeita. No máximo
 * uma vez por semana, contada de quando aparece, e some por meses se ela
 * compartilhou.
 */

// Global em armazenamento.ts: sobrevive à limpeza de dados de visitante.
const CHAVE = 'ortoquestoes:convite-compartilhar'
const DIA = 86_400_000
const PAUSA_ENTRE_EXIBICOES = 7 * DIA
/** Deixa a pessoa ver o resultado antes de o balão entrar. */
const ESPERA_ENTRADA = 1500
const PAUSA_COMPARTILHOU = 90 * DIA

// Texto que chega pronto no WhatsApp; *negrito* é a formatação do próprio app.
export const MENSAGEM = `Olá! Quero indicar o *Orto Questões*, um banco de questões de ortopedia que dá para usar de graça.

Reúne provas do TEOT, TARO, fellowships e R4, com comentário em cada alternativa e revisão das questões erradas. ${TEXTO_GRATIS.convite}

${SITE.url}`

function lerPausa(): number {
  try { return Number(localStorage.getItem(CHAVE)) || 0 } catch { return 0 }
}
function pausar(duracao: number) {
  try { localStorage.setItem(CHAVE, String(Date.now() + duracao)) } catch { /* sem armazenamento, só some nesta visita */ }
}
const CELULAR = '(max-width: 40rem)'
/** No celular o convite sai sozinho: é um lembrete, não uma parada. */
const DURACAO_CELULAR = 12_000

export function IconeWhatsapp({ tamanho = 18 }: { tamanho?: number }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2.2A9.8 9.8 0 0 0 3.6 17l-1.4 4.8 5-1.3A9.8 9.8 0 1 0 12 2.2Zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.2-.2-.5-.3Z" /></svg>
}

export function ConviteCompartilhar({ ativo }: { ativo: boolean }) {
  const [visivel, definirVisivel] = useState(false)
  const [digitando, definirDigitando] = useState(true)
  const [copiado, definirCopiado] = useState(false)
  const [saindo, definirSaindo] = useState(false)
  const [arraste, definirArraste] = useState<{ x: number; y: number } | null>(null)
  const [compacto, definirCompacto] = useState(() => window.matchMedia(CELULAR).matches)
  const toque = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const consulta = window.matchMedia(CELULAR)
    const aoMudar = () => definirCompacto(consulta.matches)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  useEffect(() => {
    if (!ativo || lerPausa() > Date.now()) return
    const t = window.setTimeout(() => {
      if (lerPausa() > Date.now()) return
      // Conta a partir de agora: recarregar ou voltar ao resumo não traz de volta.
      pausar(PAUSA_ENTRE_EXIBICOES)
      definirVisivel(true)
    }, ESPERA_ENTRADA)
    return () => window.clearTimeout(t)
  }, [ativo])

  useEffect(() => {
    if (!visivel) return
    const t = window.setTimeout(() => definirDigitando(false), 1100)
    return () => window.clearTimeout(t)
  }, [visivel])

  const fechar = (compartilhou = false) => {
    if (compartilhou) pausar(PAUSA_COMPARTILHOU)
    definirSaindo(true)
    window.setTimeout(() => { definirVisivel(false); definirSaindo(false); definirArraste(null) }, 220)
  }

  // No celular, sai sozinho se a pessoa só continuar estudando.
  useEffect(() => {
    if (!visivel || !compacto || copiado) return
    const t = window.setTimeout(() => fechar(), DURACAO_CELULAR)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visivel, compacto, copiado])

  if (!visivel) return null
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(SITE.url)
    } catch {
      window.prompt('Copie o link:', SITE.url)
    }
    definirCopiado(true)
    pausar(PAUSA_COMPARTILHOU)
    window.setTimeout(() => fechar(true), 2200)
  }

  if (compacto) {
    const desloca = arraste ? { transform: `translate(${arraste.x}px, ${Math.max(0, arraste.y)}px)`, opacity: 1 - Math.min(0.7, (Math.abs(arraste.x) + Math.max(0, arraste.y)) / 200), transition: 'none' } : undefined
    return (
      <aside
        className={'convite convite--compacto nao-imprime' + (saindo ? ' convite--saindo' : '')}
        role="dialog" aria-modal="false" aria-label="Convite para compartilhar o Orto Questões"
        style={desloca}
        onTouchStart={e => { toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
        onTouchMove={e => { if (toque.current) definirArraste({ x: e.touches[0].clientX - toque.current.x, y: e.touches[0].clientY - toque.current.y }) }}
        onTouchEnd={() => {
          toque.current = null
          if (arraste && (arraste.y > 36 || Math.abs(arraste.x) > 80)) fechar()
          else definirArraste(null)
        }}
      >
        <span className="convite__avatar"><Simbolo tamanho={18} /></span>
        <p className="convite__linha" aria-live="polite">{copiado ? <b>Link copiado. Obrigado!</b> : <>Gostando? <b>Mande para os colegas da residência.</b></>}</p>
        <a className="convite__icone convite__icone--whatsapp" href={`https://wa.me/?text=${encodeURIComponent(MENSAGEM)}`} target="_blank" rel="noopener noreferrer" aria-label="Enviar pelo WhatsApp" onClick={() => fechar(true)}><IconeWhatsapp tamanho={20} /></a>
        <button type="button" className="convite__icone" aria-label="Copiar link do site" onClick={copiar}><Icone nome={copiado ? 'certo' : 'link'} tamanho={18} /></button>
        <button type="button" className="convite__icone convite__icone--fechar" aria-label="Fechar convite" onClick={() => fechar()}><Icone nome="fechar" tamanho={18} /></button>
        <span className="convite__tempo" aria-hidden="true" style={{ animationDuration: `${DURACAO_CELULAR}ms` }} />
      </aside>
    )
  }

  return (
    <aside className={'convite nao-imprime' + (saindo ? ' convite--saindo' : '')} role="dialog" aria-modal="false" aria-labelledby="convite-titulo">
      <header className="convite__topo">
        <span className="convite__avatar"><Simbolo tamanho={20} /><i aria-hidden="true" /></span>
        <span className="convite__quem"><strong id="convite-titulo">Orto Questões</strong><small>projeto independente</small></span>
        <button type="button" className="convite__fechar" aria-label="Fechar convite" onClick={() => fechar()}><Icone nome="fechar" tamanho={16} /></button>
      </header>
      <div className="convite__conversa" aria-live="polite">
        {digitando ? <span className="convite__digitando" aria-label="digitando"><i /><i /><i /></span> : <>
          <p className="convite__balao">Que bom ter você estudando por aqui.</p>
          <p className="convite__balao">Tem colegas de residência estudando para o TEOT ou fellowship? <b>Mande o banco para eles.</b> Dá para usar de graça todo dia, e é o que mais ajuda o projeto a crescer.</p>
        </>}
      </div>
      {!digitando && <div className="convite__acoes">
        <a className="convite__whatsapp" href={`https://wa.me/?text=${encodeURIComponent(MENSAGEM)}`} target="_blank" rel="noopener noreferrer" onClick={() => fechar(true)}>
          <IconeWhatsapp />
          WhatsApp
        </a>
        <button type="button" className="convite__copiar" onClick={copiar}>
          <Icone nome={copiado ? 'certo' : 'link'} tamanho={16} />{copiado ? 'Link copiado' : 'Copiar link'}
        </button>
      </div>}
    </aside>
  )
}
