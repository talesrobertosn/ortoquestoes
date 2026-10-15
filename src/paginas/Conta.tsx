import { useEffect, useState, type FormEvent } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, retornoConta, supabase } from '../conta/supabase'
import { avisoConta, definirAvisoConta } from '../conta/retornoAuth'
import { descreverAparelho, lembrarEmail, ultimoEmail } from '../conta/aparelho'
import { usarAdministrador } from '../conta/administrador'
import { gravarPreferenciaConquistas, lerPreferenciaConquistas } from '../conta/emailsMarco'
import { usarPremium } from '../conta/premium'
import { chamarRpc } from '../servicos/supabase'
import { TIPOS_SYNC, deItens, itens } from '../conta/modeloSync'
import { gravar, ler, lerVisitante } from '../estado/armazenamento'
import { href, navegar } from '../util/rotas'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { usarIndice } from '../dados/usarIndice'
import { planoRevisao } from '../estado/planoRevisao'
import { usarLeitura, usarEtiquetas, usarRitmoRevisao } from '../estado/preferencias'
import { usarTema } from '../estado/tema'
import { dadosAceiteTermos, VERSAO_TERMOS } from '../conta/termos'
import { dadosOrigem } from '../conta/origem'
import { eventoMeta } from '../conta/consentimento'
import { textoErro } from '../conta/erros'
import { emailTrazido, esquecerEmailTrazido, guardarVoltar, rotaVoltar, tomarVoltar } from '../conta/passagem'
import { gravarConfirmacaoPendente, lerConfirmacaoPendente, limparConfirmacaoPendente } from '../conta/confirmacaoPendente'
import { guardarPerfilPendente } from '../conta/perfilPendente'
import { ModalConfirmarEmail } from '../componentes/ModalConfirmarEmail'
import { Icone } from '../componentes/Icone'
import { BotaoGoogle } from '../componentes/BotaoGoogle'
import { Medalha } from '../componentes/Medalha'
import { conquistaAtual, emblemaPorId } from '../estado/conquistas'
import { ResumoAssinatura } from '../componentes/ResumoAssinatura'
import { MINIMO_RANKING } from '../util/nomeRanking'
import { APELIDO_MAXIMO, usarPerfilRanking } from '../conta/perfilRanking'
import { lerProvas, type ProvaInteresse } from '../conta/perfilEstudo'
import { CampoServico } from '../componentes/CampoServico'
import { CamposEtapa } from '../componentes/CamposEtapa'
import { OpcaoServicoRanking } from '../componentes/ServicoRanking'
import '../estilos/paginas/Conta.css'
import { fraseGratis } from '../config'

const ROTULOS_STATUS = {
  sincronizando: 'Sincronizando seu progresso…', salvo: 'Progresso sincronizado', offline: 'Sem conexão. As alterações serão enviadas quando você voltar à internet.',
  erro: 'Não foi possível sincronizar agora. Seu progresso continua neste navegador; tente novamente.', conflito: 'Há alterações simultâneas para conferir abaixo.',
}
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
const ROTULOS_TIPO = { respondidas: 'Resposta', notas: 'Anotação', favoritos: 'Favorita', historico: 'Sessão' }
const SECOES_CONTA = [['perfil', 'usuario', 'Perfil'], ['assinatura', 'medalha', 'Assinatura'], ['estudo', 'livro', 'Estudo'], ['ranking', 'trofeu', 'Ranking'], ['seguranca', 'cadeado', 'Segurança'], ['dados', 'baixar', 'Dados']] as const
type SecaoConta = (typeof SECOES_CONTA)[number][0]

