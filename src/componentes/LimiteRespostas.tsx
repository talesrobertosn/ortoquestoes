import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { EVENTO_DADOS } from '../estado/armazenamento'
import { LIMITES_HABILITADOS, lerBloqueioDiario, limparBloqueioDiario, type EstadoLimite } from '../estado/limiteDiario'
import { formatarDuracao } from '../dados/tipos'
import { chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'
import { Painel } from './Painel'
import { Icone } from './Icone'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CUSTO_POR_DIA, PLANO_MAIS_EM_CONTA, real } from '../dados/planos'
import { registrarAssinante, usarAssinante } from '../conta/plano'

export function AvisoLimite({ estado }: { estado: EstadoLimite | null }) {
  if (!estado?.permitido || estado.ilimitado || estado.restantes === null || estado.restantes > 3) return null
  return <p className="aviso-limite" role="status">{estado.restantes === 0
    ? 'Estudo gratuito de hoje completo. Bom trabalho!'
    : <>Falta{estado.restantes === 1 ? '' : 'm'} {estado.restantes} para completar o estudo gratuito de hoje.</>}</p>
}

/**
 * Fica junto ao cabeçalho até a virada do dia. A pessoa pode recolher a
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
  const blocos: [number, string][] = [[Math.floor(faltam / 3600), 'h'], [Math.floor((faltam % 3600) / 60), 'min'], [faltam % 60, 's']]
  return <aside className="aviso-bloqueio-topo" aria-label="Limite diário de respostas">
    <div className="conteudo aviso-bloqueio-topo__interno">
      <span className="aviso-bloqueio-topo__selo" aria-hidden="true"><b className="numerico">20</b><small>de 20</small></span>
      <span className="aviso-bloqueio-topo__texto">
        <strong>Meta gratuita de hoje cumprida.</strong>
        <span>Continue agora sem limite e apoie o projeto.</span>
      </span>
      <span className="aviso-bloqueio-topo__relogio">
        <span className="aviso-bloqueio-topo__rotulo">Grátis de novo em</span>
        <time className="numerico" dateTime={liberaEm} aria-live="off" aria-label={formatarDuracao(faltam)}>
          {blocos.map(([valor, unidade]) => <span key={unidade} className="aviso-bloqueio-topo__bloco"><b>{String(valor).padStart(2, '0')}</b><small>{unidade}</small></span>)}
        </time>
      </span>
      <a className="aviso-bloqueio-topo__cta" href={href('/assinatura')}>Continuar sem limite</a>
      <button type="button" className="aviso-bloqueio-topo__fechar" aria-label="Recolher aviso" title="Recolher aviso" onClick={() => definirRecolhidaAte(liberaEm)}><Icone nome="fechar" tamanho={16} /></button>
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
  const consumidas = estado?.consumidas ?? 20
  return (
    <Painel titulo="Meta gratuita de hoje cumprida" aberto={aberto} aoFechar={aoFechar}>
      <div className="paywall">
        <div className="paywall__topo">
          <span className="paywall__anel" aria-hidden="true"><b className="numerico">{consumidas}</b><small>de 20</small></span>
          <div>
            <p className="paywall__selo">Plano gratuito · hoje</p>
            <h3 className="paywall__titulo">Você está no embalo. Não precisa parar agora.</h3>
            <p className="paywall__sub">Você resolveu {consumidas} questões comentadas hoje.{estado && estado.sequencia > 0 && <> São <b>{estado.sequencia} {estado.sequencia === 1 ? 'dia' : 'dias'} seguidos</b> de estudo.</>}</p>
          </div>
        </div>

        <section className="paywall__projeto">
          <p className="paywall__projeto-titulo">Por que existe um limite?</p>
          <p>O OrtoQuestões é um projeto independente, criado para que treinar para a prova não dependa de pagar caro.</p>
          <p>Manter o site, incluir provas novas e revisar os comentários tem custo. As assinaturas cobrem essa estrutura, e é isso que permite manter <b>o plano gratuito generoso: 20 questões comentadas todos os dias, sem cartão</b>.</p>
          <p className="paywall__projeto-fecho">Se o OrtoQuestões já te ajudou hoje, assinar é a forma de retribuir e de garantir que ele continue existindo.</p>
        </section>

        <section className="paywall__oferta" aria-label="Assinatura">
          <p className="paywall__rotulo">Apoie e estude sem limite</p>
          <ul className="paywall__beneficios">
            <li><Icone nome="certo" tamanho={16} /><span><b>Questões sem limite diário.</b> Resolva quantas quiser, no ritmo que a sua prova pede.</span></li>
            <li><Icone nome="certo" tamanho={16} /><span><b>Simulados e sessões longas sem interrupção.</b> Ideal para a reta final.</span></li>
            <li><Icone nome="certo" tamanho={16} /><span><b>Você passa a manter o projeto vivo.</b> Provas novas e comentários revisados chegam por causa de quem apoia.</span></li>
          </ul>
          <p className="paywall__preco">
            <span>A partir de</span>
            <b className="numerico">{real(CUSTO_POR_DIA)}<small>/dia</small></b>
            <span className="paywall__preco-nota">Menos que um cafezinho. No plano {PLANO_MAIS_EM_CONTA.nome.toLowerCase()}, {real(PLANO_MAIS_EM_CONTA.total)} cobrados uma vez por ano.</span>
          </p>
          <a className="botao botao--principal botao--grande paywall__cta" href={href('/assinatura')}>Quero apoiar e continuar</a>
          <p className="paywall__garantia"><Icone nome="certo" tamanho={14} /> Garantia de 7 dias em cada cobrança · cancele quando quiser</p>
        </section>

        {libera && faltam !== null && (
          <div className="liberacao-limite">
            <span>Prefere esperar? Novas questões grátis em</span>
            <strong className="numerico">{formatarDuracao(faltam)}</strong>
            <span className="meta">Liberação às {libera.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}, horário de São Paulo. Comentários, desempenho, revisões e todo o seu histórico continuam abertos.</span>
          </div>
        )}
        <button className="botao paywall__depois" type="button" onClick={aoFechar}>Volto amanhã pelo gratuito</button>
      </div>
    </Painel>
  )
}

/**
 * No resumo da sessão, quando o gratuito do dia acabou: fecha o dia com
 * reconhecimento e deixa a assinatura como uma linha discreta.
 */
