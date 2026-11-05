import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { diaMes, usarPeriodoPix } from '../conta/periodoPix'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { JanelaCentral } from './JanelaCentral'
import '../estilos/componentes/AvisoVencimento.css'

/**
 * Aviso gentil de vencimento do Pix na página inicial (Tales, 05/11/2026). O Pix não renova sozinho, então
 * a pessoa recebe um lembrete calmo, sem pressa e sem bloquear nada:
 *   7 a 4 dias: uma linha discreta;  3 a 1 dia: um cartão um pouco mais visível;
 *   no dia: uma janela informativa que se fecha (uma vez por dia) e o cartão.
 * Os dias que faltam nunca se perdem: o novo período começa quando o atual termina.
 */
const DIA = 86_400_000
const chaveDoDia = (prefixo: string) => `oq:${prefixo}:${new Date().toLocaleDateString('sv-SE')}`
function lerFechado(k: string) { try { return window.localStorage.getItem(k) === '1' } catch { return false } }
function gravarFechado(k: string) { try { window.localStorage.setItem(k, '1') } catch { /* sem armazenamento: o aviso só volta a aparecer */ } }

export function AvisoVencimento({ agora = Date.now() }: { agora?: number }) {
  const { sessao } = usarConta()
  const periodo = usarPeriodoPix(sessao?.user.id)
  const fim = periodo?.pix ? periodo.fim : null
  const chaveFaixa = chaveDoDia('aviso-vencimento'), chaveJanela = chaveDoDia('janela-vencimento')
  const [faixaFechada, fecharFaixa] = useState(() => lerFechado(chaveFaixa))
  const [janela, definirJanela] = useState(false)
  const restante = fim ? fim - agora : null
  // Dias contados pelo calendário: "termina hoje" quando o fim cai no dia de hoje.
  const dias = fim ? Math.round((new Date(new Date(fim).toDateString()).getTime() - new Date(new Date(agora).toDateString()).getTime()) / DIA) : null
  useEffect(() => { if (dias === 0 && restante !== null && restante > 0 && !lerFechado(chaveJanela)) definirJanela(true) }, [dias, restante, chaveJanela])
  if (!fim || restante === null || restante <= 0 || dias === null || dias > 7 || faixaFechada) return janela ? <Janela fim={fim!} fechar={() => { gravarFechado(chaveJanela); definirJanela(false) }} /> : null
  const nivel = dias >= 4 ? 'discreto' : dias >= 1 ? 'atento' : 'hoje'
  const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`
  return <>
    <aside className={`aviso-venc aviso-venc--${nivel}`} aria-label="Seu acesso está chegando ao fim">
      <span className="aviso-venc__icone" aria-hidden="true"><Icone nome="calendario" tamanho={nivel === 'discreto' ? 16 : 20} /></span>
      <p className="aviso-venc__texto">
        <strong>Seu acesso termina {quando}{dias > 0 ? ` (${diaMes(fim)})` : ''}.</strong>{' '}
        {nivel === 'discreto' ? 'Se quiser, já pode renovar com tranquilidade: todos os dias que ainda restam são acrescentados ao novo período.'
          : nivel === 'atento' ? 'Não precisa se preocupar: renovando agora, nenhum dia se perde, e você continua estudando normalmente.'
          : 'Seu histórico continua salvo. Renovando hoje, você segue estudando sem pausa.'}
      </p>
      <a className={`botao ${nivel === 'discreto' ? 'botao--fantasma' : 'botao--principal'} aviso-venc__botao`} href={href('/assinatura')}>Renovar meu acesso</a>
      <button type="button" className="aviso-venc__fechar" aria-label="Fechar este aviso por hoje" onClick={() => { gravarFechado(chaveFaixa); fecharFaixa(true) }}><Icone nome="fechar" tamanho={16} /></button>
    </aside>
    {janela && <Janela fim={fim} fechar={() => { gravarFechado(chaveJanela); definirJanela(false) }} />}
  </>
}

function Janela({ fim, fechar }: { fim: number; fechar: () => void }) {
  return <JanelaCentral aberta aoFechar={fechar} rotulo="Seu acesso termina hoje" className="aviso-venc-janela">
    <div className="aviso-venc-janela__corpo">
      <span className="aviso-venc-janela__selo"><Icone nome="calendario" tamanho={22} /></span>
      <h2>Seu acesso termina hoje</h2>
      <p>Passando com carinho para lembrar: o seu período no Pix vai até hoje, {diaMes(fim)}. Seu histórico de estudos continua salvo, e você pode renovar agora para seguir estudando normalmente.</p>
      <p className="aviso-venc-janela__nota">No Pix, o novo período começa quando o atual termina; no cartão, a primeira cobrança só acontece no fim do Pix. Nenhum dia se perde.</p>
      <div className="aviso-venc-janela__botoes">
        <a className="botao botao--principal" href={href('/assinatura')}>Renovar meu acesso</a>
        <button type="button" className="botao botao--fantasma" onClick={fechar}>Agora não</button>
      </div>
    </div>
  </JanelaCentral>
}
