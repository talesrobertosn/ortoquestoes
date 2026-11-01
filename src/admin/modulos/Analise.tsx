import { useMemo, useState } from 'react'
import { PROVAS, rotuloEtapa, rotuloProva } from '../../conta/perfilEstudo'
import { acertoAposRevisao, acertoReal, baixarCsv, dataHora as dataHoraAntiga, porcentagem, rotuloOrigem } from '../../componentes/admin/formatos'
import { cobrancas as cobrancasDe } from '../../componentes/admin/receita'
import { SERVICO_GERAL, chaveServico, servicoConhecido } from '../../componentes/admin/servicosConhecidos'
import { usarRpc } from '../../componentes/admin/usarRpc'
import { cortarPeriodos, numerosDoPeriodo } from '../dados/metricas'
import { serieLimpa, usarFunil, usarRetencao, usarSerie } from '../dados/consultas'
import { usarPainel } from '../dados/painel'
import type { LinhaUsuario } from '../dados/pessoas'
import { usarNav } from '../nav'
import { PERIODOS, defParte } from '../rotas'
import { Icone } from '../ui/Icone'
import { diaDaSerie, inteiro, pct } from '../ui/formato'
import { Funil, Legenda, MapaCalor, Quadro, Ranking, SerieTempo } from '../ui/graficos'
import { Cabeca, Carregando, Estado, Faixa, Metrica, Painel, Segmento } from '../ui/kit'
import { Tabela } from '../ui/tabela'

/** Pessoas › Aquisição e ativação, Retenção e ritmo, Perfis e origem. */
export default function Analise() {
  const { estado } = usarNav()
  return estado.parte === 'retencao' ? <Retencao /> : estado.parte === 'perfis' ? <Perfis /> : <Aquisicao />
}

/* ───────────── Datas de São Paulo ───────────── */

const FUSO = 'America/Sao_Paulo'
const DIA_MS = 86_400_000
let fmt: Intl.DateTimeFormat | null = null
function emSP(d: Date) {
  fmt ??= new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
  const p = Object.fromEntries(fmt.formatToParts(d).map(x => [x.type, x.value]))
  const dia = `${p.year}-${p.month}-${p.day}`
  return { dia, hora: Number(p.hour) % 24, semana: new Date(`${dia}T12:00:00Z`).getUTCDay() }
}
const inicioSemana = (dia: string) => { const d = new Date(`${dia}T12:00:00Z`); return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DIA_MS).toISOString().slice(0, 10) }
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const nomeMes = (k: string, curto = false) => new Date(`${k}-15T12:00:00Z`).toLocaleDateString('pt-BR', curto ? { month: 'short', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' }).replace('.', '')

/** Contagem por semana (12) e por mês (12) de uma lista de instantes. */
function porPeriodos(instantes: Date[], hoje = new Date()) {
  const agora = emSP(hoje).dia
  const semanas = Array.from({ length: 12 }, (_, i) => inicioSemana(new Date(new Date(`${agora}T12:00:00Z`).getTime() - (11 - i) * 7 * DIA_MS).toISOString().slice(0, 10)))
  const [a, m] = agora.split('-').map(Number)
  const meses = Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(a, m - 1 - (11 - i), 15)).toISOString().slice(0, 7))
  const s = new Map(semanas.map(k => [k, 0])), ms = new Map(meses.map(k => [k, 0]))
  for (const t of instantes) { const { dia } = emSP(t); const k = inicioSemana(dia); if (s.has(k)) s.set(k, s.get(k)! + 1); const km = dia.slice(0, 7); if (ms.has(km)) ms.set(km, ms.get(km)! + 1) }
  return {
    semana: semanas.map(k => ({ chave: k, longo: `Semana de ${ddmm(k)}`, curto: ddmm(k), n: s.get(k)! })),
    mes: meses.map(k => ({ chave: k, longo: nomeMes(k), curto: nomeMes(k, true), n: ms.get(k)! })),
  }
}

/* ───────────── Aquisição e ativação ───────────── */

