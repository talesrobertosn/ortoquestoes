import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { lerLocais, rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import { usarIndice } from '../../dados/usarIndice'
import { chamarRpc } from '../../servicos/supabase'
import { PLANOS, STATUS_EVENTO, TIPOS_EVENTO, acertoAposRevisao, acertoPorTentativa, acertoReal, nomeErro, porcentagem, rotuloOrigem, rotuloPagina } from '../../componentes/admin/formatos'
import { perfilDaFicha, type EnvioHistorico } from '../../componentes/admin/modelosEmail'
import { PARTE_COBRANCAS, codigoDaFalha, funcaoAusente, linkDoEvento, linkMercadoPago, reprocessarEvento, type EventoPagamento } from '../../componentes/admin/pagamentos'
import { STATUS_PIX, proximaData, rotuloMeio, rotuloPlano, situacaoAssinatura } from '../../componentes/admin/rotulos'
import { PLANOS_RECENTE_DIAS, diasDesde } from '../../componentes/admin/sinais'
import { CINCO_MIN, rpcInexistente, usarRpc } from '../../componentes/admin/usarRpc'
import { usarPainel } from '../dados/painel'
import { estaOnline, nomeDe, type LinhaUsuario } from '../dados/pessoas'
import type { AbaFicha } from '../nav'
import { Icone } from '../ui/Icone'
import { data, dataHora, haQuanto, horario, iniciais, inteiro, reais } from '../ui/formato'
import { Ranking, SerieTempo } from '../ui/graficos'
import { Carregando, Estado, Faixa, Painel, Selo, SeloQualidade, Situacao } from '../ui/kit'
import { Gaveta, avisoRapido, confirmar } from '../ui/sobreposicoes'
import { EditorCarta } from './cartas-comum'

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
interface Atividade {
  por_dia: Array<{ dia: string; tentativas: number; questoes: number; acertos: number }>
  horas: Array<{ hora: number; n: number }>
  visitas: Array<{ pagina: string; questao: string | null; em: string }>
  agora: { pagina: string | null; questao: string | null; pagina_em: string | null; visto_em: string; online: boolean } | null
  conta: { nascimento: string | null; whatsapp: string | null; novidades: boolean | null; confirmado_em: string | null; ultimo_login: string | null; provedor: string | null } | null
}
interface FichaExtra {
  perfil: { situacao: string | null; ano_residencia: string | null; servico: string | null; locais_trabalho: string[]; provas: string[]; perfil_atualizado_em: string | null } | null
  planos: { vezes: number; primeira: string | null; ultima: string | null; condicoes_vezes: number; condicoes_ultima: string | null; visitas: Array<{ pagina: string; em: string }> } | null
  flashcards: {
    progresso: { cartas: number; acertos: number; erros: number; acertos_primeira: number; erros_primeira: number; para_revisar: number; ultima_resposta: string | null; sincronizado_em: string | null
      recordes: { andarMaximo?: number; torreMaximo?: number; partidas?: number; chefesDerrotados?: number; melhorSequencia?: number; respostas?: number } } | null
    servidor: { respostas: number; unicos: number; hoje: number; semana: number; primeira: string | null; ultima: string | null; dias_30: number; por_dia: Array<{ dia: string; n: number; cartas: number }> } | null
    cripta: { partidas: number; partidas_torre: number; andar_max: number | null; andar_max_dificil: number | null; torre_max: number | null; ultima: string | null; recentes: Array<{ modo: string; nivel: string; andar: number; em: string }> } | null
  }
}
interface AssinaturaDoUsuario {
  assinaturas: Array<{ id: string; plano: string; status: string; meio: 'pix' | 'cartao'; id_externo: string | null; inicio_periodo: string | null; fim_periodo: string | null; cancelar_ao_fim: boolean; cancelada_em: string | null
    ultima_cobranca_id: string | null; ultima_cobranca_em: string | null; criada_em: string; atualizada_em: string; valor: number | null }>
  pix: Array<{ id: string; plano: string; valor: number; status: string; pagamento_id: string | null; expira_em: string; criada_em: string; atualizada_em: string }>
  eventos: EventoPagamento[]
  conta_teste: boolean
}

const FUSO = 'America/Sao_Paulo'
const diaSP = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: FUSO })
const idade = (n: string | null | undefined) => { if (!n) return null; const a = Math.floor((Date.now() - new Date(`${n}T12:00:00`).getTime()) / (365.25 * 864e5)); return a > 0 && a < 110 ? a : null }
const ABAS: Array<[AbaFicha, string]> = [['resumo', 'Resumo'], ['atividade', 'Atividade'], ['assinatura', 'Assinatura'], ['carta', 'Carta'], ['acoes', 'Ações']]

/** Ficha de uma pessoa, aberta de qualquer parte do painel (a lista de trás fica como estava). */
export default function Ficha({ idUsuario, abaInicial = 'resumo', aoFechar }: { idUsuario: string; abaInicial?: AbaFicha; aoFechar: () => void }) {
  const p = usarPainel()
  const u = p.usuarios?.find(x => x.id_usuario === idUsuario) ?? null
  const [aba, definirAba] = useState<AbaFicha>(abaInicial)
  useEffect(() => { definirAba(abaInicial) }, [idUsuario, abaInicial])
  if (!u) return <Gaveta aberta aoFechar={aoFechar} titulo="Ficha da pessoa">
    <div style={{ padding: 20 }}>{p.usuariosQ.carregando || !p.usuariosQ.dados ? <Carregando linhas={6} texto="Carregando a lista de pessoas…" /> : <Estado titulo="Pessoa não encontrada" texto="Ela não está na lista de contas desta atualização. Atualize o painel e tente de novo." />}</div>
  </Gaveta>
  return <FichaPessoa u={u} aba={aba} definirAba={definirAba} aoFechar={aoFechar} />
}

