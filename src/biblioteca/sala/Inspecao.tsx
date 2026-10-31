import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { Icone } from '../../componentes/Icone'
import { JanelaCentral } from '../../componentes/JanelaCentral'
import { corDaArea } from '../../dados/coresAreas'
import type { Indice } from '../../dados/tipos'
import { href, navegar } from '../../util/rotas'
import { nomeArea } from '../busca'
import { apelidoLivro, capitulosDoResumo, estadoLeitura, numeroCapitulo, tituloOriginal } from '../estante'
import { NOME_RARIDADE, raridade } from '../salao/segredos'
import type { Leitura, ResumoCapitulo } from '../tipos'
import { ESTADO_NOME, acaoLeitura, cliqueComum, corDaCapa, parouEm, pctLido, provasDoCapitulo, semMovimento, texturas } from './comum'
import { tocar } from './sons'

const ABRIR_MS = 380

/**
 * A ficha do volume (31/10/2026): o livro sai da estante e abre ao lado (no celular, sobe de baixo). Título inteiro,
 * livro, edição, capítulo, área, tempo, questões de prova e de simulado, as partes do resumo (cada uma abre o leitor
 * direto nela), as provas em que caiu e o progresso de verdade. Um botão só para ler, com o texto do estado
 * ("Ler o resumo", "Continuar a leitura", "Reler o resumo"); continuar abre na posição guardada pelo leitor.
 */
