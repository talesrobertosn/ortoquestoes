import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { carregarCapitulo, carregarIndiceBiblioteca, textosDoCapitulo } from '../biblioteca/conteudo'
import { resolverAncora } from '../biblioteca/ancoras'
import { CORES, type Capitulo, type CorMarca, type IndiceBiblioteca, type Marca, type ResumoCapitulo } from '../biblioteca/tipos'
import { usarBiblioteca } from '../biblioteca/usarBiblioteca'
import { usarIndice } from '../dados/usarIndice'
import type { Indice } from '../dados/tipos'
import { Icone } from '../componentes/Icone'
import { Carregando, Estado } from '../componentes/Estados'
import { href } from '../util/rotas'
import { LeitorResumo } from './LeitorResumo'
import { gravar } from '../estado/armazenamento'
import { usarPremium } from '../conta/premium'
import { corDaArea } from '../dados/coresAreas'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis } from '../conta/supabase'
import { SECOES_ABERTAS } from '../biblioteca/porta'
import '../estilos/paginas/Resumos.css'

/** Adendo da Biblioteca: as frases "Na prova" (o antigo Resumão), em #/resumos/frases. */
const FrasesQueCaem = lazy(() => import('./Resumao').then(({ Resumao }) => ({ default: Resumao })))

/**
 * Biblioteca OrtoQuestões (#/resumos, 16/10/2026). Ainda fora do menu (pedido do Tales, fase de testes).
 * - #/resumos: estante por especialidade, busca, filtros e "Continuar estudando".
 * - #/resumos/<capítulo>?bloco=<id>: o leitor (LeitorResumo).
 * - #/resumos/caderno: Meu caderno de estudo (todas as marcações e notas).
 * - #/resumos/frases: adendo com as frases que caem (o antigo Resumão, 16/10/2026).
 */

/** As especialidades da estante, na ordem do acervo (slug dos temas). */
const ESPECIALIDADES: Array<{ slug: string; nome: string }> = [
  { slug: 'conceitos-basicos', nome: 'Conceitos básicos' }, { slug: 'trauma', nome: 'Trauma' }, { slug: 'quadril', nome: 'Quadril' },
  { slug: 'joelho', nome: 'Joelho' }, { slug: 'ombro-cotovelo', nome: 'Ombro e cotovelo' }, { slug: 'mao', nome: 'Mão e punho' },
  { slug: 'coluna', nome: 'Coluna' }, { slug: 'pediatria', nome: 'Ortopedia pediátrica' }, { slug: 'tumores', nome: 'Tumores' }, { slug: 'pe-tornozelo', nome: 'Pé e tornozelo' },
]
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const NOME_COR: Record<CorMarca, string> = { amarelo: 'Amarelo', verde: 'Verde', azul: 'Azul', rosa: 'Rosa', roxo: 'Roxo' }

export function Resumos({ segmentos, consulta }: { segmentos: string[]; consulta: URLSearchParams }) {
  // Quem abriu a biblioteca passa a ver "Estudar este assunto" nas questões (fase de testes, sem menu).
  useEffect(() => { gravar('resumos:visto', true) }, [])
  const sub = segmentos[1]
  if (sub === 'caderno') return <Caderno />
  if (sub === 'frases') return <Suspense fallback={<Carregando linhas={6} rotulo="Carregando as frases" />}><FrasesQueCaem /></Suspense>
  if (sub) return <LeitorResumo id={sub} consulta={consulta} />
  return <Estante areaInicial={consulta.get('area')} />
}

function usarIndiceBiblioteca() {
  const [dados, definir] = useState<IndiceBiblioteca | null | undefined>(undefined)
  useEffect(() => { carregarIndiceBiblioteca().then(definir).catch(() => definir(null)) }, [])
  return dados
}

