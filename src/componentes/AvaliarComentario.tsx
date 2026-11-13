import { useEffect, useState } from 'react'
import { supabase } from '../conta/supabase'
import { usarConta } from '../conta/ContextoConta'
import { usarArmazenado } from '../estado/usarArmazenado'
import { Icone } from './Icone'
import { alertarAvaliacao } from '../conta/emailsMarco'
import { pedirRelato } from './RelatarErro'
import { MOTIVOS_NOTA, NOTA_PEDE_MOTIVO, ajudouComNota, corDaNota, type MotivoNota } from '../dados/notasComentario'

/** Avaliação guardada no aparelho. As antigas ("Ajudou"/"Não ajudou") não têm nota. */
interface Avaliacao { nota?: number; util: boolean; motivo?: MotivoNota; observacao?: string; versao?: string | null; enviada: boolean }

async function enviar(id: string, a: Avaliacao): Promise<boolean> {
  if (!supabase) return false
  try {
    const linha: Record<string, unknown> = {
      id_questao: id, util: a.util, motivo: a.util ? null : a.motivo ?? null,
      observacao: a.observacao?.trim() || null, atualizado_em: new Date().toISOString(),
    }
    if (a.nota) { linha.nota = a.nota; linha.comentario_em = a.versao ?? null }
    const { error } = await supabase.from('avaliacoes_comentario').upsert(linha)
    return !error
  } catch { return false }
}

const NOTAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

/**
 * Nota de 1 a 10 para o comentário (13/11/2026, troca o "Este comentário te ajudou?"): uma linha só, no fim do
 * comentário, com dez quadradinhos numerados que acendem como uma régua. O clique já envia a nota. Nota de 1 a 5
 * abre logo abaixo, sem obrigar nada, o motivo (grava ao tocar), uma frase e o relato de erro. Depois da nota, a linha encolhe para "Você deu 8 · obrigado · mudar".
 * Erro de fato (gabarito, informação errada) vai pelo relato de erro. A nota fica guardada mesmo sem rede e é
 * reenviada depois. O painel do administrador separa as questões por faixa (Triagem › Notas dos comentários).
 */
