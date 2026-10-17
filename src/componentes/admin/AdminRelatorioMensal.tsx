import { useEffect, useState } from 'react'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { nomeEdicao } from '../../estado/sessao'
import { confirmar } from '../Confirmar'

interface ResumoRelatorio { pendentes: number; enviados: number; falharam: number }

function mesAnterior() {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Painel › E-mails › Lembretes e automáticos: relatório mensal dos assinantes (antes ficava em Ajustes). */
export function AdminRelatorioMensal() {
  const [mes, definirMes] = useState(mesAnterior)
  const [resumo, definirResumo] = useState<ResumoRelatorio | null>(null)
  const [previa, definirPrevia] = useState<string | null>(null)
  const [enviando, definirEnviando] = useState('')
  // Recontagem só ao trocar o mês e ao terminar um envio (antes, a cada lote enviado).
  const [versao, definirVersao] = useState(0)
  // Sucesso e erro tinham a mesma cor verde: erro parecia confirmação.
  const [mensagem, definirRecado] = useState<{ texto: string; erro: boolean }>({ texto: '', erro: false })

  useEffect(() => {
    let vivo = true
    definirResumo(null)
    chamarRpc<ResumoRelatorio[]>('resumo_relatorio_admin', { p_mes: mes }).then(([r]) => { if (vivo) definirResumo(r ?? null) }).catch(() => undefined)
    return () => { vivo = false }
  }, [mes, versao])

  async function verPrevia() {
    try { const r = await chamarFuncao<{ html: string }>('enviar-email', { acao: 'previa_relatorio', mes }); definirPrevia(r.html) }
    catch (f) { definirRecado({ texto: `Prévia: ${String(f).replace(/^Error: /, '')}`, erro: true }) }
  }

  async function enviarRelatorios() {
    if (!resumo?.pendentes || !(await confirmar({ titulo: `Enviar o relatório de ${nomeEdicao(mes)} para ${resumo.pendentes} assinante(s)?`, sim: 'Enviar' }))) return
    let total = 0, falhas = 0
    try {
      // Lotes de até 40 (limite de tempo da Function); para quando um lote não envia nada.
      for (let volta = 0; volta < 25; volta++) {
        definirEnviando(`Enviando… ${total} enviados até agora`)
        const r = await chamarFuncao<{ enviados: number; falhas: number; talvez_restem: boolean }>('enviar-email', { acao: 'relatorios_mensais', mes, limite: 40 })
        total += r.enviados; falhas += r.falhas
        if (!r.talvez_restem || r.enviados === 0) break
      }
      definirRecado({ texto: `Relatório de ${nomeEdicao(mes)}: ${total} enviados${falhas ? `, ${falhas} com falha (motivo em Últimos envios, mais abaixo)` : ''}.`, erro: false })
    } catch (f) { definirRecado({ texto: `Envio interrompido: ${String(f).replace(/^Error: /, '')}. ${total} já tinham saído.`, erro: true }) }
    finally { definirEnviando(''); definirVersao(v => v + 1) }
  }

  return <section className="empilha adm-secao" aria-labelledby="adm-titulo-relatorio">
    <div><h2 id="adm-titulo-relatorio">Relatório mensal por e-mail</h2><p>Evolução do mês, temas que subiram e caíram e o próximo passo, para cada assinante que não desligou em Minha conta.</p></div>
    {mensagem.texto && <p role={mensagem.erro ? 'alert' : 'status'} className={'adm-nota adm-mensagem' + (mensagem.erro ? ' adm-mensagem--erro' : '')}>{mensagem.texto}</p>}
    <div className="adm-busca">
      <label className="campo adm-campo-curto">Mês do relatório<input className="entrada" type="month" value={mes} max={mesAnterior()} onChange={(e) => e.target.value && definirMes(e.target.value)} /></label>
    </div>
    <p className="adm-nota">{resumo ? <>{resumo.pendentes} para enviar · {resumo.enviados} já enviados{resumo.falharam ? ` · ${resumo.falharam} com falha` : ''}</> : 'Contando…'}</p>
    <div className="linha">
      <button type="button" className="botao" onClick={() => void verPrevia()}>Ver o meu relatório</button>
      <button type="button" className="botao botao--principal" disabled={!resumo?.pendentes || !!enviando} onClick={() => void enviarRelatorios()}>{enviando || 'Enviar agora'}</button>
    </div>
    <p className="adm-nota">Para sair sozinho todo dia 1º, dá para agendar no Supabase (instruções no guia de configuração).</p>
    {previa && <div className="adm-previa"><iframe title="Prévia do relatório mensal" srcDoc={previa} sandbox="" /><button type="button" className="adm-link" onClick={() => definirPrevia(null)}>Fechar prévia</button></div>}
  </section>
}
