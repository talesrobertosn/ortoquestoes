import { Icone } from '../../componentes/Icone'
import { GRUPOS, grupoDe } from '../config'
import type { Estrutura } from '../tipos'
import { LADO, nomeDe } from '../dados/nomes'
import { caminhoDoNo, type IndiceArvore } from '../dados/modos'
import { hex } from './cor'

interface Props {
  idx: IndiceArvore
  /** nós abertos agora (um sistema pode juntar mais de um nó, como artérias e veias) */
  nos: number[]
  titulo: string
  cor?: string
  estruturaDe: (id: string) => Estrutura | undefined
  aoAbrir: (no: number) => void
  aoSubir?: () => void
  aoEstrutura: (e: Estrutura) => void
  aoSair: () => void
}

/**
 * Navegar por sistema (Corpo inteiro): mostra onde se está (trilha), as partes logo abaixo, com quantas estruturas
 * cada uma tem, e, quando o grupo já é pequeno, as próprias estruturas. Cada clique desce um nível e o modelo
 * acompanha: liga as camadas, isola o grupo e enquadra.
 */
export function Navegador({ idx, nos, titulo, cor, estruturaDe, aoAbrir, aoSubir, aoEstrutura, aoSair }: Props) {
  const um = nos.length === 1 ? nos[0] : undefined
  const trilha = um !== undefined ? caminhoDoNo(idx, um).slice(0, -1) : []
  const filhos = nos.flatMap((n) => idx.filhos.get(n) ?? []).map((n) => ({ n, total: idx.ids.get(n)?.length ?? 0 })).filter((f) => f.total > 0).sort((a, b) => b.total - a.total)
  const ids = [...new Set(nos.flatMap((n) => idx.ids.get(n) ?? []))]
  // estruturas soltas: as que ficam direto neste nível (ou todas, se o grupo for pequeno)
  const soltas = (filhos.length === 0 || ids.length <= 24 ? ids : ids.filter((id) => nos.includes(idx.arvore.e[id])))
    .map(estruturaDe).filter(Boolean) as Estrutura[]
  const unicas = [...new Map(soltas.map((e) => [`${nomeDe(e)}|${e.s}`, e])).values()].sort((a, b) => nomeDe(a).localeCompare(nomeDe(b), 'pt'))
  return (
    <aside className="atlas__preset at-nav" aria-label={`Explorar: ${titulo}`} style={cor ? { ['--at-area' as string]: cor } : undefined}>
      <header>
        <p className="tr-heroi__selo">Explorar por sistema</p>
        <button type="button" className="at-botao-icone" onClick={aoSair} aria-label="Sair do sistema" title="Sair do sistema"><Icone nome="fechar" tamanho={16} /></button>
      </header>
      {(trilha.length > 0 || aoSubir) && (
        <nav className="at-nav__trilha" aria-label="Voltar para">
          {aoSubir && trilha.length === 0 && <button type="button" onClick={aoSubir}><Icone nome="esquerda" tamanho={13} />Sistemas</button>}
          {trilha.map((n) => <button key={n} type="button" onClick={() => aoAbrir(n)}>{idx.arvore.n[n][0]}</button>)}
        </nav>
      )}
      <h2>{titulo}</h2>
      <p className="at-nota">{ids.length} {ids.length === 1 ? 'estrutura' : 'estruturas'} em destaque · o resto fica translúcido</p>
      {filhos.length > 0 && (
        <ul className="at-nav__filhos">
          {filhos.map(({ n, total }) => (
            <li key={n}><button type="button" onClick={() => aoAbrir(n)}><span>{idx.arvore.n[n][0]}</span><small>{total}</small><Icone nome="direita" tamanho={14} /></button></li>
          ))}
        </ul>
      )}
      {unicas.length > 0 && (
        <>
          {filhos.length > 0 && <h3 className="at-titulo-secao">Neste nível</h3>}
          <ul className="at-nav__estruturas">
            {unicas.slice(0, 60).map((e) => (
              <li key={e.id}><button type="button" onClick={() => aoEstrutura(e)}>
                <span className="at-ponto" style={{ background: hex(GRUPOS[grupoDe(e)].cor) }} />{nomeDe(e)}{e.s !== 'm' && <small>{LADO[e.s]}</small>}
              </button></li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
