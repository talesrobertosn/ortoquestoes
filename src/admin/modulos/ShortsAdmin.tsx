import { erroDoPainel } from '../../componentes/admin/formatos'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { href } from '../../util/rotas'
import { usarPainel } from '../dados/painel'
import { defParte } from '../rotas'
import { inteiro } from '../ui/formato'
import { Ranking, SerieTempo } from '../ui/graficos'
import { Cabeca, Carregando, Estado, Metrica, Painel } from '../ui/kit'

interface Dia { dia: string; respostas: number; pessoas: number; acertos: number; assinantes: number }
interface Questao { id: string; coracoes: number; respostas: number; acertos: number; vistas: number; puladas: number }
interface DadosShorts {
  limite: number
  totais: { respostas: number; pessoas: number; acertos: number; revisoes: number; coracoes: number }
  hoje: { respostas: number; pessoas: number; no_limite: number }
  dias: Dia[]
  questoes: Questao[]
  puladas: Array<{ id: string; vistas: number; puladas: number }>
}
const MIGRACAO = '20261125220000_shorts.sql'
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')
const curtaData = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7)

/** Conteúdo › Shorts: quanto se usa, quem bate no limite grátis e quais questões ganham coração ou são puladas. */
export default function ShortsAdmin() {
  const p = usarPainel()
  const q = usarRpc<DadosShorts>(p.conta, 'shorts_painel_admin')
  const parte = defParte('shorts')
  if (q.erro) return <Estado tipo="erro" titulo="Os números dos Shorts não carregaram" texto={erroDoPainel(q.erro, MIGRACAO)} />
  const d = q.dados
  if (!d) return <Carregando linhas={6} texto="Carregando os Shorts…" />
  const dias = d.dias ?? []
  const link = (id: string) => <a href={href(`/questao/${id}`)} target="_blank" rel="noreferrer">{id}</a>
  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Conteúdo" titulo={parte.rotulo} pergunta={parte.pergunta} />
    <section className="a3-painel"><div className="a3-faixa-metricas" style={{ '--colunas': 5 } as React.CSSProperties}>
      <Metrica rotulo="Shorts hoje" valor={inteiro(d.hoje.respostas)} qualidade="confirmado" nota={`${inteiro(d.hoje.pessoas)} ${d.hoje.pessoas === 1 ? 'pessoa' : 'pessoas'}`} />
      <Metrica rotulo="Bateram no limite hoje" valor={inteiro(d.hoje.no_limite)} qualidade="confirmado" nota={`contas grátis com ${d.limite} Shorts`} />
      <Metrica rotulo="Shorts no total" valor={inteiro(d.totais.respostas)} qualidade="confirmado" nota={`${inteiro(d.totais.pessoas)} pessoas · acerto ${pct(d.totais.acertos, d.totais.respostas)}`} />
      <Metrica rotulo="Revisões surpresa" valor={inteiro(d.totais.revisoes)} qualidade="confirmado" nota="questões que voltaram de 3 a 7 dias depois" />
      <Metrica rotulo="Corações" valor={inteiro(d.totais.coracoes)} qualidade="confirmado" nota="cada coração também vale nota 10" />
    </div></section>
    <Painel titulo="Últimos 30 dias" descricao="Shorts respondidos e pessoas por dia (dia de São Paulo)">
      {dias.length ? <SerieTempo descricao="Shorts e pessoas por dia"
        rotulos={dias.map((x) => ({ longo: x.dia, curto: curtaData(x.dia) }))}
        series={[{ nome: 'Shorts', valores: dias.map((x) => x.respostas), tipo: 'barra' }, { nome: 'Pessoas', valores: dias.map((x) => x.pessoas), tipo: 'linha', estilo: 2 }, { nome: 'Assinantes', valores: dias.map((x) => x.assinantes), tipo: 'linha', estilo: 'tracejada' }]} />
        : <Estado titulo="Ninguém fez Shorts ainda" />}
    </Painel>
    <div className="a3-grade a3-grade--12" style={{ alignItems: 'start' }}>
      <div style={{ gridColumn: 'span 6' }}><Painel titulo="Mais corações" descricao="Boas candidatas a post">
        <Ranking itens={d.questoes.filter((x) => x.coracoes > 0).slice(0, 15).map((x) => ({ nome: x.id, valor: x.coracoes, detalhe: `${x.respostas} respostas · acerto ${pct(x.acertos, x.respostas)}` }))} />
      </Painel></div>
      <div style={{ gridColumn: 'span 6' }}><Painel titulo="Mais puladas" descricao="Com 10 vistas ou mais: talvez longas demais ou sem graça para o formato">
        {d.puladas.length ? <table className="a3-tabela"><thead><tr><th>Questão</th><th>Vistas</th><th>Puladas</th></tr></thead>
          <tbody>{d.puladas.map((x) => <tr key={x.id}><td>{link(x.id)}</td><td className="num">{inteiro(x.vistas)}</td><td className="num">{pct(x.puladas, x.vistas)}</td></tr>)}</tbody></table>
          : <p className="a3-mudo">Ainda não há questões com 10 vistas.</p>}
      </Painel></div>
    </div>
    <Painel titulo="Questões nos Shorts" descricao="As 60 com mais corações e respostas">
      <table className="a3-tabela"><thead><tr><th>Questão</th><th>Corações</th><th>Respostas</th><th>Acerto</th><th>Vistas</th><th>Puladas</th></tr></thead>
        <tbody>{d.questoes.map((x) => <tr key={x.id}><td>{link(x.id)}</td><td className="num">{inteiro(x.coracoes)}</td><td className="num">{inteiro(x.respostas)}</td><td className="num">{pct(x.acertos, x.respostas)}</td><td className="num">{inteiro(x.vistas)}</td><td className="num">{pct(x.puladas, x.vistas)}</td></tr>)}</tbody></table>
    </Painel>
  </div>
}
