import { memo, useRef } from 'react'
import { Icone } from '../../componentes/Icone'
import { grupoDe } from '../config'
import type { Estrutura, Faixa } from '../tipos'
import { LADO, SINGULAR, nomeCompleto, nomeDe, temNomePt } from '../dados/nomes'
import type { Ficha, Vinculo } from '../dados/fichas'
import type { IndiceAnatomico, RegistroAnatomico } from '../dados/anatomia'
import { relacionadosDe } from '../dados/relacoes'

interface Props {
  estrutura: Estrutura
  faixa?: Faixa
  ficha?: Ficha
  vinculo?: Vinculo
  registro?: RegistroAnatomico
  indice?: IndiceAnatomico | null
  isolada: boolean
  /** há uma estrutura vista antes / depois desta nesta visita ao atlas */
  podeVoltar: boolean
  podeAvancar: boolean
  aoDetalhes: () => void
  aoFocar: () => void
  aoIsolar: () => void
  aoVoltar: () => void
  aoAvancar: () => void
  aoFechar: () => void
  aoIr: (chave: string) => void
}

/**
 * Seleção rápida (redesenho de 27/10/2026): o primeiro toque numa estrutura só mostra este cartão
 * curto embaixo, com o nome, o que ela é e uma linha de contexto. O modelo continua livre para girar
 * e tocar na próxima estrutura, que troca o conteúdo do cartão na hora. "Ver detalhes" abre a ficha.
 */
export const CartaoRapido = memo(function CartaoRapido(p: Props) {
  const { estrutura: e, ficha, registro: r, indice } = p
  const grupo = grupoDe(e)
  const titulo = ficha && p.faixa ? ficha.nome : nomeCompleto(e, p.faixa)
  const secundario = temNomePt(e) ? e.la : e.en !== nomeDe(e) ? e.en : undefined
  const contexto = linhaDeContexto(p)
  const atalhos = r && indice ? atalhosDe(r, indice) : []
  // arrastar o cartão para baixo fecha a seleção (gesto de folha do iPhone), sem disputar com o modelo
  const arraste = useRef<{ y: number; id: number } | null>(null)
  const caixa = useRef<HTMLElement>(null)
  const mover = (dy: number) => { if (caixa.current) caixa.current.style.transform = dy > 0 ? `translateY(${dy}px)` : '' }

  return (
    <section ref={caixa} className="at-rapido" aria-label={`Seleção: ${titulo}`} aria-live="polite"
      onPointerDown={(ev) => { if ((ev.target as HTMLElement).closest('button')) return; arraste.current = { y: ev.clientY, id: ev.pointerId } }}
      onPointerMove={(ev) => { const a = arraste.current; if (a && a.id === ev.pointerId) mover(ev.clientY - a.y) }}
      onPointerUp={(ev) => { const a = arraste.current; arraste.current = null; mover(0); if (a && ev.clientY - a.y > 70) p.aoFechar() }}
      onPointerCancel={() => { arraste.current = null; mover(0) }}>
      <span className="at-rapido__alca" aria-hidden="true" />
      <div className="at-rapido__linha">
        <div className="at-rapido__titulos" key={`${e.id}|${p.faixa ?? ''}`}>
          <p className="at-rapido__selo"><i style={{ background: corDoGrupo(grupo) }} />{SINGULAR[grupo]}{e.s !== 'm' ? ` · ${LADO[e.s]}` : ''}</p>
          <h2>{titulo}</h2>
          {contexto ? <p className="at-rapido__contexto">{contexto}</p> : secundario && <p className="at-rapido__latim">{secundario}</p>}
        </div>
        <button type="button" className="at-rapido__fechar" onClick={p.aoFechar} aria-label="Limpar a seleção"><Icone nome="fechar" tamanho={18} /></button>
      </div>
      {atalhos.length > 0 && (
        <div className="at-rapido__atalhos" aria-label="Estruturas relacionadas">
          {atalhos.map((x) => <button key={x.chave} type="button" className={`fa-chip fa-chip--${x.tipo}`} onClick={() => p.aoIr(x.chave)}>{x.nome}</button>)}
        </div>
      )}
      <div className="at-rapido__acoes">
        <button type="button" className="at-rapido__detalhes" onClick={p.aoDetalhes}>Ver detalhes<Icone nome="cima" tamanho={16} /></button>
        <button type="button" className="at-rapido__icone" onClick={p.aoFocar} aria-label="Focar a câmera" title="Focar (F)"><Icone nome="alvo" tamanho={19} /></button>
        <button type="button" className="at-rapido__icone" onClick={p.aoIsolar} aria-pressed={p.isolada} aria-label={p.isolada ? 'Ver tudo' : 'Isolar'} title={p.isolada ? 'Ver tudo (I)' : 'Isolar (I)'}><Icone nome={p.isolada ? 'olho-riscado' : 'olho'} tamanho={19} /></button>
        <span className="at-rapido__trilha">
          <button type="button" className="at-rapido__icone" onClick={p.aoVoltar} disabled={!p.podeVoltar} aria-label="Estrutura anterior" title="Anterior"><Icone nome="esquerda" tamanho={19} /></button>
          <button type="button" className="at-rapido__icone" onClick={p.aoAvancar} disabled={!p.podeAvancar} aria-label="Próxima estrutura" title="Próxima"><Icone nome="direita" tamanho={19} /></button>
        </span>
      </div>
    </section>
  )
})

const CORES: Record<string, string> = { osso: '#cdbb98', musculo: '#b8473f', ligamento: '#b9ad7d', nervo: '#d9a406', arteria: '#c23b30', veia: '#3561b0', fascia: '#bdb59d' }
const corDoGrupo = (g: string) => CORES[g] ?? 'var(--verdete)'

/** Uma linha que diz o essencial sem abrir a ficha: o nervo do músculo, as raízes do nervo, o que o ligamento segura. */
function linhaDeContexto({ registro: r, indice, vinculo, ficha }: Props): string | undefined {
  if (r && indice) {
    const nervos = (r.nervos ?? []).map((c) => indice.porChave.get(c)?.nome).filter(Boolean)
    if (r.tipo === 'musculo' && nervos.length) return `Inervação: ${nervos.join(', ')}`
    if (r.tipo === 'nervo' && r.raizes) return `Raízes: ${r.raizes}`
    if (r.restringe) return `Restringe: ${r.restringe}`
    if (r.funcao) return r.funcao
    if (r.irriga) return `Irriga: ${r.irriga}`
    if (r.acao) return r.acao
  }
  if (ficha && vinculo) {
    const a = vinculo.a.length, l = vinculo.l.length
    const partes = [a && `${a} ${a === 1 ? 'questão' : 'questões'} de anatomia`, l && `${l} de prova`].filter(Boolean)
    if (partes.length) return partes.join(' · ')
  }
  return undefined
}

/** Até quatro atalhos: os nervos primeiro, depois o que se relaciona com a estrutura. */
function atalhosDe(r: RegistroAnatomico, indice: IndiceAnatomico): RegistroAnatomico[] {
  const nervos = (r.nervos ?? []).map((c) => indice.porChave.get(c)).filter((x): x is RegistroAnatomico => !!x)
  const vistos = new Set<string>()
  return [...nervos, ...relacionadosDe(r, indice)].filter((x) => x.ids.length && !vistos.has(x.chave) && vistos.add(x.chave)).slice(0, 4)
}