function Aquisicao() {
  const p = usarPainel()
  const nav = usarNav()
  const periodo = nav.estado.periodo
  const serieQ = usarSerie(periodo * 2)
  const { funil, carregando } = usarFunil()
  const [agrupar, definirAgrupar] = useState<'semana' | 'mes'>('semana')
  const cortes = useMemo(() => cortarPeriodos(serieLimpa(serieQ.dados), periodo), [serieQ.dados, periodo])
  const num = cortes ? numerosDoPeriodo(cortes) : null
  const ritmo = useMemo(() => {
    if (!p.usuariosReais || !p.reais) return null
    const primeira = new Map<string, Date>()
    for (const c of cobrancasDe(p.reais)) if (c.tipo === 'nova' && !primeira.has(c.id_usuario)) primeira.set(c.id_usuario, c.em)
    return { cadastros: porPeriodos(p.usuariosReais.map(u => new Date(u.criado_em)).filter(d => Number.isFinite(d.getTime()))), assinantes: porPeriodos([...primeira.values()]) }
  }, [p.usuariosReais, p.reais])
  const parte = defParte('crescimento')
  const rotulos = (cortes?.atual ?? []).map(d => ({ longo: diaDaSerie(d.dia, true), curto: diaDaSerie(d.dia) }))
  const cad = ritmo?.cadastros[agrupar], ass = ritmo?.assinantes[agrupar]
  const esteCad = cad?.[cad.length - 1]?.n ?? 0, esteAss = ass?.[ass.length - 1]?.n ?? 0
  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Pessoas" titulo={parte.rotulo} pergunta={parte.pergunta}
      acoes={<Segmento rotulo="Período" valor={periodo} aoMudar={d => nav.ajustar({ periodo: d })} opcoes={PERIODOS.map(d => [d, `${d} dias`] as [typeof d, string])} />} />
    <section className="a3-painel" aria-label="Aquisição no período">
      <div className="a3-faixa-metricas" style={{ '--colunas': 4 } as React.CSSProperties}>
        <Metrica metrica="cadastros" valor={num ? inteiro(num.cadastros.atual) : serieQ.carregando ? '…' : null} variacao={num?.cadastros} tendencia={cortes?.atual.map(d => d.cadastros)} />
        <Metrica metrica="estudaramDia" valor={num ? inteiro(num.estudaramDia.atual) : serieQ.carregando ? '…' : null} unidade="por dia" variacao={num?.estudaramDia} tendencia={cortes?.atual.map(d => d.ativos)} />
        <Metrica metrica="questoes" valor={num ? inteiro(num.questoes.atual) : serieQ.carregando ? '…' : null} variacao={num?.questoes} tendencia={cortes?.atual.map(d => d.respostas)} />
        <Metrica rotulo={`Conversão · ${agrupar === 'semana' ? 'esta semana' : 'este mês'}`} valor={ritmo ? pct(porcentagem(esteAss, esteCad)) : null} qualidade="derivado"
          nota={`${esteAss} ${esteAss === 1 ? 'assinante novo' : 'assinantes novos'} sobre ${esteCad} ${esteCad === 1 ? 'cadastro' : 'cadastros'} (correlação no tempo, não a mesma pessoa)`} />
      </div>
    </section>

    <Quadro titulo="Cadastros e pessoas que estudaram, por dia" descricao={`Últimos ${periodo} dias, mesmo eixo (são pessoas). Hoje ainda está em andamento.`} fonte="serie_diaria_admin · dia de São Paulo" qualidade="confirmado"
      legenda={<Legenda itens={[{ nome: 'Pessoas que estudaram', chave: 'linha' }, { nome: 'Cadastros', chave: 'serie2' }]} />}
      estado={serieQ.carregando && !serieQ.dados ? <Carregando linhas={5} /> : !cortes ? <Estado compacto tipo="erro" titulo="Série indisponível" /> : undefined}
      tabela={cortes ? { cabecalho: ['Dia', 'Cadastros', 'Estudaram', 'Questões'], linhas: cortes.atual.map(d => [diaDaSerie(d.dia, true), d.cadastros, d.ativos, inteiro(d.respostas)]) } : null}>
      {cortes && <SerieTempo descricao="Cadastros e pessoas que estudaram por dia" rotulos={rotulos} series={[{ nome: 'Cadastros', tipo: 'barra', estilo: 2, valores: cortes.atual.map(d => d.cadastros) }, { nome: 'Estudaram', tipo: 'linha', valores: cortes.atual.map(d => d.ativos) }]} />}
    </Quadro>

    <div className="a3-grade a3-grade--12">
      <div style={{ gridColumn: 'span 7' }}>
        <Painel titulo="Funil de ativação" descricao="Todas as contas desde o começo. Cada taxa é sobre a etapa anterior; a maior queda fica em vermelho." >
          {carregando && !funil ? <Carregando linhas={6} /> : !funil ? <Estado compacto tipo="erro" titulo="Funil indisponível" texto={p.erroDados || 'funil_admin não respondeu.'} /> :
            <Funil etapas={[{ nome: 'Cadastraram', valor: funil.cadastrados }, { nome: 'Confirmaram o e-mail', valor: funil.confirmaram, base: 'cadastros' },
              { nome: 'Responderam a 1ª questão', valor: funil.responderam, base: 'quem confirmou' }, { nome: 'Passaram de 50 questões', valor: funil.passaram_50, base: 'quem começou' },
              { nome: 'Passaram de 500', valor: funil.passaram_500, base: 'quem passou de 50' }, { nome: 'Assinaram', valor: funil.assinaram, base: 'quem respondeu a 1ª questão', sobre: 2 }]} />}
          {funil && <p className="a3-mudo a3-pequeno" style={{ marginTop: 12 }}>Etapas cumulativas: quem passou de 500 também passou de 50. Assinar não exige 500 questões, por isso a taxa de quem assinou é sobre quem começou a estudar.</p>}
        </Painel>
      </div>
      <div style={{ gridColumn: 'span 5' }}>
        <Quadro titulo={`Cadastros e assinantes novos por ${agrupar === 'semana' ? 'semana' : 'mês'}`} descricao="Assinante novo = primeira compra paga de cada pessoa. Semana de segunda a domingo."
          fonte="listar_usuarios_admin + listar_assinaturas_admin · contas de teste fora" qualidade="derivado"
          acoes={<Segmento rotulo="Agrupar por" valor={agrupar} aoMudar={definirAgrupar} opcoes={[['semana', 'Semana'], ['mes', 'Mês']]} />}
          legenda={<Legenda itens={[{ nome: 'Cadastros', chave: 'linha' }, { nome: 'Assinantes novos', chave: 'acento' }]} />}
          estado={!ritmo ? <Carregando linhas={4} /> : undefined}
          tabela={cad && ass ? { cabecalho: [agrupar === 'semana' ? 'Semana' : 'Mês', 'Cadastros', 'Assinantes novos'], linhas: cad.map((c, i) => [c.longo, c.n, ass[i].n]) } : null}>
          {cad && ass && <SerieTempo descricao="Cadastros e assinantes novos por período" altura={200} rotulos={cad.map(c => ({ longo: c.longo, curto: c.curto }))}
            series={[{ nome: 'Cadastros', tipo: 'area', valores: cad.map(c => c.n) }, { nome: 'Assinantes novos', tipo: 'linha', estilo: 'acento', valores: ass.map(c => c.n) }]} />}
        </Quadro>
      </div>
    </div>
  </div>
}

