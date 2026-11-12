import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { SITE, recurso } from '../../config'
import { usarConta } from '../../conta/ContextoConta'
import { usarPremium } from '../../conta/premium'
import {
  DIAS_POR_AMIGO, QUESTOES_PARA_CONFIRMAR, linkIndicacao, textoIndicacao, usarMinhaIndicacao, type MinhaIndicacao,
} from '../../conta/indicacao'
import { href } from '../../util/rotas'
import { IconeWhatsapp } from '../ConviteCompartilhar'
import { Icone } from '../Icone'
import { Simbolo } from '../../marca/Simbolo'
import { BichoCarta, FOLHAS, type Fase } from './BichoCarta'
import { novosConfirmados, situacao, vagas, type Bicho, type Situacao } from './regras'
import './CartaConvite.css'

/**
 * A carta de convite (refeita em 12/11/2026, pedido do Tales): a coruja ou o gato chega andando pela borda de cima
 * com a cartinha, entrega, o envelope abre e por dentro vem o Indique e ganhe (7 dias para cada um quando o colega
 * responde 20 questões). Não é modal: fica no canto (computador) ou sobe de baixo (celular) e a página continua
 * usável. Quando aparece é decidido em ConviteDiario.tsx; aqui só a carta, carregada sob demanda.
 */

const LINK_SITE = SITE.url.replace(/\/$/, '')
/** Sem o link pessoal (visitante, link que não carregou ou as 12 indicações já feitas): o convite de sempre. */
export const TEXTO_CONVITE = `Tô usando o ${SITE.nome} pra estudar pra prova de título. Tem as questões das provas oficiais (TEOT, TARO e outras) com comentário de cada alternativa, e dá pra usar de graça todo dia.

${LINK_SITE}`

const CHAVE_VISTOS = 'ortoquestoes:convite-confirmados'
/** Quanto cada momento da cena dura (ms). */
const CHEGADA = 1300
const ENTREGA: Record<Bicho, number> = { gato: 660, coruja: 760 }
const SAIDA: Record<Bicho, { levantar: number; total: number }> = { gato: { levantar: 500, total: 1500 }, coruja: { levantar: 0, total: 850 } }

export interface PreviaCarta { logado: boolean; carregado: boolean; dados: MinhaIndicacao | null; premium: boolean; novos: number }

interface Props {
  bicho: Bicho
  aoFechar: () => void
  /** Compartilhou de verdade (WhatsApp, copiar ou outro app): grava a pausa de um mês. */
  aoCompartilhar: () => void
  /** Só na prévia (#/dev/convite): a situação fixa, sem conta nem servidor. */
  previa?: PreviaCarta
}

function lerVistos(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(CHAVE_VISTOS) ?? '{}') as Record<string, number> } catch { return {} }
}
function gravarVisto(usuario: string, confirmados: number) {
  try { localStorage.setItem(CHAVE_VISTOS, JSON.stringify({ ...lerVistos(), [usuario]: confirmados })) } catch { /* sem armazenamento */ }
}

const movimentoReduzido = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const FALAS: Record<Bicho, Record<Situacao | 'obrigado', string>> = {
  coruja: {
    visitante: 'Huu-huu! Trouxe um convite para você.',
    carregando: 'Huu-huu! Trouxe uma carta com o seu nome.',
    indicar: 'Huu-huu! Trouxe uma carta com o seu nome.',
    'sem-link': 'Huu-huu! Trouxe uma carta para você.',
    agradecer: 'Huu-huu! Trouxe notícia boa!',
    completo: 'Huu! A turma mandou um obrigado.',
    obrigado: `Obrigada! Quando o colega chegar às ${QUESTOES_PARA_CONFIRMAR} questões, eu volto com a notícia.`,
  },
  gato: {
    visitante: 'Miau! Trouxe um convite para você.',
    carregando: 'Miau. Deixei uma carta com o seu nome.',
    indicar: 'Miau. Deixei uma carta com o seu nome.',
    'sem-link': 'Miau. Deixei uma carta para você.',
    agradecer: 'Miau! Notícia boa chegando.',
    completo: 'Miau. A turma mandou um obrigado.',
    obrigado: `Obrigado! Quando o colega chegar às ${QUESTOES_PARA_CONFIRMAR} questões, eu volto para contar.`,
  },
}