export function Inspecao({ c, selo, leitura, fechado, indice, destaques, aoFechar }: {
  c: ResumoCapitulo; selo?: string; leitura?: Leitura; fechado: boolean; indice: Indice | null; destaques: number; aoFechar: () => void
}) {
  const [abrindo, definirAbrindo] = useState(false)
  const [todasProvas, definirTodasProvas] = useState(false)
  const [todasPartes, definirTodasPartes] = useState(false)
  const relogio = useRef<number | undefined>(undefined)
  useEffect(() => { tocar('puxar') }, [c.id])
  useEffect(() => () => window.clearTimeout(relogio.current), [])
  const estado = estadoLeitura(leitura)
  const r = raridade(c.questoes.length)
  const provas = provasDoCapitulo(indice, c.questoes)
  const caps = capitulosDoResumo(c)
  const n = numeroCapitulo(c)
  const pct = pctLido(leitura)
  const parou = parouEm(c, leitura)
  const destino = `/resumos/${c.id}`
  const ler = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cliqueComum(e) || semMovimento()) return
    e.preventDefault()
    if (abrindo) return
    tocar('pagina')
    definirAbrindo(true)
    relogio.current = window.setTimeout(() => navegar(destino), ABRIR_MS)
  }
  const partes = c.secoes.filter((s) => !/^como ler/i.test(s.titulo))
  const original = tituloOriginal(c)
  return (
    <JanelaCentral aberta aoFechar={aoFechar} rotulo={`Ficha: ${c.titulo}`} className="bb-inspecao">
      <div className={`bb-insp bb-insp--${r}${abrindo ? ' bb-insp--abrindo' : ''}`} style={{ ...texturas(), '--cor': corDaArea(c.especialidade), '--capa': corDaCapa(c.livro) } as CSSProperties}>
        <span className="bb-insp__alca" aria-hidden="true" />
        <div className="bb-insp__palco" aria-hidden="true">
          <div className="bb-insp__livro">
            <span className="bb-insp__miolo"><i /><i /><i /></span>
            <span className="bb-insp__capa">
              <small>{apelidoLivro(c.livro)}</small>
              <b>{c.titulo}</b>
              <small>{caps.length > 1 ? `Caps. ${caps[0]}–${caps[caps.length - 1]}` : n === Number.MAX_SAFE_INTEGER ? '' : `Cap. ${n}`}</small>
            </span>
          </div>
          <span className="bb-insp__brilho" />
        </div>
        <div className="bb-insp__dados">
          {selo && <p className="bb-insp__selo">{selo}</p>}
          <p className="bb-insp__linha">
            <span className={`bb-raridade bb-raridade--${r}`}><span className={`bb-gema bb-gema--${r}`} /> {NOME_RARIDADE[r]} na prova</span>
            <span className="bb-insp__area"><i style={{ background: 'var(--cor)' }} /> {nomeArea(c.especialidade)}</span>
          </p>
          <h2 className="bb-insp__titulo">{c.titulo}</h2>
          <p className="bb-insp__ref">
            <b>{c.livro}</b>, {c.edicao.replace(/\s*,\s*com\s.*$/i, '')}.<br />
            {c.capitulo.split('·')[0].trim()}{original ? <> · <i lang="en">{original}</i></> : null}
          </p>
          <dl className="bb-insp__atributos">
            <div><dt>Leitura</dt><dd className="numerico">~{c.minutos} min</dd></div>
            <div><dt>Questões de prova</dt><dd className="numerico">{c.questoes.length}</dd></div>
            <div><dt>Simulados</dt><dd className="numerico">{c.treino.length}</dd></div>
            <div><dt>Partes</dt><dd className="numerico">{partes.length}</dd></div>
          </dl>

          <div className={`bb-insp__progresso bb-insp__progresso--${estado}`}>
            <span className="bb-barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
            <p><b>{estado === 'andamento' ? `${pct}% lido` : ESTADO_NOME[estado]}</b>{estado === 'andamento' && parou ? <> · parou em “{parou}”</> : null}{destaques > 0 ? <> · <a href={href('/resumos/caderno')}>{destaques} {destaques === 1 ? 'destaque' : 'destaques'} no caderno</a></> : null}</p>
          </div>

          <div className="bb-insp__acoes">
            <a className="bb-botao-ler" href={href(destino)} onClick={ler}>
              {fechado ? <Icone nome="cadeado" tamanho={18} /> : <Icone nome="livro" tamanho={18} />} {acaoLeitura(leitura)}
            </a>
            <button type="button" className="bb-botao-linha" onClick={aoFechar}>Devolver à estante</button>
          </div>

          {provas.length > 0 && <section className="bb-insp__bloco" aria-label="Provas em que o assunto caiu">
            <h3>Já caiu em</h3>
            <p className="bb-provas">{(todasProvas ? provas : provas.slice(0, 4)).map((x) => <span key={x}>{x}</span>)}
              {provas.length > 4 && <button type="button" onClick={() => definirTodasProvas(!todasProvas)} aria-expanded={todasProvas}>{todasProvas ? 'Menos' : `+${provas.length - 4} provas`}</button>}
            </p>
          </section>}

          {partes.length > 0 && <section className="bb-insp__bloco" aria-label="Partes do resumo">
            <h3>Partes do resumo</h3>
            <ol className="bb-insp__partes">
              {(todasPartes ? partes : partes.slice(0, 6)).map((s) => <li key={s.id}><a href={href(`/resumos/${c.id}?bloco=${encodeURIComponent(`h-${s.id}`)}`)}>{s.titulo}<Icone nome="direita" tamanho={14} /></a></li>)}
            </ol>
            {partes.length > 6 && <button type="button" className="bb-botao-texto" onClick={() => definirTodasPartes(!todasPartes)} aria-expanded={todasPartes}>{todasPartes ? 'Mostrar menos' : `Ver as ${partes.length} partes`}</button>}
          </section>}

          <section className="bb-insp__bloco" aria-label="Sobre o resumo">
            <h3>Em poucas linhas</h3>
            <p className="bb-insp__resumo">{c.resumo.length > 320 ? `${c.resumo.slice(0, 320).replace(/\s+\S*$/, '')}…` : c.resumo}</p>
            <p className="bb-insp__nota">Resumo autoral do OrtoQuestões, escrito a partir do capítulo citado. Não substitui o livro.</p>
          </section>
        </div>
      </div>
    </JanelaCentral>
  )
}
