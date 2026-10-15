import { useState, type ReactNode } from 'react'
import type { CalculoPlano, DiaPlano, Passada, PlanoSalvo } from '../dados/planoEstudo'
import { DIA_MINIMO, opcoesDe, ROTULO_PASSADA, TAMANHO_MINI } from '../dados/planoEstudo'
import { formatarTempo, type Constancia, type Prontidao } from '../dados/hubCronograma'
import { corDaArea } from '../dados/coresAreas'
import { posicaoDaArea } from '../dados/incidencia'
import { Icone } from '../componentes/Icone'
import { chaveCivil, diaCivil } from '../util/dia'

/**
 * A apresentação do cronograma (reforma de 14/10/2026, docs/cronograma/PLANO.md).
 * A tela responde sempre, nesta ordem e com estas palavras: onde você está,
 * hoje, amanhã, esta semana, depois e como você está indo. A cor diz a área e
 * os estados são sempre os mesmos: feito, agora, a fazer, folga e marco.
 */

const DIA = 86_400_000
const curta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const semanaDia = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '')
const SEMANA_CURTA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const juntar = (nomes: string[]) => nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
/** Faixa com as cores das áreas de um dia ou de uma semana, proporcional ao número de questões. */
const faixaCores = (partes: Array<{ slug: string; n: number }>) => {
  const total = partes.reduce((s, p) => s + p.n, 0)
  if (!total) return 'transparent'
  let acumulado = 0
  const paradas = partes.map((p) => { const ini = (acumulado / total) * 100; acumulado += p.n; return `${corDaArea(p.slug)} ${ini}% ${(acumulado / total) * 100}%` })
  return `linear-gradient(90deg, ${paradas.join(', ')})`
}

// ─── Onde você está ────────────────────────────────────────────────────────

export function OndeVoceEsta({ plano, calculo, previa = false, aoAjustar }: { plano: PlanoSalvo; calculo: CalculoPlano; previa?: boolean; aoAjustar?: () => void }) {
  const hoje = diaCivil()
  const prova = new Date(calculo.vespera.getTime() + DIA)
  const criado = diaCivil(Date.parse(plano.criado_em))
  // Trechos do trilho: as passadas que existem, a reta final (revisão forte e modo prova) e a prova.
  const passadas = ([1, 2, 3] as Passada[]).filter((p) => calculo.inicioPassada[p] || calculo.passadaAtual === p)
  const inicioDe = (p: Passada) => (calculo.inicioPassada[p] ?? hoje)
  const trechos: Array<{ id: string; nome: string; sub: string; de: Date; ate: Date }> = []
  if (calculo.fase === 'conteudo') {
    passadas.forEach((p, i) => {
      const de = i === 0 ? (criado < inicioDe(p) ? criado : inicioDe(p)) : inicioDe(p)
      const ate = passadas[i + 1] ? inicioDe(passadas[i + 1]) : calculo.inicioRetaFinal
      if (ate > de) trechos.push({ id: `p${p}`, nome: ROTULO_PASSADA[p].nome, sub: p === 1 ? 'prioridade máxima' : p === 2 ? 'prioridade alta' : 'o resto', de, ate })
    })
  } else trechos.push({ id: 'conteudo', nome: 'Conteúdo novo', sub: 'feito', de: criado, ate: calculo.inicioRetaFinal })
  if (calculo.diasRetaFinal > 7) trechos.push({ id: 'revisao', nome: 'Revisão forte', sub: curta(calculo.inicioRetaFinal), de: calculo.inicioRetaFinal, ate: calculo.inicioModoProva })
  trechos.push({ id: 'prova', nome: 'Modo prova', sub: curta(calculo.inicioModoProva), de: calculo.inicioModoProva, ate: prova })
  const inicio = trechos[0].de.getTime(), fim = prova.getTime()
  const pos = Math.min(100, Math.max(0, ((hoje.getTime() - inicio) / Math.max(1, fim - inicio)) * 100))
  const atual = trechos.findIndex((t) => hoje >= t.de && hoje < t.ate)

  const frase: ReactNode = calculo.provaPassou ? 'A prova chegou. Boa sorte!'
    : calculo.fase === 'conteudo' && calculo.passadaAtual ? <>Agora: <b>{ROTULO_PASSADA[calculo.passadaAtual].nome}</b>, {ROTULO_PASSADA[calculo.passadaAtual].texto}. {(() => {
      const proxima = ([2, 3] as Passada[]).find((p) => p > calculo.passadaAtual! && calculo.inicioPassada[p] && calculo.inicioPassada[p]! > hoje)
      return proxima ? <>Em {curta(calculo.inicioPassada[proxima]!)} começa a {ROTULO_PASSADA[proxima].nome}.</> : <>Em {curta(calculo.inicioRetaFinal)} começa a reta final, sem conteúdo novo.</>
    })()}</>
    : calculo.fase === 'conteudo' ? <>Conteúdo novo até {curta(new Date(calculo.inicioRetaFinal.getTime() - DIA))}. Depois, a reta final.</>
    : calculo.fase === 'revisao' ? <>Reta final: <b>revisão forte</b>, uma fatia da prova por dia. Em {curta(calculo.inicioModoProva)} começa o modo prova.</>
    : calculo.fase === 'prova' ? <>Reta final: <b>modo prova</b>. Simulado, os erros que importam e o resumão.</>
    : <>Véspera: aquecimento leve e descanso.</>

  return (
    <section className="cp-onde" aria-labelledby="cp-onde-titulo">
      <p className="cp-onde__selo">{previa ? 'Exemplo do cronograma' : 'Onde você está'} · {plano.prova}
        {/* Trocar data, folga ou ritmo fica no topo: antes era preciso rolar a página inteira. */}
        {aoAjustar && <button type="button" className="cp-onde__ajustar" onClick={aoAjustar}><Icone nome="lapis" tamanho={14} /> Ajustar</button>}
      </p>
      <h1 id="cp-onde-titulo">{calculo.provaPassou ? 'Dia da prova' : <>Faltam <em>{calculo.diasAteProva}</em> {calculo.diasAteProva === 1 ? 'dia' : 'dias'}</>}</h1>
      <p className="cp-onde__sub">Prova em {prova.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })} · semana {Math.min(calculo.semanaNumero, calculo.semanasTotal)} de {calculo.semanasTotal}</p>
      {!calculo.provaPassou && <>
        <div className="cp-trilho" aria-hidden="true">
          <div className="cp-trilho__faixas" style={{ gridTemplateColumns: trechos.map((t) => `${Math.max(0.6, (t.ate.getTime() - t.de.getTime()) / DIA)}fr`).join(' ') + ' 0.5fr' }}>
            {trechos.map((t, i) => <span key={t.id} className={'cp-trilho__faixa' + (i < atual ? ' cp-trilho__faixa--feita' : i === atual ? ' cp-trilho__faixa--atual' : '')} />)}
            <span className="cp-trilho__faixa cp-trilho__faixa--prova" />
          </div>
          <span className="cp-trilho__voce" style={{ left: `calc(${pos}% * 0.96)` }} />
          <div className="cp-trilho__nomes" style={{ gridTemplateColumns: trechos.map((t) => `${Math.max(0.6, (t.ate.getTime() - t.de.getTime()) / DIA)}fr`).join(' ') + ' 0.5fr' }}>
            {trechos.map((t, i) => <span key={t.id} className={i === atual ? 'cp-trilho__nome--atual' : ''}>{(t.ate.getTime() - t.de.getTime()) / (fim - inicio) >= 0.16 && <><b>{t.nome}</b><small>{t.sub}</small></>}</span>)}
            <span />
          </div>
          <p className="cp-trilho__marcos">{plano.opcoes?.provaExtra?.nome && plano.opcoes.provaExtra.data >= chaveCivil(hoje) && <span>{plano.opcoes.provaExtra.nome} <b>{curta(new Date(`${plano.opcoes.provaExtra.data}T00:00:00`))}</b></span>}{trechos.filter((t) => (t.ate.getTime() - t.de.getTime()) / (fim - inicio) < 0.16).map((t) => <span key={t.id}>{t.nome} <b>{curta(t.de)}</b></span>)}<span>Prova <b>{curta(prova)}</b></span></p>
        </div>
        <p className="cp-trilho__resumo">{trechos.map((t) => t.nome).join(' → ')} → prova em {curta(prova)}. Você está em: {atual >= 0 ? trechos[atual].nome : 'conteúdo novo'}.</p>
      </>}
      <p className="cp-onde__frase">{frase}</p>
    </section>
  )
}

