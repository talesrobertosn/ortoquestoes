import { rpcInexistente, usarRpc } from '../../componentes/admin/usarRpc'
import { PLANO_SUPABASE, LIMIAR_AVISO, LIMIAR_PERIGO, medidores, tamanho, tomDe, valorDe, type Medidor, type UsoSupabase as Uso } from '../dados/usoSupabase'
import { usarPainel } from '../dados/painel'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { dataHora, haQuanto } from '../ui/formato'
import { Cabeca, Carregando, Estado, Faixa, Painel } from '../ui/kit'

const MEIA_HORA = 30 * 60_000
const ROTULO_TOM = { ok: 'Folgado', aviso: 'Atenção', perigo: 'Perto do limite' } as const

/**
 * Ajustes › Uso do Supabase (Tales, 03/11/2026): quanto do plano o site já usa. Cada medidor mostra o usado, o limite,
 * a porcentagem e uma frase curta; a barra fica âmbar a partir de 70% e vermelha a partir de 90%. Embaixo, o que mais
 * ocupa: as 10 maiores tabelas e os baldes de arquivos. Tráfego de saída e Edge Functions ficam "em breve": não saem
 * por SQL (ver o fim da tela).
 */
export default function UsoSupabase() {
  const parte = defParte('supabase')
  const p = usarPainel()
  const q = usarRpc<Uso>(p.conta, 'uso_supabase_admin', {}, { validadeMs: MEIA_HORA })
  const uso = q.dados && typeof q.dados === 'object' ? q.dados : null
  const lista = medidores(uso)
  const medidos = lista.filter(m => m.pct !== null)
  const pior = medidos.length ? medidos.reduce((a, b) => (b.pct ?? 0) > (a.pct ?? 0) ? b : a) : null
  const semFuncao = !uso && !!q.erro && rpcInexistente(q.erro)

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Ajustes" titulo={parte.rotulo} pergunta={parte.pergunta}
      acoes={<button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => void q.recarregar()} disabled={q.carregando}>
        <Icone nome="atualizar" tamanho={15} />{q.carregando ? 'Medindo…' : 'Medir agora'}</button>}
      extra={<p className="a3-mudo a3-pequeno">Plano {PLANO_SUPABASE.nome} · limites conferidos em {PLANO_SUPABASE.conferidoEm}{uso ? ` · medido ${haQuanto(uso.medido_em)}` : ''}</p>} />

    {semFuncao ? <Faixa tom="aviso" titulo="Falta colar o SQL no Supabase">
      A função <code>uso_supabase_admin</code> ainda não existe no banco. Cole a parte 38 (<code>supabase/colar-no-painel/sql-202611030100-parte38-uso-supabase.sql</code>) no SQL Editor e toque em Medir agora.
    </Faixa> : q.erro && !uso ? <Estado tipo="erro" titulo="Não deu para medir agora" texto="A consulta ao banco falhou. Tente de novo em instantes." /> : null}

    {pior && <p className={`us-resumo us-resumo--${tomDe(pior.pct ?? 0)}`}>
      <b>{ROTULO_TOM[tomDe(pior.pct ?? 0)]}.</b> O mais cheio é {pior.nome.toLowerCase()}, com {Math.round(pior.pct ?? 0)}% do limite.
    </p>}

    <section className="us-grade" aria-label="Medidores de uso">
      {!uso && !q.erro ? [0, 1, 2].map(i => <div key={i} className="a3-painel" style={{ padding: 20 }}><Carregando linhas={3} texto={i ? '' : 'Medindo o banco…'} /></div>)
        : lista.map(m => <CartaoMedidor key={m.id} m={m} extra={m.id === 'usuarios' && uso ? `${Number(uso.contas).toLocaleString('pt-BR')} contas no total` : undefined} />)}
    </section>

    {uso && <div className="us-duas">
      <Painel titulo="Tabelas que mais ocupam" descricao={`As 10 maiores, com índices. O banco inteiro tem ${tamanho(Number(uso.banco_bytes))}.`}>
        <ListaBarras itens={uso.tabelas.map(t => ({ nome: t.tabela, detalhe: t.esquema, bytes: Number(t.bytes) }))} total={Number(uso.banco_bytes)} vazio="Nenhuma tabela encontrada" />
      </Painel>
      <Painel titulo="Arquivos por balde" descricao={`O Storage inteiro tem ${tamanho(Number(uso.arquivos_bytes))}.`}>
        <ListaBarras itens={uso.baldes.map(b => ({ nome: b.balde, detalhe: `${Number(b.arquivos).toLocaleString('pt-BR')} ${Number(b.arquivos) === 1 ? 'arquivo' : 'arquivos'}`, bytes: Number(b.bytes) }))} total={Number(uso.arquivos_bytes)} vazio="Nenhum arquivo no Storage" />
      </Painel>
    </div>}

    <Painel titulo="Tráfego de saída e Edge Functions" descricao="Por que ainda não aparecem aqui.">
      <div className="us-breve">
        <p>Esses dois números não ficam no banco: o Supabase só mostra no próprio painel de uso. Para trazer para cá, falta uma Edge Function que só um administrador pode chamar, com um token pessoal do Supabase guardado como segredo dela.</p>
        <p>Até lá, veja em <b>supabase.com › seu projeto › Usage</b>: lá estão o tráfego de saída e as chamadas de funções do mês.</p>
      </div>
    </Painel>

    <p className="a3-mudo a3-pequeno">
      A barra fica âmbar a partir de {LIMIAR_AVISO}% e vermelha a partir de {LIMIAR_PERIGO}%. Usuários ativos usa o último login dos últimos 30 dias; o Supabase conta por mês do ciclo de cobrança, então o número dele pode ser um pouco diferente.
      {uso && ` Medido em ${dataHora(uso.medido_em)}.`}
    </p>
  </div>
}

