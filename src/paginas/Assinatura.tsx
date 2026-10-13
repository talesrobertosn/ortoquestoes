import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { lerRespondidas } from '../estado/sessao'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { Icone } from '../componentes/Icone'
import { IconePixel, type NomeIconePixel } from '../componentes/IconePixel'
import { Simbolo } from '../marca/Simbolo'
import { JanelaCentral } from '../componentes/JanelaCentral'
import { VERSAO_CONDICOES_ASSINATURA } from '../conta/termos'
import { eventoMeta } from '../conta/consentimento'
import { href } from '../util/rotas'
import { FLASHCARDS_NA_VENDA, recurso, LIMITE_GRATIS_ATUAL, ROTULO_SIMULADOS } from '../config'
import { MENSAL, PLANOS, real } from '../dados/planos'
import { AREAS, BASE_CONTAGEM } from '../dados/incidencia'
import { DATAS_PROVA } from '../estado/conquistas'
import { chaveDia } from '../estado/limiteDiario'
import '../estilos/paginas/Assinatura.css'

/**
 * Página de venda (refeita em 12/10/2026). Vende tempo e praticidade: o preço
 * aparece logo no topo, o cronograma é o centro da página e a garantia de 7
 * dias é explicada sem letra miúda. A compra (Pix, cartão, aceite das
 * condições e renovação antecipada do Pix) é a mesma de antes.
 */

type Plano = (typeof PLANOS)[number]
const [PLANO_MENSAL, PLANO_SEMESTRAL, PLANO_ANUAL] = PLANOS
/** Nos cartões, o anual fica no meio: é o que queremos que salte aos olhos. */
const ORDEM_PLANOS = [PLANO_MENSAL, PLANO_ANUAL, PLANO_SEMESTRAL]

const pagamentosHabilitados = import.meta.env.VITE_PAGAMENTOS_HABILITADOS === 'true'
const pixHabilitado = pagamentosHabilitados
const limitesHabilitados = import.meta.env.VITE_LIMITES_HABILITADOS === 'true'

interface MetricasConta { respostas_total: number; sequencia: number; plano: string | null; status_assinatura: string | null; fim_periodo: string | null; ultima_cobranca_em: string | null; cancelar_ao_fim: boolean }

/** Áreas contadas nas provas, da que mais cai para a que menos cai. */
const AREAS_CAEM = AREAS.flatMap((a) => (a.n ? [{ ...a, n: a.n }] : [])).sort((x, y) => y.n - x.n)

const porMes = (p: Plano) => p.total / p.meses
const porDia = (p: Plano) => p.total / (p.meses * 365 / 12)
const centavos = (v: number) => real(Math.ceil(v * 100) / 100)
const semMoeda = (v: number) => real(v).replace('R$', '').trim()
const numero = (n: number) => n.toLocaleString('pt-BR')
const periodo = (p: Plano) => p.meses === 1 ? 'por mês' : p.meses === 6 ? 'a cada 6 meses' : 'por ano'

/** As três coisas que a assinatura faz, em vez de uma lista de recursos. */
const GANHOS: Array<{ icone: NomeIconePixel; titulo: string; texto: string; itens: string[] }> = [
  { icone: 'planos', titulo: 'Um plano que pensa por você', texto: 'Você abre o site e sabe o que fazer hoje. O cronograma segue o que mais cai e se ajusta quando a rotina aperta.', itens: ['Diagnóstico no primeiro dia', 'Alerta quando um tema fica esquecido', 'Mapa de risco: o que mais cai e você mais erra', 'Reta final de duas semanas com resumão'] },
  { icone: 'simulado', titulo: 'Estude o que a banca cobra', texto: `Contamos ${numero(BASE_CONTAGEM)} questões das provas oficiais por assunto. E os ${ROTULO_SIMULADOS} trazem questões novas no padrão da banca, feitas por engenharia reversa das provas.`, itens: ['Temas que mais caem, área por área', 'Resumão: o que cai, em uma frase', `${ROTULO_SIMULADOS} no meio de cada sessão`] },
  { icone: 'turma', titulo: 'Saiba onde você está', texto: 'Compare com quem estuda para a mesma prova e chegue sabendo o que falta.', itens: ['Como a turma respondeu cada alternativa', 'Simulado Nacional todo mês, com sua posição', 'Liga da residência e relatório do mês'] },
]

