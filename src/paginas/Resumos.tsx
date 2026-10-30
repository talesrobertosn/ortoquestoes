import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { carregarCapitulo, carregarIndiceBiblioteca, textosDoCapitulo } from '../biblioteca/conteudo'
import { resolverAncora } from '../biblioteca/ancoras'
import { CORES, type Capitulo, type CorMarca, type IndiceBiblioteca, type Leitura, type Marca, type ResumoCapitulo } from '../biblioteca/tipos'
import { CHAVE_CONSULTA_ESTANTE, FILTROS_PADRAO, chaveLivro, consultaDosFiltros, estadoLeitura, filtrarEstante, filtrosAtivos, filtrosDaConsulta, livrosDaEstante, numeroCapitulo, rotuloLivro, apelidoLivro, sobreLivro, capitulosDoResumo, type EstadoLeitura, type FiltrosEstante, type OrdemEstante } from '../biblioteca/estante'
import { GuiaTour, deveAbrirGuia, usarGuiaNaConta, type PassoGuia } from '../biblioteca/GuiaTour'
import { usarBiblioteca } from '../biblioteca/usarBiblioteca'
import { usarIndice } from '../dados/usarIndice'
import type { Indice } from '../dados/tipos'
import { Icone } from '../componentes/Icone'
import { Carregando, Estado } from '../componentes/Estados'
import { href } from '../util/rotas'
import { LeitorResumo } from './LeitorResumo'
import { gravar, ler } from '../estado/armazenamento'
import { usarPremium } from '../conta/premium'
import { corDaArea } from '../dados/coresAreas'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis } from '../conta/supabase'
import { SECOES_ABERTAS } from '../biblioteca/porta'
import { Salao, provasDoCapitulo } from '../biblioteca/salao/Salao'
import { EncontreResumo } from '../biblioteca/EncontreResumo'
import '../estilos/paginas/Resumos.css'

/** Adendo da Biblioteca: as frases "Na prova" (o antigo Resumão), em #/resumos/frases. */
const FrasesQueCaem = lazy(() => import('./Resumao').then(({ Resumao }) => ({ default: Resumao })))

/**
 * Biblioteca OrtoQuestões (#/resumos, 16/10/2026). Ainda fora do menu (pedido do Tales, fase de testes).
 * - #/resumos: vitrine por livro (redesenho de 27/10/2026), busca, filtros no endereço, "Continuar estudando" e tutorial.
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
  return <Estante consulta={consulta} />
}

function usarIndiceBiblioteca() {
  const [dados, definir] = useState<IndiceBiblioteca | null | undefined>(undefined)
  useEffect(() => { carregarIndiceBiblioteca().then(definir).catch(() => definir(null)) }, [])
  return dados
}


const PROGRESSOS: Array<{ v: EstadoLeitura | null; nome: string }> = [{ v: null, nome: 'Todos' }, { v: 'novo', nome: 'Não iniciados' }, { v: 'andamento', nome: 'Em andamento' }, { v: 'concluido', nome: 'Concluídos' }]
const ORDENS: Array<{ v: OrdemEstante; nome: string }> = [{ v: 'livro', nome: 'Ordem do livro' }, { v: 'recentes', nome: 'Lidos por último' }, { v: 'cobrados', nome: 'Mais cobrados' }, { v: 'titulo', nome: 'Título (A a Z)' }]

const PASSOS_BIBLIOTECA: PassoGuia[] = [
  { titulo: 'Bem-vindo à Biblioteca', texto: 'Cada resumo é um capítulo dos livros de referência, reescrito em português e na ordem em que as provas cobram. Este tour leva menos de um minuto.' },
  { alvo: '[data-guia="continuar"]', titulo: 'Continue de onde parou', texto: 'Os capítulos que você começou ficam aqui, com a parte em que parou e quanto já leu. Um toque e o leitor abre no mesmo parágrafo.' },
  { alvo: '[data-guia="busca"]', titulo: 'Ache o capítulo', texto: 'Busque por tema, classificação ou nome do livro. A busca olha também os títulos das partes de cada resumo.' },
  { alvo: '[data-guia="filtros"]', titulo: 'Filtre e ordene', texto: 'Escolha o livro, a área e o seu progresso. Os filtros ficam no endereço: ao voltar do leitor, a estante está do jeito que você deixou.' },
  { alvo: '[data-guia="cartao"]', titulo: 'Cada cartão resume o capítulo', texto: 'Número do capítulo, tempo de leitura, as provas em que o assunto já caiu e o seu progresso, sem precisar abrir.' },
  { alvo: '[data-guia="caderno"]', titulo: 'Seu caderno de estudo', texto: 'Todos os destaques e notas de todos os resumos, em todos os aparelhos. Dá para revisar em sequência e exportar.' },
  { alvo: '[data-guia="ajuda"]', titulo: 'Ajuda sempre à mão', texto: 'Este tutorial volta quando você quiser, por aqui. Dentro do leitor, o botão Ajuda explica os controles da leitura.' },
]
/** O mesmo tour no salão (modo estante): os passos apontam para os móveis e para as lombadas. */
const PASSOS_SALAO: PassoGuia[] = PASSOS_BIBLIOTECA.map((p) =>
  p.alvo === '[data-guia="continuar"]' ? { ...p, titulo: 'A mesa de leitura', texto: 'O capítulo que você está lendo fica aberto na mesa, com quanto já leu. Sem leitura em andamento, a bibliotecária sugere um capítulo que cai muito.' }
  : p.alvo === '[data-guia="cartao"]' ? { ...p, titulo: 'Cada livro é um resumo', texto: 'A cor da lombada é a área, a altura é o tempo de leitura e a pedrinha na base diz o quanto cai na prova (comum, raro, épico ou lendário). Toque para ver a ficha.' }
  : p.alvo === '[data-guia="ajuda"]' ? { ...p, titulo: 'A coruja bibliotecária', texto: 'Toque na coruja para uma dica ou para refazer este tour. Dizem que o salão guarda segredos...' }
  : p)

