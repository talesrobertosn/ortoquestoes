import { useMemo, useState } from 'react'
import { GRUPOS, amostraDe, combinaBusca, modelosDoCatalogo, outraSemente, sementeInicial, type GrupoCatalogo, type ModeloCatalogo } from '../../componentes/admin/todasCartas'
import { TIPOS, type Carta } from '../../componentes/admin/modelosEmail'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { Busca, Cabeca, Estado, Faixa, Filtro, Selo } from '../ui/kit'
import { PreviaCarta } from './cartas-comum'

const PLANO_REPO = 'https://github.com/talesrobertosn/ortoquestoes/blob/main/docs/emails/PLANO.md'

/**
 * Comunicação › Catálogo de cartas: todos os tipos de carta, com amostra escrita na hora pelo mesmo motor da
 * função enviar-email para uma pessoa fictícia. Nada é enviado daqui.
 */
export default function Catalogo() {
  const parte = defParte('todas')
  const modelos = useMemo(modelosDoCatalogo, [])
  const [grupo, definirGrupo] = useState<GrupoCatalogo | 'todos'>('todos')
  const [busca, definirBusca] = useState('')
  const [sementes, definirSementes] = useState<Record<string, number>>({})
  const [escolhido, escolher] = useState<string | null>(null)
  const [comoChega, definirComoChega] = useState(false)
  const amostras = useMemo(() => Object.fromEntries(modelos.map(m => {
    try { return [m.id, { carta: amostraDe(m, sementes[m.id] ?? sementeInicial(m)), erro: null }] }
    catch (f) { return [m.id, { carta: null, erro: String(f).replace(/^Error: /, '') }] }
  })) as Record<string, { carta: Carta | null; erro: string | null }>, [modelos, sementes])
  const visiveis = modelos.filter(m => (grupo === 'todos' || m.grupo === grupo) && combinaBusca(m, amostras[m.id]?.carta ?? null, busca))
  const atual = visiveis.find(m => m.id === escolhido) ?? visiveis[0] ?? null
  const totalVersoes = modelos.reduce((s, m) => s + m.versoes, 0)
  const sortear = (m: ModeloCatalogo) => definirSementes(s => ({ ...s, [m.id]: outraSemente(m, amostras[m.id]?.carta?.versao ?? '') }))
  const am = atual ? amostras[atual.id] : null

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="E-mails" titulo={parte.rotulo} pergunta={`${modelos.length} modelos (${Object.keys(TIPOS).length} tipos, a carta de estudo aberta nas 9 faixas) e ${totalVersoes} versões escritas à mão. Nada sai daqui: é para ler, conferir o tom e sortear versões.`}
      acoes={<a className="a3-botao a3-botao--contorno" href={PLANO_REPO} target="_blank" rel="noreferrer"><Icone nome="externo" tamanho={15} />Plano dos e-mails</a>} />
    <div className="a3-catalogo">
      <section className="a3-painel a3-catalogo__lista" aria-label="Modelos">
        <div className="a3-filtros"><Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar tipo, gatilho ou texto" /></div>
        <div className="a3-filtros" style={{ paddingTop: 0 }} role="group" aria-label="Grupos">
          <Filtro ativo={grupo === 'todos'} aoClicar={() => definirGrupo('todos')} contagem={modelos.length}>Todas</Filtro>
          {GRUPOS.map(g => <Filtro key={g.id} ativo={grupo === g.id} aoClicar={() => definirGrupo(g.id)} contagem={modelos.filter(m => m.grupo === g.id).length}>{g.rotulo}</Filtro>)}
        </div>
        {grupo !== 'todos' && <p className="a3-mudo a3-pequeno" style={{ padding: '0 20px 12px' }}>{GRUPOS.find(g => g.id === grupo)?.descricao}</p>}
        {!visiveis.length ? <div style={{ padding: 20 }}><Estado titulo="Nenhuma carta combina com a busca" /></div> :
          <ul className="a3-fila-avisos">{visiveis.map(m => <li key={m.id}><button type="button" className="a3-fila-avisos__item" aria-current={atual?.id === m.id ? 'true' : undefined} onClick={() => { escolher(m.id); definirComoChega(false) }}>
            <span className={'a3-ponto' + (amostras[m.id]?.erro ? ' a3-ponto--erro' : m.transacional ? ' a3-ponto--aviso' : '')} aria-hidden="true" />
            <span className="a3-fila-avisos__texto"><span className="a3-nome">{m.rotulo}</span><span className="a3-sub">{GRUPOS.find(g => g.id === m.grupo)?.rotulo} · {m.gatilho.quando}</span></span>
            <span className="a3-fila-avisos__quando">{m.versoes} v.</span>
          </button></li>)}</ul>}
      </section>

      {atual && <section className="a3-painel a3-catalogo__detalhe" aria-label={`Modelo ${atual.rotulo}`}>
        <div className="a3-pilha" style={{ padding: 20 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Selo contorno>{GRUPOS.find(g => g.id === atual.grupo)?.rotulo}</Selo>
            {atual.transacional && <span title="Sai mesmo dentro do teto de cadência e para quem desligou as cartas: é resposta a algo que a pessoa fez."><Selo tom="aviso">Transacional</Selo></span>}
            <Selo tom="ok">{atual.versoes} {atual.versoes === 1 ? 'versão' : 'versões'}</Selo>
          </div>
          <h2 className="a3-titulo-2">{atual.rotulo}</h2>
          <p className="a3-mudo">{atual.descricao}</p>
          <dl className="a3-pares">
            <div><dt>Quando sai</dt><dd style={{ fontWeight: 400 }}>{atual.gatilho.quando}</dd></div>
            <div><dt>Para quem</dt><dd style={{ fontWeight: 400 }}>{atual.gatilho.paraQuem}</dd></div>
          </dl>
          {am?.carta ? <div className="a3-carta-papel">
            <span className="a3-rotulo">Amostra para {atual.pessoa} (fictício) · versão {am.carta.versao.split('#')[1]} de {am.carta.versoes.total}</span>
            <p className="a3-carta-papel__assunto">{am.carta.assunto}</p>
            <div className="a3-carta-papel__corpo">{am.carta.corpo.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}<p>Um abraço,<br />Tales, do Orto Questões</p></div>
            {am.carta.personalizacao.length > 0 && <span className="a3-mudo a3-pequeno">Personalizada com: {am.carta.personalizacao.join(', ')}</span>}
          </div> : <Faixa tom="erro" titulo="O motor não conseguiu escrever esta amostra">{am?.erro}</Faixa>}
          <div className="a3-acoes-linha">
            <button type="button" className="a3-botao a3-botao--contorno" onClick={() => sortear(atual)} disabled={atual.versoes <= 1 && !am?.carta}><Icone nome="raio" tamanho={15} />Sortear outra versão</button>
            {am?.carta && <button type="button" className="a3-botao a3-botao--fantasma" aria-expanded={comoChega} onClick={() => definirComoChega(!comoChega)}><Icone nome="carta" tamanho={15} />{comoChega ? 'Fechar como chega' : 'Ver como chega'}</button>}
          </div>
          {am?.carta && comoChega && <PreviaCarta assunto={am.carta.assunto} corpo={am.carta.corpo} descadastro={!atual.transacional && (atual.grupo === 'automatico' || atual.grupo === 'novo' || atual.grupo === 'campanha' || atual.grupo === 'convite')} />}
        </div>
      </section>}
    </div>
  </div>
}
