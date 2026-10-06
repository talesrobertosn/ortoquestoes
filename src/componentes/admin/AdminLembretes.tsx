import { useCallback, useEffect, useState } from 'react'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { recurso } from '../../config'
import { erroDoPainel } from './formatos'

const MIGRACAO = '202610040100_emails_lembretes.sql'

type Campanha = 'nunca' | 'tres_dias' | 'sete_dias' | 'renovacao_pix' | 'renovacao_pix_hoje'
interface PessoaPix { id_usuario: string; nome: string | null; email: string; plano: string; fim_periodo: string; dias_restantes: number; respondidas: number; acertos: number }
const MIGRACAO_PIX = '202610060200_renovacao_pix_dia.sql'
const ETAPA: Partial<Record<Campanha, 'tres_dias' | 'hoje'>> = { renovacao_pix: 'tres_dias', renovacao_pix_hoje: 'hoje' }
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
  const [mensagem, definirMensagem] = useState('')
  const [pessoasPix, definirPessoasPix] = useState<Partial<Record<Campanha, PessoaPix[] | string>>>({})

  const carregar = useCallback(async () => {
    try { definirResumo(await chamarRpc<Resumo[]>('resumo_lembretes_admin', {})); definirErro('') }
    catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
    // Quem recebe cada lembrete do Pix, com os números de cada um.
    const listas: Partial<Record<Campanha, PessoaPix[] | string>> = {}
    for (const [campanha, etapa] of Object.entries(ETAPA) as Array<[Campanha, string]>) {
      try { listas[campanha] = await chamarRpc<PessoaPix[]>('listar_renovacao_pix_admin', { p_etapa: etapa }) }
      catch (f) { listas[campanha] = erroDoPainel(f, MIGRACAO_PIX) }
    }
    definirPessoasPix(listas)
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  async function verPrevia(campanha: Campanha, pessoa?: PessoaPix) {
    const extra = pessoa ? { id_usuario: pessoa.id_usuario, dias_restantes: pessoa.dias_restantes, fim_periodo: pessoa.fim_periodo, plano: pessoa.plano } : {}
    try { const r = await chamarFuncao<{ html: string }>('enviar-email', { acao: 'previa_lembrete', campanha, ...extra }); definirPrevia({ campanha, html: r.html, para: pessoa ? (pessoa.nome ?? pessoa.email) : null }) }
    catch (f) { definirMensagem(`Prévia: ${String(f).replace(/^Error: /, '')}`) }
  }

  async function enviar(c: (typeof CAMPANHAS)[number], pessoas: number) {
    if (!pessoas || !window.confirm(`Enviar "${c.titulo}" para ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}?`)) return
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
    } catch (f) { definirMensagem(`Envio interrompido: ${String(f).replace(/^Error: /, '')}. ${total} já tinham saído.`) }
    finally { definirEnviando(null); void carregar() }
  }

  if (erro) return <section className="adm-secao"><h2>Lembretes por e-mail</h2><p role="alert" className="adm-alerta">{erro}</p></section>

  return (
    <section className="empilha adm-secao" aria-labelledby="adm-titulo-lembretes">
      <div><h2 id="adm-titulo-lembretes">Lembretes por e-mail</h2><p>Um botão por campanha. O número mostra quem recebe agora; quem já recebeu nesta ausência ou desligou os lembretes fica de fora.</p></div>
      {mensagem && <p role="status" className="adm-nota adm-mensagem">{mensagem}</p>}
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
                {ETAPA[c.id] && <ListaPix lista={pessoasPix[c.id]} aoVerPrevia={(p) => void verPrevia(c.id, p)} />}
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
      </div>
      {previa && <div className="adm-previa">{previa.para && <p className="adm-nota">Prévia do e-mail de <strong>{previa.para}</strong>, com os números dela.</p>}<iframe title="Prévia do lembrete" srcDoc={previa.html} sandbox="" /><button type="button" className="adm-link" onClick={() => definirPrevia(null)}>Fechar prévia</button></div>}
    </section>
  )
}

const DATA = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
const PLANO: Record<string, string> = { mensal: 'Mensal', semestral: 'Semestral', anual: 'Anual' }

/** Quem recebe o lembrete do Pix agora: plano, data do fim e desempenho, com a prévia de cada um. */
function ListaPix({ lista, aoVerPrevia }: { lista: PessoaPix[] | string | undefined; aoVerPrevia: (p: PessoaPix) => void }) {
  if (lista === undefined) return null
  if (typeof lista === 'string') return <p className="adm-nota" role="alert">{lista}</p>
  if (!lista.length) return null
  return <div className="adm-tabela-rolagem" role="region" aria-label="Quem recebe agora" tabIndex={0}><table className="tabela adm-pix-lista">
    <thead><tr><th scope="col">Pessoa</th><th scope="col">Plano</th><th scope="col">Termina</th><th scope="col">Questões</th><th scope="col">Acerto</th><th scope="col"><span className="so-leitor">Prévia</span></th></tr></thead>
    <tbody>{lista.map((p) => <tr key={p.id_usuario}>
      <th scope="row">{p.nome ?? p.email}<small>{p.nome ? p.email : ''}</small></th>
      <td>{PLANO[p.plano] ?? p.plano}</td>
      <td className="numerico">{DATA(p.fim_periodo)}<small>{p.dias_restantes === 0 ? 'hoje' : p.dias_restantes === 1 ? 'amanhã' : `em ${p.dias_restantes} dias`}</small></td>
      <td className="numerico">{Number(p.respondidas).toLocaleString('pt-BR')}</td>
      <td className="numerico">{Number(p.respondidas) ? `${Math.round(100 * Number(p.acertos) / Number(p.respondidas))}%` : '-'}</td>
      <td><button type="button" className="adm-link" onClick={() => aoVerPrevia(p)}>Prévia</button></td>
    </tr>)}</tbody>
  </table></div>
}
