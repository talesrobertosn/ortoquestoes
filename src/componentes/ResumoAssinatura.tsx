import { IconePixel } from './IconePixel'
import { Icone } from './Icone'
import { usarConta } from '../conta/ContextoConta'
import { href } from '../util/rotas'
import { A_PARTIR_DE } from '../dados/planos'
import { diaMes, JANELA_RENOVACAO_PIX } from '../conta/periodoPix'
import { dias, diasEntre } from '../conta/dias'
import { MENSAGENS_STATUS, dataBr, usarEstadoAssinatura } from '../conta/estadoAssinatura'

/**
 * O cartão "Minha assinatura" de Minha conta: plano, situação, quantos dias faltam e o atalho para
 * Dados da assinatura (/conta/assinatura), onde ficam renovação, ampliação, garantia e recibos.
 */
export function ResumoAssinatura() {
  const { sessao } = usarConta()
  const a = usarEstadoAssinatura(sessao)
  if (!sessao) return null
  const { estado } = a
  const descricao = MENSAGENS_STATUS[a.status]
  const statusExibido = a.pixAtivo ? 'Em dia · pago no Pix' : a.renovacaoDesligada ? 'Sem renovação automática' : descricao?.titulo ?? 'Sem assinatura'
  const planoVisivel = estado?.plano && a.comAcesso ? `Plano ${estado.plano}` : 'Plano gratuito'
  const restam = a.fimAcesso ? diasEntre(Date.now(), a.fimAcesso) : 0
  const podeAmpliar = a.comAcesso && (estado?.plano === 'mensal' || estado?.plano === 'semestral') && !a.renovacaoDesligada

  return <section className="ct-cartao ct-cartao--largo" aria-label="Minha assinatura">
    <header className="ct-cartao__cabeca"><div><h2>Minha assinatura</h2></div></header>
    {a.carregando ? <p role="status">Carregando assinatura…</p> : <>
      <dl className="conta-assinatura__dados conta-assinatura__dados--resumo">
        <div><dt>Plano</dt><dd>{planoVisivel}</dd></div>
        <div><dt>Status</dt><dd>{statusExibido}</dd></div>
        {a.comAcesso && a.fimAcesso && <div><dt>Dias de acesso</dt><dd>{dias(restam)} <small>· até {dataBr(a.fimAcesso)}</small></dd></div>}
      </dl>
      {a.fimPix && <p className="conta-renovacao__resumo conta-renovacao__resumo--pix">
        <span className="conta-renovacao__estado"><i aria-hidden="true" />Pix · sem cobrança automática</span>
        <span>Acesso até {diaMes(a.fimPix)}. {Date.now() >= a.fimPix - JANELA_RENOVACAO_PIX ? 'A renovação já está aberta, sem perder nenhum dia.' : `A renovação abre em ${diaMes(a.fimPix - JANELA_RENOVACAO_PIX)}, sem perder nenhum dia.`}</span>
        <a href={href(Date.now() >= a.fimPix - JANELA_RENOVACAO_PIX ? '/assinatura' : '/conta/assinatura')}>{Date.now() >= a.fimPix - JANELA_RENOVACAO_PIX ? 'Renovar (Pix ou cartão)' : 'Ver como funciona'}</a>
      </p>}
      {!a.fimPix && a.comAcesso && <p className={'conta-renovacao__resumo' + (a.renovacaoDesligada ? ' conta-renovacao__resumo--desligada' : '')}>
        <span className="conta-renovacao__estado"><i aria-hidden="true" />Renovação automática {a.renovacaoDesligada ? 'desligada' : 'ligada'}</span>
        <span>{a.renovacaoDesligada ? `Acesso até ${dataBr(estado?.fim_periodo)}, sem nova cobrança.` : `Próxima cobrança em ${dataBr(estado?.fim_periodo)}. Você pode desligar sem cancelar a assinatura.`}</span>
        {!a.renovacaoDesligada && <a href={href('/conta/assinatura')}>Gerenciar renovação</a>}
      </p>}
      {podeAmpliar && <p className="conta-renovacao__resumo conta-renovacao__resumo--ampliar">
        <span className="conta-renovacao__estado"><i aria-hidden="true" />Ampliar o plano</span>
        <span>Passe para um plano mais longo e pague menos por mês. Os {dias(restam)} que você tem continuam valendo.</span>
        <a href={href('/conta/assinatura?secao=ampliar')}>Ver quanto fica</a>
      </p>}
      {!a.comAcesso && <a className="inicio-planos-atalho ct-planos" href={href('/assinatura')}>
        <span className="inicio-planos-atalho__icone"><IconePixel nome="planos" tamanho={48} /></span>
        <span className="inicio-planos-atalho__texto"><strong>Conheça os planos</strong><em>a partir de {A_PARTIR_DE}/mês · Pix ou cartão</em><small>Cronograma pelo que mais cai, Simulado Nacional e questões sem limite.</small></span>
        <span className="inicio-planos-atalho__acao">Ver planos <Icone nome="direita" tamanho={16} /></span>
      </a>}
      <a className="conta-assinatura__detalhes-link" href={href('/conta/assinatura')}>Mais dados sobre minha assinatura <span aria-hidden="true">↗</span></a>
    </>}
    {a.falhou && <p role="status">Não foi possível consultar a assinatura agora. Atualize a página e tente novamente.</p>}
  </section>
}