function FichaPessoa({ u, aba, definirAba, aoFechar }: { u: LinhaUsuario; aba: AbaFicha; definirAba: (a: AbaFicha) => void; aoFechar: () => void }) {
  const { conta } = usarPainel()
  const { indice } = usarIndice()
  const args = useMemo(() => ({ p_id: u.id_usuario }), [u.id_usuario])
  const detalheQ = usarRpc<Detalhe>(conta, 'detalhe_usuario_admin', args)
  const atividadeQ = usarRpc<Atividade>(conta, 'atividade_usuario_admin', args, { atualizarCada: CINCO_MIN })
  const extraQ = usarRpc<FichaExtra>(conta, 'ficha_extra_usuario_admin', args, { atualizarCada: CINCO_MIN })
  const detalhe = detalheQ.dados ?? null
  const bruta = atividadeQ.dados ?? null
  const atividade = bruta?.agora ? { ...bruta, agora: { ...bruta.agora, online: estaOnline(bruta.agora) } } : bruta
  const extra = extraQ.dados ?? null
  const semExtra = !extra && !!extraQ.erro && rpcInexistente(extraQ.erro)

  const porTema = useMemo(() => {
    if (!indice || !detalhe) return []
    const temaDe = new Map(indice.questoes.map(q => [q.id, q.t]))
    const soma = new Map<number, { c: number; e: number; c1: number; e1: number }>()
    for (const r of detalhe.respostas) {
      const t = temaDe.get(r.id); if (t === undefined || r.c === null) continue
      const it = soma.get(t) ?? { c: 0, e: 0, c1: 0, e1: 0 }
      if (r.c === 'true') it.c++; else if (r.c === 'false') it.e++
      const pr = r.primeira ?? r.c
      if (pr === 'true') it.c1++; else if (pr === 'false') it.e1++
      soma.set(t, it)
    }
    return [...soma].map(([t, v]) => ({ slug: indice.temas[t]?.slug ?? '', nome: indice.temas[t]?.nome ?? String(t), acerto: porcentagem(v.c1, v.c1 + v.e1) ?? 0, aposRevisao: porcentagem(v.c, v.c + v.e) ?? 0, total: v.c + v.e })).sort((a, b) => b.total - a.total)
  }, [indice, detalhe])

  const situacao = extra?.perfil?.situacao ?? detalhe?.perfil?.situacao ?? u.situacao ?? null
  const ano = extra?.perfil?.ano_residencia ?? u.ano_residencia ?? null
  const servico = extra?.perfil?.servico ?? detalhe?.perfil?.servico ?? u.servico ?? null
  const locais = lerLocais(extra?.perfil?.locais_trabalho, servico ?? '')
  const provas = extra?.perfil?.provas?.length ? extra.perfil.provas : (u.provas ?? '').split(',').filter(Boolean)
  const cidadeUf = [detalhe?.perfil?.cidade ?? u.cidade, detalhe?.perfil?.uf ?? u.uf].filter(Boolean).join('/')
  const cortesiaVale = !!detalhe?.cortesia && (!detalhe.cortesia.ate || new Date(detalhe.cortesia.ate) > new Date())
  const planos = extra?.planos ?? null
  const viuPlanos = !!planos && planos.vezes > 0
  const diasPlanos = diasDesde(planos?.ultima)
  const planosRecente = viuPlanos && diasPlanos !== null && diasPlanos < PLANOS_RECENTE_DIAS
  const fc = extra?.flashcards
  const fcCartas = Math.max(fc?.servidor?.unicos ?? 0, fc?.progresso?.cartas ?? 0)
  const usaFlashcards = fcCartas > 0 || (fc?.cripta?.partidas ?? 0) > 0
  const perfilReserva = useMemo(() => perfilDaFicha(u, {
    areas: porTema.filter(t => t.slug).map(t => ({ slug: t.slug, total: t.total, certas: Math.round(t.total * t.aposRevisao / 100) })),
    horas: atividade?.horas ?? [], provas, situacao, ano, flashcards: extra ? fcCartas : null, viuPlanos: planos?.vezes ?? null,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [u, porTema, atividade, extra, situacao, ano, provas.join(','), fcCartas, planos?.vezes])
  const historicoReserva = useMemo<EnvioHistorico[]>(() => (detalhe?.emails ?? []).map(e => ({ tipo: e.tipo, marco: e.marco, assunto: e.assunto, status: e.status, em: e.em, origem: e.tipo === 'marco' || e.tipo === 'relatorio' ? 'automatico' : e.tipo === 'lembrete' ? 'lote' : 'manual' })), [detalhe])
  const plano = u.plano_vigente ? `Assinante ${PLANOS[u.plano_vigente]?.toLowerCase() ?? u.plano_vigente}` : cortesiaVale ? 'Cortesia' : 'Plano grátis'

  const topo = <span className="a3-avatar a3-avatar--grande">{iniciais(u.nome ?? u.email)}{u.online && <i className="a3-ponto a3-ponto--vivo" />}</span>
  const subtitulo = <div style={{ display: 'grid', gap: 8 }}>
    <span>{u.email ?? 'conta sem e-mail'} · conta criada {haQuanto(u.criado_em)}</span>
    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <Selo tom={u.plano_vigente || cortesiaVale ? 'ok' : undefined}>{plano}{cortesiaVale && detalhe?.cortesia?.ate ? ` até ${data(detalhe.cortesia.ate)}` : ''}</Selo>
      {viuPlanos && <Selo tom={planosRecente && !u.plano_vigente ? 'aviso' : undefined}>Viu os planos {diasPlanos === 0 ? 'hoje' : diasPlanos === 1 ? 'ontem' : `há ${diasPlanos} dias`}{planos!.vezes > 1 ? ` · ${planos!.vezes}×` : ''}</Selo>}
      {(planos?.condicoes_vezes ?? 0) > 0 && <Selo tom="aviso">Abriu as condições</Selo>}
      {usaFlashcards && <Selo>Usa flashcards</Selo>}
      {u.administrador && <Selo solido>Administrador</Selo>}
      {detalhe?.oculto_ranking && <Selo contorno>Fora do ranking</Selo>}
      {detalhe?.perfil && !detalhe.perfil.confirmado && <Selo tom="erro">E-mail não confirmado</Selo>}
    </span>
  </div>

  return <Gaveta aberta aoFechar={aoFechar} titulo={nomeDe(u)} subtitulo={subtitulo} topo={topo} largura={900}>
    <div className="a3-abas-locais" role="tablist" aria-label="Partes da ficha" style={{ position: 'sticky', top: 0, background: 'var(--a3-papel)', zIndex: 2 }}>
      {ABAS.map(([id, r]) => <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => definirAba(id)}>{r}</button>)}
    </div>
    <div style={{ padding: '18px 20px 0', display: 'grid', gap: 16 }}>
      {viuPlanos && !u.plano_vigente && aba !== 'assinatura' && <Faixa tom={planosRecente ? 'aviso' : undefined} titulo={`Olhou os preços ${planos!.vezes > 1 ? `${planos!.vezes} vezes` : 'uma vez'} nos últimos 30 dias`}
        acao={aba !== 'carta' ? <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => definirAba('carta')}>Escrever uma carta</button> : undefined}>
        Última vez {planos?.ultima ? `${haQuanto(planos.ultima)}, às ${horario(planos.ultima)}` : ''}.{(planos?.condicoes_vezes ?? 0) > 0 ? ` Também abriu as Condições da Assinatura (${planos!.condicoes_vezes}×), o passo antes do checkout.` : ''} Ainda não assina.
      </Faixa>}
      {aba === 'assinatura' ? <AbaAssinatura idUsuario={u.id_usuario} email={u.email} />
        : !detalhe ? (detalheQ.erro ? <Estado tipo="erro" titulo="A ficha não abriu" texto="Confira se a migração 202609290200_painel_admin_2.sql foi aplicada." /> : <Carregando linhas={8} texto="Carregando a ficha…" />)
          : aba === 'resumo' ? <AbaResumo u={u} detalhe={detalhe} atividade={atividade} extra={extra} semExtra={semExtra} porTema={porTema}
            perfil={{ situacao, ano, servico, locais, provas, cidadeUf }} semAtividade={!atividade && !!atividadeQ.erro} />
            : aba === 'atividade' ? <AbaAtividade u={u} detalhe={detalhe} atividade={atividade} extra={extra} semAtividade={!atividade && !!atividadeQ.erro} />
              : aba === 'carta' ? (u.administrador ? <Estado titulo="Conta de administrador" texto="Cartas não são enviadas para administradores." /> : <EditorCarta usuario={u} perfilReserva={perfilReserva} historicoReserva={historicoReserva} querReserva={detalhe.emails_conquistas} aoEnviar={() => void detalheQ.recarregar()} />)
                : <AbaAcoes u={u} detalhe={detalhe} cortesiaVale={cortesiaVale} recarregar={detalheQ.recarregar} />}
    </div>
  </Gaveta>
}