// ─── Hoje ──────────────────────────────────────────────────────────────────

export interface ItemChecklist {
  id: string
  titulo: string
  texto: ReactNode
  minutos: number | null
  estado: 'feito' | 'agora' | 'afazer'
  progresso?: { feitas: number; total: number }
  acao?: { rotulo: string; href?: string; aoClicar?: () => void }
  opcional?: boolean
}

export function CartaoHoje({ calculo, titulo, porQue, assuntos, itens, botao, cor, aviso, adiantar }: {
  calculo: CalculoPlano
  titulo: string
  porQue: ReactNode
  assuntos: string[]
  itens: ItemChecklist[]
  botao: { rotulo: string; detalhe?: string; aoClicar?: () => void; href?: string; ouro?: boolean } | null
  cor: string
  aviso?: ReactNode
  /** O painel de adiantar: embaixo do botão, ou no lugar dele quando a meta de hoje já está feita. */
  adiantar?: ReactNode
}) {
  const obrigatorios = itens.filter((i) => !i.opcional)
  const extras = itens.filter((i) => i.opcional)
  const totalMin = itens.filter((i) => !i.opcional).reduce((s, i) => s + (i.minutos ?? 0), 0)
  const faltaMin = itens.filter((i) => !i.opcional && i.estado !== 'feito').reduce((s, i) => s + (i.minutos ?? 0) * (i.progresso ? 1 - i.progresso.feitas / Math.max(1, i.progresso.total) : 1), 0)
  const hoje = diaCivil()
  return (
    <section className="cp-bloco" aria-labelledby="cp-hoje-titulo">
      <p className="cp-rotulo"><span id="cp-hoje-titulo">Hoje</span><b>{semanaDia(hoje)}, {curta(hoje)}</b></p>
      <div className="cp-hoje" style={{ ['--cor-area' as string]: cor }}>
        <div className="cp-hoje__cabeca">
          <span className="cp-hoje__cor" aria-hidden="true" />
          <div>
            <h2>{titulo}</h2>
            {porQue && <p className="cp-hoje__porque">{porQue}</p>}
          </div>
        </div>
        {assuntos.length > 0 && <ul className="cp-chips" aria-label="Assuntos de hoje">{assuntos.slice(0, 5).map((a) => <li key={a}>{a}</li>)}{assuntos.length > 5 && <li>e mais {assuntos.length - 5}</li>}</ul>}
        {aviso}
        <ol className="cp-lista">
          {obrigatorios.map((i, k) => <ItemDaLista key={i.id} item={i} marca={k + 1} />)}
        </ol>
        {totalMin > 0 && <p className="cp-hoje__total"><span>Seu dia: <b>~{formatarTempo(totalMin)}</b></span><span>{faltaMin >= 1 ? <>Falta: <b>~{formatarTempo(faltaMin)}</b></> : <b>Dia completo</b>}</span></p>}
        {botao && (botao.href
          ? <a className={'cp-botao' + (botao.ouro ? ' cp-botao--ouro' : '')} href={botao.href} onClick={botao.aoClicar}>{botao.rotulo}{botao.detalhe && <small>{botao.detalhe}</small>}</a>
          : <button type="button" className={'cp-botao' + (botao.ouro ? ' cp-botao--ouro' : '')} onClick={botao.aoClicar}>{botao.rotulo}{botao.detalhe && <small>{botao.detalhe}</small>}</button>)}
        {adiantar}
        {extras.length > 0 && <div className="cp-extras">
          <p className="cp-extras__titulo">Se sobrar tempo <small>não conta na meta</small></p>
          <ul className="cp-lista cp-lista--extras">{extras.map((i) => <ItemDaLista key={i.id} item={i} marca="+" />)}</ul>
        </div>}
        {calculo.projecao.tetoAtivo && !calculo.naRetaFinal && <p className="cp-hoje__teto"><Icone nome="alerta" tamanho={15} /> A meta subiu o máximo (25% acima da planejada) para não virar maratona. O que não couber sai do fim da fila, a parte de prioridade mais baixa.</p>}
      </div>
    </section>
  )
}