/** "TARO 2007–2024 · TEOT 2022–2024": de onde vêm as questões reais citadas no capítulo. */
function historicoCobranca(indice: Indice | null, ids: string[]): string {
  if (!indice) return ''
  const porProva = new Map<string, number[]>()
  for (const id of ids) {
    const q = indice.questoes.find((x) => x.id === id)
    if (!q || q.p === null || q.p === undefined) continue
    const p = indice.provas[q.p]
    const l = porProva.get(p) ?? []; if (q.a) l.push(q.a); porProva.set(p, l)
  }
  return [...porProva].sort((a, b) => b[1].length - a[1].length).slice(0, 3).map(([p, anos]) => anos.length ? `${p} ${Math.min(...anos)}${Math.max(...anos) !== Math.min(...anos) ? `–${Math.max(...anos)}` : ''}` : p).join(' · ')
}

function Estante({ areaInicial = null }: { areaInicial?: string | null }) {
  const dados = usarIndiceBiblioteca()
  const { indice } = usarIndice()
  const { leituras, marcas } = usarBiblioteca()
  const { premium } = usarPremium()
  const { sessao } = usarConta()
  const visitante = contasDisponiveis && !sessao
  const [busca, definirBusca] = useState('')
  const [area, definirArea] = useState<string | null>(areaInicial)  // #/resumos?area=mao abre já filtrado (cronograma da mão)
  if (dados === undefined) return <Carregando linhas={6} rotulo="Abrindo a biblioteca" />
  if (dados === null) return <Estado titulo="Não foi possível abrir a biblioteca." acoes={<button type="button" className="botao botao--principal" onClick={() => location.reload()}>Tentar de novo</button>}><p>Confira a conexão.</p></Estado>
  const q = normalizar(busca.trim())
  const filtrados = dados.capitulos.filter((c) => (!area || c.especialidade === area) && (!q || normalizar(`${c.titulo} ${c.livro} ${c.resumo} ${c.secoes.map((s) => s.titulo).join(' ')}`).includes(q)))
  const continuar = dados.capitulos.map((c) => ({ c, l: leituras[c.id] })).filter(({ l }) => l && !l.concluidoEm && l.em).sort((a, b) => b.l!.em - a.l!.em).slice(0, 3)
  const comCapitulos = new Set(dados.capitulos.map((c) => c.especialidade))
  return (
    <div className="rs empilha-2">
      <header className="rs-topo">
        <p className="rs-topo__selo"><Icone nome="livro" tamanho={15} /> Biblioteca OrtoQuestões · Beta</p>
        <h1>Resumos que ensinam pelo que cai</h1>
        <p>Capítulos dos livros de referência reescritos em português, na ordem em que as provas cobram, com as questões reais no meio do texto. <b>Leitura grátis.</b> Marque, anote e continue em qualquer aparelho; resolver as questões citadas é do assinante.</p>
        {visitante && <p className="rs-porta"><Icone nome="cadeado" tamanho={14} /> <span><b>Leitura completa grátis com conta.</b> Sem conta, cada resumo abre as {SECOES_ABERTAS} primeiras partes. <a href={href('/conta?modo=criar&voltar=%2Fresumos')}>Criar conta grátis</a></span></p>}
        <p className="rs-novidade"><i aria-hidden="true" /> Resumos novos estão sendo criados todas as semanas</p>
        <div className="rs-topo__acoes"><a className="botao" href={href('/resumos/caderno')}><Icone nome="lapis" tamanho={16} /> Meu caderno de estudo{marcas.length ? ` (${marcas.filter((m) => !m.marcador).length})` : ''}</a></div>
      </header>

      {continuar.length > 0 && <section aria-labelledby="rs-continuar">
        <h2 id="rs-continuar" className="rs-rotulo">Continuar estudando</h2>
        <ul className="rs-continuar">{continuar.map(({ c, l }) => <li key={c.id}><a href={href(`/resumos/${c.id}`)}>
          <span className="rs-continuar__barra"><span style={{ width: `${l!.progresso}%` }} /></span>
          <strong>{c.titulo}</strong><small>{l!.progresso}% · {c.secoes.find((s) => l!.bloco.startsWith(s.id) || l!.bloco === `h-${s.id}`)?.titulo ?? 'continuar de onde parou'}</small>
        </a></li>)}</ul>
      </section>}

      <div className="rs-filtros">
        <input type="search" value={busca} onChange={(e) => definirBusca(e.target.value)} placeholder="Buscar capítulo ou assunto" aria-label="Buscar capítulo" />
        <div className="rs-filtros__areas" role="group" aria-label="Especialidade">
          <button type="button" aria-pressed={!area} onClick={() => definirArea(null)}>Todas</button>
          {ESPECIALIDADES.map((e) => <button key={e.slug} type="button" aria-pressed={area === e.slug} onClick={() => definirArea(area === e.slug ? null : e.slug)} disabled={!comCapitulos.has(e.slug)}>{e.nome}</button>)}
        </div>
      </div>

      {ESPECIALIDADES.filter((e) => filtrados.some((c) => c.especialidade === e.slug)).map((e) => <section key={e.slug} aria-labelledby={`rs-${e.slug}`}>
        <h2 id={`rs-${e.slug}`} className="rs-rotulo">{e.nome}</h2>
        <ul className="rs-estante">{filtrados.filter((c) => c.especialidade === e.slug).map((c) => <Livro key={c.id} c={c} fechado={c.acesso !== 'gratis' && !premium} premium={premium} indice={indice} leitura={leituras[c.id]} marcas={marcas.filter((m) => m.capitulo === c.id && !m.marcador).length} />)}</ul>
      </section>)}
      {!filtrados.length && <p className="texto-2">Nenhum capítulo encontrado.</p>}
      <a className="rs-adendo" href={href('/resumos/frases')}>
        <span className="rs-adendo__selo">Adendo</span>
        <span className="rs-adendo__texto"><strong>Frases que caem</strong><small>Uma frase por assunto, tirada dos comentários das questões de prova, de todas as áreas. Para reler em minutos antes das questões ou na véspera.</small></span>
        <Icone nome="direita" tamanho={16} />
      </a>
      <p className="rs-nota">Os resumos são texto autoral a partir dos capítulos citados, com revisão técnica; as questões e os anos vêm do acervo do site. Figuras originais só aparecem quando há licença de reprodução.</p>
    </div>
  )
}