function Bloco({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return <section className="a3-ficha-bloco"><header><h3 className="a3-titulo-3">{titulo}</h3>{extra && <span className="a3-mudo a3-pequeno">{extra}</span>}</header>{children}</section>
}
function Numero({ rotulo, valor, apoio }: { rotulo: string; valor: ReactNode; apoio?: ReactNode }) {
  return <div className="a3-metrica" style={{ padding: '14px 16px' }}><span className="a3-rotulo">{rotulo}</span><span className="a3-metrica__valor" style={{ fontSize: 24 }}>{valor}</span>{apoio && <span className="a3-metrica__linha">{apoio}</span>}</div>
}

function AbaResumo({ u, detalhe, atividade, extra, semExtra, porTema, perfil, semAtividade }: {
  u: LinhaUsuario; detalhe: Detalhe; atividade: Atividade | null; extra: FichaExtra | null; semExtra: boolean; semAtividade: boolean
  porTema: Array<{ nome: string; acerto: number; aposRevisao: number; total: number }>
  perfil: { situacao: string | null; ano: string | null; servico: string | null; locais: string[]; provas: string[]; cidadeUf: string }
}) {
  const a1 = acertoReal(u), ar = acertoAposRevisao(u)
  const hojeChave = diaSP(new Date())
  const hoje = atividade?.por_dia.find(d => d.dia === hojeChave)
  const fc = extra?.flashcards
  const fcProg = fc?.progresso ?? null, fcServ = fc?.servidor ?? null, fcCripta = fc?.cripta ?? null
  const fcCartas = Math.max(fcServ?.unicos ?? 0, fcProg?.cartas ?? 0)
  const fcAcerto = fcProg ? porcentagem(fcProg.acertos, fcProg.acertos + fcProg.erros) : null
  const usaFlashcards = fcCartas > 0 || (fcCripta?.partidas ?? 0) > 0
  return <>
    <div className="a3-faixa">
      {atividade?.agora?.online ? <i className="a3-ponto a3-ponto--vivo" style={{ marginTop: 6 }} aria-hidden="true" /> : <Icone nome="olho" tamanho={16} />}
      <div><b style={{ fontWeight: 600 }}>{atividade?.agora?.online ? 'Agora' : 'Última página vista'}</b>
        <span>{semAtividade ? 'Rode a migração 202610080100_monitor_usuarios.sql para ver a navegação.' : atividade?.agora?.pagina ? <>{rotuloPagina(atividade.agora.pagina)}{atividade.agora.questao && <> · <a className="a3-link" href={`#/questao/${atividade.agora.questao}`} target="_blank" rel="noopener noreferrer">{atividade.agora.questao}</a></>}{!atividade.agora.online && <span className="a3-mudo"> · {haQuanto(atividade.agora.visto_em)}</span>}</> : 'Ainda sem registro de navegação'}</span>
      </div>
    </div>
    <Bloco titulo="Questões" extra={`última atividade ${haQuanto(u.ultima_atividade)}`}>
      <div className="a3-painel"><div className="a3-faixa-metricas" style={{ '--colunas': 4 } as React.CSSProperties}>
        <Numero rotulo="Respondidas" valor={inteiro(u.respondidas)} apoio={`${inteiro(u.respondidas_7d)} na semana`} />
        <Numero rotulo={a1 !== null ? 'Acerto real' : 'Acerto'} valor={(a1 ?? ar) === null ? '—' : `${a1 ?? ar}%`} apoio={a1 !== null && ar !== null ? `${ar}% após revisão` : undefined} />
        <Numero rotulo="Hoje" valor={inteiro(hoje?.questoes ?? u.respondidas_hoje ?? 0)} apoio={hoje?.tentativas ? `${Math.round((hoje.acertos / hoje.tentativas) * 100)}% de acerto` : 'sem respostas hoje'} />
        <Numero rotulo="Dias com estudo" valor={atividade ? atividade.por_dia.length : '—'} apoio="nos últimos 30" />
      </div></div>
      <p className="a3-mudo a3-pequeno">{detalhe.favoritas} favoritas · {detalhe.anotacoes} anotações{acertoPorTentativa(u) !== null ? ` · ${acertoPorTentativa(u)}% por tentativa (como a pessoa vê)` : ''}</p>
    </Bloco>
    <Bloco titulo="Flashcards" extra={fcServ?.ultima ? `última resposta ${haQuanto(fcServ.ultima)}` : undefined}>
      {semExtra ? <p className="a3-mudo">Cole no Supabase a parte 25 para acompanhar os flashcards e quem abriu os planos.</p> : !extra ? <Carregando linhas={2} /> : !usaFlashcards ? <p className="a3-mudo">Ainda não usou os flashcards.</p> :
        <div className="a3-painel"><div className="a3-faixa-metricas" style={{ '--colunas': 4 } as React.CSSProperties}>
          <Numero rotulo="Cartas diferentes" valor={inteiro(fcCartas)} apoio={`${inteiro(fcServ?.semana ?? 0)} respostas na semana`} />
          <Numero rotulo="Acerto" valor={fcAcerto === null ? '—' : `${fcAcerto}%`} apoio={fcProg ? `${porcentagem(fcProg.acertos_primeira, fcProg.acertos_primeira + fcProg.erros_primeira) ?? '—'}% na 1ª vez` : 'sem progresso sincronizado'} />
          <Numero rotulo="Andar máximo" valor={Math.max(fcCripta?.andar_max ?? 0, fcProg?.recordes?.andarMaximo ?? 0) || '—'} apoio={fcCripta?.andar_max_dificil ? `${fcCripta.andar_max_dificil} no difícil` : 'no Torneio'} />
          <Numero rotulo="Partidas" valor={inteiro(Math.max(fcCripta?.partidas ?? 0, fcProg?.recordes?.partidas ?? 0))} apoio={`${fcServ?.dias_30 ?? 0} dias com flashcards em 30`} />
        </div></div>}
    </Bloco>
    {porTema.length > 0 && <Bloco titulo="Acerto real por tema" extra="1ª tentativa · ao lado, quantas questões e o acerto após revisão">
      <Ranking formato={v => `${v}%`} itens={porTema.map(t => ({ nome: t.nome, valor: t.acerto, detalhe: `${t.total} questões · ${t.aposRevisao}% após revisão` }))} />
    </Bloco>}
    <div className="a3-grade a3-grade--2">
      <Bloco titulo="Perfil">
        <dl className="a3-pares">
          <div><dt>Etapa</dt><dd>{perfil.situacao ? rotuloEtapa(perfil.situacao, perfil.ano) : '—'}</dd></div>
          <div><dt>Serviço</dt><dd>{perfil.servico ?? '—'}</dd></div>
          {perfil.locais.length > 0 && <div><dt>Também em</dt><dd>{perfil.locais.join(', ')}</dd></div>}
          <div><dt>Cidade</dt><dd>{perfil.cidadeUf || '—'}</dd></div>
          <div><dt>Provas</dt><dd>{perfil.provas.length ? perfil.provas.map(rotuloProva).join(', ') : '—'}</dd></div>
          {extra?.perfil?.perfil_atualizado_em && <div><dt>Perfil atualizado</dt><dd>{data(extra.perfil.perfil_atualizado_em)}</dd></div>}
        </dl>
      </Bloco>
      <Bloco titulo="Conta">
        <dl className="a3-pares">
          <div><dt>Criada</dt><dd>{data(u.criado_em)}</dd></div>
          {u.origem && <div><dt>Chegou por</dt><dd>{rotuloOrigem(u.origem)}</dd></div>}
          <div><dt>Aparelho</dt><dd>{detalhe.aparelho?.descricao && detalhe.aparelho.descricao !== 'suporte' ? detalhe.aparelho.descricao : '—'}</dd></div>
          {atividade?.conta && <>
            <div><dt>Último login</dt><dd>{haQuanto(atividade.conta.ultimo_login)}</dd></div>
            <div><dt>Entrou por</dt><dd>{atividade.conta.provedor === 'google' ? 'Google' : 'E-mail e senha'}</dd></div>
            <div><dt>E-mail confirmado</dt><dd>{atividade.conta.confirmado_em ? data(atividade.conta.confirmado_em) : 'não'}</dd></div>
            {idade(atividade.conta.nascimento) && <div><dt>Idade</dt><dd>{idade(atividade.conta.nascimento)} anos</dd></div>}
            {atividade.conta.whatsapp && <div><dt>WhatsApp</dt><dd><a className="a3-link" href={`https://wa.me/55${atividade.conta.whatsapp.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')}`} target="_blank" rel="noopener noreferrer">{atividade.conta.whatsapp}</a></dd></div>}
            <div><dt>Quer novidades</dt><dd>{atividade.conta.novidades ? 'sim' : 'não'}</dd></div>
          </>}
        </dl>
      </Bloco>
    </div>
    <div style={{ height: 12 }} />
  </>
}

interface EventoFicha { em: number; tipo: 'planos' | 'condicoes' | 'pagina' | 'sessao' | 'cripta' | 'email' | 'conta'; titulo: ReactNode; detalhe?: ReactNode }

function AbaAtividade({ u, detalhe, atividade, extra, semAtividade }: { u: LinhaUsuario; detalhe: Detalhe; atividade: Atividade | null; extra: FichaExtra | null; semAtividade: boolean }) {
  const dias30 = useMemo(() => {
    const porDia = new Map((atividade?.por_dia ?? []).map(d => [d.dia, d]))
    const cartas = new Map((extra?.flashcards.servidor?.por_dia ?? []).map(d => [d.dia, d.n]))
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(Date.now() - (29 - i) * 864e5), k = diaSP(d)
      return { longo: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: FUSO }), curto: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO }), q: porDia.get(k)?.questoes ?? 0, f: cartas.get(k) ?? 0 }
    })
  }, [atividade, extra])
  const grupos = useMemo(() => {
    const ev: EventoFicha[] = []
    for (const v of atividade?.visitas ?? []) {
      const planos = v.pagina === '/assinatura', cond = v.pagina === '/condicoes-assinatura'
      ev.push({ em: new Date(v.em).getTime(), tipo: planos ? 'planos' : cond ? 'condicoes' : 'pagina', titulo: planos ? 'Abriu a página de planos (preços)' : cond ? 'Abriu as Condições da Assinatura (passo antes do checkout)' : rotuloPagina(v.pagina), detalhe: v.questao ? <a className="a3-link" href={`#/questao/${v.questao}`} target="_blank" rel="noopener noreferrer">{v.questao}</a> : undefined })
    }
    const vistos = new Set(ev.map(e => `${e.tipo}|${e.em}`))
    for (const v of extra?.planos?.visitas ?? []) { const tipo = v.pagina === '/assinatura' ? 'planos' : 'condicoes', em = new Date(v.em).getTime(); if (!vistos.has(`${tipo}|${em}`)) ev.push({ em, tipo, titulo: tipo === 'planos' ? 'Abriu a página de planos (preços)' : 'Abriu as Condições da Assinatura' }) }
    for (const s of detalhe.sessoes) ev.push({ em: s.concluidaEm, tipo: 'sessao', titulo: <>Concluiu uma sessão: {s.descricao}</>, detalhe: s.total ? `${s.acertos ?? '?'} de ${s.total} certas` : undefined })
    for (const c of extra?.flashcards.cripta?.recentes ?? []) ev.push({ em: new Date(c.em).getTime(), tipo: 'cripta', titulo: c.modo === 'torre' ? 'Partida na Torre do Título (flashcards)' : 'Partida no Torneio de Flashcards', detalhe: `andar ${c.andar}${c.nivel === 'dificil' ? ' · difícil' : ''}` })
    for (const e of detalhe.emails) ev.push({ em: new Date(e.em).getTime(), tipo: 'email', titulo: <>E-mail: {e.assunto ?? (e.tipo === 'marco' && e.marco ? `emblema de ${e.marco} questões` : e.tipo)}</>, detalhe: e.status === 'enviado' ? (e.tipo === 'marco' ? 'automático' : 'enviado por você') : `não saiu (${e.status})` })
    ev.push({ em: new Date(u.criado_em).getTime(), tipo: 'conta', titulo: 'Criou a conta', detalhe: u.origem ? `chegou por ${rotuloOrigem(u.origem)}` : undefined })
    const ord = ev.filter(e => Number.isFinite(e.em)).sort((a, b) => b.em - a.em).slice(0, 160)
    const mapa = new Map<string, EventoFicha[]>()
    for (const e of ord) { const k = new Date(e.em).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: FUSO }); mapa.set(k, [...(mapa.get(k) ?? []), e]) }
    return [...mapa]
  }, [atividade, extra, detalhe, u.criado_em, u.origem])
  const marca: Record<EventoFicha['tipo'], string> = { planos: 'erro', condicoes: 'erro', pagina: '', sessao: 'tinta', cripta: 'tinta', email: 'ok', conta: 'tinta' }
  const diasSem = diasDesde(u.ultima_atividade)
  return <>
    {semAtividade ? <Faixa>Sem o registro de páginas (migração 202610080100), aparecem só sessões e e-mails.</Faixa> : atividade && <Painel titulo="Últimos 30 dias" descricao="Questões diferentes por dia; a linha mostra respostas de flashcards">
      <SerieTempo descricao="Questões e flashcards por dia nos últimos 30 dias" rotulos={dias30.map(d => ({ longo: d.longo, curto: d.curto }))} altura={180}
        series={[{ nome: 'Questões', tipo: 'barra', valores: dias30.map(d => d.q) }, ...(dias30.some(d => d.f) ? [{ nome: 'Flashcards', tipo: 'linha' as const, estilo: 'acento' as const, valores: dias30.map(d => d.f) }] : [])]} />
    </Painel>}
    {atividade && atividade.horas.length > 0 && <Painel titulo="Horário em que estuda" descricao="Tentativas por hora (São Paulo), últimos 30 dias">
      <SerieTempo descricao="Tentativas por hora do dia" altura={140} rotulos={Array.from({ length: 24 }, (_, h) => ({ longo: `${h}h`, curto: `${h}h` }))} series={[{ nome: 'Tentativas', tipo: 'barra', estilo: 2, valores: Array.from({ length: 24 }, (_, h) => atividade.horas.find(x => x.hora === h)?.n ?? 0) }]} />
    </Painel>}
    {diasSem !== null && diasSem >= 3 && <Faixa tom="aviso">Sem responder questões há {diasSem} dias.</Faixa>}
    <Bloco titulo="Linha do tempo" extra="páginas dos últimos 30 dias, sessões, partidas e e-mails">
      {grupos.map(([dia, lista]) => <div key={dia} className="a3-pilha" style={{ gap: 8 }}>
        <span className="a3-rotulo">{dia}</span>
        <ol className="a3-tempo">{lista.map((e, i) => <li key={i}><time>{horario(e.em)}</time><span className="a3-tempo__marca"><i className={marca[e.tipo]} /></span><div className="a3-tempo__texto">{e.titulo}{e.detalhe && <small>{e.detalhe}</small>}</div></li>)}</ol>
      </div>)}
    </Bloco>
    <div style={{ height: 12 }} />
  </>
}