function ItemDaLista({ item: i, marca }: { item: ItemChecklist; marca: ReactNode }) {
  return (
            <li className={`cp-lista__item cp-lista__item--${i.estado} cp-lista__item--${i.id}`}>
              <span className="cp-lista__marca" aria-hidden="true">{i.estado === 'feito' ? <Icone nome="certo" tamanho={14} /> : marca}</span>
              <span className="cp-lista__texto">
                <strong>{i.titulo}</strong>
                <small>{i.texto}</small>
                {i.progresso && i.progresso.total > 0 && <span className="cp-lista__barra" role="progressbar" aria-valuemin={0} aria-valuemax={i.progresso.total} aria-valuenow={i.progresso.feitas} aria-label={`${i.progresso.feitas} de ${i.progresso.total}`}><span style={{ width: `${Math.min(100, (i.progresso.feitas / i.progresso.total) * 100)}%` }} /></span>}
              </span>
              <span className="cp-lista__fim">
                {i.minutos !== null && <span className="cp-lista__tempo">{i.estado === 'feito' ? 'feito' : `~${formatarTempo(i.minutos)}`}</span>}
                {i.acao && i.estado !== 'feito' && (i.acao.href ? <a className="cp-lista__acao" href={i.acao.href} onClick={i.acao.aoClicar}>{i.acao.rotulo}</a> : <button type="button" className="cp-lista__acao" onClick={i.acao.aoClicar}>{i.acao.rotulo}</button>)}
              </span>
            </li>
  )
}

// ─── Adiantar ──────────────────────────────────────────────────────────────

/**
 * Adiantar: o que a pessoa faz além da meta de hoje sai dos próximos dias, a começar
 * por amanhã. Fica sempre à vista no cartão Hoje; depois da meta feita vira o destaque.
 */
