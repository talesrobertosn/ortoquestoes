import { useEffect, useMemo, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { lerRespondidas } from '../estado/sessao'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { usarIndice } from '../dados/usarIndice'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { Painel } from '../componentes/Painel'
import { VERSAO_CONDICOES_ASSINATURA } from '../conta/termos'
import { href } from '../util/rotas'

const MENSAL = 39.9
const PLANOS = [
  { id: 'mensal', nome: 'Mensal', total: 39.9, meses: 1, destaque: false, chamada: 'Para testar o ritmo sem compromisso longo.' },
  { id: 'semestral', nome: 'Semestral', total: 179.9, meses: 6, destaque: false, chamada: 'Um ciclo inteiro de preparação para a prova.' },
  { id: 'anual', nome: 'Anual', total: 239.9, meses: 12, destaque: true, chamada: 'O ano todo de estudo pela metade do preço.' },
] as const
const pagamentosHabilitados = import.meta.env.VITE_PAGAMENTOS_HABILITADOS === 'true'
const limitesHabilitados = import.meta.env.VITE_LIMITES_HABILITADOS === 'true'

interface MetricasConta { respostas_total: number; sequencia: number; plano: string | null; status_assinatura: string | null; fim_periodo: string | null; ultima_cobranca_em: string | null; cancelar_ao_fim: boolean }

const real = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const MOTIVOS: { icone: NomeIcone; titulo: string; texto: string }[] = [
  { icone: 'alvo', titulo: 'A prova cobra padrão, não sorte', texto: 'Quem resolve muitas questões aprende como a banca pensa: as classificações que voltam, as pegadinhas que se repetem, o jeito de perguntar a conduta.' },
  { icone: 'calendario', titulo: 'Revisão no momento certo', texto: 'Cada resposta alimenta a sua revisão espaçada. Quanto mais você responde, mais precisa fica a fila do que precisa voltar.' },
  { icone: 'livro', titulo: 'Cada erro vira uma aula curta', texto: 'Comentário com conceito-chave, a correta e o porquê de cada errada, baseado na bibliografia de referência da ortopedia.' },
]

export function Assinatura() {
  const { sessao } = usarConta()
  const { indice } = usarIndice()
  const [metricas, definirMetricas] = useState<MetricasConta | null>(null)
  const [mensagem, definirMensagem] = useState<string | null>(null)
  const [planoEscolhido, definirPlanoEscolhido] = useState<(typeof PLANOS)[number] | null>(null)
  const [aceitouCondicoes, definirAceitouCondicoes] = useState(false)
  const [abrindoCheckout, definirAbrindoCheckout] = useState(false)
  const locais = useMemo(() => Object.values(lerRespondidas()), [])
  const nome = String(sessao?.user.user_metadata?.nome ?? '').trim()
  const comentadas = useMemo(() => (indice?.questoes ?? []).filter((q) => q.c === 1).length, [indice])

  useEffect(() => {
    if (!sessao) return
    chamarRpc<MetricasConta[]>('obter_estado_conta', {}).then((r) => definirMetricas(r[0] ?? null)).catch(() => definirMetricas(null))
  }, [sessao])

  function escolher(plano: (typeof PLANOS)[number]) {
    if (!pagamentosHabilitados || !sessao) return
    definirPlanoEscolhido(plano)
    definirAceitouCondicoes(false)
    definirMensagem(null)
  }
  async function confirmarCompra() {
    if (!planoEscolhido || !aceitouCondicoes || !pagamentosHabilitados || !sessao || abrindoCheckout) return
    definirAbrindoCheckout(true)
    definirMensagem('Preparando checkout seguro…')
    try {
      const r = await chamarFuncao<{ url: string }>('criar-checkout', {
        plano: planoEscolhido.id,
        aceite_termos_versao: VERSAO_CONDICOES_ASSINATURA,
        aceite_confirmado: true,
      })
      location.assign(r.url)
    } catch (erro) {
      definirMensagem(erro instanceof Error ? erro.message : 'Não foi possível abrir o checkout.')
      definirAbrindoCheckout(false)
    }
  }
  async function gerenciar(acao: 'cancelar' | 'reembolsar') {
    if (!window.confirm(acao === 'reembolsar' ? 'Solicitar reembolso integral e cancelar cobranças futuras?' : 'Cancelar cobranças futuras?')) return
    definirMensagem('Processando…')
    try { await chamarFuncao('gerenciar-plano', { acao }); definirMensagem('Solicitação concluída. Atualize a página para ver o novo estado.') }
    catch (erro) { definirMensagem(erro instanceof Error ? erro.message : 'Não foi possível concluir.') }
  }

  const respondidasConta = metricas?.respostas_total ?? locais.length
  const ativa = metricas?.status_assinatura === 'ativa'

  return (
    <div className="empilha-2 vp">
      <section className="vp-heroi">
        <div className="vp-heroi__texto">
          <p className="vp-heroi__selo"><Icone nome="raio" tamanho={16} /> Plano ilimitado</p>
          <h1>Questões sem limite. Preparação sem pausa.</h1>
          <p className="vp-heroi__lide">
            {nome ? `${nome}, o` : 'O'} {limitesHabilitados
              ? 'plano gratuito libera 20 questões por dia. Com o plano ilimitado, você responde quantas quiser e ainda mantém o OrtoQuestões no ar.'
              : 'acesso gratuito está sem limite diário nesta fase. A assinatura é opcional, apoia o projeto e mantém o acesso ilimitado caso o limite gratuito seja ativado.'}
          </p>
          <div className="vp-heroi__acoes">
            <a className="botao botao--claro botao--grande" href="#planos" onClick={(e) => { e.preventDefault(); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) }}>Ver os planos</a>
            <a className="botao botao--vidro botao--grande" href={href(sessao ? '/treinar' : '/conta?modo=criar')}>{sessao ? 'Continuar no gratuito' : 'Começar grátis'}</a>
          </div>
          <p className="vp-heroi__garantia"><Icone nome="certo" tamanho={16} /> Garantia de 7 dias · cancelamento por botão · seu histórico nunca é apagado</p>
        </div>
        <div className="vp-contador" aria-hidden="true">
          <div className="vp-contador__cartao vp-contador__cartao--livre">
            <span>Gratuito hoje</span>
            <strong>{limitesHabilitados ? '20 / 20' : 'Sem limite'}</strong>
            <span className="vp-contador__barra"><span style={{ width: '100%' }} /></span>
            <small>{limitesHabilitados ? 'Próximas questões amanhã' : 'Acesso gratuito nesta fase'}</small>
          </div>
          <div className="vp-contador__cartao vp-contador__cartao--pro">
            <span>Plano ilimitado</span>
            <strong>∞</strong>
            <small>Continue agora, no seu ritmo</small>
          </div>
        </div>
      </section>

      <section className="vp-prova" aria-label="O acervo">
        <div><strong>{indice ? indice.total.toLocaleString('pt-BR') : '3.800+'}</strong><span>questões de prova</span></div>
        <div><strong>{comentadas ? comentadas.toLocaleString('pt-BR') : '3.800+'}</strong><span>com comentário</span></div>
        <div><strong>{indice ? indice.temas.length : 11}</strong><span>temas da especialidade</span></div>
        <div><strong>TEOT · TARO</strong><span>e ENARE R4</span></div>
      </section>

      {ativa && metricas && (
        <section className="vp-ativo">
          <span className="vp-ativo__icone"><Icone nome="certo" tamanho={22} /></span>
          <div>
            <h2>Seu plano {metricas.plano} está ativo</h2>
            <p>{metricas.cancelar_ao_fim ? 'O plano já está cancelado e não terá nova cobrança.' : 'A próxima cobrança segue a periodicidade escolhida.'} Acesso ilimitado até pelo menos {metricas.fim_periodo ? new Date(metricas.fim_periodo).toLocaleDateString('pt-BR') : 'o fim do período atual'}.</p>
            <div className="linha">
              <button className="botao" type="button" onClick={() => gerenciar('cancelar')}>Cancelar plano</button>
              {metricas.ultima_cobranca_em && Date.now() - new Date(metricas.ultima_cobranca_em).getTime() <= 7 * 864e5 && <button className="botao" type="button" onClick={() => gerenciar('reembolsar')}>Usar garantia de 7 dias</button>}
            </div>
          </div>
        </section>
      )}

      <section className="vp-secao">
        <header className="vp-secao__cabeca">
          <p className="vp-sobre">Por que resolver mais questões</p>
          <h2>Aprovação se constrói na repetição com método</h2>
        </header>
        <div className="vp-motivos">
          {MOTIVOS.map((m) => (
            <article key={m.titulo} className="vp-motivo">
              <span className="vp-motivo__icone"><Icone nome={m.icone} tamanho={22} /></span>
              <h3>{m.titulo}</h3>
              <p>{m.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="vp-secao">
        <header className="vp-secao__cabeca">
          <p className="vp-sobre">Gratuito ou ilimitado</p>
          <h2>{limitesHabilitados ? 'O gratuito é generoso. O ilimitado não tem teto.' : 'Acesso livre agora. Apoio para manter o projeto.'}</h2>
          <p>{limitesHabilitados ? 'Vinte questões por dia bastam para muita gente manter a constância. O plano é para quem quer acelerar.' : 'Nesta fase, o acesso gratuito não tem limite diário. A assinatura é uma forma opcional de apoiar o OrtoQuestões e assegurar acesso ilimitado se o limite gratuito for ativado.'}</p>
        </header>
        <div className="vp-comparativo" role="table" aria-label="Comparação entre gratuito e ilimitado">
          <div className="vp-comparativo__linha vp-comparativo__cabeca" role="row">
            <span role="columnheader" />
            <span role="columnheader">Gratuito</span>
            <span role="columnheader" className="vp-comparativo__pro">Ilimitado</span>
          </div>
          {([
            ['Questões por dia', limitesHabilitados ? '20 (as próximas liberam no dia seguinte)' : 'Sem limite nesta fase', 'Sem limite'],
            ['Simulado de 50 ou 100 questões de uma vez', limitesHabilitados ? 'Em vários dias' : 'Na hora nesta fase', 'Na hora'],
            ['Comentário de todas as questões', true, true],
            ['Revisão espaçada e calendário', true, true],
            ['Desempenho por período, tema e confiança', true, true],
            ['Ranking, emblemas e sequência', true, true],
            ['Ajuda a manter o projeto no ar', false, true],
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
          <p>O mesmo acesso ilimitado nos três planos. A renovação e o valor total variam conforme a periodicidade escolhida.</p>
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
                <ul className="vp-plano__itens">
                  <li><Icone nome="certo" tamanho={16} /> Questões ilimitadas todos os dias</li>
                  <li><Icone nome="certo" tamanho={16} /> Tudo o que o gratuito já tem</li>
                  <li><Icone nome="certo" tamanho={16} /> Garantia de 7 dias em cada cobrança</li>
                </ul>
                {!sessao
                  ? <a className="botao botao--principal botao--largo" href={href('/conta?modo=criar')}>Criar conta para assinar</a>
                  : <button className={'botao botao--largo' + (p.destaque ? ' botao--principal' : '')} type="button" disabled={!pagamentosHabilitados || ativa} onClick={() => escolher(p)}>{ativa ? 'Plano ativo' : pagamentosHabilitados ? `Assinar ${p.nome.toLowerCase()}` : 'Em breve'}</button>}
              </article>
            )
          })}
        </div>
        {!pagamentosHabilitados && <p className="vp-aviso"><Icone nome="calendario" tamanho={16} /> As assinaturas abrem em breve. Até lá, todo o acervo continua disponível no plano gratuito.</p>}
        {mensagem && <p role="status" className="vp-aviso">{mensagem}</p>}
        <p className="vp-letras">Renovação automática na periodicidade escolhida, com valor e data da próxima cobrança mostrados no checkout antes de confirmar. Cancelamento por botão, sem justificativa.</p>
        <div className="vp-pagamento-seguro" role="note">
          <Icone nome="certo" tamanho={22} />
          <p><strong>Pagamento protegido pelo Mercado Pago.</strong> Você conclui a compra no checkout externo do Mercado Pago: os dados do cartão são informados e processados lá, não no OrtoQuestões. Nós recebemos apenas o status e os identificadores necessários para acompanhar sua assinatura; não recebemos nem guardamos o número completo ou o código de segurança do cartão. <a href={href('/condicoes-assinatura')}>Leia as condições da assinatura.</a></p>
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
        <details><summary>Como funciona o limite do plano gratuito?</summary><p>{limitesHabilitados ? 'Você pode registrar até 20 respostas novas por dia. As próximas voltam no dia seguinte.' : 'O limite diário está desligado nesta fase, portanto o acesso gratuito também está sem limite de respostas. Se o limite for ativado futuramente, o patamar gratuito previsto é de 20 respostas novas por dia.'} Comentários, revisões e desempenho continuam abertos.</p></details>
        <details><summary>Como funciona o cancelamento?</summary><p>Por botão em Minha conta, sem justificativa. Fora dos sete dias para reembolso integral, ele impede novas renovações e mantém o acesso até o fim do período já pago.</p></details>
        <details><summary>Se eu cancelar o semestral após três meses, recebo os três restantes?</summary><p>Após os sete dias para reembolso integral, não há devolução proporcional automática. Você mantém o acesso até completar os seis meses pagos, e a assinatura não renova. A mesma regra vale para o plano anual. Seus direitos previstos em lei permanecem preservados. Consulte as <a href={href('/condicoes-assinatura')}>condições da assinatura</a> antes de comprar.</p></details>
        <details><summary>Como funciona a garantia?</summary><p>Até 7 dias depois de cada cobrança aprovada, você pode pedir reembolso integral em Minha conta. Se a solicitação automática não for confirmada pelo Mercado Pago, use o canal de contato para atendimento manual. O acesso pago só é encerrado após confirmação do reembolso. Depois desse prazo não há reembolso proporcional por esta garantia.</p></details>
        <details><summary>O que acontece com meu histórico se eu cancelar?</summary><p>Nada. Respostas, revisões, favoritas, anotações e desempenho ficam guardados. A conta apenas volta ao limite gratuito.</p></details>
        <details><summary>O plano muda as revisões ou os comentários?</summary><p>Não. Revisões, calendário e comentários são iguais no gratuito e no ilimitado. {limitesHabilitados ? 'O plano remove o limite diário de respostas.' : 'Nesta fase, o acesso gratuito também não tem limite diário.'}</p></details>
        <details><summary>Qual plano vale mais a pena?</summary><p>Se você está a mais de seis meses da prova, o anual sai pela metade do preço do mensal. Para uma reta final curta, o mensal ou o semestral resolvem sem compromisso longo.</p></details>
      </section>

      <Painel titulo={planoEscolhido ? `Revisar assinatura ${planoEscolhido.nome.toLowerCase()}` : 'Revisar assinatura'} aberto={planoEscolhido !== null} aoFechar={() => { if (!abrindoCheckout) definirPlanoEscolhido(null) }}>
        {planoEscolhido && <div className="empilha">
          <p><strong>{planoEscolhido.nome}: {real(planoEscolhido.total)}</strong> cobrados integralmente {planoEscolhido.meses === 1 ? 'a cada mês' : `a cada ${planoEscolhido.meses} meses`}, com renovação automática até o cancelamento.</p>
          <p>Nos primeiros sete dias após cada cobrança aprovada, você pode solicitar reembolso integral. Depois disso, cancelar interrompe as renovações e mantém o acesso até o fim do período pago, sem reembolso proporcional automático.</p>
          <p>O próximo passo abre o checkout hospedado pelo Mercado Pago. Você só paga se confirmar a compra lá; o OrtoQuestões não recebe dados completos do cartão.</p>
          <label className="campo campo--checkbox"><input type="checkbox" checked={aceitouCondicoes} onChange={evento => definirAceitouCondicoes(evento.target.checked)} /> <span>Li e aceito as <a href={href('/condicoes-assinatura')} target="_blank" rel="noopener noreferrer">Condições da Assinatura</a> (versão {VERSAO_CONDICOES_ASSINATURA}) para este plano e este valor.</span></label>
          {mensagem && <p role="status" className="vp-aviso">{mensagem}</p>}
          <div className="linha linha--empilha-celular">
            <button className="botao botao--principal" type="button" disabled={!aceitouCondicoes || abrindoCheckout} onClick={() => void confirmarCompra()}>{abrindoCheckout ? 'Abrindo checkout…' : 'Continuar para Mercado Pago'}</button>
            <button className="botao" type="button" disabled={abrindoCheckout} onClick={() => definirPlanoEscolhido(null)}>Voltar aos planos</button>
          </div>
        </div>}
      </Painel>

      <section className="vp-final">
        <div>
          <h2>A próxima questão pode ser a que cai na prova</h2>
          <p>Comece no gratuito hoje. Quando quiser acelerar, o ilimitado está aqui.</p>
        </div>
        <div className="linha linha--empilha-celular">
          <a className="botao botao--claro botao--grande" href="#planos" onClick={(e) => { e.preventDefault(); document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' }) }}>Escolher meu plano</a>
          <a className="botao botao--vidro botao--grande" href={href('/treinar')}>Treinar agora</a>
        </div>
      </section>
    </div>
  )
}
