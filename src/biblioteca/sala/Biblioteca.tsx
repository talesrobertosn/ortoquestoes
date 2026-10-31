import { useEffect, useMemo, useState } from 'react'
import { Carregando, Estado } from '../../componentes/Estados'
import { Icone } from '../../componentes/Icone'
import { usarConta } from '../../conta/ContextoConta'
import { usarPremium } from '../../conta/premium'
import { contasDisponiveis } from '../../conta/supabase'
import { usarIndice } from '../../dados/usarIndice'
import { gravar, ler } from '../../estado/armazenamento'
import { href } from '../../util/rotas'
import { carregarIndiceBiblioteca } from '../conteudo'
import {
  CHAVE_CONSULTA_ESTANTE, FILTROS_PADRAO, consultaDosFiltros, estadoLeitura, filtrarEstante, filtrosAtivos, filtrosDaConsulta, livrosDaEstante, type FiltrosEstante,
} from '../estante'
import { GuiaTour, deveAbrirGuia, usarGuiaNaConta, type PassoGuia } from '../GuiaTour'
import { SECOES_ABERTAS } from '../porta'
import type { IndiceBiblioteca, ResumoCapitulo } from '../tipos'
import { usarBiblioteca } from '../usarBiblioteca'
import { BarraFiltros, type Modo } from './BarraFiltros'
import { BuscaPrincipal } from './BuscaPrincipal'
import { ArteSalao, CenaSalao } from './CenaSalao'
import { obrasDaEstante, semMovimento, texturas } from './comum'
import { Estante } from './Estante'
import { Inspecao } from './Inspecao'
import { Lista, type Agrupar } from './Lista'
import { Cafe, ChuvaDeLivros, Mesa, Recado, SalaRaros } from './Mesa'
import { periodoDaHora, usarSalao } from './usarSalao'
import '../../estilos/paginas/Biblioteca.css'

const CHAVE_MODO = 'resumos:modo'
const CHAVE_DICA_BUSCA = 'resumos:dica-busca'

const PASSOS: PassoGuia[] = [
  { titulo: 'Bem-vindo à Biblioteca', texto: 'Cada resumo é um capítulo dos livros de referência, reescrito em português e na ordem em que as provas cobram. Este tour leva menos de um minuto.' },
  { alvo: '[data-guia="busca"]', titulo: 'Ache o assunto', texto: 'Digite o tema, a classificação, o livro ou o capítulo. As sugestões abrem direto o resumo, a parte certa do resumo, o livro ou a área.' },
  { alvo: '[data-guia="filtros"]', titulo: 'Estante ou lista, com os mesmos filtros', texto: 'Troque entre a estante e a lista sem perder a busca. O progresso fica sempre à vista; livro, área e ordem estão em Filtros.' },
  { alvo: '[data-guia="continuar"]', titulo: 'Continue de onde parou', texto: 'Os capítulos que você começou ficam na mesa, com a parte em que parou. Um toque e o leitor abre no mesmo parágrafo.' },
  { alvo: '[data-guia="cartao"]', titulo: 'Cada livro é um resumo', texto: 'Passe o mouse para ler o título inteiro; clique para a ficha. A cor é a área, a fita é leitura em andamento e o selo dourado, leitura concluída.' },
  { alvo: '[data-guia="caderno"]', titulo: 'Seu caderno de estudo', texto: 'Todos os destaques e notas de todos os resumos, em todos os aparelhos. Dá para revisar em sequência e exportar.' },
  { alvo: '[data-guia="ajuda"]', titulo: 'A coruja bibliotecária', texto: 'Toque na coruja para uma dica ou para refazer este tour. Dizem que o salão guarda segredos...' },
]

function usarIndiceDaBiblioteca() {
  const [dados, definir] = useState<IndiceBiblioteca | null | undefined>(undefined)
  useEffect(() => { carregarIndiceBiblioteca().then(definir).catch(() => definir(null)) }, [])
  return dados
}

/**
 * Biblioteca de Resumos 3.0 (#/resumos, 31/10/2026, pedido do Tales: "mágica para quem quer explorar e extremamente
 * eficiente para quem quer estudar"). Um catálogo só para as duas vistas: a Estante (salão pintado, estantes por
 * obra, a ficha do volume) e a Lista (linhas editoriais). Busca, filtros, vista e grupos vivem no endereço
 * (#/resumos?q=…&livro=…&area=…&progresso=…&ordem=…&vista=lista&agrupar=area): voltar do leitor reabre igual.
 */
