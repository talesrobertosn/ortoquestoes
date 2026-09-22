import { useState } from 'react'
import type { Indice } from '../dados/tipos'
import { carregarComentarios } from '../dados/comentarios'
import { usarQuestaoDoDia } from '../estado/questaoDoDia'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { inicioDia } from '../estado/limiteDiario'
import { gerarImagensQuestaoDoDia } from '../util/imagemQuestao'
import { href } from '../util/rotas'
import { Icone } from './Icone'

const FORMATO_DIA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })

/** A mesma questão para todos no dia: um motivo para abrir o site e assunto para o Instagram. */
export function CartaoQuestaoDoDia({ indice }: { indice: Indice }) {
  const questao = usarQuestaoDoDia(indice)
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [gerando, definirGerando] = useState(false)
  const [baixou, definirBaixou] = useState(false)
  if (!questao) return null

  const registro = respondidas[questao.id]
  const hoje = registro && registro.q >= inicioDia().getTime() ? registro : null
  const dataTexto = FORMATO_DIA.format(new Date())

  async function compartilhar() {
    if (!questao) return
    definirGerando(true)
    definirBaixou(false)
    try {
      const tema = indice.temas.find((t) => t.nome === questao.tema)
      const conceito = tema ? (await carregarComentarios(tema.slug))[questao.id]?.conceito ?? null : null
      const blobs = await gerarImagensQuestaoDoDia(questao, conceito, dataTexto)
      const arquivos = blobs.map((b, i) => new File([b], `questao-do-dia-${questao.id}-${i + 1}.png`, { type: 'image/png' }))
      if ('canShare' in navigator && navigator.canShare?.({ files: arquivos })) {
        await navigator.share({ files: arquivos, title: 'Questão do dia · OrtoQuestões' })
      } else {
        for (const arquivo of arquivos) {
          const url = URL.createObjectURL(arquivo)
          const a = document.createElement('a')
          a.href = url
          a.download = arquivo.name
          document.body.appendChild(a)
          a.click()
          a.remove()
          setTimeout(() => URL.revokeObjectURL(url), 4000)
        }
        definirBaixou(true)
      }
    } catch {
      // Cancelou o compartilhamento: nada a fazer.
    } finally {
      definirGerando(false)
    }
  }

  return (
    <section className="qd" aria-label="Questão do dia">
      <div className="qd__topo">
        <p className="qd__rotulo"><Icone nome="alvo" tamanho={16} /> Questão do dia <span>· {dataTexto}</span></p>
        <button className="qd__partilhar" onClick={() => void compartilhar()} disabled={gerando} title="Gera o carrossel (pergunta e gabarito) para postar">
          <Icone nome="instagram" tamanho={16} /> {gerando ? 'Gerando…' : baixou ? 'Imagens baixadas' : 'Imagem para o Instagram'}
        </button>
      </div>
      <p className="qd__assunto">{questao.tema}{questao.subtemas[0] ? ` · ${questao.subtemas[0]}` : ''}</p>
      <p className="qd__enunciado">{questao.enunciado}</p>
      <div className="qd__rodape">
        {hoje ? (
          <>
            <span className={`qd__resultado ${hoje.c ? 'qd__resultado--certo' : 'qd__resultado--errado'}`}>
              <Icone nome={hoje.c ? 'certo' : 'errado'} tamanho={16} /> {hoje.c ? 'Você acertou a de hoje' : 'Hoje não foi. Amanhã tem outra'}
            </span>
            <a className="botao botao--fantasma" href={href(`/questao/${questao.id}`)}>Ver comentário</a>
          </>
        ) : (
          <>
            <span className="qd__dica">{questao.alternativas.length} alternativas · a mesma para todo mundo hoje</span>
            <a className="botao botao--principal" href={href(`/questao/${questao.id}`)}>Responder <Icone nome="direita" tamanho={16} /></a>
          </>
        )}
      </div>
    </section>
  )
}
