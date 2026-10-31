import { useState, type CSSProperties, type MouseEvent } from 'react'
import { Icone } from '../../componentes/Icone'
import { corDaArea } from '../../dados/coresAreas'
import type { Indice } from '../../dados/tipos'
import { href } from '../../util/rotas'
import { AREAS_BIBLIOTECA, nomeArea } from '../busca'
import { capitulosDoResumo, estadoLeitura, numeroCapitulo, rotuloLivro } from '../estante'
import type { Leitura, Marca, ResumoCapitulo } from '../tipos'
import { Realce } from './BuscaPrincipal'
import { ESTADO_NOME, acaoLeitura, cliqueComum, idObra, parouEm, pctLido, provasDoCapitulo, type Obra } from './comum'

export type Agrupar = 'livro' | 'area' | 'nenhum'

/**
 * A Lista da Biblioteca 3.0 (31/10/2026): os mesmos resumos da estante, em linhas editoriais, para consultar rápido.
 * O título inteiro manda (nada de reticências); embaixo, o livro, o capítulo e a área; depois o tempo, as questões e as
 * provas (as duas primeiras à vista, as outras num toque); à direita, o progresso e um botão só com a ação certa.
 * Agrupa por livro (padrão), por área ou sem grupos; com busca, vêm os mais relevantes primeiro.
 */
export function Lista({ obras, filtrados, agrupar, relevancia, q, leituras, marcas, indice, premium, aoAbrir }: {
  obras: Obra[]
  filtrados: ResumoCapitulo[]
  agrupar: Agrupar
  /** Com busca na ordem padrão: lista corrida, do mais ao menos relevante. */
  relevancia: boolean
  q: string
  leituras: Record<string, Leitura | undefined>
  marcas: Marca[]
  indice: Indice | null
  premium: boolean
  aoAbrir: (c: ResumoCapitulo) => void
}) {
  const ids = new Set(filtrados.map((c) => c.id))
  const destaquesDe = (id: string) => marcas.filter((m) => m.capitulo === id && !m.marcador).length
  const linha = (c: ResumoCapitulo) => <LinhaResumo key={c.id} c={c} q={q} leitura={leituras[c.id]} destaques={destaquesDe(c.id)} indice={indice} fechado={c.acesso !== 'gratis' && !premium} aoAbrir={aoAbrir} />

  if (relevancia || agrupar === 'nenhum') return <ol className="bb-lista">{filtrados.map(linha)}</ol>

  const grupos = agrupar === 'livro'
    ? obras.map((o) => ({ id: idObra(o.livro) + '-l', titulo: o.apelido, sub: o.edicoes.join(' e '), sobre: o.sobre, cor: o.capa, total: o.capitulos.length, itens: filtrados.filter((c) => c.livro === o.livro) }))
    : AREAS_BIBLIOTECA.map((a) => ({ id: `bb-area-${a.slug}`, titulo: a.nome, sub: '', sobre: '', cor: corDaArea(a.slug), total: 0, itens: filtrados.filter((c) => c.especialidade === a.slug) }))
  return (
    <div className="bb-grupos">
      {grupos.filter((g) => g.itens.length).map((g) => {
        const lidos = g.itens.filter((c) => estadoLeitura(leituras[c.id]) === 'concluido').length
        return <section key={g.id} className="bb-grupo" aria-labelledby={g.id} style={{ '--capa': g.cor } as CSSProperties}>
          <header className="bb-grupo__topo">
            <span className="bb-grupo__marca" aria-hidden="true" />
            <h2 id={g.id}>{g.titulo}{g.sub && <small>{g.sub}</small>}</h2>
            <p className="bb-grupo__conta"><b className="numerico">{lidos}</b> de {g.itens.length} lidos{g.total > g.itens.length && ids.size ? <> · {g.itens.length} de {g.total} nesta busca</> : null}</p>
            {g.sobre && <p className="bb-grupo__sobre">{g.sobre}</p>}
          </header>
          <ol className="bb-lista">{g.itens.map(linha)}</ol>
        </section>
      })}
    </div>
  )
}

