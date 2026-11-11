import { Icone } from '../../componentes/Icone'
import { grupoDe } from '../config'
import type { Area, Estrutura } from '../tipos'
import { nomeDe, temNomePt } from '../dados/nomes'
import { CORES_RELACAO, ROTULO_RELACAO, type Relacao } from '../dados/relacoes'

/** Onde a estrutura fica na anatomia sistemática: "Sistema muscular › Músculos do membro superior › …". */
export function Trilha({ passos }: { passos: string[] }) {
  if (!passos.length) return null
  return (
    <nav className="at-trilha" aria-label="Onde fica">
      <ol>{passos.map((p, i) => <li key={`${i}-${p}`}>{p}</li>)}</ol>
    </nav>
  )
}

/** Nome do músculo de uma área: a malha do modelo, quando existe; senão o nome que veio com a área. */
export function nomeDoMusculo(a: Area, estrutura: (id: string) => Estrutura | undefined) {
  const e = a.mu ? estrutura(`${a.mu}${a.s === 'e' ? '_l' : '_r'}`) ?? estrutura(a.mu) : undefined
  return { nome: e ? nomeDe(e) : a.nm ?? a.k, alvo: e }
}

interface PropsAreasDoOsso {
  areas: Area[]
  mostrar: boolean
  aoMostrar: () => void
  estrutura: (id: string) => Estrutura | undefined
  aoIr: (e: Estrutura) => void
  /** dentro da ficha do osso que já tem o botão de pintar (fixações do banco) */
  semBotao?: boolean
}

/**
 * Osso sem fixações no banco conferido (ou com mais músculos no modelo do que no banco): a lista vem
 * das áreas desenhadas no próprio osso pelo Z-Anatomy. Cada nome leva até o músculo.
 */
export function AreasDoOsso({ areas, mostrar, aoMostrar, estrutura, aoIr, semBotao }: PropsAreasDoOsso) {
  const grupo = (t: 'o' | 'i') => {
    const vistos = new Map<string, ReturnType<typeof nomeDoMusculo>>()
    for (const a of areas.filter((x) => x.t === t)) { const n = nomeDoMusculo(a, estrutura); if (!vistos.has(n.nome)) vistos.set(n.nome, n) }
    return [...vistos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  }
  const origens = grupo('o')
  const insercoes = grupo('i')
  if (!origens.length && !insercoes.length) return null
  return (
    <div className="fa">
      {!semBotao && <div className="fa-controles" role="group" aria-label="Mostrar no modelo">
        <button type="button" aria-pressed={mostrar} onClick={aoMostrar} style={{ ['--fa-cor' as string]: CORES_RELACAO.origem }}><i aria-hidden="true" />Pintar as áreas no osso</button>
      </div>}
      {([['o', origens, 'Originam-se aqui', CORES_RELACAO.origem], ['i', insercoes, 'Inserem-se aqui', CORES_RELACAO.insercao]] as const).map(([t, lista, titulo, cor]) => lista.length > 0 && (
        <section key={t} className="fa-grupo" style={{ ['--fa-cor' as string]: cor }}>
          <h3><i aria-hidden="true" />{titulo} <small>{lista.length}</small></h3>
          <span className="fa-chips">{lista.map((x) => (
            <button key={x.nome} type="button" className="fa-chip fa-chip--musculo" disabled={!x.alvo} onClick={() => x.alvo && aoIr(x.alvo)} title={x.alvo ? `Ir até: ${x.nome}` : x.nome}>{x.nome}</button>
          ))}</span>
        </section>
      ))}
      <p className="fa-fonte">Áreas desenhadas no modelo 3D (Z-Anatomy). Vermelho: origem · azul: inserção.</p>
    </div>
  )
}

interface PropsFichaGeral {
  estrutura: Estrutura
  /** áreas de origem e inserção do músculo, quando o modelo as tem */
  areas: Area[]
  ativas: Set<Relacao>
  aoAlternar: (r: Relacao) => void
  estruturaDe: (id: string) => Estrutura | undefined
  aoIr: (e: Estrutura) => void
}

/**
 * Ficha de quem ainda não está no banco anatômico conferido (órgãos, encéfalo, vasos, músculos da
 * cabeça…): só o que o próprio modelo garante. Nome (TA2), latim, inglês e, no músculo, em que ossos
 * ficam a origem e a inserção, com as áreas acesas no modelo.
 */
export function FichaGeral({ estrutura: e, areas, ativas, aoAlternar, estruturaDe, aoIr }: PropsFichaGeral) {
  const ossosDe = (t: 'o' | 'i') => {
    const m = new Map<string, Estrutura>()
    for (const a of areas) if (a.t === t && a.o) { const o = estruturaDe(a.o); if (o) m.set(o.id, o) }
    return [...m.values()]
  }
  const origem = ossosDe('o')
  const insercao = ossosDe('i')
  const disponiveis = ([origem.length && 'origem', insercao.length && 'insercao'].filter(Boolean)) as Relacao[]
  const grupo = grupoDe(e)
  return (
    <div className="fa">
      {disponiveis.length > 0 && (
        <div className="fa-controles" role="group" aria-label="Mostrar no modelo">
          {disponiveis.map((x) => (
            <button key={x} type="button" aria-pressed={ativas.has(x)} onClick={() => aoAlternar(x)} style={{ ['--fa-cor' as string]: CORES_RELACAO[x] }}>
              <i aria-hidden="true" />{ROTULO_RELACAO[x]}
            </button>
          ))}
        </div>
      )}
      <dl className="fa-quadro">
        {origem.length > 0 && <Linha cor={CORES_RELACAO.origem} rotulo="Origem"><Ossos lista={origem} aoIr={aoIr} /></Linha>}
        {insercao.length > 0 && <Linha cor={CORES_RELACAO.insercao} rotulo="Inserção"><Ossos lista={insercao} aoIr={aoIr} /></Linha>}
        {temNomePt(e) && e.la && <Linha rotulo="Latim"><em>{e.la}</em></Linha>}
        {e.en !== nomeDe(e) && <Linha rotulo="Inglês">{e.en}</Linha>}
      </dl>
      <p className="fa-nota">
        <Icone nome="livro" tamanho={14} /> {grupo === 'musculo' && disponiveis.length
          ? 'Origem e inserção pelas áreas desenhadas no modelo; a ficha com inervação e ação, conferida no livro, está em preparação.'
          : 'Ficha descritiva em preparação: entra só com fonte conferida. O nome segue a Terminologia Anatômica.'}
      </p>
    </div>
  )
}

function Ossos({ lista, aoIr }: { lista: Estrutura[]; aoIr: (e: Estrutura) => void }) {
  return <span className="fa-chips">{lista.map((o) => <button key={o.id} type="button" className="fa-chip" onClick={() => aoIr(o)} title={`Ir até: ${nomeDe(o)}`}>{nomeDe(o)}</button>)}</span>
}

function Linha({ rotulo, cor, children }: { rotulo: string; cor?: string; children: React.ReactNode }) {
  return (
    <div className="fa-linha" style={cor ? { ['--fa-cor' as string]: cor } : undefined}>
      <dt>{cor && <i aria-hidden="true" />}{rotulo}</dt>
      <dd>{children}</dd>
    </div>
  )
}