export function Biblioteca({ consulta }: { consulta: URLSearchParams }) {
  const dados = usarIndiceDaBiblioteca()
  // Enquanto o índice chega, a pintura do salão já carrega no mesmo lugar e tamanho (a imagem é o maior elemento
  // da tela: começar cedo deixa o primeiro quadro rápido, e nada pula quando o resto aparece).
  if (dados === undefined) return <div className="bb"><div className="bb-salao"><div className="bb-palco"><div className="bb-palco__mundo"><ArteSalao periodo={periodoDaHora(new Date().getHours())} /></div><span className="bb-palco__veu" aria-hidden="true" /></div></div><Carregando linhas={4} rotulo="Abrindo a biblioteca" /></div>
  if (dados === null) return <Estado titulo="Não foi possível abrir a biblioteca." acoes={<button type="button" className="botao botao--principal" onClick={() => location.reload()}>Tentar de novo</button>}><p>Confira a conexão e tente de novo, por gentileza.</p></Estado>
  return <Salao dados={dados} consulta={consulta} />
}

const vistaDaConsulta = (c: URLSearchParams): Modo | null => (c.get('vista') === 'lista' ? 'lista' : c.get('vista') === 'estante' ? 'estante' : null)
const agruparDaConsulta = (c: URLSearchParams): Agrupar => (c.get('agrupar') === 'area' ? 'area' : c.get('agrupar') === 'nenhum' ? 'nenhum' : 'livro')
/** A parte dos filtros no endereço (sem vista e grupos), para comparar com o que veio de um link. */
const soFiltros = (c: URLSearchParams) => { const x = new URLSearchParams(c); x.delete('vista'); x.delete('agrupar'); return x.toString() }