/* ───────────── Retenção e ritmo ───────────── */

const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const FAIXAS: Array<[string, number, number]> = [['0h–6h', 0, 6], ['6h–12h', 6, 12], ['12h–18h', 12, 18], ['18h–24h', 18, 24]]

function grade(instantes: Date[]) {
  const g = Array.from({ length: 7 }, () => [0, 0, 0, 0])
  for (const t of instantes) { const { hora, semana } = emSP(t); g[(semana + 6) % 7][FAIXAS.findIndex(([, a, b]) => hora >= a && hora < b)]++ }
  return g
}

function Retencao() {
  const p = usarPainel()
  const q = usarRetencao()
  const [base, definirBase] = useState<'cadastros' | 'assinantes'>('cadastros')
  const parte = defParte('retencao')
  const coortes = Array.isArray(q.dados) ? q.dados.map(c => ({ semana: String(c.semana).slice(0, 10), cadastros: Number(c.cadastros), e1: Number(c.estudaram_1a_semana), v2: Number(c.voltaram_2a_semana) })) : null
  const ritmo = useMemo(() => {
    if (!p.usuariosReais || !p.reais) return null
    const primeira = new Map<string, Date>()
    for (const c of cobrancasDe(p.reais)) if (c.tipo === 'nova' && !primeira.has(c.id_usuario)) primeira.set(c.id_usuario, c.em)
    const cad = p.usuariosReais.map(u => new Date(u.criado_em)).filter(d => Number.isFinite(d.getTime()))
    return { cadastros: { grade: grade(cad), total: cad.length }, assinantes: { grade: grade([...primeira.values()]), total: primeira.size } }
  }, [p.usuariosReais, p.reais])
  const r = ritmo?.[base]
  const max = r ? Math.max(1, ...r.grade.flat()) : 1
  const util = r ? r.grade.slice(0, 5).flat().reduce((s, n) => s + n, 0) / 5 : 0
  const fds = r ? r.grade.slice(5).flat().reduce((s, n) => s + n, 0) / 2 : 0
  const adocao = useMemo(() => {
    const u = p.usuariosReais
    if (!u) return null
    const s = p.sinais
    return { contas: u.length, questoes: u.filter(x => x.respondidas > 0).length, flashcards: u.filter(x => (s.get(x.id_usuario)?.flashcards_unicos ?? 0) > 0).length, resumos: u.filter(x => (x.pagina ?? '').startsWith('/resumos')).length, semana: u.filter(x => x.respondidas_7d > 0).length, planos: u.filter(x => !!s.get(x.id_usuario)?.planos_ultima).length, temSinais: s.size > 0 }
  }, [p.usuariosReais, p.sinais])
  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Pessoas" titulo={parte.rotulo} pergunta={parte.pergunta} />
    <div className="a3-grade a3-grade--12">
      <div style={{ gridColumn: 'span 7' }}>
        <Quadro titulo="Coortes semanais" descricao="Cada linha é uma semana de cadastro. A porcentagem é sempre sobre os cadastros daquela semana (o denominador da linha)." fonte="retencao_admin" qualidade="derivado"
          estado={q.carregando && !q.dados ? <Carregando linhas={6} /> : !coortes ? <Estado compacto tipo="erro" titulo="Retenção indisponível" texto={p.erroDados} /> : !coortes.length ? <Estado compacto titulo="Ainda não há semanas completas" /> : undefined}
          tabela={coortes ? { cabecalho: ['Semana', 'Cadastros', 'Estudaram na 1ª', 'Voltaram na 2ª'], linhas: coortes.map(c => [ddmm(c.semana), c.cadastros, `${c.e1} (${pct(porcentagem(c.e1, c.cadastros))})`, `${c.v2} (${pct(porcentagem(c.v2, c.cadastros))})`]) } : null}>
          {coortes && <MapaCalor rotuloLinha="Semana de cadastro" extra="Cadastros" colunas={['Estudaram na 1ª semana', 'Voltaram na 2ª semana']}
            linhas={coortes.map(c => ({ nome: ddmm(c.semana), extra: inteiro(c.cadastros), celulas: [c.e1, c.v2].map(v => c.cadastros ? { intensidade: v / c.cadastros, texto: `${Math.round((v / c.cadastros) * 100)}%`, titulo: `${v} de ${c.cadastros}` } : { intensidade: null, texto: '—' }) }))} />}
        </Quadro>
      </div>
      <div style={{ gridColumn: 'span 5' }}>
        <Painel titulo="Adoção das ferramentas" descricao="Contas reais (sem as de teste), desde o começo">
          {!adocao ? <Carregando linhas={5} /> : <>
            <Ranking formato={n => `${inteiro(n)} · ${pct(porcentagem(n, adocao.contas))}`} itens={[
              { nome: 'Responderam questões', valor: adocao.questoes }, { nome: 'Ativas na semana', valor: adocao.semana },
              ...(adocao.temSinais ? [{ nome: 'Usaram flashcards', valor: adocao.flashcards }, { nome: 'Viram os planos (30 dias)', valor: adocao.planos }] : []),
              { nome: 'Última página num resumo', valor: adocao.resumos },
            ]} />
            <p className="a3-mudo a3-pequeno" style={{ marginTop: 12 }}>De {inteiro(adocao.contas)} contas. "Resumo" usa a última página registrada de cada pessoa (não é o histórico inteiro).{!adocao.temSinais ? ' Flashcards e planos aparecem com a parte 25.' : ''}</p>
          </>}
        </Painel>
      </div>
    </div>
    <Quadro titulo={base === 'cadastros' ? 'Quando as pessoas se cadastram' : 'Quando as pessoas assinam'} descricao="Dia da semana por faixa de horário, no relógio de São Paulo, desde o começo. A cor só reforça o número."
      fonte={base === 'cadastros' ? 'listar_usuarios_admin (criado_em)' : 'primeira compra paga de cada pessoa (receita.ts)'} qualidade="derivado"
      acoes={<Segmento rotulo="O que contar" valor={base} aoMudar={definirBase} opcoes={[['cadastros', 'Cadastros'], ['assinantes', 'Assinaturas']]} />}
      estado={!r ? <Carregando linhas={5} /> : !r.total ? <Estado compacto titulo={`Ainda não há ${base}`} /> : undefined}
      tabela={r ? { cabecalho: ['Dia', ...FAIXAS.map(f => f[0])], linhas: DIAS.map((d, i) => [d, ...r.grade[i]]) } : null}>
      {r && r.total > 0 && <>
        <MapaCalor rotuloLinha="Dia" colunas={FAIXAS.map(f => f[0])} linhas={DIAS.map((d, i) => ({ nome: d, celulas: r.grade[i].map(n => ({ intensidade: n / max, texto: inteiro(n) })) }))} />
        <p className="a3-mudo a3-pequeno">{util + fds === 0 ? '' : `Média por dia: ${fds.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} no fim de semana e ${util.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} em dia útil, de ${inteiro(r.total)} ${base} ao todo.`}</p>
      </>}
    </Quadro>
  </div>
}

