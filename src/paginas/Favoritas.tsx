import { useEffect, useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { carregarQuestoes } from '../dados/acervo'
import { AREAS_TREINO, FILTROS_VAZIOS, type Questao } from '../dados/tipos'
import { Carregando } from '../componentes/Estados'
import { EstrelaCheia, Icone } from '../componentes/Icone'
import { CHAVE_RESPONDIDAS, usarFavoritos, usarSessao } from '../estado/sessao'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarEtiquetas } from '../estado/preferencias'
import { href, navegar } from '../util/rotas'
import { usarConta } from '../conta/ContextoConta'
import { TopoVila } from '../componentes/vila/TopoVila'
import { CENA_GABINETE, DICAS_FAVORITAS } from '../componentes/vila/cenas'
import '../estilos/paginas/Favoritas.css'

type Situacao = 'nova' | 'acertou' | 'errou'
type Filtro = 'todas' | Situacao

const ROTULO: Record<Situacao, string> = { nova: 'Ainda não respondida', acertou: 'Acertou na última', errou: 'Errou na última' }
const ICONE: Record<Situacao, 'certo' | 'errado' | 'alvo'> = { nova: 'alvo', acertou: 'certo', errou: 'errado' }
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
/** A partir de quantas favoritas na tela vale separar por tema. */
const AGRUPAR_A_PARTIR = 7

function situacaoDe(registro?: RegistroQuestao): Situacao {
  if (!registro || registro.c === null || registro.c === undefined) return 'nova'
  return registro.c ? 'acertou' : 'errou'
}

/** Título do topo: o nome e a quantidade; abaixo de 10, "os primeiros passos" em vez do número. */
function tituloFavoritas(nome: string, total: number) {
  const corpo = total >= 10 ? `${total.toLocaleString('pt-BR')} questões guardadas para rever` : null
  if (corpo) return nome ? `${nome}, ${corpo}` : corpo.charAt(0).toUpperCase() + corpo.slice(1)
  return nome ? `${nome}, os primeiros passos das suas favoritas` : 'Os primeiros passos das suas favoritas'
}

/** Uma frase só, com o dado mais útil: o que errou na última vez, ou o que ainda não respondeu. */
function fraseFavoritas(c: Record<Situacao, number>, total: number) {
  if (c.errou > 0) return 'Algumas delas você errou na última vez: são o melhor ponto de partida.'
  if (c.nova === total) return 'Nenhuma respondida ainda. Um treino só com elas é um bom começo.'
  if (c.nova > 0) return 'Parte delas você ainda não respondeu. Treinar junta as novas e as que já viu.'
  return 'Você acertou todas na última vez. Rever de tempos em tempos é o que fixa.'
}

/**
 * As favoritas precisavam de um lugar. A estrela existia em toda questão e
 * guardava a marcação, mas não havia tela nenhuma para ver o que foi marcado —
 * a pessoa marcava e a marcação não levava a lugar algum.
 *
 * 15/10/2026: mesmo herói do Caderno de erros e da Revisão, cartões com a
 * situação de cada favorita (nova, acertou ou errou na última vez), filtro
 * por situação, treino só do filtro e "Desfazer" ao tirar a estrela.
 *
 * 19/10/2026: temporada pixel. Topo com o nome e o céu da marca, filtros por
 * situação, tema e prova, linhas compactas agrupadas por tema e uma tela vazia
 * que ensina a guardar (a estrela no alto da questão, ou a tecla F).
 */
