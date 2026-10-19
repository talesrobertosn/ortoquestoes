import { useMemo, useState, type FormEvent } from 'react'
import { AcoesDeEmail } from '../componentes/AcoesDeEmail'
import { primeiroNome } from '../componentes/Cabecalho'
import { Icone, type NomeIcone } from '../componentes/Icone'
import { SITE } from '../config'
import { usarConta } from '../conta/ContextoConta'
import { chave as chaveSupabase, url as urlSupabase } from '../conta/supabase'
import { href } from '../util/rotas'
import '../estilos/paginas/Contato.css'

/*
 * Suporte (/contato), refeito em 19/10/2026: escolher o motivo, escrever e enviar. A mensagem
 * vai pela função "suporte" (supabase/functions/suporte) direto para o e-mail do Tales
 * (SITE.contato), com "responder para" no e-mail de quem escreveu. Se a função falhar ou
 * ainda não estiver publicada, a página mostra o caminho de reserva de antes: copiar, abrir
 * no Gmail ou no aplicativo de e-mail.
 */

const ASSUNTOS_SUPORTE = [
  { id: 'assinatura', titulo: 'Assinatura ou cobrança', descricao: 'Plano, renovação, cancelamento ou reembolso.', icone: 'medalha' },
  { id: 'acesso', titulo: 'Acesso à conta', descricao: 'Entrar, senha ou sincronização.', icone: 'cadeado' },
  { id: 'questao', titulo: 'Questão ou comentário', descricao: 'Gabarito, imagem ou enunciado.', icone: 'livro' },
  { id: 'dados', titulo: 'Meus dados', descricao: 'Privacidade, exportação ou exclusão da conta.', icone: 'usuario' },
  { id: 'outro', titulo: 'Outro assunto', descricao: 'Dúvida, sugestão ou elogio.', icone: 'correio' },
] as const satisfies ReadonlyArray<{ id: string; titulo: string; descricao: string; icone: NomeIcone }>
type AssuntoSuporte = typeof ASSUNTOS_SUPORTE[number]['id']

function assuntoInicial(consulta: URLSearchParams): AssuntoSuporte {
  if (consulta.has('questao')) return 'questao'
  const assunto = consulta.get('assunto')
  if (assunto === 'exclusao-conta') return 'dados'
  if (assunto === 'sincronizacao') return 'acesso'
  return 'outro'
}

function modeloSuporte(tipo: AssuntoSuporte, questao: string | null, exclusao: boolean): string {
  if (exclusao) return 'Solicito a exclusão da minha conta e dos dados pessoais associados.\n\nInformações adicionais (opcional): '
  if (tipo === 'questao') return `Questão: ${questao ?? '(identificador, se souber)'}\nO que encontrei: \nO que esperava: `
  if (tipo === 'assinatura') return 'O que aconteceu com minha assinatura ou cobrança: \nData aproximada: \nO que esperava: '
  if (tipo === 'acesso') return 'O que aconteceu ao entrar ou sincronizar: \nAparelho/navegador: \nMensagem exibida (sem senha ou código): '
  if (tipo === 'dados') return 'Minha dúvida ou solicitação sobre meus dados: '
  return 'Como podemos ajudar?\n\nDetalhes úteis: '
}

/** O que a página coleta para ajudar a entender o problema (vai junto da mensagem). */
function contextoDoAparelho() {
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return '' } })()
  return {
    pagina: window.location.href,
    navegador: navigator.userAgent,
    tela: `${window.innerWidth}x${window.innerHeight} (${Math.round((window.devicePixelRatio || 1) * 10) / 10}x)`,
    tema: document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro',
    idioma: navigator.language,
    fuso: tz,
  }
}

const emailValido = (e: string) => /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(e.trim())

const MOTIVO_FALHA: Record<string, string> = {
  muitas_mensagens: 'Já chegaram algumas mensagens suas há pouco. Espere uns minutos ou mande pelo seu e-mail.',
  email_invalido: 'O e-mail para resposta parece incompleto. Confira o campo acima.',
  mensagem_curta: 'A mensagem ficou curta demais para enviar.',
}

type Estado = { fase: 'editando' } | { fase: 'enviando' } | { fase: 'enviado'; para: string } | { fase: 'falhou'; motivo: string }

