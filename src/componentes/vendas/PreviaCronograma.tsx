import { useMemo, useState } from 'react'
import { Icone } from '../Icone'
import { href } from '../../util/rotas'
import { AREAS, BASE_CONTAGEM } from '../../dados/incidencia'
import { chaveDia } from '../../estado/limiteDiario'
import { diasAte, proximaProva, RITMOS_PLANOS as RITMOS } from '../../dados/ritmos'
import { numero } from '../../dados/vendas'

const FOLGAS: Array<[number, string]> = [[0, 'Todo dia'], [1, '1 folga'], [2, '2 folgas']]
/** Áreas contadas nas provas, da que mais cai para a que menos cai. */
const AREAS_CAEM = AREAS.flatMap((a) => (a.n ? [{ ...a, n: a.n }] : [])).sort((x, y) => y.n - x.n)

/**
 * Quanto do que cai é de cada prioridade, pela contagem das provas oficiais. Uma questão pode estar
 * em mais de um assunto, então vale a proporção (aplicada ao total contado), não a soma. Na tela só
 * aparecem semanas e porcentagens: o total da contagem não é mostrado (regra da marca).
 */
const PASSADAS_VENDA = (() => {
  const soma = { 4: 0, 3: 0, resto: 0 }
  for (const a of AREAS) for (const f of a.focos) { if (f.nivel === 4) soma[4] += f.n ?? 0; else if (f.nivel === 3) soma[3] += f.n ?? 0; else soma.resto += f.n ?? 0 }
  const total = soma[4] + soma[3] + soma.resto || 1
  const p1 = Math.round((BASE_CONTAGEM * soma[4]) / total), p2 = Math.round((BASE_CONTAGEM * soma[3]) / total)
  return [
    { nome: '1ª passada', texto: 'Prioridade máxima de todas as áreas', n: p1 },
    { nome: '2ª passada', texto: 'Prioridade alta', n: p2 },
    { nome: '3ª passada', texto: 'Prioridade média e baixa', n: Math.max(0, BASE_CONTAGEM - p1 - p2) },
  ]
})()

/**
 * A mesma lógica do cronograma de verdade, sem o histórico da pessoa: escolha o
 * ritmo, a data e as folgas e veja as três passadas pelo que mais cai (com as
 * semanas de cada uma), a reta final e como fica um dia do plano. É o presente
 * da página: dá para planejar o estudo aqui mesmo, sem assinar.
 */
