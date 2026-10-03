import { useCallback, useEffect, useState } from 'react'
import { chamarFuncao, chamarRpc } from '../../servicos/supabase'
import { recurso } from '../../config'
import { erroDoPainel } from './formatos'

const MIGRACAO = '202610040100_emails_lembretes.sql'

type Campanha = 'nunca' | 'tres_dias' | 'sete_dias'
interface Resumo { campanha: Campanha; pessoas: number; enviados_7d: number; enviados_total: number; falharam_7d: number }

const CAMPANHAS: Array<{ id: Campanha; titulo: string; para: string; arte: string }> = [
  { id: 'nunca', titulo: 'Primeira missão', para: 'Quem criou a conta há pelo menos um dia e nunca respondeu uma questão. Apresenta o site e convida a dar uma chance. Cada pessoa recebe uma vez só.', arte: 'pixel/treinar.png' },
  { id: 'tres_dias', titulo: 'Fogueira apagando', para: 'Quem respondia e está de 3 a 6 dias sem aparecer. Puxa de volta antes de o hábito esfriar.', arte: 'ranking/chama.png' },
  { id: 'sete_dias', titulo: 'Retomar a jornada', para: 'Quem respondia e está de 7 a 90 dias sem aparecer. Tom acolhedor: o progresso está guardado, é só voltar.', arte: 'pixel/planos.png' },
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
  const [previa, definirPrevia] = useState<{ campanha: Campanha; html: string } | null>(null)
  const [mensagem, definirMensagem] = useState('')

  const carregar = useCallback(async () => {
    try { definirResumo(await chamarRpc<Resumo[]>('resumo_lembretes_admin', {})); definirErro('') }
    catch (f) { definirErro(erroDoPainel(f, MIGRACAO)) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  async function verPrevia(campanha: Campanha) {
    try { const r = await chamarFuncao<{ html: string }>('enviar-email', { acao: 'previa_lembrete', campanha }); definirPrevia({ campanha, html: r.html }) }
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
      {previa && <div className="adm-previa"><iframe title="Prévia do lembrete" srcDoc={previa.html} sandbox="" /><button type="button" className="adm-link" onClick={() => definirPrevia(null)}>Fechar prévia</button></div>}
    </section>
  )
}