type Modo = 'estante' | 'lista'
const CHAVE_MODO = 'resumos:modo'

function Estante({ consulta }: { consulta: URLSearchParams }) {
  const dados = usarIndiceBiblioteca()
  const { indice } = usarIndice()
  const { leituras, marcas } = usarBiblioteca()
  const { premium } = usarPremium()
  const { sessao } = usarConta()
  const visitante = contasDisponiveis && !sessao
  // #/resumos?area=mao abre já filtrado (cronograma da mão); os outros filtros também vivem no endereço.
  const [filtros, definirFiltros] = useState<FiltrosEstante>(() => filtrosDaConsulta(consulta))
  const [guia, definirGuia] = useState(false)
  const [modo, definirModo] = useState<Modo>(() => ler<Modo>(CHAVE_MODO, 'estante') === 'lista' ? 'lista' : 'estante')
  const trocarModo = (m: Modo) => { definirModo(m); gravar(CHAVE_MODO, m) }
  // Painel "Encontre o resumo": o tema escolhido (caminho) e os pedidos de ir até a lombada ou a estante.
  const [tema, definirTema] = useState<ResumoCapitulo | null>(null)
  const [irPara, definirIrPara] = useState<{ id: string; n: number } | null>(null)
  const [irLivro, definirIrLivro] = useState<{ chave: string; n: number } | null>(null)
  const mudar = (m: Partial<FiltrosEstante>) => definirFiltros((f) => ({ ...f, ...m }))
  // Um link novo para a estante (ex.: #/resumos?area=mao vindo do cronograma) troca os filtros.
  const consultaTexto = consulta.toString()
  useEffect(() => { if (consultaTexto !== consultaDosFiltros(filtros)) definirFiltros(filtrosDaConsulta(new URLSearchParams(consultaTexto))) }, [consultaTexto]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const c = consultaDosFiltros(filtros)
    const t = window.setTimeout(() => {
      try { sessionStorage.setItem(CHAVE_CONSULTA_ESTANTE, c) } catch { /* sem sessionStorage: a volta abre a estante limpa */ }
      if (c !== consulta.toString()) history.replaceState(history.state, '', `${location.pathname}${location.search}#/resumos${c ? `?${c}` : ''}`)
    }, 250)
    return () => window.clearTimeout(t)
  }, [filtros]) // eslint-disable-line react-hooks/exhaustive-deps
  // Primeira visita da conta: o tutorial abre sozinho, depois que a estante já está na tela.
  const metaGuia = usarGuiaNaConta('biblioteca')
  useEffect(() => { if (dados && deveAbrirGuia('biblioteca', metaGuia)) { const t = window.setTimeout(() => definirGuia(true), 600); return () => window.clearTimeout(t) } }, [!!dados, !!metaGuia]) // eslint-disable-line react-hooks/exhaustive-deps

  if (dados === undefined) return <Carregando linhas={6} rotulo="Abrindo a biblioteca" />
  if (dados === null) return <Estado titulo="Não foi possível abrir a biblioteca." acoes={<button type="button" className="botao botao--principal" onClick={() => location.reload()}>Tentar de novo</button>}><p>Confira a conexão.</p></Estado>
  const livros = livrosDaEstante(dados.capitulos)
  const filtrados = filtrarEstante(dados.capitulos, filtros, leituras)
  const ativos = filtrosAtivos(filtros)
  const continuar = dados.capitulos.map((c) => ({ c, l: leituras[c.id] })).filter(({ l }) => l && !l.concluidoEm && l.em).sort((a, b) => b.l!.em - a.l!.em).slice(0, 3)
  const comCapitulos = new Set(dados.capitulos.map((c) => c.especialidade))
  const destaques = marcas.filter((m) => !m.marcador).length
  const cartao = (c: ResumoCapitulo, primeiro: boolean) => <CartaoResumo key={c.id} c={c} guia={primeiro} fechado={c.acesso !== 'gratis' && !premium} indice={indice} leitura={leituras[c.id]} destaques={marcas.filter((m) => m.capitulo === c.id && !m.marcador).length} />
  const botaoModo = <span className="rs-modo" role="group" aria-label="Como ver a biblioteca">
    <button type="button" aria-pressed={modo === 'estante'} onClick={() => trocarModo('estante')}><Icone nome="livro" tamanho={15} /> Estante</button>
    <button type="button" aria-pressed={modo === 'lista'} onClick={() => trocarModo('lista')}><Icone nome="menu" tamanho={15} /> Lista</button>
  </span>
  const fichario = () => <section className="rs-busca" id="rs-estante" aria-label="Buscar e filtrar resumos">
    <label className="rs-busca__campo" data-guia="busca"><Icone nome="busca" tamanho={17} /><span className="so-leitor">Buscar resumo</span>
      <input type="search" value={filtros.q} onChange={(e) => mudar({ q: e.target.value })} placeholder="Buscar tema, classificação ou livro" />
    </label>
    <div className="rs-busca__filtros" data-guia="filtros">
      <label><span>Livro</span><select value={filtros.livro ?? ''} onChange={(e) => mudar({ livro: e.target.value || null })}><option value="">Todos os livros</option>{livros.map((l) => <option key={l.chave} value={l.chave}>{l.rotulo}</option>)}</select></label>
      <label><span>Área</span><select value={filtros.area ?? ''} onChange={(e) => mudar({ area: e.target.value || null })}><option value="">Todas as áreas</option>{ESPECIALIDADES.filter((e) => comCapitulos.has(e.slug)).map((e) => <option key={e.slug} value={e.slug}>{e.nome}</option>)}</select></label>
      <label><span>Ordenar</span><select value={filtros.ordem} onChange={(e) => mudar({ ordem: e.target.value as OrdemEstante })}>{ORDENS.map((o) => <option key={o.v} value={o.v}>{o.nome}</option>)}</select></label>
      <div className="rs-busca__progresso" role="group" aria-label="Progresso">{PROGRESSOS.map((p) => <button key={p.nome} type="button" aria-pressed={filtros.progresso === p.v} onClick={() => mudar({ progresso: p.v })}>{p.nome}</button>)}</div>
    </div>
    {ativos && <p className="rs-busca__resultado" role="status"><span className="numerico">{filtrados.length}</span> {filtrados.length === 1 ? 'resumo encontrado' : 'resumos encontrados'}<button type="button" onClick={() => definirFiltros({ ...FILTROS_PADRAO, ordem: filtros.ordem })}><Icone nome="fechar" tamanho={14} /> Limpar filtros</button></p>}
  </section>
  const porta = visitante ? <p className="rs-porta"><Icone nome="cadeado" tamanho={14} /> <span><b>Leitura completa grátis com conta.</b> Sem conta, cada resumo abre as {SECOES_ABERTAS} primeiras partes. <a href={href('/conta?modo=criar&voltar=%2Fresumos')}>Criar conta grátis</a></span></p> : null

  const encontre = <>
        <EncontreResumo livros={livros} filtros={filtros} filtrados={filtrados} ativos={ativos} tema={tema}
        areas={ESPECIALIDADES.filter((e) => comCapitulos.has(e.slug))} progressos={PROGRESSOS}
        mudar={(m) => { if (m.livro !== undefined && tema && chaveLivro(tema) !== m.livro) definirTema(null); mudar(m) }}
        limpar={() => { definirFiltros(FILTROS_PADRAO); definirTema(null) }}
        aoIrPara={(c) => { definirTema(c); definirIrPara((x) => ({ id: c.id, n: (x?.n ?? 0) + 1 })) }}
        aoIrLivro={(chave) => definirIrLivro((x) => ({ chave, n: (x?.n ?? 0) + 1 }))} />
        {!filtrados.length && <p className="rs-busca__nada">Nenhum livro com esses filtros. {filtros.q.trim() ? `Nada para “${filtros.q.trim()}”. ` : ''}<button type="button" onClick={() => definirFiltros(FILTROS_PADRAO)}>Limpar filtros</button></p>}
      </>

  if (modo === 'estante') return (
    <div className="rs rs--salao">
      <Salao capitulos={dados.capitulos} livros={livros} achados={new Set(filtrados.map((c) => c.id))} filtrosAtivos={ativos} busca={filtros.q}
        leituras={leituras} destaques={destaques} premium={premium} indice={indice} continuar={continuar} aviso={porta}
        fichario={encontre} irPara={irPara} irLivro={irLivro} botaoModo={botaoModo} aoAbrirGuia={() => definirGuia(true)} />
      <p className="rs-nota">Os resumos são texto autoral a partir dos capítulos citados, com revisão técnica; as questões e os anos vêm do acervo do site. Figuras originais só aparecem quando há licença de reprodução.</p>
      {guia && <GuiaTour id="biblioteca" titulo="Como usar a Biblioteca" passos={PASSOS_SALAO} aoFechar={() => definirGuia(false)} />}
    </div>
  )

  const grupos = filtros.ordem === 'livro' ? livros.map((l) => ({ ...l, capitulos: filtrados.filter((c) => chaveLivro(c) === l.chave) })).filter((l) => l.capitulos.length) : null
  return (
    <div className="rs rs--vitrine empilha-2">
      <header className="rs-topo rs-topo--vitrine">
        <div className="rs-topo__texto">
          <p className="rs-topo__selo"><Icone nome="livro" tamanho={14} /> Biblioteca OrtoQuestões</p>
          <h1>Biblioteca de <em>resumos</em></h1>
          <p className="rs-topo__lide">Estude pelos livros de referência, com foco no que realmente cai nas provas. Cada resumo segue o capítulo original, mostra onde o assunto já foi cobrado e abre as questões ali mesmo, sem perder o parágrafo. <b>Leitura grátis.</b></p>
          {porta}
          <p className="rs-novidade"><i aria-hidden="true" /> Biblioteca em expansão: capítulos novos toda semana</p>
          <div className="rs-topo__acoes">
            {continuar[0]
              ? <a className="rs-botao-ouro" href={href(`/resumos/${continuar[0].c.id}`)}><Icone nome="livro" tamanho={18} /> Continuar de onde parei</a>
              : <button type="button" className="rs-botao-ouro" onClick={() => document.getElementById('rs-estante')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}><Icone nome="livro" tamanho={18} /> Escolher um capítulo</button>}
            <a className="botao" href={href('/resumos/caderno')} data-guia="caderno"><Icone nome="lapis" tamanho={16} /> Meu caderno{destaques ? <small className="rs-contador numerico">{destaques}</small> : null}</a>
            <a className="botao" href={href('/resumos/frases')}><Icone nome="raio" tamanho={16} /> Frases que caem</a>
            <button type="button" className="botao" onClick={() => definirGuia(true)} data-guia="ajuda"><Icone nome="interrogacao" tamanho={16} /> Como usar a Biblioteca</button>
            {botaoModo}
          </div>
        </div>
        <EstantePixel livros={livros.slice(0, 4).map((l) => ({ rotulo: `${apelidoLivro(l.capitulos[0].livro)} · ${l.rotulo.split(' · ')[1]}`, cor: corDaArea(l.capitulos[0].especialidade) }))} />
        <span className="rs-topo__horizonte" aria-hidden="true" />
      </header>

      {continuar.length > 0 && <section aria-labelledby="rs-continuar" data-guia="continuar">
        <h2 id="rs-continuar" className="rs-rotulo">Continuar estudando</h2>
        <ul className="rs-continuar">{continuar.map(({ c, l }) => {
          const secao = c.secoes.find((s) => l!.bloco.startsWith(s.id) || l!.bloco === `h-${s.id}`)?.titulo
          return <li key={c.id} style={{ ['--rs-area' as string]: corDaArea(c.especialidade) }}><a href={href(`/resumos/${c.id}`)} aria-label={`Continuar ${c.titulo}, ${l!.progresso}% lido`}>
            <span className="rs-continuar__capa" aria-hidden="true"><small>Cap.</small>{numeroCapitulo(c)}</span>
            <span className="rs-continuar__ref">{rotuloLivro(c)} · Cap. {numeroCapitulo(c)}</span>
            <strong>{c.titulo}</strong>
            <small>{secao ? `Parou em: ${secao}` : 'Continuar de onde parou'}</small>
            <span className="rs-continuar__pe"><span className="rs-continuar__barra"><span style={{ width: `${l!.progresso}%` }} /></span><b className="numerico">{l!.progresso}%</b><span className="rs-continuar__ir">Continuar <Icone nome="direita" tamanho={14} /></span></span>
          </a></li>
        })}</ul>
      </section>}

      {fichario()}

      {!filtrados.length && <div className="rs-vazio">
        <span className="rs-vazio__livro" aria-hidden="true"><i /><i /><i /></span>
        <strong>Nenhum resumo com esses filtros.</strong>
        <p>{filtros.q.trim() ? <>Nada para “{filtros.q.trim()}”. Tente outro termo ou o nome da classificação.</> : 'Tente outro livro, outra área ou outro progresso.'} A biblioteca cresce toda semana.</p>
        <button type="button" className="botao botao--principal" onClick={() => definirFiltros(FILTROS_PADRAO)}>Limpar filtros</button>
      </div>}

      {grupos ? grupos.map((g, gi) => <section key={g.chave} className="rs-grupo" aria-labelledby={`rs-l-${gi}`}>
        <h2 id={`rs-l-${gi}`} className="rs-grupo__titulo" style={{ ['--rs-area' as string]: corDaArea(g.capitulos[0].especialidade) }}><i className="rs-grupo__icone" aria-hidden="true" /><span>{g.rotulo.split(' · ')[0]}</span><small>{g.rotulo.split(' · ')[1]}</small><button type="button" className="rs-grupo__filtrar" onClick={() => mudar({ livro: filtros.livro === g.chave ? null : g.chave })} aria-pressed={filtros.livro === g.chave}>{filtros.livro === g.chave ? 'Ver todos os livros' : 'Só este livro'}</button></h2>
        {sobreLivro(g.capitulos[0].livro) && <p className="rs-grupo__sobre">{sobreLivro(g.capitulos[0].livro)}</p>}
        <ul className="rs-lista">{g.capitulos.map((c, i) => cartao(c, gi === 0 && i === 0))}</ul>
      </section>) : filtrados.length > 0 && <ul className="rs-lista">{filtrados.map((c, i) => cartao(c, i === 0))}</ul>}

      <a className="rs-adendo" href={href('/resumos/frases')}>
        <span className="rs-adendo__selo">Adendo</span>
        <span className="rs-adendo__texto"><strong>Frases que caem</strong><small>Uma frase por assunto, tirada dos comentários das questões de prova, de todas as áreas. Para reler em minutos antes das questões ou na véspera.</small></span>
        <Icone nome="direita" tamanho={16} />
      </a>
      <p className="rs-nota">Os resumos são texto autoral a partir dos capítulos citados, com revisão técnica; as questões e os anos vêm do acervo do site. Figuras originais só aparecem quando há licença de reprodução.</p>
      {guia && <GuiaTour id="biblioteca" titulo="Como usar a Biblioteca" passos={PASSOS_BIBLIOTECA} aoFechar={() => definirGuia(false)} />}
    </div>
  )
}