export function PainelAdiantar({ calculo, minutos, destaque, salvando, aoAdiantar, aoCancelar }: {
  calculo: CalculoPlano
  minutos: number
  destaque: boolean
  salvando?: boolean
  aoAdiantar: (n: number) => void
  aoCancelar: () => void
}) {
  // Os próximos dias que ainda têm meta, com quanto cada um pede.
  const proximos = calculo.dias.slice(1).filter((d) => d.meta > 0).slice(0, 3)
  const ja = Math.max(calculo.extraHoje, calculo.adiantarPedido)
  const tocados = calculo.dias.slice(1).filter((d) => d.adiantado > 0)
  if (!proximos.length && !tocados.length) return null
  const nomeDia = (d: Date) => diferencaDias(d) === 1 ? 'amanhã' : semanaDia(d)
  const d1 = proximos[0], d2 = proximos[1]
  const opcoes: Array<{ id: string; n: number; rotulo: string; efeito: string }> = []
  if (d1) {
    for (const n of [10, 20, 30]) if (n < d1.meta) opcoes.push({ id: `+${n}`, n, rotulo: `+${n}`, efeito: `${nomeDia(d1.data)} fica com ${d1.meta - n}` })
    opcoes.push({ id: 'd1', n: d1.meta, rotulo: diferencaDias(d1.data) === 1 ? 'Amanhã inteiro' : `${semanaDia(d1.data)} inteira`, efeito: `${d1.meta} questões · ${nomeDia(d1.data)} livre` })
    if (d2) opcoes.push({ id: 'd2', n: d1.meta + d2.meta, rotulo: `2 dias`, efeito: `${d1.meta + d2.meta} questões · até ${semanaDia(d2.data)}` })
  }
  const pendente = Math.max(0, calculo.adiantarPedido - calculo.extraHoje)
  return (
    <div className={'cp-adiantar' + (destaque ? ' cp-adiantar--destaque' : '')} id="adiantar">
      <div className="cp-adiantar__cabeca">
        <span className="cp-adiantar__icone" aria-hidden="true"><Icone nome="direita" tamanho={18} /></span>
        <div>
          <strong>{destaque ? 'Quer adiantar?' : 'Sobrou energia? Adiante'}</strong>
          <small>O que você fizer além da meta de hoje sai dos próximos dias, começando por {d1 ? nomeDia(d1.data) : 'amanhã'}.</small>
        </div>
      </div>
      {ja > 0 && <p className="cp-adiantar__estado" role="status">
        <Icone nome="certo" tamanho={14} />
        <span>
          <b>{ja} {ja === 1 ? 'questão adiantada' : 'questões adiantadas'}</b>
          {tocados.length > 0 && <> · {tocados.slice(0, 2).map((d) => `${nomeDia(d.data)}: ${d.meta + d.adiantado} → ${d.meta}`).join(' · ')}</>}
          {pendente > 0 && <> · faltam {pendente} para fechar</>}
        </span>
        {pendente > 0 && <button type="button" className="cp-adiantar__cancelar" disabled={salvando} onClick={aoCancelar}>Cancelar o que falta</button>}
      </p>}
      {opcoes.length > 0 && <div className="cp-adiantar__opcoes" role="group" aria-label="Quanto adiantar">
        {opcoes.map((o) => (
          <button key={o.id} type="button" className={'cp-adiantar__opcao' + (o.id.startsWith('d') ? ' cp-adiantar__opcao--dia' : '') + (o.id === 'd1' && !d2 ? ' cp-adiantar__opcao--sozinha' : '')} disabled={salvando} onClick={() => aoAdiantar(o.n)}>
            <b>{o.rotulo}</b>
            <small>{o.efeito}</small>
            <em>~{formatarTempo(o.n * minutos)}</em>
          </button>
        ))}
      </div>}
    </div>
  )
}

/** O "por que hoje" do dia: o lugar da área no ranking e o acerto nela. */
export function porQueHoje(calculo: CalculoPlano, slug: string, prova: string, semNumeros = false): string {
  const tema = calculo.temas.find((t) => t.slug === slug)
  const posicao = posicaoDaArea(slug)
  const acerto = tema?.acerto ?? tema?.acertoEstimado ?? null
  const partes = [
    posicao ? (posicao === 1 ? `é a área com mais questões no ${prova}` : `é a ${posicao}ª área em questões no ${prova}`) : 'é a vez dela na fila',
    acerto !== null && !semNumeros ? (tema?.reforcado ? `você está com ${acerto}% de acerto nela, abaixo da sua média` : `você está com ${acerto}% de acerto nela`) : '',
  ].filter(Boolean)
  return `Por que hoje: ${partes.join(', e ')}.`
}

// ─── Amanhã ────────────────────────────────────────────────────────────────

export function LinhaAmanha({ dia }: { dia: DiaPlano | null }) {
  if (!dia) return null
  const principal = dia.itens.find((i) => !i.mistura) ?? dia.itens[0]
  const mistura = dia.itens.filter((i) => i !== principal)
  const livre = dia.total === 0 && !dia.mini && dia.adiantado > 0
  return (
    <section className="cp-bloco" aria-labelledby="cp-amanha-titulo">
      <p className="cp-rotulo"><span id="cp-amanha-titulo">{diferencaDias(dia.data) === 1 ? 'Amanhã' : 'Próximo dia de estudo'}</span><b>{semanaDia(dia.data)}, {curta(dia.data)}</b></p>
      <div className="cp-amanha">
        <span className="cp-amanha__cor" style={{ background: faixaCores(dia.itens.map((i) => ({ slug: i.slug, n: i.n }))) }} aria-hidden="true" />
        <div>
          <strong>{livre ? 'Livre: você já adiantou' : principal ? principal.nome : 'Mini-simulado'}{mistura.length > 0 && <> + {juntar(mistura.map((m) => m.nome))}</>}{dia.tipo === 'leve' && <span className="cp-tag">dia leve</span>}{dia.tipo === 'dificil' && <span className="cp-tag">semana difícil</span>}{dia.mini && <span className="cp-tag cp-tag--ouro">mini-simulado</span>}{dia.adiantado > 0 && !livre && <span className="cp-tag cp-tag--verde">−{dia.adiantado} adiantadas</span>}</strong>
          <small>{livre ? `As ${dia.adiantado} questões deste dia você fez antes.` : principal ? principal.assuntos.slice(0, 3).join(', ') : `${TAMANHO_MINI} questões cronometradas do que você já viu`}{mistura.length > 0 && `; mais ${mistura.reduce((s, m) => s + m.n, 0)} de ${juntar(mistura.map((m) => m.nome))} para misturar`}</small>
        </div>
        <span className="cp-amanha__n">{dia.adiantado > 0 && <s className="numerico">{dia.total + dia.adiantado}</s>}<b className="numerico">{dia.total}</b><small>questões</small></span>
      </div>
    </section>
  )
}
const diferencaDias = (d: Date) => Math.round((meiaNoite(d).getTime() - diaCivil().getTime()) / DIA)

// ─── Esta semana ───────────────────────────────────────────────────────────

