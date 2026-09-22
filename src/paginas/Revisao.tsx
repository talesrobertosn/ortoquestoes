import { useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { planoRevisao, inicioDia, chaveDia, rotuloDia, JANELA_REVISAO_DIAS } from '../estado/planoRevisao'
import { usarSessao } from '../estado/sessao'
import { FILTROS_VAZIOS } from '../dados/tipos'
import { navegar } from '../util/rotas'
import { INTERVALOS } from '../estado/revisao'
import { Icone, type NomeIcone } from '../componentes/Icone'

const DIA = 86400000
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const FORMATO_MES = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })

/** "90d" fica ilegível — a partir de 2 meses o rótulo passa a ser em meses/anos. */
function rotuloIntervalo(dias: number): string {
  if (dias >= 330) return `${Math.round(dias / 365)} ano`
  if (dias >= 60) return `${Math.round(dias / 30)} meses`
  return `${dias}d`
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Os degraus vêm de INTERVALOS, para a explicação nunca divergir da regra real. */
const ESCADAS: { rotulo: string; icone: NomeIcone; dias: number[]; nota: string; nivel: 1 | 2 | 3 }[] = [
  { rotulo: 'Chute', icone: 'interrogacao', dias: INTERVALOS.chute, nota: 'Volta cedo', nivel: 1 },
  { rotulo: 'Dúvida', icone: 'olho', dias: INTERVALOS.duvida, nota: 'Espaça mais', nivel: 2 },
  { rotulo: 'Certeza', icone: 'certo', dias: INTERVALOS.seguro, nota: 'Espaça bastante', nivel: 3 },
]

function inicioMes(data: number): number { const d = new Date(data); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime() }

export function Revisao() {
  const { indice, carregando } = usarIndice(); const { contexto } = usarContextoLocal(''); const { iniciar } = usarSessao()
  const [selecionado, definirSelecionado] = useState(inicioDia())
  const [mesExibido, definirMesExibido] = useState(() => inicioMes(inicioDia()))
  const plano = useMemo(() => indice ? planoRevisao(indice, contexto.respondidas) : new Map(), [indice, contexto.respondidas])
  const hoje = inicioDia(); const dia = plano.get(chaveDia(selecionado))
  const mesAtual = inicioMes(hoje)
  const mesLimite = useMemo(() => inicioMes(hoje + JANELA_REVISAO_DIAS * DIA), [hoje])
  const celulasMes = useMemo(() => {
    const base = new Date(mesExibido); const ano = base.getFullYear(); const mes = base.getMonth()
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    const celulas: (number | null)[] = Array.from({ length: new Date(ano, mes, 1).getDay() }, () => null)
    for (let d = 1; d <= diasNoMes; d++) celulas.push(new Date(ano, mes, d).getTime())
    return celulas
  }, [mesExibido])
  const irParaMes = (delta: number) => definirMesExibido((atual) => { const d = new Date(atual); d.setMonth(d.getMonth() + delta); return d.getTime() })
  const pendentes = [...plano.values()].reduce((n, d) => n + d.ids.length, 0); const atrasadas = plano.get(chaveDia(hoje))?.atrasadas ?? 0
  const incertas = Object.values(contexto.respondidas).filter(r => r.confianca === 'duvida' || r.confianca === 'chute').length
  const iniciarIds = (ids: string[]) => { if (!indice || !ids.length) return; iniciar({ ...FILTROS_VAZIOS, limite: ids.length, embaralhar: true, situacao: 'revisarHoje' }, ids); navegar('/sessao') }
  if (carregando || !indice) return <div className="estado"><p>Preparando sua revisão…</p></div>
  const temaFragil = [...plano.values()].flatMap(d => [...d.temas.entries()]).sort((a,b)=>b[1]-a[1])[0]
  const idsHoje = plano.get(chaveDia(hoje))?.ids ?? []
  const hojeTotal = idsHoje.length
  return <div className="empilha-2 revisao-premium">
    <section className="rv-heroi">
      <div className="rv-heroi__principal">
        <p className="rv-heroi__sobrelinha"><Icone nome="calendario" tamanho={16} /> Revisão de hoje</p>
        {hojeTotal
          ? <h1><span className="rv-heroi__numero numerico">{hojeTotal}</span> {hojeTotal === 1 ? 'questão espera' : 'questões esperam'} por você</h1>
          : <h1>Tudo em dia por aqui</h1>}
        <p className="rv-heroi__texto">{hojeTotal ? (atrasadas ? `${atrasadas} vieram de dias anteriores. Comece com 10 e mantenha o ritmo.` : 'Uma sessão curta hoje já mantém a memória em dia.') : pendentes ? 'Nada vence hoje. Aproveite para avançar em questões novas.' : 'Responda questões e o seu calendário de revisão se monta sozinho.'}</p>
        <div className="linha linha--empilha-celular">
          {hojeTotal
            ? <button className="botao rv-heroi__acao" onClick={() => iniciarIds(idsHoje.slice(0, 10))}>Revisar agora · {Math.min(10, hojeTotal)}</button>
            : <a className="botao rv-heroi__acao" href="#/treinar">Treinar questões novas</a>}
          {hojeTotal > 10 && <button className="botao rv-heroi__secundaria" onClick={() => iniciarIds(idsHoje)}>Tudo de hoje · {hojeTotal}</button>}
        </div>
      </div>
      <dl className="rv-heroi__numeros">
        <div><dt>Planejadas</dt><dd className="numerico">{pendentes}</dd></div>
        <div><dt>Atrasadas</dt><dd className="numerico">{atrasadas}</dd></div>
        <div><dt>Mais revisões em</dt><dd className="rv-heroi__tema">{temaFragil?.[0] ?? 'nenhum tema'}</dd></div>
      </dl>
    </section>
    <section className="cartao cartao__corpo rv-regra">
      <div className="rv-regra__cabeca">
        <h2>Quando cada questão volta</h2>
        <p>Depende de como você respondeu. Acertou também na última revisão? Ela sai da fila.</p>
      </div>
      <div className="rv-escadas">{ESCADAS.map(e => <div key={e.rotulo} className={`rv-escada rv-escada--${e.nivel}`}>
        <div className="rv-escada__topo">
          <span className="rv-escada__icone"><Icone nome={e.icone} tamanho={16} /></span>
          <strong>{e.rotulo}</strong>
          <small>{e.nota}</small>
        </div>
        <ol className="rv-escada__trilha" aria-label={`Volta em ${e.dias.join(', ')} dias`}>{e.dias.map(d => <li key={d}><span aria-hidden="true" /><em>{rotuloIntervalo(d)}</em></li>)}</ol>
      </div>)}</div>
      <p className="rv-regra__erro"><Icone nome="reiniciar" tamanho={16} /> <span><strong>Errou?</strong> Ela volta hoje e o ciclo recomeça.</span></p>
      {incertas > 0 && <a className="rv-regra__link" href="#/treinar?situacao=incertas">Refazer as {incertas} que respondi com dúvida ou chute <Icone nome="direita" tamanho={16} /></a>}
      <a className="rv-regra__link" href="#/erros">Abrir meu caderno de erros <Icone nome="direita" tamanho={16} /></a>
    </section>
    <section className="cartao cartao__corpo">
      <div className="entre">
        <div><p className="meta">CALENDÁRIO DE CARGA</p><h2>{capitalizar(FORMATO_MES.format(mesExibido))}</h2></div>
        <div className="calendario__nav">
          <button type="button" className="botao-icone" onClick={() => irParaMes(-1)} disabled={mesExibido <= mesAtual} aria-label="Mês anterior"><Icone nome="esquerda" /></button>
          <button type="button" className="botao-icone" onClick={() => irParaMes(1)} disabled={mesExibido >= mesLimite} aria-label="Próximo mês"><Icone nome="direita" /></button>
        </div>
      </div>
      <p className="meta">Cor = urgência · toque em um dia</p>
      <div className="calendario__cabecalho">{DIAS_SEMANA.map(d => <span key={d}>{d}</span>)}</div>
      <div className="calendario" role="grid" aria-label="Calendário de revisões">
        {celulasMes.map((data, i) => {
          if (data === null) return <span key={`vazio-${i}`} className="calendario__vazio" aria-hidden="true" />
          const passado = data < hoje
          const d = plano.get(chaveDia(data)); const carga = d?.ids.length ?? 0
          const classe = passado ? 'calendario__dia--passado' : d?.atrasadas ? 'calendario__dia--atrasado' : carga > 20 ? 'calendario__dia--alto' : carga > 0 ? 'calendario__dia--leve' : ''
          return <button key={data} type="button" className={`calendario__dia ${classe} ${selecionado === data ? 'calendario__dia--selecionado' : ''}`} disabled={passado} onClick={() => definirSelecionado(data)}>
            <strong>{new Date(data).getDate()}</strong>
            <small>{passado ? '' : carga || '—'}</small>
          </button>
        })}
      </div>
    </section>
    <section className="cartao cartao__corpo revisao-detalhe"><p className="meta">{rotuloDia(selecionado)}</p><h2>{dia?.ids.length ? `${dia.ids.length} questões programadas` : 'Nenhuma revisão programada'}</h2>{dia?.ids.length ? <><p>{dia.atrasadas ? `${dia.atrasadas} vencidas foram trazidas para hoje. ` : ''}Acerto histórico: {dia.tentativas ? Math.round(dia.acertos/dia.tentativas*100) : 0}%.</p><div className="chips">{[...dia.temas.entries()].sort((a,b)=>b[1]-a[1]).map(([tema,n])=><span key={tema}>{tema} · {n}</span>)}</div><div className="linha"><button className="botao botao--principal" onClick={()=>iniciarIds(dia.ids)}>Revisar este dia</button><button className="botao" onClick={()=>iniciarIds(dia.ids.slice(0,10))}>Dia leve · 10</button></div></> : <p className="texto-2">Escolha outro dia no calendário ou avance com novas questões.</p>}</section>
  </div>
}