function Livro({ c, fechado, indice, leitura, marcas }: { c: ResumoCapitulo; fechado: boolean; premium?: boolean; indice: Indice | null; leitura?: { progresso: number; concluidoEm?: number; bloco: string; em: number }; marcas: number }) {
  const estado = leitura?.concluidoEm ? 'Concluído' : leitura?.em ? 'Em andamento' : 'Não iniciado'
  const historico = historicoCobranca(indice, c.questoes)
  return (
    <li className={'rs-livro' + (fechado ? ' rs-livro--fechado' : '')} style={{ ['--rs-area' as string]: corDaArea(c.especialidade) }}><a href={href(`/resumos/${c.id}`)}>
      <span className="rs-livro__lombada" aria-hidden="true" />
      <span className="rs-livro__corpo">
        <small className="rs-livro__ref">{c.livro} · {c.edicao}{fechado ? <span className="rs-livro__cadeado"><Icone nome="cadeado" tamanho={13} /> Assinantes</span> : null}</small>
        <strong>{c.titulo}</strong>
        <span className="rs-livro__resumo">{c.resumo}</span>
        <span className="rs-livro__meta">
          <span>~{c.minutos} min</span>
          {c.questoes.length > 0 && <span>{c.questoes.length} questões de prova{historico ? ` · ${historico}` : ''}</span>}
          {marcas > 0 && <span>{marcas} {marcas === 1 ? 'destaque' : 'destaques'}</span>}
        </span>
        <span className="rs-livro__estado"><span className="rs-livro__barra"><span style={{ width: `${leitura?.progresso ?? 0}%` }} /></span>{estado}{leitura?.progresso && !leitura.concluidoEm ? ` · ${leitura.progresso}%` : ''}</span>
      </span>
    </a></li>
  )
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