export function PreviaCronograma({ conta }: { conta: boolean }) {
  const [ritmo, definirRitmo] = useState(25)
  const [folgas, definirFolgas] = useState(1)
  const [prova, definirProva] = useState(proximaProva)
  const corridos = diasAte(prova)
  const semanas = Math.max(1, Math.ceil(corridos / 7))
  // Reta final: duas semanas (revisão forte e modo prova) com 6 semanas ou mais; uma com 3 a 5.
  const reta = semanas >= 6 ? 2 : semanas >= 3 ? 1 : 0
  const semanasEstudo = Math.max(1, semanas - reta)
  const porSemana = ritmo * (7 - folgas)
  const total = porSemana * semanasEstudo
  const minutos = Math.round(ritmo * 1.5)
  const dataCurta = new Date(`${prova}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace('.', '')

  // As passadas, em sequência: cada uma ocupa as semanas que o ritmo pede, até a reta final.
  const passadas = useMemo(() => {
    let usado = 0
    return PASSADAS_VENDA.map((p) => {
      const cabe = Math.max(0, Math.min(p.n, total - usado))
      const de = Math.floor(usado / porSemana) + 1
      usado += cabe
      const ate = Math.max(de, Math.ceil(usado / porSemana))
      return { ...p, cabe, de: Math.min(de, semanasEstudo), ate: Math.min(ate, semanasEstudo), pct: p.n ? Math.round((cabe / p.n) * 100) : 0 }
    })
  }, [total, porSemana, semanasEstudo])
  const semanaTexto = (de: number, ate: number) => de === ate ? `Semana ${de}` : `Semanas ${de} a ${ate}`
  const [a1, a2] = AREAS_CAEM
  const mistura = Math.round(ritmo * 0.3)

  return (
    <div className="vd-previa" data-revelar>
      <div className="vd-previa__topo">
        <p className="vd-previa__presente"><Icone nome="alvo" tamanho={15} /> Experimente agora, sem assinar</p>
        <h3>Monte o seu em 10 segundos</h3>
        <p>Mexa nos botões: a conta usa a mesma lógica do cronograma de verdade.</p>
      </div>
      <div className="vd-previa__painel">
        <div className="vd-controles">
          <fieldset>
            <legend>Questões por dia</legend>
            <div className="vd-chips">
              {RITMOS.map(([n, tempo]) => <button key={n} type="button" aria-pressed={ritmo === n} onClick={() => definirRitmo(n)}><strong>{n}</strong><small>{tempo}</small></button>)}
            </div>
          </fieldset>
          <fieldset>
            <legend>Dias de folga por semana</legend>
            <div className="vd-chips vd-chips--texto">
              {FOLGAS.map(([n, rotulo]) => <button key={n} type="button" aria-pressed={folgas === n} onClick={() => definirFolgas(n)}>{rotulo}</button>)}
            </div>
          </fieldset>
          <label className="vd-data"><span>Data da prova</span><input type="date" value={prova} min={chaveDia()} onChange={(e) => e.target.value && definirProva(e.target.value)} /></label>
          <dl className="vd-placar">
            <div><dt>Até a prova</dt><dd>{numero(corridos)}<small> dias</small></dd></div>
            <div><dt>Por dia</dt><dd>{minutos}<small> min</small></dd></div>
            <div className="vd-placar__grande"><dt>Questões feitas até {dataCurta}</dt><dd>{numero(total)}</dd></div>
          </dl>
        </div>

        <div className="vd-previa__plano">
          <ol className="vd-fases" aria-label="Passadas do cronograma">
            {passadas.map((p, i) => (
              <li key={p.nome} className={'vd-fase' + (p.cabe === 0 ? ' vd-fase--fechada' : '')} style={{ ['--fatia' as string]: `${p.pct ? Math.max(6, p.pct) : 0}%` }}>
                <span className="vd-fase__num">{i + 1}</span>
                <div className="vd-fase__corpo">
                  <p className="vd-fase__topo"><strong>{p.nome} · {p.texto}</strong><small>{p.cabe ? semanaTexto(p.de, p.ate) : 'Não cabe neste ritmo'}</small></p>
                  <span className="vd-fase__barra" aria-hidden="true"><i /></span>
                  {i === 0 && <p className="vd-fase__focos">Começa por {AREAS_CAEM.slice(0, 3).map((a) => a.nome.toLowerCase()).join(', ')} e passa por todas as áreas, em blocos de 3 dias</p>}
                </div>
                <span className="vd-fase__qtd">{p.pct >= 100 ? 'completa' : `${p.pct}%`}</span>
              </li>
            ))}
            {reta > 1 && <li className="vd-fase vd-fase--reta">
              <span className="vd-fase__num"><Icone nome="reiniciar" tamanho={16} /></span>
              <div className="vd-fase__corpo"><p className="vd-fase__topo"><strong>Reta final · revisão forte</strong><small>Semana {semanas - 1}</small></p><p className="vd-fase__focos">Seus erros, dúvidas e os assuntos que mais caem, uma fatia da prova por dia.</p></div>
            </li>}
            {reta > 0 && <li className="vd-fase vd-fase--reta">
              <span className="vd-fase__num"><Icone nome="bandeira" tamanho={16} /></span>
              <div className="vd-fase__corpo"><p className="vd-fase__topo"><strong>Reta final · modo prova</strong><small>Semana {semanas}</small></p><p className="vd-fase__focos">Simulado cronometrado, os erros que importam e o resumão. Véspera leve.</p></div>
            </li>}
          </ol>

          {a1 && a2 && <div className="vd-dia" aria-label="Um dia do cronograma">
            <p className="vd-dia__rotulo">Um dia do cronograma</p>
            <ol>
              <li><span>1</span><div><strong>Resumão do tema</strong><small>As frases "Na prova" de {a1.nome.toLowerCase()}</small></div><em>4 min</em></li>
              <li><span>2</span><div><strong>{ritmo} questões novas</strong><small>{ritmo - mistura} de {a1.nome.toLowerCase()} e {mistura} de {a2.nome.toLowerCase()} para misturar</small></div><em>~{minutos} min</em></li>
              <li><span>3</span><div><strong>Revisões do dia</strong><small>Erros e dúvidas que voltam no tempo certo</small></div><em>à parte</em></li>
            </ol>
          </div>}
        </div>
      </div>
      <div className="vd-previa__rodape">
        <p>No cronograma de verdade, o diagnóstico calibra o plano no primeiro dia e as áreas em que você está abaixo da média ganham mais espaço.</p>
        <a className="botao vd-botao-contorno" href={href(conta ? '/cronograma' : '/conta?modo=criar&voltar=%2Fcronograma')}>{conta ? 'Ver o cronograma com o meu histórico' : 'Criar conta grátis e ver o meu'} <Icone nome="direita" tamanho={15} /></a>
      </div>
    </div>
  )
}
