import { useCallback, useEffect, useMemo, useState } from 'react'
import { chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'

interface LinhaAvaliacao { id_questao: string; util: boolean; motivo: string | null; observacao: string | null; atualizado_em: string; usuario: string | null }

const MOTIVOS: Record<string, string> = { confuso: 'Ficou confuso', raso: 'Faltou profundidade', errado: 'Parece ter erro', outro: 'Outro motivo' }
type Filtro = 'mensagens' | 'nao' | 'todas'

/**
 * "Este comentário te ajudou?" no painel: o que não ajudou, com o motivo e a
 * mensagem de quem avaliou, e um atalho para abrir a questão.
 */
export function AdminAvaliacoes() {
  const [linhas, definirLinhas] = useState<LinhaAvaliacao[] | null>(null)
  const [erro, definirErro] = useState('')
  const [filtro, definirFiltro] = useState<Filtro>('mensagens')

  const carregar = useCallback(async () => {
    try {
      definirLinhas(await chamarRpc<LinhaAvaliacao[]>('listar_avaliacoes_comentario_admin', {}))
      definirErro('')
    } catch (falha) {
      const texto = String(falha)
      definirErro(texto.includes('PGRST202') || texto.includes('(404)')
        ? 'A função de avaliações ainda não existe no banco. Rode no Supabase a migração 202609280200_avaliacoes_comentario_admin.sql.'
        : 'Não foi possível carregar as avaliações agora.')
    }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  const visiveis = useMemo(() => (linhas ?? []).filter(l =>
    filtro === 'todas' ? true : filtro === 'nao' ? !l.util : !l.util && !!l.observacao?.trim()), [linhas, filtro])

  const ajudou = linhas?.filter(l => l.util).length ?? 0
  const naoAjudou = (linhas?.length ?? 0) - ajudou
  const comMensagem = linhas?.filter(l => !l.util && l.observacao?.trim()).length ?? 0

  return <section className="empilha admin-assinaturas__secao" aria-labelledby="titulo-avaliacoes-admin">
    <div><h2 id="titulo-avaliacoes-admin">Avaliações dos comentários</h2><p>Respostas ao "Este comentário te ajudou?", das mais recentes para as mais antigas (até 500).</p></div>
    {erro ? <p role="alert">{erro}</p> : linhas === null ? <p role="status">Carregando avaliações…</p> : <>
      <div className="admin-assinaturas__atalhos" role="group" aria-label="Filtrar avaliações">
        {([['mensagens', 'Com mensagem', comMensagem], ['nao', 'Não ajudou', naoAjudou], ['todas', 'Todas', linhas.length]] as const).map(([valor, rotulo, n]) => (
          <button key={valor} type="button" className="admin-assinaturas__filtro-rapido" aria-pressed={filtro === valor} onClick={() => definirFiltro(valor)}>{rotulo}<span>{n}</span></button>
        ))}
      </div>
      <p role="status">{ajudou} {ajudou === 1 ? 'pessoa disse' : 'pessoas disseram'} que ajudou; {naoAjudou} que não ajudou.</p>
      {visiveis.length === 0 ? <p>Nenhuma avaliação neste filtro.</p> : <ul className="admin-avaliacoes">
        {visiveis.map(l => (
          <li key={`${l.id_questao}:${l.usuario}:${l.atualizado_em}`} className={'admin-avaliacao' + (l.util ? ' admin-avaliacao--util' : '')}>
            <div className="admin-avaliacao__topo">
              <a href={href(`/questao/${l.id_questao}`)} target="_blank" rel="noopener noreferrer" className="numerico">{l.id_questao}</a>
              <span className="admin-avaliacao__selo">{l.util ? 'Ajudou' : MOTIVOS[l.motivo ?? ''] ?? 'Não ajudou'}</span>
            </div>
            {l.observacao?.trim() && <p className="admin-avaliacao__texto">{l.observacao}</p>}
            <small>{l.usuario ?? 'conta removida'} · {new Date(l.atualizado_em).toLocaleString('pt-BR')}</small>
          </li>
        ))}
      </ul>}
    </>}
  </section>
}
