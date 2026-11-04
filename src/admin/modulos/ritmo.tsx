import { useMemo, useState } from 'react'
import { cobrancas as cobrancasDe } from '../../componentes/admin/receita'
import { usarPainel } from '../dados/painel'
import { Colunas, Legenda, Quadro, ResumoColunas, type PontoColuna } from '../ui/graficos'
import { Carregando, Segmento } from '../ui/kit'

/* Datas no relógio de São Paulo (o resto do painel conta assim). */
const FUSO = 'America/Sao_Paulo'
const DIA_MS = 86_400_000
let fmt: Intl.DateTimeFormat | null = null
const diaSP = (d: Date) => {
  fmt ??= new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
  return fmt.format(d)
}
const somarDias = (dia: string, n: number) => new Date(new Date(`${dia}T12:00:00Z`).getTime() + n * DIA_MS).toISOString().slice(0, 10)
const segunda = (dia: string) => { const d = new Date(`${dia}T12:00:00Z`); return somarDias(dia, -((d.getUTCDay() + 6) % 7)) }
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const nomeMes = (k: string, curto = false) => new Date(`${k}-15T12:00:00Z`).toLocaleDateString('pt-BR', curto ? { month: 'short', timeZone: 'UTC' } : { month: 'long', year: 'numeric', timeZone: 'UTC' }).replace('.', '')

export type Agrupamento = 'dia' | 'semana' | 'mes'
const QUANTOS: Record<Agrupamento, number> = { dia: 30, semana: 12, mes: 12 }

/**
 * Contagem de instantes por dia (30), semana (12, de segunda a domingo) ou mês (12). O último ponto é o período
 * em andamento. Semanas e meses antes do primeiro registro (de qualquer das listas) ficam de fora: o gráfico
 * começa quando o site começou, sem uma fila de zeros à esquerda.
 */
export function contarPorPeriodo(listas: Date[][], agrupar: Agrupamento, agora = new Date()): PontoColuna[][] {
  const hoje = diaSP(agora)
  let chaves: string[]
  if (agrupar === 'dia') chaves = Array.from({ length: QUANTOS.dia }, (_, i) => somarDias(hoje, i - (QUANTOS.dia - 1)))
  else if (agrupar === 'semana') { const s = segunda(hoje); chaves = Array.from({ length: QUANTOS.semana }, (_, i) => somarDias(s, (i - (QUANTOS.semana - 1)) * 7)) }
  else { const [a, m] = hoje.split('-').map(Number); chaves = Array.from({ length: QUANTOS.mes }, (_, i) => new Date(Date.UTC(a, m - 1 - (QUANTOS.mes - 1 - i), 15)).toISOString().slice(0, 7)) }
  const chaveDe = (d: Date) => { const dia = diaSP(d); return agrupar === 'dia' ? dia : agrupar === 'semana' ? segunda(dia) : dia.slice(0, 7) }
  const contagens = listas.map(lista => { const m = new Map(chaves.map(k => [k, 0])); for (const t of lista) { const k = chaveDe(t); if (m.has(k)) m.set(k, m.get(k)! + 1) } return m })
  // Corta o começo vazio (só em semana e mês; nos 30 dias, um zero é informação).
  let inicio = 0
  if (agrupar !== 'dia') { const primeiro = chaves.findIndex(k => contagens.some(m => m.get(k)! > 0)); inicio = primeiro < 0 ? chaves.length - 1 : Math.min(primeiro, chaves.length - 2) }
  const usadas = chaves.slice(Math.max(0, inicio))
  const rotulo = (k: string) => agrupar === 'dia' ? { longo: `${SEMANA[new Date(`${k}T12:00:00Z`).getUTCDay()]}, ${ddmm(k)}`, curto: ddmm(k) }
    : agrupar === 'semana' ? { longo: `Semana de ${ddmm(k)} a ${ddmm(somarDias(k, 6))}`, curto: ddmm(k) }
    : { longo: nomeMes(k), curto: nomeMes(k, true) }
  return contagens.map(m => usadas.map((k, i) => ({ ...rotulo(k), partes: [m.get(k)!], parcial: i === usadas.length - 1 })))
}