export function CartaConvite({ bicho, aoFechar, aoCompartilhar, previa }: Props) {
  const { sessao } = usarConta()
  const real = usarMinhaIndicacao(previa ? null : sessao?.user.id)
  const { premium: premiumReal } = usarPremium()
  const usuario = sessao?.user.id
  const logado = previa ? previa.logado : !!usuario
  const dados = previa ? previa.dados : real.dados
  const carregado = previa ? previa.carregado : real.carregado
  const premium = previa ? previa.premium : premiumReal

  // Colegas confirmados desde a última carta: conta uma vez, quando os dados chegam, e guarda o que foi visto.
  const [novos, definirNovos] = useState(previa?.novos ?? 0)
  const contou = useRef(!!previa)
  useEffect(() => {
    if (contou.current || !usuario || !dados) return
    contou.current = true
    definirNovos(novosConfirmados(dados.confirmados, lerVistos()[usuario]))
    gravarVisto(usuario, dados.confirmados)
  }, [usuario, dados])

  const sit = situacao(logado, carregado, dados, novos)
  const reduzido = useRef(movimentoReduzido()).current
  const [fase, definirFase] = useState<Fase>(reduzido ? 'esperando' : 'chegando')
  const [aberta, definirAberta] = useState(reduzido)
  const [fechando, definirFechando] = useState(false)
  const [compartilhou, definirCompartilhou] = useState(false)
  const [copiado, definirCopiado] = useState<'' | 'link' | 'mensagem'>('')
  const timers = useRef<number[]>([])
  const depois = (ms: number, f: () => void) => { timers.current.push(window.setTimeout(f, ms)) }
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  // A cena de chegada: anda até o lugar, entrega a cartinha, o envelope abre.
  useEffect(() => {
    if (reduzido) return
    depois(CHEGADA, () => definirFase('entregando'))
    depois(CHEGADA + 260, () => definirAberta(true))
    depois(CHEGADA + ENTREGA[bicho], () => definirFase((f) => (f === 'entregando' ? 'esperando' : f)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fechar = () => {
    if (fechando) return
    if (reduzido) { aoFechar(); return }
    definirFechando(true)
    const s = SAIDA[bicho]
    if (s.levantar) { definirFase('levantando'); depois(s.levantar, () => definirFase('saindo')) } else definirFase('saindo')
    depois(s.total, aoFechar)
  }
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  })

  const comemorar = () => {
    aoCompartilhar()
    definirCompartilhou(true)
    if (!fechando) definirFase('feliz')
  }
  const olhar = (sim: boolean) => {
    if (fechando || compartilhou) return
    definirFase((f) => (sim && f === 'esperando' ? 'olhando' : !sim && f === 'olhando' ? 'esperando' : f))
  }

  // A fala aparece letra a letra, como num diálogo de RPG (toque para pular).
  const fala = compartilhou ? FALAS[bicho].obrigado : FALAS[bicho][sit]
  const [letras, definirLetras] = useState(0)
  useEffect(() => {
    if (!aberta) return
    if (reduzido) { definirLetras(fala.length); return }
    definirLetras(0)
    const t = window.setInterval(() => definirLetras((n) => { if (n >= fala.length) { window.clearInterval(t); return n } return n + 1 }), 30)
    return () => window.clearInterval(t)
  }, [aberta, fala, reduzido])

  const pessoal = (sit === 'indicar' || sit === 'agradecer') && !!dados
  const link = pessoal ? linkIndicacao(dados!.codigo) : LINK_SITE
  const mensagem = pessoal ? textoIndicacao(dados!.codigo) : TEXTO_CONVITE
  const temCompartilhar = typeof navigator !== 'undefined' && 'share' in navigator

  async function copiar(tipo: 'link' | 'mensagem') {
    const conteudo = tipo === 'link' ? link : mensagem
    try { await navigator.clipboard.writeText(conteudo) } catch { window.prompt('Copie:', conteudo) }
    definirCopiado(tipo)
    window.setTimeout(() => definirCopiado((c) => (c === tipo ? '' : c)), 2600)
    comemorar()
  }
  async function outrosApps() {
    try { await navigator.share({ title: SITE.nome, text: mensagem }); comemorar() } catch { /* cancelou */ }
  }

  const f = FOLHAS[bicho]
  const boca = { left: `calc(var(--cc-bicho-x) + ${f.boca[0] * f.esc}px)`, top: `${(f.boca[1] - f.chao) * f.esc}px` }

  return createPortal(
    <aside
      className={`cc cc--${bicho} cc--${sit}${aberta ? ' cc--aberta' : ''}${fechando ? ' cc--fechando' : ''} nao-imprime`}
      role="dialog" aria-modal="false" aria-labelledby="cc-titulo"
    >
      <BichoCarta bicho={bicho} fase={fase} />
      {fase === 'entregando' && <img className="cc__cartinha" src={recurso('pixel/mascote/carta-mini.png')} width={18} height={14} alt="" style={boca} />}

      <div className="cc__papel">
        <button type="button" className="cc__fechar" onClick={fechar} aria-label="Fechar"><Icone nome="fechar" tamanho={18} /></button>
        <div className="cc__dialogo">
          <p className="cc__quem">{bicho === 'coruja' ? 'Coruja' : 'Gato'} do {SITE.nome}</p>
          <p className="cc__fala" aria-label={fala} onClick={() => definirLetras(fala.length)}>
            <span aria-hidden="true">{fala.slice(0, letras)}</span>
            {letras < fala.length && <i className="cc__cursor" aria-hidden="true" />}
          </p>
        </div>

        <Conteudo sit={sit} dados={dados} novos={novos} premium={premium} />

        <div className="cc__acoes" onMouseEnter={() => olhar(true)} onMouseLeave={() => olhar(false)} onFocus={() => olhar(true)} onBlur={() => olhar(false)}>
          {sit === 'visitante' ? <>
            <a className="cc__botao cc__botao--principal" href={href('/indicar')} onClick={() => aoFechar()}>
              <Icone nome="usuario" tamanho={18} /> Criar conta e pegar meu link
            </a>
            <a className="cc__simples" href={`https://wa.me/?text=${encodeURIComponent(TEXTO_CONVITE)}`} target="_blank" rel="noopener noreferrer" onClick={comemorar}>
              <IconeWhatsapp tamanho={16} /> Só mandar o site no WhatsApp
            </a>
          </> : sit === 'carregando' ? <>
            <span className="cc__botao cc__botao--whatsapp cc__botao--espera" role="status"><IconeWhatsapp tamanho={20} /> Preparando o seu link…</span>
          </> : <>
            <a className="cc__botao cc__botao--whatsapp" href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer" onClick={comemorar}>
              <IconeWhatsapp tamanho={18} /> {pessoal ? 'Mandar meu link no WhatsApp' : 'Mandar no WhatsApp'}
            </a>
            <div className="cc__duplas">
              <button type="button" className="cc__botao" onClick={() => void copiar('link')}>
                <Icone nome={copiado === 'link' ? 'certo' : 'link'} tamanho={16} />{copiado === 'link' ? 'Link copiado' : pessoal ? 'Copiar meu link' : 'Copiar link'}
              </button>
              {temCompartilhar
                ? <button type="button" className="cc__botao" onClick={() => void outrosApps()}><Icone nome="compartilhar" tamanho={16} /> Outros apps</button>
                : <button type="button" className="cc__botao" onClick={() => void copiar('mensagem')}>
                    <Icone nome={copiado === 'mensagem' ? 'certo' : 'copiar'} tamanho={16} />{copiado === 'mensagem' ? 'Copiada' : 'Copiar mensagem'}
                  </button>}
            </div>
          </>}
        </div>

        <div className="cc__rodape">
          {logado && <a href={href('/indicar')} onClick={() => aoFechar()}>Ver minhas indicações</a>}
          <button type="button" onClick={fechar}>{compartilhou ? 'Fechar' : 'Agora não'}</button>
        </div>
      </div>

      {/* A frente do envelope: cobre a carta até o bicho entregar; a aba abre e o lacre salta. */}
      {!reduzido && <div className="cc__frente" aria-hidden="true">
        <span className="cc__aba" />
        <span className="cc__lacre"><Simbolo tamanho={28} variante="traco" /></span>
      </div>}
    </aside>,
    document.body,
  )
}

function Conteudo({ sit, dados, novos, premium }: { sit: Situacao; dados: MinhaIndicacao | null; novos: number; premium: boolean }) {
  const dias = DIAS_POR_AMIGO
  let selo: string, titulo: ReactNode, texto: ReactNode
  if (sit === 'visitante') {
    selo = 'Indique e ganhe'
    titulo = <>Ganhe {dias} dias e dê {dias} a um colega</>
    texto = <>Crie a conta grátis e pegue o seu link. Quando um colega entrar por ele e responder <b>{QUESTOES_PARA_CONFIRMAR} questões</b>, os dois ganham <b>{dias} dias do plano completo</b>.</>
  } else if (sit === 'agradecer') {
    selo = 'Carta de agradecimento'
    titulo = novos === 1 ? <>Um colega chegou às {QUESTOES_PARA_CONFIRMAR} questões!</> : <>{novos} colegas chegaram às {QUESTOES_PARA_CONFIRMAR} questões!</>
    texto = <>Entraram <b>{dias * novos} dias do plano completo</b> para você. Quer chamar mais alguém?</>
  } else if (sit === 'completo') {
    selo = 'Missão cumprida'
    titulo = <>Você completou as {dados?.limite ?? 12} indicações</>
    texto = <>Foram <b>{dados?.dias_ganhos ?? 0} dias</b> de plano completo. Obrigado por levar o {SITE.nome} para a sua turma!</>
  } else {
    selo = 'Indique e ganhe'
    titulo = <>Treine junto com um colega</>
    texto = <>Quando o colega criar a conta pelo seu link e responder <b>{QUESTOES_PARA_CONFIRMAR} questões</b>, os dois ganham <b>{dias} dias do plano completo</b>.</>
  }
  const bilhetes = sit !== 'completo'
  return <>
    <p className="cc__selo">{selo}</p>
    <h2 className="cc__titulo" id="cc-titulo">{titulo}</h2>
    {bilhetes && <div className="cc__bilhetes" aria-hidden="true">
      <span className="cc__bilhete"><b>+{sit === 'agradecer' ? dias * novos : dias}</b><small>dias para você</small></span>
      <span className="cc__mais">+</span>
      <span className="cc__bilhete cc__bilhete--colega"><b>+{dias}</b><small>{sit === 'agradecer' && novos > 1 ? 'para cada colega' : 'para o colega'}</small></span>
    </div>}
    <p className="cc__texto">{texto}</p>
    {dados && (sit === 'indicar' || sit === 'agradecer' || sit === 'completo') && <Placar dados={dados} />}
    {premium && (sit === 'indicar' || sit === 'agradecer') && <p className="cc__nota">Você já assina: os dias se somam ao seu plano.</p>}
    {sit === 'sem-link' && <p className="cc__nota">O seu link pessoal não carregou agora; o convite vai com o link do site.</p>}
  </>
}

function Placar({ dados }: { dados: MinhaIndicacao }) {
  const lista = vagas(dados)
  const caminho = lista.filter((v) => v === 'caminho').length
  const resumo = dados.confirmados === 0
    ? `0 de ${dados.limite} colegas`
    : `${dados.confirmados} de ${dados.limite} colegas · ${dados.dias_ganhos} dias`
  return (
    <div className="cc__placar">
      <ol className="cc__vagas" aria-hidden="true">{lista.map((v, i) => <li key={i} className={`cc__vaga cc__vaga--${v}`} />)}</ol>
      <p>{resumo}{caminho > 0 && <span> · {caminho} a caminho</span>}</p>
    </div>
  )
}