/** Três lombadas pixel na capa da estante, com o nome dos livros (paradas com movimento reduzido). */
function EstantePixel({ livros }: { livros: Array<{ rotulo: string; cor: string }> }) {
  if (!livros.length) return null
  const curto = (r: string) => r.replace(/^Rockwood /, '').replace(' · ', ' ').replace(/ ed\.$/, '')
  // Os livros com nome são os da estante de verdade; os outros só completam a prateleira.
  const extras = ['#c8a24a', '#5f7f9a', '#8b5a7a']
  return (
    <div className="rs-pixel" aria-hidden="true">
      <span className="rs-pixel__estrela rs-pixel__estrela--a" /><span className="rs-pixel__estrela rs-pixel__estrela--b" />
      <div className="rs-pixel__prateleira">
        <span className="rs-pixel__livro rs-pixel__livro--fino" style={{ ['--rs-area' as string]: extras[0] }} />
        {livros.map((l, i) => <span key={l.rotulo} className={`rs-pixel__livro rs-pixel__livro--${i}`} style={{ ['--rs-area' as string]: l.cor }}><b>{curto(l.rotulo)}</b>{i === 1 && <span className="rs-pixel__fita" />}</span>)}
        <span className="rs-pixel__livro rs-pixel__livro--fino rs-pixel__livro--baixo" style={{ ['--rs-area' as string]: extras[1] }} />
        <span className="rs-pixel__livro rs-pixel__livro--deitado" style={{ ['--rs-area' as string]: extras[2] }} />
      </div>
      <span className="rs-pixel__tabua" />
    </div>
  )
}

