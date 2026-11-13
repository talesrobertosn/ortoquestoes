import { useMemo } from 'react'
import { usarArmazenado } from '../../estado/usarArmazenado'
import { revisarHoje } from '../../estado/revisao'
import { FLASHCARDS_LIBERADO } from '../../config'
import { CHAVE_REGISTROS, type RegistroFlashcard } from '../../flashcards/progresso'
import { minutosPara } from '../../estado/metasRevisao'
import { href } from '../../util/rotas'
import { Icone } from '../Icone'
import { Medalha } from '../Medalha'
import { usarConquistas } from '../../estado/usarConquistas'
import { EMBLEMAS, desbloqueado, valorDe, type FamiliaId } from '../../estado/conquistas'
export function FlashcardsDeHoje() {
  const [registros] = usarArmazenado<Record<string, Partial<RegistroFlashcard>>>(CHAVE_REGISTROS, {})
  const [escondido, definirEscondido] = usarArmazenado<boolean>('revisao:esconder-flashcards', false)
  const hoje = useMemo(() => Object.values(registros ?? {}).filter((r) => revisarHoje(r)).length, [registros])
  if (!FLASHCARDS_LIBERADO) return null
  if (escondido) return <p className="rvx-fc-oculto"><button type="button" className="rvx-fc-oculto__botao" onClick={() => definirEscondido(false)}><Icone nome="raio" tamanho={14} /> Mostrar os flashcards de hoje</button></p>
  const destino = hoje ? '/flashcards/biblioteca?categoria=pendentes&n=' + Math.min(hoje, 50) : '/flashcards'
  return <section className="rvx-fc" aria-label="Flashcards de hoje">
    <span className="rvx-fc__icone"><Icone nome="raio" tamanho={22} /></span>
    <div className="rvx-fc__texto">
      <p className="rvx-fc__titulo">Flashcards de hoje <span className="selo-beta">Beta</span></p>
      <p>{hoje ? <><b className="numerico">{hoje}</b> {hoje === 1 ? 'flashcard vence' : 'flashcards vencem'} hoje · ~{minutosPara(Math.ceil(hoje / 2))} min. A fila deles é separada da das questões.</> : 'Nenhum flashcard vence hoje. A fila deles é separada da das questões.'}</p>
    </div>
    <div className="rvx-fc__acoes">
      <a className="botao" href={href(destino)}>{hoje ? 'Revisar flashcards' : 'Abrir Flashcards'}</a>
      <button type="button" className="botao-icone" onClick={() => definirEscondido(true)} aria-label="Esconder os flashcards desta página" title="Esconder"><Icone nome="fechar" tamanho={16} /></button>
    </div>
  </section>
}

export function ConquistasRevisao() {
 const { metricas }=usarConquistas()
 const familias:Array<{familia:FamiliaId;titulo:string}>=[{familia:'constancia',titulo:'Constância'},{familia:'revisoes',titulo:'Revisões feitas'},{familia:'resgate',titulo:'Resgate de atrasadas'},{familia:'filaZerada',titulo:'Fila zerada'}]
 return <details className="rp-folha rp-conquistas"><summary>Suas conquistas de revisão <span>Pequenos passos também contam</span></summary><ul className="rp-conquistas__lista">{familias.map(({familia,titulo})=>{const lista=EMBLEMAS.filter(e=>e.familia===familia),proxima=lista.find(e=>!desbloqueado(e,metricas)),alvo=proxima??lista[lista.length-1];if(!alvo)return null;const valor=Math.min(valorDe(alvo,metricas),alvo.minimo);return <li key={familia}><Medalha conquista={alvo} tamanho={52}/><div><small>{titulo}</small><strong>{alvo.rotulo}</strong><span>{alvo.descricao}</span><progress value={valor} max={alvo.minimo} aria-label={alvo.rotulo}/><small>{valor.toLocaleString('pt-BR')} / {alvo.minimo.toLocaleString('pt-BR')}</small></div></li>})}</ul><a href={href('/conquistas')}>Ver todas as conquistas</a></details>
}