export function EstaSemana({ calculo, plano, constancia, aoSemanaDificil, salvando, simples = false }: { calculo: CalculoPlano; plano: PlanoSalvo; constancia: Constancia | null; aoSemanaDificil?: (ativar: boolean) => void; salvando?: boolean; simples?: boolean }) {
  const hoje = diaCivil()
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7))
  const opcoes = opcoesDe(plano)
  const chave = `${segunda.getFullYear()}-${String(segunda.getMonth() + 1).padStart(2, '0')}-${String(segunda.getDate()).padStart(2, '0')}`
  const dificilAtiva = opcoes.semanasDificeis.includes(chave)
  const dias = Array.from({ length: 7 }, (_, i) => new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + i))
  const plano7 = dias.map((d) => {
    const doPlano = calculo.dias.find((x) => x.data.getTime() === d.getTime())
    const passado = constancia?.ultimos.find((u) => meiaNoite(u.dia).getTime() === d.getTime())
    const ehHoje = d.getTime() === hoje.getTime()
    const folga = plano.folgas.includes(d.getDay())
    let estado: 'feito' | 'hoje' | 'futuro' | 'folga' | 'atrasado' | 'parcial' | 'antes' = 'futuro'
    if (ehHoje) estado = 'hoje'
    else if (d < diaCivil(Date.parse(plano.criado_em))) estado = 'antes'
    else if (d < hoje) estado = folga ? 'folga' : passado?.estado === 'cumprido' ? 'feito' : passado?.estado === 'parcial' ? 'parcial' : passado?.estado === 'antes' ? 'antes' : 'atrasado'
    else if (folga) estado = 'folga'
    const itens = ehHoje ? (calculo.hoje?.itens ?? doPlano?.itens ?? []) : doPlano?.itens ?? []
    const n = ehHoje ? calculo.metaDiaria : doPlano?.total ?? passado?.n ?? 0
    return { d, estado, itens, n, tipo: doPlano?.tipo, mini: doPlano?.mini ?? false, passadoN: passado?.n ?? 0, adiantado: !ehHoje && (doPlano?.adiantado ?? 0) > 0 }
  })
  // A frase da semana: quando a área principal muda (comparando dia a dia) e quando cai o mini-simulado.
  const principalDe = (itens: DiaPlano['itens']) => itens.find((i) => !i.mistura) ?? itens[0]
  const frases: string[] = []
  let anterior = calculo.hoje ? principalDe(calculo.hoje.itens)?.slug : undefined
  for (const x of plano7.filter((y) => y.d > hoje && y.itens.length)) {
    const atual = principalDe(x.itens)
    if (anterior && atual && atual.slug !== anterior) { frases.push(`Na ${semanaDia(x.d)} a área principal muda: entra ${atual.nome}.`); break }
    anterior = atual?.slug
  }
  const mini = plano7.find((x) => x.d >= hoje && x.mini)
  if (mini) frases.push(`Na ${semanaDia(mini.d)}: mini-simulado de ${TAMANHO_MINI} questões.`)
  const areasSemana = new Map<string, string>()
  for (const x of plano7) for (const i of x.itens) areasSemana.set(i.slug, i.nome)
  const ROTULO = { feito: 'feito', hoje: 'hoje', futuro: '', folga: 'folga', atrasado: 'atrasado', parcial: 'parcial', antes: '–' }
  return (
    <section className="cp-bloco" aria-labelledby="cp-semana-titulo">
      <p className="cp-rotulo"><span id="cp-semana-titulo">Esta semana</span><b>{curta(dias[0])} a {curta(dias[6])}</b></p>
      <div className="cp-semana">
        <ol className="cp-dias">
          {plano7.map((x) => (
            <li key={x.d.getTime()} className={`cp-dia cp-dia--${x.estado}${x.mini ? ' cp-dia--mini' : ''}${x.adiantado ? ' cp-dia--adiantado' : ''}`} title={x.itens.map((i) => `${i.nome}: ${i.n}`).join(' · ')}>
              <span className="cp-dia__nome">{SEMANA_CURTA[x.d.getDay()]}</span>
              <b className="cp-dia__num">{x.d.getDate()}</b>
              <span className="cp-dia__cor" style={{ background: x.estado === 'folga' ? 'transparent' : faixaCores(x.itens.map((i) => ({ slug: i.slug, n: i.n }))) }} aria-hidden="true" />
              <em>{simples ? (x.estado === 'hoje' || x.estado === 'folga' ? ROTULO[x.estado] : '') : x.estado === 'futuro' ? (x.adiantado && !x.n ? 'adiantado' : x.tipo === 'leve' ? `${x.n} leve` : x.n || '') : x.estado === 'feito' || x.estado === 'parcial' ? `${ROTULO[x.estado]}` : ROTULO[x.estado]}</em>
            </li>
          ))}
        </ol>
        {areasSemana.size > 0 && <ul className="cp-legenda" aria-label="Cores das áreas">{[...areasSemana].map(([slug, nome]) => <li key={slug}><i style={{ background: corDaArea(slug) }} />{nome}</li>)}<li><i className="cp-legenda__folga" />folga</li></ul>}
        {!simples && frases.length > 0 && <p className="cp-semana__frase">{frases.join(' ')}</p>}
        {simples && <p className="cp-semana__frase">Cada cor é uma área. No seu cronograma, cada dia mostra quantas questões e quais assuntos.</p>}
        {aoSemanaDificil && <div className="cp-dificil">
          {dificilAtiva
            ? <><span><Icone nome="alerta" tamanho={15} /> <b>Semana difícil ativa:</b> {DIA_MINIMO} questões por dia, o suficiente para manter a sequência. O resto se espalha pelas próximas semanas.</span><button type="button" className="botao botao--fantasma" disabled={salvando} onClick={() => aoSemanaDificil(false)}>Voltar ao normal</button></>
            : <><span>Plantão pesado ou semana corrida? Alivie esta semana para <b>{DIA_MINIMO} por dia</b> sem quebrar o plano.</span><button type="button" className="botao" disabled={salvando} onClick={() => aoSemanaDificil(true)}>Semana difícil</button></>}
        </div>}
      </div>
    </section>
  )
}

