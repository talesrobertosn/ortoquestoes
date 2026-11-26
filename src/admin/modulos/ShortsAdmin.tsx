import { erroDoPainel } from '../../componentes/admin/formatos'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { href } from '../../util/rotas'
import { usarPainel } from '../dados/painel'
import { defParte } from '../rotas'
import { haQuanto, inteiro } from '../ui/formato'
import { Ranking, SerieTempo } from '../ui/graficos'
import { Cabeca, Carregando, Estado, Metrica, Painel, Selo } from '../ui/kit'

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
interface Pessoa { id_usuario: string; usuario: string | null; primeira_em: string; visto_em: string; vistas: number; hoje: number; total: number; acertos: number; revisoes: number; ilimitado: boolean }
const MIGRACAO = '20261125220000_shorts.sql'
const MIGRACAO_PESSOAS = '20261125233000_shorts_pessoas.sql'
/** Vendo agora: sinal dos últimos 2 minutos (o aparelho avisa a cada minuto com a tela à vista). */
const AGORA_MS = 2 * 60_000
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—')
const curtaData = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7)

/** Conteúdo › Shorts: quanto se usa, quem bate no limite grátis e quais questões ganham coração ou são puladas. */
export default function ShortsAdmin() {
  const p = usarPainel()
  const q = usarRpc<DadosShorts>(p.conta, 'shorts_painel_admin')
  const pessoas = usarRpc<Pessoa[]>(p.conta, 'shorts_pessoas_admin')
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
    <PessoasShorts dados={pessoas.dados} erro={pessoas.erro} />
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

/** Quem usa os Shorts: vendo agora no topo, depois do mais recente ao mais antigo. */
function PessoasShorts({ dados, erro }: { dados: Pessoa[] | null | undefined; erro: unknown }) {
  if (erro) return <Painel titulo="Quem está nos Shorts"><p className="a3-mudo">{erroDoPainel(erro, MIGRACAO_PESSOAS)}</p></Painel>
  if (!dados) return <Painel titulo="Quem está nos Shorts"><p className="a3-mudo">Carregando…</p></Painel>
  const agora = Date.now()
  const vendo = dados.filter((x) => agora - Date.parse(x.visto_em) < AGORA_MS)
  const doze = dados.filter((x) => agora - Date.parse(x.visto_em) < 12 * 3_600_000)
  const hoje = dados.filter((x) => x.hoje > 0)
  return <Painel titulo="Quem está nos Shorts" descricao={`${inteiro(vendo.length)} vendo agora · ${inteiro(doze.length)} nas últimas 12 h (rosa nas listas de pessoas) · ${inteiro(hoje.length)} responderam hoje · ${inteiro(dados.length)} já usaram`}>
    {dados.length === 0 ? <p className="a3-mudo">Ninguém com conta abriu os Shorts ainda. Quem está sem conta só olha e não aparece aqui.</p> :
      <table className="a3-tabela"><thead><tr><th>Pessoa</th><th>Situação</th><th>Hoje</th><th>Total</th><th>Acerto</th><th>Vistas</th><th>Primeira vez</th></tr></thead>
        <tbody>{dados.map((x) => {
          const ativo = agora - Date.parse(x.visto_em) < AGORA_MS
          return <tr key={x.id_usuario}>
            <td>{x.usuario ?? 'sem e-mail'} {x.ilimitado && <Selo contorno>Sem limite</Selo>}</td>
            <td>{ativo ? <Selo tom="ok" solido>Vendo agora</Selo> : agora - Date.parse(x.visto_em) < 12 * 3_600_000 ? <span className="a3-tag a3-tag--shorts">{haQuanto(x.visto_em)}</span> : <span className="a3-mudo">{haQuanto(x.visto_em)}</span>}</td>
            <td className="num">{inteiro(x.hoje)}</td>
            <td className="num">{inteiro(x.total)}</td>
            <td className="num">{pct(x.acertos, x.total)}</td>
            <td className="num">{inteiro(x.vistas)}</td>
            <td className="a3-mudo">{haQuanto(x.primeira_em)}</td>
          </tr>
        })}</tbody></table>}
  </Painel>
}
