import { useCallback, useEffect, useState } from 'react'
import { usarConta } from '../conta/ContextoConta'
import { contasDisponiveis, supabase } from '../conta/supabase'
import { href } from '../util/rotas'
import { recurso } from '../config'
import { Carregando, Estado } from '../componentes/Estados'
import { Icone } from '../componentes/Icone'
import { EmblemasDoNome, Fogueira, Inventario } from '../componentes/Inventario'
import { SeloAssinante } from '../componentes/Premium'
import { emblemaPorId, VITRINE_MAXIMO } from '../estado/conquistas'
import { usarConquistas } from '../estado/usarConquistas'
import { Medalha } from '../componentes/Medalha'
import { usarContextoLocal } from '../estado/usarContextoLocal'
import { META_STREAK_DIARIA } from '../estado/streak'
import { MINIMO_RANKING } from '../util/nomeRanking'
import { usarPerfilRanking, usarPublicarSequencia } from '../conta/perfilRanking'
import { PlacarArena, TituloArena } from '../componentes/cem/Arena'
import { Jornada } from '../componentes/cem/Jornada'
import { SalaoCem } from '../componentes/cem/SalaoCem'
import { AbasRanking } from '../componentes/cem/Abas'
import { MovimentoSelo } from '../componentes/cem/Movimento'
import { SeloServico } from '../componentes/ServicoRanking'
import { Escadaria } from '../componentes/cem/Escadaria'
import { Classificacao } from '../componentes/cem/Classificacao'
import { ascensao, novoCampeao, type LinhaRanking, type MinhaPosicao, type Periodo } from '../componentes/cem/regras'
import '../estilos/paginas/Ranking.css'
import '../estilos/paginas/SalaoCem.css'

const ROTULOS_PERIODO: Record<Periodo, string> = { geral: 'Geral', semana: 'Últimos 7 dias' }

/** Primeiro nome do cadastro, como nas cartas (supabase/functions/_shared/cartas.ts): vazio se não parecer um nome. */
function primeiroNome(nome?: string | null): string {
  const primeiro = (nome ?? '').trim().split(/\s+/)[0] ?? ''
  if (!primeiro || /[@\d_]/.test(primeiro) || primeiro.length < 2 || primeiro.length > 20) return ''
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR')
}

/** Só no desenvolvimento (#/ranking?demo=1): linhas fictícias para revisar o visual sem servidor. */
const DEMO = import.meta.env.DEV && typeof location !== 'undefined' && location.hash.includes('demo=1')
const NOMES_DEMO = ['Ana P.', 'Bruno C.', 'Carla M.', 'Diego R.', 'Elisa F.', 'Fábio T.', 'Gabi L.', 'Hugo S.', 'Iara N.', 'João V.', 'Karen D.', 'Lucas B.']
const linhasDemo = (): LinhaRanking[] => Array.from({ length: 34 }, (_, i) => ({
  posicao: i + 1, apelido: NOMES_DEMO[i % NOMES_DEMO.length], total: Math.round(4200 / (1 + i * 0.18)), total_geral: Math.round(4200 / (1 + i * 0.18)), eh_voce: i === 6,
  variacao: [2, 0, -1, 4, 0, 1, 3][i % 7], variacao_semana: [6, 1, 0, 2, 0, 5, 1][i % 7], novo: i === 11, referencia_em: '2026-10-13', emblemas: null, sequencia: [12, 3, 0, 40, 7, 1, 21][i % 7], servico: null,
}))

/** O último líder que este aparelho viu, por período (para a cerimônia do novo campeão). */
const CHAVE_LIDER = (p: Periodo) => `ranking:lider:${p}`
const lerLider = (p: Periodo) => { try { return localStorage.getItem(CHAVE_LIDER(p)) } catch { return null } }
const guardarLider = (p: Periodo, nome: string) => { try { localStorage.setItem(CHAVE_LIDER(p), nome) } catch { /* sem armazenamento */ } }