const ESTADO_NOME: Record<EstadoLeitura, string> = { novo: 'Não iniciado', andamento: 'Em andamento', concluido: 'Concluído' }

function CartaoResumo({ c, fechado, indice, leitura, destaques, guia }: { c: ResumoCapitulo; fechado: boolean; indice: Indice | null; leitura?: Leitura; destaques: number; guia: boolean }) {
  const estado = estadoLeitura(leitura)
  const provas = provasDoCapitulo(indice, c.questoes)
  const n = numeroCapitulo(c)
  const caps = capitulosDoResumo(c)
  const ultimo = caps.length > 1 ? caps[caps.length - 1] : null
  const area = ESPECIALIDADES.find((e) => e.slug === c.especialidade)?.nome ?? c.especialidade
  const pct = estado === 'concluido' ? 100 : leitura?.progresso ?? 0
  return (
    <li className={`rs-cartao rs-cartao--${estado}${fechado ? ' rs-cartao--fechado' : ''}`} style={{ ['--rs-area' as string]: corDaArea(c.especialidade) }} data-guia={guia ? 'cartao' : undefined}>
      <a href={href(`/resumos/${c.id}`)}>
        <span className="rs-cartao__numero" aria-hidden="true"><small>{ultimo ? 'Caps.' : 'Cap.'}</small>{n === Number.MAX_SAFE_INTEGER ? '·' : n}{ultimo && <small>{caps.length > 2 ? 'a' : 'e'} {ultimo}</small>}</span>
        <span className="rs-cartao__corpo">
          <span className="rs-cartao__topo">
            <span className="rs-cartao__ref"><span className="so-leitor">{rotuloLivro(c)}, {ultimo ? `capítulos ${n} ${caps.length > 2 ? 'a' : 'e'} ${ultimo}` : `capítulo ${n}`}. </span>{area}{fechado && <span className="rs-livro__cadeado"><Icone nome="cadeado" tamanho={12} /> Assinantes</span>}</span>
            <span className={`rs-estado rs-estado--${estado}`}>{estado === 'concluido' && <Icone nome="certo" tamanho={12} />}{estado === 'andamento' ? `${pct}% lido` : ESTADO_NOME[estado]}</span>
          </span>
          <strong className="rs-cartao__titulo">{c.titulo}</strong>
          <span className="rs-cartao__meta">
            <span><Icone nome="relogio" tamanho={13} /> ~{c.minutos} min</span>
            {c.questoes.length > 0 && <span><Icone nome="alvo" tamanho={13} /> {c.questoes.length} {c.questoes.length === 1 ? 'questão de prova' : 'questões de prova'}</span>}
            {destaques > 0 && <span><Icone nome="lapis" tamanho={13} /> {destaques} {destaques === 1 ? 'destaque' : 'destaques'}</span>}
          </span>
          <span className="rs-cartao__provas" aria-label={provas.length ? `Já caiu em ${provas.join(', ')}` : undefined}>{provas.length ? <>{provas.slice(0, 2).map((p) => <span key={p} className="rs-prova">{p}</span>)}{provas.length > 2 && <span className="rs-prova rs-prova--mais">+{provas.length - 2}</span>}</> : <span className="rs-prova rs-prova--mais">Base para as questões</span>}</span>
        </span>
        {estado !== 'novo' && <span className="rs-cartao__barra" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>}
      </a>
    </li>
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
