import { useEffect, useState, type FormEvent } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, retornoConta, supabase } from '../conta/supabase'
import { avisoConta, definirAvisoConta } from '../conta/retornoAuth'
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
import { Medalha } from '../componentes/Medalha'
import { conquistaAtual } from '../estado/conquistas'
import { ResumoAssinatura } from '../componentes/ResumoAssinatura'
import { MINIMO_RANKING } from '../util/nomeRanking'
import { APELIDO_MAXIMO, usarPerfilRanking } from '../conta/perfilRanking'

const ROTULOS_STATUS = {
  sincronizando: 'Sincronizando seu progresso…', salvo: 'Progresso sincronizado', offline: 'Sem conexão. As alterações serão enviadas quando você voltar à internet.',
  erro: 'Não foi possível sincronizar agora. Seu progresso continua neste navegador; tente novamente.', conflito: 'Há alterações simultâneas para conferir abaixo.',
}
const ROTULOS_TIPO = { respondidas: 'Resposta', notas: 'Anotação', favoritos: 'Favorita', historico: 'Sessão' }
export function Conta({ consulta }: { consulta?: URLSearchParams }) {
  const { sessao, recuperacao, encerrarRecuperacao, status, sincronizar, resolver, reenviarRejeitados, descartarRejeitados } = usarConta()
  const modoInicial = consulta?.get('modo')
  const [modo, definirModo] = useState<'entrar' | 'criar' | 'recuperar'>(
    modoInicial === 'criar' || modoInicial === 'recuperar' ? modoInicial : 'entrar',
  )
  const [email, definirEmail] = useState(''), [senha, definirSenha] = useState('')
  const [confirmacao, definirConfirmacao] = useState(''), [verSenha, definirVerSenha] = useState(false)
  // Aviso deixado pelo retorno de um link de e-mail com problema (expirado,
  // já usado, aberto em outro navegador). Ver conta/retornoAuth.ts.
  const [ocupado, definirOcupado] = useState(false), [mensagem, definirMensagem] = useState(avisoConta)
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
  const { perfil: perfilRanking, carregado: rankingCarregado, salvar: salvarPerfilRanking, nomeExibido: nomeExibidoRanking, nomeCadastro: nomeCadastroRanking } = usarPerfilRanking(sessao)
  const [apelidoRanking, definirApelidoRanking] = useState('')
  const [salvandoRanking, definirSalvandoRanking] = useState(false)
  useEffect(() => { if (rankingCarregado) definirApelidoRanking(perfilRanking.apelido ?? '') }, [rankingCarregado, perfilRanking.apelido])
  async function salvarApelido(texto: string) {
    definirSalvandoRanking(true)
    const erro = await salvarPerfilRanking({ apelido: texto.trim() || null })
    definirSalvandoRanking(false)
    definirMensagem(erro ?? (texto.trim() ? 'Apelido salvo.' : 'Você volta a aparecer com o seu nome.'))
  }
  async function alterarParticipacao(participa: boolean) {
    definirSalvandoRanking(true)
    const erro = await salvarPerfilRanking({ participa })
    definirSalvandoRanking(false)
    definirMensagem(erro ?? (participa ? 'Você voltou ao ranking.' : 'Você saiu do ranking.'))
  }
  const respondidasConta = Object.keys(contexto.respondidas).length
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
    definirOcupado(true); definirMensagem(''); definirAvisoConta('')
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
    const subtitulo = recuperacao ? 'Escolha a nova senha e confirme logo abaixo.' : modo === 'criar' ? 'Leva menos de um minuto. Depois é só confirmar o e-mail.' : modo === 'recuperar' ? 'Informe seu e-mail e enviaremos um link para criar uma nova senha.' : 'Continue de onde parou, em qualquer dispositivo.'
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
        {!recuperacao && modo === 'criar' && <p className="meta">Seus dados de perfil não ficam visíveis a outros usuários, com uma exceção: depois de 5 questões respondidas, você entra no ranking, visível a quem tem conta, com o apelido que escolher (ou seu nome e a inicial do sobrenome). Você pode sair do ranking quando quiser.</p>}
        <p className="acesso__seguranca"><Icone nome="certo" tamanho={14} /> Autenticação segura pelo Supabase. O OrtoQuestões não guarda sua senha. Abra os links de confirmação neste mesmo navegador.</p>
      </section>
    </div>
  }
  const inicialNome = (nome.trim().charAt(0) || sessao.user.email?.charAt(0) || '?').toUpperCase()
  const emblema = metricas ? conquistaAtual(metricas.respondidas) : null
  const sair = async () => {
    if (!supabase) return
    if (status.pendentes && !window.confirm('Ainda há alterações não sincronizadas. Elas ficarão neste navegador, disponíveis quando você entrar novamente nesta conta. Sair agora?')) return
    definirOcupado(true)
    try { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error } catch { definirMensagem('Não foi possível sair. Confira sua conexão e tente novamente.') } finally { definirOcupado(false) }
  }
  return <article className="empilha-2 conta-pagina ct">
    <section className="ct-heroi">
      <div className="ct-heroi__perfil">
        <span className="ct-avatar" aria-hidden="true">{inicialNome}</span>
        <div className="ct-heroi__nome">
          <p className="ct-heroi__selo">Minha conta</p>
          <h1>{nome.trim() ? `${nome.trim()} ${sobrenome.trim()}`.trim() : 'Sua conta'}</h1>
          <p className="ct-heroi__email">{sessao.user.email}</p>
          <p className="ct-heroi__sync" role="status">
            <span className={`ponto-sincronia ponto-sincronia--${status.estado}`} aria-hidden="true" />
            {ROTULOS_STATUS[status.estado]}{status.pendentes > 0 && ` ${status.pendentes} alteração(ões) pendente(s).`}
          </p>
          {status.estado === 'erro' && status.detalhe && <p className="ct-heroi__erro">Motivo: {status.detalhe}</p>}
        </div>
      </div>
      <div className="ct-heroi__acoes">
        <button className="botao botao--vidro" onClick={sincronizar} disabled={status.estado === 'sincronizando'}><Icone nome="reiniciar" tamanho={16} /> Sincronizar</button>
        <button className="botao botao--vidro" disabled={ocupado} onClick={() => void sair()}>Sair da conta</button>
      </div>
      {metricas && <dl className="ct-heroi__numeros">
        <a href={href('/dados')}><dt>Questões respondidas</dt><dd>{metricas.respondidas.toLocaleString('pt-BR')}{emblema && <span className="medalha-inline"><Medalha conquista={emblema} tamanho={22} titulo={`Emblema ${emblema.rotulo}`} /></span>}</dd></a>
        <a href={href('/revisao')}><dt>Revisões programadas</dt><dd>{metricas.pendentes.toLocaleString('pt-BR')}</dd></a>
        <a href={href('/dados')}><dt>Acerto acumulado</dt><dd>{metricas.acerto === null ? '0%' : `${metricas.acerto}%`}</dd></a>
      </dl>}
    </section>
    {mensagem && <p className="aviso-formulario" role="status">{mensagem}</p>}

    {status.rejeitados.length > 0 && <section className="ct-rejeitados" id="itens-nao-enviados">
      <header className="ct-cartao__cabeca"><span className="ct-icone ct-icone--alerta"><Icone nome="alerta" tamanho={18} /></span><div><h2>{status.rejeitados.length} {status.rejeitados.length === 1 ? 'item não pôde ser enviado' : 'itens não puderam ser enviados'}</h2><p>{status.rejeitados.length === 1 ? 'Ele continua salvo' : 'Eles continuam salvos'} neste aparelho, mas o servidor recusou o envio. O resto do seu progresso sincronizou normalmente.</p></div></header>
      <ul className="ct-rejeitados__lista">
        {status.rejeitados.slice(0, 8).map((r) => <li key={r.id}><strong>{ROTULOS_TIPO[r.tipo]} · {r.item}</strong><small>{r.erro}</small></li>)}
      </ul>
      {status.rejeitados.length > 8 && <p className="ct-nota">E mais {status.rejeitados.length - 8}.</p>}
      <div className="linha">
        <button className="botao botao--principal" type="button" onClick={reenviarRejeitados}>Tentar enviar de novo</button>
        <button className="botao botao--fantasma" type="button" onClick={() => { if (window.confirm('Descartar o aviso? Os itens continuam neste aparelho, mas não serão reenviados.')) descartarRejeitados() }}>Descartar aviso</button>
        <a className="botao botao--fantasma" href={href(`/contato?assunto=sincronizacao`)}>Relatar o problema</a>
      </div>
    </section>}

    <div className="ct-grade">
      <ResumoAssinatura />
      <section className="ct-cartao">
        <header className="ct-cartao__cabeca"><span className="ct-icone ct-icone--ouro"><Icone nome="trofeu" tamanho={18} /></span><div><h2>Ranking</h2><p>Conta questões respondidas, não acerto.</p></div></header>
        {!rankingCarregado ? <p className="texto-2">Carregando…</p> : <>
          <div className={'ct-status' + (perfilRanking.participa && respondidasConta >= MINIMO_RANKING ? ' ct-status--ativo' : '')}>
            <span className="ct-status__ponto" aria-hidden="true" />
            {!perfilRanking.participa ? 'Você saiu do ranking'
              : respondidasConta >= MINIMO_RANKING ? 'Você está no ranking'
              : `Você entra no ranking ao responder ${MINIMO_RANKING} questões (faltam ${MINIMO_RANKING - respondidasConta})`}
          </div>
          {perfilRanking.participa && <>
            <label className="campo">Seu apelido no ranking
              <input className="entrada" maxLength={APELIDO_MAXIMO} value={apelidoRanking} onChange={e => definirApelidoRanking(e.target.value)} placeholder={nomeCadastroRanking} />
            </label>
            <p className="ct-nome-ranking">Você aparece como: <strong>{nomeExibidoRanking}</strong></p>
          </>}
          <div className="linha">
            {perfilRanking.participa ? <>
              <button className="botao botao--principal" type="button" onClick={() => void salvarApelido(apelidoRanking)} disabled={salvandoRanking || apelidoRanking.trim() === (perfilRanking.apelido ?? '')}>Salvar apelido</button>
              {perfilRanking.apelido && <button className="botao botao--fantasma" type="button" onClick={() => { definirApelidoRanking(''); void salvarApelido('') }} disabled={salvandoRanking}>Usar meu nome</button>}
              <button className="botao botao--fantasma" type="button" onClick={() => { if (window.confirm('Sair do ranking? Seu nome deixa de aparecer para os outros. Você pode voltar quando quiser.')) void alterarParticipacao(false) }} disabled={salvandoRanking}>Sair do ranking</button>
            </> : <button className="botao botao--principal" type="button" onClick={() => void alterarParticipacao(true)} disabled={salvandoRanking}>Voltar ao ranking</button>}
            <a className="botao botao--fantasma" href={href('/ranking')}>Ver ranking</a>
          </div>
          <p className="ct-nota">Deixe o apelido em branco para aparecer com o seu nome e a inicial do sobrenome. E-mail, WhatsApp e cidade nunca aparecem.</p>
        </>}
      </section>

      <section className="ct-cartao">
        <header className="ct-cartao__cabeca"><span className="ct-icone"><Icone nome="livro" tamanho={18} /></span><div><h2>Preferências de estudo</h2><p>Leitura, tema e meta de revisão.</p></div></header>
        <div className="ct-opcao"><span className="ct-opcao__rotulo">Meta diária de revisão</span><div className="ct-seg" aria-label="Meta diária de revisão">{[10, 20, 30].map(meta => <button type="button" key={meta} aria-pressed={metaDiaria === meta} onClick={() => definirMetaDiaria(meta)}>{meta}/dia</button>)}</div></div>
        <div className="ct-opcao"><span className="ct-opcao__rotulo">Densidade da leitura</span><div className="ct-seg">{([['confortavel', 'Confortável'], ['compacta', 'Compacta'], ['foco', 'Foco']] as const).map(([valor, rotulo]) => <button key={valor} type="button" aria-pressed={densidade === valor} onClick={() => definirDensidade(valor)}>{rotulo}</button>)}</div></div>
        <div className="ct-opcao"><span className="ct-opcao__rotulo">Tema</span><div className="ct-seg">{([['claro', 'Claro'], ['escuro', 'Escuro']] as const).map(([valor, rotulo]) => <button key={valor} type="button" aria-pressed={tema === valor} onClick={() => trocarTema(valor)}>{rotulo}</button>)}</div></div>
        <label className="ct-opcao ct-opcao--faixa"><span className="ct-opcao__rotulo">Tamanho da fonte <output>{fonte}%</output></span><input className="ct-faixa" type="range" min="90" max="120" step="5" value={fonte} onChange={e => definirFonte(Number(e.target.value))} /></label>
        <label className="ct-interruptor"><input type="checkbox" checked={mostrarEtiquetas} onChange={e => definirEtiquetas(e.target.checked)} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span>Mostrar a etiqueta do assunto antes de responder</span></label>
      </section>

      <section className="ct-cartao ct-cartao--largo">
        <header className="ct-cartao__cabeca"><span className="ct-icone"><Icone nome="usuario" tamanho={18} /></span><div><h2>Meu perfil</h2><p>Personaliza sua experiência. Seu contato nunca é exibido publicamente.</p></div></header>
        <div className="linha-campos linha-campos--2"><label className="campo">Nome<input className="entrada" required minLength={2} value={nome} onChange={e => definirNome(e.target.value)} /></label><label className="campo">Sobrenome<input className="entrada" required minLength={2} value={sobrenome} onChange={e => definirSobrenome(e.target.value)} /></label></div>
        <div className="linha-campos linha-campos--2"><label className="campo">Data de nascimento<input className="entrada" type="date" value={nascimento} onChange={e => definirNascimento(e.target.value)} /></label><label className="campo">Você é <select className="entrada" value={situacao} onChange={e => definirSituacao(e.target.value)}><option value="">Escolha uma opção</option><option value="residente">Residente de ortopedia</option><option value="ortopedista">Ortopedista</option><option value="outro">Outro profissional ou estudante</option></select></label></div>
        <label className="campo">Serviço onde faz residência ou trabalha<input className="entrada" value={servico} onChange={e => definirServico(e.target.value)} placeholder="Ex.: Hospital / clínica / instituição" /></label>
        <div className="linha-campos linha-campos--2"><label className="campo"><span>WhatsApp <span className="meta">(opcional)</span></span><input className="entrada" type="tel" autoComplete="tel" value={whatsapp} onChange={e => definirWhatsapp(e.target.value)} placeholder="(00) 00000-0000" /></label><label className="campo"><span>Cidade <span className="meta">(opcional)</span></span><input className="entrada" autoComplete="address-level2" value={cidade} onChange={e => definirCidade(e.target.value)} /></label></div>
        <div className="linha-campos linha-campos--2"><label className="campo"><span>UF <span className="meta">(opcional)</span></span><select className="entrada" value={uf} onChange={e => definirUf(e.target.value)}><option value="">Selecione</option>{['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(sigla => <option key={sigla}>{sigla}</option>)}</select></label><label className="campo campo--checkbox"><input type="checkbox" checked={receberNovidades} onChange={e => definirReceberNovidades(e.target.checked)} /> Quero receber novidades sobre o OrtoQuestões</label></div>
        <p className="texto-2">WhatsApp, cidade e UF são opcionais. Usamos seus dados de perfil para personalizar sua experiência e nunca exibimos seu contato publicamente.</p>
        <button className="botao botao--principal" type="button" onClick={salvarPerfil} disabled={salvandoPerfil}>{salvandoPerfil ? 'Salvando…' : 'Salvar perfil'}</button>
      </section>

      <section className="ct-cartao">
        <header className="ct-cartao__cabeca"><span className="ct-icone"><Icone nome="alerta" tamanho={18} /></span><div><h2>Segurança</h2><p>Trocar o e-mail exige confirmação pelo novo endereço.</p></div></header>
        <label className="campo">Novo e-mail<input className="entrada" type="email" value={novoEmail} onChange={e => definirNovoEmail(e.target.value)} placeholder="novo@email.com" /></label>
        <div className="linha"><button className="botao botao--principal" type="button" onClick={() => void trocarEmail()} disabled={ocupado || !novoEmail.trim()}>Trocar e-mail</button></div>
        <p className="ct-nota">Conta criada em {new Date(sessao.user.created_at).toLocaleDateString('pt-BR')}. Quer apagar tudo? <a href={href('/contato?assunto=exclusao-conta')}>Solicitar exclusão da conta</a>.</p>
      </section>

      <section className="ct-cartao">
        <header className="ct-cartao__cabeca"><span className="ct-icone"><Icone nome="baixar" tamanho={18} /></span><div><h2>Dados e backup</h2><p>Exporte seu progresso ou comece do zero.</p></div></header>
        <p className="texto-2">Respostas, revisões, favoritas, anotações e histórico ficam na sua conta e acompanham você em qualquer aparelho. A sessão em andamento fica neste dispositivo.</p>
        <div className="linha"><a className="botao" href={href('/dados')}>Desempenho e backup</a><a className="botao botao--fantasma" href={href('/revisao')}>Minha revisão</a></div>
      </section>
    </div>

      {possuiVisitante && !importado && <section className="cartao cartao__corpo empilha"><h2>Você já estudou neste navegador</h2><p>Importe o progresso de visitante para esta conta. Só serão acrescentados itens que ainda não existem nela. Em um dispositivo compartilhado, importe apenas se esse progresso for seu.</p><button className="botao botao--principal" onClick={importar} disabled={!status.pronto}>Importar meu progresso de visitante</button></section>}
      {status.conflitos.length > 0 && <section className="empilha"><h2>Confira as alterações simultâneas</h2><p>Este item mudou em outro dispositivo antes de sua alteração chegar. Escolha qual versão manter.</p>
        {status.conflitos.map(doc => <div className="cartao cartao__corpo empilha" key={`${doc.tipo}/${doc.item}`}><h3>{ROTULOS_TIPO[doc.tipo]} · {doc.item}</h3>
          <details><summary>Comparar versões</summary><p>Versão deste navegador</p><pre>{JSON.stringify(itens(doc.tipo, ler(doc.tipo, null))[doc.item] ?? null, null, 2)}</pre><p>Versão da conta</p><pre>{JSON.stringify(doc.valor, null, 2)}</pre></details>
          <div className="linha"><button className="botao" onClick={() => resolver(doc, true)}>Manter deste navegador</button><button className="botao" onClick={() => resolver(doc, false)}>Usar versão da conta</button></div></div>)}
      </section>}
  </article>
}
