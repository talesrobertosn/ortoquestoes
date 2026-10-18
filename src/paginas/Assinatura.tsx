import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { lerRespondidas } from '../estado/sessao'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { Simbolo } from '../marca/Simbolo'
import { JanelaCentral } from '../componentes/JanelaCentral'
import { VERSAO_CONDICOES_ASSINATURA } from '../conta/termos'
import { eventoMeta } from '../conta/consentimento'
import { href, navegar } from '../util/rotas'
import { linkConta } from '../conta/passagem'
import { FLASHCARDS_NA_VENDA, recurso, ROTULO_SIMULADOS, LIMITES_HABILITADOS, fraseGratis } from '../config'
import { MENSAL, real, ECONOMIA_ANUAL } from '../dados/planos'
import { diasAte } from '../dados/ritmos'
import { DATAS_PROVA } from '../estado/conquistas'
import { chaveDia } from '../estado/limiteDiario'
import { usarAssinante } from '../conta/plano'
import {
  AREAS_QUE_CAEM, ASSUNTOS_QUE_MAIS_CAEM, PLANOS_PIPOCA, PLANO_ANUAL, PLANO_MENSAL, PLANO_SEMESTRAL, centavos, dadosDaPessoa, degrauAnual,
  elogioHeroi, fatiaDasDuasPrimeiras, numero, pct, porDia, porMes, saudacaoAssinante, tituloHeroi, type Plano,
} from '../dados/vendas'
import { CartoesPlanos } from '../componentes/vendas/CartoesPlanos'
import { PreviaCronograma } from '../componentes/vendas/PreviaCronograma'
import { IconePix, IconeCartao } from '../componentes/vendas/IconesPagamento'
import { usarRevelar } from '../componentes/vendas/usarRevelar'
import { SecaoBiblioteca } from '../componentes/vendas/SecaoBiblioteca'
import '../estilos/paginas/Assinatura.css'

/**
 * Página de vendas (refeita em 16/10/2026; estratégia em docs/marketing/PAGINA-DE-VENDAS-16-10.md).
 * Ordem: topo com o nome da pessoa e os três planos lado a lado (pipoca pequena,
 * média e grande), o problema do tempo, o cronograma em 3 passos com a prévia
 * interativa (o presente da página), o que mais cai, os simulados por engenharia
 * reversa, os flashcards, os outros recursos, gratuito × assinante, a garantia
 * com o botão explicado, as dúvidas e os três planos de novo. A compra (Pix,
 * cartão, aceite das condições e renovação antecipada do Pix) é a mesma de antes.
 */

const pagamentosHabilitados = import.meta.env.VITE_PAGAMENTOS_HABILITADOS === 'true'
const pixHabilitado = pagamentosHabilitados
// Limite diário do gratuito (VITE_LIMITES_HABILITADOS): o valor e os textos vêm de config.ts (fraseGratis).
const limitesHabilitados = LIMITES_HABILITADOS

interface MetricasConta { respostas_total: number; sequencia: number; plano: string | null; status_assinatura: string | null; fim_periodo: string | null; ultima_cobranca_em: string | null; cancelar_ao_fim: boolean }
interface PixGerado { url: string; pedido_id: string; expira_em: string; qr_code?: string; qr_code_base64?: string }

