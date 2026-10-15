import { useEffect, useState } from 'react'
import { recurso } from '../config'
import { usarConta } from '../conta/ContextoConta'
import {
  DIAS_POR_AMIGO, LIMITE_AMIGOS, QUESTOES_PARA_CONFIRMAR, guardarConviteRecebido, linkIndicacao,
  previaConvite, textoIndicacao, usarMinhaIndicacao,
} from '../conta/indicacao'
import { BotaoGoogle } from '../componentes/BotaoGoogle'
import { IconeWhatsapp } from '../componentes/ConviteCompartilhar'
import { Icone } from '../componentes/Icone'
import { href } from '../util/rotas'
import '../estilos/paginas/Indicar.css'

function Regras() {
  return (
    <ol className="ind-passos">
      <li><img src={recurso('ranking/carta.png')} width={40} height={40} alt="" draggable={false} /><div><strong>Mande o seu link</strong><span>No grupo da residência, no WhatsApp de um colega, onde quiser.</span></div></li>
      <li><img src={recurso('pixel/treinar.png')} width={40} height={40} alt="" draggable={false} /><div><strong>O colega cria a conta e responde {QUESTOES_PARA_CONFIRMAR} questões</strong><span>Pelo Google leva um toque. As {QUESTOES_PARA_CONFIRMAR} questões mostram que é gente de verdade estudando.</span></div></li>
      <li><img src={recurso('pixel/planos.png')} width={40} height={40} alt="" draggable={false} /><div><strong>Vocês dois ganham {DIAS_POR_AMIGO} dias do plano completo</strong><span>Sem limite de questões, Cronograma e tudo o que os planos liberam. Vale para até {LIMITE_AMIGOS} amigos.</span></div></li>
    </ol>
  )
}

/** #/indicar: o link pessoal, os botões de envio e o placar das indicações. */
export function Indicar() {
  const { sessao } = usarConta()
  const { dados, carregado } = usarMinhaIndicacao(sessao?.user.id)
  const [copiado, definirCopiado] = useState(false)
  const link = dados ? linkIndicacao(dados.codigo) : ''

  async function copiar() {
    try { await navigator.clipboard.writeText(link) } catch { window.prompt('Copie o seu link:', link) }
    definirCopiado(true); window.setTimeout(() => definirCopiado(false), 2500)
  }
  async function compartilhar() {
    if (!dados) return
    try { await navigator.share({ title: 'Orto Questões', text: textoIndicacao(dados.codigo) }) } catch { /* cancelado */ }
  }

  return (
    <div className="conteudo empilha ind">
      <section className="ind-heroi">
        <div className="ind-heroi__arte" aria-hidden="true">
          <img src={recurso('ranking/mensageiro.png')} width={72} height={90} alt="" draggable={false} />
          <img src={recurso('pixel/planos.png')} width={64} height={64} alt="" draggable={false} />
        </div>
        <div>
          <p className="ind-heroi__selo">Missão: recrute seus amigos</p>
          <h1>Indique e ganhe <em>{DIAS_POR_AMIGO} dias</em> do plano completo</h1>
          <p>O Orto Questões cresce no boca a boca. Cada colega que entra pelo seu link e responde {QUESTOES_PARA_CONFIRMAR} questões vale {DIAS_POR_AMIGO} dias grátis para você e {DIAS_POR_AMIGO} para ele.</p>
        </div>
      </section>

      {!sessao && <section className="ind-cartao empilha">
        <h2>Entre para pegar o seu link</h2>
        <p className="texto-2">O link é pessoal: é por ele que o site sabe quem convidou quem.</p>
        <BotaoGoogle separador={false} />
        <a className="botao botao--principal" href={href('/conta?modo=criar')}>Criar conta com e-mail</a>
      </section>}

      {sessao && !carregado && <p className="texto-2" role="status">Preparando o seu link…</p>}
      {sessao && carregado && !dados && <p className="aviso-formulario aviso-formulario--erro" role="alert">Não foi possível carregar o seu link agora. Recarregue a página em instantes.</p>}

      {dados && <section className="ind-cartao empilha">
        <h2>Seu link</h2>
        <div className="ind-link"><code>{link}</code></div>
        <div className="ind-acoes">
          <a className="ind-acoes__whatsapp" href={`https://wa.me/?text=${encodeURIComponent(textoIndicacao(dados.codigo))}`} target="_blank" rel="noopener noreferrer"><IconeWhatsapp tamanho={18} /> Enviar no WhatsApp</a>
          <button type="button" className="botao" onClick={() => void copiar()}><Icone nome={copiado ? 'certo' : 'link'} tamanho={16} /> {copiado ? 'Link copiado' : 'Copiar link'}</button>
          {'share' in navigator && <button type="button" className="botao" onClick={() => void compartilhar()}>Mais opções</button>}
        </div>
        <dl className="ind-placar">
          <div><dt>Amigos que entraram</dt><dd>{dados.convidados}</dd></div>
          <div><dt>Confirmados ({QUESTOES_PARA_CONFIRMAR} questões)</dt><dd>{dados.confirmados}<small> de {dados.limite}</small></dd></div>
          <div><dt>Dias ganhos</dt><dd>{dados.dias_ganhos}</dd></div>
        </dl>
        {dados.cortesia_ate && new Date(dados.cortesia_ate) > new Date() && <p className="ind-ate"><Icone nome="certo" tamanho={14} /> Plano completo liberado até {new Date(dados.cortesia_ate).toLocaleDateString('pt-BR')}.</p>}
        {dados.fui_convidado && !dados.minha_confirmada && <p className="texto-2">Você entrou por convite: ao chegar a {QUESTOES_PARA_CONFIRMAR} questões respondidas, os seus {DIAS_POR_AMIGO} dias são liberados.</p>}
      </section>}

      <section className="ind-cartao empilha">
        <h2>Como funciona</h2>
        <Regras />
        <p className="meta">Os dias entram depois de uma assinatura paga que esteja ativa, então nada se perde. Contas novas só podem usar um convite, e indicações para si mesmo não contam.</p>
      </section>
    </div>
  )
}

