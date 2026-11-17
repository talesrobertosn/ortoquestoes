import { useState } from 'react'
import { CartaoConquista } from '../../conquistas/CartaoConquista'
import { EMBLEMAS, emblemaPorId } from '../../estado/conquistas'
import { CENARIOS_AVISOS, perfilDoEmblema, unidadeRestante } from '../../conquistas/catalogoAvisos'

/** Galeria de desenvolvimento: usa o cartão real e não grava progresso, filas ou conquistas. */
export default function PreviaConquistas() {
  const q = new URLSearchParams(location.hash.split('?')[1] ?? '')
  const [id, definirId] = useState(q.get('emblema') ?? 'questoes-1000')
  const [tipo, definirTipo] = useState(q.get('tipo') === 'perto' ? 'perto' : 'ganha')
  const [vez, repetir] = useState(0), [aberto, definirAberto] = useState(true)
  const e = emblemaPorId(id) ?? EMBLEMAS[0], perfil = perfilDoEmblema(e)
  const falta = Math.min(100, Math.max(1, Math.floor(e.minimo * .1)))
  const perto = tipo === 'perto' && perfil.acompanhar
  const mostrar = () => { definirAberto(true); repetir(v => v + 1) }
  return <div className="conteudo empilha" style={{ paddingBlock: 24 }}>
    <p className="meta">Desenvolvimento · Tela ilustrativa</p><h1>Prévia dos avisos de conquistas</h1>
    <label>Conquista<select className="entrada" value={e.id} onChange={ev => { definirId(ev.target.value); mostrar() }}>{EMBLEMAS.map(b => <option key={b.id} value={b.id}>{b.rotulo} · {b.id}</option>)}</select></label>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" className="botao" aria-pressed={tipo === 'perto'} disabled={!perfil.acompanhar} onClick={() => { definirTipo('perto'); mostrar() }}>Expectativa</button><button type="button" className="botao" aria-pressed={!perto} onClick={() => { definirTipo('ganha'); mostrar() }}>Comemoração</button><button type="button" className="botao" onClick={mostrar}>Repetir animação</button></div>
    <p>Cenário: {CENARIOS_AVISOS[perfil.cenario].titulo}. {perfil.acompanhar ? 'Meta de contagem acompanha o contexto de estudo.' : 'Somente comemoração: sem antecipar porcentagens, recordes ou segredos.'}</p>
    {aberto && <CartaoConquista key={`${e.id}-${tipo}-${vez}`} fechar={() => definirAberto(false)} aviso={perto ? { tipo: 'perto', emblema: e, meta: { emblema: e, valor: e.minimo - falta, falta, texto: unidadeRestante(e, falta), distante: falta > 10 } } : { tipo: 'ganha', emblema: e, outras: 0 }} />}
  </div>
}
