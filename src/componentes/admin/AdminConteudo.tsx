import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { usarIndice } from '../../dados/usarIndice'
import { carregarQuestoes } from '../../dados/acervo'
import { href } from '../../util/rotas'
import { confirmar, pedirTexto } from '../Confirmar'
import { AdminAvaliacoes } from './AdminAvaliacoes'
import { BarrasHorizontais } from './AdminGraficos'
import { dataHora, erroDoPainel, porcentagem } from './formatos'

interface Estatistica { id_questao: string; pessoas: number; acertos_primeira: number; erros_primeira: number; acertos_atual: number }
interface Relato { id: number; id_questao: string; tipo: string; texto: string; status: 'aberto' | 'resolvido' | 'descartado'; nota_admin: string | null; criado_em: string; resolvido_em: string | null; usuario: string | null; avisado_em?: string | null }
export type VistaConteudo = 'suspeitas' | 'faceis' | 'temas' | 'relatos' | 'avaliacoes'

const MIGRACAO = '202609290200_painel_admin_2.sql'
const TIPOS_RELATO: Record<string, string> = { gabarito: 'Gabarito', enunciado: 'Enunciado', imagem: 'Imagem', comentario: 'Comentário', outro: 'Outro' }
const VISTAS: Array<[VistaConteudo, string]> = [['suspeitas', 'Questões suspeitas'], ['faceis', 'Fáceis demais'], ['temas', 'Temas mais fracos'], ['relatos', 'Relatos de erro'], ['avaliacoes', 'Avaliações']]

/** Acerto da primeira tentativa de todos: mede a questão, não o quanto cada um já revisou. */
const acertoPrimeira = (e: Estatistica) => porcentagem(Number(e.acertos_primeira), Number(e.acertos_primeira) + Number(e.erros_primeira))