/* ───────────── Perfis e origem ───────────── */

const ORDEM_ETAPAS = ['R1', 'R2', 'R3', 'Residente (ano não informado)', 'R4 / fellowship', 'Residente de mão', 'Ortopedista', 'Estudante', 'Outro', 'Não informado']
interface Grupo { rotulo: string; contas: number; ativos7d: number; comRespostas: number; respondidas: number; acertos: number; erros: number; acertos_primeira: number | null; erros_primeira: number | null; assinantes: number; novos30: number }
function agrupar(lista: LinhaUsuario[], chave: (u: LinhaUsuario) => string[]): Grupo[] {
  const mapa = new Map<string, Grupo>(), agora = Date.now()
  for (const u of lista) for (const rotulo of chave(u)) {
    const g = mapa.get(rotulo) ?? { rotulo, contas: 0, ativos7d: 0, comRespostas: 0, respondidas: 0, acertos: 0, erros: 0, acertos_primeira: null, erros_primeira: null, assinantes: 0, novos30: 0 }
    g.contas++; if (u.respondidas_7d > 0) g.ativos7d++; if (u.respondidas > 0) g.comRespostas++
    g.respondidas += Number(u.respondidas); g.acertos += Number(u.acertos); g.erros += Number(u.erros)
    if (u.acertos_primeira != null) { g.acertos_primeira = (g.acertos_primeira ?? 0) + Number(u.acertos_primeira); g.erros_primeira = (g.erros_primeira ?? 0) + Number(u.erros_primeira ?? 0) }
    if (u.plano_vigente) g.assinantes++
    if (agora - new Date(u.criado_em).getTime() < 30 * DIA_MS) g.novos30++
    mapa.set(rotulo, g)
  }
  return [...mapa.values()]
}
const etapaDe = (u: LinhaUsuario) => u.situacao ? rotuloEtapa(u.situacao, u.ano_residencia) : 'Não informado'
const provasDe = (u: LinhaUsuario) => (u.provas ?? '').split(',').filter(Boolean)
const acertoG = (g: Grupo) => acertoReal(g) ?? acertoAposRevisao(g)

