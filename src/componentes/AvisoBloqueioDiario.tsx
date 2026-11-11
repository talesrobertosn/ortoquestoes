import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { EVENTO_DADOS } from '../estado/armazenamento'
import { LIMITES_HABILITADOS, lerBloqueioDiario, limiteGratisConhecido, limparBloqueioDiario } from '../estado/limiteDiario'
import { formatarDuracao } from '../dados/tipos'
import { chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { usarArmazenado } from '../estado/usarArmazenado'
import { registrarAssinante } from '../conta/plano'

// Em arquivo próprio (11/11/2026): o cabeçalho aparece em toda página e mostra este aviso; importado de
// LimiteRespostas.tsx, ele trazia para o código principal o painel de planos inteiro (uns 16 KB), que
// quase ninguém abre. O estilo fica em base.css.

function suasQuestoesGratis(limite: number | null | undefined): string {
  return limite ? `Suas ${limite} questões grátis` : 'Suas questões grátis'
}

/**
 * Fica junto ao cabeçalho até a janela de 24 h acabar. A pessoa pode recolher a
 * faixa: ela vira um contador pequeno no cabeçalho (variante "chip", só em
 * telas largas) e volta a abrir com um toque.
 */
export function AvisoBloqueioDiario({ caminho, variante = 'faixa' }: { caminho: string; variante?: 'faixa' | 'chip' }) {
  const { sessao } = usarConta()
  const usuario = sessao?.user.id
  const [liberaEm, definirLiberaEm] = useState<string | null>(null)
  const [agora, definirAgora] = useState(Date.now())
  const [recolhidaAte, definirRecolhidaAte] = usarArmazenado<string | null>('limite:faixa-recolhida', null)

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
    if (!liberaEm || !usuario || variante === 'chip') return
    let ativo = true
    const verificarPlano = async () => {
      try {
        const [conta] = await chamarRpc<Array<{ status_assinatura: string | null; cancelar_ao_fim: boolean; fim_periodo: string | null }>>('obter_estado_conta', {})
        const vigente = !conta.fim_periodo || Date.parse(conta.fim_periodo) > Date.now()
        if (ativo && vigente && (conta.status_assinatura === 'ativa' || (conta.status_assinatura === 'cancelada' && conta.cancelar_ao_fim))) {
          registrarAssinante(true)
          limparBloqueioDiario()
          definirLiberaEm(null)
        }
      } catch { /* Sem conexão, conservamos o aviso até a próxima consulta. */ }
    }
    void verificarPlano()
    const intervalo = window.setInterval(() => { void verificarPlano() }, 60_000)
    return () => { ativo = false; window.clearInterval(intervalo) }
  }, [liberaEm, usuario, caminho, variante])

  if (!usuario || !LIMITES_HABILITADOS || !liberaEm) return null
  const faltam = Math.max(0, Math.ceil((Date.parse(liberaEm) - agora) / 1000))
  if (faltam === 0) return null
  const recolhida = recolhidaAte === liberaEm
  if (variante === 'chip') {
    if (!recolhida) return null
    const horas = Math.floor(faltam / 3600), minutos = Math.floor((faltam % 3600) / 60)
    const tempo = horas > 0 ? `${horas}h${String(minutos).padStart(2, '0')}` : `${minutos}min`
    return <button type="button" className="chip-limite" onClick={() => definirRecolhidaAte(null)} title={`Questões grátis de novo em ${tempo}. Toque para ver o aviso.`} aria-label={`Questões grátis de novo em ${tempo}`}>
      <Icone nome="relogio" tamanho={14} />{tempo}
    </button>
  }
  // No resumo da sessão o dia cumprido já aparece em um cartão próprio.
  if (recolhida || caminho === '/resumo') return null
  const horas = Math.floor(faltam / 3600), minutos = Math.floor((faltam % 3600) / 60)
  const tempo = horas > 0 ? `${horas}h ${String(minutos).padStart(2, '0')}min` : `${Math.max(1, minutos)}min`
  return <aside className="aviso-bloqueio-topo" aria-label="Limite de questões grátis">
    <div className="conteudo aviso-bloqueio-topo__interno">
      <Icone nome="relogio" tamanho={16} />
      <span className="aviso-bloqueio-topo__texto">
        {suasQuestoesGratis(limiteGratisConhecido())} acabaram. Voltam em <time className="numerico" dateTime={liberaEm} aria-label={formatarDuracao(faltam)}>{tempo}</time>.
      </span>
      <a className="aviso-bloqueio-topo__cta" href={href('/assinatura')}>Continuar sem limite</a>
      <button type="button" className="aviso-bloqueio-topo__fechar" aria-label="Recolher aviso" title="Recolher aviso" onClick={() => definirRecolhidaAte(liberaEm)}><Icone nome="fechar" tamanho={14} /></button>
    </div>
  </aside>
}
