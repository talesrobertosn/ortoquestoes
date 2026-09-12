import { useState, type FormEvent } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, retornoConta, supabase } from '../conta/supabase'
import { TIPOS_SYNC, deItens, itens } from '../conta/modeloSync'
import { gravar, ler, lerVisitante } from '../estado/armazenamento'
import { href } from '../util/rotas'

const ROTULOS_STATUS = {
  sincronizando: 'Sincronizando seu progresso…', salvo: 'Progresso sincronizado', offline: 'Sem conexão. As alterações serão enviadas quando você voltar à internet.',
  erro: 'Não foi possível sincronizar agora. Seu progresso continua neste navegador; tente novamente.', conflito: 'Há alterações simultâneas para conferir abaixo.',
}
const ROTULOS_TIPO = { respondidas: 'Resposta', notas: 'Anotação', favoritos: 'Favorita', historico: 'Sessão' }
function textoErro(codigo?: string) {
  if (codigo === 'invalid_credentials') return 'E-mail ou senha incorretos.'
  if (codigo === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar. Você pode reenviar a confirmação abaixo.'
  if (codigo === 'weak_password') return 'Use uma senha mais forte, com pelo menos 8 caracteres.'
  if (codigo?.includes('rate_limit') || codigo?.includes('over_')) return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
  return 'Não foi possível concluir. Confira os dados e sua conexão e tente novamente.'
}
export function Conta() {
  const { sessao, recuperacao, encerrarRecuperacao, status, sincronizar, resolver } = usarConta()
  const [modo, definirModo] = useState<'entrar' | 'criar' | 'recuperar'>('entrar')
  const [email, definirEmail] = useState(''), [senha, definirSenha] = useState('')
  const parametros = new URLSearchParams(window.location.search)
  const erroRetorno = parametros.get('error_code') ?? parametros.get('error')
  const mensagemRetorno = erroRetorno === 'otp_expired'
    ? 'Este link de confirmação expirou ou já foi usado. Solicite uma nova confirmação e abra o link mais recente neste mesmo navegador.'
    : erroRetorno === 'access_denied'
      ? 'O link de confirmação não pôde ser aceito. Solicite um novo link e tente novamente.'
      : ''
  const [ocupado, definirOcupado] = useState(false), [mensagem, definirMensagem] = useState(mensagemRetorno)
  const [importado, definirImportado] = useState(false)
  const perfil = sessao?.user.user_metadata ?? {}
  const [nome, definirNome] = useState(String(perfil.nome ?? ''))
  const [sobrenome, definirSobrenome] = useState(String(perfil.sobrenome ?? ''))
  const [nascimento, definirNascimento] = useState(String(perfil.nascimento ?? ''))
  const [residencia, definirResidencia] = useState(String(perfil.residencia ?? ''))
  const [situacao, definirSituacao] = useState(String(perfil.situacao ?? ''))
  const [salvandoPerfil, definirSalvandoPerfil] = useState(false)
  async function salvarPerfil() {
    if (!supabase || !sessao) return
    definirSalvandoPerfil(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: { nome: nome.trim(), sobrenome: sobrenome.trim(), nascimento, residencia: residencia.trim(), situacao } })
      if (error) throw error
      definirMensagem('Perfil atualizado.')
    } catch { definirMensagem('Não foi possível salvar o perfil agora.') }
    finally { definirSalvandoPerfil(false) }
  }
  if (!contasDisponiveis || !supabase) return <article className="limite-leitura empilha"><h1>Sua conta</h1><p>As contas estão em preparação. Você já pode estudar gratuitamente. O progresso só é salvo depois que uma conta estiver disponível.</p><a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a></article>
  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!supabase || ocupado) return
    definirOcupado(true); definirMensagem('')
    try {
      if (recuperacao && sessao) {
        const { error } = await supabase.auth.updateUser({ password: senha })
        if (error) throw error
        definirSenha(''); encerrarRecuperacao(); definirMensagem('Senha atualizada.')
      } else if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
        definirSenha('')
      } else if (modo === 'criar') {
        if (nome.trim().length < 2) { definirMensagem('Digite seu nome para personalizarmos sua experiência.'); return }
        const { error } = await supabase.auth.signUp({ email: email.trim(), password: senha, options: { emailRedirectTo: retornoConta(), data: { nome: nome.trim(), sobrenome: sobrenome.trim() } } })
        if (error) throw error
        definirSenha(''); definirMensagem('Confira seu e-mail para concluir o cadastro. Se já tiver uma conta, use Entrar ou recuperar senha.')
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
  return <article className="limite-leitura empilha-2 conta-pagina">
    <header><p className="meta">SEU ESTUDO, EM QUALQUER DISPOSITIVO</p><h1>{sessao ? 'Minha conta' : 'Entre para guardar seu progresso'}</h1><p>O OrtoQuestões continua 100% gratuito, sem limite diário. Criar uma conta é opcional.</p></header>
    {sessao && !recuperacao ? <>
      <section className="cartao cartao__corpo empilha">
        <h2>{sessao.user.email}</h2><p>Respostas, revisões, favoritas, anotações e histórico ficam associados à sua conta. A sessão em andamento fica neste dispositivo.</p>
        <p role="status">{ROTULOS_STATUS[status.estado]} {status.pendentes > 0 && `${status.pendentes} alteração(ões) pendente(s).`}</p>
        <div className="linha"><button className="botao" onClick={sincronizar} disabled={status.estado === 'sincronizando'}>Sincronizar agora</button><a className="botao" href={href('/dados')}>Ver desempenho e backup</a></div>
        <button className="botao botao--fantasma" disabled={ocupado} onClick={async () => {
          if (!supabase) return
          if (status.pendentes && !window.confirm('Ainda há alterações não sincronizadas. Elas ficarão neste navegador, disponíveis quando você entrar novamente nesta conta. Sair agora?')) return
          definirOcupado(true)
          try { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error } catch { definirMensagem('Não foi possível sair. Confira sua conexão e tente novamente.') } finally { definirOcupado(false) }
        }}>Sair da conta</button>
      </section>
      <section className="cartao cartao__corpo empilha">
        <h2>Meu perfil</h2>
        <p className="texto-2">Esses dados ficam associados à sua conta e ajudam a personalizar sua experiência. Foto não é necessária.</p>
        <div className="linha-campos linha-campos--2"><label className="campo">Nome<input className="entrada" value={nome} onChange={e => definirNome(e.target.value)} /></label><label className="campo">Sobrenome<input className="entrada" value={sobrenome} onChange={e => definirSobrenome(e.target.value)} /></label></div>
        <div className="linha-campos linha-campos--2"><label className="campo">Data de nascimento<input className="entrada" type="date" value={nascimento} onChange={e => definirNascimento(e.target.value)} /></label><label className="campo">Onde faz residência (opcional)<input className="entrada" value={residencia} onChange={e => definirResidencia(e.target.value)} /></label></div>
        <label className="campo">Você é <select className="entrada" value={situacao} onChange={e => definirSituacao(e.target.value)}><option value="">Escolha uma opção</option><option value="residente">Residente de ortopedia</option><option value="ortopedista">Ortopedista</option><option value="outro">Outro profissional ou estudante</option></select></label>
        <button className="botao botao--principal" type="button" onClick={salvarPerfil} disabled={salvandoPerfil}>{salvandoPerfil ? 'Salvando…' : 'Salvar perfil'}</button>
      </section>
      {possuiVisitante && !importado && <section className="cartao cartao__corpo empilha"><h2>Você já estudou neste navegador</h2><p>Importe o progresso de visitante para esta conta. Só serão acrescentados itens que ainda não existem nela. Em um dispositivo compartilhado, importe apenas se esse progresso for seu.</p><button className="botao botao--principal" onClick={importar} disabled={!status.pronto}>Importar meu progresso de visitante</button></section>}
      {status.conflitos.length > 0 && <section className="empilha"><h2>Confira as alterações simultâneas</h2><p>Este item mudou em outro dispositivo antes de sua alteração chegar. Escolha qual versão manter.</p>
        {status.conflitos.map(doc => <div className="cartao cartao__corpo empilha" key={`${doc.tipo}/${doc.item}`}><h3>{ROTULOS_TIPO[doc.tipo]} · {doc.item}</h3>
          <details><summary>Comparar versões</summary><p>Versão deste navegador</p><pre>{JSON.stringify(itens(doc.tipo, ler(doc.tipo, null))[doc.item] ?? null, null, 2)}</pre><p>Versão da conta</p><pre>{JSON.stringify(doc.valor, null, 2)}</pre></details>
          <div className="linha"><button className="botao" onClick={() => resolver(doc, true)}>Manter deste navegador</button><button className="botao" onClick={() => resolver(doc, false)}>Usar versão da conta</button></div></div>)}
      </section>}
    </> : <section className="cartao cartao__corpo empilha">
      {!recuperacao && <div className="grupo-opcoes">{(['entrar', 'criar', 'recuperar'] as const).map(m => <button className="opcao-segmento" aria-pressed={modo === m} onClick={() => { definirModo(m); definirMensagem(''); definirSenha('') }} key={m}>{m === 'entrar' ? 'Entrar' : m === 'criar' ? 'Criar conta' : 'Recuperar senha'}</button>)}</div>}
      <form className="empilha" onSubmit={enviar}>
        {!recuperacao && <label className="campo">E-mail<input className="entrada" type="email" autoComplete="email" required value={email} onChange={e => definirEmail(e.target.value)} /></label>}
        {!recuperacao && modo === 'criar' && <div className="linha-campos linha-campos--2"><label className="campo">Nome<input className="entrada" autoComplete="given-name" required minLength={2} value={nome} onChange={e => definirNome(e.target.value)} placeholder="Como podemos chamar você?" /></label><label className="campo">Sobrenome <span className="meta">(opcional)</span><input className="entrada" autoComplete="family-name" value={sobrenome} onChange={e => definirSobrenome(e.target.value)} /></label></div>}
        {(recuperacao || modo !== 'recuperar') && <label className="campo">{recuperacao ? 'Nova senha' : 'Senha'}<input className="entrada" type="password" autoComplete={modo === 'entrar' && !recuperacao ? 'current-password' : 'new-password'} minLength={modo === 'entrar' && !recuperacao ? undefined : 8} required value={senha} onChange={e => definirSenha(e.target.value)} /></label>}
        <button className="botao botao--principal" disabled={ocupado}>{ocupado ? 'Aguarde…' : recuperacao ? 'Salvar nova senha' : modo === 'criar' ? 'Criar conta gratuita' : modo === 'recuperar' ? 'Enviar link de recuperação' : 'Entrar'}</button>
      </form>
      {modo === 'entrar' && !recuperacao && <button className="botao botao--fantasma" onClick={() => { void reenviar() }} disabled={ocupado || !email.trim()}>Reenviar confirmação de e-mail</button>}
      <p className="meta">Usamos o Supabase para autenticação e armazenamento do progresso. A senha não é salva pelo OrtoQuestões. Nos links de confirmação e recuperação, use este mesmo navegador.</p>
      <a href={href('/treinar')}>Continuar sem conta</a>
    </section>}
    <p role="status">{mensagem}</p>
  </article>
}