function AbaAssinatura({ idUsuario, email }: { idUsuario: string; email: string | null }) {
  const [dados, definirDados] = useState<AssinaturaDoUsuario | null>(null)
  const [erro, definirErro] = useState<{ texto: string; ausente: boolean } | null>(null)
  const [reprocessando, definirReprocessando] = useState<number | null>(null)
  const ler = useCallback(() => chamarRpc<AssinaturaDoUsuario>('assinatura_usuario_admin', { p_usuario: idUsuario }), [idUsuario])
  const carregar = useCallback(async () => {
    try { definirDados(await ler()); definirErro(null) }
    catch (f) { definirErro(funcaoAusente(f) ? { ausente: true, texto: `Cole no Supabase a ${PARTE_COBRANCAS} para ver a assinatura aqui. Enquanto isso, use Receita › Assinaturas e Cobranças.` } : { ausente: false, texto: `Não foi possível carregar a assinatura (código ${codigoDaFalha(f)}).` }) }
  }, [ler])
  useEffect(() => { void carregar() }, [carregar])
  async function reprocessar(e: EventoPagamento) {
    if (reprocessando !== null) return
    if (!(await confirmar({ titulo: 'Reprocessar este aviso?', texto: 'O site consulta o Mercado Pago de novo e aplica o que ele disser sobre este pagamento. Nada é cobrado nem reembolsado.', sim: 'Reprocessar' }))) return
    definirReprocessando(e.id)
    const r = await reprocessarEvento(e.id, async () => (await ler()).eventos.find(x => x.id === e.id) ?? null)
    avisoRapido(r.texto, r.ok ? 'ok' : 'erro')
    await carregar(); definirReprocessando(null)
  }
  if (erro) return erro.ausente ? <Faixa>{erro.texto}</Faixa> : <Estado tipo="erro" titulo="A assinatura não carregou" texto={erro.texto} acao={<button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => void carregar()}>Tentar de novo</button>} />
  if (!dados) return <Carregando linhas={6} />
  const { assinaturas, pix, eventos } = dados
  return <>
    {dados.conta_teste && <Faixa>Conta de teste do checkout: fica fora das estatísticas.</Faixa>}
    <Bloco titulo={`Assinaturas · ${assinaturas.length}`}>
      {!assinaturas.length ? <p className="a3-mudo">Nenhuma assinatura{email ? ` para ${email}` : ''}. Se a pessoa diz que pagou, confira os pedidos Pix abaixo e o Mercado Pago.</p> : <div className="a3-pilha" style={{ gap: 10 }}>{assinaturas.map(a => {
        const base = { ...a, id_usuario: idUsuario }
        const s = situacaoAssinatura(base), prox = proximaData(base)
        return <div key={a.id} className="a3-painel a3-painel--plano" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <span><b>{rotuloPlano(a.plano)}</b> <span className="a3-mudo">· {rotuloMeio(a.meio)}{a.valor !== null ? ` · ${reais(Number(a.valor))} ${a.meio === 'pix' ? 'pagos' : 'contratados'}` : ''}</span></span>
            <Situacao tom={s.tom === 'ruim' ? 'erro' : s.tom === 'aviso' ? 'aviso' : s.tom === 'ok' ? 'ok' : 'neutro'}>{s.rotulo}</Situacao>
          </div>
          <dl className="a3-pares">
            <div><dt>Criada em</dt><dd>{data(a.criada_em)}</dd></div>
            <div><dt>Última cobrança paga</dt><dd>{a.ultima_cobranca_em ? dataHora(a.ultima_cobranca_em) : '—'}</dd></div>
            <div><dt>{prox.rotulo}</dt><dd>{data(prox.valor)}</dd></div>
            {a.cancelada_em && <div><dt>Desligou a renovação em</dt><dd>{data(a.cancelada_em)}</dd></div>}
          </dl>
          {s.detalhe && <span className="a3-mudo a3-pequeno">{s.detalhe}</span>}
          <span className="a3-mudo a3-pequeno" style={{ fontFamily: 'var(--a3-mono)' }}>{a.meio === 'cartao' ? `assinatura ${a.id_externo ?? '—'}` : `pedido ${a.id_externo?.slice(4) ?? '—'}`}{a.ultima_cobranca_id ? ` · pagamento ${a.ultima_cobranca_id}` : ''} · atualizada {dataHora(a.atualizada_em)}</span>
          {linkMercadoPago(a.ultima_cobranca_id) && <a className="a3-link" href={linkMercadoPago(a.ultima_cobranca_id)!} target="_blank" rel="noopener noreferrer">Ver o último pagamento no Mercado Pago <Icone nome="externo" tamanho={13} /></a>}
        </div>
      })}</div>}
    </Bloco>
    {pix.length > 0 && <Bloco titulo={`Pedidos Pix · ${pix.length}`}>
      <ul className="a3-movimentos">{pix.map(x => <li key={x.id}>
        <span style={{ display: 'grid' }}><b style={{ fontWeight: 500 }}>{rotuloPlano(x.plano)} · {reais(Number(x.valor))}</b><span className="a3-mudo a3-pequeno">criado {dataHora(x.criada_em)}{x.pagamento_id ? ` · pagamento ${x.pagamento_id}` : ''}{x.status === 'pending' ? ` · expira ${dataHora(x.expira_em)}` : ''}</span>
          {linkMercadoPago(x.pagamento_id) && <a className="a3-link a3-pequeno" href={linkMercadoPago(x.pagamento_id)!} target="_blank" rel="noopener noreferrer">Abrir no Mercado Pago</a>}</span>
        <Situacao tom={x.status === 'approved' ? 'ok' : ['refunded', 'charged_back', 'rejected'].includes(x.status) ? 'erro' : 'neutro'}>{STATUS_PIX[x.status] ?? x.status}</Situacao>
      </li>)}</ul>
    </Bloco>}
    <Bloco titulo={`Avisos do Mercado Pago · ${eventos.length}`} extra="cobranças mensais do cartão nem sempre se ligam à pessoa; estão em Avisos do processador">
      {!eventos.length ? <p className="a3-mudo">Nenhum aviso ligado a esta pessoa.</p> : <ul className="a3-movimentos">{eventos.map(e => {
        const comErro = e.status_processamento === 'erro'
        return <li key={e.id} style={{ alignItems: 'flex-start' }}>
          <span style={{ display: 'grid', gap: 2 }}><b style={{ fontWeight: 500 }}>{TIPOS_EVENTO[e.tipo ?? ''] ?? 'Aviso do Mercado Pago'}</b>
            <span className="a3-mudo a3-pequeno">{dataHora(e.recebido_em)} · nº {e.id_recurso ?? '—'}{comErro && e.erro ? ` · ${nomeErro(e.erro)}` : ''}</span>
            <span style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              {comErro && <button type="button" className="a3-botao a3-botao--pequeno" disabled={reprocessando !== null} aria-busy={reprocessando === e.id} onClick={() => void reprocessar(e)}>{reprocessando === e.id ? 'Reprocessando…' : 'Reprocessar'}</button>}
              {linkDoEvento(e) && <a className="a3-botao a3-botao--contorno a3-botao--pequeno" href={linkDoEvento(e)!} target="_blank" rel="noopener noreferrer">Mercado Pago <Icone nome="externo" tamanho={12} /></a>}
            </span>
          </span>
          <Situacao tom={comErro ? 'erro' : e.status_processamento === 'processado' ? 'ok' : 'neutro'}>{STATUS_EVENTO[e.status_processamento] ?? e.status_processamento}</Situacao>
        </li>
      })}</ul>}
    </Bloco>
    <div style={{ height: 12 }} />
  </>
}