export function AvaliarComentario({ idQuestao, versao = null }: { idQuestao: string; versao?: string | null }) {
  const usuario = usarConta().sessao?.user ?? null
  const [avaliacoes, definirAvaliacoes] = usarArmazenado<Record<string, Avaliacao>>('avaliacoes', {})
  const atual = avaliacoes[idQuestao]
  const [mudando, definirMudando] = useState(false)
  const [acesa, definirAcesa] = useState(0)
  const [pedindoMotivo, definirPedindoMotivo] = useState(false)
  const [motivo, definirMotivo] = useState<MotivoNota | null>(null)
  const [observacao, definirObservacao] = useState('')
  const [explicando, definirExplicando] = useState(false)

  const salvar = async (a: Omit<Avaliacao, 'enviada'>) => {
    const nova = { ...a, enviada: false }
    definirAvaliacoes((todas) => ({ ...todas, [idQuestao]: nova }))
    const ok = await enviar(idQuestao, nova)
    if (ok) definirAvaliacoes((todas) => ({ ...todas, [idQuestao]: { ...nova, enviada: true } }))
    if (ok && !nova.util && nova.observacao?.trim()) alertarAvaliacao(idQuestao)
  }

  // Avaliações feitas sem rede (ou antes da coluna existir) seguem na próxima visita.
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

  const darNota = (nota: number) => {
    definirMudando(false)
    definirMotivo(null); definirObservacao('')
    void salvar({ nota, util: ajudouComNota(nota), versao })
    definirPedindoMotivo(nota <= NOTA_PEDE_MOTIVO)
  }

  // Nota de 5 ou menos (Tales, 14/11/2026): a nota já foi enviada no clique. O resto é opcional e não trava nada:
  // o motivo se grava ao tocar, a frase vai com "Enviar a frase" e o erro vai pelo relato.
  if (atual && pedindoMotivo && atual.nota) {
    const escolherMotivo = (valor: MotivoNota) => {
      const novo = motivo === valor ? null : valor
      definirMotivo(novo)
      // Só o motivo: a frase em rascunho vai apenas por "Enviar a frase" (a já enviada continua como está).
      void salvar({ ...atual, motivo: novo ?? undefined })
    }
    return (
      <div className="av av--motivo">
        <p className="av__pergunta">
          <span className="av__dada" style={{ '--av-cor': corDaNota(atual.nota) } as React.CSSProperties}>{atual.nota}</span>
          Nota enviada. Obrigado!
          <button type="button" className="av__fechar" aria-label="Fechar" onClick={() => definirPedindoMotivo(false)}><Icone nome="fechar" tamanho={16} /></button>
        </p>
        <p className="av__sub">Se quiser, conte o que faltou. É opcional e ajuda a reescrever.</p>
        <div className="av__motivos">
          {MOTIVOS_NOTA.map(([valor, rotulo]) => (
            <button key={valor} type="button" className={motivo === valor ? 'ativo' : ''} aria-pressed={motivo === valor} onClick={() => escolherMotivo(valor)}>{rotulo}</button>
          ))}
        </div>
        <textarea className="entrada av__obs" rows={2} maxLength={1000} placeholder="Se quiser, conte em uma frase" value={observacao} onChange={(e) => definirObservacao(e.target.value)} />
        <div className="av__acoes">
          <button type="button" className="av__erro" onClick={() => { definirPedindoMotivo(false); pedirRelato(idQuestao, 'comentario') }}>
            <Icone nome="alerta" tamanho={15} /> Encontrou um erro? Relate
          </button>
          {observacao.trim() && <button type="button" className="botao botao--principal"
            onClick={() => { void salvar({ ...atual, motivo: motivo ?? 'outro', observacao }); definirPedindoMotivo(false) }}>Enviar a frase</button>}
        </div>
      </div>
    )
  }

  if (atual && !mudando) {
    return (
      <div className="av av--feito" role="status">
        {atual.nota
          ? <span className="av__dada" style={{ '--av-cor': corDaNota(atual.nota) } as React.CSSProperties}>{atual.nota}</span>
          : <Icone nome="certo" tamanho={16} />}
        <span>{atual.nota ? `Você deu ${atual.nota} para este comentário. Obrigado!` : 'Obrigado pela avaliação.'}</span>
        <button type="button" className="av__mudar" onClick={() => { definirMudando(true); definirAcesa(0) }}>Mudar</button>
      </div>
    )
  }

  return (
    <div className="av av--regua">
      <div className="av__linha">
        <p className="av__pergunta" id={`av-${idQuestao}`}>
          Nota para este comentário
          <button type="button" className="av__info" aria-expanded={explicando} aria-label="Por que dar nota" onClick={() => definirExplicando(!explicando)}>
            <Icone nome="interrogacao" tamanho={15} />
          </button>
        </p>
        <div className="av__regua" role="radiogroup" aria-labelledby={`av-${idQuestao}`} onMouseLeave={() => definirAcesa(0)}>
          {NOTAS.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={atual?.nota === n} aria-label={`Nota ${n} de 10`}
              className={'av__nota' + (n <= acesa ? ' av__nota--acesa' : '')}
              style={{ '--av-cor': corDaNota(n) } as React.CSSProperties}
              onMouseEnter={() => definirAcesa(n)} onFocus={() => definirAcesa(n)} onBlur={() => definirAcesa(0)}
              onClick={() => darNota(n)}>{n}</button>
          ))}
        </div>
      </div>
      <p className="av__sub">{explicando
        ? 'Cada nota mostra quais comentários melhorar primeiro. Nosso foco é que todo comentário seja uma aula completa, e a sua nota diz onde ainda não é. As notas são anônimas para os outros usuários.'
        : 'Sua nota mostra quais comentários melhorar primeiro.'}</p>
    </div>
  )
}
