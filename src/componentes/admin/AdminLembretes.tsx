import { useCallback, useEffect, useState } from 'react'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { recurso } from '../../config'
import { erroDoPainel } from './formatos'

const MIGRACAO = '202610040100_emails_lembretes.sql'

type Campanha = 'nunca' | 'tres_dias' | 'sete_dias' | 'renovacao_pix' | 'renovacao_pix_hoje'
/** Quem está na campanha agora, com o histórico de lembretes da pessoa (migração 202610060300). */
interface Pessoa {
  id_usuario: string; nome: string | null; email: string; respondidas: number; acertos: number
  dias_fora: number | null; dias_restantes: number | null; plano: string | null; fim_periodo: string | null
  ultimo_lembrete_em: string | null; ultimo_lembrete_assunto: string | null; lembretes_30d: number; liberado: boolean
}
const MIGRACAO_LISTA = '202610060300_lembretes_sem_spam.sql'
interface Resumo { campanha: Campanha; pessoas: number; enviados_7d: number; enviados_total: number; falharam_7d: number }

const CAMPANHAS: Array<{ id: Campanha; titulo: string; para: string; arte: string }> = [
  { id: 'nunca', titulo: 'Primeira missão', para: 'Quem criou a conta há pelo menos um dia e nunca respondeu uma questão. Apresenta o site e convida a dar uma chance. Cada pessoa recebe uma vez só.', arte: 'pixel/treinar.png' },
  { id: 'tres_dias', titulo: 'Fogueira apagando', para: 'Quem respondia e está de 3 a 6 dias sem aparecer. Puxa de volta antes de o hábito esfriar.', arte: 'ranking/chama.png' },
  { id: 'sete_dias', titulo: 'Retomar a jornada', para: 'Quem respondia e está de 7 a 90 dias sem aparecer. Tom acolhedor: o progresso está guardado, é só voltar.', arte: 'pixel/planos.png' },
  { id: 'renovacao_pix', titulo: 'Pix: faltam 3 dias', para: 'Quem pagou no Pix (mensal, semestral ou anual) e tem o acesso terminando nos próximos 3 dias, sem ter renovado. Mostra quantas questões a pessoa fez, o acerto e o ritmo da semana, e chama para renovar. Um por compra.', arte: 'ranking/mensageiro.png' },
  { id: 'renovacao_pix_hoje', titulo: 'Pix: termina hoje', para: 'Quem pagou no Pix e tem o acesso terminando hoje, sem ter renovado. Último aviso, com os mesmos números da pessoa. Um por compra.', arte: 'ranking/chama.png' },
]

/**
 * Painel: lembretes por e-mail, um botão por campanha. A lista de quem recebe
 * é calculada na hora pelo banco; cada pessoa recebe no máximo um e-mail por
 * ausência, e quem desligou os lembretes fica de fora.
 */
