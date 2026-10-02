import { useEffect, useRef, useState } from 'react'
import { SITE } from '../config'
import { Icone } from './Icone'
import { createPortal } from 'react-dom'
import { recurso } from '../config'
import '@fontsource/pixelify-sans/latin-700.css'
import { IconeWhatsapp } from './ConviteCompartilhar'

/**
 * Convite para compartilhar o site, no máximo uma vez por dia: aparece depois
 * de 5 minutos de uso de verdade no dia (aba visível e alguém mexendo) e não
 * volta mais até o dia seguinte. Nunca interrompe uma sessão de questões nem
 * telas de login e pagamento: espera a pessoa sair delas. Quem compartilha
 * fica um mês sem ver.
 */

// Global em armazenamento.ts: sobrevive à limpeza de dados de visitante.
const CHAVE = 'ortoquestoes:convite-diario'
const USO_NECESSARIO = 5 * 60
const PASSO = 10
/** Sem toque, clique, tecla ou rolagem há mais que isto, o tempo não conta. */
const OCIOSO = 90_000
const PAUSA_COMPARTILHOU = 30 * 86_400_000
const ROTAS_PROTEGIDAS = ['sessao', 'entrar', 'assinatura', 'condicoes-assinatura', 'admin', 'emails']

const LINK = SITE.url.replace(/\/$/, '')
// Texto pronto, no tom de um colega indicando: sem exagero e sem emoji.
export const TEXTO_CONVITE = `Tô usando o ${SITE.nome} pra estudar pra prova de título. Tem as questões das provas oficiais (TEOT, TARO e outras) com comentário de cada alternativa, e dá pra usar de graça todo dia.

${LINK}`

const FALA = 'Psst! Cheguei com uma carta para você.'

type Estado = { dia: string; segundos: number; mostrado: boolean; pausaAte?: number }

function hoje(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
function ler(): Estado {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as Estado | null
    if (salvo && salvo.dia === hoje()) return salvo
    return { dia: hoje(), segundos: 0, mostrado: false, pausaAte: salvo?.pausaAte }
  } catch {
    return { dia: hoje(), segundos: 0, mostrado: false }
  }
}
function gravar(estado: Estado) {
  try { localStorage.setItem(CHAVE, JSON.stringify(estado)) } catch { /* sem armazenamento: não conta tempo */ }
}

/** Verdadeiro se o convite diário já apareceu hoje (para os outros convites não repetirem o pedido). */
export function conviteDiarioMostradoHoje(): boolean {
  return ler().mostrado
}

