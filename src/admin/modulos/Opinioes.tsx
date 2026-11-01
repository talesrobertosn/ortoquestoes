import { useMemo, useState } from 'react'
import { erroDoPainel } from '../../componentes/admin/formatos'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { usarPainel } from '../dados/painel'
import { defParte } from '../rotas'
import { combina, dataHora, inteiro, normalizar } from '../ui/formato'
import { Composicao } from '../ui/graficos'
import { Busca, Cabeca, Carregando, Estado, Filtro, Metrica, Painel, Selo } from '../ui/kit'

interface Opiniao {
  id: number; categoria: string; facil_estudar: number | null; experiencia_visual: number | null; som_celular: string | null
  problema: string | null; melhorar: string | null; origem: string; aparelho: string | null; status: string; criada_em: string; usuario: string | null
}
const MIGRACAO = 'parte 18 (202610130400_flashcards_opinioes_beta.sql)'
const CATEGORIA: Record<string, string> = { som: 'Som', visual: 'Visual', desempenho: 'Desempenho', conteudo: 'Conteúdo', outro: 'Outro' }
const ORIGEM: Record<string, string> = { central: 'Central', fim_sessao: 'Fim da sessão', fim_partida: 'Fim da partida', convite: 'Convite' }
const SOM: Record<string, string> = { sim: 'Som funcionou', nao: 'Som não funcionou', nao_testei: 'Não testou o som' }
const media = (l: Array<number | null>) => { const v = l.filter((x): x is number => !!x); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }

/** Nota de 1 a 5 em cinco tracinhos: forma e texto, sem depender só da cor. */
function Nota({ n, rotulo }: { n: number | null; rotulo: string }) {
  return <span className="a3-nota" aria-label={`${rotulo}: ${n ?? 'sem nota'} de 5`}>
    <span className="a3-mudo a3-pequeno">{rotulo}</span>
    <span className="a3-nota__tracos" aria-hidden="true">{[1, 2, 3, 4, 5].map(i => <i key={i} className={n && i <= n ? 'cheio' : undefined} />)}</span>
    <b className="num">{n ?? '—'}</b>
  </span>
}

/** Estudo › Opiniões dos flashcards: o que chega pelo botão "Enviar opinião", lido como um mural. */
export default function Opinioes() {
  const p = usarPainel()
  const q = usarRpc<Opiniao[]>(p.conta, 'listar_opinioes_flashcards_admin')
  const [categoria, definirCategoria] = useState('')
  const [busca, definirBusca] = useState('')
  const parte = defParte('opinioes')
  const linhas = q.dados
  const termo = normalizar(busca.trim())
  const filtradas = useMemo(() => (linhas ?? []).filter(o => (!categoria || o.categoria === categoria) && combina([o.problema, o.melhorar, o.usuario, o.aparelho], termo)), [linhas, categoria, termo])
  if (q.erro) return <Estado tipo="erro" titulo="As opiniões não carregaram" texto={erroDoPainel(q.erro, MIGRACAO)} />
  if (!linhas) return <Carregando linhas={6} texto="Carregando as opiniões…" />
  const somNao = linhas.filter(o => o.som_celular === 'nao').length
  const fmt = (v: number | null) => v === null ? '—' : v.toFixed(1).replace('.', ',')
  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Estudo e conteúdo" titulo={parte.rotulo} pergunta={`${parte.pergunta} Mais recentes primeiro.`} />
    <section className="a3-painel"><div className="a3-faixa-metricas" style={{ '--colunas': 4 } as React.CSSProperties}>
      <Metrica rotulo="Opiniões" valor={inteiro(linhas.length)} qualidade="confirmado" nota={`${linhas.filter(o => o.status === 'aberta').length} em aberto`} />
      <Metrica rotulo="Facilidade (1 a 5)" valor={fmt(media(linhas.map(o => o.facil_estudar)))} qualidade="derivado" nota="média de quem deu nota" />
      <Metrica rotulo="Visual (1 a 5)" valor={fmt(media(linhas.map(o => o.experiencia_visual)))} qualidade="derivado" nota="média de quem deu nota" />
      <Metrica rotulo="Som falhou no celular" valor={inteiro(somNao)} qualidade="confirmado" nota={somNao ? 'vale testar no aparelho citado' : 'ninguém relatou'} />
    </div></section>
    <div className="a3-grade a3-grade--12" style={{ alignItems: 'start' }}>
      <div style={{ gridColumn: 'span 4' }}><Painel titulo="Do que falam" descricao="Categoria escolhida por quem mandou">
        <Composicao partes={Object.entries(CATEGORIA).map(([id, nome]) => ({ nome, valor: linhas.filter(o => o.categoria === id).length })).filter(x => x.valor)} />
      </Painel></div>
      <section className="a3-painel" style={{ gridColumn: 'span 8' }} aria-label="Mural de opiniões">
        <div className="a3-filtros"><Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar no texto, e-mail ou aparelho" /></div>
        <div className="a3-filtros" style={{ paddingTop: 0 }} role="group" aria-label="Categoria">
          {[['', 'Todas'], ...Object.entries(CATEGORIA)].map(([id, nome]) => <Filtro key={id} ativo={categoria === id} aoClicar={() => definirCategoria(id)} contagem={id ? linhas.filter(o => o.categoria === id).length : linhas.length}>{nome}</Filtro>)}
        </div>
        {filtradas.length === 0 ? <div style={{ padding: 20 }}><Estado titulo={`Nenhuma opinião ${categoria || busca ? 'neste filtro' : 'ainda'}`} /></div> :
          <ul className="a3-mural">{filtradas.map(o => <li key={o.id}>
            <div className="a3-mural__topo">
              <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}><Selo solido>{CATEGORIA[o.categoria] ?? o.categoria}</Selo><Selo contorno>{ORIGEM[o.origem] ?? o.origem}</Selo>{o.som_celular && <Selo tom={o.som_celular === 'nao' ? 'erro' : undefined} contorno={o.som_celular !== 'nao'}>{SOM[o.som_celular] ?? o.som_celular}</Selo>}</span>
              <span className="a3-mudo a3-pequeno">{dataHora(o.criada_em)}</span>
            </div>
            <div className="a3-mural__notas"><Nota n={o.facil_estudar} rotulo="Facilidade" /><Nota n={o.experiencia_visual} rotulo="Visual" /></div>
            {o.problema && <div className="a3-mural__texto"><span className="a3-rotulo">Não funcionou</span><p>{o.problema}</p></div>}
            {o.melhorar && <div className="a3-mural__texto"><span className="a3-rotulo">Próxima melhoria</span><p>{o.melhorar}</p></div>}
            <span className="a3-mudo a3-pequeno">{o.usuario ?? 'sem e-mail'}{o.aparelho ? ` · ${o.aparelho}` : ''}</span>
          </li>)}</ul>}
      </section>
    </div>
  </div>
}
