import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { diaMes, somarMeses, usarPeriodoPix } from '../conta/periodoPix'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { JanelaCentral } from './JanelaCentral'
import '../estilos/componentes/AvisoVencimento.css'

/**
 * Aviso de vencimento do Pix na página inicial (Tales, 05/11/2026). O Pix não renova sozinho, então a
 * pessoa recebe um lembrete carinhoso, sem pressa e sem bloquear nada, só nos 7 dias finais (no dia, também
 * uma janela, uma vez por dia).
 *
 * O ponto que confunde (Tales: "o usuário sempre vai se confundir"): renovar antes NÃO perde dias. Por isso
 * o aviso mostra a conta pronta, em blocos: os dias que ainda restam + os dias do novo mês = o total, com a
 * data final. Sem jargão de "período" e sem falar de cartão.
 */
const DIA = 86_400_000
const chaveDoDia = (prefixo: string) => `oq:${prefixo}:${new Date().toLocaleDateString('sv-SE')}`
function lerFechado(k: string) { try { return window.localStorage.getItem(k) === '1' } catch { return false } }
function gravarFechado(k: string) { try { window.localStorage.setItem(k, '1') } catch { /* sem armazenamento: o aviso só volta a aparecer */ } }
const meiaNoite = (ms: number) => new Date(new Date(ms).toDateString()).getTime()
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

export interface Desempenho { acerto: number | null; respondidas: number }

/** A conta da renovação mensal: dias que restam + dias do novo mês = total, e até quando vai. */
export function contaRenovacao(fim: number, agora: number) {
  const restam = Math.max(0, Math.round((meiaNoite(fim) - meiaNoite(agora)) / DIA))
  const novoFim = somarMeses(fim, 1)
  const novos = Math.round((meiaNoite(novoFim) - meiaNoite(fim)) / DIA)
  return { restam, novos, total: restam + novos, fim, novoFim }
}

/** A primeira frase: o acerto da pessoa quando é um número bom de mostrar; senão, uma pergunta carinhosa. */
function abertura(d?: Desempenho) {
  if (d && d.acerto !== null && d.acerto >= 50 && d.respondidas >= 10) {
    return <>Você já está com <strong className="aviso-venc__pct">{d.acerto}% de acerto</strong> em {d.respondidas.toLocaleString('pt-BR')} questões. Que orgulho! Vamos continuar?</>
  }
  return <>Está curtindo estudar com o Orto Questões? Que bom ter você aqui.</>
}

function Soma({ fim, agora }: { fim: number; agora: number }) {
  const c = contaRenovacao(fim, agora)
  return <div className="aviso-venc-soma" role="group" aria-label={`Renovando agora: ${c.restam} dias que você ainda tem, mais ${c.novos} dias do novo mês. Seu acesso vai até ${diaMes(c.novoFim)}`}>
    <div className="aviso-venc-soma__bloco aviso-venc-soma__bloco--seu">
      <b>{c.restam === 0 ? 'Hoje' : plural(c.restam, 'dia', 'dias')}</b>
      <span>{c.restam === 0 ? 'o resto do seu dia' : 'que você ainda tem'}</span>
    </div>
    <span className="aviso-venc-soma__sinal" aria-hidden="true">+</span>
    <div className="aviso-venc-soma__bloco aviso-venc-soma__bloco--novo">
      <b>{c.novos} dias</b>
      <span>do novo mês</span>
    </div>
    <span className="aviso-venc-soma__sinal" aria-hidden="true">=</span>
    <div className="aviso-venc-soma__bloco aviso-venc-soma__bloco--total">
      {c.restam === 0
        ? <><b>Até {diaMes(c.novoFim)}</b><span>sem nenhum dia de pausa</span></>
        : <><b>{c.total} dias</b><span>de estudo, até {diaMes(c.novoFim)}</span></>}
    </div>
  </div>
}

