import { useMemo, useState } from 'react'
import { Icone } from '../Icone'
import { PreviaCarta } from './CartaPessoal'
import { GRUPOS, amostraDe, combinaBusca, modelosDoCatalogo, outraSemente, sementeInicial, type GrupoCatalogo, type ModeloCatalogo } from './todasCartas'
import { TIPOS, type Carta } from './modelosEmail'
import '../../estilos/paginas/AdminTodasCartas.css'

const PLANO_ARTEFATO = 'https://claude.ai/code/artifact/0d9af4fc-8f20-401a-a1cb-2908424cf8fb'
const PLANO_REPO = 'https://github.com/talesrobertosn/ortoquestoes/blob/main/docs/emails/PLANO.md'

/**
 * E-mails › Todas as cartas (17/10/2026): o catálogo vivo de todos os tipos de carta (situações,
 * as 9 faixas, convites, pessoais, automáticos, os seis novos e as nove campanhas diárias da
 * parte 31), agrupados, cada um com rótulo,
 * descrição, quando sai, para quem, uma amostra gerada aqui mesmo pelo motor das cartas para uma
 * pessoa fictícia, "Sortear outra versão" e o número de versões. Nada é enviado desta página.
 */
export function AdminTodasCartas() {
  const modelos = useMemo(modelosDoCatalogo, [])
  const [grupo, definirGrupo] = useState<GrupoCatalogo | 'todos'>('todos')
  const [busca, definirBusca] = useState('')
  const [sementes, definirSementes] = useState<Record<string, number>>({})
  const [aberto, definirAberto] = useState<string | null>(null)
  // As amostras, uma por modelo, refeitas só quando a semente daquele modelo muda.
  const amostras = useMemo(() => Object.fromEntries(modelos.map((m) => {
    try { return [m.id, { carta: amostraDe(m, sementes[m.id] ?? sementeInicial(m)), erro: null }] }
    catch (f) { return [m.id, { carta: null, erro: String(f).replace(/^Error: /, '') }] }
  })) as Record<string, { carta: Carta | null; erro: string | null }>, [modelos, sementes])
  const visiveis = modelos.filter((m) => (grupo === 'todos' || m.grupo === grupo) && combinaBusca(m, amostras[m.id]?.carta ?? null, busca))
  const totalVersoes = modelos.reduce((s, m) => s + m.versoes, 0)
  const contagem = (g: GrupoCatalogo) => modelos.filter((m) => m.grupo === g).length

  function sortear(m: ModeloCatalogo) {
    const atual = amostras[m.id]?.carta?.versao ?? ''
    definirSementes((s) => ({ ...s, [m.id]: outraSemente(m, atual) }))
  }

  return <section className="empilha adm-secao tc" aria-labelledby="tc-titulo">
    <div className="adm-secao__cabeca">
      <div>
        <h2 id="tc-titulo">Catálogo de cartas</h2>
        <p>Cada tipo de e-mail que o site manda, com uma amostra viva escrita agora pelo mesmo motor da função <code>enviar-email</code>, para uma pessoa fictícia. Nada sai desta página: é para ler, conferir o tom e sortear outras versões.</p>
      </div>
    </div>
    <p className="adm-nota tc-links">
      <strong>{modelos.length}</strong> modelos ({Object.keys(TIPOS).length} tipos, com a carta de estudo aberta nas 9 faixas) · <strong>{totalVersoes}</strong> versões escritas à mão ·{' '}
      <a href={PLANO_ARTEFATO} target="_blank" rel="noreferrer">Plano da reescrita <Icone nome="link" tamanho={12} /></a> · <a href={PLANO_REPO} target="_blank" rel="noreferrer">docs/emails/PLANO.md <Icone nome="link" tamanho={12} /></a>
    </p>
    <div className="tc-filtros">
      <div className="adm-filtros" role="tablist" aria-label="Grupos de cartas">
        <button type="button" role="tab" className="adm-chip" aria-selected={grupo === 'todos'} aria-pressed={grupo === 'todos'} onClick={() => definirGrupo('todos')}>Todas <span>{modelos.length}</span></button>
        {GRUPOS.map((g) => <button key={g.id} type="button" role="tab" className="adm-chip" aria-selected={grupo === g.id} aria-pressed={grupo === g.id} title={g.descricao} onClick={() => definirGrupo(g.id)}>{g.rotulo} <span>{contagem(g.id)}</span></button>)}
      </div>
      <label className="campo tc-busca">
        <span className="so-leitor">Buscar nas cartas</span>
        <input type="search" className="entrada" placeholder="Buscar por tipo, gatilho ou texto da amostra…" value={busca} onChange={(e) => definirBusca(e.target.value)} />
      </label>
    </div>
    {grupo !== 'todos' && <p className="adm-nota">{GRUPOS.find((g) => g.id === grupo)?.descricao}</p>}

    {!visiveis.length ? <p className="adm-vazio">Nenhuma carta combina com a busca.</p> : <div className="tc-grade">
      {visiveis.map((m) => {
        const { carta, erro } = amostras[m.id] ?? { carta: null, erro: null }
        const grupoInfo = GRUPOS.find((g) => g.id === m.grupo)
        return <article key={m.id} className="tc-cartao" aria-labelledby={`tc-${m.id}`} data-tipo={m.tipo}>
          <header className="tc-cartao__cabeca">
            <h3 id={`tc-${m.id}`}>{m.rotulo}</h3>
            <div className="tc-cartao__selos">
              <span className="adm-selo adm-selo--neutro">{grupoInfo?.rotulo}</span>
              {m.transacional && <span className="adm-selo" title="Sai mesmo dentro do teto de cadência e para quem desligou as cartas: é resposta a algo que a pessoa fez.">Transacional</span>}
              <span className="adm-selo adm-selo--ok">{m.versoes} {m.versoes === 1 ? 'versão' : 'versões'}</span>
            </div>
          </header>
          <p className="tc-cartao__descricao">{m.descricao}</p>
          <dl className="tc-gatilho">
            <div><dt><Icone nome="relogio" tamanho={14} /> Quando sai</dt><dd>{m.gatilho.quando}</dd></div>
            <div><dt><Icone nome="usuario" tamanho={14} /> Para quem</dt><dd>{m.gatilho.paraQuem}</dd></div>
          </dl>
          <div className="tc-amostra">
            <p className="tc-amostra__pessoa"><Icone nome="olho" tamanho={14} /> Amostra para <strong>{m.pessoa}</strong> (fictício)</p>
            {carta ? <>
              <p className="tc-amostra__assunto"><span>Assunto</span> <strong>{carta.assunto}</strong></p>
              <div className="tc-amostra__corpo">{carta.corpo.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}<p className="tc-amostra__assinatura">Um abraço,<br />Tales, do Orto Questões</p></div>
              <p className="adm-nota tc-amostra__versao">Versão {carta.versao.split('#')[1]} de {carta.versoes.total}{carta.personalizacao.length ? ` · personalizada com: ${carta.personalizacao.join(', ')}` : ''}</p>
            </> : <p className="adm-alerta" role="alert">O motor não conseguiu escrever esta amostra: {erro}</p>}
          </div>
          <div className="tc-cartao__acoes">
            <button type="button" className="botao" onClick={() => sortear(m)} disabled={m.versoes <= 1 && !carta}><Icone nome="raio" tamanho={16} /> Sortear outra versão</button>
            {carta && <button type="button" className="adm-link" aria-expanded={aberto === m.id} onClick={() => definirAberto(aberto === m.id ? null : m.id)}>{aberto === m.id ? 'Fechar prévia' : 'Ver como chega'}</button>}
          </div>
          {carta && aberto === m.id && <PreviaCarta assunto={carta.assunto} corpo={carta.corpo} descadastro={!m.transacional && (m.grupo === 'automatico' || m.grupo === 'novo' || m.grupo === 'campanha' || m.grupo === 'convite')} />}
        </article>
      })}
    </div>}
  </section>
}
