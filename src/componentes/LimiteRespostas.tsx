import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { EVENTO_DADOS } from '../estado/armazenamento'
import { LIMITES_HABILITADOS, lerBloqueioDiario, limparBloqueioDiario, type EstadoLimite } from '../estado/limiteDiario'
import { formatarDuracao } from '../dados/tipos'
import { chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'
import { Painel } from './Painel'

export function AvisoLimite({ estado }: { estado: EstadoLimite | null }) {
  if (!estado?.permitido || estado.ilimitado || estado.restantes === null || estado.restantes > 3) return null
  return <p className="aviso-limite" role="status">Você ainda pode registrar {estado.restantes} {estado.restantes === 1 ? 'resposta' : 'respostas'} hoje no plano gratuito.</p>
}

/** Fica junto ao cabeçalho em todas as rotas até a virada do dia. */
export function AvisoBloqueioDiario({ caminho }: { caminho: string }) {
  const { sessao } = usarConta()
  const usuario = sessao?.user.id
  const [liberaEm, definirLiberaEm] = useState<string | null>(null)
  const [agora, definirAgora] = useState(Date.now())

  useEffect(() => {
    const atualizar = () => definirLiberaEm(usuario && LIMITES_HABILITADOS ? lerBloqueioDiario() : null)
    atualizar()
    window.addEventListener(EVENTO_DADOS, atualizar)
    window.addEventListener('storage', atualizar)
    return () => {
      window.removeEventListener(EVENTO_DADOS, atualizar)
      window.removeEventListener('storage', atualizar)
    }
  }, [usuario])

  useEffect(() => {
    if (!liberaEm) return
    const atualizar = () => {
      const instante = Date.now()
      if (instante >= Date.parse(liberaEm)) {
        limparBloqueioDiario()
        definirLiberaEm(null)
      } else definirAgora(instante)
    }
    atualizar()
    const intervalo = window.setInterval(atualizar, 1000)
    return () => window.clearInterval(intervalo)
  }, [liberaEm])

  useEffect(() => {
    if (!liberaEm || !usuario) return
    let ativo = true
    const verificarPlano = async () => {
      try {
        const [conta] = await chamarRpc<Array<{ status_assinatura: string | null; cancelar_ao_fim: boolean; fim_periodo: string | null }>>('obter_estado_conta', {})
        const vigente = !conta.fim_periodo || Date.parse(conta.fim_periodo) > Date.now()
        if (ativo && vigente && (conta.status_assinatura === 'ativa' || (conta.status_assinatura === 'cancelada' && conta.cancelar_ao_fim))) {
          limparBloqueioDiario()
          definirLiberaEm(null)
        }
      } catch { /* Sem conexão, conservamos o aviso até a próxima consulta. */ }
    }
    void verificarPlano()
    const intervalo = window.setInterval(() => { void verificarPlano() }, 60_000)
    return () => { ativo = false; window.clearInterval(intervalo) }
  }, [liberaEm, usuario, caminho])

  if (!usuario || !LIMITES_HABILITADOS || !liberaEm) return null
  const faltam = Math.max(0, Math.ceil((Date.parse(liberaEm) - agora) / 1000))
  if (faltam === 0) return null
  return <aside className="aviso-bloqueio-topo" aria-label="Limite diário de respostas">
    <div className="conteudo aviso-bloqueio-topo__interno">
      <span><strong>Você completou as 20 respostas gratuitas de hoje.</strong> Seu treino reabre à meia-noite de São Paulo.</span>
      <span className="aviso-bloqueio-topo__acoes"><span>Faltam <time className="numerico" dateTime={liberaEm} aria-live="off">{formatarDuracao(faltam)}</time></span><a href={href('/assinatura')}>Conhecer os planos</a></span>
    </div>
  </aside>
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
  if (estado?.falhaValidacao) {
    return (
      <Painel titulo="Não foi possível registrar a resposta" aberto={aberto} aoFechar={aoFechar}>
        <div className="empilha">
          <p>{estado.motivo}</p>
          <p className="texto-2">Verifique a conexão e tente de novo. Se continuar, saia da conta e entre novamente.</p>
          <div className="linha linha--empilha-celular">
            <button className="botao botao--principal" type="button" onClick={aoFechar}>Tentar de novo</button>
          </div>
        </div>
      </Painel>
    )
  }
  return (
    <Painel titulo="Seu treino gratuito de hoje chegou a 20 respostas" aberto={aberto} aoFechar={aoFechar}>
      <div className="empilha">
        <p>Você já registrou {estado?.consumidas ?? 20} respostas hoje. Mandou bem em manter o ritmo! Amanhã você pode continuar gratuitamente.</p>
        {estado && estado.sequencia > 0 && <p className="meta">Sua sequência atual é de {estado.sequencia} {estado.sequencia === 1 ? 'dia' : 'dias'}.</p>}
        {libera && faltam !== null && (
          <div className="liberacao-limite">
            <span>Novas respostas gratuitas em</span>
            <strong className="numerico">{formatarDuracao(faltam)}</strong>
            <span className="meta">Liberação em {libera.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}, horário de São Paulo.</span>
          </div>
        )}
        <p>Quer seguir respondendo sem esperar? A assinatura paga é opcional: ela tira o limite diário e ajuda a manter o OrtoQuestões, o acervo e os comentários no ar. Há opções com diferentes periodicidades.</p>
        <p className="texto-2">Comentários, desempenho, calendário, revisões e todo o seu histórico continuam disponíveis gratuitamente.</p>
        <div className="linha linha--empilha-celular">
          <a className="botao botao--principal" href={href('/assinatura')}>Ver planos</a>
          <button className="botao" type="button" onClick={aoFechar}>Continuar amanhã</button>
        </div>
      </div>
    </Painel>
  )
}
