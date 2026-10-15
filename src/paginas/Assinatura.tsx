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
import { href, navegar } from '../util/rotas'
import { linkConta } from '../conta/passagem'
import { FLASHCARDS_NA_VENDA, recurso, LIMITE_GRATIS_ATUAL, ROTULO_SIMULADOS } from '../config'
import { MENSAL, PLANOS, real, ECONOMIA_ANUAL } from '../dados/planos'
import { AREAS, BASE_CONTAGEM } from '../dados/incidencia'
import { chaveDia } from '../estado/limiteDiario'
import { diasAte, proximaProva, RITMOS_PLANOS as RITMOS } from '../dados/ritmos'
import { usarAssinante } from '../conta/plano'
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
  { icone: 'planos', titulo: 'Um plano que pensa por você', texto: 'Você abre o site e sabe o que fazer hoje, amanhã e até a prova. O cronograma passa primeiro pelo que mais cai em todas as áreas e se ajusta quando a rotina aperta.', itens: ['A lista de hoje, com o tempo de cada parte', 'Três passadas: o que mais cai vem primeiro', 'Dia de plantão e semana difícil sem quebrar o plano', 'Mini-simulado a cada duas semanas e reta final com resumão'] },
  { icone: 'simulado', titulo: 'Estude o que a banca cobra', texto: `Contamos ${numero(BASE_CONTAGEM)} questões das provas oficiais por assunto. E os ${ROTULO_SIMULADOS} trazem questões novas no padrão da banca, feitas por engenharia reversa das provas.`, itens: ['Temas que mais caem, área por área', 'Resumão: o que cai, em uma frase', `${ROTULO_SIMULADOS} no meio de cada sessão`] },
  { icone: 'turma', titulo: 'Saiba onde você está', texto: 'Compare com quem estuda para a mesma prova e chegue sabendo o que falta.', itens: ['Como a turma respondeu cada alternativa', 'Simulado Nacional todo mês, com sua posição', 'Liga da residência e relatório do mês'] },
]

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
  const [pix, definirPix] = useState<{ url: string; pedido_id: string; expira_em: string } | null>(null)
  // ?plano= mantém o plano escolhido por quem criou a conta a partir desta página.
  const [vitrine, definirVitrine] = useState<Plano>(() => PLANOS.find((p) => p.id === consulta?.get('plano')) ?? PLANO_ANUAL)
  const [barraVisivel, definirBarraVisivel] = useState(false)
  const heroi = useRef<HTMLElement>(null)
  const locais = useMemo(() => Object.values(lerRespondidas()), [])
  const nome = String(sessao?.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0] ?? ''

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
    definirPlanoEscolhido(plano)
    if (renovarPix) definirMeioPagamento('pix')
    definirPix(null)
    definirCpf('')
    definirAceitouCondicoes(false)
    definirMensagem(null)
  }
  /** Botões de compra da página: sem conta, cria a conta e volta para cá, com o plano escolhido. */
  function comprar(plano: Plano) {
    if (!pagamentosHabilitados) return
    if (!sessao) { navegar(linkConta('criar', `/assinatura?plano=${plano.id}`)); return }
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
          <button type="button" className="botao botao--grande vd-botao-ouro" disabled={semCompra} onClick={() => comprar(vitrine)}>{rotuloComprar(vitrine)}</button>
          <a className="vd-preco__comparar" href="#planos" onClick={(e) => { e.preventDefault(); irPara('planos') }}>Comparar os 3 planos <Icone nome="baixo" tamanho={14} /></a>
        </div>
      </section>}

      {comAcessoPago && (
        <section className="vd-ativo" aria-labelledby="vd-titulo-minha">
          <span className="vd-ativo__icone"><Icone nome="certo" tamanho={22} /></span>
          <div>
            <h1 id="vd-titulo-minha">Minha assinatura</h1>
            {!metricas ? (falhouConsulta
              ? <p role="alert">Não foi possível carregar os dados da assinatura agora. <button type="button" className="botao--vinculo" onClick={() => definirTentativa((n) => n + 1)}>Tentar de novo</button></p>
              : <p role="status">Carregando assinatura…</p>) : <>
            <h2>{semRenovacao ? 'Acesso pago sem renovação automática' : `Seu plano ${metricas.plano} está ativo`}</h2>
            <p>{semRenovacao ? 'Não haverá nova cobrança desta assinatura. O período já pago não foi reembolsado.' : 'A próxima cobrança segue a periodicidade escolhida.'} Acesso ilimitado até {fimTexto ?? 'o fim do período atual'}.</p>
            <dl className="vd-ativo__dados">
              <div><dt>Plano</dt><dd>{metricas.plano ? `Plano ${metricas.plano}` : 'Assinante'}</dd></div>
              <div><dt>{semRenovacao ? 'Término do acesso' : 'Próxima cobrança'}</dt><dd>{fimTexto ?? 'Não informada'}</dd></div>
              {metricas.ultima_cobranca_em && <div><dt>Última cobrança</dt><dd>{new Date(metricas.ultima_cobranca_em).toLocaleDateString('pt-BR')}</dd></div>}
            </dl>
            </>}
            <div className="linha">
              <a className="botao botao--principal" href={href('/cronograma')}>Abrir o cronograma</a>
              <a className="botao" href={href('/conta/assinatura')}>Gerenciar renovação ou pedir reembolso</a>
            </div>
            {metricas && renovarPix && <p className="vd-ativo__renovar"><strong>Faltam {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}. Renove agora pelo Pix sem perder nada:</strong> os dias que restam continuam valendo e o novo período começa em {fimAtualTexto}, quando o atual termina. <a href="#planos" onClick={(e) => { e.preventDefault(); irPara('planos') }}>Escolher o plano</a></p>}
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
      {!comAcessoPago && <PreviaCronograma conta={Boolean(sessao)} />}

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
            ['Cronograma até a prova: a lista de cada dia, o que mais cai primeiro, dia de plantão e reta final', false, true],
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
      {/* Com acesso pago, os planos só aparecem para renovar o Pix ou, sem renovação, voltar a assinar. */}
      {(!comAcessoPago || renovarPix || (metricas && !ativa)) && <section className="vd-secao vd-planos-secao" id="planos" aria-labelledby="vd-titulo-planos">
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
                {p.destaque && <span className="vd-plano__fita">Melhor custo-benefício · {ECONOMIA_ANUAL}</span>}
                <header className="vd-plano__topo">
                  <h3>{p.nome}</h3>
                  {desconto > 0 && <span className="vd-plano__desconto">-{desconto}%</span>}
                </header>
                <p className="vd-plano__chamada">{p.chamada}</p>
                <p className="vd-plano__mes"><small>R$</small><strong>{semMoeda(porMes(p))}</strong><small>/mês</small></p>
                <p className="vd-plano__total">{p.meses === 1 ? 'cobrado todo mês, sem fidelidade' : <><b>{real(p.total)}</b> {periodo(p)} · de <s>{real(cheio)}</s></>}</p>
                <p className="vd-plano__dia"><Icone nome="relogio" tamanho={14} /> {centavos(porDia(p))} por dia de estudo</p>
                {!sessao && pagamentosHabilitados
                  ? <a className={'botao botao--largo vd-plano__cta' + (p.destaque ? ' vd-botao-ouro' : '')} href={href(linkConta('criar', `/assinatura?plano=${p.id}`))}>Criar conta para assinar</a>
                  : <button className={'botao botao--largo vd-plano__cta' + (p.destaque ? ' vd-botao-ouro' : '')} type="button" disabled={semCompra} onClick={() => escolher(p)}>{rotuloComprar(p)}</button>}
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
          <details><summary>Quanto custa, de verdade?</summary><p>Mensal: {real(PLANO_MENSAL.total)} por mês. Semestral: {real(PLANO_SEMESTRAL.total)} a cada 6 meses ({real(porMes(PLANO_SEMESTRAL))} por mês). Anual: {real(PLANO_ANUAL.total)} por ano, o que dá {real(porMes(PLANO_ANUAL))} por mês e {centavos(porDia(PLANO_ANUAL))} por dia. Não há taxa de adesão nem cobrança escondida; os três planos liberam exatamente os mesmos recursos. Se a prova está a mais de seis meses, o anual sai {ECONOMIA_ANUAL === 'metade do preço' ? 'pela metade do preço do mensal' : `${ECONOMIA_ANUAL} que o mensal`}.</p></details>
          <details><summary>Como funciona a garantia de 7 dias?</summary><p>Até 7 dias depois de cada cobrança aprovada, você pede o reembolso integral pelo botão em Minha conta, sem precisar falar com ninguém nem justificar. Se o Mercado Pago não confirmar a solicitação automática, use o canal de contato do site para atendimento manual. O acesso pago só é encerrado depois que o reembolso é confirmado.</p></details>
          <details><summary>Pix ou cartão: qual a diferença?</summary><p>No Pix você paga o período inteiro de uma vez e o acesso é liberado assim que o Mercado Pago confirma; ele não renova sozinho, e a partir de 7 dias antes do fim a página libera a renovação sem perder os dias que faltam (avisamos por e-mail 3 dias antes). O CPF é pedido só para gerar o Pix e não fica salvo. No cartão, a renovação é automática na periodicidade escolhida e você desliga quando quiser; o Orto Questões não recebe os dados do cartão.</p></details>
          <details><summary>Preciso falar com alguém para cancelar? E o meu histórico?</summary><p>Não. Desligar a renovação e pedir o reembolso dentro da garantia são botões em Minha conta. Depois dos 7 dias, não há devolução proporcional automática: você mantém o acesso até o fim do período pago e a assinatura não renova (seus direitos previstos em lei continuam preservados; veja as <a href={href('/condicoes-assinatura')}>condições da assinatura</a>). Respostas, revisões, anotações e desempenho nunca são apagados.</p></details>
          <details><summary>Como o cronograma é montado?</summary><p>Em quatro passos: a data da prova, quanto tempo você tem por dia, como é a sua semana (folgas e dias de plantão, que viram dias leves) e por onde começar. Um diagnóstico opcional de 30 questões mostra onde você está mais fraco. O plano passa três vezes pelo acervo: na <b>1ª passada</b>, os assuntos de prioridade máxima de todas as áreas (pela contagem das provas oficiais); na 2ª, os de prioridade alta; na 3ª, o resto. Assim, se a rotina apertar, o que mais cai já foi visto. Cada área fica uns 3 dias em foco, com cerca de 30% de cada dia vindo de outra área para misturar, e entram de 2 a 6 {ROTULO_SIMULADOS} por sessão. A cada duas semanas há um mini-simulado, e as duas últimas semanas são a reta final: revisão forte e depois o modo prova, com simulado, os erros que importam e o resumão. Todo dia a página mostra onde você está, a lista de hoje com o tempo de cada parte, o que vem amanhã, a semana e as próximas semanas. Atrasou, a meta sobe no máximo 25%; numa semana difícil, dá para baixar para 10 questões por dia sem quebrar o plano.</p></details>
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
        <button type="button" className="botao botao--grande vd-botao-ouro" disabled={semCompra} onClick={() => comprar(PLANO_ANUAL)}>{rotuloComprar(PLANO_ANUAL)}</button>
      </section>}

      {!comAcessoPago && pagamentosHabilitados && <div className={'vd-barra' + (barraNaTela ? ' vd-barra--visivel' : '')} aria-hidden={!barraNaTela}>
        <span className="vd-barra__preco"><strong>{real(porMes(vitrine))}</strong>/mês · {vitrine.nome.toLowerCase()}</span>
        <span className="vd-barra__garantia">7 dias de garantia</span>
        <button type="button" className="botao vd-botao-ouro" tabIndex={barraNaTela ? 0 : -1} disabled={semCompra} onClick={() => comprar(vitrine)}>{sessao ? 'Assinar' : 'Criar conta'}</button>
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

const FOLGAS: Array<[number, string]> = [[0, 'Todo dia'], [1, '1 folga'], [2, '2 folgas']]

/**
 * Quanto do que cai é de cada prioridade, pela contagem das provas oficiais. Uma questão pode estar
 * em mais de um assunto, então vale a proporção (aplicada ao total contado), não a soma.
 */
const PASSADAS_VENDA = (() => {
  const soma = { 4: 0, 3: 0, resto: 0 }
  for (const a of AREAS) for (const f of a.focos) { if (f.nivel === 4) soma[4] += f.n ?? 0; else if (f.nivel === 3) soma[3] += f.n ?? 0; else soma.resto += f.n ?? 0 }
  const total = soma[4] + soma[3] + soma.resto || 1
  const p1 = Math.round((BASE_CONTAGEM * soma[4]) / total), p2 = Math.round((BASE_CONTAGEM * soma[3]) / total)
  return [
    { nome: '1ª passada', texto: 'Prioridade máxima de todas as áreas', n: p1 },
    { nome: '2ª passada', texto: 'Prioridade alta', n: p2 },
    { nome: '3ª passada', texto: 'Prioridade média e baixa', n: Math.max(0, BASE_CONTAGEM - p1 - p2) },
  ]
})()

/**
 * A mesma lógica do cronograma de verdade, sem o histórico da pessoa: escolha o
 * ritmo, a data e as folgas e veja as três passadas pelo que mais cai (com as
 * semanas de cada uma), a reta final e como fica um dia do plano. O cronograma
 * real usa as questões do acervo (com os simulados) e o seu histórico.
 */
function PreviaCronograma({ conta }: { conta: boolean }) {
  const [ritmo, definirRitmo] = useState(25)
  const [folgas, definirFolgas] = useState(1)
  const [prova, definirProva] = useState(proximaProva)
  const corridos = diasAte(prova)
  const semanas = Math.max(1, Math.ceil(corridos / 7))
  // Reta final: duas semanas (revisão forte e modo prova) com 6 semanas ou mais; uma com 3 a 5.
  const reta = semanas >= 6 ? 2 : semanas >= 3 ? 1 : 0
  const semanasEstudo = Math.max(1, semanas - reta)
  const porSemana = ritmo * (7 - folgas)
  const total = porSemana * semanasEstudo
  const minutos = Math.round(ritmo * 1.5)
  const dataCurta = new Date(`${prova}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '')

  // As passadas, em sequência: cada uma ocupa as semanas que o ritmo pede, até a reta final.
  const passadas = useMemo(() => {
    let usado = 0
    return PASSADAS_VENDA.map((p) => {
      const cabe = Math.max(0, Math.min(p.n, total - usado))
      const de = Math.floor(usado / porSemana) + 1
      usado += cabe
      const ate = Math.max(de, Math.ceil(usado / porSemana))
      return { ...p, cabe, de: Math.min(de, semanasEstudo), ate: Math.min(ate, semanasEstudo), pct: p.n ? Math.round((cabe / p.n) * 100) : 0 }
    })
  }, [total, porSemana, semanasEstudo])
  const semanaTexto = (de: number, ate: number) => de === ate ? `Semana ${de}` : `Semanas ${de} a ${ate}`
  const [a1, a2] = AREAS_CAEM
  const mistura = Math.round(ritmo * 0.3)

  return (
    <section className="vd-cronograma" aria-labelledby="vd-titulo-cronograma">
      <div className="vd-cronograma__cabeca">
        <p className="vd-selo vd-selo--ouro"><Icone nome="rota" tamanho={15} /> O carro-chefe do plano</p>
        <h2 id="vd-titulo-cronograma">Seu cronograma, <em>montado em 10 segundos.</em></h2>
        <p>Mexa nos botões: a conta abaixo usa a mesma lógica do cronograma de verdade. Primeiro o que mais cai em todas as áreas, depois o resto.</p>
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

        <div className="vd-cronograma__plano">
          <ol className="vd-fases" aria-label="Passadas do cronograma">
            {passadas.map((p, i) => (
              <li key={p.nome} className={'vd-fase' + (p.cabe === 0 ? ' vd-fase--fechada' : '')} style={{ ['--fatia' as string]: `${p.pct ? Math.max(6, p.pct) : 0}%` }}>
                <span className="vd-fase__num">{i + 1}</span>
                <div className="vd-fase__corpo">
                  <p className="vd-fase__topo"><strong>{p.nome} · {p.texto}</strong><small>{p.cabe ? semanaTexto(p.de, p.ate) : 'Não cabe neste ritmo'} · {p.pct >= 100 ? 'completa' : `${p.pct}% dela`}</small></p>
                  <span className="vd-fase__barra" aria-hidden="true"><i /></span>
                  {i === 0 && <p className="vd-fase__focos">Começa por {AREAS_CAEM.slice(0, 3).map((a) => a.nome.toLowerCase()).join(', ')} e passa por todas as áreas, em blocos de 3 dias</p>}
                </div>
                <span className="vd-fase__qtd">{numero(p.cabe)}<small> questões</small></span>
              </li>
            ))}
            {reta > 1 && <li className="vd-fase vd-fase--reta">
              <span className="vd-fase__num"><Icone nome="reiniciar" tamanho={16} /></span>
              <div className="vd-fase__corpo"><p className="vd-fase__topo"><strong>Reta final · revisão forte</strong><small>Semana {semanas - 1} · penúltima semana</small></p><p className="vd-fase__focos">Seus erros, dúvidas e os assuntos que mais caem, uma fatia da prova por dia. Sem conteúdo novo.</p></div>
            </li>}
            {reta > 0 && <li className="vd-fase vd-fase--reta">
              <span className="vd-fase__num"><Icone nome="bandeira" tamanho={16} /></span>
              <div className="vd-fase__corpo"><p className="vd-fase__topo"><strong>Reta final · modo prova</strong><small>Semana {semanas} · última semana</small></p><p className="vd-fase__focos">Simulado cronometrado, os erros que importam e o resumão. Véspera leve.</p></div>
            </li>}
          </ol>

          {a1 && a2 && <div className="vd-dia" aria-label="Um dia do cronograma">
            <p className="vd-dia__rotulo">Um dia do cronograma</p>
            <ol>
              <li><span>1</span><div><strong>Resumão do tema</strong><small>As frases "Na prova" de {a1.nome.toLowerCase()}</small></div><em>4 min</em></li>
              <li><span>2</span><div><strong>{ritmo} questões novas</strong><small>{ritmo - mistura} de {a1.nome.toLowerCase()} e {mistura} de {a2.nome.toLowerCase()} para misturar</small></div><em>~{minutos} min</em></li>
              <li><span>3</span><div><strong>Revisões do dia</strong><small>Erros e dúvidas que voltam no tempo certo</small></div><em>à parte</em></li>
            </ol>
            <p className="vd-dia__nota">Na página você vê também <b>o que vem amanhã</b>, a semana inteira na cor de cada área e as próximas semanas até a prova.</p>
          </div>}
        </div>
      </div>

      <div className="vd-cronograma__rodape">
        <p><Icone nome="reiniciar" tamanho={16} /> No cronograma de verdade, o diagnóstico calibra o plano no primeiro dia, as áreas em que você está abaixo da média ganham mais espaço e a meta se recalcula todo dia (atrasou, sobe no máximo 25%). Dia de plantão vira dia leve, a semana difícil fica em 10 questões por dia, e a cada duas semanas vem um mini-simulado.</p>
        <a className="botao botao--grande vd-botao-ouro" href={href(conta ? '/cronograma' : '/conta?modo=criar&voltar=%2Fcronograma')}>{conta ? 'Ver um exemplo com o meu histórico' : 'Criar conta grátis e ver o meu'}</a>
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
