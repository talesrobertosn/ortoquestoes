import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { usarIndice } from '../../dados/usarIndice'
import { carregarQuestoes } from '../../dados/acervo'
import { href } from '../../util/rotas'
import { AdminAvaliacoes } from './AdminAvaliacoes'
import { BarrasHorizontais } from './AdminGraficos'
import { dataHora, erroDoPainel, porcentagem } from './formatos'

interface Estatistica { id_questao: string; pessoas: number; acertos_primeira: number; erros_primeira: number; acertos_atual: number }
interface Relato { id: number; id_questao: string; tipo: string; texto: string; status: 'aberto' | 'resolvido' | 'descartado'; nota_admin: string | null; criado_em: string; resolvido_em: string | null; usuario: string | null }
export type VistaConteudo = 'suspeitas' | 'faceis' | 'temas' | 'relatos' | 'avaliacoes'

const MIGRACAO = '202609290200_painel_admin_2.sql'
const TIPOS_RELATO: Record<string, string> = { gabarito: 'Gabarito', enunciado: 'Enunciado', imagem: 'Imagem', comentario: 'Comentário', outro: 'Outro' }
const VISTAS: Array<[VistaConteudo, string]> = [['suspeitas', 'Questões suspeitas'], ['faceis', 'Fáceis demais'], ['temas', 'Temas mais fracos'], ['relatos', 'Relatos de erro'], ['avaliacoes', 'Avaliações']]

/** Acerto da primeira tentativa de todos: mede a questão, não o quanto cada um já revisou. */
const acertoPrimeira = (e: Estatistica) => porcentagem(Number(e.acertos_primeira), Number(e.acertos_primeira) + Number(e.erros_primeira))

