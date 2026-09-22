import { useEffect, useState, type FormEvent } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, retornoConta, supabase } from '../conta/supabase'
import { TIPOS_SYNC, deItens, itens } from '../conta/modeloSync'
import { gravar, ler, lerVisitante } from '../estado/armazenamento'
import { href } from '../util/rotas'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { usarIndice } from '../dados/usarIndice'
import { planoRevisao } from '../estado/planoRevisao'
import { usarArmazenado } from '../estado/usarArmazenado'
import { usarLeitura, usarEtiquetas } from '../estado/preferencias'
import { usarTema } from '../estado/tema'
import { dadosAceiteTermos } from '../conta/termos'
import { textoErro } from '../conta/erros'
import { Icone } from '../componentes/Icone'

const ROTULOS_STATUS = {
  sincronizando: 'Sincronizando seu progresso…', salvo: 'Progresso sincronizado', offline: 'Sem conexão. As alterações serão enviadas quando você voltar à internet.',
  erro: 'Não foi possível sincronizar agora. Seu progresso continua neste navegador; tente novamente.', conflito: 'Há alterações simultâneas para conferir abaixo.',
}
const ROTULOS_TIPO = { respondidas: 'Resposta', notas: 'Anotação', favoritos: 'Favorita', historico: 'Sessão' }
export function Conta({ consulta }: { consulta?: URLSearchParams }) {
  const { sessao, recuperacao, encerrarRecuperacao, status, sincronizar, resolver } = usarConta()
  const modoInicial = consulta?.get('modo')
  const [modo, definirModo] = useState<'entrar' | 'criar' | 'recuperar'>(
    modoInicial === 'criar' || modoInicial === 'recuperar' ? modoInicial : 'entrar',
  )
  const [email, definirEmail] = useState(''), [senha, definirSenha] = useState('')
  const [confirmacao, definirConfirmacao] = useState(''), [verSenha, definirVerSenha] = useState(false)
  const parametros = new URLSearchParams(window.location.search)
  const erroRetorno = parametros.get('error_code') ?? parametros.get('error')
  const mensagemRetorno = erroRetorno === 'otp_expired'
    ? 'Este link de confirmação expirou ou já foi usado. Solicite uma nova confirmação e abra o link mais recente neste mesmo navegador.'
    : erroRetorno === 'access_denied'
      ? 'O link de confirmação não pôde ser aceito. Solicite um novo link e tente novamente.'
      : ''
  const [ocupado, definirOcupado] = useState(false), [mensagem, definirMensagem] = useState(mensagemRetorno)
  const [novoEmail, definirNovoEmail] = useState('')
  const [importado, definirImportado] = useState(false)
  const { contexto } = usarContextoLocal('')
  const { indice } = usarIndice()
  const [metaDiaria, definirMetaDiaria] = usarArmazenado<number>('meta-diaria-revisao', 10)
  const { densidade, definirDensidade, fonte, definirFonte } = usarLeitura()
  const { mostrarEtiquetas, definirEtiquetas } = usarEtiquetas()
  const { tema, trocar: trocarTema } = usarTema()
  const perfil = sessao?.user.user_metadata ?? {}
  const [nome, definirNome] = useState(String(perfil.nome ?? ''))
  const [sobrenome, definirSobrenome] = useState(String(perfil.sobrenome ?? ''))
  const [nascimento, definirNascimento] = useState(String(perfil.nascimento ?? ''))
  const [servico, definirServico] = useState(String(perfil.servico ?? perfil.residencia ?? ''))
  const [situacao, definirSituacao] = useState(String(perfil.situacao ?? ''))
  const [whatsapp, definirWhatsapp] = useState(String(perfil.whatsapp ?? ''))
  const [cidade, definirCidade] = useState(String(perfil.cidade ?? ''))
  const [uf, definirUf] = useState(String(perfil.uf ?? ''))
  const [receberNovidades, definirReceberNovidades] = useState(Boolean(perfil.receber_novidades ?? false))
  const [aceitouTermos, definirAceitouTermos] = useState(false)
  const [salvandoPerfil, definirSalvandoPerfil] = useState(false)
  const [apelidoRanking, definirApelidoRanking] = useState('')
  const [participaRanking, definirParticipaRanking] = useState(false)
  const [rankingCarregado, definirRankingCarregado] = useState(false)
  const [salvandoRanking, definirSalvandoRanking] = useState(false)
  const apelidoSugerido = `${nome.trim()} ${sobrenome.trim().charAt(0).toUpperCase()}${sobrenome.trim() ? '.' : ''}`.trim()
  useEffect(() => {
    if (!supabase || !sessao) return
    let vivo = true
    supabase.from('perfis_publicos').select('apelido, participa_ranking').eq('usuario_id', sessao.user.id).maybeSingle()
      .then(({ data }) => {
        if (!vivo) return
        definirApelidoRanking(String(data?.apelido ?? apelidoSugerido))
        definirParticipaRanking(Boolean(data?.participa_ranking ?? false))
        definirRankingCarregado(true)
      })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessao?.user.id])
  async function salvarRanking(participar: boolean) {
    if (!supabase || !sessao) return
    if (participar && apelidoRanking.trim().length < 2) { definirMensagem('Escolha um nome com pelo menos 2 letras para aparecer no ranking.'); return }
    definirSalvandoRanking(true)
    try {
      const { error } = await supabase.from('perfis_publicos')
        .upsert({ apelido: apelidoRanking.trim() || apelidoSugerido, participa_ranking: participar }, { onConflict: 'usuario_id' })
      if (error) throw error
      definirParticipaRanking(participar)
      definirMensagem(participar ? 'Você está participando do ranking.' : 'Você saiu do ranking.')
    } catch { definirMensagem('Não foi possível salvar agora. Tente de novo.') }
    finally { definirSalvandoRanking(false) }
  }
  async function salvarPerfil() {
    if (!supabase || !sessao) return
    definirSalvandoPerfil(true)
    try {
      if (!perfilCompleto()) return
      const { error } = await supabase.auth.updateUser({ data: dadosPerfil() })
      if (error) throw error
      definirMensagem('Perfil atualizado.')
    } catch { definirMensagem('Não foi possível salvar o perfil agora.') }
    finally { definirSalvandoPerfil(false) }
  }
  function perfilCompleto() {
    if (nome.trim().length < 2) { definirMensagem('Informe seu nome.'); return false }
    if (sobrenome.trim().length < 2) { definirMensagem('Informe seu sobrenome.'); return false }
    if (!nascimento || new Date(`${nascimento}T12:00:00`).getTime() > Date.now()) { definirMensagem('Informe uma data de nascimento válida.'); return false }
    if (!situacao) { definirMensagem('Informe sua etapa profissional.'); return false }
    if (servico.trim().length < 2) { definirMensagem('Informe o serviço onde você atua ou faz residência.'); return false }
    return true
  }
  function dadosPerfil() {
    return {
      nome: nome.trim(), sobrenome: sobrenome.trim(), nascimento, situacao,
      servico: servico.trim(), whatsapp: whatsapp.trim(), cidade: cidade.trim(), uf,
      receber_novidades: receberNovidades,
    }
  }
  if (!contasDisponiveis || !supabase) return <article className="limite-leitura empilha"><h1>Sua conta</h1><p>As contas estão em preparação. Você já pode estudar gratuitamente. O progresso só é salvo depois que uma conta estiver disponível.</p><a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a></article>
  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!supabase || ocupado) return
    const pedeConfirmacao = recuperacao || modo === 'criar'
    if (pedeConfirmacao && senha !== confirmacao) { definirMensagem('As senhas não coincidem. Digite a mesma senha nos dois campos.'); return }
    definirOcupado(true); definirMensagem('')
    try {
      if (recuperacao && sessao) {
        const { error } = await supabase.auth.updateUser({ password: senha })
        if (error) throw error
        definirSenha(''); definirConfirmacao(''); encerrarRecuperacao(); definirMensagem('Senha atualizada.')
      } else if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
        definirSenha('')
      } else if (modo === 'criar') {
        if (!aceitouTermos) { definirMensagem('É necessário aceitar os Termos de Uso e Consentimento para criar sua conta.'); return }
        if (!perfilCompleto()) return
        const { error } = await supabase.auth.signUp({ email: email.trim(), password: senha, options: { emailRedirectTo: retornoConta(), data: { ...dadosPerfil(), ...dadosAceiteTermos() } } })
        if (error) throw error
        definirSenha(''); definirConfirmacao(''); definirMensagem('Confira seu e-mail para concluir o cadastro. Se já tiver uma conta, use Entrar ou recuperar senha.')
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: retornoConta(true) })
        if (error) throw error
        definirMensagem('Se houver uma conta para esse e-mail, você receberá um link para redefinir a senha. Abra o link neste mesmo navegador.')
      }
    } catch (e) { definirMensagem(textoErro((e as { code?: string }).code)) }
    finally { definirOcupado(false) }
  }
  async function reenviar() {
    if (!supabase || ocupado || !email.trim()) return
    definirOcupado(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: retornoConta() } })
      if (error) throw error
      definirMensagem('Se houver um cadastro pendente, enviaremos uma nova confirmação. Abra o link neste mesmo navegador.')
    } catch (e) { definirMensagem(textoErro((e as { code?: string }).code)) }
    finally { definirOcupado(false) }
  }
  async function trocarEmail() {
    if (!supabase || !novoEmail.trim()) return
    definirOcupado(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: novoEmail.trim() })
      if (error) throw error
      definirMensagem('Enviamos a confirmação do novo e-mail. A alteração só vale depois de confirmar o link.')
      definirNovoEmail('')
    } catch (e) { definirMensagem(textoErro((e as { code?: string }).code)) }
    finally { definirOcupado(false) }
  }
  function importar() {
    if (!status.pronto) return
    for (const tipo of TIPOS_SYNC) {
      const conta = itens(tipo, ler(tipo, null)), visitante = itens(tipo, lerVisitante(tipo, null))
      const versoes = ler<{ versoes: Record<string, number> }>('sincronia:v1', { versoes: {} }).versoes
      // Preserva inclusive exclusões já sincronizadas; não ressuscita favoritas/anotações.
      for (const [id, valor] of Object.entries(visitante)) if (!(id in conta) && !versoes[`${tipo}/${id}`]) conta[id] = valor
      gravar(tipo, deItens(tipo, conta))
    }
    definirImportado(true); definirMensagem('Progresso de visitante importado. Os dados que já existiam na conta foram preservados.')
  }
  const possuiVisitante = false
  const metricas = indice ? (() => {
    const registros = Object.values(contexto.respondidas)
    const tentativas = registros.reduce((total, registro) => total + (registro.tentativas ?? 1), 0)
    const acertos = registros.reduce((total, registro) => total + (registro.acertos ?? Number(registro.c === true)), 0)
    const pendentes = [...planoRevisao(indice, contexto.respondidas, 1).values()].reduce((total, dia) => total + dia.ids.length, 0)
    return { respondidas: registros.length, acerto: tentativas ? Math.round((acertos / tentativas) * 100) : null, pendentes }
  })() : null
  const trocarModo = (m: typeof modo) => { definirModo(m); definirMensagem(''); definirSenha(''); definirConfirmacao('') }
  const pedeConfirmacao = recuperacao || modo === 'criar'
  const senhasConferem = confirmacao.length > 0 && confirmacao === senha
  if (!sessao || recuperacao) {
    const titulo = recuperacao ? 'Crie uma nova senha' : modo === 'criar' ? 'Criar conta gratuita' : modo === 'recuperar' ? 'Recuperar senha' : 'Entrar na sua conta'
    const subtitulo = recuperacao ? 'Escolha a nova senha e confirme logo abaixo.' : modo === 'criar' ? 'Leva menos de um minuto. Depois é só confirmar o e-mail.' : modo === 'recuperar' ? 'Enviamos um link para você criar uma nova senha.' : 'Continue de onde parou, em qualquer dispositivo.'
    return <div className="acesso">
      <aside className="acesso__vitrine">
        <p className="acesso__marca"><span>Orto</span>Questões</p>
        <h1>{modo === 'criar' ? 'Sua preparação, organizada do primeiro ao último dia.' : 'Que bom ter você de volta.'}</h1>
        <p className="acesso__lide">{indice ? `${indice.total.toLocaleString('pt-BR')} questões` : 'Questões'} de TEOT, TARO, ENARE R4 e outras provas, com comentário e referência.</p>
        <ul className="acesso__beneficios">
          <li><span><Icone nome="grafico" tamanho={18} /></span>Desempenho por tema e por prova</li>
          <li><span><Icone nome="calendario" tamanho={18} /></span>Revisão espaçada montada para você</li>
          <li><span><Icone nome="estrela" tamanho={18} /></span>Favoritas e anotações nas questões</li>
          <li><span><Icone nome="raio" tamanho={18} /></span>Sequência de dias, ranking e emblemas</li>
        </ul>
        <p className="acesso__rodape">Comece grátis, sem cartão de crédito.</p>
      </aside>
      <section className="acesso__cartao">
        {!recuperacao && modo !== 'recuperar' && <div className="acesso__abas" role="tablist">{(['entrar', 'criar'] as const).map(m => <button type="button" role="tab" aria-selected={modo === m} className="acesso__aba" onClick={() => trocarModo(m)} key={m}>{m === 'entrar' ? 'Entrar' : 'Criar conta'}</button>)}</div>}
        <header className="acesso__cabeca">
          {modo === 'recuperar' && !recuperacao && <button type="button" className="acesso__voltar" onClick={() => trocarModo('entrar')}><Icone nome="esquerda" tamanho={16} /> Voltar para entrar</button>}
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </header>
        {mensagem && <p className="aviso-formulario" role="status">{mensagem}</p>}
        <form className="empilha acesso__form" onSubmit={enviar}>
          {!recuperacao && <label className="campo">E-mail<input className="entrada" type="email" autoComplete="email" required value={email} onChange={e => definirEmail(e.target.value)} placeholder="voce@email.com" /></label>}
          {!recuperacao && modo === 'criar' && <>
            <div className="linha-campos linha-campos--2"><label className="campo">Nome<input className="entrada" autoComplete="given-name" required minLength={2} value={nome} onChange={e => definirNome(e.target.value)} placeholder="Como podemos chamar você?" /></label><label className="campo">Sobrenome<input className="entrada" autoComplete="family-name" required minLength={2} value={sobrenome} onChange={e => definirSobrenome(e.target.value)} /></label></div>
            <div className="linha-campos linha-campos--2"><label className="campo">Data de nascimento<input className="entrada" type="date" required value={nascimento} onChange={e => definirNascimento(e.target.value)} /></label><label className="campo">Você é <select className="entrada" required value={situacao} onChange={e => definirSituacao(e.target.value)}><option value="">Selecione</option><option value="residente">Residente de ortopedia</option><option value="ortopedista">Ortopedista</option><option value="outro">Outro profissional ou estudante</option></select></label></div>
            <label className="campo">Serviço onde faz residência ou trabalha<input className="entrada" required value={servico} onChange={e => definirServico(e.target.value)} placeholder="Ex.: Hospital / clínica / instituição" /></label>
            <div className="linha-campos linha-campos--2"><label className="campo"><span>WhatsApp <span className="meta">(opcional)</span></span><input className="entrada" type="tel" autoComplete="tel" value={whatsapp} onChange={e => definirWhatsapp(e.target.value)} placeholder="(00) 00000-0000" /></label><label className="campo"><span>Cidade <span className="meta">(opcional)</span></span><input className="entrada" autoComplete="address-level2" value={cidade} onChange={e => definirCidade(e.target.value)} /></label></div>
          </>}
          {(recuperacao || modo !== 'recuperar') && <div className="campo">
            <span className="acesso__rotulo-senha"><label htmlFor="acesso-senha">{recuperacao ? 'Nova senha' : 'Senha'}</label>{modo === 'entrar' && !recuperacao && <button type="button" className="acesso__link" onClick={() => trocarModo('recuperar')}>Esqueceu a senha?</button>}</span>
            <span className="acesso__senha">
              <input id="acesso-senha" className="entrada" type={verSenha ? 'text' : 'password'} autoComplete={modo === 'entrar' && !recuperacao ? 'current-password' : 'new-password'} minLength={modo === 'entrar' && !recuperacao ? undefined : 8} required value={senha} onChange={e => definirSenha(e.target.value)} />
              <button type="button" className="acesso__olho" onClick={() => definirVerSenha(v => !v)} aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={verSenha}><Icone nome={verSenha ? 'olho-riscado' : 'olho'} tamanho={18} /></button>
            </span>
            {pedeConfirmacao && <span className="meta">Mínimo de 8 caracteres.</span>}
          </div>}
          {pedeConfirmacao && <div className="campo">
            <label htmlFor="acesso-confirmacao">Confirmar senha</label>
            <input id="acesso-confirmacao" className={`entrada${confirmacao && !senhasConferem ? ' entrada--invalida' : ''}`} type={verSenha ? 'text' : 'password'} autoComplete="new-password" required value={confirmacao} onChange={e => definirConfirmacao(e.target.value)} aria-describedby="acesso-confere" />
            {confirmacao && <span id="acesso-confere" className={`acesso__confere ${senhasConferem ? 'acesso__confere--ok' : 'acesso__confere--nao'}`} role="status"><Icone nome={senhasConferem ? 'certo' : 'errado'} tamanho={14} />{senhasConferem ? 'As senhas coincidem' : 'As senhas ainda não coincidem'}</span>}
          </div>}
          {!recuperacao && modo === 'criar' && <>
            <label className="campo campo--checkbox"><input type="checkbox" checked={receberNovidades} onChange={e => definirReceberNovidades(e.target.checked)} /> Quero receber novidades sobre o OrtoQuestões</label>
            <label className="campo campo--checkbox"><input type="checkbox" required checked={aceitouTermos} onChange={e => definirAceitouTermos(e.target.checked)} /> <span>Li e concordo com os <a href={href('/termos')} target="_blank" rel="noopener noreferrer">Termos de Uso e Consentimento</a> do OrtoQuestões.</span></label>
          </>}
          <button className="botao botao--principal acesso__enviar" disabled={ocupado}>{ocupado ? 'Aguarde…' : recuperacao ? 'Salvar nova senha' : modo === 'criar' ? 'Criar conta gratuita' : modo === 'recuperar' ? 'Enviar link de recuperação' : 'Entrar'}</button>
        </form>
        {modo === 'entrar' && !recuperacao && <p className="acesso__alternativa">Não recebeu a confirmação? <button type="button" className="acesso__link" onClick={() => { void reenviar() }} disabled={ocupado || !email.trim()}>Reenviar e-mail</button></p>}
        {!recuperacao && modo === 'criar' && <p className="meta">Seus dados de perfil não ficam visíveis a outros usuários. O ranking público fica desligado até você ativá-lo, escolhendo como seu nome aparece.</p>}
        <p className="acesso__seguranca"><Icone nome="certo" tamanho={14} /> Autenticação segura pelo Supabase. O OrtoQuestões não guarda sua senha. Abra os links de confirmação neste mesmo navegador.</p>
      </section>
    </div>
  }
  return <article className="limite-leitura empilha-2 conta-pagina">
    <header><p className="meta">SEU ESTUDO, EM QUALQUER DISPOSITIVO</p><h1>Minha conta</h1><p>O OrtoQuestões continua 100% gratuito, sem limite diário.</p></header>
    {mensagem && <p className="aviso-formulario" role="status">{mensagem}</p>}
    <>
      <section className="cartao cartao__corpo empilha">
        <h2>{sessao.user.email}</h2><p>Respostas, revisões, favoritas, anotações e histórico ficam associados à sua conta. A sessão em andamento fica neste dispositivo.</p>
        <p role="status">{ROTULOS_STATUS[status.estado]} {status.pendentes > 0 && `${status.pendentes} alteração(ões) pendente(s).`}</p>
        <p className="texto-2">Conta criada em {new Date(sessao.user.created_at).toLocaleDateString('pt-BR')} · dispositivo atual: este navegador.</p>
        <div className="linha"><a className="botao" href={href('/dados')}>Ver desempenho e backup</a><button className="botao botao--fantasma" onClick={sincronizar} disabled={status.estado === 'sincronizando'}>Sincronizar agora</button></div>
        <button className="botao botao--fantasma" disabled={ocupado} onClick={async () => {
          if (!supabase) return
          if (status.pendentes && !window.confirm('Ainda há alterações não sincronizadas. Elas ficarão neste navegador, disponíveis quando você entrar novamente nesta conta. Sair agora?')) return
          definirOcupado(true)
          try { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error } catch { definirMensagem('Não foi possível sair. Confira sua conexão e tente novamente.') } finally { definirOcupado(false) }
        }}>Sair da conta</button>
      </section>
      {metricas && <section className="cartao cartao__corpo empilha">
        <p className="meta">SEU PAINEL</p><h2>Estudo neste perfil</h2>
        <div className="atalhos-estudo"><a href={href('/dados')}><strong>{metricas.respondidas}</strong><span>Questões respondidas</span></a><a href={href('/revisao')}><strong>{metricas.pendentes}</strong><span>Revisões programadas</span></a><a href={href('/dados')}><strong>{metricas.acerto === null ? '—' : `${metricas.acerto}%`}</strong><span>Acerto acumulado</span></a></div>
      </section>}
      <section className="cartao cartao__corpo empilha">
        <p className="meta">OPCIONAL</p><h2>Ranking público</h2>
        <p className="texto-2">Compare com outras contas pelo número de questões respondidas — sem contar percentual de acerto. Só entra no ranking quem ativa aqui, e você escolhe como seu nome aparece; nada do seu perfil (e-mail, WhatsApp, cidade etc.) é exibido.</p>
        {rankingCarregado && <>
          <label className="campo">Como você aparece no ranking<input className="entrada" maxLength={40} value={apelidoRanking} onChange={e => definirApelidoRanking(e.target.value)} placeholder={apelidoSugerido || 'Seu nome'} /></label>
          <div className="linha">
            {participaRanking
              ? <button className="botao" type="button" onClick={() => salvarRanking(false)} disabled={salvandoRanking}>Sair do ranking</button>
              : <button className="botao botao--principal" type="button" onClick={() => salvarRanking(true)} disabled={salvandoRanking}>Participar do ranking</button>}
            {participaRanking && <button className="botao botao--fantasma" type="button" onClick={() => salvarRanking(true)} disabled={salvandoRanking}>Salvar nome</button>}
            <a className="botao botao--fantasma" href={href('/ranking')}>Ver ranking</a>
          </div>
        </>}
      </section>
      <section className="cartao cartao__corpo empilha">
        <h2>Preferências de estudo</h2>
        <p className="texto-2">Sua meta orienta os atalhos de revisão. Você pode mudar quando a semana estiver mais cheia.</p>
        <div className="campo"><span className="campo__rotulo">Meta diária de revisão</span><div className="grupo-opcoes" aria-label="Meta diária de revisão">{[10, 20, 30].map(meta => <button type="button" key={meta} className="opcao-segmento" aria-pressed={metaDiaria === meta} onClick={() => definirMetaDiaria(meta)}>{meta} revisões/dia</button>)}</div></div>
        <div className="campo"><span className="campo__rotulo">Densidade da leitura</span><div className="grupo-opcoes">{([['confortavel', 'Confortável'], ['compacta', 'Compacta'], ['foco', 'Foco']] as const).map(([valor, rotulo]) => <button key={valor} type="button" className="opcao-segmento" aria-pressed={densidade === valor} onClick={() => definirDensidade(valor)}>{rotulo}</button>)}</div></div>
        <label className="campo">Tamanho da fonte <output className="numerico">{fonte}%</output><input className="entrada" type="range" min="90" max="120" step="5" value={fonte} onChange={e => definirFonte(Number(e.target.value))} /></label>
        <div className="campo"><span className="campo__rotulo">Tema</span><div className="grupo-opcoes">{([['claro', 'Claro'], ['escuro', 'Escuro']] as const).map(([valor, rotulo]) => <button key={valor} type="button" className="opcao-segmento" aria-pressed={tema === valor} onClick={() => trocarTema(valor)}>{rotulo}</button>)}</div></div>
        <label className="campo campo--checkbox"><input type="checkbox" checked={mostrarEtiquetas} onChange={e => definirEtiquetas(e.target.checked)} /> Mostrar a etiqueta do assunto antes de responder</label>
        <div className="linha"><a className="botao" href={href('/dados')}>Backup e privacidade</a><a className="botao" href={href('/revisao')}>Configurar minha revisão</a></div>
      </section>
      <section className="cartao cartao__corpo empilha">
        <h2>Segurança da conta</h2>
        <p className="texto-2">Trocar o e-mail exige confirmação pelo novo endereço. Sair só desconecta este navegador; o seu progresso permanece salvo.</p>
        <div className="linha-campos linha-campos--2"><label className="campo">Novo e-mail<input className="entrada" type="email" value={novoEmail} onChange={e => definirNovoEmail(e.target.value)} placeholder="novo@email.com" /></label><div className="campo"><span className="campo__rotulo">Ações</span><div className="linha"><button className="botao" type="button" onClick={() => void trocarEmail()} disabled={ocupado || !novoEmail.trim()}>Trocar e-mail</button><a className="botao botao--fantasma" href={href('/contato?assunto=exclusao-conta')}>Solicitar exclusão</a></div></div></div>
      </section>
      <section className="cartao cartao__corpo empilha">
        <h2>Meu perfil</h2>
        <p className="texto-2">Esses dados ficam associados à sua conta e ajudam a personalizar sua experiência. Foto não é necessária.</p>
        <div className="linha-campos linha-campos--2"><label className="campo">Nome<input className="entrada" required minLength={2} value={nome} onChange={e => definirNome(e.target.value)} /></label><label className="campo">Sobrenome<input className="entrada" required minLength={2} value={sobrenome} onChange={e => definirSobrenome(e.target.value)} /></label></div>
        <div className="linha-campos linha-campos--2"><label className="campo">Data de nascimento<input className="entrada" type="date" value={nascimento} onChange={e => definirNascimento(e.target.value)} /></label><label className="campo">Você é <select className="entrada" value={situacao} onChange={e => definirSituacao(e.target.value)}><option value="">Escolha uma opção</option><option value="residente">Residente de ortopedia</option><option value="ortopedista">Ortopedista</option><option value="outro">Outro profissional ou estudante</option></select></label></div>
        <label className="campo">Serviço onde faz residência ou trabalha<input className="entrada" value={servico} onChange={e => definirServico(e.target.value)} placeholder="Ex.: Hospital / clínica / instituição" /></label>
        <div className="linha-campos linha-campos--2"><label className="campo">WhatsApp <span className="meta">(opcional)</span><input className="entrada" type="tel" autoComplete="tel" value={whatsapp} onChange={e => definirWhatsapp(e.target.value)} placeholder="(00) 00000-0000" /></label><label className="campo">Cidade <span className="meta">(opcional)</span><input className="entrada" autoComplete="address-level2" value={cidade} onChange={e => definirCidade(e.target.value)} /></label></div>
        <div className="linha-campos linha-campos--2"><label className="campo">UF <span className="meta">(opcional)</span><select className="entrada" value={uf} onChange={e => definirUf(e.target.value)}><option value="">Selecione</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(sigla => <option key={sigla}>{sigla}</option>)}</select></label><label className="campo campo--checkbox"><input type="checkbox" checked={receberNovidades} onChange={e => definirReceberNovidades(e.target.checked)} /> Quero receber novidades sobre o OrtoQuestões</label></div>
        <p className="texto-2">WhatsApp, cidade e UF são opcionais. Usamos seus dados de perfil para personalizar sua experiência e nunca exibimos seu contato publicamente.</p>
        <button className="botao botao--principal" type="button" onClick={salvarPerfil} disabled={salvandoPerfil}>{salvandoPerfil ? 'Salvando…' : 'Salvar perfil'}</button>
      </section>
      {possuiVisitante && !importado && <section className="cartao cartao__corpo empilha"><h2>Você já estudou neste navegador</h2><p>Importe o progresso de visitante para esta conta. Só serão acrescentados itens que ainda não existem nela. Em um dispositivo compartilhado, importe apenas se esse progresso for seu.</p><button className="botao botao--principal" onClick={importar} disabled={!status.pronto}>Importar meu progresso de visitante</button></section>}
      {status.conflitos.length > 0 && <section className="empilha"><h2>Confira as alterações simultâneas</h2><p>Este item mudou em outro dispositivo antes de sua alteração chegar. Escolha qual versão manter.</p>
        {status.conflitos.map(doc => <div className="cartao cartao__corpo empilha" key={`${doc.tipo}/${doc.item}`}><h3>{ROTULOS_TIPO[doc.tipo]} · {doc.item}</h3>
          <details><summary>Comparar versões</summary><p>Versão deste navegador</p><pre>{JSON.stringify(itens(doc.tipo, ler(doc.tipo, null))[doc.item] ?? null, null, 2)}</pre><p>Versão da conta</p><pre>{JSON.stringify(doc.valor, null, 2)}</pre></details>
          <div className="linha"><button className="botao" onClick={() => resolver(doc, true)}>Manter deste navegador</button><button className="botao" onClick={() => resolver(doc, false)}>Usar versão da conta</button></div></div>)}
      </section>}
    </>
  </article>
}
