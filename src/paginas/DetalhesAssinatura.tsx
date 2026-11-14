import { useEffect, useState, type ReactNode } from 'react'
import { Icone } from '../componentes/Icone'
import { AmpliarPlano } from '../componentes/AmpliarPlano'
import { ContaDias } from '../componentes/ContaDias'
import { RenovacaoPix } from '../componentes/RenovacaoPix'
import { Recibos } from '../componentes/Recibos'
import { recurso } from '../config'
import { usarConta } from '../conta/ContextoConta'
import { usarPrecoAntigo } from '../conta/precoAntigo'
import { MENSAGENS_STATUS, dataBr, gerenciarAssinatura, usarEstadoAssinatura } from '../conta/estadoAssinatura'
import { dias, diasEntre, duracao } from '../conta/dias'
import { diaMes, JANELA_RENOVACAO_PIX } from '../conta/periodoPix'
import { planosDaPessoa, type Plano } from '../dados/vendas'
import { usarPeriodo } from '../estado/aparencia'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/Desempenho.css'
import '../estilos/paginas/DetalhesAssinatura.css'

/*
 * Dados da assinatura (/conta/assinatura), refeita inteira em 14/11/2026 no padrão da página de Desempenho
 * (Tales: "organizar e deixar essa página mais completa"; "deixar claro quantos dias a pessoa tem"):
 * o topo com a arte do baú e as informações principais (dias de acesso em destaque), o menu lateral com as
 * seções (barra de atalhos no celular) e, por extenso, o plano, a ampliação, a renovação, a garantia, os
 * recibos e as dúvidas, cada ação num botão de verdade.
 */

const pagamentosHabilitados = import.meta.env.VITE_PAGAMENTOS_HABILITADOS === 'true'
type IdSecao = 'topo' | 'plano' | 'ampliar' | 'renovacao' | 'garantia' | 'recibos' | 'duvidas'
type NomeIcone = Parameters<typeof Icone>[0]['nome']

function Arte() {
  const periodo = usarPeriodo()
  const arte = (sufixo: string) => recurso(`pixel/paginas/bau-${periodo}${sufixo}.webp`)
  return <img className="asn-arte" src={arte('')} srcSet={`${arte('-960')} 960w, ${arte('')} 1440w`} sizes="(max-width: 76rem) 100vw, 76rem"
    width={1440} height={480} alt="" aria-hidden="true" decoding="async" fetchPriority="high" draggable={false} />
}

function Secao({ id, rotulo, icone, titulo, texto, children }: { id: IdSecao; rotulo: string; icone: NomeIcone; titulo: string; texto: ReactNode; children: ReactNode }) {
  return (
    <section className="dp-secao asn-secao" id={`asn-${id}`} aria-labelledby={`asn-${id}-titulo`}>
      <header className="dp-secao__cabeca">
        <p className="dp-rotulo"><Icone nome={icone} tamanho={14} /> {rotulo}</p>
        <h2 id={`asn-${id}-titulo`}>{titulo}</h2>
        <p>{texto}</p>
      </header>
      {children}
    </section>
  )
}

function Navegacao({ secoes }: { secoes: Array<[IdSecao, string, NomeIcone]> }) {
  const [atual, definirAtual] = useState<string>('topo')
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const alvos = secoes.map(([id]) => document.getElementById(`asn-${id}`)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver((entradas) => {
      const visiveis = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visiveis[0]) definirAtual(visiveis[0].target.id.replace(/^asn-/, ''))
    }, { rootMargin: '-20% 0px -65% 0px' })
    alvos.forEach((a) => io.observe(a))
    return () => io.disconnect()
  }, [secoes])
  useEffect(() => {
    (document.querySelector(`.dp-nav__chips [data-secao="${atual}"]`) as HTMLElement | null)?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [atual])
  // Vindo de outro lugar com ?secao=ampliar (Minha conta, "Ver quanto fica"), desce até a seção.
  useEffect(() => {
    const secao = new URLSearchParams(location.hash.split('?')[1] ?? '').get('secao')
    if (!secao) return
    const t = window.setTimeout(() => document.getElementById(`asn-${secao}`)?.scrollIntoView({ block: 'start' }), 600)
    return () => window.clearTimeout(t)
  }, [])
  const ir = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`asn-${id}`)?.scrollIntoView({ behavior: reduzir ? 'auto' : 'smooth', block: 'start' })
    definirAtual(id)
  }
  return (
    <nav className="dp-nav" aria-label="Seções da assinatura">
      <div className="dp-nav__lateral">
        <p className="dp-rotulo">Nesta página</p>
        <ol>
          {secoes.map(([id, rotulo, icone]) => <li key={id}>
            <a href={`#asn-${id}`} onClick={ir(id)} aria-current={atual === id ? 'true' : undefined}><Icone nome={icone} tamanho={16} /> <span>{rotulo}</span></a>
          </li>)}
        </ol>
        <a className="dp-botao asn-nav__suporte" href={href('/contato?assunto=assinatura')}><Icone nome="interrogacao" tamanho={15} /> Falar com o suporte</a>
      </div>
      <div className="dp-nav__chips">
        {secoes.map(([id, rotulo]) => <a key={id} href={`#asn-${id}`} data-secao={id} onClick={ir(id)} aria-current={atual === id ? 'true' : undefined}>{rotulo}</a>)}
      </div>
    </nav>
  )
}