export function AdminConteudo({ vistaInicial = 'suspeitas', aoMudarPendencias }: { vistaInicial?: VistaConteudo; aoMudarPendencias?: (n: number) => void }) {
  const { indice } = usarIndice()
  const [vista, definirVista] = useState<VistaConteudo>(vistaInicial)
  const [stats, definirStats] = useState<Estatistica[] | null>(null)
  const [relatos, definirRelatos] = useState<Relato[] | null>(null)
  const [erro, definirErro] = useState('')
  const [minimo, definirMinimo] = useState(5)
  const [nomes, definirNomes] = useState<Map<string, { titulo: string; trecho: string }>>(new Map())
  const [mensagensAvaliacao, definirMensagensAvaliacao] = useState(0)
  // Ids já pedidos ao acervo, achados ou não: sem isto, um id inexistente pediria de novo a cada render.
  const pedidos = useRef(new Set<string>())

  const carregarRelatos = useCallback(async () => {
    try { definirRelatos(await chamarRpc<Relato[]>('listar_relatos_admin', {})) } catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
  }, [])
  useEffect(() => {
    chamarRpc<Estatistica[]>('estatisticas_questoes_admin', {}).then(definirStats).catch(f => definirErro(erroDoPainel(f, MIGRACAO)))
    void carregarRelatos()
  }, [carregarRelatos])

  const abertos = relatos?.filter(r => r.status === 'aberto').length ?? 0
  useEffect(() => { aoMudarPendencias?.(abertos + mensagensAvaliacao) }, [abertos, mensagensAvaliacao, aoMudarPendencias])

  const comAmostra = useMemo(() => (stats ?? []).filter(s => Number(s.acertos_primeira) + Number(s.erros_primeira) >= minimo), [stats, minimo])
  const suspeitas = useMemo(() => [...comAmostra].filter(s => (acertoPrimeira(s) ?? 100) <= 30).sort((a, b) => (acertoPrimeira(a) ?? 0) - (acertoPrimeira(b) ?? 0) || Number(b.pessoas) - Number(a.pessoas)).slice(0, 60), [comAmostra])
  const faceis = useMemo(() => [...comAmostra].filter(s => (acertoPrimeira(s) ?? 0) >= 95).sort((a, b) => Number(b.pessoas) - Number(a.pessoas)).slice(0, 60), [comAmostra])

  // Nome e começo do enunciado de quem aparece nas listas.
  useEffect(() => {
    if (!indice) return
    const ids = [...new Set([...suspeitas, ...faceis].map(s => s.id_questao).concat((relatos ?? []).map(r => r.id_questao)))].filter(id => !pedidos.current.has(id))
    if (!ids.length) return
    ids.forEach(id => pedidos.current.add(id))
    let vivo = true
    carregarQuestoes(indice, ids).then(qs => {
      if (!vivo) return
      definirNomes(atual => {
        const novo = new Map(atual)
        for (const q of qs) {
          const [, numero] = q.id.match(/-(\d+)$/) ?? []
          const texto = q.enunciado.replace(/\s+/g, ' ').trim()
          novo.set(q.id, { titulo: [q.tema, q.prova ? `${q.prova}${q.ano ? ' ' + q.ano : ''}` : null, numero ? `Questão ${Number(numero)}` : q.id].filter(Boolean).join(' · '), trecho: texto.length > 140 ? texto.slice(0, 140).replace(/\s\S*$/, '') + '…' : texto })
        }
        return novo
      })
    }).catch(() => undefined)
    return () => { vivo = false }
  }, [indice, suspeitas, faceis, relatos])

  const temas = useMemo(() => {
    if (!indice || !stats) return []
    const temaDe = new Map(indice.questoes.map(q => [q.id, q.t]))
    const soma = new Map<number, { acertos: number; erros: number; questoes: number }>()
    for (const s of stats) {
      const t = temaDe.get(s.id_questao)
      if (t === undefined) continue
      const item = soma.get(t) ?? { acertos: 0, erros: 0, questoes: 0 }
      item.acertos += Number(s.acertos_primeira); item.erros += Number(s.erros_primeira); item.questoes++
      soma.set(t, item)
    }
    return [...soma].map(([t, v]) => ({ nome: indice.temas[t]?.nome ?? String(t), acerto: porcentagem(v.acertos, v.acertos + v.erros) ?? 0, respostas: v.acertos + v.erros, questoes: v.questoes }))
      .filter(t => t.respostas >= 10).sort((a, b) => a.acerto - b.acerto)
  }, [indice, stats])

  async function mudarRelato(r: Relato, status: Relato['status']) {
    const nota = status === 'aberto' ? null : window.prompt('Anotação (opcional): o que foi feito?', r.nota_admin ?? '') ?? r.nota_admin
    try { await chamarRpc('atualizar_relato_admin', { p_id: r.id, p_status: status, p_nota: nota }); await carregarRelatos() } catch { window.alert('Não foi possível atualizar o relato.') }
  }

  const Nome = ({ id }: { id: string }) => {
    const q = nomes.get(id)
    return <div className="adm-questao"><a href={href(`/questao/${id}`)} target="_blank" rel="noopener noreferrer">{q?.titulo ?? id}</a>{q?.trecho && <p>{q.trecho}</p>}</div>
  }
  const Linha = ({ s }: { s: Estatistica }) => {
    const pct = acertoPrimeira(s) ?? 0
    return <li className="adm-avaliacao adm-questao-stat">
      <div className="adm-avaliacao__topo"><Nome id={s.id_questao} /><span className={'adm-selo ' + (pct <= 30 ? 'adm-selo--ruim' : 'adm-selo--ok')}>{pct}% de primeira</span></div>
      <small>{s.pessoas} pessoa(s) responderam · hoje {porcentagem(Number(s.acertos_atual), Number(s.pessoas)) ?? 0}% acertam (depois das revisões)</small>
    </li>
  }

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-conteudo">
    <div className="adm-secao__cabeca"><div>
      <h2 id="adm-titulo-conteudo">Conteúdo</h2>
      <p>O que os números de todo mundo dizem sobre as questões e os comentários.</p>
    </div></div>
    <div className="adm-filtros" role="tablist" aria-label="Vistas de conteúdo">
      {VISTAS.map(([valor, rotulo]) => <button key={valor} type="button" role="tab" aria-selected={vista === valor} aria-pressed={vista === valor} className="adm-chip" onClick={() => definirVista(valor)}>
        {rotulo}{valor === 'relatos' && abertos > 0 && <span className="adm-chip__alerta">{abertos}</span>}{valor === 'avaliacoes' && mensagensAvaliacao > 0 && <span className="adm-chip__alerta">{mensagensAvaliacao}</span>}
      </button>)}
    </div>
    {erro && vista !== 'avaliacoes' && <p role="alert" className="adm-alerta">{erro}</p>}

    {(vista === 'suspeitas' || vista === 'faceis') && !erro && <>
      <p className="adm-nota">{vista === 'suspeitas'
        ? 'Acerto de primeira tentativa de 30% ou menos. Costuma ser gabarito desatualizado, enunciado ambíguo ou imagem trocada, e às vezes é só a questão difícil que dá um bom post.'
        : 'Acerto de primeira tentativa de 95% ou mais. Boas para aquecer, fracas para diferenciar quem sabe.'}</p>
      <label className="campo adm-busca__unica">Só questões respondidas por pelo menos
        <select className="entrada" value={minimo} onChange={e => definirMinimo(Number(e.target.value))}>{[3, 5, 10, 20].map(v => <option key={v} value={v}>{v} pessoas</option>)}</select>
      </label>
      {!stats ? <p role="status">Carregando…</p> : (vista === 'suspeitas' ? suspeitas : faceis).length === 0
        ? <p className="adm-vazio">Nenhuma questão neste critério ainda. Com mais gente respondendo, a lista aparece.</p>
        : <ul className="adm-avaliacoes">{(vista === 'suspeitas' ? suspeitas : faceis).map(s => <Linha key={s.id_questao} s={s} />)}</ul>}
    </>}

    {vista === 'temas' && !erro && (!stats ? <p role="status">Carregando…</p> : temas.length === 0 ? <p className="adm-vazio">Ainda não há respostas suficientes por tema.</p> : <>
      <p className="adm-nota">Acerto de primeira tentativa de todos, por tema, do mais fraco para o mais forte. Onde reforçar comentários e o que render conteúdo no Instagram.</p>
      <BarrasHorizontais maximo={100} formato={v => `${v}%`} itens={temas.map(t => ({ rotulo: t.nome, valor: t.acerto, detalhe: `${t.respostas.toLocaleString('pt-BR')} respostas em ${t.questoes} questões`, destaque: t.acerto < 55 ? 'ruim' : t.acerto >= 75 ? 'bom' : undefined }))} />
    </>)}

    {vista === 'relatos' && !erro && (!relatos ? <p role="status">Carregando…</p> : relatos.length === 0 ? <p className="adm-vazio">Nenhum relato ainda. Eles chegam pelo botão "Relatar erro nesta questão".</p> :
      <ul className="adm-avaliacoes">{relatos.map(r => <li key={r.id} className={'adm-avaliacao' + (r.status !== 'aberto' ? ' adm-avaliacao--boa' : '')}>
        <div className="adm-avaliacao__topo"><Nome id={r.id_questao} /><span className={'adm-selo ' + (r.status === 'aberto' ? 'adm-selo--ruim' : 'adm-selo--neutro')}>{TIPOS_RELATO[r.tipo] ?? r.tipo} · {r.status === 'aberto' ? 'em aberto' : r.status}</span></div>
        <blockquote className="adm-avaliacao__texto">{r.texto}</blockquote>
        {r.nota_admin && <small><strong>Anotação:</strong> {r.nota_admin}</small>}
        <small>{r.usuario ?? 'conta removida'} · {dataHora(r.criado_em)}{r.resolvido_em ? ` · fechado em ${dataHora(r.resolvido_em)}` : ''}</small>
        <div className="linha">
          {r.status === 'aberto' ? <>
            <button type="button" className="botao botao--principal" onClick={() => void mudarRelato(r, 'resolvido')}>Marcar resolvido</button>
            <button type="button" className="botao botao--fantasma" onClick={() => void mudarRelato(r, 'descartado')}>Descartar</button>
          </> : <button type="button" className="botao botao--fantasma" onClick={() => void mudarRelato(r, 'aberto')}>Reabrir</button>}
        </div>
      </li>)}</ul>)}

    <div hidden={vista !== 'avaliacoes'}><AdminAvaliacoes aoCarregar={definirMensagensAvaliacao} /></div>
  </section>
}
