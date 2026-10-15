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
import '../estilos/paginas/Favoritas.css'

type Situacao = 'nova' | 'acertou' | 'errou'
type Filtro = 'todas' | Situacao

const ROTULO: Record<Situacao, string> = { nova: 'Ainda não respondida', acertou: 'Acertou na última', errou: 'Errou na última' }
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })

function situacaoDe(registro?: RegistroQuestao): Situacao {
  if (!registro || registro.c === null || registro.c === undefined) return 'nova'
  return registro.c ? 'acertou' : 'errou'
}

/**
 * As favoritas precisavam de um lugar. A estrela existia em toda questão e
 * guardava a marcação, mas não havia tela nenhuma para ver o que foi marcado —
 * a pessoa marcava e a marcação não levava a lugar algum.
 *
 * 15/10/2026: mesmo herói do Caderno de erros e da Revisão, cartões com a
 * situação de cada favorita (nova, acertou ou errou na última vez), filtro
 * por situação, treino só do filtro e "Desfazer" ao tirar a estrela.
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
  const [removida, definirRemovida] = useState<string | null>(null)

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
  const visiveis = filtro === 'todas' ? ordenadas : ordenadas.filter((id) => situacaoDe(respondidas[id]) === filtro)

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
      <div className="empilha-2">
        <section className="rv-heroi fv-heroi">
          <div>
            <p className="rv-heroi__sobrelinha"><Icone nome="estrela" tamanho={16} /> Favoritas</p>
            <h1>Nenhuma favorita, ainda.</h1>
            <p className="rv-heroi__texto">
              Durante a sessão, a estrela no alto da questão (ou a tecla <kbd>F</kbd>) guarda ela aqui. Serve para separar
              o que você quer rever depois, sem depender de terminar a sessão.
            </p>
            <a className="botao rv-heroi__acao" href={href('/treinar')}>Montar uma sessão</a>
          </div>
        </section>
        {avisoDesfazer}
      </div>
    )
  }

  const abas: Array<[Filtro, string, number]> = [
    ['todas', 'Todas', favoritos.length],
    ['errou', 'Errou', contagem.errou],
    ['nova', 'Novas', contagem.nova],
    ['acertou', 'Acertou', contagem.acertou],
  ]

  return (
    <div className="empilha-2 fv">
      <section className="rv-heroi fv-heroi">
        <div>
          <p className="rv-heroi__sobrelinha"><Icone nome="estrela" tamanho={16} /> Favoritas</p>
          <h1>
            <span className="rv-heroi__numero numerico">{favoritos.length}</span>
            {favoritos.length === 1 ? 'questão guardada para rever' : 'questões guardadas para rever'}
          </h1>
          <p className="rv-heroi__texto">
            {sessao
              ? 'Sincronizadas com a sua conta: aparecem em qualquer aparelho em que você entrar.'
              : <>Guardadas só neste navegador, junto com o resto dos seus <a href={href('/dados')}>dados locais</a>. Entre na sua conta para levar para outros aparelhos.</>}
          </p>
          <div className="linha linha--empilha-celular">
            <button type="button" className="botao rv-heroi__acao" onClick={() => treinar(ordenadas)}>
              Treinar {porId.size === 1 ? 'a favorita' : `as ${porId.size} favoritas`}
            </button>
            {contagem.errou > 0 && contagem.errou < favoritos.length && (
              <button type="button" className="botao rv-heroi__secundaria" onClick={() => treinar(ordenadas.filter((id) => situacaoDe(respondidas[id]) === 'errou'))}>
                {contagem.errou === 1 ? 'Só a que errei' : `Só as ${contagem.errou} que errei`}
              </button>
            )}
          </div>
        </div>
        <dl className="rv-heroi__numeros">
          <div><dt>Errou na última</dt><dd className="numerico">{contagem.errou}</dd></div>
          <div><dt>Ainda não respondidas</dt><dd className="numerico">{contagem.nova}</dd></div>
        </dl>
      </section>

      {avisoDesfazer}

      <div className="fv-abas" role="group" aria-label="Filtrar favoritas">
        {abas.filter(([valor, , n]) => valor === 'todas' || n > 0).map(([valor, rotulo, n]) => (
          <button key={valor} type="button" aria-pressed={filtro === valor} className={filtro === valor ? 'ativo' : ''} onClick={() => definirFiltro(valor)}>
            {rotulo} <span className="numerico">{n}</span>
          </button>
        ))}
      </div>

      <ul className="fv-lista">
        {visiveis.map((id) => {
          const questao = porId.get(id)
          const registro = respondidas[id]
          const situacao = situacaoDe(registro)
          return (
            <li className={`fv-item fv-item--${situacao}`} key={id}>
              <a className="fv-item__corpo" href={href(`/questao/${id}`)}>
                {questao ? (
                  <>
                    <span className="fv-item__topo">
                      {mostrarEtiquetas
                        ? <span className="fv-item__assunto">{questao.tema}{questao.subtemas[0] ? ` · ${questao.subtemas[0]}` : ''}</span>
                        : <span className="fv-item__assunto">{[questao.prova, questao.ano].filter(Boolean).join(' · ') || 'Questão'}</span>}
                      <span className={`fv-selo fv-selo--${situacao}`}>
                        {situacao !== 'nova' && <Icone nome={situacao === 'acertou' ? 'certo' : 'errado'} tamanho={12} />}
                        {ROTULO[situacao]}
                      </span>
                    </span>
                    <span className="fv-item__enunciado">
                      {questao.enunciado.slice(0, 180)}
                      {questao.enunciado.length > 180 ? '…' : ''}
                    </span>
                    {registro?.q ? (
                      <span className="fv-item__meta">
                        Última resposta em {dataCurta.format(new Date(registro.q))}
                        {registro.tentativas && registro.tentativas > 1 ? ` · ${registro.tentativas} tentativas` : ''}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="texto-2">
                    <span className="numerico">{id}</span>: esta questão saiu do acervo.
                  </span>
                )}
              </a>
              <button
                type="button"
                className="fv-item__estrela"
                onClick={() => remover(id)}
                aria-label={`Tirar ${id} das favoritas`}
                title="Tirar das favoritas"
              >
                <EstrelaCheia />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
