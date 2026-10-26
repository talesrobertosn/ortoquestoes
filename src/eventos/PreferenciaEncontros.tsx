import { useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { InterruptorLocal } from '../componentes/conta/PecasConta'
import { recurso } from '../config'
import { lerLembrancas } from './memoria'
import { usarEventosLigados } from './preferencias'
import './encontros.css'
export function PreferenciaEncontros() {
  const [ligados, definir] = usarEventosLigados()
  const { sessao } = usarConta()
  const id = sessao?.user.id ?? 'visitante'
  const [lembrancas, atualizar] = useState(() => lerLembrancas(id))
  useEffect(() => {
    const ler = () => atualizar(lerLembrancas(id))
    ler(); window.addEventListener('oq:eventos:lembrancas', ler); window.addEventListener('storage', ler)
    return () => { window.removeEventListener('oq:eventos:lembrancas', ler); window.removeEventListener('storage', ler) }
  }, [id])
  return <>
    <InterruptorLocal ligado={ligados} aoMudar={definir}>Receber pequenas visitas, surpresas e conquistas do dia durante o estudo</InterruptorLocal>
    <p className="encontros-preferencia__nota">Sem som e somem sozinhas. As visitas surpresa aparecem no máximo uma vez por hora; as conquistas do dia (10, 20, 50, 100 questões, acerto alto, acertos seguidos) aparecem na hora em que você bate a marca. Tudo espera o fim dos simulados e sessões cronometradas. Esta escolha vale neste aparelho.</p>
    {(lembrancas.selo || lembrancas.arquivo) && <div className="encontros-preferencia__lembrancas">
      {lembrancas.selo && <span><img src={recurso('eventos/selo.png')} alt="" width={32} height={32} /> Mão de cirurgião · lembrança local</span>}
      {ligados && lembrancas.arquivo && <button className="botao" type="button" onClick={() => window.dispatchEvent(new Event('oq:eventos:arquivo'))}>Arquivo do Preceptor</button>}
    </div>}
  </>
}
