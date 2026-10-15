import { useCallback, useEffect, useState } from 'react'
import { chamarRpc } from '../../servicos/supabase'
import { dataHora, erroDoPainel, motivoFalhaEmail } from './formatos'

interface ConfigEmails { marcos_automaticos: boolean; alertas_admin: boolean }
interface EmailEnviado { id: number; tipo: string; marco: number | null; assunto: string | null; status: string; erro: string | null; enviado_em: string; usuario: string | null }

const MIGRACAO = '202609290200_painel_admin_2.sql'
const TIPO_EMAIL: Record<string, string> = { marco: 'Parabéns automático', parabens: 'Carta enviada por você', carta: 'Carta pessoal', alerta_admin: 'Alerta para você', relatorio: 'Resumo de estudo', lembrete: 'Lembrete', relato_resolvido: 'Aviso de relato resolvido' }

/** Painel › Operações › Lembretes e e-mails: e-mails automáticos e os últimos envios (antes ficavam em Ajustes). */
export function AdminEmails() {
  const [emails, definirEmails] = useState<ConfigEmails | null>(null)
  const [enviados, definirEnviados] = useState<EmailEnviado[] | null>(null)
  const [erro, definirErro] = useState('')
  const [falhaSalvar, definirFalhaSalvar] = useState('')

  const carregar = useCallback(async () => {
    try {
      const [e, lista] = await Promise.all([chamarRpc<ConfigEmails[]>('obter_config_emails_admin', {}), chamarRpc<EmailEnviado[]>('listar_emails_admin', {})])
      definirEmails(e[0] ?? null); definirEnviados(lista); definirErro('')
    } catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  async function salvarEmails(proximo: ConfigEmails) {
    definirEmails(proximo); definirFalhaSalvar('')
    try { await chamarRpc('definir_config_emails_admin', { p_marcos: proximo.marcos_automaticos, p_alertas: proximo.alertas_admin }) }
    catch { definirFalhaSalvar('Não foi possível salvar a configuração de e-mails.'); await carregar() }
  }

  if (erro) return <section className="adm-secao"><h2>E-mails automáticos</h2><p role="alert" className="adm-alerta">{erro}</p></section>
  if (!emails) return <section className="adm-secao"><p role="status">Carregando os e-mails…</p></section>
  const falhas = enviados?.filter(e => e.status === 'falhou').length ?? 0

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-emails">
    <div><h2 id="adm-titulo-emails">E-mails automáticos</h2><p>Parabéns automático quando alguém desbloqueia um emblema (50, 100, 250, 500, 1.000, 2.000, 3.000 e 4.000 questões), uma vez por emblema e só para quem não desligou em Minha conta.</p></div>
    {falhaSalvar && <p role="alert" className="adm-nota adm-mensagem adm-mensagem--erro">{falhaSalvar}</p>}
    <label className="ct-interruptor"><input type="checkbox" checked={emails.marcos_automaticos} onChange={e => void salvarEmails({ ...emails, marcos_automaticos: e.target.checked })} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span>Enviar parabéns automáticos pelos emblemas</span></label>
    <label className="ct-interruptor"><input type="checkbox" checked={emails.alertas_admin} onChange={e => void salvarEmails({ ...emails, alertas_admin: e.target.checked })} /><span className="ct-interruptor__trilho" aria-hidden="true" /><span>Me avisar por e-mail quando um pagamento der erro ou alguém escrever que um comentário não ajudou</span></label>
    <p className="adm-nota">Todos os e-mails para as pessoas saem como carta: só texto, sem logo, assinados “Um abraço, Tales, do Orto Questões”. Para escrever a alguém, abra a ficha em Pessoas › Usuários (parte Carta e ações); para um grupo, Pessoas › Cartas.</p>
    <h3 className="adm-subtitulo">Últimos envios{falhas > 0 && <span className="adm-selo adm-selo--ruim">{falhas} com falha</span>}</h3>
    {!enviados?.length ? <p className="adm-vazio">Nenhum e-mail enviado ainda.</p> : <ul className="adm-mini">
      {enviados.slice(0, 30).map(e => <li key={e.id}><span className="adm-mini__nome">{e.assunto ?? TIPO_EMAIL[e.tipo]}<small>{TIPO_EMAIL[e.tipo] ?? e.tipo}{e.usuario ? ` · ${e.usuario}` : ''}</small>{e.status === 'falhou' && <small className="adm-erro-email">{motivoFalhaEmail(e.erro)}</small>}</span><span className={'adm-selo ' + (e.status === 'enviado' ? 'adm-selo--ok' : e.status === 'falhou' ? 'adm-selo--ruim' : 'adm-selo--neutro')}>{e.status === 'enviado' ? dataHora(e.enviado_em) : e.status}</span></li>)}
    </ul>}
  </section>
}