// ─── Depois ────────────────────────────────────────────────────────────────

interface SemanaDepois { inicio: Date; fim: Date; partes: Array<{ slug: string; nome: string; n: number; assuntos: string[] }>; total: number; passadaNova: Passada | null; minis: Date[] }

export function Depois({ calculo, maximo = 5, detalhe, plano, semMais = false }: { calculo: CalculoPlano; maximo?: number; detalhe?: ReactNode; plano?: PlanoSalvo; semMais?: boolean }) {
  const extra = plano?.opcoes?.provaExtra && /^\d{4}-\d{2}-\d{2}$/.test(plano.opcoes.provaExtra.data) ? { nome: plano.opcoes.provaExtra.nome, data: new Date(`${plano.opcoes.provaExtra.data}T00:00:00`) } : null
  const [tudo, definirTudo] = useState(false)
  const hoje = diaCivil()
  const fimSemana = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 7 - ((hoje.getDay() + 6) % 7))
  const semanas: SemanaDepois[] = []
  let passadaAnterior: Passada | null = calculo.passadaAtual
  for (const d of calculo.dias) {
    if (d.data < fimSemana) continue
    const seg = new Date(d.data.getFullYear(), d.data.getMonth(), d.data.getDate() - ((d.data.getDay() + 6) % 7))
    let s = semanas[semanas.length - 1]
    if (!s || s.inicio.getTime() !== seg.getTime()) { s = { inicio: seg, fim: d.data, partes: [], total: 0, passadaNova: null, minis: [] }; semanas.push(s) }
    s.fim = d.data
    if (d.mini) s.minis.push(d.data)
    for (const it of d.itens) {
      if (it.passada !== passadaAnterior && passadaAnterior !== null && it.passada > passadaAnterior) { s.passadaNova = it.passada; passadaAnterior = it.passada }
      const p = s.partes.find((x) => x.slug === it.slug)
      if (p) { p.n += it.n; for (const a of it.assuntos) if (!p.assuntos.includes(a)) p.assuntos.push(a) }
      else s.partes.push({ slug: it.slug, nome: it.nome, n: it.n, assuntos: [...it.assuntos] })
      s.total += it.n
    }
  }
  const prova = new Date(calculo.vespera.getTime() + DIA)
  const visiveis = tudo ? semanas : semanas.slice(0, maximo)
  const linhas: ReactNode[] = []
  let extraMostrado = !extra || extra.data < hoje
  for (const s of visiveis) {
    if (!extraMostrado && extra && extra.data <= s.fim) { extraMostrado = true; linhas.push(<li key="extra" className="cp-depois__marco"><span className="cp-depois__data">{curta(extra.data)}</span><span><span className="cp-depois__faixa cp-depois__faixa--prova" /><strong>Prova: {extra.nome}</strong><small>Um marco no caminho. O plano segue até a prova principal.</small></span></li>) }
    if (s.passadaNova) linhas.push(<li key={`p${s.inicio.getTime()}`} className="cp-depois__marco"><span className="cp-depois__data">{curta(s.inicio)}</span><span><span className="cp-depois__faixa cp-depois__faixa--marco" /><strong>Começa a {ROTULO_PASSADA[s.passadaNova].nome}</strong><small>Agora entram {ROTULO_PASSADA[s.passadaNova].texto}.</small></span></li>)
    const partes = [...s.partes].sort((a, b) => b.n - a.n)
    linhas.push(<li key={s.inicio.getTime()}>
      <span className="cp-depois__data">{curta(s.inicio)} a<br />{curta(s.fim)}</span>
      <span>
        <span className="cp-depois__faixa" style={{ background: faixaCores(partes) }} />
        <strong>{juntar(partes.slice(0, 3).map((p) => p.nome))}{partes.length > 3 && ` e mais ${partes.length - 3}`}</strong>
        <small>{partes.slice(0, 2).map((p) => p.assuntos.slice(0, 2).join(', ')).filter(Boolean).join('; ')} · {s.total} questões</small>
      </span>
    </li>)
    for (const m of s.minis) linhas.push(<li key={`m${m.getTime()}`} className="cp-depois__marco"><span className="cp-depois__data">{curta(m)}</span><span><span className="cp-depois__faixa cp-depois__faixa--marco" /><strong>Mini-simulado</strong><small>{TAMANHO_MINI} questões cronometradas de tudo o que você já viu</small></span></li>)
  }
  return (
    <section className="cp-bloco" aria-labelledby="cp-depois-titulo">
      <p className="cp-rotulo"><span id="cp-depois-titulo">Depois</span><b>até a prova</b></p>
      <div className="cp-depois">
        <ol>
          {linhas}
          {/* Reta final e prova ficam sempre à vista, mesmo com a lista recolhida. */}
          {semanas.length > visiveis.length && <li className="cp-depois__salto" aria-hidden="true"><span /><span>⋮</span></li>}
          {<>
            {!calculo.naRetaFinal && <li className="cp-depois__marco"><span className="cp-depois__data">{curta(calculo.inicioRetaFinal)}</span><span><span className="cp-depois__faixa cp-depois__faixa--marco" /><strong>Reta final</strong><small>{calculo.diasRetaFinal > 7 ? 'Revisão forte e depois o modo prova' : 'Modo prova'}, sem conteúdo novo</small></span></li>}
            <li className="cp-depois__marco cp-depois__marco--prova"><span className="cp-depois__data">{curta(prova)}</span><span><span className="cp-depois__faixa cp-depois__faixa--prova" /><strong>Prova</strong><small>Boa prova!</small></span></li>
          </>}
        </ol>
        {semanas.length > maximo && !semMais && <button type="button" className="cp-depois__mais" onClick={() => definirTudo(!tudo)} aria-expanded={tudo}>{tudo ? 'Mostrar menos' : `Ver as ${semanas.length} semanas`}</button>}
        {tudo && detalhe}
      </div>
    </section>
  )
}

