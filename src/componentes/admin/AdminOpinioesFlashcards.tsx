import { useEffect, useMemo, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { erroDoPainel } from './formatos'

/**
 * Opiniões do beta dos flashcards (SQL parte 18: opinioes_flashcards e
 * listar_opinioes_flashcards_admin). Antes elas chegavam ao banco mas não
 * apareciam em lugar nenhum do painel (pedido do Tales, 14/10/2026).
 */
interface Opiniao {
  id: number; categoria: string; facil_estudar: number | null; experiencia_visual: number | null; som_celular: string | null
  problema: string | null; melhorar: string | null; origem: string; aparelho: string | null; status: string; criada_em: string; usuario: string | null
}
const MIGRACAO = 'parte 18 (202610130400_flashcards_opinioes_beta.sql)'
const CATEGORIA: Record<string, string> = { som: 'Som', visual: 'Visual', desempenho: 'Desempenho', conteudo: 'Conteúdo', outro: 'Outro' }
const ORIGEM: Record<string, string> = { central: 'Central', fim_sessao: 'Fim da sessão', fim_partida: 'Fim da partida', convite: 'Convite' }
const SOM: Record<string, string> = { sim: 'som funcionou', nao: 'som NÃO funcionou', nao_testei: 'não testou o som' }
const estrelas = (n: number | null) => (n ? '★'.repeat(n) + '☆'.repeat(5 - n) : '—')
const media = (l: Array<number | null>) => { const v = l.filter((x): x is number => !!x); return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1).replace('.', ',') : '—' }

export function AdminOpinioesFlashcards({ aoContar }: { aoContar?: (n: number) => void }) {
  const [linhas, definirLinhas] = useState<Opiniao[] | null>(null)
  const [erro, definirErro] = useState('')
  const [categoria, definirCategoria] = useState('')
  useEffect(() => {
    let vivo = true
    chamarRpc<Opiniao[]>('listar_opinioes_flashcards_admin', {})
      .then((l) => { if (vivo) { definirLinhas(l); aoContar?.(l.filter((o) => o.status === 'aberta').length) } })
      .catch((f) => vivo && definirErro(erroDoPainel(f, MIGRACAO)))
    return () => { vivo = false }
  }, [aoContar])
  const filtradas = useMemo(() => (linhas ?? []).filter((o) => !categoria || o.categoria === categoria), [linhas, categoria])
  if (erro) return <p role="alert" className="adm-alerta">{erro}</p>
  if (!linhas) return <p role="status">Carregando as opiniões…</p>
  const somNao = linhas.filter((o) => o.som_celular === 'nao').length
  return (
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-opinioes">
      <h2 id="adm-titulo-opinioes">Flashcards: opiniões do beta</h2>
      <p>O que os usuários mandam pelo botão “Enviar opinião” da central de flashcards, do fim das sessões e do convite. Mais recentes primeiro.</p>
      <div className="adm-kpis" aria-label="Resumo das opiniões">
        <div className="adm-kpi"><span>Opiniões</span><strong>{linhas.length}</strong></div>
        <div className="adm-kpi"><span>Facilidade (média)</span><strong>{media(linhas.map((o) => o.facil_estudar))}</strong></div>
        <div className="adm-kpi"><span>Visual (média)</span><strong>{media(linhas.map((o) => o.experiencia_visual))}</strong></div>
        <div className="adm-kpi"><span>Som falhou no celular</span><strong>{somNao}</strong></div>
      </div>
      <div className="adm-opinioes__filtro" role="radiogroup" aria-label="Categoria">
        {[['', 'Todas'], ...Object.entries(CATEGORIA)].map(([id, nome]) => (
          <button key={id} type="button" role="radio" aria-checked={categoria === id} className={'botao botao--fantasma' + (categoria === id ? ' adm-opinioes__on' : '')} onClick={() => definirCategoria(id)}>
            {nome} <small>{id ? linhas.filter((o) => o.categoria === id).length : linhas.length}</small>
          </button>
        ))}
      </div>
      {filtradas.length === 0 ? <p>Nenhuma opinião {categoria ? 'nessa categoria' : 'ainda'}.</p> : (
        <ul className="adm-opinioes">
          {filtradas.map((o) => (
            <li key={o.id} className="adm-opiniao">
              <header>
                <strong>{CATEGORIA[o.categoria] ?? o.categoria}</strong>
                <span>{new Date(o.criada_em).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span>{o.usuario ?? 'sem e-mail'}</span>
                <span>{ORIGEM[o.origem] ?? o.origem}{o.aparelho ? ` · ${o.aparelho}` : ''}</span>
              </header>
              <p className="adm-opiniao__notas">Facilidade {estrelas(o.facil_estudar)} · Visual {estrelas(o.experiencia_visual)}{o.som_celular ? ` · ${SOM[o.som_celular] ?? o.som_celular}` : ''}</p>
              {o.problema && <p><b>Não funcionou:</b> {o.problema}</p>}
              {o.melhorar && <p><b>Próxima melhoria:</b> {o.melhorar}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