interface Indicacao { id_convidado: string; convidado: string | null; email_convidado: string | null; id_padrinho: string; padrinho: string | null; email_padrinho: string | null; criado_em: string; confirmada_em: string | null; respondidas: number; dias_padrinho: number; dias_convidado: number }
interface ResumoIndicacoes { codigos: number; convidados: number; confirmados: number; confirmados_7d: number; dias_dados: number }

function Perfis() {
  const p = usarPainel()
  const [criterio, definirCriterio] = useState<'contas' | 'ativos'>('contas')
  const parte = defParte('perfis')
  const usuarios = p.usuariosReais
  const d = useMemo(() => {
    if (!usuarios) return null
    const base = criterio === 'ativos' ? usuarios.filter(u => u.respondidas_7d > 0) : usuarios
    const etapas = agrupar(base, u => [etapaDe(u)]).sort((a, b) => ORDEM_ETAPAS.indexOf(a.rotulo) - ORDEM_ETAPAS.indexOf(b.rotulo))
    const comProva = base.filter(u => provasDe(u).length).length
    const provas = PROVAS.map(([v]) => { const g = agrupar(base.filter(u => provasDe(u).includes(v)), () => [rotuloProva(v)])[0]; return { v, rotulo: rotuloProva(v), contas: g?.contas ?? 0, g } })
    const cruzamento = etapas.filter(e => e.rotulo !== 'Não informado').map(e => ({ etapa: e.rotulo, total: e.contas, porProva: PROVAS.map(([v]) => base.filter(u => etapaDe(u) === e.rotulo && provasDe(u).includes(v)).length) }))
    const ufs = agrupar(base.filter(u => u.uf), u => [u.uf!]).sort((a, b) => b.contas - a.contas)
    const comServico = base.filter(u => u.servico)
    const servicos = agrupar(comServico, u => [chaveServico(u.servico!, u.uf)]).sort((a, b) => b.contas - a.contas)
    const nomeServico = new Map<string, string>()
    for (const u of comServico) { const k = chaveServico(u.servico!, u.uf); nomeServico.set(k, k === SERVICO_GERAL ? SERVICO_GERAL : servicoConhecido(u.servico, u.uf) ?? nomeServico.get(k) ?? u.servico!.trim()) }
    const comOrigem = base.filter(u => u.origem)
    const origens = agrupar(comOrigem, u => [rotuloOrigem(u.origem!)]).sort((a, b) => b.contas - a.contas)
    const ids = new Set(base.map(u => u.id_usuario)), uf = new Map(base.map(u => [u.id_usuario, u.uf]))
    const locais = new Map<string, { nome: string; pessoas: Set<string> }>()
    for (const [id, s] of p.sinais) { if (!s.locais_trabalho || !ids.has(id)) continue; for (const l of s.locais_trabalho.split(' · ')) { const k = chaveServico(l, uf.get(id)); const g = locais.get(k) ?? { nome: k === SERVICO_GERAL ? SERVICO_GERAL : servicoConhecido(l, uf.get(id)) ?? l.trim(), pessoas: new Set<string>() }; g.pessoas.add(id); locais.set(k, g) } }
    return { base, etapas, comProva, provas, cruzamento, ufs, servicos, nomeServico, comOrigem: comOrigem.length, origens, informaram: base.filter(u => u.situacao).length,
      completos: base.filter(u => u.situacao && (u.situacao !== 'residente' || u.ano_residencia) && provasDe(u).length).length,
      locais: [...locais.values()].map(g => ({ nome: g.nome, valor: g.pessoas.size })).sort((a, b) => b.valor - a.valor), temOrigem: base.some(u => u.origem !== undefined), temMigracao: base.some(u => u.provas !== undefined) }
  }, [usuarios, criterio, p.sinais])
  const total = d?.base.length ?? 0
  const residentes = d?.etapas.filter(e => ['R1', 'R2', 'R3', 'Residente (ano não informado)'].includes(e.rotulo)).reduce((s, e) => s + e.contas, 0) ?? 0
  const topo = d ? [...d.provas].sort((a, b) => b.contas - a.contas)[0] : null
  return <div className="a3-pilha a3-pilha--larga">
    <Cabeca area="Pessoas" titulo={parte.rotulo} pergunta={parte.pergunta}
      acoes={<Segmento rotulo="Quem entra na conta" valor={criterio} aoMudar={definirCriterio} opcoes={[['contas', 'Todas as contas'], ['ativos', 'Ativas na semana']]} />} />
    {!d ? <Carregando linhas={8} /> : <>
      {!d.temMigracao && <Faixa tom="aviso">Para ver ano da residência e provas de interesse, rode a migração 202610060100_perfil_estudo_admin.sql.</Faixa>}
      <section className="a3-painel" aria-label="Resumo dos perfis">
        <div className="a3-faixa-metricas" style={{ '--colunas': 5 } as React.CSSProperties}>
          <Metrica rotulo="Perfis completos" valor={pct(porcentagem(d.completos, total))} qualidade="derivado" nota={`${d.completos} de ${total} com etapa e prova`} />
          <Metrica rotulo="Informaram a etapa" valor={pct(porcentagem(d.informaram, total))} qualidade="derivado" nota={`${d.informaram} contas`} />
          <Metrica rotulo="Residentes R1 a R3" valor={inteiro(residentes)} qualidade="derivado" nota={`${pct(porcentagem(residentes, d.informaram))} de quem informou`} />
          <Metrica rotulo="Prova mais escolhida" valor={topo?.contas ? topo.rotulo : '—'} qualidade="derivado" nota={topo?.contas ? `${topo.contas} pessoas` : 'ninguém respondeu'} />
          <Metrica rotulo="Estados · serviços" valor={`${d.ufs.length} · ${d.servicos.length}`} qualidade="derivado" nota={d.ufs[0] ? `mais contas: ${d.ufs[0].rotulo}` : 'sem UF'} />
        </div>
      </section>
      <Painel titulo="Por etapa de formação" descricao="Cada linha com o seu denominador (as contas da etapa)" justo
        acoes={<button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => baixarCsv(`ortoquestoes-etapas-${new Date().toISOString().slice(0, 10)}.csv`, ['Etapa', 'Contas', '% das contas', 'Novos em 30 dias', 'Ativos 7 dias (%)', 'Começaram (%)', 'Questões por conta', 'Acerto real (%)', 'Acerto após revisão (%)', 'Assinantes (%)'], d.etapas.map(e => [e.rotulo, e.contas, porcentagem(e.contas, total), e.novos30, porcentagem(e.ativos7d, e.contas), porcentagem(e.comRespostas, e.contas), Math.round(e.respondidas / (e.contas || 1)), acertoReal(e), acertoAposRevisao(e), porcentagem(e.assinantes, e.contas)]))}><Icone nome="baixar" tamanho={14} />CSV</button>}>
        <Tabela rotulo="Contas por etapa" linhas={d.etapas} chave={e => e.rotulo} compacta colunas={[
          { id: 'e', titulo: 'Etapa', celula: e => <span className="principal">{e.rotulo}</span> },
          { id: 'c', titulo: 'Contas', numero: true, celula: e => <>{inteiro(e.contas)} <span className="fraco">{pct(porcentagem(e.contas, total))}</span></>, ordem: e => e.contas, rotuloCelular: 'Contas' },
          { id: 'n', titulo: 'Novas 30 d', numero: true, celula: e => inteiro(e.novos30), ordem: e => e.novos30, soLargo: true },
          { id: 'a', titulo: 'Ativas 7 d', numero: true, celula: e => pct(porcentagem(e.ativos7d, e.contas)), ordem: e => porcentagem(e.ativos7d, e.contas), rotuloCelular: 'Ativas' },
          { id: 'q', titulo: 'Questões/conta', numero: true, celula: e => inteiro(Math.round(e.respondidas / (e.contas || 1))), ordem: e => e.respondidas / (e.contas || 1), soLargo: true },
          { id: 'r', titulo: 'Acerto real', numero: true, celula: e => acertoReal(e) === null ? '—' : `${acertoReal(e)}%`, ordem: e => acertoReal(e), rotuloCelular: 'Acerto' },
          { id: 's', titulo: 'Assinantes', numero: true, celula: e => pct(porcentagem(e.assinantes, e.contas)), ordem: e => porcentagem(e.assinantes, e.contas), rotuloCelular: 'Assinantes' },
        ]} />
      </Painel>
      <div className="a3-grade a3-grade--2">
        <Painel titulo="Provas de interesse" descricao={`Cada pessoa pode marcar mais de uma; % sobre as ${d.comProva} que responderam`}>
          <Ranking formato={n => `${n} · ${pct(porcentagem(n, d.comProva))}`} itens={d.provas.map(x => ({ nome: x.rotulo, valor: x.contas, detalhe: x.g ? `acerto ${acertoG(x.g) ?? '—'}%` : undefined }))} />
        </Painel>
        <Painel titulo="Estados" descricao="Os 10 com mais contas">
          {d.ufs.length ? <Ranking itens={d.ufs.slice(0, 10).map(u => ({ nome: u.rotulo, valor: u.contas, detalhe: `${u.ativos7d} ativas na semana` }))} /> : <p className="a3-mudo">Ninguém informou a UF ainda.</p>}
        </Painel>
      </div>
      {d.cruzamento.length > 0 && <Quadro titulo="Etapa × prova de interesse" descricao="Pessoas de cada etapa que marcaram cada prova; a intensidade é a parte da etapa." fonte="listar_usuarios_admin (situacao, provas)" qualidade="derivado">
        <MapaCalor rotuloLinha="Etapa" extra="Contas" colunas={PROVAS.map(([v]) => rotuloProva(v))}
          linhas={d.cruzamento.map(c => ({ nome: c.etapa, extra: inteiro(c.total), celulas: c.porProva.map(n => c.total ? { intensidade: n / c.total, texto: n ? `${n}` : '—', titulo: `${n} de ${c.total} (${pct(porcentagem(n, c.total))})` } : { intensidade: null, texto: '—' }) }))} />
      </Quadro>}
      {d.servicos.length > 0 && <Painel titulo="Serviços" descricao={`Variações do mesmo lugar ficam juntas. "${SERVICO_GERAL}" junta quem escreveu só "ortopedia" ou atua em vários lugares. Acerto só com 50 respostas ou mais.`} justo>
        <Tabela rotulo="Serviços" linhas={d.servicos} chave={s => s.rotulo} compacta porPagina={15} ordemInicial={{ coluna: 'c', sentido: 'desc' }} colunas={[
          { id: 's', titulo: 'Serviço', celula: s => <span className="principal">{d.nomeServico.get(s.rotulo)}</span>, ordem: s => d.nomeServico.get(s.rotulo) ?? s.rotulo },
          { id: 'c', titulo: 'Contas', numero: true, celula: s => inteiro(s.contas), ordem: s => s.contas, rotuloCelular: 'Contas' },
          { id: 'a', titulo: 'Ativas 7 d', numero: true, celula: s => inteiro(s.ativos7d), ordem: s => s.ativos7d, rotuloCelular: 'Ativas' },
          { id: 'q', titulo: 'Questões/conta', numero: true, celula: s => inteiro(Math.round(s.respondidas / (s.contas || 1))), ordem: s => s.respondidas / (s.contas || 1), soLargo: true },
          { id: 'r', titulo: 'Acerto real', numero: true, celula: s => s.respondidas >= 50 && acertoG(s) !== null ? `${acertoG(s)}%` : '—', ordem: s => s.respondidas >= 50 ? acertoG(s) : null, rotuloCelular: 'Acerto' },
          { id: 'x', titulo: 'Assinantes', numero: true, celula: s => inteiro(s.assinantes), ordem: s => s.assinantes, soLargo: true },
        ]} />
      </Painel>}
      <div className="a3-grade a3-grade--2">
        <Painel titulo="Outros locais de trabalho" descricao="Além do serviço principal; cada pessoa conta uma vez por local">
          {d.locais.length ? <Ranking itens={d.locais.slice(0, 12)} /> : <p className="a3-mudo">{p.sinais.size ? 'Ninguém marcou outros locais.' : 'Aparece com a parte 25 no Supabase.'}</p>}
        </Painel>
        <Painel titulo="De onde vêm os cadastros" descricao={d.temOrigem ? `${d.comOrigem} contas com origem registrada (desde a medição)` : 'Rode a migração 202610070100_origem_cadastro.sql para medir'}>
          {d.origens.length ? <Tabela rotulo="Origem dos cadastros" linhas={d.origens} chave={o => o.rotulo} compacta porPagina={10} colunas={[
            { id: 'o', titulo: 'Origem', celula: o => o.rotulo },
            { id: 'c', titulo: 'Contas', numero: true, celula: o => <>{o.contas} <span className="fraco">{pct(porcentagem(o.contas, d.comOrigem))}</span></>, ordem: o => o.contas, rotuloCelular: 'Contas' },
            { id: 'b', titulo: 'Começaram', numero: true, celula: o => inteiro(o.comRespostas), ordem: o => o.comRespostas, rotuloCelular: 'Começaram' },
            { id: 's', titulo: 'Assinaram', numero: true, celula: o => inteiro(o.assinantes), ordem: o => o.assinantes, rotuloCelular: 'Assinaram' },
          ]} /> : <p className="a3-mudo">{d.temOrigem ? 'Nenhuma conta nova com origem ainda. Use os links marcados (utm) no anúncio e na bio.' : ''}</p>}
        </Painel>
      </div>
      <Indicacoes />
    </>}
  </div>
}

