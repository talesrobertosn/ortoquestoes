import type { ReactNode } from 'react'
import { Icone } from '../../componentes/Icone'
import { nomeDaFonte, type IndiceAnatomico, type NoOsso, type RegistroAnatomico } from '../dados/anatomia'
import { CORES_RELACAO, ROTULO_RELACAO, relacionadosDe, type Relacao } from '../dados/relacoes'

interface Props {
  registro: RegistroAnatomico
  indice: IndiceAnatomico
  ativas: Set<Relacao>
  semGeometria: Relacao[]
  contexto: boolean
  aoAlternar: (r: Relacao) => void
  aoContexto: () => void
  aoIr: (chave: string) => void
}

/**
 * Ficha anatômica de músculo, nervo ou ligamento (redação própria a partir do livro de referência).
 * O essencial fica num quadro curto (origem, inserção, inervação, ação); o resto em seções que abrem.
 * Cada relação pode ser acesa no modelo, com a mesma cor do texto.
 */
export function FichaAnatomica({ registro: r, indice, ativas, semGeometria, contexto, aoAlternar, aoContexto, aoIr }: Props) {
  const relacionados = relacionadosDe(r, indice)
  const disponiveis = ([
    r.origem && 'origem', r.insercao && 'insercao', r.nervos?.length && 'nervo', relacionados.length && 'relacionadas',
  ].filter(Boolean)) as Relacao[]
  const nervos = (r.nervos ?? []).map((c) => indice.porChave.get(c)).filter(Boolean) as RegistroAnatomico[]
  const inerva = (r.inerva ?? []).map((c) => indice.porChave.get(c)).filter(Boolean) as RegistroAnatomico[]
  const semMarca = semGeometria.filter((x) => ativas.has(x))

  return (
    <div className="fa">
      {r.status !== 'verificado' && (
        <p className="fa-revisao"><Icone nome="alerta" tamanho={15} /><span><strong>{r.status === 'conflito' ? 'Ponto em revisão' : 'Aguardando conferência'}.</strong> {r.notas}</span></p>
      )}

      {disponiveis.length > 0 && (
        <div className="fa-controles" role="group" aria-label="Mostrar no modelo">
          {disponiveis.map((x) => (
            <button key={x} type="button" aria-pressed={ativas.has(x)} onClick={() => aoAlternar(x)} style={{ ['--fa-cor' as string]: CORES_RELACAO[x] }}>
              <i aria-hidden="true" />{ROTULO_RELACAO[x]}
            </button>
          ))}
          <button type="button" className="fa-controles__contexto" aria-pressed={contexto} onClick={aoContexto} title="Isola a estrutura com tudo o que se relaciona com ela">
            <Icone nome="olho" tamanho={15} />{contexto ? 'Sair das relações' : 'Só as relações'}
          </button>
        </div>
      )}
      {semMarca.length > 0 && (
        <p className="fa-nota">{semMarca.map((x) => ROTULO_RELACAO[x]).join(' e ')}: a marcação no modelo ainda não foi validada para esta estrutura. A localização está no texto abaixo.</p>
      )}

      <dl className="fa-quadro">
        {r.origem && <Linha cor={CORES_RELACAO.origem} rotulo="Origem">{r.origem.t}</Linha>}
        {r.insercao && <Linha cor={CORES_RELACAO.insercao} rotulo="Inserção">{r.insercao.t}</Linha>}
        {nervos.length > 0 && (
          <Linha cor={CORES_RELACAO.nervo} rotulo="Inervação">
            <span className="fa-chips">{nervos.map((n) => <Chip key={n.chave} r={n} aoIr={aoIr} extra={raizCurta(n.raizes)} />)}</span>
          </Linha>
        )}
        {r.acao && <Linha rotulo="Ação">{r.acao}</Linha>}
        {r.articulacao && <Linha rotulo="Articulação">{r.articulacao}</Linha>}
        {r.funcao && <Linha rotulo="Função">{r.funcao}</Linha>}
        {r.restringe && <Linha rotulo="Restringe">{r.restringe}</Linha>}
        {r.raizes && r.tipo === 'nervo' && <Linha rotulo="Raízes">{r.raizes}</Linha>}
        {r.sensitivo && <Linha rotulo="Sensitivo">{r.sensitivo}</Linha>}
      </dl>

      {r.clinica && (
        <section className="fa-clinica">
          <h3><Icone nome="osso" tamanho={15} /> Importância ortopédica</h3>
          <p>{r.clinica}</p>
        </section>
      )}

      {inerva.length > 0 && (
        <details className="fa-secao" open>
          <summary>Músculos que inerva <small>{inerva.length}</small></summary>
          <span className="fa-chips">{inerva.map((m) => <Chip key={m.chave} r={m} aoIr={aoIr} />)}</span>
        </details>
      )}
      {r.trajeto && (
        <details className="fa-secao" open={r.tipo === 'nervo'}>
          <summary>Trajeto</summary>
          <p>{r.trajeto}</p>
        </details>
      )}
      {(r.relacoes?.length || relacionados.length > 0) && (
        <details className="fa-secao">
          <summary>Relações anatômicas</summary>
          {r.relacoes?.map((t) => <p key={t}>{t}</p>)}
          {relacionados.length > 0 && <span className="fa-chips">{relacionados.map((x) => <Chip key={x.chave} r={x} aoIr={aoIr} />)}</span>}
        </details>
      )}
      {r.status === 'verificado' && r.notas && (
        <details className="fa-secao">
          <summary>Notas de conferência</summary>
          <p>{r.notas}</p>
        </details>
      )}
      <p className="fa-fonte">Fonte: {nomeDaFonte(indice, r)} Texto próprio do Orto Questões.</p>
    </div>
  )
}

