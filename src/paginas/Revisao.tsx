import { useMemo, useState } from 'react'
import { usarIndice } from '../dados/usarIndice'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { planoRevisao, inicioDia, chaveDia, rotuloDia } from '../estado/planoRevisao'
import { usarSessao } from '../estado/sessao'
import { FILTROS_VAZIOS } from '../dados/tipos'
import { navegar } from '../util/rotas'
import { Icone, type NomeIcone } from '../componentes/Icone'

const DIA = 86400000

/**
 * O ciclo muda conforme o que a pessoa declarou ao responder. Quem acerta por
 * chute não aprendeu, e por isso a questão volta no dia seguinte; quem acerta
 * com certeza ganha o intervalo cheio. A regra estava só no código e nos
 * avisos que aparecem depois de responder — aqui ela fica visível antes.
 */
const ESCADAS: { rotulo: string; icone: NomeIcone; dias: number[]; nota: string; nivel: 1 | 2 | 3 }[] = [
  { rotulo: 'Foi um chute', icone: 'interrogacao', dias: [1, 3, 7, 14], nota: 'Volta já amanhã: acertar sem saber por quê não fixa nada.', nivel: 1 },
  { rotulo: 'Tinha dúvida', icone: 'olho', dias: [2, 5, 10, 21], nota: 'Volta antes do ciclo normal, para firmar o raciocínio.', nivel: 2 },
  { rotulo: 'Tinha certeza', icone: 'certo', dias: [3, 7, 14, 30], nota: 'Ciclo completo: o intervalo cresce porque o conceito está firme.', nivel: 3 },
]

export function Revisao() {
  const { indice, carregando } = usarIndice(); const { contexto } = usarContextoLocal(''); const { iniciar } = usarSessao()
  const [selecionado, definirSelecionado] = useState(inicioDia())
  const plano = useMemo(() => indice ? planoRevisao(indice, contexto.respondidas) : new Map(), [indice, contexto.respondidas])
  const hoje = inicioDia(); const dias = Array.from({ length: 28 }, (_, i) => hoje + i * DIA); const dia = plano.get(chaveDia(selecionado))
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
          <span className="escada__degraus">{e.dias.map(d => <em key={d}>{d}d</em>)}</span>
        </div>
        <small>{e.nota}</small>
      </div>)}</div>
      <p className="escada__regra"><strong>Errou?</strong> A questão entra em <em>Revisar hoje</em> e a escada recomeça do primeiro degrau. <strong>Quatro acertos espaçados</strong> marcam a questão como dominada e ela sai da fila.</p>
      {incertas > 0 && <div className="linha"><a className="botao botao--fantasma" href="#/treinar?situacao=incertas">Refazer as {incertas} que respondi com dúvida ou chute</a></div>}
    </section>
    <section className="cartao cartao__corpo"><div className="entre"><div><p className="meta">PRÓXIMOS 28 DIAS</p><h2>Calendário de carga</h2></div><p className="meta">Cor = urgência · toque em um dia</p></div><div className="calendario" role="grid" aria-label="Calendário de revisões">{dias.map(data => { const d=plano.get(chaveDia(data)); const carga=d?.ids.length ?? 0; const classe=d?.atrasadas ? 'calendario__dia--atrasado' : carga > 20 ? 'calendario__dia--alto' : carga > 0 ? 'calendario__dia--leve' : ''; return <button key={data} type="button" className={`calendario__dia ${classe} ${selecionado===data?'calendario__dia--selecionado':''}`} onClick={()=>definirSelecionado(data)}><span>{new Intl.DateTimeFormat('pt-BR',{weekday:'short'}).format(data).replace('.','')}</span><strong>{new Date(data).getDate()}</strong><small>{carga || '—'}</small></button> })}</div></section>
    <section className="cartao cartao__corpo revisao-detalhe"><p className="meta">{rotuloDia(selecionado)}</p><h2>{dia?.ids.length ? `${dia.ids.length} questões programadas` : 'Nenhuma revisão programada'}</h2>{dia?.ids.length ? <><p>{dia.atrasadas ? `${dia.atrasadas} vencidas foram trazidas para hoje. ` : ''}Acerto histórico: {dia.tentativas ? Math.round(dia.acertos/dia.tentativas*100) : 0}%.</p><div className="chips">{[...dia.temas.entries()].sort((a,b)=>b[1]-a[1]).map(([tema,n])=><span key={tema}>{tema} · {n}</span>)}</div><div className="linha"><button className="botao botao--principal" onClick={()=>iniciarIds(dia.ids)}>Revisar este dia</button><button className="botao" onClick={()=>iniciarIds(dia.ids.slice(0,10))}>Dia leve · 10</button></div></> : <p className="texto-2">Escolha outro dia no calendário ou avance com novas questões.</p>}</section>
  </div>
}

