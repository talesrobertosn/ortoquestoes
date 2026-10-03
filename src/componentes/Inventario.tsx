import { useEffect, useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Medalha } from './Medalha'
import { Icone } from './Icone'
import { JanelaCentral } from './JanelaCentral'
import { EMBLEMAS_COM_IMAGEM } from '../dados/imagensEmblemas'
import { recurso } from '../config'
import {
  EMBLEMAS, FAMILIAS, VITRINE_MAXIMO, conquistaAtual, desbloqueado, valorDe, emblemaPorId, podeIrParaVitrine,
  type Emblema, type Metricas,
} from '../estado/conquistas'
import { META_STREAK_DIARIA } from '../estado/streak'

/**
 * Dica de um emblema: ao passar o mouse, ao focar pelo teclado ou ao tocar,
 * mostra a arte maior, o nome e o que foi preciso fazer para ganhá-lo.
 */
/** Telas de toque: a dica abre como um cartão por cima de tudo, fora da linha do ranking. */
const TOQUE = '(hover: none), (max-width: 40rem)'

export function Dica({ titulo, texto, arte, children }: { titulo: string; texto: string; arte?: ReactNode; children: ReactNode }) {
  const id = useId()
  const [aberta, setAberta] = useState(false)
  useEffect(() => {
    if (!aberta) return
    const fechar = () => setAberta(false)
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', tecla)
    window.addEventListener('scroll', fechar, { passive: true })
    return () => { window.removeEventListener('keydown', tecla); window.removeEventListener('scroll', fechar) }
  }, [aberta])
  return <span className="dica">
    <button type="button" className="dica__alvo" aria-describedby={id} aria-label={titulo} aria-expanded={aberta || undefined}
      onClick={(e) => {
        if (window.matchMedia(TOQUE).matches) { e.preventDefault(); e.stopPropagation(); setAberta((v) => !v) }
        else e.currentTarget.focus()
      }}>{children}</button>
    <span className="dica__balao" role="tooltip" id={id}>
      {arte && <span className="dica__arte">{arte}</span>}
      <strong>{titulo}</strong>
      <span>{texto}</span>
    </span>
    {aberta && createPortal(
      <div className="dica-folha" role="presentation" onClick={(e) => { e.stopPropagation(); setAberta(false) }}>
        <div className="dica-folha__cartao" role="dialog" aria-label={titulo}>
          {arte && <span className="dica-folha__arte">{arte}</span>}
          <strong>{titulo}</strong>
          <span>{texto}</span>
          <small>Toque para fechar</small>
        </div>
      </div>, document.body)}
  </span>
}

/** A fogueira da sequência viva: aparece sozinha ao lado do nome a partir de 3 dias. */
export function Fogueira({ dias, tamanho = 20, comTexto = false }: { dias: number; tamanho?: number; comTexto?: boolean }) {
  if (dias < 3) return null
  const rotulo = `${dias} dias seguidos`
  const desenho = <span className="fogueira" title={comTexto ? rotulo : undefined}>
    {EMBLEMAS_COM_IMAGEM.has('fogueira')
      ? <img src={recurso('emblemas/fogueira.png')} width={tamanho} height={tamanho} alt="" className="medalha--arte" draggable={false} />
      : <Icone nome="fogo" tamanho={tamanho} />}
    {comTexto ? <span>{rotulo}</span> : <span className="fogueira__numero">{dias}</span>}
  </span>
  if (comTexto) return desenho
  return <Dica titulo={`Sequência de ${dias} dias`} texto={`Estudou pelo menos ${META_STREAK_DIARIA} questões por dia, ${dias} dias seguidos. Se a sequência acabar, a fogueira apaga.`}
    arte={EMBLEMAS_COM_IMAGEM.has('fogueira') ? <img src={recurso('emblemas/fogueira.png')} width={64} height={64} alt="" className="medalha--arte" /> : undefined}>{desenho}</Dica>
}