export function Conta({ consulta }: { consulta?: URLSearchParams }) {
  const { sessao, recuperacao, encerrarRecuperacao, status, sincronizar, resolver, reenviarRejeitados, descartarRejeitados } = usarConta()
  const modoInicial = consulta?.get('modo')
  const [secao, definirSecao] = useState<SecaoConta>(() => {
    const pedida = consulta?.get('secao')
    return SECOES_CONTA.some(([id]) => id === pedida) ? pedida as SecaoConta : 'perfil'
  })
  const [modo, definirModo] = useState<'entrar' | 'criar' | 'recuperar'>(
    modoInicial === 'criar' || modoInicial === 'recuperar' ? modoInicial : 'entrar',
  )
  // Destino de quem chegou por um convite (planos, treinar, questão avulsa): vale
  // para entrar, para o cadastro e para a volta do Google. Ver conta/passagem.ts.
  const voltar = rotaVoltar(consulta?.get('voltar'))
  // "Esqueceu a senha?" no pop-up de entrar traz o e-mail que já foi digitado lá.
  const [email, definirEmail] = useState(() => emailTrazido() || ultimoEmail()), [senha, definirSenha] = useState('')
  useEffect(() => esquecerEmailTrazido(), [])
  const [confirmacao, definirConfirmacao] = useState(''), [verSenha, definirVerSenha] = useState(false)
  const [novaSenha, definirNovaSenha] = useState(''), [confirmacaoNovaSenha, definirConfirmacaoNovaSenha] = useState('')
  // Aviso deixado pelo retorno de um link de e-mail com problema (expirado,
  // já usado, aberto em outro navegador). Ver conta/retornoAuth.ts.
  const [ocupado, definirOcupado] = useState(false), [mensagem, definirMensagem] = useState(avisoConta)
  const [novoEmail, definirNovoEmail] = useState('')
  // Erro do formulário de entrar/cadastrar: aparece grande, junto do botão (o
  // aviso no topo passava batido, principalmente com o teclado do celular aberto).
  const [erroForm, definirErroForm] = useState<{ texto: string; codigo?: string; campo?: string; n: number } | null>(null)
  const falhar = (texto: string, codigo?: string, campo?: string) => { definirMensagem(''); definirErroForm((e) => ({ texto, codigo, campo, n: (e?.n ?? 0) + 1 })) }
  // Depois da primeira tentativa de criar a conta, cada campo que falta fica em
  // vermelho com a explicação embaixo, e some assim que é preenchido.
  const [tentouCriar, definirTentouCriar] = useState(false)
  // Cadastro em dois passos: o passo 1 (e-mail, senha e aceite) cria a conta; o
  // passo 2 pede o perfil, que dá para pular. `comSessao`: a conta já abriu (sem
  // confirmação de e-mail); sem ela, o perfil espera a confirmação neste navegador.
  const [perfilDepois, definirPerfilDepois] = useState<{ email: string; comSessao: boolean } | null>(null)
  const [tentouPerfil, definirTentouPerfil] = useState(false)
  function irParaCampo(campo: string) {
    const caixa = document.querySelector<HTMLElement>(`[data-campo="${campo}"]`)
    if (!caixa) return
    caixa.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setTimeout(() => caixa.querySelector<HTMLElement>('input, select, button')?.focus({ preventScroll: true }), 450)
  }
  // Cadastro feito e e-mail ainda não confirmado: pop-up no meio da tela.
  const [pendente, definirPendente] = useState<string | null>(lerConfirmacaoPendente)
  useEffect(() => { if (sessao) { limparConfirmacaoPendente(); definirPendente(null) } }, [sessao])
  useEffect(() => {
    if (!erroForm) return
    // Senha errada: o foco volta para a senha, já selecionada, para redigitar.
    if (erroForm.codigo === 'invalid_credentials') document.querySelector<HTMLInputElement>('#acesso-senha')?.select()
    // Cadastro incompleto: a tela volta até o primeiro campo que falta.
    if (erroForm.campo) irParaCampo(erroForm.campo)
    else document.querySelector('.aviso-formulario--destaque')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [erroForm])
  const [importado, definirImportado] = useState(false)
  const administrador = usarAdministrador(sessao?.user.id)
  // null = ainda não sabemos (ou o banco não tem a preferência): o interruptor fica escondido.
  const [emailsConquistas, definirEmailsConquistas] = useState<boolean | null>(null)
  useEffect(() => { if (sessao?.user.id) void lerPreferenciaConquistas().then(definirEmailsConquistas) }, [sessao?.user.id])
  const trocarEmailsConquistas = async (valor: boolean) => {
    definirEmailsConquistas(valor)
    if (!await gravarPreferenciaConquistas(valor)) { definirEmailsConquistas(!valor); definirMensagem('Não foi possível salvar a preferência de e-mail agora.') }
  }
  // Relatório mensal: só aparece para quem tem o plano (é quem recebe).
  const { premium } = usarPremium()
  const [relatorioMensal, definirRelatorioMensal] = useState<boolean | null>(null)
  useEffect(() => {
    if (!sessao?.user.id || !premium) return
    chamarRpc<Array<{ relatorio_mensal: boolean }>>('obter_preferencias_email_completas', {}).then(([p]) => definirRelatorioMensal(p?.relatorio_mensal ?? true)).catch(() => undefined)
  }, [sessao?.user.id, premium])
  const trocarRelatorioMensal = async (valor: boolean) => {
    definirRelatorioMensal(valor)
    try { await chamarRpc('definir_preferencia_relatorio', { p_relatorio: valor }) }
    catch { definirRelatorioMensal(!valor); definirMensagem('Não foi possível salvar a preferência de e-mail agora.') }
  }
  // Lembretes de estudo (3 e 7 dias sem aparecer): para todas as contas.
  const [lembretes, definirLembretes] = useState<boolean | null>(null)
  useEffect(() => {
    if (!sessao?.user.id) return
    chamarRpc<boolean>('obter_preferencia_lembretes', {}).then((v) => definirLembretes(v !== false)).catch(() => undefined)
  }, [sessao?.user.id])
  const trocarLembretes = async (valor: boolean) => {
    definirLembretes(valor)
    try { await chamarRpc('definir_preferencia_lembretes', { p_lembretes: valor }) }
    catch { definirLembretes(!valor); definirMensagem('Não foi possível salvar a preferência de e-mail agora.') }
  }
  const { contexto } = usarContextoLocal('')
  const { indice } = usarIndice()
  const { ritmo, definirRitmo } = usarRitmoRevisao()
  const { densidade, definirDensidade, fonte, definirFonte } = usarLeitura()
  const { mostrarEtiquetas, definirEtiquetas } = usarEtiquetas()
  const { tema, trocar: trocarTema } = usarTema()
  const perfil = sessao?.user.user_metadata ?? {}
  const [nome, definirNome] = useState(String(perfil.nome ?? ''))
  const [sobrenome, definirSobrenome] = useState(String(perfil.sobrenome ?? ''))
  const [nascimento, definirNascimento] = useState(String(perfil.nascimento ?? ''))
  const [servico, definirServico] = useState(String(perfil.servico ?? perfil.residencia ?? ''))
  const [situacao, definirSituacao] = useState(String(perfil.situacao ?? ''))
  const [anoResidencia, definirAnoResidencia] = useState(String(perfil.ano_residencia ?? ''))
  const [provas, definirProvas] = useState<ProvaInteresse[]>(() => lerProvas(perfil.provas_interesse))
  const [whatsapp, definirWhatsapp] = useState(String(perfil.whatsapp ?? ''))
  const [cidade, definirCidade] = useState(String(perfil.cidade ?? ''))
  const [uf, definirUf] = useState(String(perfil.uf ?? ''))
  const [receberNovidades, definirReceberNovidades] = useState(Boolean(perfil.receber_novidades ?? false))
  const [aceitouTermos, definirAceitouTermos] = useState(false)
  const [aceiteAtualizado, definirAceiteAtualizado] = useState(false)
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
  function perfilCompleto(avisar: (texto: string) => void = definirMensagem) {
    if (nome.trim().length < 2) { avisar('Informe seu nome.'); return false }
    if (sobrenome.trim().length < 2) { avisar('Informe seu sobrenome.'); return false }
    // Quem estuda para prova de ortopedia tem pelo menos 18 anos; o campo de data
    // às vezes fica com o dia de hoje quando a pessoa só toca nele.
    const anos = nascimento ? (Date.now() - new Date(`${nascimento}T12:00:00`).getTime()) / (365.25 * 864e5) : NaN
    if (!(anos >= 18 && anos <= 100)) { avisar('Confira a data de nascimento: ela parece incompleta ou com o ano errado.'); return false }
    if (!situacao) { avisar('Informe sua etapa profissional.'); return false }
    if (situacao === 'residente' && !anoResidencia) { avisar('Informe o ano da residência (R1, R2 ou R3).'); return false }
    if (!provas.length) { avisar('Marque ao menos uma prova para a qual você estuda.'); return false }
    if (servico.trim().length < 2) { avisar('Informe o serviço onde você atua ou faz residência.'); return false }
    return true
  }
  /** Passo 1 do cadastro, o que falta, na ordem da tela: [campo, nome curto, explicação]. */
  function faltasCadastro(): Array<[string, string, string]> {
    const f: Array<[string, string, string]> = []
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) f.push(['email', 'e-mail', 'Informe um e-mail válido.'])
    if (senha.length < 8) f.push(['senha', 'senha', 'Use pelo menos 8 caracteres.'])
    else if (confirmacao !== senha) f.push(['confirmacao', 'confirmação da senha', 'Digite a mesma senha nos dois campos.'])
    if (!aceitouTermos) f.push(['termos', 'aceite dos Termos de Uso', 'Marque que leu e aceita os Termos de Uso.'])
    return f
  }
  /** Passo 2 (perfil): tudo é opcional, mas o que foi preenchido precisa estar certo. */
  function faltasPerfilCadastro(): Array<[string, string, string]> {
    const f: Array<[string, string, string]> = []
    const anos = nascimento ? (Date.now() - new Date(`${nascimento}T12:00:00`).getTime()) / (365.25 * 864e5) : NaN
    if (nascimento && !(anos >= 18 && anos <= 100)) f.push(['nascimento', 'data de nascimento', 'Confira dia, mês e ano: a data parece incompleta ou com o ano errado (ou deixe em branco).'])
    if (situacao === 'residente' && !anoResidencia) f.push(['ano', 'ano da residência', 'Escolha R1, R2 ou R3.'])
    if (whatsapp.trim() && whatsapp.replace(/\D/g, '').length < 10) f.push(['whatsapp', 'WhatsApp', 'Confira o WhatsApp: use o DDD e o número (ou deixe em branco).'])
    return f
  }
  /** Só o que foi preenchido no passo 2: o que ficar em branco o "Complete seu perfil" pede depois. */
  function dadosPerfilPreenchidos(): Record<string, unknown> {
    const d: Record<string, unknown> = {}
    if (nome.trim()) d.nome = nome.trim()
    if (sobrenome.trim()) d.sobrenome = sobrenome.trim()
    if (nascimento) d.nascimento = nascimento
    if (situacao) { d.situacao = situacao; if (situacao === 'residente') d.ano_residencia = anoResidencia }
    if (provas.length) d.provas_interesse = provas
    if (situacao && provas.length) Object.assign(d, { perfil_estudo_em: new Date().toISOString(), perfil_estudo_perguntado: true })
    if (servico.trim().length >= 2) d.servico = servico.trim()
    if (cidade.trim()) d.cidade = cidade.trim()
    if (uf) d.uf = uf
    if (whatsapp.trim()) d.whatsapp = whatsapp.trim()
    return d
  }
  function dadosPerfil() {
    return {
      nome: nome.trim(), sobrenome: sobrenome.trim(), nascimento, situacao,
      ano_residencia: situacao === 'residente' ? anoResidencia : null, provas_interesse: provas,
      perfil_estudo_em: new Date().toISOString(), perfil_estudo_perguntado: true,
      servico: servico.trim(), whatsapp: whatsapp.trim(), cidade: cidade.trim(), uf,
      receber_novidades: receberNovidades,
    }
  }
  if (!contasDisponiveis || !supabase) return <article className="limite-leitura empilha"><h1>Sua conta</h1><p>As contas estão em preparação. Você já pode estudar gratuitamente. O progresso só é salvo depois que uma conta estiver disponível.</p><a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a></article>
  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!supabase || ocupado) return
    const pedeConfirmacao = recuperacao || modo === 'criar'
    definirErroForm(null)
    if (modo === 'criar' && !recuperacao) {
      const faltas = faltasCadastro()
      if (faltas.length) {
        definirTentouCriar(true)
        const nomes = faltas.map(([, n]) => n)
        const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0]
        falhar(`${faltas.length > 1 ? `Faltam ${faltas.length} campos` : 'Falta um campo'}: ${lista}. ${faltas.length > 1 ? 'Eles estão marcados' : 'Ele está marcado'} em vermelho.`, 'incompleto', faltas[0][0])
        return
      }
    }
    if (pedeConfirmacao && senha !== confirmacao) { falhar('As senhas não coincidem. Digite a mesma senha nos dois campos.'); return }
    definirOcupado(true); definirMensagem(''); definirAvisoConta('')
    try {
      if (recuperacao && sessao) {
        const { error } = await supabase.auth.updateUser({ password: senha })
        if (error) throw error
        definirSenha(''); definirConfirmacao(''); encerrarRecuperacao(); definirMensagem('Senha atualizada.')
      } else if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
        if (error) throw error
        lembrarEmail(email.trim())
        limparConfirmacaoPendente()
        definirSenha('')
        // Convite aberto antes de entrar (liga, planos, treinar): volta para ele;
        // sem convite na rota, vale o de um cadastro feito antes neste navegador.
        // Consome o destino guardado mesmo quando o da URL vence: ele vale uma vez só e
        // não pode sobrar para um login posterior (talvez de outra conta) neste navegador.
        const guardado = tomarVoltar()
        const destino = voltar ?? guardado
        if (destino) navegar(destino)
        else navegar('/')
      } else if (modo === 'criar') {
        if (!aceitouTermos) { falhar('Marque que leu e aceita os Termos de Uso para criar sua conta.'); return }
        // A conta só abre depois de confirmar o e-mail: o destino fica guardado
        // para a volta do link (ContextoConta) ou para o próximo "Entrar".
        guardarVoltar(voltar)
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha, options: { emailRedirectTo: retornoConta(), data: { receber_novidades: receberNovidades, ...dadosAceiteTermos(), ...dadosOrigem() } } })
        if (error) throw error
        // Com a confirmação ligada, o Supabase não revela que o e-mail já existe:
        // devolve um usuário sem identidades. É o sinal de cadastro repetido.
        if (data.user && data.user.identities?.length === 0) { falhar('Este e-mail já tem cadastro no Orto Questões. Entre com a sua senha ou recupere o acesso.', 'ja_cadastrado'); return }
        eventoMeta('CompleteRegistration', { content_name: 'email' })
        // Conta criada: agora o passo 2 (perfil). O pop-up de confirmar o e-mail
        // vem depois dele, para não cobrir o formulário.
        if (!data.session) gravarConfirmacaoPendente(email.trim())
        definirSenha(''); definirConfirmacao(''); definirTentouPerfil(false)
        definirPerfilDepois({ email: email.trim(), comSessao: Boolean(data.session) })
        window.scrollTo({ top: 0 })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: retornoConta(true) })
        if (error) throw error
        definirMensagem('Se houver uma conta para esse e-mail, você receberá um link para redefinir a senha. Abra o link neste mesmo navegador.')
      }
    } catch (e) {
      const codigo = (e as { code?: string }).code
      // Conta criada mas ainda sem confirmar: o pop-up explica e reenvia.
      if (codigo === 'email_not_confirmed') { definirPendente(email.trim()); return }
      falhar(textoErro(codigo), codigo)
    }
    finally { definirOcupado(false) }
  }
  /** Passo 2: salva o que foi preenchido (ou pula) e segue para onde a pessoa ia. */
  async function concluirPerfil(pular: boolean) {
    if (!perfilDepois || ocupado) return
    definirErroForm(null)
    if (!pular) {
      const faltas = faltasPerfilCadastro()
      if (faltas.length) {
        definirTentouPerfil(true)
        falhar(`Confira ${faltas.length > 1 ? 'os campos marcados' : 'o campo marcado'} em vermelho: ${faltas.map(([, n]) => n).join(', ')}. Ou pule e complete depois.`, 'incompleto', faltas[0][0])
        return
      }
      const dados = dadosPerfilPreenchidos()
      if (Object.keys(dados).length) {
        if (perfilDepois.comSessao && supabase) {
          definirOcupado(true)
          const { error } = await supabase.auth.updateUser({ data: dados })
          definirOcupado(false)
          if (error) { falhar('Não foi possível salvar o perfil agora. Você pode pular e completar depois em Minha conta › Perfil.'); return }
        } else guardarPerfilPendente(perfilDepois.email, dados)
      }
    }
    const { email: criado, comSessao } = perfilDepois
    definirPerfilDepois(null)
    if (comSessao) { const guardado = tomarVoltar(); navegar(voltar ?? guardado ?? '/'); return }
    definirPendente(criado)
  }
  async function reenviar() {
    if (!supabase || ocupado || !email.trim()) return
    definirOcupado(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: retornoConta() } })
      if (error) throw error
      definirPendente(email.trim())
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
  async function trocarSenha(e: FormEvent) {
    e.preventDefault()
    if (!supabase || ocupado || !sessao) return
    if (novaSenha.length < 8) { definirMensagem('Use pelo menos 8 caracteres na nova senha.'); return }
    if (novaSenha !== confirmacaoNovaSenha) { definirMensagem('As senhas não coincidem.'); return }
    definirOcupado(true); definirMensagem('')
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) throw error
      definirNovaSenha(''); definirConfirmacaoNovaSenha('')
      definirMensagem('Senha alterada com segurança.')
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
    const pendentes = [...planoRevisao(indice, contexto.respondidas, 1, ritmo).values()].reduce((total, dia) => total + dia.ids.length, 0)
    return { respondidas: registros.length, acerto: tentativas ? Math.round((acertos / tentativas) * 100) : null, pendentes }
  })() : null
  const trocarModo = (m: typeof modo) => { definirModo(m); definirMensagem(''); definirErroForm(null); definirSenha(''); definirConfirmacao('') }
  const pedeConfirmacao = recuperacao || modo === 'criar'
  const senhasConferem = confirmacao.length > 0 && confirmacao === senha
  const criando = !recuperacao && modo === 'criar'
  const errosCadastro: Record<string, string> = perfilDepois ? (tentouPerfil ? Object.fromEntries(faltasPerfilCadastro().map(([c, , m]) => [c, m])) : {})
    : criando && tentouCriar ? Object.fromEntries(faltasCadastro().map(([c, , m]) => [c, m])) : {}
  const inv = (c: string) => errosCadastro[c] ? ' entrada--invalida' : ''
  const erroDe = (c: string) => errosCadastro[c] && <span className="campo__erro" role="alert"><Icone nome="alerta" tamanho={14} />{errosCadastro[c]}</span>
  // Sem o selo "obrigatório" em cada campo: a validação continua e só avisa o que faltou ao enviar.
  const obrig = null
  if (!sessao || recuperacao || perfilDepois) {
    const titulo = recuperacao ? 'Crie uma nova senha' : modo === 'criar' ? 'Criar conta gratuita' : modo === 'recuperar' ? 'Recuperar senha' : 'Entrar na sua conta'
    const subtitulo = recuperacao ? 'Escolha a nova senha e confirme logo abaixo.' : modo === 'criar' ? 'Só e-mail e senha. Depois é confirmar o e-mail.' : modo === 'recuperar' ? 'Informe seu e-mail e enviaremos um link para criar uma nova senha.' : 'Continue de onde parou, em qualquer dispositivo.'
    return <div className="acesso">
      <aside className="acesso__vitrine">
        <p className="acesso__marca"><span>Orto</span> Questões</p>
        <h1>{modo === 'criar' ? 'Sua preparação, organizada do primeiro ao último dia.' : 'Que bom ter você de volta.'}</h1>
        <p className="acesso__lide">Questões das provas oficiais de TEOT, TARO, ENARE R4, TECOC (ombro e cotovelo) e outras provas, com comentário e referência.</p>
        <ul className="acesso__beneficios">
          <li><span><Icone nome="grafico" tamanho={18} /></span>Desempenho por tema e por prova</li>
          <li><span><Icone nome="calendario" tamanho={18} /></span>Revisão espaçada montada para você</li>
          <li><span><Icone nome="estrela" tamanho={18} /></span>Favoritas e anotações nas questões</li>
          <li><span><Icone nome="raio" tamanho={18} /></span>Sequência de dias, ranking e emblemas</li>
        </ul>
        <p className="acesso__rodape">Comece grátis, sem cartão de crédito. Entre de qualquer aparelho e continue de onde parou. {fraseGratis('rodape')}</p>
      </aside>
      <section className="acesso__cartao">
        {perfilDepois ? <>
          <header className="acesso__cabeca">
            <p className="acesso__passo">Passo 2 de 2 · opcional</p>
            <h2>Conte um pouco sobre você</h2>
            <p>Com isso, o site sugere as provas certas e o ranking mostra seu nome. Dá para pular e completar depois em Minha conta.</p>
          </header>
          <p className="aviso-formulario aviso-formulario--sucesso" role="status"><Icone nome="certo" tamanho={18} /> <span>{perfilDepois.comSessao ? 'Conta criada.' : <>Conta criada. Enviamos um link de confirmação para <strong>{perfilDepois.email}</strong>: abra-o para entrar. O que você preencher aqui entra na conta quando ela for confirmada.</>}</span></p>
          <form className="empilha acesso__form" onSubmit={(e) => { e.preventDefault(); void concluirPerfil(false) }} noValidate>
            <div className="linha-campos linha-campos--2"><label className="campo" data-campo="nome"><span className="campo__rotulo">Nome</span><input className="entrada" autoComplete="given-name" value={nome} onChange={e => definirNome(e.target.value)} placeholder="Como podemos chamar você?" /></label><label className="campo" data-campo="sobrenome"><span className="campo__rotulo">Sobrenome</span><input className="entrada" autoComplete="family-name" value={sobrenome} onChange={e => definirSobrenome(e.target.value)} /></label></div>
            <CamposEtapa situacao={situacao} ano={anoResidencia} provas={provas} aoMudarSituacao={definirSituacao} aoMudarAno={definirAnoResidencia} aoMudarProvas={definirProvas} erros={errosCadastro} />
            <CampoServico situacao={situacao} valor={servico} aoMudar={definirServico} />
            <label className="campo" data-campo="nascimento"><span className="campo__rotulo">Data de nascimento</span><input className={'entrada' + inv('nascimento')} type="date" value={nascimento} onChange={e => definirNascimento(e.target.value)} />{erroDe('nascimento')}</label>
            <div className="linha-campos linha-campos--2"><label className="campo" data-campo="cidade"><span className="campo__rotulo">Cidade</span><input className="entrada" autoComplete="address-level2" value={cidade} onChange={e => definirCidade(e.target.value)} /></label><label className="campo" data-campo="uf"><span className="campo__rotulo">UF</span><select className="entrada" value={uf} onChange={e => definirUf(e.target.value)}><option value="">Selecione</option>{UFS.map(sigla => <option key={sigla}>{sigla}</option>)}</select></label></div>
            <label className="campo" data-campo="whatsapp"><span className="campo__rotulo">WhatsApp com DDD</span><input className={'entrada' + inv('whatsapp')} type="tel" autoComplete="tel" value={whatsapp} onChange={e => definirWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />{erroDe('whatsapp')}</label>
            <p className="meta">Seu contato nunca aparece para outros usuários.</p>
            {erroForm && <div key={erroForm.n} className="aviso-formulario aviso-formulario--erro aviso-formulario--destaque" role="alert"><Icone nome="alerta" tamanho={20} /><span>{erroForm.texto}</span></div>}
            <div className="acesso__acoes-perfil">
              <button className="botao botao--principal" disabled={ocupado}>{ocupado ? 'Aguarde…' : 'Salvar e continuar'}</button>
              <button type="button" className="botao botao--fantasma" disabled={ocupado} onClick={() => void concluirPerfil(true)}>Pular por agora</button>
            </div>
          </form>
        </> : <>
        {!recuperacao && modo !== 'recuperar' && <div className="acesso__abas" role="tablist">{(['entrar', 'criar'] as const).map(m => <button type="button" role="tab" aria-selected={modo === m} className="acesso__aba" onClick={() => trocarModo(m)} key={m}>{m === 'entrar' ? 'Entrar' : 'Criar conta'}</button>)}</div>}
        <header className="acesso__cabeca">
          {modo === 'recuperar' && !recuperacao && <button type="button" className="acesso__voltar" onClick={() => trocarModo('entrar')}><Icone nome="esquerda" tamanho={16} /> Voltar para entrar</button>}
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </header>
        {mensagem && <p className="aviso-formulario" role="status">{mensagem}</p>}
        {!recuperacao && modo !== 'recuperar' && <BotaoGoogle />}
        <form className="empilha acesso__form" onSubmit={enviar} noValidate={criando}>
          {!recuperacao && <label className="campo" data-campo="email"><span className="campo__rotulo">E-mail {obrig}</span><input id="acesso-email" className={'entrada' + (erroForm?.codigo === 'ja_cadastrado' ? ' entrada--invalida' : inv('email'))} type="email" autoComplete="email" required value={email} onChange={e => definirEmail(e.target.value)} placeholder="voce@email.com" />{erroDe('email')}</label>}
          {(recuperacao || modo !== 'recuperar') && <div className="campo" data-campo="senha">
            <span className="acesso__rotulo-senha"><label htmlFor="acesso-senha">{recuperacao ? 'Nova senha' : 'Senha'} {obrig}</label>{modo === 'entrar' && !recuperacao && <button type="button" className="acesso__link" onClick={() => trocarModo('recuperar')}>Esqueceu a senha?</button>}</span>
            <span className="acesso__senha">
              <input id="acesso-senha" className={'entrada' + (erroForm?.codigo === 'invalid_credentials' ? ' entrada--invalida' : inv('senha'))} aria-invalid={erroForm?.codigo === 'invalid_credentials' || undefined} type={verSenha ? 'text' : 'password'} autoComplete={modo === 'entrar' && !recuperacao ? 'current-password' : 'new-password'} minLength={modo === 'entrar' && !recuperacao ? undefined : 8} required value={senha} onChange={e => definirSenha(e.target.value)} />
              <button type="button" className="acesso__olho" onClick={() => definirVerSenha(v => !v)} aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={verSenha}><Icone nome={verSenha ? 'olho-riscado' : 'olho'} tamanho={18} /></button>
            </span>
            {pedeConfirmacao && <span className="meta">Mínimo de 8 caracteres.</span>}
            {erroDe('senha')}
          </div>}
          {pedeConfirmacao && <div className="campo" data-campo="confirmacao">
            <label htmlFor="acesso-confirmacao">Confirmar senha {obrig}</label>
            <input id="acesso-confirmacao" className={`entrada${(confirmacao && !senhasConferem) || errosCadastro.confirmacao ? ' entrada--invalida' : ''}`} type={verSenha ? 'text' : 'password'} autoComplete="new-password" required value={confirmacao} onChange={e => definirConfirmacao(e.target.value)} aria-describedby="acesso-confere" />
            {confirmacao && <span id="acesso-confere" className={`acesso__confere ${senhasConferem ? 'acesso__confere--ok' : 'acesso__confere--nao'}`} role="status"><Icone nome={senhasConferem ? 'certo' : 'errado'} tamanho={14} />{senhasConferem ? 'As senhas coincidem' : 'As senhas ainda não coincidem'}</span>}
          </div>}
          {!recuperacao && modo === 'criar' && <>
            <label className="campo campo--checkbox"><input type="checkbox" checked={receberNovidades} onChange={e => definirReceberNovidades(e.target.checked)} /> Quero receber novidades sobre o Orto Questões</label>
            <label className={'campo campo--checkbox' + (errosCadastro.termos ? ' campo--checkbox-invalido' : '')} data-campo="termos"><input type="checkbox" required checked={aceitouTermos} onChange={e => definirAceitouTermos(e.target.checked)} /> <span>Li e concordo com os <a href={href('/termos')} target="_blank" rel="noopener noreferrer">Termos de Uso</a> do Orto Questões. O cadastro é gratuito; assinaturas são opcionais e têm condições próprias antes da compra.</span></label>
            {erroDe('termos')}
          </>}
          {erroForm && <div key={erroForm.n} className="aviso-formulario aviso-formulario--erro aviso-formulario--destaque" role="alert">
            <Icone nome="alerta" tamanho={20} />
            <span>{erroForm.texto}{erroForm.codigo === 'invalid_credentials' && ' Se você criou a conta pelo Google, use o botão do Google acima.'}</span>
            {erroForm.campo && <span className="aviso-formulario__acoes"><button type="button" onClick={() => irParaCampo(erroForm.campo!)}>Ir para o campo que falta</button></span>}
            {(erroForm.codigo === 'invalid_credentials' || erroForm.codigo === 'ja_cadastrado') && <span className="aviso-formulario__acoes">
              {erroForm.codigo === 'ja_cadastrado' && <button type="button" onClick={() => trocarModo('entrar')}>Entrar com este e-mail</button>}
              <button type="button" onClick={() => trocarModo('recuperar')}>Criar uma senha nova</button>
            </span>}
          </div>}
          <button className="botao botao--principal acesso__enviar" disabled={ocupado}>{ocupado ? 'Aguarde…' : recuperacao ? 'Salvar nova senha' : modo === 'criar' ? 'Criar conta gratuita' : modo === 'recuperar' ? 'Enviar link de recuperação' : 'Entrar'}</button>
        </form>
        {modo === 'entrar' && !recuperacao && <p className="acesso__alternativa">Não recebeu a confirmação? <button type="button" className="acesso__link" onClick={() => { void reenviar() }} disabled={ocupado || !email.trim()}>Reenviar e-mail</button></p>}
        {!recuperacao && modo === 'criar' && <p className="meta">Seus dados de perfil não ficam visíveis a outros usuários, com uma exceção: depois de 5 questões respondidas, você entra no ranking, visível a quem tem conta, com o apelido que escolher (ou seu nome e a inicial do sobrenome). Você pode sair do ranking quando quiser.</p>}
        <p className="acesso__seguranca"><Icone nome="certo" tamanho={14} /> Autenticação segura pelo Supabase. O Orto Questões não guarda sua senha.</p>
        </>}
      </section>
      {pendente && <ModalConfirmarEmail
        email={pendente}
        aoFechar={() => { definirPendente(null); definirMensagem(`Falta confirmar o e-mail ${pendente}. Abra o link que enviamos para liberar a conta.`) }}
        aoCorrigir={() => { limparConfirmacaoPendente(); definirPendente(null); definirModo('criar'); definirMensagem(''); setTimeout(() => document.querySelector<HTMLInputElement>('#acesso-email')?.select(), 50) }}
        aoEntrar={() => { definirEmail(pendente); definirPendente(null); trocarModo('entrar') }}
      />}
    </div>
  }
  const inicialNome = (nome.trim().charAt(0) || sessao.user.email?.charAt(0) || '?').toUpperCase()
  const emblema = metricas ? conquistaAtual(metricas.respondidas) : null
  const sair = async () => {
    if (!supabase) return
    if (status.pendentes && !window.confirm('Ainda há alterações não sincronizadas. Elas ficarão neste navegador, disponíveis quando você entrar novamente nesta conta. Sair agora?')) return
    definirOcupado(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      definirMensagem('Você saiu da sua conta com segurança.')
    } catch { definirMensagem('Não foi possível sair. Confira sua conexão e tente novamente.') } finally { definirOcupado(false) }
  }
  const confirmarNovosTermos = async () => {
    if (!supabase || ocupado) return
    definirOcupado(true)
    try {
      const { error } = await supabase.auth.updateUser({ data: dadosAceiteTermos() })
      if (error) throw error
      definirAceiteAtualizado(true)
      definirMensagem('Sua ciência dos Termos de Uso atualizados foi registrada.')
    } catch { definirMensagem('Não foi possível registrar agora. Você pode continuar usando sua conta e tentar novamente mais tarde.') }
    finally { definirOcupado(false) }
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
            {ROTULOS_STATUS[status.estado]}{status.pendentes > 0 && ` · ${status.pendentes} ${status.pendentes === 1 ? 'pendente' : 'pendentes'}`}
          </p>
          {status.estado === 'erro' && status.detalhe && <p className="ct-heroi__erro">Motivo: {status.detalhe}</p>}
        </div>
      </div>
      <div className="ct-heroi__acoes">
        <button className="botao botao--vidro" onClick={sincronizar} disabled={status.estado === 'sincronizando'}><Icone nome="reiniciar" tamanho={16} /> Sincronizar</button>
        <button className="botao botao--vidro" disabled={ocupado} onClick={() => void sair()}>Sair da conta</button>
        {administrador && <a className="botao botao--vidro" href={href('/admin')}><Icone nome="grafico" tamanho={16} /> Painel do admin</a>}
      </div>
      <p className="ct-heroi__aparelho"><Icone nome="celular" tamanho={14} /> Conectada neste aparelho ({descreverAparelho()}). A conta fica aberta em um aparelho por vez.</p>
      {metricas && <dl className="ct-heroi__numeros">
        <a href={href('/dados')}><dt>Questões respondidas</dt><dd>{metricas.respondidas.toLocaleString('pt-BR')}{emblema && <span className="medalha-inline"><Medalha conquista={emblema} tamanho={22} titulo={`Emblema ${emblema.rotulo}`} /></span>}</dd></a>
        <a href={href('/revisao')}><dt>Revisões programadas</dt><dd>{metricas.pendentes.toLocaleString('pt-BR')}</dd></a>
        <a href={href('/dados')}><dt>Acerto acumulado</dt><dd>{metricas.acerto === null ? '0%' : `${metricas.acerto}%`}</dd></a>
      </dl>}
    </section>
    {mensagem && <p className="aviso-formulario" role="status">{mensagem}</p>}

    {!aceiteAtualizado && perfil.termos_versao !== VERSAO_TERMOS && <section className="ct-cartao" aria-label="Termos atualizados">
      <h2>Termos de uso atualizados</h2>
      <p>Deixamos mais claros a origem do conteúdo, o caráter não oficial dos simulados, a natureza da assinatura e o que acontece com ela se o serviço mudar. Sua conta continua disponível enquanto você lê a nova versão.</p>
      <div className="linha linha--empilha-celular">
        <a className="botao" href={href('/termos')} target="_blank" rel="noopener noreferrer">Ler os termos</a>
        <button className="botao botao--principal" type="button" disabled={ocupado} onClick={() => void confirmarNovosTermos()}>Li e concordo com a versão atual</button>
      </div>
    </section>}

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

    <div className="ct-corpo">
    {/* Uma seção por vez: a navegação troca o que aparece, em vez de rolar uma página longa. */}
    <nav className="ct-nav" aria-label="Seções da conta">
      {SECOES_CONTA.map(([id, icone, rotulo]) => (
        <a key={id} href={href(`/conta?secao=${id}`)} aria-current={secao === id ? 'page' : undefined} onClick={(e) => { e.preventDefault(); definirSecao(id) }}><Icone nome={icone} tamanho={16} /> {rotulo}</a>
      ))}
    </nav>
    <div className="ct-grade">
      {secao === 'perfil' && <section id="ct-perfil" className="ct-cartao ct-cartao--largo">
        <header className="ct-cartao__cabeca"><span className="ct-icone"><Icone nome="usuario" tamanho={18} /></span><div><h2>Meu perfil</h2><p>Personaliza sua experiência. Seu contato nunca é exibido publicamente.</p></div></header>
        <div className="linha-campos linha-campos--2"><label className="campo">Nome<input className="entrada" required minLength={2} value={nome} onChange={e => definirNome(e.target.value)} /></label><label className="campo">Sobrenome<input className="entrada" required minLength={2} value={sobrenome} onChange={e => definirSobrenome(e.target.value)} /></label></div>
        <label className="campo">Data de nascimento<input className="entrada" type="date" value={nascimento} onChange={e => definirNascimento(e.target.value)} /></label>
        <CamposEtapa situacao={situacao} ano={anoResidencia} provas={provas} aoMudarSituacao={definirSituacao} aoMudarAno={definirAnoResidencia} aoMudarProvas={definirProvas} />
        <CampoServico situacao={situacao} valor={servico} aoMudar={definirServico} />
        <OpcaoServicoRanking sessao={sessao} compacta noPerfil />
        <div className="linha-campos linha-campos--2"><label className="campo"><span>WhatsApp <span className="meta">(opcional)</span></span><input className="entrada" type="tel" autoComplete="tel" value={whatsapp} onChange={e => definirWhatsapp(e.target.value)} placeholder="(00) 00000-0000" /></label><label className="campo"><span>Cidade <span className="meta">(opcional)</span></span><input className="entrada" autoComplete="address-level2" value={cidade} onChange={e => definirCidade(e.target.value)} /></label></div>
        <div className="linha-campos linha-campos--2"><label className="campo"><span>UF <span className="meta">(opcional)</span></span><select className="entrada" value={uf} onChange={e => definirUf(e.target.value)}><option value="">Selecione</option>{UFS.map(sigla => <option key={sigla}>{sigla}</option>)}</select></label><label className="campo campo--checkbox"><input type="checkbox" checked={receberNovidades} onChange={e => definirReceberNovidades(e.target.checked)} /> Quero receber novidades sobre o Orto Questões</label></div>
        <p className="texto-2">WhatsApp, cidade e UF são opcionais. Usamos seus dados de perfil para personalizar sua experiência e nunca exibimos seu contato publicamente.</p>
        <button className="botao botao--principal" type="button" onClick={salvarPerfil} disabled={salvandoPerfil}>{salvandoPerfil ? 'Salvando…' : 'Salvar perfil'}</button>
      </section>}
      {secao === 'assinatura' && <div id="ct-assinatura" className="ct-ancora"><ResumoAssinatura /></div>}
      {secao === 'estudo' && <section id="ct-estudo" className="ct-cartao">
        <header className="ct-cartao__cabeca"><span className="ct-icone"><Icone nome="livro" tamanho={18} /></span><div><h2>Preferências de estudo</h2><p>Leitura, tema e meta de revisão.</p></div></header>
        <div className="ct-opcao"><span className="ct-opcao__rotulo">Revisões por dia</span><div className="ct-seg" aria-label="Revisões por dia">{([15, 20, 30, 50, null] as const).map(limite => <button type="button" key={String(limite)} aria-pressed={ritmo.limite === limite} onClick={() => definirRitmo({ ...ritmo, limite })}>{limite === null ? 'Sem teto' : `${limite}/dia`}</button>)}</div></div>
        <div className="ct-opcao"><span className="ct-opcao__rotulo">Densidade da leitura</span><div className="ct-seg">{([['confortavel', 'Confortável'], ['compacta', 'Compacta'], ['foco', 'Foco']] as const).map(([valor, rotulo]) => <button key={valor} type="button" aria-pressed={densidade === valor} onClick={() => definirDensidade(valor)}>{rotulo}</button>)}</div></div>
        <div className="ct-opcao"><span className="ct-opcao__rotulo">Tema</span><div className="ct-seg">{([['claro', 'Claro'], ['escuro', 'Escuro']] as const).map(([valor, rotulo]) => <button key={valor} type="button" aria-pressed={tema === valor} onClick={() => trocarTema(valor)}>{rotulo}</button>)}</div></div>
        <label className="ct-opcao ct-opcao--faixa"><span className="ct-opcao__rotulo">Tamanho da fonte <output>{fonte}%</output></span><input className="ct-faixa" type="range" min="90" max="120" step="5" value={fonte} onChange={e => definirFonte(Number(e.target.value))} /></label>
        <label className="ct-interruptor"><input type="checkbox" checked={mostrarEtiquetas} onChange={e => definirEtiquetas(e.target.checked)} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span>Mostrar a etiqueta do assunto antes de responder</span></label>
        {emailsConquistas !== null && <label className="ct-interruptor"><input type="checkbox" checked={emailsConquistas} onChange={e => void trocarEmailsConquistas(e.target.checked)} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span>Receber e-mail de parabéns quando eu desbloquear um emblema</span></label>}
        {relatorioMensal !== null && <label className="ct-interruptor"><input type="checkbox" checked={relatorioMensal} onChange={e => void trocarRelatorioMensal(e.target.checked)} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span>Receber os resumos de estudo por e-mail: a cada 15 dias, quantas questões você fez, o acerto e o próximo passo (assinantes também recebem o relatório do mês)</span></label>}
        {lembretes !== null && <label className="ct-interruptor"><input type="checkbox" checked={lembretes} onChange={e => void trocarLembretes(e.target.checked)} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span>Receber lembretes de estudo quando eu ficar alguns dias sem aparecer</span></label>}
      </section>}
      {secao === 'ranking' && <section id="ct-ranking" className="ct-cartao">
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
          <a className="ct-vitrine" href={href('/conquistas?escolher=1')}>
            <span className="ct-vitrine__slots">{[0, 1, 2].map((i) => { const e = emblemaPorId(perfilRanking.emblemas[i] ?? ''); return <span key={i} className="ct-vitrine__slot">{e ? <Medalha conquista={e} tamanho={32} /> : <Icone nome="estrela" tamanho={16} />}</span> })}</span>
            <span><strong>{perfilRanking.emblemas.length ? 'Trocar os emblemas do meu nome' : 'Escolher 3 emblemas para o meu nome'}</strong><small>Eles aparecem ao lado do seu nome no ranking.</small></span>
            <Icone nome="direita" tamanho={16} />
          </a>
          <p className="ct-nota">Deixe o apelido em branco para aparecer com o seu nome e a inicial do sobrenome. E-mail, WhatsApp e cidade nunca aparecem.</p>
        </>}
      </section>}
      {secao === 'seguranca' && <section id="ct-seguranca" className="ct-cartao">
        <header className="ct-cartao__cabeca"><span className="ct-icone"><Icone nome="alerta" tamanho={18} /></span><div><h2>Segurança</h2><p>Trocar o e-mail exige confirmação pelo novo endereço.</p></div></header>
        <form className="empilha" onSubmit={e => void trocarSenha(e)}>
          <label className="campo">Nova senha<input className="entrada" type="password" autoComplete="new-password" minLength={8} required value={novaSenha} onChange={e => definirNovaSenha(e.target.value)} /></label>
          <label className="campo">Confirmar nova senha<input className="entrada" type="password" autoComplete="new-password" minLength={8} required value={confirmacaoNovaSenha} onChange={e => definirConfirmacaoNovaSenha(e.target.value)} /></label>
          <p className="ct-nota">Use pelo menos 8 caracteres. A nova senha é enviada diretamente ao Supabase e não é salva no progresso.</p>
          <button className="botao botao--principal" type="submit" disabled={ocupado || !novaSenha || !confirmacaoNovaSenha}>Alterar senha</button>
        </form>
        <label className="campo">Novo e-mail<input className="entrada" type="email" value={novoEmail} onChange={e => definirNovoEmail(e.target.value)} placeholder="novo@email.com" /></label>
        <div className="linha"><button className="botao botao--principal" type="button" onClick={() => void trocarEmail()} disabled={ocupado || !novoEmail.trim()}>Trocar e-mail</button></div>
        <p className="ct-nota">Conta criada em {new Date(sessao.user.created_at).toLocaleDateString('pt-BR')}. Quer apagar tudo? <a href={href('/contato?assunto=exclusao-conta')}>Solicitar exclusão da conta</a>.</p>
      </section>}
      {secao === 'dados' && <section id="ct-dados" className="ct-cartao">
        <header className="ct-cartao__cabeca"><span className="ct-icone"><Icone nome="baixar" tamanho={18} /></span><div><h2>Dados e backup</h2><p>Exporte seu progresso ou comece do zero.</p></div></header>
        <p className="texto-2">Respostas, revisões, favoritas, anotações e histórico ficam na sua conta e acompanham você em qualquer aparelho. A sessão em andamento fica neste dispositivo.</p>
        <div className="linha"><a className="botao" href={href('/dados')}>Desempenho e backup</a><a className="botao botao--fantasma" href={href('/revisao')}>Minha revisão</a></div>
      </section>}
    </div>
    </div>

      {possuiVisitante && !importado && <section className="cartao cartao__corpo empilha"><h2>Você já estudou neste navegador</h2><p>Importe o progresso de visitante para esta conta. Só serão acrescentados itens que ainda não existem nela. Em um dispositivo compartilhado, importe apenas se esse progresso for seu.</p><button className="botao botao--principal" onClick={importar} disabled={!status.pronto}>Importar meu progresso de visitante</button></section>}
      {status.conflitos.length > 0 && <section className="empilha"><h2>Confira as alterações simultâneas</h2><p>Este item mudou em outro dispositivo antes de sua alteração chegar. Escolha qual versão manter.</p>
        {status.conflitos.map(doc => <div className="cartao cartao__corpo empilha" key={`${doc.tipo}/${doc.item}`}><h3>{ROTULOS_TIPO[doc.tipo]} · {doc.item}</h3>
          <details><summary>Comparar versões</summary><p>Versão deste navegador</p><pre>{JSON.stringify(itens(doc.tipo, ler(doc.tipo, null))[doc.item] ?? null, null, 2)}</pre><p>Versão da conta</p><pre>{JSON.stringify(doc.valor, null, 2)}</pre></details>
          <div className="linha"><button className="botao" onClick={() => resolver(doc, true)}>Manter deste navegador</button><button className="botao" onClick={() => resolver(doc, false)}>Usar versão da conta</button></div></div>)}
      </section>}
  </article>
}