export function Favoritas() {
  const { sessao } = usarConta()
  const { indice } = usarIndice()
  const { favoritos, alternar } = usarFavoritos()
  const { iniciarComAviso } = usarSessao()
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>(CHAVE_RESPONDIDAS, {})
  // Quem escondeu as etiquetas para não se entregar não quer vê-las aqui
  // tampouco: desta lista se sai direto para uma sessão com essas questões.
  const { mostrarEtiquetas } = usarEtiquetas()
  const [questoes, definirQuestoes] = useState<Questao[] | null>(null)
  const [filtro, definirFiltro] = useState<Filtro>('todas')
  const [tema, definirTema] = useState<string | null>(null)
  const [prova, definirProva] = useState<string>('')
  const [removida, definirRemovida] = useState<string | null>(null)
  const primeiroNome = String(sessao?.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0] ?? ''

  const chave = favoritos.join(',')
  useEffect(() => {
    if (!indice) return
    if (favoritos.length === 0) {
      definirQuestoes([])
      return
    }
    let vivo = true
    carregarQuestoes(indice, favoritos).then((lista) => vivo && definirQuestoes(lista))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, chave])

  // O aviso de "Desfazer" some sozinho depois de alguns segundos.
  useEffect(() => {
    if (!removida) return
    const t = window.setTimeout(() => definirRemovida(null), 6000)
    return () => window.clearTimeout(t)
  }, [removida])

  const porId = useMemo(
    () => new Map((questoes ?? []).map((q) => [q.id, q])),
    [questoes],
  )
  // Mais recente primeiro: a estrela de hoje é a que a pessoa procura.
  const ordenadas = useMemo(() => [...favoritos].reverse(), [favoritos])
  const contagem = useMemo(() => {
    const c: Record<Situacao, number> = { nova: 0, acertou: 0, errou: 0 }
    for (const id of favoritos) c[situacaoDe(respondidas[id])]++
    return c
  }, [favoritos, respondidas])

  const daSituacao = filtro === 'todas' ? ordenadas : ordenadas.filter((id) => situacaoDe(respondidas[id]) === filtro)
  // Temas e provas que existem no recorte da situação, do mais cheio ao mais vazio.
  const temas = useMemo(() => contar(daSituacao.map((id) => porId.get(id)?.tema)), [daSituacao, porId])
  const provas = useMemo(() => contar(daSituacao.map((id) => porId.get(id)?.prova ?? undefined)), [daSituacao, porId])
  const temaAtivo = mostrarEtiquetas && tema && temas.some(([t]) => t === tema) ? tema : null
  const provaAtiva = prova && provas.some(([p]) => p === prova) ? prova : ''
  const visiveis = daSituacao.filter((id) => {
    const q = porId.get(id)
    if (temaAtivo && q?.tema !== temaAtivo) return false
    if (provaAtiva && q?.prova !== provaAtiva) return false
    return true
  })
  const recortado = visiveis.length !== ordenadas.length

  // Agrupa por tema quando ajuda a achar (lista longa, várias áreas, etiquetas à mostra).
  const grupos = useMemo(() => {
    if (!mostrarEtiquetas || temaAtivo || visiveis.length < AGRUPAR_A_PARTIR) return null
    const mapa = new Map<string, string[]>()
    for (const id of visiveis) {
      const nome = porId.get(id)?.tema ?? 'Fora do acervo'
      mapa.set(nome, [...(mapa.get(nome) ?? []), id])
    }
    if (mapa.size < 2) return null
    return [...mapa.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [mostrarEtiquetas, temaAtivo, visiveis, porId])

  async function treinar(ids: string[]) {
    const existentes = ids.filter((id) => porId.has(id))
    if (existentes.length === 0) return
    if (!(await iniciarComAviso({ ...FILTROS_VAZIOS, areas: AREAS_TREINO, situacao: 'favoritas' }, existentes, {}))) return
    navegar('/sessao')
  }

  function remover(id: string) {
    alternar(id)
    definirRemovida(id)
  }

  if (!questoes) return <Carregando linhas={5} rotulo="Carregando suas favoritas" />

  const avisoDesfazer = removida && !favoritos.includes(removida) && (
    <p className="fv-desfazer" role="status">
      <span>Tirada das favoritas.</span>
      <button type="button" onClick={() => { alternar(removida); definirRemovida(null) }}>
        <Icone nome="reiniciar" tamanho={15} /> Desfazer
      </button>
    </p>
  )

  if (favoritos.length === 0) {
    return (
      <div className="fv">
        <TopoVila cena={CENA_GABINETE} rotulo="fv-titulo" dicas={DICAS_FAVORITAS}
          cabeca={<>
            <p className="vl__selo"><EstrelaCheia tamanho={13} /> Favoritas</p>
            <h1 id="fv-titulo">{primeiroNome ? `${primeiroNome}, suas favoritas moram aqui` : 'Suas favoritas moram aqui'}</h1>
          </>}
          texto={<>
            <p>Você ainda não favoritou nenhuma questão. Guarde as que quer rever e treine só com elas quando quiser.</p>
            <div className="vl-acoes">
              <a className="vl-acao cristal" href={href('/treinar')}>
                <Icone nome="raio" tamanho={20} />
                <span><strong>Montar uma sessão</strong><small>e guardar as que valem rever</small></span>
              </a>
            </div>
          </>} />
        {avisoDesfazer}
        <section className="fv-passos" aria-labelledby="fv-passos-titulo">
          <h2 id="fv-passos-titulo" className="fv-rotulo">Como guardar uma questão</h2>
          <ol>
            <li className="px-cartao">
              <span className="px-numero" aria-hidden="true">1</span>
              <div>
                <strong>Toque na estrela</strong>
                <p>Ela fica no alto de cada questão, durante a sessão ou ao abrir uma questão sozinha. No computador, a tecla <kbd>F</kbd> faz o mesmo.</p>
              </div>
            </li>
            <li className="px-cartao">
              <span className="px-numero" aria-hidden="true">2</span>
              <div>
                <strong>Ela aparece aqui</strong>
                <p>Com o tema, a prova e como foi a sua última resposta. {sessao ? 'Fica salva na sua conta, em qualquer aparelho.' : 'Sem conta, fica salva só neste navegador.'}</p>
              </div>
            </li>
            <li className="px-cartao">
              <span className="px-numero" aria-hidden="true">3</span>
              <div>
                <strong>Treine só com elas</strong>
                <p>Um toque monta a sessão com as favoritas. Quando dominar uma, toque de novo na estrela para tirá-la.</p>
              </div>
            </li>
          </ol>
        </section>
      </div>
    )
  }

  const abas: Array<[Filtro, string, number]> = [
    ['todas', 'Todas', favoritos.length],
    ['errou', 'Errei', contagem.errou],
    ['nova', 'Novas', contagem.nova],
    ['acertou', 'Acertei', contagem.acertou],
  ]

  const linha = (id: string) => {
    const questao = porId.get(id)
    const registro = respondidas[id]
    const situacao = situacaoDe(registro)
    const origem = questao ? [questao.prova, questao.ano].filter(Boolean).join(' · ') : ''
    return (
      <li className={`fv-item fv-item--${situacao}`} key={id}>
        <span className="fv-item__icone" aria-hidden="true"><Icone nome={ICONE[situacao]} tamanho={16} /></span>
        <a className="fv-item__corpo" href={href(`/questao/${id}`)}>
          {questao ? (
            <>
              <span className="fv-item__topo">
                <span className="fv-item__id">{id}</span>
                {origem && <span>{origem}</span>}
                {mostrarEtiquetas && <span className="fv-item__assunto">{grupos ? (questao.subtemas[0] ?? questao.tema) : `${questao.tema}${questao.subtemas[0] ? ` · ${questao.subtemas[0]}` : ''}`}</span>}
              </span>
              <span className="fv-item__enunciado">{questao.enunciado.slice(0, 180)}{questao.enunciado.length > 180 ? '…' : ''}</span>
              <span className="fv-item__meta">
                <span className={`fv-selo fv-selo--${situacao}`}>{ROTULO[situacao]}</span>
                {registro?.q ? (
                  <span>
                    em {dataCurta.format(new Date(registro.q))}
                    {registro.tentativas && registro.tentativas > 1 ? ` · ${registro.tentativas} tentativas` : ''}
                  </span>
                ) : null}
              </span>
            </>
          ) : (
            <span className="fv-item__enunciado texto-2">
              <span className="fv-item__id">{id}</span>: esta questão saiu do acervo.
            </span>
          )}
        </a>
        <span className="fv-item__acoes">
          <a className="fv-item__abrir" href={href(`/questao/${id}`)} tabIndex={-1} aria-hidden="true">Abrir <Icone nome="direita" tamanho={14} /></a>
          <button
            type="button"
            className="fv-item__estrela"
            onClick={() => remover(id)}
            aria-label={`Tirar ${id} das favoritas`}
            title="Tirar das favoritas"
          >
            <EstrelaCheia />
          </button>
        </span>
      </li>
    )
  }

  return (
    <div className="fv">
      <TopoVila cena={CENA_GABINETE} rotulo="fv-titulo" dicas={DICAS_FAVORITAS}
        cabeca={<>
          <p className="vl__selo"><EstrelaCheia tamanho={13} /> Favoritas</p>
          <h1 id="fv-titulo">{tituloFavoritas(primeiroNome, favoritos.length)}</h1>
        </>}
        texto={<>
          <p>{fraseFavoritas(contagem, favoritos.length)}</p>
          <div className="vl-acoes">
            <button type="button" className="vl-acao cristal" onClick={() => treinar(ordenadas)}>
              <Icone nome="raio" tamanho={20} />
              <span><strong>Treinar as favoritas</strong><small>{porId.size === 1 ? 'uma sessão com a sua favorita' : 'uma sessão só com elas'}</small></span>
            </button>
          </div>
        </>}
        bancada={
          <dl className="vl-placas">
            <div className="vl-placa"><dt><Icone nome="errado" tamanho={13} /> Errou na última</dt><dd><span className="vl-placa__valor">{contagem.errou}</span><span className="vl-placa__apoio">pedem revanche</span></dd></div>
            <div className="vl-placa"><dt><Icone nome="alvo" tamanho={13} /> Ainda novas</dt><dd><span className="vl-placa__valor">{contagem.nova}</span><span className="vl-placa__apoio">guardadas sem responder</span></dd></div>
            <div className="vl-placa"><dt><Icone nome="certo" tamanho={13} /> Acertou na última</dt><dd><span className="vl-placa__valor">{contagem.acertou}</span><span className="vl-placa__apoio">vale manter de olho</span></dd></div>
          </dl>
        } />

      {avisoDesfazer}

      <section className="fv-filtros" aria-label="Filtrar favoritas">
        <div className="fv-segmentos" role="group" aria-label="Situação">
          {abas.filter(([valor, , n]) => valor === 'todas' || n > 0).map(([valor, rotulo, n]) => (
            <button key={valor} type="button" aria-pressed={filtro === valor} className={filtro === valor ? 'ativo' : ''} onClick={() => definirFiltro(valor)}>
              {rotulo} <span>{n}</span>
            </button>
          ))}
        </div>
        {provas.length > 1 && (
          <label className="fv-prova">
            <span>Prova</span>
            <select className="entrada" value={provaAtiva} onChange={(e) => definirProva(e.target.value)}>
              <option value="">Todas</option>
              {provas.map(([p, n]) => <option key={p} value={p}>{p} ({n})</option>)}
            </select>
          </label>
        )}
        {mostrarEtiquetas && temas.length > 1 && (
          <div className="fv-temas" role="group" aria-label="Tema">
            <button type="button" aria-pressed={!temaAtivo} onClick={() => definirTema(null)}>Todos os temas</button>
            {temas.map(([t, n]) => (
              <button type="button" key={t} aria-pressed={temaAtivo === t} onClick={() => definirTema(t)}>
                {t} <span>{n}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {recortado && visiveis.length > 0 && (
        <div className="fv-recorte">
          <p>{visiveis.length === 1 ? 'Uma favorita neste filtro.' : `${visiveis.length} favoritas neste filtro.`}</p>
          <button type="button" className="botao botao--fantasma" onClick={() => treinar(visiveis)}>
            <Icone nome="raio" tamanho={15} /> {visiveis.length === 1 ? 'Treinar esta' : `Treinar estas ${visiveis.length}`}
          </button>
        </div>
      )}

      {visiveis.length === 0 ? (
        <p className="estado">Nenhuma favorita com esses filtros.</p>
      ) : grupos ? (
        <div className="fv-grupos">
          {grupos.map(([nome, ids]) => (
            <section key={nome} className="fv-grupo" aria-label={nome}>
              <h2 className="fv-grupo__titulo">{nome} <span>{ids.length}</span></h2>
              <ul className="fv-lista">{ids.map(linha)}</ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="fv-lista">{visiveis.map(linha)}</ul>
      )}

      <p className="fv-dica">
        <EstrelaCheia />
        <span>
          Para guardar mais, toque na estrela no alto de qualquer questão (no computador, a tecla <kbd>F</kbd>). Para tirar, toque na estrela da linha.{' '}
          {sessao
            ? 'Elas ficam na sua conta e aparecem em qualquer aparelho em que você entrar.'
            : <>Sem conta, ficam só neste navegador, junto com o resto dos seus <a href={href('/dados')}>dados locais</a>. Entre na sua conta para levar para outros aparelhos.</>}
        </span>
      </p>
    </div>
  )
}

/** Conta valores e devolve do mais frequente ao menos frequente. */
function contar(valores: Array<string | undefined>): Array<[string, number]> {
  const mapa = new Map<string, number>()
  for (const v of valores) if (v) mapa.set(v, (mapa.get(v) ?? 0) + 1)
  return [...mapa.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
}
