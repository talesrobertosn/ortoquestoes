import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { AcoesDeEmail } from '../componentes/AcoesDeEmail'
import { primeiroNome } from '../componentes/Cabecalho'
import { Icone } from '../componentes/Icone'
import { SITE } from '../config'
import { usarConta } from '../conta/ContextoConta'
import { chave as chaveSupabase, url as urlSupabase } from '../conta/supabase'
import { href } from '../util/rotas'
import { prepararImagem, type ImagemSuporte } from '../conta/imagemSuporte'
import { AVISOS_IMAGEM, MAX_IMAGENS, MEIOS_SUPORTE, MOTIVOS, PLANOS_SUPORTE, TEXTO_EXCLUSAO, assuntoSuporte, camposDoMotivo, motivo as dadosMotivo, motivoInicial, type MotivoSuporte } from '../conta/suporte'
import '../estilos/paginas/Contato.css'

/*
 * Suporte (/contato), refeito em 19/10/2026 e reorganizado em 03/11/2026 (motivos, perguntas de
 * um toque e e-mail mais bonito; regras em src/conta/suporte.ts): escolher o motivo, escrever e enviar. A mensagem
 * vai pela função "suporte" (supabase/functions/suporte) direto para o e-mail do Tales
 * (SITE.contato), com "responder para" no e-mail de quem escreveu. Se a função falhar ou
 * ainda não estiver publicada, a página mostra o caminho de reserva de antes: copiar, abrir
 * no Gmail ou no aplicativo de e-mail.
 */

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
  const exclusao = consulta.get('assunto') === 'exclusao-conta'
  const [tipo, definirTipo] = useState<MotivoSuporte>(() => motivoInicial(consulta))
  const [mensagem, definirMensagem] = useState(() => exclusao ? TEXTO_EXCLUSAO : '')
  const [plano, definirPlano] = useState('')
  const [meio, definirMeio] = useState('')
  const [questao, definirQuestao] = useState(() => consulta.get('questao') ?? '')
  const [email, definirEmail] = useState(() => sessao?.user.email ?? '')
  const [emailTocado, definirEmailTocado] = useState(false)
  const [isca, definirIsca] = useState('')
  const [estado, definirEstado] = useState<Estado>({ fase: 'editando' })
  const [aviso, definirAviso] = useState('')
  const [imagens, definirImagens] = useState<ImagemSuporte[]>([])
  const [avisoImagem, definirAvisoImagem] = useState('')
  const contexto = useMemo(contextoDoAparelho, [])
  // O e-mail da conta pode chegar depois da primeira pintura: preenche se o campo ainda estiver vazio.
  const emailConta = sessao?.user.email ?? ''
  const emailFinal = emailTocado ? email : (email || emailConta)
  const emailComErro = emailTocado && emailFinal.trim() !== '' && !emailValido(emailFinal)

  const dados = dadosMotivo(tipo)
  const nomeCompleto = String(sessao?.user.user_metadata?.nome ?? '')
  const campos = camposDoMotivo(tipo, { plano, meio, questao })
  const assunto = assuntoSuporte(tipo, nomeCompleto, questao, exclusao && tipo === 'dados')
  const corpoReserva = `${mensagem}\n\n${campos.map(([k, v]) => `${k}: ${v}`).join('\n')}${campos.length ? '\n' : ''}---\nPágina: ${contexto.pagina}\nNavegador: ${contexto.navegador}\nTela: ${contexto.tela}`

  async function anexar(arquivos: File[]) {
    const lista = arquivos.filter((a) => a.size > 0)
    if (!lista.length) return
    definirAvisoImagem('')
    const vagas = MAX_IMAGENS - imagens.length
    if (vagas <= 0) { definirAvisoImagem(AVISOS_IMAGEM.anexos_demais); return }
    if (lista.length > vagas) definirAvisoImagem(AVISOS_IMAGEM.anexos_demais)
    for (const arquivo of lista.slice(0, vagas)) {
      try {
        const imagem = await prepararImagem(arquivo)
        definirImagens((atuais) => atuais.length < MAX_IMAGENS ? [...atuais, imagem] : atuais)
      } catch (falha) {
        definirAvisoImagem(AVISOS_IMAGEM[falha instanceof Error ? falha.message : ''] ?? AVISOS_IMAGEM.nao_abriu)
      }
    }
  }

  // Colar (Ctrl+V ou ⌘V) em qualquer lugar da página anexa a imagem; texto colado segue normal.
  const anexarRef = useRef(anexar)
  anexarRef.current = anexar
  useEffect(() => {
    if (estado.fase === 'enviado') return
    const aoColar = (evento: ClipboardEvent) => {
      const arquivos = [...(evento.clipboardData?.files ?? [])].filter((a) => a.type.startsWith('image/'))
      if (!arquivos.length) return
      if (!evento.clipboardData?.types.includes('text/plain')) evento.preventDefault()
      void anexarRef.current(arquivos)
    }
    window.addEventListener('paste', aoColar)
    return () => window.removeEventListener('paste', aoColar)
  }, [estado.fase])

  function selecionarTipo(novoTipo: MotivoSuporte) {
    if (novoTipo === tipo) return
    definirTipo(novoTipo)
    if (aviso) definirAviso('')
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const texto = mensagem.trim()
    if (texto.length < 10) { definirAviso('Conte em poucas palavras o que aconteceu antes de enviar.'); document.getElementById('mensagem-suporte')?.focus(); return }
    if (!emailValido(emailFinal)) { definirEmailTocado(true); definirAviso('Coloque um e-mail para a resposta chegar até você.'); document.getElementById('email-suporte')?.focus(); return }
    definirAviso('')
    definirEstado({ fase: 'enviando' })
    try {
      await enviarSuporte({
        motivo: tipo, assunto, mensagem: texto, email: emailFinal.trim(), nome: nomeCompleto,
        questao: tipo === 'questao' && questao.trim() ? questao.trim() : undefined,
        campos: Object.fromEntries(campos), contexto, site: isca,
        imagens: imagens.map(({ nome, tipo, base64 }) => ({ nome, tipo, base64 })),
      }, sessao?.access_token)
      definirEstado({ fase: 'enviado', para: emailFinal.trim() })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (falha) {
      const codigo = falha instanceof Error ? falha.message : ''
      // Imagem recusada: volta para a edição com o aviso, sem cair no caminho de reserva.
      if (codigo.startsWith('anexo')) { definirEstado({ fase: 'editando' }); definirAvisoImagem(AVISOS_IMAGEM[codigo] ?? AVISOS_IMAGEM.anexo_invalido); return }
      definirEstado({ fase: 'falhou', motivo: codigo })
    }
  }

  function escreverOutra() {
    definirTipo('outro')
    definirMensagem('')
    definirPlano(''); definirMeio(''); definirImagens([]); definirAvisoImagem('')
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
            <div><h2 id="sp-motivo">Qual é o motivo?</h2><p>Escolha o mais perto do que aconteceu. Ele organiza a mensagem que chega para mim.</p></div>
          </header>
          <div className="sp-motivos" role="group" aria-labelledby="sp-motivo">
            {MOTIVOS.map(item => (
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
            <div><h2 id="sp-mensagem">Conte o que aconteceu</h2><p>Do seu jeito, em poucas linhas. Nunca mande senha, código ou número de cartão.</p></div>
          </header>

          {dados.perguntaPagamento && <div className="sp-toques">
            <Escolha rotulo="Qual plano?" opcoes={PLANOS_SUPORTE} valor={plano} aoEscolher={definirPlano} desligado={enviando} />
            <Escolha rotulo="Pix ou cartão?" opcoes={MEIOS_SUPORTE} valor={meio} aoEscolher={definirMeio} desligado={enviando} />
          </div>}
          {tipo === 'questao' && <div className="sp-email">
            <label className="sp-rotulo" htmlFor="questao-suporte">Número da questão</label>
            <input id="questao-suporte" className="entrada sp-questao" inputMode="text" autoComplete="off" placeholder="Aparece no topo da questão" value={questao} onChange={evento => definirQuestao(evento.target.value.slice(0, 80))} disabled={enviando} />
          </div>}

          <div className="sp-escrever">
            <div className="sp-escrever__campo">
              <label className="sp-rotulo" htmlFor="mensagem-suporte">Sua mensagem</label>
              <textarea id="mensagem-suporte" className="entrada sp-mensagem" placeholder={dados.exemplo} value={mensagem} onChange={evento => { definirMensagem(evento.target.value); if (aviso) definirAviso('') }} rows={6} disabled={enviando} aria-describedby={`sp-dicas${aviso ? ' sp-aviso' : ''}`} />
            </div>
            <aside className="sp-dicas" id="sp-dicas" aria-label="O que ajuda contar">
              <p>Ajuda muito contar:</p>
              <ul>{dados.dicas.map(dica => <li key={dica}><Icone nome="certo" tamanho={14} /> {dica}</li>)}</ul>
            </aside>
          </div>

          <AnexarImagens imagens={imagens} aviso={avisoImagem} desligado={enviando} aoAnexar={(arquivos) => void anexar(arquivos)} aoTirar={(id) => { definirImagens((atuais) => atuais.filter((i) => i.id !== id)); definirAvisoImagem('') }} />

          <div className="sp-email">
            <label className="sp-rotulo" htmlFor="email-suporte">Para onde mando a resposta?</label>
            <input id="email-suporte" className="entrada" type="email" inputMode="email" autoComplete="email" placeholder="seu@email.com" value={emailFinal} onChange={evento => { definirEmailTocado(true); definirEmail(evento.target.value) }} disabled={enviando} required aria-invalid={emailComErro} aria-describedby="sp-email-ajuda" />
            <small id="sp-email-ajuda" className={emailComErro ? 'sp-email__erro' : undefined}>{emailComErro
              ? 'Confira o e-mail: parece faltar alguma parte (por exemplo, o @ ou o .com).'
              : emailConta && emailFinal === emailConta ? 'É o e-mail da sua conta. Pode trocar, se preferir receber em outro.' : 'A resposta chega neste e-mail, em geral no mesmo dia.'}</small>
          </div>
          {/* Campo-isca: escondido de quem usa o site; só robô preenche. */}
          <label className="sp-isca" aria-hidden="true">Site<input tabIndex={-1} autoComplete="off" value={isca} onChange={evento => definirIsca(evento.target.value)} /></label>
        </section>

        <section className="sp-cartao sp-envio" aria-labelledby="sp-enviar">
          <header className="sp-cartao__cabeca">
            <span className="px-numero" aria-hidden="true">3</span>
            <div><h2 id="sp-enviar">Enviar</h2><p>Junto vão a página, o navegador e o tamanho da tela, para eu entender o problema mais rápido.</p></div>
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
              <p>{MOTIVO_FALHA[estado.motivo] ?? 'Sua mensagem continua escrita acima. Mande pelo seu e-mail: um toque copia o texto ou abre o rascunho pronto.'}{imagens.length > 0 && ' As imagens não vão pelo rascunho: anexe-as no seu e-mail.'}</p>
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
          {consulta.get('questao')
            ? <a href={href(`/questao/${consulta.get('questao')}`)}>Voltar para a questão {consulta.get('questao')} <Icone nome="direita" tamanho={15} /></a>
            : <a href={href('/treinar')}>Abrir as questões <Icone nome="direita" tamanho={15} /></a>}
        </article>
      </div>
    </section>
  </article>
}

/** Pergunta de um toque (plano, forma de pagamento): tocar de novo na escolhida desmarca. */
function Escolha({ rotulo, opcoes, valor, aoEscolher, desligado }: { rotulo: string; opcoes: readonly string[]; valor: string; aoEscolher: (v: string) => void; desligado: boolean }) {
  return (
    <div className="sp-escolha" role="group" aria-label={rotulo}>
      <span className="sp-rotulo">{rotulo} <small>(opcional)</small></span>
      <div className="sp-escolha__opcoes">
        {opcoes.map((opcao) => (
          <button type="button" key={opcao} className="sp-chip" aria-pressed={valor === opcao} disabled={desligado} onClick={() => aoEscolher(valor === opcao ? '' : opcao)}>{opcao}</button>
        ))}
      </div>
    </div>
  )
}

/**
 * Imagens do suporte (03/11/2026): arrastar para o quadrado, colar com Ctrl+V (em qualquer
 * lugar da página) ou tocar para escolher. Até 3, reduzidas no aparelho antes de enviar.
 */
function AnexarImagens({ imagens, aviso, desligado, aoAnexar, aoTirar }: { imagens: readonly ImagemSuporte[]; aviso: string; desligado: boolean; aoAnexar: (arquivos: File[]) => void; aoTirar: (id: string) => void }) {
  const [arrastando, definirArrastando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)
  const cheio = imagens.length >= MAX_IMAGENS
  const soltar = (evento: DragEvent) => {
    evento.preventDefault()
    definirArrastando(false)
    if (!desligado) aoAnexar([...evento.dataTransfer.files])
  }
  return (
    <div className="sp-anexos">
      <span className="sp-rotulo">Imagens <small>(opcional, até {MAX_IMAGENS})</small></span>
      <div className="sp-anexos__linha">
        {imagens.map((imagem) => (
          <figure key={imagem.id} className="sp-anexo">
            <img src={imagem.previa} alt={`Imagem anexada: ${imagem.nome}`} />
            <button type="button" className="sp-anexo__tirar" onClick={() => aoTirar(imagem.id)} disabled={desligado} aria-label={`Tirar a imagem ${imagem.nome}`}><Icone nome="fechar" tamanho={14} /></button>
          </figure>
        ))}
        {!cheio && (
          <button type="button" className={'sp-soltar' + (arrastando ? ' sp-soltar--ativo' : '')} disabled={desligado}
            onClick={() => entrada.current?.click()}
            onDragOver={(evento) => { evento.preventDefault(); if (!arrastando) definirArrastando(true) }}
            onDragLeave={() => definirArrastando(false)} onDrop={soltar}>
            <Icone nome="imagem" tamanho={24} />
            <strong>{arrastando ? 'Solte aqui' : 'Anexar imagem'}</strong>
            <span>Arraste, cole com Ctrl+V ou toque para escolher</span>
          </button>
        )}
      </div>
      <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(evento) => { aoAnexar([...(evento.target.files ?? [])]); evento.target.value = '' }} />
      {aviso
        ? <small className="sp-anexos__aviso" role="alert">{aviso}</small>
        : <small>Um print da tela ajuda muito. Não mande foto de cartão, senha ou documento.</small>}
    </div>
  )
}
