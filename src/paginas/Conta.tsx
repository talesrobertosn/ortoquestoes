import { PreferenciaEncontros } from '../eventos/PreferenciaEncontros'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { haQuanto } from '../componentes/IndicadorSincronia'
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
import { dadosAceiteTermos, dataDaVersao, VERSAO_TERMOS } from '../conta/termos'
import { AvisoTermos } from '../componentes/AvisoTermos'
import { dadosOrigem } from '../conta/origem'
import { abrirPreferenciasCookies, eventoMeta, PIXEL_META } from '../conta/consentimento'
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
import { ANOS, SITUACOES, lerLocais, lerProvas, type ProvaInteresse } from '../conta/perfilEstudo'
import { CampoServico, SERVICO_VARIOS } from '../componentes/CampoServico'
import { CamposEtapa } from '../componentes/CamposEtapa'
import { OpcaoServicoRanking } from '../componentes/ServicoRanking'
import { AvisoFlutuante, InterruptorLocal, InterruptorSalvo, type AvisoConta, type TipoAviso } from '../componentes/conta/PecasConta'
import { IconePixel } from '../componentes/IconePixel'
import '../estilos/paginas/Conta.css'
import { fraseGratis } from '../config'

const ROTULOS_STATUS = {
  sincronizando: 'Sincronizando seu progresso…', salvo: 'Progresso sincronizado', offline: 'Sem conexão. As alterações serão enviadas quando você voltar à internet.',
  erro: 'Não foi possível sincronizar agora. Seu progresso continua neste navegador; tente novamente.', conflito: 'Há alterações simultâneas para conferir abaixo.',
}
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
const ROTULOS_TIPO = { respondidas: 'Resposta', notas: 'Anotação', favoritos: 'Favorita', historico: 'Sessão' }
/** Seções de Minha conta: [id na URL (?secao=), ícone, nome, o que tem dentro]. */
const SECOES_CONTA = [
  ['perfil', 'usuario', 'Perfil', 'Nome, etapa, serviço e contato'],
  ['assinatura', 'medalha', 'Assinatura e pagamentos', 'Plano, cobranças e garantia'],
  ['preferencias', 'filtro', 'Preferências', 'Estudo, aparência e e-mails'],
  ['ranking', 'trofeu', 'Ranking e privacidade', 'Apelido, emblemas e o que aparece'],
  ['aparelhos', 'celular', 'Aparelhos e sincronização', 'Seu progresso em todo aparelho'],
  ['seguranca', 'cadeado', 'Login e segurança', 'Senha e e-mail de acesso'],
  ['dados', 'baixar', 'Dados e backup', 'Exportar e acompanhar o progresso'],
  ['termos', 'livro', 'Termos e privacidade', 'Documentos, cookies e exclusão'],
] as const
type SecaoConta = (typeof SECOES_CONTA)[number][0]
/** Endereços antigos que continuam valendo (ex.: "?secao=estudo" no menu e na página de planos). */
const SECOES_ANTIGAS: Record<string, SecaoConta> = { estudo: 'preferencias' }
function secaoDaConsulta(consulta?: URLSearchParams): SecaoConta | null {
  const pedida = consulta?.get('secao') ?? ''
  const id = SECOES_ANTIGAS[pedida] ?? pedida
  return SECOES_CONTA.some(([s]) => s === id) ? id as SecaoConta : null
}
/** "Residente R3", "Ortopedista"… a partir do perfil salvo. */
function rotuloEtapa(situacao: unknown, ano: unknown): string | null {
  if (situacao === 'residente') { const a = ANOS.find(([v]) => v === ano)?.[1]; return a ? `Residente ${a}` : 'Residente de ortopedia' }
  if (situacao === 'r4') return 'R4 ou fellowship'
  return SITUACOES.find(([v]) => v === situacao)?.[1] ?? null
}
const MOVIMENTO_REDUZIDO = '(prefers-reduced-motion: reduce)'
const CELULAR = '(max-width: 63.99rem)'

