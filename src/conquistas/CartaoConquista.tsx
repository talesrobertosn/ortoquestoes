import type { CSSProperties } from 'react'
import { FAMILIAS, type Emblema } from '../estado/conquistas'
import { Medalha } from '../componentes/Medalha'
import { recurso } from '../config'
import { href } from '../util/rotas'
import { CENARIOS_AVISOS, perfilDoEmblema } from './catalogoAvisos'
import type { MetaProxima } from './motorAvisos'
import './avisos.css'

export type AvisoConquista = { tipo: 'ganha'; emblema: Emblema; outras: number } | { tipo: 'perto'; emblema: Emblema; meta: MetaProxima }
const METAIS = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro', esmeralda: 'Esmeralda', lendario: 'Lendário', mitico: 'Mítico' }

/** Mesmo componente no site e nas prévias: a expectativa nunca reutiliza a medalha da comemoração. */
export function CartaoConquista({ aviso, fechar, saindo = false }: { aviso: AvisoConquista; fechar: () => void; saindo?: boolean }) {
  const { emblema: e, tipo } = aviso
  const perfil = perfilDoEmblema(e), cenario = CENARIOS_AVISOS[perfil.cenario]
  const familia = FAMILIAS.find(f => f.id === e.familia)!.titulo
  const outras = tipo === 'ganha' && aviso.outras ? ` E mais ${aviso.outras} ${aviso.outras === 1 ? 'conquista' : 'conquistas'}.` : ''
  const texto = tipo === 'ganha' ? e.descricao + outras : `Continue firme: ${aviso.meta.falta === 1 ? 'falta' : 'faltam'} ${aviso.meta.texto} para conquistar ${e.rotulo}.`
  const titulo = tipo === 'ganha' ? e.rotulo : cenario.chamada
  return <aside className={`nc nc--${tipo} nc--${e.nivel}${saindo ? ' nc--saindo' : ''}`} data-cenario={perfil.cenario} aria-label={`${tipo === 'ganha' ? 'Conquista desbloqueada' : 'Próxima conquista'}: ${e.rotulo}. ${texto}`}>
    <button type="button" className="nc__fechar" aria-label="Dispensar aviso de conquista" onClick={fechar}>×</button>
    <p className="nc__etiqueta">{tipo === 'ganha' ? 'Conquista desbloqueada' : 'Recompensa à vista'}</p>
    <div className="nc__miolo">
      <div className="nc__arte" aria-hidden="true">
        {tipo === 'ganha' ? <><span className="nc__raios" /><span className="nc__halo" /><Medalha conquista={e} tamanho={96} />{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--angulo': `${i * 30}deg`, '--atraso': `${i % 3 * .07}s` } as CSSProperties} />)}</> : <><img src={recurso(`conquistas/expectativa/${cenario.arte}.png`)} width={96} height={96} alt="" draggable={false} /><i /><i /><i /></>}
      </div>
      <div className="nc__mensagem"><strong className="nc__titulo">{titulo}</strong><p className="nc__texto">{texto}</p></div>
    </div>
    {tipo === 'perto' && <>
      <div className="nc__conta"><span>{familia}</span><span><strong>{aviso.meta.valor.toLocaleString('pt-BR')}</strong> / {e.minimo.toLocaleString('pt-BR')}</span></div>
      <div className="nc__trilho" role="progressbar" aria-label={`Progresso para ${e.rotulo}`} aria-valuenow={aviso.meta.valor} aria-valuemin={0} aria-valuemax={e.minimo}><div className="nc__barra" style={{ width: `${Math.min(100, aviso.meta.valor / e.minimo * 100)}%` }} /></div>
    </>}
    <div className="nc__rodape"><span className="nc__metal"><b>{METAIS[e.nivel]}</b> · {familia}</span><a className="nc__link" href={href(`/conquistas?conquista=${e.id}`)} onClick={fechar}>{tipo === 'ganha' ? 'Ver no inventário' : 'Ver conquista'} <span aria-hidden="true">→</span></a></div>
    <a className="nc__toque" href={href(`/conquistas?conquista=${e.id}`)} onClick={fechar} aria-label={`Ver ${e.rotulo} no inventário`} />
    {tipo === 'ganha' && <span className="nc__tempo" aria-hidden="true" />}
  </aside>
}
