import { useEffect, useMemo, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { lerRespondidas } from '../estado/sessao'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { Simbolo } from '../marca/Simbolo'
import { JanelaCentral } from '../componentes/JanelaCentral'
import { VERSAO_CONDICOES_ASSINATURA } from '../conta/termos'
import { eventoMeta } from '../conta/consentimento'
import { href } from '../util/rotas'
import { LIMITE_GRATIS_ATUAL } from '../config'
import { MENSAL, PLANOS, real } from '../dados/planos'

/** Na página, o anual fica no meio: é o que queremos que salte aos olhos. */
const ORDEM_PLANOS = [PLANOS[0], PLANOS[2], PLANOS[1]]
import '../estilos/paginas/Assinatura.css'

const pagamentosHabilitados = import.meta.env.VITE_PAGAMENTOS_HABILITADOS === 'true'
const pixHabilitado = pagamentosHabilitados
const limitesHabilitados = import.meta.env.VITE_LIMITES_HABILITADOS === 'true'

interface MetricasConta { respostas_total: number; sequencia: number; plano: string | null; status_assinatura: string | null; fim_periodo: string | null; ultima_cobranca_em: string | null; cancelar_ao_fim: boolean }


/** O que só o assinante tem. A ordem é a da página e a do comparativo. */
const RECURSOS: { icone: NomeIcone; titulo: string; texto: string; destino: string; largo?: boolean }[] = [
  { icone: 'rota', titulo: 'Cronograma baseado no que mais cai', texto: 'Você diz a data da prova e o Orto Questões monta a meta de cada dia e os temas de cada semana, na ordem do que mais cai no TEOT e no TARO e com reforço nos seus pontos fracos. Atrasou ou adiantou, ele se ajusta sozinho.', destino: '/cronograma', largo: true },
  { icone: 'trofeu', titulo: 'Simulado Nacional, todo mês', texto: 'Uma prova igual para todos os assinantes do Brasil, com 50 questões de TEOT e TARO em duas horas. Corrigida na hora, com a sua posição e um relatório de prontidão por tema.', destino: '/simulado-nacional', largo: true },
  { icone: 'grafico', titulo: 'Temas que mais caem', texto: 'O ranking das áreas e dos assuntos mais cobrados. Um toque em qualquer assunto e começa o treino dele.', destino: '/temas-que-mais-caem' },
  { icone: 'grupo', titulo: 'Como a turma respondeu', texto: 'Depois de cada questão, quantos marcaram cada alternativa e qual é a pegadinha. E sessões com as que a turma mais erra.', destino: '/treinar' },
  { icone: 'medalha', titulo: 'Liga da residência', texto: 'Um ranking privado do seu serviço. Crie a liga, mande o link no grupo e veja quem mais estuda.', destino: '/ligas' },
  { icone: 'correio', titulo: 'Relatório do mês', texto: 'Todo dia 1º, no seu e-mail: quantas questões, acerto, temas que subiram e caíram e o próximo passo.', destino: '/conta?secao=estudo' },
]

/** O que vem com qualquer plano, listado embaixo do preço. */
const INCLUI = ['Cronograma baseado no que mais cai na prova', 'Ranking dos temas que mais caem', 'Simulado Nacional todo mês, com sua posição', 'Como a turma respondeu cada questão', 'Liga da residência e relatório mensal', 'Questões sem limite', 'Garantia de 7 dias em cada cobrança']

export function Assinatura() {
  const { sessao } = usarConta()
  const [metricas, definirMetricas] = useState<MetricasConta | null>(null)
  const [mensagem, definirMensagem] = useState<string | null>(null)
  const [planoEscolhido, definirPlanoEscolhido] = useState<(typeof PLANOS)[number] | null>(null)
  const [aceitouCondicoes, definirAceitouCondicoes] = useState(false)
  const [abrindoCheckout, definirAbrindoCheckout] = useState(false)
  const [meioPagamento, definirMeioPagamento] = useState<'cartao' | 'pix'>(pixHabilitado ? 'pix' : 'cartao')
  const [cpf, definirCpf] = useState('')
  const [pix, definirPix] = useState<{ url: string; pedido_id: string; expira_em: string } | null>(null)
  const locais = useMemo(() => Object.values(lerRespondidas()), [])
  const nome = String(sessao?.user.user_metadata?.nome ?? '').trim()

  useEffect(() => {
    if (!sessao) return
    chamarRpc<MetricasConta[]>('obter_estado_conta', {}).then((r) => definirMetricas(r[0] ?? null)).catch(() => definirMetricas(null))
  }, [sessao])

  useEffect(() => {
    if (!pix || !sessao) return
    let encerrado = false
    let consultando = false
    const consultar = async () => {
      if (consultando || encerrado) return
      consultando = true
      try {
        const r = await chamarFuncao<{ status: string }>('criar-pix', { pedido_id: pix.pedido_id })
        if (encerrado) return
        if (r.status === 'approved') {
          definirMetricas((await chamarRpc<MetricasConta[]>('obter_estado_conta', {}))[0] ?? null)
          definirMensagem('Pagamento confirmado. Seu período de acesso está ativo.')
          definirPix(null)
          definirPlanoEscolhido(null)
        } else if (['cancelled', 'rejected', 'expired', 'refunded', 'charged_back'].includes(r.status)) {
          definirMensagem('Este Pix foi encerrado. Confira o pagamento no Mercado Pago antes de gerar outro.')
          definirPix(null)
        }
      } catch { /* Mantém o link disponível; a confirmação vem do provedor. */ }
      finally { consultando = false }
    }
    void consultar()
    const timer = window.setInterval(() => void consultar(), 10000)
    return () => { encerrado = true; window.clearInterval(timer) }
  }, [pix, sessao])

  function escolher(plano: (typeof PLANOS)[number]) {
    if (!pagamentosHabilitados || !sessao) return
    definirPlanoEscolhido(plano)
    if (renovarPix) definirMeioPagamento('pix')
    definirPix(null)
    definirCpf('')
    definirAceitouCondicoes(false)
    definirMensagem(null)
  }
  async function confirmarCompra() {
    if (!planoEscolhido || !aceitouCondicoes || !pagamentosHabilitados || !sessao || abrindoCheckout) return
    definirAbrindoCheckout(true)
    definirMensagem('Preparando checkout seguro…')
    eventoMeta('InitiateCheckout', { content_name: planoEscolhido.id, currency: 'BRL', value: planoEscolhido.total })
    try {
      if (meioPagamento === 'pix') {
        const r = await chamarFuncao<{ url: string; pedido_id: string; expira_em: string }>('criar-pix', {
          plano: planoEscolhido.id, cpf, aceite_termos_versao: VERSAO_CONDICOES_ASSINATURA, aceite_confirmado: true,
        })
        definirCpf('')
        definirPix(r)
        definirMensagem('Pix gerado. Abra o Mercado Pago para pagar. O acesso será liberado após a confirmação.')
        definirAbrindoCheckout(false)
        return
      }
      const pedir = (versao: string) => chamarFuncao<{ url: string }>('criar-checkout', {
        plano: planoEscolhido.id,
        aceite_termos_versao: versao,
        aceite_confirmado: true,
      })
      const r = await pedir(VERSAO_CONDICOES_ASSINATURA)
      location.assign(r.url)
    } catch (erro) {
      definirMensagem(erro instanceof Error ? erro.message : 'Não foi possível abrir o checkout.')
      definirAbrindoCheckout(false)
    }
  }
  const respondidasConta = metricas?.respostas_total ?? locais.length
  const ativa = Boolean(metricas?.status_assinatura === 'ativa' && (!metricas.fim_periodo || new Date(metricas.fim_periodo).getTime() > Date.now()))
  const acessoPagoAteOFim = Boolean(metricas?.status_assinatura === 'cancelada' && metricas.fim_periodo && new Date(metricas.fim_periodo).getTime() > Date.now())

  // Quem já tem acesso pago vê o estado do plano no topo, e não a página de vendas.
  const comAcessoPago = Boolean((ativa || acessoPagoAteOFim) && metricas)
  // Pix (ativo, sem renovação automática) nos 7 dias finais: pode renovar já, e o
  // período novo começa quando o atual termina (o servidor soma os dias).
  const fimAtual = metricas?.fim_periodo ? Date.parse(metricas.fim_periodo) : NaN
  const renovarPix = pixHabilitado && ativa && Boolean(metricas?.cancelar_ao_fim) && Number.isFinite(fimAtual) && fimAtual - Date.now() <= 7 * 864e5
  const diasRestantes = renovarPix ? Math.max(1, Math.ceil((fimAtual - Date.now()) / 864e5)) : 0
  const fimAtualTexto = renovarPix ? new Date(fimAtual).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''

  return (
    <div className="empilha-2 vp">
      {!comAcessoPago && <section className="vp-heroi">
        <div className="vp-heroi__texto">
          <p className="vp-heroi__selo"><Simbolo tamanho={16} variante="traco" /> Plano do assinante</p>
          <h1>Tudo o que você precisa para chegar pronto na prova.</h1>
          <p className="vp-heroi__lide">
            {nome ? `${nome}, questões` : 'Questões'} sem limite, cronograma pelo que mais cai e Simulado Nacional todo mês.
          </p>
          <div className="vp-heroi__acoes">
            <a className="botao botao--claro botao--grande" href="#planos" onClick={(e) => { e.preventDefault(); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) }}>Ver os planos</a>
            <a className="botao botao--vidro botao--grande" href={href(sessao ? '/treinar' : '/conta?modo=criar')}>{sessao ? 'Continuar no gratuito' : 'Começar grátis'}</a>
          </div>
          <p className="vp-heroi__garantia"><Icone nome="certo" tamanho={16} /> Garantia de 7 dias · cancelamento por botão · seu histórico nunca é apagado</p>
        </div>
        <div className="vp-vitrine" aria-hidden="true">
          <div className="vp-vitrine__cartao vp-vitrine__cartao--nacional">
            <span className="vp-vitrine__rotulo"><Icone nome="trofeu" tamanho={14} /> Simulado Nacional</span>
            <div className="vp-vitrine__nota"><strong>74%</strong><span>#12 de 318</span></div>
            <small>Pronto em Joelho e Trauma</small>
          </div>
          <div className="vp-vitrine__cartao vp-vitrine__cartao--turma">
            <span className="vp-vitrine__rotulo"><Icone nome="grupo" tamanho={14} /> Como a turma respondeu</span>
            <span className="vp-vitrine__barra vp-vitrine__barra--certa"><b>B</b><i style={{ width: '68%' }} />68%</span>
            <span className="vp-vitrine__barra vp-vitrine__barra--pegadinha"><b>C</b><i style={{ width: '21%' }} />21%</span>
            <span className="vp-vitrine__barra"><b>A</b><i style={{ width: '8%' }} />8%</span>
          </div>
          <div className="vp-vitrine__cartao vp-vitrine__cartao--plano">
            <span className="vp-vitrine__rotulo"><Icone nome="rota" tamanho={14} /> Cronograma</span>
            <strong>45</strong><small>questões hoje · faltam 87 dias</small>
          </div>
          <span className="vp-vitrine__nota-rodape">Ilustração com números de exemplo</span>
        </div>
      </section>}

      {(ativa || acessoPagoAteOFim) && metricas && (
        <section className="vp-ativo">
          <span className="vp-ativo__icone"><Icone nome="certo" tamanho={22} /></span>
          <div>
            <h2>{metricas.cancelar_ao_fim || acessoPagoAteOFim ? 'Acesso pago sem renovação automática' : `Seu plano ${metricas.plano} está ativo`}</h2>
            <p>{metricas.cancelar_ao_fim || acessoPagoAteOFim ? 'Não haverá nova cobrança desta assinatura. O período já pago não foi reembolsado.' : 'A próxima cobrança segue a periodicidade escolhida.'} Acesso ilimitado até {metricas.fim_periodo ? new Date(metricas.fim_periodo).toLocaleDateString('pt-BR') : 'o fim do período atual'}.</p>
            <div className="linha">
              <a className="botao botao--principal" href={href('/cronograma')}>Abrir o cronograma</a>
              <a className="botao" href={href('/conta/assinatura')}>Gerenciar renovação ou pedir reembolso</a>
            </div>
            {renovarPix && <p className="vp-ativo__renovar"><strong>Faltam {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}. Renove agora pelo Pix sem perder nada:</strong> os dias que restam continuam valendo e o novo período começa em {fimAtualTexto}, quando o atual termina. <a href="#planos">Escolher o plano</a></p>}
          </div>
        </section>
      )}

      {(!ativa || renovarPix) && <section className="vp-secao vp-precos" id="planos">
        <header className="vp-secao__cabeca vp-precos__cabeca">
          <p className="vp-sobre">Planos</p>
          <h2>Tudo liberado em qualquer plano. Você escolhe só o ritmo de pagamento.</h2>
          <p>Os três planos têm exatamente os mesmos recursos. Quanto mais longo, menor o preço por mês.</p>
          {!limitesHabilitados && <p className="vp-precos__fase">O acesso gratuito está sem limite diário nesta fase. O plano libera os recursos exclusivos e garante questões sem limite se o limite for ligado.</p>}
          <ul className="vp-meios" aria-label="Formas de pagamento">
            <li><IconePix /> Pix em todos os planos</li>
            <li><IconeCartao /> Cartão de crédito</li>
            <li><Icone nome="certo" tamanho={16} /> Garantia de 7 dias</li>
          </ul>
        </header>

        <div className="vp-planos">
          {ORDEM_PLANOS.map((p) => {
            const porMes = p.total / p.meses
            const cheio = MENSAL * p.meses
            const economia = cheio - p.total
            const desconto = Math.round((1 - porMes / MENSAL) * 100)
            return (
              <article key={p.id} className={'vp-plano' + (p.destaque ? ' vp-plano--destaque' : '')}>
                {p.destaque && <span className="vp-plano__fita">Melhor custo-benefício</span>}
                <header className="vp-plano__topo">
                  <h3>{p.nome}</h3>
                  {desconto > 0 && <span className="vp-plano__desconto">{desconto}% OFF</span>}
                </header>
                <p className="vp-plano__chamada">{p.chamada}</p>
                <div className="vp-plano__preco">
                  {p.meses > 1 && <span className="vp-plano__cheio">de {real(cheio)}</span>}
                  <span className="vp-plano__mes"><small>R$</small><strong>{real(porMes).replace('R$', '').trim()}</strong><small>/mês</small></span>
                  <span className="vp-plano__total">{p.meses === 1 ? 'cobrado todo mês' : <>{real(p.total)} {p.meses === 6 ? 'a cada 6 meses' : 'por ano'}</>}</span>
                </div>
                {economia > 0
                  ? <p className="vp-plano__economia"><Icone nome="certo" tamanho={14} /> Você economiza {real(economia)}{p.meses === 12 ? ` · ${real(p.total / 365)} por dia` : ''}</p>
                  : <p className="vp-plano__economia vp-plano__economia--neutra">Sem fidelidade, cancele quando quiser</p>}
                <p className="vp-plano__pix"><IconePix /> Pix ou cartão</p>
                {!sessao
                  ? <a className={'botao botao--largo vp-plano__cta' + (p.destaque ? ' botao--principal' : '')} href={href('/conta?modo=criar')}>Criar conta para assinar</a>
                  : <button className={'botao botao--largo vp-plano__cta' + (p.destaque ? ' botao--principal' : '')} type="button" disabled={!pagamentosHabilitados || (ativa && !renovarPix)} onClick={() => escolher(p)}>{renovarPix ? `Renovar no Pix: ${p.nome.toLowerCase()}` : ativa ? 'Plano ativo' : pagamentosHabilitados ? `Assinar ${p.nome.toLowerCase()}` : 'Em breve'}</button>}
                <details className="vp-plano__detalhes">
                  <summary><span>Ver o que inclui</span><Icone nome="baixo" tamanho={16} /></summary>
                  <ul className="vp-plano__itens">
                    {INCLUI.map((item, i) => <li key={item} className={i === 0 ? 'vp-plano__item--destaque' : ''}><Icone nome={i === 0 ? 'rota' : 'certo'} tamanho={16} /> {item}</li>)}
                  </ul>
                </details>
              </article>
            )
          })}
        </div>
        {!pagamentosHabilitados && <p className="vp-aviso"><Icone nome="calendario" tamanho={16} /> As assinaturas abrem em breve. Até lá, o acervo, os comentários e a revisão continuam disponíveis no gratuito.</p>}
        {mensagem && !planoEscolhido && <p role="status" className="vp-aviso">{mensagem}</p>}
        <div className="vp-pagamento-seguro" role="note">
          <Icone nome="cadeado" tamanho={20} />
          <p><strong>Pagamento protegido pelo Mercado Pago.</strong> No cartão, a renovação é automática na periodicidade escolhida; no Pix, é um pagamento único pelo período completo, sem renovação; nos 7 dias finais dá para pagar o próximo antecipadamente sem perder nenhum dia. Os dados do cartão ficam no Mercado Pago, nunca no Orto Questões. <a href={href('/condicoes-assinatura')}>Condições da assinatura</a></p>
        </div>
      </section>}

      <section className="vp-secao">
        <header className="vp-secao__cabeca">
          <p className="vp-sobre">{comAcessoPago ? 'Seu plano inclui' : 'Só para assinantes'}</p>
          <h2>{comAcessoPago ? 'Tudo o que o seu plano libera' : 'Estude com direção, não no escuro'}</h2>
          {!comAcessoPago && <p>O acervo, os comentários e a revisão continuam abertos para todos. O plano soma o que responde às perguntas de quem está perto da prova: o que estudo hoje? o que mais cai? estou pronto? onde a turma erra?</p>}
        </header>
        <div className="vp-recursos">
          {RECURSOS.map((r) => (
            <article key={r.titulo} className={'vp-recurso' + (r.largo ? ' vp-recurso--destaque' : '') + (r.destino === '/cronograma' ? ' vp-recurso--temas' : '')}>
              <span className="vp-recurso__icone"><Icone nome={r.icone} tamanho={24} /></span>
              <div className="vp-recurso__corpo">
                <h3>{r.titulo}</h3>
                <p>{r.texto}</p>
                <a href={href(r.destino)}>Ver como funciona <Icone nome="direita" tamanho={14} /></a>
              </div>
              {r.destino === '/cronograma' && <RankingIlustrado />}
            </article>
          ))}
        </div>
      </section>

      {!comAcessoPago && <section className="vp-secao">
        <header className="vp-secao__cabeca">
          <p className="vp-sobre">Gratuito ou assinante</p>
          <h2>{limitesHabilitados ? 'O gratuito é generoso. O assinante vai além.' : 'O acervo é de todos. O assinante vai além.'}</h2>
          <p>{limitesHabilitados ? 'Um número limitado de questões a cada 24 horas basta para muita gente manter a constância. O plano é para quem quer acelerar e saber exatamente onde está.' : 'Nesta fase, as questões não têm limite diário para ninguém. O plano libera os recursos exclusivos e garante o acesso ilimitado se o limite gratuito for ativado.'}</p>
        </header>
        <div className="vp-comparativo" role="table" aria-label="Comparação entre gratuito e assinante">
          <div className="vp-comparativo__linha vp-comparativo__cabeca" role="row">
            <span role="columnheader" />
            <span role="columnheader">Gratuito</span>
            <span role="columnheader" className="vp-comparativo__pro">Assinante</span>
          </div>
          {([
            ['Questões por dia', limitesHabilitados ? `${LIMITE_GRATIS_ATUAL} a cada 24 horas` : 'Sem limite nesta fase', 'Sem limite'],
            ['Simulado de 50 ou 100 questões de uma vez', limitesHabilitados ? 'Em vários dias' : 'Na hora nesta fase', 'Na hora'],
            ['Simulado Nacional mensal, com posição e prontidão', false, true],
            ['Cronograma baseado no que mais cai', false, true],
            ['Ranking dos temas que mais caem', false, true],
            ['Como a turma respondeu e filtros pela turma', false, true],
            ['Liga da residência', false, true],
            ['Relatório do mês por e-mail', false, true],
          ] as const).map(([rotulo, livre, pro]) => (
            <div className="vp-comparativo__linha" role="row" key={rotulo}>
              <span role="cell" className="vp-comparativo__rotulo">{rotulo}</span>
              <span role="cell">{livre === false ? <span className="vp-traco">–</span> : livre}</span>
              <span role="cell" className="vp-comparativo__pro">{pro === true ? <Icone nome="certo" tamanho={18} /> : pro}</span>
            </div>
          ))}
        </div>
        <p className="vp-comparativo__nota"><Icone nome="certo" tamanho={16} /> Iguais para todos: comentário de todas as questões, revisão espaçada, caderno de erros, desempenho, ranking e emblemas.</p>
      </section>}

      {!comAcessoPago && <section className="vp-garantia">
        <div className="vp-garantia__selo" aria-hidden="true"><strong>7</strong><span>dias</span></div>
        <div>
          <h2>Cancelamento e garantia</h2>
          <ul>
            <li><strong>Garantia de 7 dias em cada cobrança.</strong> Solicite o reembolso integral pelo botão em Minha conta. Se o provedor não confirmar a solicitação, entre em contato conosco para atendimento manual; não alteramos o status antes da confirmação.</li>
            <li><strong>Cancele quando quiser.</strong> Sem atendimento, sem justificativa. O acesso segue até o fim do período já pago.</li>
            <li><strong>Seu histórico é seu.</strong> Cancelamento, vencimento ou falha de pagamento nunca apagam respostas, revisões ou desempenho. A conta só volta ao limite gratuito.</li>
          </ul>
        </div>
      </section>}

      {!comAcessoPago && <section className="vp-secao vp-transparencia">
        <header className="vp-secao__cabeca">
          <p className="vp-sobre">Para onde vai o dinheiro</p>
          <h2>Um projeto independente, feito por quem vive a ortopedia</h2>
          <p>O Orto Questões não tem patrocinador. A assinatura paga o servidor, o banco de dados e o tempo de manter o acervo: questões novas, comentários revisados e correções. Assinar é o jeito mais direto de manter tudo isso no ar e gratuito para quem ainda não pode pagar.</p>
        </header>
        {sessao && respondidasConta > 0 && <p className="vp-voce">Você já respondeu <strong>{respondidasConta.toLocaleString('pt-BR')}</strong> questões por aqui{metricas?.sequencia ? <> e está numa sequência de <strong>{metricas.sequencia} {metricas.sequencia === 1 ? 'dia' : 'dias'}</strong></> : null}. Imagine esse ritmo sem teto.</p>}
      </section>}

      <section className="vp-secao faq vp-faq">
        <header className="vp-secao__cabeca"><p className="vp-sobre">Dúvidas</p><h2>Perguntas frequentes</h2></header>
        <details><summary>Como funciona o limite do plano gratuito?</summary><p>{limitesHabilitados ? `O gratuito tem um número limitado de respostas novas (hoje, ${LIMITE_GRATIS_ATUAL}) a cada 24 horas. O relógio começa na primeira questão respondida e, 24 horas depois, a cota volta inteira; o site mostra quanto falta. O número pode mudar; a mudança é avisada no site.` : `O limite diário está desligado nesta fase, portanto o acesso gratuito também está sem limite de respostas. Se o limite for ativado futuramente, o patamar gratuito previsto é de ${LIMITE_GRATIS_ATUAL} respostas novas por dia.`} Comentários, revisões e desempenho continuam abertos.</p></details>
        <details><summary>Posso pagar com Pix?</summary><p>Sim, em todos os planos: mensal, semestral e anual. Você paga o valor integral do período escolhido em um único Pix. Não há renovação automática; ao terminar o período, faça uma nova compra se quiser continuar. A garantia de sete dias também vale para Pix.</p></details>
        <details><summary>Como funciona o cancelamento?</summary><p>Em Minha conta, você escolhe entre impedir a próxima renovação ou, dentro de sete dias da última cobrança, pedir reembolso integral. Impedir a renovação não reembolsa a cobrança atual: o acesso pago continua até o fim do período. Se o Mercado Pago confirmar o reembolso, o acesso pago termina e sua conta volta ao gratuito.</p></details>
        <details><summary>Se eu cancelar o semestral após três meses, recebo os três restantes?</summary><p>Após os sete dias para reembolso integral, não há devolução proporcional automática. Você mantém o acesso até completar os seis meses pagos, e a assinatura não renova. A mesma regra vale para o plano anual. Seus direitos previstos em lei permanecem preservados. Consulte as <a href={href('/condicoes-assinatura')}>condições da assinatura</a> antes de comprar.</p></details>
        <details><summary>Como funciona a garantia?</summary><p>Até 7 dias depois de cada cobrança aprovada, você pode pedir reembolso integral em Minha conta. Se a solicitação automática não for confirmada pelo Mercado Pago, use o canal de contato para atendimento manual. O acesso pago só é encerrado após confirmação do reembolso. Depois desse prazo não há reembolso proporcional por esta garantia.</p></details>
        <details><summary>Paguei no Pix. Posso renovar antes de acabar sem perder dias?</summary><p>Pode. O Pix não renova sozinho, por isso enviamos um aviso por e-mail 3 dias antes do fim. A partir de 7 dias antes do término, a página de planos libera a renovação pelo Pix: os dias que faltam continuam valendo e o novo período começa no dia em que o atual termina. Exemplo: faltando 3 dias, quem paga o mensal hoje fica com esses 3 dias mais 1 mês completo. Nada se perde por pagar antes.</p></details>
        <details><summary>O que acontece com meu histórico se eu cancelar?</summary><p>Nada. Respostas, revisões, favoritas, anotações e desempenho ficam guardados. Ao impedir a renovação, o acesso pago continua até o fim do período; após um reembolso confirmado, a conta volta ao limite gratuito.</p></details>
        <details><summary>O que o assinante tem a mais?</summary><p>Questões sem limite{limitesHabilitados ? '' : ' (nesta fase, o gratuito também não tem limite)'} e os recursos exclusivos: o cronograma até a prova baseado no que mais cai, o Simulado Nacional mensal com posição e relatório de prontidão, o ranking dos temas que mais caem, como a turma respondeu cada questão (com os filtros pela turma no Treinar), a liga da residência e o relatório do mês por e-mail. Revisões, calendário e comentários são iguais para todos.</p></details>
        <details><summary>Como o cronograma é montado?</summary><p>Você informa a data da prova, a intensidade (leve, firme ou completo) e os dias de folga. O cronograma divide as questões que faltam pelos dias até a prova, coloca primeiro as áreas e os assuntos que mais caem, dá mais espaço aos temas em que você está abaixo da média e reserva a última semana para a reta final. Todo dia ele se recalcula: se você atrasar, a meta sobe um pouco; se adiantar, alivia. Quem não assina pode ver a prévia do próprio cronograma antes de decidir.</p></details>
        <details><summary>Como funciona o Simulado Nacional?</summary><p>No começo de cada mês sai uma edição nova: a mesma prova, com 50 questões de TEOT e TARO e duas horas de tempo, para todos os assinantes. Você faz quando quiser dentro do mês, numa tentativa só. A correção sai na hora, com a sua posição entre quem entregou no tempo e o acerto por tema comparado à média.</p></details>
        <details><summary>Meus colegas precisam assinar para entrar na liga?</summary><p>Sim. A liga da residência é um recurso do assinante: quem cria e quem entra precisam do plano. Quem recebe o convite sem o plano vê o nome da liga e pode assinar para entrar.</p></details>
        <details><summary>Qual plano vale mais a pena?</summary><p>Se você está a mais de seis meses da prova, o anual sai pela metade do preço do mensal. Para uma reta final curta, o mensal ou o semestral resolvem sem compromisso longo.</p></details>
      </section>

      <JanelaCentral aberta={planoEscolhido !== null} aoFechar={() => { if (!abrindoCheckout) definirPlanoEscolhido(null) }} rotulo="Finalizar assinatura" className="ck">
        {planoEscolhido && <div className="ck__corpo">
          <header className="ck__resumo">
            <span className="ck__selo"><Simbolo tamanho={18} variante="traco" /> Plano {planoEscolhido.nome.toLowerCase()}</span>
            <p className="ck__preco"><strong>{real(planoEscolhido.total / planoEscolhido.meses)}</strong><small>/mês</small></p>
            <p className="ck__total">{planoEscolhido.meses === 1 ? `${real(planoEscolhido.total)} por mês` : `${real(planoEscolhido.total)} ${planoEscolhido.meses === 6 ? 'a cada 6 meses' : 'por ano'}`}{planoEscolhido.meses > 1 && <> · economia de {real(MENSAL * planoEscolhido.meses - planoEscolhido.total)}</>}</p>
            <ul className="ck__beneficios">
              <li><Icone nome="certo" tamanho={14} /> Cronograma, Simulado Nacional e todos os recursos</li>
              <li><Icone nome="certo" tamanho={14} /> Garantia de 7 dias: reembolso integral pelo botão</li>
            </ul>
          </header>

          {pix ? (
            <div className="ck__pix-pronto">
              <span className="ck__pix-icone"><IconePix tamanho={34} /></span>
              <h3>Seu Pix está pronto</h3>
              <p>Abra o QR Code ou copie o código no Mercado Pago. Assim que o pagamento cair, o acesso é liberado aqui automaticamente.</p>
              <a className="botao botao--principal botao--largo ck__cta" href={pix.url} target="_blank" rel="noopener noreferrer">Abrir QR Code e Pix Copia e Cola</a>
              <p className="ck__aguardando"><span className="ck__girando" aria-hidden="true" /> Aguardando a confirmação · válido até {new Date(pix.expira_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          ) : (
            <>
              <fieldset className="ck__meios" disabled={abrindoCheckout}>
                <legend>Como você prefere pagar?</legend>
                {pixHabilitado && <label className={'ck__meio' + (meioPagamento === 'pix' ? ' ck__meio--ativo' : '')}>
                  <input type="radio" name="meio-pagamento" checked={meioPagamento === 'pix'} onChange={() => { definirMeioPagamento('pix'); definirAceitouCondicoes(false) }} />
                  <span className="ck__meio-icone ck__meio-icone--pix"><IconePix tamanho={24} /></span>
                  <span className="ck__meio-texto"><strong>Pix</strong><small>Pagamento único, liberado na hora em que cai. Sem renovação automática.</small></span>
                  <span className="ck__meio-marca" aria-hidden="true"><Icone nome="certo" tamanho={14} /></span>
                </label>}
                {!renovarPix && <label className={'ck__meio' + (meioPagamento === 'cartao' ? ' ck__meio--ativo' : '')}>
                  <input type="radio" name="meio-pagamento" checked={meioPagamento === 'cartao'} onChange={() => { definirMeioPagamento('cartao'); definirAceitouCondicoes(false) }} />
                  <span className="ck__meio-icone"><IconeCartao tamanho={24} /></span>
                  <span className="ck__meio-texto"><strong>Cartão de crédito</strong><small>Renovação automática a cada {planoEscolhido.meses === 1 ? 'mês' : `${planoEscolhido.meses} meses`}. Cancele quando quiser.</small></span>
                  <span className="ck__meio-marca" aria-hidden="true"><Icone nome="certo" tamanho={14} /></span>
                </label>}
              </fieldset>
              {renovarPix && <p className="ck__renovacao"><Icone nome="calendario" tamanho={14} /> Renovação antecipada: os {diasRestantes} {diasRestantes === 1 ? 'dia que falta' : 'dias que faltam'} continuam valendo. O novo período de {planoEscolhido.meses === 1 ? '1 mês' : `${planoEscolhido.meses} meses`} começa em {fimAtualTexto}, quando o atual termina.</p>}
              {meioPagamento === 'pix' && <label className="campo ck__cpf"><span>CPF de quem vai pagar</span><input inputMode="numeric" autoComplete="off" maxLength={14} placeholder="000.000.000-00" value={cpf} onChange={evento => definirCpf(evento.target.value)} /><small>Só para o Mercado Pago gerar o Pix. Não fica salvo no seu perfil.</small></label>}
              <label className="ck__aceite"><input type="checkbox" checked={aceitouCondicoes} onChange={evento => definirAceitouCondicoes(evento.target.checked)} /> <span>Li e aceito as <a href={href('/condicoes-assinatura')} target="_blank" rel="noopener noreferrer">Condições da Assinatura</a> (versão {VERSAO_CONDICOES_ASSINATURA}) e os <a href={href('/termos')} target="_blank" rel="noopener noreferrer">Termos de Uso</a> para este plano e este valor.</span></label>
              <button className="botao botao--principal botao--largo ck__cta" type="button" disabled={!aceitouCondicoes || abrindoCheckout || (meioPagamento === 'pix' && cpf.replace(/\D/g, '').length !== 11)} onClick={() => void confirmarCompra()}>
                {abrindoCheckout ? 'Preparando pagamento…' : meioPagamento === 'pix' ? <><IconePix tamanho={18} /> Gerar Pix de {real(planoEscolhido.total)}</> : <><Icone nome="cadeado" tamanho={16} /> Continuar para Mercado Pago</>}
              </button>
            </>
          )}
          {mensagem && <p role="status" className="ck__mensagem">{mensagem}</p>}
          <p className="ck__seguro"><Icone nome="cadeado" tamanho={14} /> Checkout seguro do Mercado Pago. Você só paga se confirmar lá; o Orto Questões não recebe os dados do cartão. Após os 7 dias da garantia, cancelar interrompe as renovações e mantém o acesso até o fim do período pago.</p>
        </div>}
      </JanelaCentral>

      {!comAcessoPago && <section className="vp-final">
        <div>
          <h2>Chegue à prova sabendo onde você está</h2>
          <p>Simulado todo mês, plano do dia e a turma como referência. Comece hoje.</p>
        </div>
        <div className="linha linha--empilha-celular">
          <a className="botao botao--claro botao--grande" href="#planos" onClick={(e) => { e.preventDefault(); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) }}>Escolher meu plano</a>
          <a className="botao botao--vidro botao--grande" href={href('/treinar')}>Treinar agora</a>
        </div>
      </section>}
    </div>
  )
}

/** Amostra do ranking (base do cronograma) na página de vendas: só as três primeiras áreas aparecem. */
function RankingIlustrado() {
  const linhas: Array<[string, number, string]> = [
    ['Trauma adulto', 100, '21,5% das questões'],
    ['Ortopedia pediátrica', 75, '16,2% das questões'],
    ['Mão e punho', 62, '13,4% das questões'],
    ['██████ ██████████', 46, '█,█% ███ ████████'],
    ['██████', 34, '█,█% ███ ████████'],
  ]
  return (
    <div className="vp-ranking" aria-hidden="true">
      <span className="vp-ranking__rotulo">Ranking das áreas</span>
      <ol>
        {linhas.map(([nome, largura, nivel], i) => (
          <li key={i} className={i > 2 ? 'vp-ranking__oculto' : ''}>
            <b className="numerico">{i + 1}º</b>
            <span className="vp-ranking__nome">{nome}<i style={{ width: `${largura}%` }} /></span>
            <small>{nivel}</small>
          </li>
        ))}
      </ol>
      <span className="vp-ranking__rodape"><Icone nome="cadeado" tamanho={12} /> As outras nove áreas e todos os assuntos, no plano</span>
    </div>
  )
}

/** Losango do Pix, desenhado em traço como os outros ícones. */
function IconePix({ tamanho = 16 }: { tamanho?: number }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z" /><path d="M7.6 9.2 10.4 12l-2.8 2.8M16.4 9.2 13.6 12l2.8 2.8" /></svg>
}

function IconeCartao({ tamanho = 16 }: { tamanho?: number }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></svg>
}