function Salao({ dados, consulta }: { dados: IndiceBiblioteca; consulta: URLSearchParams }) {
  const { indice } = usarIndice()
  const { leituras, marcas } = usarBiblioteca()
  const { premium } = usarPremium()
  const { sessao } = usarConta()
  const visitante = contasDisponiveis && !sessao
  const capitulos = dados.capitulos

  const [filtros, definirFiltros] = useState<FiltrosEstante>(() => filtrosDaConsulta(consulta))
  const [modo, definirModo] = useState<Modo>(() => vistaDaConsulta(consulta) ?? (ler<Modo>(CHAVE_MODO, 'estante') === 'lista' ? 'lista' : 'estante'))
  const [agrupar, definirAgrupar] = useState<Agrupar>(() => agruparDaConsulta(consulta))
  const [ficha, definirFicha] = useState<{ c: ResumoCapitulo; selo?: string } | null>(null)
  const [realce, definirRealce] = useState<string | null>(null)
  const [guia, definirGuia] = useState(false)
  const mudar = (m: Partial<FiltrosEstante>) => definirFiltros((f) => ({ ...f, ...m }))
  const limpar = () => definirFiltros({ ...FILTROS_PADRAO })
  const abrirFicha = (c: ResumoCapitulo, selo?: string) => definirFicha({ c, selo })
  const s = usarSalao(capitulos, filtros.q, abrirFicha)

  // Um link novo (ex.: #/resumos?area=mao vindo do cronograma) troca os filtros; os filtros vão para o endereço.
  const consultaTexto = consulta.toString()
  useEffect(() => {
    const c = new URLSearchParams(consultaTexto)
    if (soFiltros(c) !== consultaDosFiltros(filtros)) definirFiltros(filtrosDaConsulta(c))
    const v = vistaDaConsulta(c); if (v && v !== modo) definirModo(v)
  }, [consultaTexto]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const p = new URLSearchParams(consultaDosFiltros(filtros))
    if (modo === 'lista') p.set('vista', 'lista')
    if (modo === 'lista' && agrupar !== 'livro') p.set('agrupar', agrupar)
    const c = p.toString()
    const t = window.setTimeout(() => {
      try { sessionStorage.setItem(CHAVE_CONSULTA_ESTANTE, c) } catch { /* sem sessionStorage: a volta abre a estante limpa */ }
      if (c !== consulta.toString()) history.replaceState(history.state, '', `${location.pathname}${location.search}#/resumos${c ? `?${c}` : ''}`)
    }, 250)
    return () => window.clearTimeout(t)
  }, [filtros, modo, agrupar]) // eslint-disable-line react-hooks/exhaustive-deps

  // Primeira visita da conta: o tutorial abre sozinho, depois que a estante já está na tela.
  const metaGuia = usarGuiaNaConta('biblioteca')
  useEffect(() => { if (deveAbrirGuia('biblioteca', metaGuia)) { const t = window.setTimeout(() => definirGuia(true), 700); return () => window.clearTimeout(t) } }, [!!metaGuia]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!realce) return; const t = window.setTimeout(() => definirRealce(null), 3200); return () => window.clearTimeout(t) }, [realce])

  const livros = useMemo(() => livrosDaEstante(capitulos), [capitulos])
  const obras = useMemo(() => obrasDaEstante(livros), [livros])
  const filtrados = useMemo(() => filtrarEstante(capitulos, filtros, leituras), [capitulos, filtros, leituras])
  const ativos = filtrosAtivos(filtros)
  const achados = useMemo(() => (ativos ? new Set(filtrados.map((c) => c.id)) : null), [ativos, filtrados])
  const semProgresso = useMemo(() => filtrarEstante(capitulos, { ...filtros, progresso: null }, leituras), [capitulos, filtros, leituras])
  const contagem = useMemo(() => {
    const n = { todos: semProgresso.length, novo: 0, andamento: 0, concluido: 0 }
    for (const c of semProgresso) n[estadoLeitura(leituras[c.id])]++
    return n
  }, [semProgresso, leituras])
  const continuar = useMemo(() => capitulos.map((c) => ({ c, l: leituras[c.id] })).filter(({ l }) => l && !l.concluidoEm && l.em).sort((a, b) => b.l!.em - a.l!.em).slice(0, 3), [capitulos, leituras])
  const cobrados = useMemo(() => [...capitulos].sort((a, b) => b.questoes.length - a.questoes.length).slice(0, 10), [capitulos])
  const lidos = capitulos.filter((c) => estadoLeitura(leituras[c.id]) === 'concluido').length
  const destaques = marcas.filter((m) => !m.marcador).length
  const relevancia = !!filtros.q.trim() && filtros.ordem === 'livro'
  const primeiraBusca = filtros.q.trim() ? filtrados[0]?.id ?? null : null
  const textoRaro = useMemo(() => {
    const minutos = capitulos.reduce((n, c) => n + c.minutos, 0)
    const questoes = new Set(capitulos.flatMap((c) => c.questoes)).size
    const longo = [...capitulos].sort((a, b) => b.minutos - a.minutos)[0]
    return `Este volume guarda o registro da casa: ${capitulos.length} resumos de ${obras.length} livros, ${Math.round(minutos / 60)} horas de leitura e ${questoes} questões de prova citadas. O mais longo é "${longo?.titulo}", com ~${longo?.minutos} min.`
  }, [capitulos, obras.length])

  const trocarModo = (m: Modo) => { definirModo(m); gravar(CHAVE_MODO, m) }
  const irResultados = () => document.getElementById('bb-resultados')?.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' })
  const abrirDaBusca = (c: ResumoCapitulo) => {
    definirRealce(c.id)
    document.querySelector(`[data-cap="${CSS.escape(c.id)}"]`)?.scrollIntoView({ block: 'center' })
    abrirFicha(c)
  }
  const filtrarLivro = (chave: string) => { mudar({ livro: chave }); window.setTimeout(irResultados, 60) }
  const filtrarArea = (slug: string) => { mudar({ area: slug }); window.setTimeout(irResultados, 60) }
  const primeiraBuscaFeita = () => {
    if (ler<boolean>(CHAVE_DICA_BUSCA, false)) return
    gravar(CHAVE_DICA_BUSCA, true)
    s.acoes.falar('Escolha uma sugestão com as setas e Enter, ou continue digitando: a estante mostra só o que combina.')
  }

  const porta = visitante ? <p className="bb-porta"><Icone nome="cadeado" tamanho={14} /> <span><b>Leitura completa grátis com conta.</b> Sem conta, cada resumo abre as {SECOES_ABERTAS} primeiras partes. <a href={href('/conta?modo=criar&voltar=%2Fresumos')}>Criar conta grátis</a></span></p> : null
  const livrosFiltro = livros.map((l) => ({ chave: l.chave, rotulo: l.rotulo, total: l.capitulos.length }))
  const areasFiltro = [...capitulos.reduce((m, c) => m.set(c.especialidade, (m.get(c.especialidade) ?? 0) + 1), new Map<string, number>())].map(([slug, total]) => ({ slug, total }))
  const fichaAtual = ficha ? capitulos.find((c) => c.id === ficha.c.id) ?? ficha.c : null
  const soBusca = filtros.q.trim() && !filtrados.length ? filtrarEstante(capitulos, { ...FILTROS_PADRAO, q: filtros.q }, leituras).length : 0
  const salaRaros = s.passagem === 'aberta' ? <SalaRaros achados={s.achados} aoVoltar={s.acoes.fecharPassagem} /> : null

  return (
    <div className={`bb bb--${modo}`} style={texturas()}>
      {s.chuva > 0 && <ChuvaDeLivros key={s.chuva} />}
      {s.aviso && <Recado key={s.aviso.n} texto={s.aviso.texto} />}
      <CenaSalao salao={s} textoRaro={textoRaro} aoAbrirGuia={() => definirGuia(true)}
        titulo={<h1>Biblioteca de <em>resumos</em></h1>}
        contagem={`${capitulos.length} resumos · ${obras.length} livros · ${lidos} ${lidos === 1 ? 'lido' : 'lidos'} por você`}
        busca={<BuscaPrincipal capitulos={capitulos} leituras={leituras} valor={filtros.q} aoMudar={(q) => mudar({ q })} aoAbrirResumo={abrirDaBusca}
          aoFiltrarLivro={filtrarLivro} aoFiltrarArea={filtrarArea} aoVerResultados={irResultados} aoPrimeiraBusca={primeiraBuscaFeita} />}
        aviso={porta}
        acoes={<>
          <a className="bb-botao-vidro" href={href('/resumos/caderno')}><Icone nome="lapis" tamanho={15} /> Meu caderno{destaques ? <span className="bb-botao-vidro__n numerico">{destaques}</span> : null}</a>
          <a className="bb-botao-vidro" href={href('/resumos/frases')}><Icone nome="raio" tamanho={15} /> Frases que caem</a>
          <button type="button" className="bb-botao-vidro" onClick={() => definirGuia(true)}><Icone nome="interrogacao" tamanho={15} /> Como usar</button>
        </>} />

      {!ativos && <Mesa continuar={continuar} capitulos={capitulos} destaques={destaques} premium={premium} />}
      {s.efeitos.has('cafe') && <Cafe curtos={s.curtos} />}

      <BarraFiltros modo={modo} aoModo={trocarModo} filtros={filtros} mudar={mudar} limpar={limpar} livros={livrosFiltro} areas={areasFiltro}
        contagem={contagem} total={capitulos.length} achados={filtrados.length} agrupar={agrupar} aoAgrupar={definirAgrupar} relevancia={relevancia} />

      {!filtrados.length && <div className="bb-vazio" role="status">
        <span className="bb-vazio__pilha" aria-hidden="true"><i /><i /><i /></span>
        {soBusca > 0 ? <>
          <strong>Os filtros escondem {soBusca} {soBusca === 1 ? 'resumo' : 'resumos'} para “{filtros.q.trim()}”.</strong>
          <p>A busca acha, mas o livro, a área ou o progresso escolhidos tiram {soBusca === 1 ? 'ele' : 'eles'} da tela.</p>
          <button type="button" className="bb-botao-ler" onClick={() => definirFiltros({ ...FILTROS_PADRAO, q: filtros.q })}>Manter só a busca</button>
        </> : <>
          <strong>{filtros.q.trim() ? `Nada para “${filtros.q.trim()}”.` : 'Nenhum resumo com esses filtros.'}</strong>
          <p>{filtros.q.trim() ? 'Tente o nome do osso, da lesão ou da classificação (Garden, Neer, Schatzker). A biblioteca cresce toda semana.' : 'Tente outro livro, outra área ou outro progresso.'}</p>
          <button type="button" className="bb-botao-ler" onClick={limpar}>Limpar filtros</button>
        </>}
      </div>}

      <div key={modo} className="bb-vista">
        {modo === 'estante'
          ? filtrados.length > 0 && <Estante obras={obras} achados={achados} cobrados={cobrados} leituras={leituras} premium={premium} salao={s}
              realce={realce} primeiraBusca={primeiraBusca} aoAbrir={(c) => abrirFicha(c)} salaRaros={salaRaros} />
          : filtrados.length > 0 && <Lista obras={obras} filtrados={filtrados} agrupar={agrupar} relevancia={relevancia} q={filtros.q} leituras={leituras} marcas={marcas}
              indice={indice} premium={premium} aoAbrir={(c) => abrirFicha(c)} />}
      </div>
      {modo === 'lista' && salaRaros}

      <p className="bb-nota">Os resumos são texto autoral do OrtoQuestões a partir dos capítulos citados, com revisão técnica; as questões e os anos vêm do acervo do site. Figuras originais só aparecem quando há licença de reprodução.</p>
      {fichaAtual && <Inspecao c={fichaAtual} selo={ficha?.selo} leitura={leituras[fichaAtual.id]} fechado={fichaAtual.acesso !== 'gratis' && !premium} indice={indice}
        destaques={marcas.filter((m) => m.capitulo === fichaAtual.id && !m.marcador).length} aoFechar={() => { definirRealce(fichaAtual.id); definirFicha(null) }} />}
      {guia && <GuiaTour id="biblioteca" titulo="Como usar a Biblioteca" passos={PASSOS} aoFechar={() => definirGuia(false)} />}
    </div>
  )
}