/** Os emblemas que alguém mostra ao lado do nome: a vitrine escolhida ou, sem ela, o de questões. */
export function EmblemasDoNome({ ids, totalGeral, tamanho = 22 }: { ids: readonly string[] | null | undefined; totalGeral: number; tamanho?: number }) {
  const escolhidos = (ids ?? []).map(emblemaPorId).filter((e): e is Emblema => !!e && podeIrParaVitrine(e)).slice(0, VITRINE_MAXIMO)
  const lista = escolhidos.length ? escolhidos : [conquistaAtual(totalGeral)].filter(Boolean) as Emblema[]
  if (!lista.length) return null
  return <span className="emblemas-nome">
    {lista.map((e) => <Dica key={e.id} titulo={e.rotulo} texto={e.descricao} arte={<Medalha conquista={e} tamanho={64} />}>
      <Medalha conquista={e} tamanho={tamanho} />
    </Dica>)}
  </span>
}

function Progresso({ valor, meta }: { valor: number; meta: number }) {
  const pct = Math.min(100, Math.round((valor / meta) * 100))
  return <span className="inv-item__progresso" aria-label={`${valor.toLocaleString('pt-BR')} de ${meta.toLocaleString('pt-BR')}`}>
    <span className="inv-item__barra"><span style={{ width: `${pct}%` }} /></span>
    <small className="numerico">{Math.min(valor, meta).toLocaleString('pt-BR')} / {meta.toLocaleString('pt-BR')}</small>
  </span>
}

function ItemInventario({ emblema, metricas, naVitrine }: { emblema: Emblema; metricas: Metricas; naVitrine: boolean }) {
  const tem = desbloqueado(emblema, metricas)
  const oculta = emblema.secreta && !tem
  return <li className={'inv-item' + (tem ? ' inv-item--tem' : '') + (oculta ? ' inv-item--secreta' : '') + ` inv-item--${emblema.nivel}`}>
    <span className="inv-item__arte">
      {oculta ? <span className="inv-item__misterio" aria-hidden="true">?</span> : <Medalha conquista={emblema} tamanho={72} bloqueada={!tem} />}
      {naVitrine && <span className="inv-item__vitrine" title="Na sua vitrine"><Icone nome="estrela" tamanho={12} /></span>}
    </span>
    <strong>{oculta ? 'Conquista secreta' : emblema.rotulo}</strong>
    <small className="inv-item__descricao">{oculta ? 'Continue estudando para descobrir.' : emblema.descricao}</small>
    {tem ? <small className="inv-item__ok">Conquistado</small> : !oculta && <Progresso valor={valorDe(emblema, metricas)} meta={emblema.minimo} />}
  </li>
}