function Explicacao({ fim, agora }: { fim: number; agora: number }) {
  const c = contaRenovacao(fim, agora)
  return <p className="aviso-venc__claro">
    <Icone nome="certo" tamanho={16} />
    <span>{c.restam === 0
      ? <>Renovando hoje, você não fica nenhum dia sem estudar: o novo mês começa assim que o de agora acaba.</>
      : <>Renovar agora <strong>não desperdiça nenhum dia</strong>. Os {plural(c.restam, 'dia', 'dias')} que você ainda tem continuam seus, e os {c.novos} dias novos só começam a contar depois deles, em {diaMes(fim)}.</>}</span>
  </p>
}

export function AvisoVencimento({ agora = Date.now(), desempenho }: { agora?: number; desempenho?: Desempenho }) {
  const { sessao } = usarConta()
  const periodo = usarPeriodoPix(sessao?.user.id)
  const fim = periodo?.pix ? periodo.fim : null
  const chaveFaixa = chaveDoDia('aviso-vencimento'), chaveJanela = chaveDoDia('janela-vencimento')
  const [faixaFechada, fecharFaixa] = useState(() => lerFechado(chaveFaixa))
  const [janela, definirJanela] = useState(false)
  const restante = fim ? fim - agora : null
  const dias = fim ? Math.round((meiaNoite(fim) - meiaNoite(agora)) / DIA) : null
  useEffect(() => { if (dias === 0 && restante !== null && restante > 0 && !lerFechado(chaveJanela)) definirJanela(true) }, [dias, restante, chaveJanela])
  const fecharJanela = () => { gravarFechado(chaveJanela); definirJanela(false) }
  if (!fim || restante === null || restante <= 0 || dias === null || dias > 7 || faixaFechada) return janela && fim ? <Janela fim={fim} agora={agora} desempenho={desempenho} fechar={fecharJanela} /> : null
  const nivel = dias >= 4 ? 'discreto' : dias >= 1 ? 'atento' : 'hoje'
  const quando = dias === 0 ? 'hoje' : dias === 1 ? `amanhã (${diaMes(fim)})` : `em ${dias} dias (${diaMes(fim)})`
  return <>
    <aside className={`aviso-venc aviso-venc--${nivel}`} aria-label="Seu acesso está chegando ao fim">
      <button type="button" className="aviso-venc__fechar" aria-label="Fechar este aviso por hoje" onClick={() => { gravarFechado(chaveFaixa); fecharFaixa(true) }}><Icone nome="fechar" tamanho={16} /></button>
      <p className="aviso-venc__oi">{abertura(desempenho)}</p>
      <h2 className="aviso-venc__titulo">Seu acesso termina {quando}.</h2>
      <Soma fim={fim} agora={agora} />
      <Explicacao fim={fim} agora={agora} />
      <a className="botao botao--principal aviso-venc__botao" href={href('/assinatura')}>Renovar agora e somar os dias</a>
    </aside>
    {janela && <Janela fim={fim} agora={agora} desempenho={desempenho} fechar={fecharJanela} />}
  </>
}

function Janela({ fim, agora, desempenho, fechar }: { fim: number; agora: number; desempenho?: Desempenho; fechar: () => void }) {
  return <JanelaCentral aberta aoFechar={fechar} rotulo="Seu acesso termina hoje" className="aviso-venc-janela">
    <div className="aviso-venc-janela__corpo">
      <span className="aviso-venc-janela__selo" aria-hidden="true"><Icone nome="calendario" tamanho={24} /></span>
      <p className="aviso-venc__oi">{abertura(desempenho)}</p>
      <h2>Seu acesso termina hoje</h2>
      <p>Continue treinando: renovando agora, amanhã você já abre o site e segue de onde parou. Seu histórico, seus erros e seu cronograma continuam todos aqui.</p>
      <Soma fim={fim} agora={agora} />
      <div className="aviso-venc-janela__botoes">
        <a className="botao botao--principal" href={href('/assinatura')}>Renovar agora</a>
        <button type="button" className="botao botao--fantasma" onClick={fechar}>Agora não</button>
      </div>
    </div>
  </JanelaCentral>
}