/** #/convite/CODIGO: quem recebeu o link vê quem convidou e cria a conta. */
export function ConviteRecebido({ codigo }: { codigo: string }) {
  const { sessao } = usarConta()
  const [quem, definirQuem] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    guardarConviteRecebido(codigo)
    let ativo = true
    void previaConvite(codigo).then((nome) => { if (ativo) definirQuem(nome) })
    return () => { ativo = false }
  }, [codigo])

  return (
    <div className="conteudo empilha ind">
      <section className="ind-heroi">
        <div className="ind-heroi__arte" aria-hidden="true">
          <img src={recurso('ranking/mensageiro.png')} width={72} height={90} alt="" draggable={false} />
          <img src={recurso('ranking/carta.png')} width={56} height={56} alt="" draggable={false} />
        </div>
        <div>
          <p className="ind-heroi__selo">Você recebeu um convite</p>
          <h1>{quem ? <>{quem} te chamou para <em>treinar junto</em></> : quem === null ? 'Convite não encontrado' : <>Um colega te chamou para <em>treinar junto</em></>}</h1>
          <p>{quem === null
            ? 'Este link de convite não existe ou foi digitado errado. Você ainda pode criar sua conta grátis e treinar normalmente.'
            : `Questões das provas oficiais (TEOT, TARO e outras), comentadas alternativa por alternativa. Crie sua conta grátis e responda ${QUESTOES_PARA_CONFIRMAR} questões: vocês dois ganham ${DIAS_POR_AMIGO} dias do plano completo.`}</p>
        </div>
      </section>
      {sessao
        ? <section className="ind-cartao empilha">
            <h2>Você já está na sua conta</h2>
            <p className="texto-2">O convite vale para contas criadas nos últimos 7 dias. Se a sua for nova, ele já foi aplicado: é só treinar.</p>
            <a className="botao botao--principal" href={href('/treinar')}>Começar a treinar</a>
          </section>
        : <section className="ind-cartao empilha">
            <h2>Crie sua conta grátis</h2>
            <BotaoGoogle separador={false} />
            <a className="botao botao--principal" href={href('/conta?modo=criar')}>Criar conta com e-mail</a>
            <p className="meta">Já tem conta? <a href={href('/conta')}>Entrar</a>. O convite vale para contas criadas a partir dele.</p>
          </section>}
      <section className="ind-cartao empilha">
        <h2>Como funciona</h2>
        <Regras />
      </section>
    </div>
  )
}
