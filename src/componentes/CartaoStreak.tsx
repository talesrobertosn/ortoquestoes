import { useMemo, useState } from 'react'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { calcularStreak, proximoMarco, fraseSequencia, META_STREAK_DIARIA, MARCOS_STREAK } from '../estado/streak'
import { Icone } from './Icone'
import { gerarImagemStreak } from '../util/imagemStreak'
import { SITE } from '../config'

/**
 * Sequência de dias estudando, ao estilo Duolingo: quem responde pelo menos
 * `META_STREAK_DIARIA` questões por dia mantém o "fogo" aceso. Tudo calculado
 * a partir do que já fica salvo localmente — não depende de nada novo no
 * Supabase, então funciona hoje mesmo, com ou sem conta.
 */
export function CartaoStreak() {
  const { contexto } = usarContextoLocal('')
  const streak = useMemo(() => calcularStreak(contexto.respondidas), [contexto.respondidas])
  const [gerando, definirGerando] = useState(false)
  const [compartilhado, definirCompartilhado] = useState(false)

  if (streak.atual === 0 && streak.recorde === 0) return null

  const marco = streak.metaHojeAtingida && (MARCOS_STREAK as readonly number[]).includes(streak.atual)
  const faltamParaMarco = proximoMarco(streak.atual)
  const faltamHoje = Math.max(0, META_STREAK_DIARIA - streak.hojeContagem)

  async function compartilhar() {
    definirGerando(true)
    definirCompartilhado(false)
    try {
      const blob = await gerarImagemStreak(streak.atual)
      const arquivo = new File([blob], `sequencia-${streak.atual}-dias-ortoquestoes.png`, { type: 'image/png' })
      const podeCompartilharArquivo = 'canShare' in navigator && navigator.canShare?.({ files: [arquivo] })
      if (podeCompartilharArquivo) {
        await navigator.share({
          files: [arquivo],
          title: `${streak.atual} dias seguidos no ${SITE.nome}`,
          text: `${streak.atual} dias ${fraseSequencia(streak.atual)} no ${SITE.nome}!`,
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = arquivo.name
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
        definirCompartilhado(true)
      }
    } catch {
      // Cancelou a folha de compartilhamento ou o navegador recusou — não é erro do site.
    } finally {
      definirGerando(false)
    }
  }

  return (
    <section className={'cartao cartao__corpo cartao-streak' + (marco ? ' cartao-streak--marco' : '')}>
      <div className="cartao-streak__topo">
        <span className="cartao-streak__chama" aria-hidden="true">
          <Icone nome="fogo" tamanho={26} />
        </span>
        <div>
          <p className="meta">SUA SEQUÊNCIA</p>
          <h2>
            {streak.atual === 0 ? 'Sequência zerada' : `${streak.atual} ${streak.atual === 1 ? 'dia seguido' : 'dias seguidos'}`}
          </h2>
        </div>
      </div>
      <p className="texto-2">
        {streak.atual === 0
          ? `Você já chegou a ${streak.recorde} dias seguidos. Responda ${META_STREAK_DIARIA} questões hoje para começar uma nova sequência.`
          : marco
            ? `Marco alcançado! Você está ${fraseSequencia(streak.atual)} há ${streak.atual} dias — poucas pessoas chegam até aqui.`
            : streak.emRisco
              ? `Sua sequência de ${streak.atual} dias está em risco. Responda ${META_STREAK_DIARIA} questões hoje para não perdê-la.`
              : streak.metaHojeAtingida
                ? 'Sequência garantida por hoje. Volte amanhã para continuar.'
                : `Faltam ${faltamHoje} questõe${faltamHoje === 1 ? '' : 's'} hoje para manter sua sequência.`}
        {faltamParaMarco && !streak.emRisco && streak.atual > 0 && ` Faltam ${faltamParaMarco - streak.atual} dias para o marco de ${faltamParaMarco}.`}
      </p>
      {streak.recorde > streak.atual && <p className="meta">Recorde: {streak.recorde} dias</p>}
      {streak.atual >= 3 && (
        <div className="linha">
          <button type="button" className="botao botao--principal" onClick={() => void compartilhar()} disabled={gerando}>
            <Icone nome="link" tamanho={16} /> {gerando ? 'Gerando imagem…' : 'Compartilhar minha sequência'}
          </button>
          {compartilhado && <span className="meta" role="status">Imagem baixada — já pode postar no Instagram.</span>}
        </div>
      )}
    </section>
  )
}