// ─── Como você está indo ───────────────────────────────────────────────────

export function ComoEstouIndo({ calculo, constancia, minutosQuestao }: { calculo: CalculoPlano; constancia: Constancia | null; minutosQuestao: number }) {
  const p = calculo.projecao
  const ritmo = Math.abs(calculo.ritmo) <= 5 || calculo.esperadoAteHoje < 20 ? { t: 'Em dia', s: 'com o cronograma' } : calculo.ritmo > 0 ? { t: `${calculo.ritmo}% à frente`, s: 'do esperado até hoje' } : { t: `${-calculo.ritmo}% atrás`, s: 'do esperado até hoje' }
  return (
    <section className="cp-bloco" aria-labelledby="cp-indo-titulo">
      <p className="cp-rotulo"><span id="cp-indo-titulo">Como você está indo</span></p>
      <div className="cp-indo">
        {constancia && <div><small>Constância</small><b className="numerico">{constancia.sequencia} {constancia.sequencia === 1 ? 'dia' : 'dias'}</b><span>seguidos com {DIA_MINIMO}+ questões</span></div>}
        <div><small>Ritmo</small><b>{ritmo.t}</b><span>{ritmo.s}</span></div>
        <div><small>Projeção</small><b className="numerico">{p.maisCaiPct}%</b><span>da prioridade máxima vista{p.fimMaisCai ? ` até ${curta(p.fimMaisCai)}` : ''}</span></div>
        <div><small>Progresso</small><b className="numerico">{calculo.feitas.toLocaleString('pt-BR')}</b><span>de {calculo.alvo.toLocaleString('pt-BR')} questões do plano ({p.alvoPct}% previsto até a reta final)</span></div>
      </div>
      <p className="cp-indo__nota">Tempo estimado com o seu ritmo: ~{String(minutosQuestao).replace('.', ',')} min por questão.</p>
    </section>
  )
}

export function Prontidao({ areas }: { areas: Prontidao[] }) {
  const comDados = areas.filter((a) => a.acerto !== null)
  return (
    <div className="cp-prontidao">
      <p className="texto-2">Prontidão é quanto da área você já viu vezes o seu acerto nela. É onde ainda há pontos a ganhar.</p>
      {comDados.length ? <ul>
        {areas.map((a) => (
          <li key={a.slug}>
            <span className="cp-prontidao__nome"><i style={{ background: corDaArea(a.slug) }} />{a.nome}</span>
            <span className="cp-prontidao__trilho" aria-hidden="true"><span style={{ width: `${a.cobertura}%`, background: corDaArea(a.slug) }} className="cp-prontidao__vista" /><span style={{ width: `${a.prontidao}%`, background: corDaArea(a.slug) }} /></span>
            <b className="numerico">{a.acerto === null ? '–' : `${a.prontidao}%`}</b>
            <small>{a.cobertura}% visto{a.acerto !== null ? ` · ${a.acerto}% de acerto` : ''}</small>
          </li>
        ))}
      </ul> : <p className="texto-2">Responda algumas questões e a prontidão por área aparece aqui.</p>}
    </div>
  )
}

/** Bloco recolhido (desempenho, risco, simulados...), para a página não virar uma rolagem sem fim. */
export function Recolhido({ titulo, icone, children, aberto = false }: { titulo: string; icone: Parameters<typeof Icone>[0]['nome']; children: ReactNode; aberto?: boolean }) {
  return (
    <details className="cp-recolhido" open={aberto}>
      <summary><Icone nome={icone} tamanho={18} /> <span>{titulo}</span><Icone nome="baixo" tamanho={16} /></summary>
      <div className="cp-recolhido__corpo">{children}</div>
    </details>
  )
}

// ─── Primeira visita: o que é cada parte ───────────────────────────────────