/** Ficha do osso: músculos e ligamentos que se fixam nele (na faixa clicada, nos ossos longos). */
export function FixacoesDoOsso({ itens, indice, pontos, aoPontos, aoIr }: { itens: NoOsso[]; indice: IndiceAnatomico; pontos: boolean; aoPontos: () => void; aoIr: (chave: string) => void }) {
  const lista = (t: 'o' | 'i') => itens.filter((x) => x.t === t).map((x) => indice.porChave.get(x.c)).filter(Boolean) as RegistroAnatomico[]
  const origens = lista('o')
  const insercoes = lista('i')
  if (!origens.length && !insercoes.length) return null
  const comMarco = itens.some((x) => x.m?.length)
  return (
    <div className="fa">
      {comMarco && (
        <div className="fa-controles" role="group" aria-label="Mostrar no modelo">
          <button type="button" aria-pressed={pontos} onClick={aoPontos} style={{ ['--fa-cor' as string]: CORES_RELACAO.origem }}><i aria-hidden="true" />Mostrar os pontos no osso</button>
        </div>
      )}
      {origens.length > 0 && (
        <section className="fa-grupo" style={{ ['--fa-cor' as string]: CORES_RELACAO.origem }}>
          <h3><i aria-hidden="true" />Originam-se aqui <small>{origens.length}</small></h3>
          <span className="fa-chips">{origens.map((x) => <Chip key={x.chave} r={x} aoIr={aoIr} />)}</span>
        </section>
      )}
      {insercoes.length > 0 && (
        <section className="fa-grupo" style={{ ['--fa-cor' as string]: CORES_RELACAO.insercao }}>
          <h3><i aria-hidden="true" />Inserem-se aqui <small>{insercoes.length}</small></h3>
          <span className="fa-chips">{insercoes.map((x) => <Chip key={x.chave} r={x} aoIr={aoIr} />)}</span>
        </section>
      )}
      <p className="fa-fonte">Toque num nome para ir até a estrutura. Fonte: Netter, Atlas de Anatomia Ortopédica, 2ª ed.</p>
    </div>
  )
}

function Linha({ rotulo, cor, children }: { rotulo: string; cor?: string; children: ReactNode }) {
  return (
    <div className="fa-linha" style={cor ? { ['--fa-cor' as string]: cor } : undefined}>
      <dt>{cor && <i aria-hidden="true" />}{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  )
}

const TIPO: Record<string, string> = { musculo: 'músculo', nervo: 'nervo', ligamento: 'ligamento' }
function Chip({ r, aoIr, extra }: { r: RegistroAnatomico; aoIr: (c: string) => void; extra?: string }) {
  return (
    <button type="button" className={`fa-chip fa-chip--${r.tipo}`} onClick={() => aoIr(r.chave)} title={`Ir até: ${r.nome} (${TIPO[r.tipo] ?? r.tipo})`} disabled={!r.ids.length}>
      {r.nome}{extra && <small>{extra}</small>}
    </button>
  )
}

/** "C5–C6 (fascículo posterior)" → "C5–C6". */
function raizCurta(t?: string) { const m = t?.match(/^[CTLS]\(?\d\)?[\d–\-CTLS()]*/); return m ? m[0] : undefined }
