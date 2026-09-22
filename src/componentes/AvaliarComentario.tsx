import { useEffect, useState } from 'react'
import { supabase } from '../conta/supabase'
import { usarConta } from '../conta/ContextoConta'
import { usarArmazenado } from '../estado/usarArmazenado'
import { Icone } from './Icone'

type Motivo = 'confuso' | 'raso' | 'errado' | 'outro'
interface Avaliacao { util: boolean; motivo?: Motivo; observacao?: string; enviada: boolean }

const MOTIVOS: [Motivo, string][] = [
  ['confuso', 'Ficou confuso'],
  ['raso', 'Faltou profundidade'],
  ['errado', 'Parece ter erro'],
  ['outro', 'Outro motivo'],
]

async function enviar(id: string, a: Avaliacao): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('avaliacoes_comentario').upsert({
      id_questao: id, util: a.util, motivo: a.util ? null : a.motivo ?? null,
      observacao: a.observacao?.trim() || null, atualizado_em: new Date().toISOString(),
    })
    return !error
  } catch { return false }
}

/**
 * "Este comentário te ajudou?". A avaliação fica guardada na conta mesmo sem
 * rede e é reenviada depois; o que não ajudou pede um motivo, que é o que
 * diz qual comentário reescrever primeiro.
 */
export function AvaliarComentario({ idQuestao }: { idQuestao: string }) {
  const usuario = usarConta().sessao?.user ?? null
  const [avaliacoes, definirAvaliacoes] = usarArmazenado<Record<string, Avaliacao>>('avaliacoes', {})
  const atual = avaliacoes[idQuestao]
  const [pedindoMotivo, definirPedindoMotivo] = useState(false)
  const [motivo, definirMotivo] = useState<Motivo | null>(null)
  const [observacao, definirObservacao] = useState('')

  const salvar = async (a: Omit<Avaliacao, 'enviada'>) => {
    const nova = { ...a, enviada: false }
    definirAvaliacoes((todas) => ({ ...todas, [idQuestao]: nova }))
    const ok = await enviar(idQuestao, nova)
    if (ok) definirAvaliacoes((todas) => ({ ...todas, [idQuestao]: { ...nova, enviada: true } }))
  }

  // Avaliações feitas sem rede (ou antes da tabela existir) seguem na próxima visita.
  useEffect(() => {
    if (!usuario) return
    const pendentes = Object.entries(avaliacoes).filter(([, a]) => !a.enviada).slice(0, 10)
    if (!pendentes.length) return
    let vivo = true
    ;(async () => {
      for (const [id, a] of pendentes) {
        if (!vivo || !(await enviar(id, a))) return
        definirAvaliacoes((todas) => ({ ...todas, [id]: { ...todas[id], enviada: true } }))
      }
    })()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id])

  if (!usuario) return null

  if (atual && !pedindoMotivo) {
    return (
      <div className="av av--feito" role="status">
        <Icone nome="certo" tamanho={16} />
        <span>{atual.util ? 'Obrigado! Saber que ajudou mostra o que manter.' : 'Obrigado. Esse retorno entra na fila de revisão dos comentários.'}</span>
        <button className="av__mudar" onClick={() => definirAvaliacoes((todas) => { const resto = { ...todas }; delete resto[idQuestao]; return resto })}>Mudar</button>
      </div>
    )
  }

  if (pedindoMotivo) {
    return (
      <div className="av av--motivo">
        <p className="av__pergunta">O que faltou?</p>
        <div className="av__motivos">
          {MOTIVOS.map(([valor, rotulo]) => (
            <button key={valor} className={motivo === valor ? 'ativo' : ''} aria-pressed={motivo === valor} onClick={() => definirMotivo(valor)}>{rotulo}</button>
          ))}
        </div>
        <textarea className="entrada av__obs" rows={2} maxLength={1000} placeholder="Se quiser, conte em uma frase (opcional)" value={observacao} onChange={(e) => definirObservacao(e.target.value)} />
        <div className="av__acoes">
          <button className="botao botao--fantasma" onClick={() => definirPedindoMotivo(false)}>Cancelar</button>
          <button className="botao botao--principal" disabled={!motivo} onClick={() => { void salvar({ util: false, motivo: motivo!, observacao }); definirPedindoMotivo(false) }}>Enviar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="av">
      <p className="av__pergunta">Este comentário te ajudou?</p>
      <div className="av__botoes">
        <button className="av__botao av__botao--sim" onClick={() => void salvar({ util: true })}><Icone nome="certo" tamanho={16} /> Ajudou</button>
        <button className="av__botao av__botao--nao" onClick={() => definirPedindoMotivo(true)}><Icone nome="errado" tamanho={16} /> Não ajudou</button>
      </div>
    </div>
  )
}