export function AdminConteudo({ vista: vistaExterna = 'suspeitas', aoMudarVista, aoMudarPendencias, aoEditar }: { vista?: VistaConteudo; aoMudarVista?: (vista: VistaConteudo) => void; aoMudarPendencias?: (n: number) => void; aoEditar?: (id: string) => void }) {
  const { indice } = usarIndice()
  // A vista vem do endereço (#/admin?aba=conteudo&vista=…); o estado local responde ao toque sem esperar o hashchange.
  const [vista, definirVistaLocal] = useState<VistaConteudo>(vistaExterna)
  useEffect(() => { definirVistaLocal(vistaExterna) }, [vistaExterna])
  const definirVista = (nova: VistaConteudo) => { definirVistaLocal(nova); aoMudarVista?.(nova) }
  const [stats, definirStats] = useState<Estatistica[] | null>(null)
  const [relatos, definirRelatos] = useState<Relato[] | null>(null)
  const [erro, definirErro] = useState('')
  const [minimo, definirMinimo] = useState(5)
  const [nomes, definirNomes] = useState<Map<string, { titulo: string; trecho: string }>>(new Map())
  const [mensagensAvaliacao, definirMensagensAvaliacao] = useState<number | null>(null)
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
  // Só avisa a barra depois de ler relatos e avaliações: antes disso o número seria um zero falso.
  useEffect(() => { if (relatos && mensagensAvaliacao !== null) aoMudarPendencias?.(abertos + mensagensAvaliacao) }, [relatos, abertos, mensagensAvaliacao, aoMudarPendencias])

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

  // Resultado da última ação nos relatos, em linha (antes era window.alert).
  const [aviso, definirAviso] = useState<{ texto: string; erro: boolean } | null>(null)
  async function mudarRelato(r: Relato, status: Relato['status']) {
    let nota: string | null = null
    if (status !== 'aberto') {
      // Cancelar a anotação desiste da ação inteira; deixar vazia segue sem nota.
      const escrita = await pedirTexto(status === 'resolvido'
        ? { titulo: 'Marcar relato como resolvido', rotulo: 'O que foi corrigido? (opcional)', texto: 'Vai no e-mail para quem relatou, se você avisar.', valorInicial: r.nota_admin ?? '', sim: 'Marcar resolvido' }
        : { titulo: 'Descartar relato', rotulo: 'Anotação (opcional): por que foi descartado?', valorInicial: r.nota_admin ?? '', sim: 'Descartar' })
      if (escrita === null) return
      nota = escrita
    }
    definirAviso(null)
    try { await chamarRpc('atualizar_relato_admin', { p_id: r.id, p_status: status, p_nota: nota }); await carregarRelatos() } catch { definirAviso({ texto: 'Não foi possível atualizar o relato.', erro: true }); return }
    if (status === 'resolvido' && r.usuario && await confirmar({ titulo: 'Avisar quem relatou?', texto: `Mandar um e-mail para ${r.usuario} dizendo que a questão foi corrigida.`, sim: 'Avisar por e-mail', nao: 'Agora não' })) await avisar(r)
  }

  /** E-mail para quem relatou, dizendo que a questão foi corrigida. */
  async function avisar(r: Relato) {
    try {
      const res = await chamarFuncao<{ resultado?: string; para?: string }>('enviar-email', { acao: 'relato_resolvido', id_relato: r.id })
      definirAviso({ texto: `E-mail enviado para ${res.para ?? r.usuario}.`, erro: false })
      await carregarRelatos()
    } catch (f) {
      const motivo = f instanceof Error ? f.message : ''
      definirAviso({ texto: motivo === 'acao_invalida' ? 'A Function enviar-email ainda é a versão antiga. Atualize-a no Supabase para poder avisar.' : motivo === 'pessoa_nao_quer_emails' ? 'Esta pessoa desligou os e-mails do site, então o aviso não foi enviado.' : `Não foi possível enviar: ${motivo || 'erro desconhecido'}.`, erro: true })
    }
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
      {aoEditar && <div className="linha"><button type="button" className="botao botao--fantasma" onClick={() => aoEditar(s.id_questao)}>Editar questão</button></div>}
    </li>
  }

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-conteudo">
    <div className="adm-secao__cabeca"><div>
      <h2 id="adm-titulo-conteudo">Conteúdo</h2>
      <p>O que os números de todo mundo dizem sobre as questões e os comentários.</p>
    </div></div>
    <div className="adm-filtros" role="tablist" aria-label="Vistas de conteúdo">
      {VISTAS.map(([valor, rotulo]) => <button key={valor} type="button" role="tab" aria-selected={vista === valor} aria-pressed={vista === valor} className="adm-chip" onClick={() => definirVista(valor)}>
        {rotulo}{valor === 'relatos' && abertos > 0 && <span className="adm-chip__alerta">{abertos}</span>}{valor === 'avaliacoes' && !!mensagensAvaliacao && <span className="adm-chip__alerta">{mensagensAvaliacao}</span>}
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

    {vista === 'relatos' && aviso && <p role={aviso.erro ? 'alert' : 'status'} className={'adm-mensagem' + (aviso.erro ? ' adm-mensagem--erro' : '')}>{aviso.texto}</p>}
    {vista === 'relatos' && !erro && (!relatos ? <p role="status">Carregando…</p> : relatos.length === 0 ? <p className="adm-vazio">Nenhum relato ainda. Eles chegam pelo botão "Relatar erro nesta questão".</p> :
      <ul className="adm-avaliacoes">{relatos.map(r => <li key={r.id} className={'adm-avaliacao' + (r.status !== 'aberto' ? ' adm-avaliacao--boa' : '')}>
        <div className="adm-avaliacao__topo"><Nome id={r.id_questao} /><span className={'adm-selo ' + (r.status === 'aberto' ? 'adm-selo--ruim' : 'adm-selo--neutro')}>{TIPOS_RELATO[r.tipo] ?? r.tipo} · {r.status === 'aberto' ? 'em aberto' : r.status}</span></div>
        <blockquote className="adm-avaliacao__texto">{r.texto}</blockquote>
        {r.nota_admin && <small><strong>Anotação:</strong> {r.nota_admin}</small>}
        <small>{r.usuario ?? 'conta removida'} · {dataHora(r.criado_em)}{r.resolvido_em ? ` · fechado em ${dataHora(r.resolvido_em)}` : ''}</small>
        {r.avisado_em && <small>Avisado por e-mail em {dataHora(r.avisado_em)}</small>}
        <div className="linha">
          {aoEditar && <button type="button" className="botao botao--fantasma" onClick={() => aoEditar(r.id_questao)}>Editar questão</button>}
          {r.status === 'resolvido' && r.usuario && !r.avisado_em && <button type="button" className="botao botao--fantasma" onClick={() => void avisar(r)}>Avisar por e-mail</button>}
          {r.status === 'aberto' ? <>
            <button type="button" className="botao botao--principal" onClick={() => void mudarRelato(r, 'resolvido')}>Marcar resolvido</button>
            <button type="button" className="botao botao--fantasma" onClick={() => void mudarRelato(r, 'descartado')}>Descartar</button>
          </> : <button type="button" className="botao botao--fantasma" onClick={() => void mudarRelato(r, 'aberto')}>Reabrir</button>}
        </div>
      </li>)}</ul>)}

    <div hidden={vista !== 'avaliacoes'}><AdminAvaliacoes aoCarregar={definirMensagensAvaliacao} /></div>
  </section>
}