async function enviarSuporte(corpo: Record<string, unknown>, token?: string): Promise<void> {
  if (!urlSupabase || !chaveSupabase) throw new Error('sem_servidor')
  const controle = new AbortController()
  const prazo = window.setTimeout(() => controle.abort(), 20_000)
  try {
    const resposta = await fetch(`${urlSupabase.replace(/\/+$/, '')}/functions/v1/suporte`, {
      method: 'POST', signal: controle.signal,
      headers: { apikey: chaveSupabase, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(corpo),
    })
    const dados = await resposta.json().catch(() => ({})) as { ok?: boolean; erro?: string }
    if (!resposta.ok || dados.erro) throw new Error(dados.erro ?? `http_${resposta.status}`)
  } finally {
    window.clearTimeout(prazo)
  }
}

export function Contato({ consulta }: { consulta: URLSearchParams }) {
  const { sessao } = usarConta()
  const nome = primeiroNome(sessao?.user.user_metadata?.nome)
  const questao = consulta.get('questao')
  const exclusao = consulta.get('assunto') === 'exclusao-conta'
  const [tipo, definirTipo] = useState<AssuntoSuporte>(() => assuntoInicial(consulta))
  const [mensagem, definirMensagem] = useState(() => modeloSuporte(assuntoInicial(consulta), questao, exclusao))
  const [email, definirEmail] = useState(() => sessao?.user.email ?? '')
  const [emailTocado, definirEmailTocado] = useState(false)
  const [isca, definirIsca] = useState('')
  const [estado, definirEstado] = useState<Estado>({ fase: 'editando' })
  const [aviso, definirAviso] = useState('')
  const contexto = useMemo(contextoDoAparelho, [])
  // O e-mail da conta pode chegar depois da primeira pintura: preenche se o campo ainda estiver vazio.
  const emailConta = sessao?.user.email ?? ''
  const emailFinal = emailTocado ? email : (email || emailConta)

  const tituloAssunto = ASSUNTOS_SUPORTE.find(item => item.id === tipo)?.titulo ?? 'Outro assunto'
  const assunto = exclusao && tipo === 'dados' ? 'Orto Questões — solicitação de exclusão da conta' : questao && tipo === 'questao'
    ? `Orto Questões — questão ${questao}` : `Orto Questões — ${tituloAssunto}`
  const modeloAtual = modeloSuporte(tipo, questao, exclusao && tipo === 'dados')
  const corpoReserva = `${mensagem}\n\n---\nPágina: ${contexto.pagina}\nNavegador: ${contexto.navegador}\nTela: ${contexto.tela}`

  function selecionarTipo(novoTipo: AssuntoSuporte) {
    if (novoTipo === tipo) return
    definirTipo(novoTipo)
    if (mensagem === modeloAtual) definirMensagem(modeloSuporte(novoTipo, questao, exclusao && novoTipo === 'dados'))
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const texto = mensagem.trim()
    if (texto.length < 10 || mensagem === modeloAtual) { definirAviso('Escreva o que aconteceu antes de enviar. Pode ser curto.'); return }
    if (!emailValido(emailFinal)) { definirAviso('Coloque um e-mail para a resposta chegar até você.'); return }
    definirAviso('')
    definirEstado({ fase: 'enviando' })
    try {
      await enviarSuporte({
        motivo: tipo, assunto, mensagem: texto, email: emailFinal.trim(), nome: String(sessao?.user.user_metadata?.nome ?? ''),
        questao: questao ?? undefined, contexto, site: isca,
      }, sessao?.access_token)
      definirEstado({ fase: 'enviado', para: emailFinal.trim() })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (falha) {
      definirEstado({ fase: 'falhou', motivo: falha instanceof Error ? falha.message : '' })
    }
  }

  function escreverOutra() {
    definirTipo('outro')
    definirMensagem(modeloSuporte('outro', null, false))
    definirEstado({ fase: 'editando' })
  }

  const enviando = estado.fase === 'enviando'

  return <article className="sp">
    <header className="sp-heroi">
      <div className="sp-heroi__texto">
        <p className="tr-heroi__selo">Suporte</p>
        <h1>{nome ? `${nome}, como posso ajudar?` : 'Como posso ajudar?'}</h1>
        <p>Escolha o motivo, escreva e envie. A mensagem chega direto no e-mail do {SITE.autor}, e a resposta vem no seu e-mail.</p>
      </div>
      <ol className="sp-trilha" aria-label="Como funciona">
        <li><span className="px-numero" aria-hidden="true">1</span><span>Motivo</span></li>
        <li><span className="px-numero" aria-hidden="true">2</span><span>Mensagem</span></li>
        <li><span className="px-numero" aria-hidden="true">3</span><span>Enviar</span></li>
      </ol>
    </header>

    {estado.fase === 'enviado' ? (
      <section className="sp-cartao sp-sucesso" aria-labelledby="sp-sucesso-titulo" role="status">
        <span className="sp-sucesso__selo" aria-hidden="true"><Icone nome="certo" tamanho={30} espesso={2.6} /></span>
        <div>
          <h2 id="sp-sucesso-titulo">Mensagem enviada{nome ? `, ${nome}` : ''}.</h2>
          <p>Ela já está no e-mail do {SITE.autor}. A resposta vai para <strong className="numerico">{estado.para}</strong>; se não aparecer na caixa de entrada, olhe também em Promoções ou Spam.</p>
          <div className="sp-sucesso__acoes">
            <a className="botao sp-botao-ouro" href={href('/treinar')}>Voltar a estudar</a>
            <button type="button" className="botao" onClick={escreverOutra}>Escrever outra mensagem</button>
          </div>
        </div>
      </section>
    ) : (
      <form className="sp-form" onSubmit={enviar} noValidate>
        <section className="sp-cartao" aria-labelledby="sp-motivo">
          <header className="sp-cartao__cabeca">
            <span className="px-numero" aria-hidden="true">1</span>
            <div><h2 id="sp-motivo">Qual é o motivo?</h2><p>O motivo prepara um modelo de mensagem; você só completa.</p></div>
          </header>
          <div className="sp-motivos" role="group" aria-labelledby="sp-motivo">
            {ASSUNTOS_SUPORTE.map(item => (
              <button type="button" key={item.id} className="sp-motivo" aria-pressed={tipo === item.id} onClick={() => selecionarTipo(item.id)} disabled={enviando}>
                <span className="sp-motivo__icone" aria-hidden="true"><Icone nome={item.icone} tamanho={18} /></span>
                <span className="sp-motivo__texto"><strong>{item.titulo}</strong><span>{item.descricao}</span></span>
              </button>
            ))}
          </div>
        </section>

        <section className="sp-cartao" aria-labelledby="sp-mensagem">
          <header className="sp-cartao__cabeca">
            <span className="px-numero" aria-hidden="true">2</span>
            <div><h2 id="sp-mensagem">Escreva o que aconteceu</h2><p>Se for sobre pagamento, diga a data aproximada e o plano. Nunca mande senha, código ou número de cartão.</p></div>
          </header>
          <label className="sp-rotulo" htmlFor="mensagem-suporte">Sua mensagem</label>
          <textarea id="mensagem-suporte" className="entrada sp-mensagem" value={mensagem} onChange={evento => { definirMensagem(evento.target.value); if (aviso) definirAviso('') }} rows={7} disabled={enviando} aria-describedby={aviso ? 'sp-aviso' : undefined} />
          <div className="sp-email">
            <label className="sp-rotulo" htmlFor="email-suporte">E-mail para a resposta</label>
            <input id="email-suporte" className="entrada" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" value={emailFinal} onChange={evento => { definirEmailTocado(true); definirEmail(evento.target.value) }} disabled={enviando} required />
            {emailConta && emailFinal === emailConta && <small>É o e-mail da sua conta. Pode trocar, se preferir outro.</small>}
          </div>
          {/* Campo-isca: escondido de quem usa o site; só robô preenche. */}
          <label className="sp-isca" aria-hidden="true">Site<input tabIndex={-1} autoComplete="off" value={isca} onChange={evento => definirIsca(evento.target.value)} /></label>
        </section>

        <section className="sp-cartao sp-envio" aria-labelledby="sp-enviar">
          <header className="sp-cartao__cabeca">
            <span className="px-numero" aria-hidden="true">3</span>
            <div><h2 id="sp-enviar">Enviar</h2><p>Junto vão a página, o navegador e o tamanho da tela, para ajudar a entender o problema.</p></div>
          </header>
          {aviso && <p className="sp-alerta" id="sp-aviso" role="alert"><Icone nome="alerta" tamanho={18} /> {aviso}</p>}
          <div className="sp-envio__linha">
            <button type="submit" className="botao sp-botao-ouro sp-botao-enviar" disabled={enviando}>
              <Icone nome="correio" tamanho={18} />
              {enviando ? 'Enviando…' : 'Enviar mensagem'}
            </button>
            <details className="sp-detalhes">
              <summary>Ver o que vai junto</summary>
              <dl>
                <div><dt>Página</dt><dd>{contexto.pagina}</dd></div>
                <div><dt>Navegador</dt><dd>{contexto.navegador}</dd></div>
                <div><dt>Tela</dt><dd>{contexto.tela}</dd></div>
                <div><dt>Tema</dt><dd>{contexto.tema}</dd></div>
              </dl>
            </details>
          </div>

          {estado.fase === 'falhou' && (
            <div className="sp-reserva" role="alert">
              <p className="sp-reserva__titulo"><Icone nome="alerta" tamanho={18} /> Não deu para enviar daqui agora.</p>
              <p>{MOTIVO_FALHA[estado.motivo] ?? 'Sua mensagem continua escrita acima. Mande pelo seu e-mail: um toque copia o texto ou abre o rascunho pronto.'}</p>
              <AcoesDeEmail para={SITE.contato} assunto={assunto} corpo={corpoReserva} rotuloCopiar="Copiar mensagem" />
            </div>
          )}
        </section>
      </form>
    )}

    {estado.fase !== 'falhou' && estado.fase !== 'enviado' && (
      <details className="sp-cartao sp-direto">
        <summary><Icone nome="correio" tamanho={18} /> Prefere escrever do seu e-mail? <span className="numerico">{SITE.contato}</span></summary>
        <AcoesDeEmail para={SITE.contato} assunto={assunto} corpo={corpoReserva} rotuloCopiar="Copiar mensagem" />
      </details>
    )}

    <section className="sp-faq" aria-labelledby="sp-faq-titulo">
      <h2 id="sp-faq-titulo">Talvez resolva agora</h2>
      <div className="sp-faq__grade">
        <article className="sp-pergunta">
          <h3><Icone nome="medalha" tamanho={18} /> Pagamento</h3>
          <p>Pix ou cartão. No Pix, o plano não renova sozinho; no cartão, renova sozinho, e dá para cancelar quando quiser em Minha assinatura.</p>
          <a href={href('/conta/assinatura')}>Ver minha assinatura <Icone nome="direita" tamanho={15} /></a>
          <a href={href('/condicoes-assinatura')}>Cancelamento e garantia <Icone nome="direita" tamanho={15} /></a>
        </article>
        <article className="sp-pergunta">
          <h3><Icone nome="cadeado" tamanho={18} /> Acesso</h3>
          <p>Esqueceu a senha? Em Recuperar senha, informe o e-mail e chega um link para criar uma nova. O progresso fica na conta e aparece em qualquer aparelho em que você entrar.</p>
          <a href={href('/conta?modo=recuperar')}>Recuperar senha <Icone nome="direita" tamanho={15} /></a>
          <a href={href('/dados')}>Exportar meu progresso <Icone nome="direita" tamanho={15} /></a>
        </article>
        <article className="sp-pergunta">
          <h3><Icone nome="alerta" tamanho={18} /> Erro em questão</h3>
          <p>Gabarito, enunciado ou imagem errados? Na própria questão, use "Relatar erro nesta questão", logo abaixo do comentário: ele já leva o número da questão, e você recebe um e-mail quando ela for corrigida.</p>
          {questao
            ? <a href={href(`/questao/${questao}`)}>Voltar para a questão {questao} <Icone nome="direita" tamanho={15} /></a>
            : <a href={href('/treinar')}>Abrir as questões <Icone nome="direita" tamanho={15} /></a>}
        </article>
      </div>
    </section>
  </article>
}