/** A próxima prova teórica do TEOT cadastrada (estado/conquistas), para a contagem verdadeira de dias. */
function proximoTeot(): { dias: number; data: string } | null {
  const hoje = chaveDia()
  const data = DATAS_PROVA.find((d) => d > hoje)
  if (!data) return null
  return { dias: diasAte(data), data: new Date(`${data}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' }) }
}

export function Assinatura({ consulta }: { consulta?: URLSearchParams }) {
  const { sessao } = usarConta()
  const [metricas, definirMetricas] = useState<MetricasConta | null>(null)
  // Até a consulta da conta voltar, vale o que ficou guardado (conta/plano.ts):
  // quem assina não vê a página de vendas piscar antes de "Minha assinatura".
  const [consultou, definirConsultou] = useState(false)
  const assinanteGuardado = usarAssinante(sessao)
  const [mensagem, definirMensagem] = useState<string | null>(null)
  const [planoEscolhido, definirPlanoEscolhido] = useState<Plano | null>(null)
  const [aceitouCondicoes, definirAceitouCondicoes] = useState(false)
  const [abrindoCheckout, definirAbrindoCheckout] = useState(false)
  const [meioPagamento, definirMeioPagamento] = useState<'cartao' | 'pix'>(pixHabilitado ? 'pix' : 'cartao')
  const [cpf, definirCpf] = useState('')
  const [pix, definirPix] = useState<PixGerado | null>(null)
  const [copiado, definirCopiado] = useState(false)
  const [barraVisivel, definirBarraVisivel] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const heroi = useRef<HTMLElement>(null)
  const locais = useMemo(() => lerRespondidas(), [])
  const teot = useMemo(proximoTeot, [])
  // ?plano= guarda o plano escolhido por quem criou a conta a partir desta página.
  const planoDaUrl = PLANOS_PIPOCA.find((p) => p.id === consulta?.get('plano')) ?? null
  const reabriu = useRef(false)

  // Falha na consulta não pode deixar "Carregando assinatura…" para sempre: mostra o
  // erro com "Tentar de novo" (o assinante guardado continua vendo a área dele).
  const [falhouConsulta, definirFalhouConsulta] = useState(false)
  const [tentativa, definirTentativa] = useState(0)
  useEffect(() => {
    if (!sessao) return
    definirFalhouConsulta(false)
    chamarRpc<MetricasConta[]>('obter_estado_conta', {}).then((r) => { definirMetricas(r[0] ?? null); definirConsultou(true) }).catch(() => { definirMetricas(null); definirFalhouConsulta(true) })
  }, [sessao, tentativa])

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
  }, [metricas, consultou, assinanteGuardado])

  function escolher(plano: Plano) {
    if (!pagamentosHabilitados || !sessao) return
    eventoMeta('AddToCart', { content_name: plano.id, currency: 'BRL', value: plano.total })
    definirPlanoEscolhido(plano)
    if (renovarPix) definirMeioPagamento('pix')
    definirPix(null)
    definirCpf('')
    definirAceitouCondicoes(false)
    definirMensagem(null)
  }
  /** Botões de compra fora dos cartões: sem conta, cria a conta e volta para cá, com o plano escolhido. */
  function comprar(plano: Plano) {
    if (!pagamentosHabilitados) return
    if (!sessao) { navegar(linkConta('criar', `/assinatura?plano=${plano.id}`)); return }
    escolher(plano)
  }
  async function confirmarCompra() {
    if (!planoEscolhido || !aceitouCondicoes || !pagamentosHabilitados || !sessao || abrindoCheckout) return
    definirAbrindoCheckout(true)
    definirMensagem('Preparando checkout seguro…')
    eventoMeta('InitiateCheckout', { content_name: planoEscolhido.id, currency: 'BRL', value: planoEscolhido.total, payment_type: meioPagamento })
    try {
      if (meioPagamento === 'pix') {
        const r = await chamarFuncao<PixGerado>('criar-pix', {
          plano: planoEscolhido.id, cpf, aceite_termos_versao: VERSAO_CONDICOES_ASSINATURA, aceite_confirmado: true,
        })
        definirCpf('')
        definirPix(r)
        definirCopiado(false)
        definirMensagem(null)
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
  async function copiarPix() {
    if (!pix?.qr_code) return
    try { await navigator.clipboard.writeText(pix.qr_code); definirCopiado(true) }
    catch { definirCopiado(false); definirMensagem('Não deu para copiar automaticamente. Toque e segure o código para copiar.') }
  }

  const ativa = Boolean(metricas?.status_assinatura === 'ativa' && (!metricas.fim_periodo || new Date(metricas.fim_periodo).getTime() > Date.now()))
  const acessoPagoAteOFim = Boolean(metricas?.status_assinatura === 'cancelada' && metricas.fim_periodo && new Date(metricas.fim_periodo).getTime() > Date.now())

  // Quem já tem acesso pago vê "Minha assinatura" no topo, e não a página de vendas.
  const comAcessoPago = consultou ? Boolean((ativa || acessoPagoAteOFim) && metricas) : assinanteGuardado
  // Pix (ativo, sem renovação automática) nos 7 dias finais: pode renovar já, e o
  // período novo começa quando o atual termina (o servidor soma os dias).
  const fimAtual = metricas?.fim_periodo ? Date.parse(metricas.fim_periodo) : NaN
  const renovarPix = pixHabilitado && ativa && Boolean(metricas?.cancelar_ao_fim) && Number.isFinite(fimAtual) && fimAtual - Date.now() <= 7 * 864e5
  const diasRestantes = renovarPix ? Math.max(1, Math.ceil((fimAtual - Date.now()) / 864e5)) : 0
  const fimAtualTexto = renovarPix ? new Date(fimAtual).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''
  // Pagamentos desligados: todo botão de compra mostra "Em breve" e fica desabilitado, com ou sem conta.
  const semCompra = !pagamentosHabilitados || (Boolean(sessao) && ativa && !renovarPix)
  const rotuloComprar = (p: Plano) => !pagamentosHabilitados ? 'Em breve' : !sessao ? 'Criar conta e assinar' : renovarPix ? `Renovar no Pix: ${p.nome.toLowerCase()}` : ativa ? 'Plano ativo' : `Assinar o ${p.nome.toLowerCase()}`
  const fimTexto = metricas?.fim_periodo ? new Date(metricas.fim_periodo).toLocaleDateString('pt-BR') : null
  const semRenovacao = Boolean(metricas?.cancelar_ao_fim || acessoPagoAteOFim)
  // A barra fixa só existe quando dá para comprar; fora da tela, sai também da leitura e do Tab.
  const barraNaTela = barraVisivel && !planoEscolhido
  const mostrarPlanos = !comAcessoPago || renovarPix || Boolean(metricas && !ativa)

  // Quem criou a conta a partir de um plano volta direto para o pagamento dele (uma vez só).
  useEffect(() => {
    if (reabriu.current || !planoDaUrl || !sessao || !consultou || comAcessoPago || !pagamentosHabilitados) return
    reabriu.current = true
    escolher(planoDaUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planoDaUrl, sessao, consultou, comAcessoPago])

  const pessoa = useMemo(() => sessao ? dadosDaPessoa(sessao.user.user_metadata, metricas?.respostas_total, metricas?.sequencia, locais) : null, [sessao, metricas, locais])
  const titulo = tituloHeroi(pessoa)
  const elogio = elogioHeroi(pessoa)
  const saudacao = saudacaoAssinante(pessoa)
  usarRevelar(raiz, comAcessoPago)

  return (
    <div className="vd" ref={raiz}>
      {!comAcessoPago && <section className={'vd-heroi' + (pessoa && pessoa.respondidas > 0 ? ' vd-heroi--pessoa' : '')} ref={heroi} aria-labelledby="vd-titulo">
        <div className="vd-heroi__texto">
          <p className="tr-heroi__selo">Planos do Orto Questões</p>
          <h1 id="vd-titulo">{titulo.linha1} <em>{titulo.linha2}</em></h1>
          <p className="vd-heroi__lide">
            {pessoa?.prova ? `Você diz a data do ${pessoa.prova}` : 'Você diz a data da prova'} e quanto tempo tem. O cronograma monta a lista de cada dia pelo que mais cai, e você só abre e faz: entre uma cirurgia e outra, no plantão ou à noite em casa.
          </p>
          {elogio && <p className="vd-heroi__elogio"><Icone nome="estrela" tamanho={15} /> {elogio}</p>}
        </div>
        <aside className="vd-heroi__lado" aria-label={pessoa && pessoa.respondidas > 0 ? 'Seu estudo até aqui' : 'Até a prova'}>
          {pessoa && pessoa.respondidas > 0
            ? <>
              <img src={recurso('pixel/simulado.png')} alt="" width={56} height={56} draggable={false} />
              <dl className="vd-ficha">
                <div className="vd-ficha__numero"><dt>Questões respondidas</dt><dd>{numero(pessoa.respondidas)}</dd></div>
                {pessoa.acerto !== null && <div className="vd-ficha__numero"><dt>Acerto</dt><dd>{pessoa.acerto}%</dd></div>}
                {/* O ponto forte já aparece no elogio; a ficha não repete (no máximo 3 observações por tela). */}
                {pessoa.areaForte && !elogio && <div><dt>Ponto forte</dt><dd>{pessoa.areaForte}</dd></div>}
                {(pessoa.prova || pessoa.etapa) && <div><dt>{pessoa.prova ? 'Prova' : 'Etapa'}</dt><dd>{[pessoa.prova, pessoa.etapa].filter(Boolean).join(' · ')}</dd></div>}
              </dl>
            </>
            : <>
              <img src={recurso('pixel/revisao.png')} alt="" width={56} height={56} draggable={false} />
              <p className="vd-contagem">{teot ? <><strong>{numero(teot.dias)}</strong> <span>dias até a prova teórica do TEOT, em {teot.data}</span></> : <span>O plano se ajusta a qualquer data de prova.</span>}</p>
            </>}
          {pessoa && pessoa.respondidas > 0 && teot && <p className="vd-heroi__prazo"><Icone nome="calendario" tamanho={14} /> Faltam {numero(teot.dias)} dias para o TEOT ({teot.data}).</p>}
        </aside>

        {mostrarPlanos && <div className="vd-heroi__planos" id="planos">
          <CartoesPlanos local="topo" conta={Boolean(sessao)} pagamentos={pagamentosHabilitados} semCompra={semCompra} rotulo={rotuloComprar} aoEscolher={escolher} />
          <ul className="vd-confianca" aria-label="Pagamento e garantia">
            <li className="vd-confianca__pix"><IconePix tamanho={16} /> <span><strong>Pix</strong> à vista, liberado assim que cai</span></li>
            <li><IconeCartao tamanho={16} /> <span><strong>Cartão</strong> com renovação que você desliga</span></li>
            <li><Icone nome="certo" tamanho={16} /> <span><strong>7 dias de garantia</strong>: reembolso por um botão</span></li>
          </ul>
          {!sessao && pagamentosHabilitados && <p className="vd-heroi__semconta">Ainda sem conta? O botão cria a sua, grátis, e volta direto para o pagamento do plano escolhido.</p>}
          {!pagamentosHabilitados && <p className="vd-aviso"><Icone nome="calendario" tamanho={16} /> As assinaturas abrem em breve. Até lá, o acervo, os comentários e a revisão continuam disponíveis no gratuito.</p>}
          {mensagem && !planoEscolhido && <p role="status" className="vd-aviso">{mensagem}</p>}
        </div>}
      </section>}

      {comAcessoPago && (
        <section className="vd-ativo" aria-labelledby="vd-titulo-minha">
          <div className="vd-ativo__texto">
            <p className="tr-heroi__selo">Assinante</p>
            <h1 id="vd-titulo-minha">Minha assinatura</h1>
            {saudacao && <p className="vd-ativo__ola">{saudacao}</p>}
            {!metricas ? (falhouConsulta
              ? <p role="alert">Não foi possível carregar os dados da assinatura agora. <button type="button" className="botao--vinculo" onClick={() => definirTentativa((n) => n + 1)}>Tentar de novo</button></p>
              : <p role="status">Carregando assinatura…</p>) : <>
            <h2>{semRenovacao ? 'Acesso pago sem renovação automática' : (metricas.plano ? `Seu plano ${metricas.plano} está ativo` : 'Sua assinatura está ativa')}</h2>
            <p>{semRenovacao ? 'Não haverá nova cobrança desta assinatura. O período já pago não foi reembolsado.' : 'A próxima cobrança segue a periodicidade escolhida.'} Acesso ilimitado até {fimTexto ?? 'o fim do período atual'}.</p>
            <dl className="vd-ativo__dados">
              <div><dt>Plano</dt><dd>{metricas.plano ? `Plano ${metricas.plano}` : 'Assinante'}</dd></div>
              <div><dt>{semRenovacao ? 'Término do acesso' : 'Próxima cobrança'}</dt><dd>{fimTexto ?? 'Não informada'}</dd></div>
              {metricas.ultima_cobranca_em && <div><dt>Última cobrança</dt><dd>{new Date(metricas.ultima_cobranca_em).toLocaleDateString('pt-BR')}</dd></div>}
            </dl>
            </>}
            <div className="linha">
              <a className="botao vd-botao-destaque" href={href('/cronograma')}>Abrir o cronograma <Icone nome="direita" tamanho={16} /></a>
              <a className="tr-heroi__link" href={href('/conta/assinatura')}>Gerenciar renovação ou pedir reembolso</a>
            </div>
            {metricas && renovarPix && <p className="vd-ativo__renovar"><strong>Faltam {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}. Renove agora pelo Pix sem perder nada:</strong> os dias que restam continuam valendo e o novo período começa em {fimAtualTexto}, quando o atual termina.</p>}
          </div>
          {metricas && (renovarPix || !ativa) && <div className="vd-ativo__planos" id="planos">
            <CartoesPlanos local="final" conta={Boolean(sessao)} pagamentos={pagamentosHabilitados} semCompra={semCompra} rotulo={rotuloComprar} aoEscolher={escolher} />
          </div>}
        </section>
      )}

      {/* 2. O problema do tempo e a promessa. */}
      {!comAcessoPago && <SecaoTempo />}

      {/* 3. O cronograma: como funciona, em 3 passos, e a prévia interativa. */}
      <SecaoCronograma conta={Boolean(sessao)} assinante={comAcessoPago} />

      {/* 4. O que mais cai. */}
      <SecaoTemas />

      {/* 4b. Biblioteca de resumos: aberta para todos, explicada por inteiro (16/10/2026). */}
      <SecaoBiblioteca />

      {/* 5. OrtoQuestões Simulados, por engenharia reversa. */}
      <SecaoSimulados />

      {/* 6. Flashcards (aparece com VITE_FLASHCARDS_VENDA=1, docs/flashcards/VENDAS.md). */}
      {FLASHCARDS_NA_VENDA && <SecaoFlashcards />}

      {/* 7. Os outros recursos do assinante. */}
      <SecaoRecursos servico={pessoa?.servico ?? null} />

      {/* 8. Gratuito × assinante. */}
      {!comAcessoPago && <section className="vd-secao" aria-labelledby="vd-titulo-compara">
        <header className="vd-cabeca" data-revelar>
          <p className="vd-sobre">Gratuito ou assinante</p>
          <h2 id="vd-titulo-compara">{fraseGratis('comparacaoTitulo')}</h2>
          <p>Questões, comentários e ferramentas de estudo continuam abertos para todo mundo. A assinatura soma o plano até a prova, o que mais cai e a turma.</p>
          {!limitesHabilitados && <p className="vd-nota">O acesso gratuito está sem limite diário nesta fase. O plano libera os recursos exclusivos e garante questões sem limite se o limite for ligado.</p>}
        </header>
        <div className="vd-compara" role="table" aria-label="Comparação entre gratuito e assinante" data-revelar>
          <div className="vd-compara__linha vd-compara__cabeca" role="row">
            <span role="columnheader"><span className="vd-invisivel">Recurso</span></span>
            <span role="columnheader">Gratuito</span>
            <span role="columnheader" className="vd-compara__pro">Assinante</span>
          </div>
          {([
            ['Questões oficiais comentadas, alternativa por alternativa', true, true],
            [`${ROTULO_SIMULADOS}, por engenharia reversa das provas`, true, true],
            ['Revisão espaçada, caderno de erros, desempenho e ranking', true, true],
            ['Questões por dia', fraseGratis('questoesPorDia'), 'Sem limite'],
            ...(FLASHCARDS_NA_VENDA ? [['Flashcards por dia (beta)', fraseGratis('flashcardsPorDia'), 'Sem limite'] as const] : []),
            ['Cronograma até a prova: a lista de cada dia, o que mais cai primeiro, dia de plantão e reta final', false, true],
            ['Temas que mais caem, área por área e assunto por assunto', false, true],
            ['Biblioteca de resumos e frases que caem', false, true],
            ['Como a turma respondeu e treino pelas que a turma mais erra', false, true],
            ['Simulado Nacional todo mês, com sua posição', false, true],
            ['Liga da residência e relatório do mês', false, true],
          ] as const).map(([rotulo, livre, pro]) => (
            <div className="vd-compara__linha" role="row" key={rotulo}>
              <span role="cell" className="vd-compara__rotulo">{rotulo}</span>
              <span role="cell">{livre === false ? <span className="vd-traco" aria-label="Não">–</span> : livre === true ? <span className="vd-sim" aria-label="Sim"><Icone nome="certo" tamanho={16} /></span> : livre}</span>
              <span role="cell" className="vd-compara__pro">{pro === true ? <span className="vd-sim vd-sim--pro" aria-label="Sim"><Icone nome="certo" tamanho={16} /></span> : pro}</span>
            </div>
          ))}
        </div>
      </section>}

      {/* 9. Garantia: o botão, com verdade. */}
      {!comAcessoPago && <SecaoGarantia />}

      {/* 10. Dúvidas. */}
      <section className="vd-secao vd-faq" aria-labelledby="vd-titulo-faq">
        <header className="vd-cabeca" data-revelar><p className="vd-sobre">Dúvidas</p><h2 id="vd-titulo-faq">Perguntas frequentes</h2><p>As respostas que decidem a compra, sem letra miúda. O texto completo está nas <a href={href('/condicoes-assinatura')}>Condições da Assinatura</a>.</p></header>
        <div className="vd-faq__lista" data-revelar>
          <details><summary>Qual plano vale mais a pena?</summary><p>Os três liberam exatamente os mesmos recursos; muda só quanto tempo você paga de uma vez. O mensal sai {real(PLANO_MENSAL.total)} por mês. O semestral, {real(PLANO_SEMESTRAL.total)} a cada 6 meses ({real(porMes(PLANO_SEMESTRAL))} por mês). O anual, {real(PLANO_ANUAL.total)} por ano, o que dá {real(porMes(PLANO_ANUAL))} por mês e {centavos(porDia(PLANO_ANUAL))} por dia: {ECONOMIA_ANUAL === 'metade do preço' ? 'metade do preço do mensal' : `${ECONOMIA_ANUAL} que o mensal`}. {degrauAnual().texto} Se a prova está a mais de seis meses ou você quer o ano todo de estudo, o anual é o que mais rende. Para uma reta final curta, o mensal resolve sem compromisso longo.</p></details>
          <details><summary>Posso pagar com Pix?</summary><p>Pode, em qualquer plano. Você escolhe o plano, informa o CPF de quem vai pagar (só para o Mercado Pago gerar o Pix; não fica salvo no seu perfil) e recebe o QR Code e o Pix Copia e Cola. É um pagamento único pelo período inteiro, sem renovação automática. O código vale por 24 horas; se não for pago, expira sem cobrança.</p></details>
          <details><summary>O acesso é liberado na hora?</summary><p>Sim, assim que o Mercado Pago confirma o pagamento. No Pix, a página fica conferindo sozinha e libera o acesso quando o pagamento cai, sem você precisar avisar ninguém. No cartão, o acesso começa com a aprovação da cobrança.</p></details>
          <details><summary>E no cartão? Renova sozinho?</summary><p>Renova na periodicidade escolhida (todo mês, a cada 6 meses ou todo ano), para você não ficar sem acesso na reta final. Desligar a renovação é um botão em Minha conta, a qualquer momento. Os dados do cartão são digitados no Mercado Pago; o Orto Questões não recebe nem guarda o número do cartão.</p></details>
          <details><summary>Como funciona a garantia de 7 dias?</summary><p>Até 7 dias depois de cada cobrança aprovada (inclusive renovações e Pix), você pede o reembolso integral pelo botão em Minha conta, sem precisar falar com ninguém nem justificar. O pedido vai para o Mercado Pago na hora e o site confirma com ele; o acesso pago só é encerrado depois que o reembolso é confirmado. Se o Mercado Pago não confirmar a solicitação automática, o pedido é atendido manualmente pelo suporte, valendo a data em que você pediu: é só usar o canal de <a href={href('/contato')}>contato</a> para atendimento manual.</p></details>
          <details><summary>Em quanto tempo o dinheiro volta?</summary><p>No Pix, o Mercado Pago devolve o valor para a conta de onde saiu o pagamento; como o Pix é instantâneo, costuma ser rápido, mas o prazo final é do Mercado Pago e do seu banco. No cartão, o valor é estornado e aparece na fatura conforme o prazo do emissor do cartão, muitas vezes na fatura seguinte. Em nenhum dos dois casos você precisa pedir de novo.</p></details>
          <details><summary>Preciso falar com alguém para cancelar? E o meu histórico?</summary><p>Não. Desligar a renovação e pedir o reembolso dentro da garantia são botões em Minha conta. Depois dos 7 dias, cancelar impede as próximas cobranças e você mantém o acesso até o fim do período pago, sem devolução proporcional automática (seus direitos previstos em lei continuam preservados; veja as <a href={href('/condicoes-assinatura')}>condições da assinatura</a>). Respostas, revisões, anotações e desempenho nunca são apagados.</p></details>
          <details><summary>Paguei no Pix. Posso renovar antes de acabar sem perder dias?</summary><p>Pode. O Pix não renova sozinho, por isso mandamos um aviso por e-mail alguns dias antes do fim. A partir de 7 dias antes do término, esta página libera a renovação pelo Pix: os dias que faltam continuam valendo e o novo período começa no dia em que o atual termina. Nada se perde por pagar antes.</p></details>
          <details><summary>Posso usar junto com o meu curso preparatório?</summary><p>Pode, e combina bem. O Orto Questões não é curso: é onde você treina com as questões das provas, comentadas, e segue um plano diário pelo que mais cai. Muita gente assiste às aulas de um lado e usa o cronograma para transformar o que estudou em questão feita, todo dia.</p></details>
          <details><summary>Serve para o TEOT e para o TARO? E para outras provas?</summary><p>Sim. O acervo traz as provas oficiais já aplicadas do TEOT, do TARO, do R4 do ENARE e do TECOC, comentadas, e o cronograma pode ser montado para a data da sua prova. Para provas cujo conteúdo não é público, como a de cirurgia da mão e o Fellowship de Quadril, há os {ROTULO_SIMULADOS}, escritos no padrão dessas bancas.</p></details>
          <details><summary>Como o cronograma é montado?</summary><p>Em quatro passos: a data da prova, quanto tempo você tem por dia, como é a sua semana (folgas e dias de plantão, que viram dias leves) e por onde começar. Um diagnóstico opcional de 30 questões mostra onde você está mais fraco. O plano passa três vezes pelo acervo: na 1ª passada, os assuntos de prioridade máxima de todas as áreas, pela contagem das provas oficiais; na 2ª, os de prioridade alta; na 3ª, o resto. Assim, se a rotina apertar, o que mais cai já foi visto. Cada área fica uns 3 dias em foco, com cerca de 30% de cada dia vindo de outra área para misturar, e entram {ROTULO_SIMULADOS} nas sessões. A cada duas semanas há um mini-simulado, e as duas últimas semanas são a reta final. Atrasou, a meta sobe no máximo 25%; numa semana difícil, dá para baixar para 10 questões por dia sem quebrar o plano.</p></details>
          <details><summary>O que são os {ROTULO_SIMULADOS}?</summary><p>Questões inéditas, escritas pelo Orto Questões por engenharia reversa das provas: estudamos o estilo, o nível e o que a banca repete, e escrevemos questões novas no mesmo padrão a partir da bibliografia. Não são questões oficiais nem cópia de prova sigilosa; trazem aviso na tela e comentário completo com a citação do livro.</p></details>
          <details><summary>Funciona no celular?</summary><p>Funciona no celular, no tablet e no computador, sem instalar nada, e você continua de onde parou. A conta fica aberta em um aparelho por vez; ao entrar em outro, o progresso vai junto.</p></details>
          <details><summary>Como funciona o limite do plano gratuito?</summary><p>{fraseGratis('perguntaPlanos')} Comentários, revisões e desempenho continuam abertos.</p></details>
        </div>
      </section>

      {/* 11. Os três planos de novo. */}
      {!comAcessoPago && mostrarPlanos && <section className="vd-final" aria-labelledby="vd-titulo-final">
        <div className="vd-final__cabeca" data-revelar>
          <img className="vd-final__guerreiro" src={recurso('ranking/guerreiro.png')} alt="" width={68} height={74} loading="lazy" decoding="async" draggable={false} />
          <div>
            <h2 id="vd-titulo-final">{pessoa?.nome ? `${pessoa.nome}, que tal` : 'Que tal'} deixar o próximo dia de estudo pronto?</h2>
            <p>Mensal, semestral ou anual: os três liberam tudo. Pix ou cartão, e 7 dias para desistir com um botão.</p>
          </div>
        </div>
        <CartoesPlanos local="final" conta={Boolean(sessao)} pagamentos={pagamentosHabilitados} semCompra={semCompra} rotulo={rotuloComprar} aoEscolher={escolher} />
        <p className="vd-final__gratis">Ainda não é a hora? Tudo bem. <a href={href(sessao ? '/treinar' : '/conta?modo=criar')}>{sessao ? 'Continue no gratuito' : 'Comece pelo gratuito'}</a>, as questões e os comentários continuam abertos.</p>
      </section>}

      {!comAcessoPago && pagamentosHabilitados && <div className={'vd-barra' + (barraNaTela ? ' vd-barra--visivel' : '')} aria-hidden={!barraNaTela}>
        <span className="vd-barra__preco"><strong>{real(porMes(PLANO_ANUAL))}</strong>/mês no anual</span>
        <span className="vd-barra__garantia"><IconePix tamanho={14} /> Pix ou cartão · 7 dias de garantia</span>
        <a className="botao vd-barra__ver" href="#planos" tabIndex={barraNaTela ? 0 : -1} onClick={(e) => { e.preventDefault(); irPara('planos') }}>Ver os 3 planos</a>
        <button type="button" className="botao vd-botao-destaque" tabIndex={barraNaTela ? 0 : -1} disabled={semCompra} onClick={() => comprar(PLANO_ANUAL)} data-funil="plano-anual-barra">Assinar o anual</button>
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
              <span className="ck__pix-icone"><IconePix tamanho={30} /></span>
              <h3>Seu Pix de {real(planoEscolhido.total)} está pronto</h3>
              {pix.qr_code_base64 && <img className="ck__qr" src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code do Pix" width={200} height={200} />}
              {pix.qr_code ? <>
                <p>Escaneie o QR Code no app do seu banco ou copie o código e cole em "Pix Copia e Cola".</p>
                <label className="ck__copia"><span>Pix Copia e Cola</span><input readOnly value={pix.qr_code} onFocus={(e) => e.currentTarget.select()} /></label>
                <button type="button" className="botao botao--principal botao--largo ck__cta" onClick={() => void copiarPix()}><Icone nome="copiar" tamanho={16} /> {copiado ? 'Código copiado' : 'Copiar código Pix'}</button>
                <a className="ck__abrir" href={pix.url} target="_blank" rel="noopener noreferrer">Abrir o Pix no Mercado Pago</a>
              </> : <>
                <p>Abra o QR Code ou copie o código no Mercado Pago. Assim que o pagamento cair, o acesso é liberado aqui automaticamente.</p>
                <a className="botao botao--principal botao--largo ck__cta" href={pix.url} target="_blank" rel="noopener noreferrer">Abrir QR Code e Pix Copia e Cola</a>
              </>}
              <p className="ck__aguardando" role="status"><span className="ck__girando" aria-hidden="true" /> Aguardando a confirmação · válido até {new Date(pix.expira_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
              <p className="ck__pix-nota">Pode deixar esta janela aberta: quando o Mercado Pago confirmar, o acesso é liberado aqui sozinho.</p>
            </div>
          ) : (
            <>
              <fieldset className="ck__meios" disabled={abrindoCheckout}>
                <legend>Como você prefere pagar?</legend>
                {pixHabilitado && <label className={'ck__meio' + (meioPagamento === 'pix' ? ' ck__meio--ativo' : '')}>
                  <input type="radio" name="meio-pagamento" checked={meioPagamento === 'pix'} onChange={() => { definirMeioPagamento('pix'); definirAceitouCondicoes(false) }} />
                  <span className="ck__meio-icone ck__meio-icone--pix"><IconePix tamanho={24} /></span>
                  <span className="ck__meio-texto"><strong>Pix <em className="ck__meio-selo">o mais prático</em></strong><small>Pagamento único de {real(planoEscolhido.total)}, liberado assim que cai. Sem renovação automática.</small></span>
                  <span className="ck__meio-marca" aria-hidden="true"><Icone nome="certo" tamanho={14} /></span>
                </label>}
                {!renovarPix && <label className={'ck__meio' + (meioPagamento === 'cartao' ? ' ck__meio--ativo' : '')}>
                  <input type="radio" name="meio-pagamento" checked={meioPagamento === 'cartao'} onChange={() => { definirMeioPagamento('cartao'); definirAceitouCondicoes(false) }} />
                  <span className="ck__meio-icone"><IconeCartao tamanho={24} /></span>
                  <span className="ck__meio-texto"><strong>Cartão de crédito</strong><small>Renovação automática a cada {planoEscolhido.meses === 1 ? 'mês' : `${planoEscolhido.meses} meses`}. Desliga com um botão quando quiser.</small></span>
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
          <p className="ck__seguro"><Icone nome="cadeado" tamanho={14} /> Pagamento seguro pelo Mercado Pago; o Orto Questões não recebe os dados do cartão. Até 7 dias depois da cobrança, o reembolso integral é um botão em Minha conta. Depois disso, cancelar interrompe as renovações e mantém o acesso até o fim do período pago.</p>
        </div>}
      </JanelaCentral>
    </div>
  )
}

function irPara(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/** Cabeçalho de seção: rótulo, título e texto, com a entrada por rolagem. */
function Cabeca({ id, sobre, titulo, children }: { id: string; sobre: string; titulo: ReactNode; children?: ReactNode }) {
  return (
    <header className="vd-cabeca" data-revelar>
      <p className="vd-sobre">{sobre}</p>
      <h2 id={id}>{titulo}</h2>
      {children}
    </header>
  )
}

/* ------------------------------------------------------------------------- */
/* 2. O tempo do residente.                                                   */
/* ------------------------------------------------------------------------- */

const MOMENTOS: Array<{ icone: NomeIcone; quando: string; texto: string }> = [
  { icone: 'relogio', quando: 'Entre uma cirurgia e outra', texto: 'Quinze minutos no conforto médico viram dez questões do assunto certo. Sem escolher filtro, sem pensar no que fazer.' },
  { icone: 'celular', quando: 'Entre pacientes no pronto-socorro', texto: 'Abre no celular, faz algumas, fecha. O site guarda onde você parou e o plano conta o que já foi feito.' },
  { icone: 'livro', quando: 'À noite, em casa', texto: 'Senta, faz a lista do dia e dorme sabendo que estudou o que importa. O que fica para amanhã já está marcado.' },
]

function SecaoTempo() {
  return (
    <section className="vd-secao vd-tempo" aria-labelledby="vd-titulo-tempo">
      <Cabeca id="vd-titulo-tempo" sobre="O que mais falta na residência" titulo={<>Não falta vontade. <em>Falta tempo.</em></>}>
        <p>Plantão, centro cirúrgico, ambulatório, enfermaria. Quando sobra meia hora, o pior é gastar dez minutos decidindo o que estudar. A assinatura existe para isso: um plano que pensa por você, para cada minuto livre virar a questão certa.</p>
      </Cabeca>
      <div className="vd-tempo__grade">
        <ol className="vd-momentos">
          {MOMENTOS.map((m) => (
            <li key={m.quando} className="vd-momento" data-revelar>
              <span className="vd-momento__icone"><Icone nome={m.icone} tamanho={20} /></span>
              <div><h3>{m.quando}</h3><p>{m.texto}</p></div>
            </li>
          ))}
        </ol>
        <div className="vd-promessa" data-revelar>
          <img src={recurso('pixel/turma.png')} alt="" width={72} height={72} loading="lazy" decoding="async" draggable={false} />
          <p className="vd-promessa__texto"><strong>A promessa é simples:</strong> você abre o site e o dia de hoje já está pronto. Faz, fecha, segue a vida. E, perto da prova, percebe que já passou pelo que mais cai mais de uma vez: o repertório vem do treino de todo dia.</p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------- */
/* 3. Cronograma.                                                             */
/* ------------------------------------------------------------------------- */

const PASSOS_CRONOGRAMA: Array<{ titulo: string; texto: string; itens: string[] }> = [
  { titulo: 'Você conta a sua rotina', texto: 'A data da prova, quanto tempo tem por dia e como é a sua semana. Dia de plantão vira dia leve. Um diagnóstico opcional mostra por onde começar.', itens: ['Quatro perguntas, uma vez só', 'Muda quando a rotina mudar'] },
  { titulo: 'Todo dia, a lista pronta', texto: 'O resumão do tema, as questões novas e as revisões, com o tempo de cada parte. O que mais cai vem primeiro, em todas as áreas, e as áreas se alternam para fixar.', itens: ['Hoje, amanhã e a semana na tela', 'Questões novas no padrão da banca'] },
  { titulo: 'O plano se ajusta sozinho', texto: 'Atrasou, a meta sobe no máximo 25%. Semana difícil, baixa para 10 questões por dia sem quebrar o plano. A cada duas semanas, um mini-simulado; nas duas últimas, a reta final.', itens: ['Áreas fracas ganham mais espaço', 'Reta final com resumão e modo prova'] },
]

function SecaoCronograma({ conta, assinante }: { conta: boolean; assinante: boolean }) {
  return (
    <section className="vd-secao vd-cronograma" aria-labelledby="vd-titulo-cronograma">
      <Cabeca id="vd-titulo-cronograma" sobre="O coração da assinatura" titulo={<>O cronograma que <em>decide por você.</em></>}>
        <p>Feito para quem não tem tempo de montar plano. Você não perde um minuto escolhendo assunto: abre, faz a lista do dia e pronto. Na prática, funciona assim:</p>
      </Cabeca>
      <ol className="vd-passos">
        {PASSOS_CRONOGRAMA.map((p, i) => (
          <li key={p.titulo} className="vd-passo" data-revelar>
            <span className="px-numero vd-passo__num">{i + 1}</span>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
            <ul>{p.itens.map((item) => <li key={item}><Icone nome="certo" tamanho={14} /> {item}</li>)}</ul>
          </li>
        ))}
      </ol>
      {!assinante && <PreviaCronograma conta={conta} />}
      {assinante && <p className="vd-nota"><a href={href('/cronograma')}>Abrir o meu cronograma</a></p>}
    </section>
  )
}

/* ------------------------------------------------------------------------- */
/* 4. Temas que mais caem.                                                    */
/* ------------------------------------------------------------------------- */

function SecaoTemas() {
  const visiveis = AREAS_QUE_CAEM.slice(0, 4)
  const ocultas = AREAS_QUE_CAEM.slice(4, 7)
  const maior = AREAS_QUE_CAEM[0]?.pct ?? 1
  const duas = fatiaDasDuasPrimeiras()
  return (
    <section className="vd-secao vd-temas" aria-labelledby="vd-titulo-temas">
      <div className="vd-temas__texto">
        <Cabeca id="vd-titulo-temas" sobre="Temas que mais caem" titulo={<>Sabemos o que cai. <em>Você estuda isso primeiro.</em></>}>
          <p>Analisamos todas as questões das provas oficiais, uma por uma, e contamos quantas vezes cada área e cada assunto aparecem. É essa contagem que decide a ordem do seu cronograma: o tempo vai para o que a banca mais cobra.</p>
        </Cabeca>
        <ul className="vd-temas__fatos" data-revelar>
          <li><strong>{duas.pct}%</strong><span>das questões vêm de {duas.nomes[0].toLowerCase()} e {duas.nomes[1].toLowerCase()}, juntas.</span></li>
          <li><strong>4 níveis</strong><span>de prioridade em cada área, da máxima à baixa, assunto por assunto.</span></li>
          <li><strong>1 toque</strong><span>em qualquer assunto e começa o treino só dele.</span></li>
        </ul>
        <a className="vd-link" href={href('/temas-que-mais-caem')} data-revelar>Ver como funciona a página dos temas <Icone nome="direita" tamanho={14} /></a>
      </div>
      <figure className="vd-ranking" data-revelar aria-label="Ranking das áreas pela contagem das provas oficiais">
        <figcaption><img src={recurso('pixel/desempenho.png')} alt="" width={36} height={36} loading="lazy" decoding="async" draggable={false} /> Ranking das áreas <small>fatia das questões das provas</small></figcaption>
        <ol>
          {visiveis.map((a, i) => (
            <li key={a.id} style={{ ['--largura' as string]: `${Math.round((a.pct / maior) * 100)}%` }}>
              <b>{i + 1}º</b><span className="vd-ranking__nome">{a.nome}<i /></span><small>{pct(a.pct)}</small>
            </li>
          ))}
          {ocultas.map((a, i) => (
            <li key={a.id} className="vd-ranking__oculto" aria-hidden="true" style={{ ['--largura' as string]: `${Math.round((a.pct / maior) * 100)}%` }}>
              <b>{i + 5}º</b><span className="vd-ranking__nome">██████████<i /></span><small>█,█%</small>
            </li>
          ))}
        </ol>
        <div className="vd-ranking__assuntos">
          <p>Os assuntos campeões:</p>
          <ul>{ASSUNTOS_QUE_MAIS_CAEM.slice(0, 3).map((n) => <li key={n}>{n}</li>)}<li className="vd-ranking__trava"><Icone nome="cadeado" tamanho={12} /> e o ranking completo de cada área, no plano</li></ul>
        </div>
      </figure>
    </section>
  )
}

/* ------------------------------------------------------------------------- */
/* 5. OrtoQuestões Simulados.                                                 */
/* ------------------------------------------------------------------------- */

const ENGENHARIA: Array<{ titulo: string; texto: string }> = [
  { titulo: 'Estudamos a banca', texto: 'Lemos as provas já aplicadas como quem desmonta um relógio: os assuntos que voltam, o nível, o tamanho do enunciado, o tipo de alternativa que derruba.' },
  { titulo: 'Avaliamos a banca', texto: 'Cada prova ganha um mapa: o que ela cobra em cada área, como pergunta e onde costuma estar a pegadinha. O mapa é revisto a cada lote novo.' },
  { titulo: 'Criamos as questões', texto: 'Com o mapa e a bibliografia de referência, escrevemos questões inéditas no mesmo padrão, cada uma com comentário completo e a citação do livro.' },
]

function SecaoSimulados() {
  return (
    <section className="vd-secao vd-engenharia" aria-labelledby="vd-titulo-simulados">
      <div className="vd-engenharia__arte" aria-hidden="true" data-revelar>
        <img src={recurso('pixel/simulado.png')} alt="" width={112} height={112} loading="lazy" decoding="async" draggable={false} />
      </div>
      <div>
        <Cabeca id="vd-titulo-simulados" sobre={ROTULO_SIMULADOS} titulo={<>Engenharia reversa <em>da banca.</em></>}>
          <p>As provas oficiais são finitas. Para você treinar além delas, sem fugir do que cai, fazemos questões novas do jeito que a banca faria. Elas aparecem no meio das suas sessões e do cronograma.</p>
        </Cabeca>
        <ol className="vd-engenharia__passos">
          {ENGENHARIA.map((e, i) => (
            <li key={e.titulo} data-revelar><span className="px-numero">{i + 1}</span><div><h3>{e.titulo}</h3><p>{e.texto}</p></div></li>
          ))}
        </ol>
        <p className="vd-nota" data-revelar>Não são questões oficiais nem cópia de prova sigilosa: cada uma traz o aviso na tela. Servem também para provas cujo conteúdo não é público, como a de cirurgia da mão e o Fellowship de Quadril.</p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------- */
/* 6. Flashcards.                                                             */
/* ------------------------------------------------------------------------- */

function SecaoFlashcards() {
  return (
    <section className="vd-secao vd-flash" aria-labelledby="vd-titulo-flash">
      <div className="vd-flash__texto">
        <Cabeca id="vd-titulo-flash" sobre="Flashcards · beta" titulo={<>O que você erra <em>volta na hora certa.</em></>}>
          <p>Os flashcards são tirados das questões comentadas do acervo, por assunto. Você lê a frente, pensa, vira e diz se errou, hesitou ou sabia. A próxima revisão se marca sozinha: o que você sabe aparece cada vez menos, o que você erra volta logo.</p>
        </Cabeca>
        <ul className="vd-lista" data-revelar>
          <li><Icone nome="certo" tamanho={15} /> Revisão espaçada sem planilha nem anotação</li>
          <li><Icone nome="certo" tamanho={15} /> Cabe na fila do café: um flashcard leva segundos</li>
          <li><Icone nome="certo" tamanho={15} /> Para quem gosta de jogo, os mesmos flashcards viram o Torneio de Flashcards</li>
          <li><Icone nome="certo" tamanho={15} /> {limitesHabilitadosTexto()}</li>
        </ul>
        <a className="vd-link" href={href('/flashcards')} data-revelar>Conhecer os flashcards <Icone nome="direita" tamanho={14} /></a>
      </div>
      <img className="vd-flash__capa" src={recurso('flashcards/promo/capa-larga.png')} alt="" width={520} height={330} loading="lazy" decoding="async" data-revelar />
    </section>
  )
}
const limitesHabilitadosTexto = () => LIMITES_HABILITADOS ? `Gratuito: ${fraseGratis('flashcardsPorDia')}; assinante: sem limite` : 'Abertos a todas as contas nesta fase'

/* ------------------------------------------------------------------------- */
/* 7. Os outros recursos.                                                     */
/* ------------------------------------------------------------------------- */

function SecaoRecursos({ servico }: { servico: string | null }) {
  const recursos: Array<{ img: string; titulo: string; texto: string; destino: string }> = [
    { img: 'pixel/ranking.png', titulo: 'Simulado Nacional, todo mês', texto: 'Uma prova igual para todos os assinantes do Brasil, com 50 questões em duas horas. Corrigida na hora, com a sua posição e o que falta, tema por tema, para você estar pronto.', destino: '/simulado-nacional' },
    { img: 'pixel/treinar.png', titulo: 'Frases que caem', texto: 'O que cai, em uma frase por assunto: as frases "Na prova" que você relê em minutos, junto dos resumos da Biblioteca.', destino: '/resumos/frases' },
    { img: 'pixel/liga.png', titulo: 'Liga da residência', texto: servico ? `Um ranking privado só seu e dos seus colegas. Crie a liga do ${servico}, mande o convite no grupo e estudem juntos.` : 'Um ranking privado do seu serviço. Crie a liga, mande o convite no grupo do WhatsApp e estudem juntos.', destino: '/ligas' },
    { img: 'pixel/relatorio.png', titulo: 'Relatório do mês', texto: 'Todo dia 1º, no seu e-mail: quantas questões, o acerto, os temas que subiram e o próximo passo.', destino: '/conta?secao=estudo' },
    { img: 'pixel/turma.png', titulo: 'Como a turma respondeu', texto: 'Depois de cada questão, quantos marcaram cada alternativa e onde está a pegadinha. E sessões só com as que a turma mais erra.', destino: '/treinar' },
    { img: 'pixel/desempenho.png', titulo: 'Desempenho e mapa de risco', texto: 'Seu acerto por área, os temas que estão ficando para trás e onde vale gastar o próximo minuto.', destino: '/cronograma' },
  ]
  return (
    <section className="vd-secao" aria-labelledby="vd-titulo-recursos">
      <Cabeca id="vd-titulo-recursos" sobre="Tudo o que vem junto" titulo={<>E para saber <em>se você está pronto.</em></>}>
        <p>Os três planos liberam tudo isto. Nenhum recurso fica de fora do mensal.</p>
      </Cabeca>
      <div className="vd-recursos">
        {recursos.map((r) => (
          <a key={r.titulo} className="vd-recurso" href={href(r.destino)} data-revelar>
            <img src={recurso(r.img)} alt="" width={44} height={44} loading="lazy" decoding="async" draggable={false} />
            <h3>{r.titulo}</h3>
            <p>{r.texto}</p>
            <span className="vd-recurso__ver">Ver como funciona <Icone nome="direita" tamanho={13} /></span>
          </a>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------- */
/* 9. Garantia.                                                               */
/* ------------------------------------------------------------------------- */

function SecaoGarantia() {
  return (
    <section className="vd-garantia" aria-labelledby="vd-titulo-garantia">
      <div className="vd-garantia__selo" aria-hidden="true" data-revelar><strong>7</strong><span>dias de garantia</span></div>
      <div className="vd-garantia__texto">
        <p className="vd-sobre">Risco zero para experimentar</p>
        <h2 id="vd-titulo-garantia">Não gostou? Um botão e o dinheiro volta.</h2>
        <p>Até 7 dias depois de cada cobrança, no Pix ou no cartão, você desiste sem justificar e sem falar com ninguém. Funciona assim:</p>
        <ol className="vd-garantia__passos">
          <li><span className="px-numero">1</span><p>Em <a href={href('/conta/assinatura')}><strong>Minha conta › Assinatura</strong></a>, toque em <strong>Desistir e solicitar reembolso integral</strong> e confirme.</p></li>
          <li><span className="px-numero">2</span><p>O pedido vai na hora para o Mercado Pago, e o site confere com ele que o reembolso foi feito. Seu acesso pago só termina depois dessa confirmação.</p></li>
          <li><span className="px-numero">3</span><p><strong>No Pix</strong>, o valor volta para a conta de onde saiu o pagamento; costuma ser rápido, no prazo do Mercado Pago e do seu banco. <strong>No cartão</strong>, o estorno aparece na fatura conforme o prazo do emissor, muitas vezes na seguinte.</p></li>
        </ol>
        <p className="vd-nota">Se o Mercado Pago não confirmar o pedido automático, o suporte faz o atendimento manual, valendo a data em que você pediu. Suas respostas, revisões e desempenho ficam guardados em qualquer caso.</p>
      </div>
    </section>
  )
}