export function AdminLembretes() {
  const [resumo, definirResumo] = useState<Resumo[] | null>(null)
  const [erro, definirErro] = useState('')
  const [enviando, definirEnviando] = useState<{ campanha: Campanha; texto: string } | null>(null)
  const [previa, definirPrevia] = useState<{ campanha: Campanha; html: string; para?: string | null } | null>(null)
  // Sucesso e erro tinham a mesma cor verde: erro parecia confirmação.
  const [mensagem, definirRecado] = useState<{ texto: string; erro: boolean }>({ texto: '', erro: false })
  const definirMensagem = (texto: string) => definirRecado({ texto, erro: false })
  const definirFalha = (texto: string) => definirRecado({ texto, erro: true })
  const [listas, definirListas] = useState<Partial<Record<Campanha, Pessoa[] | string>>>({})

  const carregar = useCallback(async () => {
    try { definirResumo(await chamarRpc<Resumo[]>('resumo_lembretes_admin', {})); definirErro('') }
    catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
    // Quem está em cada campanha, pelo nome, com o último lembrete que cada pessoa recebeu.
    const novas: Partial<Record<Campanha, Pessoa[] | string>> = {}
    await Promise.all(CAMPANHAS.map(async (c) => {
      try { novas[c.id] = await chamarRpc<Pessoa[]>('listar_destinatarios_lembrete_admin', { p_campanha: c.id }) }
      catch (f) { novas[c.id] = erroDoPainel(f, MIGRACAO_LISTA) }
    }))
    definirListas(novas)
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  async function verPrevia(campanha: Campanha, pessoa?: Pessoa) {
    const extra = pessoa ? { id_usuario: pessoa.id_usuario, dias_fora: pessoa.dias_fora ?? undefined, dias_restantes: pessoa.dias_restantes ?? undefined, fim_periodo: pessoa.fim_periodo ?? undefined, plano: pessoa.plano ?? undefined } : {}
    try { const r = await chamarFuncao<{ html: string }>('enviar-email', { acao: 'previa_lembrete', campanha, ...extra }); definirPrevia({ campanha, html: r.html, para: pessoa ? (pessoa.nome ?? pessoa.email) : null }) }
    catch (f) { definirFalha(`Prévia: ${String(f).replace(/^Error: /, '')}`) }
  }

  async function enviar(c: (typeof CAMPANHAS)[number], pessoas: number) {
    // A confirmação diz quem vai receber, pelo nome, para não disparar no escuro.
    const lista = listas[c.id]
    const nomes = Array.isArray(lista) ? lista.filter((p) => p.liberado).map((p) => p.nome ?? p.email) : []
    const quem = nomes.length ? `\n\n${nomes.slice(0, 15).join('\n')}${nomes.length > 15 ? `\n… e mais ${nomes.length - 15}` : ''}` : ''
    if (!pessoas || !window.confirm(`Enviar "${c.titulo}" para ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}?${quem}`)) return
    let total = 0, falhas = 0
    try {
      // Lotes de até 40 (limite de tempo da Function); para quando um lote não envia nada.
      for (let volta = 0; volta < 40; volta++) {
        definirEnviando({ campanha: c.id, texto: `Enviando… ${total} de ${pessoas}` })
        const r = await chamarFuncao<{ enviados: number; falhas: number; talvez_restem: boolean }>('enviar-email', { acao: 'lembretes', campanha: c.id, limite: 40 })
        total += r.enviados; falhas += r.falhas
        if (!r.talvez_restem || r.enviados === 0) break
      }
      definirMensagem(`${c.titulo}: ${total} ${total === 1 ? 'e-mail enviado' : 'e-mails enviados'}${falhas ? `, ${falhas} com falha (o motivo fica na ficha de cada pessoa)` : ''}.`)
    } catch (f) { definirFalha(`Envio interrompido: ${String(f).replace(/^Error: /, '')}. ${total} já tinham saído.`) }
    finally { definirEnviando(null); void carregar() }
  }

  if (erro) return <section className="adm-secao"><h2>Lembretes por e-mail</h2><p role="alert" className="adm-alerta">{erro}</p></section>

  return (
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-lembretes">
      <div><h2 id="adm-titulo-lembretes">Lembretes por e-mail</h2><p>Um botão por campanha, com a lista de quem recebe pelo nome e o último lembrete de cada pessoa. Para não virar spam, ninguém recebe dois lembretes em menos de 2 dias (só o "Pix: termina hoje" passa, por ser o último aviso). Quem já recebeu nesta ausência ou desligou os lembretes fica de fora.</p></div>
      {mensagem.texto && <p role={mensagem.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (mensagem.erro ? ' adm-mensagem--erro' : '')}>{mensagem.texto}</p>}
      <div className="adm-lembretes">
        {CAMPANHAS.map((c) => {
          const r = resumo?.find((x) => x.campanha === c.id)
          const pessoas = Number(r?.pessoas ?? 0)
          return (
            <article key={c.id} className="adm-lembrete">
              <img src={recurso(c.arte)} width={40} height={40} alt="" />
              <div className="adm-lembrete__texto">
                <h3>{c.titulo}</h3>
                <p>{c.para}</p>
                <p className="adm-nota">{!resumo ? 'Contando…' : <><strong>{pessoas}</strong> {pessoas === 1 ? 'pessoa recebe' : 'pessoas recebem'} agora · {Number(r?.enviados_7d ?? 0)} enviados nos últimos 7 dias · {Number(r?.enviados_total ?? 0)} no total{r?.falharam_7d ? ` · ${r.falharam_7d} com falha` : ''}</>}</p>
                <ListaPessoas lista={listas[c.id]} pix={c.id === 'renovacao_pix' || c.id === 'renovacao_pix_hoje'} aoVerPrevia={(p) => void verPrevia(c.id, p)} />
              </div>
              <div className="adm-lembrete__acoes">
                <button type="button" className="botao" onClick={() => void verPrevia(c.id)}>Ver prévia</button>
                <button type="button" className="botao botao--principal" disabled={!pessoas || !!enviando} onClick={() => void enviar(c, pessoas)}>
                  {enviando?.campanha === c.id ? enviando.texto : pessoas ? `Enviar para ${pessoas}` : 'Ninguém agora'}
                </button>
              </div>
            </article>
          )
        })}
        <ResumoQuinzenal aoPrevia={(html) => definirPrevia({ campanha: 'nunca', html, para: null })} />
      </div>
      {previa && <div className="adm-previa">{previa.para && <p className="adm-nota">Prévia do e-mail de <strong>{previa.para}</strong>, com os números dessa pessoa.</p>}<iframe title="Prévia do lembrete" srcDoc={previa.html} sandbox="" /><button type="button" className="adm-link" onClick={() => definirPrevia(null)}>Fechar prévia</button></div>}
    </section>
  )
}

const DATA = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
const PLANO: Record<string, string> = { mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual' }

/** "há 3 h", "ontem", "há 5 dias". */
function haQuanto(iso: string) {
  const horas = (Date.now() - new Date(iso).getTime()) / 3_600_000
  if (horas < 1) return 'há menos de 1 h'
  if (horas < 24) return `há ${Math.floor(horas)} h`
  const dias = Math.floor(horas / 24)
  return dias === 1 ? 'ontem' : `há ${dias} dias`
}

/**
 * Quem está na campanha agora, pelo nome: situação (dias fora ou fim do Pix),
 * questões, acerto e o último lembrete recebido. Quem recebeu um lembrete há
 * menos de 2 dias aparece como "aguardando" e fica fora do envio.
 */
function ListaPessoas({ lista, pix, aoVerPrevia }: { lista: Pessoa[] | string | undefined; pix: boolean; aoVerPrevia: (p: Pessoa) => void }) {
  if (lista === undefined) return null
  if (typeof lista === 'string') return <p className="adm-nota" role="alert">{lista}</p>
  if (!lista.length) return null
  const aguardando = lista.filter((p) => !p.liberado).length
  return <details className="adm-pix-detalhes" open={lista.length <= 8}>
    <summary>Ver quem recebe ({lista.length - aguardando}{aguardando ? ` · ${aguardando} aguardando o intervalo` : ''})</summary>
    <div className="adm-tabela-rolagem" role="region" aria-label="Quem recebe agora" tabIndex={0}><table className="tabela adm-pix-lista">
      <thead><tr><th scope="col">Pessoa</th><th scope="col">{pix ? 'Termina' : 'Situação'}</th><th scope="col">Questões</th><th scope="col">Acerto</th><th scope="col">Último lembrete</th><th scope="col"><span className="so-leitor">Prévia</span></th></tr></thead>
      <tbody>{lista.map((p) => <tr key={p.id_usuario} className={p.liberado ? undefined : 'adm-pix-lista__aguardando'}>
        <th scope="row">{p.nome ?? p.email}<small>{p.nome ? p.email : ''}</small></th>
        <td>{pix && p.fim_periodo
          ? <>{DATA(p.fim_periodo)}<small>{PLANO[p.plano ?? ''] ?? p.plano} · {p.dias_restantes === 0 ? 'hoje' : p.dias_restantes === 1 ? 'amanhã' : `em ${p.dias_restantes} dias`}</small></>
          : Number(p.respondidas) === 0 ? 'Nunca respondeu' : `${p.dias_fora} dias sem aparecer`}</td>
        <td className="numerico">{Number(p.respondidas).toLocaleString('pt-BR')}</td>
        <td className="numerico">{Number(p.respondidas) ? `${Math.round(100 * Number(p.acertos) / Number(p.respondidas))}%` : '-'}</td>
        <td>{p.ultimo_lembrete_em
          ? <>{haQuanto(p.ultimo_lembrete_em)}<small>{p.ultimo_lembrete_assunto ?? ''}{Number(p.lembretes_30d) > 1 ? ` · ${p.lembretes_30d} em 30 dias` : ''}</small></>
          : 'Nenhum ainda'}
          {!p.liberado && <small className="adm-pix-lista__selo">Aguardando: recebeu há menos de 2 dias</small>}</td>
        <td><button type="button" className="adm-link" onClick={() => aoVerPrevia(p)}>Prévia</button></td>
      </tr>)}</tbody>
    </table></div>
  </details>
}

/** Última quinzena encerrada no fuso de São Paulo (mesma regra da Function). */
function quinzenaAnterior(agora = new Date()) {
  const sp = new Date(agora.getTime() - 3 * 3_600_000)
  if (sp.getUTCDate() >= 16) return `${sp.getUTCFullYear()}-${String(sp.getUTCMonth() + 1).padStart(2, '0')}-q1`
  const ant = new Date(Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth() - 1, 1))
  return `${ant.getUTCFullYear()}-${String(ant.getUTCMonth() + 1).padStart(2, '0')}-q2`
}
const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
function nomeQuinzena(ref: string) {
  const [ano, mes] = ref.split('-').map(Number)
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return `${ref.endsWith('q1') ? '1 a 15' : `16 a ${ultimo}`} de ${MESES_NOME[mes - 1]}`
}

/**
 * Resumo quinzenal: o relatório de estudo (questões, acerto, temas e próximo
 * passo) para todos que estudaram na quinzena. Sai sozinho pelo agendador nos
 * dias 1 e 16; aqui dá para ver a prévia e mandar o que ficou pendente.
 */
function ResumoQuinzenal({ aoPrevia }: { aoPrevia: (html: string) => void }) {
  const [ref] = useState(quinzenaAnterior)
  const [resumo, definirResumo] = useState<{ pendentes: number; enviados: number; falharam: number } | null | string>(null)
  const [enviando, definirEnviando] = useState('')
  // Sucesso e erro tinham a mesma cor verde: erro parecia confirmação.
  const [mensagem, definirRecado] = useState<{ texto: string; erro: boolean }>({ texto: '', erro: false })
  const definirMensagem = (texto: string) => definirRecado({ texto, erro: false })
  const definirFalha = (texto: string) => definirRecado({ texto, erro: true })
  useEffect(() => {
    chamarRpc<Array<{ pendentes: number; enviados: number; falharam: number }>>('resumo_quinzenal_admin', { p_ref: ref })
      .then(([r]) => definirResumo(r ?? { pendentes: 0, enviados: 0, falharam: 0 }))
      .catch((f) => definirResumo(erroDoPainel(f, '202610110200_quinzenal_e_pix_antecipado.sql')))
  }, [ref, enviando])
  async function previa() {
    try { const r = await chamarFuncao<{ html: string }>('enviar-email', { acao: 'previa_quinzenal', quinzena: ref }); aoPrevia(r.html) }
    catch (f) { definirFalha(`Prévia: ${String(f).replace(/^Error: /, '')}`) }
  }
  async function enviar(pendentes: number) {
    if (!window.confirm(`Enviar o resumo de ${nomeQuinzena(ref)} para ${pendentes} ${pendentes === 1 ? 'pessoa' : 'pessoas'}?`)) return
    let total = 0, falhas = 0
    try {
      for (let volta = 0; volta < 25; volta++) {
        definirEnviando(`Enviando… ${total}`)
        const r = await chamarFuncao<{ enviados: number; falhas: number; talvez_restem: boolean }>('enviar-email', { acao: 'relatorios_quinzenais', quinzena: ref, limite: 40 })
        total += r.enviados; falhas += r.falhas
        if (!r.talvez_restem || r.enviados === 0) break
      }
      definirMensagem(`Resumo de ${nomeQuinzena(ref)}: ${total} enviados${falhas ? `, ${falhas} com falha` : ''}.`)
    } catch (f) { definirFalha(`Envio interrompido: ${String(f).replace(/^Error: /, '')}. ${total} já tinham saído.`) }
    finally { definirEnviando('') }
  }
  const pendentes = resumo && typeof resumo === 'object' ? Number(resumo.pendentes) : 0
  return <article className="adm-lembrete">
    <img src={recurso('pixel/relatorio.png')} width={40} height={40} alt="" />
    <div className="adm-lembrete__texto">
      <h3>Resumo quinzenal · {nomeQuinzena(ref)}</h3>
      <p>Quantas questões a pessoa fez na quinzena, o acerto comparado com a anterior, os temas e o próximo passo. Vai para todos que estudaram na quinzena e não desligaram os resumos. Sai sozinho nos dias 1 e 16 pelo agendador; no dia 1, assinantes recebem só o relatório do mês.</p>
      <p className="adm-nota">{resumo === null ? 'Contando…' : typeof resumo === 'string' ? resumo : <><strong>{pendentes}</strong> pendentes · {Number(resumo.enviados)} enviados{Number(resumo.falharam) ? ` · ${resumo.falharam} com falha` : ''}</>}</p>
      {mensagem.texto && <p role={mensagem.erro ? 'alert' : 'status'} className={'adm-nota' + (mensagem.erro ? ' adm-mensagem adm-mensagem--erro' : '')}>{mensagem.texto}</p>}
    </div>
    <div className="adm-lembrete__acoes">
      <button type="button" className="botao" onClick={() => void previa()}>Ver prévia</button>
      <button type="button" className="botao botao--principal" disabled={!pendentes || !!enviando} onClick={() => void enviar(pendentes)}>{enviando || (pendentes ? `Enviar para ${pendentes}` : 'Ninguém agora')}</button>
    </div>
  </article>
}