function AbaAcoes({ u, detalhe, cortesiaVale, recarregar }: { u: LinhaUsuario; detalhe: Detalhe; cortesiaVale: boolean; recarregar: () => Promise<void> }) {
  const [ocupado, definirOcupado] = useState(false)
  const [dias, definirDias] = useState('90')
  const [motivo, definirMotivo] = useState('')
  const nome = nomeDe(u)
  async function acao(rotulo: string, fazer: () => Promise<unknown>, sucesso: string) {
    if (ocupado) return
    definirOcupado(true)
    try { await fazer(); avisoRapido(sucesso); await recarregar() } catch (f) { avisoRapido(`${rotulo}: ${String(f).replace(/^Error: /, '')}`, 'erro') } finally { definirOcupado(false) }
  }
  return <div className="a3-pilha">
    <div className="a3-acao-cartao">
      <div><h3 className="a3-titulo-3">Desconectar de todos os aparelhos</h3><p className="a3-mudo">A conta sai em até 1 minuto de onde estiver aberta. Útil para conta compartilhada ou aparelho perdido. A pessoa entra de novo com a senha.</p></div>
      <button type="button" className="a3-botao a3-botao--contorno" disabled={ocupado} onClick={async () => { if (await confirmar({ titulo: 'Desconectar esta conta de todos os aparelhos?', texto: 'A pessoa pode entrar de novo com a senha.', sim: 'Desconectar' })) void acao('Desconectar', () => chamarRpc('desconectar_usuario_admin', { p_id: u.id_usuario }), 'A conta sai dos aparelhos no próximo minuto.') }}>Desconectar</button>
    </div>
    <div className="a3-acao-cartao">
      <div><h3 className="a3-titulo-3">{detalhe.oculto_ranking ? 'Fora do ranking público' : 'Aparece no ranking público'}</h3><p className="a3-mudo">Para quem pediu para sair do ranking (Termos, cláusula 10) ou usou um nome inadequado.</p></div>
      <button type="button" className="a3-botao a3-botao--contorno" disabled={ocupado} onClick={async () => { if (await confirmar({ titulo: detalhe.oculto_ranking ? `Mostrar ${nome} no ranking?` : `Tirar ${nome} do ranking público?`, sim: detalhe.oculto_ranking ? 'Mostrar no ranking' : 'Tirar do ranking' })) void acao('Ranking', () => chamarRpc('ocultar_ranking_admin', { p_id: u.id_usuario, p_ocultar: !detalhe.oculto_ranking, p_motivo: detalhe.oculto_ranking ? null : 'pelo painel' }), detalhe.oculto_ranking ? 'Voltou para o ranking.' : 'Tirado do ranking.') }}>{detalhe.oculto_ranking ? 'Mostrar no ranking' : 'Tirar do ranking'}</button>
    </div>
    <div className="a3-acao-cartao a3-acao-cartao--coluna">
      <div><h3 className="a3-titulo-3">Acesso cortesia</h3><p className="a3-mudo">{cortesiaVale ? <>Ativo{detalhe.cortesia?.ate ? ` até ${data(detalhe.cortesia.ate)}` : ', sem prazo'}{detalhe.cortesia?.motivo ? ` (${detalhe.cortesia.motivo})` : ''}. </> : ''}Responde sem o limite diário, sem assinar. Para preceptores, parceiros e sorteios.</p></div>
      {cortesiaVale ? <button type="button" className="a3-botao a3-botao--perigo" disabled={ocupado} onClick={async () => { if (await confirmar({ titulo: `Remover a cortesia de ${nome}?`, texto: 'Vale na hora: a conta volta ao limite diário do plano grátis (nenhum dado é apagado).', sim: 'Remover cortesia', perigo: true })) void acao('Cortesia', () => chamarRpc('definir_cortesia_admin', { p_id: u.id_usuario, p_ate: null, p_motivo: null, p_remover: true }), 'Cortesia removida.') }}>Remover cortesia</button>
        : <div className="a3-grade a3-grade--3" style={{ alignItems: 'end' }}>
          <label className="a3-campo"><span>Motivo</span><input className="a3-entrada" maxLength={200} value={motivo} onChange={e => definirMotivo(e.target.value)} placeholder="Ex.: preceptor do serviço X" /></label>
          <label className="a3-campo"><span>Prazo</span><select className="a3-entrada" value={dias} onChange={e => definirDias(e.target.value)}><option value="30">30 dias</option><option value="90">90 dias</option><option value="365">1 ano</option><option value="sem">Sem prazo</option></select></label>
          <button type="button" className="a3-botao" disabled={ocupado} onClick={async () => { if (await confirmar({ titulo: `Conceder cortesia a ${nome}?`, texto: `Acesso sem limite diário ${dias === 'sem' ? 'sem prazo' : `por ${dias === '365' ? '1 ano' : `${dias} dias`}`}, sem cobrança.${motivo.trim() ? ` Motivo: ${motivo.trim()}.` : ''}`, sim: 'Conceder cortesia' })) void acao('Cortesia', () => chamarRpc('definir_cortesia_admin', { p_id: u.id_usuario, p_ate: dias === 'sem' ? null : new Date(Date.now() + Number(dias) * 86_400_000).toISOString(), p_motivo: motivo, p_remover: false }), 'Cortesia concedida.') }}>Conceder cortesia</button>
        </div>}
    </div>
    <p className="a3-mudo a3-pequeno"><SeloQualidade q="confirmado" /> Cada ação vale na hora e é feita no servidor, com a checagem de administrador.</p>
    <div style={{ height: 12 }} />
  </div>
}
