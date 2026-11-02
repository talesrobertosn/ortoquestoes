import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { carregarIndiceBiblioteca } from '../../biblioteca/conteudo'
import { quadroDoDia, type FeitoHoje, type MovimentoDinheiro, type Numero } from '../../componentes/admin/agora'
import { diaSP } from '../../componentes/admin/estudoHoje'
import { acertoAposRevisao, acertoReal, pedacosAtividade, registrarTitulosResumos, rotuloOrigem, tituloResumo } from '../../componentes/admin/formatos'
import { rotuloMeio, rotuloPlano } from '../../componentes/admin/rotulos'
import { viuPlanos } from '../../componentes/admin/sinais'
import { usarFunil, usarSerie } from '../dados/consultas'
import { usarPainel } from '../dados/painel'
import { nomeDe, novoParado, type LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { combina, dataCurta, haQuanto, horario, iniciais, inteiro, normalizar, reais } from '../ui/formato'
import { Busca, Cabeca, Carregando, Estado, Painel, Segmento, Selo, SeloQualidade, Situacao } from '../ui/kit'
import { Tabela, type Coluna } from '../ui/tabela'

type FiltroVivo = 'todos' | 'assinantes' | 'nao' | 'planos'
type Lista = 'estudaram' | 'entraram' | 'novos' | 'semana' | 'dinheiro' | 'biblioteca'

/** O que a pessoa está fazendo, por extenso: página, área, questão e quanto leu. */
function Faz({ u }: { u: Pick<LinhaUsuario, 'pagina' | 'questao'> }) {
  if (!u.pagina) return <span className="a3-mudo">página ainda não registrada</span>
  const f = pedacosAtividade(u)
  return <span>{f.nome}{f.area && <span className="a3-mudo"> · {f.area}</span>}{f.questao && <> · <a href={`#/questao/${f.questao}`} target="_blank" rel="noopener noreferrer" className="a3-link">{f.questao}</a></>}{f.extra && <span className="a3-mudo"> · {f.extra}</span>}</span>
}

function Pessoa({ u, detalhe }: { u: LinhaUsuario; detalhe?: ReactNode }) {
  return <span className="a3-pessoa-cel">
    <span className="a3-avatar">{iniciais(u.nome ?? u.email)}{u.online && <i className="a3-ponto a3-ponto--vivo" />}</span>
    <span style={{ minWidth: 0 }}><span className="a3-nome">{nomeDe(u)}</span>{detalhe !== undefined ? <span className="a3-sub">{detalhe}</span> : u.email && <span className="a3-sub">{u.email}</span>}</span>
  </span>
}

/** Comando › Atividade agora: o dia inteiro, com nomes, em uma tela. */
export default function Agora() {
  const p = usarPainel()
  const nav = usarNav()
  const serieQ = usarSerie(7, true)
  const { funil } = usarFunil()
  const [, recontar] = useState(0)
  useEffect(() => { carregarIndiceBiblioteca().then(i => { registrarTitulosResumos(i.capitulos); recontar(k => k + 1) }).catch(() => undefined) }, [])
  const sinaisLista = Array.isArray(p.sinaisQ.dados) ? p.sinaisQ.dados : null
  const quadro = useMemo(() => quadroDoDia({ usuarios: p.usuarios, sinais: sinaisLista, serie: Array.isArray(serieQ.dados) ? serieQ.dados : null, resumo: p.resumo, funil, assinaturas: p.reais, cobrancas: p.cobrancas }),
    [p.usuarios, sinaisLista, serieQ.dados, p.resumo, funil, p.reais, p.cobrancas])
  const nm = quadro.numeros
  const parte = defParte('agora')

  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Comando" titulo={parte.rotulo} pergunta={`${parte.pergunta} Hoje é ${dataCurta(Date.now())}, no relógio de São Paulo; "ontem" é o dia inteiro de ${quadro.ontem.split('-').reverse().slice(0, 2).join('/')}.`} />

    <section className="a3-painel" aria-label="Números do dia">
      <div className="a3-faixa-metricas" style={{ '--colunas': 6 } as React.CSSProperties}>
        <NumeroDia rotulo="Online agora" valor={p.online} vivo nota="sinal nos últimos 5 min" />
        <NumeroDia rotulo="Entraram hoje" numero={nm.entraram} nota="estudando ou não" />
        <NumeroDia rotulo="Estudaram hoje" numero={nm.estudaram} nota="questões, flashcards ou resumo" aoClicar={() => nav.ir('usuarios', { filtro: 'hoje' })} />
        <NumeroDia rotulo="Questões hoje" numero={nm.questoes} />
        <NumeroDia rotulo="Cadastros hoje" numero={nm.cadastros} nota={nm.cadastros7d !== null ? `${inteiro(nm.cadastros7d)} em 7 dias` : undefined} aoClicar={() => nav.ir('usuarios', { filtro: 'novos' })} />
        <NumeroDia rotulo="Recebido hoje" numero={nm.valorPago} formato={reais} nota={nm.valorPago.hoje === null ? (p.avisoCobrancas ? 'cobranças indisponíveis' : undefined) : `${inteiro(nm.pagaram.hoje)} ${nm.pagaram.hoje === 1 ? 'pagamento' : 'pagamentos'}`} aoClicar={() => nav.ir('cobrancas')} />
      </div>
    </section>

    <div className="a3-grade a3-grade--12">
      <div style={{ gridColumn: 'span 7' }}><LinhaDoDia quadro={quadro} /></div>
      <div style={{ gridColumn: 'span 5' }}><Monitor /></div>
    </div>

    <Listas quadro={quadro} />
  </div>
}

function NumeroDia({ rotulo, numero, valor, formato = inteiro, nota, vivo, aoClicar }: { rotulo: string; numero?: Numero; valor?: number | null; formato?: (n: number) => string; nota?: string; vivo?: boolean; aoClicar?: () => void }) {
  const hoje = valor !== undefined ? valor : numero?.hoje ?? null
  const ontem = numero?.ontem ?? null
  return <div className="a3-metrica">
    {aoClicar && <button type="button" className="a3-metrica__ir" onClick={aoClicar} aria-label={`${rotulo}: ver detalhes`} />}
    <span className="a3-rotulo">{vivo && <i className="a3-ponto a3-ponto--vivo" style={{ marginRight: 6, verticalAlign: 1 }} aria-hidden="true" />}{rotulo}</span>
    <span className="a3-metrica__valor">{hoje === null ? <SeloQualidade q="indisponivel" /> : formato(hoje)}</span>
    <span className="a3-metrica__linha">
      {numero && <span>{ontem === null ? 'ontem não medido' : <>ontem {formato(ontem)}{hoje !== null && hoje !== ontem && <span className={hoje > ontem ? 'a3-variacao--bom' : 'a3-variacao--ruim'}>{hoje > ontem ? ' ↑' : ' ↓'}</span>}</>}</span>}
      {nota && <span>{nota}</span>}
    </span>
  </div>
}

/* ───────────── Linha do dia ───────────── */

interface Evento { em: string; tipo: 'cadastro' | 'estudo' | 'pagou' | 'nova' | 'renovou' | 'cancelou' | 'pix'; id: string; nome: string; texto: ReactNode }

function LinhaDoDia({ quadro }: { quadro: ReturnType<typeof quadroDoDia<LinhaUsuario>> }) {
  const p = usarPainel()
  const nav = usarNav()
  const [limite, definirLimite] = useState(14)
  const eventos = useMemo(() => {
    const lista: Evento[] = []
    const hoje = quadro.hoje
    for (const u of p.usuarios ?? []) if (diaSP(u.criado_em) === hoje) lista.push({ em: u.criado_em, tipo: 'cadastro', id: u.id_usuario, nome: nomeDe(u), texto: <>criou a conta{u.origem ? <span className="a3-mudo"> · veio de {rotuloOrigem(u.origem)}</span> : ''}</> })
    for (const f of quadro.estudaram) if (f.em) lista.push({ em: f.em, tipo: 'estudo', id: f.pessoa.id_usuario, nome: nomeDe(f.pessoa), texto: textoEstudo(f) })
    const mov = (m: MovimentoDinheiro, tipo: Evento['tipo'], verbo: string) => m.em && lista.push({ em: m.em, tipo, id: m.id_usuario, nome: m.nome ?? m.email ?? 'Sem nome', texto: <>{verbo} <span className="a3-mudo">· {rotuloPlano(m.plano)} · {rotuloMeio(m.meio)}{m.valor !== null ? ` · ${reais(m.valor)}` : ''}</span></> })
    quadro.novasAssinaturas.forEach(m => mov(m, 'nova', 'assinou pela primeira vez'))
    quadro.renovacoes.forEach(m => mov(m, 'renovou', 'renovou'))
    quadro.voltaram.forEach(m => mov(m, 'nova', 'voltou a assinar'))
    quadro.cancelamentos.forEach(m => mov(m, 'cancelou', 'desligou a renovação'))
    quadro.pixPendentes.filter(m => m.em && diaSP(m.em) === hoje).forEach(m => mov(m, 'pix', 'gerou um Pix e ainda não pagou'))
    return lista.sort((a, b) => b.em.localeCompare(a.em))
  }, [p.usuarios, quadro])
  const marca: Record<Evento['tipo'], string> = { cadastro: 'tinta', estudo: '', pagou: 'ok', nova: 'ok', renovou: 'ok', cancelou: 'erro', pix: '' }
  return <Painel titulo="Linha do dia" descricao="Tudo o que aconteceu hoje, do mais recente ao mais antigo: cadastros, estudo e dinheiro." justo={false}>
    {!p.usuarios ? <Carregando linhas={6} /> : !eventos.length ? <Estado compacto icone="relogio" titulo="Nada aconteceu hoje ainda" texto="A linha se preenche sozinha a cada atualização." /> : <>
      <ol className="a3-tempo">{eventos.slice(0, limite).map((e, i) => <li key={`${e.id}-${e.tipo}-${i}`}>
        <time dateTime={e.em}>{horario(e.em)}</time>
        <span className="a3-tempo__marca"><i className={marca[e.tipo]} /></span>
        <div className="a3-tempo__texto"><button type="button" className="a3-link" style={{ textDecoration: 'none', fontWeight: 600 }} onClick={() => nav.abrirPessoa(e.id)}>{e.nome}</button> {e.texto}</div>
      </li>)}</ol>
      {eventos.length > limite && <button type="button" className="a3-botao a3-botao--suave a3-botao--pequeno" onClick={() => definirLimite(l => l + 20)}>Mais {Math.min(20, eventos.length - limite)} de {eventos.length - limite}</button>}
    </>}
  </Painel>
}

function textoEstudo(f: FeitoHoje<LinhaUsuario>): ReactNode {
  const partes: string[] = []
  if (f.questoes > 0) partes.push(`${f.questoes} ${f.questoes === 1 ? 'questão' : 'questões'}${f.tentativas > f.questoes ? ` (${f.tentativas} tentativas)` : ''}`)
  if (f.flashcards) partes.push('flashcards')
  if (f.resumo) partes.push(`leu “${tituloResumo(f.resumo.capitulo)}”${f.resumo.extra ? ` (${f.resumo.extra})` : ''}`)
  return <>estudou hoje <span className="a3-mudo">· {partes.join(' · ') || 'respondeu (o total ainda não sincronizou)'}</span></>
}

/* ───────────── Monitor de quem está online ───────────── */

function Monitor() {
  const p = usarPainel()
  const nav = usarNav()
  const [filtro, definirFiltro] = useState<FiltroVivo>('todos')
  const [busca, definirBusca] = useState('')
  const online = (p.usuarios ?? []).filter(u => u.online)
  const t = normalizar(busca.trim())
  const passa = (u: LinhaUsuario) => filtro === 'todos' || (filtro === 'assinantes' && !!u.plano_vigente) || (filtro === 'nao' && !u.plano_vigente && !u.administrador) || (filtro === 'planos' && viuPlanos(p.sinais.get(u.id_usuario)))
  const lista = online.filter(u => passa(u) && combina([u.nome, u.email], t)).sort((a, b) => (b.pagina_em ?? '').localeCompare(a.pagina_em ?? ''))
  return <Painel titulo={<><i className="a3-ponto a3-ponto--vivo" style={{ marginRight: 8 }} aria-hidden="true" />{online.length} online agora</>} descricao="Quem mudou de página há menos tempo vem primeiro. Toque para abrir a ficha." justo>
    <div style={{ display: 'grid', gap: 10, padding: '0 20px 12px' }}>
      <Segmento rotulo="Filtrar quem está online" valor={filtro} aoMudar={definirFiltro} opcoes={[['todos', 'Todos'], ['assinantes', 'Assinantes'], ['nao', 'Não assinantes'], ['planos', 'Viram os planos']]} />
      {online.length > 6 && <Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar por nome" />}
    </div>
    {!p.usuarios ? <div style={{ padding: '0 20px 20px' }}><Carregando /></div> : !lista.length ? <div style={{ padding: '0 20px 20px' }}><Estado compacto icone="pessoas" titulo={online.length ? 'Ninguém neste filtro' : 'Ninguém online agora'} /></div> :
      <ul className="a3-monitor">{lista.map(u => {
        const s = p.sinais.get(u.id_usuario)
        return <li key={u.id_usuario}><button type="button" onClick={() => nav.abrirPessoa(u.id_usuario)}>
          <span className="a3-avatar">{iniciais(u.nome ?? u.email)}<i className="a3-ponto a3-ponto--vivo" /></span>
          <span className="a3-monitor__texto">
            <span className="a3-monitor__nome">{nomeDe(u)}{u.plano_vigente && <Selo>Assinante</Selo>}{viuPlanos(s) && !u.plano_vigente && <Selo tom="aviso">Viu os planos</Selo>}</span>
            <span className="a3-monitor__faz"><Faz u={u} /></span>
            <span className="a3-mudo a3-pequeno">{u.pagina_em ? `nesta página ${haQuanto(u.pagina_em)}` : ''}{u.respondidas_hoje ? ` · ${u.respondidas_hoje} questões hoje` : ''}{u.aparelho ? ` · ${u.aparelho}` : ''}</span>
          </span>
        </button></li>
      })}</ul>}
  </Painel>
}

/* ───────────── Listas do dia ───────────── */

function Listas({ quadro }: { quadro: ReturnType<typeof quadroDoDia<LinhaUsuario>> }) {
  const p = usarPainel()
  const nav = usarNav()
  const [lista, definirLista] = useState<Lista>('estudaram')
  const [busca, definirBusca] = useState('')
  const t = normalizar(busca.trim())
  const nm = quadro.numeros
  const biblioteca = useMemo(() => (p.usuarios ?? []).filter(u => (u.pagina ?? '').startsWith('/resumos') && (u.online || (u.pagina_em && diaSP(u.pagina_em) === quadro.hoje)))
    .sort((a, b) => Number(b.online) - Number(a.online) || (b.pagina_em ?? '').localeCompare(a.pagina_em ?? '')), [p.usuarios, quadro.hoje])
  const abas: Array<[Lista, string, number | null]> = [
    ['estudaram', 'Estudaram hoje', quadro.estudaram.length], ['entraram', 'Entraram sem estudar', quadro.entraram.length], ['novos', 'Recém-cadastrados', quadro.recemCadastrados.length],
    ['semana', 'Mais ativos na semana', quadro.maisAtivosSemana.length], ['dinheiro', 'Dinheiro hoje', quadro.pagaram.length + quadro.cancelamentos.length + quadro.pixPendentes.length], ['biblioteca', 'Biblioteca hoje', biblioteca.length],
  ]
  const abrir = (u: LinhaUsuario) => nav.abrirPessoa(u.id_usuario)
  const acoes = (u: LinhaUsuario) => <span style={{ display: 'inline-flex', gap: 4 }}>
    <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => nav.abrirPessoa(u.id_usuario)}>Ficha</button>
    {!u.administrador && <button type="button" className="a3-botao a3-botao--fantasma a3-botao--pequeno" onClick={() => nav.abrirPessoa(u.id_usuario, 'carta')}><Icone nome="carta" tamanho={14} />Carta</button>}
  </span>
  const vazio = (texto: string) => <div style={{ padding: 20 }}><Estado compacto titulo={texto} /></div>

  const colEstudo: Array<Coluna<FeitoHoje<LinhaUsuario>>> = [
    { id: 'p', titulo: 'Pessoa', celula: f => <Pessoa u={f.pessoa} />, ordem: f => nomeDe(f.pessoa) },
    { id: 'q', titulo: 'Questões hoje', numero: true, celula: f => <>{inteiro(f.questoes)}{f.tentativas > f.questoes && <span className="a3-sub">{f.tentativas} tentativas</span>}</>, ordem: f => f.questoes, rotuloCelular: 'Questões hoje' },
    { id: 'o', titulo: 'Também', celula: f => [f.flashcards ? `flashcards${p.sinais.get(f.pessoa.id_usuario)?.cripta_andar ? ` (andar ${p.sinais.get(f.pessoa.id_usuario)!.cripta_andar})` : ''}` : null, f.resumo ? `resumo “${tituloResumo(f.resumo.capitulo)}”${f.resumo.extra ? ` ${f.resumo.extra}` : ''}` : null].filter(Boolean).join(' · ') || <span className="fraco">só questões</span>, rotuloCelular: 'Também' },
    { id: 'a', titulo: 'Acerto geral', numero: true, soLargo: true, celula: f => { const a = acertoReal(f.pessoa) ?? acertoAposRevisao(f.pessoa); return a === null ? '—' : `${a}%` }, ordem: f => acertoReal(f.pessoa) ?? acertoAposRevisao(f.pessoa) },
    { id: 'e', titulo: 'Última atividade', numero: true, celula: f => f.em ? horario(f.em) : '—', ordem: f => f.em, rotuloCelular: 'Última' },
    { id: 'x', titulo: '', celula: f => acoes(f.pessoa), soLargo: true },
  ]
  const colPessoa = (extra: Array<Coluna<LinhaUsuario>>): Array<Coluna<LinhaUsuario>> => [{ id: 'p', titulo: 'Pessoa', celula: u => <Pessoa u={u} />, ordem: u => nomeDe(u) }, ...extra, { id: 'x', titulo: '', celula: acoes, soLargo: true }]

  return <section className="a3-painel" aria-label="Listas do dia">
    <div className="a3-abas-locais" role="tablist" aria-label="Listas do dia">
      {abas.map(([id, r, n]) => <button key={id} type="button" role="tab" aria-selected={lista === id} onClick={() => { definirLista(id); definirBusca('') }}>{r}{n !== null && <span className="a3-cont">{n}</span>}</button>)}
    </div>
    {lista !== 'dinheiro' && <div className="a3-filtros"><Busca valor={busca} aoMudar={definirBusca} rotulo="Buscar por nome ou e-mail" /></div>}
    {!p.usuarios && lista !== 'dinheiro' ? <div style={{ padding: 20 }}><Carregando /></div> : <>
      {lista === 'estudaram' && <Tabela rotulo="Estudaram hoje" linhas={quadro.estudaram.filter(f => combina([f.pessoa.nome, f.pessoa.email], t))} chave={f => f.pessoa.id_usuario} colunas={colEstudo} aoAbrir={f => abrir(f.pessoa)} vazio={vazio('Ninguém estudou hoje ainda.')} />}
      {lista === 'entraram' && <Tabela rotulo="Entraram sem estudar" linhas={quadro.entraram.filter(x => combina([x.pessoa.nome, x.pessoa.email], t))} chave={x => x.pessoa.id_usuario} aoAbrir={x => abrir(x.pessoa)} vazio={vazio('Ninguém entrou hoje sem estudar.')}
        colunas={[{ id: 'p', titulo: 'Pessoa', celula: x => <Pessoa u={x.pessoa} />, ordem: x => nomeDe(x.pessoa) }, { id: 'f', titulo: 'Página', celula: x => <Faz u={x.pessoa} />, rotuloCelular: 'Página' },
          { id: 't', titulo: 'No total', numero: true, celula: x => inteiro(x.pessoa.respondidas), ordem: x => x.pessoa.respondidas, soLargo: true }, { id: 'e', titulo: 'Visto às', numero: true, celula: x => x.em ? horario(x.em) : '—', ordem: x => x.em, rotuloCelular: 'Visto às' }, { id: 'x', titulo: '', celula: x => acoes(x.pessoa), soLargo: true }]} />}
      {lista === 'novos' && <Tabela rotulo="Recém-cadastrados" linhas={quadro.recemCadastrados.filter(u => combina([u.nome, u.email], t))} chave={u => u.id_usuario} aoAbrir={abrir} vazio={vazio('Ninguém se cadastrou nas últimas duas semanas.')}
        colunas={colPessoa([{ id: 'c', titulo: 'Chegou', celula: u => <>{diaSP(u.criado_em) === quadro.hoje ? `hoje, ${horario(u.criado_em)}` : haQuanto(u.criado_em)}{u.origem && <span className="a3-sub">de {rotuloOrigem(u.origem)}</span>}</>, ordem: u => u.criado_em, rotuloCelular: 'Chegou' },
          { id: 's', titulo: 'Situação', celula: u => u.respondidas > 0 ? <Situacao tom="ok">já fez {inteiro(u.respondidas)} {u.respondidas === 1 ? 'questão' : 'questões'}</Situacao> : novoParado(u) ? <Situacao tom="erro">não começou e parou</Situacao> : <Situacao tom="neutro">ainda não começou</Situacao>, ordem: u => u.respondidas, rotuloCelular: 'Situação' }])} />}
      {lista === 'semana' && <Tabela rotulo="Mais ativos na semana" linhas={quadro.maisAtivosSemana.filter(u => combina([u.nome, u.email], t))} chave={u => u.id_usuario} aoAbrir={abrir} vazio={vazio('Ninguém respondeu questões nos últimos 7 dias.')}
        colunas={colPessoa([{ id: 's', titulo: 'Na semana', numero: true, celula: u => inteiro(u.respondidas_7d), ordem: u => u.respondidas_7d, rotuloCelular: 'Na semana' },
          { id: 'h', titulo: 'Hoje', numero: true, celula: u => inteiro(u.respondidas_hoje ?? 0), ordem: u => u.respondidas_hoje ?? 0, rotuloCelular: 'Hoje' },
          { id: 'a', titulo: 'Acerto real', numero: true, celula: u => { const a = acertoReal(u) ?? acertoAposRevisao(u); return a === null ? '—' : `${a}%` }, ordem: u => acertoReal(u) ?? acertoAposRevisao(u), soLargo: true },
          { id: 't', titulo: 'No total', numero: true, celula: u => inteiro(u.respondidas), ordem: u => u.respondidas, soLargo: true }])} ordemInicial={{ coluna: 's', sentido: 'desc' }} />}
      {lista === 'biblioteca' && <Tabela rotulo="Biblioteca hoje" linhas={biblioteca.filter(u => combina([u.nome, u.email], t))} chave={u => u.id_usuario} aoAbrir={abrir} vazio={vazio('Ninguém passou por um resumo hoje ainda.')}
        colunas={colPessoa([{ id: 'r', titulo: 'Resumo', celula: u => <Faz u={u} />, rotuloCelular: 'Resumo' }, { id: 'q', titulo: 'Quando', numero: true, celula: u => u.online ? <Situacao tom="vivo">lendo agora</Situacao> : u.pagina_em ? horario(u.pagina_em) : '—', ordem: u => u.pagina_em ?? '', rotuloCelular: 'Quando' }])} />}
      {lista === 'dinheiro' && <Dinheiro quadro={quadro} />}
    </>}
    {lista === 'novos' && quadro.recemCadastrados.length > 0 && <div className="a3-paginacao"><span>Contas criadas nos últimos 14 dias.</span><a className="a3-link" href={nav.link('usuarios', { filtro: 'novos' })} onClick={e => { e.preventDefault(); nav.ir('usuarios', { filtro: 'novos' }) }}>Abrir no Explorador</a></div>}
    {lista === 'semana' && <div className="a3-paginacao"><span>{nm.estudaram.hoje !== null ? `${inteiro(p.resumo?.ativos_7d ?? null)} pessoas ativas em 7 dias, ${inteiro(p.resumo?.ativos_30d ?? null)} em 30.` : ''}</span></div>}
  </section>
}

function Dinheiro({ quadro }: { quadro: ReturnType<typeof quadroDoDia<LinhaUsuario>> }) {
  const p = usarPainel()
  const nav = usarNav()
  const grupos: Array<[string, MovimentoDinheiro[], string, Numero | null]> = [
    ['Pagaram hoje', quadro.pagaram, 'Nenhum pagamento recebido hoje ainda.', quadro.numeros.pagaram],
    ['Primeiras assinaturas', quadro.novasAssinaturas, 'Nenhuma assinatura nova hoje.', quadro.numeros.novasAssinaturas],
    ['Renovações', quadro.renovacoes, 'Nenhuma renovação hoje.', quadro.numeros.renovacoes],
    ['Voltaram a assinar', quadro.voltaram, 'Ninguém voltou hoje.', quadro.numeros.voltaram],
    ['Desligaram a renovação', quadro.cancelamentos, 'Ninguém desligou a renovação hoje (seguem com acesso até o fim do período).', quadro.numeros.cancelamentos],
    ['Pix pendentes', quadro.pixPendentes, 'Nenhum Pix aguardando pagamento.', null],
  ]
  return <div className="a3-pilha" style={{ padding: '16px 20px 20px' }}>
    {p.avisoCobrancas && <SeloQualidade q="estimado" />}
    <div className="a3-grade a3-grade--3">{grupos.map(([titulo, lista, vazio, n]) => <div key={titulo} className="a3-dinheiro-bloco">
      <div className="a3-secao-titulo"><span className="a3-titulo-3">{titulo}</span><span className="a3-mudo a3-pequeno">{lista.length}{n && n.ontem !== null ? ` · ontem ${n.ontem}` : ''}</span></div>
      {!lista.length ? <p className="a3-mudo a3-pequeno">{vazio}</p> : <ul className="a3-movimentos">{lista.slice(0, 8).map((m, i) => <li key={`${m.id_usuario}-${i}`}>
        <button type="button" onClick={() => nav.abrirPessoa(m.id_usuario, 'assinatura')}><b>{m.nome ?? m.email ?? 'Sem nome'}</b><span>{rotuloPlano(m.plano)} · {rotuloMeio(m.meio)}{m.em ? ` · ${horario(m.em)}` : ''}</span></button>
        <span className="num">{m.valor !== null ? reais(m.valor) : '—'}</span>
      </li>)}</ul>}
    </div>)}</div>
  </div>
}
