import { useState } from 'react'
import { Icone } from '../../componentes/Icone'
import { grupoDe } from '../config'
import type { Estrutura, Faixa } from '../tipos'
import { LADO, SINGULAR, nomeCompleto, nomeDe, temNomePt } from '../dados/nomes'
import type { Ficha, Vinculo } from '../dados/fichas'
import { SecaoBiblioteca } from './SecaoBiblioteca'

interface Props {
  estrutura: Estrutura
  faixa?: Faixa
  ficha?: Ficha
  vinculo?: Vinculo
  favorita: boolean
  isolada: boolean
  aoFocar: () => void
  aoIsolar: () => void
  aoOcultar: () => void
  aoFavoritar: () => void
  aoFechar: () => void
  aoResponder: (titulo: string, ids: string[]) => void
}

/** Ficha da estrutura selecionada: o que importa para a ortopedia, com as questões e as classificações. */
export function PainelFicha(p: Props) {
  const { estrutura: e, ficha, vinculo } = p
  const grupo = grupoDe(e)
  const titulo = ficha && p.faixa ? ficha.nome : nomeCompleto(e, p.faixa)
  const [aba, definirAba] = useState<'classificacoes' | 'sobre'>(ficha?.biblioteca?.length ? 'classificacoes' : 'sobre')
  const secundario = [temNomePt(e) && e.la, !temNomePt(e) && e.la, e.en !== nomeDe(e) && e.en].filter(Boolean)[0] as string | undefined
  const nAnat = vinculo?.a.length ?? 0
  const nLes = vinculo?.l.length ?? 0

  return (
    <div className="at-ficha">
      <header className="at-ficha__topo">
        <div className="at-ficha__titulos">
          <p className="tr-heroi__selo">{SINGULAR[grupo]}{e.s !== 'm' ? ` · lado ${LADO[e.s]}` : ''}</p>
          <h2>{titulo}</h2>
          {secundario && <p className="at-ficha__latim">{secundario}</p>}
        </div>
        <button type="button" className="at-ficha__fechar" onClick={p.aoFechar} aria-label="Fechar a ficha"><Icone nome="fechar" tamanho={18} /></button>
      </header>

      <div className="at-ficha__acoes" role="group" aria-label="Ações">
        <button type="button" onClick={p.aoFocar}><Icone nome="alvo" tamanho={17} /><span>Focar</span></button>
        <button type="button" onClick={p.aoIsolar} aria-pressed={p.isolada}><Icone nome="olho" tamanho={17} /><span>{p.isolada ? 'Ver tudo' : 'Isolar'}</span></button>
        <button type="button" onClick={p.aoOcultar}><Icone nome="olho-riscado" tamanho={17} /><span>Esconder</span></button>
        <button type="button" onClick={p.aoFavoritar} aria-pressed={p.favorita}><Icone nome="estrela" tamanho={17} /><span>{p.favorita ? 'Salva' : 'Salvar'}</span></button>
      </div>

      {ficha ? (
        <>
          <div className="at-ficha__questoes">
            <button type="button" className="at-ouro" disabled={!nAnat} onClick={() => p.aoResponder(`Anatomia · ${ficha.nome}`, vinculo!.a)}>
              <Icone nome="alvo" tamanho={20} /><span><strong>Responder questões de anatomia</strong><small>{nAnat ? `${nAnat} ${nAnat === 1 ? 'questão' : 'questões'} sobre ${ficha.nome.toLowerCase()}` : 'Nenhuma questão de anatomia ligada ainda'}</small></span><Icone nome="direita" tamanho={18} />
            </button>
            <button type="button" className="at-cta at-cta--secundario" disabled={!nLes} onClick={() => p.aoResponder(`Fraturas e lesões · ${ficha.nome}`, vinculo!.l)}>
              <Icone nome="osso" tamanho={20} /><span><strong>Fraturas e lesões</strong><small>{nLes} {nLes === 1 ? 'questão' : 'questões'} de prova</small></span><Icone nome="direita" tamanho={18} />
            </button>
          </div>

          <div className="at-abas" role="tablist">
            {ficha.biblioteca?.length ? <button type="button" role="tab" aria-selected={aba === 'classificacoes'} onClick={() => definirAba('classificacoes')}>Classificações</button> : null}
            <button type="button" role="tab" aria-selected={aba === 'sobre'} onClick={() => definirAba('sobre')}>O que cai</button>
          </div>
          {aba === 'classificacoes' && ficha.biblioteca?.map((b) => b.s.length
            ? <SecaoBiblioteca key={b.c} capitulo={b.c} secoes={b.s} />
            : <SecaoBiblioteca key={b.c} capitulo={b.c} secoes={[]} />)}
          {aba === 'sobre' && (
            <div className="at-sobre">
              <p>Os temas de prova ligados a esta parte do esqueleto:</p>
              <ul className="at-etiquetas">{ficha.lesoes.map((s) => <li key={s}>{s}</li>)}</ul>
              <p className="at-nota">As fichas de músculos, nervos e vasos (origem, inserção, inervação e relevância cirúrgica) estão em preparação e entram só com fonte conferida.</p>
            </div>
          )}
        </>
      ) : (
        <div className="at-sobre">
          <p>{grupo === 'osso' ? 'A ficha ortopédica deste osso ainda está em preparação.' : 'A ficha ortopédica desta estrutura (origem, inserção, inervação, relações e relevância cirúrgica) ainda está em preparação: entra só com fonte conferida.'}</p>
          {!temNomePt(e) && <p className="at-nota">Nome em português em revisão; por enquanto mostramos o termo do catálogo de origem.</p>}
        </div>
      )}
    </div>
  )
}
