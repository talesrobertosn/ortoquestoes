import { useEffect, useMemo, useState } from 'react'
import { calcularEstatisticas } from '../../flashcards/aprendizagem'
import type { RegistroFlashcard } from '../../flashcards/progresso'
import type { Flashcard } from '../../flashcards/tipos'
import { dominada, revisarHoje } from '../../estado/revisao'
import { EVENTO_DADOS, chaveCompleta } from '../../estado/armazenamento'
import { CHAVE_DIARIO } from '../../flashcards/aprendizagem'
import { href } from '../../util/rotas'

/** Só lê o acervo e o diário reais; não cria metas, histórico ou gravações. */
export function PanoramaFlashcards({ cartas, nomes, registros }: { cartas: Flashcard[] | null; nomes: Record<string,string>; registros: Record<string, RegistroFlashcard> }) {
  const [versao, definirVersao] = useState(0)
  useEffect(()=>{
    const mudou=(e:Event)=>{const chave=(e as CustomEvent<{chave?:string}>).detail?.chave;if(!chave||chave===CHAVE_DIARIO)definirVersao(v=>v+1)}
    const outraAba=(e:StorageEvent)=>{if(e.key===null||e.key===chaveCompleta(CHAVE_DIARIO))definirVersao(v=>v+1)}
    window.addEventListener(EVENTO_DADOS,mudou);window.addEventListener('storage',outraAba)
    return ()=>{window.removeEventListener(EVENTO_DADOS,mudou);window.removeEventListener('storage',outraAba)}
  },[])
  const est = useMemo(()=>cartas ? calcularEstatisticas(cartas,nomes,7) : null,[cartas,nomes,registros,versao])
  if (!cartas || !est) return <section className="fcn-panorama" aria-label="Seu aprendizado" aria-busy="true"><p role="status">Preparando seu panorama de estudo…</p></section>
  const validos = cartas.flatMap(c=>registros[c.id] ? [registros[c.id]] : [])
  const encerrados = validos.filter(dominada).length
  const pendentes = validos.filter(r=>!dominada(r) && revisarHoje(r)).length
  const programados = validos.length-encerrados-pendentes
  const novos = cartas.length-validos.length
  const faixas = [{n:novos,nome:'Nunca estudados',classe:'novos'},{n:pendentes,nome:'Para revisar',classe:'pendentes'},{n:programados,nome:'Agendados',classe:'agendados'},{n:encerrados,nome:'Ciclo completo',classe:'completos'}]
  const max=Math.max(1,...est.periodo.porDia.map(d=>d.revisoes))
  return <section className="fcn-panorama" aria-labelledby="fcn-panorama-titulo">
    <header className="fcn-secao"><div><p className="fcn-selo">CADA VOLTA CONSTRÓI MEMÓRIA</p><h2 id="fcn-panorama-titulo">Seu aprendizado, de perto.</h2></div><a href={href('/flashcards/desempenho')}>Explorar meus dados →</a></header>
    <div className="fcn-panorama__grade">
      <div className="fcn-cobertura"><h3>Seu caminho pelo acervo</h3><p><strong>{validos.length.toLocaleString('pt-BR')}</strong> de {cartas.length.toLocaleString('pt-BR')} flashcards estudados</p>
        <div className="fcn-distribuicao" role="img" aria-label={faixas.map(f=>`${f.nome}: ${f.n}`).join('. ')}>{faixas.filter(f=>f.n>0).map(f=><i key={f.classe} className={'fcn-cor--'+f.classe} style={{flex:f.n}} />)}</div>
        <dl className="fcn-faixas">{faixas.map(f=><div key={f.classe}><dt><i className={'fcn-cor--'+f.classe}/>{f.nome}</dt><dd>{f.n.toLocaleString('pt-BR')}</dd></div>)}</dl><p className="fcn-nota">Ciclo completo: terminou a escada de revisão. Isso não é garantia de domínio do assunto.</p>
      </div>
      <figure className="fcn-semana"><figcaption><div><h3>Seu estudo nesta semana</h3><p>Últimos 7 dias · respostas, incluindo repetições</p></div><strong>{est.periodo.revisoes.toLocaleString('pt-BR')}<small>respostas</small></strong></figcaption>
        <div className="fcn-semana__barras">{est.periodo.porDia.map(d=><div key={d.dia}><span className="fcn-semana__numero">{d.revisoes}</span><i style={{height:`${Math.max(2,d.revisoes/max*80)}px`}}/><small>{d.dia.slice(8)}/{d.dia.slice(5,7)}</small></div>)}</div>
        <p className="fcn-nota">{est.periodo.diasAtivos} de 7 dias com estudo. Biblioteca e Torneio contam juntos.</p>
        <details><summary>Ver os números da semana</summary><table><caption>Respostas por dia</caption><thead><tr><th>Data</th><th>Respostas</th><th>Acerto objetivo</th></tr></thead><tbody>{est.periodo.porDia.map(d=><tr key={d.dia}><th>{d.dia.split('-').reverse().join('/')}</th><td>{d.revisoes}</td><td>{d.objetivas ? `${Math.round(d.objetivasCertas/d.objetivas*100)}% (${d.objetivasCertas}/${d.objetivas})` : 'Sem respostas objetivas'}</td></tr>)}</tbody></table></details>
      </figure>
    </div>
  </section>
}
