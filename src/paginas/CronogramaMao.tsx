import { useEffect, useMemo, useState } from 'react'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { FILTROS_VAZIOS } from '../dados/tipos'
import { calcularPlanoMao, configInicial, itemConfigMao, lerConfig, MINUTOS_POR_QUESTAO_MAO, type ConfigMao, type DiaMao, type ProvaMao, type TemaDoPlano } from '../dados/cronogramaMao'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarSessao } from '../estado/sessao'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { IconePixel } from '../componentes/IconePixel'
import { diaCivil, hojeBR, somarDias } from '../util/dia'
import { href, navegar } from '../util/rotas'
import '../estilos/paginas/CronogramaMao.css'
import { TrocaCronograma } from '../componentes/TrocaCronograma'

const PROVAS: Record<ProvaMao, { titulo: string; curto: string; texto: string }> = {
  ingresso: { titulo: 'Ingresso em Cirurgia da Mão', curto: 'Ingresso (residência)', texto: 'Para as provas de seleção da residência e dos programas de Cirurgia da Mão. Você faz todo tipo de questão da mão, das provas de ingresso e do padrão SBCM e SIMÃO, na ordem do que as provas de ingresso mais cobram.' },
  titulo: { titulo: 'Título de Cirurgia da Mão: SBCM e SIMÃO', curto: 'Título: SBCM e SIMÃO', texto: 'Para o exame de título da SBCM e o SIMÃO, o simulado do exame. O foco são as questões no padrão da SBCM e do SIMÃO, na ordem do que a prova mais cobra; questões de ingresso dos mesmos assuntos entram só como reforço.' },
}
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const NOME_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MINUTOS = [30, 45, 60, 90, 120, 180]
const num = (n: number) => n.toLocaleString('pt-BR')
const duracao = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)}h${m % 60}` : `${m / 60} h`)
const dataLonga = (chave: string) => diaCivil(chave).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
const dataCurta = (chave: string) => diaCivil(chave).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
type Mapa = Record<string, unknown>

/**
 * Cronograma de Cirurgia da Mão (27/10/2026): ingresso e título, cada um com o seu plano.
 * A configuração fica na conta (sincroniza entre aparelhos); o plano é recalculado a cada abertura.
 */
export function CronogramaMao({ consulta }: { consulta?: URLSearchParams }) {
  const { indice } = usarIndice()
  const { premium, logado } = usarPremium()
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const [mapa, definirMapa] = usarArmazenado<Mapa>('biblioteca', {})
  const [provaSalva, salvarProva] = usarArmazenado<ProvaMao>('cronograma-mao:prova', 'ingresso')
  const pedida = consulta?.get('prova')
  const prova: ProvaMao = pedida === 'titulo' || pedida === 'ingresso' ? pedida : provaSalva
  const config = lerConfig(mapa[itemConfigMao(prova)])
  // lembra a última prova aberta (o link do menu abre direto nela)
  useEffect(() => { if (prova !== provaSalva) salvarProva(prova) }, [prova, provaSalva, salvarProva])
  const [editando, definirEditando] = useState(false)
  const { iniciarComAviso } = usarSessao()

  const salvar = (c: ConfigMao | null) => {
    definirMapa((antes) => ({ ...antes, [itemConfigMao(prova)]: c ? { ...c, em: Date.now() } : null }))
    definirEditando(false)
  }
  async function estudar(ids: string[]) {
    if (!premium) { navegar('/assinatura'); return }
    if (!ids.length) return
    if (await iniciarComAviso({ ...FILTROS_VAZIOS, areas: ['mao'], embaralhar: false, limite: ids.length }, ids, { origem: 'cronograma' })) navegar('/sessao')
  }

  return (
    <div className="empilha-2 cm">
      <TrocaCronograma atual={prova} />
      {!indice ? <Carregando linhas={5} rotulo="Montando o plano" />
        : !config || editando
          ? <Formulario prova={prova} inicial={config ?? configInicial(prova)} novo={!config} aoSalvar={salvar} aoCancelar={config ? () => definirEditando(false) : undefined} logado={logado} />
          : <Painel prova={prova} config={config} premium={premium} indice={indice} respondidas={respondidas} aoEstudar={estudar} aoEditar={() => definirEditando(true)} aoApagar={() => { if (window.confirm('Apagar este plano? Suas respostas continuam salvas.')) salvar(null) }} />}
    </div>
  )
}

function Formulario({ prova, inicial, novo, aoSalvar, aoCancelar, logado }: { prova: ProvaMao; inicial: ConfigMao; novo: boolean; aoSalvar: (c: ConfigMao) => void; aoCancelar?: () => void; logado: boolean }) {
  const [c, definir] = useState<ConfigMao>(inicial)
  const hoje = hojeBR()
  const valida = c.dataProva > hoje && c.dias.length > 0
  const questoesDia = Math.round(c.minutosDia / MINUTOS_POR_QUESTAO_MAO)
  return (
    <form className="cm-form" onSubmit={(e) => { e.preventDefault(); if (valida) aoSalvar({ ...c, criadoEm: novo ? hoje : c.criadoEm }) }}>
      <header>
        <p className="tr-heroi__selo">{novo ? 'Novo plano' : 'Ajustar o plano'}</p>
        <h1>{PROVAS[prova].titulo}</h1>
        <p className="texto-2">{PROVAS[prova].texto}</p>
      </header>
      <label className="cm-campo">
        <span><b>Data da prova</b><small>Ainda sem edital? Coloque a data que você espera. Dá para mudar depois.</small></span>
        <input type="date" value={c.dataProva} min={somarDias(hoje, 1)} onChange={(e) => definir({ ...c, dataProva: e.target.value })} required />
      </label>
      <fieldset className="cm-campo">
        <legend><b>Em que dias você estuda?</b><small>Plantão e folga ficam fora; o plano conta só estes dias.</small></legend>
        <div className="cm-dias">
          {SEMANA.map((d, i) => <button key={i} type="button" aria-pressed={c.dias.includes(i)} aria-label={NOME_SEMANA[i]} onClick={() => definir({ ...c, dias: c.dias.includes(i) ? c.dias.filter((x) => x !== i) : [...c.dias, i].sort() })}>{d}</button>)}
        </div>
      </fieldset>
      <fieldset className="cm-campo">
        <legend><b>Quanto tempo por dia?</b><small>Cerca de {num(questoesDia)} questões com o comentário.</small></legend>
        <div className="cm-opcoes">{MINUTOS.map((m) => <button key={m} type="button" aria-pressed={c.minutosDia === m} onClick={() => definir({ ...c, minutosDia: m })}>{duracao(m)}</button>)}</div>
      </fieldset>
      <fieldset className="cm-campo">
        <legend><b>Até onde ir?</b></legend>
        <div className="cm-cobertura">
          <button type="button" aria-pressed={c.cobertura === 'completa'} onClick={() => definir({ ...c, cobertura: 'completa' })}><strong>Completo</strong><small>{prova === 'titulo' ? 'Todos os assuntos do título, com questões de ingresso como reforço.' : 'Todos os assuntos, com todo tipo de questão da mão.'}</small></button>
          <button type="button" aria-pressed={c.cobertura === 'essencial'} onClick={() => definir({ ...c, cobertura: 'essencial' })}><strong>Essencial</strong><small>Só os assuntos de prioridade máxima e alta{prova === 'titulo' ? ', só com questões no padrão SBCM e SIMÃO' : ''}. Bom para pouco tempo.</small></button>
        </div>
      </fieldset>
      <div className="cm-form__acoes">
        <button type="submit" className="botao botao--principal" disabled={!valida}>{novo ? 'Montar meu plano' : 'Salvar'}</button>
        {aoCancelar && <button type="button" className="botao" onClick={aoCancelar}>Cancelar</button>}
      </div>
      {!logado && <p className="texto-2 cm-nota">Sem conta, o plano fica só neste aparelho. <a href={href('/conta?modo=criar&voltar=%2Fcronograma-mao')}>Crie a conta grátis</a> para levá-lo ao celular e ao computador.</p>}
    </form>
  )
}

interface PropsPainel { prova: ProvaMao; config: ConfigMao; premium: boolean; indice: NonNullable<ReturnType<typeof usarIndice>['indice']>; respondidas: Record<string, RegistroQuestao>; aoEstudar: (ids: string[]) => void; aoEditar: () => void; aoApagar: () => void }

function Painel({ prova, config, premium, indice, respondidas, aoEstudar, aoEditar, aoApagar }: PropsPainel) {
  const plano = useMemo(() => calcularPlanoMao(indice, respondidas, config), [indice, respondidas, config])
  const progresso = plano.total ? Math.round((100 * plano.feitas) / plano.total) : 0
  const hoje = plano.hoje
  const rotuloHoje = hoje.tipo === 'simulado' ? 'Simulado de hoje' : hoje.tipo === 'reta-final' ? 'Reta final' : hoje.tipo === 'folga' ? 'Hoje é folga' : 'Meta de hoje'
  const prioridades = plano.temas.slice(0, 6)

  if (plano.encerrado) return (
    <section className="cm-cartao cm-hoje">
      <h1>A data da prova passou</h1>
      <p className="texto-2">Seu histórico continua salvo. Coloque a data da próxima prova para montar um plano novo.</p>
      <button type="button" className="botao botao--principal" onClick={aoEditar}>Mudar a data</button>
    </section>
  )
  return (
    <>
      <section className="cm-heroi" aria-labelledby="cm-titulo">
        <div>
          <p className="tr-heroi__selo">Cronograma · {PROVAS[prova].curto}</p>
          <h1 id="cm-titulo">Faltam <span className="numerico">{num(plano.diasRestantes)}</span> {plano.diasRestantes === 1 ? 'dia' : 'dias'}</h1>
          <p>Prova em {dataLonga(config.dataProva)} · {num(plano.diasDeEstudo)} dias de estudo · cerca de {num(plano.capacidadeDia)} questões por dia</p>
        </div>
        <div className="cm-heroi__acoes">
          <button type="button" className="botao" onClick={aoEditar}><Icone nome="ajustes" tamanho={16} /> Ajustar</button>
        </div>
      </section>

      <section className={`cm-cartao cm-hoje cm-hoje--${hoje.tipo}`} aria-labelledby="cm-hoje-titulo">
        <div className="cm-hoje__texto">
          <p className="cm-rotulo">{rotuloHoje}</p>
          <h2 id="cm-hoje-titulo">{hoje.tipo === 'folga' ? 'Descanse: o plano conta com isso' : `${num(plano.idsHoje.length)} questões`}</h2>
          {hoje.tipo === 'estudo' && <p className="texto-2">{hoje.temas.slice(0, 3).join(', ')}{hoje.temas.length > 3 ? ` e mais ${hoje.temas.length - 3}` : ''}{plano.revisaoHoje ? ` · ${num(plano.revisaoHoje)} revisões de erros no meio` : ''}</p>}
          {hoje.tipo === 'simulado' && <p className="texto-2">Questões de todos os assuntos, na proporção do quanto caem. Faça de uma vez, como na prova.</p>}
          {hoje.tipo === 'reta-final' && <p className="texto-2">Seus erros e os assuntos de prioridade máxima. Nada de conteúdo novo agora.</p>}
          {hoje.tipo === 'folga' && plano.proximos[0] && <p className="texto-2">Próximo estudo: {dataCurta(plano.proximos.find((d) => d.tipo !== 'folga')?.data ?? plano.proximos[0].data)}.</p>}
        </div>
        {hoje.tipo !== 'folga' && plano.idsHoje.length > 0 && (
          <button type="button" className="botao botao--principal cm-comecar" onClick={() => aoEstudar(plano.idsHoje)}>{premium ? 'Começar agora' : 'Assinar para começar'}<Icone nome="direita" tamanho={16} /></button>
        )}
      </section>

      <section className="cm-indicadores" aria-label="Como você está">
        <Indicador rotulo="Plano feito" valor={`${progresso}%`} detalhe={`${num(plano.feitas)} de ${num(plano.total)} questões`} barra={progresso} />
        <Indicador rotulo="Assuntos vistos" valor={`${plano.cobertura}%`} detalhe="com pelo menos 3 questões feitas" barra={plano.cobertura} />
        <Indicador rotulo="Acerto" valor={plano.acerto === null ? 'sem dados' : `${plano.acerto}%`} detalhe={plano.acerto === null ? 'faça algumas questões' : 'nas questões do plano'} barra={plano.acerto ?? 0} />
        <Indicador rotulo="Até a prova" valor={`${plano.projecao}%`} detalhe={plano.ritmo ? `do plano, no seu ritmo (${num(plano.ritmo)} por dia)` : 'do plano feito até agora; comece para projetar'} barra={plano.projecao} />
        <Indicador rotulo="Prontidão estimada" valor={`${plano.prontidao}%`} detalhe="domínio dos assuntos, pesado pelo quanto caem. É uma estimativa para orientar o estudo, não a chance de passar." barra={plano.prontidao} />
      </section>

      <section className="cm-cartao" aria-labelledby="cm-prio-titulo">
        <header className="cm-cabeca"><h2 id="cm-prio-titulo">Prioridades agora</h2><p className="texto-2">O que mais cai, onde você mais erra e o que falta fazer.</p></header>
        <ol className="cm-prioridades">
          {prioridades.map((t) => <LinhaPrioridade key={t.nome} t={t} premium={premium} aoEstudar={aoEstudar} />)}
        </ol>
        <a className="cm-link" href={href(`/temas-que-mais-caem?prova=${prova === 'titulo' ? 'mao-titulo' : 'mao-ingresso'}`)}>Ver o ranking completo dos temas que mais caem<Icone nome="direita" tamanho={14} /></a>
      </section>

      <section className="cm-cartao" aria-labelledby="cm-prox-titulo">
        <header className="cm-cabeca"><h2 id="cm-prox-titulo">Próximos dias</h2><p className="texto-2">Muda sozinho conforme você estuda, erra ou atrasa.</p></header>
        <ol className="cm-dias-lista">{plano.proximos.map((d) => <LinhaDia key={d.data} d={d} />)}</ol>
      </section>

      <section className="cm-rodape">
        <a className="cm-cartao cm-atalho" href={href(`/temas-que-mais-caem?prova=${prova === 'titulo' ? 'mao-titulo' : 'mao-ingresso'}`)}>
          <IconePixel nome="planos" tamanho={40} /><span><strong>Temas que mais caem</strong><small>{prova === 'titulo' ? 'Na prova de título: SBCM e SIMÃO.' : 'Nas provas de ingresso, por instituição.'}</small></span><Icone nome="direita" tamanho={18} />
        </a>
        <button type="button" className="cm-apagar" onClick={aoApagar}>Apagar este plano</button>
      </section>
    </>
  )
}

function Indicador({ rotulo, valor, detalhe, barra }: { rotulo: string; valor: string; detalhe: string; barra: number }) {
  return (
    <div className="cm-indicador">
      <p className="cm-rotulo">{rotulo}</p>
      <strong className="numerico">{valor}</strong>
      <span className="cm-trilho" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, barra))}%` }} /></span>
      <small>{detalhe}</small>
    </div>
  )
}