export function TourCronograma({ aoFechar }: { aoFechar: () => void }) {
  const passos = [
    { titulo: 'Onde você está', texto: 'Quantos dias faltam, em que fase do plano você está e o que vem depois dela.' },
    { titulo: 'Hoje', texto: 'A lista do dia, com o tempo de cada parte e um botão só, que diz exatamente o que faz.' },
    { titulo: 'Esta semana e depois', texto: 'Cada cor é uma área. Você vê o que cai em cada dia e as próximas semanas até a prova.' },
  ]
  return (
    <section className="cp-tour" aria-labelledby="cp-tour-titulo">
      <h2 id="cp-tour-titulo">Seu cronograma em 3 partes</h2>
      <ol>{passos.map((p, i) => <li key={p.titulo}><span className="numerico">{i + 1}</span><span><strong>{p.titulo}</strong><small>{p.texto}</small></span></li>)}</ol>
      <button type="button" className="botao botao--principal" onClick={aoFechar}>Entendi</button>
    </section>
  )
}

// ─── Resumo da semana (domingo e segunda) ──────────────────────────────────

export function ResumoSemana({ feitas, acerto, dias, fraca, proxima }: { feitas: number; acerto: number | null; dias: number; fraca: string | null; proxima: string | null }) {
  return (
    <section className="cp-resumo" aria-labelledby="cp-resumo-titulo">
      <p className="cp-onde__selo">Resumo da semana</p>
      <h2 id="cp-resumo-titulo">{feitas ? `${feitas} questões em ${dias} ${dias === 1 ? 'dia' : 'dias'}` : 'Semana sem estudo'}</h2>
      <p>{acerto !== null ? <>Acerto de <b>{acerto}%</b>. </> : null}{fraca ? <>Área para olhar com carinho: <b>{fraca}</b>. </> : null}{proxima ? <>Nesta semana: <b>{proxima}</b>.</> : null}</p>
    </section>
  )
}

// ─── Exportar para o calendário ────────────────────────────────────────────

/** Arquivo .ics com cada dia de estudo, o mini-simulado, a reta final e a prova, com lembrete no horário escolhido. */
export function gerarIcs(calculo: CalculoPlano, plano: PlanoSalvo, hora: number): string {
  const p2 = (n: number) => String(n).padStart(2, '0')
  const data = (d: Date) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`
  const carimbo = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const escapar = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  const eventos: string[] = []
  const evento = (d: Date, titulo: string, descricao: string, id: string, alarme = true) => {
    eventos.push([
      'BEGIN:VEVENT', `UID:${id}@ortoquestoes.com.br`, `DTSTAMP:${carimbo}`,
      `DTSTART:${data(d)}T${p2(hora)}0000`, `DTEND:${data(d)}T${p2(hora + 1)}0000`,
      `SUMMARY:${escapar(titulo)}`, `DESCRIPTION:${escapar(descricao)}`, 'URL:https://ortoquestoes.com.br/#/cronograma',
      ...(alarme ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapar(titulo)}`, 'TRIGGER:PT0M', 'END:VALARM'] : []),
      'END:VEVENT',
    ].join('\r\n'))
  }
  for (const d of calculo.dias) {
    if (!d.total && !d.mini) continue
    const nomes = juntar(d.itens.map((i) => i.nome))
    evento(d.data, `Orto Questões: ${d.total} questões${nomes ? ` · ${nomes}` : ''}${d.mini ? ' + mini-simulado' : ''}`, d.itens.map((i) => `${i.nome}: ${i.assuntos.slice(0, 3).join(', ')}`).join('\n'), `cronograma-${data(d.data)}`)
  }
  if (!calculo.naRetaFinal) evento(calculo.inicioRetaFinal, 'Orto Questões: começa a reta final', 'Revisão forte e modo prova, sem conteúdo novo.', `cronograma-reta-${data(calculo.inicioRetaFinal)}`)
  const extra = plano.opcoes?.provaExtra
  if (extra?.nome && /^\d{4}-\d{2}-\d{2}$/.test(extra.data)) evento(new Date(`${extra.data}T00:00:00`), `Prova: ${extra.nome}`, 'Boa prova!', `cronograma-prova-extra-${extra.data.replace(/-/g, '')}`, false)
  const prova = new Date(calculo.vespera.getTime() + DIA)
  evento(prova, `Prova: ${plano.prova}`, 'Boa prova!', `cronograma-prova-${data(prova)}`, false)
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Orto Questoes//Cronograma//PT', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Cronograma Orto Questões', ...eventos, 'END:VCALENDAR'].join('\r\n')
}

export function ExportarCalendario({ calculo, plano }: { calculo: CalculoPlano; plano: PlanoSalvo }) {
  const [hora, definirHora] = useState(7)
  function baixar() {
    const blob = new Blob([gerarIcs(calculo, plano, hora)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'cronograma-orto-questoes.ics'
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  return (
    <div className="cp-calendario">
      <p className="texto-2">Coloque o plano no calendário do celular (Google, Apple ou Outlook). Cada dia de estudo vira um compromisso com o que cai nele e um <b>lembrete no horário escolhido</b>. Se mudar o plano, exporte de novo.</p>
      <div className="cp-calendario__horas" role="radiogroup" aria-label="Horário do lembrete">
        {[[7, '7h, antes da rotina'], [12, '12h, no almoço'], [19, '19h, à noite']].map(([h, rotulo]) => (
          <button key={h} type="button" role="radio" aria-checked={hora === h} className="tr-pilula" aria-pressed={hora === h} onClick={() => definirHora(h as number)}>{rotulo}</button>
        ))}
      </div>
      <button type="button" className="botao botao--principal" onClick={baixar}><Icone nome="calendario" tamanho={16} /> Baixar para o calendário</button>
    </div>
  )
}