export function DiaCumprido({ erradas = 0 }: { erradas?: number }) {
  const { sessao } = usarConta()
  const assinante = usarAssinante(sessao)
  const [liberaEm] = useState(() => (LIMITES_HABILITADOS ? lerBloqueioDiario() : null))
  const [agora, definirAgora] = useState(Date.now())
  useEffect(() => {
    if (!liberaEm) return
    const intervalo = window.setInterval(() => definirAgora(Date.now()), 30_000)
    return () => window.clearInterval(intervalo)
  }, [liberaEm])
  if (!sessao || assinante || !liberaEm) return null
  const faltam = Math.max(0, Math.ceil((Date.parse(liberaEm) - agora) / 1000))
  if (faltam === 0) return null
  const horas = Math.floor(faltam / 3600), minutos = Math.floor((faltam % 3600) / 60)
  return <section className="dia-cumprido" aria-label="Estudo gratuito de hoje">
    <span className="dia-cumprido__anel" aria-hidden="true"><Icone nome="certo" tamanho={26} espesso={2.4} /></span>
    <div className="dia-cumprido__texto">
      <p className="dia-cumprido__selo">Estudo gratuito de hoje</p>
      <h2>Dia cumprido. Bom trabalho!</h2>
      <p>Você completou as 20 questões gratuitas de hoje e amanhã a cota volta inteira. Enquanto isso, comentários, revisões e desempenho seguem abertos{erradas > 0 ? ': vale reler os comentários das que você errou.' : '. E nesta sessão você não errou nenhuma.'}</p>
      <p className="dia-cumprido__rodape">
        <span><Icone nome="relogio" tamanho={14} /> Grátis de novo em {horas > 0 ? `${horas}h ${String(minutos).padStart(2, '0')}min` : `${minutos}min`}</span>
        <a href={href('/assinatura')}>Prefere continuar agora? Conheça a assinatura</a>
      </p>
    </div>
  </section>
}
