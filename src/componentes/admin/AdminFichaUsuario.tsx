import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { lerLocais, rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import { usarConta } from '../../conta/ContextoConta'
import { chamarRpc } from '../../servicos/supabase'
import { usarIndice } from '../../dados/usarIndice'
import { Icone, type NomeIcone } from '../Icone'
import { BarrasHorizontais, GraficoColunas } from './AdminGraficos'
import { OQueVe, type LinhaUsuario } from './AdminUsuarios'
import { href } from '../../util/rotas'
import { confirmar } from '../Confirmar'
import { PLANOS, acertoAposRevisao, acertoPorTentativa, acertoReal, data, dataHora, haQuanto, haQuantoTempo, motivoFalhaEmail, porcentagem, rotuloOrigem, rotuloPagina } from './formatos'
import { AdminAssinaturaUsuario } from './AdminAssinaturaUsuario'
import { perfilDaFicha, type EnvioHistorico } from './modelosEmail'
import { CartaPessoal } from './CartaPessoal'
import { usarRpc, rpcInexistente } from './usarRpc'
import { PLANOS_RECENTE_DIAS, diasDesde } from './sinais'
import '../../estilos/paginas/AdminFicha.css'

interface Detalhe {
  respostas: Array<{ id: string; c: string | null; primeira: string | null }>
  sessoes: Array<{ id: string; descricao: string; concluidaEm: number; total?: number; acertos?: number }>
  favoritas: number; anotacoes: number; oculto_ranking: boolean
  cortesia: { ate: string | null; motivo: string | null } | null
  aparelho: { descricao: string | null; entrou_em: string; visto_em: string } | null
  emails_conquistas: boolean
  emails: Array<{ tipo: string; marco: number | null; assunto: string | null; status: string; em: string }>
  perfil: { situacao: string | null; servico: string | null; cidade: string | null; uf: string | null; confirmado: boolean } | null
}

/** Da migração 202610080100: o dia a dia da pessoa e o que está aberto agora. */
interface Atividade {
  por_dia: Array<{ dia: string; tentativas: number; questoes: number; acertos: number }>
  horas: Array<{ hora: number; n: number }>
  visitas: Array<{ pagina: string; questao: string | null; em: string }>
  agora: { pagina: string | null; questao: string | null; pagina_em: string | null; visto_em: string; online: boolean } | null
  conta: { nascimento: string | null; whatsapp: string | null; novidades: boolean | null; confirmado_em: string | null; ultimo_login: string | null; provedor: string | null } | null
}

/** Da parte 25 (ficha_extra_usuario_admin): perfil completo, visitas aos planos e flashcards. */
export interface FichaExtra {
  perfil: { situacao: string | null; ano_residencia: string | null; servico: string | null; locais_trabalho: string[]; provas: string[]; perfil_atualizado_em: string | null } | null
  planos: { vezes: number; primeira: string | null; ultima: string | null; condicoes_vezes: number; condicoes_ultima: string | null; visitas: Array<{ pagina: string; em: string }> } | null
  flashcards: {
    progresso: { cartas: number; acertos: number; erros: number; acertos_primeira: number; erros_primeira: number; para_revisar: number; ultima_resposta: string | null; sincronizado_em: string | null
      recordes: { andarMaximo?: number; torreMaximo?: number; partidas?: number; chefesDerrotados?: number; melhorSequencia?: number; respostas?: number } } | null
    servidor: { respostas: number; unicos: number; hoje: number; semana: number; primeira: string | null; ultima: string | null; dias_30: number; por_dia: Array<{ dia: string; n: number; cartas: number }> } | null
    cripta: { partidas: number; partidas_torre: number; andar_max: number | null; andar_max_dificil: number | null; torre_max: number | null; ultima: string | null; recentes: Array<{ modo: string; nivel: string; andar: number; em: string }> } | null
  }
}

const FUSO = 'America/Sao_Paulo'
const diaSP = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: FUSO })
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO })
const idade = (nascimento: string | null | undefined) => {
  if (!nascimento) return null
  const anos = Math.floor((Date.now() - new Date(`${nascimento}T12:00:00`).getTime()) / (365.25 * 864e5))
  return anos > 0 && anos < 110 ? anos : null
}
const iniciais = (texto: string) => texto.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
const corDe = (id: string) => `hsl(${[...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)} 45% 42%)`
const numero = (v: number | null | undefined) => (v ?? 0).toLocaleString('pt-BR')

/** Um evento da linha do tempo: página, sessão, partida, e-mail ou cadastro. */
interface Evento { em: number; tipo: 'planos' | 'condicoes' | 'pagina' | 'sessao' | 'cripta' | 'email' | 'conta'; titulo: ReactNode; detalhe?: ReactNode }
const ICONE_EVENTO: Record<Evento['tipo'], NomeIcone> = { planos: 'estrela', condicoes: 'estrela', pagina: 'olho', sessao: 'livro', cripta: 'raio', email: 'correio', conta: 'usuario' }

