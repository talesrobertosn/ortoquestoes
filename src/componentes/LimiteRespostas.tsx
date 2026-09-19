import { useEffect, useState } from 'react'
import type { EstadoLimite } from '../estado/limiteDiario'
import { formatarDuracao } from '../dados/tipos'
import { href } from '../util/rotas'
import { Painel } from './Painel'

export function AvisoLimite({ estado }: { estado: EstadoLimite | null }) {
  if (!estado?.permitido || estado.ilimitado || estado.restantes === null || estado.restantes > 3) return null
  return <p className="aviso-limite" role="status">Você ainda pode registrar {estado.restantes} {estado.restantes === 1 ? 'resposta' : 'respostas'} hoje no plano gratuito.</p>
}

export function PainelLimite({ estado, aberto, aoFechar }: { estado: EstadoLimite | null; aberto: boolean; aoFechar: () => void }) {
  const [agora, definirAgora] = useState(Date.now())
  useEffect(() => {
    if (!aberto) return
    const intervalo = window.setInterval(() => definirAgora(Date.now()), 1000)
    return () => window.clearInterval(intervalo)
  }, [aberto])
  const libera = estado?.liberaEm ? new Date(estado.liberaEm) : null
  const faltam = libera ? Math.max(0, Math.ceil((libera.getTime() - agora) / 1000)) : null
  return (
    <Painel titulo="Limite diário alcançado" aberto={aberto} aoFechar={aoFechar}>
      <div className="empilha">
        <p>{estado?.motivo ?? `Você registrou ${estado?.consumidas ?? 0} respostas hoje no plano gratuito.`}</p>
        {estado && estado.sequencia > 0 && <p className="meta">Sua sequência atual é de {estado.sequencia} {estado.sequencia === 1 ? 'dia' : 'dias'}.</p>}
        {libera && faltam !== null && (
          <div className="liberacao-limite">
            <span>Novas respostas gratuitas em</span>
            <strong className="numerico">{formatarDuracao(faltam)}</strong>
            <span className="meta">Liberação em {libera.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}, horário de São Paulo.</span>
          </div>
        )}
        <p className="texto-2">Comentários, desempenho, calendário, revisões e todo o seu histórico continuam disponíveis.</p>
        <div className="linha linha--empilha-celular">
          <a className="botao botao--principal" href={href('/assinatura')}>Ver planos</a>
          <button className="botao" type="button" onClick={aoFechar}>Continuar amanhã</button>
        </div>
      </div>
    </Painel>
  )
}
