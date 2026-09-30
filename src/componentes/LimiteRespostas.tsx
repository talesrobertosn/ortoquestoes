import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { EVENTO_DADOS } from '../estado/armazenamento'
import { LIMITES_HABILITADOS, conviteLimiteJaVisto, lerBloqueioDiario, limparBloqueioDiario, marcarConviteLimiteVisto, type EstadoLimite } from '../estado/limiteDiario'
import { formatarDuracao } from '../dados/tipos'
import { chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'
import { Painel } from './Painel'
import { JanelaCentral, usarTelaLarga } from './JanelaCentral'
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
  const horas = Math.floor(faltam / 3600), minutos = Math.floor((faltam % 3600) / 60)
  const tempo = horas > 0 ? `${horas}h ${String(minutos).padStart(2, '0')}min` : `${Math.max(1, minutos)}min`
  return <aside className="aviso-bloqueio-topo" aria-label="Limite diário de respostas">
    <div className="conteudo aviso-bloqueio-topo__interno">
      <Icone nome="relogio" tamanho={16} />
      <span className="aviso-bloqueio-topo__texto">
        Suas 20 questões grátis de hoje acabaram. Voltam em <time className="numerico" dateTime={liberaEm} aria-label={formatarDuracao(faltam)}>{tempo}</time>.
      </span>
      <a className="aviso-bloqueio-topo__cta" href={href('/assinatura')}>Continuar sem limite</a>
      <button type="button" className="aviso-bloqueio-topo__fechar" aria-label="Recolher aviso" title="Recolher aviso" onClick={() => definirRecolhidaAte(liberaEm)}><Icone nome="fechar" tamanho={14} /></button>
    </div>
  </aside>
}

export function PainelLimite({ estado, aberto, aoFechar }: { estado: EstadoLimite | null; aberto: boolean; aoFechar: () => void }) {
  const telaLarga = usarTelaLarga()
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
  const tempo = libera && faltam !== null ? { faltam, libera } : null
  if (telaLarga) {
    return (
      <JanelaCentral aberta={aberto} aoFechar={aoFechar} rotulo="Suas 20 questões grátis de hoje acabaram" className="pw">
        <OfertaLimite consumidas={consumidas} sequencia={estado?.sequencia ?? 0} tempo={tempo} aoFechar={aoFechar} larga />
      </JanelaCentral>
    )
  }
  return (
    <Painel titulo="Suas 20 questões grátis de hoje acabaram" aberto={aberto} aoFechar={aoFechar}>
      <OfertaLimite consumidas={consumidas} sequencia={estado?.sequencia ?? 0} tempo={tempo} aoFechar={aoFechar} />
    </Painel>
  )
}

const POR_MES_ANUAL = PLANO_MAIS_EM_CONTA.total / PLANO_MAIS_EM_CONTA.meses

/** O convite do limite diário: direto, com o preço e o que o assinante ganha. */
function OfertaLimite({ consumidas, sequencia, tempo, aoFechar, larga = false }: {
  consumidas: number; sequencia: number; tempo: { faltam: number; libera: Date } | null; aoFechar: () => void; larga?: boolean
}) {
  const beneficios: Array<[string, string]> = [
    ['Questões sem limite', 'Resolva quantas quiser, todo dia.'],
    ['Cronograma até a prova', 'A meta de cada dia, começando pelo que mais cai.'],
    ['Simulado Nacional todo mês', 'Sua nota e sua posição entre os residentes.'],
    ['Temas que mais caem', 'O ranking do que a prova mais cobra.'],
  ]
  return (
    <div className={'pw-conteudo' + (larga ? ' pw-conteudo--larga' : '')}>
      <section className="pw-lado">
        <span className="pw-anel" aria-hidden="true"><b className="numerico">{consumidas}</b><small>de 20</small></span>
        <p className="pw-lado__selo">Plano gratuito · hoje</p>
        <h2 className="pw-lado__titulo">Você fez as 20 questões grátis de hoje.</h2>
        <p className="pw-lado__texto">{sequencia > 0 ? <>São <b>{sequencia} {sequencia === 1 ? 'dia' : 'dias'} seguidos</b> de estudo. </> : null}Amanhã a cota volta inteira. Se quiser continuar agora, é só assinar.</p>
        {tempo && <p className="pw-lado__relogio"><Icone nome="relogio" tamanho={16} /> Grátis de novo em <strong className="numerico">{formatarDuracao(tempo.faltam)}</strong></p>}
      </section>

      <section className="pw-oferta" aria-label="Assinatura">
        <p className="pw-oferta__rotulo">Assine o OrtoQuestões</p>
        <p className="pw-oferta__preco"><b>{real(POR_MES_ANUAL)}</b><span>por mês no plano anual</span></p>
        <p className="pw-oferta__barato">Um dos bancos de questões de ortopedia mais baratos do Brasil: {real(PLANO_MAIS_EM_CONTA.total)} por ano, menos de {real(CUSTO_POR_DIA)} por dia.</p>
        <ul className="pw-oferta__lista">
          {beneficios.map(([titulo, texto]) => <li key={titulo}><Icone nome="certo" tamanho={18} /><span><b>{titulo}.</b> {texto}</span></li>)}
        </ul>
        <a className="botao botao--principal botao--grande pw-oferta__cta" href={href('/assinatura')}>Assinar por {real(POR_MES_ANUAL)}/mês</a>
        <p className="pw-oferta__garantia"><Icone nome="certo" tamanho={14} /> Garantia de 7 dias · cancele quando quiser · também há plano mensal</p>
        <p className="pw-oferta__projeto">O OrtoQuestões é um projeto independente: a assinatura paga o site e mantém o gratuito com 20 questões por dia para todo mundo.</p>
        <button className="pw-oferta__depois" type="button" onClick={aoFechar}>Volto amanhã pelo gratuito</button>
      </section>
    </div>
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

/**
 * Abre o convite do limite uma vez por dia, sozinho, quando as 20 grátis de
 * hoje já acabaram e a pessoa ainda não o viu (por exemplo, ao voltar para a
 * página inicial ou ao chegar no resumo).
 */
export function ConviteLimiteDoDia() {
  const { sessao } = usarConta()
  const assinante = usarAssinante(sessao)
  const [liberaEm] = useState(() => (LIMITES_HABILITADOS ? lerBloqueioDiario() : null))
  const [aberto, definirAberto] = useState(false)
  useEffect(() => {
    if (!sessao || assinante || !liberaEm || conviteLimiteJaVisto(liberaEm)) return
    const t = window.setTimeout(() => { marcarConviteLimiteVisto(liberaEm); definirAberto(true) }, 700)
    return () => window.clearTimeout(t)
  }, [sessao, assinante, liberaEm])
  if (!liberaEm) return null
  const estado: EstadoLimite = { permitido: false, paywallAtivo: true, ilimitado: false, consumidas: 20, limite: 20, restantes: 0, liberaEm, sequencia: 0 }
  return <PainelLimite estado={estado} aberto={aberto} aoFechar={() => definirAberto(false)} />
}