function LinhaResumo({ c, q, leitura, destaques, indice, fechado, aoAbrir }: {
  c: ResumoCapitulo; q: string; leitura?: Leitura; destaques: number; indice: Indice | null; fechado: boolean; aoAbrir: (c: ResumoCapitulo) => void
}) {
  const [todas, definirTodas] = useState(false)
  const estado = estadoLeitura(leitura)
  const pct = pctLido(leitura)
  const provas = provasDoCapitulo(indice, c.questoes)
  const caps = capitulosDoResumo(c)
  const n = numeroCapitulo(c)
  const ultimo = caps.length > 1 ? caps[caps.length - 1] : null
  const parou = parouEm(c, leitura)
  const abrirFicha = (e: MouseEvent<HTMLAnchorElement>) => { if (!cliqueComum(e)) return; e.preventDefault(); aoAbrir(c) }
  return (
    <li className={`bb-linha bb-linha--${estado}`} style={{ '--cor': corDaArea(c.especialidade) } as CSSProperties}>
      <span className="bb-linha__capa" aria-hidden="true"><small>{ultimo ? 'Caps.' : 'Cap.'}</small><b className="numerico">{ultimo ? caps[0] : n === Number.MAX_SAFE_INTEGER ? '·' : n}</b>{ultimo && <small>{caps.length > 2 ? 'a' : 'e'} {ultimo}</small>}</span>
      <div className="bb-linha__corpo">
        <h3 className="bb-linha__titulo"><a href={href(`/resumos/${c.id}`)} onClick={abrirFicha}><Realce texto={c.titulo} q={q} /></a></h3>
        <p className="bb-linha__ref">{rotuloLivro(c)}{n === Number.MAX_SAFE_INTEGER ? '' : ` · ${ultimo ? `Caps. ${caps[0]} ${caps.length > 2 ? 'a' : 'e'} ${ultimo}` : `Cap. ${n}`}`} · <span className="bb-linha__area"><i aria-hidden="true" />{nomeArea(c.especialidade)}</span>{fechado && <> · <Icone nome="cadeado" tamanho={12} /> Assinantes</>}</p>
        <p className="bb-linha__meta">
          <span><Icone nome="relogio" tamanho={14} /> ~{c.minutos} min</span>
          <span><Icone nome="alvo" tamanho={14} /> {c.questoes.length} {c.questoes.length === 1 ? 'questão de prova' : 'questões de prova'}</span>
          {c.treino.length > 0 && <span>{c.treino.length} {c.treino.length === 1 ? 'questão de simulado' : 'questões de simulado'}</span>}
          {destaques > 0 && <span><Icone nome="lapis" tamanho={14} /> {destaques} {destaques === 1 ? 'destaque' : 'destaques'}</span>}
        </p>
        {provas.length > 0 && <p className="bb-provas bb-provas--linha" aria-label={`Já caiu em ${provas.join(', ')}`}>
          {(todas ? provas : provas.slice(0, 2)).map((p) => <span key={p}>{p}</span>)}
          {provas.length > 2 && <button type="button" onClick={() => definirTodas(!todas)} aria-expanded={todas}>{todas ? 'Menos' : `+${provas.length - 2}`}</button>}
        </p>}
        {estado === 'andamento' && parou && <p className="bb-linha__parou">Parou em: {parou}</p>}
      </div>
      <div className="bb-linha__lado">
        <p className={`bb-estado bb-estado--${estado}`}>
          <span className="bb-anel" style={{ '--pct': pct } as CSSProperties} aria-hidden="true">{estado === 'concluido' ? <Icone nome="certo" tamanho={14} /> : null}</span>
          <span>{estado === 'andamento' ? `${pct}% lido` : ESTADO_NOME[estado]}</span>
        </p>
        <a className={`bb-linha__acao${estado === 'andamento' ? ' bb-linha__acao--forte' : ''}`} href={href(`/resumos/${c.id}`)}>{acaoLeitura(leitura)}<Icone nome="direita" tamanho={15} /></a>
      </div>
    </li>
  )
}
