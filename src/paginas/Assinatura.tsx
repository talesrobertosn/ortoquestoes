import { useEffect, useMemo, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { lerRespondidas } from '../estado/sessao'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { usarIndice } from '../dados/usarIndice'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { Simbolo } from '../marca/Simbolo'
import { Painel } from '../componentes/Painel'
import { VERSAO_CONDICOES_ASSINATURA } from '../conta/termos'
import { href } from '../util/rotas'
import { LIMITE_GRATIS_ATUAL } from '../config'
import { MENSAL, PLANOS, real } from '../dados/planos'
import '../estilos/paginas/Assinatura.css'

const pagamentosHabilitados = import.meta.env.VITE_PAGAMENTOS_HABILITADOS === 'true'
const pixHabilitado = pagamentosHabilitados
const limitesHabilitados = import.meta.env.VITE_LIMITES_HABILITADOS === 'true'

interface MetricasConta { respostas_total: number; sequencia: number; plano: string | null; status_assinatura: string | null; fim_periodo: string | null; ultima_cobranca_em: string | null; cancelar_ao_fim: boolean }


/** O que só o assinante tem. A ordem é a da página e a do comparativo. */
const RECURSOS: { icone: NomeIcone; titulo: string; texto: string; itens: string[]; destino: string; largo?: boolean }[] = [
  { icone: 'rota', titulo: 'Cronograma baseado no que mais cai', texto: 'Você diz a data da prova e o OrtoQuestões monta a meta de cada dia e os temas de cada semana, na ordem do que mais cai no TEOT e no TARO e com reforço nos seus pontos fracos. Atrasou ou adiantou, ele se ajusta sozinho.', itens: ['Meta de cada dia até a prova', 'Primeiro os assuntos mais cobrados', 'Reta final reservada na última semana'], destino: '/cronograma', largo: true },
  { icone: 'trofeu', titulo: 'Simulado Nacional, todo mês', texto: 'Uma prova igual para todos os assinantes do Brasil, com 50 questões de TEOT e TARO em duas horas. Corrigida na hora, com a sua posição e um relatório de prontidão por tema.', itens: ['Nota, posição e percentil', 'Pronto, no caminho ou reforçar', 'Top 10 da edição'], destino: '/simulado-nacional', largo: true },
  { icone: 'grafico', titulo: 'Temas que mais caem', texto: 'O ranking das áreas e dos assuntos mais cobrados. Um toque em qualquer assunto e começa o treino dele.', itens: ['20 assuntos campeões', '12 áreas, assunto por assunto'], destino: '/temas-que-mais-caem' },
  { icone: 'grupo', titulo: 'Como a turma respondeu', texto: 'Depois de cada questão, quantos marcaram cada alternativa e qual é a pegadinha. E sessões com as que a turma mais erra.', itens: ['"68% marcaram B"', 'Filtros pela turma'], destino: '/treinar' },
  { icone: 'medalha', titulo: 'Liga da residência', texto: 'Um ranking privado do seu serviço. Crie a liga, mande o link no grupo e veja quem mais estuda.', itens: ['Convite pelo WhatsApp', 'Geral e da semana'], destino: '/ligas' },
  { icone: 'correio', titulo: 'Relatório do mês', texto: 'Todo dia 1º, no seu e-mail: quantas questões, acerto, temas que subiram e caíram e o próximo passo.', itens: ['Evolução mês a mês', 'Próximo passo sugerido'], destino: '/conta' },
]

/** O que vem com qualquer plano, listado embaixo do preço. */
const INCLUI = ['Cronograma baseado no que mais cai na prova', 'Ranking dos temas que mais caem', 'Simulado Nacional todo mês, com sua posição', 'Como a turma respondeu cada questão', 'Liga da residência e relatório mensal', 'Questões sem limite', 'Garantia de 7 dias em cada cobrança']

export function Assinatura() {
  const { sessao } = usarConta()
  const { indice } = usarIndice()
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
  const comentadas = useMemo(() => (indice?.questoes ?? []).filter((q) => q.c === 1).length, [indice])

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
    definirPix(null)
    definirCpf('')
    definirAceitouCondicoes(false)
    definirMensagem(null)
  }
  async function confirmarCompra() {
    if (!planoEscolhido || !aceitouCondicoes || !pagamentosHabilitados || !sessao || abrindoCheckout) return
    definirAbrindoCheckout(true)
    definirMensagem('Preparando checkout seguro…')
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

  return (
    <div className="empilha-2 vp">
      <section className="vp-heroi">
        <div className="vp-heroi__texto">
          <p className="vp-heroi__selo"><Simbolo tamanho={16} variante="traco" /> Plano do assinante</p>
          <h1>Tudo o que você precisa para chegar pronto na prova.</h1>
          <p className="vp-heroi__lide">
            {nome ? `${nome}, questões` : 'Questões'} {limitesHabilitados ? 'sem limite diário' : 'sem limite'} e o que só o assinante tem: um cronograma até a prova montado pelo que mais cai, o Simulado Nacional todo mês, o ranking dos temas mais cobrados, como a turma respondeu, a liga da residência e o relatório mensal.
          </p>
          <div className="vp-heroi__acoes">
            <a className="botao botao--claro botao--grande" href="#planos" onClick={(e) => { e.preventDefault(); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) }}>Ver os planos</a>
            <a className="botao botao--vidro botao--grande" href={href(sessao ? '/treinar' : '/conta?modo=criar')}>{sessao ? 'Continuar no gratuito' : 'Começar grátis'}</a>
          </div>
          <p className="vp-heroi__garantia"><Icone nome="certo" tamanho={16} /> Garantia de 7 dias · cancelamento por botão · seu histórico nunca é apagado</p>
          {!limitesHabilitados && <p className="vp-heroi__fase">O acesso gratuito está sem limite diário nesta fase: o que o assinante ganha a mais são esses recursos, e o acesso ilimitado fica garantido se o limite gratuito for ativado.</p>}
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
      </section>

      <section className="vp-prova" aria-label="O acervo">
        <div><strong>{indice ? indice.total.toLocaleString('pt-BR') : '3.800+'}</strong><span>questões de prova</span></div>
        <div><strong>{comentadas ? comentadas.toLocaleString('pt-BR') : '3.800+'}</strong><span>com comentário</span></div>
        <div><strong>{indice ? indice.temas.length : 11}</strong><span>temas da especialidade</span></div>
        <div><strong>TEOT · TARO</strong><span>e ENARE R4</span></div>
      </section>

      <section className="vp-perguntas" aria-label="O que o assinante resolve">
        <a className="vp-pergunta" href={href('/cronograma')}>
          <span className="vp-pergunta__icone"><Icone nome="rota" tamanho={22} /></span>
          <span className="vp-pergunta__q">O que eu estudo hoje?</span>
          <strong>Cronograma pelo que mais cai</strong>
          <small>A meta do dia e o tema certo, até a prova.</small>
        </a>
        <a className="vp-pergunta" href={href('/simulado-nacional')}>
          <span className="vp-pergunta__icone"><Icone nome="trofeu" tamanho={22} /></span>
          <span className="vp-pergunta__q">Estou pronto?</span>
          <strong>Simulado Nacional</strong>
          <small>Sua nota e posição entre os residentes.</small>
        </a>
        <a className="vp-pergunta" href={href('/temas-que-mais-caem')}>
          <span className="vp-pergunta__icone"><Icone nome="grafico" tamanho={22} /></span>
          <span className="vp-pergunta__q">O que a prova mais cobra?</span>
          <strong>Temas que mais caem</strong>
          <small>O ranking das áreas e dos assuntos.</small>
        </a>
      </section>

      {(ativa || acessoPagoAteOFim) && metricas && (
        <section className="vp-ativo">
          <span className="vp-ativo__icone"><Icone nome="certo" tamanho={22} /></span>
          <div>
            <h2>{metricas.cancelar_ao_fim || acessoPagoAteOFim ? 'Acesso pago sem renovação automática' : `Seu plano ${metricas.plano} está ativo`}</h2>
            <p>{metricas.cancelar_ao_fim || acessoPagoAteOFim ? 'Não haverá nova cobrança desta assinatura. O período já pago não foi reembolsado.' : 'A próxima cobrança segue a periodicidade escolhida.'} Acesso ilimitado até {metricas.fim_periodo ? new Date(metricas.fim_periodo).toLocaleDateString('pt-BR') : 'o fim do período atual'}.</p>
            <div className="linha">
              <a className="botao" href={href('/conta/assinatura')}>Gerenciar renovação ou pedir reembolso</a>
            </div>
          </div>
        </section>
      )}

      <section className="vp-secao">
        <header className="vp-secao__cabeca">
          <p className="vp-sobre">Só para assinantes</p>
          <h2>Estude com direção, não no escuro</h2>
          <p>O acervo, os comentários e a revisão continuam abertos para todos. O plano soma o que responde às perguntas de quem está perto da prova: o que estudo hoje? o que mais cai? estou pronto? onde a turma erra?</p>
        </header>
        <div className="vp-recursos">
          {RECURSOS.map((r) => (
            <article key={r.titulo} className={'vp-recurso' + (r.largo ? ' vp-recurso--destaque' : '') + (r.destino === '/cronograma' ? ' vp-recurso--temas' : '')}>
              <span className="vp-recurso__icone"><Icone nome={r.icone} tamanho={24} /></span>
              <div className="vp-recurso__corpo">
                <h3>{r.titulo}</h3>
                <p>{r.texto}</p>
                <ul>{r.itens.map((item) => <li key={item}><Icone nome="certo" tamanho={15} />{item}</li>)}</ul>
                <a href={href(r.destino)}>Ver como funciona <Icone nome="direita" tamanho={14} /></a>
              </div>
              {r.destino === '/cronograma' && <RankingIlustrado />}
            </article>
          ))}
        </div>
      </section>

      <section className="vp-secao">
        <header className="vp-secao__cabeca">
          <p className="vp-sobre">Gratuito ou assinante</p>
          <h2>{limitesHabilitados ? 'O gratuito é generoso. O assinante vai além.' : 'O acervo é de todos. O assinante vai além.'}</h2>
          <p>{limitesHabilitados ? 'Um número limitado de questões por dia, renovado todos os dias, basta para muita gente manter a constância. O plano é para quem quer acelerar e saber exatamente onde está.' : 'Nesta fase, as questões não têm limite diário para ninguém. O plano libera os recursos exclusivos e garante o acesso ilimitado se o limite gratuito for ativado.'}</p>
        </header>
        <div className="vp-comparativo" role="table" aria-label="Comparação entre gratuito e assinante">
          <div className="vp-comparativo__linha vp-comparativo__cabeca" role="row">
            <span role="columnheader" />
            <span role="columnheader">Gratuito</span>
            <span role="columnheader" className="vp-comparativo__pro">Assinante</span>
          </div>
          {([
            ['Questões por dia', limitesHabilitados ? `Limitado (hoje, ${LIMITE_GRATIS_ATUAL}); renova todo dia` : 'Sem limite nesta fase', 'Sem limite'],
            ['Simulado de 50 ou 100 questões de uma vez', limitesHabilitados ? 'Em vários dias' : 'Na hora nesta fase', 'Na hora'],
            ['Simulado Nacional mensal, com posição e prontidão', false, true],
            ['Cronograma baseado no que mais cai', false, true],
            ['Ranking dos temas que mais caem', false, true],
            ['Como a turma respondeu e filtros pela turma', false, true],
            ['Liga da residência', false, true],
            ['Relatório do mês por e-mail', false, true],
            ['Comentário de todas as questões', true, true],
            ['Revisão espaçada, calendário e caderno de erros', true, true],
            ['Desempenho, ranking, emblemas e sequência', true, true],
          ] as const).map(([rotulo, livre, pro]) => (
            <div className="vp-comparativo__linha" role="row" key={rotulo}>
              <span role="cell" className="vp-comparativo__rotulo">{rotulo}</span>
              <span role="cell">{livre === true ? <Icone nome="certo" tamanho={18} /> : livre === false ? <span className="vp-traco">–</span> : livre}</span>
              <span role="cell" className="vp-comparativo__pro">{pro === true ? <Icone nome="certo" tamanho={18} /> : pro}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="vp-secao" id="planos">
        <header className="vp-secao__cabeca">
          <p className="vp-sobre">Planos</p>
          <h2>Escolha a periodicidade da assinatura</h2>
          <p>Os três planos dão acesso a tudo: questões sem limite e todos os recursos do assinante. Muda só a periodicidade e o valor total.</p>
        </header>

        <div className="vp-economia" aria-label="Custo por mês em cada plano">
          {PLANOS.map((p) => {
            const porMes = p.total / p.meses
            const desconto = Math.round((1 - porMes / MENSAL) * 100)
            return (
              <div key={p.id} className={'vp-economia__linha' + (p.destaque ? ' vp-economia__linha--destaque' : '')}>
                <span className="vp-economia__nome">{p.nome}</span>
                <span className="vp-economia__trilho"><span style={{ width: `${(porMes / MENSAL) * 100}%` }}><b>{real(porMes)}/mês</b></span></span>
                <span className="vp-economia__desconto">{desconto > 0 ? `−${desconto}%` : 'base'}</span>
              </div>
            )
          })}
        </div>

        <div className="vp-planos">
          {PLANOS.map((p) => {
            const porMes = p.total / p.meses
            const cheio = MENSAL * p.meses
            const economia = cheio - p.total
            return (
              <article key={p.id} className={'vp-plano' + (p.destaque ? ' vp-plano--destaque' : '')}>
                {p.destaque && <span className="vp-plano__fita">Melhor custo · metade do preço</span>}
                <h3>{p.nome}</h3>
                <p className="vp-plano__chamada">{p.chamada}</p>
                <p className="vp-plano__preco">
                  {p.meses > 1 && <span className="vp-plano__cheio">{real(cheio)}</span>}
                  <strong>{real(p.total)}</strong>
                  <small>{p.meses === 1 ? 'por mês' : p.meses === 6 ? 'a cada 6 meses' : 'por ano'}</small>
                </p>
                <p className="vp-plano__mensal">{p.meses === 1 ? 'Cancele quando quiser' : <>equivale a <b>{real(porMes)}</b> por mês</>}</p>
                {economia > 0 && <p className="vp-plano__economia">Você economiza {real(economia)}{p.meses === 12 ? `, menos de ${real(p.total / 365)} por dia` : ''}</p>}
                {!p.destaque && <p className="vp-plano__resumo"><Icone nome="certo" tamanho={16} /> Tudo o que o anual tem, do cronograma pelo que mais cai ao Simulado Nacional</p>}
                <p className="vp-plano__inclui">Inclui</p>
                <ul className="vp-plano__itens">
                  {INCLUI.map((item, i) => <li key={item} className={i === 0 ? 'vp-plano__item--destaque' : ''}><Icone nome={i === 0 ? 'rota' : 'certo'} tamanho={16} /> {item}</li>)}
                </ul>
                {!sessao
                  ? <a className="botao botao--principal botao--largo" href={href('/conta?modo=criar')}>Criar conta para assinar</a>
                  : <button className={'botao botao--largo' + (p.destaque ? ' botao--principal' : '')} type="button" disabled={!pagamentosHabilitados || ativa} onClick={() => escolher(p)}>{ativa ? 'Plano ativo' : pagamentosHabilitados ? `Assinar ${p.nome.toLowerCase()}` : 'Em breve'}</button>}
              </article>
            )
          })}
        </div>
        {!pagamentosHabilitados && <p className="vp-aviso"><Icone nome="calendario" tamanho={16} /> As assinaturas abrem em breve. Até lá, o acervo, os comentários e a revisão continuam disponíveis no gratuito.</p>}
        {mensagem && <p role="status" className="vp-aviso">{mensagem}</p>}
        <p className="vp-letras">No cartão, renovação automática na periodicidade escolhida. No Pix, pagamento único pelo período completo, sem renovação automática. O acesso começa após a confirmação do pagamento.</p>
        <div className="vp-pagamento-seguro" role="note">
          <Icone nome="certo" tamanho={22} />
          <p><strong>Pagamento protegido pelo Mercado Pago.</strong> Você conclui a compra no checkout externo do Mercado Pago: os dados do cartão são informados e processados lá, não no OrtoQuestões. No Pix, você recebe o QR Code e o código Copia e Cola no ambiente do Mercado Pago. Nós recebemos apenas o status e os identificadores necessários para acompanhar sua assinatura; não recebemos nem guardamos o número completo ou o código de segurança do cartão. <a href={href('/condicoes-assinatura')}>Leia as condições da assinatura.</a></p>
        </div>
      </section>

      <section className="vp-garantia">
        <div className="vp-garantia__selo" aria-hidden="true"><strong>7</strong><span>dias</span></div>
        <div>
          <h2>Cancelamento e garantia</h2>
          <ul>
            <li><strong>Garantia de 7 dias em cada cobrança.</strong> Solicite o reembolso integral pelo botão em Minha conta. Se o provedor não confirmar a solicitação, entre em contato conosco para atendimento manual; não alteramos o status antes da confirmação.</li>
            <li><strong>Cancele quando quiser.</strong> Sem atendimento, sem justificativa. O acesso segue até o fim do período já pago.</li>
            <li><strong>Seu histórico é seu.</strong> Cancelamento, vencimento ou falha de pagamento nunca apagam respostas, revisões ou desempenho. A conta só volta ao limite gratuito.</li>
          </ul>
        </div>
      </section>

      <section className="vp-secao vp-transparencia">
        <header className="vp-secao__cabeca">
          <p className="vp-sobre">Para onde vai o dinheiro</p>
          <h2>Um projeto independente, feito por quem vive a ortopedia</h2>
          <p>O OrtoQuestões não tem patrocinador. A assinatura paga o servidor, o banco de dados e o tempo de manter o acervo: questões novas, comentários revisados e correções. Assinar é o jeito mais direto de manter tudo isso no ar e gratuito para quem ainda não pode pagar.</p>
        </header>
        {sessao && respondidasConta > 0 && <p className="vp-voce">Você já respondeu <strong>{respondidasConta.toLocaleString('pt-BR')}</strong> questões por aqui{metricas?.sequencia ? <> e está numa sequência de <strong>{metricas.sequencia} {metricas.sequencia === 1 ? 'dia' : 'dias'}</strong></> : null}. Imagine esse ritmo sem teto.</p>}
      </section>

      <section className="vp-secao faq vp-faq">
        <header className="vp-secao__cabeca"><p className="vp-sobre">Dúvidas</p><h2>Perguntas frequentes</h2></header>
        <details><summary>Como funciona o limite do plano gratuito?</summary><p>{limitesHabilitados ? `O gratuito tem um número limitado de respostas novas por dia (hoje, ${LIMITE_GRATIS_ATUAL}), que se renova todos os dias à meia-noite, no horário de Brasília. O número pode mudar; a mudança é avisada no site.` : `O limite diário está desligado nesta fase, portanto o acesso gratuito também está sem limite de respostas. Se o limite for ativado futuramente, o patamar gratuito previsto é de ${LIMITE_GRATIS_ATUAL} respostas novas por dia.`} Comentários, revisões e desempenho continuam abertos.</p></details>
        <details><summary>Posso pagar com Pix?</summary><p>Sim, quando a opção estiver disponível no checkout. Você paga o valor integral do período escolhido em um único Pix. Não há renovação automática; ao terminar o período, faça uma nova compra se quiser continuar. A garantia de sete dias também vale para Pix.</p></details>
        <details><summary>Como funciona o cancelamento?</summary><p>Em Minha conta, você escolhe entre impedir a próxima renovação ou, dentro de sete dias da última cobrança, pedir reembolso integral. Impedir a renovação não reembolsa a cobrança atual: o acesso pago continua até o fim do período. Se o Mercado Pago confirmar o reembolso, o acesso pago termina e sua conta volta ao gratuito.</p></details>
        <details><summary>Se eu cancelar o semestral após três meses, recebo os três restantes?</summary><p>Após os sete dias para reembolso integral, não há devolução proporcional automática. Você mantém o acesso até completar os seis meses pagos, e a assinatura não renova. A mesma regra vale para o plano anual. Seus direitos previstos em lei permanecem preservados. Consulte as <a href={href('/condicoes-assinatura')}>condições da assinatura</a> antes de comprar.</p></details>
        <details><summary>Como funciona a garantia?</summary><p>Até 7 dias depois de cada cobrança aprovada, você pode pedir reembolso integral em Minha conta. Se a solicitação automática não for confirmada pelo Mercado Pago, use o canal de contato para atendimento manual. O acesso pago só é encerrado após confirmação do reembolso. Depois desse prazo não há reembolso proporcional por esta garantia.</p></details>
        <details><summary>O que acontece com meu histórico se eu cancelar?</summary><p>Nada. Respostas, revisões, favoritas, anotações e desempenho ficam guardados. Ao impedir a renovação, o acesso pago continua até o fim do período; após um reembolso confirmado, a conta volta ao limite gratuito.</p></details>
        <details><summary>O que o assinante tem a mais?</summary><p>Questões sem limite{limitesHabilitados ? '' : ' (nesta fase, o gratuito também não tem limite)'} e os recursos exclusivos: o cronograma até a prova baseado no que mais cai, o Simulado Nacional mensal com posição e relatório de prontidão, o ranking dos temas que mais caem, como a turma respondeu cada questão (com os filtros pela turma no Treinar), a liga da residência e o relatório do mês por e-mail. Revisões, calendário e comentários são iguais para todos.</p></details>
        <details><summary>Como o cronograma é montado?</summary><p>Você informa a data da prova, a intensidade (leve, firme ou completo) e os dias de folga. O cronograma divide as questões que faltam pelos dias até a prova, coloca primeiro as áreas e os assuntos que mais caem, dá mais espaço aos temas em que você está abaixo da média e reserva a última semana para a reta final. Todo dia ele se recalcula: se você atrasar, a meta sobe um pouco; se adiantar, alivia. Quem não assina pode ver a prévia do próprio cronograma antes de decidir.</p></details>
        <details><summary>Como funciona o Simulado Nacional?</summary><p>No começo de cada mês sai uma edição nova: a mesma prova, com 50 questões de TEOT e TARO e duas horas de tempo, para todos os assinantes. Você faz quando quiser dentro do mês, numa tentativa só. A correção sai na hora, com a sua posição entre quem entregou no tempo e o acerto por tema comparado à média.</p></details>
        <details><summary>Meus colegas precisam assinar para entrar na liga?</summary><p>Sim. A liga da residência é um recurso do assinante: quem cria e quem entra precisam do plano. Quem recebe o convite sem o plano vê o nome da liga e pode assinar para entrar.</p></details>
        <details><summary>Qual plano vale mais a pena?</summary><p>Se você está a mais de seis meses da prova, o anual sai pela metade do preço do mensal. Para uma reta final curta, o mensal ou o semestral resolvem sem compromisso longo.</p></details>
      </section>

      <Painel titulo={planoEscolhido ? `Revisar assinatura ${planoEscolhido.nome.toLowerCase()}` : 'Revisar assinatura'} aberto={planoEscolhido !== null} aoFechar={() => { if (!abrindoCheckout) definirPlanoEscolhido(null) }}>
        {planoEscolhido && <div className="empilha">
          {pixHabilitado && <fieldset className="empilha" disabled={abrindoCheckout || Boolean(pix)}>
            <legend>Como você prefere pagar?</legend>
            <label className="campo campo--checkbox"><input type="radio" name="meio-pagamento" checked={meioPagamento === 'cartao'} onChange={() => { definirMeioPagamento('cartao'); definirAceitouCondicoes(false) }} /> <span>Cartão — renovação automática</span></label>
            <label className="campo campo--checkbox"><input type="radio" name="meio-pagamento" checked={meioPagamento === 'pix'} onChange={() => { definirMeioPagamento('pix'); definirAceitouCondicoes(false) }} /> <span>Pix — pagamento único, sem renovação automática</span></label>
          </fieldset>}
          <p><strong>{planoEscolhido.nome}: {real(planoEscolhido.total)}</strong> {meioPagamento === 'pix' ? `em um único Pix por ${planoEscolhido.meses} mês(es) de acesso, sem renovação automática.` : `cobrados integralmente a cada ${planoEscolhido.meses} mês(es), com renovação automática até o cancelamento.`}</p>
          {meioPagamento === 'pix' && !pix && <label className="campo"><span>CPF do pagador</span><input inputMode="numeric" autoComplete="off" maxLength={14} value={cpf} onChange={evento => definirCpf(evento.target.value)} /><small>Enviado ao Mercado Pago para gerar a cobrança; não é salvo no seu perfil.</small></label>}
          {pix && <div className="empilha"><a className="botao botao--principal" href={pix.url} target="_blank" rel="noopener noreferrer">Abrir QR Code e Pix Copia e Cola</a><p>Validade: {new Date(pix.expira_em).toLocaleString('pt-BR')}. Aguarde aqui a confirmação do pagamento.</p></div>}
          <p>Nos primeiros sete dias após cada cobrança aprovada, você pode solicitar reembolso integral. Depois disso, cancelar interrompe as renovações e mantém o acesso até o fim do período pago, sem reembolso proporcional automático.</p>
          <p>O próximo passo abre o checkout hospedado pelo Mercado Pago. Você só paga se confirmar a compra lá; o OrtoQuestões não recebe dados completos do cartão.</p>
          <label className="campo campo--checkbox"><input type="checkbox" checked={aceitouCondicoes} onChange={evento => definirAceitouCondicoes(evento.target.checked)} /> <span>Li e aceito as <a href={href('/condicoes-assinatura')} target="_blank" rel="noopener noreferrer">Condições da Assinatura</a> (versão {VERSAO_CONDICOES_ASSINATURA}) e os <a href={href('/termos')} target="_blank" rel="noopener noreferrer">Termos de Uso</a> para este plano e este valor.</span></label>
          {mensagem && <p role="status" className="vp-aviso">{mensagem}</p>}
          <div className="linha linha--empilha-celular">
            <button className="botao botao--principal" type="button" disabled={!aceitouCondicoes || abrindoCheckout || Boolean(pix) || (meioPagamento === 'pix' && cpf.replace(/\D/g, '').length !== 11)} onClick={() => void confirmarCompra()}>{abrindoCheckout ? 'Preparando pagamento…' : meioPagamento === 'pix' ? 'Gerar Pix' : 'Continuar para Mercado Pago'}</button>
            <button className="botao" type="button" disabled={abrindoCheckout} onClick={() => definirPlanoEscolhido(null)}>Voltar aos planos</button>
          </div>
        </div>}
      </Painel>

      <section className="vp-final">
        <div>
          <h2>Chegue à prova sabendo onde você está</h2>
          <p>Simulado todo mês, plano do dia e a turma como referência. Comece hoje.</p>
        </div>
        <div className="linha linha--empilha-celular">
          <a className="botao botao--claro botao--grande" href="#planos" onClick={(e) => { e.preventDefault(); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) }}>Escolher meu plano</a>
          <a className="botao botao--vidro botao--grande" href={href('/treinar')}>Treinar agora</a>
        </div>
      </section>
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