function LinhaPrioridade({ t, premium, aoEstudar }: { t: TemaDoPlano; premium: boolean; aoEstudar: (ids: string[]) => void }) {
  const porque = t.feitas ? (t.acerto !== null ? `você acerta ${t.acerto}%` : `você fez ${num(t.feitas)}`) : 'você ainda não fez'
  const ids = [...t.pendentes, ...t.ids.filter((id) => !t.pendentes.includes(id))].slice(0, 20)
  return (
    <li>
      <span className="cm-prioridades__nome"><strong>{t.nome}</strong><small>{num(t.pctEdicao)}% por prova · {porque} · {num(t.pendentes.length)} por fazer</small></span>
      <button type="button" className="cm-treinar" onClick={() => aoEstudar(ids)} aria-label={`Treinar ${t.nome}`}>{premium ? 'Treinar' : 'Assinar'}<Icone nome="direita" tamanho={14} /></button>
    </li>
  )
}

function LinhaDia({ d }: { d: DiaMao }) {
  const texto = d.tipo === 'folga' ? 'Folga' : d.tipo === 'simulado' ? `Simulado · ${num(d.n)} questões` : d.tipo === 'reta-final' ? `Reta final · ${num(d.n)} questões` : `${num(d.n)} questões · ${d.temas.slice(0, 2).join(', ')}${d.temas.length > 2 ? '…' : ''}`
  return <li className={`cm-dia cm-dia--${d.tipo}`}><span className="cm-dia__data">{dataCurta(d.data)}</span><span>{texto}</span></li>
}