export function Ranking() {
  const { sessao: sessaoReal } = usarConta()
  const sessao = DEMO ? ({ user: { id: 'demo' } } as unknown as typeof sessaoReal) : sessaoReal
  const { contexto } = usarContextoLocal('')
  const [periodo, definirPeriodo] = useState<Periodo>('geral')
  const [rodada, definirRodada] = useState(0)
  const recarregarRanking = useCallback(() => definirRodada(n => n + 1), [])
  const [linhas, definirLinhas] = useState<LinhaRanking[] | null>(null)
  const [linhasPeriodo, definirLinhasPeriodo] = useState<Periodo>('geral')
  const [minhaPosicao, definirMinhaPosicao] = useState<MinhaPosicao>(null)
  const [erro, definirErro] = useState(false)
  // Falso quando o banco ainda responde pelo ranking antigo, sem movimento.
  const [comMovimento, definirComMovimento] = useState(false)
  // Sem conta: o ranking aberto (só iniciais). Falso se o banco ainda não tem a função.
  const [visitanteDisponivel, definirVisitanteDisponivel] = useState(true)
  const [pedidoEncontrar, definirPedidoEncontrar] = useState(0)
  const [cerimonia, definirCerimonia] = useState<string | null>(null)

  const meuTotal = Object.keys(contexto.respondidas).length
  const { perfil: perfilRanking, carregado: perfilCarregado, nomeExibido } = usarPerfilRanking(sessaoReal)
  const { streak, conquistadas, total: totalConquistas } = usarConquistas()
  usarPublicarSequencia(sessaoReal, streak.atual, streak.ateDia)

  useEffect(() => {
    if (!DEMO) return
    definirLinhas(linhasDemo()); definirLinhasPeriodo(periodo); definirComMovimento(true); definirMinhaPosicao({ posicao: 7, total: 2000, total_geral: 2000 })
  }, [periodo])

  // Visitante: top 50 com as iniciais, pela função aberta (migração 202610110300).
  useEffect(() => {
    if (DEMO || !supabase || sessao) return
    let vivo = true
    definirErro(false)
    supabase.rpc('obter_ranking_visitante', { periodo }).then((resultado) => {
      if (!vivo) return
      if (resultado.error) { definirVisitanteDisponivel(false); return }
      definirLinhas((resultado.data ?? []) as LinhaRanking[]); definirLinhasPeriodo(periodo)
      definirComMovimento(true)
      definirMinhaPosicao(null)
    })
    return () => { vivo = false }
  }, [sessao, periodo, rodada])

  useEffect(() => {
    if (DEMO || !supabase || !sessao) return
    const cliente = supabase
    let vivo = true
    definirErro(false)
    let movimento = true
    Promise.all([
      cliente.rpc('obter_ranking_com_movimento', { periodo }).then(async resultado => {
        // O deploy estático pode chegar antes da migration, ou a RPC nova pode
        // falhar no banco: o ranking antigo continua de pé, só sem as setas.
        if (resultado.error) { movimento = false; return cliente.rpc('obter_ranking_publico', { periodo }) }
        return resultado
      }),
      cliente.rpc('minha_posicao_ranking', { periodo }),
    ]).then(([ranking, minha]) => {
      if (!vivo) return
      if (ranking.error || minha.error) { definirErro(true); return }
      const novasLinhas: LinhaRanking[] = (ranking.data ?? []).map((linha: LinhaRanking) => ({
        ...linha, variacao: linha.variacao ?? null, variacao_semana: linha.variacao_semana ?? null,
        novo: linha.novo ?? false, referencia_em: linha.referencia_em ?? null,
        emblemas: linha.emblemas ?? null, sequencia: linha.sequencia ?? null, servico: linha.servico ?? null,
      }))
      definirLinhas(novasLinhas); definirLinhasPeriodo(periodo)
      definirComMovimento(movimento)
      definirMinhaPosicao(minha.data?.[0] ?? null)
    }).catch(() => { if (vivo) definirErro(true) })
    return () => { vivo = false }
  }, [sessao, periodo, rodada])

  // Cerimônia do novo campeão: só com uma lista confirmada do mesmo período e um líder diferente do último visto.
  const liderAtual = linhas && linhasPeriodo === periodo ? linhas.find((l) => l.posicao === 1)?.apelido ?? null : null
  useEffect(() => {
    if (!liderAtual || DEMO) return
    const antes = lerLider(periodo)
    guardarLider(periodo, liderAtual)
    if (!novoCampeao(antes, liderAtual)) { definirCerimonia(null); return }
    definirCerimonia(liderAtual)
    const fim = window.setTimeout(() => definirCerimonia(null), 4200)
    // Trocar de período no meio da cerimônia encerra a cerimônia (nunca fica presa).
    return () => { window.clearTimeout(fim); definirCerimonia(null) }
  }, [liderAtual, periodo])

  if (!DEMO && (!contasDisponiveis || !supabase)) {
    return <article className="limite-leitura empilha">
      <h1>Ranking</h1>
      <p>O ranking depende de contas, que estão em preparação. Você já pode estudar gratuitamente.</p>
      <a className="botao botao--principal" href={href('/treinar')}>Continuar estudando</a>
    </article>
  }

  const nome = sessaoReal ? primeiroNome(String(sessaoReal.user.user_metadata?.nome ?? '')) : ''
  // Enquanto o período novo carrega, a lista do outro não aparece (nada de pontos de um período no outro).
  const atuais = linhas && linhasPeriodo === periodo ? linhas : null
  const carregando = !atuais && !erro
  // A RPC devolve até o top 100 e a sua linha mesmo fora dele.
  const eu = atuais?.find(linha => linha.eh_voce) ?? null
  const lista = atuais?.filter(linha => linha.posicao <= 100) ?? null
  const totalLista = lista?.length ?? 0

  const jornada = <Jornada sessao={!!sessao} participa={perfilRanking.participa} perfilCarregado={perfilCarregado} nome={nome} nomeExibido={nomeExibido}
    minhaPosicao={minhaPosicao} eu={eu} linhas={atuais} periodo={periodo} meuTotal={meuTotal} aoEncontrar={() => definirPedidoEncontrar((n) => n + 1)} />
  const lugares = (lista ?? []).filter((l) => l.posicao <= 3).map((l) => ({
    posicao: l.posicao, nome: l.apelido, ehVoce: l.eh_voce, valor: l.total.toLocaleString('pt-BR'), rotulo: periodo === 'semana' ? 'questões na semana' : 'questões',
    selos: <><EmblemasDoNome ids={l.emblemas} totalGeral={l.total_geral} tamanho={36} /><Fogueira dias={l.sequencia ?? 0} tamanho={26} /><SeloServico servico={l.servico} /><MovimentoSelo linha={l} /></>,
  }))

  return <div className="cem">
    <SalaoCem cerimonia={cerimonia} lugares={lugares} lateral={jornada}
      rotuloPodio={`Três primeiros colocados, ${periodo === 'semana' ? 'últimos 7 dias' : 'geral'}`}
      cabecalho={<TituloArena aoAtualizar={recarregarRanking} />} />

    <div className="cem-barra">
      <AbasRanking atual="questoes" conquistadas={conquistadas} total={totalConquistas} />
      {(sessao || visitanteDisponivel) && <div className="cem-barra__linha">
        <div className="cem-periodo seletor" role="radiogroup" aria-label="Período do ranking">
          {(['geral', 'semana'] as const).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={periodo === p} className="cem-periodo__opcao" onClick={() => definirPeriodo(p)}>{ROTULOS_PERIODO[p]}</button>
          ))}
        </div>
        <PlacarArena top={lista} periodo={periodo} totalLista={totalLista} />
        <a className="cem-liga" href={href('/ligas')}><Icone nome="grupo" tamanho={16} /> Liga da residência <SeloAssinante /></a>
      </div>}
    </div>

    {!sessao && !visitanteDisponivel ? (
      <Estado titulo="Entre na sua conta para ver o ranking" acoes={<a className="botao botao--principal" href={href('/conta?modo=entrar')}>Entrar ou criar conta</a>}>
        <p>O ranking reúne quem mais respondeu questões entre todas as contas com pelo menos {MINIMO_RANKING} questões respondidas.</p>
      </Estado>
    ) : <>
      {!sessao && <p className="cem-aviso"><Icone nome="cadeado" tamanho={15} /> <span>Sem conta, você vê as iniciais. <a href={href('/conta?modo=criar&voltar=%2Franking')}>Crie a sua grátis</a> para ver os nomes e disputar uma vaga no Top 50.</span></p>}

      {carregando && <div className="cem-carregando"><Carregando linhas={6} rotulo="Carregando ranking" /></div>}

      {erro && <Estado titulo="Não foi possível carregar o ranking agora" acoes={<button type="button" className="botao" onClick={recarregarRanking}><Icone nome="reiniciar" tamanho={16} /> Tentar de novo</button>}>
        <p>Confira sua conexão e tente novamente em instantes.</p>
      </Estado>}

      {atuais && lista && lista.length === 0 && <Estado titulo={periodo === 'semana' ? 'Ninguém respondeu questões nos últimos 7 dias' : 'Ainda não há ninguém no ranking'}>
        <p>Seja a primeira pessoa a aparecer aqui.</p>
      </Estado>}

      {lista && lista.length > 0 && <>
        <Escadaria subidas={ascensao(lista)} />
        <Classificacao linhas={atuais!} periodo={periodo} comMovimento={comMovimento} pedidoEncontrar={pedidoEncontrar} />
      </>}
    </>}

    <a className="cem-bau" href={href(perfilRanking.emblemas.length ? '/conquistas' : '/conquistas?escolher=1')}>
      <img className="cem-bau__arte" src={recurso('emblemas/podio-1.png')} alt="" width={48} height={48} />
      <span className="cem-bau__texto">
        <strong>Suas conquistas</strong>
        <span><b className="numerico">{conquistadas}</b> de {totalConquistas} desbloqueadas{streak.atual >= 3 ? ` · sequência de ${streak.atual} dias` : ''}</span>
        <em className="cem-bau__cta">{perfilRanking.emblemas.length ? 'Trocar os emblemas do meu nome' : 'Escolher 3 emblemas para o meu nome'}</em>
      </span>
      <span className="cem-bau__vitrine" aria-hidden="true">
        {Array.from({ length: VITRINE_MAXIMO }, (_, i) => {
          const e = perfilRanking.emblemas[i] ? emblemaPorId(perfilRanking.emblemas[i]) : undefined
          return <span key={i} className={'inv-slot' + (e ? ' inv-slot--cheio' : '')}>{e ? <Medalha conquista={e} tamanho={32} /> : <span className="inv-slot__vazio">+</span>}</span>
        })}
      </span>
      <span className="cem-bau__seta" aria-hidden="true"><Icone nome="direita" tamanho={20} /></span>
    </a>

    <section className="cem-regras" aria-labelledby="cem-regras-t">
      <h2 id="cem-regras-t">Como funciona o ranking</h2>
      <details open><summary>Pontos e períodos</summary>
        <p><strong>Conta volume, não acerto.</strong> Cada questão diferente respondida soma um ponto; refazer a mesma questão não soma de novo. No empate, fica à frente quem tem a conta há mais tempo.</p>
        <p><strong>Geral ou últimos 7 dias.</strong> O geral mostra o acumulado; a semana dá chance a quem começou agora. O ranking é recalculado a cada 10 minutos.</p>
      </details>
      <details><summary>Quem aparece e privacidade</summary>
        <p>Entra quem respondeu pelo menos {MINIMO_RANKING} questões, com o apelido que escolher ou o nome do cadastro e a inicial do sobrenome. Em <a href={href('/conta?secao=ranking')}>Minha conta</a> você troca o apelido ou sai do ranking. E-mail, telefone e cidade nunca aparecem. O serviço onde você faz residência só aparece se você ligar a opção em <a href={href('/conta?secao=perfil')}>Meu perfil</a>.</p>
      </details>
      <details><summary>Movimento, chamas, emblemas e fogueira</summary>
        <p>As setas comparam com o último dia registrado, igual em todos os aparelhos. A chama aparece para quem subiu 3 ou mais posições no dia ou 5 ou mais na semana.</p>
        <p>As conquistas ficam no seu inventário para sempre, e você escolhe até três para aparecer ao lado do nome. A fogueira mostra a sua sequência de dias seguidos com pelo menos {META_STREAK_DIARIA} questões: se a sequência acabar, ela apaga e recomeça do zero.</p>
      </details>
    </section>
  </div>
}

