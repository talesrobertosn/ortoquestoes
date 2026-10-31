import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { carregarCapitulo, carregarIndiceBiblioteca, textosDoCapitulo } from '../biblioteca/conteudo'
import { resolverAncora } from '../biblioteca/ancoras'
import { CORES, type Capitulo, type CorMarca, type IndiceBiblioteca, type Marca } from '../biblioteca/tipos'
import { AREAS_BIBLIOTECA } from '../biblioteca/busca'
import { usarBiblioteca } from '../biblioteca/usarBiblioteca'
import { Icone } from '../componentes/Icone'
import { Carregando, Estado } from '../componentes/Estados'
import { href } from '../util/rotas'
import { LeitorResumo } from './LeitorResumo'
import { gravar } from '../estado/armazenamento'
import { Biblioteca } from '../biblioteca/sala/Biblioteca'
import '../estilos/paginas/Resumos.css'

/** Adendo da Biblioteca: as frases "Na prova" (o antigo Resumão), em #/resumos/frases. */
const FrasesQueCaem = lazy(() => import('./Resumao').then(({ Resumao }) => ({ default: Resumao })))

/**
 * Biblioteca OrtoQuestões (#/resumos, 16/10/2026; no menu desde 30/10/2026).
 * - #/resumos: a Biblioteca 3.0 (31/10/2026, biblioteca/sala/Biblioteca.tsx): o salão pintado, a estante por obra e a
 *   lista, com a mesma busca e os mesmos filtros no endereço.
 * - #/resumos/<capítulo>?bloco=<id>: o leitor (LeitorResumo).
 * - #/resumos/caderno: Meu caderno de estudo (todas as marcações e notas).
 * - #/resumos/frases: adendo com as frases que caem (o antigo Resumão, 16/10/2026).
 */

const ESPECIALIDADES = AREAS_BIBLIOTECA
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const NOME_COR: Record<CorMarca, string> = { amarelo: 'Amarelo', verde: 'Verde', azul: 'Azul', rosa: 'Rosa', roxo: 'Roxo' }

export function Resumos({ segmentos, consulta }: { segmentos: string[]; consulta: URLSearchParams }) {
  // Quem abriu a biblioteca passa a ver "Estudar este assunto" nas questões (fase de testes, sem menu).
  useEffect(() => { gravar('resumos:visto', true) }, [])
  const sub = segmentos[1]
  if (sub === 'caderno') return <Caderno />
  if (sub === 'frases') return <Suspense fallback={<Carregando linhas={6} rotulo="Carregando as frases" />}><FrasesQueCaem /></Suspense>
  if (sub) return <LeitorResumo id={sub} consulta={consulta} />
  return <Biblioteca consulta={consulta} />
}

function usarIndiceBiblioteca() {
  const [dados, definir] = useState<IndiceBiblioteca | null | undefined>(undefined)
  useEffect(() => { carregarIndiceBiblioteca().then(definir).catch(() => definir(null)) }, [])
  return dados
}

// ─── Meu caderno de estudo ────────────────────────────────────────────────

