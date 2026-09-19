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
  if (dias >= 330) return `${Math.round(dias / 365)}a`
  if (dias >= 60) return `${Math.round(dias / 30)}m`
  return `${dias}d`
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * O ciclo muda conforme o que a pessoa declarou ao responder. Quem acerta por
 * chute não aprendeu, e por isso a questão volta no dia seguinte; quem acerta
 * com certeza ganha o intervalo cheio, que segue crescendo por meses — ela
 * não se dá por "resolvida" tão cedo. Os degraus vêm de INTERVALOS, para a
 * escada nunca ficar desatualizada em relação à regra de verdade.
 */
const ESCADAS: { rotulo: string; icone: NomeIcone; dias: number[]; nota: string; nivel: 1 | 2 | 3 }[] = [
  { rotulo: 'Foi um chute', icone: 'interrogacao', dias: INTERVALOS.chute, nota: 'Volta já amanhã: acertar sem saber por quê não fixa nada.', nivel: 1 },
  { rotulo: 'Tinha dúvida', icone: 'olho', dias: INTERVALOS.duvida, nota: 'Volta antes do ciclo normal, para firmar o raciocínio.', nivel: 2 },
  { rotulo: 'Tinha certeza', icone: 'certo', dias: INTERVALOS.seguro, nota: 'O intervalo cresce por meses: revisões raras e espaçadas mantêm o que já está firme.', nivel: 3 },
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
  return <div className="empilha-2 revisao-premium">
    <section className="revisao-heroi">
      <p className="meta">CENTRAL DE REVISÃO</p>
      <h1>{atrasadas ? `${atrasadas} revisões precisam de você hoje` : 'Seu caminho de revisão está em dia'}</h1>
      <p>{pendentes ? `${pendentes} questões estão planejadas para as próximas semanas. Comece pequeno e mantenha a sequência.` : 'Responda questões para construir seu calendário personalizado.'}</p>
      <div className="linha linha--empilha-celular">
        <button className="botao botao--principal botao--grande" onClick={() => iniciarIds(idsHoje.slice(0, 10))} disabled={!idsHoje.length}>Revisar agora{idsHoje.length ? ` · ${Math.min(10, idsHoje.length)}` : ''}</button>
        {idsHoje.length > 10 && <button className="botao botao--fantasma" onClick={() => iniciarIds(idsHoje)}>Revisar tudo de hoje · {idsHoje.length}</button>}
      </div>
    </section>
    <section className="numeros"><div className="numeros__celula"><b className="numeros__valor">{pendentes}</b><span className="numeros__rotulo">revisões planejadas</span></div><div className="numeros__celula"><b className="numeros__valor">{atrasadas}</b><span className="numeros__rotulo">atrasadas</span></div><div className="numeros__celula"><b className="numeros__valor">{temaFragil?.[0] ?? '—'}</b><span className="numeros__rotulo">foco com mais revisões</span></div></section>
    <section className="cartao cartao__corpo">
      <p className="meta">COMO A FILA É MONTADA</p>
      <h2>Chute e dúvida voltam mais cedo</h2>
      <p>Ao responder, você diz se tinha certeza, se tinha dúvida ou se foi um chute. Essa escolha decide quando a questão reaparece — não basta acertar.</p>
      <div className="escada">{ESCADAS.map(e => <div key={e.rotulo} className={`escada__linha escada__linha--nivel${e.nivel}`}>
        <div className="escada__topo">
          <span className="escada__icone"><Icone nome={e.icone} tamanho={18} /></span>
          <strong>{e.rotulo}</strong>
          <span className="escada__degraus">{e.dias.map(d => <em key={d}>{rotuloIntervalo(d)}</em>)}</span>
        </div>
        <small>{e.nota}</small>
      </div>)}</div>
      <p className="escada__regra"><strong>Errou?</strong> A questão entra em <em>Revisar hoje</em> e a escada recomeça do primeiro degrau. Chute e dúvida saem da fila com <strong>quatro acertos espaçados</strong>; certeza continua voltando, cada vez mais espaçada, até completar o ciclo de um ano.</p>
      {incertas > 0 && <div className="linha"><a className="botao botao--fantasma" href="#/treinar?situacao=incertas">Refazer as {incertas} que respondi com dúvida ou chute</a></div>}
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