export function DetalhesAssinatura() {
  const { sessao } = usarConta()
  const a = usarEstadoAssinatura(sessao)
  const { planosAntigos } = usarPrecoAntigo(sessao)
  const planos = planosDaPessoa(planosAntigos).pipoca
  const [processando, definirProcessando] = useState(false)
  const [acaoPendente, definirAcaoPendente] = useState<'cancelar' | 'reembolsar' | null>(null)
  const [mensagem, definirMensagem] = useState('')

  if (!sessao) return <article className="dpg asn asn--sem-conta">
    <div className="dp-conteudo">
      <section className="dp-cartao asn-entrar">
        <p className="dp-rotulo"><Icone nome="cadeado" tamanho={14} /> Dados da assinatura</p>
        <h1>Entre para ver a sua assinatura</h1>
        <p>Aqui ficam o seu plano, os dias de acesso, a renovação, a garantia de 7 dias e os recibos.</p>
        <a className="dp-botao dp-botao--principal" href={href('/conta')}>Entrar na minha conta <Icone nome="direita" tamanho={16} /></a>
      </section>
    </div>
  </article>

  async function gerenciar(acao: 'cancelar' | 'reembolsar') {
    definirProcessando(true)
    definirMensagem(acao === 'reembolsar' ? 'Solicitando e confirmando o reembolso com o Mercado Pago…' : 'Interrompendo as próximas renovações…')
    const r = await gerenciarAssinatura(acao)
    if (r.ok) await a.atualizar()
    definirMensagem(r.mensagem)
    definirProcessando(false)
    definirAcaoPendente(null)
  }

  const { estado } = a
  const agora = Date.now()
  const nome = String(sessao.user.user_metadata?.nome ?? '').trim().split(/\s+/)[0]
  const planoAtual = planos.find((p) => p.id === estado?.plano) ?? null
  const restam = a.comAcesso && a.fimAcesso ? diasEntre(agora, a.fimAcesso) : 0
  const opcoesAmpliar: Plano[] = planoAtual ? planos.filter((p) => p.meses > planoAtual.meses) : []
  const janelaPixAberta = Boolean(a.fimPix && agora >= a.fimPix - JANELA_RENOVACAO_PIX)
  const podeAmpliar = Boolean(pagamentosHabilitados && a.ativo && planoAtual && opcoesAmpliar.length && a.fimAcesso && (a.pixAtivo || !estado?.cancelar_ao_fim) && !janelaPixAberta)
  const statusExibido = a.pixAtivo ? 'Em dia, pago no Pix' : a.renovacaoDesligada ? 'Sem renovação automática' : MENSAGENS_STATUS[a.status]?.titulo ?? 'Plano gratuito'
  const nomePlano = estado?.plano && a.comAcesso ? `Plano ${estado.plano}` : 'Plano gratuito'
  const meio = a.meio === 'pix' ? 'Pix, sem cobrança automática' : a.meio === 'cartao' ? (a.renovacaoDesligada ? 'Cartão, renovação desligada' : 'Cartão, renova sozinho') : a.comAcesso ? 'Cartão' : '—'
  const cartaoRenovando = a.comAcesso && !a.pixAtivo && !a.renovacaoDesligada

  const secoes: Array<[IdSecao, string, NomeIcone]> = [
    ['topo', 'Resumo', 'casa'],
    ['plano', 'Seu plano', 'cadeado'],
    ...(podeAmpliar ? [['ampliar', 'Ampliar o plano', 'estrela'] as [IdSecao, string, NomeIcone]] : []),
    ...(a.comAcesso ? [['renovacao', 'Renovação', 'reiniciar'] as [IdSecao, string, NomeIcone]] : []),
    ['garantia', 'Garantia de 7 dias', 'certo'],
    ['recibos', 'Recibos', 'impressora'],
    ['duvidas', 'Dúvidas', 'interrogacao'],
  ]

  return (
    <article className="dpg asn">
      <Navegacao secoes={secoes} />

      <div className="dp-conteudo">
        {/* ---------- Topo: a arte do baú e, no mesmo painel, o essencial (os dias em destaque) ---------- */}
        <section className="dp-topo asn-topo" id="asn-topo" aria-labelledby="asn-titulo">
          <div className="dp-topo__cena asn-topo__cena">
            <Arte />
            <div className="dp-topo__titulo">
              <p className="dp-rotulo dp-rotulo--claro"><Icone nome="cadeado" tamanho={14} /> Minha assinatura</p>
              <h1 id="asn-titulo">{nome ? `${nome}, sua assinatura` : 'Sua assinatura'}</h1>
            </div>
          </div>
          <div className="dp-topo__painel asn-topo__painel">
            <div className="dp-topo__mensagem">
              {a.carregando ? <p className="dp-mensagem" role="status">Carregando a sua assinatura…</p>
                : a.falhou ? <p className="dp-mensagem" role="alert">Não deu para carregar a assinatura agora. <button type="button" className="dp-botao" onClick={() => void a.atualizar()}>Tentar de novo</button></p>
                  : a.comAcesso && a.fimAcesso ? <p className="dp-mensagem">
                    Seu <b>{nomePlano.toLowerCase()}</b> está <b>{a.renovacaoDesligada ? 'ativo até o fim do período' : 'em dia'}</b>. Você tem <b>{dias(restam)}</b> de acesso ilimitado, ou {duracao(agora, a.fimAcesso)}, até <b>{dataBr(a.fimAcesso)}</b>.
                    {a.pixAtivo ? <> Pago no Pix, sem cobrança automática.</> : a.renovacaoDesligada ? <> Não haverá nova cobrança.</> : <> A próxima cobrança é em <b>{dataBr(estado?.fim_periodo)}</b>, no mesmo cartão.</>}
                  </p>
                    : <p className="dp-mensagem">Você está no <b>plano gratuito</b>. {MENSAGENS_STATUS[a.status]?.explicacao ?? 'Pode estudar normalmente; com um plano, o cronograma, os simulados e as questões ficam sem limite.'}</p>}
              <div className="asn-acoes">
                {a.comAcesso
                  ? <a className="dp-botao dp-botao--principal" href={href('/cronograma')}>Abrir o cronograma <Icone nome="direita" tamanho={16} /></a>
                  : <a className="dp-botao dp-botao--principal" href={href('/assinatura')}>Ver os planos <Icone nome="direita" tamanho={16} /></a>}
                {podeAmpliar && <a className="dp-botao" href="#asn-ampliar" onClick={(e) => { e.preventDefault(); document.getElementById('asn-ampliar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}><Icone nome="estrela" tamanho={15} /> Ampliar o plano</a>}
              </div>
            </div>
            <div className="asn-dias" aria-label="Dias de acesso">
              <p className="dp-rotulo"><Icone nome="calendario" tamanho={14} /> Dias de acesso</p>
              {a.comAcesso && a.fimAcesso ? <>
                <p className="asn-dias__numero"><b>{restam.toLocaleString('pt-BR')}</b><span>{restam === 1 ? 'dia' : 'dias'}</span></p>
                <p className="asn-dias__meses">{duracao(agora, a.fimAcesso)} · até {dataBr(a.fimAcesso)}</p>
                <BarraDias restam={restam} />
              </> : <p className="asn-dias__vazio">{a.carregando ? 'Carregando…' : 'Sem período pago agora.'}</p>}
            </div>
          </div>
          <dl className="dp-numeros asn-numeros">
            <div className="dp-numero"><dt>Plano</dt><dd><b className="asn-numero__texto">{nomePlano.replace('Plano ', '')}</b><small>{planoAtual ? `${planoAtual.meses === 1 ? '1 mês' : `${planoAtual.meses} meses`} por período` : 'sem cobrança'}</small></dd></div>
            <div className="dp-numero"><dt>Pagamento</dt><dd><b className="asn-numero__texto">{a.meio === 'pix' ? 'Pix' : a.meio === 'cartao' || a.comAcesso ? 'Cartão' : '—'}</b><small>{meio}</small></dd></div>
            <div className="dp-numero"><dt>{cartaoRenovando ? 'Próxima cobrança' : 'Última cobrança'}</dt><dd><b className="asn-numero__texto">{cartaoRenovando ? diaMesAno(estado?.fim_periodo) : diaMesAno(estado?.ultima_cobranca_em)}</b><small>{cartaoRenovando ? `última em ${dataBr(estado?.ultima_cobranca_em)}` : estado?.ultima_cobranca_em ? 'aprovada pelo Mercado Pago' : 'nenhuma ainda'}</small></dd></div>
          </dl>
        </section>

        {/* ---------- Seu plano ---------- */}
        <Secao id="plano" rotulo="Seu plano" icone="cadeado" titulo="O que está valendo agora" texto="A situação da assinatura, como ela é paga e as datas que importam.">
          <div className="dp-cartao">
            <dl className="asn-ficha">
              <div><dt>Plano</dt><dd>{nomePlano}</dd></div>
              <div><dt>Situação</dt><dd><span className={'asn-estado' + (a.comAcesso ? ' asn-estado--ok' : '')}><i aria-hidden="true" />{statusExibido}</span></dd></div>
              {a.comAcesso && <div><dt>Pagamento</dt><dd>{meio}</dd></div>}
              {(a.comAcesso || estado?.fim_periodo) && <div><dt>{a.pixAtivo || a.renovacaoDesligada ? 'Acesso até' : a.comAcesso ? 'Próxima cobrança' : 'Fim do último período'}</dt><dd>{dataBr(a.fimAcesso ?? estado?.fim_periodo)}</dd></div>}
              {a.comAcesso && a.fimAcesso && <div><dt>Dias de acesso</dt><dd>{dias(restam)} ({duracao(agora, a.fimAcesso)})</dd></div>}
              {estado?.ultima_cobranca_em && <div><dt>Última cobrança</dt><dd>{dataBr(estado.ultima_cobranca_em)}</dd></div>}
            </dl>
            {!a.comAcesso && estado?.plano && <p className="asn-nota">Plano desta assinatura: {estado.plano}. {MENSAGENS_STATUS[a.status]?.explicacao}</p>}
            {!a.comAcesso && <a className="dp-botao dp-botao--principal asn-botao-inicio" href={href('/assinatura')}>Conhecer os planos <Icone nome="direita" tamanho={16} /></a>}
            <p className="asn-nota"><Icone nome="certo" tamanho={14} /> Tudo o que você estudou fica salvo, com ou sem plano: respostas, revisões, anotações e cronograma.</p>
          </div>
        </Secao>

        {/* ---------- Ampliar ---------- */}
        {podeAmpliar && planoAtual && a.fimAcesso && <Secao id="ampliar" rotulo="Ampliar o plano" icone="estrela" titulo="Estudar por mais tempo, pagando menos por mês"
          texto={<>O plano novo começa quando o {planoAtual.nome.toLowerCase()} termina, em <b>{diaMes(a.fimAcesso)}</b>. Os <b>{dias(restam)}</b> que você tem continuam seus, e nada é cobrado em dobro.</>}>
          <AmpliarPlano atual={planoAtual} opcoes={opcoesAmpliar} fim={a.fimAcesso} cartao={!a.pixAtivo} estilo="dp" titulo={false}
            aoAmpliar={(p) => navegar(`/assinatura?ampliar=${p.id}`)} />
        </Secao>}

        {/* ---------- Renovação ---------- */}
        {a.comAcesso && <Secao id="renovacao" rotulo="Renovação" icone="reiniciar"
          titulo={a.pixAtivo ? 'Renovar o seu Pix sem perder nenhum dia' : a.renovacaoDesligada ? 'A renovação automática está desligada' : 'A renovação automática está ligada'}
          texto={a.pixAtivo ? 'O Pix não renova sozinho. Nos 7 dias finais, você renova pelo Pix ou passa para o cartão, e os dias que faltam se somam ao período novo.' : 'Desligar a renovação não cancela nada: você continua assinante até o fim do período já pago.'}>
          {a.fimPix ? <>
            <RenovacaoPix fim={a.fimPix} aoRenovar={() => navegar('/assinatura')} />
          </> : <div className={'dp-cartao asn-renovacao' + (a.renovacaoDesligada ? ' asn-renovacao--desligada' : '')}>
            <div className="asn-renovacao__topo">
              <h3>Renovação automática</h3>
              <span className={'asn-estado' + (a.renovacaoDesligada ? '' : ' asn-estado--ok')}><i aria-hidden="true" />{a.renovacaoDesligada ? 'Desligada' : 'Ligada'}</span>
            </div>
            {a.renovacaoDesligada ? <>
              <p>Seu acesso continua ilimitado até <b>{dataBr(estado?.fim_periodo)}</b>, daqui a <b>{dias(restam)}</b>. Não haverá nova cobrança.</p>
              <p className="asn-nota">Quer continuar depois dessa data? É só assinar de novo; seu histórico fica salvo.</p>
              <a className="dp-botao dp-botao--principal asn-botao-inicio" href={href('/assinatura')}>Ver os planos <Icone nome="direita" tamanho={16} /></a>
            </> : <>
              <p>Próxima cobrança em <b>{dataBr(estado?.fim_periodo)}</b>, no mesmo cartão{planoAtual ? <>, de mais {planoAtual.meses === 1 ? '1 mês' : `${planoAtual.meses} meses`}</> : null}.</p>
              {planoAtual && a.fimAcesso && <ContaDias fimAtual={a.fimAcesso} meses={planoAtual.meses} rotuloCompra="Na renovação" compacta />}
              <ul className="asn-lista">
                <li><Icone nome="certo" tamanho={15} /><span>Desligar <b>não cancela</b> a assinatura: você continua assinante até {dataBr(estado?.fim_periodo)}.</span></li>
                <li><Icone nome="certo" tamanho={15} /><span>Só a próxima cobrança deixa de acontecer.</span></li>
                <li><Icone nome="certo" tamanho={15} /><span>Suas respostas, revisões e anotações continuam salvas.</span></li>
              </ul>
              <button className="dp-botao asn-botao-inicio" type="button" disabled={processando} onClick={() => { definirAcaoPendente('cancelar'); definirMensagem('') }}>Desligar a renovação automática</button>
            </>}
          </div>}
        </Secao>}

        {acaoPendente === 'cancelar' && <Confirmacao titulo="Desligar a renovação automática?" texto={`Você continua assinante, com acesso ilimitado, até ${dataBr(estado?.fim_periodo)}. Só a próxima cobrança deixa de acontecer; a já feita não é reembolsada.`}
          confirmar="Sim, desligar a renovação" processando={processando} aoConfirmar={() => void gerenciar('cancelar')} aoVoltar={() => definirAcaoPendente(null)} />}

        {/* ---------- Garantia ---------- */}
        <Secao id="garantia" rotulo="Garantia de 7 dias" icone="certo" titulo={a.garantia ? 'Ainda dá para desistir com reembolso integral' : 'Como funciona a garantia'}
          texto="Até 7 dias depois de cada cobrança, o reembolso integral é um botão. Depois disso, desligar a renovação mantém o acesso até o fim do período pago.">
          <div className="dp-cartao asn-garantia">
            {a.garantia && a.fimGarantia ? <>
              <p>A garantia da última cobrança ({dataBr(estado?.ultima_cobranca_em)}) vale até <b>{dataBr(a.fimGarantia)}</b>, daqui a <b>{dias(diasEntre(agora, a.fimGarantia))}</b>. Se o Mercado Pago confirmar o reembolso, esta assinatura termina, o acesso volta ao gratuito e o seu histórico continua salvo.</p>
              <button className="dp-botao asn-botao-inicio asn-botao-alerta" type="button" disabled={processando} onClick={() => { definirAcaoPendente('reembolsar'); definirMensagem('') }}>Desistir e solicitar reembolso integral</button>
            </> : <p>{estado?.ultima_cobranca_em && a.fimGarantia
              ? <>A garantia da última cobrança ({dataBr(estado.ultima_cobranca_em)}) terminou em <b>{dataBr(a.fimGarantia)}</b>. A próxima cobrança, se houver, ganha uma garantia nova de 7 dias.</>
              : <>Assim que houver uma cobrança, você tem 7 dias para pedir o reembolso integral aqui mesmo, com um botão.</>}</p>}
          </div>
          {acaoPendente === 'reembolsar' && <Confirmacao titulo="Confirmar o pedido de reembolso integral?" texto="O pedido vai para o Mercado Pago. Só depois da confirmação do reembolso o acesso pago termina; suas respostas e revisões continuam salvas."
            confirmar="Confirmar o pedido de reembolso" processando={processando} aoConfirmar={() => void gerenciar('reembolsar')} aoVoltar={() => definirAcaoPendente(null)} />}
        </Secao>

        {mensagem && <p className="asn-mensagem" role="status">{mensagem}</p>}

        {/* ---------- Recibos ---------- */}
        <Secao id="recibos" rotulo="Recibos" icone="impressora" titulo="Comprovantes dos pagamentos" texto="Cada pagamento aprovado tem um recibo pronto para imprimir ou salvar em PDF.">
          <div className="dp-cartao asn-recibos"><Recibos /></div>
        </Secao>

        {/* ---------- Dúvidas ---------- */}
        <Secao id="duvidas" rotulo="Dúvidas" icone="interrogacao" titulo="Perguntas sobre a assinatura" texto="As respostas curtas para o que mais perguntam. Se faltar alguma, o suporte responde.">
          <div className="dp-cartao asn-duvidas">
            <details><summary>Posso passar do mensal para o semestral ou o anual?</summary><p>Pode, a qualquer momento, na seção "Ampliar o plano". O plano novo começa quando o atual termina: os dias que você tem continuam valendo e nada é cobrado em dobro. No cartão, a renovação do plano antigo é desligada sozinha.</p></details>
            <details><summary>Como renovo um plano pago no Pix?</summary><p>Nos 7 dias finais do período, aparece o botão de renovar. Você paga pelo Pix ou deixa no cartão, que só cobra quando o Pix termina. Os dias que faltam se somam ao período novo.</p></details>
            <details><summary>Desligar a renovação cancela a assinatura?</summary><p>Não. Você continua assinante, com tudo liberado, até o fim do período já pago. Só a próxima cobrança deixa de acontecer.</p></details>
            <details><summary>Como funciona a garantia de 7 dias?</summary><p>Até 7 dias depois de cada cobrança, o reembolso integral é um botão nesta página. O Mercado Pago devolve o valor no mesmo meio de pagamento, e o seu histórico de estudos continua salvo.</p></details>
            <details><summary>O que acontece com o meu estudo se o plano acabar?</summary><p>Nada se perde. A conta volta ao plano gratuito com todas as respostas, revisões, anotações e o cronograma guardados. Assinando de novo, tudo volta como estava.</p></details>
          </div>
        </Secao>

        {/* ---------- Fim ---------- */}
        <aside className="dp-convite asn-fim" aria-labelledby="asn-fim-titulo">
          <div>
            <p className="dp-rotulo"><Icone nome="interrogacao" tamanho={14} /> Precisa de ajuda?</p>
            <h3 id="asn-fim-titulo">Alguma dúvida sobre cobrança, renovação ou reembolso?</h3>
            <p>Escreva para o suporte: a gente responde com calma e resolve com você.</p>
          </div>
          <a className="dp-botao dp-botao--principal dp-botao--grande" href={href('/contato?assunto=assinatura')}>Falar com o suporte <Icone nome="direita" tamanho={18} /></a>
        </aside>
      </div>
    </article>
  )
}

const diaMesAno = (valor: string | null | undefined) => valor ? new Date(valor).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

/** A barra dos dias: quanto do mês (ou do período) ainda resta, com a escala em semanas. */
function BarraDias({ restam }: { restam: number }) {
  const escala = restam > 62 ? Math.ceil(restam / 30) * 30 : restam > 31 ? 62 : 31
  return <div className="asn-dias__barra" aria-hidden="true"><span style={{ width: `${Math.min(100, (restam / escala) * 100)}%` }} /></div>
}

function Confirmacao({ titulo, texto, confirmar, processando, aoConfirmar, aoVoltar }: { titulo: string; texto: string; confirmar: string; processando: boolean; aoConfirmar: () => void; aoVoltar: () => void }) {
  return <section className="dp-cartao asn-confirmacao" aria-label={titulo}>
    <h3>{titulo}</h3>
    <p>{texto}</p>
    <div className="asn-acoes">
      <button className="dp-botao dp-botao--principal" type="button" disabled={processando} onClick={aoConfirmar}>{confirmar}</button>
      <button className="dp-botao" type="button" disabled={processando} onClick={aoVoltar}>Voltar</button>
    </div>
  </section>
}