export type AbaFicha = 'resumo' | 'tempo' | 'pagamentos' | 'acoes'
const ABAS: Array<[AbaFicha, string]> = [['resumo', 'Resumo'], ['tempo', 'Linha do tempo'], ['pagamentos', 'Assinatura'], ['acoes', 'Carta e ações']]

/** Cartão de métrica: número grande, rótulo e uma linha de apoio. */
function Metrica({ rotulo, valor, apoio, tom, titulo }: { rotulo: string; valor: ReactNode; apoio?: ReactNode; tom?: 'bom' | 'ruim' | 'ouro'; titulo?: string }) {
  return <div className={'fx-metrica' + (tom ? ` fx-metrica--${tom}` : '')} title={titulo}>
    <span className="fx-metrica__rotulo">{rotulo}</span>
    <strong className="fx-metrica__valor numerico">{valor}</strong>
    {apoio && <small className="fx-metrica__apoio">{apoio}</small>}
  </div>
}
const tomAcerto = (v: number | null) => v === null ? undefined : v >= 70 ? 'bom' : v < 50 ? 'ruim' : undefined

/** Ficha de uma pessoa: quem é, o que estudou (questões e flashcards), se olhou os planos e o que dá para fazer por ela. */
export function AdminFichaUsuario({ usuario, aoFechar, abaInicial = 'resumo' }: { usuario: LinhaUsuario; aoFechar: () => void; abaInicial?: AbaFicha }) {
  const { indice } = usarIndice()
  const { sessao } = usarConta()
  const conta = sessao?.user.id
  const [aba, definirAba] = useState<AbaFicha>(abaInicial)
  // Sucesso e erro tinham a mesma cor verde: erro parecia confirmação.
  const [aviso, definirAvisoBruto] = useState<{ texto: string; erro: boolean }>({ texto: '', erro: false })
  const definirAviso = (texto: string) => definirAvisoBruto({ texto, erro: false })
  const definirFalha = (texto: string) => definirAvisoBruto({ texto, erro: true })
  const [ocupado, definirOcupado] = useState(false)
  const [cortesiaDias, definirCortesiaDias] = useState('90')
  const [cortesiaMotivo, definirCortesiaMotivo] = useState('')

  // Três consultas com cache (usarRpc): reabrir a mesma ficha mostra na hora o que já veio.
  const args = useMemo(() => ({ p_id: usuario.id_usuario }), [usuario.id_usuario])
  const detalheQ = usarRpc<Detalhe>(conta, 'detalhe_usuario_admin', args)
  // Ficha aberta: o "agora" se renova a cada 20 s.
  const atividadeQ = usarRpc<Atividade>(conta, 'atividade_usuario_admin', args, { atualizarCada: 20_000 })
  const extraQ = usarRpc<FichaExtra>(conta, 'ficha_extra_usuario_admin', args, { atualizarCada: 60_000 })
  const detalhe = detalheQ.dados ?? null
  const atividade = atividadeQ.dados ?? null
  const extra = extraQ.dados ?? null
  const semAtividade = !atividade && !!atividadeQ.erro
  const semExtra = !extra && !!extraQ.erro && rpcInexistente(extraQ.erro)
  const erro = !detalhe && detalheQ.erro ? 'Não foi possível abrir a ficha. Confira se a migração 202609290200_painel_admin_2.sql foi aplicada.' : ''

  const dias30 = useMemo(() => {
    const porDia = new Map((atividade?.por_dia ?? []).map(d => [d.dia, d]))
    const cartasPorDia = new Map((extra?.flashcards.servidor?.por_dia ?? []).map(d => [d.dia, d]))
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 864e5), chave = diaSP(d)
      return {
        rotulo: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: FUSO }),
        rotuloCurto: d.toLocaleDateString('pt-BR', { day: '2-digit', timeZone: FUSO }),
        valor: porDia.get(chave)?.questoes ?? 0, dados: porDia.get(chave), cartas: cartasPorDia.get(chave)?.n ?? 0,
      }
    })
  }, [atividade, extra])
  const hojeAtividade = dias30[29]?.dados

  // Por ref: quem abre passa uma função nova a cada render, e o efeito abaixo
  // precisa rodar uma vez só, senão guardaria "hidden" como rolagem original.
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar
  // Diálogo de verdade: o foco entra ao abrir, não escapa com Tab para a
  // página atrás e volta para quem abriu (o cartão da pessoa) ao fechar.
  const painel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    painel.current?.querySelector<HTMLElement>('.adm-ficha__fechar')?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { fechar.current(); return }
      // Confirmação aberta por cima (JanelaCentral) cuida do próprio foco.
      if (e.key !== 'Tab' || !painel.current || document.querySelector('.jc')) return
      const focaveis = [...painel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null)
      if (!focaveis.length) return
      const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1]
      const dentro = painel.current.contains(document.activeElement)
      if (e.shiftKey && (!dentro || document.activeElement === primeiro)) { e.preventDefault(); ultimo.focus() }
      else if (!e.shiftKey && (!dentro || document.activeElement === ultimo)) { e.preventDefault(); primeiro.focus() }
    }
    document.addEventListener('keydown', tecla)
    const rolagem = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', tecla); document.body.style.overflow = rolagem; anterior?.focus?.() }
  }, [])
  // Trocar de parte volta ao topo do painel (o cabeçalho continua fixo).
  useEffect(() => { painel.current?.scrollTo?.({ top: 0 }) }, [aba])

  const porTema = useMemo(() => {
    if (!indice || !detalhe) return []
    const temaDe = new Map(indice.questoes.map(q => [q.id, q.t]))
    // Por tema: acerto real (primeira resposta) e depois da revisão (última resposta).
    const soma = new Map<number, { certas: number; erradas: number; certasPrimeira: number; erradasPrimeira: number }>()
    for (const r of detalhe.respostas) {
      const t = temaDe.get(r.id); if (t === undefined || r.c === null) continue
      const item = soma.get(t) ?? { certas: 0, erradas: 0, certasPrimeira: 0, erradasPrimeira: 0 }
      if (r.c === 'true') item.certas++; else if (r.c === 'false') item.erradas++
      const primeira = r.primeira ?? r.c
      if (primeira === 'true') item.certasPrimeira++; else if (primeira === 'false') item.erradasPrimeira++
      soma.set(t, item)
    }
    return [...soma].map(([t, v]) => ({
      slug: indice.temas[t]?.slug ?? '',
      nome: indice.temas[t]?.nome ?? String(t),
      acerto: porcentagem(v.certasPrimeira, v.certasPrimeira + v.erradasPrimeira) ?? 0,
      aposRevisao: porcentagem(v.certas, v.certas + v.erradas) ?? 0,
      total: v.certas + v.erradas,
    }))
      .sort((a, b) => b.total - a.total)
  }, [indice, detalhe])

  // Linha do tempo: páginas (com os planos em destaque), sessões, partidas e e-mails, mais recentes primeiro.
  const linhaDoTempo = useMemo(() => {
    const eventos: Evento[] = []
    for (const v of atividade?.visitas ?? []) {
      const planos = v.pagina === '/assinatura', condicoes = v.pagina === '/condicoes-assinatura'
      eventos.push({
        em: new Date(v.em).getTime(), tipo: planos ? 'planos' : condicoes ? 'condicoes' : 'pagina',
        titulo: planos ? 'Abriu a página de planos (preços)' : condicoes ? 'Abriu as Condições da Assinatura (passo antes do checkout)' : rotuloPagina(v.pagina),
        detalhe: v.questao ? <a href={href(`/questao/${v.questao}`)} target="_blank" rel="noopener noreferrer">{v.questao}</a> : undefined,
      })
    }
    // Planos mais antigos que as 80 visitas da atividade: entram pela consulta própria.
    const vistos = new Set(eventos.map(e => `${e.tipo}|${e.em}`))
    for (const v of extra?.planos?.visitas ?? []) {
      const tipo = v.pagina === '/assinatura' ? 'planos' : 'condicoes', em = new Date(v.em).getTime()
      if (!vistos.has(`${tipo}|${em}`)) eventos.push({ em, tipo, titulo: tipo === 'planos' ? 'Abriu a página de planos (preços)' : 'Abriu as Condições da Assinatura (passo antes do checkout)' })
    }
    for (const s of detalhe?.sessoes ?? []) eventos.push({ em: s.concluidaEm, tipo: 'sessao', titulo: <>Concluiu uma sessão: {s.descricao}</>, detalhe: s.total ? `${s.acertos ?? '?'} de ${s.total} certas` : undefined })
    for (const c of extra?.flashcards.cripta?.recentes ?? []) eventos.push({ em: new Date(c.em).getTime(), tipo: 'cripta', titulo: c.modo === 'torre' ? 'Partida na Torre do Título (flashcards)' : 'Partida no Torneio de Flashcards', detalhe: `chegou ao andar ${c.andar}${c.nivel === 'dificil' ? ' · difícil' : ''}` })
    for (const e of detalhe?.emails ?? []) eventos.push({ em: new Date(e.em).getTime(), tipo: 'email', titulo: <>E-mail: {e.assunto ?? (e.tipo === 'marco' && e.marco ? `emblema de ${e.marco} questões` : e.tipo)}</>, detalhe: e.status === 'enviado' ? (e.tipo === 'marco' ? 'automático' : 'enviado por você') : `não saiu (${e.status})` })
    eventos.push({ em: new Date(usuario.criado_em).getTime(), tipo: 'conta', titulo: 'Criou a conta', detalhe: usuario.origem ? `chegou por ${rotuloOrigem(usuario.origem)}` : undefined })
    const ordenados = eventos.filter(e => Number.isFinite(e.em)).sort((a, b) => b.em - a.em).slice(0, 160)
    const grupos = new Map<string, Evento[]>()
    for (const e of ordenados) {
      const chave = new Date(e.em).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: FUSO })
      grupos.set(chave, [...(grupos.get(chave) ?? []), e])
    }
    return [...grupos]
  }, [atividade, extra, detalhe, usuario.criado_em, usuario.origem])

  async function acao(rotulo: string, fazer: () => Promise<unknown>, sucesso: string) {
    if (ocupado) return
    definirOcupado(true); definirAviso('')
    try { await fazer(); definirAviso(sucesso); await detalheQ.recarregar() } catch (f) { const texto = String(f).replace(/^Error: /, ''); definirFalha(`${rotulo}: ${rotulo === 'Envio' ? motivoFalhaEmail(texto) : texto}`) } finally { definirOcupado(false) }
  }

  const nome = usuario.nome ?? usuario.email?.split('@')[0] ?? 'Sem nome'
  const acertoPrimeira = acertoReal(usuario)
  const acertoRevisao = acertoAposRevisao(usuario)
  const situacao = extra?.perfil?.situacao ?? detalhe?.perfil?.situacao ?? usuario.situacao ?? null
  const ano = extra?.perfil?.ano_residencia ?? usuario.ano_residencia ?? null
  const servico = extra?.perfil?.servico ?? detalhe?.perfil?.servico ?? usuario.servico ?? null
  const locais = lerLocais(extra?.perfil?.locais_trabalho, servico ?? '')
  const provas = extra?.perfil?.provas?.length ? extra.perfil.provas : (usuario.provas ?? '').split(',').filter(Boolean)
  const cidadeUf = [detalhe?.perfil?.cidade ?? usuario.cidade, detalhe?.perfil?.uf ?? usuario.uf].filter(Boolean).join('/')
  // Carta: sem a parte 27, o perfil sai do que a ficha já tem (temas, horário, flashcards, planos).
  const fcCartasFicha = Math.max(extra?.flashcards.servidor?.unicos ?? 0, extra?.flashcards.progresso?.cartas ?? 0)
  const perfilReserva = useMemo(() => perfilDaFicha(usuario, {
    areas: porTema.filter(t => t.slug).map(t => ({ slug: t.slug, total: t.total, certas: Math.round(t.total * t.aposRevisao / 100) })),
    horas: atividade?.horas ?? [], provas, situacao, ano,
    flashcards: extra ? fcCartasFicha : null, viuPlanos: extra?.planos?.vezes ?? null,
  }), [usuario, porTema, atividade, extra, situacao, ano, provas.join(',')])
  const historicoReserva = useMemo<EnvioHistorico[]>(() => (detalhe?.emails ?? []).map(e => ({
    tipo: e.tipo, marco: e.marco, assunto: e.assunto, status: e.status, em: e.em,
    origem: e.tipo === 'marco' || e.tipo === 'relatorio' ? 'automatico' : e.tipo === 'lembrete' ? 'lote' : 'manual',
  })), [detalhe])
  const cortesiaVale = detalhe?.cortesia && (!detalhe.cortesia.ate || new Date(detalhe.cortesia.ate) > new Date())

  // Planos: o sinal que mais importa para a receita. Destaque forte nos últimos 7 dias.
  const planos = extra?.planos ?? null
  const viuPlanos = !!planos && planos.vezes > 0
  const diasPlanos = diasDesde(planos?.ultima)
  const planosRecente = viuPlanos && diasPlanos !== null && diasPlanos < PLANOS_RECENTE_DIAS
  const diaPlanos = diasPlanos === null ? '' : diasPlanos === 0 ? 'hoje' : diasPlanos === 1 ? 'ontem' : `há ${diasPlanos} dias`
  const quandoPlanos = planos?.ultima ? `${diaPlanos}, às ${hora(planos.ultima)}` : ''

  // Flashcards: o servidor conta as cartas liberadas; o progresso sincronizado traz acerto e recordes.
  const fc = extra?.flashcards
  const fcProg = fc?.progresso ?? null, fcServ = fc?.servidor ?? null, fcCripta = fc?.cripta ?? null
  const fcCartas = Math.max(fcServ?.unicos ?? 0, fcProg?.cartas ?? 0)
  const fcAcerto = fcProg ? porcentagem(fcProg.acertos, fcProg.acertos + fcProg.erros) : null
  const fcAcertoPrimeira = fcProg ? porcentagem(fcProg.acertos_primeira, fcProg.acertos_primeira + fcProg.erros_primeira) : null
  const fcAndar = Math.max(fcCripta?.andar_max ?? 0, fcProg?.recordes?.andarMaximo ?? 0)
  const fcUltima = [fcServ?.ultima, fcProg?.ultima_resposta].filter(Boolean).sort().pop() ?? null
  const usaFlashcards = fcCartas > 0 || (fcCripta?.partidas ?? 0) > 0

  const plano = usuario.plano_vigente ? `Assinante ${PLANOS[usuario.plano_vigente]?.toLowerCase() ?? usuario.plano_vigente}` : cortesiaVale ? 'Cortesia' : 'Plano grátis'
  const diasSemEstudo = diasDesde(usuario.ultima_atividade)

  // No body: um ancestral com transform (animação de entrada da página) deslocava o position: fixed.
  return createPortal(<div className="adm-ficha fx" role="dialog" aria-modal="true" aria-labelledby="adm-ficha-nome" onClick={e => { if (e.target === e.currentTarget) aoFechar() }}>
    <div ref={painel} className={'adm-ficha__painel fx__painel' + (aba === 'acoes' ? ' fx__painel--larga' : '')}>
      <header className="fx-cabeca">
        <div className="fx-cabeca__linha">
          <span className="fx-avatar" style={{ background: corDe(usuario.id_usuario) }} aria-hidden="true">{iniciais(nome) || '?'}{usuario.online && <span className="adm-online" />}</span>
          <div className="fx-cabeca__quem">
            <h2 id="adm-ficha-nome">{nome}</h2>
            <p className="fx-cabeca__email">{usuario.email ?? 'conta sem e-mail'}</p>
          </div>
          <button type="button" className="botao-icone adm-ficha__fechar" onClick={aoFechar} aria-label="Fechar ficha"><Icone nome="fechar" tamanho={20} /></button>
        </div>
        <p className="fx-perfil">
          <span className={'fx-perfil__etapa' + (situacao ? '' : ' fx-perfil__etapa--vazia')}>{situacao ? rotuloEtapa(situacao, ano) : 'Etapa não informada'}</span>
          {servico && <span><Icone nome="bandeira" tamanho={14} />{servico}</span>}
          {locais.length > 0 && <span title={locais.join(', ')}><Icone nome="mapa" tamanho={14} />também em {locais.join(', ')}</span>}
          {cidadeUf && <span>{cidadeUf}</span>}
          {provas.length > 0 && <span><Icone nome="alvo" tamanho={14} />{provas.map(rotuloProva).join(', ')}</span>}
        </p>
        <div className="fx-selos">
          <span className={'adm-selo ' + (usuario.plano_vigente || cortesiaVale ? 'adm-selo--ok' : 'adm-selo--neutro')}>{plano}{cortesiaVale && detalhe?.cortesia?.ate ? ` até ${data(detalhe.cortesia.ate)}` : ''}</span>
          {viuPlanos && <button type="button" className={'fx-selo-planos' + (planosRecente && !usuario.plano_vigente ? ' fx-selo-planos--quente' : '')} onClick={() => definirAba('tempo')} title="Ver na linha do tempo">
            <Icone nome="estrela" tamanho={14} />Viu os planos {diaPlanos}{planos!.vezes > 1 ? ` · ${planos!.vezes}×` : ''}
          </button>}
          {(planos?.condicoes_vezes ?? 0) > 0 && <span className="adm-selo adm-selo--planos">Abriu as condições</span>}
          {usaFlashcards && <span className="adm-selo adm-selo--neutro">Usa flashcards</span>}
          {detalhe?.oculto_ranking && <span className="adm-selo adm-selo--neutro">Fora do ranking</span>}
          {detalhe?.perfil && !detalhe.perfil.confirmado && <span className="adm-selo adm-selo--ruim">E-mail não confirmado</span>}
        </div>
        <nav className="fx-abas" aria-label="Partes da ficha">
          {ABAS.map(([id, rotulo]) => <button key={id} type="button" className="fx-aba" aria-current={aba === id ? 'page' : undefined} onClick={() => definirAba(id)}>{rotulo}</button>)}
        </nav>
      </header>

      {viuPlanos && !usuario.plano_vigente && aba !== 'pagamentos' && <aside className={'fx-alerta-planos' + (planosRecente ? ' fx-alerta-planos--quente' : '')}>
        <span className="fx-alerta-planos__icone"><Icone nome="estrela" tamanho={18} /></span>
        <div>
          <strong>Olhou os preços {planos!.vezes > 1 ? `${planos!.vezes} vezes` : 'uma vez'} nos últimos 30 dias</strong>
          <p>Última vez {quandoPlanos}.{(planos?.condicoes_vezes ?? 0) > 0 ? ` Também abriu as Condições da Assinatura (${planos!.condicoes_vezes}×), o passo antes do checkout.` : ''} Ainda não assina.</p>
        </div>
        {aba !== 'acoes' && <button type="button" className="botao botao--fantasma" onClick={() => definirAba('acoes')}>Escrever uma carta</button>}
      </aside>}

      {aba === 'pagamentos' ? <AdminAssinaturaUsuario idUsuario={usuario.id_usuario} email={usuario.email} />
        : erro ? <p role="alert" className="adm-alerta">{erro}</p>
          : !detalhe ? <p role="status" className="fx-carregando">Carregando a ficha…</p>
            : <div className="fx-corpo">
              {aviso.texto && <p role={aviso.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (aviso.erro ? ' adm-mensagem--erro' : '')}>{aviso.texto}</p>}

              {aba === 'resumo' && <>
                {semAtividade ? <p className="adm-nota">Para ver o que a pessoa está vendo e as questões por dia, rode no Supabase a migração 202610080100_monitor_usuarios.sql.</p>
                  : atividade && <section className={'fx-agora' + (atividade.agora?.online ? ' fx-agora--online' : '')}>
                    <span className="fx-agora__rotulo">{atividade.agora?.online ? <><span className="adm-online" aria-hidden="true" />Agora</> : 'Última página vista'}</span>
                    {atividade.agora ? <OQueVe u={atividade.agora} /> : <span className="adm-ve adm-ve--vazio">Ainda sem registro de navegação</span>}
                    {atividade.agora && !atividade.agora.online && <small>{haQuantoTempo(atividade.agora.visto_em)} · {dataHora(atividade.agora.visto_em)}</small>}
                  </section>}

                <section className="fx-bloco" aria-labelledby="fx-questoes">
                  <header className="fx-bloco__cabeca"><h3 id="fx-questoes"><Icone nome="livro" tamanho={16} />Questões</h3><small>última atividade {haQuanto(usuario.ultima_atividade)}</small></header>
                  <div className="fx-metricas">
                    <Metrica rotulo="Respondidas" valor={numero(usuario.respondidas)} apoio={`${numero(usuario.respondidas_7d)} na semana`} />
                    <Metrica rotulo={acertoPrimeira !== null ? 'Acerto real' : 'Acerto'} valor={(acertoPrimeira ?? acertoRevisao) === null ? '—' : `${acertoPrimeira ?? acertoRevisao}%`} apoio={acertoPrimeira !== null && acertoRevisao !== null ? `${acertoRevisao}% após revisão` : undefined} tom={tomAcerto(acertoPrimeira ?? acertoRevisao)} titulo="Real: 1ª tentativa de cada questão. Após revisão: última resposta." />
                    <Metrica rotulo="Hoje" valor={numero(hojeAtividade?.questoes ?? usuario.respondidas_hoje ?? 0)} apoio={hojeAtividade?.tentativas ? `${Math.round((hojeAtividade.acertos / hojeAtividade.tentativas) * 100)}% de acerto` : 'sem respostas hoje'} />
                    <Metrica rotulo="Dias com estudo" valor={atividade ? atividade.por_dia.length : '—'} apoio="nos últimos 30" />
                  </div>
                  <p className="fx-rodape-metricas">{detalhe.favoritas} favoritas · {detalhe.anotacoes} anotações{acertoPorTentativa(usuario) !== null ? ` · ${acertoPorTentativa(usuario)}% por tentativa (como a pessoa vê)` : ''}</p>
                </section>

                <section className="fx-bloco" aria-labelledby="fx-flashcards">
                  <header className="fx-bloco__cabeca"><h3 id="fx-flashcards"><Icone nome="raio" tamanho={16} />Flashcards</h3>{fcUltima && <small>última resposta {haQuantoTempo(fcUltima)}</small>}</header>
                  {semExtra ? <p className="adm-nota">Para acompanhar os flashcards e quem abriu os planos, cole no Supabase a parte 25 (supabase/colar-no-painel/sql-202610152000-parte25.sql).</p>
                    : !extra ? <p className="adm-nota" role="status">Carregando os flashcards…</p>
                      : !usaFlashcards ? <p className="fx-vazio">Ainda não usou os flashcards.</p>
                        : <>
                          <div className="fx-metricas">
                            <Metrica rotulo="Cartas diferentes" valor={numero(fcCartas)} apoio={`${numero(fcServ?.semana)} respostas na semana`} />
                            <Metrica rotulo="Acerto" valor={fcAcerto === null ? '—' : `${fcAcerto}%`} apoio={fcAcertoPrimeira !== null ? `${fcAcertoPrimeira}% na 1ª vez` : 'sem progresso sincronizado'} tom={tomAcerto(fcAcerto)} />
                            <Metrica rotulo="Andar máximo" valor={fcAndar || '—'} apoio={fcCripta?.andar_max_dificil ? `${fcCripta.andar_max_dificil} no difícil` : 'no Torneio'} />
                            <Metrica rotulo="Partidas" valor={numero(Math.max(fcCripta?.partidas ?? 0, fcProg?.recordes?.partidas ?? 0))} apoio={`${fcServ?.dias_30 ?? 0} dias com flashcards em 30`} />
                          </div>
                          <p className="fx-rodape-metricas">{numero(fcServ?.respostas)} respostas no total · {numero(fcServ?.hoje)} hoje{fcProg ? ` · ${numero(fcProg.para_revisar)} cartas para revisar` : ''}{fcCripta?.torre_max ? ` · Torre: andar ${fcCripta.torre_max}` : ''}{fcServ?.primeira ? ` · começou ${haQuanto(fcServ.primeira)}` : ''}</p>
                        </>}
                </section>

                {atividade && <GraficoColunas titulo="Questões por dia" subtitulo="Últimos 30 dias, questões diferentes respondidas em cada dia" pontos={dias30} unidade="questões" />}
                {usaFlashcards && (fcServ?.por_dia.length ?? 0) > 0 && <GraficoColunas titulo="Flashcards por dia" subtitulo="Últimos 30 dias, respostas de flashcards liberadas pelo servidor" pontos={dias30.map(d => ({ ...d, valor: d.cartas }))} unidade="respostas" />}
                {atividade && atividade.horas.length > 0 && <GraficoColunas titulo="Horário em que estuda" subtitulo="Tentativas por hora do dia (Brasília), últimos 30 dias" rotuloTabela="Hora"
                  pontos={Array.from({ length: 24 }, (_, h) => ({ rotulo: `${h}h`, rotuloCurto: `${h}h`, valor: atividade.horas.find(x => x.hora === h)?.n ?? 0 }))} unidade="tentativas" />}

                {porTema.length > 0 && <section className="fx-bloco">
                  <header className="fx-bloco__cabeca"><h3>Acerto real por tema</h3><small>1ª tentativa; ao lado, após revisão</small></header>
                  <BarrasHorizontais maximo={100} formato={v => `${v}%`} itens={porTema.map(t => ({ rotulo: t.nome, valor: t.acerto, detalhe: `${t.total} questões · ${t.aposRevisao}% após revisão`, destaque: t.total >= 10 ? (t.acerto < 55 ? 'ruim' : t.acerto >= 75 ? 'bom' : undefined) : undefined }))} />
                </section>}

                <section className="fx-bloco">
                  <header className="fx-bloco__cabeca"><h3><Icone nome="usuario" tamanho={16} />Conta</h3></header>
                  <dl className="fx-dados">
                    <div><dt>Conta criada</dt><dd>{data(usuario.criado_em)} <small>({haQuanto(usuario.criado_em)})</small></dd></div>
                    {usuario.origem && <div><dt>Chegou por</dt><dd>{rotuloOrigem(usuario.origem)}{usuario.origem.pagina && usuario.origem.pagina !== '/' ? <small> · entrou em {usuario.origem.pagina}</small> : null}</dd></div>}
                    <div><dt>Aparelho</dt><dd>{detalhe.aparelho?.descricao && detalhe.aparelho.descricao !== 'suporte' ? detalhe.aparelho.descricao : '—'}</dd></div>
                    {atividade?.conta && <>
                      <div><dt>Último login</dt><dd title={atividade.conta.ultimo_login ? dataHora(atividade.conta.ultimo_login) : undefined}>{haQuantoTempo(atividade.conta.ultimo_login)}</dd></div>
                      <div><dt>Entrou por</dt><dd>{atividade.conta.provedor === 'google' ? 'Google' : 'E-mail e senha'}</dd></div>
                      <div><dt>E-mail confirmado</dt><dd>{atividade.conta.confirmado_em ? data(atividade.conta.confirmado_em) : 'não'}</dd></div>
                      {idade(atividade.conta.nascimento) && <div><dt>Idade</dt><dd>{idade(atividade.conta.nascimento)} anos</dd></div>}
                      {atividade.conta.whatsapp && <div><dt>WhatsApp</dt><dd><a href={`https://wa.me/55${atividade.conta.whatsapp.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')}`} target="_blank" rel="noopener noreferrer">{atividade.conta.whatsapp}</a></dd></div>}
                      <div><dt>Quer novidades</dt><dd>{atividade.conta.novidades ? 'sim' : 'não'}</dd></div>
                    </>}
                    {extra?.perfil?.perfil_atualizado_em && <div><dt>Perfil atualizado</dt><dd>{data(extra.perfil.perfil_atualizado_em)}</dd></div>}
                  </dl>
                </section>
              </>}

              {aba === 'tempo' && <section className="fx-bloco" aria-labelledby="fx-tempo">
                <header className="fx-bloco__cabeca"><h3 id="fx-tempo">Linha do tempo</h3><small>páginas dos últimos 30 dias, sessões, partidas e e-mails</small></header>
                {semAtividade && <p className="adm-nota">Sem o registro de páginas (migração 202610080100), a linha do tempo mostra só sessões e e-mails.</p>}
                <div className="fx-tempo">{linhaDoTempo.map(([dia, lista]) => <div key={dia} className="fx-tempo__dia">
                  <p className="fx-tempo__data">{dia}</p>
                  <ol>{lista.map((e, i) => <li key={i} className={`fx-evento fx-evento--${e.tipo}`}>
                    <time>{hora(new Date(e.em).toISOString())}</time>
                    <span className="fx-evento__icone" aria-hidden="true"><Icone nome={ICONE_EVENTO[e.tipo]} tamanho={13} /></span>
                    <span className="fx-evento__texto">{e.titulo}{e.detalhe && <small>{e.detalhe}</small>}</span>
                  </li>)}</ol>
                </div>)}</div>
                {diasSemEstudo !== null && diasSemEstudo >= 3 && <p className="adm-nota">Sem responder questões há {diasSemEstudo} dias.</p>}
              </section>}

              {aba === 'acoes' && <>
                <CartaPessoal usuario={usuario} perfilReserva={perfilReserva} historicoReserva={historicoReserva} querReserva={detalhe.emails_conquistas} aoEnviar={() => void detalheQ.recarregar()} />

                <section className="fx-bloco">
                  <header className="fx-bloco__cabeca"><h3>Ações</h3></header>
                  <div className="adm-acoes">
                    <div>
                      <strong>Desconectar de todos os aparelhos</strong>
                      <p>A conta sai em até 1 minuto de onde estiver aberta. Útil para conta compartilhada ou aparelho perdido. A pessoa pode entrar de novo com a senha.</p>
                      <button type="button" className="botao" disabled={ocupado} onClick={async () => { if (await confirmar({ titulo: 'Desconectar esta conta de todos os aparelhos?', texto: 'A pessoa pode entrar de novo com a senha.', sim: 'Desconectar' })) void acao('Desconectar', () => chamarRpc('desconectar_usuario_admin', { p_id: usuario.id_usuario }), 'Pronto: a conta sai dos aparelhos no próximo minuto.') }}>Desconectar</button>
                    </div>
                    <div>
                      <strong>{detalhe.oculto_ranking ? 'Fora do ranking público' : 'Aparece no ranking público'}</strong>
                      <p>Para quem pediu para sair do ranking (Termos, cláusula 10) ou usou um nome inadequado.</p>
                      <button type="button" className="botao" disabled={ocupado} onClick={() => void acao('Ranking', () => chamarRpc('ocultar_ranking_admin', { p_id: usuario.id_usuario, p_ocultar: !detalhe.oculto_ranking, p_motivo: detalhe.oculto_ranking ? null : 'pelo painel' }), detalhe.oculto_ranking ? 'Voltou para o ranking.' : 'Tirado do ranking.')}>{detalhe.oculto_ranking ? 'Mostrar no ranking' : 'Tirar do ranking'}</button>
                    </div>
                    <div>
                      <strong>Acesso cortesia</strong>
                      <p>{cortesiaVale ? `Ativo${detalhe.cortesia?.ate ? ` até ${data(detalhe.cortesia.ate)}` : ', sem prazo'}${detalhe.cortesia?.motivo ? ` (${detalhe.cortesia.motivo})` : ''}. ` : ''}Responde sem o limite diário, sem precisar assinar. Para preceptores, parceiros e sorteios.</p>
                      {cortesiaVale
                        ? <button type="button" className="botao" disabled={ocupado} onClick={async () => { if (await confirmar({ titulo: `Remover a cortesia de ${nome}?`, texto: 'Vale na hora: a conta volta ao limite diário do plano grátis (nenhum dado é apagado).', sim: 'Remover cortesia' })) void acao('Cortesia', () => chamarRpc('definir_cortesia_admin', { p_id: usuario.id_usuario, p_ate: null, p_motivo: null, p_remover: true }), 'Cortesia removida.') }}>Remover cortesia</button>
                        : <div className="adm-busca">
                          <label className="campo">Motivo<input className="entrada" maxLength={200} value={cortesiaMotivo} onChange={e => definirCortesiaMotivo(e.target.value)} placeholder="Ex.: preceptor do serviço X" /></label>
                          <label className="campo">Por<select className="entrada" value={cortesiaDias} onChange={e => definirCortesiaDias(e.target.value)}><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option><option value="sem">Sem prazo</option></select></label>
                          <button type="button" className="botao botao--principal" disabled={ocupado} onClick={async () => { if (await confirmar({ titulo: `Conceder cortesia a ${nome}?`, texto: `Acesso sem limite diário ${cortesiaDias === 'sem' ? 'sem prazo' : `por ${cortesiaDias === '365' ? '1 ano' : `${cortesiaDias} dias`}`}, sem cobrança.${cortesiaMotivo.trim() ? ` Motivo: ${cortesiaMotivo.trim()}.` : ''}`, sim: 'Conceder cortesia' })) void acao('Cortesia', () => chamarRpc('definir_cortesia_admin', { p_id: usuario.id_usuario, p_ate: cortesiaDias === 'sem' ? null : new Date(Date.now() + Number(cortesiaDias) * 86_400_000).toISOString(), p_motivo: cortesiaMotivo, p_remover: false }), 'Cortesia concedida.') }}>Conceder cortesia</button>
                        </div>}
                    </div>
                  </div>
                </section>

              </>}
            </div>}
    </div>
  </div>, document.body)
}