export function Conta({ consulta }: { consulta?: URLSearchParams }) {
  const { sessao, recuperacao, encerrarRecuperacao, status, sincronizar, resolver, reenviarRejeitados, descartarRejeitados } = usarConta()
  const modoInicial = consulta?.get('modo')
  // A seção vem do endereço (#/conta?secao=ranking): o "voltar" do celular volta para a lista.
  const aberta = secaoDaConsulta(consulta)
  const secao: SecaoConta = aberta ?? 'perfil'
  const corpoRef = useRef<HTMLDivElement>(null)
  const primeiraSecao = useRef(true)
  useEffect(() => {
    const corpo = corpoRef.current
    const inicio = primeiraSecao.current
    primeiraSecao.current = false
    if (!corpo || (inicio && !aberta)) return
    const celular = window.matchMedia?.(CELULAR).matches
    // No computador só rola se o começo da seção ficou para cima; no celular, sempre (a lista dá lugar à seção).
    if (!celular && (inicio || corpo.getBoundingClientRect().top >= 0)) return
    const suave = !window.matchMedia?.(MOVIMENTO_REDUZIDO).matches
    corpo.scrollIntoView({ block: 'start', behavior: suave && !inicio ? 'smooth' : 'auto' })
  }, [aberta])
  // Resultado das ações (perfil salvo, senha alterada, erro ao salvar): aviso flutuante no pé da tela.
  const [aviso, definirAviso] = useState<AvisoConta | null>(null)
  const avisar = useCallback((texto: string, tipo: TipoAviso = 'ok') => definirAviso((a) => ({ texto, tipo, n: (a?.n ?? 0) + 1 })), [])
  const fecharAviso = useCallback(() => definirAviso(null), [])
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
  const ERRO_PREFERENCIA = 'Não foi possível salvar a preferência de e-mail agora. Confira sua conexão e tente de novo.'
  const trocarEmailsConquistas = async (valor: boolean) => {
    definirEmailsConquistas(valor)
    if (await gravarPreferenciaConquistas(valor)) return true
    definirEmailsConquistas(!valor); avisar(ERRO_PREFERENCIA, 'erro'); return false
  }
  // Relatório mensal: só aparece para quem tem o plano (é quem recebe).
  const { premium, motivo } = usarPremium()
  const [relatorioMensal, definirRelatorioMensal] = useState<boolean | null>(null)
  useEffect(() => {
    if (!sessao?.user.id || !premium) return
    chamarRpc<Array<{ relatorio_mensal: boolean }>>('obter_preferencias_email_completas', {}).then(([p]) => definirRelatorioMensal(p?.relatorio_mensal ?? true)).catch(() => undefined)
  }, [sessao?.user.id, premium])
  const trocarRelatorioMensal = async (valor: boolean) => {
    definirRelatorioMensal(valor)
    try { await chamarRpc('definir_preferencia_relatorio', { p_relatorio: valor }); return true }
    catch { definirRelatorioMensal(!valor); avisar(ERRO_PREFERENCIA, 'erro'); return false }
  }
  // Nome do plano no selo do cabeçalho (só leitura; quem gerencia é ResumoAssinatura).
  const [planoAtual, definirPlanoAtual] = useState<string | null>(null)
  useEffect(() => {
    if (!sessao?.user.id || !premium || motivo !== 'assinatura') return
    chamarRpc<Array<{ plano: string | null }>>('obter_estado_conta', {}).then(([e]) => definirPlanoAtual(e?.plano ?? null)).catch(() => undefined)
  }, [sessao?.user.id, premium, motivo])
  // Lembretes de estudo (3 e 7 dias sem aparecer): para todas as contas.
  const [lembretes, definirLembretes] = useState<boolean | null>(null)
  const [preferenciasLidas, definirPreferenciasLidas] = useState(false)
  useEffect(() => {
    if (!sessao?.user.id) return
    chamarRpc<boolean>('obter_preferencia_lembretes', {}).then((v) => definirLembretes(v !== false)).catch(() => undefined).finally(() => definirPreferenciasLidas(true))
  }, [sessao?.user.id])
  const trocarLembretes = async (valor: boolean) => {
    definirLembretes(valor)
    try { await chamarRpc('definir_preferencia_lembretes', { p_lembretes: valor }); return true }
    catch { definirLembretes(!valor); avisar(ERRO_PREFERENCIA, 'erro'); return false }
  }
  // Cartas pessoais do Tales (parte 27): sem a parte colada, o interruptor não aparece.
  const [cartas, definirCartas] = useState<boolean | null>(null)
  useEffect(() => {
    if (!sessao?.user.id) return
    chamarRpc<boolean>('obter_preferencia_cartas', {}).then((v) => definirCartas(v !== false)).catch(() => undefined)
  }, [sessao?.user.id])
  const trocarCartas = async (valor: boolean) => {
    definirCartas(valor)
    try { await chamarRpc('definir_preferencia_cartas', { p_cartas: valor }); return true }
    catch { definirCartas(!valor); avisar(ERRO_PREFERENCIA, 'erro'); return false }
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
  // Outros hospitais ou serviços onde trabalha, além do principal (ortopedista com vários locais, plantões).
  const [locais, definirLocais] = useState<string[]>(() => lerLocais(perfil.locais_trabalho))
  const locaisLimpos = () => situacao === 'estudante' ? [] : lerLocais(locais, servico === SERVICO_VARIOS ? '' : servico)
  const [situacao, definirSituacao] = useState(String(perfil.situacao ?? ''))
  const [anoResidencia, definirAnoResidencia] = useState(String(perfil.ano_residencia ?? ''))
  const [provas, definirProvas] = useState<ProvaInteresse[]>(() => lerProvas(perfil.provas_interesse))
  const [whatsapp, definirWhatsapp] = useState(String(perfil.whatsapp ?? ''))
  const [cidade, definirCidade] = useState(String(perfil.cidade ?? ''))
  const [uf, definirUf] = useState(String(perfil.uf ?? ''))
  const [receberNovidades, definirReceberNovidades] = useState(Boolean(perfil.receber_novidades ?? false))
  const [aceitouTermos, definirAceitouTermos] = useState(false)
  const [salvandoPerfil, definirSalvandoPerfil] = useState(false)
  // Instante do último "Salvar perfil" que deu certo: o botão mostra "Salvo" por alguns segundos.
  const [perfilSalvo, definirPerfilSalvo] = useState(0)
  useEffect(() => {
    if (!perfilSalvo) return
    const t = window.setTimeout(() => definirPerfilSalvo(0), 2600)
    return () => window.clearTimeout(t)
  }, [perfilSalvo])
  const { perfil: perfilRanking, carregado: rankingCarregado, salvar: salvarPerfilRanking, nomeExibido: nomeExibidoRanking, nomeCadastro: nomeCadastroRanking } = usarPerfilRanking(sessao)
  const [apelidoRanking, definirApelidoRanking] = useState('')
  const [salvandoRanking, definirSalvandoRanking] = useState(false)
  useEffect(() => { if (rankingCarregado) definirApelidoRanking(perfilRanking.apelido ?? '') }, [rankingCarregado, perfilRanking.apelido])
  async function salvarApelido(texto: string) {
    definirSalvandoRanking(true)
    const erro = await salvarPerfilRanking({ apelido: texto.trim() || null })
    definirSalvandoRanking(false)
    avisar(erro ?? (texto.trim() ? 'Apelido salvo.' : 'Você volta a aparecer com o seu nome.'), erro ? 'erro' : 'ok')
  }
  async function alterarParticipacao(participa: boolean) {
    definirSalvandoRanking(true)
    const erro = await salvarPerfilRanking({ participa })
    definirSalvandoRanking(false)
    avisar(erro ?? (participa ? 'Você voltou ao ranking.' : 'Você saiu do ranking.'), erro ? 'erro' : 'ok')
  }
  const respondidasConta = Object.keys(contexto.respondidas).length
  async function salvarPerfil() {
    if (!supabase || !sessao) return
    definirSalvandoPerfil(true)
    try {
      if (!perfilCompleto((texto) => avisar(texto, 'erro'))) return
      const { error } = await supabase.auth.updateUser({ data: dadosPerfil() })
      if (error) throw error
      avisar('Perfil atualizado.')
      definirPerfilSalvo(Date.now())
    } catch { avisar('Não foi possível salvar o perfil agora. Confira sua conexão e tente de novo.', 'erro') }
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
    if (locaisLimpos().length) d.locais_trabalho = locaisLimpos()
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
      servico: servico.trim(), locais_trabalho: locaisLimpos(), whatsapp: whatsapp.trim(), cidade: cidade.trim(), uf,
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
      avisar('Enviamos a confirmação do novo e-mail. A alteração só vale depois de confirmar o link.', 'info')
      definirNovoEmail('')
    } catch (e) { avisar(textoErro((e as { code?: string }).code), 'erro') }
    finally { definirOcupado(false) }
  }
  async function trocarSenha(e: FormEvent) {
    e.preventDefault()
    if (!supabase || ocupado || !sessao) return
    if (novaSenha.length < 8) { avisar('Use pelo menos 8 caracteres na nova senha.', 'erro'); return }
    if (novaSenha !== confirmacaoNovaSenha) { avisar('As senhas não coincidem.', 'erro'); return }
    definirOcupado(true); definirMensagem('')
    try {
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) throw error
      definirNovaSenha(''); definirConfirmacaoNovaSenha('')
      avisar('Senha alterada com segurança.')
    } catch (e) { avisar(textoErro((e as { code?: string }).code), 'erro') }
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
    definirImportado(true); avisar('Progresso de visitante importado. Os dados que já existiam na conta foram preservados.')
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
            <CampoServico situacao={situacao} valor={servico} aoMudar={definirServico} locais={locais} aoMudarLocais={definirLocais} />
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
  const nomeCompleto = `${nome.trim()} ${sobrenome.trim()}`.trim()
  const iniciais = ((nome.trim().charAt(0) + sobrenome.trim().charAt(0)) || sessao.user.email?.charAt(0) || '?').toUpperCase()
  const emblema = metricas ? conquistaAtual(metricas.respondidas) : null
  const etapa = rotuloEtapa(perfil.situacao, perfil.ano_residencia)
  const assinante = premium && motivo === 'assinatura'
  const selo = assinante ? `Assinante${planoAtual ? ` · plano ${planoAtual}` : ''}`
    : premium && motivo === 'cortesia' ? 'Acesso de cortesia'
    : premium && motivo === 'administrador' ? 'Acesso de administrador'
    : 'Plano gratuito'
  const termosEmDia = perfil.termos_versao === VERSAO_TERMOS
  const aceitoEm = typeof perfil.termos_aceitos_em === 'string' ? new Date(perfil.termos_aceitos_em) : null
  // Perfil com alterações ainda não salvas (compara com o que está na conta).
  const perfilAlterado = JSON.stringify([nome.trim(), sobrenome.trim(), nascimento, situacao, situacao === 'residente' ? anoResidencia : '', [...provas].sort(), servico.trim(), locaisLimpos(), whatsapp.trim(), cidade.trim(), uf, receberNovidades])
    !== JSON.stringify([String(perfil.nome ?? '').trim(), String(perfil.sobrenome ?? '').trim(), String(perfil.nascimento ?? ''), String(perfil.situacao ?? ''), perfil.situacao === 'residente' ? String(perfil.ano_residencia ?? '') : '', [...lerProvas(perfil.provas_interesse)].sort(), String(perfil.servico ?? perfil.residencia ?? '').trim(), lerLocais(perfil.locais_trabalho), String(perfil.whatsapp ?? '').trim(), String(perfil.cidade ?? '').trim(), String(perfil.uf ?? ''), Boolean(perfil.receber_novidades ?? false)])
  const textoSync = `${ROTULOS_STATUS[status.estado]}${status.estado === 'salvo' && status.ultimaSincronia ? ` ${haQuanto(status.ultimaSincronia)}` : ''}${status.pendentes > 0 ? ` · ${status.pendentes} ${status.pendentes === 1 ? 'pendente' : 'pendentes'}` : ''}`
  const sair = async () => {
    if (!supabase) return
    if (status.pendentes && !window.confirm('Ainda há alterações não sincronizadas. Elas ficarão neste navegador, disponíveis quando você entrar novamente nesta conta. Sair agora?')) return
    definirOcupado(true)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      definirMensagem('Você saiu da sua conta com segurança.')
    } catch { avisar('Não foi possível sair. Confira sua conexão e tente novamente.', 'erro') } finally { definirOcupado(false) }
  }
  const linkSecao = (id: SecaoConta) => href(`/conta?secao=${id}`)
  /** Selo pequeno ao lado de cada seção na lista (o que pede atenção ou o estado atual). */
  const seloSecao = (id: SecaoConta) => {
    if (id === 'assinatura') return <span className={'ct-nav__selo' + (assinante ? ' ct-nav__selo--ouro' : '')}>{assinante ? 'Assinante' : 'Gratuito'}</span>
    if (id === 'aparelhos') return <span className={`ponto-sincronia ponto-sincronia--${status.estado}`} aria-label={ROTULOS_STATUS[status.estado]} />
    if (id === 'termos' && !termosEmDia) return <span className="ct-nav__selo ct-nav__selo--aviso">Nova versão</span>
    return null
  }
  const cabecalhoSecao = (icone: Parameters<typeof Icone>[0]['nome'], titulo: string, texto: string, classe = '') => <header className="ct-cartao__cabeca">
    <span className={'ct-icone ' + classe}><Icone nome={icone} tamanho={18} /></span><div><h2>{titulo}</h2><p>{texto}</p></div>
  </header>

  return <article className="conta-pagina ct">
    <section className="ct-heroi" aria-labelledby="ct-nome">
      <div className="ct-heroi__perfil">
        <span className={'ct-avatar' + (assinante ? ' ct-avatar--assinante' : '')} aria-hidden="true">
          {iniciais}
          {assinante && <span className="ct-avatar__coroa"><Icone nome="coroa" tamanho={13} /></span>}
        </span>
        <div className="ct-heroi__nome">
          <p className="ct-heroi__rotulo">Minha conta</p>
          <h1 id="ct-nome">{nomeCompleto || 'Sua conta'}</h1>
          <p className="ct-heroi__email">{sessao.user.email}</p>
        </div>
      </div>
      <ul className="ct-selos" aria-label="Resumo da conta">
        <li><a className={'ct-selo' + (assinante ? ' ct-selo--ouro' : '')} href={linkSecao('assinatura')}><Icone nome={assinante ? 'coroa' : 'medalha'} tamanho={13} />{selo}</a></li>
        {etapa && <li><a className="ct-selo" href={linkSecao('perfil')}><Icone nome="usuario" tamanho={13} />{etapa}</a></li>}
        <li><a className="ct-selo ct-selo--sync" href={linkSecao('aparelhos')}><span className={`ponto-sincronia ponto-sincronia--${status.estado}`} aria-hidden="true" /><span aria-live="polite">{textoSync}</span></a></li>
      </ul>
      <div className="ct-heroi__acoes">
        <button className={'botao ct-sync' + (status.estado === 'sincronizando' ? ' ct-sync--girando' : '')} type="button" onClick={sincronizar} disabled={status.estado === 'sincronizando'}><Icone nome="reiniciar" tamanho={16} /> {status.estado === 'sincronizando' ? 'Sincronizando…' : 'Sincronizar'}</button>
        {administrador && <a className="botao" href={href('/admin')}><Icone nome="grafico" tamanho={16} /> Painel do admin</a>}
      </div>
      {metricas && <dl className="ct-numeros">
        <a href={href('/dados')}><dt>Questões respondidas</dt><dd>{metricas.respondidas.toLocaleString('pt-BR')}{emblema && <span className="medalha-inline"><Medalha conquista={emblema} tamanho={22} titulo={`Emblema ${emblema.rotulo}`} /></span>}</dd></a>
        <a href={href('/revisao')}><dt>Revisões programadas</dt><dd>{metricas.pendentes.toLocaleString('pt-BR')}</dd></a>
        <a href={href('/dados')}><dt>Acerto acumulado</dt><dd>{metricas.acerto === null ? '0%' : `${metricas.acerto}%`}</dd></a>
      </dl>}
      <nav className="ct-atalhos" aria-label="Atalhos">
        <a href={href('/treinar')}><IconePixel nome="treinar" tamanho={32} /><span>Treinar</span></a>
        <a href={href('/dados')}><IconePixel nome="desempenho" tamanho={32} /><span>Desempenho</span></a>
        <a href={href('/ranking')}><IconePixel nome="ranking" tamanho={32} /><span>Ranking</span></a>
        <a href={href(assinante ? '/conta/assinatura' : '/assinatura')}><IconePixel nome="planos" tamanho={32} /><span>{assinante ? 'Assinatura' : 'Planos'}</span></a>
      </nav>
    </section>

    {mensagem && <p className="aviso-formulario" role="status">{mensagem}</p>}

    <AvisoTermos variante="cartao" />

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

    {/* Computador: lista à esquerda e uma seção por vez. Celular: a lista é a tela inicial e cada seção abre por cima dela (o "voltar" do aparelho volta à lista). */}
    <div ref={corpoRef} className={'ct-corpo' + (aberta ? ' ct-corpo--aberta' : '')}>
      <nav className="ct-nav" aria-label="Seções da conta">
        <ul>
          {SECOES_CONTA.map(([id, icone, rotulo, descricao]) => <li key={id}>
            <a href={linkSecao(id)} aria-current={secao === id ? 'page' : undefined} data-aberta={aberta === id || undefined}>
              <span className="ct-nav__icone"><Icone nome={icone} tamanho={17} /></span>
              <span className="ct-nav__texto"><strong>{rotulo}</strong><small>{descricao}</small></span>
              {seloSecao(id)}
              <Icone nome="direita" tamanho={16} />
            </a>
          </li>)}
        </ul>
        <button className="ct-nav__sair" type="button" disabled={ocupado} onClick={() => void sair()}><span className="ct-nav__icone"><Icone nome="esquerda" tamanho={17} /></span><span className="ct-nav__texto"><strong>Sair da conta</strong><small>Neste aparelho ({descreverAparelho()})</small></span></button>
      </nav>

      <div className="ct-painel" key={secao}>
        <a className="ct-voltar" href={href('/conta')}><Icone nome="esquerda" tamanho={16} /> Minha conta</a>

        {secao === 'perfil' && <section id="ct-perfil" className="ct-cartao">
          {cabecalhoSecao('usuario', 'Perfil', 'Personaliza sua experiência. Seu contato nunca é exibido publicamente.')}
          <fieldset className="ct-grupo">
            <legend>Quem é você</legend>
            <div className="linha-campos linha-campos--2"><label className="campo">Nome<input className="entrada" required minLength={2} autoComplete="given-name" value={nome} onChange={e => definirNome(e.target.value)} /></label><label className="campo">Sobrenome<input className="entrada" required minLength={2} autoComplete="family-name" value={sobrenome} onChange={e => definirSobrenome(e.target.value)} /></label></div>
            <label className="campo">Data de nascimento<input className="entrada" type="date" value={nascimento} onChange={e => definirNascimento(e.target.value)} /></label>
          </fieldset>
          <fieldset className="ct-grupo">
            <legend>Etapa e provas</legend>
            <CamposEtapa situacao={situacao} ano={anoResidencia} provas={provas} aoMudarSituacao={definirSituacao} aoMudarAno={definirAnoResidencia} aoMudarProvas={definirProvas} />
          </fieldset>
          <fieldset className="ct-grupo">
            <legend>Onde você atua</legend>
            <CampoServico situacao={situacao} valor={servico} aoMudar={definirServico} locais={locais} aoMudarLocais={definirLocais} />
            <OpcaoServicoRanking sessao={sessao} compacta noPerfil />
          </fieldset>
          <fieldset className="ct-grupo">
            <legend>Contato <span className="meta">(opcional)</span></legend>
            <div className="linha-campos linha-campos--2"><label className="campo"><span>WhatsApp <span className="meta">(opcional)</span></span><input className="entrada" type="tel" autoComplete="tel" value={whatsapp} onChange={e => definirWhatsapp(e.target.value)} placeholder="(00) 00000-0000" /></label><label className="campo"><span>Cidade <span className="meta">(opcional)</span></span><input className="entrada" autoComplete="address-level2" value={cidade} onChange={e => definirCidade(e.target.value)} /></label></div>
            <div className="linha-campos linha-campos--2"><label className="campo"><span>UF <span className="meta">(opcional)</span></span><select className="entrada" value={uf} onChange={e => definirUf(e.target.value)}><option value="">Selecione</option>{UFS.map(sigla => <option key={sigla}>{sigla}</option>)}</select></label><label className="campo campo--checkbox"><input type="checkbox" checked={receberNovidades} onChange={e => definirReceberNovidades(e.target.checked)} /> Quero receber novidades sobre o Orto Questões</label></div>
            <p className="ct-nota">WhatsApp, cidade e UF são opcionais. Usamos seus dados de perfil para personalizar sua experiência e nunca exibimos seu contato publicamente.</p>
          </fieldset>
          <div className={'ct-salvar' + (perfilAlterado || salvandoPerfil ? ' ct-salvar--pendente' : '')}>
            <p className={'ct-salvar__estado' + (perfilAlterado ? ' ct-salvar__estado--pendente' : '')} aria-live="polite">
              {salvandoPerfil ? 'Salvando suas alterações…' : perfilSalvo ? <><Icone nome="certo" tamanho={14} /> Perfil salvo na sua conta.</> : perfilAlterado ? 'Há alterações ainda não salvas.' : 'Tudo salvo.'}
            </p>
            <button className={'botao botao--principal' + (perfilSalvo ? ' ct-botao--salvo' : '')} type="button" onClick={salvarPerfil} disabled={salvandoPerfil}>{salvandoPerfil ? 'Salvando…' : perfilSalvo ? <><Icone nome="certo" tamanho={16} /> Salvo</> : 'Salvar perfil'}</button>
          </div>
        </section>}

        {secao === 'assinatura' && <div className="ct-pilha">
          <div id="ct-assinatura" className="ct-ancora"><ResumoAssinatura /></div>
          <section className="ct-cartao ct-cartao--suave">
            {cabecalhoSecao('medalha', 'Pagamentos, renovação e garantia', 'Datas, cobranças e as escolhas da sua assinatura ficam em Dados da assinatura.', 'ct-icone--ouro')}
            <ul className="ct-links">
              <li><a href={href('/conta/assinatura')}><Icone nome="calendario" tamanho={17} /><span><strong>Dados da assinatura</strong><small>Próxima cobrança, última cobrança, impedir a renovação ou pedir o reembolso dentro da garantia.</small></span><Icone nome="direita" tamanho={16} /></a></li>
              <li><a href={href('/condicoes-assinatura')}><Icone nome="livro" tamanho={17} /><span><strong>Condições da assinatura</strong><small>Regras de cancelamento, garantia e reembolso.</small></span><Icone nome="direita" tamanho={16} /></a></li>
              <li><a href={href('/contato?assunto=assinatura')}><Icone nome="correio" tamanho={17} /><span><strong>Falar sobre uma cobrança</strong><small>Plano, renovação, cancelamento ou reembolso.</small></span><Icone nome="direita" tamanho={16} /></a></li>
            </ul>
          </section>
        </div>}

        {secao === 'preferencias' && <div className="ct-pilha">
          <section id="ct-estudo" className="ct-cartao">
            {cabecalhoSecao('livro', 'Estudo', 'Meta de revisão e como as questões aparecem. Vale na hora.')}
            <div className="ct-opcao"><span className="ct-opcao__rotulo">Revisões por dia</span><div className="ct-seg" aria-label="Revisões por dia">{([15, 20, 30, 50, null] as const).map(limite => <button type="button" key={String(limite)} aria-pressed={ritmo.limite === limite} onClick={() => definirRitmo({ ...ritmo, limite })}>{limite === null ? 'Sem teto' : `${limite}/dia`}</button>)}</div></div>
            <InterruptorLocal ligado={mostrarEtiquetas} aoMudar={definirEtiquetas}>Mostrar a etiqueta do assunto antes de responder</InterruptorLocal>
          </section>
          <section className="ct-cartao">
            {cabecalhoSecao('sol', 'Leitura e aparência', 'Tema, densidade e tamanho da fonte neste aparelho.')}
            <div className="ct-opcao"><span className="ct-opcao__rotulo">Tema</span><div className="ct-seg ct-seg--tema">{([['claro', 'Claro', 'sol'], ['escuro', 'Escuro', 'lua']] as const).map(([valor, rotulo, icone]) => <button key={valor} type="button" aria-pressed={tema === valor} onClick={() => trocarTema(valor)}><Icone nome={icone} tamanho={15} /> {rotulo}</button>)}</div></div>
            <div className="ct-opcao"><span className="ct-opcao__rotulo">Densidade da leitura</span><div className="ct-seg">{([['confortavel', 'Confortável'], ['compacta', 'Compacta'], ['foco', 'Foco']] as const).map(([valor, rotulo]) => <button key={valor} type="button" aria-pressed={densidade === valor} onClick={() => definirDensidade(valor)}>{rotulo}</button>)}</div></div>
            <label className="ct-opcao ct-opcao--faixa"><span className="ct-opcao__rotulo">Tamanho da fonte <output>{fonte}%</output></span><input className="ct-faixa" type="range" min="90" max="120" step="5" value={fonte} onChange={e => definirFonte(Number(e.target.value))} /></label>
            <PreferenciaEncontros />
            <p className="ct-amostra" style={{ fontSize: `${fonte}%` }}>Prévia: é assim que o enunciado das questões aparece.</p>
          </section>
          <section className="ct-cartao">
            {cabecalhoSecao('correio', 'E-mails e mensagens', 'Escolha o que chega no seu e-mail. Cada mudança é salva na hora.')}
            {emailsConquistas === null && relatorioMensal === null && lembretes === null && cartas === null
              ? <p className="ct-nota" role="status">{preferenciasLidas ? 'Não foi possível carregar as preferências de e-mail agora. Atualize a página para tentar de novo.' : <span className="ct-carregando">Carregando suas preferências…</span>}</p>
              : <div className="ct-prefs">
                {emailsConquistas !== null && <InterruptorSalvo ligado={emailsConquistas} aoMudar={trocarEmailsConquistas}>Receber e-mail de parabéns quando eu desbloquear um emblema</InterruptorSalvo>}
                {relatorioMensal !== null && <InterruptorSalvo ligado={relatorioMensal} aoMudar={trocarRelatorioMensal}>Receber os resumos de estudo por e-mail: a cada 15 dias, quantas questões você fez, o acerto e o próximo passo (assinantes também recebem o relatório do mês)</InterruptorSalvo>}
                {lembretes !== null && <InterruptorSalvo ligado={lembretes} aoMudar={trocarLembretes}>Receber lembretes de estudo quando eu ficar alguns dias sem aparecer</InterruptorSalvo>}
                {cartas !== null && <InterruptorSalvo ligado={cartas} aoMudar={trocarCartas}>Receber, de vez em quando, uma mensagem pessoal do Tales sobre o meu estudo</InterruptorSalvo>}
              </div>}
          </section>
        </div>}

        {secao === 'ranking' && <section id="ct-ranking" className="ct-cartao">
          {cabecalhoSecao('trofeu', 'Ranking e privacidade', 'Conta questões respondidas, não acerto.', 'ct-icone--ouro')}
          {!rankingCarregado ? <p className="ct-nota" role="status"><span className="ct-carregando">Carregando…</span></p> : <>
            <div className={'ct-status' + (perfilRanking.participa && respondidasConta >= MINIMO_RANKING ? ' ct-status--ativo' : '')}>
              <span className="ct-status__ponto" aria-hidden="true" />
              {!perfilRanking.participa ? 'Você saiu do ranking'
                : respondidasConta >= MINIMO_RANKING ? 'Você está no ranking'
                : `Você entra no ranking ao responder ${MINIMO_RANKING} questões (faltam ${MINIMO_RANKING - respondidasConta})`}
            </div>
            {perfilRanking.participa && <div className="ct-apelido">
              <label className="campo">Seu apelido no ranking
                <input className="entrada" maxLength={APELIDO_MAXIMO} value={apelidoRanking} onChange={e => definirApelidoRanking(e.target.value)} placeholder={nomeCadastroRanking} />
              </label>
              <p className="ct-nome-ranking">Você aparece como: <strong>{nomeExibidoRanking}</strong></p>
            </div>}
            <div className="linha">
              {perfilRanking.participa ? <>
                <button className="botao botao--principal" type="button" onClick={() => void salvarApelido(apelidoRanking)} disabled={salvandoRanking || apelidoRanking.trim() === (perfilRanking.apelido ?? '')}>{salvandoRanking ? 'Salvando…' : 'Salvar apelido'}</button>
                {perfilRanking.apelido && <button className="botao botao--fantasma" type="button" onClick={() => { definirApelidoRanking(''); void salvarApelido('') }} disabled={salvandoRanking}>Usar meu nome</button>}
                <button className="botao botao--fantasma" type="button" onClick={() => { if (window.confirm('Sair do ranking? Seu nome deixa de aparecer para os outros. Você pode voltar quando quiser.')) void alterarParticipacao(false) }} disabled={salvandoRanking}>Sair do ranking</button>
              </> : <button className="botao botao--principal" type="button" onClick={() => void alterarParticipacao(true)} disabled={salvandoRanking}>{salvandoRanking ? 'Salvando…' : 'Voltar ao ranking'}</button>}
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

        {secao === 'aparelhos' && <section className="ct-cartao">
          {cabecalhoSecao('celular', 'Aparelhos e sincronização', 'Respostas, revisões, favoritas, anotações e histórico acompanham você em qualquer aparelho.')}
          <div className={`ct-sincronia ct-sincronia--${status.estado}`} role="status">
            <span className={`ponto-sincronia ponto-sincronia--${status.estado}`} aria-hidden="true" />
            <div>
              <strong>{textoSync}</strong>
              {status.estado === 'erro' && status.detalhe && <small>Motivo: {status.detalhe}</small>}
            </div>
            <button className={'botao ct-sync' + (status.estado === 'sincronizando' ? ' ct-sync--girando' : '')} type="button" onClick={sincronizar} disabled={status.estado === 'sincronizando'}><Icone nome="reiniciar" tamanho={16} /> {status.estado === 'sincronizando' ? 'Sincronizando…' : 'Sincronizar agora'}</button>
          </div>
          <div className="ct-aparelho">
            <span className="ct-icone"><Icone nome="celular" tamanho={18} /></span>
            <div><strong>Este aparelho</strong><small>Conectada neste aparelho ({descreverAparelho()}). A conta fica aberta em um aparelho por vez.</small></div>
          </div>
          <p className="ct-nota">A sessão de questões em andamento fica neste dispositivo. {status.rejeitados.length > 0 && <a href="#itens-nao-enviados" onClick={(e) => { e.preventDefault(); document.getElementById('itens-nao-enviados')?.scrollIntoView({ block: 'start' }) }}>Ver itens não enviados</a>}</p>
        </section>}

        {secao === 'seguranca' && <section id="ct-seguranca" className="ct-cartao">
          {cabecalhoSecao('cadeado', 'Login e segurança', 'Trocar o e-mail exige confirmação pelo novo endereço.')}
          <form className="ct-grupo" onSubmit={e => void trocarSenha(e)}>
            <p className="ct-grupo__titulo">Senha</p>
            <label className="campo">Nova senha<input className="entrada" type="password" autoComplete="new-password" minLength={8} required value={novaSenha} onChange={e => definirNovaSenha(e.target.value)} /></label>
            <label className="campo">Confirmar nova senha<input className="entrada" type="password" autoComplete="new-password" minLength={8} required value={confirmacaoNovaSenha} onChange={e => definirConfirmacaoNovaSenha(e.target.value)} /></label>
            <p className="ct-nota">Use pelo menos 8 caracteres. A nova senha é enviada diretamente ao Supabase e não é salva no progresso.</p>
            <button className="botao botao--principal" type="submit" disabled={ocupado || !novaSenha || !confirmacaoNovaSenha}>{ocupado && novaSenha ? 'Alterando…' : 'Alterar senha'}</button>
          </form>
          <div className="ct-grupo">
            <p className="ct-grupo__titulo">E-mail de acesso</p>
            <p className="ct-nota">Hoje: <strong>{sessao.user.email}</strong></p>
            <label className="campo">Novo e-mail<input className="entrada" type="email" value={novoEmail} onChange={e => definirNovoEmail(e.target.value)} placeholder="novo@email.com" /></label>
            <div className="linha"><button className="botao botao--principal" type="button" onClick={() => void trocarEmail()} disabled={ocupado || !novoEmail.trim()}>{ocupado && novoEmail.trim() ? 'Enviando…' : 'Trocar e-mail'}</button></div>
          </div>
          <p className="ct-nota">Conta criada em {new Date(sessao.user.created_at).toLocaleDateString('pt-BR')}.</p>
        </section>}

        {secao === 'dados' && <section id="ct-dados" className="ct-cartao">
          {cabecalhoSecao('baixar', 'Dados e backup', 'Exporte seu progresso ou comece do zero.')}
          <p className="texto-2">Respostas, revisões, favoritas, anotações e histórico ficam na sua conta e acompanham você em qualquer aparelho. A sessão em andamento fica neste dispositivo.</p>
          <ul className="ct-links">
            <li><a href={href('/dados')}><Icone nome="grafico" tamanho={17} /><span><strong>Desempenho e backup</strong><small>Seus números por tema e por prova, e o arquivo com todo o seu progresso.</small></span><Icone nome="direita" tamanho={16} /></a></li>
            <li><a href={href('/revisao')}><Icone nome="calendario" tamanho={17} /><span><strong>Minha revisão</strong><small>As questões que voltam para você revisar.</small></span><Icone nome="direita" tamanho={16} /></a></li>
          </ul>
        </section>}

        {secao === 'termos' && <section className="ct-cartao">
          {cabecalhoSecao('livro', 'Termos e privacidade', 'Os documentos que valem para a sua conta e como exercer seus direitos.')}
          <div className={'ct-status' + (termosEmDia ? ' ct-status--ativo' : ' ct-status--aviso')}>
            <span className="ct-status__ponto" aria-hidden="true" />
            {termosEmDia
              ? `Você concordou com a versão de ${dataDaVersao(VERSAO_TERMOS)}${aceitoEm && !Number.isNaN(aceitoEm.getTime()) ? ` em ${aceitoEm.toLocaleDateString('pt-BR')}` : ''}.`
              : 'Há uma versão nova dos Termos para ler. O aviso fica no topo desta página.'}
          </div>
          <ul className="ct-links">
            <li><a href={href('/termos')}><Icone nome="livro" tamanho={17} /><span><strong>Termos de Uso e Privacidade</strong><small>Como o site funciona e como cuidamos dos seus dados.</small></span><Icone nome="direita" tamanho={16} /></a></li>
            <li><a href={href('/condicoes-assinatura')}><Icone nome="medalha" tamanho={17} /><span><strong>Condições da assinatura</strong><small>Planos, renovação, cancelamento e garantia.</small></span><Icone nome="direita" tamanho={16} /></a></li>
            {PIXEL_META && <li><button type="button" onClick={abrirPreferenciasCookies}><Icone nome="olho" tamanho={17} /><span><strong>Cookies</strong><small>Rever a sua escolha sobre os cookies de medição.</small></span><Icone nome="direita" tamanho={16} /></button></li>}
            <li><a href={href('/contato?assunto=exclusao-conta')}><Icone nome="lixeira" tamanho={17} /><span><strong>Solicitar exclusão da conta</strong><small>Quer apagar tudo? O pedido é feito pelo suporte.</small></span><Icone nome="direita" tamanho={16} /></a></li>
          </ul>
        </section>}
      </div>
    </div>

    {possuiVisitante && !importado && <section className="cartao cartao__corpo empilha"><h2>Você já estudou neste navegador</h2><p>Importe o progresso de visitante para esta conta. Só serão acrescentados itens que ainda não existem nela. Em um dispositivo compartilhado, importe apenas se esse progresso for seu.</p><button className="botao botao--principal" onClick={importar} disabled={!status.pronto}>Importar meu progresso de visitante</button></section>}
    {status.conflitos.length > 0 && <section className="empilha"><h2>Confira as alterações simultâneas</h2><p>Este item mudou em outro dispositivo antes de sua alteração chegar. Escolha qual versão manter.</p>
      {status.conflitos.map(doc => <div className="cartao cartao__corpo empilha" key={`${doc.tipo}/${doc.item}`}><h3>{ROTULOS_TIPO[doc.tipo]} · {doc.item}</h3>
        <details><summary>Comparar versões</summary><p>Versão deste navegador</p><pre>{JSON.stringify(itens(doc.tipo, ler(doc.tipo, null))[doc.item] ?? null, null, 2)}</pre><p>Versão da conta</p><pre>{JSON.stringify(doc.valor, null, 2)}</pre></details>
        <div className="linha"><button className="botao" onClick={() => resolver(doc, true)}>Manter deste navegador</button><button className="botao" onClick={() => resolver(doc, false)}>Usar versão da conta</button></div></div>)}
    </section>}
    <AvisoFlutuante aviso={aviso} aoFechar={fecharAviso} />
  </article>
}