/** Página das conquistas: o inventário completo e a escolha da vitrine. */
export function Conquistas({ escolher = false }: { escolher?: boolean } = {}) {
  const { sessao } = usarConta()
  const { perfil, carregado, nomeExibido, salvarVitrine, comVitrine } = usarPerfilRanking(sessao)
  const { metricas, streak, conquistadas, total } = usarConquistas({ comLendarios: true })
  usarPublicarSequencia(sessao, streak.atual, streak.ateDia)
  return <div className="cem cem--conquistas">
    {/* A galeria de troféus do castelo: a mesma escadaria do Salão dos Cem, com o contador num vidro escuro. */}
    <section className="cem-galeria" aria-labelledby="cem-galeria-t" style={{ backgroundImage: `url(${recurso('ranking/cem/escadaria-960.webp')})` }}>
      <div className="cem-galeria__texto">
        <p className="cem-heroi__rotulo">Galeria de troféus</p>
        <h1 id="cem-galeria-t">Conquistas</h1>
        <p className="cem-heroi__sub">Cada questão, cada dia de estudo e cada acerto destravam emblemas. Escolha três para aparecer ao lado do seu nome no ranking.</p>
      </div>
      <div className="cem-galeria__placar">
        <img src={recurso('emblemas/podio-1.png')} alt="" width={56} height={56} />
        <strong className="numerico">{conquistadas}<small>/{total}</small></strong>
        <span>conquistas desbloqueadas</span>
      </div>
    </section>
    <div className="cem-barra"><AbasRanking atual="conquistas" conquistadas={conquistadas} total={total} /></div>
    <Inventario metricas={metricas} nome={sessao ? nomeExibido : 'Você'} vitrine={perfil.emblemas} salvarVitrine={salvarVitrine} podeEscolher={!!sessao && carregado && comVitrine} abrirEscolha={escolher} />
  </div>
}
