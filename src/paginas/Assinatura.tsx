import { useEffect, useMemo, useRef, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { lerRespondidas } from '../estado/sessao'
import { chamarFuncao, chamarRpc } from '../servicos/supabase'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { IconePixel, type NomeIconePixel } from '../componentes/IconePixel'
import { Simbolo } from '../marca/Simbolo'
import { JanelaCentral } from '../componentes/JanelaCentral'
import { VERSAO_CONDICOES_ASSINATURA } from '../conta/termos'
import { eventoMeta } from '../conta/consentimento'
import { href } from '../util/rotas'
import { recurso, LIMITE_GRATIS_ATUAL, ROTULO_SIMULADOS } from '../config'
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

/** O que só o assinante tem, com o pixel do site. */
const EXCLUSIVOS: Array<{ icone: NomeIconePixel; titulo: string; texto: string }> = [
  { icone: 'planos', titulo: 'Cronograma até a prova', texto: 'A meta de cada dia na ordem do que mais cai, diagnóstico inicial, alerta de esquecimento, mapa de risco, sua sequência de dias e duas semanas de reta final com resumão.' },
  { icone: 'turma', titulo: 'Como a turma respondeu', texto: 'Depois de cada questão, quantos por cento marcaram cada alternativa e qual é a pegadinha.' },
  { icone: 'treinar', titulo: 'Treino pelas que a turma mais erra', texto: 'Sessões só com as questões que derrubam a maioria, e com as que ninguém pode errar.' },
  { icone: 'simulado', titulo: 'Simulado Nacional todo mês', texto: '50 questões de TEOT e TARO em duas horas, a mesma prova para todo o Brasil. Sua posição e a prontidão por tema.' },
  { icone: 'liga', titulo: 'Liga da residência', texto: 'O ranking privado do seu serviço. Manda o link no grupo e vê quem está estudando de verdade.' },
  { icone: 'relatorio', titulo: 'Relatório do mês', texto: 'Todo dia 1º no e-mail: quantas questões, acerto, temas que subiram e o próximo passo.' },
]

/** O que é de todo mundo: a assinatura soma em cima disso. */
const PARA_TODOS: Array<{ icone: NomeIcone; titulo: string; texto: string }> = [
  { icone: 'livro', titulo: 'Comentário em cada questão', texto: 'O conceito, por que a correta está certa e por que cada outra não serve.' },
  { icone: 'alvo', titulo: ROTULO_SIMULADOS, texto: 'Questões inéditas feitas por engenharia reversa das provas, inclusive das que não são públicas.' },
  { icone: 'trofeu', titulo: 'Ranking', texto: 'Quem mais responde no Brasil, na semana e no geral, com emblemas e sequência de dias.' },
  { icone: 'grafico', titulo: 'Desempenho', texto: 'Acerto por tema e por assunto, evolução e onde você está abaixo da média.' },
  { icone: 'reiniciar', titulo: 'Revisão espaçada', texto: 'O site traz de volta o que você errou na hora certa. Você só responde.' },
  { icone: 'celular', titulo: 'Qualquer aparelho', texto: 'Celular no plantão, computador em casa. Continua de onde parou.' },
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
          <h1 id="vd-titulo">{nome ? `${nome}, compre` : 'Compre'} tempo de estudo. <em>O que estudar, a gente decide.</em></h1>
        </div>
        <div className="vd-heroi__texto">
          <p className="vd-heroi__lide">
            Você diz a data da prova. O Orto Questões monta a meta de cada dia pelo que mais cai no TEOT e no TARO e se ajusta quando a rotina aperta. Sem planilha, sem dúvida do que fazer hoje.
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

      <PreviaCronograma conta={Boolean(sessao)} assinante={comAcessoPago} />

      <section className="vd-secao vd-estatistica" aria-labelledby="vd-titulo-cai">
        <div className="vd-estatistica__texto">
          <p className="vd-sobre">Por que o cronograma acerta</p>
          <h2 id="vd-titulo-cai">A gente contou o que cai. <em>Questão por questão.</em></h2>
          <p>Classificamos {numero(BASE_CONTAGEM)} questões das provas oficiais por área e por assunto. Por isso o cronograma não chuta: começa pelo que a banca mais cobra e deixa para depois o que quase nunca aparece.</p>
          <p className="vd-nota">Você não precisa decidir o que estudar hoje. Só precisa abrir o site e responder.</p>
        </div>
        <ol className="vd-barras" aria-label="Áreas que mais caem">
          {AREAS_CAEM.slice(0, 6).map((a, i) => {
            const fatia = a.n / BASE_CONTAGEM
            return <li key={a.id}>
              <b>{i + 1}</b>
              <span className="vd-barras__nome">{a.nome}<i style={{ width: `${Math.round((a.n / AREAS_CAEM[0].n) * 100)}%` }} /></span>
              <small>{(fatia * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</small>
            </li>
          })}
          <li className="vd-barras__rodape"><Icone nome="cadeado" tamanho={13} /> Os assuntos que mais caem em cada área, no plano</li>
        </ol>
      </section>

      <section className="vd-secao" aria-labelledby="vd-titulo-exclusivos">
        <header className="vd-cabeca">
          <p className="vd-sobre">{comAcessoPago ? 'Seu plano inclui' : 'Só para assinantes'}</p>
          <h2 id="vd-titulo-exclusivos">Estude com direção, <em>não no escuro</em></h2>
          <p>O que responde às perguntas de quem está perto da prova: o que estudo hoje? o que mais cai? onde a turma erra? estou pronto?</p>
        </header>
        <div className="vd-exclusivos">
          {EXCLUSIVOS.map((r) => (
            <article key={r.titulo} className={'vd-cartao vd-exclusivo' + (r.icone === 'planos' ? ' vd-exclusivo--estrela' : '')}>
              <IconePixel nome={r.icone} tamanho={44} />
              <h3>{r.titulo}</h3>
              <p>{r.texto}</p>
            </article>
          ))}
        </div>
        <DemoTurma />
      </section>

      <section className="vd-secao" aria-labelledby="vd-titulo-todos">
        <header className="vd-cabeca">
          <p className="vd-sobre">Para todo mundo</p>
          <h2 id="vd-titulo-todos">E o que já é de todos continua aqui</h2>
          <p>O acervo, os comentários e as ferramentas de estudo são abertos. A assinatura soma o plano, a turma e o simulado em cima disso.</p>
        </header>
        <div className="vd-todos">
          {PARA_TODOS.map((r) => (
            <div key={r.titulo} className="vd-todo">
              <span><Icone nome={r.icone} tamanho={20} /></span>
              <div><strong>{r.titulo}</strong><p>{r.texto}</p></div>
            </div>
          ))}
        </div>
      </section>

      {!comAcessoPago && <section className="vd-secao" aria-labelledby="vd-titulo-compara">
        <header className="vd-cabeca">
          <p className="vd-sobre">Gratuito ou assinante</p>
          <h2 id="vd-titulo-compara">{limitesHabilitados ? 'O gratuito é generoso. O assinante vai além.' : 'O acervo é de todos. O assinante vai além.'}</h2>
        </header>
        <div className="vd-compara vd-cartao" role="table" aria-label="Comparação entre gratuito e assinante">
          <div className="vd-compara__linha vd-compara__cabeca" role="row">
            <span role="columnheader" />
            <span role="columnheader">Gratuito</span>
            <span role="columnheader" className="vd-compara__pro">Assinante</span>
          </div>
          {([
            ['Questões por dia', limitesHabilitados ? `${LIMITE_GRATIS_ATUAL} a cada 24 horas` : 'Sem limite nesta fase', 'Sem limite'],
            ['Comentários, desempenho, revisão e ranking', true, true],
            ['Cronograma até a prova pelo que mais cai', false, true],
            ['Como a turma respondeu cada alternativa', false, true],
            ['Treino pelas que a turma mais erra', false, true],
            ['Simulado Nacional mensal, com posição', false, true],
            ['Temas que mais caem, área por área', false, true],
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

      {(!ativa || renovarPix) && <section className="vd-secao vd-planos-secao" id="planos" aria-labelledby="vd-titulo-planos">
        <header className="vd-cabeca">
          <p className="vd-sobre">Planos</p>
          <h2 id="vd-titulo-planos">Tudo liberado em qualquer plano. <em>Você escolhe só o ritmo de pagamento.</em></h2>
          <p>Os três têm exatamente os mesmos recursos. Quanto mais longo, menor o preço por dia.</p>
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
                <p className="vd-plano__total">{p.meses === 1 ? 'cobrado todo mês' : <><b>{real(p.total)}</b> {periodo(p)} · de <s>{real(cheio)}</s></>}</p>
                <p className="vd-plano__dia"><Icone nome="relogio" tamanho={14} /> {centavos(porDia(p))} por dia de estudo</p>
                <ul className="vd-plano__itens">
                  <li><Icone nome="rota" tamanho={15} /> Cronograma até a prova</li>
                  <li><Icone nome="certo" tamanho={15} /> Todos os recursos do assinante</li>
                  <li><Icone nome="certo" tamanho={15} /> {p.meses === 1 ? 'Sem fidelidade' : `Economia de ${real(cheio - p.total)}`}</li>
                  <li><Icone nome="certo" tamanho={15} /> Garantia de 7 dias</li>
                </ul>
                {!sessao
                  ? <a className={'botao botao--largo vd-plano__cta' + (p.destaque ? ' vd-botao-ouro' : '')} href={href('/conta?modo=criar&voltar=%2Fassinatura')}>Criar conta para assinar</a>
                  : <button className={'botao botao--largo vd-plano__cta' + (p.destaque ? ' vd-botao-ouro' : '')} type="button" disabled={!pagamentosHabilitados || (ativa && !renovarPix)} onClick={() => escolher(p)}>{rotuloComprar(p)}</button>}
              </article>
            )
          })}
        </div>
        {!pagamentosHabilitados && <p className="vd-aviso"><Icone nome="calendario" tamanho={16} /> As assinaturas abrem em breve. Até lá, o acervo, os comentários e a revisão continuam disponíveis no gratuito.</p>}
        {mensagem && !planoEscolhido && <p role="status" className="vd-aviso">{mensagem}</p>}

        <div className="vd-meios">
          <article className="vd-meio">
            <span className="vd-meio__icone vd-meio__icone--pix"><IconePix tamanho={26} /></span>
            <div>
              <h3>Pix</h3>
              <p>Um pagamento só, pelo período inteiro. Liberado assim que cai, <strong>sem renovação automática</strong>. Nos 7 dias finais dá para pagar o próximo período sem perder nenhum dia: os que faltam continuam valendo.</p>
            </div>
          </article>
          <article className="vd-meio">
            <span className="vd-meio__icone"><IconeCartao tamanho={26} /></span>
            <div>
              <h3>Cartão de crédito</h3>
              <p>Renova sozinho na periodicidade escolhida, para você não ficar sem acesso na reta final. Desliga a renovação com um botão quando quiser. Os dados do cartão ficam no Mercado Pago, nunca aqui.</p>
            </div>
          </article>
        </div>
      </section>}

      {!comAcessoPago && <section className="vd-garantia" aria-labelledby="vd-titulo-garantia">
        <div className="vd-garantia__selo" aria-hidden="true"><strong>7</strong><span>dias</span></div>
        <div className="vd-garantia__texto">
          <p className="vd-sobre">Garantia sem conversa</p>
          <h2 id="vd-titulo-garantia">Não gostou? <em>Um botão e o dinheiro volta.</em></h2>
          <p>Nada de e-mail, formulário ou alguém tentando te convencer a ficar. Até 7 dias depois de cada cobrança, o reembolso integral é pedido direto na sua conta.</p>
          <ol className="vd-passos">
            <li><span className="px-numero">1</span><div><strong>Minha conta</strong><small>Abra a área da assinatura</small></div></li>
            <li><span className="px-numero">2</span><div><strong>Pedir reembolso</strong><small>Clique e confirme</small></div></li>
            <li><span className="px-numero">3</span><div><strong>Mercado Pago devolve</strong><small>No mesmo meio que você pagou</small></div></li>
          </ol>
          <p className="vd-nota">Se o Mercado Pago não confirmar o pedido automático, é só usar o canal de contato do site para atendimento manual. O acesso pago só termina depois que o reembolso é confirmado, e o seu histórico nunca é apagado.</p>
        </div>
      </section>}

      {!comAcessoPago && <section className="vd-secao vd-facil" aria-labelledby="vd-titulo-facil">
        <header className="vd-cabeca">
          <p className="vd-sobre">Plano fácil de administrar</p>
          <h2 id="vd-titulo-facil">Tudo pelo botão, <em>na sua conta</em></h2>
        </header>
        <div className="vd-facil__grade">
          <div className="vd-cartao"><Icone nome="reiniciar" tamanho={22} /><strong>Desligar a renovação</strong><p>Um botão. O acesso continua até o último dia já pago.</p></div>
          <div className="vd-cartao"><Icone nome="calendario" tamanho={22} /><strong>Ver datas e cobranças</strong><p>Próxima cobrança, fim do período e histórico de pagamentos no mesmo lugar.</p></div>
          <div className="vd-cartao"><Icone nome="correio" tamanho={22} /><strong>Aviso antes de acabar</strong><p>No Pix, um e-mail 3 dias antes do fim. Ninguém fica sem acesso por esquecimento.</p></div>
          <div className="vd-cartao"><Icone nome="cadeado" tamanho={22} /><strong>Histórico é seu</strong><p>Cancelar ou vencer nunca apaga respostas, revisões, anotações ou desempenho.</p></div>
        </div>
        {sessao && respondidasConta > 0 && <p className="vd-voce"><IconePixel nome="desempenho" tamanho={32} /> <span>Você já respondeu <strong>{numero(respondidasConta)}</strong> questões por aqui{metricas?.sequencia ? <> e está numa sequência de <strong>{metricas.sequencia} {metricas.sequencia === 1 ? 'dia' : 'dias'}</strong></> : null}. Imagine esse ritmo com um plano por trás.</span></p>}
      </section>}

      <section className="vd-secao vd-faq" aria-labelledby="vd-titulo-faq">
        <header className="vd-cabeca"><p className="vd-sobre">Dúvidas</p><h2 id="vd-titulo-faq">Perguntas frequentes</h2></header>
        <div className="vd-faq__grupos">
          <div>
            <h3>Preço e pagamento</h3>
            <details><summary>Quanto custa, de verdade?</summary><p>Mensal: {real(PLANO_MENSAL.total)} por mês. Semestral: {real(PLANO_SEMESTRAL.total)} a cada 6 meses ({real(porMes(PLANO_SEMESTRAL))} por mês). Anual: {real(PLANO_ANUAL.total)} por ano, o que dá {real(porMes(PLANO_ANUAL))} por mês e {centavos(porDia(PLANO_ANUAL))} por dia. Não há taxa de adesão nem cobrança escondida; os três planos liberam exatamente os mesmos recursos.</p></details>
            <details><summary>Qual plano vale mais a pena?</summary><p>Se a prova está a mais de seis meses, o anual sai pela metade do preço do mensal. Para uma reta final curta, o mensal ou o semestral resolvem sem compromisso longo. Em qualquer um vale a garantia de 7 dias.</p></details>
            <details><summary>Posso pagar com Pix?</summary><p>Sim, em todos os planos. Você paga o valor do período inteiro em um único Pix, e o acesso é liberado assim que o Mercado Pago confirma. O Pix não renova sozinho: ao terminar o período, faça uma nova compra se quiser continuar. O CPF é pedido só para o Mercado Pago gerar o Pix e não fica salvo no seu perfil.</p></details>
            <details><summary>Paguei no Pix. Posso renovar antes de acabar sem perder dias?</summary><p>Pode. Enviamos um aviso por e-mail 3 dias antes do fim e, a partir de 7 dias antes do término, a página libera a renovação pelo Pix. Os dias que faltam continuam valendo e o novo período começa no dia em que o atual termina. Exemplo: faltando 3 dias, quem paga o mensal hoje fica com esses 3 dias mais 1 mês completo.</p></details>
            <details><summary>E no cartão, como funciona?</summary><p>O cartão renova automaticamente na periodicidade escolhida (mensal, semestral ou anual). Você desliga a renovação quando quiser, pelo botão em Minha conta, e o acesso continua até o fim do período já pago. O pagamento é feito no checkout seguro do Mercado Pago; o Orto Questões não recebe os dados do cartão.</p></details>
          </div>
          <div>
            <h3>Garantia e cancelamento</h3>
            <details><summary>Como funciona a garantia de 7 dias?</summary><p>Até 7 dias depois de cada cobrança aprovada, você pede o reembolso integral pelo botão em Minha conta, sem precisar falar com ninguém nem justificar. Se o Mercado Pago não confirmar a solicitação automática, use o canal de contato do site para atendimento manual. O acesso pago só é encerrado depois que o reembolso é confirmado.</p></details>
            <details><summary>Preciso falar com alguém para cancelar?</summary><p>Não. Desligar a renovação e pedir o reembolso dentro da garantia são botões em Minha conta. Ninguém liga, ninguém manda e-mail perguntando o motivo.</p></details>
            <details><summary>Se eu cancelar o semestral após três meses, recebo o resto?</summary><p>Depois dos 7 dias da garantia, não há devolução proporcional automática. Você mantém o acesso até completar o período pago e a assinatura não renova. A mesma regra vale para o anual. Seus direitos previstos em lei continuam preservados; consulte as <a href={href('/condicoes-assinatura')}>condições da assinatura</a> antes de comprar.</p></details>
            <details><summary>O que acontece com meu histórico se eu cancelar?</summary><p>Nada. Respostas, revisões, favoritas, anotações e desempenho ficam guardados. Ao desligar a renovação, o acesso pago continua até o fim do período; depois de um reembolso confirmado, a conta volta ao gratuito com tudo preservado.</p></details>
            <details><summary>Como funciona o limite do plano gratuito?</summary><p>{limitesHabilitados ? `O gratuito tem um número limitado de respostas novas (hoje, ${LIMITE_GRATIS_ATUAL}) a cada 24 horas. O relógio começa na primeira questão respondida e, 24 horas depois, a cota volta inteira; o site mostra quanto falta.` : `O limite diário está desligado nesta fase, portanto o acesso gratuito também está sem limite de respostas. Se o limite for ativado, o patamar gratuito previsto é de ${LIMITE_GRATIS_ATUAL} respostas novas a cada 24 horas.`} Comentários, revisões e desempenho continuam abertos.</p></details>
          </div>
          <div>
            <h3>O que vem no plano</h3>
            <details><summary>Como o cronograma é montado?</summary><p>Você informa a data da prova, a intensidade (leve, firme ou completo) e os dias de folga. O cronograma divide as questões pelos dias até a prova, coloca primeiro as áreas e os assuntos que mais caem (a partir da contagem das provas oficiais), dá mais espaço aos temas em que você está abaixo da média (um diagnóstico de 30 questões já calibra isso no primeiro dia) e mistura de 2 a 6 OrtoQuestões Simulados por sessão. As duas últimas semanas são a reta final, sem conteúdo novo: a penúltima é de revisão forte (seus erros, dúvidas e o que mais cai, uma fatia da prova por dia) e a última é o modo prova (simulado cronometrado, os erros que importam e o resumão). Todo dia ele se recalcula: atrasou, a meta sobe um pouco; adiantou, alivia. E avisa quando um tema já estudado fica três semanas esquecido. Antes de assinar, dá para ver a prévia do seu.</p></details>
            <details><summary>O que é o "Como a turma respondeu"?</summary><p>Depois de responder, o assinante vê quantos por cento da turma marcaram cada alternativa e qual foi a pegadinha mais escolhida. No Treinar, dá para montar sessões só com as questões que a maioria erra, ou só com as que quase todo mundo acerta e você não pode errar.</p></details>
            <details><summary>Como funciona o Simulado Nacional?</summary><p>No começo de cada mês sai uma edição nova: a mesma prova, com 50 questões de TEOT e TARO e duas horas de tempo, para todos os assinantes. Você faz quando quiser dentro do mês, numa tentativa só. A correção sai na hora, com a sua posição e o acerto por tema comparado à média.</p></details>
            <details><summary>O que são os {ROTULO_SIMULADOS}?</summary><p>Questões inéditas, escritas pelo Orto Questões por engenharia reversa das provas: estudamos o estilo, o nível e os temas das provas anteriores e escrevemos questões novas no mesmo padrão, inclusive para provas cujo conteúdo não é público, como a de cirurgia da mão e o Fellowship de Quadril. Não são questões oficiais nem cópia de prova sigilosa; trazem aviso na tela e comentário completo.</p></details>
            <details><summary>Ranking e desempenho são só para assinantes?</summary><p>Não. O ranking nacional, o desempenho por tema, a revisão espaçada, o caderno de erros e os comentários são de todos. O assinante soma a liga privada do seu serviço, a turma, o Simulado Nacional e o cronograma.</p></details>
            <details><summary>Meus colegas precisam assinar para entrar na liga?</summary><p>Sim. Quem cria e quem entra na liga da residência precisam do plano. Quem recebe o convite sem o plano vê o nome da liga e pode assinar para entrar.</p></details>
            <details><summary>Funciona no celular?</summary><p>Funciona em qualquer navegador, no celular ou no computador, com a mesma conta. O progresso sincroniza e você continua de onde parou.</p></details>
          </div>
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
          {fases.map((f, i) => {
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

const DEMO = {
  enunciado: 'Fratura da diáfise do úmero com mão caída logo após o trauma. Qual nervo foi lesado?',
  alternativas: [['A', 'Axilar', 14], ['B', 'Radial', 71], ['C', 'Mediano', 6], ['D', 'Ulnar', 9]] as Array<[string, string, number]>,
  correta: 'B',
  pegadinha: 'A',
}

function DemoTurma() {
  const [marcada, definirMarcada] = useState<string | null>(null)
  return (
    <div className="vd-demo vd-cartao">
      <div className="vd-demo__texto">
        <p className="vd-selo vd-selo--claro"><IconePixel nome="turma" tamanho={20} /> Teste aqui</p>
        <h3>Responda e veja como a turma marcou</h3>
        <p>É assim que o assinante vê cada questão depois de responder: a porcentagem de cada alternativa e a pegadinha que mais derruba.</p>
        <small>Exemplo com números ilustrativos.</small>
      </div>
      <div className="vd-demo__questao">
        <p className="vd-demo__enunciado">{DEMO.enunciado}</p>
        <ul>
          {DEMO.alternativas.map(([letra, texto, pct]) => {
            const certa = letra === DEMO.correta
            const classe = !marcada ? '' : certa ? ' vd-alt--certa' : letra === marcada ? ' vd-alt--errada' : ''
            return (
              <li key={letra}>
                <button type="button" className={'vd-alt' + classe} disabled={Boolean(marcada)} onClick={() => definirMarcada(letra)} style={{ ['--pct' as string]: marcada ? `${pct}%` : '0%' }}>
                  <b>{letra}</b><span>{texto}</span>
                  {marcada && <em>{pct}%</em>}
                  {marcada && letra === DEMO.pegadinha && <i className="vd-alt__pegadinha">pegadinha</i>}
                </button>
              </li>
            )
          })}
        </ul>
        {marcada && <p className="vd-demo__resultado" role="status">{marcada === DEMO.correta ? 'Acertou, junto com a maioria.' : `Você marcou ${marcada}. A resposta é B, radial.`} O axilar é a pegadinha: ele sofre na fratura do colo cirúrgico e na luxação do ombro, não na diáfise. <button type="button" onClick={() => definirMarcada(null)}>Responder de novo</button></p>}
      </div>
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
