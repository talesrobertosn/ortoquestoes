import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'

/** "agora há pouco", "há 3 min", "há 2 h", "há 1 dia". */
export function haQuanto(instante: number, agora = Date.now()): string {
  const s = Math.max(0, Math.round((agora - instante) / 1000))
  if (s < 60) return 'agora há pouco'
  const min = Math.round(s / 60)
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
}

/**
 * Linha discreta com o estado da sincronização do progresso: "Sincronizado há
 * 2 min", "Sincronizando…", "Sem conexão: 3 respostas aguardando envio". Fica
 * no cronograma, onde a pessoa decide o que fazer hoje com o que os outros
 * aparelhos já fizeram. Só aparece para quem está na conta.
 */
export function IndicadorSincronia({ preparando = false }: { preparando?: boolean }) {
  const { sessao, status, sincronizar } = usarConta()
  const [, tique] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => tique((n) => n + 1), 30_000)
    return () => window.clearInterval(t)
  }, [])
  if (!sessao) return null
  const pendentes = status.pendentes
  const aguardando = pendentes > 0 ? ` · ${pendentes} ${pendentes === 1 ? 'alteração aguardando envio' : 'alterações aguardando envio'}` : ''
  let texto: string
  let estado = status.estado
  if (preparando) { texto = 'Trazendo o que você fez nos outros aparelhos…'; estado = 'sincronizando' }
  else if (status.estado === 'offline') texto = `Sem conexão: o que você fizer fica guardado aqui${aguardando}`
  else if (status.estado === 'erro') texto = `Não deu para sincronizar agora; tentando de novo${aguardando}`
  else if (status.estado === 'sincronizando' || !status.pronto) texto = 'Sincronizando…'
  else if (status.ultimaSincronia) texto = `Sincronizado ${haQuanto(status.ultimaSincronia)}${aguardando}`
  else texto = `Sincronizado${aguardando}`
  return (
    <p className="indicador-sincronia" role="status" aria-live="polite">
      <span className={`ponto-sincronia ponto-sincronia--${estado}`} aria-hidden="true" />
      <span>{texto}</span>
      {(status.estado === 'erro' || status.estado === 'offline') && !preparando && (
        <button type="button" className="botao--vinculo" onClick={sincronizar}>Tentar agora</button>
      )}
    </p>
  )
}
