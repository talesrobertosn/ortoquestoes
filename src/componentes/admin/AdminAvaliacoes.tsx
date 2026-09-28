import { useCallback, useEffect, useMemo, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { href } from '../../util/rotas'
import { usarIndice } from '../../dados/usarIndice'
import { carregarQuestoes } from '../../dados/acervo'
import { corresponde, dataHora, erroDoPainel, normalizar } from './formatos'

interface LinhaAvaliacao { id_questao: string; util: boolean; motivo: string | null; observacao: string | null; atualizado_em: string; usuario: string | null }
interface InfoQuestao { titulo: string; trecho: string }

const MOTIVOS: Record<string, string> = { confuso: 'Ficou confuso', raso: 'Faltou profundidade', errado: 'Parece ter erro', outro: 'Outro motivo' }
type Vista = 'ler' | 'questoes' | 'todas'

/** "Coluna · TEOT 2024 · nº 28" a partir do id e do que já se sabe da questão. */
function tituloPadrao(id: string) {
  const [, numero] = id.match(/-(\d+)$/) ?? []
  return numero ? `Questão ${Number(numero)}` : id
}

/**
 * "Este comentário te ajudou?" no painel, em três vistas: mensagens para ler
 * (não ajudou e deixou texto), o placar por questão (onde mexer primeiro) e
 * a lista completa. Cada questão aparece com tema, prova e começo do enunciado.
 */
export function AdminAvaliacoes({ aoCarregar }: { aoCarregar?: (pendentes: number) => void }) {
  const { indice } = usarIndice()
  const [linhas, definirLinhas] = useState<LinhaAvaliacao[] | null>(null)
  const [erro, definirErro] = useState('')
  const [vista, definirVista] = useState<Vista>('ler')
  const [busca, definirBusca] = useState('')
  const [info, definirInfo] = useState<Map<string, InfoQuestao>>(new Map())

  const carregar = useCallback(async () => {
    try {
      const dados = await chamarRpc<LinhaAvaliacao[]>('listar_avaliacoes_comentario_admin', {})
      definirLinhas(dados); definirErro('')
      aoCarregar?.(dados.filter(l => !l.util && l.observacao?.trim()).length)
    } catch (falha) {
      definirErro(erroDoPainel(falha, '202609280200_avaliacoes_comentario_admin.sql'))
    }
  }, [aoCarregar])
  useEffect(() => { void carregar() }, [carregar])

  // Nome das questões: tema, prova e começo do enunciado, em vez do código.
  useEffect(() => {
    if (!indice || !linhas?.length) return
    let vivo = true
    const ids = [...new Set(linhas.map(l => l.id_questao))]
    carregarQuestoes(indice, ids).then(questoes => {
      if (!vivo) return
      const mapa = new Map<string, InfoQuestao>()
      for (const q of questoes) {
        const prova = q.prova ? `${q.prova}${q.ano ? ' ' + q.ano : ''}` : null
        const enunciado = q.enunciado.replace(/\s+/g, ' ').trim()
        mapa.set(q.id, {
          titulo: [q.tema, prova, tituloPadrao(q.id)].filter(Boolean).join(' · '),
          trecho: enunciado.length > 150 ? enunciado.slice(0, 150).replace(/\s\S*$/, '') + '…' : enunciado,
        })
      }
      definirInfo(mapa)
    }).catch(() => undefined)
    return () => { vivo = false }
  }, [indice, linhas])

  const nome = (id: string) => info.get(id) ?? { titulo: tituloPadrao(id), trecho: '' }
  const termo = normalizar(busca.trim())
  const filtradas = useMemo(() => (linhas ?? []).filter(l => corresponde([l.id_questao, info.get(l.id_questao)?.titulo, info.get(l.id_questao)?.trecho, l.observacao, l.usuario], termo)), [linhas, info, termo])

  const paraLer = filtradas.filter(l => !l.util && l.observacao?.trim())
  const placar = useMemo(() => {
    const porQuestao = new Map<string, { id: string; ajudou: number; naoAjudou: number; motivos: Map<string, number>; mensagens: number }>()
    for (const l of filtradas) {
      const item = porQuestao.get(l.id_questao) ?? { id: l.id_questao, ajudou: 0, naoAjudou: 0, motivos: new Map(), mensagens: 0 }
      if (l.util) item.ajudou++
      else {
        item.naoAjudou++
        if (l.motivo) item.motivos.set(l.motivo, (item.motivos.get(l.motivo) ?? 0) + 1)
        if (l.observacao?.trim()) item.mensagens++
      }
      porQuestao.set(l.id_questao, item)
    }
    return [...porQuestao.values()].sort((a, b) => b.naoAjudou - a.naoAjudou || a.ajudou - b.ajudou)
  }, [filtradas])

  const ajudou = linhas?.filter(l => l.util).length ?? 0
  const naoAjudou = (linhas?.length ?? 0) - ajudou

  const Cabeca = ({ id }: { id: string }) => {
    const q = nome(id)
    return <div className="adm-questao">
      <a href={href(`/questao/${id}`)} target="_blank" rel="noopener noreferrer">{q.titulo}</a>
      {q.trecho && <p>{q.trecho}</p>}
    </div>
  }

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-avaliacoes">
    <div className="adm-secao__cabeca"><div>
      <h2 id="adm-titulo-avaliacoes">Avaliações dos comentários</h2>
      <p>Respostas ao "Este comentário te ajudou?" (as 500 mais recentes).</p>
    </div></div>
    {erro ? <p role="alert">{erro}</p> : linhas === null ? <p role="status">Carregando avaliações…</p> : <>
      <div className="adm-placar" aria-label="Resumo das avaliações">
        <div className="adm-placar__item adm-placar__item--bom"><strong>{ajudou}</strong><span>ajudou</span></div>
        <div className="adm-placar__item adm-placar__item--ruim"><strong>{naoAjudou}</strong><span>não ajudou</span></div>
        <div className="adm-placar__item"><strong>{linhas.length ? Math.round((ajudou / linhas.length) * 100) : 0}%</strong><span>de aprovação</span></div>
      </div>
      <div className="adm-filtros" role="tablist" aria-label="Vistas das avaliações">
        {([['ler', 'Mensagens para ler', paraLer.length], ['questoes', 'Por questão', placar.length], ['todas', 'Todas', filtradas.length]] as const).map(([valor, rotulo, n]) => (
          <button key={valor} type="button" role="tab" className="adm-chip" aria-selected={vista === valor} aria-pressed={vista === valor} onClick={() => definirVista(valor)}>{rotulo}<span>{n}</span></button>
        ))}
      </div>
      <label className="campo adm-busca__unica">Buscar por tema, trecho, mensagem ou e-mail<input className="entrada" type="search" value={busca} onChange={e => definirBusca(e.target.value)} /></label>

      {vista === 'ler' && (paraLer.length === 0 ? <p className="adm-vazio">Nenhuma mensagem nova. Quando alguém disser que não ajudou e escrever o porquê, aparece aqui.</p> : <ul className="adm-avaliacoes">
        {paraLer.map(l => <li key={`${l.id_questao}:${l.usuario}:${l.atualizado_em}`} className="adm-avaliacao">
          <div className="adm-avaliacao__topo"><Cabeca id={l.id_questao} /><span className="adm-selo adm-selo--ruim">{MOTIVOS[l.motivo ?? ''] ?? 'Não ajudou'}</span></div>
          <blockquote className="adm-avaliacao__texto">{l.observacao}</blockquote>
          <small>{l.usuario ?? 'conta removida'} · {dataHora(l.atualizado_em)}</small>
        </li>)}
      </ul>)}

      {vista === 'questoes' && (placar.length === 0 ? <p className="adm-vazio">Nenhuma avaliação neste filtro.</p> : <ul className="adm-avaliacoes">
        {placar.map(item => <li key={item.id} className={'adm-avaliacao' + (item.naoAjudou === 0 ? ' adm-avaliacao--boa' : '')}>
          <div className="adm-avaliacao__topo"><Cabeca id={item.id} />
            <span className="adm-avaliacao__contas"><span className="adm-selo adm-selo--ok">{item.ajudou} ajudou</span><span className="adm-selo adm-selo--ruim">{item.naoAjudou} não</span></span>
          </div>
          {item.motivos.size > 0 && <small>Motivos: {[...item.motivos].map(([m, n]) => `${MOTIVOS[m] ?? m} (${n})`).join(', ')}{item.mensagens ? ` · ${item.mensagens} mensagem(ns)` : ''}</small>}
        </li>)}
      </ul>)}

      {vista === 'todas' && (filtradas.length === 0 ? <p className="adm-vazio">Nenhuma avaliação neste filtro.</p> : <ul className="adm-avaliacoes">
        {filtradas.map(l => <li key={`${l.id_questao}:${l.usuario}:${l.atualizado_em}`} className={'adm-avaliacao' + (l.util ? ' adm-avaliacao--boa' : '')}>
          <div className="adm-avaliacao__topo"><Cabeca id={l.id_questao} /><span className={'adm-selo ' + (l.util ? 'adm-selo--ok' : 'adm-selo--ruim')}>{l.util ? 'Ajudou' : MOTIVOS[l.motivo ?? ''] ?? 'Não ajudou'}</span></div>
          {l.observacao?.trim() && <blockquote className="adm-avaliacao__texto">{l.observacao}</blockquote>}
          <small>{l.usuario ?? 'conta removida'} · {dataHora(l.atualizado_em)}</small>
        </li>)}
      </ul>)}
    </>}
  </section>
}