function CartaoMedidor({ m, extra }: { m: Medidor; extra?: string }) {
  const emBreve = m.pct === null
  const tom = emBreve ? 'breve' : tomDe(m.pct ?? 0)
  const largura = Math.min(100, Math.max(m.pct ?? 0, m.pct ? 1.5 : 0))
  return <article className={`a3-painel us-medidor us-medidor--${tom}`} aria-label={m.nome}>
    <header className="us-medidor__cabeca">
      <h2 className="a3-titulo-3">{m.nome}</h2>
      {emBreve ? <span className="us-selo">Em breve</span> : <b className="us-medidor__pct num">{Math.round(m.pct ?? 0)}%</b>}
    </header>
    <p className="us-medidor__frase">{m.frase}</p>
    <div className="us-medidor__trilho" role={emBreve ? undefined : 'meter'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={emBreve ? undefined : Math.round(m.pct ?? 0)}
      aria-label={emBreve ? undefined : `${m.nome}: ${Math.round(m.pct ?? 0)}% do limite`}>
      <i style={{ width: `${largura}%` }} />
    </div>
    <p className="us-medidor__conta">{emBreve
      ? <>Limite do plano: <b>{valorDe(m.limite, m.unidade)}</b> por mês. Ainda não medido aqui.</>
      : <><b className="num">{valorDe(m.usado ?? 0, m.unidade)}</b> de {valorDe(m.limite, m.unidade)} usados{extra ? ` · ${extra}` : ''}</>}</p>
  </article>
}

function ListaBarras({ itens, total, vazio }: { itens: Array<{ nome: string; detalhe: string; bytes: number }>; total: number; vazio: string }) {
  if (!itens.length) return <Estado compacto icone="certo" titulo={vazio} />
  const maior = Math.max(...itens.map(i => i.bytes), 1)
  return <ol className="us-lista">
    {itens.map(i => <li key={`${i.detalhe}.${i.nome}`}>
      <span className="us-lista__nome"><b>{i.nome}</b><small>{i.detalhe}</small></span>
      <span className="us-lista__barra" aria-hidden="true"><i style={{ width: `${Math.max(2, (100 * i.bytes) / maior)}%` }} /></span>
      <span className="us-lista__valor num">{tamanho(i.bytes)}<small>{total > 0 ? `${Math.round((100 * i.bytes) / total)}%` : ''}</small></span>
    </li>)}
  </ol>
}