export function ConviteDiario({ caminho }: { caminho: string }) {
  const [aberto, definirAberto] = useState(false)
  const [copiado, definirCopiado] = useState<'' | 'link' | 'texto'>('')
  const [letras, definirLetras] = useState(0)
  const atividade = useRef(Date.now())
  const rota = useRef(caminho)
  rota.current = caminho

  useEffect(() => {
    const mexeu = () => { atividade.current = Date.now() }
    const eventos = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    eventos.forEach((e) => window.addEventListener(e, mexeu, { passive: true }))
    const relogio = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || Date.now() - atividade.current > OCIOSO) return
      const estado = ler()
      if (estado.mostrado || (estado.pausaAte ?? 0) > Date.now()) return
      estado.segundos += PASSO
      gravar(estado)
      if (estado.segundos < USO_NECESSARIO) return
      const primeiro = rota.current.replace(/^\//, '').split('/')[0]
      // Espera a pessoa sair da sessão (ou do login/pagamento) e de qualquer outra janela aberta.
      if (ROTAS_PROTEGIDAS.includes(primeiro) || document.querySelector('.jc')) return
      gravar({ ...estado, mostrado: true })
      definirAberto(true)
    }, PASSO * 1000)
    return () => {
      window.clearInterval(relogio)
      eventos.forEach((e) => window.removeEventListener(e, mexeu))
    }
  }, [])

  const compartilhou = () => gravar({ ...ler(), mostrado: true, pausaAte: Date.now() + PAUSA_COMPARTILHOU })
  const copiar = async (tipo: 'link' | 'texto') => {
    const conteudo = tipo === 'link' ? LINK : TEXTO_CONVITE
    try { await navigator.clipboard.writeText(conteudo) } catch { window.prompt('Copie:', conteudo) }
    definirCopiado(tipo)
    compartilhou()
  }
  const outros = typeof navigator !== 'undefined' && 'share' in navigator
  const outrosApps = async () => {
    try {
      await navigator.share({ title: SITE.nome, text: TEXTO_CONVITE })
      compartilhou()
      definirAberto(false)
    } catch { /* cancelou */ }
  }

  // A fala do mensageiro aparece letra a letra, como num diálogo de RPG (toque para pular).
  useEffect(() => {
    if (!aberto) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { definirLetras(FALA.length); return }
    definirLetras(0)
    const t = window.setInterval(() => definirLetras((n) => { if (n >= FALA.length) { window.clearInterval(t); return n } return n + 1 }), 32)
    return () => window.clearInterval(t)
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') definirAberto(false) }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [aberto])

  if (!aberto) return null
  // Não é modal: fica no canto (computador) ou sobe de baixo (celular) e a página continua usável.
  return createPortal(
    <aside className="cd nao-imprime" role="dialog" aria-modal="false" aria-labelledby="cd-titulo">
      <img className="cd__mensageiro" src={recurso('ranking/mensageiro.png')} width={72} height={90} alt="" draggable={false} />
      <button type="button" className="cd__fechar" onClick={() => definirAberto(false)} aria-label="Fechar"><Icone nome="fechar" tamanho={26} /></button>
      <p className="cd__quem">Mensageiro do {SITE.nome}</p>
      <p className="cd__fala" aria-label={FALA} onClick={() => definirLetras(FALA.length)}>
        <span aria-hidden="true">{FALA.slice(0, letras)}</span>{letras < FALA.length && <i className="cd__cursor" aria-hidden="true" />}
      </p>
      <header className="cd__topo">
        <img className="cd__carta" src={recurso('ranking/carta.png')} width={45} height={35} alt="" draggable={false} />
        <div>
          <p className="cd__selo">Nova missão</p>
          <h2 className="cd__titulo" id="cd-titulo">Recrute seus amigos</h2>
        </div>
      </header>
      <p className="cd__texto">
        O {SITE.nome} cresce no <b>boca a boca</b>. Chame os colegas da residência para estudar com você: tem <b>questões gratuitas todo dia</b>, e estudar junto rende mais.
      </p>
      <p className="cd__recompensa"><img src={recurso('ranking/chama.png')} width={18} height={18} alt="" /> <span><b>Recompensa:</b> rivais à altura no ranking e o {SITE.nome} crescendo.</span></p>
      <div className="cd__acoes">
        <a className="cd__botao cd__botao--whatsapp" href={`https://wa.me/?text=${encodeURIComponent(TEXTO_CONVITE)}`} target="_blank" rel="noopener noreferrer"
          onClick={() => { compartilhou(); definirAberto(false) }}>
          <IconeWhatsapp tamanho={20} /> Mandar no WhatsApp
        </a>
        <button type="button" className="cd__botao" onClick={() => copiar('texto')}>
          <Icone nome={copiado === 'texto' ? 'certo' : 'copiar'} tamanho={16} />{copiado === 'texto' ? 'Copiado!' : 'Copiar convite'}
        </button>
        <button type="button" className="cd__botao" onClick={() => copiar('link')}>
          <Icone nome={copiado === 'link' ? 'certo' : 'link'} tamanho={16} />{copiado === 'link' ? 'Copiado!' : 'Copiar link'}
        </button>
        {outros && <button type="button" className="cd__botao cd__botao--largo" onClick={outrosApps}><Icone nome="compartilhar" tamanho={16} /> Outros apps</button>}
      </div>
      <button type="button" className="cd__depois" onClick={() => definirAberto(false)}>Fica para a próxima</button>
    </aside>,
    document.body,
  )
}
