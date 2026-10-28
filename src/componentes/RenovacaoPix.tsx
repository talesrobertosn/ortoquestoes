import { IconePixel } from './IconePixel'
import { Icone } from './Icone'
import { href } from '../util/rotas'
import { diaMes, JANELA_RENOVACAO_PIX, somarMeses } from '../conta/periodoPix'

/**
 * Renovação do Pix explicada à vista (28/10/2026, pedido do Tales depois de um assinante
 * não achar o botão): a linha do tempo mostra hoje, quando a renovação abre, o fim do
 * acesso atual e o mês novo encaixado logo depois, para ficar claro que nenhum dia se perde.
 * Com a janela aberta, o botão renova; antes dela, mostra a data em que abre.
 */
/** "hoje, às 21:24", "amanhã, às 9:00" ou "04/11": quando a renovação abre. */
function quando(ms: number, agora: number) {
  const hora = new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dia = (x: number) => new Date(x).toDateString()
  if (dia(ms) === dia(agora)) return `hoje, às ${hora}`
  if (dia(ms) === dia(agora + 864e5)) return `amanhã, às ${hora}`
  return diaMes(ms)
}

export function RenovacaoPix({ fim, aoRenovar, agora = Date.now() }: { fim: number; aoRenovar?: () => void; agora?: number }) {
  const abre = fim - JANELA_RENOVACAO_PIX
  const aberta = agora >= abre
  const dias = Math.max(1, Math.ceil((fim - agora) / 864e5))
  const diasAteAbrir = Math.max(0, Math.ceil((abre - agora) / 864e5))
  const novoFim = somarMeses(fim, 1)
  // Larguras proporcionais aos dias, com um mínimo para os rótulos caberem.
  // Hoje e a abertura no mesmo dia (ou no seguinte) viram uma marca só, para os rótulos não se sobreporem.
  const mostrarHoje = !aberta && abre - agora > 1.5 * 864e5
  const antes = mostrarHoje ? Math.max(diasAteAbrir, 7) : 0
  const janela = Math.max(Math.min(dias, 7), 4)
  const abreTexto = quando(abre, agora)
  const rotuloBotao = aberta ? 'Renovar no Pix' : `Renovação abre ${abreTexto.includes(',') ? abreTexto : `em ${abreTexto}`}`

  return <section className={'renova-pix' + (aberta ? ' renova-pix--aberta' : '')} aria-label="Renovação pelo Pix">
    <div className="renova-pix__topo">
      <span className="renova-pix__icone"><IconePixel nome="planos" tamanho={44} /></span>
      <div>
        <h3>Renovação pelo Pix</h3>
        <p>No Pix não há cobrança automática: você renova quando quiser continuar, e os dias que faltam nunca se perdem.</p>
      </div>
      <span className="renova-pix__estado"><i aria-hidden="true" />{aberta ? 'Aberta agora' : `Abre ${abreTexto.includes(',') ? abreTexto.split(',')[0] : `em ${abreTexto}`}`}</span>
    </div>

    <div className="renova-pix__linha" aria-hidden="true">
      <div className="renova-pix__barra">
        {mostrarHoje && <span className="renova-pix__seg renova-pix__seg--antes" style={{ flexGrow: antes }} />}
        <span className="renova-pix__seg renova-pix__seg--janela" style={{ flexGrow: janela }} />
        <span className="renova-pix__seg renova-pix__seg--novo" style={{ flexGrow: 30 }} />
      </div>
      <div className="renova-pix__marcas">
        {mostrarHoje && <span style={{ flexGrow: antes }}><b>Hoje</b><small>{diaMes(agora)}</small></span>}
        <span style={{ flexGrow: janela }}><b>{aberta ? 'Hoje' : mostrarHoje ? 'Abre' : 'Hoje · abre'}</b><small>{aberta ? diaMes(agora) : diaMes(abre)}</small></span>
        <span className="renova-pix__marca-fim" style={{ flexGrow: 30 }}><b>Fim atual</b><small>{diaMes(fim)}</small></span>
        <span className="renova-pix__marca-novo"><b>+1 mês</b><small>{diaMes(novoFim)}</small></span>
      </div>
    </div>

    <p className="renova-pix__texto">{aberta
      ? <><strong>Faltam {dias} {dias === 1 ? 'dia' : 'dias'}.</strong> A renovação já está aberta: pague agora e o novo período começa em {diaMes(fim)}, quando o atual termina. No plano mensal, o acesso vai até {diaMes(novoFim)}.</>
      : <>Seu acesso vai até <strong>{diaMes(fim)}</strong>. A renovação abre <strong>{abreTexto.includes(',') ? abreTexto : `em ${abreTexto}`}</strong>, 7 dias antes do fim, e mandamos um lembrete por e-mail perto do fim. Renovando, o novo período começa em {diaMes(fim)}.</>}</p>

    {aberta
      ? (aoRenovar
        ? <button type="button" className="botao botao--principal renova-pix__botao" onClick={aoRenovar}>{rotuloBotao} <Icone nome="direita" tamanho={16} /></button>
        : <a className="botao botao--principal renova-pix__botao" href={href('/assinatura')}>{rotuloBotao} <Icone nome="direita" tamanho={16} /></a>)
      : <span className="botao renova-pix__botao renova-pix__botao--espera" aria-disabled="true"><Icone nome="calendario" tamanho={16} /> {rotuloBotao}</span>}
  </section>
}
