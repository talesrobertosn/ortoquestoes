import { useEffect, useMemo, useState } from 'react'
import { chamarRpc, codigoErro } from '../servicos/supabase'
import { usarPremium } from '../conta/premium'
import { usarIndice } from '../dados/usarIndice'
import { FILTROS_VAZIOS } from '../dados/tipos'
import { montarSessao } from '../dados/acervo'
import { usarArmazenado } from '../estado/usarArmazenado'
import type { RegistroQuestao } from '../estado/revisao'
import { usarSessao } from '../estado/sessao'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { calcularPlano, dataLocal, respondidasNoAcervo, ROTULO_INTENSIDADE, simularMeta, type Intensidade, type PlanoSalvo } from '../dados/planoEstudo'
import { Carregando } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { ConvitePremium, SeloAssinante } from '../componentes/Premium'
import { href, navegar } from '../util/rotas'

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const PROVAS = ['TEOT', 'TARO', 'ENARE R4', 'Outra prova']
const curta = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const longa = (iso: string) => dataLocal(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

function amanhaIso() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function PlanoEstudo() {
  const { premium, logado, carregado } = usarPremium()
  const { indice } = usarIndice()
  const [respondidas] = usarArmazenado<Record<string, RegistroQuestao>>('respondidas', {})
  const { contexto } = usarContextoLocal('')
  const { sessao, iniciar } = usarSessao()
  const [plano, definirPlano] = useState<PlanoSalvo | null | undefined>(undefined)
  const [editando, definirEditando] = useState(false)
  const [erro, definirErro] = useState('')

  useEffect(() => {
    if (!premium) { definirPlano(null); return }
    let vivo = true
    chamarRpc<PlanoSalvo[]>('obter_plano_estudo', {})
      .then(([p]) => { if (vivo) { definirPlano(p ?? null); definirEditando(!p) } })
      .catch(() => { if (vivo) { definirPlano(null); definirErro('Não foi possível carregar seu plano. Confira a conexão.') } })
    return () => { vivo = false }
  }, [premium])

  const calculo = useMemo(() => (indice && plano ? calcularPlano(indice, respondidas, plano) : null), [indice, plano, respondidas])

  if (logado && !carregado) return <Carregando linhas={4} rotulo="Carregando" />
  if (!premium) {
    return (
      <div className="empilha-2 pe">
        <section className="pe-heroi pe-heroi--convite">
          <p className="pe-heroi__selo"><Icone nome="rota" tamanho={15} /> Plano até a prova</p>
          <h1>Saiba exatamente o que estudar até o dia da prova</h1>
          <p>Você informa a data do TEOT. O OrtoQuestões monta a meta de cada dia, distribui os temas nas semanas que faltam e reforça os seus pontos fracos.</p>
        </section>
        <ConvitePremium
          icone="rota"
          titulo="Chega de decidir o que estudar"
          texto={<p>O plano se ajusta sozinho todo dia: se você atrasar, a meta sobe um pouco; se adiantar, ela alivia. E mostra se você está à frente ou atrás do ritmo.</p>}
          itens={['Meta diária calculada até a prova', 'Temas distribuídos semana a semana', 'Reforço automático nos temas fracos', 'Última semana reservada para a reta final']}
        />
      </div>
    )
  }
  if (plano === undefined || !indice) return <Carregando linhas={5} rotulo="Montando seu plano" />

  function comecarHoje() {
    if (!indice || !calculo?.hoje) return
    if (sessao && !sessao.concluidaEm && !window.confirm('Substituir a sessão em andamento? Seu histórico será mantido.')) return
    const filtros = { ...FILTROS_VAZIOS, temas: [calculo.hoje.slug], situacao: 'naoRespondidas' as const, embaralhar: true, limite: calculo.hoje.n }
    iniciar(filtros, montarSessao(indice, filtros, Date.now(), contexto))
    navegar('/sessao')
  }

  if (editando || !plano || !calculo) {
    return <FormularioPlano indice={indice} respondidas={respondidas} atual={plano} aoCancelar={plano ? () => definirEditando(false) : undefined}
      aoSalvar={(novo) => { definirPlano(novo); definirEditando(false) }} />
  }

  const ritmoTexto = Math.abs(calculo.ritmo) <= 5 || calculo.esperadoAteHoje < 20
    ? { classe: 'em-dia', texto: 'Em dia com o plano' }
    : calculo.ritmo > 0 ? { classe: 'frente', texto: `${calculo.ritmo}% à frente do plano` } : { classe: 'atras', texto: `${-calculo.ritmo}% atrás do plano` }
  const progresso = calculo.alvo ? Math.min(100, Math.round((calculo.feitas / calculo.alvo) * 100)) : 100
  const reforcados = calculo.temas.filter((t) => t.reforcado).sort((a, b) => (a.acerto ?? 0) - (b.acerto ?? 0))

  return (
    <div className="empilha-2 pe">
      <section className="pe-heroi">
        <div className="pe-heroi__texto">
          <p className="pe-heroi__selo"><Icone nome="rota" tamanho={15} /> Plano até a prova · {plano.prova}</p>
          <h1>{calculo.provaPassou ? 'A prova chegou. Boa sorte!' : <>Faltam <span className="numerico">{calculo.diasAteProva}</span> {calculo.diasAteProva === 1 ? 'dia' : 'dias'}</>}</h1>
          <p>Prova em {longa(plano.data_prova)}. Intensidade {ROTULO_INTENSIDADE[plano.intensidade].nome.toLowerCase()}{plano.folgas.length ? `, folga ${plano.folgas.map((d) => DIAS_SEMANA[d]).join(', ')}` : ''}.</p>
          <p className={`pe-ritmo pe-ritmo--${ritmoTexto.classe}`}><Icone nome={ritmoTexto.classe === 'atras' ? 'baixo' : ritmoTexto.classe === 'frente' ? 'cima' : 'certo'} tamanho={15} /> {ritmoTexto.texto}</p>
        </div>
        <div className="pe-meta">
          <span className="pe-meta__rotulo">Meta de hoje</span>
          <strong className="numerico">{calculo.metaDiaria}</strong>
          <span className="pe-meta__rotulo">questões novas</span>
          <span className="pe-meta__barra" aria-label={`${calculo.feitasHoje} de ${calculo.metaDiaria} feitas hoje`}><span style={{ width: `${calculo.metaDiaria ? Math.min(100, (calculo.feitasHoje / calculo.metaDiaria) * 100) : 100}%` }} /></span>
          <small>{calculo.faltaHoje ? `${calculo.feitasHoje} feitas · faltam ${calculo.faltaHoje}` : 'Meta de hoje cumprida'}</small>
        </div>
      </section>

      {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}

      <section className="pe-hoje">
        <div>
          <p className="meta">{calculo.naRetaFinal ? 'RETA FINAL' : 'HOJE'}</p>
          {calculo.naRetaFinal ? (
            <><h2>Semana da reta final</h2><p className="texto-2">Nada de conteúdo novo: refaça os erros e as marcadas com dúvida, e faça um simulado cronometrado.</p></>
          ) : calculo.hoje ? (
            <><h2>{calculo.hoje.n} questões de {calculo.hoje.nome}</h2><p className="texto-2">Questões que você ainda não fez. Depois, passe pela revisão do dia.</p></>
          ) : calculo.restante === 0 ? (
            <><h2>Você cumpriu o plano inteiro</h2><p className="texto-2">Mantenha a revisão em dia e faça o Simulado Nacional do mês.</p></>
          ) : (
            <><h2>Meta de hoje cumprida</h2><p className="texto-2">Amanhã tem mais. Se sobrar fôlego, adiante a próxima.</p></>
          )}
        </div>
        <div className="pe-hoje__acoes">
          {calculo.naRetaFinal ? <>
            <a className="botao botao--principal botao--grande" href={href('/treinar?situacao=erradas')}>Refazer os erros</a>
            <a className="botao" href={href('/simulado-nacional')}>Simulado Nacional</a>
          </> : calculo.hoje ? (
            <button type="button" className="botao botao--principal botao--grande" onClick={comecarHoje}>Começar agora</button>
          ) : (
            <a className="botao botao--principal" href={href('/revisao')}>Ir para a revisão</a>
          )}
        </div>
      </section>

      <div className="pe-duas">
        <section className="cartao cartao__corpo pe-progresso">
          <h2>Progresso do plano</h2>
          <div className="pe-progresso__numero"><strong className="numerico">{calculo.feitas.toLocaleString('pt-BR')}</strong><span>de {calculo.alvo.toLocaleString('pt-BR')} questões</span></div>
          <span className="pe-barra"><span style={{ width: `${progresso}%` }} /></span>
          <dl className="pe-dados">
            <div><dt>Esperado até hoje</dt><dd className="numerico">{calculo.esperadoAteHoje.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Dias de estudo até a reta final</dt><dd className="numerico">{calculo.diasEstudoRestantes}</dd></div>
            <div><dt>Reta final a partir de</dt><dd>{curta(calculo.inicioRetaFinal)}</dd></div>
          </dl>
        </section>
        <section className="cartao cartao__corpo pe-fracos">
          <h2>Reforço nos pontos fracos</h2>
          {reforcados.length ? <>
            <p className="texto-2">Estes temas estão abaixo do seu acerto médio e ganham mais espaço no plano:</p>
            <ul className="pe-fracos__lista">{reforcados.slice(0, 5).map((t) => <li key={t.slug}><span>{t.nome}</span><b className="numerico">{t.acerto}%</b></li>)}</ul>
          </> : <p className="texto-2">Ainda não há tema claramente abaixo da sua média. O plano distribui pelo que falta em cada tema e reforça automaticamente quando algum ficar para trás.</p>}
        </section>
      </div>

      <section className="cartao cartao__corpo pe-semanas" aria-labelledby="pe-semanas-titulo">
        <header className="pe-semanas__cabeca">
          <h2 id="pe-semanas-titulo">Semana a semana</h2>
          <SeloAssinante />
        </header>
        <ol className="pe-linha">
          {calculo.semanas.filter((s) => s.diasEstudo > 0).map((s, i) => (
            <li key={i} className={'pe-semana' + (s.atual ? ' pe-semana--atual' : '')}>
              <span className="pe-semana__data">{curta(s.inicio)} – {curta(s.fim)}{s.atual && <em>esta semana</em>}</span>
              <div className="pe-semana__temas">
                {s.temas.length ? s.temas.map((t) => <span key={t.slug} className="pe-chip">{t.nome}<b className="numerico">{t.n}</b></span>) : <span className="texto-2">Folga do plano: revisão e questões livres.</span>}
              </div>
              <span className="pe-semana__total numerico">{s.total}</span>
            </li>
          ))}
          {!calculo.provaPassou && <li className="pe-semana pe-semana--final">
            <span className="pe-semana__data">{curta(calculo.inicioRetaFinal)} – véspera</span>
            <div className="pe-semana__temas"><span className="pe-chip pe-chip--final">Reta final: erros, dúvidas e simulado</span></div>
            <span className="pe-semana__total"><Icone nome="bandeira" tamanho={16} /></span>
          </li>}
        </ol>
      </section>

      <div className="linha">
        <button type="button" className="botao" onClick={() => definirEditando(true)}><Icone nome="lapis" tamanho={16} /> Ajustar o plano</button>
      </div>
    </div>
  )
}

function FormularioPlano({ indice, respondidas, atual, aoSalvar, aoCancelar }: {
  indice: NonNullable<ReturnType<typeof usarIndice>['indice']>
  respondidas: Record<string, RegistroQuestao>
  atual: PlanoSalvo | null
  aoSalvar: (p: PlanoSalvo) => void
  aoCancelar?: () => void
}) {
  const [data, definirData] = useState(atual?.data_prova ?? '')
  const [prova, definirProva] = useState(atual?.prova ?? 'TEOT')
  const [intensidade, definirIntensidade] = useState<Intensidade>(atual?.intensidade ?? 'firme')
  const [folgas, definirFolgas] = useState<number[]>(atual?.folgas ?? [0])
  const [recomecar, definirRecomecar] = useState(false)
  const [salvando, definirSalvando] = useState(false)
  const [erro, definirErro] = useState('')
  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(data) && dataLocal(data) > new Date()

  async function salvar() {
    if (!dataValida || salvando) return
    definirSalvando(true); definirErro('')
    const base = respondidasNoAcervo(indice, respondidas)
    try {
      await chamarRpc('salvar_plano_estudo', { p_data_prova: data, p_intensidade: intensidade, p_folgas: folgas, p_prova: prova, p_base: base, p_recomecar: !atual || recomecar })
      const [salvo] = await chamarRpc<PlanoSalvo[]>('obter_plano_estudo', {})
      aoSalvar(salvo)
    } catch (falha) {
      definirErro(codigoErro(falha) === 'data_invalida' ? 'Escolha uma data futura, em até dois anos.' : codigoErro(falha) === 'premium_necessario' ? 'O plano até a prova é exclusivo para assinantes.' : 'Não foi possível salvar agora. Tente de novo.')
    } finally { definirSalvando(false) }
  }

  async function apagar() {
    if (!window.confirm('Apagar o seu plano até a prova?')) return
    try { await chamarRpc('apagar_plano_estudo', {}); window.location.reload() } catch { definirErro('Não foi possível apagar agora.') }
  }

  return (
    <div className="empilha-2 pe">
      <section className="pe-heroi pe-heroi--convite">
        <p className="pe-heroi__selo"><Icone nome="rota" tamanho={15} /> Plano até a prova</p>
        <h1>{atual ? 'Ajustar o plano' : 'Monte seu plano até a prova'}</h1>
        <p>Três perguntas e o OrtoQuestões faz o resto: meta do dia, temas por semana e reforço nos pontos fracos.</p>
      </section>
      <section className="cartao cartao__corpo pe-form">
        <div className="pe-form__passo">
          <span className="tr-etapa__numero">1</span>
          <div className="pe-form__campos">
            <h2>Qual prova e quando?</h2>
            <div className="pe-form__linha">
              <label className="campo">Prova<select className="entrada" value={PROVAS.includes(prova) ? prova : 'Outra prova'} onChange={(e) => definirProva(e.target.value)}>{PROVAS.map((p) => <option key={p}>{p}</option>)}</select></label>
              <label className="campo">Data da prova<input className="entrada" type="date" min={amanhaIso()} value={data} onChange={(e) => definirData(e.target.value)} /></label>
            </div>
          </div>
        </div>
        <div className="pe-form__passo">
          <span className="tr-etapa__numero">2</span>
          <div className="pe-form__campos">
            <h2>Qual intensidade?</h2>
            <div className="pe-intensidades" role="radiogroup" aria-label="Intensidade">
              {(Object.keys(ROTULO_INTENSIDADE) as Intensidade[]).map((i) => (
                <button key={i} type="button" role="radio" aria-checked={intensidade === i} className="pe-intensidade" onClick={() => definirIntensidade(i)}>
                  <strong>{ROTULO_INTENSIDADE[i].nome}</strong>
                  <span>{ROTULO_INTENSIDADE[i].texto}</span>
                  {dataValida && <b className="numerico">{simularMeta(indice, respondidas, data, i, folgas)} por dia</b>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="pe-form__passo">
          <span className="tr-etapa__numero">3</span>
          <div className="pe-form__campos">
            <h2>Em que dias você não estuda?</h2>
            <p className="texto-2">Plantão fixo, dia de descanso. A meta se espalha pelos outros dias.</p>
            <div className="tr-pilulas">
              {DIAS_SEMANA.map((d, i) => (
                <button key={d} type="button" className="tr-pilula" aria-pressed={folgas.includes(i)} disabled={!folgas.includes(i) && folgas.length >= 5}
                  onClick={() => definirFolgas(folgas.includes(i) ? folgas.filter((x) => x !== i) : [...folgas, i].sort())}>{d}</button>
              ))}
            </div>
          </div>
        </div>
        {atual && <label className="caixa"><input type="checkbox" checked={recomecar} onChange={(e) => definirRecomecar(e.target.checked)} /><span>Recomeçar a contagem hoje (zera o "à frente ou atrás do plano")</span></label>}
        {erro && <p className="aviso-formulario aviso-formulario--erro" role="alert">{erro}</p>}
        <div className="linha">
          <button type="button" className="botao botao--principal botao--grande" disabled={!dataValida || salvando} onClick={salvar}>{salvando ? 'Salvando…' : atual ? 'Salvar ajustes' : 'Criar meu plano'}</button>
          {aoCancelar && <button type="button" className="botao botao--fantasma" onClick={aoCancelar}>Cancelar</button>}
          {atual && <button type="button" className="botao botao--fantasma pe-form__apagar" onClick={apagar}>Apagar plano</button>}
        </div>
      </section>
    </div>
  )
}