export function Assinatura() {
  const { sessao } = usarConta()
  const [metricas, definirMetricas] = useState<MetricasConta | null>(null)
  const [mensagem, definirMensagem] = useState<string | null>(null)
  const [planoEscolhido, definirPlanoEscolhido] = useState<Plano | null>(null)
  const [aceitouCondicoes, definirAceitouCondicoes] = useState(false)
  const [abrindoCheckout, definirAbrindoCheckout] = useState(false)
  const [meioPagamento, definirMeioPagamento] = useState<'cartao' | 'pix'>(pixHabilitado ? 'pix' : 'cartao')
  const [cpf, definirCpf] = useState('')
  const [pix, definirPix] = useState<{ url: string; pedido_id: string; expira_em: string } | null>(null)
  const [vitrine, definirVitrine] = useState<Plano>(PLANO_ANUAL)
  const [barraVisivel, definirBarraVisivel] = useState(false)
  const heroi = useRef<HTMLElement>(null)
  const locais = useMemo(() => Object.values(lerRespondidas()), [])
  const nome = String(sessao?.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0] ?? ''

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

  // A barra com o preço aparece quando o topo sai da tela: o botão de assinar nunca fica longe.
  useEffect(() => {
    const alvo = heroi.current
    if (!alvo || typeof IntersectionObserver === 'undefined') return
    const observador = new IntersectionObserver(([e]) => definirBarraVisivel(!e.isIntersecting), { rootMargin: '-80px 0px 0px 0px' })
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [metricas])

  function escolher(plano: Plano) {
    if (!pagamentosHabilitados || !sessao) return
    definirPlanoEscolhido(plano)
    if (renovarPix) definirMeioPagamento('pix')
    definirPix(null)
    definirCpf('')
    definirAceitouCondicoes(false)
    definirMensagem(null)
  }
  /** Botões de compra da página: sem conta, cria a conta e volta para cá. */
  function comprar(plano: Plano) {
    if (!sessao) { location.assign(href('/conta?modo=criar&voltar=%2Fassinatura')); return }
    if (!pagamentosHabilitados) { irPara('planos'); return }
    escolher(plano)
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
  const rotuloComprar = (p: Plano) => !sessao ? 'Criar conta e assinar' : renovarPix ? `Renovar no Pix: ${p.nome.toLowerCase()}` : ativa ? 'Plano ativo' : pagamentosHabilitados ? `Assinar o ${p.nome.toLowerCase()}` : 'Em breve'

  return (
    <div className="vd">
      {!comAcessoPago && <section className="vd-heroi" ref={heroi} aria-labelledby="vd-titulo">
        <div className="vd-heroi__topo">
          <p className="vd-selo"><Simbolo tamanho={16} variante="traco" /> Plano do assinante</p>
          <h1 id="vd-titulo">{nome ? `${nome}, você` : 'Você'} estuda. <em>O que estudar hoje, a gente decide.</em></h1>
        </div>
        <div className="vd-heroi__texto">
          <p className="vd-heroi__lide">
            Você diz a data da prova. O Orto Questões monta a meta de cada dia pelo que mais cai no TEOT e no TARO, ajusta quando a rotina aperta e fecha com duas semanas de reta final.
          </p>
          <ul className="vd-confianca" aria-label="Garantias">
            <li><Icone nome="certo" tamanho={16} /> 7 dias de garantia: reembolso pelo botão</li>
            <li><Icone nome="certo" tamanho={16} /> Sem falar com ninguém para cancelar</li>
            <li><IconePix /> Pix ou cartão</li>
          </ul>
        </div>

        <div className="vd-preco" aria-label="Preço">
          <div className="vd-preco__abas" role="group" aria-label="Escolha o plano">
            {PLANOS.map((p) => <button key={p.id} type="button" aria-pressed={vitrine.id === p.id} onClick={() => definirVitrine(p)}>{p.nome}{p.destaque && <i>-50%</i>}</button>)}
          </div>
          <p className="vd-preco__valor"><small>R$</small><strong>{semMoeda(porMes(vitrine))}</strong><small>/mês</small></p>
          <p className="vd-preco__total">{vitrine.meses === 1 ? 'cobrado todo mês, sem fidelidade' : <>{real(vitrine.total)} {periodo(vitrine)} · de <s>{real(MENSAL * vitrine.meses)}</s></>}</p>
          <p className="vd-preco__almoco">
            <IconePixel nome="planos" tamanho={34} />
            <span><strong>Menos que um almoço.</strong> {real(porMes(vitrine))} garantem 30 dias de estudo com cronograma, ou {centavos(porDia(vitrine))} por dia.</span>
          </p>
          <button type="button" className="botao botao--grande vd-botao-ouro" disabled={Boolean(sessao) && pagamentosHabilitados && ativa && !renovarPix} onClick={() => comprar(vitrine)}>{rotuloComprar(vitrine)}</button>
          <a className="vd-preco__comparar" href="#planos" onClick={(e) => { e.preventDefault(); irPara('planos') }}>Comparar os 3 planos <Icone nome="baixo" tamanho={14} /></a>
        </div>
      </section>}

      {(ativa || acessoPagoAteOFim) && metricas && (
        <section className="vd-ativo">
          <span className="vd-ativo__icone"><Icone nome="certo" tamanho={22} /></span>
          <div>
            <h2>{metricas.cancelar_ao_fim || acessoPagoAteOFim ? 'Acesso pago sem renovação automática' : `Seu plano ${metricas.plano} está ativo`}</h2>
            <p>{metricas.cancelar_ao_fim || acessoPagoAteOFim ? 'Não haverá nova cobrança desta assinatura. O período já pago não foi reembolsado.' : 'A próxima cobrança segue a periodicidade escolhida.'} Acesso ilimitado até {metricas.fim_periodo ? new Date(metricas.fim_periodo).toLocaleDateString('pt-BR') : 'o fim do período atual'}.</p>
            <div className="linha">
              <a className="botao botao--principal" href={href('/cronograma')}>Abrir o cronograma</a>
              <a className="botao" href={href('/conta/assinatura')}>Gerenciar renovação ou pedir reembolso</a>
            </div>
            {renovarPix && <p className="vd-ativo__renovar"><strong>Faltam {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}. Renove agora pelo Pix sem perder nada:</strong> os dias que restam continuam valendo e o novo período começa em {fimAtualTexto}, quando o atual termina. <a href="#planos">Escolher o plano</a></p>}
          </div>
        </section>
      )}

      {/* 2. O que você ganha: três ideias, não onze. */}
      <section className="vd-secao" aria-labelledby="vd-titulo-ganha">
        <header className="vd-cabeca">
          <p className="vd-sobre">{comAcessoPago ? 'Seu plano inclui' : 'O que a assinatura faz por você'}</p>
          <h2 id="vd-titulo-ganha">Três coisas que economizam <em>meses de estudo</em></h2>
        </header>
        <div className="vd-ganhos">
          {GANHOS.map((g, i) => (
            <article key={g.titulo} className={'vd-cartao vd-ganho' + (i === 0 ? ' vd-ganho--estrela' : '')}>
              <span className="vd-ganho__num">{i + 1}</span>
              <IconePixel nome={g.icone} tamanho={48} />
              <h3>{g.titulo}</h3>
              <p>{g.texto}</p>
              <ul>{g.itens.map((item) => <li key={item}><Icone nome="certo" tamanho={14} /> {item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>

      {/* Cripta do Residente (pronta; aparece com VITE_FLASHCARDS_VENDA=1, docs/flashcards/VENDAS.md). */}
      {FLASHCARDS_NA_VENDA && <Suspense fallback={null}><CartaoCriptaVenda variante="venda" limites={limitesHabilitados} /></Suspense>}

      {/* 3. O cronograma na prática. */}
      <PreviaCronograma conta={Boolean(sessao)} assinante={comAcessoPago} />

      {/* 4. Grátis × assinante: uma tabela só. */}
      {!comAcessoPago && <section className="vd-secao" aria-labelledby="vd-titulo-compara">
        <header className="vd-cabeca">
          <p className="vd-sobre">Gratuito ou assinante</p>
          <h2 id="vd-titulo-compara">{limitesHabilitados ? 'O gratuito é generoso. O assinante vai além.' : 'O acervo é de todos. O assinante vai além.'}</h2>
          <p>Questões, comentários e ferramentas de estudo continuam abertos. A assinatura soma o plano até a prova, o que cai e a turma.</p>
        </header>
        <div className="vd-compara vd-cartao" role="table" aria-label="Comparação entre gratuito e assinante">
          <div className="vd-compara__linha vd-compara__cabeca" role="row">
            <span role="columnheader" />
            <span role="columnheader">Gratuito</span>
            <span role="columnheader" className="vd-compara__pro">Assinante</span>
          </div>
          {([
            ['Questões oficiais comentadas, alternativa por alternativa', true, true],
            [`${ROTULO_SIMULADOS}, por engenharia reversa das provas`, true, true],
            ['Revisão espaçada, caderno de erros, desempenho e ranking', true, true],
            ['Questões por dia', limitesHabilitados ? `${LIMITE_GRATIS_ATUAL} a cada 24 horas` : 'Sem limite nesta fase', 'Sem limite'],
            ...(FLASHCARDS_NA_VENDA ? [['Flashcards por dia (beta)', limitesHabilitados ? '10 a cada 24 horas' : 'Sem limite nesta fase', 'Sem limite'] as const] : []),
            ['Cronograma até a prova, com diagnóstico, alertas e reta final', false, true],
            ['Resumão: o que cai, em uma frase por assunto', false, true],
            ['Temas que mais caem, área por área', false, true],
            ['Como a turma respondeu e treino pelas que a turma mais erra', false, true],
            ['Simulado Nacional todo mês, com sua posição', false, true],
            ['Liga da residência e relatório do mês', false, true],
          ] as const).map(([rotulo, livre, pro]) => (
            <div className="vd-compara__linha" role="row" key={rotulo}>
              <span role="cell" className="vd-compara__rotulo">{rotulo}</span>
              <span role="cell">{livre === false ? <span className="vd-traco">–</span> : livre === true ? <Icone nome="certo" tamanho={18} /> : livre}</span>
              <span role="cell" className="vd-compara__pro">{pro === true ? <Icone nome="certo" tamanho={18} /> : pro}</span>
            </div>
          ))}
        </div>
      </section>}

      {/* 5. Planos, pagamento e garantia, juntos. */}
      {(!ativa || renovarPix) && <section className="vd-secao vd-planos-secao" id="planos" aria-labelledby="vd-titulo-planos">
        <header className="vd-cabeca">
          <p className="vd-sobre">Planos</p>
          <h2 id="vd-titulo-planos">Os três liberam tudo. <em>Muda só como você paga.</em></h2>
          <p>Quanto mais longo, menor o preço por dia. Pix ou cartão, em qualquer plano.</p>
          {!limitesHabilitados && <p className="vd-nota">O acesso gratuito está sem limite diário nesta fase. O plano libera os recursos exclusivos e garante questões sem limite se o limite for ligado.</p>}
        </header>

        <div className="vd-planos">
          {ORDEM_PLANOS.map((p) => {
            const cheio = MENSAL * p.meses
            const desconto = Math.round((1 - porMes(p) / MENSAL) * 100)
            return (
              <article key={p.id} className={'vd-plano' + (p.destaque ? ' vd-plano--destaque' : '')}>
                {p.destaque && <span className="vd-plano__fita">Melhor custo-benefício · metade do preço</span>}
                <header className="vd-plano__topo">
                  <h3>{p.nome}</h3>
                  {desconto > 0 && <span className="vd-plano__desconto">-{desconto}%</span>}
                </header>
                <p className="vd-plano__chamada">{p.chamada}</p>
                <p className="vd-plano__mes"><small>R$</small><strong>{semMoeda(porMes(p))}</strong><small>/mês</small></p>
                <p className="vd-plano__total">{p.meses === 1 ? 'cobrado todo mês, sem fidelidade' : <><b>{real(p.total)}</b> {periodo(p)} · de <s>{real(cheio)}</s></>}</p>
                <p className="vd-plano__dia"><Icone nome="relogio" tamanho={14} /> {centavos(porDia(p))} por dia de estudo</p>
                {!sessao
                  ? <a className={'botao botao--largo vd-plano__cta' + (p.destaque ? ' vd-botao-ouro' : '')} href={href('/conta?modo=criar&voltar=%2Fassinatura')}>Criar conta para assinar</a>
                  : <button className={'botao botao--largo vd-plano__cta' + (p.destaque ? ' vd-botao-ouro' : '')} type="button" disabled={!pagamentosHabilitados || (ativa && !renovarPix)} onClick={() => escolher(p)}>{rotuloComprar(p)}</button>}
              </article>
            )
          })}
        </div>
        {!pagamentosHabilitados && <p className="vd-aviso"><Icone nome="calendario" tamanho={16} /> As assinaturas abrem em breve. Até lá, o acervo, os comentários e a revisão continuam disponíveis no gratuito.</p>}
        {mensagem && !planoEscolhido && <p role="status" className="vd-aviso">{mensagem}</p>}

        <div className="vd-condicoes">
          <div className="vd-condicao">
            <span className="vd-condicao__icone vd-condicao__icone--pix"><IconePix tamanho={22} /></span>
            <div><strong>Pix</strong><p>Um pagamento pelo período inteiro, liberado assim que cai. Não renova sozinho; nos 7 dias finais dá para renovar sem perder dias.</p></div>
          </div>
          <div className="vd-condicao">
            <span className="vd-condicao__icone"><IconeCartao tamanho={22} /></span>
            <div><strong>Cartão</strong><p>Renova sozinho para você não ficar sem acesso na reta final. Desliga com um botão. Os dados do cartão ficam no Mercado Pago.</p></div>
          </div>
          <div className="vd-condicao vd-condicao--garantia">
            <span className="vd-condicao__selo" aria-hidden="true"><strong>7</strong>dias</span>
            <div><strong>Garantia sem conversa</strong><p>Até 7 dias depois de cada cobrança, o reembolso integral é pedido por um botão em Minha conta. Sem e-mail, sem justificar.</p></div>
          </div>
        </div>
        {sessao && respondidasConta > 0 && !comAcessoPago && <p className="vd-voce"><IconePixel nome="desempenho" tamanho={32} /> <span>Você já respondeu <strong>{numero(respondidasConta)}</strong> questões por aqui{metricas?.sequencia ? <> e está numa sequência de <strong>{metricas.sequencia} {metricas.sequencia === 1 ? 'dia' : 'dias'}</strong></> : null}. Imagine esse ritmo com um plano por trás.</span></p>}
      </section>}

      {/* 6. Dúvidas: as que realmente decidem a compra. */}
      <section className="vd-secao vd-faq" aria-labelledby="vd-titulo-faq">
        <header className="vd-cabeca"><p className="vd-sobre">Dúvidas</p><h2 id="vd-titulo-faq">Perguntas frequentes</h2></header>
        <div className="vd-faq__lista">
          <details><summary>Quanto custa, de verdade?</summary><p>Mensal: {real(PLANO_MENSAL.total)} por mês. Semestral: {real(PLANO_SEMESTRAL.total)} a cada 6 meses ({real(porMes(PLANO_SEMESTRAL))} por mês). Anual: {real(PLANO_ANUAL.total)} por ano, o que dá {real(porMes(PLANO_ANUAL))} por mês e {centavos(porDia(PLANO_ANUAL))} por dia. Não há taxa de adesão nem cobrança escondida; os três planos liberam exatamente os mesmos recursos. Se a prova está a mais de seis meses, o anual sai pela metade do preço do mensal.</p></details>
          <details><summary>Como funciona a garantia de 7 dias?</summary><p>Até 7 dias depois de cada cobrança aprovada, você pede o reembolso integral pelo botão em Minha conta, sem precisar falar com ninguém nem justificar. Se o Mercado Pago não confirmar a solicitação automática, use o canal de contato do site para atendimento manual. O acesso pago só é encerrado depois que o reembolso é confirmado.</p></details>
          <details><summary>Pix ou cartão: qual a diferença?</summary><p>No Pix você paga o período inteiro de uma vez e o acesso é liberado assim que o Mercado Pago confirma; ele não renova sozinho, e a partir de 7 dias antes do fim a página libera a renovação sem perder os dias que faltam (avisamos por e-mail 3 dias antes). O CPF é pedido só para gerar o Pix e não fica salvo. No cartão, a renovação é automática na periodicidade escolhida e você desliga quando quiser; o Orto Questões não recebe os dados do cartão.</p></details>
          <details><summary>Preciso falar com alguém para cancelar? E o meu histórico?</summary><p>Não. Desligar a renovação e pedir o reembolso dentro da garantia são botões em Minha conta. Depois dos 7 dias, não há devolução proporcional automática: você mantém o acesso até o fim do período pago e a assinatura não renova (seus direitos previstos em lei continuam preservados; veja as <a href={href('/condicoes-assinatura')}>condições da assinatura</a>). Respostas, revisões, anotações e desempenho nunca são apagados.</p></details>
          <details><summary>Como o cronograma é montado?</summary><p>Você informa a data da prova, a intensidade e os dias de folga. Um diagnóstico de 30 questões mostra onde você está mais fraco. O cronograma divide as questões pelos dias, começa pelas áreas e assuntos que mais caem (pela contagem das provas oficiais), dá mais espaço aos seus temas fracos e mistura de 2 a 6 {ROTULO_SIMULADOS} por sessão. As duas últimas semanas são a reta final: revisão forte e depois o modo prova, com simulado, os erros que importam e o resumão. Todo dia ele se recalcula e avisa quando um tema fica esquecido.</p></details>
          <details><summary>O que são os {ROTULO_SIMULADOS}?</summary><p>Questões inéditas, escritas pelo Orto Questões por engenharia reversa das provas: estudamos o estilo, o nível e o que a banca repete, e escrevemos questões novas no mesmo padrão a partir da bibliografia, inclusive para provas cujo conteúdo não é público, como a de cirurgia da mão e o Fellowship de Quadril. Não são questões oficiais nem cópia de prova sigilosa; trazem aviso na tela e comentário completo com a citação do livro.</p></details>
          <details><summary>Como funciona o limite do plano gratuito?</summary><p>{limitesHabilitados ? `O gratuito tem um número limitado de respostas novas (hoje, ${LIMITE_GRATIS_ATUAL}) a cada 24 horas. O relógio começa na primeira questão respondida e, 24 horas depois, a cota volta inteira; o site mostra quanto falta.` : `O limite diário está desligado nesta fase, portanto o acesso gratuito também está sem limite de respostas. Se o limite for ativado, o patamar gratuito previsto é de ${LIMITE_GRATIS_ATUAL} respostas novas a cada 24 horas.`} Comentários, revisões e desempenho continuam abertos.</p></details>
        </div>
      </section>

      {!comAcessoPago && <section className="vd-final">
        <img className="vd-final__guerreiro" src={recurso('ranking/guerreiro.png')} alt="" width={68} height={74} draggable={false} />
        <div>
          <h2>Chegue à prova sabendo o que fez e o que falta.</h2>
          <p>{real(porMes(PLANO_ANUAL))} por mês no anual. Se não for para você, 7 dias e um botão.</p>
        </div>
        <button type="button" className="botao botao--grande vd-botao-ouro" disabled={Boolean(sessao) && pagamentosHabilitados && ativa && !renovarPix} onClick={() => comprar(PLANO_ANUAL)}>{rotuloComprar(PLANO_ANUAL)}</button>
      </section>}

      {!comAcessoPago && <div className={'vd-barra' + (barraVisivel && !planoEscolhido ? ' vd-barra--visivel' : '')} aria-hidden={!barraVisivel}>
        <span className="vd-barra__preco"><strong>{real(porMes(vitrine))}</strong>/mês · {vitrine.nome.toLowerCase()}</span>
        <span className="vd-barra__garantia">7 dias de garantia</span>
        <button type="button" className="botao vd-botao-ouro" tabIndex={barraVisivel ? 0 : -1} disabled={Boolean(sessao) && pagamentosHabilitados && ativa && !renovarPix} onClick={() => comprar(vitrine)}>{sessao ? 'Assinar' : 'Criar conta'}</button>
      </div>}

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
    </div>
  )
}

function irPara(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ------------------------------------------------------------------------- */
/* Prévia do cronograma: o centro da página.                                  */
/* ------------------------------------------------------------------------- */

/** Ritmos para escolher, com o tempo aproximado (cerca de 1,5 minuto por questão). */
const RITMOS: Array<[number, string]> = [[15, '≈ 25 min'], [25, '≈ 40 min'], [40, '≈ 1h'], [60, '≈ 1h30']]
const FOLGAS: Array<[number, string]> = [[0, 'Todo dia'], [1, '1 folga'], [2, '2 folgas']]
/** Áreas mostradas uma a uma na prévia; as demais viram uma linha só. */
const FASES_VISIVEIS = 4

function proximaProva(): string {
  const hoje = chaveDia()
  return DATAS_PROVA.find((d) => d > hoje) ?? chaveDia(Date.now() + 182 * 864e5)
}
const diasAte = (data: string) => Math.max(0, Math.round((Date.parse(`${data}T12:00:00Z`) - Date.parse(`${chaveDia()}T12:00:00Z`)) / 864e5))

/**
 * Uma conta de verdade, com a contagem do que cai: escolha o ritmo, a data e
 * as folgas, e veja as fases do cronograma (as áreas na ordem da prova, com as
 * semanas de cada uma) e a reta final. O cronograma real usa também o
 * histórico da pessoa; aqui é a mesma lógica, sem o histórico.
 */
function PreviaCronograma({ conta, assinante }: { conta: boolean; assinante: boolean }) {
  const [ritmo, definirRitmo] = useState(25)
  const [folgas, definirFolgas] = useState(1)
  const [prova, definirProva] = useState(proximaProva)
  const corridos = diasAte(prova)
  const semanas = Math.max(1, Math.ceil(corridos / 7))
  // Reta final: duas semanas (revisão forte e modo prova) com 6 semanas ou mais; uma com 3 a 5.
  const reta = semanas >= 6 ? 2 : semanas >= 3 ? 1 : 0
  const semanasEstudo = Math.max(1, semanas - reta)
  const diasEstudo = Math.round(corridos * (7 - folgas) / 7)
  const total = ritmo * diasEstudo
  const minutos = Math.round(ritmo * 1.5)
  const dataCurta = new Date(`${prova}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '')

  // Fases: as áreas em ordem de incidência, com semanas proporcionais ao peso de cada uma.
  const fases = useMemo(() => {
    let acumulado = 0
    return AREAS_CAEM.map((a) => {
      const fatia = a.n / BASE_CONTAGEM
      const de = Math.floor(acumulado * semanasEstudo) + 1
      acumulado += fatia
      const ate = Math.max(de, Math.ceil(acumulado * semanasEstudo))
      return { area: a, fatia, de: Math.min(de, semanasEstudo), ate: Math.min(ate, semanasEstudo), questoes: Math.round(total * (1 - (reta ? (7 * reta) / Math.max(7 * reta, corridos) : 0)) * fatia) }
    })
  }, [semanasEstudo, total, reta, corridos])
  const semanaTexto = (de: number, ate: number) => de === ate ? `Semana ${de}` : `Semanas ${de} a ${ate}`

  return (
    <section className="vd-cronograma" aria-labelledby="vd-titulo-cronograma">
      <div className="vd-cronograma__cabeca">
        <p className="vd-selo vd-selo--ouro"><Icone nome="rota" tamanho={15} /> O carro-chefe do plano</p>
        <h2 id="vd-titulo-cronograma">Seu cronograma, <em>montado em 10 segundos.</em></h2>
        <p>Mexa nos botões: a conta abaixo usa a mesma ordem do cronograma de verdade, a das áreas que mais caem na prova.</p>
      </div>

      <div className="vd-cronograma__painel">
        <div className="vd-controles">
          <fieldset>
            <legend>Questões por dia</legend>
            <div className="vd-chips">
              {RITMOS.map(([n, tempo]) => <button key={n} type="button" aria-pressed={ritmo === n} onClick={() => definirRitmo(n)}><strong>{n}</strong><small>{tempo}</small></button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Dias de folga por semana</legend>
            <div className="vd-chips vd-chips--texto">
              {FOLGAS.map(([n, rotulo]) => <button key={n} type="button" aria-pressed={folgas === n} onClick={() => definirFolgas(n)}>{rotulo}</button>)}
            </div>
          </fieldset>
          <label className="vd-data"><span>Data da prova</span><input type="date" value={prova} min={chaveDia()} onChange={(e) => e.target.value && definirProva(e.target.value)} /></label>

          <dl className="vd-placar">
            <div><dt>Até a prova</dt><dd>{numero(corridos)}<small> dias</small></dd></div>
            <div><dt>Por dia</dt><dd>{minutos}<small> min</small></dd></div>
            <div className="vd-placar__grande"><dt>Questões feitas até {dataCurta}</dt><dd>{numero(total)}</dd></div>
          </dl>
        </div>

        <ol className="vd-fases" aria-label="Fases do cronograma">
          {fases.slice(0, FASES_VISIVEIS).map((f, i) => {
            const aberta = assinante || i < 3
            const focos = f.area.focos.filter((x) => x.nivel >= 3).slice(0, 2)
            return (
              <li key={f.area.id} className={'vd-fase' + (aberta ? '' : ' vd-fase--fechada')} style={{ ['--fatia' as string]: `${Math.max(6, Math.round((f.fatia / fases[0].fatia) * 100))}%` }}>
                <span className="vd-fase__num">{i + 1}</span>
                <div className="vd-fase__corpo">
                  <p className="vd-fase__topo"><strong>{f.area.nome}</strong><small>{semanaTexto(f.de, f.ate)} · {(f.fatia * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da prova</small></p>
                  <span className="vd-fase__barra" aria-hidden="true"><i /></span>
                  {focos.length > 0 && <p className="vd-fase__focos">{aberta ? <>Começa por: {focos.map((x) => x.nome).join(' · ')}</> : <><Icone nome="cadeado" tamanho={12} /> Assuntos desta fase no plano</>}</p>}
                </div>
                <span className="vd-fase__qtd">{numero(f.questoes)}<small> questões</small></span>
              </li>
            )
          })}
          {fases.length > FASES_VISIVEIS && (() => {
            const resto = fases.slice(FASES_VISIVEIS)
            return <li className="vd-fase vd-fase--resto">
              <span className="vd-fase__num">+{resto.length}</span>
              <div className="vd-fase__corpo"><p className="vd-fase__topo"><strong>Mais {resto.length} áreas, na ordem do que cai</strong><small>{semanaTexto(resto[0].de, resto[resto.length - 1].ate)}</small></p><p className="vd-fase__focos">{resto.map((f) => f.area.nome).join(' · ')}</p></div>
              <span className="vd-fase__qtd">{numero(resto.reduce((s, f) => s + f.questoes, 0))}<small> questões</small></span>
            </li>
          })()}
          {reta > 1 && <li className="vd-fase vd-fase--reta">
            <span className="vd-fase__num"><Icone nome="reiniciar" tamanho={16} /></span>
            <div className="vd-fase__corpo"><p className="vd-fase__topo"><strong>Reta final · revisão forte</strong><small>Semana {semanas - 1} · penúltima semana</small></p><p className="vd-fase__focos">Seus erros, dúvidas e os assuntos que mais caem, uma fatia da prova por dia. Sem conteúdo novo.</p></div>
          </li>}
          {reta > 0 && <li className="vd-fase vd-fase--reta">
            <span className="vd-fase__num"><Icone nome="bandeira" tamanho={16} /></span>
            <div className="vd-fase__corpo"><p className="vd-fase__topo"><strong>Reta final · modo prova</strong><small>Semana {semanas} · última semana</small></p><p className="vd-fase__focos">Simulado cronometrado no horário da prova, os erros que importam e o resumão. Véspera leve.</p></div>
          </li>}
        </ol>
      </div>

      <div className="vd-cronograma__rodape">
        <p><Icone nome="reiniciar" tamanho={16} /> No cronograma de verdade, um diagnóstico calibra o plano no primeiro dia, temas em que você está abaixo da média ganham mais espaço e a meta se recalcula todo dia. O painel mostra a sua sequência, avisa quando um tema fica esquecido e aponta o que mais cai e você mais erra.</p>
        <a className="botao botao--grande vd-botao-ouro" href={href(conta ? '/cronograma' : '/conta?modo=criar&voltar=%2Fcronograma')}>{assinante ? 'Abrir meu cronograma' : conta ? 'Ver a prévia com o meu histórico' : 'Criar conta grátis e ver o meu'}</a>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------- */
/* Como a turma respondeu: uma questão para testar na própria página.         */
/* ------------------------------------------------------------------------- */

function IconePix({ tamanho = 16 }: { tamanho?: number }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M12 2.8 21.2 12 12 21.2 2.8 12z" /><path d="M7.6 9.2 10.4 12l-2.8 2.8M16.4 9.2 13.6 12l2.8 2.8" /></svg>
}

function IconeCartao({ tamanho = 16 }: { tamanho?: number }) {
  return <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></svg>
}

const CartaoCriptaVenda = lazy(() => import('../componentes/CartaoCripta').then(({ CartaoCripta }) => ({ default: CartaoCripta })))
