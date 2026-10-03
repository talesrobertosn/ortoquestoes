import { useState } from 'react'
import { recurso } from '../config'
import { usarConta } from '../conta/ContextoConta'
import { DIAS_POR_AMIGO, LIMITE_AMIGOS, QUESTOES_PARA_CONFIRMAR, linkIndicacao, textoIndicacao, usarMinhaIndicacao } from '../conta/indicacao'
import { href } from '../util/rotas'
import { IconeWhatsapp } from './ConviteCompartilhar'
import { Icone } from './Icone'

/**
 * Indique e ganhe, na página inicial (temporada RPG): o mensageiro leva a
 * carta, o colega chega e o baú abre para os dois. Com conta, os botões já
 * mandam o link pessoal; sem conta, levam a criar a conta para pegar o link.
 */
export function SecaoIndique() {
  const { sessao } = usarConta()
  const { dados } = usarMinhaIndicacao(sessao?.user.id)
  const [copiado, definirCopiado] = useState(false)
  const link = dados ? linkIndicacao(dados.codigo) : ''

  async function copiar() {
    try { await navigator.clipboard.writeText(link) } catch { window.prompt('Copie o seu link:', link) }
    definirCopiado(true); window.setTimeout(() => definirCopiado(false), 2500)
  }

  return (
    <section className="ig" aria-labelledby="ig-titulo">
      <div className="ig__texto">
        <p className="ig__selo">Missão: recrute seus amigos</p>
        <h2 id="ig-titulo">Indique e ganhe <em>{DIAS_POR_AMIGO} dias grátis</em></h2>
        <p>O Orto Questões cresce no boca a boca. Chame um colega da residência: quando ele responder {QUESTOES_PARA_CONFIRMAR} questões, vocês dois ganham {DIAS_POR_AMIGO} dias do plano completo. Vale para até {LIMITE_AMIGOS} amigos.</p>
        {dados && dados.confirmados > 0 && <p className="ig__placar"><b>{dados.confirmados}</b> {dados.confirmados === 1 ? 'amigo confirmado' : 'amigos confirmados'} · <b>{dados.dias_ganhos}</b> dias ganhos</p>}
        <div className="ig__acoes">
          {dados ? <>
            <a className="ig__whatsapp" href={`https://wa.me/?text=${encodeURIComponent(textoIndicacao(dados.codigo))}`} target="_blank" rel="noopener noreferrer"><IconeWhatsapp tamanho={18} /> Chamar no WhatsApp</a>
            <button type="button" className="ig__copiar" onClick={() => void copiar()}><Icone nome={copiado ? 'certo' : 'link'} tamanho={16} /> {copiado ? 'Link copiado' : 'Copiar meu link'}</button>
            <a className="ig__mais" href={href('/indicar')}>Minhas indicações <Icone nome="direita" tamanho={14} /></a>
          </> : sessao
            ? <a className="botao botao--ouro" href={href('/indicar')}>Pegar meu link</a>
            : <a className="botao botao--ouro" href={href('/conta?modo=criar')}>Criar conta e pegar meu link</a>}
        </div>
      </div>
      <ol className="ig__trilha" aria-label="Como funciona">
        <li><img src={recurso('ranking/carta.png')} width={44} height={44} alt="" draggable={false} /><span>Você manda o link</span></li>
        <li><img src={recurso('ranking/mensageiro.png')} width={40} height={50} alt="" draggable={false} /><span>O colega responde {QUESTOES_PARA_CONFIRMAR} questões</span></li>
        <li><img src={recurso('pixel/planos.png')} width={48} height={48} alt="" draggable={false} /><span>Baú aberto: {DIAS_POR_AMIGO} dias para cada um</span></li>
      </ol>
    </section>
  )
}
