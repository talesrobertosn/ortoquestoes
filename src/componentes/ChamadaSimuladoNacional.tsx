import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { snDestaqueInicio, snInscrever, type DestaqueInicioSN } from '../dados/apiSimuladoNacional'
import { contagem, dataDaEdicao, estadoDaChamada, nomeDaEdicao, tempoCurto } from '../dados/provaNacional'
import { esquecerEdicaoEmDestaque, usarNacionalAbertoATodos } from '../dados/nacionalEmDestaque'
import { usarArmazenado } from '../estado/usarArmazenado'
import { CHAVE_SESSAO } from '../estado/sessao'
import type { EstadoSessao } from '../dados/tipos'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { IconePixel } from './IconePixel'
import '../estilos/componentes/ChamadaSimuladoNacional.css'

/**
 * O cartão do Simulado Nacional na página inicial (pedido do Tales: "faz um botão para ele também
 * na página inicial"), alimentado por sn_destaque_inicio: aparece quando a edição está aberta ou
 * abre em até 7 dias, para visitantes também. Um botão só, conforme o momento da pessoa.
 */
export function ChamadaSimuladoNacional() {
  const { sessao: conta } = usarConta()
  const logado = !!conta
  const [destaque, definirDestaque] = useState<DestaqueInicioSN | null>(null)
  const [ocupado, definirOcupado] = useState(false)
  const [falhou, definirFalhou] = useState(false)
  const [sessaoLocal] = usarArmazenado<EstadoSessao | null>(CHAVE_SESSAO, null)
  const [agora, definirAgora] = useState(() => Date.now())
  const abertoATodos = usarNacionalAbertoATodos()
  useEffect(() => {
    let vivo = true
    snDestaqueInicio({ logado }).then((d) => { if (vivo) definirDestaque(d ?? null) }).catch(() => { if (vivo) definirDestaque(null) })
    const t = window.setInterval(() => definirAgora(Date.now()), 30_000)
    return () => { vivo = false; window.clearInterval(t) }
  }, [logado])
  if (!destaque) return null

  const estado = estadoDaChamada(destaque, logado, agora)
  const abre = dataDaEdicao(destaque.abre_em), fecha = dataDaEdicao(destaque.fecha_em)
  const antes = agora < Date.parse(destaque.abre_em)
  const prazoLocal = sessaoLocal?.nacional === destaque.edicao && !sessaoLocal.concluidaEm ? sessaoLocal.prazoEm : undefined
  const restante = prazoLocal ? Math.max(0, Math.round((prazoLocal - agora) / 1000)) : null
  const duracao = destaque.duracao_min % 60 === 0 ? `${destaque.duracao_min / 60} horas` : `${destaque.duracao_min} minutos`

  async function inscrever() {
    if (!destaque || ocupado) return
    definirOcupado(true); definirFalhou(false)
    try {
      await snInscrever(destaque.edicao)
      definirDestaque({ ...destaque, inscrito: true })
      esquecerEdicaoEmDestaque()
    } catch { definirFalhou(true) } finally { definirOcupado(false) }
  }

  const titulo = estado === 'resultado' ? 'Seu resultado do Simulado Nacional está pronto'
    : estado === 'continuar' ? 'Sua prova do Simulado Nacional está em andamento'
    : antes ? `Simulado Nacional: abre ${abre.semana}, ${abre.data}, às ${abre.hora}`
    : `Simulado Nacional no ar até ${fecha.semana}, ${fecha.data}`
  const linha = antes
    ? `${destaque.total} questões oficiais do TEOT e do TARO · ${duracao} · ranking nacional. Abre em ${contagem(Date.parse(destaque.abre_em) - agora)}.`
    : `${destaque.total} questões oficiais do TEOT e do TARO · ${duracao} · ranking nacional. Comece quando quiser até ${fecha.hora} de ${fecha.semana}.`

  const botao = (() => {
    switch (estado) {
      case 'visitante': return <a className="botao cs-nac__botao" href={href('/conta?modo=criar&voltar=%2Fsimulado-nacional')}>Criar conta grátis e participar <Icone nome="direita" tamanho={16} /></a>
      case 'inscrever': return <button type="button" className="botao cs-nac__botao" onClick={() => void inscrever()} disabled={ocupado}>{ocupado ? 'Inscrevendo…' : 'Quero participar'} <Icone nome="certo" tamanho={16} /></button>
      case 'inscrito': return <a className="cs-nac__inscrito" href={href('/simulado-nacional')}><Icone nome="certo" tamanho={16} /> Inscrição feita: abre {abre.semana}, {abre.data}, às {abre.hora}</a>
      case 'comecar': return <a className="botao cs-nac__botao" href={href('/simulado-nacional')}>Começar a prova <Icone nome="direita" tamanho={16} /></a>
      case 'continuar': return <a className="botao cs-nac__botao" href={href(prazoLocal ? '/sessao' : '/simulado-nacional')}>Continuar a prova{restante !== null ? ` · ${tempoCurto(restante)} restantes` : ''} <Icone nome="direita" tamanho={16} /></a>
      case 'resultado': return <a className="botao cs-nac__botao" href={href('/simulado-nacional')}>Ver meu resultado <Icone nome="direita" tamanho={16} /></a>
    }
  })()

  return (
    <section className="cs-nac ip-entra" aria-labelledby="cs-nac-titulo">
      <span className="cs-nac__arte" aria-hidden="true"><IconePixel nome="simulado" tamanho={56} /></span>
      <div className="cs-nac__texto">
        <p className="cs-nac__selo">{nomeDaEdicao(destaque.titulo)}{abertoATodos ? ' · aberto a todos com conta grátis' : ''}</p>
        <h2 id="cs-nac-titulo">{titulo}</h2>
        <p>{linha}</p>
        {falhou && <p className="cs-nac__erro" role="alert">Não foi possível confirmar a inscrição agora. Tente de novo.</p>}
      </div>
      <div className="cs-nac__acao">
        {botao}
        {estado !== 'inscrito' && <a className="cs-nac__mais" href={href('/simulado-nacional')}>Como funciona</a>}
      </div>
    </section>
  )
}