/** Janela para escolher até três conquistas desbloqueadas para a vitrine. */
function EscolherVitrine({ aberta, aoFechar, metricas, atuais, salvar }: {
  aberta: boolean; aoFechar: () => void; metricas: Metricas; atuais: string[]; salvar: (ids: string[]) => Promise<string | null>
}) {
  const [escolhidos, definirEscolhidos] = useState<string[]>(atuais)
  const [salvando, definirSalvando] = useState(false)
  const [erro, definirErro] = useState<string | null>(null)
  const disponiveis = EMBLEMAS.filter((e) => podeIrParaVitrine(e) && desbloqueado(e, metricas))
  const alternar = (id: string) => definirEscolhidos((lista) => lista.includes(id) ? lista.filter((x) => x !== id) : lista.length >= VITRINE_MAXIMO ? lista : [...lista, id])
  const confirmar = async () => {
    definirSalvando(true); definirErro(null)
    const falha = await salvar(escolhidos)
    definirSalvando(false)
    if (falha) definirErro(falha); else aoFechar()
  }
  return <JanelaCentral aberta={aberta} aoFechar={aoFechar} rotulo="Escolher emblemas da vitrine" className="inv-janela">
    <div className="inv-janela__corpo empilha">
      <div>
        <p className="meta">VITRINE</p>
        <h2>Escolha até {VITRINE_MAXIMO} emblemas</h2>
        <p className="texto-2">Eles aparecem ao lado do seu nome no ranking. A fogueira da sequência aparece sozinha enquanto ela estiver viva.</p>
      </div>
      <div className="inv-janela__slots" aria-label="Escolhidos">
        {Array.from({ length: VITRINE_MAXIMO }, (_, i) => {
          const e = escolhidos[i] ? emblemaPorId(escolhidos[i]) : undefined
          return <span key={i} className={'inv-slot' + (e ? ' inv-slot--cheio' : '')}>{e ? <Medalha conquista={e} tamanho={44} titulo={e.rotulo} /> : <span className="inv-slot__vazio">{i + 1}</span>}</span>
        })}
      </div>
      {disponiveis.length === 0
        ? <p className="texto-2">Você ainda não tem conquistas para mostrar. A primeira chega com 50 questões respondidas.</p>
        : <ul className="inv-escolha">
          {disponiveis.map((e) => {
            const marcado = escolhidos.includes(e.id)
            return <li key={e.id}>
              <button type="button" className={'inv-escolha__item' + (marcado ? ' inv-escolha__item--marcado' : '')} aria-pressed={marcado}
                disabled={!marcado && escolhidos.length >= VITRINE_MAXIMO} onClick={() => alternar(e.id)}>
                <Medalha conquista={e} tamanho={44} />
                <span>{e.rotulo}</span>
              </button>
            </li>
          })}
        </ul>}
      {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
      <div className="inv-janela__acoes">
        <button type="button" className="botao botao--fantasma" onClick={() => definirEscolhidos([])} disabled={!escolhidos.length}>Limpar</button>
        <button type="button" className="botao botao--principal" onClick={confirmar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar vitrine'}</button>
      </div>
    </div>
  </JanelaCentral>
}

/**
 * Inventário de conquistas: o cartão do jogador (toque no nome para montar a
 * vitrine) e todas as conquistas por família, com progresso das que faltam.
 */
export function Inventario({ metricas, nome, vitrine, salvarVitrine, podeEscolher, abrirEscolha = false }: {
  metricas: Metricas; nome: string; vitrine: string[]; salvarVitrine: (ids: string[]) => Promise<string | null>; podeEscolher: boolean; abrirEscolha?: boolean
}) {
  const [escolhendo, definirEscolhendo] = useState(false)
  // Vindo de um atalho "escolher emblemas" (ranking, conta), a janela já abre.
  useEffect(() => { if (abrirEscolha && podeEscolher) definirEscolhendo(true) }, [abrirEscolha, podeEscolher])
  return <section className="cartao cartao__corpo inv" aria-label="Seus emblemas">
    <button type="button" className="inv-jogador" onClick={() => definirEscolhendo(true)} disabled={!podeEscolher}
      aria-label={podeEscolher ? `${nome}: escolher emblemas da vitrine` : nome}>
      <span className="inv-jogador__nome">{nome}</span>
      <span className="inv-jogador__vitrine">
        {Array.from({ length: VITRINE_MAXIMO }, (_, i) => {
          const e = vitrine[i] ? emblemaPorId(vitrine[i]) : undefined
          return <span key={i} className={'inv-slot' + (e ? ' inv-slot--cheio' : '')}>{e ? <Medalha conquista={e} tamanho={44} titulo={e.rotulo} /> : <span className="inv-slot__vazio" aria-hidden="true">+</span>}</span>
        })}
      </span>
      <Fogueira dias={metricas.sequencia} tamanho={22} comTexto />
      {podeEscolher
        ? <span className="inv-jogador__cta"><Icone nome="estrela" tamanho={16} /> {vitrine.length ? 'Trocar os emblemas do meu nome' : `Escolher meus ${VITRINE_MAXIMO} emblemas`}</span>
        : <small className="inv-jogador__dica">Em breve você vai poder escolher 3 emblemas para aparecer ao lado do seu nome.</small>}
      {podeEscolher && <small className="inv-jogador__dica">Eles aparecem ao lado do seu nome no ranking, para todo mundo ver.</small>}
    </button>

    {FAMILIAS.map((f) => {
      const lista = EMBLEMAS.filter((e) => e.familia === f.id)
      const feitas = lista.filter((e) => desbloqueado(e, metricas)).length
      return <div key={f.id} className="inv-familia">
        <h3 className="inv-familia__titulo">{f.titulo} <small className="numerico">{feitas}/{lista.length}</small></h3>
        {f.id === 'sequencia' && <p className="texto-2 inv-familia__nota">Conta enquanto a sequência está viva. Perdeu um dia, ela recomeça do zero.</p>}
        <ul className="inv-grade">
          {lista.map((e) => <ItemInventario key={e.id} emblema={e} metricas={metricas} naVitrine={vitrine.includes(e.id)} />)}
        </ul>
      </div>
    })}

    {escolhendo && <EscolherVitrine aberta={escolhendo} aoFechar={() => definirEscolhendo(false)} metricas={metricas} atuais={vitrine} salvar={salvarVitrine} />}
  </section>
}