const META = 20
function Indicacoes() {
  const p = usarPainel()
  const resumoQ = usarRpc<ResumoIndicacoes[]>(p.conta, 'resumo_indicacoes_admin')
  const listaQ = usarRpc<Indicacao[]>(p.conta, 'listar_indicacoes_admin')
  const [filtro, definirFiltro] = useState<'todas' | 'confirmadas' | 'pendentes'>('todas')
  const r = resumoQ.dados?.[0]
  const linhas = Array.isArray(listaQ.dados) ? listaQ.dados : null
  const padrinhos = useMemo(() => {
    const m = new Map<string, { nome: string; total: number; ok: number }>()
    for (const l of linhas ?? []) { const x = m.get(l.id_padrinho) ?? { nome: l.padrinho ?? l.email_padrinho ?? 'Sem nome', total: 0, ok: 0 }; x.total++; if (l.confirmada_em) x.ok++; m.set(l.id_padrinho, x) }
    return [...m.values()].sort((a, b) => b.total - a.total)
  }, [linhas])
  const convidados = Number(r?.convidados ?? linhas?.length ?? 0)
  const confirmados = Number(r?.confirmados ?? (linhas ?? []).filter(l => l.confirmada_em).length)
  const vis = (linhas ?? []).filter(l => filtro === 'todas' || (filtro === 'confirmadas' ? !!l.confirmada_em : !l.confirmada_em))
  return <Painel titulo="Indicações" descricao={`Quem chegou por convite. A indicação confirma quando o convidado responde ${META} questões; aí os dois ganham os dias.`} justo
    acoes={linhas && linhas.length > 0 ? <button type="button" className="a3-botao a3-botao--contorno a3-botao--pequeno" onClick={() => baixarCsv(`ortoquestoes-indicacoes-${new Date().toISOString().slice(0, 10)}.csv`, ['Convidado', 'E-mail do convidado', 'Indicado por', 'E-mail de quem indicou', 'Entrou em', 'Questões', 'Confirmada em', 'Dias para quem indicou', 'Dias para o convidado'], linhas.map(l => [l.convidado, l.email_convidado, l.padrinho, l.email_padrinho, dataHoraAntiga(l.criado_em), l.respondidas, l.confirmada_em ? dataHoraAntiga(l.confirmada_em) : '', l.dias_padrinho, l.dias_convidado]))}><Icone nome="baixar" tamanho={14} />CSV</button> : undefined}>
    <div className="a3-faixa-metricas" style={{ '--colunas': 4, borderBottom: '1px solid var(--a3-linha)' } as React.CSSProperties}>
      <Metrica rotulo="Chegaram por indicação" valor={inteiro(convidados)} qualidade="confirmado" nota={r ? `${r.codigos} pessoas pegaram o link` : undefined} />
      <Metrica rotulo="Confirmadas" valor={inteiro(confirmados)} qualidade="confirmado" nota={`${pct(porcentagem(confirmados, convidados))} chegaram às ${META}`} />
      <Metrica rotulo="Confirmadas na semana" valor={inteiro(Number(r?.confirmados_7d ?? 0))} qualidade="confirmado" />
      <Metrica rotulo="Dias de plano dados" valor={inteiro(Number(r?.dias_dados ?? 0))} qualidade="confirmado" nota="somando os dois lados" />
    </div>
    {listaQ.erro && !linhas ? <div style={{ padding: 20 }}><Estado compacto tipo="erro" titulo="Lista de indicações indisponível" texto="Rode a migração 202610120100_indicacoes_admin.sql." /></div>
      : !linhas ? <div style={{ padding: 20 }}><Carregando /></div> : !linhas.length ? <div style={{ padding: 20 }}><Estado compacto titulo="Ninguém chegou por indicação ainda" /></div> :
        <div className="a3-grade a3-grade--12" style={{ padding: 20 }}>
          <div style={{ gridColumn: 'span 4' }} className="a3-pilha"><span className="a3-rotulo">Quem mais indicou</span><Ranking itens={padrinhos.slice(0, 8).map(x => ({ nome: x.nome, valor: x.total, detalhe: `${x.ok} confirmadas` }))} /></div>
          <div style={{ gridColumn: 'span 8' }} className="a3-pilha">
            <Segmento rotulo="Situação dos convites" valor={filtro} aoMudar={definirFiltro} opcoes={[['todas', 'Todas'], ['confirmadas', 'Confirmadas'], ['pendentes', 'Pendentes']]} />
            <Tabela rotulo="Convites" linhas={vis} chave={l => l.id_convidado} compacta porPagina={10} colunas={[
              { id: 'c', titulo: 'Quem chegou', celula: l => <span style={{ display: 'grid' }}><span className="principal">{l.convidado ?? l.email_convidado}</span><span className="secundario">{dataHoraAntiga(l.criado_em)}</span></span> },
              { id: 'p', titulo: 'Indicado por', celula: l => l.padrinho ?? l.email_padrinho, rotuloCelular: 'Por' },
              { id: 'q', titulo: 'Questões', numero: true, celula: l => `${Number(l.respondidas)}/${META}`, ordem: l => Number(l.respondidas), rotuloCelular: 'Questões' },
              { id: 's', titulo: 'Situação', celula: l => l.confirmada_em ? <span style={{ color: 'var(--a3-ok)' }}>Confirmada · +{l.dias_padrinho}/+{l.dias_convidado} dias</span> : <span className="fraco">Pendente</span>, rotuloCelular: 'Situação' },
            ]} />
          </div>
        </div>}
  </Painel>
}
