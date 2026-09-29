import { useEffect, useMemo, useState } from 'react'
import { usarPremium } from '../conta/premium'
import { chamarRpc } from '../servicos/supabase'
import { usarIndice } from '../dados/usarIndice'
import { TOP_ASSUNTOS, areaPorId } from '../dados/incidencia'
import { calcularPlano, type PlanoSalvo } from '../dados/planoEstudo'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { href } from '../util/rotas'
import { Icone } from './Icone'
import { Degustacao, SeloAssinante } from './Premium'
import { NivelCobranca } from './NivelCobranca'

/** Início: as duas caixas do assinante, lado a lado. Quem não assina vê o começo. */
export function CaixasAssinante() {
  return (
    <div className="cx-duas">
      <CaixaTemas />
      <CaixaCronograma />
    </div>
  )
}

function CaixaTemas() {
  const { premium } = usarPremium()
  const visiveis = premium ? 5 : 2
  return (
    <section className="cx cx--temas" aria-labelledby="cx-temas-titulo">
      <header className="cx__cabeca">
        <span className="cx__icone" aria-hidden="true"><Icone nome="fogo" tamanho={20} /></span>
        <div>
          <p className="meta">TEMAS QUE MAIS CAEM</p>
          <h2 id="cx-temas-titulo">O que a prova mais cobra</h2>
        </div>
        {!premium && <SeloAssinante />}
      </header>
      <ol className="cx-top">
        {TOP_ASSUNTOS.slice(0, visiveis).map((t, i) => (
          <li key={`${t.area}-${t.nome}`}>
            <span className="cx-top__posicao numerico">{i + 1}</span>
            <span className="cx-top__nome"><strong>{t.rotulo}</strong><small>{areaPorId(t.area)?.nome}</small></span>
            <NivelCobranca nivel={4} />
          </li>
        ))}
      </ol>
      {!premium && (
        <Degustacao className="dg--compacta" titulo="Os outros 18 assuntos e as 12 áreas" acao="Ver o ranking completo">
          <ol className="cx-top">
            {['Assunto guardado para assinantes', 'Outro assunto do ranking', 'Mais um assunto campeão'].map((nome, i) => (
              <li key={nome}><span className="cx-top__posicao numerico">{visiveis + i + 1}</span><span className="cx-top__nome"><strong>{nome}</strong><small>Área</small></span><NivelCobranca nivel={4} /></li>
            ))}
          </ol>
        </Degustacao>
      )}
      <a className="cx__link" href={href('/temas-que-mais-caem')}>{premium ? 'Ver o ranking completo e treinar' : 'Abrir o ranking'} <Icone nome="direita" tamanho={15} /></a>
    </section>
  )
}

function CaixaCronograma() {
  const { premium, logado } = usarPremium()
  const { indice } = usarIndice()
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [plano, definirPlano] = useState<PlanoSalvo | null | undefined>(undefined)

  useEffect(() => {
    if (!premium) { definirPlano(null); return }
    let vivo = true
    chamarRpc<PlanoSalvo[]>('obter_plano_estudo', {}).then(([p]) => { if (vivo) definirPlano(p ?? null) }).catch(() => { if (vivo) definirPlano(null) })
    return () => { vivo = false }
  }, [premium])
  const calculo = useMemo(() => (indice && plano ? calcularPlano(indice, respondidas, plano) : null), [indice, plano, respondidas])

  const cabeca = (
    <header className="cx__cabeca">
      <span className="cx__icone cx__icone--verde" aria-hidden="true"><Icone nome="rota" tamanho={20} /></span>
      <div>
        <p className="meta">CRONOGRAMA</p>
        <h2 id="cx-crono-titulo">{calculo ? (calculo.provaPassou ? 'A prova chegou' : `Faltam ${calculo.diasAteProva} dias`) : 'Seu estudo até a prova'}</h2>
      </div>
      {!premium && <SeloAssinante />}
    </header>
  )

  // Assinante com cronograma: o dia de hoje.
  if (premium && calculo) {
    const pct = calculo.metaDiaria ? Math.min(100, Math.round((calculo.feitasHoje / calculo.metaDiaria) * 100)) : 100
    return (
      <section className="cx cx--crono" aria-labelledby="cx-crono-titulo">
        {cabeca}
        <div className="cx-meta">
          <div><strong className="numerico">{calculo.feitasHoje}</strong><span>de {calculo.metaDiaria} hoje</span></div>
          <span className="cx-meta__barra"><span style={{ width: `${pct}%` }} /></span>
        </div>
        <p className="cx__texto">{calculo.naRetaFinal ? 'Reta final: erros, dúvidas e simulado.' : calculo.hoje ? <>Hoje: <strong>{calculo.hoje.nome}</strong>{calculo.hoje.focos[0] ? `, começando por ${calculo.hoje.focos[0].toLowerCase()}` : ''}.</> : 'Meta de hoje cumprida. Bom trabalho!'}</p>
        <a className="botao botao--principal cx__botao" href={href('/cronograma')}>{calculo.hoje && calculo.faltaHoje ? 'Continuar o cronograma' : 'Abrir o cronograma'}</a>
      </section>
    )
  }

  // Assinante sem cronograma ainda.
  if (premium) {
    return (
      <section className="cx cx--crono" aria-labelledby="cx-crono-titulo">
        {cabeca}
        <p className="cx__texto">Três perguntas e ele fica pronto, com a meta de cada dia e os temas de cada semana, começando pelo que mais cai.</p>
        <ol className="cx-passos">
          <li><span className="numerico">1</span>Data da prova</li>
          <li><span className="numerico">2</span>Intensidade: leve, firme ou completo</li>
          <li><span className="numerico">3</span>Dias de folga</li>
        </ol>
        <a className="botao botao--principal cx__botao" href={href('/cronograma')}>Montar meu cronograma</a>
      </section>
    )
  }

  // Quem não assina: um exemplo, e a prévia do próprio cronograma na página.
  return (
    <section className="cx cx--crono" aria-labelledby="cx-crono-titulo">
      {cabeca}
      <div className="cx-exemplo" aria-label="Exemplo de cronograma">
        <span className="cx-exemplo__selo">Exemplo</span>
        <div className="cx-meta"><div><strong className="numerico">45</strong><span>questões hoje · faltam 87 dias</span></div><span className="cx-meta__barra"><span style={{ width: '40%' }} /></span></div>
        <ol className="cx-semanas">
          <li><b>Esta semana</b><span>Trauma adulto</span></li>
          <li><b>Próxima</b><span>Ombro e cotovelo</span></li>
          <li className="cx-semanas__oculta"><b>Depois</b><span>Guardado</span></li>
        </ol>
      </div>
      <p className="cx__texto">Coloque a data da sua prova e veja a prévia do seu cronograma, montado pelo que mais cai.</p>
      <a className="botao botao--ouro cx__botao" href={href(logado ? '/cronograma' : '/conta?modo=entrar')}>{logado ? 'Ver o meu cronograma' : 'Entrar e ver o meu'}</a>
    </section>
  )
}
