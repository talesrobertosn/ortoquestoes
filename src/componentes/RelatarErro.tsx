import { useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'
import { Icone } from './Icone'

const TIPOS: Array<[string, string]> = [
  ['gabarito', 'Gabarito'], ['enunciado', 'Enunciado'], ['imagem', 'Imagem'], ['comentario', 'Comentário'], ['outro', 'Outro'],
]

/**
 * "Relatar erro" dentro da questão: vai direto para o painel do
 * administrador. Sem conta (ou se o banco ainda não tiver a tabela), cai no
 * formulário de contato, como antes.
 */
export function RelatarErro({ idQuestao }: { idQuestao: string }) {
  const { sessao } = usarConta()
  const [aberto, definirAberto] = useState(false)
  const [tipo, definirTipo] = useState('gabarito')
  const [texto, definirTexto] = useState('')
  const [estado, definirEstado] = useState<'livre' | 'enviando' | 'enviado' | 'erro' | 'sem_tabela'>('livre')
  const linkContato = href(`/contato?questao=${idQuestao}`)

  if (!sessao) return <a className="qz-rodape__link" href={linkContato}><Icone nome="alerta" tamanho={16} /> Relatar erro nesta questão</a>

  async function enviar() {
    if (texto.trim().length < 3 || estado === 'enviando') return
    definirEstado('enviando')
    try {
      await chamarRpc('relatar_erro_questao', { p_id_questao: idQuestao, p_tipo: tipo, p_texto: texto.trim() })
      definirEstado('enviado'); definirTexto('')
    } catch (falha) {
      definirEstado(String(falha).includes('(404)') ? 'sem_tabela' : 'erro')
    }
  }

  if (!aberto) return <button type="button" className="qz-rodape__link" onClick={() => { definirAberto(true); definirEstado('livre') }}>
    <Icone nome="alerta" tamanho={16} /> Relatar erro nesta questão
  </button>

  return <div className="relato">
    {estado === 'enviado' ? <>
      <p className="relato__ok"><Icone nome="certo" tamanho={16} /> Recebido. Obrigado por avisar: a questão vai ser revisada.</p>
      <button type="button" className="botao botao--fantasma" onClick={() => definirAberto(false)}>Fechar</button>
    </> : <>
      <p className="relato__titulo">O que parece errado nesta questão?</p>
      <div className="relato__tipos" role="radiogroup" aria-label="Tipo de erro">
        {TIPOS.map(([valor, rotulo]) => <button key={valor} type="button" role="radio" aria-checked={tipo === valor} className="relato__tipo" onClick={() => definirTipo(valor)}>{rotulo}</button>)}
      </div>
      <label className="campo">Conte o que encontrou<textarea className="entrada" rows={3} maxLength={1500} value={texto} onChange={e => definirTexto(e.target.value)} placeholder="Ex.: o gabarito oficial foi alterado para C depois do recurso." /></label>
      {estado === 'erro' && <p className="relato__erro" role="alert">Não foi possível enviar agora. Tente de novo em instantes.</p>}
      {estado === 'sem_tabela' && <p className="relato__erro" role="alert">Por enquanto, envie pelo <a href={linkContato}>formulário de contato</a>.</p>}
      <div className="linha">
        <button type="button" className="botao botao--principal" disabled={texto.trim().length < 3 || estado === 'enviando'} onClick={() => void enviar()}>{estado === 'enviando' ? 'Enviando…' : 'Enviar relato'}</button>
        <button type="button" className="botao botao--fantasma" onClick={() => definirAberto(false)}>Cancelar</button>
      </div>
    </>}
  </div>
}
