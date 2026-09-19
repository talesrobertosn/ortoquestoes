import { useEffect, useMemo, useState } from 'react'
import { Estado } from '../componentes/Estados'
import { usarConta } from '../estado/conta'
import { lerRespondidas } from '../estado/sessao'
import { revisarHoje } from '../estado/revisao'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { href } from '../util/rotas'

const PLANOS = [
  { id: 'mensal', nome: 'Mensal', preco: 'R$ 39,90', detalhe: 'por mês', destaque: false },
  { id: 'semestral', nome: 'Semestral', preco: 'R$ 179,90', detalhe: 'a cada 6 meses', destaque: false },
  { id: 'anual', nome: 'Anual', preco: 'R$ 239,90', detalhe: 'por ano', destaque: true },
] as const
const pagamentosHabilitados = import.meta.env.VITE_PAGAMENTOS_HABILITADOS === 'true'

interface MetricasConta { respostas_total: number; sequencia: number; plano: string | null; status_assinatura: string | null; fim_periodo: string | null; ultima_cobranca_em: string | null; cancelar_ao_fim: boolean }

export function Assinatura() {
  const usuario = usarConta()
  const [metricas, definirMetricas] = useState<MetricasConta | null>(null)
  const [mensagem, definirMensagem] = useState<string | null>(null)
  const locais = useMemo(() => Object.values(lerRespondidas()), [])
  useEffect(() => {
    if (!usuario) return
    chamarRpc<MetricasConta[]>('obter_estado_conta', {}).then((r) => definirMetricas(r[0] ?? null)).catch(() => definirMetricas(null))
  }, [usuario])

  if (!usuario) return <Estado titulo="Entre para conhecer os planos" acoes={<a className="botao botao--principal" href={href('/entrar')}>Entrar ou criar conta</a>}><p>Os planos e o checkout só aparecem depois da entrada. Seu estudo local continua disponível.</p></Estado>

  const validas = locais.filter((r) => r.c !== null)
  const acerto = validas.length ? Math.round(validas.filter((r) => r.c).length / validas.length * 100) : null
  const revisoes = locais.filter((r) => revisarHoje(r)).length

  async function escolher(plano: string) {
    if (!pagamentosHabilitados) return
    definirMensagem('Preparando checkout seguro…')
    try {
      const r = await chamarFuncao<{ url: string }>('criar-checkout', { plano })
      location.assign(r.url)
    } catch (erro) { definirMensagem(erro instanceof Error ? erro.message : 'Não foi possível abrir o checkout.') }
  }
  async function gerenciar(acao: 'cancelar' | 'reembolsar') {
    if (!window.confirm(acao === 'reembolsar' ? 'Solicitar reembolso integral e cancelar cobranças futuras?' : 'Cancelar cobranças futuras?')) return
    definirMensagem('Processando…')
    try { await chamarFuncao('gerenciar-plano', { acao }); definirMensagem('Solicitação concluída. Atualize a página para ver o novo estado.') }
    catch (erro) { definirMensagem(erro instanceof Error ? erro.message : 'Não foi possível concluir.') }
  }

  return (
    <div className="assinatura empilha-2">
      <header className="assinatura__heroi limite-leitura">
        <p className="sobretitulo">PLANOS ORTOQUESTÕES</p><h1>Olá, {usuario.nome}.</h1>
        <p>Responda sem limite diário e ajude a sustentar o servidor, o banco de dados e a manutenção contínua do projeto.</p>
      </header>
      <section className="numeros" aria-label="Métricas da conta">
        <div className="numeros__celula"><span className="numeros__valor">{metricas?.respostas_total ?? locais.length}</span><span className="numeros__rotulo">questões respondidas</span></div>
        <div className="numeros__celula"><span className="numeros__valor">{metricas?.sequencia ?? 0}</span><span className="numeros__rotulo">dias de sequência</span></div>
        <div className="numeros__celula"><span className="numeros__valor">{acerto === null ? '—' : `${acerto}%`}</span><span className="numeros__rotulo">de acerto neste navegador</span></div>
        <div className="numeros__celula"><span className="numeros__valor">{revisoes}</span><span className="numeros__rotulo">revisões para hoje</span></div>
      </section>
      {metricas?.status_assinatura === 'ativa' && <div className="estado"><p className="estado__titulo">Seu plano {metricas.plano} está ativo.</p><p>{metricas.cancelar_ao_fim ? 'O plano já está cancelado e não terá nova cobrança.' : 'A próxima cobrança segue a periodicidade escolhida.'} Acesso ilimitado até pelo menos {metricas.fim_periodo ? new Date(metricas.fim_periodo).toLocaleDateString('pt-BR') : 'o fim do período atual'}.</p><div className="linha"><button className="botao" type="button" onClick={() => gerenciar('cancelar')}>Cancelar plano</button>{metricas.ultima_cobranca_em && Date.now()-new Date(metricas.ultima_cobranca_em).getTime() <= 7*864e5 && <button className="botao" type="button" onClick={() => gerenciar('reembolsar')}>Usar garantia de 7 dias</button>}</div></div>}
      <section><h2>Escolha seu plano</h2><p className="texto-2">O benefício pago atual é um só: respostas ilimitadas.</p>
        <div className="grade-planos">{PLANOS.map((p) => <article className={'plano' + (p.destaque ? ' plano--destaque' : '')} key={p.id}>{p.destaque && <span className="plano__selo">Melhor valor anual</span>}<h3>{p.nome}</h3><p className="plano__preco">{p.preco}</p><p className="meta">{p.detalhe}</p><button className="botao botao--principal botao--largo" disabled={!pagamentosHabilitados} onClick={() => escolher(p.id)}>{pagamentosHabilitados ? `Escolher ${p.nome}` : 'Em breve'}</button></article>)}</div>
        <p className="meta">Os planos têm renovação automática na periodicidade indicada. Antes da confirmação, o checkout deve apresentar valor, periodicidade e próxima cobrança. Você poderá cancelar por botão.</p>
        {mensagem && <p role="status" className="meta">{mensagem}</p>}
      </section>
      <section className="limite-leitura"><h2>O que continua gratuito</h2><p>Navegação, comentários, revisões, desempenho, calendário e histórico continuam livres. O plano gratuito permite até 20 novas respostas por dia, ou o limite vigente configurado no serviço.</p></section>
      <section className="faq"><h2>Perguntas frequentes</h2>
        <details><summary>Como funciona o cancelamento?</summary><p>O cancelamento será feito por botão, sem justificativa ou atendimento humano. Fora da garantia, impede cobranças futuras e mantém o acesso até o fim do período já pago.</p></details>
        <details><summary>Existe garantia?</summary><p>Sim. Até sete dias após cada cobrança, o reembolso integral será automático, cancelará cobranças futuras e devolverá imediatamente a conta ao limite gratuito. Depois desse prazo não há reembolso proporcional.</p></details>
        <details><summary>O que acontece com meu histórico?</summary><p>Nada é apagado por cancelamento, vencimento ou falha de pagamento. A conta apenas volta ao limite gratuito.</p></details>
        <details><summary>O plano muda as revisões?</summary><p>Não. Revisões e calendário permanecem disponíveis gratuitamente; o plano remove apenas o limite de respostas.</p></details>
      </section>
      <section className="cta-planos"><h2>Continue estudando no seu ritmo</h2><p>Sem escassez artificial: escolha somente se respostas ilimitadas fizerem sentido para sua rotina.</p><a className="botao" href={href('/treinar')}>Voltar ao treino</a></section>
    </div>
  )
}