function Caderno() {
  const dados = usarIndiceBiblioteca()
  const { marcas, leituras } = usarBiblioteca()
  const [capitulos, definirCapitulos] = useState<Map<string, Capitulo>>(new Map())
  const [filtro, definirFiltro] = useState<{ capitulo: string | null; area: string | null; cor: CorMarca | null; texto: string; so: 'todas' | 'notas' | 'favoritas' }>({ capitulo: null, area: null, cor: null, texto: '', so: 'todas' })
  const [ordem, definirOrdem] = useState<'recentes' | 'antigas' | 'capitulo'>('recentes')
  const [sequencia, definirSequencia] = useState<number | null>(null)
  const ids = useMemo(() => [...new Set(marcas.map((m) => m.capitulo))], [marcas])
  useEffect(() => {
    let vivo = true
    Promise.all(ids.map((i) => carregarCapitulo(i).catch(() => null))).then((lista) => { if (vivo) definirCapitulos(new Map(lista.filter((c): c is Capitulo => !!c).map((c) => [c.id, c]))) })
    return () => { vivo = false }
  }, [ids.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  if (dados === undefined) return <Carregando linhas={5} rotulo="Abrindo o caderno" />
  const resumoDe = (id: string) => dados?.capitulos.find((c) => c.id === id)
  const info = (m: Marca) => {
    const c = capitulos.get(m.capitulo)
    if (!c) return { secao: '', orfa: false, bloco: m.ancora.trechos[0]?.bloco }
    const t = textosDoCapitulo(c)
    const r = resolverAncora(m.ancora, t.ordem, t.textos)
    const bloco = r.trechos[0]?.bloco
    return { secao: c.secoes.find((s) => s.id === t.secaoDe.get(bloco))?.titulo ?? '', orfa: r.estado === 'orfa', bloco }
  }
  const q = normalizar(filtro.texto.trim())
  const lista = marcas.filter((m) => !m.marcador)
    .filter((m) => (!filtro.capitulo || m.capitulo === filtro.capitulo) && (!filtro.area || resumoDe(m.capitulo)?.especialidade === filtro.area) && (!filtro.cor || m.cor === filtro.cor)
      && (filtro.so !== 'notas' || m.nota.trim()) && (filtro.so !== 'favoritas' || m.favorita)
      && (!q || normalizar(`${m.ancora.trechos.map((t) => t.exato).join(' ')} ${m.nota}`).includes(q)))
    .sort((a, b) => ordem === 'recentes' ? b.criadaEm - a.criadaEm : ordem === 'antigas' ? a.criadaEm - b.criadaEm : a.capitulo.localeCompare(b.capitulo) || a.criadaEm - b.criadaEm)
  const emAndamento = Object.values(leituras).filter((l) => l.em && !l.concluidoEm)

  function exportar() {
    const linhas = [`# Meu caderno de estudo · OrtoQuestões`, `Exportado em ${new Date().toLocaleDateString('pt-BR')}. Trechos de resumos autorais do OrtoQuestões; referências dos livros indicadas.`, '']
    for (const id of [...new Set(lista.map((m) => m.capitulo))]) {
      const r = resumoDe(id)
      linhas.push(`## ${r?.titulo ?? id}`, r ? `_${r.livro}, ${r.edicao}. ${r.capitulo}._` : '', '')
      for (const m of lista.filter((x) => x.capitulo === id)) {
        const i = info(m)
        linhas.push(`- **${NOME_COR[m.cor]}**${i.secao ? ` · ${i.secao}` : ''}: “${m.ancora.trechos.map((t) => t.exato).join(' … ')}”`)
        if (m.nota.trim()) linhas.push(`  - Nota: ${m.nota.trim().replace(/\n/g, '\n    ')}`)
      }
      linhas.push('')
    }
    const blob = new Blob([linhas.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `caderno-ortoquestoes-${new Date().toISOString().slice(0, 10)}.md`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const atual = sequencia !== null ? lista[sequencia] : null
  return (
    <div className="rs empilha-2">
      <header className="rs-topo rs-topo--caderno">
        <a className="rs-voltar" href={href('/resumos')}><Icone nome="esquerda" tamanho={16} /> Biblioteca</a>
        <h1>Meu caderno de estudo</h1>
        <p>Todos os seus destaques e notas dos resumos, de todos os aparelhos. Toque num trecho para abrir o resumo exatamente ali.</p>
        <div className="rs-topo__acoes">
          {lista.length > 0 && <button type="button" className="botao botao--principal" onClick={() => definirSequencia(0)}><Icone nome="direita" tamanho={16} /> Revisar em sequência ({lista.length})</button>}
          {lista.length > 0 && <button type="button" className="botao" onClick={exportar}><Icone nome="baixar" tamanho={16} /> Exportar minhas notas</button>}
        </div>
      </header>

      {atual && <section className="rs-sequencia" aria-label="Revisão em sequência">
        <p className="rs-rotulo">{sequencia! + 1} de {lista.length} · {resumoDe(atual.capitulo)?.titulo}</p>
        <blockquote className={`rs-sequencia__trecho rs-cor--${atual.cor}`}>{atual.ancora.trechos.map((t) => t.exato).join(' … ')}</blockquote>
        {atual.nota && <p className="rs-sequencia__nota">{atual.nota}</p>}
        <div className="rs-sequencia__acoes">
          <button type="button" className="botao" disabled={sequencia === 0} onClick={() => definirSequencia(sequencia! - 1)}><Icone nome="esquerda" tamanho={16} /> Anterior</button>
          <a className="botao" href={href(`/resumos/${atual.capitulo}?bloco=${encodeURIComponent(info(atual).bloco ?? '')}`)}>Ver no contexto</a>
          {sequencia! < lista.length - 1 ? <button type="button" className="botao botao--principal" onClick={() => definirSequencia(sequencia! + 1)}>Próximo <Icone nome="direita" tamanho={16} /></button> : <button type="button" className="botao botao--principal" onClick={() => definirSequencia(null)}>Terminar</button>}
        </div>
      </section>}

      <div className="rs-filtros">
        <input type="search" value={filtro.texto} onChange={(e) => definirFiltro({ ...filtro, texto: e.target.value })} placeholder="Buscar nos destaques e notas" aria-label="Buscar nas marcações" />
        <div className="rs-filtros__areas">
          <select value={filtro.capitulo ?? ''} onChange={(e) => definirFiltro({ ...filtro, capitulo: e.target.value || null })} aria-label="Capítulo"><option value="">Todos os capítulos</option>{ids.map((i) => <option key={i} value={i}>{resumoDe(i)?.titulo ?? i}</option>)}</select>
          <select value={filtro.area ?? ''} onChange={(e) => definirFiltro({ ...filtro, area: e.target.value || null })} aria-label="Especialidade"><option value="">Todas as especialidades</option>{ESPECIALIDADES.map((e) => <option key={e.slug} value={e.slug}>{e.nome}</option>)}</select>
          <select value={filtro.so} onChange={(e) => definirFiltro({ ...filtro, so: e.target.value as typeof filtro.so })} aria-label="Mostrar"><option value="todas">Todos os destaques</option><option value="notas">Só com nota</option><option value="favoritas">Só favoritos</option></select>
          <select value={ordem} onChange={(e) => definirOrdem(e.target.value as typeof ordem)} aria-label="Ordem"><option value="recentes">Mais recentes</option><option value="antigas">Mais antigos</option><option value="capitulo">Por capítulo</option></select>
          <span className="rs-filtros__cores" role="group" aria-label="Cor">{CORES.map((c) => <button key={c} type="button" className={`lr-cor lr-cor--${c}`} aria-pressed={filtro.cor === c} aria-label={`Só ${NOME_COR[c].toLowerCase()}`} title={NOME_COR[c]} onClick={() => definirFiltro({ ...filtro, cor: filtro.cor === c ? null : c })} />)}</span>
        </div>
      </div>

      {!marcas.length && <Estado titulo="Seu caderno está vazio.">{<p>Abra um resumo, selecione um trecho e escolha uma cor. O destaque aparece aqui e em todos os seus aparelhos.</p>}</Estado>}
      {lista.length > 0 && <ul className="rs-caderno">{lista.map((m) => { const i = info(m); return <li key={m.id} className={`rs-cor--${m.cor}`}>
        <a href={href(`/resumos/${m.capitulo}?bloco=${encodeURIComponent(i.bloco ?? '')}`)}>
          <small>{resumoDe(m.capitulo)?.titulo ?? m.capitulo}{i.secao ? ` · ${i.secao}` : ''} · {new Date(m.criadaEm).toLocaleDateString('pt-BR')}{m.favorita ? ' · ★' : ''}</small>
          <blockquote>{m.ancora.trechos.map((t) => t.exato).join(' … ')}</blockquote>
          {m.nota && <p>{m.nota}</p>}
          {i.orfa && <p className="rs-caderno__orfa"><Icone nome="alerta" tamanho={14} /> O texto mudou numa revisão: abra o resumo para reassociar.</p>}
        </a>
      </li> })}</ul>}

      {emAndamento.length > 0 && <section aria-labelledby="rs-andamento"><h2 id="rs-andamento" className="rs-rotulo">Capítulos em andamento</h2>
        <ul className="rs-continuar">{emAndamento.map((l) => <li key={l.capitulo}><a href={href(`/resumos/${l.capitulo}`)}><span className="rs-continuar__barra"><span style={{ width: `${l.progresso}%` }} /></span><strong>{resumoDe(l.capitulo)?.titulo ?? l.capitulo}</strong><small>{l.progresso}%</small></a></li>)}</ul>
      </section>}
    </div>
  )
}