const NOMES: Record<Agrupamento, { atual: string; anterior: string; unidade: string; titulo: string }> = {
  dia: { atual: 'Hoje', anterior: 'Ontem', unidade: 'dia', titulo: 'por dia · últimos 30 dias' },
  semana: { atual: 'Esta semana', anterior: 'Semana passada', unidade: 'semana', titulo: 'por semana · de segunda a domingo' },
  mes: { atual: 'Este mês', anterior: 'Mês passado', unidade: 'mês', titulo: 'por mês' },
}

/**
 * Cadastros e assinantes novos, lado a lado, cada um com a sua escala (Tales, 04/11/2026: por dia, por semana e por
 * mês, "fácil de visualizar"). Assinante novo = a primeira compra paga de cada pessoa; renovar não conta.
 */
export function CadastrosEAssinantes({ inicial = 'semana' }: { inicial?: Agrupamento }) {
  const p = usarPainel()
  const [agrupar, definirAgrupar] = useState<Agrupamento>(inicial)
  const dados = useMemo(() => {
    if (!p.usuariosReais || !p.reais) return null
    const primeira = new Map<string, Date>()
    for (const c of cobrancasDe(p.reais, p.cobrancas)) if (c.tipo === 'nova' && !primeira.has(c.id_usuario)) primeira.set(c.id_usuario, c.em)
    const cadastros = p.usuariosReais.map(u => new Date(u.criado_em)).filter(d => Number.isFinite(d.getTime()))
    const [cad, ass] = contarPorPeriodo([cadastros, [...primeira.values()]], agrupar)
    return { cad, ass }
  }, [p.usuariosReais, p.reais, p.cobrancas, agrupar])
  const nomes = NOMES[agrupar]
  const conv = dados ? (() => { const c = dados.cad.reduce((s, x) => s + x.partes[0], 0), a = dados.ass.reduce((s, x) => s + x.partes[0], 0); return c ? Math.round((a / c) * 1000) / 10 : null })() : null
  return <Quadro titulo="Cadastros e assinantes novos" descricao={`Contados ${nomes.titulo}. O período de agora ainda está em andamento (tracejado). Assinante novo é a primeira compra paga de cada pessoa; renovação não conta.`}
    fonte="listar_usuarios_admin (criado_em) + cobranças (primeira compra) · contas de teste fora" qualidade="derivado"
    acoes={<Segmento rotulo="Contar por" valor={agrupar} aoMudar={definirAgrupar} opcoes={[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mês']]} />}
    legenda={<Legenda itens={[{ nome: 'Completo', chave: 'serie1' }, { nome: 'Em andamento', chave: 'parcial' }, { nome: 'Média dos completos', chave: 'media' }]} />}
    estado={!dados ? <Carregando linhas={6} /> : undefined}
    tabela={dados ? { cabecalho: [nomes.unidade === 'mês' ? 'Mês' : nomes.unidade === 'dia' ? 'Dia' : 'Semana', 'Cadastros', 'Assinantes novos', 'Conversão'], linhas: [...dados.cad].reverse().map((c, i) => { const a = dados.ass[dados.cad.length - 1 - i].partes[0]; return [c.longo, c.partes[0], a, c.partes[0] ? `${Math.round((a / c.partes[0]) * 100)}%` : '—'] }) } : null}>
    {dados && <div className="a3-grade a3-grade--2 a3-ritmo">
      <section aria-label={`Cadastros ${nomes.titulo}`} className="a3-ritmo__bloco">
        <h3 className="a3-ritmo__titulo">Cadastros</h3>
        <ResumoColunas pontos={dados.cad} nomePeriodo={nomes} />
        <Colunas descricao={`Cadastros ${nomes.titulo}`} pontos={dados.cad} series={[{ nome: 'Cadastros' }]} />
      </section>
      <section aria-label={`Assinantes novos ${nomes.titulo}`} className="a3-ritmo__bloco a3-ritmo__bloco--assinantes">
        <h3 className="a3-ritmo__titulo">Assinantes novos</h3>
        <ResumoColunas pontos={dados.ass} nomePeriodo={nomes} />
        <Colunas descricao={`Assinantes novos ${nomes.titulo}`} pontos={dados.ass} series={[{ nome: 'Assinantes novos' }]} />
      </section>
    </div>}
    {dados && conv !== null && <p className="a3-mudo a3-pequeno" style={{ margin: 0 }}>No período do gráfico: {conv.toLocaleString('pt-BR')}% de conversão (assinantes novos sobre cadastros; correlação no tempo, não necessariamente a mesma pessoa).</p>}
  </Quadro>
}
